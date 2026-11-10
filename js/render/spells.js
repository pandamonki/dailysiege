// Spell icons and spell effects

// ----- spells: icons and effects -----
const SPELL_ART = {
  hero_a4: { n: "Vigour", c: "#e0584a", sym: "sunburst", fx: "ring", r: 1 },
  warrior_a1: { n: "Cleave", c: "#d9d9e0", sym: "slash", fx: "arc", r: 1.6 },
  warrior_a2: { n: "Shield Wall", c: "#7fb2ff", sym: "shield", fx: "shield", r: 1.1 },
  warrior_a3: { n: "War Cry", c: "#e2a33c", sym: "horn", fx: "ring", r: 3 },
  warrior_ult: { n: "Last Stand", c: "#ffe082", sym: "sunburst", fx: "pillar", r: 1.2 },
  mage_a1: { n: "Fireball", c: "#ff7a2a", sym: "fire", fx: "burst", r: 1.3, at: "t" },
  mage_a2: { n: "Frost Nova", c: "#8fd8ff", sym: "snow", fx: "nova", r: 2.4 },
  mage_a3: { n: "Blink", c: "#c9a0ff", sym: "blink", fx: "swirl", r: 1 },
  mage_ult: { n: "Meteor", c: "#ff5a2a", sym: "meteor", fx: "meteor", r: 2, at: "t" },
  archer_a1: { n: "Piercing Shot", c: "#e6e6c8", sym: "arrow", fx: "streak", r: 1.4, at: "t" },
  archer_a2: { n: "Volley", c: "#c8e07a", sym: "volley", fx: "rain", r: 1.6, at: "t" },
  archer_a3: { n: "Evasion", c: "#9fe0b0", sym: "feather", fx: "swirl", r: .9 },
  archer_ult: { n: "Rain of Arrows", c: "#ffd36a", sym: "rain", fx: "rain", r: 2.5, at: "t" },
  shaman_a1: { n: "Healing Totem", c: "#7fe08a", sym: "totem", fx: "heal", r: 2.5 },
  shaman_a2: { n: "Lightning Bolt", c: "#9fd0ff", sym: "bolt", fx: "bolt", r: 1, at: "t" },
  shaman_a3: { n: "Bloodlust", c: "#e0443a", sym: "blood", fx: "ring", r: 4 },
  shaman_ult: { n: "Spirit Wolves", c: "#c9d6e3", sym: "wolf", fx: "swirl", r: 1.5 },
  rogue_a1: { n: "Backstab", c: "#d34a4a", sym: "dagger", fx: "arc", r: 1, at: "t" },
  rogue_a2: { n: "Smoke Bomb", c: "#9a9aa8", sym: "smoke", fx: "smoke", r: 2 },
  rogue_a3: { n: "Poison Blade", c: "#7ad84a", sym: "drop", fx: "swirl", r: .9 },
  rogue_ult: { n: "Assassinate", c: "#b02a5a", sym: "skull", fx: "streak", r: 1, at: "t" },
};
const SPELL_DUR = { arc: .35, shield: .9, ring: .8, pillar: .9, burst: .55, nova: .75, swirl: .8, meteor: 1.0, streak: .3, rain: 1.0, heal: 1.3, bolt: .4, smoke: 1.3 };
function symPaint(c, sym, x, y, s, col) { // s = half-size
  c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = "#1e140c"; c.lineWidth = Math.max(1.2, s * .1); c.lineJoin = "round"; c.lineCap = "round";
  const P = (...pts) => { c.beginPath(); pts.forEach(([a, b], i) => c[i ? "lineTo" : "moveTo"](a * s, b * s)); c.closePath(); c.fill(); c.stroke(); };
  switch (sym) {
    case "slash": c.beginPath(); c.arc(0, s * .1, s * .8, Math.PI * 1.05, Math.PI * 1.95); c.arc(0, s * .35, s * .55, Math.PI * 1.9, Math.PI * 1.1, true); c.closePath(); c.fill(); c.stroke(); P([-.5, .9], [-.3, .5], [-.1, .6], [-.3, 1]); break;
    case "shield": P([-.7, -.7], [0, -.9], [.7, -.7], [.7, .1], [0, .95], [-.7, .1]); c.fillStyle = "#ecdcb4"; P([-.1, -.6], [.1, -.6], [.1, 0], [.35, 0], [.35, .2], [.1, .2], [.1, .6], [-.1, .6], [-.1, .2], [-.35, .2], [-.35, 0], [-.1, 0]); break;
    case "horn": c.beginPath(); c.moveTo(-.8 * s, .5 * s); c.quadraticCurveTo(-.7 * s, -.7 * s, .8 * s, -.5 * s); c.quadraticCurveTo(.2 * s, -.1 * s, -.3 * s, .6 * s); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.arc(.85 * s, -.55 * s, s * .18, 0, 7); c.fill(); c.stroke(); break;
    case "sunburst": for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(Math.cos(a - .12) * s * .45, Math.sin(a - .12) * s * .45); c.lineTo(Math.cos(a) * s * .98, Math.sin(a) * s * .98); c.lineTo(Math.cos(a + .12) * s * .45, Math.sin(a + .12) * s * .45); c.closePath(); c.fill(); } c.beginPath(); c.arc(0, 0, s * .45, 0, 7); c.fill(); c.stroke(); break;
    case "fire": c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * .9, -s * .1, s * .5, s * .6); c.quadraticCurveTo(0, s * 1.1, -s * .5, s * .6); c.quadraticCurveTo(-s * .8, s * .1, -s * .2, -s * .3); c.quadraticCurveTo(-s * .1, -s * .6, 0, -s); c.fill(); c.stroke(); c.fillStyle = "#ffe082"; c.beginPath(); c.ellipse(0, s * .45, s * .26, s * .36, 0, 0, 7); c.fill(); break;
    case "snow": c.lineWidth = Math.max(2, s * .16); c.strokeStyle = col; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(Math.cos(a) * s * .9, Math.sin(a) * s * .9); c.lineTo(-Math.cos(a) * s * .9, -Math.sin(a) * s * .9); c.stroke(); } c.strokeStyle = "#1e140c"; c.lineWidth = Math.max(1, s * .06); c.beginPath(); c.arc(0, 0, s * .22, 0, 7); c.fillStyle = "#fff"; c.fill(); c.stroke(); break;
    case "blink": P([-.2, -.9], [.6, -.1], [.1, -.05], [.4, .9], [-.6, .05], [-.05, 0]); break;
    case "meteor": c.beginPath(); c.moveTo(-s * .9, -s * .9); c.lineTo(s * .1, -s * .1); c.lineTo(-s * .1, s * .1); c.closePath(); c.fillStyle = hexA(col, .6); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(s * .25, s * .25, s * .55, 0, 7); c.fill(); c.stroke(); c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.arc(s * .1, s * .35, s * .15, 0, 7); c.arc(s * .4, s * .1, s * .1, 0, 7); c.fill(); break;
    case "arrow": P([.9, 0], [.2, -.4], [.2, -.12], [-.8, -.12], [-.8, .12], [.2, .12], [.2, .4]); P([-.8, -.12], [-1, -.4], [-.6, -.4], [-.45, -.12]); break;
    case "volley": [[-.5, -.2], [0, -.5], [.5, -.2]].forEach(([a, b]) => { c.save(); c.translate(a * s, b * s); c.rotate(Math.PI / 2); c.scale(.55, .55); c.translate(-s * .1, 0); P([.9, 0], [.2, -.4], [.2, -.12], [-.8, -.12], [-.8, .12], [.2, .12], [.2, .4]); c.restore(); }); break;
    case "feather": c.beginPath(); c.moveTo(-s * .8, s * .8); c.quadraticCurveTo(-s * .8, -s * .6, s * .8, -s * .85); c.quadraticCurveTo(s * .6, s * .3, -s * .8, s * .8); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-s * .8, s * .8); c.lineTo(s * .4, -s * .4); c.stroke(); break;
    case "rain": [[-.55, -.1], [0, .3], [.55, -.1], [-.2, -.65], [.35, -.55]].forEach(([a, b]) => { c.save(); c.translate(a * s, b * s); c.rotate(Math.PI / 2 + .12); c.scale(.4, .4); P([.9, 0], [.2, -.4], [.2, -.12], [-.8, -.12], [-.8, .12], [.2, .12], [.2, .4]); c.restore(); }); break;
    case "totem": c.fillStyle = "#8a5a2b"; c.fillRect(-s * .25, -s * .7, s * .5, s * 1.6); c.strokeRect(-s * .25, -s * .7, s * .5, s * 1.6); c.fillStyle = col; c.fillRect(-s * .6, -s * .35, s * 1.2, s * .22); c.strokeRect(-s * .6, -s * .35, s * 1.2, s * .22); c.beginPath(); c.arc(0, -s * .85, s * .22, 0, 7); c.fill(); c.stroke(); break;
    case "bolt": P([.2, -1], [-.6, .1], [-.05, .1], [-.25, 1], [.65, -.2], [.1, -.2]); break;
    case "blood": c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * .9, s * .2, 0, s); c.quadraticCurveTo(-s * .9, s * .2, 0, -s); c.fill(); c.stroke(); c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(-s * .25, s * .1, s * .1, s * .25, .3, 0, 7); c.fill(); break;
    case "wolf": c.beginPath(); c.moveTo(-s * .8, s * .7); c.lineTo(-s * .8, -s * .2); c.lineTo(-s * .55, -s * .95); c.lineTo(-s * .2, -s * .4); c.lineTo(s * .2, -s * .4); c.lineTo(s * .55, -s * .95); c.lineTo(s * .8, -s * .2); c.lineTo(s * .8, s * .7); c.lineTo(s * .2, s * .95); c.lineTo(-s * .2, s * .95); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#1e140c"; c.fillRect(-s * .5, 0, s * .3, s * .14); c.fillRect(s * .2, 0, s * .3, s * .14); c.beginPath(); c.arc(0, s * .55, s * .13, 0, 7); c.fill(); break;
    case "dagger": P([0, -1], [.2, .3], [-.2, .3]); c.fillStyle = "#8a5a2b"; P([-.45, .3], [.45, .3], [.45, .45], [-.45, .45]); P([-.12, .45], [.12, .45], [.12, .95], [-.12, .95]); break;
    case "smoke": [[-.5, .3, .5], [.45, .25, .5], [0, -.1, .62], [-.15, -.6, .4]].forEach(([a, b, r]) => { c.beginPath(); c.arc(a * s, b * s, r * s, 0, 7); c.fill(); c.stroke(); }); break;
    case "drop": c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * .95, s * .3, 0, s); c.quadraticCurveTo(-s * .95, s * .3, 0, -s); c.fill(); c.stroke(); c.fillStyle = "#1e140c"; c.beginPath(); c.arc(0, s * .25, s * .16, 0, 7); c.fill(); break;
    case "skull": c.beginPath(); c.arc(0, -s * .15, s * .7, 0, 7); c.fill(); c.stroke(); c.fillRect(-s * .4, s * .35, s * .8, s * .5); c.strokeRect(-s * .4, s * .35, s * .8, s * .5); c.fillStyle = "#1e140c"; c.beginPath(); c.arc(-s * .27, -s * .15, s * .17, 0, 7); c.arc(s * .27, -s * .15, s * .17, 0, 7); c.fill(); break;
    default: c.beginPath(); c.arc(0, 0, s * .7, 0, 7); c.fill(); c.stroke();
  }
  c.restore();
}
const SPELL_CV = {};
const ART_FILES = { warrior_a1: "warrior_cleave", warrior_a2: "warrior_shield_wall", warrior_a3: "warrior_war_cry", warrior_ult: "warrior_last_stand", mage_a1: "mage_fireball", mage_a2: "mage_frost_nova", mage_a3: "mage_blink", mage_ult: "mage_meteor", archer_a1: "archer_piercing_shot", archer_a2: "archer_volley", archer_a3: "archer_evasion", archer_ult: "archer_rain_of_arrows", shaman_a1: "shaman_healing_totem", shaman_a2: "shaman_lightning_bolt", shaman_a3: "shaman_bloodlust", shaman_ult: "shaman_spirit_wolves", rogue_a1: "rogue_backstab", rogue_a2: "rogue_smoke_bomb", rogue_a3: "rogue_poison_blade", rogue_ult: "rogue_assassinate" };
const ART_IMG = {};
const loadSpellArt = () => Object.keys(ART_FILES).forEach(k => { const im = new Image(); im.onload = () => { Object.keys(SPELL_CV).forEach(x => delete SPELL_CV[x]); Object.keys(SPELL_URL).forEach(x => delete SPELL_URL[x]); }; im.src = "icons/" + ART_FILES[k] + ".png"; ART_IMG[k] = im; });
addEventListener("load", () => setTimeout(loadSpellArt, 400));
function spellIconCv(sp, size = 64) {
  const id = sp + size; if (SPELL_CV[id]) return SPELL_CV[id];
  const im = ART_IMG[sp];
  if (im && im.complete && im.naturalWidth) {
    const cv0 = document.createElement("canvas"); cv0.width = cv0.height = size; const c0 = cv0.getContext("2d"), rr = size * .14;
    c0.save(); c0.beginPath(); c0.roundRect ? c0.roundRect(1.5, 1.5, size - 3, size - 3, rr) : c0.rect(1.5, 1.5, size - 3, size - 3); c0.clip(); c0.drawImage(im, 0, 0, size, size); c0.restore();
    c0.beginPath(); c0.roundRect ? c0.roundRect(1.5, 1.5, size - 3, size - 3, rr) : c0.rect(1.5, 1.5, size - 3, size - 3); c0.strokeStyle = "#c9962f"; c0.lineWidth = Math.max(2, size * .05); c0.stroke();
    return (SPELL_CV[id] = cv0);
  }
  return spellIconCvProc(sp, size);
}
function spellIconCvProc(sp, size = 64) {
  const id = "p" + sp + size; if (SPELL_CV[id]) return SPELL_CV[id];
  const a = SPELL_ART[sp] || { c: "#ccc", sym: "x" }, cv = document.createElement("canvas"); cv.width = cv.height = size; const c = cv.getContext("2d");
  const g = c.createRadialGradient(size * .5, size * .4, 2, size / 2, size / 2, size * .75); g.addColorStop(0, hexA(a.c, .55)); g.addColorStop(.6, "#2a1c10"); g.addColorStop(1, "#120a05");
  c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(1.5, 1.5, size - 3, size - 3, size * .14) : c.rect(1.5, 1.5, size - 3, size - 3); c.fill();
  c.strokeStyle = "#c9962f"; c.lineWidth = Math.max(2, size * .045); c.stroke(); c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = 1; c.strokeRect(size * .08, size * .08, size * .84, size * .84);
  symPaint(c, a.sym, size / 2, size / 2, size * .3, a.c); return (SPELL_CV[id] = cv);
}
const SPELL_URL = {}; const spellURL = (sp, size = 64) => SPELL_URL[sp + size] || (SPELL_URL[sp + size] = spellIconCv(sp, size).toDataURL());
function drawSpellFx(e, age) {
  const a = SPELL_ART[e.sp]; if (!a) return; const dur = SPELL_DUR[a.fx] || .8; if (age > dur) return;
  const p = age / dur, x = e.x * ts, y = e.y * ts, R = (e.r || a.r || 1.2) * ts, col = a.c, c = ctx, q = 1 - p;
  c.save(); c.lineCap = "round";
  const ring = (rr, al, w) => { c.globalAlpha = Math.max(0, al); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, rr, rr * .72, 0, 0, 7); c.stroke(); c.globalAlpha = 1; };
  switch (a.fx) {
    case "arc": for (let i = 0; i < 2; i++) { c.globalAlpha = q; c.strokeStyle = i ? col : "#fff"; c.lineWidth = ts * (i ? .09 : .04); c.beginPath(); c.arc(x, y, R * (.55 + .25 * p) , -2.6 + p * 5.2 + i * .4, -.6 + p * 5.2 + i * .4); c.stroke(); } break;
    case "shield": { const b = 1 + Math.sin(p * 20) * .03; c.globalAlpha = .55 * Math.min(1, q * 2.5); c.fillStyle = hexA(col, .4); c.beginPath(); c.ellipse(x, y - ts * .35, R * b, R * 1.1 * b, 0, 0, 7); c.fill(); c.globalAlpha = Math.min(1, q * 2.5); c.strokeStyle = col; c.lineWidth = ts * .06; c.stroke(); break; }
    case "ring": for (let i = 0; i < 3; i++) { const pp = Math.max(0, Math.min(1, p * 1.4 - i * .18)); ring(R * pp, 1 - pp, ts * .07); } break;
    case "pillar": { const w = ts * .7 * (q * .7 + .3); c.globalAlpha = .75 * q; const g = c.createLinearGradient(0, y - ts * 4, 0, y); g.addColorStop(0, hexA(col, 0)); g.addColorStop(1, hexA(col, .95)); c.fillStyle = g; c.fillRect(x - w / 2, y - ts * 4, w, ts * 4); ring(R * (.4 + p * .6), q, ts * .06); break; }
    case "burst": { c.globalAlpha = q * .8; const g = c.createRadialGradient(x, y, 0, x, y, R * (.5 + p)); g.addColorStop(0, "#fff"); g.addColorStop(.35, col); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, R * (.5 + p), 0, 7); c.fill();
      c.globalAlpha = q; c.fillStyle = col; for (let i = 0; i < 8; i++) { const an = i * .785 + .3, d = R * (.4 + p * 1.1); c.beginPath(); c.arc(x + Math.cos(an) * d, y + Math.sin(an) * d * .75, ts * .06 * q, 0, 7); c.fill(); } break; }
    case "nova": ring(R * Math.min(1, p * 2), q, ts * .09); c.globalAlpha = q * .8; c.fillStyle = "#e8f8ff"; for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6, d = R * Math.min(1, p * 2) * .9; c.save(); c.translate(x + Math.cos(an) * d, y + Math.sin(an) * d * .72); c.rotate(an); c.beginPath(); c.moveTo(ts * .12, 0); c.lineTo(-ts * .05, ts * .05); c.lineTo(-ts * .05, -ts * .05); c.fill(); c.restore(); } break;
    case "swirl": for (let i = 0; i < 10; i++) { const an = p * 7 + i * .63, d = R * (.2 + .8 * ((i / 10 + p) % 1)); c.globalAlpha = q; c.fillStyle = col; c.beginPath(); c.arc(x + Math.cos(an) * d, y - ts * .3 + Math.sin(an) * d * .6 - p * ts * .4, ts * .06, 0, 7); c.fill(); } break;
    case "meteor": { const k = Math.min(1, p / .7); if (p < .7) { const sx = x + ts * 3 * (1 - k), sy = y - ts * 5 * (1 - k); c.globalAlpha = 1; const g = c.createLinearGradient(sx + ts * 1.6, sy - ts * 2.5, sx, sy); g.addColorStop(0, hexA(col, 0)); g.addColorStop(1, hexA(col, .9)); c.strokeStyle = g; c.lineWidth = ts * .4; c.beginPath(); c.moveTo(sx + ts * 1.6, sy - ts * 2.5); c.lineTo(sx, sy); c.stroke(); c.fillStyle = "#fff4c0"; c.beginPath(); c.arc(sx, sy, ts * .28, 0, 7); c.fill(); }
      else { const pp = (p - .7) / .3; c.globalAlpha = 1 - pp; const g = c.createRadialGradient(x, y, 0, x, y, R * (.6 + pp)); g.addColorStop(0, "#fff"); g.addColorStop(.4, col); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, R * (.6 + pp), 0, 7); c.fill(); } break; }
    case "streak": c.globalAlpha = q; c.strokeStyle = "#fff"; c.lineWidth = ts * .05; c.beginPath(); c.moveTo(x - R, y - R * .5); c.lineTo(x + R, y + R * .5); c.stroke(); c.strokeStyle = col; c.lineWidth = ts * .12; c.globalAlpha = q * .6; c.stroke(); break;
    case "rain": for (let i = 0; i < 16; i++) { const h = hash(i, 5, 3), h2 = hash(i, 9, 4), st = h * .5, k = Math.max(0, Math.min(1, (p - st) / .35)); if (k <= 0 || k >= 1) continue; const ax = x + (h2 - .5) * R * 2, ay = y + (hash(i, 2, 8) - .5) * R * 1.4; c.globalAlpha = 1; c.strokeStyle = col; c.lineWidth = ts * .04; c.beginPath(); c.moveTo(ax - ts * .15, ay - ts * 1.4 * (1 - k) - ts * .5); c.lineTo(ax, ay - ts * 1.4 * (1 - k)); c.stroke(); } break;
    case "heal": ring(R * .9, q * .7, ts * .05); c.fillStyle = col; for (let i = 0; i < 7; i++) { const an = i * .9, d = R * .7 * hash(i, 1, 6), rise = ((p * 1.5 + i / 7) % 1); c.globalAlpha = (1 - rise) * q * 1.6; const px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * .6 - rise * ts * .9; c.fillRect(px - ts * .02, py - ts * .08, ts * .04, ts * .16); c.fillRect(px - ts * .08, py - ts * .02, ts * .16, ts * .04); } break;
    case "bolt": { c.globalAlpha = q > .5 ? 1 : q * 2; c.strokeStyle = "#fff"; c.lineWidth = ts * .07; c.beginPath(); let px = x + ts * .3, py = y - ts * 3; c.moveTo(px, py); for (let i = 1; i <= 6; i++) { px = x + (hash(i, Math.floor(e.t * 10), 2) - .5) * ts * .7 * (1 - i / 6); py = y - ts * 3 * (1 - i / 6); c.lineTo(px, py); } c.stroke(); c.strokeStyle = col; c.lineWidth = ts * .16; c.globalAlpha *= .4; c.stroke(); break; }
    case "smoke": for (let i = 0; i < 9; i++) { const an = i * .7, d = R * .7 * Math.min(1, p * 2) * hash(i, 3, 1), sz = ts * (.3 + .35 * Math.min(1, p * 2)); c.globalAlpha = .55 * q; c.fillStyle = col; c.beginPath(); c.arc(x + Math.cos(an) * d, y + Math.sin(an) * d * .6 - ts * .2, sz, 0, 7); c.fill(); } break;
  }
  c.globalAlpha = Math.max(0, 1 - p * 1.3); const ic = spellIconCv(e.sp, 48), isz = ts * .55; c.drawImage(ic, x - isz / 2, y - ts * .85 - p * ts * .5 - isz / 2, isz, isz);
  c.restore();
}
