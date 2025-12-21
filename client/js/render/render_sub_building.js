import { CRenderEngine } from '@render/render_engine.js';
import { log } from '@utils';
import { TILE_SIZE, RECT_WALL } from '../core/config.js';

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
    Render(id, x, y, glbPath, width, height, rectBuildingId) {
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
        group.userData = { id: id, glb_file: glbPath, type: 'rect_building', width: width, height: height, rectBuildingId: rectBuildingId };

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

    /**
     * Load model and add directly to a parent group
     * @param {THREE.Group} parentGroup - The parent group to add the model to
     * @param {number} localX - Local X position relative to parent
     * @param {number} localY - Local Y position relative to parent (Z in 3D)
     * @param {string} glbPath - Path to GLB model
     * @param {number} width - Expected width in tiles
     * @param {number} height - Expected height in tiles
     */
    AddToGroup(parentGroup, localX, localY, glbPath, width, height, RectType) {
        this.#loadModel(glbPath).then(model => {
            if (!model) return;
            
            // Check if parent still exists (if it was removed while loading)
            // But parentGroup is a reference, so it's fine unless it was disposed?
            
            const clone = model.clone();
            
            // Auto-scale to TILE_SIZE to ensure visibility
            const box = new THREE.Box3().setFromObject(clone);
            const size = box.getSize(new THREE.Vector3());
            
            if (size.x > 0 && size.z > 0) {
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
            }
            
            // Position locally. In 3D, Y is up, Z is depth.
            // localY corresponds to Z.
            clone.position.set(localX, 0, localY);

            if (RectType === ERB_TYPE.FARM)
            {
                clone.position.y = 13;
            }
            parentGroup.add(clone);
        });
    }

    AddWall(parentGroup, wallMap, globalX, globalY, localX, localY) {
        const pillarPath = 'assets/glb_file/wall_pillar.glb';
        const railPath = 'assets/glb_file/wall_rail.glb';

        Promise.all([
            this.#loadModel(pillarPath),
            this.#loadModel(railPath)
        ]).then(([pillarModel, railModel]) => {
            if (!pillarModel || !railModel) return;

            // Calculate connectivity
            const tx = Math.floor(globalX / TILE_SIZE);
            const ty = Math.floor(globalY / TILE_SIZE);
            
            const hasN = wallMap.has(`${tx},${ty-1}`);
            const hasS = wallMap.has(`${tx},${ty+1}`);
            const hasW = wallMap.has(`${tx-1},${ty}`);
            const hasE = wallMap.has(`${tx+1},${ty}`);

            // Calculate base scale
            // Assuming both models have similar base scale requirements (usually normalized to TILE_SIZE)
            // Using pillar as reference
            const box = new THREE.Box3().setFromObject(pillarModel);
            const size = box.getSize(new THREE.Vector3());
            
            // 计算子建筑的高度(默认3D模型的中心点在0 0 0 所以需要把高度抬高到中心点)
            let baseScale = 1;
            if (size.x > 0) {
                baseScale = TILE_SIZE / size.x;
            }
            var nHeight = (size.y * baseScale) / 2;

            // 给城墙写的特殊高度
            nHeight /= 3;

            const addPillar = (rotY) => {
                const clone = pillarModel.clone();
                // Legacy scale logic: scale.x*2/5, scale.y/5, scale.z/2
                // Here baseScale applies to all axes roughly, but we tune it
                // Note: The original logic used `scale` object which was {x: s, y: s, z: s} essentially
                clone.scale.set(baseScale * 2/5, baseScale / 5, baseScale / 2);
                clone.rotation.y = rotY;
                clone.position.set(localX, nHeight, localY);
                parentGroup.add(clone);
            };

            const addRail = (rotY, shiftX, shiftZ) => {
                const clone = railModel.clone();        
                clone.scale.set(baseScale / 5, baseScale / 5, baseScale / 2); 
                clone.rotation.y = rotY;
                // Position offset is relative to the tile center (localX, localY)
                // shiftX/Z are in TILE_SIZE units
                clone.position.set(
                    localX + shiftX * TILE_SIZE, 
                    nHeight, 
                    localY + shiftZ * TILE_SIZE
                );       
                parentGroup.add(clone);
            };

            let IsPillarShow = false;
            if (hasE) {
                addRail(0, 0, 0);
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
