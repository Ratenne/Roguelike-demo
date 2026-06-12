// ============================================
// 던전 맵 생성 모듈 (BSP + Cellular Automata)
// ============================================

// ========== 방(Room) 클래스 ==========
class Room {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.centerX = x + Math.floor(w / 2);
        this.centerY = y + Math.floor(h / 2);
        this.connected = false;
        this.type = 'normal'; // 'normal', 'treasure', 'boss', 'start', 'secret'
    }
    
    // 다른 방과 겹치는지 확인
    overlaps(other, padding = 2) {
        return !(other.x > this.x + this.w + padding ||
            other.x + other.w + padding < this.x ||
            other.y > this.y + this.h + padding ||
            other.y + other.h + padding < this.y);
    }
    
    // 특정 좌표가 방 안에 있는지
    contains(x, y, margin = 0) {
        return x >= this.x + margin && x <= this.x + this.w - margin &&
               y >= this.y + margin && y <= this.y + this.h - margin;
    }
    
    // 랜덤 위치 반환
    randomPosition(margin = 2) {
        return {
            x: this.x + margin + Math.floor(Math.random() * (this.w - margin * 2)),
            y: this.y + margin + Math.floor(Math.random() * (this.h - margin * 2))
        };
    }
}

// ========== BSP 트리 노드 ==========
class BSPNode {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.left = null;
        this.right = null;
        this.room = null;
        this.corridor = null;
    }
    
    get isLeaf() {
        return !this.left && !this.right;
    }
    
    // 분할 가능 여부
    canSplit(minRoomSize) {
        return this.w > minRoomSize * 2.5 || this.h > minRoomSize * 2.5;
    }
    
    // BSP 분할 실행
    split(minRoomSize, maxDepth, currentDepth = 0) {
        if (currentDepth >= maxDepth || !this.canSplit(minRoomSize)) {
            return false;
        }
        
        // 가로/세로 분할 결정 (긴 방향 우선)
        let splitVertical = this.w > this.h * 1.25 ? true :
                           this.h > this.w * 1.25 ? false :
                           Math.random() > 0.5;
        
        const minSize = minRoomSize + 4; // 벽/복도 공간 확보
        
        if (splitVertical) {
            if (this.w < minSize * 2) return false;
            const splitX = this.x + minSize + Math.floor(Math.random() * (this.w - minSize * 2));
            this.left = new BSPNode(this.x, this.y, splitX - this.x, this.h);
            this.right = new BSPNode(splitX, this.y, this.x + this.w - splitX, this.h);
        } else {
            if (this.h < minSize * 2) return false;
            const splitY = this.y + minSize + Math.floor(Math.random() * (this.h - minSize * 2));
            this.left = new BSPNode(this.x, this.y, this.w, splitY - this.y);
            this.right = new BSPNode(this.x, splitY, this.w, this.y + this.h - splitY);
        }
        
        this.left.split(minRoomSize, maxDepth, currentDepth + 1);
        this.right.split(minRoomSize, maxDepth, currentDepth + 1);
        return true;
    }
    
    // 방 생성 (리프 노드에만)
    createRoom(minRoomSize, roomDensity = 0.8) {
        if (this.isLeaf) {
            if (Math.random() > roomDensity) return null;
            
            const roomW = minRoomSize + Math.floor(Math.random() * Math.min(this.w - minRoomSize - 2, 6));
            const roomH = minRoomSize + Math.floor(Math.random() * Math.min(this.h - minRoomSize - 2, 6));
            const roomX = this.x + 1 + Math.floor(Math.random() * (this.w - roomW - 2));
            const roomY = this.y + 1 + Math.floor(Math.random() * (this.h - roomH - 2));
            
            this.room = new Room(roomX, roomY, roomW, roomH);
            return this.room;
        }
        
        const rooms = [];
        if (this.left) {
            const leftRoom = this.left.createRoom(minRoomSize, roomDensity);
            if (leftRoom) rooms.push(leftRoom);
        }
        if (this.right) {
            const rightRoom = this.right.createRoom(minRoomSize, roomDensity);
            if (rightRoom) rooms.push(rightRoom);
        }
        return rooms;
    }
    
    // 모든 방 수집
    collectRooms() {
        const rooms = [];
        this._collectRoomsRecursive(rooms);
        return rooms;
    }
    
    _collectRoomsRecursive(rooms) {
        if (this.room) rooms.push(this.room);
        if (this.left) this.left._collectRoomsRecursive(rooms);
        if (this.right) this.right._collectRoomsRecursive(rooms);
    }
    
    // 복도 생성 (형제 노드 연결)
    createCorridors() {
        if (this.left && this.right) {
            const leftRooms = this.left.collectRooms();
            const rightRooms = this.right.collectRooms();
            
            if (leftRooms.length > 0 && rightRooms.length > 0) {
                const roomA = leftRooms[Math.floor(Math.random() * leftRooms.length)];
                const roomB = rightRooms[Math.floor(Math.random() * rightRooms.length)];
                
                this.corridor = this._digCorridor(roomA, roomB);
                roomA.connected = true;
                roomB.connected = true;
            }
            
            this.left.createCorridors();
            this.right.createCorridors();
        }
    }
    
    _digCorridor(roomA, roomB) {
        const tiles = [];
        let x = roomA.centerX;
        let y = roomA.centerY;
        
        // L자형 복도
        if (Math.random() > 0.5) {
            // 수평 먼저
            while (x !== roomB.centerX) {
                tiles.push({ x, y });
                x += x < roomB.centerX ? 1 : -1;
            }
            while (y !== roomB.centerY) {
                tiles.push({ x, y });
                y += y < roomB.centerY ? 1 : -1;
            }
        } else {
            // 수직 먼저
            while (y !== roomB.centerY) {
                tiles.push({ x, y });
                y += y < roomB.centerY ? 1 : -1;
            }
            while (x !== roomB.centerX) {
                tiles.push({ x, y });
                x += x < roomB.centerX ? 1 : -1;
            }
        }
        tiles.push({ x, y });
        return tiles;
    }
    
    // 모든 복도 타일 수집
    collectCorridorTiles() {
        const tiles = [];
        this._collectCorridorsRecursive(tiles);
        return tiles;
    }
    
    _collectCorridorsRecursive(tiles) {
        if (this.corridor) {
            tiles.push(...this.corridor);
        }
        if (this.left) this.left._collectCorridorsRecursive(tiles);
        if (this.right) this.right._collectCorridorsRecursive(tiles);
    }
}

