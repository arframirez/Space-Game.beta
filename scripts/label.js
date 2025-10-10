export class Label {
    constructor(ctx, position, text, color, font, fontWeight, isFinished = false) {
        this.ctx = ctx;
        this.font = font;
        this.fontWeight = fontWeight;
        this.opacity = isFinished ? 0 : 1; // Si está terminada, empieza invisible

        // Si no está terminada, inicializamos con los valores dados
        if (!isFinished) {
            this.init(position, text, color);
        }
    }

    /**
     * Reinicia la etiqueta con nuevos valores para ser reutilizada.
     * @param {{x: number, y: number}} position
     * @param {string} text
     * @param {string} color
     */
    init(position, text, color) {
        this.position = position;
        this.text = text;
        this.color = color;
        this.opacity = 1;
    }

    draw() {
        this.ctx.globalAlpha = this.opacity;
        this.ctx.font = `${this.fontWeight} 15px ${this.font}`;
        this.ctx.fillStyle = this.color;
        this.ctx.fillText(this.text, this.position.x-25, this.position.y);
        this.ctx.globalAlpha = 1;
    }
    update(){
        this.draw();
        this.opacity -= 0.01;
        this.position.y -= 0.8;
    }
}