import { Entity } from '../Entity.js';
import { CRenderEngine } from '@render/render_engine.js';
import { TILE_SIZE } from '@config';
import { Game } from '@core/state.js';
import { log } from '@utils';
import { CSubBuildingRenderer } from '@render/render_sub_building.js';
import { CRenderRectBuilding } from '@render/render_rect_building.js';
import { CRenderTexture } from '@render/render_texture.js';

// 此类主要用于渲染圈地，包括渲染圈地、渲染子建筑、渲染城墙等操作
export class RectBuilding extends Entity {
    constructor(data, wallMap = null) {
        super(data);
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

        if (subs.length > 0) {
            // New Mode: Render sub-buildings
            this.renderSubBuildings(subs);
            
            // Render a transparent base for selection/hit detection
            this.mesh = CRenderTexture.CreateEntity(
                this.getRenderId(),
                null, // No image
                this.width,
                this.height,
                this.x + this.width / 2, // Centered X
                this.y + this.height / 2 // Centered Y
            );
            
            // Store dimensions in userData for drag logic
            if (this.mesh) {
                this.mesh.userData.width = this.width;
                this.mesh.userData.height = this.height;
                this.mesh.userData.type = 'rect_building'; // Must match check in d_build_rect_input
                
                // Store original data needed for logic
                this.mesh.userData.data = this.data; 
            }

            if (this.mesh) {
                this.mesh.rotation.x = -Math.PI / 2;
                this.mesh.rotation.y = 0;
                this.mesh.rotation.z = 0;
                this.mesh.quaternion.setFromEuler(this.mesh.rotation);
            }

            if (this.mesh && this.mesh.material) {
                this.mesh.material.opacity = 0.3; // Lightly visible
                this.mesh.material.color.setHex(0xaaaaaa); // Grayish
            }

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

    renderSubBuildings(subs) {
        subs.forEach(sub => {
            const buildDef = window.BUILDING_DEFINITIONS[sub.building_type];
            if (!buildDef) return;

            const subId = `rect_sub_${sub.id}_${sub.x}_${sub.y}`;
            this.subRenderIds.push(subId);

            // Determine GLB path
            let glbPath = buildDef.image; // Default
            if (buildDef.imageDir) {
                glbPath = `${buildDef.imageDir}/${sub.building_index}.glb`;
            }
            log("glbPath: " + glbPath);
            CSubBuildingRenderer.Render(
                subId,
                sub.x,
                sub.y,
                glbPath,
                buildDef.width,
                buildDef.height
            );
        });
    }

    createLegacyMesh(def) {
        // Safety check: if no definition or image, skip legacy mesh creation
        // This can happen during transient states where sub-buildings are updated but parent rect isn't yet
        // leading to getSubBuildings() returning empty because of coordinate mismatch.
        if (!def || !def.image) {
            // log("RectBuilding: No legacy definition found for type " + this.data.type);
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

    // Helper for Wall Connectivity (Legacy)
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
        // Cleanup sub-buildings
        if (this.subRenderIds) {
            this.subRenderIds.forEach(id => {
                const obj = CRenderEngine.objects[id];
                if (obj) {
                    CRenderEngine.worldGroup.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                         if (Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose());
                         else obj.material.dispose();
                    }
                    delete CRenderEngine.objects[id];
                }
            });
            this.subRenderIds = [];
        }
        super.unmount();
    }
}
