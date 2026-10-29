// Répliques de Monteverdi après la question d'identité posée sur la carte.
export const MONTEVERDI_QUIZ = {
  q: "Sais-tu qui je suis ?",
  opts: [
    { t: "Claudio Monteverdi, le compositeur des Vêpres", ok: 1 },
    { t: "Le doge de Venise" },
    { t: "Un gondolier célèbre" },
  ],
  good: "Exactement, {g} ! Je suis Claudio Monteverdi.",
  bad: "Tu ne sais même pas qui je suis ?!",
};

const PAGES = [
  "Oui, je suis Claudio Monteverdi, et je suis furieux !",
  "Les Vénitiens ne comprennent plus rien à ma musique.",
  "Il paraît même que les enfants d’aujourd’hui préfèrent Jul à mes Vêpres !",
  "Ils s’ennuient à mes concerts et font des coloriages au lieu d’écouter : quel désespoir !",
  "Et ma viole a disparu.",
  "Je suis sûr que ce Doge jaloux me l’a volée !",
  "Sans ma viole, je ne laisserai pas le concert de ce soir commencer.",
  "Retrouve-la avant ce soir, jeune matelot !",
];

function typeLine(element, text) {
  element.setAttribute("aria-label", text);
  element.textContent = "";
  let frame = 0, started = 0, shown = -1, done = false;
  const chars = Array.from(text);
  const finish = () => { cancelAnimationFrame(frame); element.textContent = text; done = true; };
  const tick = (now) => {
    if (done) return;
    if (!started) started = now;
    const count = Math.min(chars.length, Math.floor((now - started) / 8));
    if (count !== shown) { shown = count; element.textContent = chars.slice(0, count).join(""); }
    if (count >= chars.length) finish(); else frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return { get done() { return done; }, finish };
}

export function openMonteverdiStory() {
  if (document.querySelector(".monteverdi-story,.corto-rendezvous,.wq")) return;
  const previousFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "corto-rendezvous monteverdi-story";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Conversation avec Monteverdi");
  overlay.tabIndex = -1;
  overlay.innerHTML = '<img class="mv-painting" src="img/narrative/venise-lavis-03.png" alt=""><div class="mv-shade"></div><img class="mv-portrait" src="img/monteverdi-avatar.webp" alt=""><div class="mv-stage"></div><button type="button" class="cr-close" aria-label="Fermer la rencontre">×</button><button type="button" class="cr-prev" aria-label="Page précédente" hidden>‹ Précédent</button>';
  document.body.appendChild(overlay);
  document.body.classList.add("corto-rendezvous-open");
  const stage = overlay.querySelector(".mv-stage"), previous = overlay.querySelector(".cr-prev");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0, scene = null, typing = null, pointerStart = null;
  const close = () => {
    typing?.finish();
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    document.body.classList.remove("corto-rendezvous-open");
    previousFocus?.focus?.();
  };
  const show = () => {
    typing?.finish();
    const next = document.createElement("div");
    next.className = `mv-page ${index % 2 ? "mv-top" : "mv-bottom"}${scene ? " mv-enter" : ""}`;
    next.innerHTML = '<p class="mv-copy" aria-live="off"></p>';
    const old = scene;
    stage.appendChild(next); scene = next;
    const copy = next.querySelector(".mv-copy");
    typing = reduced ? null : typeLine(copy, PAGES[index]);
    if (reduced) { copy.textContent = PAGES[index]; copy.setAttribute("aria-label", PAGES[index]); }
    previous.hidden = index === 0;
    if (!old) return;
    if (reduced) { old.remove(); next.classList.remove("mv-enter"); return; }
    old.classList.add("mv-exit");
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("mv-enter")));
    setTimeout(() => old.remove(), 520);
  };
  const advance = () => {
    if (typing && !typing.done) { typing.finish(); return; }
    if (index < PAGES.length - 1) { index++; show(); } else close();
  };
  const back = () => { if (index > 0) { index--; show(); } };
  const onKey = (event) => {
    if (event.key === "Escape") close();
    else if (event.key === "ArrowRight" || (event.key === "Enter" && event.target === overlay)) { event.preventDefault(); advance(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); back(); }
  };
  overlay.querySelector(".cr-close").onclick = close;
  previous.onclick = back;
  document.addEventListener("keydown", onKey);
  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, time: Date.now() };
  });
  stage.addEventListener("pointerup", (event) => {
    const start = pointerStart; pointerStart = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || Date.now() - start.time > 800) return;
    advance();
  });
  stage.addEventListener("pointercancel", () => { pointerStart = null; });
  show();
  overlay.focus();
}
