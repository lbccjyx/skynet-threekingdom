import { TILE_SIZE } from './config.js';

export const RenderEngine = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    textures: {},
    objects: {}, // Map of ID -> Three.js Object
    worldGroup: null, // Group for all game entities
    
    init: function() {
        this.container = document.getElementById('three-container');
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background

        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);

        // Camera - Orthographic for 2.5D look
        this.camera = new THREE.OrthographicCamera(
            width / -2, width / 2,
            height / 2, height / -2,
            1, 1000
        );
        this.camera.position.set(0, 0, 100);
        this.camera.zoom = 1.0;
        this.camera.updateProjectionMatrix();

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // Grid Helper (Visual Reference)
        const gridHelper = new THREE.GridHelper(2000, 60);
        gridHelper.rotation.x = Math.PI / 2; // Rotate to vertical plane (X-Y)
        this.scene.add(gridHelper);

        // Resize Listener
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Start Loop
        this.animate();
    },

    onWindowResize: function() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.left = width / -2;
        this.camera.right = width / 2;
        this.camera.top = height / 2;
        this.camera.bottom = height / -2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    },

    animate: function() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    },

    loadTexture: function(url) {
        if (this.textures[url]) return this.textures[url];
        const loader = new THREE.TextureLoader();
        const texture = loader.load(url);
        this.textures[url] = texture;
        return texture;
    },

    clearWorld: function() {
        this.objects = {};
        while(this.worldGroup.children.length > 0){ 
            const obj = this.worldGroup.children[0];
            this.worldGroup.remove(obj);
            if(obj.geometry) obj.geometry.dispose();
            if(obj.material) obj.material.dispose();
        }
    },
    
    createEntity: function(id, image, width, height, x, y) {
        if (this.objects[id]) {
            this.updateEntityPosition(id, x, y);
            return this.objects[id];
        }

        const texture = this.loadTexture(image);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(x, -y, 0); 
        
        mesh.userData = { id: id };
        this.worldGroup.add(mesh);
        this.objects[id] = mesh;
        return mesh;
    },

    updateEntityPosition: function(id, x, y) {
        const obj = this.objects[id];
        if (obj) {
            obj.position.set(x, -y, 0);
        }
    },
    
    // Update Building Progress Bar
    updateProgress: function(id, percent) {
        // ID passed here is building ID (e.g. 123), object ID is "build_123"
        const obj = this.objects['build_' + id];
        if (!obj) return;
        
        let bar = obj.getObjectByName('progressBar');
        if (!bar && percent < 100) {
            // Create bar
            const width = 40;
            const height = 6;
            
            const barBgGeo = new THREE.PlaneGeometry(width, height);
            const barBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            const barBg = new THREE.Mesh(barBgGeo, barBgMat);
            
            const barFillGeo = new THREE.PlaneGeometry(width, height);
            // Translate to pivot from left
            barFillGeo.translate(width / 2, 0, 0);
            
            const barFillMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const barFill = new THREE.Mesh(barFillGeo, barFillMat);
            barFill.name = 'fill';
            // Initial position: left edge at -width/2 of container
            barFill.position.set(-width / 2, 0, 1);
            
            bar = new THREE.Group();
            bar.name = 'progressBar';
            bar.add(barBg);
            bar.add(barFill);
            
            // Position bar above building
            // obj height isn't stored explicitly but geometry params are lost
            // Assuming standard tile size or userData?
            // Just offset by some amount (e.g. 30px up)
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

    getIntersections: function(clientX, clientY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        return raycaster.intersectObjects(this.worldGroup.children, true); // Recursive true to hit bars? No, bars are children. Yes true.
    },
    
    getWorldPosition: function(clientX, clientY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        if (raycaster.ray.direction.z === 0) return { x: 0, y: 0 };
        
        const t = -raycaster.ray.origin.z / raycaster.ray.direction.z;
        const vec = new THREE.Vector3().copy(raycaster.ray.origin).add(raycaster.ray.direction.multiplyScalar(t));
        
        return { x: vec.x, y: -vec.y };
    }
};
