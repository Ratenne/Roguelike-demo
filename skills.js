// ============================================
// 스킬 & 속성 시스템
// ============================================

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
        damage: 45,
        cooldown: 55,
        manaCost: 20,
        range: 300,
        effectType: 'fireball',
        impactEffect: 'impact'
    },
    ICE_SHARD: {
        id: 'ICE_SHARD',
        name: '얼음 파편',
        icon: '❄️',
        element: 'ICE',
        damage: 40,
        cooldown: 50,
        manaCost: 18,
        range: 280,
        effectType: 'ice',
        impactEffect: 'impact'
    },
    CHAIN_LIGHTNING: {
        id: 'CHAIN_LIGHTNING',
        name: '연쇄 번개',
        icon: '⚡',
        element: 'THUNDER',
        damage: 35,
        cooldown: 65,
        manaCost: 25,
        range: 250,
        effectType: 'lightning',
        impactEffect: 'lightning'
    },
    POISON_CLOUD: {
        id: 'POISON_CLOUD',
        name: '독 구름',
        icon: '☠️',
        element: 'POISON',
        damage: 25,
        cooldown: 60,
        manaCost: 22,
        range: 180,
        effectType: 'poison',
        impactEffect: 'poison'
    }
};

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

// ========== 레벨업 스킬 옵션 ==========
const levelUpSkillOptions = [
    { id: 'dmg_up', name: '🗡️ 공격력 증가', desc: '공격력 +5', effect: (game) => { game.player.attackDamage += 5; passiveBonuses.attackBonus += 5; } },
    { id: 'def_up', name: '🛡️ 방어력 증가', desc: '방어력 +3', effect: (game) => { game.player.defense += 3; passiveBonuses.defenseBonus += 3; } },
    { id: 'hp_up', name: '❤️ 체력 증가', desc: '최대 체력 +20, 회복', effect: (game) => { game.player.maxHp += 20; game.player.hp += 20; } },
    { id: 'mana_up', name: '💙 마나 증가', desc: '최대 마나 +20', effect: (game) => { maxMana += 20; mana += 20; } },
    { id: 'crit_up', name: '⚡ 치명타', desc: '치명타 확률 +12%', effect: (game) => { passiveBonuses.criticalChance += 0.12; } },
    { id: 'lifesteal', name: '💉 생명력 흡수', desc: '공격 시 8% 흡수', effect: (game) => { passiveBonuses.lifeSteal += 0.08; } },
    { id: 'pet_summon', name: '🐾 펫 소환', desc: '동료 획득!', effect: (game) => { if (!currentPet) obtainPet(); } },
    { id: 'skill_fire', name: '🔥 화염구', desc: '강력한 화염구 사용 가능', effect: (game) => { if (!activeSkills.find(s => s.id === 'FIREBALL')) activeSkills.push(SpecialAttacks.FIREBALL); } },
    { id: 'skill_ice', name: '❄️ 얼음 파편', desc: '적을 관통하는 얼음', effect: (game) => { if (!activeSkills.find(s => s.id === 'ICE_SHARD')) activeSkills.push(SpecialAttacks.ICE_SHARD); } },
    { id: 'skill_lightning', name: '⚡ 연쇄 번개', desc: '여러 적을 공격', effect: (game) => { if (!activeSkills.find(s => s.id === 'CHAIN_LIGHTNING')) activeSkills.push(SpecialAttacks.CHAIN_LIGHTNING); } }
];

// ========== 패시브 보너스 ==========
let passiveBonuses = {
    criticalChance: 0,
    criticalDamage: 0.5,
    lifeSteal: 0,
    expBonus: 0,
    moveSpeedBonus: 0,
    attackBonus: 0,
    defenseBonus: 0
};

// ========== 활성 스킬 목록 ==========
let activeSkills = [];

// ========== 방향 관련 전역 변수 ==========
let skillDirection = { x: 1, y: 0 };
let mouseX = 0, mouseY = 0;

// ========== 스킬 방향 가져오기 ==========
function getSkillDirection(game) {
    if (mouseX > 0 && mouseX < game.width && mouseY > 0 && mouseY < game.height) {
        const worldMouseX = mouseX + game.camera.x;
        const worldMouseY = mouseY + game.camera.y;
        const dx = worldMouseX - game.player.x;
        const dy = worldMouseY - game.player.y;
        const len = Math.hypot(dx, dy);
        if (len > 0.01) {
            return { x: dx / len, y: dy / len };
        }
    }
    
    if (Math.abs(game.player.vx) > 0.1 || Math.abs(game.player.vy) > 0.1) {
        const len = Math.hypot(game.player.vx, game.player.vy);
        return { x: game.player.vx / len, y: game.player.vy / len };
    }
    
    return { x: 1, y: 0 };
}

