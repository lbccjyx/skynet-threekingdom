import { CRenderEngine } from '@render/render_engine.js';
import { CRenderInput } from '@render/render_input.js';

export const getNumberAfterUnderscore = (str) => {
    const match = str.match(/_(\d+)[^_]*$/);
    return match ? parseInt(match[1]) : null;
}


export class Entity {
    constructor(data) {
        this.id = data.id || Math.random().toString(36).substr(2, 9);
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.data = data;
        this.mesh = null;
        this.type = 'entity';
    }

    // Called when added to scene
    mount() {
        this.createMesh();
        if (this.mesh) {
            this.mesh.userData.entity = this; // Link back to entity
            this.mesh.userData.type = this.type;
            this.mesh.userData.data = this.data;
        }
    }

    // Called when removed from scene
    unmount() {
        if (this.mesh) {
            CRenderEngine.worldGroup.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            if (CRenderEngine.objects[this.getRenderId()]) {
                delete CRenderEngine.objects[this.getRenderId()];
            }
            this.mesh = null;
        }
    }

    createMesh() {
        // Override me
    }

    update(dt) {
        // Override me
    }

    render() {
        // Usually handled by RenderEngine, but if manual updates needed:
    }

    // 类型 加 _ 加 ID  entities下的js都会调用。
    getRenderId() {
        return this.type + '_' + this.id;
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.data.x = x;
        this.data.y = y;
        if (this.mesh) {
            CRenderInput.UpdateEntityPosition(this.getRenderId(), x, y);
        }
    }
}

