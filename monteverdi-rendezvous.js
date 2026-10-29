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

const REVISIT_PAGES = [
  "Alors, comment était mon concert ?",
  "Est-ce que ça t’a plu ? C’était mieux que du Jul ou pas ?",
  "Ça change, hein ?",
  "Allez, reviens vite me voir.",
  "Et n’oublie pas de retrouver mon instrument !",
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

export function openMonteverdiStory({ revisit = false, onYes = () => {} } = {}) {
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
  const pages = revisit ? REVISIT_PAGES : PAGES;
  let music = null, musicFade = 0;
  const stopMusic = () => { clearTimeout(musicFade); if (music) { music.pause(); music.currentTime = 0; music = null; } };
  const celebrate = () => {
    const portrait = overlay.querySelector(".mv-portrait"), r = portrait.getBoundingClientRect();
    portrait.animate([
      { transform: "rotate(0deg) scale(1)" },
      { transform: "rotate(180deg) scale(1.22)", offset: .55 },
      { transform: "rotate(360deg) scale(1)" },
    ], { duration: reduced ? 450 : 1500, easing: "cubic-bezier(.35,.7,.3,1)", fill: "forwards" });
    onYes({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    stopMusic();
    music = new Audio("audio/vepres-depart.mp3");
    music.volume = .55;
    music.play().catch(() => {});
    musicFade = setTimeout(() => {
      const audio = music; if (!audio) return;
      const start = performance.now(), initial = audio.volume;
      const fade = (now) => {
        if (music !== audio) return;
        audio.volume = Math.max(0, initial * (1 - (now - start) / 1200));
        if (audio.volume > 0) requestAnimationFrame(fade); else stopMusic();
      };
      requestAnimationFrame(fade);
    }, 4500);
  };
  let index = 0, scene = null, typing = null, pointerStart = null;
  const close = () => {
    typing?.finish();
    stopMusic();
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
    typing = reduced ? null : typeLine(copy, pages[index]);
    if (reduced) { copy.textContent = pages[index]; copy.setAttribute("aria-label", pages[index]); }
    previous.hidden = index === 0 || (revisit && index === 2);
    if (revisit && index === 1) {
      const answers = document.createElement("div"); answers.className = "mv-answers";
      answers.innerHTML = '<button type="button" data-answer="yes">Oui, j’ai aimé !</button><button type="button" data-answer="no">Pas vraiment</button>';
      next.appendChild(answers);
      answers.onclick = (event) => {
        const button = event.target.closest("button[data-answer]"); if (!button || answers.dataset.answered) return;
        answers.dataset.answered = "1"; typing?.finish();
        if (button.dataset.answer === "yes") celebrate();
        answers.querySelectorAll("button").forEach((item) => { item.disabled = true; item.classList.toggle("chosen", item === button); });
        setTimeout(() => { if (overlay.isConnected && index === 1) { index = 2; show(); } }, button.dataset.answer === "yes" ? 1600 : 420);
      };
    }
    if (!old) return;
    if (reduced) { old.remove(); next.classList.remove("mv-enter"); return; }
    old.classList.add("mv-exit");
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("mv-enter")));
    setTimeout(() => old.remove(), 520);
  };
  const advance = () => {
    if (typing && !typing.done) { typing.finish(); return; }
    if (revisit && index === 1) return;
    if (index < pages.length - 1) { index++; show(); } else close();
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
    if (!event.isPrimary || event.button !== 0 || event.target.closest(".mv-answers")) return;
    pointerStart = { x: event.clientX, y: event.clientY, time: Date.now() };
  });
  stage.addEventListener("pointerup", (event) => {
    const start = pointerStart; pointerStart = null;
    if (event.target.closest(".mv-answers")) return;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || Date.now() - start.time > 800) return;
    advance();
  });
  stage.addEventListener("pointercancel", () => { pointerStart = null; });
  show();
  overlay.focus();
}
