// Mercenary sprites: seven non-human creatures drawn as pixel art, so hired swords never pass for heroes or soldiers.
// Each creature is built from parts (back, legs, body, head, arms, weapon, over) that draw into the same 16-ish pixel grid the soldiers use;
// the upper body bobs while walking and the legs stay planted. The lord's colour shows in one small accent (shield, loincloth, saddle, scarf).
// Used by spr() in sprites.js for the mercenary unit keys; the first draft designs are kept as pictures in docs/merc-sprite-designs.
const MERC_ART = {};
const MA = (key, W, H, x0, pal, parts, vars) => { MERC_ART[key] = { W, H, x0, pal, parts, vars: vars || {} }; };
const NOP = () => {};

// ================= Skeleton Guard =================
const skelLegs = c => { const { P, RF, wf, contact } = c, x0 = c.x0;
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 13, bx, 14, "b"); RF(bx, 15, bx + 1, 15, "s"); } else { RF(bx, 13, bx, 16, "b"); P(bx, 15, "d"); RF(bx - 1, 17, bx + 1, 17, "s"); } };
  if (wf < 0) { leg(8 + x0, 0, 0); leg(11 + x0, 0, 0); } else if (contact) { leg(8 + x0, 0, -1); leg(11 + x0, 0, 1); } else if (wf === 1) { leg(8 + x0, 1, 0); leg(11 + x0, 0, 0); } else { leg(8 + x0, 0, 0); leg(11 + x0, 1, 0); } };
const skelBody = c => { const { P, R } = c, x0 = c.x0;
  R(7 + x0, 12, 12 + x0, 12, "s"); R(8 + x0, 11, 11 + x0, 11, "b"); R(7 + x0, 8, 12 + x0, 8, "b"); R(9 + x0, 7, 10 + x0, 7, "s");
  for (let y = 9; y <= 10; y++) { R(7 + x0, y, 12 + x0, y, y === 9 ? "b" : "s"); R(9 + x0, y, 10 + x0, y, "d"); } R(8 + x0, 11, 11 + x0, 11, "b"); R(13 + x0, 8, 13 + x0, 9, "s"); };
const skelSkull = c => { const { P, R } = c, x0 = c.x0;
  R(7 + x0, 3, 12 + x0, 6, "b"); R(8 + x0, 4, 8 + x0, 5, "d"); R(11 + x0, 4, 11 + x0, 5, "d"); P(8 + x0, 4, "e"); P(11 + x0, 4, "e"); P(9 + x0, 6, "d"); P(10 + x0, 6, "d");
  R(8 + x0, 7, 11 + x0, 7, "b"); P(8 + x0, 7, "d"); P(10 + x0, 7, "d"); };
const skelCap = c => { const { P, R } = c, x0 = c.x0; skelSkull(c); R(7 + x0, 2, 12 + x0, 2, "m"); P(6 + x0, 3, "m"); P(13 + x0, 3, "m"); P(9 + x0, 1, "M"); P(10 + x0, 1, "M"); };
const skelShield = c => { const { P, R } = c, x0 = c.x0;
  R(6 + x0, 8, 6 + x0, 10, "s"); R(1 + x0, 8, 5 + x0, 12, "w"); R(2 + x0, 7, 4 + x0, 7, "w"); R(2 + x0, 13, 4 + x0, 13, "w"); R(1 + x0, 8, 1 + x0, 12, "M"); R(3 + x0, 9, 4 + x0, 11, "T"); P(3 + x0, 10, "g"); };
const skelSword = c => { const { P, R, ap } = c, sx = 14 + c.x0;
  if (ap === 1) { R(sx, 0, sx, 6, "m"); R(sx - 1, 7, sx + 1, 7, "g"); P(sx, 8, "w"); P(sx - 1, 8, "s"); }
  else if (ap === 2) { R(sx, 8, sx + 3, 8, "m"); R(sx - 1, 7, sx - 1, 9, "g"); P(sx - 1, 8, "w"); P(sx + 3, 7, "b"); }
  else { R(sx, 3, sx, 9, "m"); R(sx - 1, 10, sx + 1, 10, "g"); P(sx, 11, "w"); P(sx - 1, 9, "s"); } };
