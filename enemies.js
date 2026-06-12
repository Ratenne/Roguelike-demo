// ============================================
// 적 & 보스 데이터 + 다양화된 AI 시스템
// ============================================

// ========== AI 행동 타입 ==========
const AIBehavior = {
    CHASE: 'chase',           // 추적형 (기존)
    PATROL: 'patrol',         // 순찰형 (정해진 경로 배회)
    RANGED: 'ranged',         // 원거리형 (거리 유지하며 공격)
    COWARD: 'coward',         // 도망형 (플레이어 도망)
    BERSERKER: 'berserker',   // 광전사 (HP 낮을수록 강해짐)
};

// ========== 일반 적 타입 (AI 행동 추가) ==========
const enemyTypes = [
    { 
        name: '🔥 불꽃 정령', 
        baseHp: 32, baseDamage: 14, baseExp: 45, 
        element: 'FIRE', size: 28, color: '#ff6644', 
        speed: 1.0, aiType: AIBehavior.CHASE,
        detectionRange: 350, attackCooldown: 0
    },
    { 
        name: '❄️ 얼음 원소', 
        baseHp: 38, baseDamage: 12, baseExp: 42, 
        element: 'ICE', size: 28, color: '#88ccff', 
        speed: 0.9, aiType: AIBehavior.RANGED,
        detectionRange: 300, attackCooldown: 60, attackRange: 200,
        projectileSpeed: 3.5, projectileDamage: 18
    },
    { 
        name: '⚡ 번개 구체', 
        baseHp: 28, baseDamage: 17, baseExp: 48, 
        element: 'THUNDER', size: 26, color: '#ffee44', 
        speed: 1.1, aiType: AIBehavior.CHASE,
        detectionRange: 400, attackCooldown: 0
    },
    { 
        name: '☠️ 독 거미', 
        baseHp: 42, baseDamage: 15, baseExp: 52, 
        element: 'POISON', size: 30, color: '#88ff44', 
        speed: 0.85, aiType: AIBehavior.PATROL,
        detectionRange: 250, attackCooldown: 0,
        patrolRadius: 120, patrolSpeed: 0.5
    },
    { 
        name: '✨ 정령술사', 
        baseHp: 35, baseDamage: 11, baseExp: 55, 
        element: 'HOLY', size: 26, color: '#ffaaff', 
        speed: 0.8, aiType: AIBehavior.RANGED,
        detectionRange: 350, attackCooldown: 50, attackRange: 250,
        projectileSpeed: 4.0, projectileDamage: 22,
        healAllies: true, healAmount: 15, healCooldown: 120
    },
    { 
        name: '🌙 암흑 기사', 
        baseHp: 48, baseDamage: 18, baseExp: 60, 
        element: 'DARK', size: 32, color: '#aa66ff', 
        speed: 0.75, aiType: AIBehavior.BERSERKER,
        detectionRange: 300, attackCooldown: 0,
        berserkThreshold: 0.4, berserkSpeedBoost: 1.6, berserkDamageBoost: 1.5
    },
    { 
        name: '🐀 도망자 쥐', 
        baseHp: 20, baseDamage: 6, baseExp: 30, 
        element: 'NEUTRAL', size: 20, color: '#aaaaaa', 
        speed: 1.4, aiType: AIBehavior.COWARD,
        detectionRange: 250, fleeDistance: 200
    },
    { 
        name: '🏹 스켈레톤 궁수', 
        baseHp: 30, baseDamage: 10, baseExp: 40, 
        element: 'NEUTRAL', size: 28, color: '#ddccaa', 
        speed: 0.7, aiType: AIBehavior.RANGED,
        detectionRange: 400, attackCooldown: 45, attackRange: 280,
        projectileSpeed: 5.0, projectileDamage: 20
    }
];

