// ============================================
// 로그라이크 게임 - 안정화 버전
// (속성, 스킬, 펫, 함정, 상자, 숨겨진 방, 시간제한 이벤트)
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
let currentPet = null;
let mana = 100;
let maxMana = 100;
let specialAttackCooldown = 0;
let activeEffects = [];
let timeEventActive = false;
let timeEventRemaining = 0;
let timeEventReward = 0;
let secretRoomDiscovered = false;
let floatingMessage = { text: "", color: "", timer: 0 };
let gameInitialized = false;

// ========== 속성 시스템 ==========
const Elements = {
    NEUTRAL: { name: '무속성', color: '#aaaaaa', icon: '⚪', strong: null, weak: null },
    FIRE: { name: '불꽃', color: '#ff6644', icon: '🔥', strong: 'ICE', weak: 'WATER' },
    ICE: { name: '얼음', color: '#88ccff', icon: '❄️', strong: 'WIND', weak: 'FIRE' },
    THUNDER: { name: '번개', color: '#ffee44', icon: '⚡', strong: 'WATER', weak: 'EARTH' },
    POISON: { name: '독', color: '#88ff44', icon: '☠️', strong: 'EARTH', weak: 'FIRE' },
    HOLY: { name: '신성', color: '#ffaaff', icon: '✨', strong: 'DARK', weak: 'NEUTRAL' },
    DARK: { name: '암흑', color: '#aa66ff', icon: '🌙', strong: 'HOLY', weak: 'LIGHT' }
};

// ========== 스킬 데이터 ==========
const SpecialAttacks = {
    FIREBALL: {
        id: 'FIREBALL',
        name: '화염구',
        icon: '🔥',
        element: 'FIRE',
        damage: 40,
        cooldown: 60,
        manaCost: 20,
        range: 200
    },
    ICE_SHARD: {
        id: 'ICE_SHARD',
        name: '얼음 파편',
        icon: '❄️',
        element: 'ICE',
        damage: 35,
        cooldown: 50,
        manaCost: 18,
        range: 180
    },
    CHAIN_LIGHTNING: {
        id: 'CHAIN_LIGHTNING',
        name: '연쇄 번개',
        icon: '⚡',
        element: 'THUNDER',
        damage: 30,
        cooldown: 70,
        manaCost: 25,
        range: 250
    },
    POISON_CLOUD: {
        id: 'POISON_CLOUD',
        name: '독 구름',
        icon: '☠️',
        element: 'POISON',
        damage: 20,
        cooldown: 55,
        manaCost: 22,
        range: 150
    }
};

// ========== 패시브 스킬 ==========
let passiveBonuses = {
    criticalChance: 0,
    criticalDamage: 0.5,
    lifeSteal: 0,
    expBonus: 0,
    moveSpeedBonus: 0,
    attackBonus: 0,
    defenseBonus: 0
};

let activeSkills = [];

// ========== 펫 클래스 ==========
class Pet {
    constructor(type) {
        this.type = type;
        this.level = 1;
        this.exp = 0;
        this.x = 0;
        this.y = 0;
        this.size = 20;
        this.attackCooldown = 0;
        
        const petData = {
            '🐉 용': { attack: 22, attackSpeed: 40, color: '#ff8866', icon: '🐉' },
            '🦊 여우': { attack: 15, attackSpeed: 30, color: '#ffaa66', icon: '🦊' },
            '🐱 고양이': { attack: 12, attackSpeed: 25, color: '#ffcc88', icon: '🐱' },
            '🦉 올빼미': { attack: 18, attackSpeed: 35, color: '#aa88ff', icon: '🦉' }
        };
        
        this.stats = petData[type] || petData['🐱 고양이'];
    }
    
    attackEnemy(enemy) {
        const damage = this.stats.attack * (0.8 + this.level * 0.1);
        enemy.hp -= damage;
        return damage;
    }
    
    update(player, enemies) {
        this.x = player.x - 32;
        this.y = player.y - 10;
        
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        if (this.attackCooldown === 0 && enemies.length > 0) {
            const target = enemies[0];
            const damage = this.attackEnemy(target);
            this.attackCooldown = this.stats.attackSpeed;
            return { hit: true, damage: damage, target: target };
        }
        return { hit: false };
    }
    
