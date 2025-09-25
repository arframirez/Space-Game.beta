import {Ship} from "./ship.js";    
import {Asteroid} from "./asteroid.js";
import { Label } from "./label.js";
import { Enemy } from "./enemy.js";
import { Star } from "./star.js";
import { Explosion } from "./explosion.js";
import { Boss } from "./boss.js";
import { AudioManager } from "./AudioManager.js";


const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const spritesheet = document.getElementById('spritesheet');
const font = window.getComputedStyle(document.body).fontFamily;
const fontWeight = window.getComputedStyle(document.body).fontWeight;
const menu = document.querySelector('.menu');
const score = document.querySelector('.score');
const rewardButton = document.getElementById('reward-button');
const muteButton = document.getElementById('mute-button');
const btnMenu = document.querySelector('.play-game');
const loadingScreen = document.getElementById('loading-screen');
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
const difficultyThresholds = [100, 300, 600, 1000, 1500, 2000, 2500, 3000, 4000, 5000]; // Puntos para aumentar dificultad

// Valores iniciales de dificultad
let currentAsteroidSpawnInterval = 500; // ms
let currentEnemySpawnInterval = 7000; // ms
let currentEnemySpeed = 2;
let currentAsteroidMinSpeed = 2;
let currentAsteroidMaxSpeed = 3;

let lastAsteroidSpawnTime = 0;
let lastEnemySpawnTime = 0;

// --- Variables del Jefe (Boss) ---
let boss = null;
let bossActive = false;
const bossSpawnThresholds = [300, 1000, 1800, 2600]; // Puntuaciones para que aparezca el jefe
let currentBossLevel = 0; // Nivel actual del jefe (0, 1, 2, ...)

let scoreCount = 0;


