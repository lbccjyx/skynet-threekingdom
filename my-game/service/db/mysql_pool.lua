-- service/db/mysql_pool.lua
-- MySQL数据库连接池服务
local skynet = require "skynet"
local mysql = require "skynet.db.mysql"

local CMD = {}

-- 配置从环境变量读取
local db_config = {
    host = skynet.getenv("mysql_host"),
    port = tonumber(skynet.getenv("mysql_port")),
    database = skynet.getenv("mysql_db"),
    user = skynet.getenv("mysql_user"),
    password = skynet.getenv("mysql_pwd"),
    max_packet_size = 1024 * 1024,
    charset = "utf8mb4",      -- 支持emoji
    pool_size = tonumber(skynet.getenv("mysql_pool_size"))
}

-- 连接池状态
local idle_conns = {}     -- 空闲连接队列
local busy_conns = {}     -- 使用中的连接 {conn = true}
local waiting_queue = {}  -- 等待连接的请求队列
local conn_count = 0      -- 当前连接数

-- 创建新连接
local function create_connection()
    if conn_count >= db_config.pool_size then
        return nil, "connection pool is full"
    end
    
    local db, err = mysql.connect(db_config)
    if not db then
        return nil, "connect failed: " .. tostring(err)
    end
    
    conn_count = conn_count + 1
    skynet.error(string.format("MySQL connection created: %d/%d", conn_count, db_config.pool_size))
    return db
end

-- 获取一个连接
local function get_connection()
    -- 1. 从空闲池获取
    if #idle_conns > 0 then
        local conn = table.remove(idle_conns, 1)
        busy_conns[conn] = true
        return conn
    end
    
    -- 2. 创建新连接（如果未达上限）
    if conn_count < db_config.pool_size then
        local conn, err = create_connection()
        if conn then
            busy_conns[conn] = true
            return conn
        end
        -- 创建失败，继续等待
    end
    
    -- 3. 等待其他连接释放
    local co = coroutine.running()
    table.insert(waiting_queue, co)
    skynet.wait()  -- 挂起等待
    
    -- 被唤醒时，取一个空闲连接
    local conn = table.remove(idle_conns, 1)
    busy_conns[conn] = true
    return conn
end

-- 释放连接回池
local function release_connection(conn)
    busy_conns[conn] = nil
    table.insert(idle_conns, conn)
    
    -- 唤醒一个等待的请求
    if #waiting_queue > 0 then
        local co = table.remove(waiting_queue, 1)
        skynet.wakeup(co)
    end
end

-- SQL注入检测（基础检查）
local function check_sql_injection(sql)
    -- 清理SQL字符串
    -- local clean_sql = sql:gsub("%s+", " ")  -- 合并多个空格
    --                    :gsub("%s*$", "")    -- 去掉末尾空格

    -- -- 简单的关键词检测（可根据需要扩展）
    -- local danger_patterns = {
    --     "--",  "-- ",
    --     "/*", "*/",
    --     ";%s*[Ss][Ee][Ll][Ee][Cc][Tt]",
    --     ";%s*[Uu][Pp][Dd][Aa][Tt][Ee]",
    --     ";%s*[Dd][Ee][Ll][Ee][Tt][Ee]",
    --     ";%s*[Ii][Nn][Ss][Ee][Rr][Tt]",
    --     "[Uu][Nn][Ii][Oo][Nn]%s+[Ss][Ee][Ll][Ee][Cc][Tt]",
    -- }
    
    -- for _, pattern in ipairs(danger_patterns) do
    --     if string.find(clean_sql, pattern) then
    --         return false, string.format("Potential SQL injection detected: %s", pattern)
    --     end
    -- end
    
    return true
end

-- 构建安全的参数化SQL
local function build_safe_sql(conn, sql, params)
    if not params then
        -- 无参数，直接检查SQL注入
        local ok, err = check_sql_injection(sql)
        if not ok then
            return nil, err
        end
        return sql
    end
    
    -- 参数化SQL处理
    local param_count = 0
    local processed_sql = sql:gsub("?", function()
        param_count = param_count + 1
        if params[param_count] == nil then
            return "NULL"
        end
        return escape_sql_value(conn, params[param_count])
    end)
    
    -- 检查参数数量是否匹配
    if param_count == 0 then
        -- 没有?占位符，但传了params，可能是想用命名参数
        -- 这里支持命名参数格式 :name
        processed_sql = sql:gsub(":([%w_]+)", function(name)
            if params[name] == nil then
                error(string.format("SQL parameter not found: %s", name))
            end
            return escape_sql_value(conn, params[name])
        end)
    end
    
    -- 检查SQL注入
    local ok, err = check_sql_injection(processed_sql)
    if not ok then
        return nil, err
    end
    
    return processed_sql
