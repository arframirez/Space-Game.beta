/**
 * Representa una habilidad que crea una bola de energía de la que emanan 3 rayos giratorios.
 */
export class TornadoBeam {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {{x: number, y: number}} position La posición inicial (donde está la nave).
     * @param {import('./ship.js').Ship} ship La nave que lo crea.
     */
    constructor(ctx, position, ship) {
        this.ctx = ctx;
        this.position = position;
        this.ship = ship; // Guardamos la referencia a la nave

        // ✅ Guardamos el ángulo y tipo de nave para el movimiento
        this.launchAngle = ship.angle;
        this.shipType = ship.shipType;
        this.speed = 4; // Velocidad de desplazamiento del tornado

        this.duration = 240; // 4 segundos a 60fps
        this.isFinished = false;

        this.rotationSpeed = 0.25; // Velocidad a la que giran los rayos
        this.angle = 0; // Ángulo inicial de rotación

        this.beamLength = 200;
        this.beamWidth = 10;
        this.coreRadius = 15;

        // Cooldown para el daño por tick para evitar daño instantáneo
        this.damageCooldown = 200; // 200ms entre ticks de daño
        this.lastDamageTime = new WeakMap(); // ✅ Usamos un WeakMap para rastrear el daño por objetivo
    }

    update() {
        this.duration--;
        this.angle += this.rotationSpeed;

        // ✅ Calculamos y aplicamos el movimiento del tornado
        const movementAngle = this.launchAngle - Math.PI / -2;
        // Usamos la misma lógica de movimiento invertido que la nave
        if (this.shipType === 'gold' || this.shipType === 'butterfly') {
            this.position.x -= Math.cos(movementAngle) * this.speed;
            this.position.y -= Math.sin(movementAngle) * this.speed;
        } else {
            this.position.x += Math.cos(movementAngle) * this.speed;
            this.position.y += Math.sin(movementAngle) * this.speed;
        }

        if (this.duration <= 0) {
            this.isFinished = true;
            this.ship.isFiringSuper = false; // ✅ Notificamos a la nave que el super ha terminado
        }
    }

    draw() {
        if (this.isFinished) return;

        const opacity = this.duration < 60 ? this.duration / 60 : 1.0;

        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.rotate(this.angle);

        // Dibujar los 3 rayos
        const beamColor = '#ff69b4'; // Un color rosado para el tema mariposa
        this.ctx.fillStyle = beamColor;
        this.ctx.shadowColor = beamColor;
        this.ctx.shadowBlur = 15;

        // Rayo 1 (0 grados)
        this.ctx.fillRect(0, -this.beamWidth / 2, this.beamLength, this.beamWidth);
        // Rayo 2 (120 grados)
        this.ctx.rotate(Math.PI * 2 / 3);
        this.ctx.fillRect(0, -this.beamWidth / 2, this.beamLength, this.beamWidth);
        // Rayo 3 (240 grados)
        this.ctx.rotate(Math.PI * 2 / 3);
        this.ctx.fillRect(0, -this.beamWidth / 2, this.beamLength, this.beamWidth);

        this.ctx.restore();

        // ✅ Dibujar el núcleo central con efecto de pulso
        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        
        const pulse = Math.sin(Date.now() / 100) * 5; // El radio pulsa +/- 5px
        const corePulseRadius = this.coreRadius + pulse;

        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, corePulseRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffc0cb'; // Un rosa más claro para el núcleo
        this.ctx.shadowColor = 'white';
        this.ctx.shadowBlur = 20;
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * Comprueba si un objetivo colisiona con alguno de los rayos.
     * Esta es una comprobación más precisa que la anterior.
     * @param {{position: {x: number, y: number}, image: {radio: number}}} target
     * @returns {boolean}
     */
    checkCollision(target) {
        if (this.isFinished) return false;

        const targetVec = {
            x: target.position.x - this.position.x,
            y: target.position.y - this.position.y
        };
        const distance = Math.sqrt(targetVec.x ** 2 + targetVec.y ** 2);

        // Comprobación rápida: si está fuera del alcance máximo, no hay colisión.
        if (distance > this.beamLength + target.image.radio) {
            return false;
        }

        // Comprobación precisa: ver si el ángulo del objetivo coincide con alguno de los rayos.
        const targetAngle = Math.atan2(targetVec.y, targetVec.x);

        for (let i = 0; i < 3; i++) {
            const beamAngle = this.angle + (i * Math.PI * 2 / 3);
            // Normalizamos la diferencia de ángulos para que esté entre -PI y PI
            let angleDiff = (targetAngle - beamAngle) % (Math.PI * 2);
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Si la diferencia de ángulo es pequeña, hay colisión.
            if (Math.abs(angleDiff) < 0.15) return true;
        }
        return false;
    }

    /**
     * Aplica daño a un objetivo si ha pasado el cooldown.
     * @param {{id: number, takeDamage: function(number): void, position: {x: number, y: number}}} target
     * @returns {boolean} - Devuelve true si se aplicó daño, de lo contrario false.
     */
    applyDamage(target) {
        const now = Date.now();
        const lastDamage = this.lastDamageTime.get(target);

        if (!target || this.isFinished || (lastDamage && now - lastDamage < this.damageCooldown)) {
            return false;
        }

        if (typeof target.takeDamage === 'function') {
            target.takeDamage(3); // Aplica 3 de daño por tick
            this.lastDamageTime.set(target, now);
            // Efecto visual en el punto de impacto
            if (typeof window.createParticleBurst === 'function') window.createParticleBurst(target.position, '#ff69b4', 5, 1);
            return true;
        }
        return false;
    }
}