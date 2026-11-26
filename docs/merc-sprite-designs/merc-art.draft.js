// Mercenary creature sprites: each is a small pixel-art routine. c = { P, R, F, RF, wf, ap, contact, odd, ctr }
// P/R move with the body bob; F/RF are fixed (legs, feet). Characters name palette colours.
const MERC_ART = {};
const MA = (key, W, H, pal, draw) => { MERC_ART[key] = { W, H, pal, draw }; };

// ---------- Skeleton Guard ----------
MA("skel", 20, 20, { b: "#ece6d0", s: "#b9b199", d: "#4d4733", e: "#7fe08a", w: "#8a5a2b", m: "#9a8f78", M: "#6f6554", g: "#e2b33c", T: "#4aa3ff" }, c => {
  const { P, R, RF, wf, ap, contact, odd } = c, x0 = 2;
  // legs: thin bones
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 13, bx, 14, "b"); RF(bx, 15, bx + 1, 15, "s"); } else { RF(bx, 13, bx, 16, "b"); P(bx, 15, "d"); RF(bx - 1, 17, bx + 1, 17, "s"); } };
  if (wf < 0) { leg(8 + x0, 0, 0); leg(11 + x0, 0, 0); }
  else if (contact) { leg(8 + x0, 0, -1); leg(11 + x0, 0, 1); }
  else if (wf === 1) { leg(8 + x0, 1, 0); leg(11 + x0, 0, 0); } else { leg(8 + x0, 0, 0); leg(11 + x0, 1, 0); }
  R(8 + x0 - 1, 12, 11 + x0 + 1, 12, "s"); R(8 + x0, 11, 11 + x0, 11, "b");
  // ribcage
  R(7 + x0, 8, 12 + x0, 8, "b"); R(9 + x0, 7, 10 + x0, 7, "s");
  for (let y = 9; y <= 10; y++) { R(7 + x0, y, 12 + x0, y, y === 9 ? "b" : "s"); R(9 + x0, y, 10 + x0, y, "d"); }
  R(8 + x0, 11, 11 + x0, 11, "b");
  // skull with a rusty cap
  R(7 + x0, 3, 12 + x0, 6, "b"); R(7 + x0, 2, 12 + x0, 2, "m"); R(6 + x0, 3, 6 + x0, 3, "m"); R(13 + x0, 3, 13 + x0, 3, "m"); P(9 + x0, 1, "M"); P(10 + x0, 1, "M");
  R(8 + x0, 4, 8 + x0, 5, "d"); R(11 + x0, 4, 11 + x0, 5, "d"); P(8 + x0, 4, "e"); P(11 + x0, 4, "e"); P(9 + x0, 6, "d"); P(10 + x0, 6, "d");
  R(8 + x0, 7, 11 + x0, 7, "b"); P(8 + x0, 7, "d"); P(10 + x0, 7, "d");
  // shield arm (left) and sword arm (right)
  R(6 + x0, 8, 6 + x0, 10, "s"); R(1 + x0, 8, 5 + x0, 12, "w"); R(2 + x0, 7, 4 + x0, 7, "w"); R(2 + x0, 13, 4 + x0, 13, "w"); R(1 + x0, 8, 1 + x0, 12, "M"); R(3 + x0, 9, 4 + x0, 11, "T"); P(3 + x0, 10, "g");
  R(13 + x0, 8, 13 + x0, 9, "s");
  const sx = 14 + x0;
  if (ap === 1) { R(sx, 0, sx, 6, "m"); R(sx - 1, 7, sx + 1, 7, "g"); P(sx, 8, "w"); P(sx - 1, 8, "s"); }
  else if (ap === 2) { R(sx, 8, sx + 3, 8, "m"); R(sx - 1, 7, sx - 1, 9, "g"); P(sx - 1, 8, "w"); P(sx + 3, 7, "b"); }
  else { R(sx, 3, sx, 9, "m"); R(sx - 1, 10, sx + 1, 10, "g"); P(sx, 11, "w"); P(sx - 1, 9, "s"); }
});

