import { Game } from './state.js';
import { updateUI, updateResourcesUI } from './render.js';
import { log } from './utils.js';

export function updateGameState(data) {
    if (!data) return; // Add check for null data
    if (data.user) Game.data.user = data.user;
    if (data.city) Game.data.city = data.city;
    
    if (data.items) {
        data.items.forEach(item => {
            Game.data.items[item.id] = item.amount;
        });
    }
    
    if (data.generals) Game.data.generals = data.generals;
    if (data.buildings) Game.data.buildings = data.buildings;
    
    updateUI();
}

export function handlePush(name, args) {
    if (name === "push_items") {
        if (args && args.items) {
            args.items.forEach(item => {
                Game.data.items[item.id] = item.amount;
            });
            updateResourcesUI();
            log("Items updated");
        } else {
            log("Received empty items push");
        }
    } else {
        log("Unknown push: " + name);
    }
}

