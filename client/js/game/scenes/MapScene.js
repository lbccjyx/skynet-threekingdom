import { BaseScene } from './BaseScene.js';
import { Game } from '@core/state.js';
import { CBuilding } from '@entities/building/d_building.js';
import { CRectBuilding } from '@entities/rect_building/d_rect_building.js';
import { CGeneral } from '@entities/person/general/d_general.js';
import { TILE_SIZE } from '@config';
import { UI } from '@ui/elements.js';

export class MapScene extends BaseScene {
    constructor() {
        super('map');
    }

    enter() {
        UI.views.city.classList.add('hidden');
        UI.views.map.classList.remove('hidden');
        super.enter();
    }

    setup() {
        // Pre-calculate Wall Map (if walls exist in map)
        const wallMap = new Set();
        if (Game.data.rect_buildings) {
            Game.data.rect_buildings.forEach(r => {
                const region = r.region !== undefined ? r.region : 2; 
                if (region !== 2) return;
                if (r.type !== 3) return; 

                const cols = Math.round(r.width / TILE_SIZE);
                const rows = Math.round(r.height / TILE_SIZE);
                const startX = Math.round(r.x / TILE_SIZE);
                const startY = Math.round(r.y / TILE_SIZE);

                for(let c=0; c<cols; c++) {
                    for(let row=0; row<rows; row++) {
                        wallMap.add(`${startX + c},${startY + row}`);
                    }
                }
            });
        }

        // Render Generals
        if (Game.data.generals) {
            Game.data.generals.forEach(g => {
                this.addEntity(new CGeneral(g));
            });
        }

        // Render Buildings (Region 2)
        if (Game.data.buildings) {
            Game.data.buildings.forEach(b => {
                const region = b.region !== undefined ? b.region : 1;
                if (region !== 2) return;
                this.addEntity(new CBuilding(b));
            });
        }

        // Render RectBuildings (Region 2)
        if (Game.data.rect_buildings) {
            Game.data.rect_buildings.forEach(r => {
                const region = r.region !== undefined ? r.region : 2; 
                if (region !== 2) return;
                this.addEntity(new CRectBuilding(r, wallMap));
            });
        }
    }
}

