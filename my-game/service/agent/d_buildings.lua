local skynet = require "skynet"

local handler = {}

function handler.init(env)
    local REQUEST = env.REQUEST
    local data = env.data
    local sharedata = env.sharedata
    local DataWrapper = env.DataWrapper
    local save_items = env.save_items
    local send_package = env.send_package
    
    -- 建造建筑
    function REQUEST.build(args)
        local user_id = env.get_user_id()
        local db = env.get_db()
        local request = env.get_request()

        local type = args.type
        if not type then return { ok = false } end
        
        local x = args.x
        local y = args.y
        local region = args.region or 1
        local now = os.time()
    
        local s_buildings = sharedata.query("s_buildings")
        local building_conf = s_buildings[type]
        
        if not building_conf then
            return { ok = false }
        end
    
        local costs = {}
        if building_conf.cost_item > 0 then table.insert(costs, {id=building_conf.cost_item, num=building_conf.cost_num}) end
        if building_conf.cost_item2 > 0 then table.insert(costs, {id=building_conf.cost_item2, num=building_conf.cost_num2}) end
        if building_conf.cost_item3 > 0 then table.insert(costs, {id=building_conf.cost_item3, num=building_conf.cost_num3}) end
    
        for _, c in ipairs(costs) do
            local current = data.items[c.id] or 0
            if current < c.num then
                return { ok = false }
            end
        end
    
        for _, c in ipairs(costs) do
            data.items[c.id] = data.items[c.id] - c.num
        end
        save_items() -- Save items immediately
    
        -- Push updated items
        local list = {}
        for id, amount in pairs(data.items) do
            table.insert(list, {id=id, amount=amount})
        end
        local content = request("push_items", { items = list })
        send_package(content)
    
        -- INSERT is still immediate because we need the ID
        local sql = string.format("INSERT INTO d_buildings (user_id, `type`, level, x, y, begin_build_time, region) VALUES (%d, %d, 1, %d, %d, %d, %d)", 
            user_id, type, x, y, now, region)
        local res = db:query(sql)
        if not res or res.errno then
            skynet.error("Insert building failed: " .. (res.err or "unknown"))
            return { ok = false }
        end
        
        local new_building_data = {
            id = res.insert_id,
            type = type,
            level = 1,
            x = x,
            y = y,
            begin_build_time = now,
            region = region
        }
        
        -- Wrap the new building
        local wrapper = DataWrapper.new(db, "d_buildings", "id", new_building_data)
        table.insert(data.buildings, wrapper)
    
        return {
            ok = true,
            building = new_building_data
        }
    end
    
    -- 移动建筑
    function REQUEST.build_move(args)
        local id = args.id
        local new_x = args.new_x
        local new_y = args.new_y
    
        for _, b in ipairs(data.buildings) do
            if b.id == id then
                b.x = new_x 
                b.y = new_y

                return {
                    ok = true,
                    building = b:raw() 
                }
            end
        end
        return { ok = false }
    end

    -- 建造矩形
    function REQUEST.build_rect(args)
        local user_id = env.get_user_id()
        local db = env.get_db()
        
        local x = args.x
        local y = args.y
        local width = args.width
        local height = args.height
        local region = args.region or 2 -- Default to map
        local type = args.type or 1

        -- 简单的合法性检查
        if width <= 0 or height <= 0 or type <= 0 then
            return { ok = false }
        end

        local minX = x
        local maxX = x + width
        local minY = y
        local maxY = y + height
        local TILE_SIZE = 30 -- Should match client TILE_SIZE

        -- 1. Check collision with existing buildings
        local s_buildings = sharedata.query("s_buildings")
        
        for _, b in ipairs(data.buildings) do
            if b.region == region then
                local def = s_buildings[b.type]
                if def then
                    local bWidth = def.width * TILE_SIZE
                    local bHeight = def.height * TILE_SIZE
                    
                    -- Building bounds (Center based)
                    local bMinX = b.x - bWidth / 2
                    local bMaxX = b.x + bWidth / 2
                    local bMinY = b.y - bHeight / 2
                    local bMaxY = b.y + bHeight / 2
                    
                    -- Check overlap
                    if (minX < bMaxX and maxX > bMinX and minY < bMaxY and maxY > bMinY) then
                         skynet.error("Collision with building " .. b.id)
                         return { ok = false }
                    end
                end
            end
        end

        -- 2. Check collision with existing rects
        if data.rect_buildings then
            for _, r in ipairs(data.rect_buildings) do
                 if (r.region or 2) == region then
                     local rMinX = r.x
                     local rMaxX = r.x + r.width
                     local rMinY = r.y
                     local rMaxY = r.y + r.height
                     
                     if (minX < rMaxX and maxX > rMinX and minY < rMaxY and maxY > rMinY) then
                         skynet.error("Collision with rect " .. r.id)
                         return { ok = false }
                     end
                 end
            end
        end

        local sql = string.format("INSERT INTO d_rect_building (user_id, x, y, width, height, region, type) VALUES (%d, %d, %d, %d, %d, %d, %d)",
            user_id, x, y, width, height, region, type)
        local res = db:query(sql)
        if not res or res.errno then
            skynet.error("Insert rect building failed: " .. (res.err or "unknown"))
            return { ok = false }
        end
        
        local new_rect = {
            id = res.insert_id,
            x = x,
            y = y,
            width = width,
            height = height,
            region = region,
            type = type
        }
        
        -- Add to memory
        if not data.rect_buildings then data.rect_buildings = {} end
        table.insert(data.rect_buildings, DataWrapper.new(db, "d_rect_building", "id", new_rect))

        return { ok = true, rect_building = new_rect }
    end

    -- 移动矩形
    function REQUEST.build_rect_move(args)
        local id = args.id
        local x = args.x
        local y = args.y

        local s_buildings = sharedata.query("s_buildings")
        local TILE_SIZE = 30
        
        -- Find existing rect
        local rect = nil
        for _, r in ipairs(data.rect_buildings) do
            if r.id == id then
                rect = r
                break
            end
        end
        if not rect then return { ok = false } end

        local width = rect.width
        local height = rect.height
        local region = rect.region or 2

        local minX = x
        local maxX = x + width
        local minY = y
        local maxY = y + height

        -- Collision Check (Copy from build_rect)
         -- 1. Check collision with existing buildings
        for _, b in ipairs(data.buildings) do
            if b.region == region then
                local def = s_buildings[b.type]
                if def then
                    local bWidth = def.width * TILE_SIZE
                    local bHeight = def.height * TILE_SIZE
                    local bMinX = b.x - bWidth / 2
                    local bMaxX = b.x + bWidth / 2
                    local bMinY = b.y - bHeight / 2
                    local bMaxY = b.y + bHeight / 2
                    if (minX < bMaxX and maxX > bMinX and minY < bMaxY and maxY > bMinY) then
                         return { ok = false }
                    end
                end
            end
        end

        -- 2. Check collision with existing rects (Exclude self)
        if data.rect_buildings then
            for _, r in ipairs(data.rect_buildings) do
                 if r.id ~= id and (r.region or 2) == region then
                     local rMinX = r.x
                     local rMaxX = r.x + r.width
                     local rMinY = r.y
                     local rMaxY = r.y + r.height
                     if (minX < rMaxX and maxX > rMinX and minY < rMaxY and maxY > rMinY) then
                         return { ok = false }
                     end
                 end
            end
        end

        rect.x = x
        rect.y = y
        
        return { ok = true, rect_building = rect:raw() }
    end

    -- 删除矩形
    function REQUEST.build_rect_del(args)
        local id = args.id
        local db = env.get_db()

        local sql = string.format("DELETE FROM d_rect_building WHERE id=%d", id)
        local res = db:query(sql)
        if not res or res.errno then
            return { ok = false }
        end
        
        -- Remove from memory
        for i, r in ipairs(data.rect_buildings) do
            if r.id == id then
                table.remove(data.rect_buildings, i)
                break
            end
        end
        
        return { ok = true, id = id }
    end

end

return handler