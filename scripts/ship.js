import { Projectile } from "./projectile.js";
import {Object} from "./object.js";

export class Ship{
    constructor(ctx, spritesheet, canvas, audioManager) {
        this.ctx = ctx;
        this.spritesheet = spritesheet;
        this.canvas = canvas;
        this.audioManager = audioManager; // Guardamos la referencia al gestor de audio
        
        // 📱 Escala dinámica para móviles y orientación
        const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        const isLandscape = window.innerWidth > window.innerHeight && window.innerWidth < 768;
        let mobileScale;
        
        if (isLandscape) {
            mobileScale = 0.4; // Más pequeña en landscape para pantallas anchas
        } else if (isMobile) {
            mobileScale = 0.6; // Tamaño normal para móvil en portrait
        } else {
            mobileScale = 1; // Tamaño completo en desktop
        }
        
        this.btn = document.querySelector(".button");
        this.image = new Object(spritesheet,{x: 277, y: 0}, 170, 151, 0.5 * mobileScale);
        this.imageEff = new Object(spritesheet,{x: 549, y: 322}, 13, 30, 0.6 * mobileScale);
        this.position = {x: 200, y: 200};
        this.speed = 0
        this.projectiles = [];
        this.keys = {
            A: false,
            D: false,
            W: false,
            shoot: true
        }
        this.angle = 0
        this.keyboard();

        this.hudShots = document.getElementById("shots");
        this.hudMaxShots = document.getElementById("maxShots");
        this.hudCooldown = document.getElementById("cooldown");
        this.hudRecharge = document.getElementById("recharge");

        this.maxShots = 10;          
        this.availableShots = 10;      
        this.recharging = false;     
        this.blocked = false;           
    }


    collisionCanvas(){
        if (this.position.x - this.image.radio > this.canvas.width) this.position.x = 0;
        if (this.position.y - this.image.radio > this.canvas.height) this.position.y = 0;
        if (this.position.x + this.image.radio < 0) this.position.x = this.canvas.width;
        if (this.position.y + this.image.radio < 0) this.position.y = this.canvas.height;
    }
    draw() {
        this.ctx.save();

        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.rotate(this.angle);
        this.ctx.translate(-this.position.x, -this.position.y);
        this.image.draw(this.ctx, this.position);
        this.imageEff.draw(this.ctx, {x: this.position.x+15, y: this.position.y-35});
        this.imageEff.draw(this.ctx, {x: this.position.x-15, y: this.position.y-35});

        this.ctx.restore();
    }
move() {
    // --- 1) Detección de entorno
    const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;

    // Configuración de velocidad adaptable
    const maxSpeed = isMobile ? 5 : 10;      // Máxima velocidad
    const acceleration = isMobile ? 0.15 : 0.25;  // Aceleración más suave en móvil
    const deceleration = isMobile ? 0.08 : 0.12;  // Frenado también más lento

    // --- 2) Rotación por teclado (desktop)
    if (this.keys.D) this.angle += 0.08;
    if (this.keys.A) this.angle -= 0.08;

    // --- 3) Intensidad del joystick (móvil)
    const jIntensity = window.joystickIntensity || 0;
    const jDir = window.joystickDirection || { x: 0, y: 0 };

    let thrusting = false;

    // --- 4) Control con joystick prioritario
    if (jIntensity > 0.05) {
        this.angle = Math.atan2(jDir.y, -jDir.x) + Math.PI / 2;
        this.speed = Math.min(maxSpeed, maxSpeed * jIntensity);
        thrusting = true;
    } else if (this.keys.W) {
        // Control con teclado en desktop
        this.speed += acceleration;
        if (this.speed >= maxSpeed) this.speed = maxSpeed;
        thrusting = true;
    }

    // --- 5) Desaceleración si no hay empuje
    if (!thrusting) {
        this.speed -= deceleration;
        if (this.speed < 0) this.speed = 0;
    }

    // --- 6) Efecto de propulsión
    if (thrusting) {
        this.imageEff.scale = Math.min(0.7, this.imageEff.scale + 0.02);
    } else {
        this.imageEff.scale = Math.max(0, this.imageEff.scale - 0.02);
    }
    this.imageEff.width = this.imageEff.paddleWidth * this.imageEff.scale;
    this.imageEff.height = this.imageEff.paddleHeight * this.imageEff.scale;

    // --- 7) Movimiento final
    this.position.x += Math.cos(this.angle - Math.PI / -2) * this.speed;
    this.position.y += Math.sin(this.angle - Math.PI / -2) * this.speed;
}


