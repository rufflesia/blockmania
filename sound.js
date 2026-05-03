// ============================================================
// sound.js  —  BlockMania Sound & Vibration System
// Add to index.html AFTER game.js:
//   <script src="sound.js"></script>
//
// Put all audio files in:  sounds/
//
// Required files:
//   sounds/bg_loop.mp3          — background music loop
//   sounds/place.mp3            — block placed on board
//   sounds/combo_1.mp3          — combo x2
//   sounds/combo_2.mp3          — combo x3-4
//   sounds/combo_3.mp3          — combo x5+
//   sounds/new_tray.mp3         — new tray of pieces appears
//   sounds/chest_open.mp3       — chest/megachest opens
//   sounds/chest_upgrade.mp3    — chest odds upgrade (upg block)
//   sounds/area_destroy.mp3     — row/col/cross/random area block fires
//   sounds/hammer_crack.mp3     — hammer joker used
//   sounds/minus_laugh.mp3      — minus block triggered (evil laugh)
//   sounds/big_score_1.mp3      — 1000-4999 pts in one move (nice!)
//   sounds/big_score_2.mp3      — 5000-49999 pts (amazing!)
//   sounds/big_score_3.mp3      — 50000+ pts (ultimate!)
//   sounds/undo.mp3             — undo joker rewind
//   sounds/key.mp3              — key collected
//   sounds/game_over.mp3        — game over sequence
//   sounds/score_up.mp3         — per-block score increases
//   sounds/score_down.mp3       — per-block score decreases
//   sounds/random_block.mp3     — 1x1 random joker placed
//   sounds/life.mp3             — life/shield block triggered
// ============================================================

