local skynet = require "skynet"
require "define_enum"
local PersonHandler = require "agent.d_person"

local handler = {}

function handler.init(env)
    local REQUEST = env.envREQUEST
    local UserData = env.envUserData
    
    function REQUEST.login(args)
        local r_user = UserData.m_rUser and UserData.m_rUser:raw() or { id = 0, username = "unknown" }
        local r_city = UserData.m_rCity and UserData.m_rCity:raw() or { id = 0, name = "City", level = 1 }
        
        local r_items = {}
        if UserData.m_itemsMap then
            for id, amount in pairs(UserData.m_itemsMap) do
                table.insert(r_items, { id = id, amount = amount })
            end
        end
        
        local r_gens = {}
        if UserData.m_generalsMap then
            for id, v in pairs(UserData.m_generalsMap) do table.insert(r_gens, v:raw()) end
        end
        
        local r_builds = {}
        if UserData.m_buildingsMap then
            for id, v in pairs(UserData.m_buildingsMap) do table.insert(r_builds, v:raw()) end
        end
        
        local r_rect_builds = {}
        if UserData.m_rect_buildingsMap then
            for id, v in pairs(UserData.m_rect_buildingsMap) do table.insert(r_rect_builds, v:raw()) end
        end

        local r_rect_building_sub = {}
        if UserData.m_rect_building_subMap then
            for id, v in pairs(UserData.m_rect_building_subMap) do table.insert(r_rect_building_sub, v:raw()) end
        end

        if(UserData.m_personMap == nil or MapIsEmpty(UserData.m_personMap)) then
            local person_id = PersonHandler.CreatePerson()
            PersonHandler.CreatePersonCharacter(person_id, 3)
        end
        
        return {
            ok = true,
            user = r_user,
            city = r_city,
            items = r_items,
            generals = r_gens,
            buildings = r_builds,
            rect_buildings = r_rect_builds,
            rect_buildings_sub = r_rect_building_sub
        }
    end

    function REQUEST.heartbeat(args)
        return { server_time = os.time() }
    end
end

return handler

