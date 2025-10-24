// ====== バージョン管理 ======
// 1) ここ（const SHELL_CACHE = 'rihadeiasuka-shell-v5';）を増分すると古いキャッシュを掃除
// 2) install.html / index.html の register('./sw.js?v=5') の数字も一緒に増分
const SHELL_CACHE = 'rihadeiasuka-shell-v6';
const PRECACHE = [
  './',
  './index.html',
  './install.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './favicon-16.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' ||
                 req.destination === 'document' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        caches.open(SHELL_CACHE).then(c => c.put('./index.html', res.clone()));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(netRes => {
        const url = new URL(req.url);
        if (netRes.ok && url.origin === location.origin) {
          caches.open(SHELL_CACHE).then(c => c.put(req, netRes.clone()));
        }
        return netRes;
      });
    })
  );
});
