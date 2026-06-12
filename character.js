// ============================================
// 벡터 그래픽 캐릭터 & 애니메이션 시스템
// ============================================

// ========== 이징 함수 ==========
const Easing = {
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOut: t => t * (2 - t),
    easeIn: t => t * t,
    bounce: t => {
        if (t < 1/2.75) return 7.5625 * t * t;
        if (t < 2/2.75) return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
        if (t < 2.5/2.75) return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
        return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
    },
    elastic: t => t === 0 || t === 1 ? t : 
        Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1
};

// ========== 벡터 유틸리티 ==========
class VectorDraw {
    constructor(ctx) {
        this.ctx = ctx;
    }
    
    // 그라데이션 생성
    linearGradient(x1, y1, x2, y2, stops) {
        const grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
        for (let stop of stops) {
            grad.addColorStop(stop.pos, stop.color);
        }
        return grad;
    }
    
    radialGradient(x, y, r1, r2, stops) {
        const grad = this.ctx.createRadialGradient(x, y, r1, x, y, r2);
        for (let stop of stops) {
            grad.addColorStop(stop.pos, stop.color);
        }
        return grad;
    }
    
    // 둥근 사각형
    roundRect(x, y, w, h, r) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.closePath();
    }
    
    // 광택 효과
    gloss(x, y, w, h, alpha = 0.3) {
        const grad = this.linearGradient(x, y, x, y + h, [
            { pos: 0, color: `rgba(255,255,255,${alpha})` },
            { pos: 0.5, color: `rgba(255,255,255,0)` },
            { pos: 1, color: `rgba(0,0,0,${alpha * 0.5})` }
        ]);
        return grad;
    }
    
    // 그림자
    shadow(color = 'rgba(0,0,0,0.4)', blur = 8, offsetX = 2, offsetY = 2) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = blur;
        this.ctx.shadowOffsetX = offsetX;
        this.ctx.shadowOffsetY = offsetY;
    }
    
    clearShadow() {
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }
}

// ========== 플레이어 캐릭터 (벡터 스타일) ==========
class PlayerCharacter {
    constructor() {
        this.state = 'idle';
        this.direction = 'right';
        this.frame = 0;
        this.frameTimer = 0;
        this.animProgress = 0;
        this.renderSize = 56;
        
        // 부드러운 애니메이션
        this.breathAnim = 0;
        this.idleSway = 0;
        this.walkBob = 0;
        this.attackArc = 0;
        
        // 파티클
        this.particles = [];
        
        // 색상
        this.colors = {
            skin: '#f5d0b0',
            skinShadow: '#d4a574',
            hair: '#3d2b1f',
            hairHighlight: '#5c3d2e',
            armor: '#3a6fb5',
            armorLight: '#5b8fd4',
            armorDark: '#1e4d8c',
            armorTrim: '#ffd700',
            cape: '#c0392b',
            capeLight: '#e74c3c',
            boots: '#4a3728',
            bootsDark: '#2c1f14',
            pants: '#5c4a3a',
            beltBrown: '#6b4c30',
            beltGold: '#ffd700',
            eye: '#2c3e50',
            eyeHighlight: '#ffffff',
            swordBlade: '#e8e8e8',
            swordEdge: '#ffffff',
            swordGuard: '#ffd700',
            swordHandle: '#5c3a1e',
            shield: '#5b8fd4',
            shieldTrim: '#ffd700',
            shieldEmblem: '#ffffff',
        };
    }
    
