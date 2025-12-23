
// Zoom Settings
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 5.0;
export const ZOOM_STEP = 0.1;
export const INIT_ZOOM = 1.0;

// Camera Settings
export const CAMERA_CONFIG = {
    // Position of the camera. 
    // For Isometric view, usually equal X, Y, Z offsets.
    // Increase distance to cover more area if needed.
    posX: 1000, 
    posY: 1000,
    posZ: 1000,
    
    // LookAt Target (usually origin or map center)
    lookAtX: 0,
    lookAtY: 0,
    lookAtZ: 0,
    
    // Near and Far clipping planes
    // Use large negative near plane for Isometric view to avoid clipping objects "behind" camera plane but visible in frustum
    // Adjusted range to avoid potential precision issues
    near: -5000,
    far: 10000 
};

// Light Settings
export const LIGHT_CONFIG = {
    ambientColor: 0xffffff,
    ambientIntensity: 0.7, // Increased for better visibility
    
    dirLightColor: 0xffffff,
    dirLightIntensity: 0.8,
    dirLightPos: { x: 50, y: 100, z: 50 }
};

export const TILE_SIZE = 30;

// Grid Settings
// Ensure size is a multiple of TILE_SIZE * 2 to keep (0,0) on a grid line intersection
export const GRID_SIZE = 40 * TILE_SIZE;
export const GRID_CONFIG = {
    size: GRID_SIZE, 
    divisions: GRID_SIZE / TILE_SIZE, // Ensures cell size equals TILE_SIZE
    visible: false
};

// City Boundary (Placement Area)
// Multiples of TILE_SIZE (30)
export const CITY_BOUNDARY = {
    minX: -330,
    maxX: 420,
    minY: -300,
    maxY: 450
};


export const RECT_FARM = 1;
export const RECT_LOAD = 2;
export const RECT_WALL= 3;
export const RECT_HOUSE = 4;
export const FRAME_DURATION = 0.1; // 每帧 100ms，可调



export const LPC_BASE_URL = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets/';
export const LPC_ANIMATIONS = {
    spellcast: { frames: 7,   size: 64,  oversize: false, rowOrder: ['up', 'left', 'down', 'right'] },
    thrust:    { frames: 8,   size: 64, oversize: true,  rowOrder: ['up', 'left', 'down', 'right']},
    walk:      { frames: 8,   size: 64,  oversize: false, rowOrder: ['up', 'left', 'down', 'right'] },
    slash:     { frames: 6,   size: 64, oversize: true,  rowOrder: ['up', 'left', 'down', 'right']},
    shoot:     { frames: 13,  size: 64,  oversize: false, rowOrder: ['up', 'left', 'down', 'right'] },
    hurt:      { frames: 6,   size: 64,  oversize: false, rowOrder: ['down'] },
    climb:      { frames: 6,   size: 64,  oversize: false, rowOrder: ['up'] },
    idle:      { frames: 2,   size: 64,  oversize: false, rowOrder: ['up', 'left', 'down', 'right'] },
    jump:       { frames: 5,   size: 64,  oversize: false, rowOrder: ['up', 'left', 'down', 'right'] },
    sit:       { frames: 3,   size: 64,  oversize: false, rowOrder: ['up', 'left', 'down', 'right'] },
    emote:       { frames: 3,   size: 64,  oversize: false, rowOrder: ['up', 'left', 'down', 'right'] },
    run:       { frames: 8,   size: 64,  oversize: false, rowOrder: ['up', 'left', 'down', 'right'] },
    '1-handed-slash': { frames: 6,   size: 64,  oversize: true, rowOrder: ['up', 'left', 'down', 'right'] },
    '1-handed-backslash': { frames: 12,   size: 64,  oversize: true, rowOrder: ['up', 'left', 'down', 'right'] },
    '1-handed-halfslash': { frames: 5,   size: 64,  oversize: true, rowOrder: ['up', 'left', 'down', 'right'] },
};

/*
标准 Universal LPC walk spritesheet 是 9 列（columns） x 4 行（总宽度 576px = 64px x 9，高度 256px = 64px x 4）。
第 0 列：站立姿势（stand/idle）。
第 1~8 列：走路循环（walk cycle）
*/

export const LPC_FRAME_LAYOUT = {
    walk:      { cols: 9, rows: 4, frameW: 1/9, frameH: 1/4 },  // ← 改成 9 和 1/9
    slash:     { cols: 6, rows: 4, frameW: 1/6, frameH: 1/4 },
    thrust:    { cols: 8, rows: 4, frameW: 1/8, frameH: 1/4 },
    spellcast: { cols: 7, rows: 4, frameW: 1/7, frameH: 1/4 },
    shoot:     { cols: 13, rows: 4, frameW: 1/13, frameH: 1/4 },
    hurt:      { cols: 6, rows: 1, frameW: 1/6, frameH: 1 },
    climb:      { cols: 6, rows: 1, frameW: 1/6, frameH: 1 },
    idle:      { cols: 2, rows: 4, frameW: 1/2, frameH: 1/4 },  // idle 可能也需检查，标准 LPC idle 可能用 walk 的第 0 列
    jump:     { cols: 5, rows: 4, frameW: 1/5, frameH: 1/4 },
    sit:      { cols: 3, rows: 4, frameW: 1/3, frameH: 1/4 },
    emote:      { cols: 3, rows: 4, frameW: 1/3, frameH: 1/4 },
    run:       { cols: 8, rows: 4, frameW: 1/8, frameH: 1/4 }, 
    '1-handed-slash': { cols: 6, rows: 4, frameW: 1/12, frameH: 1/4 },
    '1-handed-backslash': { cols: 12, rows: 4, frameW: 1/12, frameH: 1/4 },
    '1-handed-halfslash': { cols: 5, rows: 4, frameW: 1/12, frameH: 1/4 },
};

// 行索引映射（注意 slash/thrust 的顺序不同）
export const DIRECTION_INDEX = {
    up: 0,
    left: 1,
    down: 2,
    right: 3
};