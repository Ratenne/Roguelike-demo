// ============================================
// 벡터 그래픽 캐릭터 & 애니메이션 시스템 (최종 수정)
// ============================================

// ========== 이징 함수 ==========
const Easing = {
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOut: t => t * (2 - t),
    easeIn: t => t * t,
};

// ========== 벡터 유틸리티 ==========
class VectorDraw {
    constructor(ctx) {
        this.ctx = ctx;
    }

    // 선형 그라데이션 (stops는 [{pos:0~1, color:'...'}] 배열)
    linearGradient(x1, y1, x2, y2, stops) {
        if (!stops || !Array.isArray(stops) || stops.length === 0) {
            return stops?.[0]?.color || '#888888';
        }
        const grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
        for (const s of stops) {
            if (s && typeof s.pos === 'number') grad.addColorStop(s.pos, s.color || '#888');
        }
        return grad;
    }

    // 방사형 그라데이션 (인자 6개: x, y, r1, r2, stopsArray)
    // stops는 [{pos:0~1, color:'...'}] 배열
    radialGradient(x, y, r1, r2, stops) {
        if (!stops || !Array.isArray(stops) || stops.length === 0) {
            return stops?.[0]?.color || '#888888';
        }
        const grad = this.ctx.createRadialGradient(x, y, r1, x, y, r2);
        for (const s of stops) {
            if (s && typeof s.pos === 'number') grad.addColorStop(s.pos, s.color || '#888');
        }
        return grad;
    }

    roundRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    shadow(color = 'rgba(0,0,0,0.4)', blur = 8, ox = 2, oy = 2) {
        Object.assign(this.ctx, {
            shadowColor: color,
            shadowBlur: blur,
            shadowOffsetX: ox,
            shadowOffsetY: oy
        });
    }

    clearShadow() {
        Object.assign(this.ctx, {
            shadowColor: 'transparent',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0
        });
    }
}

// ========== 컬러 팔레트 헬퍼 ==========
function safeColor(arr, idx, fallback = '#888888') {
    return (arr && arr[idx]) ? arr[idx] : fallback;
}

// ========== 플레이어 캐릭터 ==========
class PlayerCharacter {
    constructor() {
        this.state = 'idle';
        this.direction = 'right';
        this.frame = 0;
        this.frameTimer = 0;
        this.renderSize = 56;
        this.breathAnim = 0;
        this.idleSway = 0;
        this.walkBob = 0;
        this.attackArc = 0;
        this.particles = [];
        this.deathTimer = 0;
        this.deathDuration = 0.8;
        this.visible = true;

        this.colors = {
            skin: '#f5d0b0', skinShadow: '#d4a574',
            hair: '#3d2b1f', hairHighlight: '#5c3d2e',
            armor: '#3a6fb5', armorLight: '#5b8fd4', armorDark: '#1e4d8c', armorTrim: '#ffd700',
            cape: '#c0392b', capeLight: '#e74c3c',
            boots: '#4a3728', bootsDark: '#2c1f14',
            pants: '#5c4a3a',
            beltBrown: '#6b4c30', beltGold: '#ffd700',
            eye: '#2c3e50', eyeHighlight: '#ffffff',
            swordBlade: '#e8e8e8', swordEdge: '#ffffff',
            swordGuard: '#ffd700', swordHandle: '#5c3a1e',
        };
    }

    render(ctx, player, engine, gameRunning) {
        const screen = engine.worldToScreen(player.x - this.renderSize / 2, player.y - this.renderSize / 2);
        if (screen.x + this.renderSize < -20 || screen.x > engine.width + 20 ||
            screen.y + this.renderSize < -20 || screen.y > engine.height + 20) return;

        this._updateState(player, engine, gameRunning);
        this._updateAnimation();

        const vd = new VectorDraw(ctx);
        const cx = screen.x + this.renderSize / 2;
        const cy = screen.y + this.renderSize / 2;
        const s = this.renderSize / 48;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        if (this.direction === 'left') ctx.scale(-1, 1);

        if (this.state === 'die') {
            const dp = Math.min(1, this.deathTimer / this.deathDuration);
            ctx.globalAlpha = 1 - dp * 0.8;
            ctx.translate(0, dp * 30);
        }
        if (!this.visible) ctx.globalAlpha = 0.4;

        vd.shadow('rgba(0,0,0,0.35)', 10, 2, 3);
        this._drawCharacter(vd);
        vd.clearShadow();
        ctx.restore();
        this._updateParticles(ctx, screen, s);
    }

