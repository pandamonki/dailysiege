// Procedural pixel-art sprites

// ================= sprites (procedural pixel art) =================
const C = { s: "#e7b98a", e: "#2a1a10", m: "#b9c0c7", g: "#e2b33c", w: "#8a5a2b", l: "#4a3a2a", t: "#efe6cf", x: "#efe6cf", bt: "#3a2a1c", h: "#5a3a1e", fe: "#d8c25a" };
const SPECS = {
  "c-warrior": { a: "#8b2f24", b: YOU_COLOR, sh: YOU_COLOR, head: "horned", weapon: "swordshield" },
  "c-mage":    { a: "#3b4f9a", b: "#e2b33c", hc: "#2c3a78", head: "wizard", weapon: "staff", f: "#ff8a2a", robe: 1 },
  "c-archer":  { a: "#3f6b2e", b: "#7a5a2a", hc: "#2e4f22", head: "cap", weapon: "bow" },
  "c-shaman":  { a: "#7a4e2a", b: "#c9862f", hc: "#b8322a", head: "band", feathers: 1, weapon: "totem", robe: 1 },
  "c-rogue":   { a: "#3a3a44", b: "#6b2a2a", hc: "#25252d", head: "hood", weapon: "daggers" },
  footman:     { a: "#6d6a60", b: YOU_COLOR, sh: YOU_COLOR, head: "helmet", weapon: "swordshield" },
  bowman:      { a: "#5b6e3a", b: YOU_COLOR, hc: "#46552c", head: "cap", weapon: "bow" },
  knight:      { a: "#9aa3ab", b: YOU_COLOR, sh: YOU_COLOR, head: "greathelm", weapon: "swordshield" },
  healer:      { a: "#e9e2cf", b: YOU_COLOR, hc: "#cfc4a6", head: "hood", weapon: "staff", f: "#7fe08a", robe: 1 },
  raider:      { a: "#6a4a2c", b: YOU_COLOR, hc: "#b8322a", head: "band", weapon: "axe" },
  guard:       { a: "#5d6672", b: "#e2b33c", sh: "#e2b33c", head: "greathelm", weapon: "swordshield" },
  militia:     { a: "#8a7d66", b: YOU_COLOR, sh: YOU_COLOR, hc: "#6b5a40", head: "cap", weapon: "swordshield" },
};
const SW = 16, SH = 20, OX = 1, OY = 3;
function buildSprite(sp) {
  const g = Array.from({ length: SH }, () => Array(SW).fill(null));
  const col = k => sp[k] || C[k] || k;
  const P = (x, y, k) => { const X = x + OX, Y = y + OY; if (X >= 0 && X < SW && Y >= 0 && Y < SH) g[Y][X] = col(k); };
  const R = (x0, y0, x1, y1, k) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P(x, y, k); };
  // body
  R(5, 12, 6, 13, "l"); R(7, 12, 8, 13, "l"); R(5, 14, 6, 14, "bt"); R(7, 14, 8, 14, "bt");
  R(4, 7, 9, 11, "a"); R(3, 7, 3, 10, "a"); R(10, 7, 10, 10, "a");
  if (sp.robe) R(4, 7, 9, 13, "a");
  R(4, 10, 9, 10, "b"); P(3, 11, "s"); P(10, 11, "s");
  R(4, 2, 9, 6, "s"); R(4, 2, 9, 2, "h"); P(5, 4, "e"); P(8, 4, "e");
  // head gear
  switch (sp.head) {
    case "helmet": R(4, 1, 9, 3, "m"); P(3, 3, "m"); P(10, 3, "m"); break;
    case "greathelm": R(4, 1, 9, 6, "m"); R(5, 4, 8, 4, "e"); P(6, 0, sp.b); P(7, 0, sp.b); break;
    case "horned": R(4, 1, 9, 3, "m"); P(3, 2, "x"); P(2, 1, "x"); P(2, 0, "x"); P(10, 2, "x"); P(11, 1, "x"); P(11, 0, "x"); break;
    case "hood": R(3, 1, 10, 3, "hc"); R(3, 4, 3, 7, "hc"); R(10, 4, 10, 7, "hc"); break;
    case "wizard": R(3, 1, 10, 1, "hc"); R(4, 0, 9, 0, "g"); R(5, -1, 8, -1, "hc"); R(6, -2, 7, -2, "hc"); P(8, -3, "hc"); break;
    case "cap": R(4, 1, 9, 2, "hc"); P(10, 2, "hc"); P(9, 0, "fe"); P(10, -1, "fe"); break;
    case "band": R(4, 2, 9, 2, "hc"); P(10, 3, "hc"); P(11, 4, "hc"); if (sp.feathers) { P(3, 1, "fe"); P(3, 0, "fe"); P(2, -1, "fe"); } break;
  }
  // weapons
  switch (sp.weapon) {
    case "swordshield": R(11, 3, 11, 9, "m"); P(10, 9, "g"); P(12, 9, "g"); P(11, 10, "w"); R(1, 7, 3, 11, "sh"); R(1, 7, 3, 7, "m"); P(2, 9, "g"); break;
    case "bow": P(1, 5, "w"); R(0, 6, 0, 10, "w"); P(1, 11, "w"); R(2, 5, 2, 11, "t"); break;
    case "staff": R(11, 1, 11, 13, "w"); R(10, -1, 12, 0, "f"); P(11, -1, "t"); break;
    case "totem": R(11, 1, 11, 13, "w"); R(10, -1, 12, 0, "x"); P(10, 0, "e"); P(12, 0, "e"); P(12, 1, "fe"); P(13, 2, "fe"); break;
    case "daggers": R(11, 8, 11, 10, "m"); P(11, 11, "w"); R(2, 8, 2, 10, "m"); P(2, 11, "w"); break;
    case "axe": R(11, 4, 11, 12, "w"); R(12, 4, 13, 6, "m"); P(12, 7, "m"); break;
  }
  // auto outline
  const out = g.map(r => r.slice());
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    if (g[y][x]) continue;
    if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) out[y][x] = "#1e140c";
  }
  const cv = document.createElement("canvas"); cv.width = SW; cv.height = SH;
  const cx = cv.getContext("2d");
  out.forEach((r, y) => r.forEach((c, x) => { if (c) { cx.fillStyle = c; cx.fillRect(x, y, 1, 1); } }));
  return cv;
}
const SPR = {}; const SPR_URL = {};
function spr(key, color = YOU_COLOR) {
  const id = key + "|" + color;
  if (!SPR[id]) {
    const sp = { ...SPECS[key] };
    if (color !== YOU_COLOR) { ["b", "sh"].forEach(k => { if (sp[k] === YOU_COLOR) sp[k] = color; }); if (key.startsWith("c-")) sp.b = color; }
    SPR[id] = buildSprite(sp);
  }
  return SPR[id];
}
function spriteURL(k) {
  const id = k + "|" + MY_COLOR;
  if (SPR_URL[id]) return SPR_URL[id];
  const s = spr(k, MY_COLOR), cv = document.createElement("canvas"); cv.width = SW * 4; cv.height = SH * 4;
  const cx = cv.getContext("2d"); cx.imageSmoothingEnabled = false; cx.drawImage(s, 0, 0, cv.width, cv.height);
  return (SPR_URL[id] = cv.toDataURL());
}
// trap icons drawn as small canvases
function trapIcon(type, size) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size; const c = cv.getContext("2d");
  drawTrap(c, type, size / 2, size / 2, size); return cv;
}
const TRAP_URL = {};
function trapURL(t) { return TRAP_URL[t] || (TRAP_URL[t] = trapIcon(t, 64).toDataURL()); }
