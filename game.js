// ===============================
// ЛАБИРИНТ ПОГОНИ - GAME ENGINE
// ===============================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');

// Игровые константы
const GAME_CONFIG = {
    worldWidth: 1800,
    worldHeight: 1200,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    cellSize: 50,
    catchDistance: 45,
    roundTime: 120, // 2 минуты на раунд
    boosterLifetime: 15000, // 15 секунд
    boosterSpawnRate: 0.002
};

// Состояние игры
let gameState = {
    mode: 'start', // start, playing, ended
    startTime: 0,
    roundNumber: 1,
    winner: null,
    gameTime: 0
};

// Игроки
const players = {
    punk: {
        x: 100,
        y: 100,
        width: 35,
        height: 45,
        speed: 0,
        maxSpeed: 7,
        acceleration: 0.6,
        angle: 0,
        boosts: new Map(),
        trail: [],
        isGhost: false,
        ghostCooldown: 0,
        actionPressed: false
    },
    businessman: {
        x: GAME_CONFIG.worldWidth - 150,
        y: GAME_CONFIG.worldHeight - 150,
        width: 30,
        height: 40,
        speed: 0,
        maxSpeed: 6.5,
        acceleration: 0.5,
        angle: 0,
        boosts: new Map(),
        trail: [],
        isGhost: false,
        ghostCooldown: 0,
        actionPressed: false
    }
};

// Управление
const keys = {};
const controls = {
    punk: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        action: 'Slash'
    },
    businessman: {
        up: 'KeyW',
        down: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        action: 'KeyE'
    }
};

// Лабиринт и объекты
let maze = [];
let boosters = [];
let particles = [];
let walls = [];

// Типы бустеров
const BOOSTER_TYPES = {
    speed: {
        color: '#00ff88',
        glowColor: 'rgba(0, 255, 136, 0.8)',
        symbol: '⚡',
        name: 'Скорость',
        duration: 5000
    },
    ghost: {
        color: '#9c88ff',
        glowColor: 'rgba(156, 136, 255, 0.8)',
        symbol: '👻',
        name: 'Призрак',
        duration: 4000
    }
};

// ===============================
// СОБЫТИЯ И МУЗЫКА
// ===============================

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    e.preventDefault();
});

// ===============================
// ДИНАМИЧЕСКАЯ МУЗЫКАЛЬНАЯ СИСТЕМА
// ===============================

let audioContext = null;
let musicPlaying = false;
let baseOscillator = null;
let bassOscillator = null;
let tensionOscillator = null;
let gainNodes = {};
let lastDistance = 1000;
let musicIntensity = 0; // 0 = спокойно, 1 = максимальное напряжение

function initAudioSystem() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Создаем основные узлы
        gainNodes.master = audioContext.createGain();
        gainNodes.base = audioContext.createGain();
        gainNodes.bass = audioContext.createGain();
        gainNodes.tension = audioContext.createGain();
        
        // Подключаем к мастер выходу
        gainNodes.base.connect(gainNodes.master);
        gainNodes.bass.connect(gainNodes.master);
        gainNodes.tension.connect(gainNodes.master);
        gainNodes.master.connect(audioContext.destination);
        
        // Устанавливаем начальные уровни
        gainNodes.master.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNodes.base.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNodes.bass.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNodes.tension.gain.setValueAtTime(0, audioContext.currentTime);
        
        return true;
    } catch (e) {
        console.log('Audio not supported');
        return false;
    }
}

