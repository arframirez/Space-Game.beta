import { Object } from "./object.js";
import { Projectile } from "./projectile.js";


export class Enemy {
    constructor(ctx,spritesheet,canvas,ship, initialSpeed = 2) {
        this.ctx = ctx;
        this.spritesheet = spritesheet;
        this.position = {x: 500, y: 200};
        this.angle = 0;
        this.canvas = canvas;
        this.ship = ship;
        this.angle = 0;
        
        // 📱 Escala dinámica para móviles
        const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        const mobileScale = isMobile ? 0.65 : 1.0; // 65% en móvil, 100% en desktop
        
        this.image = new Object(spritesheet, {x: 662, y: -1}, 94, 148, 0.4 * mobileScale);
        this.imageParts = new Object(spritesheet, {x: 992, y: 564}, 37, 72, 0.54 * mobileScale);
        this.speed = initialSpeed; // Usamos la velocidad inicial pasada
        this.death = false;
    }
        draw() {
        this.ctx.save();

        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.rotate(this.angle + Math.PI / 2);
        
        // Dibujamos el cuerpo principal (centrado en el nuevo origen)
        this.image.draw(this.ctx, {x: 0, y: 0});
        
        // Dibujamos el ala derecha
        this.imageParts.draw(this.ctx, {x: 16, y: 9});
        
        // Usamos scale() para invertir el canvas y dibujar el ala izquierda
        this.ctx.scale(-1, 1);
        this.imageParts.draw(this.ctx, {x: 16, y: 9});

        this.ctx.restore();
      
    }
    createProjectile(projectiles) {
        let num = Math.floor(Math.random() * (50)) + 1;
        if(num===2){
        let projectile = new Projectile(
            this.ctx,
            this.spritesheet,
            { x: this.position.x + Math.cos(this.angle) * 14, y: this.position.y + Math.sin(this.angle) * 14 },
            this.angle + Math.PI / -2,
            true
        );
        projectile.speed = 5;
        projectiles.push(projectile);
    }
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
        let v1 = {
            x: this.ship.position.x - this.position.x,
            y: this.ship.position.y - this.position.y
        } 
        let mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y); 
        let vU = {
            x: v1.x / mag,
            y: v1.y / mag
        };

        this.angle = Math.atan2(vU.y, vU.x);
        this.position.x += vU.x * this.speed;
        this.position.y += vU.y * this.speed;
    }
}