// ============================================
// 로그라이크 게임 - 메인 로직 (soundEngine 안전 처리)
// ============================================

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
let mana = 100;
let maxMana = 100;
let specialAttackCooldown = 0;
let activeEffects = [];
let timeEventActive = false;
let timeEventRemaining = 0;
let timeEventReward = 0;
let secretRoomDiscovered = false;
let lastTimestamp = 0;
let hasBossInFloor = false;
let bossDefeated = false;

// ========== 사운드 안전 래퍼 ==========
// soundEngine이 아직 로드되지 않았을 경우를 대비한 폴백
function safeSound(callback) {
    if (typeof soundEngine !== 'undefined' && soundEngine) {
        try {
            callback(soundEngine);
        } catch (e) {
            console.warn('Sound effect failed:', e.message);
        }
    }
}

// 마우스 위치 추적
if (game && game.canvas) {
    game.canvas.addEventListener('mousemove', (e) => {
        const rect = game.canvas.getBoundingClientRect();
        const scaleX = game.canvas.width / rect.width;
        const scaleY = game.canvas.height / rect.height;
        mouseX = (e.clientX - rect.left) * scaleX;
        mouseY = (e.clientY - rect.top) * scaleY;
    });
}

// ========== 방 생성 ==========
function generateFloor(floorNum) {
    const worldSize = 1800 + Math.min(400, Math.floor(floorNum / 10) * 50);
    game.worldWidth = worldSize;
    game.worldHeight = worldSize;
    
    game.entities.enemies = [];
    game.entities.powerups = [];
    game.entities.obstacles = [];
    game.entities.interactive = [];
    game.entities.rooms = [];
    game.entities.corridorTiles = [];
    game.entities.wallDecorations = [];
    
    const dungeonData = generateDungeon(worldSize, worldSize, floorNum);
    spawnObstaclesFromDungeon(game.entities, dungeonData);
    
    spawnInteractiveObjects(floorNum, worldSize, game.entities);
    spawnItems(worldSize, game.entities);
    spawnEnemies(floorNum, worldSize, game.entities);
    spawnBoss(floorNum, worldSize, game.entities);
    
    hasBossInFloor = game.entities.enemies.some(e => e.type === 'boss');
    bossDefeated = false;
    
    // 보스전 음악 전환 (안전)
    safeSound((se) => {
        if (hasBossInFloor) {
            se.startBossMusic();
        } else {
            se.startDungeonMusic();
        }
    });
    
    const startRoom = game.entities.rooms.find(r => r.type === 'start');
    if (startRoom) {
        game.player.x = startRoom.centerX;
        game.player.y = startRoom.centerY;
    } else {
        game.player.x = worldSize / 2;
        game.player.y = worldSize / 2;
    }
    game.player.vx = 0;
    game.player.vy = 0;
    
    if (Math.random() < 0.15 && floorNum > 1) {
        timeEventActive = true;
        timeEventRemaining = 300;
        timeEventReward = 200 + Math.floor(floorNum * 15);
        showFloatingMessage(`⏰ 시간 제한! ${(timeEventRemaining/60).toFixed(0)}초 내 클리어 시 +${timeEventReward}점!`, "#ffaa44");
    } else {
        timeEventActive = false;
    }
    
    safeSound(se => se.playFloorChange());
    showFloatingMessage(`🏰 ${floorNum}층 - 입장!`, "#ffaa88");
}

// ========== 다음 층 이동 ==========
function goToNextFloor() {
    if (timeEventActive) {
        game.addScore(timeEventReward);
        showFloatingMessage(`⏰ 시간 제한 클리어! +${timeEventReward}점!`, "#ffaa44");
    }
    
    currentFloor++;
    const bonus = 80 + currentFloor * 5;
    game.addScore(bonus);
    generateFloor(currentFloor);
    showFloatingMessage(`🎉 ${currentFloor-1}층 클리어! +${bonus}점 🎉`, "#ffff88");
}

