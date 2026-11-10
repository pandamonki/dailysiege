// Ultimate spell effects. drawUltFx(c, e, age, ts): e = {k, x, y, x0, y0, r, col, seed}, positions in tiles, c = 2d context
function drawUltFx(c, e, age, ts) {
  const A = (hex, a) => hexA(hex, Math.max(0, Math.min(1, a))), Hh = (i, s) => hash(i, s, 7), x = e.x * ts, y = e.y * ts, R = (e.r || 2) * ts, lerp = (a, b, k) => a + (b - a) * k, ease = k => 1 - (1 - k) * (1 - k);
  c.save(); c.lineCap = "round";
  const glow = (gx, gy, rr, col, al) => { const g = c.createRadialGradient(gx, gy, 0, gx, gy, rr); g.addColorStop(0, A(col, al)); g.addColorStop(1, A(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(gx, gy, rr, 0, 7); c.fill(); };
  const ell = (gx, gy, rr, fill, stroke, w) => { c.beginPath(); c.ellipse(gx, gy, rr, rr * .72, 0, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = w; c.stroke(); } };
  const spark = (px, py, s, col) => { c.fillStyle = col; c.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), Math.max(1, Math.round(s)), Math.max(1, Math.round(s))); };
  const rune = (rr, rot, col, al, n) => { ell(x, y, rr, null, A(col, al), ts * .05); for (let i = 0; i < n; i++) { const a = rot + i * Math.PI * 2 / n, ix = x + Math.cos(a) * rr, iy = y + Math.sin(a) * rr * .72, ox = x + Math.cos(a) * (rr + ts * .16), oy = y + Math.sin(a) * (rr + ts * .16) * .72; c.strokeStyle = A(col, al); c.lineWidth = ts * .045; c.beginPath(); c.moveTo(ix, iy); c.lineTo(ox, oy); c.stroke(); } };
  if (e.k === "laststand") { // charge, pillar of light, shockwave with cracks, rising sparks
    const p = age / 1.8, q = 1 - p;
    c.globalCompositeOperation = "lighter";
    rune(R * (.55 + .45 * ease(Math.min(1, age / .35))), age * 1.6, "#ffd86b", q, 12);
    if (age < .35) for (let i = 0; i < 14; i++) { const a = i * .45 + 1, d = R * 1.1 * (1 - age / .35) + ts * .1; spark(x + Math.cos(a) * d, y + Math.sin(a) * d * .72 - ts * .3, ts * .09, A("#fff0b0", .9)); }
    if (age > .12 && age < 1.0) { const k = (age - .12) / .88, w = ts * (1.1 * (1 - k) + .25), g = c.createLinearGradient(0, y - ts * 5, 0, y); g.addColorStop(0, A("#ffd86b", 0)); g.addColorStop(1, A("#ffe9a0", .95 * (1 - k * .6)));
      c.fillStyle = g; c.fillRect(x - w / 2, y - ts * 5, w, ts * 5); c.fillStyle = A("#ffffff", .9 * (1 - k)); c.fillRect(x - w * .18, y - ts * 5, w * .36, ts * 5); glow(x, y - ts * .2, ts * 1.6 * (1 - k * .5), "#ffe082", .7 * (1 - k)); }
    if (age > .3) { const k = Math.min(1, (age - .3) / .7), f = 1 - k; ell(x, y, R * ease(k), A("#ffe082", .22 * f), A("#fff3c0", .95 * f), ts * .08); ell(x, y, R * ease(Math.max(0, k - .15)) * .8, null, A("#ffb43a", .7 * f), ts * .05);
      for (let i = 0; i < 9; i++) { const a = i * .7 + .3, L = R * .85 * ease(k); c.strokeStyle = A("#fff0b0", .8 * f); c.lineWidth = ts * .035; c.beginPath(); c.moveTo(x + Math.cos(a) * ts * .3, y + Math.sin(a) * ts * .22); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L * .72); c.stroke(); } }
    for (let i = 0; i < 22; i++) { const st = Hh(i, 1) * .6, k = (age - .25 - st) / 1.1; if (k < 0 || k > 1) continue; const a = Hh(i, 2) * 6.28, d = R * Hh(i, 3) * .9; spark(x + Math.cos(a) * d, y + Math.sin(a) * d * .72 - k * ts * 2.2, ts * .08 * (1 - k) + 1, A("#fff0b0", 1 - k)); }
  } else if (e.k === "meteorfall") { // ground shadow grows, fireball streaks in with a flame trail
    const p = age / 1.6, tx = x, ty = y;
    ell(tx, ty, R * (.35 + .65 * p), A("#000", .22 + .22 * p), null);
    ell(tx, ty, R, null, A("#ff5a2a", .35 + .4 * Math.abs(Math.sin(age * 10))), ts * .05);
    const k = Math.max(0, (age - .6) / 1), kk = k * k, sx = tx + ts * 4.5 * (1 - kk), sy = ty - ts * 7 * (1 - kk);
    if (age > .6) { c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 18; i++) { const b = i / 18, px = lerp(sx, sx + ts * 2.6, b) + (Hh(i, Math.floor(age * 20)) - .5) * ts * .3, py = lerp(sy, sy - ts * 4.1, b) + (Hh(i, 5) - .5) * ts * .3; glow(px, py, ts * (.5 - b * .35), b < .4 ? "#ffb43a" : "#ff5a2a", .7 * (1 - b)); }
      glow(sx, sy, ts * .95, "#ff7a2a", .8); c.globalCompositeOperation = "source-over"; ell(sx, sy, 0, null, null, 0); c.fillStyle = "#3a2218"; c.beginPath(); c.arc(sx, sy, ts * .42, 0, 7); c.fill(); c.fillStyle = "#ff8a3a"; c.beginPath(); c.arc(sx - ts * .1, sy - ts * .08, ts * .3, 0, 7); c.fill(); c.fillStyle = "#fff0b0"; c.beginPath(); c.arc(sx - ts * .16, sy - ts * .14, ts * .15, 0, 7); c.fill(); }
  } else if (e.k === "meteorhit") { // white flash, fireball, shockwave, scorch, flying embers and smoke
    const p = age / 2.2, q = 1 - p;
    ell(x, y, R * .95, A("#120a08", .5 * Math.max(0, 1 - Math.max(0, p - .5) * 2)), null);
    c.globalCompositeOperation = "lighter";
    if (age < .18) { c.fillStyle = A("#fff4d0", .9 * (1 - age / .18)); c.beginPath(); c.ellipse(x, y, R * 1.2, R * .9, 0, 0, 7); c.fill(); }
    const fb = Math.min(1, age / .45); if (age < 1) glow(x, y - ts * .4, R * (.5 + .6 * ease(fb)), "#ff7a2a", .85 * (1 - age));
    if (age < .9) glow(x, y - ts * .5, R * .5 * (1 - age / .9), "#fff0b0", 1 - age / .9);
    { const k = Math.min(1, age / .8); ell(x, y, R * 1.15 * ease(k), null, A("#ffb43a", 1 - k), ts * .12); ell(x, y, R * .8 * ease(k), null, A("#ff5a2a", .8 * (1 - k)), ts * .07); }
    for (let i = 0; i < 26; i++) { const a = Hh(i, 1) * 6.28, v = (.5 + Hh(i, 2)) * R * 1.6, k = age; if (k > 1.3) continue; const px = x + Math.cos(a) * v * k, py = y + Math.sin(a) * v * k * .6 - (v * .7 * k - 3.2 * ts * k * k) * .5; spark(px, py, ts * .1, A(i % 3 ? "#ffb43a" : "#fff0b0", 1 - k / 1.3)); }
    c.globalCompositeOperation = "source-over";
    for (let i = 0; i < 8; i++) { const k = Math.min(1, Math.max(0, (age - .15 - i * .04) / 1.6)); if (k <= 0 || k >= 1) continue; const a = i * .8 + .2, d = R * .5 * Hh(i, 4); c.fillStyle = A("#3a3430", .5 * (1 - k)); c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .6 - k * ts * 1.8, ts * (.3 + .5 * k), 0, 7); c.fill(); }
  } else if (e.k === "arrowwave") { // a wave of arrows hammering down with ground shadows and dust
    const D = .8;
    for (let i = 0; i < 12; i++) { const st = Hh(i, 1) * .35, k = (age - st) / .3, a = Hh(i, 2) * 6.28, d = R * Math.sqrt(Hh(i, 3)), ax = x + Math.cos(a) * d, ay = y + Math.sin(a) * d * .72;
      if (k > 0 && k < 1) { ell(ax, ay, ts * .12 + ts * .1 * k, A("#000", .25 * k), null); const hy = ay - ts * 3.6 * (1 - k); c.strokeStyle = "#e8dcb0"; c.lineWidth = ts * .045; c.beginPath(); c.moveTo(ax - ts * .12, hy - ts * .75); c.lineTo(ax, hy); c.stroke(); c.strokeStyle = "#c0392b"; c.beginPath(); c.moveTo(ax - ts * .12, hy - ts * .75); c.lineTo(ax - ts * .06, hy - ts * .6); c.stroke(); spark(ax, hy, ts * .1, "#fff"); }
      else if (k >= 1 && age < D) { const m = (age - st - .3) / (D - st - .3); if (m < 1) { c.strokeStyle = A("#d9c38a", 1 - m); c.lineWidth = ts * .04; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax - ts * .06, ay - ts * .45); c.stroke(); ell(ax, ay, ts * .1 + ts * .28 * m, null, A("#e6d9a8", .8 * (1 - m)), ts * .03); } } }
  } else if (e.k === "spirit") { // sigil, wisps spiralling in then bursting out, howl ring
    const p = age / 1.8, q = 1 - p, col = e.col || "#8fd8ff"; c.globalCompositeOperation = "lighter";
    glow(x, y - ts * .3, R * (.6 + .5 * Math.sin(Math.min(1, p * 2) * 1.57)), col, .35 * q);
    rune(R * (.5 + .5 * ease(Math.min(1, age / .3))), -age * 1.8, col, q, 8); rune(R * .55, age * 2.4, "#ffffff", q * .6, 5);
    for (let i = 0; i < 16; i++) { const k = Math.min(1, age / .55), a = i * .39 + age * 5 * (1 - k * .6), d = R * 1.2 * (1 - ease(k)) + ts * .2; if (age < .55) { spark(x + Math.cos(a) * d, y - ts * .3 + Math.sin(a) * d * .72, ts * .1, A("#ffffff", .9)); } else { const kk = (age - .55) / 1.2; if (kk < 1) { const aa = i * .39, dd = R * ease(kk) * (.5 + Hh(i, 2) * .6); spark(x + Math.cos(aa) * dd, y - ts * .3 + Math.sin(aa) * dd * .72 - kk * ts * 1.1, ts * .12 * (1 - kk) + 1, A(i % 2 ? col : "#ffffff", 1 - kk)); } } }
    if (age > .5) { const k = Math.min(1, (age - .5) / .8), f = 1 - k; ell(x, y, R * 1.05 * ease(k), A(col, .14 * f), A("#ffffff", .9 * f), ts * .07); ell(x, y, R * .7 * ease(k), null, A(col, .8 * f), ts * .05); }
  } else if (e.k === "assassin") { // vanish puff, shadow trail with afterimages, crossed cuts, blood spray
    const ox = e.x0 * ts, oy = e.y0 * ts, p = age / 1.2;
    if (age < .6) { const k = age / .6; for (let i = 0; i < 7; i++) { const a = i * .9, d = ts * .5 * k * (.6 + Hh(i, 1)); c.fillStyle = A(i % 2 ? "#2a2433" : "#52405e", .7 * (1 - k)); c.beginPath(); c.arc(ox + Math.cos(a) * d, oy - ts * .3 + Math.sin(a) * d * .6 - k * ts * .5, ts * (.22 + .25 * k), 0, 7); c.fill(); } }
    if (age < .45) { const k = age / .45; c.strokeStyle = A("#1a1020", .8 * (1 - k)); c.lineWidth = ts * .5 * (1 - k * .6); c.beginPath(); c.moveTo(ox, oy - ts * .4); c.lineTo(x, y - ts * .4); c.stroke(); c.strokeStyle = A("#d04a8a", .9 * (1 - k)); c.lineWidth = ts * .06; c.beginPath(); c.moveTo(ox, oy - ts * .4); c.lineTo(x, y - ts * .4); c.stroke();
      for (let i = 1; i < 4; i++) { const b = i / 4 * Math.min(1, k * 2.2); c.fillStyle = A("#241a30", .55 * (1 - k)); c.fillRect(lerp(ox, x, b) - ts * .13, lerp(oy, y, b) - ts * .62, ts * .26, ts * .5); } }
    const s = age - .12; if (s > 0 && s < .5) { const k = s / .5, f = 1 - k; c.globalCompositeOperation = "lighter"; glow(x, y - ts * .4, ts * 1.3 * f + ts * .3, "#ff4a7a", .7 * f);
      [[1, 1], [1, -1]].forEach(([dx, dy], j) => { const g = Math.min(1, Math.max(0, (s - j * .05) / .12)), L = ts * 1.4 * ease(g); c.strokeStyle = A("#ffffff", f); c.lineWidth = ts * .07 * f + 1; c.beginPath(); c.moveTo(x - dx * L * .5, y - ts * .4 - dy * L * .5); c.lineTo(x + dx * L * .5, y - ts * .4 + dy * L * .5); c.stroke(); c.strokeStyle = A("#e0306a", .8 * f); c.lineWidth = ts * .16 * f + 1; c.globalAlpha = .5; c.stroke(); c.globalAlpha = 1; });
      for (let i = 0; i < 12; i++) { const a = Hh(i, 1) * 6.28, v = ts * (1 + Hh(i, 2) * 1.6); spark(x + Math.cos(a) * v * k, y - ts * .4 + Math.sin(a) * v * k * .7 + k * k * ts * .8, ts * .1, A("#c0204a", f)); }
      c.globalCompositeOperation = "source-over"; ell(x, y, R * .9 * ease(k), null, A("#ff4a7a", .9 * f), ts * .05); }
  }
  c.restore();
}
