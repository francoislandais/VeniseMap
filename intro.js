// Identification : Corto Maltese demande ton nom, tu choisis un emblème ou tu te prends en photo.
import { AVATARS } from "./data.js";

const PKEY = "vq_profile";
export const loadProfile = () => { try { const p = JSON.parse(localStorage.getItem(PKEY)); return p && p.name ? p : null; } catch { return null; } };
export const saveProfile = (p) => { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} };
export const clearProfile = () => { try { localStorage.removeItem(PKEY); } catch {} };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CORTO = "img/corto-face.webp";

/* ───────── Portrait : visage mis en valeur, arrière-plan flouté, découpe ronde ───────── */
export async function portrait(src, S = 200) {
  const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height;
  const side = Math.min(w, h);
  let sx = (w - side) / 2, sy = (h - side) / 2, sw = side;
  // Si le navigateur sait détecter un visage (Chrome Android, selon la version), on recadre dessus.
  if ("FaceDetector" in window) {
    try {
      const f = (await new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }).detect(src))[0];
      if (f) {
        const b = f.boundingBox, s = Math.min(Math.max(b.width * 2.2, 96), side);
        sw = s; sx = Math.min(Math.max(b.x + b.width / 2 - s / 2, 0), w - s); sy = Math.min(Math.max(b.y + b.height / 2 - s * 0.52, 0), h - s);
      }
    } catch {}
  }
  const mk = (n) => { const c = document.createElement("canvas"); c.width = c.height = n; return c; };
  const out = mk(S), c = out.getContext("2d");
  c.drawImage(src, sx, sy, sw, sw, 0, 0, S, S);
  // Copie floue (réduction puis agrandissement) fondue vers les bords : le centre reste net.
  const t1 = mk(48), t2 = mk(S);
  t1.getContext("2d").drawImage(out, 0, 0, 48, 48);
  const c2 = t2.getContext("2d"); c2.imageSmoothingQuality = "high"; c2.drawImage(t1, 0, 0, S, S);
  const g = c2.createRadialGradient(S / 2, S * 0.46, S * 0.22, S / 2, S * 0.46, S * 0.62);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
  c2.globalCompositeOperation = "destination-in"; c2.fillStyle = g; c2.fillRect(0, 0, S, S);
  c.drawImage(t2, 0, 0);
  // Découpe en cercle
  const fin = mk(S), f = fin.getContext("2d");
  f.beginPath(); f.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); f.closePath(); f.clip(); f.drawImage(out, 0, 0);
  const du = fin.toDataURL("image/webp", 0.88);
  return du.startsWith("data:image/webp") ? du : fin.toDataURL("image/png"); // Safari ne sait pas encoder le WebP
}

/* ───────── Découpe de la tête : segmentation « selfie » MediaPipe, sur l'appareil (modèle de 250 Ko + wasm hébergés dans vendor/mediapipe) ───────── */
let segP = null;
function getSegmenter() {
  return (segP ||= (async () => {
    const mod = await import("./vendor/mediapipe/vision_bundle.mjs");
    const files = await mod.FilesetResolver.forVisionTasks("vendor/mediapipe");
    return mod.ImageSegmenter.createFromOptions(files, { baseOptions: { modelAssetPath: "vendor/mediapipe/selfie_segmenter.tflite" }, runningMode: "IMAGE", outputConfidenceMasks: true, outputCategoryMask: false });
  })().catch((e) => { segP = null; throw e; }));
}
// Renvoie une image WebP/PNG au fond transparent (tête et épaules, bas fondu), ou lève une erreur si la découpe échoue.
export async function cutout(src, S = 256) {
  const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height;
  const k = Math.min(1, 512 / Math.max(w, h)), W = Math.round(w * k), H = Math.round(h * k);
  const base = document.createElement("canvas"); base.width = W; base.height = H; base.getContext("2d").drawImage(src, 0, 0, W, H);
  const seg = await getSegmenter(), res = seg.segment(base);
  const m = res.confidenceMasks[res.confidenceMasks.length - 1], mw = m.width, mh = m.height, f = m.getAsFloat32Array();
  // sens du masque : la personne est au centre du cadre, le fond sur les bords
  let ctr = 0, edge = 0, nc = 0, ne = 0;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const v = f[y * mw + x], cx = Math.abs(x / mw - 0.5), cy = Math.abs(y / mh - 0.5); if (cx < 0.2 && cy < 0.25) { ctr += v; nc++; } else if (cx > 0.4 || cy > 0.45) { edge += v; ne++; } }
  const inv = ctr / nc < edge / ne;
  const mk = (n, hh = n) => { const c = document.createElement("canvas"); c.width = n; c.height = hh; return c; };
  const mc = mk(mw, mh), mx = mc.getContext("2d"), id = mx.createImageData(mw, mh);
  let minX = mw, maxX = 0, minY = mh, maxY = 0;
  for (let i = 0; i < mw * mh; i++) {
    let v = inv ? 1 - f[i] : f[i]; v = Math.min(1, Math.max(0, (v - 0.3) / 0.4)); // franchit le contour
    id.data[i * 4 + 3] = Math.round(v * 255);
    if (v > 0.5) { const x = i % mw, y = (i / mw) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX - minX < mw * 0.12 || maxY - minY < mh * 0.12) throw new Error("personne introuvable");
  mx.putImageData(id, 0, 0);
  m.close && m.close();
  // image pleine résolution * masque adouci
  const full = mk(mw, mh), fx = full.getContext("2d"); fx.drawImage(base, 0, 0, mw, mh);
  fx.globalCompositeOperation = "destination-in"; fx.filter = "blur(1.2px)"; fx.drawImage(mc, 0, 0); fx.filter = "none";
  // cadrage : tête et épaules (haut de la silhouette, ~1,15 fois sa largeur), bas fondu en ovale
  const bw = maxX - minX, bh = Math.min(maxY - minY, bw * 1.15), pad = bw * 0.05;
  const sx = Math.max(0, minX - pad), sy = Math.max(0, minY - pad), sw = Math.min(mw - sx, bw + 2 * pad), sh = Math.min(mh - sy, bh + pad);
  const sc = S / Math.max(sw, sh), ow = Math.round(sw * sc), oh = Math.round(sh * sc);
  const out = mk(ow, oh), ox = out.getContext("2d"); ox.imageSmoothingQuality = "high"; ox.drawImage(full, sx, sy, sw, sh, 0, 0, ow, oh);
  const fade = mk(ow, oh), gx = fade.getContext("2d"), g = gx.createRadialGradient(ow / 2, oh * 0.38, Math.min(ow, oh) * 0.28, ow / 2, oh * 0.45, Math.max(ow, oh) * 0.62);
  g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.7, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
  gx.fillStyle = g; gx.fillRect(0, 0, ow, oh);
  ox.globalCompositeOperation = "destination-in"; ox.drawImage(fade, 0, 0);
  const du = out.toDataURL("image/webp", 0.9);
  return du.startsWith("data:image/webp") ? du : out.toDataURL("image/png");
}

/* ───────── Cadrage standard : ovale du visage + haut des épaules ─────────
   Toutes les photos de profil ont la même mise en page (FRAME 300×400) : le visage est dans l'ovale FACE (fractions du cadre).
   Les tenues de grade s'y posent donc toujours au même endroit, sans deviner où est la tête. */
