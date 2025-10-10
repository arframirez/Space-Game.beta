/**
 * Representa un escudo de energía destructivo y temporal alrededor de la nave.
 */
export class DestructiveShield {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {import('./ship.js').Ship} ship La nave que activa el escudo.
     */
    constructor(ctx, ship) {
        this.ctx = ctx;
        this.ship = ship;

        this.duration = 300; // 5 segundos a 60fps
        this.maxDuration = this.duration;
        this.isFinished = false;

        this.baseRadius = ship.image.radio + 80; // Mucho más grande que el escudo normal
        this.radius = this.baseRadius;

        this.color = 'rgba(255, 50, 50, 0.7)';
        this.glowColor = 'rgba(255, 100, 100, 1)';

        // Para daño por segundo
        this.damageCooldown = 500; // 500ms entre ticks de daño
        this.lastDamageTime = 0;
    }

    update() {
        this.duration--;

        // El escudo se desvanece en el último segundo
        if (this.duration < 60) {
            this.opacity = this.duration / 60;
        } else {
            this.opacity = 1.0;
        }

        if (this.duration <= 0) {
            this.isFinished = true;
            this.ship.isFiringSuper = false; // Notificamos a la nave que el super ha terminado
        }
    }

    draw() {
        if (this.isFinished) return;

        const pos = this.ship.position;
        
        // Efecto de pulso para el radio
        const pulse = Math.sin(Date.now() / 150) * 10; // El radio pulsa +/- 10px
        this.radius = this.baseRadius + pulse;

        this.ctx.save();
        this.ctx.globalAlpha = this.opacity * 0.8; // Hacemos el escudo un poco translúcido

        // Efecto de brillo exterior
        this.ctx.shadowColor = this.glowColor;
        this.ctx.shadowBlur = 40;

        // Dibujar el cuerpo principal del escudo
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, this.radius, 0, Math.PI * 2);
        
        // Gradiente radial para un efecto más "energético"
        const gradient = this.ctx.createRadialGradient(pos.x, pos.y, this.radius - 20, pos.x, pos.y, this.radius);
        gradient.addColorStop(0, 'rgba(255, 50, 50, 0.1)');
        gradient.addColorStop(0.8, 'rgba(255, 50, 50, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 100, 100, 0.9)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * Comprueba si un objeto colisiona con el radio del escudo.
     * @param {{position: {x: number, y: number}, image: {radio: number}}} target El objeto a comprobar.
     * @returns {boolean}
     */
    checkCollision(target) {
        if (this.isFinished) return false;

        const dx = this.ship.position.x - target.position.x;
        const dy = this.ship.position.y - target.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < this.radius + target.image.radio;
    }

    /**
     * Desvía un proyectil enemigo, cambiando su ángulo y tipo.
     * @param {import('./projectile.js').Projectile} projectile El proyectil a desviar.
     */
    deflectProjectile(projectile) {
        if (this.isFinished || projectile.deflected) return;

        // Marcamos el proyectil como desviado para evitar múltiples deflexiones en un solo frame.
        projectile.deflected = true;

        // 1. Vector normal en el punto de colisión (desde el centro del escudo al proyectil)
        const normalX = projectile.position.x - this.ship.position.x;
        const normalY = projectile.position.y - this.ship.position.y;
        const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
        const unitNormalX = normalX / normalLength;
        const unitNormalY = normalY / normalLength;

        // 2. Vector de velocidad actual del proyectil
        const movementAngle = projectile.angle - Math.PI / -2;
        const vx = Math.cos(movementAngle) * projectile.speed;
        const vy = Math.sin(movementAngle) * projectile.speed;

        // 3. Cálculo de la reflexión usando la fórmula: v' = v - 2 * (v . n) * n
        const dotProduct = vx * unitNormalX + vy * unitNormalY;
        const reflectVx = vx - 2 * dotProduct * unitNormalX;
        const reflectVy = vy - 2 * dotProduct * unitNormalY;

        // 4. Actualizamos el ángulo del proyectil basado en el nuevo vector de velocidad
        const newMovementAngle = Math.atan2(reflectVy, reflectVx);
        projectile.angle = newMovementAngle - Math.PI / 2; // Ajustamos de nuevo al formato del ángulo de la nave
        projectile.type = false; // Lo convertimos en un proyectil del jugador
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
            target.takeDamage(2); // El escudo hace 2 de daño por tick
            this.lastDamageTime = now;
            // Opcional: crear un efecto visual en el punto de impacto
            // window.createParticleBurst(target.position, this.glowColor, 10);
        }
    }
}
