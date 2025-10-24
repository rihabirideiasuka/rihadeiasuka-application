// === バージョンを上げると配信後に確実に切り替わります ===
const SHELL_CACHE = 'rihadeiasuka-shell-v3';

// 事前キャッシュする静的アセット
const PRECACHE = [
  './',
  './index.html',
  './install.html',
  './manifest.webmanifest.txt',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

// ----- lifecycle -----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ----- fetch strategy -----
// ・HTMLナビゲーション: ネット優先 → 失敗時は index.html
// ・それ以外: キャッシュ優先 → なければネット → 成功時は同一オリジンだけ動的キャッシュ
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET以外は対象外
  if (req.method !== 'GET') return;

  const isHTML =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // 最新index.htmlをキャッシュへ入れ直す（簡易）
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 画像/JS/CSS 等はキャッシュ優先
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((netRes) => {
          // 同一オリジンかつ成功レスポンスのみ動的キャッシュ
          const url = new URL(req.url);
          if (netRes.ok && url.origin === location.origin) {
            const copy = netRes.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return netRes;
        })
        .catch(() => cached || Promise.reject('offline'))
    })
  );
});
