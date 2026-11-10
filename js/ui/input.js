// Map input: tap, drag, pinch, wheel and keys

// ----- map input: tap, drag to pan, pinch or wheel to zoom -----
function tapAt(clientX, clientY) {
  const rc = cvs.getBoundingClientRect();
  const wx = cam.x + (clientX - rc.left) / cam.z, wy = cam.y + (clientY - rc.top) / cam.z;
  if (mode === "replay") { pickInReplay(wx / ts, wy / ts); return; }
  const q = Math.floor(wx / ts), r = Math.floor(wy / ts);
  if (r < 0 || q < 0 || r >= N || q >= N) return;
  const key = `${r},${q}`, near = sel ? null : pieceNear(wx / ts, wy / ts);
  if (!near && r === CASTLE[0] && q === CASTLE[1]) { sel = null; S.phase = "muster"; open("castle"); return; }
  const rv = near ? null : RIVALS.find(x => x.pos[0] === r && x.pos[1] === q) || RIVALS.find(x => RARMY.some(u => u.rid === x.id && u.r === r && u.c === q));
  if (rv) { sel = null; open("rival", rv.id); return; }
  if (isCentre(r, q) && !sel && !near) { toast("The centre hill. Hold it for bonus points."); return; }
  const pn = sel ? null : pieceNear(wx / ts, wy / ts);
  if (!inZone(r, q) && !wallRefAt(r, q) && !pn) { if (sel) toast("You can only deploy inside your fenced field."); return; }
  const wref = wallRefAt(r, q), here = pn || S.place[key] || wref;
  if (sel) {
    if (S.locked) return;
    const wl = findWall(sel);
    if (wl) { if (!wallFree(r, q, wl.dir, sel)) { toast("That tile isn't free."); return; } }
    else { if (wref) { toast("A wall stands there."); return; } if (here && here !== sel) { toast("Someone already holds that ground."); return; } }
    const old = placedAt(sel); if (old) delete S.place[old];
    S.place[key] = sel; sel = null; render(); return;
  }
  if (here && S.phase === "orders") { if (here === "champ" || findUnit(here)) open("uorder", here); return; }
  if (S.phase === "orders") return;
  if (here) { open(here === "champ" ? "champ" : findUnit(here) ? "unit" : findWall(here) ? "wall" : "trap", here); return; }
  if (S.locked) return;
  if (unplaced().length) open("deploy", key); else toast("The barracks are empty. Recruit more at your castle.");
}
const ptrs = new Map(); let drag = null, pinch = null, moved = false;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function pieceNear(tx, ty) { // the placed piece closest to a point (in tiles), measured from the middle of its sprite so a finger on the head still counts
  let best = null, bd = Math.max(.62, 30 / (ts * cam.z));
  Object.entries(S.place).forEach(([k, ref]) => { if (findWall(ref)) return; const [r, c] = k.split(",").map(Number), dd = Math.hypot(tx - (c + .5), ty - (r + .42)); if (dd < bd) { bd = dd; best = ref; } });
  return best || wallRefAt(Math.floor(ty), Math.floor(tx)) || S.place[`${Math.floor(ty)},${Math.floor(tx)}`] || null;
}
function worldOf(clientX, clientY) { const rc = cvs.getBoundingClientRect(); return [cam.x + (clientX - rc.left) / cam.z, cam.y + (clientY - rc.top) / cam.z]; }
function dropPiece(dp, r, q) {
  const ref = dp.ref, wl = findWall(ref), nr = r - dp.off[0], nq = q - dp.off[1];
  if (wl) { if (!wallFree(nr, nq, wl.dir, ref)) { toast("The wall doesn't fit there."); return; } const old = placedAt(ref); if (old) delete S.place[old]; S.place[`${nr},${nq}`] = ref; return; }
  const key = `${r},${q}`; if (!zoneSet.has(key) || wallRefAt(r, q)) { toast("Drop it inside your field."); return; }
  const other = S.place[key]; if (other === ref) return;
  if (other && findWall(other)) { toast("A wall stands there."); return; }
  const old = placedAt(ref); if (old) delete S.place[old]; if (other && old) S.place[old] = other; S.place[key] = ref;
}
cvs.addEventListener("pointerdown", e => {
  cvs.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); camTarget = null;
  dragPc = null;
  if (ptrs.size === 1 && mode === "plan" && !S.locked && !sel && !sheet) {
    const [wx, wy] = worldOf(e.clientX, e.clientY), r = Math.floor(wy / ts), q = Math.floor(wx / ts), ref = pieceNear(wx / ts, wy / ts);
    if (ref) { const k = placedAt(ref), [cr, cc] = k.split(",").map(Number); dragPc = { ref, active: false, sx: e.clientX, sy: e.clientY, wx, wy, off: findWall(ref) ? [r - cr, q - cc] : [0, 0] }; }
  }
  if (ptrs.size === 1) { moved = false; drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; }
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: dist(a, b) || 1, z: cam.z }; moved = true; }
});
cvs.addEventListener("pointermove", e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const rc = cvs.getBoundingClientRect();
  if (dragPc && ptrs.size === 1) {
    if (!dragPc.active && Math.hypot(e.clientX - dragPc.sx, e.clientY - dragPc.sy) > 10) { dragPc.active = true; moved = true; drag = null; }
    if (dragPc.active) { [dragPc.wx, dragPc.wy] = worldOf(e.clientX, e.clientY); return; }
  }
  if (ptrs.size >= 2 && pinch) {
    const [a, b] = [...ptrs.values()];
    if (replay) replay.auto = false;
    zoomAt((a.x + b.x) / 2 - rc.left, (a.y + b.y) / 2 - rc.top, pinch.z * dist(a, b) / pinch.d);
  } else if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) > 14) moved = true;
    if (moved && replay) replay.auto = false;
    if (moved) { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; clampCam(); }
  }
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return;
  if (dragPc) { const dp = dragPc; dragPc = null; if (dp.active) { if (e.type === "pointerup") { const [wx, wy] = worldOf(e.clientX, e.clientY); dropPiece(dp, Math.floor(wy / ts), Math.floor(wx / ts)); sanitizePlace(); render(); } ptrs.delete(e.pointerId); drag = null; pinch = null; return; } }
  const single = ptrs.size === 1; ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (ptrs.size === 1) { const p = [...ptrs.values()][0]; drag = { x: p.x, y: p.y, cx: cam.x, cy: cam.y }; }
  if (ptrs.size === 0) { drag = null; if (single && !moved && e.type === "pointerup") tapAt(e.clientX, e.clientY); }
}
cvs.addEventListener("pointerup", endPtr);
cvs.addEventListener("pointercancel", endPtr);
cvs.addEventListener("wheel", e => {
  e.preventDefault(); camTarget = null;
  const rc = cvs.getBoundingClientRect(); zoomAt(e.clientX - rc.left, e.clientY - rc.top, cam.z * Math.exp(-e.deltaY * .0015));
}, { passive: false });
cvs.addEventListener("keydown", e => {
  const step = 40 / cam.z;
  if (e.key === "ArrowLeft") cam.x -= step; else if (e.key === "ArrowRight") cam.x += step;
  else if (e.key === "ArrowUp") cam.y -= step; else if (e.key === "ArrowDown") cam.y += step;
  else if (e.key === "+" || e.key === "=") zoomAt(vw / 2, vh / 2, cam.z * 1.25);
  else if (e.key === "-") zoomAt(vw / 2, vh / 2, cam.z / 1.25);
  else return;
  e.preventDefault(); clampCam();
});
