import { Game } from '../core/state.js';
import { updateUI, updateResourcesUI } from '../game/game.js';
import { log } from '../core/utils.js';

// proto回调更新游戏状态
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
    if (data.rect_buildings) Game.data.rect_buildings = data.rect_buildings;
    if (data.rect_buildings_sub) Game.data.rect_buildings_sub = data.rect_buildings_sub;
    
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
    } else if (name === "build_rect_sub") {
        if (args && args.rect_buildings_sub) {
            if (!Game.data.rect_buildings_sub) {
                Game.data.rect_buildings_sub = [];
            }
            args.rect_buildings_sub.forEach(newSub => {
                const idx = Game.data.rect_buildings_sub.findIndex(s => s.id === newSub.id);
                if (idx >= 0) {
                    Game.data.rect_buildings_sub[idx] = newSub;
                } else {
                    Game.data.rect_buildings_sub.push(newSub);
                }
            });
            log("Rect Sub Buildings updated count: " + args.rect_buildings_sub.length);
            updateUI();
        }
    } else {
        log("Unknown push: " + name);
    }
}

