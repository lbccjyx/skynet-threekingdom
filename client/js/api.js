import { Game } from './state.js';
import { log } from './utils.js';

export function sendRequest(name, args, callback) {
    if (!Game.ws || Game.ws.readyState !== WebSocket.OPEN) return;
    
    Game.session++;
    const session = Game.session;
    
    if (callback) {
        Game.callbacks[session] = callback;
    }
    
    try {
        // request(name, args, session)
        if (Game.request) {
            const buffer = Game.request(name, args, session);
            Game.ws.send(buffer);
        } else {
            log("Sproto request function not initialized");
        }
    } catch (e) {
        log(`Failed to send ${name}: ${e.message}`);
    }
}

