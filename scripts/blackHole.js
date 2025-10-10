/**
 * Representa la súper habilidad de Agujero Negro para la nave dorada.
 */
export class BlackHole {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {import('./ship.js').Ship} ship La nave que lo crea.
     * @param {import('./boss.js').Boss | null} boss El jefe actual, si existe.
     */
    constructor(ctx, ship, boss) {
        this.ctx = ctx;
        this.ship = ship;
        this.boss = boss; // Referencia al jefe para perseguirlo

        this.position = { ...ship.position };
        this.duration = 480; // 8 segundos a 60fps
        this.isFinished = false;

        this.radius = 75; // Radio del núcleo (horizonte de sucesos)
        this.pullRadius = 300; // Radio de atracción
        this.currentPullRadius = 10; // Empieza pequeño y crece

        this.speed = 3.5; // Velocidad con la que persigue al jefe

        // Para el daño progresivo al jefe
        this.damageCooldown = 450; // 450ms entre ticks de daño
        this.lastDamageTime = 0;

        // ✅ Para el disco de acreción giratorio
        this.rotation = 0;
        this.rotationSpeed = 0.2; // Velocidad de rotación del disco
    }

    update() {
        this.duration--;

        // Animación de crecimiento al inicio
        if (this.currentPullRadius < this.pullRadius) {
            this.currentPullRadius += 5;
        }

        // ✅ Actualizamos la rotación del disco en cada fotograma
        this.rotation += this.rotationSpeed;

        // Si hay un jefe, el agujero negro se mueve hacia él
        if (this.boss && this.boss.currentHealth > 0) {
            const vectorToBoss = {
                x: this.boss.position.x - this.position.x,
                y: this.boss.position.y - this.position.y
            };
            const distance = Math.sqrt(vectorToBoss.x ** 2 + vectorToBoss.y ** 2);
            if (distance > 0) {
                this.position.x += (vectorToBoss.x / distance) * this.speed;
                this.position.y += (vectorToBoss.y / distance) * this.speed;
            }
        }

        if (this.duration <= 0) {
            this.isFinished = true;
            // Llamamos a la función global para crear la explosión final
            if (typeof window.createParticleBurst === 'function') {
                window.createParticleBurst(this.position, 'rgba(180, 0, 255, 0.8)', 50, 8);
            }
            this.ship.isFiringSuper = false;
        }
    }

    draw() {
        if (this.isFinished) return;

        this.ctx.save();

        // 1. Dibujar el aura de atracción exterior (más suave)
        const auraGradient = this.ctx.createRadialGradient(this.position.x, this.position.y, this.radius, this.position.x, this.position.y, this.currentPullRadius);
        auraGradient.addColorStop(0, 'rgba(120, 0, 200, 0.0)');
        auraGradient.addColorStop(0.5, 'rgba(120, 0, 200, 0.2)');
        auraGradient.addColorStop(1, 'rgba(179, 0, 255, 0.1)');
        this.ctx.fillStyle = auraGradient;
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.currentPullRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. Dibujar el disco de acreción giratorio
        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.rotate(this.rotation);
        // this.ctx.scale(1, 0.4); // ✅ Eliminado para que el disco sea un círculo perfecto

        const diskColors = ['#99006bff', '#64005cff', '#66008fff', '#aa00ff', '#6600ff'];
        for (let i = 0; i < 5; i++) {
            this.ctx.beginPath();
            const radius = this.radius + 15 + (i * 12);
            const startAngle = (i * 1.2);
            const endAngle = startAngle + Math.PI * 1.5; // Arcos de 3/4 de vuelta
            
            this.ctx.arc(0, 0, radius, startAngle, endAngle);
            this.ctx.strokeStyle = diskColors[i];
            this.ctx.lineWidth = 2 + (i * 0.5);
            this.ctx.globalAlpha = 0.5 + (i * 0.1);
            this.ctx.stroke();
        }
        this.ctx.restore(); // Restaura la transformación (rotación, escala, etc.)

        // 3. Dibujar el núcleo negro (horizonte de sucesos) encima de todo
        this.ctx.save();
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * Comprueba si un objeto está dentro del radio de absorción.
     * @param {{position: {x: number, y: number}}} target El objeto a comprobar.
     * @returns {boolean}
     */
    checkAbsorption(target) {
        if (this.isFinished) return false;
        const dx = this.position.x - target.position.x;
        const dy = this.position.y - target.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + 5; // Un poco más grande que el núcleo
    }

    /**
     * Aplica una fuerza de atracción a un objeto.
     * @param {{position: {x: number, y: number}}} target El objeto a atraer.
     */
    pull(target) {
        if (this.isFinished) return;
        const dx = this.position.x - target.position.x;
        const dy = this.position.y - target.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.currentPullRadius && distance > this.radius) {
            const force = 2.5 - (distance / this.currentPullRadius); // La fuerza es mayor cerca del centro
            target.position.x += (dx / distance) * force * 5; // El 5 es un multiplicador de la fuerza de atracción
            target.position.y += (dy / distance) * force * 5;
        }
    }

    applyDamage(target) {
        const now = Date.now();
        if (this.isFinished || now - this.lastDamageTime < this.damageCooldown) return;

        if (typeof target.takeDamage === 'function') {
            target.takeDamage(2); // Hace 2 de daño por tick
            this.lastDamageTime = now;
        }
    }
}
