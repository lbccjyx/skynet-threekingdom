import { BaseScene } from './BaseScene.js';
import { Game } from '@core/state.js';
import { Building } from '../entities/Building.js';
import { RectBuilding } from '../entities/rect_building/RectBuilding.js';
import { TILE_SIZE } from '@config';
import { UI } from '@ui/elements.js';
import { CRenderTexture } from '@render/render_texture.js';
import { log } from '../../core/utils.js';

export class CityScene extends BaseScene {
    constructor() {
        super('city');
    }

    enter() {
        UI.views.city.classList.remove('hidden');
        UI.views.map.classList.add('hidden');
        super.enter();
    }

    // 
    setup() {

        // Render Background
        const bgMesh = CRenderTexture.CreateEntity('city_bg', 'assets/background.png', TILE_SIZE*40, TILE_SIZE*50, 0, 0);
        bgMesh.position.set(0, -50, 0); 
        bgMesh.quaternion.set(0, 0, 0, 1); 
        bgMesh.rotation.set(-Math.PI / 2, 0, Math.PI / 4);

        // 计算城墙的连接关系
        const wallMap = new Set();
        if (Game.data.rect_buildings) {
            Game.data.rect_buildings.forEach(r => {
                const region = r.region !== undefined ? r.region : 2; 
                if (region !== 1) return;
                if (r.type !== 3) return; // Wall Type

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

        // Render Buildings (Region 1)
        if (Game.data.buildings) {
            Game.data.buildings.forEach(b => {
                const region = b.region !== undefined ? b.region : 1;
                if (region !== 1) return; 
                this.addEntity(new Building(b));
            });
        }

        // Render RectBuildings (Region 1)
        if (Game.data.rect_buildings) {
            Game.data.rect_buildings.forEach(r => {
                const region = r.region !== undefined ? r.region : 2; 
                if (region !== 1) return;
                // 父类 BaseScene.addentity的时候会触发到 entity.mount(); 又因为 Entity.mount()  会调用 Entity.createMesh();
                //  所以相当于调用了RectBuilding.createMesh 也就是说每个rect_building都会调用一次 createMesh方法
                this.addEntity(new RectBuilding(r, wallMap));
            });
        }
    }
}

