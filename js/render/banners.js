// Banner patterns and emblems

// ================= spell art, banners, walls, item icons =================
const BANNER_PATS = [["solid", "Plain"], ["halves", "Halves"], ["stripe", "Stripe"], ["cross", "Cross"], ["chevron", "Chevron"], ["quarters", "Quarters"]];
const BANNER_EMS = [["none", "None"], ["crown", "Crown"], ["skull", "Skull"], ["star", "Star"], ["sun", "Sun"], ["moon", "Moon"], ["tower", "Tower"]];
const BANNER_COLS = ["#b8322a", "#2f5fa8", "#3d7a35", "#7a3d8f", "#c9862f", "#d6559a", "#2d8a8a", "#d8d2c0", "#1e140c", "#e2b33c", "#ecdcb4"];
const lumOf = h => { const n = parseInt(h.slice(1), 16); return (((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; };
function emblemPath(c, em, x, y, s) {
  c.beginPath();
  if (em === "crown") { c.moveTo(x - s, y + s * .6); c.lineTo(x - s, y - s * .5); c.lineTo(x - s * .5, y); c.lineTo(x, y - s * .7); c.lineTo(x + s * .5, y); c.lineTo(x + s, y - s * .5); c.lineTo(x + s, y + s * .6); c.closePath(); }
  else if (em === "star") { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * .45 : s; c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
  else if (em === "sun") { for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? s * .6 : s; c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
  else if (em === "moon") { c.arc(x, y, s, Math.PI * .5, Math.PI * 1.5, true); c.arc(x - s * .45, y, s * .8, Math.PI * 1.5, Math.PI * .5, false); c.closePath(); }
  else if (em === "tower") { c.rect(x - s * .55, y - s * .3, s * 1.1, s * 1.1); c.rect(x - s * .8, y - s * .9, s * .4, s * .6); c.rect(x - s * .2, y - s * .9, s * .4, s * .6); c.rect(x + s * .4, y - s * .9, s * .4, s * .6); }
  else if (em === "skull") { c.arc(x, y - s * .15, s * .8, 0, 7); c.rect(x - s * .45, y + s * .3, s * .9, s * .6); }
}
function paintBanner(c, b, fallback, x, y, w, h) {
  b = b || defaultBanner(); const c1 = fallback && SEAT_COLORS.includes(fallback) ? fallback : b.c1 || fallback, c2 = b.c2 || "#ecdcb4"; // a team colour always wins: it is the lord's main colour
  c.save(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h * .84); c.lineTo(x + w / 2, y + h); c.lineTo(x, y + h * .84); c.closePath(); c.clip();
  c.fillStyle = c1; c.fillRect(x, y, w, h); c.fillStyle = c2;
  if (b.pat === "halves") c.fillRect(x + w / 2, y, w / 2, h);
  else if (b.pat === "stripe") c.fillRect(x, y + h * .36, w, h * .26);
  else if (b.pat === "cross") { c.fillRect(x + w * .38, y, w * .24, h); c.fillRect(x, y + h * .3, w, h * .22); }
  else if (b.pat === "chevron") { c.beginPath(); c.moveTo(x, y + h * .2); c.lineTo(x + w / 2, y + h * .55); c.lineTo(x + w, y + h * .2); c.lineTo(x + w, y + h * .42); c.lineTo(x + w / 2, y + h * .77); c.lineTo(x, y + h * .42); c.closePath(); c.fill(); }
  else if (b.pat === "quarters") { c.fillRect(x, y, w / 2, h * .45); c.fillRect(x + w / 2, y + h * .45, w / 2, h * .55); }
  if (b.em && b.em !== "none") {
    const ex = x + w / 2, ey = y + h * .42, es = w * .26, dark = lumOf(c1) > .5;
    c.fillStyle = dark ? "#1e140c" : "#f4ead0"; c.strokeStyle = dark ? "#f4ead0" : "#1e140c"; c.lineWidth = Math.max(1, w * .05);
    emblemPath(c, b.em, ex, ey, es); c.stroke(); c.fill();
    if (b.em === "skull") { c.fillStyle = dark ? "#f4ead0" : "#1e140c"; c.fillRect(ex - es * .45, ey - es * .35, es * .32, es * .32); c.fillRect(ex + es * .13, ey - es * .35, es * .32, es * .32); }
  }
  c.restore(); c.strokeStyle = "#1e140c"; c.lineWidth = Math.max(1, w * .06); c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h * .84); c.lineTo(x + w / 2, y + h); c.lineTo(x, y + h * .84); c.closePath(); c.stroke();
}
const BAN_URL = {};
function bannerURL(b, color, w = 72, h = 96) {
  const id = JSON.stringify(b || {}) + color + w; if (BAN_URL[id]) return BAN_URL[id];
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; paintBanner(cv.getContext("2d"), b, color, 3, 3, w - 6, h - 6); return (BAN_URL[id] = cv.toDataURL());
}

// The wax seal on sealed orders, as pixel art: a blob of wax in the lord's colour with two drips, a pressed ring and their initials (one or two letters)
const SEAL_FONT = { A: "01110100011000111111100011000110001", B: "11110100011111010001100011000111110", C: "01110100011000010000100001000101110", D: "11110100011000110001100011000111110", E: "11111100001111010000100001000011111", F: "11111100001111010000100001000010000", G: "01110100011000010111100011000101111", H: "10001100011111110001100011000110001", I: "01110001000010000100001000010001110", J: "00111000100001000010100101001001100", K: "10001100101110010010100101000110001", L: "10000100001000010000100001000011111", M: "10001110111010110001100011000110001", N: "10001110011010110011100011000110001", O: "01110100011000110001100011000101110", P: "11110100011000111110100001000010000", Q: "01110100011000110001101011001001101", R: "11110100011000111110101001001010001", S: "01111100001000001110000010000111110", T: "11111001000010000100001000010000100", U: "10001100011000110001100011000101110", V: "10001100011000110001100010101000100", W: "10001100011000110101101011101110001", X: "10001100010101000100010101000110001", Y: "10001100010101000100001000010000100", Z: "11111000010001000100010001000011111" };
const SEAL_URL = {};
function waxSealURL(color, letters) {
  const L = String(letters || "").normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2) || "Y", id = color + "|" + L; if (SEAL_URL[id]) return SEAL_URL[id];
  const N = 36, H = N + 6, c0 = 18, g = Array.from({ length: H }, () => Array(N).fill(null)), dark = mixHex(color, "#000000", .35), deep = mixHex(color, "#000000", .55), lite = mixHex(color, "#ffffff", .35);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = x - c0 + .5, dy = y - c0 + .5, a = Math.atan2(dy, dx), r = 15.5 + Math.sin(a * 7) * .9 + Math.sin(a * 3 + 1) * .6, dd = Math.hypot(dx, dy); if (dd < r) g[y][x] = dd > r - 1.6 ? dark : (dx + dy < -14 ? lite : color); }
  [[22, 34, 3, 4], [9, 32, 2, 3]].forEach(([x, y, w, h]) => { for (let j = 0; j < h; j++) for (let i = 0; i < w - (j === h - 1 ? 1 : 0); i++) g[y + j][x + i] = j === h - 1 ? dark : color; }); // drips
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dd = Math.hypot(x - c0 + .5, y - c0 + .5); if (dd >= 10.5 && dd < 11.6) g[y][x] = deep; else if (dd >= 11.6 && dd < 12.4 && g[y][x]) g[y][x] = lite; } // the pressed ring
  const w = L.length * 6 - 1, x0 = c0 - Math.ceil(w / 2), y0 = c0 - 4;
  [...L].forEach((ch, k) => { const f = SEAL_FONT[ch]; for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (f[j * 5 + i] === "1") { const x = x0 + k * 6 + i, y = y0 + j; g[y][x] = deep; if (g[y + 1][x] !== deep) g[y + 1][x] = lite; } }); // the initials, pressed in
  const cv = document.createElement("canvas"); cv.width = N; cv.height = H; const c = cv.getContext("2d");
  for (let y = 0; y < H; y++) for (let x = 0; x < N; x++) { let col = g[y][x]; if (!col) { if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) col = "#1e140c"; else continue; } c.fillStyle = col; c.fillRect(x, y, 1, 1); }
  return (SEAL_URL[id] = cv.toDataURL());
}
