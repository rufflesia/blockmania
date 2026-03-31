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

        buildUI();
        goStep(0);
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

        // Exit button
        const exit = mk('button');
        css(exit, `position:absolute;top:10px;right:10px;z-index:10020;background:#e74c3c;
                   color:white;border:none;border-radius:50%;width:34px;height:34px;
                   font-size:1rem;font-weight:bold;cursor:pointer;display:flex;
                   align-items:center;justify-content:center;`);
        exit.innerHTML = '✕';
        exit.onclick = closeTut;
        tOverlay.appendChild(exit);

        // Step badge
        const badge = mk('div');
        badge.id = 'tut-badge';
        css(badge, `position:absolute;top:13px;left:50%;transform:translateX(-50%);
                    font-size:.75rem;color:#7f8c8d;font-weight:bold;z-index:10020;`);
        tOverlay.appendChild(badge);

        // Inner wrapper (mirrors real game layout)
        const wrap = mk('div');
        css(wrap, `display:flex;flex-direction:column;align-items:center;width:100%;
                   max-width:400px;padding:45px 10px 10px;box-sizing:border-box;gap:12px;`);

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
                       align-items:center;justify-content:center;
                       box-shadow:0 4px 15px rgba(46,204,113,.5);`);
        tNextBtn.innerHTML = '▶';
        tOverlay.appendChild(tNextBtn);

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
                       align-items:center;cursor:default;position:relative;box-sizing:border-box;`);
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
        css(comboEl, 'font-size:2rem;font-weight:900;color:#f39c12;opacity:0;transition:opacity .3s,transform .2s;');
        comboEl.innerText = 'x1';

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
            setTimeout(() => {
                const cell = cl(r,c);
                cell.style.transition = 'none';
                cell.classList.add('clearing');
                setTimeout(() => {
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
        for (let c=0;c<9;c++) {
            const cell=cl(row,c);
            cell.style.transition='none';
            cell.classList.add('clearing');
        }
        setTimeout(()=>{
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
        for (let r=0;r<9;r++) {
            const cell=cl(r,col);
            cell.style.transition='none';
            cell.classList.add('clearing');
        }
        setTimeout(()=>{
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
        for (let r=sr;r<sr+3;r++) for (let c=sc;c<sc+3;c++) {
            const cell=cl(r,c);
            cell.style.transition='none';
            cell.classList.add('clearing');
        }
        setTimeout(()=>{
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
        setTimeout(()=>{
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
        tCombo = v;
        const el = document.getElementById('tut-combo');
        if (!el) return;
        el.innerText = `x${v}`;
        el.style.opacity = v > 1 ? '1' : '0';
        if (v > 1) {
            el.style.transform = 'scale(1.3)';
            setTimeout(()=>{ el.style.transform='scale(1)'; },200);
        }
    }

    function updateChestUI() {
        if (!tChestBtn) return;
        if (tKeyCount >= 5) {
            tChestBtn.style.filter = 'drop-shadow(0 0 10px rgba(243,156,18,.8))';
            tChestBtn.style.opacity = '1';
            tChestBtn.style.animation = 'chestBounce 1.5s infinite';
        } else {
            tChestBtn.style.filter = 'grayscale(100%)';
            tChestBtn.style.opacity = '.5';
            tChestBtn.style.animation = '';
        }
        tKeyStackEl.innerHTML = '';
        for (let i=0;i<Math.min(tKeyCount,5);i++) {
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
        document.body.appendChild(p);
        tPopupEl = p;

        requestAnimationFrame(()=>requestAnimationFrame(()=>{
            const rect = el.getBoundingClientRect();
            const pw   = p.offsetWidth  || 250;
            const ph   = p.offsetHeight || 70;
            let left, top;
            if (dir==='top')   { left=rect.left+rect.width/2-pw/2; top=rect.top-ph-14; }
            else if (dir==='right')  { left=rect.right+14;               top=rect.top+rect.height/2-ph/2; }
            else if (dir==='left')   { left=rect.left-pw-14;             top=rect.top+rect.height/2-ph/2; }
            else /* bottom */        { left=rect.left+rect.width/2-pw/2; top=rect.bottom+14; }
            left = Math.max(5,Math.min(left,window.innerWidth -pw-5));
            top  = Math.max(5,Math.min(top, window.innerHeight-ph-5));
            p.style.left = left+'px';
            p.style.top  = top +'px';
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
        setTimeout(() => { toast.remove(); if (cb) cb(); }, 1400);
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
                      grid-template-columns:repeat(${pd.shape[0].length},22px);opacity:.85;
                      transform:scale(1.1);filter:drop-shadow(0 15px 25px rgba(0,0,0,.4));`);
        for (let r=0;r<pd.shape.length;r++) {
            for (let c=0;c<pd.shape[0].length;c++) {
                const pc=mk('div'); css(pc,'width:22px;height:22px;border-radius:3px;');
                if (pd.shape[r][c]===1) pc.style.backgroundColor=pd.color;
                tGhostEl.appendChild(pc);
            }
        }
        document.body.appendChild(tGhostEl);
        movePieceGhost(e.clientX, e.clientY, pd);
        document.addEventListener('pointermove', onPMove);
        document.addEventListener('pointerup',   onPUp);
    }

    function onPMove(e) { if (tDrag) movePieceGhost(e.clientX,e.clientY,tDrag.pd); }

function movePieceGhost(x, y, pd) {
        if (!tGhostEl) return;
        const cols=pd.shape[0].length, rows=pd.shape.length;
        tGhostEl.style.left = (x-cols*12)+'px';
        tGhostEl.style.top  = (y-rows*12-50)+'px';

        clearGhostHL();
        const bR=tBoardEl.getBoundingClientRect();
        const cw=bR.width/9, ch=bR.height/9;
        // Center piece on finger, not top-left
        const bc=Math.floor((x-bR.left)/cw) - Math.floor(cols/2);
        const br=Math.floor((y-50-bR.top)/ch) - Math.floor(rows/2);
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
        const bc=Math.floor((e.clientX-bR.left)/cw) - Math.floor(cols/2);
        const br=Math.floor((e.clientY-50-bR.top)/ch) - Math.floor(rows/2);
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
        setTimeout(()=>{
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
        moveHammerGhost(e.clientX,e.clientY);
        document.addEventListener('pointermove',onHMove);
        document.addEventListener('pointerup',  onHUp);
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
        // Shake overlay
        tOverlay.style.animation='shake .4s cubic-bezier(.36,.07,.19,.97) both';
        setTimeout(()=>tOverlay.style.animation='',400);

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
        setTimeout(()=>crackDiv.remove(),1500);

        // Clear 2×2 cells
        setTimeout(()=>{
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

            setTimeout(()=>{
                tAnimLock=false;
                if (tOnHammer) { const cb=tOnHammer; tOnHammer=null; cb(); }
            },800);
        },200);
    }

    // ============================================================
    // ANIMATIONS: key fly, joker fly
    // ============================================================
    function flyKeyToChest(fromEl, cb) {
        const fR=fromEl.getBoundingClientRect();
        const tR=tChestBtn.getBoundingClientRect();
        const fly=mk('div');
        css(fly,`position:fixed;left:${fR.left}px;top:${fR.top}px;
                 width:${fR.width}px;height:${fR.height}px;z-index:10025;
                 transition:transform .8s cubic-bezier(.34,1.56,.64,1);`);
        fly.innerHTML=`<img src="icons/key.png" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='🔑'">`;
        document.body.appendChild(fly);
        setTimeout(()=>{ fly.style.transform=`translate(${tR.left-fR.left+15}px,${tR.top-fR.top+15}px) scale(1.5) rotate(360deg)`; },20);
        setTimeout(()=>{
            fly.remove();
            tKeyCount++;
            updateChestUI();
            tChestBtn.classList.add('chest-pop-anim');
            setTimeout(()=>tChestBtn.classList.remove('chest-pop-anim'),300);
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
        setTimeout(()=>{
            loot.style.transform=`translate(${px}px,${py}px) scale(1.2) rotate(-10deg)`;
            setTimeout(()=>{
                loot.style.transform=`translate(${px}px,${py+30}px) scale(1) rotate(0)`;
                setTimeout(()=>{
                    const sR=tJokerSlots[slotIdx].getBoundingClientRect();
                    const dx=sR.left+sR.width/2-(cR.left+px)-26;
                    const dy=sR.top +sR.height/2-(cR.top+py+30)-26;
                    loot.style.transition='transform .6s cubic-bezier(.55,.085,.68,.53),opacity .6s ease-in';
                    loot.style.transform=`translate(${px+dx}px,${py+30+dy}px) scale(.4)`;
                    loot.style.opacity='0';
                    setTimeout(()=>{
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
    const STEPS=[s0,s1,s2,s3,s4,s5,s6,s7,s8,s9];
    const TOTAL_STEPS=9; // displayed count (finish not counted)

    function goStep(n) {
        tStep=n;
        clearSpotlight();
        tNextBtn.style.display='none';
        const badge=document.getElementById('tut-badge');
        if (badge) badge.innerText=`${Math.min(n+1,TOTAL_STEPS)} / ${TOTAL_STEPS}`;
        if (STEPS[n]) STEPS[n]();
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

        setTimeout(()=>{
            const pw=tTrayEl.querySelector('div');
            spotlight(pw, tt('tut_s1_desc'), 'top');
            tOnPlaced=(pd,sr,sc)=>{
                clearSpotlight();
                if (tBoard[7].every(v=>v!==0)) {
                    setTimeout(()=>clearRowAnim(7,()=>{ addScore(90); tAnimLock=false; setTimeout(()=>goStep(1),600); }),200);
                } else {
                    tAnimLock=false;
                    showTryAgain(tt('tut_wrong'), () => {
                        goStep(0);
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

        setTimeout(()=>{
            const pw=tTrayEl.querySelector('div');
            spotlight(pw, tt('tut_s2_desc'), 'top');
            tOnPlaced=(pd,sr,sc)=>{
                clearSpotlight();
                if ([0,1,2,3,4,5,6,7,8].every(r=>tBoard[r][8]!==0)) {
                    setTimeout(()=>clearColAnim(8,()=>{ addScore(90); tAnimLock=false; setTimeout(()=>goStep(2),600); }),200);
                } else {
                    tAnimLock=false;
                    showTryAgain(tt('tut_wrong'), () => {
                        goStep(1);
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

        setTimeout(()=>{
            const pw=tTrayEl.querySelector('div');
            spotlight(pw, tt('tut_s3_desc'), 'top');
            tOnPlaced=(pd,sr,sc)=>{
                clearSpotlight();
                const ok=[0,1,2].every(i=>[0,1,2].every(j=>tBoard[6+i][6+j]!==0));
                if (ok) {
                    setTimeout(()=>clearBoxAnim(6,6,()=>{ addScore(90); tAnimLock=false; setTimeout(()=>goStep(3),600); }),200);
                } else {
                    tAnimLock=false;
                    showTryAgain(tt('tut_wrong'), () => {
                        goStep(2);
                    });
                }
            };
        },500);
    }

    // ============================================================
    // STEP 3  ─  CHEST INTRO
    // ============================================================
    function s3() {
        resetBoard();
        tTrayEl.innerHTML='';
        tKeyCount=0; updateChestUI();

        // Chest bounce-in
        tChestBtn.style.transform='scale(0)';
        tChestBtn.style.transition='transform .5s cubic-bezier(.175,.885,.32,1.275)';
        setTimeout(()=>{
            tChestBtn.style.transform='scale(1)';
            setTimeout(()=>{
                spotlight(tChestBtn, tt('tut_s4_desc'), 'left');
                showNext(()=>goStep(4));
            },600);
        },200);
    }

    // ============================================================
    // STEP 4  ─  KEY COLLECTION + CHEST OPEN
    // ============================================================
    function s4() {
        resetBoard();
        tKeyCount=0; updateChestUI();
        tTrayEl.innerHTML='';

        // Pre-fill row 5, leaving cols 3,4,5 open for the 1×3 piece
        for (let c=0;c<3;c++) fill(5,c,'#5451A6');
        for (let c=6;c<9;c++) fill(5,c,'#5451A6');
        [[1,2],[2,5],[3,1],[4,4],[6,2],[7,6],[8,3]].forEach(([r,c])=>fill(r,c,'#8C5332'));

        // 1×3 piece with key in the middle cell
        const shape=[[1,1,1]];
        setTray([{shape, color:TC, hasKey:true, keyPos:{r:0,c:1}}]);

        setTimeout(()=>{
            const pw=tTrayEl.querySelector('div');
            spotlight(pw, tt('tut_s5_desc'), 'top');

            tOnPlaced=(pd,sr,sc,keyCell)=>{
                clearSpotlight();
                if (!keyCell) { tAnimLock=false; return; }

                setTimeout(()=>{
                    flyKeyToChest(keyCell,()=>{
                        // Clear key cell from board
                        const kr=sr, kc=sc+1;
                        tBoard[kr][kc]=0;
                        const kCellEl=cl(kr,kc);
                        kCellEl.innerHTML='';
                        kCellEl.style.backgroundColor=cellBg(kr,kc);

                        // Simulate collecting 4 more keys with a fun cascade
                        let delay=0;
                        for (let i=1;i<=4;i++) {
                            delay+=350;
                            (function(count){ setTimeout(()=>{ tKeyCount=count; updateChestUI(); },delay); })(i+1);
                        }

                        setTimeout(()=>{
                            tKeyCount=5; updateChestUI();
                            setTimeout(()=>{
                                spotlight(tChestBtn, tt('tut_s5_open'), 'left');
                                tChestBtn.onclick=()=>{
                                    tChestBtn.onclick=null;
                                    clearSpotlight();
                                    tAnimLock=true;
                                    tChestBtn.classList.add('chest-pop-anim');
                                    setTimeout(()=>tChestBtn.classList.remove('chest-pop-anim'),300);
                                    tKeyCount=0; updateChestUI();
                                    setTimeout(()=>{
                                        flyJokerToSlot('hammer',0,()=>{
                                            spotlight(tJokerSlots[0], tt('tut_s5_hammer'), 'bottom');
                                            tAnimLock=false;
                                            showNext(()=>goStep(5));
                                        });
                                    },400);
                                };
                            },500);
                        },delay+400);
                    });
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

        setTimeout(()=>{
            spotlight(tJokerSlots[0], tt('tut_s6_desc'), 'bottom');
            enableHammerDrag(tJokerSlots[0]);
            tOnHammer=()=>setTimeout(()=>goStep(6),800);
        },400);
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

        setTimeout(()=>{
            const pw=tTrayEl.querySelector('div');
            spotlight(pw, tt('tut_s7_desc'), 'top');

            tOnPlaced=(pd,sr,sc)=>{
                clearSpotlight();
                // Expand the row clear from the placed cell outward
                setTimeout(()=>{
                    const origin=cl(sr,sc);
                    origin.style.animation='areaClearAnim .6s cubic-bezier(.55,.085,.68,.53) forwards';
                    setTimeout(()=>{
                        origin.style.animation='';
                        tBoard[sr][sc]=0;
                        origin.style.backgroundColor=cellBg(sr,sc);
                        origin.innerHTML='';
                    },600);

                    // Ripple clear of the rest of the row
                    const targets=[];
                    for (let c2=0;c2<9;c2++) if (c2!==sc) targets.push({r:sr,c:c2});
                    targets.sort((a,b)=>Math.abs(a.c-sc)-Math.abs(b.c-sc));
                    targets.forEach((t,i)=>setTimeout(()=>clearCellAnim(t.r,t.c,0),i*70));

                    setTimeout(()=>{
                        crazyGrid(()=>{
                            addScore(180);
                            tAnimLock=false;
                            setTimeout(()=>goStep(7),600);
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
                setTimeout(()=>{
                    clearRowAnim(clearedRow,()=>{
                        tAnimLock=false;
                        if (placed>=4) {
                            setTimeout(()=>goStep(8),800);
                        } else {
                            serveNextPiece();
                            setTimeout(()=>{
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
                    setTimeout(()=>{
                        const pw=tTrayEl.querySelector('div');
                        if(pw) spotlight(pw, tt('tut_s8_desc'), 'top');
                    }, 300);
                });
            }
        }

        setTimeout(()=>{
            serveNextPiece();
            setTimeout(()=>{
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
        showNext(()=>{ overlay.remove(); goStep(9); });
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
