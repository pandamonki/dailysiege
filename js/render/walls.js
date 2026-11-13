// Wall tiles

// ----- walls: pixel-art sprites at 16 pixels to a tile, like the trees and units, scaled up with hard edges -----
const WALL_EDGE = [38, 24, 12, 200]; // dark brown outline
// one sprite per tier and direction: "h" runs across the tile (seen from the front), "v" runs up the screen (seen end-on, mostly its top)
function wallSprite(tier, dir) {
  return terrainSprite(`wall${tier}${dir}`, 16, 16, (px, rect) => {
    const H = dir !== "v";
    if (tier === 1) { // palisade of sharpened logs
      if (H) for (let i = 0; i < 4; i++) { const x0 = 1 + i * 4 - (i ? 0 : 0), top = 4 + ((i * 7) % 3), w = 3;
        rect(x0, top, w, 13 - top, i % 2 ? "#7a5330" : "#8a5e36"); rect(x0, top, 1, 13 - top, "#a87444"); rect(x0 + w - 1, top, 1, 13 - top, "#5a3a1e");
        px(x0 + 1, top - 1, "#a87444"); px(x0 + 1, top - 2, "#8a5e36"); }
      else for (let j = 0; j < 4; j++) { const y0 = 1 + j * 3; rect(6, y0, 4, 3, j % 2 ? "#7a5330" : "#8a5e36"); px(7, y0 + 1, "#c99a62"); px(8, y0 + 1, "#a87444"); rect(6, y0 + 2, 4, 1, "#5a3a1e"); }
      if (H) rect(1, 9, 14, 1, "#4a2f17"); else rect(6, 13, 4, 1, "#4a2f17");
    } else if (tier === 2) { // timber on a stone footing
      if (H) { rect(0, 10, 16, 3, "#8a857a"); rect(0, 10, 16, 1, "#a39d8f"); for (let x = 2; x < 16; x += 5) px(x, 11, "#6f6a5f"); for (let x = 4; x < 16; x += 5) px(x, 12, "#6f6a5f");
        rect(0, 5, 16, 5, "#9a6a3a"); rect(0, 5, 16, 1, "#c99a62"); for (let x = 3; x < 16; x += 4) rect(x, 6, 1, 4, "#6e4824"); rect(0, 9, 16, 1, "#6e4824"); }
      else { rect(5, 1, 6, 11, "#9a6a3a"); rect(5, 1, 1, 11, "#c99a62"); for (let y = 3; y < 12; y += 3) rect(6, y, 5, 1, "#6e4824"); rect(5, 12, 6, 2, "#8a857a"); rect(5, 12, 6, 1, "#a39d8f"); }
    } else { // dressed stone with merlons
      if (H) { rect(0, 5, 16, 8, "#a39d8f"); rect(0, 5, 16, 1, "#bdb7a9");
        [0, 6, 12].forEach(x => { rect(x, 3, 4, 2, "#bdb7a9"); rect(x, 3, 4, 1, "#d2cdc0"); rect(x + 3, 3, 1, 2, "#8a857a"); });
        for (let y = 8; y < 13; y += 3) rect(0, y, 16, 1, "#7e786c"); for (let k = 0; k < 2; k++) for (let x = (k ? 2 : 5); x < 16; x += 6) rect(x, 6 + k * 3, 1, 2, "#7e786c");
        rect(0, 12, 16, 1, "#6f6a5f"); }
      else { rect(5, 1, 6, 12, "#bdb7a9"); rect(5, 1, 6, 1, "#d2cdc0"); [2, 6, 10].forEach(y => { rect(5, y, 1, 2, "#a39d8f"); rect(10, y, 1, 2, "#a39d8f"); }); for (let y = 4; y < 12; y += 4) rect(6, y, 4, 1, "#a39d8f"); rect(5, 13, 6, 1, "#7e786c"); }
    }
  }, WALL_EDGE);
}
const rubbleSprite = () => terrainSprite("wallrubble", 16, 16, (px, rect) => { [[2, 10, 4, 3], [7, 11, 4, 2], [11, 9, 3, 3], [5, 8, 3, 2]].forEach(([x, y, w, h], i) => { rect(x, y, w, h, i % 2 ? "#8a857a" : "#6f6a5f"); rect(x, y, w, 1, "#a39d8f"); }); }, WALL_EDGE);
function drawWallTile(c, r, q, tier, frac, color, t, dir) {
  const x = q * ts, y = r * ts, u = ts / 16, V = dir === "v"; tier = Math.max(1, Math.min(3, tier || 1));
  c.save(); c.imageSmoothingEnabled = false;
  c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(x + ts / 2, y + ts * .82, V ? ts * .2 : ts * .46, V ? ts * .3 : ts * .12, 0, 0, 7); c.fill();
  if (frac <= 0) { c.drawImage(rubbleSprite(), x, y, ts, ts); c.restore(); return; }
  c.drawImage(wallSprite(tier, V ? "v" : "h"), x, y, ts, ts);
  if (frac < .55) { c.fillStyle = "rgba(20,12,6,.85)"; (V ? [[7, 3], [8, 4], [7, 5], [8, 8], [9, 9]] : [[5, 6], [6, 7], [6, 8], [5, 9], [11, 6], [10, 7], [10, 8]]).forEach(([a, b]) => c.fillRect(x + a * u, y + b * u, u, u)); }
  c.fillStyle = color; if (V) c.fillRect(x + 5 * u, y + 14 * u, 6 * u, u); else c.fillRect(x + u, y + 13 * u, 14 * u, u); // owner trim
  if (frac < 1) { const bw = ts * .8; c.fillStyle = "rgba(20,12,6,.85)"; c.fillRect(x + ts * .1 - 1, y + ts * .9 - 1, bw + 2, ts * .07 + 2); c.fillStyle = frac > .5 ? "#47b04b" : "#d4402f"; c.fillRect(x + ts * .1, y + ts * .9, bw * frac, ts * .07); }
  c.restore();
}
const WALL_URL = {};
function wallURL(tier) {
  tier = Math.max(1, Math.min(3, tier)); if (WALL_URL[tier]) return WALL_URL[tier];
  const cv = document.createElement("canvas"); cv.width = 80; cv.height = 64; const c = cv.getContext("2d");
  c.translate(2, 6); c.scale(26 / ts, 26 / ts); c.translate(26, 0); drawWallTile(c, 0, 0, tier, 1, "#2f5fa8", 0); return (WALL_URL[tier] = cv.toDataURL());
}