function startDynamicMusic() {
    if (!audioContext || musicPlaying) return;
    
    musicPlaying = true;
    
    // Супер веселая базовая мелодия
    function playBaseMelody() {
        if (!musicPlaying) return;
        
        // Очень веселые и быстрые ноты
        const happyNotes = [
            261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25,
            587.33, 659.25, 698.46, 783.99
        ];
        const noteIndex = Math.floor(Math.random() * happyNotes.length);
        const duration = 0.4 + Math.random() * 0.8; // Короткие ноты для веселости
        
        baseOscillator = audioContext.createOscillator();
        const envelope = audioContext.createGain();
        
        baseOscillator.connect(envelope);
        envelope.connect(gainNodes.base);
        
        baseOscillator.frequency.setValueAtTime(happyNotes[noteIndex], audioContext.currentTime);
        baseOscillator.type = 'square'; // Более яркий звук
        
        envelope.gain.setValueAtTime(0, audioContext.currentTime);
        envelope.gain.linearRampToValueAtTime(0.8, audioContext.currentTime + 0.05);
        envelope.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + duration);
        envelope.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration + 0.1);
        
        baseOscillator.start();
        baseOscillator.stop(audioContext.currentTime + duration + 0.1);
        
        setTimeout(playBaseMelody, (duration * 1000) + Math.random() * 800);
    }
    
    // Супер веселая басовая линия
    function playBassLine() {
        if (!musicPlaying) return;
        
        const funkyBass = [82.41, 98.00, 110.00, 123.47, 146.83, 164.81];
        const noteIndex = Math.floor(Math.random() * funkyBass.length);
        
        bassOscillator = audioContext.createOscillator();
        const envelope = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        bassOscillator.connect(filter);
        filter.connect(envelope);
        envelope.connect(gainNodes.bass);
        
        bassOscillator.frequency.setValueAtTime(funkyBass[noteIndex], audioContext.currentTime);
        bassOscillator.type = 'sawtooth';
        
        // Веселый фильтр
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, audioContext.currentTime);
        filter.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.2);
        
        envelope.gain.setValueAtTime(0, audioContext.currentTime);
        envelope.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.02);
        envelope.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
        
        bassOscillator.start();
        bassOscillator.stop(audioContext.currentTime + 0.3);
        
        setTimeout(playBassLine, 300 + Math.random() * 200);
    }
    
    // Напряжение - когда Саня близко к Лехе
    function playTensionLayer() {
        if (!musicPlaying) return;
        
        if (musicIntensity > 0.3) {
            // Пугающие диссонансные ноты
            const scaryNotes = [138.59, 155.56, 185.00, 207.65, 233.08, 277.18];
            const noteIndex = Math.floor(Math.random() * scaryNotes.length);
            
            tensionOscillator = audioContext.createOscillator();
            const envelope = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            tensionOscillator.connect(filter);
            filter.connect(envelope);
            envelope.connect(gainNodes.tension);
            
            tensionOscillator.frequency.setValueAtTime(scaryNotes[noteIndex], audioContext.currentTime);
            tensionOscillator.type = 'sawtooth';
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400 + musicIntensity * 800, audioContext.currentTime);
            filter.Q.setValueAtTime(10, audioContext.currentTime);
            
            envelope.gain.setValueAtTime(0, audioContext.currentTime);
            envelope.gain.linearRampToValueAtTime(musicIntensity * 0.6, audioContext.currentTime + 0.05);
            envelope.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
            
            tensionOscillator.start();
            tensionOscillator.stop(audioContext.currentTime + 0.8);
        }
        
        setTimeout(playTensionLayer, 200 + Math.random() * 300);
    }
    
    // Запускаем все слои
    playBaseMelody();
    setTimeout(playBassLine, 500);
    setTimeout(playTensionLayer, 1000);
}

function updateMusicIntensity(distance) {
    if (!audioContext || !musicPlaying) return;
    
    // Расстояние от 0 до 500 пикселей переводим в интенсивность от 1 до 0
    const maxDistance = 500;
    const newIntensity = Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
    
    // Плавное изменение интенсивности
    musicIntensity = musicIntensity * 0.8 + newIntensity * 0.2;
    
    if (gainNodes.tension) {
        gainNodes.tension.gain.linearRampToValueAtTime(
            musicIntensity * 0.8, 
            audioContext.currentTime + 0.1
        );
    }
    
    // Увеличиваем темп басов когда напряжение высокое
    if (gainNodes.bass) {
        const bassGain = 0.2 + musicIntensity * 0.3;
        gainNodes.bass.gain.linearRampToValueAtTime(
            bassGain, 
            audioContext.currentTime + 0.1
        );
    }
    
    lastDistance = distance;
}

function stopDynamicMusic() {
    musicPlaying = false;
    if (baseOscillator) baseOscillator.stop();
    if (bassOscillator) bassOscillator.stop();
    if (tensionOscillator) tensionOscillator.stop();
}

// Запуск фоновой музыки
function playBackgroundMusic() {
    const music = document.getElementById('backgroundMusic');
    music.volume = 0.1; // Уменьшаем громкость HTML audio
    music.play().catch(() => {
        // Если HTML audio не работает, используем динамическую музыку
        if (initAudioSystem()) {
            startDynamicMusic();
        }
    });
    
    // В любом случае запускаем динамическую музыку
    if (initAudioSystem()) {
        startDynamicMusic();
    }
}

// ===============================
// ГЕНЕРАЦИЯ ЛАБИРИНТА
// ===============================