// ---------- Necromancer ----------
MA("necro", 20, 22, { r: "#233d33", R: "#10211a", h: "#3d6b55", b: "#ece6d0", d: "#1a1a12", e: "#7fe08a", E: "#c9ffd0", w: "#5a3f24", p: "#4a2f6a", T: "#4aa3ff", f: "#58d070" }, c => {
  const { P, R, RF, F, wf, ap, contact, odd } = c, x0 = 2, sway = wf >= 0 && odd ? 1 : 0;
  // trailing robe, floating above the ground, tattered hem
  const hem = [0, 1, 0, 1, 1, 0, 1, 0];
  R(6 + x0, 12, 13 + x0, 15, "r"); R(5 + x0, 15, 14 + x0, 17, "r"); R(5 + x0, 17, 14 + x0, 17, "R");
  for (let i = 0; i < 10; i++) { if (i % 2 === (sway ? 1 : 0)) RF(5 + x0 + i, 18, 5 + x0 + i, 18, "r"); if (i % 3 === 1) RF(5 + x0 + i, 19, 5 + x0 + i, 19, "R"); }
  R(9 + x0, 12, 10 + x0, 17, "R"); R(6 + x0, 12, 13 + x0, 12, "p"); P(9 + x0, 12, "T"); P(10 + x0, 12, "T");
  // shoulders and hood
  R(5 + x0, 8, 14 + x0, 11, "r"); R(4 + x0, 9, 4 + x0, 11, "r"); R(15 + x0, 9, 15 + x0, 11, "r"); R(5 + x0, 8, 14 + x0, 8, "h");
  R(6 + x0, 2, 13 + x0, 3, "R"); R(5 + x0, 4, 14 + x0, 7, "R"); R(6 + x0, 1, 13 + x0, 1, "R"); P(5 + x0, 3, "R"); P(14 + x0, 3, "R");
  // little horns on the hood
  P(5 + x0, 1, "b"); P(4 + x0, 0, "b"); P(14 + x0, 1, "b"); P(15 + x0, 0, "b");
  // skull face in the hood
  R(7 + x0, 3, 12 + x0, 7, "b"); P(7 + x0, 3, "R"); P(12 + x0, 3, "R"); R(8 + x0, 4, 8 + x0, 5, "d"); R(11 + x0, 4, 11 + x0, 5, "d"); P(8 + x0, 4, "e"); P(11 + x0, 4, "e"); P(8 + x0, 5, "e"); P(11 + x0, 5, "e"); P(9 + x0, 6, "d"); P(10 + x0, 6, "d");
  R(8 + x0, 7, 11 + x0, 7, "b"); P(9 + x0, 7, "d"); P(10 + x0, 7, "d");
  // bony hands and a skull staff with green flame
  P(4 + x0, 12, "b"); P(15 + x0, 12, "b"); P(3 + x0, 12, "b");
  const up = ap === 1 ? -2 : 0, sxx = 17 + x0 - 1;
  R(sxx, 5 + up, sxx, 17 + up, "w"); R(sxx - 1, 2 + up, sxx + 1, 4 + up, "b"); P(sxx - 1, 3 + up, "d"); P(sxx + 1, 3 + up, "d"); P(sxx, 4 + up, "d");
  P(sxx, 0 + up, "f"); P(sxx - 1, 1 + up, "f"); P(sxx + 1, 1 + up, "f"); P(sxx, 1 + up, "E");
  if (ap === 2) { R(sxx - 2, -3 < 0 ? 0 : 0, sxx + 2, 1, "f"); P(sxx, 0, "E"); P(sxx - 3, 2, "e"); P(sxx + 3, 2, "e"); P(sxx - 3, 5, "e"); }
});

