// Shop item icons

// ----- shop item icons -----
const ITEM_URL = {};
const ITEM_ART = {};
const loadItemArt = () => ["boots", "gauntlets", "ringprot", "salve", "elixir", "net", "frostdagger", "venomorb", "fang", "thornmail", "talisman", "scroll", "banner", "standard", "mender"].forEach(k => { const im = new Image(); im.onload = () => { Object.keys(ITEM_URL).forEach(x => delete ITEM_URL[x]); }; im.src = "items/" + k + ".webp"; ITEM_ART[k] = im; });
addEventListener("load", () => setTimeout(loadItemArt, 500));
function itemURL(k, size = 56) {
  const id = k + size; if (ITEM_URL[id]) return ITEM_URL[id];
  const art = ITEM_ART[k];
  if (art && art.complete && art.naturalWidth && !(ITEMS[k] && (ITEMS[k].orb || k === "scroll"))) {
    const cv0 = document.createElement("canvas"); cv0.width = cv0.height = size; const c0 = cv0.getContext("2d"), rr = size * .14, tc = ["#9a8a6a", "#c9962f", "#e8d28a"][(ITEMS[k] ? ITEMS[k].tier : 1) - 1];
    c0.save(); c0.beginPath(); c0.roundRect ? c0.roundRect(1.5, 1.5, size - 3, size - 3, rr) : c0.rect(1.5, 1.5, size - 3, size - 3); c0.clip(); c0.drawImage(art, 0, 0, size, size); c0.restore();
    c0.beginPath(); c0.roundRect ? c0.roundRect(1.5, 1.5, size - 3, size - 3, rr) : c0.rect(1.5, 1.5, size - 3, size - 3); c0.strokeStyle = tc; c0.lineWidth = Math.max(2, size * .05); c0.stroke();
    return (ITEM_URL[id] = cv0.toDataURL());
  }
  const it = ITEMS[k], cv = document.createElement("canvas"); cv.width = cv.height = size; const c = cv.getContext("2d");
  const g = c.createRadialGradient(size * .4, size * .3, 2, size / 2, size / 2, size * .7); g.addColorStop(0, "#5a4632"); g.addColorStop(1, "#1e140c");
  c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(2, 2, size - 4, size - 4, size * .16) : c.rect(2, 2, size - 4, size - 4); c.fill();
  c.strokeStyle = ["#9a8a6a", "#c9962f", "#e8d28a"][it.tier - 1]; c.lineWidth = 2.5; c.stroke();
  if (it.orb) { orbGlow(c, size / 2, size / 2, size * .17, it.col); return (ITEM_URL[id] = cv.toDataURL()); }
  c.fillStyle = hexA(it.col, .35); c.beginPath(); c.arc(size / 2, size / 2, size * .34, 0, 7); c.fill();
  c.fillStyle = it.col; c.font = `700 ${Math.round(size * .55)}px Georgia, serif`; c.textAlign = "center"; c.textBaseline = "middle";
  c.shadowColor = "rgba(0,0,0,.7)"; c.shadowBlur = 3; c.fillText(it.g, size / 2, size / 2 + 2);
  return (ITEM_URL[id] = cv.toDataURL());
}