// ========== 특수 공격 사용 ==========
function useSpecialAttack(skillId, game, mana, maxMana, specialAttackCooldown, activeEffects, visualEffects) {
    if (specialAttackCooldown > 0) {
        showFloatingMessage(`⏳ 재사용 대기중!`, "#ff8888");
        return { mana, specialAttackCooldown, success: false };
    }
    
    const skill = SpecialAttacks[skillId];
    if (!skill) return { mana, specialAttackCooldown, success: false };
    
    if (mana < skill.manaCost) {
        showFloatingMessage(`💙 마나 부족! (${skill.manaCost} 필요)`, "#ff8888");
        return { mana, specialAttackCooldown, success: false };
    }
    
    mana -= skill.manaCost;
    specialAttackCooldown = skill.cooldown;
    
    const direction = getSkillDirection(game);
    const startX = game.player.x;
    const startY = game.player.y;
    
    visualEffects.push(new VisualEffect('arrow', startX, startY, startX + direction.x * 50, startY + direction.y * 50, direction));
    
    const enemies = game.entities.enemies;
    let totalDamage = 0;
    let hitCount = 0;
    
    visualEffects.push(new VisualEffect(skill.effectType, startX, startY, startX + direction.x * 40, startY + direction.y * 40, direction));
    
    if (skillId === 'CHAIN_LIGHTNING') {
        const targets = [];
        for (let enemy of enemies) {
            const toEnemy = { x: enemy.x - startX, y: enemy.y - startY };
            const len = Math.hypot(toEnemy.x, toEnemy.y);
            if (len < skill.range) {
                const dot = (toEnemy.x * direction.x + toEnemy.y * direction.y) / len;
                if (dot > 0.3) {
                    targets.push({ enemy: enemy, dist: len, angle: dot });
                }
            }
        }
        targets.sort((a, b) => a.dist - b.dist);
        const hitTargets = targets.slice(0, 3);
        
        for (let t of hitTargets) {
            const enemy = t.enemy;
            const damage = skill.damage * calculateElementalDamage(skill.element, enemy.element);
            enemy.hp -= damage;
            totalDamage += damage;
            hitCount++;
            visualEffects.push(new VisualEffect(skill.impactEffect, enemy.x, enemy.y, enemy.x, enemy.y, direction));
            showFloatingMessage(`⚡ ${Math.floor(damage)}!`, "#ffee44");
        }
    } else if (skillId === 'POISON_CLOUD') {
        for (let enemy of enemies) {
            const toEnemy = { x: enemy.x - startX, y: enemy.y - startY };
            const dist = Math.hypot(toEnemy.x, toEnemy.y);
            if (dist < skill.range) {
                const dot = (toEnemy.x * direction.x + toEnemy.y * direction.y) / dist;
                if (dot > 0.2) {
                    const damage = skill.damage * calculateElementalDamage(skill.element, enemy.element);
                    enemy.hp -= damage;
                    totalDamage += damage;
                    hitCount++;
                    visualEffects.push(new VisualEffect(skill.impactEffect, enemy.x, enemy.y, enemy.x, enemy.y, direction));
                }
            }
        }
        showFloatingMessage(`☠️ 독 구름! ${Math.floor(totalDamage)} 데미지`, "#88ff44");
    } else {
        let closest = null;
        let closestDist = Infinity;
        
        for (let enemy of enemies) {
            const toEnemy = { x: enemy.x - startX, y: enemy.y - startY };
            const dist = Math.hypot(toEnemy.x, toEnemy.y);
            if (dist < skill.range) {
                const dot = (toEnemy.x * direction.x + toEnemy.y * direction.y) / dist;
                if (dot > 0.5 && dist < closestDist) {
                    closestDist = dist;
                    closest = enemy;
                }
            }
        }
        
        if (closest) {
            const damage = skill.damage * calculateElementalDamage(skill.element, closest.element);
            closest.hp -= damage;
            totalDamage = damage;
            hitCount = 1;
            visualEffects.push(new VisualEffect(skill.impactEffect, closest.x, closest.y, closest.x, closest.y, direction));
            showFloatingMessage(`${skill.icon} ${Math.floor(damage)} 데미지!`, "#ffff88");
        } else {
            showFloatingMessage(`❗ 범위 내에 적이 없습니다`, "#ff8888");
            mana += skill.manaCost;
            specialAttackCooldown = 0;
            return { mana, specialAttackCooldown, success: false };
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
    
    return { mana, specialAttackCooldown, success: true };
}