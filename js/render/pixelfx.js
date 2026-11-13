// Pixel-art spell effects. Each effect is a short hand-built animation drawn on a tiny canvas (16 pixels to a tile, like the
// unit sprites) and scaled up with hard edges. Render only: nothing here touches the battle sim.
// An effect: { dur, n (frames), box(R) -> [width, height, anchorX, anchorY], draw(P, f, n, R) }, R = the skill's radius in pixels.
// Rules for these: thin lines and small sprites, no filled circles, a clear shape you can name, gone in about a second.

const PIXFX = {}, PXC = {}, PXU = 16;
const PXD = "#1e140c";

function pxPen(g, ax, ay) {
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(ax + x), Math.round(ay + y), 1, 1); };
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(ax + x), Math.round(ay + y), w, h); };
  const line = (x0, y0, x1, y1, c) => { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let er = dx + dy;
    for (let k = 0; k < 400; k++) { px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; } } };
  // pixels of an ellipse (height 72% of width, like the ground rings) between two angles; colFn(i, angle) gives a colour or null
  const ell = (rx, colFn, a0 = 0, a1 = Math.PI * 2, squash = .72) => { const seen = new Set(); let i = 0, step = .5 / Math.max(4, rx);
    for (let a = a0; a <= a1; a += step) { const x = Math.round(Math.cos(a) * rx), y = Math.round(Math.sin(a) * rx * squash), k = x * 1000 + y; if (seen.has(k)) continue; seen.add(k); const c = colFn(i++, a); if (c) px(x, y, c); } };
  return { px, rect, line, ell, g };
}
function pxShield(P, cx, cy, big) { // a small kite shield with a cross
  const hh = big ? 7 : 6, hw = big ? 6 : 5;
  for (let pass = 0; pass < 2; pass++) for (let y = -hh; y <= hh; y++) { const w = y <= 0 ? hw : Math.max(0, hw - Math.floor(y * hw / hh * .95)); const o = pass ? 0 : 1;
    P.rect(cx - w - o, cy + y - (pass ? 0 : 0), 2 * w + 1 + 2 * o, 1, pass ? (y < -hh + 2 ? "#a9c8ff" : "#5a8fe0") : PXD); }
  P.rect(cx, cy - hh + 1, 1, 2 * hh - 3, "#e8f1ff"); P.rect(cx - hw + 2, cy - 2, 2 * hw - 3, 1, "#e8f1ff");
}
function pxStar(P, cx, cy, r, c1, c2) { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, L = k % 2 ? r * .62 : r; P.line(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2, cx + Math.cos(a) * L, cy + Math.sin(a) * L, k % 2 ? c2 : c1); } P.rect(cx - 1, cy - 1, 3, 3, "#fff"); }
function pxFlame(P, bx, by, h, f, seed, grow) {
  h = Math.round(h * grow); if (h < 2) return;
  for (let r = 0; r < h; r++) { const t = r / h, w = Math.max(1, Math.round(4 * Math.pow(1 - t, .7)) + (r < 3 ? 1 : 0)), sway = Math.round(Math.sin(f * 1.3 + seed) * t * 2.2);
    const col = t < .3 ? "#ffd34d" : t < .6 ? "#ff8a2a" : "#d9381e"; P.rect(bx + sway - (w >> 1), by - r, w, 1, col); if (w >= 3 && t < .3) P.rect(bx + sway, by - r, 1, 1, "#fff3b0"); }
}
const pxHash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ----- Warrior -----
// Taunting Shout: a horn blast. Speed lines burst out, a dashed ring spreads, a red "!" pops over the hero.
PIXFX.v3_warrior_b1_t2 = { dur: .7, n: 7,
  box: R => { const w = 2 * R + 14, ry = Math.round(R * .72); return [w, 36 + ry + 8, w / 2, 36]; },
  draw(P, f, n, R) {
    const t = f / (n - 1), rad = Math.round(R * (.25 + .75 * Math.min(1, t * 1.2)));
    if (f < 4) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + .2; P.line(Math.cos(a) * (5 + f * 3), Math.sin(a) * (5 + f * 3) * .72, Math.cos(a) * (10 + f * 4), Math.sin(a) * (10 + f * 4) * .72, "#ffe29a"); }
    P.ell(rad, i => (i + f * 2) % 5 < (f < 5 ? 3 : 2) ? (f < 3 ? "#fff3c0" : "#f2a63c") : null);
    if (f >= 2 && f < n - 1) P.ell(Math.max(4, rad - 4), i => (i + f) % 6 < 2 ? "#a8591a" : null);
    if (f >= 1 && f <= 5) { const by = -(f < 3 ? f * 2 : 5) - 22; P.rect(-3, by - 1, 7, 12, PXD); P.rect(-1, by, 3, 8, "#e0443a"); P.rect(-1, by + 9, 3, 2, "#e0443a"); P.rect(0, by + 1, 1, 5, "#ff9a8a"); }
  } };
// Shield Bash: the shield slams in, then a star of impact and flying chips.
PIXFX.v3_warrior_b1_t2b = { dur: .55, n: 6,
  box: () => [48, 48, 24, 24],
  draw(P, f, n) {
    if (f < 3) { const sx = [-14, -8, -3][f]; if (f > 0) for (let k = -3; k <= 3; k += 3) P.line(sx - 6, k, sx - 12 - f * 2, k, "#cfe0ff"); pxShield(P, sx, 0, true); }
    if (f === 2) pxStar(P, 2, 0, 6, "#ffffff", "#ffd34d");
    if (f === 3) pxStar(P, 2, 0, 12, "#fff3c0", "#ffd34d");
    if (f === 4) pxStar(P, 2, 0, 10, "#ffd34d", "#a8731a");
    if (f >= 3) for (let k = 0; k < 6; k++) { const a = k * 1.05 + .3, d = 9 + (f - 3) * 5; P.rect(Math.round(2 + Math.cos(a) * d), Math.round(Math.sin(a) * d), 2, 2, k % 2 ? "#ffffff" : "#8fb4ff"); }
  } };
