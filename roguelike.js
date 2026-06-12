// ============================================
// 로그라이크 게임 - 던전 크롤러
// ============================================

// 게임 엔진 생성
const game = new GameEngine('gameCanvas', {
    width: 1000,
    height: 600,
    worldWidth: 1800,
    worldHeight: 1800,
    playerSize: 24
});

// ========== 전역 변수 ==========
let currentFloor = 1;
let isLevelUpMenuOpen = false;
let availableSkills = [];
let floorClearBonus = 0;

// ========== 로그라이크 데이터 ==========
const enemyTypes = [
    { name: '🎈 꼬마 풍선', baseHp: 25, baseDamage: 12, baseExp: 35, size: 28, color: '#ff6f8f', speed: 0.9 },
    { name: '👻 그림자 슬라임', baseHp: 40, baseDamage: 15, baseExp: 50, size: 32, color: '#8f6fff', speed: 0.7 },
    { name: '🔥 불꽃 정령', baseHp: 30, baseDamage: 18, baseExp: 45, size: 26, color: '#ff8f4f', speed: 1.1 },
    { name: '💀 스켈레톤', baseHp: 55, baseDamage: 14, baseExp: 65, size: 30, color: '#bfbfbf', speed: 0.8 },
    { name: '🧙 마법사 견습생', baseHp: 45, baseDamage: 20, baseExp: 70, size: 28, color: '#8f5fff', speed: 0.6 }
];

const bossTypes = [
    { name: '👑 그림자 군주', baseHp: 180, baseDamage: 28, baseExp: 400, size: 55, color: '#af4fff', speed: 0.9 },
    { name: '🐉 화염 드래곤', baseHp: 200, baseDamage: 32, baseExp: 450, size: 58, color: '#ff4f2f', speed: 0.8 }
];

const skills = [
    { id: 'dmg_up', name: '🗡️ 공격력 증가', desc: '공격력 +5', effect: (p) => p.attackDamage += 5 },
    { id: 'def_up', name: '🛡️ 방어력 증가', desc: '방어력 +3', effect: (p) => p.defense += 3 },
    { id: 'hp_up', name: '❤️ 체력 증가', desc: '최대 체력 +20, 회복', effect: (p) => { p.maxHp += 20; p.hp += 20; } },
    { id: 'speed_up', name: '⚡ 이동 속도', desc: '이동 속도 +0.8', effect: (p) => p.moveSpeed += 0.8 },
    { id: 'attack_speed', name: '🗡️ 공격 속도', desc: '공격 쿨다운 -2', effect: (p) => p.attackSpeed = Math.max(4, p.attackSpeed - 2) },
    { id: 'exp_up', name: '📖 경험치 획득', desc: '획득 경험치 +20%', effect: (p) => p.expBonus = (p.expBonus || 0) + 0.2 }
];

