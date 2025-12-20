import { Entity } from './Entity.js';
import { TILE_SIZE } from '@config';
import { Game } from '@core/state.js';
import { CRenderTexture } from '@render/render_texture.js';
import { CRenderInput } from '@render/render_input.js';

export class Building extends Entity {
    constructor(data) {
        super(data);
        this.type = 'building';
        this.def = window.BUILDING_DEFINITIONS[data.type] || { 
            width: 3, 
            height: 2, 
            name: 'Unknown', 
            image: 'assets/guanfu.png' 
        };
    }

    createMesh() {
        const width = this.def.width * TILE_SIZE;
        const height = this.def.height * TILE_SIZE;
        const image = this.def.image;

        this.mesh = CRenderTexture.CreateEntity(
            this.getRenderId(), 
            image, 
            width, 
            height, 
            this.x, 
            this.y
        );

        // Additional props
        this.mesh.userData.def = this.def;
        this.mesh.renderOrder = 10;
    }

    update(dt) { // dt in seconds
        this.updateProgress();
    }

    updateProgress() {
        if (!this.data.begin_build_time) return;

        const now = (Date.now() / 1000) + (Game.serverTimeOffset || 0);
        const begin = parseInt(this.data.begin_build_time || 0);
        const duration = this.def.build_sec || 10;

        if (begin > 0 && duration > 0) {
            const elapsed = now - begin;
            let pct = (elapsed / duration) * 100;
            
            if (pct > 100) pct = 100;
            if (pct < 0) pct = 0;
            
            CRenderInput.UpdateProgress(this.getRenderId(), pct);
        }
    }
}

