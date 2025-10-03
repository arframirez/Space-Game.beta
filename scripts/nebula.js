export class Nebula {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {HTMLCanvasElement} canvas El elemento canvas.
     * @param {{x: number, y: number}} position La posición central de la nebulosa.
     * @param {number} particleCount El número de partículas en la nebulosa.
     * @param {number} radius El radio de dispersión de las partículas.
     */
    constructor(ctx, canvas, position, particleCount, radius) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.position = position;
        this.particleCount = particleCount;
        this.radius = radius;
        this.dustParticles = [];
        this.initParticles();

        // ✅ Añadimos velocidad a la nebulosa para que se mueva por la pantalla
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
    }

    initParticles() {
        const colors = ['rgba(200, 160, 255, 0.4)', 'rgba(150, 180, 255, 0.3)', 'rgba(255, 150, 200, 0.35)'];
        for (let i = 0; i < this.particleCount; i++) {
            // Genera partículas en una distribución elíptica para una forma más natural
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * this.radius; // Distancia desde el centro

            // ✅ Hacemos que la opacidad sea mayor en los bordes y menor en el centro
            const edgeFactor = r / this.radius; // Un valor de 0 (centro) a 1 (borde)
            const opacity = (edgeFactor * 0.6) + (Math.random() * 0.1); // Opacidad base + aleatoriedad
            
            this.dustParticles.push({
                x: Math.cos(angle) * r, // Posición relativa al centro
                y: Math.sin(angle) * r * 0.6, // 0.6 para hacerla más ancha que alta
                size: Math.random() * 1.8 + 0.2, // Hacemos las partículas un poco más grandes para que se noten más
                opacity: opacity,
                color: colors[Math.floor(Math.random() * colors.length)],
                // Pequeño movimiento de deriva para cada partícula
                vx: (Math.random() - 0.5) * 0.05,
                vy: (Math.random() - 0.5) * 0.05
            });
        }
    }

    draw(targetCtx = this.ctx) {
        targetCtx.save();
        // Dibujamos cada partícula de polvo
        this.dustParticles.forEach(p => {
            targetCtx.beginPath();
            targetCtx.globalAlpha = p.opacity * 1.4; // No multiplicar por 2, globalAlpha se limita a 1
            targetCtx.fillStyle = p.color;
            // La posición absoluta es la del centro de la nebulosa más la relativa de la partícula
            targetCtx.arc(this.position.x + p.x, this.position.y + p.y, p.size, 0, Math.PI * 2);
            targetCtx.fill();
        });
        targetCtx.restore();
    }

    update() {
        // ✅ Movimiento general de la nebulosa con su propia velocidad
        this.position.x += this.vx;
        this.position.y += this.vy;

        // ✅ Lógica para que la nebulosa rebote en los bordes del canvas
        if (this.position.x - this.radius < 0 || this.position.x + this.radius > this.canvas.width) {
            this.vx *= -1;
        }
        if (this.position.y - this.radius < 0 || this.position.y + this.radius > this.canvas.height) {
            this.vy *= -1;
        }

        // Movimiento interno de las partículas
        this.dustParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
        });
    }
}