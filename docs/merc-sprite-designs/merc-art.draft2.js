// Mercenary creature sprites, built from parts so each creature can have alternative looks.
// Parts: back, legs, body, head, arms, weapon, over. c = { P, R, RF, wf, ap, contact, odd, x0 }
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
  { back: NOP, legs: skelLegs, body: skelBody, head: skelCap, arms: skelShield, weapon: skelSword, over: NOP }, {
  b: { name: "Bone Viking", pal: { b: "#cfdce6", s: "#9fb0be", e: "#ff4a3a" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; skelSkull(c); R(7 + x0, 1, 12 + x0, 2, "m"); P(6 + x0, 3, "m"); P(13 + x0, 3, "m"); R(9 + x0, 1, 10 + x0, 1, "M"); [[6, 2], [5, 1], [5, 0], [13, 2], [14, 1], [14, 0]].forEach(([x, y]) => P(x + x0, y, "t")); },
    weapon: c => { const { P, R, ap } = c, sx = 14 + c.x0;
      if (ap === 1) { R(sx, 0, sx, 8, "w"); R(sx + 1, 0, sx + 2, 3, "m"); P(sx + 3, 1, "m"); P(sx + 3, 2, "m"); }
      else if (ap === 2) { R(sx - 1, 9, sx + 1, 9, "w"); R(sx + 2, 7, sx + 3, 11, "m"); P(sx + 4, 8, "m"); P(sx + 4, 10, "m"); }
      else { R(sx, 3, sx, 11, "w"); R(sx + 1, 3, sx + 2, 6, "m"); P(sx + 3, 4, "m"); P(sx + 3, 5, "m"); } } } },
  c: { name: "Death Knight", pal: { b: "#c9ced6", s: "#8b93a0", m: "#4a5060", M: "#2e3340", e: "#4ab4ff", g: "#b9c0c7" }, parts: {
    back: c => { const { R } = c, x0 = c.x0; R(6 + x0, 9, 13 + x0, 16, "T"); R(6 + x0, 16, 13 + x0, 16, "M"); },
    head: c => { const { P, R } = c, x0 = c.x0; R(7 + x0, 2, 12 + x0, 6, "m"); R(7 + x0, 2, 12 + x0, 2, "M"); R(8 + x0, 4, 11 + x0, 4, "e"); R(8 + x0, 7, 11 + x0, 7, "M"); R(9 + x0, 5, 10 + x0, 6, "M"); R(9 + x0, 0, 10 + x0, 1, "T"); P(9 + x0, -1, "T"); },
    over: c => { const { P, R } = c, x0 = c.x0; R(7 + x0, 8, 12 + x0, 11, "m"); R(9 + x0, 8, 10 + x0, 11, "M"); R(5 + x0, 7, 7 + x0, 8, "m"); R(12 + x0, 7, 14 + x0, 8, "m"); P(5 + x0, 6, "M"); P(14 + x0, 6, "M"); R(7 + x0, 11, 12 + x0, 11, "M"); } } },
  d: { name: "Flame Skull", pal: { b: "#d8e8c8", s: "#a9c090", e: "#ffb02a", f: "#58d070", F: "#c9ffd0" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; skelSkull(c); R(8 + x0, 2, 11 + x0, 2, "f"); [[7, 2], [12, 2], [8, 1], [11, 1], [9, 0], [10, 0]].forEach(([x, y]) => P(x + x0, y, y === 0 ? "F" : "f")); P(9 + x0, 1, "F"); P(10 + x0, 1, "f"); },
    arms: c => { const { P, R } = c, x0 = c.x0; R(6 + x0, 8, 6 + x0, 11, "s"); R(5 + x0, 12, 7 + x0, 12, "b"); P(4 + x0, 13, "b"); P(8 + x0, 13, "b"); P(6 + x0, 13, "b"); },
    weapon: c => { const { P, R, ap } = c, sx = 14 + c.x0;
      if (ap === 1) { R(sx, 1, sx, 6, "m"); P(sx + 1, 0, "m"); P(sx + 1, 1, "m"); R(sx - 1, 7, sx + 1, 7, "g"); P(sx, 8, "w"); }
      else if (ap === 2) { R(sx, 9, sx + 3, 9, "m"); P(sx + 4, 8, "m"); P(sx + 4, 7, "m"); R(sx - 1, 8, sx - 1, 10, "g"); P(sx - 2, 9, "w"); }
      else { R(sx, 4, sx, 9, "m"); P(sx + 1, 3, "m"); P(sx + 1, 2, "m"); P(sx + 2, 2, "m"); R(sx - 1, 10, sx + 1, 10, "g"); P(sx, 11, "w"); } } } } });

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
  { back: NOP, legs: necRobe, body: necShoulders, head: necHood, arms: necHands, weapon: necStaff, over: NOP }, {
  b: { name: "Lich King", pal: { r: "#33224f", R: "#1a1230", h: "#5a3f8a", e: "#d28aff", E: "#f0d0ff", f: "#b060ff", p: "#e2b33c" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; necSkull(c); R(7 + x0, 2, 12 + x0, 2, "p"); [[7, 1], [9, 0], [10, 0], [12, 1]].forEach(([x, y]) => P(x + x0, y, "p")); P(8 + x0, 1, "p"); P(11 + x0, 1, "p"); R(5 + x0, 3, 6 + x0, 7, "R"); R(13 + x0, 3, 14 + x0, 7, "R"); },
    weapon: c => { const { P, R, ap } = c, x0 = c.x0, up = ap === 1 ? -1 : 0, ox = 16 + x0;
      R(ox - 1, 3 + up, ox + 1, 5 + up, "f"); P(ox, 4 + up, "E"); P(ox - 1, 2 + up, "f"); P(ox + 1, 2 + up, "f"); R(ox, 6 + up, ox, 11, "b");
      if (ap === 2) { [[-3, 1], [3, 1], [-3, 6], [3, 6], [0, -1]].forEach(([dx, dy]) => P(ox + dx, Math.max(0, 4 + dy), "E")); } } } },
  c: { name: "Plague Raven", pal: { r: "#2f2a38", R: "#17141c", h: "#4a4458", e: "#ffe45a", f: "#58d070", p: "#6a5a30" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0;
      R(4 + x0, 3, 15 + x0, 3, "R"); R(7 + x0, 0, 12 + x0, 2, "R"); R(7 + x0, 2, 12 + x0, 2, "p"); R(7 + x0, 4, 12 + x0, 7, "R"); P(8 + x0, 5, "e"); P(11 + x0, 5, "e"); P(8 + x0, 4, "e"); P(11 + x0, 4, "e");
      R(12 + x0, 5, 16 + x0, 5, "t"); R(12 + x0, 6, 15 + x0, 6, "t"); R(13 + x0, 7, 14 + x0, 7, "t"); P(17 + x0, 6, "t"); },
    weapon: c => { const { P, R, ap } = c, x0 = c.x0, up = ap === 1 ? -2 : 0, sxx = 16 + x0;
      R(sxx, 5 + up, sxx, 17 + up, "w"); P(sxx, 1 + up, "w"); P(sxx - 1, 1 + up, "w"); R(sxx - 1, 2 + up, sxx + 1, 4 + up, "f"); P(sxx, 3 + up, "E"); R(sxx - 1, 2 + up, sxx + 1, 2 + up, "w"); R(sxx - 1, 4 + up, sxx + 1, 4 + up, "w");
      if (ap === 2) { R(sxx - 3, 1, sxx + 3, 5, "f"); P(sxx, 3, "E"); P(sxx - 4, 3, "e"); P(sxx + 4, 3, "e"); } } } },
  d: { name: "Bone Wraith", pal: { r: "#1c2a2a", R: "#0e1818", h: "#2f4a46", e: "#9affc0", E: "#e8fff0" }, parts: {
    body: c => { const { R } = c, x0 = c.x0; necShoulders(c); R(7 + x0, 9, 12 + x0, 9, "b"); R(7 + x0, 11, 12 + x0, 11, "b"); R(8 + x0, 10, 11 + x0, 10, "b"); R(9 + x0, 9, 10 + x0, 11, "d"); },
    head: c => { const { P, R } = c, x0 = c.x0; necSkull(c); R(5 + x0, 3, 6 + x0, 6, "R"); R(13 + x0, 3, 14 + x0, 6, "R");
      [[6, 3], [5, 2], [4, 1], [3, 1], [2, 2], [2, 3], [3, 4], [4, 4], [13, 3], [14, 2], [15, 1], [16, 1], [17, 2], [17, 3], [16, 4], [15, 4]].forEach(([x, y]) => P(x + x0, y, "b")); },
    weapon: c => { const { P, R, ap, wf } = c, x0 = c.x0, s = ap === 1 ? 1 : 0, w = (wf >= 0 ? wf % 2 : 0);
      [[2 + w, 9], [17 - w, 12], [16, 4 - s]].forEach(([x, y]) => { R(x + x0 - 1, y, x + x0, y + 1, "e"); P(x + x0 - 1, y, "E"); P(x + x0, y - 1, "e"); });
      if (ap === 2) { R(15 + x0, 6, 17 + x0, 8, "E"); P(18 + x0, 7, "e"); P(16 + x0, 5, "e"); } } } } });

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
  { back: NOP, legs: delfLegs, body: delfBody, head: delfHead, arms: NOP, weapon: delfBlades, over: NOP }, {
  b: { name: "Spider Elf", pal: { k: "#8a84ac", K: "#5f5a86", h: "#2c2438", H: "#1a1424", e: "#ff3b4a", a: "#241f2e", A: "#443a5a", m: "#c8f0c0" }, parts: {
    back: c => { const { P } = c, x0 = c.x0; [[5, 8], [4, 7], [3, 6], [2, 6], [1, 7], [1, 8], [1, 9], [14, 8], [15, 7], [16, 6], [17, 6], [18, 7], [18, 8], [18, 9]].forEach(([x, y]) => P(x + x0, y, "A")); [[5, 7], [4, 6], [3, 5], [2, 5], [0, 7], [14, 7], [15, 6], [16, 5], [17, 5], [19, 7]].forEach(([x, y]) => P(x + x0, y, "A")); },
    head: c => { const { P, R } = c, x0 = c.x0;
      R(6 + x0, 1, 13 + x0, 3, "H"); R(5 + x0, 3, 5 + x0, 8, "H"); R(14 + x0, 3, 14 + x0, 8, "H"); R(7 + x0, 4, 12 + x0, 7, "k"); R(7 + x0, 7, 12 + x0, 7, "K"); P(8 + x0, 4, "e"); P(11 + x0, 4, "e"); P(9 + x0, 5, "e"); P(10 + x0, 5, "e"); P(8 + x0, 6, "H"); P(11 + x0, 6, "H"); R(9 + x0, 7, 10 + x0, 7, "H");
      P(6 + x0, 5, "k"); P(13 + x0, 5, "k"); } } },
  c: { name: "Shadow Bat", pal: { k: "#4a6ab8", K: "#2f4a8a", h: "#1c1c28", H: "#0e0e18", e: "#7affb0", a: "#1c1c28", A: "#33334a", m: "#b8ffd8" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0;
      R(6 + x0, 2, 13 + x0, 3, "h"); R(7 + x0, 4, 12 + x0, 7, "k"); R(7 + x0, 6, 12 + x0, 7, "H"); P(8 + x0, 7, "t"); P(11 + x0, 7, "t"); P(8 + x0, 5, "e"); P(11 + x0, 5, "e"); P(7 + x0, 4, "h"); P(12 + x0, 4, "h");
      [[6, 3], [6, 2], [5, 2], [5, 1], [4, 1], [4, 0], [3, 0], [13, 3], [13, 2], [14, 2], [14, 1], [15, 1], [15, 0], [16, 0]].forEach(([x, y]) => P(x + x0, y, "k")); [[5, 3], [5, 4], [14, 3], [14, 4]].forEach(([x, y]) => P(x + x0, y, "K")); P(6 + x0, 4, "K"); P(13 + x0, 4, "K"); } } },
  d: { name: "Horned Duelist", pal: { k: "#b04a6a", K: "#7a2a4a", h: "#1c1420", H: "#0e0a12", e: "#ffe45a", a: "#2a1f2a", A: "#5a3a4a", m: "#ffd0d8" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0;
      R(6 + x0, 2, 13 + x0, 3, "h"); R(5 + x0, 3, 5 + x0, 9, "h"); R(14 + x0, 3, 14 + x0, 9, "h"); R(7 + x0, 4, 12 + x0, 7, "k"); R(7 + x0, 4, 9 + x0, 7, "W"); P(8 + x0, 5, "K"); P(11 + x0, 5, "e"); P(11 + x0, 4, "e"); R(8 + x0, 7, 11 + x0, 7, "K");
      [[6, 2], [5, 1], [4, 0], [3, 0], [13, 2], [14, 1], [15, 0], [16, 0]].forEach(([x, y]) => P(x + x0, y, "W")); } } } });

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
  b: { name: "Boar Orc", pal: { g: "#8a6a44", G: "#5f4630", D: "#2f2418", r: "#d8a030" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; orcFace(c); R(8 + x0, 1, 11 + x0, 2, "r"); P(9 + x0, 0, "r"); P(10 + x0, 0, "r"); P(7 + x0, 3, "r"); P(12 + x0, 3, "r");
      R(7 + x0, 4, 12 + x0, 4, "D"); P(8 + x0, 5, "y"); P(11 + x0, 5, "y"); R(11 + x0, 6, 14 + x0, 8, "G"); P(13 + x0, 7, "D"); P(14 + x0, 7, "D"); P(12 + x0, 8, "t"); P(12 + x0, 9, "t"); P(7 + x0, 8, "t"); P(7 + x0, 9, "t"); R(7 + x0, 8, 11 + x0, 8, "G"); },
    weapon: orcClub } },
  c: { name: "Skull Warlord", pal: { g: "#b84a2e", G: "#8a3220", D: "#3a1410", y: "#ffe45a" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; orcFace(c); R(7 + x0, 4, 12 + x0, 4, "D"); P(8 + x0, 5, "y"); P(11 + x0, 5, "y"); P(9 + x0, 6, "G"); P(10 + x0, 6, "G"); R(7 + x0, 7, 12 + x0, 7, "D"); P(8 + x0, 7, "t"); P(11 + x0, 7, "t"); P(6 + x0, 6, "t"); P(13 + x0, 6, "t"); R(7 + x0, 8, 12 + x0, 8, "G");
      R(7 + x0, 2, 12 + x0, 3, "b"); R(8 + x0, 1, 11 + x0, 1, "b"); P(9 + x0, 2, "D"); P(10 + x0, 2, "D"); [[6, 2], [5, 1], [5, 0], [13, 2], [14, 1], [14, 0]].forEach(([x, y]) => P(x + x0, y, "t")); },
    weapon: c => { const { P, R, ap } = c, hx = 16 + c.x0;
      if (ap === 1) { R(hx - 1, 3, hx - 1, 10, "w"); R(hx - 3, 0, hx - 2, 5, "m"); R(hx, 0, hx + 2, 5, "m"); R(hx + 2, 0, hx + 2, 5, "M"); }
      else if (ap === 2) { R(hx - 5, 11, hx - 1, 11, "w"); R(hx, 7, hx + 2, 15, "m"); R(hx + 2, 7, hx + 2, 15, "M"); P(hx - 1, 7, "m"); P(hx - 1, 15, "m"); }
      else { R(hx - 1, 5, hx - 1, 14, "w"); R(hx - 3, 3, hx - 2, 8, "m"); R(hx, 3, hx + 2, 8, "m"); R(hx + 2, 3, hx + 2, 8, "M"); P(hx - 3, 3, "M"); P(hx - 3, 4, "M"); }
      R(13 + c.x0, 10, 15 + c.x0, 10, "g"); } } },
  d: { name: "Iron Mask", pal: { g: "#7e9070", G: "#566650", D: "#232c20" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; orcFace(c); R(8 + x0, 1, 11 + x0, 2, "M"); R(7 + x0, 4, 12 + x0, 4, "D"); P(8 + x0, 5, "e"); P(11 + x0, 5, "e");
      R(6 + x0, 6, 13 + x0, 8, "M"); P(7 + x0, 7, "m"); P(9 + x0, 7, "m"); P(10 + x0, 7, "m"); P(12 + x0, 7, "m"); R(7 + x0, 6, 12 + x0, 6, "m"); P(6 + x0, 5, "t"); P(13 + x0, 5, "t"); P(9 + x0, 0, "M"); P(10 + x0, 0, "M"); },
    over: c => { const { P } = c, x0 = c.x0; [[6, 8], [7, 9], [8, 10], [9, 11], [13, 8], [12, 9], [11, 10], [10, 11]].forEach(([x, y]) => P(x + x0, y, "m")); },
    weapon: c => { const { P, R, ap } = c, hx = 16 + c.x0, up = ap === 1 ? -4 : 0, lx = 1;
      if (ap === 2) { R(hx - 5, 11, hx - 1, 11, "w"); R(hx, 8, hx + 2, 14, "m"); R(hx + 2, 8, hx + 2, 14, "M"); R(lx, 13, lx + 3, 13, "w"); R(lx - 1, 10, lx + 1, 16, "m"); }
      else { R(hx - 1, 6 + up, hx - 1, 13 + up, "w"); R(hx, 4 + up, hx + 2, 8 + up, "m"); R(hx + 2, 4 + up, hx + 2, 8 + up, "M"); R(lx, 6 + up, lx, 12 + up, "w"); R(lx - 1, 4 + up, lx, 8 + up, "m"); P(lx - 1, 4 + up, "M"); }
      R(13 + c.x0, 10, 15 + c.x0, 10, "g"); } } } });