end

-- 安全的执行SQL，自动管理连接
local function execute_sql(func_name, sql, params)
    local conn = get_connection()
    
    -- 构建安全的SQL
    local safe_sql, err = build_safe_sql(conn, sql, params)
    if not safe_sql then
        release_connection(conn)
        return false, err
    end
    

    local ok, result, err
    if params then
        ok, result = pcall(conn.query, conn, sql, params)
    else
        ok, result = pcall(conn.query, conn, sql)
    end
    
    release_connection(conn)
    
    if not ok then
        err = result
        skynet.error(string.format("MySQL %s error: %s, SQL: %s", 
            func_name, tostring(err), sql))
        return false, err
    end
    
    if result.err then
        skynet.error(string.format("MySQL %s error: %s, SQL: %s", 
            func_name, tostring(result.err), sql))
        return false, result.err
    end
    
    return true, result
end

-- ============ 公共接口 ============

-- 执行查询（带参数绑定）
function CMD.query(sql, params)
    return execute_sql("query", sql, params)
end

-- 执行更新/插入/删除（别名）
function CMD.execute(sql, params)
    return execute_sql("execute", sql, params)
end

-- 执行插入操作
function CMD.insert(sql, params)
    local ok, res = execute_sql("insert", sql, params)
    if not ok then
        return { ok = false }
    end
    
    if not res or res.errno then
        skynet.error("Insert building failed: " .. (res.err or "unknown"))
        return { ok = false }
    end
    
    return {
        ok = true,
        id = res.insert_id
    }
end

-- 执行原始SQL（无参数）
function CMD.raw(sql)
    return execute_sql("raw", sql)
end

-- 开启事务
function CMD.begin()
    return execute_sql("begin", "START TRANSACTION")
end

-- 提交事务
function CMD.commit()
    return execute_sql("commit", "COMMIT")
end

-- 回滚事务
function CMD.rollback()
    return execute_sql("rollback", "ROLLBACK")
end

-- 执行事务块
function CMD.transaction(callback_func)
    local conn = get_connection()
    
    -- 开始事务
    local ok, result = pcall(conn.query, conn, "START TRANSACTION")
    if not ok then
        release_connection(conn)
        return false, "begin transaction failed: " .. tostring(result)
    end
    
    -- 执行用户回调
    local success, data_or_error = xpcall(callback_func, debug.traceback, conn)
    
    if success then
        -- 提交事务
        ok, result = pcall(conn.query, conn, "COMMIT")
        if not ok then
            skynet.error("commit failed:", result)
            pcall(conn.query, conn, "ROLLBACK")
            release_connection(conn)
            return false, "commit failed: " .. tostring(result)
        end
        release_connection(conn)
        return true, data_or_error
    else
        -- 回滚事务
        pcall(conn.query, conn, "ROLLBACK")
        skynet.error("transaction error:", data_or_error)
        release_connection(conn)
        return false, data_or_error
    end
end

-- 获取连接池状态
function CMD.status()
    return {
        idle = #idle_conns,
        busy = table_size(busy_conns),
        waiting = #waiting_queue,
        total = conn_count,
        max = db_config.pool_size
    }
end

-- 测试连接
function CMD.ping()
    local ok, result = execute_sql("ping", "SELECT 1")
    return ok
end


-- ============ 工具函数 ============
local function table_size(t)
    local count = 0
    for _ in pairs(t) do
        count = count + 1
    end
    return count
end

-- ============ 服务初始化 ============
skynet.start(function()
    -- 注册消息处理器
    skynet.dispatch("lua", function(session, source, cmd, ...)
        local f = assert(CMD[cmd], string.format("Unknown command: %s", cmd))
        
        if session == 0 then
            -- 不需要返回的消息
            f(...)
        else
            -- 需要返回的消息
            skynet.retpack(f(...))
        end
    end)
end)