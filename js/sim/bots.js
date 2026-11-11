// Rival AI personalities, auto skill ranks and bot items

const RIVAL_AI = {
  p1: { stance: "aggressive", offers: { you: { gold: 150 } }, terms: { you: { mode: "accept", min: 100 } } },
  p2: { stance: "skirmish", offers: { p3: { gold: 0 } }, terms: { you: { mode: "betray", min: 150, when: "When 3 players remain" } } },
  p3: { stance: "aggressive", offers: { p2: { gold: 0, rigged: true } }, terms: { you: { mode: "accept", min: 300 } } },
  p4: { stance: "cautious", hostile: ["p5"], offers: { you: { gold: 120, rigged: true } }, terms: { you: { mode: "accept", min: 200 } } },
  p5: { stance: "aggressive", hostile: ["you"], terms: { you: { mode: "refuse" } } },
  p6: { stance: "cautious", offers: { p7: { gold: 0 } }, terms: { you: { mode: "accept", min: 100 } } },
  p7: { stance: "skirmish", offers: { p6: { gold: 0 } }, terms: { you: { mode: "betray", min: 250, when: "At the 2-minute mark" } } },
};

function autoRanks(lvl, seed) {
  const r = { a1: 0, a2: 0, a3: 0, ult: 0, a4: 0 }, order = ["a1", "a2", "a3"].sort((a, b) => hash(seed, a.charCodeAt(1)) - hash(seed, b.charCodeAt(1)));
  for (let p = 0; p < lvl; p++) {
    if (canRankAt("ult", r.ult, lvl)) { r.ult++; continue; }
    const ks = order.filter(k => canRankAt(k, r[k], lvl)).sort((x, y) => r[x] - r[y]);
    if (ks.length) r[ks[0]]++; else if (canRankAt("a4", r.a4, lvl)) r.a4++;
  }
  return r;
}

const BOT_ITEM_POOL = ["boots", "gauntlets", "ringprot", "salve", "elixir", "net", "frostdagger", "fang", "banner", "standard", "thornmail", "scroll"];
function botItems(i) { const n = Math.floor(hash(i, 6, 31) * 4), out = []; for (let j = 0; j < n; j++) { const k = BOT_ITEM_POOL[Math.floor(hash(i, j + 1, 32) * BOT_ITEM_POOL.length)]; if (!out.includes(k)) out.push(k); } return out; }

// ----- Bot lords: seats in a real game that play themselves -----
// A host can fill empty seats with bots. A bot is an ordinary registered lord with { bot: true } on its public profile.
// It has no account and saves no orders: every day its orders are worked out here from nothing but who it is, where its
// castle stands and what day it is, so the server and every phone get exactly the same ones. They grow more capable as the week goes on.
const BOT_LORD_NAMES = ["Ser Gareth", "Lady Maren", "Baron Voss", "Dame Isolde", "Lord Corvin", "Ser Tamsin", "Count Rurik", "Lady Elowen", "Baron Thale", "Ser Odric", "Dame Brynn", "Lord Aldous"]; // nicknames, 16 characters at most
const BOT_LORD_BANNERS = [{ pat: "halves", c2: "#ecdcb4", em: "crown" }, { pat: "stripe", c2: "#1e140c", em: "skull" }, { pat: "cross", c2: "#ecdcb4", em: "star" }, { pat: "chevron", c2: "#e2b33c", em: "sun" }, { pat: "quarters", c2: "#ecdcb4", em: "none" }, { pat: "solid", c2: "#ecdcb4", em: "moon" }, { pat: "stripe", c2: "#e2b33c", em: "tower" }];
const BOT_STANCES = ["aggressive", "skirmish", "cautious", "aggressive"];
const botSeed = uid => { let h = 7; for (let k = 0; k < uid.length; k++) h = (h * 31 + uid.charCodeAt(k)) % 99991; return h; };