// ================= Troll Warlord =================
const trollLegs = c => { const { P, RF, wf, contact } = c, x0 = c.x0;
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 17, bx + 3, 19, "G"); RF(bx, 20, bx + 4, 20, "D"); } else { RF(bx, 17, bx + 3, 21, "G"); RF(bx - 1, 22, bx + 4, 22, "D"); P(bx - 1, 21, "t"); P(bx + 4, 21, "t"); } };
  if (wf < 0) { leg(9 + x0, 0, 0); leg(14 + x0, 0, 0); } else if (contact) { leg(9 + x0, 0, -1); leg(14 + x0, 0, 1); } else if (wf === 1) { leg(9 + x0, 1, 0); leg(14 + x0, 0, 0); } else { leg(9 + x0, 0, 0); leg(14 + x0, 1, 0); } };
const trollBody = c => { const { P, R } = c, x0 = c.x0;
  R(7 + x0, 10, 18 + x0, 18, "g"); R(6 + x0, 11, 19 + x0, 16, "g"); R(8 + x0, 15, 17 + x0, 18, "G"); R(9 + x0, 12, 11 + x0, 13, "G"); R(14 + x0, 12, 16 + x0, 13, "G"); R(10 + x0, 16, 15 + x0, 16, "D");
  R(7 + x0, 10, 18 + x0, 10, "v"); P(8 + x0, 11, "v"); P(10 + x0, 11, "v"); P(16 + x0, 11, "v"); P(17 + x0, 11, "v"); P(6 + x0, 11, "v");
  R(9 + x0, 18, 16 + x0, 19, "L"); R(11 + x0, 18, 14 + x0, 19, "T"); P(12 + x0, 20, "T"); P(13 + x0, 20, "T");
  for (let i = 0; i < 5; i++) P(9 + x0 + i * 2, 11 + (i === 2 ? 3 : i % 2 ? 2 : 1), "t");
  R(3 + x0, 11, 6 + x0, 18, "g"); R(3 + x0, 16, 6 + x0, 19, "G"); P(3 + x0, 19, "t"); P(6 + x0, 19, "t"); R(19 + x0, 11, 22 + x0, 14, "g"); R(21 + x0, 12, 22 + x0, 15, "G"); };
