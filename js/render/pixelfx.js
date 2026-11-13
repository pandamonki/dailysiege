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
