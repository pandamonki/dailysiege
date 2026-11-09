// Drawing the replay: figures, poses, effects

function drawWolf(cx, by, color) {
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, by, ts * .3, ts * .08, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#c9d6e3"; ctx.strokeStyle = "#1e140c"; ctx.lineWidth = ts * .03;
  ctx.beginPath(); ctx.ellipse(cx, by - ts * .3, ts * .26, ts * .13, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillRect(cx - ts * .2, by - ts * .25, ts * .06, ts * .24); ctx.fillRect(cx + ts * .12, by - ts * .25, ts * .06, ts * .24);
  ctx.beginPath(); ctx.moveTo(cx + ts * .18, by - ts * .38); ctx.lineTo(cx + ts * .42, by - ts * .44); ctx.lineTo(cx + ts * .36, by - ts * .3); ctx.lineTo(cx + ts * .22, by - ts * .26); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + ts * .24, by - ts * .44); ctx.lineTo(cx + ts * .28, by - ts * .56); ctx.lineTo(cx + ts * .32, by - ts * .43); ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(cx - ts * .08, by - ts * .43, ts * .16, ts * .05);
  return by - ts * .6;
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
  R.traps.forEach(tr => { if (tr.pid === R.me && tr.type !== "bell" && !(tr.usedT && time >= tr.usedT)) drawTrap(ctx, tr.type, tr.x * ts, (tr.y + .05) * ts, ts * .9); });
  const items = [];
  (R.wallMeta || []).forEach((w, wi) => { const hp = f0.w ? f0.w[wi] : w.maxhp; if (hp == null) return; items.push([w.y + .2, () => drawWallTile(ctx, w.y, w.x, w.tier, Math.max(0, hp) / w.maxhp, R.colors[w.pid], t, w.dir)]); });
  R.meta.forEach((m, k) => {
    const b = k * 4; if (b >= f0.d.length) return;
    let x = f0.d[b], y = f0.d[b + 1]; const hp = f0.d[b + 2], fl = f0.d[b + 3];
    if (f1.d.length > b && !(f1.d[b + 3] & 1)) { const x1 = f1.d[b], y1 = f1.d[b + 1]; if (Math.hypot(x1 - x, y1 - y) < 1.5) { x += (x1 - x) * a; y += (y1 - y) * a; } }
    const color = R.colors[m.pid], frac = hp / m.maxhp, fr = friendly(m.pid);
    if (m.kind === "castle") { if (replay.sel === k) items.push([m.tile[0] - .01, () => { ctx.strokeStyle = "#ffe082"; ctx.lineWidth = ts * .08; ctx.strokeRect(m.tile[1] * ts + 2, m.tile[0] * ts - ts * .3, ts - 4, ts * 1.25); }]);
      items.push([m.tile[0], () => drawCastle(m.tile[0], m.tile[1], color, t, R.names[m.pid], null, { frac, dead: fl & 1, friendly: fr }, m.banner, m.ctier)]); return; }
    if (fl & 1) return;
    const pose = poseOf(k, time, x, y, f0, f1);
    items.push([y - .4, () => {
      const cx = x * ts, by = (y + .45) * ts;
      ctx.save(); if (fl & 8) ctx.globalAlpha = .35;
      let top;
      if (m.kind === "summon") top = drawWolf(cx, by, color);
      else if (m.kind === "totem") top = drawTotem(cx, by, color);
      else {
        if (m.champ) {
          glow(cx, by - ts * .4, ts * .75, ts * .75, color, .55 + Math.sin(t * 3 + k) * .12);
          ctx.strokeStyle = color; ctx.lineWidth = ts * .06; ctx.beginPath(); ctx.ellipse(cx, by - ts * .05, ts * .36, ts * .13, 0, 0, 7); ctx.stroke();
        }
        if (fl & 4) glow(cx, by - ts * .5, ts * .7, ts * .8, "#ffe082", .7);
        if (pose.flash) glow(cx, by - ts * .5, ts * .6, ts * .7, pose.flash, .6);
        top = drawSprite(m.key, color, cx, by, m.champ ? 1.15 : .95, pose);
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
// attack and walk animation: facing, lunge, recoil, cast hop, step bob
function atkIndex() {
  if (replay.atk) return replay.atk;
  const m = new Map(); (replay.res.events || []).forEach(e => { if (e.ty === "atk") { if (!m.has(e.id)) m.set(e.id, []); m.get(e.id).push(e); } });
  const lv = new Map(); (replay.res.events || []).forEach(e => { if (e.ty === "lvl") { if (!lv.has(e.id)) lv.set(e.id, []); lv.get(e.id).push(e); } });
  replay.lvlEv = lv; return (replay.atk = m);
}
function poseOf(k, time, x, y, f0, f1) {
  const arr = atkIndex().get(k), o = {}; replay.face = replay.face || {};
  const b = k * 4, moving = f1.d.length > b && !(f1.d[b + 3] & 1) && Math.hypot(f1.d[b] - f0.d[b], f1.d[b + 1] - f0.d[b + 1]) > .02 && Math.hypot(f1.d[b] - f0.d[b], f1.d[b + 1] - f0.d[b + 1]) < 1.5;
  let ev = null;
  if (arr) { let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid].t <= time) lo = mid + 1; else hi = mid; } if (lo > 0 && time - arr[lo - 1].t < .45) ev = arr[lo - 1]; }
  if (ev && Math.abs(ev.dx) > .05) replay.face[k] = ev.dx < 0; else if (moving && Math.abs(f1.d[b] - f0.d[b]) > .005) replay.face[k] = f1.d[b] < f0.d[b];
  o.flip = !!replay.face[k];
  if (ev) {
    const age = time - ev.t, L = Math.hypot(ev.dx, ev.dy) || 1, ux = ev.dx / L, uy = ev.dy / L;
    if (ev.k === "m" && age < .3) { const p = Math.sin(age / .3 * Math.PI); o.dx = ux * p * ts * .32; o.dy = uy * p * ts * .16; o.sq = 1 - .07 * p; }
    else if (ev.k === "r" && age < .25) { const p = Math.sin(age / .25 * Math.PI); o.dx = -ux * p * ts * .1; o.sq = 1 + .03 * p; }
    else if (ev.k === "c" && age < .5) { const p = Math.sin(age / .5 * Math.PI); o.dy = -p * ts * .16; o.sq = 1 + .05 * p; o.flash = "#ffe9a8"; }
  }
  if (moving && !o.dy) o.dy = -Math.abs(Math.sin(time * 14 + k * 1.7)) * ts * .045;
  return o;
}
function drawEffects(time) {
  const E = replay.res.events;
  for (let i = lowerBound(E, time - 2.2); i < E.length && E[i].t <= time; i++) {
    const e = E[i], age = time - e.t;
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
