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

  // ----- sound effects, synthesised so they need no files: weapons, deaths, blasts, the sudden death horn, a level-up chime -----
  let noiseBuf = null; const last = {}, SFX_GAP = { clash: .07, twang: .07, die: .09, boom: .15, magic: .1, castle: .25, horn: 1, levelup: .3, trap: .12 };
  const noise = () => { if (noiseBuf) return noiseBuf; const n = ac.sampleRate, b = ac.createBuffer(1, n, n), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return (noiseBuf = b); };
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function burst(t, dur, peak, type, freq, q) { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1; s.connect(f); f.connect(g); g.connect(sfxOut); env(g, t, .004, peak, dur); s.start(t, Math.random() * .5); s.stop(t + dur + .05); }
  function tone(t, dur, peak, type, f0, f1) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur); o.connect(g); g.connect(sfxOut); env(g, t, .005, peak, dur); o.start(t); o.stop(t + dur + .05); }
  let sfxOut = null;
  function sfx(name, vol = 1) {
    if (!ctx() || ac.state !== "running") return; const t = ac.currentTime; if (last[name] && t - last[name] < (SFX_GAP[name] || .05)) return; last[name] = t;
    if (!sfxOut) { sfxOut = ac.createGain(); sfxOut.gain.value = .55; sfxOut.connect(out); }
    const v = Math.max(.05, Math.min(1, vol));
    if (name === "clash") { burst(t, .09, .35 * v, "highpass", 3200, .7); tone(t, .12, .08 * v, "square", 1800 + Math.random() * 500, 1500); }
    else if (name === "twang") { tone(t, .16, .12 * v, "triangle", 520 + Math.random() * 80, 260); burst(t, .05, .08 * v, "bandpass", 2400, 2); }
    else if (name === "die") { burst(t, .22, .3 * v, "lowpass", 600, .8); tone(t, .2, .12 * v, "sine", 160, 70); }
    else if (name === "boom") { burst(t, .7, .55 * v, "lowpass", 380, .7); tone(t, .5, .35 * v, "sine", 90, 38); }
    else if (name === "magic") { tone(t, .35, .1 * v, "sine", 600, 1500); tone(t + .05, .3, .06 * v, "triangle", 1200, 2400); }
    else if (name === "castle") { burst(t, 1.1, .6 * v, "lowpass", 260, .6); tone(t, .9, .4 * v, "sine", 70, 30); burst(t + .15, .8, .2 * v, "bandpass", 900, 1); }
    else if (name === "trap") { burst(t, .12, .3 * v, "bandpass", 1400, 3); tone(t, .1, .12 * v, "square", 300, 120); }
    else if (name === "horn") { [196, 247, 294].forEach((f, i) => { const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain(); o.type = "sawtooth"; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.value = 900; o.connect(fl); fl.connect(g); g.connect(sfxOut); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.09 * v, t + .25); g.gain.setValueAtTime(.09 * v, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7); o.start(t + i * .02); o.stop(t + 1.8); }); }
    else if (name === "levelup") { [523, 659, 784, 1047].forEach((f, i) => tone(t + i * .08, .25, .1 * v, "triangle", f)); }
  }
  // battle drums: while a replay plays and there is no battle track, a low war-drum beat keeps time under the fighting
  let drumNext = 0, drumStep = 0;
  setInterval(() => {
    if (!ac || ac.state !== "running" || TRACKS.battle) return;
    const on = typeof mode !== "undefined" && mode === "replay" && typeof replay !== "undefined" && replay && replay.playing && !replay.reel;
    if (!on) { drumNext = 0; return; }
    if (!sfxOut) { sfxOut = ac.createGain(); sfxOut.gain.value = .55; sfxOut.connect(out); }
    const beat = .3, pat = [1, 0, 0, .6, 1, 0, .5, .4]; if (drumNext < ac.currentTime) drumNext = ac.currentTime + .05;
    while (drumNext < ac.currentTime + .35) { const p = pat[drumStep % 8]; if (p) { tone(drumNext, .32, .22 * p, "sine", drumStep % 8 === 6 ? 120 : 75, 42); burst(drumNext, .08, .05 * p, "lowpass", 900); } drumStep++; drumNext += beat; }
  }, 120);
  return { sync, sfx };
})();