    _updateState(player, engine, gameRunning) {
        if (!gameRunning && player.hp <= 0) {
            if (this.state !== 'die') { this.state = 'die'; this.deathTimer = 0; }
            return;
        }
        if (player.invincibleFrames > 20) {
            this.state = 'hurt';
        } else if (engine.input.action1 && player.attackCooldown === player.attackSpeed) {
            this.state = 'attack'; this.frame = 0; this.attackArc = 0; this._spawnAttackParticles();
        } else if (Math.abs(player.vx) > 0.3 || Math.abs(player.vy) > 0.3) {
            this.state = 'walk';
            this.direction = Math.abs(player.vx) > Math.abs(player.vy)
                ? (player.vx > 0 ? 'right' : 'left')
                : (player.vy > 0 ? 'down' : 'up');
        } else {
            this.state = 'idle';
        }
    }

    _updateAnimation() {
        const dt = 0.016;
        this.frameTimer += dt;
        this.breathAnim += dt * 1.5;
        switch (this.state) {
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
                if (this.frameTimer > 0.35) { this.state = 'idle'; this.attackArc = 0; }
                break;
            case 'hurt':
                if (this.frameTimer > 0.4) { this.state = 'idle'; this.visible = true; }
                else { this.visible = Math.floor(this.frameTimer * 30) % 2 === 0; }
                break;
            case 'die':
                this.deathTimer += dt;
                break;
        }
    }

