// Drawing the replay: figures, poses, effects

// spirit wolf: a pixel sprite, black body with a glowing rim in the owner's colour
const WOLF_PX = [
  "..........#..#....",
  "..........####....",
  "...###...#####....",
  "..######.#o###....",
  ".##########.######",
  ".###############.#",
  "..#############...",
  "..#.#.......#.#...",
  "..#.#.......#.#..."], WOLF_LEGS = [["..#.#.......#.#...", "..#.#.......#.#..."], [".#...#.....#...#..", "#...#.......#...#."]];
function drawWolf(cx, by, color) {
  const px = Math.max(2, Math.round(ts * .06)), w = WOLF_PX[0].length * px, h = WOLF_PX.length * px, x0 = Math.round(cx - w / 2), y0 = Math.round(by - h - ts * .02);
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, by, ts * .3, ts * .08, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(cx, y0 + h / 2, 0, cx, y0 + h / 2, w * .75); g.addColorStop(0, hexA(color, .55)); g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, y0 + h / 2, w * .75, 0, 7); ctx.fill(); ctx.restore();
  const fr = Math.floor(((replay && replay.time) || 0) * 7 + cx * .05) & 1, G = WOLF_PX.slice(0, 7).concat(WOLF_LEGS[fr]), bob = fr ? 0 : px * .5; // two-frame trot
  const cell = (r, c) => G[r] && G[r][c] && G[r][c] !== ".";
  for (let i = 0; i < 4; i++) { const ph = (((replay && replay.time) || 0) * 1.3 + i * .25 + cx * .01) % 1; ctx.fillStyle = hexA(color, .7 * (1 - ph)); ctx.fillRect(Math.round(x0 + px * (4 + i * 3.2)), Math.round(y0 - ph * ts * .5), px, px); } // spirit wisps
  G.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === ".") return;
    const edge = !cell(r - 1, c) || !cell(r + 1, c) || !cell(r, c - 1) || !cell(r, c + 1);
    ctx.fillStyle = ch === "o" ? color : edge ? hexA(color, .85) : "#0b0a0e"; ctx.fillRect(x0 + c * px, y0 + r * px - bob, px, px); }));
  return y0 - ts * .05;
}
function drawTotem(cx, by, color) {
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, by, ts * .18, ts * .06, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#8a5a2b"; ctx.strokeStyle = "#1e140c"; ctx.lineWidth = ts * .03;
  ctx.fillRect(cx - ts * .1, by - ts * .7, ts * .2, ts * .7); ctx.strokeRect(cx - ts * .1, by - ts * .7, ts * .2, ts * .7);
  ctx.fillStyle = color; ctx.fillRect(cx - ts * .2, by - ts * .62, ts * .4, ts * .08);
  ctx.fillStyle = "#9cf09c"; ctx.beginPath(); ctx.arc(cx, by - ts * .78, ts * .1, 0, 7); ctx.fill();
  return by - ts * .9;
}
function drawReplay(t) {
  const R = replay.res, fr = R.frames, time = replay.time;
  let i = Math.min(fr.length - 2, Math.max(0, Math.floor(time / FRAME_DT)));
  while (i < fr.length - 2 && fr[i + 1].t <= time) i++;
  while (i > 0 && fr[i].t > time) i--;
  const f0 = fr[i], f1 = fr[i + 1], a = Math.max(0, Math.min(1, (time - f0.t) / ((f1.t - f0.t) || 1)));
  const friendly = pid => pid === R.me || !!((f0.al >> R.order.indexOf(pid)) & 1);
  { const hc = f0.c != null && f0.c >= 0 ? R.colors[R.order[f0.c]] : null; drawCentreRing(t, hc); }
  // your traps until sprung
  R.traps.forEach(tr => { if (tr.pid === R.me && !(tr.usedT && time >= tr.usedT)) drawTrap(ctx, tr.type, tr.x * ts, (tr.y + .05) * ts, ts * .9); });
  const items = [];
  (R.wallMeta || []).forEach((w, wi) => { const hp = f0.w ? f0.w[wi] : w.maxhp; if (hp == null) return; items.push([w.y + .2, () => drawWallTile(ctx, w.y, w.x, w.tier, Math.max(0, hp) / w.maxhp, R.colors[w.pid], t, w.dir)]); });
  const wv = R.waves ? { total: WAVE_COUNT, t: replay.waveT || (replay.waveT = (R.events || []).reduce((o, e) => { if (e.ty === "wave") (o[e.pid] = o[e.pid] || []).push(e.t); return o; }, {})) } : null;
  R.meta.forEach((m, k) => {
    const b = k * 4; if (b >= f0.d.length) return;
    let x = f0.d[b], y = f0.d[b + 1]; const hp = f0.d[b + 2], fl = f0.d[b + 3];
    if (f1.d.length > b && !(f1.d[b + 3] & 1)) { const x1 = f1.d[b], y1 = f1.d[b + 1]; if (Math.hypot(x1 - x, y1 - y) < 1.5) { x += (x1 - x) * a; y += (y1 - y) * a; } }
    const color = R.colors[m.pid], frac = hp / m.maxhp, fr = friendly(m.pid);
    if (m.kind === "castle") { if (replay.sel === k) items.push([m.tile[0] - .01, () => { ctx.strokeStyle = "#ffe082"; ctx.lineWidth = ts * .08; ctx.strokeRect(m.tile[1] * ts + 2, m.tile[0] * ts - ts * .3, ts - 4, ts * 1.25); }]);
      items.push([m.tile[0], () => drawCastle(m.tile[0], m.tile[1], color, t, R.names[m.pid], null, { frac, dead: fl & 1, friendly: fr, waves: wv ? { total: wv.total, left: wv.total - (wv.t[m.pid] || []).filter(x => x <= time).length } : null }, m.banner, m.ctier)]); return; }
    { atkIndex(); const dv = lastDie(k, time); const dead = (fl & 1) || (dv && f1.d.length > b + 3 && (f1.d[b + 3] & 1));
      if (dead) { if (dv && time - dv.t < deathLen(m)) items.push([dv.y - .4 + .3, () => drawDeath(m, k, color, dv, time - dv.t, t)]); return; } }
    const pose = poseOf(k, time, x, y, f0, f1);
    items.push([y - .4, () => {
      const cx = x * ts, by = (y + .45) * ts;
      ctx.save(); if (fl & 8) ctx.globalAlpha = .35;
      let top;
      if (m.kind === "summon") top = drawWolf(cx, by, color);
      else if (m.kind === "totem") top = drawTotem(cx, by, color);
      else {
        if (m.champ) {
          glow(cx, by - ts * .5, ts * 1.0, ts * 1.05, color, .8 + Math.sin(t * 3 + k) * .12);
          ctx.strokeStyle = color; ctx.lineWidth = ts * .06; ctx.beginPath(); ctx.ellipse(cx, by - ts * .05, ts * .36, ts * .13, 0, 0, 7); ctx.stroke();
        }
        if (fl & 4) glow(cx, by - ts * .5, ts * .7, ts * .8, "#ffe082", .7);
        if (pose.flash) glow(cx, by - ts * .5, ts * .6, ts * .7, pose.flash, .6);
        top = drawSprite(m.key, color, cx, by, m.champ ? 1.15 : .95, m.champ ? Object.assign({}, pose, { aura: color }) : m.merc ? Object.assign({}, pose, { aura: "#ffd24a" }) : pose);
      }
      if (fl & 16) { ctx.fillStyle = "rgba(140,200,255,.35)"; ctx.beginPath(); ctx.ellipse(cx, by - ts * .4, ts * .3, ts * .45, 0, 0, 7); ctx.fill(); }
      if (fl & 32) { ctx.strokeStyle = "rgba(127,178,255,.9)"; ctx.lineWidth = ts * .05; ctx.beginPath(); ctx.arc(cx, by - ts * .45, ts * .42, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      const yb = hpBar(cx, top, Math.max(0, Math.min(1, frac)), fr);
      if (m.champ) nameTag(cx, yb - ts * .02, R.names[m.pid], color, (m.lvl || 1) + ((atkIndex(), replay.lvlEv.get(k)) || []).filter(e => e.t <= time).length);
      if (replay.sel === k) { ctx.strokeStyle = "#ffe082"; ctx.lineWidth = ts * .07; ctx.beginPath(); ctx.ellipse(cx, by - ts * .05, ts * .44, ts * .17, 0, 0, 7); ctx.stroke(); }
      if (fl & 2) { ctx.fillStyle = "#ffe082"; for (let s = 0; s < 3; s++) { const an = t * 5 + s * 2.1; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * ts * .22, yb - ts * .1 + Math.sin(an) * ts * .06, ts * .045, 0, 7); ctx.fill(); } }
      ctx.restore();
    }]);
  });
  items.sort((p, q) => p[0] - q[0]).forEach(([, fn]) => fn());
  drawEffects(time);
}
function lastDie(k, time) {
  const arr = replay.dieEv && replay.dieEv.get(k); if (!arr) return null;
  let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid].t <= time) lo = mid + 1; else hi = mid; }
  return lo > 0 ? arr[lo - 1] : null;
}
const deathLen = m => m.kind === "summon" ? .9 : m.kind === "totem" ? .8 : m.key === "cart" ? 1.2 : m.key === "ram" ? 1.5 : m.champ ? 2.4 : 1.6;
// death animations: heroes and soldiers topple and fade as a soul drifts up; rams splinter; carts leave smoke and debris; wolves and totems dissolve
function drawDeath(m, k, color, dv, age, t) {
  const cx = dv.x * ts, by = (dv.y + .45) * ts, L = deathLen(m), flip = !!(replay.face || {})[k], dir = flip ? 1 : -1, cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const fade = cl((L - age) / .6), rnd = (i, s2 = 0) => hash(k * 131 + i, Math.round(dv.t * 10), s2);
  const puff = (st, dur, r0, r1, col, al, ox = 0, oy = 0) => { const p = (age - st) / dur; if (p < 0 || p > 1) return; ctx.fillStyle = hexA(col, al * (1 - p)); ctx.beginPath(); ctx.arc(cx + ox, by - ts * .12 + oy - p * ts * .12, ts * (r0 + (r1 - r0) * p), 0, 7); ctx.fill(); };
  ctx.save();
  if (m.kind === "summon" || m.kind === "totem") {
    const p = cl(age / L); ctx.globalAlpha = 1 - p; ctx.translate(cx, by); ctx.scale(1 - .25 * p, 1 - .5 * p); ctx.translate(-cx, -by);
    if (m.kind === "summon") drawWolf(cx, by, color); else drawTotem(cx, by, color);
    ctx.restore(); ctx.save();
    for (let i = 0; i < 6; i++) { const ph = cl((age - i * .05) / .7); if (ph <= 0 || ph >= 1) continue; ctx.fillStyle = hexA(m.kind === "summon" ? "#bfe3ff" : "#9cf09c", .8 * (1 - ph)); ctx.fillRect(cx + (rnd(i) - .5) * ts * .5 + Math.sin(ph * 6 + i) * ts * .05, by - ts * (.2 + ph * .8), ts * .06, ts * .06); }
    ctx.restore(); return;
  }
  if (m.key === "cart") { // the blast has already gone off: scorch, smoke and flung splinters
    ctx.fillStyle = "rgba(20,12,6," + (.35 * fade) + ")"; ctx.beginPath(); ctx.ellipse(cx, by, ts * .45, ts * .14, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 4; i++) puff(i * .1, .9, .14, .38, "#3a3330", .6, (rnd(i) - .5) * ts * .6, -rnd(i, 3) * ts * .3);
    for (let i = 0; i < 9; i++) { const p = cl(age / .8), an = rnd(i, 1) * 6.283, v = (.5 + rnd(i, 2)) * ts * .9; ctx.fillStyle = hexA(i % 3 ? "#6a4a2c" : "#2a1a10", 1 - p); ctx.fillRect(cx + Math.cos(an) * v * p, by - ts * .3 + Math.sin(an) * v * p * .5 + p * p * ts * .5 - Math.sin(p * 3.14) * ts * .4, ts * .07, ts * .07); }
    ctx.restore(); return;
  }
  if (m.key === "ram") { // shudders, caves in and splinters
    const p = cl((age - .15) / .6), w = ts * .95 * SW / SH, h = ts * .95;
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, by - ts * .02, w * .32, ts * .09, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = fade; ctx.imageSmoothingEnabled = false; ctx.translate(cx + (age < .3 ? Math.sin(age * 90) * ts * .03 : 0), by); ctx.rotate(dir * .22 * p); ctx.scale(1, 1 - .45 * p);
    if (flip) ctx.scale(-1, 1); ctx.drawImage(spr(m.key, color), -w / 2, -h, w, h); ctx.imageSmoothingEnabled = true; ctx.restore(); ctx.save();
    for (let i = 0; i < 8; i++) { const q = cl((age - .1) / 1.0), an = -.3 - rnd(i, 1) * 2.5, v = (.4 + rnd(i, 2)) * ts * .8; ctx.fillStyle = hexA(i % 2 ? "#8a5a2b" : "#5a3f24", 1 - q); ctx.fillRect(cx + Math.cos(an) * v * q, by - ts * .3 + Math.sin(an) * v * q + q * q * ts * .45, ts * .08, ts * .05); }
    for (let i = 0; i < 3; i++) puff(.3 + i * .12, .8, .1, .3, "#8c8478", .5, (rnd(i) - .5) * ts * .6);
    ctx.restore(); return;
  }
  // soldiers and heroes
  const sc = m.champ ? 1.15 : .95, h = ts * sc, w = h * SW / SH, p = cl((age - .1) / .4), ease = 1 + 2 * (p - 1) ** 3 + (p - 1) ** 2;
  ctx.fillStyle = `rgba(0,0,0,${.3 * fade})`; ctx.beginPath(); ctx.ellipse(cx + dir * ease * ts * .2, by - ts * .02, w * (.32 + .25 * ease), ts * .09, 0, 0, 7); ctx.fill();
  if (m.champ && age < .5) { ctx.strokeStyle = hexA(color, .8 * (1 - age / .5)); ctx.lineWidth = ts * .06; ctx.beginPath(); ctx.arc(cx, by - ts * .4, ts * (.3 + age * 2), 0, 7); ctx.stroke(); }
  ctx.globalAlpha = fade; ctx.imageSmoothingEnabled = false;
  ctx.translate(cx + dir * ease * ts * .12 + (age < .12 ? Math.sin(age * 120) * ts * .025 * -dir : 0), by - ease * w * .38);
  ctx.rotate(dir * ease * Math.PI / 2); if (flip) ctx.scale(-1, 1); ctx.drawImage(spr(m.key, color), -w / 2, -h, w, h);
  ctx.imageSmoothingEnabled = true; ctx.restore(); ctx.save();
  if (age < .16) glow(cx, by - ts * .5, ts * .6, ts * .7, "#ffffff", .7 * (1 - age / .16));
  for (let i = 0; i < 3; i++) puff(.35 + i * .06, .55, .08, .24 + i * .04, "#b9ad96", .45, dir * ts * (.15 + i * .2) * 1, -ts * .02);
  const sa = age - .45; if (sa > 0 && sa < 1.4) { const q = sa / 1.4; glow(cx + Math.sin(q * 7 + k) * ts * .08, by - ts * (.3 + q * .9), ts * .16, ts * .2, color, .9 * (1 - q)); ctx.fillStyle = hexA("#ffffff", .7 * (1 - q)); ctx.fillRect(cx + Math.sin(q * 7 + k) * ts * .08 - 1, by - ts * (.3 + q * .9) - 1, 3, 3); }
  ctx.restore();
}
// attack and walk animation: facing, lunge, recoil, cast hop, step bob
function atkIndex() {
  if (replay.atk) return replay.atk;
  const m = new Map(); (replay.res.events || []).forEach(e => { if (e.ty === "atk") { if (!m.has(e.id)) m.set(e.id, []); m.get(e.id).push(e); } });
  const lv = new Map(); (replay.res.events || []).forEach(e => { if (e.ty === "lvl") { if (!lv.has(e.id)) lv.set(e.id, []); lv.get(e.id).push(e); } });
  const dm = new Map(); (replay.res.events || []).forEach(e => { if (e.ty === "die") { if (!dm.has(e.id)) dm.set(e.id, []); dm.get(e.id).push(e); } });
  replay.dieEv = dm; replay.lvlEv = lv; return (replay.atk = m);
}
function poseOf(k, time, x, y, f0, f1) {
  const arr = atkIndex().get(k), o = {}; replay.face = replay.face || {};
  const b = k * 4, moving = f1.d.length > b && !(f1.d[b + 3] & 1) && Math.hypot(f1.d[b] - f0.d[b], f1.d[b + 1] - f0.d[b + 1]) > .02 && Math.hypot(f1.d[b] - f0.d[b], f1.d[b + 1] - f0.d[b + 1]) < 1.5;
  let ev = null, lo = 0;
  if (arr) { let hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid].t <= time) lo = mid + 1; else hi = mid; } if (lo > 0 && time - arr[lo - 1].t < .45) ev = arr[lo - 1]; }
  if (ev && Math.abs(ev.dx) > .05) replay.face[k] = ev.dx < 0; else if (moving && Math.abs(f1.d[b] - f0.d[b]) > .005) replay.face[k] = f1.d[b] < f0.d[b];
  o.flip = !!replay.face[k];
  if (ev) {
    const age = time - ev.t, L = Math.hypot(ev.dx, ev.dy) || 1, ux = ev.dx / L, uy = ev.dy / L;
    if (ev.k === "m" && age < .3) { const p = Math.sin(age / .3 * Math.PI); o.dx = ux * p * ts * .32; o.dy = uy * p * ts * .16; o.sq = 1 - .07 * p; }
    else if (ev.k === "r" && age < .25) { const p = Math.sin(age / .25 * Math.PI); o.dx = -ux * p * ts * .1; o.sq = 1 + .03 * p; }
    else if (ev.k === "c" && age < .5) { const p = Math.sin(age / .5 * Math.PI); o.dy = -p * ts * .16; o.sq = 1 + .05 * p; o.flash = "#ffe9a8"; }
  }
  // sprite frames: wind-up just before a blow, the strike just after it, otherwise a walk cycle while moving
  const nx = arr && arr[lo || 0], age2 = ev ? time - ev.t : 9;
  if (nx && nx.t > time && nx.t - time < .18 && !(ev && age2 < .1)) o.pose = "a1";
  else if (ev && age2 < .2) o.pose = "a2";
  else if (moving) { const sp = Math.hypot(f1.d[b] - f0.d[b], f1.d[b + 1] - f0.d[b + 1]) / ((f1.t - f0.t) || .2); o.pose = "w" + (Math.floor(time * Math.max(3, Math.min(10, sp * 3.2)) + k * 1.3) & 3); }
  if (moving && !o.dy && !o.pose) o.dy = -Math.abs(Math.sin(time * 14 + k * 1.7)) * ts * .045;
  return o;
}
function drawLongFx(time) { // effects that outlast the 2-second window: respawn countdowns and a dropped Rapier
  const E = replay.res.events; if (!replay.longFx) replay.longFx = E.filter(e => e.ty === "respawn" || e.ty === "rapier");
  replay.longFx.forEach(e => {
    if (e.ty === "respawn") {
      if (time < e.t0 || time >= e.t1) return; const left = Math.ceil(e.t1 - time), px = e.x * ts, py = (e.y - 1.25) * ts, col = (replay.res.colors || {})[e.pid] || "#fff";
      ctx.font = `700 ${Math.round(ts * .3)}px Alegreya, Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const w = ts * 1.5, h = ts * .46; ctx.fillStyle = "rgba(30,20,12,.78)"; ctx.fillRect(px - w / 2, py - h / 2, w, h); ctx.fillStyle = col; ctx.fillRect(px - w / 2, py + h / 2 - 3, w * (1 - (e.t1 - time) / (e.t1 - e.t0)), 3);
      ctx.fillStyle = "#f4e6c4"; ctx.fillText("Respawn " + left + "s", px, py - 1); ctx.textAlign = "start";
    } else if (time >= e.t && (e.until == null || time < e.until)) {
      const px = e.x * ts, py = e.y * ts, pulse = .5 + .5 * Math.sin(time * 6);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(px, py, 0, px, py, ts * (.5 + .2 * pulse)); g.addColorStop(0, "rgba(255,220,90,.7)"); g.addColorStop(1, "rgba(255,200,60,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, ts * .7, 0, 7); ctx.fill(); ctx.restore();
      ctx.font = `700 ${Math.round(ts * .5)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#ffd34d"; ctx.strokeStyle = "#1e140c"; ctx.lineWidth = 3; ctx.strokeText("⚔", px, py - ts * .1 - pulse * 3); ctx.fillText("⚔", px, py - ts * .1 - pulse * 3); ctx.textAlign = "start";
    }
  });
}
const SHOT_DUR = { arrow: .28, bullet: .1, orb: .32, spirit: .36, heal: .42, bone: .32 };
// ranged auto-attacks: an arrow in flight, a rifle tracer, an arcane orb, a spirit wisp, healing orbs and a spinning bone shard, each with its own impact
function drawShotFx(e, age) {
  const sk = e.sk, dur = SHOT_DUR[sk] || .25; if (age > dur + .3) return;
  const sc = e.sc || 1, u = ts * sc, x1 = e.x1 * ts, y1 = e.y1 * ts, x2 = e.x2 * ts, y2 = e.y2 * ts, p = Math.min(1, age / dur), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, col = e.c || "#ffffff";
  const arcH = sk === "arrow" ? .12 * L : sk === "heal" ? .2 * L + ts * .15 : sk === "bone" ? .08 * L : 0, q = Math.max(0, (age - dur) / .3);
  const at = pp => [x1 + dx * pp, y1 + dy * pp - arcH * 4 * pp * (1 - pp)], rr = (i, s2 = 0) => hash(Math.round(e.x1 * 40) + i, Math.round(e.y2 * 40) + s2, Math.round(e.t * 10));
  const orbAt = (x, y, r, c, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2); g.addColorStop(0, hexA(c, a)); g.addColorStop(1, hexA(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 7); ctx.fill(); };
  const spark = (x, y, r, c, a) => { ctx.fillStyle = hexA(c, a); ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), Math.max(2, Math.round(r)), Math.max(2, Math.round(r))); };
  ctx.save();
  if (sk === "arrow") {
    if (p < 1) { const [px, py] = at(p), [qx, qy] = at(Math.min(1, p + .03)), ang = Math.atan2(qy - py, qx - px), len = u * .26;
      ctx.translate(px, py); ctx.rotate(ang); ctx.strokeStyle = "rgba(240,230,190,.25)"; ctx.lineWidth = u * .03; ctx.beginPath(); ctx.moveTo(-len * 2, 0); ctx.lineTo(-len, 0); ctx.stroke();
      ctx.strokeStyle = "#c9a46a"; ctx.lineWidth = u * .035; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = "#d7dde2"; ctx.beginPath(); ctx.moveTo(u * .07, 0); ctx.lineTo(-u * .02, -u * .045); ctx.lineTo(-u * .02, u * .045); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = u * .025; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(-len - u * .05, -u * .05); ctx.moveTo(-len, 0); ctx.lineTo(-len - u * .05, u * .05); ctx.stroke();
    } else if (q < 1) { const ang = Math.atan2(dy, dx) + .5; ctx.globalAlpha = 1 - q; ctx.translate(x2, y2); ctx.rotate(ang); ctx.strokeStyle = "#c9a46a"; ctx.lineWidth = u * .035; ctx.beginPath(); ctx.moveTo(-u * .16, 0); ctx.lineTo(0, 0); ctx.stroke(); ctx.rotate(-ang); for (let i = 0; i < 3; i++) spark(Math.cos(i * 2.1) * u * .12 * q, -q * u * .12 + Math.sin(i * 2.1) * u * .05, u * .04, "#e8dcc0", 1 - q); }
  } else if (sk === "bullet") {
    if (p < 1) { const t0 = Math.max(0, p - .55), ax = x1 + dx * t0, ay = y1 + dy * t0, bx = x1 + dx * p, by2 = y1 + dy * p;
      ctx.lineCap = "round"; ctx.strokeStyle = hexA(col, .55); ctx.lineWidth = u * .08; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by2); ctx.stroke();
      ctx.strokeStyle = "#fffbe8"; ctx.lineWidth = u * .035; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by2); ctx.stroke(); }
    if (age < .09) { const f = 1 - age / .09, ang = Math.atan2(dy, dx); ctx.fillStyle = hexA("#fff1a8", f); ctx.translate(x1, y1); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(u * .3, 0); ctx.lineTo(u * .06, -u * .07); ctx.lineTo(0, 0); ctx.lineTo(u * .06, u * .07); ctx.fill(); ctx.beginPath(); ctx.moveTo(u * .14, -u * .12); ctx.lineTo(u * .05, 0); ctx.lineTo(u * .14, u * .12); ctx.lineTo(0, 0); ctx.fill(); }
    else if (age >= dur && q < .6) { const f = 1 - q / .6; ctx.strokeStyle = hexA("#ffe9a0", f); ctx.lineWidth = u * .03; for (let i = 0; i < 6; i++) { const an = i * 1.05 + rr(i) * .5, r0 = u * .04 + q * u * .1, r1 = r0 + u * .1; ctx.beginPath(); ctx.moveTo(x2 + Math.cos(an) * r0, y2 + Math.sin(an) * r0); ctx.lineTo(x2 + Math.cos(an) * r1, y2 + Math.sin(an) * r1); ctx.stroke(); } }
  } else if (sk === "orb") {
    if (p < 1) { const [px, py] = at(p); for (let i = 5; i > 0; i--) { const [tx, ty] = at(Math.max(0, p - i * .06)); spark(tx + (rr(i) - .5) * u * .1, ty + (rr(i, 3) - .5) * u * .1, u * (.05 - i * .005), "#ffffff", .6 - i * .1); }
      const r = u * .09 * (1 + .15 * Math.sin(age * 40)); orbAt(px, py, r, col, .9); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(px, py, r * .55, 0, 7); ctx.fill(); }
    else if (q < 1) { ctx.strokeStyle = hexA(col, 1 - q); ctx.lineWidth = u * .04; ctx.beginPath(); ctx.arc(x2, y2, u * (.08 + q * .3), 0, 7); ctx.stroke(); orbAt(x2, y2, u * .1 * (1 - q), "#ffffff", .8 * (1 - q)); for (let i = 0; i < 6; i++) { const an = i * 1.047 + rr(i) * .6; spark(x2 + Math.cos(an) * u * (.1 + q * .32), y2 + Math.sin(an) * u * (.1 + q * .32), u * .05, col, 1 - q); } }
  } else if (sk === "spirit") {
    if (p < 1) { for (let i = 6; i > 0; i--) { const pp = Math.max(0, p - i * .05), [tx, ty] = at(pp), off = Math.sin(pp * 16 + i) * u * .07; ctx.fillStyle = hexA("#dff3ff", .5 - i * .07); ctx.beginPath(); ctx.arc(tx - dy / L * off, ty + dx / L * off, u * (.07 - i * .008), 0, 7); ctx.fill(); }
      const [px, py] = at(p), r = u * .09; orbAt(px, py, r, col, .8); ctx.fillStyle = "#eaf8ff"; ctx.beginPath(); ctx.arc(px, py, r * .8, 0, 7); ctx.fill(); ctx.fillStyle = "#1a2a44"; ctx.fillRect(px - r * .45, py - r * .2, r * .3, r * .35); ctx.fillRect(px + r * .15, py - r * .2, r * .3, r * .35); }
    else if (q < 1) { orbAt(x2, y2 - q * u * .1, u * .16, col, .6 * (1 - q)); for (let i = 0; i < 4; i++) { ctx.fillStyle = hexA("#eaf8ff", .8 * (1 - q)); ctx.beginPath(); ctx.arc(x2 + (i - 1.5) * u * .1 + Math.sin(q * 6 + i) * u * .03, y2 - q * u * (.25 + i * .06), u * .03, 0, 7); ctx.fill(); } }
  } else if (sk === "heal") {
    const plus = (x, y, r, a) => { ctx.fillStyle = hexA("#d8ffd8", a); ctx.fillRect(x - r / 2, y - r * .18, r, r * .36); ctx.fillRect(x - r * .18, y - r / 2, r * .36, r); };
    if (p < 1) { for (let i = 4; i > 0; i--) { const [tx, ty] = at(Math.max(0, p - i * .07)); plus(tx + (rr(i) - .5) * u * .08, ty, u * (.12 - i * .014), .7 - i * .12); }
      const [px, py] = at(p); orbAt(px, py, u * .08, col, .95); ctx.fillStyle = "#eaffea"; ctx.beginPath(); ctx.arc(px, py, u * .045, 0, 7); ctx.fill(); }
    else if (q < 1) { ctx.strokeStyle = hexA(col, .8 * (1 - q)); ctx.lineWidth = u * .035; ctx.beginPath(); ctx.ellipse(x2, y2 + ts * .3, u * (.15 + q * .25), u * (.06 + q * .1), 0, 0, 7); ctx.stroke(); for (let i = 0; i < 3; i++) plus(x2 + (i - 1) * u * .16, y2 + ts * .2 - q * u * (.4 + i * .08), u * .15, 1 - q); }
  } else if (sk === "bone") {
    if (p < 1) { for (let i = 5; i > 0; i--) { const [tx, ty] = at(Math.max(0, p - i * .06)); ctx.fillStyle = hexA(i % 2 ? "#2a3a2a" : col, .55 - i * .09); ctx.beginPath(); ctx.arc(tx + (rr(i) - .5) * u * .08, ty + (rr(i, 3) - .5) * u * .08, u * (.05 + i * .008), 0, 7); ctx.fill(); }
      const [px, py] = at(p); ctx.translate(px, py); ctx.rotate(age * 26); const bl = u * .22; ctx.fillStyle = "#e9e2cf"; ctx.fillRect(-bl / 2, -u * .022, bl, u * .044); ctx.beginPath(); ctx.arc(-bl / 2, -u * .025, u * .04, 0, 7); ctx.arc(-bl / 2, u * .025, u * .04, 0, 7); ctx.arc(bl / 2, -u * .025, u * .04, 0, 7); ctx.arc(bl / 2, u * .025, u * .04, 0, 7); ctx.fill(); orbAt(0, 0, u * .06, col, .5); }
    else if (q < 1) { for (let i = 0; i < 4; i++) { ctx.fillStyle = hexA(i % 2 ? "#2a3a2a" : col, .6 * (1 - q)); ctx.beginPath(); ctx.arc(x2 + (rr(i) - .5) * u * .3, y2 - q * u * .2 + (rr(i, 4) - .5) * u * .15, u * (.07 + q * .1), 0, 7); ctx.fill(); }
      for (let i = 0; i < 3; i++) { const an = i * 2.1 + rr(i) * 1.5; ctx.fillStyle = hexA("#e9e2cf", 1 - q); ctx.fillRect(x2 + Math.cos(an) * u * .3 * q, y2 + Math.sin(an) * u * .2 * q - Math.sin(q * 3.14) * u * .1, u * .05, u * .03); } }
  }
  ctx.restore();
}
function drawEffects(time) {
  drawLongFx(time);
  const E = replay.res.events;
  for (let i = lowerBound(E, time - 2.2); i < E.length && E[i].t <= time; i++) {
    const e = E[i], age = time - e.t;
    if (e.ty === "shot" && e.sk) { drawShotFx(e, age); continue; }
    if (e.ty === "shot") {
      const dur = e.w > 1 ? .35 : .22; if (age > dur) continue;
      const p = age / dur, x1 = e.x1 * ts, y1 = e.y1 * ts, x2 = e.x2 * ts, y2 = e.y2 * ts;
      if (e.w > 1) { ctx.globalAlpha = 1 - p; ctx.strokeStyle = e.c; ctx.lineWidth = ts * .05 * e.w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 1; }
      else {
        const px = x1 + (x2 - x1) * p, py = y1 + (y2 - y1) * p, bx = x1 + (x2 - x1) * Math.max(0, p - .25), byy = y1 + (y2 - y1) * Math.max(0, p - .25);
        ctx.strokeStyle = hexA(e.c, .6); ctx.lineWidth = ts * .04; ctx.beginPath(); ctx.moveTo(bx, byy); ctx.lineTo(px, py); ctx.stroke();
        ctx.fillStyle = e.c; ctx.beginPath(); ctx.arc(px, py, ts * .07, 0, 7); ctx.fill();
      }
    } else if (e.ty === "slash") {
      if (age > .2) continue; ctx.strokeStyle = hexA(e.c, 1 - age / .2); ctx.lineWidth = ts * .06;
      ctx.beginPath(); ctx.arc(e.x * ts, e.y * ts, ts * .3, -2.4 + age * 6, -.6 + age * 6); ctx.stroke();
    } else if (e.ty === "lvl") { // golden glow: a warm halo, a rising column of light and drifting sparks
      if (age > 1.5) continue; const p = age / 1.5, fr = replayFrameAt(time), ok = fr && fr.d && fr.d.length > e.id * 4 + 1,
        px = (ok ? fr.d[e.id * 4] : e.x) * ts, py = (ok ? fr.d[e.id * 4 + 1] : e.y) * ts, rr = ts * (.7 + .8 * Math.sin(Math.min(1, p * 1.8) * Math.PI / 2)), fade = 1 - p;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, `rgba(255,232,130,${.8 * fade})`); g.addColorStop(.5, `rgba(255,196,60,${.38 * fade})`); g.addColorStop(1, "rgba(255,180,30,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rr, 0, 7); ctx.fill();
      const ch = ts * 1.9 * Math.min(1, p * 3.5); ctx.fillStyle = `rgba(255,238,160,${.5 * fade})`; ctx.fillRect(px - ts * .2, py - ch, ts * .4, ch);
      for (let s = 0; s < 9; s++) { const a = s * 2.4 + e.id, ph = (p * 1.2 + s * .11) % 1, sx = px + Math.cos(a) * ts * .5 * (.4 + ph), sy = py - ph * ts * 1.6; ctx.fillStyle = `rgba(255,240,170,${.9 * (1 - ph) * fade + .1 * (1 - ph)})`; ctx.fillRect(sx - 2, sy - 2, 4, 4); }
      ctx.restore();
    } else if (e.ty === "aoe") {
      if (age > e.dur) continue; const p = age / e.dur, r = e.r * ts * (.6 + .4 * Math.min(1, p * 3));
      ctx.fillStyle = hexA(e.c, .32 * (1 - p)); ctx.beginPath(); ctx.ellipse(e.x * ts, e.y * ts, r, r * .75, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = hexA(e.c, .9 * (1 - p)); ctx.lineWidth = ts * .05; ctx.stroke();
    } else if (e.ty === "ultfx") { if (age <= e.dur) drawUltFx(ctx, e, age, ts);
    } else if (e.ty === "fuse") { // bomb about to go off: the keep pulses red, faster and brighter as the fuse burns down
      if (age > e.dur) continue; const p = age / e.dur, on = Math.sin(age * (8 + p * 22)) > 0, x = e.x * ts, y = e.y * ts;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const sc = e.sc || 1, rr = ts * (1.3 + .5 * p) * sc, g = ctx.createRadialGradient(x, y - ts * .3, 0, x, y - ts * .3, rr);
      g.addColorStop(0, `rgba(255,50,30,${on ? .75 : .2})`); g.addColorStop(1, "rgba(255,40,20,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - ts * .3, rr, 0, 7); ctx.fill(); ctx.restore();
      if (on) { ctx.fillStyle = "rgba(255,30,20,.35)"; ctx.fillRect(x - ts * .9 * sc, y - ts * 1.2 * sc, ts * 1.8 * sc, ts * 1.5 * sc); }
    } else if (e.ty === "warn") {
      if (age > e.dur) continue; ctx.setLineDash([ts * .15, ts * .1]); ctx.strokeStyle = hexA(e.c, .5 + .4 * Math.sin(age * 12)); ctx.lineWidth = ts * .06;
      ctx.beginPath(); ctx.ellipse(e.x * ts, e.y * ts, e.r * ts, e.r * ts * .75, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = hexA(e.c, .12); ctx.fill();
    } else if (e.ty === "spell") {
      drawSpellFx(e, age);
    } else if (e.ty === "txt") {
      if (age > 1) continue; const big = /^\d+$/.test(e.s);
      ctx.font = `700 ${Math.round(ts * (big ? .34 : .26))}px Alegreya, Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.globalAlpha = 1 - age; ctx.lineWidth = ts * .06; ctx.strokeStyle = "#1e140c";
      const y = (e.y - age * .6) * ts; ctx.strokeText(e.s, e.x * ts, y); ctx.fillStyle = e.c; ctx.fillText(e.s, e.x * ts, y);
      ctx.globalAlpha = 1; ctx.textAlign = "start";
    }
  }
}
