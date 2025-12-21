local skynet = require "skynet"

local handler = {}

function handler.new_user_data()
    return {
        m_rUser = {},
        m_rCity = {},
        m_itemsMap = {},
        m_generalsMap = {},
        m_buildingsMap = {},
        m_rect_buildingsMap = {},
        m_rect_building_subMap = {},
        m_personMap = {},
        m_personCharacterMap = {},
    }
end

function handler.init(env)
    local UserData = env.envUserData
    local m_db_pool_service = env.envFuncGetDbPool()
    local safe_query = env.envSafeQuery
    local safe_execute = env.envSafeExecute
    local DataWrapper = env.envDataWrapper
    local m_user_id = env.envFuncGetUserId()

    -- 定义闭包函数，直接使用 upvalue 中的 UserData, m_user_id, safe_execute
    function handler.save_items()
        if UserData.m_itemsMap then
            for id, amount in pairs(UserData.m_itemsMap) do
                local sql = string.format("UPDATE d_items SET amount=%d WHERE user_id=%d AND item_id=%d",
                    amount, m_user_id, id)
                safe_execute(sql)
            end
        end
    end

    function handler.save_all_data()
        if UserData.m_rUser and UserData.m_rUser.save then UserData.m_rUser:save() end
        if UserData.m_rCity and UserData.m_rCity.save then UserData.m_rCity:save() end
        
        if UserData.m_generalsMap then
            for _, v in pairs(UserData.m_generalsMap) do
                v:save()
            end
        end
        
        if UserData.m_buildingsMap then
            for _, v in pairs(UserData.m_buildingsMap) do
                v:save()
            end
        end
        
        if UserData.m_rect_buildingsMap then
            for _, v in pairs(UserData.m_rect_buildingsMap) do
                v:save()
            end
        end

        if UserData.m_rect_building_subMap then
            for _, v in pairs(UserData.m_rect_building_subMap) do
                v:save()
            end
        end

        if UserData.m_personMap then
            for _, v in pairs(UserData.m_personMap) do
                v:save()
            end
        end

        if UserData.m_personCharacterMap then
            for _, v in pairs(UserData.m_personCharacterMap) do
                for _, v2 in pairs(v) do
                    v2:save()
                end
            end
        end

        handler.save_items()
    end
    
    function handler.load_user_data()
        -- 玩家动态数据加载 每次登录的时候加载一次
        skynet.error("玩家动态数据加载")
        local res = safe_query("SELECT * FROM d_users WHERE id="..m_user_id)
        UserData.m_rUser = DataWrapper.new( m_db_pool_service, "d_users", "id", res[1])

        res = safe_query("SELECT * FROM d_cities WHERE user_id="..m_user_id)
        local city_data = res[1] or { id=0, name="New City", level=1 }
        UserData.m_rCity = DataWrapper.new( m_db_pool_service, "d_cities", "id", city_data)
        
        res = safe_query("SELECT * FROM d_items WHERE user_id="..m_user_id)
        UserData.m_itemsMap = {}
        if res and #res > 0 then
            for _, row in ipairs(res) do
                UserData.m_itemsMap[row.item_id] = row.amount
            end
        else
            -- Should have been created by login, but fallback
            for i=1,5 do UserData.m_itemsMap[i] = 0 end
        end
        
        res = safe_query("SELECT * FROM d_generals WHERE user_id="..m_user_id)
        UserData.m_generalsMap = {}
        if res then
            for _, row in ipairs(res) do
                UserData.m_generalsMap[row.id] = DataWrapper.new( m_db_pool_service, "d_generals", "id", row)
            end
        end
        
        res = safe_query("SELECT * FROM d_buildings WHERE user_id="..m_user_id)
        UserData.m_buildingsMap = {}
        if res then
            for _, row in ipairs(res) do
                UserData.m_buildingsMap[row.id] = DataWrapper.new( m_db_pool_service, "d_buildings", "id", row)
            end
        end

        res = safe_query("SELECT * FROM d_rect_building WHERE user_id="..m_user_id)
        UserData.m_rect_buildingsMap = {}
        if res then
            for _, row in ipairs(res) do
                UserData.m_rect_buildingsMap[row.id] = DataWrapper.new( m_db_pool_service, "d_rect_building", "id", row)
            end
        end

        res = safe_query("SELECT * FROM d_rect_building_sub WHERE user_id="..m_user_id)
        UserData.m_rect_building_subMap = {}
        if res then
            for _, row in ipairs(res) do
                UserData.m_rect_building_subMap[row.id] = DataWrapper.new( m_db_pool_service, "d_rect_building_sub", "id", row)
            end
        end

        res = safe_query("SELECT * FROM d_person WHERE user_id="..m_user_id)
        UserData.m_personMap = {}
        if res then
            for _, row in ipairs(res) do
                UserData.m_personMap[row.id] = DataWrapper.new( m_db_pool_service, "d_person", "id", row)
            end
        end

        res = safe_query("SELECT * FROM d_person_character WHERE user_id="..m_user_id)
        UserData.m_personCharacterMap = {}
        if res then
            for _, row in ipairs(res) do
                if not UserData.m_personCharacterMap[row.person_id] then
                    UserData.m_personCharacterMap[row.person_id] = {}
                end
                UserData.m_personCharacterMap[row.person_id][row.character_id] = DataWrapper.new( m_db_pool_service, "d_person_character", "id", row)
            end
        end
    end

end


return handler
