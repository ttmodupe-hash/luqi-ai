/**
 * Luqi-AI — Service Worker
 * Offline-capable PWA caching with stale-proof update behavior.
 *
 * Strategy:
 *  - Page navigations: NETWORK-FIRST (users always get the newest deploy;
 *    falls back to cache only when offline)
 *  - /api/*: network-only (never serve stale API responses)
 *  - Hashed /assets/* files: cache-first (content-hashed = immutable = safe)
 *  - Everything else: network-first
 *
 * CACHE_NAME is versioned — bump it on every structural change so the
 * activate handler purges stale caches from older deploys.
 */
const CACHE_NAME = "luqi-ai-2026-09-06-fix1";

// Only precache paths that actually exist in the deploy
const PRECACHE_ASSETS = ["/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // API: network only
  if (url.pathname.startsWith("/api/")) return;

  // Hashed assets: cache-first (immutable by design)
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigations + everything else: network-first, cache as offline fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            (request.mode === "navigate"
              ? caches.match("/")
              : Promise.resolve(new Response("Offline", { status: 503 })))
        )
      )
  );
});
