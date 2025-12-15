local skynet = require "skynet"
local mysql = require "skynet.db.mysql"
local sharedata = require "skynet.sharedata"

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

-- skynet.start 是服务的入口点和初始化函数注册
-- 它会在服务创建时被调用一次
-- 函数结束后 生命周期也不会结束 而是转为监听消息队列 调用skynet.exit()就是退出服务

-- static_data服务的实际作用是把静态数 存储在"共享内存块"中 然后退出服务
skynet.start(function()
    skynet.error("静态数据加载")
    local db = connect_db()
    -- Load s_buildings
    local buildings = {}
    local res = db:query("SELECT * FROM s_buildings")
    if res then
        for _, row in ipairs(res) do
            -- Ensure numeric keys are handled correctly
            buildings[row.id] = row
        end
    end
    sharedata.new("s_buildings", buildings)
    
    -- Load s_items
    local items = {}
    local res_items = db:query("SELECT * FROM s_items")
    if res_items then
        for _, row in ipairs(res_items) do
            items[row.id] = row
        end
    end
    sharedata.new("s_items", items)

    -- Load s_rect_building
    local type_rect_buildings = {}
    local res_rect_buildings = db:query("SELECT * FROM s_rect_building")
    if res_rect_buildings then
        for _, row in ipairs(res_rect_buildings) do
            type_rect_buildings[row.id] = row
        end
    end
    sharedata.new("s_rect_building", type_rect_buildings)

    -- Load s_house_population
    local type_house_populations = {}
    local res_house_populations = db:query("SELECT * FROM s_house_population")
    if res_house_populations then
        for _, row in ipairs(res_house_populations) do
            type_house_populations[row.id] = row
        end
    end
    sharedata.new("s_house_population", type_house_populations)



    db:disconnect()
    skynet.error("Static data loaded and shared.")
    skynet.exit()
end)

