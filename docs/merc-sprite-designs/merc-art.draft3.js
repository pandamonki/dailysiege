// Simplified troll, ogre and centaur: same level of detail as the human soldiers (big shapes, few pixels)
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
  parts: { legs: oLegs, body: oBody, head: oHead, weapon: oMaul }, vars: {
  b: { name: "Bull Ogre", pal: { g: "#a8583a", G: "#7a3a26", D: "#4a2218", y: "#ff9a2a", L: "#4a2f17" }, parts: {
    head: c => { const { P, R } = c; R(6, 2, 15, 8, "g"); R(8, 5, 13, 8, "e"); P(9, 6, "D"); P(12, 6, "D"); R(7, 3, 14, 3, "D"); P(8, 4, "e"); P(9, 4, "k"); P(13, 4, "e"); P(12, 4, "k"); P(10, 8, "y"); P(11, 8, "y");
      [[6, 2], [5, 1], [4, 1], [3, 0], [15, 2], [16, 1], [17, 1], [18, 0]].forEach(([x, y]) => P(x, y, "t")); },
    weapon: c => { const { R, ap } = c;
      if (ap === 1) { R(19, 1, 21, 12, "L"); R(18, 0, 21, 2, "i"); }
      else if (ap === 2) { R(11, 13, 20, 15, "L"); R(8, 12, 11, 16, "i"); }
      else { R(19, 3, 21, 18, "L"); R(18, 1, 21, 4, "i"); R(19, 10, 21, 10, "i"); }
      R(19, 12, 20, 14, "g"); } } } } };

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
  parts: { legs: cLegs, body: cBody, head: cHeadA, weapon: cBow }, vars: {
  b: { name: "Grey Hooded", pal: { h: "#9a9ea6", H: "#6a6e78", m: "#3a3a44", a: "#3f6b2e", b: "#7a5a2a", hc: "#2e4f22" }, parts: {
    back: c => { const { R, P } = c; R(11, 5, 12, 10, "L"); P(11, 4, "t"); P(12, 3, "t"); },
    head: c => { const { P, R } = c; cTorso(c); R(14, 0, 21, 2, "hc"); R(14, 3, 14, 6, "hc"); R(21, 3, 21, 5, "hc"); P(21, 6, "hc"); } } } } };
