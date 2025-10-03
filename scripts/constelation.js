export class Constelation { 
    constructor(ctx, canvas, starCount) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.starCount = starCount || 100; // Número de estrellas por defecto
        this.stars = [];
        this.maxDistance = 120; // Distancia máxima para conectar estrellas
        this.initStars();
    }

    initStars() {
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3, // Velocidad horizontal lenta
                vy: (Math.random() - 0.5) * 0.3, // Velocidad vertical lenta
                radius: Math.random() * 1.2 + 0.3 // Radios pequeños
            });
        }
    }

    draw(targetCtx = this.ctx) {
        targetCtx.save();
        // Dibujar las líneas de conexión
        for (let i = 0; i < this.stars.length; i++) {
            for (let j = i + 1; j < this.stars.length; j++) {
                const star1 = this.stars[i];
                const star2 = this.stars[j];
                const distanceSq = (star1.x - star2.x)**2 + (star1.y - star2.y)**2; // Usar distancia al cuadrado es más rápido

                if (distanceSq < this.maxDistance * this.maxDistance) {
                    const distance = Math.sqrt(distanceSq);
                    targetCtx.beginPath();
                    targetCtx.moveTo(star1.x, star1.y);
                    targetCtx.lineTo(star2.x, star2.y);
                    // La opacidad de la línea depende de la distancia
                    targetCtx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - distance / this.maxDistance)})`;
                    targetCtx.lineWidth = 0.4;
                    targetCtx.stroke();
                }
            }
        }

        // Dibujar los puntos de las estrellas
        this.stars.forEach(star => {
            targetCtx.beginPath();
            targetCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            targetCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            targetCtx.fill();
        });
        targetCtx.restore();
    }

    update() {
        this.stars.forEach(star => {
            star.x += star.vx;
            star.y += star.vy;

            // Si la estrella sale de la pantalla, la reubicamos al otro lado
            if (star.x < 0) star.x = this.canvas.width;
            if (star.x > this.canvas.width) star.x = 0;
            if (star.y < 0) star.y = this.canvas.height;
            if (star.y > this.canvas.height) star.y = 0;
        });
    }
}