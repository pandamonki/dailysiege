// Auto camera and replay controls

// auto camera: stay on your hero, cut to the keep while it is under attack, then follow the hero back out
const AUTO_ZOOM_STEP = 1.35;
// how far the viewer has zoomed the auto camera from its own framing; it starts at the camera's regular zoom
const AUTO_ZOOM_START = 1 / (AUTO_ZOOM_STEP * AUTO_ZOOM_STEP); // replays start two zoom steps further out than the camera's framing, so more of the field is in view
function autoZoomMul() { if (replay.zmul == null) replay.zmul = AUTO_ZOOM_START; return replay.zmul; }
function autoZoomBy(k) { const b = replay.zbase || 1.7; replay.zmul = Math.max(minZoom() / b, Math.min(MAX_ZOOM / b, autoZoomMul() * k)); }
function autoCam() {
  const R = replay.res, f = replayFrameAt(replay.time); if (!f) return;
  { const hi = followIdx(); if (replay.hi !== hi) { replay.hi = hi; const fp = hi >= 0 ? R.meta[hi].pid : R.me; replay.ci = R.meta.findIndex(m => m.pid === fp && m.kind === "castle"); replay.camMode = null; } } // the followed hero (your own unless you picked another)
  const hb = replay.hi * 4, cb = replay.ci * 4, f0 = replayFrameAt(Math.max(0, replay.time - 3));
  const castleAlive = replay.ci >= 0 && f.d[cb + 2] > 0, heroDown = replay.hi < 0 || (f.d[hb + 3] & 1);
  const hit = castleAlive && f0.d[cb + 2] - f.d[cb + 2] >= 1, arena = !!(R.sudden && replay.time >= R.sudden.t0);
  // my lord is out of the fight: follow another living hero (the one already followed, else the one nearest the middle), so zoom still works
  const up = i => i >= 0 && R.meta[i] && R.meta[i].kind === "champ" && !(f.d[i * 4 + 3] & 1);
  let fi = -1; if (heroDown && !castleAlive && !arena) { fi = up(replay.fi) ? replay.fi : -1; if (fi < 0) { let bd = 1e9; R.meta.forEach((m, i) => { if (!up(i)) return; const dd = Math.hypot(f.d[i * 4] - N / 2, f.d[i * 4 + 1] - N / 2); if (dd < bd) { bd = dd; fi = i; } }); } replay.fi = fi; }
  const mode = arena ? "arena" : hit ? "base" : heroDown ? (castleAlive ? "base" : fi >= 0 ? "other" : "field") : "hero";
  let x, y, z = 1.7;
  if (mode === "arena") { // the whole arena and every army in one screen
    const E = (R.sudden.r || sdArenaR(R.order.length, false)) + 1, fit = Math.min(vw, vh * .8) / (2 * E * ts); z = Math.max(minZoom(), Math.min(2.6, fit)); x = N / 2; y = N / 2 + .3; } // centred, so the countdown sits over the middle of the arena
  else if (mode === "base") { x = f.d[cb]; y = f.d[cb + 1]; z = 1.35; } else if (mode === "hero") { x = f.d[hb]; y = f.d[hb + 1]; } else if (mode === "other") { x = f.d[fi * 4]; y = f.d[fi * 4 + 1]; } else { x = y = 0; z = 0; }
  if (mode !== "field" && !(Number.isFinite(x) && Number.isFinite(y))) return; // nothing to follow yet (the first frame has no positions)
  if (z) { replay.zbase = z; z *= mode === "arena" ? autoZoomMul() / AUTO_ZOOM_START : autoZoomMul(); } // the arena already fits the whole ring // the viewer's own zoom is kept on top of the camera's, so zooming does not break the auto camera
  if (mode === "field") { flyTo(W / 2, W / 2, 0); } else if (mode !== replay.camMode) { const zz = Math.max(minZoom(), Math.min(MAX_ZOOM, z)); camTarget = null; Object.assign(cam, { x: x * ts - vw / 2 / zz, y: (y - .3) * ts - vh / 2 / zz, z: zz }); clampCam(); }
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
// every lord along the top of the replay: their castle and their hero, each with a health bar. A castle is crossed out when it falls, a hero greys
// out while it is down. Tap a hero to follow it with the camera (and see it in the panel below), tap a castle to look at it.
const CASTLE_SVG = c => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 15V6h2V4h2v2h1V3h2v3h1V4h2v2h2v9H9.5v-3a1.5 1.5 0 0 0-3 0v3z" fill="${c}" stroke="#1e140c" stroke-width="1" stroke-linejoin="round"/></svg>`;
function updateCastleTrack() {
  const el = document.getElementById("ctrack"); if (!el) return;
  if (!replay || mode !== "replay" || replay.reel) { el.hidden = true; replay && (replay.ctKey = null); return; }
  const R = replay.res, f = replayFrameAt(replay.time); if (!f) return;
  if (!replay.ctIdx) replay.ctIdx = R.order.map(pid => [pid, R.meta.findIndex(m => m.pid === pid && m.kind === "castle"), R.meta.findIndex(m => m.pid === pid && m.kind === "champ")]).filter(x => x[1] >= 0);
  const nm = pid => (R.names && R.names[pid]) || (R.results.find(r => r.pid === pid) || {}).name || "";
  const fol = followIdx(), key = R.order.join() + "|" + fol;
  el.hidden = false;
  if (replay.ctKey !== key) { replay.ctKey = key;
    el.innerHTML = replay.ctIdx.map(([pid, ci, hi]) => { const col = (R.colors || {})[pid] || "#888", m = hi >= 0 ? R.meta[hi] : null;
      return `<div class="ctl${pid === R.me ? " me" : ""}" style="--c:${col}">${m ? `<button class="cth${hi === fol ? " on" : ""}" data-act="rfollow" data-v="${hi}" aria-label="Follow ${esc(nm(pid))}'s hero" title="${esc(nm(pid))}"><img alt="" src="${portraitFor(m, col) || spriteURL("c-" + m.cls, col)}"><i class="hb"><b></b></i></button>` : ""}
        <button class="ct" data-act="rlook" data-v="${ci}" aria-label="${esc(nm(pid))}'s castle" title="${esc(nm(pid))}">${CASTLE_SVG(col)}<i class="hb"><b></b></i></button></div>`; }).join(""); }
  const cells = el.children;
  replay.ctIdx.forEach(([pid, ci, hi], j) => { const cell = cells[j]; if (!cell) return;
    const bar = (btn, i) => { if (!btn || i < 0) return; const b = i * 4, hp = b + 2 < f.d.length ? Math.max(0, f.d[b + 2]) : 0, down = b + 3 >= f.d.length || !!(f.d[b + 3] & 1) || hp <= 0;
      btn.classList.toggle("down", down); btn.querySelector("b").style.width = (down ? 0 : Math.min(100, hp / R.meta[i].maxhp * 100)).toFixed(1) + "%"; };
    bar(cell.querySelector(".cth"), hi); bar(cell.querySelector(".ct"), ci); });
}
// the hero the camera follows: the one the viewer picked, else their own
function followIdx() { const R = replay.res; if (replay.follow != null && R.meta[replay.follow] && R.meta[replay.follow].kind === "champ") return replay.follow; return R.meta.findIndex(m => m.pid === R.me && m.kind === "champ"); }
function updateReplayUI() {
  updateCastleTrack();
  if (!replay) return;
  replay.time = Math.max(0, Math.min(replay.res.duration, replay.time));
  const el = document.getElementById("rtime"); if (!el) return;
  el.textContent = `${fmt(replay.time)} / ${fmt(replay.res.duration)}`;
  const sc = document.getElementById("rscrub"); if (document.activeElement !== sc) sc.value = replay.time.toFixed(1);
  document.getElementById("rplay").textContent = replay.playing ? "❚❚" : "▶";
  document.getElementById("rspeed").textContent = replay.speed + "×";
  { const ra = document.getElementById("rauto"); if (ra) { ra.textContent = replay.auto ? (replay.camMode === "base" ? "🎥 Following: keep" : replay.camMode === "arena" ? "🎥 Following: arena" : replay.camMode === "other" ? "🎥 Following the fight" : replay.camMode === "field" ? "🎥 Whole field" : replay.follow != null && replay.res.meta[replay.follow] && replay.res.meta[replay.follow].pid !== replay.res.me ? "🎥 Following " + ((replay.res.names || {})[replay.res.meta[replay.follow].pid] || "hero") : "🎥 Following hero") : "🎥 Follow hero"; ra.className = "btn small" + (replay.auto ? " wood" : ""); } }
  const L = replay.res.logs, n = lowerBound(L, replay.time + 1e-6);
  if (n !== replay.logN) {
    replay.logN = n;
    document.getElementById("ticker").innerHTML = L.slice(Math.max(0, n - 1), n).reverse().map((l, j) => `<li class="${l.kind}${j ? "" : " new"}"><span>${fmt(l.t)}</span>${esc(l.msg)}</li>`).join("");
  }
  updateInspector();
  document.getElementById("banner").hidden = true; // announcements show in the ticker below the map, not over the fighting
}
