import { Object } from './object.js';

/**
 * Representa un efecto de explosión animado.
 * La animación consiste en escalar una imagen y desvanecerla.
 */

/**
 * Representa un efecto de explosión animado.
 * La animación consiste en escalar una imagen y desvanecerla.
 */
export class Explosion {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {HTMLImageElement} spritesheet La hoja de sprites.
     * @param {{x: number, y: number}} position La posición central de la explosión.
     * @param {number} scale El tamaño base de la explosión.
     */
    constructor(ctx, spritesheet, position, scale = 1) {
        this.ctx = ctx;
        this.position = position;
        
        // Usamos una imagen de explosión del spritesheet.
        // Coordenadas para 'explosion.png' en spaceShooter2_spritesheet.png
        this.image = new Object(spritesheet, {x: 874, y: 194}, 44, 50, 0.1);
        
        this.initialScale = scale;
        this.image.scale = 0.1 * this.initialScale; // Empezamos pequeños
        this.opacity = 1.0;
        this.rotation = Math.random() * Math.PI * 2; // Rotación aleatoria para variedad
        
        this.isFinished = false;
    }

    /**
     * Actualiza el estado de la explosión (tamaño y opacidad).
     */
    update() {
        // La explosión crece y se desvanece
        this.image.scale += 0.04 * this.initialScale;
        this.opacity -= 0.04;

        if (this.opacity <= 0) {
            this.opacity = 0;
            this.isFinished = true;
        }
        
        // Actualizamos el tamaño del objeto para el dibujado
        this.image.width = this.image.paddleWidth * this.image.scale;
        this.image.height = this.image.paddleHeight * this.image.scale;
    }

    /**
     * Dibuja la explosión en el canvas.
     */
    draw() {
        this.ctx.save();
        this.ctx.globalAlpha = this.opacity;
        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.rotate(this.rotation);
        this.image.draw(this.ctx, {x: 0, y: 0});
        this.ctx.restore();
    }
}