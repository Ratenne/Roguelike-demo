// ============================================
// 방 이동형 던전 게임 - 엔진 사용
// ============================================

// ========== 방(룸) 시스템 ==========
class Room {
    constructor(id, name, theme, width, height) {
        this.id = id;
        this.name = name;
        this.theme = theme;  // 'forest', 'desert', 'dungeon', 'boss'
        this.width = width;
        this.height = height;
        this.enemies = [];
        this.powerups = [];
        this.obstacles = [];
        this.doors = {
            up: null, down: null, left: null, right: null
        };
        this.isCleared = false;
        this.isBossRoom = (theme === 'boss');
        this.bossDefeated = false;
    }
    
    addDoor(direction, roomId) {
        this.doors[direction] = roomId;
    }
    
    isComplete() {
        if (this.isBossRoom) {
            return this.bossDefeated;
        }
        return this.isCleared;
    }
}

// ========== 던전 데이터 ==========
const dungeon = {
    rooms: new Map(),
    currentRoomId: 'room_1_1',
    playerStartPos: { x: 0, y: 0 }
};

// 방 크기 (각 방은 독립된 월드)
const ROOM_WIDTH = 2500;
const ROOM_HEIGHT = 2000;

// ========== 방 생성 ==========
function createRooms() {
    // 3x3 그리드 방 생성
    const roomIds = [
        ['room_1_1', 'room_1_2', 'room_1_3'],
        ['room_2_1', 'room_2_2', 'room_2_3'],
        ['room_3_1', 'room_3_2', 'room_3_3']
    ];
    
    // 테마 설정
    const themes = {
        'room_1_1': 'forest', 'room_1_2': 'forest', 'room_1_3': 'forest',
        'room_2_1': 'dungeon', 'room_2_2': 'dungeon', 'room_2_3': 'dungeon',
        'room_3_1': 'desert', 'room_3_2': 'desert', 'room_3_3': 'boss'
    };
    
    // 방 이름
    const roomNames = {
        'room_1_1': '숲의 입구', 'room_1_2': '짙은 숲', 'room_1_3': '숲의 끝',
        'room_2_1': '지하 감옥 입구', 'room_2_2': '어둠의 감옥', 'room_2_3': '감옥 깊은 곳',
        'room_3_1': '모래 언덕', 'room_3_2': '폐허의 사원', 'room_3_3': '★ 마법사의 탑 ★'
    };
    
    // 방 객체 생성
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const id = roomIds[i][j];
            const room = new Room(id, roomNames[id], themes[id], ROOM_WIDTH, ROOM_HEIGHT);
            dungeon.rooms.set(id, room);
        }
    }
    
    // 문 연결 (좌표 기준)
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const id = roomIds[i][j];
            const room = dungeon.rooms.get(id);
            
            if (i > 0) room.addDoor('up', roomIds[i-1][j]);
            if (i < 2) room.addDoor('down', roomIds[i+1][j]);
            if (j > 0) room.addDoor('left', roomIds[i][j-1]);
            if (j < 2) room.addDoor('right', roomIds[i][j+1]);
        }
    }
    
    // 각 방에 콘텐츠 채우기
    for (let [id, room] of dungeon.rooms) {
        populateRoom(room);
    }
}