// Fortress Wall: a dome of bricks builds up from both sides, shimmers, then fades. Only the edge is drawn.
PIXFX.v3_warrior_b1_t4 = { dur: .9, n: 9,
  box: R => { const w = 2 * R + 12, h = Math.round(R * .9), ry = Math.round(R * .72); return [w, h + 14 + ry + 6, w / 2, h + 14]; },
  draw(P, f, n, R) {
    const h = Math.round(R * .9), vis = f < 5 ? (f + 1) / 5 : 1, N = Math.round(R * 4);
    for (let i = 0; i <= N; i++) { const u = i / N, a = Math.PI + u * Math.PI, d = Math.min(u, 1 - u) * 2; if (d > vis) continue;
      const x = Math.cos(a) * R, y = Math.sin(a) * h; if (f === n - 1 && i % 2) continue;
      const hi = f >= 5 && f <= 7 && Math.abs(d - (f - 5) / 2) < .09; P.px(x, y, hi ? "#ffffff" : i % 6 < 3 ? "#9cc3ff" : "#4a72b8"); P.px(x * .97, y * .97 + 1, i % 6 < 3 ? "#4a72b8" : "#2c4a86"); }
    P.ell(R, (i, a) => a > 0 && a < Math.PI && i % 4 < 2 ? "#4a72b8" : null, 0, Math.PI);
    if (f >= 3 && f <= 6) pxShield(P, 0, -h - 8, false);
  } };
// Executioner's Whirlwind: two blades spin round the hero, trailing a crescent.
PIXFX.v3_warrior_b2_t2 = { dur: .8, n: 8,
  box: R => { const w = 2 * R + 12, h = Math.round(R * 1.44) + 14; return [w, h, w / 2, h / 2]; },
  draw(P, f, n, R) {
    const Rr = Math.round(R * (f >= n - 1 ? .75 : 1)), head = f * 1.1 - .6, span = 2.3, N = Math.round(span * Rr * .9);
    for (let b = 0; b < 2; b++) for (let k = 0; k <= N; k++) { const u = k / N, a = head + b * Math.PI - u * span; if (f >= n - 1 && u < .5) continue;
      const x = Math.cos(a) * Rr, y = Math.sin(a) * Rr * .72, c = u < .08 ? "#ffffff" : u < .3 ? "#d9d9e0" : u < .6 ? "#8fa0b8" : "#4f5f78";
      P.px(x, y, c); if (u < .45) P.px(x * .93, y * .93, u < .15 ? "#d9d9e0" : "#8fa0b8"); }
    for (let b = 0; b < 2; b++) { const a = head + b * Math.PI; P.rect(Math.round(Math.cos(a) * Rr) - 1, Math.round(Math.sin(a) * Rr * .72) - 1, 3, 3, "#ffffff"); }
  } };
// Avatar of War: flames burn around the hero, embers rise, rage chevrons pop up over the head.
PIXFX.v3_warrior_b2_t4 = { dur: .9, n: 9,
  box: () => [60, 64, 30, 46],
  draw(P, f, n) {
    const grow = f < 3 ? (f + 1) / 3 : f >= n - 2 ? .55 : 1;
    if (f < 2) P.ell(10 + f * 9, i => i % 3 < 2 ? (f ? "#d9381e" : "#fff3c0") : null);
    const fl = []; for (let k = 0; k < 7; k++) { const a = k * Math.PI * 2 / 7 + .4; fl.push([Math.cos(a) * 17, Math.sin(a) * 12 + 6, k]); }
    fl.sort((a, b) => a[1] - b[1]).forEach(([x, y, k]) => pxFlame(P, Math.round(x), Math.round(y), 13 + Math.floor(pxHash(k, f) * 5), f, k * 2.1, grow));
    for (let k = 0; k < 7; k++) { const x = (pxHash(k, 7) - .5) * 30, y = 4 - ((f * 3 + pxHash(k, 9) * 26) % 28); if (grow > .6) P.px(x, y, k % 2 ? "#ffb43a" : "#ffe29a"); }
    if (f <= 4) { const by = -24 - f; for (let r = 0; r < 2; r++) { const y = by - r * 5; for (let i = 0; i < 4; i++) { P.px(-3 + i, y + 3 - i, PXD); P.px(3 - i, y + 3 - i, PXD); } for (let i = 0; i < 3; i++) { P.px(-2 + i, y + 3 - i, r ? "#ffd34d" : "#e0443a"); P.px(2 - i, y + 3 - i, r ? "#ffd34d" : "#e0443a"); } } }
  } };
// Command Banner: a banner drops in and is planted, dust puffs, the cloth waves, buff chevrons rise.
PIXFX.v3_warrior_b3_t2 = { dur: 1.0, n: 10,
  box: () => [64, 66, 22, 52],
  draw(P, f, n) {
    const bx = 12, by = f === 0 ? -16 : f === 1 ? -4 : 6, top = by - 34;
    P.rect(bx - 1, top, 3, 36, PXD); P.rect(bx, top + 1, 1, 34, "#8a5a2b"); P.rect(bx + 1, top + 1, 1, 34, "#5a3a1c"); P.rect(bx - 1, top - 2, 3, 3, "#ffe29a");
    if (f >= 2) for (let c = 0; c < 15; c++) { if (f === n - 1 && c % 2) continue; const w = Math.round(Math.sin(c * .55 - f * 1.2) * 1.6 * c / 14), x = bx + 2 + c, y = top + 1 + w;
      P.rect(x, y - 1, 1, 12, PXD); P.rect(x, y, 1, 10, c < 2 ? "#ffd34d" : "#e2a33c"); P.px(x, y + 9, "#a8731a"); }
    if (f >= 2) { const w = Math.round(Math.sin(7 * .55 - f * 1.2) * 1.6 * 7 / 14), ey = top + 1 + w + 3; P.rect(bx + 7, ey + 2, 5, 1, "#fff3c0"); P.rect(bx + 7, ey, 1, 3, "#fff3c0"); P.rect(bx + 11, ey, 1, 3, "#fff3c0"); }
    if (f >= 2 && f <= 4) for (let k = 0; k < 4; k++) { const d = (f - 1) * 3 + k * 2, s = k % 2 ? 1 : -1; P.rect(bx + s * d - 1, 6 - (k >> 1) * 2, 3, 2, k % 2 ? "#b8b0a0" : "#8e8878"); }
    if (f >= 3 && f <= 8) for (let k = 0; k < 3; k++) { const x = -18 + k * 9, y = 8 - ((f - 3) * 3 + k * 4) % 18; for (let i = 0; i < 3; i++) { P.px(x - 2 + i, y + i, "#ffd34d"); P.px(x + 2 - i, y + i, "#ffd34d"); } }
  } };
// Rallying Charge: gold chevrons race forward over the army, with speed lines and sparkles.
PIXFX.v3_warrior_b3_t4 = { dur: .9, n: 9,
  box: R => { const w = 2 * Math.min(R, 48) + 24; return [w, 56, w / 2, 28]; },
  draw(P, f, n, R) {
    R = Math.min(R, 48); const t = (f + 1) / n;
    for (let row = -1; row <= 1; row++) for (let g = 0; g < 3; g++) { const x = -R + t * (2 * R + 14) - g * 9 - Math.abs(row) * 5, y = row * 11 + (g ? 0 : 0); if (x < -R - 4 || x > R + 10) continue;
      const c = g === 0 ? "#fff3c0" : g === 1 ? "#ffd34d" : "#a8731a";
      for (let i = -3; i <= 3; i++) { P.px(x + 3 - Math.abs(i), y + i, c); P.px(x + 2 - Math.abs(i), y + i, g === 0 ? "#ffd34d" : c); }
      if (g === 0) P.line(x - 22, y, x - 8, y, "#e2a33c"); }
    for (let k = 0; k < 6; k++) { const x = -R + pxHash(k, 3) * 2 * R, y = (pxHash(k, 5) - .5) * 34 - ((f * 2 + k) % 6); if ((f + k) % 3) P.px(x, y, "#ffe29a"); }
  } };