MA("skel", 20, 20, 2, { b: "#ece6d0", s: "#b9b199", d: "#4d4733", e: "#7fe08a", w: "#8a5a2b", m: "#9a8f78", M: "#6f6554", g: "#e2b33c", t: "#f6f1e0", T: "#4aa3ff" },
  { back: NOP, legs: skelLegs, body: skelBody, head: skelCap, arms: skelShield, weapon: skelSword, over: NOP });

// ================= Necromancer =================
const necRobe = c => { const { P, R, RF, wf, odd } = c, x0 = c.x0, sway = wf >= 0 && odd ? 1 : 0;
  R(6 + x0, 12, 13 + x0, 15, "r"); R(5 + x0, 15, 14 + x0, 17, "r"); R(5 + x0, 17, 14 + x0, 17, "R");
  for (let i = 0; i < 10; i++) { if (i % 2 === (sway ? 1 : 0)) RF(5 + x0 + i, 18, 5 + x0 + i, 18, "r"); if (i % 3 === 1) RF(5 + x0 + i, 19, 5 + x0 + i, 19, "R"); }
  R(9 + x0, 12, 10 + x0, 17, "R"); R(6 + x0, 12, 13 + x0, 12, "p"); P(9 + x0, 12, "T"); P(10 + x0, 12, "T"); };
const necShoulders = c => { const { R } = c, x0 = c.x0; R(5 + x0, 8, 14 + x0, 11, "r"); R(4 + x0, 9, 4 + x0, 11, "r"); R(15 + x0, 9, 15 + x0, 11, "r"); R(5 + x0, 8, 14 + x0, 8, "h"); };
const necSkull = c => { const { P, R } = c, x0 = c.x0;
  R(7 + x0, 3, 12 + x0, 7, "b"); R(8 + x0, 4, 8 + x0, 5, "d"); R(11 + x0, 4, 11 + x0, 5, "d"); P(8 + x0, 4, "e"); P(11 + x0, 4, "e"); P(8 + x0, 5, "e"); P(11 + x0, 5, "e"); P(9 + x0, 6, "d"); P(10 + x0, 6, "d"); R(8 + x0, 7, 11 + x0, 7, "b"); P(9 + x0, 7, "d"); P(10 + x0, 7, "d"); };
const necHood = c => { const { P, R } = c, x0 = c.x0;
  R(6 + x0, 2, 13 + x0, 3, "R"); R(5 + x0, 4, 14 + x0, 7, "R"); R(6 + x0, 1, 13 + x0, 1, "R"); P(5 + x0, 3, "R"); P(14 + x0, 3, "R");
  P(5 + x0, 1, "b"); P(4 + x0, 0, "b"); P(14 + x0, 1, "b"); P(15 + x0, 0, "b"); necSkull(c); P(7 + x0, 3, "R"); P(12 + x0, 3, "R"); };
const necHands = c => { const { P } = c, x0 = c.x0; P(4 + x0, 12, "b"); P(15 + x0, 12, "b"); P(3 + x0, 12, "b"); };
const necStaff = c => { const { P, R, ap } = c, x0 = c.x0, up = ap === 1 ? -2 : 0, sxx = 16 + x0;
  R(sxx, 5 + up, sxx, 17 + up, "w"); R(sxx - 1, 2 + up, sxx + 1, 4 + up, "b"); P(sxx - 1, 3 + up, "d"); P(sxx + 1, 3 + up, "d"); P(sxx, 4 + up, "d");
  P(sxx, 0 + up, "f"); P(sxx - 1, 1 + up, "f"); P(sxx + 1, 1 + up, "f"); P(sxx, 1 + up, "E");
  if (ap === 2) { R(sxx - 2, 0, sxx + 2, 1, "f"); P(sxx, 0, "E"); P(sxx - 3, 2, "e"); P(sxx + 3, 2, "e"); P(sxx - 3, 5, "e"); } };