// ========== 보스 타입 (강화된 AI) ==========
const bossTypes = [
    { 
        name: '👑 원소의 지배자', 
        baseHp: 220, baseDamage: 32, baseExp: 500, 
        element: 'NEUTRAL', size: 58, color: '#ffaa88', 
        speed: 0.85, aiType: AIBehavior.CHASE,
        detectionRange: 500, attackCooldown: 0,
        bossAbilities: ['summon', 'areaAttack']
    },
    { 
        name: '🐉 그림자 드래곤', 
        baseHp: 260, baseDamage: 36, baseExp: 550, 
        element: 'DARK', size: 62, color: '#8f6fff', 
        speed: 0.8, aiType: AIBehavior.RANGED,
        detectionRange: 500, attackCooldown: 40, attackRange: 300,
        projectileSpeed: 4.5, projectileDamage: 40,
        bossAbilities: ['breath', 'fear']
    }
];

// ========== 원거리 투사체 목록 ==========
let projectiles = [];

// ========== 적 상태 저장용 Map ==========
let enemyStates = new Map();

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
            bobOffset: Math.random() * Math.PI * 2,
            aiType: enemyData.aiType,
            detectionRange: enemyData.detectionRange || 350,
            attackCooldown: 0,
            attackCooldownMax: enemyData.attackCooldown || 0,
            attackRange: enemyData.attackRange || 0,
            projectileSpeed: enemyData.projectileSpeed || 0,
            projectileDamage: enemyData.projectileDamage || 0,
            healAllies: enemyData.healAllies || false,
            healAmount: enemyData.healAmount || 0,
            healCooldown: 0,
            healCooldownMax: enemyData.healCooldown || 0,
            berserkThreshold: enemyData.berserkThreshold || 0,
            berserkSpeedBoost: enemyData.berserkSpeedBoost || 0,
            berserkDamageBoost: enemyData.berserkDamageBoost || 0,
            fleeDistance: enemyData.fleeDistance || 200,
            patrolRadius: enemyData.patrolRadius || 120,
            patrolSpeed: enemyData.patrolSpeed || 0.5,
            bossAbilities: enemyData.bossAbilities || []
        };
        
        // AI 상태 초기화
        const stateKey = getEnemyKey(enemy);
        enemyStates.set(stateKey, {
            patrolOriginX: enemy.x,
            patrolOriginY: enemy.y,
            patrolAngle: Math.random() * Math.PI * 2,
            patrolTimer: 0,
            patrolDirection: Math.random() > 0.5 ? 1 : -1,
            isBerserk: false,
            bossAbilityCooldown: 0
        });
        
        entities.enemies.push(enemy);
    }
}

// ========== 보스 생성 ==========
function spawnBoss(floorNum, worldSize, entities) {
    if (floorNum % 5 !== 0) return;
    
    const bossData = { ...bossTypes[Math.floor(Math.random() * bossTypes.length)] };
    const levelBonus = 1 + (floorNum - 1) * 0.15;
    
    const boss = {
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
        bobOffset: Math.random() * Math.PI * 2,
        aiType: bossData.aiType,
        detectionRange: bossData.detectionRange || 500,
        attackCooldown: 0,
        attackCooldownMax: bossData.attackCooldown || 0,
        attackRange: bossData.attackRange || 0,
        projectileSpeed: bossData.projectileSpeed || 0,
        projectileDamage: bossData.projectileDamage || 0,
        healAllies: false,
        healAmount: 0,
        healCooldown: 0,
        healCooldownMax: 0,
        berserkThreshold: 0,
        berserkSpeedBoost: 0,
        berserkDamageBoost: 0,
        fleeDistance: 0,
        patrolRadius: 0,
        patrolSpeed: 0,
        bossAbilities: bossData.bossAbilities || []
    };
    
    const stateKey = getEnemyKey(boss);
    enemyStates.set(stateKey, {
        patrolOriginX: boss.x,
        patrolOriginY: boss.y,
        patrolAngle: Math.random() * Math.PI * 2,
        patrolTimer: 0,
        patrolDirection: 1,
        isBerserk: false,
        bossAbilityCooldown: 0
    });
    
    entities.enemies.push(boss);
}

// ========== 적 고유 키 생성 (식별용) ==========
function getEnemyKey(enemy) {
    return `${enemy.name}_${enemy.x}_${enemy.y}_${enemy.bobOffset}`;
}