    addExp(amount) {
        this.exp += amount;
        if (this.exp >= 100) {
            this.level++;
            this.exp -= 100;
            return true;
        }
        return false;
    }
}

// ========== 적 데이터 ==========
const enemyTypes = [
    { name: '🔥 불꽃 정령', baseHp: 32, baseDamage: 14, baseExp: 45, element: 'FIRE', size: 28, color: '#ff6644', speed: 1.0 },
    { name: '❄️ 얼음 원소', baseHp: 38, baseDamage: 12, baseExp: 42, element: 'ICE', size: 28, color: '#88ccff', speed: 0.9 },
    { name: '⚡ 번개 구체', baseHp: 28, baseDamage: 17, baseExp: 48, element: 'THUNDER', size: 26, color: '#ffee44', speed: 1.1 },
    { name: '☠️ 독 거미', baseHp: 42, baseDamage: 15, baseExp: 52, element: 'POISON', size: 30, color: '#88ff44', speed: 0.85 },
    { name: '✨ 정령술사', baseHp: 35, baseDamage: 11, baseExp: 55, element: 'HOLY', size: 26, color: '#ffaaff', speed: 0.8 },
    { name: '🌙 암흑 기사', baseHp: 48, baseDamage: 18, baseExp: 60, element: 'DARK', size: 32, color: '#aa66ff', speed: 0.75 }
];

const bossTypes = [
    { name: '👑 원소의 지배자', baseHp: 220, baseDamage: 32, baseExp: 500, element: 'NEUTRAL', size: 58, color: '#ffaa88', speed: 0.85 },
    { name: '🐉 그림자 드래곤', baseHp: 260, baseDamage: 36, baseExp: 550, element: 'DARK', size: 62, color: '#8f6fff', speed: 0.8 }
];

// ========== 속성 데미지 계산 ==========
function calculateElementalDamage(attackerElement, defenderElement) {
    if (attackerElement === 'NEUTRAL' || defenderElement === 'NEUTRAL') return 1.0;
    if (!Elements[attackerElement] || !Elements[defenderElement]) return 1.0;
    
    const attackElem = Elements[attackerElement];
    const defendElem = Elements[defenderElement];
    
    if (attackElem.strong === defenderElement) return 1.5;
    if (attackElem.weak === defenderElement) return 0.7;
    return 1.0;
}

