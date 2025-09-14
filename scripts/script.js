import {Ship} from "./ship.js";    
import {Asteroid} from "./asteroid.js";
import { Label } from "./label.js";
import { Enemy } from "./enemy.js";
import { Star } from "./star.js";
import { Explosion } from "./explosion.js";
import { AudioManager } from "./AudioManager.js";


const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const spritesheet = document.getElementById('spritesheet');
const font = window.getComputedStyle(document.body).fontFamily;
const fontWeight = window.getComputedStyle(document.body).fontWeight;
const menu = document.querySelector('.menu');
const score = document.querySelector('.score');
const rewardButton = document.getElementById('reward-button');
const btnMenu = document.querySelector('.play-game');
const muteButton = document.getElementById('mute-button');
const muteIcon = muteButton.querySelector('ion-icon');

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
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    // Esperar un poco para que la orientación se aplique completamente
    setTimeout(resizeCanvas, 100);
});
let hitBox = false;
let menuStatus = true
let play = false
let hasBonus = false;
let lastAdTime = 0;
const adCooldown = 120000; // 2 minutos en milisegundos

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

let crazySDK = null;

// Función para inicializar el SDK de CrazyGames
async function initCrazyGamesSDK() {
    try {
        if (window.CrazyGames && window.CrazyGames.SDK) {
            await window.CrazyGames.SDK.init();
            crazySDK = window.CrazyGames.SDK;
            console.log("✅ SDK de CrazyGames inicializado.");

            // Escuchar eventos de anuncios para depuración
            crazySDK.addEventListener("adStarted", () => console.log("Anuncio iniciado."));
            crazySDK.addEventListener("adFinished", () => console.log("Anuncio finalizado."));
            crazySDK.addEventListener("adError", (error) => console.log("Error en anuncio:", error));
        }
    } catch (error) {
        console.warn("⚠️ SDK de CrazyGames no se pudo inicializar. Los anuncios y guardado en la nube no funcionarán.", error);
    }
}

function loadAssets() {
    audioManager.loadSound('explosion', '../explosion-312361.mp3');
    audioManager.loadSound('shoot', '../cannon-fire-161072.mp3');
}

