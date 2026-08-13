// Service Worker für "Tagwerk"
// Strategie: Netzwerk zuerst (damit Updates sofort ankommen),
// bei Offline-Betrieb Rückgriff auf den Cache.
const CACHE = "mein-tag-v34";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Tippen auf eine Mitteilung: App nach vorne holen statt neuen Tab öffnen
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});

// Für später: echte Push-Nachrichten von einem Server
self.addEventListener("push", e => {
  let title = "Tagwerk", body = "Da ist noch was offen.";
  try {
    const d = e.data ? e.data.json() : null;
    if (d) { title = d.title || title; body = d.body || body; }
  } catch {
    if (e.data) body = e.data.text();
  }
  e.waitUntil(self.registration.showNotification(title, {
    body, icon: "icon-192.png", badge: "icon-192.png", tag: "push", renotify: true
  }));
});

self.addEventListener("fetch", e => {
  // API-Anfragen an Anthropic nie abfangen oder cachen
  if (e.request.url.includes("api.anthropic.com")) return;
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
  );
});
