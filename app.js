import { loadProfile, saveProfile, clearProfile, runIntro, cortoSays, editProfile, FACE } from "./intro.js";
import { createMap, WC_URL, OSM_URL, OFM_TILEJSON, FONTS, useStamen } from "./mapstyle.js";
import { STORY, LEVELS, COLLECTIONS, AVATARS, PLACES, POINTS } from "./data.js";
import { LIEUX, PLACE_FAR } from "./corto-lieux.js";
import { createNarrative } from "./narrative-engine.mjs";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let scoreAnim = null; // animation du compteur en cours (étoiles qui arrivent)
const KEY = "vq_state_v1";
const QS = new URLSearchParams(location.search);
// Seul l’interrupteur de l’onglet Dév. active les outils de test. L’ancien réglage est ignoré.
let DEV = false;
try { DEV = localStorage.getItem("vq_dev_enabled_v2") === "1"; } catch {}
const LOCAL_PREVIEW = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const LOCAL_DEV = DEV && LOCAL_PREVIEW;
const DAY_MS = 86400000;

/* ───────── État (fusionnable : une clé = un fait, dernier écrit gagnant) ───────── */
const isoToday = () => new Date().toISOString().slice(0, 10);
function freshState() {
  return { kids: [{ name: "", avatar: "🦁" }, { name: "", avatar: "🐙" }], start: isoToday(), done: {}, cfgT: 0, onboarded: false };
}
function loadState() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.done) return s; } catch {}
  return freshState();
}
let S = loadState();

function mergeState(a, b) {
  const done = { ...(a.done || {}) };
  for (const [k, v] of Object.entries(b.done || {})) if (!done[k] || (v.t || 0) > (done[k].t || 0)) done[k] = v;
  const cfg = (b.cfgT || 0) > (a.cfgT || 0) ? b : a;
  return { kids: cfg.kids, start: cfg.start, teamName: cfg.teamName || "", onboarded: a.onboarded || b.onboarded, cfgT: Math.max(a.cfgT || 0, b.cfgT || 0), done };
}
let syncTimer;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  clearTimeout(syncTimer); syncTimer = setTimeout(sync, 800);
}
let syncStatus = "…";
// Équipe et code de la partie : mémorisés sur ce téléphone (plusieurs téléphones d'une même famille donnent le même nom d'équipe).
const TEAMKEY = "vq_team";
const LEAGUE = "1234"; // code de la partie (voir data/league.txt sur le Pi)
let TEAM = null;
try { TEAM = JSON.parse(localStorage.getItem(TEAMKEY)); } catch {}
const slug = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const apiHeaders = () => ({ "content-type": "application/json", "X-Team": (TEAM && TEAM.team) || "famille", "X-League": (TEAM && TEAM.league) || "" });
async function sync() {
  if (!JEU) return;
  backfillQuestionWorks();
  try {
    const r = await fetch("api/sync", { method: "POST", headers: apiHeaders(), body: JSON.stringify(S) });
    if (r.status === 403) { syncStatus = "🔒 code de la partie incorrect"; if (tab === "settings") renderSettings(); return; }
    if (!r.ok) throw new Error(r.status);
    const before = JSON.stringify(S);
    S = mergeState(S, await r.json());
    backfillQuestionWorks();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
    syncStatus = "✅ synchronisé " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (before !== JSON.stringify(S)) refreshAll();
  } catch { syncStatus = "📴 hors-ligne (les points sont gardés sur ce téléphone)"; }
  if (tab === "settings") renderSettings();
}

const has = (k) => !!S.done[k] && !S.done[k].d;
const award = (k, p, w = "all") => { S.done[k] = { t: Date.now(), p, w }; };
const unaward = (k) => { S.done[k] = { t: Date.now(), p: 0, d: 1 }; };
const points = () => Object.values(S.done).reduce((n, v) => n + (v.d ? 0 : v.p || 0), 0);
const pointsOf = (i) => Object.values(S.done).reduce((n, v) => n + (!v.d && (v.w == null || v.w === "all" || v.w === i) ? v.p || 0 : 0), 0);
let active = 0;
let tab = "map", lastTab = "days", menuOpen = false, menuReturnPending = false;
try { active = +localStorage.getItem("vq_active") || 0; } catch {}
const me = () => S.kids[Math.min(active, S.kids.length - 1)];
const meIdx = () => Math.min(active, S.kids.length - 1);
const myName = () => me().name || "Joueur " + (meIdx() + 1);
function setActive(i) { active = i; try { localStorage.setItem("vq_active", i); } catch {} refreshAll(); }
// Outil de développement : ?niveau=N force le grade affiché (0 = simple touriste) et reste mémorisé ; ?niveau= le retire.
let devLevel = null;
try {
  if (DEV) {
    const q = QS.get("niveau");
    if (q !== null) { if (q === "") localStorage.removeItem("vq_dev_level"); else localStorage.setItem("vq_dev_level", q); }
    const s = localStorage.getItem("vq_dev_level"); if (s !== null) devLevel = Math.max(0, Math.min(LEVELS.length - 1, +s || 0));
  }
} catch {}
const level = (pts = points()) => { if (devLevel !== null) return devLevel; let i = 0; LEVELS.forEach((l, j) => { if (pts >= l.min) i = j; }); return i; };

// Lieux à chapitres : chaque question (hors extraits audio pas encore disponibles) devient une « tâche » numérotée, pour que
// les étoiles, la complétion et la couleur du macaron fonctionnent comme pour les autres lieux.
// Une étape peut enchaîner plusieurs questions (champ next) : même bulle, même image, nouvelle question à chaque réponse.
const chainOf = (s) => [s, ...(s.next || [])];
PLACES.forEach((p) => { if (!p.chapters) return; const used = new Set(p.chapters.flatMap((c) => c.steps.flatMap(chainOf)).map((x) => x.idx)); let n = 0; p.chapters.forEach((c) => c.steps.forEach((s) => { if (!s.pending) chainOf(s).forEach((x) => { if (x.idx == null) { while (used.has(n)) n++; x.idx = n++; } }); })); p.tasks = p.chapters.flatMap((c) => c.steps.filter((s) => !s.pending)).flatMap(chainOf).map((s) => ({ t: "qcm", q: s.q, pts: s.pts ?? 10, idx: s.idx })); });
// Une question déjà réussie avant l'ajout de sa toile donne aussi la récompense, une seule fois.
// Une clé supprimée volontairement (tombstone) reste supprimée.
function backfillQuestionWorks() {
  let changed = false;
  PLACES.forEach((p) => p.chapters?.forEach((c) => c.steps.filter((s) => !s.pending).flatMap(chainOf).forEach((s) => {
    if (s.work && has(`t:${p.id}:${s.idx}`) && !S.done[`w:${s.work}`]) {
      award(`w:${s.work}`, POINTS.work, meIdx()); changed = true;
    }
  })));
  if (changed) { save(); renderHud(); }
}
const pic = (id) => `img/places/${id}.webp`;
const place = (id) => PLACES.find((p) => p.id === id);
const arrived = (id) => has("a:" + id);
const taskDone = (id, i) => has(`t:${id}:${i}`);
const doneTasks = (p) => p.tasks.filter((t, i) => taskDone(p.id, t.idx ?? i)).length;
const complete = (p) => arrived(p.id) && doneTasks(p) === p.tasks.length;
const stars = (p) => (arrived(p.id) ? 1 : 0) + doneTasks(p);
const maxStars = (p) => 1 + p.tasks.length;
const bridgeKeys = () => Object.keys(S.done).filter((k) => k.startsWith("b:") && has(k));
const bridgeCount = () => bridgeKeys().length;
let BRIDGES = null;
const bridgesReady = fetch("data/bridges.json").then((r) => r.json()).then((j) => { BRIDGES = j; }).catch(() => {});
const bridgeName = (b) => (!b[1] ? "un pont sans nom" : /^ponte\b/i.test(b[1]) ? "le " + b[1] : `un pont près de « ${b[1]} »`);
const nth = (n) => (n === 1 ? "1er" : n + "e");
const FINALE_AT = 12;
const visited = () => PLACES.filter((p) => !p.final && arrived(p.id)).length;
const finaleOpen = () => visited() >= FINALE_AT;
const collCount = (c) => { let n = 0; while (n < c.target && has(`c:${c.id}:${n + 1}`)) n++; return n; };

/* ───────── Utilitaires : son, confettis, voix, toast ───────── */
let actx;
function chime(big) { return; // sons de victoire désactivés (à remplacer plus tard)
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    (big ? [523, 659, 784, 1047, 1319] : [659, 880]).forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.1;
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.4);
    });
  } catch {}
  try { navigator.vibrate && navigator.vibrate(big ? [80, 40, 80, 40, 200] : 60); } catch {}
}
// Bip désagréable : mauvaise réponse. Petite fanfare : bonne réponse.
function buzz() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.17].forEach((d) => { const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + d; o.type = "sawtooth"; o.frequency.setValueAtTime(140, t); o.frequency.linearRampToValueAtTime(90, t + 0.15);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.18); });
  } catch {}
  try { navigator.vibrate && navigator.vibrate([90, 50, 90]); } catch {}
}
function victory() { return; // idem
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const note = (f, d, len, vol = 0.22) => { const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + d; o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + len + 0.05); };
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.11, 0.3));
    [1047, 1319, 1568].forEach((f) => note(f, 0.5, 0.9, 0.18));
  } catch {}
  try { navigator.vibrate && navigator.vibrate([70, 40, 70, 40, 160]); } catch {}
}
const fx = $("#fx"); const fctx = fx.getContext("2d"); let parts = [];
function confetti(n = 90, ox = innerWidth / 2, oy = innerHeight * 0.45) {
  fx.width = innerWidth; fx.height = innerHeight;
  const cols = ["#f4b41a", "#e2574c", "#0e5a6e", "#2e9e5b", "#ffd96b", "#fff"];
  for (let i = 0; i < n; i++) parts.push({ x: ox, y: oy, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, s: 5 + Math.random() * 7, c: cols[i % cols.length], r: Math.random() * 6, life: 90 + Math.random() * 40 });
  if (parts.length === n) requestAnimationFrame(tickFx);
}
function tickFx() {
  fctx.clearRect(0, 0, fx.width, fx.height);
  parts = parts.filter((p) => p.life-- > 0);
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.r += 0.2; fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.r); fctx.fillStyle = p.c; fctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); fctx.restore(); }
  if (parts.length) requestAnimationFrame(tickFx); else fctx.clearRect(0, 0, fx.width, fx.height);
}
let toastT;
function toast(msg, ms = 3200) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms);
}
function modal(html, onClose) {
  const m = $("#modal"); m.innerHTML = `<div class="box">${html}</div>`; m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ""; onClose && onClose(); };
  $$("[data-close]", m).forEach((b) => (b.onclick = close));
  return close;
}

/* ───────── Photos (gardées sur le téléphone, IndexedDB) ───────── */
const idb = () => new Promise((res, rej) => { const r = indexedDB.open("vq-photos", 1); r.onupgradeneeded = () => r.result.createObjectStore("p"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function putPhoto(key, rec) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction("p", "readwrite"); t.objectStore("p").put(rec, key); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function getPhoto(key) { try { const db = await idb(); return await new Promise((res) => { const q = db.transaction("p").objectStore("p").get(key); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch { return null; } }
async function allPhotos() { try { const db = await idb(); return await new Promise((res) => { const s = db.transaction("p").objectStore("p"), ks = s.getAllKeys(); ks.onsuccess = () => { const v = s.getAll(); v.onsuccess = () => res(ks.result.map((k, i) => [k, v.result[i]])); v.onerror = () => res([]); }; ks.onerror = () => res([]); }); } catch { return []; } }
function shrink(file, max = 900) {
  return new Promise((res) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(res, "image/jpeg", 0.72); };
    img.onerror = () => res(file); img.src = u;
  });
}
async function hydrateThumbs(root) {
  for (const im of $$("img.thumb[data-k]", root)) { const r = await getPhoto(im.dataset.k); if (r && r.blob) im.src = URL.createObjectURL(r.blob); }
}

/* ───────── Géo ───────── */
let pos = null; // {lat, lon, acc}
let geoReady = false, geoRequesting = false;
const MODERN_GEO = typeof HTMLGeolocationElement === "function";
function showGeoGate(message = "Pour jouer, autorise la localisation avec le bouton ci-dessous.") {
  const gate = $("#geo-gate"), retry = $("#geo-retry");
  if (!gate) return;
  $("#geo-gate-message").textContent = message;
  gate.hidden = DEV || geoReady;
  retry.disabled = geoRequesting;
}
function acceptGeo(fix) {
  geoRequesting = false; geoReady = true; showGeoGate();
  onPos(fix.coords.latitude, fix.coords.longitude, fix.coords.accuracy);
  syncGeoWatch();
}
function rejectGeo(err) {
  geoRequesting = false; geoReady = false;
  showGeoGate(err?.code === 1 ? "Ce site n'a pas accès à ta position. Autorise-le dans les réglages du navigateur, puis réessaie." : "Je ne peux pas obtenir ta position. Vérifie la localisation et réessaie.");
}
function requestGeo() {
  if (DEV || geoRequesting) return;
  if (!navigator.geolocation) { showGeoGate("Ce navigateur ne fournit pas la localisation. Active-la pour jouer."); return; }
  geoRequesting = true;
  showGeoGate("Réponds à la demande de localisation du navigateur.");
  navigator.geolocation.getCurrentPosition(
    acceptGeo,
    rejectGeo,
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
  );
}
$("#geo-retry").onclick = requestGeo;
$("#geo-settings").onclick = () => setTab("settings");
const dist = (a, b, c, d) => {
  const R = 6371000, r = Math.PI / 180, dLat = (c - a) * r, dLon = (d - b) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const distTo = (p) => (pos ? dist(pos.lat, pos.lon, p.lat, p.lon) : null);
const fmtD = (m) => (m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km");
function heat(m, r) {
  if (m == null) return "📍 Active la localisation";
  if (m <= r) return "🔥 Tu y es !";
  if (m < 150) return "🥵 Brûlant";
  if (m < 400) return "😀 Chaud";
  if (m < 1000) return "😐 Tiède";
  return "🥶 Froid";
}
// Le jeu complet (lieux, épreuves, ponts, classement) est mis de côté pour l'instant : seule l'identification et la carte restent.
// ?jeu=1 le réactive (mémorisé sur l'appareil), ?jeu=0 le désactive.
let JEU = true;
if (DEV) try { const q = QS.get("jeu"); if (q === "1") localStorage.setItem("vq_jeu", "1"); else if (q === "0") localStorage.setItem("vq_jeu", "0"); JEU = localStorage.getItem("vq_jeu") !== "0"; } catch {}
document.body.classList.toggle("jeu", JEU);
let PROFILE = loadProfile();
const VENICE = { w: 12.24, s: 45.36, e: 12.47, n: 45.55 }; // zone explorable : Venise et ses alentours
const inVenice = (lat, lon) => lon >= VENICE.w && lon <= VENICE.e && lat >= VENICE.s && lat <= VENICE.n;
let outside = false, locateAsked = false;
function outfitStyle(l, cut, frame, shift = {}) { // place la tenue dans les mêmes coordonnées que la photo, sans redimensionner celle-ci
  if (!l) return null;
  const { w, h, cw, ch, ox, pad } = l;
  if (![w, h, cw, ch, ox, pad].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  const scale = 1 / (frame ? Math.min(w, h) : cut ? Math.max(w, h) : Math.min(w, h));
  const dx = Number.isFinite(shift?.x) ? Math.max(-30, Math.min(30, shift.x)) : 0;
  const dy = Number.isFinite(shift?.y) ? Math.max(-25, Math.min(25, shift.y)) : 0;
  const left = ((1 - w * scale) * 0.5 - ox * scale) * 100 + dx;
  const top = ((1 - h * scale) * (frame ? 0.34 : 0.5) - pad * scale) * 100 + dy;
  return `--gear-left:${left}%;--gear-top:${top}%;--gear-width:${cw * scale * 100}%;--gear-height:${ch * scale * 100}%`;
}
function outfitPartShift(shift) { // ancien décalage commun -> deux décalages indépendants
  const clamp = (part) => ({
    x: Number.isFinite(part?.x) ? Math.max(-30, Math.min(30, part.x)) : 0,
    y: Number.isFinite(part?.y) ? Math.max(-25, Math.min(25, part.y)) : 0,
  });
  const legacy = shift && !shift.hat && !shift.body ? shift : null;
  return { hat: clamp(shift?.hat || legacy), body: clamp(shift?.body || legacy) };
}
function profileHtml() {
  if (!PROFILE) return "🙂";
  if (PROFILE.photo && PROFILE.outfitOverlayHat && PROFILE.outfitOverlayBody && PROFILE.outfitLayout && PROFILE.outfitOverlayVersion === 3) {
    const shifts = outfitPartShift(PROFILE.outfitShift);
    const hatStyle = outfitStyle(PROFILE.outfitLayout, !!PROFILE.cut, PROFILE.frame, shifts.hat);
    const bodyStyle = outfitStyle(PROFILE.outfitLayout, !!PROFILE.cut, PROFILE.frame, shifts.body);
    if (hatStyle && bodyStyle) {
      const cls = PROFILE.cut ? ` cut${PROFILE.frame ? " frame" : ""}` : "";
      return `<span class="avatar-dressed"><img class="avatar-base${cls}" src="${PROFILE.photo}" alt=""><img class="avatar-gear avatar-gear-body" style="${bodyStyle}" src="${PROFILE.outfitOverlayBody}" alt=""><img class="avatar-gear avatar-gear-hat" style="${hatStyle}" src="${PROFILE.outfitOverlayHat}" alt=""></span>`;
    }
  }
  if (PROFILE.photo && PROFILE.outfitOverlay && PROFILE.outfitLayout && PROFILE.outfitOverlayVersion === 2) {
    const style = outfitStyle(PROFILE.outfitLayout, !!PROFILE.cut, PROFILE.frame, PROFILE.outfitShift);
    if (style) {
      const cls = PROFILE.cut ? ` cut${PROFILE.frame ? " frame" : ""}` : "";
      return `<span class="avatar-dressed" style="${style}"><img class="avatar-base${cls}" src="${PROFILE.photo}" alt=""><img class="avatar-gear" src="${PROFILE.outfitOverlay}" alt=""></span>`;
    }
  }
  // Pendant la migration d'une ancienne tenue, on affiche la photo à sa place habituelle.
  return PROFILE.photo ? `<img${PROFILE.cut ? ` class="cut${PROFILE.frame ? " frame" : ""}"` : ""} src="${PROFILE.photo}" alt="">` : PROFILE.avatar;
}
function renderBadge() {
  const b = $("#me-badge"); if (!b) return;
  b.hidden = !PROFILE; if (!PROFILE) return;
  b.innerHTML = `<span class="mb-av">${profileHtml()}</span><span class="mb-name">${esc(PROFILE.name)}</span>`;
}
function userEl() {
  const el = document.createElement("div"); el.className = "pin mep";
  el.innerHTML = `<div class="me-ring"></div><div class="me ${PROFILE && PROFILE.photo ? "ph" : "em"}${DEV ? " dev" : ""}">${PROFILE ? profileHtml() : "🙂"}</div>`;
  // (le personnage n'est plus cliquable : l'espace de l'enfant s'ouvre par la pastille maison, en bas à gauche)
  return el;
}
function refreshUserMarker() { if (userMarker) { const ll = userMarker.getLngLat(); userMarker.remove(); userMarker = null; if (pos) onPos(pos.lat, pos.lon, pos.acc, true); } }
let watchId, userMarker, geoStarted = false, geoSimulated = false;
// En mode développeur, le bateau peut être déplacé pour tester le jeu.
// Le mode réel reste actif tant que l’interrupteur de l’onglet Dév. est éteint.
let devPinned = false; // le bateau a été posé à la main : le GPS réel est ignoré
// Le GPS précis ne sert qu'avec la carte active ; la dernière position reste affichée pendant les autres écrans.
function syncGeoWatch() {
  if (!geoStarted || geoSimulated || (!DEV && !geoReady) || !navigator.geolocation) return;
  const needed = !document.hidden && !devPinned && tab === "map" && $("#quest").hidden && !document.body.classList.contains("chap-open") && !$(".music-found,.music-quest");
  if (!needed && watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (needed && watchId == null) watchId = navigator.geolocation.watchPosition((e) => onPos(e.coords.latitude, e.coords.longitude, e.coords.accuracy), (err) => { if (!DEV && err?.code === 1) { navigator.geolocation.clearWatch(watchId); watchId = null; geoReady = false; pos = null; userMarker?.remove(); userMarker = null; showGeoGate("La localisation a été désactivée. Autorise-la de nouveau pour jouer."); } else if (locateAsked) toast("📍 Je ne te trouve pas… active la localisation !"); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}
const scheduleGeoSync = () => queueMicrotask(syncGeoWatch);
function startGeo() {
  if (geoStarted) { syncGeoWatch(); return; }
  geoStarted = true;
  if (!DEV) {
    showGeoGate();
    if (MODERN_GEO) {
      const control = $("#geo-control");
      control.addEventListener("location", () => {
        if (control.position) acceptGeo(control.position);
        else if (control.error) rejectGeo(control.error);
      });
      if (control.position) acceptGeo(control.position);
      return;
    }
    if (navigator.permissions?.query) navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      if (permission.state === "granted") requestGeo();
      else if (permission.state === "denied") showGeoGate("Ce site n'a pas accès à ta position. Autorise-le dans les réglages du navigateur, puis réessaie.");
      permission.onchange = () => {
        if (permission.state === "granted" && !geoReady) requestGeo();
        else if (permission.state === "denied") { geoReady = false; pos = null; userMarker?.remove(); userMarker = null; showGeoGate("La localisation de ce site a été désactivée. Autorise-la pour jouer."); }
      };
    }).catch(() => {});
    return;
  }
  const fake = DEV ? QS.get("fake") : null;
  if (DEV) window.__fake = (a, b) => { devPinned = true; onPos(a, b, 10, true); };
  if (fake) { geoSimulated = true; const [la, lo] = fake.split(",").map(Number); window.__fake(la, lo); return; }
  const gps = DEV ? QS.get("gps") : null; // position simulée réservée au mode développeur
  if (gps) { geoSimulated = true; const [la, lo] = gps.split(",").map(Number); setTimeout(() => onPos(la, lo, 15), 600); return; }
  // Mode dev : un tapotement sur la carte déplace le pictogramme (pour tester différentes positions).
  if (DEV) map.on("click", (e) => { devPinned = true; onPos(e.lngLat.lat, e.lngLat.lng, 10, true); syncGeoWatch(); });
  if (DEV) setTimeout(() => { if (!pos) { const c = map.getCenter(); onPos(c.lat, c.lng, 10); } }, 1500);
  syncGeoWatch();
}
function onPos(lat, lon, acc, manual = false) {
  if (devPinned && !manual) return;
  // Hors de Venise : on ne montre pas le point, et Corto le dit si on a demandé à se localiser.
  if (!manual && !inVenice(lat, lon)) {
    if (DEV && pos) return; // en mode dev, le pictogramme déjà posé reste en place
    outside = true; pos = null;
    if (userMarker) { userMarker.remove(); userMarker = null; }
    if (locateAsked) { locateAsked = false; cortoSays("Tu n'es pas à Venise. Viens d'abord à Venise pour commencer l'aventure."); }
    return;
  }
  outside = false;
  const first = !pos;
  pos = { lat, lon, acc, t: Date.now() };
  if (!userMarker) {
    userMarker = new maplibregl.Marker({ element: userEl(), anchor: "center", draggable: false }).setLngLat([lon, lat]).addTo(map); // jamais cliquable : un toucher va toujours au macaron dessous
    if (DEV) userMarker.on("dragend", () => { const p = userMarker.getLngLat(); devPinned = true; onPos(p.lat, p.lng, 10, true); });
  }
  if (!userMarker.isDragging || !userMarker.isDragging()) userMarker.setLngLat([lon, lat]);
  if ((first || locateAsked) && !manual && tab === "map") { map.jumpTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 16) }); locateAsked = false; }
  const pn = performance.now(); if (manual || pn - (onPos.last || 0) > 2000) { onPos.last = pn; updateOverlap(); renderNext(); if (openId) updateMedal(); } // pas plus d'une fois toutes les 2 s : évite les micro-saccades de la carte à chaque fix GPS
}
/* ───────── Arrivée, pages, finale ───────── */
// Musique d'ambiance d'un lieu (p.music) : amorcée au toucher de « J'y suis ! » (les navigateurs l'exigent), lancée avec le fondu d'arrivée, coupée en douceur au départ.
const MUSIC = {}; let curMusic = null;
function fadeAudio(a, to, ms, done) { const from = a.volume, t0 = performance.now(); const id = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k >= 1) { clearInterval(id); if (done) done(); } }, 40); }
function primeMusic(p) { if (!p.music) return; try { const a = MUSIC[p.id] || (MUSIC[p.id] = new Audio(p.music)); a.preload = "auto"; a.volume = 0; const r = a.play(); if (r && r.then) r.then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}); } catch {} }
function startMusic(p) { const a = MUSIC[p.id]; if (!a) return; try { a.currentTime = 0; a.volume = 0; const r = a.play(); if (r && r.catch) r.catch(() => {}); curMusic = a; fadeAudio(a, 0.85, 1800); } catch {} }
function stopMusic(ms = 1000) { const a = curMusic; if (!a) return; curMusic = null; fadeAudio(a, 0, ms, () => { try { a.pause(); } catch {} }); }
// Arrivée validée : le titre du macaron s'efface, le macaron grandit jusqu'à remplir l'écran, puis Corto (tout content) félicite
// avec un message poétique, et un gros bouton lance l'épreuve.
async function arrivalReveal(p) {
  const first = !arrived(p.id), done = doneTasks(p);
  if (first) { award("a:" + p.id, POINTS.arrive); save(); refreshAll(); }
  if (!p.music) chime(); startMusic(p); // pas de bip par-dessus la musique
  introSeen[p.id] = true;
  const sh = $("#sheet"), medal = $("#medal");
  if (!medal) { openQuest(p.id); return; }
  $$(".m-chat,.m-reply,.m-ring", sh).forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: "forwards" }));
  await sleep(450);
  // L'image du macaron s'agrandit progressivement jusqu'à remplir l'écran, avec des bords droits (pas d'angles arrondis pendant la croissance).
  const r = medal.getBoundingClientRect();
  medal.getAnimations().forEach((x) => x.cancel());
  medal.style.cssText += `;position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;aspect-ratio:auto;margin:0;max-width:none;box-shadow:none`;
  // L'image qui grandit est fondue en transparence sur ses bords (contours invisibles) ; le fondu s'écarte quand elle remplit l'écran.
  const FM = "linear-gradient(to right,transparent,#000 18%,#000 82%,transparent),linear-gradient(to bottom,transparent,#000 18%,#000 82%,transparent)", MS0 = "100% 100%, 100% 100%", MS1 = "190% 190%, 190% 190%";
  Object.assign(medal.style, { background: "transparent", webkitMaskImage: FM, maskImage: FM, webkitMaskComposite: "source-in", maskComposite: "intersect", webkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", webkitMaskPosition: "center", maskPosition: "center", webkitMaskSize: MS0, maskSize: MS0 });
  medal.animate([{ maskSize: MS0, webkitMaskSize: MS0 }, { maskSize: MS0, webkitMaskSize: MS0, offset: 0.5 }, { maskSize: MS1, webkitMaskSize: MS1 }], { duration: 1800, easing: "ease-in-out", fill: "forwards" });
  const from = { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" };
  const gt = document.createElement("div"); gt.className = "arr-g arr-g-top"; const gb = document.createElement("div"); gb.className = "arr-g arr-g-bot";
  sh.append(gt, gb);
  [gt, gb].forEach((e) => e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 900, easing: "ease-in-out", fill: "forwards" }));
  await medal.animate([{ ...from, borderRadius: "50%" }, { ...from, borderRadius: "0%", offset: 0.07 }, { left: "0px", top: "0px", width: innerWidth + "px", height: innerHeight + "px", borderRadius: "0%" }], { duration: 1800, easing: "cubic-bezier(.45,.05,.2,1)", fill: "forwards" }).finished;
  const img = $(".m-img", medal); if (img) img.animate([{ transform: "scale(1)" }, { transform: "scale(1.16)" }], { duration: 10000, easing: "ease-out", fill: "forwards" });
  const flash = document.createElement("div"); flash.className = "arr-flash"; sh.appendChild(flash);
  flash.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 1100, easing: "ease-out" }).onfinish = () => flash.remove();
  confetti(130);
  await sleep(500);
  await showArrivalContents(p, done, sh);
}
async function showArrivalContents(p, done, sh) {
  const cl = $(".m-close", sh); if (cl) cl.remove(); // pas de croix sur cet écran
  const arr = document.createElement("div"); arr.className = "arr";
  arr.innerHTML = `<div class="arr-center"><div class="arr-name">${esc(p.name)}</div><button class="arr-go" id="arr-go">${done === 0 ? "Commencer l'épreuve" : done < p.tasks.length ? "Continuer l'épreuve" : "Revoir le lieu"}</button>${LOCAL_DEV && p.chapters ? '<button type="button" class="arr-dev-finish">🔧 Dev · Aller à la conclusion</button>' : ""}</div><div class="arr-talk"><div class="dm-txt"></div><img class="dm-corto" src="img/corto-content.webp" alt=""></div>`;
  sh.appendChild(arr);
  $(".arr-talk", arr).animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 700, easing: "ease-out" });
  const nm = $(".arr-name", arr), go = $("#arr-go", arr);
  nm.style.opacity = go.style.opacity = 0;
  await sleep(900);
  // Le premier accueil n'est plus montré lorsque le GPS est valide : son information sur le lieu accompagne désormais Corto ici.
  $(".dm-txt", arr).innerHTML = richText(teaser(p));
  await sleep(600);
  nm.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 700, fill: "forwards", easing: "ease-out" });
  await sleep(500);
  go.animate([{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "none" }], { duration: 700, fill: "forwards", easing: "cubic-bezier(.2,.9,.25,1.1)" });
  go.onclick = () => { stopMusic(1200); openQuest(p.id); };
  const devFinish = $(".arr-dev-finish", arr);
  if (devFinish) devFinish.onclick = () => devCompleteChapter(p);
}
async function showArrivalDirect(p) {
  const first = !arrived(p.id), done = doneTasks(p);
  if (first) { award("a:" + p.id, POINTS.arrive); save(); refreshAll(); }
  if (!p.music) chime(); startMusic(p);
  introSeen[p.id] = true;
  openId = p.id; chatSel = "#m-chat"; $("#next").hidden = true; $("#bridge-btn").hidden = true;
  const sh = $("#sheet"); sh.getAnimations().forEach((animation) => animation.cancel()); sh.style.backgroundColor = "";
  sh.hidden = false; sh.className = "medal-wrap arrival-direct"; sh.onclick = null;
  sh.innerHTML = `<div class="arrival-photo" style="background-image:url(${pic(p.id)})"></div><div class="arr-g arr-g-top"></div><div class="arr-g arr-g-bot"></div>`;
  await showArrivalContents(p, done, sh);
}
// Test depuis l'accueil du lieu ou depuis la carte : questions terminées, trésors encore à trouver.
function devCompleteChapter(p, fromMapButton = false) {
  if (!p.chapters || (!fromMapButton && !LOCAL_DEV)) return;
  if (!arrived(p.id)) award("a:" + p.id, POINTS.arrive, meIdx());
  p.tasks.forEach((t) => { if (!taskDone(p.id, t.idx)) award(`t:${p.id}:${t.idx}`, t.pts, meIdx()); });
  const steps = p.chapters.flatMap((c) => c.steps.filter((s) => !s.pending).flatMap(chainOf));
  new Set(steps.map((s) => s.work).filter(Boolean)).forEach((id) => { if (!workFound(id)) award("w:" + id, POINTS.work, meIdx()); });
  if (has("fin:" + p.id)) unaward("fin:" + p.id);
  if (has("tr:" + p.id)) unaward("tr:" + p.id);
  Object.keys(S.done).filter((key) => has(key) && (key.startsWith(`st:${p.id}:`) || (p.musicChallenge && key.startsWith(`music:${p.musicChallenge.entry}:`)) || (p.id === "miracoli" && key.startsWith("music:02:")))).forEach(unaward);
  save(); closeSheet(); refreshAll(); openChapters(p, false, true);
}
function doArrive(p, manual) {
  award("a:" + p.id, POINTS.arrive); save();
  chime(); confetti(60);
  closeSheet(); refreshAll();
  toast(`Bravo, tu es arrivé : ${p.name} ! +${POINTS.arrive} ⭐`);
  openQuest(p.id);
}
/* ───────── Carte ───────── */
const map = createMap("map", { center: [12.338, 45.4342], zoom: 14 });
if (DEV) window.__map = map;
// Le voilier de Corto, amarré dans la lagune près de l'embarcadère de Santo Spirito : repère de la carte, point de rendez-vous. Il apparaît à la fin de l'introduction et reste ensuite.
/* Le voilier : parti du même point à la fin de l'introduction (BOAT.lngLat, au milieu du canal de la Giudecca), il fait des tours de lagune à allure régulière, et arrive amarré
   au point de rendez-vous (Santo Spirito) à l'heure dite. Sa position ne dépend que de l'heure : même trajet, même instant, sur tous les téléphones qui ont démarré en même temps.
   Au démarrage (fin de l'intro) on mémorise l'instant t0 ; on choisit un nombre entier de tours pour arriver pile à RENDEZ_VOUS (vitesse ≈ 14 km/h, jamais plus de 22 km/h). */