    render(ctx, player, engine, gameRunning) {
        const screen = engine.worldToScreen(player.x - this.renderSize/2, player.y - this.renderSize/2);
        
        if (screen.x + this.renderSize < -20 || screen.x > engine.width + 20 ||
            screen.y + this.renderSize < -20 || screen.y > engine.height + 20) return;
        
        this._updateState(player, engine, gameRunning);
        this._updateAnimation();
        
        const vd = new VectorDraw(ctx);
        const cx = screen.x + this.renderSize/2;
        const cy = screen.y + this.renderSize/2;
        const s = this.renderSize / 48;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        
        // 좌우 반전
        if (this.direction === 'left') ctx.scale(-1, 1);
        
        // 사망 처리
        if (this.state === 'die') {
            const deathProgress = this.deathTimer / this.deathDuration;
            ctx.globalAlpha = 1 - deathProgress * 0.8;
            ctx.translate(0, deathProgress * 30);
        }
        
        // 깜빡임
        if (!this.visible) ctx.globalAlpha = 0.4;
        
        // 그림자
        vd.shadow('rgba(0,0,0,0.35)', 10, 2, 3);
        
        this._drawCharacter(vd);
        
        vd.clearShadow();
        ctx.restore();
        
        // 파티클
        this._updateParticles(ctx, screen, s);
    }
    
    _updateState(player, engine, gameRunning) {
        if (!gameRunning && player.hp <= 0) {
            if (this.state !== 'die') {
                this.state = 'die';
                this.deathTimer = 0;
            }
            return;
        }
        
        if (player.invincibleFrames > 20) {
            this.state = 'hurt';
        } else if (engine.input.action1 && player.attackCooldown === player.attackSpeed) {
            this.state = 'attack';
            this.frame = 0;
            this.attackArc = 0;
            // 파티클 생성
            this._spawnAttackParticles();
        } else if (Math.abs(player.vx) > 0.3 || Math.abs(player.vy) > 0.3) {
            this.state = 'walk';
            if (Math.abs(player.vx) > Math.abs(player.vy)) {
                this.direction = player.vx > 0 ? 'right' : 'left';
            } else {
                this.direction = player.vy > 0 ? 'down' : 'up';
            }
        } else {
            this.state = 'idle';
        }
    }
    
    _updateAnimation() {
        const dt = 0.016;
        this.frameTimer += dt;
        
        // 호흡 애니메이션 (항상)
        this.breathAnim += dt * 1.5;
        
        switch(this.state) {
            case 'idle':
                this.idleSway = Math.sin(this.breathAnim * 2) * 0.05;
                this.walkBob *= 0.9;
                break;
            case 'walk':
                this.walkBob = Math.sin(this.breathAnim * 6) * 0.15;
                this.idleSway *= 0.9;
                break;
            case 'attack':
                this.attackArc = Easing.easeOut(Math.min(1, this.frameTimer / 0.25));
                if (this.frameTimer > 0.35) {
                    this.state = 'idle';
                    this.attackArc = 0;
                }
                break;
            case 'hurt':
                if (this.frameTimer > 0.4) {
                    this.state = 'idle';
                    this.visible = true;
                } else {
                    this.visible = Math.floor(this.frameTimer * 30) % 2 === 0;
                }
                break;
            case 'die':
                this.deathTimer = (this.deathTimer || 0) + dt;
                this.deathDuration = 0.8;
                break;
        }
    }
    
    _drawCharacter(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        
        ctx.save();
        
        // 걸을 때 바운스
        ctx.translate(0, this.walkBob * 20);
        ctx.rotate(this.idleSway);
        
        // === 그림자 (바닥) ===
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 20, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        this._drawLegs(vd);
        this._drawBody(vd);
        this._drawCape(vd);
        this._drawArms(vd);
        this._drawHead(vd);
        this._drawWeapon(vd);
        
        ctx.restore();
    }
    
    _drawLegs(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        
        // 바지
        const pantsGrad = vd.linearGradient(0, 10, 0, 18, [
            { pos: 0, color: c.pants },
            { pos: 1, color: '#4a3a2a' }
        ]);
        
        // 왼쪽 다리
        ctx.fillStyle = pantsGrad;
        ctx.beginPath();
        ctx.moveTo(-5, 10);
        ctx.lineTo(-8, 18);
        ctx.lineTo(-2, 18);
        ctx.lineTo(-2, 10);
        ctx.closePath();
        ctx.fill();
        
        // 오른쪽 다리
        ctx.beginPath();
        ctx.moveTo(2, 10);
        ctx.lineTo(5, 18);
        ctx.lineTo(0, 18);
        ctx.lineTo(2, 10);
        ctx.closePath();
        ctx.fill();
        
        // 부츠
        const bootGrad = vd.linearGradient(0, 17, 0, 22, [
            { pos: 0, color: c.boots },
            { pos: 0.5, color: c.bootsDark },
            { pos: 1, color: '#1a0f08' }
        ]);
        
        ctx.fillStyle = bootGrad;
        vd.roundRect(-9, 17, 8, 5, 2);
        ctx.fill();
        vd.roundRect(1, 17, 8, 5, 2);
        ctx.fill();
        
        // 부츠 광택
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        vd.roundRect(-8, 18, 3, 2, 1);
        ctx.fill();
        vd.roundRect(2, 18, 3, 2, 1);
        ctx.fill();
    }
    
