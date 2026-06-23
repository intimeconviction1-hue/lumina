const CACHE_NAME = "ma-cultura-v1";

// Ressources à mettre en cache au démarrage
const STATIC_ASSETS = [
  "/",
  "/index.html"
];

// Installation : mise en cache des ressources statiques
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : stratégie "Network First, fallback cache"
self.addEventListener("fetch", (event) => {
  // On ne gère que les requêtes GET
  if (event.request.method !== "GET") return;

  // On ignore les requêtes API/backend
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.hostname !== location.hostname) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // On met à jour le cache avec la réponse fraîche
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Fallback : réponse depuis le cache si offline
        return caches.match(event.request).then((cached) => cached || caches.match("/"));
      })
  );
});
