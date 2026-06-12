// ============================================
// 로그라이크 게임 - 기믹 추가 버전
// ============================================

const game = new GameEngine('gameCanvas', {
    width: 1000,
    height: 600,
    worldWidth: 1800,
    worldHeight: 1800,
    playerSize: 24
});

// ========== 속성 시스템 ==========
const Elements = {
    NEUTRAL: { name: '무속성', color: '#aaaaaa', icon: '⚪' },
    FIRE: { name: '불꽃', color: '#ff6644', icon: '🔥', strong: 'ICE', weak: 'WATER' },
    ICE: { name: '얼음', color: '#88ccff', icon: '❄️', strong: 'WIND', weak: 'FIRE' },
    THUNDER: { name: '번개', color: '#ffee44', icon: '⚡', strong: 'WATER', weak: 'EARTH' },
    POISON: { name: '독', color: '#88ff44', icon: '☠️', strong: 'EARTH', weak: 'FIRE' },
    HOLY: { name: '신성', color: '#ffaaff', icon: '✨', strong: 'DARK', weak: 'NEUTRAL' },
    DARK: { name: '암흑', color: '#aa66ff', icon: '🌙', strong: 'HOLY', weak: 'LIGHT' }
};

// ========== 스킬 트리 ==========
const SkillTree = {
    activeSkills: [],
    passiveBonuses: {
        criticalChance: 0,
        criticalDamage: 0,
        lifeSteal: 0,
        expBonus: 0,
        goldBonus: 0
    }
};

const SpecialAttacks = {
    FIREBALL: {
        name: '화염구',
        element: 'FIRE',
        damage: 40,
        cooldown: 60,
        manaCost: 20,
        effect: 'burn'
    },
    ICE_SHARD: {
        name: '얼음 파편',
        element: 'ICE',
        damage: 30,
        cooldown: 45,
        manaCost: 15,
        effect: 'slow'
    },
    CHAIN_LIGHTNING: {
        name: '연쇄 번개',
        element: 'THUNDER',
        damage: 25,
        cooldown: 70,
        manaCost: 25,
        effect: 'chain'
    },
    POISON_CLOUD: {
        name: '독 구름',
        element: 'POISON',
        damage: 15,
        cooldown: 50,
        manaCost: 18,
        effect: 'poison'
    },
    HOLY_NOVA: {
        name: '신성의 고리',
        element: 'HOLY',
        damage: 35,
        cooldown: 55,
        manaCost: 22,
        effect: 'heal'
    }
};

// ========== 펫 시스템 ==========
class Pet {
    constructor(type) {
        this.type = type;
        this.level = 1;
        this.exp = 0;
        
        const petData = {
            '🐉 드래곤': { attack: 20, defense: 10, ability: 'fire_breath' },
            '🦊 구미호': { attack: 15, defense: 5, ability: 'charm' },
            '🐱 마법 고양이': { attack: 10, defense: 8, ability: 'magic_boost' },
            '🦉 현명한 올빼미': { attack: 12, defense: 6, ability: 'exp_boost' }
        };
        
        this.stats = petData[type];
        this.x = 0;
        this.y = 0;
        this.size = 20;
    }
    
    attackEnemy(enemy) {
        const damage = this.stats.attack * (0.8 + this.level * 0.1);
        enemy.hp -= damage;
        return damage;
    }
}

// ========== 상호작용 오브젝트 ==========
const InteractiveObjects = {
    TRAP: {
        name: '덫',
        types: ['spike', 'poison', 'slow', 'teleport'],
        effects: {
            spike: { damage: 25, message: '⚔️ 가시 덫에 걸렸다! -25 HP' },
            poison: { damage: 10, duration: 5, message: '☠️ 독 함정! 지속 피해!' },
            slow: { duration: 3, message: '🐢 속도 저하 함정!' },
            teleport: { message: '🌀 순간 이동 함정!' }
        }
    },
    SHRINE: {
        name: '신비한 돌',
        types: ['heal', 'bless', 'curse', 'random'],
        effects: {
            heal: { heal: 50, message: '❤️ 신비한 돌이 체력을 회복시켰다! +50 HP' },
            bless: { effect: 'attack_up', message: '✨ 신성한 축복! 공격력 +5' },
            curse: { effect: 'attack_down', message: '💀 저주에 걸렸다! 공격력 -5' },
            random: { message: '🎲 운명의 수레바퀴!' }
        }
    },
    CHEST: {
        name: '보물 상자',
        rewards: ['gold', 'potion', 'skill', 'equipment', 'pet_food']
    }
};