export const FRAME = { w: 300, h: 400 };
export const FACE = { cx: 0.5, cy: 0.4, w: 0.46, h: 0.52 }; // ovale de départ (plus petit : on voit mieux les épaules). Chaque photo mémorise l'ovale utilisé (frameSpec) : c'est lui qui règle la pose des tenues.
// Géométrie du cadre mémorisée avec la photo : si l'ovale change un jour, les anciennes photos gardent leurs proportions.
export const frameSpec = () => ({ v: 1, cx: FACE.cx, cy: FACE.cy, w: FACE.w, h: FACE.h });
export function frameShot(src) { // recadre au format 3:4 (centre), comme l'aperçu de la caméra
  const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height;
  const sw = Math.min(w, (h * 3) / 4), sh = (sw * 4) / 3, sx = (w - sw) / 2, sy = (h - sh) / 2;
  const c = document.createElement("canvas"); c.width = FRAME.w; c.height = FRAME.h; const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, sx, sy, sw, sh, 0, 0, FRAME.w, FRAME.h); return c;
}
const fadeBottom = (c) => { const x = c.getContext("2d"), g = x.createLinearGradient(0, c.height * 0.86, 0, c.height); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.globalCompositeOperation = "destination-in"; const cv = document.createElement("canvas"); cv.width = c.width; cv.height = c.height; const y = cv.getContext("2d"); const gg = y.createLinearGradient(0, 0, 0, c.height); gg.addColorStop(0, "rgba(0,0,0,1)"); gg.addColorStop(0.86, "rgba(0,0,0,1)"); gg.addColorStop(1, "rgba(0,0,0,0)"); y.fillStyle = gg; y.fillRect(0, 0, c.width, c.height); x.drawImage(cv, 0, 0); x.globalCompositeOperation = "source-over"; };
const toUrl = (c) => { const du = c.toDataURL("image/webp", 0.9); return du.startsWith("data:image/webp") ? du : c.toDataURL("image/png"); };
// Détourage sans recadrage : on garde exactement la mise en page du cadre (le visage reste dans l'ovale).
export async function cutoutFramed(frame) {
  const seg = await getSegmenter(), res = seg.segment(frame);
  const m = res.confidenceMasks[res.confidenceMasks.length - 1], mw = m.width, mh = m.height, f = m.getAsFloat32Array();
  let ctr = 0, edge = 0, nc = 0, ne = 0;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const v = f[y * mw + x], cx = Math.abs(x / mw - 0.5), cy = Math.abs(y / mh - 0.4); if (cx < 0.15 && cy < 0.15) { ctr += v; nc++; } else if (cx > 0.4 || cy > 0.55) { edge += v; ne++; } }
  const inv = ctr / nc < edge / ne, mc = document.createElement("canvas"); mc.width = mw; mc.height = mh; const mx = mc.getContext("2d"), id = mx.createImageData(mw, mh); let cnt = 0;
  for (let i = 0; i < mw * mh; i++) { let v = inv ? 1 - f[i] : f[i]; v = Math.min(1, Math.max(0, (v - 0.3) / 0.4)); id.data[i * 4 + 3] = Math.round(v * 255); if (v > 0.5) cnt++; }
  if (cnt < mw * mh * 0.12) throw new Error("personne introuvable");
  mx.putImageData(id, 0, 0); m.close && m.close();
  const out = document.createElement("canvas"); out.width = FRAME.w; out.height = FRAME.h; const x = out.getContext("2d"); x.drawImage(frame, 0, 0);
  x.globalCompositeOperation = "destination-in"; x.filter = "blur(1.2px)"; x.drawImage(mc, 0, 0, FRAME.w, FRAME.h); x.filter = "none"; x.globalCompositeOperation = "source-over";
  fadeBottom(out); return toUrl(out);
}
export function framedFallback(frame) { // sans segmentation : photo cadrée dans un grand ovale adouci
  const out = document.createElement("canvas"); out.width = FRAME.w; out.height = FRAME.h; const x = out.getContext("2d"); x.drawImage(frame, 0, 0);
  const m = document.createElement("canvas"); m.width = FRAME.w; m.height = FRAME.h; const y = m.getContext("2d"); y.filter = "blur(10px)"; y.fillStyle = "#000"; y.beginPath(); y.ellipse(FRAME.w / 2, FRAME.h * 0.56, FRAME.w * 0.46, FRAME.h * 0.46, 0, 0, Math.PI * 2); y.fill();
  x.globalCompositeOperation = "destination-in"; x.drawImage(m, 0, 0); x.globalCompositeOperation = "source-over"; return toUrl(out);
}

/* ───────── Caméra ───────── */
export function selfie() {
  return new Promise((resolve) => {
    const cam = document.createElement("div"); cam.className = "cam";
    cam.innerHTML = `<p class="cam-t">Place ton visage dans l'ovale, épaules en bas</p>
      <div class="cam-ring cam-frame"><video autoplay playsinline muted></video><img class="cam-prev" alt="" hidden><i class="cam-oval" style="left:${(FACE.cx - FACE.w / 2) * 100}%;top:${(FACE.cy - FACE.h / 2) * 100}%;width:${FACE.w * 100}%;height:${FACE.h * 100}%"></i><svg class="cam-sh" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M2 100 C 6 84, 24 80, 36 80 L 64 80 C 76 80, 94 84, 98 100" fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="3 2.5"/></svg></div>
      <p class="cam-err" hidden></p>
      <div class="cam-bar"><button class="cam-btn" data-x>Annuler</button><button class="cam-shot" data-shot aria-label="Prendre la photo"></button>
        <label class="cam-btn">Une photo<input type="file" accept="image/*" capture="user" hidden data-file></label></div>
      <div class="cam-bar" data-ok hidden><button class="cam-btn" data-again>Refaire</button><button class="cam-go" data-use>C'est moi !</button></div>`;
    document.body.appendChild(cam);
    const video = cam.querySelector("video"), prev = cam.querySelector(".cam-prev"), err = cam.querySelector(".cam-err");
    let stream = null, result = null;
    const stop = () => { try { stream && stream.getTracks().forEach((t) => t.stop()); } catch {} };
    const done = (v) => { stop(); cam.remove(); resolve(v); };
    const show = async (srcEl) => {
      cam.querySelector(".cam-t").textContent = "Je découpe ta tête…"; cam.classList.add("busy");
      const fr = frameShot(srcEl); try { result = { photo: await cutoutFramed(fr), cut: true, frame: frameSpec() }; } catch (e) { result = { photo: framedFallback(fr), cut: true, frame: frameSpec() }; } // repli : photo cadrée dans un ovale adouci
      cam.classList.remove("busy"); prev.src = result.photo; prev.classList.toggle("cut", result.cut); prev.hidden = false; video.hidden = true;
      cam.querySelectorAll(".cam-bar")[0].hidden = true; cam.querySelector("[data-ok]").hidden = false; cam.querySelector(".cam-t").textContent = "Voilà ta tête de marin !";
    };
    cam.querySelector("[data-x]").onclick = () => done(null);
    cam.querySelector("[data-use]").onclick = () => done(result);
    cam.querySelector("[data-again]").onclick = () => { prev.hidden = true; video.hidden = false; cam.querySelectorAll(".cam-bar")[0].hidden = false; cam.querySelector("[data-ok]").hidden = true; cam.querySelector(".cam-t").textContent = "Place ton visage dans le cercle"; };
    cam.querySelector("[data-shot]").onclick = async () => {
      if (!video.videoWidth) return;
      const c = document.createElement("canvas"); c.width = video.videoWidth; c.height = video.videoHeight;
      const x = c.getContext("2d"); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(video, 0, 0); // effet miroir, comme l'aperçu
      await show(c);
    };
    cam.querySelector("[data-file]").onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const im = new Image(), u = URL.createObjectURL(f);
      im.onload = async () => { await show(im); URL.revokeObjectURL(u); }; im.src = u;
    };
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } }, audio: false })
        .then((s) => { stream = s; video.srcObject = s; })
        .catch(() => { err.textContent = "Je n'ai pas accès à la caméra. Tu peux choisir une photo, ou annuler."; err.hidden = false; cam.querySelector("[data-shot]").hidden = true; });
    } else { err.textContent = "La caméra n'est pas disponible ici. Choisis une photo."; err.hidden = false; cam.querySelector("[data-shot]").hidden = true; }
  });
}

