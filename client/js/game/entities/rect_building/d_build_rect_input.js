import { Game } from '@core/state.js';
import { RenderEngine } from '@render/render_engine.js';
import { sendRequest } from '@core/api.js';
import { log } from '@utils';
import { updateGameView } from '@game/game.js';
import { TILE_SIZE } from '@config';
import { BuildRect } from './build_rect.js';
import { getNumberAfterUnderscore } from '@entities/Entity.js';

// 此类主要用于发起圈地操作
export const BuildRectInput = {
    // Handle context menu for Rect Building
    handleContextMenu: function(e, target, menu, closeMenu) {
        if (!target) return false;
        
        const obj = target.object;
        if (obj.userData.type !== 'rect_building') return false;

        const id = parseInt(obj.userData.id.replace('rect_', ''));
        
        const delItem = document.createElement('div');
        delItem.className = 'context-menu-item';
        delItem.textContent = "删除圈地";
        delItem.onclick = (e) => {
            e.stopPropagation();
            if(confirm("确定删除圈地吗?")) {
                sendRequest('build_rect_del', { id: id }, (res) => {
                if (res.ok) {
                     Game.data.rect_buildings = Game.data.rect_buildings.filter(r => r.id !== id);

                     // Also cleanup sub-buildings belonging to this rect
                     if (Game.data.rect_buildings_sub) {
                         Game.data.rect_buildings_sub = Game.data.rect_buildings_sub.filter(s => s.rect_building_id !== id);
                     }

                     updateGameView();
                     log("已删除圈地");
                } else {
                        log("删除失败");
                    }
                });
            }
            menu.remove();
            document.removeEventListener('click', closeMenu);
        };
        menu.appendChild(delItem);
        return true;
    },

    // Handle Drag Start
    handleDragStart: function(id, obj, worldPos) {
        Game.dragState.isDragging = true;
        Game.dragState.id = id;
        Game.dragState.type = 'rect_building';
        Game.dragState.data = obj.userData.data; // {x, y, width, height...}

        // For rect, position is center (cx, cy).
        // We want to snap x, y (top-left) to grid.
        // let's calculate offset from center
        const cx = obj.position.x;
        // In 3D space, Z is the depth, so use Z for 2D Y calculation
        const cy = obj.position.z;

        Game.dragState.offsetX = worldPos.x - cx;
        // Correct offset calculation using Z as Y in isometric/top-down view logic
        Game.dragState.offsetY = worldPos.y - cy;
        
        // Show Ghost
        const w = obj.userData.width;
        const h = obj.userData.height;
        const tlX = cx - w / 2;
        const tlY = cy - h / 2;
        
        BuildRect.updateGhost(tlX, tlY, w, h);
        
        RenderEngine.setGridVisibility(true);
        log(`Started dragging rect ${id}`);
    },

    // Handle Drag Move
    handleDragMove: function(id, newX, newY) {
         const obj = RenderEngine.objects[id];
         if (obj) {
             const w = obj.userData.width;
             const h = obj.userData.height;
             
             // Calculate proposed TopLeft
             let tlX = newX - w / 2;
             let tlY = newY - h / 2;

             // Snap
             tlX = Math.round(tlX / TILE_SIZE) * TILE_SIZE;
             tlY = Math.round(tlY / TILE_SIZE) * TILE_SIZE;

             // Update Ghost
             BuildRect.updateGhost(tlX, tlY, w, h);
             
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

         BuildRect.clearGhost();

        // Check Boundary
         if (!BuildRect.IsRectPosUseful(tlX, tlY, w, h)) {
            log("Cannot move outside city boundary!");
            Game.dragState.isDragging = false;
            Game.dragState.id = null;
            Game.dragState.type = null;
            Game.dragState.def = null;
            RenderEngine.setGridVisibility(false);
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
                updateGameView();
            }
        });

        Game.dragState.isDragging = false;
        Game.dragState.id = null;
        Game.dragState.type = null;
        RenderEngine.setGridVisibility(false);
    }
};

