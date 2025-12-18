import { RenderEngine } from '../render/render_engine.js';
import { log } from '../core/utils.js';
import { TILE_SIZE } from '../core/config.js';

export const SubBuildingRenderer = {
    /**
     * Render a single sub-building as a discrete entity
     * @param {string} id - Unique ID for the render object
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {string} glbPath - Path to GLB model
     */
    render: function(id, x, y, glbPath, width, height) {
        // If object exists, update position
        if (RenderEngine.objects[id]) {
            const obj = RenderEngine.objects[id];
            // Update position (assuming y=0 for ground)
            obj.position.set(x, 0, y);
            return;
        }

        // Create container group
        const group = new THREE.Group();
        group.position.set(x, -10, y);
        group.userData = { id: id, glb_file: glbPath, type: 'sub_building' };

        // Register with RenderEngine
        RenderEngine.worldGroup.add(group);
        RenderEngine.objects[id] = group;

        // Load and add model
        this.loadModel(glbPath).then(model => {
            if (!model) return;
            // Check if object still exists (might have been removed)
            if (!RenderEngine.objects[id]) return;

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
    },

    loadModel: function(path) {
        // Reuse RenderEngine cache
        if (RenderEngine.modelCache[path]) {
            return Promise.resolve(RenderEngine.modelCache[path]);
        }

        // Reuse or create promise
        if (RenderEngine.loadingModelPromise && RenderEngine.loadingModelPromise[path]) {
            return RenderEngine.loadingModelPromise[path];
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

                RenderEngine.modelCache[path] = scene;
                resolve(scene);
            }, undefined, (err) => {
                console.error('Error loading sub-building model:', path, err);
                resolve(null);
            });
        });

        if (RenderEngine.loadingModelPromise) {
            RenderEngine.loadingModelPromise[path] = promise;
        }

        return promise;
    }
};

