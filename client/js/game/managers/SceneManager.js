
export class SceneManager {
    constructor() {
        this.scenes = {};
        this.currentScene = null;
        this.currentSceneId = null;
    }

    registerScene(id, scene) {
        this.scenes[id] = scene;
    }

    switchScene(id) {
        if (this.currentScene) {
            this.currentScene.exit();
        }

        this.currentSceneId = id;
        this.currentScene = this.scenes[id];

        if (this.currentScene) {
            this.currentScene.enter();
        }
    }

    getCurrentScene() {
        return this.currentScene;
    }

    update(dt) {
        if (this.currentScene) {
            this.currentScene.update(dt);
        }
    }
}

// Global Singleton
export const sceneManager = new SceneManager();