// ========== 셀룰러 오토마타 (자연스러운 동굴/바위 지형) ==========
class CellularAutomata {
    constructor(width, height, fillPercent = 0.45) {
        this.width = width;
        this.height = height;
        this.fillPercent = fillPercent;
        this.grid = [];
        this.wallChar = 1;
        this.floorChar = 0;
    }
    
    // 초기 랜덤 맵 생성
    generate() {
        this.grid = [];
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = Math.random() < this.fillPercent ? this.wallChar : this.floorChar;
            }
        }
        return this.grid;
    }
    
    // 셀룰러 오토마타 반복 (벽/바닥 스무딩)
    iterate(iterations = 4) {
        for (let iter = 0; iter < iterations; iter++) {
            const newGrid = [];
            for (let y = 0; y < this.height; y++) {
                newGrid[y] = [];
                for (let x = 0; x < this.width; x++) {
                    const neighbors = this._countWallNeighbors(x, y);
                    // 4-5 법칙: 주변 벽이 5개 이상이면 벽, 아니면 바닥
                    newGrid[y][x] = neighbors >= 5 ? this.wallChar : this.floorChar;
                }
            }
            this.grid = newGrid;
        }
        return this.grid;
    }
    
    _countWallNeighbors(cx, cy) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) {
                    count++; // 경계는 벽으로 처리
                } else if (this.grid[ny][nx] === this.wallChar) {
                    count++;
                }
            }
        }
        return count;
    }
    
    // 특정 영역만 생성 (방 바깥쪽 배경 지형용)
    generateRegion(startX, startY, regionW, regionH, fillPercent = 0.4) {
        const region = [];
        for (let y = 0; y < regionH; y++) {
            region[y] = [];
            for (let x = 0; x < regionW; x++) {
                region[y][x] = Math.random() < fillPercent ? this.wallChar : this.floorChar;
            }
        }
        
        // 스무딩
        for (let iter = 0; iter < 3; iter++) {
            const newRegion = [];
            for (let y = 0; y < regionH; y++) {
                newRegion[y] = [];
                for (let x = 0; x < regionW; x++) {
                    let neighbors = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx < 0 || ny < 0 || nx >= regionW || ny >= regionH || region[ny][nx] === 1) {
                                neighbors++;
                            }
                        }
                    }
                    newRegion[y][x] = neighbors >= 5 ? 1 : 0;
                }
            }
            region.length = 0;
            region.push(...newRegion);
        }
        
        return region;
    }
}

