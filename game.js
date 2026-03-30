// ==========================================
// i18n (ÇEVİRİ VE DİL MOTORU) - JSON FETCH
// ==========================================
let i18n = {}; // JSON'dan dolacak boş obje
let currentLang = localStorage.getItem('blockmania_lang') || 'tr';
let isDictLoaded = false;

// 1. JSON dosyasını asenkron olarak çek
fetch('dictionary.json')
    .then(response => {
        if (!response.ok) throw new Error("Ağ hatası: JSON bulunamadı.");
        return response.json();
    })
    .then(data => {
        i18n = data;
        isDictLoaded = true;
        applyTranslations(); // Yüklendiği an ekrandaki etiketleri hemen çevir
    })
    .catch(err => {
        console.error("Sözlük yüklenemedi! Projeyi Live Server ile çalıştırdığından emin ol.", err);
    });

// 2. Çeviri Fonksiyonu (JSON yüklenene kadar anahtarları gösterir)
function t(key) {
    if (!isDictLoaded) return key; 
    return i18n[currentLang] && i18n[currentLang][key] ? i18n[currentLang][key] : key;
}

// 3. Ekrana Basma Motoru
function applyTranslations() {
    if (!isDictLoaded) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        let key = el.getAttribute('data-i18n');
        el.innerText = t(key);
    });
}

// 4. Dil Değiştirme Tetikleyicisi
window.toggleLanguage = function() {
    if (!isDictLoaded) return;
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    localStorage.setItem('blockmania_lang', currentLang);
    applyTranslations();
    
    // Vitrini güncelle
    if (typeof window.startCarousel === 'function' && typeof isGameRunning !== 'undefined' && !isGameRunning) {
        window.startCarousel();
    }
};
// ==========================================

// AYARLAR DEĞİŞKENİ HEMEN ALTINDA KALMAYA DEVAM ETMELİ:
let userSettings = JSON.parse(localStorage.getItem('blockmania_settings')) || {
    volume: 100,
    motionEnabled: true,
    fixedThemeColor: null
};

const boardSize = 9;
let boardState = [];
let score = 0
  , rawScore = 0
  , combo = 1;
let currentPiecesData = [];
let gameThemeColor = '';
let isGameOverSequence = false;
let dragInfo = {
    index: -1,
    shape: null,
    color: null,
    startX: 0,
    startY: 0,
    currentOrigin: null,
    hasSpecial: false,
    specialType: null,
    specialPos: null,
    hasKey: false,
    keyPos: null
};
let playerKeys = 0;
let activeMultiplier = {
    active: false,
    turns: 0
};
let playerJokers = [];
let historyState = null;
let activeJokerMode = null;
let activeJokerIndex = -1;
let hammerLockedPos = null;
let oneByOneLockedPos = null;
let pendingJokerDrag = null;
let jokerDragInfo = null;
let jokerPressIsLong = false;
let activeAnimations = 0;
let bgTimeout = null;
let totalTurns = 0;
let specialBlockStates = {};
let gameState = {
    baseBlockScore: 10,
    lifeTurns: 0,
    chestOddsLevel: 0,
    cursedKeyActive: false
};
let deathWave = {
    active: false,
    counter: 0,
    shapeDef: null,
    nextEligibleScore: 20000,
    inDeathTurn: false
};

let stats = {
    maxPointsInMove: 0,
    maxCombo: 0,
    deathWavesSurvived: 0,
    chestsOpened: 0,
    megaChestsOpened: 0,
    maxBaseScore: 10,
    maxBlocksInMove: 0,
    hammersUsed: 0,
    maxPenalty: 0,
    invalidPlacements: 0,
    cursedBlocksNeutralized: 0
};
let turnClearedBlocks = 0;
let turnPoints = 0;
let topScores = [];
const STORAGE_KEY = 'blockudoku_save_vFinal';
const SCORES_KEY = 'blockudoku_scores_vFinal';
let currentSlide = 0;
let touchStartX = 0;
let touchEndX = 0;

let idleInterval = null;
let isGameRunning = false;
let draggingElement = null;
const boardEl = document.getElementById('board');
const infoBtnEl = document.getElementById('info-btn-el');
const oddsTooltipBox = document.getElementById('odds-tooltip-box');

// 15 SANİYEDE BİR DEĞİŞEN ÜST SKOR ALANI
let showRawHighScore = false;
setInterval( () => {
    const hsValTop = document.getElementById('hs-val-top');
    const hsLabelTop = document.getElementById('hs-label-top');
    if (!hsValTop || topScores.length === 0)
        return;

    showRawHighScore = !showRawHighScore;
    const altContainer = document.getElementById('high-score-alternator');
    altContainer.style.opacity = 0;

    setTimeout( () => {
        if (showRawHighScore) {
            hsLabelTop.innerText = t("high_raw") + ": ";
            hsValTop.innerText = topScores[0].rawScore || 0;
            hsValTop.style.color = "#3498db";
        } else {
            hsLabelTop.innerText = t("high_score") + ": ";
            hsValTop.innerText = formatScore(topScores[0].score);
            hsValTop.style.color = "#2ecc71";
        }
        altContainer.style.opacity = 1;
    }
    , 500);
}
, 15000);

if (infoBtnEl && oddsTooltipBox) {
    // 1. Sadece fare ile üzerine gelince (PC)
    infoBtnEl.addEventListener('mouseenter', () => {
        oddsTooltipBox.classList.add('show');
        infoBtnEl.classList.remove('upgrade-notification');
    });
    infoBtnEl.addEventListener('mouseleave', () => {
        oddsTooltipBox.classList.remove('show');
    });

    // 2. Sadece dokunma/tıklama ile (Mobil)
    infoBtnEl.addEventListener('click', (e) => {
        e.preventDefault();
        oddsTooltipBox.classList.toggle('show');
        infoBtnEl.classList.remove('upgrade-notification');
    });

    // 3. Dışarı tıklayınca kapatma
    document.addEventListener('click', (e) => {
        if (!infoBtnEl.contains(e.target) && !oddsTooltipBox.contains(e.target)) {
            oddsTooltipBox.classList.remove('show');
        }
    });
}
let tooltipTimer = null;
let activeTooltipCell = null;

function clearTooltip() {
    if (tooltipTimer)
        clearTimeout(tooltipTimer);
    if (activeTooltipCell) {
        activeTooltipCell.classList.remove('show-tooltip');
        activeTooltipCell = null;
    }
}

function loadScores() {
    let s = localStorage.getItem(SCORES_KEY);
    if (s) {
        topScores = JSON.parse(s);
    }
}
function saveCurrentToHighScores() {
    topScores.push({
        score: score,
        rawScore: rawScore,
        date: new Date().toLocaleDateString('tr-TR')
    });
    topScores.sort( (a, b) => b.score - a.score);
    if (topScores.length > 50)
        topScores = topScores.slice(0, 50);
    localStorage.setItem(SCORES_KEY, JSON.stringify(topScores));
}
function saveGameState() {
    if (!isGameRunning || isGameOverSequence)
        return;
    let state = {
        boardState,
        score,
        rawScore,
        combo,
        currentPiecesData,
        playerKeys,
        activeMultiplier,
        playerJokers,
        historyState,
        activeJokerMode,
        hammerLockedPos,
        oneByOneLockedPos,
        totalTurns,
        specialBlockStates,
        gameState,
        deathWave,
        stats,
        gameThemeColor
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function checkSavedGame() {
    return !!localStorage.getItem(STORAGE_KEY);
}
function loadAndResumeGame() {
    let s = localStorage.getItem(STORAGE_KEY);
    if (s) {
        let parsed = JSON.parse(s);
        boardState = parsed.boardState;
        score = parsed.score;
        rawScore = parsed.rawScore || 0;
        combo = parsed.combo;
        currentPiecesData = parsed.currentPiecesData;
        playerKeys = parsed.playerKeys;
        activeMultiplier = parsed.activeMultiplier;
        playerJokers = parsed.playerJokers;
        historyState = parsed.historyState;
        activeJokerMode = parsed.activeJokerMode;
        hammerLockedPos = parsed.hammerLockedPos;
        oneByOneLockedPos = parsed.oneByOneLockedPos;
        totalTurns = parsed.totalTurns;
        specialBlockStates = parsed.specialBlockStates;
        gameState = parsed.gameState;
        deathWave = parsed.deathWave;
        stats = parsed.stats;
        gameThemeColor = parsed.gameThemeColor;

        endDeathWave();
        document.getElementById('base-score-val').innerText = gameState.baseBlockScore;
        document.getElementById('score').innerText = formatScore(score);
        if (deathWave.active) {
            document.getElementById('normal-header-ui').style.display = 'none';
            document.getElementById('death-header-ui').style.display = 'flex';
            updateDeathWaveUI();
            if (deathWave.inDeathTurn)
                document.body.classList.add('death-mode');
            else
                document.body.classList.add('death-warning-mode');
        }
        updateOddsUI();
        updateComboUI();
        updateChestUI();
        updateJokerUI();
        updateMultUI();
        updateBoardVisually();
        renderPieces();
        updateTrayPiecesState();
        return true;
    }
    return false;
}

function finalizeTurn() {
    if (activeAnimations <= 0) {
        activeAnimations = 0;
        if (turnPoints > stats.maxPointsInMove)
            stats.maxPointsInMove = turnPoints;
        if (turnClearedBlocks > stats.maxBlocksInMove)
            stats.maxBlocksInMove = turnClearedBlocks;
        turnPoints = 0;
        turnClearedBlocks = 0;
        updateTrayPiecesState();
        if (isGameRunning && !isGameOverSequence)
            saveGameState();
        checkGameOver();
    }
}

// OYUN DURUMLARI (UI Geçişleri)
function setGameState(state) {
    document.getElementById('start-header-ui').style.display = state === 'START' ? 'flex' : 'none';
    document.getElementById('normal-header-ui').style.display = (state === 'PLAYING' || state === 'GAMEOVER') ? 'flex' : 'none';
    document.getElementById('death-header-ui').style.display = 'none';
    document.getElementById('gameover-btn-group').style.display = state === 'GAMEOVER' ? 'flex' : 'none';

    const interactiveStart = document.getElementById('interactive-start-area');
    const piecesContainer = document.getElementById('pieces-container');
    const menuActionArea = document.getElementById('menu-action-area');

    if (state === 'START') {
        // İLK YÜKLEMEDE: Sadece sürükle-bırak bloğu görünsün!
        interactiveStart.style.display = 'flex'; 
        piecesContainer.style.display = 'none'; 
    } 
    else if (state === 'PLAYING') {
        // OYUN SIRASINDA: Bloklar gelsin, butonlar gizlensin
        interactiveStart.style.display = 'none';
        piecesContainer.style.display = 'flex';
        if(menuActionArea) menuActionArea.style.display = 'none'; 
        for (let i = 0; i < 3; i++) {
            let pw = document.getElementById(`pw-${i}`);
            if(pw) {
                pw.style.display = 'flex';
                pw.style.visibility = 'visible';
            }
        }
    } 
    else if (state === 'GAMEOVER') {
        interactiveStart.style.display = 'none';
        piecesContainer.style.display = 'none'; 
    }

    const header = document.getElementById('main-header');
    if (state === 'PLAYING' || state === 'GAMEOVER') {
        setTimeout(() => header.classList.add('game-active'), 50);
    } else {
        header.classList.remove('game-active');
    }
}

function startIdleAnimation() {
    isGameRunning = false;
    document.getElementById('board').style.filter = "none";
    initBoardUI();
    if (idleInterval)
        clearInterval(idleInterval);
    idleInterval = setInterval( () => {
        if (isGameRunning)
            return;
        const shape = ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)];
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        let rLen = shape.length
          , cLen = shape[0].length;
        let startR = Math.floor(Math.random() * (10 - rLen));
        let startC = Math.floor(Math.random() * (10 - cLen));
        let cells = [];
        for (let i = 0; i < rLen; i++)
            for (let j = 0; j < cLen; j++)
                if (shape[i][j]) {
                    let cell = boardEl.children[(startR + i) * 9 + (startC + j)];
                    if (cell && !cell.classList.contains('filled'))
                        cells.push(cell);
                }
        cells.forEach(c => {
            c.style.transition = "background-color 0.4s ease, transform 0.4s ease";
            c.style.backgroundColor = color;
            c.style.transform = "scale(0.85)";
        }
        );
        setTimeout( () => {
            if (!isGameRunning)
                cells.forEach(c => {
                    c.style.backgroundColor = "";
                    c.style.transform = "scale(1)";
                }
                );
        }
        , 800);
    }
    , 600);
}

// YENİ: SÜRÜKLE BIRAK İLE BAŞLAMA MANTIĞI
const startDragWrapper = document.getElementById('start-drag-wrapper');
let isStartDragging = false;
let startDragInfo = {
    startX: 0,
    startY: 0
};

startDragWrapper.addEventListener('pointerdown', (e) => {
    if (isGameRunning)
        return;
    isStartDragging = true;
    clearInterval(idleInterval);
    startDragWrapper.classList.add('dragging');
    const rect = startDragWrapper.getBoundingClientRect();
    startDragInfo = {
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2
    };
    drawStartHoleBoard();
}
);

function drawStartHoleBoard() {
    Array.from(boardEl.children).forEach(c => {
        c.className = 'cell';
        c.style.backgroundColor = '';
        c.innerHTML = '';
        let r = parseInt(c.dataset.r)
          , col = parseInt(c.dataset.c);
        let isHole = (r === 4 && col === 4) || (r === 3 && col === 4) || (r === 5 && col === 4) || (r === 4 && col === 3) || (r === 4 && col === 5);
        if (!isHole) {
            c.style.backgroundColor = '#ecf0f1';
            c.classList.add('filled');
        } else {
            c.classList.add('hover-valid');
        }
    }
    );
}