function pxFrame(sp, d, f, R) {
  const key = sp + "|" + f + "|" + R; if (PXC[key]) return PXC[key];
  const [w, h, ax, ay] = d.box(R), cv = document.createElement("canvas"); cv.width = Math.ceil(w); cv.height = Math.ceil(h);
  d.draw(pxPen(cv.getContext("2d"), Math.round(ax), Math.round(ay)), f, d.n, R); cv.ax = Math.round(ax); cv.ay = Math.round(ay);
  return (PXC[key] = cv);
}
// Draw the effect for spell event e at age (seconds); x, y are in screen pixels
function drawPixFx(d, e, age, c, x, y, tsz) {
  const f = Math.min(d.n - 1, Math.floor(age / d.dur * d.n)), a = SPELL_ART[e.sp], R = Math.round((e.r || a.r || 1.2) * PXU), cv = pxFrame(e.sp, d, f, R), u = tsz / PXU;
  c.imageSmoothingEnabled = false; c.drawImage(cv, Math.round(x - cv.ax * u), Math.round(y - cv.ay * u), cv.width * u, cv.height * u);
}

// ----- shared bits for the other four heroes -----
function pxBlob(P, cx, cy, r, cols, out, seed) { // a lumpy round blob: cols = [core, mid, rim], out = outline colour
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = Math.hypot(x, y), lim = r * (.8 + .32 * pxHash(Math.round(Math.atan2(y, x) * 2.2), seed)); if (d > lim + (out ? 1 : 0)) continue;
    P.px(cx + x, cy + y, d > lim ? out : d < lim * .35 ? cols[0] : d < lim * .72 ? cols[1] : cols[2]); }
}
function pxBolt(P, x0, y0, x1, y1, f, seed, core, edge) { // a jagged bolt; the kinks change every frame
  const N = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6)); let px0 = x0, py0 = y0;
  for (let i = 1; i <= N; i++) { const t = i / N, j = i === N ? 0 : (pxHash(i + seed, f) - .5) * 9, nx = x0 + (x1 - x0) * t + j, ny = y0 + (y1 - y0) * t; P.line(px0 + 1, py0, nx + 1, ny, edge); P.line(px0, py0, nx, ny, core); px0 = nx; py0 = ny; }
}
function pxDiamond(P, cx, cy, w, h, c1, c2) { for (let y = -h; y <= h; y++) { const hw = Math.round(w * (1 - Math.abs(y) / h)); P.rect(cx - hw, cy + y, 2 * hw + 1, 1, c1); } P.rect(cx, cy - h + 1, 1, 2 * h - 1, c2); }
function pxSpot(P, cx, cy, c) { P.rect(cx - 1, cy, 3, 1, c); P.rect(cx, cy - 1, 1, 3, c); }
const pxFade = (f, n, i) => f < n - 1 || i % 2 === 0; // last frame: every other pixel

// ----- Mage -----
// Fireball: the blast at the target, a lumpy fireball with a bright core, then embers and smoke.
PIXFX.v3_mage_b1_t2 = { dur: .6, n: 7, box: () => [60, 64, 30, 38],
  draw(P, f) {
    const r = [3, 7, 11, 12, 10, 0, 0][f];
    if (r) pxBlob(P, 0, 0, r, f < 4 ? ["#fff3b0", "#ff8a2a", "#d9381e"] : ["#ff8a2a", "#d9381e", "#7a1f12"], "#4a1208", f);
    if (f >= 3) for (let k = 0; k < 8; k++) { const a = k * .8 + .2, d = 12 + (f - 3) * 4; P.rect(Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d * .8) + (f - 3) * 2, 2, 2, k % 2 ? "#ffd34d" : "#ff8a2a"); }
    if (f >= 4) for (let k = 0; k < 3; k++) pxBlob(P, (k - 1) * 8, -8 - (f - 4) * 5 - k * 3, 3 + (f < 6 ? 1 : 0), ["#8a8480", "#6e6a66", "#55514e"], null, k);
  } };
// Frost Nova: ice shards fly out in a ring and a pale ring spreads; then the shards shatter into snow.
PIXFX.v3_mage_b2_t2 = { dur: .7, n: 7, box: R => { const w = 2 * R + 16; return [w, w * .72 + 22, w / 2, w * .36 + 6]; },
  draw(P, f, n, R) {
    const t = Math.min(1, (f + 1) / 5), rad = Math.round(R * (.25 + .75 * t));
    if (f < 2) { for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; P.line(-Math.cos(a) * 5, -Math.sin(a) * 5, Math.cos(a) * 5, Math.sin(a) * 5, "#e8f8ff"); } P.px(0, 0, "#fff"); }
    P.ell(rad, i => f < 6 && (i + f) % 4 < 2 ? (f < 3 ? "#ffffff" : "#8fd8ff") : null);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + .2, d = f < 5 ? rad : R, x = Math.round(Math.cos(a) * d), y = Math.round(Math.sin(a) * d * .72);
      if (f < 5) pxDiamond(P, x, y - 2, 2, 4, "#8fd8ff", "#ffffff"); else P.px(x + (k % 3 - 1) * (f - 4), y + (f - 4) * 3, k % 2 ? "#ffffff" : "#8fd8ff"); }
  } };
// Blizzard: snow and ice shards driving across the area, frost speckles on the ground, wind streaks.
PIXFX.v3_mage_b2_t4 = { dur: 1.0, n: 9, box: R => { R = Math.min(R, 56); const w = 2 * R + 16; return [w, w * .72 + 50, w / 2, w * .36 + 40]; },
  draw(P, f, n, R) {
    R = Math.min(R, 56); const ry = Math.round(R * .72);
    P.ell(R, i => (i + f) % 6 < 2 && f < n - 1 ? "#8fd8ff" : null);
    for (let k = 0; k < 40; k++) { const x = (pxHash(k, 1) - .5) * 2 * R * .9, y = (pxHash(k, 2) - .5) * 2 * ry * .9; if (Math.abs(x) / R + Math.abs(y) / ry < 1.2 && (f > 1 && pxHash(k, 3) < Math.min(1, f / 5))) P.px(x, y + 2, k % 3 ? "#cfeeff" : "#ffffff"); }
    for (let k = 0; k < 16; k++) { const x0 = (pxHash(k, 4) - .5) * 2 * R, ph = (f * .35 + pxHash(k, 5)) % 1, y0 = -48 + ph * (48 + (pxHash(k, 6) - .5) * 2 * ry * .8), x = x0 - ph * 14; if (f === n - 1 && k % 2) continue;
      if (k % 4 === 0) { pxSpot(P, x, y0, "#ffffff"); } else { P.line(x, y0, x - 4, y0 - 7, k % 2 ? "#cfeeff" : "#8fd8ff"); P.line(x + 1, y0, x - 3, y0 - 7, "#8fd8ff"); P.rect(x, y0, 2, 2, "#ffffff"); } }
  } };
