import { Projectile } from "./projectile.js";
import {Object} from "./object.js";

export class Ship{
    // ✅ Configuración movida aquí como propiedad estática
    static SHIP_CONFIG = {
        'blue': {
            sprite: {x: 277, y: 0},
            width: 170,
            height: 150,
            baseScale: 0.6, // Escala original
            // --- Stats ---
            health: 2,
            shotType: 'double',
            turnRate: 0.09,
            maxSpeed: 9,
            acceleration: 0.25,
            maxShots: 10,
            bonusMaxShots: 15,
            rechargeRate: 1000, // Tasa de recarga estándar (ms)
        },
        'green': {
            sprite: {x: 448, y: 58},
            width: 114,
            height: 82,
            baseScale: 0.8, // Aumentamos la escala para que sea más grande
            // --- Stats ---
            health: 1,
            shotType: 'single_fast',
            turnRate: 0.1,      // Gira más rápido
            maxSpeed: 12,       // Más rápida
            acceleration: 0.30, // Acelera más rápido
            maxShots: 12, // Más disparos para compensar el tiro único
            bonusMaxShots: 18,
            rechargeRate: 500, // ¡Recarga más rápido!
        },
        'red': {
            sprite: {x: 562, y: 58},
            width: 100,
            height: 82,
            baseScale: 1, // Aumentamos la escala para que sea más grande
            // --- Stats ---
            health: 3,
            shotType: 'spread',
            turnRate: 0.07,     // Gira más lento
            maxSpeed: 7,        // Más lenta
            acceleration: 0.2, // Acelera más lento
            maxShots: 5, // Menos disparos, pero más potentes
            bonusMaxShots: 8,
            rechargeRate: 1000, // Recarga más lento para equilibrar el poder
        }
    };