// ========== 절차적 방 생성 ==========
function generateFloor(floorNum) {
    // 월드 크기 (층이 높아질수록 넓어짐)
    const worldSize = 1500 + Math.min(500, floorNum * 50);
    game.worldWidth = worldSize;
    game.worldHeight = worldSize;
    
    // 엔티티 초기화
    game.entities.enemies = [];
    game.entities.powerups = [];
    game.entities.obstacles = [];
    
    // 장애물 생성 (랜덤)
    const obstacleCount = 20 + Math.floor(Math.random() * 20);
    for (let i = 0; i < obstacleCount; i++) {
        game.entities.obstacles.push({
            x: 50 + Math.random() * (worldSize - 100),
            y: 50 + Math.random() * (worldSize - 100),
            w: 15 + Math.random() * 20,
            h: 15 + Math.random() * 20,
            type: Math.random() > 0.6 ? 'rock' : 'crate'
        });
    }
    
    // 적 생성 (층이 높을수록 강하고 많아짐)
    const enemyBaseCount = 8 + Math.floor(floorNum * 1.2);
    const enemyCount = Math.min(25, enemyBaseCount + Math.floor(Math.random() * 5));
    
    for (let i = 0; i < enemyCount; i++) {
        const enemyType = { ...enemyTypes[Math.floor(Math.random() * enemyTypes.length)] };
        const levelBonus = 1 + (floorNum - 1) * 0.15;
        
        const enemy = {
            x: 80 + Math.random() * (worldSize - 160),
            y: 80 + Math.random() * (worldSize - 160),
            size: enemyType.size,
            name: enemyType.name,
            hp: Math.floor(enemyType.baseHp * levelBonus),
            maxHp: Math.floor(enemyType.baseHp * levelBonus),
            damage: Math.floor(enemyType.baseDamage * levelBonus),
            exp: Math.floor(enemyType.baseExp * levelBonus),
            color: enemyType.color,
            speed: enemyType.speed,
            type: 'normal',
            bobOffset: Math.random() * Math.PI * 2
        };
        game.entities.enemies.push(enemy);
    }
    
    // 5층마다 보스 등장
    if (floorNum % 5 === 0) {
        const bossType = { ...bossTypes[Math.floor(Math.random() * bossTypes.length)] };
        const levelBonus = 1 + (floorNum - 1) * 0.2;
        
        game.entities.enemies.push({
            x: worldSize / 2,
            y: worldSize / 2,
            size: bossType.size,
            name: bossType.name,
            hp: Math.floor(bossType.baseHp * levelBonus),
            maxHp: Math.floor(bossType.baseHp * levelBonus),
            damage: Math.floor(bossType.baseDamage * levelBonus),
            exp: Math.floor(bossType.baseExp * levelBonus),
            color: bossType.color,
            speed: bossType.speed,
            type: 'boss',
            bobOffset: Math.random() * Math.PI * 2
        });
    }
    
    // 코드 파워업 생성 (치유 아이템 등)
    const powerupCount = 6 + Math.floor(Math.random() * 8);
    const powerupTypes = ['code', 'heal', 'exp_boost'];
    const codeTexts = ['<JS/>', '{fn}', '=>', '</>', 'let', 'const', 'new', 'return', 'class', 'import'];
    
    for (let i = 0; i < powerupCount; i++) {
        const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        let powerup = {
            x: 50 + Math.random() * (worldSize - 100),
            y: 50 + Math.random() * (worldSize - 100),
            size: 18,
            type: type
        };
        
        if (type === 'code') {
            powerup.codeText = codeTexts[Math.floor(Math.random() * codeTexts.length)];
            powerup.value = 75;
        } else if (type === 'heal') {
            powerup.value = 30;
            powerup.symbol = '❤️';
        } else if (type === 'exp_boost') {
            powerup.value = 50;
            powerup.symbol = '⭐';
        }
        
        game.entities.powerups.push(powerup);
    }
    
    // 플레이어 위치 중앙으로
    game.player.x = worldSize / 2;
    game.player.y = worldSize / 2;
    game.player.vx = 0;
    game.player.vy = 0;
    
    // 층 클리어 보너스
    floorClearBonus = 100 + (floorNum - 1) * 20;
    
    showFloatingMessage(`🏰 ${floorNum}층 - 던전에 입장했습니다! 🏰`, "#ffaa88");
}

// ========== 레벨업 스킬 선택 ==========
function showLevelUpMenu() {
    isLevelUpMenuOpen = true;
    game.gameRunning = false;
    
    // 3개의 랜덤 스킬 선택
    availableSkills = [];
    const shuffled = [...skills];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    availableSkills = shuffled.slice(0, 3);
    
    // HTML로 메뉴 표시 (간단한 다이얼로그)
    let menuHtml = `
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); 
                    background:#0a0a2a; border:3px solid #ff88cc; border-radius:20px; 
                    padding:30px; z-index:200; text-align:center; min-width:300px;">
            <h2 style="color:#ffcc88; margin-bottom:20px;">✨ 레벨 업! ✨</h2>
            <p style="color:#aaaaff; margin-bottom:20px;">스킬을 하나 선택하세요</p>`;
    
    for (let i = 0; i < availableSkills.length; i++) {
        const s = availableSkills[i];
        menuHtml += `
            <button id="skillBtn${i}" style="display:block; width:100%; margin:10px 0; padding:12px; 
                     background:#2a2a5a; border:1px solid #ff88cc; color:white; cursor:pointer;
                     font-family:monospace; text-align:left;">
                <strong>${s.name}</strong><br>
                <span style="font-size:11px;">${s.desc}</span>
            </button>`;
    }
    
    menuHtml += `<button id="closeSkillMenu" style="margin-top:15px; background:#aa4466;">나중에 선택</button></div>`;
    
    const menuDiv = document.createElement('div');
    menuDiv.id = 'skillMenu';
    menuDiv.innerHTML = menuHtml;
    document.body.appendChild(menuDiv);
    
    for (let i = 0; i < availableSkills.length; i++) {
        document.getElementById(`skillBtn${i}`).addEventListener('click', () => {
            availableSkills[i].effect(game.player);
            showFloatingMessage(`${availableSkills[i].name} 습득!`, "#88ff88");
            closeSkillMenu();
        });
    }
    document.getElementById('closeSkillMenu').addEventListener('click', () => {
        closeSkillMenu();
    });
}

function closeSkillMenu() {
    const menuDiv = document.getElementById('skillMenu');
    if (menuDiv) menuDiv.remove();
    isLevelUpMenuOpen = false;
    game.gameRunning = true;
}

