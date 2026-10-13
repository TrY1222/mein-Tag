// Service Worker für Tagwerk (Startseite, drei Apps, Archiv)
// Strategie: Netzwerk zuerst (damit Updates sofort ankommen), offline aus dem Cache.
const CACHE = "tagwerk-v51";
const KEEP = ["tw-transfer"];   // Datenübergabe an neu installierte Symbole – nie löschen
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./tw.css", "./tw.js",
  "./aufgaben.html", "./aufgaben.js", "./aufgaben.webmanifest",
  "./gewohnheiten.html", "./gewohnheiten.js", "./gewohnheiten.webmanifest",
  "./vokabeln.html", "./vokabeln.js", "./vokabeln.webmanifest",
  "./icon-aufgaben.png", "./icon-aufgaben-192.png", "./apple-aufgaben.png",
  "./icon-gewohnheiten.png", "./icon-gewohnheiten-192.png", "./apple-gewohnheiten.png",
  "./icon-vokabeln.png", "./icon-vokabeln-192.png", "./apple-vokabeln.png",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./alt.html", "./app.js", "./style.css"
];

self.addEventListener("install", e => {
  // Einzeln cachen: fehlt eine Datei, scheitert nicht gleich alles
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && !KEEP.includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Tippen auf eine Mitteilung: App nach vorne holen statt neuen Tab öffnen
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) if ("focus" in c) return c.focus();
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("fetch", e => {
  // Claude-Anfragen nie abfangen oder cachen
  if (e.request.url.includes("api.anthropic.com")) return;
  if (e.request.method !== "GET") return;
  // Die Datenübergabe liegt nur im Cache, nicht auf dem Server
  if (e.request.url.includes("__tagwerk-transfer")) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match("./index.html")))
  );
});
