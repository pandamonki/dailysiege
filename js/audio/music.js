// Background music. render() calls MUSIC.sync() after every change of screen.
//
// Plays through the Web Audio API rather than an <audio> element: one AudioContext unlocked by the
// first tap keeps working for the rest of the session. Tracks are files listed in tracks.js.
//
// Only the title theme (Banner Rising) survived in the original page, so it plays on the title screen
// and while planning, and fades out during battle replays. Add "planning" and "battle" tracks to
// tracks.js and they are picked up automatically.
const MUSIC = (() => {
  const VOL = 0.45, FADE = 0.8; // seconds
  let ac = null, out = null, current = null, playing = null; // playing = { key, src, gain }
  const buffers = {}, decoding = {};

  function want() {
    if (typeof mode !== "undefined" && mode === "replay") return TRACKS.battle ? "battle" : null;
    if (typeof sheet !== "undefined" && sheet && sheet.type === "title") return "title";
    return TRACKS.planning ? "planning" : "title";
  }

  function ctx() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC(); out = ac.createGain(); out.gain.value = 1; out.connect(ac.destination);
    return ac;
  }

  function decode(key) {
    if (buffers[key] || decoding[key]) return decoding[key] || Promise.resolve(buffers[key]);
    const src = TRACKS[key];
    const bytes = src.startsWith("data:")
      ? Promise.resolve().then(() => { const bin = atob(src.slice(src.indexOf(",") + 1)), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; })
      : fetch(src).then(r => { if (!r.ok) throw new Error("music " + r.status); return r.arrayBuffer(); }); // a real file: downloaded once, then kept by the browser
    // callback form as well as the promise, for older Safari
    return decoding[key] = bytes.then(buf => new Promise((res, rej) => {
      const p = ac.decodeAudioData(buf, b => { buffers[key] = b; res(b); }, rej);
      if (p && p.catch) p.catch(rej);
    })).catch(e => { delete decoding[key]; throw e; }); // a failed download can be tried again later
  }

  function stop(fade = true) {
    if (!playing) return;
    const { src, gain } = playing, t = ac.currentTime;
    gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + (fade ? FADE : 0.05));
    try { src.stop(t + (fade ? FADE : 0.05) + 0.05); } catch (e) {}
    playing = null;
  }

  async function start(key) {
    const buf = await decode(key).catch(() => null);
    if (!buf || current !== key || (playing && playing.key === key)) return;
    stop();
    const src = ac.createBufferSource(), gain = ac.createGain();
    src.buffer = buf; src.loop = true; src.connect(gain); gain.connect(out);
    const t = ac.currentTime; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(VOL, t + FADE);
    src.start(t); playing = { key, src, gain };
  }

  function sync() {
    if (typeof TRACKS === "undefined" || !ctx()) return;
    current = want();
    if (!current || !TRACKS[current]) { stop(); return; }
    if (playing && playing.key === current) return;
    if (ac.state === "running") start(current); else decode(current).catch(() => {}); // ready for the first tap
  }

  // Browsers keep audio suspended until the player interacts. Every tap tries to resume until it works.
  function unlock() {
    if (!ctx()) return;
    const go = () => { if (ac.state === "running") { ["pointerdown", "touchend", "click", "keydown"].forEach(ev => removeEventListener(ev, unlock, true)); sync(); } };
    if (ac.state !== "running") ac.resume().then(go, () => {}); else go();
  }
  ["pointerdown", "touchend", "click", "keydown"].forEach(ev => addEventListener(ev, unlock, true));
  // pause with the tab hidden, carry on when it comes back
  document.addEventListener("visibilitychange", () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume().then(sync, () => {}); });

  return { sync };
})();
