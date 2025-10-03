import {Ship} from "./ship.js";    
import {Asteroid} from "./asteroid.js";
import { Label } from "./label.js";
import { Enemy } from "./enemy.js";
import { Star } from "./star.js";
import { Explosion } from "./explosion.js";
import { Boss } from "./boss.js"; 
import { PowerUp } from "./powerUp.js";
import { Projectile } from "./projectile.js";
import { Particle } from "./particle.js";
import { AudioManager } from "./AudioManager.js";
import { Constelation } from "./constelation.js";
import { Nebula } from "./nebula.js";

import { ProjectilePool } from "./ProjectilePool.js";
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ✅ Canvas para pre-renderizar el fondo
const backgroundCanvas = document.getElementById('background-canvas');
const backgroundCtx = backgroundCanvas.getContext('2d');

const spritesheet = document.getElementById('spritesheet');
const font = window.getComputedStyle(document.body).fontFamily;
const fontWeight = window.getComputedStyle(document.body).fontWeight;
const menu = document.querySelector('.menu');
const score = document.querySelector('.score');
const rewardButton = document.getElementById('reward-button');
const muteButton = document.getElementById('mute-button');
const btnMenu = document.querySelector('.play-game');
const loadingScreen = document.getElementById('loading-screen');
const shipSelectionMenu = document.querySelector('.ship-selection-menu');
const hangarButton = document.querySelector('.hangar-button');
const shipOptions = document.querySelectorAll('.ship-option');

const muteIcon = muteButton ? muteButton.querySelector('ion-icon') : null;

const highScoreElement = document.querySelector('.high-score');

// 📱 Hacer el canvas responsivo para móviles
function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isMobile = windowWidth <= 768 || windowHeight <= 768;
    
    // En móviles, usar toda la pantalla
    if (isMobile) {
        canvas.width = windowWidth;
        canvas.height = windowHeight;
    } else {
        // En desktop, usar tamaño más grande
        canvas.width = 1000;
        canvas.height = 600;
    }

    // ✅ Sincronizamos el tamaño del canvas de fondo
    backgroundCanvas.width = canvas.width;
    backgroundCanvas.height = canvas.height;
    
    // Ajustar el estilo CSS del canvas
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

}

// Llamar la función al cargar, cuando cambie el tamaño y cuando cambie la orientación
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    // Esperar un poco para que la orientación se aplique completamente
    setTimeout(resizeCanvas, 100);
});
let hitBox = false;
let menuStatus = true
let play = false
let hasBonus = false; // Flag for the rewarded ad bonus
let isPausedByVisibility = false; // State to pause when tab is not visible
let isAdPlaying = false; // State to track if an ad is currently playing
let wasMutedBeforeAd = false; // Saves the mute state before an ad
let lastAdTime = 0;
const adCooldown = 120000; // 2 minutos en milisegundos

// --- Variables de Dificultad Progresiva ---
let currentDifficultyLevel = 0;
const difficultyThresholds = [100, 299, 600, 1000, 1500, 2000, 2500, 3000, 4000, 5000]; // Puntos para aumentar dificultad

// Valores iniciales de dificultad
let currentAsteroidSpawnInterval = 500; // ms
let currentEnemySpawnInterval = 7000; // ms
let currentEnemySpeed = 2;
let currentAsteroidMinSpeed = 2;
let currentAsteroidMaxSpeed = 3;

// --- Probabilidades de Power-ups ---
const POWERUP_CHANCE_FROM_ENEMY = 0.5; // 50%
const POWERUP_CHANCE_FROM_ASTEROID = 0.25; // 25%


let lastAsteroidSpawnTime = 0;
let lastEnemySpawnTime = 0;

// --- Variables del Jefe (Boss) ---
let boss = null;
let bossActive = false;
const bossSpawnThresholds = [300, 1000, 1800, 2600]; // Puntuaciones para que aparezca el jefe
let currentBossLevel = 0; // Nivel actual del jefe (0, 1, 2, ...)

let scoreCount = 0;
let selectedShipType = 'blue'; // Nave por defecto

// ✅ Creamos las piscinas de proyectiles
const playerProjectilePool = new ProjectilePool(30, ctx, spritesheet); // Piscina para el jugador
const enemyProjectilePool = new ProjectilePool(50, ctx, spritesheet);  // Piscina para enemigos (más grande)

const audioManager = new AudioManager();
// ✅ Pasamos la piscina de proyectiles a la nave
let ship = new Ship(ctx, spritesheet, canvas, audioManager, playerProjectilePool, selectedShipType);

const asteroids = [];
const labels = [];
const enemies = [];
const projectilesEnemy = []; // ✅ Este array ahora contendrá los proyectiles enemigos ACTIVOS
const explosions = [];
const powerUps = [];
const particles = [];
const stars = [];
const nebulas = [];
let constellation; // ✅ Variable para nuestra constelación
let highScore = 0;
let asteroidInterval = null;
let enemyInterval = null;

// ✅ Variables para la optimización del fondo
let backgroundNeedsRedraw = true; // Flag para saber si redibujar el fondo
let lastBackgroundRedraw = 0;
const backgroundRedrawInterval = 50; // Redibujar el fondo cada 50ms (20 FPS) es suficiente para elementos lentos

// --- COMMON SDK SOLUTIONS & BROWSER FIXES ---

// Disable unwanted page scroll on mouse wheel.
window.addEventListener("wheel", (event) => event.preventDefault(), {
    passive: false,
});

// Disable unwanted key events (scrolling with arrows/space).
window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", " "].includes(event.key)) {
        event.preventDefault();
    }
});