const BOAT_ROUTE = [[12.3310, 45.4276], [12.3345, 45.4277], [12.3380, 45.4283], [12.3410, 45.4294], [12.3460, 45.4301], [12.3500, 45.4296], [12.3500, 45.4262], [12.3515, 45.4232], [12.3560, 45.4215], [12.3660, 45.4220], [12.3620, 45.4190], [12.3600, 45.4150], [12.3580, 45.4138], [12.3450, 45.4138], [12.3300, 45.4138], [12.3150, 45.4138], [12.3050, 45.4160], [12.3040, 45.4220], [12.3040, 45.4290], [12.3100, 45.4296], [12.3170, 45.4296], [12.3215, 45.4290], [12.3262, 45.4290], [12.3295, 45.4285]]; // boucle fermée, vérifiée sur l'eau ; [0] = départ, [22] = rendez-vous
const BOAT_MOOR = 22; // indice du point de rendez-vous dans BOAT_ROUTE
const RENDEZ_VOUS = Date.parse("2026-10-26T10:00:00+01:00"); // lundi 26 octobre 2026, 10 h à Venise
const BOAT_V = 14 / 3.6, BOAT_VMAX = 22 / 3.6; // m/s
const BOAT = { lngLat: BOAT_ROUTE[0], w: 64 };
const BOAT_PATH = (() => { // trajectoire lissée (Catmull-Rom) avec distances cumulées en mètres
  const W = BOAT_ROUTE, n = W.length, pts = [], cr = (a, b, c, d, t) => b.map((_, i) => 0.5 * (2 * b[i] + (-a[i] + c[i]) * t + (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t * t + (-a[i] + 3 * b[i] - 3 * c[i] + d[i]) * t * t * t));
  for (let i = 0; i < n; i++) for (let k = 0; k < 8; k++) pts.push(cr(W[(i - 1 + n) % n], W[i], W[(i + 1) % n], W[(i + 2) % n], k / 8));
  const cum = [0]; for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; cum.push(cum[i - 1] + Math.hypot((b[0] - a[0]) * 78200, (b[1] - a[1]) * 111000)); }
  return { pts, cum, L: cum[pts.length], moor: cum[BOAT_MOOR * 8] };
})();
const boatPoint = (d) => { // position à la distance d (m) le long de la boucle (0 = départ)
  const { pts, cum, L } = BOAT_PATH; d = ((d % L) + L) % L; let lo = 0, hi = pts.length; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
  const a = pts[lo], b = pts[(lo + 1) % pts.length], t = (d - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
};
const BOAT_T0 = "vq_boat_t0";
function boatPlan(t0, T = RENDEZ_VOUS) { // { speed (m/s), total (m), tEnd } : nombre entier de tours, arrivée à T (ou le plus tôt possible si T est trop proche)
  const { L, moor } = BOAT_PATH, dt = (T - t0) / 1000;
  if (dt * BOAT_VMAX < moor) return { speed: BOAT_V, total: moor, tEnd: t0 + (moor / BOAT_V) * 1000 }; // trop tard pour tenir l'heure : trajet direct à vitesse normale
  const k = Math.max(0, Math.round((BOAT_V * dt - moor) / L)), total = k * L + moor; return { speed: total / dt, total, tEnd: T };
}
function boatAt(now = Date.now(), t0 = +localStorage.getItem(BOAT_T0) || now) {
  const pl = boatPlan(t0); if (now >= pl.tEnd) return { ll: boatPoint(BOAT_PATH.moor), moored: true, plan: pl };
  const d = Math.max(0, pl.speed * (now - t0) / 1000); return { ll: boatPoint(d), moored: false, d, plan: pl };
}
let boatMarker = null, boatLeft = false;
function ensureBoat(fresh) { // fresh : fin de l'intro → le voilier repart du point de départ (toujours le même, quelle que soit l'heure)
  try { if (fresh || !localStorage.getItem(BOAT_T0)) localStorage.setItem(BOAT_T0, String(Date.now())); } catch {}
  if (boatMarker) { boatMarker.getElement().style.visibility = ""; boatMarker.setLngLat(boatAt().ll); return; }
  const el = document.createElement("div"); el.className = "lagoon-boat"; el.innerHTML = '<div class="lb-flip"><img src="img/intro/e5.webp" alt=""></div>';
  boatMarker = new maplibregl.Marker({ element: el, anchor: "center", offset: [0, -0.28 * BOAT.w] }).setLngLat(boatAt().ll).addTo(map); // la coque (78 % de la hauteur) est posée sur le point
  requestAnimationFrame(boatTick);
}
let boatLast = 0;
const mapWorkVisible = () => !document.hidden && tab === "map" && $("#quest").hidden && !document.body.classList.contains("chap-open") && !document.body.classList.contains("intro-open") && !$(".music-found,.music-quest");
function boatTick(ts) {
  if (!boatMarker || !mapWorkVisible()) { setTimeout(() => requestAnimationFrame(boatTick), 250); return; }
  requestAnimationFrame(boatTick);
  if (ts - boatLast < (ecoOn() ? 120 : 40)) return; boatLast = ts;
  const b = boatAt(); if (boatMarker.getElement().style.visibility === "hidden") return; boatMarker.setLngLat(b.ll);
  if (!b.moored) { // il regarde dans le sens de la marche (retournement doux)
    const a = map.project(b.ll), c = map.project(boatAt(Date.now() + 8000).ll), dx = c.x - a.x; if (Math.abs(dx) > 0.3) { const left = dx < 0; if (left !== boatLeft) { boatLeft = left; boatMarker.getElement().classList.toggle("left", left); } }
  }
}
if (DEV) { window.__boat = { at: boatAt, plan: boatPlan, path: BOAT_PATH, T: RENDEZ_VOUS };
window.__boatOpts = () => BOAT_OPTS; } // (outil de test)
const BOAT_OPTS = { map, boat: { lngLat: BOAT.lngLat, w: BOAT.w, ensure: () => ensureBoat(true), hide: () => { if (boatMarker) boatMarker.getElement().style.visibility = "hidden"; } } };
// Taille des macarons selon le zoom : normale de loin, de plus en plus grande à mesure qu'on zoome, tant qu'ils restent séparés les uns des autres.
const PIN_DMIN = (() => { let m = 1e9; PLACES.forEach((p, i) => PLACES.slice(i + 1).forEach((q) => { m = Math.min(m, Math.hypot((p.lat - q.lat) * 111000, (p.lon - q.lon) * 78000)); })); return Math.max(m, 30); })();
const pinScaleAt = (z) => Math.min(2.5, Math.max(1, (0.9 * PIN_DMIN) / (156543.03392 * Math.cos((45.43 * Math.PI) / 180) / 2 ** z) / 42));
function updatePinScale() {
  const s = pinScaleAt(map.getZoom()), el = $("#map");
  el.style.setProperty("--ps", s.toFixed(3));
  el.style.setProperty("--ms", Math.min(1.5, 1 + (s - 1) * 0.35).toFixed(3)); // le personnage grossit un peu aussi, et reste au-dessus des macarons
}
const treePoints = [];
const treeSize = (z) => Math.round(Math.max(32, Math.min(70, 48 + (z - 14) * 5)));
// Le personnage devient un peu transparent quand il passe sur un macaron.
function updateOverlap() {
  if (!userMarker || !pos) return;
  const up = map.project([pos.lon, pos.lat]), ps = parseFloat($("#map").style.getPropertyValue("--ps")) || 1;
  const over = PLACES.some((p) => { const q = map.project([p.lon, p.lat]); return Math.hypot(up.x - q.x, up.y - q.y) < 21 * ps + 12; })
    || treePoints.some(([lng, lat]) => { const q = map.project([lng, lat]), w = treeSize(map.getZoom()); return Math.abs(up.x - q.x) < w / 2 + 12 && up.y - q.y > -w - 12 && up.y - q.y < 18; });
  userMarker.getElement().classList.toggle("over", over);
}
map.on("zoom", () => { updatePinScale(); updateOverlap(); updateWalkScale(); }); updatePinScale(); if (DEV) window.__map = map; // (outil de test)

// Les personnages grossissent quand on s'approche (à partir du zoom 16 : x1 → x2 au zoom 18,2)
function updateWalkScale() { const z = map.getZoom(); $("#map").style.setProperty("--ws", Math.min(2, Math.max(1, 1 + (z - 16) * 0.45)).toFixed(2)); }
/* ───────── Personnages qui se baladent (doge à pied, gondolier sur l'eau) ───────── */
// Chacun parcourt en boucle son itinéraire (JSON de [lat,lon]) en h heures ; position calculée d'après l'heure, donc la même pour tous. Mouvement continu (image par image) à fort zoom, toutes les 5 s sinon.
updateWalkScale();
const WALKERS = [
  { id: "doge", name: "le doge", to: "au doge", de: "du doge", route: "doge-route.json", img: "img/doge-avatar.webp", big: "img/doge-big.webp", bigHappy: "img/doge-big-happy.webp", bigAngry: "img/doge-big-angry.webp", quiz: { q: "Sais-tu qui je suis ?", opts: [{ t: "Le doge, le personnage le plus important de Venise", ok: 1 }, { t: "Emmanuel Macron, président de la République" }, { t: "Michael Jackson" }], good: "Exactement ! Je suis le doge, le chef de Venise. Tu as l'œil, {g} !", bad: "Tu ne sais même pas qui je suis ?!" }, h: 5.5, near: 60, w: 50, msg: "Le doge te salue d'un air solennel… (il aura bientôt quelque chose à te raconter !)" },
  { id: "monteverdi", name: "Monteverdi", to: "à Monteverdi", de: "de Monteverdi", route: "monteverdi-route.json", img: "img/monteverdi-avatar.webp", h: 4, near: 60, w: 40, msg: "Monteverdi, le maître de musique de Saint-Marc, te salue… (il aura bientôt quelque chose à te raconter !)" },
  { id: "stmarc", name: "saint Marc", to: "à saint Marc", de: "de saint Marc", route: "stmarc-route.json", img: "img/stmarc-avatar.webp", h: 4, near: 60, w: 46, msg: "Saint Marc te salue, l'air soucieux… « As-tu vu mon lion ? Je le cherche partout ! » (il aura bientôt autre chose à te raconter)" },
  { id: "gondolier", name: "le gondolier", to: "au gondolier", de: "du gondolier", route: "gondolier-route.json", img: "img/gondolier-avatar.webp", h: 3, near: 60, w: 64, msg: "Le gondolier te salue d'un coup de chapeau… (il aura bientôt quelque chose à te raconter !)" },
  { id: "lion", name: "le lion ailé", to: "au lion ailé", de: "du lion ailé", route: "lion-route.json", farLines: ["Le lion ailé est dans les airs ! Lève les yeux et attends qu'il passe au-dessus de toi pour lui parler.", "Il vole haut, {g}. Bon courage ! Attends qu'il passe au-dessus de toi.", "Lève les yeux, {g} : le lion ailé survole Venise. Attends qu'il passe près de toi.", "Le lion ailé est en plein vol. Lève les yeux et bon courage pour l'attraper, {g} !", "Impossible de lui parler d'ici : il est dans le ciel. Attends qu'il passe au-dessus de toi."], motion: { cruise: 12, ramp: 8, period: 2160, landings: [{ at: 700, dur: 110 }, { at: 1650, dur: 90 }] }, heading: true, img: "img/lion-avatar.webp", rig: { body: "img/lion-body.webp", rear: "img/lion-rear.webp", front: "img/lion-front.webp", wings: "img/lion-wings.webp", ratio: "325/360" }, h: 5, near: 60, w: 50, msg: "Le lion ailé bat doucement des ailes et te regarde d'un air fier… (il aura bientôt quelque chose à te raconter !)" },
];

/* ───────── Enquête des Vêpres : parcours ajouté, distinct des rencontres existantes ───────── */
const NARRATIVE_NAMES = { corto: "Corto Maltese", gondolier: "Le gondolier", doge: "Le Doge", monteverdi: "Monteverdi", stmarc: "Saint Marc", lion: "Le lion ailé" };
let narrative = null, narrativeData = null, narrativeOverlay = null;
const narrativeReady = fetch("data/narrative-v0.json")
  .then((r) => { if (!r.ok) throw new Error("Enquête indisponible"); return r.json(); })
  .then((data) => {
    narrativeData = data;
    narrative = createNarrative(data, {
      has,
      set: (key) => award(key, 0, "all"),
      clear: (key) => {
        if (key.startsWith("n:item:")) {
          const objectId = "nv-" + key.slice("n:item:".length);
          objectAssembly.delete(objectId);
          if (heldId === objectId) releaseHeld();
        }
        unaward(key);
      },
      commit: () => { save(); refreshAll(); if (tab === "objects") renderObjects(); }
    });
    if (DEV) window.__narrative = {
      grantExternal: (id) => narrative.grantExternal(id),
      hasItem: (id) => narrative.hasItem(id),
      hasFlag: (id) => narrative.hasFlag(id),
      open: (character) => openNarrative(character)
    };
    if (tab === "objects") renderObjects();
    return narrative;
  }).catch((error) => { console.warn(error.message); return null; });

function closeNarrative() {
  narrativeOverlay?.remove(); narrativeOverlay = null;
  document.removeEventListener("keydown", narrativeEscape);
}
function narrativeEscape(event) { if (event.key === "Escape") closeNarrative(); }
function narrativePanel(title, body) {
  closeNarrative();
  const overlay = document.createElement("section");
  overlay.className = "nv-overlay"; overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-modal", "true"); overlay.setAttribute("aria-label", title);
  overlay.innerHTML = `<div class="nv-card"><div class="nv-head"><h2>${esc(title)}</h2><button type="button" class="nv-close" aria-label="Fermer">×</button></div><div class="nv-body">${body}</div></div>`;
  overlay.addEventListener("click", (event) => { if (event.target === overlay) closeNarrative(); });
  $(".nv-close", overlay).onclick = closeNarrative;
  document.body.appendChild(overlay); narrativeOverlay = overlay;
  document.addEventListener("keydown", narrativeEscape);
  $(".nv-close", overlay).focus();
  return overlay;
}
async function openNarrativeJournal() {
  if (!await narrativeReady) { toast("Le carnet d'enquête est indisponible pour le moment."); return; }
  const quests = narrative.progress();
  const list = quests.length ? `<ul class="nv-quests">${quests.map((q) => `<li>${q.finished ? "✓" : "○"} ${esc(q.title)}</li>`).join("")}</ul>` : "<p>Parle à Corto pour commencer l'enquête sur les Vêpres.</p>";
  narrativePanel("Carnet des Vêpres", `${list}<p>Retrouve les personnages sur la carte et touche-les pour leur parler quand ta position est reconnue. Touche le portrait de Corto pour lui parler.</p>`);
}
async function openNarrative(character) {
  if (!await narrativeReady) { toast("L'enquête est indisponible pour le moment."); return; }
  const id = narrative.entry(character);
  if (!id) return;
  showNarrativeScene(character, id);
}
function showNarrativeScene(character, id) {
  const scene = narrative.scene(id);
  if (!scene) return;
  const image = character === "corto" ? "img/corto-content.webp" : WALKERS.find((w) => w.id === character)?.img;
  const body = `<div class="nv-speaker">${image ? `<img src="${image}" alt="">` : ""}<p>${esc(scene.text)}</p></div><div class="nv-choices">${scene.choices.map((choice) => `<button type="button" class="nv-choice" data-choice="${choice.index}">${esc(choice.label)}</button>`).join("")}</div>`;
  const overlay = narrativePanel(NARRATIVE_NAMES[character], body);
  $$("[data-choice]", overlay).forEach((button) => (button.onclick = () => {
    const next = narrative.choose(id, +button.dataset.choice);
    if (next) showNarrativeScene(character, next);
  }));
}
async function validNarrativePosition() {
  if (!DEV && !geoReady) { showGeoGate(); return false; }
  if (!DEV && (!pos || Date.now() - pos.t > 15000 || pos.acc > 100)) await getFix(2500).catch(() => false);
  if (!pos || !inVenice(pos.lat, pos.lon) || !Number.isFinite(pos.acc) || pos.acc > 100 || (!DEV && Date.now() - pos.t > 15000)) {
    toast("📍 Attends une position GPS précise à Venise pour parler au personnage.");
    return false;
  }
  return true;
}
$("#narrative-btn").onclick = openNarrativeJournal;
// Doge vexé : il file de HUFF_M mètres en courant (6 s), reste là-bas 20 min, puis revient vite à sa vraie place (état propre à l'appareil).
const HUFF_M = 110, HUFF_RUN = 6, HUFF_STAY = 1200;
function huffOff(W, t) {
  const h = W.huff; if (!h) return 0;
  const dt = (t - h.t0) / 1000; if (dt < 0) return 0;
  if (dt < HUFF_RUN) return (h.from || 0) + (h.m - (h.from || 0)) * (1 - (1 - dt / HUFF_RUN) ** 3);
  if (dt < HUFF_STAY) return h.m;
  if (dt < HUFF_STAY + 60) return h.m * (1 - (dt - HUFF_STAY) / 60);
  W.huff = null; try { localStorage.removeItem("vq_huff_" + W.id); } catch {} return 0;
}
// Lion ailé : le plus souvent en plein vol (vitesse de croisière M.cruise, m/s) ; plus rarement posé (arrêt complet) : `landings` = [{at, dur}] en secondes dans un cycle de `period` s, avec rampes de M.ramp s au décollage et à l'atterrissage. Tout dépend de l'heure absolue.
function lostDist(M, L, x) { // distance « perdue » (par unité de vitesse) pendant un atterrissage de durée L, au temps x
  const r = M.ramp; x = Math.min(Math.max(x, 0), L);
  if (x <= r) return 0.5 * (x - (r / Math.PI) * Math.sin((Math.PI * x) / r));
  if (x <= L - r) return 0.5 * r + (x - r);
  const y = x - (L - r); return 0.5 * r + (L - 2 * r) + 0.5 * (y + (r / Math.PI) * Math.sin((Math.PI * y) / r));
}
function motionDist(M, t) {
  const T = t / 1000, cyc = Math.floor(T / M.period), u = T - cyc * M.period;
  let lost = 0; for (const l of M.landings) lost += cyc * (l.dur - M.ramp) + lostDist(M, l.dur, u - l.at);
  return M.cruise * (T - lost);
}
function motionSpeed(M, t) {
  const u = (t / 1000) % M.period, r = M.ramp; let f = 1;
  for (const l of M.landings) if (u >= l.at && u <= l.at + l.dur) { const x = u - l.at; f = x <= r ? 0.5 * (1 + Math.cos((Math.PI * x) / r)) : x >= l.dur - r ? 0.5 * (1 + Math.cos((Math.PI * (l.dur - x)) / r)) : 0; }
  return M.cruise * f;
}
// Horloge fluide : l'heure absolue, mais avancée par performance.now() (sans les micro-sauts de Date.now) ; recalée seulement si l'horloge du téléphone saute.
const CLK = { t0: Date.now(), p0: performance.now() };
function nowMs() { const v = CLK.t0 + (performance.now() - CLK.p0); if (Math.abs(v - Date.now()) > 1500) { CLK.t0 = Date.now(); CLK.p0 = performance.now(); return CLK.t0; } return v; }
function rawAt(W, t) {
  const R = W.R, f = ((t / 3600000) % W.h) / W.h, target = ((W.motion ? motionDist(W.motion, t) : f * R.total) + huffOff(W, t)) % R.total;
  let i = 1; while (i < R.cum.length - 1 && R.cum[i] < target) i++;
  const a = R.pts[i - 1], b = R.pts[i], k = R.cum[i] > R.cum[i - 1] ? (target - R.cum[i - 1]) / (R.cum[i] - R.cum[i - 1]) : 0;
  return { lat: a[0] + (b[0] - a[0]) * k, lon: a[1] + (b[1] - a[1]) * k, shore: a[2] != null ? a[2] + (b[2] - a[2]) * k : 0 }; // shore : distance à la rive en mètres (gondolier)
}
// Règle anti-superposition en MÈTRES (monde, pas écran) : indépendante du zoom et de l'appareil, c'est une vraie modification de la trajectoire.
// Les personnages contournent les pastilles de lieux (côté gauche de leur marche) et s'écartent entre eux ; le gondolier, lui, reste sur l'eau : il n'est jamais déplacé (c'est un obstacle fixe pour les autres).
const WORLD = { rc: 13, rp: 15, gap: 4 }, KX = 111320 * Math.cos((45.435 * Math.PI) / 180), KY = 111320, LAT0 = 45.435, LON0 = 12.335;
let adjCache = [];
// Détour des trajectoires : chaque trajectoire est modifiée une fois pour toutes pour contourner les pastilles de lieux (arc de cercle de rayon rc+rp+gap, côté gauche si on passe pile par le centre). Indépendant du zoom, du moment et de l'appareil.
function detourRoute(pts) {
  const pin = PLACES.map((p) => ({ x: (p.lon - LON0) * KX, y: (p.lat - LAT0) * KY })), MIN = WORLD.rc + WORLD.rp + WORLD.gap;
  const xy = (p) => ({ x: (p[1] - LON0) * KX, y: (p[0] - LAT0) * KY }), ll = (o) => [LAT0 + o.y / KY, LON0 + o.x / KX];
  let r = pts.map((p) => ({ ...xy(p), s: p[2] }));
  const closed = Math.hypot(r[0].x - r[r.length - 1].x, r[0].y - r[r.length - 1].y) < 2;
  if (closed) r.pop();
  const inside = (o) => pin.some((q) => Math.hypot(o.x - q.x, o.y - q.y) < MIN - 0.01);
  if (closed) { const k = r.findIndex((o) => !inside(o)); if (k < 0) return pts; r = r.slice(k).concat(r.slice(0, k)); }
  for (let pass = 0; pass < 10; pass++) for (const q of pin) {
    const out = []; let i = 0;
    while (i < r.length) {
      if (Math.hypot(r[i].x - q.x, r[i].y - q.y) >= MIN - 0.01) { out.push(r[i++]); continue; }
      let j = i; while (j < r.length && Math.hypot(r[j].x - q.x, r[j].y - q.y) < MIN - 0.01) j++;
      const A = out[out.length - 1] || r[i], B = r[j] || r[r.length - 1];
      const pa = Math.atan2(A.y - q.y, A.x - q.x), pb = Math.atan2(B.y - q.y, B.x - q.x); let dl = wrapA(pb - pa);
      if (Math.abs(dl) > Math.PI * 0.93) { const h = Math.atan2(B.y - A.y, B.x - A.x); dl = wrapA(h + Math.PI / 2 - pa) > 0 ? Math.abs(dl) : -Math.abs(dl); } // pile par le centre : on contourne par la gauche
      const n = Math.max(2, Math.ceil((Math.abs(dl) * MIN) / 6));
      for (let k = 0; k <= n; k++) { const a = pa + (dl * k) / n; out.push({ x: q.x + MIN * Math.cos(a), y: q.y + MIN * Math.sin(a), s: A.s }); }
      i = j;
    }
    r = out;
  }
  if (closed) r.push({ ...r[0] });
  return r.map((o) => { const p = ll(o); return o.s != null ? [p[0], p[1], o.s] : p; });
}
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function adjAll(t) {
  for (const c of adjCache) if (c.t === t) return c.r;
  const L = [];
  for (const W of WALKERS) if (W.R) { const a = rawAt(W, t), b = rawAt(W, t + 1500), x = (a.lon - LON0) * KX, y = (a.lat - LAT0) * KY; L.push({ W, a, x, y, h: Math.atan2((b.lat - a.lat) * KY, (b.lon - a.lon) * KX), fixed: W.id === "gondolier" }); }
  const pairMin = 2 * WORLD.rc + WORLD.gap;
  for (let it = 0; it < 2; it++) {
    const lion = L.find((w) => w.W.id === "lion"); // seul le lion (qui vole) s'écarte des autres personnages ; les marcheurs ont déjà leur trajectoire détournée des pastilles
    if (lion) for (const o of L) {
      if (o === lion) continue;
      let dx = lion.x - o.x, dy = lion.y - o.y, d = Math.hypot(dx, dy); if (d >= pairMin) continue;
      if (d < 0.5) { dx = -Math.sin(lion.h); dy = Math.cos(lion.h); d = 1; }
      const k = pairMin - d; lion.x += (dx / d) * k; lion.y += (dy / d) * k;
    }
  }
  const r = {}; for (const w of L) r[w.W.id] = { lat: LAT0 + w.y / KY, lon: LON0 + w.x / KX, shore: w.a.shore };
  adjCache.unshift({ t, r }); adjCache.length = Math.min(adjCache.length, 4);
  return r;
}
function walkerAt(W, t = nowMs()) { return adjAll(t)[W.id] || rawAt(W, t); }
// Le décalage d'esquive entre personnages est lissé dans le temps : si deux personnages se croisent, l'un glisse sur le côté au lieu de sauter.
function smoothAdj(W, now) {
  const r = rawAt(W, now), a = adjAll(now)[W.id] || r, ox = (a.lon - r.lon) * KX, oy = (a.lat - r.lat) * KY; W.so = W.so || { x: 0, y: 0 };
  const kk = ecoOn() ? 3 : 1; W.so.x += (ox - W.so.x) * Math.min(0.5, 0.12 * kk); W.so.y += (oy - W.so.y) * Math.min(0.5, 0.12 * kk);
  return { lat: r.lat + W.so.y / KY, lon: r.lon + W.so.x / KX, shore: r.shore };
}
function dogeMsg(txt) { cortoSays(txt); } // message de Corto (même présentation que la pastille de Corto : voir cortoSays)
// Corto, quand on touche un personnage trop éloigné : variantes, avec le grade du joueur ({g}), {to} = « au doge », {n} = « le doge ».
const FAR_LINES = [
  "Tu es trop loin pour parler avec {n}. Rapproche-toi d'abord !",
  "{G}, ta voix ne porte pas assez loin. Approche-toi {de} !",
  "Mais enfin, {g}, tu ne peux pas parler {to} depuis cette distance. Commence par te rapprocher de lui !",
  "Hého, {g} ! {N} ne t'entend pas d'aussi loin. Avance un peu !",
  "On ne crie pas à travers tout Venise, {g}. Rapproche-toi {de}.",
  "{N} est bien trop loin, {g}. Il va falloir marcher un peu !",
  "Un {g} qui veut parler {to} commence par s'en approcher. Allez, en route !",
  "Impossible de lui parler d'ici, {g}. Rapproche-toi, il ne mord pas !",
  "Trop loin, {g} ! Prends tes jambes à ton cou et rejoins {n}.",
  "Tu fais des signes, mais {n} ne te voit pas, {g}. Approche-toi !",
  "Patience, {g} : pour discuter avec {n}, il faut d'abord le rejoindre.",
  "La distance est trop grande, {g}. Un peu plus près, et il t'écoutera.",
];
// Gondolier au large (trop loin de la rive pour qu'on puisse l'approcher à pied) : Corto dit d'attendre.
const SHORE_MAX = 50;
const OFFSHORE_LINES = [
  "Le gondolier est au large. Attends qu'il s'approche du rivage pour lui parler.",
  "Il est trop loin de la rive, {g}. Attends que le gondolier s'approche du bord pour lui parler.",
  "Patience, {g} ! Le gondolier ne peut pas t'entendre depuis le milieu de l'eau. Attends qu'il se rapproche du rivage.",
  "Le gondolier rame au milieu des flots. Attends qu'il s'approche du rivage, {g}.",
  "Tu ne peux pas marcher sur l'eau, {g} ! Attends que le gondolier vienne près du quai.",
];
function offshoreLine(W) { return OFFSHORE_LINES[Math.floor(Math.random() * OFFSHORE_LINES.length)].replace(/\{g\}/g, gradeLc()); }
let farLast = -1;
function farLine(W) {
  const L = W.farLines || FAR_LINES; let i; do { i = Math.floor(Math.random() * L.length); } while (i === farLast && L.length > 1);
  farLast = i; const g = gradeLc(), cap = (t) => t[0].toUpperCase() + t.slice(1);
  return L[i].replace(/\{G\}/g, cap(g)).replace(/\{g\}/g, g).replace(/\{N\}/g, cap(W.name)).replace(/\{n\}/g, W.name).replace(/\{to\}/g, W.to).replace(/\{de\}/g, W.de);
}
async function walkerTap(W) {
  if (!await validNarrativePosition()) return;
  const d = walkerAt(W), m = pos ? dist(pos.lat, pos.lon, d.lat, d.lon) : Infinity;
  if (m > W.near + Math.min(pos.acc, 40)) { toast(d.shore > SHORE_MAX ? offshoreLine(W) : farLine(W)); return; }
  openNarrative(W.id);
}
// Rencontre en grand : le personnage grandit en haut de l'écran et pose sa question ; mauvaise réponse -> il se vexe, rapetisse et s'enfuit en courant.
function openWalkerQuiz(W) {
  const el = W.marker.getElement(), r0 = el.getBoundingClientRect();
  const ov = document.createElement("div"); ov.className = "wq";
  const opts = W.quiz.opts.map((o) => ({ ...o })).sort(() => Math.random() - 0.5);
  ov.innerHTML = `<div class="wq-top"><span class="wq-halo"></span><img class="wq-img" src="${W.big}" alt="${esc(W.name)}"><span class="wq-puff">⚡</span><div class="wq-bubble">${esc(W.quiz.bad)}</div></div>
    <div class="wq-txt">${esc(W.quiz.q)}</div><div class="b-actions stack wq-opts">${opts.map((o, i) => `<button class="b-btn choice wq-opt" data-i="${i}">${esc(o.t)}</button>`).join("")}</div>`;
  document.body.appendChild(ov);
  if (W.bigHappy) { new Image().src = W.bigHappy; new Image().src = W.bigAngry; } // visages préchargés : il sourit si on répond bien, fait la tête sinon
  const img = $(".wq-img", ov), txt = $(".wq-txt", ov), box = $(".wq-opts", ov);
  const flip = (to) => { const b = img.getBoundingClientRect(), k = r0.width / b.width, dx = r0.left + r0.width / 2 - (b.left + b.width / 2), dy = r0.top + r0.height / 2 - (b.top + b.height / 2); return [`translate(${dx}px,${dy}px) scale(${k})`, "none"]; };
  const [from] = flip();
  el.style.visibility = "hidden";
  ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: "both" });
  img.animate([{ transform: from }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.9,.3,1.2)" });
  const close = (cb) => { img.animate([{ transform: "none" }, { transform: from, opacity: 0.2 }], { duration: 420, easing: "ease-in", fill: "forwards" }); ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: "forwards" }).onfinish = () => { ov.remove(); el.style.visibility = ""; if (cb) cb(); }; };
  box.addEventListener("click", (e) => {
    const b = e.target.closest(".wq-opt"); if (!b) return; const o = opts[+b.dataset.i]; if (!o) return;
    box.style.pointerEvents = "none";
    if (o.ok) {
      b.classList.add("right"); if (W.bigHappy) img.src = W.bigHappy;
      if (!has("pn:" + W.id)) { award("pn:" + W.id, 3, meIdx()); save(); refreshAll(); starBurst(b, 3, true); }
      img.animate([{ transform: "scale(1)" }, { transform: "scale(1.06) rotate(-2deg)" }, { transform: "scale(1)" }], { duration: 500 });
      txt.textContent = W.quiz.good.replace(/\{g\}/g, gradeLc());
      box.innerHTML = '<button class="b-btn go-next wq-bye">Merci, ô grand doge !</button>'; box.style.pointerEvents = "";
      $(".wq-bye", ov).onclick = () => close();
    } else {
      b.classList.add("wrong"); ov.classList.add("vexed"); if (W.bigAngry) img.src = W.bigAngry;
      img.animate([{ transform: "rotate(0)" }, { transform: "rotate(-7deg) translateX(-8px)" }, { transform: "rotate(7deg) translateX(8px)" }, { transform: "rotate(-6deg) translateX(-6px)" }, { transform: "rotate(6deg) translateX(6px)" }, { transform: "rotate(0)" }], { duration: 700, iterations: 2 });
      setTimeout(() => close(() => {
        const cur = huffOff(W, Date.now()); W.huff = { t0: Date.now(), from: cur, m: cur + HUFF_M }; // il repart d'où il en était et file encore plus loin try { localStorage.setItem("vq_huff_" + W.id, JSON.stringify(W.huff)); } catch {}
        el.classList.add("run"); setTimeout(() => el.classList.remove("run"), (HUFF_RUN + 1) * 1000);
      }), 2300);
    }
  });
}
async function startWalker(W) {
  try {
    let pts = await (await fetch(W.route)).json();
    if (W.id !== "gondolier") pts = detourRoute(pts); // les personnages à terre ou en vol contournent les pastilles ; le gondolier reste sur l'eau, intact
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
    W.R = { pts, cum, total: cum[cum.length - 1] };
    try { W.huff = JSON.parse(localStorage.getItem("vq_huff_" + W.id) || "null"); } catch { W.huff = null; }
  } catch { return; }
  const el = document.createElement("div"); el.className = "pin doge"; el.style.width = W.w + "px";
  const av = W.rig ? `<div class="doge-av lion-rig" style="width:${W.w}px;aspect-ratio:${W.rig.ratio}"><img class="lr-body" src="${W.rig.body}" alt="${W.name}"><img class="lr-rear" src="${W.rig.rear}" alt=""><img class="lr-front" src="${W.rig.front}" alt=""><img class="lr-wings" src="${W.rig.wings}" alt=""></div>` : `<img class="doge-av" style="width:${W.w}px" src="${W.img}" alt="${W.name}">`;
  el.innerHTML = `<div class="doge-sc">${W.heading ? `<div class="wk-turn"><div class="wk-flip">${av}</div></div>` : av}<span class="doge-zap">⚡</span></div>`;
  if (W.heading) { W.turnEl = $(".wk-turn", el); W.flipEl = $(".wk-flip", el); W.ang = 0; W.left = false; }
  el.addEventListener("click", (e) => { e.stopPropagation(); walkerTap(W); });
  const d = walkerAt(W);
  W.marker = new maplibregl.Marker({ element: el, anchor: "bottom", subpixelPositioning: true }).setLngLat([d.lon, d.lat]).addTo(map);
}
let walkLast = 0;
// Mode éco : les personnages ne sont recalculés que 20 fois par seconde (au lieu de chaque image) ; tout le reste est inchangé.
const ecoOn = () => { try { return localStorage.getItem("vq_eco") === "1"; } catch { return false; } };
let walkPrev = 0;
function walkTick(ts) {
  if (!mapWorkVisible()) { setTimeout(() => requestAnimationFrame(walkTick), 250); return; }
  if (ecoOn() && ts - walkPrev < 49) { requestAnimationFrame(walkTick); return; } // saute les images intermédiaires (≈ 20 images/s sur un écran 60 Hz)
  const eco = ecoOn(), k = walkPrev ? Math.min(3, Math.max(1, (ts - walkPrev) / 16.7)) : 1; walkPrev = ts; // k : lissages recalés sur le temps réel écoulé
  const now = nowMs();
  for (const W of WALKERS) if (W.motion && W.marker) { const v = motionSpeed(W.motion, now) / W.motion.cruise, c = W.marker.getElement().classList; c.toggle("flying", v > 0.2); c.toggle("landed", v <= 0.2); }
  for (const W of WALKERS) if (W.marker) W.marker.getElement().classList.toggle("angry", !!W.huff && now - W.huff.t0 < (DEV ? 5 : 60) * 1000); // fâché : éclair et halo rouge : 5 s en mode dev, 1 min en réel
  const smooth = map.getZoom() >= 16.5 || WALKERS.some((W) => W.huff && now - W.huff.t0 < (HUFF_RUN + 1) * 1000);
  const slow = ts - walkLast > 5000; if (slow) walkLast = ts;
  for (const W of WALKERS) if (W.marker && (smooth || slow || W.motion)) { const q = W.id === "lion" ? smoothAdj(W, now) : walkerAt(W, now); W.marker.setLngLat([q.lon, q.lat]); } // le lion bouge à chaque image, quel que soit le zoom : mouvement continu, sans à-coups
  for (const W of WALKERS) if (W.heading && W.marker) { // le lion regarde là où il va : retourné (gauche/droite) et incliné selon la direction à l'écran
    const a = rawAt(W, now), b = rawAt(W, now + 700), pa = map.project([a.lon, a.lat]), pb = map.project([b.lon, b.lat]), dx = pb.x - pa.x, dy = pb.y - pa.y, n = Math.hypot(dx, dy);
    if (n > 0.04) { // à l'arrêt (posé) il garde son dernier cap
      if (Math.abs(dx) > 0.25 * n) W.left = dx < 0;
      const tgt = Math.max(-38, Math.min(38, (W.left ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx)) * 57.2958));
      W.ang += (tgt - W.ang) * Math.min(0.5, 0.1 * k);
    }
    W.turnEl.style.transform = `rotate(${W.ang.toFixed(1)}deg)`; W.flipEl.classList.toggle("left", W.left);
  }
  requestAnimationFrame(walkTick);
}
Promise.all(WALKERS.map(startWalker)).then(() => requestAnimationFrame(walkTick));
if (DEV) { window.__walkTick = walkTick; window.__doge = () => walkerAt(WALKERS[0]); window.__monte = () => walkerAt(WALKERS[1]); window.__walkerAt = (i, t) => walkerAt(WALKERS[i], t); window.__WK = WALKERS; window.__marc = () => walkerAt(WALKERS[2]); window.__lion = () => walkerAt(WALKERS[4]); window.__gond = () => walkerAt(WALKERS[3]); }
const pinEls = {};
// Icônes dessinées à la place de la pastille photo (fond transparent) ; w = largeur en px (à régler ici), ratio = largeur/hauteur de l'image.
const PLACE_ICONS = {
  frari: { src: "img/places/frari-icon.webp", w: 48, ratio: 1 },
  salute: { src: "img/places/salute-icon.webp", w: 48, ratio: 0.8953 },
  basilique: { src: "img/places/basilique-icon.webp", w: 48, ratio: 1.045 },
  cadoro: { src: "img/places/cadoro-icon.webp", w: 48, ratio: 1.1823 },
  miracoli: { src: "img/places/miracoli-icon.webp", w: 48, ratio: 1.0256 },
  rialto: { src: "img/places/rialto-icon.webp", w: 48, ratio: 1.5824 },
  dogana: { src: "img/places/dogana-icon.webp", w: 34, ratio: 0.4292 },
};
// Position et taille (par niveau de zoom) de chaque icône : réglées à la main en mode édition (aperçu local), enregistrées dans data/place-icons.json.
// { id: { lon, lat, stops: [[zoom, largeur en px], …], pos: [[zoom, lon, lat], …] } } — pos (facultatif) : position du centre à certains niveaux de zoom ; entre deux repères la position glisse en douceur, au-delà elle reste celle du repère le plus proche ; sans repère, lon/lat. — entre deux niveaux réglés, la taille varie en douceur (interpolation géométrique) ; au-delà, l'icône suit l'échelle de la carte (×2 par niveau de zoom).
const ICONCFG = await fetch("data/place-icons.json?" + Date.now()).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const CONCLUSION_LAYOUT = await fetch("data/conclusion-layout.json?" + Date.now()).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const MUSIC_LAYOUT = await fetch("data/music-layout.json?" + Date.now()).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
if (LOCAL_DEV) { try { Object.assign(MUSIC_LAYOUT, JSON.parse(localStorage.getItem("vq_music_layout_draft") || "{}")); } catch {} }
const iconMarkers = {};
const iconStops = (id) => ((ICONCFG[id] && ICONCFG[id].stops) || []).slice().sort((a, b) => a[0] - b[0]);
function iconSize(id, z) {
  const st = iconStops(id); if (!st.length) return PLACE_ICONS[id].w * pinScaleAt(z); // pas encore réglée : comportement d'origine
  if (z <= st[0][0]) return st[0][1] * 2 ** (z - st[0][0]);
  const L = st[st.length - 1]; if (z >= L[0]) return L[1] * 2 ** (z - L[0]);
  for (let i = 1; i < st.length; i++) if (z <= st[i][0]) { const [z0, w0] = st[i - 1], [z1, w1] = st[i], t = (z - z0) / (z1 - z0); return Math.exp(Math.log(w0) + (Math.log(w1) - Math.log(w0)) * t); }
  return L[1];
}
const iconPosKeys = (id) => ((ICONCFG[id] && ICONCFG[id].pos) || []).slice().sort((a, b) => a[0] - b[0]);
function iconPos(id, z) {
  const k = iconPosKeys(id), c = ICONCFG[id], pl = PLACES.find((p) => p.id === id);
  if (!k.length) return c && c.lon != null ? [c.lon, c.lat] : [pl.lon, pl.lat];
  if (z <= k[0][0]) return [k[0][1], k[0][2]];
  const L = k[k.length - 1]; if (z >= L[0]) return [L[1], L[2]];
  for (let i = 1; i < k.length; i++) if (z <= k[i][0]) { const [z0, a0, b0] = k[i - 1], [z1, a1, b1] = k[i], t = (z - z0) / (z1 - z0); return [a0 + (a1 - a0) * t, b0 + (b1 - b0) * t]; }
  return [L[1], L[2]];
}
function updateIcons() {
  const z = map.getZoom();
  for (const id in iconMarkers) { const { el, marker } = iconMarkers[id]; if (!marker._ic_drag) marker.setLngLat(iconPos(id, z)); }
  for (const id in iconMarkers) { const { el } = iconMarkers[id], w = iconSize(id, z), h = w / PLACE_ICONS[id].ratio; for (const e of [el, el.firstChild]) { e.style.setProperty("--iw", w.toFixed(2) + "px"); e.style.setProperty("--ih", h.toFixed(2) + "px"); } }
}
map.on("zoom", updateIcons);
let iconEdit = false; // mode édition des icônes (aperçu local uniquement)
let iconSelect = (id) => {};
function renderMap() {
  PLACES.forEach((p) => {
    let el = pinEls[p.id];
    if (!el) {
      const ic = PLACE_ICONS[p.id]; el = document.createElement("div"); el.className = "pin" + (ic ? " has-icon" : ""); el.innerHTML = `<div class="pin-in pic${ic ? " icon" : ""}" style="--img:url(${ic ? ic.src : pic(p.id)})${ic ? `;--iw:${ic.w}px;--ih:${Math.round(ic.w / ic.ratio)}px` : ""}"></div>`;
      el.addEventListener("click", (e) => { e.stopPropagation(); if (iconEdit && ic) { iconSelect(p.id); return; } openPlaceBump(p.id, el.firstChild.getBoundingClientRect()); });
      const c0 = ICONCFG[p.id], mk = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(ic ? iconPos(p.id, map.getZoom()) : [p.lon, p.lat]).addTo(map);
      if (ic) { iconMarkers[p.id] = { marker: mk, el }; updateIcons(); }
      pinEls[p.id] = el;
    }
    el.firstChild.className = `pin-in pic${PLACE_ICONS[p.id] ? " icon" : ""} ${complete(p) ? "done" : arrived(p.id) ? "seen" : ""}${p.final ? " final" : ""}`;
  });
}
// Repères botaniques illustrés : indépendants des lieux, des épreuves et de la progression.
const treeMarkers = new Map();
// Rayon de consultation seulement : les points de site ne valident jamais un tronc ni une récolte.
const treeViewRadius = (tree) => tree.precision === "site_only" ? 250 : 150;
function updateTreeSize() {
  const size = treeSize(map.getZoom()) + "px";
  for (const marker of treeMarkers.values()) marker.getElement().style.setProperty("--tree-size", size);
}
function renderTrees(points) {
  for (const tree of points) {
    if (!tree.enabled || treeMarkers.has(tree.id) || !Number.isFinite(tree.coordinates?.lng) || !Number.isFinite(tree.coordinates?.lat)) continue;
    const siteOnly = tree.precision === "site_only";
    const precision = siteOnly ? "Position indicative dans ce site, pas celle de l’arbre." : "Emplacement approximatif de l’arbre.";
    const el = document.createElement("button");
    el.type = "button"; el.className = "tree-marker"; el.dataset.treeId = tree.id;
    const img = document.createElement("img"); img.src = tree.iconSmall; img.srcset = `${tree.icon} 2x`; img.alt = ""; img.draggable = false;
    el.appendChild(img);
    const showTree = () => {
      if (tab !== "map") return;
      if (!pos) { cortoSays(say("nogps")); return; }
      const away = dist(pos.lat, pos.lon, tree.coordinates.lat, tree.coordinates.lng);
      if (away > treeViewRadius(tree) + Math.min(pos.acc || 0, 30)) {
        cortoSays(placeFarLine(tree, away));
        return;
      }
      toast(`${tree.name} — ${tree.positionLabel}. ${precision}`, 6000);
    };
    let touchStart = null, lastTouch = 0;
    el.addEventListener("pointerdown", (e) => { e.stopPropagation(); if (e.pointerType === "touch") touchStart = [e.clientX, e.clientY]; });
    el.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "touch" || !touchStart) return;
      e.stopPropagation();
      const moved = Math.hypot(e.clientX - touchStart[0], e.clientY - touchStart[1]); touchStart = null;
      if (moved < 10) { lastTouch = performance.now(); showTree(); }
    });
    el.addEventListener("pointercancel", () => { touchStart = null; });
    el.addEventListener("click", (e) => { e.stopPropagation(); if (performance.now() - lastTouch > 600) showTree(); });
    treeMarkers.set(tree.id, new maplibregl.Marker({ element: el, anchor: "bottom", subpixelPositioning: true }).setLngLat([tree.coordinates.lng, tree.coordinates.lat]).addTo(map));
    treePoints.push([tree.coordinates.lng, tree.coordinates.lat]);
    // MapLibre attribue « Map marker » à l'ajout ; rétablir le libellé précis ensuite.
    el.setAttribute("aria-label", `${tree.name}. ${tree.positionLabel}. ${precision}`);
  }
  updateTreeSize();
  updateOverlap();
}
map.on("zoom", updateTreeSize);
fetch("data/arbres.json").then((r) => { if (!r.ok) throw new Error("Repères d’arbres indisponibles"); return r.json(); }).then((data) => renderTrees(data.points || [])).catch((e) => console.warn(e.message));
$("#bridge-btn").onclick = (e) => openBridges(e.currentTarget.getBoundingClientRect());
// Le portrait de Corto ouvre son dialogue lorsque la position du joueur est valide.
$("#corto-btn").onclick = async () => { if (await validNarrativePosition()) openNarrative("corto"); };
// Pastille maison (à côté de Corto, toujours visible) : ouvre l'espace de l'enfant (profil, défis, ponts, photos, trophées, réglages).
$("#home-btn").onclick = () => {
  if (tab !== "map") return;
  // Suspendre la fiche immédiatement ; son retour d'historique ne doit pas refermer le menu.
  if (openId === "chap") suspendChap(true);
  setTab(lastTab);
};
// Pastille carte (à gauche) : ramène toujours à la carte, quoi qu'il y ait à l'écran (fiche de lieu, défi, espace de l'enfant).
$("#map-btn").onclick = () => { if (quest) closeQuest(); if (openId === "chap") suspendChap(); else if (openId) closeSheet(); if (tab !== "map") returnToMap(); };

