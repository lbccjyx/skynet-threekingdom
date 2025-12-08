import { Game } from '../core/state.js';
import { RenderEngine } from '../render/render_engine.js';
import { sendRequest } from '../core/api.js';
import { log } from '../core/utils.js';
import { renderCity, renderMap, createGhost, updateGhost, removeGhost } from '../render/render.js';
import { CITY_BOUNDARY } from '../core/config.js';

export const BuildingInput = {
    // Handle Context Menu for Building Placement
    handleContextMenu: function(menu, region, buildX, buildY, closeMenu) {
        const definitions = window.BUILDING_DEFINITIONS || BUILDING_DEFINITIONS;

        for (const key in definitions) {
            const def = definitions[key];
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.textContent = def.name;
            
            item.onclick = (e) => {
                e.stopPropagation();
                
                log(`Selected ${def.name}, entering placement mode`);

                Game.placementState.active = true;
                Game.placementState.def = def;
                Game.placementState.region = region;
                // Start ghost at current mouse pos or where click happened
                Game.placementState.x = buildX;
                Game.placementState.y = buildY;
                
                RenderEngine.setGridVisibility(true);
                createGhost(def, buildX, buildY);

                menu.remove();
                document.removeEventListener('click', closeMenu);
            };
            menu.appendChild(item);
        }
    },

    // Handle Mouse Down for Placement
    handlePlacementMouseDown: function() {
        const { x, y, region, def } = Game.placementState;
            
        // Check Boundary
        if (x < CITY_BOUNDARY.minX || x > CITY_BOUNDARY.maxX || y < CITY_BOUNDARY.minY || y > CITY_BOUNDARY.maxY) {
            log("Cannot place building outside city boundary!");
            return;
        }

        log(`Building ${def.name} at (${x}, ${y})`);
        
        sendRequest('build', {
            type: def.key,
            x: x,
            y: y,
            region: region
        }, (res) => {
            if (res.ok) {
                log("Building started!");
                if (res.building) {
                    Game.data.buildings.push(res.building);
                    if (region === 1) renderCity();
                    else renderMap();
                }
            } else {
                log("Build failed");
            }
        });

        Game.placementState.active = false;
        Game.placementState.def = null;
        RenderEngine.setGridVisibility(false);
        removeGhost();
    },

    // Handle Mouse Move for Placement (Ghost Update)
    handlePlacementMouseMove: function(worldPos) {
        const snapX = Math.floor(worldPos.x);
        const snapY = Math.floor(worldPos.y);
        
        if (snapX !== Game.placementState.x || snapY !== Game.placementState.y) {
            Game.placementState.x = snapX;
            Game.placementState.y = snapY;
            updateGhost(snapX, snapY);
        }
    },

    // Handle Drag Start
    handleDragStart: function(id, obj, worldPos) {
        // Start dragging building with delay (from original code)
         Game.dragState.timer = setTimeout(() => {
            Game.dragState.isDragging = true;
            Game.dragState.id = id;
            Game.dragState.type = 'building';
            
            const objGameX = obj.position.x;
            const objGameY = obj.position.z;
            
            Game.dragState.offsetX = worldPos.x - objGameX;
            Game.dragState.offsetY = worldPos.y - objGameY;
            
            Game.dragState.timer = null;
            RenderEngine.setGridVisibility(true);
            log(`Started dragging building ${id}`);
        }, 500);
    },

    // Handle Drag End
    handleDragEnd: function(id, obj) {
        const finalX = Math.floor(obj.position.x);
        const finalY = Math.floor(obj.position.z);
        
        // Check Boundary
        if (Game.currentView === 'city') {
             if (finalX < CITY_BOUNDARY.minX || finalX > CITY_BOUNDARY.maxX || finalY < CITY_BOUNDARY.minY || finalY > CITY_BOUNDARY.maxY) {
                  log("Cannot move outside city boundary!");
                  if (Game.currentView === 'city') renderCity();
                  else renderMap();
                  
                  Game.dragState.isDragging = false;
                  Game.dragState.id = null;
                  Game.dragState.type = null;
                  RenderEngine.setGridVisibility(false);
                  return;
             }
        }
        
        log(`Moved building ${id} to (${finalX}, ${finalY})`);

        const buildId = parseInt(id.replace('build_', ''));
         sendRequest('build_move', {
            id: buildId,
            new_x: finalX,
            new_y: finalY
        }, (res) => {
            if (res.ok) {
                const b = Game.data.buildings.find(b => b.id === buildId);
                if (b) { b.x = res.building.x; b.y = res.building.y; }
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