// Disable context menu on right-click.
// document.addEventListener("contextmenu", (event) => event.preventDefault());

// Pause game when tab is not visible
document.addEventListener("visibilitychange", () => {
    isPausedByVisibility = document.visibilityState === "hidden";
    console.log(`Game ${isPausedByVisibility ? 'paused' : 'resumed'} due to visibility change.`);
});

// --- END OF FIXES ---

let crazySDK = null;

// Función para inicializar el SDK de CrazyGames
async function initCrazyGamesSDK() {
    try {
        if (window.CrazyGames && window.CrazyGames.SDK) {
            await window.CrazyGames.SDK.init();
            crazySDK = window.CrazyGames.SDK;
            console.log("✅ CrazyGames SDK initialized.");

            // Sincronizar el estado de volumen inicial del SDK
            setGameVolume(crazySDK.audio.getVolume());

            // Listen for the site's mute button from CrazyGames
            crazySDK.addEventListener("mute", () => {
                console.log("Mute event received from SDK.");
                setGameVolume(0);
            });

            crazySDK.addEventListener("unmute", () => {
                console.log("Unmute event received from SDK.");
                setGameVolume(1);
            });
        }
    } catch (error) {
        console.warn("⚠️ SDK de CrazyGames no se pudo inicializar. Los anuncios y guardado en la nube no funcionarán.", error);
    }
    }

// Función centralizada para controlar el volumen
function setGameVolume(volume) {
    audioManager.volume = volume;
    if (muteIcon) {
        muteIcon.name = volume === 0 ? 'volume-mute-outline' : 'volume-high-outline';
    }
}


// Function to display username if logged in
function displayUsername() {
    if (!crazySDK || !crazySDK.user || !crazySDK.user.isUserAccountAvailable) {
        return;
    }

    try {
        const username = crazySDK.user.username;
        if (username) {
            console.log(`User logged in: ${username}`);
            const userInfoContainer = document.getElementById('user-info');
            const usernameDisplay = document.getElementById('username-display');
            if (userInfoContainer && usernameDisplay) {
                usernameDisplay.textContent = username;
                userInfoContainer.style.display = 'block'; // Hacerlo visible
            }
        }
    } catch (e) {
        console.warn("An error occurred while trying to get the username.", e);
    }
}
async function loadAssets() {
    // ✅ Usamos Promise.all para cargar todos los sonidos en paralelo y esperar a que terminen.
    await Promise.all([
        audioManager.loadSound('explosion', 'explosion-312361.mp3'),
        audioManager.loadSound('shoot', 'space-battle-sounds-br-95277-VEED.mp3')
    ]);
}

async function loadHighScore() {
    try {
        if (crazySDK && crazySDK.data && typeof crazySDK.data.getItem === 'function') {
            // getItem puede devolver Promise o valor sincrónico
            const savedScore = await crazySDK.data.getItem("high-score");
            highScore = savedScore ? Number(savedScore) : 0;
        } else {
            highScore = Number(localStorage.getItem("high-score")) || 0;
        }
    } catch (e) {
        console.warn('Error reading high score (falling back to localStorage):', e);
        highScore = Number(localStorage.getItem("high-score")) || 0;
    }
    highScoreElement.innerHTML = `${highScore}`;
}

// 📱 Crear joystick responsivo
function createResponsiveJoystick() {
    const isMobile = window.innerWidth <= 768;
    const isLandscape = window.innerHeight < window.innerWidth;
    
    // Ajustar tamaño según orientación
    let joystickSize;
    let catchDistance;
    
    if (isMobile && isLandscape) {
        // Móvil horizontal: joystick más pequeño pero área de detección amplia
        joystickSize = 90;
        catchDistance = 200;
    } else if (isMobile) {
        // Móvil vertical: joystick normal
        joystickSize = 80;
        catchDistance = 150;
    } else {
        // Desktop: joystick grande
        joystickSize = 120;
        catchDistance = 200;
    }
    
    return nipplejs.create({
        zone: document.getElementById('joystick-zone'),
        mode: 'semi',                              // 🎯 Cambiado a semi para que siga el dedo
        color: 'white',
        size: joystickSize,
        multitouch: true,
        maxNumberOfNipples: 1,
        dataOnly: false,
        threshold: 0.05,                          // Threshold más sensible
        fadeTime: 150,                           // Desaparece más rápido
        restJoystick: true,
        restOpacity: 0.6,
        catchDistance: catchDistance
    });
}

const joystick = createResponsiveJoystick();

// Variables para dirección e intensidad (globales para acceso desde ship.js)
window.joystickDirection = { x: 0, y: 0 };
window.joystickIntensity = 0;

// Evento: cuando el joystick se mueve
joystick.on('move', (evt, data) => {
    if (data && data.vector) {
        window.joystickDirection.x = data.vector.x;
        window.joystickDirection.y = data.vector.y;
        window.joystickIntensity = data.distance / 50; // Normalizamos la intensidad
        if (window.joystickIntensity > 1) window.joystickIntensity = 1;
    }
});

// Evento: cuando sueltas el joystick
joystick.on('end', () => {
    window.joystickDirection = { x: 0, y: 0 };
    window.joystickIntensity = 0;
});

// 🎯 Eventos adicionales para joystick semi-dinámico
joystick.on('added', (evt, nipple) => {
    // Cuando aparece el joystick
});

joystick.on('removed', (evt, nipple) => {
    // Cuando desaparece el joystick
    window.joystickDirection = { x: 0, y: 0 };
    window.joystickIntensity = 0;
});

// 🔫 Botón de disparo para móviles
const shootButton = document.querySelector('.button');