// One bot lord's orders for one day. uid: its seat id; cls: its hero; i: its place in the roster (its castle is L.castles[i]);
// ids: everyone in the roster, in order; L: the seat layout; zone: the tiles it may deploy on; dayNo: 1 to 7; lvl: its hero's level that day.
function lordBotPlan({ uid, cls, i, ids, L, zone, dayNo, lvl }) {
  const seed = botSeed(uid), me = L.castles[i], c = CLASSES[cls] || CLASSES.warrior, sp = armySpots(me, L.N);
  const picks = {}; c.abilities.forEach((a, j) => { picks[a.key] = a.choice[hash(seed, j, 77) > .5 ? 1 : 0][0]; });
  const rot = Math.floor(hash(seed, 5, 3) * PRIORITIES.length), tier = Math.min(3, 1 + Math.floor((dayNo - 1) / 3));
  const kinds = UTYPES.filter(k => !UNITS[k].cool && (UNIT_TIER[k] || 1) <= tier);
  // soldiers: the three spots just in front of the castle first, then whatever else of the deployment field is nearest
  const taken = new Set([`${sp.champ[0]},${sp.champ[1]}`, `${me[0]},${me[1]}`]);
  const field = Array.from(zone).map(k => k.split(",").map(Number)).filter(([r, q]) => !taken.has(`${r},${q}`)).sort((a, b) => (hyp(a[0] - sp.champ[0], a[1] - sp.champ[1]) - hyp(b[0] - sp.champ[0], b[1] - sp.champ[1])) || (a[0] - b[0]) || (a[1] - b[1]));
  const spots = sp.units.filter(([r, q]) => zone.has(`${r},${q}`) && !taken.has(`${r},${q}`)).concat(field.filter(([r, q]) => !sp.units.some(([a, b]) => a === r && b === q)));
  const n = Math.min(spots.length, 2 + dayNo + (seed % 2)), ulvl = 1 + Math.floor((dayNo - 1) / 2);
  const pieces = [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }];
  for (let k = 0; k < n; k++) pieces.push({ kind: "unit", type: kinds[Math.floor(hash(seed, k, 11 + dayNo) * kinds.length)], lvl: ulvl, hp: 1, r: spots[k][0], c: spots[k][1] });
  if (dayNo >= 2 && seed % 3) { // a short barrier across the way to the middle, where it fits
    const ctr = (L.N - 1) / 2, dy = ctr - me[0], dx = ctr - me[1], len = hyp(dx, dy) || 1, r = Math.round(me[0] + dy / len * 3), q = Math.round(me[1] + dx / len * 3);
    if (zone.has(`${r},${q}`) && !pieces.some(p => p.r === r && p.c === q)) pieces.push({ kind: "wall", r, c: q, dir: Math.abs(dy) >= Math.abs(dx) ? "h" : "v" });
  }
  const near = ids.map((id, k) => ({ id, d: id === uid ? 1e9 : hyp(L.castles[k][0] - me[0], L.castles[k][1] - me[1]) })).filter(x => x.id !== uid).sort((a, b) => (a.d - b.d) || (a.id < b.id ? -1 : 1)).map(x => x.id);
  return { cls, sealed: true, ranks: autoRanks(lvl, seed), picks, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
    gear: { weapon: Math.min(2, Math.floor(dayNo / 3)), armour: Math.min(2, Math.floor((dayNo + 1) / 3)), charm: dayNo >= 5 ? 1 : 0 }, defences: { walls: dayNo >= 3 ? 1 : 0, tower: dayNo >= 5 && seed % 2 ? 1 : 0 },
    items: botItems(seed).slice(0, Math.floor(dayNo / 2)), castleTier: tier, stance: BOT_STANCES[seed % BOT_STANCES.length], prio: PRIORITIES.slice(rot).concat(PRIORITIES.slice(0, rot)), rules: [{ if: IFS[0], then: THENS[0] }],
    pieces, targets: near, tmode: "list", heading: "near", offers: {}, replies: {}, terms: {}, bids: {}, pacts: [], hostile: [], betray: {}, bot: true };
}
