const CACHE_NAME = 'BlockMania-v2.1';

// Oyunun çevrimdışı çalışabilmesi için ZORUNLU olan tüm dosyalar
// Not: "offline.html" dosyasını da bu listeye ekledik.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './style.css',
  './manifest.json',
  './dictionary.json',
  
  // JavaScript Dosyaları
  './loading.js',
  './shapes.js',
  './blocks.js',
  './opening.js',
  './game.js',
  './sound.js',
  './tutorial.js',
  
  // Ana Görseller
  './blockmania.png',
  './assets/crack.png',
  
  // İkonlar (loading.js'den çekildi)
  './icons/chest.png', './icons/key.png', './icons/key_block.png', 
  './icons/hammer.png', './icons/shuffle.png', './icons/undo.png', 
  './icons/1x1.png', './icons/pts.png', './icons/mult.png', 
  './icons/cross.png', './icons/row.png', './icons/col.png', 
  './icons/random.png', './icons/M.png', './icons/X.png', 
  './icons/life.png', './icons/multX.png', './icons/upg.png', 
  './icons/scoreUp.png', './icons/scoreDown.png', './icons/skull.png', 
  './icons/cursedKey.png', './icons/minus.png', './icons/hammer_icon.png', 
  './icons/bundle1.png', './icons/bundle2.png', './icons/bundle3.png', 
  './icons/bundle4.png',

  // Ses Dosyaları (sound.js'den çekildi - en önemlileri)
  './sounds/bg_loop.mp3', './sounds/place1.mp3', './sounds/place2.mp3', 
  './sounds/place3.mp3', './sounds/place4.mp3', './sounds/place5.mp3', 
  './sounds/combo_1.mp3', './sounds/combo_2.mp3', './sounds/combo_3.mp3', 
  './sounds/new_tray.mp3', './sounds/chest_open.mp3', './sounds/chest_upgrade.mp3', 
  './sounds/area_destroy.mp3', './sounds/hammer_crack.mp3', './sounds/minus_laugh.mp3', 
  './sounds/big_score_1.mp3', './sounds/big_score_2.mp3', './sounds/big_score_3.mp3', 
  './sounds/undo.mp3', './sounds/key.mp3', './sounds/game_over.mp3', 
  './sounds/score_up.mp3', './sounds/score_down.mp3', './sounds/random_block.mp3', 
  './sounds/life.mp3'
];

// 1. KURULUM (Install) - Statik dosyaları önbelleğe al
self.addEventListener('install', event => {
  self.skipWaiting(); // Yeni Service Worker'ı anında devreye sok
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Öncelikli dosyalar önbelleğe alınıyor...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(err => console.error('[Service Worker] Önbelleğe alma hatası:', err))
  );
});

// 2. AKTİVASYON (Activate) - Eski önbellekleri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Eski önbellek siliniyor:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Kontrolü hemen ele al
});

// 3. GETİRME (Fetch) - Önce Önbellek, Sonra Ağ, Başarısız Olursa Fallback
self.addEventListener('fetch', event => {
  // Sadece GET isteklerini yönet (POST/PUT istekleri önbelleğe alınmaz)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. İstenen dosya önbellekte varsa DİREKT onu döndür (Offline çalışmayı sağlar)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Önbellekte yoksa, ağdan çekmeyi dene
      return fetch(event.request).then(networkResponse => {
        // Geçersiz bir yanıt gelirse (örneğin 404), olduğu gibi döndür
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Başarılı yanıtı klonla ve sonradan kullanılmak üzere önbelleğe ekle (Dinamik Caching)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // 3. FALLBACK: Eğer ağ bağlantısı yoksa VE istenen dosya önbellekte de yoksa:
        // Eğer kullanıcı bir HTML sayfasına (navigasyon) gitmeye çalışıyorsa offline.html'i göster
        if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./offline.html');
        }
        
        // Eğer eksik olan şey bir görselse, istersen buraya bir placeholder görsel döndürebilirsin.
        // return caches.match('./icons/fallback_image.png');
      });
    })
  );
});
