local skynet = require "skynet"
local sproto = require "sproto"
local sprotoparser = require "sprotoparser"
local sharedata = require "skynet.sharedata"
require "define_enum"
local DataWrapper = require "data_wrapper"
local LoadUserData = require "db.load_user_data"


local m_gate
local m_client_fd
local m_user_id
local m_host
local m_request
local m_db_pool_service  -- 数据库连接池服务地址
local env -- Forward declaration

local UserData = LoadUserData.new_user_data()

local CMD = {}

local function load_proto()
    local f = io.open("client/game.sproto", "r")
    local t = f:read "a"
    f:close()
    local bin = sprotoparser.parse(t)
    local sp = sproto.new(bin)
    m_host = sp:host "package"
    m_request = m_host:attach(sp)
end


local function send_package(pack)
    skynet.send(m_gate, "lua", "send", m_client_fd, pack)
end

-- 获取数据库连接池服务
local function get_db_pool()
    if not m_db_pool_service then
        -- 查找已存在的mysql_pool服务或创建新服务
        m_db_pool_service =  skynet.uniqueservice("db/mysql_pool")
    end
    return m_db_pool_service
end

-- 安全的数据库查询函数
local function safe_query(sql, params)
    local pool = get_db_pool()
    local ok, result = skynet.call(pool, "lua", "query", sql, params)
    if not ok then
        skynet.error("数据库查询失败:", sql, "错误:", result)
        return nil
    end
    return result
end

-- 安全的数据库执行函数
local function safe_execute(sql, params)
    local pool = get_db_pool()
    local ok, result = skynet.call(pool, "lua", "execute", sql, params)
    if not ok then
        skynet.error("数据库执行失败:", sql, "错误:", result)
        return false
    end
    return true
end

local function save_items()
    LoadUserData.save_items()
end

local function growth_loop()
    while true do
        skynet.sleep(6000) -- 60s
        if UserData.m_itemsMap then

            UserData.m_itemsMap[S_ITEM_TYPE.SIT_FOOD] = (UserData.m_itemsMap[S_ITEM_TYPE.SIT_FOOD] or 0) + 10
            UserData.m_itemsMap[S_ITEM_TYPE.SIT_WOOD] = (UserData.m_itemsMap[S_ITEM_TYPE.SIT_WOOD] or 0) + 10
            UserData.m_itemsMap[S_ITEM_TYPE.SIT_STONE] = (UserData.m_itemsMap[S_ITEM_TYPE.SIT_STONE] or 0) + 10

            LoadUserData.save_all_data()
            
            local list = {}
            for id, amount in pairs(UserData.m_itemsMap) do
                table.insert(list, {id=id, amount=amount})
            end

            local content = m_request("push_items", { items = list })
            send_package(content)
        end
    end
end

local REQUEST = {}

-- Load logic handlers
env = {
    envREQUEST = REQUEST,
    envUserData = UserData,
    envSharedata = sharedata,
    envDataWrapper = DataWrapper,
    envSkynet = skynet,
    envSaveItems = save_items,
    envSendPackage = send_package,
    envSafeQuery = safe_query,
    envSafeExecute = safe_execute,
    envFuncGetUserId = function() return m_user_id end,
    envFuncGetDbPool = get_db_pool,
    envFuncGetRequest = function() return m_request end,
}

require("agent.d_login").init(env)
require("agent.d_general").init(env)
require("agent.d_buildings").init(env)
require("agent.d_rect_buildings").init(env)
require("agent.d_person").init(env)

local function dispatch(type, name, args, response)
    if type == "REQUEST" then
        local f = REQUEST[name]
        if f then
            local r = f(args)
            if response then
                local content = response(r)
                send_package(content)
            end
        end
    end
end

function CMD.start(conf)
    m_gate = conf.gate
    m_client_fd = conf.client
    m_user_id = conf.user_id
    
    load_proto()
    LoadUserData.init(env)
    LoadUserData.load_user_data()
    
    skynet.fork(growth_loop)
end

function CMD.client(msg)
    local type, name, args, response = m_host:dispatch(msg)
    if type then
        dispatch(type, name, args, response)
    end
end

function CMD.disconnect()
    LoadUserData.save_all_data() -- Save on disconnect
    skynet.exit()
end

-- 一个agent服务对应一个玩家
-- 注册消息处理器 监听处理此玩家的全部proto请求
skynet.start(function()
    skynet.dispatch("lua", function(session, source, cmd, ...)
        local f = CMD[cmd]
        if f then
            skynet.ret(skynet.pack(f(...)))
        end
    end)
end)
