/**
 * Representa una partícula individual para efectos visuales.
 */
export class Particle {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {number} x La posición inicial en X.
     * @param {number} y La posición inicial en Y.
     * @param {string} color El color de la partícula.
     * @param {number} size El tamaño máximo de la partícula.
     * @param {number} speed La velocidad máxima de la partícula.
     */
    constructor(ctx, x, y, color, size, speed) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * size + 1;
        this.speed = speed;
        this.angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(this.angle) * (Math.random() * this.speed);
        this.vy = Math.sin(this.angle) * (Math.random() * this.speed);
        this.lifespan = 80; // Duración de la partícula en fotogramas
        this.opacity = 1;
    }

    update() {
        this.lifespan--;
        this.opacity = this.lifespan / 80;
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        this.ctx.save();
        this.ctx.globalAlpha = this.opacity > 0 ? this.opacity : 0;
        this.ctx.fillStyle = this.color;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
}