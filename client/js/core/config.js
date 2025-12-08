
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
    ambientIntensity: 0.8, // Increased for better visibility
    
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