// Blink & Disrupt: a column of light collapses, then a purple shock ring and sparks.
PIXFX.v3_mage_b3_t2 = { dur: .5, n: 6, box: R => { const w = 2 * R + 16; return [w, w * .72 + 40, w / 2, w * .36 + 30]; },
  draw(P, f, n, R) {
    if (f < 3) { const w = [6, 4, 1][f], h = 34 - f * 4; for (let y = 0; y < h; y++) P.rect(-w, -y, 2 * w + 1, 1, y % 5 === 0 ? "#ffffff" : y % 2 ? "#c9a0ff" : "#8e5fd8"); for (let k = 0; k < 6; k++) { const a = k * 1.05, d = 14 - f * 4; P.px(Math.cos(a) * d, Math.sin(a) * d * .7 - 6, "#e6d4ff"); } }
    if (f >= 2) { const rad = Math.round(R * (f - 1) / 4); P.ell(rad, i => i % 3 < 2 ? (f < 4 ? "#ffffff" : "#c9a0ff") : null); for (let k = 0; k < 6; k++) { const a = k * 1.05 + .4; P.rect(Math.round(Math.cos(a) * rad), Math.round(Math.sin(a) * rad * .72) - 2, 2, 2, k % 2 ? "#ffffff" : "#8e5fd8"); } }
  } };
// Mana Shield: a hexagonal bubble flashes on and pulses with orbiting runes.
PIXFX.v3_mage_b3_t2b = { dur: .9, n: 8, box: () => [44, 50, 22, 28],
  draw(P, f, n) {
    const vs = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + k * Math.PI / 3; vs.push([Math.cos(a) * 12, Math.sin(a) * 15 - 3]); }
    if (f === 0) P.ell(8, () => "#ffffff");
    if (f >= 1) for (let k = 0; k < 6; k++) { const [x0, y0] = vs[k], [x1, y1] = vs[(k + 1) % 6]; if (f === n - 1) { P.px(x0, y0, "#c9a0ff"); continue; } P.line(x0, y0, x1, y1, (k + f) % 3 === 0 ? "#ffffff" : "#c9a0ff"); P.line(x0 * .88, y0 * .88 - 1, x1 * .88, y1 * .88 - 1, "#6e48b8"); }
    if (f >= 2 && f < n - 1) for (let k = 0; k < 3; k++) { const a = f * .9 + k * 2.1, x = Math.round(Math.cos(a) * 12), y = Math.round(Math.sin(a) * 14 - 3); pxSpot(P, x, y, "#ffffff"); }
  } };
// Time Warp: a clock face of ticks spreads out, a hand sweeps backwards, ripples run out.
PIXFX.v3_mage_b3_t4 = { dur: 1.1, n: 10, box: R => { R = Math.min(R, 56); const w = 2 * R + 20; return [w, w * .72 + 20, w / 2, w * .36 + 8]; },
  draw(P, f, n, R) {
    R = Math.min(R, 56); const t = Math.min(1, (f + 1) / 4), rad = Math.round(R * t);
    P.ell(rad, i => f < n - 1 && i % 5 < 3 ? "#c9a0ff" : null);
    if (f >= 3) { for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, big = k % 3 === 0, x0 = Math.cos(a) * (R - (big ? 5 : 3)), y0 = Math.sin(a) * (R - (big ? 5 : 3)) * .72, x1 = Math.cos(a) * R, y1 = Math.sin(a) * R * .72; if (f === n - 1 && k % 2) continue; P.line(x0, y0, x1, y1, big ? "#ffffff" : "#c9a0ff"); }
      const ha = -f * .9; P.line(0, 0, Math.cos(ha) * R * .6, Math.sin(ha) * R * .6 * .72, "#ffffff"); P.line(0, 0, Math.cos(ha / 6) * R * .35, Math.sin(ha / 6) * R * .35 * .72, "#c9a0ff"); P.rect(-1, -1, 3, 3, "#ffffff"); }
    if (f >= 2 && f < 8) P.ell(Math.round(R * ((f - 2) / 6) * .8), i => i % 4 < 1 ? "#8e5fd8" : null);
  } };

// ----- Archer -----
function pxArrow(P, x, y, c) { P.rect(x, y, 1, 6, "#8a5a2b"); P.px(x, y + 6, "#e8e8f0"); P.px(x, y + 7, "#c0c4cc"); P.px(x - 1, y - 1, c); P.px(x + 1, y - 1, c); P.px(x, y, c); }
// Arrow Volley: arrows thud into the ground around the target and stay standing for a moment.
PIXFX.v3_archer_b1_t2 = { dur: .6, n: 6, box: R => { const w = 2 * R + 20; return [w, 70, w / 2, 56]; },
  draw(P, f, n, R) {
    for (let k = 0; k < 9; k++) { const x = Math.round((pxHash(k, 1) - .5) * 2 * R * .85), y = Math.round((pxHash(k, 2) - .5) * R * 1.0), land = Math.floor(pxHash(k, 3) * 3);
      if (f < land) { const h = (land - f) * 14; P.line(x + 4, y - h - 8, x, y - h, "#cfc8a8"); P.px(x, y - h, "#ffffff"); }
      else { if (f === land) { P.rect(x - 3, y, 2, 1, "#b8b0a0"); P.rect(x + 2, y, 2, 1, "#b8b0a0"); } if (f < n - 1 || k % 2) pxArrow(P, x, y - 6, "#e8e0b8"); } }
  } };