if (shootButton) {
    const startShooting = (e) => {
        if (e) e.preventDefault(); // Prevenir gestos del navegador
        audioManager.unlockAudio(); // Desbloquea el audio en la primera interacción táctil
        if (!ship || !play) return;
        
        // Le decimos a la nave que el botón está presionado
        ship.isTouchShooting = true;
    };

    const stopShooting = () => {
        if (!ship) return;
        // Le decimos a la nave que el botón se ha soltado
        ship.isTouchShooting = false;
    };

    // Eventos para iniciar el disparo
    shootButton.addEventListener('mousedown', startShooting);
    shootButton.addEventListener('touchstart', startShooting);

    // Eventos para detener el disparo
    shootButton.addEventListener('mouseup', stopShooting);
    shootButton.addEventListener('mouseleave', stopShooting);
    shootButton.addEventListener('touchend', stopShooting);
}

if (muteButton) {
    muteButton.addEventListener('click', () => {
        const newVolume = audioManager.volume === 0 ? 1 : 0;
        setGameVolume(newVolume);
        // Notificar al SDK sobre el cambio de volumen hecho por el usuario
        if (crazySDK && crazySDK.audio) {
            crazySDK.audio.setVolume(newVolume);
        }
    });
}
async function gameOver() {
    play = false;
    if (crazySDK && crazySDK.game && typeof crazySDK.game.gameplayStop === 'function') {
        try { crazySDK.game.gameplayStop(); } catch(e) { console.warn(e); }
    }

    // Creamos una explosión en la posición de la nave y la ocultamos
    explosions.push(new Explosion(ctx, spritesheet, ship.position, 1.5));
    audioManager.playSound('explosion', 1.0); // Toca el sonido de explosión
    ship.position = {x: -1000, y: -1000};

    // Muestra un anuncio "midgame" si ha pasado suficiente tiempo
    const now = Date.now();
    if (crazySDK && now - lastAdTime > adCooldown) {
        // try {
        //     // await crazySDK.ad.requestAd("midgame");
        //      lastAdTime = now; // Actualiza el tiempo solo si el anuncio se mostró
        // } catch (e) {
        //     console.error("Ad error:", e);
        //     // Si el anuncio falla, no bloqueamos al jugador y continuamos al menú.
        // }
    }

    // Después del anuncio (o si falla/se omite), muestra el menú
    menu.style.display = 'flex';
    menuStatus = true;

    // Restaura el botón de recompensa para la siguiente sesión
    hasBonus = false; // Asegurarse de que el bonus se reinicie
    const rewardAdButton = document.getElementById('reward-button');
    if (rewardAdButton) {
        // Restauramos el contenido HTML original del botón
        rewardAdButton.innerHTML = `
            <ion-icon name="gift-outline"></ion-icon>
            <span class="ad-text">Get Bonus Shots</span>
        `;
        // Restauramos los estilos para que sea clickeable de nuevo
        rewardAdButton.style.pointerEvents = 'auto';
        rewardAdButton.style.border = ''; // O el borde original si lo tenía
    }

    // showBanner(); // Show banner in the Game Over menu
}

/**
 * Solicita y muestra un banner publicitario responsivo.
 * Se encarga de hacer visible el contenedor del banner y pedir al SDK de CrazyGames
 * que llene el 'slot' designado con un anuncio.
 */
async function showBanner() {
    // --- Banner deshabilitado ---
    // if (!crazySDK) {
    //     console.warn('CrazySDK no disponible, no se pide banner.');
    //     return;
    // }
    // // Hacemos visible el contenedor principal del banner.
    // const container = document.getElementById('banner-container');
    // if (container) {
    //     container.style.display = 'flex';
    // }

    // // El ID del elemento HTML donde se inyectará el banner.
    // const slotId = 'banner-slot';
    // const slot = document.getElementById(slotId);
    // if (!slot) {
    //     console.warn('No existe el slot de banner:', slotId);
    //     return;
    // }

    // // Solicitamos un banner al SDK. Este se adaptará al tamaño del slot.
    // try {
    //     console.log('Requesting banner into slot:', slotId);
    //     await crazySDK.banner.requestResponsiveBanner(slotId);
    //     console.log('Banner mostrado correctamente.');
    // } catch (err) {
    //     console.error('No se pudo mostrar banner:', err);
    // }
}

/**
 * Oculta el contenedor del banner y le pide al SDK que lo limpie.
 * Es importante llamar a clearBanner para liberar recursos.
 */