// ========== 조합 시스템 ==========
const Combinations = {
    known: [],
    recipes: {
        '🔥+❄️': { result: '💨 증기 폭탄', effect: 'area_damage', damage: 50 },
        '⚡+☠️': { result: '💀 맹독 번개', effect: 'poison_lightning', damage: 60 },
        '✨+🌙': { result: '🌓 균형의 결정', effect: 'balance', heal: 40, damage: 40 },
        '🔥+⚡': { result: '💥 플라즈마 볼', effect: 'explosion', damage: 70 }
    }
};

// ========== 게임 상태 ==========
let currentFloor = 1;
let isLevelUpMenuOpen = false;
let availableSkills = [];
let currentPet = null;
let mana = 100;
let maxMana = 100;
let specialAttackCooldown = 0;
let activeEffects = [];
let floorEvents = [];
let discoveredRooms = new Set();
let achievements = [];
let dailyChallenge = null;

// ========== 적 데이터 (속성 추가) ==========
const enemyTypes = [
    { name: '🔥 불꽃 정령', baseHp: 30, baseDamage: 15, baseExp: 45, element: 'FIRE', size: 28, color: '#ff6644', speed: 1.0 },
    { name: '❄️ 얼음 원소', baseHp: 35, baseDamage: 12, baseExp: 40, element: 'ICE', size: 28, color: '#88ccff', speed: 0.9 },
    { name: '⚡ 번개 구체', baseHp: 25, baseDamage: 18, baseExp: 50, element: 'THUNDER', size: 26, color: '#ffee44', speed: 1.2 },
    { name: '☠️ 독 거미', baseHp: 40, baseDamage: 14, baseExp: 55, element: 'POISON', size: 30, color: '#88ff44', speed: 0.8 },
    { name: '✨ 성스러운 정령', baseHp: 28, baseDamage: 10, baseExp: 60, element: 'HOLY', size: 24, color: '#ffaaff', speed: 0.7 },
    { name: '🌙 어둠의 기사', baseHp: 50, baseDamage: 20, baseExp: 70, element: 'DARK', size: 32, color: '#aa66ff', speed: 0.6 }
];

const bossTypes = [
    { name: '👑 4대 원소의 지배자', baseHp: 250, baseDamage: 35, baseExp: 500, element: 'NEUTRAL', size: 60, color: '#ffaa88', speed: 0.8 },
    { name: '🐉 그림자 군주', baseHp: 300, baseDamage: 40, baseExp: 600, element: 'DARK', size: 65, color: '#8f6fff', speed: 0.7 }
];