document.addEventListener('pointermove', (e) => {
    if (isStartDragging) {
        const bRect = boardEl.getBoundingClientRect();
        
        // KUSURSUZ ÖLÇEK MATEMATİĞİ: 
        // Board'daki gerçek bir hücrenin o anki pikselini okuyoruz.
        const targetCell = boardEl.children[0];
        const targetCellWidth = targetCell ? targetCell.offsetWidth : (bRect.width / 9);
        
        // Başlangıç bloğunun CSS'teki boyutu 25px'tir. Gerçek hücreyi 25'e bölersek altın oranı buluruz.
        const scaleRatio = targetCellWidth / 25; 
        
        const isTouch = e.pointerType === 'touch' || window.innerWidth <= 768;
        const yOffset = isTouch ? -50 : 0; // Taşmayı önlemek için -60 yerine -50 yaptık
        
        const dx = e.clientX - startDragInfo.startX;
        const dy = e.clientY - startDragInfo.startY + yOffset;
      
        startDragWrapper.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleRatio.toFixed(2)})`;
    }
});

document.addEventListener('pointerup', (e) => {
    if (isStartDragging) {
        isStartDragging = false;
        startDragWrapper.classList.remove('dragging');
        const bRect = boardEl.getBoundingClientRect();
        const centerX = bRect.left + bRect.width / 2;
        const centerY = bRect.top + bRect.height / 2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        if (dist < 70) {
            startDragWrapper.style.visibility = 'hidden';
            handleStartDrop();
        } else {
            startDragWrapper.style.transform = 'translate(0px, 0px) scale(1)';
            startIdleAnimation();
        }
    }
}
);

function handleStartDrop() {
    Array.from(boardEl.children).forEach(c => {
        c.classList.remove('hover-valid');
        let r = parseInt(c.dataset.r)
          , col = parseInt(c.dataset.c);
        let isHole = (r === 4 && col === 4) || (r === 3 && col === 4) || (r === 5 && col === 4) || (r === 4 && col === 3) || (r === 4 && col === 5);
        if (isHole) {
            c.style.backgroundColor = '#2ecc71';
            c.classList.add('filled');
        }
    }
    );
    setTimeout( () => {
        document.getElementById('interactive-start-area').style.display = 'none';
        Array.from(boardEl.children).forEach( (c) => {
            c.className = `cell ${(Math.floor(c.dataset.r / 3) + Math.floor(c.dataset.c / 3)) % 2 === 1 ? 'nth-region' : ''}`;
            setTimeout( () => {
                c.classList.add('grid-crazy-anim');
            }
            , Math.random() * 300);
        }
        );
setTimeout(() => { 
    Array.from(boardEl.children).forEach(c => c.classList.remove('grid-crazy-anim')); 
    // Sürükleme bitti, dalgalanma bitti. ŞİMDİ YENİ MENÜYÜ UYANDIR!
    if (typeof showMainMenuOnGrid === "function") {
        showMainMenuOnGrid();
    }
}, 900);
    }
    , 300);
}


// TERTEMİZ BAŞLANGIÇ EKRANI (Sayfa ilk yüklendiğinde ve Ana Menüde çalışır)
function initInteractiveStart() {
    isGameOverSequence = false;

    // Animasyonlu merkezi skoru gizle, normal oyun öğelerini geri getir
    if(document.getElementById('final-score-centered-display')) {
        document.getElementById('final-score-centered-display').style.display = 'none';
        document.getElementById('final-score-centered-display').style.animation = 'none';
    }
    if(document.getElementById('normal-game-elements-left')) {
        document.getElementById('normal-game-elements-left').style.opacity = '1';
    }
    if(document.getElementById('normal-game-extras-right')) {
        document.getElementById('normal-game-extras-right').style.display = 'flex';
    }

    document.getElementById('board').style.filter = "none";
    document.getElementById('board-stats-overlay').classList.remove('show');
    document.getElementById('in-board-stats-content').classList.remove('show');

    if (document.getElementById('close-stats-btn')) {
        document.getElementById('close-stats-btn').style.display = 'none';
    }

    startDragWrapper.style.visibility = 'visible';
    startDragWrapper.style.transform = 'translate(0px, 0px) scale(1)';

    if (document.getElementById('start-drag-wrapper').parentElement) {
        document.getElementById('start-drag-wrapper').parentElement.style.display = 'flex';
    }

    setGameState('START');
    startIdleAnimation();
}

// YENİ: TEKRAR OYNA BUTONUNA BASILINCA DİREKT OYUNA GİREN SİSTEM
window.playAgainDirectly = function() {
    isGameOverSequence = false;
    isGameRunning = false;

    // 1. Oyun sonu UI ekranlarını kapat
    document.getElementById('gameover-btn-group').style.display = 'none';
    document.getElementById('board-stats-overlay').classList.remove('show');
    document.getElementById('in-board-stats-content').classList.remove('show');
    document.getElementById('board').style.filter = "none";

    // 2. Animasyonlu devasa skoru gizle, normal oyun içi barları geri getir
    if(document.getElementById('final-score-centered-display')) {
        document.getElementById('final-score-centered-display').style.display = 'none';
        document.getElementById('final-score-centered-display').style.animation = 'none';
    }
    if(document.getElementById('normal-game-elements-left')) {
        document.getElementById('normal-game-elements-left').style.opacity = '1';
    }
    if(document.getElementById('normal-game-extras-right')) {
        document.getElementById('normal-game-extras-right').style.display = 'flex';
    }

    // 3. Tahtayı tamamen temizle
    const boardEl = document.getElementById('board');
    if(boardEl) {
        Array.from(boardEl.children).forEach(cell => {
            cell.className = 'cell'; 
            cell.innerHTML = ''; 
            cell.style.backgroundColor = '';
        });
    }

    // 4. Beklemeden direkt oyunu başlat!
    setGameState('PLAYING');
    startGame();
};

window.onload = () => {
    loadScores();
    initInteractiveStart();
    if (topScores.length > 0) {
        let hsValEl = document.getElementById('hs-val');
        if (hsValEl)
            hsValEl.innerText = formatScore(topScores[0].score);
    }
}
;

document.addEventListener('pointerdown', (e) => {
    if (!isGameRunning || isGameOverSequence)
        return;
    let cell = e.target.closest('.cell') || e.target.closest('.piece-cell');
    let jokerSlot = e.target.closest('.joker-slot');
    if (cell && cell.querySelector('.special-tooltip')) {
        tooltipTimer = setTimeout( () => {
            cell.classList.add('show-tooltip');
            activeTooltipCell = cell;
        }
        , 300);
    }
    if (jokerSlot && jokerSlot.classList.contains('has-item')) {
        let idx = parseInt(jokerSlot.id.replace('jk-', ''));
        jokerPressIsLong = false;
        tooltipTimer = setTimeout( () => {
            jokerSlot.classList.add('show-tooltip');
            activeTooltipCell = jokerSlot;
            jokerPressIsLong = true;
        }
        , 300);
        pendingJokerDrag = {
            index: idx,
            data: playerJokers[idx],
            startX: e.clientX,
            startY: e.clientY
        };
    }
}
);

document.addEventListener('pointerup', (e) => {
    clearTooltip();
    if (draggingElement) {
        let placed = false;
        if (dragInfo.currentOrigin) {
            const {r, c} = dragInfo.currentOrigin;
            if (canPlace(boardState, dragInfo.shape, r, c)) {
                saveHistory();
                placePiece(dragInfo.shape, r, c, dragInfo.color, dragInfo.hasSpecial, dragInfo.specialType, dragInfo.specialPos, dragInfo.hasKey, dragInfo.keyPos);
                currentPiecesData[dragInfo.index].used = true;
                placed = true;
                turnClearedBlocks = 0;
                turnPoints = 0;
                checkBoardLogic();
                updateTrayPiecesState();
                if (currentPiecesData.every(p => p.used)) {
                    setTimeout( () => {
                        generatePieces();
                    }
                    , 300);
                } else {
                    finalizeTurn();
                }
            }
        }
        draggingElement.classList.remove('dragging');
        if (!placed) {
            draggingElement.style.transform = 'translate(0px, 0px) scale(1)';
            if (dragInfo.currentOrigin)
                stats.invalidPlacements++;
        } else
            draggingElement.style.visibility = 'hidden';
        draggingElement = null;
        clearGhost();
        return;
    }
    if (pendingJokerDrag) {
        let idx = pendingJokerDrag.index;
        pendingJokerDrag = null;
        if (!jokerPressIsLong && !jokerDragInfo) {
            activateJoker(idx);
        }
    }
    if (jokerDragInfo) {
        const bRect = boardEl.getBoundingClientRect();
        if (e.clientX >= bRect.left && e.clientX <= bRect.right && e.clientY >= bRect.top && e.clientY <= bRect.bottom) {
            const cW = bRect.width / 9;
            const cH = bRect.height / 9;
            let c = Math.floor((e.clientX - bRect.left) / cW);
            let r = Math.floor((e.clientY - bRect.top) / cH);
            if (r >= 0 && r < 9 && c >= 0 && c < 9) {
                activeJokerIndex = jokerDragInfo.index;
                activeJokerMode = jokerDragInfo.type;
                if (activeJokerMode === 'hammer') {
                    hammerLockedPos = {
                        r,
                        c
                    };
                    clearGhost();
                    for (let i = 0; i < 2; i++)
                        for (let j = 0; j < 2; j++)
                            if (r + i < 9 && c + j < 9)
                                boardEl.children[(r + i) * 9 + (c + j)].classList.add('hover-hammer-locked');
                } else if (activeJokerMode === '1x1') {
                    if (boardState[r][c] === 0) {
                        oneByOneLockedPos = {
                            r,
                            c
                        };
                        clearGhost();
                        let cell = boardEl.children[r * 9 + c];
                        cell.classList.add('hover-1x1-locked');
                        cell.innerHTML = `<img src="icons/random_block.png" style="width:95%; height:95%; object-fit:contain; opacity:0.8; animation: pulse 1s infinite;" class="ghost-random">`;
                    } else {
                        activeJokerMode = null;
                    }
                }
            } else {
                activeJokerMode = null;
            }
        } else {
            activeJokerMode = null;
        }
        if (jokerDragInfo.clone)
            jokerDragInfo.clone.remove();
        jokerDragInfo = null;
        if (!activeJokerMode) {
            updateJokerUI();
            clearGhost();
        }
    }
}
);

document.addEventListener('pointermove', (e) => {
    if (draggingElement) {
        clearTooltip();
        const bRect = boardEl.getBoundingClientRect();
        
        // 1. Hedef Hücre Genişliği ve Yüksekliği
        const cW = bRect.width / 9;
        const cH = bRect.height / 9;
        
        // 2. Mevcut Hücre Genişliği (DOM'dan anlık olarak okunur)
        const firstPieceCell = draggingElement.querySelector('.piece-cell');
        const currentCellWidth = firstPieceCell ? firstPieceCell.offsetWidth : 22; // Oyun içi fallback
        
        // 3. DİNAMİK ORAN
        const scaleRatio = cW / currentCellWidth; 
        
        // Parmak Altı (Fat Finger) UX Koruması
        const isTouch = e.pointerType === 'touch' || window.innerWidth <= 768;
        const yOffset = isTouch ? -60 : 0;
        
        const dx = e.clientX - dragInfo.startX;
        const dy = e.clientY - dragInfo.startY + yOffset;
        
        draggingElement.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleRatio.toFixed(2)})`;
        
        // Alt kısımdaki X,Y hesaplamaları (ghost çizimi vs.) olduğu gibi kalacak...
        const fRect = draggingElement.querySelector('.piece').children[0].getBoundingClientRect();
        const ptX = fRect.left + fRect.width / 2;
        const ptY = fRect.top + fRect.height / 2;
	if (ptX >= bRect.left && ptX <= bRect.right && ptY >= bRect.top && ptY <= bRect.bottom) {
            let originC = Math.floor((ptX - bRect.left) / cW);
            let originR = Math.floor((ptY - bRect.top) / cH);
            if (!dragInfo.currentOrigin || dragInfo.currentOrigin.r !== originR || dragInfo.currentOrigin.c !== originC) {
                dragInfo.currentOrigin = { r: originR, c: originC };
                showGhostAndPredict(originR, originC);
            }
        } else {
            dragInfo.currentOrigin = null;
            clearGhost();
        }
        return;
    }
    if (pendingJokerDrag) {
        let dx = e.clientX - pendingJokerDrag.startX;
        let dy = e.clientY - pendingJokerDrag.startY;
        if (Math.hypot(dx, dy) > 10) {
            let data = pendingJokerDrag.data;
            let idx = pendingJokerDrag.index;
            pendingJokerDrag = null;
            jokerPressIsLong = true;
            if (data.type === 'hammer' || data.type === '1x1') {
                clearTooltip();
                if (!isGameRunning || activeAnimations > 0 || document.body.classList.contains('death-mode'))
                    return;
                let iconSrc = data.type === 'hammer' ? 'icons/hammer_icon.png' : 'icons/random_block.png';
                jokerDragInfo = {
                    index: idx,
                    type: data.type,
                    clone: document.createElement('div')
                };
                jokerDragInfo.clone.innerHTML = `<img src="${iconSrc}" style="width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 10px 20px rgba(0,0,0,0.5));">`;
                jokerDragInfo.clone.style.position = 'absolute';
                jokerDragInfo.clone.style.width = '60px';
                jokerDragInfo.clone.style.height = '60px';
                jokerDragInfo.clone.style.zIndex = '100000';
                jokerDragInfo.clone.style.pointerEvents = 'none';
                document.body.appendChild(jokerDragInfo.clone);
                jokerDragInfo.clone.style.left = (e.clientX - 30) + 'px';
                jokerDragInfo.clone.style.top = (e.clientY - 30) + 'px';
            }
        }
    }
    if (jokerDragInfo) {
        jokerDragInfo.clone.style.left = (e.clientX - 30) + 'px';
        jokerDragInfo.clone.style.top = (e.clientY - 30) + 'px';
        const bRect = boardEl.getBoundingClientRect();
        if (e.clientX >= bRect.left && e.clientX <= bRect.right && e.clientY >= bRect.top && e.clientY <= bRect.bottom) {
            const cW = bRect.width / 9;
            const cH = bRect.height / 9;
            let c = Math.floor((e.clientX - bRect.left) / cW);
            let r = Math.floor((e.clientY - bRect.top) / cH);
            if (r >= 0 && r < 9 && c >= 0 && c < 9) {
                clearGhost();
                if (jokerDragInfo.type === 'hammer') {
                    for (let i = 0; i < 2; i++)
                        for (let j = 0; j < 2; j++)
                            if (r + i < 9 && c + j < 9)
                                boardEl.children[(r + i) * 9 + (c + j)].classList.add('hover-hammer');
                } else if (jokerDragInfo.type === '1x1') {
                    if (boardState[r][c] === 0)
                        boardEl.children[r * 9 + c].classList.add('hover-valid');
                    else
                        boardEl.children[r * 9 + c].classList.add('hover-invalid');
                }
            } else {
                clearGhost();
            }
        } else {
            clearGhost();
        }
    }
}
);