/* ───────── Écran d'identification ───────── */
// Écran 1 : la peinture défile (travelling) puis se fige ; le voile apparaît progressivement, puis Corto, son salut, la question et le champ. Un toucher passe directement à la fin.
function openingShot(d, instant) {
  const root = d.parentNode, bg = root.querySelector(".in2-bg"), veil = root.querySelector(".in2-veil"), img = d.querySelector(".hl-img"), col = d.querySelector(".hl-col");
  const anims = [];
  const A = (el, kf, o) => { const a = el.animate(kf, { fill: "forwards", easing: "ease-in-out", ...o }); anims.push(a); return a; };
  const wide = innerWidth / innerHeight > 1.3; // écran large : le recadrage est faible, le mouvement est surtout un zoom
  bg.style.transformOrigin = wide ? "45% 45%" : "55% 42%";
  A(bg, [{ backgroundPosition: wide ? "50% 40%" : "64% 40%", transform: wide ? "scale(1.55)" : "scale(1.75)" }, { backgroundPosition: wide ? "50% 50%" : "10% 50%", transform: "scale(1)" }], { duration: 6200, easing: "cubic-bezier(.35,.1,.2,1)" });
  A(veil, [{ opacity: 0 }, { opacity: 1 }], { duration: 1600, delay: 4700 });
  A(img, [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 5700 });
  const last = A(col, [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 6300 });
  const skip = () => anims.forEach((a) => { try { a.finish(); } catch {} });
  d.addEventListener("pointerdown", (e) => { if (!e.target.closest("input,form,button")) skip(); });
  if (instant) skip(); // retour à l'écran 1 : on affiche directement l'état final
  return { skip, done: new Promise((r) => (last.onfinish = r)) };
}