const trollFace = c => { const { P, R } = c, x0 = c.x0;
  R(9 + x0, 3, 16 + x0, 8, "g"); R(8 + x0, 5, 17 + x0, 9, "g"); R(9 + x0, 9, 16 + x0, 9, "G"); R(9 + x0, 6, 16 + x0, 6, "D"); P(10 + x0, 7, "y"); P(15 + x0, 7, "y"); P(12 + x0, 7, "G"); P(13 + x0, 7, "G");
  R(10 + x0, 8, 15 + x0, 8, "k"); P(9 + x0, 7, "t"); P(9 + x0, 8, "t"); P(8 + x0, 8, "t"); P(16 + x0, 7, "t"); P(16 + x0, 8, "t"); P(17 + x0, 8, "t"); P(8 + x0, 4, "t"); P(7 + x0, 3, "t"); P(17 + x0, 4, "t"); P(18 + x0, 3, "t"); };
const trollCrown = c => { const { P, R } = c, x0 = c.x0; R(9 + x0, 2, 16 + x0, 3, "i"); for (let i = 0; i < 4; i++) P(9 + x0 + i * 2, 1, "i"); P(9 + x0, 0, "i"); P(16 + x0, 0, "i"); R(9 + x0, 2, 16 + x0, 2, "c"); P(12 + x0, 2, "T"); P(13 + x0, 2, "T"); };
const trollHead = c => { trollFace(c); trollCrown(c); };
const trollClub = c => { const { P, R, ap } = c, cx = 23;
  if (ap === 1) { R(cx, 0, cx + 1, 12, "w"); R(cx - 1, 0, cx + 2, 6, "W"); P(cx - 2, 1, "i"); P(cx + 3, 3, "i"); P(cx - 2, 4, "i"); }
  else if (ap === 2) { R(cx - 6, 14, cx + 2, 15, "w"); R(cx - 9, 11, cx - 5, 18, "W"); P(cx - 10, 12, "i"); P(cx - 10, 16, "i"); P(cx - 7, 10, "i"); P(cx - 7, 19, "i"); }
  else { R(cx, 6, cx + 1, 18, "w"); R(cx - 1, 4, cx + 2, 12, "W"); P(cx - 2, 5, "i"); P(cx + 3, 8, "i"); P(cx - 2, 10, "i"); P(cx + 3, 5, "i"); }
  if (ap === 2) R(cx - 4, 13, cx - 1, 16, "g"); else R(cx - 2, 13, cx + 2, 16, "g"); };
