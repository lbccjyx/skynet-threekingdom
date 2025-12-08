import { Game } from '../core/state.js';
import { connectWS } from '../core/network.js';
import { setupContextMenus, initListeners, initInteractionListeners } from '../input/input.js';
import { RenderEngine } from '../render/render_engine.js';

export async function startGame() {
    // 1. Load Sproto Definition
    try {
        const response = await fetch('game.sproto');
        const sprotoText = await response.text();
        
        // 2. Initialize Sproto
        // Sproto is a global class from sproto.js
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

        // Initialize 3D Engine
        RenderEngine.init();

        // Start Game Loop (Progress bars, etc.)
        startGameLoop();
        
    } catch (e) {
        alert("初始化失败: " + e.message);
        console.error(e);
    }
}

function startGameLoop() {
    setInterval(() => {
        if (!Game.data.buildings) return;

        const now = (Date.now() / 1000) + (Game.serverTimeOffset || 0);
        const definitions = window.BUILDING_DEFINITIONS || {}; // Global from StaticData.js
        
        Game.data.buildings.forEach(b => {
            const begin = parseInt(b.begin_build_time || 0);
            
            const def = definitions[b.type];
            const duration = def ? (def.build_sec || 10) : 10;
            
            if (begin > 0 && duration > 0) {
                const elapsed = now - begin;
                let pct = (elapsed / duration) * 100;
                
                if (pct > 100) pct = 100;
                if (pct < 0) pct = 0;
                
                RenderEngine.updateProgress(b.id, pct);
            }
        });
    }, 100);
}

