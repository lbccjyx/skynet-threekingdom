local skynet = require "skynet"

skynet.start(function()
    skynet.error("Server start")
    
    -- Start HTTP Login Server
    skynet.newservice("static_data")
    skynet.newservice("logind")
    
    -- Start WebSocket Gate
    skynet.newservice("ws_gate")
    
    skynet.exit()
end)