const trollSlab = c => { const { P, R, ap } = c, cx = 23;
  if (ap === 1) { R(cx, 6, cx + 1, 12, "w"); R(cx - 2, 0, cx + 3, 6, "g"); R(cx - 2, 6, cx + 3, 6, "D"); P(cx - 1, 1, "v"); P(cx + 1, 2, "v"); }
  else if (ap === 2) { R(cx - 6, 14, cx + 2, 15, "w"); R(cx - 11, 10, cx - 6, 19, "g"); R(cx - 11, 10, cx - 11, 19, "D"); P(cx - 9, 12, "v"); P(cx - 8, 15, "v"); }
  else { R(cx, 9, cx + 1, 18, "w"); R(cx - 2, 3, cx + 3, 10, "g"); R(cx - 2, 10, cx + 3, 10, "D"); R(cx - 2, 3, cx - 2, 10, "D"); P(cx - 1, 4, "v"); P(cx + 1, 6, "v"); P(cx, 8, "v"); }
  if (ap === 2) R(cx - 4, 13, cx - 1, 16, "g"); else R(cx - 2, 13, cx + 2, 16, "g"); };
MA("trollw", 26, 26, 1, { g: "#6f98a8", G: "#4b7385", D: "#2c4755", v: "#7fd36a", t: "#f1e8cf", y: "#ffd24a", k: "#2a2a30", i: "#9a9aa2", w: "#6a4524", W: "#8a5a2b", L: "#5a3d22", T: "#4aa3ff", c: "#d9c27a", r: "#c8342a" },
  { back: NOP, legs: trollLegs, body: trollBody, head: trollHead, arms: NOP, weapon: trollClub, over: NOP }, {
  b: { name: "Stone Troll", pal: { g: "#8c9199", G: "#5f646c", D: "#3a3e44", v: "#6cf0e0", y: "#6cf0e0", t: "#d8d8d0", w: "#6a4a2c" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; trollFace(c); R(9 + x0, 1, 11 + x0, 3, "G"); R(14 + x0, 1, 16 + x0, 3, "G"); P(10 + x0, 0, "G"); P(15 + x0, 0, "G"); P(13 + x0, 4, "D"); P(11 + x0, 5, "D"); },
    over: c => { const { P, R } = c, x0 = c.x0; R(8 + x0, 8, 9 + x0, 10, "v"); P(8 + x0, 7, "v"); P(9 + x0, 6, "v"); R(16 + x0, 8, 17 + x0, 10, "v"); P(17 + x0, 7, "v"); P(16 + x0, 6, "v"); P(12 + x0, 14, "D"); P(13 + x0, 15, "D"); P(11 + x0, 15, "D"); },
    weapon: trollSlab } },
  c: { name: "Swamp Troll", pal: { g: "#7e9a4a", G: "#566e30", D: "#33441e", v: "#5ec06a", t: "#e8dcb0", y: "#ff8a2a", i: "#d8c890", w: "#4a3a22", W: "#6a5230" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; trollFace(c); R(17 + x0, 6, 19 + x0, 8, "g"); P(19 + x0, 8, "G"); P(19 + x0, 9, "G"); R(11 + x0, 1, 14 + x0, 2, "v"); P(12 + x0, 0, "v"); P(10 + x0, 2, "v"); P(15 + x0, 2, "v"); P(9 + x0, 3, "G"); P(16 + x0, 3, "G"); },
    over: c => { const { P, R } = c, x0 = c.x0; R(6 + x0, 8, 10 + x0, 9, "r"); P(7 + x0, 8, "t"); P(9 + x0, 9, "t"); R(8 + x0, 10, 8 + x0, 10, "t"); R(15 + x0, 9, 18 + x0, 9, "r"); P(16 + x0, 9, "t"); P(17 + x0, 10, "t"); P(16 + x0, 10, "t"); } } },
  d: { name: "Twin-Head Troll", pal: {}, parts: {
    head: c => { const { P, R } = c, x0 = c.x0;
      R(3 + x0, 5, 8 + x0, 9, "g"); R(2 + x0, 7, 8 + x0, 9, "g"); R(4 + x0, 10, 9 + x0, 11, "g"); P(4 + x0, 7, "y"); P(7 + x0, 7, "y"); R(3 + x0, 6, 8 + x0, 6, "D"); R(4 + x0, 9, 7 + x0, 9, "k"); P(3 + x0, 8, "t"); P(8 + x0, 8, "t"); P(2 + x0, 5, "t"); P(2 + x0, 4, "t");
      trollFace(c); trollCrown(c); } } } });

