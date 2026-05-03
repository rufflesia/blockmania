// opening.js - Ana Menü, Carousel ve Giriş Kontrolleri

let carouselTimer = null;

// VİTRİNDE GÖSTERİLECEK ÖĞELER
const carouselItems = [
    { src: 'icons/hammer.png', textKey: "desc_hammer" },
    { src: 'icons/1x1.png', textKey: "desc_1x1" },
    { src: 'icons/shuffle.png', textKey: "desc_shuffle" },
    { src: 'icons/undo.png', textKey: "desc_undo" },
    { src: 'icons/key.png', textKey: "desc_key" },
    { src: 'icons/cross.png', textKey: "desc_cross" },
    { src: 'icons/row.png', textKey: "desc_row" },
    { src: 'icons/col.png', textKey: "desc_col" },
    { src: 'icons/random.png', textKey: "desc_random" },
    { src: 'icons/life.png', textKey: "desc_life" },
    { src: 'icons/skull.png', textKey: "desc_skull" },
    { src: 'icons/megachest_describe.png', textKey: "desc_megachest_describe" },
    { src: 'icons/megacombo.png', textKey: "desc_megacombo" },
    { src: 'icons/multiway.png', textKey: "desc_multiway" }
];

window.startCarousel = function() {
    if(carouselTimer) clearTimeout(carouselTimer);
    const imgEl = document.getElementById('carousel-img');
    const textEl = document.getElementById('carousel-text');
    
    if(!imgEl || !textEl || document.getElementById('main-menu-overlay').style.opacity === '0') {
        clearTimeout(carouselTimer);
        return;
    }

    let randomIdx = Math.floor(Math.random() * carouselItems.length);
    let item = carouselItems[randomIdx];

    imgEl.style.opacity = 0;
    textEl.style.opacity = 0;

    setTimeout(() => {
        let translatedText = (typeof t === 'function') ? t(item.textKey) : item.textKey;
        
        textEl.innerText = translatedText;
        imgEl.src = item.src;
        
        imgEl.style.opacity = 1;
        textEl.style.opacity = 1;

        let textLen = translatedText.length;
        let displayTime = 2500 + (textLen * 60); 
        
        if(typeof isGameRunning !== 'undefined' && !isGameRunning) {
            carouselTimer = setTimeout(window.startCarousel, displayTime);
        }
    }, 400); 
};

// DOM Seçimleri (DOMContentLoaded olmadan direkt çalışır)
const mainMenuOverlay = document.getElementById('main-menu-overlay');
const playMainBtn = document.getElementById('play-main-btn');
const savePopup = document.getElementById('save-popup');
const resumeBtn = document.getElementById('resume-btn');
const newGameBtn = document.getElementById('new-game-btn');
const statsBtn = document.getElementById('menu-stats-btn');
const settingsBtn = document.getElementById('menu-settings-btn');
const tutorialBtn = document.getElementById('menu-tutorial-btn');

// OYUNUN TETİKLENDİĞİ AN (Menüyü Ekrana Getirir)
window.showMainMenuOnGrid = function() {
    mainMenuOverlay.classList.add('show');
    savePopup.classList.remove('show');
    
    document.getElementById('interactive-start-area').style.display = 'none';
    document.getElementById('pieces-container').style.display = 'flex';
    document.getElementById('menu-action-area').style.display = 'flex';
    
    for (let i = 0; i < 3; i++) {
        let pw = document.getElementById(`pw-${i}`);
        if(pw) pw.style.display = 'none';
    }

    window.startCarousel();
};