// ========== 절차적 방 생성 (기믹 추가) ==========
function generateFloor(floorNum) {
    const worldSize = 2000;
    game.worldWidth = worldSize;
    game.worldHeight = worldSize;
    
    game.entities.enemies = [];
    game.entities.powerups = [];
    game.entities.obstacles = [];
    game.entities.interactive = [];
    
    // 장애물 + 함정 생성
    const objectCount = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < objectCount; i++) {
        const type = Math.random();
        if (type < 0.3) {
            // 함정
            const trapType = InteractiveObjects.TRAP.types[Math.floor(Math.random() * InteractiveObjects.TRAP.types.length)];
            game.entities.interactive.push({
                x: 80 + Math.random() * (worldSize - 160),
                y: 80 + Math.random() * (worldSize - 160),
                type: 'trap',
                trapType: trapType,
                size: 25,
                triggered: false,
                color: '#aa5555'
            });
        } else if (type < 0.5) {
            // 신비한 돌
            const shrineType = InteractiveObjects.SHRINE.types[Math.floor(Math.random() * InteractiveObjects.SHRINE.types.length)];
            game.entities.interactive.push({
                x: 80 + Math.random() * (worldSize - 160),
                y: 80 + Math.random() * (worldSize - 160),
                type: 'shrine',
                shrineType: shrineType,
                size: 28,
                used: false,
                color: '#88aaff'
            });
        } else {
            // 보물 상자
            game.entities.interactive.push({
                x: 80 + Math.random() * (worldSize - 160),
                y: 80 + Math.random() * (worldSize - 160),
                type: 'chest',
                size: 28,
                opened: false,
                color: '#ffcc44'
            });
        }
    }
    
    // 적 생성 (속성 적용)
    const enemyCount = 12 + Math.floor(floorNum * 0.8);
    for (let i = 0; i < enemyCount; i++) {
        const enemyData = { ...enemyTypes[Math.floor(Math.random() * enemyTypes.length)] };
        const levelBonus = 1 + (floorNum - 1) * 0.12;
        
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
            effects: []
        };
        game.entities.enemies.push(enemy);
    }
    
    // 보스 (5층마다)
    if (floorNum % 5 === 0) {
        const bossData = { ...bossTypes[Math.floor(Math.random() * bossTypes.length)] };
        const levelBonus = 1 + (floorNum - 1) * 0.2;
        
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
            bobOffset: Math.random() * Math.PI * 2,
            effects: []
        });
    }
    
    // 숨겨진 방 (10% 확률)
    if (Math.random() < 0.15) {
        const secretRoom = {
            x: worldSize - 300,
            y: worldSize - 300,
            size: 150,
            type: 'secret',
            reward: 'legendary'
        };
        game.entities.interactive.push(secretRoom);
    }
    
    // 특수 아이템 생성
    const itemCount = 15;
    const itemTypes = ['code', 'heal', 'mana', 'elemental', 'pet_food'];
    const codeTexts = ['<JS/>', '{fn}', '=>', '</>', 'let', 'const', 'new'];
    
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
            item.value = 75;
        } else if (type === 'heal') {
            item.value = 40;
            item.symbol = '❤️';
        } else if (type === 'mana') {
            item.value = 30;
            item.symbol = '💙';
        } else if (type === 'elemental') {
            const elements = Object.keys(Elements);
            item.element = elements[Math.floor(Math.random() * elements.length)];
            item.symbol = Elements[item.element].icon;
            item.value = 20;
        } else if (type === 'pet_food') {
            item.value = 25;
            item.symbol = '🍖';
        }
        
        game.entities.powerups.push(item);
    }
    
    // 펫 위치 설정
    if (currentPet) {
        currentPet.x = game.player.x - 30;
        currentPet.y = game.player.y;
    }
    
    game.player.x = worldSize / 2;
    game.player.y = worldSize / 2;
    
    showFloatingMessage(`🏰 ${floorNum}층 - 던전에 입장했습니다! 🏰`, "#ffaa88");
}

// ========== 속성 데미지 계산 ==========
function calculateElementalDamage(attackerElement, defenderElement) {
    if (attackerElement === 'NEUTRAL' || defenderElement === 'NEUTRAL') return 1.0;
    
    const attackElem = Elements[attackerElement];
    const defendElem = Elements[defenderElement];
    
    if (attackElem.strong === defenderElement) return 1.5;
    if (attackElem.weak === defenderElement) return 0.7;
    return 1.0;
}

// ========== 특수 공격 ==========
function useSpecialAttack(skillId) {
    if (specialAttackCooldown > 0) {
        showFloatingMessage(`⏳ 스킬 재사용 대기중! (${specialAttackCooldown}프레임)`, "#ff8888");
        return false;
    }
    
    const skill = SpecialAttacks[skillId];
    if (!skill) return false;
    
    if (mana < skill.manaCost) {
        showFloatingMessage(`💙 마나 부족! (필요: ${skill.manaCost})`, "#ff8888");
        return false;
    }
    
    mana -= skill.manaCost;
    specialAttackCooldown = skill.cooldown;
    
    const enemies = game.entities.enemies;
    let totalDamage = 0;
    
    if (skillId === 'CHAIN_LIGHTNING') {
        // 연쇄 번개: 여러 적에게
        for (let i = 0; i < Math.min(3, enemies.length); i++) {
            const enemy = enemies[i];
            const damage = skill.damage * calculateElementalDamage(skill.element, enemy.element);
            enemy.hp -= damage;
            totalDamage += damage;
            showFloatingMessage(`⚡ ${damage} 데미지!`, "#ffee44");
        }
    } else if (skillId === 'HOLY_NOVA') {
        // 신성의 고리: 주변 적 공격 + 체력 회복
        for (let enemy of enemies) {
            const dist = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
            if (dist < 150) {
                const damage = skill.damage * calculateElementalDamage(skill.element, enemy.element);
                enemy.hp -= damage;
                totalDamage += damage;
            }
        }
        const healAmount = 30;
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + healAmount);
        showFloatingMessage(`✨ +${healAmount} 체력 회복 ✨`, "#ff8888");
    } else {
        // 단일 대상 공격
        let closest = null;
        let closestDist = Infinity;
        for (let enemy of enemies) {
            const dist = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
            if (dist < closestDist) {
                closestDist = dist;
                closest = enemy;
            }
        }
        
        if (closest) {
            const damage = skill.damage * calculateElementalDamage(skill.element, closest.element);
            closest.hp -= damage;
            totalDamage = damage;
            showFloatingMessage(`✨ ${skill.name}! ${damage} 데미지! ✨`, "#ffff88");
        }
    }
    
    // 적 제거 처리
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].hp <= 0) {
            const expGain = enemies[i].exp;
            game.addExp(expGain);
            game.player.killCount++;
            game.addScore(50);
            enemies.splice(i, 1);
        }
    }
    
    return true;
}

