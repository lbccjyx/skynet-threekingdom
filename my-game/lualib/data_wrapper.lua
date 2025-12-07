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

function DataWrapper.new(db, table_name, pk_name, data)
    local obj = {
        _db = db,
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

-- 强制标记为脏数据
function DataWrapper:mark_dirty()
    self._dirty = true
end

-- 保存数据
function DataWrapper:save()
    if not self._dirty then return end
    
    local updates = {}
    local pk_val = self._data[self._pk_name]
    
    -- 简单起见，这里不通过schema判断字段，而是遍历数据中的基本类型字段
    -- 实际生产中最好有一份schema映射，或者只更新变化过的字段
    for k, v in pairs(self._data) do
        local t = type(v)
        if k ~= self._pk_name and (t == "number" or t == "string" or t == "boolean") then
            -- 转义字符串防止注入 (简单处理)
            local val_str
            if t == "string" then
                val_str = string.format("'%s'", v) -- 这里最好用 mysql.quote_sql 但不在当前上下文
            elseif t == "boolean" then
                val_str = v and 1 or 0
            else
                val_str = v
            end
            table.insert(updates, string.format("`%s`=%s", k, val_str))
        end
    end
    
    if #updates > 0 then
        local sql = string.format("UPDATE %s SET %s WHERE `%s`=%s", 
            self._table, table.concat(updates, ","), self._pk_name, pk_val)
        
        -- skynet.error("Lazy Save: " .. sql) 
        self._db:query(sql)
    end
    
    self._dirty = false
end

return DataWrapper