    _drawCharacter(vd) {
        const ctx = vd.ctx;
        ctx.save();
        ctx.translate(0, this.walkBob * 20);
        ctx.rotate(this.idleSway);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(0, 20, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
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
        const g = (y1, y2, c1, c2) => vd.linearGradient(0, y1, 0, y2, [{ pos: 0, color: c1 }, { pos: 1, color: c2 }]);
        ctx.fillStyle = g(10, 18, this.colors.pants, '#4a3a2a');
        ctx.beginPath(); ctx.moveTo(-5, 10); ctx.lineTo(-8, 18); ctx.lineTo(-2, 18); ctx.lineTo(-2, 10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2, 10); ctx.lineTo(5, 18); ctx.lineTo(0, 18); ctx.lineTo(2, 10); ctx.fill();
        ctx.fillStyle = g(17, 22, this.colors.boots, '#1a0f08');
        vd.roundRect(-9, 17, 8, 5, 2); ctx.fill();
        vd.roundRect(1, 17, 8, 5, 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        vd.roundRect(-8, 18, 3, 2, 1); ctx.fill();
        vd.roundRect(2, 18, 3, 2, 1); ctx.fill();
    }

    _drawBody(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        ctx.fillStyle = vd.linearGradient(-7, 0, 7, 0, [
            { pos: 0, color: c.armorDark }, { pos: 0.3, color: c.armor },
            { pos: 0.5, color: c.armorLight }, { pos: 0.7, color: c.armor }, { pos: 1, color: c.armorDark }
        ]);
        ctx.beginPath();
        ctx.moveTo(-7, -2); ctx.quadraticCurveTo(-9, 5, -6, 12); ctx.lineTo(6, 12);
        ctx.quadraticCurveTo(9, 5, 7, -2); ctx.quadraticCurveTo(5, -5, 0, -4); ctx.quadraticCurveTo(-5, -5, -7, -2);
        ctx.fill();
        ctx.strokeStyle = c.armorTrim; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 11); ctx.stroke();
        ctx.fillStyle = c.armorTrim;
        ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(0, -1); ctx.lineTo(4, 1); ctx.lineTo(3, 4); ctx.lineTo(-3, 4); ctx.fill();
        ctx.fillStyle = c.beltBrown; vd.roundRect(-7, 10, 14, 3, 1); ctx.fill();
        ctx.fillStyle = c.beltGold; ctx.beginPath(); ctx.arc(0, 11.5, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.beltBrown; ctx.beginPath(); ctx.arc(0, 11.5, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 3, 6, -0.3, 0, Math.PI * 2); ctx.fill();
    }

    _drawCape(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        ctx.save();
        ctx.fillStyle = vd.linearGradient(-8, 0, 0, 15, [{ pos: 0, color: c.capeLight }, { pos: 1, color: c.cape }]);
        ctx.beginPath();
        ctx.moveTo(-6, -1); ctx.quadraticCurveTo(-15, 3, -12, 16);
        ctx.quadraticCurveTo(-8, 14, -4, 12); ctx.quadraticCurveTo(-5, 8, -6, -1);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-11, 8, -9, 14); ctx.stroke();
        ctx.restore();
    }

    _drawArms(vd) {
        this._arm(vd, -7, 1, -10, 8, -6, 10);
        this._arm(vd, 7, 1, 12, 6, 8, 9);
    }

    _arm(vd, sx, sy, ex, ey, hx, hy) {
        const ctx = vd.ctx;
        ctx.fillStyle = vd.linearGradient(sx, sy, hx, hy, [{ pos: 0, color: this.colors.armor }, { pos: 1, color: this.colors.armorDark }]);
        ctx.beginPath();
        ctx.moveTo(sx - 2, sy); ctx.lineTo(sx + 2, sy);
        ctx.quadraticCurveTo(ex, ey, hx, hy); ctx.quadraticCurveTo(ex - 1, ey, sx - 2, sy);
        ctx.fill();
        ctx.fillStyle = this.colors.skin; ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    _drawHead(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        ctx.save();
        ctx.translate(0, -15 + this.walkBob * 5);
        ctx.fillStyle = c.skinShadow; vd.roundRect(-3, -3, 6, 4, 1); ctx.fill();
        ctx.fillStyle = vd.radialGradient(0, -1, 2, 10, [{ pos: 0, color: c.skin }, { pos: 1, color: c.skinShadow }]);
        ctx.beginPath(); ctx.arc(0, -3, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = vd.linearGradient(0, -15, 0, -5, [{ pos: 0, color: c.hairHighlight }, { pos: 0.5, color: c.hair }, { pos: 1, color: '#2a1810' }]);
        ctx.beginPath();
        ctx.arc(0, -4, 9, Math.PI, Math.PI * 2);
        ctx.quadraticCurveTo(-5, -8, -8, -3); ctx.quadraticCurveTo(-4, -12, 0, -12);
        ctx.quadraticCurveTo(4, -12, 8, -3); ctx.quadraticCurveTo(5, -8, 0, -4);
        ctx.fill();
        ctx.fillStyle = c.hair;
        ctx.beginPath(); ctx.moveTo(-7, -6); ctx.quadraticCurveTo(-8, -12, -3, -12); ctx.quadraticCurveTo(0, -8, -5, -4); ctx.fill();
        ctx.beginPath(); ctx.moveTo(7, -6); ctx.quadraticCurveTo(8, -12, 3, -12); ctx.quadraticCurveTo(0, -8, 5, -4); ctx.fill();
        ctx.fillStyle = c.eyeHighlight;
        ctx.beginPath(); ctx.ellipse(-3, -5, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3, -5, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        const ex = this.direction === 'right' ? 0.5 : this.direction === 'left' ? -0.5 : 0;
        const ey = this.direction === 'up' ? -0.3 : this.direction === 'down' ? 0.3 : 0;
        ctx.fillStyle = c.eye;
        ctx.beginPath(); ctx.arc(-3 + ex, -5 + ey, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3 + ex, -5 + ey, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = c.hair; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-5.5, -7.5); ctx.quadraticCurveTo(-3, -8.5, -0.5, -7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0.5, -7); ctx.quadraticCurveTo(3, -8.5, 5.5, -7.5); ctx.stroke();
        if (this.state === 'hurt') {
            ctx.fillStyle = '#8b5a3c'; ctx.beginPath(); ctx.ellipse(0, -0.5, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        } else if (this.state === 'attack') {
            ctx.strokeStyle = '#8b5a3c'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -1, 2, 0.1, Math.PI - 0.1); ctx.stroke();
        } else {
            ctx.strokeStyle = '#8b5a3c'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, -1, 1.8, 0.2, Math.PI - 0.2); ctx.stroke();
        }
        ctx.restore();
    }

    _drawWeapon(vd) {
        const ctx = vd.ctx;
        const c = this.colors;
        ctx.save();
        ctx.translate(8, 9);
        ctx.rotate(this.state === 'attack' ? -0.5 + this.attackArc * 2.5 : -0.4);
        ctx.fillStyle = vd.linearGradient(0, -2, 0, 2, [
            { pos: 0, color: c.swordEdge }, { pos: 0.3, color: c.swordBlade },
            { pos: 0.5, color: c.swordEdge }, { pos: 0.7, color: c.swordBlade }, { pos: 1, color: '#a0a0a0' }
        ]);
        ctx.beginPath(); ctx.moveTo(3, -1.5); ctx.lineTo(18, -0.5); ctx.lineTo(18, 0.5); ctx.lineTo(3, 1.5); ctx.fill();
        ctx.fillStyle = c.swordEdge;
        ctx.beginPath(); ctx.moveTo(18, -0.5); ctx.lineTo(21, 0); ctx.lineTo(18, 0.5); ctx.fill();
        ctx.fillStyle = vd.linearGradient(0, -3, 0, 3, [
            { pos: 0, color: '#ffe066' }, { pos: 0.5, color: c.swordGuard }, { pos: 1, color: '#cc9900' }
        ]);
        vd.roundRect(1, -3, 4, 6, 1); ctx.fill();
        ctx.fillStyle = c.swordHandle; vd.roundRect(-3, -2, 5, 4, 0.8); ctx.fill();
        ctx.restore();
    }

    _spawnAttackParticles() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: 0, y: 0,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                life: 0.4 + Math.random() * 0.3,
                size: 1 + Math.random() * 2,
                color: `hsla(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 40}%, `
            });
        }
    }

    _updateParticles(ctx, screen, scale) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.016;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            ctx.fillStyle = p.color + Math.min(1, p.life / 0.7) + ')';
            ctx.beginPath();
            ctx.arc(screen.x + this.renderSize / 2 + p.x * scale,
                screen.y + this.renderSize / 2 + p.y * scale, p.size * scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    resetDeath() {
        this.deathTimer = 0; this.state = 'idle'; this.visible = true; this.particles = [];
    }
}

