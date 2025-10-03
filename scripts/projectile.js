import { Object } from './object.js';
export class Projectile {
    constructor(ctx, spritesheet) {
        this.ctx = ctx;
        this.spritesheet = spritesheet;

        // ✅ Propiedades que se establecerán en el método init()
        this.position = { x: 0, y: 0 };
        this.angle = 0;
        this.speed = 15;
        this.type = false; // false para jugador, true para enemigo
        this.active = false; // ✅ La propiedad clave para el object pooling

        // 📱 Escala dinámica para móviles
        const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        const mobileScale = isMobile ? 0.8 : 1.0; // 80% en móvil, 100% en desktop

        // ✅ Creamos las plantillas de imagen una sola vez en el constructor
        this.playerImage = new Object(spritesheet, { x: 1092, y: 458 }, 20, 35, 0.7 * mobileScale);
        this.playerImageEff = new Object(spritesheet, { x: 549, y: 384 }, 13, 30, 0.5 * mobileScale);
        this.enemyImage = new Object(spritesheet, { x: 521, y: 299 }, 16, 48, 0.8 * mobileScale);

        this.image = this.playerImage; // Imagen por defecto
    }

    /**
     * ✅ Inicializa o "resetea" un proyectil de la piscina con nuevos valores.
     */
    init(position, angle, type = false) {
        this.position = position;
        this.angle = angle;
        this.type = type;
        this.image = type ? this.enemyImage : this.playerImage;
        this.active = true;
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
        if (!this.type) {
             this.playerImageEff.draw(this.ctx, {x: this.position.x, y: this.position.y+18});
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