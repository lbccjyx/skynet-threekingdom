import { UI } from './elements.js';
import { Game } from './state.js';
import { sendRequest } from './api.js';
import { log } from './utils.js';
import { renderCity, renderMap, switchView } from './render.js';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from './config.js';
import { RenderEngine } from './render_engine.js';

export function setupContextMenus() {
    const container = document.getElementById('three-container');
    if (!container) return;

    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        // Only allow context menu if no active drag and no active pan
        if (Game.dragState.isDragging || RenderEngine.panState.isPanning) return;

        const pos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
        const buildX = Math.floor(pos.x);
        const buildY = Math.floor(pos.y);
        
        const region = Game.currentView === 'city' ? 1 : 2;

        const existing = document.querySelector('.context-menu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        
        const closeMenu = () => {
            if (document.body.contains(menu)) {
                menu.remove();
            }
            document.removeEventListener('click', closeMenu);
        };

        const definitions = window.BUILDING_DEFINITIONS || BUILDING_DEFINITIONS;

        for (const key in definitions) {
            const def = definitions[key];
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.textContent = def.name;
            
            item.onclick = (e) => {
                e.stopPropagation();
                
                log(`Building ${def.name} at (${buildX}, ${buildY})`);
                
                sendRequest('build', {
                    type: def.key,
                    x: buildX,
                    y: buildY,
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

                menu.remove();
                document.removeEventListener('click', closeMenu);
            };
            menu.appendChild(item);
        }
        
        document.body.appendChild(menu);
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    });
}

export function initListeners() {
    if (UI.btn.toMap) {
        UI.btn.toMap.addEventListener('click', () => switchView('map'));
    }
    const toCityBtn = document.getElementById('btn-to-city'); 
    if (toCityBtn) {
        toCityBtn.addEventListener('click', () => switchView('city'));
    }
    if (UI.btn.backToCity) {
        UI.btn.backToCity.addEventListener('click', () => switchView('city'));
    }
}

export function initInteractionListeners() {
    injectStyles();
    
    const container = document.getElementById('three-container');
    if (!container) return;
    
    // Zoom (Mouse Wheel)
    container.addEventListener('wheel', (e) => {
        // If Middle Mouse Button is held, this might be a pan attempt on some mouses, 
        // but typically wheel is just scroll.
        // Standard wheel zoom
        e.preventDefault();
        const direction = e.deltaY > 0 ? -1 : 1;
        let newZoom = RenderEngine.camera.zoom + (direction * 0.1);
        if (newZoom < 0.5) newZoom = 0.5;
        if (newZoom > 3.0) newZoom = 3.0;
        
        RenderEngine.camera.zoom = newZoom;
        RenderEngine.camera.updateProjectionMatrix();
        
        Game.zoom = newZoom;
    });

    // Mouse Move (Hover, Drag, Pan)
    container.addEventListener('mousemove', (e) => {
        // 1. Handle Camera Panning
        if (RenderEngine.panState.isPanning) {
            e.preventDefault();
            const deltaX = e.clientX - RenderEngine.panState.lastX;
            const deltaY = e.clientY - RenderEngine.panState.lastY;
            
            RenderEngine.panCamera(deltaX, deltaY);
            
            RenderEngine.panState.lastX = e.clientX;
            RenderEngine.panState.lastY = e.clientY;
            return;
        }

        const worldPos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
        
        // 2. Handle Object Dragging
        if (Game.dragState.isDragging && Game.dragState.id) {
            e.preventDefault();
            const id = Game.dragState.id;
            const newX = worldPos.x - Game.dragState.offsetX;
            const newY = worldPos.y - Game.dragState.offsetY;
            RenderEngine.updateEntityPosition(id, newX, newY);
            return;
        }

        // 3. Handle Hover (Highlight)
        const intersects = RenderEngine.getIntersections(e.clientX, e.clientY);
        if (intersects.length > 0) {
            const target = intersects.find(hit => hit.object.userData && (hit.object.userData.type === 'building' || hit.object.userData.type === 'general'));
            
            if (target) {
                const id = target.object.userData.id;
                if (Game.hoveredBuildingId !== id) {
                    if (Game.hoveredBuildingId) {
                         RenderEngine.setHighlight(Game.hoveredBuildingId, false);
                    }
                    RenderEngine.setHighlight(id, true);
                    container.style.cursor = 'pointer';
                    Game.hoveredBuildingId = id;
                }
            } else {
                 if (Game.hoveredBuildingId !== null) {
                    RenderEngine.setHighlight(Game.hoveredBuildingId, false);
                    container.style.cursor = 'default';
                    Game.hoveredBuildingId = null;
                }
            }
        } else {
             if (Game.hoveredBuildingId !== null) {
                RenderEngine.setHighlight(Game.hoveredBuildingId, false);
                container.style.cursor = 'default';
                Game.hoveredBuildingId = null;
            }
        }
    });

    // Mouse Down (Start Drag / Pan)
    container.addEventListener('mousedown', (e) => {
        // Middle Button (1) -> Start Pan
        if (e.button === 1) {
            e.preventDefault();
            RenderEngine.panState.isPanning = true;
            RenderEngine.panState.lastX = e.clientX;
            RenderEngine.panState.lastY = e.clientY;
            container.style.cursor = 'move';
            return;
        }
        
        // Left Button (0) -> Start Drag / Interact
        if (e.button !== 0) return;

        const intersects = RenderEngine.getIntersections(e.clientX, e.clientY);
        const target = intersects.find(hit => hit.object.userData && (hit.object.userData.type === 'building' || hit.object.userData.type === 'general'));
        
        if (target) {
            const obj = target.object;
            const id = obj.userData.id;
            const worldPos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
            
            const isGeneral = obj.userData.type === 'general';
            
            if (isGeneral) {
                 Game.dragState.isDragging = true;
                 Game.dragState.id = id;
                 Game.dragState.type = 'general';
                 Game.dragState.data = obj.userData.data;
                 
                 const objGameX = obj.position.x;
                 const objGameY = obj.position.z;
                 
                 Game.dragState.offsetX = worldPos.x - objGameX;
                 Game.dragState.offsetY = worldPos.y - objGameY;
                 
                 log(`Started dragging general ${id}`);
                 
            } else {
                 Game.dragState.timer = setTimeout(() => {
                    Game.dragState.isDragging = true;
                    Game.dragState.id = id;
                    Game.dragState.type = 'building';
                    
                    const objGameX = obj.position.x;
                    const objGameY = obj.position.z;
                    
                    Game.dragState.offsetX = worldPos.x - objGameX;
                    Game.dragState.offsetY = worldPos.y - objGameY;
                    
                    Game.dragState.timer = null;
                    log(`Started dragging building ${id}`);
                }, 500);
            }
        }
    });

    // Mouse Up (End Drag / Pan)
    const endInteraction = (e) => {
        // End Pan
        if (RenderEngine.panState.isPanning) {
            RenderEngine.panState.isPanning = false;
            container.style.cursor = 'default';
        }

        if (Game.dragState.timer) {
            clearTimeout(Game.dragState.timer);
            Game.dragState.timer = null;
        }

        if (Game.dragState.isDragging) {
            const id = Game.dragState.id;
            const type = Game.dragState.type;
            const obj = RenderEngine.objects[id];
            
            if (obj) {
                const finalX = Math.floor(obj.position.x);
                const finalY = Math.floor(obj.position.z);
                
                log(`Moved ${type} ${id} to (${finalX}, ${finalY})`);

                if (type === 'general') {
                     const generalId = obj.userData.data.id;
                     sendRequest('move_general', { id: generalId, x: finalX, y: finalY }, (res) => {
                        if (res.ok) {
                            const g = Game.data.generals.find(g => g.id === generalId);
                            if (g) { g.x = res.x; g.y = res.y; }
                            renderMap();
                        } else {
                            renderMap();
                        }
                    });
                } else {
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
                }
            }

            Game.dragState.isDragging = false;
            Game.dragState.id = null;
            Game.dragState.type = null;
        }
    };

    container.addEventListener('mouseup', endInteraction);
    container.addEventListener('mouseleave', endInteraction);
}

function injectStyles() {
    // No specific styles needed for Three.js interaction yet, maybe cursor
}
