// Renk Paleti

const PALETTE = ['#9AD914', '#e02b89', '#F2B749', '#F26938', '#ba2f22', '#854BBF', '#138AF2', '#5451A6', '#000000', '#db5385', '#5D84A6', '#46a83b'];



function rollSpecialItem() {

    let roll = Math.random() * 100;

    let level = Math.min(10, Math.floor(score / 10000));

    if (roll < 2) return 'minus'; roll -= 2;

    if (roll < 2.35 && gameState.chestOddsLevel < 30) return 'upg'; roll -= 2.35;

    if (roll < 0.8 && gameState.baseBlockScore < 50) return 'scoreUp'; roll -= 0.8;

    if (roll < 0.45 && gameState.baseBlockScore > 1) return 'scoreDown'; roll -= 0.45;

    if (roll < 0.5) return 'cursedKey'; roll -= 0.5;

    if (roll < 0.25) return 'life'; roll -= 0.25;

    if (roll < 0.2 && score > 20000) return 'skull'; roll -= 0.2;

    if (roll < 0.04 && level >= 1) return 'multX'; roll -= 0.04;

    if (roll < 2.2) return '+'; roll -= 2.2;

    if (roll < 2.7) return 'row'; roll -= 2.7;

    if (roll < 2.7) return 'col'; roll -= 2.7;

    if (roll < 1.7) return '?'; roll -= 1.7;

    if (roll < 0.15) return 'M'; roll -= 0.15;

    if (roll < 1.2) return 'X'; roll -= 1.2;

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

        let pct = 1;

        if (r !== undefined && c !== undefined && typeof specialBlockStates !== 'undefined' && specialBlockStates[`${r},${c}`]) {

            let age = totalTurns - specialBlockStates[`${r},${c}`].turnPlaced;

            pct = Math.min(20, 1 + (age * 1)); 

        }

        let penalty = Math.floor(score * (pct / 100));

        

        let penaltyText = (typeof currentLang !== 'undefined' && currentLang === 'en')

            ? ` (-${penalty} pts / %${pct})`

            : ` (-${penalty} puan / %${pct})`;

            

        return baseDesc + penaltyText;

    }

    return baseDesc;

}



function escapeHTML(str) {

    return String(str)

        .replace(/&/g, '&amp;')

        .replace(/</g, '&lt;')

        .replace(/>/g, '&gt;')

        .replace(/"/g, '&quot;')

        .replace(/'/g, '&#39;');

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

    let tooltip = desc ? `<div class="special-tooltip">${escapeHTML(desc)}</div>` : '';

    return `<img src="icons/${src}" class="key-img-board" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><div class="key-emoji-board" style="display:none;">${emoji}</div>${tooltip}`;

}



const KEY_HTML = getIconHTML('K');

const STACK_KEY_HTML = `<img src="icons/key.png" style="width:100%; height:100%; object-fit:contain;" onerror="this.outerHTML='🔑'">`;



function getLootTable() {

    const CHEST_TIERS = [250, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000];

    let shift = Math.floor(gameState.chestOddsLevel / 3);

    shift = Math.min(shift, CHEST_TIERS.length - 4); 



    // Artık oranlar sabit. (Toplam ağırlık: 100 üzerinden yüzdeler)

    return [

        { type: 'pts', val: CHEST_TIERS[shift], weight: 25 }, 

        { type: 'pts', val: CHEST_TIERS[shift + 1], weight: 20 }, 

        { type: 'pts', val: CHEST_TIERS[shift + 2], weight: 10 }, 

        { type: 'pts', val: CHEST_TIERS[shift + 3], weight: 5 },

        { type: 'mult', val: 'dynamic', weight: 10 },

        { type: 'joker', val: 'shuffle', weight: 6 }, 

        { type: 'joker', val: 'hammer', weight: 6 }, 

        { type: 'joker', val: 'undo', weight: 6 }, 

        { type: 'joker', val: '1x1', weight: 6 }, 

        { type: 'joker', val: 'bundle', weight: 6 }

    ];

}



function getLootData(loot) {

    let ptsText = typeof t === 'function' ? t('loot_pts') : "Puan";

    let multText = typeof t === 'function' ? t('loot_mult') : "x${currentMultVal} Çarpan";

    let turnsText = typeof t === 'function' ? t('loot_turns') : "Tur";



    if (loot.type === 'pts') return { iconPath: 'icons/pts.png', emoji: '💎', text: `+${loot.val} ${ptsText}` };

    if (loot.type === 'mult') {

        let currentMultVal = typeof window.getMultValue === 'function' ? window.getMultValue(gameState.chestOddsLevel) : 5;

        return { iconPath: 'icons/mult.png', emoji: '🔥', text: `x${currentMultVal} ${multText} (${loot.val} ${turnsText})` };

    }

    

    let getJokerName = (key, fallback) => {

        if (typeof t !== 'function') return fallback;

        let translated = t(key);

        return translated.includes(':') ? translated.split(':')[0] : fallback;

    };



    if (loot.val === 'hammer') return { iconPath: 'icons/hammer.png', emoji: '🔨', text: getJokerName('desc_hammer', 'Çekiç Jokeri') };

    if (loot.val === 'shuffle') return { iconPath: 'icons/shuffle.png', emoji: '🔀', text: getJokerName('desc_shuffle', 'Yenile Jokeri') };

    if (loot.val === 'undo') return { iconPath: 'icons/undo.png', emoji: '↩️', text: getJokerName('desc_undo', 'Geri Al Jokeri') };

    if (loot.val === '1x1') return { iconPath: 'icons/1x1.png', emoji: '🟩', text: getJokerName('desc_1x1', 'Blok') };

    if (loot.val === 'bundle') return { iconPath: 'icons/bundle1.png', emoji: '💰', text: getJokerName('desc_bundle', 'Kese Jokeri') };

}



function rollLoot() {

    let table = getLootTable();

    

    // Stack mantığı ile joker havuzunu filtreleme

    table = table.filter(item => {

        if (item.type !== 'joker') return true;

        let existing = playerJokers.find(j => j.type === item.val);

        if (!existing) {

            return playerJokers.length < 3; 

        } else {

            let maxStack = (item.val === '1x1') ? 6 : (item.val === 'bundle' ? 1 : 3);

            return (existing.count || 1) < maxStack; 

        }

    });

    

    // Varsa iptal edilen jokerlerin ağırlığını diğer jokerlere paylaştır

    let hasBundle = playerJokers.some(j => j.type === 'bundle');

    if (hasBundle) {

         let remainingJokers = table.filter(i => i.type === 'joker');

         if(remainingJokers.length > 0) {

             let extra = 6 / remainingJokers.length;

             remainingJokers.forEach(j => j.weight += extra);

         }

    }



    let sum = table.reduce((a, b) => a + b.weight, 0); 

    let r = Math.random() * sum;

    

    for (let item of table) { 

        if (r < item.weight) {

            if (item.type === 'mult' && item.val === 'dynamic') {
                item.val = window.rollMultTurns ? window.rollMultTurns(gameState.chestOddsLevel) : 3;
            }
            return item; 
        }
        r -= item.weight; 
    } 
    return table[0];
}