// ================= Ogre Breaker =================
const ogreLegs = c => { const { RF, wf, contact } = c, x0 = c.x0;
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 16, bx + 3, 18, "G"); RF(bx - 1, 19, bx + 4, 19, "D"); } else { RF(bx, 16, bx + 3, 19, "G"); RF(bx - 1, 20, bx + 4, 20, "D"); } };
  if (wf < 0) { leg(7 + x0, 0, 0); leg(13 + x0, 0, 0); } else if (contact) { leg(7 + x0, 0, -1); leg(13 + x0, 0, 1); } else if (wf === 1) { leg(7 + x0, 1, 0); leg(13 + x0, 0, 0); } else { leg(7 + x0, 0, 0); leg(13 + x0, 1, 0); } };
const ogreBody = c => { const { P, R } = c, x0 = c.x0;
  R(4 + x0, 9, 19 + x0, 17, "g"); R(3 + x0, 10, 20 + x0, 15, "g"); R(5 + x0, 16, 18 + x0, 17, "G"); R(5 + x0, 15, 18 + x0, 15, "g"); R(5 + x0, 10, 7 + x0, 12, "G"); R(16 + x0, 10, 18 + x0, 12, "G"); P(11 + x0, 13, "D"); P(12 + x0, 13, "D");
  R(4 + x0, 14, 19 + x0, 15, "L"); for (let i = 0; i < 6; i++) P(5 + x0 + i * 3, 14, "i"); R(10 + x0, 14, 13 + x0, 15, "y"); R(9 + x0, 16, 14 + x0, 19, "T"); P(10 + x0, 20, "T"); P(13 + x0, 20, "T");
  R(2 + x0, 9, 5 + x0, 11, "G"); R(18 + x0, 9, 21 + x0, 11, "G"); R(2 + x0, 12, 4 + x0, 16, "g"); R(2 + x0, 15, 4 + x0, 17, "G"); R(7 + x0, 7, 16 + x0, 8, "i"); P(8 + x0, 6, "i"); P(11 + x0, 6, "i"); P(12 + x0, 6, "i"); P(15 + x0, 6, "i"); R(7 + x0, 8, 16 + x0, 8, "I"); };
