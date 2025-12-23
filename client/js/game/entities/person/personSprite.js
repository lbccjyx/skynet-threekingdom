import { CRenderEngine } from '@render/render_engine.js';
import { FRAME_DURATION, LPC_BASE_URL, LPC_ANIMATIONS, LPC_FRAME_LAYOUT, DIRECTION_INDEX } from '@config';


export class CPersonSprite {
    constructor(spriteFileName) {
        this.spriteFileName = spriteFileName;

        this.config = null;
        this.layers = [];
        this.enabledAnimationsFromJson = {};
        this.availableAnimations = [];
        this.animationLayerFiles = {};

        this.currentAnimation = null;
        this.currentDirection = 'down';

        this.layerMeshes = [];
        this.entityId = null;

        this.frameIndex = 0;
        this.timeAccumulated = 0;
        this.lastFrame = { col: -1, row: -1 };

        // 建议加一个 Group 来统一管理所有层（位置、旋转等）
        this.group = new THREE.Group();
    }

    async loadConfig() {
        const url = `assets/sprite_file/${this.spriteFileName}.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`加载人物精灵配置失败: ${url}`);
        }

        this.config = await response.json();

        // 1) 解析并排序 layers
        this.layers = (this.config.layers || []).slice().sort((a, b) => a.zPos - b.zPos);

        // 2) 记录 JSON 中的 enabledAnimations
        this.enabledAnimationsFromJson = this.config.enabledAnimations || {};

        // 3) 从 JSON 中选出一张可以直接用作精灵图的 spritesheet：
        //    优先使用 credits[0].fileName（一般是 walk 动画的整张合成图），
        //    如果没有 credits，就退回到 layers[0].fileName 并把 spellcast 替换成 walk。
        const credits = this.config.credits || [];
        if (credits.length > 0 && credits[0].fileName) {
            // 典型： "body/bodies/male/walk/light.png"
            this.spriteSheetPath = credits[0].fileName;
            this.spriteSheetUrl = LPC_BASE_URL + this.spriteSheetPath;
        } else if (this.layers.length > 0 && this.layers[0].fileName) {
            const templateAnim = 'spellcast';
            const fallbackAnim = 'walk';
            const baseFile = this.layers[0].fileName;
            const replaced = baseFile.includes(`/${templateAnim}/`)
                ? baseFile.replace(`/${templateAnim}/`, `/${fallbackAnim}/`)
                : baseFile;
            this.spriteSheetPath = replaced;
            this.spriteSheetUrl = LPC_BASE_URL + this.spriteSheetPath;
        }

        // 4) 基于「spellcast 模板」为每个 LPC 动作生成图层文件路径
        const templateAnim = 'spellcast';
        const allAnimNames = Object.keys(LPC_ANIMATIONS);
        this.animationLayerFiles = {};

        for (const animName of allAnimNames) {
            this.animationLayerFiles[animName] = this.layers.map(layer => {
                let file = layer.fileName.replace(`/${templateAnim}/`, `/${animName}/`);

                // 和你示例中的特殊处理保持一致
                if (layer.itemId === 'cape_solid' && layer.fileName.includes('/female/')) {
                    file = file.replace('/female/', '/male/');
                }
                if (file.includes('universal_behind')) {
                    file = file.replace('universal_behind/', '');
                }

                return file;
            });
        }

        // 5) 计算真正可用的动画：
        //    - 先以 LPC_ANIMATIONS 的 key 为全集
        //    - 如果 JSON 明确把某个动作设置为 false，则过滤掉
        this.availableAnimations = allAnimNames.filter(name => {
            const v = this.enabledAnimationsFromJson[name];
            return v !== false; // undefined 或 true 都算可用
        });

        // 6) 选择默认动画：优先 JSON.selectedAnimation，其次第一个可用动作，再其次 idle / walk
        if (
            this.config.selectedAnimation &&
            this.availableAnimations.includes(this.config.selectedAnimation)
        ) {
            this.currentAnimation = this.config.selectedAnimation;
        } else if (this.availableAnimations.length > 0) {
            this.currentAnimation = this.availableAnimations[0];
        } else if (LPC_ANIMATIONS.idle) {
            this.currentAnimation = 'idle';
        } else {
            this.currentAnimation = 'walk';
        }
    }

    async createMesh(id, x, y, width = 40, height = 64) {
        await this.loadConfig()
        this.entityId = id;
        this.disposeLayers();
        this.group.clear(); // 如果使用 group

        const animName = this.currentAnimation || 'walk';
        const files = this.animationLayerFiles[animName] || [];

        // 等待所有纹理加载
        await Promise.all(
            files.map(relPath => {
                if (!relPath) return Promise.resolve();
                const url = LPC_BASE_URL + relPath;

                return new Promise((resolve) => {
                    let texture = CRenderEngine.textures[url];

                    if (texture?.image?.complete) {
                        resolve(texture);
                        return;
                    }

                    if (!texture) {
                        texture = new THREE.TextureLoader().load(url, (t) => {
                            t.magFilter = THREE.NearestFilter;
                            t.minFilter = THREE.NearestFilter;
                            t.generateMipmaps = false;
                            CRenderEngine.textures[url] = t;
                        }, undefined, (err) => {
                            console.error(`纹理加载失败: ${url}`, err);
                        });
                        CRenderEngine.textures[url] = texture;
                    }

                    // 等加载完成
                    const check = () => {
                        if (texture.image?.complete) resolve(texture);
                        else requestAnimationFrame(check);
                    };
                    check();
                });
            })
        );

        // 创建所有层
        files.forEach((relPath, i) => {
            if (!relPath) return;
            const url = LPC_BASE_URL + relPath;
            const texture = CRenderEngine.textures[url];
            if (!texture) return;

            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.01,
                side: THREE.DoubleSide,
                depthWrite: i === files.length - 1
            });

            const geometry = new THREE.PlaneGeometry(width, height);
            const mesh = new THREE.Mesh(geometry, material);

            //mesh.position.set(0, i * 0.001, 0); // 相对 group 的位置
            mesh.userData = { layerIndex: i };

            this.group.add(mesh);
            this.layerMeshes.push(mesh);
        });

        // 加入世界
        this.group.position.set(x, 1, y);
        this.group.quaternion.copy(CRenderEngine.camera.quaternion);
        CRenderEngine.worldGroup.add(this.group);

        this.play(this.currentAnimation || 'walk', this.currentDirection);
        return this.group; // 返回 group 更方便外部管理
    }

    disposeLayers() {
        this.layerMeshes.forEach(mesh => {
            mesh.geometry?.dispose();
            mesh.material?.dispose();
        });
        this.layerMeshes = [];
        this.group.clear();
    }

    setPosition(x, y) {
        if (this.group) {
            this.group.position.set(x, 1, y);
        }
    }

    applyFrameUV() {
        if (!this.currentAnimation || !this.layerMeshes.length) return;

        const anim = LPC_ANIMATIONS[this.currentAnimation];
        const layout = LPC_FRAME_LAYOUT[this.currentAnimation];
        if (!layout) return;

        let row = DIRECTION_INDEX[this.currentDirection] ?? 0;
        if (['slash', 'thrust'].includes(this.currentAnimation)) {
            const order = ['down', 'left', 'up', 'right'];
            row = order.indexOf(this.currentDirection);
        }

        var col = this.frameIndex % anim.frames;
        
        // 新增：对于 walk，跳过第 0 列（从第 1 列开始）
        if (['walk'].includes(this.currentAnimation)) {
            col += 1;  // 偏移 +1
        }
        const flippedRow = layout.rows - 1 - row;
        const isOversize = anim.oversize ?? false;

        // 脏检查
        if (this.lastFrame.col === col && this.lastFrame.row === row) return;

        this.layerMeshes.forEach(mesh => {
            const t = mesh.material?.map;
            if (!t?.image?.complete) return;

            t.offset.set(col * layout.frameW, flippedRow * layout.frameH);
            t.repeat.set(layout.frameW, layout.frameH);
            t.needsUpdate = true;

            if (isOversize) {
                mesh.scale.set(3, 3, 1);
                mesh.position.y = 32; // 192px 的一半，调整为合适值
            } else {
                mesh.scale.set(1, 1, 1);
                mesh.position.y = 0;
            }
        });

        this.lastFrame.col = col;
        this.lastFrame.row = row;
    }

    update(dt) {
        if (!this.currentAnimation) return;
        // 防止切回页面后 deltaTime 爆炸
        const safeDt = Math.min(dt, 0.1);  // 最多按 10fps 处理（0.1秒/帧）
        this.timeAccumulated += safeDt;
        
        const anim = LPC_ANIMATIONS[this.currentAnimation];

        if (this.timeAccumulated >= FRAME_DURATION) {
            this.frameIndex = (this.frameIndex + 1) % anim.frames;
            this.timeAccumulated -= FRAME_DURATION;
            this.applyFrameUV(); // 内部已有脏检查，不会每帧都更新
        }
    }

    play(animationName, direction = null) {
        if (!LPC_ANIMATIONS[animationName] || !this.availableAnimations.includes(animationName)) {
            return;
        }

        this.currentAnimation = animationName;
        if (direction) this.currentDirection = direction;

        this.frameIndex = 0; // 重置帧
        this.timeAccumulated = 0;

        this.applyFrameUV();
    }
}