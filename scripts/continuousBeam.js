/**
 * Representa un rayo láser continuo que se dispara desde la nave.
 */
export class ContinuousBeam {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {import('./ship.js').Ship} ship La nave que dispara el rayo.
     */
    constructor(ctx, ship) {
        this.ctx = ctx;
        this.ship = ship;

        this.duration = 240; // 4 segundos a 60fps
        this.isFinished = false;

        this.width = 20; // Un rayo más grueso
        this.length = 1200; // Longitud del rayo (suficiente para cruzar la pantalla)
        this.color = 'rgba(100, 255, 100, 0.8)'; // Color verde brillante
        this.glowColor = 'rgba(150, 255, 150, 1)';

        this.damageCooldown = 200; // 200ms entre ticks de daño (5 por segundo)
        this.lastDamageTime = 0;
    }

    update() {
        this.duration--;
        if (this.duration <= 0) {
            this.isFinished = true;
            this.ship.isFiringSuper = false; // Notificamos a la nave que el super ha terminado
        }
    }

    draw() {
        if (this.isFinished) return;

        const startPos = this.ship.position;
        const angle = this.ship.angle - Math.PI / -2;

        this.ctx.save();
        this.ctx.translate(startPos.x, startPos.y);
        this.ctx.rotate(angle);

        // Efecto de brillo (glow)
        this.ctx.shadowColor = this.glowColor;
        this.ctx.shadowBlur = 30;

        // Dibujar el núcleo del rayo
        const coreWidth = this.width * 0.5;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(0, -coreWidth / 2, this.length, coreWidth);

        // Dibujar el cuerpo principal del rayo
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(0, -this.width / 2, this.length, this.width);

        this.ctx.restore();
    }

    /**
     * Comprueba si un objeto (enemigo, asteroide) colisiona con el rayo.
     * @param {{position: {x: number, y: number}, image: {radio: number}}} target El objeto a comprobar.
     * @returns {boolean}
     */
    checkCollision(target) {
        if (this.isFinished) return false;

        const shipPos = this.ship.position;
        const beamAngle = this.ship.angle - Math.PI / -2;

        // Vector director del rayo
        const beamDir = { x: Math.cos(beamAngle), y: Math.sin(beamAngle) };

        // Vector desde la nave hasta el objetivo
        const targetVec = { x: target.position.x - shipPos.x, y: target.position.y - shipPos.y };

        // Proyección del vector del objetivo sobre la dirección del rayo
        const projection = targetVec.x * beamDir.x + targetVec.y * beamDir.y;

        // Si la proyección es negativa o más larga que el rayo, el objetivo está detrás o demasiado lejos.
        if (projection < 0 || projection > this.length) {
            return false;
        }

        // Calcular la distancia perpendicular del objetivo al rayo
        const perpDistance = Math.abs(targetVec.x * -beamDir.y + targetVec.y * beamDir.x);

        // Hay colisión si la distancia perpendicular es menor que la suma de los radios
        return perpDistance < (this.width / 2) + target.image.radio;
    }

    /**
     * Aplica daño a un objetivo (como el jefe) respetando un cooldown.
     * @param {{takeDamage: function(number): void}} target El objetivo que recibirá el daño.
     */
    applyDamage(target) {
        const now = Date.now();
        if (this.isFinished || now - this.lastDamageTime < this.damageCooldown) {
            return;
        }

        if (typeof target.takeDamage === 'function') {
            target.takeDamage(1); // El rayo hace 1 de daño por tick
            this.lastDamageTime = now;
            // Opcional: crear un efecto visual en el punto de impacto
            // window.createParticleBurst(target.position, this.glowColor, 5);
        }
    }
}

