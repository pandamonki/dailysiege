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
function autoTree(lvl, seed, cls, slot) { // slot: the bot's place in the roster; it rotates the main tree so lords in one game spread across all three
  const tr = emptyTree(), main = (Math.floor(hash(seed, 3, 91) * 3) + (slot || 0)) % 3, other = (main + 1 + Math.floor(hash(seed, 4, 91) * 2)) % 3, depth = hash(seed, 5, 91) < .5, sides = hash(seed, 6, 91) < .34;
  const seq = [[0, 0], [0, 0], [0, 1], [0, 1], [0, 1], [0, 3], [0, sides ? 4 : 3], [0, 5]];
  if (depth) seq.push([0, 0], [0, 0], [0, 1], [1, 0], [1, 0], [1, 1]); else seq.push([1, 0], [1, 0], [1, 1], [1, 1], [1, 1], [1, 3]);
  seq.push([0, 3], [0, 0], [0, 1], [0, 2], [0, 2], [1, 3], [1, 1], [1, 0], [0, 4], [1, 2], [1, 4]);
  const bk = [main, other], L = Math.min(lvl, MAX_HERO_LVL_V4);
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
const BOT_LORD_NAMES = ["Ser Gareth", "Lady Maren", "Baron Voss", "Dame Agnes", "Lord Corvin", "Ser Tamsin", "Count Rurik", "Lady Hild", "Baron Thale", "Ser Odric", "Dame Brynn", "Lord Bramwell"]; // nicknames, 16 characters at most
const BOT_LORD_BANNERS = [{ pat: "halves", c2: "#ecdcb4", em: "crown" }, { pat: "stripe", c2: "#1e140c", em: "skull" }, { pat: "cross", c2: "#ecdcb4", em: "star" }, { pat: "chevron", c2: "#e2b33c", em: "sun" }, { pat: "quarters", c2: "#ecdcb4", em: "none" }, { pat: "solid", c2: "#ecdcb4", em: "moon" }, { pat: "stripe", c2: "#e2b33c", em: "tower" }];
const BOT_TAUNTS_TV = ["GG", "Ez.", "GG EZ", "Get gud.", "Too easy.", "Better luck next time.", "Sit down.", "Gracias, GG."], BOT_TAUNTS_TE = ["Pwnd!", "Noob.", "Ez.", "Get gud.", "Get rekt!", "L + ratio", "Sit down.", "Next!"];
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
// sup (supply rules from SUPPLY_V2_FROM): a bot unlocks waves as a player would, Wave 1 on day 2, Wave 2 on day 4 and Wave 3 on day 6, and fills only those
const botWavesOpen = dayNo => (dayNo >= 6 ? 3 : dayNo >= 4 ? 2 : dayNo >= 2 ? 1 : 0);
const botWaves = (seed, kinds, dayNo, sup, extra = 0, lvlUp = 0) => { const st = BOT_STYLES[(seed >> 1) % BOT_STYLES.length].name, n = Math.max(0, Math.min(sup ? WAVE_SLOTS * botWavesOpen(dayNo) : GARRISON_SOLDIERS, Math.floor(dayNo * 1.5) + extra)), ulvl = Math.min(3, 1 + Math.floor((dayNo - 1) / 2) + lvlUp); // extra, lvlUp: a bot's build trades reinforcements and training against items and defences
  return BOT_WAVES[st].map(([when, at, order], i) => ({ when, at: at || 60, order, units: [...Array(Math.max(0, Math.min(WAVE_SLOTS, n - i * WAVE_SLOTS)))].map((_, k) => ({ type: kinds[Math.floor(hash(seed, i * 3 + k, 41 + dayNo) * kinds.length)], lvl: ulvl, id: null, hp: 1 })) })); };
const botCombat = seed => { const st = BOT_STYLES[(seed >> 1) % BOT_STYLES.length]; return { gprio: cleanGprio(st.gprio), engage: 1 + (seed >> 3) % 3, heading: st.heading }; };

// One bot lord's orders for one day. uid: its seat id; cls: its hero; i: its place in the roster (its castle is L.castles[i]);
// ids: everyone in the roster, in order; L: the seat layout; zone: the tiles it may deploy on; dayNo: 1 to 7; lvl: its hero's level that day.
// Pick-your-targets bots (PICK_V1): up to three lords a day, chosen by the bot's fighting style from the board going into the day.
// ranks: { uid: place } (empty on day 1); near: rivals nearest first. The same inputs always give the same picks.
function botPicks(uid, seed, near, ranks) {
  const st = BOT_STYLES[(seed >> 1) % BOT_STYLES.length].name, my = ranks && ranks[uid];
  if (!my) return near.slice(0, st === "brawler" ? 3 : 2);
  const at = r => Object.keys(ranks).find(q => ranks[q] === r && q !== uid) || null, above = k => my - k >= 1 ? at(my - k) : at(my + k), top = my === 1 ? at(2) : at(1);
  const want = { hunter: [top, above(1), near[0]], brawler: [near[0], near[1], above(1)], sniper: [above(1), above(2), near[0]], assassin: ["@weakcastle", above(1), near[0]], balanced: [above(1), near[0], top] }[st] || [above(1), near[0]];
  return want.concat(near).filter((q, k, a) => q && q !== uid && (near.includes(q) || !!PICK_ROLES[q]) && a.indexOf(q) === k).slice(0, PICK_MAX);
}
// How a bot spends its gold (from TRAPS_V2_FROM): one of four builds, so a game mixes lords who go heavy on soldiers, on hero items, on defences, or a bit of each.
// Gold spent on one is gold not spent on the others: a fortress fields fewer soldiers and items, a warband more soldiers but few defences, a champion more items.
const BOT_BUILDS = {
  warband:  { units: 1,  items: -1, traps: d => d >= 3 ? 1 : 0,             towers: () => 0,                         walls: () => 0 },
  fortress: { units: -2, items: -1, traps: d => Math.min(TRAP_CAP, d - 1),   towers: d => d >= 4 ? 2 : d >= 2 ? 1 : 0, walls: d => Math.min(4, d) },
  champion: { units: -1, items: 2,  traps: d => d >= 4 ? 1 : 0,             towers: () => 0,                         walls: () => 0 },
  mixed:    { units: -1, items: 0,  traps: d => Math.min(2, Math.floor(d / 2)), towers: d => d >= 3 ? 1 : 0,       walls: d => d >= 2 ? 2 : 0 },
};
const BOT_ORDERS = { warband: ["slayer", "none"], fortress: ["conquest", "castle"], champion: ["hunt", "herodies"], mixed: ["siege", "siege"] }; // orders v2: each build's army plan and fall-back condition
const BOT_BUILD_KEYS = ["warband", "fortress", "champion", "mixed"];
const botBuild = (slot, offset) => BOT_BUILD_KEYS[((slot || 0) + (offset || 0)) % 4]; // by seat, turned by a number fixed for the game, so every game has each build about equally often
const botArmy = (B, dayNo) => ({ waves: B.units * 2, lvl: B.units > 0 && dayNo >= 3 ? 1 : 0 }); // a warband sends more and better-trained reinforcements; the others fewer
const botItemsN = (seed, n) => { const out = []; for (let j = 0; out.length < n && j < 40; j++) { const k = BOT_ITEM_POOL[Math.floor(hash(seed, j + 1, 32) * BOT_ITEM_POOL.length)]; if (!out.includes(k)) out.push(k); } return out; };
// a tower's stage by day: an Archer Tower Lv1, Lv2 once the castle reaches the tier for it (day 3), and one of the five level 3 towers from day 5
const botTowerKey = (seed, k, dayNo, tier) => { if (dayNo < 3 || tier < TOWER_UP.tower.tier) return "tower"; if (dayNo < 5 || tier < TOWER_UP.tower2.tier) return "tower2"; const to = TOWER_UP.tower2.to; return to[Math.floor(hash(seed, k, 63) * to.length)]; };
// A bot's defences for a day, placed on the way in from the middle: a wall line across the approach with a gap in it, a trap in the gap and more just behind,
// and towers beside the castle facing out. taken: tiles already used (it adds its own). The same inputs always give the same pieces.
function botDefencePieces({ seed, build, dayNo, me, N, zone, taken, tier, lords }) { // lords: how many castles, for where the trees stand
  const B = BOT_BUILDS[build] || BOT_BUILDS.mixed, out = [], ctr = (N - 1) / 2, dy = ctr - me[0], dx = ctr - me[1], len = hyp(dx, dy) || 1, uy = dy / len, ux = dx / len, py = -ux, px = uy;
  const at = (d, o) => [Math.round(me[0] + uy * d + py * o), Math.round(me[1] + ux * d + px * o)];
  const free = ([r, c]) => zone.has(`${r},${c}`) && !taken.has(`${r},${c}`) && !(lords && treeTile(r, c, lords, N)), use = ([r, c], pc) => { taken.add(`${r},${c}`); out.push({ ...pc, r, c }); };
  const nw = B.walls(dayNo), dir = Math.abs(dy) >= Math.abs(dx) ? "h" : "v";
  [[3, -1], [3, 1], [3, -2], [3, 2]].slice(0, nw).forEach(([d, o]) => { const t = at(d, o); if (free(t)) use(t, { kind: "wall", dir }); });
  const nt = B.traps(dayNo), kinds = dayNo >= 5 ? ["spike", "bomb", "blade", "snare", "sand"] : dayNo >= 3 ? ["spike", "snare", "blade"] : ["spike", "snare"];
  [[3, 0], [2, 0], [4, 0], [2, 1], [2, -1], [4, 1]].filter(t => free(at(...t))).slice(0, nt).forEach(([d, o], k) => use(at(d, o), { kind: "trap", type: k === 0 && nw ? "spike" : kinds[Math.floor(hash(seed, k, 71 + dayNo) * kinds.length)] }));
  const nT = B.towers(dayNo);
  [[1, 1], [1, -1], [2, 2], [2, -2], [1, 2], [1, -2]].filter(t => free(at(...t))).slice(0, nT).forEach(([d, o], k) => use(at(d, o), { kind: "trap", type: "tower", tk: botTowerKey(seed, k, dayNo, tier) }));
  return out;
}
// A bot lord's castle tier by day: tier 1 for the first two days, tier 2 on day 3, and tier 3 from day 4, so it can field tier 3 soldiers (knights, snipers, siege engines) for the rest of the week.
const botTier = dayNo => dayNo >= 4 ? 3 : dayNo >= 3 ? 2 : 1;
// zones v1: each build's Front plan and flank plans (a bot's shape, below, decides where its soldiers stand and may set the flanks)
const BOT_ZONES = { warband: { front: "assault", flanks: { left: "raid", right: "raid" } }, fortress: { front: "hill", flanks: { left: "screen", right: "screen" } },
  champion: { front: "hunt", flanks: { left: "screen", right: "screen" } }, mixed: { front: "siege", flanks: { left: "screen", right: "raid" } } };
const BOT_TEMPER = { aggressive: "reckless", skirmish: "steady", cautious: "wary" };
// zones v1: how a bot shapes its army, fixed for the war by its seed, so a war mixes lords who go solid down the middle, hit both flanks,
// lean on one side, sit back, or spread evenly. jobs: where each soldier stands, in order; flanks: each flank's plan (null = the build's); waves: each wave's zone
const BOT_SHAPES = [
  { name: "spearhead", jobs: ["front", "front", "front", "front", "front"], flanks: null, waves: ["front", "front", "front"] },
  { name: "pincer", jobs: ["left", "right", "left", "right", "front"], flanks: { left: "raid", right: "raid" }, waves: ["left", "right", "front"] },
  { name: "left hook", jobs: ["left", "left", "front", "left", "front"], flanks: { left: "raid", right: "screen" }, waves: ["left", "front", "left"] },
  { name: "right hook", jobs: ["right", "right", "front", "right", "front"], flanks: { left: "screen", right: "raid" }, waves: ["right", "front", "right"] },
  { name: "turtle", jobs: ["front", "guard", "left", "right", "guard"], flanks: { left: "screen", right: "screen" }, waves: ["guard", "front", "front"] },
  { name: "balanced", jobs: ["front", "front", "left", "right", "front"], flanks: null, waves: ["front", "front", "front"] },
];
const botShape = uid => BOT_SHAPES[Math.floor(hash(botSeed(uid), 9, 57) * BOT_SHAPES.length)];
function lordBotPlan({ uid, cls, i, ids, L, zone, dayNo, lvl, v2, v3, fair, pick, ranks, sup, defV2, zv }) { // defV2: from TRAPS_V2_FROM bots buy traps, towers and walls by their build, at the cost of soldiers or items // sup: the supply rules from SUPPLY_V2_FROM (at most FIELD_MAX soldiers on the map)
  const seed = botSeed(uid), me = L.castles[i], c = CLASSES[cls] || CLASSES.warrior, sp = armySpots(me, L.N);
  const picks = {}; c.abilities.forEach((a, j) => { picks[a.key] = a.choice[hash(seed, j, 77) > .5 ? 1 : 0][0]; });
  const rot = Math.floor(hash(seed, 5, 3) * PRIORITIES.length), tier = botTier(dayNo);
  const kinds = UTYPES.filter(k => !UNITS[k].cool && (UNIT_TIER[k] || 1) <= tier);
  // soldiers: the three spots just in front of the castle first, then whatever else of the deployment field is nearest
  const taken = new Set([`${sp.champ[0]},${sp.champ[1]}`, `${me[0]},${me[1]}`]);
  const field = Array.from(zone).map(k => k.split(",").map(Number)).filter(([r, q]) => !taken.has(`${r},${q}`)).sort((a, b) => (hyp(a[0] - sp.champ[0], a[1] - sp.champ[1]) - hyp(b[0] - sp.champ[0], b[1] - sp.champ[1])) || (a[0] - b[0]) || (a[1] - b[1]));
  const spots = sp.units.filter(([r, q]) => zone.has(`${r},${q}`) && !taken.has(`${r},${q}`)).concat(field.filter(([r, q]) => !sp.units.some(([a, b]) => a === r && b === q)));
  const build = botBuild(i, botSeed(ids.join("|")) % 4), B = BOT_BUILDS[build], AR = defV2 ? botArmy(B, dayNo) : { waves: 0, lvl: 0 }, defs = defV2 ? botDefencePieces({ seed, build, dayNo, me, N: L.N, zone, taken, tier, lords: ids.length }) : []; // defences first, so soldiers stand round them
  const spotsLeft = spots.filter(([r, q]) => !taken.has(`${r},${q}`));
  const n = Math.max(1, Math.min(spotsLeft.length, 2 + dayNo + (seed % 2) + (defV2 ? B.units : 0), sup ? FIELD_MAX : 99)), ulvl = Math.min(3, 1 + Math.floor((dayNo - 1) / 2) + AR.lvl);
  const pieces = [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, ...defs];
  // siege engines are what bring castles down, so bots bring them on purpose: one from day 4, two from day 6 (they take the place of ordinary soldiers)
  const pool = ENGINES.filter(k => (UNIT_TIER[k] || 1) <= tier), engines = pool.length ? Math.min(n, dayNo >= 6 ? 2 : dayNo >= 4 ? 1 : 0) : 0; // engines follow the same tier rule as any soldier
  const BZ = zv ? BOT_ZONES[build] || BOT_ZONES.mixed : null, SH = zv ? botShape(uid) : null, used = new Set(), spotFor = k => { // zones v1: a spot in the zone this soldier is meant for (by the bot's shape), else the next free one
    const want = SH ? SH.jobs[k % SH.jobs.length] : null, i2 = spotsLeft.findIndex(([r, q], j) => !used.has(j) && (!want || zoneOfTile(me[0], me[1], r, q, L.N) === want)), j = i2 >= 0 ? i2 : spotsLeft.findIndex((_, j2) => !used.has(j2)); used.add(j); return spotsLeft[j]; };
  for (let k = 0; k < n; k++) { const at = spotFor(k); pieces.push({ kind: "unit", type: k < engines ? pool[Math.floor(hash(seed, k, 31 + dayNo) * pool.length)] : kinds[Math.floor(hash(seed, k, 11 + dayNo) * kinds.length)], lvl: ulvl, hp: 1, r: at[0], c: at[1] }); }
  if (!defV2 && dayNo >= 2 && seed % 3) { // a short barrier across the way to the middle, where it fits
    const ctr = (L.N - 1) / 2, dy = ctr - me[0], dx = ctr - me[1], len = hyp(dx, dy) || 1, r = Math.round(me[0] + dy / len * 3), q = Math.round(me[1] + dx / len * 3);
    if (zone.has(`${r},${q}`) && !pieces.some(p => p.r === r && p.c === q)) pieces.push({ kind: "wall", r, c: q, dir: Math.abs(dy) >= Math.abs(dx) ? "h" : "v" });
  }
  const near = ids.map((id, k) => ({ id, d: id === uid ? 1e9 : hyp(L.castles[k][0] - me[0], L.castles[k][1] - me[1]) })).filter(x => x.id !== uid).sort((a, b) => fair || pick ? (Math.round(a.d * 1e6) - Math.round(b.d * 1e6)) || (hash(seed, botSeed(a.id), dayNo) - hash(seed, botSeed(b.id), dayNo)) || (a.id < b.id ? -1 : 1) : (a.d - b.d) || (a.id < b.id ? -1 : 1)).map(x => x.id); // fair: equally near rivals are put in order by a draw for this bot and day, not by name
  const out = { cls, sealed: true, ...(v3 ? { ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, tree: autoTree(lvl, seed, cls, i) } : { ranks: autoRanks(lvl, seed) }), picks, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
    gear: { weapon: Math.min(2, Math.floor(dayNo / 3)), armour: Math.min(2, Math.floor((dayNo + 1) / 3)), charm: dayNo >= 5 ? 1 : 0 }, defences: { walls: dayNo >= 3 ? 1 : 0, tower: dayNo >= 5 && seed % 2 ? 1 : 0 },
    items: defV2 ? botItemsN(seed, Math.max(0, Math.min(ITEM_SLOTS, Math.floor(dayNo / 2) + B.items))) : botItems(seed).slice(0, Math.floor(dayNo / 2)), build: defV2 ? build : undefined, armyPlan: BOT_ORDERS[build][0], fallback: BOT_ORDERS[build][1], castleTier: tier, stance: BOT_STANCES[seed % BOT_STANCES.length], prio: PRIORITIES.slice(rot).concat(PRIORITIES.slice(0, rot)), rules: [{ if: IFS[0], then: THENS[0] }],
    pieces, targets: pick ? botPicks(uid, seed, near, ranks) : near, tmode: "list", heading: "near", offers: {}, replies: {}, terms: {}, bids: {}, pacts: [], hostile: [], betray: {}, bot: true, ...(v2 ? { ...botCombat(seed), waves: botWaves(seed, kinds, dayNo, sup, AR.waves, AR.lvl) } : {}),
    ...(BZ ? { front: BZ.front, flanks: { ...(SH.flanks || BZ.flanks) }, temper: BOT_TEMPER[BOT_STANCES[seed % BOT_STANCES.length]] || "steady" } : {}) };
  if (SH && out.waves) out.waves.forEach((w, k) => { w.zone = SH.waves[k] || "front"; });
  return out;
}