async function hideBanner() {
    // --- Banner deshabilitado ---
    // const container = document.getElementById('banner-container');
    // if (container) container.style.display = 'none';
    // if (!crazySDK || !crazySDK.banner) return;
    // try {
    //     await crazySDK.banner.clearBanner();
    //     console.log('Banner ocultado/limpiado.');
    // } catch (e) {
    //     console.warn('Error al ocultar banner:', e);
    // }
}
function init() {

    if (crazySDK && crazySDK.game && typeof crazySDK.game.gameplayStart === 'function') {
        try { crazySDK.game.gameplayStart(); } catch(e) { console.warn(e); }
    }

    score.innerHTML = 0;
    scoreCount = 0;


    // Reiniciamos todos los arrays principales
    asteroids.length = 0;
    labels.length = 0;
    enemies.length = 0;
    projectilesEnemy.length = 0;
    explosions.length = 0;
    powerUps.length = 0;
    particles.length = 0;

    // Si ya existe una nave de una partida anterior, limpiamos sus listeners
    if (ship) {
        ship.destroy();
    }

    // Creamos una nueva instancia de la nave y ella misma se encargará de sus eventos
    // ✅ Pasamos la piscina de proyectiles al crear la nueva nave
    ship = new Ship(ctx, spritesheet, canvas, audioManager, playerProjectilePool, selectedShipType);
    ship.projectiles.length = 0;
    ship.speed = 0;
    ship.angle = 0;

    // Apply bonus if active
    if (hasBonus) {
        ship.maxShots = ship.config.bonusMaxShots; // Usamos el valor de bono de la nave
        hasBonus = false; // Use the bonus only once
    } // Si no hay bono, la nave ya se inicializó con sus maxShots por defecto

    // Reset shot limiter and block
    ship.availableShots = ship.maxShots;  // Restore all available shots
    ship.blocked = false;                 // Unblock shooting
    ship.recharging = false;              // Stop automatic recharge    
    // 🔹 Limpiar el temporizador de bloqueo para evitar que se quede activo entre partidas
    // Reiniciar estados de power-ups
    ship.isShielded = false;
    if (ship.shieldTimer) clearTimeout(ship.shieldTimer);
    if (ship.invincibilityTimer) clearTimeout(ship.invincibilityTimer);
    ship.isRapidFire = false;
    if (ship.rapidFireTimer) clearTimeout(ship.rapidFireTimer);

    // ➕ Actualizar el HUD de vida al iniciar
    const healthDisplay = document.getElementById('health-display');
    if (healthDisplay) {
        healthDisplay.textContent = '❤️'.repeat(ship.health);
    }

    // Reiniciar variables del jefe
    boss = null;
    bossActive = false; // ✅ Reinicia el estado del jefe para la nueva partida
    currentBossLevel = 0;

    if (ship.cooldownTimer) {
        clearInterval(ship.cooldownTimer);
        ship.cooldownTimer = null;
    }

    // Clear previous intervals to avoid duplicates
    // Eliminamos los setInterval ya que ahora gestionaremos el spawn en el bucle update
    // if (asteroidInterval) clearInterval(asteroidInterval);
    // if (enemyInterval) clearInterval(enemyInterval);

    // Reiniciar variables de dificultad
    currentDifficultyLevel = 0;
    currentAsteroidSpawnInterval = 500;
    currentEnemySpawnInterval = 7000;
    currentEnemySpeed = 2;
    currentAsteroidMinSpeed = 2;
    currentAsteroidMaxSpeed = 3;
    // if (asteroidInterval) clearInterval(asteroidInterval); // Ya no se usan, se pueden eliminar
    // if (enemyInterval) clearInterval(enemyInterval); // Ya no se usan, se pueden eliminar

    lastAsteroidSpawnTime = Date.now(); // Inicializar tiempos de spawn
    lastEnemySpawnTime = Date.now();
    menu.style.display = 'none';
    menuStatus = false;
    play = true;

    // hideBanner(); // Hide the banner when the game starts
}

// --- Manejo de eventos del menú con delegación ---
if (menu) {
    menu.addEventListener('click', async (e) => {
        const playButton = e.target.closest('.play-game');
        const rewardAdButton = e.target.closest('#reward-button');
        const hangarBtn = e.target.closest('.hangar-button');

        if (playButton) {
            audioManager.unlockAudio(); // Desbloquea el audio

            // Solicitar login de usuario antes de empezar a jugar
            if (crazySDK && crazySDK.user && !crazySDK.user.isUserAccountAvailable) {
                crazySDK.user.requestUserAccount().catch(err => console.warn("Login popup closed or failed", err));
            }

            init(); // Inicia el juego
            return;
        }

        if (hangarBtn) {
            menu.style.display = 'none';
            shipSelectionMenu.style.display = 'flex';
            updateSelectedShipVisual();
        }

        if (rewardAdButton) {
            if (!crazySDK) {
                alert("CrazyGames SDK not available.");
                return;
            }
            try {
                // Solicitar un anuncio con recompensa
                // await crazySDK.ad.requestAd("rewarded");
                hasBonus = true;
                
                // Reemplazamos el contenido del botón para mostrar el mensaje de éxito,
                // sin afectar a los otros elementos del menú.
                rewardAdButton.innerHTML = `<p id="bonus-message" style="color: #00ff88;">Bonus activated!</p>`;
                rewardAdButton.style.pointerEvents = 'none'; // Desactivamos clics futuros
                rewardAdButton.style.border = '1px solid #00ff88'; // Feedback visual
            } catch (err) {
                console.error("Rewarded ad error:", err);
                const adText = rewardAdButton.querySelector('.ad-text');
                if (adText) {
                    adText.textContent = "Ad not ready. Try again!";
                    setTimeout(() => { adText.textContent = "Get Bonus Shots!"; }, 2000);
                }
            }
        }
    });
}

// --- Lógica para el menú de selección de nave ---
shipOptions.forEach(option => {
    option.addEventListener('click', () => {
        selectedShipType = option.getAttribute('data-ship-type');
        console.log(`Nave seleccionada: ${selectedShipType}`);
        updateSelectedShipVisual();
        // ✅ Volver al menú principal automáticamente
        shipSelectionMenu.style.display = 'none';
        menu.style.display = 'flex';
    });
});

function updateSelectedShipVisual() {
    shipOptions.forEach(opt => opt.classList.remove('selected'));
    document.querySelector(`.ship-option[data-ship-type="${selectedShipType}"]`).classList.add('selected');
}

function createStars() {
    
    for (let i = 0; i < 10; i++) {
        let star = new Star(ctx, canvas, { x: Math.random() * (canvas.width), y: Math.random() * (canvas.height) }, Math.random() * (1.5 - 1) + 1, 1);
        stars.push(star);
    }
    for (let i = 0; i < 70; i++) {
        let star = new Star(ctx, canvas, { x: Math.random() * (canvas.width), y: Math.random() * (canvas.height) }, Math.random() * (2 - 1.5) + 1.5, 2);
        stars.push(star);
    }
}