MA("necro", 20, 22, 2, { r: "#233d33", R: "#10211a", h: "#3d6b55", b: "#ece6d0", d: "#1a1a12", e: "#7fe08a", E: "#c9ffd0", w: "#5a3f24", p: "#4a2f6a", T: "#4aa3ff", f: "#58d070", t: "#e8dcc0" },
  { back: NOP, legs: necRobe, body: necShoulders, head: necHood, arms: necHands, weapon: necStaff, over: NOP });

// ================= Dark Elf Assassin =================
const delfLegs = c => { const { RF, wf, contact } = c, x0 = c.x0;
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 13, bx + 1, 14, "a"); RF(bx, 15, bx + 1, 15, "A"); } else { RF(bx, 13, bx + 1, 16, "a"); RF(bx - 1, 17, bx + 1, 17, "A"); } };
  if (wf < 0) { leg(7 + x0, 0, 0); leg(10 + x0, 0, 0); } else if (contact) { leg(7 + x0, 0, -1); leg(10 + x0, 0, 1); } else if (wf === 1) { leg(7 + x0, 1, 0); leg(10 + x0, 0, 0); } else { leg(7 + x0, 0, 0); leg(10 + x0, 1, 0); } };
const delfBody = c => { const { P, R } = c, x0 = c.x0;
  R(7 + x0, 9, 12 + x0, 12, "a"); R(6 + x0, 9, 6 + x0, 10, "A"); R(13 + x0, 9, 13 + x0, 10, "A"); R(7 + x0, 9, 12 + x0, 9, "A"); R(7 + x0, 12, 12 + x0, 12, "s"); P(9 + x0, 10, "s"); P(10 + x0, 11, "s");
  R(7 + x0, 8, 12 + x0, 8, "T"); R(3 + x0, 8, 6 + x0, 8, "T"); R(1 + x0, 9, 3 + x0, 9, "T"); P(0 + x0, 10, "T"); };
const delfHead = c => { const { P, R } = c, x0 = c.x0;
  R(6 + x0, 2, 13 + x0, 3, "h"); R(5 + x0, 3, 5 + x0, 8, "h"); R(14 + x0, 3, 14 + x0, 7, "h"); P(4 + x0, 8, "H"); P(4 + x0, 9, "H"); P(5 + x0, 9, "H");
  R(7 + x0, 4, 12 + x0, 6, "k"); R(8 + x0, 7, 11 + x0, 7, "k"); P(7 + x0, 6, "K"); P(12 + x0, 6, "K"); P(9 + x0, 7, "K"); P(10 + x0, 7, "K"); R(7 + x0, 3, 12 + x0, 3, "h"); P(8 + x0, 4, "e"); P(11 + x0, 4, "e"); P(8 + x0, 5, "e"); P(11 + x0, 5, "e");
  [[6, 5], [5, 5], [4, 5], [3, 4], [2, 4], [13, 5], [14, 5], [15, 5], [16, 4], [17, 4]].forEach(([x, y]) => P(x + x0, y, "k")); };
const delfBlades = c => { const { P, R, ap } = c, x0 = c.x0, rb = 14 + x0, lb = 2 + x0;
  if (ap === 1) { R(rb, 2, rb, 8, "m"); P(rb + 1, 2, "m"); P(rb + 1, 1, "m"); R(rb - 1, 9, rb + 1, 9, "s"); P(rb, 10, "w"); R(lb, 2, lb, 8, "m"); P(lb - 1, 2, "m"); P(lb - 1, 1, "m"); R(lb - 1, 9, lb + 1, 9, "s"); P(lb, 10, "w"); }
  else if (ap === 2) { R(rb, 9, rb + 3, 9, "m"); P(rb + 3, 8, "m"); P(rb + 4, 7, "m"); R(rb - 1, 8, rb - 1, 10, "s"); P(rb - 2, 9, "w"); R(lb - 1, 11, lb + 2, 11, "m"); P(lb - 1, 12, "m"); R(lb + 2, 10, lb + 2, 12, "s"); P(lb + 3, 11, "w"); }
  else { R(rb, 9, rb, 13, "m"); P(rb + 1, 13, "m"); P(rb + 1, 14, "m"); R(rb - 1, 8, rb + 1, 8, "s"); P(rb, 7, "w"); R(lb, 9, lb, 13, "m"); P(lb - 1, 13, "m"); P(lb - 1, 14, "m"); R(lb - 1, 8, lb + 1, 8, "s"); P(lb, 7, "w"); } };
