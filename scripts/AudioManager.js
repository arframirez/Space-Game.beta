/**
 * Gestiona la carga y reproducción de efectos de sonido en el juego.
 */
export class AudioManager {
    constructor() {
        this.sounds = {};
        // Usamos Web Audio API para un mejor control y para manejar las políticas de autoplay de los navegadores.
        // Se inicializa en un estado "suspendido" hasta que el usuario interactúa.
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // ✅ Creamos un nodo de ganancia (volumen) principal. Todos los sonidos pasarán por aquí.
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.volume = 1.0; // El volumen ahora controla el GainNode.
    }

    /** Desbloquea el contexto de audio, necesario en los navegadores modernos. */
    unlockAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Carga un archivo de sonido y lo almacena para su uso.
     * ✅ Ahora es asíncrono y usa la Web Audio API para decodificar.
     * @param {string} name - El nombre clave para el sonido (ej. 'explosion').
     * @param {string} src - La ruta al archivo de audio.
     */
    async loadSound(name, src) {
        try {
            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            // Decodificamos el audio a un formato que la Web Audio API puede usar instantáneamente.
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds[name] = audioBuffer;
        } catch (error) {
            console.error(`Error al cargar el sonido ${name}:`, error);
        }
    }

    /**
     * Reproduce un sonido previamente cargado.
     * ✅ Ahora usa AudioBufferSourceNode para una reproducción sin latencia.
     * @param {string} name - El nombre del sonido a reproducir.
     * @param {number} [volume=1.0] - El volumen de reproducción (0.0 a 1.0).
     */
    playSound(name, soundSpecificVolume = 1.0) {
        const audioBuffer = this.sounds[name];
        if (this.volume === 0 || !audioBuffer) return;

        // Nos aseguramos de que el audio esté desbloqueado antes de reproducir.
        this.unlockAudio();

        // Creamos una "fuente" para el sonido. Es como un reproductor temporal.
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Creamos un nodo de ganancia para este sonido específico, si se necesita un volumen diferente.
        const soundGain = this.audioContext.createGain();
        soundGain.gain.value = soundSpecificVolume;

        // Conectamos la fuente al nodo de ganancia del sonido, y este al nodo maestro.
        source.connect(soundGain);
        soundGain.connect(this.masterGain);

        // Reproducimos el sonido inmediatamente.
        source.start(0);
    }

    // ✅ Setter para el volumen que controla el nodo de ganancia maestro.
    set volume(value) {
        this._volume = value;
        if (this.masterGain) {
            this.masterGain.gain.value = this._volume;
        }
    }
 }