// ============================================
// 로그라이크 게임 엔진 - 확장 버전
// ============================================

class GameEngine {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.width = options.width || 1000;
        this.height = options.height || 600;
        this.worldWidth = options.worldWidth || 1800;
        this.worldHeight = options.worldHeight || 1800;
        this.playerSize = options.playerSize || 24;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.gameRunning = true;
        this.frame = 0;
        this.score = 0;
        
        this.camera = { x: 0, y: 0 };
        
        this.player = {
            x: this.worldWidth / 2,
            y: this.worldHeight / 2,
            vx: 0,
            vy: 0,
            size: this.playerSize,
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
        
        this.input = {
            up: false, down: false, left: false, right: false,
            action1: false
        };
        
        this.entities = {
            enemies: [],
            powerups: [],
            obstacles: []
        };
        
        this.settings = {
            damping: 0.92,
            maxSpeed: 7,
            attackRange: 55,
            invincibleFrames: 25
        };
        
        this.callbacks = {
            onUpdate: null,
            onRender: null,
            onPlayerDamage: null,
            onPlayerKill: null,
            onLevelUp: null
        };
        
        this.initEvents();
    }
    
    initEvents() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.input.action1 = true;
            setTimeout(() => { this.input.action1 = false; }, 100);
        });
        this.canvas.addEventListener('mousedown', () => {
            this.input.action1 = true;
            setTimeout(() => { this.input.action1 = false; }, 100);
        });
    }
    
    handleKeyDown(e) {
        const key = e.code;
        if (key === 'Space') {
            e.preventDefault();
            this.input.action1 = true;
        }
        if (key === 'ArrowUp' || key === 'KeyW') this.input.up = true;
        if (key === 'ArrowDown' || key === 'KeyS') this.input.down = true;
        if (key === 'ArrowLeft' || key === 'KeyA') this.input.left = true;
        if (key === 'ArrowRight' || key === 'KeyD') this.input.right = true;
    }
    
    handleKeyUp(e) {
        const key = e.code;
        if (key === 'Space') this.input.action1 = false;
        if (key === 'ArrowUp' || key === 'KeyW') this.input.up = false;
        if (key === 'ArrowDown' || key === 'KeyS') this.input.down = false;
        if (key === 'ArrowLeft' || key === 'KeyA') this.input.left = false;
        if (key === 'ArrowRight' || key === 'KeyD') this.input.right = false;
    }
    
    rectCollide(r1, r2) {
        return !(r2.x > r1.x + r1.w ||
            r2.x + r2.w < r1.x ||
            r2.y > r1.y + r1.h ||
            r2.y + r2.h < r1.y);
    }
    
    updateMovement() {
        let moveX = 0, moveY = 0;
        if (this.input.left) moveX = -1;
        if (this.input.right) moveX = 1;
        if (this.input.up) moveY = -1;
        if (this.input.down) moveY = 1;
        
        if (moveX !== 0 || moveY !== 0) {
            const len = Math.hypot(moveX, moveY);
            moveX /= len;
            moveY /= len;
            this.player.vx += moveX * this.player.moveSpeed;
            this.player.vy += moveY * this.player.moveSpeed;
        }
        
        this.player.vx *= this.settings.damping;
        this.player.vy *= this.settings.damping;
        
        this.player.vx = Math.min(this.settings.maxSpeed, Math.max(-this.settings.maxSpeed, this.player.vx));
        this.player.vy = Math.min(this.settings.maxSpeed, Math.max(-this.settings.maxSpeed, this.player.vy));
        
        let newX = this.player.x + this.player.vx;
        let newY = this.player.y + this.player.vy;
        
        newX = Math.min(Math.max(newX, this.player.size/2 + 10), this.worldWidth - this.player.size/2 - 10);
        newY = Math.min(Math.max(newY, this.player.size/2 + 10), this.worldHeight - this.player.size/2 - 10);
        
        const playerRect = { x: newX - this.player.size/2, y: newY - this.player.size/2, w: this.player.size, h: this.player.size };
        let collide = false;
        for (let obs of this.entities.obstacles) {
            const obsRect = { x: obs.x, y: obs.y, w: obs.w, h: obs.h };
            if (this.rectCollide(playerRect, obsRect)) {
                collide = true;
                break;
            }
        }
        
        if (!collide) {
            this.player.x = newX;
            this.player.y = newY;
        } else {
            this.player.vx *= 0.5;
            this.player.vy *= 0.5;
        }
        
        if (this.player.invincibleFrames > 0) this.player.invincibleFrames--;
        if (this.player.attackCooldown > 0) this.player.attackCooldown--;
    }
    
    updateCamera() {
        this.camera.x = this.player.x - this.width/2;
        this.camera.y = this.player.y - this.height/2;
        this.camera.x = Math.min(Math.max(this.camera.x, 0), this.worldWidth - this.width);
        this.camera.y = Math.min(Math.max(this.camera.y, 0), this.worldHeight - this.height);
    }
    
    updateAttack(enemies, getDistance, onHit) {
        if (this.input.action1 && this.player.attackCooldown === 0 && this.gameRunning) {
            this.player.attackCooldown = this.player.attackSpeed;
            const hitList = [];
            
            for (let i = 0; i < enemies.length; i++) {
                const dist = getDistance(this.player, enemies[i]);
                if (dist < this.settings.attackRange) {
                    hitList.push(i);
                }
            }
            
            for (let i = hitList.length - 1; i >= 0; i--) {
                const idx = hitList[i];
                if (onHit) onHit(enemies[idx], idx);
            }
            
            return hitList.length;
        }
        return 0;
    }
    
    worldToScreen(x, y) {
        return { x: x - this.camera.x, y: y - this.camera.y };
    }
    
    isVisible(x, y, w, h) {
        return (x + w > this.camera.x && x < this.camera.x + this.width &&
                y + h > this.camera.y && y < this.camera.y + this.height);
    }
    
    addExp(amount) {
        this.player.exp += amount;
        while (this.player.exp >= this.player.expToNext) {
            this.player.exp -= this.player.expToNext;
            this.player.level++;
            this.player.expToNext = Math.floor(100 + this.player.level * 25);
            if (this.callbacks.onLevelUp) {
                this.callbacks.onLevelUp(this.player.level);
            }
        }
    }
    
    damagePlayer(amount) {
        if (this.player.invincibleFrames <= 0 && this.gameRunning) {
            const actualDamage = Math.max(1, amount - this.player.defense);
            this.player.hp -= actualDamage;
            this.player.invincibleFrames = this.settings.invincibleFrames;
            
            if (this.callbacks.onPlayerDamage) {
                this.callbacks.onPlayerDamage(actualDamage);
            }
            
            if (this.player.hp <= 0) {
                this.player.hp = 0;
                this.gameRunning = false;
            }
        }
    }
    
    update() {
        if (!this.gameRunning) return;
        
        this.frame++;
        this.updateMovement();
        this.updateCamera();
        
        if (this.callbacks.onUpdate) {
            this.callbacks.onUpdate(this);
        }
    }
    
    renderBackground() {
        const offsetX = this.camera.x % 60;
        const offsetY = this.camera.y % 60;
        this.ctx.strokeStyle = "#3a2a5a";
        this.ctx.lineWidth = 0.6;
        for (let x = -offsetX; x < this.width; x += 60) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        for (let y = -offsetY; y < this.height; y += 60) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }
    
    renderObstacles() {
        for (let obs of this.entities.obstacles) {
            const screen = this.worldToScreen(obs.x, obs.y);
            if (screen.x + obs.w > 0 && screen.x < this.width && 
                screen.y + obs.h > 0 && screen.y < this.height) {
                this.ctx.fillStyle = obs.type === 'rock' ? "#5a4a6a" : "#3a5a3a";
                this.ctx.fillRect(screen.x, screen.y, obs.w, obs.h);
            }
        }
    }
    
    // engine.js - renderPlayer 함수 확인 및 수정
    renderPlayer() {
        if (typeof playerCharacter !== 'undefined' && playerCharacter) {
            // 벡터 캐릭터 렌더링
            playerCharacter.render(this.ctx, this.player, this, this.gameRunning);
        } else {
            // 폴백: 기존 사각형 렌더링
            const screen = this.worldToScreen(this.player.x - this.player.size/2, this.player.y - this.player.size/2);
            this.ctx.shadowBlur = 12;
            
            if (this.player.invincibleFrames > 0 && (Math.floor(Date.now() / 50) % 3 === 0)) {
                this.ctx.fillStyle = "#ffaaaa";
            } else {
                this.ctx.fillStyle = "#ffaa77";
            }
            
            this.ctx.fillRect(screen.x, screen.y, this.player.size, this.player.size);
            this.ctx.shadowBlur = 0;
        }
    }
    
    renderUI() {
        // 체력바
        const hpPercent = this.player.hp / this.player.maxHp;
        this.ctx.fillStyle = "#330000";
        this.ctx.fillRect(18, 18, 204, 14);
        this.ctx.fillStyle = "#ff3333";
        this.ctx.fillRect(18, 18, 200 * hpPercent, 14);
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 12px monospace";
        this.ctx.fillText(`${this.player.hp}/${this.player.maxHp}`, 18, 30);
        
        // 경험치바
        const expPercent = this.player.exp / this.player.expToNext;
        this.ctx.fillStyle = "#333333";
        this.ctx.fillRect(18, 40, 204, 8);
        this.ctx.fillStyle = "#44ff44";
        this.ctx.fillRect(18, 40, 200 * expPercent, 8);
        
        this.ctx.font = "bold 14px monospace";
        this.ctx.fillStyle = "#ffdd88";
        this.ctx.fillText(`LV.${this.player.level}`, 240, 32);
        
        // UI 패널 업데이트
        document.getElementById('statusPanel').innerHTML = `
            ❤️ ${this.player.hp}/${this.player.maxHp}<br>
            ⚡ LV.${this.player.level} (${Math.floor(this.player.exp)}/${this.player.expToNext})<br>
            🗡️ 공격력 ${this.player.attackDamage}<br>
            🛡️ 방어력 ${this.player.defense}<br>
            💀 처치 ${this.player.killCount}<br>
            🏆 층 ${Math.floor(this.score / 100) + 1}
        `;
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.renderBackground();
        this.renderObstacles();
        
        if (this.callbacks.onRender) {
            this.callbacks.onRender(this);
        }
        
        this.renderPlayer();
        this.renderUI();
    }
    
    start() {
        const gameLoop = () => {
            this.update();
            this.render();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
    
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }
    
    addEntity(category, entity) {
        if (this.entities[category]) {
            this.entities[category].push(entity);
        }
    }
    
    addScore(amount) {
        this.score += amount;
    }
}