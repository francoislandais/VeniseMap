// Adaptateur du graphe narratif V0 vers la sauvegarde de l'application.
// Les clés n:* cohabitent avec les étoiles, défis et trésors existants dans done.
export const narrativeKey = (kind, id) => `n:${kind}:${id}`;

export function createNarrative(data, store) {
  const has = (kind, id) => store.has(narrativeKey(kind, id));
  const matches = (condition = {}) =>
    (condition.flags || []).every((id) => has("flag", id)) &&
    (condition.unless_flags || []).every((id) => !has("flag", id)) &&
    (condition.items || []).every((id) => has("item", id)) &&
    (condition.unless_items || []).every((id) => !has("item", id));

  function apply(effects = {}) {
    if ((effects.take || []).some((id) => !has("item", id))) return false;
    let changed = false;
    const set = (kind, id) => {
      const key = narrativeKey(kind, id);
      if (!store.has(key)) { store.set(key); changed = true; }
    };
    const clear = (kind, id) => {
      const key = narrativeKey(kind, id);
      if (store.has(key)) { store.clear(key); changed = true; }
    };
    (effects.take || []).forEach((id) => clear("item", id));
    (effects.give || []).forEach((id) => {
      if (!has("item-ever", id)) { set("item-ever", id); set("item", id); }
    });
    (effects.flags || []).forEach((id) => set("flag", id));
    (effects.quests || []).forEach((id) => set("quest", id));
    (effects.finish_quests || []).forEach((id) => set("quest-finished", id));
    if (changed) store.commit();
    return true;
  }

  function entry(character) {
    const rule = (data.entries[character] || []).find(matches);
    return rule ? rule.scene : null;
  }

  function scene(id) {
    const value = data.scenes[id];
    if (!value) return null;
    apply(value.enter);
    return { id, text: value.text, choices: (value.choices || []).map((choice, index) => ({ ...choice, index })).filter((choice) => matches(choice.requires)) };
  }

  function choose(sceneId, choiceIndex) {
    const choice = data.scenes[sceneId]?.choices?.[choiceIndex];
    if (!choice || !matches(choice.requires) || !apply(choice.effects)) return null;
    return choice.next;
  }

  function grantExternal(itemId) {
    const item = data.items[itemId];
    if (!item?.source?.startsWith("external_")) return false;
    if (!(item.requires_flags || []).every((id) => has("flag", id))) return false;
    if (has("item-ever", itemId)) return false;
    return apply({ give: [itemId] });
  }

  function progress() {
    return Object.entries(data.quests).filter(([id]) => has("quest", id)).map(([id, title]) => ({
      id, title, finished: has("quest-finished", id)
    }));
  }

  return { entry, scene, choose, apply, grantExternal, progress, hasFlag: (id) => has("flag", id), hasItem: (id) => has("item", id) };
}
