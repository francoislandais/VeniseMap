// Première rencontre : les paroles du gondolier, sans texte narratif.
import { createGondolierEditor } from "./gondolier-rendezvous-editor.js";
const IMAGE = "img/narrative/corto-gondolier-fin.png";
const STORM = "img/narrative/gondolier-debut-tempete.png";
const KEY = "img/narrative/gondolier-gold-key.png";
const draftKey = "vq_gondolier_rendezvous_layout_draft";
const normalizeLayout = (source) => {
  const layout = source && typeof source.pages === "object" ? source : { pages: {} };
  if (layout.version === 2 || (!layout.pages[8] && !layout.pages[9])) return layout;
  const pages = {};
  for (const [index, oldIndex] of [0, 1, 2, 3, 4, 5, 7, 8].entries()) if (layout.pages[oldIndex]) pages[index] = layout.pages[oldIndex];
  return { ...layout, version: 2, pages };
};
const layoutPromise = fetch("data/gondolier-rendezvous-layout.json?" + Date.now())
  .then(response => response.ok ? response.json() : { pages: {} }).catch(() => ({ pages: {} }))
  .then(saved => {
    const base = normalizeLayout(saved);
    if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) try {
      const draft = normalizeLayout(JSON.parse(localStorage.getItem(draftKey)));
      if (draft && typeof draft.pages === "object") {
        const pages = { ...base.pages };
        for (const [index, change] of Object.entries(draft.pages)) pages[index] = { ...pages[index], ...change, elements: { ...pages[index]?.elements, ...change.elements } };
        return { ...base, ...draft, version: 2, pages };
      }
    } catch {}
    return { ...base, version: 2 };
  });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const LINES = [
  "Ah, cette fameuse nuit… Crois-moi, moussaillon, je ne suis pas près de l'oublier !",
  "Je naviguais dans un canal étroit, entre deux vieux palais. Il faisait nuit noire et le vent soufflait avec une violence incroyable !",
  "Ma gondole tanguait dans tous les sens. J'avais beau lutter de toutes mes forces avec ma rame, impossible de la maintenir droite !",
  "Et puis, tout à coup, j'ai aperçu quelque chose d'étrange… Une petite lueur scintillait sous l'eau, juste à côté de ma gondole.",
  "Heureusement, le canal n'était pas profond à cet endroit. Je me suis penché, j'ai plongé le bras dans l'eau glacée et… regarde un peu ce que j'ai repêché !",
  "Une clé ! Et pas n'importe laquelle, à mon avis. Regarde comme elle brille ! Je n'avais jamais rien vu de pareil.",
  "Tu voudrais l'avoir, hein ? Je vois bien que tu la regardes avec envie ! Eh bien, pourquoi pas ? Je pourrais accepter de m'en séparer… Mais certainement pas pour rien !",
  "**Un seul objet de ton livre me suffit. Choisis celui que tu veux m’offrir, et ma clé est à toi.**",
];

function typeLine(element) {
  element.setAttribute("aria-label", element.textContent.trim());
  element.classList.add("gr-typing");
  const entries = [], walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode, chars = Array.from(node.textContent);
    if (chars.length) { entries.push({ node, chars }); node.textContent = ""; }
  }
  const total = entries.reduce((sum, entry) => sum + entry.chars.length, 0);
  let raf = 0, started = 0, shown = -1, done = false;
  const reveal = (count) => {
    if (count === shown) return;
    shown = count;
    let remaining = count;
    for (const entry of entries) {
      const length = Math.min(entry.chars.length, Math.max(0, remaining));
      entry.node.textContent = entry.chars.slice(0, length).join("");
      remaining -= length;
    }
  };
  const finish = () => { cancelAnimationFrame(raf); reveal(total); done = true; element.classList.remove("gr-typing"); };
  const frame = (now) => {
    if (done) return;
    if (!started) started = now;
    reveal(Math.min(total, Math.floor((now - started) / 8)));
    if (shown >= total) finish();
    else raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return { get done() { return done; }, finish };
}