MA("delf", 20, 20, 2, { k: "#6a4aa0", K: "#47337a", h: "#f1ecff", H: "#b3a8d8", e: "#ff3b4a", a: "#28222f", A: "#4b4260", s: "#c9d0dc", m: "#dfe5ec", w: "#4a2f17", t: "#ffffff", W: "#f4efe0", T: "#4aa3ff" },
  { back: NOP, legs: delfLegs, body: delfBody, head: delfHead, arms: NOP, weapon: delfBlades, over: NOP });

// ================= Orc Berserker =================
const orcLegs = c => { const { RF, wf, contact } = c, x0 = c.x0;
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 13, bx + 1, 14, "G"); RF(bx, 15, bx + 2, 15, "L"); } else { RF(bx, 13, bx + 1, 16, "G"); RF(bx - 1, 17, bx + 2, 17, "L"); } };
  if (wf < 0) { leg(7 + x0, 0, 0); leg(11 + x0, 0, 0); } else if (contact) { leg(7 + x0, 0, -1); leg(11 + x0, 0, 1); } else if (wf === 1) { leg(7 + x0, 1, 0); leg(11 + x0, 0, 0); } else { leg(7 + x0, 0, 0); leg(11 + x0, 1, 0); } };
const orcBody = c => { const { P, R } = c, x0 = c.x0;
  R(5 + x0, 8, 14 + x0, 12, "g"); R(6 + x0, 9, 8 + x0, 10, "G"); R(11 + x0, 9, 13 + x0, 10, "G");
  for (let i = 0; i < 5; i++) P(6 + x0 + i + (i > 2 ? 1 : 0), 8 + i % 4, "L"); R(5 + x0, 12, 14 + x0, 12, "L"); P(9 + x0, 12, "b"); P(10 + x0, 12, "b");
  R(8 + x0, 13, 11 + x0, 14, "T"); P(9 + x0, 15, "T"); P(10 + x0, 15, "T");
  R(3 + x0, 8, 5 + x0, 9, "L"); P(3 + x0, 7, "m"); P(4 + x0, 6, "m"); P(5 + x0, 7, "m"); R(14 + x0, 8, 16 + x0, 9, "L"); P(16 + x0, 7, "m"); P(15 + x0, 6, "m"); P(14 + x0, 7, "m");
  R(3 + x0, 10, 4 + x0, 13, "g"); R(3 + x0, 12, 4 + x0, 13, "M"); };
const orcFace = c => { const { P, R } = c, x0 = c.x0; R(7 + x0, 3, 12 + x0, 6, "g"); R(6 + x0, 5, 13 + x0, 8, "g"); };
const orcHead = c => { const { P, R } = c, x0 = c.x0; orcFace(c);
  R(8 + x0, 1, 11 + x0, 2, "r"); P(7 + x0, 2, "r"); P(12 + x0, 2, "r"); P(9 + x0, 0, "r"); P(10 + x0, 0, "r");
  R(7 + x0, 4, 12 + x0, 4, "D"); P(8 + x0, 5, "y"); P(11 + x0, 5, "y"); P(9 + x0, 6, "G"); P(10 + x0, 6, "G"); R(7 + x0, 7, 12 + x0, 7, "D"); P(7 + x0, 5, "r"); P(12 + x0, 5, "r"); P(8 + x0, 7, "t"); P(11 + x0, 7, "t");
  P(6 + x0, 6, "t"); P(6 + x0, 5, "t"); P(13 + x0, 6, "t"); P(13 + x0, 5, "t"); R(7 + x0, 8, 12 + x0, 8, "G"); };
