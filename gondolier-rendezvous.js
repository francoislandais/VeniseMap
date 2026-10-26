// Première rencontre : les paroles du gondolier, sans texte narratif ni récompense prématurée.
const IMAGE = "img/narrative/corto-gondolier-fin.png";
const STORM = "img/narrative/gondolier-debut-tempete.png";
const SPEAKER = "img/narrative/gondolier-speaker.png";
const KEY = "img/narrative/gondolier-gold-key.png";
const LINES = [
  "Ah, cette fameuse nuit… Crois-moi, moussaillon, je ne suis pas près de l'oublier !",
  "Je naviguais dans un canal étroit, entre deux vieux palais. Il faisait nuit noire et le vent soufflait avec une violence incroyable !",
  "Ma gondole tanguait dans tous les sens. J'avais beau lutter de toutes mes forces avec ma rame, impossible de la maintenir droite !",
  "Et puis, tout à coup, j'ai aperçu quelque chose d'étrange… Une petite lueur scintillait sous l'eau, juste à côté de ma gondole.",
  "Heureusement, le canal n'était pas profond à cet endroit. Je me suis penché, j'ai plongé le bras dans l'eau glacée et… regarde un peu ce que j'ai repêché !",
  "Une clé ! Et pas n'importe laquelle, à mon avis. Regarde comme elle brille ! Je n'avais jamais rien vu de pareil.",
  "Depuis cette nuit, je la garde précieusement. Je l'admire chaque jour, même si, pour être franc, je n'ai pas la moindre idée de ce qu'elle peut ouvrir !",
  "Tu voudrais l'avoir, hein ? Je vois bien que tu la regardes avec envie ! Eh bien, pourquoi pas ? Je pourrais accepter de m'en séparer… Mais certainement pas pour rien !",
  "**Apporte-moi quelque chose de précieux, quelque chose qui me plaise vraiment, et nous pourrons faire un échange.**",
  "Alors, ouvre l'œil, moussaillon ! Et si tu trouves un trésor digne de ma jolie clé, reviens me voir !",
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

export function openGondolierRendezvous(onComplete) {
  if (document.querySelector(".corto-rendezvous")) return;
  const previousFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "corto-rendezvous gondolier-rendezvous";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Conversation avec le gondolier");
  overlay.tabIndex = -1;
  overlay.innerHTML = `<img class="gr-painting" src="${IMAGE}" alt=""><img class="gr-storm" src="${STORM}" alt=""><div class="gr-shade"></div><div class="gr-stage"></div><img class="gr-speaker" src="${SPEAKER}" alt=""><button class="cr-close" type="button" aria-label="Fermer la rencontre">×</button><button class="cr-prev" type="button" aria-label="Page précédente" hidden>‹ Précédent</button>`;
  document.body.appendChild(overlay);
  document.body.classList.add("corto-rendezvous-open");
  new Image().src = KEY;
  new Image().src = STORM;
  const stage = overlay.querySelector(".gr-stage"), previous = overlay.querySelector(".cr-prev");
  let index = 0, scene = null, typing = null, pointerStart = null;
  const close = (completed = false) => {
    typing?.finish();
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    document.body.classList.remove("corto-rendezvous-open");
    previousFocus?.focus?.();
    if (completed) onComplete?.();
  };
  const show = () => {
    typing?.finish();
    overlay.classList.toggle("gr-storm-active", index === 1 || index === 2);
    stage.querySelectorAll(".gr-exit").forEach((old) => old.remove());
    const next = document.createElement("div");
    next.className = `gr-scene${scene ? " gr-enter" : ""}`;
    next.innerHTML = `${index === 5 || index === 6 ? `<img class="gr-key" src="${KEY}" alt="Clé d'or brillante">` : ""}<div class="gr-scroll"><div class="gr-copy">${LINES[index].replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</div></div>`;
    const old = scene;
    stage.appendChild(next);
    scene = next;
    typing = matchMedia("(prefers-reduced-motion: reduce)").matches ? null : typeLine(next.querySelector(".gr-copy"));
    previous.hidden = index === 0;
    if (!old) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { old.remove(); next.classList.remove("gr-enter"); return; }
    old.classList.add("gr-exit");
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("gr-enter")));
    setTimeout(() => old.remove(), 520);
  };
  const advance = () => { if (typing && !typing.done) typing.finish(); else if (index === LINES.length - 1) close(true); else { index++; show(); } };
  const back = () => { if (index > 0) { index--; show(); } };
  const onKey = (event) => {
    if (event.key === "Escape") close();
    else if (event.key === "ArrowRight" || ((event.key === "Enter" || event.key === " ") && event.target === overlay)) { event.preventDefault(); advance(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); back(); }
  };
  document.addEventListener("keydown", onKey);
  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, scroll: scene.querySelector(".gr-scroll")?.scrollTop || 0, time: Date.now() };
  });
  stage.addEventListener("pointerup", (event) => {
    const start = pointerStart; pointerStart = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || Date.now() - start.time > 800) return;
    if (Math.abs((scene.querySelector(".gr-scroll")?.scrollTop || 0) - start.scroll) > 4) return;
    advance();
  });
  stage.addEventListener("pointercancel", () => { pointerStart = null; });
  overlay.querySelector(".cr-close").onclick = () => close();
  previous.onclick = back;
  show();
  overlay.focus();
}