// ========== 상호작용 오브젝트 효과 ==========
function interactWithObject(obj) {
    if (obj.type === 'trap' && !obj.triggered) {
        obj.triggered = true;
        const trapEffect = InteractiveObjects.TRAP.effects[obj.trapType];
        
        switch(obj.trapType) {
            case 'spike':
                game.damagePlayer(trapEffect.damage);
                showFloatingMessage(trapEffect.message, "#ff6666");
                break;
            case 'poison':
                game.damagePlayer(trapEffect.damage);
                activeEffects.push({ type: 'poison', duration: trapEffect.duration, damage: 5 });
                showFloatingMessage(trapEffect.message, "#88ff44");
                break;
            case 'slow':
                activeEffects.push({ type: 'slow', duration: trapEffect.duration });
                showFloatingMessage(trapEffect.message, "#88aaff");
                break;
            case 'teleport':
                game.player.x = Math.random() * game.worldWidth;
                game.player.y = Math.random() * game.worldHeight;
                showFloatingMessage(trapEffect.message, "#aa88ff");
                break;
        }
        return true;
    }
    
    if (obj.type === 'shrine' && !obj.used) {
        obj.used = true;
        const shrineEffect = InteractiveObjects.SHRINE.effects[obj.shrineType];
        
        switch(obj.shrineType) {
            case 'heal':
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + shrineEffect.heal);
                showFloatingMessage(shrineEffect.message, "#88ff88");
                break;
            case 'bless':
                game.player.attackDamage += 5;
                showFloatingMessage(shrineEffect.message, "#ffff88");
                break;
            case 'curse':
                game.player.attackDamage = Math.max(5, game.player.attackDamage - 5);
                showFloatingMessage(shrineEffect.message, "#ff8888");
                break;
            case 'random':
                const random = Math.random();
                if (random < 0.3) {
                    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 30);
                    showFloatingMessage("🎲 축복: 체력 +30!", "#88ff88");
                } else if (random < 0.6) {
                    game.player.attackDamage += 3;
                    showFloatingMessage("🎲 축복: 공격력 +3!", "#ffff88");
                } else {
                    game.damagePlayer(20);
                    showFloatingMessage("🎲 저주: -20 HP!", "#ff6666");
                }
                break;
        }
        return true;
    }
    
    if (obj.type === 'chest' && !obj.opened) {
        obj.opened = true;
        const reward = InteractiveObjects.CHEST.rewards[Math.floor(Math.random() * InteractiveObjects.CHEST.rewards.length)];
        
        switch(reward) {
            case 'gold':
                game.addScore(150);
                showFloatingMessage("💰 보물 상자에서 150점을 얻었다! 💰", "#ffcc44");
                break;
            case 'potion':
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + 60);
                showFloatingMessage("🧪 회복 포션! +60 HP 🧪", "#ff8888");
                break;
            case 'skill':
                const randomSkill = Object.values(SpecialAttacks)[Math.floor(Math.random() * Object.values(SpecialAttacks).length)];
                SkillTree.activeSkills.push(randomSkill);
                showFloatingMessage(`📖 새로운 스킬 습득: ${randomSkill.name}! 📖`, "#aa88ff");
                break;
            case 'pet_food':
                if (currentPet) {
                    currentPet.exp += 50;
                    if (currentPet.exp >= 100) {
                        currentPet.level++;
                        currentPet.exp -= 100;
                        showFloatingMessage(`🐾 펫 레벨업! (Lv.${currentPet.level}) 🐾`, "#ffaa88");
                    }
                }
                break;
        }
        return true;
    }
    
    if (obj.type === 'secret') {
        showFloatingMessage("🌟 숨겨진 방을 발견했다! 보상을 획득! 🌟", "#ffaa44");
        game.addScore(300);
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 100);
        return true;
    }
    
    return false;
}

