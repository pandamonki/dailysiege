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
