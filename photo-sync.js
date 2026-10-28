const newId = () => crypto.randomUUID ? crypto.randomUUID().replaceAll("-", "") : [...crypto.getRandomValues(new Uint8Array(16))].map((v) => v.toString(16).padStart(2, "0")).join("");
const belongs = (record, player) => record?.owner === player || typeof record?.owner === "string" && record.owner.endsWith(":" + player);
const generation = (record, epoch) => record.generation ?? ((record.t || 0) >= epoch ? epoch : 0);
const binary64 = (blob) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1]); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
const hash = async (buffer) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer))].map((v) => v.toString(16).padStart(2, "0")).join("");

export function createPhotoLibrary(api) {
  let running = null, timer = null, rerun = false;
  let status = { state: "waiting", pending: 0 };
  const snapshot = () => ({ player: api.player(), owner: api.owner(), epoch: api.epoch(), headers: { ...api.headers() } });
  const current = (s) => s.player === api.player() && s.owner === api.owner() && s.epoch === api.epoch();
  const setStatus = (next) => { status = next; api.onStatus?.(next); };
  const open = () => new Promise((resolve, reject) => {
    const r = indexedDB.open("vq-photos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("p");
    r.onsuccess = () => { r.result.onversionchange = () => r.result.close(); resolve(r.result); };
    r.onerror = () => reject(r.error);
  });
  async function rows() {
    const db = await open();
    try { return await new Promise((resolve, reject) => {
      const tx = db.transaction("p"), store = tx.objectStore("p"), keys = store.getAllKeys(), values = store.getAll();
      tx.oncomplete = () => resolve(keys.result.map((key, i) => [key, values.result[i]]));
      tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    }); } finally { db.close(); }
  }
  async function write(key, value, check = () => true) {
    const db = await open();
    try { await new Promise((resolve, reject) => {
      const tx = db.transaction("p", "readwrite"), store = tx.objectStore("p"), old = store.get(key);
      old.onsuccess = () => { if (check(old.result)) store.put(value, key); };
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    }); } finally { db.close(); }
  }
  async function identify(key, s) {
    const db = await open(); let value = null;
    try { await new Promise((resolve, reject) => {
      const tx = db.transaction("p", "readwrite"), store = tx.objectStore("p"), old = store.get(key);
      old.onsuccess = () => {
        if (!current(s) || !belongs(old.result, s.player)) return;
        value = old.result;
        if (!value.photoId) {
          value = { ...value, photoId: newId(), photoKey: value.photoKey || String(key).slice(value.owner.length + 1), generation: generation(value, s.epoch) };
          store.put(value, key);
        }
      };
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    }); return value; } finally { db.close(); }
  }
  async function all() {
    const s = snapshot(), found = new Map(), list = await rows();
    const deletedIds = new Set(list.filter(([, rec]) => belongs(rec, s.player) && rec.deleted && rec.photoId).map(([, rec]) => rec.photoId));
    for (const [key, rec] of list) {
      if (!belongs(rec, s.player) || rec.deleted || deletedIds.has(rec.photoId) || !rec.blob || generation(rec, s.epoch) < s.epoch) continue;
      const id = rec.photoId || key;
      if (!found.has(id) || (rec.t || 0) > (found.get(id)[1].t || 0)) found.set(id, [key, rec]);
    }
    return current(s) ? [...found.values()] : [];
  }
  async function put(key, rec, owner = api.owner()) {
    const s = snapshot(); if (owner !== s.owner) return;
    const photoId = newId();
    // Chaque prise a sa propre clé, même si deux appareils ou deux onglets prennent la photo au même instant.
    await write(owner + ":sync:" + photoId, { ...rec, owner, photoKey: key, photoId, generation: s.epoch, photoSynced: false }, () => current(s));
    schedule(0);
  }
  async function get(key) {
    const s = snapshot(), list = await all(); if (!current(s)) return null;
    return list.filter(([k, rec]) => (rec.photoKey || String(k).slice(rec.owner.length + 1)) === key).sort((a, b) => (b[1].t || 0) - (a[1].t || 0))[0]?.[1] || null;
  }
  async function clearPlayer(player) {
    const list = await rows(), db = await open();
    try { await new Promise((resolve, reject) => {
      const tx = db.transaction("p", "readwrite"), store = tx.objectStore("p");
      for (const [key, rec] of list) if (belongs(rec, player)) store.delete(key);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    }); } finally { db.close(); }
  }
  async function remove(keys) {
    const s = snapshot();
    for (const [key, rec] of await rows()) if (keys.includes(key) && belongs(rec, s.player)) {
      await write(key, { ...rec, photoId: rec.photoId || newId(), generation: generation(rec, s.epoch), deleted: true, blob: null, photoSynced: false }, () => current(s));
    }
    schedule(0);
  }
  function schedule(delay = 1000) {
    clearTimeout(timer); timer = setTimeout(() => { timer = null; void sync(); }, delay);
  }
  function sync() {
    if (running) { rerun = true; return running; }
    if (api.disabled() || document.hidden) return Promise.resolve();
    running = run().finally(() => { running = null; if (rerun) { rerun = false; schedule(0); } });
    return running;
  }
  async function run() {
    const s = snapshot(); let changed = false;
    const request = (path, options = {}) => api.request(path, { ...options, headers: { ...s.headers, ...options.headers }, signal: AbortSignal.timeout(30000) });
    try {
      setStatus({ state: "syncing", pending: 0 });
      const response = await request("api/photos");
      if (!response.ok) throw new Error("Photothèque indisponible");
      const manifest = await response.json();
      if (!current(s)) return;
      if (manifest.resetAt !== s.epoch) { api.onReset?.(); return; }
      const remote = new Map(manifest.photos.map((p) => [p.id, p]));
      const local = (await rows()).filter(([, rec]) => belongs(rec, s.player) && generation(rec, s.epoch) >= s.epoch);
      setStatus({ state: "syncing", pending: local.filter(([, r]) => !r.photoSynced).length });
      for (const [key, original] of local) {
        if (!current(s) || document.hidden) return;
        const rec = original.photoId ? original : await identify(key, s);
        if (!rec) continue;
        const existing = remote.get(rec.photoId);
        if (existing?.deleted) {
          if (rec.deleted && rec.photoSynced) continue;
          await write(key, { ...rec, deleted: true, blob: null, photoSynced: true }, (latest) => current(s) && latest?.photoId === rec.photoId); changed = true; continue;
        }
        if (rec.deleted && rec.photoSynced) continue;
        if (!rec.deleted && existing && rec.photoSynced) continue;
        if (!rec.deleted && !rec.blob) continue;
        const uploaded = await request(rec.deleted ? "api/photos/" + rec.photoId : "api/photos", {
          method: rec.deleted ? "DELETE" : "POST",
          body: JSON.stringify(rec.deleted ? { resetAt: s.epoch } : {
            resetAt: s.epoch,
            photo: { id: rec.photoId, photoKey: rec.photoKey, t: rec.t, mont: rec.mont, place: rec.place, lat: rec.lat, lon: rec.lon, near: rec.near, q: rec.q },
            image: await binary64(rec.blob),
          }),
        });
        if (uploaded.status === 409) { api.onReset?.(); throw new Error("Partie modifiée"); }
        if (uploaded.status === 410 && !rec.deleted) {
          await write(key, { ...rec, deleted: true, blob: null, photoSynced: true }, () => current(s)); changed = true; continue;
        }
        if (!uploaded.ok) throw new Error("Envoi de photo interrompu");
        const { photo } = await uploaded.json(); if (!current(s)) return;
        remote.set(photo.id, photo);
        await write(key, { ...rec, photoSynced: true, sha256: photo.sha256 }, (latest) => current(s) && latest?.photoId === rec.photoId && !!latest.deleted === !!rec.deleted);
      }
      const latest = await rows(), localIds = new Set(latest.filter(([, r]) => belongs(r, s.player) && r.blob && !r.deleted).map(([, r]) => r.photoId));
      const pendingDeletedIds = new Set(latest.filter(([, rec]) => belongs(rec, s.player) && rec.deleted).map(([, rec]) => rec.photoId));
      for (const photo of remote.values()) {
        if (!current(s) || document.hidden) return;
        if (photo.deleted) {
          for (const [key, rec] of latest) if (belongs(rec, s.player) && rec.photoId === photo.id && !rec.deleted) {
            await write(key, { ...rec, deleted: true, blob: null, photoSynced: true }, () => current(s)); changed = true;
          }
          continue;
        }
        if (localIds.has(photo.id) || pendingDeletedIds.has(photo.id) || photo.generation !== s.epoch) continue;
        const response = await request("api/photos/" + photo.id);
        if (!response.ok) throw new Error("Réception de photo interrompue");
        const data = await response.arrayBuffer();
        if (await hash(data) !== photo.sha256) throw new Error("Photo reçue incomplète");
        if (!current(s)) return;
        const rec = { ...photo, owner: s.owner, photoId: photo.id, photoSynced: true, blob: new Blob([data], { type: photo.contentType }) };
        await write(s.owner + ":sync:" + photo.id, rec, () => current(s)); changed = true;
      }
      if (current(s)) {
        const pending = (await rows()).filter(([, rec]) => belongs(rec, s.player) && generation(rec, s.epoch) >= s.epoch && !rec.photoSynced && (rec.blob || rec.deleted)).length;
        setStatus({ state: pending ? "syncing" : "ready", pending });
        if (pending) rerun = true;
      }
    } catch (error) {
      if (current(s)) {
        const pending = (await rows().catch(() => [])).filter(([, r]) => belongs(r, s.player) && !r.photoSynced && generation(r, s.epoch) >= s.epoch).length;
        setStatus({ state: "offline", pending });
      }
    } finally { if (changed && current(s)) api.onChange?.(); }
  }
  return { put, get, all, clearPlayer, remove, sync, schedule, status: () => status };
}
