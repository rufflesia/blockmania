// Renk Paleti
const PALETTE = ['#9AD914', '#e02b89', '#F2B749', '#F26938', '#ba2f22', '#854BBF', '#138AF2', '#5451A6', '#000000', '#db5385', '#5D84A6', '#46a83b'];

function rollSpecialItem() {
    let roll = Math.random() * 100;
    if (roll < 2) return 'minus'; roll -= 2;
    if (roll < 0.5 && gameState.chestOddsLevel < 5) return 'upg'; roll -= 0.5;
    if (roll < 0.6 && gameState.baseBlockScore < 35) return 'scoreUp'; roll -= 0.6;
    if (roll < 0.45 && gameState.baseBlockScore > 1) return 'scoreDown'; roll -= 0.45;
    if (roll < 0.5) return 'cursedKey'; roll -= 0.5;
    if (roll < 0.25) return 'life'; roll -= 0.25;
    if (roll < 0.2 && score > 20000 && !deathWave.active && score >= deathWave.nextEligibleScore) return 'skull'; roll -= 0.2;
    if (roll < 0.05) return 'multX'; roll -= 0.05;
    if (roll < 2) return '+'; roll -= 2;
    if (roll < 2.5) return 'row'; roll -= 2.5;
    if (roll < 2.5) return 'col'; roll -= 2.5;
    if (roll < 1.5) return '?'; roll -= 1.5;
    if (roll < 0.1) return 'M'; roll -= 0.1;
    if (roll < 1.0) return 'X'; roll -= 1.0;
    return null; 
}

// ÇEVİRİ MOTORUNA BAĞLANMIŞ AÇIKLAMA SİSTEMİ
function getSpecialDesc(type, r, c) {
    let key = "desc_" + type;
    if (type === 'K') key = 'desc_key';
    if (type === '+') key = 'desc_cross';
    if (type === '?') key = 'desc_random';

    // Sözlükten ana metni çek
    let baseDesc = typeof t === 'function' ? t(key) : key;

    // Eksi bloklarındaki dinamik ceza miktarını hesapla ve sonuna ekle
    if (type === 'minus') {
        let pct = 5;
        if (r !== undefined && c !== undefined && typeof specialBlockStates !== 'undefined' && specialBlockStates[`${r},${c}`]) {
            let age = totalTurns - specialBlockStates[`${r},${c}`].turnPlaced;
            pct = Math.min(20, 5 + (age * 1)); 
        }
        let penalty = Math.floor(score * (pct / 100));
        
        // Aktif dile göre sayıyı metne giydir
        let penaltyText = (typeof currentLang !== 'undefined' && currentLang === 'en')
            ? ` (-${penalty} pts / %${pct})`
            : ` (-${penalty} puan / %${pct})`;
            
        return baseDesc + penaltyText;
    }

    return baseDesc;
}

function getIconHTML(type, r, c) {
    let src = '', emoji = '';
    switch(type) {
        case 'K': src = 'key_block.png'; emoji = '🔑'; break;
        case '+': src = 'cross.png'; emoji = '➕'; break;
        case 'row': src = 'row.png'; emoji = '➖'; break;
        case 'col': src = 'col.png'; emoji = 'I'; break;
        case '?': src = 'random.png'; emoji = '❓'; break;
        case 'M': src = 'M.png'; emoji = '💥'; break;
        case 'X': src = 'X.png'; emoji = '❌'; break;
        case 'life': src = 'life.png'; emoji = '💚'; break;
        case 'multX': src = 'multX.png'; emoji = '✖️'; break;
        case 'upg': src = 'upg.png'; emoji = '🔼'; break;
        case 'scoreUp': src = 'scoreUp.png'; emoji = '💲'; break;
        case 'scoreDown': src = 'scoreDown.png'; emoji = '📉'; break;
        case 'skull': src = 'skull.png'; emoji = '☠️'; break;
        case 'cursedKey': src = 'cursedKey.png'; emoji = '🗝️'; break;
        case 'minus': src = 'minus.png'; emoji = '⛔'; break;
        default: return '';
    }
    let desc = getSpecialDesc(type, r, c);
    let tooltip = desc ? `<div class="special-tooltip">${desc}</div>` : '';
    return `<img src="icons/${src}" class="key-img-board" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><div class="key-emoji-board" style="display:none;">${emoji}</div>${tooltip}`;
}

