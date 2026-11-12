const rivalLabel = rv => { const b = bountyMap()[rv.id]; return (isLive() && rv.lvl ? `${rv.name} · Lv ${rv.lvl}` : rv.name) + (b ? ` · ♛${b}g` : ""); }; // a rival's hero level as it stood at the end of the last battle
// Drawing each frame and the animation loop

function drawCentreRing(t, color) {
  const x = MID, y = MID, R = CTR_R * ts, c = ctx; c.save();
  c.globalAlpha = .13 + Math.sin(t * 2) * .03; c.fillStyle = color || "#e2b33c"; c.beginPath(); c.ellipse(x, y, R, R * .78, 0, 0, 7); c.fill();
  c.globalAlpha = color ? .9 : .5; c.strokeStyle = color || "#e2b33c"; c.lineWidth = ts * .06; c.setLineDash([ts * .22, ts * .16]); c.lineDashOffset = -t * ts * .5; c.beginPath(); c.ellipse(x, y, R, R * .78, 0, 0, 7); c.stroke(); c.restore();
}
let dragPc = null;
function wallRefAt(r, q, except) {
  for (const w of (S.walls || [])) { if (w.id === except) continue; const k = placedAt(w.id); if (!k) continue; const [rr, cc] = k.split(",").map(Number); if (wallTiles(rr, cc, w.dir).some(([a, b]) => a === r && b === q)) return w.id; }
  return null;
}
function wallFree(r, c, dir, ref) {
  return wallTiles(r, c, dir).every(([a, b]) => { const k = `${a},${b}`; if (!zoneSet.has(k)) return false; if (S.place[k] && S.place[k] !== ref) return false; return !wallRefAt(a, b, ref); });
}
function draw(t) {
  if (!bg) return;
  if (camTarget) {
    const k = .18; cam.x += (camTarget.x - cam.x) * k; cam.y += (camTarget.y - cam.y) * k; cam.z += (camTarget.z - cam.z) * k;
    if (Math.abs(camTarget.z - cam.z) < .002 && Math.abs(camTarget.x - cam.x) < .5 && Math.abs(camTarget.y - cam.y) < .5) { Object.assign(cam, camTarget); camTarget = null; }
    clampCam();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#1c2e16"; ctx.fillRect(0, 0, cvs.width, cvs.height);
  const k = dpr * cam.z; ctx.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(bg, 0, 0, W, W);
  if (!(mode === "replay" && replay)) drawCentreRing(t, null);
  drawFlag(ctx, MID, MID + ts * .1, ts * .55, ts * .95, "#c9962f", t);
  if (mode === "replay" && replay) { drawReplay(t); if (replay.reel) drawReel(); return; }
  const lift = dragPc && dragPc.active ? dragPc.ref : sel;
  if (lift) {
    const pulse = .25 + Math.sin(t * 5) * .12, wl = findWall(lift);
    zoneSet.forEach(k => { const [r, q] = k.split(",").map(Number);
      if (wl) { if (!wallFree(r, q, wl.dir, lift)) return; }
      else if (wallRefAt(r, q) || (S.place[k] && S.place[k] !== lift && !(dragPc && dragPc.active))) return;
      ctx.fillStyle = `rgba(255,224,130,${pulse})`; ctx.fillRect(q * ts + 2, r * ts + 2, ts - 4, ts - 4); });
  }
  if (dragPc && dragPc.active) {
    const wl = findWall(dragPc.ref), hr = Math.floor(dragPc.wy / ts) - dragPc.off[0], hq = Math.floor(dragPc.wx / ts) - dragPc.off[1];
    const ok = wl ? wallFree(hr, hq, wl.dir, dragPc.ref) : zoneSet.has(`${hr},${hq}`) && !wallRefAt(hr, hq);
    ctx.strokeStyle = ok ? "#9cf09c" : "#ff8a7a"; ctx.lineWidth = ts * .07;
    (wl ? wallTiles(hr, hq, wl.dir) : [[hr, hq]]).forEach(([a, b]) => ctx.strokeRect(b * ts + 3, a * ts + 3, ts - 6, ts - 6));
  }
  if (S.phase === "orders" && S.lists) drawOrderArrows(t);
  // everything that stands on the map, drawn back to front
  const items = [];
  RIVALS.forEach(rv => items.push([rv.pos[0], () => drawCastle(rv.pos[0], rv.pos[1], rv.color, t, rivalLabel(rv), S.lists ? (bucketOf(rv.id) === "neutral" ? null : bucketOf(rv.id)) : null, null, rv.banner, rv.ctier || 1)]));
  items.push([CASTLE[0], () => drawCastle(CASTLE[0], CASTLE[1], MY_COLOR, t, isLive() ? MY_NAME : "You", null, null, S.banner, S.castle || 1)]);
  RWALLS.forEach(w => { const rv = RIVALS.find(x => x.id === w.rid); if (!rv) return; wallTiles(w.r, w.c, w.dir).forEach(([a, b]) => items.push([a + .2, () => drawWallTile(ctx, a, b, rv.ctier || 1, 1, rv.color, t, w.dir)])); });
  if (seeArmies()) RARMY.forEach(u => {
    const rv = RIVALS.find(x => x.id === u.rid), friendly = (S.diplo[u.rid] || {}).rel === "ally";
    items.push([u.r + .1, () => drawFigure(u.key, rv.color, u.r, u.c, u.champ, u.hp, friendly, t, { ring: sheet && sheet.type === "rival" && sheet.id === u.rid, name: u.champ ? rivalLabel(rv) : null, lvl: u.champ ? null : u.lvl })]);
  });
  const ghost = dragPc && dragPc.active ? dragPc.ref : null, Wg = (ref, fn) => ref === ghost ? () => { ctx.save(); ctx.globalAlpha = .35; fn(); ctx.restore(); } : fn;
  Object.entries(S.place).forEach(([key, ref]) => {
    const [r, q] = key.split(",").map(Number), ring = (sheet && sheet.id === ref) || sel === ref;
    if (ref === "champ") items.push([r + .1, Wg(ref, () => drawFigure("c-" + S.cls, MY_COLOR, r, q, true, 1, true, t, { ring, name: myName(), lvl: level(), items: S.items }))]);
    else if (findUnit(ref)) { const u = findUnit(ref); items.push([r + .1, Wg(ref, () => drawFigure(u.type, MY_COLOR, r, q, false, u.hp ?? 1, true, t, { ring, lvl: u.lvl }))]); }
    else if (findWall(ref)) { const w = findWall(ref); wallTiles(r, q, w.dir).forEach(([a, b]) => items.push([a + .2, Wg(ref, () => { drawWallTile(ctx, a, b, Math.min(3, S.castle || 1), 1, MY_COLOR, t, w.dir); if (ring) { ctx.strokeStyle = "#ffe082"; ctx.lineWidth = ts * .06; ctx.strokeRect(b * ts + 3, a * ts + ts * .2, ts - 6, ts * .66); } })])); }
    else if (findTrap(ref)) items.push([r, Wg(ref, () => {
      if (ring) { ctx.strokeStyle = "#ffe082"; ctx.lineWidth = ts * .06; ctx.beginPath(); ctx.ellipse((q + .5) * ts, (r + .62) * ts, ts * .4, ts * .18, 0, 0, 7); ctx.stroke(); }
      drawTrap(ctx, findTrap(ref).type, (q + .5) * ts, (r + .55) * ts, ts * .9);
    })]);
  });
  items.sort((a, b) => a[0] - b[0]).forEach(([, fn]) => fn());
  if (dragPc && dragPc.active && !findWall(dragPc.ref) && !findTrap(dragPc.ref)) {
    ctx.save(); ctx.globalAlpha = .85; const u = findUnit(dragPc.ref), isC = dragPc.ref === "champ";
    drawFigure(isC ? "c-" + S.cls : u.type, MY_COLOR, dragPc.wy / ts - .45, dragPc.wx / ts - .5, isC, 1, true, t, {}); ctx.restore();
  }
}
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
function loop(ms) { tickReplay(ms); draw(still ? 0 : ms / 1000); requestAnimationFrame(loop); }
