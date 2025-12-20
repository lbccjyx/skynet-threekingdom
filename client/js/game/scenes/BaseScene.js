import { CRenderEngine } from '@render/render_engine.js';

export class BaseScene {
    constructor(name) {
        this.name = name;
        this.entities = []; // List of Entity objects
    }

    enter() {
        console.log(`Entering scene: ${this.name}`);
        this.clear();
        this.setup();
        this.render();
    }

    exit() {
        console.log(`Exiting scene: ${this.name}`);
        this.clear();
    }

    setup() {
        // Override me: Setup initial entities, camera, lights, etc.
    }

    update(dt) {
        // Override me: Update logic per frame
        this.entities.forEach(e => e.update(dt));
    }

    render() {
        this.entities.forEach(e => e.render());
    }

    addEntity(entity) {
        this.entities.push(entity);
        entity.mount();
    }

    removeEntity(entity) {
        const idx = this.entities.indexOf(entity);
        if (idx >= 0) {
            this.entities.splice(idx, 1);
            entity.unmount();
        }
    }

    clear() {
        // Clear all entities
        this.entities.forEach(e => e.unmount());
        this.entities = [];
        CRenderEngine.ClearWorld();
    }
}