function generateMaze() {
    const cols = Math.floor(GAME_CONFIG.worldWidth / GAME_CONFIG.cellSize);
    const rows = Math.floor(GAME_CONFIG.worldHeight / GAME_CONFIG.cellSize);
    
    // Инициализация сетки
    maze = Array(rows).fill().map(() => Array(cols).fill(1));
    walls = [];
    
    // Алгоритм рекурсивного обхода для создания лабиринта
    function carvePassages(x, y) {
        maze[y][x] = 0;
        
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ].sort(() => Math.random() - 0.5);
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && maze[ny][nx] === 1) {
                maze[y + dy/2][x + dx/2] = 0;
                carvePassages(nx, ny);
            }
        }
    }
    
    // Начинаем с верхнего левого угла
    carvePassages(1, 1);
    
    // Убеждаемся что стартовые позиции свободны
    maze[1][1] = 0;
    maze[1][2] = 0;
    maze[2][1] = 0;
    
    const endX = cols - 2;
    const endY = rows - 2;
    maze[endY][endX] = 0;
    maze[endY-1][endX] = 0;
    maze[endY][endX-1] = 0;
    
    // Создаем дополнительные проходы для более интересного геймплея
    for (let i = 0; i < Math.floor(rows * cols * 0.08); i++) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        if (maze[y] && maze[y][x] !== undefined) {
            maze[y][x] = 0;
        }
    }
    
    // Конвертируем в стены для коллизий
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (maze[y][x] === 1) {
                walls.push({
                    x: x * GAME_CONFIG.cellSize,
                    y: y * GAME_CONFIG.cellSize,
                    width: GAME_CONFIG.cellSize,
                    height: GAME_CONFIG.cellSize
                });
            }
        }
    }
}

// ===============================
// ЧАСТИЦЫ И ЭФФЕКТЫ
// ===============================

class Particle {
    constructor(x, y, color, velocity, life, size = 3) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.gravity = Math.random() * 0.5;
    }

    update(deltaTime) {
        this.x += this.velocity.x * deltaTime / 16.67;
        this.y += this.velocity.y * deltaTime / 16.67;
        this.velocity.y += this.gravity;
        this.life -= deltaTime;
        this.size *= 0.99;
    }

    draw(ctx, offsetX, offsetY) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createParticles(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = Math.random() * 150 + 50;
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        particles.push(new Particle(x, y, color, velocity, 2000, Math.random() * 6 + 2));
    }
}

// ===============================
// КОЛЛИЗИИ
// ===============================

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkWallCollision(player, newX, newY) {
    if (player.isGhost) return false;
    
    const testRect = {
        x: newX + 3, // Небольшой отступ
        y: newY + 3,
        width: player.width - 6,
        height: player.height - 6
    };
    
    return walls.some(wall => checkCollision(testRect, wall));
}

