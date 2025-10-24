// ★ キャッシュ名を更新すると配信後に確実に切り替わります
const CACHE = 'rihadeiasuka-app-v2';

// 事前キャッシュする静的アセット（必要に応じて追加）
const ASSETS = [
  './',
  './index.html',
  './install.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

// ----- lifecycle -----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // 既存SWを待たず即時適用
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // 既存ページを即このSW管理下に
});

// ----- fetch strategy -----
// ・HTMLナビゲーションは「ネット優先・オフライン時は index.html 」
// ・その他静的ファイルは「キャッシュ優先・なければネット → 成功時に動的キャッシュ」
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // POSTなどは触らない（そのままネットへ）
  if (req.method !== 'GET') return;

  // ナビゲーション（ページ遷移）
  const isHTML =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // 取得できたら index.html も更新しておく（簡易）
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
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
          // 同一オリジンかつ成功したものだけ動的キャッシュ
          const url = new URL(req.url);
          if (netRes.ok && url.origin === location.origin) {
            const copy = netRes.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return netRes;
        })
        .catch(() => cached); // 念のため
    })
  );
});
