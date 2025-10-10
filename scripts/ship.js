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
            shotType: 'double', // Disparo normal por defecto
            turnRate: 0.09,
            superAbilityType: 'super', // Habilidad especial
            maxSpeed: 9,
            acceleration: 0.25,
            maxShots: 10,
            bonusMaxShots: 15,
            rechargeRate: 900, // Tasa de recarga estándar (ms)
        },
        'green': {
            sprite: {x: 448, y: 58},
            width: 114,
            height: 82,
            baseScale: 0.8, // Aumentamos la escala para que sea más grande
            // --- Stats ---
            health: 1,
            shotType: 'single_fast',
            superAbilityType: 'continuous_beam', // Habilidad especial de la nave verde
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
            superAbilityType: 'destructive_shield', // Habilidad especial de la nave roja
            turnRate: 0.07,     // Gira más lento
            maxSpeed: 7,        // Más lenta
            acceleration: 0.2, // Acelera más lento
            maxShots: 5, //Menos disparos, pero más potentes
            bonusMaxShots: 8,
            rechargeRate: 1000, // Recarga más lento para equilibrar el poder
        }
        ,
        'butterfly': {
            imageUrl: './butterfly.png', // Imagen especial
            width: 500, // Ancho original
            height: 500, // Alto original
            baseScale: 0.3, // Escala ajustada
            // --- Stats ---
            health: 3,
            shotType: 'butterfly_double', // Disparo doble con efecto visual
            superAbilityType: 'tornado_beam', // Nueva habilidad especial
            turnRate: 0.11, // Muy ágil
            maxSpeed: 11,
            acceleration: 0.28,
            maxShots: 12,
            bonusMaxShots: 18,
            rechargeRate: 600,
        },
        'gold': {
            imageUrl: './klipartz.com.png', // ✅ Nueva imagen especial
            width: 500, // Ancho original de la imagen
            height: 500, // Alto original de la imagen
            baseScale: 0.2, // Escala ajustada para la nueva imagen
            // --- Stats (Superiores) ---
            health: 4, // Un punto más de vida
            shotType: 'spread_fast', // Nuevo tipo de disparo
            superAbilityType: 'black_hole', // ✅ Nueva súper habilidad
            turnRate: 0.09,
            maxSpeed: 10,
            acceleration: 0.28,
            maxShots: 15,
            bonusMaxShots: 22,
            rechargeRate: 750, // Recarga muy rápido
        }
    };

    constructor(ctx, spritesheet, canvas, audioManager, projectilePool, shipType = 'blue', permanentUpgrades = {}) {
        this.ctx = ctx;
        this.spritesheet = spritesheet;
        this.canvas = canvas;
        this.audioManager = audioManager; // Guardamos la referencia al gestor de audio
        this.projectilePool = projectilePool; // ✅ Guardamos la referencia a la piscina de proyectiles
        this.projectiles = []; // ✅ Este array ahora contendrá los proyectiles ACTIVOS
        
        this.shipType = shipType; // Guardamos el tipo de nave
        // 📱 Escala dinámica para móviles y orientación
        const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        const isLandscape = window.innerWidth > window.innerHeight && window.innerWidth < 768;
        let mobileScale;
        
        if (isLandscape) {
            mobileScale = 0.3; // Más pequeña en landscape para pantallas anchas
        } else if (isMobile) {
            mobileScale = 0.5; // Tamaño normal para móvil en portrait
        } else {
            mobileScale = 1; // Tamaño completo en desktop
        }
        
        this.btn = document.querySelector(".button");
        // Ahora se accede a través de la clase: Ship.SHIP_CONFIG
        const config = Ship.SHIP_CONFIG[this.shipType] || Ship.SHIP_CONFIG['blue'];
        this.config = config; // Guardamos la configuración para uso externo

        // ✅ Lógica para cargar la imagen especial de la nave dorada
        if ((shipType === 'gold' || shipType === 'butterfly') && config.imageUrl) {
            this.isSpecialImage = true;
            this.image = new Image();
            this.image.src = config.imageUrl;
            this.image.scale = config.baseScale * mobileScale;
            this.image.width = config.width * this.image.scale;
            this.image.height = config.height * this.image.scale;
            this.image.radio = (this.image.width + this.image.height) / 4;
        } else {
            this.image = new Object(spritesheet, config.sprite, config.width, config.height, config.baseScale * mobileScale);
        }

        // Asignamos las estadísticas de vida
        this.maxHealth = config.health;
        this.health = this.maxHealth;
        this.isInvincible = false;
        this.invincibilityTimer = null;

        // Asignamos las estadísticas de disparo
        this.shotType = config.shotType;
        this.superAbilityType = config.superAbilityType; // Guardamos la habilidad especial

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
            shoot: true,
            super: true // Nueva tecla para el super
        }
        this.angle = (this.shipType === 'gold' || this.shipType === 'butterfly') ? Math.PI : 0; // ✅ Invertimos el ángulo inicial

        this.hudShots = document.getElementById("shots");
        this.hudMaxShots = document.getElementById("maxShots");
        this.hudCooldown = document.getElementById("cooldown");
        this.hudRecharge = document.getElementById("recharge");
        this.hudSuper = document.getElementById("super-hud"); //  HUD para el super

        this.maxShots = config.maxShots;
        this.availableShots = config.maxShots;
        this.recharging = false;
        this.blocked = false;

        // ✅ Nuevas propiedades para gestionar el cooldown del HUD sin setInterval
        this.cooldownEndTime = 0;
        this.cooldownDuration = 4000; // 4 segundos en milisegundos

        // --- Super Ability State ---
        this.maxSuperCharges = 3;
        this.availableSuperCharges = this.maxSuperCharges;
        this.superRechargeDuration = 15000; // 15 segundos para recargar todas las cargas
        this.superRechargeEndTime = 0;
        this.isSuperRecharging = false;
        this.superShotCooldown = 1000; // 1 segundo de cooldown entre usos del super

        // --- Power-up States ---
        this.isShielded = false;
        this.shieldTimer = null;
        this.isRapidFire = false;
        // Guardar stats originales durante el power-up
        this.originalMaxShots = null;
        this.originalRechargeRate = null;
        this.rechargeInterval = null; // ✅ Para controlar el intervalo de recarga
        this.isFiringSuper = false; // Flag para saber si el super continuo está activo

        this.isTouchShooting = false; // ✅ Nuevo estado para el disparo táctil
        this.isTouchSuper = false; // ✅ Nuevo estado para el súper táctil

        // ✅ Control de cadencia de disparo para evitar saturación
        this.lastShotTime = 0;
        this.shotCooldown = 150; // ms. Cadencia base de disparo.

        // ✅ Pre-cálculo de valores de movimiento para optimización
        this.effectiveMaxSpeed = isMobile ? this.maxSpeed * 0.7 : this.maxSpeed;
        this.effectiveAcceleration = isMobile ? this.acceleration * 0.8 : this.acceleration;
        this.deceleration = isMobile ? 0.08 : 0.12;


        // ✅ Activamos los listeners del teclado al crear la nave
        this._addEventListeners();

        // ✅ Aplicamos las mejoras permanentes
        this._applyPermanentUpgrades(permanentUpgrades);
    }

    /**
     * Aplica las mejoras permanentes compradas por el jugador a las estadísticas de la nave.
     * @param {Object} upgrades - El objeto con las mejoras del jugador.
     */
    _applyPermanentUpgrades(upgrades) {
        // Construimos los IDs de mejora específicos para esta nave
        const maxShotsUpgradeId = `${this.shipType}_max_shots`;
        const maxSpeedUpgradeId = `${this.shipType}_max_speed`;
        const healthUpgradeId = `${this.shipType}_health`;

        if (upgrades[maxShotsUpgradeId]) {
            console.log("Applying upgrade: +2 Max Shots");
            this.maxShots += 2;
            this.availableShots = this.maxShots;
        }
        if (upgrades[maxSpeedUpgradeId]) {
            console.log("Applying upgrade: +1 Max Speed");
            this.maxSpeed += 1;
        }
        if (upgrades[healthUpgradeId]) {
            console.log("Applying upgrade: +1 Health");
            this.maxHealth += 1;
            this.health = this.maxHealth;
        }
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

        // ✅ Efecto de brillo constante para la nave dorada
        if (this.shipType === 'gold') {
            this.drawGoldGlow();
        }

        // ✅ Dibujar la imagen de la nave (spritesheet o especial)
        if (this.isSpecialImage) {
            // 🎨 Aplicamos el filtro de color directamente en el canvas
            this.ctx.drawImage(this.image, 
                this.position.x - this.image.width / 2, 
                this.position.y - this.image.height / 2, this.image.width, this.image.height);
            // 🎨 Reseteamos el filtro para no afectar a otros elementos
            this.ctx.filter = 'none';
        } else {
            this.image.draw(this.ctx, this.position);
        }


        // ✅ Optimización: Solo dibujar los propulsores si la estela es visible.
        if (this.imageEff.scale > 0) { // ✅ Lógica de estela invertida
            if (this.shipType === 'gold' || this.shipType === 'butterfly') {
                // Dibujamos los propulsores en la parte superior de la nave
                this.imageEff.draw(this.ctx, {x: this.position.x + 15, y: this.position.y + 35});
                this.imageEff.draw(this.ctx, {x: this.position.x - 15, y: this.position.y + 35});
            } else {
                // Dibujamos los propulsores en su posición normal
                this.imageEff.draw(this.ctx, {x: this.position.x + 15, y: this.position.y - 35});
                this.imageEff.draw(this.ctx, {x: this.position.x - 15, y: this.position.y - 35});
            }
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
        // ✅ Invertimos la dirección del joystick para las naves especiales
        if (this.shipType === 'gold' || this.shipType === 'butterfly') {
            this.angle = Math.atan2(-jDir.y, jDir.x) + Math.PI / 2;
        } else {
            this.angle = Math.atan2(jDir.y, -jDir.x) + Math.PI / 2;
        }
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
    const movementAngle = this.angle - Math.PI / -2;
    if (this.shipType === 'gold' || this.shipType === 'butterfly') { // ✅ Movimiento invertido
        this.position.x -= Math.cos(movementAngle) * this.speed;
        this.position.y -= Math.sin(movementAngle) * this.speed;
    } else {
        this.position.x += Math.cos(movementAngle) * this.speed;
        this.position.y += Math.sin(movementAngle) * this.speed;
    }
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

    drawGoldGlow() {
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, this.image.radio + 15, 0, Math.PI * 2);

        const pulse = Math.sin(Date.now() / 250) * 0.3 + 0.7; // Pulso más lento y sutil

        const gradient = this.ctx.createRadialGradient(this.position.x, this.position.y, this.image.radio, this.position.x, this.position.y, this.image.radio + 15);
        gradient.addColorStop(0, `rgba(0, 255, 255, ${0.05 * pulse})`);
        gradient.addColorStop(1, `rgba(0, 255, 255, ${0.4 * pulse})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = 'rgba(0, 255, 255, 0.7)';
        this.ctx.shadowBlur = 20;
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
         
        // Comprobamos si se debe disparar el super
        if (!this.keys.super || this.isTouchSuper) {
            this.shootSuper();
            // Si es táctil, lo reseteamos para que no se dispare en cada frame
            if (this.isTouchSuper) this.isTouchSuper = false;
        }

        // Gestionar la recarga del super
        if (this.isSuperRecharging && Date.now() > this.superRechargeEndTime) {
            this.isSuperRecharging = false;
            this.availableSuperCharges = this.maxSuperCharges;
            // Opcional: sonido de recarga completa
            // this.audioManager.playSound('powerup', 0.5);
        }

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

        // ⚡ Actualizar el HUD del Super
        if (this.hudSuper) {
            if (this.isSuperRecharging) {
                const remaining = Math.ceil((this.superRechargeEndTime - Date.now()) / 1000);
                this.hudSuper.textContent = `Super: CD ${remaining}s`;
            } else {
                this.hudSuper.textContent = `Super: ${'⚡'.repeat(this.availableSuperCharges)}`;
            }
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
        if (this.isFiringSuper || now - this.lastShotTime < this.shotCooldown) {
            return;
        }

        // Disparo por teclado: se activa cuando la tecla se presiona (shoot es false)
        if (!this.keys.shoot) {
            this.shoot(true); // Es un disparo de teclado
        } 
        // Disparo táctil: se activa si el botón está presionado
        else if (this.isTouchShooting) {
            this.shoot(false); // No es un disparo de teclado
        }
    }

    shoot(isKeyboardShot) {
        // La condición para disparar es tener munición o el power-up activo. El cooldown ya se ha comprobado antes.
        const canShoot = this.isRapidFire || (!this.blocked && this.availableShots > 0);

        if (canShoot) {
            this.lastShotTime = Date.now(); // Actualizamos el tiempo del último disparo

            if (isKeyboardShot) this.keys.shoot = true; // Bloquea el disparo de teclado hasta soltar la tecla

            this.audioManager.playSound('shoot', 1.0);

            // Lógica de disparo unificada según el tipo de nave
            switch (this.shotType) {
                case 'super': {
                    // Esta lógica se ha movido a shootSuper, pero la dejamos por si otra nave la usa
                    if (typeof window.createSuperBeam === 'function') {
                        window.createSuperBeam({ ...this.position });
                    }
                    break;
                }
                case 'single_fast': {
                    const p = this.projectilePool.get();
                    if (p) {
                        p.init({ ...this.position }, this.angle);
                        p.speed = 22;
                        this.projectiles.push(p);
                    }
                    break;
                }

                case 'spread': {
                    const spreadAngle = 0.25; // Ángulo de dispersión en radianes
                    this.fireProjectile({ ...this.position }, this.angle);
                    this.fireProjectile({ ...this.position }, this.angle - spreadAngle);
                    this.fireProjectile({ ...this.position }, this.angle + spreadAngle);
                    break;
                }

                case 'spread_fast': { // Disparo de la nave dorada
                    const spreadAngle = 0.2;
                    this.fireProjectile({ ...this.position }, this.angle, 18);
                    this.fireProjectile({ ...this.position }, this.angle - spreadAngle, 18);
                    this.fireProjectile({ ...this.position }, this.angle + spreadAngle, 18);
                    this.shotCooldown = 200; // Cadencia más alta
                    break;
                }

                case 'butterfly_double': {
                    // Disparo doble con efecto de partículas
                    this.fireProjectile({ x: this.position.x + Math.cos(this.angle) * 14, y: this.position.y + Math.sin(this.angle) * 14 }, this.angle);
                    this.fireProjectile({ x: this.position.x - Math.cos(this.angle) * 14, y: this.position.y - Math.sin(this.angle) * 14 }, this.angle);
                    // Efecto visual de partículas
                    if (typeof window.createParticleBurst === 'function') window.createParticleBurst(this.position, '#ff69b4', 5, 2);
                    break;
                }
                case 'double':
                default: {
                    // Disparo doble estándar
                    this.fireProjectile({ x: this.position.x + Math.cos(this.angle) * 14, y: this.position.y + Math.sin(this.angle) * 14 }, this.angle);
                    this.fireProjectile({ x: this.position.x - Math.cos(this.angle) * 14, y: this.position.y - Math.sin(this.angle) * 14 }, this.angle);
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

    /**
     * Método auxiliar para crear y añadir un proyectil.
     * @param {{x: number, y: number}} position La posición de inicio.
     * @param {number} angle El ángulo de disparo.
     * @param {number} [speed=15] La velocidad del proyectil.
     */
    fireProjectile(position, angle, speed = 15) {
        const p = this.projectilePool.get();
        if (!p) return;
        p.init(position, angle, false, this.shipType === 'gold' || this.shipType === 'butterfly'); // ✅ Pasamos el flag si es nave invertida
        p.speed = speed;
        this.projectiles.push(p);
    }

    shootSuper() {
        const now = Date.now();
        // Comprobaciones generales para cualquier tipo de super
        if (this.isSuperRecharging || this.availableSuperCharges <= 0 || this.isFiringSuper) {
            this.keys.super = true; // Bloqueamos para evitar reintentos en cada frame
            return;
        }

        let superFired = false;

        // Lógica para el super de la nave azul (cruz)
        if (this.superAbilityType === 'super' && now - this.lastShotTime > this.superShotCooldown) {
            if (typeof window.createSuperBeam === 'function') {
                window.createSuperBeam({ ...this.position });
                this.audioManager.playSound('super_beam', 1.0);
                superFired = true;
            }
        }
        // Lógica para el super de la nave verde (rayo continuo)
        else if (this.superAbilityType === 'continuous_beam') {
            if (typeof window.createContinuousBeam === 'function') {
                window.createContinuousBeam(this); // Pasamos la instancia de la nave
                this.isFiringSuper = true; // Marcamos que el super está activo
                this.audioManager.playSound('super_beam', 0.8);
                superFired = true;
            }
        }
        // Lógica para el super de la nave roja (escudo destructivo)
        else if (this.superAbilityType === 'destructive_shield') {
            if (typeof window.createDestructiveShield === 'function') {
                window.createDestructiveShield(this);
                this.isFiringSuper = true;
                this.audioManager.playSound('super_beam', 0.7); // Sonido de activación
                superFired = true;
            }
        }
        // Lógica para el super de la nave dorada (agujero negro)
        else if (this.superAbilityType === 'black_hole') {
            if (typeof window.createBlackHole === 'function') {
                window.createBlackHole(this, window.currentBoss); // Pasamos la nave y el jefe actual (si existe)
                this.isFiringSuper = true;
                // this.audioManager.playSound('black_hole_sound', 0.8); // Sonido de activación
                superFired = true;
            }
        }
        // Lógica para el super de la nave mariposa (tornado de rayos)
        else if (this.superAbilityType === 'tornado_beam') {
            if (typeof window.createTornadoBeam === 'function') {
                window.createTornadoBeam(this); // ✅ Pasamos la instancia completa de la nave
                this.isFiringSuper = true;
                // this.audioManager.playSound('tornado_sound', 0.8); // Sonido opcional
                superFired = true;
            }
        }

        if (superFired) {
            this.availableSuperCharges--;
            this.lastShotTime = now;
            if (this.availableSuperCharges === 0) {
                this.isSuperRecharging = true;
                this.superRechargeEndTime = now + this.superRechargeDuration;
            }
        }

        // Bloqueamos hasta que se suelte la tecla para evitar múltiples disparos
        this.keys.super = true;
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
                console.log(`%c[DEBUG] Limpiando intervalo de recarga activo por Power-Up: ${this.rechargeInterval}`, 'color: orange;');
                clearInterval(this.rechargeInterval);
                this.rechargeInterval = null;
                this.recharging = false;
            }
            // ✅ Nos aseguramos de que el estado de recarga se reinicie
            this.recharging = false;


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

                // ✅ Si la munición no está llena, reiniciamos la recarga normal.
                if (this.availableShots < this.maxShots) this.startRecharge();
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
                case ' ': 
                case 'q':
                case 'arrowup':
                    this.keys.shoot = false; break;
                case 's': 
                case 'arrowdown':
                    this.keys.super = false; break; // Tecla para el super
            }
        };

        this.keyupHandler = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'a' || key === 'd' || key === 'w') {
                this.keys[e.key.toUpperCase()] = false;
            } else if (key === 'q' || key === 'arrowup' || key === ' ') { // ✅ ' ' es el valor correcto
                this.keys.shoot = true;
            } else if (key === 's' || key === 'arrowdown') {
                this.keys.super = true;
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