// 방에 콘텐츠 채우기
function populateRoom(room) {
    const theme = room.theme;
    const isBoss = (theme === 'boss');
    
    // 장애물 생성
    const obstacleCount = isBoss ? 10 : 25 + Math.floor(Math.random() * 20);
    for (let i = 0; i < obstacleCount; i++) {
        let type, color;
        if (theme === 'forest') {
            type = Math.random() > 0.6 ? 'tree' : 'bush';
        } else if (theme === 'desert') {
            type = Math.random() > 0.5 ? 'cactus' : 'rock';
        } else {
            type = Math.random() > 0.5 ? 'pillar' : 'crate';
        }
        
        room.obstacles.push({
            x: 100 + Math.random() * (room.width - 200),
            y: 100 + Math.random() * (room.height - 200),
            w: 18 + Math.random() * 20,
            h: 18 + Math.random() * 20,
            type: type
        });
    }
    
    // 적 생성 (보스방은 보스만)
    if (isBoss) {
        // 보스 생성
        room.enemies.push({
            x: room.width / 2,
            y: room.height / 2,
            size: 55,
            type: 'boss',
            hp: 8,
            maxHp: 8,
            bossName: '💀 그림자 마법사 💀',
            bobOffset: Math.random() * Math.PI * 2,
            attackPattern: 0,
            lastAttack: 0
        });
    } else {
        const enemyCount = 8 + Math.floor(Math.random() * 10);
        for (let i = 0; i < enemyCount; i++) {
            room.enemies.push({
                x: 150 + Math.random() * (room.width - 300),
                y: 150 + Math.random() * (room.height - 300),
                size: 28,
                type: 'balloon',
                hp: 1,
                bobOffset: Math.random() * Math.PI * 2,
                theme: theme
            });
        }
    }
    
    // 파워업 생성
    const powerupCount = isBoss ? 3 : 8 + Math.floor(Math.random() * 8);
    const codes = ['<JS/>', '{fn}', '=>', '</>', 'let', 'const', 'new', 'return', 'class', 'import'];
    for (let i = 0; i < powerupCount; i++) {
        room.powerups.push({
            x: 80 + Math.random() * (room.width - 160),
            y: 80 + Math.random() * (room.height - 160),
            size: 16,
            type: 'code',
            codeText: codes[Math.floor(Math.random() * codes.length)]
        });
    }
}

// ========== 방 전환 ==========
let isTransitioning = false;
let transitionAlpha = 0;
let targetRoomId = null;

function changeRoom(direction) {
    if (isTransitioning) return;
    
    const currentRoom = dungeon.rooms.get(dungeon.currentRoomId);
    const nextRoomId = currentRoom.doors[direction];
    
    if (!nextRoomId) return;
    
    // 보스방은 클리어 후에만 나갈 수 있음
    const nextRoom = dungeon.rooms.get(nextRoomId);
    if (currentRoom.isBossRoom && !currentRoom.bossDefeated) {
        showMessage("⚠️ 보스를 물리쳐야 나갈 수 있습니다!", "#ff6666");
        return;
    }
    
    // 다음 방이 잠겨있는지 확인 (일반 방은 클리어해야 이동 가능? 선택사항)
    // 여기서는 자유 이동 가능하게 함
    
    targetRoomId = nextRoomId;
    isTransitioning = true;
    transitionAlpha = 0;
    
    // 문으로 들어가는 위치 설정
    const doorPos = getDoorPosition(direction);
    dungeon.playerStartPos = doorPos;
}

function getDoorPosition(direction) {
    const positions = {
        'up': { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT - 100 },
        'down': { x: ROOM_WIDTH / 2, y: 100 },
        'left': { x: ROOM_WIDTH - 100, y: ROOM_HEIGHT / 2 },
        'right': { x: 100, y: ROOM_HEIGHT / 2 }
    };
    return positions[direction] || { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT / 2 };
}

function finishTransition() {
    dungeon.currentRoomId = targetRoomId;
    targetRoomId = null;
    
    // 새 방의 데이터를 엔진에 로드
    const newRoom = dungeon.rooms.get(dungeon.currentRoomId);
    
    // 엔진 월드 크기 업데이트
    game.worldWidth = newRoom.width;
    game.worldHeight = newRoom.height;
    
    // 엔티티 교체
    game.entities.enemies = newRoom.enemies;
    game.entities.powerups = newRoom.powerups;
    game.entities.obstacles = newRoom.obstacles;
    
    // 플레이어 위치 설정
    game.player.x = dungeon.playerStartPos.x;
    game.player.y = dungeon.playerStartPos.y;
    game.player.vx = 0;
    game.player.vy = 0;
    
    // 카메라 업데이트
    game.updateCamera();
    
    isTransitioning = false;
    
    // 방 테마에 따른 배경색 변경
    updateThemeColors(newRoom.theme);
    
    showMessage(`📍 ${newRoom.name}`, "#88ffaa");
}

