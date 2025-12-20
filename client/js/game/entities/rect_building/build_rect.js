import { Game } from '@core/state.js';
import { CRenderEngine } from '@render/render_engine.js';
import { log } from '@utils';
import { sendRequest } from '@api';
import { TILE_SIZE, CITY_BOUNDARY } from '@config';
import { updateGameView } from '@game/game.js';
import { getNumberAfterUnderscore } from '@entities/Entity.js';
import { CRenderGrid } from '@render/render_grid.js';
import { CRenderInput } from '@render/render_input.js';

// 圈地从无到有的放置过程  圈地的拖拽移动
export const BuildRect = {
    active: false,
    startPos: null, // {x, y}
    currentRect: null, // THREE.Mesh
    type: 0,

    // def == RECT_BUILDING_DEFINITIONS中的某条数据
    start: function(def) {
        this.active = true;
        this.currentDef = def;
        this.type = def ? def.key : 0;
        CRenderGrid.SetVisibility(true);
        const name = def ? def.name : 'Unknown';
        log(`进入圈地模式: ${name} (左键拖拽选择区域，右键取消)`);
    },

    stop: function() {
        this.active = false;
        this.startPos = null;
        this.currentDef = null;
        this.clearGhost();
        CRenderGrid.SetVisibility(false);
        log("退出圈地模式");
    },

    onMouseDown: function(e) {
        if (!this.active) return;
        if (e.button !== 0) return; // Only Left Click

        const worldPos = CRenderInput.GetWorldPosition(e.clientX, e.clientY);
        
        // Use floor to get the top-left of the tile
        const sx = Math.floor(worldPos.x / TILE_SIZE) * TILE_SIZE;
        const sy = Math.floor(worldPos.y / TILE_SIZE) * TILE_SIZE;

        this.startPos = { x: sx, y: sy };
        this.updateRect(sx, sy);
    },

    onMouseMove: function(e) {
        if (!this.active) return;
        
        const worldPos = CRenderInput.GetWorldPosition(e.clientX, e.clientY);
        
        const cx = Math.floor(worldPos.x / TILE_SIZE) * TILE_SIZE;
        const cy = Math.floor(worldPos.y / TILE_SIZE) * TILE_SIZE;

        if (!this.startPos) {
            // Show cursor ghost (1x1 tile)
            this.updateGhost(cx, cy, TILE_SIZE, TILE_SIZE);
            return;
        }

        this.updateRect(cx, cy);
    },

    // 判断圈地位置是否有效
    IsRectPosUseful: function(tlX, tlY, width, length) {
        if (Game.currentView === 'city') {
            if (tlX < CITY_BOUNDARY.minX || 
                tlX + width > CITY_BOUNDARY.maxX || 
                tlY < CITY_BOUNDARY.minY || 
                tlY + length > CITY_BOUNDARY.maxY) {
                return false;
            }
        }
        return true;
    },

    onMouseUp: function(e) {
        if (!this.active || !this.startPos) return;

        const worldPos = CRenderInput.GetWorldPosition(e.clientX, e.clientY);
        const ex = Math.floor(worldPos.x / TILE_SIZE) * TILE_SIZE;
        const ey = Math.floor(worldPos.y / TILE_SIZE) * TILE_SIZE;

        const startX = this.startPos.x;
        const startY = this.startPos.y;


        // Union of start tile and end tile
        let minX = Math.min(startX, ex);
        let maxX = Math.max(startX + TILE_SIZE, ex + TILE_SIZE);
        let minY = Math.min(startY, ey);
        let maxY = Math.max(startY + TILE_SIZE, ey + TILE_SIZE);
        
        const width = maxX - minX;
        const height = maxY - minY;

        if (!this.IsRectPosUseful(minX, minY, width, height)) {
            log("Cannot build outside city boundary!");
            this.stop();
            return;
        }

        const region = Game.currentView === 'city' ? 1 : 2;

        // Send request
        sendRequest('build_rect', {
            x: minX,
            y: minY,
            width: width,
            height: height,
            region: region,
            type: this.type
        }, (res) => {
            if (res.ok) {
                log("圈地成功!");
                if (!Game.data.rect_buildings) Game.data.rect_buildings = [];
                Game.data.rect_buildings.push(res.rect_building);
                
                // Clear temporary rect
                if (this.currentRect) {
                   CRenderEngine.worldGroup.remove(this.currentRect);
                   // Dispose logic is good but let's just null it or reuse?
                   // removeGhost does dispose, here we should too or reuse.
                   // Simpler to remove.
                   if (this.currentRect.geometry) this.currentRect.geometry.dispose();
                   if (this.currentRect.material) this.currentRect.material.dispose();
                   this.currentRect = null;
                }
                this.startPos = null;
                
                // 最后会调用到CityScene的setup方法 重新渲染场景
                updateGameView();
                
                this.stop();
            } else {
                log("圈地失败 (可能重叠)");
                this.stop();
            }
        });
    },

    updateRect: function(endX, endY) {
        if (!this.startPos) return;

        const startX = this.startPos.x;
        const startY = this.startPos.y;

        // Union of start tile and end tile
        let minX = Math.min(startX, endX);
        let maxX = Math.max(startX + TILE_SIZE, endX + TILE_SIZE);
        let minY = Math.min(startY, endY);
        let maxY = Math.max(startY + TILE_SIZE, endY + TILE_SIZE);

        const width = maxX - minX;
        const height = maxY - minY;

        this.updateGhost(minX, minY, width, height);
    },

    updateGhost: function(x, y, width, height) {
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        if (!this.currentRect) {
             const geometry = new THREE.PlaneGeometry(1, 1);
             const material = new THREE.MeshBasicMaterial({ 
                 color: 0xffff00, 
                 transparent: true, 
                 opacity: 0.5,
                 side: THREE.DoubleSide
             });
             this.currentRect = new THREE.Mesh(geometry, material);
             this.currentRect.rotation.x = -Math.PI / 2; 
             this.currentRect.position.y = 1; 
             CRenderEngine.worldGroup.add(this.currentRect);
        }

        this.currentRect.scale.set(width, height, 1);
        this.currentRect.position.set(centerX, 1, centerY);
    },

    clearGhost: function() {
        if (this.currentRect) {
            CRenderEngine.worldGroup.remove(this.currentRect);
            if (this.currentRect.geometry) this.currentRect.geometry.dispose();
            if (this.currentRect.material) this.currentRect.material.dispose();
            this.currentRect = null;
        }
    },
    
    // Handle Drag Start
    handleDragStart: function(id, obj, worldPos) {
        Game.dragState.isDragging = true;
        Game.dragState.id = id;
        Game.dragState.type = 'rect_building';
        
        // obj 是 RectBuilding.js 创建的 Main Group (this.mesh)
        // userData包含了 { id, type: 'rect_building', width, height, rectBuildingId }
        
        // 整个rect_building一块被拖拽
        const rectBuildingId = obj.userData.rectBuildingId;
        const rectData = Game.data.rect_buildings ? Game.data.rect_buildings.find(r => r.id === rectBuildingId) : null;
        Game.dragState.data = rectData;

        // Store original position for revert
        Game.dragState.originalX = obj.position.x;
        Game.dragState.originalZ = obj.position.z;

        // For rect, position is center (cx, cy).
        // We want to snap x, y (top-left) to grid.
        // let's calculate offset from center
        const cx = obj.position.x;
        // In 3D space, Z is the depth, so use Z for 2D Y calculation
        const cy = obj.position.z;

        Game.dragState.offsetX = worldPos.x - cx;
        // Correct offset calculation using Z as Y in isometric/top-down view logic
        Game.dragState.offsetY = worldPos.y - cy;
        
        CRenderGrid.SetVisibility(true);
    },

    // Handle Drag Move
    handleDragMove: function(id, newX, newY) {
         const obj = CRenderEngine.objects[id];
         if (obj) {
             const w = obj.userData.width;
             const h = obj.userData.height;
             
             // Calculate proposed TopLeft
             let tlX = newX - w / 2;
             let tlY = newY - h / 2;

             // Snap
             tlX = Math.round(tlX / TILE_SIZE) * TILE_SIZE;
             tlY = Math.round(tlY / TILE_SIZE) * TILE_SIZE;

             // Directly move the object
             const centerX = tlX + w / 2;
             const centerY = tlY + h / 2;
             
             obj.position.set(centerX, 0, centerY);
             this.updateGhost(tlX, tlY, w, h);
             
             // Store for DragEnd
             Game.dragState.lastRectX = tlX;
             Game.dragState.lastRectY = tlY;
         }
    },

    // Handle Drag End
    handleDragEnd: function(id, obj) {
         const w = obj.userData.width;
         const h = obj.userData.height;
         
         let tlX, tlY;

         if (Game.dragState.lastRectX !== undefined) {
             tlX = Game.dragState.lastRectX;
             tlY = Game.dragState.lastRectY;
             delete Game.dragState.lastRectX;
             delete Game.dragState.lastRectY;
         } else {
             const cx = obj.position.x;
             const cy = obj.position.z;
             tlX = cx - w / 2;
             tlY = cy - h / 2;
             tlX = Math.round(tlX / TILE_SIZE) * TILE_SIZE;
             tlY = Math.round(tlY / TILE_SIZE) * TILE_SIZE;
         }

         // No ghost to clear if we moved the object directly
         // But we might have ghost from `start` (placing new), 
         // but handleDragEnd is only for existing objects?
         // Safety clear
         this.clearGhost();

        // Check Boundary
         if (!this.IsRectPosUseful(tlX, tlY, w, h)) {
            // Revert Position
            if (Game.dragState.originalX !== undefined) {
                obj.position.set(Game.dragState.originalX, 0, Game.dragState.originalZ);
            }
            
            Game.dragState.isDragging = false;
            Game.dragState.id = null;
            Game.dragState.type = null;
            Game.dragState.def = null;
            CRenderGrid.SetVisibility(false);
            return;
         }

         const finalId = getNumberAfterUnderscore(id);
         sendRequest('build_rect_move', {
            id: finalId,
            x: tlX,
            y: tlY
        }, (res) => {
            if (res.ok) {
                const r = Game.data.rect_buildings.find(r => r.id === finalId);
                if (r) { r.x = res.rect_building.x; r.y = res.rect_building.y; }
                updateGameView();
            } else {
                // Revert on server fail
                if (Game.dragState.originalX !== undefined) {
                    obj.position.set(Game.dragState.originalX, 0, Game.dragState.originalZ);
                }
                updateGameView();
            }
        });

        Game.dragState.isDragging = false;
        Game.dragState.id = null;
        Game.dragState.type = null;
        CRenderGrid.SetVisibility(false);
    }
};

