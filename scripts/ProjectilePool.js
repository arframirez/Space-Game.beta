import { Projectile } from './projectile.js';

/**
 * Gestiona una piscina de objetos Projectile para reutilizarlos y evitar la creación/destrucción constante.
 * Esto mejora significativamente el rendimiento al reducir el trabajo del recolector de basura.
 */
export class ProjectilePool {
    /**
     * @param {number} size El tamaño inicial de la piscina.
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {HTMLImageElement} spritesheet La hoja de sprites.
     */
    constructor(size, ctx, spritesheet) {
        this.pool = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(new Projectile(ctx, spritesheet));
        }
    }

    /**
     * Obtiene un proyectil inactivo de la piscina.
     * @returns {Projectile | null} Un proyectil listo para ser usado, o null si no hay disponibles.
     */
    get() {
        // Busca un proyectil inactivo en la piscina.
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active) {
                this.pool[i].active = true;
                return this.pool[i];
            }
        }
        // Opcional: si la piscina se queda corta, podríamos ampliarla aquí. Por ahora, devolvemos null.
        return null;
    }
}