// Spike Trap: iron spikes spring up out of the ground, glint, then sink away.
PIXFX.v3_archer_b2_t2 = { dur: .6, n: 7, box: () => [48, 40, 24, 24],
  draw(P, f, n) {
    const h = [0, 5, 10, 11, 11, 7, 3][f]; if (f === 0) { P.ell(8, i => i % 2 ? "#6e6a66" : null); return; }
    [[-9, 2], [-4, 5], [0, 0], [5, 4], [10, 1]].forEach(([x, y], k) => { const hh = h - (k % 2); for (let r = 0; r < hh; r++) { const w = Math.max(0, 1 - Math.floor(r / (hh / 2.2))); P.rect(x - w - 1, y - r, 2 * w + 3, 1, PXD); }
      for (let r = 0; r < hh; r++) { const w = Math.max(0, 1 - Math.floor(r / (hh / 2.2))); P.rect(x - w, y - r, 2 * w + 1, 1, r > hh - 3 ? "#f0f0f8" : "#b8bcc4"); P.px(x - w, y - r, "#e8ecf4"); } });
    if (f >= 2 && f <= 4) for (let k = 0; k < 4; k++) P.rect(-12 + k * 8 + (f - 2) * (k % 2 ? 1 : -1), 6, 2, 1, "#b8b0a0");
  } };
// Net Shot: a net is thrown over the target, weights hold the corners, then it fades.
PIXFX.v3_archer_b2_t2b = { dur: .6, n: 7, box: () => [44, 50, 22, 34],
  draw(P, f, n) {
    const rx = [4, 7, 11, 11, 11, 11, 11][f], ry = Math.round(rx * .72), oy = f < 2 ? -22 + f * 12 : -2;
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { if ((x / rx) ** 2 + (y / ry) ** 2 > 1) continue; if (f === n - 1 && (x + y) % 2) continue; const edge = (x / rx) ** 2 + (y / ry) ** 2 > .78; if (edge) P.px(x, y + oy, "#8a6a3a"); else if ((x + y) % 4 === 0 || (x - y) % 4 === 0) P.px(x, y + oy, "#d9bf86"); }
    if (f >= 2 && f < n - 1) [[-rx, 0], [rx, 0], [0, -ry], [0, ry]].forEach(([x, y]) => { P.rect(x - 1, y + oy - 1, 3, 3, PXD); P.rect(x, y + oy, 1, 1, "#9a9aa8"); });
  } };
// Barricade & Minefield: sharpened stakes drive into the ground in an arc, mines scatter and blink.
PIXFX.v3_archer_b2_t4 = { dur: .9, n: 9, box: R => { R = Math.min(R, 44); const w = 2 * R + 20; return [w, R * 1.44 + 40, w / 2, R * .72 + 28]; },
  draw(P, f, n, R) {
    R = Math.min(R, 44);
    for (let k = 0; k < 7; k++) { const a = Math.PI * (.15 + .7 * k / 6), x = Math.round(Math.cos(a) * R * .7), y = Math.round(Math.sin(a) * R * .55), h = Math.min(10, Math.max(0, (f + 1 - k * .35) * 4)); if (h < 1 || (f === n - 1 && k % 2)) continue;
      P.rect(x - 2, y - h, 5, h + 1, PXD); P.rect(x - 1, y - h + 1, 3, h - 1, "#8a5a2b"); P.rect(x + 1, y - h + 1, 1, h - 1, "#5a3a1c"); P.rect(x, y - h - 1, 1, 1, "#d9bf86"); P.rect(x - 1, y - h, 3, 1, "#c9955a"); }
    for (let k = 0; k < 6; k++) { if (f < 3 + (k % 3) || (f === n - 1 && k % 2)) continue; const a = k * 1.1 + 2.3, x = Math.round(Math.cos(a) * R * .55), y = Math.round(Math.sin(a) * R * .4) - 8; P.rect(x - 3, y - 1, 7, 4, PXD); P.rect(x - 2, y, 5, 2, "#6e6a76"); P.px(x, y, (f + k) % 3 ? "#e0443a" : "#ffb0a0"); }
  } };
// Headshot: a reticle locks on, a tracer streaks in, a pop of light at the impact.
PIXFX.v3_archer_b3_t2 = { dur: .5, n: 6, box: () => [64, 64, 32, 36],
  draw(P, f) {
    if (f < 3) { const r = [13, 10, 7][f], c = f === 2 ? "#ff5a4a" : "#ffd0c0"; P.ell(r, () => c, 0, Math.PI * 2, 1); [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => P.line(dx * (r - 3), dy * (r - 3), dx * (r + 4), dy * (r + 4), c)); P.px(0, 0, c); }
    if (f >= 2 && f <= 3) { P.line(-30, -26 + f * 2, -2, -1, "#ffffff"); P.line(-30, -25 + f * 2, -2, 0, "#ff8a6a"); }
    if (f === 3) pxStar(P, 0, 0, 9, "#ffffff", "#ff8a6a");
    if (f >= 4) for (let k = 0; k < 6; k++) { const a = k * 1.05, d = 5 + (f - 3) * 4; P.rect(Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d), 2, 2, k % 2 ? "#ffffff" : "#ff8a6a"); }
  } };
// Dragon-Slayer Shot: a heavy reticle, a thick tracer, a shockwave and a big impact star.
PIXFX.v3_archer_b3_t4 = { dur: .8, n: 8, box: () => [84, 80, 42, 46],
  draw(P, f) {
    if (f < 4) { const r = [18, 14, 11, 9][f], c = f >= 2 ? "#ff5a4a" : "#ffd0c0"; P.ell(r, () => c, 0, Math.PI * 2, 1); P.ell(r - 4, i => i % 2 ? c : null, 0, Math.PI * 2, 1); [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => P.line(dx * (r - 4), dy * (r - 4), dx * (r + 7), dy * (r + 7), c)); P.px(0, 0, c); }
    if (f >= 3 && f <= 5) { const w = f === 3 ? 2 : 1; for (let k = -w; k <= w; k++) P.line(-40, -34 + k, 0, k, k ? "#ff9a3a" : "#ffffff"); }
    if (f === 4) pxStar(P, 0, 0, 16, "#ffffff", "#ffb43a");
    if (f >= 4) P.ell((f - 3) * 9, i => i % 3 < 2 ? (f < 6 ? "#ffd34d" : "#a8731a") : null);
    if (f >= 5) for (let k = 0; k < 8; k++) { const a = k * .8 + .3, d = 8 + (f - 4) * 5; P.rect(Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d * .8), 2, 2, k % 2 ? "#ffffff" : "#ffb43a"); }
  } };

