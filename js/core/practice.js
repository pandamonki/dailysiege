// The practice lobby: bot rivals and their armies

const YOU_COLOR = "#2f5fa8";
// Skill-tree heroes in practice: open the game with ?herov3 (or set localStorage dsHeroV3 = 1). Live games follow HERO_V3_FROM instead.
const heroV3Flag = () => { try { return /[?&]herov3\b/.test(location.search) || localStorage.getItem("dsHeroV3") === "1"; } catch (e) { return false; } };
// pick your targets (PICK_V1): always on in practice; in a real war from PICK_V1_FROM
const pickV1Now = () => (typeof isLive === "function" && isLive() ? pickV1For(liveClock().planDay) : true);
// a new day: nobody is a target until the lord picks again
const pickReset = () => { if (!pickV1Now() || !S || !S.lists) return; S.lists.neutral = S.lists.neutral.concat(S.lists.hostile.filter(k => !PICK_ROLES[k] && !S.lists.neutral.includes(k))); S.lists.hostile = []; if (S.strategy) S.strategy.mode = "list"; };
const heroV3Now = () => (typeof isLive === "function" && isLive() ? heroV3For(liveClock().planDay) : heroV3Flag());
let MY_COLOR = YOU_COLOR;
// Example lobby for practice battles (castles are placed by the seat layout)
const BOTS = [
  { id: "p1", name: "Sam",    cls: "warrior", pos: [1, 8],  trust: "Loyal",   color: "#b8322a" },
  { id: "p2", name: "Riley",  cls: "rogue",   pos: [3, 3],  trust: "Uneasy",  color: "#3d7a35" },
  { id: "p3", name: "Jordan", cls: "mage",    pos: [3, 13], trust: "Wary",    color: "#7a3d8f" },
  { id: "p4", name: "Alex",   cls: "shaman",  pos: [8, 1],  trust: "Wary",    color: "#c9862f" },
  { id: "p5", name: "Casey",  cls: "archer",  pos: [8, 15], trust: "Alarmed", color: "#d6559a" },
  { id: "p6", name: "Morgan", cls: "rogue",   pos: [13, 3], trust: "Loyal",   color: "#2d8a8a" },
  { id: "p7", name: "Taylor", cls: "warrior", pos: [13, 13], trust: "Wary",    color: "#d8d2c0" },
];
let RIVALS = BOTS, RWALLS = [];
const BOT_BANNERS = [{ pat: "halves", c1: null, c2: "#ecdcb4", em: "crown" }, { pat: "stripe", c1: null, c2: "#1e140c", em: "skull" }, { pat: "cross", c1: null, c2: "#ecdcb4", em: "star" }, { pat: "chevron", c1: null, c2: "#e2b33c", em: "sun" }, { pat: "quarters", c1: null, c2: "#ecdcb4", em: "none" }, { pat: "solid", c1: null, c2: "#ecdcb4", em: "moon" }, { pat: "stripe", c1: null, c2: "#e2b33c", em: "tower" }];

function setupPractice() {
  const L = seatLayout(8);
  BOTS.forEach((b, i) => { b.pos = L.castles[i + 1]; });
  RIVALS = BOTS; RARMY = []; RWALLS = [];
  BOTS.forEach((b, i) => { b.banner = BOT_BANNERS[i % BOT_BANNERS.length]; b.ctier = 1 + (hash(i, 7, 41) > .6 ? 1 : 0); });
  { const ctr0 = (L.N - 1) / 2;
    BOTS.forEach((b, i) => { if (i % 2) return; const dy = ctr0 - b.pos[0], dx = ctr0 - b.pos[1], LL = hyp(dx, dy) || 1, uy = dy / LL, ux = dx / LL;
      const r = Math.round(b.pos[0] + uy * 3), c = Math.round(b.pos[1] + ux * 3), dir = Math.abs(uy) >= Math.abs(ux) ? "h" : "v", z = zoneFor(b.pos, L.N, L.castles);
      (dir === "h" ? [[r, c - 1], [r, c], [r, c + 1]] : [[r - 1, c], [r, c], [r + 1, c]]).forEach(([a, bb]) => { if (z.has(`${a},${bb}`)) RWALLS.push({ rid: b.id, r: a, c: bb, dir }); }); }); }
  RIVALS.forEach((rv, i) => { const sp = armySpots(rv.pos, L.N);
    RARMY.push({ rid: rv.id, r: sp.champ[0], c: sp.champ[1], champ: true, key: "c-" + rv.cls, hp: .55 + hash(i, 1, 9) * .45 });
    sp.units.slice(0, 2).forEach((p, j) => RARMY.push({ rid: rv.id, r: p[0], c: p[1], champ: false, key: UTYPES[(i + j * 2) % UTYPES.length], lvl: 1 + (hash(p[0], p[1], 8) > .5 ? 1 : 0), hp: .35 + hash(i, j, 4) * .65 })); });
  applyLayout(L.N, L.castles[0], RIVALS.map(r => r.pos));
}
