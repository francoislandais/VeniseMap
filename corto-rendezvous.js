// La première rencontre se relit depuis le bateau de Corto, une fois celui-ci à quai.
const PAGES = [
  {
    art: "corto",
    paragraphs: [
      "Écoute-moi bien, jeune matelot. Il se passe à Venise des choses bien étranges… Tout a commencé il y a deux jours.",
    ],
  },
  {
    art: "storm",
    head: "right",
    paragraphs: [
      "Une terrible tempête s'est abattue sur la ville. De gigantesques bourrasques ont traversé la lagune et se sont engouffrées dans le palais des Doges.",
      "À l'intérieur, elles ont soulevé des feuilles, renversé des objets et dispersé aux quatre vents les précieux fragments d'une partition : celle des <em>Vêpres</em> du grand Claudio Monteverdi !",
    ],
  },
  {
    art: "storm",
    paragraphs: [
      "Personne ne sait d'où venait cette tempête, ni pourquoi elle s'est attaquée au palais. Mais le plus étrange, c'est ce qui s'est passé ensuite…",
      "Depuis ce jour, les phénomènes mystérieux se multiplient dans Venise.",
    ],
  },
  {
    art: "plain",
    head: "left",
    paragraphs: [
      "Certains habitants racontent avoir rencontré, au détour d'une ruelle, un vieil homme à l'allure vénérable qui prétend être le Doge lui-même ! D'autres jurent avoir aperçu une silhouette fantomatique errant dans la ville. Il pourrait s'agir, figure-toi, du fantôme de Monteverdi !",
      "Et ce n'est pas tout… On raconte même qu'un immense lion ailé aurait été aperçu survolant la lagune !",
    ],
  },
  {
    art: "plain",
    paragraphs: [
      "Des histoires à dormir debout ? Peut-être… Mais à Venise, va savoir où finit la légende et où commence la vérité !",
      "Une chose est certaine : les fragments de la partition ont disparu. Il faut absolument les retrouver avant le grand concert qui doit avoir lieu cette semaine, en hommage à l'œuvre sublime du maître Monteverdi.",
      "C'est là que tu entres en scène, jeune matelot ! <strong>Je te confie une mission de la plus haute importance : retrouver les fragments perdus des Vêpres et percer le mystère de cette étrange tempête.</strong>",
    ],
  },
  {
    art: "gondolier",
    head: "right",
    paragraphs: [
      "Pour commencer, je te conseille d'aller voir le gondolier. Cet homme connaît Venise comme sa poche. Ses canaux, ses ruelles, ses passages secrets… Rien ne lui échappe !",
      "Si quelque chose d'inhabituel s'est produit, il en a certainement entendu parler.",
    ],
  },
  {
    art: "plain",
    paragraphs: [
      "Si tu rencontres le vieil homme qui prétend être le Doge, tu peux également l'interroger. Mais prends garde : il paraît qu'il a un sacré caractère !",
      "Quant au fantôme de Monteverdi… Je te déconseille de t'en approcher. Ceux qui disent l'avoir aperçu le décrivent comme une âme tourmentée, errant sans repos dans les rues de Venise. Mieux vaut garder tes distances, pour le moment.",
    ],
  },
  {
    art: "corto",
    paragraphs: [
      "Voilà, jeune matelot. Tu sais tout ce que je sais.",
      "<strong>À présent, c'est à toi de jouer. Et souviens-toi : à Venise, les apparences sont parfois trompeuses…</strong>",
    ],
  },
];

export function openCortoRendezvous() {
  if (document.querySelector(".corto-rendezvous")) return;
  const previousFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "corto-rendezvous";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Conversation avec Corto");
  overlay.tabIndex = -1;
  overlay.innerHTML = '<div class="cr-stage"></div><button class="cr-close" type="button" aria-label="Fermer la rencontre">×</button><button class="cr-prev" type="button" aria-label="Page précédente" hidden>‹ Précédent</button>';
  document.body.appendChild(overlay);
  document.body.classList.add("corto-rendezvous-open");
  let index = 0;
  let scene = null;
  let pointerStart = null;
  const stage = overlay.querySelector(".cr-stage");
  const prev = overlay.querySelector(".cr-prev");
  const closeButton = overlay.querySelector(".cr-close");
  const close = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    document.body.classList.remove("corto-rendezvous-open");
    previousFocus?.focus?.();
  };
  const show = () => {
    const page = PAGES[index];
    stage.querySelectorAll(".cr-exit").forEach((el) => el.remove());
    const nextScene = document.createElement("div");
    nextScene.className = `cr-scene cr-art-${page.art}${page.head ? " cr-has-head" : ""}${scene ? " cr-enter" : ""}`;
    const art = page.art === "corto"
      ? '<img class="cr-corto" src="img/intro/e1.webp" alt="Corto Maltese debout">'
      : page.art === "storm"
        ? '<img class="cr-painting" src="img/narrative/corto-tempete.png" alt="Une tempête sur la lagune de Venise">'
        : page.art === "gondolier"
          ? '<img class="cr-painting" src="img/narrative/corto-gondolier.png" alt="Un gondolier sur la lagune">'
          : "";
    const head = page.head ? `<img class="cr-head cr-head-${page.head}" src="img/corto-content.webp" alt="">` : "";
    nextScene.innerHTML = `${art}${head}<div class="cr-scroll"><div class="cr-copy">${page.paragraphs.map((p) => `<p>${p}</p>`).join("")}</div></div>`;
    const old = scene;
    stage.appendChild(nextScene);
    scene = nextScene;
    prev.hidden = index === 0;
    if (!old) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { old.remove(); nextScene.classList.remove("cr-enter"); return; }
    old.classList.add("cr-exit");
    requestAnimationFrame(() => requestAnimationFrame(() => nextScene.classList.remove("cr-enter")));
    setTimeout(() => old.remove(), 520);
  };
  const advance = () => { if (index === PAGES.length - 1) close(); else { index++; show(); } };
  const back = () => { if (index > 0) { index--; show(); } };
  const onKey = (event) => {
    if (event.key === "Escape") close();
    else if (event.key === "ArrowRight" || ((event.key === "Enter" || event.key === " ") && event.target === overlay)) { event.preventDefault(); advance(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); back(); }
  };
  document.addEventListener("keydown", onKey);
  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, scroll: scene.querySelector(".cr-scroll")?.scrollTop || 0, time: Date.now() };
  });
  stage.addEventListener("pointerup", (event) => {
    const start = pointerStart; pointerStart = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || Date.now() - start.time > 800) return;
    if (Math.abs((scene.querySelector(".cr-scroll")?.scrollTop || 0) - start.scroll) > 4) return;
    advance();
  });
  stage.addEventListener("pointercancel", () => { pointerStart = null; });
  closeButton.onclick = close;
  prev.onclick = back;
  show();
  overlay.focus();
}