// ========== 다음 층으로 이동 ==========
function goToNextFloor() {
    currentFloor++;
    game.addScore(floorClearBonus);
    generateFloor(currentFloor);
    showFloatingMessage(`🎉 ${currentFloor-1}층 클리어! +${floorClearBonus}점 🎉`, "#ffff88");
}

// ========== 팝업 메시지 ==========
let floatingMessage = { text: "", color: "", timer: 0 };

function showFloatingMessage(msg, color = "#ffffff") {
    floatingMessage = { text: msg, color: color, timer: 2.0 };
}

// ========== 게임 오버 ==========
function gameOver() {
    game.gameRunning = false;
    const finalFloor = currentFloor;
    const finalKills = game.player.killCount;
    const finalScore = Math.floor(game.score);
    
    document.getElementById('finalStats').innerHTML = 
        `최종 층: ${finalFloor} | 처치: ${finalKills} | 점수: ${finalScore}`;
    document.getElementById('gameOverPanel').style.display = 'block';
}

function restartGame() {
    currentFloor = 1;
    game.score = 0;
    game.player = {
        x: 0, y: 0, vx: 0, vy: 0,
        size: 24,
        invincibleFrames: 0,
        maxHp: 100,
        hp: 100,
        level: 1,
        exp: 0,
        expToNext: 100,
        attackDamage: 15,
        defense: 5,
        killCount: 0,
        attackSpeed: 10,
        attackCooldown: 0,
        moveSpeed: 4.5
    };
    
    document.getElementById('gameOverPanel').style.display = 'none';
    generateFloor(1);
    game.gameRunning = true;
}

// ========== 엔진 콜백 등록 ==========

// 업데이트 콜백
game.on('onUpdate', (engine) => {
    if (isLevelUpMenuOpen) return;
    
    const enemies = engine.entities.enemies;
    const player = engine.player;
    
    // 적 AI
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0.5 && dist < 350) {
            const move = e.speed;
            e.x += (dx / dist) * move;
            e.y += (dy / dist) * move;
        }
        
        e.x = Math.min(Math.max(e.x, 15), engine.worldWidth - 15);
        e.y = Math.min(Math.max(e.y, 15), engine.worldHeight - 15);
        
        // 플레이어와 충돌
        const playerRect = { x: player.x - player.size/2, y: player.y - player.size/2, w: player.size, h: player.size };
        const enemyRect = { x: e.x - e.size/2, y: e.y - e.size/2, w: e.size, h: e.size };
        
        if (engine.rectCollide(playerRect, enemyRect)) {
            engine.damagePlayer(e.damage);
            
            // 넉백
            player.vx = (player.x - e.x) * 1.5;
            player.vy = (player.y - e.y) * 1.5;
            
            if (player.hp <= 0) {
                gameOver();
            }
        }
    }
    
    // 공격 시스템
    engine.updateAttack(
        enemies,
        (p, e) => Math.hypot(p.x - e.x, p.y - e.y),
        (enemy, index) => {
            enemy.hp -= player.attackDamage;
            
            if (enemy.hp <= 0) {
                game.entities.enemies.splice(index, 1);
                player.killCount++;
                const expGain = Math.floor(enemy.exp * (player.expBonus || 1));
                engine.addExp(expGain);
                engine.addScore(50);
                showFloatingMessage(`+${expGain} EXP`, "#88ff88");
            } else {
                showFloatingMessage(`${enemy.damage}`, "#ffaa66");
            }
        }
    );
    
    // 파워업 획득
    for (let i = 0; i < engine.entities.powerups.length; i++) {
        const p = engine.entities.powerups[i];
        const dist = Math.hypot(player.x - p.x, player.y - p.y);
        
        if (dist < player.size/2 + p.size/2) {
            if (p.type === 'code') {
                engine.addScore(p.value);
                showFloatingMessage(`✨ 코드 획득! +${p.value} ✨`, "#88ff88");
            } else if (p.type === 'heal') {
                player.hp = Math.min(player.maxHp, player.hp + p.value);
                showFloatingMessage(`❤️ +${p.value} 체력 회복 ❤️`, "#ff8888");
            } else if (p.type === 'exp_boost') {
                engine.addExp(p.value);
                showFloatingMessage(`⭐ +${p.value} 경험치 ⭐`, "#ffff88");
            }
            engine.entities.powerups.splice(i, 1);
            i--;
        }
    }
    
    // 층 클리어 체크
    if (enemies.length === 0 && game.gameRunning) {
        goToNextFloor();
    }
    
    // 자연 경험치 (아주 미미하게)
    engine.addExp(0.05);
    
    // 메시지 타이머
    if (floatingMessage.timer > 0) {
        floatingMessage.timer -= 0.016;
    }
});

