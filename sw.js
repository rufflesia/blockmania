const CACHE_NAME = 'BlockMania-v6';

// Oyunun ÇEVRİMDIŞI AÇILABİLMESİ için gereken minimum iskelet.
// Buradaki her dosya kurulum anında indirilip bloke eder, bu yüzden liste
// kasıtlı olarak dar tutuldu. Geri kalan her şey (yüksek seviye sandık
// ikonları, efektler, arka plan 2-5, tüm ses dosyaları) aşağıdaki fetch
// handler'ındaki dinamik önbellekleme sayesinde, oyuncu onları normal
// oynanış sırasında gerçekten istediği an otomatik olarak önbelleğe
// alınıyor — kuruluşta hepsini birden indirmeye gerek yok.
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

  // Ana Görsel
  './blockmania.png',

  // İlk açılışta gösterilen tek arka plan (pc + mobile) — 2-5 dinamik önbelleğe düşer
  './backgrounds/background1_pc.png', './backgrounds/background1_mobile.png',

  // Oyunun ilk birkaç hamlesi için gereken ikonlar
  './icons/chest.png', './icons/chest1.png',
  './icons/key.png', './icons/key_block.png',
  './icons/hammer.png', './icons/shuffle.png', './icons/undo.png',
  './icons/1x1.png', './icons/pts.png', './icons/mult.png',
  './icons/cross.png', './icons/row.png', './icons/col.png',
  './icons/random.png', './icons/M.png', './icons/X.png',
  './icons/life.png', './icons/multX.png', './icons/upg.png',
  './icons/scoreUp.png', './icons/scoreDown.png', './icons/skull.png',
  './icons/cursedKey.png', './icons/minus.png', './icons/hammer_icon.png',
  './icons/bundle1.png', './icons/bundle2.png', './icons/bundle3.png',
  './icons/bundle4.png', './icons/ice.png',
  './icons/megachest_describe.png', './icons/megacombo.png', './icons/multiway.png',
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
        // Bu sayede yüksek seviye sandık ikonları, efektler, diğer arka
        // planlar ve tüm ses dosyaları — oyuncu onları gerçekten
        // tetiklediği an, kurulumu hiç bloke etmeden buradan önbelleğe düşer.
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
