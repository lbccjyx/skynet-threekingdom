import { Game } from '../core/state.js';
import { BuildRect } from '../game/build_rect.js';
import { RenderEngine } from '../render/render_engine.js';
import { log } from '../core/utils.js';
import { createGhost, removeGhost, renderCity, renderMap } from '../render/render.js';
import { sendRequest } from '../core/api.js';

export const GameToolbar = {
    activeSubmenu: null,
    deleteMode: false,

    init: function() {
        this.createDOM();
    },

    createDOM: function() {
        const container = document.getElementById('game-screen');
        if (!container) return;

        // Toolbar Container
        const toolbar = document.createElement('div');
        toolbar.id = 'game-toolbar';
        toolbar.className = 'game-toolbar';
        
        const config = TOOLBAR_CONFIG || [];

        config.forEach(item => {
            const btn = this.createIcon(item.id, item.name);
            
            // Bind Handler
            if (item.type === 'submenu') {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleSubmenu(item.menuId);
                };
                toolbar.appendChild(btn);
                
                // Create Submenu
                this.createSubmenu(container, item);
                
            } else if (item.type === 'action') {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (this[item.handler]) {
                        this[item.handler]();
                    }
                };
                toolbar.appendChild(btn);
            }
        });

        container.appendChild(toolbar);
    },

    createIcon: function(id, text) {
        const div = document.createElement('div');
        div.id = id;
        div.className = 'toolbar-icon';
        div.innerHTML = `<span>${text}</span>`;
        return div;
    },

    createSubmenu: function(container, config) {
        const menu = document.createElement('div');
        menu.id = config.menuId;
        menu.className = 'toolbar-submenu hidden';
        
        const definitions = window[config.dataSource] || {};
        const handlerName = config.handler;

        for (const key in definitions) {
            const def = definitions[key];
            const item = document.createElement('div');
            item.className = 'submenu-item';
            
            // Use image if available
            if (def.image && !def.image.endsWith('.glb')) {
                item.innerHTML = `
        <div class="image-text-container">
            <img src="${def.image}" class="submenu-image">
            <span class="submenu-text">${def.name}</span>
        </div>
            `;            } else {
                 item.textContent = def.name;
            }
            
            item.onclick = (e) => {
                log(`Selected ${def.name}`);
                e.stopPropagation();
                if (this[handlerName]) {
                    this[handlerName](def);
                }
            };
            menu.appendChild(item);
        }
        container.appendChild(menu);
    },

    toggleSubmenu: function(id) {
        // Close others
        const menus = document.querySelectorAll('.toolbar-submenu');
        menus.forEach(m => {
            if (m.id !== id) m.classList.add('hidden');
        });

        const target = document.getElementById(id);
        if (target) {
            target.classList.toggle('hidden');
            if (!target.classList.contains('hidden')) {
                this.activeSubmenu = id;
                if (this.deleteMode) this.toggleDeleteMode(); // Exit delete mode if opening menu
            } else {
                this.activeSubmenu = null;
            }
        }
    },

    closeAllMenus: function() {
        const menus = document.querySelectorAll('.toolbar-submenu');
        menus.forEach(m => m.classList.add('hidden'));
        this.activeSubmenu = null;
    },

    selectBuilding: function(def) {
        this.closeAllMenus();
        let BuildingType = def.key;
        log(`Selected ${def.name} BuildingType: ${BuildingType}`);
        
        if (Game.placementState.active) {
            removeGhost();
        }

        Game.placementState.active = true;
        Game.placementState.def = def;
        Game.placementState.region = Game.currentView === 'city' ? 1 : 2;
        
        // Start at a default position (e.g., 0,0 or center of view)
        // Ideally, we get camera target. For now, use 0,0 and let mouse move update it.
        Game.placementState.x = 0; 
        Game.placementState.y = 0;

        RenderEngine.setGridVisibility(true);
        createGhost(def, 0, 0);
    },

    // def == RECT_BUILDING_DEFINITIONS中的某条数据
    selectZoning: function(def) {
        this.closeAllMenus();
        log(`Selected Zoning: ${def.name}`);
        
        // Start BuildRect with type
        BuildRect.start(def);
    },

    toggleDeleteMode: function() {
        this.deleteMode = !this.deleteMode;
        this.closeAllMenus();
        this.updateDeleteIconState();
        
        if (this.deleteMode) {
            log("进入删除模式: 点击建筑进行删除");
            // Change cursor
            const container = document.getElementById('three-container');
            if (container) container.style.cursor = 'crosshair';
            
            // Cancel other modes
            if (Game.placementState.active) {
                Game.placementState.active = false;
                removeGhost();
            }
            if (BuildRect.active) {
                BuildRect.stop();
            }
            RenderEngine.setGridVisibility(false);

        } else {
            log("退出删除模式");
            const container = document.getElementById('three-container');
            if (container) container.style.cursor = 'default';
        }
    },

    updateDeleteIconState: function() {
        const btn = document.getElementById('btn-delete');
        if (!btn) return;
        if (this.deleteMode) {
            btn.classList.add('active-mode');
        } else {
            btn.classList.remove('active-mode');
        }
    },
    
    // Called when clicking an object in Delete Mode
    handleDeleteClick: function(object) {
        if (!this.deleteMode) return false;
        
        const type = object.userData.type;
        log(`type: ${type}`);
        const data = object.userData.data;
        if (!data) return false;

        const realId = data.id;

        if (type === 'building') {
            sendRequest('building_del', { id: realId }, (res) => {
                if (res.ok) {
                    log("建筑已删除");
                    Game.data.buildings = Game.data.buildings.filter(b => b.id !== realId);
                    if (Game.currentView === 'city') renderCity(); else renderMap();
                } else {
                    log("删除失败");
                }
            });
        } else if (type === 'rect_building') {
            sendRequest('build_rect_del', { id: realId }, (res) => {
                if (res.ok) {
                    log("圈地已删除");

                    // Remove highlight before deleting, as materials might be shared across instances
                    const objId = 'rect_' + realId;
                    RenderEngine.setHighlight(objId, false);
                    if (Game.hoveredBuildingId === objId) {
                        Game.hoveredBuildingId = null;
                    }

                    Game.data.rect_buildings = Game.data.rect_buildings.filter(r => r.id !== realId);
                    if (Game.currentView === 'city') renderCity(); else renderMap();
                    
                    RenderEngine.setGridVisibility(false);
                } else {
                    log("删除失败");
                }
            });
        }
        
        if (this.deleteMode) this.toggleDeleteMode(); 
        return true;
    }
};
