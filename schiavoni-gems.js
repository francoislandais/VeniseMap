// Positions sur les ponts piétons voisins (données OpenStreetMap déjà présentes dans bridges.json).
export const SCHIAVONI_GEMS = [
  { id: "schiavoni-amethyste", name: "L’améthyste de la Scuola", short: "L’améthyste", key: "o:schiavoni:amethyste", img: "img/objets/schiavoni-amethyste.svg", lat: 45.43613, lon: 12.34592, bridge: "Ponte de la Comenda", color: "#d3a2f5" },
  { id: "schiavoni-emeraude", name: "L’émeraude de la Scuola", short: "L’émeraude", key: "o:schiavoni:emeraude", img: "img/objets/schiavoni-emeraude.svg", lat: 45.43697, lon: 12.34597, bridge: "Ponte de la Corte Nova", color: "#93efc5" },
  { id: "schiavoni-saphir", name: "Le saphir de la Scuola", short: "Le saphir", key: "o:schiavoni:saphir", img: "img/objets/schiavoni-saphir.svg", lat: 45.43555, lon: 12.34618, bridge: "Ponte de Sant’Antonin", color: "#a7d5ff" },
];

export function createSchiavoniGems(api) {
  const records = new Map();
  let collecting = false;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const animate = (el, frames, options) => el.animate(frames, options).finished.catch(() => {});
  function update() {
    for (const gem of SCHIAVONI_GEMS) {
      let record = records.get(gem.id);
      const available = api.ready() && !api.owned(gem, api.player());
      if (!available) {
        if (record && !record.busy) { record.marker.remove(); records.delete(gem.id); }
        continue;
      }
      if (!record) {
        const el = document.createElement("button"); el.type = "button"; el.className = "schiavoni-gem-marker";
        el.style.setProperty("--gem-color", gem.color);
        const img = new Image(); img.src = gem.img; img.alt = ""; img.draggable = false; el.appendChild(img);
        const marker = new api.Marker({ element: el, anchor: "center", subpixelPositioning: true }).setLngLat([gem.lon, gem.lat]).addTo(api.map);
        el.setAttribute("aria-label", `Ramasser ${gem.short.toLocaleLowerCase("fr")} — 50 points`);
        el.title = `${gem.short} · ${gem.bridge} · 50 points`;
        record = { el, img, marker, busy: false }; records.set(gem.id, record);
        el.addEventListener("pointerdown", (event) => event.stopPropagation());
        el.addEventListener("click", (event) => { event.stopPropagation(); collect(gem); });
      }
      if (!record.busy) record.el.hidden = api.map.getZoom() < 13.5;
      record.el.style.setProperty("--gem-size", Math.round(Math.min(60, Math.max(36, 38 * 1.3 ** (api.map.getZoom() - 15)))) + "px");
    }
  }
  async function collect(gem) {
    const record = records.get(gem.id), player = api.player();
    if (!record || collecting || record.busy || !api.ready() || api.owned(gem, player) || !api.mapVisible()) return;
    collecting = record.busy = true;
    record.el.classList.add("is-searching"); record.el.setAttribute("aria-busy", "true");
    api.armSound();
    let ghost, orbit, turn, frame;
    const samePlayer = () => player === api.player() && !document.hidden;
    try {
      if (!reduced()) {
        const started = performance.now();
        turn = record.img.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 900, iterations: Infinity });
        const accelerate = (now) => { turn.playbackRate = Math.min(7, 1 + (now - started) / 400); frame = requestAnimationFrame(accelerate); };
        frame = requestAnimationFrame(accelerate);
      }
      const [fix] = await Promise.all([api.fix(), wait(700)]);
      cancelAnimationFrame(frame); turn?.cancel();
      record.el.classList.remove("is-searching");
      if (!samePlayer() || !record.el.isConnected) return;
      if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lon) || !Number.isFinite(fix.acc) || fix.acc > 80) { api.noGps(); return; }
      const distance = api.distance(fix.lat, fix.lon, gem.lat, gem.lon);
      if (distance > 35 + Math.min(fix.acc, 20)) { api.tooFar(gem, distance); return; }
      const from = record.img.getBoundingClientRect(), sx = from.left + from.width / 2, sy = from.top + from.height / 2;
      const cx = innerWidth / 2, cy = innerHeight * .45, size = Math.min(240, innerWidth * .66, innerHeight * .43);
      ghost = record.img.cloneNode(); ghost.className = "schiavoni-gem-bloom";
      ghost.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;--gem-color:${gem.color}`;
      record.img.style.visibility = "hidden"; document.body.appendChild(ghost);
      orbit = document.createElement("div"); orbit.className = "schiavoni-gem-orbit";
      orbit.style.cssText = `left:${cx}px;top:${cy}px;--gem-radius:${size * .52}px;--gem-color:${gem.color}`;
      orbit.setAttribute("aria-hidden", "true");
      orbit.innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14}deg;--delay:${-i * .19}s">${i % 3 ? "✦" : "✧"}</i>`).join("");
      document.body.appendChild(orbit); api.playSound();
      try { navigator.vibrate?.([50, 35, 80]); } catch {}
      await animate(ghost, [
        { transform: `translate(${sx - cx}px,${sy - cy}px) scale(${from.width / size}) rotate(-12deg)`, opacity: .6 },
        { transform: "scale(1.06) rotate(8deg)", opacity: 1, offset: .8 },
        { transform: "scale(1) rotate(0deg)", opacity: 1 },
      ], { duration: reduced() ? 200 : 850, easing: "cubic-bezier(.2,.7,.2,1)" });
      await wait(reduced() ? 150 : 1100);
      if (!samePlayer() || api.owned(gem, player)) return;
      api.claim(gem, player); // clé persistée avant le départ vers le livre : aucune double attribution.
      api.stars(cx, cy, 50);
      const target = document.querySelector("#home-btn"), to = target?.getBoundingClientRect();
      if (to) {
        target.classList.add("olive-book-target");
        try {
          const dx = to.left + to.width / 2 - cx, dy = to.top + to.height / 2 - cy;
          await animate(ghost, [{ transform: "scale(1)", opacity: 1 }, { transform: `translate(${dx * .35}px,${dy * .35 - 35}px) scale(.7) rotate(90deg)`, opacity: 1, offset: .45 }, { transform: `translate(${dx}px,${dy}px) scale(.08) rotate(300deg)`, opacity: 0 }], { duration: reduced() ? 240 : 1250, easing: "ease-in-out", fill: "forwards" });
        } finally { target.classList.remove("olive-book-target"); }
      }
      if (samePlayer()) api.collected(gem);
    } catch (error) {
      console.warn("Collecte de la gemme de la Scuola", error);
      if (samePlayer()) api.retry();
    } finally {
      cancelAnimationFrame(frame); turn?.cancel(); ghost?.remove(); orbit?.remove();
      record.img.style.visibility = ""; record.el.classList.remove("is-searching"); record.el.removeAttribute("aria-busy");
      collecting = record.busy = false; update();
    }
  }
  api.map.on("zoom", update);
  return { update };
}
