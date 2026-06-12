// ============================================
// 아이템 & 상호작용 오브젝트
// ============================================

// ========== 장애물 생성 ==========
function spawnObstacles(worldSize, entities) {
    const obstacleCount = 20 + Math.floor(Math.random() * 15);
    for (let i = 0; i < obstacleCount; i++) {
        entities.obstacles.push({
            x: 60 + Math.random() * (worldSize - 120),
            y: 60 + Math.random() * (worldSize - 120),
            w: 16 + Math.random() * 18,
            h: 16 + Math.random() * 18,
            type: Math.random() > 0.6 ? 'rock' : 'tree'
        });
    }
}

// ========== 상호작용 오브젝트 생성 ==========
function spawnInteractiveObjects(floorNum, worldSize, entities) {
    const interactiveCount = 12 + Math.floor(Math.random() * 10);
    for (let i = 0; i < interactiveCount; i++) {
        const typeRand = Math.random();
        let obj = {
            x: 70 + Math.random() * (worldSize - 140),
            y: 70 + Math.random() * (worldSize - 140),
            size: 26,
            used: false
        };
        
        if (typeRand < 0.4) {
            const trapTypes = ['spike', 'poison', 'slow'];
            obj.type = 'trap';
            obj.trapType = trapTypes[Math.floor(Math.random() * trapTypes.length)];
            obj.color = '#aa5555';
            obj.icon = '⚠️';
        } else if (typeRand < 0.7) {
            const shrineTypes = ['heal', 'bless', 'random'];
            obj.type = 'shrine';
            obj.shrineType = shrineTypes[Math.floor(Math.random() * shrineTypes.length)];
            obj.color = '#88aaff';
            obj.icon = '🪨';
        } else {
            obj.type = 'chest';
            obj.color = '#ffcc44';
            obj.icon = '🎁';
        }
        
        entities.interactive.push(obj);
    }
    
    // 숨겨진 방 (12% 확률, 3층부터)
    if (Math.random() < 0.12 && floorNum > 2) {
        entities.interactive.push({
            x: worldSize - 250,
            y: worldSize - 250,
            size: 80,
            type: 'secret',
            color: '#ffaa44',
            icon: '🌟',
            used: false
        });
    }
}

// ========== 아이템 생성 ==========
function spawnItems(worldSize, entities) {
    const itemCount = 12 + Math.floor(Math.random() * 8);
    const itemTypes = ['code', 'heal', 'mana', 'elemental', 'pet_food'];
    const codeTexts = ['<JS/>', '{fn}', '=>', '</>', 'let', 'const'];
    
    for (let i = 0; i < itemCount; i++) {
        const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        let item = {
            x: 50 + Math.random() * (worldSize - 100),
            y: 50 + Math.random() * (worldSize - 100),
            size: 18,
            type: type
        };
        
        if (type === 'code') {
            item.codeText = codeTexts[Math.floor(Math.random() * codeTexts.length)];
            item.value = 60 + Math.floor(Math.random() * 30);
        } else if (type === 'heal') {
            item.value = 30 + Math.floor(Math.random() * 20);
            item.symbol = '❤️';
        } else if (type === 'mana') {
            item.value = 25 + Math.floor(Math.random() * 20);
            item.symbol = '💙';
        } else if (type === 'elemental') {
            const elements = ['FIRE', 'ICE', 'THUNDER', 'POISON'];
            item.element = elements[Math.floor(Math.random() * elements.length)];
            item.symbol = Elements[item.element].icon;
            item.value = 15;
        } else if (type === 'pet_food') {
            item.value = 20 + Math.floor(Math.random() * 20);
            item.symbol = '🍖';
        }
        
        entities.powerups.push(item);
    }
}