export function runIntro(opts = {}) { // opts.replay : « Revoir l'histoire » (prénom déjà connu, profil inchangé)
  // Introduction : 7 écrans plein page, fondu enchaîné, navigation par toucher ou par les petits boutons précédent / suivant. Images + texte, sans bulle.
  return new Promise(async (resolve) => {
    let LAYOUT = {}; try { const r = await fetch("data/intro-layout.json?" + Date.now()); if (r.ok) LAYOUT = await r.json(); } catch {} // réglages de position/taille enregistrés depuis l'éditeur
    const EDITABLE = { hello: { img: ".hl-img", hi: ".hl-hi", q: ".hl-q" }, who: { lab: ".wh-lab", name: ".wh-in", cam: ".wh-cam", ok: ".wh-ok" }, welcome: { face: ".wl-face", head: ".wl-top p", name: ".wl-name", name2: ".wl-name2", img: ".wl-img", mid: ".wl-mid" }, other: { img: ".in2-img", txt: ".in2-txt", ask: ".in2-ask", btn: ".in2-btn" } };
    const edKey = (to) => SCREENS[to].key; // clé stable de chaque écran (s1…s6, who) : les réglages enregistrés ne bougent pas si on insère un écran
    const elsOf = (d, sc) => { const map = { ...EDITABLE[["hello", "welcome", "who"].includes(sc.layout) ? sc.layout : "other"] }; if (sc.face) map.face = ".in2-face"; if (sc.ask) map.txt = ".in2-txt p:not(.in2-ask)"; if (sc.parts) sc.parts.forEach((_, n) => (map["p" + (n + 1)] = `.in2-part[data-k=p${n + 1}]`)); /* écran avec question + bouton : le texte, la question et le bouton sont trois éléments indépendants */ const o = {}; for (const k in map) { const e = d.querySelector(map[k]); if (e) o[k] = e; } return o; };
    // Position / taille d'un élément = réglage de l'éditeur (x en vw, y en % de la hauteur d'écran, échelle) + petite correction automatique (_fx, _fy en px, _fs) qui le ramène dans l'écran
    const applyOne = (e, v) => { const fx = e._fx || 0, fy = e._fy || 0, fs = e._fs || 1, sc0 = ((v && v.s) || 1) * fs; e.style.translate = v || fx || fy ? `calc(${(v && v.x) || 0} * 1vw + ${fx}px) calc(${(v && v.y) || 0} * var(--lh) / 100 + ${fy}px)` : ""; e.style.scale = sc0 !== 1 ? String(Math.round(sc0 * 1000) / 1000) : ""; };
    // Textes modifiables : réglages dans LAYOUT._t[sN][clé] ; « {nom} » est remplacé par le prénom
    const TEXTSEL = { hello: { hi: ".hl-hi", q: ".hl-q" }, welcome: { head: ".wl-top p", name: ".wl-name", name2: ".wl-name2", mid: ".wl-mid p" }, who: { lab: ".wh-lab", ok: ".wh-ok" }, other: { txt: ".in2-txt p:not(.in2-ask)", ask: ".in2-ask", btn: ".in2-btn" } };
    const textsOf = (d, sc) => { const map = { ...TEXTSEL[["hello", "welcome", "who"].includes(sc.layout) ? sc.layout : "other"] }; if (sc.parts) { delete map.txt; sc.parts.forEach((_, n) => (map["p" + (n + 1)] = `.in2-part[data-k=p${n + 1}]`)); } const o = {}; for (const k in map) { const e = d.querySelector(map[k]); if (e) o[k] = e; } return o; };
    const rich = (h) => h.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); // **mot** = gras
    const htmlOf = (t) => rich(esc(String(t).replace(/\{nom\}/g, name))).replace(/\n/g, "<br>");
    const mdOf = (el) => { let o = ""; el.childNodes.forEach((n) => { o += n.nodeType === 3 ? n.nodeValue : n.nodeName === "BR" ? "\n" : /^(B|STRONG)$/.test(n.nodeName) ? "**" + n.textContent + "**" : n.textContent; }); return o; };
    const applyTexts = (d, sc, to) => { const T = (LAYOUT._t || {})[edKey(to)] || {}, els = textsOf(d, sc); for (const k in els) if (typeof T[k] === "string") els[k].innerHTML = htmlOf(T[k]); };
    const applyLayout = (d, sc, to) => { applyTexts(d, sc, to); const L = LAYOUT[edKey(to)] || {}, els = elsOf(d, sc); for (const k in els) { if (sc.base && ["img", "face", "txt"].includes(k)) continue; els[k]._fx = els[k]._fy = 0; els[k]._fs = 1; applyOne(els[k], L[k] || (k === "name2" ? L.name : undefined)); } }; // « Corto Maltese » reprend d'abord la position de l'ancienne ligne unique
    // Garantie « tout est visible » : quelle que soit la taille / le format de l'écran, les textes, boutons et champs sont ramenés dans la zone visible (rétrécis s'ils sont trop grands, décalés s'ils débordent). Images laissées libres : un Corto coupé par le bord est voulu.
    const probe = document.createElement("div"); probe.style.cssText = "position:fixed;visibility:hidden;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)"; document.body.appendChild(probe);
    const pcs = getComputedStyle(probe), safeT = parseFloat(pcs.paddingTop) || 0, safeB = parseFloat(pcs.paddingBottom) || 0; probe.remove();
    const FIT = /^(txt|ask|btn|head|name|name2|mid|hi|q|lab|ok|cam|p\d+)$/;
    const cfgOf = (sc, k) => { const L = LAYOUT[sc.base && ["img", "face", "txt"].includes(k) ? sc.base : sc.key] || {}; return L[k] || (k === "name2" ? L.name : undefined); };
    const boxOf = (e) => { if (e.classList.contains("in2-txt")) { const rs = [...e.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width); if (!rs.length) return e.getBoundingClientRect(); return { left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)), top: Math.min(...rs.map((r) => r.top)), bottom: Math.max(...rs.map((r) => r.bottom)), width: 1, height: 1 }; } return e.getBoundingClientRect(); };
    const fit = (d, sc) => {
      if (editing || !d || !sc) return;
      const els = elsOf(d, sc), W = innerWidth, H = Math.min(lockedH, innerHeight), ml = 10 /* hauteur réellement visible */, mt = 10 + safeT, mb = 14 + safeB;
      for (const k in els) {
        if (!FIT.test(k) || (k === "txt" && sc.parts)) continue; const e = els[k], cfg = cfgOf(sc, k); e._fx = e._fy = 0; e._fs = 1; applyOne(e, cfg);
        let r = boxOf(e); if (!r.width && !r.height) continue; e._o = r.top; // ordre de lecture voulu (avant correction)
        const rw = r.right - r.left, rh = r.bottom - r.top; let fs = 1;
        if (rw > W - 2 * ml) fs = Math.min(fs, (W - 2 * ml) / rw); if (rh > H - mt - mb) fs = Math.min(fs, (H - mt - mb) / rh);
        if (fs < 1) { e._fs = fs; applyOne(e, cfg); r = boxOf(e); }
        const lim = k === "btn" || k === "ok" ? H - (56 + safeB) : H - mb; // le bouton reste au-dessus des flèches de navigation
        let dx = 0, dy = 0; if (r.bottom > lim) dy = lim - r.bottom; if (r.top + dy < mt) dy = mt - r.top; if (r.right > W - ml) dx = W - ml - r.right; if (r.left + dx < ml) dx = ml - r.left;
        if (dx || dy) { e._fx = Math.round(dx); e._fy = Math.round(dy); applyOne(e, cfg); }
      }
      // Les textes / boutons ne se marchent jamais dessus : dans l'ordre de lecture voulu, on pousse vers le bas ce qui en recouvre un autre, puis on remonte le tout si le bas de l'écran est dépassé
      const keys = Object.keys(els).filter((k) => FIT.test(k) && !(k === "txt" && sc.parts) && els[k]._o !== undefined).sort((a, b) => els[a]._o - els[b]._o);
      const shift = (k, d) => { if (!d) return; els[k]._fy = Math.round((els[k]._fy || 0) + d); applyOne(els[k], cfgOf(sc, k)); };
      const hov = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 4;
      for (let i = 1; i < keys.length; i++) for (let j = 0; j < i; j++) { const a = boxOf(els[keys[j]]), b = boxOf(els[keys[i]]); if (hov(a, b) && b.top < a.bottom + 8 && b.bottom > a.top) shift(keys[i], a.bottom + 8 - b.top); }
      for (let i = keys.length - 1; i >= 0; i--) {
        const k = keys[i], r = boxOf(els[k]); let lim = k === "btn" || k === "ok" ? H - (56 + safeB) : H - mb;
        for (let j = i + 1; j < keys.length; j++) { const b = boxOf(els[keys[j]]); if (hov(r, b)) lim = Math.min(lim, b.top - 8); }
        if (r.bottom > lim) shift(k, Math.max(lim - r.bottom, mt - r.top));
      }
    };
    let fitT = null; const fitSoon = () => { clearTimeout(fitT); fitT = setTimeout(() => fit(cur, SCREENS[idx]), 60); };
    window.addEventListener("resize", fitSoon); window.addEventListener("orientationchange", fitSoon);
    let name = opts.replay ? opts.name || "" : "";
    const IMG = (n) => `img/intro/e${n}.webp`;
    const CAM_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 16h8l3-5h10l3 5h8a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><circle cx="24" cy="26" r="7" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>';
    const ALL = [
      { key: "s1", img: 1, layout: "hello", hello: "Eh oh, bien le bonjour !", text: () => "Comment t'appelles-tu ?" },
      { key: "who", img: 1, layout: "who", lab: "Je m'appelle…", ok: "Valider" }, // écran d'identité (premier lancement seulement) : prénom + photo de tête
      { key: "s2", img: 2, layout: "welcome", head: () => `Enchanté, ${name} ! Laisse-moi me présenter à mon tour.`, name2: "Mon nom est…", name3: "Corto Maltese", text: () => "J'ai navigué sur toutes les mers du monde, exploré des terres lointaines et inconnues, croisé des empereurs, des pirates et des explorateurs, et vécu mille aventures extraordinaires." },
      { key: "s3", img: 3, layout: "top", text: () => "Aujourd'hui, après de longs mois passés à sillonner la Méditerranée, me voilà de retour à Venise. Bientôt, mon voilier glissera dans sa lagune scintillante, au cœur d'une ville où chaque palais cache un secret et chaque canal un mystère à découvrir." },
      { key: "s4", img: 4, layout: "top", text: () => "Depuis plus de mille ans, cette ville émerveille voyageurs, artistes et explorateurs du monde entier. Si tu le souhaites, je te guiderai à travers ses merveilles… et je te confierai une **mission de la plus haute importance**, une aventure qui te mènera au cœur de ses secrets et de son histoire.", ask: "Es-tu prêt à relever ce défi ?", button: "Oui, je suis prêt !" },
      { key: "s5", img: 5, layout: "center-top", face: true, parts: ["Parfait, alors c'est décidé !", "Voici mon bateau.", "Il sera bientôt amarré à l'embarcadère de **Santo Spirito**. Retrouvons-nous là-bas quand tu seras prêt."], text: () => "" },
      { key: "s6", base: "s5", img: 5, layout: "center-top", face: true, parts: ["Mais avant notre rencontre, je vais faire une nouvelle fois le tour de la lagune pour admirer, depuis mon voilier, les splendeurs de cette cité sur l'eau qui ne cesse de m'émerveiller."], text: () => "" },
    ];
    const SCREENS = ALL; // l'écran d'identité s'affiche toujours ; en rejeu il reprend le profil existant (nom, photo) et permet de le modifier
    const cur0 = opts.profile || null;
    let photoRes = cur0 && cur0.photo ? { photo: cur0.photo, cut: !!cur0.cut, frame: cur0.frame } : null; // { photo, cut, frame } : la tête de l'enfant (reprise du profil en rejeu)
    SCREENS.forEach((sc) => { const i = new Image(); i.src = IMG(sc.img); }); // préchargées
    // Verrou d'écran : la hauteur est figée à celle du départ (le clavier ne change plus la mise en page) ; le clavier ne rétrécit que la vue visible.
    const meta = document.querySelector('meta[name="viewport"]'), metaOld = meta && meta.content;
    if (meta) meta.content = metaOld + ", interactive-widget=resizes-visual";
    const lockedH = Math.round(window.visualViewport ? Math.max(visualViewport.height, innerHeight) : innerHeight);
    document.body.classList.add("intro-open"); // la carte est masquée pendant l'intro (elle n'apparaît qu'à l'écran 7)
    const root = document.createElement("div"); root.className = "in2"; root.style.setProperty("--lh", lockedH + "px"); document.body.appendChild(root);
    const restore = () => { if (meta) meta.content = metaOld; };
    // Ambiance sonore de l'introduction : la mer (vagues et appels de sternes, CC0, voir audio/credits.txt) dès le début ; l'« Ave maris stella » de Monteverdi, très doucement, à l'entrée de Corto (écran de présentation).
    // Tout s'éteint progressivement pendant la finale (le bateau et la carte).
    const fadeA = (a, to, ms, done) => { clearInterval(a._t); const v0 = a.volume, t0 = Date.now(); a._t = setInterval(() => { const k = Math.min(1, (Date.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, v0 + (to - v0) * k)); if (k >= 1) { clearInterval(a._t); done && done(); } }, 60); };
    const amb = new Audio("audio/mer-mouettes.mp3"); amb.loop = true; amb.volume = 0; amb.preload = "auto";
    const mus = new Audio("audio/ave-maris-stella-intro.mp3"); mus.volume = 0; mus.preload = "auto"; let musOn = false;
    let ambDead = false; const AMB_VOL = 0.34, MUS_VOL = 0.42;
    const ambStart = () => { if (ambDead) return; amb.play().then(() => { if (!ambDead) fadeA(amb, AMB_VOL, 2500); }).catch(() => { const once = () => { root.removeEventListener("pointerdown", once, true); ambStart(); }; root.addEventListener("pointerdown", once, true); }); }; // les navigateurs exigent parfois un premier toucher
    const musStart = () => { if (musOn || ambDead) return; musOn = true; mus.play().then(() => { if (!ambDead) fadeA(mus, MUS_VOL, 5000); }).catch(() => {}); }; // entre doucement quand Corto se présente
    const ambStop = (ms) => { if (ambDead) return; ambDead = true; for (const a of [amb, mus]) fadeA(a, 0, ms, () => { a.pause(); a.src = ""; }); };
    ambStart();
    root.innerHTML = '<div class="in2-bg"></div><div class="in2-veil"></div><div class="in2-nav"><button type="button" class="in2-prev" aria-label="Précédent">‹</button><button type="button" class="in2-next" aria-label="Suivant">›</button></div>';
    const prevBtn = root.querySelector(".in2-prev"), nextBtn = root.querySelector(".in2-next");
    let cur = null, idx = -1, busy = false, opening = null, boatPan = null, readT = null, finaleStarted = false;
    const build = (sc) => {
      const d = document.createElement("div"); d.className = `in2-s ${sc.layout}`;
      const txt = rich(esc(sc.text ? sc.text() : "")).replace(/\n\n/g, "<br><br>");
      if (sc.layout === "hello") { // écran 1 : Corto à gauche ; à droite le salut (sur une ligne, à hauteur de son visage), la question et le champ prénom
        d.innerHTML = `<div class="hl-wrap"><div class="hl-top"><img class="hl-img" style="opacity:0" src="${IMG(sc.img)}" alt=""><div class="hl-col" style="opacity:0"><p class="hl-hi">${esc(sc.hello)}</p><p class="hl-q">${esc(sc.text())}</p></div></div></div>`;
        return d;
      }
      if (sc.layout === "who") { // écran d'identité : « Je m'appelle… », le champ prénom, le rond caméra (la tête), la validation en bas
        d.innerHTML = `<div class="wh"><p class="wh-lab">${esc(sc.lab)}</p><input class="wh-in" id="in2-name" maxlength="30" autocomplete="off" placeholder="Ton prénom" value="${esc(name)}"><button type="button" class="wh-cam" aria-label="Prendre ma tête en photo">${CAM_SVG}</button><button type="button" class="wh-ok">${esc(sc.ok)}</button></div>`;
        const cam = d.querySelector(".wh-cam"), inp = d.querySelector(".wh-in"), paint = () => { cam.classList.toggle("has", !!photoRes); cam.innerHTML = photoRes ? `<img src="${photoRes.photo}" alt="">` : CAM_SVG; };
        paint(); inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } };
        cam.onclick = async () => { if (editing) return; inp.blur(); const r = await selfie(); if (r) { photoRes = r; paint(); } };
        return d;
      }
      if (sc.layout === "welcome") { // écran 2 : Corto joyeux (fondu en bas) et sa salutation en haut, « Je m'appelle Corto Maltese. » en grand dessous ; Corto de l'aquarelle (sans le bateau) en bas à droite, la suite du texte à gauche
        d.innerHTML = `<div class="wl-top"><img class="wl-face" src="img/corto-content.webp" alt=""><p>${esc(sc.head())}</p></div><p class="wl-name">${esc(sc.name2)}</p><p class="wl-name2">${esc(sc.name3)}</p><img class="wl-img" src="img/intro/e2r.webp" alt=""><div class="wl-mid"><p>${esc(sc.text())}</p></div>`;
        return d;
      }
      d.innerHTML = `<img class="in2-img" src="${IMG(sc.img)}" alt="">${sc.face ? '<img class="in2-face" src="img/corto-content.webp" alt="">' : ""}<div class="in2-txt">${sc.parts ? sc.parts.map((t, n) => `<p class="in2-part${t.length > 90 ? " in2-long" : ""}" data-k="p${n + 1}">${rich(esc(t))}</p>`).join("") : `<p>${txt}</p>`}${sc.ask ? `<p class="in2-ask">${esc(sc.ask)}</p>` : ""}${sc.button ? `<button type="button" class="in2-btn">${esc(sc.button)}</button>` : ""}</div>`;
      const im = d.querySelector(".in2-img"); // image à sa proportion réelle, contenue dans la page (le fondu des bords suit l'image elle-même)
      if (sc.layout === "bottom" || sc.layout === "top") { const fit = () => { const k = Math.min(innerWidth / im.naturalWidth, lockedH / im.naturalHeight); im.style.width = Math.round(im.naturalWidth * k) + "px"; im.style.height = Math.round(im.naturalHeight * k) + "px"; }; if (im.complete && im.naturalWidth) fit(); else im.onload = fit; }
      return d;
    };
    const finish = (soft) => {
      const profile = photoRes ? { name, photo: photoRes.photo, ...(photoRes.cut ? { cut: true } : {}), ...(photoRes.frame ? { frame: true } : {}) } : { name, avatar: (cur0 && cur0.avatar) || AVATARS[Math.floor(Math.random() * AVATARS.length)] };
      if (cur0 && cur0.photo && cur0.photo === profile.photo) { profile.outfit = cur0.outfit; profile.outfitPhoto = cur0.outfitPhoto; } // même photo : on garde la tenue
      saveProfile(profile);
      resolve(profile); restore(); document.body.classList.remove("intro-open"); if (vv) { vv.removeEventListener("resize", lift); vv.removeEventListener("scroll", lift); }
      const msg = document.createElement("div"); msg.className = "in2-end"; // écran 7 : la carte est révélée pour la première fois, Corto parle en bas
      msg.innerHTML = `<i class="sp"></i><img src="img/corto-content.webp" alt=""><p>Je te laisse découvrir la carte de Venise, qui sera le terrain de notre aventure. Étudie-la bien : elle pourrait t'être précieuse lorsque commencera notre mission…<span class="gap"></span>À bientôt, moussaillon !</p>`;
      msg.style.opacity = 0; document.body.appendChild(msg);
      // Le texte court sur toute la largeur puis s'enroule autour de Corto, calé en bas à droite : une cale invisible (flottante) repousse l'image vers le bas du bloc
      const wrapAround = () => { const sp = msg.querySelector(".sp"), im = msg.querySelector("img"), pp = msg.querySelector("p"); sp.style.height = "0px"; for (let n = 0; n < 4; n++) sp.style.height = Math.max(0, pp.offsetHeight - im.offsetHeight + 6) + "px"; };
      wrapAround(); setTimeout(wrapAround, 300); window.addEventListener("resize", wrapAround);
      if (soft) root.remove(); else root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1400, fill: "forwards", easing: "ease-in-out" }).onfinish = () => root.remove();
      msg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: soft ? 100 : 700, fill: "forwards" });
      // Le message reste affiché, stable, jusqu'au premier toucher sur la carte
      let gone = false; const bye = () => { if (gone) return; gone = true; document.removeEventListener("pointerdown", bye, true); window.removeEventListener("resize", wrapAround); msg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }).onfinish = () => msg.remove(); };
      setTimeout(() => document.addEventListener("pointerdown", bye, true), 1500);
    };
    const vv = window.visualViewport;
    const lift = () => { // remonte le contenu juste assez pour que le champ reste visible au-dessus du clavier
      const wrap = root.querySelector(".in2-s:last-of-type .wh"), inp = root.querySelector("#in2-name"); if (!wrap || !inp || !vv) return;
      const kb = Math.max(0, lockedH - vv.height - vv.offsetTop); wrap.style.transition = "transform .25s ease-out";
      if (!kb) { wrap.style.transform = ""; return; }
      const prev = wrap.style.transform; wrap.style.transform = ""; const bottom = inp.getBoundingClientRect().bottom + 18, free = lockedH - kb; wrap.style.transform = prev;
      wrap.style.transform = `translateY(${-Math.max(0, Math.round(bottom - free))}px)`;
    };
    if (vv) { vv.addEventListener("resize", lift); vv.addEventListener("scroll", lift); }
    root.addEventListener("focusin", () => setTimeout(lift, 120)); root.addEventListener("focusout", () => setTimeout(lift, 120));
    // Écran 6 = même écran que le 5 : le bateau, le tableau et la tête ne bougent pas, seuls les textes d'en haut sont remplacés en fondu
    const morph = (sc, to) => {
      const t = cur.querySelector(".in2-txt"), old = [...t.querySelectorAll(".in2-part")];
      old.forEach((p) => { p.removeAttribute("data-k"); p.classList.remove("in2-part"); p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: "forwards" }).onfinish = () => p.remove(); });
      sc.parts.forEach((txt, n) => { const p = document.createElement("p"); p.className = "in2-part" + (txt.length > 90 ? " in2-long" : ""); p.dataset.k = "p" + (n + 1); p.innerHTML = rich(esc(txt)); p.style.opacity = 0; t.appendChild(p); p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 400, fill: "forwards" }).onfinish = () => (p.style.opacity = ""); });
      idx = to; applyTexts(cur, sc, to); const els = elsOf(cur, sc); for (const k in els) if (/^p\d+$/.test(k)) applyOne(els[k], (LAYOUT[sc.key] || {})[k]);
      fit(cur, sc); setTimeout(() => fit(cur, sc), 350);
      prevBtn.style.visibility = "visible"; if (editing) select(null);
      if (sc.key === "s6" && !editing) readT = setTimeout(() => finale(), 5000); // 5 s après l'apparition de l'écran, la transition vers la carte démarre
      else if (!editing) {} // retour à l'écran 5 : pas de minuterie
    };
    // Finale : le bateau rapetisse, le tableau se dissout, la carte de Venise se matérialise ; la caméra reste sur le bateau, posé sur l'eau de la lagune
    const finale = async () => {
      if (finaleStarted) return; finaleStarted = true; clearTimeout(readT);
      if (vv) { vv.removeEventListener("resize", lift); vv.removeEventListener("scroll", lift); }
      const m = opts.map, B = opts.boat, bt = cur && cur.querySelector(".in2-img");
      ambStop(!m || !B || !bt || editing ? 1800 : 7600); // fondu de sortie progressif tout au long de la transition vers la carte
      if (!m || !B || !bt || editing) { finish(); return; }
      try {
        B.hide?.();
        const cr = m.getContainer().getBoundingClientRect(), r = bt.getBoundingClientRect();
        const px = r.left + r.width / 2 - cr.left, py = r.top + r.height * 0.78 - cr.top, W = cr.width, H = cr.height; // la coque (78 % de la hauteur) est le point d'ancrage
        m.stop(); m.jumpTo({ center: B.lngLat, zoom: 17.2, bearing: 0, pitch: 0 }); m.panBy([W / 2 - px, H / 2 - py], { animate: false });
        root.querySelector(".in2-nav")?.remove(); root.querySelector(".in2-ed")?.remove(); root.querySelector(".in2-handle")?.remove();
        const cream = document.createElement("div"); cream.className = "in2-cream"; root.insertBefore(cream, root.firstChild); root.classList.add("in2-fin");
        document.body.classList.remove("intro-open"); // la carte (déjà chargée sous le tableau) devient visible dès que le fond s'efface
        const D = 7000, ease = "cubic-bezier(.45,0,.25,1)";
        cur.querySelectorAll(".in2-txt, .in2-face").forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000, fill: "forwards" }));
        cream.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D * 0.7, delay: D * 0.2, fill: "forwards", easing: "ease-in-out" });
        root.querySelector(".in2-bg").animate([{ opacity: 1 }, { opacity: 0 }], { duration: D * 0.7, delay: D * 0.2, fill: "forwards", easing: "ease-in-out" });
        const s0 = parseFloat(getComputedStyle(bt).scale) || 1, s1 = B.w / bt.offsetWidth;
        // « scale » est appliqué avant le translate(-50%,-50%) de la mise en page : on compense par « translate » pour que la coque reste exactement au même point de l'écran pendant que le bateau rapetisse
        const tr = (getComputedStyle(bt).translate || "0px 0px").split(" ").map(parseFloat), tx = tr[0] || 0, ty = tr[1] || 0, k = { duration: D, fill: "forwards", easing: ease };
        bt.animate([{ scale: s0 }, { scale: s1 }], k);
        bt.animate([{ translate: `${tx}px ${ty}px` }, { translate: `${tx + (s1 - s0) * bt.offsetWidth / 2}px ${ty + (s1 - s0) * bt.offsetHeight / 2}px` }], k);
        m.easeTo({ center: B.lngLat, zoom: 15, offset: [px - W / 2, py - H / 2], duration: D, easing: (t) => t * t * (3 - 2 * t) });
        await sleep(D + 80);
        B.ensure(); // le bateau devient un repère de la carte, exactement au même endroit et à la même taille
        bt.style.visibility = "hidden";
      } catch (e) { try { B.ensure(); } catch {} }
      finish(true);
    };
    const go = async (to) => {
      if (busy || to < 0) return;
      clearTimeout(readT);
      if (SCREENS[idx]?.layout === "who" && to > idx) { // le prénom est obligatoire pour quitter l'écran d'identité
        const i = root.querySelector("#in2-name"); const v = i ? i.value.trim() : name; if (!v) { if (i) i.focus(); return; } name = v;
      }
      if (to >= SCREENS.length) { if (opening) opening.skip(); finale(); return; }
      const psc = SCREENS[idx], tsc = SCREENS[to];
      if (cur && psc && tsc && (tsc.base === psc.key || psc.base === tsc.key)) { busy = true; setTimeout(() => (busy = false), 450); morph(tsc, to); return; } // même écran (bateau, tableau, tête) : seul le texte change
      busy = true; setTimeout(() => (busy = false), 450);
      const sc = SCREENS[to], first = idx === -1, d = build(sc); root.insertBefore(d, root.querySelector(".in2-nav")); idx = to; applyLayout(d, sc, to); fit(d, sc); setTimeout(() => fit(d, sc), 350); if (editing) setTimeout(() => select(null), 0);
      prevBtn.style.visibility = to === 0 ? "hidden" : "visible";
            d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: sc.layout === "hello" && first ? 1 : 600, fill: "forwards", easing: "ease-in-out" });
      if (cur) { const old = cur; old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards", easing: "ease-in-out" }).onfinish = () => old.remove(); }
      cur = d;
      if (sc.layout === "welcome") musStart(); // Corto se présente : la musique entre
      if (sc.layout.startsWith("center") && !boatPan && !matchMedia("(prefers-reduced-motion: reduce)").matches) { // le bateau reste en place (il tangue seulement) : c'est le tableau de fond qui défile très lentement vers la gauche, ce qui donne l'impression que le bateau avance
        boatPan = root.querySelector(".in2-bg").animate([{ backgroundPosition: "10% 50%" }, { backgroundPosition: "30% 50%" }], { duration: 60000, easing: "linear", fill: "forwards" });
      }
      const vl = root.querySelector(".in2-veil"); if (sc.layout !== "hello") vl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }); // le tableau reste en permanence ; le voile de lecture n'est que sur l'écran 1
      if (sc.layout === "hello") { opening = openingShot(d, !first); let ready = !!(!first); opening.done.then(() => (ready = true)); if (!first) ready = true; d.addEventListener("click", (e) => { if (ready && !editing) go(to + 1); }); }
      else if (sc.layout === "who") { d.querySelector(".wh-ok").onclick = () => { if (!editing) go(to + 1); }; }
      else if (sc.button) d.querySelector(".in2-btn").onclick = () => go(to + 1);
      else setTimeout(() => d.addEventListener("click", (e) => { if (!editing && !e.target.closest("input,form,button")) go(idx + 1); }), 350);
    };
    prevBtn.onclick = () => go(idx - 1); nextBtn.onclick = () => go(idx + 1);
    // ───── Éditeur de mise en page (aperçu local uniquement) : on glisse les images et les textes, ± pour la taille, « Enregistrer » écrit data/intro-layout.json ─────
    let editing = false, selEl = null, selKey = null;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
    const canEdit = local; // l'éditeur n'existe que dans l'aperçu local (jamais sur les téléphones)
    const handle = document.createElement("div"); handle.className = "in2-handle"; handle.hidden = true; root.appendChild(handle);
    const placeHandle = () => { if (!selEl || !editing) { handle.hidden = true; return; } const r = selEl.getBoundingClientRect(); handle.style.left = Math.min(innerWidth - 14, r.right) + "px"; handle.style.top = Math.min(lockedH - 14, r.bottom) + "px"; handle.hidden = false; };
    const select = (k) => { root.querySelectorAll(".in2-sel").forEach((e) => e.classList.remove("in2-sel")); selKey = k; selEl = null; if (k) { const e = elsOf(cur, SCREENS[idx])[k]; if (e) { selEl = e; e.classList.add("in2-sel"); } } placeHandle(); };
    const cfgFor = (k) => { const sc0 = SCREENS[idx], key = sc0.base && ["img", "face", "txt"].includes(k) ? sc0.base : edKey(idx); // l'écran 6 partage le bateau, la tête et le conteneur de l'écran 5
      LAYOUT[key] ||= {}; LAYOUT[key][k] ||= k === "name2" && LAYOUT[key].name ? { ...LAYOUT[key].name } : { x: 0, y: 0, s: 1 }; return LAYOUT[key][k]; };
    let txtEd = null; const stopText = () => { if (!txtEd) return; for (const [, e] of txtEd) { e.contentEditable = "false"; e.removeAttribute("contenteditable"); e.classList.remove("in2-txted"); e.oninput = null; } txtEd = null; getSelection()?.removeAllRanges(); };
    if (canEdit) {
      const bar = document.createElement("div"); bar.className = "in2-ed";
      bar.innerHTML = '<button type="button" data-a="toggle">✎ Mise en page</button><span class="in2-ed-tools" hidden><button data-a="minus">A−</button><button data-a="plus">A+</button><button data-a="text">✎ Texte</button><button data-a="bold"><b>G</b></button><button data-a="reset">Réinit. élément</button><button data-a="flip">⇅</button><button data-a="save">💾 Enregistrer</button><em></em></span>';
      root.appendChild(bar); const tools = bar.querySelector(".in2-ed-tools"), msg = bar.querySelector("em");
      const say = (t) => { msg.textContent = t; clearTimeout(say.t); say.t = setTimeout(() => (msg.textContent = ""), 2500); };
      bar.addEventListener("click", async (e) => {
        const a = e.target.closest("button")?.dataset.a; if (!a) return;
        if (a === "toggle") { stopText(); editing = !editing; if (editing) applyLayout(cur, SCREENS[idx], idx); else fit(cur, SCREENS[idx]); /* en édition : positions brutes ; sinon : positions garanties visibles */ root.classList.toggle("in2-editing", editing); tools.hidden = !editing; select(null); return; }
        if (a === "save") { try { const r = await fetch("api/intro-layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(LAYOUT) }); say(r.ok ? "Enregistré ✔ (data/intro-layout.json)" : "Échec : serveur sans --dev ?"); } catch { say("Échec de l'enregistrement"); } return; }
        if (a === "text") {
          if (txtEd) { stopText(); return; }
          if (!selKey) { say("Touche d'abord un texte"); return; }
          const te = textsOf(cur, SCREENS[idx]), keys = !te[selKey] ? [] : [selKey];
          const els = keys.map((k) => [k, te[k]]).filter((x) => x[1]); if (!els.length) { say("Pas de texte ici"); return; }
          txtEd = els; for (const [k, e] of els) { e.contentEditable = "plaintext-only"; e.classList.add("in2-txted"); e.oninput = () => { const T = ((LAYOUT._t ||= {})[edKey(idx)] ||= {}); let v = mdOf(e).replace(/\n{3,}/g, "\n\n").replace(/\n$/, ""); if (name && SCREENS[idx].layout === "welcome" && k === "head") v = v.split(name).join("{nom}"); T[k] = v; }; }
          els[0][1].focus(); say("Écris, puis ✎ Texte pour finir"); return;
        }
        if (a === "bold") { if (!txtEd) { say("Active ✎ Texte et sélectionne un mot"); return; } const sel = getSelection(), t = String(sel); if (!t) { say("Sélectionne d'abord un mot"); return; } document.execCommand("insertText", false, /^\*\*[\s\S]*\*\*$/.test(t) ? t.slice(2, -2) : "**" + t + "**"); return; } // gras : entoure la sélection de **…** (ou les retire)
        if (a === "flip") { bar.classList.toggle("in2-ed-bottom"); return; }
        if (!selKey) { say("Touche d'abord un élément"); return; }
        const c = cfgFor(selKey);
        if (a === "plus") c.s = Math.round((c.s + 0.05) * 100) / 100;
        if (a === "minus") c.s = Math.max(0.3, Math.round((c.s - 0.05) * 100) / 100);
        if (a === "reset") { c.x = 0; c.y = 0; c.s = 1; }
        applyOne(selEl, c); placeHandle();
      });
      let drag = null;
      root.addEventListener("pointerdown", (e) => {
        if (txtEd && e.target.closest("[contenteditable]")) return; // on tape dans le texte : pas de glisser
        if (txtEd) stopText();
        if (!editing || e.target.closest(".in2-ed,.in2-nav,.in2-handle")) return;
        const els = elsOf(cur, SCREENS[idx]); let hit = null; // l'élément éditable le plus en avant sous le doigt (images comprises, même sous un bloc de texte)
        for (const t of document.elementsFromPoint(e.clientX, e.clientY)) { const m = Object.keys(els).filter((k) => els[k].contains(t)); if (m.length) { hit = m.find((k) => !m.some((k2) => k2 !== k && els[k].contains(els[k2]))); break; } }
        if (!hit) { select(null); return; }
        e.preventDefault(); select(hit); const c = cfgFor(hit); drag = { k: hit, x0: e.clientX, y0: e.clientY, cx: c.x, cy: c.y }; root.setPointerCapture?.(e.pointerId);
      }, true);
      // Redimensionner : tirer la poignée ronde (coin bas-droit de l'élément), pincer à deux doigts, ou molette
      let rs = null; const pinch = new Map(); const clampS = (v) => Math.max(0.2, Math.min(5, Math.round(v * 100) / 100));
      handle.addEventListener("pointerdown", (e) => { if (!selEl) return; e.preventDefault(); e.stopPropagation(); const r = selEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; rs = { cx, cy, d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, s0: cfgFor(selKey).s }; handle.setPointerCapture?.(e.pointerId); });
      handle.addEventListener("pointermove", (e) => { if (!rs) return; const c = cfgFor(selKey); c.s = clampS(rs.s0 * (Math.hypot(e.clientX - rs.cx, e.clientY - rs.cy) / rs.d0)); applyOne(selEl, c); placeHandle(); });
      handle.addEventListener("pointerup", () => { rs = null; }); handle.addEventListener("pointercancel", () => { rs = null; });
      root.addEventListener("pointerdown", (e) => { if (editing && selEl) { pinch.set(e.pointerId, [e.clientX, e.clientY]); if (pinch.size === 2) { const p = [...pinch.values()]; pinch.base = { d: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) || 1, s: cfgFor(selKey).s }; drag = null; } } }, true);
      root.addEventListener("pointermove", (e) => { if (!pinch.has(e.pointerId)) return; pinch.set(e.pointerId, [e.clientX, e.clientY]); if (pinch.size === 2 && pinch.base) { const p = [...pinch.values()], c = cfgFor(selKey); c.s = clampS(pinch.base.s * (Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) / pinch.base.d)); applyOne(selEl, c); placeHandle(); } });
      root.addEventListener("wheel", (e) => { if (!editing || !selEl) return; e.preventDefault(); const c = cfgFor(selKey); c.s = clampS(c.s * (e.deltaY < 0 ? 1.05 : 0.95)); applyOne(selEl, c); placeHandle(); }, { passive: false });
      root.addEventListener("pointermove", (e) => { if (!drag) return; const c = cfgFor(drag.k); c.x = Math.round((drag.cx + ((e.clientX - drag.x0) / innerWidth) * 100) * 100) / 100; c.y = Math.round((drag.cy + ((e.clientY - drag.y0) / lockedH) * 100) * 100) / 100; applyOne(selEl, c); placeHandle(); });
      const end = () => { drag = null; rs = null; pinch.clear(); }; root.addEventListener("pointerup", end); root.addEventListener("pointercancel", end);
      root.addEventListener("click", (e) => { if (editing && !e.target.closest(".in2-ed,.in2-nav")) { e.stopPropagation(); e.preventDefault(); } }, true);
    }
    go(0);
  });
}