// ========== 게임 오버 ==========
function gameOver() {
    if (!game.gameRunning) return;
    game.gameRunning = false;
    
    safeSound(se => {
        se.playGameOver();
        se.stopMusic();
    });
    
    document.getElementById('finalStats').innerHTML = 
        `최종 층: ${currentFloor} | 처치: ${game.player.killCount} | 점수: ${Math.floor(game.score)}`;
    document.getElementById('gameOverPanel').style.display = 'block';
}

// ========== 리셋 ==========
function restartGame() {
    currentFloor = 1;
    game.score = 0;
    mana = 100;
    maxMana = 100;
    specialAttackCooldown = 0;
    activeEffects = [];
    visualEffects = [];
    timeEventActive = false;
    secretRoomDiscovered = false;
    hasBossInFloor = false;
    bossDefeated = false;
    activeSkills = [];
    passiveBonuses = {
        criticalChance: 0,
        criticalDamage: 0.5,
        lifeSteal: 0,
        expBonus: 0,
        moveSpeedBonus: 0,
        attackBonus: 0,
        defenseBonus: 0
    };
    currentPet = null;
    clearAllEnemyStates();
    
    if (typeof playerCharacter !== 'undefined' && playerCharacter) {
        playerCharacter.resetDeath();
    }
    
    game.player = {
        x: 0, y: 0, vx: 0, vy: 0,
        size: 24,
        invincibleFrames: 0,
        maxHp: 100, hp: 100,
        level: 1, exp: 0, expToNext: 100,
        attackDamage: 15, defense: 5,
        killCount: 0,
        attackSpeed: 10, attackCooldown: 0,
        moveSpeed: 4.5
    };
    
    document.getElementById('gameOverPanel').style.display = 'none';
    
    safeSound(se => se.stopMusic());
    
    generateFloor(1);
    game.gameRunning = true;
}

// ========== 엔진 콜백 등록 ==========