const orcCleaver = c => { const { P, R, ap } = c, hx = 16 + c.x0;
  if (ap === 1) { R(hx - 1, 2, hx - 1, 9, "w"); R(hx, 0, hx + 2, 5, "m"); R(hx + 2, 0, hx + 2, 5, "M"); P(hx - 2, 4, "m"); }
  else if (ap === 2) { R(hx - 5, 11, hx - 1, 11, "w"); R(hx, 7, hx + 2, 15, "m"); R(hx + 2, 7, hx + 2, 15, "M"); }
  else { R(hx - 1, 5, hx - 1, 13, "w"); R(hx, 3, hx + 2, 11, "m"); R(hx + 2, 3, hx + 2, 11, "M"); P(hx, 4, "t"); P(hx + 1, 7, "M"); }
  R(13 + c.x0, 10, 15 + c.x0, 10, "g"); };
const orcClub = c => { const { P, R, ap } = c, hx = 16 + c.x0;
  if (ap === 1) { R(hx - 1, 5, hx - 1, 10, "w"); R(hx - 2, 0, hx + 1, 5, "l"); [[hx - 3, 1], [hx + 2, 0], [hx + 2, 3], [hx - 1, -1]].forEach(([x, y]) => P(x, y, "m")); }
  else if (ap === 2) { R(hx - 5, 11, hx - 1, 11, "w"); R(hx, 9, hx + 2, 13, "l"); [[hx + 3, 9], [hx + 3, 12], [hx + 1, 8], [hx + 1, 14]].forEach(([x, y]) => P(x, y, "m")); }
  else { R(hx - 1, 8, hx - 1, 14, "w"); R(hx - 2, 2, hx + 1, 8, "l"); [[hx - 3, 3], [hx + 2, 2], [hx + 2, 6], [hx - 3, 7], [hx - 1, 1]].forEach(([x, y]) => P(x, y, "m")); }
  R(13 + c.x0, 10, 15 + c.x0, 10, "g"); };
MA("orc", 20, 20, 1, { g: "#6b9a3a", G: "#4a7a2a", D: "#25421a", t: "#f1e8cf", r: "#d03a2a", y: "#ffd24a", e: "#ff4a3a", L: "#6a4a2c", l: "#8e6a3e", m: "#b9c0c7", M: "#6a7078", w: "#8a5a2b", T: "#4aa3ff", b: "#e8e2cc" },
  { back: NOP, legs: orcLegs, body: orcBody, head: orcHead, arms: NOP, weapon: orcCleaver, over: NOP }, {
  c: { name: "Skull Warlord", pal: { g: "#b84a2e", G: "#8a3220", D: "#3a1410", y: "#ffe45a" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; orcFace(c); R(7 + x0, 4, 12 + x0, 4, "D"); P(8 + x0, 5, "y"); P(11 + x0, 5, "y"); P(9 + x0, 6, "G"); P(10 + x0, 6, "G"); R(7 + x0, 7, 12 + x0, 7, "D"); P(8 + x0, 7, "t"); P(11 + x0, 7, "t"); P(6 + x0, 6, "t"); P(13 + x0, 6, "t"); R(7 + x0, 8, 12 + x0, 8, "G");
      R(7 + x0, 2, 12 + x0, 3, "b"); R(8 + x0, 1, 11 + x0, 1, "b"); P(9 + x0, 2, "D"); P(10 + x0, 2, "D"); [[6, 2], [5, 1], [5, 0], [13, 2], [14, 1], [14, 0]].forEach(([x, y]) => P(x + x0, y, "t")); },
    weapon: c => { const { P, R, ap } = c, hx = 16 + c.x0;
      if (ap === 1) { R(hx - 1, 3, hx - 1, 10, "w"); R(hx - 3, 0, hx - 2, 5, "m"); R(hx, 0, hx + 2, 5, "m"); R(hx + 2, 0, hx + 2, 5, "M"); }
      else if (ap === 2) { R(hx - 5, 11, hx - 1, 11, "w"); R(hx, 7, hx + 2, 15, "m"); R(hx + 2, 7, hx + 2, 15, "M"); P(hx - 1, 7, "m"); P(hx - 1, 15, "m"); }
      else { R(hx - 1, 5, hx - 1, 14, "w"); R(hx - 3, 3, hx - 2, 8, "m"); R(hx, 3, hx + 2, 8, "m"); R(hx + 2, 3, hx + 2, 8, "M"); P(hx - 3, 3, "M"); P(hx - 3, 4, "M"); }
      R(13 + c.x0, 10, 15 + c.x0, 10, "g"); } } } });

