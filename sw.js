const VERSION = "v2.329.6";
const SHELL = `vq-shell-${VERSION}`;
// Cœur de l'appli précaché ; le reste peut être préparé depuis le profil du joueur.
const FILES = ["./", "index.html", "style.css", "app.js", "data.js", "corto-lieux.js", "intro.js", "mapstyle.js", "config.js", "manifest.webmanifest", "vendor/maplibre-gl.js", "vendor/maplibre-gl.css", "fonts/special-elite-latin.woff2", "img/map-icon.webp", "img/objets/coquille.svg", "img/objets/perle.svg", "img/objets/plume.svg", "img/objets/coffre-code.svg", "img/objets/parchemin.svg", "img/objets/partition.svg", "img/objets/cle-bronze.svg", "img/objets/fiole-lagune.svg", "img/objets/verre-murano.svg", "img/objets/boussole.svg", "img/objets/masque.svg", "img/objets/sceau-lion.svg", "img/objets/diamant.svg", "img/objets/ruban-soie.svg", "img/objets/lanterne.svg", "img/intro/bg.webp", "img/home-icon.webp", "img/bridge-icon.webp", "data/petits-canaux.json", "data/outfits.json", "data/bridges.json", "data/facts.json", "icons/icon-192.png", "icons/icon-512.png", "img/corto-face.webp", "img/corto-content.webp", "img/corto-venise-pastel.webp"];
FILES.push("data/music-challenges.json", "data/conclusion-layout.json", "data/music-layout.json", "img/montage/murano.webp", "img/q/credits.json", ...[1, 2, 3, 4].map((n) => `img/q/torcello-${n}.webp`), ...["burano-lace.webp", "burano-galuppi.webp", "burano-bussola.webp", "buranotour-leaning.webp"].map((name) => `img/q/${name}`));
FILES.push("data/murano-island.geojson", "img/plan/salute.svg");
FILES.push("data/arbres.json", ...["olivier_torcello", "palmier_san_servolo", "fevier_giardini_reali", "micocoulier_piazzale_roma"].flatMap((id) => [256, 512].map((size) => `img/arbres/${id}_${size}.png`)));
FILES.push("img/arbres/olivier-torcello-photo.webp", "img/objets/olive-torcello.webp");
FILES.push("img/objets/coquillage-murano.svg");
FILES.push("img/objets/rubis-burano.svg");
FILES.push("data/masques.json", "img/masque-venitien-transparent.png", "audio/mask-triumph.mp3");
FILES.push("icons/corto-192.png", "icons/corto-512.png", "icons/corto-maskable-512.png", "icons/corto-apple-touch-180.png");
FILES.push(...[1, 2, 3, 4, 5].map((n) => `img/masque-carnaval-${n}.webp`));
FILES.push("data/doge-interaction.js");
FILES.push("corto-rendezvous.js", "corto-rendezvous-editor.js", "gondolier-rendezvous.js", "gondolier-rendezvous-editor.js", "data/corto-rendezvous-layout.json", "data/gondolier-rendezvous-layout.json", "img/intro/e1.webp", "img/narrative/corto-tempete.png", "img/narrative/corto-gondolier-fin.png", "img/narrative/gondolier-gold-key.png", "img/narrative/gondolier-debut-tempete.png");
FILES.push("corto-sound.js", "audio/corto-wind.mp3", "audio/corto-thunder.mp3");
self.addEventListener("install", (e) => { e.waitUntil(caches.open(SHELL).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("vq-shell-") && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
function tileFresh(response) {
  if (!response) return false;
  const control = response.headers.get("Cache-Control") || "";
  if (/no-store/i.test(control)) return false;
  const age = Number(response.headers.get("X-VQ-Cached-At"));
  if (!age) return false;
  const seconds = /max-age=(\d+)/i.exec(control);
  if (seconds) return Date.now() - age < Number(seconds[1]) * 1000;
  const expires = Date.parse(response.headers.get("Expires") || "");
  return Number.isFinite(expires) ? Date.now() < expires : Date.now() - age < 7 * 86400000;
}
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.pathname.startsWith("/admin/")) return;
  if (u.pathname.startsWith("/api/") || u.pathname.includes("/data/teams")) return; // synchronisation d'équipe : jamais en cache
  if (u.hostname === "tiles.stadiamaps.com") {
    e.respondWith(caches.open("vq-tiles").then(async (cache) => {
      const saved = await cache.match(r);
      if (tileFresh(saved)) return saved;
      try {
        const res = await fetch(r);
        if (res.ok && !/no-store/i.test(res.headers.get("Cache-Control") || "")) {
          const headers = new Headers(res.headers);
          headers.delete("Content-Encoding"); headers.delete("Content-Length");
          headers.set("X-VQ-Cached-At", String(Date.now()));
          e.waitUntil(cache.put(r, new Response(res.clone().body, { status: res.status, headers })).catch(() => {}));
        }
        return res;
      } catch (error) { if (saved) return saved; throw error; }
    }));
    return;
  }
  if (u.origin === location.origin) { // fichiers de cette version : cache d'abord après préparation
    e.respondWith(caches.open(SHELL).then(async (cache) => {
      const saved = await cache.match(r, { ignoreSearch: true });
      if (saved) return saved;
      try {
        const res = await fetch(r);
        if (res.ok) e.waitUntil(cache.put(r, res.clone()).catch(() => {}));
        return res;
      } catch (error) {
        if (r.mode === "navigate") return cache.match("index.html").then((page) => page || Promise.reject(error));
        throw error;
      }
    }));
    return;
  }
  // Autres ressources externes : le cache HTTP normal du navigateur applique les règles du fournisseur.
});
