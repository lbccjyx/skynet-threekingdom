import { Game } from './state.js';
import { UI } from './elements.js';
import { TILE_SIZE } from './config.js';
import { sendRequest } from './api.js';
import { log } from './utils.js';

export function switchView(viewName) {
    Game.currentView = viewName;
    if (viewName === 'city') {
        UI.views.city.classList.remove('hidden');
        UI.views.map.classList.add('hidden');
        renderCity();
    } else if (viewName === 'map') {
        UI.views.city.classList.add('hidden');
        UI.views.map.classList.remove('hidden');
        renderMap();
    }
}

export function updateUI() {
    updateResourcesUI();
    
    // City Info
    if (Game.data.city) {
        UI.city.name.textContent = Game.data.city.name;
        UI.city.level.textContent = Game.data.city.level;
    }
    
    // Buildings
    renderCity();
    
    // Map / Generals
    renderMap();
}

export function updateResourcesUI() {
    const items = Game.data.items;
    if (!items) return;
    
    // ITEM_DEFINITIONS is global
    for (const id in items) {
        const amount = items[id];
        const el = UI.res[id];
        if (el) {
            el.textContent = amount;
        }
    }
}

export function renderCity() {
    UI.city.container.innerHTML = '';
    
    // Render Buildings in City (Region 1)
    if (Game.data.buildings) {
        Game.data.buildings.forEach(b => {
            // Default region is 1 if undefined (backward compatibility)
            const region = b.region !== undefined ? b.region : 1;
            if (region !== 1) return; 

            renderBuilding(b, UI.city.container);
        });
    }
}

export function renderMap() {
    const toCityBtn = UI.btn.toCity;
    const parent = UI.map.container;
    
    // Clear content but keep the back button if it's inside
    parent.innerHTML = '';
    if (toCityBtn) {
        parent.appendChild(toCityBtn);
    }
    
    // Render Generals
    if (Game.data.generals) {
        Game.data.generals.forEach(g => {
            const el = document.createElement('div');
            el.className = 'general-unit';
            el.textContent = g.name.substring(0, 1);
            el.style.left = g.x + 'px';
            el.style.top = g.y + 'px';
            el.title = `${g.name} (${g.x}, ${g.y})`;
            
            // Simple Drag & Drop (Mock)
            el.onclick = (e) => {
                e.stopPropagation();
                const newX = Math.floor(Math.random() * 300);
                const newY = Math.floor(Math.random() * 300);
                
                sendRequest('move_general', { id: g.id, x: newX, y: newY }, (res) => {
                    if (res.ok) {
                        g.x = res.x;
                        g.y = res.y;
                        renderMap();
                        log(`${g.name} moved to (${res.x}, ${res.y})`);
                    }
                });
            };
            
            parent.appendChild(el);
        });
    }

    // Render Buildings (Region 2)
    if (Game.data.buildings) {
        Game.data.buildings.forEach(b => {
             const region = b.region !== undefined ? b.region : 1;
             if (region !== 2) return;
             
             renderBuilding(b, parent);
        });
    }
}

function renderBuilding(b, container) {
    const def = BUILDING_DEFINITIONS[b.type] || { width: 2, height: 2, name: 'Unknown' };
    const width = def.width * TILE_SIZE;
    const height = def.height * TILE_SIZE;
    
    // x,y is center
    const left = b.x - width / 2;
    const top = b.y - height / 2;
    
    const el = document.createElement('div');
    el.className = 'building-entity';
    el.style.width = width + 'px';
    el.style.height = height + 'px';
    el.style.left = left + 'px';
    el.style.top = top + 'px';

    if (def.image) {
        el.style.backgroundImage = `url(${def.image})`;
        el.style.backgroundSize = '100% 100%';
        el.style.backgroundRepeat = 'no-repeat';
        // Hide text if image is present, or keep it? 
        // For now, let's keep the name but maybe it's not needed if the image is good.
        // But if I remove innerHTML, I remove the name. 
        // The original code sets innerHTML to name.
    }

    el.innerHTML = `<div>${def.name}</div>`;
    el.dataset.beginTime = b.begin_build_time || 0;
    el.dataset.buildSec = def.build_sec || 10;
    el.dataset.id = b.id;

    if (Game.hoveredBuildingId === b.id) {
        el.classList.add('highlight');
    }
    
    // Progress Bar Container
    const prog = document.createElement('div');
    prog.className = 'progress-bar';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    prog.appendChild(fill);
    el.appendChild(prog);
    
    container.appendChild(el);
}

