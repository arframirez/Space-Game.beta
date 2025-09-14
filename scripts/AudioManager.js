/**
 * Gestiona la carga y reproducción de efectos de sonido en el juego.
 */
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.isMuted = false;
        // Usamos Web Audio API para un mejor control y para manejar las políticas de autoplay de los navegadores.
        // Se inicializa en un estado "suspendido" hasta que el usuario interactúa.
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    /** Desbloquea el contexto de audio, necesario en los navegadores modernos. */
    unlockAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Carga un archivo de sonido y lo almacena para su uso.
     * @param {string} name - El nombre clave para el sonido (ej. 'explosion').
     * @param {string} src - La ruta al archivo de audio.
     */
    loadSound(name, src) {
        const sound = new Audio(src);
        sound.preload = 'auto';
        this.sounds[name] = sound;
    }

    /**
     * Reproduce un sonido previamente cargado.
     * @param {string} name - El nombre del sonido a reproducir.
     * @param {number} [volume=1.0] - El volumen de reproducción (0.0 a 1.0).
     */
    playSound(name, volume = 1.0) {
        if (this.isMuted || !this.sounds[name]) return;

        // Nos aseguramos de que el audio esté desbloqueado antes de reproducir.
        this.unlockAudio();

        const soundToPlay = this.sounds[name].cloneNode();
        soundToPlay.volume = volume;
        // El método .play() devuelve una promesa. La capturamos para evitar errores en la consola.
        soundToPlay.play().catch(e => console.warn(`No se pudo reproducir el sonido: ${name}. Es posible que se necesite interacción del usuario.`, e));
    }
}