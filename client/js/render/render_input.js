import { CRenderEngine } from '@render/render_engine.js';
import { CRenderTexture } from '@render/render_texture.js';


class RenderInput {
    constructor() {
        this.panState = {
            isPanning: false,
            lastX: 0,
            lastY: 0
        };
    }

    // 获取鼠标在3D世界中的碰撞点
    GetIntersections(clientX, clientY) {
        const rect = CRenderEngine.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, CRenderEngine.camera);

        return raycaster.intersectObjects(CRenderEngine.worldGroup.children, true);
    }
    
    // 获取鼠标在3D世界中的位置
    GetWorldPosition(clientX, clientY) {
        // 获取画布的边界
        const rect = CRenderEngine.renderer.domElement.getBoundingClientRect();
        // 获取鼠标在屏幕中的位置
        const mouse = new THREE.Vector2();
        // 将鼠标位置转换为NDC坐标
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        // 创建射线投射器
        const raycaster = new THREE.Raycaster();
        // 设置射线投射器从相机到鼠标位置
        raycaster.setFromCamera(mouse, CRenderEngine.camera);
        
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
    }

    // 鼠标中键拖拽的镜头平移 Camera Panning
    PanCamera(deltaX, deltaY) {
        const zoom = CRenderEngine.camera.zoom;
        // const panSpeed = 1.0 / zoom; // Not used in original code logic shown, but implicitly handled by ratio?
        // Original code:
        /*
        const worldWidth = this.camera.right - this.camera.left;
        const screenWidth = this.container.clientWidth;
        const ratioX = worldWidth / screenWidth;
        // ...
        const moveX = -deltaX * ratioX;
        */

        const worldWidth = CRenderEngine.camera.right - CRenderEngine.camera.left;
        const screenWidth = CRenderEngine.container.clientWidth;
        const ratioX = worldWidth / screenWidth;
        
        const worldHeight = CRenderEngine.camera.top - CRenderEngine.camera.bottom;
        const screenHeight = CRenderEngine.container.clientHeight;
        const ratioY = worldHeight / screenHeight;

        const moveX = -deltaX * ratioX;
        const moveY = deltaY * ratioY; 
        
        CRenderEngine.camera.translateX(moveX);
        CRenderEngine.camera.translateY(moveY);
    }

    // 更新建筑的位置
    UpdateEntityPosition(id, x, y) {
        const obj = CRenderEngine.objects[id];
        if (obj) {
             obj.position.set(x, 1, y);
        }
    }
    
    // 设置建筑的选中状态
    SetHighlight(id, highlight) {
        const obj = CRenderEngine.objects[id];
        if (!obj) return;
        
        const applyHighlight = (mesh) => {
            if (!mesh.material) return;
            if (highlight) {
                if (mesh.material.emissive) {
                    mesh.material.emissive.setHex(0x555555);
                } else {
                    if (mesh.userData.originalColor === undefined) {
                         mesh.userData.originalColor = mesh.material.color.getHex();
                         mesh.userData.originalOpacity = mesh.material.opacity;
                    }
                    mesh.material.color.setHex(0xffff88);
                    mesh.material.opacity = 0.9;
                }
            } else {
                if (mesh.material.emissive) {
                    mesh.material.emissive.setHex(0x000000);
                } else {
                    if (mesh.userData.originalColor !== undefined) {
                        mesh.material.color.setHex(mesh.userData.originalColor);
                        mesh.material.opacity = mesh.userData.originalOpacity;
                    }
                }
            }
        };

        if (obj.isGroup) {
            obj.traverse((child) => {
                if (child.isMesh) applyHighlight(child);
            });
        } else {
            applyHighlight(obj);
        }
    }
    
    // 更新建筑的进度条
    UpdateProgress(RenderId, percent) {
        const obj = CRenderEngine.objects[RenderId];
        if (!obj) 
        {
            log(' updateProgress: function(id, percent) obj is null');
            return;
        }
        let bar = obj.getObjectByName('progressBar');
        // 就是要bar不存在也要创建
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
    }

}

export const CRenderInput = new RenderInput();