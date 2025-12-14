import { Entity } from './Entity.js';
import { RenderEngine } from '../../render/render_engine.js';

export class General extends Entity {
    constructor(data) {
        super(data);
        this.type = 'general';
    }

    createMesh() {
        const size = 40;
        this.mesh = RenderEngine.createEntity(
            this.getRenderId(), 
            'assets/guanfu.png', // Placeholder
            size, 
            size, 
            this.x, 
            this.y
        );
    }
}