// ---------- Troll Warlord ----------
const tLegs = c => { const { RF, wf, contact } = c;
  const leg = (x, dx, lift) => { if (lift) { RF(x + dx, 16, x + dx + 2, 17, "G"); RF(x + dx - 1, 18, x + dx + 2, 18, "D"); } else { RF(x + dx, 16, x + dx + 2, 19, "G"); RF(x + dx - 1, 20, x + dx + 2, 20, "D"); } };
  if (wf < 0) { leg(6, 0); leg(11, 0); } else if (contact) { leg(6, -1); leg(11, 1); } else if (wf === 1) { leg(6, 0, 1); leg(11, 0); } else { leg(6, 0); leg(11, 0, 1); } };
const tBody = c => { const { P, R } = c;
  R(4, 9, 15, 16, "g"); R(6, 12, 13, 16, "G"); R(2, 9, 3, 15, "g"); R(2, 14, 3, 16, "G"); R(16, 9, 17, 14, "g"); R(16, 13, 17, 15, "G"); R(7, 15, 12, 17, "T"); };
const tHead = c => { const { P, R } = c;
  R(6, 2, 13, 8, "g"); R(6, 4, 13, 4, "D"); P(7, 5, "y"); P(12, 5, "y"); R(7, 7, 12, 8, "G"); P(7, 6, "t"); P(12, 6, "t"); P(7, 7, "t"); P(12, 7, "t");
  R(6, 1, 13, 1, "i"); P(6, 0, "i"); P(9, 0, "i"); P(10, 0, "i"); P(13, 0, "i"); };
const tClub = c => { const { P, R, ap } = c;
  if (ap === 1) { R(18, 3, 19, 12, "w"); R(17, 0, 19, 4, "W"); P(16, 1, "i"); }
  else if (ap === 2) { R(14, 13, 19, 14, "w"); R(18, 10, 19, 17, "W"); P(20, 11, "i"); P(20, 16, "i"); }
  else { R(18, 6, 19, 16, "w"); R(17, 3, 19, 8, "W"); P(16, 4, "i"); P(16, 7, "i"); }
  R(16, 11, 19, 13, "g"); };
MERC_ART.trollw = { W: 20, H: 22, x0: 0, pal: { g: "#6f98a8", G: "#4b7385", D: "#2c4755", y: "#ffd24a", t: "#f1e8cf", i: "#9a9aa2", w: "#6a4524", W: "#8a5a2b", T: "#4aa3ff", v: "#5ec06a", L: "#5a3d22" },
  parts: { legs: tLegs, body: tBody, head: tHead, weapon: tClub }, vars: {
  b: { name: "Swamp Troll", pal: { g: "#7e9a4a", G: "#566e30", D: "#33441e", y: "#ff8a2a", t: "#e8dcb0", i: "#d8c890" }, parts: {
    head: c => { const { P, R } = c; R(6, 2, 13, 8, "g"); R(6, 4, 13, 4, "D"); P(7, 5, "y"); P(12, 5, "y"); R(7, 7, 12, 8, "G"); P(7, 6, "t"); P(12, 6, "t"); P(7, 7, "t"); P(12, 7, "t"); R(14, 5, 16, 6, "g"); P(16, 7, "G");
      R(8, 0, 11, 1, "v"); P(7, 1, "v"); P(12, 1, "v"); P(9, -1 < 0 ? 0 : 0, "v"); } } } } };

// ---------- Ogre Breaker ----------
const oLegs = c => { const { RF, wf, contact } = c;
  const leg = (x, dx, lift) => { if (lift) { RF(x + dx, 17, x + dx + 3, 17, "G"); RF(x + dx - 1, 18, x + dx + 3, 18, "D"); } else { RF(x + dx, 17, x + dx + 3, 19, "G"); RF(x + dx - 1, 20, x + dx + 3, 20, "D"); } };
  if (wf < 0) { leg(6, 0); leg(12, 0); } else if (contact) { leg(6, -1); leg(12, 1); } else if (wf === 1) { leg(6, 0, 1); leg(12, 0); } else { leg(6, 0); leg(12, 0, 1); } };
