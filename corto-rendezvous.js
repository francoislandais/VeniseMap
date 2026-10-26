// La première rencontre se relit depuis le bateau de Corto quand le joueur en est proche.
import { createCortoEditor } from "./corto-rendezvous-editor.js";
import { createCortoSoundtrack } from "./corto-sound.js";

const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
let canEdit = false;
try { canEdit = isLocal && localStorage.getItem("vq_dev_enabled_v2") === "1"; } catch {}
const draftKey = "vq_corto_rendezvous_layout_draft";
const layoutPromise = fetch("data/corto-rendezvous-layout.json?" + Date.now())
  .then((r) => r.ok ? r.json() : { pages: {} }).catch(() => ({ pages: {} }))
  .then((saved) => {
    const base = saved && typeof saved.pages === "object" ? saved : { pages: {} };
    if (canEdit) try {
      const draft = JSON.parse(localStorage.getItem(draftKey));
      if (draft && typeof draft.pages === "object") {
        const pages = { ...base.pages };
        for (const [index, change] of Object.entries(draft.pages)) {
          const original = pages[index] || {};
          pages[index] = { ...original, ...change, elements: { ...original.elements, ...change.elements } };
        }
        return { ...base, ...draft, pages };
      }
    } catch {}
    return base;
  });
const esc = (text) => String(text).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const formatted = (text) => esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n/g, "<br>");
const editable = (html) => html.replace(/<strong>/g, "**").replace(/<\/strong>/g, "**").replace(/<em>/g, "*").replace(/<\/em>/g, "*");
const number = (value, fallback, low, high) => Number.isFinite(Number(value)) ? Math.max(low, Math.min(high, Number(value))) : fallback;
let opening = false;

function typeParagraphs(copy) {
  const entries = [];
  copy.querySelectorAll(".cr-paragraph").forEach((paragraph) => {
    paragraph.setAttribute("aria-label", paragraph.textContent.trim());
    paragraph.style.minHeight = `${paragraph.getBoundingClientRect().height}px`;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, chars = Array.from(node.textContent);
      if (chars.length) { entries.push({ node, chars }); node.textContent = ""; }
    }
  });
  const total = entries.reduce((sum, entry) => sum + entry.chars.length, 0);
  let raf = 0, done = false, started = 0, shown = -1;
  copy.classList.add("cr-typing");
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
  const finish = () => {
    cancelAnimationFrame(raf);
    reveal(total);
    copy.querySelectorAll(".cr-paragraph").forEach((paragraph) => { paragraph.style.minHeight = ""; });
    done = true;
    copy.classList.remove("cr-typing");
  };
  const frame = (now) => {
    if (done) return;
    if (!started) started = now;
    reveal(Math.min(total, Math.floor((now - started) / 9)));
    if (shown >= total) finish();
    else raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return { get done() { return done; }, finish };
}

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
    art: "omen",
    character: "doge",
    backdrop: "img/narrative/venise-lavis-04.png",
    head: "left",
    paragraphs: [
      "Certains habitants racontent avoir rencontré, au détour d'une ruelle, un vieil homme à l'allure vénérable qui prétend être le Doge lui-même !",
    ],
  },
  {
    layoutKey: 8,
    art: "omen",
    character: "monteverdi",
    backdrop: "img/narrative/venise-lavis-03.png",
    paragraphs: [
      "D'autres jurent avoir aperçu une silhouette fantomatique errant dans la ville. Il pourrait s'agir, figure-toi, du fantôme de Monteverdi !",
    ],
  },
  {
    layoutKey: 9,
    art: "omen",
    character: "lion",
    backdrop: "img/narrative/venise-lavis-02.png",
    paragraphs: [
      "Et ce n'est pas tout… On raconte même qu'un immense lion ailé aurait été aperçu survolant la lagune !",
    ],
  },
  {
    layoutKey: 4,
    art: "plain",
    paragraphs: [
      "Des histoires à dormir debout ? Peut-être… Mais à Venise, va savoir où finit la légende et où commence la vérité !",
      "Une chose est certaine : les fragments de la partition ont disparu. Il faut absolument les retrouver avant le grand concert qui doit avoir lieu cette semaine, en hommage à l'œuvre sublime du maître Monteverdi.",
      "C'est là que tu entres en scène, jeune matelot ! <strong>Je te confie une mission de la plus haute importance : retrouver les fragments perdus des Vêpres et percer le mystère de cette étrange tempête.</strong>",
    ],
  },
  {
    layoutKey: 5,
    art: "gondolier",
    backdrop: "img/narrative/corto-gondolier-fin.png",
    head: "right",
    paragraphs: [
      "Pour commencer, je te conseille d'aller voir le gondolier. Cet homme connaît Venise comme sa poche. Ses canaux, ses ruelles, ses passages secrets… Rien ne lui échappe !",
      "Si quelque chose d'inhabituel s'est produit, il en a certainement entendu parler.",
      "Bonne chance !",
    ],
  },
];

