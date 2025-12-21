local skynet = require "skynet"
local collision_utils = require "agent.collision_utils"

local handler = {}

function handler.init(env)
    local m_REQUEST = env.envREQUEST
    local m_UserData = env.envUserData
    local m_sharedata = env.envSharedata
    local m_DataWrapper = env.envDataWrapper
    local m_save_items = env.envSaveItems
    local m_send_package = env.envSendPackage
    
    -- s_building下的width和height不需要换算nDetailTimes
    local function get_tile_size()        
        return tonumber(skynet.getenv("TILE_SIZE")) or 30 
    end

    -- 建造建筑
    function m_REQUEST.build(args)
        local user_id = env.envFuncGetUserId()
        local db_pool_service = env.envFuncGetDbPool()
        local request = env.envFuncGetRequest()

        local type = args.type
        if not type then return { ok = false } end
        
        local x = args.x
        local y = args.y
        local region = args.region or 1
        local now = os.time()
    
        local s_buildings = m_sharedata.query("s_buildings")
        local building_conf = s_buildings[type]
        
        if not building_conf then
            return { ok = false }
        end

        local TILE_SIZE = get_tile_size()
        local width = building_conf.width * TILE_SIZE
        local height = building_conf.height * TILE_SIZE
        local minX = x - width / 2
        local minY = y - height / 2

        -- 碰撞检测
        local collision_ok, collision_error = collision_utils.check_collision(m_UserData, minX, minY, width, height, region)
        if not collision_ok then
            return { ok = false, error = "无法在此位置建造" }
        end
    
        local costs = {}
        if building_conf.cost_item > 0 then table.insert(costs, {id=building_conf.cost_item, num=building_conf.cost_num}) end
        if building_conf.cost_item2 > 0 then table.insert(costs, {id=building_conf.cost_item2, num=building_conf.cost_num2}) end
        if building_conf.cost_item3 > 0 then table.insert(costs, {id=building_conf.cost_item3, num=building_conf.cost_num3}) end
    
        for _, c in ipairs(costs) do
            local current = m_UserData.m_itemsMap[c.id] or 0
            if current < c.num then
                return { ok = false }
            end
        end
    
        for _, c in ipairs(costs) do
            m_UserData.m_itemsMap[c.id] = m_UserData.m_itemsMap[c.id] - c.num
        end
        m_save_items() -- Save items immediately
    
        -- Push updated items
        local list = {}
        for id, amount in pairs(m_UserData.m_itemsMap) do
            table.insert(list, {id=id, amount=amount})
        end
        local content = request("push_items", { items = list })
        m_send_package(content)
    
        -- INSERT is still immediate because we need the ID
        local sql = string.format("INSERT INTO d_buildings (user_id, `type`, level, x, y, begin_build_time, region) VALUES (%d, %d, 1, %d, %d, %d, %d)", 
            user_id, type, x, y, now, region)
        local res = skynet.call(db_pool_service, "lua", "insert", sql)
        if not res.ok then
            return { ok = false }
        end

        local new_building_data = {
            id = res.id,
            type = type,
            level = 1,
            x = x,
            y = y,
            begin_build_time = now,
            region = region
        }
        
        -- Wrap the new building
        local wrapper = m_DataWrapper.new(db_pool_service, "d_buildings", "id", new_building_data)
        m_UserData.m_buildingsMap[new_building_data.id] = wrapper
    
        -- 如果是自己创建的结构 就可以直接返回 如果是map中获得的结构 就可以用wrapper:raw()
        return {
            ok = true,
            building = new_building_data
        }
    end
    
    -- 移动建筑
    function m_REQUEST.build_move(args)
        local id = args.id
        local new_x = args.new_x
        local new_y = args.new_y
    
        local building = m_UserData.m_buildingsMap[id]
        if building then
            local s_buildings = m_sharedata.query("s_buildings")
            local building_conf = s_buildings[building.type]
            if not building_conf then return { ok = false } end

            local region = building.region or 1
            local TILE_SIZE = get_tile_size()
            local width = building_conf.width * TILE_SIZE
            local height = building_conf.height * TILE_SIZE
            local minX = new_x - width / 2
            local minY = new_y - height / 2

            -- 碰撞检测 (先移除自己再检测)
            local old_x, old_y = building.x, building.y
            
            -- 临时移除以便检测
            -- 注意：因为 collision_utils 遍历的是 m_buildingsMap，我们需要一种方式排除自己
            -- 简单的方法是把自己的坐标暂时移到无限远，或者 collision_utils 增加 exclude_id 参数
            -- 为了通用性，这里选择修改 collision_utils 增加 exclude_id 参数更合适，
            -- 但鉴于 collision_utils 刚写好，这里先采用修改 m_buildingsMap 的临时方案，或者让 check_collision 支持 exclude_id。
            
            -- 更好的方案：更新 collision_utils 支持 exclude_id
            -- 这里先假设 collision_utils 已经更新了（下一步马上更新它）
             local collision_ok, collision_error = collision_utils.check_collision(m_UserData, minX, minY, width, height, region, id)
             if not collision_ok then
                 return { ok = false, error = "无法移动到此位置" }
             end

            building.x = new_x
            building.y = new_y
            
            return { ok = true, building = building}
        end
        return { ok = false, error = "无此建筑" }
    end

end

return handler