const oBody = c => { const { P, R } = c;
  R(3, 9, 18, 17, "g"); R(5, 12, 16, 17, "G"); R(1, 10, 2, 16, "g"); R(1, 15, 2, 17, "G"); R(19, 10, 20, 15, "g"); R(3, 13, 18, 14, "L"); R(9, 13, 12, 14, "y"); R(8, 15, 13, 18, "T"); };
const oHead = c => { const { P, R } = c;
  R(6, 2, 15, 8, "g"); R(7, 7, 14, 8, "G"); R(9, 3, 12, 6, "e"); R(10, 3, 11, 6, "p"); P(10, 4, "k"); P(11, 4, "k"); R(7, 3, 14, 3, "D"); P(10, 0, "t"); P(11, 0, "t"); P(10, 1, "t"); P(11, 1, "t"); P(8, 7, "t"); P(10, 7, "t"); P(13, 7, "t"); };
const oMaul = c => { const { P, R, ap } = c;
  if (ap === 1) { R(20, 7, 20, 14, "L"); R(18, 1, 21, 6, "s"); R(18, 6, 21, 6, "S"); }
  else if (ap === 2) { R(13, 14, 20, 15, "L"); R(17, 11, 21, 19, "s"); R(17, 19, 21, 19, "S"); }
  else { R(20, 8, 20, 17, "L"); R(18, 3, 21, 9, "s"); R(18, 9, 21, 9, "S"); }
  R(19, 12, 20, 14, "g"); };
MERC_ART.ogre = { W: 22, H: 22, x0: 0, pal: { g: "#d2a972", G: "#a97d4a", D: "#6a4a28", e: "#fff4d8", p: "#6a2a8a", y: "#ffd24a", k: "#2a2a30", s: "#8f8a80", S: "#6a665e", t: "#f1e8cf", L: "#5a3d22", T: "#4aa3ff", i: "#9a9aa2" },
  parts: { legs: oLegs, body: oBody, head: oHead, weapon: oMaul } };

// ---------- Centaur Archer: a human archer on a horse's body ----------
const cLegs = c => { const { RF, wf, contact } = c;
  const leg = (x, dx, lift) => { if (lift) { RF(x + dx, 15, x + dx + 1, 16, "H"); RF(x + dx, 17, x + dx + 1, 17, "k"); } else { RF(x + dx, 15, x + dx + 1, 18, "H"); RF(x + dx - 0, 19, x + dx + 1, 19, "k"); } };
  if (wf < 0) { [4, 7, 15, 18].forEach(x => leg(x, 0)); }
  else if (contact) { const s = wf === 0 ? 1 : -1; leg(4, -s); leg(7, s); leg(15, s); leg(18, -s); }
  else { const a = wf === 1; leg(4, 0, a); leg(7, 0, !a); leg(15, 0, !a); leg(18, 0, a); } };
const cBody = c => { const { P, R } = c;
  R(3, 10, 19, 14, "h"); R(3, 13, 19, 14, "H"); R(2, 11, 3, 13, "h"); R(14, 9, 19, 12, "h"); R(0, 10, 2, 12, "m"); R(0, 12, 1, 15, "m"); R(0, 15, 0, 16, "m"); R(5, 9, 12, 9, "H"); R(8, 9, 11, 10, "T"); };
const cTorso = c => { const { P, R } = c; // a plain human soldier from the waist up, facing right
  R(15, 6, 20, 11, "a"); R(15, 10, 20, 10, "b"); P(14, 7, "s"); P(14, 8, "s"); P(21, 9, "s"); P(21, 8, "s");
  R(15, 1, 20, 5, "s"); R(15, 1, 20, 1, "hh"); P(15, 2, "hh"); P(20, 4, "s"); P(16, 3, "e"); P(19, 3, "e"); };
