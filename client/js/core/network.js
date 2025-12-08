import { Game } from './state.js';
import { UI } from '../ui/elements.js';
import { log } from './utils.js';
import { sendRequest } from './api.js';
import { handlePush, updateGameState } from '../game/logic.js';

export function connectWS() {
    // Modify wsUrl to match current hostname if needed
    let wsUrl = Game.wsUrl;
    if (wsUrl.includes('localhost')) {
         wsUrl = wsUrl.replace('localhost', window.location.hostname);
    }

    const url = `${wsUrl}?token=${Game.token}`;
    log("Connecting to " + url);
    
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    
    ws.onopen = () => {
        log("WebSocket Connected");
        UI.screens.login.classList.add('hidden');
        UI.screens.game.classList.remove('hidden');
        
        // Send Login Request via Sproto
        sendRequest('login', { token: Game.token }, (res) => {
            // Use a custom replacer for BigInt
            const replacer = (key, value) =>
                typeof value === 'bigint' ? value.toString() : value;
            log("Game Login Response: " + JSON.stringify(res, replacer));
            updateGameState(res);
            
            // Start heartbeat
            setInterval(() => {
                sendRequest('heartbeat', {}, (res) => {
                    if (res.server_time) {
                         const now = Date.now() / 1000;
                         Game.serverTimeOffset = res.server_time - now;
                    }
                });
            }, 5000);
        });

        // 登录成功后，手动移除 hidden 类（以防万一）
        if (UI.screens.login.classList.contains('hidden') === false) {
             UI.screens.login.classList.add('hidden');
             UI.screens.game.classList.remove('hidden');
        }
    };
    
    ws.onmessage = (event) => {
        // Handle Sproto Message
        const buffer = new Uint8Array(event.data);
        
        try {
            const result = Game.host.dispatch(buffer);

            if (result.type === "REQUEST") {
                // Server Push
                handlePush(result.name, result.request);
            } else if (result.type === "RESPONSE") {
                // Response to our request
                const session = result.session !== undefined ? result.session : null;
                
                const cb = Game.callbacks[session];
                if (cb) {
                    delete Game.callbacks[session];
                    cb(result.response);
                }
            }
        } catch (e) {
            log("Sproto Dispatch Error: " + e.message);
            console.error(e);
        }
    };
    
    ws.onclose = () => {
        log("WebSocket Disconnected");
        alert("连接断开");
        location.reload();
    };
    
    ws.onerror = (e) => {
        log("WebSocket Error");
        console.error(e);
    };
    
    Game.ws = ws;
}

