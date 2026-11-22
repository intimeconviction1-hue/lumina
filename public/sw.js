const CACHE_NAME = "lumina-static-v3";

// Ne conserver hors ligne que les ressources stables. Les pages HTML et les
// bundles JavaScript doivent toujours venir du déploiement actuel.
const STATIC_ASSETS = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Ne jamais répondre avec une ancienne application provenant d'un cache
  // persistant : cela masque notamment les nouveaux liens du menu.
  if (event.request.mode === "navigate" ||
      url.pathname.endsWith(".html") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css")) return;

  // Pour les assets stables uniquement : réseau d'abord, cache en secours.
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok && response.type === "basic") {
        const clone = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)));
      }
      return response;
    }).catch(async () => (await caches.match(event.request)) || Response.error())
  );
});