// ---------- Dark Elf Assassin ----------
MA("delf", 20, 20, { k: "#6a4aa0", K: "#47337a", h: "#f1ecff", H: "#b3a8d8", e: "#ff3b4a", a: "#28222f", A: "#4b4260", s: "#c9d0dc", m: "#dfe5ec", w: "#4a2f17", T: "#4aa3ff" }, c => {
  const { P, R, RF, wf, ap, contact, odd } = c, x0 = 2;
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 13, bx + 1, 14, "a"); RF(bx, 15, bx + 1, 15, "A"); } else { RF(bx, 13, bx + 1, 16, "a"); RF(bx - 1, 17, bx + 1, 17, "A"); } };
  if (wf < 0) { leg(7 + x0, 0, 0); leg(10 + x0, 0, 0); }
  else if (contact) { leg(7 + x0, 0, -1); leg(10 + x0, 0, 1); }
  else if (wf === 1) { leg(7 + x0, 1, 0); leg(10 + x0, 0, 0); } else { leg(7 + x0, 0, 0); leg(10 + x0, 1, 0); }
  // slim body, silver-trimmed black armour, a scarf in the lord's colour streaming back
  R(7 + x0, 9, 12 + x0, 12, "a"); R(6 + x0, 9, 6 + x0, 10, "A"); R(13 + x0, 9, 13 + x0, 10, "A"); R(7 + x0, 9, 12 + x0, 9, "A"); R(7 + x0, 12, 12 + x0, 12, "s"); P(9 + x0, 10, "s"); P(10 + x0, 11, "s");
  R(7 + x0, 8, 12 + x0, 8, "T"); R(3 + x0, 8, 6 + x0, 8, "T"); R(1 + x0, 9, 3 + x0, 9, "T"); P(0 + x0, 10, "T");
  // long swept-back white hair
  R(6 + x0, 2, 13 + x0, 3, "h"); R(5 + x0, 3, 5 + x0, 8, "h"); R(14 + x0, 3, 14 + x0, 7, "h"); P(4 + x0, 8, "H"); P(4 + x0, 9, "H"); P(5 + x0, 9, "H");
  // face
  R(7 + x0, 4, 12 + x0, 6, "k"); R(8 + x0, 7, 11 + x0, 7, "k"); P(7 + x0, 6, "K"); P(12 + x0, 6, "K"); P(9 + x0, 7, "K"); P(10 + x0, 7, "K");
  R(7 + x0, 3, 12 + x0, 3, "h"); P(8 + x0, 4, "e"); P(11 + x0, 4, "e"); P(8 + x0, 5, "e"); P(11 + x0, 5, "e");
  // very long pointed ears
  P(6 + x0, 5, "k"); P(5 + x0, 5, "k"); P(4 + x0, 5, "k"); P(3 + x0, 4, "k"); P(2 + x0, 4, "k"); P(13 + x0, 5, "k"); P(14 + x0, 5, "k"); P(15 + x0, 5, "k"); P(16 + x0, 4, "k"); P(17 + x0, 4, "k");
  // twin curved blades
  const rb = 14 + x0, lb = 4 + x0 - 2;
  if (ap === 1) { R(rb, 2, rb, 8, "m"); P(rb + 1, 2, "m"); P(rb + 1, 1, "m"); R(rb - 1, 9, rb + 1, 9, "s"); P(rb, 10, "w"); R(lb, 2, lb, 8, "m"); P(lb - 1, 2, "m"); P(lb - 1, 1, "m"); R(lb - 1, 9, lb + 1, 9, "s"); P(lb, 10, "w"); }
  else if (ap === 2) { R(rb, 9, rb + 3, 9, "m"); P(rb + 3, 8, "m"); P(rb + 4, 7, "m"); R(rb - 1, 8, rb - 1, 10, "s"); P(rb - 2, 9, "w"); R(lb - 1, 11, lb + 2, 11, "m"); P(lb - 1, 12, "m"); R(lb + 2, 10, lb + 2, 12, "s"); P(lb + 3, 11, "w"); }
  else { R(rb, 9, rb, 13, "m"); P(rb + 1, 13, "m"); P(rb + 1, 14, "m"); R(rb - 1, 8, rb + 1, 8, "s"); P(rb, 7, "w"); R(lb, 9, lb, 13, "m"); P(lb - 1, 13, "m"); P(lb - 1, 14, "m"); R(lb - 1, 8, lb + 1, 8, "s"); P(lb, 7, "w"); }
});