function getDistanceBetweenPlayers() {
    const dx = players.punk.x - players.businessman.x;
    const dy = players.punk.y - players.businessman.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// ===============================
// БУСТЕРЫ
// ===============================

function spawnBooster() {
    const cols = Math.floor(GAME_CONFIG.worldWidth / GAME_CONFIG.cellSize);
    const rows = Math.floor(GAME_CONFIG.worldHeight / GAME_CONFIG.cellSize);
    
    let attempts = 0;
    let x, y;
    
    do {
        const col = Math.floor(Math.random() * cols);
        const row = Math.floor(Math.random() * rows);
        x = col * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 - 15;
        y = row * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 - 15;
        attempts++;
    } while (maze[Math.floor(y / GAME_CONFIG.cellSize)] && 
             maze[Math.floor(y / GAME_CONFIG.cellSize)][Math.floor(x / GAME_CONFIG.cellSize)] === 1 && 
             attempts < 50);
    
    const types = Object.keys(BOOSTER_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    
    boosters.push({
        x: x,
        y: y,
        width: 30,
        height: 30,
        type: type,
        collected: false,
        rotation: 0,
        pulse: 0,
        lifetime: GAME_CONFIG.boosterLifetime,
        opacity: 1
    });
}

function updateBoosters(deltaTime) {
    boosters = boosters.filter(booster => {
        if (booster.collected) return false;
        
        booster.lifetime -= deltaTime;
        booster.rotation += 0.05;
        booster.pulse += 0.1;
        
        // Эффект исчезновения
        if (booster.lifetime < 3000) {
            booster.opacity = booster.lifetime / 3000;
        }
        
        return booster.lifetime > 0;
    });
}

function checkBoosterCollisions(player) {
    boosters.forEach(booster => {
        if (!booster.collected && checkCollision(player, booster)) {
            booster.collected = true;
            
            const boosterType = BOOSTER_TYPES[booster.type];
            
            // Применяем эффект
            player.boosts.set(booster.type, {
                duration: boosterType.duration,
                startTime: Date.now()
            });
            
            // Создаем частицы
            createParticles(
                booster.x + booster.width / 2,
                booster.y + booster.height / 2,
                boosterType.color,
                20
            );
        }
    });
}

// ===============================
// ОБНОВЛЕНИЕ ИГРОКА
// ===============================

function updatePlayer(player, controls, deltaTime) {
    // Обновляем кулдаун призрака
    if (player.ghostCooldown > 0) {
        player.ghostCooldown -= deltaTime;
    }
    
    // Обработка кнопки действия для призрака
    if (keys[controls.action] && !player.actionPressed && player.ghostCooldown <= 0) {
        player.actionPressed = true;
        player.ghostCooldown = 5000; // 5 секунд кулдаун
        
        // Активируем призрака на 1 секунду
        player.boosts.set('ghost', {
            duration: 1000,
            startTime: Date.now()
        });
        
        // Создаем эффект активации
        createParticles(
            player.x + player.width / 2,
            player.y + player.height / 2,
            '#9c88ff',
            15
        );
    }
    
    // Сброс флага кнопки когда отпускают
    if (!keys[controls.action]) {
        player.actionPressed = false;
    }
    
    // Обновляем бустеры
    for (const [type, boost] of player.boosts) {
        boost.duration -= deltaTime;
        if (boost.duration <= 0) {
            player.boosts.delete(type);
        }
    }
    
    // Применяем эффекты бустеров
    player.maxSpeed = player === players.punk ? 7 : 6.5;
    player.isGhost = false;
    
    if (player.boosts.has('speed')) {
        player.maxSpeed *= 1.6;
    }
    if (player.boosts.has('ghost')) {
        player.isGhost = true;
    }
    
    // Управление
    let moveX = 0;
    let moveY = 0;
    
    if (keys[controls.left]) moveX -= 1;
    if (keys[controls.right]) moveX += 1;
    if (keys[controls.up]) moveY -= 1;
    if (keys[controls.down]) moveY += 1;
    
    // Нормализация диагонального движения
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.707;
        moveY *= 0.707;
    }
    
    // Применение движения
    if (moveX !== 0 || moveY !== 0) {
        player.speed = Math.min(player.speed + player.acceleration, player.maxSpeed);
        player.angle = Math.atan2(moveY, moveX);
    } else {
        player.speed = Math.max(player.speed - player.acceleration * 2, 0);
    }
    
    // Вычисление новой позиции с более мягкой проверкой коллизий
    const moveSpeed = player.speed;
    const newX = player.x + Math.cos(player.angle) * moveSpeed;
    const newY = player.y + Math.sin(player.angle) * moveSpeed;
    
    // Проверка коллизий со стенами с отступом
    const margin = 2; // Отступ от стен
    if (!checkWallCollision(player, newX, player.y)) {
        player.x = newX;
    } else {
        // Попытка скольжения по стене
        if (!checkWallCollision(player, player.x + Math.cos(player.angle) * moveSpeed * 0.3, player.y)) {
            player.x += Math.cos(player.angle) * moveSpeed * 0.3;
        }
    }
    
    if (!checkWallCollision(player, player.x, newY)) {
        player.y = newY;
    } else {
        // Попытка скольжения по стене
        if (!checkWallCollision(player, player.x, player.y + Math.sin(player.angle) * moveSpeed * 0.3)) {
            player.y += Math.sin(player.angle) * moveSpeed * 0.3;
        }
    }
    
    // Проверка на застревание в стене после призрака
    if (!player.isGhost && checkWallCollision(player, player.x, player.y)) {
        // Медленно выталкиваем игрока из стены
        const directions = [
            {x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0},
            {x: -1, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: 1, y: 1}
        ];
        
        for (const dir of directions) {
            const testX = player.x + dir.x * 2;
            const testY = player.y + dir.y * 2;
            
            if (!checkWallCollision(player, testX, testY)) {
                player.x = testX;
                player.y = testY;
                break;
            }
        }
    }
    
    // Ограничения мира
    player.x = Math.max(0, Math.min(GAME_CONFIG.worldWidth - player.width, player.x));
    player.y = Math.max(0, Math.min(GAME_CONFIG.worldHeight - player.height, player.y));
    
    // Обновление следа
    if (player.speed > 2) {
        player.trail.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            life: 800,
            opacity: 1
        });
    }
    
    player.trail = player.trail.filter(point => {
        point.life -= deltaTime;
        point.opacity = point.life / 800;
        return point.life > 0;
    });
}

// ===============================
// ОТРИСОВКА
// ===============================