// ========== 적 벡터 렌더러 ==========
class EnemyRenderer {
    constructor() {
        this.palettes = {
            FIRE: { body: ['#ff4444', '#ff6644', '#ff8844'], eye: '#ffff00' },
            ICE: { body: ['#88ccff', '#aaddff', '#cceeff'], eye: '#ffffff' },
            THUNDER: { body: ['#ccaa00', '#ffee44', '#ffff88'], eye: '#ffffff' },
            POISON: { body: ['#44aa00', '#66cc22', '#88ff44'], eye: '#aaff00' },
            HOLY: { body: ['#cc88cc', '#eeaaee', '#ffccff'], eye: '#ffffff' },
            DARK: { body: ['#4422aa', '#6633cc', '#8855ee'], eye: '#ff00ff' },
            NEUTRAL: { body: ['#888888', '#aaaaaa', '#cccccc'], eye: '#ffffff' }
        };
    }

    render(ctx, enemy, engine) {
        const screen = engine.worldToScreen(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2);
        if (screen.x + enemy.size < -10 || screen.x > engine.width + 10 ||
            screen.y + enemy.size < -10 || screen.y > engine.height + 10) return;

        const vd = new VectorDraw(ctx);
        const cx = screen.x + enemy.size / 2;
        const cy = screen.y + enemy.size / 3;
        const bob = Math.sin(engine.frame * 0.05 + (enemy.bobOffset || 0)) * 2;
        const s = enemy.size / 32;
        const p = this.palettes[enemy.element] || this.palettes.NEUTRAL;

        ctx.save();
        ctx.translate(cx, cy + bob);
        ctx.scale(s, s);
        vd.shadow('rgba(0,0,0,0.3)', 6, 1, 2);

        switch (enemy.aiType || 'chase') {
            case 'ranged': this._drawRanged(vd, p); break;
            case 'coward': this._drawCoward(vd, p); break;
            case 'berserker': this._drawBerserker(vd, enemy, p); break;
            case 'patrol': this._drawPatrol(vd, enemy, p); break;
            default: this._drawBasic(vd, p);
        }

        vd.clearShadow();
        ctx.restore();
    }