async function loadHighScore() {
    // Ahora usamos el SDK si está disponible, si no, localStorage
    if (crazySDK) {
        const savedScore = crazySDK.data.getItem("high-score");
        highScore = savedScore ? Number(savedScore) : 0;
    } else {
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

btnMenu.addEventListener('click', () => {
         audioManager.unlockAudio(); // Desbloquea el audio cuando el jugador presiona "Play"
        init(); 
});
async function gameOver() {
    play = false;
    window.CrazyGames.SDK.game.gameplayStop();

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
    const bonusMessage = document.getElementById('bonus-message');
    if (bonusMessage) {
        bonusMessage.remove();
    }
    if (rewardButton) {
        rewardButton.style.display = 'block';
    }
}
function init() {

    window.CrazyGames.SDK.game.gameplayStart();

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

    // 🔹 Aplicar bonus si está activo
    if (hasBonus) {
        ship.maxShots = 15; // El original es 10
        hasBonus = false; // Usar el bonus solo una vez
    } else {
        ship.maxShots = 10; // Valor por defecto
    }

            // 🔹 Reiniciamos limitador de disparos y bloqueo
    ship.availableShots = ship.maxShots;  // Restaura todos los disparos disponibles
    ship.blocked = false;                 // Desbloqueamos disparos
    ship.recharging = false;              // Detenemos recarga automática 
    // Si usas un intervalo de recarga, mejor lo reiniciamos aquí también
    clearInterval(ship.rechargeInterval);
    if (ship.rechargeInterval) {
        clearInterval(ship.rechargeInterval);
        ship.rechargeInterval = null;
    }

    // 🔹 Limpiamos los intervalos anteriores para evitar duplicados
    if (asteroidInterval) clearInterval(asteroidInterval);
    if (enemyInterval) clearInterval(enemyInterval);

    // 🔹 Reiniciamos la generación de objetos
    generateAsteroids();
    generateEnemies();

    menu.style.display = 'none';
    menuStatus = false;
    play = true;
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
function generateEnemies() {
    enemyInterval = setInterval(() => {
        let enemy = new Enemy(ctx, spritesheet, canvas, ship);
        enemy.generatePosition(canvas);
        enemies.push(enemy);
        setTimeout(() => {
            enemy.death = true;
        }, 3000);
    }, 7000);
}

function collision(Object1, Object2) {
    let v1 = Object1.position
    let v2 = Object2.position;

    let v3 = {
        x: v1.x - v2.x,
        y: v1.y - v2.y
    }

    let distance = Math.sqrt(v3.x * v3.x + v3.y * v3.y);

    if (distance < Object1.image.radio + Object2.image.radio) {
        return true;
    }
    return false;
}
function createMeteors(position) {
     let count = Math.floor(Math.random() * (5 - 3 + 1)) + 3;
     for (let i = 0; i < count; i++) {
         let meteor = new Asteroid(ctx, spritesheet, position, 3);
         meteor.death = true; 
         asteroids.push(meteor);

     }
}
function collisionObjects(){
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

    // Colisiones de proyectiles del jugador
    for (let i = ship.projectiles.length - 1; i >= 0; i--) {
        let projectileDestroyed = false;

        // Con enemigos
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (collision(ship.projectiles[i], enemies[j])) {
                let text = new Label(ctx, enemies[j].position, '+20 Score', '#00ff00', font, fontWeight);
                labels.push(text);
                scoreCount += 20;

                // Crear explosión para el enemigo
                explosions.push(new Explosion(ctx, spritesheet, enemies[j].position, 1.2));
                audioManager.playSound('explosion', 0.8); // Sonido un poco más bajo

                enemies.splice(j, 1);
                ship.projectiles.splice(i, 1);
                projectileDestroyed = true;
                break; // Salir del bucle de enemigos, el proyectil ya no existe
            }
        }

        if (projectileDestroyed) continue; // Ir al siguiente proyectil

        // Con asteroides
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (collision(ship.projectiles[i], asteroids[j])) {
                // Crear explosión para el asteroide (escala relativa al tamaño del asteroide)
                explosions.push(new Explosion(ctx, spritesheet, asteroids[j].position, asteroids[j].scale * 2.5));
                audioManager.playSound('explosion', 0.6); // Sonido aún más bajo

                if (asteroids[j].type === 1) {
                    labels.push(new Label(ctx, asteroids[j].position, '+10 Score', '#ffffff', font, fontWeight));
                    scoreCount += 10;
                } else if (asteroids[j].type === 2) {
                    createMeteors(asteroids[j].position);
                } else {
                    labels.push(new Label(ctx, asteroids[j].position, '+5 Score', 'red', font, fontWeight));
                    scoreCount += 5;
                }

                asteroids.splice(j, 1);
                ship.projectiles.splice(i, 1);
                break; // Salir del bucle de asteroides
            }
        }
    }

    // Actualizar puntuación y guardado al final
    score.innerHTML = scoreCount;
    if (scoreCount > highScore) {
        highScore = scoreCount;
        highScoreElement.innerHTML = `${highScore}`;
        if (crazySDK) {
            crazySDK.data.setItem("high-score", highScore);
        } else {
            localStorage.setItem("high-score", highScore); // Guardado local como fallback
        }
    }
}
function generateAsteroids() {
    asteroidInterval = setInterval(() => {
        let type = Math.floor(Math.random() * (2)) + 1;  // Genera un tipo aleatorio (1 o 2)
        let asteroid = new Asteroid(ctx, spritesheet,{x:0,y:0}, type);
        asteroid.generatePosition(canvas);  // Posiciona el asteroide en el canvas
        asteroids.push(asteroid);
        setTimeout(() => {
               asteroid.death = true;
        }, 5000);
    }, 500);
}
function background() {
    ctx.fillStyle = ' #111111ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
        star.update();
    });
}
function updateObjects(){
    // Solo actualizamos la nave si el juego está activo para que se congele al morir

         ship.update(hitBox);

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

// Función principal asíncrona para controlar el arranque
async function main() {
    await initCrazyGamesSDK(); // 1. Inicializar SDK
    await loadHighScore();     // 2. Cargar puntuación (puede usar el SDK)
    loadAssets();              // 3. Cargar assets
    createStars();             // 4. Crear elementos visuales
    update();                  // 5. Iniciar el bucle del juego
}

main(); // Iniciar el juego