function createStormSound() {
  const wind = new Audio("audio/corto-wind.mp3"), thunder = new Audio("audio/corto-thunder.mp3");
  wind.loop = true; wind.preload = "auto"; wind.volume = 0;
  thunder.preload = "auto"; thunder.volume = 0;
  let frame = 0, thunderPlayed = false, stopped = false, page = 0, last = 0;
  const play = (audio) => { if (audio.paused) audio.play().catch(() => {}); };
  const fade = (windTarget, thunderTarget, duration) => {
    cancelAnimationFrame(frame);
    const started = performance.now(), fromWind = wind.volume, fromThunder = thunder.volume;
    const tick = (now) => {
      if (stopped) return;
      const t = Math.min(1, (now - started) / duration);
      wind.volume = Math.max(0, Math.min(1, fromWind + (windTarget - fromWind) * t));
      thunder.volume = Math.max(0, Math.min(1, fromThunder + (thunderTarget - fromThunder) * t));
      if (t < 1) frame = requestAnimationFrame(tick);
      else if (windTarget === 0) { wind.pause(); thunder.pause(); }
    };
    frame = requestAnimationFrame(tick);
  };
  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(frame); wind.pause(); thunder.pause(); }
    else if (!stopped && page < last) { play(wind); fade(.3, thunderPlayed ? .15 : 0, 500); }
  };
  document.addEventListener("visibilitychange", onVisibility);
  return {
    start() { if (stopped) return; play(wind); fade(.3, 0, 700); },
    scene(index, finalIndex) {
      if (stopped) return;
      page = index; last = finalIndex;
      if (index >= finalIndex) { fade(0, 0, 1700); return; }
      play(wind);
      if (index >= 1 && !thunderPlayed) { thunderPlayed = true; thunder.currentTime = 0; play(thunder); }
      fade(.3, index >= 1 ? .18 : 0, 500);
    },
    stop() {
      stopped = true; cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const audio of [wind, thunder]) { audio.pause(); audio.currentTime = 0; }
    },
  };
}