// 렌더링 콜백
game.on('onRender', (engine) => {
    const ctx = engine.ctx;
    
    // 적 렌더링
    for (let e of engine.entities.enemies) {
        const screen = engine.worldToScreen(e.x - e.size/2, e.y - e.size/2);
        if (screen.x + e.size > 0 && screen.x < engine.width && 
            screen.y + e.size > 0 && screen.y < engine.height) {
            
            const bob = Math.sin(engine.frame * 0.05 + (e.bobOffset || 0)) * 2;
            
            ctx.shadowBlur = 8;
            
            // 보스는 더 크고 화려하게
            if (e.type === 'boss') {
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.ellipse(screen.x + e.size/2, screen.y + e.size/3 + bob, e.size/2, e.size/2.2, 0, 0, Math.PI*2);
                ctx.fill();
                
                // 체력바
                const hpPercent = e.hp / e.maxHp;
                ctx.fillStyle = "#aa3333";
                ctx.fillRect(screen.x, screen.y - 15, e.size, 6);
                ctx.fillStyle = "#33ff33";
                ctx.fillRect(screen.x, screen.y - 15, e.size * hpPercent, 6);
                
                ctx.font = "bold 12px monospace";
                ctx.fillStyle = "#ffffaa";
                ctx.fillText(e.name, screen.x + 5, screen.y - 8);
            } else {
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.ellipse(screen.x + e.size/2, screen.y + e.size/3 + bob, e.size/2, e.size/2.3, 0, 0, Math.PI*2);
                ctx.fill();
                
                ctx.fillStyle = "#ffccaa";
                ctx.beginPath();
                ctx.ellipse(screen.x + e.size/2 - 5, screen.y + e.size/3 - 3 + bob, 4, 5, 0, 0, Math.PI*2);
                ctx.fill();
                
                ctx.font = "bold 9px monospace";
                ctx.fillStyle = "#fff2b5";
                ctx.fillText(e.name.substring(0, 4), screen.x + e.size/2 - 10, screen.y + e.size/3 + 4 + bob);
            }
        }
    }
    
    // 파워업 렌더링
    for (let p of engine.entities.powerups) {
        const screen = engine.worldToScreen(p.x, p.y);
        if (screen.x + p.size > 0 && screen.x < engine.width && 
            screen.y + p.size > 0 && screen.y < engine.height) {
            
            ctx.fillStyle = "#44ffaa";
            ctx.shadowBlur = 8;
            ctx.fillRect(screen.x, screen.y, p.size, p.size);
            
            if (p.type === 'code') {
                ctx.fillStyle = "#004d33";
                ctx.font = `bold ${Math.floor(p.size * 0.7)}px monospace`;
                ctx.fillText(p.codeText, screen.x+2, screen.y+12);
            } else if (p.type === 'heal') {
                ctx.fillStyle = "#ff6688";
                ctx.font = `bold ${Math.floor(p.size * 0.8)}px monospace`;
                ctx.fillText(p.symbol, screen.x+4, screen.y+14);
            } else {
                ctx.fillStyle = "#ffcc44";
                ctx.font = `bold ${Math.floor(p.size * 0.8)}px monospace`;
                ctx.fillText(p.symbol, screen.x+4, screen.y+14);
            }
        }
    }
    
    // 층 정보
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#ffaa88";
    ctx.fillText(`🏰 ${currentFloor}층`, 20, 85);
    
    // 보스방 표시
    const hasBoss = game.entities.enemies.some(e => e.type === 'boss');
    if (hasBoss) {
        ctx.fillStyle = "#ff6666";
        ctx.font = "bold 14px monospace";
        ctx.fillText("⚠️ BOSS FLOOR ⚠️", 20, 115);
    }
    
    // 팝업 메시지
    if (floatingMessage.timer > 0) {
        ctx.font = "bold 24px monospace";
        ctx.fillStyle = floatingMessage.color;
        ctx.shadowBlur = 8;
        ctx.fillText(floatingMessage.text, engine.width/2 - 150, engine.height/2 - 100);
    }
    
    ctx.shadowBlur = 0;
});

// 레벨업 콜백
game.on('onLevelUp', (newLevel) => {
    showFloatingMessage(`🎉 레벨 ${newLevel} 달성! 🎉`, "#ffaa44");
    showLevelUpMenu();
});

// 게임 시작
generateFloor(1);
game.start();

// 리셋 버튼
document.getElementById('resetBtn').addEventListener('click', () => restartGame());
document.getElementById('gameOverRestart').addEventListener('click', () => restartGame());