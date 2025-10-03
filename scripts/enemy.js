import { Object } from "./object.js";
import { Projectile } from "./projectile.js";


export class Enemy {
    constructor(ctx, spritesheet, canvas, ship, type = 'chaser', initialSpeed = 2) {
        this.ctx = ctx;
        this.spritesheet = spritesheet;
        this.canvas = canvas;
        this.ship = ship;
        this.type = type;
        this.speed = initialSpeed;
        this.death = false;
        this.position = { x: 500, y: 200 };
        this.angle = 0;

        // 📱 Escala dinámica para móviles
        const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        const mobileScale = isMobile ? 0.65 : 1.0; // 65% en móvil, 100% en desktop

        if (this.type === 'vigilante') {
            // ✅ Nuevo enemigo "Vigilante" (UFO verde)
            this.image = new Object(spritesheet, { x: 567, y: 191 }, 100, 94, 0.6 * mobileScale);
            this.preferredDistance = isMobile ? 200 : 300; // Distancia que intenta mantener
            this.shotCooldown = 2000; // Dispara cada 2 segundos
            this.lastShotTime = Date.now();
            this.burstCount = 0;
            this.isBursting = false;
        } else {
            // ✅ Enemigo "Chaser" original (el que persigue)
            this.image = new Object(spritesheet, { x: 662, y: -1 }, 94, 148, 0.4 * mobileScale);
            this.imageParts = new Object(spritesheet, { x: 992, y: 564 }, 37, 72, 0.54 * mobileScale);
        }
    }
        draw() {
        this.ctx.save();

        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.rotate(this.angle + Math.PI / 2);
        
        // Dibujamos el cuerpo principal (centrado en el nuevo origen)
        if (this.type === 'chaser') {
            this.image.draw(this.ctx, { x: 0, y: 0 });
            // Dibujamos el ala derecha
            this.imageParts.draw(this.ctx, { x: 16, y: 9 });
            // Usamos scale() para invertir el canvas y dibujar el ala izquierda
            this.ctx.scale(-1, 1);
            this.imageParts.draw(this.ctx, { x: 16, y: 9 });
        } else {
            // El vigilante es una sola imagen
            this.image.draw(this.ctx, { x: 0, y: 0 });
        }

        this.ctx.restore();
      
    }
    createProjectile(activeProjectiles, projectilePool) {
        if (this.type === 'vigilante') {
            const now = Date.now();
            if (this.isBursting) {
                // Si está en ráfaga, dispara rápido
                if (now - this.lastShotTime > 150) { // 150ms entre disparos de ráfaga
                    this.fireSingleShot(activeProjectiles, projectilePool);
                    this.burstCount++;
                    if (this.burstCount >= 3) {
                        this.isBursting = false;
                        this.burstCount = 0;
                    }
                }
            } else if (now - this.lastShotTime > this.shotCooldown) {
                // Si no está en ráfaga y el cooldown ha pasado, inicia una
                this.isBursting = true;
                this.fireSingleShot(activeProjectiles, projectilePool);
                this.burstCount = 1;
            }
        } else { // Lógica del 'chaser'
            let num = Math.floor(Math.random() * (50)) + 1;
            if (num === 2) {
                this.fireSingleShot(activeProjectiles, projectilePool);
            }
        }
    }

    fireSingleShot(activeProjectiles, projectilePool) {
        const projectile = projectilePool.get();
        if (projectile) {
            const startPos = { x: this.position.x + Math.cos(this.angle) * 14, y: this.position.y + Math.sin(this.angle) * 14 };
            const startAngle = this.angle + Math.PI / -2;
            projectile.init(startPos, startAngle, true); // true para proyectil enemigo
            projectile.speed = 5;
            activeProjectiles.push(projectile);
        }
        this.lastShotTime = Date.now();
    }
        collision(canvas) {
        if ((this.position.x - this.image.radio > canvas.width || this.position.y - this.image.radio > canvas.height || this.position.x + this.image.radio < 0 || this.position.y + this.image.radio < 0) && this.death) {
            return true;
        }
        return false;
    }
    hitbox() {
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.image.radio, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
        generatePosition(canvas) {
        let num = Math.floor(Math.random() * (4)) + 1;
        let x,y;
        switch(num) {
            case 1:
                x = Math.random() * canvas.width;
                y = -this.image.height;
                break;
            case 2:
                x = canvas.width + this.image.width;
                y = Math.random() * canvas.height;
                break;
            case 3:
                x = Math.random() * canvas.width;
                y = canvas.height + this.image.height;
                break;
            case 4:
                x = - this.image.width;
                y = Math.random() * canvas.height;
                break;
        }
        this.position = { x:x, y:y };
    }
    update(boolean){
        this.draw();
        if(boolean)this.hitbox();

        const vectorToShip = {
            x: this.ship.position.x - this.position.x,
            y: this.ship.position.y - this.position.y
        };
        const distanceToShip = Math.sqrt(vectorToShip.x * vectorToShip.x + vectorToShip.y * vectorToShip.y);
        const direction = {
            x: vectorToShip.x / distanceToShip,
            y: vectorToShip.y / distanceToShip
        };

        this.angle = Math.atan2(direction.y, direction.x);

        if (this.type === 'vigilante') {
            // El Vigilante intenta mantener la distancia
            if (distanceToShip > this.preferredDistance + 20) {
                // Si está muy lejos, se acerca
                this.position.x += direction.x * this.speed;
                this.position.y += direction.y * this.speed;
            } else if (distanceToShip < this.preferredDistance - 20) {
                // Si está muy cerca, se aleja
                this.position.x -= direction.x * this.speed * 0.7;
                this.position.y -= direction.y * this.speed * 0.7;
            }
            // Si está a la distancia correcta, se mueve lateralmente (opcional, no implementado aquí para simplicidad)

        } else { // Comportamiento del 'chaser'
            this.position.x += direction.x * this.speed;
            this.position.y += direction.y * this.speed;
        }
    }
}