game.on('onUpdate', (engine) => {
    if (isLevelUpMenuOpen || !engine.gameRunning) return;
    
    const now = performance.now() / 1000;
    const deltaTime = Math.min(0.033, now - (lastTimestamp || now));
    lastTimestamp = now;
    
    const enemies = engine.entities.enemies;
    const player = engine.player;
    
    updateEffects(deltaTime);
    
    if (specialAttackCooldown > 0) specialAttackCooldown--;
    
    for (let i = activeEffects.length - 1; i >= 0; i--) {
        const effect = activeEffects[i];
        effect.duration -= deltaTime;
        
        if (effect.type === 'poison') {
            if (effect.tickTimer === undefined) effect.tickTimer = 0;
            effect.tickTimer += deltaTime;
            if (effect.tickTimer >= 1.0) {
                effect.tickTimer = 0;
                engine.damagePlayer(effect.damage);
                showFloatingMessage(`☠️ 독 데미지! -${effect.damage}`, "#88ff44");
            }
        }
        
        if (effect.duration <= 0) {
            if (effect.type === 'slow' && effect.originalSpeed) {
                player.moveSpeed = effect.originalSpeed;
            }
            activeEffects.splice(i, 1);
        }
    }
    
    if (timeEventActive) {
        timeEventRemaining--;
        if (timeEventRemaining <= 0) {
            timeEventActive = false;
            showFloatingMessage("⏰ 시간 초과! 보상을 놓쳤습니다...", "#ff8888");
        }
    }
    
    updateEnemyAI(player, enemies, engine.worldWidth, engine.worldHeight, engine, deltaTime);
    
    if (player.hp <= 0) {
        gameOver();
        return;
    }
    
    engine.updateAttack(
        enemies,
        (p, e) => Math.hypot(p.x - e.x, p.y - e.y),
        (enemy, index) => {
            let damage = player.attackDamage;
            const elementalBonus = calculateElementalDamage('NEUTRAL', enemy.element);
            damage *= elementalBonus;
            
            const isCrit = Math.random() < passiveBonuses.criticalChance;
            if (isCrit) {
                damage *= (1.5 + passiveBonuses.criticalDamage);
                safeSound(se => se.playCritical());
                showFloatingMessage(`💥 CRITICAL! ${Math.floor(damage)}`, "#ffaa44");
            } else {
                safeSound(se => se.playAttack());
            }
            
            enemy.hp -= damage;
            
            if (passiveBonuses.lifeSteal > 0) {
                const healAmount = damage * passiveBonuses.lifeSteal;
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
            }
            
            if (enemy.hp <= 0) {
                const wasBoss = enemy.type === 'boss';
                const expGain = Math.floor(enemy.exp * (1 + passiveBonuses.expBonus));
                
                removeEnemyState(enemy);
                engine.entities.enemies.splice(index, 1);
                player.killCount++;
                engine.addExp(expGain);
                engine.addScore(50);
                
                if (wasBoss) {
                    safeSound(se => {
                        se.playBossKill();
                        se.playBossVictoryMusic();
                    });
                    bossDefeated = true;
                    showFloatingMessage(`👑 보스 처치!`, "#ffaa44");
                } else {
                    safeSound(se => se.playEnemyKill());
                }
                showFloatingMessage(`+${expGain} EXP`, "#88ff88");
            }
        }
    );
    
    if (currentPet) {
        const result = currentPet.update(player, enemies);
        if (result.hit && result.target) {
            safeSound(se => se.playPetAttack());
            
            if (result.target.hp <= 0) {
                const idx = enemies.indexOf(result.target);
                if (idx !== -1) {
                    const wasBoss = result.target.type === 'boss';
                    const expGain = result.target.exp;
                    
                    removeEnemyState(result.target);
                    enemies.splice(idx, 1);
                    player.killCount++;
                    game.addExp(expGain);
                    
                    if (wasBoss) {
                        safeSound(se => {
                            se.playBossKill();
                            se.playBossVictoryMusic();
                        });
                        bossDefeated = true;
                    } else {
                        safeSound(se => se.playEnemyKill());
                    }
                    showFloatingMessage(`🐾 ${Math.floor(result.damage)} 데미지!`, "#88ffaa");
                }
            }
        }
    }
    
    if (engine.entities.interactive) {
        for (let i = 0; i < engine.entities.interactive.length; i++) {
            const obj = engine.entities.interactive[i];
            if (obj.used) continue;
            
            const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
            if (dist < player.size/2 + obj.size/2) {
                const result = interactWithObject(obj, game, activeEffects, mana, maxMana);
                mana = result.mana;
                
                if (result.consumed) {
                    if (obj.type === 'trap') {
                        safeSound(se => {
                            se.playTrap();
                            se.playPlayerHit();
                        });
                    } else if (obj.type === 'chest' || obj.type === 'secret') {
                        safeSound(se => se.playChestOpen());
                    } else if (obj.type === 'shrine') {
                        safeSound(se => se.playHeal());
                    }
                }
                break;
            }
        }
    }
    
    for (let i = engine.entities.powerups.length - 1; i >= 0; i--) {
        const p = engine.entities.powerups[i];
        const dist = Math.hypot(player.x - p.x, player.y - p.y);
        
        if (dist < player.size/2 + p.size/2) {
            const result = pickupItem(p, game, mana, maxMana);
            mana = result.mana;
            engine.entities.powerups.splice(i, 1);
            safeSound(se => se.playItemPickup());
        }
    }
    
    if (enemies.length === 0 && engine.gameRunning) {
        goToNextFloor();
    }
    
    engine.addExp(0.02);
    mana = Math.min(maxMana, mana + 0.15);
    
    if (floatingMessage.timer > 0) {
        floatingMessage.timer -= deltaTime;
    }
});