// ----- Shaman -----
function pxTotem(P, x, y, h, body, face, glow) { // a carved totem pole, base at (x, y)
  P.rect(x - 4, y - h - 1, 9, h + 2, PXD); P.rect(x - 3, y - h, 7, h, body); P.rect(x + 2, y - h, 2, h, "#4a2e14"); P.rect(x - 3, y - h, 7, 2, face);
  for (let r = 3; r < h - 2; r += 6) { P.rect(x - 2, y - h + r, 2, 2, glow); P.rect(x + 1, y - h + r, 2, 2, glow); P.rect(x - 1, y - h + r + 3, 3, 1, PXD); }
  P.rect(x - 5, y - h + 3, 1, 3, face); P.rect(x + 5, y - h + 3, 1, 3, face);
}
// Chain Lightning: a bolt from the sky hits the target and arcs on to two more.
PIXFX.v3_shaman_b1_t2 = { dur: .5, n: 6, box: () => [72, 72, 36, 56],
  draw(P, f) {
    if (f < 5) pxBolt(P, 3, -52, 0, 0, f, 1, "#ffffff", "#9fd0ff");
    if (f >= 1 && f <= 4) { pxBolt(P, 0, -2, -18, 6, f, 5, "#ffffff", "#9fd0ff"); pxBolt(P, 0, -2, 16, 8, f, 9, "#ffffff", "#9fd0ff"); }
    if (f <= 2) pxStar(P, 0, 0, f ? 9 : 6, "#ffffff", "#9fd0ff");
    if (f >= 1 && f <= 3) { pxSpot(P, -18, 6, "#ffffff"); pxSpot(P, 16, 8, "#ffffff"); }
    if (f >= 3) for (let k = 0; k < 5; k++) P.px(Math.cos(k * 1.3) * (6 + f * 2), Math.sin(k * 1.3) * (4 + f), "#cfe8ff");
  } };
// Thunderclap: a flash of lightning, cracks run across the ground, a white shock ring spreads.
PIXFX.v3_shaman_b1_t2b = { dur: .7, n: 7, box: R => { const w = 2 * R + 14; return [w, w * .72 + 50, w / 2, w * .36 + 42]; },
  draw(P, f, n, R) {
    if (f < 2) pxBolt(P, 2, -44, 0, 0, f, 3, "#ffffff", "#9fd0ff");
    const t = Math.min(1, (f + 1) / 4), rad = Math.round(R * t);
    for (let k = 0; k < 5; k++) { const a = k * 1.26 + .3, L = rad * .9; let x = 0, y = 0; for (let s = 1; s <= 5; s++) { const nx = Math.cos(a) * L * s / 5 + (pxHash(k, s) - .5) * 4, ny = Math.sin(a) * L * s / 5 * .72 + (pxHash(k, s + 9) - .5) * 2; if (f < n - 1 || s < 3) { P.line(x, y + 1, nx, ny + 1, "#3a2414"); P.line(x, y, nx, ny, f < 4 ? "#9fd0ff" : "#5a4028"); } x = nx; y = ny; } }
    P.ell(rad, i => f < 6 && (i + f) % 4 < 3 ? (f < 3 ? "#ffffff" : "#cfe8ff") : null);
  } };
// Chrono-Storm: a dark storm cloud rolls in over the area and forks of lightning strike the ground beneath it.
PIXFX.v3_shaman_b1_t4 = { dur: 1.1, n: 10, box: R => { R = Math.min(R, 48); const w = 2 * R + 20; return [w, R * 1.44 + 74, w / 2, R * .72 + 62]; },
  draw(P, f, n, R) {
    R = Math.min(R, 48); const fade = f === n - 1 ? 2 : 1;
    P.ell(R, i => f < n - 1 && (i + f) % 6 < 2 ? "#9fd0ff" : null);
    const grow = Math.min(1, (f + 1) / 3); [[-14, 0, 9], [0, -3, 12], [14, 0, 9], [-6, 3, 7], [8, 3, 7]].forEach(([x, y, r], k) => pxBlob(P, Math.round(x * grow), -52 + y, Math.round(r * grow), ["#8a96b0", "#5e6a88", "#3e4866"], "#262c42", k));
    if (f >= 2 && f < n - 1) for (let k = 0; k < 3; k++) { if ((f + k) % 2) continue; const tx = (pxHash(k, f) - .5) * R * 1.4, ty = (pxHash(k, f + 20) - .5) * R * .9; pxBolt(P, tx * .3, -46, tx, ty, f, k * 7, "#ffffff", "#9fd0ff"); pxSpot(P, Math.round(tx), Math.round(ty), "#ffffff"); }
  } };
// Grounding Totem: a small totem is planted, a green rune pulse runs round it and healing motes rise.
PIXFX.v3_shaman_b2_t1 = { dur: .9, n: 8, box: R => { R = Math.min(R, 40); const w = 2 * R + 14; return [w, R * 1.44 + 40, w / 2, R * .72 + 28]; },
  draw(P, f, n, R) {
    R = Math.min(R, 40); const h = Math.min(14, (f + 1) * 5);
    pxTotem(P, 0, 4, h, "#8a5a2b", "#c9862f", "#7fe08a");
    if (f >= 1 && f < n - 1) P.ell(Math.round(R * Math.min(1, f / 4)), i => (i + f * 2) % 6 < 2 ? "#7fe08a" : null);
    for (let k = 0; k < 7; k++) { if (f < 2 || (f === n - 1)) continue; const a = k * .9, x = Math.cos(a) * R * .7 * pxHash(k, 1), y = Math.sin(a) * R * .5 * pxHash(k, 1) - ((f * 3 + k * 4) % 20); pxSpot(P, Math.round(x), Math.round(y), k % 2 ? "#7fe08a" : "#d4ffd8"); }
  } };
// Earthgrab Totem: roots burst out of the ground in a ring and twist.
PIXFX.v3_shaman_b2_t2 = { dur: .9, n: 8, box: R => { R = Math.min(R, 40); const w = 2 * R + 20; return [w, R * 1.44 + 40, w / 2, R * .72 + 28]; },
  draw(P, f, n, R) {
    R = Math.min(R, 40);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + .3, bx = Math.round(Math.cos(a) * R * .75), by = Math.round(Math.sin(a) * R * .55), h = Math.round(Math.min(14, Math.max(0, (f + 1 - (k % 3) * .4) * 4.5))); if (f === n - 1 && k % 2) continue;
      let x = bx, y = by; for (let s = 0; s < h; s++) { x = bx + Math.round(Math.sin(s * .5 + k + f * .5) * (s / h) * 3); y = by - s; P.rect(x - 2, y, 5, 1, PXD); } x = bx; for (let s = 0; s < h; s++) { x = bx + Math.round(Math.sin(s * .5 + k + f * .5) * (s / h) * 3); y = by - s; P.rect(x - 1, y, 3, 1, s % 3 ? "#7a5a2b" : "#9a7a3a"); } if (h > 6) P.px(x + 1, by - h, "#7fe08a");
      if (f <= 3) P.rect(bx - 3 + (k % 2) * 6, by + 1, 2, 2, "#6a4a2a"); }
    P.ell(R, i => f < 6 && (i + f) % 8 < 1 ? "#6a4a2a" : null);
  } };
