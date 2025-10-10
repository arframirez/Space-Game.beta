import { Explosion } from './explosion.js';

/**
 * Gestiona una piscina de objetos Explosion para reutilizarlos.
 */
export class ExplosionPool {
    /**
     * @param {number} size El tamaño inicial de la piscina.
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {HTMLImageElement} spritesheet La hoja de sprites.
     */
    constructor(size, ctx, spritesheet) {
        this.pool = [];
        for (let i = 0; i < size; i++) {
            // Creamos explosiones inactivas iniciales
            this.pool.push(new Explosion(ctx, spritesheet, { x: -1000, y: -1000 }, 1, true));
        }
    }

    /**
     * Obtiene una explosión de la piscina y la inicializa.
     * @param {{x: number, y: number}} position La posición de la explosión.
     * @param {number} scale La escala de la explosión.
     */
    get(position, scale) {
        // Busca una explosión inactiva.
        const explosion = this.pool.find(e => e.isFinished);
        if (explosion) {
            explosion.init(position, scale);
            return explosion;
        }
        // Si no hay disponibles, no hacemos nada. Podríamos ampliar la piscina si fuera necesario.
        return null;
    }
}