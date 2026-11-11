// Service worker: uloží soubory appky do telefonu, takže běží i bez internetu.
// DŮLEŽITÉ: po každé změně souborů zvyš verzi, jinak telefon drží starou verzi.
const CACHE = 'narcis-v7';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/theme.css',
  './css/style.css',
  './js/app.js',
  './js/routes.js',
  './js/db.js',
  './js/utils.js',
  './js/quick-entry.js',
  './js/spoken-entry.js',
  './js/gym-data.js',
  './js/views/gym-log.js',
  './js/views/workouts.js',
  './js/views/plans.js',
  './js/views/table.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// Instalace: stáhni a ulož všechny soubory
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

// Aktivace: smaž staré verze cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Každý požadavek: nejdřív z cache, když tam není, tak z internetu
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