/* ───────── Éditeur d'icônes de bâtiments (aperçu local uniquement) ─────────
   Bouton « 🏛 Icônes » : on touche une icône pour la choisir, on la glisse pour déplacer son centre (sa position sur la carte), et à chaque niveau de zoom on règle sa taille
   (poignée ronde, − / +, curseur). Chaque réglage devient un repère [zoom → largeur] ; « Enregistrer » écrit data/place-icons.json. */
if (LOCAL_DEV && Object.keys(PLACE_ICONS).length) {
  const bar = document.createElement("div"); bar.id = "ic-dev";
  bar.innerHTML = '<button type="button" class="ic-tg">🏛 Icônes</button><div class="ic-pn" hidden><div class="ic-hd"><b class="ic-t"></b><span class="ic-z"></span></div><div class="ic-row"><button type="button" class="ic-m">−</button><input type="range" class="ic-r" min="6" max="700" step="1"><button type="button" class="ic-p">+</button><b class="ic-w"></b></div><div class="ic-st"></div><div class="ic-row"><button type="button" class="ic-pin">📍 Repère de position ici</button><label class="ic-lb"><input type="checkbox" class="ic-all"> tous les zooms</label></div><div class="ic-row"><button type="button" class="ic-sv">💾 Enregistrer</button><em class="ic-msg"></em></div><small>Glisse l\'icône : son centre se déplace à CE zoom (la position glisse en douceur d\'un repère à l\'autre). « tous les zooms » : déplace tous les repères ensemble. Zoome, puis règle la taille : chaque réglage est un repère.</small></div>';
  document.body.appendChild(bar);
  const q = (c) => bar.querySelector(c), pn = q(".ic-pn"); let sel = null, handle = null;
  const say = (t) => { const m = q(".ic-msg"); m.textContent = t; clearTimeout(say.t); say.t = setTimeout(() => (m.textContent = ""), 2500); };
  const snapZ = (z) => Math.round(z * 10) / 10;
  const cfg = (id) => (ICONCFG[id] ||= { lon: PLACES.find((p) => p.id === id).lon, lat: PLACES.find((p) => p.id === id).lat, stops: [] });
  const setSize = (w) => { const id = sel; if (!id) return; w = Math.max(6, Math.min(700, Math.round(w * 10) / 10)); const z = snapZ(map.getZoom()), c = cfg(id); c.stops = (c.stops || []).filter((x) => Math.abs(x[0] - z) > 0.049); c.stops.push([z, w]); updateIcons(); refresh(); };
  const refresh = () => {
    q(".ic-z").textContent = "zoom " + map.getZoom().toFixed(2); if (!sel) { q(".ic-t").textContent = "Touche une icône"; q(".ic-st").innerHTML = ""; return; }
    const w = iconSize(sel, map.getZoom()); q(".ic-t").textContent = sel; q(".ic-w").textContent = Math.round(w) + " px"; q(".ic-r").value = Math.round(w);
    q(".ic-st").innerHTML = (iconStops(sel).map((x, i) => `<span class="ic-chip" data-z="${x[0]}">z${x[0]} → ${Math.round(x[1])}px <i data-d="${i}">✕</i></span>`).join("") || "<small>Aucun repère de taille : taille d'origine (suit le zoom)</small>") + iconPosKeys(sel).map((x, i) => `<span class="ic-chip pos" data-z="${x[0]}">📍 z${x[0]} <i data-pd="${i}">✕</i></span>`).join("");
  };
  const placeHandle = () => { handle?.remove(); handle = null; if (!sel || !iconEdit) return; const el = iconMarkers[sel].el; handle = document.createElement("div"); handle.className = "ic-handle"; el.appendChild(handle);
    for (const ev of ["mousedown", "touchstart"]) handle.addEventListener(ev, (e) => e.stopPropagation()); // la poignée ne déplace ni l'icône ni la carte
    handle.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1, w0 = iconSize(sel, map.getZoom()); try { handle.setPointerCapture(e.pointerId); } catch {}
      const mv = (ev) => setSize(w0 * Math.hypot(ev.clientX - cx, ev.clientY - cy) / d0), up = () => { handle.removeEventListener("pointermove", mv); handle.removeEventListener("pointerup", up); }; handle.addEventListener("pointermove", mv); handle.addEventListener("pointerup", up); }); };
  iconSelect = (id) => { sel = id; for (const k in iconMarkers) iconMarkers[k].el.classList.toggle("ic-sel", k === id); placeHandle(); refresh(); };
  const hookDrag = () => { for (const id in iconMarkers) { const m = iconMarkers[id]; if (m.hooked) continue; m.hooked = true; m.marker.on("dragstart", () => { m.marker._ic_drag = true; });
      m.marker.on("dragend", () => {
        m.marker._ic_drag = false; const l = m.marker.getLngLat(), c = cfg(id), zr = map.getZoom(), z = Math.round(zr * 100) / 100, prev = iconPos(id, zr), nl = +l.lng.toFixed(6), nt = +l.lat.toFixed(6);
        if (q(".ic-all").checked) { const dx = nl - prev[0], dy = nt - prev[1]; if (c.pos && c.pos.length) c.pos = c.pos.map((k) => [k[0], +(k[1] + dx).toFixed(6), +(k[2] + dy).toFixed(6)]); else { c.lon = nl; c.lat = nt; } say("Tous les repères déplacés"); }
        else { c.pos = (c.pos || []).filter((k) => Math.abs(k[0] - z) > 0.019); c.pos.push([z, nl, nt]); say("Position fixée à ce zoom"); }
        updateIcons(); refresh();
      }); } }; // les repères existent après le premier rendu de la carte
  q(".ic-tg").onclick = () => { hookDrag(); iconEdit = !iconEdit; pn.hidden = !iconEdit; document.body.classList.toggle("ic-edit", iconEdit); for (const k in iconMarkers) iconMarkers[k].marker.setDraggable(iconEdit); if (iconEdit) iconSelect(sel || Object.keys(iconMarkers)[0]); else { iconSelect(null); } };
  q(".ic-m").onclick = () => setSize(iconSize(sel, map.getZoom()) * 0.92); q(".ic-p").onclick = () => setSize(iconSize(sel, map.getZoom()) * 1.08);
  q(".ic-r").oninput = (e) => setSize(+e.target.value);
  q(".ic-pin").onclick = () => { if (!sel) return; const c = cfg(sel), zr = map.getZoom(), z = Math.round(zr * 100) / 100, p = iconPos(sel, zr); c.pos = (c.pos || []).filter((k) => Math.abs(k[0] - z) > 0.019); c.pos.push([z, +p[0].toFixed(6), +p[1].toFixed(6)]); say("Repère posé à ce zoom"); updateIcons(); refresh(); };
  q(".ic-st").onclick = (e) => { const pd = e.target.closest("[data-pd]"); if (pd) { const k = iconPosKeys(sel); k.splice(+pd.dataset.pd, 1); cfg(sel).pos = k; updateIcons(); refresh(); return; } const d = e.target.closest("[data-d]"); if (d) { const st = iconStops(sel); st.splice(+d.dataset.d, 1); cfg(sel).stops = st; updateIcons(); refresh(); return; } const c = e.target.closest("[data-z]"); if (c) map.easeTo({ zoom: +c.dataset.z, duration: 400 }); };
  q(".ic-sv").onclick = async () => { try { const r = await fetch("api/place-icons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ICONCFG) }); say(r.ok ? "Enregistré ✔ (data/place-icons.json)" : "Échec : serveur sans --dev ?"); } catch { say("Échec de l'enregistrement"); } };
  map.on("zoom", refresh); window.__icons = ICONCFG;
}


/* ───────── HUD / prochain objectif ───────── */
function renderHud() {
  const pts = pointsOf(meIdx()), li = level(pts), cur = LEVELS[li], nx = LEVELS[li + 1];
  renderProfileBar();
  $("#hud-kids").innerHTML = `<span class="mb-av">${PROFILE ? profileHtml() : me().avatar}</span><small>${esc(myName())}</small>`;
  if (!scoreAnim) $("#hud-score").innerHTML = `<span class="sc-n"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.75 5.8 6.35.85-4.65 4.4 1.15 6.3L12 17l-5.6 3.15 1.15-6.3L2.9 9.45l6.35-.85z" fill="#F2B51C" stroke="#F2B51C" stroke-width="1.4" stroke-linejoin="round"/></svg><b>${pts}</b></span>`; // seulement l'étoile et le décompte, sans pastille
}
// Toucher sa photo ou son pictogramme permet de les modifier (nouveau pictogramme, nouvelle photo, nouveau nom).
$("#hud-kids").onclick = () => setTab(lastTab);
function renderProfileBar() {
  const pts = pointsOf(meIdx()), cur = LEVELS[level(pts)];
  $("#up-me").innerHTML = `<span class="mb-av${PROFILE?.photo ? " up-avatar-frame" : ""}">${PROFILE?.photo ? `<span class="me ph up-avatar">${profileHtml()}</span>` : PROFILE ? profileHtml() : me().avatar}</span><span class="up-n"><b>${esc(myName())}</b><small>${cur.name}</small></span>`; // photo, nom, grade : rien d'autre (les étoiles sont dans le compteur, toujours visible)
}
$("#up-me").onclick = async () => {
  if (!PROFILE) return;
  const p = await editProfile(PROFILE); if (!p) return;
  if (p.photo && p.photo === PROFILE.photo) { p.outfit = PROFILE.outfit; p.outfitPhoto = PROFILE.outfitPhoto; p.outfitOverlay = PROFILE.outfitOverlay; p.outfitOverlayHat = PROFILE.outfitOverlayHat; p.outfitOverlayBody = PROFILE.outfitOverlayBody; p.outfitLayout = PROFILE.outfitLayout; p.outfitOverlayVersion = PROFILE.outfitOverlayVersion; p.outfitShift = PROFILE.outfitShift; } // nouvelle photo = plus de tenue
  applyProfile(p);
};
function applyProfile(p) {
  PROFILE = p; saveProfile(p);
  S.kids = [{ name: p.name, avatar: p.avatar || (S.kids[0] && S.kids[0].avatar) || "🦁" }]; S.cfgT = Date.now(); save();
  renderBadge(); renderHud(); renderProfileBar(); refreshUserMarker();
};
$("#hud-score").onclick = () => { if (openId || $(".wq") || $(".cer")) return; if (DEV) { devStarMenu(); return; } setTab("trophies"); };
// Mode dev : toucher le compteur d'étoiles ouvre un petit menu pour tester chaque cérémonie de grade.
function devStarMenu() {
  const old = $(".dev-menu"); if (old) { old.remove(); return; }
  const m = document.createElement("div"); m.className = "dev-menu";
  m.innerHTML = `<b>Mode dev</b>${Object.entries(OUTFIT_LEVELS).map(([li, key]) => `<button data-li="${li}" data-k="${key}">Tester la cérémonie : ${esc(LEVELS[li].name.toLowerCase())}</button>`).join("")}<button data-tro>🏆 Ouvrir les trophées</button>`;
  document.body.appendChild(m);
  const off = (e) => { if (m.contains(e.target) && e.target.tagName === "BUTTON") return; m.remove(); removeEventListener("pointerdown", off, true); };
  setTimeout(() => addEventListener("pointerdown", off, true), 0);
  m.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; m.remove(); removeEventListener("pointerdown", off, true); if (b.dataset.tro !== undefined) { setTab("trophies"); return; } if (tab !== "map") setTab("map"); setTimeout(() => ceremony(b.dataset.k, +b.dataset.li), 300); };
}
function nextTarget() {
  const pool = PLACES.filter((p) => !arrived(p.id) && !(p.final && !finaleOpen()));
  if (!pool.length) return null;
  return pos ? pool.slice().sort((a, b) => distTo(a) - distTo(b))[0] : pool[0];
}
function renderNext() {
  const b = $("#next"), p = nextTarget();
  if (!p || tab !== "map" || openId) { b.hidden = true; return; }
  const d = distTo(p);
  b.hidden = false;
  b.innerHTML = `<span class="pth pic" style="--img:url(${pic(p.id)})"></span><span class="grow"><b>${esc(p.name)}</b><small>${d != null ? fmtD(d) + " · " + heat(d, p.r) : "À découvrir"}</small></span>`;
  b.onclick = () => openPlaceBump(p.id);
}

/* ───────── Fiche d'un lieu ───────── */
let openId = null;
let medalOrigin = null;
const inZone = (p) => DEV || (geoReady && !!pos && distTo(p) <= Math.min(p.r, ZONE_MAX) + Math.min(pos.acc || 0, TOL_MAX));
// Phrase de Corto citant le lieu (corto-lieux.js) : distance et temps de marche ; pas deux fois la même de suite pour un même niveau.
const placeFarLast = {};
function placeFarLine(p, d) {
  const kind = d < 200 ? "near" : d > 1500 ? "far" : "mid", L = LIEUX[p.id], idx = level(pointsOf(meIdx())), g = LEVELS[idx].name.toLowerCase();
  const pool = PLACE_FAR[kind].filter((l) => typeof l === "string" || ((!l.in || (L && L.in)) && (l.lo == null || idx >= l.lo) && (l.hi == null || idx <= l.hi)));
  const rec = placeFarLast[kind] = placeFarLast[kind] || []; let i; do { i = Math.floor(Math.random() * pool.length); } while (pool.length > 2 && rec.includes(i)); rec.push(i); if (rec.length > 2) rec.shift();
  const l = pool[i], t = typeof l === "string" ? l : l.t, la = L ? L.la : p.name.replace(/^L'/, "l'").replace(/^(Le|La|Les) /, (m) => m.toLowerCase());
  const de = la.replace(/^le /, "du ").replace(/^les /, "des ").replace(/^la /, "de la ").replace(/^l'/, "de l'"), a = la.replace(/^le /, "au ").replace(/^les /, "aux ").replace(/^la /, "à la ").replace(/^l'/, "à l'");
  const dist = d < 1000 ? Math.max(10, Math.round(d / 10) * 10) + " mètres" : (d / 1000).toFixed(1).replace(".", ",") + " km";
  // « jusqu'{a} » → « jusqu'à la… » : l'apostrophe est déjà dans {a} pour l'élision, on la retire quand {a} commence par « à »
  let out = t.replace(/\{G\}/g, g[0].toUpperCase() + g.slice(1)).replace(/\{g\}/g, g).replace(/\{in\}/g, L && L.in || "").replace(/jusqu'\{a\}/g, "jusqu'" + a).replace(/\{la\}/g, la).replace(/\{de\}/g, de).replace(/\{a\}/g, a).replace(/\{dist\}/g, dist).replace(/\{min\}/g, minTxt(d));
  return out[0].toUpperCase() + out.slice(1);
}
// petite emphase : le lieu touché grossit puis rétrécit (transform : la propriété « scale » est verrouillée en !important dans la feuille de style), puis la suite s'ouvre
function bumpPin(id) { const el = pinEls[id] && pinEls[id].firstChild; if (el) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.4)", offset: 0.35 }, { transform: "scale(0.92)", offset: 0.7 }, { transform: "scale(1)" }], { duration: 440, easing: "ease-in-out" }); }
function openPlaceBump(id, originRect) { const p = place(id); if (p && !arrived(id) && inZone(p)) primeMusic(p); bumpPin(id); setTimeout(() => openPlace(id, originRect), pinEls[id] ? 260 : 0); }
let placeOpening = 0;
async function openPlace(id, originRect) {
  if (tab !== "map") return; // un toucher de macaron peut arriver juste avant l'ouverture du menu
  const p = place(id);
  if (!p) return;
  if (!DEV && !geoReady) { showGeoGate(); return; }
  const request = ++placeOpening;
  const needsWelcome = !(arrived(p.id) && !complete(p)) && !(p.chapters && complete(p));
  let gpsValid = false;
  if (needsWelcome) {
    gpsValid = LOCAL_DEV && p.chapters ? true : fixIsReal() && !geoSimulated ? await getFix(2500).catch(() => false) : !!pos;
    if (request !== placeOpening || tab !== "map" || openId === "bridges" || openId === "chap") return;
  }
  // Trop loin du lieu : plus de pastille agrandie ni de reprise d'épreuve, simplement un message de Corto (phrases near / mid / far avec distance et temps de marche).
  // Sur l'aperçu local, l'entrée de l'épreuve reste accessible pour ses contrôles de test, même si le GPS est loin.
  { const inReal = !!pos && distTo(p) <= Math.min(p.r, ZONE_MAX) + Math.min(pos.acc || 0, TOL_MAX);
    if (!(p.chapters && complete(p)) && !(LOCAL_DEV && p.chapters) && (DEV ? !!pos && !inReal : !inZone(p))) { const d = distTo(p); if (suspended) closeSheet(); cortoSays(d == null ? say("nogps", p) : placeFarLine(p, d)); return; } }
  // Épreuve mise en pause : même lieu et enfant toujours dans la zone → on retombe exactement sur l'écran quitté.
  if (suspended) { if (suspended.id === id && inZone(p)) { resumeSuspended(); return; } closeSheet(); }
  // Enquête commencée et enfant toujours dans la zone : on reprend instantanément là où il en était, sans repasser par l'accueil.
  if (arrived(p.id) && !complete(p) && inZone(p)) { closeSheet(); openQuest(p.id); return; }
  // Épreuve terminée : retrouver la même conclusion, sur la photo du lieu, sans relancer le questionnaire.
  if (p.chapters && complete(p)) {
    if (p.reward && !has("fin:" + p.id)) { award("fin:" + p.id, 0, meIdx()); save(); }
    openChapters(p, true, true);
    return;
  }
  // Position confirmée : le premier macaron « J'y suis ! » est superflu.
  const gpsInPlace = !!pos && distTo(p) <= Math.min(p.r, ZONE_MAX) + Math.min(pos.acc || 0, TOL_MAX);
  if (gpsValid && (gpsInPlace || (LOCAL_DEV && p.chapters))) { showArrivalDirect(p); return; }
  buildMedal({ id, img: pic(id), title: p.name, bubble: `${esc(teaser(p))}<span class="m-q">Es-tu arrivé ?</span>`, label: "J'y suis !", originRect, bind: () => bindArrive(p) });
  if (LOCAL_DEV && p.chapters) {
    const b = document.createElement("button"); b.type = "button"; b.className = "medal-dev-finish"; b.textContent = "🔧 Dev · Aller à la conclusion";
    b.onclick = () => devCompleteChapter(p); $("#sheet").appendChild(b);
  }
  // Épreuve entamée (au moins une question répondue) : le test GPS se fait tout de suite, sans attendre « J'y suis ! ».
  if (inProgress(p)) setTimeout(() => { if (openId === id) tryArrive(p, false); }, 1000);
}
const inProgress = (p) => doneTasks(p) >= 1 && !complete(p);
// Test concluant sur une épreuve entamée : on saute l'introduction et on retourne directement à la question.
const resumeQuest = (p) => { closeSheet(); openQuest(p.id); };
function buildMedal({ id, img, imgPos = "center 42%", title, bubble, label, chatHtml, actions, originRect, bind }) {
  openId = id; chatSel = "#m-chat"; $("#next").hidden = true; $("#bridge-btn").hidden = true;
  const sh = $("#sheet");
  const fromRect = originRect || { left: innerWidth / 2 - 20, top: innerHeight / 2 - 20, width: 40, height: 40 };
  sh.hidden = false; sh.className = "medal-wrap";
  sh.innerHTML = `<button class="m-close" data-x aria-label="Fermer">✕</button>
    <div class="medal" id="medal"><div class="m-img" style="background-image:url(${img});background-position:${imgPos}"></div>
      <svg class="m-ring" viewBox="0 0 100 100" aria-hidden="true"><defs><path id="arcT" d="M 9,50 A 41,41 0 0 1 91,50"/></defs>
        
        <text id="m-name" fill="#fff" font-weight="800" text-anchor="middle" letter-spacing=".4"><textPath href="#arcT" startOffset="50%"></textPath></text></svg></div>
    <div class="m-chat" id="m-chat">${chatHtml ? chatHtml : bubble ? `<div class="msg fc"><span class="m-face" role="img" aria-label="Corto Maltese"></span><div class="m-bubble">${bubble}</div></div>` : ""}</div>
    ${actions ? `<div class="m-reply two">${actions}</div>` : label ? `<div class="m-reply"><button class="m-go" id="arrive"><span>${label}</span></button></div>` : ""}`;
  { const nm = $("#m-name"); nm.setAttribute("font-size", Math.min(7.6, 118 / (title.length * 0.62))); $("textPath", nm).textContent = title; }
  updateMedal();
  $("[data-x]", sh).onclick = closeMedal;
  sh.onclick = (e) => { if (e.target === sh) closeMedal(); };
  bind();
  { // Le macaron rétrécit si la bulle de Corto ne tient pas dans la place restante.
    const c = $("#m-chat"), md = $("#medal"); let size = md.offsetWidth;
    for (let k = 0; k < 14 && c.scrollHeight - c.clientHeight > 2 && size > 180; k++) { size -= Math.max(6, c.scrollHeight - c.clientHeight); md.style.width = size + "px"; }
    if (c.scrollHeight > c.clientHeight) c.scrollTop = c.scrollHeight - c.clientHeight;
  }
  const medal = $("#medal"), r = medal.getBoundingClientRect();
  const dx = fromRect.left + fromRect.width / 2 - (r.left + r.width / 2), dy = fromRect.top + fromRect.height / 2 - (r.top + r.height / 2), s = fromRect.width / r.width;
  medalOrigin = { dx, dy, s };
  sh.animate([{ backgroundColor: "rgba(8,28,38,0)" }, { backgroundColor: "rgba(8,28,38,.78)" }], { duration: 380, fill: "forwards" });
  medal.animate([{ transform: `translate(${dx}px,${dy}px) scale(${s})` }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.9,.25,1.12)" });
  $$(".m-ring", medal).forEach((e) => e.animate([{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: 700 }));
  $$(".m-chat,.m-reply", sh).forEach((e) => e.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 0, transform: "translateY(14px)", offset: 0.5 }, { opacity: 1, transform: "none" }], { duration: 650 }));
}
function updateMedal() {
  const p = place(openId); if (!p) return;
  const d = distTo(p), arr = arrived(p.id);
  const fs = Math.min(7.6, 118 / (p.name.length * 0.62));
  const nm = $("#m-name textPath"); if (!nm) return;
  $("#m-name").setAttribute("font-size", fs); nm.textContent = p.name;
}
function renderSheet() { if (openId) updateMedal(); }
/* ───────── Épreuve en pause : on peut revenir à la carte et retomber exactement sur le même écran (plan déployé, réponse de Corto…) ───────── */
let suspended = null, chapCur = null, destroying = false;
function suspendChap(fromPop) {
  if (openId !== "chap" || !chapCur) return; document.body.classList.remove("chap-open");
  if ($("#sheet.chap .chap-final-msg")) { closeSheet(); return; } // fin achevée : le lieu rouvrira sur son bilan et permettra de rejouer
  suspended = { id: chapCur.id }; openId = null; $("#sheet").hidden = true; stopChapAudio(); scheduleGeoSync();
  if (!fromPop && history.state && history.state.vqBridge) history.back(); // le popstate qui suit ne fait rien : openId est nul
  $("#bridge-btn").hidden = tab !== "map" || !!quest; renderNext();
}
function resumeSuspended() {
  suspended = null; openId = "chap"; chatSel = "#b-talk"; document.body.classList.add("chap-open"); $("#sheet").hidden = false; $("#next").hidden = true; $("#bridge-btn").hidden = true; scheduleGeoSync();
  try { history.pushState({ vqBridge: 1 }, ""); } catch {}
}
function closeSheet() {
  conclusionEditorAbort?.abort(); conclusionEditorAbort = null;
  document.body.classList.remove("chap-open"); suspended = null; stopMusic(500); stopChapAudio(); closeLoc();
  if ((openId === "bridges" || openId === "chap") && history.state && history.state.vqBridge) { destroying = true; history.back(); return; } // popstate rappellera closeSheet
  document.body.classList.remove("bridge-open");
  openId = null; const sh = $("#sheet"); sh.hidden = true; sh.onclick = null; sh.innerHTML = ""; $("#bridge-btn").hidden = tab !== "map" || !!quest; renderNext(); scheduleGeoSync(); }
function closeMedal() {
  const sh = $("#sheet"), medal = $("#medal"); if (!medal || !medalOrigin) { closeSheet(); return; }
  const { dx, dy, s } = medalOrigin; medalOrigin = null;
  sh.animate([{ backgroundColor: "rgba(8,28,38,.78)" }, { backgroundColor: "rgba(8,28,38,0)" }], { duration: 300, fill: "forwards" });
  medal.animate([{ transform: "none" }, { transform: `translate(${dx}px,${dy}px) scale(${s})` }], { duration: 320, easing: "ease-in", fill: "forwards" }).onfinish = closeSheet;
  $$(".m-chat,.m-reply,.m-ring,.m-close", sh).forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }));
}
let holdT;
const teaser = (p) => p.teaser || (p.story.split(/(?<=[.!?])\s/)[0] || p.story);
const walk = (m) => Math.max(1, Math.round((m * 1.3) / 75));
const FAKE = DEV ? QS.get("fake") : null;
// Relevé GPS sur 5 s : on moyenne les mesures (pondérées par leur précision) pour que le GPS se stabilise.
function getFix(ms = 4000) {
  if (FAKE || devPinned) return Promise.resolve(!!pos);
  return new Promise((res) => {
    if (!navigator.geolocation) { res(false); return; }
    const S = []; let id, tm;
    const done = () => {
      navigator.geolocation.clearWatch(id); clearTimeout(tm);
      if (!S.length) { res(false); return; }
      const good = S.filter((c) => c.accuracy <= 100), use = good.length ? good : S;
      let sw = 0, la = 0, lo = 0, minA = Infinity;
      for (const c of use) { const w = 1 / Math.max(c.accuracy, 5) ** 2; sw += w; la += c.latitude * w; lo += c.longitude * w; minA = Math.min(minA, c.accuracy); }
      onPos(la / sw, lo / sw, Math.max(Math.sqrt(1 / sw), 0.6 * minA));
      res(true);
    };
    tm = setTimeout(done, ms);
    id = navigator.geolocation.watchPosition((e) => S.push(e.coords), (err) => { if (err && err.code === 1) done(); }, { enableHighAccuracy: true, maximumAge: 0, timeout: ms }); // localisation refusée : inutile d'attendre
  });
}
const fixIsReal = () => !(FAKE || devPinned);
// Contrôle GPS : zone stricte (80 m max) + petite tolérance liée à la précision (30 m max).
// Sortie de secours : maintenir « J'y suis » 2 secondes.
const ZONE_MAX = 80, TOL_MAX = 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const minTxt = (m) => { const n = walk(m); if (n <= 1) return "environ 1 minute"; if (n < 90) return `environ ${n} minutes`; const h = Math.floor(n / 60), r = Math.round((n % 60) / 10) * 10; return `environ ${h} h${r ? " " + String(r).padStart(2, "0") : ""}`; };
function chatAdd(html, cls) {
  const c = $(chatSel); if (!c) return null;
  const d = document.createElement("div"); d.className = "msg " + cls; d.innerHTML = html; c.appendChild(d);
  d.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 260 });
  return d;
}
// Les anciens messages montent (derrière le macaron) et disparaissent ; le « J'y suis ! » prend leur place.
function slideUp(old, mine) {
  return new Promise((res) => {
    if (!old.length) { res(); return; }
    const shift = mine.offsetTop - old[0].offsetTop, els = [...old, mine]; let n = 0;
    els.forEach((e) => {
      const a = e.animate([{ transform: "none" }, { transform: `translateY(${-shift}px)` }], { duration: 520, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
      a.onfinish = () => { if (++n === els.length) { old.forEach((o) => o.remove()); mine.getAnimations().forEach((x) => x.cancel()); res(); } };
    });
  });
}
const typingHtml = '<span class="m-face"></span><div class="m-bubble typing"><i></i><i></i><i></i></div>';
function cortoType(el) { const b = el && $(".m-bubble", el); if (b) { b.classList.add("typing"); b.innerHTML = "<i></i><i></i><i></i>"; } }
const richText = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); // **mot** → gras
// Dans l'espace personnel, la pastille de Corto disparaît : Corto reste affiché en bas, comme dans ses conversations sur la carte (texte à gauche, Corto à droite), avec un message propre à chaque onglet. Texte affiché d'un coup, sans machine à écrire.
function menuSay(text) {
  let m = $("#menu-say");
  if (!m) { m = document.createElement("div"); m.id = "menu-say"; m.className = "doge-msg menu-say"; m.innerHTML = '<div class="dm-txt"></div><img class="dm-corto" src="img/corto-content.webp" alt="">'; document.body.appendChild(m); }
  $(".dm-txt", m).innerHTML = richText(text); m.hidden = tab === "map";
  // la bande de Corto est opaque pour le contenu : les onglets s'arrêtent à son bord haut (rien ne défile derrière le texte), sa hauteur suit la longueur du message
  const th = $(".dm-txt", m).offsetHeight, H = Math.max(190, Math.round(th + 92 + 14)); document.documentElement.style.setProperty("--bandh", H + "px"); m.style.height = `calc(${H}px + var(--safe-b))`;
}
function cortoFill(el, text) { const b = el && $(".m-bubble", el); if (b) { b.classList.remove("typing"); b.innerHTML = richText(text); if (el.closest("#sheet.chap")) fitChapTalk(); if (chatSel !== "#b-talk") { const c = $(chatSel); if (c && c.scrollHeight > c.clientHeight) c.scrollTop = c.scrollHeight - c.clientHeight; } } }
let busy = false;
function enterPlace(p) { if (arrived(p.id)) { closeSheet(); openQuest(p.id); } else doArrive(p); }
// Répliques de Corto : plusieurs variantes par situation, qui tiennent compte du grade du joueur.
// {g} = grade, {dist} = distance, {min} = durée de marche, {place} = nom du lieu. lo/hi : bornes de rang (0 = simple touriste).
const LINES = {
  wait: [
    "Attends quelques secondes, {g}, je vérifie où tu es…", "Ne bouge pas, {g} : je te repère…", "Un instant, je regarde par la longue-vue…", "Deux secondes… je cherche ta position exacte.",
  ],
  bridgeNew: [
    "Bravo, {g} ! Tu as franchi {bridge}. Ton {nth} pont !", "Je te vois ! {bridge} : validé. Ça fait {npl}, {g} !", "Un pont de plus au compteur : {bridge}. Ton {nth} !",
    "Voilà : {bridge}. Tu es sur la bonne voie, {g} ! ({npl})", { lo: 3, t: "Un {g} sait franchir les ponts. {bridge} : validé, ton {nth}." }, { hi: 1, t: "Super, {g} ! Tu as passé {bridge}. Déjà {npl} !" },
  ],
  bridgeDone: [
    "Eh bien alors, {g}, tes parents ont bu trop de spritz ? On a déjà validé {bridge} !", "Tu vois double, {g} ? {bridge}, c'est déjà fait. Qu'est-ce qui se passe ?",
    "La journée a été dure, {g} ? {bridge}, on l'a déjà noté. Il est peut-être l'heure de rentrer à la maison !", "Tu tournes en rond, {g} ? {bridge} : déjà validé !",
    "Encore {bridge} ? Tu es fatigué, {g} ? Un petit repos ne te ferait pas de mal.", "Déjà vu ! {bridge}, on l'a fait. Tu as la tête dans la lagune, {g} ?",
    "Pas deux fois le même pont, {g} ! Tu es sûr que tu n'as pas le mal de mer ?",
  ],
  bridgeNewAnon: [
    "Bravo, {g} ! Tu as trouvé un pont. Je ne connais pas son nom… Regarde si tu peux le lire quelque part.", "Un pont de plus, {g} : ton {nth} ! Mais celui-là, je ne le connais pas. Cherche son nom autour de toi.",
    "Bravo ! Tu as franchi un pont dont je ne sais pas le nom. Regarde bien : tu le trouveras peut-être sur un mur ou une plaque.",
  ],
  bridgeDoneAnon: [
    "Tu vois double, {g} ? Ce pont, on l'a déjà noté. Je ne connais toujours pas son nom…", "Eh bien alors, {g}, on tourne en rond ? Ce pont-là est déjà validé !",
    "La journée a été dure, {g} ? On a déjà noté ce pont. Allez, un autre !", "Déjà vu ! Ce pont sans nom, on l'a fait. Tu as la tête dans la lagune ?",
  ],
  bridgeNone: [
    "Je ne vois aucun pont près de toi, {g}. Le plus proche, c'est {bridge}, à {dist}.", "Pas de pont par ici… {bridge} est à {dist}.", "Tu es sûr, {g} ? Le pont le plus proche ({bridge}) est à {dist}.",
  ],
  success: [
    "Ah, je te vois ! Bienvenue : {place}.", "Te voilà, {g} ! Je t'attendais.", "Parfait, {g} ! Tu es bien arrivé.", "Ancre jetée ! Bravo, {g}.",
    "Je te vois ! Entre, {g}.", "Pile à l'heure, {g}. {place} t'attend.",
    { lo: 3, t: "Un {g} qui arrive au bon endroit : rien d'étonnant. Entre." }, { hi: 1, t: "Bravo, {g} ! Tu as trouvé tout seul comme un grand." },
  ],
  forced: [
    "Le GPS fait des caprices ? Je te fais confiance, {g}, entre !", "Ton GPS déraille ? Passe, {g}, je te crois sur parole.", "Les satellites dorment ? Je te crois. Entre !",
    { lo: 3, t: "Un {g} ne ment jamais. Entre." },
  ],
  nogps: [
    "Je ne te vois pas du tout… Active la localisation de ton téléphone, {g}.", "Brouillard complet ! Active ta localisation, {g}, que je te retrouve.", "Impossible de te situer. La localisation, {g} : il me la faut.",
  ],
  near: [
    "Je te vois presque, {g} ! Plus que {dist}. Avance encore un peu.", "Tu chauffes ! {dist} seulement, {g}.", "Je distingue ta silhouette… {dist} à peine !",
    "Encore {dist}, {g}. Garde le cap !",
  ],
  mid: [
    "Je ne te vois pas, {g}… Je crois que tu es encore à {dist}. Il te reste {min} pour arriver.", "Pas encore, {g} ! Il te reste {dist}, soit {min}.", "Le vent ne te porte pas encore jusqu'ici… {dist}, soit {min}.",
    "Je scrute l'horizon… rien. Tu es à {dist}, {min} de route.", "Courage, {g}. {dist} à faire, {min} de marche. Je t'attends.", "Hmm, pas de {g} en vue. Encore {dist} ({min}).",
    { hi: 1, t: "Allez, {g} ! Un pas après l'autre : {dist} à parcourir." }, { lo: 3, t: "Voyons, {g}, ça ne te ressemble pas d'être en retard. {dist} à parcourir." },
  ],
  far: [
    "Eh, {g}, tu es encore loin ! {dist}, soit {min}. Prends le bateau-bus peut-être ?", "Tu es en pleine mer, {g} ! {dist} avant de toucher terre ({min}).", "Je ne te vois même pas à la longue-vue. {dist} à faire, {min}.",
    "Un long voyage t'attend : {dist}, {min} de marche. Mets un pied devant l'autre !",
  ],
};
const lastLine = {};
function say(kind, p, extra = {}) {
  const idx = level(pointsOf(meIdx())), g = LEVELS[idx].name.toLowerCase();
  const pool = LINES[kind].filter((l) => typeof l === "string" || ((l.lo == null || idx >= l.lo) && (l.hi == null || idx <= l.hi)));
  const rec = lastLine[kind] = lastLine[kind] || [];
  let i; do { i = Math.floor(Math.random() * pool.length); } while (pool.length > 2 && rec.includes(i));
  rec.push(i); if (rec.length > 2) rec.shift();
  const l = pool[i], t = typeof l === "string" ? l : l.t, d = extra.dist ?? (pos && p ? distTo(p) : null);
  return t.replace(/\{g\}/g, g).replace(/\{bridge\}/g, extra.bridge || "").replace(/\{n\}/g, extra.n || "").replace(/\{npl\}/g, extra.n ? extra.n + (extra.n > 1 ? " ponts" : " pont") : "").replace(/\{nth\}/g, extra.n ? nth(extra.n) : "").replace(/\{place\}/g, p ? p.name : "").replace(/\{dist\}/g, d != null ? fmtD(d) : "").replace(/\{min\}/g, d != null ? minTxt(d) : "");
}
/* ───────── Ponts : « Je suis sur un pont ! » ───────── */
let chatSel = "#m-chat";
function openBridges() {
  if (busy || openId || tab !== "map") return;
  if (suspended) closeSheet();
  tryBridge();
}
addEventListener("popstate", () => {
  if (viewClose) { viewClose(); return; } if (montClose) { montClose(); return; }
  if (menuReturnPending) {
    menuReturnPending = false;
    // Si le joueur a rouvert le menu avant que history.back() se termine,
    // conserver ce dernier choix et rétablir son entrée d'historique.
    if (tab !== "map") { try { history.pushState({ vqMenu: 1 }, ""); } catch {} }
    return;
  }
  if (tab !== "map") { menuOpen = false; setTab("map"); return; }
  if (openId === "chap" && !destroying) { suspendChap(true); return; }
  if (openId === "bridges" || openId === "chap") { destroying = false; closeSheet(); }
});
// Anecdotes vérifiées sur les ponts (data/facts.json) : chaque anecdote a sa devinette (q) et sa réponse (t).
let FACTS = null;
const factsReady = fetch("data/facts.json").then((r) => r.json()).then((j) => (FACTS = j)).catch(() => {});
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const gradeLc = () => LEVELS[level(pointsOf(meIdx()))].name.toLowerCase();
const shuffle = (arr) => arr.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
let curLoop = 0; // une seule boucle d'épreuve vivante à la fois (évite les doublons si on touche « J'y suis ! » pendant la reprise automatique)
const bsleep = async (ms) => { await sleep(ms); if (openId !== "bridges" && openId !== "chap" && !suspended) throw 0; };
// Fait remonter un message en haut de la zone de conversation : les anciens messages passent au-dessus (on peut encore les relire en défilant).
// Photo de révélation : la plus grande possible dans l'espace libre (de la marge haute jusqu'au bord de la bande de Corto), sans déformation ; ses bords se fondent dans l'image de fond.
const SAFE_T = () => { if (SAFE_T.v == null) { const p = document.createElement("div"); p.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;padding-top:var(--safe-t)"; document.body.appendChild(p); SAFE_T.v = p.offsetHeight; p.remove(); } return SAFE_T.v; };
function fitRevImg(im) {
  const sh = $("#sheet"); if (!sh || !im.naturalWidth) return;
  const cq = parseFloat(sh.style.getPropertyValue("--cqh")) || 150, top = SAFE_T() + 8, H = Math.max(120, sh.clientHeight - cq - top + 6), W = sh.clientWidth, r = im.naturalWidth / im.naturalHeight, w = Math.min(W, H * r);
  im.style.width = Math.round(w) + "px"; im.style.height = Math.round(w / r) + "px";
}
// Le texte de l'épreuve grandit autant que possible ; son bord bas reste au-dessus de la tête de Corto.
function fitChapTalk() {
  const sh = $("#sheet.chap"), bt = sh && $("#b-talk", sh);
  if (!bt || !$(".m-bubble:not(.typing)", bt)) return;
  const conclusion = sh.classList.contains("chap-conclusion");
  const limit = sh.clientHeight - SAFE_T() - (conclusion && chapCur && chapCur.plan ? 128 : 72); // place libre pour le bouton du plan
  bt.style.setProperty("--cqfix", "auto");
  const start = conclusion ? Math.min(22, Math.max(18, sh.clientWidth * .05)) : Math.min(24, Math.max(18, sh.clientWidth * .06));
  for (let size = start; size >= (conclusion ? 15 : 12); size -= .5) {
    bt.style.setProperty("--cqfont", size + "px");
    if (bt.offsetHeight <= limit) break;
  }
  sh.style.setProperty("--cqh", bt.offsetHeight + "px");
  $$(".rev-img", sh).forEach(fitRevImg);
}
window.addEventListener("resize", () => { if ($("#sheet.chap")) fitChapTalk(); });
// Les bulles gardent la hauteur de leur texte. Quand la conversation devient plus longue que la place disponible, elle défile
// pour que le dernier message descende jusqu'en bas (au-dessus des boutons s'il y en a), avec une petite respiration.
const SAFE_B = () => { if (SAFE_B.v == null) { const p = document.createElement("div"); p.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;padding-bottom:var(--safe-b)"; document.body.appendChild(p); SAFE_B.v = p.offsetHeight; p.remove(); } return SAFE_B.v; };
// Hauteur estimée de la rangée de pastilles de réponse (elles se placent côte à côte, sur une ligne si possible).
const barHeight = (texts) => {
  const W = Math.min(360, innerWidth - 32); let rows = 1, x = 0;
  texts.forEach((t) => { const w = Math.min(W, Math.ceil(t.length * 8.4) + 34); if (x && x + 8 + w > W) { rows++; x = w; } else x += (x ? 8 : 0) + w; });
  return rows * 44 + (rows - 1) * 8;
};
const bFill = (el, pad) => {
  const c = $("#b-talk"); if (!c || !el) return;
  const sh = $("#sheet"), barH = typeof pad === "number" ? pad : 0;
  if (barH) { sh.style.setProperty("--bar", barH + "px"); sh.dataset.k = "bar"; } else sh.dataset.k = "one";
  const reserve = (barH ? barH + 28 : 84) + SAFE_B() + (openId === "chap" ? 24 : 0); // dans une épreuve, le dock du coin bas gauche garde sa place
  const cr = c.getBoundingClientRect(), bottom = el.getBoundingClientRect().bottom - cr.top + c.scrollTop;
  c.scrollTo({ top: Math.max(0, bottom - (c.clientHeight - reserve - 12)), behavior: "smooth" });
};
// Choix multiples : une mauvaise réponse fait « bzzt » et se grise, l'enfant en essaie une autre. Pas d'étoiles s'il s'est trompé avant.
// Bonne réponse du premier coup : les étoiles gagnées sortent du bouton, tournoient, puis quittent l'écran par le haut.
// Étoiles gagnées : elles jaillissent puis filent vers le compteur du coin ; chaque arrivée fait vibrer et briller l'étoile du compteur, et le nombre s'incrémente en direct.
// counted = true si le compteur affiche déjà ces points (on le remet d'abord en arrière pour le refaire grimper).
const STAR_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2.8l2.75 5.8 6.35.85-4.65 4.4 1.15 6.3L12 17l-5.6 3.15 1.15-6.3L2.9 9.45l6.35-.85z" fill="#F2B51C" stroke="#F2B51C" stroke-width="1.4" stroke-linejoin="round"/></svg>';
if (DEV) window.__stars = (n) => starsToCounter(innerWidth / 2, innerHeight * 0.6, n, false);
function starBurst(el, n, counted = false) { const r = el.getBoundingClientRect(); starsToCounter(r.left + r.width / 2, r.top + r.height / 2, n, counted); }
function starsToCounter(cx, cy, n, counted = false) {
  const box = $("#hud-score"), sc = $(".sc-n", box), num = $("b", sc), svg = $("svg", sc); if (!sc) return;
  const N = Math.max(1, Math.min(n, 14)), per = n / N;
  if (!scoreAnim) scoreAnim = { shown: parseFloat(num.textContent) || 0, left: 0 };
  if (counted) { scoreAnim.shown = Math.max(0, scoreAnim.shown - n); num.textContent = Math.round(scoreAnim.shown); }
  scoreAnim.left += N; sc.classList.add("rx"); box.classList.add("rx");
  const t = svg.getBoundingClientRect(), tx = t.left + t.width / 2, ty = t.top + t.height / 2, sz = 30;
  for (let i = 0; i < N; i++) {
    const s = document.createElement("div"); s.className = "fly-star"; s.innerHTML = STAR_SVG; s.style.cssText = `left:${cx - sz / 2}px;top:${cy - sz / 2}px;width:${sz}px;height:${sz}px`; document.body.appendChild(s);
    const a0 = (i / N) * Math.PI * 2 + Math.random() * 0.4, R = 46 + (i % 3) * 18, dx = tx - cx, dy = ty - cy, bx = Math.cos(a0) * R, by = Math.sin(a0) * R;
    s.animate([
      { transform: "translate(0,0) scale(.3) rotate(0deg)", opacity: 0 },
      { transform: `translate(${bx}px,${by}px) scale(1.15) rotate(120deg)`, opacity: 1, offset: 0.28 },
      { transform: `translate(${bx + (dx - bx) * 0.55}px,${by + (dy - by) * 0.55 - 30}px) scale(1) rotate(300deg)`, opacity: 1, offset: 0.65 },
      { transform: `translate(${dx}px,${dy}px) scale(.55) rotate(480deg)`, opacity: 1 },
    ], { duration: 1000, delay: 120 + i * 85, easing: "cubic-bezier(.45,0,.35,1)", fill: "both" }).finished.then(() => {
      s.remove(); scoreAnim.shown += per; num.textContent = Math.round(scoreAnim.shown);
      svg.animate([{ transform: "scale(1) rotate(0)", filter: "brightness(1)" }, { transform: "scale(1.5) rotate(-16deg)", filter: "brightness(1.5) drop-shadow(0 0 10px #ffd34d)", offset: 0.3 }, { transform: "scale(1.25) rotate(12deg)", offset: 0.6 }, { transform: "scale(1) rotate(0)", filter: "brightness(1)" }], { duration: 300 });
      num.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)", color: "#b07a00", offset: 0.35 }, { transform: "scale(1)" }], { duration: 300 });
      const ring = document.createElement("i"); ring.className = "sc-ring"; ring.style.cssText = `left:${tx}px;top:${ty}px`; document.body.appendChild(ring);
      ring.animate([{ transform: "translate(-50%,-50%) scale(.4)", opacity: 0.9 }, { transform: "translate(-50%,-50%) scale(2.6)", opacity: 0 }], { duration: 520, easing: "ease-out" }).finished.then(() => ring.remove());
      if (--scoreAnim.left <= 0) { // dernière étoile : l'étoile du compteur rayonne, puis le vrai total est affiché
        sc.classList.remove("rx"); box.classList.remove("rx"); scoreAnim = null; renderHud();
        for (let k = 0; k < 8; k++) { const sp = document.createElement("i"); sp.className = "sc-spark"; sp.style.cssText = `left:${tx}px;top:${ty}px`; document.body.appendChild(sp); const an = (k / 8) * Math.PI * 2; sp.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(an) * 34 - 4}px,${Math.sin(an) * 34 - 4}px) scale(.2)`, opacity: 0 }], { duration: 700, easing: "ease-out" }).finished.then(() => sp.remove()); }
        const nb = $("#hud-score .sc-n svg"); if (nb) nb.animate([{ filter: "drop-shadow(0 0 0 #ffd34d)" }, { filter: "drop-shadow(0 0 14px #ffd34d) brightness(1.4)" }, { filter: "drop-shadow(0 0 0 #ffd34d)" }], { duration: 900 });
      }
    });
  }
}
function bridgeChoose(ch, stars = 0, centerFrom = null) {
  return new Promise((res) => {
    const bar = $("#b-actions"); if (!bar) return; skipEnd = () => res({ skip: true });
    bar.innerHTML = ch.map((x, i) => `<button class="b-btn choice" data-k="${i}">${x.t}</button>`).join("");
    bar.className = "b-actions stack"; bar.hidden = false;
    const sh = $("#sheet"); sh.dataset.k = "bar"; sh.style.setProperty("--bar", bar.offsetHeight + "px");
    // Sans image associée à la question : les propositions sont centrées entre la bulle de Corto et le bas de l'écran
    if (centerFrom != null) { const H = sh.clientHeight, bh = bar.offsetHeight, top0 = centerFrom + 10, free = H - top0 - 96 - SAFE_B(); bar.style.bottom = "auto"; bar.style.top = Math.max(top0, top0 + (free - bh) / 2) + "px"; }
    bar.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,.9,.25,1.1)" });
    let wrong = 0;
    $$("button", bar).forEach((b) => (b.onclick = () => {
      const c = ch[+b.dataset.k];
      if (c.ok) { $$("button", bar).forEach((x) => (x.disabled = true)); b.classList.add("right"); if (stars && wrong === 0) starBurst(b, stars); b.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)", offset: .35 }, { transform: "scale(1)" }], { duration: 520, easing: "ease-out" }); setTimeout(() => { bar.hidden = true; bar.innerHTML = ""; bar.style.top = bar.style.bottom = ""; delete sh.dataset.k; res({ first: wrong === 0, t: c.t }); }, 700); return; }
      wrong++; buzz(); b.classList.add("wrong"); b.disabled = true;
      b.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-5px)" }, { transform: "none" }], { duration: 320 });
    }));
  });
}
// Le prochain défi remet la conversation à zéro.
async function clearTalk() {
  const c = $("#b-talk"); if (!c) return;
  $$("#sheet > .aud").forEach((e) => e.remove());
  $$(".rev-img,.rev-cap").forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" }).finished.then(() => e.remove()));
  await Promise.all([...c.children].map((m) => m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" }).finished));
  c.innerHTML = ""; c.scrollTop = 0;
}
// Le panneau des ponts n'est créé qu'après une correspondance GPS. Le décor reste net en haut,
// puis se fond dans le lavis sombre du QCM, comme dans une épreuve de lieu.
function openBridgeCeremony(b, intro) {
  const sh = $("#sheet"), list = (FACTS && FACTS.bridges[String(b[0])]) || [];
  const order = shuffle(list.map((_, i) => i).filter((i) => !has(`z:${b[0]}:${i}`)));
  const genericImage = !b[1] || !b[3];
  const image = genericImage ? "img/ponts/_generic.webp" : `img/ponts/${b[0]}.webp`;
  openId = "bridges"; $("#next").hidden = true; $("#bridge-btn").hidden = true; document.body.classList.add("bridge-open");
  sh.getAnimations().forEach((animation) => animation.cancel()); sh.style.backgroundColor = "";
  sh.hidden = false; sh.className = "bridge-ceremony bridge-thinking"; sh.onclick = null;
  sh.innerHTML = `<img class="bridge-hero" src="${image}" alt="${esc(genericImage ? "Illustration d’un pont de Venise" : `Photo de ${b[1]}`)}"><div class="bridge-shade"></div><div class="bridge-sparks" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div><div class="bridge-claim msg mine"><div class="m-bubble mine">Je suis sur un pont !<span class="bridge-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></div><span class="m-av">${profileHtml()}</span></div><h2 class="bridge-name">${esc(b[1] || "Pont sans nom")}</h2><div class="bridge-stage"><div class="bridge-answers" hidden></div><div class="bridge-corto"><p class="bridge-words" aria-live="polite"></p><img src="img/corto-content.webp" alt="" aria-hidden="true"></div></div><button type="button" class="bridge-next" hidden></button>`;
  const hero = $(".bridge-hero", sh), claim = $(".bridge-claim", sh), answers = $(".bridge-answers", sh), words = $(".bridge-words", sh), next = $(".bridge-next", sh);
  hero.onerror = () => {
    if (!hero.src.endsWith("/_generic.webp")) hero.src = "img/ponts/_generic.webp";
    else { hero.remove(); $(".bridge-sparks", sh)?.remove(); }
  };
  try { history.pushState({ vqBridge: 1 }, ""); } catch {}
  const alive = () => openId === "bridges" && !sh.hidden && sh.contains(claim);
  let cursor = 0, serial = 0;
  const showQuestion = () => {
    if (!alive()) return;
    sh.onclick = null;
    const current = ++serial, index = order[cursor], fact = list[index];
    answers.hidden = false; next.hidden = true;
    words.textContent = fact.q;
    const choices = shuffle(fact.c.map((text, i) => ({ text, correct: i === 0 })));
    answers.innerHTML = choices.map((choice, i) => `<button type="button" data-choice="${i}">${esc(choice.text)}</button>`).join("");
    let answered = false;
    $$("button", answers).forEach((button) => button.onclick = () => {
      if (answered) return;
      const choice = choices[Number(button.dataset.choice)];
      if (!choice.correct) { button.disabled = true; button.classList.add("wrong"); buzz(); return; }
      const first = !$(".bridge-answers .wrong", sh);
      answered = true; $$("button", answers).forEach((item) => item.disabled = true);
      award(`z:${b[0]}:${index}`, first ? POINTS.quiz : 0, meIdx()); save(); refreshAll();
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => { if (!alive() || serial !== current) return; button.classList.add("right"); if (first) { starBurst(button, POINTS.quiz, true); confetti(30); } }, reduced ? 0 : 380);
      setTimeout(() => { if (!alive() || serial !== current) return; words.innerHTML = richText(fact.t); }, reduced ? 0 : 900);
      setTimeout(() => {
        if (!alive() || serial !== current) return;
        if (cursor < order.length - 1) {
          next.textContent = "Question suivante"; next.hidden = false;
          next.onclick = () => { cursor++; showQuestion(); };
        } else sh.onclick = closeSheet;
      }, reduced ? 0 : 1500);
    });
  };
  words.innerHTML = richText(intro);
  const summary = FACTS?.summary?.[String(b[0])];
  if (!order.length && summary) words.innerHTML += " " + richText(summary);
  const readingDelay = Math.min(7000, Math.max(4400, intro.length * 52));
  setTimeout(() => {
    if (!alive()) return;
    sh.classList.remove("bridge-thinking"); sh.classList.add("bridge-revealed");
    if (order.length) setTimeout(showQuestion, readingDelay);
    else sh.onclick = closeSheet;
  }, 1300);
}
function startBridgeLoading(btn) {
  if (!btn) return () => {};
  btn.disabled = true; btn.classList.add("bridge-loading"); btn.setAttribute("aria-busy", "true");
  const icon = $("img", btn);
  let frame;
  if (icon && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const startedAt = performance.now();
    const spin = (now) => {
      const seconds = (now - startedAt) / 1000;
      icon.style.transform = `rotate(${(70 * seconds + 30 * seconds * seconds) % 360}deg)`;
      frame = requestAnimationFrame(spin);
    };
    frame = requestAnimationFrame(spin);
  }
  return () => {
    if (frame != null) cancelAnimationFrame(frame);
    if (icon) icon.style.transform = "";
    btn.disabled = false; btn.classList.remove("bridge-loading"); btn.removeAttribute("aria-busy");
  };
}
async function tryBridge() {
  if (!DEV && !geoReady) { showGeoGate(); return; }
  if (busy) return; busy = true;
  const btn = $("#bridge-btn");
  const startedAt = performance.now(), stopLoading = startBridgeLoading(btn);
  try {
    // Position posée à la main (mode dev) ou sans GPS : aucune attente. Avec un vrai GPS : 4 secondes de moyenne des relevés.
    const manual = !fixIsReal();
    const ok = manual ? !!pos : await getFix(4000);
    await Promise.all([bridgesReady, factsReady]);
    await sleep(Math.max(0, 6000 - (performance.now() - startedAt)));
    if (tab !== "map" || openId) return;
    if (!ok || !pos || !BRIDGES?.length) { cortoSays(say("nogps", null)); return; }
    // On ne retient que le pont le plus proche (sauf égalité à 4 m près, où l'on préfère un pont pas encore validé),
    // s'il est à moins de 10 m + la précision du GPS (15 m au plus).
    const thr = 10 + Math.min(pos.acc || 0, 15);
    const ds = BRIDGES.map((b) => [b, Math.min(...b[2].map((q) => dist(pos.lat, pos.lon, q[0], q[1])))]).sort((x, y) => x[1] - y[1]);
    const tie = ds.filter((x) => x[1] <= ds[0][1] + 4), best = tie.find((x) => !has("b:" + x[0][0])) || ds[0];
    const inRange = best[1] <= thr ? [best] : [], fresh = inRange.length && !has("b:" + best[0][0]) ? best : null;
    if (fresh) {
      const b = fresh[0]; award("b:" + b[0], POINTS.bridge, meIdx()); save(); chime(); confetti(50); refreshAll();
      openBridgeCeremony(b, say(b[1] ? "bridgeNew" : "bridgeNewAnon", null, { bridge: bridgeName(b), n: bridgeCount() }));
    } else if (inRange.length) {
      const b = inRange[0][0]; openBridgeCeremony(b, say(b[1] ? "bridgeDone" : "bridgeDoneAnon", null, { bridge: bridgeName(b) }));
    } else cortoSays(say("bridgeNone", null, { bridge: bridgeName(ds[0][0]), dist: ds[0][1] }));
  } catch (e) {
    console.error("Pont : localisation impossible", e);
    await sleep(Math.max(0, 6000 - (performance.now() - startedAt)));
    cortoSays("Je n’arrive pas à retrouver ce pont pour l’instant. Réessaie dans un moment.");
  }
  finally {
    busy = false;
    stopLoading();
  }
}
function bindArrive(p) {
  const btn = $("#arrive"); let h, fired = false;
  if (DEV) btn.onpointerdown = () => { fired = false; btn.classList.add("holding"); h = setTimeout(() => { fired = true; btn.classList.remove("holding"); tryArrive(p, true); }, 2000); };
  const cancel = () => { clearTimeout(h); btn.classList.remove("holding"); };
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, cancel));
  btn.onclick = () => { if (fired) { fired = false; return; } tryArrive(p, false); };
}
async function tryArrive(p, forced) {
  if (busy) return; busy = true;
  const devFinish = $(".medal-dev-finish"); if (devFinish) devFinish.remove();
  primeMusic(p);
  const btn = $("#arrive"); btn.disabled = true;
  const c = $("#m-chat"), old = [...c.querySelectorAll(".msg")];
  c.scrollTop = 0;
  const mine = chatAdd(`<div class="m-bubble mine">J'y suis !</div><span class="m-av">${me().avatar}</span>`, "mine");
  await slideUp(old, mine);
  const t = chatAdd(typingHtml, "fc");
  if (DEV && !forced) { await sleep(500); cortoFill(t, say("success", p)); await sleep(700); busy = false; await (inProgress(p) ? resumeQuest(p) : arrivalReveal(p)); return; } // mode dev : « J'y suis ! » marche toujours, sans test GPS
  if (forced && DEV) { await sleep(900); cortoFill(t, say("forced", p)); await sleep(900); busy = false; await (inProgress(p) ? resumeQuest(p) : arrivalReveal(p)); return; }
  let ok = true;
  if (fixIsReal()) { await sleep(700); cortoFill(t, say("wait", p)); ok = await getFix(); cortoType(t); await sleep(700); }
  else { await sleep(700); }
  if (!ok || !pos) { cortoFill(t, say("nogps", p)); }
  else {
    const d = distTo(p);
    if (d <= Math.min(p.r, ZONE_MAX) + Math.min(pos.acc || 0, TOL_MAX)) { cortoFill(t, say("success", p)); await sleep(900); busy = false; await (inProgress(p) ? resumeQuest(p) : arrivalReveal(p)); return; }
    cortoFill(t, say(d < 200 ? "near" : d > 1500 ? "far" : "mid", p));
  }
  busy = false; btn.disabled = false;
}
function near(p) { const d = distTo(p); return d != null && d - Math.min(pos.acc || 0, 40) <= p.r + 60; }
const counters = {}, checks = {}, pendingPhoto = {};
function taskHtml(p, t, i) {
  const done = taskDone(p.id, i);
  const head = `<div class="task ${done ? "done" : ""}" data-i="${i}"><div class="q">${done ? "✅ " : ""}${esc(t.q)}</div>`;
  if (done) return head + (t.fact ? `<div class="fact">💡 ${esc(t.fact)}</div>` : "") + (t.t === "photo" ? `<img class="thumb" data-k="${p.id}:${i}" alt="">` : "") + "</div>";
  const k0 = p.id + i;
  if (t.t === "photo") return head + (t.hint ? `<p class="muted" style="margin-bottom:8px">${esc(t.hint)}</p>` : "") + (pendingPhoto[k0]
    ? `<p class="muted">📍 Je ne te vois pas tout près du lieu. Photo gardée ! Un parent peut valider.</p><button class="btn wide" data-hold>✅ Valider (parent : maintenir 2 s)</button>`
    : `<label class="btn blue wide">📷 Prendre la photo<input type="file" accept="image/*" capture="environment" hidden data-file></label>`) + "</div>";
  if (t.t === "checklist") { checks[k0] = checks[k0] || t.items.map(() => false); return head + t.items.map((it, j) => `<label class="chk"><input type="checkbox" data-j="${j}" ${checks[k0][j] ? "checked" : ""}> <span>${esc(it)}</span></label>`).join("") + `<button class="btn blue wide" data-ok style="margin-top:8px">Valider</button></div>`; }
  if (t.t === "choice") return head + `<div class="opts">${t.opts.map((o, j) => `<button class="opt" data-j="${j}">${esc(o)}</button>`).join("")}</div></div>`;
  if (t.t === "count") { const k = p.id + i; counters[k] = counters[k] ?? 0; return head + `<div class="stepper"><button data-m>−</button><output>${counters[k]}</output><button data-p>+</button></div><button class="btn blue wide" data-ok>Valider</button></div>`; }
  if (t.t === "word") {
    const left = FINALE_AT - visited();
    return head + (left <= 0 ? `<div class="tiles"><input id="word" maxlength="7" autocomplete="off" autocapitalize="characters" placeholder="_ _ _ _ _ _ _"></div><button class="btn blue wide" data-ok>🗝️ Ouvrir la porte</button><p class="muted" style="margin-top:6px">Indice : le vrai nom de Venise, en italien (7 lettres).</p>` :
      `<p class="muted">La porte est encore fermée. Explore encore ${left} lieu${left > 1 ? "x" : ""} de Venise pour que Corto te la montre !</p>`) + `</div>`;
  }
  return head + `<button class="btn blue wide" data-ok>C'est fait ! ✅</button></div>`;
}
function bindTasks(p, sh, after = () => renderSheet(), redraw = () => renderSheet()) {
  $$(".task[data-i]", sh).forEach((el) => {
    const i = +el.dataset.i, t = p.tasks[i];
    if (taskDone(p.id, i)) return;
    const win = (extra) => { const pt = t.pts ?? POINTS.task; award(`t:${p.id}:${i}`, pt, meIdx()); save(); chime(); confetti(70); toast(`+${pt} ⭐ Bravo ${myName()} !`); if (extra) extra(); refreshAll(); after(i); };
    $$(".opt", el).forEach((b) => (b.onclick = () => {
      if (+b.dataset.j === t.a) { b.classList.add("right"); win(); } else { b.classList.add("bad"); b.disabled = true; }
    }));
    const k = p.id + i, out = $("output", el);
    if (out) {
      $("[data-m]", el).onclick = () => { counters[k] = Math.max(0, counters[k] - 1); out.textContent = counters[k]; };
      $("[data-p]", el).onclick = () => { counters[k]++; out.textContent = counters[k]; };
    }
    if (t.t === "photo") {
      const f = $("[data-file]", el), hold = $("[data-hold]", el);
      const accept = () => { delete pendingPhoto[k]; win(); };
      if (f) f.onchange = async () => {
        if (!f.files[0]) return;
        const blob = await shrink(f.files[0]);
        await putPhoto(`${p.id}:${i}`, { blob, t: Date.now(), lat: pos?.lat ?? null, lon: pos?.lon ?? null, near: near(p), place: p.id, q: t.q });
        if (near(p)) accept(); else { pendingPhoto[k] = true; redraw(); }
      };
      if (hold) { let h; hold.onpointerdown = () => { h = setTimeout(accept, 2000); }; ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => hold.addEventListener(ev, () => clearTimeout(h))); }
      return;
    }
    if (t.t === "checklist") $$("input[type=checkbox]", el).forEach((c) => (c.onchange = () => { checks[k][+c.dataset.j] = c.checked; }));
    const ok = $("[data-ok]", el);
    if (!ok) return;
    ok.onclick = () => {
      if (t.t === "count") {
        if (t.a != null && counters[k] !== t.a) { toast("Presque ! Recompte bien 🔍"); return; }
        if (t.a == null && counters[k] < 1) { toast("Compte au moins 1 ! 😉"); return; }
      }
      if (t.t === "checklist" && !checks[k].every(Boolean)) { toast("Il reste des choses à trouver 🔍"); return; }
      if (t.t === "word") {
        const w = ($("#word", el).value || "").trim().toUpperCase();
        if (w !== STORY.finalWord) { toast("Ce n'est pas le bon mot… cherche le vrai nom de Venise !"); return; }
        win(finale); return;
      }
      win();
    };
  });
}
function finale() {
  award("finale", POINTS.finale); save(); closeSheet(); closeQuest(); chime(true); confetti(260); setTimeout(() => confetti(200), 600);
  modal(`<div class="em">🗝️🦁</div><h2>Bravo, Gardiens du Lion !</h2>${STORY.finale.map((s) => `<p>${esc(s)}</p>`).join("")}<p><b>+${POINTS.finale} ⭐ — Le trésor de Venise est à vous !</b></p>
    <button class="btn blue wide" data-close>🏆 Voir mes trophées</button>`, () => setTab("trophies"));
}

/* ───────── Épreuves en plein écran : une seule chose par écran ───────── */
let quest = null; // { id, phase: intro | task | end, step }
const introSeen = {};
function openQuest(id) {
  closeSheet();
  if (place(id).chapters) { openChapters(place(id)); return; }
  const p = place(id), first = p.tasks.findIndex((_, i) => !taskDone(id, i));
  quest = { id, step: first < 0 ? p.tasks.length : first, phase: first < 0 ? "end" : doneTasks(p) === 0 && !introSeen[id] ? "intro" : "task" };
  $("#quest").hidden = false; $("#next").hidden = true; $("#bridge-btn").hidden = true; scheduleGeoSync();
  map.easeTo({ center: [p.lon, p.lat] }); renderQuest();
}
/* ───────── Épreuves à chapitres : Corto pose une question, l'enfant choisit parmi plusieurs réponses ───────── */
let chapAudio = null;
function stopChapAudio() { if (chapAudio) { try { chapAudio.pause(); } catch {} chapAudio = null; } }
function chapAudioCard(s) {
  const card = document.createElement("div"); card.className = "aud";
  card.innerHTML = `<button type="button" class="aud-b" aria-label="Écouter">▶</button><div class="aud-bar"><i></i></div><span>Écouter l'extrait</span>`;
  const b = $(".aud-b", card), bar = $(".aud-bar i", card);
  b.onclick = () => {
    if (chapAudio && !chapAudio.paused) { chapAudio.pause(); b.textContent = "▶"; return; }
    if (!chapAudio || chapAudio._src !== s.audio) { stopChapAudio(); chapAudio = new Audio(s.audio); chapAudio._src = s.audio; chapAudio.ontimeupdate = () => { bar.style.width = (chapAudio.currentTime / (chapAudio.duration || 1)) * 100 + "%"; }; chapAudio.onended = () => { b.textContent = "▶"; bar.style.width = "0"; }; }
    chapAudio.play().then(() => { b.textContent = "❚❚"; }).catch(() => {});
  };
  ($("#sheet.chap") ? $("#sheet") : $("#b-talk")).appendChild(card);
}
const EXIT_SVG = '<svg viewBox="0 0 48 48" width="24" height="24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M26 5a10 10 0 0 1 10 10c0 8-10 19-10 19S16 23 16 15A10 10 0 0 1 26 5z"/><circle cx="26" cy="15" r="3.5"/><path d="M6 41h18M11 36l-5 5 5 5"/></svg>';
let conclusionEditorAbort = null;
function openChapters(p, replay = false, conclusionOnly = false, preview = false) {
  conclusionEditorAbort?.abort(); conclusionEditorAbort = null;
  chapCur = p; suspended = null; openId = "chap"; chatSel = "#b-talk"; $("#next").hidden = true; $("#bridge-btn").hidden = true;
  const sh = $("#sheet"); sh.hidden = false; sh.className = "medal-wrap bridge-wrap chap"; delete sh.dataset.k;
  sh.innerHTML = `<div class="chap-bg" style="background-image:url(${pic(p.id)})"></div><div class="chap-g chap-g-top"></div><div class="chap-g chap-g-bot"></div>
    <div class="m-chat b-talk" id="b-talk"></div><div class="b-actions" id="b-actions" hidden></div><img class="cq-head" src="img/corto-content.webp" alt="">`;
  // Épreuve : Corto parle comme partout ailleurs (bande en bas, texte à gauche, sa tête à droite) ; plus de pastille de Corto ni de boutons du coin.
  document.body.classList.add("chap-open"); scheduleGeoSync();
  { const bt = $("#b-talk"); if (window.ResizeObserver) new ResizeObserver(() => { sh.style.setProperty("--cqh", bt.offsetHeight + "px"); $$(".rev-img").forEach(fitRevImg); }).observe(bt); }
  if (DEV && !conclusionOnly) { const sk = document.createElement("button"); sk.type = "button"; sk.className = "dev-skip"; sk.textContent = "⏭ Fin"; sk.onclick = () => skipEnd && skipEnd(); sh.appendChild(sk); } // mode dev : sauter à l'écran final
  if (LOCAL_DEV && p.musicChallenge) { const b = document.createElement("button"); b.type = "button"; b.className = "dev-music"; b.textContent = "🔧 Dev · Défi musical"; b.onclick = () => openMusicChallenge(p.musicChallenge.entry, p, () => {}, true); sh.appendChild(b); }
  { // coin haut gauche : seul le retour à la carte reste présent pendant l'épreuve
    const dk = document.createElement("div"); dk.className = "dock";
    dk.innerHTML = `<button type="button" class="dk dk-exit" aria-label="Revenir à la carte de Venise">${EXIT_SVG}</button>`;
    sh.appendChild(dk); $(".dk-exit", dk).onclick = () => suspendChap();
  }
  sh.onclick = null; // dans une épreuve, un toucher à côté des bulles et des boutons ne ferme rien : on y reste
  try { history.pushState({ vqBridge: 1 }, ""); } catch {}
  sh.style.backgroundColor = "#0a1c28";
  $(".chap-bg", sh).animate([{ opacity: 0, transform: "scale(1)" }, { opacity: 1, transform: "scale(1.04)", offset: .08 }, { opacity: 1, transform: "scale(1.16)" }], { duration: 20000, easing: "ease-out", fill: "forwards" }); // l'image reste en fond, avec un très lent zoom
  setTimeout(() => { if (openId === "chap") { if (conclusionOnly) chapEnd(p, replay, preview); else runChapters(p, replay); } }, 350);
}
// Fin d'épreuve : l'indice de Corto donne accès au trésor caché dans le plan.
const endBravo = () => `Bravo, ${gradeLc()} !`;
const endSecret = (p) => p.musicChallenge?.hint || p.reward?.hint || "Garde en mémoire ce que tu as découvert ici.";
function conclusionEditor(sh, p, elements, defaults) {
  conclusionEditorAbort?.abort();
  const layout = (CONCLUSION_LAYOUT[p.id] ||= {});
  const apply = (key) => {
    const el = elements[key], c = layout[key] || {};
    el.style.translate = `${Number(c.x) || 0}vw ${Number(c.y) || 0}vh`;
    if (key === "emblem") {
      // Une vraie largeur modifie aussi la place occupée par la vignette et son halo.
      el.style.width = `${Math.round(Math.min(innerWidth * .4, 160, innerHeight * .21) * (Number(c.s) || 1))}px`;
    } else el.style.scale = String(Number(c.s) || 1);
    if (key !== "emblem") el.textContent = typeof c.text === "string" ? c.text.replace(/\{grade\}/g, gradeLc()) : defaults[key];
  };
  Object.keys(elements).forEach(apply);
  fitChapTalk();
  const controller = new AbortController(); conclusionEditorAbort = controller;
  window.addEventListener("resize", () => apply("emblem"), { signal: controller.signal });
  if (!LOCAL_DEV) return;
  const emblem = $(".chap-victory", sh), bt = $("#b-talk", sh), lead = elements.lead, clue = elements.secret, planButton = elements.plan;
  const names = { bravo: "Bravo", completion: "Fin des épreuves", emblem: "Vignette", lead: "Annonce", secret: "Secret", plan: "Bouton du plan" };
  const bar = document.createElement("div"); bar.className = "chap-edit-bar";
  bar.innerHTML = '<button type="button" data-ce="toggle">✎ Conclusion</button><div class="chap-edit-tools" hidden><span class="chap-edit-name">Touche un élément</span><button type="button" data-ce="minus">Taille −</button><button type="button" data-ce="plus">Taille +</button><label class="chap-edit-size">Taille <input type="range" min="50" max="250" step="5" value="100" aria-label="Taille de l’élément sélectionné"><output>100 %</output></label><button type="button" data-ce="text">✎ Texte</button><button type="button" data-ce="reset">Réinit.</button><button type="button" data-ce="flip">⇅</button><button type="button" data-ce="save">💾 Enregistrer</button><textarea class="chap-edit-text" rows="2" hidden aria-label="Texte de l’élément sélectionné"></textarea><small class="chap-edit-status">Glisse un élément pour le déplacer.</small></div>';
  sh.appendChild(bar);
  const tools = $(".chap-edit-tools", bar), field = $(".chap-edit-text", bar), status = $(".chap-edit-status", bar), size = $(".chap-edit-size input", bar), sizeValue = $(".chap-edit-size output", bar);
  let editing = false, selected = null, drag = null;
  const select = (key) => { selected = key; Object.entries(elements).forEach(([k, el]) => el.classList.toggle("chap-edit-selected", k === key)); $(".chap-edit-name", bar).textContent = key ? names[key] : "Touche un élément"; field.hidden = true; size.disabled = !key; size.value = String(Math.round((Number(layout[key]?.s) || 1) * 100)); sizeValue.textContent = `${size.value} %`; if (key && key !== "emblem") field.value = elements[key].textContent; };
  const cfg = (key) => (layout[key] ||= { x: 0, y: 0, s: 1 });
  const showAll = () => { emblem.classList.add("shown", "lit"); bt.classList.remove("chap-hint-pending"); lead.classList.add("shown"); clue.classList.add("shown"); planButton?.classList.add("shown"); };
  bar.addEventListener("click", async (e) => {
    const action = e.target.closest("button")?.dataset.ce; if (!action) return;
    if (action === "toggle") { editing = !editing; sh.classList.toggle("chap-editing", editing); tools.hidden = !editing; if (editing) showAll(); select(null); return; }
    if (action === "flip") { bar.classList.toggle("at-bottom"); return; }
    if (action === "save") { try { const r = await fetch("api/conclusion-layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(CONCLUSION_LAYOUT) }); status.textContent = r.ok ? "Enregistré ✔" : "Échec : serveur sans --dev ?"; } catch { status.textContent = "Échec de l’enregistrement"; } return; }
    if (!selected) { status.textContent = "Touche d'abord un élément."; return; }
    if (action === "text") { if (selected === "emblem") { status.textContent = "La vignette n'a pas de texte."; return; } field.hidden = !field.hidden; if (!field.hidden) field.focus(); return; }
    if (action === "reset") { delete layout[selected]; apply(selected); select(selected); fitChapTalk(); status.textContent = "Élément réinitialisé"; return; }
    const c = cfg(selected); c.s = Math.max(.5, Math.min(2.5, Math.round(((Number(c.s) || 1) + (action === "plus" ? .05 : -.05)) * 100) / 100)); apply(selected); size.value = String(Math.round(c.s * 100)); sizeValue.textContent = `${size.value} %`; status.textContent = `${names[selected]} · ${size.value} %`;
  });
  size.oninput = () => { if (!selected) return; cfg(selected).s = Number(size.value) / 100; apply(selected); sizeValue.textContent = `${size.value} %`; status.textContent = `${names[selected]} · ${size.value} %`; };
  field.oninput = () => { if (!selected || selected === "emblem") return; cfg(selected).text = field.value; apply(selected); fitChapTalk(); status.textContent = "Texte modifié · pense à enregistrer"; };
  for (const [key, el] of Object.entries(elements)) el.dataset.chapEdit = key;
  sh.addEventListener("pointerdown", (e) => { if (!editing || e.target.closest(".chap-edit-bar")) return; const el = e.target.closest("[data-chap-edit]"); if (!el || !sh.contains(el)) { select(null); return; } e.preventDefault(); e.stopPropagation(); const key = el.dataset.chapEdit; select(key); const c = cfg(key); drag = { id: e.pointerId, key, x: e.clientX, y: e.clientY, ox: Number(c.x) || 0, oy: Number(c.y) || 0 }; try { sh.setPointerCapture(e.pointerId); } catch {} }, { capture: true, signal: controller.signal });
  sh.addEventListener("pointermove", (e) => { if (!drag || e.pointerId !== drag.id) return; const c = cfg(drag.key); c.x = Math.round(Math.max(-45, Math.min(45, drag.ox + (e.clientX - drag.x) / sh.clientWidth * 100)) * 100) / 100; c.y = Math.round(Math.max(-45, Math.min(45, drag.oy + (e.clientY - drag.y) / sh.clientHeight * 100)) * 100) / 100; apply(drag.key); status.textContent = `${names[drag.key]} · position modifiée`; }, { signal: controller.signal });
  const stop = (e) => { if (drag?.id === e.pointerId) drag = null; }; sh.addEventListener("pointerup", stop, { signal: controller.signal }); sh.addEventListener("pointercancel", stop, { signal: controller.signal });
  sh.addEventListener("click", (e) => { if (editing && e.target.closest("[data-chap-edit]")) { e.preventDefault(); e.stopImmediatePropagation(); } }, { capture: true, signal: controller.signal });
}
async function chapEnd(p, replay, preview = false) {
  await clearTalk();
  const sh = $("#sheet"); sh.classList.remove("chap-reveal"); sh.classList.add("chap-conclusion"); sh.dataset.k = "one";
  const devSkip = $(".dev-skip", sh); if (devSkip) devSkip.remove();
  const exitDock = $(".dock", sh); if (exitDock) exitDock.remove();
  const icon = PLACE_ICONS[p.id], emblem = document.createElement("div");
  emblem.className = "chap-victory";
  emblem.innerHTML = `<p class="chap-victory-bravo"></p><p class="chap-victory-line"></p><div class="chap-victory-emblem${icon ? "" : " is-photo"}"><span class="chap-victory-halo"></span><span class="chap-victory-art"><img src="${icon ? icon.src : pic(p.id)}" alt=""></span><span class="chap-victory-stars chap-victory-stars-outer" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i><i>✧</i></span><span class="chap-victory-stars chap-victory-stars-inner" aria-hidden="true"><i>✧</i><i>✦</i><i>✧</i><i>✦</i></span></div>`;
  sh.appendChild(emblem);
  const defaults = { bravo: endBravo(), completion: "Tu as mené toutes ces épreuves jusqu'au bout.", lead: "À présent, je vais te confier un secret.", secret: endSecret(p), plan: "Ouvre le plan de l'église." };
  $(".chap-victory-bravo", emblem).textContent = defaults.bravo;
  $(".chap-victory-line", emblem).textContent = defaults.completion;
  const bt = $("#b-talk", sh); bt.classList.add("chap-hint-pending");
  const msg = chatAdd(typingHtml, "fc chap-final-msg"), bubble = $(".m-bubble", msg);
  bubble.classList.remove("typing");
  bubble.innerHTML = `<span class="chap-secret-lead">${esc(defaults.lead)}</span><span class="chap-secret-clue">${esc(defaults.secret)}</span>`;
  fitChapTalk();
  if (!preview && p.reward && !has("fin:" + p.id)) { award("fin:" + p.id, 0, meIdx()); save(); }
  let planButton = null;
  if (p.plan) { planButton = document.createElement("button"); planButton.type = "button"; planButton.className = "chap-end-plan"; planButton.textContent = defaults.plan; bt.appendChild(planButton); fitChapTalk(); }
  if (MONTAGES[p.id]) { const b = document.createElement("button"); b.type = "button"; b.className = "chap-end-photo"; b.textContent = "📸 Photo souvenir"; b.onclick = () => openMontage(p.id); sh.appendChild(b); }
  conclusionEditor(sh, p, { bravo: $(".chap-victory-bravo", emblem), completion: $(".chap-victory-line", emblem), emblem: $(".chap-victory-emblem", emblem), lead: $(".chap-secret-lead", bubble), secret: $(".chap-secret-clue", bubble), ...(planButton ? { plan: planButton } : {}) }, defaults);
  const routePlanButton = () => {
    if (!planButton) return;
    const M = p.musicChallenge;
    if (M && has(`music:${M.entry}:found`)) {
      planButton.textContent = "Revoir le morceau de partition";
      planButton.onclick = () => openMusicFragmentReveal(M.entry, p);
    } else planButton.onclick = () => openPlanPanel(p.plan, p, routePlanButton, preview);
  };
  routePlanButton();
  const stage = (delay, action) => setTimeout(() => { if (emblem.isConnected) action(); }, delay);
  const lead = $(".chap-secret-lead", bubble), clue = $(".chap-secret-clue", bubble);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    emblem.classList.add("shown", "lit"); bt.classList.remove("chap-hint-pending"); lead.classList.add("shown"); clue.classList.add("shown"); planButton?.classList.add("shown");
  } else {
    stage(180, () => emblem.classList.add("shown"));
    stage(2500, () => emblem.classList.add("lit"));
    stage(3500, () => { bt.classList.remove("chap-hint-pending"); lead.classList.add("shown"); });
    stage(4750, () => clue.classList.add("shown"));
    stage(5650, () => planButton?.classList.add("shown"));
  }
}
/* ───────── « Où ? » : une petite carte avec une cible sur l'objet désigné par la question (champ loc des étapes) ───────── */
let skipEnd = null; // (mode dev) saute directement à l'écran final de l'épreuve
let locUI = null;
function closeLoc() {
  if (!locUI) return; clearInterval(locUI.t); try { locUI.map && locUI.map.remove(); } catch {} locUI.els.forEach((e) => e.remove()); locUI = null;
}
function showLocBtn(bubbleEl, loc) {
  closeLoc(); const sh = $("#sheet"), bub = bubbleEl && $(".m-bubble", bubbleEl); if (!sh || !bub) return;
  const bb = bub.getBoundingClientRect(), sr = sh.getBoundingClientRect();
  const btn = document.createElement("button"); btn.type = "button"; btn.className = "loc-btn"; btn.textContent = "📍 Où ?"; btn.style.top = (sh.classList.contains("chap") ? 66 : bb.bottom - sr.top + 8) + "px"; sh.appendChild(btn);
  btn.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 400 });
  const ui = (locUI = { els: [btn], map: null, panel: null, t: null, loc });
  const hide = () => { clearInterval(ui.t); try { ui.map && ui.map.remove(); } catch {} ui.map = null; if (ui.panel) { ui.panel.remove(); ui.els = ui.els.filter((e) => e !== ui.panel); ui.panel = null; } btn.classList.remove("on"); btn.hidden = false; };
  btn.onclick = () => {
    if (ui.panel) { hide(); return; }
    btn.hidden = true;
    const inCh = sh.classList.contains("chap"), barH = ($("#b-actions") ? $("#b-actions").offsetHeight : 60), top = inCh ? 60 : Math.max(0, bb.bottom - sr.top - 24);
    const panel = (ui.panel = document.createElement("div")); panel.className = "loc-map";
    panel.style.top = top + "px"; panel.style.bottom = (inCh ? ($("#b-talk").offsetHeight + 8) : barH + 120 + SAFE_B()) + "px"; panel.innerHTML = '<div class="loc-in"></div><button type="button" class="loc-x" aria-label="Fermer la carte">✕</button>';
    sh.appendChild(panel); ui.els.push(panel);
    $(".loc-x", panel).onclick = hide;
    const m = (ui.map = createMap($(".loc-in", panel), { center: [loc.lon, loc.lat], zoom: 18, minZoom: 13, maxZoom: 19 }));
    const t = document.createElement("div"); t.className = "tgt"; t.innerHTML = '<span class="tgt-r"></span><span class="tgt-r r2"></span><i></i>';
    new maplibregl.Marker({ element: t, anchor: "center" }).setLngLat([loc.lon, loc.lat]).addTo(m);
    let me = null;
    const upd = () => {
      if (!pos || !ui.map) return;
      if (!me) { const e = userEl(); e.classList.add("nomenu"); e.style.setProperty("--ps", 1); me = new maplibregl.Marker({ element: e, anchor: "center" }).setLngLat([pos.lon, pos.lat]).addTo(m); return true; }
      me.setLngLat([pos.lon, pos.lat]);
    };
    m.once("load", () => {
      if (upd()) { const d = dist(pos.lat, pos.lon, loc.lat, loc.lon); if (d < 600) { const b = new maplibregl.LngLatBounds([loc.lon, loc.lat], [loc.lon, loc.lat]).extend([pos.lon, pos.lat]); m.fitBounds(b, { padding: 50, maxZoom: 18.3, duration: 0 }); } }
    });
    ui.t = setInterval(upd, 2000);
  };
}
/* ───────── Plan en pleine page → étiquette → photo en pleine page ───────── */
function openPlanPanel(plan, pl, onMusicFound = () => {}, preview = false) {
  const sh = $("#sheet"); if (!sh || !plan) return;
  if (!locUI) locUI = { els: [], map: null, panel: null, t: null, loc: null };
  const ui = locUI; if (ui.planOpen) return;
  let panel, stage, box, peek = null, photo = null, selected = null, observer = null;
  const hide = () => {
    observer?.disconnect(); panel?.remove(); ui.els = ui.els.filter((e) => e !== panel);
    ui.planOpen = false; ui.closePlan = null; sh.classList.remove("plan-open");
    panel = stage = box = peek = photo = selected = null;
  };
  const placePeek = () => {
    if (!peek || !selected || !stage) return;
    const marker = $$(".plan-pt", box).find((e) => e.dataset.id === selected.id), sr = stage.getBoundingClientRect(), mr = marker?.getBoundingClientRect();
    if (!mr) return;
    const cx = mr.left - sr.left + mr.width / 2, cy = mr.top - sr.top + mr.height / 2;
    peek.style.left = Math.max(10, Math.min(stage.clientWidth - peek.offsetWidth - 10, cx - peek.offsetWidth / 2)) + "px";
    peek.style.top = (cy + 16 + peek.offsetHeight < stage.clientHeight - 10 ? cy + 16 : Math.max(10, cy - peek.offsetHeight - 16)) + "px";
  };
  const layout = () => {
    if (!stage || !box) return;
    const sc = Math.min((stage.clientWidth - 12) / plan.w, (stage.clientHeight - SAFE_T() - SAFE_B() - 24) / plan.h);
    box.style.width = Math.max(1, plan.w * sc) + "px"; box.style.height = Math.max(1, plan.h * sc) + "px";
    box.style.fontSize = Math.max(13, plan.w * sc * .026) + "px";
    placePeek();
  };
  const closePhoto = () => { if (!photo) return; photo.remove(); photo = null; if (peek) peek.hidden = false; };
  const openPhoto = (pt) => {
    closePhoto(); if (peek) peek.hidden = true;
    photo = document.createElement("div"); photo.className = "plan-photo";
    photo.innerHTML = `<img src="${esc(pt.img)}" alt="${esc(pt.title)}"><button type="button" class="plan-photo-back">← Retour à la carte</button>`;
    panel.appendChild(photo);
    $(".plan-photo-back", photo).onclick = closePhoto;
    const im = $("img", photo);
    addTreasures(photo, im, pt, pl, {
      preview,
      onClaim: hide,
      onMusic: (entry, rect) => { hide(); onMusicFound(); openMusicFragmentReveal(entry, pl, rect); },
    });
    photo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280 });
  };
  const select = (pt) => {
    closePhoto(); selected = pt;
    $$(".plan-pt", box).forEach((e) => e.classList.toggle("sel", e.dataset.id === pt.id));
    peek?.remove(); peek = document.createElement("button"); peek.type = "button"; peek.className = "plan-peek";
    peek.innerHTML = `<img src="${esc(pt.img)}" alt=""><span>${esc(pt.title)}</span>`;
    peek.onclick = () => openPhoto(pt);
    stage.appendChild(peek); placePeek();
    peek.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 220 });
  };
  ui.planOpen = true; ui.closePlan = hide; sh.classList.add("plan-open");
  panel = document.createElement("div"); panel.className = "plan-panel plan-panel-full";
  panel.style.setProperty("--plan-place-bg", `url("${pic(pl.id)}")`);
  panel.innerHTML = `<div class="plan-stage"><div class="plan-box"><img class="plan-img" src="${esc(plan.img)}" alt="Plan de ${esc(plan.title || pl?.name || "l'église")}">${plan.points.map((pt) => `<button type="button" class="plan-pt" data-id="${esc(pt.id)}" style="left:${pt.x}%;top:${pt.y}%" aria-label="Voir ${esc(pt.title)}">${esc(pt.id)}</button>`).join("")}</div></div>`;
  sh.appendChild(panel); ui.els.push(panel); stage = $(".plan-stage", panel); box = $(".plan-box", panel);
  stage.onclick = (e) => { if (e.target === stage || e.target.classList.contains("plan-img")) hide(); };
  $$(".plan-pt", box).forEach((e) => { e.onclick = () => { const pt = plan.points.find((x) => x.id === e.dataset.id); if (pt) select(pt); }; });
  layout();
  if (window.ResizeObserver) { observer = new ResizeObserver(layout); observer.observe(stage); }
  panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: "ease-out" });
}
async function runChapters(p, replay = false) {
  const myLoop = ++curLoop;
  const bsleep = async (ms) => { await sleep(ms); if (openId !== "bridges" && openId !== "chap" && !suspended) throw 0; if (myLoop !== curLoop) throw 0; }; // cette boucle meurt si une autre a pris le relais
  try {
    const say = async (el, text, pad) => { cortoType(el); await bsleep(900); cortoFill(el, text.replace(/\{g\}/g, gradeLc())); bFill(el, pad); await bsleep(350); };
    // Liste plate de questions-réponses (les chapitres ne servent plus qu'à ranger les données).
    // Les questions liées (next) sont des étapes à part entière ; un toucher après chaque révélation lance la suivante.
    const all = p.chapters.flatMap((cc) => cc.steps).filter((s) => !s.pending).flatMap(chainOf).map((x) => ({ ...x, next: undefined }));
    // Reprise : si l'enfant a déjà répondu à des questions, il retrouve exactement la première question restante.
    const answered = all.flatMap(chainOf).filter((s) => taskDone(p.id, s.idx)).length;
    let lead = replay ? `On refait les épreuves, {g} ! Tu peux t'amuser à réessayer !` : answered ? `Reprenons là où nous en étions, {g} !` : `Te voilà dans ${p.name.replace(/^L'/, "l'")}, {g} !`, el = chatAdd(typingHtml, "fc"), fresh = true;
    const todo = all.filter((s) => replay || chainOf(s).some((x) => !taskDone(p.id, x.idx)));
    const sh = $("#sheet");
    try { await document.fonts.ready; } catch {} // mesure après chargement de la police de Corto
    const chainBar = (qs, from) => qs.slice(from).reduce((m, x) => Math.max(m, barHeight(x.opts)), 0);
    // Place l'image de révélation sous la bulle de Corto, et la fait finir (fondue) avant les boutons ou les pastilles.
    const placeImg = () => {};
    if (DEV) window.__fitRev = () => $$(".rev-img").forEach(fitRevImg); // l'image de révélation occupe la partie haute de l'écran (voir la feuille de style : .chap .rev-img), au-dessus de la bande de Corto
    outer: for (let k = 0; k < todo.length; k++) {
      const s = todo[k], qs = chainOf(s);
      let j = replay ? 0 : qs.findIndex((x) => !taskDone(p.id, x.idx)), rv = null, im = null;
      if (!fresh) { await clearTalk(); el = chatAdd(typingHtml, "fc"); } // chaque question : conversation remise à zéro, Corto pose la suivante
      fresh = false;
      const showImg = async (bar) => {
        if (!s.img || im) return; // une fois posée, l'image ne bouge plus
        im = new Image(); im.className = "rev-img"; im.alt = ""; im.src = s.img; if (s.imgPos) im.style.objectPosition = s.imgPos;
        await new Promise((ok) => { im.onload = im.onerror = ok; });
        sh.appendChild(im);
        fitRevImg(im); // plus de légende : la photo prend toute la place disponible, juste au-dessus du texte de Corto
        im.animate([{ opacity: 0, transform: "translateY(16px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 600, easing: "ease-out" });
      };
      const newRev = async (text, bar) => { // écran de révélation : Corto content en haut, image dessous
        rv = chatAdd('<span class="arr-face"></span><div class="m-bubble typing"><i></i><i></i><i></i></div>', "fc rv"); sh.dataset.k = "one";
        await bsleep(80); cortoFill(rv, text.replace(/\{g\}/g, gradeLc())); await bsleep(100); await showImg(bar);
      };
      if (j > 0) { await clearTalk(); el = null; await newRev(`${lead} ${qs[j].q}`.trim(), chainBar(qs, j)); lead = ""; }
      for (; j < qs.length; j++) {
        const x = qs[j], last = j === qs.length - 1, ch = shuffle(x.opts.map((o, i) => ({ t: o, ok: x.free || i === x.a })));
        if (!rv) {
          await say(el, `${lead} ${x.where || ""} ${x.q}`.replace(/\s+/g, " ").trim(), barHeight(x.opts)); lead = "";
          if (x.audio) chapAudioCard(x);
          if (x.loc) showLocBtn(el, x.loc);
        }
        const cf = null; // les propositions se centrent d'elles-mêmes dans l'espace libre au-dessus de la bande de Corto (feuille de style)
        const pts = x.pts ?? 10, r = await bridgeChoose(ch, replay ? 0 : pts, cf); closeLoc();
        if (r.skip) break outer;
        sh.classList.add("chap-reveal"); // seule l'image de fond se floute pendant la révélation
        if (!replay) { award(`t:${p.id}:${x.idx}`, r.first ? pts : 0, meIdx()); save(); refreshAll(); }
        if (r.first && !replay) confetti(30);
        let wonWork = null, cleared = false;
        if (x.work && !workFound(x.work)) {
          await clearTalk(); rv = im = null; cleared = true;
          wonWork = await claimQuestionWork(x.work);
        }
        const head = wonWork ? `**Bravo ! « ${wonWork.titre} » rejoint ton livre : +${POINTS.work} étoiles !** ` : x.free ? `**Merci de me le dire !** ` : r.first ? `**Bravo !** ` : "**C'est la bonne réponse !** ";
        const text = head + x.reveal + (last ? "" : ` ${qs[j + 1].q}`);
        if (!rv) { if (!cleared) await clearTalk(); await newRev(text, chainBar(qs, j + 1)); } // première réponse : tout est effacé
        else { cortoType(rv); await bsleep(80); cortoFill(rv, text); await bsleep(100); } // les suivantes : même bulle, même image
      }
      $$(".rev-img").forEach((e) => e.dataset.keep = "1");
      const nb = await new Promise((res) => {
        const finish = (value) => { sh.removeEventListener("click", onTap); res(value); };
        const onTap = (e) => {
          if (e.target.closest("button,a,input,textarea,select,[role='button'],.loc-map,.plan-panel,.aud")) return;
          finish("next");
        };
        skipEnd = () => finish("skip");
        sh.addEventListener("click", onTap);
      });
      sh.classList.remove("chap-reveal"); // la question suivante retrouve un fond net
      if (nb === "skip") break;
    }
    await chapEnd(p, replay); return;
  } catch (e) { if (e !== 0) throw e; }
}
function closeQuest() { quest = null; $("#quest").hidden = true; $("#bridge-btn").hidden = tab !== "map" || !!openId; renderNext(); scheduleGeoSync(); }
function questHero(p) {
  const dots = p.tasks.map((_, i) => `<i class="${taskDone(p.id, i) ? "ok" : quest.phase === "task" && quest.step === i ? "cur" : ""}"></i>`).join("");
  return `<div class="q-hero"><img src="img/places/${p.id}.webp" alt="" onerror="this.remove()"><button class="q-close" data-qx aria-label="Fermer">✕</button><div class="q-title">${esc(p.name)}</div><div class="q-dots">${dots}</div></div>`;
}
function nextUndone(p, from) { for (let i = from; i < p.tasks.length; i++) if (!taskDone(p.id, i)) return i; return -1; }
function renderQuest() {
  if (!quest) return;
  const p = place(quest.id), q = $("#quest");
  let body;
  if (quest.phase === "intro") {
    body = `<p class="q-text">${esc(p.story)}</p><div class="clue">${esc(p.clue)}</div><button class="btn blue wide" id="qgo">Commencer ➜</button>`;
  } else if (quest.phase === "end") {
    const gain = POINTS.arrive + p.tasks.reduce((n, t) => n + (t.pts ?? POINTS.task), 0);
    body = `<div class="q-solved"><div class="pth pic xl" style="--img:url(${pic(p.id)})"></div><h2>Lieu terminé !</h2><p>Tu gagnes l'autocollant du lieu</p><p class="muted">${p.tasks.length} épreuves réussies · jusqu'à ${gain} ⭐</p></div><button class="btn blue wide" id="qdone">🗺️ Retour à la carte</button>`;
  } else {
    const i = quest.step, t = p.tasks[i];
    if (taskDone(p.id, i)) {
      const last = nextUndone(p, i + 1) < 0;
      body = `<div class="q-solved"><div class="em">🎉</div><h2>Bravo !</h2><p>+${t.pts ?? POINTS.task} ⭐</p>${t.fact ? `<div class="fact">💡 ${esc(t.fact)}</div>` : ""}${t.t === "photo" ? `<img class="thumb" data-k="${p.id}:${i}" alt="">` : ""}</div><button class="btn blue wide" id="qnext">${last ? "Terminer ✅" : "Suivant ➜"}</button>`;
    } else body = taskHtml(p, t, i);
  }
  q.innerHTML = questHero(p) + `<div class="q-body">${body}</div>`;
  $("[data-qx]", q).onclick = closeQuest;
  const go = $("#qgo", q); if (go) go.onclick = () => { introSeen[p.id] = true; quest.phase = "task"; renderQuest(); };
  const nx = $("#qnext", q);
  if (nx) nx.onclick = () => { const n = nextUndone(p, quest.step + 1); if (n < 0) { quest.phase = "end"; chime(true); confetti(140); } else quest.step = n; renderQuest(); };
  const dn = $("#qdone", q); if (dn) dn.onclick = closeQuest;
  if (quest.phase === "task" && !taskDone(p.id, quest.step)) bindTasks(p, $(".q-body", q), (i) => { if (p.tasks[i].t === "choice") setTimeout(() => quest && quest.id === p.id && renderQuest(), 800); else renderQuest(); }, renderQuest);
  hydrateThumbs(q);
}

/* ───────── Onglets ───────── */
// Pastille « retour à la carte » du menu : la même que dans les épreuves (coin bas gauche) ; le retour arrière du téléphone fait la même chose.
function menuDock() {
  let d = $("#up-dock"); if (d) return d;
  d = document.createElement("div"); d.id = "up-dock"; d.className = "dock up-dock";
  d.innerHTML = `<button type="button" class="dk dk-exit" aria-label="Revenir à la carte de Venise">${EXIT_SVG}</button>`;
  $(".dk-exit", d).onclick = returnToMap;
  document.body.appendChild(d); return d;
}
function returnToMap() {
  if (tab === "map") return;
  const back = !!(history.state && history.state.vqMenu);
  setTab("map"); // l'écran change dans ce tour d'événement, sans attendre popstate
  if (back && !menuReturnPending) { menuReturnPending = true; history.back(); }
}
function setTab(t) {
  tab = t; if (t !== "map") lastTab = t;
  if (t !== "map" && !menuOpen) { menuOpen = true; if (!menuReturnPending) { try { history.pushState({ vqMenu: 1 }, ""); } catch {} } } if (t === "map") menuOpen = false;
  menuDock().hidden = t === "map";
  $$("#up-bar .up-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  const onTab = $("#up-bar .up-tabs button.on"); if (onTab && onTab.scrollIntoView) setTimeout(() => onTab.scrollIntoView({ inline: "center", block: "nearest" }), 30);
  $("#up-bar").hidden = t === "map"; $("#up-bg").hidden = t === "map"; document.body.classList.toggle("menu-open", t !== "map"); { const ms = $("#menu-say"); if (ms) ms.hidden = t === "map"; } if (t !== "map") document.documentElement.style.setProperty("--upb", $("#up-bar").offsetHeight + "px"); if (!suspended) closeSheet(); if (quest) closeQuest();
  ["days", "objects", "bridges", "photos", "works", "music", "trophies", "settings", "dev"].forEach((v) => ($("#v-" + v).hidden = v !== t));
  $("#tab-dev").hidden = t !== "dev";
  $("#bridge-btn").hidden = t !== "map";
  if (t === "days") renderDays(); if (t === "objects") { renderObjects(); syncHeldPosition(); } if (t === "bridges") renderBridges(); if (t === "photos") renderPhotos(); if (t === "works") renderWorks(); if (t === "music") renderMusicCollection(); if (t === "trophies") renderTrophies(); if (t === "settings") renderSettings(); if (t === "dev") renderDev();
  if (t === "map") { setTimeout(() => map.resize(), 50); renderNext(); } else $("#next").hidden = true;
  if (t !== "map") closeSheetKeep();
  scheduleGeoSync();
}
// Tirer vers le bas dans un écran du menu (profil) recharge l'appli : le service worker va chercher la dernière version.
(() => {
  const ind = document.createElement("div"); ind.className = "ptr"; document.body.appendChild(ind);
  let y0 = null, dy = 0, busyR = false;
  const hide = () => { ind.style.opacity = 0; ind.style.transform = "translate(-50%,-30px)"; };
  addEventListener("touchstart", (e) => {
    if (tab === "objects") { y0 = null; dy = 0; hide(); return; }
    const v = e.target.closest && e.target.closest(".view"); y0 = v && !v.hidden && v.scrollTop <= 0 && !busyR ? e.touches[0].clientY : null; dy = 0;
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (tab === "objects") { y0 = null; hide(); return; }
    if (y0 == null) return; dy = e.touches[0].clientY - y0;
    if (dy <= 0) { hide(); return; }
    const top = ($("#up-bar") ? $("#up-bar").offsetHeight : 100) + 10 + Math.min(dy / 2.2, 46);
    ind.textContent = dy > 90 ? "Relâche pour actualiser" : "Tire pour actualiser"; ind.style.opacity = Math.min(1, dy / 50); ind.style.transform = `translate(-50%,${top}px)`;
  }, { passive: true });
  addEventListener("touchend", async () => {
    if (tab === "objects") { y0 = null; hide(); return; }
    if (y0 == null) return; const go = dy > 90; y0 = null;
    if (!go) { hide(); return; }
    busyR = true; ind.textContent = "Actualisation…";
    try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); } catch {}
    setTimeout(() => location.reload(), 250);
  });
})();
function closeSheetKeep() { /* la fiche reste ouverte par-dessus les vues */ }
$$("#up-bar .up-tabs button").forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));