// ========== 방 생성 (절차적) ==========
function generateFloor(floorNum) {
    const worldSize = 1800 + Math.min(400, Math.floor(floorNum / 10) * 50);
    game.worldWidth = worldSize;
    game.worldHeight = worldSize;
    
    game.entities.enemies = [];
    game.entities.powerups = [];
    game.entities.obstacles = [];
    game.entities.interactive = [];
    
    // 장애물 생성
    const obstacleCount = 20 + Math.floor(Math.random() * 15);
    for (let i = 0; i < obstacleCount; i++) {
        game.entities.obstacles.push({
            x: 60 + Math.random() * (worldSize - 120),
            y: 60 + Math.random() * (worldSize - 120),
            w: 16 + Math.random() * 18,
            h: 16 + Math.random() * 18,
            type: Math.random() > 0.6 ? 'rock' : 'tree'
        });
    }
    
    // 상호작용 오브젝트 생성 (함정, 신전, 상자)
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
            // 함정
            const trapTypes = ['spike', 'poison', 'slow'];
            obj.type = 'trap';
            obj.trapType = trapTypes[Math.floor(Math.random() * trapTypes.length)];
            obj.color = '#aa5555';
            obj.icon = '⚠️';
        } else if (typeRand < 0.7) {
            // 신전
            const shrineTypes = ['heal', 'bless', 'random'];
            obj.type = 'shrine';
            obj.shrineType = shrineTypes[Math.floor(Math.random() * shrineTypes.length)];
            obj.color = '#88aaff';
            obj.icon = '🪨';
        } else {
            // 상자
            obj.type = 'chest';
            obj.color = '#ffcc44';
            obj.icon = '🎁';
        }
        
        game.entities.interactive.push(obj);
    }
    
    // 숨겨진 방 (10% 확률)
    secretRoomDiscovered = false;
    if (Math.random() < 0.12 && floorNum > 2) {
        game.entities.interactive.push({
            x: worldSize - 250,
            y: worldSize - 250,
            size: 80,
            type: 'secret',
            color: '#ffaa44',
            icon: '🌟',
            used: false
        });
    }
    
    // 시간 제한 이벤트 (15% 확률)
    if (Math.random() < 0.15 && floorNum > 1) {
        timeEventActive = true;
        timeEventRemaining = 300; // 5초 (60프레임 = 1초 기준)
        timeEventReward = 200 + Math.floor(floorNum * 15);
        showFloatingMessage(`⏰ 시간 제한 이벤트! ${(timeEventRemaining/60).toFixed(0)}초 내 클리어 시 +${timeEventReward}점!`, "#ffaa44");
    }
    
    // 적 생성
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
        game.entities.enemies.push(enemy);
    }
    
    // 보스 (5층마다)
    if (floorNum % 5 === 0) {
        const bossData = { ...bossTypes[Math.floor(Math.random() * bossTypes.length)] };
        const levelBonus = 1 + (floorNum - 1) * 0.15;
        
        game.entities.enemies.push({
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
    
    // 아이템 생성
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
        
        game.entities.powerups.push(item);
    }
    
    // 플레이어 위치 초기화
    game.player.x = worldSize / 2;
    game.player.y = worldSize / 2;
    game.player.vx = 0;
    game.player.vy = 0;
    
    showFloatingMessage(`🏰 ${floorNum}층 - 입장!`, "#ffaa88");
}

// ========== 특수 공격 사용 ==========
function useSpecialAttack(skillId) {
    if (specialAttackCooldown > 0) {
        showFloatingMessage(`⏳ 재사용 대기중!`, "#ff8888");
        return false;
    }
    
    const skill = SpecialAttacks[skillId];
    if (!skill) return false;
    
    if (mana < skill.manaCost) {
        showFloatingMessage(`💙 마나 부족! (${skill.manaCost} 필요)`, "#ff8888");
        return false;
    }
    
    mana -= skill.manaCost;
    specialAttackCooldown = skill.cooldown;
    
    const enemies = game.entities.enemies;
    let totalDamage = 0;
    let hitCount = 0;
    
    if (skillId === 'CHAIN_LIGHTNING') {
        // 연쇄 번개 - 최대 3명
        const targets = enemies.slice(0, 3);
        for (let enemy of targets) {
            const damage = skill.damage * calculateElementalDamage(skill.element, enemy.element);
            enemy.hp -= damage;
            totalDamage += damage;
            hitCount++;
            showFloatingMessage(`⚡ ${Math.floor(damage)}!`, "#ffee44");
        }
    } else if (skillId === 'POISON_CLOUD') {
        // 독 구름 - 범위 내 적
        for (let enemy of enemies) {
            const dist = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
            if (dist < skill.range) {
                const damage = skill.damage * calculateElementalDamage(skill.element, enemy.element);
                enemy.hp -= damage;
                totalDamage += damage;
                hitCount++;
            }
        }
        showFloatingMessage(`☠️ 독 구름! ${Math.floor(totalDamage)} 데미지`, "#88ff44");
    } else {
        // 단일 대상 - 가장 가까운 적
        let closest = null;
        let closestDist = Infinity;
        for (let enemy of enemies) {
            const dist = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
            if (dist < closestDist) {
                closestDist = dist;
                closest = enemy;
            }
        }
        
        if (closest && closestDist < skill.range) {
            const damage = skill.damage * calculateElementalDamage(skill.element, closest.element);
            closest.hp -= damage;
            totalDamage = damage;
            hitCount = 1;
            showFloatingMessage(`${skill.icon} ${Math.floor(damage)} 데미지!`, "#ffff88");
        } else {
            showFloatingMessage("❗ 대상이 너무 멉니다", "#ff8888");
            mana += skill.manaCost;
            specialAttackCooldown = 0;
            return false;
        }
    }
    
    // 죽은 적 제거
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].hp <= 0) {
            const expGain = enemies[i].exp;
            game.addExp(expGain);
            game.player.killCount++;
            game.addScore(50);
            enemies.splice(i, 1);
        }
    }
    
    if (hitCount > 0) {
        showFloatingMessage(`✨ 총 ${Math.floor(totalDamage)} 데미지!`, "#ffff88");
    }
    
    return true;
}