// Funciones para generar un solo asteroide/enemigo, usadas en el bucle update
function spawnSingleAsteroid() {
    let type = Math.floor(Math.random() * (2)) + 1;
    let asteroid = new Asteroid(ctx, spritesheet, {x:0,y:0}, type, currentAsteroidMinSpeed, currentAsteroidMaxSpeed);
    asteroid.generatePosition(canvas);
    asteroids.push(asteroid);
    setTimeout(() => {
        asteroid.death = true;
    }, 5000);
}

function spawnSingleEnemy() {
    // ✅ 30% de probabilidad de que sea un 'vigilante', 70% un 'chaser'
    const enemyType = Math.random() < 0.3 ? 'vigilante' : 'chaser';
    const speed = enemyType === 'vigilante' ? currentEnemySpeed * 0.8 : currentEnemySpeed;
    let enemy = new Enemy(ctx, spritesheet, canvas, ship, enemyType, speed);
    enemy.generatePosition(canvas);
    enemies.push(enemy);
    setTimeout(() => {
        enemy.death = true;
    }, 7000); // El tiempo de vida del enemigo puede ser más largo
}

function spawnBoss() {
    if (bossActive) return; // No generar si ya está activo

    console.log(`¡Aparece el JEFE de nivel ${currentBossLevel}!`);
    bossActive = true;
    // ✅ Pasamos la piscina de proyectiles al jefe
    boss = new Boss(ctx, spritesheet, canvas, ship, enemyProjectilePool, currentBossLevel);

    // Limpiar enemigos y asteroides existentes para enfocar la batalla
    asteroids.length = 0;
    enemies.length = 0;

    // Podrías tocar una música de jefe aquí
}
function collision(Object1, Object2) {
    // ✅ Comprobación de seguridad: si alguno de los objetos no es válido, no hay colisión.
    if (!Object1 || !Object2 || !Object1.position || !Object2.position || !Object1.image || !Object2.image) {
        return false;
    }

    const v1 = Object1.position;
    const v2 = Object2.position;
    let v3 = {
        x: v1.x - v2.x,
        y: v1.y - v2.y
    };

    let distance = Math.sqrt(v3.x * v3.x + v3.y * v3.y);

    return distance < Object1.image.radio + Object2.image.radio;
}

function spawnPowerUp(position) {
    // Aumentamos la probabilidad: 35% vida extra, 35% escudo, 30% disparo rápido
    const rand = Math.random();
    let type;
    if (rand < 0.36) { // 36% de probabilidad
        type = 'extraLife';
    } else if (rand < 0.70) { // 35% de probabilidad
        type = 'shield';
    } else { // 30% de probabilidad
        type = 'rapidFire';
    }

    const powerUp = new PowerUp(ctx, spritesheet, { ...position }, type);
    powerUps.push(powerUp);
}
// ✅ Función movida al scope global para que sea accesible desde cualquier parte.
function createParticleBurst(position, color, count = 25) {
    for (let i = 0; i < count; i++) {
        // Añadimos partículas con un poco de aleatoriedad en tamaño y velocidad
        particles.push(new Particle(ctx, position.x, position.y, color, 4, 5));
    }
}
function createMeteors(position) {

     let count = Math.floor(Math.random() * (5 - 3 + 1)) + 3;
     for (let i = 0; i < count; i++) {
         let meteor = new Asteroid(ctx, spritesheet, position, 3);
         meteor.death = true; 
         asteroids.push(meteor);

     }
}

