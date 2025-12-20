import { CAMERA_CONFIG, LIGHT_CONFIG, GRID_CONFIG } from '../core/config.js';
import { log } from '../core/utils.js';

class RenderEngine {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        this.textures = {};
        this.objects = {}; // Map of ID -> Three.js Object
        this.worldGroup = null; // Group for all game entities
        this.modelCache = {}; // Cache of loaded models keyed by path
        this.loadingModelPromise = {}; // Promises for loading models keyed by path
        
    }

    init() {
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
    }

    onWindowResize() {
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
    }

    // 3D世界渲染循环
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }

    // 清空3D世界
    ClearWorld() {
        this.objects = {};
        while(this.worldGroup.children.length > 0){ 
            const obj = this.worldGroup.children[0];
            this.worldGroup.remove(obj);
            if(obj.geometry) obj.geometry.dispose();
            if(obj.material) obj.material.dispose();
        }
    }
    
}

// Export singleton
export const CRenderEngine = new RenderEngine();