function startDrag(e, index, data) {
    clearTooltip();
    if (!isGameRunning || activeAnimations > 0 || currentPiecesData[index].used || activeJokerMode !== null || document.body.classList.contains('death-mode')) {
        if (document.body.classList.contains('death-mode') && currentPiecesData[index].c === '#c0392b') {} else
            return;
    }
    draggingElement = document.getElementById(`pw-${index}`);
    draggingElement.classList.add('dragging');
    const rect = draggingElement.getBoundingClientRect();
    dragInfo = {
        index,
        shape: data.s,
        color: data.c,
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
        currentOrigin: null,
        hasSpecial: data.hasSpecial,
        specialType: data.specialType,
        specialPos: data.specialPos,
        hasKey: data.hasKey,
        keyPos: data.keyPos
    };
}
boardEl.addEventListener('pointerdown', (e) => {
    if (!isGameRunning || activeAnimations > 0 || !activeJokerMode || document.body.classList.contains('death-mode'))
        return;
    const rect = boardEl.getBoundingClientRect();
    let c = Math.floor((e.clientX - rect.left) / (rect.width / 9));
    let r = Math.floor((e.clientY - rect.top) / (rect.height / 9));
    if (r >= 0 && r < 9 && c >= 0 && c < 9) {
        if (activeJokerMode === 'hammer') {
            if (!hammerLockedPos) {
                hammerLockedPos = {
                    r,
                    c
                };
                clearGhost();
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++)
                        if (r + i < 9 && c + j < 9)
                            boardEl.children[(r + i) * 9 + (c + j)].classList.add('hover-hammer-locked');
            } else {
                if (Math.abs(hammerLockedPos.r - r) <= 1 && Math.abs(hammerLockedPos.c - c) <= 1) {
                    useHammerAt(hammerLockedPos.r, hammerLockedPos.c);
                } else {
                    activeJokerMode = null;
                    hammerLockedPos = null;
                    updateJokerUI();
                    clearGhost();
                }
            }
        } else if (activeJokerMode === '1x1') {
            if (!oneByOneLockedPos) {
                if (boardState[r][c] === 0) {
                    oneByOneLockedPos = {
                        r,
                        c
                    };
                    clearGhost();
                    let cell = boardEl.children[r * 9 + c];
                    cell.classList.add('hover-1x1-locked');
                    cell.innerHTML = `<img src="icons/random_block.png" style="width:95%; height:95%; object-fit:contain; opacity:0.8; animation: pulse 1s infinite;" class="ghost-random">`;
                }
            } else {
                if (oneByOneLockedPos.r === r && oneByOneLockedPos.c === c) {
                    confirmOneByOne(r, c);
                } else {
                    activeJokerMode = null;
                    oneByOneLockedPos = null;
                    updateJokerUI();
                    clearGhost();
                }
            }
        }
    } else {
        activeJokerMode = null;
        hammerLockedPos = null;
        oneByOneLockedPos = null;
        updateJokerUI();
        clearGhost();
    }
}
);

function formatScore(num) {
    if (num >= 1000000)
        return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (num >= 10000)
        return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    return num.toString();
}
function spawnBgBlock() {
    if (bgTimeout)
        clearTimeout(bgTimeout);
    const container = document.getElementById('bg-blocks-container');
    if (!container)
        return;
    const shape = ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)];
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const pieceEl = document.createElement('div');
    pieceEl.className = 'bg-piece';
    pieceEl.style.gridTemplateColumns = `repeat(${shape[0].length}, 30px)`;
    pieceEl.style.left = `${Math.random() * 90}vw`;
    let activeCombo = (userSettings.motionEnabled === false) ? 0 : Math.min(combo, 6);
    const isLowPower = window.innerWidth < 390; // iPhone mini-class screens
    const maxComboEffect = isLowPower ? 3 : 6;  // cap speed boost at x3 on small phones
    const cappedCombo = Math.min(activeCombo, maxComboEffect);
    const fallDuration = 18 - (cappedCombo / maxComboEffect * 10);
    pieceEl.style.animationDuration = `${fallDuration}s`;
    for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[0].length; c++) {
            const cell = document.createElement('div');
            cell.className = 'bg-piece-cell';
            if (shape[r][c] === 1)
                cell.style.backgroundColor = color;
            pieceEl.appendChild(cell);
        }
    container.appendChild(pieceEl);
    setTimeout( () => {
        if (pieceEl.parentNode)
            pieceEl.remove();
    }
    , fallDuration * 1000);
    const nextSpawn = 2900 - (activeCombo / 5 * 2800);
    const isMobile = window.innerWidth <= 768;
    const densityFactor = isMobile ? 4.5 : 1; // Mobilde bekleme süresini 2.5 kat uzat (daha az blok)
    
    bgTimeout = setTimeout(spawnBgBlock, nextSpawn * densityFactor);
}
spawnBgBlock();
function initBoardUI() {
    boardEl.innerHTML = '';
    boardState = Array(boardSize).fill().map( () => Array(boardSize).fill(0));
    for (let r = 0; r < boardSize; r++)
        for (let c = 0; c < boardSize; c++) {
            const cell = document.createElement('div');
            cell.className = `cell ${(Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 1 ? 'nth-region' : ''}`;
            cell.dataset.r = r;
            cell.dataset.c = c;
            boardEl.appendChild(cell);
        }
}
function updateComboUI(isBreak=false) {
    const display = document.getElementById('combo-display');
    const val = document.getElementById('combo');
    const comboContainer = document.querySelector('.combo-box');
    if (isBreak && combo === 1) {
        display.classList.remove('pop');
        display.classList.add('break');
        comboContainer.classList.remove('shaking');
        setTimeout( () => {
            display.style.opacity = '0';
            display.classList.remove('break');
        }
        , 600);
    } else if (combo > 1) {
        display.classList.remove('break');
        display.style.opacity = '1';
        val.innerText = combo;
        display.classList.remove('pop');
        void display.offsetWidth;
        display.classList.add('pop');
        if (combo > 2) {
            let intensity = (Math.min(combo, 6) - 1) / 12;
            comboContainer.classList.add('shaking');
            comboContainer.style.setProperty('--shake-rot', (2 + intensity * 18) + 'deg');
            comboContainer.style.setProperty('--shake-x', (1 + intensity * 14) + 'px');
            comboContainer.style.setProperty('--shake-y', (1 + intensity * 14) + 'px');
            comboContainer.style.setProperty('--shake-speed', (0.5 - intensity * 0.45) + 's');
        } else {
            comboContainer.classList.remove('shaking');
        }
    } else {
        display.style.opacity = '0';
        comboContainer.classList.remove('shaking');
    }
    const shieldUI = document.getElementById('life-shield-ui');
    if (gameState.lifeTurns > 0) {
        shieldUI.style.display = 'block';
        document.getElementById('life-turns').innerText = gameState.lifeTurns;
    } else {
        shieldUI.style.display = 'none';
    }
    if (combo > stats.maxCombo)
        stats.maxCombo = combo;
}
function playShieldAnim() {
    const header = document.getElementById('main-header');
    const cont = document.createElement('div');
    cont.style.cssText = "position:absolute; top:-4px; left:-4px; right:-4px; bottom:-4px; border-radius: 18px; overflow:hidden; pointer-events:none; z-index:100;";
    const top = document.createElement('div');
    top.style.cssText = "position:absolute; top:0; left:0; height:4px; width:0; background:#2ecc71; box-shadow:0 0 15px #2ecc71; transition: width 0.3s linear;";
    const right = document.createElement('div');
    right.style.cssText = "position:absolute; top:0; right:0; width:4px; height:0; background:#2ecc71; box-shadow:0 0 15px #2ecc71; transition: height 0.3s linear;";
    const bottom = document.createElement('div');
    bottom.style.cssText = "position:absolute; bottom:0; right:0; height:4px; width:0; background:#2ecc71; box-shadow:0 0 15px #2ecc71; transition: width 0.3s linear;";
    const left = document.createElement('div');
    left.style.cssText = "position:absolute; bottom:0; left:0; width:4px; height:0; background:#2ecc71; box-shadow:0 0 15px #2ecc71; transition: height 0.3s linear;";
    cont.appendChild(top);
    cont.appendChild(right);
    cont.appendChild(bottom);
    cont.appendChild(left);
    header.appendChild(cont);
    setTimeout( () => top.style.width = '100%', 50);
    setTimeout( () => right.style.height = '100%', 350);
    setTimeout( () => bottom.style.width = '100%', 650);
    setTimeout( () => left.style.height = '100%', 950);
    setTimeout( () => {
        top.style.left = 'auto';
        top.style.right = '0';
        top.style.width = '0';
    }
    , 1350);
    setTimeout( () => {
        right.style.top = 'auto';
        right.style.bottom = '0';
        right.style.height = '0';
    }
    , 1650);
    setTimeout( () => {
        bottom.style.right = 'auto';
        bottom.style.left = '0';
        bottom.style.width = '0';
    }
    , 1950);
    setTimeout( () => {
        left.style.bottom = 'auto';
        left.style.top = '0';
        left.style.height = '0';
    }
    , 2250);
    setTimeout( () => cont.remove(), 2600);
}
function updateOddsUI() {
    let u = gameState.chestOddsLevel;
    document.getElementById('odd-pts250').innerText = `%${10 - u}`;
    document.getElementById('odd-pts500').innerText = `%${15 - u}`;
    document.getElementById('odd-pts1000').innerText = `%${10 - u}`;
    document.getElementById('odd-pts1500').innerText = `%5`;
    document.getElementById('odd-m3').innerText = `%${25 - u}`;
    document.getElementById('odd-m5').innerText = `%10`;
    document.getElementById('odd-joker').innerText = `%${24 + (u * 6)}`;
    document.getElementById('odd-x1').innerText = `%${1 + (u * 2)}`;
}
function updateMinusTooltips() {
    for (let key in specialBlockStates) {
        let[r,c] = key.split(',').map(Number);
        if (boardState[r] && boardState[r][c] === 'minus') {
            let cell = boardEl.children[r * 9 + c];
            cell.innerHTML = getIconHTML('minus', r, c);
            cell.classList.add('cursed-cell');
        }
    }
}

function startGame() {
    isGameRunning = true;
    isGameOverSequence = false;
    activeAnimations = 0;
    score = 0;
    rawScore = 0;
    combo = 1;
    playerKeys = 0;
    playerJokers = [];
    activeMultiplier = {
        active: false,
        turns: 0
    };
    historyState = null;
    activeJokerMode = null;
    hammerLockedPos = null;
    oneByOneLockedPos = null;
    totalTurns = 0;
    specialBlockStates = {};
    stats = {
        maxPointsInMove: 0,
        maxCombo: 0,
        deathWavesSurvived: 0,
        chestsOpened: 0,
        megaChestsOpened: 0,
        maxBaseScore: 10,
        maxBlocksInMove: 0,
        hammersUsed: 0,
        maxPenalty: 0,
        invalidPlacements: 0,
        cursedBlocksNeutralized: 0
    };
    gameState = {
        baseBlockScore: 10,
        lifeTurns: 0,
        chestOddsLevel: 0,
        cursedKeyActive: false
    };
    deathWave = {
        active: false,
        counter: 0,
        shapeDef: null,
        nextEligibleScore: 20000,
        inDeathTurn: false
    };
    endDeathWave();
    document.getElementById('base-score-val').innerText = gameState.baseBlockScore;
    document.getElementById('score').innerText = formatScore(score);
    if(document.getElementById('score-bar-label')) {
        document.getElementById('score-bar-label').style.display = 'none';
    }
    updateOddsUI();
    updateComboUI();
    updateChestUI();
    updateJokerUI();
    updateMultUI();
    gameThemeColor = userSettings.fixedThemeColor || PALETTE[Math.floor(Math.random() * PALETTE.length)];
    initBoardUI();
    generatePieces();
    saveGameState();
}

function updateDeathWaveUI() {
    document.getElementById('dw-sets-left').innerText = deathWave.counter;
    const mini = document.getElementById('dw-miniature');
    mini.innerHTML = '';
    let shape = deathWave.shapeDef.s;
    mini.style.gridTemplateColumns = `repeat(${shape[0].length}, 14px)`;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[0].length; c++) {
            let cEl = document.createElement('div');
            if (shape[r][c] === 1)
                cEl.className = 'dw-mini-cell';
            mini.appendChild(cEl);
        }
    }
}
function endDeathWave() {
    if (deathWave.active)
        stats.deathWavesSurvived++;
    deathWave.inDeathTurn = false;
    deathWave.active = false;
    document.body.classList.remove('death-mode', 'death-warning-mode');
    document.getElementById('death-header-ui').style.display = 'none';
    document.getElementById('normal-header-ui').style.display = 'flex';
    document.getElementById('score').innerText = formatScore(score);
}
function triggerDeathWave() {
    deathWave.active = true;
    deathWave.counter = 5;
    deathWave.shapeDef = DEATH_SHAPES[Math.floor(Math.random() * DEATH_SHAPES.length)];
    deathWave.nextEligibleScore = score + 25000;
    document.body.classList.add('death-warning-mode');
    document.getElementById('normal-header-ui').style.display = 'none';
    document.getElementById('death-header-ui').style.display = 'flex';
    updateDeathWaveUI();
}

