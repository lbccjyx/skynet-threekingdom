import { CRenderEngine } from '@render/render_engine.js';
import { log } from '@utils';
import { TILE_SIZE } from '@config';

// 渲染子建筑 render_engine 的补充
class SubBuildingRender
{
    constructor(){}
    /**
     * Render a single sub-building as a discrete entity
     * @param {string} id - Unique ID for the render object
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {string} glbPath - Path to GLB model
     */
    Render(id, x, y, glbPath, width, height) {
        // If object exists, update position
        if (CRenderEngine.objects[id]) {
            const obj = CRenderEngine.objects[id];
            // Update position (assuming y=0 for ground)
            obj.position.set(x, 0, y);
            return;
        }

        // Create container group
        const group = new THREE.Group();
        group.position.set(x, -10, y);
        group.userData = { id: id, glb_file: glbPath, type: 'rect_building', width: width, height: height };

        // Register with RenderEngine
        CRenderEngine.worldGroup.add(group);
        CRenderEngine.objects[id] = group;

        // Load and add model
        this.#loadModel(glbPath).then(model => {
            if (!model) return;
            // Check if object still exists (might have been removed)
            if (!CRenderEngine.objects[id]) return;

            const clone = model.clone();
            
            // Auto-scale to TILE_SIZE to ensure visibility
            const box = new THREE.Box3().setFromObject(clone);
            const size = box.getSize(new THREE.Vector3());
            
            if (size.x > 0 && size.z > 0) {
                // Scale so that the largest dimension fits the tile size (or just X)
                // Similar to RenderEngine logic
                let scale = TILE_SIZE / size.x;
                
                // If width/height provided, scale to match total dimensions
                if (width && height) {
                    const targetWidth = width * TILE_SIZE;
                    const targetDepth = height * TILE_SIZE;
                    
                    const scaleX = targetWidth / size.x;
                    const scaleZ = targetDepth / size.z;
                    // Use the smaller scale to fit within dimensions, or specific axis scales
                    scale = Math.min(scaleX, scaleZ); 
                    
                    clone.scale.set(scale, scale, scale);
                } else {
                    clone.scale.set(scale, scale, scale);
                }

                // Optional: Lift it up if it's centered at 0,0,0
                // const liftY = (size.y * scale) / 2;
                // clone.position.set(0, liftY, 0);
            }
            
            group.add(clone);
        });
    }

    #loadModel(path) {
        // Reuse RenderEngine cache
        if (CRenderEngine.modelCache[path]) {
            return Promise.resolve(CRenderEngine.modelCache[path]);
        }

        // Reuse or create promise
        if (CRenderEngine.loadingModelPromise && CRenderEngine.loadingModelPromise[path]) {
            return CRenderEngine.loadingModelPromise[path];
        }

        const promise = new Promise((resolve) => {
            const loader = new THREE.GLTFLoader();
            loader.load(path, (gltf) => {
                const scene = gltf.scene;
                
                // Apply lighting/material tweaks consistent with other buildings
                scene.traverse((child) => {
                    if (child.isMesh && child.material) {
                        // Brighten up slightly like RenderEngine does
                        child.material.color.multiplyScalar(3); 
                    }
                });

                CRenderEngine.modelCache[path] = scene;
                resolve(scene);
            }, undefined, (err) => {
                console.error('Error loading sub-building model:', path, err);
                resolve(null);
            });
        });

        if (CRenderEngine.loadingModelPromise) {
            CRenderEngine.loadingModelPromise[path] = promise;
        }

        return promise;
    }
};

export const CSubBuildingRender = new SubBuildingRender();
