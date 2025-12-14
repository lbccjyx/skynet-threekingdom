import { Entity } from './Entity.js';
import { RenderEngine } from '../../render/render_engine.js';
import { TILE_SIZE } from '../../core/config.js';

export class RectBuilding extends Entity {
    constructor(data, wallMap = null) {
        super(data);
        this.type = 'rect_building';
        this.width = data.width;
        this.height = data.height;
        this.wallMap = wallMap; // Shared reference to wall map for connectivity
    }

    createMesh() {
        const definitions = window.RECT_BUILDING_DEFINITIONS || {};
        const WALL_TYPE = 3; 

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        
        const def = definitions[this.data.type] || {};

        let customProcess = null;
        let glbFiles = def.image;

        if (this.data.type === WALL_TYPE) {
            // Use specific models for Pillar and Rail
            glbFiles = ['assets/glb_file/wall_pillar.glb', 'assets/glb_file/wall_rail.glb'];

            customProcess = (models, wx, wy, config) => {
                return this.processWallTile(models, wx, wy, config);
            };
        }

        this.mesh = RenderEngine.createFlatEntity(
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

    // Helper for Wall Connectivity
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
            // Placeholder logic if needed, but RenderEngine handles fallback usually? 
            // Actually RenderEngine expects us to return pieces if customProcess is used.
            // Let's implement simple fallback.
            const geo = new THREE.BoxGeometry(TILE_SIZE * 0.4, TILE_SIZE, TILE_SIZE * 0.4);
            const mat = new THREE.MeshLambertMaterial({ color: 0x555555 });
            const center = new THREE.Mesh(geo, mat);
            pieces.push(center);
            return pieces;
        }

        const { scale, liftY } = config; 

        const addPillar = () => {
            const clone = pillarModel.clone();
            clone.scale.set(scale.x*2/5, scale.y/5, scale.z/2);
            clone.position.set(0, liftY, 0);
            clone.rotation.y = Math.PI/2;
            pieces.push(clone);
        };

        const addRail = (rotY, shiftX, shiftZ) => {
            const clone = railModel.clone();        
            clone.scale.set(scale.x/5, scale.y/5, scale.z/2); 
            clone.rotation.y = rotY;
            clone.position.set(shiftX * TILE_SIZE, liftY, shiftZ * TILE_SIZE);       
            pieces.push(clone);
        };

        // Add Central Pillar
        addPillar();

        if (hasE) {
            addRail(0, -0.3, 0);
        }
        
        if (hasS) {
            addRail(Math.PI/2, 0, 1.2);
        }

        return pieces;
    }
}

