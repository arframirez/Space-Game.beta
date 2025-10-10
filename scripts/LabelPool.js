import { Label } from './label.js';

/**
 * Gestiona una piscina de objetos Label para reutilizarlos.
 */
export class LabelPool {
    /**
     * @param {number} size El tamaño inicial de la piscina.
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {string} font La fuente a usar.
     * @param {string} fontWeight El grosor de la fuente.
     */
    constructor(size, ctx, font, fontWeight) {
        this.pool = [];
        for (let i = 0; i < size; i++) {
            // Creamos etiquetas inactivas iniciales
            this.pool.push(new Label(ctx, { x: -1000, y: -1000 }, '', '#fff', font, fontWeight, true));
        }
    }

    /**
     * Obtiene una etiqueta de la piscina y la inicializa.
     * @param {{x: number, y: number}} position La posición de la etiqueta.
     * @param {string} text El texto a mostrar.
     * @param {string} color El color del texto.
     */
    get(position, text, color) {
        const label = this.pool.find(l => l.opacity <= 0);
        if (label) {
            label.init(position, text, color);
            return label;
        }
        return null;
    }
}