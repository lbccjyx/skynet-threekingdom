import { Entity } from './Entity.js';
import { CRenderTexture } from '@render/render_texture.js';

export class General extends Entity {
    constructor(data) {
        super(data);
        this.type = 'general';
    }

    createMesh() {
        const size = 40;
        this.mesh = CRenderTexture.CreateEntity(
            this.getRenderId(), 
            'assets/guanfu.png', // Placeholder
            size, 
            size, 
            this.x, 
            this.y
        );
    }
}

