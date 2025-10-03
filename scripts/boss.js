import { Object } from "./object.js";
import { Projectile } from "./projectile.js";

export class Boss {
    constructor(ctx, spritesheet, canvas, ship, projectilePool, level = 0) {
        this.ctx = ctx;
        this.spritesheet = spritesheet;
        this.canvas = canvas;
        this.ship = ship;
        this.projectilePool = projectilePool; // ✅ Guardamos la piscina
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
    }

    attack(activeProjectiles) {
        const now = Date.now();
        if (now - this.lastShotTime < this.shotCooldown) return;

        this.lastShotTime = now;

        // Dispara 3 proyectiles en un cono hacia el jugador
        const angleToPlayer = Math.atan2(this.ship.position.y - this.position.y, this.ship.position.x - this.position.x);

        for (let i = -1; i <= 1; i++) {
            const angle = angleToPlayer + (i * 0.2); // 0.2 radianes de separación
            const projectile = this.projectilePool.get();
            if (projectile) {
                projectile.init({ ...this.position }, angle + Math.PI / -2, true);
                projectile.speed = 6;
                activeProjectiles.push(projectile);
            }
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

            this.attack(activeProjectiles); // ✅ Se pasa la lista al método de ataque.
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
