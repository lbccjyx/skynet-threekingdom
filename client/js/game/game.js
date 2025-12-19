import { Game } from '../core/state.js';
import { connectWS } from '../core/network.js';
import { setupContextMenus, initListeners, initInteractionListeners } from '../input/input.js';
import { RenderEngine } from '../render/render_engine.js';
import { GameToolbar } from '../ui/game_toolbar.js';
import { sceneManager } from './managers/SceneManager.js';
import { CityScene } from './scenes/CityScene.js';
import { MapScene } from './scenes/MapScene.js';
import { UI } from '@ui/elements.js';

export async function startGame() {
    try {
        // 1. Load Sproto Definition
        const response = await fetch('game.sproto');
        const sprotoText = await response.text();
        
        // 2. Initialize Sproto
        const SprotoClass = window.Sproto || Sproto;
        Game.sproto = new SprotoClass(sprotoText);
        Game.host = Game.sproto.host("package");
        Game.request = Game.host.attach(Game.sproto);
        
        // 3. Connect WebSocket
        connectWS();
        
        // 4. Setup Inputs
        setupContextMenus();
        
        // Init UI Listeners
        initListeners();
        initInteractionListeners();
        GameToolbar.init();

        // Initialize 3D Engine
        RenderEngine.init();

        // Initialize Scenes
        sceneManager.registerScene('city', new CityScene());
        sceneManager.registerScene('map', new MapScene());
        
        // Default View
        sceneManager.switchScene('city');

        // Start Game Loop (Progress bars, etc.)
        startGameLoop();
        
    } catch (e) {
        alert("初始化失败: " + e.message);
        console.error(e);
    }
}

// Global update loop
function startGameLoop() {
    let lastTime = performance.now();
    
    const loop = (time) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        sceneManager.update(dt);
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}

// 供外部调用的切换视图接口（兼容旧代码）
export function switchView(viewName) {
    Game.currentView = viewName;
    sceneManager.switchScene(viewName);
}

// 供外部调用的刷新接口
export function updateGameView() {
    const current = sceneManager.getCurrentScene();
    if (current) {
        current.enter();
    }
}

// 更新UI (从 render.js 迁移过来)
export function updateUI() {
    updateResourcesUI();
    
    // City Info
    if (Game.data.city) {
        UI.city.name.textContent = Game.data.city.name;
        UI.city.level.textContent = Game.data.city.level;
    }
    
    // Refresh current view
    updateGameView();
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
