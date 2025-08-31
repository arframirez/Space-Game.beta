import {Ship} from "./ship.js";    
import {Asteroid} from "./asteroid.js";
import { Label } from "./label.js";
import { Enemy } from "./enemy.js";
import { Star } from "./star.js";


const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const spritesheet = document.getElementById('spritesheet');
const font = window.getComputedStyle(document.body).fontFamily;
const fontWeight = window.getComputedStyle(document.body).fontWeight;
const menu = document.querySelector('.menu');
const score = document.querySelector('.score');
const btnMenu = document.querySelector('.play-game');

const limit = document.querySelector('.limit-shot');

canvas.width = 1000;
canvas.height = 600;
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
    for (let i = 0; i < 50; i++) {
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