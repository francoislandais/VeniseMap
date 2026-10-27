// Édition locale du dialogue : positions en pourcentage du viewport, brouillon séparé.
export function createGondolierEditor({ overlay, stage, layout, lines, getIndex, showPage, applyLayout, finishTyping, draftKey }) {
  let editing = false, selected = "copy", drag = null;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, Number(value) || 0));
  const bar = document.createElement("div");
  bar.className = "cr-editor gr-editor";
  bar.innerHTML = `<button type="button" class="cr-edit-toggle" aria-label="Activer le mode édition" title="Mode édition">✎</button><button type="button" class="cr-edit-collapse" aria-label="Afficher les outils" hidden>⚙</button>
    <div class="cr-edit-panel" hidden>
      <div class="cr-edit-row"><button type="button" data-action="prev">‹</button><span class="cr-edit-page"></span><button type="button" data-action="next">›</button><button type="button" data-action="flip" title="Déplacer les outils">⇅</button></div>
      <label>Élément<select class="cr-edit-target"><option value="copy">Réplique</option><option value="key">Clé</option><option value="painting">Image de fond</option></select></label>
      <label class="gr-edit-text">Texte de la réplique<textarea rows="5" aria-label="Modifier la réplique du gondolier"></textarea></label>
      <label data-control="size">Taille <output data-value="size"></output><input type="range" data-field="size" step="0.02"></label>
      <label data-control="width">Largeur <output data-value="width"></output><input type="range" min="50" max="100" step="1" data-field="width"></label>
      <label data-control="x">Position horizontale <output data-value="x"></output><input type="range" min="-100" max="100" step="1" data-field="x"></label>
      <label data-control="y">Position verticale <output data-value="y"></output><input type="range" min="-100" max="100" step="1" data-field="y"></label>
      <div class="cr-edit-row cr-edit-actions"><button type="button" data-action="reset">Réinitialiser</button><button type="button" data-action="save">💾 Enregistrer</button></div>
      <small class="cr-edit-help">Déplace la réplique ou la clé sur tout l’écran. Tire la poignée de la clé pour la redimensionner. Les positions s’adaptent aux écrans.</small><small class="cr-edit-status" role="status"></small>
    </div>`;
  overlay.appendChild(bar);
  const handle = document.createElement("button");
  handle.type = "button"; handle.className = "cr-resize-handle"; handle.hidden = true;
  handle.setAttribute("aria-label", "Redimensionner la clé");
  overlay.appendChild(handle);
  const toggle = bar.querySelector(".cr-edit-toggle"), collapse = bar.querySelector(".cr-edit-collapse"), panel = bar.querySelector(".cr-edit-panel");
  const target = bar.querySelector(".cr-edit-target"), textarea = bar.querySelector("textarea"), status = bar.querySelector(".cr-edit-status");
  const page = () => ((layout.pages ||= {})[getIndex()] ||= {});
  const defaults = (key = selected) => key === "key" ? { x: 50, y: 43, size: 1 } : key === "painting" ? { x: 50, y: 24, size: 1 } : { x: 0, y: 0, size: 1, width: 100 };
  const values = (key = selected) => ({ ...defaults(key), ...(page().elements?.[key] || {}) });
  const setValue = (field, value) => { const elements = (page().elements ||= {}); (elements[selected] ||= {})[field] = value; applyLayout(); persist(); refresh(); };
  const persist = () => { try { localStorage.setItem(draftKey, JSON.stringify(layout)); } catch {} status.textContent = "Brouillon local"; };
  const element = () => selected === "key" ? stage.querySelector(".gr-scene:not(.gr-exit) .gr-key") : selected === "copy" ? stage.querySelector(".gr-scene:not(.gr-exit) .gr-copy") : overlay.querySelector(overlay.classList.contains("gr-storm-active") ? ".gr-storm" : ".gr-painting");
  const positionHandle = () => {
    const image = editing && selected === "key" ? element() : null;
    handle.hidden = !image;
    if (!image) return;
    const box = image.getBoundingClientRect(), frame = overlay.getBoundingClientRect();
    handle.style.left = `${clamp(box.right - frame.left, 24, frame.width - 24)}px`;
    handle.style.top = `${clamp(box.bottom - frame.top, 24, frame.height - 24)}px`;
  };
  const refresh = () => {
    const index = getIndex(), hasKey = index === 5;
    target.querySelector('[value="key"]').hidden = !hasKey;
    if (selected === "key" && !hasKey) selected = "copy";
    target.value = selected;
    bar.querySelector(".cr-edit-page").textContent = `${index + 1} / ${lines.length}`;
    bar.querySelector('[data-action="prev"]').disabled = index === 0;
    bar.querySelector('[data-action="next"]').disabled = index === lines.length - 1;
    bar.querySelector(".gr-edit-text").hidden = selected !== "copy";
    bar.querySelector('[data-control="width"]').hidden = selected !== "copy";
    textarea.value = page().text ?? lines[index];
    const current = values();
    for (const input of bar.querySelectorAll("[data-field]")) {
      const field = input.dataset.field;
      if (field === "size") { input.min = selected === "key" ? ".35" : selected === "painting" ? "1" : ".65"; input.max = selected === "key" ? "3" : selected === "painting" ? "1.8" : "1.7"; }
      if (field === "x" || field === "y") { input.min = selected === "painting" ? "0" : "-100"; input.max = "100"; }
      input.value = current[field] ?? 100;
      bar.querySelector(`[data-value="${field}"]`).textContent = field === "size" ? Number(current[field]).toFixed(2) : String(current[field]);
    }
    overlay.querySelectorAll(".gr-selected").forEach(node => node.classList.remove("gr-selected"));
    if (editing) element()?.classList.add("gr-selected");
    requestAnimationFrame(positionHandle);
  };
  toggle.onclick = () => {
    editing = !editing;
    if (editing) finishTyping();
    overlay.classList.toggle("gr-editing", editing);
    panel.hidden = true; collapse.hidden = !editing;
    toggle.textContent = editing ? "✓" : "✎";
    toggle.setAttribute("aria-label", editing ? "Terminer le mode édition" : "Activer le mode édition");
    refresh();
  };
  collapse.onclick = () => { panel.hidden = !panel.hidden; collapse.setAttribute("aria-label", panel.hidden ? "Afficher les outils" : "Masquer les outils"); };
  target.onchange = () => { selected = target.value; refresh(); };
  textarea.oninput = () => { page().text = textarea.value; finishTyping(); applyLayout(); persist(); };
  bar.addEventListener("input", event => {
    const input = event.target.closest("[data-field]"); if (!input) return;
    setValue(input.dataset.field, Number(input.value));
  });
  bar.addEventListener("click", async event => {
    const action = event.target.closest("[data-action]")?.dataset.action; if (!action) return;
    if (action === "prev" || action === "next") { selected = "copy"; showPage(getIndex() + (action === "prev" ? -1 : 1)); return; }
    if (action === "flip") { bar.classList.toggle("cr-editor-bottom"); return; }
    if (action === "reset") { if (selected === "copy") delete page().text; delete page().elements?.[selected]; applyLayout(); persist(); refresh(); return; }
    if (action === "save") {
      status.textContent = "Enregistrement…";
      try {
        const response = await fetch("api/gondolier-rendezvous-layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(layout) });
        if (!response.ok) throw new Error("save");
        localStorage.removeItem(draftKey); status.textContent = "Enregistré dans le projet ✔";
      } catch { status.textContent = "Échec : utilise le serveur local en mode dev."; }
    }
  });
  const down = event => {
    if (!editing || !event.isPrimary || event.button !== 0) return;
    const hit = event.target.closest(".gr-copy,.gr-key");
    if (!hit) { event.stopImmediatePropagation(); return; }
    selected = hit.classList.contains("gr-key") ? "key" : "copy";
    refresh();
    const current = values();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, cx: current.x, cy: current.y };
    event.preventDefault(); event.stopImmediatePropagation();
    stage.setPointerCapture?.(event.pointerId);
  };
  const move = event => {
    if (!drag || drag.id !== event.pointerId) return;
    const box = overlay.getBoundingClientRect();
    setValue("x", clamp(drag.cx + (event.clientX - drag.x) / box.width * 100, -100, 100));
    setValue("y", clamp(drag.cy + (event.clientY - drag.y) / box.height * 100, -100, 100));
    event.stopImmediatePropagation();
  };
  const up = event => { if (drag?.id === event.pointerId) { drag = null; event.stopImmediatePropagation(); } };
  stage.addEventListener("pointerdown", down, true);
  stage.addEventListener("pointermove", move, true);
  stage.addEventListener("pointerup", up, true);
  stage.addEventListener("pointercancel", up, true);
  let resizing = null;
  handle.addEventListener("pointerdown", event => {
    const image = element(); if (!editing || !image) return;
    const box = image.getBoundingClientRect();
    resizing = { id: event.pointerId, x: event.clientX, size: values().size, width: box.width };
    event.preventDefault(); handle.setPointerCapture?.(event.pointerId);
  });
  handle.addEventListener("pointermove", event => {
    if (resizing?.id !== event.pointerId) return;
    setValue("size", clamp(resizing.size * (1 + (event.clientX - resizing.x) / resizing.width), .35, 3));
  });
  const endResize = event => { if (resizing?.id === event.pointerId) resizing = null; };
  handle.addEventListener("pointerup", endResize);
  handle.addEventListener("pointercancel", endResize);
  window.addEventListener("resize", positionHandle);
  return { get editing() { return editing; }, refresh, destroy() { window.removeEventListener("resize", positionHandle); } };
}