function updateThemeColors(theme) {
    const colors = {
        'forest': { bg1: '#0a2f1a', bg2: '#1a4a2a', grid: '#2a6a3a' },
        'desert': { bg1: '#4a3a1a', bg2: '#6a5a2a', grid: '#8a7a4a' },
        'dungeon': { bg1: '#1a1a2a', bg2: '#2a2a3a', grid: '#3a3a5a' },
        'boss': { bg1: '#2a0a2a', bg2: '#4a1a4a', grid: '#6a2a6a' }
    };
    const c = colors[theme] || colors.dungeon;
    document.body.style.background = `linear-gradient(135deg, ${c.bg1}, ${c.bg2})`;
}

let floatingMessage = { text: "", color: "", timer: 0 };
function showMessage(msg, color = "#ffffff") {
    floatingMessage = { text: msg, color: color, timer: 2.0 };
}

// ========== 문 렌더링 ==========
function drawDoors(engine, room) {
    const ctx = engine.ctx;
    const camera = engine.camera;
    
    const doorSize = 50;
    const doorPositions = {
        up: { x: ROOM_WIDTH / 2 - doorSize/2, y: 20 },
        down: { x: ROOM_WIDTH / 2 - doorSize/2, y: ROOM_HEIGHT - doorSize - 20 },
        left: { x: 20, y: ROOM_HEIGHT / 2 - doorSize/2 },
        right: { x: ROOM_WIDTH - doorSize - 20, y: ROOM_HEIGHT / 2 - doorSize/2 }
    };
    
    for (let [dir, pos] of Object.entries(doorPositions)) {
        if (room.doors[dir]) {
            const nextRoomId = room.doors[dir];
            const nextRoom = dungeon.rooms.get(nextRoomId);
            const isLocked = (room.isBossRoom && !room.bossDefeated) || 
                            (nextRoom && nextRoom.isBossRoom && !nextRoom.bossDefeated && nextRoom !== room);
            
            const screen = engine.worldToScreen(pos.x, pos.y);
            if (screen.x + doorSize > 0 && screen.x < engine.width && 
                screen.y + doorSize > 0 && screen.y < engine.height) {
                
                // 문 그림
                ctx.fillStyle = isLocked ? "#8a3a3a" : "#aa8866";
                ctx.fillRect(screen.x, screen.y, doorSize, doorSize);
                ctx.fillStyle = isLocked ? "#aa5555" : "#ccaa88";
                ctx.fillRect(screen.x + 5, screen.y + 5, doorSize - 10, doorSize - 10);
                
                if (isLocked) {
                    ctx.fillStyle = "#ff6666";
                    ctx.font = "bold 20px monospace";
                    ctx.fillText("🔒", screen.x + 15, screen.y + 35);
                } else {
                    ctx.fillStyle = "#ffffaa";
                    ctx.font = "bold 24px monospace";
                    ctx.fillText("🚪", screen.x + 12, screen.y + 38);
                }
            }
        }
    }
}

// ========== 미니맵 렌더링 ==========
function drawMinimap(engine) {
    const ctx = engine.ctx;
    const mapX = engine.width - 160;
    const mapY = 80;
    const mapSize = 120;
    const cellSize = mapSize / 3;
    
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(mapX - 5, mapY - 5, mapSize + 10, mapSize + 10);
    ctx.strokeStyle = "#aaaaff";
    ctx.strokeRect(mapX - 5, mapY - 5, mapSize + 10, mapSize + 10);
    
    const roomIds = [
        ['room_1_1', 'room_1_2', 'room_1_3'],
        ['room_2_1', 'room_2_2', 'room_2_3'],
        ['room_3_1', 'room_3_2', 'room_3_3']
    ];
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const roomId = roomIds[i][j];
            const room = dungeon.rooms.get(roomId);
            const x = mapX + j * cellSize;
            const y = mapY + i * cellSize;
            
            // 방 색상
            if (room.isBossRoom) {
                ctx.fillStyle = room.bossDefeated ? "#aaffaa" : "#ff6666";
            } else if (room.isCleared) {
                ctx.fillStyle = "#66aa66";
            } else {
                ctx.fillStyle = "#445566";
            }
            
            ctx.fillRect(x, y, cellSize - 2, cellSize - 2);
            
            // 현재 방 강조
            if (roomId === dungeon.currentRoomId) {
                ctx.strokeStyle = "#ffff00";
                ctx.lineWidth = 3;
                ctx.strokeRect(x - 1, y - 1, cellSize, cellSize);
            }
            
            // 방 이름 (작게)
            ctx.fillStyle = "#ffffff";
            ctx.font = "8px monospace";
            ctx.fillText(room.name.substring(0, 2), x + 5, y + 12);
        }
    }
}

