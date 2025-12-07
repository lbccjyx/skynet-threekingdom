local skynet = require "skynet"
local socket = require "skynet.socket"
local httpd = require "http.httpd"
local sockethelper = require "http.sockethelper"
local urllib = require "http.url"
local mysql = require "skynet.db.mysql"

local db
local port

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

local function response(id, code, body)
    local header = {}
    header["content-type"] = "application/json"
    header["Access-Control-Allow-Origin"] = "*" -- CORS
    
    local ok, err = httpd.write_response(sockethelper.writefunc(id), code, body, header)
    if not ok then
        skynet.error(string.format("fd = %d, %s", id, err))
    end
end

local function handle_login(username, password)
    if not db then
        db = connect_db()
    end
    
    -- Check user
    local res = db:query(string.format("SELECT * FROM d_users WHERE username = '%s'", username))
    if not res then
        return 500, '{"error": "Database error"}'
    end
    
    local user
    if #res == 0 then
        -- Register
        local sql = string.format("INSERT INTO d_users (username, password) VALUES ('%s', '%s')", username, password)
        res = db:query(sql)
        if not res or res.errno then
            return 500, '{"error": "Register failed"}'
        end
        local uid = res.insert_id
        
        -- Create City
        db:query(string.format("INSERT INTO d_cities (user_id, name) VALUES (%d, 'MyCity')", uid))
        -- Create Items (Resources)
        -- 1:Gold, 2:Wood, 3:Stone, 4:Food, 5:Population
        local initial_items = {
            {id=1, amount=100},
            {id=2, amount=100},
            {id=3, amount=100},
            {id=4, amount=100},
            {id=5, amount=10}
        }
        for _, item in ipairs(initial_items) do
            db:query(string.format("INSERT INTO d_items (user_id, item_id, amount) VALUES (%d, %d, %d)", uid, item.id, item.amount))
        end
        -- Create General
        db:query(string.format("INSERT INTO d_generals (user_id, name, x, y) VALUES (%d, 'General', 100, 100)", uid))
        
        user = { id = uid, username = username }
    else
        user = res[1]
        if user.password ~= password then
            return 401, '{"error": "Wrong password"}'
        end
    end
    
    -- Generate token (simple user_id for now)
    local token = tostring(user.id) 
    
    -- Manual JSON construction to avoid dependency issues
    local json = string.format('{"code": 0, "token": "%s", "ws_url": "ws://localhost:%s"}', token, skynet.getenv("port_ws"))
    return 200, json
end

skynet.start(function()
    port = tonumber(skynet.getenv("port_http"))
    local id = socket.listen("0.0.0.0", port)
    skynet.error("HTTP Server listening on port " .. port)
    
    socket.start(id, function(id, addr)
        socket.start(id)
        local code, url, method, header, body = httpd.read_request(sockethelper.readfunc(id), 8192)
        if code then
            if code ~= 200 then
                response(id, code, '{"error": "Error"}')
            else
                local path, query = urllib.parse(url)
                if path == "/login" and (method == "POST" or method == "OPTIONS") then
                    if method == "OPTIONS" then
                        response(id, 200, "")
                        return
                    end
                    
                    -- Parse form data or query params
                    -- We support application/x-www-form-urlencoded in body or query string
                    local q = urllib.parse_query(body)
                    if not q.username then
                         -- Try query string
                         q = urllib.parse_query(query)
                    end
                    
                    if q.username and q.password then
                        local status, res = handle_login(q.username, q.password)
                        response(id, status, res)
                    else
                        response(id, 400, '{"error": "Missing username or password"}')
                    end
                else
                    response(id, 404, '{"error": "Not Found"}')
                end
            end
        else
            if url == sockethelper.socket_error then
                skynet.error("socket closed")
            else
                skynet.error(url)
            end
        end
        socket.close(id)
    end)
end)