function collisionObjects() {
    // Colisión de la nave con asteroides y enemigos
    const collidableObjects = [...asteroids, ...enemies, ...projectilesEnemy];
    if (bossActive && boss) collidableObjects.push(boss);

    for (let i = collidableObjects.length - 1; i >= 0; i--) {
        const object = collidableObjects[i];
        if (collision(ship, object)) {
            if (ship.isShielded) {
                // Si el escudo está activo, destruimos el objeto pero la nave está a salvo
                explosions.push(new Explosion(ctx, spritesheet, object.position, 1.0));
                audioManager.playSound('explosion', 0.5);

                // Eliminar el objeto del array correspondiente
                if (object instanceof Asteroid) {
                    const index = asteroids.indexOf(object);
                    if (index > -1) asteroids.splice(index, 1);
                } else if (object instanceof Enemy) {
                    const index = enemies.indexOf(object);
                    if (index > -1) enemies.splice(index, 1);
                } else if (object instanceof Projectile) {
                    const index = projectilesEnemy.indexOf(object);
                    if (index > -1) {
                        projectilesEnemy[index].active = false; // ✅ Devolvemos a la piscina
                        projectilesEnemy.splice(index, 1);
                    }
                }
                // No hacemos 'return' para que el escudo pueda destruir múltiples objetos en un frame
            } else {
                // Si no hay escudo, fin del juego
                ship.takeDamage();
                audioManager.playSound('explosion', 0.7); // Sonido de golpe

                // Crear una pequeña explosión en la posición de la nave para feedback visual
                explosions.push(new Explosion(ctx, spritesheet, { ...ship.position }, 0.8));

                // Eliminar el objeto con el que chocó
                if (object instanceof Asteroid) asteroids.splice(asteroids.indexOf(object), 1);
                else if (object instanceof Enemy) enemies.splice(enemies.indexOf(object), 1);
                else if (object instanceof Projectile) {
                    object.active = false; // ✅ Devolvemos a la piscina
                    projectilesEnemy.splice(projectilesEnemy.indexOf(object), 1);
                }

                // Comprobar si la vida ha llegado a 0
                if (ship.health <= 0) {
                    gameOver();
                    return; // Salimos de la función para evitar más procesado
                }
                // Si la nave sobrevive al golpe, no hacemos 'return' y seguimos el bucle
            }
        }
    }

    // Colisión de la nave con power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (collision(ship, powerUps[i])) {
            const powerUp = powerUps[i];
            ship.activatePowerUp(powerUp.type);

            // ➕ Añadir etiqueta de texto para la vida extra
            if (powerUp.type === 'extraLife') {
                labels.push(new Label(ctx, { ...powerUp.position }, '+1 Life', '#00ff88', font, fontWeight));
            }

            // ✅ Generamos el efecto de partículas al recoger el power-up
            const particleColor = powerUp.type === 'shield' ? '#00ccff' : (powerUp.type === 'rapidFire' ? '#ffdd00' : '#00ff88');
            createParticleBurst(powerUp.position, particleColor);

            powerUps.splice(i, 1);
        }
    }

    // Colisiones de proyectiles enemigos
    for (let i = projectilesEnemy.length - 1; i >= 0; i--) {
        let projectileDestroyed = false;

        // Con asteroides
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (collision(projectilesEnemy[i], asteroids[j])) {
                explosions.push(new Explosion(ctx, spritesheet, asteroids[j].position, asteroids[j].scale * 2.5));
                audioManager.playSound('explosion', 0.6);
                asteroids.splice(j, 1);
                projectilesEnemy[i].active = false; // ✅ Devolvemos a la piscina
                projectilesEnemy.splice(i, 1); // Lo quitamos de la lista de activos
                projectileDestroyed = true;
                break;
            }
        }

        if (projectileDestroyed) continue; // Si ya chocó con un asteroide, no seguir

        // Con proyectiles del jugador
        for (let k = ship.projectiles.length - 1; k >= 0; k--) {
            if (collision(projectilesEnemy[i], ship.projectiles[k])) {
                // Crear una pequeña explosión en el punto de colisión
                explosions.push(new Explosion(ctx, spritesheet, projectilesEnemy[i].position, 0.4));
                projectilesEnemy[i].active = false; // ✅ Devolvemos a la piscina
                projectilesEnemy.splice(i, 1); // Lo quitamos de la lista de activos
                ship.projectiles[k].active = false; // ✅ Devolvemos el proyectil del jugador también
                ship.projectiles.splice(k, 1);
                break; // Salir, ya que el proyectil enemigo fue destruido
            }
        }
    }

    // Colisiones con el Jefe
    if (bossActive && boss) {
        // Proyectiles del jugador contra el jefe
        for (let i = ship.projectiles.length - 1; i >= 0; i--) {
            if (collision(ship.projectiles[i], boss)) {
                boss.takeDamage(1);
                explosions.push(new Explosion(ctx, spritesheet, ship.projectiles[i].position, 0.5));
                ship.projectiles[i].active = false; // ✅ Devolvemos a la piscina
                ship.projectiles.splice(i, 1); // Lo quitamos de la lista de activos

                let text = new Label(ctx, { ...boss.position }, '-1 HP', '#ff4444', font, fontWeight);
                labels.push(text);

                if (boss.currentHealth <= 0) {
                    defeatBoss();
                }
            }
        }
    }

    // Colisiones de proyectiles del jugador
    for (let i = ship.projectiles.length - 1; i >= 0; i--) {
        let projectileDestroyed = false;

        // Con enemigos
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (collision(ship.projectiles[i], enemies[j])) {
                labels.push(new Label(ctx, { ...enemies[j].position }, '+60 Score', '#00ff00', font, fontWeight));
                scoreCount += 60;

                // Probabilidad de soltar un power-up
                if (Math.random() < POWERUP_CHANCE_FROM_ENEMY) {
                    spawnPowerUp(enemies[j].position);
                }

                explosions.push(new Explosion(ctx, spritesheet, enemies[j].position, 1.2));
                audioManager.playSound('explosion', 0.8);

                enemies.splice(j, 1);
                ship.projectiles[i].active = false; // ✅ Devolvemos a la piscina
                ship.projectiles.splice(i, 1); // Lo quitamos de la lista de activos
                projectileDestroyed = true;
                break; 
            }
        }

        if (projectileDestroyed) continue; // Ir al siguiente proyectil

        // Con asteroides
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (collision(ship.projectiles[i], asteroids[j])) {
                explosions.push(new Explosion(ctx, spritesheet, asteroids[j].position, asteroids[j].scale * 2.5));
                audioManager.playSound('explosion', 0.6);

                if (asteroids[j].type === 1) {
                    labels.push(new Label(ctx, { ...asteroids[j].position }, '+30 Score', '#ffffff', font, fontWeight));
                    scoreCount += 30;
                    
                    // Probabilidad de soltar un power-up al destruir un asteroide grande
                    if (Math.random() < POWERUP_CHANCE_FROM_ASTEROID) {
                        spawnPowerUp(asteroids[j].position);
                    }
                } else if (asteroids[j].type === 2) {
                    createMeteors(asteroids[j].position);
                } else {
                    labels.push(new Label(ctx, { ...asteroids[j].position }, '+15 Score', 'red', font, fontWeight));
                    scoreCount += 15;
                }

                asteroids.splice(j, 1);
                ship.projectiles[i].active = false; // ✅ Devolvemos a la piscina
                ship.projectiles.splice(i, 1); // Lo quitamos de la lista de activos
                break; 
            }
        }
    }

    checkBossSpawn(); // Comprobar si debe aparecer el jefe
    updateDifficulty(); // Llamar a la función de dificultad aquí

    score.innerHTML = scoreCount;
    if (scoreCount > highScore) {
        highScore = scoreCount;
        highScoreElement.innerHTML = `${highScore}`;

        // Congratulations! Call happytime() to notify a happy moment in the game.
        if (crazySDK && crazySDK.game) {
            try { crazySDK.game.happytime(); } catch(e) { console.warn(e); }
        }

        // Saving the score should not block the game loop.
        // Usamos .catch() para manejar errores en lugar de await en una función no asíncrona.
        if (crazySDK && crazySDK.data && typeof crazySDK.data.setItem === 'function') {
            Promise.resolve(crazySDK.data.setItem("high-score", highScore))
                .catch(e => console.warn('Error guardando high-score con SDK:', e));
        } else {
            try {
                localStorage.setItem("high-score", highScore);
            } catch(e) { console.warn('Error guardando high-score con localStorage:', e); }
        }
    }
}


