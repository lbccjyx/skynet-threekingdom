local skynet = require "skynet"
local sproto = require "sproto"
local sprotoparser = require "sprotoparser"
local mysql = require "skynet.db.mysql"
local sharedata = require "skynet.sharedata"
require "define_enum"
local DataWrapper = require "data_wrapper"

local gate
local client_fd
local user_id
local db
local host
local request

local data = {
    user = {},
    city = {},
    items = {},
    generals = {},
    buildings = {},
    rect_buildings = {}
}

local CMD = {}

local function load_proto()
    local f = io.open("client/game.sproto", "r")
    local t = f:read "a"
    f:close()
    local bin = sprotoparser.parse(t)
    local sp = sproto.new(bin)
    host = sp:host "package"
    request = host:attach(sp)
end

local function connect_db()
    local config = {
        host = skynet.getenv("mysql_host"),
        port = tonumber(skynet.getenv("mysql_port")),
        database = skynet.getenv("mysql_db"),
        user = skynet.getenv("mysql_user"),
        password = skynet.getenv("mysql_pwd"),
        max_packet_size = 1024 * 1024
    }
    return mysql.connect(config)
end

local function send_package(pack)
    skynet.send(gate, "lua", "send", client_fd, pack)
end

-- 玩家动态数据加载 每次登录的时候加载一次
local function load_data()
    skynet.error("玩家动态数据加载")
    if not db then db = connect_db() end
    
    local res = db:query("SELECT * FROM d_users WHERE id="..user_id)
    data.user = DataWrapper.new(db, "d_users", "id", res[1])
    
    res = db:query("SELECT * FROM d_cities WHERE user_id="..user_id)
    local city_data = res[1] or { id=0, name="New City", level=1 }
    data.city = DataWrapper.new(db, "d_cities", "id", city_data)
    
    res = db:query("SELECT * FROM d_items WHERE user_id="..user_id)
    data.items = {}
    if res and #res > 0 then
        for _, row in ipairs(res) do
            data.items[row.item_id] = row.amount
        end
    else
         -- Should have been created by login, but fallback
         for i=1,5 do data.items[i] = 0 end
    end
    
    res = db:query("SELECT * FROM d_generals WHERE user_id="..user_id)
    data.generals = {}
    if res then
        for _, row in ipairs(res) do
            table.insert(data.generals, DataWrapper.new(db, "d_generals", "id", row))
        end
    end
    
    res = db:query("SELECT * FROM d_buildings WHERE user_id="..user_id)
    data.buildings = {}
    if res then
        for _, row in ipairs(res) do
            table.insert(data.buildings, DataWrapper.new(db, "d_buildings", "id", row))
        end
    end

    res = db:query("SELECT * FROM d_farmland WHERE user_id="..user_id)
    data.rect_buildings = {}
    if res then
        for _, row in ipairs(res) do
            table.insert(data.rect_buildings, DataWrapper.new(db, "d_farmland", "id", row))
        end
    end
end

local function save_items()
    if not db then return end
    for id, amount in pairs(data.items) do
        -- optimize: prepare statement or batch if possible, but simple update loop is fine for now
        local sql = string.format("UPDATE d_items SET amount=%d WHERE user_id=%d AND item_id=%d",
            amount, user_id, id)
        db:query(sql)
    end
end

-- 如果玩家脏数据没有保存 很可能在这里没写对应逻辑
local function save_all_data()
    if data.user and data.user.save then data.user:save() end
    if data.city and data.city.save then data.city:save() end
    
    if data.generals then
        for _, v in ipairs(data.generals) do
            v:save()
        end
    end
    
    if data.buildings then
        for _, v in ipairs(data.buildings) do
            v:save()
        end
    end
    
    if data.rect_buildings then
        for _, v in ipairs(data.rect_buildings) do
            v:save()
        end
    end
    
    save_items() -- Items still use old method for now as they are a map
end

local function growth_loop()
    while true do
        skynet.sleep(6000) -- 60s
        if data.items then

            data.items[S_ITEM_TYPE.SIT_FOOD] = (data.items[S_ITEM_TYPE.SIT_FOOD] or 0) + 10
            data.items[S_ITEM_TYPE.SIT_WOOD] = (data.items[S_ITEM_TYPE.SIT_WOOD] or 0) + 10
            data.items[S_ITEM_TYPE.SIT_STONE] = (data.items[S_ITEM_TYPE.SIT_STONE] or 0) + 10

            save_all_data() -- Periodically save everything
            
            local list = {}
            for id, amount in pairs(data.items) do
                table.insert(list, {id=id, amount=amount})
            end

            local content = request("push_items", { items = list })
            send_package(content)
        end
    end
end

local REQUEST = {}

-- Load logic handlers
local env = {
    REQUEST = REQUEST,
    data = data,
    sharedata = sharedata,
    DataWrapper = DataWrapper,
    skynet = skynet,
    save_items = save_items,
    send_package = send_package,
    get_user_id = function() return user_id end,
    get_db = function() return db end,
    get_request = function() return request end,
}

require("agent.d_login").init(env)
require("agent.general_handler").init(env)
require("agent.d_buildings").init(env)

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
    gate = conf.gate
    client_fd = conf.client
    user_id = conf.user_id
    
    load_proto()
    load_data()
    
    skynet.fork(growth_loop)
end

function CMD.client(msg)
    local type, name, args, response = host:dispatch(msg)
    if type then
        dispatch(type, name, args, response)
    end
end

function CMD.disconnect()
    save_all_data() -- Save on disconnect
    skynet.exit()
end

skynet.start(function()
    skynet.dispatch("lua", function(session, source, cmd, ...)
        local f = CMD[cmd]
        if f then
            skynet.ret(skynet.pack(f(...)))
        end
    end)
end)