function generatePieces(isShuffle=false) {
    if (!isShuffle) {
        if (deathWave.inDeathTurn) {
            endDeathWave();
        }
        if (deathWave.active && deathWave.counter === 0) {
            deathWave.inDeathTurn = true;
            document.body.classList.remove('death-warning-mode');
            document.body.classList.add('death-mode');
            currentPiecesData = [{
                s: [[0]],
                c: 'transparent',
                used: true,
                hasSpecial: false,
                specialType: null,
                specialPos: null,
                hasKey: false,
                keyPos: null
            }, {
                s: deathWave.shapeDef.s,
                c: '#c0392b',
                used: false,
                hasSpecial: false,
                specialType: null,
                specialPos: null,
                hasKey: false,
                keyPos: null
            }, {
                s: [[0]],
                c: 'transparent',
                used: true,
                hasSpecial: false,
                specialType: null,
                specialPos: null,
                hasKey: false,
                keyPos: null
            }];
            renderPieces();
            activeAnimations++;
            setTimeout( () => {
                updateTrayPiecesState();
                activeAnimations--;
                finalizeTurn();
            }
            , 600);
            return;
        }
        if (deathWave.active && deathWave.counter > 0) {
            deathWave.counter--;
            updateDeathWaveUI();
            if (deathWave.counter === 0) {
                document.getElementById('dw-rounds-label').style.display = 'none';
		document.getElementById('dw-sets-left').innerHTML = `<span style="font-size: 1.5rem; font-weight: bold; color: #e74c3c;">${t('death_warning')}</span>`;
            }
        }
        if (!deathWave.active && score >= 20000 && score >= deathWave.nextEligibleScore) {
            if (Math.random() < 0.05) {
                triggerDeathWave();
            }
        }
    }
    currentPiecesData = Array(3).fill().map( () => {
        let s;
        let r = Math.random();
        let level = Math.min(10, Math.floor(score / 10000));
        if (isShuffle) {
            s = (r < 0.8) ? EASY_SHAPES[Math.floor(Math.random() * EASY_SHAPES.length)] : MEDIUM_SHAPES[Math.floor(Math.random() * MEDIUM_SHAPES.length)];
        } else {
            let chanceEasy = Math.max(0.15, 0.35 - (level * 0.02));
            let chanceHard = Math.min(0.35, 0.10 + (level * 0.025));
            let chanceMed = 1.0 - chanceEasy - chanceHard;
            if (r < chanceEasy)
                s = EASY_SHAPES[Math.floor(Math.random() * EASY_SHAPES.length)];
            else if (r < chanceEasy + chanceMed)
                s = MEDIUM_SHAPES[Math.floor(Math.random() * MEDIUM_SHAPES.length)];
            else
                s = HARD_SHAPES[Math.floor(Math.random() * HARD_SHAPES.length)];
        }
        let specType = rollSpecialItem();
        let specPos = null;
        let hasKey = false;
        let keyPos = null;
        let ones = [];
        for (let r = 0; r < s.length; r++)
            for (let c = 0; c < s[0].length; c++)
                if (s[r][c] === 1)
                    ones.push({
                        r,
                        c
                    });
        if (specType) {
            specPos = ones[Math.floor(Math.random() * ones.length)];
        } else {
            let keyChance = gameState.cursedKeyActive ? 0.025 : 0.10;
            if (Math.random() < keyChance) {
                hasKey = true;
                keyPos = ones[Math.floor(Math.random() * ones.length)];
            }
        }
        return {
            s,
            c: gameThemeColor,
            used: false,
            hasSpecial: specType !== null,
            specialType: specType,
            specialPos: specPos,
            hasKey: hasKey,
            keyPos: keyPos
        };
    }
    );
    renderPieces();
    activeAnimations++;
    setTimeout( () => {
        updateTrayPiecesState();
        activeAnimations--;
        finalizeTurn();
    }
    , 600);
}

function renderPieces() {
    for (let i = 0; i < 3; i++) {
        const wrapper = document.getElementById(`pw-${i}`);
        wrapper.innerHTML = '';
        wrapper.style.transform = 'translate(0px, 0px) scale(1)';
        wrapper.classList.remove('dragging', 'disabled', 'no-fit-anim');
        wrapper.style.animation = 'none';
        wrapper.offsetHeight;
        wrapper.style.animation = null;
        wrapper.style.visibility = currentPiecesData[i].used ? 'hidden' : 'visible';
        if (currentPiecesData[i].used)
            continue;
        const data = currentPiecesData[i];
        const pieceEl = document.createElement('div');
        pieceEl.className = 'piece';
        pieceEl.style.gridTemplateColumns = `repeat(${data.s[0].length}, 22px)`;
        for (let r = 0; r < data.s.length; r++)
            for (let c = 0; c < data.s[0].length; c++) {
                const cell = document.createElement('div');
                cell.className = 'piece-cell';
                if (data.s[r][c] === 1) {
                    cell.style.backgroundColor = data.c;
                    if (data.hasSpecial && data.specialPos.r === r && data.specialPos.c === c) {
                        cell.innerHTML = getIconHTML(data.specialType, undefined, undefined);
                        if (['scoreDown', 'skull', 'cursedKey', 'minus'].includes(data.specialType))
                            cell.classList.add('cursed-cell');
                    } else if (data.hasKey && data.keyPos.r === r && data.keyPos.c === c) {
                        cell.innerHTML = getIconHTML('K');
                    }
                }
                pieceEl.appendChild(cell);
            }
        wrapper.appendChild(pieceEl);
        wrapper.onpointerdown = (e) => startDrag(e, i, data);
    }
}
function updateTrayPiecesState() {
    // MOBİL VE ANİMASYON ÇAKIŞMA BUG'INI ÇÖZEN GECİKME (TIMEOUT)
    // 300ms bekler ki ekrana geliş/büyüme animasyonları tamamen bitsin
    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
            if (!currentPiecesData[i] || currentPiecesData[i].used)
                continue;
            const wrapper = document.getElementById(`pw-${i}`);
            let fits = false;
            for (let r = 0; r < boardSize; r++)
                for (let c = 0; c < boardSize; c++) {
                    if (canPlace(boardState, currentPiecesData[i].s, r, c)) {
                        fits = true;
                        break;
                    }
                }
	if (fits) {
                wrapper.style.animation = '';
                wrapper.classList.remove('disabled');
            } else {
                wrapper.style.animation = 'none';
                wrapper.classList.add('disabled');
            }
        }
    }, 500); // 300 Milisaniye Animasyon Bekleme Süresi
}

function saveHistory() {
    historyState = {
        board: boardState.map(row => [...row]),
        pieces: JSON.parse(JSON.stringify(currentPiecesData)),
        combo: combo,
        mult: {
            ...activeMultiplier
        },
        gs: JSON.parse(JSON.stringify(gameState)),
        dw: JSON.parse(JSON.stringify(deathWave)),
        totalTurns: totalTurns,
        specialStates: JSON.parse(JSON.stringify(specialBlockStates)),
        earnedPoints: 0,
        earnedKeys: 0
    };
}
function showGhostAndPredict(originR, originC) {
    clearGhost();
    const isValid = canPlace(boardState, dragInfo.shape, originR, originC);
    if (isValid) {
        let {toClear} = simulatePlacement(dragInfo.shape, originR, originC);
        for (let r = 0; r < dragInfo.shape.length; r++)
            for (let c = 0; c < dragInfo.shape[0].length; c++)
                if (dragInfo.shape[r][c] === 1)
                    boardEl.children[(originR + r) * 9 + (originC + c)].classList.add('hover-valid');
        toClear.forEach(coord => {
            const [tr,tc] = coord.split(',').map(Number);
            boardEl.children[tr * 9 + tc].classList.add('will-clear');
        }
        );
    } else {
        for (let r = 0; r < dragInfo.shape.length; r++)
            for (let c = 0; c < dragInfo.shape[0].length; c++)
                if (dragInfo.shape[r][c] === 1) {
                    let br = originR + r
                      , bc = originC + c;
                    if (br >= 0 && br < boardSize && bc >= 0 && bc < boardSize)
                        boardEl.children[br * boardSize + bc].classList.add('hover-invalid');
                }
    }
}
function clearGhost() {
    Array.from(boardEl.children).forEach(c => {
        c.classList.remove('hover-valid', 'hover-invalid', 'will-clear', 'hover-hammer', 'hover-hammer-locked', 'hover-1x1-locked');
        let g = c.querySelector('.ghost-random');
        if (g)
            g.remove();
    }
    );
}
function canPlace(brd, shape, startR, startC) {
    for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[0].length; c++)
            if (shape[r][c] === 1) {
                let br = startR + r
                  , bc = startC + c;
                if (br < 0 || br >= boardSize || bc < 0 || bc >= boardSize || brd[br][bc] !== 0)
                    return false;
            }
    return true;
}
function placePiece(shape, startR, startC, color, hasSpec, specType, specPos, hasKey, keyPos) {
    for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[0].length; c++)
            if (shape[r][c] === 1) {
                const br = startR + r
                  , bc = startC + c;
                let isSpecCell = (hasSpec && specPos.r === r && specPos.c === c);
                let isKeyCell = (hasKey && keyPos.r === r && keyPos.c === c);
                if (isSpecCell) {
                    boardState[br][bc] = specType;
                    if (specType === 'minus')
                        specialBlockStates[`${br},${bc}`] = {
                            turnPlaced: totalTurns
                        };
                } else if (isKeyCell)
                    boardState[br][bc] = 'K';
                else
                    boardState[br][bc] = 1;
                const cell = boardEl.children[br * boardSize + bc];
                cell.classList.add('filled');
                cell.style.backgroundColor = color;
                if (isSpecCell) {
                    cell.innerHTML = getIconHTML(specType, br, bc);
                    if (['scoreDown', 'skull', 'cursedKey', 'minus'].includes(specType))
                        cell.classList.add('cursed-cell');
                } else if (isKeyCell) {
                    cell.innerHTML = getIconHTML('K');
                }
            }
}

function confirmOneByOne(r, c) {
    let idx = activeJokerIndex;
    activeJokerMode = null;
    oneByOneLockedPos = null;
    clearGhost();
    activeAnimations++;
    let cell = boardEl.children[r * 9 + c];
    cell.innerHTML = `<img src="icons/random_block.png" style="width:95%; height:95%; object-fit:contain; animation: fastChestShake 0.4s infinite;">`;
    setTimeout( () => {
        activeAnimations--;
        use1x1At(r, c, idx);
    }
    , 400);
    // Flaş kaldırıldı
}
function use1x1At(r, c, idx) {
    saveHistory();
    let rNum = Math.random();
    let typeToPlace = 1;
    if (rNum < 0.30) {
        typeToPlace = ['+', 'row', 'col', '?', 'X'][Math.floor(Math.random() * 4)];
    } else if (rNum < 0.45) {
        let pool = ['life', 'multX', 'upg', 'scoreUp', 'scoreDown', 'cursedKey', 'minus'];
        typeToPlace = pool[Math.floor(Math.random() * pool.length)];
    }
    boardState[r][c] = typeToPlace;
    if (typeToPlace === 'minus')
        specialBlockStates[`${r},${c}`] = {
            turnPlaced: totalTurns
        };
    let cell = boardEl.children[r * 9 + c];
    cell.classList.add('filled');
    cell.style.backgroundColor = gameThemeColor;
    if (typeToPlace !== 1) {
        cell.innerHTML = getIconHTML(typeToPlace, r, c);
        if (['scoreDown', 'skull', 'cursedKey', 'minus'].includes(typeToPlace))
            cell.classList.add('cursed-cell');
    } else {
        cell.innerHTML = '';
    }
    if (idx > -1 && playerJokers[idx]) {
        playerJokers[idx].count--;
        if (playerJokers[idx].count <= 0) {
            playerJokers.splice(idx, 1);
        }
    }
    updateJokerUI();
    clearGhost();
    turnClearedBlocks = 0;
    turnPoints = 0;
    checkBoardLogic(true);
    updateTrayPiecesState();
    checkGameOver();
}
function useHammerAt(r, c) {
    saveHistory();
    stats.hammersUsed++;
    document.body.classList.add('shake-3');
    setTimeout( () => document.body.classList.remove('shake-3'), 500);
    const bRect = boardEl.getBoundingClientRect();
    const cellW = bRect.width / 9;
    const cellH = bRect.height / 9;
    const targetX = bRect.left + (c * cellW) + (cellW / 2);
    const targetY = bRect.top + (r * cellH) + (cellH / 2);
    const crackDiv = document.createElement('div');
    crackDiv.className = 'crack-overlay';
    crackDiv.style.left = `${targetX}px`;
    crackDiv.style.top = `${targetY}px`;
    crackDiv.innerHTML = `<img src="assets/crack.png" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display='none'">`;
    document.body.appendChild(crackDiv);
    setTimeout( () => {
        if (crackDiv.parentNode)
            crackDiv.remove();
    }
    , 1500);
    let triggeredAreas = [];
    turnClearedBlocks = 0;
    turnPoints = 0;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            if (r + i < 9 && c + j < 9) {
                let cell = boardEl.children[(r + i) * 9 + (c + j)];
                let type = boardState[r + i][c + j];
                if (type !== 0) {
                    if (['+', 'row', 'col', '?', 'X', 'M'].includes(type)) {
                        triggeredAreas.push({
                            r: r + i,
                            c: c + j,
                            type
                        });
                        // Sadece kuyruğa al, SİLME!
                    } else {
                        if (type === 'K') {
                            activeAnimations++;
                            flyItemToTarget(cell, 'K', document.getElementById('chest-btn'), () => {
                                playerKeys++;
                                updateChestUI();
                            }
                            );
                        } else if (type !== 1) {
                            triggerSpecials(type, cell, r + i, c + j, true);
                        }
                        boardState[r + i][c + j] = 0;
                        turnClearedBlocks++;
                        rawScore++;
                        delete specialBlockStates[`${r + i},${c + j}`];
                        cell.innerHTML = '';
                        cell.classList.remove('cursed-cell', 'show-tooltip');
                        cell.classList.add('clearing');
                        setTimeout( () => {
			    cell.style.transition = 'none';
                            cell.className = `cell ${(Math.floor((r + i) / 3) + Math.floor((c + j) / 3)) % 2 === 1 ? 'nth-region' : ''}`;
                            cell.style.backgroundColor = '';
			    void cell.offsetHeight;
			    cell.style.transition = '';
                        }
                        , 500);
                    }
                }
            }
        }
    }
    if (activeJokerIndex > -1 && playerJokers[activeJokerIndex]) {
        playerJokers.splice(activeJokerIndex, 1);
    }
    activeJokerMode = null;
    hammerLockedPos = null;
    updateJokerUI();
    clearGhost();
    updateTrayPiecesState();
    if (triggeredAreas.length > 0) {
        activeAnimations++;
        setTimeout( () => {
            executeAreaChains(triggeredAreas, 1);
        }
        , 600);
    } else {
        finalizeTurn();
    }
}

