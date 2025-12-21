local skynet = require "skynet"
local sharedata = require "skynet.sharedata"

local CollisionUtils = {}

function CollisionUtils.check_collision(UserData, x, y, width, height, region, exclude_id)
    
    if width <= 0 or height <= 0 or region <= 0 then
        return false, "invalid_width_or_height_or_type"
    end

    local minX = tonumber(x)
    local maxX = minX + tonumber(width)
    local minY = tonumber(y)
    local maxY = minY + tonumber(height)
    region = tonumber(region) or 1
    exclude_id = tonumber(exclude_id)
    
    local function get_tile_size()        
        local nDetailTimes = 2
        return tonumber(skynet.getenv("TILE_SIZE")) / nDetailTimes or 30 / nDetailTimes
    end

    local TILE_SIZE = get_tile_size()

    -- 1. 检查与现有建筑的碰撞 (普通建筑)
    local s_buildings = sharedata.query("s_buildings")
    if UserData.m_buildingsMap then
        for _, b in pairs(UserData.m_buildingsMap) do
            if not exclude_id or b.id ~= exclude_id then
                local bRegion = tonumber(b.region) or 1 -- d_buildings default 1
                if bRegion == region then
                    local def = s_buildings[b.type]
                    if def then
                        local bWidth = def.width * TILE_SIZE
                        local bHeight = def.height * TILE_SIZE
                        
                        local bMinX = b.x - bWidth / 2
                        local bMaxX = b.x + bWidth / 2
                        local bMinY = b.y - bHeight / 2
                        local bMaxY = b.y + bHeight / 2
                        
                        if (minX < bMaxX and maxX > bMinX and minY < bMaxY and maxY > bMinY) then
                            return false, "collision_with_building"
                        end
                    end
                end
            end
        end
    end

    -- 2. 检查与现有矩形的碰撞
    if UserData.m_rect_buildingsMap then
        for _, r in pairs(UserData.m_rect_buildingsMap) do
            if not exclude_id or r.id ~= exclude_id then
                local rRegion = tonumber(r.region) or 2 -- d_rect_building default 2
                
                if rRegion == region then
                    local rMinX = tonumber(r.x)
                    local rMaxX = rMinX + tonumber(r.width)
                    local rMinY = tonumber(r.y)
                    local rMaxY = rMinY + tonumber(r.height)
                    
                    -- AABB 碰撞检测 (严格不等号意味着接壤不算碰撞)
                    if (minX < rMaxX and maxX > rMinX and minY < rMaxY and maxY > rMinY) then
                        return false, "collision_with_rect"
                    end
                end
            end
        end
    end

    return true
end

return CollisionUtils