const audioManager = new AudioManager();
const ship = new Ship(ctx, spritesheet, canvas, audioManager); // 🔊 Pasamos el gestor de audio a la nave
const asteroids = [];
const labels = [];
const enemies = [];
const projectilesEnemy = [];
const explosions = [];
const stars = [];
let highScore = 0;
let asteroidInterval = null;
let enemyInterval = null;

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

            // Escuchar eventos de anuncios para depuración
            crazySDK.addEventListener("adStarted", () => {
                console.log("Ad started, pausing and muting game via SDK.");
                isAdPlaying = true;
                crazySDK.game.setVolume(0); // ✅ La forma más segura de silenciar
            });
            crazySDK.addEventListener("adFinished", () => {
                console.log("Ad finished, resuming and unmuting game via SDK.");
                isAdPlaying = false;
                crazySDK.game.setVolume(1); // ✅ Restauramos el volumen
            });

            // Listen for the site's mute button from CrazyGames
            crazySDK.addEventListener("mute", () => {
                console.log("Mute event received from SDK.");
                audioManager.isMuted = true;
                if (muteIcon) muteIcon.name = 'volume-mute-outline';
            });

            crazySDK.addEventListener("unmute", () => {
                console.log("Unmute event received from SDK.");
                audioManager.isMuted = false;
                if (muteIcon) muteIcon.name = 'volume-high-outline';
            });
        }
    } catch (error) {
        console.warn("⚠️ SDK de CrazyGames no se pudo inicializar. Los anuncios y guardado en la nube no funcionarán.", error);
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
function loadAssets() {
    audioManager.loadSound('explosion', 'explosion-312361.mp3');
    audioManager.loadSound('shoot', 'space-battle-sounds-br-95277-VEED.mp3');
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
        joystickSize = 70;
        catchDistance = 200;
    } else if (isMobile) {
        // Móvil vertical: joystick normal
        joystickSize = 80;
        catchDistance = 150;
    } else {
        // Desktop: joystick grande
        joystickSize = 100;
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
    // Función para disparar (reutilizada del código de teclado)
    function shoot() {
        // Llama al método centralizado en la clase Ship
        ship.shoot();
    }
    
    // Eventos del botón (tanto mouse como touch)
    shootButton.addEventListener('click', shoot);
    shootButton.addEventListener('touchstart', (e) => {
        audioManager.unlockAudio(); // Desbloquea el audio en la primera interacción táctil
        e.preventDefault(); // Prevenir double-tap y otros gestos
        shoot();
    });
}

if (rewardButton) {
    rewardButton.addEventListener('click', async () => {
        if (!crazySDK) {
            alert("CrazyGames SDK not available.");
            return;
        }

        try {
            // Solicitar un anuncio con recompensa
            await crazySDK.ad.requestAd("rewarded");

            // Si el anuncio se vio con éxito, se aplica la recompensa
            hasBonus = true;
            
            // Actualizar la UI para mostrar que el bonus está activo
            rewardButton.style.display = 'none'; // Ocultar el botón
            
            const bonusMessage = document.createElement('p');
            bonusMessage.id = "bonus-message";
            bonusMessage.textContent = "Bonus activated! More shots for the next game.";
            bonusMessage.style.color = "#00ff88";
            bonusMessage.style.marginTop = "20px";
            rewardButton.after(bonusMessage); // Añadir mensaje después del botón

        } catch (e) {
            console.error("Rewarded ad error:", e);
             //Opcional: informar al usuario que el anuncio falló
            alert("Could not load the ad. Please try again later.");
        }
    });
}

if (muteButton) {
    muteButton.addEventListener('click', () => {
        audioManager.isMuted = !audioManager.isMuted;
        muteIcon.name = audioManager.isMuted ? 'volume-mute-outline' : 'volume-high-outline';
    });
}

if (btnMenu) {
    btnMenu.addEventListener('click', () => {
        audioManager.unlockAudio(); // Desbloquea el audio

        // Request user login before starting the game
        if (crazySDK && crazySDK.user && !crazySDK.user.isUserAccountAvailable) {
            crazySDK.user.requestUserAccount().catch(e => console.warn("Login popup closed or failed", e));
        }

        init();
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
        try {
            await crazySDK.ad.requestAd("midgame");
             lastAdTime = now; // Actualiza el tiempo solo si el anuncio se mostró
        } catch (e) {
            console.error("Ad error:", e);
        }
    }

    // Después del anuncio (o si falla/se omite), muestra el menú
    menu.style.display = 'flex';
    menuStatus = true;

    // Restaura el botón de recompensa para la siguiente sesión
    hasBonus = false; // Asegurarse de que el bonus se reinicie
    const bonusMessage = document.getElementById('bonus-message');
    if (bonusMessage) {
        bonusMessage.remove();
    }
    if (rewardButton) {
        rewardButton.style.display = 'flex';
    }

    showBanner(); // Show banner in the Game Over menu
}

// --- showBanner simplificado ---
async function showBanner() {
    if (!crazySDK) {
        console.warn('CrazySDK no disponible, no se pide banner.');
        return;
    }
    const container = document.getElementById('banner-container');
    if (container) {
        container.style.display = 'flex';
    }

    const slotId = 'banner-slot'; // <- usamos el slot con tamaño exacto
    const slot = document.getElementById(slotId);
    if (!slot) {
        console.warn('No existe el slot de banner:', slotId);
        return;
    }

    try {
        console.log('Requesting banner into slot:', slotId);
        // La llamada original al SDK
        // Cambiamos a requestResponsiveBanner, que es el método correcto para un contenedor de tamaño variable.
        await crazySDK.banner.requestResponsiveBanner(slotId);
        console.log('Banner mostrado correctamente.');
    } catch (err) {
        // Un log de error simple es suficiente ahora que la causa raíz está resuelta.
        console.error('No se pudo mostrar banner:', err);
    }
}

// --- hideBanner con try/catch ---
async function hideBanner() {
    const container = document.getElementById('banner-container');
    if (container) {
        container.style.display = 'none';
    }

    if (!crazySDK || !crazySDK.banner) return;
    try {
        await crazySDK.banner.clearBanner();
        console.log('Banner ocultado/limpiado.');
    } catch (e) {
        console.warn('Error al ocultar banner:', e);
    }
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

    // Reiniciamos la nave
    ship.position = { x: 200, y: 200 };
    ship.projectiles.length = 0;
    ship.speed = 0;
    ship.angle = 0;

    // Apply bonus if active
    if (hasBonus) {
        ship.maxShots = 15; // Original is 10
        hasBonus = false; // Use the bonus only once
    } else {
        ship.maxShots = 10; // Default value
    }

    // Reset shot limiter and block
    ship.availableShots = ship.maxShots;  // Restore all available shots
    ship.blocked = false;                 // Unblock shooting
    ship.recharging = false;              // Stop automatic recharge    
    // 🔹 Limpiar el temporizador de bloqueo para evitar que se quede activo entre partidas
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

    hideBanner(); // Hide the banner when the game starts
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
    let enemy = new Enemy(ctx, spritesheet, canvas, ship, currentEnemySpeed);
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
    boss = new Boss(ctx, spritesheet, canvas, ship, currentBossLevel);

    // Limpiar enemigos y asteroides existentes para enfocar la batalla
    asteroids.length = 0;
    enemies.length = 0;

    // Podrías tocar una música de jefe aquí
}
function collision(Object1, Object2) {
    // ✅ Comprobación de seguridad: si alguno de los objetos o sus propiedades necesarias no existen, no hay colisión.
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
    for (let i = asteroids.length - 1; i >= 0; i--) {
        if (collision(ship, asteroids[i])) {
            gameOver();
            return;
        }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (collision(enemies[i], ship)) {
            gameOver();
            return;
        }
    }
    for (let i = projectilesEnemy.length - 1; i >= 0; i--) {
        if (collision(projectilesEnemy[i], ship)) {
            gameOver();
            return;
        }
    }
    // Colisión de la nave con el jefe
    if (bossActive && boss && collision(ship, boss)) {
        gameOver();
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
                projectilesEnemy.splice(i, 1);
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
                projectilesEnemy.splice(i, 1);
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
                ship.projectiles.splice(i, 1);

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
                labels.push(new Label(ctx, { ...enemies[j].position }, '+20 Score', '#00ff00', font, fontWeight));
                scoreCount += 20;

                explosions.push(new Explosion(ctx, spritesheet, enemies[j].position, 1.2));
                audioManager.playSound('explosion', 0.8);

                enemies.splice(j, 1);
                ship.projectiles.splice(i, 1);
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
                    labels.push(new Label(ctx, { ...asteroids[j].position }, '+10 Score', '#ffffff', font, fontWeight));
                    scoreCount += 10;
                } else if (asteroids[j].type === 2) {
                    createMeteors(asteroids[j].position);
                } else {
                    labels.push(new Label(ctx, { ...asteroids[j].position }, '+5 Score', 'red', font, fontWeight));
                    scoreCount += 5;
                }

                asteroids.splice(j, 1);
                ship.projectiles.splice(i, 1);
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

    labels.push(new Label(ctx, { ...boss.position }, '+500 Score!', '#ffcc00', font, fontWeight));
    scoreCount += 250 + (currentBossLevel * 250); // Más puntos por jefes más difíciles

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
    // Actualiza el fondo y las estrellas
    ctx.fillStyle = ' #111111ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        // Si el jefe está activo, actualízalo
        boss.update(projectilesEnemy);
    }

    asteroids.forEach((asteroid, i) => {
        asteroid.update(hitBox);
        if (asteroid.collision(canvas)) {
            setTimeout(() => {
                asteroids.splice(i, 1);
            }, 0);
        }
    });
    labels.forEach((label, i) => {
        label.update();
        if (label.opacity <= 0) {
            setTimeout(() => {
                labels.splice(i, 1);
            }, 0);
        }
    });

    projectilesEnemy.forEach((projectile, i) => {
        projectile.update();
    });

    enemies.forEach((enemy, i) => {
        enemy.update(hitBox);
        enemy.createProjectile(projectilesEnemy);
        if (enemy.collision(canvas)) {
            setTimeout(() => {
                enemies.splice(i, 1);
            }, 0);
        }
    });
}

function update() {
    // SDK Requirement: Pause the game if an ad is playing or tab is hidden.
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

let bannerResizeTimeout = null;
window.addEventListener('resize', () => {
    if (bannerResizeTimeout) clearTimeout(bannerResizeTimeout);
    bannerResizeTimeout = setTimeout(() => {
        // Si el menú está abierto, actualizamos / reintentamos mostrar banner
        if (menuStatus) {
            // limpiar y pedir de nuevo
            hideBanner().finally(() => showBanner());
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
    loadAssets();
    createStars();

    // 5. Iniciar el bucle del juego
    update();

    // 6. Notificar al SDK que la carga ha terminado y ocultar la pantalla
    if (crazySDK && crazySDK.game) {
        try { crazySDK.game.loadingStop(); } catch(e) { console.warn(e); }
    }
    if (loadingScreen) loadingScreen.style.display = 'none';

    // 7. Mostrar el banner inicial si estamos en el menú
    if (menuStatus) {
        showBanner();
    }
}

main(); // Iniciar el juego
