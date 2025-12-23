import { log } from '../../../../core/utils.js';
import { CPerson } from '../person.js';
import { CPersonSprite } from '../personSprite.js';

export class CGeneral extends CPerson {
    constructor(data) {
        super(data);
        this.type = 'general';

    }

    async createMesh() {
        const size = 40;

        if (!this.sprite) {
            this.sprite = new CPersonSprite('normal');
        }

        const mesh = await this.sprite.createMesh(
            this.getRenderId(),
            this.x,
            this.y,
            size,
            size
        );

        return mesh;
    }

    update(dt) { 
        if (this.sprite) {
            this.sprite.update(dt);
        }
    }

    async mount() {
        // 不走父类的同步 mount，自己用异步方式创建 mesh
        this.mesh = await this.createMesh();

        // 补上原来 CPerson.mount 里设置的 userData 逻辑
        if (this.mesh) {
            this.mesh.userData = this.mesh.userData || {};
            this.mesh.userData.entity = this;
            this.mesh.userData.type = this.type;
            this.mesh.userData.data = this.data;
        }

        // 播放默认动画
        if (this.sprite) {
            this.sprite.play('run', 'left');
        }

        return this.mesh;
    }
}