// ========== 펫 획득 ==========
function obtainPet(petType) {
    if (!currentPet) {
        currentPet = new Pet(petType);
        showFloatingMessage(`🐾 ${petType}이(가) 동료가 되었다! 🐾`, "#ffaa88");
    }
}

// ========== 도전 과제 ==========
const Achievements = {
    'first_kill': { name: '첫 처치', condition: (p) => p.killCount >= 1, reward: 100 },
    'level_10': { name: '레벨 10 달성', condition: (p) => p.level >= 10, reward: 500 },
    'floor_20': { name: '20층 돌파', condition: () => currentFloor >= 20, reward: 1000 },
    'pet_master': { name: '펫 마스터', condition: () => currentPet && currentPet.level >= 5, reward: 300 },
    'elementalist': { name: '원소술사', condition: () => SkillTree.activeSkills.length >= 3, reward: 200 }
};

function checkAchievements() {
    for (let [id, ach] of Object.entries(Achievements)) {
        if (!achievements.includes(id)) {
            let condition = false;
            if (id === 'floor_20') condition = ach.condition();
            else condition = ach.condition(game.player);
            
            if (condition) {
                achievements.push(id);
                game.addScore(ach.reward);
                showFloatingMessage(`🏆 업적 달성: ${ach.name}! +${ach.reward}점 🏆`, "#ffcc44");
            }
        }
    }
}