// ========== 상호작용 오브젝트 처리 ==========
function interactWithObject(obj) {
    if (obj.used) return false;
    
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
        return true;
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
        return true;
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
        return true;
    }
    
    if (obj.type === 'secret' && !secretRoomDiscovered) {
        secretRoomDiscovered = true;
        obj.used = true;
        obj.icon = '🏆';
        game.addScore(300);
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 100);
        mana = Math.min(maxMana, mana + 50);
        showFloatingMessage("🌟 숨겨진 방 발견! 보상 획득! 🌟", "#ffaa44");
        return true;
    }
    
    return false;
}

// ========== 펫 획득 ==========
function obtainPet() {
    if (!currentPet) {
        const petTypes = ['🐉 용', '🦊 여우', '🐱 고양이', '🦉 올빼미'];
        const randomPet = petTypes[Math.floor(Math.random() * petTypes.length)];
        currentPet = new Pet(randomPet);
        showFloatingMessage(`🐾 ${randomPet}이(가) 동료가 되었다!`, "#ffaa88");
    }
}

// ========== 레벨업 스킬 선택 ==========
function showLevelUpMenu() {
    isLevelUpMenuOpen = true;
    game.gameRunning = false;
    
    const skillOptions = [
        { id: 'dmg_up', name: '🗡️ 공격력 증가', desc: '공격력 +5', effect: () => { game.player.attackDamage += 5; passiveBonuses.attackBonus += 5; } },
        { id: 'def_up', name: '🛡️ 방어력 증가', desc: '방어력 +3', effect: () => { game.player.defense += 3; passiveBonuses.defenseBonus += 3; } },
        { id: 'hp_up', name: '❤️ 체력 증가', desc: '최대 체력 +20, 회복', effect: () => { game.player.maxHp += 20; game.player.hp += 20; } },
        { id: 'mana_up', name: '💙 마나 증가', desc: '최대 마나 +20', effect: () => { maxMana += 20; mana += 20; } },
        { id: 'crit_up', name: '⚡ 치명타', desc: '치명타 확률 +12%', effect: () => { passiveBonuses.criticalChance += 0.12; } },
        { id: 'lifesteal', name: '💉 생명력 흡수', desc: '공격 시 8% 흡수', effect: () => { passiveBonuses.lifeSteal += 0.08; } },
        { id: 'pet_summon', name: '🐾 펫 소환', desc: '동료 획득!', effect: () => { if (!currentPet) obtainPet(); } },
        { id: 'skill_fire', name: '🔥 화염구 습득', desc: '강력한 화염구 사용 가능', effect: () => { if (!activeSkills.find(s => s.id === 'FIREBALL')) activeSkills.push(SpecialAttacks.FIREBALL); } },
        { id: 'skill_ice', name: '❄️ 얼음 파편', desc: '적을 얼리는 마법', effect: () => { if (!activeSkills.find(s => s.id === 'ICE_SHARD')) activeSkills.push(SpecialAttacks.ICE_SHARD); } }
    ];
    
    // 랜덤 3개 선택
    availableSkills = [];
    const shuffled = [...skillOptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    availableSkills = shuffled.slice(0, 3);
    
    const menuDiv = document.createElement('div');
    menuDiv.id = 'skillMenu';
    menuDiv.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #0a0a2a; border: 3px solid #ff88cc; border-radius: 20px;
        padding: 25px; z-index: 200; text-align: center; min-width: 320px;
        background: rgba(10,10,42,0.95); backdrop-filter: blur(5px);
    `;
    
    let menuHtml = `
        <h2 style="color:#ffcc88; margin-bottom:20px;">✨ 레벨 업! Lv.${game.player.level} ✨</h2>
        <p style="color:#aaaaff; margin-bottom:20px;">스킬을 하나 선택하세요</p>
    `;
    
    for (let i = 0; i < availableSkills.length; i++) {
        const s = availableSkills[i];
        menuHtml += `
            <button id="skillBtn${i}" style="display:block; width:100%; margin:8px 0; padding:12px; 
                     background:#2a2a5a; border:1px solid #ff88cc; color:white; cursor:pointer;
                     font-family:monospace; text-align:left; border-radius:10px;">
                <strong>${s.name}</strong><br>
                <span style="font-size:11px; color:#aaaaff;">${s.desc}</span>
            </button>
        `;
    }
    menuHtml += `<button id="closeSkillMenu" style="margin-top:15px; background:#aa4466; padding:8px 20px; border:none; border-radius:20px; color:white; cursor:pointer;">나중에 선택</button>`;
    menuDiv.innerHTML = menuHtml;
    document.body.appendChild(menuDiv);
    
    for (let i = 0; i < availableSkills.length; i++) {
        document.getElementById(`skillBtn${i}`).addEventListener('click', () => {
            availableSkills[i].effect();
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

// ========== 다음 층 이동 ==========
function goToNextFloor() {
    // 시간 제한 이벤트 보상
    if (timeEventActive) {
        game.addScore(timeEventReward);
        showFloatingMessage(`⏰ 시간 제한 클리어! +${timeEventReward}점!`, "#ffaa44");
        timeEventActive = false;
    }
    
    currentFloor++;
    const bonus = 80 + currentFloor * 5;
    game.addScore(bonus);
    generateFloor(currentFloor);
    showFloatingMessage(`🎉 ${currentFloor-1}층 클리어! +${bonus}점 🎉`, "#ffff88");
}

// ========== 게임 오버 ==========
function gameOver() {
    game.gameRunning = false;
    document.getElementById('finalStats').innerHTML = 
        `최종 층: ${currentFloor} | 처치: ${game.player.killCount} | 점수: ${Math.floor(game.score)}`;
    document.getElementById('gameOverPanel').style.display = 'block';
}

function restartGame() {
    currentFloor = 1;
    game.score = 0;
    mana = 100;
    maxMana = 100;
    specialAttackCooldown = 0;
    activeEffects = [];
    timeEventActive = false;
    secretRoomDiscovered = false;
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

// ========== UI 함수 ==========
function showFloatingMessage(msg, color = "#ffffff") {
    floatingMessage = { text: msg, color: color, timer: 2.0 };
}

function drawSkillUI(ctx, engine) {
    const startX = engine.width - 170;
    const startY = engine.height - 130;
    
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(startX - 8, startY - 8, 175, 135);
    ctx.strokeStyle = "#ff88cc";
    ctx.strokeRect(startX - 8, startY - 8, 175, 135);
    
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#ffcc88";
    ctx.fillText("✨ 특수 스킬 (1~3번)", startX, startY - 2);
    
    let yOffset = 0;
    for (let i = 0; i < Math.min(3, activeSkills.length); i++) {
        const skill = activeSkills[i];
        const isReady = specialAttackCooldown === 0;
        ctx.fillStyle = isReady ? "#88ff88" : "#888888";
        ctx.font = "10px monospace";
        ctx.fillText(`${skill.icon} ${skill.name} (${skill.manaCost}💙)`, startX, startY + yOffset + 18);
        yOffset += 18;
    }
    
    if (activeSkills.length === 0) {
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "10px monospace";
        ctx.fillText("레벨업 시 스킬 습득!", startX, startY + 18);
    }
    
    // 마나바
    const manaPercent = mana / maxMana;
    ctx.fillStyle = "#330066";
    ctx.fillRect(startX, startY + 70, 155, 8);
    ctx.fillStyle = "#6688ff";
    ctx.fillRect(startX, startY + 70, 155 * manaPercent, 8);
    ctx.fillStyle = "#aaaaff";
    ctx.font = "9px monospace";
    ctx.fillText(`💙 ${Math.floor(mana)}/${maxMana}`, startX, startY + 68);
}

function drawPetInfo(ctx, engine) {
    if (!currentPet) return;
    
    const startX = 20;
    const startY = engine.height - 70;
    
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(startX - 5, startY - 5, 130, 55);
    ctx.strokeStyle = "#ffaa88";
    ctx.strokeRect(startX - 5, startY - 5, 130, 55);
    
    ctx.font = "12px monospace";
    ctx.fillStyle = "#ffaa88";
    ctx.fillText(`${currentPet.type} Lv.${currentPet.level}`, startX, startY + 12);
    
    const expPercent = currentPet.exp / 100;
    ctx.fillStyle = "#334433";
    ctx.fillRect(startX, startY + 18, 120, 5);
    ctx.fillStyle = "#88ff88";
    ctx.fillRect(startX, startY + 18, 120 * expPercent, 5);
}

function drawActiveEffects(ctx, engine) {
    if (activeEffects.length === 0) return;
    
    const startX = engine.width - 100;
    const startY = 70;
    
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(startX - 5, startY - 5, 95, 25 + activeEffects.length * 18);
    ctx.fillStyle = "#ffaa66";
    ctx.font = "bold 9px monospace";
    ctx.fillText("상태 이상", startX, startY + 8);
    
    for (let i = 0; i < activeEffects.length; i++) {
        const effect = activeEffects[i];
        ctx.fillStyle = effect.type === 'poison' ? "#88ff44" : "#88aaff";
        ctx.font = "9px monospace";
        const timeLeft = effect.duration.toFixed(1);
        ctx.fillText(`${effect.type === 'poison' ? '☠️' : '🐢'} ${timeLeft}s`, startX, startY + 25 + i * 15);
    }
}

// ========== 엔진 콜백 등록 ==========

// 업데이트 콜백
game.on('onUpdate', (engine) => {
    if (isLevelUpMenuOpen || !engine.gameRunning) return;
    
    const enemies = engine.entities.enemies;
    const player = engine.player;
    
    // 특수 스킬 쿨다운 감소
    if (specialAttackCooldown > 0) specialAttackCooldown--;
    
    // 지속 효과 업데이트
    for (let i = 0; i < activeEffects.length; i++) {
        const effect = activeEffects[i];
        effect.duration -= 0.016;
        
        if (effect.type === 'poison') {
            if (effect.tickTimer === undefined) effect.tickTimer = 0;
            effect.tickTimer += 0.016;
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
            i--;
        }
    }
    
    // 시간 제한 이벤트 업데이트
    if (timeEventActive) {
        timeEventRemaining--;
        if (timeEventRemaining <= 0) {
            timeEventActive = false;
            showFloatingMessage("⏰ 시간 초과! 보상을 놓쳤습니다...", "#ff8888");
        }
    }
    
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
        
        // 플레이어 충돌
        const playerRect = { x: player.x - player.size/2, y: player.y - player.size/2, w: player.size, h: player.size };
        const enemyRect = { x: e.x - e.size/2, y: e.y - e.size/2, w: e.size, h: e.size };
        
        if (engine.rectCollide(playerRect, enemyRect)) {
            const actualDamage = Math.max(5, e.damage - player.defense);
            engine.damagePlayer(actualDamage);
            player.vx = (player.x - e.x) * 1.2;
            player.vy = (player.y - e.y) * 1.2;
            
            if (player.hp <= 0) {
                gameOver();
            }
        }
    }
    
    // 일반 공격
    engine.updateAttack(
        enemies,
        (p, e) => Math.hypot(p.x - e.x, p.y - e.y),
        (enemy, index) => {
            let damage = player.attackDamage;
            
            // 속성 데미지 계산
            const elementalBonus = calculateElementalDamage('NEUTRAL', enemy.element);
            damage *= elementalBonus;
            
            // 치명타
            const isCrit = Math.random() < passiveBonuses.criticalChance;
            if (isCrit) {
                damage *= (1.5 + passiveBonuses.criticalDamage);
                showFloatingMessage(`💥 CRITICAL! ${Math.floor(damage)}`, "#ffaa44");
            }
            
            enemy.hp -= damage;
            
            // 생명력 흡수
            if (passiveBonuses.lifeSteal > 0) {
                const healAmount = damage * passiveBonuses.lifeSteal;
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
            }
            
            if (enemy.hp <= 0) {
                engine.entities.enemies.splice(index, 1);
                player.killCount++;
                const expGain = Math.floor(enemy.exp * (1 + passiveBonuses.expBonus));
                engine.addExp(expGain);
                engine.addScore(50);
                showFloatingMessage(`+${expGain} EXP`, "#88ff88");
            }
        }
    );
    
    // 펫 공격
    if (currentPet) {
        const result = currentPet.update(player, enemies);
        if (result.hit && result.target.hp <= 0) {
            const idx = enemies.indexOf(result.target);
            if (idx !== -1) {
                enemies.splice(idx, 1);
                player.killCount++;
                game.addExp(result.target.exp);
            }
            showFloatingMessage(`🐾 ${Math.floor(result.damage)} 데미지!`, "#88ffaa");
        }
    }
    
    // 상호작용 오브젝트
    if (engine.entities.interactive) {
        for (let obj of engine.entities.interactive) {
            const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
            if (dist < player.size/2 + obj.size/2 && !obj.used) {
                interactWithObject(obj);
                break;
            }
        }
    }
    
    // 아이템 획득
    for (let i = 0; i < engine.entities.powerups.length; i++) {
        const p = engine.entities.powerups[i];
        const dist = Math.hypot(player.x - p.x, player.y - p.y);
        
        if (dist < player.size/2 + p.size/2) {
            if (p.type === 'code') {
                engine.addScore(p.value);
                showFloatingMessage(`✨ 코드 획득! +${p.value}점 ✨`, "#88ff88");
            } else if (p.type === 'heal') {
                player.hp = Math.min(player.maxHp, player.hp + p.value);
                showFloatingMessage(`❤️ +${p.value} 체력`, "#ff8888");
            } else if (p.type === 'mana') {
                mana = Math.min(maxMana, mana + p.value);
                showFloatingMessage(`💙 +${p.value} 마나`, "#8888ff");
            } else if (p.type === 'elemental') {
                const bonus = 12;
                player.attackDamage += bonus;
                showFloatingMessage(`${p.symbol} 원소의 힘! 공격력 +${bonus}`, "#ffaa88");
            } else if (p.type === 'pet_food' && currentPet) {
                const leveled = currentPet.addExp(p.value);
                showFloatingMessage(`🍖 펫 경험치 +${p.value}!`, "#88ffaa");
                if (leveled) {
                    showFloatingMessage(`🐾 펫 레벨업! Lv.${currentPet.level} 🐾`, "#ffaa88");
                }
            }
            engine.entities.powerups.splice(i, 1);
            i--;
        }
    }
    
    // 층 클리어 체크
    if (enemies.length === 0 && engine.gameRunning) {
        goToNextFloor();
    }
    
    // 자연 경험치 (매우 미미)
    engine.addExp(0.02);
    
    // 마나 자연 회복
    mana = Math.min(maxMana, mana + 0.15);
    
    // 메시지 타이머
    if (floatingMessage.timer > 0) {
        floatingMessage.timer -= 0.016;
    }
});

// 렌더링 콜백
game.on('onRender', (engine) => {
    const ctx = engine.ctx;
    
    // 상호작용 오브젝트 렌더링
    if (engine.entities.interactive) {
        for (let obj of engine.entities.interactive) {
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
    
    // 적 렌더링
    for (let e of engine.entities.enemies) {
        const screen = engine.worldToScreen(e.x - e.size/2, e.y - e.size/2);
        if (screen.x + e.size > 0 && screen.x < engine.width && 
            screen.y + e.size > 0 && screen.y < engine.height) {
            
            const bob = Math.sin(engine.frame * 0.05 + (e.bobOffset || 0)) * 2;
            ctx.shadowBlur = 6;
            
            // 몸체
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.ellipse(screen.x + e.size/2, screen.y + e.size/3 + bob, e.size/2, e.size/2.2, 0, 0, Math.PI*2);
            ctx.fill();
            
            // 속성 아이콘
            ctx.font = `bold ${Math.floor(e.size * 0.45)}px monospace`;
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 2;
            ctx.fillText(Elements[e.element]?.icon || '⚪', screen.x + e.size/2 - 8, screen.y + e.size/3 + 4 + bob);
            
            // 체력바 (보스만)
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
    
    // 아이템 렌더링
    for (let p of engine.entities.powerups) {
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
    
    // 펫 렌더링
    if (currentPet) {
        const screen = engine.worldToScreen(currentPet.x, currentPet.y);
        ctx.font = "26px monospace";
        ctx.fillStyle = currentPet.stats.color;
        ctx.fillText(currentPet.icon, screen.x, screen.y);
        
        // 레벨 표시
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#ffffaa";
        ctx.fillText(`Lv.${currentPet.level}`, screen.x - 3, screen.y - 3);
    }
    
    // UI 요소
    drawSkillUI(ctx, engine);
    drawPetInfo(ctx, engine);
    drawActiveEffects(ctx, engine);
    
    // 시간 제한 이벤트 표시
    if (timeEventActive) {
        const timeLeft = (timeEventRemaining / 60).toFixed(1);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(engine.width / 2 - 100, 10, 200, 35);
        ctx.fillStyle = "#ffaa44";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`⏰ 시간 제한: ${timeLeft}s`, engine.width / 2 - 85, 33);
        ctx.fillStyle = "#ffff88";
        ctx.font = "10px monospace";
        ctx.fillText(`보상: +${timeEventReward}점`, engine.width / 2 - 60, 48);
    }
    
    // 층 정보
    ctx.font = "bold 22px monospace";
    ctx.fillStyle = "#ffaa88";
    ctx.fillText(`🏰 ${currentFloor}층`, 20, 85);
    
    // 보스 표시
    const hasBoss = engine.entities.enemies.some(e => e.type === 'boss');
    if (hasBoss) {
        ctx.fillStyle = "#ff6666";
        ctx.font = "bold 14px monospace";
        ctx.fillText("⚠️ BOSS ⚠️", 20, 115);
    }
    
    // 숨겨진 방 알림
    if (secretRoomDiscovered) {
        ctx.fillStyle = "#ffaa44";
        ctx.font = "bold 10px monospace";
        ctx.fillText("🌟 숨겨진 방 발견!", engine.width - 120, 60);
    }
    
    // 팝업 메시지
    if (floatingMessage.timer > 0) {
        ctx.font = "bold 20px monospace";
        ctx.fillStyle = floatingMessage.color;
        ctx.shadowBlur = 8;
        const textWidth = floatingMessage.text.length * 10;
        ctx.fillText(floatingMessage.text, engine.width/2 - textWidth/2, engine.height/2 - 80);
    }
    
    ctx.shadowBlur = 0;
});

// 레벨업 콜백
game.on('onLevelUp', (newLevel) => {
    showFloatingMessage(`🎉 레벨 ${newLevel} 달성! 🎉`, "#ffaa44");
    showLevelUpMenu();
});

// 데미지 콜백
game.on('onPlayerDamage', (damage) => {
    showFloatingMessage(`💔 -${damage} HP`, "#ff6666");
});

// 특수 스킬 단축키 (1,2,3)
window.addEventListener('keydown', (e) => {
    if (isLevelUpMenuOpen) return;
    
    const num = parseInt(e.key);
    if (num >= 1 && num <= 3 && activeSkills.length >= num) {
        const skill = activeSkills[num - 1];
        useSpecialAttack(skill.id);
        e.preventDefault();
    }
});

// 게임 시작
generateFloor(1);
game.start();

// 리셋 버튼
document.getElementById('resetBtn').addEventListener('click', () => restartGame());
document.getElementById('gameOverRestart').addEventListener('click', () => restartGame());