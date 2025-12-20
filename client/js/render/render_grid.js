import { TILE_SIZE, GRID_CONFIG, CITY_BOUNDARY } from '../core/config.js';
import { CRenderEngine } from '@render/render_engine.js';

class RenderGrid {
    constructor() {
        this.gridHelper = null;
    }

    // 创建自定义网格 (红色表示越界)
    #createCustomGrid() {
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
             if (x <= minX || x >= maxX) {
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
            if (z <= minY || z >= maxY) {
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
    }

    // 虚线网格设置为是否可见 拖拽和建筑的时候可见。
    SetVisibility(visible) {
        if (!this.gridHelper) {
             this.gridHelper = this.#createCustomGrid();
             CRenderEngine.scene.add(this.gridHelper);
        }
        this.gridHelper.visible = visible;
    }
}

export const CRenderGrid = new RenderGrid();
