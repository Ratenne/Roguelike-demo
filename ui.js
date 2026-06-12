// ============================================
// UI 렌더링 모듈
// ============================================

// ========== 플로팅 메시지 ==========
let floatingMessage = { text: "", color: "", timer: 0 };

function showFloatingMessage(msg, color = "#ffffff") {
    floatingMessage = { text: msg, color: color, timer: 2.0 };
}

// ========== 스킬 UI ==========
function drawSkillUI(ctx, engine, activeSkills, mana, maxMana, specialAttackCooldown) {
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
    
    const manaPercent = mana / maxMana;
    ctx.fillStyle = "#330066";
    ctx.fillRect(startX, startY + 70, 155, 8);
    ctx.fillStyle = "#6688ff";
    ctx.fillRect(startX, startY + 70, 155 * manaPercent, 8);
    ctx.fillStyle = "#aaaaff";
    ctx.font = "9px monospace";
    ctx.fillText(`💙 ${Math.floor(mana)}/${maxMana}`, startX, startY + 68);
}

// ========== 펫 정보 UI ==========
function drawPetInfo(ctx, engine, currentPet) {
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

// ========== 상태이상 UI ==========
function drawActiveEffects(ctx, engine, activeEffects) {
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

// ========== 이벤트 UI ==========
function drawEventUI(ctx, engine, timeEventActive, timeEventRemaining, timeEventReward, secretRoomDiscovered) {
    // 시간 제한 이벤트
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
    
    // 숨겨진 방 발견
    if (secretRoomDiscovered) {
        ctx.fillStyle = "#ffaa44";
        ctx.font = "bold 10px monospace";
        ctx.fillText("🌟 숨겨진 방 발견!", engine.width - 120, 60);
    }
}

// ========== 방향 안내 ==========
function drawDirectionGuide(ctx, engine) {
    ctx.fillStyle = "rgba(255,200,100,0.6)";
    ctx.font = "10px monospace";
    ctx.fillText("👉 마우스 방향으로 스킬 발사", engine.width - 160, 30);
}

// ========== 플로팅 메시지 렌더링 ==========
function drawFloatingMessage(ctx, engine) {
    if (floatingMessage.timer > 0) {
        ctx.font = "bold 20px monospace";
        ctx.fillStyle = floatingMessage.color;
        ctx.shadowBlur = 8;
        const textWidth = floatingMessage.text.length * 10;
        ctx.fillText(floatingMessage.text, engine.width/2 - textWidth/2, engine.height/2 - 80);
    }
}

// ========== 층수 & 보스 UI ==========
function drawFloorUI(ctx, engine, currentFloor, enemies) {
    ctx.font = "bold 22px monospace";
    ctx.fillStyle = "#ffaa88";
    ctx.fillText(`🏰 ${currentFloor}층`, 20, 85);
    
    const hasBoss = enemies.some(e => e.type === 'boss');
    if (hasBoss) {
        ctx.fillStyle = "#ff6666";
        ctx.font = "bold 14px monospace";
        ctx.fillText("⚠️ BOSS ⚠️", 20, 115);
    }
}

// ========== 마우스 방향선 ==========
function drawMouseDirection(ctx, engine, game, mouseX, mouseY) {
    if (mouseX > 0 && mouseX < engine.width && mouseY > 0 && mouseY < engine.height) {
        const playerScreen = engine.worldToScreen(game.player.x, game.player.y);
        ctx.beginPath();
        ctx.moveTo(playerScreen.x, playerScreen.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = "rgba(255, 200, 100, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 200, 100, 0.7)";
        ctx.stroke();
    }
}

// ========== 레벨업 메뉴 ==========
function showLevelUpMenu(game, availableSkills) {
    isLevelUpMenuOpen = true;
    game.gameRunning = false;
    
    const shuffled = [...levelUpSkillOptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    availableSkills.length = 0;
    availableSkills.push(...shuffled.slice(0, 3));
    
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
            availableSkills[i].effect(game);
            showFloatingMessage(`${availableSkills[i].name} 습득!`, "#88ff88");
            closeSkillMenu(game);
        });
    }
    document.getElementById('closeSkillMenu').addEventListener('click', () => {
        closeSkillMenu(game);
    });
}

function closeSkillMenu(game) {
    const menuDiv = document.getElementById('skillMenu');
    if (menuDiv) menuDiv.remove();
    isLevelUpMenuOpen = false;
    game.gameRunning = true;
}