// ========== 레벨업 스킬 선택 (확장) ==========
function showLevelUpMenu() {
    isLevelUpMenuOpen = true;
    game.gameRunning = false;
    
    const expandedSkills = [
        { id: 'dmg_up', name: '🗡️ 공격력 증가', desc: '공격력 +5', effect: (p) => p.attackDamage += 5 },
        { id: 'def_up', name: '🛡️ 방어력 증가', desc: '방어력 +3', effect: (p) => p.defense += 3 },
        { id: 'hp_up', name: '❤️ 체력 증가', desc: '최대 체력 +20, 회복', effect: (p) => { p.maxHp += 20; p.hp += 20; } },
        { id: 'mana_up', name: '💙 마나 증가', desc: '최대 마나 +20', effect: () => { maxMana += 20; mana += 20; } },
        { id: 'crit_up', name: '⚡ 치명타 확률', desc: '치명타 확률 +10%', effect: () => SkillTree.passiveBonuses.criticalChance += 0.1 },
        { id: 'lifesteal', name: '💉 생명력 흡수', desc: '공격 시 10% 체력 흡수', effect: () => SkillTree.passiveBonuses.lifeSteal += 0.1 },
        { id: 'skill_slot', name: '✨ 특수 스킬 습득', desc: '새로운 특수 공격 획득', effect: () => {
            const newSkill = Object.values(SpecialAttacks)[Math.floor(Math.random() * Object.values(SpecialAttacks).length)];
            if (!SkillTree.activeSkills.find(s => s.name === newSkill.name)) {
                SkillTree.activeSkills.push(newSkill);
                showFloatingMessage(`✨ ${newSkill.name} 습득! ✨`, "#aa88ff");
            }
        }}
    ];
    
    availableSkills = [];
    const shuffled = [...expandedSkills];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    availableSkills = shuffled.slice(0, 3);
    
    let menuHtml = `
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); 
                    background:#0a0a2a; border:3px solid #ff88cc; border-radius:20px; 
                    padding:30px; z-index:200; text-align:center; min-width:350px;">
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
    game.addScore(100 + (currentFloor - 1) * 20);
    generateFloor(currentFloor);
    showFloatingMessage(`🎉 ${currentFloor-1}층 클리어! +${100 + (currentFloor-1)*20}점 🎉`, "#ffff88");
    checkAchievements();
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
        `최종 층: ${finalFloor} | 처치: ${finalKills} | 점수: ${finalScore} | 업적: ${achievements.length}`;
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
    mana = 100;
    maxMana = 100;
    specialAttackCooldown = 0;
    activeEffects = [];
    SkillTree.activeSkills = [];
    SkillTree.passiveBonuses = { criticalChance: 0, criticalDamage: 0, lifeSteal: 0, expBonus: 0, goldBonus: 0 };
    achievements = [];
    currentPet = null;
    
    document.getElementById('gameOverPanel').style.display = 'none';
    generateFloor(1);
    game.gameRunning = true;
}

// ========== 특수 스킬 UI ==========
function drawSkillUI(ctx, engine) {
    const startX = engine.width - 180;
    const startY = engine.height - 120;
    
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(startX - 10, startY - 10, 180, 130);
    ctx.strokeStyle = "#ff88cc";
    ctx.strokeRect(startX - 10, startY - 10, 180, 130);
    
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#ffcc88";
    ctx.fillText("✨ 특수 스킬 ✨", startX, startY - 5);
    
    let yOffset = 0;
    for (let i = 0; i < Math.min(3, SkillTree.activeSkills.length); i++) {
        const skill = SkillTree.activeSkills[i];
        ctx.fillStyle = specialAttackCooldown > 0 ? "#888888" : "#88ff88";
        ctx.font = "10px monospace";
        ctx.fillText(`${skill.icon || '✨'} ${skill.name} (${skill.manaCost}💙)`, startX, startY + yOffset + 15);
        yOffset += 18;
    }
    
    if (SkillTree.activeSkills.length === 0) {
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "10px monospace";
        ctx.fillText("레벨업 시 스킬 습득!", startX, startY + 15);
    }
    
    // 마나바
    const manaPercent = mana / maxMana;
    ctx.fillStyle = "#330066";
    ctx.fillRect(startX, startY + 70, 150, 8);
    ctx.fillStyle = "#6688ff";
    ctx.fillRect(startX, startY + 70, 150 * manaPercent, 8);
    ctx.fillStyle = "#aaaaff";
    ctx.font = "9px monospace";
    ctx.fillText(`💙 ${Math.floor(mana)}/${maxMana}`, startX, startY + 68);
}

// ========== 엔진 콜백 등록 ==========

// 업데이트 콜백
game.on('onUpdate', (engine) => {
    if (isLevelUpMenuOpen) return;
    
    const enemies = engine.entities.enemies;
    const player = engine.player;
    
    // 특수 스킬 쿨다운
    if (specialAttackCooldown > 0) specialAttackCooldown--;
    
    // 지속 효과 업데이트
    for (let i = 0; i < activeEffects.length; i++) {
        const effect = activeEffects[i];
        effect.duration -= 0.016;
        if (effect.type === 'poison' && effect.duration > 0) {
            if (Math.random() < 0.1) {
                game.damagePlayer(effect.damage);
            }
        }
        if (effect.duration <= 0) {
            activeEffects.splice(i, 1);
            i--;
        }
    }
    
    // 적 AI (속성 고려)
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
        
        const playerRect = { x: player.x - player.size/2, y: player.y - player.size/2, w: player.size, h: player.size };
        const enemyRect = { x: e.x - e.size/2, y: e.y - e.size/2, w: e.size, h: e.size };
        
        if (engine.rectCollide(playerRect, enemyRect)) {
            engine.damagePlayer(e.damage);
            player.vx = (player.x - e.x) * 1.5;
            player.vy = (player.y - e.y) * 1.5;
            
            if (player.hp <= 0) {
                gameOver();
            }
        }
    }
    
    // 일반 공격 (속성 적용)
    engine.updateAttack(
        enemies,
        (p, e) => Math.hypot(p.x - e.x, p.y - e.y),
        (enemy, index) => {
            let damage = player.attackDamage;
            const elementalBonus = calculateElementalDamage('NEUTRAL', enemy.element);
            damage *= elementalBonus;
            
            // 치명타
            if (Math.random() < SkillTree.passiveBonuses.criticalChance) {
                damage *= (1.5 + SkillTree.passiveBonuses.criticalDamage);
                showFloatingMessage(`💥 CRITICAL! ${Math.floor(damage)} 💥`, "#ffaa44");
            }
            
            enemy.hp -= damage;
            
            // 생명력 흡수
            if (SkillTree.passiveBonuses.lifeSteal > 0) {
                const healAmount = damage * SkillTree.passiveBonuses.lifeSteal;
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
            }
            
            if (enemy.hp <= 0) {
                game.entities.enemies.splice(index, 1);
                player.killCount++;
                const expGain = Math.floor(enemy.exp * (1 + SkillTree.passiveBonuses.expBonus));
                engine.addExp(expGain);
                engine.addScore(50);
                showFloatingMessage(`+${expGain} EXP`, "#88ff88");
                checkAchievements();
            } else {
                showFloatingMessage(`${Elements[enemy.element]?.icon || ''} ${Math.floor(damage)}`, "#ffaa66");
            }
        }
    );
    
    // 펫 공격
    if (currentPet) {
        currentPet.x = player.x - 35;
        currentPet.y = player.y - 15;
        
        if (Math.random() < 0.05 && enemies.length > 0) {
            const target = enemies[0];
            const damage = currentPet.attackEnemy(target);
            showFloatingMessage(`🐾 펫 공격! ${Math.floor(damage)} 데미지`, "#88ffaa");
            
            if (target.hp <= 0) {
                const idx = enemies.indexOf(target);
                if (idx !== -1) {
                    enemies.splice(idx, 1);
                    player.killCount++;
                    engine.addExp(target.exp);
                }
            }
        }
    }
    
    // 상호작용 오브젝트
    for (let obj of engine.entities.interactive || []) {
        const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
        if (dist < player.size/2 + obj.size/2) {
            if (interactWithObject(obj)) {
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
                showFloatingMessage(`✨ 코드 획득! +${p.value} ✨`, "#88ff88");
            } else if (p.type === 'heal') {
                player.hp = Math.min(player.maxHp, player.hp + p.value);
                showFloatingMessage(`❤️ +${p.value} 체력 회복 ❤️`, "#ff8888");
            } else if (p.type === 'mana') {
                mana = Math.min(maxMana, mana + p.value);
                showFloatingMessage(`💙 +${p.value} 마나 회복 💙`, "#8888ff");
            } else if (p.type === 'elemental') {
                const bonus = 10;
                player.attackDamage += bonus;
                showFloatingMessage(`${p.symbol} 원소의 힘! 공격력 +${bonus}`, "#ffaa88");
            } else if (p.type === 'pet_food' && currentPet) {
                currentPet.exp += p.value;
                if (currentPet.exp >= 100) {
                    currentPet.level++;
                    currentPet.exp -= 100;
                    showFloatingMessage(`🐾 펫 레벨업! (Lv.${currentPet.level}) 🐾`, "#ffaa88");
                } else {
                    showFloatingMessage(`🍖 펫 경험치 +${p.value}!`, "#88ffaa");
                }
            }
            engine.entities.powerups.splice(i, 1);
            i--;
        }
    }
    
    // 층 클리어 체크
    if (enemies.length === 0 && game.gameRunning) {
        goToNextFloor();
    }
    
    // 자연 경험치
    engine.addExp(0.03);
    
    // 마나 자연 회복
    mana = Math.min(maxMana, mana + 0.2);
    
    // 메시지 타이머
    if (floatingMessage.timer > 0) {
        floatingMessage.timer -= 0.016;
    }
});

// 렌더링 콜백
game.on('onRender', (engine) => {
    const ctx = engine.ctx;
    
    // 상호작용 오브젝트 렌더링
    for (let obj of engine.entities.interactive || []) {
        const screen = engine.worldToScreen(obj.x - obj.size/2, obj.y - obj.size/2);
        if (screen.x + obj.size > 0 && screen.x < engine.width && 
            screen.y + obj.size > 0 && screen.y < engine.height) {
            
            ctx.fillStyle = obj.color;
            ctx.fillRect(screen.x, screen.y, obj.size, obj.size);
            
            if (obj.type === 'trap') {
                ctx.fillStyle = "#aa3333";
                ctx.font = "bold 16px monospace";
                ctx.fillText("⚠️", screen.x + 5, screen.y + 18);
            } else if (obj.type === 'shrine') {
                ctx.fillStyle = "#ffffaa";
                ctx.font = "bold 14px monospace";
                ctx.fillText("🪨", screen.x + 5, screen.y + 18);
            } else if (obj.type === 'chest') {
                ctx.fillStyle = "#ffcc44";
                ctx.font = "bold 14px monospace";
                ctx.fillText(obj.opened ? "📦" : "🎁", screen.x + 5, screen.y + 18);
            } else if (obj.type === 'secret') {
                ctx.fillStyle = "#ffaa44";
                ctx.font = "bold 14px monospace";
                ctx.fillText("🌟", screen.x + 5, screen.y + 18);
            }
        }
    }
    
    // 적 렌더링 (속성 아이콘 표시)
    for (let e of engine.entities.enemies) {
        const screen = engine.worldToScreen(e.x - e.size/2, e.y - e.size/2);
        if (screen.x + e.size > 0 && screen.x < engine.width && 
            screen.y + e.size > 0 && screen.y < engine.height) {
            
            const bob = Math.sin(engine.frame * 0.05 + (e.bobOffset || 0)) * 2;
            ctx.shadowBlur = 8;
            
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.ellipse(screen.x + e.size/2, screen.y + e.size/3 + bob, e.size/2, e.size/2.3, 0, 0, Math.PI*2);
            ctx.fill();
            
            // 속성 아이콘
            ctx.font = "bold 14px monospace";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(Elements[e.element]?.icon || '⚪', screen.x + e.size/2 - 8, screen.y + e.size/3 + 4 + bob);
            
            if (e.type === 'boss') {
                const hpPercent = e.hp / e.maxHp;
                ctx.fillStyle = "#aa3333";
                ctx.fillRect(screen.x, screen.y - 15, e.size, 6);
                ctx.fillStyle = "#33ff33";
                ctx.fillRect(screen.x, screen.y - 15, e.size * hpPercent, 6);
                ctx.font = "bold 10px monospace";
                ctx.fillStyle = "#ffffaa";
                ctx.fillText(e.name, screen.x + 5, screen.y - 8);
            }
        }
    }
    
    // 파워업 렌더링
    for (let p of engine.entities.powerups) {
        const screen = engine.worldToScreen(p.x, p.y);
        if (screen.x + p.size > 0 && screen.x < engine.width && 
            screen.y + p.size > 0 && screen.y < engine.height) {
            
            ctx.fillStyle = "#44ffaa";
            ctx.fillRect(screen.x, screen.y, p.size, p.size);
            ctx.font = `bold ${Math.floor(p.size * 0.8)}px monospace`;
            
            if (p.type === 'code') {
                ctx.fillStyle = "#004d33";
                ctx.fillText(p.codeText, screen.x+2, screen.y+12);
            } else {
                ctx.fillStyle = "#ffffff";
                ctx.fillText(p.symbol, screen.x+3, screen.y+13);
            }
        }
    }
    
    // 펫 렌더링
    if (currentPet) {
        const screen = engine.worldToScreen(currentPet.x, currentPet.y);
        ctx.font = "24px monospace";
        ctx.fillStyle = "#ffaa88";
        ctx.fillText(currentPet.type[0], screen.x, screen.y);
        ctx.font = "8px monospace";
        ctx.fillStyle = "#ffffaa";
        ctx.fillText(`Lv.${currentPet.level}`, screen.x - 5, screen.y - 5);
    }
    
    // 특수 스킬 UI
    drawSkillUI(ctx, engine);
    
    // 지속 효과 표시
    if (activeEffects.length > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(engine.width - 100, 10, 90, 20 + activeEffects.length * 15);
        for (let i = 0; i < activeEffects.length; i++) {
            const effect = activeEffects[i];
            ctx.fillStyle = effect.type === 'poison' ? "#88ff44" : (effect.type === 'slow' ? "#88aaff" : "#ffffff");
            ctx.font = "10px monospace";
            ctx.fillText(`${effect.type}: ${effect.duration.toFixed(1)}s`, engine.width - 90, 25 + i * 15);
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
        ctx.font = "bold 22px monospace";
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

// 특수 스킬 키 (숫자 키)
window.addEventListener('keydown', (e) => {
    if (isLevelUpMenuOpen) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= 3 && SkillTree.activeSkills.length >= num) {
        const skill = SkillTree.activeSkills[num - 1];
        const skillKey = Object.keys(SpecialAttacks).find(key => SpecialAttacks[key].name === skill.name);
        if (skillKey) {
            useSpecialAttack(skillKey);
        }
    }
});

// 게임 시작
generateFloor(1);
game.start();

// 리셋 버튼
document.getElementById('resetBtn').addEventListener('click', () => restartGame());
document.getElementById('gameOverRestart').addEventListener('click', () => restartGame());