import { Game } from '../core/state.js';
import { RenderEngine } from '../render/render_engine.js';
import { log } from '../core/utils.js';
import { sendRequest } from '../core/api.js';
import { TILE_SIZE } from '../core/config.js';
import { renderMap, renderCity } from '../render/render.js';

export const BuildRect = {
    active: false,
    startPos: null, // {x, y}
    currentRect: null, // THREE.Mesh

    start: function(def) {
        this.active = true;
        this.currentDef = def;
        RenderEngine.setGridVisibility(true);
        const name = def ? def.name : 'Unknown';
        log(`进入圈地模式: ${name} (左键拖拽选择区域，右键取消)`);
    },

    stop: function() {
        this.active = false;
        this.startPos = null;
        this.currentDef = null;
        this.clearGhost();
        RenderEngine.setGridVisibility(false);
        log("退出圈地模式");
    },

    onMouseDown: function(e) {
        if (!this.active) return;
        if (e.button !== 0) return; // Only Left Click

        const worldPos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
        
        // Use floor to get the top-left of the tile
        const sx = Math.floor(worldPos.x / TILE_SIZE) * TILE_SIZE;
        const sy = Math.floor(worldPos.y / TILE_SIZE) * TILE_SIZE;

        this.startPos = { x: sx, y: sy };
        this.updateRect(sx, sy);
    },

    onMouseMove: function(e) {
        if (!this.active) return;
        
        const worldPos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
        
        const cx = Math.floor(worldPos.x / TILE_SIZE) * TILE_SIZE;
        const cy = Math.floor(worldPos.y / TILE_SIZE) * TILE_SIZE;

        if (!this.startPos) {
            // Show cursor ghost (1x1 tile)
            this.updateGhost(cx, cy, TILE_SIZE, TILE_SIZE);
            return;
        }

        this.updateRect(cx, cy);
    },

    onMouseUp: function(e) {
        if (!this.active || !this.startPos) return;

        const worldPos = RenderEngine.getWorldPosition(e.clientX, e.clientY);
        const ex = Math.floor(worldPos.x / TILE_SIZE) * TILE_SIZE;
        const ey = Math.floor(worldPos.y / TILE_SIZE) * TILE_SIZE;

        const startX = this.startPos.x;
        const startY = this.startPos.y;

        // Union of start tile and end tile
        let minX = Math.min(startX, ex);
        let maxX = Math.max(startX + TILE_SIZE, ex + TILE_SIZE);
        let minY = Math.min(startY, ey);
        let maxY = Math.max(startY + TILE_SIZE, ey + TILE_SIZE);
        
        const width = maxX - minX;
        const height = maxY - minY;

        const region = Game.currentView === 'city' ? 1 : 2;
        const type = this.currentDef ? this.currentDef.key : 1;

        // Send request
        sendRequest('build_rect', {
            x: minX,
            y: minY,
            width: width,
            height: height,
            region: region,
            type: type
        }, (res) => {
            if (res.ok) {
                log("圈地成功!");
                if (!Game.data.rect_buildings) Game.data.rect_buildings = [];
                Game.data.rect_buildings.push(res.rect_building);
                
                // Clear temporary rect
                if (this.currentRect) {
                   RenderEngine.worldGroup.remove(this.currentRect);
                   // Dispose logic is good but let's just null it or reuse?
                   // removeGhost does dispose, here we should too or reuse.
                   // Simpler to remove.
                   if (this.currentRect.geometry) this.currentRect.geometry.dispose();
                   if (this.currentRect.material) this.currentRect.material.dispose();
                   this.currentRect = null;
                }
                this.startPos = null;
                
                // Refresh view
                if (Game.currentView === 'city') renderCity();
                else renderMap();
                
                this.stop();
            } else {
                log("圈地失败 (可能重叠)");
                this.stop();
            }
        });
    },

    updateRect: function(endX, endY) {
        if (!this.startPos) return;

        const startX = this.startPos.x;
        const startY = this.startPos.y;

        // Union of start tile and end tile
        let minX = Math.min(startX, endX);
        let maxX = Math.max(startX + TILE_SIZE, endX + TILE_SIZE);
        let minY = Math.min(startY, endY);
        let maxY = Math.max(startY + TILE_SIZE, endY + TILE_SIZE);

        const width = maxX - minX;
        const height = maxY - minY;

        this.updateGhost(minX, minY, width, height);
    },

    updateGhost: function(x, y, width, height) {
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        if (!this.currentRect) {
             const geometry = new THREE.PlaneGeometry(1, 1);
             const material = new THREE.MeshBasicMaterial({ 
                 color: 0xffff00, 
                 transparent: true, 
                 opacity: 0.5,
                 side: THREE.DoubleSide
             });
             this.currentRect = new THREE.Mesh(geometry, material);
             this.currentRect.rotation.x = -Math.PI / 2; 
             this.currentRect.position.y = 1; 
             RenderEngine.worldGroup.add(this.currentRect);
        }

        this.currentRect.scale.set(width, height, 1);
        this.currentRect.position.set(centerX, 1, centerY);
    },

    clearGhost: function() {
        if (this.currentRect) {
            RenderEngine.worldGroup.remove(this.currentRect);
            if (this.currentRect.geometry) this.currentRect.geometry.dispose();
            if (this.currentRect.material) this.currentRect.material.dispose();
            this.currentRect = null;
        }
    }
};

