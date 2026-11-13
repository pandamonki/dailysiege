// Auto camera and replay controls

// auto camera: stay on your hero, cut to the keep while it is under attack, then follow the hero back out
const AUTO_ZOOM_STEP = 1.35;
// how far the viewer has zoomed the auto camera from its own framing; it starts one step zoomed out
function autoZoomMul() { if (replay.zmul == null) replay.zmul = 1 / AUTO_ZOOM_STEP; return replay.zmul; }
function autoZoomBy(k) { const b = replay.zbase || 1.7; replay.zmul = Math.max(minZoom() / b, Math.min(2.4 / b, autoZoomMul() * k)); }
function autoCam() {
  const R = replay.res, f = replayFrameAt(replay.time); if (!f) return;
  if (replay.hi == null) { replay.hi = R.meta.findIndex(m => m.pid === R.me && m.kind === "champ"); replay.ci = R.meta.findIndex(m => m.pid === R.me && m.kind === "castle"); }
  const hb = replay.hi * 4, cb = replay.ci * 4, f0 = replayFrameAt(Math.max(0, replay.time - 3));
  const castleAlive = replay.ci >= 0 && f.d[cb + 2] > 0, heroDown = replay.hi < 0 || (f.d[hb + 3] & 1);
  const hit = castleAlive && f0.d[cb + 2] - f.d[cb + 2] >= 1, mode = hit ? "base" : heroDown ? (castleAlive ? "base" : "field") : "hero";
  let x, y, z = 1.7;
  if (mode === "base") { x = f.d[cb]; y = f.d[cb + 1]; z = 1.35; } else if (mode === "hero") { x = f.d[hb]; y = f.d[hb + 1]; } else { x = y = 0; z = 0; }
  if (z) { replay.zbase = z; z *= autoZoomMul(); } // the viewer's own zoom is kept on top of the camera's, so zooming does not break the auto camera
  if (mode === "field") { flyTo(W / 2, W / 2, 0); } else if (mode !== replay.camMode) { const zz = Math.max(minZoom(), Math.min(2.4, z)); camTarget = null; Object.assign(cam, { x: x * ts - vw / 2 / zz, y: (y - .3) * ts - vh / 2 / zz, z: zz }); clampCam(); }
  else flyTo(x * ts, (y - .3) * ts, z);
  replay.camMode = mode;
}
function buildReplayUI() {
  const d = replay.res.duration;
  document.getElementById("rbar").innerHTML = `
    <div class="rctl">
      <button class="btn small wood" data-act="rplay" id="rplay" aria-label="Play or pause">❚❚</button>
      <button class="btn small" data-act="rspeed" id="rspeed" aria-label="Playback speed">1×</button>
      <button class="btn small" data-act="rauto" id="rauto" aria-label="Auto camera">Auto</button>
      <input type="range" id="rscrub" min="0" max="${d.toFixed(1)}" step="0.1" value="0" aria-label="Battle time">
      <span class="rtime" id="rtime">0:00</span>
      <button class="btn small" data-act="rreport">Report</button>
      ${isLive() ? "" : `<button class="btn small" data-act="lab">Stats</button>`}
      <button class="btn small wax" data-act="rexit">Leave</button>
    </div>
    <ol class="ticker" id="ticker"></ol>`;
  replay.logN = -1; updateReplayUI();
}
function updateReplayUI() {
  if (!replay) return;
  replay.time = Math.max(0, Math.min(replay.res.duration, replay.time));
  const el = document.getElementById("rtime"); if (!el) return;
  el.textContent = `${fmt(replay.time)} / ${fmt(replay.res.duration)}`;
  const sc = document.getElementById("rscrub"); if (document.activeElement !== sc) sc.value = replay.time.toFixed(1);
  document.getElementById("rplay").textContent = replay.playing ? "❚❚" : "▶";
  document.getElementById("rspeed").textContent = replay.speed + "×";
  { const ra = document.getElementById("rauto"); if (ra) { ra.textContent = replay.auto ? (replay.camMode === "base" ? "Auto: keep" : "Auto: hero") : "Auto off"; ra.className = "btn small" + (replay.auto ? " wood" : ""); } }
  const L = replay.res.logs, n = lowerBound(L, replay.time + 1e-6);
  if (n !== replay.logN) {
    replay.logN = n;
    document.getElementById("ticker").innerHTML = L.slice(Math.max(0, n - 1), n).reverse().map((l, j) => `<li class="${l.kind}${j ? "" : " new"}"><span>${fmt(l.t)}</span>${esc(l.msg)}</li>`).join("");
  }
  updateInspector();
  let big = null; for (let j = n - 1; j >= 0; j--) { if (replay.time - L[j].t > 2.8) break; if (L[j].kind === "big") { big = L[j]; break; } }
  const bn = document.getElementById("banner");
  if (big) { bn.textContent = big.msg; bn.hidden = false; } else bn.hidden = true;
}
