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
    const EDITABLE = { hello: { img: ".hl-img", hi: ".hl-hi", q: ".hl-q" }, who: { lab: ".wh-lab", name: ".wh-in", cam: ".wh-cam", ok: ".wh-ok" }, welcome: { face: ".wl-face", head: ".wl-top p", name: ".wl-name", name2: ".wl-name2", img: ".wl-img", mid: ".wl-mid" }, other: { img: ".in2-img", txt: ".in2-txt" } };
    const edKey = (to) => SCREENS[to].key; // clé stable de chaque écran (s1…s6, who) : les réglages enregistrés ne bougent pas si on insère un écran
    const elsOf = (d, sc) => { const map = EDITABLE[["hello", "welcome", "who"].includes(sc.layout) ? sc.layout : "other"]; const o = {}; for (const k in map) { const e = d.querySelector(map[k]); if (e) o[k] = e; } return o; };
    const applyOne = (e, v) => { if (!v) { e.style.translate = ""; e.style.scale = ""; return; } e.style.translate = `${v.x || 0}vw calc(${v.y || 0} * var(--lh) / 100)`; e.style.scale = v.s && v.s !== 1 ? String(v.s) : ""; };
    // Textes modifiables : réglages dans LAYOUT._t[sN][clé] ; « {nom} » est remplacé par le prénom
    const TEXTSEL = { hello: { hi: ".hl-hi", q: ".hl-q" }, welcome: { head: ".wl-top p", name: ".wl-name", name2: ".wl-name2", mid: ".wl-mid p" }, who: { lab: ".wh-lab", ok: ".wh-ok" }, other: { txt: ".in2-txt p", btn: ".in2-btn" } };
    const textsOf = (d, sc) => { const map = TEXTSEL[["hello", "welcome", "who"].includes(sc.layout) ? sc.layout : "other"]; const o = {}; for (const k in map) { const e = d.querySelector(map[k]); if (e) o[k] = e; } return o; };
    const htmlOf = (t) => esc(String(t).replace(/\{nom\}/g, name)).replace(/\n/g, "<br>");
    const applyTexts = (d, sc, to) => { const T = (LAYOUT._t || {})[edKey(to)] || {}, els = textsOf(d, sc); for (const k in els) if (typeof T[k] === "string") els[k].innerHTML = htmlOf(T[k]); };
    const applyLayout = (d, sc, to) => { applyTexts(d, sc, to); const L = LAYOUT[edKey(to)] || {}, els = elsOf(d, sc); for (const k in els) applyOne(els[k], L[k] || (k === "name2" ? L.name : undefined)); }; // « Corto Maltese » reprend d'abord la position de l'ancienne ligne unique
    let name = opts.replay ? opts.name || "" : "";
    const IMG = (n) => `img/intro/e${n}.webp`;
    const CAM_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 16h8l3-5h10l3 5h8a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><circle cx="24" cy="26" r="7" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>';
    const ALL = [
      { key: "s1", img: 1, layout: "hello", hello: "Eh oh, bien le bonjour !", text: () => "Comment t'appelles-tu ?" },
      { key: "who", img: 1, layout: "who", lab: "Je m'appelle…", ok: "Valider" }, // écran d'identité (premier lancement seulement) : prénom + photo de tête
      { key: "s2", img: 2, layout: "welcome", head: () => `Enchanté, ${name} ! Laisse-moi me présenter à mon tour.`, name2: "Mon nom est…", name3: "Corto Maltese", text: () => "J'ai navigué sur toutes les mers du monde, exploré des terres lointaines et inconnues, croisé des empereurs, des pirates et des explorateurs, et vécu mille aventures extraordinaires." },
      { key: "s3", img: 3, layout: "top", text: () => "Aujourd'hui, après de longs mois passés à sillonner la Méditerranée, me voilà de retour à Venise. Bientôt, mon voilier glissera dans sa lagune scintillante, au cœur d'une ville où chaque palais cache un secret et chaque canal un mystère à découvrir." },
      { key: "s4", img: 4, layout: "bottom", text: () => "Depuis plus de mille ans, cette ville émerveille voyageurs, artistes et explorateurs du monde entier. Si tu le souhaites, je te guiderai à travers ses merveilles… et je te confierai une mission de la plus haute importance, une aventure qui te mènera au cœur de ses secrets et de son histoire.\n\nEs-tu prêt à relever ce défi ?", button: "Oui, je suis prêt !" },
      { key: "s5", img: 5, layout: "center-top", text: () => "Parfait, alors c'est décidé ! Mon bateau sera bientôt amarré à l'embarcadère de Santo Spirito. Retrouvons-nous là-bas quand tu seras prêt." },
      { key: "s6", img: 5, layout: "center-bottom", text: () => "Mais avant notre rencontre, je vais faire une nouvelle fois le tour de la lagune pour admirer, depuis mon voilier, les splendeurs de cette cité sur l'eau qui ne cesse de m'émerveiller." },
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
    root.innerHTML = '<div class="in2-bg"></div><div class="in2-veil"></div><div class="in2-nav"><button type="button" class="in2-prev" aria-label="Précédent">‹</button><button type="button" class="in2-next" aria-label="Suivant">›</button></div>';
    const prevBtn = root.querySelector(".in2-prev"), nextBtn = root.querySelector(".in2-next");
    let cur = null, idx = -1, busy = false, opening = null;
    const build = (sc) => {
      const d = document.createElement("div"); d.className = `in2-s ${sc.layout}`;
      const txt = esc(sc.text ? sc.text() : "").replace(/\n\n/g, "<br><br>");
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
      d.innerHTML = `<img class="in2-img" src="${IMG(sc.img)}" alt=""><div class="in2-txt"><p>${txt}</p>${sc.button ? `<button type="button" class="in2-btn">${esc(sc.button)}</button>` : ""}</div>`;
      const im = d.querySelector(".in2-img"); // image à sa proportion réelle, contenue dans la page (le fondu des bords suit l'image elle-même)
      if (sc.layout === "bottom" || sc.layout === "top") { const fit = () => { const k = Math.min(innerWidth / im.naturalWidth, lockedH / im.naturalHeight); im.style.width = Math.round(im.naturalWidth * k) + "px"; im.style.height = Math.round(im.naturalHeight * k) + "px"; }; if (im.complete && im.naturalWidth) fit(); else im.onload = fit; }
      return d;
    };
    const finish = () => {
      const profile = photoRes ? { name, photo: photoRes.photo, ...(photoRes.cut ? { cut: true } : {}), ...(photoRes.frame ? { frame: true } : {}) } : { name, avatar: (cur0 && cur0.avatar) || AVATARS[Math.floor(Math.random() * AVATARS.length)] };
      if (cur0 && cur0.photo && cur0.photo === profile.photo) { profile.outfit = cur0.outfit; profile.outfitPhoto = cur0.outfitPhoto; } // même photo : on garde la tenue
      saveProfile(profile);
      resolve(profile); restore(); document.body.classList.remove("intro-open");
      const msg = document.createElement("div"); msg.className = "in2-end"; // écran 7 : la carte est révélée pour la première fois, Corto parle en bas
      msg.innerHTML = `<p>En attendant notre rencontre, je te laisse découvrir la carte de Venise, qui sera le terrain de notre aventure. Étudie-la bien : elle pourrait t'être précieuse lorsque commencera notre mission…<br><br>À bientôt, moussaillon !</p><img src="img/corto-content.webp" alt=""><span class="in2-hint">toucher pour continuer</span>`;
      msg.style.opacity = 0; document.body.appendChild(msg);
      root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1400, fill: "forwards", easing: "ease-in-out" }).onfinish = () => root.remove();
      msg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 700, fill: "forwards" });
      setTimeout(() => msg.addEventListener("click", () => msg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }).onfinish = () => msg.remove()), 1800);
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
    const go = async (to) => {
      if (busy || to < 0) return;
      if (SCREENS[idx]?.layout === "who" && to > idx) { // le prénom est obligatoire pour quitter l'écran d'identité
        const i = root.querySelector("#in2-name"); const v = i ? i.value.trim() : name; if (!v) { if (i) i.focus(); return; } name = v;
      }
      if (to >= SCREENS.length) { if (vv) { vv.removeEventListener("resize", lift); vv.removeEventListener("scroll", lift); } if (opening) opening.skip(); finish(); return; }
      busy = true; setTimeout(() => (busy = false), 450);
      const sc = SCREENS[to], first = idx === -1, d = build(sc); root.insertBefore(d, root.querySelector(".in2-nav")); idx = to; applyLayout(d, sc, to); if (editing) setTimeout(() => select(null), 0);
      prevBtn.style.visibility = to === 0 ? "hidden" : "visible";
            d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: sc.layout === "hello" && first ? 1 : 600, fill: "forwards", easing: "ease-in-out" });
      if (cur) { const old = cur; old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards", easing: "ease-in-out" }).onfinish = () => old.remove(); }
      cur = d;
      const vl = root.querySelector(".in2-veil"); if (sc.layout !== "hello") vl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }); // le tableau reste en permanence ; le voile de lecture n'est que sur l'écran 1
      if (sc.layout === "hello") { opening = openingShot(d, !first); let ready = !!(!first); opening.done.then(() => (ready = true)); if (!first) ready = true; d.addEventListener("click", (e) => { if (ready && !editing) go(to + 1); }); }
      else if (sc.layout === "who") { d.querySelector(".wh-ok").onclick = () => { if (!editing) go(to + 1); }; }
      else if (sc.button) d.querySelector(".in2-btn").onclick = () => go(to + 1);
      else setTimeout(() => d.addEventListener("click", (e) => { if (!editing && !e.target.closest("input,form,button")) go(to + 1); }), 350);
    };
    prevBtn.onclick = () => go(idx - 1); nextBtn.onclick = () => go(idx + 1);
    // ───── Éditeur de mise en page (aperçu local uniquement) : on glisse les images et les textes, ± pour la taille, « Enregistrer » écrit data/intro-layout.json ─────
    let editing = false, selEl = null, selKey = null;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
    let devTok = ""; try { const u = new URL(location.href), t = u.searchParams.get("dev"); if (t) { localStorage.setItem("vq_dev", t); u.searchParams.delete("dev"); history.replaceState(null, "", u); } devTok = localStorage.getItem("vq_dev") || ""; } catch {}
    const canEdit = local || !!devTok; // en local : toujours ; sur le téléphone : après avoir ouvert une fois l'adresse ?dev=CODE
    const handle = document.createElement("div"); handle.className = "in2-handle"; handle.hidden = true; root.appendChild(handle);
    const placeHandle = () => { if (!selEl || !editing) { handle.hidden = true; return; } const r = selEl.getBoundingClientRect(); handle.style.left = Math.min(innerWidth - 14, r.right) + "px"; handle.style.top = Math.min(lockedH - 14, r.bottom) + "px"; handle.hidden = false; };
    const select = (k) => { root.querySelectorAll(".in2-sel").forEach((e) => e.classList.remove("in2-sel")); selKey = k; selEl = null; if (k) { const e = elsOf(cur, SCREENS[idx])[k]; if (e) { selEl = e; e.classList.add("in2-sel"); } } placeHandle(); };
    const cfgFor = (k) => { const key = edKey(idx); LAYOUT[key] ||= {}; LAYOUT[key][k] ||= k === "name2" && LAYOUT[key].name ? { ...LAYOUT[key].name } : { x: 0, y: 0, s: 1 }; return LAYOUT[key][k]; };
    let txtEd = null; const stopText = () => { if (!txtEd) return; for (const [, e] of txtEd) { e.contentEditable = "false"; e.removeAttribute("contenteditable"); e.classList.remove("in2-txted"); e.oninput = null; } txtEd = null; getSelection()?.removeAllRanges(); };
    if (canEdit) {
      const bar = document.createElement("div"); bar.className = "in2-ed";
      bar.innerHTML = '<button type="button" data-a="toggle">✎ Mise en page</button><span class="in2-ed-tools" hidden><button data-a="minus">A−</button><button data-a="plus">A+</button><button data-a="text">✎ Texte</button><button data-a="reset">Réinit. élément</button><button data-a="flip">⇅</button><button data-a="save">💾 Enregistrer</button><em></em></span>';
      root.appendChild(bar); const tools = bar.querySelector(".in2-ed-tools"), msg = bar.querySelector("em");
      const say = (t) => { msg.textContent = t; clearTimeout(say.t); say.t = setTimeout(() => (msg.textContent = ""), 2500); };
      bar.addEventListener("click", async (e) => {
        const a = e.target.closest("button")?.dataset.a; if (!a) return;
        if (a === "toggle") { stopText(); editing = !editing; root.classList.toggle("in2-editing", editing); tools.hidden = !editing; select(null); return; }
        if (a === "save") { try { const r = await fetch("api/intro-layout", { method: "POST", headers: { "Content-Type": "application/json", "X-Dev-Token": devTok }, body: JSON.stringify(LAYOUT) }); if (r.status === 403 && !local) { try { localStorage.removeItem("vq_dev"); } catch {} } say(r.ok ? "Enregistré ✔ (centralisé)" : "Échec : code refusé ou serveur sans --dev"); } catch { say("Échec de l'enregistrement"); } return; }
        if (a === "text") {
          if (txtEd) { stopText(); return; }
          if (!selKey) { say("Touche d'abord un texte"); return; }
          const te = textsOf(cur, SCREENS[idx]), keys = selKey === "txt" ? ["txt", "btn"] : selKey === "head" || selKey === "name" || selKey === "mid" || selKey === "hi" || selKey === "q" ? [selKey] : [];
          const els = keys.map((k) => [k, te[k]]).filter((x) => x[1]); if (!els.length) { say("Pas de texte ici"); return; }
          txtEd = els; for (const [k, e] of els) { e.contentEditable = "plaintext-only"; e.classList.add("in2-txted"); e.oninput = () => { const T = ((LAYOUT._t ||= {})[edKey(idx)] ||= {}); let v = e.innerText.replace(/\n{3,}/g, "\n\n").replace(/\n$/, ""); if (name && SCREENS[idx].layout === "welcome" && k === "head") v = v.split(name).join("{nom}"); T[k] = v; }; }
          els[0][1].focus(); say("Écris, puis ✎ Texte pour finir"); return;
        }
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
        for (const t of document.elementsFromPoint(e.clientX, e.clientY)) { for (const k in els) if (els[k].contains(t)) { hit = k; break; } if (hit) break; }
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
export function cortoSays(text) {
  document.querySelectorAll(".corto-say").forEach((e) => e.remove());
  const d = document.createElement("div"); d.className = "corto-say";
  d.innerHTML = `<div class="msg fc"><span class="m-face"></span><div class="m-bubble">${esc(text)}</div></div><button class="cs-ok">OK</button>`;
  document.body.appendChild(d);
  d.animate([{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "none" }], { duration: 300 });
  d.querySelector(".cs-ok").onclick = () => d.remove();
  setTimeout(() => d.isConnected && d.remove(), 9000);
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