// ========== 순찰형 AI ==========
function updatePatrolAI(enemy, state, player, deltaTime) {
    state.patrolTimer += deltaTime;
    
    // 일정 시간마다 방향 전환
    if (state.patrolTimer > 2.5 + Math.random() * 1.5) {
        state.patrolTimer = 0;
        state.patrolDirection *= -1;
        state.patrolAngle += (Math.random() - 0.5) * Math.PI;
    }
    
    const patrolAngle = state.patrolAngle + state.patrolTimer * 0.8 * state.patrolDirection;
    const targetX = state.patrolOriginX + Math.cos(patrolAngle) * enemy.patrolRadius;
    const targetY = state.patrolOriginY + Math.sin(patrolAngle) * enemy.patrolRadius;
    
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 1) {
        enemy.x += (dx / dist) * enemy.patrolSpeed;
        enemy.y += (dy / dist) * enemy.patrolSpeed;
    }
}

// ========== 도망형 AI ==========
function updateCowardAI(enemy, state, player) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < enemy.fleeDistance && dist > 0.5) {
        const fleeSpeed = enemy.speed * 1.3;
        enemy.x += (dx / dist) * fleeSpeed;
        enemy.y += (dy / dist) * fleeSpeed;
    } else if (dist > enemy.fleeDistance * 1.5) {
        // 멀어지면 천천히 배회
        const wanderAngle = Math.sin(enemy.bobOffset + performance.now() * 0.001) * 0.5;
        enemy.x += Math.cos(wanderAngle) * enemy.speed * 0.3;
        enemy.y += Math.sin(wanderAngle) * enemy.speed * 0.3;
    }
}

// ========== 원거리형 AI ==========
function updateRangedAI(enemy, state, player, worldWidth, worldHeight, deltaTime) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    
    // 이상적인 거리 유지 (공격 범위의 70% 지점)
    const idealDist = enemy.attackRange * 0.7;
    
    if (dist < idealDist - 20) {
        // 너무 가까우면 뒤로
        if (dist > 0.5) {
            enemy.x -= (dx / dist) * enemy.speed;
            enemy.y -= (dy / dist) * enemy.speed;
        }
    } else if (dist > idealDist + 20 && dist < enemy.detectionRange) {
        // 너무 멀면 접근
        if (dist > 0.5) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        }
    }
    
    // 원거리 공격
    if (enemy.attackCooldown <= 0 && dist < enemy.attackRange && dist > 0) {
        const angle = Math.atan2(dy, dx);
        projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * enemy.projectileSpeed,
            vy: Math.sin(angle) * enemy.projectileSpeed,
            damage: enemy.projectileDamage,
            element: enemy.element,
            color: enemy.color,
            size: 6,
            life: enemy.attackRange / enemy.projectileSpeed / 2, // 사거리 기준 수명
            owner: enemy
        });
        enemy.attackCooldown = enemy.attackCooldownMax;
    }
}

// ========== 광전사 AI ==========
function updateBerserkerAI(enemy, state, player) {
    const hpPercent = enemy.hp / enemy.maxHp;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    
    let currentSpeed = enemy.speed;
    let currentDamage = enemy.damage;
    
    // HP가 낮을수록 강해짐
    if (hpPercent < enemy.berserkThreshold && !state.isBerserk) {
        state.isBerserk = true;
        showFloatingMessage && showFloatingMessage(`${enemy.name}이(가) 광폭화!`, "#ff4444");
    }
    
    if (state.isBerserk) {
        currentSpeed = enemy.speed * enemy.berserkSpeedBoost;
        currentDamage = Math.floor(enemy.damage * enemy.berserkDamageBoost);
        // 일시적으로 데미지 증가 (접촉 시 적용됨)
        enemy._berserkDamage = currentDamage;
    } else {
        enemy._berserkDamage = enemy.damage;
    }
    
    if (dist > 0.5 && dist < enemy.detectionRange) {
        enemy.x += (dx / dist) * currentSpeed;
        enemy.y += (dy / dist) * currentSpeed;
    }
}

