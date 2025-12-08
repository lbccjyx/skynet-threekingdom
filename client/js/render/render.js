import { Game } from '../core/state.js';
import { UI } from '../ui/elements.js';
import { TILE_SIZE, CAMERA_CONFIG, LIGHT_CONFIG, GRID_SIZE } from '../core/config.js';
import { RenderEngine } from './render_engine.js';

// 城内城外视图切换
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

// 更新UI
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

// 更新资源UI
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

// 渲染城内
export function renderCity() {
    RenderEngine.clearWorld();
    
    const bgMesh = RenderEngine.createEntity('city_bg', 'assets/chengqiang.png', TILE_SIZE*40, TILE_SIZE*50, 0, 0);
    bgMesh.position.set(0, -50, 0); // Put it well below everything to avoid interference
    bgMesh.quaternion.set(0, 0, 0, 1); 
    bgMesh.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
    
    // Render Buildings (Region 1)
    if (Game.data.buildings) {
        Game.data.buildings.forEach(b => {
            const region = b.region !== undefined ? b.region : 1;
            if (region !== 1) return; 

            renderBuilding(b);
        });
    }
    renderRects(1);
}

// 渲染城外
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
    renderRects(2);
}

// 渲染建筑
function renderBuilding(b) {
    const def = BUILDING_DEFINITIONS[b.type] || { width: 3, height: 2, name: 'Unknown', image: 'assets/guanfu.png' };
    const width = def.width * TILE_SIZE;
    const height = def.height * TILE_SIZE;
    
    // Use defined image or fallback
    const image = def.image;
    
    const mesh = RenderEngine.createEntity('build_' + b.id, image, width, height, b.x, b.y);
    mesh.userData.type = 'building';
    mesh.userData.data = b;
    mesh.userData.def = def;
    mesh.renderOrder =10 ; 
}

// 下面是还没放置的建筑 在游戏中说是幽灵
export function createGhost(def, x, y) {
    const width = def.width * TILE_SIZE;
    const height = def.height * TILE_SIZE;
    const image = def.image;
    const id = 'ghost_building';
    
    const mesh = RenderEngine.createEntity(id, image, width, height, x, y);
    
    if (mesh.material) {
        mesh.material.opacity = 0.6;
        mesh.material.transparent = true;
        mesh.material.color.setHex(0x99ff99); // Light green tint
    }
    
    return mesh;
}

// 更新还没放置的建筑的位置
export function updateGhost(x, y) {
    RenderEngine.updateEntityPosition('ghost_building', x, y);
}

// 删除还没放置的建筑
export function removeGhost() {
    const id = 'ghost_building';
    const obj = RenderEngine.objects[id];
    if (obj) {
        RenderEngine.worldGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        delete RenderEngine.objects[id];
    }
}

// 渲染区域 (圈地)
function renderRects(currentRegion) {
    if (Game.data.rect_buildings) {
        Game.data.rect_buildings.forEach(r => {
            const region = r.region !== undefined ? r.region : 2; 
            if (region !== currentRegion) return;

            const cx = r.x + r.width / 2;
            const cy = r.y + r.height / 2;
            
            // Orange-ish color for farmland/rects
            const mesh = RenderEngine.createFlatEntity('rect_' + r.id, r.width, r.height, cx, cy, 0xffaa00);
            mesh.userData.type = 'rect_building';
            mesh.userData.data = r;
        });
    }
}