const KEY_HTML = getIconHTML('K');
const STACK_KEY_HTML = `<img src="icons/key.png" style="width:100%; height:100%; object-fit:contain;" onerror="this.outerHTML='🔑'">`;

function getLootTable() {
    let u = gameState.chestOddsLevel;
    let pts250 = 10 - u, pts500 = 15 - u, pts1000 = 10 - u, pts1500 = 5;
    let m3 = 25 - u, m5 = 10;
    let shuf = 8 + (u*2), ham = 8 + (u*2), undo = 8 + (u*2), x1 = 1 + (u*2);
    
    return [
        { type: 'pts', val: 250, weight: pts250 }, { type: 'pts', val: 500, weight: pts500 }, { type: 'pts', val: 1000, weight: pts1000 }, { type: 'pts', val: 1500, weight: pts1500 },
        { type: 'mult', val: 3, weight: m3 }, { type: 'mult', val: 5, weight: m5 },
        { type: 'joker', val: 'shuffle', weight: shuf }, { type: 'joker', val: 'hammer', weight: ham }, { type: 'joker', val: 'undo', weight: undo }, { type: 'joker', val: '1x1', weight: x1 }
    ];
}

// ÇEVİRİ MOTORUNA BAĞLANMIŞ SANDIK GANİMET YAZILARI
function getLootData(loot) {
    let ptsText = typeof t === 'function' ? t('loot_pts') : "Puan";
    let multText = typeof t === 'function' ? t('loot_mult') : "x5 Çarpan";
    let turnsText = typeof t === 'function' ? t('loot_turns') : "Tur";

    if (loot.type === 'pts') return { iconPath: 'icons/pts.png', emoji: '💎', text: `+${loot.val} ${ptsText}` };
    if (loot.type === 'mult') return { iconPath: 'icons/mult.png', emoji: '🔥', text: `${multText} (${loot.val} ${turnsText})` };
    
    // Jokerlerin isimlerini sözlükteki açıklamaların ":" öncesi kısmını alarak bulur. (Örn: "Çekiç Jokeri: ..." -> "Çekiç Jokeri")
    let getJokerName = (key, fallback) => {
        if (typeof t !== 'function') return fallback;
        let translated = t(key);
        return translated.includes(':') ? translated.split(':')[0] : fallback;
    };

    if (loot.val === 'hammer') return { iconPath: 'icons/hammer.png', emoji: '🔨', text: getJokerName('desc_hammer', 'Çekiç Jokeri') };
    if (loot.val === 'shuffle') return { iconPath: 'icons/shuffle.png', emoji: '🔀', text: getJokerName('desc_shuffle', 'Yenile Jokeri') };
    if (loot.val === 'undo') return { iconPath: 'icons/undo.png', emoji: '↩️', text: getJokerName('desc_undo', 'Geri Al Jokeri') };
    if (loot.val === '1x1') return { iconPath: 'icons/1x1.png', emoji: '🟩', text: getJokerName('desc_1x1', 'Blok') };
}

function rollLoot() {
    let table = getLootTable();
    if (playerJokers.length >= 3) { 
        table = table.filter(i => i.type !== 'joker'); 
        table[0].weight += 10; table[1].weight += 10; table[2].weight += 5; 
    }
    let sum = table.reduce((a, b) => a + b.weight, 0); 
    let r = Math.random() * sum;
    for (let item of table) { 
        if (r < item.weight) return item; 
        r -= item.weight; 
    } 
    return table[0];
}
