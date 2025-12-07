local skynet = require "skynet"

local handler = {}

function handler.init(env)
    local REQUEST = env.REQUEST
    local data = env.data
    
    -- 移动将领
    function REQUEST.move_general(args)
        local gid = args.id
        local x = args.x
        local y = args.y
        for _, g in ipairs(data.generals) do
            -- g is DataWrapper
            if g.id == gid then
                g.x = x 
                g.y = y
                return { ok = true, id = gid, x = x, y = y }
            end
        end
        return { ok = false }
    end
end

return handler

