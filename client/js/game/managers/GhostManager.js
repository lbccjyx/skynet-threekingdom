import { CRenderEngine } from '@render/render_engine.js';
import { TILE_SIZE } from '@config';
import { CRenderTexture } from '@render/render_texture.js';

export const GhostManager = {
    ghostId: 'ghost_building',

    createGhost: function(def, x, y) {
        this.removeGhost();

        const width = def.width * TILE_SIZE;
        const height = def.height * TILE_SIZE;
        const image = def.image;
        
        const mesh = CRenderTexture.CreateEntity(this.ghostId, image, width, height, x, y);
        
        mesh.renderOrder = 20; 

        if (mesh.material) {
            mesh.material.opacity = 0.6;
            mesh.material.transparent = true;
            mesh.material.color.setHex(0x99ff99); 
            mesh.material.depthWrite = false; 
        }
        
        return mesh;
    },

    updateGhost: function(x, y) {
        CRenderInput.UpdateEntityPosition(this.ghostId, x, y);
    },

    removeGhost: function() {
        const obj = CRenderEngine.objects[this.ghostId];
        if (obj) {
            CRenderEngine.worldGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            delete CRenderEngine.objects[this.ghostId];
        }
    }
};