/* ───────── Montage « doge » : la tête de l'enfant, découpée façon papier, collée sur un portrait de doge ───────── */
// Un tableau d'époque par lieu : l'ovale (cx, cy, rx, ry, rot) marque le visage à remplacer, en pixels de l'image.
const MONTAGES = {
  doge: { src: "img/montage/doge.webp", W: 960, H: 1163, cx: 466, cy: 346, rx: 80, ry: 106, rot: -0.07, intro: "Ici, on t'habille en <b>doge</b> ! Prends-toi en photo : ta tête prendra la place de la sienne. Tu peux la déplacer et l'agrandir.", credit: "Portrait du doge Francesco Erizzo par Bernardo Strozzi (photo : Didier Descouens, CC BY-SA 4.0)." },
  frari: { src: "img/montage/doge.webp", W: 960, H: 1163, cx: 466, cy: 346, rx: 80, ry: 106, rot: -0.07, intro: "Aux Frari reposent de grands doges. Prête ta tête à celui-ci : tu peux la déplacer et l'agrandir.", credit: "Portrait du doge Francesco Erizzo par Bernardo Strozzi (photo : Didier Descouens, CC BY-SA 4.0)." },
  basilique: { src: "img/montage/loredan.webp", W: 900, H: 1262, cx: 390, cy: 437, rx: 90, ry: 130, rot: -0.05, intro: "Bravo pour Saint-Marc ! Voici le doge Leonardo Loredan, peint par Giovanni Bellini : mets ta tête à la place de la sienne.", credit: "Portrait du doge Leonardo Loredan par Giovanni Bellini (National Gallery, Londres), domaine public." },
  cadoro: { src: "img/montage/gritti.webp", W: 900, H: 1164, cx: 439, cy: 330, rx: 93, ry: 121, rot: 0.1, intro: "La maison d'or, c'est pour un doge en habit d'or ! Voici Andrea Gritti, peint par Titien : mets ta tête à la place de la sienne.", credit: "Portrait du doge Andrea Gritti par Titien (National Gallery of Art, Washington), CC0." },
  rialto: { src: "img/montage/gondolier.webp", W: 940, H: 1120, cx: 440, cy: 370, rx: 88, ry: 120, rot: 0.12, intro: "Sur l'ancien pont du Rialto, on se déplaçait déjà en gondole ! Mets ta tête sur ce gondolier peint par Carpaccio vers 1494.", credit: "Détail du « Miracle de la relique de la Croix au pont du Rialto » par Vittore Carpaccio (Gallerie dell'Accademia), domaine public." },
};
const MONT_IMGS = {};
let dgPhoto = null, dgTf = { x: 0, y: 0, s: 1 };
function dgDraw(cv, M) {
  const dgImg = MONT_IMGS[M.src]; if (!dgImg) return; const ctx = cv.getContext("2d"), { cx, cy, rx, ry, rot } = M;
  ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(dgImg, 0, 0);
  if (!dgPhoto) return; // sans photo : le tableau tel quel, avec le visage du doge
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  // Tête fondue dans le tableau : photo teintée, bords adoucis par un dégradé elliptique.
  const m = 1.35, W = Math.ceil(2 * rx * m), H = Math.ceil(2 * ry * m), off = document.createElement("canvas"); off.width = W; off.height = H;
  const o = off.getContext("2d"); o.save(); o.translate(W / 2, H / 2);
  const pw = dgPhoto.width, ph = dgPhoto.height, k = Math.max((2 * rx) / pw, (2 * ry) / ph) * dgTf.s * 1.08;
  try { o.filter = "sepia(.32) saturate(.9) contrast(.95) brightness(.97)"; } catch {}
  o.drawImage(dgPhoto, (-pw * k) / 2 + dgTf.x, (-ph * k) / 2 + dgTf.y, pw * k, ph * k); o.filter = "none"; o.restore();
  o.globalCompositeOperation = "destination-in"; o.save(); o.translate(W / 2, H / 2); o.scale(1, ry / rx);
  const g = o.createRadialGradient(0, 0, rx * 0.5, 0, 0, rx * 1.02); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(.62, "rgba(0,0,0,.9)"); g.addColorStop(1, "rgba(0,0,0,0)");
  o.fillStyle = g; o.fillRect(-W, -W, 2 * W, 2 * W); o.restore();
  ctx.drawImage(off, -W / 2, -H / 2); ctx.restore();
}
// Appareil photo avec un ovale pour placer la tête : la photo est recadrée exactement sur l'ovale.
function ovalCam() {
  return new Promise((resolve) => {
    const cam = document.createElement("div"); cam.className = "ocam";
    cam.innerHTML = `<video autoplay playsinline muted></video><div class="oc-oval"></div><p class="oc-t">Place ton visage dans l'ovale</p><p class="oc-e" hidden></p>
      <div class="oc-bar"><button class="oc-b" data-x>Annuler</button><button class="oc-shot" data-shot aria-label="Prendre la photo"></button><label class="oc-b">Une photo<input type="file" accept="image/*" capture="user" hidden data-file></label></div>`;
    document.body.appendChild(cam);
    const video = $("video", cam), oval = $(".oc-oval", cam), err = $(".oc-e", cam); let stream = null;
    const done = (v) => { try { stream && stream.getTracks().forEach((t) => t.stop()); } catch {} cam.remove(); resolve(v); };
    $("[data-x]", cam).onclick = () => done(null);
    $("[data-shot]", cam).onclick = () => {
      if (!video.videoWidth) return;
      const V = video.getBoundingClientRect(), O = oval.getBoundingClientRect(), vw = video.videoWidth, vh = video.videoHeight, sc = Math.max(V.width / vw, V.height / vh);
      const ox = (V.width - vw * sc) / 2, oy = (V.height - vh * sc) / 2, left = V.width - (O.right - V.left); // aperçu en miroir
      const c = document.createElement("canvas"); c.width = 560; c.height = Math.round((560 * O.height) / O.width);
      const x = c.getContext("2d"); x.translate(c.width, 0); x.scale(-1, 1);
      x.drawImage(video, (left - ox) / sc, (O.top - V.top - oy) / sc, O.width / sc, O.height / sc, 0, 0, c.width, c.height);
      done(c);
    };
    $("[data-file]", cam).onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const im = new Image(), u = URL.createObjectURL(f); im.onload = () => { done(im); }; im.src = u;
    };
    const fail = (t) => { err.textContent = t; err.hidden = false; $("[data-shot]", cam).hidden = true; };
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1440 } }, audio: false }).then((st) => { stream = st; video.srcObject = st; }).catch(() => fail("Je n'ai pas accès à la caméra. Tu peux choisir une photo, ou annuler."));
    } else fail("La caméra n'est pas disponible ici. Choisis une photo.");
  });
}
const CAM_SVG = '<svg viewBox="0 0 48 48" width="26" height="26" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15h8l3-5h14l3 5h8v24H6z"/><circle cx="24" cy="26" r="8"/></svg>';
let montClose = null; // fermeture du montage ouvert par-dessus une épreuve (bouton retour du téléphone inclus)
function renderDoge(v = $("#v-doge"), id = "doge", onDone = null) {
  const M = MONTAGES[id] || MONTAGES.doge;
  v.innerHTML = `<div class="bhead"><span class="bface"></span><div class="bbub">${M.intro}</div></div>
    <div class="dg-wrap"><canvas id="dg" class="dg" width="${M.W}" height="${M.H}"></canvas><button type="button" class="dg-cam ${dgPhoto ? "" : "pulse"}" id="dg-pick" aria-label="Prendre un selfie">${CAM_SVG}</button></div>
    <button class="btn blue wide" id="dg-ok" ${dgPhoto ? "" : "disabled"}>Valider</button>
    <p class="muted" style="text-align:center;margin-top:10px">La photo reste sur ton téléphone. ${M.credit}</p>`;
  const cv = $("#dg", v), draw = () => dgDraw(cv, M);
  const ready = MONT_IMGS[M.src] ? Promise.resolve() : new Promise((ok) => { const im = new Image(); im.onload = () => { MONT_IMGS[M.src] = im; ok(); }; im.onerror = ok; im.src = M.src; });
  ready.then(draw);
  $("#dg-pick", v).onclick = async () => { const p = await ovalCam(); if (!p) return; dgPhoto = p; dgTf = { x: 0, y: 0, s: 1 }; renderDoge(v, id, onDone); };
  $("#dg-ok", v).onclick = () => { // enregistre le montage dans la galerie « Photos souvenirs »
    $("#dg-ok", v).disabled = true;
    cv.toBlob(async (b) => {
      try { await putPhoto(`mont:${Date.now()}`, { blob: b, t: Date.now(), place: id, mont: 1 }); } catch {}
      dgPhoto = null;
      const first = id !== "doge" && !has("ph:" + id), pl = place(id);
      if (first) { // première photo de ce lieu : Corto félicite, une dizaine d'étoiles tombent dans l'escarcelle
        award("ph:" + id, 10, meIdx()); save(); refreshAll(); confetti(60);
        const bb = $(".bbub", v); if (bb) bb.innerHTML = "<b>Bravo, très joli, très imposant !</b>";
        starsIntoPurse(10); await sleep(3300);
        if (pl && pl.reward && !has("fin:" + pl.id)) await solemn(pl);
      } else { toast("📸 Photo enregistrée dans tes souvenirs !"); confetti(60); }
      if (onDone) onDone(); else { renderDoge(v, id, onDone); if (tab === "photos") renderPhotos(); }
    }, "image/jpeg", 0.9);
  };
}
function openMontage(id) {
  const m = document.createElement("div"); m.className = "mont"; document.body.appendChild(m);
  try { history.pushState({ vqMont: 1 }, ""); } catch {}
  let open = true;
  montClose = () => { if (!open) return; open = false; m.remove(); montClose = null; if (tab === "photos") renderPhotos(); };
  renderDoge(m, id, () => { if (history.state && history.state.vqMont) history.back(); else montClose && montClose(); });
}
/* ───────── Photos souvenirs : mosaïque des montages de l'enfant ───────── */
// Photo en plein écran, avec « Retour » et « Partager » (le bouton retour du téléphone ferme aussi la photo)
let viewClose = null;
function openPhotoView(it) {
  const o = document.createElement("div"); o.className = "pview";
  o.innerHTML = `<img src="${it.u}" alt=""><button type="button" class="pv-back" aria-label="Retour">‹ Retour</button><button type="button" class="pv-share" aria-label="Partager"><svg viewBox="0 0 48 48" width="22" height="22" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 31V7M14 16l10-10 10 10M10 24v16h28V24"/></svg><span>Partager</span></button>`;
  document.body.appendChild(o);
  try { history.pushState({ vqView: 1 }, ""); } catch {}
  let open = true;
  viewClose = () => { if (!open) return; open = false; o.remove(); viewClose = null; };
  $(".pv-back", o).onclick = () => { if (history.state && history.state.vqView) history.back(); else viewClose && viewClose(); };
  $(".pv-share", o).onclick = async () => { const f = new File([it.r.blob], "souvenir.jpg", { type: "image/jpeg" }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: "Mon souvenir de Venise" }); else { const a = document.createElement("a"); a.href = it.u; a.download = "souvenir.jpg"; a.click(); } } catch {} };
}
function renderPhotos() {
  const v = $("#v-photos");
  menuSay("Tes photos souvenirs ! Termine une épreuve pour en prendre une nouvelle.");
  v.innerHTML = `<div class="pgrid" id="pgrid"></div>`;
  allPhotos().then(async (ps) => {
    const g = $("#pgrid", v); if (!g || tab !== "photos") return;
    ps = ps.filter(([k, r]) => r && r.mont && r.blob).sort((x, y) => y[1].t - x[1].t);
    if (!ps.length) { menuSay("Tu n'as pas encore de photo souvenir. Termine une épreuve : à la fin, tu pourras te prendre en photo !"); return; }
    menuSay(ps.length === 1 ? "Voici ton premier souvenir !" : `Voici tes ${ps.length} souvenirs de Venise !`);
    // mosaïque « justifiée » : des rangées pleines largeur, de hauteurs variées, sans trous
    const items = await Promise.all(ps.map(([k, r]) => new Promise((ok) => { const u = URL.createObjectURL(r.blob), im = new Image(); im.onload = () => ok({ u, r, ar: im.width / im.height }); im.onerror = () => ok({ u, r, ar: 0.77 }); im.src = u; })));
    const W = g.clientWidth, GAP = 3, heights = [210, 150, 180, 130];
    let rows = [], cur = [], sum = 0, ri = 0;
    items.forEach((it) => { cur.push(it); sum += it.ar; if (sum * heights[ri % heights.length] + GAP * (cur.length - 1) >= W) { rows.push({ cur, sum, full: true, th: heights[ri % heights.length] }); cur = []; sum = 0; ri++; } });
    if (cur.length) rows.push({ cur, sum, full: false, th: heights[ri % heights.length] });
    let n = 0;
    rows.forEach((row) => {
      const h = row.full ? (W - GAP * (row.cur.length - 1)) / row.sum : Math.min(row.th, (W - GAP * (row.cur.length - 1)) / row.sum), rd = document.createElement("div"); rd.className = "prow"; rd.style.height = h + "px";
      row.cur.forEach((it) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "pcell"; b.style.cssText = `width:${h * it.ar}px;background-image:url(${it.u});--d:${Math.min(n++, 24) * 55}ms`;
        b.onclick = () => openPhotoView(it);
        rd.appendChild(b);
      });
      g.appendChild(rd);
    });
  });
}
/* ───────── Récompenses : étoiles dans l'escarcelle, mot solennel de Corto, trésors cachés sur les photos du plan ───────── */
function starsIntoPurse(n) { starsToCounter(innerWidth / 2, innerHeight * 0.55, n, true); } // les étoiles du montage filent vers le compteur
// Écran solennel de fin : Corto, mot de félicitation, indice sur le trésor caché. Un toucher le ferme ; le trésor est alors débloqué.
function solemn(p) {
  return new Promise((res) => {
    const o = document.createElement("div"); o.className = "finale";
    o.innerHTML = `<div class="fn-img"></div><div class="fn-txt"><b>Bravo, tu as montré ta valeur.</b><span>Et tu connais à présent l’histoire du lieu.</span><i>${esc(p.reward.hint)}</i></div><button type="button" class="fn-x" aria-label="Fermer">✕</button>`;
    document.body.appendChild(o); o.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900 });
    if (!has("fin:" + p.id)) { award("fin:" + p.id, 0, meIdx()); save(); }
    const close = () => { o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" }).finished.then(() => { o.remove(); res(); }); };
    o.onclick = close;
  });
}
// Le vrai fragment traverse la photo et rebondit sur ses bords, suivi d'une petite traînée d'étoiles.
function floatMusicFragment(photo, im, fragment, start) {
  let x = start[0], y = start[1], vx = 51, vy = 36, frame = 0, last = 0;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const trail = reducedMotion ? null : document.createElement("div");
  if (trail) { trail.className = "hid-music-trail"; trail.setAttribute("aria-hidden", "true"); trail.innerHTML = Array.from({ length: 5 }, () => "<i>✦</i>").join(""); photo.appendChild(trail); }
  const sparks = trail ? [...trail.children] : [];
  let halfW = fragment.offsetWidth / 2, halfH = fragment.offsetHeight / 2;
  const bounds = () => {
    const r = im.getBoundingClientRect(), pr = photo.getBoundingClientRect();
    const scale = Math.min(r.width / im.naturalWidth, r.height / im.naturalHeight);
    const w = im.naturalWidth * scale, h = im.naturalHeight * scale;
    const left = r.left - pr.left + (r.width - w) / 2, top = r.top - pr.top + (r.height - h) / 2;
    halfW = fragment.offsetWidth / 2; halfH = fragment.offsetHeight / 2;
    return { minX: left + halfW + 8, maxX: left + w - halfW - 8, minY: top + halfH + 8, maxY: top + h - halfH - 8 };
  };
  const position = () => {
    fragment.style.left = x + "px"; fragment.style.top = y + "px";
    if (!trail) return;
    const speed = Math.hypot(vx, vy), dx = vx / speed, dy = vy / speed;
    const edge = Math.min(halfW / Math.max(Math.abs(dx), .01), halfH / Math.max(Math.abs(dy), .01));
    sparks.forEach((star, i) => {
      const distance = edge + 9 + i * 17, side = (i % 2 ? 1 : -1) * (5 + i * 2);
      star.style.left = x - dx * distance - dy * side + "px";
      star.style.top = y - dy * distance + dx * side + "px";
    });
  };
  const fit = () => { const b = bounds(); x = Math.max(b.minX, Math.min(b.maxX, x)); y = Math.max(b.minY, Math.min(b.maxY, y)); position(); };
  const tick = (now) => {
    if (!fragment.isConnected) { trail?.remove(); return; }
    const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
    const b = bounds();
    x += vx * dt; y += vy * dt;
    if (x <= b.minX || x >= b.maxX) { x = Math.max(b.minX, Math.min(b.maxX, x)); vx = -vx; }
    if (y <= b.minY || y >= b.maxY) { y = Math.max(b.minY, Math.min(b.maxY, y)); vy = -vy; }
    position(); frame = requestAnimationFrame(tick);
  };
  fit();
  if (!reducedMotion) frame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(frame); trail?.remove(); };
}
// Trésors cachés sur les photos (une fois le mot de Corto entendu) : étoiles à tapoter et, sur la photo du saint, l'objet magique.
function addTreasures(photo, im, pt, p, { onClaim = () => {}, onMusic = () => {}, preview = false } = {}) {
  if (!p || (!preview && !has("fin:" + p.id))) return;
  const place = () => { // position d'un point (fx, fy) de l'image, que l'image soit entière ou recadrée (cover)
    const r = im.getBoundingClientRect(), pr = photo.getBoundingClientRect(), nw = im.naturalWidth, nh = im.naturalHeight; if (!nw) return null;
    const cover = im.style.objectFit === "cover", sc = cover ? Math.max(r.width / nw, r.height / nh) : Math.min(r.width / nw, r.height / nh), ow = nw * sc, oh = nh * sc;
    const ox = r.left - pr.left + (r.width - ow) / 2, oy = r.top - pr.top + (cover ? 0 : (r.height - oh) / 2);
    return (fx, fy) => [ox + fx * ow, oy + fy * oh];
  };
  const hash = (str) => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 9973; return h; };
  const go = () => {
    if (!photo.isConnected) return;
    const at = place(); if (!at) return;
    const fx = (n) => 0.15 + 0.7 * (((hash(p.id + pt.id) * (n + 3) * 37) % 100) / 100), fy = (n) => 0.12 + 0.7 * (((hash(pt.id + p.id) * (n + 5) * 53) % 100) / 100);
    const put = (cls, text, x, y, onTap) => { const e = document.createElement("button"); e.type = "button"; e.className = cls; e.textContent = text; const [l, t] = at(x, y); e.style.left = l + "px"; e.style.top = t + "px"; e.onclick = (ev) => { ev.stopPropagation(); onTap(e); }; photo.appendChild(e); e.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.3)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)" }], { duration: 600, delay: 400 }); return e; };
    const M = p.musicChallenge, musicHere = M && M.point === pt.id;
    if (!musicHere) [0, 1].forEach((k) => { const key = `st:${p.id}:${pt.id}:${k}`; if (!has(key)) put("hid-star", "⭐", fx(k), fy(k), (e) => { award(key, 2, meIdx()); save(); refreshAll(); starBurst(e, 2, true); toast("+2 ⭐"); e.remove(); }); });
    const R = p.reward;
    if (!musicHere && R && R.point === pt.id && !has("tr:" + p.id)) put("hid-trophy", R.emoji, R.at[0], R.at[1], (e) => {
      e.disabled = true;
      award("tr:" + p.id, 0, meIdx()); save(); refreshAll(); confetti(120); toast(`${R.emoji} Tu as trouvé : ${R.name} !`);
      e.animate([{ transform: "translate(-50%,-50%) scale(1.4)" }, { transform: "translate(-50%,-50%) scale(.2)", opacity: 0 }], { duration: 700, fill: "forwards" }).finished.then(() => { e.remove(); onClaim(); });
    });
    if (musicHere && !has(`music:${M.entry}:won`)) {
      const fragment = document.createElement("button"); fragment.type = "button"; fragment.className = "hid-music-fragment";
      fragment.setAttribute("aria-label", "Attraper le morceau de partition");
      fragment.innerHTML = `<img src="img/music/${esc(M.entry)}-parchemin.png" alt="">`;
      photo.appendChild(fragment);
      const stop = floatMusicFragment(photo, im, fragment, at(M.at[0], M.at[1]));
      fragment.onclick = (ev) => {
        ev.stopPropagation(); stop(); fragment.disabled = true;
        if (!has(`music:${M.entry}:found`)) { award(`music:${M.entry}:found`, 0, meIdx()); save(); }
        onMusic(M.entry, fragment.getBoundingClientRect());
      };
    }
  };
  if (im.complete) setTimeout(go, 60); else im.addEventListener("load", () => setTimeout(go, 60));
}
/* Un défi musical correspond à une seule entrée de la bibliothèque et à un seul lieu. */
let musicCatalogPromise = null;
let musicOpening = false;
const musicCatalog = () => (musicCatalogPromise ||= fetch("data/music-challenges.json").then((r) => { if (!r.ok) throw new Error("Bibliothèque musicale indisponible"); return r.json(); }).then((items) => {
  const ids = new Set();
  items.forEach((item) => { if (ids.has(item.id) || place(item.place)?.musicChallenge?.entry !== item.id) throw new Error("Correspondance musicale invalide"); ids.add(item.id); });
  return items;
}).catch((e) => { musicCatalogPromise = null; throw e; }));
// Un toucher après la découverte fait monter le fragment et lance les questions musicales.
function openMusicFragmentReveal(id, p, rect = null) {
  if ($(".music-found")) return;
  const overlay = document.createElement("section"); overlay.className = "music-found"; overlay.setAttribute("aria-label", "Morceau de partition découvert. Touchez pour continuer."); overlay.tabIndex = 0;
  overlay.style.setProperty("--music-found-bg", `url("${pic(p.id)}")`);
  overlay.innerHTML = `<img class="mu-found-fragment" src="img/music/${esc(id)}-parchemin.png" alt="Morceau de la partition des Vêpres"><div class="mu-found-stars" aria-hidden="true">${Array.from({ length: 12 }, () => "<i>✦</i>").join("")}</div><div class="mu-found-message" aria-live="polite"><strong>Extraordinaire !</strong><span>Tu as trouvé un morceau de la partition des Vêpres.</span></div>`;
  document.body.appendChild(overlay); scheduleGeoSync();
  const fragment = $(".mu-found-fragment", overlay);
  musicCatalog().then((items) => { const entry = items.find((item) => item.id === id && item.place === p.id); if (entry?.fragment && overlay.isConnected) fragment.src = entry.fragment; }).catch(() => {});
  const continueToQuestions = () => {
    if (!overlay.classList.contains("message") || overlay.classList.contains("flow")) return;
    const r = fragment.getBoundingClientRect(), fromX = r.left + r.width / 2, fromY = r.top + r.height / 2;
    overlay.classList.add("flow");
    const key = `music:${id}:discovery`, first = !has(key);
    if (first) { award(key, 10, meIdx()); save(); refreshAll(); }
    if (first && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.classList.add("music-star-flight");
      setTimeout(() => { if (overlay.isConnected) starsToCounter(fromX, fromY, 10, true); }, 300);
      setTimeout(() => document.body.classList.remove("music-star-flight"), 2600);
    }
    setTimeout(async () => {
      if (!overlay.isConnected) return;
      await openMusicChallenge(id, p);
      if ($(".music-quest")) { overlay.remove(); scheduleGeoSync(); } else overlay.classList.remove("flow");
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1450);
  };
  overlay.onclick = continueToQuestions;
  overlay.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); continueToQuestions(); } };
  const enlarge = () => { fragment.style.left = "50%"; fragment.style.top = "41%"; fragment.style.width = "min(94vw,760px)"; fragment.style.transform = "translate(-50%,-50%)"; overlay.classList.add("revealed"); };
  if (!rect || matchMedia("(prefers-reduced-motion: reduce)").matches) { enlarge(); overlay.classList.add("message"); return; }
  fragment.style.left = rect.left + "px"; fragment.style.top = rect.top + "px"; fragment.style.width = rect.width + "px"; fragment.style.transform = "none";
  requestAnimationFrame(() => requestAnimationFrame(enlarge));
  setTimeout(() => { if (overlay.isConnected) overlay.classList.add("message"); }, 1500);
}
function startMusicWalk(entry) {
  const old = $("#music-walk"); if (old) { $("audio", old)?.pause(); old.remove(); }
  const player = document.createElement("div"); player.id = "music-walk";
  player.innerHTML = `<span><b>${esc(entry.title)}</b><small>Écoute en marchant</small></span><audio controls preload="auto" src="${esc(entry.complete)}"></audio><button type="button" aria-label="Arrêter la musique">✕</button>`;
  document.body.appendChild(player);
  $("button", player).onclick = () => { $("audio", player).pause(); player.remove(); };
  const play = $("audio", player).play(); if (play?.catch) play.catch(() => toast("Appuie sur lecture pour lancer la musique."));
}
function musicListeningEditor(overlay, p, elements, defaults, phase = "opening") {
  const placeLayout = (MUSIC_LAYOUT[p.id] ||= {});
  // La seconde pause d'écoute reprend exactement les réglages géométriques de la première,
  // puis peut être ajustée séparément sans recopier son texte personnalisé.
  const layout = phase === "duo" ? (placeLayout.duo ||= Object.fromEntries(["lead", "invitation", "player"].map((key) => {
    const { x = 0, y = 0, s = 1 } = placeLayout[key] || {};
    return [key, { x, y, s }];
  }))) : placeLayout;
  const controller = new AbortController();
  const apply = (key) => {
    const el = elements[key], c = layout[key] || {}, size = Math.max(.5, Math.min(2, Number(c.s) || 1));
    el.style.translate = `${Number(c.x) || 0}vw ${Number(c.y) || 0}vh`;
    if (key === "player") el.style.scale = String(size);
    else {
      const base = key === "lead" ? Math.min(30, Math.max(23, innerWidth * .06)) : Math.min(27, Math.max(21, innerWidth * .055));
      el.style.fontSize = `${Math.round(base * size * 10) / 10}px`;
      el.textContent = typeof c.text === "string" ? c.text : defaults[key];
    }
  };
  Object.keys(elements).forEach(apply);
  window.addEventListener("resize", () => Object.keys(elements).forEach(apply), { signal: controller.signal });
  if (!LOCAL_DEV) return () => controller.abort();
  const bar = document.createElement("div"); bar.className = "mq-edit-bar";
  bar.innerHTML = '<button type="button" data-me="toggle">✎ Mode édition</button><div class="mq-edit-tools" hidden><strong class="mq-edit-name">Touche un élément</strong><button type="button" data-me="minus">Taille −</button><button type="button" data-me="plus">Taille +</button><label>Taille <input type="range" min="50" max="200" step="5" value="100" aria-label="Taille de l’élément sélectionné"><output>100 %</output></label><button type="button" data-me="text">✎ Texte</button><button type="button" data-me="reset">Réinit.</button><button type="button" data-me="flip">⇅</button><button type="button" data-me="save">💾 Enregistrer</button><textarea rows="3" hidden aria-label="Texte de l’élément sélectionné"></textarea><small class="mq-edit-status">Touche puis glisse un élément pour le déplacer.</small></div>';
  overlay.appendChild(bar);
  const tools = $(".mq-edit-tools", bar), name = $(".mq-edit-name", bar), range = $("input[type=range]", bar), output = $("output", bar), field = $("textarea", bar), status = $(".mq-edit-status", bar);
  const names = { lead: "Premier texte", invitation: "Deuxième texte", player: "Lecteur audio" };
  let editing = false, selected = null, drag = null;
  const cfg = (key) => (layout[key] ||= { x: 0, y: 0, s: 1 });
  const remember = () => { try { localStorage.setItem("vq_music_layout_draft", JSON.stringify(MUSIC_LAYOUT)); } catch {} };
  const select = (key) => {
    selected = key;
    Object.entries(elements).forEach(([id, el]) => el.classList.toggle("mq-edit-selected", id === key));
    name.textContent = key ? names[key] : "Touche un élément";
    field.hidden = true; range.disabled = !key;
    range.value = String(Math.round((Number(layout[key]?.s) || 1) * 100)); output.textContent = `${range.value} %`;
    if (key && key !== "player") field.value = typeof layout[key]?.text === "string" ? layout[key].text : defaults[key];
  };
  bar.addEventListener("click", async (event) => {
    const action = event.target.closest("button")?.dataset.me; if (!action) return;
    if (action === "toggle") { editing = !editing; overlay.classList.toggle("mq-editing", editing); tools.hidden = !editing; select(null); return; }
    if (action === "flip") { bar.classList.toggle("at-top"); return; }
    if (action === "save") {
      try { const response = await fetch("api/music-layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(MUSIC_LAYOUT) }); if (!response.ok) throw new Error("save"); localStorage.removeItem("vq_music_layout_draft"); status.textContent = "Enregistré dans la mise en page locale ✔"; }
      catch { remember(); status.textContent = "Enregistré sur cet appareil ; démarre l’aperçu avec --dev pour publier ce réglage."; }
      return;
    }
    if (!selected) { status.textContent = "Touche d’abord un élément."; return; }
    if (action === "text") { if (selected === "player") { status.textContent = "Le lecteur n’a pas de texte à modifier."; return; } field.hidden = !field.hidden; if (!field.hidden) field.focus(); return; }
    if (action === "reset") { delete layout[selected]; apply(selected); select(selected); remember(); status.textContent = "Élément réinitialisé"; return; }
    const c = cfg(selected); c.s = Math.max(.5, Math.min(2, Math.round(((Number(c.s) || 1) + (action === "plus" ? .05 : -.05)) * 100) / 100)); apply(selected); range.value = String(Math.round(c.s * 100)); output.textContent = `${range.value} %`; remember();
  }, { signal: controller.signal });
  range.oninput = () => { if (!selected) return; cfg(selected).s = Number(range.value) / 100; apply(selected); output.textContent = `${range.value} %`; remember(); };
  field.oninput = () => { if (!selected || selected === "player") return; cfg(selected).text = field.value; apply(selected); remember(); };
  overlay.addEventListener("pointerdown", (event) => {
    if (!editing || event.target.closest(".mq-edit-bar")) return;
    const el = event.target.closest("[data-music-edit]"); if (!el || !overlay.contains(el)) { select(null); return; }
    event.preventDefault(); event.stopPropagation();
    const key = el.dataset.musicEdit, c = cfg(key); select(key);
    drag = { id: event.pointerId, key, x: event.clientX, y: event.clientY, ox: Number(c.x) || 0, oy: Number(c.y) || 0 };
    try { overlay.setPointerCapture(event.pointerId); } catch {}
  }, { capture: true, signal: controller.signal });
  overlay.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const c = cfg(drag.key);
    c.x = Math.round(Math.max(-45, Math.min(45, drag.ox + (event.clientX - drag.x) / innerWidth * 100)) * 100) / 100;
    c.y = Math.round(Math.max(-45, Math.min(45, drag.oy + (event.clientY - drag.y) / innerHeight * 100)) * 100) / 100;
    apply(drag.key); status.textContent = `${names[drag.key]} · position modifiée`;
  }, { signal: controller.signal });
  const stop = (event) => { if (drag?.id === event.pointerId) { drag = null; remember(); } };
  overlay.addEventListener("pointerup", stop, { signal: controller.signal });
  overlay.addEventListener("pointercancel", stop, { signal: controller.signal });
  overlay.addEventListener("click", (event) => { if (editing && event.target.closest("[data-music-edit]")) { event.preventDefault(); event.stopImmediatePropagation(); } }, { capture: true, signal: controller.signal });
  return () => { controller.abort(); bar.remove(); overlay.classList.remove("mq-editing"); };
}
async function openMusicChallenge(id, p, onWon = () => {}, replay = false) {
  if ($(".music-quest") || musicOpening) return;
  musicOpening = true;
  let entry;
  try { entry = (await musicCatalog()).find((item) => item.id === id && item.place === p.id); } catch { musicOpening = false; toast("Le défi musical n'est pas disponible pour l'instant."); return; }
  if (!entry) { musicOpening = false; toast("Ce fragment musical est introuvable."); return; }
  const overlay = document.createElement("section"); overlay.className = "music-quest music-flow-quest"; overlay.setAttribute("aria-label", "Défi musical");
  overlay.style.setProperty("--music-flow-bg", `url("${pic(p.id)}")`);
  overlay.innerHTML = `<button type="button" class="mq-exit" aria-label="Quitter le défi musical">←</button><img class="mq-fragment" src="${esc(entry.fragment)}" alt="Morceau de la partition des Vêpres"><div class="mq-body"></div><div class="mq-transition" aria-hidden="true"></div>`;
  document.body.appendChild(overlay); document.body.classList.add("music-quest-active"); musicOpening = false; scheduleGeoSync();
  const body = $(".mq-body", overlay);
  let clip = null, stopMusicEditor = () => {}, stopQuestionLayout = () => {}, transitioning = false;
  let victoryFlight = null, victoryAnimation = null, victoryRain = null, victoryScoreTimer = null;
  const clearVictory = () => {
    clearTimeout(victoryScoreTimer);
    victoryAnimation?.cancel(); victoryFlight?.remove(); victoryRain?.remove();
    document.body.classList.remove("music-victory-active", "music-star-flight");
  };
  const stopClip = () => { if (clip) { clip.ontimeupdate = clip.onended = null; clip.pause(); clip = null; } };
  const close = () => { clearVictory(); stopQuestionLayout(); stopMusicEditor(); stopClip(); overlay.remove(); document.body.classList.remove("music-quest-active"); scheduleGeoSync(); };
  $(".mq-exit", overlay).onclick = close;
  const credit = `<p class="mq-credit">${esc(entry.credit.text)}${entry.credit.source ? ` <a href="${esc(entry.credit.source)}" target="_blank" rel="noopener">Source</a>` : ""}${entry.credit.license ? ` · <a href="${esc(entry.credit.license)}" target="_blank" rel="noopener">Licence</a>` : ""}</p>`;
  const questionKey = (question, index) => `music:${id}:q:${question.key ?? index}`;
  const victory = async () => {
    stopQuestionLayout(); stopMusicEditor(); stopClip();
    const firstWin = !has(`music:${id}:won`);
    if (firstWin) { award(`music:${id}:won`, 100, meIdx()); save(); refreshAll(); onWon(); }
    body.className = "mq-body mq-victory";
    body.innerHTML = `<h2 class="mq-victory-title" aria-live="polite">Félicitations, ${esc(gradeLc())} !</h2><button type="button" class="mq-main" data-walk ${firstWin ? "hidden" : ""}>▶ Écouter en déambulant</button><button type="button" class="mq-later" data-later ${firstWin ? "hidden" : ""}>Je l'écouterai plus tard</button>`;
    $("[data-later]", body).onclick = close;
    $("[data-walk]", body).onclick = () => { startMusicWalk(entry); close(); if (tab !== "map") setTab("map"); if (openId) closeSheet(); };
    if (!firstWin) return;
    const fragment = $(".mq-fragment", overlay);
    await Promise.race([fragment.decode().catch(() => {}), sleep(1000)]);
    if (!overlay.isConnected) return;
    overlay.classList.add("mq-victory-active"); document.body.classList.add("music-victory-active");
    const rect = fragment.getBoundingClientRect(), height = rect.height || Math.min(rect.width / 3, innerHeight * .22);
    const source = { left: rect.left, top: rect.top - (height - rect.height) / 2, width: rect.width, height };
    const book = $("#home-btn"), target = book?.getBoundingClientRect();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !target) {
      if (!reduced) starsToCounter(innerWidth / 2, innerHeight * .42, 100, true);
      $("[data-walk]", body).hidden = $("[data-later]", body).hidden = false;
      return;
    }
    victoryRain = document.createElement("div"); victoryRain.className = "mq-victory-rain"; victoryRain.setAttribute("aria-hidden", "true");
    const shower = document.createDocumentFragment();
    for (let i = 0; i < 100; i++) {
      const star = document.createElement("i"); star.textContent = i % 4 ? "✦" : "✧";
      star.style.cssText = `left:${Math.random() * 100}%;--drift:${Math.round((Math.random() - .5) * 160)}px;--size:${Math.round(8 + Math.random() * 15)}px;--delay:${Math.round(Math.random() * 1250)}ms;--duration:${Math.round(1800 + Math.random() * 1600)}ms`;
      shower.appendChild(star);
    }
    victoryRain.appendChild(shower); overlay.appendChild(victoryRain);
    victoryFlight = document.createElement("img"); victoryFlight.className = "mq-victory-flight"; victoryFlight.src = entry.fragment; victoryFlight.alt = "";
    victoryFlight.style.cssText = `left:${source.left}px;top:${source.top}px;width:${source.width}px;height:${source.height}px`;
    document.body.appendChild(victoryFlight); document.body.classList.add("music-star-flight");
    victoryScoreTimer = setTimeout(() => { if (overlay.isConnected) starsToCounter(innerWidth / 2, innerHeight * .42, 100, true); }, 900);
    const cx = source.left + source.width / 2, cy = source.top + source.height / 2;
    const mx = innerWidth / 2 - cx, my = innerHeight * .48 - cy;
    const tx = target.left + target.width / 2 - cx, ty = target.top + target.height / 2 - cy;
    victoryAnimation = victoryFlight.animate([
      { transform: "translate(0,0) rotate(-8deg) scale(1)", opacity: 1 },
      { transform: `translate(${mx - 45}px,${my - 45}px) rotate(200deg) scale(1.2)`, opacity: 1, offset: .24 },
      { transform: `translate(${mx + 42}px,${my + 25}px) rotate(620deg) scale(1.55)`, opacity: 1, offset: .53 },
      { transform: `translate(${mx - 22}px,${my - 10}px) rotate(940deg) scale(1.12)`, opacity: 1, offset: .74 },
      { transform: `translate(${tx}px,${ty}px) rotate(1260deg) scale(.06)`, opacity: .9 },
    ], { duration: 3900, easing: "cubic-bezier(.35,0,.32,1)", fill: "forwards" });
    await victoryAnimation.finished.catch(() => {});
    if (!overlay.isConnected) return;
    victoryFlight.remove(); victoryFlight = null; victoryAnimation = null;
    book.animate([{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(1.35)", filter: "brightness(1.8) drop-shadow(0 0 12px #ffd56a)", offset: .45 }, { transform: "scale(1)", filter: "brightness(1)" }], { duration: 750 });
    $("[data-walk]", body).hidden = $("[data-later]", body).hidden = false;
    document.body.classList.remove("music-star-flight");
  };
  const showQuestion = (index) => {
    if (index >= entry.questions.length) { victory(); return; }
    stopQuestionLayout(); stopMusicEditor();
    const q = entry.questions[index];
    body.classList.add("mq-quizzing");
    $(".mq-listen-next", body).hidden = true;
    $(".mq-quiz-stage", body)?.remove();
    const stage = document.createElement("div"); stage.className = "mq-quiz-stage";
    const grid = q.options.length === 4 && q.options.every((option) => option.length <= 22);
    stage.innerHTML = `<div class="mq-quiz-options${grid ? " grid" : ""}">${q.options.map((answer, j) => `<button type="button" data-answer="${j}">${esc(answer)}</button>`).join("")}</div><p class="mq-quiz-note" aria-live="polite"></p><div class="mq-corto-line"><div class="mq-corto-bubble"><span class="mq-corto-question">${esc(q.question)}</span><span class="mq-corto-explanation" hidden>${esc(q.explanation)}</span></div><span class="mq-corto-face" aria-hidden="true"></span></div>`;
    body.appendChild(stage);
    const footer = document.createElement("div"); footer.className = "mq-quiz-foot";
    footer.innerHTML = `<button type="button" class="mq-quiz-continue" hidden>${index + 1 === entry.questions.length ? "Terminer" : "Continuer"} →</button>`;
    overlay.appendChild(footer);
    const placeQuestion = () => {
      if (!stage.isConnected) return;
      const player = $(".mq-listen-player", body), box = body.getBoundingClientRect();
      stage.style.top = Math.max(0, Math.ceil(player.getBoundingClientRect().bottom - box.top + 10)) + "px";
    };
    placeQuestion(); requestAnimationFrame(placeQuestion);
    window.addEventListener("resize", placeQuestion);
    stopQuestionLayout = () => { window.removeEventListener("resize", placeQuestion); footer.remove(); };
    const choices = $$("[data-answer]", stage), note = $(".mq-quiz-note", stage), bubble = $(".mq-corto-bubble", stage), question = $(".mq-corto-question", stage), explanation = $(".mq-corto-explanation", stage), next = $(".mq-quiz-continue", footer);
    let wrong = 0, answered = false, advanced = false;
    const advance = () => {
      if (advanced) return; advanced = true; footer.remove();
      if (index === 1 && entry.duo) transitionToDuo(); else showQuestion(index + 1);
    };
    choices.forEach((button) => button.onclick = () => {
      if (answered) return;
      if (+button.dataset.answer !== q.answer) { wrong++; buzz(); button.disabled = true; button.classList.add("wrong"); note.textContent = "Essaie encore, écoute bien !"; return; }
      answered = true; choices.forEach((other) => other.disabled = true); note.textContent = "";
      bubble.style.minHeight = Math.ceil(bubble.getBoundingClientRect().height) + "px";
      const doneKey = questionKey(q, index), fresh = !has(doneKey);
      const points = q.key === "duo" && has(`music:${id}:q:${index}`) ? 0 : 10;
      if (fresh) { award(doneKey, points, meIdx()); save(); refreshAll(); }
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => { if (!stage.isConnected) return; button.classList.add("right"); if (fresh && !wrong && points) starBurst(button, points, true); }, reduced ? 0 : 380);
      setTimeout(() => { if (!stage.isConnected) return; question.hidden = true; explanation.hidden = false; }, reduced ? 0 : 900);
      setTimeout(() => { if (!stage.isConnected) return; next.hidden = false; next.onclick = (event) => { event.stopPropagation(); advance(); }; stage.onclick = advance; }, reduced ? 0 : 1500);
    });
  };
  const showListening = (phase = "opening", resumeIndex = null) => {
    stopQuestionLayout(); stopMusicEditor(); stopClip();
    const isDuo = phase === "duo";
    body.className = "mq-body mq-listening";
    const shape = isDuo ? entry.duoWaveform : entry.waveform;
    const heights = Array.isArray(shape) && shape.length ? shape : Array.from({ length: 56 }, (_, i) => 30 + 45 * Math.abs(Math.sin(i * .7)));
    const bars = heights.map((height) => `<i style="height:${Math.max(9, Math.min(100, Number(height) || 9))}%"></i>`).join("");
    const defaults = isDuo
      ? { lead: "Plus loin dans la musique, une seconde voix rejoint la première…", invitation: "Écoute-les se répondre, se croiser, puis chanter ensemble." }
      : { lead: "Les quelques notes dessinées sur cette portée font naître une mélodie unique et mystérieuse, qui a traversé les siècles jusqu’à toi…", invitation: "Ouvre grand tes oreilles et écoute !" };
    body.innerHTML = `<div class="mq-listen-center"><p class="mq-listen-lead" data-music-edit="lead">${esc(defaults.lead)}</p><p class="mq-listen-invitation" data-music-edit="invitation">${esc(defaults.invitation)}</p><div class="mq-listen-player" data-music-edit="player"><button type="button" class="mq-play-toggle" aria-label="Lire l’extrait">▶</button><div class="mq-wave-track" role="progressbar" aria-label="Avancement de l’écoute" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" style="--progress:0%"><div class="mq-wave-bars">${bars}</div><div class="mq-wave-bars mq-wave-filled">${bars}</div></div></div><p class="mq-listen-status" aria-live="polite"></p><button type="button" class="mq-listen-next" hidden>${isDuo ? "Suivant" : "Continuer"} <span aria-hidden="true">→</span></button></div>${credit}`;
    stopMusicEditor = musicListeningEditor(overlay, p, { lead: $(".mq-listen-lead", body), invitation: $(".mq-listen-invitation", body), player: $(".mq-listen-player", body) }, defaults, phase);
    const listen = $(".mq-play-toggle", body), wave = $(".mq-wave-track", body), next = $(".mq-listen-next", body), status = $(".mq-listen-status", body);
    if (DEV) next.hidden = false; // mode développeur : passer l'écoute sans attendre la fin
    clip = new Audio(isDuo ? entry.duo : entry.short);
    let finished = false;
    const progress = () => { const amount = Number.isFinite(clip.duration) && clip.duration > 0 ? Math.min(100, clip.currentTime / clip.duration * 100) : 0; wave.style.setProperty("--progress", amount + "%"); wave.setAttribute("aria-valuenow", String(Math.round(amount))); };
    clip.ontimeupdate = progress;
    clip.onended = () => { finished = true; progress(); listen.textContent = "↻"; listen.setAttribute("aria-label", "Réécouter l’extrait"); if (!body.classList.contains("mq-quizzing")) next.hidden = false; body.classList.add("mq-listen-finished"); };
    const advance = () => { if (!finished && !DEV) return; overlay.removeEventListener("click", onScreenTap); showQuestion(isDuo ? 2 : 0); };
    const onScreenTap = (event) => { if (!finished || overlay.classList.contains("mq-editing") || event.target.closest(".mq-listen-player,.mq-exit,.mq-edit-bar")) return; advance(); };
    if (!isDuo && resumeIndex === null) overlay.addEventListener("click", onScreenTap);
    listen.onclick = (event) => {
      event.stopPropagation();
      if (!clip.paused) { clip.pause(); listen.textContent = "▶"; listen.setAttribute("aria-label", "Reprendre l’écoute"); return; }
      if (clip.ended) clip.currentTime = 0;
      clip.play().then(() => { listen.textContent = "❚❚"; listen.setAttribute("aria-label", "Mettre en pause"); status.textContent = ""; }).catch(() => { status.textContent = "La lecture est impossible pour l’instant."; finished = true; if (!body.classList.contains("mq-quizzing")) next.hidden = false; });
    };
    next.onclick = (event) => { event.stopPropagation(); advance(); };
    if (resumeIndex !== null) showQuestion(resumeIndex);
  };
  const transitionToDuo = async () => {
    if (transitioning) return; transitioning = true;
    const veil = $(".mq-transition", overlay), reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      veil.style.pointerEvents = "auto";
      const fadeIn = veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, fill: "forwards", easing: "ease-in-out" });
      await fadeIn.finished.catch(() => {});
      if (!overlay.isConnected) return;
      veil.style.opacity = "1"; fadeIn.cancel();
    }
    showListening("duo");
    if (!reduced) {
      const fadeOut = veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 850, fill: "forwards", easing: "ease-in-out" });
      await fadeOut.finished.catch(() => {});
      veil.style.opacity = "0"; fadeOut.cancel(); veil.style.pointerEvents = "none";
    }
    transitioning = false;
  };
  const first = replay ? 0 : entry.questions.findIndex((question, index) => !has(questionKey(question, index)));
  if (first < 0) victory(); else if (first < 2) showListening("opening", first || null); else showListening("duo", first);
}
async function renderMusicCollection() {
  const v = $("#v-music"); menuSay("Chaque fragment de partition a sa musique. Retrouve-les ici, matelot.");
  let items;
  try { items = await musicCatalog(); } catch { v.textContent = "La bibliothèque musicale est momentanément indisponible."; return; }
  if (tab !== "music") return;
  const discovered = items.filter((item) => has(`music:${item.id}:found`) || has(`music:${item.id}:won`));
  v.innerHTML = discovered.length ? discovered.map((item) => `<article class="music-fragment"><img src="${esc(item.fragment)}" alt="Fragment de ${esc(item.title)}"><h2>${esc(item.title)}</h2><p>${has(`music:${item.id}:won`) ? "Fragment gagné" : "Défi musical à terminer"}</p><button type="button" data-music="${esc(item.id)}">${has(`music:${item.id}:won`) ? "Écouter le mouvement" : "Reprendre le défi"}</button></article>`).join("") : `<p class="music-empty">Les fragments de partition que tu découvriras apparaîtront ici.</p>`;
  $$("[data-music]", v).forEach((button) => button.onclick = () => {
    const item = items.find((x) => x.id === button.dataset.music); if (!item) return;
    if (has(`music:${item.id}:won`)) startMusicWalk(item); else openMusicChallenge(item.id, place(item.place), () => renderMusicCollection());
  });
}
// Grille des ponts : un disque gris par pont de Venise ; les ponts trouvés se révèlent dans l'ordre où l'enfant les a découverts.
function renderBridges() {
  const v = $("#v-bridges");
  Promise.all([bridgesReady, factsReady]).then(() => {
    if (tab !== "bridges" || !BRIDGES) return;
    const byId = new Map(BRIDGES.map((b) => [String(b[0]), b])), found = bridgeKeys().sort((x, y) => S.done[x].t - S.done[y].t).map((k) => byId.get(k.slice(2))).filter(Boolean);
    const n = found.length, say = n ? `Voici les ponts que tu as trouvés, ${gradeLc()} : **${n}** sur ${BRIDGES.length}. Bravo, camarade !` : `Tu n'as pas encore trouvé de pont, ${gradeLc()}. Dès que tu en traverses un, il viendra s'ajouter ici !`;
    menuSay(say);
    // Mosaïque des ponts trouvés qui ont une image (le nom en discret) ; les autres sont simplement comptés à la fin.
    const withImg = found.filter((b) => b[3]), noImg = found.length - withImg.length;
    // Mosaïque « naturelle » : chaque photo a un format légèrement différent (recadrage), les rangées ont des hauteurs variées et se remplissent jusqu'au bord ; photos collées, fine bordure noire.
    const arOf = (id) => 0.85 + (((Number(id) * 2654435761) >>> 0) % 1000) / 1000 * 1.15, W = Math.max(200, v.clientWidth - 28), heights = [150, 118, 136, 168, 124], rows = [];
    let cur = [], sum = 0;
    withImg.forEach((b) => { const ar = arOf(b[0]), h0 = heights[rows.length % heights.length]; cur.push({ b, ar }); sum += ar; if (sum * h0 + 3 * (cur.length - 1) >= W) { rows.push({ cur, h: Math.min(h0 * 1.35, (W - 3 * (cur.length - 1)) / sum), full: true }); cur = []; sum = 0; } });
    if (cur.length) rows.push({ cur, h: heights[rows.length % heights.length] * 0.95, full: false });
    v.innerHTML = `<div class="bmos">${rows.map((r) => `<div class="bmr" style="height:${Math.round(r.h)}px">${r.cur.map(({ b, ar }) => `<button type="button" class="bm" data-b="${b[0]}" aria-label="${esc(b[1] || "Pont sans nom")}" style="flex:${r.full ? ar : 0} 1 ${r.full ? 0 : Math.round(ar * r.h)}px;background-image:url(img/ponts/${b[0]}.webp)"></button>`).join("")}</div>`).join("")}</div>${noImg ? `<p class="bm-more">+ ${noImg} pont${noImg > 1 ? "s" : ""} sans image</p>` : ""}`;
    $$(".bm", v).forEach((d) => (d.onclick = () => bridgeCard(byId.get(d.dataset.b))));
  });
}
function bridgeCard(b) {
  const fact = FACTS && FACTS.summary && FACTS.summary[b[0]], when = S.done["b:" + b[0]], d = when ? new Date(when.t).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "";
  modal(`<div class="bcard-img" style="background-image:url(${b[3] ? `img/ponts/${b[0]}.webp` : "img/ponts/_generic.webp"})"></div><h2>${esc(b[1] || "Un pont sans nom")}</h2>${d ? `<p class="muted" style="text-align:center">Trouvé le ${d}</p>` : ""}<p>${fact ? richText(fact) : "Tu as traversé ce pont !"}</p><button class="btn blue wide" data-close>Fermer</button>`);
}
function renderDays() {
  const v = $("#v-days"), n = PLACES.filter(complete).length;
  // Mosaïque des défis : l'icône du lieu quand elle existe, sinon sa pastille photo ; grisés tant que le défi n'est pas réalisé, éclatants une fois terminé.
  menuSay(`Relève des défis, moussaillon, si tu veux progresser dans l'aventure !${n ? ` Déjà **${n}** lieu${n > 1 ? "x" : ""} terminé${n > 1 ? "s" : ""}.` : ""}`);
  v.innerHTML = `<p class="dg-count"><b>${n}</b> / ${PLACES.length} lieux terminés</p>
    <div class="dgrid">${PLACES.map((p) => { const ic = PLACE_ICONS[p.id], ok = complete(p); return `<button type="button" class="dt ${ok ? "ok" : "todo"}${ic ? " ico" : ""}" data-p="${p.id}" aria-label="${esc(p.name)}" title="${esc(p.name)}">${ic ? `<img src="${ic.src}" alt="">` : `<span class="ph" style="background-image:url(${pic(p.id)})"></span>`}</button>`; }).join("")}</div>`;
  $$(".dt", v).forEach((b) => (b.onclick = () => { setTab("map"); openPlaceBump(b.dataset.p); }));
}