// Función para manejar la derrota del jefe
function defeatBoss() {
    if (!boss) return;

    console.log("¡Jefe derrotado!");
    explosions.push(new Explosion(ctx, spritesheet, boss.position, 4.0)); // Gran explosión
    audioManager.playSound('explosion', 1.0);

    // ¡Momento feliz! Notificamos al SDK que el jugador ha derrotado a un jefe.
    if (crazySDK && crazySDK.game) {
        try { crazySDK.game.happytime(); } catch(e) { console.warn(e); }
    }

    // Calculamos la puntuación del jefe y la usamos en la etiqueta y en el contador
    const bossScore = 250 + (currentBossLevel * 250);
    labels.push(new Label(ctx, { ...boss.position }, `+${bossScore} Score!`, '#ffcc00', font, fontWeight));
    scoreCount += bossScore;

    boss = null;
    bossActive = false; // ✅ Reiniciamos el estado para que vuelvan a aparecer enemigos
    currentBossLevel++; // Avanzamos al siguiente nivel de jefe para el próximo umbral
}

// Función para actualizar la dificultad del juego
function updateDifficulty() {
    if (bossActive) return; // No aumentar dificultad durante la pelea con el jefe

    if (currentDifficultyLevel < difficultyThresholds.length && scoreCount >= difficultyThresholds[currentDifficultyLevel]) {
        currentDifficultyLevel++;
        console.log(`¡Dificultad aumentada a nivel ${currentDifficultyLevel}! Score: ${scoreCount}`);

        // ✨ Mostrar mensaje de "Level Up" en pantalla
        labels.push(new Label(ctx, { x: canvas.width / 2, y: canvas.height / 2 }, `Level ${currentDifficultyLevel}!`, '#00ffff', font, fontWeight));

        // Ajustar intervalos de spawn (mínimo 150ms para asteroides, 2000ms para enemigos)
        currentAsteroidSpawnInterval = Math.max(150, currentAsteroidSpawnInterval * 0.9);
        currentEnemySpawnInterval = Math.max(2000, currentEnemySpawnInterval * 0.9);

        // Ajustar velocidad de enemigos (máximo 8)
        currentEnemySpeed = Math.min(8, currentEnemySpeed + 0.5);

        // Ajustar rango de velocidad de asteroides (máximo 5-7)
        currentAsteroidMinSpeed = Math.min(5, currentAsteroidMinSpeed + 0.3);
        currentAsteroidMaxSpeed = Math.min(7, currentAsteroidMaxSpeed + 0.5);

        // Asegurarse de que minSpeed no sea mayor que maxSpeed
        if (currentAsteroidMinSpeed > currentAsteroidMaxSpeed) {
            currentAsteroidMinSpeed = currentAsteroidMaxSpeed - 0.5;
        }
    }
}

// Comprueba si es hora de que aparezca el jefe
function checkBossSpawn() {
    // Si hay un jefe activo, no hacer nada
    if (bossActive) return;
    // Si ya hemos superado todos los niveles de jefe, no hacer nada
    if (currentBossLevel >= bossSpawnThresholds.length) return;

    // Si la puntuación alcanza el umbral del nivel de jefe actual
    if (scoreCount >= bossSpawnThresholds[currentBossLevel]) {
        spawnBoss();
    }
}

