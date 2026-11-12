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

// A bot's skill-tree build (heroes from HERO_V3_FROM): one main tree filled to its ultimate, then, by seed, either depth (the main tree to 11, 3 into a second) or breadth (6 into a second).
// Roughly a third of builds take a side talent on the way. The same seed, level and class always give the same build.
function autoTree(lvl, seed, cls) {
  const tr = emptyTree(), main = Math.floor(hash(seed, 3, 91) * 3), other = (main + 1 + Math.floor(hash(seed, 4, 91) * 2)) % 3, depth = hash(seed, 5, 91) < .5, sides = hash(seed, 6, 91) < .34;
  const seq = [[0, 0], [0, 0], [0, 1], [0, 1], [0, 1], [0, 3], [0, sides ? 4 : 3], [0, 5]];
  if (depth) seq.push([0, 0], [0, 0], [0, 1], [1, 0], [1, 0], [1, 1]); else seq.push([1, 0], [1, 0], [1, 1], [1, 1], [1, 1], [1, 3]);
  seq.push([0, 3], [0, 0], [0, 1], [0, 2], [0, 2], [1, 3], [1, 1], [1, 0], [0, 4], [1, 2], [1, 4]);
  const bk = [main, other], L = Math.min(lvl, MAX_HERO_LVL_V3);
  TREE_NAME_CLS = cls || "warrior";
  seq.forEach(([w, i]) => { if (treeCanLearn(tr, TREE_BKEY[bk[w]], i, L)) tr[TREE_BKEY[bk[w]]][i]++; });
  return tr;
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

// How a bot fights (battles from 12 Nov 2026): one of five styles, fixed for the war by its seed, using the same combat groups a player sets.
// Each style gives its hero, melee soldiers, ranged soldiers and healers their priorities, plus a reach and a way of marching.
const BOT_STYLES = [
  { name: "hunter",   heading: "hero",   gprio: { hero: ["hero", "ranged", "melee"], melee: ["ranged", "hero", "melee"], ranged: ["hero", "melee", "ranged"], heal: ["hero", "lowhp", "any"] } },
  { name: "brawler",  heading: "castle", gprio: { hero: ["melee", "hero", "ranged"], melee: ["melee", "ranged", "hero"], ranged: ["ranged", "melee", "hero"], heal: ["melee", "wounded", "any"] } },
  { name: "sniper",   heading: "castle", gprio: { hero: ["ranged", "hero", "healer"], melee: ["ranged", "healer", "any"], ranged: ["hero", "ranged", "healer"], heal: ["hero", "wounded", "ranged"] } },
  { name: "assassin", heading: "castle", gprio: { hero: ["healer", "hero", "lowhp"], melee: ["healer", "ranged", "lowhp"], ranged: ["healer", "hero", "lowhp"], heal: ["hero", "lowhp", "any"] } },
  { name: "balanced", heading: "castle", gprio: { hero: ["hero", "ranged", "melee"], melee: ["melee", "ranged", "hero"], ranged: ["hero", "ranged", "melee"], heal: ["hero", "wounded", "any"] } },
];
const BOT_WAVES = { hunter: [["enemy_hero", 0, "hero"], ["hero_dies", 0, "default"], ["timer", 90, "hero"]], brawler: [["castle_hit", 0, "default"], ["timer", 60, "castle"], ["army_dead", 0, "castle"]], sniper: [["ult", 0, "default"], ["castle_low", 0, "nearest"], ["timer", 120, "default"]], assassin: [["enemy_hero", 0, "hero"], ["timer", 45, "castle"], ["hero_dies", 0, "default"]], balanced: [["castle_hit", 0, "default"], ["hero_dies", 0, "default"], ["timer", 150, "castle"]] };
// a bot keeps some of its soldiers back in the garrison, more as the week goes on: up to 3 a wave, filled wave by wave
const botWaves = (seed, kinds, dayNo) => { const st = BOT_STYLES[(seed >> 1) % BOT_STYLES.length].name, n = Math.min(GARRISON_SOLDIERS, Math.floor(dayNo * 1.5)), ulvl = 1 + Math.floor((dayNo - 1) / 2);
  return BOT_WAVES[st].map(([when, at, order], i) => ({ when, at: at || 60, order, units: [...Array(Math.max(0, Math.min(WAVE_SLOTS, n - i * WAVE_SLOTS)))].map((_, k) => ({ type: kinds[Math.floor(hash(seed, i * 3 + k, 41 + dayNo) * kinds.length)], lvl: ulvl, id: null, hp: 1 })) })); };
const botCombat = seed => { const st = BOT_STYLES[(seed >> 1) % BOT_STYLES.length]; return { gprio: cleanGprio(st.gprio), engage: 1 + (seed >> 3) % 3, heading: st.heading }; };

// One bot lord's orders for one day. uid: its seat id; cls: its hero; i: its place in the roster (its castle is L.castles[i]);
// ids: everyone in the roster, in order; L: the seat layout; zone: the tiles it may deploy on; dayNo: 1 to 7; lvl: its hero's level that day.
function lordBotPlan({ uid, cls, i, ids, L, zone, dayNo, lvl, v2, v3 }) {
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
  return { cls, sealed: true, ...(v3 ? { ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, tree: autoTree(lvl, seed, cls) } : { ranks: autoRanks(lvl, seed) }), picks, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
    gear: { weapon: Math.min(2, Math.floor(dayNo / 3)), armour: Math.min(2, Math.floor((dayNo + 1) / 3)), charm: dayNo >= 5 ? 1 : 0 }, defences: { walls: dayNo >= 3 ? 1 : 0, tower: dayNo >= 5 && seed % 2 ? 1 : 0 },
    items: botItems(seed).slice(0, Math.floor(dayNo / 2)), castleTier: tier, stance: BOT_STANCES[seed % BOT_STANCES.length], prio: PRIORITIES.slice(rot).concat(PRIORITIES.slice(0, rot)), rules: [{ if: IFS[0], then: THENS[0] }],
    pieces, targets: near, tmode: "list", heading: "near", offers: {}, replies: {}, terms: {}, bids: {}, pacts: [], hostile: [], betray: {}, bot: true, ...(v2 ? { ...botCombat(seed), waves: botWaves(seed, kinds, dayNo) } : {}) };
}