function drawBackground(ctx, offsetX, offsetY) {
    // Градиентный фон
    const gradient = ctx.createRadialGradient(
        GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2, 0,
        GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2, GAME_CONFIG.canvasWidth
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f23');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);
}

function drawMaze(ctx, offsetX, offsetY) {
    walls.forEach(wall => {
        const x = wall.x - offsetX;
        const y = wall.y - offsetY;
        
        if (x > -GAME_CONFIG.cellSize && x < GAME_CONFIG.canvasWidth && 
            y > -GAME_CONFIG.cellSize && y < GAME_CONFIG.canvasHeight) {
            
            // Градиент для стен
            const gradient = ctx.createLinearGradient(x, y, x + wall.width, y + wall.height);
            gradient.addColorStop(0, '#2c3e50');
            gradient.addColorStop(0.5, '#34495e');
            gradient.addColorStop(1, '#2c3e50');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, wall.width, wall.height);
            
            // Неоновые границы
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 10;
            ctx.strokeRect(x, y, wall.width, wall.height);
            ctx.shadowBlur = 0;
        }
    });
}

function drawPlayer(ctx, player, offsetX, offsetY) {
    const x = player.x + player.width / 2 - offsetX;
    const y = player.y + player.height / 2 - offsetY;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.angle + Math.PI / 2);
    
    // Эффект призрака
    if (player.isGhost) {
        ctx.globalAlpha = 0.6;
        ctx.shadowColor = '#9c88ff';
        ctx.shadowBlur = 20;
    }
    
    if (player === players.punk) {
        // Панк с ирокезом - увеличенный и детализированный
        // Тело
        ctx.fillStyle = '#1e3799';
        ctx.fillRect(-18, -12, 36, 40);
        
        // Голова
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-15, -30, 30, 25);
        
        // Ирокез
        ctx.fillStyle = '#2c2c54';
        ctx.fillRect(-4, -42, 8, 18);
        
        // Детали лица
        ctx.fillStyle = '#000';
        ctx.fillRect(-10, -25, 4, 4);
        ctx.fillRect(6, -25, 4, 4);
        
        // Рот
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-6, -18, 12, 3);
        
        // Руки
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-25, -8, 10, 18);
        ctx.fillRect(15, -8, 10, 18);
        
        // Ноги
        ctx.fillStyle = '#2c2c54';
        ctx.fillRect(-12, 28, 10, 18);
        ctx.fillRect(2, 28, 10, 18);
        
    } else {
        // Бизнесмен - детализированный
        // Тело (костюм)
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-15, -10, 30, 38);
        
        // Рубашка
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(-12, -8, 24, 30);
        
        // Галстук
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-3, -8, 6, 25);
        
        // Голова
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-12, -27, 24, 22);
        
        // Волосы
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-12, -30, 24, 10);
        
        // Борода
        ctx.fillStyle = '#654321';
        ctx.fillRect(-10, -10, 20, 8);
        
        // Глаза
        ctx.fillStyle = '#000';
        ctx.fillRect(-8, -22, 3, 3);
        ctx.fillRect(5, -22, 3, 3);
        
        // Руки
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-20, -5, 8, 15);
        ctx.fillRect(12, -5, 8, 15);
        
        // Ноги
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-10, 28, 8, 15);
        ctx.fillRect(2, 28, 8, 15);
    }
    
    ctx.restore();
    
    // След
    player.trail.forEach(point => {
        ctx.save();
        ctx.globalAlpha = point.opacity * 0.7;
        ctx.fillStyle = player === players.punk ? '#ff4757' : '#3742fa';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(point.x - offsetX, point.y - offsetY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawBooster(ctx, booster, offsetX, offsetY) {
    if (booster.collected) return;
    
    const x = booster.x + booster.width / 2 - offsetX;
    const y = booster.y + booster.height / 2 - offsetY;
    
    if (x < -50 || x > GAME_CONFIG.canvasWidth + 50 || 
        y < -50 || y > GAME_CONFIG.canvasHeight + 50) return;
    
    const boosterType = BOOSTER_TYPES[booster.type];
    const size = 15 + Math.sin(booster.pulse) * 4;
    
    ctx.save();
    ctx.globalAlpha = booster.opacity;
    ctx.translate(x, y);
    ctx.rotate(booster.rotation);
    
    // Свечение
    ctx.shadowColor = boosterType.glowColor;
    ctx.shadowBlur = 25;
    
    // Основной круг
    ctx.fillStyle = boosterType.color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Внутренний символ
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boosterType.symbol, 0, 0);
    
    ctx.restore();
}

function drawMinimap() {
    const scale = 0.11;
    minimapCtx.clearRect(0, 0, 200, 150);
    
    // Фон миникарты
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    minimapCtx.fillRect(0, 0, 200, 150);
    
    // Рамка
    minimapCtx.strokeStyle = '#00ff88';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(1, 1, 198, 148);
    
    // Стены
    minimapCtx.fillStyle = '#334155';
    walls.forEach(wall => {
        minimapCtx.fillRect(
            wall.x * scale,
            wall.y * scale,
            Math.max(1, wall.width * scale),
            Math.max(1, wall.height * scale)
        );
    });
    
    // Бустеры
    minimapCtx.fillStyle = '#fbbf24';
    boosters.forEach(booster => {
        if (!booster.collected) {
            minimapCtx.fillRect(
                booster.x * scale - 1,
                booster.y * scale - 1,
                2, 2
            );
        }
    });
    
    // Панк Саня (красная точка)
    minimapCtx.fillStyle = '#ef4444';
    minimapCtx.shadowColor = '#ef4444';
    minimapCtx.shadowBlur = 8;
    minimapCtx.beginPath();
    minimapCtx.arc(
        players.punk.x * scale,
        players.punk.y * scale,
        4, 0, Math.PI * 2
    );
    minimapCtx.fill();
    minimapCtx.shadowBlur = 0;
    
    // Бизнесмен Леха (синяя точка)
    minimapCtx.fillStyle = '#3b82f6';
    minimapCtx.shadowColor = '#3b82f6';
    minimapCtx.shadowBlur = 8;
    minimapCtx.beginPath();
    minimapCtx.arc(
        players.businessman.x * scale,
        players.businessman.y * scale,
        4, 0, Math.PI * 2
    );
    minimapCtx.fill();
    minimapCtx.shadowBlur = 0;
}

function updateUI() {
    // Обновление бустеров в UI
    const player1Boosts = document.getElementById('player1Boosts');
    const player2Boosts = document.getElementById('player2Boosts');
    
    player1Boosts.innerHTML = '';
    player2Boosts.innerHTML = '';
    
    for (const [type, boost] of players.punk.boosts) {
        const timeLeft = Math.ceil(boost.duration / 1000);
        player1Boosts.innerHTML += `<span>${BOOSTER_TYPES[type].symbol} ${timeLeft}с</span>`;
    }
    
    for (const [type, boost] of players.businessman.boosts) {
        const timeLeft = Math.ceil(boost.duration / 1000);
        player2Boosts.innerHTML += `<span>${BOOSTER_TYPES[type].symbol} ${timeLeft}с</span>`;
    }
    
    // Обновление таймера
    const elapsed = Math.floor(gameState.gameTime / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('gameTimer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Обновление индикаторов кулдауна призрака
    const punkCooldownBar = document.getElementById('punkCooldown');
    const businessmanCooldownBar = document.getElementById('businessmanCooldown');
    
    if (punkCooldownBar) {
        const punkCooldownPercent = Math.max(0, (5000 - players.punk.ghostCooldown) / 5000 * 100);
        punkCooldownBar.style.width = `${punkCooldownPercent}%`;
    }
    
    if (businessmanCooldownBar) {
        const businessmanCooldownPercent = Math.max(0, (5000 - players.businessman.ghostCooldown) / 5000 * 100);
        businessmanCooldownBar.style.width = `${businessmanCooldownPercent}%`;
    }
    
    // Обновление индикатора напряжения
    const tensionFill = document.getElementById('tensionFill');
    const tensionIndicator = document.getElementById('tensionIndicator');
    
    if (tensionFill && tensionIndicator) {
        const tensionPercent = musicIntensity * 100;
        tensionFill.style.width = `${tensionPercent}%`;
        
        if (musicIntensity > 0.7) {
            tensionIndicator.classList.add('tension-high');
        } else {
            tensionIndicator.classList.remove('tension-high');
        }
    }
}

// ===============================
// ОСНОВНОЙ ИГРОВОЙ ЦИКЛ
// ===============================

let lastTime = 0;

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (gameState.mode === 'playing') {
        gameState.gameTime += deltaTime;
        
        // Обновление игроков
        updatePlayer(players.punk, controls.punk, deltaTime);
        updatePlayer(players.businessman, controls.businessman, deltaTime);
        
        // Проверка бустеров
        checkBoosterCollisions(players.punk);
        checkBoosterCollisions(players.businessman);
        
        // Обновление бустеров
        updateBoosters(deltaTime);
        
        // Создание новых бустеров
        if (Math.random() < GAME_CONFIG.boosterSpawnRate) {
            spawnBooster();
        }
        
        // Обновление частиц
        particles = particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        
        // Проверка победы
        const distance = getDistanceBetweenPlayers();
        if (distance < GAME_CONFIG.catchDistance) {
            endGame('punk');
        } else if (gameState.gameTime > GAME_CONFIG.roundTime * 1000) {
            endGame('businessman');
        }
        
        // Обновление динамической музыки
        updateMusicIntensity(distance);
        
        updateUI();
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

function render() {
    // Разделенный экран
    const splitY = GAME_CONFIG.canvasHeight / 2;
    
    // Верхняя половина - вид панка
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, GAME_CONFIG.canvasWidth, splitY);
    ctx.clip();
    
    const offsetX1 = players.punk.x - GAME_CONFIG.canvasWidth / 2;
    const offsetY1 = players.punk.y - splitY / 2;
    
    drawBackground(ctx, offsetX1, offsetY1);
    drawMaze(ctx, offsetX1, offsetY1);
    
    boosters.forEach(booster => drawBooster(ctx, booster, offsetX1, offsetY1));
    particles.forEach(particle => particle.draw(ctx, offsetX1, offsetY1));
    
    drawPlayer(ctx, players.punk, offsetX1, offsetY1);
    drawPlayer(ctx, players.businessman, offsetX1, offsetY1);
    
    ctx.restore();
    
    // Разделительная линия
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(GAME_CONFIG.canvasWidth, splitY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Нижняя половина - вид бизнесмена
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, splitY, GAME_CONFIG.canvasWidth, splitY);
    ctx.clip();
    
    const offsetX2 = players.businessman.x - GAME_CONFIG.canvasWidth / 2;
    const offsetY2 = players.businessman.y - splitY / 2 - splitY;
    
    drawBackground(ctx, offsetX2, offsetY2);
    drawMaze(ctx, offsetX2, offsetY2);
    
    boosters.forEach(booster => drawBooster(ctx, booster, offsetX2, offsetY2));
    particles.forEach(particle => particle.draw(ctx, offsetX2, offsetY2));
    
    drawPlayer(ctx, players.punk, offsetX2, offsetY2);
    drawPlayer(ctx, players.businessman, offsetX2, offsetY2);
    
    ctx.restore();
    
    // Миникарта
    if (gameState.mode === 'playing') {
        drawMinimap();
    }
}

// ===============================
// УПРАВЛЕНИЕ ИГРОЙ
// ===============================

function startGame() {
    document.getElementById('startScreen').classList.add('hide');
    gameState.mode = 'playing';
    gameState.startTime = Date.now();
    gameState.gameTime = 0;
    
    // Генерация нового лабиринта
    generateMaze();
    
    // Случайные стартовые позиции для игроков
    function getRandomSpawnPoint() {
        let x, y;
        do {
            x = Math.random() * (GAME_CONFIG.worldWidth - 100) + 50;
            y = Math.random() * (GAME_CONFIG.worldHeight - 100) + 50;
        } while (checkWallCollision({x: x, y: y, width: 35, height: 40}, x, y));
        return {x, y};
    }
    
    // Обеспечиваем что игроки появляются на разумном расстоянии друг от друга
    const punkSpawn = getRandomSpawnPoint();
    players.punk.x = punkSpawn.x;
    players.punk.y = punkSpawn.y;
    
    let businessmanSpawn;
    do {
        businessmanSpawn = getRandomSpawnPoint();
    } while (Math.hypot(businessmanSpawn.x - punkSpawn.x, businessmanSpawn.y - punkSpawn.y) < 300);
    
    players.businessman.x = businessmanSpawn.x;
    players.businessman.y = businessmanSpawn.y;
    
    // Очистка бустеров и частиц
    boosters = [];
    particles = [];
    
    // Очистка эффектов
    players.punk.boosts.clear();
    players.businessman.boosts.clear();
    players.punk.trail = [];
    players.businessman.trail = [];
    
    // Сброс кулдаунов
    players.punk.ghostCooldown = 0;
    players.businessman.ghostCooldown = 0;
    players.punk.actionPressed = false;
    players.businessman.actionPressed = false;
    
    // Стартовый бустер призрак для Сани на 10 секунд
    players.punk.boosts.set('ghost', {
        duration: 10000,
        startTime: Date.now()
    });
    
    // Создание начальных бустеров
    for (let i = 0; i < 8; i++) {
        spawnBooster();
    }
    
    playBackgroundMusic();
}

function endGame(winner) {
    gameState.mode = 'ended';
    gameState.winner = winner;
    
    // Останавливаем динамическую музыку
    stopDynamicMusic();
    
    const endScreen = document.getElementById('endScreen');
    const winnerText = document.getElementById('winnerText');
    const gameResult = document.getElementById('gameResult');
    
    // Создаем canvas для отрисовки лица победителя
    const winnerFaceCanvas = document.createElement('canvas');
    winnerFaceCanvas.className = 'evil-face';
    winnerFaceCanvas.width = 200;
    winnerFaceCanvas.height = 200;
    winnerFaceCanvas.style.width = '200px';
    winnerFaceCanvas.style.height = '200px';
    
    const faceCtx = winnerFaceCanvas.getContext('2d');
    
    if (winner === 'punk') {
        winnerText.textContent = '🔥 САНЯ ПОБЕДИЛ!';
        winnerText.style.color = '#ff4757';
        gameResult.textContent = `Саня поймал Леху за ${Math.floor(gameState.gameTime / 1000)} секунд!`;
        
        // Рисуем злорадное лицо Сани
        drawPunkWinnerFace(faceCtx);
        winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #ff4757)';
    } else {
        winnerText.textContent = '💼 ЛЕХА ВЫЖИЛ!';
        winnerText.style.color = '#3742fa';
        gameResult.textContent = 'Леха успешно убегал от Сани целых 2 минуты!';
        
        // Рисуем хитрое лицо Лехи
        drawBusinessmanWinnerFace(faceCtx);
        winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #3742fa)';
    }
    
    // Добавляем лицо к экрану
    document.body.appendChild(winnerFaceCanvas);
    
    // Удаляем лицо через 3 секунды
    setTimeout(() => {
        if (winnerFaceCanvas.parentNode) {
            winnerFaceCanvas.parentNode.removeChild(winnerFaceCanvas);
        }
    }, 3000);
    
    endScreen.classList.remove('hide');
    
    // Создание праздничных частиц
    for (let i = 0; i < 100; i++) {
        const color = winner === 'punk' ? '#ff4757' : '#3742fa';
        createParticles(
            Math.random() * GAME_CONFIG.worldWidth,
            Math.random() * GAME_CONFIG.worldHeight,
            color,
            1
        );
    }
}

function nextRound() {
    document.getElementById('endScreen').classList.add('hide');
    gameState.roundNumber++;
    startGame();
}

function restartGame() {
    document.getElementById('endScreen').classList.add('hide');
    gameState.roundNumber = 1;
    startGame();
}

// ===============================
// ЛИЦА ПОБЕДИТЕЛЕЙ
// ===============================

function drawPunkWinnerFace(ctx) {
    const centerX = 100;
    const centerY = 100;
    
    // Лицо
    ctx.fillStyle = '#feca57';
    ctx.fillRect(centerX - 40, centerY - 35, 80, 70);
    
    // Ирокез
    ctx.fillStyle = '#ff6b7a';
    ctx.fillRect(centerX - 20, centerY - 60, 40, 30);
    ctx.fillRect(centerX - 15, centerY - 75, 30, 20);
    ctx.fillRect(centerX - 10, centerY - 85, 20, 15);
    
    // Глаза - злорадные
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(centerX - 25, centerY - 20, 8, 12);
    ctx.fillRect(centerX + 17, centerY - 20, 8, 12);
    
    // Злая улыбка
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(centerX - 20, centerY + 5, 40, 8);
    // Уголки улыбки вверх
    ctx.fillRect(centerX - 25, centerY + 1, 5, 5);
    ctx.fillRect(centerX + 20, centerY + 1, 5, 5);
    
    // Куртка
    ctx.fillStyle = '#1e3799';
    ctx.fillRect(centerX - 45, centerY + 35, 90, 50);
    
    // Анимация мигания (случайная)
    if (Math.random() > 0.7) {
        ctx.fillStyle = '#feca57';
        ctx.fillRect(centerX - 25, centerY - 20, 8, 6);
        ctx.fillRect(centerX + 17, centerY - 20, 8, 6);
    }
}

function drawBusinessmanWinnerFace(ctx) {
    const centerX = 100;
    const centerY = 100;
    
    // Лицо
    ctx.fillStyle = '#f8c291';
    ctx.fillRect(centerX - 35, centerY - 30, 70, 60);
    
    // Волосы (темные)
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(centerX - 35, centerY - 45, 70, 20);
    
    // Борода
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(centerX - 25, centerY + 15, 50, 20);
    ctx.fillRect(centerX - 20, centerY + 30, 40, 10);
    
    // Глаза - хитрые
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(centerX - 20, centerY - 15, 6, 8);
    ctx.fillRect(centerX + 14, centerY - 15, 6, 8);
    
    // Хитрая улыбка
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(centerX - 15, centerY + 5, 30, 6);
    // Одна сторона улыбки выше
    ctx.fillRect(centerX + 15, centerY + 2, 3, 3);
    
    // Костюм
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(centerX - 40, centerY + 35, 80, 50);
    
    // Галстук
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(centerX - 8, centerY + 30, 16, 40);
    
    // Анимация подмигивания
    if (Math.random() > 0.8) {
        ctx.fillStyle = '#f8c291';
        ctx.fillRect(centerX + 14, centerY - 15, 6, 4);
    }
}

// Запуск игры
requestAnimationFrame(gameLoop);