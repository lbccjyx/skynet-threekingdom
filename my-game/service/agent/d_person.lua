local skynet = require "skynet"
require "define_enum"

local handler = {}

function MapIsEmpty(tbl)
    return next(tbl) == nil
end

function handler.init(env)
    local REQUEST = env.envREQUEST
    local UserData = env.envUserData
    -- 玩家登录时间
    local login_time = 0
    local m_nearly_timer = nil
    local bool_login_out = false

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
    
    function handler.CreatePersonCharacter(person_id)
        local db_pool_service = env.envFuncGetDbPool()
        local m_user_id = env.envFuncGetUserId()
        local DataWrapper = env.envDataWrapper
        
        for i = 1, NORMAL_CHARACTER do
            local random_character = 0

            if i == 1 then
                random_character = 1
            else            
                random_character = handler.GetRandomCharacter(UserData.m_personCharacterMap or {})
            end
    
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
    
            local wrapper = DataWrapper.new(db_pool_service, "d_person_character", "id", PersonCharacterData)
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
        local duration = s_person_age[0].duration
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

    function handler.OnUserLogin()
        login_time = skynet.time()
        handler.CheckPersonTimer()
    end

    function handler.OnUserLogout()
        bool_login_out = true
        skynet.error("OnUserLogout")
        handler.CheckPersonTimer()
    end

    -- 玩家登录后 给未成年的居民创建定时器 到点后年龄增加
    function handler.CheckPersonTimer()
        -- 先处理马上需要处理的
        handler.UpdatePersonAge()

        if bool_login_out then
            return
        end

        local nMinTime = 0
        for id, v in pairs(UserData.m_personMap) do

            if v.is_adult == 0 then
                if nMinTime == 0 then
                    nMinTime = v.age_up_time
                else
                    nMinTime = math.min(nMinTime, v.age_up_time)
                end
            end
        end
        
        -- 如果有需要处理的 则设置定时器
        if nMinTime > 0 then
            -- 第一个参数：延迟的厘秒数 -- 1秒 = 100厘秒
            m_nearly_timer = skynet.timeout(nMinTime * 100, handler.CheckPersonTimer)
            skynet.error("CheckPersonTimer 设置定时器", nMinTime, "s 后")
        else
            m_nearly_timer = nil
            skynet.error("CheckPersonTimer 清除定时器")
        end
    end

    -- 要么增加年龄 要么更新剩余时间
    function handler.UpdatePersonAge()
        local s_person_age = env.envSharedata.query("s_person_age")

        for id, v in pairs(UserData.m_personMap) do
            if v.is_adult == 0 then
                v.age_up_time =  math.floor(v.age_up_time - (skynet.time() - login_time))
                if v.age_up_time <= 0 then
                    v.age = v.age + 1
                    handler.OnPersonAgeUp(v)
                    -- 年龄增加
                    if s_person_age[v.age] == nil or s_person_age[v.age] == 0 then
                        v.is_adult = 1
                    else
                        -- 设置下次年龄增加时间
                        v.age_up_time = s_person_age[v.age].duration
                    end
                end
            end
        end
    end

    function handler.OnPersonAgeUp(CPerson)
        local age = CPerson.age 
        local s_person_character_attr = env.envSharedata.query("s_person_character_attr")
        local person_character_attr = s_person_character_attr[age]
        if person_character_attr == nil then
            person_character_attr = s_person_character_attr[1]
        end

        CPerson.attr_val1 = CPerson.attr_val1 + person_character_attr.attr_val1
        CPerson.attr_val2 = CPerson.attr_val2 + person_character_attr.attr_val2
        CPerson.attr_val3 = CPerson.attr_val3 + person_character_attr.attr_val3
        CPerson.attr_val4 = CPerson.attr_val4 + person_character_attr.attr_val4
        CPerson.attr_val5 = CPerson.attr_val5 + person_character_attr.attr_val5
        CPerson.attr_val6 = CPerson.attr_val6 + person_character_attr.attr_val6
        CPerson.attr_val7 = CPerson.attr_val7 + person_character_attr.attr_val7
        CPerson.attr_val8 = CPerson.attr_val8 + person_character_attr.attr_val8
        CPerson.attr_val9 = CPerson.attr_val9 + person_character_attr.attr_val9
        CPerson.attr_val10 = CPerson.attr_val10 + person_character_attr.attr_val10
        CPerson.max_hp = CPerson.max_hp + person_character_attr.attr_val11
        CPerson.attr_val12 = CPerson.attr_val12 + person_character_attr.attr_val12
    end

end

return handler

