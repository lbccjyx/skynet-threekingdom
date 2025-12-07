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
    buildings = {}
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
    for _, v in ipairs(data.generals) do table.insert(r_gens, v:raw()) end
    
    local r_builds = {}
    for _, v in ipairs(data.buildings) do table.insert(r_builds, v:raw()) end
    
    return {
        ok = true,
        user = r_user,
        city = r_city,
        items = r_items,
        generals = r_gens,
        buildings = r_builds
    }
end


function REQUEST.move_general(args)
    local gid = args.id
    local x = args.x
    local y = args.y
    for _, g in ipairs(data.generals) do
        -- g is DataWrapper, can access .id via __index
        if g.id == gid then
            g.x = x -- Triggers __newindex -> marks dirty
            g.y = y
            -- No db:query needed here
            return { ok = true, id = gid, x = x, y = y }
        end
    end
    return { ok = false }
end

function REQUEST.build(args)
    local type = args.type
    if not type then return { ok = false } end
    
    local x = args.x
    local y = args.y
    local region = args.region or 1
    local now = os.time()

    local s_buildings = sharedata.query("s_buildings")
    local building_conf = s_buildings[type]
    
    if not building_conf then
        return { ok = false }
    end

    local costs = {}
    if building_conf.cost_item > 0 then table.insert(costs, {id=building_conf.cost_item, num=building_conf.cost_num}) end
    if building_conf.cost_item2 > 0 then table.insert(costs, {id=building_conf.cost_item2, num=building_conf.cost_num2}) end
    if building_conf.cost_item3 > 0 then table.insert(costs, {id=building_conf.cost_item3, num=building_conf.cost_num3}) end

    for _, c in ipairs(costs) do
        local current = data.items[c.id] or 0
        if current < c.num then
            return { ok = false }
        end
    end

    for _, c in ipairs(costs) do
        data.items[c.id] = data.items[c.id] - c.num
        -- Items use old immediate update logic in save_items or could be deferred if we wrapped them
    end
    save_items() -- Save items immediately for safety or defer? Let's keep it safe for currency.

    -- Push updated items
    local list = {}
    for id, amount in pairs(data.items) do
        table.insert(list, {id=id, amount=amount})
    end
    local content = request("push_items", { items = list })
    send_package(content)

    -- INSERT is still immediate because we need the ID
    local sql = string.format("INSERT INTO d_buildings (user_id, `type`, level, x, y, begin_build_time, region) VALUES (%d, %d, 1, %d, %d, %d, %d)", 
        user_id, type, x, y, now, region)
    local res = db:query(sql)
    if not res or res.errno then
        skynet.error("Insert building failed: " .. (res.err or "unknown"))
        return { ok = false }
    end
    
    local new_building_data = {
        id = res.insert_id,
        type = type,
        level = 1,
        x = x,
        y = y,
        begin_build_time = now,
        region = region
    }
    
    -- Wrap the new building
    local wrapper = DataWrapper.new(db, "d_buildings", "id", new_building_data)
    table.insert(data.buildings, wrapper)

    return {
        ok = true,
        building = new_building_data
    }
end

function REQUEST.build_move(args)
    local id = args.id
    local new_x = args.new_x
    local new_y = args.new_y

    for _, b in ipairs(data.buildings) do
        if b.id == id then
            b.x = new_x -- Triggers dirty
            b.y = new_y
            -- No DB update here

            return {
                ok = true,
                building = b:raw() -- Ensure we return raw data to Sproto
            }
        end
    end
    return { ok = false }
end

function REQUEST.heartbeat(args)
    return { server_time = os.time() }
end

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