const cc = (id) => collCount(COLLECTIONS.find((c) => c.id === id));
const BADGES = [
  { e: "👣", n: "Premiers pas", ok: () => PLACES.some((p) => arrived(p.id)) },
  { e: "🧭", n: "10 lieux trouvés", ok: () => PLACES.filter((p) => arrived(p.id)).length >= 10 },
  { e: "🦁", n: "Chasseur de lions", ok: () => cc("lion") >= 5 },
  { e: "🌉", n: "Roi des ponts", ok: () => bridgeCount() >= 10 },
  { e: "🍦", n: "Gourmand", ok: () => cc("gelato") >= 5 },
  { e: "🐈", n: "Ami des chats", ok: () => cc("chat") >= 5 },
  { e: "🧠", n: "Petit génie", ok: () => PLACES.reduce((n, p) => n + p.tasks.filter((t, i) => t.t === "choice" && taskDone(p.id, i)).length, 0) >= 10 },
  { e: "🏝️", n: "Marin des îles", ok: () => ["murano", "burano", "torcello"].every(arrived) },
  { e: "🗺️", n: "20 lieux trouvés", ok: () => visited() >= 20 },
  { e: "🗝️", n: "Corte Sconta ouverte", ok: () => has("finale") },
  { e: "🎁", n: "Collectionneur", ok: () => COLLECTIONS.every((c) => collCount(c) >= c.target) },
  { e: "💰", n: "500 points", ok: () => points() >= 500 },
  { e: "🌟", n: "Maître de Venise", ok: () => PLACES.every(complete) },
  { e: "👑", n: "Gardiens du Lion", ok: () => has("finale") },
];
/* ───────── Objets de poche : les trois trésors du parcours et douze futurs objets à collectionner. ─────────
   PREVIEW_OBJECTS présente le catalogue entier sans attribuer les objets au joueur ni les synchroniser.
   Les trésors existants gardent leur clé tr:<lieu> ; les nouveaux utiliseront o:<id> quand une épreuve les remettra. */