game.on('onRender', (engine) => {
    const ctx = engine.ctx;
    
    renderEffects(ctx, engine.camera);
    renderInteractiveObjects(ctx, engine.entities.interactive, engine);
    
    if (typeof enemyRenderer !== 'undefined') {
        for (let e of engine.entities.enemies) {
            enemyRenderer.render(ctx, e, engine);
        }
    } else {
        renderEnemies(ctx, engine.entities.enemies, engine);
    }
    
    renderItems(ctx, engine.entities.powerups, engine);
    drawMouseDirection(ctx, engine, game, mouseX, mouseY);
    
    if (currentPet) {
        const screen = engine.worldToScreen(currentPet.x, currentPet.y);
        ctx.font = "26px monospace";
        ctx.fillStyle = currentPet.stats.color;
        ctx.fillText(currentPet.icon, screen.x, screen.y);
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#ffffaa";
        ctx.fillText(`Lv.${currentPet.level}`, screen.x - 3, screen.y - 3);
    }
    
    if (typeof renderDungeonDecorations === 'function') {
        renderDungeonDecorations(ctx, engine, engine.entities.wallDecorations);
    }
    
    drawSkillUI(ctx, engine, activeSkills, mana, maxMana, specialAttackCooldown);
    drawPetInfo(ctx, engine, currentPet);
    drawActiveEffects(ctx, engine, activeEffects);
    drawEventUI(ctx, engine, timeEventActive, timeEventRemaining, timeEventReward, secretRoomDiscovered);
    drawFloorUI(ctx, engine, currentFloor, engine.entities.enemies);
    drawDirectionGuide(ctx, engine);
    drawFloatingMessage(ctx, engine);
    
    ctx.shadowBlur = 0;
});

game.on('onLevelUp', (newLevel) => {
    safeSound(se => se.playLevelUp());
    showFloatingMessage(`🎉 레벨 ${newLevel} 달성! 🎉`, "#ffaa44");
    showLevelUpMenu(game, availableSkills);
});

game.on('onPlayerDamage', (damage) => {
    safeSound(se => se.playPlayerHit());
    showFloatingMessage(`💔 -${damage} HP`, "#ff6666");
});

window.addEventListener('keydown', (e) => {
    if (isLevelUpMenuOpen) return;
    
    const num = parseInt(e.key);
    if (num >= 1 && num <= 3 && activeSkills.length >= num) {
        const skill = activeSkills[num - 1];
        const result = useSpecialAttack(skill.id, game, mana, maxMana, specialAttackCooldown, activeEffects, visualEffects);
        mana = result.mana;
        specialAttackCooldown = result.specialAttackCooldown;
        
        if (result.success) {
            safeSound(se => {
                switch(skill.id) {
                    case 'FIREBALL': se.playFireball(); break;
                    case 'ICE_SHARD': se.playIceShard(); break;
                    case 'CHAIN_LIGHTNING': se.playLightning(); break;
                    case 'POISON_CLOUD': se.playPoisonCloud(); break;
                }
            });
        } else {
            safeSound(se => se.playManaLow());
        }
        e.preventDefault();
    }
    
    if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) {
        safeSound(se => {
            const muted = se.toggleMute();
            showFloatingMessage(muted ? '🔇 음소거' : '🔊 소리 켜짐', "#aaaaaa");
        });
    }
});

// ========== 초기화 ==========

document.addEventListener('click', () => {
    safeSound(se => se.resume());
}, { once: true });

document.addEventListener('keydown', () => {
    safeSound(se => se.resume());
}, { once: true });

// 게임 시작
generateFloor(1);
game.start();

// 리셋 버튼
document.getElementById('resetBtn').addEventListener('click', () => {
    safeSound(se => se.playClick());
    restartGame();
});
document.getElementById('gameOverRestart').addEventListener('click', () => {
    safeSound(se => se.playClick());
    restartGame();
});