// Bump this version whenever you want to force refresh
const CACHE = "orders-cache-v4";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Network-first for HTML (so updates show), cache-first for others
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");

  if (isHtml) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request, { cache: "no-store" });
        const cache = await caches.open(CACHE);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    const res = await fetch(event.request);
    const cache = await caches.open(CACHE);
    cache.put(event.request, res.clone());
    return res;
  })());
});
