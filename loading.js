// ============================================================
// loading.js  —  BlockMania Loading Screen
// Drop this file in your project root.
// In index.html, add BEFORE all other scripts:
//   <script src="loading.js"></script>
// ============================================================

(function () {
    'use strict';

    // ── CONFIG ───────────────────────────────────────────────
    // How many background images you have (background1_mobile.png … background5_mobile.png)
    const BG_COUNT = 5;

    // How long each background stays before crossfading (ms)
    const BG_ROTATE_MS = 7000;

    // Crossfade duration (ms) — must match CSS transition below
    const BG_FADE_MS = 1500;

    // Files that block the loading screen — only what the game actually
    // needs to open and be playable from the first move. Add or remove
    // entries to match your actual project files.
    const ASSETS = [
        'style.css',
        'shapes.js',
        'blocks.js',
        'opening.js',
        'game.js',
        'tutorial.js',
        'dictionary.json',

        'icons/chest.png',
        'icons/chest1.png',

        'icons/key.png',
        'icons/key_block.png',
        'icons/hammer.png',
        'icons/shuffle.png',
        'icons/undo.png',
        'icons/1x1.png',
        'icons/pts.png',
        'icons/mult.png',
        'icons/cross.png',
        'icons/row.png',
        'icons/col.png',
        'icons/random.png',
        'icons/M.png',
        'icons/X.png',
        'icons/life.png',
        'icons/multX.png',
        'icons/upg.png',
        'icons/scoreUp.png',
        'icons/scoreDown.png',
        'icons/skull.png',
        'icons/cursedKey.png',
        'icons/minus.png',
        'icons/hammer_icon.png',
        'icons/bundle1.png',
        'icons/bundle2.png',
        'icons/bundle3.png',
        'icons/bundle4.png',
        'icons/ice.png',
        'icons/megachest_describe.png',
        'icons/megacombo.png',
        'icons/multiway.png',

        'blockmania.png',
    ];

    // Files that are only needed once the player actually reaches that
    // part of the game (high chest tiers, hammer crack effect, ice-break
    // clip) — these load quietly in the background AFTER the loading
    // screen is gone, instead of holding up the player's first move.
    const DEFERRED_ASSETS = [
        'icons/chest2.png',
        'icons/chest3.png',
        'icons/chest4.png',
        'icons/chest5.png',
        'icons/chest6.png',
        'icons/chestmax.png',
        'assets/crack.png',
        'assets/ice_break.gif',
    ];

    // ── STATE ────────────────────────────────────────────────
    let loaded       = 0;
    let total        = ASSETS.length;
    let bgIndex      = 0;
    let bgTimer      = null;
    let screen       = null;   // the overlay element
    let bar          = null;   // the inner progress bar element
    let pctEl        = null;   // percentage text
    let bgA          = null;   // layer A
    let bgB          = null;   // layer B
    let activeBg     = 'A';    // which layer is currently visible
    let dismissed    = false;
    let dictReady    = false;
    let introReady   = false;

    // ── BUILD DOM ────────────────────────────────────────────
    function build() {
        const style = document.createElement('style');
        style.textContent = `
            #bm-loading {
                position: fixed;
                inset: 0;
                z-index: 99999;
                background-color: #12141a;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-end;
                padding-bottom: clamp(40px, 8vh, 80px);
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }

            /* Two full-cover layers for crossfade */
            .bm-bg-layer {
                position: absolute;
                inset: 0;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                transition: opacity ${BG_FADE_MS}ms ease;
            }

            /* Dark vignette so UI stays readable */
            #bm-loading::after {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(
                    to top,
                    rgba(0,0,0,0.75) 0%,
                    rgba(0,0,0,0.20) 50%,
                    rgba(0,0,0,0.35) 100%
                );
                pointer-events: none;
            }

            /* Everything inside goes above the vignette */
            #bm-loading-content {
                position: relative;
                z-index: 2;
                width: 90%;
                max-width: 420px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 14px;
            }

            #bm-loading-label {
                color: rgba(255,255,255,0.75);
                font-size: clamp(0.7rem, 2.5vw, 0.85rem);
                font-weight: 600;
                letter-spacing: 2px;
                text-transform: uppercase;
            }

            /* Bar track */
            #bm-bar-track {
                width: 100%;
                height: 6px;
                background: rgba(255,255,255,0.18);
                border-radius: 99px;
                overflow: hidden;
                box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
            }

            /* Bar fill */
            #bm-bar-fill {
                height: 100%;
                width: 0%;
                border-radius: 99px;
                background: linear-gradient(90deg, #2ecc71 0%, #1abc9c 50%, #3498db 100%);
                background-size: 200% 100%;
                animation: bm-shimmer 1.8s linear infinite;
                transition: width 0.25s ease-out;
                box-shadow: 0 0 10px rgba(46,204,113,0.6);
            }

            @keyframes bm-shimmer {
                0%   { background-position: 200% center; }
                100% { background-position: -200% center; }
            }

            /* Percentage */
            #bm-pct {
                color: white;
                font-size: clamp(0.75rem, 2.8vw, 0.9rem);
                font-weight: 900;
                letter-spacing: 1px;
                text-shadow: 0 2px 8px rgba(0,0,0,0.5);
            }

            /* Fade-out transition for the whole screen */
            #bm-loading.bm-hiding {
                opacity: 0;
                transition: opacity 0.5s ease;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);

        screen = document.createElement('div');
        screen.id = 'bm-loading';

        // Background layers
        bgA = document.createElement('div');
        bgA.className = 'bm-bg-layer';
        bgA.style.opacity = '1';

        bgB = document.createElement('div');
        bgB.className = 'bm-bg-layer';
        bgB.style.opacity = '0';

        screen.appendChild(bgA);
        screen.appendChild(bgB);

        // Content wrapper
        const content = document.createElement('div');
        content.id = 'bm-loading-content';

        // Label
        const label = document.createElement('div');
        label.id = 'bm-loading-label';
        label.innerText = 'LOADING';

        // Bar
        const track = document.createElement('div');
        track.id = 'bm-bar-track';
        bar = document.createElement('div');
        bar.id = 'bm-bar-fill';
        track.appendChild(bar);

        // Percentage
        pctEl = document.createElement('div');
        pctEl.id = 'bm-pct';
        pctEl.innerText = '0%';

        content.appendChild(label);
        content.appendChild(track);
        content.appendChild(pctEl);
        screen.appendChild(content);

        document.body.insertBefore(screen, document.body.firstChild);
    }

    // ── BACKGROUND ROTATION ───────────────────────────────────
    function bgVariant() {
        // Pick mobile or PC variant based on orientation — decided once,
        // since this also determines which files are actually worth
        // fetching at all (no point ever downloading the other variant).
        return (window.innerWidth < window.innerHeight) ? 'mobile' : 'pc';
    }

    function getBgSrc(index) {
        return `backgrounds/background${index}_${bgVariant()}.png`;
    }

    function setInitialBg() {
        bgIndex = Math.floor(Math.random() * BG_COUNT) + 1;
        const src = getBgSrc(bgIndex);

        // Başlangıçta ikisi de görünmez olsun (Arkadaki şık zemin rengi #12141a görünecek)
        bgA.style.opacity = '0';
        bgB.style.opacity = '0';
        activeBg = 'A';

        // Görseli arkada gizlice yükle
        const firstBgImg = new Image();
        firstBgImg.onload = () => {
            // Yükleme bitince URL'i ata ve yavaşça görünür yap
            bgA.style.backgroundImage = `url('${src}')`;
            bgA.style.opacity = '1'; // CSS'teki transition sayesinde yumuşakça belirecek
        };
        firstBgImg.src = src;
    }

    function rotateBg() {
        // Pick a different index each time
        let next = bgIndex;
        if (BG_COUNT > 1) {
            while (next === bgIndex)
                next = Math.floor(Math.random() * BG_COUNT) + 1;
        }
        bgIndex = next;

        const src = getBgSrc(bgIndex);

        if (activeBg === 'A') {
            bgB.style.backgroundImage = `url('${src}')`;
            bgB.style.opacity = '1';
            bgA.style.opacity = '0';
            activeBg = 'B';
        } else {
            bgA.style.backgroundImage = `url('${src}')`;
            bgA.style.opacity = '1';
            bgB.style.opacity = '0';
            activeBg = 'A';
        }

        bgTimer = setTimeout(rotateBg, BG_ROTATE_MS);
    }

    // ── PROGRESS TRACKING ─────────────────────────────────────
    function tick() {
        loaded++;
        const pct = Math.min(100, Math.round((loaded / total) * 100));
        bar.style.width   = pct + '%';
        pctEl.innerText   = pct + '%';
        maybeHide();
    }

    // Only safe to dismiss once every tracked critical asset has
    // downloaded, game.js has signaled that its own dictionary fetch +
    // initial translation pass is done, AND game.js's window.onload
    // handler has finished building the visible intro UI — otherwise the
    // screen could disappear while the game is still finishing its own
    // async startup, leaving a blank gap behind it.
    function maybeHide() {
        if (loaded >= total && dictReady && introReady) {
            setTimeout(hide, 300);
        }
    }

    window.__bmDictReady = function () {
        dictReady = true;
        maybeHide();
    };
    window.__bmIntroReady = function () {
        introReady = true;
        maybeHide();
    };

    function hide() {
        if (dismissed) return;
        dismissed = true;
        clearTimeout(bgTimer);
        screen.classList.add('bm-hiding');
        setTimeout(() => {
            if (screen.parentNode) screen.remove();
        }, 550);

        // Only now, once the player can actually see and play the game,
        // quietly fetch the assets that aren't needed immediately.
        loadDeferredAssets();
    }

    // ── ASSET LOADING ─────────────────────────────────────────
    // Preload only the background variant this device will actually show
    // (they don't count toward the bar). Staggered so five images don't
    // all fight the critical assets for the same handful of connections
    // right at page start — each one only needs to be ready shortly
    // before its turn in the rotation, not immediately.
    function preloadBgs() {
        const variant = bgVariant();
        for (let i = 1; i <= BG_COUNT; i++) {
            const delay = i * 1200;
            setTimeout(() => {
                const img = new Image();
                img.src = `backgrounds/background${i}_${variant}.png`;
            }, delay);
        }
    }

    // Fire-and-forget loader for assets that don't block anything and
    // aren't tracked by the progress bar.
    function loadAssetQuiet(src) {
        if (src.endsWith('.gif') || src.endsWith('.png') || src.endsWith('.jpg')) {
            const img = new Image();
            img.src = src;
        } else {
            fetch(src).catch(() => {});
        }
    }

    function loadDeferredAssets() {
        const CONCURRENCY = 2;
        let cursor = 0;
        function next() {
            if (cursor >= DEFERRED_ASSETS.length) return;
            const src = DEFERRED_ASSETS[cursor++];
            loadAssetQuiet(src);
            setTimeout(next, 150);
        }
        for (let i = 0; i < CONCURRENCY; i++) next();
    }

    function loadAsset(src) {
        return new Promise(resolve => {
            if (src.endsWith('.js')) {
                const el = document.createElement('script');
                el.src = src;
                el.onload  = () => { tick(); resolve(); };
                el.onerror = () => { tick(); resolve(); }; // still advance on error
                document.head.appendChild(el);
            } else if (src.endsWith('.css')) {
                const el = document.createElement('link');
                el.rel  = 'stylesheet';
                el.href = src;
                el.onload  = () => { tick(); resolve(); };
                el.onerror = () => { tick(); resolve(); };
                document.head.appendChild(el);
            } else if (src.endsWith('.json')) {
                fetch(src)
                    .then(() => { tick(); resolve(); })
                    .catch(() => { tick(); resolve(); });
            } else {
                // Images and other binary assets
                const img = new Image();
                img.onload  = () => { tick(); resolve(); };
                img.onerror = () => { tick(); resolve(); };
                img.src = src;
            }
        });
    }

    // ── BOOT ─────────────────────────────────────────────────
    function boot() {
        build();
        setInitialBg();
        preloadBgs();

        // Start bg rotation after first display
        bgTimer = setTimeout(rotateBg, BG_ROTATE_MS);

        // Load all critical assets in groups of 4 (parallel but controlled)
        const CONCURRENCY = 4;
        let cursor = 0;

        function next() {
            if (cursor >= ASSETS.length) return;
            const src = ASSETS[cursor++];
            loadAsset(src).then(next);
        }

        // Kick off CONCURRENCY parallel lanes
        const lanes = Math.min(CONCURRENCY, ASSETS.length);
        for (let i = 0; i < lanes; i++) next();

        // Safety: if everything takes more than 12s, force-dismiss anyway
        setTimeout(hide, 12000);
    }

    // Run immediately when the script tag is parsed
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