function triggerSpecials(type, cell, r, c, isHammerOrArea) {
    let scoreMod = 0;
    if (type === 'K') {
        if (historyState)
            historyState.earnedKeys++;
        activeAnimations++;
        if (gameState.cursedKeyActive)
            gameState.cursedKeyActive = false;
        flyItemToTarget(cell, 'K', document.getElementById('chest-btn'), () => {
            playerKeys++;
            updateChestUI();
        }
        );
    } else if (!isHammerOrArea) {
        if (type === 'life') {
            playShieldAnim();
            gameState.lifeTurns = 7;
            updateComboUI();
        } else if (type === 'multX') {
            activeAnimations++;
            let baseMult = (combo < 2) ? 1.5 : combo;
            let multVal = (activeMultiplier.active && activeMultiplier.turns > 0) ? 5 : baseMult;
            let flyX = document.createElement('div');
            flyX.className = 'fly-x-anim';
            flyX.innerText = `x${multVal}`;
            const cbRect = document.querySelector('.combo-box').getBoundingClientRect();
            const scRect = document.getElementById('score').getBoundingClientRect();
            flyX.style.left = cbRect.left + 'px';
            flyX.style.top = cbRect.top + 'px';
            document.body.appendChild(flyX);
            setTimeout( () => {
                flyX.style.transform = `translate(${scRect.left - cbRect.left}px, ${scRect.top - cbRect.top}px) scale(0.5)`;
                flyX.style.opacity = '0';
            }
            , 50);
            setTimeout( () => {
                if (flyX.parentNode)
                    flyX.remove();
                score = Math.max(0, Math.floor(score * multVal));
                turnPoints += (score - Math.floor(score / multVal));
                activeAnimations--;
                document.getElementById('score').innerText = formatScore(score);
                finalizeTurn();
            }
            , 850);
        } else if (type === 'upg') {
            if (gameState.chestOddsLevel < 5) {
                gameState.chestOddsLevel++;
                updateOddsUI();
                document.querySelector('.info-btn').classList.add('upgrade-notification');
            }
        } else if (type === 'scoreUp') {
            if (gameState.baseBlockScore < 35) {
                gameState.baseBlockScore++;
                updateBaseScoreUI(true);
                if (gameState.baseBlockScore > stats.maxBaseScore)
                    stats.maxBaseScore = gameState.baseBlockScore;
            }
        } else if (type === 'scoreDown') {
            if (gameState.baseBlockScore > 1) {
                gameState.baseBlockScore--;
                updateBaseScoreUI(false);
            }
        } else if (type === 'skull') {
            if (!deathWave.active && score > 20000)
                triggerDeathWave();
        } else if (type === 'cursedKey') {
            gameState.cursedKeyActive = true;
        } else if (type === 'minus') {
            let pct = 5;
            if (specialBlockStates[`${r},${c}`]) {
                let age = totalTurns - specialBlockStates[`${r},${c}`].turnPlaced;
                pct = Math.min(20, 5 + (age * 1));
            }
            let penalty = Math.floor(score * (pct / 100));
            scoreMod = -penalty;
            if (penalty > stats.maxPenalty)
                stats.maxPenalty = penalty;
            showPraise(`-${penalty} PUAN!`, "#c0392b");
        }
    } else {
        if (['scoreDown', 'skull', 'cursedKey', 'minus'].includes(type))
            stats.cursedBlocksNeutralized++;
    }
    return scoreMod;
}

function executeAreaChains(areas, chainCombo) {
    try {
        if (areas.length === 0 || isGameOverSequence || !isGameRunning) {
            activeAnimations--;
            finalizeTurn();
            return;
        }
        let area = areas.shift();
        let targets = [];

        if (area.type === 'row') {
            for (let c = 0; c < 9; c++) if (c !== area.c) targets.push({ r: area.r, c: c });
        } else if (area.type === 'col') {
            for (let r = 0; r < 9; r++) if (r !== area.r) targets.push({ r: r, c: area.c });
        } else if (area.type === '+') {
            for (let c = 0; c < 9; c++) if (c !== area.c) targets.push({ r: area.r, c: c });
            for (let r = 0; r < 9; r++) if (r !== area.r) targets.push({ r: r, c: area.c });
        } else if (area.type === '?') {
            // YENİ: Akıllı Rastgele Bloğu (Önce doluları, sonra boşları hedefler)
            let filledCells = [];
            let emptyCells = [];
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    if (i !== area.r || j !== area.c) {
                        if (boardState[i][j] !== 0) filledCells.push({ r: i, c: j });
                        else emptyCells.push({ r: i, c: j });
                    }
                }
            }
            filledCells.sort(() => 0.5 - Math.random());
            emptyCells.sort(() => 0.5 - Math.random());
            targets = filledCells.slice(0, 9);
            if (targets.length < 9) {
                targets = targets.concat(emptyCells.slice(0, 9 - targets.length));
            }
        } else if (area.type === 'X') {
            // YENİ: Çapraz Alan Bloğu
            for (let i = -8; i <= 8; i++) {
                if (i === 0) continue;
                if (area.r + i >= 0 && area.r + i < 9 && area.c + i >= 0 && area.c + i < 9)
                    targets.push({ r: area.r + i, c: area.c + i });
                if (area.r + i >= 0 && area.r + i < 9 && area.c - i >= 0 && area.c - i < 9)
                    targets.push({ r: area.r + i, c: area.c - i });
            }
        } else if (area.type === 'M') {
            // YENİ: Mega Tüm Alan Bloğu
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    if (i !== area.r || j !== area.c) targets.push({ r: i, c: j });
                }
            }
        }

        combo++;
        updateComboUI();
        fireAgroMultiplier(Math.min(combo, 10));
        let earnedPoints = 0;
        let newAreas = [];
        const originCell = boardEl.children[area.r * 9 + area.c];
        if (originCell) originCell.classList.add('levitate-anim');

        targets.sort((a, b) => (Math.abs(a.r - area.r) + Math.abs(a.c - area.c)) - (Math.abs(b.r - area.r) + Math.abs(b.c - area.c)));
        let maxDist = 0;

        targets.forEach(t => {
            let dist = Math.abs(t.r - area.r) + Math.abs(t.c - area.c);
            if (area.type === '?') dist = Math.floor(Math.random() * 5);
            maxDist = Math.max(maxDist, dist);

            setTimeout(() => {
                let type = boardState[t.r][t.c];
                let cell = boardEl.children[t.r * 9 + t.c];

                cell.classList.add('cell-wave-shake');
                let flash = document.createElement('div');
                flash.className = 'cell-flash';
                cell.appendChild(flash);

                setTimeout(() => {
                    if (flash.parentNode) flash.remove();
                    cell.classList.remove('cell-wave-shake');
                }, 500);

                if (type === 0) return;

                // X ve M bloklarını tanıma sistemine dahil ettik
                if (['+', 'row', 'col', '?', 'X', 'M'].includes(type)) {
                    let exists = areas.some(a => a.r === t.r && a.c === t.c) || newAreas.some(a => a.r === t.r && a.c === t.c);
                    if (!exists) newAreas.push({ r: t.r, c: t.c, type });
                } else {
                    // KRİTİK DEĞİŞİKLİK: Burada 'false' göndererek alan bloklarının lanetleri ve özel blokları doğrudan TETİKLEMESİNİ sağladık!
                    let pMod = triggerSpecials(type, cell, t.r, t.c, false);
                    boardState[t.r][t.c] = 0;
                    turnClearedBlocks++;
                    rawScore++;
                    delete specialBlockStates[`${t.r},${t.c}`];
                    cell.innerHTML = '';
                    cell.classList.remove('cursed-cell', 'show-tooltip', 'levitate-anim');
                    cell.classList.add('clearing');
                    setTimeout(() => {
                        cell.className = `cell ${(Math.floor(t.r / 3) + Math.floor(t.c / 3)) % 2 === 1 ? 'nth-region' : ''}`;
                        cell.style.backgroundColor = '';
                    }, 500);
                    earnedPoints += (gameState.baseBlockScore * combo) + pMod;
                }
            }, dist * 80);
        });

        setTimeout(() => {
            if (originCell) {
                boardState[area.r][area.c] = 0;
                delete specialBlockStates[`${area.r},${area.c}`];
                originCell.classList.remove('cursed-cell', 'show-tooltip', 'levitate-anim');
                originCell.classList.add('area-block-clear');
                setTimeout(() => {
                    originCell.innerHTML = '';
                    originCell.className = `cell ${(Math.floor(area.r / 3) + Math.floor(area.c / 3)) % 2 === 1 ? 'nth-region' : ''}`;
                    originCell.style.backgroundColor = '';
                    originCell.classList.remove('area-block-clear');
                }, 600);
            }
            if (earnedPoints !== 0) {
                if (earnedPoints > 0 && activeMultiplier.active && activeMultiplier.turns > 0) earnedPoints *= 5;
                tallyPoints(earnedPoints);
            }
            areas.push(...newAreas);
            setTimeout(() => executeAreaChains(areas, chainCombo + 1), 200);
        }, maxDist * 80 + 350);
    } catch (err) {
        console.error("Engine Fallback:", err);
        activeAnimations--;
        finalizeTurn();
    }
}

function checkBoardLogic(isFreeTurn=false) {
    let toClear = new Set();
    let rowsCleared = 0
      , colsCleared = 0
      , boxesCleared = 0;
    for (let r = 0; r < 9; r++)
        if (boardState[r].every(v => v !== 0)) {
            rowsCleared++;
            for (let c = 0; c < 9; c++)
                toClear.add(`${r},${c}`);
        }
    for (let c = 0; c < 9; c++)
        if (boardState.every(row => row[c] !== 0)) {
            colsCleared++;
            for (let r = 0; r < 9; r++)
                toClear.add(`${r},${c}`);
        }
    for (let br = 0; br < 3; br++)
        for (let bc = 0; bc < 3; bc++) {
            let filled = true;
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 3; j++)
                    if (boardState[br * 3 + i][bc * 3 + j] === 0)
                        filled = false;
            if (filled) {
                boxesCleared++;
                for (let i = 0; i < 3; i++)
                    for (let j = 0; j < 3; j++)
                        toClear.add(`${br * 3 + i},${bc * 3 + j}`);
            }
        }
    let triggeredAreas = [];
    if (toClear.size > 0) {
        combo++;
        let mult = calculateMultiplier(rowsCleared, colsCleared, boxesCleared);
        let earnedPoints = toClear.size * gameState.baseBlockScore * mult * combo;
        if (activeMultiplier.active && activeMultiplier.turns > 0) {
            earnedPoints *= 5;
            if (!isFreeTurn)
                activeMultiplier.turns--;
            updateMultUI();
        }
        if (mult > 1)
            fireAgroMultiplier(mult);
        Array.from(toClear).forEach( (coord) => {
            let[r,c] = coord.split(',').map(Number);
            let type = boardState[r][c];
            if (['+', 'row', 'col', '?', 'X', 'M'].includes(type)) {
                triggeredAreas.push({
                    r,
                    c,
                    type
                });
                // ZİNCİRE EKLENDİ, AMA SİLİNMEDİ!
            } else {
                earnedPoints += triggerSpecials(type, boardEl.children[r * 9 + c], r, c, false);
                boardState[r][c] = 0;
                turnClearedBlocks++;
                rawScore++;
                delete specialBlockStates[`${r},c`];
                let cell = boardEl.children[r * 9 + c];
                cell.innerHTML = '';
                cell.classList.remove('cursed-cell', 'show-tooltip');
                cell.classList.add('clearing');
                setTimeout( () => {
		    cell.style.transition = 'none';
                    cell.className = `cell ${(Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 1 ? 'nth-region' : ''}`;
                    cell.style.backgroundColor = '';
		    void cell.offsetHeight;
    		    cell.style.transition = '';
                }
                , 500);
            }
        }
        );
        if (historyState)
            historyState.earnedPoints = earnedPoints;
        updateComboUI();
        tallyPoints(earnedPoints);
        if (triggeredAreas.length > 0) {
            activeAnimations++;
            setTimeout( () => {
                executeAreaChains(triggeredAreas, 1);
            }
            , 600);
        }
    } else {
        if (!isFreeTurn) {
            if (gameState.lifeTurns > 0) {
                gameState.lifeTurns--;
                updateComboUI();
            } else {
                let hadCombo = combo > 1;
                combo = 1;
                if (hadCombo)
                    updateComboUI(true);
                else
                    updateComboUI();
            }
            if (activeMultiplier.active && activeMultiplier.turns > 0) {
                activeMultiplier.turns--;
                updateMultUI();
            }
            if (historyState)
                historyState.earnedPoints = 0;
        }
    }
    if (!isFreeTurn) {
        totalTurns++;
        updateMinusTooltips();
    }
    if (triggeredAreas.length === 0)
        finalizeTurn();
}