// ========== 상호작용 처리 ==========
function interactWithObject(obj, game, activeEffects, mana, maxMana) {
    if (obj.used) return { mana, consumed: false };
    
    if (obj.type === 'trap') {
        obj.used = true;
        obj.icon = '💀';
        
        switch(obj.trapType) {
            case 'spike':
                game.damagePlayer(20);
                showFloatingMessage("⚔️ 가시 덫! -20 HP", "#ff6666");
                break;
            case 'poison':
                game.damagePlayer(10);
                activeEffects.push({ type: 'poison', duration: 3, damage: 4, tickTimer: 0 });
                showFloatingMessage("☠️ 독 함정!", "#88ff44");
                break;
            case 'slow':
                activeEffects.push({ type: 'slow', duration: 2.5, originalSpeed: game.player.moveSpeed });
                game.player.moveSpeed = Math.max(2, game.player.moveSpeed * 0.6);
                showFloatingMessage("🐢 속도 저하!", "#88aaff");
                break;
        }
        return { mana, consumed: true };
    }
    
    if (obj.type === 'shrine') {
        obj.used = true;
        obj.icon = '✨';
        
        switch(obj.shrineType) {
            case 'heal':
                const healAmount = 45;
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + healAmount);
                showFloatingMessage(`❤️ +${healAmount} 체력 회복!`, "#88ff88");
                break;
            case 'bless':
                passiveBonuses.attackBonus += 4;
                game.player.attackDamage += 4;
                showFloatingMessage(`✨ 공격력 +4!`, "#ffff88");
                break;
            case 'random':
                const rand = Math.random();
                if (rand < 0.4) {
                    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 35);
                    showFloatingMessage("🎲 축복: 체력 +35!", "#88ff88");
                } else if (rand < 0.7) {
                    game.player.attackDamage += 3;
                    showFloatingMessage("🎲 축복: 공격력 +3!", "#ffff88");
                } else {
                    game.damagePlayer(15);
                    showFloatingMessage("🎲 저주: -15 HP", "#ff6666");
                }
                break;
        }
        return { mana, consumed: true };
    }
    
    if (obj.type === 'chest') {
        obj.used = true;
        obj.icon = '📦';
        
        const rand = Math.random();
        if (rand < 0.35) {
            game.addScore(120);
            showFloatingMessage("💰 120점 획득!", "#ffcc44");
        } else if (rand < 0.6) {
            const healAmount = 50;
            game.player.hp = Math.min(game.player.maxHp, game.player.hp + healAmount);
            showFloatingMessage(`🧪 회복 포션! +${healAmount} HP`, "#ff8888");
        } else if (rand < 0.8) {
            mana = Math.min(maxMana, mana + 40);
            showFloatingMessage(`💙 마나 포션! +40 MP`, "#8888ff");
        } else {
            game.addExp(50);
            showFloatingMessage(`⭐ 경험치 50 획득!`, "#ffff88");
        }
        return { mana, consumed: true };
    }
    
    if (obj.type === 'secret' && !secretRoomDiscovered) {
        secretRoomDiscovered = true;
        obj.used = true;
        obj.icon = '🏆';
        game.addScore(300);
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 100);
        mana = Math.min(maxMana, mana + 50);
        showFloatingMessage("🌟 숨겨진 방 발견! 보상 획득! 🌟", "#ffaa44");
        return { mana, consumed: true };
    }
    
    return { mana, consumed: false };
}

// ========== 아이템 획득 처리 ==========
function pickupItem(item, game, mana, maxMana) {
    let result = { mana, consumed: false };
    
    if (item.type === 'code') {
        game.addScore(item.value);
        showFloatingMessage(`✨ 코드 획득! +${item.value}점 ✨`, "#88ff88");
    } else if (item.type === 'heal') {
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + item.value);
        showFloatingMessage(`❤️ +${item.value} 체력`, "#ff8888");
    } else if (item.type === 'mana') {
        mana = Math.min(maxMana, mana + item.value);
        showFloatingMessage(`💙 +${item.value} 마나`, "#8888ff");
    } else if (item.type === 'elemental') {
        const bonus = 12;
        game.player.attackDamage += bonus;
        showFloatingMessage(`${item.symbol} 원소의 힘! 공격력 +${bonus}`, "#ffaa88");
    } else if (item.type === 'pet_food' && currentPet) {
        const leveled = currentPet.addExp(item.value);
        showFloatingMessage(`🍖 펫 경험치 +${item.value}!`, "#88ffaa");
        if (leveled) {
            showFloatingMessage(`🐾 펫 레벨업! Lv.${currentPet.level} 🐾`, "#ffaa88");
        }
    }
    
    return { mana, consumed: true };
}

// ========== 아이템 렌더링 ==========
function renderItems(ctx, powerups, engine) {
    for (let p of powerups) {
        const screen = engine.worldToScreen(p.x, p.y);
        if (screen.x + p.size > 0 && screen.x < engine.width && 
            screen.y + p.size > 0 && screen.y < engine.height) {
            
            ctx.fillStyle = "#44ffaa";
            ctx.fillRect(screen.x, screen.y, p.size, p.size);
            ctx.font = `bold ${Math.floor(p.size * 0.8)}px monospace`;
            
            if (p.type === 'code') {
                ctx.fillStyle = "#003322";
                ctx.fillText(p.codeText, screen.x + 2, screen.y + 13);
            } else {
                ctx.fillStyle = "#ffffff";
                ctx.fillText(p.symbol, screen.x + 4, screen.y + 14);
            }
        }
    }
}

// ========== 상호작용 오브젝트 렌더링 ==========
function renderInteractiveObjects(ctx, interactive, engine) {
    if (!interactive) return;
    
    for (let obj of interactive) {
        const screen = engine.worldToScreen(obj.x - obj.size/2, obj.y - obj.size/2);
        if (screen.x + obj.size > 0 && screen.x < engine.width && 
            screen.y + obj.size > 0 && screen.y < engine.height) {
            
            ctx.fillStyle = obj.used ? '#666666' : obj.color;
            ctx.fillRect(screen.x, screen.y, obj.size, obj.size);
            ctx.fillStyle = "#ffffff";
            ctx.font = `${obj.used ? '16px' : '18px'} monospace`;
            ctx.fillText(obj.icon, screen.x + 5, screen.y + 18);
        }
    }
}