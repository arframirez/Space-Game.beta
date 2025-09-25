import {Object} from "./object.js";
export  class Asteroid {
    constructor(ctx, spritesheet, position={x:0,y:0},type, minSpeed = 2, maxSpeed = 3) {
        this.ctx = ctx;
        this.spritesheet = spritesheet;
        this.position = {...position};
        this.rotation = 0;
        this.death = false;
        this.type = type;
        this.angle = (Math.random() * (360) * Math.PI/180);
        
        // 📱 Escala dinámica para móviles
        const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        const mobileScale = isMobile ? 0.7 : 1.0; // 70% en móvil, 100% en desktop
        
        this.scale = (Math.random() * (0.6 - 0.4) + 0.4) * mobileScale;
        if (this.type === 3){
            this.scale = (Math.random() * (0.3 - 0.15) + 0.15) * mobileScale; // Los meteoritos pequeños son más rápidos
            this.speed = Math.random() * (maxSpeed * 2 - minSpeed * 2) + minSpeed * 2; // Duplicamos la velocidad para los pequeños
        }
        this.speed = Math.random() * (maxSpeed - minSpeed) + minSpeed; // Usamos el rango de velocidad pasado
        this.createAsteroid();
    }
    createAsteroid(){
        let num = Math.floor(Math.random() * (4-1+1)) + 1;
    switch(num) {
        case 1:
            this.image = new Object(this.spritesheet, {x: 0, y: 619}, 215, 211, this.scale);    
            break;
        case 2:
            this.image = new Object(this.spritesheet, {x: 213, y: 829}, 212, 218, this.scale);
            break;
        case 3:
            this.image = new Object(this.spritesheet, {x: 0, y: 830}, 214, 227, this.scale);
            break;
        case 4:
            this.image = new Object(this.spritesheet, {x: 0, y: 399}, 220, 221, this.scale);
            break;
     }
    
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
    draw() {
        this.ctx.save();
        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.rotate(this.rotation);
        this.image.draw(this.ctx, {x:0, y:0});
        this.ctx.restore();
    }
    update(boolean) {
        this.draw();
        this.position.x += Math.cos(this.angle) * this.speed;
        this.position.y += Math.sin(this.angle) * this.speed;
        this.rotation += 0.01;
        if (boolean) this.hitbox();
        // if (this.position.x > this.ctx.canvas.width + this.image.width || 
        //     this.position.x < -this.image.width || 
        //     this.position.y > this.ctx.canvas.height + this.image.height || 
        //     this.position.y < -this.image.height) {
        //     this.generatePosition(this.ctx.canvas);
        // }
    }
}