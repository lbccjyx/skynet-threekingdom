import { UI } from './elements.js';
import { Game } from './state.js';
import { sendRequest } from './api.js';
import { log } from './utils.js';
import { renderCity, renderMap, switchView, createGhost, updateGhost, removeGhost } from './render.js';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, CITY_BOUNDARY } from './config.js';
import { RenderEngine } from './render_engine.js';

// 设置右键菜单
export function setupContextMenus() {
    const container = document.getElementById('three-container');
    if (!container) return;

    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        if (Game.placementState.active) {
            Game.placementState.active = false;
            Game.placementState.def = null;
            RenderEngine.setGridVisibility(false);
            removeGhost();
            return;
        }
        
        // Only allow context menu if no active drag and no active pan
        if (Game.dragState.isDragging || RenderEngine.panState.isPanning) return;

        const pos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
        const buildX = Math.floor(pos.x);
        const buildY = Math.floor(pos.y);
        
        const region = Game.currentView === 'city' ? 1 : 2;

        const existing = document.querySelector('.context-menu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        
        const closeMenu = () => {
            if (document.body.contains(menu)) {
                menu.remove();
            }
            document.removeEventListener('click', closeMenu);
        };

        const definitions = window.BUILDING_DEFINITIONS || BUILDING_DEFINITIONS;

        for (const key in definitions) {
            const def = definitions[key];
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.textContent = def.name;
            
            item.onclick = (e) => {
                e.stopPropagation();
                
                log(`Selected ${def.name}, entering placement mode`);

                Game.placementState.active = true;
                Game.placementState.def = def;
                Game.placementState.region = region;
                // Start ghost at current mouse pos or where click happened
                Game.placementState.x = buildX;
                Game.placementState.y = buildY;
                
                RenderEngine.setGridVisibility(true);
                createGhost(def, buildX, buildY);

                menu.remove();
                document.removeEventListener('click', closeMenu);
            };
            menu.appendChild(item);
        }
        
        document.body.appendChild(menu);
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    });
}

// 初始化UI监听器
export function initListeners() {
    if (UI.btn.toMap) {
        UI.btn.toMap.addEventListener('click', () => switchView('map'));
    }
    const toCityBtn = document.getElementById('btn-to-city'); 
    if (toCityBtn) {
        toCityBtn.addEventListener('click', () => switchView('city'));
    }
    if (UI.btn.backToCity) {
        UI.btn.backToCity.addEventListener('click', () => switchView('city'));
    }
}

