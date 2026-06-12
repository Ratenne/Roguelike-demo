// ============================================
// 시각 효과 & 펫 시스템
// ============================================

// ========== 시각 효과 목록 ==========
let visualEffects = [];

// ========== VisualEffect 클래스 ==========
class VisualEffect {
    constructor(type, x, y, targetX, targetY, direction) {
        this.type = type; // 'fireball', 'ice', 'lightning', 'poison', 'impact', 'arrow'
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.direction = direction; // { x, y } 단위 벡터
        this.life = 0.6; // 0.6초 지속
        this.size = 20;
        this.frame = 0;
    }
    
    update(deltaTime) {
        this.life -= deltaTime;
        this.frame++;
        return this.life > 0;
    }
    
    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        const alpha = Math.min(1, this.life * 2);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        
        switch(this.type) {
            case 'fireball':
                const gradient = ctx.createRadialGradient(screenX, screenY, 5, screenX, screenY, 15);
                gradient.addColorStop(0, '#ffaa44');
                gradient.addColorStop(0.5, '#ff6644');
                gradient.addColorStop(1, '#ff2200');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(screenX, screenY, 12 * (1 - this.life * 0.5), 0, Math.PI * 2);
                ctx.fill();
                
                for (let i = 0; i < 5; i++) {
                    const angle = this.frame * 0.5 + i * Math.PI * 2 / 5;
                    const rad = 8 * (1 - this.life);
                    const px = screenX + Math.cos(angle) * rad;
                    const py = screenY + Math.sin(angle) * rad;
                    ctx.fillStyle = '#ffaa33';
                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'ice':
                ctx.fillStyle = '#88ccff';
                for (let i = 0; i < 6; i++) {
                    const angle = this.frame * 0.3 + i * Math.PI * 2 / 6;
                    const rad = 10 * (1 - this.life);
                    const px = screenX + Math.cos(angle) * rad;
                    const py = screenY + Math.sin(angle) * rad;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px - 4, py - 6);
                    ctx.lineTo(px + 4, py - 4);
                    ctx.fill();
                }
                ctx.fillStyle = '#aaddff';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 10 * (1 - this.life * 0.3), 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'lightning':
                ctx.strokeStyle = '#ffee44';
                ctx.lineWidth = 4;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    let x = screenX;
                    let y = screenY;
                    ctx.moveTo(x, y);
                    for (let j = 0; j < 5; j++) {
                        x += (Math.random() - 0.5) * 12;
                        y += (Math.random() - 0.5) * 8 - 4;
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                ctx.fillStyle = '#ffff88';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'poison':
                ctx.fillStyle = `rgba(100, 255, 100, ${0.3 * (1 - this.life)})`;
                ctx.beginPath();
                ctx.arc(screenX, screenY, 20 * (1 - this.life * 0.5), 0, Math.PI * 2);
                ctx.fill();
                for (let i = 0; i < 8; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const rad = 10 * Math.random() * (1 - this.life);
                    const px = screenX + Math.cos(angle) * rad;
                    const py = screenY + Math.sin(angle) * rad;
                    ctx.fillStyle = '#88ff88';
                    ctx.beginPath();
                    ctx.arc(px, py, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'impact':
                const radGrad = ctx.createRadialGradient(screenX, screenY, 2, screenX, screenY, 15);
                radGrad.addColorStop(0, '#ffffff');
                radGrad.addColorStop(0.5, '#ffaa44');
                radGrad.addColorStop(1, '#ff4400');
                ctx.fillStyle = radGrad;
                ctx.beginPath();
                ctx.arc(screenX, screenY, 12 * (1 - this.life), 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#ffaa66';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenX, screenY, 8 * (1 - this.life) + 4, 0, Math.PI * 2);
                ctx.stroke();
                break;
                
            case 'arrow':
                const angle = Math.atan2(this.direction.y, this.direction.x);
                const arrowLen = 30 * (1 - this.life * 0.5);
                const endX = screenX + Math.cos(angle) * arrowLen;
                const endY = screenY + Math.sin(angle) * arrowLen;
                
                ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                
                const arrowAngle = Math.PI / 6;
                const headLen = 10;
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - headLen * Math.cos(angle - arrowAngle), endY - headLen * Math.sin(angle - arrowAngle));
                ctx.lineTo(endX - headLen * Math.cos(angle + arrowAngle), endY - headLen * Math.sin(angle + arrowAngle));
                ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }
}

// ========== 이펙트 업데이트 ==========
function updateEffects(deltaTime) {
    for (let i = 0; i < visualEffects.length; i++) {
        if (!visualEffects[i].update(deltaTime)) {
            visualEffects.splice(i, 1);
            i--;
        }
    }
}

// ========== 이펙트 렌더링 ==========
function renderEffects(ctx, camera) {
    for (let effect of visualEffects) {
        effect.draw(ctx, camera);
    }
}

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
        this.icon = type; // 이모지 그대로 사용
        
        const petData = {
            '🐉 용': { attack: 22, attackSpeed: 40, color: '#ff8866' },
            '🦊 여우': { attack: 15, attackSpeed: 30, color: '#ffaa66' },
            '🐱 고양이': { attack: 12, attackSpeed: 25, color: '#ffcc88' },
            '🦉 올빼미': { attack: 18, attackSpeed: 35, color: '#aa88ff' }
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

// ========== 펫 획득 ==========
function obtainPet() {
    const petTypes = ['🐉 용', '🦊 여우', '🐱 고양이', '🦉 올빼미'];
    const randomPet = petTypes[Math.floor(Math.random() * petTypes.length)];
    currentPet = new Pet(randomPet);
    showFloatingMessage(`🐾 ${randomPet}이(가) 동료가 되었다!`, "#ffaa88");
}

let currentPet = null;