window.SFX = (function () {
    'use strict';

    // ── AUDIO CONTEXT (lazy init to satisfy autoplay policy) ──
    let ctx = null;
    let bgSource = null;
    let bgBuffer = null;
    let bgGain   = null;   // controls background volume only
    let sfxGain  = null;   // controls sfx volume only

    function getCtx() {
        if (!ctx) {
            ctx    = new (window.AudioContext || window.webkitAudioContext)();
            bgGain = ctx.createGain();
            sfxGain= ctx.createGain();
            bgGain.connect(ctx.destination);
            sfxGain.connect(ctx.destination);
            applyVolumes();
        }
        return ctx;
    }

    // ── VOLUME STATE ─────────────────────────────────────────
    // Volumes are 0-100 from sliders.
    // masterVol scales everything.  bgVol / sfxVol scale their channels.
    function getVols() {
        const s = window.userSettings || {};
        return {
            master : (s.volume    ?? 100) / 100,
            bg     : (s.volumeBg  ?? 70)  / 100,
            sfx    : (s.volumeSfx ?? 100) / 100,
        };
    }

    function applyVolumes() {
        if (!ctx) return;
        const v = getVols();
        bgGain.gain.setTargetAtTime( v.master * v.bg,  ctx.currentTime, 0.05);
        sfxGain.gain.setTargetAtTime(v.master * v.sfx, ctx.currentTime, 0.05);
    }

    // ── BUFFER CACHE ─────────────────────────────────────────
    const buffers = {};

function load(name) {
        if (buffers[name]) return Promise.resolve(buffers[name]);
        
        // YENİ IDM TAKTİĞİ: Header yerine URL sonuna sahte bir parametre ekliyoruz.
        // Bu sayede IDM dosyanın saf bir .mp3 olduğunu anlayamıyor ve tarayıcı da sorunsuz okuyor.
        return fetch(`sounds/${name}.mp3?v=${Date.now()}`)
            .then(r => { 
                if (!r.ok) throw new Error(`HTTP ${r.status}`); 
                return r.arrayBuffer(); 
            })
            .then(ab => getCtx().decodeAudioData(ab))
            .then(buf => { buffers[name] = buf; return buf; })
            .catch((err) => { 
                // ARTIK SESSİZ KALMIYORUZ: Hatayı konsola kırmızı yazdırıyoruz!
                console.warn(`Ses yüklenemedi (${name}):`, err); 
                return null; 
            });
    }
    // ── PLAY SFX ─────────────────────────────────────────────
    function play(name, opts = {}) {
        const v = getVols();
        if (v.master === 0 || v.sfx === 0) return;
        load(name).then(buf => {
            if (!buf || !ctx) return;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const g = ctx.createGain();
            g.gain.value = opts.volume ?? 1;
            src.connect(g);
            g.connect(sfxGain);
            if (opts.rate) src.playbackRate.value = opts.rate;
            src.start(ctx.currentTime + (opts.delay ?? 0));
        });
    }

    // ── BACKGROUND MUSIC ─────────────────────────────────────
    function startBg() {
        const v = getVols();
        if (v.master === 0 || v.bg === 0) return;
        if (bgSource) return;   // already running
        load('bg_loop').then(buf => {
            if (!buf) return;
            if (bgSource) return;
            bgSource = ctx.createBufferSource();
            bgSource.buffer = buf;
            bgSource.loop   = true;
            bgSource.connect(bgGain);
            bgSource.start();
        });
    }

    function stopBg() {
        if (bgSource) { try { bgSource.stop(); } catch(e){} bgSource = null; }
    }

    function resumeBg() {
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume().then(startBg);
        else startBg();
    }

    // ── VIBRATION ─────────────────────────────────────────────
    function vibe(pattern) {
        if (navigator.vibrate) navigator.vibrate(pattern);
    }

    // ── PUBLIC API ────────────────────────────────────────────
    // Call SFX.init() once on first user interaction to unlock audio
    function init() {
        getCtx();
        if (ctx.state === 'suspended') ctx.resume();
        startBg();
    }

    return {
        init,
        applyVolumes,
        resumeBg,
        stopBg,

        place()      { play('place', {volume:0.9}); vibe(20); },

        combo(level) {
            // level = current combo value (2, 3, 4, 5 …)
            const name = level <= 2 ? 'combo_1' : level <= 4 ? 'combo_2' : 'combo_3';
            // Pitch increases with each combo step: base + 0.07 per level above 2
            const rate = 1 + Math.max(0, level - 2) * 0.07;
            play(name, {rate, volume: 0.85});
            vibe(level >= 5 ? [30,10,30] : 25);
        },

        newTray()    { play('new_tray',  {volume:0.7}); },
        chestOpen()  { play('chest_open',{volume:1.0}); vibe([20,10,40]); },
        chestUpg()   { play('chest_upgrade',{volume:0.9}); vibe(30); },
        areaBlock()  { play('area_destroy',{volume:0.95}); vibe([15,5,15]); },
        hammerCrack(){ play('hammer_crack',{volume:1.0}); vibe([40,10,20,10,20]); },
        minusLaugh() { play('minus_laugh',{volume:0.85}); vibe([10,10,10,10,10]); },

        bigScore(pts) {
            if      (pts >= 50000) { play('big_score_3',{volume:1.0}); vibe([50,20,80]); }
            else if (pts >= 5000)  { play('big_score_2',{volume:0.9}); vibe([30,10,40]); }
            else if (pts >= 1000)  { play('big_score_1',{volume:0.8}); vibe(25); }
        },

        undo()       { play('undo',      {volume:0.9}); vibe(15); },
        key()        { play('key',       {volume:0.85}); vibe(12); },
        gameOver()   { stopBg(); play('game_over',{volume:1.0}); vibe([80,30,80,30,120]); },
        scoreUp()    { play('score_up',  {volume:0.8}); vibe(10); },
        scoreDown()  { play('score_down',{volume:0.8}); vibe([10,5,10]); },
        randomBlock(){ play('random_block',{volume:0.8}); vibe(12); },
        life()       { play('life',      {volume:0.9}); vibe([10,10,20]); },
    };
})();

// ── AUTO-INIT ON FIRST TOUCH / CLICK ────────────────────────
(function () {
    function onFirst() {
        SFX.init();
        document.removeEventListener('pointerdown', onFirst);
        document.removeEventListener('keydown',     onFirst);
    }
    document.addEventListener('pointerdown', onFirst);
    document.addEventListener('keydown',     onFirst);
})();