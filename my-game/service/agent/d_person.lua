local skynet = require "skynet"
require "define_enum"

local handler = {}

function MapIsEmpty(tbl)
    return next(tbl) == nil
end

function handler.init(env)
    local REQUEST = env.envREQUEST
    local UserData = env.envUserData
    
    -- 导出函数到 handler 供外部调用
    function handler.GetRandomCharacter(PersonCharacterMap)
        local availableKeys = {}
        PersonCharacterMap = PersonCharacterMap or {}
        -- 遍历所有可能的特性类型（1 到 _PAT_END）
        for i = 1, PERSON_CHARACTER_TYPE._PAT_END do
            -- 检查这个数字（特性类型）是否已经被使用
            if not PersonCharacterMap[i] then
                table.insert(availableKeys, i)
            end
        end
        
        if #availableKeys == 0 then
            print("没有可用的角色了，所有角色都已分配")
            return nil
        end
        
        local randomIndex = math.random(1, #availableKeys)
        local selectedKey = availableKeys[randomIndex]
        
        return selectedKey
    end
    
    function handler.CreatePersonCharacter(person_id, num)
        local db_pool_service = env.envFuncGetDbPool()
        local UserData = env.envUserData
        local m_user_id = env.envFuncGetUserId()
        
        for i = 1, num do
            local random_character = handler.GetRandomCharacter(UserData.m_personCharacterMap or {})
    
            local sql = string.format("INSERT INTO d_person_character \
            (user_id, person_id, character_id) VALUES \
            (%d, %d, %d)", m_user_id, person_id, random_character)
        
            local res = skynet.call(db_pool_service, "lua", "insert", sql)
            if not res.ok then
                skynet.error("创建人物性格失败")
                return nil
            end
         
            local PersonCharacterData = {
                id = res.id,
                user_id = m_user_id,
                person_id = person_id,
                character_id = random_character,
            }
    
            local wrapper = env.envDataWrapper.new(env.envFuncGetDbPool(), "d_person_character", "id", PersonCharacterData)
            if not UserData.m_personCharacterMap[PersonCharacterData.person_id] then
                UserData.m_personCharacterMap[PersonCharacterData.person_id] = {}
            end
            UserData.m_personCharacterMap[PersonCharacterData.person_id][random_character] = wrapper
        end
    
    end
    
    function handler.CreatePerson()
        local db_pool_service = env.envFuncGetDbPool()
        local UserData = env.envUserData
        local m_user_id = env.envFuncGetUserId()
        local s_person_age = env.envSharedata.query("s_person_age")
        local duration = s_person_age[1].duration
        local sex = math.random(1, 2)
        local name = "居民"
    
        local sql = string.format("INSERT INTO d_person \
        (user_id, age, sex, name, is_adult, age_up_time, \
        current_hp, attr_val1, attr_val2, attr_val3, attr_val4, attr_val5,\
         attr_val6, attr_val7, attr_val8, attr_val9,  attr_val10, max_hp, \
         attr_val12, money, food, mate_id,  cur_thing_type, cur_thing_begin_time,\
          x, y) VALUES \
        (%d, 0, %d, '%s', 0, %d, \
        0, 0, 0, 0, 0, 0, \
        0, 0, 0,  0, 0, 0,\
         0, 0, 0, 0, 0, 0, 0, 0)", m_user_id, sex, name, duration)
    
        local res = skynet.call(db_pool_service, "lua", "insert", sql)
        if not res.ok then
            skynet.error("创建人物失败")
            return nil
        end
    
        local PersonData = {
            id = res.insert_id,
            user_id = m_user_id,
            age = 0,
            sex = sex,
            name = name,
            is_adult = 0,
            age_up_time = duration,
            current_hp = 0,
            attr_val1 = 0,
            attr_val2 = 0,
            attr_val3 = 0,
            attr_val4 = 0,
            attr_val5 = 0,
            attr_val6 = 0,
            attr_val7 = 0,
            attr_val8 = 0,
            attr_val9 = 0,
            attr_val10 = 0,
            max_hp = 0,
            attr_val12 = 0,
            money = 0,
            food = 0,
            mate_id = 0,
            cur_thing_type = 0,
            cur_thing_begin_time = 0,
            x = 0,
            y = 0,
        }
    
        local id = res.id
        local wrapper = env.envDataWrapper.new(env.envFuncGetDbPool(), "d_person", "id", PersonData)
        
        UserData.m_personMap[id] = wrapper
    
        return id
    end
end

return handler

