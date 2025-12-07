import { Game } from './state.js';
import { UI } from './elements.js';
import { TILE_SIZE } from './config.js';
import { RenderEngine } from './render_engine.js';

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
    
    // Refresh current view
    if (Game.currentView === 'city') {
        renderCity();
    } else {
        renderMap();
    }
}

export function updateResourcesUI() {
    const items = Game.data.items;
    if (!items) return;
    
    for (const id in items) {
        const amount = items[id];
        const el = UI.res[id];
        if (el) {
            el.textContent = amount;
        }
    }
}

export function renderCity() {
    RenderEngine.clearWorld();
    
    // Render Buildings (Region 1)
    if (Game.data.buildings) {
        Game.data.buildings.forEach(b => {
            const region = b.region !== undefined ? b.region : 1;
            if (region !== 1) return; 

            renderBuilding(b);
        });
    }
}

export function renderMap() {
    RenderEngine.clearWorld();
    
    // Render Generals
    if (Game.data.generals) {
        Game.data.generals.forEach(g => {
            // Using guanfu.png as placeholder for general
            // In a real scenario, we'd generate a text texture or use a specific asset
            const size = 40;
            const mesh = RenderEngine.createEntity('gen_' + g.id, 'assets/guanfu.png', size, size, g.x, g.y);
            
            // Store type on userData for interaction
            mesh.userData.type = 'general';
            mesh.userData.data = g;
        });
    }

    // Render Buildings (Region 2)
    if (Game.data.buildings) {
        Game.data.buildings.forEach(b => {
             const region = b.region !== undefined ? b.region : 1;
             if (region !== 2) return;
             
             renderBuilding(b);
        });
    }
}

function renderBuilding(b) {
    const def = BUILDING_DEFINITIONS[b.type] || { width: 2, height: 2, name: 'Unknown', image: 'assets/guanfu.png' };
    const width = def.width * TILE_SIZE;
    const height = def.height * TILE_SIZE;
    
    // Use defined image or fallback
    const image = def.image || 'assets/guanfu.png';
    
    const mesh = RenderEngine.createEntity('build_' + b.id, image, width, height, b.x, b.y);
    mesh.userData.type = 'building';
    mesh.userData.data = b;
    mesh.userData.def = def;
}