// Totem of the Titan: a tall gold-faced totem rises, a shock ring runs out, green motes pour upward.
PIXFX.v3_shaman_b2_t4 = { dur: 1.0, n: 10, box: R => { R = Math.min(R, 48); const w = 2 * R + 14; return [w, R * 1.44 + 66, w / 2, R * .72 + 54]; },
  draw(P, f, n, R) {
    R = Math.min(R, 48); const h = Math.min(30, (f + 1) * 8);
    if (f >= 1 && f < n - 1) P.ell(Math.round(R * Math.min(1, f / 4)), i => (i + f * 2) % 5 < 3 ? (f < 4 ? "#fff3c0" : "#7fe08a") : null);
    pxTotem(P, 0, 6, h, "#7a4e2a", "#ffd34d", "#7fe08a"); if (f >= 3 && f < n - 1) P.rect(-6, 6 - h + 4, 13, 1, "#ffd34d");
    if (f >= 3 && f < n - 1) for (let k = 0; k < 8; k++) { const a = k * .8, x = Math.cos(a) * R * .6 * pxHash(k, 2), y = Math.sin(a) * R * .4 * pxHash(k, 2) - ((f * 3 + k * 5) % 30); pxSpot(P, Math.round(x), Math.round(y), k % 2 ? "#7fe08a" : "#ffe29a"); }
  } };
// Ancestral Grasp: pale spirit hands reach up out of the ground, grip, and fade.
function pxHand(P, x, y, curl, c1, c2) { // a spirit hand with four fingers and a thumb, base at (x, y); curl 0..1 bends the fingers in
  const H = [8, 10, 9, 7];
  P.rect(x - 3, y, 7, 4, PXD); P.rect(x - 2, y, 5, 4, c2); P.rect(x - 1, y + 4, 3, 5, c2);
  for (let i = 0; i < 4; i++) { const fx = x - 3 + i * 2 - (i > 1 ? 0 : 0), fh = Math.round(H[i] - curl * 5), lean = Math.round(curl * (1.5 - i) * -1.2);
    P.rect(fx - 1, y - fh - 1, 3, fh + 2, PXD); P.rect(fx, y - fh, 1, fh, c1); P.rect(fx + lean, y - fh - 1, 1, 1, "#ffffff"); }
  P.rect(x - 6, y - 4 + Math.round(curl * 2), 3, 5, PXD); P.rect(x - 5, y - 3 + Math.round(curl * 2), 1, 4, c1);
}
PIXFX.v3_shaman_b3_t2 = { dur: .9, n: 8, box: R => { R = Math.min(R, 40); const w = 2 * R + 20; return [w, R * 1.44 + 36, w / 2, R * .72 + 24]; },
  draw(P, f, n, R) {
    R = Math.min(R, 40);
    for (let k = 0; k < 5; k++) { const a = k * 1.26 + .4, x = Math.round(Math.cos(a) * R * .7), y = Math.round(Math.sin(a) * R * .5), rise = Math.min(1, (f + 1 - k * .3) / 3), cur = f >= 4 ? Math.min(1, (f - 3) / 2) : 0; if (rise <= 0 || (f === n - 1 && k % 2)) continue;
      P.rect(x - 4, y, 9, 1, "#3a2a4a"); pxHand(P, x, y - 4 - Math.round(rise * 4) + 6 * (1 - rise), cur, "#d4c4ff", "#a090d8"); }
    for (let k = 0; k < 8; k++) { if (f < 1) continue; const x = (pxHash(k, 1) - .5) * 2 * R * .8, y = (pxHash(k, 2) - .5) * R * .8 - ((f * 3 + k * 3) % 22); P.px(x, y, k % 2 ? "#d4c4ff" : "#8e5fd8"); }
  } };
// Hex: a spinning purple hexagram hangs over the target, wisps curl around it.
PIXFX.v3_shaman_b3_t2b = { dur: .7, n: 7, box: () => [52, 62, 26, 46],
  draw(P, f, n) {
    const cy = -20 - (f < 3 ? f : 3), rot = f * .45, r = f === 0 ? 5 : f === n - 1 ? 7 : 10;
    for (let t = 0; t < 2; t++) for (let k = 0; k < 3; k++) { const a0 = rot + t * Math.PI / 3 + k * 2 * Math.PI / 3, a1 = rot + t * Math.PI / 3 + (k + 1) * 2 * Math.PI / 3; P.line(Math.cos(a0) * r, cy + Math.sin(a0) * r, Math.cos(a1) * r, cy + Math.sin(a1) * r, t ? "#c9a0ff" : "#8e5fd8"); }
    P.ell(r + 2, i => (i + f * 2) % 4 < 2 && f < n - 1 ? "#6e48b8" : null, 0, Math.PI * 2, 1); for (let k = 0; k < 6; k++) P.px(Math.cos(k * 1.05 + rot) * (r + 2), cy + Math.sin(k * 1.05 + rot) * (r + 2), "#ffffff");
    if (f >= 2) for (let k = 0; k < 6; k++) { const a = k * 1.05 + f, d = 6 + (k % 3) * 3; P.px(Math.cos(a) * d, -4 - ((f * 3 + k * 4) % 14) + Math.sin(a) * 2, k % 2 ? "#c9a0ff" : "#6e48b8"); }
  } };

// ----- Rogue -----
// Ambush: a dagger stabs in from behind and a slash flashes across, with red sparks.
PIXFX.v3_rogue_b1_t2 = { dur: .5, n: 6, box: () => [48, 52, 24, 30],
  draw(P, f) {
    if (f <= 1) { const x = f ? 3 : -4, y = f ? -2 : -8; P.line(x + 6, y - 6, x, y, PXD); P.line(x + 6, y - 5, x + 1, y, "#e8ecf4"); P.line(x + 7, y - 7, x + 5, y - 5, "#8a5a2b"); }
    if (f >= 1 && f <= 3) { const L = [8, 14, 10][f - 1]; P.line(L, -L, -L, L, "#ffffff"); P.line(L, -L + 1, -L + 1, L, "#ff8a8a"); if (f >= 2) P.line(L - 3, -L, -L - 3, L, "#d34a4a"); }
    if (f >= 2) for (let k = 0; k < 6; k++) { const a = k * 1.05 + .5, d = 4 + (f - 1) * 4; P.rect(Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d), 2, 2, k % 2 ? "#d34a4a" : "#8a1a1a"); }
  } };