const ogreHead = c => { const { P, R } = c, x0 = c.x0;
  R(7 + x0, 2, 16 + x0, 7, "g"); R(6 + x0, 3, 17 + x0, 6, "g"); R(7 + x0, 7, 16 + x0, 7, "G");
  R(10 + x0, 3, 13 + x0, 5, "e"); R(11 + x0, 3, 12 + x0, 5, "p"); P(11 + x0, 4, "k"); P(12 + x0, 4, "k"); P(10 + x0, 3, "G"); P(13 + x0, 3, "G"); R(9 + x0, 2, 14 + x0, 2, "D");
  P(6 + x0, 1, "t"); P(7 + x0, 2, "t"); P(17 + x0, 1, "t"); P(16 + x0, 2, "t"); P(5 + x0, 0, "t"); P(18 + x0, 0, "t");
  R(8 + x0, 6, 15 + x0, 6, "k"); P(9 + x0, 6, "t"); P(11 + x0, 6, "t"); P(13 + x0, 6, "t"); P(15 + x0, 6, "t"); P(6 + x0, 5, "G"); P(17 + x0, 5, "G"); };
const ogreMaul = c => { const { P, R, ap } = c, mx = 22;
  if (ap === 1) { R(mx, 6, mx + 1, 13, "L"); R(mx - 2, 0, mx + 3, 5, "s"); R(mx - 2, 5, mx + 3, 5, "S"); R(mx - 2, 0, mx - 2, 5, "I"); R(mx - 1, 1, mx, 1, "i"); }
  else if (ap === 2) { R(mx - 8, 14, mx, 15, "L"); R(mx - 11, 11, mx - 7, 19, "s"); R(mx - 11, 19, mx - 7, 19, "S"); R(mx - 11, 11, mx - 11, 19, "I"); P(mx - 10, 12, "i"); P(mx - 10, 17, "i"); }
  else { R(mx, 7, mx + 1, 19, "L"); R(mx - 2, 3, mx + 3, 9, "s"); R(mx - 2, 9, mx + 3, 9, "S"); R(mx - 2, 3, mx - 2, 9, "I"); R(mx - 1, 4, mx, 4, "i"); P(mx + 1, 7, "i"); }
  R(20, 12, 23, 13, "g"); };
const ogreLog = (c, spiked) => { const { P, R, ap } = c, mx = 22, hd = spiked ? "I" : "i";
  if (ap === 1) { R(mx, 0, mx + 2, 12, "L"); R(mx - 1, 0, mx + 3, 3, hd); if (spiked) { P(mx - 2, 1, "i"); P(mx + 4, 1, "i"); P(mx + 1, -1, "i"); } R(mx, 8, mx + 2, 8, "i"); }
  else if (ap === 2) { R(mx - 11, 14, mx + 1, 16, "L"); R(mx - 13, 13, mx - 10, 17, hd); if (spiked) { P(mx - 14, 15, "i"); P(mx - 12, 12, "i"); P(mx - 12, 18, "i"); } R(mx - 5, 14, mx - 5, 16, "i"); }
  else { R(mx, 2, mx + 2, 19, "L"); R(mx - 1, 0, mx + 3, 4, hd); if (spiked) { P(mx - 2, 1, "i"); P(mx + 4, 2, "i"); P(mx + 1, -1, "i"); } R(mx, 9, mx + 2, 9, "i"); R(mx, 14, mx + 2, 14, "i"); }
  R(20, 12, 23, 13, "g"); };