/* ───────── Corto parle (message ponctuel par-dessus la carte) ───────── */
// Texte « tapé à la machine » : toutes les lettres sont déjà en place (la mise en page ne bouge pas) mais invisibles ; elles apparaissent une à une, avec un curseur et de petites pauses à la ponctuation.
function typewriter(el, text, delay = 450) {
  el.textContent = ""; const chars = [], caret = document.createElement("span"); caret.className = "tw-caret";
  for (const ch of text) { const sp = document.createElement("span"); sp.textContent = ch; sp.style.opacity = "0"; el.appendChild(sp); chars.push(sp); }
  let i = 0, t = null; const api = { done: false, finish() { clearTimeout(t); chars.forEach((c) => (c.style.opacity = "1")); caret.remove(); api.done = true; } };
  const step = () => {
    if (i >= chars.length) { api.finish(); return; }
    const c = chars[i++]; c.style.opacity = "1"; c.after(caret); const ch = c.textContent;
    t = setTimeout(step, ch === "," ? 150 : ".!?…:".includes(ch) ? 300 : ch === " " ? 30 : 26 + Math.random() * 28);
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) api.finish(); else t = setTimeout(step, delay);
  return api;
}

export function cortoSays(text) {
  // Corto parle : bande basse, texte à gauche, Corto joyeux à droite. Tous les boutons du bas disparaissent le temps de l'échange ; la pastille de Corto devient sa tête (transition),
  // et un toucher n'importe où ferme le message : la tête redevient pastille et les boutons reviennent.
  document.querySelectorAll(".doge-msg").forEach((e) => e.remove());
  const btn = document.getElementById("corto-btn"), br = btn && btn.getBoundingClientRect();
  const m = document.createElement("div"); m.className = "doge-msg";
  m.innerHTML = `<div class="dm-txt">${esc(text)}</div><img class="dm-corto" src="img/corto-content.webp" alt="">`;
  document.body.appendChild(m); document.body.classList.add("corto-talk");
  const big = m.querySelector(".dm-corto"), tw = typewriter(m.querySelector(".dm-txt"), text); // le texte se tape après l'arrivée de Corto
  const from = () => { const r = big.getBoundingClientRect(); return br ? `translate(${br.left + br.width / 2 - (r.left + r.width / 2)}px, ${br.bottom - r.bottom}px) scale(${br.width / r.width})` : "none"; };
  m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: "forwards" });
  if (br) big.animate([{ transformOrigin: "50% 100%", transform: from() }, { transformOrigin: "50% 100%", transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.9,.3,1.1)" });
  let gone = false;
  const bye = () => { if (gone) return; if (!tw.done) { tw.finish(); return; } /* premier toucher : le texte s'affiche en entier ; le suivant ferme */ gone = true; document.removeEventListener("pointerdown", bye, true);
    if (br) big.animate([{ transformOrigin: "50% 100%", transform: "none" }, { transformOrigin: "50% 100%", transform: from() }], { duration: 260, easing: "ease-in", fill: "forwards" });
    m.querySelector(".dm-txt").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
    m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: 120, fill: "forwards" }).onfinish = () => { m.remove(); document.body.classList.remove("corto-talk"); }; };
  setTimeout(() => document.addEventListener("pointerdown", bye, true), 300);
}