    // 기본형 (인자 2개)
    _drawBasic(vd, p) {
        const ctx = vd.ctx;
        ctx.fillStyle = vd.radialGradient(0, 0, 2, 14, [
            { pos: 0, color: safeColor(p.body, 1) }, { pos: 0.7, color: safeColor(p.body, 0) }, { pos: 1, color: safeColor(p.body, 2) }
        ]);
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.ellipse(-3, -4, 5, 4, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(-4, -3, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -3, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.eye || '#ffffff';
        ctx.beginPath(); ctx.arc(-4, -2.5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -2.5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(0, 3, 3, 0.1, Math.PI - 0.1); ctx.stroke();
    }

    // 원거리형 (인자 2개)
    _drawRanged(vd, p) {
        const ctx = vd.ctx;
        ctx.fillStyle = vd.linearGradient(-8, 0, 8, 0, [
            { pos: 0, color: safeColor(p.body, 0) }, { pos: 0.5, color: safeColor(p.body, 1) }, { pos: 1, color: safeColor(p.body, 2) }
        ]);
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, 0); ctx.lineTo(0, 12); ctx.lineTo(-10, 0); ctx.fill();
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(-3, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -2, 2, 0, Math.PI * 2); ctx.fill();
    }

    // 도망형 (인자 2개)
    _drawCoward(vd, p) {
        const ctx = vd.ctx;
        ctx.fillStyle = vd.linearGradient(-8, 10, 0, -12, [
            { pos: 0, color: safeColor(p.body, 1) }, { pos: 1, color: safeColor(p.body, 0) }
        ]);
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(-3, -2, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3, -2, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(-3, -1, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -1, 2, 0, Math.PI * 2); ctx.fill();
    }

    // 광전사형 (인자 3개: vd, enemy, p)
    _drawBerserker(vd, enemy, p) {
        const ctx = vd.ctx;
        ctx.fillStyle = vd.radialGradient(0, 0, 3, 15, [
            { pos: 0, color: safeColor(p.body, 1) }, { pos: 0.8, color: safeColor(p.body, 0) }, { pos: 1, color: '#220000' }
        ]);
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = safeColor(p.body, 0);
        ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-10, -18); ctx.lineTo(-2, -12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(10, -18); ctx.lineTo(2, -12); ctx.fill();
        if (enemy._berserkDamage) {
            ctx.strokeStyle = 'rgba(255,0,0,0.5)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.ellipse(-4, -3, 2, 3, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -3, 2, 3, 0.2, 0, Math.PI * 2); ctx.fill();
    }

    // 순찰형 (인자 3개: vd, enemy, p)
    _drawPatrol(vd, enemy, p) {
        const ctx = vd.ctx;
        ctx.fillStyle = vd.radialGradient(0, 0, 2, 11, [
            { pos: 0, color: safeColor(p.body, 1) }, { pos: 0.7, color: safeColor(p.body, 0) }, { pos: 1, color: safeColor(p.body, 2) }
        ]);
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = safeColor(p.body, 0); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        const bo = enemy.bobOffset || 0;
        for (let i = 0; i < 4; i++) {
            const a = Math.sin(bo * 3 + i) * 0.4;
            ctx.beginPath(); ctx.moveTo(-10 + i * 5, 5);
            ctx.quadraticCurveTo(-10 + i * 5 + a * 5, 9, -10 + i * 5, 13); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-10 + i * 5, -5);
            ctx.quadraticCurveTo(-10 + i * 5 + a * 5, -9, -10 + i * 5, -13); ctx.stroke();
        }
    }
}

const playerCharacter = new PlayerCharacter();
const enemyRenderer = new EnemyRenderer();