// BUTON DİNLEYİCİLERİ
if (playMainBtn) {
    playMainBtn.addEventListener('click', () => {
        if (typeof checkSavedGame === "function" && checkSavedGame()) {
            savePopup.classList.add('show');
        } else {
            startGameDirectly();
        }
    });

    resumeBtn.addEventListener('click', () => {
        savePopup.classList.remove('show');
        mainMenuOverlay.classList.remove('show');
        clearTimeout(carouselTimer);
        
        if(typeof isGameRunning !== 'undefined') isGameRunning = true; 
        if(typeof isGameOverSequence !== 'undefined') isGameOverSequence = false;
        if(typeof setGameState === 'function') setGameState('PLAYING'); 
        if(typeof loadAndResumeGame === "function") loadAndResumeGame();
    });

    newGameBtn.addEventListener('click', () => {
        savePopup.classList.remove('show');
        let key = typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'blockmania_save';
        localStorage.removeItem(key); 
        startGameDirectly();
    });

    statsBtn.addEventListener('click', () => {
        mainMenuOverlay.classList.remove('show');
        clearTimeout(carouselTimer); 
        if (typeof window.toggleStats === "function") window.toggleStats(false);
    });

    settingsBtn.addEventListener('click', () => {
        if (typeof window.openSettings === "function") window.openSettings();
    });
const blocksBtn = document.getElementById('menu-blocks-btn');
    if (blocksBtn) {
        blocksBtn.addEventListener('click', () => {
            if (typeof window.openBlocksMenu === "function") window.openBlocksMenu();
        });
    }

    tutorialBtn.addEventListener('click', () => {
        const existing = document.getElementById('tut-confirm-popup');
        if (existing) { existing.remove(); return; }

        const popup = document.createElement('div');
        popup.id = 'tut-confirm-popup';
        popup.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,.55);z-index:9000;
            display:flex;align-items:center;justify-content:center;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background:white;border-radius:20px;padding:28px 24px;
            text-align:center;width:85%;max-width:300px;
            box-shadow:0 20px 50px rgba(0,0,0,.35);
        `;

        const title = document.createElement('div');
        title.style.cssText = 'font-size:1.2rem;font-weight:900;color:#2c3e50;margin-bottom:10px;';
        title.innerText = (typeof t === 'function') ? t('tut_confirm_title') : 'Start Tutorial?';

        const body = document.createElement('div');
        body.style.cssText = 'font-size:.9rem;color:#7f8c8d;margin-bottom:22px;line-height:1.5;';
        body.innerText = (typeof t === 'function') ? t('tut_confirm_body') : 'Learn the basics step by step?';

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

        const yesBtn = document.createElement('button');
        yesBtn.style.cssText = `
            background:#2ecc71;color:white;border:none;border-radius:12px;
            padding:13px;font-size:1rem;font-weight:900;cursor:pointer;
            box-shadow:0 4px 15px rgba(46,204,113,.4);
        `;
        yesBtn.innerText = (typeof t === 'function') ? t('tut_confirm_yes') : 'Yes, Show Me!';
        yesBtn.onclick = () => {
            popup.remove();
            mainMenuOverlay.classList.remove('show');
            clearTimeout(carouselTimer);
            if (typeof window.startTutorial === 'function') window.startTutorial();
        };

        const noBtn = document.createElement('button');
        noBtn.style.cssText = `
            background:none;color:#95a5a6;border:none;
            font-size:.85rem;cursor:pointer;padding:6px;
        `;
        noBtn.innerText = (typeof t === 'function') ? t('tut_confirm_no') : "No, I'll Figure It Out";
        noBtn.onclick = () => popup.remove();

        btnRow.appendChild(yesBtn);
        btnRow.appendChild(noBtn);
        box.appendChild(title);
        box.appendChild(body);
        box.appendChild(btnRow);
        popup.appendChild(box);

        popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
        document.body.appendChild(popup);
    });
}

// Popup Dışına Tıklayınca Kapatma
document.addEventListener('click', (e) => {
    if (savePopup && savePopup.classList.contains('show') && !playMainBtn.contains(e.target) && !savePopup.contains(e.target)) {
        savePopup.classList.remove('show');
    }
});

function startGameDirectly() {
    mainMenuOverlay.classList.remove('show');
    clearTimeout(carouselTimer); 
    if(typeof isGameRunning !== 'undefined') isGameRunning = true;
    if(typeof setGameState === 'function') setGameState('PLAYING');
    if (typeof startGame === "function") startGame();
}

// ==========================================
// BLOKLAR MENÜSÜ SİSTEMİ (KESİLMEYEN AÇIKLAMALAR & SABİT KAYDIRMA)
// ==========================================

window.openBlocksMenu = function() {
    document.getElementById('blocks-overlay').style.display = 'flex';
    initBlocksMenu();
};

window.closeBlocksMenu = function() {
    document.getElementById('blocks-overlay').style.display = 'none';
    hideGlobalTooltip(); // Kapanırken açık kalan tooltip varsa temizle
};

function initBlocksMenu() {
    const specCont = document.getElementById('blocks-special-container');
    if (specCont.innerHTML !== '') return; // Zaten yüklüyse tekrar yükleme

    // 1. ÖZEL BLOKLAR
    const specialTypes = ['+', 'row', 'col', '?', 'M', 'X', 'life', 'multX', 'upg', 'scoreUp', 'scoreDown', 'cursedKey', 'minus', 'skull'];
    specialTypes.forEach(type => {
        let div = document.createElement('div');
        div.style.cssText = "position:relative; min-width:55px; height:55px; flex-shrink:0; cursor:pointer;";
        
        // game.js'deki HTML'i çekiyoruz ama içindeki tooltip metnini ayırıp Global Tooltip için saklıyoruz
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = getIconHTML(type, undefined, undefined);
        let innerTooltip = tempDiv.querySelector('.special-tooltip');
        let textContent = innerTooltip ? innerTooltip.innerHTML : '';
        if (innerTooltip) innerTooltip.remove(); // HTML'in içindekini siliyoruz (kesilmesin diye)
        
        div.innerHTML = tempDiv.innerHTML; 
        setupGlobalLongPress(div, textContent);
        specCont.appendChild(div);
    });

    // 2. TÜM MATRİS ŞEKİLLERİ (DAHA BÜYÜK)
    const shapesCont = document.getElementById('blocks-shapes-container');
    if (typeof ALL_SHAPES !== 'undefined') {
        ALL_SHAPES.forEach(shape => {
            let wrapper = document.createElement('div');
            // scale(1.2) ile %20 daha büyük, min-width ile genişlik korundu
            wrapper.style.cssText = "flex-shrink:0; transform: scale(1.2); display:flex; align-items:center; min-width: 80px; justify-content:center;";
            
            let pieceEl = document.createElement('div');
            pieceEl.className = 'piece';
            pieceEl.style.gridTemplateColumns = `repeat(${shape[0].length}, 22px)`;
            
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[0].length; c++) {
                    let cell = document.createElement('div');
                    cell.className = 'piece-cell';
                    if (shape[r][c] === 1) {
                        cell.style.backgroundColor = '#95a5a6';
                        cell.style.boxShadow = "inset 0 0 5px rgba(0,0,0,0.1)";
                    } else {
                        cell.style.visibility = 'hidden';
                    }
                    pieceEl.appendChild(cell);
                }
            }
            wrapper.appendChild(pieceEl);
            shapesCont.appendChild(wrapper);
        });
    }

    // 3. JOKERLER (SABİT ALANDA)
    const jokersCont = document.getElementById('blocks-jokers-container');
    const jokerTypes = ['hammer', '1x1', 'shuffle', 'undo'];
    jokerTypes.forEach(type => {
        let div = document.createElement('div');
        div.className = 'joker-slot has-item';
        div.style.cssText = "position:relative; min-width:55px; height:55px; flex-shrink:0; cursor:pointer; background:#f0f0f0; border-radius:10px; display:flex; justify-content:center; align-items:center;";
        
        let path = `icons/${type}.png`;
        let textContent = typeof getJokerTooltipDesc === 'function' ? getJokerTooltipDesc(type) : t('desc_' + type);
        
        div.innerHTML = `<img src="${path}" style="width:75%; height:75%; object-fit:contain; pointer-events:none;">`;
        
        setupGlobalLongPress(div, textContent);
        jokersCont.appendChild(div);
    });

    // MOUSE İLE YATAY KAYDIRMA MOTORU
    ['blocks-special-container', 'blocks-shapes-container', 'blocks-jokers-container'].forEach(id => {
        const slider = document.getElementById(id);
        let isDown = false;
        let startX, scrollLeft;
        let isDragging = false; 

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            isDragging = false;
            slider.style.cursor = 'grabbing';
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        
        slider.addEventListener('mouseleave', () => { isDown = false; slider.style.cursor = 'pointer'; });
        slider.addEventListener('mouseup', () => { isDown = false; slider.style.cursor = 'pointer'; });
        
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            isDragging = true;
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 1.5; // pürüzsüz hız
            slider.scrollLeft = scrollLeft - walk;
            hideGlobalTooltip(); // Kaydırırken tooltip'i kapat
        });
    });
}

// ==========================================
// KESİLMEYEN (GLOBAL) AÇIKLAMA (TOOLTIP) MOTORU
// ==========================================
let activeBlocksTooltip = null;

function showGlobalTooltip(element, text) {
    if (!text || text === '') return;
    if (activeBlocksTooltip) activeBlocksTooltip.remove();
    
    // Açıklamayı body'e atıyoruz, böylece menünün overflow kuralı onu kesemez
    const tooltip = document.createElement('div');
    tooltip.className = 'special-tooltip show-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        z-index: 999999;
        opacity: 1;
        visibility: visible;
        pointer-events: none;
        transition: opacity 0.2s;
        max-width: 250px;
        white-space: normal;
        text-align: center;
    `;
    tooltip.innerHTML = text;
    document.body.appendChild(tooltip);
    
    // Elementin ekrandaki yerini bulup tam üstüne konumlandır
    const rect = element.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = (rect.top - 8) + 'px'; 
    tooltip.style.transform = 'translate(-50%, -100%)';
    
    activeBlocksTooltip = tooltip;
}

function hideGlobalTooltip() {
    if (activeBlocksTooltip) {
        activeBlocksTooltip.style.opacity = '0';
        setTimeout(() => { 
            if(activeBlocksTooltip) activeBlocksTooltip.remove(); 
            activeBlocksTooltip = null; 
        }, 200);
    }
}

function setupGlobalLongPress(element, text) {
    let pressTimer;
    
    const startPress = () => {
        pressTimer = setTimeout(() => {
            showGlobalTooltip(element, text);
        }, 350); 
    };
    
    const clearPress = () => {
        clearTimeout(pressTimer);
        hideGlobalTooltip();
    };
    
    element.addEventListener('pointerdown', startPress);
    element.addEventListener('pointerup', clearPress);
    element.addEventListener('pointerleave', clearPress);
    element.addEventListener('pointercancel', clearPress);
    element.addEventListener('touchmove', clearPress, {passive: true}); 
}


window.showSmartTooltip = function(element, text) {
    if (!text || text === '') return;
    if (activeBlocksTooltip) activeBlocksTooltip.remove();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'special-tooltip'; // Animasyon CSS sınıfıyla gelecek
    tooltip.innerHTML = text;
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    
    // Elementin tam orta noktası (Okun durması gereken yer)
    const elementCenter = rect.left + (rect.width / 2);
    
    // Varsayılan sol pozisyon (Tam orta)
    let leftPos = elementCenter;
    let topPos = rect.top - 15; // Animasyonla yukarı çıkacağı için biraz pay bıraktık
    
    // EKRANIN SAĞINA VEYA SOLUNA TAŞMA HESABI
    const halfWidth = tooltipRect.width / 2;
    let shift = 0;

    if (leftPos + halfWidth > screenWidth - 15) {
        // Sağdan taşıyor, içeri çek
        shift = (leftPos + halfWidth) - (screenWidth - 15);
        leftPos -= shift;
    } else if (leftPos - halfWidth < 15) {
        // Soldan taşıyor, içeri çek
        shift = (leftPos - halfWidth) - 15;
        leftPos -= shift;
    }
    
    // OKUN KONUMUNU SABİTLE (Kutu kaydığı kadar oku ters yöne kaydır)
    // shift pozitifse kutu sola kaymıştır, ok kutunun sağında (%50 + shift) kalmalı
    const arrowPercent = 50 + (shift / tooltipRect.width * 100);
    tooltip.style.setProperty('--arrow-x', `${arrowPercent}%`);

    // Üstten taşma kontrolü
    if (topPos - tooltipRect.height < 10) {
        topPos = rect.bottom + 15;
        tooltip.classList.add('tooltip-bottom');
        // Aşağıda çıkacağı için animasyon yönünü de tersine çevirebiliriz
        tooltip.style.transform = 'translate(-50%, -120%)'; 
    }

    // Uygula
    tooltip.style.left = leftPos + 'px';
    tooltip.style.top = topPos + 'px';
    
    // Bir sonraki frame'de göster ki animasyon tetiklensin
    requestAnimationFrame(() => {
        tooltip.classList.add('show-tooltip');
    });
    
    activeBlocksTooltip = tooltip;
};

window.hideSmartTooltip = function() {
    if (activeBlocksTooltip) {
        activeBlocksTooltip.style.opacity = '0';
        setTimeout(() => { 
            if(activeBlocksTooltip) activeBlocksTooltip.remove(); 
            activeBlocksTooltip = null; 
        }, 200);
    }
}
