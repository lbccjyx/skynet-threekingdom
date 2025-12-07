import { UI } from './elements.js';
import { Game } from './state.js';
import { sendRequest } from './api.js';
import { log } from './utils.js';
import { renderCity, renderMap, switchView } from './render.js';

export function setupContextMenus() {
    const containers = [
        { el: UI.map.container, region: 2 },
        { el: UI.city.container, region: 1 }
    ];

    containers.forEach(ctx => {
        if (!ctx.el) return;

        ctx.el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Capture coordinates at right-click time
            const rect = ctx.el.getBoundingClientRect();
            const buildX = Math.floor(e.clientX - rect.left + ctx.el.scrollLeft);
            const buildY = Math.floor(e.clientY - rect.top + ctx.el.scrollTop);

            // Remove existing menu
            const existing = document.querySelector('.context-menu');
            if (existing) existing.remove();
            
            // 右键后展示的建筑列表
            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            
            // Define closeMenu first
            const closeMenu = () => {
                if (document.body.contains(menu)) {
                    menu.remove();
                }
                document.removeEventListener('click', closeMenu);
            };

            // Access global BUILDING_DEFINITIONS
            const definitions = window.BUILDING_DEFINITIONS || BUILDING_DEFINITIONS;

            for (const key in definitions) {
                const def = definitions[key];
                const item = document.createElement('div');
                item.className = 'context-menu-item';
                item.textContent = def.name;
                
                item.onclick = (e) => {
                    e.stopPropagation();
                    
                    log(`Building ${def.name} at (${buildX}, ${buildY})`);
                    
                    // Send build request directly using captured coordinates
                    sendRequest('build', {
                        type: def.key,
                        x: buildX,
                        y: buildY,
                        region: ctx.region
                    }, (res) => {
                        if (res.ok) {
                            log("Building started!");
                            if (res.building) {
                                Game.data.buildings.push(res.building);
                                if (ctx.region === 1) renderCity();
                                else renderMap();
                            }
                        } else {
                            log("Build failed (Not enough resources?)");
                        }
                    });

                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                };
                menu.appendChild(item);
            }
            
            document.body.appendChild(menu);
            
            // Click outside to close - add delay to avoid immediate trigger
            setTimeout(() => document.addEventListener('click', closeMenu), 100);
        });
    });
}

export function initListeners() {
    if (UI.btn.toMap) {
        UI.btn.toMap.addEventListener('click', () => switchView('map'));
    }
    if (UI.btn.toCity) {
        UI.btn.toCity.addEventListener('click', () => switchView('city'));
    }
    if (UI.btn.backToCity) {
        UI.btn.backToCity.addEventListener('click', () => switchView('city'));
    }
}

