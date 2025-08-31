import { Object } from './object.js';
export class Projectile {
    constructor(ctx, spritesheet, position, angle, type) {
        this.ctx = ctx;
        this.image = new Object(spritesheet, {x: 1092, y: 458}, 20, 35, 0.7);
        this.imageEff = new Object(spritesheet, {x: 549, y: 384}, 13, 30, 0.5);
        this.position = position;
        this.angle = angle;
        this.speed = 15;
        this.type = type;
        if(type){
            this.image = new Object(spritesheet, {x: 521, y: 299}, 16, 48, 0.8);
        }
    }

    collision(canvas) {
        if (this.position.x - this.image.radio > canvas.width || this.position.y - this.image.radio > canvas.height || this.position.x + this.image.radio < 0 || this.position.y + this.image.radio < 0) {
            return true;
        }
        return false;
    }

    
    hitbox() {
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.image.radio*2, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    draw() {
        this.ctx.save();

        
        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.rotate(this.angle + Math.PI);
        this.ctx.translate(-this.position.x, -this.position.y);
        this.image.draw(this.ctx, {x: this.position.x, y: this.position.y});
        if(!this.type){
             this.imageEff.draw(this.ctx, {x: this.position.x, y: this.position.y+18});
        }
        this.ctx.restore();
    }
    update(boolean) {
        this.draw();
        if (boolean) this.hitbox();
        this.position.x += Math.cos(this.angle-Math.PI/-2) * this.speed;
        this.position.y += Math.sin(this.angle-Math.PI/-2) * this.speed;
    }
}