function flyItemToTarget(cellEl, type, targetEl, onArrive) {
    const cRect = cellEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();
    const flyEl = document.createElement('div');
    if (type === 'K') {
        flyEl.innerHTML = `<img src="icons/key.png" style="width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">`;
    } else {
        flyEl.innerHTML = getIconHTML(type);
    }
    flyEl.style.position = 'absolute';
    flyEl.style.left = cRect.left + 'px';
    flyEl.style.top = cRect.top + 'px';
    flyEl.style.width = cRect.width + 'px';
    flyEl.style.height = cRect.height + 'px';
    flyEl.style.zIndex = '9999';
    flyEl.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
    document.body.appendChild(flyEl);
    setTimeout( () => {
        flyEl.style.transform = `translate(${tRect.left - cRect.left + 15}px, ${tRect.top - cRect.top + 15}px) scale(1.5) rotate(360deg)`;
    }
    , 20);
    setTimeout( () => {
        if (flyEl.parentNode)
            flyEl.remove();
        if (onArrive)
            onArrive();
        targetEl.classList.add('chest-pop-anim');
        setTimeout( () => targetEl.classList.remove('chest-pop-anim'), 300);
        activeAnimations--;
        finalizeTurn();
    }
    , 820);
}
function updateBaseScoreUI(isUp) {
    const ui = document.getElementById('base-score-val');
    ui.innerText = gameState.baseBlockScore;
    ui.parentElement.classList.add(isUp ? 'base-score-anim-up' : 'base-score-anim-down');
    setTimeout( () => ui.parentElement.classList.remove(isUp ? 'base-score-anim-up' : 'base-score-anim-down'), 300);
}
function simulatePlacement(shape, startR, startC) {
    let tempBoard = boardState.map(row => [...row]);
    for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[0].length; c++)
            if (shape[r][c] === 1)
                tempBoard[startR + r][startC + c] = 1;
    let toClear = new Set();
    for (let r = 0; r < 9; r++)
        if (tempBoard[r].every(v => v !== 0))
            for (let c = 0; c < 9; c++)
                toClear.add(`${r},${c}`);
    for (let c = 0; c < 9; c++)
        if (tempBoard.every(row => row[c] !== 0))
            for (let r = 0; r < 9; r++)
                toClear.add(`${r},${c}`);
    for (let br = 0; br < 3; br++)
        for (let bc = 0; bc < 3; bc++) {
            let filled = true;
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 3; j++)
                    if (tempBoard[br * 3 + i][bc * 3 + j] === 0)
                        filled = false;
            if (filled)
                for (let i = 0; i < 3; i++)
                    for (let j = 0; j < 3; j++)
                        toClear.add(`${br * 3 + i},${bc * 3 + j}`);
        }
    toClear.forEach(coord => {
        const [tr,tc] = coord.split(',').map(Number);
        tempBoard[tr][tc] = 0;
    }
    );
    return {
        tempBoard,
        toClear
    };
}
function isTrapState(simBoard, remPieces) {
    if (remPieces.length === 0)
        return false;
    for (let p of remPieces) {
        let fits = false;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (canPlace(simBoard, p.s, r, c)) {
                    fits = true;
                    break;
                }
            }
            if (fits)
                break;
        }
        if (fits)
            return false;
    }
    return true;
}
function executeDeathPenalty() {
    activeAnimations++;
    score = Math.max(0, score - 10000);
    document.getElementById('score').innerText = formatScore(score);
    showPraise(t('death_penalty'), "#e74c3c");
    document.body.classList.add('shake-3');
    setTimeout( () => document.body.classList.remove('shake-3'), 500);
    endDeathWave();
    setTimeout( () => {
        generatePieces();
        activeAnimations--;
        checkGameOver();
    }
    , 1500);
}

// NİHAİ GAME OVER EKRANI (AÇIK MOD)
function checkGameOver() {
    if (activeAnimations > 0 || isGameOverSequence || !isGameRunning)
        return;
    let av = currentPiecesData.filter(p => !p.used);
    if (av.length === 0)
        return;
    if (isTrapState(boardState, av)) {
        if (deathWave.inDeathTurn) {
            executeDeathPenalty();
            return;
        }
	let inDeathTurn = deathWave.inDeathTurn;
        let playableLifeline = !inDeathTurn && (playerKeys > 0 || playerJokers.some(j => j.type !== 'undo' || historyState !== null));
        if (!playableLifeline)
            triggerGameOverSequence();
    }
}