// ========== 보스 AI ==========
function updateBossAI(engine, boss, room) {
    const player = engine.player;
    const now = Date.now() / 1000;
    
    // 보스 움직임 (플레이어 따라다님)
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0.1 && dist < 400) {
        const move = 1.2;
        boss.x += (dx / dist) * move;
        boss.y += (dy / dist) * move;
    }
    
    // 경계 제한
    boss.x = Math.min(Math.max(boss.x, 80), room.width - 80);
    boss.y = Math.min(Math.max(boss.y, 80), room.height - 80);
    
    // 보스와 플레이어 충돌
    const playerRect = { x: player.x - player.size/2, y: player.y - player.size/2, w: player.size, h: player.size };
    const bossRect = { x: boss.x - boss.size/2, y: boss.y - boss.size/2, w: boss.size, h: boss.size };
    
    if (engine.rectCollide(playerRect, bossRect)) {
        if (player.invincibleFrames <= 0) {
            engine.addScore(-80);
            player.invincibleFrames = engine.settings.invincibleFrames;
            player.vx = (player.x - boss.x) * 1.5;
            player.vy = (player.y - boss.y) * 1.5;
        }
    }
}

// ========== 게임 초기화 ==========
createRooms();

// 첫 번째 방 데이터 로드
const startRoom = dungeon.rooms.get('room_1_1');
game.worldWidth = startRoom.width;
game.worldHeight = startRoom.height;
game.entities.enemies = startRoom.enemies;
game.entities.powerups = startRoom.powerups;
game.entities.obstacles = startRoom.obstacles;
game.player.x = ROOM_WIDTH / 2;
game.player.y = ROOM_HEIGHT / 2;
updateThemeColors(startRoom.theme);

// ========== 엔진 콜백 등록 ==========

