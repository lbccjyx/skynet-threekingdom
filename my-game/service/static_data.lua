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

    db:disconnect()
    skynet.error("Static data loaded and shared.")
    skynet.exit()
end)

