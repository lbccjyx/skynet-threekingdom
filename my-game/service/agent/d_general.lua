local skynet = require "skynet"

local handler = {}

function handler.init(env)
    local REQUEST = env.envREQUEST
    local UserData = env.envUserData
    
    -- 移动将领
    function REQUEST.move_general(args)
        local gid = args.id
        local x = args.x
        local y = args.y
        local general = UserData.m_generalsMap[gid]
        if general then
            general.x = x
            general.y = y
            return { ok = true, id = gid, x = x, y = y }
        end
        return { ok = false }
    end
end

return handler

