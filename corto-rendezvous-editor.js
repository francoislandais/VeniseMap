// Outils locaux de composition : les déplacements sont enregistrés en pourcentage de l'écran.
export function createCortoEditor({ overlay, stage, layout, defaults, getIndex, getScene, applyLayout, showPage, editable, draftKey }) {
  let editing = false, selected = "copy", paragraph = 0, drag = null;
  const bar = document.createElement("div");
  bar.className = "cr-editor";
  bar.innerHTML = `<button type="button" class="cr-edit-toggle">✎ Éditer</button><button type="button" class="cr-edit-collapse" hidden>Masquer outils</button>
    <div class="cr-edit-panel" hidden>
      <div class="cr-edit-row"><button type="button" data-action="prev" aria-label="Page précédente">‹</button><span class="cr-edit-page"></span><button type="button" data-action="next" aria-label="Page suivante">›</button><button type="button" data-action="flip" aria-label="Déplacer les outils">⇅</button></div>
      <label>Élément<select class="cr-edit-target"></select></label>
      <div class="cr-edit-text"><label>Réplique <select class="cr-edit-paragraph"></select></label><textarea rows="4" aria-label="Modifier la réplique de Corto"></textarea><button type="button" data-action="original">Texte d’origine</button><small>**gras** et *italique* sont possibles.</small></div>
      <label data-control="size">Taille <output data-value="size"></output><input type="range" min="0.5" max="2" step="0.02" data-field="size"></label>
      <label data-control="width">Largeur du texte <output data-value="width"></output><input type="range" min="65" max="100" step="1" data-field="width"></label>
      <label data-control="gap">Espace entre paragraphes <output data-value="gap"></output><input type="range" min="6" max="50" step="1" data-field="gap"></label>
      <label data-control="line">Interligne <output data-value="line"></output><input type="range" min="1.2" max="1.8" step="0.02" data-field="line"></label>
      <label data-control="x"><span data-label="x">Position horizontale</span> <output data-value="x"></output><input type="range" min="-35" max="35" step="1" data-field="x"></label>
      <label data-control="y"><span data-label="y">Position verticale</span> <output data-value="y"></output><input type="range" min="-35" max="45" step="1" data-field="y"></label>
      <div class="cr-edit-row cr-edit-actions"><button type="button" data-action="reset">Réinitialiser l’élément</button><button type="button" data-action="save">💾 Enregistrer</button></div>
      <small class="cr-edit-help">Glisse l’élément pour le déplacer. Les positions suivent la taille de l’écran ; le texte reste dans les marges et peut défiler.</small>
      <small class="cr-edit-status" role="status"></small>
    </div>`;
  overlay.appendChild(bar);
  const toggle = bar.querySelector(".cr-edit-toggle"), collapse = bar.querySelector(".cr-edit-collapse"), panel = bar.querySelector(".cr-edit-panel");
  const target = bar.querySelector(".cr-edit-target"), paragraphSelect = bar.querySelector(".cr-edit-paragraph"), textarea = bar.querySelector("textarea");
  const status = bar.querySelector(".cr-edit-status");
  const bounds = {
    copy: { x: [-25, 25], y: [-30, 40], size: [.75, 1.6], width: [65, 100], gap: [6, 50], line: [1.2, 1.8] },
    corto: { x: [-35, 35], y: [-35, 45], size: [.5, 2] },
    head: { x: [-35, 35], y: [-35, 45], size: [.5, 2] },
    painting: { x: [0, 100], y: [0, 100], size: [1, 1.8] },
  };
  const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
  const defaultsFor = (key) => key === "copy" ? { x: 0, y: 0, size: 1, width: 100, gap: 18, line: 1.42 }
    : key === "painting" ? { x: defaults[getIndex()].art === "storm" ? 47 : 50, y: defaults[getIndex()].art === "storm" ? 26 : 24, size: 1 }
      : { x: 0, y: 0, size: 1 };
  const page = () => ((layout.pages ||= {})[getIndex()] ||= {});
  const current = () => {
    const elements = (page().elements ||= {});
    return (elements[selected] ||= defaultsFor(selected));
  };
  const persistDraft = () => { try { localStorage.setItem(draftKey, JSON.stringify(layout)); } catch {} status.textContent = "Brouillon local"; };
  const textOf = () => page().text?.[paragraph] ?? editable(defaults[getIndex()].paragraphs[paragraph]);
  const available = () => {
    const scene = getScene();
    return [["copy", "Texte"], ["corto", "Corto debout"], ["head", "Tête de Corto"], ["painting", "Image de fond"]].filter(([key]) => key === "copy" || !!scene?.querySelector(key === "corto" ? ".cr-corto" : key === "head" ? ".cr-head" : ".cr-painting"));
  };
  const selectedElement = () => getScene()?.querySelector(selected === "copy" ? ".cr-copy" : selected === "corto" ? ".cr-corto" : selected === "head" ? ".cr-head" : ".cr-painting");
  const updateValues = () => {
    const c = current(), def = defaultsFor(selected);
    bar.querySelectorAll("[data-field]").forEach((input) => {
      const name = input.dataset.field, value = c[name] ?? def[name];
      input.value = String(value);
      bar.querySelector(`[data-value="${name}"]`).textContent = name === "size" || name === "line" ? Number(value).toFixed(2) : String(value);
    });
  };
  const refresh = () => {
    const options = available();
    if (!options.some(([key]) => key === selected)) selected = "copy";
    target.innerHTML = options.map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
    target.value = selected;
    bar.querySelector(".cr-edit-page").textContent = `${getIndex() + 1} / ${defaults.length}`;
    bar.querySelector('[data-action="prev"]').disabled = getIndex() === 0;
    bar.querySelector('[data-action="next"]').disabled = getIndex() === defaults.length - 1;
    const isText = selected === "copy", isPainting = selected === "painting";
    for (const field of ["width", "gap", "line"]) bar.querySelector(`[data-control="${field}"]`).hidden = !isText;
    for (const field of ["x", "y"]) {
      const input = bar.querySelector(`[data-field="${field}"]`);
      input.min = String(bounds[selected][field][0]); input.max = String(bounds[selected][field][1]);
      bar.querySelector(`[data-label="${field}"]`).textContent = `${isPainting ? "Cadrage" : "Position"} ${field === "x" ? "horizontale" : "verticale"}`;
    }
    bar.querySelector('[data-control="size"] input').min = isText ? ".75" : isPainting ? "1" : ".5";
    bar.querySelector('[data-control="size"] input').max = isText ? "1.6" : isPainting ? "1.8" : "2";
    bar.querySelector(".cr-edit-text").hidden = !isText;
    if (isText) {
      const count = defaults[getIndex()].paragraphs.length;
      paragraph = Math.min(paragraph, count - 1);
      paragraphSelect.innerHTML = Array.from({ length: count }, (_, i) => `<option value="${i}">Réplique ${i + 1}</option>`).join("");
      paragraphSelect.value = String(paragraph);
      textarea.value = textOf();
    }
    getScene()?.querySelectorAll(".cr-selected").forEach((el) => el.classList.remove("cr-selected"));
    if (editing) selectedElement()?.classList.add("cr-selected");
    updateValues();
  };
  toggle.onclick = () => {
    editing = !editing;
    overlay.classList.toggle("cr-editing", editing);
    panel.hidden = !editing;
    collapse.hidden = !editing;
    collapse.textContent = "Masquer outils";
    toggle.textContent = editing ? "✓ Terminer l’édition" : "✎ Éditer";
    refresh();
  };
  collapse.onclick = () => { panel.hidden = !panel.hidden; collapse.textContent = panel.hidden ? "Afficher outils" : "Masquer outils"; };
  target.onchange = () => { selected = target.value; refresh(); };
  paragraphSelect.onchange = () => { paragraph = Number(paragraphSelect.value); textarea.value = textOf(); };
  textarea.oninput = () => { (page().text ||= [])[paragraph] = textarea.value; applyLayout(); persistDraft(); };
  bar.addEventListener("input", (event) => {
    const input = event.target.closest("[data-field]"); if (!input) return;
    const field = input.dataset.field, c = current();
    c[field] = clamp(Number(input.value), bounds[selected][field]);
    applyLayout(); updateValues(); persistDraft();
  });
  bar.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "prev" || action === "next") { paragraph = 0; showPage(getIndex() + (action === "prev" ? -1 : 1)); return; }
    if (action === "flip") { bar.classList.toggle("cr-editor-bottom"); return; }
    if (action === "reset") { delete page().elements[selected]; applyLayout(); refresh(); persistDraft(); return; }
    if (action === "original") {
      if (page().text) delete page().text[paragraph];
      textarea.value = textOf(); applyLayout(); persistDraft(); return;
    }
    if (action === "save") {
      status.textContent = "Enregistrement…";
      try {
        const response = await fetch("api/corto-rendezvous-layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(layout) });
        if (!response.ok) throw new Error("save");
        localStorage.removeItem(draftKey);
        status.textContent = "Enregistré dans le projet ✔";
      } catch { status.textContent = "Échec : utilise le serveur local en mode dev."; }
    }
  });
  const onDown = (event) => {
    if (!editing || !event.isPrimary || event.button !== 0) return;
    const hit = event.target.closest(".cr-copy,.cr-corto,.cr-head,.cr-painting");
    if (!hit) return;
    selected = hit.classList.contains("cr-copy") ? "copy" : hit.classList.contains("cr-corto") ? "corto" : hit.classList.contains("cr-head") ? "head" : "painting";
    refresh();
    const c = current();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, cx: c.x, cy: c.y };
    event.preventDefault();
    stage.setPointerCapture?.(event.pointerId);
  };
  const onMove = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const c = current(), rect = overlay.getBoundingClientRect();
    c.x = Math.round(clamp(drag.cx + (event.clientX - drag.x) / rect.width * 100, bounds[selected].x) * 100) / 100;
    c.y = Math.round(clamp(drag.cy + (event.clientY - drag.y) / rect.height * 100, bounds[selected].y) * 100) / 100;
    applyLayout(); updateValues(); persistDraft();
  };
  const onUp = (event) => { if (drag?.id === event.pointerId) drag = null; };
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onUp);
  return {
    get editing() { return editing; },
    refresh,
    destroy() { stage.removeEventListener("pointerdown", onDown); stage.removeEventListener("pointermove", onMove); stage.removeEventListener("pointerup", onUp); stage.removeEventListener("pointercancel", onUp); },
  };
}