export function initInteractionListeners() {
    injectStyles();
    
    const containers = [UI.city.container, UI.map.container];
    
    containers.forEach(container => {
        if (!container) return;

        // Mouse Move (Hover & Drag)
        container.addEventListener('mousemove', (e) => {
            // 1. Handle Dragging
            if (Game.dragState.isDragging && Game.dragState.el) {
                e.preventDefault(); // Prevent selection while dragging
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left + container.scrollLeft;
                const y = e.clientY - rect.top + container.scrollTop;
                
                const el = Game.dragState.el;
                // Apply the offset so the element moves relative to where we grabbed it
                el.style.left = (x - Game.dragState.offsetX) + 'px';
                el.style.top = (y - Game.dragState.offsetY) + 'px';
                return; // Skip hover logic if dragging
            }

            // 2. Handle Long Press Cancel (if moved too much before drag starts)
            if (Game.dragState.timer) {
                 const rect = container.getBoundingClientRect();
                 const currentX = e.clientX - rect.left + container.scrollLeft;
                 const currentY = e.clientY - rect.top + container.scrollTop;
                 
                 // Simple distance check - if moved more than 5px, cancel long press
                 // We need to store start pos for this check, but for now, strict hold is fine.
                 // Or just let them move slightly.
            }

            // 3. Handle Hover
            const target = e.target.closest('.building-entity');
            if (target) {
                const id = parseInt(target.dataset.id);
                // Only update if changed
                if (Game.hoveredBuildingId !== id) {
                    // Remove old highlight
                    const old = container.querySelector('.building-entity.highlight');
                    if (old) old.classList.remove('highlight');
                    
                    // Add new highlight
                    target.classList.add('highlight');
                    Game.hoveredBuildingId = id;
                }
            } else {
                if (Game.hoveredBuildingId !== null) {
                    const old = container.querySelector('.building-entity.highlight');
                    if (old) old.classList.remove('highlight');
                    Game.hoveredBuildingId = null;
                }
            }
        });

        // Mouse Down (Start Long Press)
        container.addEventListener('mousedown', (e) => {
            // Left click only
            if (e.button !== 0) return;

            const target = e.target.closest('.building-entity');
            if (!target) return;

            const id = parseInt(target.dataset.id);
            
            // Calculate offset
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left + container.scrollLeft;
            const mouseY = e.clientY - rect.top + container.scrollTop;
            
            // Current element position
            // Note: style.left might be empty if defined in CSS, but here it's inline from render
            const elLeft = parseFloat(target.style.left) || 0;
            const elTop = parseFloat(target.style.top) || 0;

            // Store start position for tolerance check (optional)
            
            Game.dragState.timer = setTimeout(() => {
                Game.dragState.isDragging = true;
                Game.dragState.buildingId = id;
                Game.dragState.el = target;
                // Offset from mouse to element top-left
                Game.dragState.offsetX = mouseX - elLeft;
                Game.dragState.offsetY = mouseY - elTop;
                Game.dragState.timer = null;
                
                target.classList.add('dragging');
                log(`Started dragging building ${id}`);
            }, 500); // 500ms long press
        });

        // Mouse Up (End Drag / Cancel Timer)
        const endInteraction = (e) => {
             if (Game.dragState.timer) {
                clearTimeout(Game.dragState.timer);
                Game.dragState.timer = null;
            }

            if (Game.dragState.isDragging) {
                const el = Game.dragState.el;
                const id = Game.dragState.buildingId;
                
                // Calculate new center position for server
                // el.style.left is top-left corner. 
                // Center = Left + Width/2
                const width = parseFloat(el.style.width);
                const height = parseFloat(el.style.height);
                const left = parseFloat(el.style.left);
                const top = parseFloat(el.style.top);
                
                const newCenterX = Math.floor(left + width / 2);
                const newCenterY = Math.floor(top + height / 2);

                // Reset State
                Game.dragState.isDragging = false;
                Game.dragState.buildingId = null;
                Game.dragState.el = null;
                el.classList.remove('dragging');

                log(`Moved building ${id} to (${newCenterX}, ${newCenterY})`);

                // Send Request
                sendRequest('build_move', {
                    id: id,
                    new_x: newCenterX,
                    new_y: newCenterY
                }, (res) => {
                    if (res.ok) {
                        log('Move successful');
                        // Update local data
                        const b = Game.data.buildings.find(b => b.id === id);
                        if (b) {
                            b.x = res.building.x;
                            b.y = res.building.y;
                        }
                        // Re-render to snap to grid or correct position
                        if (container === UI.city.container) renderCity();
                        else renderMap();
                    } else {
                        log('Move failed');
                        // Revert position (Re-render will fix it because we didn't update b.x/y)
                        if (container === UI.city.container) renderCity();
                        else renderMap();
                    }
                });
            }
        };

        container.addEventListener('mouseup', endInteraction);
        // If mouse leaves container, end drag
        container.addEventListener('mouseleave', endInteraction);
    });
}

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .building-entity.highlight {
            box-shadow: 0 0 10px 2px gold;
            z-index: 10;
            cursor: grab;
        }
        .building-entity.dragging {
            opacity: 0.8;
            box-shadow: 0 0 15px 5px cyan;
            z-index: 100;
            cursor: grabbing;
            pointer-events: none; /* Let mouse events pass through during drag if needed, but here we drag via container */
        }
    `;
    document.head.appendChild(style);
}
