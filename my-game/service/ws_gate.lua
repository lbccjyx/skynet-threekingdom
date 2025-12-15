local skynet = require "skynet"
local socket = require "skynet.socket"
local websocket = require "http.websocket"
local httpurl = require "http.url"

local handle = {}
local agents = {} -- id -> agent
local CMD = {}

function handle.connect(id)
    skynet.error("ws connect:", id)
end

function handle.handshake(id, header, url)
    local path, query = httpurl.parse(url)
    local q = httpurl.parse_query(query)
    local token = q.token
    
    if token then
        local user_id = tonumber(token)
        if user_id then
            skynet.error("ws login user:", user_id)

-- 测试数据（参考）：
-- 5000个agent服务：
-- 启动时间：~3-5秒
-- 内存占用：~1GB
-- 消息延迟：增加 0.1-0.5ms（因调度开销）

-- 10000个agent服务：
-- 可能出现的问题：
-- 1. 服务创建失败（内存不足）
-- 2. 消息调度延迟明显
-- 3. 垃圾回收压力大
            local agent = skynet.newservice("agent")
            skynet.call(agent, "lua", "start", { gate = skynet.self(), client = id, user_id = user_id })
            agents[id] = agent
        else
            skynet.error("ws invalid token:", token)
            websocket.close(id)
        end
    else
        skynet.error("ws no token")
        websocket.close(id)
    end
end

-- 客户端的每个socket的消息都会经过这边转发
function handle.message(id, msg, msg_type)
    local agent = agents[id]
    if agent then
        skynet.send(agent, "lua", "client", msg)
    end
end

function handle.close(id)
    local agent = agents[id]
    if agent then
        skynet.send(agent, "lua", "disconnect")
        agents[id] = nil
    end
end

function handle.error(id)
    handle.close(id)
end

function CMD.send(id, data)
    websocket.write(id, data, "binary")
end

-- 仅连接管理和消息转发
-- 业务逻辑：分散到各agent服务

skynet.start(function()
    skynet.dispatch("lua", function(session, source, cmd, ...)
        local f = CMD[cmd]
        if f then
            skynet.ret(skynet.pack(f(...)))
        end
    end)

    local port = tonumber(skynet.getenv("port_ws"))
    local id = socket.listen("0.0.0.0", port)
    skynet.error("WS Gate listening on " .. port)
    
    socket.start(id, function(id, addr)
        skynet.error(string.format("New connection from %s id=%d", addr, id))
        -- socket.start(id) -- Removed redundant start, let websocket.accept handle it
        local ok, err = pcall(websocket.accept, id, handle, "ws", addr)
        if not ok then
            skynet.error("websocket accept error:", err)
        end
    end)
end)