    constructor(ctx, spritesheet, canvas, audioManager, projectilePool, shipType = 'blue') {
        this.ctx = ctx;
        this.spritesheet = spritesheet;
        this.canvas = canvas;
        this.audioManager = audioManager; // Guardamos la referencia al gestor de audio
        this.projectilePool = projectilePool; // ✅ Guardamos la referencia a la piscina de proyectiles
        this.projectiles = []; // ✅ Este array ahora contendrá los proyectiles ACTIVOS
        
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
        // Ahora se accede a través de la clase: Ship.SHIP_CONFIG
        const config = Ship.SHIP_CONFIG[shipType] || Ship.SHIP_CONFIG['blue'];
        this.config = config; // Guardamos la configuración para uso externo
        this.image = new Object(spritesheet, config.sprite, config.width, config.height, config.baseScale * mobileScale);

        // Asignamos las estadísticas de vida
        this.maxHealth = config.health;
        this.health = this.maxHealth;
        this.isInvincible = false;
        this.invincibilityTimer = null;

        // Asignamos las estadísticas de disparo
        this.shotType = config.shotType;

        // Asignamos las estadísticas de movimiento
        this.turnRate = config.turnRate;
        this.maxSpeed = config.maxSpeed;
        this.acceleration = config.acceleration;

        // Asignamos la tasa de recarga
        this.rechargeRate = config.rechargeRate;

        this.imageEff = new Object(spritesheet,{x: 549, y: 322}, 13, 30, 0.6 * mobileScale);
        this.position = {x: 200, y: 200};
        this.speed = 0
        this.keys = {
            A: false,
            D: false,
            W: false,
            shoot: true
        }
        this.angle = 0

        this.hudShots = document.getElementById("shots");
        this.hudMaxShots = document.getElementById("maxShots");
        this.hudCooldown = document.getElementById("cooldown");
        this.hudRecharge = document.getElementById("recharge");

        this.maxShots = config.maxShots;
        this.availableShots = config.maxShots;
        this.recharging = false;
        this.blocked = false;

        // ✅ Nuevas propiedades para gestionar el cooldown del HUD sin setInterval
        this.cooldownEndTime = 0;
        this.cooldownDuration = 4000; // 4 segundos en milisegundos

        // --- Power-up States ---
        this.isShielded = false;
        this.shieldTimer = null;
        this.isRapidFire = false;
        // Guardar stats originales durante el power-up
        this.originalMaxShots = null;
        this.originalRechargeRate = null;
        this.rechargeInterval = null; // ✅ Para controlar el intervalo de recarga

        this.isTouchShooting = false; // ✅ Nuevo estado para el disparo táctil

        // ✅ Control de cadencia de disparo para evitar saturación
        this.lastShotTime = 0;
        this.shotCooldown = 150; // ms. Cadencia base de disparo.

        // ✅ Pre-cálculo de valores de movimiento para optimización
        this.effectiveMaxSpeed = isMobile ? this.maxSpeed * 0.7 : this.maxSpeed;
        this.effectiveAcceleration = isMobile ? this.acceleration * 0.8 : this.acceleration;
        this.deceleration = isMobile ? 0.08 : 0.12;


        // ✅ Activamos los listeners del teclado al crear la nave
        this._addEventListeners();
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

        // Efecto de parpadeo si es invencible (después de un golpe)
        if (this.isInvincible) {
            // Parpadea cada 100ms
            this.ctx.globalAlpha = (Math.floor(Date.now() / 100) % 2 === 0) ? 1.0 : 0.4;
        }

        // ✅ Efecto visual de aura para munición infinita (bajo coste de rendimiento)
        if (this.isRapidFire) {
            this.drawRapidFireGlow();
        }

        this.image.draw(this.ctx, this.position);

        // ✅ Optimización: Solo dibujar los propulsores si la estela es visible.
        if (this.imageEff.scale > 0) {
            // Dibujamos los dos propulsores en su posición correcta relativa a la nave
            this.imageEff.draw(this.ctx, {x: this.position.x + 15, y: this.position.y - 35});
            this.imageEff.draw(this.ctx, {x: this.position.x - 15, y: this.position.y - 35});
        }

        this.ctx.globalAlpha = 1.0; // Restaurar opacidad
        this.ctx.filter = 'none'; // Limpiar filtro

        // Dibujar el escudo si está activo
        if (this.isShielded) {
            this.drawShield();
        }

        this.ctx.restore();
    }
move() {

    // --- 2) Rotación por teclado (desktop)
    if (this.keys.D) this.angle += this.turnRate;
    if (this.keys.A) this.angle -= this.turnRate;

    // --- 3) Intensidad del joystick (móvil)
    const jIntensity = window.joystickIntensity || 0;
    const jDir = window.joystickDirection || { x: 0, y: 0 };

    let thrusting = false;

    // --- 4) Control con joystick prioritario
    if (jIntensity > 0.05) {
        this.angle = Math.atan2(jDir.y, -jDir.x) + Math.PI / 2;
        this.speed = Math.min(this.effectiveMaxSpeed, this.effectiveMaxSpeed * jIntensity);
        thrusting = true;
    } else if (this.keys.W) {
        // Control con teclado en desktop
        this.speed += this.effectiveAcceleration;
        if (this.speed >= this.effectiveMaxSpeed) this.speed = this.effectiveMaxSpeed;
        thrusting = true;
    }

    // --- 5) Desaceleración si no hay empuje
    if (!thrusting) {
        this.speed -= this.deceleration;
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

    drawShield() {
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.image.radio + 10, 0, Math.PI * 2);
        
        // Efecto de pulso para el escudo
        const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8; // 0.6 a 1.0
        this.ctx.fillStyle = `rgba(0, 150, 255, ${0.2 * pulse})`;
        this.ctx.fill();
        this.ctx.strokeStyle = `rgba(0, 200, 255, ${0.8 * pulse})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawRapidFireGlow() {
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.image.radio + 12, 0, Math.PI * 2);

        // Efecto de pulso para el aura
        const pulse = Math.sin(Date.now() / 150) * 0.25 + 0.75; // 0.5 a 1.0

        // Creamos un gradiente radial para un efecto más suave
        const gradient = this.ctx.createRadialGradient(this.position.x, this.position.y, this.image.radio, this.position.x, this.position.y, this.image.radio + 12);
        gradient.addColorStop(0, `rgba(255, 220, 0, ${0.05 * pulse})`);
        gradient.addColorStop(1, `rgba(255, 200, 0, ${0.3 * pulse})`);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }
    updateProjectiles(boolean) {
        // Iteramos hacia atrás para evitar problemas al eliminar elementos con splice
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(boolean);
            if (this.projectiles[i].collision(this.canvas)) {
                this.projectiles[i].active = false; // ✅ Devolvemos a la piscina marcándolo como inactivo
                this.projectiles.splice(i, 1); // Lo quitamos de la lista de activos
            }
        }
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

        // ✅ Comprobamos en cada frame si se debe disparar con el teclado
        this.handleShooting(); // ✅ Usamos el nuevo método centralizado
         
        this.updateHUD();
    }
    updateHUD() {
        // Mostrar disparos disponibles y máximos
        this.hudShots.textContent = this.availableShots;
        this.hudMaxShots.textContent = this.maxShots;

        // ➕ Actualizar el HUD de vida
        const healthDisplay = document.getElementById('health-display');
        if (healthDisplay) {
            healthDisplay.textContent = '❤️'.repeat(this.health);
        }
    
        // ✅ Lógica de cooldown rediseñada y segura
        if (this.blocked) {
            const now = Date.now();
            const remainingTime = this.cooldownEndTime - now;
    
            if (remainingTime > 0) {
                // Mientras está bloqueado, muestra el tiempo restante
                this.hudCooldown.textContent = `Blocked: ${Math.ceil(remainingTime / 1000)}s`;
                this.hudRecharge.textContent = "";
            } else {
                // Cuando el tiempo termina, se desbloquea
                this.blocked = false;
                this.startRecharge();
                this.hudCooldown.textContent = "";
            }
        } else if (this.recharging && this.availableShots < this.maxShots) {
            // Si se está regenerando, mostramos progreso
            this.hudCooldown.textContent = "";
            this.hudRecharge.textContent = "Recharging...";
        } else {
            // Si todo está lleno, ocultamos mensajes
            this.hudCooldown.textContent = "";
            this.hudRecharge.textContent = "";
        }
    }
    startRecharge() {
    // ✅ Si ya hay una recarga en curso o un intervalo activo, no hacemos nada.
    if (this.recharging || this.rechargeInterval) return;

    this.recharging = true;
    console.log('%c[DEBUG] Iniciando recarga de munición...', 'color: cyan;');

    this.rechargeInterval = setInterval(() => {
        if (this.availableShots < this.maxShots) {
            this.availableShots += 1;
        }

        if (this.availableShots >= this.maxShots) {
            this.availableShots = this.maxShots;
            console.log(`%c[DEBUG] Recarga completa. Limpiando intervalo: ${this.rechargeInterval}`, 'color: green;');
            clearInterval(this.rechargeInterval);
            this.rechargeInterval = null;
            this.recharging = false;
        }
    }, this.rechargeRate); // Usamos la tasa de recarga de la nave
}
    // ✅ Nuevo método que decide si disparar en cada frame
    handleShooting() {
        const now = Date.now();
        if (now - this.lastShotTime < this.shotCooldown) return;

        const wantsToShootKeyboard = !this.keys.shoot;
        const wantsToShootTouch = this.isTouchShooting;

        if (wantsToShootKeyboard || wantsToShootTouch) {
            this.shoot(wantsToShootKeyboard);
        }
    }

    async shoot(isKeyboardShot) {
        // La condición para disparar es tener munición o el power-up activo. El cooldown ya se ha comprobado antes.
        const canShoot = this.isRapidFire || (!this.blocked && this.availableShots > 0);

        if (canShoot) {
            this.lastShotTime = Date.now(); // Actualizamos el tiempo del último disparo

            if (isKeyboardShot) this.keys.shoot = true; // Bloquea el disparo de teclado hasta soltar la tecla

            this.audioManager.playSound('shoot', 1.0);

            // Lógica de disparo unificada según el tipo de nave
            switch (this.shotType) {
                case 'single_fast': {
                    const p = this.projectilePool.get();
                    if (p) {
                        p.init({ ...this.position }, this.angle);
                        p.speed = 22; // Hacemos el proyectil más rápido
                        this.projectiles.push(p);
                    }
                    break;
                }

                case 'spread': {
                    const spreadAngle = 0.25; // Ángulo de dispersión en radianes
                    const p1 = this.projectilePool.get();
                    if (p1) { p1.init({ ...this.position }, this.angle); this.projectiles.push(p1); }
                    const p2 = this.projectilePool.get();
                    if (p2) { p2.init({ ...this.position }, this.angle - spreadAngle); this.projectiles.push(p2); }
                    const p3 = this.projectilePool.get();
                    if (p3) { p3.init({ ...this.position }, this.angle + spreadAngle); this.projectiles.push(p3); }
                    break;
                }

                case 'double':
                default: {
                    // Disparo doble estándar
                    const p1 = this.projectilePool.get();
                    if (p1) {
                        p1.init({ x: this.position.x + Math.cos(this.angle) * 14, y: this.position.y + Math.sin(this.angle) * 14 }, this.angle);
                        this.projectiles.push(p1);
                    }
                    const p2 = this.projectilePool.get();
                    if (p2) {
                        p2.init({ x: this.position.x - Math.cos(this.angle) * 14, y: this.position.y - Math.sin(this.angle) * 14 }, this.angle);
                        this.projectiles.push(p2);
                    }
                    break;
                }
            }

            // Solo consumir munición si el power-up NO está activo
            if (!this.isRapidFire) {
                this.availableShots--;
                if (!this.recharging) this.startRecharge();
                if (this.availableShots === 0) {
                    this.blocked = true;
                    // ✅ Establecemos el momento en que terminará el bloqueo
                    this.cooldownEndTime = Date.now() + this.cooldownDuration;
                }
            }
        }
    }

    takeDamage() {
        // Si la nave es invencible (por el escudo o por un golpe reciente), no recibe daño.
        if (this.isInvincible || this.isShielded) return;

        this.health--;

        // ➕ Actualizar el HUD de vida inmediatamente al recibir daño
        const healthDisplay = document.getElementById('health-display');
        if (healthDisplay) {
            healthDisplay.textContent = '❤️'.repeat(this.health);
        }
        
        // Activa un breve periodo de invencibilidad para evitar múltiples golpes seguidos.
        this.isInvincible = true;
        if (this.invincibilityTimer) clearTimeout(this.invincibilityTimer);
        
        this.invincibilityTimer = setTimeout(() => {
            this.isInvincible = false;
            this.invincibilityTimer = null;
        }, 2000); // 2 segundos de invencibilidad
    }

    activatePowerUp(type) {
        if (type === 'shield') {
            this.isShielded = true;
            // Si ya hay un temporizador, lo limpiamos para reiniciar la duración
            if (this.shieldTimer) clearTimeout(this.shieldTimer);
            
            this.shieldTimer = setTimeout(() => {
                this.isShielded = false;
                this.shieldTimer = null;
            }, 10000); // 10 segundos de duración
        }

        if (type === 'extraLife') {
            // ✅ Lógica para que la vida extra se acumule
            this.maxHealth++; // Aumenta la vida máxima
            this.health++;    // Aumenta la vida actual
        }

        if (type === 'rapidFire') {
            console.log('%c[POWER-UP] Activando munición infinita.', 'color: yellow; font-weight: bold;');
            console.log(`[DEBUG] Estado antes de activar: rechargeInterval=${this.rechargeInterval}, recharging=${this.recharging}`);
            // La lógica ahora es "munición infinita", no un cargador más grande.
            // Restauramos el comportamiento original del power-up.
            this.isRapidFire = true;

            // Si ya está activo, solo reiniciamos el temporizador
            console.log(`[DEBUG] Limpiando temporizador de power-up anterior (si existe): ${this.rapidFireTimer}`);
            if (this.rapidFireTimer) clearTimeout(this.rapidFireTimer);

            // Desbloqueamos el disparo por si estaba en cooldown
            this.blocked = false;
            // ✅ Reiniciamos el estado del cooldown del HUD
            this.cooldownEndTime = 0;
            this.hudCooldown.textContent = "";

            // ✅ Detenemos cualquier recarga de munición en curso.
            // Si el power-up da munición infinita, no tiene sentido seguir recargando.
            if (this.rechargeInterval) {
                console.log(`%c[DEBUG] Limpiando intervalo de recarga activo: ${this.rechargeInterval}`, 'color: orange;');
                clearInterval(this.rechargeInterval);
                this.rechargeInterval = null;
                this.recharging = false;
            }

            // Guardamos los valores originales si no lo hemos hecho ya
            console.log('[DEBUG] Guardando stats originales de la nave.');
            if (this.originalMaxShots === null) {
                this.originalMaxShots = this.maxShots;
                this.originalRechargeRate = this.rechargeRate;
            }

            this.rapidFireTimer = setTimeout(() => {
                this.isRapidFire = false;
                console.log('%c[POWER-UP] Munición infinita desactivada. Restaurando stats.', 'color: red; font-weight: bold;');
                this.rapidFireTimer = null;
                // Restauramos los valores originales solo si existen
                if (this.originalMaxShots !== null) this.maxShots = this.originalMaxShots;
                if (this.originalRechargeRate !== null) this.rechargeRate = this.originalRechargeRate;
                if (this.availableShots > this.maxShots) this.availableShots = this.maxShots; // Ajustamos la munición si excede el máximo
                this.originalMaxShots = null;
                this.originalRechargeRate = null;
            }, 10000); // 10 segundos de duración
        }
    }

    // ✅ Método para añadir los listeners de teclado
    _addEventListeners() {
        // Usamos arrow functions para mantener el contexto de `this`
        this.keydownHandler = (e) => {
            switch(e.key.toLowerCase()) {
                case 'a': this.keys.A = true; break;
                case 'd': this.keys.D = true; break;
                case 'w': this.keys.W = true; break;
                case ' ': // ✅ ' ' es el valor correcto para la barra espaciadora en e.key
                case 'q':
                case 'arrowup':
                    this.keys.shoot = false; break;
            }
        };

        this.keyupHandler = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'a' || key === 'd' || key === 'w') {
                this.keys[e.key.toUpperCase()] = false;
            } else if (key === 'q' || key === 'arrowup' || key === ' ') { // ✅ ' ' es el valor correcto
                this.keys.shoot = true;
            }
        };

        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }

    // ✅ Método para limpiar los listeners y evitar fugas de memoria
    destroy() {
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);
        console.log(`[DEBUG] Limpiando intervalo de recarga al destruir la nave (si existe): ${this.rechargeInterval}`);
        // ✅ Limpiamos el intervalo de recarga al destruir la nave
        if (this.rechargeInterval) clearInterval(this.rechargeInterval);
    }
}