// ========== 보스 특수 능력 ==========
function updateBossAbilities(boss, state, player, entities, deltaTime) {
    if (!boss.bossAbilities || boss.bossAbilities.length === 0) return;
    
    state.bossAbilityCooldown = (state.bossAbilityCooldown || 0) - deltaTime;
    
    if (state.bossAbilityCooldown <= 0) {
        const ability = boss.bossAbilities[Math.floor(Math.random() * boss.bossAbilities.length)];
        
        switch(ability) {
            case 'summon':
                // 주변에 작은 적 소환
                for (let i = 0; i < 3; i++) {
                    const minion = {
                        x: boss.x + (Math.random() - 0.5) * 100,
                        y: boss.y + (Math.random() - 0.5) * 100,
                        size: 18,
                        name: '어둠의 조각',
                        hp: 25,
                        maxHp: 25,
                        damage: 8,
                        exp: 20,
                        element: 'DARK',
                        color: '#6644aa',
                        speed: 1.2,
                        type: 'minion',
                        bobOffset: Math.random() * Math.PI * 2,
                        aiType: AIBehavior.CHASE,
                        detectionRange: 300,
                        attackCooldown: 0,
                        attackCooldownMax: 0,
                        attackRange: 0,
                        projectileSpeed: 0,
                        projectileDamage: 0,
                        healAllies: false,
                        healAmount: 0,
                        healCooldown: 0,
                        healCooldownMax: 0,
                        berserkThreshold: 0,
                        berserkSpeedBoost: 0,
                        berserkDamageBoost: 0,
                        fleeDistance: 0,
                        patrolRadius: 0,
                        patrolSpeed: 0,
                        bossAbilities: []
                    };
                    entities.enemies.push(minion);
                }
                showFloatingMessage && showFloatingMessage(`👑 ${boss.name}이(가) 하수인을 소환!`, "#ffaa44");
                state.bossAbilityCooldown = 8.0;
                break;
                
            case 'breath':
                // 브레스 공격 (부채꼴 투사체)
                const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
                for (let i = -2; i <= 2; i++) {
                    const spreadAngle = angle + i * 0.2;
                    projectiles.push({
                        x: boss.x,
                        y: boss.y,
                        vx: Math.cos(spreadAngle) * 4,
                        vy: Math.sin(spreadAngle) * 4,
                        damage: boss.projectileDamage * 0.7,
                        element: boss.element,
                        color: boss.color,
                        size: 8,
                        life: 2.5,
                        owner: boss
                    });
                }
                showFloatingMessage && showFloatingMessage(`🐉 브레스 공격!`, "#ff6644");
                state.bossAbilityCooldown = 5.0;
                break;
                
            case 'areaAttack':
                // 주변 범위 공격 (플레이어가 가까이 있을 때)
                const dist = Math.hypot(player.x - boss.x, player.y - boss.y);
                if (dist < 120) {
                    // 플레이어에게 직접 데미지 (engine 필요)
                    showFloatingMessage && showFloatingMessage(`💥 ${boss.name}의 광역 공격!`, "#ff4444");
                }
                state.bossAbilityCooldown = 4.0;
                break;
                
            case 'fear':
                // 공포 - 플레이어 속도 감소 (activeEffects 통해 처리)
                showFloatingMessage && showFloatingMessage(`😱 공포의 포효!`, "#aa66ff");
                state.bossAbilityCooldown = 6.0;
                break;
        }
    }
}

// ========== 아군 힐 AI (정령술사) ==========
function updateHealerAI(enemy, enemies, deltaTime) {
    if (!enemy.healAllies) return;
    
    enemy.healCooldown -= deltaTime;
    
    if (enemy.healCooldown <= 0) {
        // 주변에서 가장 HP 낮은 아군 찾기
        let lowestHpAlly = null;
        let lowestHpPercent = 1.0;
        
        for (let other of enemies) {
            if (other === enemy) continue;
            const dist = Math.hypot(enemy.x - other.x, enemy.y - other.y);
            const hpPercent = other.hp / other.maxHp;
            
            if (dist < 200 && hpPercent < 0.7 && hpPercent < lowestHpPercent) {
                lowestHpAlly = other;
                lowestHpPercent = hpPercent;
            }
        }
        
        if (lowestHpAlly) {
            lowestHpAlly.hp = Math.min(lowestHpAlly.maxHp, lowestHpAlly.hp + enemy.healAmount);
            enemy.healCooldown = enemy.healCooldownMax;
            // 힐 이펙트 (visualEffect 연동 가능)
        }
    }
}