// ========== 던전 생성기 (BSP + CA 통합) ==========
class DungeonGenerator {
    constructor(options = {}) {
        this.options = {
            worldWidth: options.worldWidth || 1800,
            worldHeight: options.worldHeight || 1800,
            minRoomSize: options.minRoomSize || 8,
            maxDepth: options.maxDepth || 5,
            roomDensity: options.roomDensity || 0.75,
            caFillPercent: options.caFillPercent || 0.42,
            caIterations: options.caIterations || 4,
            extraCorridorChance: options.extraCorridorChance || 0.3,
            margin: options.margin || 10
        };
        
        this.rooms = [];
        this.corridorTiles = [];
        this.obstacles = [];
        this.wallDecorations = [];
        this.bspTree = null;
        this.caGrid = null;
    }
    
    // 전체 던전 생성
    generate() {
        const opts = this.options;
        
        // 1. BSP로 방과 복도 생성
        this.bspTree = new BSPNode(
            opts.margin, opts.margin,
            opts.worldWidth - opts.margin * 2,
            opts.worldHeight - opts.margin * 2
        );
        this.bspTree.split(opts.minRoomSize, opts.maxDepth);
        this.bspTree.createRoom(opts.minRoomSize, opts.roomDensity);
        this.bspTree.createCorridors();
        
        this.rooms = this.bspTree.collectRooms();
        this.corridorTiles = this.bspTree.collectCorridorTiles();
        
        // 방 타입 할당
        this._assignRoomTypes();
        
        // 2. 셀룰러 오토마타로 자연 지형 생성 (방/복도 외부)
        this._generateNaturalTerrain();
        
        // 3. 장애물 배치
        this._placeObstacles();
        
        // 4. 추가 연결 복도 (일부 방들 추가 연결)
        this._addExtraCorridors();
        
        return {
            rooms: this.rooms,
            obstacles: this.obstacles,
            corridorTiles: this.corridorTiles,
            wallDecorations: this.wallDecorations
        };
    }
    
    // 방 타입 할당
    _assignRoomTypes() {
        if (this.rooms.length === 0) return;
        
        // 시작 방 (첫 번째 방)
        this.rooms[0].type = 'start';
        
        // 보스 방 (가장 먼 방)
        let farthestRoom = this.rooms[0];
        let maxDist = 0;
        for (let room of this.rooms) {
            const dist = Math.hypot(
                room.centerX - this.rooms[0].centerX,
                room.centerY - this.rooms[0].centerY
            );
            if (dist > maxDist) {
                maxDist = dist;
                farthestRoom = room;
            }
        }
        farthestRoom.type = 'boss';
        
        // 보물 방 (중간 크기 방 중 랜덤)
        const mediumRooms = this.rooms.filter(r => 
            r.type === 'normal' && r.w * r.h > 50 && r.w * r.h < 120
        );
        if (mediumRooms.length > 0) {
            const treasureRoom = mediumRooms[Math.floor(Math.random() * mediumRooms.length)];
            treasureRoom.type = 'treasure';
        }
        
        // 비밀 방 (보스 방 근처)
        if (farthestRoom && this.rooms.length > 3) {
            const candidates = this.rooms.filter(r => 
                r !== farthestRoom && 
                Math.hypot(r.centerX - farthestRoom.centerX, r.centerY - farthestRoom.centerY) < 200
            );
            if (candidates.length > 0) {
                candidates[0].type = 'secret';
            }
        }
    }
    