const cHeadA = c => { const { P, R } = c; cTorso(c); R(15, 1, 20, 2, "hc"); P(14, 3, "hc"); P(13, 4, "hc"); P(21, 3, "hc"); P(20, 0, "fe"); P(21, -1, "fe"); };
const cBow = c => { const { P, R, ap } = c;
  if (ap === 1) { P(21, 4, "w"); R(22, 5, 22, 11, "w"); P(21, 12, "w"); R(18, 8, 21, 8, "t"); P(17, 8, "t"); P(17, 9, "fe"); R(21, 5, 21, 11, "t"); }
  else { P(21, 4, "w"); R(22, 5, 22, 11, "w"); P(21, 12, "w"); R(21, 5, 21, 11, "t"); if (ap === 2) { P(23, 8, "t"); P(22, 8, "t"); P(23, 7, "fe"); } } };
MERC_ART.centaur = { W: 24, H: 20, x0: 0, pal: { h: "#9a6a38", H: "#6e4724", m: "#2a1a10", s: "#e7b98a", e: "#2a1a10", a: "#d9d4c0", b: "#6b4a2a", hc: "#b8322a", hh: "#5a3a1e", fe: "#d8c25a", w: "#8a5a2b", t: "#efe6cf", k: "#3a2a1c", T: "#4aa3ff", L: "#5a3d22" },
  parts: { legs: cLegs, body: cBody, head: cHeadA, weapon: cBow } };

// the looks the game uses: Skull Warlord orcs and Swamp Trolls; the tougher v2 Ogre, Necromancer and Skeleton share their first version's look
const MERC_LOOK = { orc: "c", trollw: "b" };
MERC_ART.ogre2 = MERC_ART.ogre; MERC_ART.necro2 = MERC_ART.necro; MERC_ART.skel2 = MERC_ART.skel;
const MERC_PARTS = ["back", "legs", "body", "head", "arms", "weapon", "over"];
function mercSprite(key, team, pose = "") {
  const base = MERC_ART[key], vid = MERC_LOOK[key], v = vid && base.vars[vid] || { pal: {}, parts: {} };
  const pal = Object.assign({}, base.pal, v.pal), parts = Object.assign({}, base.parts, v.parts); if (team) pal.T = team;
  const W = base.W, H = base.H, g = Array.from({ length: H }, () => Array(W).fill(null));
  const wf = pose[0] === "w" ? +pose[1] : -1, ap = pose[0] === "a" ? +pose[1] : 0, contact = wf === 0 || wf === 2, odd = wf === 1 || wf === 3, DY = contact ? 1 : 0;
  const put = (x, y, k) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = pal[k] || k; };
  const mk = dy => ({ P: (x, y, k) => put(x, y + dy, k), R: (x0, y0, x1, y1, k) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y + dy, k); } });
  const b = mk(DY), f = mk(0), c = { P: b.P, R: b.R, F: f.P, RF: f.R, wf, ap, contact, odd, x0: base.x0 };
  MERC_PARTS.forEach(p => parts[p] && parts[p](c));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let col = g[y][x];
    if (!col) { if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) col = "#1e140c"; else continue; }
    cx.fillStyle = col; cx.fillRect(x, y, 1, 1);
  }
  return cv;
}
// the gold coin with crossed blades that floats over every mercenary in the replay (9 x 9 pixels)
const MERC_COIN_ROWS = ["..kkkkk..", ".kYYYYYk.", "kYdYYYdYk", "kYYdYdYYk", "kYYYdYYYk", "kYYdYdYYk", "kYdYYYdYk", ".kYYYYYk.", "..kkkkk.."];
let MERC_COIN_CV = null;
function mercCoin() {
  if (MERC_COIN_CV) return MERC_COIN_CV;
  const pal = { k: "#3e2714", Y: "#ffd24a", d: "#9a5a10" }, cv = document.createElement("canvas"); cv.width = cv.height = 9; const c = cv.getContext("2d");
  MERC_COIN_ROWS.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") { c.fillStyle = pal[ch]; c.fillRect(x, y, 1, 1); } }));
  return (MERC_COIN_CV = cv);
}