// ---------- Orc Berserker ----------
MA("orc", 20, 20, { g: "#6b9a3a", G: "#4a7a2a", D: "#25421a", t: "#f1e8cf", r: "#d03a2a", y: "#ffd24a", L: "#6a4a2c", l: "#8e6a3e", m: "#b9c0c7", M: "#6a7078", w: "#8a5a2b", T: "#4aa3ff", b: "#e8e2cc" }, c => {
  const { P, R, RF, wf, ap, contact, odd } = c, x0 = 1;
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 13, bx + 1, 14, "G"); RF(bx, 15, bx + 2, 15, "L"); } else { RF(bx, 13, bx + 1, 16, "G"); RF(bx - 1, 17, bx + 2, 17, "L"); } };
  if (wf < 0) { leg(7 + x0, 0, 0); leg(11 + x0, 0, 0); }
  else if (contact) { leg(7 + x0, 0, -1); leg(11 + x0, 0, 1); }
  else if (wf === 1) { leg(7 + x0, 1, 0); leg(11 + x0, 0, 0); } else { leg(7 + x0, 0, 0); leg(11 + x0, 1, 0); }
  // hunched, wide chest with a leather harness, spiked shoulder guards and a loincloth in the lord's colour
  R(5 + x0, 8, 14 + x0, 12, "g"); R(6 + x0, 9, 8 + x0, 10, "G"); R(11 + x0, 9, 13 + x0, 10, "G");
  for (let i = 0; i < 5; i++) P(6 + x0 + i + (i > 2 ? 1 : 0), 8 + i % 4 + (i > 3 ? 0 : 0), "L"); R(5 + x0, 12, 14 + x0, 12, "L"); P(9 + x0, 12, "b"); P(10 + x0, 12, "b");
  R(8 + x0, 13, 11 + x0, 14, "T"); P(9 + x0, 15, "T"); P(10 + x0, 15, "T");
  R(3 + x0, 8, 5 + x0, 9, "L"); P(3 + x0, 7, "m"); P(4 + x0, 6, "m"); P(5 + x0, 7, "m"); R(14 + x0, 8, 16 + x0, 9, "L"); P(16 + x0, 7, "m"); P(15 + x0, 6, "m"); P(14 + x0, 7, "m");
  R(3 + x0, 10, 4 + x0, 13, "g"); R(3 + x0, 12, 4 + x0, 13, "M"); // off hand with a spiked bracer
  // head: low brow, heavy jaw, big tusks, war paint and a mohawk
  R(7 + x0, 3, 12 + x0, 6, "g"); R(6 + x0, 5, 13 + x0, 8, "g"); R(8 + x0, 1, 11 + x0, 2, "r"); P(7 + x0, 2, "r"); P(12 + x0, 2, "r"); P(9 + x0, 0, "r"); P(10 + x0, 0, "r");
  R(7 + x0, 4, 12 + x0, 4, "D"); P(8 + x0, 5, "y"); P(11 + x0, 5, "y"); P(9 + x0, 6, "G"); P(10 + x0, 6, "G"); R(7 + x0, 7, 12 + x0, 7, "D"); P(7 + x0, 5, "r"); P(12 + x0, 5, "r"); P(8 + x0, 7, "t"); P(11 + x0, 7, "t");
  P(6 + x0, 6, "t"); P(6 + x0, 5, "t"); P(13 + x0, 6, "t"); P(13 + x0, 5, "t"); R(7 + x0, 8, 12 + x0, 8, "G");
  // two-handed cleaver
  const hx = 15 + x0 + 1;
  if (ap === 1) { R(hx - 1, 2, hx - 1, 9, "w"); R(hx, 0, hx + 2, 5, "m"); R(hx + 2, 0, hx + 2, 5, "M"); P(hx - 2, 4, "m"); }
  else if (ap === 2) { R(hx - 5, 11, hx - 1, 11, "w"); R(hx, 7, hx + 2, 15, "m"); R(hx + 2, 7, hx + 2, 15, "M"); }
  else { R(hx - 1, 5, hx - 1, 13, "w"); R(hx, 3, hx + 2, 11, "m"); R(hx + 2, 3, hx + 2, 11, "M"); P(hx, 4, "t"); P(hx + 1, 7, "M"); }
  R(13 + x0, 10, 15 + x0, 10, "g");
});