// 업데이트 콜백
game.on('onUpdate', (engine) => {
    if (isTransitioning) {
        transitionAlpha += 0.05;
        if (transitionAlpha >= 1) {
            finishTransition();
        }
        return;
    }
    
    const currentRoom = dungeon.rooms.get(dungeon.currentRoomId);
    const enemies = engine.entities.enemies;
    const powerups = engine.entities.powerups;
    const player = engine.player;
    
    // 보스 처리
    let boss = enemies.find(e => e.type === 'boss');
    
    if (boss) {
        updateBossAI(engine, boss, currentRoom);
        
        // 공격으로 보스 데미지
        if (engine.input.action1 && engine.attackCooldown === 0) {
            engine.attackCooldown = engine.settings.attackCooldownMax;
            const distToBoss = Math.hypot(player.x - boss.x, player.y - boss.y);
            if (distToBoss < engine.settings.attackRange) {
                boss.hp--;
                engine.addScore(50);
                showMessage(`⚡ 데미지! (${boss.hp}/${boss.maxHp})`, "#ffaa66");
                
                if (boss.hp <= 0) {
                    const idx = enemies.indexOf(boss);
                    enemies.splice(idx, 1);
                    currentRoom.bossDefeated = true;
                    currentRoom.isCleared = true;
                    engine.addScore(1000);
                    showMessage(`🏆 보스 처치! +1000점 🏆`, "#ffaa44");
                }
            }
        }
    } else {
        // 일반 적 AI
        for (let e of enemies) {
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.1 && dist < 300) {
                const move = 0.65;
                e.x += (dx / dist) * move;
                e.y += (dy / dist) * move;
            }
            e.x = Math.min(Math.max(e.x, 15), engine.worldWidth - 15);
            e.y = Math.min(Math.max(e.y, 15), engine.worldHeight - 15);
            
            const playerRect = { x: player.x - player.size/2, y: player.y - player.size/2, w: player.size, h: player.size };
            const enemyRect = { x: e.x - e.size/2, y: e.y - e.size/2, w: e.size, h: e.size };
            if (engine.rectCollide(playerRect, enemyRect)) {
                if (player.invincibleFrames <= 0) {
                    engine.addScore(-40);
                    player.invincibleFrames = engine.settings.invincibleFrames;
                    player.vx = (player.x - e.x) * 1.2;
                    player.vy = (player.y - e.y) * 1.2;
                }
            }
        }
        
        // 일반 공격
        engine.updateAttack(
            enemies,
            (p, e) => Math.hypot(p.x - e.x, p.y - e.y),
            (killed) => {
                engine.addScore(100);
            }
        );
    }
    
    // 파워업 획득
    for (let i = 0; i < powerups.length; i++) {
        const p = powerups[i];
        const dist = Math.hypot(player.x - p.x, player.y - p.y);
        if (dist < player.size/2 + p.size/2) {
            powerups.splice(i, 1);
            engine.addScore(75);
            showMessage(`✨ 코드 획득! +75 ✨`, "#88ff88");
            i--;
        }
    }
    
    // 방 클리어 체크
    if (!currentRoom.isCleared && !boss && enemies.length === 0) {
        currentRoom.isCleared = true;
        showMessage(`🎉 방 클리어! +200점 🎉`, "#ffff88");
        engine.addScore(200);
    }
    
    // 문 충돌 체크 (방 이동)
    const doorSize = 50;
    const doorAreas = {
        up: { x: ROOM_WIDTH / 2 - doorSize/2, y: 20, w: doorSize, h: doorSize, dir: 'up' },
        down: { x: ROOM_WIDTH / 2 - doorSize/2, y: ROOM_HEIGHT - doorSize - 20, w: doorSize, h: doorSize, dir: 'down' },
        left: { x: 20, y: ROOM_HEIGHT / 2 - doorSize/2, w: doorSize, h: doorSize, dir: 'left' },
        right: { x: ROOM_WIDTH - doorSize - 20, y: ROOM_HEIGHT / 2 - doorSize/2, w: doorSize, h: doorSize, dir: 'right' }
    };
    
    for (let [_, door] of Object.entries(doorAreas)) {
        if (currentRoom.doors[door.dir]) {
            const playerRect = { x: player.x - player.size/2, y: player.y - player.size/2, w: player.size, h: player.size };
            const doorRect = { x: door.x, y: door.y, w: door.w, h: door.h };
            if (engine.rectCollide(playerRect, doorRect)) {
                changeRoom(door.dir);
                break;
            }
        }
    }
    
    // 자연 점수 증가
    engine.addScore(0.1);
    
    // 메시지 타이머
    if (floatingMessage.timer > 0) {
        floatingMessage.timer -= 0.016;
    }
});

