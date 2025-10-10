import { Object } from "./object.js";
import { Projectile } from "./projectile.js";

export class Boss {
    constructor(ctx, spritesheet, canvas, ship, projectilePool, labelPool, labels, level = 0) {
        this.ctx = ctx;
        this.spritesheet = spritesheet;
        this.canvas = canvas;
        this.ship = ship;
        this.projectilePool = projectilePool; // ✅ Guardamos la piscina
        this.labelPool = labelPool; // ✅ Guardamos la piscina de etiquetas
        this.labels = labels; // ✅ Guardamos la referencia al array de etiquetas activas
        this.level = level;

        const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        const mobileScale = isMobile ? 1.2 : 1.8;

        // Usamos el sprite del UFO rojo como jefe
        this.image = new Object(spritesheet, { x: 448, y: 0 }, 124, 58, mobileScale);

        this.position = { x: canvas.width / 2, y: -this.image.height}; // Aparece desde arriba

        // --- Dificultad Progresiva del Jefe ---
        this.maxHealth = 50 + (level * 25); // Aumenta la vida en 25 por cada nivel
        this.currentHealth = this.maxHealth;
        
        this.speed = 1.5 + (level * 0.3); // Aumenta la velocidad
        this.moveDirection = 1; // 1 para derecha, -1 para izquierda

        this.isEntering = true; // Fase de entrada
        this.entryPosition = isMobile ? 120 : 180; // Aumentamos la posición para que baje más

        // Temporizadores para los ataques
        this.lastShotTime = 0;
        this.shotCooldown = 3500 - (level * 150); // Dispara más rápido
        this.burstCount = 0;
        this.isBursting = false;

        // --- Super Ataque ---
        this.superAttackCooldown = 10000 - (level * 500); // Cooldown del super
        this.lastSuperAttackTime = Date.now() + 5000; // El primer super no es inmediato
        this.isUsingSuper = false;

        // --- Fases de Ataque ---
        this.phase = 1;
        this.baseSpeed = this.speed; // Guardamos la velocidad base
    }

    draw() {
        this.image.draw(this.ctx, this.position);
        this.drawHealthBar();
    }

    drawHealthBar() {
        const barWidth = 200;
        const barHeight = 15;
        const x = this.position.x - barWidth / 2;
        const y = this.position.y - this.image.radio - 30;

        // Fondo de la barra
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x, y, barWidth, barHeight);

        // Barra de vida actual
        const healthPercentage = this.currentHealth / this.maxHealth;
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(x, y, barWidth * healthPercentage, barHeight);

        // Borde
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(x, y, barWidth, barHeight);
    }

    takeDamage(amount) {
        this.currentHealth -= amount;
        if (this.currentHealth < 0) {
            this.currentHealth = 0;
        }
        this.checkPhaseTransition(); // ✅ Comprobamos si debe cambiar de fase
    }

    /**
     * Comprueba la vida del jefe y cambia de fase si es necesario.
     */
    checkPhaseTransition() {
        const healthPercentage = this.currentHealth / this.maxHealth;

        // Transición a Fase 2
        if (this.phase === 1 && healthPercentage <= 0.7) {
            this.phase = 2;
            console.log("¡Jefe ha entrado en FASE 2!");
            this.speed = this.baseSpeed * 1.5; // Aumenta la velocidad
            this.shotCooldown *= 0.8; // Dispara más rápido
            this.superAttackCooldown *= 0.8; // Super más frecuente
            // Feedback visual
            if (typeof window.createParticleBurst === 'function') window.createParticleBurst(this.position, '#ff8800', 40, 6);            
            const label = this.labelPool.get({ ...this.position }, 'ENRAGED!', '#ff8800');
            if (label) this.labels.push(label);
        }
        // Transición a Fase 3
        else if (this.phase === 2 && healthPercentage <= 0.4) {
            this.phase = 3;
            console.log("¡Jefe ha entrado en FASE 3!");
            this.speed = this.baseSpeed * 2.0; // Aún más rápido
            this.shotCooldown *= 0.7;
            this.superAttackCooldown *= 0.7;
            if (typeof window.createParticleBurst === 'function') window.createParticleBurst(this.position, '#ff0000', 60, 8);
            const label = this.labelPool.get({ ...this.position }, 'FINAL PHASE!', '#ff0000');
            if (label) this.labels.push(label);
        }
    }

    attack(activeProjectiles) {
        const now = Date.now();
        if (now - this.lastShotTime < this.shotCooldown) return;

        this.lastShotTime = now;

        // El ataque depende de la fase
        let numProjectiles = 3;
        let spread = 0.2;
        if (this.phase === 2) {
            numProjectiles = 5;
            spread = 0.25;
        } else if (this.phase === 3) {
            numProjectiles = 7;
            spread = 0.3;
        }

        const angleToPlayer = Math.atan2(this.ship.position.y - this.position.y, this.ship.position.x - this.position.x);

        // Calculamos el inicio del bucle para que el cono esté centrado
        const start = -Math.floor(numProjectiles / 2);
        const end = Math.floor(numProjectiles / 2);

        for (let i = start; i <= end; i++) {
            // Si hay un número par de proyectiles, ajustamos para que no haya uno en el centro exacto
            const angleOffset = (numProjectiles % 2 === 0) ? (i + 0.5) * spread : i * spread;
            const angle = angleToPlayer + angleOffset;
            const projectile = this.projectilePool.get();
            if (projectile) {
                projectile.init({ ...this.position }, angle + Math.PI / -2, true);
                projectile.speed = 6;
                activeProjectiles.push(projectile);
            }
        }
    }

    superAttack() {
        if (typeof window.createBossBeam === 'function') {
            window.createBossBeam(this);
            this.isUsingSuper = true;

            // Después de que el rayo termine (3s), el jefe espera un poco antes de volver a atacar.
            setTimeout(() => {
                this.isUsingSuper = false;
                this.lastSuperAttackTime = Date.now(); // Inicia el cooldown del super
                this.lastShotTime = Date.now(); // Resetea también el ataque normal
            }, 3000); // Duración del rayo
        }
    }

    update(activeProjectiles) { // ✅ El parámetro ya estaba aquí, solo confirmamos que se usa.
        if (this.isEntering) {
            // Fase de entrada: el jefe baja hasta su posición
            this.position.y += this.speed * 2;
            if (this.position.y >= this.entryPosition) {
                this.position.y = this.entryPosition;
                this.isEntering = false;
            }
        } else if (this.isUsingSuper) {
            // Si está usando el super, no se mueve ni hace otros ataques
            // El movimiento del rayo se gestiona en su propia clase
        } else {
            // Fase de combate: se mueve de lado a lado y ataca
            this.position.x += this.speed * this.moveDirection;

            // Rebotar en los bordes
            if (this.position.x + this.image.radio > this.canvas.width) {
                this.moveDirection = -1;
            }
            if (this.position.x - this.image.radio < 0) {
                this.moveDirection = 1;
            }

            // Decide si usar el ataque normal o el súper
            const now = Date.now();
            if (now - this.lastSuperAttackTime > this.superAttackCooldown) {
                this.superAttack();
            } else {
                this.attack(activeProjectiles);
            }
        }

        this.draw();
    }

    hitbox() {
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.image.radio, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
}   
