// The battlefield canvas: background, castles, figures, order arrows

// ================= map drawing =================
const cvs = document.getElementById("map"), ctx = cvs.getContext("2d");
const ts = T;
let dpr = 1, bg = null, vw = 300, vh = 300;
const cam = { x: 0, y: 0, z: 1 }; let camTarget = null;
const nearCastle = (r, c) => castleTiles.some(([R, Cc]) => Math.abs(R - r) <= 1 && Math.abs(Cc - c) <= 1);
const isCentre = (r, c) => Math.abs(r - CENTRE) <= 1 && Math.abs(c - CENTRE) <= 1;

function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function glow(x, y, rx, ry, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, hexA(color, a)); g.addColorStop(.55, hexA(color, a * .45)); g.addColorStop(1, hexA(color, 0));
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, 7); ctx.fill(); ctx.restore();
}

function pine(c, x, y, s, k) {
  c.fillStyle = "#4a2f17"; c.fillRect(x - s * .06, y - s * .12, s * .12, s * .2);
  const greens = k > .5 ? ["#1f4a24", "#2c5e2c", "#3a7434"] : ["#24502a", "#2f6331", "#447d3a"];
  [[.62, .5], [.48, .38], [.34, .26]].forEach(([h, w], i) => {
    c.fillStyle = greens[i]; c.beginPath();
    c.moveTo(x, y - s * (h + .2)); c.lineTo(x + s * w / 2 + s * .08, y - s * (h - .28 + i * .02)); c.lineTo(x - s * w / 2 - s * .08, y - s * (h - .28 + i * .02)); c.closePath(); c.fill();
  });
}
function oak(c, x, y, s) {
  c.fillStyle = "#5a3a1e"; c.fillRect(x - s * .07, y - s * .25, s * .14, s * .3);
  [["#2f5a26", 0, -.42, .3], ["#3c6e2e", -.18, -.36, .22], ["#3c6e2e", .18, -.36, .22], ["#4f8a3a", -.06, -.5, .2], ["#5f9a44", .08, -.54, .1]].forEach(([col, dx, dy, r]) => {
    c.fillStyle = col; c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); c.fill();
  });
}
function paintBackground() {
  const res = Math.min(dpr, 2), b = document.createElement("canvas"); b.width = b.height = Math.round(W * res);
  const c = b.getContext("2d"); c.scale(res, res);
  for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
    const v = hash(r, q); c.fillStyle = `hsl(${92 + v * 10}, ${36 + v * 8}%, ${32 + v * 6}%)`; c.fillRect(q * ts, r * ts, ts + 1, ts + 1);
  }
  for (let i = 0; i < N * N * 9; i++) {
    const x = hash(i, 1, 3) * W, y = hash(i, 2, 5) * W, v = hash(i, 3, 7);
    c.strokeStyle = v > .5 ? "rgba(30,60,20,.45)" : "rgba(150,190,90,.35)"; c.lineWidth = ts * .03;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + ts * .04, y - ts * .1); c.stroke();
    if (v > .985) { c.fillStyle = v > .993 ? "#f2e7a0" : "#f4f0f0"; c.beginPath(); c.arc(x, y, ts * .04, 0, 7); c.fill(); }
  }
  [["#7d6440", .5], ["#a8895a", .36], ["#b99a68", .2]].forEach(([col, w]) => {
    c.strokeStyle = col; c.lineWidth = ts * w; c.lineCap = "round";
    castleTiles.forEach(([r, q]) => { c.beginPath(); c.moveTo((q + .5) * ts, (r + .5) * ts); c.lineTo(MID, MID); c.stroke(); });
  });
  c.fillStyle = "#b99a68"; c.beginPath(); c.arc(MID, MID, ts * 1.3, 0, 7); c.fill();
  c.strokeStyle = "rgba(90,70,40,.5)"; c.lineWidth = ts * .05; c.beginPath(); c.arc(MID, MID, ts * 1.3, 0, 7); c.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + .2, x = MID + Math.cos(a) * ts * 1.1, y = MID + Math.sin(a) * ts * 1.1;
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(x, y + ts * .05, ts * .13, ts * .06, 0, 0, 7); c.fill();
    c.fillStyle = "#8f8b82"; c.fillRect(x - ts * .09, y - ts * .32, ts * .18, ts * .36);
    c.fillStyle = "#a9a59b"; c.fillRect(x - ts * .09, y - ts * .32, ts * .07, ts * .36);
  }
  // your deployment field: tinted tiles with a dashed fence along its outer edge
  zoneSet.forEach(k => { const [r, q] = k.split(",").map(Number);
    c.fillStyle = "rgba(255,236,170,.10)"; c.fillRect(q * ts, r * ts, ts, ts);
    c.strokeStyle = "rgba(255,236,170,.18)"; c.lineWidth = 1; c.strokeRect(q * ts + .5, r * ts + .5, ts - 1, ts - 1);
    c.strokeStyle = "#6b4527"; c.lineWidth = ts * .06; c.setLineDash([ts * .18, ts * .1]);
    [[-1, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 1], [0, -1, 0, 0, 0, 1], [0, 1, 1, 0, 1, 1]].forEach(([dr, dc, x0, y0, x1, y1]) => {
      if (zoneSet.has(`${r + dr},${q + dc}`) || (r + dr === CASTLE[0] && q + dc === CASTLE[1])) return;
      c.beginPath(); c.moveTo((q + x0) * ts, (r + y0) * ts); c.lineTo((q + x1) * ts, (r + y1) * ts); c.stroke(); });
    c.setLineDash([]); });
  for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
    if (nearCastle(r, q) || isCentre(r, q) || roadTiles.has(`${r},${q}`) || inZone(r, q) || occupied.has(`${r},${q}`)) continue;
    const ring = Math.min(r, q, N - 1 - r, N - 1 - q) === 0, v = hash(r, q, 11);
    if (v < (ring ? .8 : .36)) {
      const n = v < .18 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = (q + .3 + hash(r, q, 20 + i) * .4) * ts, y = (r + .75 + hash(r, q, 30 + i) * .2) * ts;
        c.fillStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.ellipse(x, y, ts * .28, ts * .1, 0, 0, 7); c.fill();
        hash(r, q, 40 + i) > .45 ? pine(c, x, y, ts, hash(r, q, 50)) : oak(c, x, y, ts);
      }
    } else if (v > .93) {
      const x = (q + .5) * ts, y = (r + .6) * ts;
      c.fillStyle = "#7e7a70"; c.beginPath(); c.ellipse(x, y, ts * .18, ts * .12, 0, 0, 7); c.fill();
      c.fillStyle = "#9b978c"; c.beginPath(); c.ellipse(x - ts * .04, y - ts * .03, ts * .1, ts * .06, 0, 0, 7); c.fill();
    }
  }
  return b;
}

