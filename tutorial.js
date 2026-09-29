// ============================================================

// tutorial.js  —  BlockMania Interactive Tutorial

// ============================================================

(function () {

    'use strict';



    // ---- local palette (safe copy, does not depend on blocks.js) ----

    const TPAL = ['#9AD914','#e02b89','#F2B749','#F26938','#D93A2B','#854BBF','#138AF2','#5451A6','#BFA77A','#8C5332'];

    const TC   = '#138AF2';   // primary tutorial piece colour

    const T2   = '#9AD914';   // secondary tutorial piece colour



    // ---- module state ----

    let tBoard       = [];    // 9×9 logical board

    let tBoardEl     = null;

    let tTrayEl      = null;

    let tOverlay     = null;

    let tChestBtn    = null;

    let tKeyStackEl  = null;

    let tJokerSlots  = [];

    let tNextBtn     = null;

    let tKeyCount    = 0;

    let tCombo       = 1;

    let tScore       = 0;

    let tAnimLock    = false;

    let tOnPlaced    = null;

    let tOnHammer    = null;

    let tStep        = 0;

    let tGhostEl     = null;

    let tGhostCells  = [];

    let tDrag        = null;

    let tHammerGhost = null;

    let tHammerHL    = [];

    let tSpotlit     = null;

    let tPopupEl     = null;

    let tSkipBtn     = null;

    let tSkipHandler = null;

    let tStepToken   = 0;

    let tWrapEl      = null;

    let t1x1Ghost    = null;

    let t1x1HL       = null;

    let t1x1LockedPos= null;

    let t1x1OnDone   = null;



    // ============================================================

    // CSS INJECTION  (tutorial-only keyframes)

    // ============================================================

    (function injectCSS() {

        if (document.getElementById('tut-css')) return;

        const s = document.createElement('style');

        s.id = 'tut-css';

        s.textContent = `

            @keyframes tutEntry {

                from { opacity:0; transform:translateY(30px) scale(.95); }

                to   { opacity:1; transform:translateY(0)    scale(1);   }

            }

            @keyframes tutPulse {

                0%,100% { transform:scale(1);    box-shadow:0 4px 15px rgba(46,204,113,.5); }

                50%      { transform:scale(1.08); box-shadow:0 6px 22px rgba(46,204,113,.8); }

            }

            @keyframes tutFadeIn { from{opacity:0} to{opacity:1} }

            @keyframes tutBounceIn {

                0%   { transform:scale(0);   }

                60%  { transform:scale(1.15);}

                80%  { transform:scale(.92); }

                100% { transform:scale(1);   }

            }

            #tut-main-overlay { animation: tutEntry .4s ease both; }

            #tut-next { animation: tutPulse 1.5s infinite; }

            #tut-skip { transition: opacity .2s, transform .15s; }

            #tut-skip:active { transform: scale(.92); }

        `;

        document.head.appendChild(s);

    })();



    // ============================================================

    // TRANSLATION HELPER

    // ============================================================

    function tt(key) {

        return (typeof t === 'function') ? t(key) : key;

    }



    // ============================================================

    // PUBLIC ENTRY POINT

    // ============================================================

    window.startTutorial = function () {

        const ex = document.getElementById('tut-main-overlay');

        if (ex) ex.remove();



        tBoard      = Array.from({length:9}, () => Array(9).fill(0));

        tKeyCount   = 0; tCombo = 1; tScore = 0;

        tAnimLock   = false; tOnPlaced = null; tStep = 0;

        tJokerSlots = []; tGhostCells = []; tHammerHL = [];

        tSkipHandler = null; tStepToken = 0;



        buildUI();

        goStep(idx('rowClear'));

    };



    // ============================================================

    // UI BUILD

    // ============================================================

    function buildUI() {

        tOverlay = mk('div');

        tOverlay.id = 'tut-main-overlay';

        css(tOverlay, `

            position:fixed;top:0;left:0;width:100%;height:100%;

            background:#f0f4f8;z-index:10000;display:flex;flex-direction:column;

            align-items:center;overflow:hidden;

            font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;

        `);



        // Fixed control layer — mirrors wrap's centered max-width so buttons

        // anchor to the visible game mockup's corners, not the raw viewport

        // corners (which is what made PC layouts feel disconnected).

        const chrome = mk('div');

        chrome.id = 'tut-chrome';

        css(chrome, `position:fixed;top:0;left:50%;transform:translateX(-50%);

                     width:100%;max-width:400px;height:100%;pointer-events:none;z-index:10018;`);



        // Exit button

        const exit = mk('button');

        css(exit, `position:absolute;top:10px;right:10px;z-index:10020;background:#e74c3c;

                   color:white;border:none;border-radius:50%;width:34px;height:34px;

                   font-size:1rem;font-weight:bold;cursor:pointer;display:flex;

                   align-items:center;justify-content:center;pointer-events:auto;`);

        exit.innerHTML = '✕';

        exit.onclick = closeTut;

        chrome.appendChild(exit);



        // Step badge

        const badge = mk('div');

        badge.id = 'tut-badge';

        css(badge, `position:absolute;top:13px;left:50%;transform:translateX(-50%);

                    font-size:.75rem;color:#7f8c8d;font-weight:bold;z-index:10020;`);

        chrome.appendChild(badge);



        // Inner wrapper (mirrors real game layout)

        const wrap = mk('div');

        css(wrap, `display:flex;flex-direction:column;align-items:center;width:100%;

                   max-width:400px;padding:45px 10px 10px;box-sizing:border-box;gap:12px;

                   transition:opacity .18s ease;`);

        tWrapEl = wrap;



        wrap.appendChild(buildHeader());



        // Board

        tBoardEl = mk('div');

        tBoardEl.id = 'tut-board';

        css(tBoardEl, `display:grid;grid-template-columns:repeat(9,1fr);grid-template-rows:repeat(9,1fr);

                       gap:4px;background:#d1d9e6;border:6px solid #d1d9e6;border-radius:12px;

                       width:100%;aspect-ratio:1;position:relative;box-sizing:border-box;`);

        initCells();

        wrap.appendChild(tBoardEl);



        // Tray

        tTrayEl = mk('div');

        tTrayEl.id = 'tut-tray';

        css(tTrayEl, `display:flex;justify-content:center;align-items:center;gap:20px;

                      width:100%;height:110px;position:relative;`);

        wrap.appendChild(tTrayEl);



        tOverlay.appendChild(wrap);



        // Next button (▶)

        tNextBtn = mk('button');

        tNextBtn.id = 'tut-next';

        css(tNextBtn, `position:absolute;bottom:22px;right:22px;z-index:10020;display:none;

                       background:#2ecc71;color:white;border:none;border-radius:50%;

                       width:52px;height:52px;font-size:1.6rem;cursor:pointer;

                       align-items:center;justify-content:center;pointer-events:auto;

                       box-shadow:0 4px 15px rgba(46,204,113,.5);`);

        tNextBtn.innerHTML = '▶';

        chrome.appendChild(tNextBtn);



        // Skip button — appears only when the current step registers a skip handler

        tSkipBtn = mk('button');

        tSkipBtn.id = 'tut-skip';

        tSkipBtn.innerText = tt('tut_skip_btn');

        css(tSkipBtn, `position:absolute;bottom:30px;left:22px;z-index:10020;display:none;

                       background:rgba(44,62,80,.55);color:white;border:none;border-radius:20px;

                       padding:9px 16px;font-size:.8rem;font-weight:bold;cursor:pointer;

                       align-items:center;justify-content:center;pointer-events:auto;

                       backdrop-filter:blur(2px);`);

        tSkipBtn.onclick = () => {

            if (!tSkipHandler) return;

            const h = tSkipHandler;

            tSkipHandler = null;

            updateSkipUI();

            h();

        };

        chrome.appendChild(tSkipBtn);



        tOverlay.appendChild(chrome);

        document.body.appendChild(tOverlay);

    }



    function buildHeader() {

        const h = mk('div');

        css(h, `background:white;border-radius:16px;padding:12px 15px;width:100%;

                box-sizing:border-box;display:flex;justify-content:space-between;

                align-items:center;box-shadow:0 10px 20px rgba(0,0,0,.05);`);



        // LEFT: score + joker slots

        const left = mk('div');

        css(left, 'display:flex;flex-direction:column;gap:8px;');



        const scoreEl = mk('div');

        scoreEl.id = 'tut-score';

        css(scoreEl, 'font-size:2rem;font-weight:900;color:#2c3e50;');

        scoreEl.innerText = '0';



        const jRow = mk('div');

        css(jRow, 'display:flex;gap:8px;');

        for (let i = 0; i < 3; i++) {

            const slot = mk('div');

            slot.id = `tut-jk-${i}`;

            css(slot, `width:38px;height:38px;background:#ecf0f1;border-radius:8px;

                       border:2px solid transparent;display:flex;justify-content:center;

                       align-items:center;cursor:default;position:relative;box-sizing:border-box;

                       touch-action:none;`);

            jRow.appendChild(slot);

            tJokerSlots.push(slot);

        }

        left.appendChild(scoreEl);

        left.appendChild(jRow);



        // RIGHT: combo + chest

        const right = mk('div');

        css(right, 'display:flex;flex-direction:column;align-items:flex-end;gap:8px;');



        const comboEl = mk('div');

        comboEl.id = 'tut-combo';

        comboEl.className = 'combo-box';

        const comboText = mk('div');

        comboText.className = 'combo-text';

        comboText.innerText = 'x1';

        comboEl.appendChild(comboText);



        const chestWrap = mk('div');

        css(chestWrap, 'position:relative;display:flex;align-items:center;');



        tChestBtn = mk('button');

        tChestBtn.id = 'tut-chest';

        css(tChestBtn, `width:55px;height:55px;background:transparent;border:none;

                        cursor:pointer;padding:0;filter:grayscale(100%);opacity:.5;transition:.3s;`);

        tChestBtn.innerHTML = `<img src="icons/chest.png" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" onerror="this.outerHTML='🎁'">`;



        tKeyStackEl = mk('div');

        css(tKeyStackEl, `position:absolute;bottom:-5px;right:-25px;display:flex;

                          flex-direction:column-reverse;pointer-events:none;`);



        chestWrap.appendChild(tChestBtn);

        chestWrap.appendChild(tKeyStackEl);

        right.appendChild(comboEl);

        right.appendChild(chestWrap);



        h.appendChild(left);

        h.appendChild(right);

        return h;

    }



    // ============================================================

    // BOARD CELL INIT / HELPERS

    // ============================================================

    function initCells() {

        tBoardEl.innerHTML = '';

        for (let r = 0; r < 9; r++) {

            for (let c = 0; c < 9; c++) {

                const cl = mk('div');

                cl.style.cssText = `

                    background:${cellBg(r,c)};border-radius:4px;position:relative;

                    display:flex;justify-content:center;align-items:center;

                    transition:background-color .15s;

                `;

                tBoardEl.appendChild(cl);

            }

        }

    }



    function cellBg(r, c) {

        return (Math.floor(r/3)+Math.floor(c/3))%2===1 ? '#dbe2e9' : '#e6ebf1';

    }



    function cl(r, c) { return tBoardEl.children[r*9+c]; }



    function fill(r, c, color) {

        if (r<0||r>=9||c<0||c>=9) return;

        tBoard[r][c] = 1;

        const cell = cl(r,c);

        cell.style.backgroundColor = color;

    }



    function emptyCell(r, c) {

        if (r<0||r>=9||c<0||c>=9) return;

        tBoard[r][c] = 0;

        const cell = cl(r,c);

        cell.style.transition = 'none';

        cell.style.backgroundColor = cellBg(r,c);

        cell.innerHTML = '';

        cell.style.animation = '';

        cell.style.boxShadow = '';

    }



    function resetBoard() {

        tBoard = Array.from({length:9},()=>Array(9).fill(0));

        initCells();

    }



    // animated clear for a single cell

    function clearCellAnim(r, c, delay) {

        return new Promise(res => {

            stepTimeout(() => {

                const cell = cl(r,c);

                cell.style.transition = 'none';

                cell.classList.add('clearing');

                stepTimeout(() => {

                    tBoard[r][c] = 0;

                    cell.classList.remove('clearing');

                    cell.style.backgroundColor = cellBg(r,c);

                    cell.style.transition = '';

                    cell.innerHTML = '';

                    res();

                }, 500);

            }, delay);

        });

    }



    function clearRowAnim(row, cb) {

        if (typeof SFX!=='undefined' && SFX.combo) SFX.combo(Math.max(1,tCombo));

        for (let c=0;c<9;c++) {

            const cell=cl(row,c);

            cell.style.transition='none';

            cell.classList.add('clearing');

        }

        stepTimeout(()=>{

            for (let c=0;c<9;c++) {

                tBoard[row][c]=0;

                const cell=cl(row,c);

                cell.classList.remove('clearing');

                cell.style.backgroundColor=cellBg(row,c);

                cell.style.transition='';

                cell.innerHTML='';

            }

            crazyGrid(cb);

        },500);

    }



    function clearColAnim(col, cb) {

        if (typeof SFX!=='undefined' && SFX.combo) SFX.combo(Math.max(1,tCombo));

        for (let r=0;r<9;r++) {

            const cell=cl(r,col);

            cell.style.transition='none';

            cell.classList.add('clearing');

        }

        stepTimeout(()=>{

            for (let r=0;r<9;r++) {

                tBoard[r][col]=0;

                const cell=cl(r,col);

                cell.classList.remove('clearing');

                cell.style.backgroundColor=cellBg(r,col);

                cell.style.transition='';

                cell.innerHTML='';

            }

            crazyGrid(cb);

        },500);

    }



    function clearBoxAnim(sr, sc, cb) {

        if (typeof SFX!=='undefined' && SFX.combo) SFX.combo(Math.max(1,tCombo));

        for (let r=sr;r<sr+3;r++) for (let c=sc;c<sc+3;c++) {

            const cell=cl(r,c);

            cell.style.transition='none';

            cell.classList.add('clearing');

        }

        stepTimeout(()=>{

            for (let r=sr;r<sr+3;r++) for (let c=sc;c<sc+3;c++) {

                tBoard[r][c]=0;

                const cell=cl(r,c);

                cell.classList.remove('clearing');

                cell.style.backgroundColor=cellBg(r,c);

                cell.style.transition='';

                cell.innerHTML='';

            }

            crazyGrid(cb);

        },500);

    }



    function crazyGrid(cb) {

        tBoardEl.classList.add('grid-crazy-anim');

        stepTimeout(()=>{

            tBoardEl.classList.remove('grid-crazy-anim');

            if (cb) cb();

        },600);

    }



    // ============================================================

    // SCORE / COMBO UI

    // ============================================================

    function addScore(pts) {

        tScore += pts;

        const el = document.getElementById('tut-score');

        if (el) el.innerText = tScore >= 10000 ? (tScore/1000).toFixed(1)+'K' : tScore;

    }



    function showCombo(v) {

        const wasBreak = (tCombo>1 && v<=1);

        tCombo = v;

        const box = document.getElementById('tut-combo');

        if (!box) return;

        const el = box.querySelector('.combo-text');

        if (wasBreak) {

            el.classList.remove('pop');

            el.classList.add('break');

            box.classList.remove('shaking');

            stepTimeout(()=>{ el.style.opacity='0'; el.classList.remove('break'); },600);

            return;

        }

        if (v > 1) {

            el.classList.remove('break');

            el.style.opacity = '1';

            el.innerText = `x${v}`;

            el.classList.remove('pop');

            void el.offsetWidth; // reflow trick, restarts the pop animation

            el.classList.add('pop');



            const intensity = (Math.min(v+1,6)-1)/12;

            box.style.setProperty('--shake-rot', (2+intensity*20)+'deg');

            box.style.setProperty('--shake-x', (1+intensity*15)+'px');

            box.style.setProperty('--shake-y', (1+intensity*15)+'px');

            box.style.setProperty('--shake-speed', (0.5-intensity*0.35)+'s');

            box.classList.add('shaking');

        } else {

            el.innerText = `x${v}`;

            el.style.opacity = '0';

            el.classList.remove('pop','break');

            box.classList.remove('shaking');

        }

    }



    function updateChestUI(readyAt=5) {

        if (!tChestBtn) return;

        if (tKeyCount >= readyAt) {

            tChestBtn.style.filter = 'drop-shadow(0 0 10px rgba(243,156,18,.8))';

            tChestBtn.style.opacity = '1';

            tChestBtn.style.animation = 'chestBounce 1.5s infinite';

        } else {

            tChestBtn.style.filter = 'grayscale(100%)';

            tChestBtn.style.opacity = '.5';

            tChestBtn.style.animation = '';

        }

        tKeyStackEl.innerHTML = '';

        for (let i=0;i<Math.min(tKeyCount,readyAt);i++) {

            const k = mk('div');

            css(k,`width:22px;height:22px;margin-top:-12px;`);

            k.innerHTML = `<img src="icons/key.png" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6));" onerror="this.outerHTML='🔑'">`;

            tKeyStackEl.appendChild(k);

        }

    }



    // ============================================================

    // SPOTLIGHT / ANNOTATION

    // ============================================================

    function spotlight(el, text, dir) {

        clearSpotlight();

        if (!el) return;

        tSpotlit = el;

        el.setAttribute('data-tut-spot','1');

        el.style.zIndex      = '10010';

        el.style.position    = el.style.position || 'relative';

        el.style.boxShadow   = '0 0 0 9999px rgba(0,0,0,.65),0 0 20px rgba(255,255,255,.15)';

        el.style.borderRadius= el.style.borderRadius || '8px';

        if (!text) return;



        const p = mk('div');

        p.id = 'tut-popup';

        css(p,`position:fixed;background:#2c3e50;color:white;padding:12px 16px;

               border-radius:12px;font-size:.9rem;font-weight:bold;max-width:250px;

               text-align:center;z-index:10012;box-shadow:0 8px 25px rgba(0,0,0,.4);

               line-height:1.5;pointer-events:none;opacity:0;transition:opacity .25s;`);

        p.innerText = text;



        const arrow = mk('div');

        css(arrow, `position:absolute;width:0;height:0;border:8px solid transparent;`);

        p.appendChild(arrow);



        document.body.appendChild(p);

        tPopupEl = p;



        requestAnimationFrame(()=>requestAnimationFrame(()=>{

            const rect   = el.getBoundingClientRect();

            const pw     = p.offsetWidth  || 250;

            const ph     = p.offsetHeight || 70;

            const margin = 14, edge = 8;



            function fits(d) {

                if (d==='top')    return rect.top - ph - margin >= edge;

                if (d==='bottom') return rect.bottom + ph + margin <= window.innerHeight - edge;

                if (d==='left')   return rect.left - pw - margin >= edge;

                return rect.right + pw + margin <= window.innerWidth - edge; // right

            }

            const opposite = {top:'bottom', bottom:'top', left:'right', right:'left'};

            let finalDir = dir || 'bottom';

            if (!fits(finalDir)) finalDir = fits(opposite[finalDir]) ? opposite[finalDir] : 'bottom';



            let left, top;

            if (finalDir==='top')          { left=rect.left+rect.width/2-pw/2; top=rect.top-ph-margin; }

            else if (finalDir==='right')   { left=rect.right+margin;               top=rect.top+rect.height/2-ph/2; }

            else if (finalDir==='left')    { left=rect.left-pw-margin;             top=rect.top+rect.height/2-ph/2; }

            else /* bottom */              { left=rect.left+rect.width/2-pw/2; top=rect.bottom+margin; }



            const cLeft = Math.max(edge, Math.min(left, window.innerWidth  - pw - edge));

            const cTop  = Math.max(edge, Math.min(top,  window.innerHeight - ph - edge));



            // Slide the arrow along the balloon's edge so it keeps pointing

            // at the target's true center even after clamping shifted the box.

            arrow.style.cssText = 'position:absolute;width:0;height:0;border:8px solid transparent;';

            if (finalDir==='top' || finalDir==='bottom') {

                const targetX = rect.left + rect.width/2;

                const ax = Math.max(14, Math.min(targetX - cLeft, pw - 14)) - 8;

                arrow.style.left = ax+'px';

                if (finalDir==='top') { arrow.style.top='100%'; arrow.style.borderTopColor='#2c3e50'; }

                else { arrow.style.bottom='100%'; arrow.style.borderBottomColor='#2c3e50'; }

            } else {

                const targetY = rect.top + rect.height/2;

                const ay = Math.max(14, Math.min(targetY - cTop, ph - 14)) - 8;

                arrow.style.top = ay+'px';

                if (finalDir==='left') { arrow.style.left='100%'; arrow.style.borderLeftColor='#2c3e50'; }

                else { arrow.style.right='100%'; arrow.style.borderRightColor='#2c3e50'; }

            }



            p.style.left = cLeft+'px';

            p.style.top  = cTop +'px';

            p.style.opacity = '1';

        }));

    }



    function clearSpotlight() {

        if (tSpotlit) {

            tSpotlit.style.zIndex     = '';

            tSpotlit.style.boxShadow  = '';

            tSpotlit.style.borderRadius = '';

            tSpotlit.removeAttribute('data-tut-spot');

            tSpotlit = null;

        }

        const p = document.getElementById('tut-popup');

        if (p) p.remove();

        tPopupEl = null;

    }



function showTryAgain(msg, cb) {

        const toast = mk('div');

        css(toast, `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);

                    background:#e74c3c;color:white;padding:14px 22px;border-radius:14px;

                    font-size:1rem;font-weight:900;z-index:10040;text-align:center;

                    box-shadow:0 8px 25px rgba(0,0,0,.4);pointer-events:none;

                    animation:tutBounceIn .3s ease both;`);

        toast.innerText = msg;

        document.body.appendChild(toast);

        stepTimeout(() => { toast.remove(); if (cb) cb(); }, 1400);

    }



    // ============================================================

    // TRAY & PIECE DRAG

    // ============================================================

    /*

     * pieceData = { shape:[[...]], color:'#hex',

     *               hasKey:bool, keyPos:{r,c},

     *               hasRowBlock:bool, rowPos:{r,c} }

     */

    function buildPieceEl(pd) {

        const wrap = mk('div');

        css(wrap,`display:flex;justify-content:center;align-items:center;cursor:grab;

                  touch-action:none;position:relative;

                  animation:smoothEntry .6s cubic-bezier(.175,.885,.32,1.275) both;`);



        const piece = mk('div');

        css(piece,`display:grid;gap:2px;pointer-events:none;

                   grid-template-columns:repeat(${pd.shape[0].length},22px);`);



        for (let r=0;r<pd.shape.length;r++) {

            for (let c=0;c<pd.shape[0].length;c++) {

                const pc = mk('div');

                css(pc,'width:22px;height:22px;border-radius:3px;position:relative;');

                if (pd.shape[r][c]===1) {

                    pc.style.backgroundColor = pd.color;

                    if (pd.hasKey && pd.keyPos && pd.keyPos.r===r && pd.keyPos.c===c) {

                        pc.innerHTML = `<img src="icons/key_block.png" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:95%;height:95%;object-fit:contain;pointer-events:none;" onerror="this.style.display='none'">`;

                    }

                    if (pd.hasRowBlock && pd.rowPos && pd.rowPos.r===r && pd.rowPos.c===c) {

                        pc.innerHTML = `<img src="icons/row.png" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;height:90%;object-fit:contain;pointer-events:none;" onerror="this.outerHTML='➖'">`;

                    }

                }

                piece.appendChild(pc);

            }

        }

        wrap.appendChild(piece);

        return wrap;

    }



    function setTray(pieces) {

        tTrayEl.innerHTML = '';

        pieces.forEach((p)=>{

            if (p) {

                const w = buildPieceEl(p);

                tTrayEl.appendChild(w);

                enableDrag(w, p);

            } else {

                const spacer=mk('div'); css(spacer,'width:66px;height:66px;'); tTrayEl.appendChild(spacer);

            }

        });

    }



    // For pieces shown only as a visual prop (not the step's actual

    // interaction) — skips enableDrag entirely so there is no way to

    // trigger placePiece() without a matching tOnPlaced handler registered.

    function setTrayStatic(pieces) {

        tTrayEl.innerHTML = '';

        pieces.forEach((p)=>{

            if (p) {

                const w = buildPieceEl(p);

                w.style.cursor = 'default';

                tTrayEl.appendChild(w);

            } else {

                const spacer=mk('div'); css(spacer,'width:66px;height:66px;'); tTrayEl.appendChild(spacer);

            }

        });

    }



    function enableDrag(wrapEl, pd) {

        wrapEl.addEventListener('pointerdown', e=>{

            if (tAnimLock) return;

            e.preventDefault();

            startDrag(e, wrapEl, pd);

        });

    }



    function startDrag(e, wrapEl, pd) {

        tDrag = {wrapEl, pd};

        wrapEl.style.opacity = '.3';

	clearSpotlight();



        tGhostEl = mk('div');

        css(tGhostEl,`position:fixed;pointer-events:none;z-index:10030;display:grid;gap:2px;

                      grid-template-columns:repeat(${pd.shape[0].length},22px);

                      filter:drop-shadow(0 25px 25px rgba(0,0,0,.4));`);

        for (let r=0;r<pd.shape.length;r++) {

            for (let c=0;c<pd.shape[0].length;c++) {

                const pc=mk('div'); css(pc,'width:22px;height:22px;border-radius:3px;');

                if (pd.shape[r][c]===1) pc.style.backgroundColor=pd.color;

                tGhostEl.appendChild(pc);

            }

        }

        document.body.appendChild(tGhostEl);

        movePieceGhost(e.clientX, e.clientY, pd, e.pointerType);

        document.addEventListener('pointermove', onPMove);

        document.addEventListener('pointerup',   onPUp);

    }



    function onPMove(e) { if (tDrag) movePieceGhost(e.clientX,e.clientY,tDrag.pd,e.pointerType); }



function movePieceGhost(x, y, pd, pointerType) {

        if (!tGhostEl) return;

        const cols=pd.shape[0].length, rows=pd.shape.length;

        const isTouch = pointerType==='touch' || window.innerWidth<=768;

        const yOffset = isTouch ? -60 : 0;

        tGhostEl.style.left = (x-cols*12)+'px';

        tGhostEl.style.top  = (y-rows*12+yOffset)+'px';



        clearGhostHL();

        const bR=tBoardEl.getBoundingClientRect();

        const cw=bR.width/9, ch=bR.height/9;

        // Center piece on finger, not top-left

        const bc=Math.floor((x-bR.left)/cw) - Math.floor(cols/2);

        const br=Math.floor((y+yOffset-bR.top)/ch) - Math.floor(rows/2);

        if (br>=0&&br<9&&bc>=0&&bc<9) {

            const valid=canPlace(pd.shape,br,bc);

            for (let r=0;r<pd.shape.length;r++) for (let c=0;c<pd.shape[0].length;c++) {

                if (pd.shape[r][c]===1) {

                    const tr=br+r,tc=bc+c;

                    if (tr>=0&&tr<9&&tc>=0&&tc<9 && tBoard[tr][tc]===0) {

                        const cell=cl(tr,tc);

                        cell.style.backgroundColor=valid?'rgba(46,204,113,.45)':'rgba(231,76,60,.4)';

                        tGhostCells.push({tr,tc,cell,origColor:cellBg(tr,tc)});

                    }

                }

            }

        }

    }



function clearGhostHL() {

        tGhostCells.forEach(({tr,tc,cell,origColor})=>{

            cell.style.backgroundColor = origColor;

        });

        tGhostCells=[];

    }



function onPUp(e) {

        document.removeEventListener('pointermove',onPMove);

        document.removeEventListener('pointerup',  onPUp);

        clearGhostHL();

        if (tGhostEl) { tGhostEl.remove(); tGhostEl=null; }

        if (!tDrag) return;

        const {wrapEl,pd}=tDrag; tDrag=null;

        wrapEl.style.opacity='';



        const bR=tBoardEl.getBoundingClientRect();

        const cw=bR.width/9, ch=bR.height/9;

        const cols=pd.shape[0].length, rows=pd.shape.length;

        const isTouch = e.pointerType==='touch' || window.innerWidth<=768;

        const yOffset = isTouch ? -60 : 0;

        const bc=Math.floor((e.clientX-bR.left)/cw) - Math.floor(cols/2);

        const br=Math.floor((e.clientY+yOffset-bR.top)/ch) - Math.floor(rows/2);

        if (br>=0&&br<9&&bc>=0&&bc<9 && canPlace(pd.shape,br,bc)) {

            placePiece(pd,br,bc,wrapEl);

        }

    }



    function canPlace(shape,sr,sc) {

        for (let r=0;r<shape.length;r++) for (let c=0;c<shape[0].length;c++) {

            if (shape[r][c]===1) {

                const tr=sr+r,tc=sc+c;

                if (tr<0||tr>=9||tc<0||tc>=9) return false;

                if (tBoard[tr][tc]!==0) return false;

            }

        }

        return true;

    }



    function placePiece(pd, sr, sc, wrapEl) {

        tAnimLock = true;

        if (typeof SFX!=='undefined' && SFX.place) SFX.place();

        let keyCell = null;

        for (let r=0;r<pd.shape.length;r++) {

            for (let c=0;c<pd.shape[0].length;c++) {

                if (pd.shape[r][c]===1) {

                    const tr=sr+r,tc=sc+c;

                    tBoard[tr][tc]=1;

                    const cell=cl(tr,tc);

                    cell.style.backgroundColor=pd.color;

                    cell.style.animation='none';

                    cell.offsetHeight;

                    cell.style.animation='smoothPop .35s cubic-bezier(.175,.885,.32,1.275)';



                    if (pd.hasKey && pd.keyPos && pd.keyPos.r===r && pd.keyPos.c===c) {

                        tBoard[tr][tc]='K';

                        cell.innerHTML=`<img src="icons/key_block.png" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:95%;height:95%;object-fit:contain;" onerror="this.style.display='none'">`;

                        keyCell=cell;

                    }

                    if (pd.hasRowBlock && pd.rowPos && pd.rowPos.r===r && pd.rowPos.c===c) {

                        tBoard[tr][tc]='row';

                        cell.innerHTML=`<img src="icons/row.png" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;height:90%;object-fit:contain;" onerror="this.outerHTML='➖'">`;

                    }

                }

            }

        }

        if (wrapEl) wrapEl.remove();

        stepTimeout(()=>{

            if (tOnPlaced) { const cb=tOnPlaced; tOnPlaced=null; cb(pd,sr,sc,keyCell); }

        },350);

    }



    // ============================================================

    // HAMMER DRAG

    // ============================================================

    function enableHammerDrag(slotEl) {

        slotEl.style.cursor='grab';

        slotEl._hammerHandler = e=>{

            if (tAnimLock) return;

            e.preventDefault();

            startHammerDrag(e, slotEl);

        };

        slotEl.addEventListener('pointerdown', slotEl._hammerHandler);

    }



    function startHammerDrag(e, slotEl) {

        tHammerGhost = mk('div');

        css(tHammerGhost,`position:fixed;pointer-events:none;z-index:10030;width:44px;height:44px;

                          filter:drop-shadow(0 10px 15px rgba(0,0,0,.4));`);

        tHammerGhost.innerHTML=`<img src="icons/hammer.png" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='🔨'">`;

        document.body.appendChild(tHammerGhost);

        darkenBoardFocus(true);

        moveHammerGhost(e.clientX,e.clientY);

        document.addEventListener('pointermove',onHMove);

        document.addEventListener('pointerup',  onHUp);

    }



    function darkenBoardFocus(on) {

        tBoardEl.style.position = tBoardEl.style.position || 'relative';

        if (on) {

            tBoardEl.style.zIndex = '10008';

            tBoardEl.style.transition = 'box-shadow .25s ease';

            tBoardEl.style.boxShadow = '0 0 0 9999px rgba(0,0,0,.6)';

        } else {

            tBoardEl.style.boxShadow = '';

            tBoardEl.style.zIndex = '';

        }

    }



    function onHMove(e) { moveHammerGhost(e.clientX,e.clientY); }



    function moveHammerGhost(x,y) {

        if (!tHammerGhost) return;

        tHammerGhost.style.left=(x-22)+'px';

        tHammerGhost.style.top =(y-54)+'px';

        clearHammerHL();

        const bR=tBoardEl.getBoundingClientRect();

        const cw=bR.width/9,ch=bR.height/9;

        const bc=Math.floor((x-bR.left)/cw);

        const br=Math.floor((y-54-bR.top)/ch);

        if (br>=0&&br<9&&bc>=0&&bc<9) {

            for (let i=0;i<2;i++) for (let j=0;j<2;j++) {

                const tr=br+i,tc=bc+j;

                if (tr<9&&tc<9) {

                    const cell=cl(tr,tc);

                    cell.style.backgroundColor='rgba(231,76,60,.6)';

                    cell.style.boxShadow='inset 0 0 15px rgba(231,76,60,.8)';

                    tHammerHL.push({tr,tc,cell});

                }

            }

        }

    }



    function clearHammerHL() {

        tHammerHL.forEach(({tr,tc,cell})=>{

            cell.style.backgroundColor = tBoard[tr][tc]!==0 ? TC : cellBg(tr,tc);

            cell.style.boxShadow='';

        });

        tHammerHL=[];

    }



    function onHUp(e) {

        document.removeEventListener('pointermove',onHMove);

        document.removeEventListener('pointerup',  onHUp);

        clearHammerHL();

        darkenBoardFocus(false);

        if (tHammerGhost) { tHammerGhost.remove(); tHammerGhost=null; }

        const bR=tBoardEl.getBoundingClientRect();

        const cw=bR.width/9,ch=bR.height/9;

        const bc=Math.floor((e.clientX-bR.left)/cw);

        const br=Math.floor((e.clientY-54-bR.top)/ch);

        if (br>=0&&br<9&&bc>=0&&bc<9) lockHammer(br,bc);

    }



    function lockHammer(sr,sc) {

        // highlight locked 2×2

        for (let i=0;i<2;i++) for (let j=0;j<2;j++) {

            const tr=sr+i,tc=sc+j;

            if (tr<9&&tc<9) {

                const cell=cl(tr,tc);

                cell.style.backgroundColor='rgba(231,76,60,.9)';

                cell.style.boxShadow='inset 0 0 20px rgba(192,57,43,1)';

                cell.style.animation='hammerBlink .5s infinite alternate';

            }

        }

        clearSpotlight();

        spotlight(tBoardEl, tt('tut_click_break'), 'top');



        tBoardEl.style.cursor='pointer';

        const handler=()=>{

            tBoardEl.removeEventListener('pointerdown',handler);

            tBoardEl.style.cursor='';

            useHammer(sr,sc);

        };

        tBoardEl.addEventListener('pointerdown',handler);

    }



    function useHammer(sr,sc) {

        tAnimLock=true;

        clearSpotlight();

        for (let i=0;i<2;i++) for (let j=0;j<2;j++) {

            const tr=sr+i,tc=sc+j;

            if (tr<9&&tc<9) { cl(tr,tc).style.animation=''; cl(tr,tc).style.boxShadow=''; }

        }

        if (typeof SFX!=='undefined' && SFX.hammerCrack) SFX.hammerCrack();

        // Shake overlay

        tOverlay.style.animation='shake .4s cubic-bezier(.36,.07,.19,.97) both';

        stepTimeout(()=>tOverlay.style.animation='',400);



        // Crack effect

        const bR=tBoardEl.getBoundingClientRect();

        const cw=bR.width/9,ch=bR.height/9;

        const crackDiv=mk('div');

        css(crackDiv,`position:fixed;left:${bR.left+sc*cw+cw/2}px;top:${bR.top+sr*ch+ch/2}px;

                      transform:translate(calc(-50% + 20px),calc(-50% + 18px));

                      width:70px;height:70px;pointer-events:none;z-index:10025;

                      animation:crackAnim 1.5s ease-out forwards;`);

        crackDiv.innerHTML=`<img src="assets/crack.png" style="width:100%;height:100%;object-fit:contain;">`;

        document.body.appendChild(crackDiv);

        stepTimeout(()=>crackDiv.remove(),1500);



        // Clear 2×2 cells

        stepTimeout(()=>{

            for (let i=0;i<2;i++) for (let j=0;j<2;j++) {

                const tr=sr+i,tc=sc+j;

                if (tr<9&&tc<9 && tBoard[tr][tc]!==0) clearCellAnim(tr,tc,j*60);

            }

            // Clear hammer from slot

            const slot=tJokerSlots[0];

            slot.innerHTML='';

            slot.style.borderColor='transparent';

            slot.style.background='#ecf0f1';

            slot.style.boxShadow='';

            slot.style.cursor='default';

            if (slot._hammerHandler) { slot.removeEventListener('pointerdown',slot._hammerHandler); slot._hammerHandler=null; }



            stepTimeout(()=>{

                tAnimLock=false;

                if (tOnHammer) { const cb=tOnHammer; tOnHammer=null; cb(); }

            },800);

        },200);

    }



    // ============================================================

    // ANIMATIONS: key fly, joker fly

    // ============================================================

    function flyKeyToChest(fromEl, cb, readyAt=5) {

        if (typeof SFX!=='undefined' && SFX.key) SFX.key();

        const fR=fromEl.getBoundingClientRect();

        const tR=tChestBtn.getBoundingClientRect();

        const fly=mk('div');

        css(fly,`position:fixed;left:${fR.left}px;top:${fR.top}px;

                 width:${fR.width}px;height:${fR.height}px;z-index:10025;

                 transition:transform .8s cubic-bezier(.34,1.56,.64,1);`);

        fly.innerHTML=`<img src="icons/key.png" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='🔑'">`;

        document.body.appendChild(fly);

        stepTimeout(()=>{ fly.style.transform=`translate(${tR.left-fR.left+15}px,${tR.top-fR.top+15}px) scale(1.5) rotate(360deg)`; },20);

        stepTimeout(()=>{

            fly.remove();

            tKeyCount++;

            updateChestUI(readyAt);

            tChestBtn.classList.add('chest-pop-anim');

            stepTimeout(()=>tChestBtn.classList.remove('chest-pop-anim'),300);

            if (cb) cb();

        },820);

    }



    function flyJokerToSlot(jokerType, slotIdx, cb) {

        const cR=tChestBtn.getBoundingClientRect();

        const loot=mk('div');

        css(loot,`position:fixed;left:${cR.left}px;top:${cR.top}px;

                  width:52px;height:52px;z-index:10025;

                  transition:transform .3s cubic-bezier(.25,1,.5,1);`);

        loot.innerHTML=`<img src="icons/${jokerType}.png" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='🔨'">`;

        document.body.appendChild(loot);

        const px=-30,py=-70;

        stepTimeout(()=>{

            loot.style.transform=`translate(${px}px,${py}px) scale(1.2) rotate(-10deg)`;

            stepTimeout(()=>{

                loot.style.transform=`translate(${px}px,${py+30}px) scale(1) rotate(0)`;

                stepTimeout(()=>{

                    const sR=tJokerSlots[slotIdx].getBoundingClientRect();

                    const dx=sR.left+sR.width/2-(cR.left+px)-26;

                    const dy=sR.top +sR.height/2-(cR.top+py+30)-26;

                    loot.style.transition='transform .6s cubic-bezier(.55,.085,.68,.53),opacity .6s ease-in';

                    loot.style.transform=`translate(${px+dx}px,${py+30+dy}px) scale(.4)`;

                    loot.style.opacity='0';

                    stepTimeout(()=>{

                        loot.remove();

                        const slot=tJokerSlots[slotIdx];

                        slot.style.borderColor='#f1c40f';

                        slot.style.background='white';

                        slot.style.boxShadow='0 4px 10px rgba(0,0,0,.1)';

                        slot.innerHTML=`<img src="icons/${jokerType}.png" style="width:80%;height:80%;object-fit:contain;" onerror="this.outerHTML='🔨'">`;

                        if (cb) cb();

                    },600);

                },700);

            },350);

        },50);

    }



    // ============================================================

    // NEXT BUTTON

    // ============================================================

    function showNext(cb) {

        tNextBtn.style.display='flex';

        tNextBtn.onclick=()=>{ tNextBtn.style.display='none'; clearSpotlight(); if(cb)cb(); };

    }



    // ============================================================

    // CLOSE

    // ============================================================

    function closeTut() {

        clearSpotlight();

        document.removeEventListener('pointermove',onPMove);

        document.removeEventListener('pointerup',  onPUp);

        document.removeEventListener('pointermove',onHMove);

        document.removeEventListener('pointerup',  onHUp);

        if (tGhostEl)     { tGhostEl.remove();     tGhostEl=null;     }

        if (tHammerGhost) { tHammerGhost.remove();  tHammerGhost=null; }

        const ol=document.getElementById('tut-main-overlay');

        if (ol) ol.remove();

    }



    // ============================================================

    // STEP CONTROLLER

    // ============================================================

    const STEP_KEYS=['rowClear','colClear','boxClear','ice','chestIntro','chestOpen','hammer','megaChest','chestUpgrade','shuffle','undo','oneByOne','bundle','rowBlock','combo','specialsInfo','finish'];

    const STEPS=[s0,s1,s2,sIce,s3,s4,s5,sMegaChest,sChestUpgrade,sShuffle,sUndo,sOneByOne,sBundle,s6,s7,s8,s9];

    const TOTAL_STEPS=STEP_KEYS.length-1; // displayed count (finish not counted)

    function idx(key){ return STEP_KEYS.indexOf(key); }



    function goStep(n) {

        tStep=n;

        tStepToken++;

        tSkipHandler=null;

        updateSkipUI();

        clearSpotlight();

        tNextBtn.style.display='none';

        const badge=document.getElementById('tut-badge');

        if (badge) badge.innerText=`${Math.min(n+1,TOTAL_STEPS)} / ${TOTAL_STEPS}`;

        if (tWrapEl) tWrapEl.style.opacity='0';

        stepTimeout(()=>{

            if (STEPS[n]) STEPS[n]();

            if (tWrapEl) requestAnimationFrame(()=>{ tWrapEl.style.opacity='1'; });

        },180);

    }



    // A setTimeout that silently no-ops if the step has moved on (or been

    // skipped) since it was scheduled — lets a whole chain of nested waits

    // self-cancel without tracking individual timer ids.

    function stepTimeout(fn, delay) {

        const token = tStepToken;

        return setTimeout(() => { if (token === tStepToken) fn(); }, delay);

    }



    // A step calls this to offer a skip control. `handler` runs when the

    // player taps "Atla" — for a guided step that means "jump straight to

    // the end state"; for an interactive step it usually just means

    // goStep(n+1) outright.

    function registerSkip(handler) {

        tSkipHandler = handler;

        updateSkipUI();

    }

    function updateSkipUI() {

        if (!tSkipBtn) return;

        tSkipBtn.style.display = tSkipHandler ? 'flex' : 'none';

    }



    // ============================================================

    // STEP 0  ─  ROW CLEAR

    // ============================================================

    function s0() {

        resetBoard();

        showCombo(0);

        tTrayEl.innerHTML='';



        // Fill row 7 leaving cols 6,7,8 empty for the piece

        for (let c=0;c<6;c++) fill(7,c,'#5451A6');

        // Scattered decor cells

        [[0,2],[1,1],[2,0],[2,3],[3,4],[4,1],[5,2],[5,5],[6,3]].forEach(([r,c])=>fill(r,c,'#9AD914'));



        const shape=[[1,1,1]];

        setTray([{shape,color:T2}]);

        registerSkip(()=>goStep(idx('colClear')));



        stepTimeout(()=>{

            const pw=tTrayEl.querySelector('div');

            spotlight(pw, tt('tut_s1_desc'), 'top');

            tOnPlaced=(pd,sr,sc)=>{

                clearSpotlight();

                if (tBoard[7].every(v=>v!==0)) {

                    stepTimeout(()=>clearRowAnim(7,()=>{ addScore(90); tAnimLock=false; stepTimeout(()=>goStep(idx('colClear')),600); }),200);

                } else {

                    tAnimLock=false;

                    showTryAgain(tt('tut_wrong'), () => {

                        goStep(idx('rowClear'));

                    });

                }

            };

        },500);

    }



    // ============================================================

    // STEP 1  ─  COLUMN CLEAR

    // ============================================================

    function s1() {

        resetBoard();

        tTrayEl.innerHTML='';



        for (let r=0;r<7;r++) fill(r,8,'#F26938');

        [[0,1],[1,3],[2,5],[3,2],[4,4],[5,1],[6,6],[7,3],[8,0]].forEach(([r,c])=>fill(r,c,'#BFA77A'));



        const shape=[[1],[1]];

        setTray([{shape,color:TC}]);

        registerSkip(()=>goStep(idx('boxClear')));



        stepTimeout(()=>{

            const pw=tTrayEl.querySelector('div');

            spotlight(pw, tt('tut_s2_desc'), 'top');

            tOnPlaced=(pd,sr,sc)=>{

                clearSpotlight();

                if ([0,1,2,3,4,5,6,7,8].every(r=>tBoard[r][8]!==0)) {

                    stepTimeout(()=>clearColAnim(8,()=>{ addScore(90); tAnimLock=false; stepTimeout(()=>goStep(idx('boxClear')),600); }),200);

                } else {

                    tAnimLock=false;

                    showTryAgain(tt('tut_wrong'), () => {

                        goStep(idx('colClear'));

                    });

                }

            };

        },500);

    }



    // ============================================================

    // STEP 2  ─  3×3 BOX CLEAR

    // ============================================================

    function s2() {

        resetBoard();

        tTrayEl.innerHTML='';



        for (let r=6;r<=8;r++) for (let c=6;c<=8;c++) {

            if (!(r===8&&c===8)) fill(r,c,'#854BBF');

        }

        [[0,0],[1,4],[2,2],[3,5],[4,1],[5,3]].forEach(([r,c])=>fill(r,c,'#F2B749'));



        const shape=[[1]];

        setTray([{shape,color:'#D93A2B'}]);

        registerSkip(()=>goStep(idx('ice')));



        stepTimeout(()=>{

            const pw=tTrayEl.querySelector('div');

            spotlight(pw, tt('tut_s3_desc'), 'top');

            tOnPlaced=(pd,sr,sc)=>{

                clearSpotlight();

                const ok=[0,1,2].every(i=>[0,1,2].every(j=>tBoard[6+i][6+j]!==0));

                if (ok) {

                    stepTimeout(()=>clearBoxAnim(6,6,()=>{ addScore(90); tAnimLock=false; stepTimeout(()=>goStep(idx('ice')),600); }),200);

                } else {

                    tAnimLock=false;

                    showTryAgain(tt('tut_wrong'), () => {

                        goStep(idx('boxClear'));

                    });

                }

            };

        },500);

    }



    // ============================================================

    // STEP  ─  ICE BLOCK (guided demo)

    // ============================================================

    function chestTierImg(lvl) {

        if (lvl>=30) return 'chestmax';

        if (lvl>=25) return 'chest6';

        if (lvl>=20) return 'chest5';

        if (lvl>=15) return 'chest4';

        if (lvl>=10) return 'chest3';

        if (lvl>=5)  return 'chest2';

        return 'chest1';

    }

    function setChestTierIcon(lvl) {

        const img = tChestBtn.querySelector('img');

        if (img) img.src = `icons/${chestTierImg(lvl)}.png`;

    }



    function sIce() {

        resetBoard();

        tTrayEl.innerHTML='';

        showCombo(0);



        const row=4, iceCol=4, gapCol=8;

        for (let c=0;c<9;c++) { if (c!==gapCol) fill(row,c,TPAL[c%TPAL.length]); }

        [[0,1],[1,6],[2,3],[6,2],[7,5],[8,0]].forEach(([r,c])=>fill(r,c,'#5451A6'));



        const iceCell = cl(row,iceCol);

        const iceWrap = mk('div');

        iceWrap.className = 'ice-overlay-wrap';

        iceWrap.innerHTML = `<img src="icons/ice.png" class="ice-overlay-icon" draggable="false" onerror="this.style.display='none'">`;

        iceCell.appendChild(iceWrap);

        const iceImg = iceWrap.querySelector('.ice-overlay-icon');



        function showRevealedEnd() {

            registerSkip(null);

            spotlight(iceCell, tt('tut_ice_revealed'), 'top');

            showNext(()=>goStep(idx('chestIntro')));

        }



        function jumpToEnd() {

            resetBoard();

            for (let c=0;c<9;c++) { if (c!==iceCol) fill(row,c,TPAL[c%TPAL.length]); }

            fill(row,iceCol,TPAL[iceCol%TPAL.length]);

            addScore(90);

            showRevealedEnd();

        }

        registerSkip(jumpToEnd);



        stepTimeout(()=>{

            spotlight(iceCell, tt('tut_ice_intro'), 'top');

            stepTimeout(()=>{

                const drop = mk('div');

                const bR=tBoardEl.getBoundingClientRect(); const cw=bR.width/9, ch=bR.height/9;

                css(drop,`position:absolute;left:${gapCol*cw+3}px;top:${row*ch+3}px;width:${cw-6}px;height:${ch-6}px;

                          border-radius:3px;background:${TPAL[gapCol%TPAL.length]};transform:scale(0);

                          transition:transform .3s cubic-bezier(.175,.885,.32,1.275);`);

                tBoardEl.appendChild(drop);

                stepTimeout(()=>{ drop.style.transform='scale(1)'; },30);



                stepTimeout(()=>{

                    drop.remove();

                    fill(row,gapCol,TPAL[gapCol%TPAL.length]);

                    if (typeof SFX!=='undefined' && SFX.place) SFX.place();



                    stepTimeout(()=>{

                        if (typeof SFX!=='undefined' && SFX.hammerCrack) SFX.hammerCrack();

                        for (let c=0;c<9;c++) { if (c!==iceCol) cl(row,c).classList.add('clearing'); }

                        iceImg.classList.add('ice-breaking');



                        stepTimeout(()=>{

                            for (let c=0;c<9;c++) {

                                if (c===iceCol) continue;

                                tBoard[row][c]=0;

                                const cell=cl(row,c);

                                cell.classList.remove('clearing');

                                cell.style.backgroundColor=cellBg(row,c);

                                cell.innerHTML='';

                            }

                            iceWrap.remove();

                            addScore(90);

                            crazyGrid(()=>{

                                registerSkip(null);

                                showRevealedEnd();

                            });

                        },700);

                    },600);

                },500);

            },2600);

        },500);

    }



    // ============================================================

    // STEP 3  ─  CHEST INTRO

    // ============================================================

    function s3() {

        resetBoard();

        tTrayEl.innerHTML='';

        tKeyCount=0; updateChestUI(1);



        // Chest bounce-in

        tChestBtn.style.transform='scale(0)';

        tChestBtn.style.transition='transform .5s cubic-bezier(.175,.885,.32,1.275)';

        stepTimeout(()=>{

            tChestBtn.style.transform='scale(1)';

            stepTimeout(()=>{

                spotlight(tChestBtn, tt('tut_s4_desc'), 'left');

                showNext(()=>goStep(idx('chestOpen')));

            },600);

        },200);

    }



    // ============================================================

    // STEP 4  ─  KEY COLLECTION + CHEST OPEN

    // ============================================================

    function s4() {

        resetBoard();

        tKeyCount=0; updateChestUI(1);

        tTrayEl.innerHTML='';



        // Pre-fill row 5, leaving cols 3,4,5 open for the 1×3 piece

        for (let c=0;c<3;c++) fill(5,c,'#5451A6');

        for (let c=6;c<9;c++) fill(5,c,'#5451A6');

        [[1,2],[2,5],[3,1],[4,4],[6,2],[7,6],[8,3]].forEach(([r,c])=>fill(r,c,'#8C5332'));



        // 1×3 piece with key in the middle cell

        const shape=[[1,1,1]];

        setTray([{shape, color:TC, hasKey:true, keyPos:{r:0,c:1}}]);

        registerSkip(()=>jumpToChestReady());



        function openTheChest() {

            tChestBtn.onclick=null;

            clearSpotlight();

            tAnimLock=true;

            if (typeof SFX!=='undefined' && SFX.chestOpen) SFX.chestOpen();

            tChestBtn.classList.add('chest-pop-anim');

            stepTimeout(()=>tChestBtn.classList.remove('chest-pop-anim'),300);

            tKeyCount=0; updateChestUI(1);

            stepTimeout(()=>{

                flyJokerToSlot('hammer',0,()=>{

                    spotlight(tJokerSlots[0], tt('tut_s5_hammer'), 'bottom');

                    tAnimLock=false;

                    showNext(()=>goStep(idx('hammer')));

                });

            },400);

        }



        function jumpToChestReady() {

            registerSkip(null);

            tKeyCount=1; updateChestUI(1);

            spotlight(tChestBtn, tt('tut_s5_open'), 'left');

            tChestBtn.onclick=openTheChest;

        }



        stepTimeout(()=>{

            const pw=tTrayEl.querySelector('div');

            spotlight(pw, tt('tut_s5_desc'), 'top');



            tOnPlaced=(pd,sr,sc,keyCell)=>{

                clearSpotlight();

                if (!keyCell) { tAnimLock=false; return; }



                stepTimeout(()=>{

                    flyKeyToChest(keyCell,()=>{

                        // Clear key cell from board

                        const kr=sr, kc=sc+1;

                        tBoard[kr][kc]=0;

                        const kCellEl=cl(kr,kc);

                        kCellEl.innerHTML='';

                        kCellEl.style.backgroundColor=cellBg(kr,kc);



                        jumpToChestReady();

                    },1);

                },200);

            };

        },500);

    }



    // ============================================================

    // STEP 5  ─  HAMMER USE

    // ============================================================

    function s5() {

        resetBoard();

        tTrayEl.innerHTML='';



        // Dense board — every cell except a scattered few

        for (let r=0;r<9;r++) for (let c=0;c<9;c++) {

            if ((r+c)%4!==0) fill(r,c,TPAL[((r*3+c*2)%TPAL.length)]);

        }



        registerSkip(()=>goStep(idx('megaChest')));

        stepTimeout(()=>{

            spotlight(tJokerSlots[0], tt('tut_s6_desc'), 'bottom');

            enableHammerDrag(tJokerSlots[0]);

            tOnHammer=()=>stepTimeout(()=>goStep(idx('megaChest')),800);

        },400);

    }



    // ============================================================

    // STEP  ─  MEGA CHEST (guided demo)

    // ============================================================

    const SPECIAL_ICON_FILE = {'+':'cross.png', row:'row.png', col:'col.png', '?':'random.png', X:'X.png', life:'life.png', multX:'multX.png', scoreUp:'scoreUp.png'};



    function popTutorialLoot(iconSrc, text, delay, angle) {

        stepTimeout(()=>{

            tChestBtn.classList.add('chest-pop-anim');

            stepTimeout(()=>tChestBtn.classList.remove('chest-pop-anim'),300);



            const lootEl = mk('div');

            css(lootEl,'position:fixed;z-index:10025;width:50px;height:50px;transition:transform .35s cubic-bezier(.25,1,.5,1),opacity .3s ease;');

            lootEl.innerHTML = `<img src="${iconSrc}" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 8px 12px rgba(0,0,0,.3));" onerror="this.style.display='none'">`;

            const cR = tChestBtn.getBoundingClientRect();

            lootEl.style.left = cR.left+'px';

            lootEl.style.top  = cR.top+'px';

            const textEl = mk('div');

            textEl.innerText = text;

            css(textEl,'position:absolute;top:56px;left:50%;transform:translateX(-50%);color:#fff;background:#34495e;padding:4px 9px;border-radius:5px;font-size:12px;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.3);');

            lootEl.appendChild(textEl);

            document.body.appendChild(lootEl);

            stepTimeout(()=>{

                lootEl.style.transform=`translate(${angle}px,-75px) scale(1.15) rotate(${angle>0?12:-12}deg)`;

                stepTimeout(()=>{

                    lootEl.style.transform=`translate(${angle}px,-30px) scale(1) rotate(0)`;

                    stepTimeout(()=>{

                        lootEl.style.opacity='0';

                        stepTimeout(()=>lootEl.remove(),300);

                    },1300);

                },350);

            },20);

        },delay);

    }



    function transformRandomTutBlock(cb) {

        const candidates=[];

        for (let r=0;r<9;r++) for (let c=0;c<9;c++) if (tBoard[r][c]===1) candidates.push({r,c});

        if (candidates.length===0) { if(cb) cb(); return; }

        const target = candidates[Math.floor(Math.random()*candidates.length)];

        const pool = Object.keys(SPECIAL_ICON_FILE);

        const chosen = pool[Math.floor(Math.random()*pool.length)];



        const cR = tChestBtn.getBoundingClientRect();

        const bR = tBoardEl.getBoundingClientRect();

        const cw=bR.width/9, ch=bR.height/9;

        const tCenterX = bR.left+target.c*cw+cw/2;

        const tCenterY = bR.top +target.r*ch+ch/2;



        const spark = mk('div');

        css(spark,`position:fixed;left:${cR.left+15}px;top:${cR.top+15}px;width:26px;height:26px;

                   border-radius:50%;background:radial-gradient(circle,#fff,rgba(255,255,255,0));

                   z-index:10025;pointer-events:none;transition:transform .55s cubic-bezier(.55,.085,.68,.53),opacity .3s;`);

        document.body.appendChild(spark);

        stepTimeout(()=>{

            spark.style.transform = `translate(${tCenterX-cR.left-28}px,${tCenterY-cR.top-28}px) scale(.4)`;

            stepTimeout(()=>{

                spark.style.opacity='0';

                stepTimeout(()=>spark.remove(),300);

                const cell = cl(target.r,target.c);

                const icon = SPECIAL_ICON_FILE[chosen];

                cell.innerHTML = `<img src="icons/${icon}" style="width:80%;height:80%;object-fit:contain;position:relative;z-index:2;" onerror="this.style.display='none'">`;

                cell.style.transition='transform .3s cubic-bezier(.175,.885,.32,1.275)';

                cell.style.transform='scale(1.3)';

                stepTimeout(()=>{ cell.style.transform='scale(1)'; },300);

                if (cb) cb();

            },550);

        },20);

    }



    function sMegaChest() {

        resetBoard();

        tTrayEl.innerHTML='';

        setChestTierIcon(0);

        tKeyCount=0; updateChestUI(6);



        // A few normal blocks so the mega chest has something to transform

        [[1,2],[1,6],[3,4],[4,1],[5,7],[6,3],[7,5],[2,8]].forEach(([r,c])=>fill(r,c,TPAL[(r+c)%TPAL.length]));



        function openMegaChest() {

            clearSpotlight();

            if (typeof SFX!=='undefined' && SFX.chestOpen) SFX.chestOpen();

            tChestBtn.classList.add('chest-pop-anim');

            stepTimeout(()=>tChestBtn.classList.remove('chest-pop-anim'),300);

            tKeyCount=0; updateChestUI(6);



            popTutorialLoot('icons/pts.png', '+1500 ' + tt('loot_pts'), 300, -50);

            popTutorialLoot('icons/mult.png', `x5 ${tt('loot_mult')} (5 ${tt('loot_turns')})`, 900, 50);

            popTutorialLoot('icons/undo.png', tt('desc_undo').includes(':') ? tt('desc_undo').split(':')[0] : tt('desc_undo'), 1500, -40);



            stepTimeout(()=>{

                spotlight(tBoardEl, tt('tut_mega_reward'), 'top');

                transformRandomTutBlock(()=>{

                    addScore(1500);

                    showNext(()=>goStep(idx('chestUpgrade')));

                });

            },2400);

        }



        function jumpToEnd() {

            registerSkip(null);

            tKeyCount=6; updateChestUI(6);

            openMegaChest();

        }

        registerSkip(jumpToEnd);



        stepTimeout(()=>{

            spotlight(tChestBtn, tt('tut_mega_intro'), 'left');

            stepTimeout(()=>{

                let delay=0;

                for (let i=1;i<=6;i++) {

                    delay+=280;

                    (function(count){

                        stepTimeout(()=>{

                            tKeyCount=count; updateChestUI(6);

                            if (typeof SFX!=='undefined' && SFX.key) SFX.key();

                        },delay);

                    })(i);

                }

                stepTimeout(openMegaChest, delay+400);

            },1600);

        },400);

    }



    // ============================================================

    // STEP  ─  CHEST UPGRADE (tap-driven)

    // ============================================================

    function sChestUpgrade() {

        resetBoard();

        tTrayEl.innerHTML='';

        tKeyCount=0; updateChestUI(1);

        setChestTierIcon(0);

        tChestBtn.style.filter='drop-shadow(0 0 10px rgba(243,156,18,.8))';

        tChestBtn.style.opacity='1';

        tChestBtn.style.animation='';



        const tiers=[5,10,15,20,25,30];

        let tapIndex=0;



        function finish() {

            registerSkip(null);

            tChestBtn.onclick=null;

            clearSpotlight();

            spotlight(tChestBtn, tt('tut_chestupg_evolve'), 'left');

            showNext(()=>goStep(idx('shuffle')));

        }



        function onTap() {

            if (tapIndex>=tiers.length) return;

            setChestTierIcon(tiers[tapIndex]);

            if (typeof SFX!=='undefined' && SFX.chestUpg) SFX.chestUpg();

            tChestBtn.classList.add('chest-pop-anim');

            stepTimeout(()=>tChestBtn.classList.remove('chest-pop-anim'),300);

            tapIndex++;

            if (tapIndex>=tiers.length) {

                tChestBtn.onclick=null;

                stepTimeout(finish,600);

            }

        }



        function jumpToEnd() {

            tChestBtn.onclick=null;

            tapIndex=tiers.length;

            setChestTierIcon(30);

            finish();

        }

        registerSkip(jumpToEnd);



        stepTimeout(()=>{

            spotlight(tChestBtn, tt('tut_chestupg_intro'), 'left');

            tChestBtn.onclick=onTap;

        },500);

    }



    // ============================================================

    // JOKER DELIVERY HELPERS

    // ============================================================

    function jokerIconFile(type) {

        if (type === 'bundle') return 'bundle1.png';

        return `${type}.png`;

    }

    function popJokerIntoSlot(type, slotIdx) {

        const slot = tJokerSlots[slotIdx];

        slot.innerHTML = `<img src="icons/${jokerIconFile(type)}" style="width:80%;height:80%;object-fit:contain;" onerror="this.outerHTML='🎲'">`;

        slot.style.borderColor = '#f1c40f';

        slot.style.background = 'white';

        slot.style.boxShadow = '0 4px 10px rgba(0,0,0,.1)';

        slot.style.transform = 'scale(0)';

        slot.style.transition = 'transform .4s cubic-bezier(.175,.885,.32,1.275)';

        requestAnimationFrame(()=>{ slot.style.transform='scale(1)'; });

    }

    function clearJokerSlot(slotIdx) {

        const slot = tJokerSlots[slotIdx];

        slot.innerHTML='';

        slot.style.borderColor='transparent';

        slot.style.background='#ecf0f1';

        slot.style.boxShadow='';

        slot.style.cursor='default';

        slot.onclick=null;

    }



    // ============================================================

    // STEP  ─  SHUFFLE JOKER (fully interactive)

    // ============================================================

    function sShuffle() {

        resetBoard();

        showCombo(0);

        tTrayEl.innerHTML='';



        // Fill almost everything, leaving only scattered single-cell gaps —

        // large enough for nothing but a 1×1 to fit anywhere.

        const gaps = new Set(['1,2','2,5','3,1','4,4','4,7','5,2','6,6','7,3','1,7']);

        for (let r=0;r<9;r++) for (let c=0;c<9;c++) {

            if (!gaps.has(`${r},${c}`)) fill(r,c,TPAL[(r*2+c)%TPAL.length]);

        }



        setTrayStatic([

            {shape:[[1,1,1],[0,1,0],[0,1,0]], color:'#D93A2B'},

            {shape:[[1,0],[1,1],[0,1]], color:'#854BBF'},

            {shape:[[0,1],[1,1],[1,0]], color:'#F2B749'},

        ]);



        popJokerIntoSlot('shuffle',0);

        const slot = tJokerSlots[0];



        function doShuffle() {

            registerSkip(null);

            slot.onclick=null;

            slot.style.cursor='default';

            clearSpotlight();

            Array.from(tTrayEl.children).forEach(el=>{

                el.style.transition='opacity .25s ease,transform .25s ease';

                el.style.opacity='0';

                el.style.transform='scale(.7)';

            });

            if (typeof SFX!=='undefined' && SFX.newTray) SFX.newTray();

            stepTimeout(()=>{

                setTrayStatic([

                    {shape:[[1,1],[1,0]], color:T2},

                    {shape:[[1]], color:TC},

                    {shape:[[1,1,1]], color:'#F26938'},

                ]);

                clearJokerSlot(0);

                stepTimeout(()=>{

                    showNext(()=>goStep(idx('undo')));

                },500);

            },280);

        }

        registerSkip(doShuffle);



        stepTimeout(()=>{

            spotlight(slot, tt('tut_shuffle_desc'), 'bottom');

            slot.style.cursor='pointer';

            slot.onclick=doShuffle;

        },500);

    }



    // ============================================================

    // STEP  ─  UNDO JOKER (fully interactive)

    // ============================================================

    function sUndo() {

        resetBoard();

        showCombo(0);

        tScore=0; const scoreEl=document.getElementById('tut-score'); if(scoreEl)scoreEl.innerText='0';



        const row=4;

        for (let c=0;c<8;c++) fill(row,c,TPAL[c%TPAL.length]);

        [[0,2],[1,6],[2,1],[6,4],[7,7],[8,0]].forEach(([r,c])=>fill(r,c,'#5451A6'));



        setTray([{shape:[[1]],color:'#D93A2B'}]);

        registerSkip(()=>goStep(idx('oneByOne')));



        let snapshot = null;



        stepTimeout(()=>{

            const pw=tTrayEl.querySelector('div');

            spotlight(pw, tt('tut_undo_place'), 'top');



            tOnPlaced=(pd,sr,sc)=>{

                clearSpotlight();

                snapshot = { board: tBoard.map(r=>[...r]), colors: [], score: tScore, combo: tCombo };

                for (let r=0;r<9;r++) for (let c=0;c<9;c++) snapshot.colors.push(cl(r,c).style.backgroundColor);



                if (tBoard[row].every(v=>v!==0)) {

                    stepTimeout(()=>{

                        clearRowAnim(row,()=>{

                            tCombo=2; showCombo(2);

                            addScore(300);

                            tAnimLock=false;



                            popJokerIntoSlot('undo',0);

                            const slot=tJokerSlots[0];



                            function doUndo() {

                                registerSkip(null);

                                slot.onclick=null;

                                slot.style.cursor='default';

                                clearSpotlight();

                                if (typeof SFX!=='undefined' && SFX.undo) SFX.undo();

                                tOverlay.style.animation='shake .35s cubic-bezier(.36,.07,.19,.97) both';

                                stepTimeout(()=>tOverlay.style.animation='',350);

                                stepTimeout(()=>{

                                    tBoard = snapshot.board.map(r=>[...r]);

                                    for (let r=0;r<9;r++) for (let c=0;c<9;c++) {

                                        const cell=cl(r,c);

                                        cell.style.backgroundColor=snapshot.colors[r*9+c];

                                        cell.innerHTML='';

                                    }

                                    tScore=snapshot.score;

                                    if (scoreEl) scoreEl.innerText = tScore >= 10000 ? (tScore/1000).toFixed(1)+'K' : tScore;

                                    showCombo(snapshot.combo);

                                    clearJokerSlot(0);

                                    setTrayStatic([{shape:[[1]],color:'#D93A2B'}]);

                                    stepTimeout(()=>{

                                        showNext(()=>goStep(idx('oneByOne')));

                                    },500);

                                },250);

                            }

                            registerSkip(doUndo);



                            stepTimeout(()=>{

                                spotlight(slot, tt('tut_undo_desc'), 'bottom');

                                slot.style.cursor='pointer';

                                slot.onclick=doUndo;

                            },500);

                        });

                    },200);

                } else {

                    tAnimLock=false;

                    showTryAgain(tt('tut_wrong'), () => { goStep(idx('undo')); });

                }

            };

        },500);

    }



    // ============================================================

    // 1×1 JOKER DRAG SYSTEM

    // ============================================================

    function enable1x1Drag(slotEl) {

        slotEl.style.cursor='grab';

        slotEl.addEventListener('pointerdown', start1x1Drag);

    }

    function start1x1Drag(e) {

        t1x1Ghost = mk('div');

        css(t1x1Ghost,`position:fixed;pointer-events:none;z-index:10030;width:44px;height:44px;

                       filter:drop-shadow(0 10px 15px rgba(0,0,0,.4));`);

        t1x1Ghost.innerHTML=`<img src="icons/random_block.png" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='🎲'">`;

        document.body.appendChild(t1x1Ghost);

        darkenBoardFocus(true);

        move1x1Ghost(e.clientX,e.clientY);

        document.addEventListener('pointermove',on1x1Move);

        document.addEventListener('pointerup',on1x1Up);

    }

    function on1x1Move(e) { move1x1Ghost(e.clientX,e.clientY); }

    function move1x1Ghost(x,y) {

        if (!t1x1Ghost) return;

        t1x1Ghost.style.left=(x-22)+'px';

        t1x1Ghost.style.top =(y-54)+'px';

        clear1x1HL();

        const bR=tBoardEl.getBoundingClientRect();

        const cw=bR.width/9, ch=bR.height/9;

        const c=Math.floor((x-bR.left)/cw), r=Math.floor((y-54-bR.top)/ch);

        if (r>=0&&r<9&&c>=0&&c<9 && tBoard[r][c]===0) {

            const cell=cl(r,c);

            cell.style.backgroundColor='rgba(46,204,113,.45)';

            t1x1HL={r,c,cell};

        }

    }

    function clear1x1HL() {

        if (t1x1HL) { t1x1HL.cell.style.backgroundColor=cellBg(t1x1HL.r,t1x1HL.c); t1x1HL=null; }

    }

    function on1x1Up(e) {

        document.removeEventListener('pointermove',on1x1Move);

        document.removeEventListener('pointerup',on1x1Up);

        darkenBoardFocus(false);

        clear1x1HL();

        if (t1x1Ghost) { t1x1Ghost.remove(); t1x1Ghost=null; }

        const bR=tBoardEl.getBoundingClientRect();

        const cw=bR.width/9, ch=bR.height/9;

        const c=Math.floor((e.clientX-bR.left)/cw), r=Math.floor((e.clientY-54-bR.top)/ch);

        if (r>=0&&r<9&&c>=0&&c<9 && tBoard[r][c]===0) lock1x1(r,c);

    }

    function lock1x1(r,c) {

        clearSpotlight();

        t1x1LockedPos={r,c};

        const cell=cl(r,c);

        cell.style.backgroundColor='rgba(231,76,60,.5)';

        cell.innerHTML=`<img src="icons/random_block.png" style="width:95%;height:95%;object-fit:contain;opacity:.8;animation:pulse 1s infinite;" onerror="this.style.display='none'">`;

        cell.style.cursor='pointer';

        cell.onclick=()=>{ cell.onclick=null; confirm1x1(r,c); };

        spotlight(cell, tt('tut_1x1_confirm'), 'top');

    }

    function confirm1x1(r,c) {

        registerSkip(null);

        clearSpotlight();

        if (typeof SFX!=='undefined' && SFX.randomBlock) SFX.randomBlock();

        const cell=cl(r,c);

        cell.style.cursor='default';

        cell.innerHTML=`<img src="icons/random_block.png" style="width:95%;height:95%;object-fit:contain;animation:fastChestShake .4s infinite;" onerror="this.style.display='none'">`;

        stepTimeout(()=>{

            tBoard[r][c]=1;

            cell.style.backgroundColor='#5D84A6';

            cell.innerHTML='';

            cell.style.transition='transform .3s cubic-bezier(.175,.885,.32,1.275)';

            cell.style.transform='scale(1.2)';

            stepTimeout(()=>{ cell.style.transform='scale(1)'; },300);

            t1x1LockedPos=null;

            clearJokerSlot(0);

            if (t1x1OnDone) { const cb=t1x1OnDone; t1x1OnDone=null; cb(); }

        },400);

    }



    // ============================================================

    // STEP  ─  1×1 JOKER (fully interactive)

    // ============================================================

    function sOneByOne() {

        resetBoard();

        showCombo(0);

        tTrayEl.innerHTML='';



        for (let r=0;r<9;r++) for (let c=0;c<9;c++) {

            if (!((r===4&&c===4) || (r===2&&c===6) || (r===6&&c===2))) fill(r,c,TPAL[(r*2+c)%TPAL.length]);

        }



        popJokerIntoSlot('1x1',0);

        const slot=tJokerSlots[0];



        t1x1OnDone = ()=>{ stepTimeout(()=>{ showNext(()=>goStep(idx('bundle'))); },500); };



        function jumpToEnd() {

            registerSkip(null);

            document.removeEventListener('pointermove',on1x1Move);

            document.removeEventListener('pointerup',on1x1Up);

            darkenBoardFocus(false);

            clear1x1HL();

            if (t1x1Ghost) { t1x1Ghost.remove(); t1x1Ghost=null; }

            clearSpotlight();

            if (t1x1LockedPos) confirm1x1(t1x1LockedPos.r,t1x1LockedPos.c);

            else confirm1x1(4,4);

        }

        registerSkip(jumpToEnd);



        stepTimeout(()=>{

            spotlight(slot, tt('tut_1x1_desc'), 'bottom');

            enable1x1Drag(slot);

        },500);

    }



    // ============================================================

    // STEP  ─  BUNDLE JOKER (fully interactive)

    // ============================================================

    function sBundle() {

        resetBoard();

        tScore=200;

        const scoreEl=document.getElementById('tut-score'); if(scoreEl) scoreEl.innerText=tScore;

        tCombo=3; showCombo(3);

        tTrayEl.innerHTML='';



        [[1,1],[2,4],[3,7],[5,2],[6,5],[7,0]].forEach(([r,c])=>fill(r,c,TPAL[(r+c)%TPAL.length]));



        popJokerIntoSlot('bundle',0);

        const slot=tJokerSlots[0];

        let armed=false;



        function cashIn() {

            registerSkip(null);

            slot.onclick=null;

            clearSpotlight();

            const finalPts = 200 * tCombo;

            if (typeof SFX!=='undefined' && SFX.scoreUp) SFX.scoreUp();



            const fly=mk('div');

            css(fly,'position:fixed;font-weight:900;color:#2ecc71;font-size:1.4rem;z-index:10025;pointer-events:none;text-shadow:0 2px 6px rgba(0,0,0,.3);transition:transform .7s ease-out,opacity .7s ease-out;');

            fly.innerText=`+${finalPts}`;

            const sR=slot.getBoundingClientRect();

            fly.style.left=sR.left+'px'; fly.style.top=sR.top+'px';

            document.body.appendChild(fly);

            const scR=scoreEl.getBoundingClientRect();

            stepTimeout(()=>{

                fly.style.transform=`translate(${scR.left-sR.left}px,${scR.top-sR.top}px) scale(.6)`;

                fly.style.opacity='0';

            },20);

            stepTimeout(()=>{

                fly.remove();

                addScore(finalPts);

                clearJokerSlot(0);

                stepTimeout(()=>{ showNext(()=>goStep(idx('rowBlock'))); },500);

            },720);

        }



        function armBundle() {

            if (armed) return;

            armed=true;

            slot.classList.add('chest-pop-anim');

            stepTimeout(()=>slot.classList.remove('chest-pop-anim'),300);

            spotlight(slot, tt('tut_bundle_confirm'), 'bottom');

            slot.onclick=cashIn;

        }



        function jumpToEnd() {

            registerSkip(null);

            if (!armed) armBundle();

            stepTimeout(cashIn, 400);

        }

        registerSkip(jumpToEnd);



        stepTimeout(()=>{

            spotlight(slot, tt('tut_bundle_desc'), 'bottom');

            slot.style.cursor='pointer';

            slot.onclick=armBundle;

        },500);

    }



    // ============================================================

    // STEP 6  ─  ROW AREA BLOCK

    // ============================================================

    function s6() {

        resetBoard();

        tTrayEl.innerHTML='';



        // Row 4 fully filled except col 4 (where the row-block piece will land)

        for (let c=0;c<9;c++) { if (c!==4) fill(4,c,'#F26938'); }

        [[0,2],[1,5],[2,1],[3,6],[5,3],[6,7],[7,0],[8,4]].forEach(([r,c])=>fill(r,c,'#9AD914'));



        // 1×1 piece that IS a row-area special

        const shape=[[1]];

        setTray([{shape, color:'#F26938', hasRowBlock:true, rowPos:{r:0,c:0}}]);

        registerSkip(()=>goStep(idx('combo')));



        stepTimeout(()=>{

            const pw=tTrayEl.querySelector('div');

            spotlight(pw, tt('tut_s7_desc'), 'top');



            tOnPlaced=(pd,sr,sc)=>{

                clearSpotlight();

                registerSkip(null);

                // Expand the row clear from the placed cell outward

                stepTimeout(()=>{

                    if (typeof SFX!=='undefined' && SFX.areaBlock) SFX.areaBlock();

                    const origin=cl(sr,sc);

                    origin.style.animation='areaClearAnim .6s cubic-bezier(.55,.085,.68,.53) forwards';

                    stepTimeout(()=>{

                        origin.style.animation='';

                        tBoard[sr][sc]=0;

                        origin.style.backgroundColor=cellBg(sr,sc);

                        origin.innerHTML='';

                    },600);



                    // Ripple clear of the rest of the row

                    const targets=[];

                    for (let c2=0;c2<9;c2++) if (c2!==sc) targets.push({r:sr,c:c2});

                    targets.sort((a,b)=>Math.abs(a.c-sc)-Math.abs(b.c-sc));

                    targets.forEach((t,i)=>stepTimeout(()=>clearCellAnim(t.r,t.c,0),i*70));



                    stepTimeout(()=>{

                        crazyGrid(()=>{

                            addScore(180);

                            tAnimLock=false;

                            stepTimeout(()=>goStep(idx('combo')),600);

                        });

                    },targets.length*70+500);

                },200);

            };

        },500);

    }



    // ============================================================

    // STEP 7  ─  COMBO BUILDING

    // ============================================================

    function s7() {

        resetBoard();

        tTrayEl.innerHTML='';

        tScore=0; const scoreEl=document.getElementById('tut-score'); if(scoreEl)scoreEl.innerText='0';

        showCombo(1);



        // Four rows each missing only their last cell (col 8)

        const targetRows=[1,3,5,7];

        targetRows.forEach(r=>{ for(let c=0;c<8;c++) fill(r,c,TPAL[(r*2)%TPAL.length]); });



        let placed=0;

        registerSkip(()=>goStep(idx('specialsInfo')));



        function serveNextPiece() {

            tTrayEl.innerHTML='';

            const w=buildPieceEl({shape:[[1]],color:T2});

            tTrayEl.appendChild(w);

            enableDrag(w,{shape:[[1]],color:T2});

            tOnPlaced=handlePlacement;

        }



        function handlePlacement(pd,sr,sc) {

            clearSpotlight();

            const clearedRow=targetRows.find(r=>tBoard[r].every(v=>v!==0));

            if (clearedRow!==undefined) {

                tCombo++;

                showCombo(tCombo);

                addScore(50*tCombo);

                placed++;

                stepTimeout(()=>{

                    clearRowAnim(clearedRow,()=>{

                        tAnimLock=false;

                        if (placed>=4) {

                            stepTimeout(()=>goStep(idx('specialsInfo')),800);

                        } else {

                            serveNextPiece();

                            stepTimeout(()=>{

                                const pw=tTrayEl.querySelector('div');

                                spotlight(pw, tt('tut_s8_more'), 'top');

                            },300);

                        }

                    });

                },200);

            } else {

                showTryAgain(tt('tut_wrong'), () => {

                    tAnimLock=false;

                    serveNextPiece();

                    stepTimeout(()=>{

                        const pw=tTrayEl.querySelector('div');

                        if(pw) spotlight(pw, tt('tut_s8_desc'), 'top');

                    }, 300);

                });

            }

        }



        stepTimeout(()=>{

            serveNextPiece();

            stepTimeout(()=>{

                const pw=tTrayEl.querySelector('div');

                spotlight(pw, tt('tut_s8_desc'), 'top');

                tOnPlaced=handlePlacement;

            },300);

        },200);

    }



    // ============================================================

    // STEP 8  ─  SPECIALS INFO (non-interactive)

    // ============================================================

    function s8() {

        clearSpotlight();

        resetBoard();

        tTrayEl.innerHTML='';

        showCombo(0);



        const overlay=mk('div');

        overlay.id='tut-info-overlay';

        css(overlay,`position:absolute;top:0;left:0;width:100%;height:100%;

                     background:rgba(0,0,0,.88);z-index:10015;display:flex;

                     flex-direction:column;align-items:center;

                     padding:50px 20px 20px;box-sizing:border-box;gap:8px;overflow-y:auto;`);



        const title=mk('div');

        css(title,'color:#f1c40f;font-size:1.15rem;font-weight:900;text-align:center;margin-bottom:4px;letter-spacing:.5px;');

        title.innerText=tt('tut_specials_title');

        overlay.appendChild(title);



        const specials=[

            {icon:'row',key:'desc_row'}, {icon:'col',key:'desc_col'},

            {icon:'cross',key:'desc_cross'},{icon:'random',key:'desc_random'},

            {icon:'life',key:'desc_life'}, {icon:'key',key:'desc_key'},

            {icon:'multX',key:'desc_multX'},

        ];

        specials.forEach(s=>overlay.appendChild(infoRow(s.icon,tt(s.key),'rgba(255,255,255,.07)','#ecf0f1')));



        const cursedTitle=mk('div');

        css(cursedTitle,'color:#e74c3c;font-size:1rem;font-weight:900;text-align:center;margin-top:8px;');

        cursedTitle.innerText=tt('tut_cursed_title');

        overlay.appendChild(cursedTitle);



        const cursed=[

            {icon:'skull',key:'desc_skull'},{icon:'minus',key:'tut_desc_minus'},

            {icon:'cursedKey',key:'tut_desc_cursedkey'},{icon:'scoreDown',key:'tut_desc_scoredown'},

        ];

        cursed.forEach(s=>overlay.appendChild(infoRow(s.icon,tt(s.key),'rgba(231,76,60,.12)','#ecf0f1',true)));



        tOverlay.appendChild(overlay);

        showNext(()=>{ overlay.remove(); goStep(idx('finish')); });

    }



    function infoRow(icon, text, bg, textColor, cursed) {

        const row=mk('div');

        css(row,`display:flex;align-items:center;gap:12px;width:100%;

                 background:${bg};${cursed?'border:1px solid rgba(231,76,60,.3);':''}

                 border-radius:10px;padding:8px 12px;box-sizing:border-box;`);

        const img=mk('img');

        img.src=`icons/${icon}.png`;

        css(img,'width:34px;height:34px;object-fit:contain;flex-shrink:0;');

        img.onerror=()=>{ img.style.display='none'; };

        const txt=mk('div');

        css(txt,`color:${textColor};font-size:.8rem;line-height:1.45;`);

        txt.innerText=text;

        row.appendChild(img);

        row.appendChild(txt);

        return row;

    }



    // ============================================================

    // STEP 9  ─  FINISH

    // ============================================================

function s9() {

        clearSpotlight();

        resetBoard();

        tTrayEl.innerHTML='';

        showCombo(0);



        // Full-screen centered finish card

        const veil=mk('div');

        css(veil,`position:absolute;top:0;left:0;width:100%;height:100%;

                  background:rgba(0,0,0,.5);z-index:10015;

                  display:flex;align-items:center;justify-content:center;

                  padding:20px;box-sizing:border-box;`);



        const box=mk('div');

        css(box,`background:white;border-radius:20px;padding:24px 20px;

                 text-align:center;width:100%;max-width:300px;

                 box-shadow:0 20px 50px rgba(0,0,0,.3);

                 animation:tutBounceIn .5s ease both;box-sizing:border-box;`);



        const emo=mk('div'); css(emo,'font-size:2.5rem;margin-bottom:8px;'); emo.innerText='🎉';

        const title=mk('div'); css(title,'font-size:1.3rem;font-weight:900;color:#2c3e50;margin-bottom:8px;'); title.innerText=tt('tut_finish_title');

        const sub=mk('div'); css(sub,'font-size:.85rem;color:#7f8c8d;margin-bottom:20px;line-height:1.5;'); sub.innerText=tt('tut_finish_sub');

        const btn=mk('button');

        css(btn,`background:#2ecc71;color:white;border:none;border-radius:14px;

                 padding:13px 30px;font-size:1rem;font-weight:900;cursor:pointer;

                 box-shadow:0 6px 20px rgba(46,204,113,.4);width:100%;`);

        btn.innerText=tt('play_btn');

        btn.onclick=closeTut;



        box.appendChild(emo); box.appendChild(title); box.appendChild(sub); box.appendChild(btn);

        veil.appendChild(box);

        tOverlay.appendChild(veil);

    }



    // ============================================================

    // UTILITY SHORTCUTS

    // ============================================================

    function mk(tag)    { return document.createElement(tag); }

    function css(el,s)  { el.style.cssText=(el.style.cssText||'')+s; }



})();