const PREVIEW_OBJECTS = DEV;
const OBJECTS = [
  { id: "frari", name: "La coquille d’or", img: "coquille.svg", key: "tr:frari" },
  { id: "miracoli", name: "La perle du miracle", img: "perle.svg", key: "tr:miracoli" },
  { id: "basilique", name: "La plume de l’évangéliste", img: "plume.svg", key: "tr:basilique" },
  { id: "coffre-code", name: "Le coffret à code", img: "coffre-code.svg", key: "o:coffre-code" },
  { id: "parchemin", name: "Le parchemin déchiré", img: "parchemin.svg", key: "o:parchemin" },
  { id: "partition", name: "La partition oubliée", img: "partition.svg", key: "o:partition" },
  { id: "cle-bronze", name: "La clé de bronze", img: "cle-bronze.svg", key: "o:cle-bronze" },
  { id: "fiole-lagune", name: "La fiole de lagune", img: "fiole-lagune.svg", key: "o:fiole-lagune" },
  { id: "verre-murano", name: "La goutte de Murano", img: "verre-murano.svg", key: "o:verre-murano" },
  { id: "boussole", name: "La boussole de poche", img: "boussole.svg", key: "o:boussole" },
  { id: "masque", name: "Le masque miniature", img: "masque.svg", key: "o:masque" },
  { id: "sceau-lion", name: "Le sceau du lion", img: "sceau-lion.svg", key: "o:sceau-lion" },
  { id: "diamant", name: "Le diamant de la lagune", img: "diamant.svg", key: "o:diamant" },
  { id: "ruban-soie", name: "Le ruban de soie", img: "ruban-soie.svg", key: "o:ruban-soie" },
  { id: "lanterne", name: "La lanterne secrète", img: "lanterne.svg", key: "o:lanterne" },
];
const objectList = () => [
  ...OBJECTS,
  ...Object.entries(narrativeData?.items || {}).map(([id, item]) => ({ id: "nv-" + id, name: item.name, emoji: item.emoji, key: `n:item:${id}` }))
].map((o) => ({ ...o, img: o.img ? "img/objets/" + o.img : null, found: has(o.key) }));
// Objet « pris » : il quitte sa case et se pose entre les étoiles et les onglets. Il y reste sur la carte et après un rechargement.
const HELD_KEY = "vq_held", HELD_SIZE = 88;
let heldEl = null, heldId = null; try { heldId = localStorage.getItem(HELD_KEY) || null; } catch {}
const saveHeld = () => { try { heldId ? localStorage.setItem(HELD_KEY, heldId) : localStorage.removeItem(HELD_KEY); } catch {} };
const HELD_POS = "vq_held_pos";
const clampHeld = (p) => {
  const size = Math.max(1, Math.min(p.size || HELD_SIZE, innerWidth - 8, innerHeight - 8));
  return { left: Math.max(4, Math.min(innerWidth - size - 4, p.left)), top: Math.max(4, Math.min(innerHeight - size - 4, p.top)), size, docked: !!p.docked };
};
const heldDock = () => {
  const score = $("#hud-score")?.getBoundingClientRect(), tabs = $("#up-bar .up-tabs")?.getBoundingClientRect();
  if (!score || !tabs) return clampHeld({ left: innerWidth - 64, top: 54, size: 56, docked: true });
  const gap = Math.max(1, tabs.top - score.bottom), size = Math.min(56, Math.max(1, gap - 12));
  return clampHeld({ left: score.right - size, top: score.bottom + (gap - size) / 2, size, docked: true });
};
const heldSpot = () => {
  try {
    const p = JSON.parse(localStorage.getItem(HELD_POS));
    if (p && Number.isFinite(p.left) && Number.isFinite(p.top)) return p.docked && tab === "objects" ? heldDock() : clampHeld(p);
  } catch {}
  return tab === "objects" ? heldDock() : clampHeld({ left: innerWidth - HELD_SIZE - 8, top: Math.round(innerHeight * 0.36), size: HELD_SIZE });
};
function mountHeld(id, fromRect) {
  const o = objectList().find((x) => x.id === id && (x.found || PREVIEW_OBJECTS)); if (!o) { heldId = null; saveHeld(); return; }
  if (heldEl) heldEl.remove();
  const el = document.createElement("div"); el.className = "held-ob"; el.dataset.o = id; el.innerHTML = o.img ? `<img src="${o.img}" alt="">` : `<span class="ob-em">${o.emoji}</span>`;
  const p = heldSpot(); el.style.cssText = `left:${p.left}px;top:${p.top}px;width:${p.size}px;height:${p.size}px`;
  if (p.docked) try { localStorage.setItem(HELD_POS, JSON.stringify(p)); } catch {}
  document.body.appendChild(el); heldEl = el;
  if (fromRect) el.animate([{ transform: `translate(${fromRect.left + fromRect.width / 2 - (p.left + p.size / 2)}px, ${fromRect.top + fromRect.height / 2 - (p.top + p.size / 2)}px) scale(${fromRect.width / p.size})` }, { transform: "scale(1.12)", offset: 0.7 }, { transform: "none" }], { duration: 560, easing: "cubic-bezier(.2,.9,.3,1)" }).onfinish = () => el.classList.add("wob"); else el.classList.add("wob");
  // L'enfant peut le déplacer où il veut avec le doigt (il restera là où il le lâche) ; un simple toucher, dans l'onglet Objets, le repose.
  el.style.touchAction = "none"; let st = null;
  const zone = () => { let z = $("#ranger"); if (!z) { z = document.createElement("div"); z.id = "ranger"; z.innerHTML = '<b>Ranger</b><span></span>'; document.body.appendChild(z); } return z; };
  const inZone = () => { const z = $("#ranger"); if (!z) return false; const a = z.getBoundingClientRect(), b = el.getBoundingClientRect(); return Math.hypot(a.left + a.width / 2 - (b.left + b.width / 2), a.top + a.height / 2 - (b.top + b.height / 2)) < a.width / 2 + 10; };
  el.onpointerdown = (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); st = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false }; try { el.setPointerCapture(e.pointerId); } catch {} };
  el.onpointermove = (e) => { if (!st) return; if (tab === "objects") { if (Math.hypot(e.clientX - st.x, e.clientY - st.y) >= 6) st.blocked = true; return; } if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) < 6) return; if (!st.moved && tab === "map") { const z = zone(); $("span", z).textContent = o.name; z.classList.add("on"); } st.moved = true; el.classList.add("drag"); const q = clampHeld({ left: e.clientX - st.dx, top: e.clientY - st.dy, size: parseFloat(el.style.width) }); el.style.left = q.left + "px"; el.style.top = q.top + "px"; const zz = $("#ranger"); if (zz) zz.classList.toggle("hot", inZone()); };
  const hideZone = () => { const z = $("#ranger"); if (z) z.classList.remove("on", "hot"); };
  const end = () => { if (!st) return; const moved = st.moved, blocked = st.blocked; st = null; el.classList.remove("drag"); if (blocked) return;
    if (moved) { if (tab === "map" && inZone()) { storeHeld(el); hideZone(); return; } hideZone(); try { localStorage.setItem(HELD_POS, JSON.stringify({ left: parseFloat(el.style.left), top: parseFloat(el.style.top), size: parseFloat(el.style.width), docked: false })); } catch {} }
    else if (tab === "objects") { const b = $(`.ob[data-o="${id}"]`); if (b) holdObject(b); } };
  el.onpointerup = end; el.onpointercancel = () => { st = null; el.classList.remove("drag"); const z = $("#ranger"); if (z) z.classList.remove("on", "hot"); };
}
// Lâché dans la zone « Ranger » (en haut de la carte) : l'objet retourne dans le coffret (l'onglet Objets), il n'est plus en main.
function storeHeld(el) {
  const z = $("#ranger"), zr = z ? z.getBoundingClientRect() : null, r = el.getBoundingClientRect(); heldEl = null; heldId = null; saveHeld(); try { localStorage.removeItem(HELD_POS); } catch {} el.classList.remove("wob");
  el.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${zr ? zr.left + zr.width / 2 - (r.left + r.width / 2) : 0}px, ${zr ? zr.top + zr.height / 2 - (r.top + r.height / 2) : 0}px) scale(.2)`, opacity: 0 }], { duration: 340, easing: "ease-in", fill: "forwards" }).onfinish = () => el.remove();
}
// L'objet en main n'est visible que sur la carte nue et dans l'onglet Objets (jamais dans une fiche, un défi, une conversation, un autre onglet…)
setInterval(() => {
  if (!heldEl) return;
  const bare = tab === "map" && $("#sheet").hidden && $("#quest").hidden && $("#modal").hidden && !document.body.classList.contains("corto-talk") && !document.body.classList.contains("intro-open") && !document.querySelector(".cer,.wview,.pview,.mont,.finale,.doge-msg:not(.menu-say),.pf,.cam,.ocam,.wq,.in2,.plan-photo");
  heldEl.style.visibility = bare || tab === "objects" ? "" : "hidden";
}, 200);
function releaseHeld() {
  if (!heldEl) { heldId = null; saveHeld(); return; }
  const el = heldEl, id = heldId, b = $(`.ob[data-o="${id}"]`); heldEl = null; heldId = null; saveHeld(); el.classList.remove("wob"); try { localStorage.removeItem(HELD_POS); } catch {}
  if (b) { b.classList.remove("away"); const from = el.getBoundingClientRect(), to = b.getBoundingClientRect(); el.animate([{ transform: "none" }, { transform: `translate(${to.left + to.width / 2 - (from.left + from.width / 2)}px, ${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(${to.width / from.width})` }], { duration: 380, easing: "ease-in-out", fill: "forwards" }).onfinish = () => el.remove(); } else el.remove();
}
function holdObject(btn) {
  const id = btn.dataset.o; if (heldId === id) { releaseHeld(); return; }
  if (heldId) releaseHeld();
  heldId = id; saveHeld(); try { localStorage.removeItem(HELD_POS); } catch {} btn.classList.add("away"); mountHeld(id, btn.getBoundingClientRect());
}
// Zone de mélange locale : un objet déposé quitte sa case et reste entièrement dans le cercle.
const OBJECT_PIECE_SIZE = 54;
const objectAssembly = new Map();
const assemblyRadius = (board) => Math.max(0, Math.min(board.clientWidth, board.clientHeight) / 2 - OBJECT_PIECE_SIZE / 2 - 4);
function assemblyPoint(board, clientX, clientY) {
  const r = board.getBoundingClientRect();
  const dx = clientX - (r.left + r.width / 2), dy = clientY - (r.top + r.height / 2);
  const distance = Math.hypot(dx, dy), radius = assemblyRadius(board);
  const ratio = distance ? Math.min(1, radius / distance) : 1;
  return { x: radius ? dx * ratio / radius : 0, y: radius ? dy * ratio / radius : 0 };
}
function assemblyPlace(piece, board, point) {
  const radius = assemblyRadius(board);
  piece.style.left = `${board.clientWidth / 2 - OBJECT_PIECE_SIZE / 2 + point.x * radius}px`;
  piece.style.top = `${board.clientHeight / 2 - OBJECT_PIECE_SIZE / 2 + point.y * radius}px`;
}
function renderObjectAssembly() {
  const board = $("#ob-assembly"); if (!board) return;
  board.classList.toggle("filled", objectAssembly.size > 0);
  $$(".ob", $("#v-objects")).forEach((button) => button.classList.toggle("in-assembly", objectAssembly.has(button.dataset.o)));
  board.querySelectorAll(".ob-piece").forEach((piece) => piece.remove());
  objectAssembly.forEach((point, id) => {
    const object = objectList().find((o) => o.id === id); if (!object) return;
    const piece = document.createElement("button"); piece.type = "button"; piece.className = "ob-piece";
    piece.setAttribute("aria-label", `Remettre ${object.name} dans les objets`); piece.title = object.name; piece.innerHTML = object.img ? `<img src="${object.img}" alt="">` : `<span class="ob-em">${esc(object.emoji || "📜")}</span>`;
    board.appendChild(piece); assemblyPlace(piece, board, point);
    let start = null;
    piece.onpointerdown = (e) => { e.preventDefault(); start = { x: e.clientX, y: e.clientY, moved: false }; try { piece.setPointerCapture(e.pointerId); } catch {} };
    piece.onpointermove = (e) => { if (!start) return; if (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return; start.moved = true; const next = assemblyPoint(board, e.clientX, e.clientY); objectAssembly.set(id, next); assemblyPlace(piece, board, next); };
    piece.onpointerup = () => { if (!start) return; const moved = start.moved; start = null; if (!moved) { objectAssembly.delete(id); renderObjectAssembly(); } };
    piece.onpointercancel = () => { start = null; };
    piece.onclick = (e) => { if (e.detail === 0) { objectAssembly.delete(id); renderObjectAssembly(); } };
  });
}
function bindObjectDrag(button) {
  let start = null, ghost = null;
  const removeGhost = () => { if (ghost) ghost.remove(); ghost = null; };
  button.onpointerdown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); start = { x: e.clientX, y: e.clientY, moved: false };
    try { button.setPointerCapture(e.pointerId); } catch {}
  };
  button.onpointermove = (e) => {
    if (!start) return;
    if (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 7) return;
    start.moved = true;
    if (!ghost) { ghost = document.createElement("img"); ghost.className = "ob-ghost"; ghost.src = $("img", button).src; ghost.alt = ""; document.body.appendChild(ghost); }
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
  };
  button.onpointerup = (e) => {
    if (!start) return;
    const moved = start.moved; start = null; removeGhost();
    if (!moved) { holdObject(button); return; }
    const board = $("#ob-assembly"), r = board?.getBoundingClientRect();
    if (r && Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) <= Math.min(r.width, r.height) / 2) {
      if (heldId === button.dataset.o) { heldEl?.remove(); heldEl = null; heldId = null; saveHeld(); try { localStorage.removeItem(HELD_POS); } catch {} }
      objectAssembly.set(button.dataset.o, assemblyPoint(board, e.clientX, e.clientY));
      renderObjectAssembly();
    }
  };
  button.onpointercancel = () => { start = null; removeGhost(); };
  button.onclick = (e) => { if (e.detail === 0) holdObject(button); };
}
function renderObjects() {
  const v = $("#v-objects"), objects = objectList();
  const shown = PREVIEW_OBJECTS ? objects : objects.filter((o) => o.found);
  menuSay(shown.length ? "Collectionne ces objets ici et vois ce que tu peux faire avec." : "Tu n'as encore trouvé aucun objet. Cherche bien dans les lieux : ils pourront te servir !");
  v.innerHTML = shown.length ? `<div class="ogrid">${shown.map((o) => `<button type="button" class="ob${o.id === heldId ? " away" : ""}${objectAssembly.has(o.id) ? " in-assembly" : ""}" data-o="${o.id}" aria-label="${esc(o.name)}" title="${esc(o.name)}">${o.img ? `<img src="${o.img}" alt="">` : `<span class="ob-em">${esc(o.emoji || "📜")}</span>`}</button>`).join("")}</div><div id="ob-assembly" class="ob-assembly" aria-label="Zone de mélange"><span class="ob-workhint">Combine tes objets ici</span></div>` : "";
  $$(".ob", v).forEach(bindObjectDrag);
  renderObjectAssembly();
}
if (DEV) window.__objects = {
  list: objectList,
  find: (id) => { const o = OBJECTS.find((item) => item.id === id); if (o && !has(o.key)) { award(o.key, 0, meIdx()); save(); refreshAll(); if (tab === "objects") renderObjects(); } },
  reset: () => { OBJECTS.filter((o) => has(o.key)).forEach((o) => unaward(o.key)); objectAssembly.clear(); heldId = null; saveHeld(); if (heldEl) { heldEl.remove(); heldEl = null; } save(); refreshAll(); if (tab === "objects") renderObjects(); },
  hold: (id) => { const o = OBJECTS.find((item) => item.id === id); if (!o) return; if (!PREVIEW_OBJECTS && !has(o.key)) window.__objects.find(id); objectAssembly.delete(id); heldId = id; saveHeld(); mountHeld(id); if (tab === "objects") renderObjects(); },
};
if (heldId) {
  // Le catalogue narratif arrive après le chargement initial ; attendre ses données avant de replacer un objet narratif tenu.
  if (heldId.startsWith("nv-")) narrativeReady.then(() => { if (heldId) mountHeld(heldId); });
  else setTimeout(() => mountHeld(heldId), 0);
}
function syncHeldPosition() {
  if (!heldEl) return;
  const p = heldSpot(); heldEl.style.left = p.left + "px"; heldEl.style.top = p.top + "px";
  heldEl.style.width = p.size + "px"; heldEl.style.height = p.size + "px";
  if (p.docked) try { localStorage.setItem(HELD_POS, JSON.stringify(p)); } catch {}
}
addEventListener("resize", syncHeldPosition);

/* ───────── Œuvres de maîtres : la collection de toiles trouvées au fil des épreuves ─────────
   Base : data/oeuvres.json (61 œuvres, 19 artistes, 16 lieux, 5 questions par œuvre pour les épreuves à venir). Une toile trouvée = S.done["w:" + id] (étoiles POINTS.work), donc synchronisée comme le reste. */
let WORKS = null;
const loadWorks = () => (WORKS ||= fetch("data/oeuvres.json").then((r) => r.json()).catch(() => { WORKS = null; return { artistes: [], lieux: {}, oeuvres: [] }; }));
const workFound = (id) => has("w:" + id);
async function findWork(id, opts = {}) { // appelée quand l'enfant réussit l'épreuve qui lui fait gagner cette toile
  const W = await loadWorks(), w = W.oeuvres.find((x) => x.id === id); if (!w) return false;
  if (workFound(id)) return false;
  award("w:" + id, POINTS.work, meIdx()); save(); renderHud(); if (tab === "works") renderWorks();
  if (!opts.silent) { const a = W.artistes.find((x) => x.cle === w.artiste); cortoSays(`Bravo matelot ! Tu as trouvé une toile de ${a ? a.nom : w.artisteNom} : « ${w.titre.length > 60 ? w.titre.slice(0, 57) + "…" : w.titre} ». +${POINTS.work} ★ !`); }
  return true;
}
async function flyWorkToBook(w) {
  const book = $("#home-btn"), target = book && book.getBoundingClientRect();
  if (!target) return;
  const cx = innerWidth / 2, cy = innerHeight * .56, tx = target.left + target.width / 2, ty = target.top + target.height / 2;
  const ratio = w.ratio || .7, height = Math.min(innerHeight * .38, Math.min(innerWidth * .5, 200) / ratio), width = height * ratio;
  const art = document.createElement("img"); art.className = "work-flight"; art.src = w.thumb; art.alt = "";
  art.style.cssText = `left:${cx}px;top:${cy}px;width:${width}px;height:${height}px`;
  document.body.appendChild(art);
  try { await Promise.race([art.decode().catch(() => {}), sleep(800)]); } catch {}
  const dx = tx - cx, dy = ty - cy, reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    await art.animate(reduced ? [
      { transform: "translate(-50%,-50%) scale(.9)", opacity: 0 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.12)`, opacity: 1 },
    ] : [
      { transform: "translate(-50%,-50%) translateY(50px) rotate(-6deg) scale(.7)", opacity: 0 },
      { transform: "translate(-50%,-50%) translateY(-55px) rotate(8deg) scale(1.12)", opacity: 1, offset: .32 },
      { transform: "translate(-50%,-50%) translateY(-100px) rotate(-5deg) scale(1.05)", opacity: 1, offset: .58 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(12deg) scale(.12)`, opacity: 1 },
    ], { duration: reduced ? 250 : 2400, easing: "ease-in-out", fill: "forwards" }).finished.catch(() => {});
  } finally { art.remove(); }
  book.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)", offset: .45 }, { transform: "scale(1)" }], { duration: 430 });
}
function rainWorkStars() {
  const book = $("#home-btn"), r = book && book.getBoundingClientRect(); if (!r) return;
  const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  for (let i = 0; i < 20; i++) {
    const x = innerWidth * (.1 + Math.random() * .8), y = -30 - Math.random() * 110;
    const s = document.createElement("div"); s.className = "work-rain-star"; s.innerHTML = STAR_SVG; s.style.cssText = `left:${x}px;top:${y}px`;
    document.body.appendChild(s);
    s.animate([
      { transform: "translate(0,0) rotate(0deg) scale(.4)", opacity: 0 },
      { opacity: 1, offset: .25 },
      { transform: `translate(${tx - x}px,${ty - y}px) rotate(320deg) scale(.45)`, opacity: 0 },
    ], { duration: 750 + i * 16, delay: i * 32, easing: "ease-in", fill: "forwards" }).finished.finally(() => s.remove()).catch(() => {});
  }
  starsToCounter(tx, ty, POINTS.work, true);
}
async function claimQuestionWork(id) {
  const W = await loadWorks(), w = W.oeuvres.find((item) => item.id === id);
  if (!w || workFound(id)) return null;
  await flyWorkToBook(w);
  if (!await findWork(id, { silent: true })) return null;
  rainWorkStars();
  return w;
}
if (DEV) window.__works = { find: findWork, load: loadWorks, all: async () => (await loadWorks()).oeuvres.map((w) => w.id), reset: async () => { (await loadWorks()).oeuvres.forEach((w) => { if (workFound(w.id)) unaward("w:" + w.id); }); save(); renderHud(); if (tab === "works") renderWorks(); } };
const WORKS_MSG = "Collectionne les toiles de maîtres : elles s'afficheront ici en hommage à ta ténacité et te rapporteront un max d'étoiles !";
// Mosaïque justifiée (mêmes règles que les ponts : rangées de hauteurs variées jusqu'au bord, photos légèrement espacées, dernière rangée incomplète à sa taille naturelle)
function mosaicHtml(items, W, cls) {
  const heights = [150, 118, 136, 168, 124], rows = []; let cur = [], sum = 0;
  items.forEach((it) => { const h0 = heights[rows.length % heights.length]; cur.push(it); sum += it.ar; if (sum * h0 + 3 * (cur.length - 1) >= W) { rows.push({ cur, h: Math.min(h0 * 1.35, (W - 3 * (cur.length - 1)) / sum), full: true }); cur = []; sum = 0; } });
  if (cur.length) rows.push({ cur, h: heights[rows.length % heights.length] * 0.95, full: false });
  return `<div class="bmos ${cls}">${rows.map((r) => `<div class="bmr" style="height:${Math.round(r.h)}px">${r.cur.map((it) => `<button type="button" class="bm" ${it.attr} aria-label="${esc(it.label)}" style="flex:${r.full ? it.ar : 0} 1 ${r.full ? 0 : Math.round(it.ar * r.h)}px;background-image:url(${it.img})"></button>`).join("")}</div>`).join("")}</div>`;
}
async function renderWorks() {
  const v = $("#v-works"), W = await loadWorks(); if (tab !== "works") return;
  menuSay(WORKS_MSG);
  // Un peintre n'apparaît qu'à partir de sa première toile trouvée ; seules les toiles trouvées sont affichées (rien d'autre : l'onglet reste vide au départ)
  const cw = Math.max(200, v.clientWidth - 28);
  v.innerHTML = W.artistes.map((a) => { const got = W.oeuvres.filter((w) => w.artiste === a.cle && workFound(w.id)); return got.length ? `<section class="wk-art"><h3>${esc(a.nom)}</h3>${mosaicHtml(got.map((w) => ({ ar: Math.max(0.5, Math.min(2.2, w.ratio)), img: w.thumb, label: w.titre, attr: `data-w="${w.id}"` })), cw, "wk")}</section>` : ""; }).join("");
  $$(".bm[data-w]", v).forEach((b) => (b.onclick = () => openWorkView(W, b.dataset.w)));
}
function openWorkView(W, id) {
  const w = W.oeuvres.find((x) => x.id === id); if (!w) return; const a = W.artistes.find((x) => x.cle === w.artiste), lieu = W.lieux[w.lieu];
  const cc = w.droits && w.droits.statut === "libre_avec_conditions" ? `Photo : ${esc(w.droits.credit || "")} · ${esc(w.droits.licence || "")}` : w.droits && w.droits.credit ? `Photo : ${esc(w.droits.credit)}` : "";
  const o = document.createElement("div"); o.className = "wview";
  o.innerHTML = `<div class="wv-img"><img src="${w.img}" alt="" onerror="this.parentNode.classList.add('noimg')"></div>
    <div class="wv-card"><h3>${esc(a ? a.nom : w.artisteNom)}</h3><p class="wv-title">${esc(w.titre)}</p><p class="wv-desc">${esc(w.desc)}</p>
    <p class="wv-where">📍 ${esc(lieu ? lieu.nom : "")}${w.ou ? " — " + esc(w.ou) : ""}</p><p class="wv-stars">⭐ +${POINTS.work} étoiles gagnées</p>${cc ? `<p class="wv-credit">${cc}</p>` : ""}</div>
    <button type="button" class="wv-back" aria-label="Retour">‹ Retour</button>`;
  document.body.appendChild(o);
  try { history.pushState({ vqView: 1 }, ""); } catch {}
  let open = true; viewClose = () => { if (!open) return; open = false; o.remove(); viewClose = null; };
  $(".wv-back", o).onclick = () => { if (history.state && history.state.vqView) history.back(); else viewClose && viewClose(); };
}
function renderTrophies() {
  const v = $("#v-trophies"), pts = pointsOf(meIdx()), li = level(pts), cur = LEVELS[li], nx = LEVELS[li + 1];
  menuSay(nx ? `Tu as **${pts}** étoiles, ${gradeLc()} ! Encore ${nx.min - pts} pour devenir ${nx.name}.` : `Tu as **${pts}** étoiles : tu es au niveau maximum, bravo !`);
  v.innerHTML = `<h2>🏆 Trophées</h2>
    <div class="levelcard"><div class="big">${cur.emoji}</div><h3 style="color:#fff;margin:4px 0">${me().avatar} ${esc(myName())} · ${cur.name}</h3><div style="font-size:30px;font-weight:900">⭐ ${pts}</div>
      <div class="bar"><i style="width:${nx ? ((pts - cur.min) / (nx.min - cur.min)) * 100 : 100}%"></i></div>
      <div style="font-size:14px;margin-top:6px">${nx ? `Encore ${nx.min - pts} ⭐ pour devenir ${nx.emoji} ${nx.name}` : "Niveau maximum !"}</div></div>
    <h3>🏁 Classement de la partie</h3><div class="card" id="board"><p class="muted">Chargement…</p></div>
    <h3>👫 L'équipe</h3><div class="card">${S.kids.map((k, j) => `<div class="row" style="padding:4px 0"><span style="font-size:28px">${k.avatar}</span><span class="grow">${esc(k.name || "Joueur " + (j + 1))}</span><b>⭐ ${pointsOf(j)}</b></div>`).join("")}<div class="row" style="border-top:2px solid var(--line);padding-top:8px;margin-top:4px"><span class="grow"><b>Total de l'équipe</b></span><b>⭐ ${points()}</b></div></div>
    <p class="muted" style="text-align:center;margin-top:10px">${finaleOpen() ? "🗝️ La Corte Sconta t'attend !" : `Encore ${FINALE_AT - visited()} lieux à explorer pour ouvrir la Corte Sconta.`}</p>
    <h3>🎒 Album d'autocollants</h3><div class="grid">${PLACES.map((p) => `<div class="sticker pic ${complete(p) ? "got" : arrived(p.id) ? "seen" : "lock"}" style="--img:url(${pic(p.id)})"></div>`).join("")}</div>
    <h3>📸 Album photo</h3><div class="grid" id="album"><p class="muted">Aucune photo pour l'instant.</p></div><p class="muted">Les photos restent sur ce téléphone.</p>
    <h3>🌉 Ponts traversés</h3><div class="card"><b>${bridgeCount()} ${bridgeCount() > 1 ? "ponts" : "pont"}</b><div class="muted" id="bridge-list" style="margin-top:6px"></div></div>
    <h3>🔎 Collections</h3>${COLLECTIONS.map((c) => { const n = collCount(c); return `<div class="card coll"><span class="em">${c.emoji}</span><span class="grow">${esc(c.name)}</span><button class="pm minus" data-c="${c.id}" data-dir="-1" ${n ? "" : "disabled"}>−</button><span class="cnt">${n}/${c.target}</span><button class="pm" data-c="${c.id}" data-dir="1" ${n >= c.target ? "disabled" : ""}>+</button></div>`; }).join("")}
    <h3>🎒 Mes trésors</h3><div class="grid">${PLACES.filter((q) => q.reward).map((q) => has("tr:" + q.id) ? `<div class="badge got"><b>${q.reward.emoji}</b>${esc(q.reward.name)}</div>` : `<div class="badge lock"><b>❓</b>${esc(q.name)}</div>`).join("")}</div>
    <h3>🎖️ Médailles</h3><div class="grid">${BADGES.map((b) => `<div class="badge ${b.ok() ? "got" : "lock"}"><b>${b.e}</b>${esc(b.n)}</div>`).join("")}</div>`;
  bridgesReady.then(() => { const el = $("#bridge-list", v); if (!el || !BRIDGES) return; const byId = new Map(BRIDGES.map((b) => [String(b[0]), b])); el.textContent = bridgeKeys().sort((x, y) => S.done[y].t - S.done[x].t).map((k) => { const b = byId.get(k.slice(2)); return b ? (b[1] || "pont sans nom") : null; }).filter(Boolean).slice(0, 40).join(" · "); });
  renderBoard();
  allPhotos().then((ps) => { ps = ps.filter(([k, r]) => !(r && r.mont)); const al = $("#album", v); if (!al || !ps.length) return; al.innerHTML = ""; ps.sort((x, y) => y[1].t - x[1].t).forEach(([k, r]) => { const im = new Image(); im.src = URL.createObjectURL(r.blob); im.className = "ph"; im.onclick = () => modal(`<img class="full" src="${im.src}"><p>${esc(r.q || "")}</p><button class="btn blue wide" data-close>Fermer</button>`); al.appendChild(im); }); });
  $$("[data-c]", v).forEach((b) => (b.onclick = () => {
    const c = COLLECTIONS.find((x) => x.id === b.dataset.c), n = collCount(c);
    if (b.dataset.dir === "1") { award(`c:${c.id}:${n + 1}`, POINTS.coll, meIdx()); chime(); toast(`${c.emoji} +${POINTS.coll} ⭐`); if (n + 1 === c.target) confetti(80); } else unaward(`c:${c.id}:${n}`);
    save(); refreshAll(); renderTrophies();
  }));
}

// Plein écran par défaut : le navigateur l'exige après un geste, donc on l'active au premier toucher (sauf si l'appli est déjà installée en plein écran ou si le joueur l'a désactivé dans les Réglages).
const fsPref = () => { try { return localStorage.getItem("vq_fs") !== "0"; } catch { return true; } };
let fsDone = false; // une fois entré en plein écran, on ne force plus (si le joueur en sort, il en sort)
function enterFs() { const de = document.documentElement, f = de.requestFullscreen || de.webkitRequestFullscreen; if (!f) return; if (document.fullscreenElement || matchMedia("(display-mode: fullscreen)").matches) { fsDone = true; return; } try { const p = f.call(de, { navigationUI: "hide" }); if (p && p.then) p.then(() => { fsDone = true; }).catch(() => {}); else fsDone = true; } catch {} }
// Sur écran tactile, seul le RELÂCHEMENT du doigt (pointerup / touchend / click) compte comme geste autorisant le plein écran : pointerdown ne suffit pas. On réessaie à chaque toucher jusqu'au premier succès.
for (const ev of ["pointerup", "touchend", "click"]) addEventListener(ev, () => { if (!fsDone && fsPref()) enterFs(); }, { capture: true, passive: true });
/* ───────── Tenues de grade : chapeau + col posés sur la tête enregistrée ───────── */
// Les accessoires (img/outfit/<grade>-hat|col.webp) sont détourés des dessins de référence ; data/outfits.json donne leurs points d'ancrage.
const GRADE_KEYS = { Mousse: "mousse", Marin: "marin", Capitaine: "capitaine", Amiral: "amiral" }; // les quatre tenues retenues (grades sans tenue : pas de cérémonie d'habillage)
let OUTFITS = null; const imgCache = {};
const loadImg = (src) => (imgCache[src] ||= new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
function headMetrics(img, cut, frame) {
  const W = img.naturalWidth, H = img.naturalHeight;
  if (frame) { const F = frame === true ? FACE : frame; return { T: (F.cy - F.h / 2) * H, B: H, cx: F.cx * W, Wh: F.w * W, chin: (F.cy + F.h / 2) * H, oh: F.h * H }; } // cadrage standard : la tête est dans l'ovale, position connue
  if (!cut) return { T: H * 0.06, B: H, cx: W / 2, Wh: W * 0.56 }; // photo ronde : visage centré
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, W, H).data;
  let T = H, B = 0; for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (d[(y * W + xx) * 4 + 3] > 40) { if (y < T) T = y; B = y; }
  // largeur de la tête : la plus grande largeur de silhouette dans le haut (avant que les épaules ne s'élargissent)
  const hh = B - T, span = (y) => { let l = W, r = 0; for (let xx = 0; xx < W; xx++) if (d[(y * W + xx) * 4 + 3] > 40) { if (xx < l) l = xx; r = xx; } return [l, r]; };
  let best = [0, 0, 0]; for (let y = Math.round(T + hh * 0.12); y <= Math.round(T + hh * 0.36); y += 2) { const [l, r] = span(Math.min(H - 1, y)); if (r - l > best[2]) best = [l, r, r - l]; }
  return { T, B, cx: (best[0] + best[1]) / 2, Wh: Math.max(10, best[2]) };
}
async function composeOutfit(photo, cut, key, o = {}, frame = false) {
  const [head, hat, col] = await Promise.all([loadImg(photo), loadImg(`img/outfit/${key}-hat.webp`), loadImg(`img/outfit/${key}-col.webp`)]);
  const cfg = OUTFITS[key], m = headMetrics(head, cut, frame), W = head.naturalWidth, H = head.naturalHeight, pad = Math.round(m.Wh * 0.9);
  const ad = cfg.adj || {}, hs = (o.hs ?? 1.25) * (ad.hs ?? 1), hy = (o.hy ?? 0) + (ad.hy ?? 0), cw = (o.cw ?? 3.1) * (ad.cw ?? 1), cyy = (o.cy ?? 0) + (ad.cy ?? 0); // adj : retouche propre à chaque tenue (data/outfits.json)
  const CW = Math.max(W, Math.ceil(m.Wh * cw * 1.04)), ox = Math.round((CW - W) / 2); m.cx += ox; // la toile s'élargit pour que le col imposant ne soit pas rogné
  const cv = document.createElement("canvas"); cv.width = CW; cv.height = H + pad; const x = cv.getContext("2d"); x.imageSmoothingQuality = "high";
  if (!o.hatOnly && !o.garmentsOnly) x.drawImage(head, ox, pad);
  // col : sous le menton, fondu en haut pour se raccorder à la barbe
  const cs = (m.Wh * cw) / cfg.col.w, chin = pad + (m.chin ?? m.T + (m.B - m.T) * 0.62) + cyy * m.Wh, cx0 = m.cx - cfg.col.ax * cs, cy0 = chin - cfg.col.ay * cs;
  const t = document.createElement("canvas"); t.width = Math.ceil(col.naturalWidth * cs); t.height = Math.ceil(col.naturalHeight * cs); const tx = t.getContext("2d"); tx.drawImage(col, 0, 0, t.width, t.height);
  const g = tx.createLinearGradient(0, 0, 0, t.height); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(Math.min(1, 18 / t.height), "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,1)"); tx.globalCompositeOperation = "destination-in"; tx.fillStyle = g; tx.fillRect(0, 0, t.width, t.height); // fondu du haut seulement (destination-in efface tout hors du rectangle : un seul remplissage)
  // Le col s'arrête à sa vraie limite ; son bord suit le cercle doux du portrait enregistré.
  if (!o.hatOnly && !o.plain) {
    const radius = Math.min(W, H) * 0.49, feather = Math.min(18, radius * 0.13);
    const circleX = ox + W / 2 - cx0, circleY = pad + H * (frame ? 0.45 : 0.5) - cy0;
    const edge = tx.createRadialGradient(circleX, circleY, radius - feather, circleX, circleY, radius);
    edge.addColorStop(0, "#000"); edge.addColorStop(1, "transparent");
    tx.globalCompositeOperation = "destination-in"; tx.fillStyle = edge; tx.fillRect(0, 0, t.width, t.height);
    tx.globalCompositeOperation = "source-over"; x.drawImage(t, cx0, cy0);
  }
  // chapeau : bord inférieur au niveau du front
  const s = (m.Wh * hs) / cfg.hat.w, brim = pad + m.T + (m.oh ? 0.12 * m.oh : 0.28 * m.Wh) + hy * m.Wh;
  if (!o.noHat && !o.plain) x.drawImage(hat, m.cx - cfg.hat.ax * s, brim - cfg.hat.ay * s, hat.naturalWidth * s, hat.naturalHeight * s);
  if (o.oval && m.oh) { const y = cv.getContext("2d"); y.save(); y.strokeStyle = "rgba(255,255,255,.95)"; y.lineWidth = 2; y.setLineDash([6, 4]); y.beginPath(); y.ellipse(m.cx, pad + m.T + m.oh / 2, m.Wh / 2, m.oh / 2, 0, 0, Math.PI * 2); y.stroke(); y.restore(); }
  cv.outfitLayout = { w: W, h: H, cw: CW, ch: H + pad, ox, pad };
  return cv;
}
/* ───────── Cérémonie de changement de grade ───────── */
const OUTFIT_LEVELS = { 1: "mousse", 2: "marin", 3: "capitaine", 4: "amiral" }; // index de grade (LEVELS) -> tenue
const CER_TEXT = {
  mousse: "Tu n'es plus un simple touriste : te voilà MOUSSE ! Le capitaine compte sur toi.",
  marin: "Hissez haut ! Tu deviens MARIN, un vrai loup de mer.",
  capitaine: "Capitaine à bord ! Tu commandes désormais ton propre navire.",
  amiral: "Amiral ! Toute la flotte de Venise est à tes ordres.",
};
let ceremonyBusy = false;
async function wearOutfit(key, initialShift) { // pose (ou retire) les deux pièces sur la photo du profil
  const P = PROFILE; if (!P || !P.photo) return;
  if (!key) {
    for (const field of ["outfit", "outfitPhoto", "outfitOverlay", "outfitOverlayHat", "outfitOverlayBody", "outfitLayout", "outfitOverlayVersion", "outfitShift"]) delete P[field];
  } else {
    OUTFITS ||= await (await fetch("data/outfits.json")).json();
    const [body, hat] = await Promise.all([
      composeOutfit(P.photo, !!P.cut, key, { garmentsOnly: true, noHat: true }, P.frame || false),
      composeOutfit(P.photo, !!P.cut, key, { garmentsOnly: true, hatOnly: true }, P.frame || false),
    ]);
    const url = (canvas) => { const webp = canvas.toDataURL("image/webp", 0.9); return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png"); };
    P.outfit = key; P.outfitOverlayBody = url(body); P.outfitOverlayHat = url(hat);
    P.outfitLayout = body.outfitLayout; P.outfitOverlayVersion = 3;
    P.outfitShift = outfitPartShift(initialShift); delete P.outfitOverlay; delete P.outfitPhoto;
  }
  saveProfile(P); renderBadge(); renderHud(); renderProfileBar(); refreshUserMarker();
}
async function ceremony(key, li) {
  if (ceremonyBusy) return; ceremonyBusy = true;
  let ov;
  try {
    OUTFITS ||= await (await fetch("data/outfits.json")).json();
    const P = PROFILE, name = myName(), canDress = !!(P && P.photo && OUTFITS[key]);
    ov = document.createElement("div"); ov.className = "cer"; ov.tabIndex = 0;
    ov.innerHTML = `<div class="cer-top"><p class="cer-label">Un nouveau grade</p><p class="cer-message" aria-live="polite"></p></div><div class="cer-stage"></div><p class="cer-hint">Touche l'écran pour continuer</p>`;
    document.body.appendChild(ov);
    const bub = $(".cer-message", ov), stage = $(".cer-stage", ov);
    const say = (t) => { bub.textContent = t; bub.animate([{ transform: "translateY(8px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 350 }); };
    const corto = document.createElement("img"); corto.className = "cer-corto"; corto.src = "img/corto-content.webp"; stage.appendChild(corto); corto.animate([{ transform: "translateY(40px) scale(.8)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 500, easing: "cubic-bezier(.2,.9,.3,1.2)" });
    say(`Bravo ${name} ! ${CER_TEXT[key]}`); confetti(70);
    await ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: "both" }).finished;
    await new Promise((resolve) => {
      const advance = () => { ov.removeEventListener("click", advance); ov.removeEventListener("keydown", onKey); resolve(); };
      const onKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); } };
      ov.addEventListener("click", advance); ov.addEventListener("keydown", onKey); ov.focus({ preventScroll: true });
    });
    ov.classList.add("cer-dressing");
    if (canDress) {
      const had = P.outfit && OUTFITS[P.outfit] && P.outfit !== key ? P.outfit : null, f = P.frame || false;
      const cls = P.cut ? ` cut${f ? " frame" : ""}` : "";
      const portrait = document.createElement("span"); portrait.className = "avatar-dressed cer-avatar";
      portrait.innerHTML = `<img class="avatar-base${cls}" src="${P.photo}" alt="">`;
      const base = $(".avatar-base", portrait); if (base.decode) await base.decode().catch(() => {});
      const gear = async (grade, options = {}, shift = {}) => {
        const canvas = await composeOutfit(P.photo, !!P.cut, grade, { garmentsOnly: true, ...options }, f);
        const im = document.createElement("img"), webp = canvas.toDataURL("image/webp", 0.9);
        im.className = "avatar-gear"; im.src = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
        im.style.cssText = outfitStyle(canvas.outfitLayout, !!P.cut, f, shift);
        if (im.decode) await im.decode().catch(() => {});
        return { im, canvas };
      };
      const previousShift = outfitPartShift(P.outfitShift);
      const oldGear = had ? await Promise.all([
        gear(had, { noHat: true }, previousShift.body),
        gear(had, { hatOnly: true }, previousShift.hat),
      ]) : [];
      const bodyGear = await gear(key, { noHat: true }), hatGear = await gear(key, { hatOnly: true });
      const body = bodyGear.im, hat = hatGear.im;
      oldGear.forEach((part) => portrait.appendChild(part.im));
      const clothes = document.createElement("span"); clothes.className = "cer-clothes";
      await corto.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" }).finished; corto.remove();
      stage.appendChild(portrait);
      await portrait.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: "ease-out" }).finished;
      say(had ? "L'ancien uniforme s'en va…" : "Voici ton uniforme…");
      if (oldGear.length) {
        await Promise.all(oldGear.map(({ im }) => im.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(16px)" }], { duration: 450, fill: "forwards", easing: "ease-in" }).finished));
        oldGear.forEach(({ im }) => im.remove());
      }
      body.style.opacity = "0"; hat.style.opacity = "0"; clothes.append(body, hat); portrait.appendChild(clothes);
      await body.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 700, fill: "forwards", easing: "ease-out" }).finished; body.style.opacity = "1";
      await hat.animate([{ opacity: 0, transform: "translateY(-48px) rotate(-6deg)" }, { opacity: 1, transform: "translateY(5px) rotate(2deg)", offset: 0.75 }, { opacity: 1, transform: "none" }], { duration: 850, fill: "forwards", easing: "cubic-bezier(.3,.7,.4,1)" }).finished; hat.style.opacity = "1";
      await wearOutfit(key); confetti(100);
      say(`Magnifique, ${LEVELS[li].name.toLowerCase()} ${name} ! Cet uniforme te va comme un gant.`);
      const hint = $(".cer-hint", ov); hint.textContent = "Glisse le chapeau ou le col pour l'ajuster · touche ailleurs pour terminer";
      ov.classList.add("cer-adjusting");
      const shift = outfitPartShift(); let drag = null, ignoreNextClick = false;
      const hits = (part, e) => {
        const r = part.im.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) return false;
        const x = Math.floor((e.clientX - r.left) * part.canvas.width / r.width);
        const y = Math.floor((e.clientY - r.top) * part.canvas.height / r.height);
        return part.canvas.getContext("2d", { willReadFrequently: true }).getImageData(x, y, 1, 1).data[3] > 24;
      };
      const move = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const w = portrait.getBoundingClientRect().width || 1, piece = shift[drag.part];
        piece.x = Math.round(Math.max(-30, Math.min(30, drag.x + (e.clientX - drag.px) / w * 100)) * 10) / 10;
        piece.y = Math.round(Math.max(-25, Math.min(25, drag.y + (e.clientY - drag.py) / w * 100)) * 10) / 10;
        drag.image.style.cssText = outfitStyle(drag.canvas.outfitLayout, !!P.cut, f, piece);
      };
      stage.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const part = hits(hatGear, e) ? "hat" : hits(bodyGear, e) ? "body" : null;
        if (!part) return;
        const target = part === "hat" ? hatGear : bodyGear;
        const current = shift[part];
        drag = { id: e.pointerId, part, image: target.im, canvas: target.canvas, px: e.clientX, py: e.clientY, x: current.x, y: current.y };
        ignoreNextClick = true;
        try { stage.setPointerCapture(e.pointerId); } catch {}
        e.preventDefault();
      });
      stage.addEventListener("pointermove", move);
      const endDrag = (e) => { if (drag?.id === e.pointerId) { move(e); drag = null; if (e.type === "pointercancel") ignoreNextClick = false; else setTimeout(() => { ignoreNextClick = false; }, 400); } };
      stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag);
      await new Promise((resolve) => {
        const finish = (e) => {
          if (e?.type === "click" && ignoreNextClick) { ignoreNextClick = false; return; }
          if (e?.type === "click" && portrait.contains(e.target)) return;
          ov.removeEventListener("click", finish); ov.removeEventListener("keydown", onKey); resolve();
        };
        const onKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); finish(); } };
        ov.addEventListener("click", finish); ov.addEventListener("keydown", onKey);
      });
      P.outfitShift = shift; saveProfile(P); renderBadge(); renderHud(); renderProfileBar(); refreshUserMarker();
    }
    await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: "forwards" }).finished;
  } finally { ov?.remove(); ceremonyBusy = false; }
}
// Un nouveau grade à tenue a-t-il été atteint ? (au plus une cérémonie à la fois, jamais pendant une épreuve ou une animation)
function checkCeremony() {
  if (!PROFILE || ceremonyBusy || openId || tab !== "map" || scoreAnim || $(".wq, .finale, .corto-say, .cam, .pf, .intro")) return;
  const k = "vq_cer3_" + (PROFILE.name || ""), li = level(pointsOf(meIdx())); let last = null; try { last = localStorage.getItem(k); } catch {}
  if (last === null) { try { localStorage.setItem(k, String(li)); } catch {} return; } // première fois : pas de cérémonie rétroactive
  if (li < +last) { try { localStorage.setItem(k, String(li)); } catch {} return; }
  if (li <= +last) return;
  try { localStorage.setItem(k, String(li)); } catch {}
  let hit = null; for (let j = +last + 1; j <= li; j++) if (OUTFIT_LEVELS[j]) hit = j;
  if (hit !== null) ceremony(OUTFIT_LEVELS[hit], hit);
}
setInterval(checkCeremony, 2500);
if (DEV) { window.__ceremony = (key, li) => ceremony(key, li);
window.__compose = (...a) => composeOutfit(...a); window.__metrics = (i, c) => headMetrics(i, c); }
// Remet les lieux choisis dans l'état « jamais visités », sans toucher au profil ni aux ponts.
async function resetPlaceProgress(places) {
  const ids = new Set(places.map((p) => p.id));
  const musicIds = new Set(places.map((p) => p.musicChallenge?.entry).filter(Boolean));
  if (ids.has("miracoli")) musicIds.add("02"); // ancien défi remplacé par « Pulchra es »
  const workIds = new Set(places.flatMap((p) => p.chapters?.flatMap((c) => c.steps.flatMap(chainOf).map((s) => s.work).filter(Boolean)) || []));
  const keys = Object.keys(S.done).filter((key) => {
    if (!has(key)) return false;
    if (key === "finale") return true;
    const [kind, id] = key.split(":");
    return (["a", "t", "fin", "tr", "st", "ph"].includes(kind) && ids.has(id)) || (kind === "music" && musicIds.has(id)) || (kind === "w" && workIds.has(id));
  });
  keys.forEach(unaward);
  places.forEach((p) => { delete introSeen[p.id]; });
  save(); refreshAll();
  const photos = (await allPhotos()).filter(([, rec]) => rec?.place && ids.has(rec.place));
  if (photos.length) {
    const db = await idb();
    await new Promise((resolve, reject) => { const tx = db.transaction("p", "readwrite"); photos.forEach(([key]) => tx.objectStore("p").delete(key)); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
  }
  return { keys: keys.length, photos: photos.length };
}
async function renderDev() {
  const v = $("#v-dev");
  v.innerHTML = `<h2>🔧 Développement</h2><div class="card"><label class="chk"><input type="checkbox" id="dev-switch" ${DEV ? "checked" : ""}> <span>Activer le mode développeur</span></label><p class="muted">${DEV ? "Les outils de test sont actifs." : "Mode jeu réel : les lieux et les ponts exigent la localisation."}</p></div>`;
  $("#dev-switch", v).onchange = (e) => { try { localStorage.setItem("vq_dev_enabled_v2", e.target.checked ? "1" : "0"); } catch {} location.reload(); };
  if (!DEV) { menuSay("La localisation est nécessaire pour jouer, matelot."); return; }
  menuSay("Mode test : ici on essaie des choses, matelot.");
  const switchHtml = v.innerHTML, P = typeof PROFILE !== "undefined" ? PROFILE : null;
  OUTFITS ||= await (await fetch("data/outfits.json")).json();
  const st = (renderDev.st ||= { hs: 1.25, hy: 0, cw: 3.1, cy: 0, src: P && P.photo ? "me" : "doge" });
  const useDoge = st.src === "doge" || !P || !P.photo, photo = useDoge ? "img/outfit/_test-doge-framed.webp" : P.photo, cut = useDoge ? true : !!P.cut, frame = useDoge ? true : P.frame || false;
  const slider = (k, lab, min, max, step) => `<label class="dv-s"><span>${lab} <b>${st[k].toFixed(2)}</b></span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${st[k]}"></label>`;
  v.innerHTML = switchHtml + `<h2>🛠️ Tenues de grade</h2><p class="muted">${useDoge ? "Tête d'essai : le doge, cadré dans l'ovale." : "Ta tête enregistrée" + (frame ? " (cadrée dans l'ovale)" : cut ? " (détourée, ancien cadrage : réglages approximatifs)" : " (photo ronde)")}. Les réglages valent pour tous les grades.</p>
    <div class="card dv-ctl"><div class="dv-src"><button class="btn ghost${useDoge ? "" : " on"}" data-src="me"${P && P.photo ? "" : " disabled"}>Ma tête</button><button class="btn ghost${useDoge ? " on" : ""}" data-src="doge">Tête du doge (essai)</button></div>${slider("hs", "Taille du chapeau", 0.8, 1.8, 0.01)}${slider("hy", "Hauteur du chapeau", -0.3, 0.5, 0.01)}${slider("cw", "Largeur du col", 1.4, 4.2, 0.01)}${slider("cy", "Hauteur du col", -0.4, 0.4, 0.01)}<label class="dv-s"><span><input type="checkbox" id="dv-oval"> Afficher l'ovale de la prise de photo</span></label><button class="btn ghost" id="dv-copy">Copier les réglages</button></div>
    <div class="dv-grid">${LEVELS.filter((l) => GRADE_KEYS[l.name]).map((l) => { const k = GRADE_KEYS[l.name]; return `<div class="dv-tile" data-k="${k || ""}"><div class="dv-pic">${k && OUTFITS[k] ? "…" : '<span class="muted">en attente du dessin</span>'}</div><small>${l.emoji} ${esc(l.name)}</small>${k && OUTFITS[k] ? `<div class="dv-act"><button class="btn ghost" data-wear="${k}">Porter</button><button class="btn ghost" data-cer="${k}" data-li="${LEVELS.indexOf(l)}">Cérémonie</button></div>` : ""}</div>`; }).join("")}</div>${P && P.photo ? `<button class="btn ghost" id="dv-off">Retirer la tenue portée${P.outfit ? " (" + esc(P.outfit) + ")" : ""}</button>` : ""}`;
  $("#dev-switch", v).onchange = (e) => { try { localStorage.setItem("vq_dev_enabled_v2", e.target.checked ? "1" : "0"); } catch {} location.reload(); };
  const paint = async () => { for (const t of $$(".dv-tile", v)) { const k = t.dataset.k; if (!k || !OUTFITS[k]) continue; try { const c = await composeOutfit(photo, cut, k, { ...st, oval: st.oval }, frame); c.className = "dv-cv"; $(".dv-pic", t).replaceChildren(c); } catch { $(".dv-pic", t).textContent = "erreur"; } } };
  const ov = $("#dv-oval", v); ov.checked = !!st.oval; ov.onchange = () => { st.oval = ov.checked; paint(); };
  $$("[data-src]", v).forEach((b) => (b.onclick = () => { st.src = b.dataset.src; renderDev(); }));
  $$("input[type=range]", v).forEach((r) => (r.oninput = () => { st[r.dataset.k] = +r.value; $("b", r.parentNode).textContent = (+r.value).toFixed(2); clearTimeout(renderDev.t); renderDev.t = setTimeout(paint, 60); }));
  $("#dv-copy", v).onclick = () => { try { navigator.clipboard.writeText(JSON.stringify({ hs: st.hs, hy: st.hy, cw: st.cw, cy: st.cy })); toast("Réglages copiés"); } catch {} };
  $$("[data-wear]", v).forEach((b) => (b.onclick = async () => { await wearOutfit(b.dataset.wear); toast("Tenue portée : " + b.dataset.wear); renderDev(); }));
  $$("[data-cer]", v).forEach((b) => (b.onclick = () => { setTab("map"); setTimeout(() => ceremony(b.dataset.cer, +b.dataset.li), 350); }));
  const off = $("#dv-off", v); if (off) off.onclick = async () => { await wearOutfit(null); toast("Tenue retirée"); renderDev(); };
  v.insertAdjacentHTML("beforeend", `<div class="card dv-ctl"><h2>🖼️ Œuvres de maîtres (test)</h2><p class="muted">Simule la découverte des toiles (le vrai déclenchement viendra avec les épreuves).</p><div class="dv-src"><button class="btn ghost" data-wk="one">Trouver une toile</button><button class="btn ghost" data-wk="all">Tout débloquer</button><button class="btn ghost" data-wk="reset">Tout verrouiller</button></div></div>`);
  v.insertAdjacentHTML("beforeend", `<div class="card dv-ctl"><h2>🐚 Objets trouvés (test)</h2><div class="dv-src"><button class="btn ghost" data-ob="one">Trouver un objet</button><button class="btn ghost" data-ob="all">Tout trouver</button><button class="btn ghost" data-ob="reset">Tout retirer</button></div></div>`);
  v.insertAdjacentHTML("beforeend", `<div class="card dv-ctl"><h2>🧩 Épreuves (test)</h2><p class="muted">Remet les lieux dans l'état « jamais visités » : arrivée, questions, plan, trésors, œuvres gagnées, photos du lieu et défi musical. Le profil et les ponts restent.</p><div class="dv-src"><button class="btn ghost" id="reset-miracoli">↺ Réinitialiser l'église-bijou</button><button class="btn ghost" id="reset-trials">↺ Réinitialiser toutes les épreuves</button></div></div>`);
  const resetDevPlaces = async (places) => {
    try {
      await resetPlaceProgress(places);
      toast(places.length === 1 ? "L'église-bijou est remise à zéro." : "Tous les lieux sont remis à zéro.");
      setTab("map");
      if (places.length === 1) setTimeout(() => openPlace(places[0].id), 200);
    }
    catch { toast("Réinitialisation incomplète : les photos locales n'ont pas pu être effacées."); }
  };
  $("#reset-miracoli", v).onclick = () => resetDevPlaces([place("miracoli")]);
  $("#reset-trials", v).onclick = () => resetDevPlaces(PLACES);
  $$("[data-ob]", v).forEach((b) => (b.onclick = () => { const L = objectList(); if (b.dataset.ob === "one") { const n = L.find((o) => !o.found); if (n) window.__objects.find(n.id); else toast("Tous les objets sont trouvés"); } else if (b.dataset.ob === "all") L.forEach((o) => window.__objects.find(o.id)); else window.__objects.reset(); }));
  $$("[data-wk]", v).forEach((b) => (b.onclick = async () => { const ids = await window.__works.all(); if (b.dataset.wk === "one") { const left = ids.filter((id) => !workFound(id)); if (!left.length) { toast("Toutes les toiles sont déjà trouvées"); return; } await findWork(left[Math.floor(Math.random() * left.length)]); } else if (b.dataset.wk === "all") { for (const id of ids) await findWork(id, { silent: true }); toast("Toutes les toiles sont débloquées"); } else { await window.__works.reset(); toast("Toiles verrouillées"); } }));
  paint();
}
function renderSettings() {
  const v = $("#v-settings");
  menuSay("Ici, c'est la salle des machines : demande à tes parents avant de toucher à quelque chose !");
  v.innerHTML = `<h2>⚙️ Réglages</h2>
    <h3>👫 Les joueurs</h3>${S.kids.map((k, i) => `<div class="card"><input class="t" data-name="${i}" placeholder="Prénom du joueur ${i + 1}" value="${esc(k.name)}"><div class="avs" data-av="${i}">${AVATARS.map((a) => `<button class="${a === k.avatar ? "on" : ""}" data-a="${a}">${a}</button>`).join("")}</div></div>`).join("")}${S.kids.length < 6 ? '<button class="btn ghost" id="addp">➕ Ajouter un joueur</button>' : ""}
    <h3>🗺️ Carte hors-ligne</h3><div class="card"><p class="muted">Télécharge la carte de Venise avant de partir pour qu'elle marche sans réseau (environ 12 Mo : mieux vaut être en Wi-Fi).</p><button class="btn blue wide" id="dl" style="margin-top:8px">⬇️ Télécharger la carte</button><div class="bar" style="margin-top:8px"><i id="dlbar" style="width:0"></i></div><p class="muted" id="dltxt"></p></div>
    <h3>☁️ Équipe et synchronisation</h3><div class="card"><p><b>${esc(S.teamName || (TEAM && TEAM.team) || "")}</b></p><p>${esc(syncStatus)}</p><button class="btn ghost" id="chteam" style="margin:0 6px 6px 0">Changer d'équipe ou de code</button><button class="btn ghost" id="syncnow" style="margin-top:6px">Synchroniser maintenant</button></div>
    <h3>🔋 Mode éco</h3><div class="card"><p class="muted">Les personnages bougent à 20 images par seconde au lieu de 60 : moins de batterie, plus de fluidité sur un vieux téléphone ou iPad. Le reste ne change pas.</p><button class="btn ghost" id="eco"></button></div>
    <h3>🖥️ Plein écran</h3><div class="card"><p class="muted">Cache les barres du téléphone (dont la barre blanche du bas). Glisse depuis le bord de l'écran pour les revoir un instant.</p><button class="btn ghost" id="fs"></button></div>
    <h3>📲 Installer l'appli</h3><div class="card">${installHtml()}</div>
    <h3>📷 Crédits photos</h3><details class="card"><summary>Photos de Wikimedia Commons</summary><div id="credits" class="muted" style="margin-top:8px"></div></details>
    <h3>🎼 Crédits musicaux</h3><details class="card"><summary>Défi musical : Pulchra es</summary><p class="muted">Enregistrement fourni pour le projet et autorisé à la publication par son responsable. « René Jacobs » figure dans le nom du fichier ; attribution exacte à confirmer. Extraits et transcodages locaux.</p></details>
    <h3>🔧 Parents</h3><div class="card"><button class="btn ghost" id="intro">📖 Revoir l'histoire</button> <button class="btn ghost" id="reset" style="margin-top:6px">🗑️ Tout recommencer</button><button class="btn ghost" id="dev-entry" style="margin-top:6px">Options avancées</button></div>
    <p class="muted" style="text-align:center;margin-top:16px">Le Livre du Lion · V1 · Carte : aquarelle Stamen Design (CC BY 4.0), Stadia Maps, OpenFreeMap, OpenMapTiles · données © contributeurs OpenStreetMap</p>`;
  { const eb = $("#eco", v); if (eb) { const lab = () => (eb.textContent = ecoOn() ? "Mode éco : activé (toucher pour désactiver)" : "Mode éco : désactivé (toucher pour activer)"); lab(); eb.onclick = () => { try { localStorage.setItem("vq_eco", ecoOn() ? "0" : "1"); } catch {} lab(); toast(ecoOn() ? "Mode éco activé" : "Mode éco désactivé"); }; } }
  { const fb = $("#fs", v); if (fb) { const de = document.documentElement;
    if (!de.requestFullscreen && !de.webkitRequestFullscreen) { fb.disabled = true; fb.textContent = "Plein écran indisponible sur cet appareil"; }
    else { const lab = () => (fb.textContent = fsPref() ? "Plein écran : activé (toucher pour désactiver)" : "Plein écran : désactivé (toucher pour activer)"); lab();
      fb.onclick = () => { try { if (fsPref()) { localStorage.setItem("vq_fs", "0"); if (document.fullscreenElement) document.exitFullscreen(); } else { localStorage.removeItem("vq_fs"); enterFs(); } } catch {} lab(); }; } } }
  $$("[data-name]", v).forEach((i) => (i.oninput = () => { S.kids[+i.dataset.name].name = i.value; S.cfgT = Date.now(); save(); renderHud(); }));
  $$("[data-av]", v).forEach((g) => $$("button", g).forEach((b) => (b.onclick = () => { S.kids[+g.dataset.av].avatar = b.dataset.a; S.cfgT = Date.now(); save(); renderHud(); renderSettings(); })));
  fetch("img/ponts/credits.json").then((r) => r.json()).then((c) => { const el = $("#credits", v); if (el) el.insertAdjacentHTML("beforeend", `<p style="margin:10px 0 4px"><b>Ponts</b></p>` + Object.values(c).map((x) => `<p style="margin:4px 0">${esc(x.name)} : ${esc(x.author)} · ${esc(x.license)} · <a href="${esc(x.url)}" target="_blank" rel="noopener">source</a></p>`).join("")); }).catch(() => {});
  fetch("img/places/credits.json").then((r) => r.json()).then((c) => { const el = $("#credits", v); if (el) el.insertAdjacentHTML("afterbegin", Object.entries(c).map(([id, x]) => `<p style="margin:6px 0"><b>${esc(place(id)?.name || id)}</b> : ${esc(x.author)} · ${esc(x.license)} · <a href="${esc(x.url)}" target="_blank" rel="noopener">source</a></p>`).join("")); }).catch(() => {});
  const ad = $("#addp", v);
  if (ad) ad.onclick = () => { S.kids.push({ name: "", avatar: AVATARS[S.kids.length % AVATARS.length] }); S.cfgT = Date.now(); save(); renderSettings(); };
  $("#dl", v).onclick = downloadTiles;
  const inst = $("#inst", v); if (inst) inst.onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; renderSettings(); };
  $("#syncnow", v).onclick = sync;
  $("#chteam", v).onclick = async () => { try { localStorage.removeItem(TEAMKEY); } catch {} TEAM = null; await joinGame(); await sync(); if (pendingTeamName && !S.teamName) { S.teamName = pendingTeamName; S.cfgT = Date.now(); save(); } refreshAll(); renderSettings(); };
  $("#intro", v).onclick = async () => { setTab("map"); const p = await runIntro({ replay: true, name: PROFILE && PROFILE.name, profile: PROFILE, ...BOAT_OPTS }); if (p) applyProfile(p); }; // « Revoir l'histoire » : la nouvelle introduction en 7 écrans
  $("#dev-entry", v).onclick = () => setTab("dev");
  $("#reset", v).onclick = async () => {
    if (!confirm("Effacer TOUTE la progression et le profil, puis reprendre l'introduction ?")) return;
    if (!confirm("Vraiment tout ? Cette action est définitive.")) return;
    for (const k of Object.keys(S.done)) unaward(k);
    S.onboarded = false; clearProfile(); PROFILE = null; renderBadge();
    save(); refreshAll(); setTab("map");
    const p = await runIntro(BOAT_OPTS);
    if (p) { applyProfile(p); S.onboarded = true; save(); }
  };
}

/* ───────── Carte hors-ligne ───────── */
const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
// Zones à télécharger : [sud, ouest, nord, est] et niveaux de zoom (l'aquarelle s'arrête au zoom 16, les tuiles vectorielles au 14).
const OFFLINE_BOXES = [
  { b: [45.425, 12.315, 45.450, 12.360], z: [13, 16] },     // centre historique
  { b: [45.400, 12.300, 45.505, 12.430], z: [12, 14] },     // lagune, îles, Lido
  { b: [45.4565, 12.3495, 45.4605, 12.3560], z: [15, 16] }, // Murano
  { b: [45.4835, 12.4130, 45.4875, 12.4205], z: [15, 16] }, // Burano
  { b: [45.4965, 12.4160, 45.5000, 12.4215], z: [15, 16] }, // Torcello
  { b: [45.4050, 12.3600, 45.4150, 12.3760], z: [14, 16] }, // Lido
];
function tilesFor(template, zmax) {
  const out = new Set();
  for (const { b, z } of OFFLINE_BOXES) for (let zz = z[0]; zz <= Math.min(z[1], zmax); zz++) {
    for (let x = lon2x(b[1], zz); x <= lon2x(b[3], zz); x++) for (let y = lat2y(b[2], zz); y <= lat2y(b[0], zz); y++) out.add(template.replace("{z}", zz).replace("{x}", x).replace("{y}", y));
  }
  return [...out];
}
async function offlineUrls() {
  const urls = tilesFor(useStamen ? WC_URL : OSM_URL, useStamen ? 16 : 17);
  try {
    const tj = await (await fetch(OFM_TILEJSON)).json();
    urls.push(OFM_TILEJSON, ...tilesFor(tj.tiles[0], 14));
  } catch {}
  for (const f of FONTS) for (const r of ["0-255", "256-511"]) urls.push(`https://tiles.openfreemap.org/fonts/${encodeURIComponent(f)}/${r}.pbf`);
  return urls;
}
async function downloadTiles() {
  const bar = $("#dlbar"), txt = $("#dltxt"), btn = $("#dl");
  btn.disabled = true; txt.textContent = "Préparation…";
  const urls = await offlineUrls(), total = urls.length; let n = 0, fail = 0;
  const cache = await caches.open("vq-tiles");
  const worker = async () => {
    while (urls.length) {
      const u = urls.pop();
      try { if (!(await cache.match(u))) { const r = await fetch(u, { mode: "cors" }); if (!r.ok) throw 0; await cache.put(u, r); } } catch { fail++; }
      n++; if (bar) { bar.style.width = (n / total) * 100 + "%"; txt.textContent = `${n}/${total}`; }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  txt.textContent = fail ? `Terminé, ${fail} éléments manquants (réessaie avec du réseau).` : "✅ Carte prête pour le hors-ligne !";
  btn.disabled = false;
}

/* ───────── Installation (PWA) ───────── */
let deferredInstall = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; if (tab === "settings") renderSettings(); });
addEventListener("appinstalled", () => { deferredInstall = null; if (tab === "settings") renderSettings(); });
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function installHtml() {
  if (isStandalone()) return "<p>✅ L'appli est installée : tu l'utilises en plein écran.</p>";
  if (deferredInstall) return `<p>Installe l'appli sur ton écran d'accueil pour jouer en plein écran.</p><button class="btn blue wide" id="inst">📲 Installer l'appli</button>`;
  if (isIOS()) return `<p>Sur iPhone ou iPad, <b>ouvre cette page dans Safari</b>, puis touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut), fais défiler et choisis <b>« Sur l'écran d'accueil »</b>. L'appli s'ouvrira ensuite en plein écran, sans barre de navigateur.</p>`;
  return `<p>Dans le menu du navigateur (les trois points), choisis <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</p>`;
}

/* ───────── Classement ───────── */
const PLACES_TOTAL = PLACES.filter((p) => !p.final).length;
async function renderBoard() {
  const el = $("#board"); if (!el) return;
  try {
    const r = await fetch("api/board", { headers: apiHeaders() });
    if (!r.ok) throw new Error(r.status);
    const { teams } = await r.json();
    if (!teams.length) { el.innerHTML = `<p class="muted">Aucune équipe pour l'instant.</p>`; return; }
    const mine = TEAM && TEAM.team;
    el.innerHTML = teams.map((t, i) => {
      const best = Math.max(0, ...t.players.map((p) => p.points)), lv = LEVELS[level(best)];
      return `<div class="brow ${t.team === mine ? "mine" : ""}"><div class="rk">${i + 1}</div><div class="grow"><div class="row"><b class="grow">${esc(t.name)}${t.team === mine ? " (nous)" : ""}</b><b>⭐ ${t.points}</b></div>
        <div class="muted">${t.players.map((p) => `${p.avatar} ${esc(p.name || "?")} ${p.points}`).join(" · ")}</div>
        <div class="bar" style="margin:6px 0 2px"><i style="width:${(t.places / PLACES_TOTAL) * 100}%"></i></div>
        <div class="muted">${t.places}/${PLACES_TOTAL} lieux · ${t.bridges} pont${t.bridges > 1 ? "s" : ""} · ${lv.emoji} ${lv.name}${t.finale ? " · 🗝️ finale !" : ""}</div></div></div>`;
    }).join("");
  } catch { el.innerHTML = `<p class="muted">Classement indisponible hors-ligne.</p>`; }
}
setInterval(() => { if (tab === "trophies" && !document.hidden) renderBoard(); }, 30000);

/* ───────── Joueurs ───────── */
function showPlayers() {
  const close = modal(`<h2>Qui joue ?</h2><div style="display:grid;gap:8px">${S.kids.map((k, i) => `<button class="opt ${i === meIdx() ? "good" : ""}" data-pl="${i}"><span style="font-size:30px">${k.avatar}</span> ${esc(k.name || "Joueur " + (i + 1))} <span style="float:right">⭐ ${pointsOf(i)} ${LEVELS[level(pointsOf(i))].emoji}</span></button>`).join("")}</div>
    <p class="muted" style="text-align:center;margin-top:10px">Total de l'équipe : ⭐ ${points()}</p><button class="btn ghost" data-close>Fermer</button>`);
  $$("[data-pl]", $("#modal")).forEach((b) => (b.onclick = () => { close(); setActive(+b.dataset.pl); }));
}

/* ───────── Intro ───────── */
function showIntro() {
  let i = 0;
  const step = () => {
    const last = i === STORY.intro.length - 1;
    const close = modal(`${i === 2 ? '<img class="corto" src="img/corto-venise-pastel.webp" alt="Corto Maltese devant la basilique Saint-Marc">' : `<div class="em">${["📖", "💨", "🧢", "🦁"][i] || "📖"}</div>`}<h2>${i === 0 ? esc(STORY.title) : ""}</h2><p>${esc(STORY.intro[i])}</p>
      <div class="row"><button class="btn blue grow" id="nx">${last ? "C'est parti !" : "Suite ➜"}</button></div>`);
    $("#nx", $("#modal")).onclick = () => { if (last) close(); else { i++; step(); } };
  };
  step();
}
function onboarding() {
  const close = modal(`<div class="em">🦁</div><h2>Bienvenue, Gardiens !</h2><p>Qui sont les deux explorateurs ?</p>
    ${S.kids.map((k, i) => `<div style="text-align:left"><input class="t" data-n="${i}" placeholder="Prénom ${i + 1}" value="${esc(k.name)}"><div class="avs" data-g="${i}">${AVATARS.map((a) => `<button class="${a === k.avatar ? "on" : ""}" data-a="${a}">${a}</button>`).join("")}</div></div>`).join("")}
    <button class="btn blue wide" id="go">Commencer l'aventure ➜</button>`);
  const m = $("#modal");
  $$("[data-g]", m).forEach((g) => $$("button", g).forEach((b) => (b.onclick = () => { S.kids[+g.dataset.g].avatar = b.dataset.a; $$("button", g).forEach((x) => x.classList.toggle("on", x === b)); })));
  $("#go", m).onclick = () => {
    $$("[data-n]", m).forEach((i) => (S.kids[+i.dataset.n].name = i.value.trim()));
    S.onboarded = true; S.cfgT = Date.now(); save(); close(); setActive(0); startGeo(); showIntro();
  };
}

/* ───────── Boot ───────── */
let gradeSynced = false;
function removeUnearnedOutfit() {
  if (!gradeSynced || DEV || !PROFILE?.outfit) return false;
  const rank = Number(Object.entries(OUTFIT_LEVELS).find(([, key]) => key === PROFILE.outfit)?.[0]);
  if (!rank || rank <= level(pointsOf(meIdx()))) return false;
  for (const field of ["outfit", "outfitPhoto", "outfitOverlay", "outfitOverlayHat", "outfitOverlayBody", "outfitLayout", "outfitOverlayVersion", "outfitShift"]) delete PROFILE[field];
  saveProfile(PROFILE);
  return true;
}
function refreshAll() {
  if (removeUnearnedOutfit()) { renderBadge(); refreshUserMarker(); }
  renderHud(); renderMap(); renderNext(); if (tab === "days") renderDays(); if (tab === "bridges") renderBridges(); if (tab === "music") renderMusicCollection(); if (tab === "trophies") renderTrophies(); if (openId) renderSheet();
}
refreshAll();
setTab("map");
{
  const help = $("#dev-chap-help"); help.hidden = !DEV;
  help.textContent = "🔧 Réinitialiser l'église-bijou et ouvrir sa conclusion";
  help.onclick = async () => {
    if (!DEV || tab !== "map" || !$("#sheet").hidden || help.disabled) return;
    help.disabled = true;
    try { const p = place("miracoli"); await resetPlaceProgress([p]); devCompleteChapter(p, true); }
    catch { toast("Impossible de préparer la conclusion de l'église-bijou."); }
    finally { help.disabled = false; }
  };
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
let pendingTeamName = "";
startFlow();
async function startFlow() {
  if (!DEV) startGeo(); // demande la localisation dès l’ouverture, avant toute étape de jeu
  if (!PROFILE) PROFILE = await runIntro(BOAT_OPTS); else ensureBoat();
  if (PROFILE?.outfit && PROFILE.photo && (PROFILE.outfitOverlayVersion !== 3 || !PROFILE.outfitOverlayHat || !PROFILE.outfitOverlayBody)) { try { await wearOutfit(PROFILE.outfit, PROFILE.outfitShift); } catch {} } // migre la tenue en deux pièces sans déplacer la photo
  renderBadge(); refreshUserMarker();
  if (JEU) renderHud();
  if (!JEU) { startGeo(); return; }
  // Le nom donné à Corto devient le joueur ; il rejoint la partie sans autre écran.
  if (!TEAM) { TEAM = { team: slug(PROFILE.name) || "joueur-" + Date.now().toString(36), league: LEAGUE }; try { localStorage.setItem(TEAMKEY, JSON.stringify(TEAM)); } catch {} }
  const qs = new URLSearchParams(location.search);
  if (qs.get("team")) { TEAM = { team: slug(qs.get("team")), league: qs.get("league") || "" }; try { localStorage.setItem(TEAMKEY, JSON.stringify(TEAM)); } catch {} }
  if (!TEAM) await joinGame();
  await sync();
  gradeSynced = true;
  if (removeUnearnedOutfit()) { renderBadge(); renderHud(); refreshUserMarker(); }
  if (pendingTeamName && !S.teamName) { S.teamName = pendingTeamName; S.cfgT = Date.now(); save(); }
  if (S.onboarded && S.kids.length > 1 || S.kids[0].name !== PROFILE.name) S.onboarded = false;
  if (!S.onboarded) { S.kids = [{ name: PROFILE.name, avatar: PROFILE.avatar || "🦁" }]; S.teamName = S.teamName || PROFILE.name; S.onboarded = true; S.cfgT = Date.now(); save(); renderHud(); renderMap(); startGeo(); }
  else { startGeo(); let saved = null; try { saved = localStorage.getItem("vq_active"); } catch {} if (saved == null && S.kids.length > 1) showPlayers(); }
}
// Écran « Rejoindre la partie » : code de la partie (donné par l'organisateur) + nom de l'équipe.
function joinGame(msg = "") {
  return new Promise(async (resolve) => {
    let needCode = true;
    try { needCode = (await (await fetch("api/ping")).json()).league; } catch {}
    const close = modal(`<div class="em">🦁</div><h2>Rejoindre la partie</h2>
      <p class="muted" style="text-align:center">Le Livre du Lion se joue en équipes qui se mesurent entre elles.</p>
      ${needCode ? `<div style="text-align:left"><label class="muted">Code de la partie</label><input class="t" id="j-code" autocomplete="off" autocapitalize="off" placeholder="Code donné par l'organisateur" value="${esc((TEAM && TEAM.league) || "")}"></div>` : ""}
      <div style="text-align:left;margin-top:8px"><label class="muted">Nom de ton équipe</label><input class="t" id="j-team" autocomplete="off" placeholder="Par exemple : Les Dupont" value="${esc(S.teamName || "")}"></div>
      <p class="muted" style="text-align:left">Plusieurs téléphones d'une même équipe tapent le même nom pour partager leur progression.</p>
      <p id="j-err" style="color:#b4472f;font-weight:800">${esc(msg)}</p>
      <button class="btn blue wide" id="j-go">Rejoindre</button>`);
    const m = $("#modal");
    $("#j-go", m).onclick = async () => {
      const name = $("#j-team", m).value.trim(), code = needCode ? $("#j-code", m).value.trim() : "";
      if (slug(name).length < 2) { $("#j-err", m).textContent = "Choisis un nom d'équipe (2 lettres au moins)."; return; }
      const t = { team: slug(name), league: code };
      try {
        const r = await fetch("api/state", { headers: { "X-Team": t.team, "X-League": t.league } });
        if (r.status === 403) { $("#j-err", m).textContent = "Ce code de la partie n'est pas le bon."; return; }
      } catch {}
      TEAM = t; try { localStorage.setItem(TEAMKEY, JSON.stringify(TEAM)); } catch {}
      pendingTeamName = name;
      close(); resolve();
    };
  });
}
setInterval(sync, 45000);
addEventListener("online", sync);
document.addEventListener("visibilitychange", () => { syncGeoWatch(); if (!document.hidden) sync(); });
