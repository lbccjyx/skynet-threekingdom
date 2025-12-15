local skynet = require "skynet"

skynet.start(function()
    skynet.error("Server start")
    -- 每个服务（Service）是一个独立的 Lua 虚拟机实例，使用 skynet.newservice 创建
    -- 服务之间通过消息队列进行异步通信
    -- 每个服务内部使用协程处理并发任务

    -- Start HTTP Login Server
    skynet.newservice("static_data")
    skynet.newservice("logind")
    
    -- Start WebSocket Gate
    skynet.newservice("ws_gate")
    
    skynet.exit()
end)