// Smoke Bomb: a bomb pops and billows into grey puffs that rise and thin out.
PIXFX.v3_rogue_b1_t2b = { dur: 1.0, n: 8, box: R => { R = Math.min(R, 36); const w = 2 * R + 24; return [w, R * 1.44 + 50, w / 2, R * .72 + 36]; },
  draw(P, f, n, R) {
    R = Math.min(R, 36);
    if (f === 0) { P.rect(-3, -6, 7, 7, PXD); P.rect(-2, -5, 5, 5, "#3a3a44"); P.px(1, -7, "#ffb43a"); P.px(2, -8, "#ffe29a"); return; }
    const t = Math.min(1, f / 4), lift = f > 4 ? (f - 4) * 3 : 0;
    for (let k = 0; k < 7; k++) { const a = k * 0.9 + .3, d = R * .75 * t * (k % 2 ? 1 : .6), r = Math.round((5 + pxHash(k, 2) * 3) * (f > 5 ? 1 - (f - 5) * .22 : 1)); if (r < 2) continue;
      pxBlob(P, Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d * .7) - lift - 4, r, f > 5 ? ["#8a8a98", "#74748a", "#5e5e72"] : ["#b8b8c8", "#8a8a9a", "#5e5e72"], "#33333f", k); }
    if (f <= 2) pxStar(P, 0, -4, 8, "#ffffff", "#ffe29a");
  } };
// Caltrop Bomb: a pop, then spiked caltrops scatter over the ground and stick there, leaking green poison.
PIXFX.v3_rogue_b2_t2 = { dur: .6, n: 7, box: R => { const w = 2 * R + 24; return [w, R * 1.44 + 40, w / 2, R * .72 + 26]; },
  draw(P, f, n, R) {
    if (f === 0) pxStar(P, 0, -4, 6, "#ffffff", "#7ad84a");
    for (let k = 0; k < 9; k++) { const a = k * .7 + .2, d = R * (.35 + .65 * pxHash(k, 4)), tx = Math.cos(a) * d, ty = Math.sin(a) * d * .72, t = Math.min(1, (f + 1) / 4), arc = Math.sin(t * Math.PI) * 14 * (1 - t * .3);
      const x = Math.round(tx * t), y = Math.round(ty * t - arc); if (f === n - 1 && k % 2) continue;
      P.line(x - 3, y + 1, x + 3, y + 1, PXD); P.line(x, y - 3, x, y + 2, PXD); P.rect(x - 2, y, 5, 1, "#b8bcc4"); P.rect(x, y - 2, 1, 3, "#d8dce4"); P.px(x, y - 3, "#7ad84a"); P.px(x - 3, y, "#7ad84a"); P.px(x + 3, y, "#7ad84a"); }
    if (f >= 4) for (let k = 0; k < 6; k++) P.px((pxHash(k, 1) - .5) * R * 1.6, (pxHash(k, 2) - .5) * R * 1.0 + 2, k % 2 ? "#7ad84a" : "#4a9a2a");
  } };
// Deadly Cloud: a green poison cloud billows with rising bubbles and a drifting skull.
PIXFX.v3_rogue_b2_t4 = { dur: 1.2, n: 10, box: R => { R = Math.min(R, 36); const w = 2 * R + 28; return [w, R * 1.44 + 56, w / 2, R * .72 + 42]; },
  draw(P, f, n, R) {
    R = Math.min(R, 36); const t = Math.min(1, (f + 1) / 4), thin = f > 7 ? (f - 7) * .25 : 0;
    for (let k = 0; k < 8; k++) { const a = k * .8 + .1, d = R * .8 * t * (k % 3 ? 1 : .4), r = Math.round((6 + pxHash(k, 2) * 4) * (1 - thin)); if (r < 2) continue;
      pxBlob(P, Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d * .7) - 6 - Math.round(Math.sin(f * .6 + k) * 1.5), r, ["#b8f08a", "#7ad84a", "#4a9a2a"], "#2a6a1a", k + f * 0); }
    for (let k = 0; k < 6; k++) { const x = (pxHash(k, 1) - .5) * R * 1.2, y = -((f * 3 + k * 5) % 24); if (f > 1) P.rect(Math.round(x), Math.round(y), 2, 2, "#d4ffb8"); }
    if (f >= 3 && f <= 8) { const y = -16 - (f - 3) * 2; P.rect(-4, y - 1, 9, 8, PXD); P.rect(-3, y, 7, 5, "#e8f4d8"); P.rect(-3, y + 5, 7, 2, "#e8f4d8"); P.rect(-2, y + 2, 2, 2, PXD); P.rect(2, y + 2, 2, 2, PXD); P.rect(0, y + 5, 1, 1, PXD); }
  } };
// Riposte: two blades cross in a parry with a bright clang.
PIXFX.v3_rogue_b3_t2 = { dur: .5, n: 6, box: () => [52, 52, 26, 30],
  draw(P, f) {
    const L = f === 0 ? 8 : 13; if (f <= 3) { for (const s of [1, -1]) { P.line(-L * s, -L, L * s, L, PXD); P.line(-L * s, -L + 1, L * s - s, L, f === 0 ? "#cfd4dc" : "#ffffff"); } }
    if (f >= 1 && f <= 3) pxStar(P, 0, 0, f === 1 ? 8 : 12, "#ffffff", "#ffd34d");
    if (f >= 2) for (let k = 0; k < 8; k++) { const a = k * .8 + .2, d = 8 + (f - 1) * 4; P.rect(Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d), 2, 2, k % 2 ? "#ffe29a" : "#ffffff"); }
    if (f >= 4) P.ell(10 + (f - 3) * 3, i => i % 3 < 1 ? "#ffe29a" : null, 0, Math.PI * 2, 1);
  } };
// Blade Fury: a flurry of quick slashes from every angle, with red sparks.
PIXFX.v3_rogue_b3_t4 = { dur: .8, n: 8, box: () => [60, 60, 30, 34],
  draw(P, f, n) {
    const A = [[-12, 10, 12, -10], [12, 10, -12, -10], [-14, 0, 14, 0], [0, 14, 0, -14], [-10, -12, 10, 12], [10, -12, -10, 12]];
    A.forEach((s, k) => { const st = k * 1.2, g = f - st; if (g < 0 || g > 2.2) return; const t = Math.min(1, g / 1.2), x1 = s[0] + (s[2] - s[0]) * t, y1 = s[1] + (s[3] - s[1]) * t, x0 = s[0] + (s[2] - s[0]) * Math.max(0, t - .7), y0 = s[1] + (s[3] - s[1]) * Math.max(0, t - .7);
      P.line(x0, y0 + 1, x1, y1 + 1, "#b02a5a"); P.line(x0, y0, x1, y1, g < 1.4 ? "#ffffff" : "#ff8ab0"); });
    for (let k = 0; k < 10; k++) { const a = k * .63, d = 4 + f * 3 + pxHash(k, 1) * 5; if (f > 1 && f < n) P.rect(Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d), 2, 2, k % 2 ? "#d04a8a" : "#c0204a"); }
  } };
