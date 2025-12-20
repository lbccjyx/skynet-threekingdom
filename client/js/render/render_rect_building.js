import { TILE_SIZE, RECT_FARM, RECT_WALL, RECT_HOUSE } from '../core/config.js';
import { CRenderEngine } from '@render/render_engine.js';

// 原有的rect_building的3D对象渲染逻辑
class RenderRectBuilding {
    constructor(){}

    //计算模型的缩放和偏移参数
    #calculateModelParams(mainModel, type, cols, rows) {
        let scaleX = 1, scaleY = 1, scaleZ = 1;
        let liftY = 0;
        let rotationY = 0;

        if(type === RECT_WALL && cols > rows) {
            rotationY = Math.PI / 2;
        }

        if (mainModel) {
            const box = new THREE.Box3().setFromObject(mainModel);
            const size = box.getSize(new THREE.Vector3());

            if (size.x > 0 && size.z > 0) {
                scaleX = TILE_SIZE / size.x;
                scaleZ = TILE_SIZE / size.z;
                scaleY = TILE_SIZE / size.x; 
            }

            // 民房的特殊处理
            if(type === RECT_HOUSE) {
                scaleX = scaleX/1.5;
                scaleZ = scaleZ/1.2;
                scaleY = scaleY/2;
                rotationY = Math.PI * 6 / 4;
            }

            liftY = (size.y * scaleY) / 2;
        }

