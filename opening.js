// opening.js - Ana Menü, Carousel ve Giriş Kontrolleri

let carouselTimer = null;

// VİTRİNDE GÖSTERİLECEK ÖĞELER (Çeviri Motoruna Bağlandı)
// HATA DÜZELTME: textKey anahtarları game.js'deki i18n sözlüğü ile birebir eşleşmeli.
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
    // index.html'deki megachest ve multiway metin anahtarlarını çağırma
    { src: 'icons/megachest_describe.png', textKey: "desc_megachest_describe" },
    { src: 'icons/megacombo.png', textKey: "desc_megacombo" },
    { src: 'icons/multiway.png', textKey: "desc_multiway" }
];

// VİTRİN (CAROUSEL) SİSTEMİ - Dil değiştiğinde tetiklenebilmesi için Global yapıldı
window.startCarousel = function() {
    if(carouselTimer) clearTimeout(carouselTimer);
    const imgEl = document.getElementById('carousel-img');
    const textEl = document.getElementById('carousel-text');
    
    // Güvenlik kontrolü
    if(!imgEl || !textEl || document.getElementById('main-menu-overlay').style.opacity === '0') {
        clearTimeout(carouselTimer);
        return;
    }

    // Rastgele bir öğe seç
    let randomIdx = Math.floor(Math.random() * carouselItems.length);
    let item = carouselItems[randomIdx];

    // 1. Önce eski içeriği görünmez yap (Solma efekti)
    imgEl.style.opacity = 0;
    textEl.style.opacity = 0;

    // 2. 400ms sonra içeriği değiştir ve tekrar görünür yap
    setTimeout(() => {
        // ÇEVİRİ MOTORU DEVREDE: Aktif dile göre metni çeker (Veya t fonksiyonu yoksa anahtarı yazar)
        let translatedText = (typeof t === 'function') ? t(item.textKey) : item.textKey;
        
        textEl.innerText = translatedText;
        imgEl.src = item.src;
        
        imgEl.style.opacity = 1;
        textEl.style.opacity = 1;

        // AKILLI ZAMANLAMA: Sabit 1.5 saniye + her harf için 60 milisaniye (Düzeltildi)
        // Uzun yazılar ekranda daha çok, kısa yazılar daha az kalır.
        let textLen = translatedText.length;
        let displayTime = 1500 + (textLen * 60); 
        
        // Zamanlayıcıyı kur (isGameRunning kontrolü ile)
        if(typeof isGameRunning !== 'undefined' && !isGameRunning) {
            carouselTimer = setTimeout(window.startCarousel, displayTime);
        }
    }, 400); 
};

document.addEventListener("DOMContentLoaded", () => {
    const mainMenuOverlay = document.getElementById('main-menu-overlay');
    const playMainBtn = document.getElementById('play-main-btn');
    const savePopup = document.getElementById('save-popup');
    const resumeBtn = document.getElementById('resume-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    
    const statsBtn = document.getElementById('menu-stats-btn');
    const settingsBtn = document.getElementById('menu-settings-btn');
    const tutorialBtn = document.getElementById('menu-tutorial-btn');

    // OYUNUN TETİKLENDİĞİ AN (Sürükle bırak bloğu yerine oturduğunda çalışır)
// OYUNUN TETİKLENDİĞİ AN (Sürükle bırak bloğu yerine oturduğunda çalışır)
    window.showMainMenuOnGrid = function() {
        mainMenuOverlay.classList.add('show');
        savePopup.classList.remove('show');
        
        document.getElementById('interactive-start-area').style.display = 'none';
        document.getElementById('pieces-container').style.display = 'flex';
        document.getElementById('menu-action-area').style.display = 'flex';
        
        // İŞTE BOZULAN YERİ DÜZELTTİĞİMİZ KISIM: 
        // Olmayan fonksiyonu çağırmak yerine bizzat döngüyle gizliyoruz.
        for (let i = 0; i < 3; i++) {
            let pw = document.getElementById(`pw-${i}`);
            if(pw) pw.style.display = 'none';
        }

        window.startCarousel();
    };
    // "OYUNA BAŞLA" BUTONU TIKLANDIĞINDA
    playMainBtn.addEventListener('click', () => {
        // Kayıtlı oyun var mı kontrol et (game.js'de checkSavedGame() tanımlı olmalı)
        if (typeof checkSavedGame === "function" && checkSavedGame()) {
            savePopup.classList.add('show');
        } else {
            startGameDirectly();
        }
    });

    // KAYITLI OYUNDAN DEVAM ET
    resumeBtn.addEventListener('click', () => {
        savePopup.classList.remove('show');
        mainMenuOverlay.classList.remove('show');
        clearTimeout(carouselTimer); // Carousel'i durdur
        
        // isGameRunning ve setGameState global tanımlı olmalı
        if(typeof isGameRunning !== 'undefined') isGameRunning = true; 
        if(typeof isGameOverSequence !== 'undefined') isGameOverSequence = false;
        if(typeof setGameState === 'function') setGameState('PLAYING'); 
        if(typeof loadAndResumeGame === "function") loadAndResumeGame();
    });

    // YENİ OYUN BAŞLAT (Kaydı silerek)
    newGameBtn.addEventListener('click', () => {
        savePopup.classList.remove('show');
        let key = typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'blockmania_save';
        localStorage.removeItem(key); 
        startGameDirectly();
    });

    // İSTATİSTİK MENÜSÜNÜ AÇ (Global toggleStats fonksiyonunu kullanma)
    statsBtn.addEventListener('click', () => {
        mainMenuOverlay.classList.remove('show');
        clearTimeout(carouselTimer); 
        if (typeof window.toggleStats === "function") window.toggleStats(false);
    });

    // DİĞER MENÜLER (Çeviri motoruna bağlandı)
// DİĞER MENÜLER
    settingsBtn.addEventListener('click', () => {
        if (typeof window.openSettings === "function") window.openSettings();
    });
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

    // Popup Dışına Tıklayınca Kapatma
    document.addEventListener('click', (e) => {
        if (savePopup.classList.contains('show') && !playMainBtn.contains(e.target) && !savePopup.contains(e.target)) {
            savePopup.classList.remove('show');
        }
    });

    // OYUNU DİREKT BAŞLATAN YARDIMCI FONKSİYON
    function startGameDirectly() {
        mainMenuOverlay.classList.remove('show');
        clearTimeout(carouselTimer); // Carousel'i kesinlikle durdur (oyun içinde arkada RAM yemesin)
        if(typeof isGameRunning !== 'undefined') isGameRunning = true;
        if(typeof setGameState === 'function') setGameState('PLAYING');
        if (typeof startGame === "function") startGame();
    }
});