    updateProjectiles(boolean) {
        this.projectiles.forEach((projectile,i) => {
            projectile.update(boolean);    
            if(projectile.collision(this.canvas)) {
                setTimeout(() => {
                    this.projectiles.splice(i, 1);
                }, 0);  
            }
        });
    }

    hitbox() {
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.image.radio, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    update(boolean) {
        this.updateProjectiles(boolean);
        this.draw();
        if (boolean) this.hitbox();
        this.move();
        this.collisionCanvas();
         
        this.updateHUD();
    }
    updateHUD() {
    // Mostrar disparos disponibles y máximos
    this.hudShots.textContent = this.availableShots;
    this.hudMaxShots.textContent = this.maxShots;

    // Si está bloqueado, mostrar temporizador de cooldown
    if (this.blocked) {

    this.hudRecharge.textContent = "";

    let remaining = 4;

    // 🔹 Evitamos múltiples intervalos simultáneos
    if (this.cooldownTimer) return;

    this.cooldownTimer = setInterval(() => {
        this.hudCooldown.textContent = `Blocked: ${remaining}s`;
        remaining--;

        // Cuando el tiempo termina, desbloqueamos disparos
        if (remaining < 0) {
            clearInterval(this.cooldownTimer);
            this.cooldownTimer = null;

            this.blocked = false;
            this.startRecharge();
            this.hudCooldown.textContent = "";
        }
    }, 1000);
       }
    // Si se está regenerando, mostramos progreso
    else if (this.recharging && this.availableShots < this.maxShots) {
        this.hudCooldown.textContent = "";
        this.hudRecharge.textContent = "Recharging...";
    } 
    // Si todo está lleno, ocultamos mensajes
    else {
        this.hudCooldown.textContent = "";
        this.hudRecharge.textContent = "";
    }
}
    startRecharge() {
    if (this.recharging) return; // Evitar múltiples recargas simultáneas
    this.recharging = true;

    const rechargeInterval = setInterval(() => {
        if (this.availableShots < this.maxShots) {
            this.availableShots += 1;
        }

        if (this.availableShots >= this.maxShots) {
            this.availableShots = this.maxShots;
            clearInterval(rechargeInterval);
            this.recharging = false;
        }
    }, 1000);
}
    async shoot() {
        if (!this.blocked && this.availableShots > 0) {
            // 🔊 Reproducir sonido de disparo
            this.audioManager.playSound('shoot', 1.0);

            // Crear proyectiles
            this.projectiles.push(
                new Projectile(
                    this.ctx,
                    this.spritesheet,
                    { x: this.position.x + Math.cos(this.angle) * 14, y: this.position.y + Math.sin(this.angle) * 14 },
                    this.angle
                ),
                new Projectile(
                    this.ctx,
                    this.spritesheet,
                    { x: this.position.x - Math.cos(this.angle) * 14, y: this.position.y - Math.sin(this.angle) * 14 },
                    this.angle
                )
            );
  
            this.availableShots--;
            if (!this.recharging) this.startRecharge();
    

            if (this.availableShots === 0) {
                this.blocked = true;
            }
        }
    }
    keyboard(){
        document.addEventListener('keydown', (e) => {

            if (e.key === 'a' || e.key === 'A') {
                this.keys.A = true;
            }
            if (e.key === 'd' || e.key === 'D') { 
                this.keys.D = true;
            }
            if (e.key === 'w' || e.key === 'W') {
                this.keys.W = true;
            }

              if ((e.key === "q" || e.key === "Q" || e.key === "ArrowUp") && this.keys.shoot) {
                this.shoot();
                this.keys.shoot = false;
            }

        });


        document.addEventListener('keyup', (e) => {
            if (e.key === 'a' || e.key === 'A'){ 
                this.keys.A = false;

            }
            if (e.key === 'd' || e.key === 'D'){ 
                this.keys.D = false;

            }
            if (e.key === 'w' || e.key === 'W'){ 
                this.keys.W = false;

            }
            if (e.key === "q" || e.key === "Q" || e.key === "ArrowUp") {
               this.keys.shoot = true;
            }
        });
    }

}