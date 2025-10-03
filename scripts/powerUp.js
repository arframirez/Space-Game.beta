import { Object } from './object.js';

/**
 * Representa un objeto de power-up que el jugador puede recoger.
 */
export class PowerUp {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {HTMLImageElement} spritesheet La hoja de sprites.
     * @param {{x: number, y: number}} position La posición inicial del power-up.
     * @param {'shield' | 'rapidFire' | 'extraLife'} type El tipo de power-up.
     */
    constructor(ctx, spritesheet, position, type) {
        this.ctx = ctx;
        this.position = position;
        this.type = type;

        const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        const scale = isMobile ? 0.8 : 1.0;

        // Seleccionar el sprite correcto según el tipo de power-up
        let spriteCoords;
        if (type === 'shield') {
            // Coordenadas para 'powerupGreen_shield.png'
            spriteCoords = { x: 920, y: 533 };
        } else if (type === 'rapidFire') {
            // Coordenadas para 'powerupBlue_bolt.png'
            spriteCoords = { x: 877, y: 990 };
        } else if (type === 'extraLife') {
            // ➕ Coordenadas para 'powerupRed_pill.png'
            spriteCoords = { x: 880, y: 1040 };
        }

        this.image = new Object(spritesheet, spriteCoords, 34, 33, scale);

        this.lifetime = 10000; // 10 segundos de vida en milisegundos
        this.createdAt = Date.now();
        this.isFinished = false;

        // Para la animación de "flotar"
        this.bobbingAngle = Math.random() * Math.PI * 2;
    }

    update() {
        // Animación de flotar
        this.bobbingAngle += 0.05;
        this.position.y += Math.sin(this.bobbingAngle) * 0.2;

        // Comprobar si el power-up ha expirado
        if (Date.now() - this.createdAt > this.lifetime) {
            this.isFinished = true;
        }
    }

    draw() {
        // Efecto de parpadeo antes de desaparecer
        const remainingTime = this.lifetime - (Date.now() - this.createdAt);
        if (remainingTime < 3000) {
            // Parpadea cada 200ms
            this.ctx.globalAlpha = (Math.floor(Date.now() / 200) % 2 === 0) ? 1.0 : 0.5;
        }

        this.image.draw(this.ctx, this.position);

        // Restaurar opacidad global
        this.ctx.globalAlpha = 1.0;
    }

    hitbox() {
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.image.radio, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'cyan';
        this.ctx.stroke();
    }
}