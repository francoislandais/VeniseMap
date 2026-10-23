const VERSION = "v2.115.1";
const SHELL = `vq-shell-${VERSION}`;
// Cœur de l'appli précaché ; tout le reste (images, données, vendor) est mis en cache à la volée.
const FILES = ["./", "index.html", "style.css", "app.js", "data.js", "intro.js", "mapstyle.js", "config.js", "manifest.webmanifest", "vendor/maplibre-gl.js", "vendor/maplibre-gl.css", "fonts/special-elite-latin.woff2", "img/map-icon.webp", "img/home-icon.webp", "img/bridge-icon.webp", "data/petits-canaux.json", "data/outfits.json", "data/bridges.json", "data/facts.json", "icons/icon-192.png", "icons/icon-512.png", "img/corto-face.webp", "img/corto-content.webp", "img/corto-venise-pastel.webp"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(SHELL).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("vq-shell-") && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.pathname.startsWith("/api/") || u.pathname.includes("/data/teams")) return; // synchronisation d'équipe : jamais en cache
  if (u.origin === location.origin) { // appli : réseau d'abord (mises à jour immédiates), cache en secours hors ligne
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(SHELL).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok && /tile|openfreemap|stadiamaps|openstreetmap/.test(u.host + u.pathname)) { const cp = res.clone(); caches.open("vq-tiles").then((c) => c.put(r, cp)); } return res; }))); // tuiles : cache d'abord (carte hors-ligne)
});
