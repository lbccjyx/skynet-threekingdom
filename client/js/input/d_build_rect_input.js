import { Game } from '../core/state.js';
import { RenderEngine } from '../render/render_engine.js';
import { sendRequest } from '../core/api.js';
import { log } from '../core/utils.js';
import { renderCity, renderMap } from '../render/render.js';
import { TILE_SIZE } from '../core/config.js';

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
                         if (Game.currentView === 'city') renderCity();
                         else renderMap();
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
        const cy = obj.position.z;

        Game.dragState.offsetX = worldPos.x - cx;
        Game.dragState.offsetY = worldPos.y - cy;
        
        RenderEngine.setGridVisibility(true);
        log(`Started dragging rect ${id}`);
    },

    // Handle Drag Move
    handleDragMove: function(id, newX, newY) {
         const obj = RenderEngine.objects[id];
         if (obj) {
             const w = obj.geometry.parameters.width;
             const h = obj.geometry.parameters.height;
             
             // Calculate proposed TopLeft
             let tlX = newX - w / 2;
             let tlY = newY - h / 2;

             // Snap
             tlX = Math.round(tlX / TILE_SIZE) * TILE_SIZE;
             tlY = Math.round(tlY / TILE_SIZE) * TILE_SIZE;

             // Recalculate Center
             const snappedCX = tlX + w / 2;
             const snappedCY = tlY + h / 2;
             
             RenderEngine.updateEntityPosition(id, snappedCX, snappedCY);
         }
    },

    // Handle Drag End
    handleDragEnd: function(id, obj) {
         // Get current center
         const cx = obj.position.x;
         const cy = obj.position.z;
         const w = obj.geometry.parameters.width;
         const h = obj.geometry.parameters.height;
         
         // Calculate TopLeft
         let tlX = cx - w / 2;
         let tlY = cy - h / 2;
         
         // Snap TopLeft to TILE_SIZE
         tlX = Math.round(tlX / TILE_SIZE) * TILE_SIZE;
         tlY = Math.round(tlY / TILE_SIZE) * TILE_SIZE;
         
         const finalId = parseInt(id.replace('rect_', ''));

         sendRequest('build_rect_move', {
            id: finalId,
            x: tlX,
            y: tlY
        }, (res) => {
            if (res.ok) {
                const r = Game.data.rect_buildings.find(r => r.id === finalId);
                if (r) { r.x = res.rect_building.x; r.y = res.rect_building.y; }
                if (Game.currentView === 'city') renderCity();
                else renderMap();
            } else {
                if (Game.currentView === 'city') renderCity();
                else renderMap();
            }
        });

        Game.dragState.isDragging = false;
        Game.dragState.id = null;
        Game.dragState.type = null;
        RenderEngine.setGridVisibility(false);
    }
};