MA("ogre", 26, 24, 1, { g: "#d2a972", G: "#a97d4a", D: "#6a4a28", e: "#fff4d8", p: "#6a2a8a", y: "#ffd24a", k: "#2a2a30", i: "#9a9aa2", I: "#5a5a66", s: "#8f8a80", S: "#6a665e", t: "#f1e8cf", L: "#5a3d22", T: "#4aa3ff", r: "#c8342a" },
  { back: NOP, legs: ogreLegs, body: ogreBody, head: ogreHead, arms: NOP, weapon: ogreMaul, over: NOP }, {
  b: { name: "Bull Ogre", pal: { g: "#a8583a", G: "#7a3a26", D: "#4a2218", y: "#ff9a2a" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0;
      R(7 + x0, 2, 16 + x0, 7, "g"); R(6 + x0, 3, 17 + x0, 6, "g"); R(8 + x0, 3, 15 + x0, 3, "D"); R(9 + x0, 5, 14 + x0, 7, "e"); P(10 + x0, 6, "D"); P(13 + x0, 6, "D"); P(8 + x0, 4, "e"); P(9 + x0, 4, "k"); P(15 + x0, 4, "e"); P(14 + x0, 4, "k");
      R(11 + x0, 8, 12 + x0, 8, "y"); R(11 + x0, 9, 12 + x0, 9, "y"); P(11 + x0, 8, "k"); P(12 + x0, 8, "k");
      [[6, 3], [5, 2], [4, 2], [3, 1], [2, 0], [17, 3], [18, 2], [19, 2], [20, 1], [21, 0]].forEach(([x, y]) => P(x + x0, y, "t")); P(7 + x0, 2, "G"); P(16 + x0, 2, "G"); },
    weapon: c => ogreLog(c, true) } },
  c: { name: "Sack Ogre", pal: { g: "#b9b060", G: "#8a8244", D: "#58522a", y: "#ffd24a", L: "#7a5a32" }, parts: {
    back: c => { const { P, R } = c, x0 = c.x0; R(0 + x0, 5, 6 + x0, 14, "L"); R(1 + x0, 4, 5 + x0, 4, "L"); R(2 + x0, 3, 4 + x0, 3, "D"); P(3 + x0, 2, "D"); P(1 + x0, 8, "D"); P(4 + x0, 11, "D"); P(2 + x0, 5, "y"); P(5 + x0, 6, "y"); },
    head: c => { const { P, R } = c, x0 = c.x0;
      R(7 + x0, 2, 16 + x0, 7, "g"); R(6 + x0, 3, 17 + x0, 6, "g"); R(8 + x0, 7, 15 + x0, 8, "G"); R(8 + x0, 3, 15 + x0, 3, "D"); P(9 + x0, 4, "k"); P(10 + x0, 4, "k"); P(13 + x0, 4, "k"); P(14 + x0, 4, "k"); P(9 + x0, 5, "e"); P(14 + x0, 5, "e");
      R(9 + x0, 7, 14 + x0, 7, "k"); P(9 + x0, 6, "t"); P(9 + x0, 5, "t"); P(14 + x0, 6, "t"); P(14 + x0, 5, "t"); P(11 + x0, 6, "t"); P(12 + x0, 6, "t"); P(11 + x0, 1, "k"); P(12 + x0, 1, "k"); P(12 + x0, 0, "k"); P(13 + x0, 1, "k"); },
    weapon: c => { const { P, R, ap } = c, mx = 22;
      if (ap === 1) { R(mx, 6, mx + 1, 13, "L"); R(mx - 2, 0, mx + 3, 5, "I"); [[mx - 3, 1], [mx + 4, 1], [mx, -1], [mx - 3, 4], [mx + 4, 4]].forEach(([x, y]) => P(x, y, "i")); }
      else if (ap === 2) { R(mx - 8, 14, mx, 15, "L"); R(mx - 11, 11, mx - 7, 19, "I"); [[mx - 12, 12], [mx - 12, 18], [mx - 9, 10], [mx - 9, 20]].forEach(([x, y]) => P(x, y, "i")); }
      else { R(mx, 7, mx + 1, 19, "L"); R(mx - 2, 2, mx + 3, 9, "I"); [[mx - 3, 3], [mx + 4, 3], [mx, 1], [mx - 3, 7], [mx + 4, 7]].forEach(([x, y]) => P(x, y, "i")); }
      R(20, 12, 23, 13, "g"); } } },
  d: { name: "Iron Ogre", pal: { g: "#8f8f98", G: "#62626c", D: "#3a3a44", y: "#ff4a3a", i: "#b8b8c4", I: "#6a6a78" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0;
      R(7 + x0, 2, 16 + x0, 7, "g"); R(7 + x0, 1, 16 + x0, 6, "i"); R(6 + x0, 2, 17 + x0, 5, "i"); R(8 + x0, 4, 15 + x0, 4, "k"); R(9 + x0, 4, 10 + x0, 4, "y"); R(13 + x0, 4, 14 + x0, 4, "y"); R(7 + x0, 1, 16 + x0, 1, "I"); P(7 + x0, 3, "I"); P(16 + x0, 3, "I"); P(11 + x0, 0, "i"); P(12 + x0, 0, "i");
      R(8 + x0, 7, 15 + x0, 8, "G"); R(9 + x0, 7, 14 + x0, 7, "k"); P(9 + x0, 6, "t"); P(11 + x0, 6, "t"); P(12 + x0, 6, "t"); P(14 + x0, 6, "t"); R(11 + x0, 2, 12 + x0, 3, "I"); },
    over: c => { const { P, R } = c, x0 = c.x0; R(2 + x0, 7, 6 + x0, 9, "i"); R(17 + x0, 7, 21 + x0, 9, "i"); R(2 + x0, 9, 6 + x0, 9, "I"); R(17 + x0, 9, 21 + x0, 9, "I"); P(3 + x0, 8, "k"); P(5 + x0, 8, "k"); P(18 + x0, 8, "k"); P(20 + x0, 8, "k"); R(8 + x0, 10, 15 + x0, 12, "I"); R(9 + x0, 10, 14 + x0, 11, "i"); P(11 + x0, 10, "k"); P(12 + x0, 10, "k"); },
    weapon: c => { const { P, R, ap } = c, mx = 22;
      const anvil = (ax, ay) => { R(ax - 4, ay, ax + 4, ay + 2, "i"); R(ax - 3, ay + 3, ax + 3, ay + 5, "I"); R(ax - 5, ay, ax - 4, ay + 1, "i"); R(ax - 2, ay + 1, ax + 1, ay + 1, "i"); };
      if (ap === 1) { R(mx, 6, mx + 1, 13, "L"); anvil(mx, 0); }
      else if (ap === 2) { R(mx - 8, 14, mx, 15, "L"); R(mx - 11, 10, mx - 8, 18, "i"); R(mx - 8, 11, mx - 7, 17, "I"); R(mx - 12, 12, mx - 11, 16, "i"); }
      else { R(mx, 7, mx + 1, 19, "L"); anvil(mx, 2); }
      R(20, 12, 23, 13, "g"); } } } });

// ================= Centaur Archer =================
const cenLegs = c => { const { RF, wf, contact } = c, x0 = c.x0;
  const leg = (x, lift, dx) => { const bx = x + dx; if (lift) { RF(bx, 13, bx + 1, 14, "H"); RF(bx, 15, bx + 1, 15, "k"); } else { RF(bx, 13, bx + 1, 16, "H"); RF(bx - 1, 17, bx + 1, 17, "k"); } };
  if (wf < 0) { [6, 9, 15, 18].forEach(x => leg(x + x0, 0, 0)); }
  else if (contact) { leg(6 + x0, 0, wf === 0 ? -2 : 2); leg(9 + x0, 0, wf === 0 ? 1 : -1); leg(15 + x0, 0, wf === 0 ? 2 : -2); leg(18 + x0, 0, wf === 0 ? -1 : 1); }
  else { leg(6 + x0, wf === 1 ? 1 : 0, 0); leg(9 + x0, wf === 1 ? 0 : 1, 0); leg(15 + x0, wf === 1 ? 0 : 1, 0); leg(18 + x0, wf === 1 ? 1 : 0, 0); } };
const cenBody = c => { const { P, R } = c, x0 = c.x0;
  R(5 + x0, 9, 19 + x0, 13, "h"); R(4 + x0, 10, 20 + x0, 12, "h"); R(5 + x0, 12, 19 + x0, 13, "H"); R(4 + x0, 13, 6 + x0, 13, "h");
  R(1 + x0, 9, 4 + x0, 11, "m"); R(0 + x0, 11, 2 + x0, 15, "m"); P(0 + x0, 16, "m");
  R(9 + x0, 8, 14 + x0, 9, "T"); P(9 + x0, 10, "g"); P(14 + x0, 10, "g"); R(5 + x0, 8, 8 + x0, 8, "H"); R(20 + x0, 8, 21 + x0, 9, "h"); };
