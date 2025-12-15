local skynet = require "skynet"

local DataWrapper = {}
DataWrapper.__index = function(t, k)
    -- 优先查找元表方法（如 save, is_dirty 等）
    if DataWrapper[k] then return DataWrapper[k] end
    -- 其次查找原始数据
    return t._data[k]
end

DataWrapper.__newindex = function(t, k, v)
    -- 如果是修改原始数据字段
    if t._data[k] ~= v then
        t._data[k] = v
        t._dirty = true
    end
end

function DataWrapper.new(db_pool_service, table_name, pk_name, data)
    local obj = {
        _db_pool = db_pool_service,  -- 改为存储连接池服务地址
        _table = table_name,
        _pk_name = pk_name or "id",
        _data = data,
        _dirty = false
    }
    setmetatable(obj, DataWrapper)
    return obj
end

-- 获取原始纯数据（用于Sproto传输）
function DataWrapper:raw()
    return self._data
end

-- 检查是否是脏数据
function DataWrapper:is_dirty()
    return self._dirty
end

-- 强制标记为脏数据
function DataWrapper:mark_dirty()
    self._dirty = true
end

-- 安全的SQL转义函数
local function escape_sql_value(value)
    local t = type(value)
    if t == "string" then
        -- 简单转义单引号，实际项目中建议使用mysql库的转义函数
        return "'" .. string.gsub(value, "'", "''") .. "'"
    elseif t == "number" then
        return tostring(value)
    elseif t == "boolean" then
        return value and 1 or 0
    else
        return "NULL"
    end
end

-- 保存数据
function DataWrapper:save()
    if not self._dirty then return true end
    
    local updates = {}
    local pk_val = self._data[self._pk_name]
    
    if not pk_val then
        skynet.error("DataWrapper.save: primary key value is nil")
        return false
    end
    
    -- 遍历数据中的基本类型字段
    for k, v in pairs(self._data) do
        local t = type(v)
        if k ~= self._pk_name and (t == "number" or t == "string" or t == "boolean" or t == "nil") then
            local val_str = escape_sql_value(v)
            table.insert(updates, string.format("`%s`=%s", k, val_str))
        end
    end
    
    if #updates > 0 then
        local sql = string.format("UPDATE %s SET %s WHERE `%s`=%s", 
            self._table, table.concat(updates, ","), self._pk_name, escape_sql_value(pk_val))
        
        -- 使用连接池服务执行SQL
        local ok, err = skynet.call(self._db_pool, "lua", "execute", sql)
        if not ok then
            skynet.error("DataWrapper.save failed:", sql, "error:", err)
            return false
        end
        
        self._dirty = false
        return true
    end
    
    self._dirty = false
    return true
end

-- 插入新数据
function DataWrapper:insert()
    local fields = {}
    local values = {}
    
    for k, v in pairs(self._data) do
        local t = type(v)
        if t == "number" or t == "string" or t == "boolean" or t == "nil" then
            table.insert(fields, string.format("`%s`", k))
            table.insert(values, escape_sql_value(v))
        end
    end
    
    if #fields == 0 then
        skynet.error("DataWrapper.insert: no fields to insert")
        return false
    end
    
    local sql = string.format("INSERT INTO %s (%s) VALUES (%s)", 
        self._table, table.concat(fields, ","), table.concat(values, ","))
    
    local ok, err = skynet.call(self._db_pool, "lua", "execute", sql)
    if not ok then
        skynet.error("DataWrapper.insert failed:", sql, "error:", err)
        return false
    end
    
    -- 获取自增ID（如果有）
    local result = skynet.call(self._db_pool, "lua", "query", "SELECT LAST_INSERT_ID() as id")
    if result and result[1] then
        self._data[self._pk_name] = result[1].id
    end
    
    self._dirty = false
    return true
end

-- 删除数据
function DataWrapper:delete()
    local pk_val = self._data[self._pk_name]
    if not pk_val then
        skynet.error("DataWrapper.delete: primary key value is nil")
        return false
    end
    
    local sql = string.format("DELETE FROM %s WHERE `%s`=%s", 
        self._table, self._pk_name, escape_sql_value(pk_val))
    
    local ok, err = skynet.call(self._db_pool, "lua", "execute", sql)
    if not ok then
        skynet.error("DataWrapper.delete failed:", sql, "error:", err)
        return false
    end
    
    return true
end

-- 重新从数据库加载数据
function DataWrapper:reload()
    local pk_val = self._data[self._pk_name]
    if not pk_val then
        skynet.error("DataWrapper.reload: primary key value is nil")
        return false
    end
    
    local sql = string.format("SELECT * FROM %s WHERE `%s`=%s", 
        self._table, self._pk_name, escape_sql_value(pk_val))
    
    local result = skynet.call(self._db_pool, "lua", "query", sql)
    if not result or #result == 0 then
        skynet.error("DataWrapper.reload: no data found")
        return false
    end
    
    self._data = result[1]
    self._dirty = false
    return true
end

-- 批量保存多个DataWrapper
function DataWrapper.batch_save(wrappers)
    if not wrappers or #wrappers == 0 then
        return true
    end
    
    local all_ok = true
    for _, wrapper in ipairs(wrappers) do
        if wrapper:is_dirty() then
            if not wrapper:save() then
                all_ok = false
            end
        end
    end
    
    return all_ok
end

return DataWrapper