let opening = false;
export async function openGondolierRendezvous({ onComplete, onKeyToBook, getOwnedObjects, hasKey, hasSeen, onTrade, editable = false, replay = false } = {}) {
  if (opening || document.querySelector(".corto-rendezvous")) return;
  const seen = !replay && !!hasSeen?.();
  const sound = seen ? null : createStormSound();
  sound?.start();
  opening = true;
  const layout = await layoutPromise;
  opening = false;
  if (document.querySelector(".corto-rendezvous")) { sound?.stop(); return; }
  const previousFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "corto-rendezvous gondolier-rendezvous";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Conversation avec le gondolier");
  overlay.tabIndex = -1;
  overlay.innerHTML = `<img class="gr-painting" src="${IMAGE}" alt=""><img class="gr-storm" src="${STORM}" alt=""><div class="gr-shade"></div><div class="gr-stage"></div><button class="cr-close" type="button" aria-label="Fermer la rencontre">×</button><button class="cr-prev" type="button" aria-label="Page précédente" hidden>‹ Précédent</button>`;
  document.body.appendChild(overlay);
  document.body.classList.add("corto-rendezvous-open");
  new Image().src = KEY;
  new Image().src = STORM;
  const stage = overlay.querySelector(".gr-stage"), previous = overlay.querySelector(".cr-prev");
  let index = seen ? LINES.length - 1 : 0, scene = null, typing = null, pointerStart = null, editor = null, reactionTimer = 0, ceremony = false;
  const selected = new Set();
  const close = (completed = false) => {
    clearTimeout(reactionTimer);
    sound?.stop();
    typing?.finish();
    document.removeEventListener("keydown", onKey);
    editor?.destroy();
    overlay.remove();
    document.body.classList.remove("corto-rendezvous-open");
    previousFocus?.focus?.();
    if (completed || index === LINES.length - 1) onComplete?.();
  };
  const celebrate = async (message) => {
    if (ceremony) return;
    ceremony = true;
    clearTimeout(reactionTimer);
    overlay.classList.add("gr-ceremony-active");
    const layer = document.createElement("div");
    layer.className = "gr-ceremony";
    layer.innerHTML = `<p class="gr-ceremony-copy">${escapeHtml(message)}</p><img class="gr-ceremony-key" src="${KEY}" alt="La clé d'or du gondolier">`;
    for (let i = 0; i < 32; i++) {
      const star = document.createElement("span");
      star.className = "gr-ceremony-star";
      star.textContent = i % 3 ? "✦" : "✧";
      star.style.cssText = `left:${8 + Math.random() * 84}%;top:${16 + Math.random() * 70}%;animation-delay:${(Math.random() * 1.3).toFixed(2)}s`;
      layer.appendChild(star);
    }
    overlay.appendChild(layer);
    const key = layer.querySelector(".gr-ceremony-key");
    await key.decode().catch(() => {});
    const book = document.querySelector("#home-btn")?.getBoundingClientRect();
    const dx = book ? book.left + book.width / 2 - innerWidth / 2 : 0;
    const dy = book ? book.top + book.height / 2 - innerHeight / 2 : innerHeight * .45;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    await key.animate(reduced ? [
      { transform: "translate(-50%,-50%) scale(.8)", opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.08)`, opacity: 0 },
    ] : [
      { transform: "translate(-50%,-50%) scale(.25)", opacity: 0, filter: "brightness(2) blur(7px)" },
      { transform: "translate(-50%,-50%) scale(2.15)", opacity: 1, filter: "brightness(1.5) drop-shadow(0 0 22px #ffe68a)", offset: .32 },
      { transform: "translate(-50%,-50%) scale(2.3)", opacity: 1, filter: "brightness(1.7) drop-shadow(0 0 35px #ffe68a)", offset: .69 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.08)`, opacity: 0, filter: "brightness(2) drop-shadow(0 0 12px #ffe68a)" },
    ], { duration: reduced ? 650 : 3500, easing: "ease-in-out", fill: "forwards" }).finished.catch(() => {});
    close(true);
    onKeyToBook?.();
  };
  const number = (value, fallback, low, high) => Number.isFinite(Number(value)) ? Math.max(low, Math.min(high, Number(value))) : fallback;
  const applyLayout = () => {
    if (!scene) return;
    const change = layout.pages?.[index] || {}, copy = scene.querySelector(".gr-copy"), key = scene.querySelector(".gr-key");
    if (copy) {
      const c = change.elements?.copy || {};
      const line = typeof change.text === "string" ? change.text : LINES[index];
      if (!typing || typing.done || editor?.editing) { copy.innerHTML = escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>"); copy.setAttribute("aria-label", copy.textContent.trim()); }
      copy.style.transform = `translate(${number(c.x, 0, -100, 100)}vw,${number(c.y, 0, -100, 100)}dvh)`;
      copy.style.fontSize = `clamp(18px,${4.8 * number(c.size, 1, .65, 1.7)}vw,${25 * number(c.size, 1, .65, 1.7)}px)`;
      copy.style.width = `${number(c.width, 100, 50, 100)}%`;
    }
    if (key) {
      const c = change.elements?.key || {};
      key.style.left = `${number(c.x, 50, -100, 100)}%`;
      key.style.top = `${number(c.y, 43, -100, 100)}%`;
      key.style.width = `min(${82 * number(c.size, 1, .35, 3)}vw,${410 * number(c.size, 1, .35, 3)}px)`;
    }
    const painting = overlay.classList.contains("gr-storm-active") ? overlay.querySelector(".gr-storm") : overlay.querySelector(".gr-painting");
    const c = change.elements?.painting || {};
    painting.style.objectPosition = `${number(c.x, 50, 0, 100)}% ${number(c.y, 24, 0, 100)}%`;
    painting.style.scale = number(c.size, 1, 1, 1.8);
  };
  const renderTrade = (host) => {
    if (replay) { host.innerHTML = '<button type="button" class="gr-trade-open">Terminer</button>'; host.firstElementChild.onclick = () => close(); return; }
    if (hasKey?.()) {
      host.innerHTML = `<p class="gr-trade-answer">Ma clé est maintenant dans ton livre, moussaillon. Prends-en soin !</p>`;
      return;
    }
    const offer = document.createElement("button"); offer.type = "button"; offer.className = "gr-trade-open"; offer.textContent = "Proposer un échange";
    const panel = document.createElement("div"); panel.className = "gr-trade-panel"; panel.hidden = true;
    host.append(offer, panel);
    offer.onclick = () => {
      sound?.stop();
      typing?.finish();
      overlay.classList.add("gr-trade-opened");
      offer.hidden = true; panel.hidden = false;
      const copy = scene.querySelector(".gr-copy");
      const invitation = { html: copy.innerHTML, label: copy.getAttribute("aria-label") };
      const owned = getOwnedObjects?.() || [];
      const ids = new Set(owned.map((item) => item.id));
      for (const id of selected) if (!ids.has(id)) selected.delete(id);
      if (!owned.length) {
        panel.innerHTML = `<p class="gr-trade-answer">Tu n'as encore aucun objet à proposer. Reviens me voir après tes découvertes !</p>`;
      } else {
        panel.innerHTML = `<p class="gr-trade-prompt">Choisis un seul objet à m’offrir.</p><div class="gr-trade-grid">${owned.map((item) => `<button type="button" class="gr-trade-item" data-item="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)}" aria-pressed="${selected.has(item.id)}"><img src="${escapeHtml(item.img)}" alt=""></button>`).join("")}</div><button type="button" class="gr-trade-submit" ${selected.size ? "" : "disabled"}>Proposer au gondolier</button><p class="gr-trade-answer" role="status" aria-live="polite"></p>`;
        const submit = panel.querySelector(".gr-trade-submit"), answer = panel.querySelector(".gr-trade-answer");
        panel.querySelectorAll(".gr-trade-item").forEach((button) => {
          button.onclick = () => {
            const id = button.dataset.item;
            const wasSelected = selected.has(id); selected.clear(); if (!wasSelected) selected.add(id);
            panel.querySelectorAll(".gr-trade-item").forEach((item) => item.setAttribute("aria-pressed", String(selected.has(item.dataset.item))));
            submit.disabled = !selected.size;
          };
        });
        submit.onclick = () => {
          let result;
          try { result = onTrade?.([...selected]); } catch (error) { console.error(error); }
          answer.textContent = "";
          if (result?.accepted) { celebrate(result.message || "Cette clé d'or est à toi."); return; }
          clearTimeout(reactionTimer);
          copy.textContent = result?.message || "Cet échange ne me convient pas, moussaillon !";
          copy.setAttribute("aria-label", copy.textContent);
          copy.setAttribute("role", "status");
          overlay.classList.add("gr-refused");
          reactionTimer = setTimeout(() => {
            if (!copy.isConnected || ceremony) return;
            copy.innerHTML = invitation.html;
            copy.setAttribute("aria-label", invitation.label || copy.textContent);
            copy.removeAttribute("role");
            overlay.classList.remove("gr-refused");
          }, 3300);
        };
      }
      panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
  };
  const show = () => {
    clearTimeout(reactionTimer);
    sound?.scene(index, LINES.length - 1);
    typing?.finish();
    overlay.classList.remove("gr-trade-opened");
    overlay.classList.toggle("gr-storm-active", index >= 1);
    stage.querySelectorAll(".gr-exit").forEach((old) => old.remove());
    const next = document.createElement("div");
    next.className = `gr-scene${scene ? " gr-enter" : ""}`;
    const line = layout.pages?.[index]?.text ?? LINES[index];
    next.innerHTML = `${index === 5 ? `<img class="gr-key" src="${KEY}" alt="Clé d'or brillante">` : ""}<div class="gr-scroll"><div class="gr-copy">${escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")}</div>${index === LINES.length - 1 ? '<div class="gr-trade"></div>' : ""}`;
    const old = scene;
    stage.appendChild(next);
    scene = next;
    applyLayout();
    typing = matchMedia("(prefers-reduced-motion: reduce)").matches ? null : typeLine(next.querySelector(".gr-copy"));
    if (editor?.editing) typing?.finish();
    if (index === LINES.length - 1) renderTrade(next.querySelector(".gr-trade"));
    overlay.classList.toggle("gr-trade-screen", index === LINES.length - 1);
    previous.hidden = index === 0;
    editor?.refresh();
    if (!old) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { old.remove(); next.classList.remove("gr-enter"); return; }
    old.classList.add("gr-exit");
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("gr-enter")));
    setTimeout(() => old.remove(), 520);
  };
  const advance = () => { if (ceremony) return; if (typing && !typing.done) typing.finish(); else if (index < LINES.length - 1) { index++; show(); } };
  const back = () => { if (index > 0) { index--; show(); } };
  const onKey = (event) => {
    if (ceremony) return;
    if (event.key === "Escape") close();
    else if (editor?.editing) return;
    else if (event.target.closest?.(".gr-trade")) return;
    else if (event.key === "ArrowRight" || ((event.key === "Enter" || event.key === " ") && event.target === overlay)) { event.preventDefault(); advance(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); back(); }
  };
  document.addEventListener("keydown", onKey);
  stage.addEventListener("pointerdown", (event) => {
    if (editor?.editing || !event.isPrimary || event.button !== 0 || event.target.closest?.(".gr-trade")) return;
    pointerStart = { x: event.clientX, y: event.clientY, scroll: scene.querySelector(".gr-scroll")?.scrollTop || 0, time: Date.now() };
  });
  stage.addEventListener("pointerup", (event) => {
    if (editor?.editing) return;
    if (event.target.closest?.(".gr-trade")) { pointerStart = null; return; }
    const start = pointerStart; pointerStart = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || Date.now() - start.time > 800) return;
    if (Math.abs((scene.querySelector(".gr-scroll")?.scrollTop || 0) - start.scroll) > 4) return;
    advance();
  });
  stage.addEventListener("pointercancel", () => { pointerStart = null; });
  overlay.querySelector(".cr-close").onclick = () => close();
  previous.onclick = back;
  show();
  if (editable) editor = createGondolierEditor({ overlay, stage, layout, lines: LINES, getIndex: () => index, showPage: next => { index = next; show(); }, applyLayout, finishTyping: () => typing?.finish(), draftKey });
  overlay.focus();
}