    _drawBody(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        
        // 갑옷 본체
        const armorGrad = vd.linearGradient(-7, 0, 7, 0, [
            { pos: 0, color: c.armorDark },
            { pos: 0.3, color: c.armor },
            { pos: 0.5, color: c.armorLight },
            { pos: 0.7, color: c.armor },
            { pos: 1, color: c.armorDark }
        ]);
        
        ctx.fillStyle = armorGrad;
        ctx.beginPath();
        ctx.moveTo(-7, -2);
        ctx.quadraticCurveTo(-9, 5, -6, 12);
        ctx.lineTo(6, 12);
        ctx.quadraticCurveTo(9, 5, 7, -2);
        ctx.quadraticCurveTo(5, -5, 0, -4);
        ctx.quadraticCurveTo(-5, -5, -7, -2);
        ctx.closePath();
        ctx.fill();
        
        // 갑옷 중앙선
        ctx.strokeStyle = c.armorTrim;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(0, 11);
        ctx.stroke();
        
        // 갑옷 가슴 장식
        ctx.fillStyle = c.armorTrim;
        ctx.beginPath();
        ctx.moveTo(-4, 1);
        ctx.lineTo(0, -1);
        ctx.lineTo(4, 1);
        ctx.lineTo(3, 4);
        ctx.lineTo(-3, 4);
        ctx.closePath();
        ctx.fill();
        
        // 벨트
        ctx.fillStyle = c.beltBrown;
        vd.roundRect(-7, 10, 14, 3, 1);
        ctx.fill();
        
        // 벨트 버클
        ctx.fillStyle = c.beltGold;
        ctx.beginPath();
        ctx.arc(0, 11.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c.beltBrown;
        ctx.beginPath();
        ctx.arc(0, 11.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // 광택
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(-2, 2, 3, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    _drawCape(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        
        ctx.save();
        
        // 망토 (뒤쪽)
        const capeGrad = vd.linearGradient(-8, 0, 0, 15, [
            { pos: 0, color: c.capeLight },
            { pos: 1, color: c.cape }
        ]);
        
        ctx.fillStyle = capeGrad;
        ctx.beginPath();
        ctx.moveTo(-6, -1);
        ctx.quadraticCurveTo(-15, 3, -12, 16);
        ctx.quadraticCurveTo(-8, 14, -4, 12);
        ctx.quadraticCurveTo(-5, 8, -6, -1);
        ctx.closePath();
        ctx.fill();
        
        // 망토 주름
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-9, 2);
        ctx.quadraticCurveTo(-11, 8, -9, 14);
        ctx.stroke();
        
        ctx.restore();
    }
    
    _drawArms(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        
        // 왼팔 (뒤)
        this._drawSingleArm(vd, -7, 1, -10, 8, -6, 10);
        
        // 오른팔 (앞, 무기 든 손)
        this._drawSingleArm(vd, 7, 1, 12, 6, 8, 9);
    }
    
    _drawSingleArm(vd, sx, sy, ex, ey, hx, hy) {
        const ctx = vd.ctx;
        const c = this.colors;
        
        const armGrad = vd.linearGradient(sx, sy, hx, hy, [
            { pos: 0, color: c.armor },
            { pos: 1, color: c.armorDark }
        ]);
        
        ctx.fillStyle = armGrad;
        ctx.beginPath();
        ctx.moveTo(sx - 2, sy);
        ctx.lineTo(sx + 2, sy);
        ctx.quadraticCurveTo(ex, ey, hx, hy);
        ctx.quadraticCurveTo(ex - 1, ey, sx - 2, sy);
        ctx.closePath();
        ctx.fill();
        
        // 손
        ctx.fillStyle = c.skin;
        ctx.beginPath();
        ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    _drawHead(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        
        ctx.save();
        
        const headY = -15 + this.walkBob * 5;
        ctx.translate(0, headY);
        
        // 목
        ctx.fillStyle = c.skinShadow;
        vd.roundRect(-3, -3, 6, 4, 1);
        ctx.fill();
        
        // 얼굴
        const faceGrad = vd.radialGradient(0, -1, 2, 0, 1, 10, [
            { pos: 0, color: c.skin },
            { pos: 1, color: c.skinShadow }
        ]);
        
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.arc(0, -3, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 머리카락
        const hairGrad = vd.linearGradient(0, -15, 0, -5, [
            { pos: 0, color: c.hairHighlight },
            { pos: 0.5, color: c.hair },
            { pos: 1, color: '#2a1810' }
        ]);
        
        ctx.fillStyle = hairGrad;
        ctx.beginPath();
        ctx.arc(0, -4, 9, Math.PI, Math.PI * 2);
        ctx.quadraticCurveTo(-5, -8, -8, -3);
        ctx.quadraticCurveTo(-4, -12, 0, -12);
        ctx.quadraticCurveTo(4, -12, 8, -3);
        ctx.quadraticCurveTo(5, -8, 0, -4);
        ctx.closePath();
        ctx.fill();
        
        // 앞머리
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        ctx.moveTo(-7, -6);
        ctx.quadraticCurveTo(-8, -12, -3, -12);
        ctx.quadraticCurveTo(0, -8, -5, -4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(7, -6);
        ctx.quadraticCurveTo(8, -12, 3, -12);
        ctx.quadraticCurveTo(0, -8, 5, -4);
        ctx.fill();
        
        // 눈
        ctx.fillStyle = c.eyeHighlight;
        ctx.beginPath();
        ctx.ellipse(-3, -5, 2.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(3, -5, 2.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 눈동자
        const eyeDX = this.direction === 'right' ? 0.5 : this.direction === 'left' ? -0.5 : 0;
        const eyeDY = this.direction === 'up' ? -0.3 : this.direction === 'down' ? 0.3 : 0;
        
        ctx.fillStyle = c.eye;
        ctx.beginPath();
        ctx.arc(-3 + eyeDX, -5 + eyeDY, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3 + eyeDX, -5 + eyeDY, 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // 눈썹
        ctx.strokeStyle = c.hair;
        ctx.lineWidth = 0.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-5.5, -7.5);
        ctx.quadraticCurveTo(-3, -8.5, -0.5, -7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0.5, -7);
        ctx.quadraticCurveTo(3, -8.5, 5.5, -7.5);
        ctx.stroke();
        
        // 입
        if (this.state === 'hurt') {
            ctx.fillStyle = '#8b5a3c';
            ctx.beginPath();
            ctx.ellipse(0, -0.5, 2, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.state === 'attack') {
            ctx.strokeStyle = '#8b5a3c';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(0, -1, 2, 0.1, Math.PI - 0.1);
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#8b5a3c';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.arc(0, -1, 1.8, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    _drawWeapon(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        
        ctx.save();
        
        // 오른손 위치
        ctx.translate(8, 9);
        
        if (this.state === 'attack') {
            ctx.rotate(-0.5 + this.attackArc * 2.5);
        } else {
            ctx.rotate(-0.4);
        }
        
        // 검날
        const bladeGrad = vd.linearGradient(0, -2, 0, 2, [
            { pos: 0, color: c.swordEdge },
            { pos: 0.3, color: c.swordBlade },
            { pos: 0.5, color: c.swordEdge },
            { pos: 0.7, color: c.swordBlade },
            { pos: 1, color: '#a0a0a0' }
        ]);
        
        ctx.fillStyle = bladeGrad;
        ctx.beginPath();
        ctx.moveTo(3, -1.5);
        ctx.lineTo(18, -0.5);
        ctx.lineTo(18, 0.5);
        ctx.lineTo(3, 1.5);
        ctx.closePath();
        ctx.fill();
        
        // 검 끝
        ctx.fillStyle = c.swordEdge;
        ctx.beginPath();
        ctx.moveTo(18, -0.5);
        ctx.lineTo(21, 0);
        ctx.lineTo(18, 0.5);
        ctx.closePath();
        ctx.fill();
        
        // 가드
        const guardGrad = vd.linearGradient(0, -3, 0, 3, [
            { pos: 0, color: '#ffe066' },
            { pos: 0.5, color: c.swordGuard },
            { pos: 1, color: '#cc9900' }
        ]);
        
        ctx.fillStyle = guardGrad;
        vd.roundRect(1, -3, 4, 6, 1);
        ctx.fill();
        
        // 손잡이
        ctx.fillStyle = c.swordHandle;
        vd.roundRect(-3, -2, 5, 4, 0.8);
        ctx.fill();
        
        // 손잡이 감기
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.3;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(-2, -1.5 + i);
            ctx.lineTo(1, -1.5 + i);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // 파티클
    _spawnAttackParticles() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: 0, y: 0,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                life: 0.4 + Math.random() * 0.3,
                size: 1 + Math.random() * 2,
                color: `hsl(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 40}%)`
            });
        }
    }
    
    _updateParticles(ctx, screen, scale) {
        const dt = 0.016;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // 중력
            p.life -= dt;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            const alpha = p.life / 0.7;
            ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
            ctx.beginPath();
            ctx.arc(screen.x + this.renderSize/2 + p.x * scale, 
                    screen.y + this.renderSize/2 + p.y * scale, 
                    p.size * scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    resetDeath() {
        this.deathTimer = 0;
        this.state = 'idle';
        this.visible = true;
        this.particles = [];
    }
}

// ========== 적 벡터 렌더러 ==========
class EnemyRenderer {
    constructor() {
        this.palettes = {
            FIRE: { 
                body: ['#ff4444', '#ff6644', '#ff8844'],
                eye: '#ffff00',
                glow: 'rgba(255,100,20,0.4)'
            },
            ICE: { 
                body: ['#88ccff', '#aaddff', '#cceeff'],
                eye: '#ffffff',
                glow: 'rgba(100,200,255,0.3)'
            },
            THUNDER: { 
                body: ['#ccaa00', '#ffee44', '#ffff88'],
                eye: '#ffffff',
                glow: 'rgba(255,255,100,0.4)'
            },
            POISON: { 
                body: ['#44aa00', '#66cc22', '#88ff44'],
                eye: '#aaff00',
                glow: 'rgba(100,255,50,0.3)'
            },
            HOLY: { 
                body: ['#cc88cc', '#eeaaee', '#ffccff'],
                eye: '#ffffff',
                glow: 'rgba(255,200,255,0.5)'
            },
            DARK: { 
                body: ['#4422aa', '#6633cc', '#8855ee'],
                eye: '#ff00ff',
                glow: 'rgba(100,50,200,0.4)'
            },
            NEUTRAL: { 
                body: ['#888888', '#aaaaaa', '#cccccc'],
                eye: '#ffffff',
                glow: 'rgba(150,150,150,0.2)'
            }
        };
    }
    
    render(ctx, enemy, engine) {
        const screen = engine.worldToScreen(enemy.x - enemy.size/2, enemy.y - enemy.size/2);
        if (screen.x + enemy.size < -10 || screen.x > engine.width + 10 ||
            screen.y + enemy.size < -10 || screen.y > engine.height + 10) return;
        
        const vd = new VectorDraw(ctx);
        const cx = screen.x + enemy.size/2;
        const cy = screen.y + enemy.size/3;
        const bob = Math.sin(engine.frame * 0.05 + (enemy.bobOffset || 0)) * 2;
        const s = enemy.size / 32;
        const palette = this.palettes[enemy.element] || this.palettes.NEUTRAL;
        
        ctx.save();
        ctx.translate(cx, cy + bob);
        ctx.scale(s, s);
        
        // 그림자
        vd.shadow('rgba(0,0,0,0.3)', 6, 1, 2);
        
        switch(enemy.aiType) {
            case 'ranged': this._drawRanged(vd, enemy, palette); break;
            case 'coward': this._drawCoward(vd, enemy, palette); break;
            case 'berserker': this._drawBerserker(vd, enemy, palette); break;
            case 'patrol': this._drawPatrol(vd, enemy, palette); break;
            default: this._drawBasic(vd, enemy, palette);
        }
        
        vd.clearShadow();
        ctx.restore();
    }
    
    _drawBasic(vd, enemy, p) {
        const ctx = vd.ctx;
        
        // 몸체
        const bodyGrad = vd.radialGradient(0, 0, 2, 0, 0, 14, [
            { pos: 0, color: p.body[1] },
            { pos: 0.7, color: p.body[0] },
            { pos: 1, color: p.body[2] }
        ]);
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        
        // 광택
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(-3, -4, 5, 4, -0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // 눈
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-4, -3, 3, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, -3, 3, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = p.eye;
        ctx.beginPath();
        ctx.arc(-4, -2.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -2.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // 입
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, 3, 3, 0.1, Math.PI - 0.1);
        ctx.stroke();
    }
    
    _drawRanged(vd, enemy, p) {
        const ctx = vd.ctx;
        
        // 마름모 몸체
        const bodyGrad = vd.linearGradient(-8, 0, 8, 0, [
            { pos: 0, color: p.body[0] },
            { pos: 0.5, color: p.body[1] },
            { pos: 1, color: p.body[2] }
        ]);
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        
        // 눈
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-3, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, -2, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    _drawCoward(vd, enemy, p) {
        const ctx = vd.ctx;
        
        // 도망형 - 작은 삼각형 몸체
        const bodyGrad = vd.linearGradient(-8, 10, 0, -12, [
            { pos: 0, color: p.body[1] },
            { pos: 1, color: p.body[0] }
        ]);
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(10, 10);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        
        // 큰 눈 (겁먹은)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-3, -2, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(3, -2, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-3, -1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, -1, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    _drawBerserker(vd, enemy, p) {
        const ctx = vd.ctx;
        
        // 큰 몸체 + 뿔
        const bodyGrad = vd.radialGradient(0, 0, 3, 0, 0, 15, [
            { pos: 0, color: p.body[1] },
            { pos: 0.8, color: p.body[0] },
            { pos: 1, color: '#220000' }
        ]);
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        
        // 뿔
        ctx.fillStyle = p.body[0];
        ctx.beginPath();
        ctx.moveTo(-5, -10);
        ctx.lineTo(-10, -18);
        ctx.lineTo(-2, -12);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, -10);
        ctx.lineTo(10, -18);
        ctx.lineTo(2, -12);
        ctx.fill();
        
        // 광폭화 오라
        if (enemy._berserkDamage) {
            ctx.strokeStyle = 'rgba(255,0,0,0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 17, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 분노한 눈
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.ellipse(-4, -3, 2, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, -3, 2, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    _drawPatrol(vd, enemy, p) {
        const ctx = vd.ctx;
        
        // 타원형 몸체 (거미류)
        const bodyGrad = vd.radialGradient(0, 0, 2, 0, 0, 11, [
            { pos: 0, color: p.body[1] },
            { pos: 0.7, color: p.body[0] },
            { pos: 1, color: p.body[2] }
        ]);
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 다리
        ctx.strokeStyle = p.body[0];
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
            const angle = Math.sin(enemy.bobOffset * 3 + i) * 0.4;
            ctx.beginPath();
            ctx.moveTo(-8 + i * 4, 5);
            ctx.quadraticCurveTo(-8 + i * 4 + angle * 5, 8, -8 + i * 4, 12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-8 + i * 4, -5);
            ctx.quadraticCurveTo(-8 + i * 4 + angle * 5, -8, -8 + i * 4, -12);
            ctx.stroke();
        }
    }
}

const playerCharacter = new PlayerCharacter();
const enemyRenderer = new EnemyRenderer();