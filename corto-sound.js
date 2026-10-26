// La rencontre avec Corto ne joue que le vent pendant les pages de la tempête.
export function createCortoSoundtrack() {
  const wind = new Audio("audio/corto-wind.mp3");
  wind.loop = true;
  wind.preload = "auto";
  wind.volume = 0;
  let timer = null, page = 0, muted = false;
  try { muted = localStorage.getItem("vq_corto_sound_muted") === "1"; } catch {}

  const pause = () => { wind.pause(); wind.currentTime = 0; };
  const fade = (target, duration = 450) => {
    clearInterval(timer);
    if (document.hidden) { pause(); return; }
    const from = wind.volume, started = performance.now();
    timer = setInterval(() => {
      const step = Math.min(1, (performance.now() - started) / duration);
      wind.volume = Math.max(0, Math.min(1, from + (target - from) * step));
      if (step === 1) { clearInterval(timer); timer = null; if (target === 0) pause(); }
    }, 40);
  };
  const scene = (index) => {
    page = index;
    if (muted) return;
    if (index === 1 || index === 2) {
      if (wind.paused) { wind.currentTime = 0; wind.play().catch(() => {}); }
      fade(.28, 600);
    } else fade(0);
  };
  const onVisibilityChange = () => {
    if (document.hidden) { clearInterval(timer); timer = null; pause(); }
    else if (!muted) scene(page);
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  return {
    get muted() { return muted; },
    scene,
    toggle() {
      muted = !muted;
      try { localStorage.setItem("vq_corto_sound_muted", muted ? "1" : "0"); } catch {}
      if (muted) fade(0, 200);
      else scene(page);
      return muted;
    },
    stop() { document.removeEventListener("visibilitychange", onVisibilityChange); clearInterval(timer); timer = null; pause(); },
  };
}