function triggerGameOverSequence() {
    isGameOverSequence = true;
    isGameRunning = false;
    document.getElementById('mult-info').style.opacity = '0';
    saveCurrentToHighScores();
    localStorage.removeItem(STORAGE_KEY);
    for (let i = 0; i < 3; i++)
        if (!currentPiecesData[i].used){
            let pw = document.getElementById(`pw-${i}`);
            pw.style.animation = 'none';
            pw.offsetHeight;
            document.getElementById(`pw-${i}`).classList.add('no-fit-anim');
        }

    setTimeout( () => {
        let filledCells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cellEl = boardEl.children[r * 9 + c];
                if (boardState[r][c] !== 0) {
                    filledCells.push({
                        r,
                        c,
                        el: cellEl,
                        type: boardState[r][c]
                    });
                } else {
                    cellEl.style.transition = 'background-color 1.5s ease, opacity 1.5s ease';
                    cellEl.style.backgroundColor = '#111';
                    cellEl.style.opacity = '0';
                }
            }
        }

const showStatsInBoard = () => {
            setGameState('GAMEOVER');

            // 1. Sol tarafı hafifçe gizle (Soluklaştır)
            if (document.getElementById('normal-game-elements-left')) {
                document.getElementById('normal-game-elements-left').style.opacity = '0';
            }

            // 2. Sağ tarafı (Sandık, Info) TAMAMEN GİZLE
            if (document.getElementById('normal-game-extras-right')) {
                document.getElementById('normal-game-extras-right').style.display = 'none';
            }

            // 3. YENİ MERKEZİ PANELİ FIRLAT!
            const centeredDisplay = document.getElementById('final-score-centered-display');
            if (centeredDisplay) {
                document.getElementById('final-score-centered-val').innerText = formatScore(score);
                document.getElementById('final-raw-score-val').innerText = rawScore;
                centeredDisplay.style.display = 'flex';
                
                // CSS Animasyonunu tetikle
                centeredDisplay.style.animation = 'none';
                void centeredDisplay.offsetWidth; // Reflow hilesi
                centeredDisplay.style.animation = 'comboPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
            }

            const overlay = document.getElementById('board-stats-overlay');
            overlay.classList.add('show');
            renderStatsUI();
            document.getElementById('stats-dots').style.display = 'flex';

            setTimeout( () => {
                document.getElementById('in-board-stats-content').classList.add('show');
            }, 500);
        };

        if (filledCells.length === 0) {
            showStatsInBoard();
            return;
        }

        const scoreIcon = document.getElementById('score');
        const scoreRect = scoreIcon.getBoundingClientRect();
        filledCells.forEach( (cell, index) => {
            setTimeout( () => {
                const cellEl = cell.el;
                const cRect = cellEl.getBoundingClientRect();
                const particle = document.createElement('div');
                particle.style.position = 'absolute';
                particle.style.zIndex = '9999';
                particle.style.borderRadius = '4px';
                particle.style.left = cRect.left + 'px';
                particle.style.top = cRect.top + 'px';
                particle.style.width = cRect.width + 'px';
                particle.style.height = cRect.height + 'px';
                particle.style.backgroundColor = cellEl.style.backgroundColor || '#95a5a6';
                if (cell.type !== 1)
                    particle.innerHTML = getIconHTML(cell.type, cell.r, cell.c);
                document.body.appendChild(particle);

                cellEl.className = `cell ${(Math.floor(cell.r / 3) + Math.floor(cell.c / 3)) % 2 === 1 ? 'nth-region' : ''}`;
                cellEl.style.backgroundColor = '';
                cellEl.innerHTML = '';
                boardState[cell.r][cell.c] = 0;

                setTimeout( () => {
                    const targetX = scoreRect.left + (scoreRect.width / 2) - cRect.left;
                    const targetY = scoreRect.top + (scoreRect.height / 2) - cRect.top;
                    particle.style.transition = `transform 0.6s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.6s ease-in`;
                    particle.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.2)`;
                    particle.style.opacity = '0';
                    setTimeout( () => {
                        if (particle.parentNode)
                            particle.remove();
                        score += 10;
                        rawScore++;
                        document.getElementById('score').innerText = formatScore(score);
                        scoreIcon.style.transform = 'scale(1.3)';
                        setTimeout( () => scoreIcon.style.transform = 'scale(1)', 100);
                    }
                    , 600);
                }
                , 20);
            }
            , index * 50);
        }
        );

        setTimeout(showStatsInBoard, (filledCells.length * 50) + 800);
    }
    , 1000);
}

function calculateMultiplier(r, c, b) {
    let t = r + c + b;
    if (t <= 1)
        return 1;
    if (b === 1 && (r + c) === 1)
        return 2;
    if (b === 2 && (r + c) === 0)
        return 3;
    if (r === 1 && c === 1 && b === 0)
        return 3;
    if ((r === 2 && c === 0 && b === 0) || (r === 0 && c === 2 && b === 0))
        return 4;
    if (r >= 1 && c >= 1 && b >= 1)
        return 5;
    if (t > 2)
        return 10;
    return 2;
}
function fireAgroMultiplier(m) {
    const a = document.getElementById('agro-multiplier');
    a.innerText = `x${m}`;
    let color = m >= 5 ? '#e74c3c' : (m >= 3 ? '#9b59b6' : '#f39c12');
    a.style.color = color;
    a.style.textShadow = `0 10px 40px ${color}`;
    a.classList.remove('show');
    void a.offsetWidth;
    a.classList.add('show');
    document.body.classList.add(m >= 5 ? 'shake-3' : (m >= 3 ? 'shake-2' : 'shake-1'));
    setTimeout( () => document.body.classList.remove(m >= 5 ? 'shake-3' : (m >= 3 ? 'shake-2' : 'shake-1')), 500);
}
function showPraise(text, color) {
    const praiseEl = document.createElement('div');
    praiseEl.className = 'praise-text';
    praiseEl.innerText = text;
    praiseEl.style.color = color;
    praiseEl.style.textShadow = `0 10px 20px rgba(0,0,0,0.5), 0 0 20px ${color}, 0 0 40px ${color}`;
    document.body.appendChild(praiseEl);
    setTimeout( () => {
        if (praiseEl.parentNode)
            praiseEl.remove();
    }
    , 1200);
}

function tallyPoints(pts) {
    turnPoints += pts;
    const f = document.getElementById('floating-score');
    f.innerText = pts > 0 ? `+${pts}` : pts;
    f.style.color = pts < 0 ? '#e74c3c' : '#27ae60';
    f.style.textShadow = pts < 0 ? '0 4px 10px rgba(231, 76, 60, 0.4)' : '0 4px 10px rgba(46, 204, 113, 0.4)';
    f.style.fontSize = `${Math.min(1.5 + (Math.abs(pts) / 500), 4)}rem`;
    f.classList.remove('flying');
    f.classList.add('collecting');
    if (pts >= 1000 && pts < 10000) {
        if (pts < 3000) {
            showPraise(["GÜZEL!", "SÜPER!", "BÖYLE DEVAM ET!"][Math.floor(Math.random() * 3)], "#2ecc71");
        } else if (pts < 5000) {
            showPraise(["MUHTEŞEM!!", "HARİKA!!"][Math.floor(Math.random() * 2)], "#3498db");
        } else if (pts < 20000) {
            showPraise(["EŞSİZ!!!", "DEHA!!"][Math.floor(Math.random() * 2)], "#9b59b6");
        } else if (pts < 50000) {
            showPraise("MEGA!!", "#f1c40f");
        } else {
            showPraise("ULTİMATE!!", "#e74c3c");
        }
    }
    setTimeout( () => {
        f.classList.remove('collecting');
        f.classList.add('flying');
        setTimeout( () => {
            score += pts;
            score = Math.max(0, score);
            document.getElementById('score').innerText = formatScore(score);
            let s = document.getElementById('score');
            s.style.transform = 'scale(1.3)';
            setTimeout( () => s.style.transform = 'scale(1)', 200);
        }
        , 400);
    }
    , 900);
}

function updateChestUI() {
    const stack = document.getElementById('key-stack');
    stack.innerHTML = '';
    for (let i = 0; i < Math.min(playerKeys, 5); i++) {
        let k = document.createElement('div');
        k.className = 'key-icon';
        k.innerHTML = STACK_KEY_HTML;
        stack.appendChild(k);
    }
    const btn = document.getElementById('chest-btn');
    if (playerKeys === 5) {
        btn.classList.add('ready', 'mega');
        setTimeout(openMegaChest, 1000);
    } else if (playerKeys > 0) {
        btn.classList.add('ready');
        btn.classList.remove('mega');
    } else {
        btn.classList.remove('ready', 'mega');
    }
}
function updateMultUI() {
    const m = document.getElementById('mult-info');
    if (activeMultiplier.turns > 0) {
        m.style.opacity = '1';
        document.getElementById('mult-turns').innerText = activeMultiplier.turns;
    } else {
        m.style.opacity = '0';
        activeMultiplier.active = false;
    }
}
function openChest() {
    if (isGameOverSequence || document.body.classList.contains('death-mode') || activeAnimations > 0 || playerKeys <= 0 || playerKeys >= 5)
        return;
    playerKeys--;
    stats.chestsOpened++;
    updateChestUI();
    popOutLoot(rollLoot(), 0);
}
function openMegaChest() {
    if (isGameOverSequence || document.body.classList.contains('death-mode') || activeAnimations > 0)
        return;
	playerKeys = Math.max(0, playerKeys - 5);
    	stats.megaChestsOpened++;
    	updateChestUI();
    	let guaranteedJoker = {
        type: 'joker',
        val: ['hammer', 'shuffle', 'undo', '1x1'][Math.floor(Math.random() * 4)]
    };
    if (playerJokers.length >= 3)
        guaranteedJoker = {
            type: 'pts',
            val: 1000
        };

    // Klasik ganimetleri fırlat
    [{
        type: 'pts',
        val: 1000
    }, {
        type: 'mult',
        val: 5
    }, guaranteedJoker].forEach((l, idx) => popOutLoot(l, idx * 600));

    // YENİ: Ganimetlerden hemen sonra (yaklaşık 1.8 saniye sonra) rastgele bloğu dönüştür!
    setTimeout(() => {
        transformRandomBlockToSpecial();
    }, 1800);
}

// YENİ FONKSİYON: Mega Sandıktan uçup haritadaki bir bloğu dönüştüren sihir
function transformRandomBlockToSpecial() {
    let validTargets = [];
    let curses = ['scoreDown', 'skull', 'cursedKey', 'minus'];

    // 1. ADIM: Uygun hedefleri bul (Sadece '1' yani normal bloklar veya lanetli bloklar. Anahtar ve Özel bloklar hariç)
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            let type = boardState[r][c];
            if (type === 1 || curses.includes(type)) {
                validTargets.push({ r, c });
            }
        }
    }

    // Eğer haritada hiç normal veya lanetli blok yoksa işlemi iptal et
    if (validTargets.length === 0) return;

    // 2. ADIM: Hedefi ve yeni verilecek özel gücü rastgele seç
    let target = validTargets[Math.floor(Math.random() * validTargets.length)];
    let targetCell = boardEl.children[target.r * 9 + target.c];
    
    // Verilebilecek güzel özel blok havuzu (İstersen buraya 'M' veya başka bloklar da ekleyebilirsin)
    let specialPool = ['+', 'row', 'col', '?', 'X', 'life', 'multX', 'scoreUp'];
    let newSpecialType = specialPool[Math.floor(Math.random() * specialPool.length)];

    // 3. ADIM: Animasyonu Başlat
    activeAnimations++; // Motorun turu bitirmesini engelle
    const chestBtn = document.getElementById('chest-btn');
    const cRect = chestBtn.getBoundingClientRect();
    const tRect = targetCell.getBoundingClientRect();

    // Uçacak olan ikonu yarat
    const flyEl = document.createElement('div');
    flyEl.style.position = 'absolute';
    flyEl.style.zIndex = '9999';
    flyEl.style.width = '40px';
    flyEl.style.height = '40px';
    flyEl.style.left = cRect.left + 'px';
    flyEl.style.top = cRect.top + 'px';
    
    // Güvenlik: getIconHTML fonksiyonu mevcutsa onu kullan, yoksa direkt image bas
    if (typeof getIconHTML === 'function') {
        flyEl.innerHTML = getIconHTML(newSpecialType, target.r, target.c);
    } else {
        flyEl.innerHTML = `<img src="icons/${newSpecialType}.png" style="width:100%;height:100%;object-fit:contain;">`;
    }

    flyEl.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s';
    document.body.appendChild(flyEl);

    // Sandıktan hedefe doğru uçur
    setTimeout(() => {
        let distX = tRect.left - cRect.left + (tRect.width / 2 - 20);
        let distY = tRect.top - cRect.top + (tRect.height / 2 - 20);
        // Havada takla atarak gitsin
        flyEl.style.transform = `translate(${distX}px, ${distY}px) scale(1.2) rotate(360deg)`;
    }, 50);

    // 4. ADIM: Hedefe Ulaştığında Tahtayı Güncelle
    setTimeout(() => {
        if (flyEl.parentNode) flyEl.remove();

        // Arka plan durumunu güncelle (Tahtaya işle)
        boardState[target.r][target.c] = newSpecialType;
        
        // Eğer hedef lanetliyse (eksi puan vs), onunla ilgili özel durumları temizle
        if (specialBlockStates[`${target.r},${target.c}`]) {
             delete specialBlockStates[`${target.r},${target.c}`];
        }

        // Hücrenin görüntüsünü güncelle
        if (typeof getIconHTML === 'function') {
            targetCell.innerHTML = getIconHTML(newSpecialType, target.r, target.c);
        }
        
        // Varsa lanet görselini (mor dumanlar vb.) kaldır
        targetCell.classList.remove('cursed-cell'); 
        
        // Havalı bir parlama efekti ile değiştiğini belli et
        targetCell.classList.add('grid-crazy-anim'); 
        
        setTimeout(() => {
            targetCell.classList.remove('grid-crazy-anim');
        }, 600);

        // İşlemi bitir ve oyun motoruna devam et komutu ver
        activeAnimations--;
        if (typeof finalizeTurn === 'function') finalizeTurn();
    }, 850);
}

function popOutLoot(loot, delay) {
    activeAnimations++;
    setTimeout( () => {
        const chestBtn = document.getElementById('chest-btn');
        chestBtn.classList.add('chest-pop-anim');
        setTimeout( () => chestBtn.classList.remove('chest-pop-anim'), 300);
        let data = getLootData(loot);
        const lootEl = document.createElement('div');
        lootEl.innerHTML = `<img src="${data.iconPath}" style="width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 10px 15px rgba(0,0,0,0.3));" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><div style="display:none; font-size:3.5rem;">${data.emoji}</div>`;
        lootEl.style.position = 'absolute';
        lootEl.style.zIndex = '9999';
        lootEl.style.width = '60px';
        lootEl.style.height = '60px';
        const cRect = chestBtn.getBoundingClientRect();
        lootEl.style.left = cRect.left + 'px';
        lootEl.style.top = cRect.top + 'px';
        lootEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        document.body.appendChild(lootEl);
        const popX = (Math.random() * 80 - 40);
        const popUpY = -70 - (Math.random() * 30);
        const dirX = popX > 0 ? 1 : -1;
        const textEl = document.createElement('div');
        textEl.innerText = data.text;
        textEl.style.position = 'absolute';
        textEl.style.top = '70px';
        textEl.style.left = '50%';
        textEl.style.transform = 'translateX(-50%)';
        textEl.style.color = '#fff';
        textEl.style.background = '#34495e';
        textEl.style.padding = '5px 10px';
        textEl.style.borderRadius = '5px';
        textEl.style.fontSize = '14px';
        textEl.style.whiteSpace = 'nowrap';
        textEl.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        lootEl.appendChild(textEl);
        setTimeout( () => {
            lootEl.style.transform = `translate(${popX}px, ${popUpY}px) scale(1.2) rotate(${Math.random() * 30 - 15}deg)`;
            setTimeout( () => {
                const groundY = 40;
                lootEl.style.transition = 'transform 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
                lootEl.style.transform = `translate(${popX + (dirX * 10)}px, ${groundY}px) scale(1) rotate(0deg)`;
                setTimeout( () => {
                    lootEl.style.transition = 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
                    lootEl.style.transform = `translate(${popX + (dirX * 20)}px, ${groundY - 20}px) scale(1)`;
                    setTimeout( () => {
                        let finalX = popX + (dirX * 25);
                        lootEl.style.transition = 'transform 0.2s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
                        lootEl.style.transform = `translate(${finalX}px, ${groundY}px) scale(1)`;
                        setTimeout( () => {
                            textEl.remove();
                            let targetRect;
                            if (loot.type === 'joker') {
                                let slotIdx = playerJokers.length;
                                if (slotIdx > 2)
                                    slotIdx = 2;
                                targetRect = document.getElementById(`jk-${slotIdx}`).getBoundingClientRect();
                            } else if (loot.type === 'pts') {
                                targetRect = document.getElementById('score').getBoundingClientRect();
                            } else {
                                targetRect = document.getElementById('mult-info').getBoundingClientRect();
                            }
                            const distX = targetRect.left + targetRect.width / 2 - (cRect.left + finalX);
                            const distY = targetRect.top + targetRect.height / 2 - (cRect.top + groundY);
                            lootEl.style.transition = 'transform 0.6s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.6s ease-in';
                            lootEl.style.transform = `translate(${distX + finalX}px, ${distY + groundY}px) scale(0.3)`;
                            lootEl.style.opacity = '0';
                            setTimeout( () => {
                                if (lootEl.parentNode)
                                    lootEl.remove();
                                if (loot.type === 'pts') {
                                    let finalPts = loot.val * combo;
                                    if (activeMultiplier.active && activeMultiplier.turns > 0) {
                                        activeAnimations++;
                                        let flyX = document.createElement('div');
                                        flyX.className = 'fly-x-anim';
                                        flyX.innerText = `x5`;
                                        flyX.style.left = (targetRect.left + 40) + 'px';
                                        flyX.style.top = (targetRect.top - 40) + 'px';
                                        document.body.appendChild(flyX);
                                        setTimeout( () => {
                                            flyX.style.transform = `translate(-40px, 40px) scale(0.5)`;
                                            flyX.style.opacity = '0';
                                        }
                                        , 50);
                                        setTimeout( () => {
                                            if (flyX.parentNode)
                                                flyX.remove();
                                            tallyPoints(finalPts * 5);
                                            activeAnimations--;
                                            finalizeTurn();
                                        }
                                        , 850);
                                    } else {
                                        tallyPoints(finalPts);
                                    }
                                } else if (loot.type === 'mult') {
                                    if (activeMultiplier.active)
                                        activeMultiplier.turns += loot.val;
                                    else {
                                        activeMultiplier.active = true;
                                        activeMultiplier.turns = loot.val;
                                    }
                                    updateMultUI();
                                } else if (loot.type === 'joker') {
                                    let jData = {
                                        type: loot.val
                                    };
                                    if (jData.type === '1x1')
                                        jData.count = 3;
                                    playerJokers.push(jData);
                                    updateJokerUI();
                                }
                                activeAnimations--;
                                finalizeTurn();
                            }
                            , 600);
                        }
                        , 1000);
                    }
                    , 200);
                }
                , 400);
            }
            , 50);
        }
        , 50);
    }
    , delay);
}

function getJokerTooltipDesc(type) {
    if (type === 'hammer') return t('desc_hammer');
    if (type === '1x1') return t('desc_1x1');
    if (type === 'shuffle') return t('desc_shuffle');
    if (type === 'undo') return t('desc_undo');
    return "";
}
function updateJokerUI() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`jk-${i}`);
        slot.innerHTML = '';
        slot.className = 'joker-slot';
        slot.onclick = null;
        slot.onpointerdown = null;
        if (playerJokers[i]) {
            slot.classList.add('has-item');
            let t = playerJokers[i].type;
            let path = `icons/${t}.png`;
            let fallback = '';
            if (t === 'hammer')
                fallback = '🔨';
            else if (t === 'shuffle')
                fallback = '🔀';
            else if (t === 'undo')
                fallback = '↩️';
            else if (t === '1x1') {
                fallback = '🟩';
                slot.innerHTML += `<div class="joker-badge">${playerJokers[i].count}</div>`;
            }
            let tooltipHtml = `<div class="special-tooltip">${getJokerTooltipDesc(t)}</div>`;
            slot.innerHTML += `<img src="${path}" class="custom-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><div style="display:none; font-size:1.5rem;">${fallback}</div>${tooltipHtml}`;
            if (t === 'undo' || t === 'shuffle') {
                slot.onclick = () => {
                    if (!jokerPressIsLong)
                        activateJoker(i);
                }
                ;
            }
        }
    }
}
function activateJoker(idx) {
    if (isGameOverSequence || activeAnimations > 0 || document.body.classList.contains('death-mode'))
        return;
    let j = playerJokers[idx];
    if (!j)
        return;
    if (activeJokerMode) {
        activeJokerMode = null;
        hammerLockedPos = null;
        oneByOneLockedPos = null;
        updateJokerUI();
        clearGhost();
        return;
    }
    if (j.type === 'undo') {
        if (!historyState)
            return;
        boardState = historyState.board.map(row => [...row]);
        currentPiecesData = JSON.parse(JSON.stringify(historyState.pieces));
        combo = historyState.combo;
        gameState = JSON.parse(JSON.stringify(historyState.gs));
        document.getElementById('base-score-val').innerText = gameState.baseBlockScore;
        totalTurns = historyState.totalTurns;
        specialBlockStates = JSON.parse(JSON.stringify(historyState.specialStates));
        let oldTurns = (historyState.mult && historyState.mult.active) ? historyState.mult.turns : 0;
        let curTurns = activeMultiplier.active ? activeMultiplier.turns : 0;
        if (oldTurns > curTurns)
            activeMultiplier = {
                ...historyState.mult
            };
        score -= (historyState.earnedPoints || 0);
        rawScore = Math.max(0, rawScore - (historyState.earnedPoints > 0 ? 5 : 0));
        document.getElementById('score').innerText = formatScore(score);
        if (historyState.earnedKeys) {
            playerKeys -= historyState.earnedKeys;
            if (playerKeys < 0)
                playerKeys = 0;
        }
        if (historyState.dw)
            deathWave = JSON.parse(JSON.stringify(historyState.dw));
        if (deathWave.active && !deathWave.inDeathTurn) {
            document.getElementById('death-header-ui').style.display = 'flex';
            document.getElementById('normal-header-ui').style.display = 'none';
            updateDeathWaveUI();
        } else if (!deathWave.active) {
            document.getElementById('death-header-ui').style.display = 'none';
            document.getElementById('normal-header-ui').style.display = 'flex';
        }
        updateComboUI();
        updateChestUI();
        updateMultUI();
        renderPieces();
        updateTrayPiecesState();
        updateBoardVisually();
        playerJokers.splice(idx, 1);
        updateJokerUI();
        historyState = null;
        saveGameState();
        checkGameOver();
    } else if (j.type === 'shuffle') {
        generatePieces(true);
        playerJokers.splice(idx, 1);
        updateJokerUI();
        saveGameState();
        checkGameOver();
    }
}
function updateBoardVisually() {
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++) {
            const cell = boardEl.children[r * 9 + c];
            cell.className = `cell ${(Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 1 ? 'nth-region' : ''}`;
            cell.style.backgroundColor = '';
            cell.innerHTML = '';
            let type = boardState[r][c];
            if (type !== 0) {
                cell.classList.add('filled');
                cell.style.backgroundColor = gameThemeColor;
                if (type !== 1) {
                    cell.innerHTML = getIconHTML(type, r, c);
                    if (['scoreDown', 'skull', 'cursedKey', 'minus'].includes(type))
                        cell.classList.add('cursed-cell');
                }
            }
        }
}

// --- İSTATİSTİK FONKSİYONLARI VE SLIDER ---
function renderStatsUI() {
    let topS = topScores.length > 0 ? formatScore(topScores[0].score) : '0';
    let topR = topScores.length > 0 ? topScores[0].rawScore || 0 : '0';
    document.getElementById('stat-hs').innerText = topS;
    document.getElementById('stat-h-raw').innerText = topR;

    let listHtml = topScores.slice(0, 10).map( (s, i) => `<div class="rs-item"><span>#${i + 1}</span><span>${formatScore(s.score)} 🛡️ ${s.rawScore || 0}</span></div>`).join('');
    document.getElementById('recent-scores-list').innerHTML = listHtml || '<div style="color:#7f8c8d; text-align:center;">Henüz kayıt yok.</div>';

let sessHtml = '';
    if (stats.maxPointsInMove > 0)
        sessHtml += `<li>${t('stat_points_move')}: <span>${formatScore(stats.maxPointsInMove)}</span></li>`;
    if (stats.maxBlocksInMove > 0)
        sessHtml += `<li>${t('stat_blocks_move')}: <span>${stats.maxBlocksInMove}</span></li>`;
    if (stats.maxCombo > 1)
        sessHtml += `<li>${t('stat_max_combo')}: <span>x${stats.maxCombo}</span></li>`;
    if (stats.deathWavesSurvived > 0)
        sessHtml += `<li>${t('stat_death_survived')}: <span>${stats.deathWavesSurvived}</span></li>`;
    if (stats.chestsOpened > 0)
        sessHtml += `<li>${t('stat_chests')}: <span>${stats.chestsOpened}</span></li>`;
    if (stats.megaChestsOpened > 0)
        sessHtml += `<li>${t('stat_mega_chests')}: <span>${stats.megaChestsOpened}</span></li>`;
    if (stats.maxBaseScore > 10)
        sessHtml += `<li>${t('stat_base_score')}: <span>${stats.maxBaseScore}</span></li>`;
    if (stats.hammersUsed > 0)
        sessHtml += `<li>${t('stat_hammers')}: <span>${stats.hammersUsed}</span></li>`;
    if (stats.maxPenalty > 0)
        sessHtml += `<li>${t('stat_max_penalty')}: <span>-${formatScore(stats.maxPenalty)}</span></li>`;
    if (stats.invalidPlacements > 0)
        sessHtml += `<li>${t('stat_invalid_placements')}: <span>${stats.invalidPlacements}</span></li>`;
    if (stats.cursedBlocksNeutralized > 0)
        sessHtml += `<li>${t('stat_curses_cleared')}: <span>${stats.cursedBlocksNeutralized}</span></li>`;

    document.getElementById('session-stats-list').innerHTML = sessHtml || `<div style="color:#7f8c8d; text-align:center;">${t('no_data')}</div>`;
}

function toggleStats(fromGameOver = false) {
    const overlay = document.getElementById('board-stats-overlay');
    overlay.classList.add('show');
    
    // X butonunu sadece menüden açıldıysa göster, oyun bittiyse gizle!
    if(document.getElementById('close-stats-btn')) {
        document.getElementById('close-stats-btn').style.display = fromGameOver ? 'none' : 'block';
    }
    
    renderStatsUI();
    document.getElementById('stats-dots').style.display = 'flex';
    setTimeout(() => { document.getElementById('in-board-stats-content').classList.add('show'); }, 100);
    setSlide(fromGameOver ? 1 : 0);
}

function closeStats() {
    const overlay = document.getElementById('board-stats-overlay');
    overlay.classList.remove('show');
    document.getElementById('in-board-stats-content').classList.remove('show');
    
    // Oyun bitişi değilse yeni Grid Menüyü tekrar aç
    if (!isGameRunning && !isGameOverSequence) {
        if (typeof showMainMenuOnGrid === "function") {
            showMainMenuOnGrid();
        }
    }
    
    // Filtreyi sadece 'none' yapmakla kalma, HTML üzerinden tamamen sil (En temiz yöntem)
    const boardEl = document.getElementById('board');
    if (boardEl) {
        boardEl.style.filter = ""; 
        boardEl.style.removeProperty('filter');
    }
}

function setSlide(idx) {
    const track = document.getElementById('slider-track');
    const dots = document.querySelectorAll('.dot');
    if (!track)
        return;
    currentSlide = idx;
    track.style.transform = `translateX(-${idx * 50}%)`;
    if (dots) {
        dots.forEach(d => d.classList.remove('active'));
        if (dots[idx])
            dots[idx].classList.add('active');
    }
}

const overlayEl = document.getElementById('board-stats-overlay');
if (overlayEl) {
    overlayEl.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }
    );
    overlayEl.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) {
            setSlide(1);
        }
        if (touchEndX > touchStartX + 50) {
            setSlide(0);
        }
    }
    );
}
// 1. ANA MENÜYE DÖNÜŞ FONKSİYONU
window.returnToMainMenu = function() {
    isGameOverSequence = false;
    isGameRunning = false;

    // Bitiş butonlarını gizle
    document.getElementById('gameover-btn-group').style.display = 'none';
    
    // Animasyonlu merkezi skoru gizle, normal oyun öğelerini geri getir
    if(document.getElementById('final-score-centered-display')) {
        document.getElementById('final-score-centered-display').style.display = 'none';
        document.getElementById('final-score-centered-display').style.animation = 'none';
    }
    if(document.getElementById('normal-game-elements-left')) {
        document.getElementById('normal-game-elements-left').style.opacity = '1';
    }
    if(document.getElementById('normal-game-extras-right')) {
        document.getElementById('normal-game-extras-right').style.display = 'flex';
    }

    // Header'ı başlangıç haline getir
    document.getElementById('normal-header-ui').style.display = 'none';
    document.getElementById('death-header-ui').style.display = 'none';
    document.getElementById('start-header-ui').style.display = 'flex';
    
    // Skoru sıfırla ve Tahtayı temizle
    score = 0;
    document.getElementById('score').innerText = '0';
    const boardEl = document.getElementById('board');
    if(boardEl) {
        Array.from(boardEl.children).forEach(cell => {
            cell.className = 'cell'; 
            cell.innerHTML = ''; 
            cell.style.backgroundColor = '';
        });
    }
    
    // İstatistik panelini kapat, yeni menüyü tetikle
    closeStats(); 
};

