import { Game } from './state.js';
import { connectWS } from './network.js';
import { setupContextMenus, initListeners, initInteractionListeners } from './input.js';

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

        // Start Game Loop (Progress bars, etc.)
        startGameLoop();
        
    } catch (e) {
        alert("初始化失败: " + e.message);
        console.error(e);
    }
}

function startGameLoop() {
    setInterval(() => {
        const buildings = document.querySelectorAll('.building-entity');
        const now = (Date.now() / 1000) + (Game.serverTimeOffset || 0);
        
        buildings.forEach(b => {
            const begin = parseInt(b.dataset.beginTime);
            const duration = parseInt(b.dataset.buildSec);
            if (begin > 0 && duration > 0) {
                const elapsed = now - begin;
                let pct = (elapsed / duration) * 100;
                if (pct > 100) pct = 100;
                if (pct < 0) pct = 0;
                
                const fill = b.querySelector('.progress-fill');
                if (fill) fill.style.width = pct + '%';
                
                const bar = b.querySelector('.progress-bar');
                if (pct >= 100 && bar) bar.style.display = 'none';
            }
        });
    }, 100);
}