function background() {
    const now = Date.now();
    // ✅ Solo redibujamos el fondo si es necesario y ha pasado el intervalo
    // ✅ Se elimina la condición `play` para que el fondo se anime siempre.
    if (backgroundNeedsRedraw || now - lastBackgroundRedraw > backgroundRedrawInterval) {
        backgroundCtx.fillStyle = '#111111ff';
        backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

        // Dibujamos las nebulosas y constelación en el canvas de fondo
        if (constellation) constellation.update(); // Actualizamos posiciones
        nebulas.forEach(nebula => nebula.update());

        // Ahora dibujamos
        nebulas.forEach(nebula => nebula.draw(backgroundCtx));
        if (constellation) constellation.draw(backgroundCtx);

        lastBackgroundRedraw = now;
        backgroundNeedsRedraw = false; // Marcamos que ya no necesita redibujado inmediato
    }

    // ✅ Dibujamos la imagen pre-renderizada en el canvas principal. ¡Esto es muy rápido!
    ctx.drawImage(backgroundCanvas, 0, 0);

    // Las estrellas parpadeantes se dibujan encima para mantener su efecto dinámico
    stars.forEach(star => {
        star.update();
    });

}
function updateObjects(){
    // Solo actualizamos la nave si el juego está activo para que se congele al morir
    ship.update(hitBox);

    // Gestión de spawn de asteroides y enemigos basada en el tiempo y dificultad
    // Se detiene si el jefe está activo
    if (!bossActive) {
        const now = Date.now();
        if (now - lastAsteroidSpawnTime > currentAsteroidSpawnInterval) {
            spawnSingleAsteroid();
            lastAsteroidSpawnTime = now;
        }
        if (now - lastEnemySpawnTime > currentEnemySpawnInterval) {
            spawnSingleEnemy();
            lastEnemySpawnTime = now;
        }
    } else if (boss) {
        // ✅ Corregido: Pasamos la lista de proyectiles enemigos activos al jefe para que pueda disparar.
        boss.update(projectilesEnemy);
    }

    // Usamos bucles 'for' inversos para eliminar elementos de forma segura
    for (let i = asteroids.length - 1; i >= 0; i--) {
        asteroids[i].update(hitBox);
        if (asteroids[i].collision(canvas)) {
            asteroids.splice(i, 1);
        }
    }

    for (let i = labels.length - 1; i >= 0; i--) {
        labels[i].update();
        if (labels[i].opacity <= 0) {
            labels.splice(i, 1);
        }
    }

    for (let i = projectilesEnemy.length - 1; i >= 0; i--) {
        projectilesEnemy[i].update();
        // ✅ Devolver a la piscina si sale de la pantalla
        if (projectilesEnemy[i].collision(canvas)) {
            projectilesEnemy[i].active = false;
            projectilesEnemy.splice(i, 1);
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update(hitBox);
        enemies[i].createProjectile(projectilesEnemy, enemyProjectilePool); // ✅ Pasamos la piscina y la lista de activos
        if (enemies[i].collision(canvas)) {
            enemies.splice(i, 1);
        }
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].update();
        powerUps[i].draw(); // ✅ Añadimos la llamada a draw() que faltaba
        if (hitBox) powerUps[i].hitbox();
        if (powerUps[i].isFinished) powerUps.splice(i, 1);
    }

    // Actualizamos y dibujamos las partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].lifespan <= 0) {
            particles.splice(i, 1);
        }
    }
}

function update() {
    // SDK Requirement: Pause the game if an ad is playing or tab is hidden.
    // También pausamos si no hay nave (p. ej. antes de la primera partida)
    if (!ship) {
        requestAnimationFrame(update);
        return;
    }

    if (isAdPlaying || isPausedByVisibility) {
        requestAnimationFrame(update);
        return; // No ejecutar ninguna lógica del juego
    }

    if(menuStatus){
        background();
    } else if(play){
        // El juego está activo
        background();
        collisionObjects();
        updateObjects();
    } else {
        background();
        updateObjects(); // Esto dibujará los objetos congelados
    }

    // Las explosiones se actualizan y dibujan siempre, incluso después de "Game Over"
    explosions.forEach((explosion, i) => {
        explosion.update();
        explosion.draw();
        if (explosion.isFinished) {
            explosions.splice(i, 1);
        }
    });

    requestAnimationFrame(update);
}

// --- Lógica de Banner en Redimensionamiento ---
let bannerResizeTimeout = null;
window.addEventListener('resize', () => {
    // Cancelamos el temporizador anterior si el usuario sigue redimensionando la ventana.
    if (bannerResizeTimeout) clearTimeout(bannerResizeTimeout);

    // Establecemos un nuevo temporizador para ejecutar la lógica después de que el usuario deje de redimensionar.
    bannerResizeTimeout = setTimeout(() => {
        // Si el menú está abierto (y por lo tanto, un banner debería estar visible),
        // recargamos el banner para que se ajuste al nuevo tamaño de pantalla.
        if (menuStatus) {
            // Ocultamos el banner actual y, una vez oculto, solicitamos uno nuevo.
            // .finally() asegura que showBanner() se llame incluso si hideBanner() falla.
            // hideBanner().finally(() => showBanner());
        }
    }, 300);
});

// Función principal asíncrona para controlar el arranque
async function main() {
    // 1. Mostrar la pantalla de carga inmediatamente
    if (loadingScreen) loadingScreen.style.display = 'flex';

    resizeCanvas();
    await initCrazyGamesSDK(); // 2. Inicializar SDK

    // 3. Notificar al SDK que la carga ha comenzado
    if (crazySDK && crazySDK.game) {
        try { crazySDK.game.loadingStart(); } catch(e) { console.warn(e); }
    }

    // 4. Cargar todos los datos y assets del juego
    await loadHighScore();
    displayUsername();
    await loadAssets(); // ✅ Añadimos 'await' para esperar a que los sonidos se carguen
    createStars();

    // ✅ Creamos varias nebulosas para un fondo más rico
    for (let i = 0; i < 3; i++) {
        const position = { x: Math.random() * canvas.width, y: Math.random() * canvas.height };
        nebulas.push(new Nebula(ctx, canvas, position, 200, 250)); // Reducimos partículas para un rendimiento inicial más rápido
    }
  

    // ✅ Creamos la constelación con menos estrellas en móviles para mejor rendimiento
    const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
    const starCount = isMobile ? 40 : 80; // 40 estrellas en móvil, 80 en desktop
    constellation = new Constelation(ctx, canvas, starCount);

    // 5. Iniciar el bucle del juego
    update();

    // 6. Notificar al SDK que la carga ha terminado y ocultar la pantalla
    if (crazySDK && crazySDK.game) {
        try { crazySDK.game.loadingStop(); } catch(e) { console.warn(e); }
    }
    if (loadingScreen) loadingScreen.style.display = 'none';

    // 7. Mostrar el banner inicial si estamos en el menú
    if (menuStatus) {
        // showBanner();
    }
}

main(); // Iniciar el juego