// ---------- Troll Warlord ----------
MA("trollw", 26, 26, { g: "#6f98a8", G: "#4b7385", D: "#2c4755", v: "#7fd36a", t: "#f1e8cf", y: "#ffd24a", k: "#2a2a30", i: "#9a9aa2", w: "#6a4524", W: "#8a5a2b", L: "#5a3d22", T: "#4aa3ff", c: "#d9c27a" }, c => {
  const { P, R, RF, wf, ap, contact, odd } = c, x0 = 1;
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 17, bx + 3, 19, "G"); RF(bx, 20, bx + 4, 20, "D"); } else { RF(bx, 17, bx + 3, 21, "G"); RF(bx - 1, 22, bx + 4, 22, "D"); P(bx - 1, 21, "t"); P(bx + 4, 21, "t"); } };
  if (wf < 0) { leg(9 + x0, 0, 0); leg(14 + x0, 0, 0); }
  else if (contact) { leg(9 + x0, 0, -1); leg(14 + x0, 0, 1); }
  else if (wf === 1) { leg(9 + x0, 1, 0); leg(14 + x0, 0, 0); } else { leg(9 + x0, 0, 0); leg(14 + x0, 1, 0); }
  // huge slumped body: a big belly, long arms hanging, mossy shoulders and a bone-tooth necklace
  R(7 + x0, 10, 18 + x0, 18, "g"); R(6 + x0, 11, 19 + x0, 16, "g"); R(8 + x0, 15, 17 + x0, 18, "G"); R(9 + x0, 12, 11 + x0, 13, "G"); R(14 + x0, 12, 16 + x0, 13, "G"); R(10 + x0, 16, 15 + x0, 16, "D");
  R(7 + x0, 10, 18 + x0, 10, "v"); P(8 + x0, 11, "v"); P(10 + x0, 11, "v"); P(16 + x0, 11, "v"); P(17 + x0, 11, "v"); P(6 + x0, 11, "v");
  R(9 + x0, 18, 16 + x0, 19, "L"); R(11 + x0, 18, 14 + x0, 19, "T"); P(12 + x0, 20, "T"); P(13 + x0, 20, "T");
  for (let i = 0; i < 5; i++) P(9 + x0 + i * 2, 11 + (i === 2 ? 3 : i % 2 ? 2 : 1), "t");
  // arms
  R(3 + x0, 11, 6 + x0, 18, "g"); R(3 + x0, 16, 6 + x0, 19, "G"); P(3 + x0, 19, "t"); P(6 + x0, 19, "t");
  R(19 + x0, 11, 22 + x0, 14, "g"); R(21 + x0, 12, 22 + x0, 15, "G");
  // small head with a heavy underbite, tusks, one broken horn and an iron crown
  R(9 + x0, 3, 16 + x0, 8, "g"); R(8 + x0, 5, 17 + x0, 9, "g"); R(9 + x0, 9, 16 + x0, 9, "G");
  R(9 + x0, 6, 16 + x0, 6, "D"); P(10 + x0, 7, "y"); P(15 + x0, 7, "y"); P(12 + x0, 7, "G"); P(13 + x0, 7, "G");
  R(10 + x0, 8, 15 + x0, 8, "k"); P(10 + x0, 7, "y"); P(9 + x0, 7, "t"); P(9 + x0, 8, "t"); P(8 + x0, 8, "t"); P(16 + x0, 7, "t"); P(16 + x0, 8, "t"); P(17 + x0, 8, "t");
  R(9 + x0, 2, 16 + x0, 3, "i"); for (let i = 0; i < 4; i++) { P(9 + x0 + i * 2 + (i > 1 ? 0 : 0), 1, "i"); } P(9 + x0, 0, "i"); P(16 + x0, 0, "i"); R(9 + x0, 2, 16 + x0, 2, "c"); P(12 + x0, 2, "T"); P(13 + x0, 2, "T");
  P(8 + x0, 4, "t"); P(7 + x0, 3, "t"); P(17 + x0, 4, "t"); P(18 + x0, 3, "t");
  // spiked tree-trunk club
  const cx = 22 + x0;
  if (ap === 1) { R(cx, -0 + 0, cx + 1, 12, "w"); R(cx - 1, 0, cx + 2, 6, "W"); P(cx - 2, 1, "i"); P(cx + 3, 3, "i"); P(cx - 2, 4, "i"); R(cx - 1, 7, cx - 1, 7, "L"); }
  else if (ap === 2) { R(cx - 6, 14, cx + 2, 15, "w"); R(cx - 9, 11, cx - 5, 18, "W"); P(cx - 10, 12, "i"); P(cx - 10, 16, "i"); P(cx - 7, 10, "i"); P(cx - 7, 19, "i"); }
  else { R(cx, 6, cx + 1, 18, "w"); R(cx - 1, 4, cx + 2, 12, "W"); P(cx - 2, 5, "i"); P(cx + 3, 8, "i"); P(cx - 2, 10, "i"); P(cx + 3, 5, "i"); }
  if (ap === 2) R(cx - 4, 13, cx - 1, 16, "g"); else R(cx - 2, 13, cx + 2, 16, "g");
});