function drawFlag(c, x, y, w, h, color, t, em) {
  c.strokeStyle = "#3a2614"; c.lineWidth = ts * .04;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h); c.stroke();
  c.fillStyle = color; c.beginPath(); c.moveTo(x, y - h);
  for (let i = 0; i <= 6; i++) c.lineTo(x + w * i / 6, y - h + Math.sin(t * 4 + i * .9) * h * .06 * (i / 6));
  for (let i = 6; i >= 0; i--) c.lineTo(x + w * i / 6, y - h * .62 + Math.sin(t * 4 + i * .9) * h * .06 * (i / 6));
  c.closePath(); c.fill(); c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 1; c.stroke();
  if (em && em !== "none") { const ex = x + w * .5, ey = y - h * .81 + Math.sin(t * 4 + 3) * h * .03, es = h * .14, dark = lumOf(color) > .5;
    c.save(); c.fillStyle = dark ? "#1e140c" : "#f4ead0"; c.strokeStyle = dark ? "#f4ead0" : "#1e140c"; c.lineWidth = Math.max(1, ts * .015); c.beginPath(); emblemPath(c, em, ex, ey, es); c.stroke(); c.fill(); c.restore(); }
}
function drawCastle(r, q, color, t, label, rel, st, ban, tier) {
  const cx = (q + .5) * ts, by = (r + .88) * ts, w = ts * 1.05;
  const stone = "#a39d8f", dark = "#6f6a5f", light = "#bdb7a9";
  tier = tier || 1;
  if (st && st.dead) {
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(cx, by, w * .62, ts * .16, 0, 0, 7); ctx.fill();
    [[-.38, .18, .3], [-.1, .3, .26], [.2, .22, .34], [.4, .14, .22], [0, .12, .5]].forEach(([dx, h, ww], i) => { ctx.fillStyle = i % 2 ? "#6f6a5f" : "#8a857a"; ctx.fillRect(cx + dx * ts - ww * ts / 2, by - h * ts, ww * ts, h * ts); });
    ctx.fillStyle = "#3a2614"; ctx.fillRect(cx - ts * .3, by - ts * .55, ts * .05, ts * .4);
    for (let i = 0; i < 3; i++) { const a = (t * .6 + i / 3) % 1; ctx.fillStyle = `rgba(70,64,58,${.45 * (1 - a)})`; ctx.beginPath(); ctx.arc(cx + Math.sin(i * 2 + t) * ts * .1, by - ts * (.4 + a * .9), ts * (.12 + a * .2), 0, 7); ctx.fill(); }
  } else {
  glow(cx, by - ts * .45, ts * 1.25, ts * .95, color, .5 + Math.sin(t * 2 + q) * .1);
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, by, w * .62, ts * .14, 0, 0, 7); ctx.fill();
  if (tier >= 2) { const cw = w * (tier >= 3 ? 1.55 : 1.35); ctx.fillStyle = dark; ctx.fillRect(cx - cw / 2, by - ts * .3, cw, ts * .3); ctx.fillStyle = light; for (let i = 0; i < 7; i++) ctx.fillRect(cx - cw / 2 + i * cw / 7 + 1, by - ts * .38, cw / 14, ts * .09); [-1, 1].forEach(sd => { ctx.fillStyle = stone; ctx.fillRect(cx + sd * cw / 2 - ts * .08, by - ts * .5, ts * .16, ts * .5); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx + sd * cw / 2 - ts * .11, by - ts * .5); ctx.lineTo(cx + sd * cw / 2 + ts * .11, by - ts * .5); ctx.lineTo(cx + sd * cw / 2, by - ts * .68); ctx.fill(); }); }
  ctx.fillStyle = stone; ctx.fillRect(cx - w / 2, by - ts * .5, w, ts * .5);
  ctx.fillStyle = light; for (let i = 0; i < 5; i++) ctx.fillRect(cx - w / 2 + i * w / 5, by - ts * .58, w / 10, ts * .08);
  ctx.fillStyle = dark; ctx.fillRect(cx - w / 2, by - ts * .06, w, ts * .06);
  ctx.fillStyle = stone; ctx.fillRect(cx - ts * .22, by - ts * .85, ts * .44, ts * .4);
  ctx.fillStyle = light; for (let i = 0; i < 3; i++) ctx.fillRect(cx - ts * .22 + i * ts * .17, by - ts * .92, ts * .1, ts * .08);
  [-1, 1].forEach(sd => {
    const tx = cx + sd * w * .46;
    ctx.fillStyle = stone; ctx.fillRect(tx - ts * .13, by - ts * .72, ts * .26, ts * .72);
    ctx.fillStyle = dark; ctx.fillRect(tx - ts * .03, by - ts * .55, ts * .06, ts * .1);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(tx - ts * .17, by - ts * .72); ctx.lineTo(tx + ts * .17, by - ts * .72); ctx.lineTo(tx, by - ts * 1.02); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 1; ctx.stroke();
  });
  ctx.fillStyle = "#3a2614"; ctx.beginPath(); ctx.moveTo(cx - ts * .1, by); ctx.lineTo(cx - ts * .1, by - ts * .2); ctx.arc(cx, by - ts * .2, ts * .1, Math.PI, 0); ctx.lineTo(cx + ts * .1, by); ctx.fill();
  if (tier >= 3) { ctx.fillStyle = "#e2b33c"; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.arc(cx + sd * w * .46, by - ts * 1.04, ts * .05, 0, 7); ctx.fill(); }); ctx.fillRect(cx - w / 2, by - ts * .52, w, ts * .035); }
  paintBanner(ctx, ban ? { ...ban, c1: color } : { ...defaultBanner(), c1: color }, color, cx - ts * .14, by - ts * .84, ts * .28, ts * .36);
  drawFlag(ctx, cx, by - ts * .9, ts * .32, ts * .38, color, t + q, ban && ban.em);
  if (!st) { drawSprite("guard", color, cx + ts * .78, by + ts * .02, .62); }
  if (st) {
    const bw = ts * 1.1, bh = ts * .12, bx = cx - bw / 2, byy = by - ts * 1.42;
    ctx.fillStyle = "rgba(20,12,6,.9)"; ctx.fillRect(bx - 2, byy - 2, bw + 4, bh + 4);
    ctx.fillStyle = st.friendly ? "#47b04b" : "#d4402f"; ctx.fillRect(bx, byy, bw * Math.max(0, st.frac), bh);
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(bx, byy, bw * Math.max(0, st.frac), bh * .35);
  }
  }
  if (label) {
    ctx.font = `700 ${Math.round(ts * .28)}px Alegreya, Georgia, serif`;
    const tw = ctx.measureText(label).width + ts * (rel ? .45 : .2), ly = by + ts * .08;
    ctx.fillStyle = "#ecdcb4"; ctx.strokeStyle = "#3e2714"; ctx.lineWidth = ts * .03;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - tw / 2, ly, tw, ts * .34, ts * .06) : ctx.rect(cx - tw / 2, ly, tw, ts * .34); ctx.fill(); ctx.stroke();
    let tx = cx - tw / 2 + ts * .1;
    if (rel) { ctx.fillStyle = rel === "ally" ? "#47b04b" : "#d4402f"; ctx.beginPath(); ctx.arc(tx + ts * .1, ly + ts * .17, ts * .09, 0, 7); ctx.fill(); tx += ts * .25; }
    ctx.fillStyle = "#3a2614"; ctx.textBaseline = "middle"; ctx.textAlign = "start"; ctx.fillText(label, tx, ly + ts * .18);
  }
}
function drawTrap(c, type, x, y, s) {
  if (type === "spike") {
    c.fillStyle = "#3a2614"; c.beginPath(); c.ellipse(x, y + s * .1, s * .32, s * .16, 0, 0, 7); c.fill();
    c.fillStyle = "#c7ccd1"; [-.16, 0, .16].forEach(dx => { c.beginPath(); c.moveTo(x + dx * s - s * .06, y + s * .14); c.lineTo(x + dx * s, y - s * .14); c.lineTo(x + dx * s + s * .06, y + s * .14); c.fill(); });
  } else if (type === "snare") {
    c.strokeStyle = "#c9a46a"; c.lineWidth = s * .07; c.beginPath(); c.ellipse(x, y + s * .06, s * .26, s * .13, 0, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(x + s * .24, y + s * .02); c.quadraticCurveTo(x + s * .38, y - s * .2, x + s * .2, y - s * .3); c.stroke();
  } else {
    c.fillStyle = "#e2b33c"; c.beginPath(); c.moveTo(x - s * .22, y + s * .16); c.quadraticCurveTo(x - s * .2, y - s * .28, x, y - s * .28); c.quadraticCurveTo(x + s * .2, y - s * .28, x + s * .22, y + s * .16); c.closePath(); c.fill();
    c.strokeStyle = "#7a5a10"; c.lineWidth = s * .04; c.stroke();
    c.fillStyle = "#7a5a10"; c.beginPath(); c.arc(x, y + s * .2, s * .06, 0, 7); c.fill();
  }
}
function drawSprite(key, color, cx, by, scale, o) {
  const s = spr(key, color), h0 = ts * scale, w = h0 * SW / SH; o = o || {};
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, by - ts * .02, w * .32, ts * .09, 0, 0, 7); ctx.fill();
  const h = h0 * (o.sq || 1), x = cx + (o.dx || 0), y = by + (o.dy || 0);
  ctx.imageSmoothingEnabled = false;
  if (o.flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(s, -w / 2, y - h, w, h); ctx.restore(); } else ctx.drawImage(s, x - w / 2, y - h, w, h);
  ctx.imageSmoothingEnabled = true;
  return y - h + ts * .12; // top of the figure (sprite has headroom for hats)
}
function hpBar(cx, top, frac, friendly) {
  const w = ts * .62, h = ts * .09, x = cx - w / 2, y = top - h - ts * .04;
  ctx.fillStyle = "rgba(20,12,6,.9)"; ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
  ctx.fillStyle = friendly ? "#47b04b" : "#d4402f"; ctx.fillRect(x, y, w * frac, h);
  ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(x, y, w * frac, h * .35);
  return y;
}
function nameTag(cx, y, text, color, lvl) {
  if (!text) return;
  ctx.font = `700 ${Math.round(ts * .2)}px Alegreya, Georgia, serif`;
  const w = ctx.measureText(text).width + ts * .26, h = ts * .26, x = cx - w / 2, yy = y - h - ts * .03;
  ctx.fillStyle = "rgba(30,20,12,.82)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, yy, w, h, h / 2) : ctx.rect(x, yy, w, h); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + h * .5, yy + h / 2, h * .22, 0, 7); ctx.fill();
  ctx.fillStyle = "#ecdcb4"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, cx + h * .18, yy + h / 2 + 1); ctx.textAlign = "start";
  if (lvl) { // gold level badge on the left end of the tag
    const br = h * .62, bx = x - br * .25, by2 = yy + h / 2;
    ctx.fillStyle = "#e2b33c"; ctx.beginPath(); ctx.arc(bx, by2, br, 0, 7); ctx.fill(); ctx.strokeStyle = "#3e2714"; ctx.lineWidth = Math.max(1, ts * .03); ctx.stroke();
    ctx.fillStyle = "#3e2714"; ctx.font = `800 ${Math.round(ts * (lvl > 9 ? .17 : .21))}px Alegreya, Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(lvl), bx, by2 + 1); ctx.textAlign = "start";
  }
}
function drawFigure(key, color, r, q, isChamp, frac, friendly, t, extra) {
  const cx = (q + .5) * ts, by = (r + .95) * ts;
  if (isChamp) {
    glow(cx, by - ts * .4, ts * .75, ts * .75, color, .55 + Math.sin(t * 3 + q) * .12);
    ctx.strokeStyle = color; ctx.lineWidth = ts * .06; ctx.beginPath(); ctx.ellipse(cx, by - ts * .05, ts * .36, ts * .13, 0, 0, 7); ctx.stroke();
  }
  if (extra && extra.ring) { ctx.strokeStyle = "#ffe082"; ctx.lineWidth = ts * .06; ctx.beginPath(); ctx.ellipse(cx, by - ts * .05, ts * .42, ts * .16, 0, 0, 7); ctx.stroke(); }
  const top = drawSprite(key, color, cx, by, isChamp ? 1.15 : .95);
  const y = hpBar(cx, top, frac, friendly);
  if (extra && extra.name) nameTag(cx, y - ts * .02, extra.name, color, isChamp ? extra.lvl : null);
  if (extra && extra.lvl && !(isChamp && extra.name)) {
    const bx = cx + ts * .43, byy = y + ts * .045;
    ctx.fillStyle = "#ecdcb4"; ctx.beginPath(); ctx.arc(bx, byy, ts * .13, 0, 7); ctx.fill(); ctx.strokeStyle = "#3e2714"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#3e2714"; ctx.font = `700 ${Math.round(ts * .2)}px Alegreya, Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(extra.lvl, bx, byy + 1); ctx.textAlign = "start";
  }
}