export async function openCortoRendezvous() {
  if (opening || document.querySelector(".corto-rendezvous")) return;
  opening = true;
  const sound = createCortoSoundtrack();
  const layout = await layoutPromise;
  opening = false;
  if (document.querySelector(".corto-rendezvous")) return;
  const previousFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "corto-rendezvous";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Conversation avec Corto");
  overlay.tabIndex = -1;
  overlay.innerHTML = '<div class="cr-stage"></div><button class="cr-close" type="button" aria-label="Fermer la rencontre">×</button><button class="cr-sound" type="button" aria-label="Couper l’ambiance sonore"></button><button class="cr-prev" type="button" aria-label="Page précédente" hidden>‹ Précédent</button>';
  document.body.appendChild(overlay);
  document.body.classList.add("corto-rendezvous-open");
  let index = 0;
  let scene = null;
  let pointerStart = null;
  let editor = null;
  let typing = null, shownPage = -1;
  const stage = overlay.querySelector(".cr-stage");
  const prev = overlay.querySelector(".cr-prev");
  const closeButton = overlay.querySelector(".cr-close");
  const soundButton = overlay.querySelector(".cr-sound");
  const syncSoundButton = () => { soundButton.textContent = sound.muted ? "♪̸" : "♪"; soundButton.setAttribute("aria-label", sound.muted ? "Activer l’ambiance sonore" : "Couper l’ambiance sonore"); };
  syncSoundButton();
  soundButton.onclick = () => { sound.toggle(); syncSoundButton(); };
  const close = () => {
    typing?.finish();
    sound.stop();
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    editor?.destroy();
    overlay.remove();
    document.body.classList.remove("corto-rendezvous-open");
    previousFocus?.focus?.();
  };
  const applyLayout = (target = scene, pageIndex = index) => {
    if (!target) return;
    const changes = layout.pages?.[PAGES[pageIndex].layoutKey ?? pageIndex] || {};
    const copy = target.querySelector(".cr-copy");
    copy.querySelectorAll(".cr-paragraph").forEach((paragraph, i) => {
      paragraph.innerHTML = typeof changes.text?.[i] === "string" ? formatted(changes.text[i]) : PAGES[pageIndex].paragraphs[i];
    });
    const c = changes.elements?.copy || {};
    const width = number(c.width, 100, 65, 100), size = number(c.size, 1, .75, 1.6);
    const base = Math.min(22, Math.max(18, overlay.clientWidth * .046));
    copy.style.width = `${width}%`;
    copy.style.maxWidth = `${660 * width / 100}px`;
    copy.style.fontSize = `${Math.min(32, Math.max(16, base * size))}px`;
    copy.style.lineHeight = String(number(c.line, 1.42, 1.2, 1.8));
    copy.style.setProperty("--cr-gap", `${number(c.gap, 18, 6, 50)}px`);
    const x = number(c.x, 0, -100, 100), y = number(c.y, 0, -100, 100);
    copy.style.translate = `${x}vw ${y}dvh`;
    copy.querySelectorAll(".cr-paragraph").forEach((paragraph, i) => {
      const cfg = changes.elements?.[`paragraph-${i}`] || {};
      const px = number(cfg.x, 0, -100, 100), py = number(cfg.y, 0, -100, 100);
      paragraph.style.width = `${number(cfg.width, 100, 50, 100)}%`;
      paragraph.style.fontSize = `${Math.min(54, Math.max(13, base * size * number(cfg.size, 1, .65, 1.7)))}px`;
      paragraph.style.lineHeight = String(number(cfg.line, number(c.line, 1.42, 1.1, 1.8), 1.1, 1.8));
      paragraph.style.marginBottom = `${number(cfg.gap, number(c.gap, 18, 0, 60), 0, 60)}px`;
      paragraph.style.translate = `${px}vw ${py}dvh`;
    });
    // Le cadrage suit l'écran entier : une boîte peut traverser ses anciennes marges.
    // Hors édition, une petite partie reste visible pour qu'on puisse toujours la retrouver.
    requestAnimationFrame(() => {
      if (!copy.isConnected || editor?.editing) return;
      const area = overlay.getBoundingClientRect();
      const keepVisible = (element, tx, ty) => {
        const box = element.getBoundingClientRect(), visible = 42;
        const dx = box.right < area.left + visible ? area.left + visible - box.right : box.left > area.right - visible ? area.right - visible - box.left : 0;
        const dy = box.bottom < area.top + visible ? area.top + visible - box.bottom : box.top > area.bottom - visible ? area.bottom - visible - box.top : 0;
        if (dx || dy) element.style.translate = `calc(${tx}vw + ${Math.round(dx)}px) calc(${ty}dvh + ${Math.round(dy)}px)`;
      };
      copy.querySelectorAll(".cr-paragraph").forEach((paragraph, i) => {
        const cfg = changes.elements?.[`paragraph-${i}`] || {};
        keepVisible(paragraph, number(cfg.x, 0, -100, 100), number(cfg.y, 0, -100, 100));
      });
      for (const key of ["corto", "head", "actor"]) {
        const image = target.querySelector(key === "corto" ? ".cr-corto" : key === "head" ? ".cr-head" : ".cr-omen");
        if (!image) continue;
        const cfg = changes.elements?.[key] || {};
        keepVisible(image, number(cfg.x, 0, -100, 100), number(cfg.y, 0, -100, 100));
      }
    });
    for (const key of ["corto", "head", "actor"]) {
      const element = target.querySelector(key === "corto" ? ".cr-corto" : key === "head" ? ".cr-head" : ".cr-omen");
      if (!element) continue;
      const cfg = changes.elements?.[key] || {};
      element.style.translate = `${number(cfg.x, 0, -100, 100)}vw ${number(cfg.y, 0, -100, 100)}dvh`;
      element.style.scale = String(number(cfg.size, 1, .35, 3));
    }
    const painting = target.querySelector(".cr-painting");
    if (painting) {
      const cfg = changes.elements?.painting || {};
      const defaults = PAGES[pageIndex].art === "storm" ? [47, 26] : [50, 24];
      painting.style.objectPosition = `${number(cfg.x, defaults[0], 0, 100)}% ${number(cfg.y, defaults[1], 0, 100)}%`;
      painting.style.scale = String(number(cfg.size, 1, 1, 1.8));
    }
  };
  const onResize = () => { typing?.finish(); applyLayout(); };
  window.addEventListener("resize", onResize);
  const show = () => {
    typing?.finish();
    sound.scene(index, shownPage);
    shownPage = index;
    const page = PAGES[index];
    stage.querySelectorAll(".cr-exit").forEach((el) => el.remove());
    const nextScene = document.createElement("div");
    nextScene.className = `cr-scene cr-art-${page.art}${page.head ? " cr-has-head" : ""}${scene ? " cr-enter" : ""}`;
    const backdrop = page.backdrop || (page.art === "storm" ? "img/narrative/corto-tempete.png" : page.art === "gondolier" ? "img/narrative/corto-gondolier.png" : "");
    const art = page.art === "corto"
      ? '<img class="cr-corto" src="img/intro/e1.webp" alt="Corto Maltese debout">'
      : backdrop ? `<img class="cr-painting" src="${backdrop}" alt="">` : "";
    const characters = { doge: ["img/doge-big.webp", "Le Doge"], monteverdi: ["img/monteverdi-avatar.webp", "Le fantôme de Monteverdi"], lion: ["img/lion-avatar.webp", "Le lion ailé"] };
    const actor = page.character ? `<img class="cr-omen cr-omen-${page.character}" src="${characters[page.character][0]}" alt="${characters[page.character][1]}">` : "";
    const head = page.head ? `<img class="cr-head cr-head-${page.head}" src="img/corto-content.webp" alt="">` : "";
    nextScene.innerHTML = `${art}${actor}${head}<div class="cr-scroll"><div class="cr-copy">${page.paragraphs.map((p, i) => `<div class="cr-paragraph" data-paragraph="${i}">${p}</div>`).join("")}</div></div>`;
    const old = scene;
    stage.appendChild(nextScene);
    scene = nextScene;
    applyLayout(nextScene, index);
    typing = !editor?.editing && !matchMedia("(prefers-reduced-motion: reduce)").matches ? typeParagraphs(nextScene.querySelector(".cr-copy")) : null;
    prev.hidden = index === 0;
    editor?.refresh();
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
    else if (event.target.closest?.("textarea,input,select")) return;
    else if (event.key === "ArrowRight" || ((event.key === "Enter" || event.key === " ") && event.target === overlay)) { event.preventDefault(); if (typing && !typing.done) typing.finish(); else advance(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); back(); }
  };
  document.addEventListener("keydown", onKey);
  stage.addEventListener("pointerdown", (event) => {
    if (editor?.editing) return;
    if (!event.isPrimary || event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, scroll: scene.querySelector(".cr-scroll")?.scrollTop || 0, time: Date.now() };
  });
  stage.addEventListener("pointerup", (event) => {
    if (editor?.editing) return;
    const start = pointerStart; pointerStart = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || Date.now() - start.time > 800) return;
    if (Math.abs((scene.querySelector(".cr-scroll")?.scrollTop || 0) - start.scroll) > 4) return;
    if (typing && !typing.done) typing.finish();
    else advance();
  });
  stage.addEventListener("pointercancel", () => { pointerStart = null; });
  closeButton.onclick = close;
  prev.onclick = back;
  show();
  if (canEdit) editor = createCortoEditor({ overlay, stage, layout, defaults: PAGES, getIndex: () => index, getLayoutKey: () => PAGES[index].layoutKey ?? index, getScene: () => scene, applyLayout, showPage: (to) => { index = Math.max(0, Math.min(PAGES.length - 1, to)); show(); }, editable, draftKey, revealAll: () => typing?.finish() });
  overlay.focus();
}
