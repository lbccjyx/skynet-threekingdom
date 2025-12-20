import { CRenderEngine } from '@render/render_engine.js';

class RenderTexture{
    
    #loadTexture(url) {
        if (CRenderEngine.textures[url]) return CRenderEngine.textures[url];
        const loader = new THREE.TextureLoader();
        const texture = loader.load(url);
        CRenderEngine.textures[url] = texture;
        return texture;
    }

    // 图片渲染为3D对象
    CreateEntity(id, image, width, height, x, y, color = null) {
        if (CRenderEngine.objects[id]) {
            CRenderInput.UpdateEntityPosition(id, x, y);
            return CRenderEngine.objects[id];
        }

        let material;
        if (image) {
            const texture = this.#loadTexture(image);
            material = new THREE.MeshLambertMaterial({ 
                map: texture, 
                transparent: true,
                side: THREE.DoubleSide,
                alphaTest: 0.1 
            });
        } else {
            material = new THREE.MeshLambertMaterial({ 
                color: color || 0x88cc88, 
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
        }
        
        const geometry = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(x, 1, y); // Lift slightly above 0 to avoid z-fighting with ground if any
        mesh.quaternion.copy(CRenderEngine.camera.quaternion);
        mesh.userData = { id: id };
        // Only add extra data if explicitly provided or handled externally
        // We will rely on RectBuilding.js to add the necessary userData for dragging
        
        CRenderEngine.worldGroup.add(mesh);
        CRenderEngine.objects[id] = mesh;
        return mesh;
    }

};

export const CRenderTexture = new RenderTexture();