// ========== 투사체 업데이트 ==========
function updateProjectiles(player, worldWidth, worldHeight, engine) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.016; // 약 60fps 기준
        
        // 경계 체크
        if (p.x < 0 || p.x > worldWidth || p.y < 0 || p.y > worldHeight || p.life <= 0) {
            projectiles.splice(i, 1);
            continue;
        }
        
        // 플레이어 충돌
        const dist = Math.hypot(player.x - p.x, player.y - p.y);
        if (dist < player.size/2 + p.size) {
            const actualDamage = Math.max(5, p.damage - player.defense);
            engine.damagePlayer(actualDamage);
            player.vx += p.vx * 0.3;
            player.vy += p.vy * 0.3;
            projectiles.splice(i, 1);
        }
    }
}

// ========== 투사체 렌더링 ==========
function renderProjectiles(ctx, camera) {
    for (let p of projectiles) {
        const screenX = p.x - camera.x;
        const screenY = p.y - camera.y;
        
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 꼬리 효과
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(screenX - p.vx * 0.5, screenY - p.vy * 0.5, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

// ========== 적 AI 업데이트 (통합) ==========
function updateEnemyAI(player, enemies, worldWidth, worldHeight, engine, deltaTime = 0.016) {
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const stateKey = getEnemyKey(e);
        let state = enemyStates.get(stateKey);
        
        // 새로운 적이면 상태 생성
        if (!state) {
            state = {
                patrolOriginX: e.x,
                patrolOriginY: e.y,
                patrolAngle: Math.random() * Math.PI * 2,
                patrolTimer: 0,
                patrolDirection: Math.random() > 0.5 ? 1 : -1,
                isBerserk: false,
                bossAbilityCooldown: 0
            };
            enemyStates.set(stateKey, state);
        }
        
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);
        
        // 공격 쿨다운 감소
        if (e.attackCooldown > 0) e.attackCooldown--;
        if (e.healCooldown > 0) e.healCooldown -= deltaTime;
        
        // 감지 범위 밖이면 AI 실행 안 함
        const isInDetectionRange = dist < e.detectionRange;
        
        switch(e.aiType) {
            case AIBehavior.PATROL:
                if (isInDetectionRange) {
                    // 감지되면 추적으로 전환
                    if (dist > 0.5) {
                        e.x += (dx / dist) * e.speed;
                        e.y += (dy / dist) * e.speed;
                    }
                } else {
                    updatePatrolAI(e, state, player, deltaTime);
                }
                break;
                
            case AIBehavior.COWARD:
                if (isInDetectionRange) {
                    updateCowardAI(e, state, player);
                }
                // 감지 범위 밖에서는 제자리
                break;
                
            case AIBehavior.RANGED:
                if (isInDetectionRange) {
                    updateRangedAI(e, state, player, worldWidth, worldHeight, deltaTime);
                }
                // 힐러 능력
                updateHealerAI(e, enemies, deltaTime);
                break;
                
            case AIBehavior.BERSERKER:
                if (isInDetectionRange) {
                    updateBerserkerAI(e, state, player);
                } else if (dist < e.detectionRange * 1.5) {
                    // 약간 먼 거리에서도 천천히 접근
                    if (dist > 0.5) {
                        e.x += (dx / dist) * e.speed * 0.5;
                        e.y += (dy / dist) * e.speed * 0.5;
                    }
                }
                break;
                
            case AIBehavior.CHASE:
            default:
                // 기본 추적형
                if (dist > 0.5 && dist < e.detectionRange) {
                    const move = e.speed;
                    e.x += (dx / dist) * move;
                    e.y += (dy / dist) * move;
                }
                break;
        }
        
        // 보스 특수 능력
        if (e.type === 'boss') {
            updateBossAbilities(e, state, player, { enemies }, deltaTime);
        }
        
        // 경계 클램핑
        e.x = Math.min(Math.max(e.x, 15), worldWidth - 15);
        e.y = Math.min(Math.max(e.y, 15), worldHeight - 15);
        
        // 접촉 데미지 (광전사는 강화된 데미지)
        const playerRect = { x: player.x - player.size/2, y: player.y - player.size/2, w: player.size, h: player.size };
        const enemyRect = { x: e.x - e.size/2, y: e.y - e.size/2, w: e.size, h: e.size };
        
        if (engine.rectCollide(playerRect, enemyRect)) {
            const contactDamage = e._berserkDamage || e.damage;
            const actualDamage = Math.max(5, contactDamage - player.defense);
            engine.damagePlayer(actualDamage);
            player.vx = (player.x - e.x) * 1.2;
            player.vy = (player.y - e.y) * 1.2;
        }
    }
    
    // 투사체 업데이트
    updateProjectiles(player, worldWidth, worldHeight, engine);
}

// ========== 적 제거 시 상태 정리 ==========
function removeEnemyState(enemy) {
    const key = getEnemyKey(enemy);
    enemyStates.delete(key);
}

// ========== 적 렌더링 ==========
function renderEnemies(ctx, enemies, engine) {
    for (let e of enemies) {
        const screen = engine.worldToScreen(e.x - e.size/2, e.y - e.size/2);
        if (screen.x + e.size > 0 && screen.x < engine.width && 
            screen.y + e.size > 0 && screen.y < engine.height) {
            
            const bob = Math.sin(engine.frame * 0.05 + (e.bobOffset || 0)) * 2;
            ctx.shadowBlur = 6;
            
            // 광전사 광폭화 상태 표시
            if (e.aiType === AIBehavior.BERSERKER && enemyStates.get(getEnemyKey(e))?.isBerserk) {
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 15;
            }
            
            ctx.fillStyle = e.color;
            ctx.beginPath();
            
            // AI 타입별 다른 형태
            if (e.aiType === AIBehavior.RANGED) {
                // 원거리형은 마름모 형태
                ctx.moveTo(screen.x + e.size/2, screen.y + bob);
                ctx.lineTo(screen.x + e.size, screen.y + e.size/2 + bob);
                ctx.lineTo(screen.x + e.size/2, screen.y + e.size + bob);
                ctx.lineTo(screen.x, screen.y + e.size/2 + bob);
                ctx.closePath();
            } else if (e.aiType === AIBehavior.COWARD) {
                // 도망형은 작은 삼각형
                ctx.moveTo(screen.x + e.size/2, screen.y + bob);
                ctx.lineTo(screen.x + e.size, screen.y + e.size * 0.7 + bob);
                ctx.lineTo(screen.x, screen.y + e.size * 0.7 + bob);
                ctx.closePath();
            } else {
                // 기본 원형
                ctx.ellipse(screen.x + e.size/2, screen.y + e.size/3 + bob, e.size/2, e.size/2.2, 0, 0, Math.PI*2);
            }
            ctx.fill();
            
            // AI 타입 표시 아이콘
            ctx.font = `bold ${Math.floor(e.size * 0.45)}px monospace`;
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 2;
            ctx.shadowColor = 'transparent';
            
            let displayIcon = Elements[e.element]?.icon || '⚪';
            if (e.type === 'minion') displayIcon = '👾';
            ctx.fillText(displayIcon, screen.x + e.size/2 - 8, screen.y + e.size/3 + 4 + bob);
            
            // 보스 HP 바
            if (e.type === 'boss') {
                const hpPercent = e.hp / e.maxHp;
                ctx.fillStyle = "#aa3333";
                ctx.fillRect(screen.x, screen.y - 16, e.size, 6);
                ctx.fillStyle = "#33ff33";
                ctx.fillRect(screen.x, screen.y - 16, e.size * hpPercent, 6);
                ctx.font = "bold 9px monospace";
                ctx.fillStyle = "#ffffaa";
                ctx.fillText(e.name.substring(0, 8), screen.x + 2, screen.y - 7);
            }
        }
    }
    ctx.shadowBlur = 0;
    
    // 투사체 렌더링
    renderProjectiles(ctx, engine.camera);
}

// ========== 모든 적 상태 초기화 ==========
function clearAllEnemyStates() {
    enemyStates.clear();
    projectiles = [];
}