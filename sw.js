const CACHE_NAME = 'BlockMania-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // İkonlarının yollarını buraya ekle ki çevrimdışı da yüklensin
  './icons/chest.png',
  './icons/key.png',
  './icons/pts.png',
  './icons/mult.png',
  './icons/hammer.png',
  './icons/shuffle.png',
  './icons/undo.png',
  './icons/1x1.png',
  './icons/info.png',
  './assets/crack.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});