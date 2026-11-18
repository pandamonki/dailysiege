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

// ----- pixel-art terrain: trees, bushes, rocks and ground are drawn on tiny canvases (16 pixels to a tile, like the unit sprites) and scaled up with hard edges -----
const TERRAIN_SPR = {};
const vnoise = (x, y, sd) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sm = t => t * t * (3 - 2 * t), a = hash(xi, yi, sd), b = hash(xi + 1, yi, sd), c = hash(xi, yi + 1, sd), d = hash(xi + 1, yi + 1, sd), u = sm(fx), v = sm(fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
function terrainSprite(key, w, h, draw, edge) { // draw(px(x,y,col), rect(x,y,w,h,col)) on a w x h canvas, then a dark edge round the shape (edge: [r, g, b, a], default dark green; null for none)
  if (TERRAIN_SPR[key]) return TERRAIN_SPR[key];
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d");
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); }, rect = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), ww, hh); };
  draw(px, rect, g);
  const src = g.getImageData(0, 0, w, h), d = src.data, out = g.createImageData(w, h); out.data.set(d);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (d[(y * w + x) * 4 + 3]) continue;
    if ([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([a, b]) => a >= 0 && b >= 0 && a < w && b < h && d[(b * w + a) * 4 + 3] > 200)) { const i = (y * w + x) * 4; const ec = edge === undefined ? [30, 52, 26, 170] : edge; if (!ec) continue; out.data[i] = ec[0]; out.data[i + 1] = ec[1]; out.data[i + 2] = ec[2]; out.data[i + 3] = ec[3]; } }
  g.putImageData(out, 0, 0); return (TERRAIN_SPR[key] = cv);
}
const GR = { pine: ["#16361c", "#1f4a26", "#2b6130", "#3c7a3a", "#5c9a4a"], oak: ["#235628", "#2f7234", "#43903d", "#62ae4c", "#93cc62"] };
function pineSprite(v) { // three layered tiers, lit from the top left
  return terrainSprite("pine" + v, 13, 19, (px, rect) => {
    const pal = GR.pine; rect(6, 16, 2, 3, "#4a2f17"); rect(6, 16, 1, 3, "#6e4824");
    [[1, 7, 4], [5, 12, 4], [9, 16, 3]].forEach(([y0, y1, hw0], t) => { const hw1 = hw0 + 2 + (v % 2);
      for (let y = y0; y <= y1; y++) { const f = (y - y0) / (y1 - y0), hw = Math.round(.5 + (hw1 - .5) * f);
        for (let x = -hw; x <= hw; x++) { const lit = x < -hw * .2 ? 3 : x > hw * .35 ? 1 : 2, j = hash(x + t * 7, y + v * 13, 5), k = Math.max(0, Math.min(4, lit + (j > .96 ? 1 : j < .03 ? -1 : 0) + (y === y1 ? -1 : 0)));
          px(6 + x, y, pal[k]); } } });
  });
}
function oakSprite(v) { // a round canopy of overlapping blobs with a highlight on the upper left
  return terrainSprite("oak" + v, 17, 20, (px, rect) => {
    const pal = GR.oak; rect(7, 12, 3, 7, "#4a2f17"); rect(7, 12, 1, 7, "#7a5230"); rect(9, 12, 1, 7, "#33200f");
    const blobs = [[8, 7, 5.5], [5, 9, 3.8], [12, 9, 3.8], [7, 4, 3.8], [11, 5, 3.2]].map(([x, y, r]) => [x + (v ? 1 : 0), y, r]);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 17; x++) { let best = 9, on = false;
      for (const [bx, by, r] of blobs) { const dx = x - bx, dy = y - by, dd = Math.hypot(dx, dy * 1.08); if (dd <= r * (.9 + .16 * hash(Math.round(Math.atan2(dy, dx) * 2), bx + by, 3 + v))) { on = true; best = Math.min(best, dd / r - (-dx - dy) * .03); } }
      if (!on) continue; const j = hash(x, y, 9 + v), k = Math.max(1, Math.min(4, 4 - Math.floor((best + .35) * 3.2) + (j > .96 ? 1 : j < .03 ? -1 : 0))); px(x, y, pal[k]); }
  });
}
const bushSprite = v => terrainSprite("bush" + v, 10, 6, px => { for (let y = 0; y < 5; y++) for (let x = 0; x < 10; x++) { const dx = (x - 4.5) / 4.6, dy = (y - 2.8) / 2.4; if (dx * dx + dy * dy > 1 + (hash(x, y, 4 + v) - .5) * .3) continue; const l = (-dx - dy) * .5 + hash(x, y, 8) * .3; px(x, y, l > .4 ? "#6fb04e" : l > 0 ? "#3f8238" : "#2a5d2c"); } if (v) { px(3, 1, "#f4f0f0"); px(6, 2, "#f2d76a"); } });
const rockSprite = v => terrainSprite("rock" + v, 10, 6, px => { for (let y = 0; y < 5; y++) for (let x = 0; x < 10; x++) { const dx = (x - 4.5) / 4.5, dy = (y - 2.9) / (2.1 + v * .3); if (dx * dx + dy * dy > 1 + (hash(x, y, 6 + v) - .5) * .25) continue; const l = (-dx - dy) * .55 + hash(x, y, 2) * .25; px(x, y, l > .45 ? "#c4c0b4" : l > .05 ? "#9b978c" : "#6f6c64"); } });
function pine(c, x, y, s, k) { const sp = pineSprite(Math.floor(k * 3)), u = s / 16; c.imageSmoothingEnabled = false; c.drawImage(sp, Math.round(x - 6.5 * u), Math.round(y - 18 * u), sp.width * u, sp.height * u); }
function oak(c, x, y, s) { const sp = oakSprite(Math.round(x + y) % 2), u = s / 16; c.imageSmoothingEnabled = false; c.drawImage(sp, Math.round(x - 8.5 * u), Math.round(y - 18 * u), sp.width * u, sp.height * u); }
// the battleground at the centre of the map: 46 pixels across (about 2.9 tiles), drawn once
const centreSprite = () => terrainSprite("centre", 46, 46, px => {
  const C = 22.5, R = 21;
  for (let y = 0; y < 46; y++) for (let x = 0; x < 46; x++) { const dx = x - C, dy = y - C, d = Math.hypot(dx, dy); if (d > R) continue;
    if (d > R - 1.3) { px(x, y, "#5e4a2b"); continue; }
    if (d > R - 2.4) { px(x, y, (x + y) % 3 ? "#8a6f45" : "#7d6440"); continue; }
    if (Math.abs(d - 11) < .7) { px(x, y, "#8a6f45"); continue; }
    const row = Math.floor(y / 3), sx = Math.floor((x + (row % 2) * 2) / 4), mortar = y % 3 === 2 || (x + (row % 2) * 2) % 4 === 3;
    if (mortar) { px(x, y, "#94784c"); continue; }
    const k = hash(sx, row, 61); px(x, y, k > .66 ? "#c4a674" : k > .33 ? "#b99a68" : "#a8895a"); }
  // a compass star of pale stones in the middle
  for (let k = -5; k <= 5; k++) { const a = Math.abs(k) < 2 ? "#e3cf9e" : "#d5bd88"; px(C + k, C, a); px(C, C + k, a); }
  for (let k = -2; k <= 2; k++) { px(C + k, C + k, "#d5bd88"); px(C + k, C - k, "#d5bd88"); }
  px(C, C, "#f0e2b8");
}, null);
function paintBackground() {
  const res = Math.min(dpr, 2), b = document.createElement("canvas"); b.width = b.height = Math.round(W * res);
  const c = b.getContext("2d"); c.scale(res, res); c.imageSmoothingEnabled = false;
  // ground: the original grass, a slightly varied green square per tile with blades of grass and the odd flower
  for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
    const v = hash(r, q); c.fillStyle = `hsl(${92 + v * 10}, ${36 + v * 8}%, ${32 + v * 6}%)`; c.fillRect(q * ts, r * ts, ts + 1, ts + 1);
  }
  c.imageSmoothingEnabled = true;
  for (let i = 0; i < N * N * 9; i++) {
    const x = hash(i, 1, 3) * W, y = hash(i, 2, 5) * W, v = hash(i, 3, 7);
    c.strokeStyle = v > .5 ? "rgba(30,60,20,.45)" : "rgba(150,190,90,.35)"; c.lineWidth = ts * .03;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + ts * .04, y - ts * .1); c.stroke();
    if (v > .985) { c.fillStyle = v > .993 ? "#f2e7a0" : "#f4f0f0"; c.beginPath(); c.arc(x, y, ts * .04, 0, 7); c.fill(); }
  }
  c.imageSmoothingEnabled = false;
  const u = ts / 16;
  // roads: a dark edge, a dirt body, and a lighter worn middle, with pebbles
  [["#6a5330", .5], ["#a8895a", .4], ["#b99a68", .3]].forEach(([col, w]) => {
    c.strokeStyle = col; c.lineWidth = ts * w; c.lineCap = "round";
    castleTiles.forEach(([r, q]) => { c.beginPath(); c.moveTo((q + .5) * ts, (r + .5) * ts); c.lineTo(MID, MID); c.stroke(); });
  });
  // the centre battleground: a paved pixel-art plaza (flagstones, a worn inner ring and a compass star), then its ring of standing stones
  { const sp = centreSprite(); c.drawImage(sp, Math.round(MID - sp.width / 2 * u), Math.round(MID - sp.height / 2 * u), sp.width * u, sp.height * u); }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + .2, x = MID + Math.cos(a) * ts * 1.1, y = MID + Math.sin(a) * ts * 1.1, sx = Math.round(x / u) * u, sy = Math.round(y / u) * u;
    c.fillStyle = "rgba(0,0,0,.28)"; c.fillRect(sx - u * 2, sy, u * 5, u); c.fillStyle = "#3a3832"; c.fillRect(sx - u * 2, sy - u * 7, u * 4, u * 8);
    c.fillStyle = "#8f8b82"; c.fillRect(sx - u * 2 + u * .5, sy - u * 7 + u * .5, u * 3, u * 7); c.fillStyle = "#b8b4a8"; c.fillRect(sx - u * 2 + u * .5, sy - u * 7 + u * .5, u, u * 7); c.fillStyle = "#c9c5b9"; c.fillRect(sx - u * 2 + u * .5, sy - u * 7 + u * .5, u * 3, u);
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
  // The forest comes from treeGeom (js/core/layout.js), the same shape the battle rules use: a rim of forest outside a smooth boundary, a little bulge in between each pair of bases,
  // and a small blockade of three trees between each pair. One slice is generated and turned once per base, so it is identical everywhere, whatever the number of lords.
  // From TREES_V1_FROM the trees are solid. (Your own deployment field is kept clear of rim trees so you can see where to place soldiers.)
  const scenery = []; // drawn back to front so nearer trees overlap the ones behind
  { const TG = treeGeom(castleTiles.length || 8, N), cc = TG.cc, n = TG.n, sec = TG.sec, ref = TG.ref, rMax = TG.half * 1.45 + 1;
    const free = (x, y) => { const tr = Math.floor(y / ts), tq = Math.floor(x / ts), k = `${tr},${tq}`; return !(isCentre(tr, tq) || roadTiles.has(k) || inZone(tr, tq) || occupied.has(k) || nearCastle(tr, tq)); };
    const shadow = (x, y) => { c.fillStyle = "rgba(0,0,0,.24)"; c.beginPath(); c.ellipse(x, y, ts * .3, ts * .1, 0, 0, 7); c.fill(); };
    let k = 0; for (let r = 1.6; r <= rMax; r += .62, k++) { const m = Math.max(1, Math.round(r * sec / .62));
      for (let j = 0; j < m; j++) { const ph = (j + .2 + hash(k, j, 61) * .6) / m * sec, rr = r + (hash(k, j, 62) - .5) * .37;
        for (let sI = 0; sI < n; sI++) { const th = ref + sI * sec + ph, x = MID + rr * Math.cos(th) * ts, y = MID + rr * Math.sin(th) * ts; // the forest: everything beyond the boundary
          if (rr < TG.rim(th) || x < ts * .3 || y < ts * .3 || x > W - ts * .3 || y > W - ts * .3 || !free(x, y)) continue;
          scenery.push([y, () => { shadow(x, y); hash(k, j, 63) > .45 ? pine(c, x, y, ts, hash(k, j, 64)) : oak(c, x, y, ts); }]); } } }
    for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) { // a thin line of trees along the very edge, so the whole map is ringed
      if (Math.min(r, q, N - 1 - r, N - 1 - q) > 0 || !free((q + .5) * ts, (r + .5) * ts)) continue;
      for (let i = 0; i < 2; i++) { const x = (q + .3 + hash(r, q, 72 + i) * .4) * ts, y = (r + .75 + hash(r, q, 74 + i) * .2) * ts;
        scenery.push([y, () => { shadow(x, y); hash(r, q, 76 + i) > .45 ? pine(c, x, y, ts, hash(r, q, 78)) : oak(c, x, y, ts); }]); } }
    TG.clumps.forEach(cl => { const x = cl.x * ts, y = (cl.y + .3) * ts, o = cl.k + 1; // the blockades: every one drawn the same way
      [[-.16, -.05, 0], [.17, .12, 1]].forEach(([dx, dy, w]) => { const tx = x + dx * ts, ty = y + dy * ts; scenery.push([ty, () => { shadow(tx, ty); (o + w) % 2 ? pine(c, tx, ty, ts, .3 + .2 * o) : oak(c, tx, ty, ts); }]); }); });
  }
  scenery.sort((p, q) => p[0] - q[0]).forEach(([, fn]) => fn());
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
// Castles as pixel sprites, in the same design the shape art had: a stone curtain wall with crenels, two corner towers with roofs in the owner's colour and a taller keep
// (the crest and the flag are painted on top). A Fortress adds side walls with turrets, a Citadel gold trim and finials. 20.8 sprite pixels to a tile.
const CASTLE_SPR = {};
function castleSprite(tier, color) {
  const id = tier + "|" + color; if (CASTLE_SPR[id]) return CASTLE_SPR[id];
  const W = tier === 1 ? 26 : 34, H = 24, g = Array.from({ length: H }, () => Array(W).fill(null)), Y = 6; // rows are drawn 6 lower than the design grid, which had the flag above
  const R = (x, y, w, h, c) => { for (let j = y - Y; j < y - Y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < W) g[j][i] = c; }, P = (x, y, c) => R(x, y, 1, 1, c);
  const st = "#a39d8f", dk = "#6f6a5f", lt = "#bdb7a9", hi = "#d2cdc0", roof = color, roofD = mixHex(color, "#000000", .4), gold = "#e2b33c", door = "#4a2f17";
  const o = tier === 1 ? 0 : 4, cx = o + 13;
  if (tier >= 2) { R(0, 19, W, 9, dk); R(0, 19, W, 1, lt); for (let x = 0; x < W; x += 3) R(x, 17, 2, 2, st);
    [[0, 15], [W - 4, 15]].forEach(([x, y]) => { R(x, y, 4, 13, st); R(x, y, 1, 13, lt); R(x + 3, y, 1, 13, dk); R(x, y - 3, 4, 3, roof); R(x + 1, y - 4, 2, 1, roof); R(x + 3, y - 3, 1, 3, roofD); }); }
  R(o + 3, 15, 20, 13, st); R(o + 3, 15, 20, 1, lt); for (let x = o + 3; x < o + 23; x += 3) R(x, 13, 2, 2, st);
  for (let y = 18; y < 28; y += 3) R(o + 3, y, 20, 1, dk);
  [[o + 1, 11], [o + 19, 11]].forEach(([x, y]) => { R(x, y, 6, 17, st); R(x, y, 1, 17, lt); R(x + 5, y, 1, 17, dk); R(x + 2, y + 5, 2, 3, door);
    R(x, y - 2, 6, 2, roof); R(x + 1, y - 4, 4, 2, roof); R(x + 2, y - 6, 2, 2, roof); R(x + 4, y - 4, 1, 4, roofD); R(x + 5, y - 2, 1, 2, roofD);
    if (tier === 3) { P(x + 2, y - 7, gold); P(x + 3, y - 7, gold); } });
  R(cx - 5, 8, 10, 20, lt); R(cx - 5, 8, 10, 1, hi); R(cx + 4, 8, 1, 20, st); for (let x = cx - 5; x < cx + 5; x += 3) R(x, 6, 2, 2, lt);
  R(cx - 2, 21, 4, 7, door); R(cx - 1, 20, 2, 1, door);
  if (tier === 3) { R(o + 3, 16, 20, 1, gold); R(cx - 5, 9, 10, 1, gold); }
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let col = g[y][x]; if (!col) { if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) col = "#1e140c"; else continue; } c.fillStyle = col; c.fillRect(x, y, 1, 1); }
  return (CASTLE_SPR[id] = cv);
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
  { const px = ts / 20.8, sp = castleSprite(tier, color), sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; // the castle as a pixel sprite, standing on its tile
    ctx.drawImage(sp, cx - sp.width * px / 2, by - sp.height * px, sp.width * px, sp.height * px); ctx.imageSmoothingEnabled = sm; }
  paintBanner(ctx, ban ? { ...ban, c1: color } : { ...defaultBanner(), c1: color }, color, cx - ts * .14, by - ts * .96, ts * .28, ts * .38); // the lord's crest on the keep
  drawFlag(ctx, cx, by - ts * 1.1, ts * .32, ts * .38, color, t + q, ban && ban.em);
  if (!st) { drawSprite("guard", color, cx + ts * .78, by + ts * .02, .62); }
  if (st) {
    const bw = ts * 1.1, bh = ts * .12, bx = cx - bw / 2, byy = by - ts * 1.42;
    ctx.fillStyle = "rgba(20,12,6,.9)"; ctx.fillRect(bx - 2, byy - 2, bw + 4, bh + 4);
    ctx.fillStyle = st.friendly ? "#47b04b" : "#d4402f"; ctx.fillRect(bx, byy, bw * Math.max(0, st.frac), bh);
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(bx, byy, bw * Math.max(0, st.frac), bh * .35);
    if (st.waves) { // reinforcement waves still in the garrison: one yellow bar each, grey once the wave has marched out
      const n = st.waves.total, gap = ts * .05, gw = (bw - gap * (n - 1)) / n, gh = ts * .09, gy = byy - gh - ts * .08;
      for (let i = 0; i < n; i++) { const x0 = bx + i * (gw + gap); ctx.fillStyle = "rgba(20,12,6,.9)"; ctx.fillRect(x0 - 1.5, gy - 1.5, gw + 3, gh + 3); ctx.fillStyle = i < st.waves.left ? "#e8b923" : "#7d776b"; ctx.fillRect(x0, gy, gw, gh); if (i < st.waves.left) { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x0, gy, gw, gh * .35); } }
    }
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
// Traps as pixel sprites in the same style as the soldiers: each is a small grid of palette letters, outlined and scaled up with hard edges
const TRAP_PAL = { k: "#3a2614", d: "#6b4a2a", s: "#d7dde2", S: "#8d949b", r: "#c9a46a", R: "#8a6a3a", w: "#8a5a2b", W: "#5a3a1e", b: "#2a2a2e", B: "#5c5c64", f: "#ff8a3a", y: "#ffd34d", a: "#dcc287", A: "#b09356", g: "#e2b33c", G: "#7a5a10" };
const TRAP_PX = {
  spike: ["................", "....s...s...s...", "...sS..sS..sS...", "...sS..sS..sS...", "..dsSddsSddsSd..", ".dkkkkkkkkkkkkd.", "dkkkkkkkkkkkkkkd", "dkkkkkkkkkkkkkkd", ".dkkkkkkkkkkkkd.", "..dddddddddddd.."],
  snare: ["..........WW....", "..........Ww....", "..........Ww....", "....rrrrrrRw....", "..rR......rW....", ".r..........r...", ".r..........r...", "..rR......Rr....", "....rrrrrr......", "................"],
  blade: ["...s....s....s..", "..sS...sS...sS..", "..sS...sS...sS..", ".WsSWWWsSWWWsSW.", ".wwwwwwwwwwwwww.", ".wkwwwwkwwwwkww.", ".wwwwwwwwwwwwww.", ".WWWWWWWWWWWWWW.", "................", "................"],
  bomb:  ["..........yf....", ".........fRy....", "........R.......", ".......R........", ".....bbbbb......", "....bBBbbbb.....", "...bBbbbbbbb....", "...bbbbbbbbb....", "...bbbbbbbbb....", "....bbbbbbb.....", ".....bbbbb......"],
  sand:  ["................", "....aaaaaaaa....", "..aaaAAAAAAaaa..", ".aaAAAkkkkAAAaa.", ".aaAAkkkkkkAAaa.", ".aaAAAkkkkAAAaa.", "..aaaAAAAAAaaa..", "....aaaaaaaa....", "................", "................"],
  bell:  [".......G........", "......gGg.......", ".....ggggg......", "....gyggggg.....", "....gyggggg.....", "....gyggggg.....", "...gggggggGg....", "..GGGGGGGGGGG...", ".......G........", "......GGG......."],
};
const TRAP_CV = {};
function trapPixels(type) {
  if (TRAP_CV[type]) return TRAP_CV[type];
  const rows = TRAP_PX[type] || TRAP_PX.bell, W = 16, H = rows.length + 2, g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => { const ch = (rows[y - 1] || "")[x]; return ch && ch !== "." ? TRAP_PAL[ch] : null; }));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = g[y][x] || (((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) ? "#1e140c" : null);
    if (c) { cx.fillStyle = c; cx.fillRect(x, y, 1, 1); }
  }
  return (TRAP_CV[type] = cv);
}
function drawTrap(c, type, x, y, s) {
  if (type === "tower") {
    c.fillStyle = "#bdb7a9"; c.fillRect(x - s * .2, y - s * .18, s * .4, s * .38); c.fillRect(x - s * .26, y - s * .3, s * .52, s * .12); c.fillStyle = "#6f6a5f"; [-.2, 0, .2].forEach(dx => c.fillRect(x + dx * s - s * .04, y - s * .36, s * .08, s * .08)); c.fillRect(x - s * .03, y - s * .06, s * .06, s * .16);
    return;
  }
  const px = trapPixels(type), k = s * .7 / px.width, w = px.width * k, h = px.height * k, sm = c.imageSmoothingEnabled;
  c.imageSmoothingEnabled = false; c.drawImage(px, x - w / 2, y - h / 2 + s * .04, w, h); c.imageSmoothingEnabled = sm;
}
function drawSprite(key, color, cx, by, scale, o) {
  const s = spr(key, color, o && o.pose), px = ts * scale / SH, h0 = s.height * px, w = s.width * px; o = o || {}; // pixels the size a soldier's are, so a tall tower stands taller
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, by - ts * .02, w * .32, ts * .09, 0, 0, 7); ctx.fill();
  const h = h0 * (o.sq || 1), x = cx + (o.dx || 0), y = by + (o.dy || 0);
  ctx.imageSmoothingEnabled = false;
  const put = () => { if (o.flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(s, -w / 2, y - h, w, h); ctx.restore(); } else ctx.drawImage(s, x - w / 2, y - h, w, h); };
  if (o.aura) { ctx.save(); ctx.shadowColor = o.aura; ctx.shadowBlur = ts * .5; put(); ctx.restore(); }
  put();
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
    glow(cx, by - ts * .5, ts * 1.0, ts * 1.05, color, .8 + Math.sin(t * 3 + q) * .12);
    ctx.strokeStyle = color; ctx.lineWidth = ts * .06; ctx.beginPath(); ctx.ellipse(cx, by - ts * .05, ts * .36, ts * .13, 0, 0, 7); ctx.stroke();
  }
  if (extra && extra.ring) { ctx.strokeStyle = "#ffe082"; ctx.lineWidth = ts * .06; ctx.beginPath(); ctx.ellipse(cx, by - ts * .05, ts * .42, ts * .16, 0, 0, 7); ctx.stroke(); }
  const fx = isChamp && extra && extra.items && extra.items.length ? extra.items : null;
  if (fx) { drawHeroAuras(ctx, cx, by, ts, t, fx, q); drawHeroOrbs(ctx, cx, by, ts, t, fx, q, true); }
  const top = drawSprite(key, color, cx, by, isChamp ? 1.15 : .95, isChamp ? { aura: color } : undefined);
  if (fx) drawHeroOrbs(ctx, cx, by, ts, t, fx, q, false);
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