function arrow(x1, y1, x2, y2, color, w, alpha, t) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ex = x2 - ux * ts * .7, ey = y2 - uy * ts * .7;
  const mx = (x1 + ex) / 2 - uy * L * .12, my = (y1 + ey) / 2 + ux * L * .12;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
  ctx.setLineDash([ts * .3, ts * .2]); ctx.lineDashOffset = -t * ts * .8;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke(); ctx.setLineDash([]);
  const ax = ex - mx, ay = ey - my, AL = Math.hypot(ax, ay) || 1, bx = ax / AL, by = ay / AL;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(ex + bx * w * 2.2, ey + by * w * 2.2); ctx.lineTo(ex - by * w * 1.8, ey + bx * w * 1.8); ctx.lineTo(ex + by * w * 1.8, ey - bx * w * 1.8); ctx.fill();
  ctx.restore();
}
function drawOrderArrows(t) {
  const [zx, zy] = zoneCentre(), tgt = id => RIVALS.find(r => r.id === id), hd = S.strategy ? S.strategy.heading : "near";
  // where the army heads: their hero or their castle, per the Strategy tab
  const aim = r => { if (hd === "hero") { const h = RARMY.find(u => u.rid === r.id && u.champ); if (h) return [(h.c + .5) * ts, (h.r + .5) * ts]; } return [(r.pos[1] + .5) * ts, (r.pos[0] + .3) * ts]; };
  if (hd === "centre") { const cx = (CENTRE + .5) * ts; arrow(zx, zy, cx, cx, MY_COLOR, ts * .12, .9, t); return; }
  const order = previewOrder().map(tgt).filter(Boolean);
  if (order[0]) { const [ax, ay] = aim(order[0]);
    Object.entries(S.place).forEach(([k, ref]) => { if (!(findUnit(ref) || ref === "champ") || S.uorders[ref]) return; const [rr, qq] = k.split(",").map(Number); arrow((qq + .5) * ts, (rr + .5) * ts, ax, ay, MY_COLOR, ts * .035, .28, t); }); }
  order.slice(0, 2).forEach((r, i) => { const [ax, ay] = aim(r); arrow(zx, zy, ax, ay, MY_COLOR, ts * (i ? .07 : .12), i ? .45 : .9, t); });
  Object.entries(S.uorders).forEach(([ref, o]) => { const r = tgt(o), k = placedAt(ref); if (!r || !k) return; const [rr, qq] = k.split(",").map(Number);
    arrow((qq + .5) * ts, (rr + .5) * ts, (r.pos[1] + .5) * ts, (r.pos[0] + .3) * ts, "#ffe082", ts * .06, .8, t); });
}