/* ───────── Modifier son profil : nom, pictogramme ou nouvelle photo ───────── */
export function editProfile(cur) {
  return new Promise((resolve) => {
    let photo = cur.photo || null, cutP = !!cur.cut, frameP = cur.frame || null, avatar = cur.avatar || null;
    const root = document.createElement("div"); root.className = "pf";
    root.innerHTML = `<div class="pf-card"><h3>Ton profil</h3><div class="pf-cur" id="pf-cur"></div>
      <input class="t" id="pf-name" maxlength="30" autocomplete="off" value="${esc(cur.name)}" placeholder="Ton nom">
      <p class="pf-l">Choisis un pictogramme</p><div class="in-grid">${AVATARS.map((a) => `<button type="button" data-a="${a}">${a}</button>`).join("")}</div>
      <button type="button" class="in-photo" data-photo>📷 Prendre une nouvelle photo</button>
      <div class="pf-bar"><button type="button" class="cam-btn" data-x>Annuler</button><button type="button" class="cam-go" data-ok>Valider</button></div></div>`;
    document.body.appendChild(root);
    const cur$ = root.querySelector("#pf-cur"), name = root.querySelector("#pf-name");
    const show = () => { cur$.innerHTML = photo ? `<img class="in-ph${cutP ? " cut" : ""}${frameP ? " frame" : ""}" src="${photo}" alt="">` : `<span class="pf-em">${avatar || "🙂"}</span>`; };
    show();
    root.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => { avatar = b.dataset.a; photo = null; show(); }));
    root.querySelector("[data-photo]").onclick = async () => { const p = await selfie(); if (p) { photo = p.photo; cutP = p.cut; frameP = p.frame || null; show(); } };
    const done = (v) => { root.remove(); resolve(v); };
    root.querySelector("[data-x]").onclick = () => done(null);
    root.querySelector("[data-ok]").onclick = () => { const n = name.value.trim(); if (!n) { name.focus(); return; } const p = { name: n }; if (photo) { p.photo = photo; if (cutP) p.cut = true; if (frameP) p.frame = true; } else p.avatar = avatar || "🙂"; done(p); };
  });
}