// ---------- Ogre Breaker ----------
MA("ogre", 26, 24, { g: "#d2a972", G: "#a97d4a", D: "#6a4a28", e: "#fff4d8", p: "#6a2a8a", y: "#ffd24a", k: "#2a2a30", i: "#9a9aa2", I: "#5a5a66", s: "#8f8a80", S: "#6a665e", t: "#f1e8cf", L: "#5a3d22", T: "#4aa3ff", r: "#c8342a" }, c => {
  const { P, R, RF, wf, ap, contact, odd } = c, x0 = 1;
  const leg = (x, lift, spread) => { const bx = x + spread; if (lift) { RF(bx, 16, bx + 3, 18, "G"); RF(bx - 1, 19, bx + 4, 19, "D"); } else { RF(bx, 16, bx + 3, 19, "G"); RF(bx - 1, 20, bx + 4, 20, "D"); } };
  if (wf < 0) { leg(7 + x0, 0, 0); leg(13 + x0, 0, 0); }
  else if (contact) { leg(7 + x0, 0, -1); leg(13 + x0, 0, 1); }
  else if (wf === 1) { leg(7 + x0, 1, 0); leg(13 + x0, 0, 0); } else { leg(7 + x0, 0, 0); leg(13 + x0, 1, 0); }
  // a vast round belly in a studded iron belt, a ragged loin cloth in the lord's colour
  R(4 + x0, 9, 19 + x0, 17, "g"); R(3 + x0, 10, 20 + x0, 15, "g"); R(5 + x0, 16, 18 + x0, 17, "G"); R(5 + x0, 15, 18 + x0, 15, "g");
  R(5 + x0, 10, 7 + x0, 12, "G"); R(16 + x0, 10, 18 + x0, 12, "G"); P(11 + x0, 13, "D"); P(12 + x0, 13, "D");
  R(4 + x0, 14, 19 + x0, 15, "L"); for (let i = 0; i < 6; i++) P(5 + x0 + i * 3, 14, "i"); R(10 + x0, 14, 13 + x0, 15, "y");
  R(9 + x0, 16, 14 + x0, 19, "T"); P(10 + x0, 20, "T"); P(13 + x0, 20, "T");
  R(2 + x0, 9, 5 + x0, 11, "G"); R(18 + x0, 9, 21 + x0, 11, "G"); R(2 + x0, 12, 4 + x0, 16, "g"); R(2 + x0, 15, 4 + x0, 17, "G");
  // spiked iron collar
  R(7 + x0, 7, 16 + x0, 8, "i"); P(8 + x0, 6, "i"); P(11 + x0, 6, "i"); P(12 + x0, 6, "i"); P(15 + x0, 6, "i"); R(7 + x0, 8, 16 + x0, 8, "I");
  // one huge eye, a horn, big flat teeth
  R(7 + x0, 2, 16 + x0, 7, "g"); R(6 + x0, 3, 17 + x0, 6, "g"); R(7 + x0, 7, 16 + x0, 7, "G");
  R(10 + x0, 3, 13 + x0, 5, "e"); R(11 + x0, 3, 12 + x0, 5, "p"); P(11 + x0, 4, "k"); P(12 + x0, 4, "k"); P(10 + x0, 3, "G"); P(13 + x0, 3, "G"); R(9 + x0, 2, 14 + x0, 2, "D");
  P(6 + x0, 1, "t"); P(7 + x0, 2, "t"); P(17 + x0, 1, "t"); P(16 + x0, 2, "t"); P(5 + x0, 0, "t"); P(18 + x0, 0, "t");
  R(8 + x0, 6, 15 + x0, 6, "k"); P(9 + x0, 6, "t"); P(11 + x0, 6, "t"); P(13 + x0, 6, "t"); P(15 + x0, 6, "t"); P(6 + x0, 5, "G"); P(17 + x0, 5, "G");
  // a stone-block maul with an iron-banded haft
  const mx = 21 + x0;
  if (ap === 1) { R(mx, 6, mx + 1, 13, "L"); R(mx - 2, 0, mx + 3, 5, "s"); R(mx - 2, 5, mx + 3, 5, "S"); R(mx - 2, 0, mx - 2, 5, "I"); R(mx - 1, 1, mx, 1, "i"); }
  else if (ap === 2) { R(mx - 8, 14, mx, 15, "L"); R(mx - 11, 11, mx - 7, 19, "s"); R(mx - 11, 19, mx - 7, 19, "S"); R(mx - 11, 11, mx - 11, 19, "I"); P(mx - 10, 12, "i"); P(mx - 10, 17, "i"); }
  else { R(mx, 7, mx + 1, 19, "L"); R(mx - 2, 3, mx + 3, 9, "s"); R(mx - 2, 9, mx + 3, 9, "S"); R(mx - 2, 3, mx - 2, 9, "I"); R(mx - 1, 4, mx, 4, "i"); P(mx + 1, 7, "i"); }
  R(19 + x0, 12, 22 + x0, 13, "g");
});

