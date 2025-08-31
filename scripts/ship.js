import { Projectile } from "./projectile.js";
import {Object} from "./object.js";
export class Ship{
    constructor(ctx, spritesheet, canvas) {
        this.ctx = ctx;
        this.spritesheet = spritesheet;
        this.image = new Object(spritesheet,{x: 277, y: 0}, 170, 151, 0.4);
        this.imageEff = new Object(spritesheet,{x: 549, y: 322}, 13, 30, 0.8);
        this.position = {x: 200, y: 200};
        this.canvas = canvas;
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
        if(this.keys.D) this.angle += 0.08; 
        if(this.keys.A) this.angle -= 0.08;

        if (this.keys.W) {
            this.speed += 0.09;
            if (this.speed >= 7) this.speed = 7;
              this.imageEff.scale += 0.009;
              this.imageEff.width = this.imageEff.paddleWidth * this.imageEff.scale;
              this.imageEff.height = this.imageEff.paddleHeight * this.imageEff.scale;
            if (this.imageEff.scale >= 0.9) this.imageEff.scale = 0.9;
          } else {
              this.imageEff.scale -= 0.01;
              if (this.imageEff.scale <= 0) this.imageEff.scale = 0;
              this.imageEff.width = this.imageEff.paddleWidth * this.imageEff.scale;
              this.imageEff.height = this.imageEff.paddleHeight * this.imageEff.scale;
          }
        if (!this.keys.W) {
            this.speed -= 0.07;
            if (this.speed <= 0) this.speed = 0;
        }
           this.position.x += Math.cos(this.angle-Math.PI / -2) * this.speed;
            this.position.y += Math.sin(this.angle-Math.PI / -2) * this.speed;
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
        this.hudCooldown.textContent = "Recargando...";
        this.hudRecharge.textContent = "";
    } 
    // Si se está regenerando, mostramos progreso
    else if (this.recharging && this.availableShots < this.maxShots) {
        this.hudCooldown.textContent = "";
        this.hudRecharge.textContent = "Regenerando disparos...";
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
            if ((e.key === "q" || e.key === "Q" || e.key === "ArrowUp")) {
                if (!this.blocked && this.availableShots > 0) {
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

                   let remaining = 1 / 1;
                    this.hudCooldown.textContent = `Bloqueado: ${remaining}s`;

                   const cooldownInterval = setInterval(() => {
                    remaining--;
                   this.hudCooldown.textContent = `Bloqueado: ${remaining}s`;

                     if (remaining <= 0) {
                       clearInterval(cooldownInterval);
                        this.blocked = false;
                        this.startRecharge();
                     }
                 }, 1000);
             }
                }
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