const cenTorso = c => { const { P, R } = c, x0 = c.x0;
  R(18 + x0, 4, 22 + x0, 9, "s"); R(18 + x0, 8, 22 + x0, 9, "S"); R(19 + x0, 5, 20 + x0, 5, "b"); R(19 + x0, 7, 21 + x0, 7, "b"); R(17 + x0, 4, 17 + x0, 8, "m"); R(17 + x0, 3, 18 + x0, 3, "m"); R(23 + x0, 6, 24 + x0, 8, "s"); };
const cenHead = c => { const { P, R } = c, x0 = c.x0; cenTorso(c);
  R(20 + x0, 0, 24 + x0, 4, "t"); R(24 + x0, 2, 26 + x0, 4, "t"); P(25 + x0, 4, "S"); P(26 + x0, 4, "S"); P(21 + x0, 2, "k"); P(22 + x0, 2, "e"); P(21 + x0, 1, "S"); R(19 + x0, 0, 19 + x0, 1, "t"); P(18 + x0, 0, "t"); P(17 + x0, 1, "t"); };
const cenBow = c => { const { P, R, ap } = c, bx = 25 + c.x0;
  if (ap === 1) { P(bx, 3, "w"); R(bx + 1, 4, bx + 1, 11, "w"); P(bx, 12, "w"); R(bx - 4, 8, bx, 8, "t"); P(bx - 5, 8, "t"); P(bx - 3, 7, "t"); P(bx - 3, 9, "f"); R(bx - 1, 5, bx - 1, 11, "t"); }
  else { P(bx, 3, "w"); R(bx + 1, 4, bx + 1, 11, "w"); P(bx, 12, "w"); R(bx, 5, bx, 11, "t"); if (ap === 2) { P(bx + 2, 8, "a"); P(bx + 1, 8, "a"); P(bx + 2, 7, "f"); } } };
MA("centaur", 30, 20, 2, { h: "#9a6a38", H: "#6e4724", m: "#2a1a10", s: "#d8c9a6", S: "#b09c78", a: "#c8e4ff", e: "#ffd24a", b: "#3b86d8", w: "#8a5a2b", t: "#f1e8cf", k: "#4a3a2a", T: "#4aa3ff", f: "#e8461e", g: "#d6b24a", y: "#ff4a3a" },
  { back: NOP, legs: cenLegs, body: cenBody, head: cenHead, arms: NOP, weapon: cenBow, over: NOP }, {
  b: { name: "Bison Centaur", pal: { h: "#5a3b24", H: "#35210f", m: "#1a1008", s: "#c9a46a", S: "#a07a46", t: "#ece0c0" }, parts: {
    body: c => { const { P, R } = c, x0 = c.x0; cenBody(c); R(14 + x0, 6, 19 + x0, 9, "H"); R(15 + x0, 5, 18 + x0, 6, "H"); R(16 + x0, 7, 21 + x0, 12, "H"); P(10 + x0, 12, "m"); P(7 + x0, 11, "m"); },
    head: c => { const { P, R } = c, x0 = c.x0; cenTorso(c); R(18 + x0, 2, 18 + x0, 4, "H");
      R(19 + x0, 1, 25 + x0, 5, "H"); R(23 + x0, 3, 26 + x0, 5, "s"); P(26 + x0, 4, "m"); P(22 + x0, 2, "e"); P(22 + x0, 3, "k"); R(24 + x0, 6, 25 + x0, 7, "H");
      [[19, 0], [18, 0], [17, 1], [17, 2], [25, 1], [26, 0], [27, 0], [27, 1]].forEach(([x, y]) => P(x + x0, y, "t")); } } },
  c: { name: "Ram Centaur", pal: { h: "#ece6d6", H: "#c4baa4", m: "#8a7a60", s: "#e8c8a8", S: "#c4a07c", t: "#d8c890", k: "#4a3a42", e: "#ffd24a" }, parts: {
    head: c => { const { P, R } = c, x0 = c.x0; cenTorso(c); R(18 + x0, 4, 19 + x0, 8, "h");
      R(20 + x0, 1, 24 + x0, 5, "s"); R(24 + x0, 3, 26 + x0, 5, "s"); R(20 + x0, 1, 24 + x0, 1, "h"); P(26 + x0, 3, "m"); P(26 + x0, 4, "S"); P(22 + x0, 3, "k"); P(23 + x0, 3, "e"); R(23 + x0, 6, 24 + x0, 7, "h");
      [[20, 1], [19, 1], [18, 1], [17, 2], [17, 3], [18, 4], [19, 4], [20, 3], [19, 3], [21, 0], [22, 0], [23, 0], [24, 0]].forEach(([x, y]) => P(x + x0, y, "t")); P(24 + x0, 1, "t"); P(25 + x0, 2, "t"); } } },
  d: { name: "Ember Centaur", pal: { h: "#2a2a34", H: "#14141a", m: "#ff8a2a", s: "#d85a2a", S: "#a83a1a", t: "#3a3a46", k: "#14141a", e: "#ffe45a", b: "#ffcf4a", w: "#3a2a1c" }, parts: {
    over: c => { const { P } = c, x0 = c.x0; [[8, 7], [11, 6], [14, 7], [16, 6], [6, 7], [1, 8], [0, 9], [19, 7]].forEach(([x, y]) => P(x + x0, y, "m")); [[11, 5], [16, 5]].forEach(([x, y]) => P(x + x0, y, "f")); [[17, 3], [18, 2], [19, 1], [21, -1]].forEach(([x, y]) => y >= 0 && P(x + x0, y, "m")); } } } });