// ---------- Centaur Archer ----------
MA("centaur", 30, 20, { h: "#9a6a38", H: "#6e4724", m: "#2a1a10", s: "#d8c9a6", S: "#b09c78", a: "#c8e4ff", e: "#ffd24a", b: "#3b86d8", w: "#8a5a2b", t: "#f1e8cf", k: "#4a3a2a", T: "#4aa3ff", f: "#e8461e", g: "#d6b24a" }, c => {
  const { P, R, RF, wf, ap, contact, odd } = c, x0 = 2;
  // four legs
  const leg = (x, lift, dx) => { const bx = x + dx; if (lift) { RF(bx, 13, bx + 1, 14, "H"); RF(bx, 15, bx + 1, 15, "k"); } else { RF(bx, 13, bx + 1, 16, "H"); RF(bx - 1, 17, bx + 1, 17, "k"); } };
  if (wf < 0) { [6, 9, 15, 18].forEach(x => leg(x + x0, 0, 0)); }
  else if (contact) { leg(6 + x0, 0, wf === 0 ? -2 : 2); leg(9 + x0, 0, wf === 0 ? 1 : -1); leg(15 + x0, 0, wf === 0 ? 2 : -2); leg(18 + x0, 0, wf === 0 ? -1 : 1); }
  else { leg(6 + x0, wf === 1 ? 1 : 0, 0); leg(9 + x0, wf === 1 ? 0 : 1, 0); leg(15 + x0, wf === 1 ? 0 : 1, 0); leg(18 + x0, wf === 1 ? 1 : 0, 0); }
  // horse body, long tail, mane, a saddle blanket in the lord's colour
  R(5 + x0, 9, 19 + x0, 13, "h"); R(4 + x0, 10, 20 + x0, 12, "h"); R(5 + x0, 12, 19 + x0, 13, "H"); R(4 + x0, 13, 6 + x0, 13, "h");
  R(1 + x0, 9, 4 + x0, 11, "m"); R(0 + x0, 11, 2 + x0, 15, "m"); P(0 + x0, 16, "m");
  R(9 + x0, 8, 14 + x0, 9, "T"); R(9 + x0, 9, 14 + x0, 9, "T"); P(9 + x0, 10, "g"); P(14 + x0, 10, "g");
  R(5 + x0, 8, 8 + x0, 8, "H"); R(20 + x0, 8, 21 + x0, 9, "h");
  // beast torso rising from the shoulders: pale hide with blue war marks
  R(18 + x0, 4, 22 + x0, 9, "s"); R(18 + x0, 8, 22 + x0, 9, "S"); R(19 + x0, 5, 20 + x0, 5, "b"); R(19 + x0, 7, 21 + x0, 7, "b");
  R(17 + x0, 4, 17 + x0, 8, "m"); R(17 + x0, 3, 18 + x0, 3, "m");
  // stag-skull head with antlers and glowing eyes
  R(20 + x0, 0, 24 + x0, 4, "t"); R(24 + x0, 2, 26 + x0, 4, "t"); P(25 + x0, 4, "S"); P(26 + x0, 4, "S"); P(21 + x0, 2, "k"); P(22 + x0, 2, "e"); P(21 + x0, 1, "S");
  P(20 + x0, -1 + 1, "S"); R(19 + x0, 0, 19 + x0, 0, "S");
  R(19 + x0, 0, 19 + x0, 1, "t"); P(18 + x0, 0, "t"); P(17 + x0, 1, "t");
  // arms and a long horn bow
  R(23 + x0, 6, 24 + x0, 8, "s");
  const bx = 25 + x0;
  if (ap === 1) { P(bx, 3, "w"); R(bx + 1, 4, bx + 1, 11, "w"); P(bx, 12, "w"); R(bx - 4, 8, bx + 0, 8, "t"); P(bx - 5, 8, "t"); P(bx - 3, 7, "t"); P(bx - 3, 9, "f"); R(bx - 1, 5, bx - 1, 11, "t"); }
  else { P(bx, 3, "w"); R(bx + 1, 4, bx + 1, 11, "w"); P(bx, 12, "w"); R(bx, 5, bx, 11, "t"); if (ap === 2) { R(bx + 2, 8, bx + 2, 8, "a"); P(bx + 1, 8, "a"); P(bx + 2, 7, "f"); } }
});
