// Ambiance de la rencontre : Monteverdi en fond, vent et orage pendant le récit de la tempête.
export function createCortoSoundtrack() {
  const music = new Audio("audio/music/02-long.mp3");
  const wind = new Audio("audio/corto-wind.mp3");
  const thunder = new Audio("audio/corto-thunder.mp3");
  music.loop = true;
  wind.loop = true;
  for (const audio of [music, wind, thunder]) { audio.preload = "auto"; audio.volume = 0; }
  const timers = new Map();
  let page = 0;
  let muted = false;
  try { muted = localStorage.getItem("vq_corto_sound_muted") === "1"; } catch {}

  const fade = (audio, target, duration = 450, pause = false) => {
    clearInterval(timers.get(audio));
    const from = audio.volume, started = performance.now();
    const timer = setInterval(() => {
      const step = Math.min(1, (performance.now() - started) / duration);
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * step));
      if (step === 1) {
        clearInterval(timer); timers.delete(audio);
        if (pause) { audio.pause(); audio.currentTime = 0; }
      }
    }, 40);
    timers.set(audio, timer);
  };
  const play = (audio) => { const started = audio.play(); started?.catch?.(() => {}); };
  const scene = (index, previous = page) => {
    page = index;
    if (muted) return;
    if (index === 0) {
      fade(music, 0, 250, true);
      fade(wind, 0, 250, true);
      fade(thunder, 0, 250, true);
      return;
    }
    const storm = index === 1 || index === 2;
    if (music.paused) play(music);
    fade(music, storm ? .09 : .18, 650);
    if (storm) {
      if (wind.paused) { wind.currentTime = 0; play(wind); }
      fade(wind, .28, 600);
      if (index === 1 && previous !== 1) {
        thunder.currentTime = 0;
        play(thunder);
        fade(thunder, .34, 450);
      }
    } else {
      fade(wind, 0, 450, true);
      fade(thunder, 0, 250, true);
    }
  };
  return {
    get muted() { return muted; },
    scene,
    toggle() {
      muted = !muted;
      try { localStorage.setItem("vq_corto_sound_muted", muted ? "1" : "0"); } catch {}
      if (muted) for (const audio of [music, wind, thunder]) fade(audio, 0, 200, true);
      else scene(page, -1);
      return muted;
    },
    stop() { for (const audio of [music, wind, thunder]) fade(audio, 0, 300, true); },
  };
}