        return { scaleX, scaleY, scaleZ, liftY, rotationY };
    }

    // 3D模型错误时的替换 创建占位符网格
    #createPlaceholderTile(tx, tz) {
        const geo = new THREE.BoxGeometry(TILE_SIZE - 2, 0, TILE_SIZE - 2);
        const mat = new THREE.MeshLambertMaterial({ 
            color: 0xffaa00, 
            transparent: true, 
            opacity: 0.6 
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(tx, 0, tz);
        return mesh;
    }

    //克隆并配置模型实例
    #createModelInstance(model, params, tx, tz, type) {
        const clone = model.clone();
        const { scaleX, scaleY, scaleZ, liftY, rotationY } = params;
        
        if(type === RECT_WALL) {
            clone.scale.set(scaleX, scaleY, scaleZ);
        } else {
            clone.scale.set(scaleX, scaleY, scaleZ);
        }
        
        clone.rotation.y = rotationY;
        clone.position.set(tx, liftY, tz);
        return clone;
    }

    //处理自定义构建逻辑
    #handleCustomProcess(customProcess, modelInput, worldTileX, worldTileY, params, tx, tz) {
        const results = customProcess(modelInput, worldTileX, worldTileY, {
            scale: {x: params.scaleX, y: params.scaleY, z: params.scaleZ},
            liftY: params.liftY,
            tileSize: TILE_SIZE
        });
        
        if (results && Array.isArray(results)) {
            results.forEach(res => {
                res.position.x += tx;
                res.position.z += tz;
            });
        }
        return results;
    }

    //填充网格组
    #populateGroup(group, modelInput, type, width, height, x, y, customProcess = null) {
        // 移除现有子元素
        while(group.children.length > 0){ 
            group.remove(group.children[0]); 
        }

        const cols = Math.round(width / TILE_SIZE);
        const rows = Math.round(height / TILE_SIZE);
        
        const startX = -width / 2;
        const startZ = -height / 2;

        // 确定主模型
        let mainModel = modelInput;
        if (Array.isArray(modelInput)) {
            mainModel = modelInput[0];
        }

        // 计算模型参数
        const modelParams = this.#calculateModelParams(mainModel, type, cols, rows);

        // 遍历每个网格单元
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const tx = startX + c * TILE_SIZE + TILE_SIZE / 2;
                const tz = startZ + r * TILE_SIZE + TILE_SIZE / 2;
                
                const worldTileX = x + tx;
                const worldTileY = y + tz;

                // 自定义处理逻辑
                if (customProcess) {
                    const results = this.#handleCustomProcess(
                        customProcess, modelInput, worldTileX, worldTileY, modelParams, tx, tz
                    );
                    
                    if (results && Array.isArray(results)) {
                        results.forEach(res => group.add(res));
                    }
                    continue;
                }

                // 正常模型处理
                if (mainModel) {
                    const instance = this.#createModelInstance(mainModel, modelParams, tx, tz, type);
                    group.add(instance);
                } else {
                    // 占位符
                    const placeholder = this.#createPlaceholderTile(tx, tz);
                    group.add(placeholder);
                }
            }
        }
    }

    //加载单个模型
    #loadSingleModel(glb_file, type) {
        if (CRenderEngine.modelCache[glb_file]) {
            return Promise.resolve(CRenderEngine.modelCache[glb_file]);
        }
        
        if (!CRenderEngine.loadingModelPromise[glb_file]) {
            const loader = new THREE.GLTFLoader();
            CRenderEngine.loadingModelPromise[glb_file] = new Promise((resolve) => {
                loader.load(glb_file, (gltf) => {
                    CRenderEngine.modelCache[glb_file] = gltf.scene;
                    
                    // 调整材质颜色
                    gltf.scene.traverse((child) => {
                        if (child.isMesh && child.material) {
                            let multiplier = 5; // 默认
                            if(type === RECT_HOUSE) {
                                multiplier = 2;
                            } else if (type === RECT_WALL) {
                                multiplier = 4; 
                            }
                            child.material.color.multiplyScalar(multiplier);
                        }
                    });
                    
                    resolve(gltf.scene);
                }, undefined, (err) => {
                    console.error('Error loading model', err);
                    resolve(null);
                });
            });
        }
        
        return CRenderEngine.loadingModelPromise[glb_file];
    }

    //主要创建方法
    CreateFlatEntity(id, width, height, x, y, type, glb_file, customProcess = null) {
        
        if (CRenderEngine.objects[id]) {
            const obj = CRenderEngine.objects[id];
            
            // Check if model changed
            if (obj.userData && obj.userData.type !== type) {
                CRenderEngine.worldGroup.remove(obj);
                delete CRenderEngine.objects[id];
                // Continue to create new
            } else {
                obj.position.x = x;
                obj.position.z = y;
                // 如果需要更新其他属性可以在这里添加
                return obj;
            }
        }

        // 创建组
        const group = new THREE.Group();
        
        // 设置位置
        const typePositions = {
            [RECT_FARM]: { y: -13 },
            [RECT_WALL]: { y: -90 },
            [RECT_HOUSE]: { y: -10 }
        };
        
        const position = typePositions[type] || { y: 0 };
        group.position.set(x, position.y, y);
        
        group.userData = { 
            id, 
            width, 
            height, 
            glb_file, 
            type,
            updatePosition: (newX, newY) => {
                group.position.x = newX;
                group.position.z = newY;
            }
        };

        // 初始占位符
        this.#populateGroup(group, null, type, width, height, x, y, customProcess);

        // 异步加载模型
        if (typeof THREE.GLTFLoader !== 'undefined') {
            if (type === RECT_WALL && Array.isArray(glb_file)) {
                // 加载多个模型
                Promise.all(glb_file.map(f => this.#loadSingleModel(f, type)))
                    .then(models => {
                        if (models && CRenderEngine.objects[id] === group) {
                            this.#populateGroup(group, models, type, width, height, x, y, customProcess);
                        }
                    });
            } else {
                // 加载单个模型
                this.#loadSingleModel(glb_file, type)
                    .then(model => {
                        if (model && CRenderEngine.objects[id] === group) {
                            this.#populateGroup(group, model, type, width, height, x, y, customProcess);
                        }
                    });
            }
        }

        CRenderEngine.worldGroup.add(group);
        CRenderEngine.objects[id] = group;
        return group;
    }
}

export const CRenderRectBuilding = new RenderRectBuilding();