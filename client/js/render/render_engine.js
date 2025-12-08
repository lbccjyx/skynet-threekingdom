import { TILE_SIZE, CAMERA_CONFIG, LIGHT_CONFIG, GRID_CONFIG, CITY_BOUNDARY } from '../core/config.js';

export const RenderEngine = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    textures: {},
    objects: {}, // Map of ID -> Three.js Object
    worldGroup: null, // Group for all game entities
    gridHelper: null, // Reference to grid
    
    // Pan State
    panState: {
        isPanning: false,
        lastX: 0,
        lastY: 0
    },

    init: function() {
        this.container = document.getElementById('three-container');
        
        // Initial size might be 0 if hidden, handled by ResizeObserver
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background

        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);

        // Camera - Isometric View
        this.camera = new THREE.OrthographicCamera(
            width / -2, width / 2,
            height / 2, height / -2,
            CAMERA_CONFIG.near, CAMERA_CONFIG.far
        );
        
        // Position camera based on config
        this.camera.position.set(CAMERA_CONFIG.posX, CAMERA_CONFIG.posY, CAMERA_CONFIG.posZ); 
        this.camera.lookAt(CAMERA_CONFIG.lookAtX, CAMERA_CONFIG.lookAtY, CAMERA_CONFIG.lookAtZ);
        this.camera.zoom = 1.0;
        this.camera.updateProjectionMatrix();

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(LIGHT_CONFIG.ambientColor, LIGHT_CONFIG.ambientIntensity);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(LIGHT_CONFIG.dirLightColor, LIGHT_CONFIG.dirLightIntensity);
        dirLight.position.set(LIGHT_CONFIG.dirLightPos.x, LIGHT_CONFIG.dirLightPos.y, LIGHT_CONFIG.dirLightPos.z);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Grid Helper
        if (GRID_CONFIG.visible) {
            this.gridHelper = this.createCustomGrid();
            this.scene.add(this.gridHelper);
        }

        // Resize Listener (Window)
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // ResizeObserver (Container Visibility Change)
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                this.onWindowResize();
            });
            resizeObserver.observe(this.container);
        }

        // Start Loop
        this.animate();
    },

    onWindowResize: function() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        if (width === 0 || height === 0) return;

        this.camera.left = width / -2;
        this.camera.right = width / 2;
        this.camera.top = height / 2;
        this.camera.bottom = height / -2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    },

    // 3D世界渲染循环
    animate: function() {
        requestAnimationFrame(() => this.animate());
        
        // Infinite Grid Logic - Disabled for fixed boundary grid
        /*
        if (this.gridHelper && this.camera && this.renderer) {
             // ... Logic removed to keep grid fixed to world coordinates for boundary visualization ...
        }
        */

        this.renderer.render(this.scene, this.camera);
    },

    loadTexture: function(url) {
        if (this.textures[url]) return this.textures[url];
        const loader = new THREE.TextureLoader();
        const texture = loader.load(url);
        this.textures[url] = texture;
        return texture;
    },

    // 清空3D世界
    clearWorld: function() {
        this.objects = {};
        while(this.worldGroup.children.length > 0){ 
            const obj = this.worldGroup.children[0];
            this.worldGroup.remove(obj);
            if(obj.geometry) obj.geometry.dispose();
            if(obj.material) obj.material.dispose();
        }
    },
    
    // 图片渲染为3D对象
    createEntity: function(id, image, width, height, x, y, color = null) {
        if (this.objects[id]) {
            this.updateEntityPosition(id, x, y);
            return this.objects[id];
        }

        let material;
        if (image) {
            const texture = this.loadTexture(image);
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
        mesh.quaternion.copy(this.camera.quaternion);
        mesh.userData = { id: id };
        this.worldGroup.add(mesh);
        this.objects[id] = mesh;
        return mesh;
    },

    // 创建平铺在地面上的实体 (用于圈地)
    createFlatEntity: function(id, width, height, x, y, color) {
        if (this.objects[id]) {
            // For flat entities, we just update x, z (world coords)
            const obj = this.objects[id];
            obj.position.x = x;
            obj.position.z = y;
            return obj;
        }

        const material = new THREE.MeshBasicMaterial({ 
            color: color || 0x88cc88, 
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        const geometry = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.5, y); 

        mesh.userData = { id: id };
        this.worldGroup.add(mesh);
        this.objects[id] = mesh;
        return mesh;
    },

    // 更新建筑的位置
    updateEntityPosition: function(id, x, y) {
        const obj = this.objects[id];
        if (obj) {
             const height = obj.geometry.parameters.height;
             obj.position.set(x, height / 2, y);
        }
    },
    
    // 设置建筑的选中状态
    setHighlight: function(id, highlight) {
        const obj = this.objects[id];
        if (!obj) return;
        
        if (highlight) {
            if (obj.material.emissive) {
                obj.material.emissive.setHex(0x555555); 
            } else if (obj.userData.type === 'rect_building') {
                // Highlighting flat basic material (no emissive)
                // We can brighten the color or change opacity
                obj.material.color.setHex(0xffff88); // Brighter yellow/orange
                obj.material.opacity = 0.9;
            }
        } else {
            if (obj.material.emissive) {
                obj.material.emissive.setHex(0x000000); 
            } else if (obj.userData.type === 'rect_building') {
                // Restore original color
                obj.material.color.setHex(0xffaa00); 
                obj.material.opacity = 0.6;
            }
        }
    },
    
    // 更新建筑的进度条
    updateProgress: function(id, percent) {
        const obj = this.objects['build_' + id];
        if (!obj) return;
        
        let bar = obj.getObjectByName('progressBar');
        if (!bar && percent < 100) {
            const width = 40;
            const height = 6;
            
            const barBgGeo = new THREE.PlaneGeometry(width, height);
            const barBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            const barBg = new THREE.Mesh(barBgGeo, barBgMat);
            
            const barFillGeo = new THREE.PlaneGeometry(width, height);
            barFillGeo.translate(width / 2, 0, 0);
            
            const barFillMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const barFill = new THREE.Mesh(barFillGeo, barFillMat);
            barFill.name = 'fill';
            barFill.position.set(-width / 2, 0, 1);
            
            bar = new THREE.Group();
            bar.name = 'progressBar';
            bar.add(barBg);
            bar.add(barFill);
            
            bar.position.set(0, 30, 10); 
            
            obj.add(bar);
        }
        
        if (bar) {
            if (percent >= 100) {
                bar.visible = false;
            } else {
                bar.visible = true;
                const fill = bar.getObjectByName('fill');
                if (fill) {
                    fill.scale.x = percent / 100;
                }
            }
        }
    },

    // 获取鼠标在3D世界中的碰撞点
    getIntersections: function(clientX, clientY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        return raycaster.intersectObjects(this.worldGroup.children, true);
    },
    
    // 获取鼠标在3D世界中的位置
    getWorldPosition: function(clientX, clientY) {
        // 获取画布的边界
        const rect = this.renderer.domElement.getBoundingClientRect();
        // 获取鼠标在屏幕中的位置
        const mouse = new THREE.Vector2();
        // 将鼠标位置转换为NDC坐标
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        // 创建射线投射器
        const raycaster = new THREE.Raycaster();
        // 设置射线投射器从相机到鼠标位置
        raycaster.setFromCamera(mouse, this.camera);
        
        // 创建平面
        // Make the infinite plane match the ground level at y=0 (or whatever our ground is)
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        
        // 创建目标向量
        const target = new THREE.Vector3();
        
        // 计算射线与平面的交点
        const intersection = raycaster.ray.intersectPlane(plane, target);
        
        // If intersection exists, return coordinates
        if (intersection) {
             return { x: intersection.x, y: intersection.z };
        }
        
        // Fallback or "no intersection" - shouldn't happen with infinite plane unless ray is parallel
        return { x: 0, y: 0 };
    },

    // 鼠标中键拖拽的镜头平移 Camera Panning
    panCamera: function(deltaX, deltaY) {
        const zoom = this.camera.zoom;
        const panSpeed = 1.0 / zoom; 
        
        const worldWidth = this.camera.right - this.camera.left;
        const screenWidth = this.container.clientWidth;
        const ratioX = worldWidth / screenWidth;
        
        const worldHeight = this.camera.top - this.camera.bottom;
        const screenHeight = this.container.clientHeight;
        const ratioY = worldHeight / screenHeight;

        const moveX = -deltaX * ratioX;
        const moveY = deltaY * ratioY; 
        
        this.camera.translateX(moveX);
        this.camera.translateY(moveY);
    },

    // 创建自定义网格 (红色表示越界)
    createCustomGrid: function() {
        const group = new THREE.Group();
        
        const size = GRID_CONFIG.size;
        const step = TILE_SIZE;
        const halfSize = size / 2;
        
        const colorInside = 0x888888; // Grey
        const colorOutside = 0xff0000; // Red
        
        const matInside = new THREE.LineBasicMaterial({ color: colorInside });
        const matOutside = new THREE.LineBasicMaterial({ color: colorOutside });
        
        // Helper to add line
        const addLine = (x1, y1, z1, x2, y2, z2, isOutside) => {
            const points = [];
            points.push(new THREE.Vector3(x1, y1, z1));
            points.push(new THREE.Vector3(x2, y2, z2));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, isOutside ? matOutside : matInside);
            group.add(line);
        };

        const { minX, maxX, minY, maxY } = CITY_BOUNDARY;

        // Vertical lines (along Z)
        for (let x = -halfSize; x <= halfSize; x += step) {
             // If x is outside boundary X range, whole line is red
             if (x < minX || x > maxX) {
                 addLine(x, 0, -halfSize, x, 0, halfSize, true);
             } else {
                 // Split into 3 segments
                 // 1. -halfSize to minY (Red)
                 if (-halfSize < minY) {
                     addLine(x, 0, -halfSize, x, 0, minY, true);
                 }
                 // 2. minY to maxY (Grey/Inside)
                 addLine(x, 0, minY, x, 0, maxY, false);
                 // 3. maxY to halfSize (Red)
                 if (maxY < halfSize) {
                     addLine(x, 0, maxY, x, 0, halfSize, true);
                 }
             }
        }

        // Horizontal lines (along X)
        for (let z = -halfSize; z <= halfSize; z += step) {
            // If z is outside boundary Y range, whole line is red
            if (z < minY || z > maxY) {
                addLine(-halfSize, 0, z, halfSize, 0, z, true);
            } else {
                // Split into 3 segments
                // 1. -halfSize to minX (Red)
                if (-halfSize < minX) {
                     addLine(-halfSize, 0, z, minX, 0, z, true);
                }
                // 2. minX to maxX (Grey)
                addLine(minX, 0, z, maxX, 0, z, false);
                // 3. maxX to halfSize (Red)
                if (maxX < halfSize) {
                    addLine(maxX, 0, z, halfSize, 0, z, true);
                }
            }
        }
        
        return group;
    },

    // 虚线网格设置为是否可见 拖拽和建筑的时候可见。
    setGridVisibility: function(visible) {
        if (!this.gridHelper) {
             this.gridHelper = this.createCustomGrid();
             this.scene.add(this.gridHelper);
        }
        this.gridHelper.visible = visible;
    }
};
