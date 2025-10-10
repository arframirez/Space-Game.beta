/**
 * Representa el rayo láser "Súper" del jefe.
 */
export class BossBeam {
    /**
     * @param {CanvasRenderingContext2D} ctx El contexto del canvas.
     * @param {import('./boss.js').Boss} boss El jefe que dispara el rayo.
     */
    constructor(ctx, boss) {
        this.ctx = ctx;
        this.boss = boss;

        this.duration = 180; // 3 segundos a 60fps
        this.isFinished = false;

        this.width = 75; // Un rayo grueso y amenazante
        this.length = 1500;
        this.color = 'rgba(200, 100, 255, 0.8)';
        this.glowColor = 'rgba(220, 150, 255, 1)';
    }

    update() {
        this.duration--;
        if (this.duration <= 0) {
            this.isFinished = true;
        }
    }

    draw() {
        if (this.isFinished) return;

        const bossPos = this.boss.position;
        const beamStartX = bossPos.x;
        // El rayo comienza desde la parte inferior del jefe
        const beamStartY = bossPos.y + this.boss.image.height / 2;
        const beamHeight = this.ctx.canvas.height - beamStartY;

        this.ctx.save();

        this.ctx.shadowColor = this.glowColor;
        this.ctx.shadowBlur = 35;

        if (this.duration < 30) {
            this.ctx.globalAlpha = this.duration / 30; // El rayo se desvanece al final
        }

        const coreWidth = this.width * 0.4;
        this.ctx.fillRect(beamStartX - coreWidth / 2, beamStartY, coreWidth, beamHeight);

        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(beamStartX - this.width / 2, beamStartY, this.width, beamHeight);

        this.ctx.restore();
    }

    /**
     * Comprueba si la nave del jugador colisiona con el rayo.
     * @param {{position: {x: number, y: number}, image: {radio: number}}} target La nave del jugador.
     * @returns {boolean}
     */
    checkCollision(target) {
        if (this.isFinished) return false;

        const beamStartX = this.boss.position.x;
        const beamStartY = this.boss.position.y + this.boss.image.height / 2;

        const targetX = target.position.x;
        const targetY = target.position.y;
        const targetRadius = target.image.radio;

        // Comprobación horizontal
        const collidesX = Math.abs(targetX - beamStartX) < (this.width / 2) + targetRadius;
        // Comprobación vertical (el objetivo debe estar por debajo del inicio del rayo)
        const collidesY = targetY + targetRadius > beamStartY;

        return collidesX && collidesY;
    }
}