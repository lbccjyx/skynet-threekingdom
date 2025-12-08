local skynet = require "skynet"

local handler = {}

function handler.init(env)
    local REQUEST = env.REQUEST
    local data = env.data
    
    function REQUEST.login(args)
        local r_user = data.user and data.user:raw() or { id = 0, username = "unknown" }
        local r_city = data.city and data.city:raw() or { id = 0, name = "City", level = 1 }
        
        local r_items = {}
        if data.items then
            for id, amount in pairs(data.items) do
                table.insert(r_items, {id=id, amount=amount})
            end
        end
        
        local r_gens = {}
        if data.generals then
            for _, v in ipairs(data.generals) do table.insert(r_gens, v:raw()) end
        end
        
        local r_builds = {}
        if data.buildings then
            for _, v in ipairs(data.buildings) do table.insert(r_builds, v:raw()) end
        end
        
        local r_rect_builds = {}
        if data.rect_buildings then
            for _, v in ipairs(data.rect_buildings) do table.insert(r_rect_builds, v:raw()) end
        end
        
        return {
            ok = true,
            user = r_user,
            city = r_city,
            items = r_items,
            generals = r_gens,
            buildings = r_builds,
            rect_buildings = r_rect_builds
        }
    end

    function REQUEST.heartbeat(args)
        return { server_time = os.time() }
    end
end

return handler

