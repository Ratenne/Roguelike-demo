// ============================================
// Web Audio API 사운드 엔진
// ============================================

class SoundEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
        this.musicNodes = [];
        this.currentMusic = null;
        this.musicVolume = 0.35;
        this.sfxVolume = 0.5;
        this.muted = false;
        
        // 배경음악용 LFO
        this.musicLFO = null;
        this.musicInterval = null;
    }
    
    // 오디오 컨텍스트 초기화 (최초 사용자 인터랙션 시)
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 마스터 게인
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 1.0;
            this.masterGain.connect(this.audioContext.destination);
            
            // 배경음악 게인
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            // 효과음 게인
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            
            this.initialized = true;
            console.log('🔊 Sound Engine initialized');
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }
    
    // 컨텍스트 재개 (브라우저 정책 대응)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        if (!this.initialized) {
            this.init();
        }
    }
    
    // ========== 효과음 생성 ==========
    
    // 기본 톤 생성
    _createOscillator(type, frequency, duration, gainValue = 0.3, detune = 0) {
        if (!this.initialized) return;
        
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, now);
        if (detune) osc.detune.setValueAtTime(detune, now);
        
        gainNode.gain.setValueAtTime(gainValue, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + duration);
        
        return { osc, gain: gainNode };
    }
    
    // 노이즈 생성
    _createNoise(duration, gainValue = 0.15, filterFreq = 2000) {
        if (!this.initialized) return;
        
        const now = this.audioContext.currentTime;
        const bufferSize = Math.floor(this.audioContext.sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.Q.setValueAtTime(0.5, now);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(gainValue, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        source.start(now);
        source.stop(now + duration);
    }
    
    // ========== 게임 효과음 ==========
    
    // 일반 공격
    playAttack() {
        this._createOscillator('square', 220, 0.08, 0.15);
        this._createOscillator('square', 110, 0.06, 0.1, 0);
        // 노이즈 추가 (타격감)
        setTimeout(() => {
            this._createNoise(0.04, 0.08, 1500);
        }, 30);
    }
    
    // 치명타
    playCritical() {
        this._createOscillator('sawtooth', 440, 0.12, 0.2);
        this._createOscillator('square', 880, 0.1, 0.15, 0);
        this._createOscillator('triangle', 220, 0.15, 0.12);
        setTimeout(() => {
            this._createNoise(0.05, 0.12, 3000);
        }, 20);
    }
    
    // 플레이어 피격
    playPlayerHit() {
        this._createOscillator('sawtooth', 200, 0.15, 0.2);
        this._createOscillator('square', 100, 0.2, 0.15, -50);
        // 저음 충격
        this._createOscillator('sine', 55, 0.25, 0.25);
        setTimeout(() => {
            this._createNoise(0.06, 0.1, 800);
        }, 40);
    }
    
    // 적 처치
    playEnemyKill() {
        this._createOscillator('square', 600, 0.1, 0.12);
        this._createOscillator('square', 900, 0.08, 0.1, 0);
        this._createOscillator('sine', 1200, 0.06, 0.08);
        setTimeout(() => {
            this._createOscillator('triangle', 400, 0.15, 0.08);
        }, 80);
    }
    
    // 보스 처치
    playBossKill() {
        const now = this.audioContext.currentTime;
        
        // 승리 팡파르
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0.2, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.3);
        });
        
        // 저음 드럼
        setTimeout(() => {
            this._createOscillator('sine', 60, 0.4, 0.3, -20);
            this._createNoise(0.15, 0.15, 500);
        }, 100);
    }
    
    // 아이템 획득
    playItemPickup() {
        this._createOscillator('sine', 880, 0.1, 0.15);
        this._createOscillator('sine', 1320, 0.08, 0.12);
        setTimeout(() => {
            this._createOscillator('triangle', 1100, 0.08, 0.1);
        }, 60);
    }
    
    // 경험치 획득
    playExpGain() {
        this._createOscillator('sine', 660, 0.06, 0.08);
        this._createOscillator('sine', 880, 0.04, 0.06);
    }
    
    // 레벨업
    playLevelUp() {
        const now = this.audioContext.currentTime;
        const notes = [440, 554, 660, 880, 1100];
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.18, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.25);
        });
        
        // 반짝임 효과
        setTimeout(() => {
            this._createOscillator('sine', 1760, 0.15, 0.1);
        }, 250);
    }
    
    // 스킬 발사 - 화염구
    playFireball() {
        this._createNoise(0.15, 0.15, 400);  // 불 타는 소리
        this._createOscillator('sawtooth', 150, 0.2, 0.12);
        this._createOscillator('square', 300, 0.15, 0.1, 20);
        // 폭발
        setTimeout(() => {
            this._createNoise(0.1, 0.2, 200);
            this._createOscillator('sine', 50, 0.15, 0.3);
        }, 120);
    }
    
    // 스킬 발사 - 얼음 파편
    playIceShard() {
        this._createOscillator('sine', 1200, 0.08, 0.1);
        this._createOscillator('sine', 1800, 0.06, 0.08);
        this._createOscillator('triangle', 2400, 0.04, 0.06);
        // 얼음 깨지는 소리
        setTimeout(() => {
            this._createNoise(0.08, 0.1, 6000);
            this._createOscillator('square', 800, 0.06, 0.05);
        }, 50);
    }
    
    // 스킬 발사 - 연쇄 번개
    playLightning() {
        this._createNoise(0.12, 0.2, 8000);  // 짜릿한 노이즈
        this._createOscillator('sawtooth', 100, 0.1, 0.15);
        this._createOscillator('square', 2000, 0.06, 0.08);
        setTimeout(() => {
            this._createOscillator('square', 4000, 0.04, 0.05);
        }, 40);
    }
    
    // 스킬 발사 - 독 구름
    playPoisonCloud() {
        this._createNoise(0.25, 0.08, 300);  // 거품 소리
        this._createOscillator('sawtooth', 60, 0.3, 0.1);
        this._createOscillator('triangle', 120, 0.2, 0.08);
        setTimeout(() => {
            this._createNoise(0.2, 0.06, 200);
        }, 150);
    }
    
    // 함정 발동
    playTrap() {
        this._createOscillator('square', 400, 0.1, 0.15, -100);
        this._createOscillator('sawtooth', 200, 0.12, 0.1);
        this._createNoise(0.05, 0.12, 1000);
    }
    
    // 상자 열기
    playChestOpen() {
        this._createOscillator('sine', 523, 0.08, 0.1);
        this._createOscillator('sine', 659, 0.06, 0.08);
        this._createOscillator('sine', 784, 0.05, 0.06);
        setTimeout(() => {
            this._createOscillator('triangle', 1047, 0.1, 0.08);
        }, 80);
    }
    
    // 회복
    playHeal() {
        this._createOscillator('sine', 440, 0.15, 0.12);
        this._createOscillator('sine', 554, 0.12, 0.1);
        this._createOscillator('sine', 660, 0.1, 0.08);
    }
    
    // 층 이동
    playFloorChange() {
        const now = this.audioContext.currentTime;
        // 올라가는 음계
        for (let i = 0; i < 4; i++) {
            this._createOscillator('sine', 330 * (i + 1), 0.15, 0.12, i * 30);
        }
        // 포털 효과
        setTimeout(() => {
            this._createOscillator('sawtooth', 200, 0.3, 0.1);
            this._createNoise(0.2, 0.08, 2000);
        }, 200);
    }
    
    // 게임 오버
    playGameOver() {
        const now = this.audioContext.currentTime;
        const notes = [330, 277, 220, 165]; // E4, C#4, A3, E3 (하강)
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + i * 0.2);
            gain.gain.setValueAtTime(0.2, now + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.35);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.35);
        });
        
        // 저음 드럼
        setTimeout(() => {
            this._createOscillator('sine', 50, 0.5, 0.3);
            this._createNoise(0.2, 0.1, 400);
        }, 600);
    }
    
    // 마나 부족
    playManaLow() {
        this._createOscillator('square', 200, 0.1, 0.08, -200);
        this._createOscillator('square', 180, 0.12, 0.08, -220);
    }
    
    // 버튼 클릭
    playClick() {
        this._createOscillator('sine', 800, 0.03, 0.08);
        this._createOscillator('sine', 1200, 0.02, 0.05);
    }
    
    // 펫 공격
    playPetAttack() {
        this._createOscillator('triangle', 500, 0.06, 0.08);
        this._createOscillator('triangle', 700, 0.04, 0.06);
    }
    
    // ========== 배경음악 시스템 ==========
    
    // 던전 분위기 배경음악 (저음 드론 + 랜덤 멜로디)
    startDungeonMusic() {
        if (!this.initialized || this.currentMusic) return;
        
        this.currentMusic = 'dungeon';
        const now = this.audioContext.currentTime;
        const ctx = this.audioContext;
        
        // 저음 드론 (긴장감)
        const droneOsc = ctx.createOscillator();
        const droneGain = ctx.createGain();
        droneOsc.type = 'sine';
        droneOsc.frequency.setValueAtTime(55, now); // A1
        droneGain.gain.setValueAtTime(0.12, now);
        droneOsc.connect(droneGain);
        droneGain.connect(this.musicGain);
        droneOsc.start(now);
        this.musicNodes.push({ osc: droneOsc, gain: droneGain });
        
        // 세컨드 드론 (5도 위)
        const drone2Osc = ctx.createOscillator();
        const drone2Gain = ctx.createGain();
        drone2Osc.type = 'triangle';
        drone2Osc.frequency.setValueAtTime(82.5, now); // E2
        drone2Gain.gain.setValueAtTime(0.06, now);
        drone2Osc.connect(drone2Gain);
        drone2Gain.connect(this.musicGain);
        drone2Osc.start(now);
        this.musicNodes.push({ osc: drone2Osc, gain: drone2Gain });
        
        // LFO 변조
        this.musicLFO = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        this.musicLFO.type = 'sine';
        this.musicLFO.frequency.setValueAtTime(0.1, now); // 천천히 변조
        lfoGain.gain.setValueAtTime(5, now);
        this.musicLFO.connect(lfoGain);
        lfoGain.connect(droneOsc.frequency);
        this.musicLFO.start(now);
        this.musicNodes.push({ osc: this.musicLFO, gain: lfoGain });
        
        // 랜덤 멜로디 노트 (주기적으로 재생)
        const scale = [55, 65, 73.4, 82.5, 98, 110, 130.8]; // A 마이너 펜타토닉
        this.musicInterval = setInterval(() => {
            if (!this.currentMusic || this.muted) return;
            
            const note = scale[Math.floor(Math.random() * scale.length)];
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(note * 2, ctx.currentTime);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.5);
            
            // 중간중간 하모닉스
            if (Math.random() > 0.6) {
                const harmOsc = ctx.createOscillator();
                const harmGain = ctx.createGain();
                harmOsc.type = 'triangle';
                harmOsc.frequency.setValueAtTime(note * 3, ctx.currentTime);
                harmGain.gain.setValueAtTime(0.02, ctx.currentTime);
                harmGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
                harmOsc.connect(harmGain);
                harmGain.connect(this.musicGain);
                harmOsc.start(ctx.currentTime);
                harmOsc.stop(ctx.currentTime + 1.0);
            }
        }, 1500);
    }
    
    // 보스전 배경음악 (더 강렬하게)
    startBossMusic() {
        this.stopMusic();
        
        if (!this.initialized) return;
        
        this.currentMusic = 'boss';
        const now = this.audioContext.currentTime;
        const ctx = this.audioContext;
        
        // 더 낮은 드론
        const droneOsc = ctx.createOscillator();
        const droneGain = ctx.createGain();
        droneOsc.type = 'sawtooth';
        droneOsc.frequency.setValueAtTime(41.2, now); // E1
        droneGain.gain.setValueAtTime(0.1, now);
        droneOsc.connect(droneGain);
        droneGain.connect(this.musicGain);
        droneOsc.start(now);
        this.musicNodes.push({ osc: droneOsc, gain: droneGain });
        
        // 빠른 LFO
        this.musicLFO = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        this.musicLFO.type = 'square';
        this.musicLFO.frequency.setValueAtTime(2.5, now);
        lfoGain.gain.setValueAtTime(8, now);
        this.musicLFO.connect(lfoGain);
        lfoGain.connect(droneOsc.frequency);
        this.musicLFO.start(now);
        this.musicNodes.push({ osc: this.musicLFO, gain: lfoGain });
        
        // 보스 테마 멜로디
        const bossScale = [41.2, 55, 69.3, 82.4, 98, 110]; // E 프리지안
        this.musicInterval = setInterval(() => {
            if (!this.currentMusic || this.muted) return;
            
            const note = bossScale[Math.floor(Math.random() * bossScale.length)];
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(note * 2, ctx.currentTime);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
        }, 800);
    }
    
    // 보스전 승리 음악
    playBossVictoryMusic() {
        this.stopMusic();
        
        const now = this.audioContext.currentTime;
        const ctx = this.audioContext;
        const victoryNotes = [523, 659, 784, 1047, 784, 1047, 1319]; // C major arpeggio
        
        victoryNotes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            gain.gain.setValueAtTime(0.15, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.4);
        });
        
        // 마지막 화음
        setTimeout(() => {
            [523, 659, 784, 1047].forEach((freq) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
                osc.connect(gain);
                gain.connect(this.musicGain);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 1.5);
            });
        }, victoryNotes.length * 150);
    }
    
    // 배경음악 정지
    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
        
        // 모든 음악 노드 정지
        const now = this.audioContext?.currentTime || 0;
        for (let node of this.musicNodes) {
            try {
                node.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                if (node.osc.stop) {
                    node.osc.stop(now + 0.4);
                }
            } catch (e) {
                // 이미 정지된 노드 무시
            }
        }
        this.musicNodes = [];
        this.musicLFO = null;
        this.currentMusic = null;
    }
    
    // ========== 볼륨 제어 ==========
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.muted ? 0 : this.musicVolume;
        }
    }
    
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.muted ? 0 : this.sfxVolume;
        }
    }
    
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 1;
        }
        if (this.muted) {
            this.stopMusic();
        } else if (this.currentMusic === 'dungeon') {
            this.startDungeonMusic();
        } else if (this.currentMusic === 'boss') {
            this.startBossMusic();
        }
        return this.muted;
    }
    
    // 전체 정리
    dispose() {
        this.stopMusic();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.initialized = false;
        }
    }
}

// 전역 사운드 엔진 인스턴스
const soundEngine = new SoundEngine();