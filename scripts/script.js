import {Ship} from "./ship.js";    
import {Asteroid} from "./asteroid.js";
import { Label } from "./label.js";
import { Enemy } from "./enemy.js";
import { Star } from "./star.js";
import { Projectile } from "./projectile.js";


const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const spritesheet = document.getElementById('spritesheet');
const font = window.getComputedStyle(document.body).fontFamily;
const fontWeight = window.getComputedStyle(document.body).fontWeight;
const menu = document.querySelector('.menu');
const score = document.querySelector('.score');
const btnMenu = document.querySelector('.play-game');

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
let scoreCount = 0;

const ship = new Ship(ctx, spritesheet, canvas);
const asteroids = [];
const labels = [];
const enemies = [];
const projectilesEnemy = [];
const stars = [];
let highScore = localStorage.getItem('high-score') || 0;

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
        if (!ship.blocked && ship.availableShots > 0) {
            ship.projectiles.push(
                new Projectile(
                    ctx,
                    spritesheet,
                    { x: ship.position.x + Math.cos(ship.angle) * 14, y: ship.position.y + Math.sin(ship.angle) * 14 },
                    ship.angle
                ),
                new Projectile(
                    ctx,
                    spritesheet,
                    { x: ship.position.x - Math.cos(ship.angle) * 14, y: ship.position.y - Math.sin(ship.angle) * 14 },
                    ship.angle
                )
            );
            
            ship.availableShots--;
            if (!ship.recharging) ship.startRecharge();
            
            if (ship.availableShots === 0) {
                ship.blocked = true;
            }
        }
    }
    
    // Eventos del botón (tanto mouse como touch)
    shootButton.addEventListener('click', shoot);
    shootButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevenir double-tap y otros gestos
        shoot();
    });
}

btnMenu.addEventListener('click', () => {
        init(); 
});
function gameOver() {
    play = false;
    setTimeout(() => {
        menu.style.display = 'flex';
        menuStatus = true;
    }, 500);
}
function init() {
    score.innerHTML = 0;
    scoreCount = 0;


    // Reiniciamos todos los arrays principales
    asteroids.length = 0;
    labels.length = 0;
    enemies.length = 0;
    projectilesEnemy.length = 0;

    // Reiniciamos la nave
    ship.position = { x: 200, y: 200 };
    ship.projectiles.length = 0;
    ship.speed = 0;
    ship.angle = 0;

    // 🔹 Reiniciamos limitador de disparos y bloqueo
    ship.availableShots = ship.maxShots;  // Restaura todos los disparos disponibles
    ship.blocked = false;                 // Desbloqueamos disparos
    ship.recharging = false;              // Detenemos recarga automática

    // Si usas un intervalo de recarga, mejor lo reiniciamos aquí también
    if (ship.rechargeInterval) {
        clearInterval(ship.rechargeInterval);
        ship.rechargeInterval = null;
    }

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
    setInterval(() => {
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
    for(let i = 0; i < asteroids.length; i++) {
        if (collision(ship, asteroids[i])) {
            gameOver();
            return;
        }
    }
    for(let i = 0; i < ship.projectiles.length; i++) { 
        for(let j = 0; j < projectilesEnemy.length; j++) {
            if (collision(ship.projectiles[i], projectilesEnemy[j])) {
            projectilesEnemy.splice(j, 1);
            }
        }
    }

    for(let i = 0; i < projectilesEnemy.length; i++) {
        for(let j = 0; j < asteroids.length; j++) {
        if (collision(asteroids[j], projectilesEnemy[i])) {
            asteroids.splice(j, 1);
            projectilesEnemy.splice(i, 1);
            i--;
            break;
        }
    }
}

    for(let i = 0; i < enemies.length; i++) {
        if (collision(enemies[i], ship)) {
            gameOver();
            return;
        }
    }

    for (let i = 0; i < projectilesEnemy.length; i++) {
        const element = projectilesEnemy[i];
        if (collision(element, ship)) {
            gameOver();
            return;
        }
    }

    // ⬇️ Estos dos bucles deben estar dentro de collisionObjects()
    loop1:
    for(let i = 0; i < ship.projectiles.length; i++) { 
        for(let j = 0; j < enemies.length; j++) {
            if (collision(ship.projectiles[i], enemies[j])) {
                setTimeout(() => {
                    let text = new Label(ctx, enemies[j].position, '+20 Puntos', '#00ff00', font, fontWeight);
                    labels.push(text);
                    ship.projectiles.splice(i, 1);
                    enemies.splice(j, 1);
                    scoreCount += 20;
                    score.innerHTML = scoreCount;

                }, 0);
                break loop1;
            }
        }
    }

    loop2:
    for(let i = 0; i < ship.projectiles.length; i++) {
        for(let j = 0; j < asteroids.length; j++) {
            if (collision(ship.projectiles[i], asteroids[j])) {
                setTimeout(() => {
                    if (asteroids[j].type === 1) {
                        let text = new Label(ctx, asteroids[j].position, '+10 Puntos', '#ffffff', font, fontWeight);
                        labels.push(text);
                        ship.projectiles.splice(i, 1);
                        asteroids.splice(j, 1);
                        scoreCount += 10;
                        score.innerHTML = scoreCount;                      
                    } else if (asteroids[j].type === 2) {
                        createMeteors(asteroids[j].position);
                        ship.projectiles.splice(i, 1);
                        asteroids.splice(j, 1);
                    } else {
                        let text = new Label(ctx, asteroids[j].position, '+5 Puntos', 'red', font, fontWeight);
                        labels.push(text);
                        ship.projectiles.splice(i, 1);
                        asteroids.splice(j, 1);
                        scoreCount += 5;
                        score.innerHTML = scoreCount;
                    }
                    highScore = scoreCount >= highScore ? scoreCount : highScore;
                    localStorage.setItem('high-score', highScore);
                    highScoreElement.innerHTML = `${highScore} `;
                }, 0);
                break loop2;
            }
        }
    }
} 
function generateAsteroids() {
    setInterval(() => {
        let type = Math.floor(Math.random() * (2)) + 1;
        let asteroid = new Asteroid(ctx, spritesheet,{x:0,y:0}, type);
        asteroid.generatePosition(canvas);
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
        ship.update(hitBox);
    asteroids.forEach((asteroid,i) => {
        asteroid.update(hitBox);
        if (asteroid.collision(canvas)) {
            setTimeout(() => {
                asteroids.splice(i, 1);
            }, 0);
        }
    });
    labels.forEach((label,i) => {
        label.update();
        if (label.opacity <= 0) {
            setTimeout(() => {
                labels.splice(i, 1);
            }, 0);
        }
    });

    projectilesEnemy.forEach((projectile,i) => {
        projectile.update();
    });

    enemies.forEach((enemy,i) => {
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
        background();
        collisionObjects();
        updateObjects();
        
    }
    requestAnimationFrame(update);
}
update();
generateAsteroids();
generateEnemies();
createStars();