// 렌더링 콜백
game.on('onRender', (engine) => {
    const ctx = engine.ctx;
    const currentRoom = dungeon.rooms.get(dungeon.currentRoomId);
    
    // 방 테마에 따른 추가 효과
    if (currentRoom.theme === 'forest') {
        ctx.fillStyle = "rgba(50,100,50,0.1)";
        ctx.fillRect(0, 0, engine.width, engine.height);
    } else if (currentRoom.theme === 'desert') {
        ctx.fillStyle = "rgba(150,120,50,0.1)";
        ctx.fillRect(0, 0, engine.width, engine.height);
    }
    
    // 풍선 적 렌더링
    for (let e of engine.entities.enemies) {
        if (e.type === 'boss') {
            // 보스 렌더링
            const screen = engine.worldToScreen(e.x - e.size/2, e.y - e.size/2);
            if (screen.x + e.size > 0 && screen.x < engine.width && 
                screen.y + e.size > 0 && screen.y < engine.height) {
                const bob = Math.sin(engine.frame * 0.03) * 3;
                
                ctx.shadowBlur = 15;
                ctx.fillStyle = "#aa44ff";
                ctx.beginPath();
                ctx.ellipse(screen.x + e.size/2, screen.y + e.size/3 + bob, e.size/2, e.size/2.2, 0, 0, Math.PI*2);
                ctx.fill();
                
                ctx.fillStyle = "#ff66ff";
                ctx.beginPath();
                ctx.ellipse(screen.x + e.size/2 - 8, screen.y + e.size/3 - 5 + bob, 7, 8, 0, 0, Math.PI*2);
                ctx.fill();
                
                ctx.font = "bold 14px monospace";
                ctx.fillStyle = "#ffffaa";
                ctx.fillText(e.bossName, screen.x + 5, screen.y - 8);
                
                // 체력바
                const hpPercent = e.hp / e.maxHp;
                ctx.fillStyle = "#aa3333";
                ctx.fillRect(screen.x, screen.y - 15, e.size, 6);
                ctx.fillStyle = "#33ff33";
                ctx.fillRect(screen.x, screen.y - 15, e.size * hpPercent, 6);
            }
        } else {
            // 일반 적
            const screen = engine.worldToScreen(e.x - e.size/2, e.y - e.size/2);
            if (screen.x + e.size > 0 && screen.x < engine.width && 
                screen.y + e.size > 0 && screen.y < engine.height) {
                const bob = Math.sin(engine.frame * 0.05 + e.bobOffset) * 2;
                
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.ellipse(screen.x + e.size/2, screen.y + e.size/3 + bob, e.size/2, e.size/2.3, 0, 0, Math.PI*2);
                
                if (e.theme === 'forest') ctx.fillStyle = "#5fbf5f";
                else if (e.theme === 'desert') ctx.fillStyle = "#bf8f4f";
                else ctx.fillStyle = "#ff5f7f";
                ctx.fill();
                
                ctx.fillStyle = "#ffccaa";
                ctx.beginPath();
                ctx.ellipse(screen.x + e.size/2 - 5, screen.y + e.size/3 - 3 + bob, 4, 5, 0, 0, Math.PI*2);
                ctx.fill();
                
                ctx.font = "bold 10px monospace";
                ctx.fillStyle = "#fff2b5";
                ctx.fillText("bug", screen.x + e.size/2 - 8, screen.y + e.size/3 + 4 + bob);
            }
        }
    }
    
    // 코드 파워업 렌더링
    for (let p of engine.entities.powerups) {
        const screen = engine.worldToScreen(p.x, p.y);
        if (screen.x + p.size > 0 && screen.x < engine.width && 
            screen.y + p.size > 0 && screen.y < engine.height) {
            ctx.fillStyle = "#44ffaa";
            ctx.shadowBlur = 8;
            ctx.fillRect(screen.x, screen.y, p.size, p.size);
            ctx.fillStyle = "#004d33";
            ctx.font = `bold ${Math.floor(p.size * 0.7)}px monospace`;
            ctx.fillText(p.codeText, screen.x+2, screen.y+12);
        }
    }
    
    // 문 그리기
    drawDoors(engine, currentRoom);
    
    // 미니맵
    drawMinimap(engine);
    
    // 방 정보 표시
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#ffdd88";
    ctx.fillText(`🏠 ${currentRoom.name}`, 20, 100);
    
    if (currentRoom.isBossRoom && !currentRoom.bossDefeated) {
        ctx.font = "bold 14px monospace";
        ctx.fillStyle = "#ff6666";
        ctx.fillText("⚔️ BOSS ROOM ⚔️", 20, 130);
    } else if (currentRoom.isCleared) {
        ctx.fillStyle = "#88ff88";
        ctx.fillText("✓ 방 클리어!", 20, 130);
    }
    
    // 팝업 메시지
    if (floatingMessage.timer > 0) {
        ctx.font = "bold 20px monospace";
        ctx.fillStyle = floatingMessage.color;
        ctx.shadowBlur = 8;
        ctx.fillText(floatingMessage.text, engine.width/2 - 150, engine.height/2 - 100);
    }
    
    // 페이드 효과 (방 전환 중)
    if (isTransitioning) {
        ctx.fillStyle = `rgba(0, 0, 0, ${transitionAlpha * 0.7})`;
        ctx.fillRect(0, 0, engine.width, engine.height);
    }
});

// UI 업데이트를 위한 추가 인터벌
setInterval(() => {
    if (!isTransitioning) {
        const room = dungeon.rooms.get(dungeon.currentRoomId);
        document.getElementById('coordsStatus').innerHTML = 
            `📍 ${Math.floor(game.player.x)}, ${Math.floor(game.player.y)} | 🎈적:${game.entities.enemies.length} | 💾코드:${game.entities.powerups.length} | 🏆점수:${Math.floor(game.score)}`;
    }
}, 100);

// 게임 시작
game.start();

// 리셋 버튼
document.getElementById('resetBtn').addEventListener('click', () => {
    location.reload();
});