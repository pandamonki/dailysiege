// Wall tiles

// ----- walls -----
function drawWallTile(c, r, q, tier, frac, color, t, dir) {
  const x = q * ts, y = r * ts;
  c.save();
  if (dir === "v") { c.translate(x + ts / 2, y + ts / 2); c.rotate(Math.PI / 2); c.translate(-x - ts / 2, -y - ts / 2); }
  if (frac <= 0) { c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(x + ts / 2, y + ts * .72, ts * .4, ts * .13, 0, 0, 7); c.fill(); c.fillStyle = "#6f6a5f"; [[.2, .74, .16], [.45, .78, .2], [.7, .72, .14]].forEach(([a, b, s]) => c.fillRect(x + a * ts, y + b * ts - s * ts * .5, s * ts, s * ts * .6)); c.restore(); return; }
  c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(x + ts / 2, y + ts * .82, ts * .46, ts * .12, 0, 0, 7); c.fill();
  const top = y + ts * (tier === 1 ? .3 : tier === 2 ? .28 : .2), hgt = y + ts * .82 - top;
  if (tier === 1) { // palisade of sharpened logs
    for (let i = 0; i < 4; i++) { const px = x + ts * (.08 + i * .24), ph = hgt * (.85 + ((i * 7) % 3) * .08);
      c.fillStyle = i % 2 ? "#7a5330" : "#8a5e36"; c.fillRect(px, y + ts * .82 - ph, ts * .2, ph);
      c.beginPath(); c.moveTo(px, y + ts * .82 - ph); c.lineTo(px + ts * .1, y + ts * .82 - ph - ts * .12); c.lineTo(px + ts * .2, y + ts * .82 - ph); c.fill();
      c.strokeStyle = "#2a1a0c"; c.lineWidth = 1; c.strokeRect(px, y + ts * .82 - ph, ts * .2, ph); }
    c.fillStyle = "#5a3a1e"; c.fillRect(x + ts * .04, y + ts * .55, ts * .92, ts * .06);
  } else if (tier === 2) { // timber and stone footing
    c.fillStyle = "#8a857a"; c.fillRect(x + ts * .02, y + ts * .62, ts * .96, ts * .2);
    c.fillStyle = "#9a6a3a"; c.fillRect(x + ts * .02, top, ts * .96, ts * .34);
    c.fillStyle = "#6e4824"; for (let i = 1; i < 4; i++) c.fillRect(x + ts * (.02 + i * .24), top, ts * .03, ts * .34);
    c.fillStyle = "#b88a54"; c.fillRect(x + ts * .02, top, ts * .96, ts * .05);
    c.strokeStyle = "#2a1a0c"; c.lineWidth = 1; c.strokeRect(x + ts * .02, top, ts * .96, ts * .54);
  } else { // stone with merlons
    c.fillStyle = "#a39d8f"; c.fillRect(x + ts * .02, top + ts * .08, ts * .96, hgt - ts * .08);
    c.fillStyle = "#bdb7a9"; for (let i = 0; i < 3; i++) c.fillRect(x + ts * (.02 + i * .36), top, ts * .24, ts * .1);
    c.strokeStyle = "#6f6a5f"; c.lineWidth = 1; for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(x + ts * .02, top + ts * (.2 + j * .15)); c.lineTo(x + ts * .98, top + ts * (.2 + j * .15)); c.stroke(); }
    c.strokeStyle = "#2a1a0c"; c.strokeRect(x + ts * .02, top + ts * .08, ts * .96, hgt - ts * .08);
  }
  c.fillStyle = color; c.fillRect(x + ts * .06, y + ts * .86, ts * .88, ts * .045); // owner trim
  if (frac < .55) { c.strokeStyle = "rgba(20,12,6,.8)"; c.lineWidth = ts * .03; c.beginPath(); c.moveTo(x + ts * .3, top); c.lineTo(x + ts * .42, y + ts * .55); c.lineTo(x + ts * .34, y + ts * .8); c.moveTo(x + ts * .7, top + ts * .06); c.lineTo(x + ts * .62, y + ts * .6); c.stroke(); }
  if (dir === "v") { c.restore(); c.save(); }
  if (frac < 1) { const bw = ts * .8; c.fillStyle = "rgba(20,12,6,.85)"; c.fillRect(x + ts * .1 - 1, y + ts * .9 - 1, bw + 2, ts * .07 + 2); c.fillStyle = frac > .5 ? "#47b04b" : "#d4402f"; c.fillRect(x + ts * .1, y + ts * .9, bw * frac, ts * .07); }
  c.restore();
}
const WALL_URL = {};
function wallURL(tier) {
  tier = Math.max(1, Math.min(3, tier)); if (WALL_URL[tier]) return WALL_URL[tier];
  const cv = document.createElement("canvas"); cv.width = 80; cv.height = 64; const c = cv.getContext("2d");
  c.translate(2, 6); c.scale(26 / ts, 26 / ts); c.translate(26, 0); drawWallTile(c, 0, 0, tier, 1, "#2f5fa8", 0); return (WALL_URL[tier] = cv.toDataURL());
}
