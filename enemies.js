// ============================================
// 적 & 보스 데이터
// ============================================

// ========== 일반 적 타입 ==========
const enemyTypes = [
    { name: '🔥 불꽃 정령', baseHp: 32, baseDamage: 14, baseExp: 45, element: 'FIRE', size: 28, color: '#ff6644', speed: 1.0 },
    { name: '❄️ 얼음 원소', baseHp: 38, baseDamage: 12, baseExp: 42, element: 'ICE', size: 28, color: '#88ccff', speed: 0.9 },
    { name: '⚡ 번개 구체', baseHp: 28, baseDamage: 17, baseExp: 48, element: 'THUNDER', size: 26, color: '#ffee44', speed: 1.1 },
    { name: '☠️ 독 거미', baseHp: 42, baseDamage: 15, baseExp: 52, element: 'POISON', size: 30, color: '#88ff44', speed: 0.85 },
    { name: '✨ 정령술사', baseHp: 35, baseDamage: 11, baseExp: 55, element: 'HOLY', size: 26, color: '#ffaaff', speed: 0.8 },
    { name: '🌙 암흑 기사', baseHp: 48, baseDamage: 18, baseExp: 60, element: 'DARK', size: 32, color: '#aa66ff', speed: 0.75 }
];

// ========== 보스 타입 ==========
const bossTypes = [
    { name: '👑 원소의 지배자', baseHp: 220, baseDamage: 32, baseExp: 500, element: 'NEUTRAL', size: 58, color: '#ffaa88', speed: 0.85 },
    { name: '🐉 그림자 드래곤', baseHp: 260, baseDamage: 36, baseExp: 550, element: 'DARK', size: 62, color: '#8f6fff', speed: 0.8 }
];

// ========== 적 생성 ==========
function spawnEnemies(floorNum, worldSize, entities) {
    let enemyCount = 10 + Math.floor(floorNum * 0.7);
    enemyCount = Math.min(30, enemyCount);
    
    for (let i = 0; i < enemyCount; i++) {
        const enemyData = { ...enemyTypes[Math.floor(Math.random() * enemyTypes.length)] };
        const levelBonus = 1 + (floorNum - 1) * 0.1;
        
        const enemy = {
            x: 80 + Math.random() * (worldSize - 160),
            y: 80 + Math.random() * (worldSize - 160),
            size: enemyData.size,
            name: enemyData.name,
            hp: Math.floor(enemyData.baseHp * levelBonus),
            maxHp: Math.floor(enemyData.baseHp * levelBonus),
            damage: Math.floor(enemyData.baseDamage * levelBonus),
            exp: Math.floor(enemyData.baseExp * levelBonus),
            element: enemyData.element,
            color: enemyData.color,
            speed: enemyData.speed,
            type: 'normal',
            bobOffset: Math.random() * Math.PI * 2
        };
        entities.enemies.push(enemy);
    }
}

// ========== 보스 생성 ==========
function spawnBoss(floorNum, worldSize, entities) {
    if (floorNum % 5 !== 0) return;
    
    const bossData = { ...bossTypes[Math.floor(Math.random() * bossTypes.length)] };
    const levelBonus = 1 + (floorNum - 1) * 0.15;
    
    entities.enemies.push({
        x: worldSize / 2,
        y: worldSize / 2,
        size: bossData.size,
        name: bossData.name,
        hp: Math.floor(bossData.baseHp * levelBonus),
        maxHp: Math.floor(bossData.baseHp * levelBonus),
        damage: Math.floor(bossData.baseDamage * levelBonus),
        exp: Math.floor(bossData.baseExp * levelBonus),
        element: bossData.element,
        color: bossData.color,
        speed: bossData.speed,
        type: 'boss',
        bobOffset: Math.random() * Math.PI * 2
    });
}

// ========== 적 AI 업데이트 ==========
function updateEnemyAI(player, enemies, worldWidth, worldHeight, engine) {
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
        
        e.x = Math.min(Math.max(e.x, 15), worldWidth - 15);
        e.y = Math.min(Math.max(e.y, 15), worldHeight - 15);
        
        const playerRect = { x: player.x - player.size/2, y: player.y - player.size/2, w: player.size, h: player.size };
        const enemyRect = { x: e.x - e.size/2, y: e.y - e.size/2, w: e.size, h: e.size };
        
        if (engine.rectCollide(playerRect, enemyRect)) {
            const actualDamage = Math.max(5, e.damage - player.defense);
            engine.damagePlayer(actualDamage);
            player.vx = (player.x - e.x) * 1.2;
            player.vy = (player.y - e.y) * 1.2;
        }
    }
}

// ========== 적 렌더링 ==========
function renderEnemies(ctx, enemies, engine) {
    for (let e of enemies) {
        const screen = engine.worldToScreen(e.x - e.size/2, e.y - e.size/2);
        if (screen.x + e.size > 0 && screen.x < engine.width && 
            screen.y + e.size > 0 && screen.y < engine.height) {
            
            const bob = Math.sin(engine.frame * 0.05 + (e.bobOffset || 0)) * 2;
            ctx.shadowBlur = 6;
            
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.ellipse(screen.x + e.size/2, screen.y + e.size/3 + bob, e.size/2, e.size/2.2, 0, 0, Math.PI*2);
            ctx.fill();
            
            ctx.font = `bold ${Math.floor(e.size * 0.45)}px monospace`;
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 2;
            ctx.fillText(Elements[e.element]?.icon || '⚪', screen.x + e.size/2 - 8, screen.y + e.size/3 + 4 + bob);
            
            if (e.type === 'boss') {
                const hpPercent = e.hp / e.maxHp;
                ctx.fillStyle = "#aa3333";
                ctx.fillRect(screen.x, screen.y - 12, e.size, 5);
                ctx.fillStyle = "#33ff33";
                ctx.fillRect(screen.x, screen.y - 12, e.size * hpPercent, 5);
                ctx.font = "bold 9px monospace";
                ctx.fillStyle = "#ffffaa";
                ctx.fillText(e.name.substring(0, 6), screen.x + 2, screen.y - 5);
            }
        }
    }
    ctx.shadowBlur = 0;
}