// ----- glowing orbs and auras around a hero -----
const ORB_KEYS = ["frostdagger", "fireorb", "venomorb", "corruptorb"]; // the four orbs, in the order they sit around the hero
const AURA_COL = { banner: "#ffd24a", standard: "#7fb2ff", mender: "#8af08a", pipe: "#5fe0ff" };
function orbGlow(c, x, y, r, col, a = 1) {
  c.save(); c.globalCompositeOperation = "lighter";
  const g = c.createRadialGradient(x, y, 0, x, y, r * 3.4); g.addColorStop(0, hexA(col, .85 * a)); g.addColorStop(.3, hexA(col, .35 * a)); g.addColorStop(1, hexA(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3.4, 0, 7); c.fill(); c.restore();
  c.fillStyle = hexA(col, a); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.fillStyle = `rgba(255,255,255,${.85 * a})`; c.beginPath(); c.arc(x - r * .25, y - r * .25, r * .45, 0, 7); c.fill();
}
// the glowing orbs a hero owns, hovering round them. back: the half behind the hero, drawn before the sprite; otherwise the half in front
function drawHeroOrbs(c, cx, by, u, t, items, seed, back) {
  const owned = ORB_KEYS.filter(k => (items || []).includes(k)); if (!owned.length) return;
  owned.forEach((k, i) => {
    const col = ITEMS[k].col, ang = t * 1.9 + i * 6.2832 / owned.length + seed, depth = Math.sin(ang);
    if ((depth < 0) !== !!back) return;
    const ox = cx + Math.cos(ang) * u * .52, oy = by - u * .6 + depth * u * .13 + Math.sin(t * 3.1 + i * 1.7) * u * .05, r = u * .075 * (1 + .18 * depth) * (k === "fireorb" ? 1 + .12 * Math.sin(t * 17 + i) : 1);
    for (let j = 4; j >= 1; j--) { const a2 = ang - j * .2; orbGlow(c, cx + Math.cos(a2) * u * .52, by - u * .6 + Math.sin(a2) * u * .13 + Math.sin(t * 3.1 + i * 1.7) * u * .05, r * (1 - j * .17), col, .28 - j * .05); }
    orbGlow(c, ox, oy, r, col);
    const ph = (t * .9 + i * .27) % 1; c.fillStyle = hexA(col, .8 * (1 - ph)); // a rising spark: embers, frost motes, bubbles or wisps
    c.beginPath(); c.arc(ox + Math.sin(t * 5 + i) * u * .04, oy - ph * u * .25, u * .02, 0, 7); c.fill();
  });
}
// a ground aura for each aura item: banner sparks, shield ring, healing crosses, pipe hexagon
function drawHeroAuras(c, cx, by, u, t, items, seed) {
  const has = k => (items || []).includes(k); if (!Object.keys(AURA_COL).some(has)) return;
  const gy = by - u * .05;
  c.save(); c.translate(cx, gy); c.scale(1, .36); c.lineCap = "round";
  if (has("banner")) { c.strokeStyle = hexA(AURA_COL.banner, .85); c.lineWidth = u * .05; c.setLineDash([u * .12, u * .09]); c.lineDashOffset = -t * u * .5; c.beginPath(); c.arc(0, 0, u * .74, 0, 7); c.stroke(); c.setLineDash([]); }
  if (has("standard")) { c.strokeStyle = hexA(AURA_COL.standard, .75); c.lineWidth = u * .06; for (let i = 0; i < 4; i++) { const a = t * .8 + i * 1.5708; c.beginPath(); c.arc(0, 0, u * .64, a, a + .95); c.stroke(); } c.strokeStyle = hexA(AURA_COL.standard, .25); c.lineWidth = u * .02; c.beginPath(); c.arc(0, 0, u * .64, 0, 7); c.stroke(); }
  if (has("mender")) { const p = (t * .5 + seed) % 1; c.strokeStyle = hexA(AURA_COL.mender, .8 * (1 - p)); c.lineWidth = u * .05; c.beginPath(); c.arc(0, 0, u * (.3 + p * .7), 0, 7); c.stroke(); c.fillStyle = hexA(AURA_COL.mender, .12); c.beginPath(); c.arc(0, 0, u * .5, 0, 7); c.fill(); }
  if (has("pipe")) { c.strokeStyle = hexA(AURA_COL.pipe, .85); c.lineWidth = u * .045; c.shadowColor = AURA_COL.pipe; c.shadowBlur = u * .12; c.beginPath(); for (let i = 0; i <= 6; i++) { const a = t * .6 + i * 1.0472; i ? c.lineTo(Math.cos(a) * u * .56, Math.sin(a) * u * .56) : c.moveTo(Math.cos(a) * u * .56, Math.sin(a) * u * .56); } c.stroke(); c.shadowBlur = 0; }
  c.restore();
  const bits = (k, n, draw) => { if (!has(k)) return; for (let s = 0; s < n; s++) { const ph = (t * .55 + s / n + seed * .13) % 1, x = cx + Math.cos(s * 2.4 + seed) * u * .34 * (1 - ph * .3), y = gy - ph * u * 1.0; draw(x, y, ph, s); } };
  bits("banner", 4, (x, y, ph) => { c.fillStyle = hexA(AURA_COL.banner, 1 - ph); c.beginPath(); c.moveTo(x, y); c.lineTo(x + u * .07, y + u * .03); c.lineTo(x, y + u * .06); c.closePath(); c.fill(); });
  bits("mender", 4, (x, y, ph) => { c.fillStyle = hexA(AURA_COL.mender, 1 - ph); const w = u * .025; c.fillRect(x - w * 2, y - w / 2, w * 4, w); c.fillRect(x - w / 2, y - w * 2, w, w * 4); });
  bits("pipe", 3, (x, y, ph) => { c.strokeStyle = hexA(AURA_COL.pipe, .9 * (1 - ph)); c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, u * (.03 + ph * .03), 0, 7); c.stroke(); });
  bits("standard", 3, (x, y, ph) => { c.fillStyle = hexA(AURA_COL.standard, .9 * (1 - ph)); c.beginPath(); c.moveTo(x - u * .04, y); c.lineTo(x + u * .04, y); c.lineTo(x, y + u * .07); c.closePath(); c.fill(); });
}