// 初始化交互监听器
export function initInteractionListeners() {
    injectStyles();
    
    const container = document.getElementById('three-container');
    if (!container) return;
    
    // 鼠标滚轮缩放
    container.addEventListener('wheel', (e) => {
        // If Middle Mouse Button is held, this might be a pan attempt on some mouses, 
        // but typically wheel is just scroll.
        // Standard wheel zoom
        e.preventDefault();
        const direction = e.deltaY > 0 ? -1 : 1;
        let newZoom = RenderEngine.camera.zoom + (direction * 0.1);
        if (newZoom < 0.5) newZoom = 0.5;
        if (newZoom > 3.0) newZoom = 3.0;
        
        RenderEngine.camera.zoom = newZoom;
        RenderEngine.camera.updateProjectionMatrix();
        
        Game.zoom = newZoom;
    });

    // 鼠标移动 (悬停, 拖拽, 平移)
    container.addEventListener('mousemove', (e) => {
        // 1. Handle Camera Panning
        if (RenderEngine.panState.isPanning) {
            e.preventDefault();
            const deltaX = e.clientX - RenderEngine.panState.lastX;
            const deltaY = e.clientY - RenderEngine.panState.lastY;
            
            RenderEngine.panCamera(deltaX, deltaY);
            
            RenderEngine.panState.lastX = e.clientX;
            RenderEngine.panState.lastY = e.clientY;
            return;
        }

        const worldPos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
        
        if (Game.placementState.active) {
            const snapX = Math.floor(worldPos.x);
            const snapY = Math.floor(worldPos.y);
            
            if (snapX !== Game.placementState.x || snapY !== Game.placementState.y) {
                Game.placementState.x = snapX;
                Game.placementState.y = snapY;
                updateGhost(snapX, snapY);
            }
            return;
        }

        // 2. 处理物体拖拽
        if (Game.dragState.isDragging && Game.dragState.id) {
            e.preventDefault();
            
            // UI 保护区检测 (防止拖拽到 UI 之下)
            const h = window.innerHeight;
            const w = window.innerWidth;
            
            // 顶部栏 (约 60px)
            if (e.clientY < 60) return;
            
            // 左下角日志面板 (320x220)
            if (e.clientY > h - 220 && e.clientX < 320) return;
            
            // 右下角城池图标 (80x80)
            if (e.clientY > h - 80 && e.clientX > w - 80) return;

            const id = Game.dragState.id;
            const newX = worldPos.x - Game.dragState.offsetX;
            const newY = worldPos.y - Game.dragState.offsetY;
            RenderEngine.updateEntityPosition(id, newX, newY);
            return;
        }

        // 3. 处理悬停 (高亮)
        const intersects = RenderEngine.getIntersections(e.clientX, e.clientY);
        if (intersects.length > 0) {
            const target = intersects.find(hit => hit.object.userData && (hit.object.userData.type === 'building' || hit.object.userData.type === 'general'));
            
            if (target) {
                const id = target.object.userData.id;
                if (Game.hoveredBuildingId !== id) {
                    if (Game.hoveredBuildingId) {
                        // 取消高亮
                         RenderEngine.setHighlight(Game.hoveredBuildingId, false);
                    }
                    // 设置高亮
                    RenderEngine.setHighlight(id, true);
                    // 设置鼠标样式为指针
                    container.style.cursor = 'pointer';
                    // 设置悬停的建筑ID
                    Game.hoveredBuildingId = id;
                }
            } else {
                 if (Game.hoveredBuildingId !== null) {
                    RenderEngine.setHighlight(Game.hoveredBuildingId, false);
                    container.style.cursor = 'default';
                    Game.hoveredBuildingId = null;
                }
            }
        } else {
             if (Game.hoveredBuildingId !== null) {
                RenderEngine.setHighlight(Game.hoveredBuildingId, false);
                container.style.cursor = 'default';
                Game.hoveredBuildingId = null;
            }
        }
    });

    // 鼠标按下 (开始拖拽 / 平移)
    container.addEventListener('mousedown', (e) => {
        // Middle Button (1) -> Start Pan
        if (e.button === 1) {
            e.preventDefault();
            // 开始平移
            RenderEngine.panState.isPanning = true;
            // 记录上次鼠标位置
            RenderEngine.panState.lastX = e.clientX;
            RenderEngine.panState.lastY = e.clientY;
            // 设置鼠标样式为移动
            container.style.cursor = 'move';
            return;
        }
        
        // 左键 (0) -> 开始拖拽 / 交互
        if (e.button !== 0) return;

        // 如果正在放置建筑
        if (Game.placementState.active) {
            const { x, y, region, def } = Game.placementState;
            
            // Check Boundary
            if (x < CITY_BOUNDARY.minX || x > CITY_BOUNDARY.maxX || y < CITY_BOUNDARY.minY || y > CITY_BOUNDARY.maxY) {
                log("Cannot place building outside city boundary!");
                return;
            }

            log(`Building ${def.name} at (${x}, ${y})`);
            
            sendRequest('build', {
                type: def.key,
                x: x,
                y: y,
                region: region
            }, (res) => {
                if (res.ok) {
                    log("Building started!");
                    if (res.building) {
                        Game.data.buildings.push(res.building);
                        if (region === 1) renderCity();
                        else renderMap();
                    }
                } else {
                    log("Build failed");
                }
            });

            Game.placementState.active = false;
            Game.placementState.def = null;
            RenderEngine.setGridVisibility(false);
            removeGhost();
            return;
        }

        // 获取鼠标在3D世界中的碰撞点
        const intersects = RenderEngine.getIntersections(e.clientX, e.clientY);
        // 获取碰撞点对应的物体
        const target = intersects.find(hit => hit.object.userData && (hit.object.userData.type === 'building' || hit.object.userData.type === 'general'));
        
        if (target) {
            // 获取碰撞点对应的物体
            const obj = target.object;
            const id = obj.userData.id;
            const worldPos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
            
            const isGeneral = obj.userData.type === 'general';
            
            if (isGeneral) {
                 Game.dragState.isDragging = true;
                 Game.dragState.id = id;
                 Game.dragState.type = 'general';
                 Game.dragState.data = obj.userData.data;
                 
                 const objGameX = obj.position.x;
                 const objGameY = obj.position.z;
                 
                 Game.dragState.offsetX = worldPos.x - objGameX;
                 Game.dragState.offsetY = worldPos.y - objGameY;
                 
                 RenderEngine.setGridVisibility(true);
                 log(`Started dragging general ${id}`);
                 
            } else {
                // 开始拖拽建筑
                 Game.dragState.timer = setTimeout(() => {
                    Game.dragState.isDragging = true;
                    Game.dragState.id = id;
                    Game.dragState.type = 'building';
                    
                    const objGameX = obj.position.x;
                    const objGameY = obj.position.z;
                    
                    Game.dragState.offsetX = worldPos.x - objGameX;
                    Game.dragState.offsetY = worldPos.y - objGameY;
                    
                    Game.dragState.timer = null;
                    RenderEngine.setGridVisibility(true);
                    log(`Started dragging building ${id}`);
                }, 500);
            }
        }
    });

    // 鼠标抬起 (结束拖拽 / 平移)
    const endInteraction = (e) => {
        // 结束平移
        if (RenderEngine.panState.isPanning) {
            RenderEngine.panState.isPanning = false;
            container.style.cursor = 'default';
        }

        if (Game.dragState.timer) {
            clearTimeout(Game.dragState.timer);
            Game.dragState.timer = null;
        }

        if (Game.dragState.isDragging) {
            const id = Game.dragState.id;
            const type = Game.dragState.type;
            const obj = RenderEngine.objects[id];
            
            if (obj) {
                const finalX = Math.floor(obj.position.x);
                const finalY = Math.floor(obj.position.z);
                
                // Check Boundary
                if (Game.currentView === 'city') {
                     if (finalX < CITY_BOUNDARY.minX || finalX > CITY_BOUNDARY.maxX || finalY < CITY_BOUNDARY.minY || finalY > CITY_BOUNDARY.maxY) {
                          log("Cannot move outside city boundary!");
                          if (Game.currentView === 'city') renderCity();
                          else renderMap();
                          
                          Game.dragState.isDragging = false;
                          Game.dragState.id = null;
                          Game.dragState.type = null;
                          RenderEngine.setGridVisibility(false);
                          return;
                     }
                }
                
                log(`Moved ${type} ${id} to (${finalX}, ${finalY})`);

                if (type === 'general') {
                     const generalId = obj.userData.data.id;
                     sendRequest('move_general', { id: generalId, x: finalX, y: finalY }, (res) => {
                        if (res.ok) {
                            const g = Game.data.generals.find(g => g.id === generalId);
                            if (g) { g.x = res.x; g.y = res.y; }
                            renderMap();
                        } else {
                            renderMap();
                        }
                    });
                } else {
                    const buildId = parseInt(id.replace('build_', ''));
                     sendRequest('build_move', {
                        id: buildId,
                        new_x: finalX,
                        new_y: finalY
                    }, (res) => {
                        if (res.ok) {
                            const b = Game.data.buildings.find(b => b.id === buildId);
                            if (b) { b.x = res.building.x; b.y = res.building.y; }
                            if (Game.currentView === 'city') renderCity();
                            else renderMap();
                        } else {
                            if (Game.currentView === 'city') renderCity();
                            else renderMap();
                        }
                    });
                }
            }

            Game.dragState.isDragging = false;
            Game.dragState.id = null;
            Game.dragState.type = null;
            RenderEngine.setGridVisibility(false);
        }
    };

    container.addEventListener('mouseup', endInteraction);
    container.addEventListener('mouseleave', endInteraction);

    // 鼠标双击空地，打印坐标
    container.addEventListener('dblclick', (e) => {
        const intersects = RenderEngine.getIntersections(e.clientX, e.clientY);
        const target = intersects.find(hit => hit.object.userData && (hit.object.userData.type === 'building' || hit.object.userData.type === 'general'));
        
        if (!target) {
            const worldPos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
            const x = Math.floor(worldPos.x);
            const y = Math.floor(worldPos.y);
            log(`Double click at: ${x}, ${y}`);
        }
    });
}

// 注入样式
function injectStyles() {
    // No specific styles needed for Three.js interaction yet, maybe cursor
}
