local skynet = require "skynet"
local sproto = require "sproto"
local sprotoparser = require "sprotoparser"
local sharedata = require "skynet.sharedata"
require "define_enum"
local DataWrapper = require "data_wrapper"


local m_gate
local m_client_fd
local m_user_id
local m_host
local m_request
local m_db_pool_service  -- 数据库连接池服务地址


local UserData = {
    m_rUser = {},
    m_rCity = {},
    m_itemsMap = {},
    m_generalsMap = {},
    m_buildingsMap = {},
    m_rect_buildingsMap = {},
    m_rect_building_subMap = {},
}

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

-- 玩家动态数据加载 每次登录的时候加载一次
local function load_data()
    skynet.error("玩家动态数据加载")

    local res = safe_query("SELECT * FROM d_users WHERE id="..m_user_id)
    UserData.m_rUser = DataWrapper.new( m_db_pool_service, "d_users", "id", res[1])

    res = safe_query("SELECT * FROM d_cities WHERE user_id="..m_user_id)
    local city_data = res[1] or { id=0, name="New City", level=1 }
    UserData.m_rCity = DataWrapper.new( m_db_pool_service, "d_cities", "id", city_data)
    
    res = safe_query("SELECT * FROM d_items WHERE user_id="..m_user_id)
    UserData.m_itemsMap = {}
    if res and #res > 0 then
        for _, row in ipairs(res) do
            UserData.m_itemsMap[row.item_id] = row.amount
        end
    else
         -- Should have been created by login, but fallback
         for i=1,5 do UserData.m_itemsMap[i] = 0 end
    end
    
    res = safe_query("SELECT * FROM d_generals WHERE user_id="..m_user_id)
    UserData.m_generalsMap = {}
    if res then
        for _, row in ipairs(res) do
            UserData.m_generalsMap[row.id] = DataWrapper.new( m_db_pool_service, "d_generals", "id", row)
        end
    end
    
    res = safe_query("SELECT * FROM d_buildings WHERE user_id="..m_user_id)
    UserData.m_buildingsMap = {}
    if res then
        for _, row in ipairs(res) do
            UserData.m_buildingsMap[row.id] = DataWrapper.new( m_db_pool_service, "d_buildings", "id", row)
        end
    end

    res = safe_query("SELECT * FROM d_rect_building WHERE user_id="..m_user_id)
    UserData.m_rect_buildingsMap = {}
    if res then
        for _, row in ipairs(res) do
            UserData.m_rect_buildingsMap[row.id] = DataWrapper.new( m_db_pool_service, "d_rect_building", "id", row)
        end
    end

    res = safe_query("SELECT * FROM d_rect_building_sub WHERE user_id="..m_user_id)
    UserData.m_rect_building_subMap = {}
    if res then
        for _, row in ipairs(res) do
            UserData.m_rect_building_subMap[row.id] = DataWrapper.new( m_db_pool_service, "d_rect_building_sub", "id", row)
        end
    end
end

local function save_items()
    for id, amount in pairs(UserData.m_itemsMap) do
        -- optimize: prepare statement or batch if possible, but simple update loop is fine for now
        local sql = string.format("UPDATE d_items SET amount=%d WHERE user_id=%d AND item_id=%d",
            amount, m_user_id, id)
        safe_execute(sql)
    end
end

-- 如果玩家脏数据没有保存 很可能在这里没写对应逻辑
local function save_all_data()
    if UserData.m_rUser and UserData.m_rUser.save then UserData.m_rUser:save() end
    if UserData.m_rCity and UserData.m_rCity.save then UserData.m_rCity:save() end
    
    if UserData.m_generalsMap then
        for _, v in pairs(UserData.m_generalsMap) do
            v:save()
        end
    end
    
    if UserData.m_buildingsMap then
        for _, v in pairs(UserData.m_buildingsMap) do
            v:save()
        end
    end
    
    if UserData.m_rect_buildingsMap then
        for _, v in pairs(UserData.m_rect_buildingsMap) do
            v:save()
        end
    end

    if UserData.m_rect_building_subMap then
        for _, v in pairs(UserData.m_rect_building_subMap) do
            v:save()
        end
    end
    
    save_items() -- Items still use old method for now as they are a map
end

local function growth_loop()
    while true do
        skynet.sleep(6000) -- 60s
        if UserData.m_itemsMap then

            UserData.m_itemsMap[S_ITEM_TYPE.SIT_FOOD] = (UserData.m_itemsMap[S_ITEM_TYPE.SIT_FOOD] or 0) + 10
            UserData.m_itemsMap[S_ITEM_TYPE.SIT_WOOD] = (UserData.m_itemsMap[S_ITEM_TYPE.SIT_WOOD] or 0) + 10
            UserData.m_itemsMap[S_ITEM_TYPE.SIT_STONE] = (UserData.m_itemsMap[S_ITEM_TYPE.SIT_STONE] or 0) + 10

            save_all_data() -- Periodically save everything
            
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
local env = {
    envREQUEST = REQUEST,
    envUserData = UserData,
    envSharedata = sharedata,
    envDataWrapper = DataWrapper,
    envSkynet = skynet,
    envSaveItems = save_items,
    envSendPackage = send_package,
    envFuncGetUserId = function() return m_user_id end,
    envFuncGetDbPool = function() return m_db_pool_service end,
    envFuncGetRequest = function() return m_request end,
}

require("agent.d_login").init(env)
require("agent.general_handler").init(env)
require("agent.d_buildings").init(env)
require("agent.d_rect_buildings").init(env)

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
    load_data()
    
    skynet.fork(growth_loop)
end

function CMD.client(msg)
    local type, name, args, response = m_host:dispatch(msg)
    if type then
        dispatch(type, name, args, response)
    end
end

function CMD.disconnect()
    save_all_data() -- Save on disconnect
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
