import { Entity } from '../Entity.js';
import { CRenderEngine } from '@render/render_engine.js';
import { TILE_SIZE } from '@config';
import { Game } from '@core/state.js';
import { log } from '@utils';
import { CSubBuildingRender } from '@render/render_sub_building.js';
import { CRenderRectBuilding } from '@render/render_rect_building.js';
import { CRenderTexture } from '@render/render_texture.js';

// 此类主要用于渲染圈地，包括渲染圈地、渲染子建筑、渲染城墙等操作
export class RectBuilding extends Entity {
    constructor(data, wallMap = null) {
        // data是proto消息 .RectBuilding
        super(data);
        this.id = data.id;
        this.type = 'rect_building';
        this.width = data.width;
        this.height = data.height;
        this.wallMap = wallMap; // Shared reference to wall map for connectivity (Legacy support)
        this.subRenderIds = []; // Track sub-building render IDs
    }

    createMesh() {
        const definitions = window.RECT_BUILDING_DEFINITIONS || {};
        const def = definitions[this.data.type] || {};
        const subs = this.getSubBuildings();

        // 区分是否有sub_building走的两个不同的3D对象渲染逻辑
        if (subs.length > 0) {
            // New Mode: Render sub-buildings
            this.renderSubBuildings(subs);
            
        } else {
            this.createLegacyMesh(def);
        }
    }

    getSubBuildings() {
        if (!Game.data.rect_buildings_sub) return [];
        const subs = Game.data.rect_buildings_sub.filter(sub => {
            // log(`Sub check: sub(${sub.x}, ${sub.y})`); // Uncomment to see all sub coords
            return sub.x >= this.x && 
                   sub.x < this.x + this.width && 
                   sub.y >= this.y && 
                   sub.y < this.y + this.height;
        });

        return subs;
    }

    // 对于每个子建筑进行简单的3D对象展示
    renderSubBuildings(subs) {
        // Create the main group for the rect building
        this.mesh = new THREE.Group();
        
        // Position at the center of the rect
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        this.mesh.position.set(centerX, 0, centerY);

        // Set userData for interaction (dragging, etc.)
        this.mesh.userData = {
            id: this.getRenderId(),
            type: 'rect_building',
            width: this.width,
            height: this.height,
            rectBuildingId: this.id // For build_rect lookup
        };

        // Register with RenderEngine
        CRenderEngine.worldGroup.add(this.mesh);
        CRenderEngine.objects[this.getRenderId()] = this.mesh;

        subs.forEach(sub => {
            const buildDef = window.BUILDING_DEFINITIONS[sub.building_type];
            if (!buildDef) 
            {
                log("proto消息RectBuildingSub的building_type错误  当前building_type: " + sub.building_type);
                return;
            }

            // We don't need subId tracking anymore since everything is in one group
            
            let glbPath = buildDef.image; // Default
            if (buildDef.imageDir) {
                glbPath = `${buildDef.imageDir}/${sub.building_index}.glb`;
            }
            
            // Calculate local position relative to the rect center
            const localX = sub.x - centerX;
            const localY = sub.y - centerY;

            // Add to the main group
            CSubBuildingRender.AddToGroup(
                this.mesh,
                localX,
                localY,
                glbPath,
                buildDef.width,
                buildDef.height
            );
        });
    }

    createLegacyMesh(def) {
        if (!def || !def.image) {
            return;
        }

        const WALL_TYPE = 3; 

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        
        let customProcess = null;
        let glbFiles = def.image;

        if (this.data.type === WALL_TYPE) {
            // Use specific models for Pillar and Rail
            glbFiles = ['assets/glb_file/wall_pillar.glb', 'assets/glb_file/wall_rail.glb'];

            // 函数指针 传入函数 后续如果有此函数 会在 RenderRectBuilding的 handleCustomProcess 处理逻辑
            customProcess = (models, wx, wy, config) => {
                return this.processWallTile(models, wx, wy, config);
            };
        }

        this.mesh = CRenderRectBuilding.CreateFlatEntity(
            this.getRenderId(), 
            this.width, 
            this.height, 
            cx, 
            cy, 
            this.data.type, 
            glbFiles,
            customProcess
        );
    }

    // 城墙连接算法
    processWallTile(models, wx, wy, config) {
        // If no wallMap provided, cannot calculate connectivity properly
        if (!this.wallMap) return [];

        const tx = Math.floor(wx / TILE_SIZE);
        const ty = Math.floor(wy / TILE_SIZE);
        
        // Check neighbors
        const hasN = this.wallMap.has(`${tx},${ty-1}`);
        const hasS = this.wallMap.has(`${tx},${ty+1}`);
        const hasW = this.wallMap.has(`${tx-1},${ty}`);
        const hasE = this.wallMap.has(`${tx+1},${ty}`);
        
        const pieces = [];

        // Assuming models[0] is Pillar, models[1] is Rail (Arm)
        let pillarModel = null;
        let railModel = null;

        if (Array.isArray(models)) {
            pillarModel = models[0];
            railModel = models[1] || models[0]; 
        } else {
            pillarModel = models;
            railModel = models;
        }
        
        if (!pillarModel) {
            const geo = new THREE.BoxGeometry(TILE_SIZE * 0.4, TILE_SIZE, TILE_SIZE * 0.4);
            const mat = new THREE.MeshLambertMaterial({ color: 0x555555 });
            const center = new THREE.Mesh(geo, mat);
            pieces.push(center);
            return pieces;
        }

        const { scale, liftY } = config; 

        const addPillar = (rotY) => {
            const clone = pillarModel.clone();
            clone.scale.set(scale.x*2/5, scale.y/5, scale.z/2);
            clone.position.set(0, liftY, 0);
            clone.rotation.y = rotY;
            pieces.push(clone);
        };

        const addRail = (rotY, shiftX, shiftZ) => {
            const clone = railModel.clone();        
            clone.scale.set(scale.x/5, scale.y/5, scale.z/2); 
            clone.rotation.y = rotY;
            clone.position.set(shiftX * TILE_SIZE, liftY, shiftZ * TILE_SIZE);       
            pieces.push(clone);
        };

        let IsPillarShow = false;
        if (hasE) {
            addRail(0, -0.3, 0);
            addPillar(Math.PI/2);
            IsPillarShow = true;
        }
        
        if (hasS) {
            addRail(Math.PI/2, 0, 1.2);
            addPillar(Math.PI);
            IsPillarShow = true;
        }

        if(!IsPillarShow) {
            addPillar(Math.PI/2);
        }

        return pieces;
    }

    // 删除的时候会调用
    unmount() {
        // Cleanup main mesh
        if (this.mesh) {
            CRenderEngine.RemoveObject(this.getRenderId());
            this.mesh = null;
        }
        super.unmount();
    }
}