// 2. TERTEMİZ BAŞLANGIÇ EKRANI (Sayfa ilk yüklendiğinde ve Ana Menüde çalışır)
function initInteractiveStart() {
    isGameOverSequence = false;

    // Animasyonlu merkezi skoru gizle, normal oyun öğelerini geri getir
    if(document.getElementById('final-score-centered-display')) {
        document.getElementById('final-score-centered-display').style.display = 'none';
        document.getElementById('final-score-centered-display').style.animation = 'none';
    }
    if(document.getElementById('normal-game-elements-left')) {
        document.getElementById('normal-game-elements-left').style.opacity = '1';
    }
    if(document.getElementById('normal-game-extras-right')) {
        document.getElementById('normal-game-extras-right').style.display = 'flex';
    }

    document.getElementById('board').style.filter = "none";
    document.getElementById('board-stats-overlay').classList.remove('show');
    document.getElementById('in-board-stats-content').classList.remove('show');

    if (document.getElementById('close-stats-btn')) {
        document.getElementById('close-stats-btn').style.display = 'none';
    }

    startDragWrapper.style.visibility = 'visible';
    startDragWrapper.style.transform = 'translate(0px, 0px) scale(1)';

    if (document.getElementById('start-drag-wrapper').parentElement) {
        document.getElementById('start-drag-wrapper').parentElement.style.display = 'flex';
    }

    setGameState('START');
    startIdleAnimation();
}

// 3. YENİ: TEKRAR OYNA BUTONUNA BASILINCA DİREKT OYUNA GİREN SİSTEM
window.playAgainDirectly = function() {
    isGameOverSequence = false;
    isGameRunning = false;

    // Oyun sonu UI ekranlarını kapat
    document.getElementById('gameover-btn-group').style.display = 'none';
    document.getElementById('board-stats-overlay').classList.remove('show');
    document.getElementById('in-board-stats-content').classList.remove('show');
    document.getElementById('board').style.filter = "none";

    // Animasyonlu devasa skoru gizle, normal oyun içi barları geri getir
    if(document.getElementById('final-score-centered-display')) {
        document.getElementById('final-score-centered-display').style.display = 'none';
        document.getElementById('final-score-centered-display').style.animation = 'none';
    }
    if(document.getElementById('normal-game-elements-left')) {
        document.getElementById('normal-game-elements-left').style.opacity = '1';
    }
    if(document.getElementById('normal-game-extras-right')) {
        document.getElementById('normal-game-extras-right').style.display = 'flex';
    }

    // Tahtayı tamamen temizle
    const boardEl = document.getElementById('board');
    if(boardEl) {
        Array.from(boardEl.children).forEach(cell => {
            cell.className = 'cell'; 
            cell.innerHTML = ''; 
            cell.style.backgroundColor = '';
        });
    }

    // Beklemeden direkt oyunu başlat!
    setGameState('PLAYING');
    startGame();
};

// ==========================================
// AYARLAR SİSTEMİ VE HAFIZA
// ==========================================

function saveUserSettings() {
    localStorage.setItem('blockmania_settings', JSON.stringify(userSettings));
}

function initSettingsUI() {
    document.getElementById('volume-slider').value = userSettings.volume;
    document.getElementById('vol-val-text').innerText = userSettings.volume + '%';
    
    document.getElementById('motion-toggle').checked = userSettings.motionEnabled;

    const container = document.getElementById('theme-swatches');
    container.innerHTML = '';
    
    // Rastgele (Default) Butonu
    const randBtn = document.createElement('div');
    randBtn.style.cssText = `min-width:45px; height:45px; border-radius:10px; background:linear-gradient(45deg, #3498db, #e74c3c, #f1c40f, #2ecc71); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem; border: 3px solid ${userSettings.fixedThemeColor === null ? '#2c3e50' : 'transparent'}; box-shadow: 0 4px 8px rgba(0,0,0,0.1); flex-shrink:0;`;
    randBtn.innerHTML = '🎲';
    randBtn.onclick = () => window.selectThemeColor(null);
    container.appendChild(randBtn);

    // Paletteki Renkler
    PALETTE.forEach(color => {
        const btn = document.createElement('div');
        btn.style.cssText = `min-width:45px; height:45px; border-radius:10px; background:${color}; cursor:pointer; border: 3px solid ${userSettings.fixedThemeColor === color ? '#2c3e50' : 'transparent'}; box-shadow: 0 4px 8px rgba(0,0,0,0.1); flex-shrink:0;`;
        btn.onclick = () => window.selectThemeColor(color);
        container.appendChild(btn);
    });
}

window.openSettings = function() {
    initSettingsUI();
    document.getElementById('settings-overlay').style.display = 'flex';
};

window.closeSettings = function() {
    document.getElementById('settings-overlay').style.display = 'none';
};

window.updateVolume = function(val) {
    userSettings.volume = val;
    document.getElementById('vol-val-text').innerText = val + '%';
    saveUserSettings();
};

window.toggleMotion = function(isChecked) {
    userSettings.motionEnabled = isChecked;
    saveUserSettings();
};

window.selectThemeColor = function(color) {
    userSettings.fixedThemeColor = color;
    saveUserSettings();
    initSettingsUI(); // Çerçeveleri güncelle
    
    // Eğer oyun oynanıyorsa, renkleri anında uygula!
    if (isGameRunning) {
        gameThemeColor = color || PALETTE[Math.floor(Math.random() * PALETTE.length)];
        currentPiecesData.forEach(p => p.c = gameThemeColor);
        renderPieces();
        updateBoardVisually();
    }
};

window.resetAllData = function() {
    let confirmMsg = typeof t === 'function' ? t('reset_confirm') : "Emin misiniz?";
    if (confirm(confirmMsg)) {
        localStorage.clear();
        location.reload();
    }
};

// Tooltip Pop-up Kapatma Mantığı (Ekranda boş bir yere basınca kapanır)
document.addEventListener('click', (e) => {
    const infoBtn = document.getElementById('motion-info-btn');
    const tooltip = document.getElementById('motion-tooltip');
    if (infoBtn && tooltip) {
        if (infoBtn.contains(e.target)) {
            tooltip.style.display = tooltip.style.display === 'none' ? 'block' : 'none';
        } else {
            tooltip.style.display = 'none';
        }
    }
});
// ==========================================
    
// ==========================================
// MOUSE İLE SÜRÜKLE-KAYDIR (DRAG TO SCROLL)
// ==========================================
const themeSlider = document.getElementById('theme-swatches');
let isDown = false;
let startX;
let scrollLeft;

if (themeSlider) {
    themeSlider.addEventListener('mousedown', (e) => {
        isDown = true;
        themeSlider.style.cursor = 'grabbing';
        startX = e.pageX - themeSlider.offsetLeft;
        scrollLeft = themeSlider.scrollLeft;
    });
    themeSlider.addEventListener('mouseleave', () => {
        isDown = false;
        themeSlider.style.cursor = 'pointer';
    });
    themeSlider.addEventListener('mouseup', () => {
        isDown = false;
        themeSlider.style.cursor = 'pointer';
    });
    themeSlider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - themeSlider.offsetLeft;
        const walk = (x - startX) * 2; // Kaydırma hızı (x2)
        themeSlider.scrollLeft = scrollLeft - walk;
    });
}

if ('serviceWorker'in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Hatası:', err));
    }
    );
}
