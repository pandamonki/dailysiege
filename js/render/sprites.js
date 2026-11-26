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
  ram:         { cart: 1, ram: 1, a: "#5a3f24", b: YOU_COLOR },
  cart:        { cart: 1, a: "#6a4a2c", b: YOU_COLOR },
  tower:       { tower: 1, a: "#bdb7a9", b: YOU_COLOR },
  tower2:      { tower: 1, tv: "2", a: "#bdb7a9", b: YOU_COLOR },
  towerA:      { tower: 1, tv: "A", a: "#bdb7a9", b: YOU_COLOR },
  towerB:      { tower: 1, tv: "B", a: "#bdb7a9", b: YOU_COLOR },
  towerM:      { tower: 1, tv: "M", a: "#bdb7a9", b: YOU_COLOR, f: "#c89aff" },
  towerF:      { tower: 1, tv: "F", a: "#bdb7a9", b: YOU_COLOR, f: "#ff6a2a" },
  towerS:      { tower: 1, tv: "S", a: "#bdb7a9", b: YOU_COLOR },
  catapult:    { cat: 1, a: "#5a3f24", b: YOU_COLOR },
  mage:        { a: "#5a3f8f", b: YOU_COLOR, hc: "#42306b", head: "wizard", weapon: "staff", f: "#9fd8ff", robe: 1 },
  sniper:      { a: "#7a5a32", b: YOU_COLOR, hc: "#8a4a22", head: "dwarf", weapon: "rifle" },
  trollw:      { a: "#5f8a3a", b: YOU_COLOR, hc: "#3f6a2a", head: "horned", weapon: "axe" },
  orc:         { a: "#4a7a3a", b: YOU_COLOR, hc: "#2f5a22", head: "band", weapon: "axe" },
  centaur:     { a: "#8a5a2c", b: YOU_COLOR, hc: "#5a3a1c", head: "cap", weapon: "bow" },
  delf:        { a: "#2a2a3a", b: YOU_COLOR, hc: "#1f1f2b", head: "hood", weapon: "daggers" },
  ogre:        { a: "#8a7a4a", b: YOU_COLOR, hc: "#6a5a30", head: "horned", weapon: "axe" },
  necro:       { a: "#2c2c3c", b: YOU_COLOR, hc: "#3a2a4a", head: "hood", weapon: "staff", f: "#7fe08a", robe: 1 },
  skel:        { a: "#d9d4c0", b: YOU_COLOR, hc: "#d9d4c0", head: "helmet", weapon: "swordshield" },
  ogre2:       { a: "#8a7a4a", b: YOU_COLOR, hc: "#6a5a30", head: "horned", weapon: "axe" },
  necro2:      { a: "#2c2c3c", b: YOU_COLOR, hc: "#3a2a4a", head: "hood", weapon: "staff", f: "#7fe08a", robe: 1 },
  skel2:       { a: "#d9d4c0", b: YOU_COLOR, hc: "#d9d4c0", head: "helmet", weapon: "swordshield" },
  guard:       { a: "#5d6672", b: "#e2b33c", sh: "#e2b33c", head: "greathelm", weapon: "swordshield" },
  militia:     { a: "#8a7d66", b: YOU_COLOR, sh: YOU_COLOR, hc: "#6b5a40", head: "cap", weapon: "swordshield" },
};
const SW = 16, SH = 20, OX = 1, OY = 3;
function buildSprite(sp, pose = "") {
  const g = Array.from({ length: SH }, () => Array(SW).fill(null));
  const col = k => sp[k] || C[k] || k;
  let DY = 0; // vertical offset for the upper body, used for the walking bob
  const P = (x, y, k) => { const X = x + OX, Y = y + OY + DY; if (X >= 0 && X < SW && Y >= 0 && Y < SH) g[Y][X] = col(k); };
  const R = (x0, y0, x1, y1, k) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P(x, y, k); };
  const wf = pose[0] === "w" ? +pose[1] : -1, ap = pose[0] === "a" ? +pose[1] : 0; // walk frame 0-3, attack pose 1 = wind-up, 2 = strike
  const contact = wf === 0 || wf === 2, odd = wf === 1 || wf === 3;
  if (sp.tower) { // a guard tower: a stone keep with battlements, an arrow slit and a banner in the owner's colour
    R(3, 6, 12, 15, "a"); R(2, 4, 13, 5, "a"); P(2, 3, "a"); P(5, 3, "a"); P(10, 3, "a"); P(13, 3, "a"); R(3, 4, 4, 4, "bt"); R(11, 4, 12, 4, "bt");
    R(3, 9, 12, 9, "bt"); R(6, 7, 9, 7, "b"); R(7, 11, 8, 13, "bt"); P(7, 6, "m"); P(8, 6, "m");
    if (sp.tv === "2" || sp.tv === "A") { R(7, 0, 7, 3, "l"); R(8, 0, 10, 1, "b"); if (sp.tv === "A") { R(2, 6, 2, 15, "bt"); R(13, 6, 13, 15, "bt"); } }
    else if (sp.tv === "B") { R(5, 1, 10, 3, "bt"); R(6, 0, 9, 0, "bt"); P(10, 0, "fe"); P(11, 0, "fe"); }
    else if (sp.tv === "M") { R(7, 0, 8, 3, "f"); P(7, 0, "fe"); }
    else if (sp.tv === "F") { R(6, 1, 9, 3, "bt"); R(7, 0, 8, 2, "f"); P(6, 0, "fe"); P(9, 0, "fe"); }
    else if (sp.tv === "S") { R(8, 2, 15, 2, "m"); R(7, 1, 8, 3, "bt"); }
  } else if (sp.ram) { // a battering ram: a roofed frame on wheels with an iron-capped log
    if (odd) DY = -1;
    R(2, 5, 12, 6, "a"); R(1, 7, 13, 10, "w");
    if (ap === 1) { R(0, 8, 12, 9, "m"); R(11, 7, 13, 10, "m"); } else { R(0, 8, 14, 9, "m"); R(13, 7, 15, 10, "m"); if (ap === 2) { P(15, 6, "fe"); P(15, 11, "fe"); } }
    DY = 0; R(2, 11, 4, 14, "bt"); R(10, 11, 12, 14, "bt"); if (wf >= 0 && odd) { P(2, 12, "m"); P(4, 13, "m"); P(10, 12, "m"); P(12, 13, "m"); } else { R(3, 12, 3, 13, "m"); R(11, 12, 11, 13, "m"); } R(4, 5, 10, 5, "b");
  } else if (sp.cat) { // a catapult: a wheeled frame in the owner's colour with a throwing arm that cocks back and swings forward
    if (odd) DY = -1;
    R(1, 9, 14, 10, "w"); R(1, 10, 14, 10, "b"); R(5, 5, 6, 9, "w"); R(9, 5, 10, 9, "w"); R(5, 4, 10, 4, "bt");
    if (ap === 1) { for (let i = 0; i < 6; i++) P(8 - i, 8 - i, "l"); R(1, 2, 3, 3, "bt"); P(2, 2, "m"); }
    else if (ap === 2) { for (let i = 0; i < 6; i++) P(7 + i, 7 - i, "l"); R(12, 0, 14, 1, "bt"); }
    else { for (let i = 0; i < 6; i++) P(6 + i, 7 - i, "l"); R(11, 0, 13, 1, "bt"); P(12, 0, "m"); }
    DY = 0; R(2, 11, 4, 14, "bt"); R(11, 11, 13, 14, "bt"); if (wf >= 0 && odd) { P(2, 12, "m"); P(4, 13, "m"); P(11, 12, "m"); P(13, 13, "m"); } else { R(3, 12, 3, 13, "m"); R(12, 12, 12, 13, "m"); }
  } else if (sp.cart) { // a powder cart: wheels, a barrel in the owner's colour and a lit fuse
    if (odd) DY = -1;
    R(1, 12, 14, 13, "w"); R(2, 6, 12, 11, "a"); R(2, 8, 12, 8, "b"); R(2, 6, 12, 6, "bt"); R(2, 11, 12, 11, "bt");
    DY = 0; R(2, 13, 5, 16, "bt"); R(9, 13, 12, 16, "bt"); if (wf >= 0 && odd) { P(4, 14, "m"); P(3, 15, "m"); P(11, 14, "m"); P(10, 15, "m"); } else { P(3, 14, "m"); P(4, 15, "m"); P(10, 14, "m"); P(11, 15, "m"); }
    if (odd) DY = -1; R(7, 3, 7, 5, "l"); P(7, 2, "g"); P(8, 1, "fe"); P(6, 1, "fe");
  } else {
  // legs: standing, striding (wide at contact) or one lifted as the body passes over
  if (wf < 0) { R(5, 12, 6, 13, "l"); R(7, 12, 8, 13, "l"); R(5, 14, 6, 14, "bt"); R(7, 14, 8, 14, "bt"); }
  else if (contact) { R(4, 12, 5, 13, "l"); R(8, 12, 9, 13, "l"); R(3, 14, 5, 14, "bt"); R(8, 14, 10, 14, "bt"); }
  else if (wf === 1) { R(5, 12, 6, 13, "l"); R(5, 14, 6, 14, "bt"); R(7, 12, 8, 12, "l"); R(7, 13, 8, 13, "bt"); }
  else { R(7, 12, 8, 13, "l"); R(7, 14, 8, 14, "bt"); R(5, 12, 6, 12, "l"); R(5, 13, 6, 13, "bt"); }
  DY = contact ? 1 : 0;
  // body
  R(4, 7, 9, 11, "a"); R(3, 7, 3, 10, "a"); R(10, 7, 10, 10, "a");
  if (sp.robe) { R(4, 7, 9, 13, "a"); if (contact) { P(wf === 0 ? 5 : 8, 14, "bt"); } else if (odd) { P(wf === 1 ? 4 : 9, 13, "a"); } }
  R(4, 10, 9, 10, "b"); P(3, 11, "s"); P(10, 11, "s");
  if (sp.sash) { R(4, 9, 9, 9, "b"); P(4, 8, "b"); P(5, 8, "b"); }
  R(4, 2, 9, 6, "s"); R(4, 2, 9, 2, "h"); P(5, 4, "e"); P(8, 4, "e");
  // head gear
  switch (sp.head) {
    case "helmet": R(4, 1, 9, 3, "m"); P(3, 3, "m"); P(10, 3, "m"); break;
    case "greathelm": R(4, 1, 9, 6, "m"); R(5, 4, 8, 4, "e"); P(6, 0, sp.b); P(7, 0, sp.b); break;
    case "horned": R(4, 1, 9, 3, "m"); P(3, 2, "x"); P(2, 1, "x"); P(2, 0, "x"); P(10, 2, "x"); P(11, 1, "x"); P(11, 0, "x"); break;
    case "hood": R(3, 1, 10, 3, "hc"); R(3, 4, 3, 7, "hc"); R(10, 4, 10, 7, "hc"); break;
    case "wizard": R(3, 1, 10, 1, "hc"); R(4, 0, 9, 0, "g"); R(5, -1, 8, -1, "hc"); R(6, -2, 7, -2, "hc"); P(8, -3, "hc"); break;
    case "dwarf": R(4, 1, 9, 2, "m"); R(4, 5, 9, 8, "hc"); R(5, 4, 8, 4, "s"); P(5, 4, "e"); P(8, 4, "e"); break;
    case "cap": R(4, 1, 9, 2, "hc"); P(10, 2, "hc"); P(9, 0, "fe"); P(10, -1, "fe"); break;
    case "band": R(4, 2, 9, 2, "hc"); P(10, 3, "hc"); P(11, 4, "hc"); if (sp.feathers) { P(3, 1, "fe"); P(3, 0, "fe"); P(2, -1, "fe"); } break;
  }
  // weapons (wind-up and strike poses for the attack animation)
  switch (sp.weapon) {
    case "swordshield": R(1, 7, 3, 11, "sh"); R(1, 7, 3, 7, "m"); P(2, 9, "g");
      if (ap === 1) { R(11, -1, 11, 5, "m"); P(10, 6, "g"); P(12, 6, "g"); P(11, 7, "w"); }
      else if (ap === 2) { R(11, 8, 14, 8, "m"); P(10, 7, "g"); P(10, 9, "g"); P(10, 8, "w"); P(14, 6, "x"); P(14, 10, "x"); }
      else { R(11, 3, 11, 9, "m"); P(10, 9, "g"); P(12, 9, "g"); P(11, 10, "w"); } break;
    case "bow": P(1, 5, "w"); R(0, 6, 0, 10, "w"); P(1, 11, "w");
      if (ap === 1) { P(1, 6, "t"); P(2, 7, "t"); P(3, 8, "t"); P(2, 9, "t"); P(1, 10, "t"); R(0, 8, 2, 8, "w"); P(-1, 8, "m"); }
      else { R(2, 5, 2, 11, "t"); if (ap === 2) { P(-1, 7, "fe"); P(-1, 9, "fe"); P(-1, 8, "t"); } } break;
    case "staff": case "totem": {
      const up = ap === 1 ? -2 : 0, hd = sp.weapon === "totem" ? "x" : "f";
      R(11, 1 + up, 11, 13 + up, "w"); R(10, -1 + up, 12, 0 + up, hd);
      if (sp.weapon === "totem") { P(10, 0 + up, "e"); P(12, 0 + up, "e"); P(12, 1 + up, "fe"); P(13, 2 + up, "fe"); } else P(11, -1 + up, "t");
      if (ap === 2) { R(9, -2, 13, 1, sp.weapon === "totem" ? "fe" : "f"); P(11, -2, "t"); P(8, -1, "t"); P(14, 0, "t"); P(8, 2, "t"); } break; }
    case "daggers":
      if (ap === 1) { R(11, 4, 11, 7, "m"); P(11, 8, "w"); R(2, 4, 2, 7, "m"); P(2, 8, "w"); }
      else if (ap === 2) { R(11, 8, 14, 8, "m"); P(10, 8, "w"); R(-1, 10, 2, 10, "m"); P(3, 10, "w"); }
      else { R(11, 8, 11, 10, "m"); P(11, 11, "w"); R(2, 8, 2, 10, "m"); P(2, 11, "w"); } break;
    case "rifle":
      if (ap === 1) { R(5, 8, 13, 8, "w"); R(10, 7, 14, 7, "m"); P(14, 8, "m"); P(6, 9, "bt"); }
      else if (ap === 2) { R(4, 9, 12, 9, "w"); R(9, 8, 13, 8, "m"); P(13, 9, "m"); P(5, 10, "bt"); P(14, 8, "fe"); P(14, 9, "fe"); P(14, 10, "fe"); P(13, 7, "fe"); }
      else { R(5, 9, 13, 9, "w"); R(10, 8, 14, 8, "m"); P(14, 9, "m"); P(6, 10, "bt"); } break;
    case "axe":
      if (ap === 1) { R(11, -2, 11, 6, "w"); R(12, -2, 13, 0, "m"); P(12, 1, "m"); }
      else if (ap === 2) { R(11, 7, 11, 13, "w"); R(12, 9, 14, 12, "m"); P(12, 8, "m"); }
      else { R(11, 4, 11, 12, "w"); R(12, 4, 13, 6, "m"); P(12, 7, "m"); } break;
  }
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
const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a; const x = p(a), y = p(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
// The final towers' tops, drawn pixel by pixel above the battlements (16 x 11, rows 0..10 sit on row 11), after the tower icons:
// Fire Tower a blazing brazier, Magic Tower a floating crystal with lightning, Sniper Tower a heavy scoped crossbow on a stand
const TOWER_TOP_PAL = { B: "#7fc8ff", G: "#a8781c", P: "#d2b2ff", V: "#4a2a80", W: "#fff4c2", Y: "#ffd34d", b: "#bfe8ff", d: "#5a3a1e", e: "#9a2a12", g: "#e2b33c", h: "#9a9aa2", i: "#3a3a40", k: "#24242a", l: "#b07a3e", m: "#5c5c66", o: "#ff8a2a", p: "#b48cff", q: "#f4ecff", r: "#e8461e", s: "#d7dde2", u: "#6f6a5f", v: "#7a50c0", w: "#8a5a2b", y: "#ffe08a" };
const TOWER_TOPS = {
  towerF: [
    ".......Y........",
    "......YoY...Y...",
    "...Y..ooY..Yo...",
    "...oY.oroYYoo...",
    "...ooYorrooro...",
    "..oorroWWorroo..",
    "..orrrWWWWrrro..",
    "..errrWWWWrrre..",
    "..iiiiiiiiiiii..",
    "...immmmmmmmi...",
    "....iiiiiiii...."],
  towerM: [
    ".......q........",
    "......qPp.......",
    ".b...qPPpv...b..",
    "..b..PPppv..b...",
    "..B..PPppv..B...",
    ".....Pppvv......",
    "......ppv.......",
    ".......v........",
    "................",
    ".....vVVVVv.....",
    "....uuuuuuuu...."],
  towerS: [
    "......Gggy......",
    "......G..g......",
    "...........s....",
    "...........h....",
    "..ddwwwwwwwkiiis",
    "..ddllllllkmh...",
    "...........h....",
    "...........s....",
    "........k.......",
    ".......kik......",
    "......k...k....."],
};
// Towers as tall keep towers (style B), at the same pixel size as soldiers but 30 pixels high, so they stand about a tile and a half:
// pale castle stone with battlements, the owner's banner down the front, and a roof in their colour (Guard, Arrow, Arrow III) or an open top with its weapon
function towerSprite(key, color) {
  const W = 16, H = 32, g = Array.from({ length: H }, () => Array(W).fill(null)), R = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < W) g[j][i] = c; }, P = (x, y, c) => R(x, y, 1, 1, c);
  const st = "#a39d8f", dk = "#6f6a5f", lt = "#bdb7a9", hi = "#d2cdc0", roofD = mixHex(color, "#000000", .4), gold = "#e2b33c", door = "#4a2f17", iron = "#3a3a40", ironL = "#6a6a74";
  const open = ["towerB", "towerM", "towerF", "towerS"].includes(key), top = key === "tower" ? 13 : 11; // later stages stand taller
  R(3, top + 2, 10, H - top - 2, st); R(3, top + 2, 1, H - top - 2, lt); R(12, top + 2, 1, H - top - 2, dk); for (let y = top + 5; y < H - 1; y += 3) R(3, y, 10, 1, dk);
  for (let x = 2; x < 14; x += 3) R(x, top, 2, 2, lt); R(2, top + 2, 12, 1, hi);
  R(5, top + 4, 6, 7, color); R(5, top + 4, 6, 1, gold); R(6, top + 11, 4, 1, color); P(7, top + 12, color); P(8, top + 12, color); // the owner's banner
  R(6, H - 5, 4, 5, door); R(7, H - 6, 2, 1, door);
  if (key === "towerA") { R(3, top + 3, 10, 1, gold); R(2, top + 2, 12, 1, gold); }
  if (!open) { for (let k = 0; k < 6; k++) R(7 - k, top - 6 + k, 2 + k * 2, 1, color); for (let k = 0; k < 6; k++) P(8 + k, top - 6 + k, roofD); R(7, top - 11, 1, 5, door); R(8, top - 11, 3, 2, color); if (key === "towerA") { P(7, top - 12, gold); } }
  else { const y0 = top - 1;
    if (key === "towerB") { R(5, y0 - 4, 6, 4, iron); R(6, y0 - 6, 4, 2, iron); R(6, y0 - 6, 4, 1, ironL); P(11, y0 - 8, "#9a9aa2"); P(12, y0 - 9, "#c9c9cf"); }
    if (TOWER_TOPS[key]) TOWER_TOPS[key].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") P(x, y0 - 10 + y, TOWER_TOP_PAL[ch]); })); }
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let cl = g[y][x]; if (!cl) { if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) cl = "#1e140c"; else continue; } c.fillStyle = cl; c.fillRect(x, y, 1, 1); }
  return cv;
}
function spr(key, color = YOU_COLOR, pose = "") {
  const id = key + "|" + color + (pose ? "|" + pose : "");
  if (!SPR[id] && SPECS[key] && SPECS[key].tower) SPR[id] = towerSprite(key, color);
  if (!SPR[id]) {
    const sp = { ...SPECS[key] };
    if (key.startsWith("c-")) { // heroes wear two tones of the lord's colour: the bright colour for trim, sashes and shields, a dark shade for the outfit
      const dark = mixHex(color, "#000000", key === "c-rogue" ? .78 : .68), darker = mixHex(color, "#000000", key === "c-rogue" ? .86 : .78), bright = mixHex(color, "#ffffff", .12);
      sp.b = bright; sp.a = dark; if ("sh" in sp) sp.sh = bright; if (sp.hc) sp.hc = darker;
      if (key === "c-shaman") { sp.hc = bright; sp.sash = 1; }
      if (key === "c-mage") { sp.g = bright; sp.f = bright; sp.a = bright; sp.b = dark; } } // the wizard wears the full trim colour on robe, hat band and staff tip, with a dark belt and hat
    else if (color !== YOU_COLOR) ["b", "sh"].forEach(k => { if (sp[k] === YOU_COLOR) sp[k] = color; });
    SPR[id] = buildSprite(sp, pose);
  }
  return SPR[id];
}
function spriteURL(k, color = MY_COLOR) {
  const id = k + "|" + color;
  if (SPR_URL[id]) return SPR_URL[id];
  const s = spr(k, color), cv = document.createElement("canvas"); cv.width = s.width * 4; cv.height = s.height * 4; // towers are taller than soldiers
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
