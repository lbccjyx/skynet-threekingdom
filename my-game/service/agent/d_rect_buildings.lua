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

    local function get_tile_size()        
        local nDetailTimes = 2
        return tonumber(skynet.getenv("TILE_SIZE")) / nDetailTimes or 30 / nDetailTimes
    end

    -- 获取矩形的所有子建筑配置
    local function get_rect_sub_configs(rect_type)
        local s_rect_building = m_sharedata.query("s_rect_building")
        local configs = {}
        for _, config in pairs(s_rect_building) do
            if config.type == rect_type then
                table.insert(configs, config)
            end
        end
        -- 按面积从大到小排序，以便贪婪填充
        table.sort(configs, function(a, b)
            local area_a = (a.width or 1) * (a.height or 1)
            local area_b = (b.width or 1) * (b.height or 1)
            return area_a > area_b
        end)
        return configs
    end

    -- 生成子建筑布局
    local function generate_sub_buildings_layout(rect_width, rect_height, configs)
        local TILE_SIZE = get_tile_size()
        local cols = math.floor(rect_width / TILE_SIZE)
        local rows = math.floor(rect_height / TILE_SIZE)
        
        -- 2D 网格标记占用状态
        local grid = {}
        for i = 0, cols - 1 do
            grid[i] = {}
            for j = 0, rows - 1 do
                grid[i][j] = false
            end
        end

        local layout = {}

        -- 贪婪算法：优先放置大建筑
        for _, config in ipairs(configs) do
            local sub_w_tiles = config.width or 1
            local sub_h_tiles = config.height or 1
            local max_variant = config.sub_max_num or 1

            -- 遍历所有可能的起始点
            for cy = 0, rows - sub_h_tiles do
                for cx = 0, cols - sub_w_tiles do
                    -- 检查空间是否可用
                    local can_place = true
                    for dx = 0, sub_w_tiles - 1 do
                        for dy = 0, sub_h_tiles - 1 do
                            if grid[cx + dx][cy + dy] then
                                can_place = false
                                break
                            end
                        end
                        if not can_place then break end
                    end

                    -- 放置
                    if can_place then
                        -- 标记占用
                        for dx = 0, sub_w_tiles - 1 do
                            for dy = 0, sub_h_tiles - 1 do
                                grid[cx + dx][cy + dy] = true
                            end
                        end

                        table.insert(layout, {
                            config = config,
                            grid_x = cx,
                            grid_y = cy,
                            w_tiles = sub_w_tiles,
                            h_tiles = sub_h_tiles,
                            variant_index = math.random(1, max_variant)
                        })
                    end
                end
            end
        end
        return layout
    end

    -- 批量插入子建筑到数据库
    local function insert_sub_buildings(db_pool_service, user_id, rect_id, base_x, base_y, layout)
        if #layout == 0 then return {} end
        
        local TILE_SIZE = get_tile_size()
        local sub_buildings = {}
        local values_list = {}
        
        for _, item in ipairs(layout) do
            local sub_width_px = item.w_tiles * TILE_SIZE
            local sub_height_px = item.h_tiles * TILE_SIZE
            
            -- 计算中心坐标
            local center_x = base_x + item.grid_x * TILE_SIZE + sub_width_px / 2
            local center_y = base_y + item.grid_y * TILE_SIZE + sub_height_px / 2
            
            local final_x = math.floor(center_x)
            local final_y = math.floor(center_y)
            
            table.insert(values_list, string.format("(%d, %d, %d, %d, %d)", 
                user_id, rect_id, final_x, final_y, item.variant_index))
            
        end

        -- 回退到逐个插入以获取ID
        for _, item in ipairs(layout) do
            local sub_width_px = item.w_tiles * TILE_SIZE
            local sub_height_px = item.h_tiles * TILE_SIZE
            local center_x = math.floor(base_x + item.grid_x * TILE_SIZE + sub_width_px / 2)
            local center_y = math.floor(base_y + item.grid_y * TILE_SIZE + sub_height_px / 2)

            local sql = string.format([[
                INSERT INTO d_rect_building_sub 
                (user_id, rect_building_id, building_type, x, y, building_index) 
                VALUES (%d, %d, %d, %d, %d, %d)]],
                user_id, rect_id, item.config.sub_buildings, center_x, center_y, item.variant_index)
            
            local res = skynet.call(db_pool_service, "lua", "insert", sql)
            if res.ok then
                table.insert(sub_buildings, {
                    id = res.id,
                    rect_building_id = rect_id,
                    building_type = item.config.sub_buildings,
                    x = center_x,
                    y = center_y,
                    building_index = item.variant_index
                })
            else
                skynet.error("Failed to insert sub building")
                return nil, "insert_sub_failed"
            end
        end
        return sub_buildings
    end

    -- 插入主矩形建筑
    local function insert_rect_building(db_pool_service, user_id, x, y, width, height, region, type)
        local sql = string.format([[
            INSERT INTO d_rect_building (user_id, x, y, width, height, region, type) 
            VALUES (%d, %d, %d, %d, %d, %d, %d)]],
            user_id, x, y, width, height, region, type)
        
        local res = skynet.call(db_pool_service, "lua", "insert", sql)
        if not res.ok then
            return nil, "insert_rect_failed"
        end
        
        return {
            id = res.id,
            x = x,
            y = y,
            width = width,
            height = height,
            region = region,
            type = type
        }
    end

    -- 更新内存数据
    local function update_memory_data(new_rect, sub_buildings, db_pool_service)
        -- 更新主矩形建筑内存数据
        if not m_UserData.m_rect_buildingsMap then 
            m_UserData.m_rect_buildingsMap = {} 
        end
        m_UserData.m_rect_buildingsMap[new_rect.id] = m_DataWrapper.new(db_pool_service, "d_rect_building", "id", new_rect)
        
        -- 更新小建筑内存数据
        if not m_UserData.m_rect_building_subMap then 
            m_UserData.m_rect_building_subMap = {} 
        end
        
        for _, sub in ipairs(sub_buildings) do
            m_UserData.m_rect_building_subMap[sub.id] = m_DataWrapper.new(db_pool_service, "d_rect_building_sub", "id", sub)
        end
    end

    -- 建造矩形并自动分配小建筑
    function m_REQUEST.build_rect(args)
        local user_id = env.envFuncGetUserId()
        local db_pool_service = env.envFuncGetDbPool()
        
        local x = args.x
        local y = args.y
        local width = args.width
        local height = args.height
        local region = args.region or 2
        local type = args.type or 1

        -- 碰撞检测
        local collision_ok, collision_error = collision_utils.check_collision(m_UserData, x, y, width, height, region)
        if not collision_ok then
            return { ok = false, error = "无法在此位置建造" }
        end

        local wall_type = 3
        local is_merged = false
        local target_rect = nil
        local old_rect_attrs = nil

        -- 1. 尝试合并检测
        if type == wall_type then
            for _, rectBuilding in pairs(m_UserData.m_rect_buildingsMap) do
                if rectBuilding.type == wall_type and (rectBuilding.region or 2) == region then
                    local can_merge = false
                    local temp_attrs = { x = rectBuilding.x, y = rectBuilding.y, width = rectBuilding.width, height = rectBuilding.height }

                    if rectBuilding.width == width and rectBuilding.x == x then
                        -- 垂直方向检查
                        if rectBuilding.y + rectBuilding.height == y then
                            -- 旧在下，新在上
                            temp_attrs.height = rectBuilding.height + height
                            can_merge = true
                        elseif y + height == rectBuilding.y then
                            -- 新在旧之前
                            temp_attrs.y = y
                            temp_attrs.height = rectBuilding.height + height
                            can_merge = true
                        end
                    elseif rectBuilding.height == height and rectBuilding.y == y then
                        -- 水平方向检查
                        if rectBuilding.x + rectBuilding.width == x then
                            -- 旧在新左边
                            temp_attrs.width = rectBuilding.width + width
                            can_merge = true
                        elseif x + width == rectBuilding.x then
                            -- 新在旧左边
                            temp_attrs.x = x
                            temp_attrs.width = rectBuilding.width + width
                            can_merge = true
                        end
                    end

                    if can_merge then
                        is_merged = true
                        target_rect = rectBuilding
                        old_rect_attrs = { x = rectBuilding.x, y = rectBuilding.y, width = rectBuilding.width, height = rectBuilding.height }
                        
                        -- 应用修改 (Wrapper 会自动处理 DB 更新)
                        rectBuilding.x = temp_attrs.x
                        rectBuilding.y = temp_attrs.y
                        rectBuilding.width = temp_attrs.width
                        rectBuilding.height = temp_attrs.height
                        break
                    end
                end
            end
        end

        local rect_id_for_sub = 0
        local new_rect_obj = nil -- 用于返回给客户端

        if is_merged then
            rect_id_for_sub = target_rect.id
        else
            -- 2. 插入主矩形 (仅当未合并时)
            local new_rect, insert_error = insert_rect_building(db_pool_service, user_id, x, y, width, height, region, type)
            if not new_rect then
                return { ok = false, error = insert_error }
            end
            rect_id_for_sub = new_rect.id
            new_rect_obj = new_rect
        end

        -- 3. 规划子建筑
        local configs = get_rect_sub_configs(type)
        local layout = generate_sub_buildings_layout(width, height, configs)
        
        -- 4. 插入子建筑
        local sub_buildings, sub_error = insert_sub_buildings(db_pool_service, user_id, rect_id_for_sub, x, y, layout)
        
        if not sub_buildings then
            if is_merged then
                -- 回滚合并
                target_rect.x = old_rect_attrs.x
                target_rect.y = old_rect_attrs.y
                target_rect.width = old_rect_attrs.width
                target_rect.height = old_rect_attrs.height
            else
                -- 补救措施：删除 rect_id 关联的所有 sub (虽然插入失败应该没有sub，但为了保险)
                local clean_sql = string.format("DELETE FROM d_rect_building_sub WHERE rect_building_id=%d", rect_id_for_sub)
                skynet.call(db_pool_service, "lua", "execute", clean_sql)
                
                local clean_rect_sql = string.format("DELETE FROM d_rect_building WHERE id=%d", rect_id_for_sub)
                skynet.call(db_pool_service, "lua", "execute", clean_rect_sql)
            end
            
            return { ok = false, error = sub_error }
        end
        
        -- 5. 更新内存
        if is_merged then
            if not m_UserData.m_rect_building_subMap then 
                m_UserData.m_rect_building_subMap = {} 
            end
            for _, sub in ipairs(sub_buildings) do
                m_UserData.m_rect_building_subMap[sub.id] = m_DataWrapper.new(db_pool_service, "d_rect_building_sub", "id", sub)
            end
        else
            update_memory_data(new_rect_obj, sub_buildings, db_pool_service)
        end
        
        -- 发送通知
        local request = env.envFuncGetRequest()
        local content = request("build_rect_sub", { rect_buildings_sub = sub_buildings })
        m_send_package(content)
        
        return { 
            ok = true, 
            rect_building = is_merged and target_rect or new_rect_obj
        }
    end

    -- 移动矩形
    function m_REQUEST.build_rect_move(args)
        local id = args.id
        local x = args.x
        local y = args.y
        local db_pool_service = env.envFuncGetDbPool()

        local rect = m_UserData.m_rect_buildingsMap[id]
        if not rect then return { ok = false, error = "无此建筑" } end

        local width = rect.width
        local height = rect.height
        local region = rect.region or 2

        -- 碰撞检测
        local collision_ok, collision_error = collision_utils.check_collision(m_UserData, x, y, width, height, region, id)
        if not collision_ok then
            return { ok = false, error = "无法移动到此位置" }
        end

        -- 计算偏移量
        local dx = x - rect.x
        local dy = y - rect.y

        -- 更新内存: 主矩形
        rect.x = x
        rect.y = y
        
        -- 更新内存: 子建筑
        if m_UserData.m_rect_building_subMap then
            for _, sub in pairs(m_UserData.m_rect_building_subMap) do
                if sub.rect_building_id == id then
                    sub.x = sub.x + dx
                    sub.y = sub.y + dy
                end
            end
        end
        
        local r_rect_building_sub = {}
        for _, sub in pairs(m_UserData.m_rect_building_subMap) do table.insert(r_rect_building_sub, sub) end
        
        -- 发送通知
        local request = env.envFuncGetRequest()
        local content = request("build_rect_sub", { rect_buildings_sub = r_rect_building_sub})
        m_send_package(content)
        return { ok = true, rect_building = rect }
    end

    -- 删除矩形
    function m_REQUEST.build_rect_del(args)
        local id = args.id
        local db_pool_service = env.envFuncGetDbPool()

        -- 删除数据库: 子建筑
        local sql_sub = string.format("DELETE FROM d_rect_building_sub WHERE rect_building_id=%d", id)
        skynet.call(db_pool_service, "lua", "execute", sql_sub)

        -- 删除数据库: 主矩形
        local sql = string.format("DELETE FROM d_rect_building WHERE id=%d", id)
        skynet.call(db_pool_service, "lua", "execute", sql)
        
        -- 删除内存: 主矩形
        m_UserData.m_rect_buildingsMap[id] = nil
        
        -- 删除内存: 子建筑
        if m_UserData.m_rect_building_subMap then
            local sub_ids_to_remove = {}
            for sub_id, sub in pairs(m_UserData.m_rect_building_subMap) do
                if sub.rect_building_id == id then
                    table.insert(sub_ids_to_remove, sub_id)
                end
            end
            for _, sub_id in ipairs(sub_ids_to_remove) do
                m_UserData.m_rect_building_subMap[sub_id] = nil
            end
        end

        return { ok = true, id = id }
    end

end

return handler
