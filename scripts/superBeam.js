/**
 * Representa un rayo de energía instantáneo que cruza la pantalla.
 */
export class SuperBeam {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {HTMLCanvasElement} canvas El elemento canvas.
     * @param {{x: number, y: number}} origin El punto de origen del rayo (la nave).
     * @param {'horizontal' | 'vertical'} orientation La orientación del rayo.
     */
    constructor(ctx, canvas, origin, orientation) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.origin = origin;
        this.orientation = orientation;

        this.lifespan = 30; // Duración del efecto en fotogramas (0.5s a 60fps)
        this.opacity = 1.0;
        this.baseWidth = 20; // Ancho base del rayo
        this.width = this.baseWidth;
        this.isFinished = false;
        this.damageApplied = false; // Para asegurar que el daño se aplique solo una vez
    }

    update() {
        this.lifespan--;
        // El rayo se encoge y se desvanece rápidamente
        this.opacity = this.lifespan / 30;
        this.width = this.baseWidth * (this.lifespan / 30);

        if (this.lifespan <= 0) {
            this.isFinished = true;
        }
    }

    draw() {
        if (this.isFinished) return;

        this.ctx.save();
        this.ctx.globalAlpha = this.opacity;
        this.ctx.fillStyle = '#00ffff';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;

        if (this.orientation === 'horizontal') {
            this.ctx.fillRect(0, this.origin.y - this.width / 2, this.canvas.width, this.width);
        } else { // vertical
            this.ctx.fillRect(this.origin.x - this.width / 2, 0, this.width, this.canvas.height);
        }

        this.ctx.restore();
    }

    /**
     * Comprueba si un objeto colisiona con el rayo.
     * @param {{position: {x: number, y: number}, image: {radio: number}}} target El objeto a comprobar.
     * @returns {boolean}
     */
    checkCollision(target) {
        if (this.isFinished) return false;

        const effectiveWidth = this.width > 0 ? this.width : this.baseWidth;
        const targetRadius = target.image.radio;

        if (this.orientation === 'horizontal') {
            // Comprueba si la banda horizontal del rayo se solapa con el círculo del objetivo
            return Math.abs(target.position.y - this.origin.y) < (effectiveWidth / 2) + targetRadius;
        } else { // vertical
            // Comprueba si la banda vertical del rayo se solapa con el círculo del objetivo
            return Math.abs(target.position.x - this.origin.x) < (effectiveWidth / 2) + targetRadius;
        }
    }

    /**
     * Aplica daño a un objetivo (como el jefe). Este es un daño único por ser un pulso.
     * @param {{takeDamage: function(number): void}} target El objetivo que recibirá el daño.
     */
    applyDamage(target) {
        // Solo aplica daño si no lo ha hecho ya
        if (this.isFinished || this.damageApplied) {
            return;
        }

        if (typeof target.takeDamage === 'function') {
            target.takeDamage(15); // El pulso hace 5 de daño
            this.damageApplied = true; // Marcamos que el daño ya se aplicó
            // Opcional: crear un efecto visual en el punto de impacto
            // window.createParticleBurst(target.position, '#00ffff', 15);
        }
    }
}           