    // 셀룰러 오토마타로 자연 지형 생성
    _generateNaturalTerrain() {
        const opts = this.options;
        
        // 전체 맵을 CA로 생성
        const ca = new CellularAutomata(
            Math.floor(opts.worldWidth / 4),  // 셀 크기 4x4
            Math.floor(opts.worldHeight / 4),
            opts.caFillPercent
        );
        ca.generate();
        ca.iterate(opts.caIterations);
        this.caGrid = ca.grid;
        
        // 방/복도 영역은 CA에서 제외 (바닥으로 덮기)
        this._carveRoomsFromCA();
    }
    
    _carveRoomsFromCA() {
        const cellSize = 4;
        const gridW = Math.floor(this.options.worldWidth / cellSize);
        const gridH = Math.floor(this.options.worldHeight / cellSize);
        
        // 방 내부 타일을 CA 그리드에서 제거
        for (let room of this.rooms) {
            const startCX = Math.floor(room.x / cellSize);
            const startCY = Math.floor(room.y / cellSize);
            const endCX = Math.floor((room.x + room.w) / cellSize);
            const endCY = Math.floor((room.y + room.h) / cellSize);
            
            for (let cy = startCY; cy <= endCY; cy++) {
                for (let cx = startCX; cx <= endCX; cx++) {
                    if (cy >= 0 && cy < gridH && cx >= 0 && cx < gridW) {
                        this.caGrid[cy][cx] = 0; // 바닥으로
                    }
                }
            }
        }
        
        // 복도 타일도 제거
        for (let tile of this.corridorTiles) {
            const cx = Math.floor(tile.x / cellSize);
            const cy = Math.floor(tile.y / cellSize);
            if (cy >= 0 && cy < gridH && cx >= 0 && cx < gridW) {
                this.caGrid[cy][cx] = 0;
                // 복도 주변 1칸도 바닥으로 (복도 너비 확보)
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = cx + dx;
                        const ny = cy + dy;
                        if (ny >= 0 && ny < gridH && nx >= 0 && nx < gridW) {
                            if (Math.random() < 0.6) {
                                this.caGrid[ny][nx] = 0;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 장애물 배치
    _placeObstacles() {
        const cellSize = 4;
        const gridW = Math.floor(this.options.worldWidth / cellSize);
        const gridH = Math.floor(this.options.worldHeight / cellSize);
        
        this.obstacles = [];
        
        // CA 그리드 기반 장애물 생성
        for (let cy = 0; cy < gridH; cy++) {
            for (let cx = 0; cx < gridW; cx++) {
                if (this.caGrid[cy][cx] === 1) {
                    const worldX = cx * cellSize;
                    const worldY = cy * cellSize;
                    
                    // 방/복도와 겹치지 않는지 확인
                    let overlapsRoom = false;
                    for (let room of this.rooms) {
                        if (room.contains(worldX + cellSize/2, worldY + cellSize/2, -2)) {
                            overlapsRoom = true;
                            break;
                        }
                    }
                    
                    if (!overlapsRoom) {
                        const type = Math.random() > 0.4 ? 'rock' : 'crystal';
                        this.obstacles.push({
                            x: worldX,
                            y: worldY,
                            w: cellSize - 1,
                            h: cellSize - 1,
                            type: type
                        });
                    }
                }
            }
        }
        
        // 방 내부 장식용 장애물 (기둥, 책장 등)
        for (let room of this.rooms) {
            if (room.type === 'normal' || room.type === 'treasure') {
                const pillarCount = Math.floor(room.w * room.h / 80);
                for (let i = 0; i < pillarCount; i++) {
                    const pos = room.randomPosition(2);
                    // 방 중앙은 비우기
                    if (Math.abs(pos.x - room.centerX) > 3 || Math.abs(pos.y - room.centerY) > 3) {
                        this.obstacles.push({
                            x: pos.x,
                            y: pos.y,
                            w: 3,
                            h: 3,
                            type: 'pillar'
                        });
                        this.wallDecorations.push({
                            x: pos.x,
                            y: pos.y,
                            type: 'pillar',
                            roomType: room.type
                        });
                    }
                }
            }
            
            // 보스 방 장식
            if (room.type === 'boss') {
                // 중앙 제단
                this.wallDecorations.push({
                    x: room.centerX - 4,
                    y: room.centerY - 4,
                    type: 'boss_altar',
                    roomType: 'boss'
                });
                // 기둥
                const corners = [
                    { x: room.x + 3, y: room.y + 3 },
                    { x: room.x + room.w - 5, y: room.y + 3 },
                    { x: room.x + 3, y: room.y + room.h - 5 },
                    { x: room.x + room.w - 5, y: room.y + room.h - 5 }
                ];
                for (let corner of corners) {
                    this.wallDecorations.push({
                        x: corner.x,
                        y: corner.y,
                        type: 'boss_pillar',
                        roomType: 'boss'
                    });
                }
            }
        }
    }
    
    // 추가 연결 복도
    _addExtraCorridors() {
        if (this.rooms.length < 3) return;
        
        const extraCount = Math.floor(this.rooms.length * this.options.extraCorridorChance);
        
        for (let i = 0; i < extraCount; i++) {
            const roomA = this.rooms[Math.floor(Math.random() * this.rooms.length)];
            const roomB = this.rooms[Math.floor(Math.random() * this.rooms.length)];
            
            if (roomA === roomB) continue;
            
            const dist = Math.hypot(roomA.centerX - roomB.centerX, roomA.centerY - roomB.centerY);
            if (dist < 300 && dist > 50) {
                const tiles = this._digSimpleCorridor(roomA, roomB);
                this.corridorTiles.push(...tiles);
            }
        }
    }
    
    _digSimpleCorridor(roomA, roomB) {
        const tiles = [];
        let x = roomA.centerX;
        let y = roomA.centerY;
        
        if (Math.random() > 0.5) {
            while (x !== roomB.centerX) {
                tiles.push({ x, y });
                x += x < roomB.centerX ? 1 : -1;
            }
            while (y !== roomB.centerY) {
                tiles.push({ x, y });
                y += y < roomB.centerY ? 1 : -1;
            }
        } else {
            while (y !== roomB.centerY) {
                tiles.push({ x, y });
                y += y < roomB.centerY ? 1 : -1;
            }
            while (x !== roomB.centerX) {
                tiles.push({ x, y });
                x += x < roomB.centerX ? 1 : -1;
            }
        }
        return tiles;
    }
    
    // 디버그용 미니맵 데이터
    getMinimapData() {
        const scale = 8;
        const w = Math.floor(this.options.worldWidth / scale);
        const h = Math.floor(this.options.worldHeight / scale);
        const minimap = [];
        
        for (let y = 0; y < h; y++) {
            minimap[y] = [];
            for (let x = 0; x < w; x++) {
                minimap[y][x] = 0; // 미탐험
            }
        }
        
        // 방 표시
        for (let room of this.rooms) {
            const rx = Math.floor(room.x / scale);
            const ry = Math.floor(room.y / scale);
            const rw = Math.floor(room.w / scale);
            const rh = Math.floor(room.h / scale);
            for (let y = ry; y < ry + rh && y < h; y++) {
                for (let x = rx; x < rx + rw && x < w; x++) {
                    minimap[y][x] = room.connected ? 2 : 1;
                }
            }
        }
        
        // 복도 표시
        for (let tile of this.corridorTiles) {
            const mx = Math.floor(tile.x / scale);
            const my = Math.floor(tile.y / scale);
            if (my >= 0 && my < h && mx >= 0 && mx < w) {
                minimap[my][mx] = 2;
            }
        }
        
        return minimap;
    }
}

// ========== 던전 생성 함수 (기존 spawnObstacles 대체) ==========
function generateDungeon(worldWidth, worldHeight, floorNum) {
    const generator = new DungeonGenerator({
        worldWidth: worldWidth,
        worldHeight: worldHeight,
        minRoomSize: 8 + Math.floor(floorNum / 3),  // 층이 깊을수록 방이 약간 커짐
        maxDepth: 4 + Math.floor(Math.random() * 2), // 4~5
        roomDensity: 0.7 + Math.random() * 0.2,      // 0.7~0.9
        caFillPercent: 0.4 + Math.random() * 0.1,    // 0.4~0.5
        caIterations: 3 + Math.floor(Math.random() * 2), // 3~4
        extraCorridorChance: 0.2 + Math.random() * 0.2,  // 0.2~0.4
        margin: 12
    });
    
    return generator.generate();
}

// ========== 던전 기반 장애물 생성 (items.js의 spawnObstacles 대체) ==========
function spawnObstaclesFromDungeon(entities, dungeonData) {
    // BSP+CA 기반 장애물
    entities.obstacles = dungeonData.obstacles || [];
    
    // 벽 장식 저장 (렌더링용)
    entities.wallDecorations = dungeonData.wallDecorations || [];
    entities.rooms = dungeonData.rooms || [];
    entities.corridorTiles = dungeonData.corridorTiles || [];
}

// ========== 방 정보 기반 오브젝트/적 배치 ==========
function getRoomForPosition(x, y, rooms) {
    for (let room of rooms) {
        if (room.contains(x, y, -1)) return room;
    }
    return null;
}

function getSpawnPositionForRoom(room, margin = 2) {
    return room.randomPosition(margin);
}

// ========== 던전 벽 장식 렌더링 ==========
function renderDungeonDecorations(ctx, engine, wallDecorations) {
    if (!wallDecorations) return;
    
    for (let deco of wallDecorations) {
        const screen = engine.worldToScreen(deco.x, deco.y);
        if (screen.x + 10 > 0 && screen.x < engine.width && 
            screen.y + 10 > 0 && screen.y < engine.height) {
            
            switch(deco.type) {
                case 'pillar':
                    ctx.fillStyle = '#6a5a7a';
                    ctx.fillRect(screen.x, screen.y, 8, 8);
                    ctx.fillStyle = '#8a7a9a';
                    ctx.fillRect(screen.x + 1, screen.y + 1, 6, 6);
                    break;
                    
                case 'boss_pillar':
                    ctx.fillStyle = '#4a3a5a';
                    ctx.fillRect(screen.x - 1, screen.y - 1, 10, 10);
                    ctx.fillStyle = '#6a5a8a';
                    ctx.fillRect(screen.x, screen.y, 8, 12);
                    ctx.fillStyle = '#ff4444';
                    ctx.fillRect(screen.x + 2, screen.y + 2, 4, 4);
                    break;
                    
                case 'boss_altar':
                    ctx.fillStyle = '#3a2a4a';
                    ctx.fillRect(screen.x - 2, screen.y - 2, 16, 16);
                    ctx.fillStyle = '#5a3a6a';
                    ctx.fillRect(screen.x, screen.y, 12, 12);
                    ctx.fillStyle = '#ffaa44';
                    ctx.font = '12px monospace';
                    ctx.fillText('👑', screen.x + 1, screen.y + 10);
                    break;
            }
        }
    }
}

// ========== 복도 바닥 타일 렌더링 (선택적) ==========
function renderCorridorFloors(ctx, engine, corridorTiles) {
    if (!corridorTiles) return;
    
    ctx.fillStyle = '#2a1a3a';
    for (let tile of corridorTiles) {
        const screen = engine.worldToScreen(tile.x, tile.y);
        if (screen.x >= 0 && screen.x < engine.width && screen.y >= 0 && screen.y < engine.height) {
            ctx.fillRect(screen.x, screen.y, 2, 2);
        }
    }
}

// ========== 방 영역 표시 (디버그/미니맵용) ==========
function renderRoomOverlay(ctx, engine, rooms) {
    if (!rooms) return;
    
    for (let room of rooms) {
        const screen = engine.worldToScreen(room.x, room.y);
        if (screen.x + room.w > 0 && screen.x < engine.width && 
            screen.y + room.h > 0 && screen.y < engine.height) {
            
            // 방 타입별 테두리 색상
            let borderColor;
            switch(room.type) {
                case 'start': borderColor = 'rgba(100, 255, 100, 0.3)'; break;
                case 'boss': borderColor = 'rgba(255, 50, 50, 0.4)'; break;
                case 'treasure': borderColor = 'rgba(255, 200, 50, 0.3)'; break;
                case 'secret': borderColor = 'rgba(200, 100, 255, 0.3)'; break;
                default: borderColor = 'rgba(100, 100, 255, 0.1)';
            }
            
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(screen.x, screen.y, room.w, room.h);
        }
    }
}