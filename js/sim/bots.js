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
// What a bot owns on a given day (battles from 16 Nov 2026). A bot has no purse of its own, so its week of shopping is replayed from day 1 every time:
// it starts with the same 300 gold as any lord, and each night is paid the same base pay and castle income plus what it really earned in that day's battle
// (spoils, bounties, and catch-up gold if it is near the bottom of the board). Where there is no battle on record it gets BOT_SPOILS, about what a middling lord takes from kills,
// and buys at shop prices under the shop's own rules: beds, castle tiers, soldier tiers, three training levels, no training for powder carts.
// So a bot fields what a lord could afford that day, no more. The same seed and day always give the same purchases.
const BOT_SPOILS = [75, 160], botSpoils = d => BOT_SPOILS[Math.min(d, BOT_SPOILS.length) - 1]; // spoils after the battle of day d
// pay: what the bot really took each night so far, [after day 1, after day 2, ...] (spoils, bounties and catch-up gold from the war's own battles); a night with no record falls back to BOT_SPOILS.
function botShop(seed, dayNo, pay) {
  const o = { gold: 300, tier: 1, beds: SLOT_START, field: [], garrison: [], gear: { weapon: 0, armour: 0, charm: 0 }, defences: { walls: 0, tower: 0 }, items: [], wall: false }, wish = botItems(seed).sort((a, b) => itemCost(a) - itemCost(b)); // cheapest item first
  let k = 0; const roll = () => hash(seed, k++, 53), buy = c => o.gold >= c && (o.gold -= c, true), all = () => o.field.concat(o.garrison);
  for (let d = 1; d <= dayNo; d++) {
    if (d > 1) o.gold += baseIncome(d - 1) + CASTLE_INCOME[o.tier - 1] + (pay && pay[d - 2] != null ? pay[d - 2] : botSpoils(d - 1));
    const kinds = UTYPES.filter(t => (UNIT_TIER[t] || 1) <= o.tier), pool = ENGINES.filter(t => (UNIT_TIER[t] || 1) <= o.tier), wantEng = pool.length ? (d >= 6 ? 2 : d >= 4 ? 1 : 0) : 0;
    // gold it is saving: a castle tier that is due, or a siege engine it has room and the castle for, comes before the smaller purchases
    const engDue = () => all().filter(u => UNITS[u.type].engine).length < wantEng && (o.field.length < o.beds || o.garrison.length < GARRISON_SOLDIERS);
    const keep = () => o.tier < 3 && d > o.tier ? CASTLE_TIERS[o.tier].cost : engDue() ? Math.min(...pool.map(t => UNITS[t].cost)) : 0, spare = c => o.gold - c >= keep() && buy(c);
    const soldier = pay => { const t = kinds[Math.floor(roll() * kinds.length)]; return pay(UNITS[t].cost) ? { type: t, lvl: 1 } : null; };
    const steps = [
      () => { let did = false; while (o.field.length < o.beds) { const u = soldier(o.field.length < SLOT_START ? buy : spare); if (!u) break; o.field.push(u); did = true; } return did; }, // fill the field first
      () => o.tier < 3 && d > o.tier && buy(CASTLE_TIERS[o.tier].cost) && (o.tier++, true), // a Fortress from day 2, a Citadel from day 3
      () => { if (!engDue()) return false; const t = pool[Math.floor(roll() * pool.length)]; if (!buy(UNITS[t].cost)) return false; // siege engines are what bring castles down, so bots buy them on purpose: one from day 4, two from day 6
        if (o.field.length >= o.beds) o.garrison.push(o.field.splice(o.field.findIndex(u => !UNITS[u.type].engine), 1)[0]); // an engine always takes the field; a soldier steps back into the garrison for it
        o.field.unshift({ type: t, lvl: 1 }); return true; },
      () => o.beds < SLOT_MAX && o.field.length >= o.beds && spare(slotCost(o.beds)) && (o.beds++, true),
      () => { const g = ["weapon", "armour", "charm"][Math.floor(roll() * 3)], v = o.gear[g]; return v < 3 && UPGRADE_NEEDS[g][v] <= o.tier && spare(GEAR[g][v].cost) && (o.gear[g]++, true); },
      () => { const it = wish.find(x => !o.items.includes(x)); return d >= 2 && !!it && o.items.length < ITEM_SLOTS && spare(itemCost(it)) && (o.items.push(it), true); },
      () => { const u = all().filter(x => x.lvl < 3 && !UNITS[x.type].noUpgrade).sort((x, y) => x.lvl - y.lvl)[0]; return !!u && spare(Math.round(UNITS[u.type].cost * .5 * u.lvl)) && (u.lvl++, true); },
      () => { if (d < 2 || o.garrison.length >= GARRISON_SOLDIERS) return false; const u = soldier(spare); return !!u && (o.garrison.push(u), true); },
      () => { const g = roll() < .6 ? "walls" : "tower", v = o.defences[g]; return d >= 3 && v < 2 && UPGRADE_NEEDS[g][v] <= o.tier && spare(DEFENCES[g][v].cost) && (o.defences[g]++, true); },
      () => d >= 2 && seed % 3 && !o.wall && spare(WALL_COST) && (o.wall = true),
    ];
    for (let round = 0, did = true; did && round < 40; round++) { did = false; steps.forEach(f => { if (f()) did = true; }); }
  }
  return o;
}
// the garrison goes out in the bot's three waves, filled wave by wave
const botWaves = (seed, garrison) => { const st = BOT_STYLES[(seed >> 1) % BOT_STYLES.length].name;
  return BOT_WAVES[st].map(([when, at, order], i) => ({ when, at: at || 60, order, units: garrison.slice(i * WAVE_SLOTS, (i + 1) * WAVE_SLOTS).map(u => ({ type: u.type, lvl: u.lvl, id: null, hp: 1 })) })); };
const botCombat = seed => { const st = BOT_STYLES[(seed >> 1) % BOT_STYLES.length]; return { gprio: cleanGprio(st.gprio), engage: 2 + (seed >> 3) % 3, heading: st.heading }; };

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
function lordBotPlan({ uid, cls, i, ids, L, zone, dayNo, lvl, v2, v3, fair, pick, ranks, pay }) {
  const seed = botSeed(uid), me = L.castles[i], c = CLASSES[cls] || CLASSES.warrior, sp = armySpots(me, L.N);
  const picks = {}; c.abilities.forEach((a, j) => { picks[a.key] = a.choice[hash(seed, j, 77) > .5 ? 1 : 0][0]; });
  const rot = Math.floor(hash(seed, 5, 3) * PRIORITIES.length), shop = botShop(seed, dayNo, pay), tier = shop.tier;
  // soldiers: the three spots just in front of the castle first, then whatever else of the deployment field is nearest
  const taken = new Set([`${sp.champ[0]},${sp.champ[1]}`, `${me[0]},${me[1]}`]);
  const field = Array.from(zone).map(k => k.split(",").map(Number)).filter(([r, q]) => !taken.has(`${r},${q}`)).sort((a, b) => (hyp(a[0] - sp.champ[0], a[1] - sp.champ[1]) - hyp(b[0] - sp.champ[0], b[1] - sp.champ[1])) || (a[0] - b[0]) || (a[1] - b[1]));
  const spots = sp.units.filter(([r, q]) => zone.has(`${r},${q}`) && !taken.has(`${r},${q}`)).concat(field.filter(([r, q]) => !sp.units.some(([a, b]) => a === r && b === q)));
  const pieces = [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }];
  shop.field.slice(0, spots.length).forEach((u, k) => pieces.push({ kind: "unit", type: u.type, lvl: u.lvl, hp: 1, r: spots[k][0], c: spots[k][1] }));
  if (shop.wall) { // a short barrier across the way to the middle, where it fits
    const ctr = (L.N - 1) / 2, dy = ctr - me[0], dx = ctr - me[1], len = hyp(dx, dy) || 1, r = Math.round(me[0] + dy / len * 3), q = Math.round(me[1] + dx / len * 3);
    if (zone.has(`${r},${q}`) && !pieces.some(p => p.r === r && p.c === q)) pieces.push({ kind: "wall", r, c: q, dir: Math.abs(dy) >= Math.abs(dx) ? "h" : "v" });
  }
  const near = ids.map((id, k) => ({ id, d: id === uid ? 1e9 : hyp(L.castles[k][0] - me[0], L.castles[k][1] - me[1]) })).filter(x => x.id !== uid).sort((a, b) => fair || pick ? (Math.round(a.d * 1e6) - Math.round(b.d * 1e6)) || (hash(seed, botSeed(a.id), dayNo) - hash(seed, botSeed(b.id), dayNo)) || (a.id < b.id ? -1 : 1) : (a.d - b.d) || (a.id < b.id ? -1 : 1)).map(x => x.id); // fair: equally near rivals are put in order by a draw for this bot and day, not by name
  return { cls, sealed: true, ...(v3 ? { ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, tree: autoTree(lvl, seed, cls) } : { ranks: autoRanks(lvl, seed) }), picks, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
    gear: shop.gear, defences: shop.defences, items: shop.items, castleTier: tier, stance: BOT_STANCES[seed % BOT_STANCES.length], prio: PRIORITIES.slice(rot).concat(PRIORITIES.slice(0, rot)), rules: [{ if: IFS[0], then: THENS[0] }],
    pieces, targets: pick ? botPicks(uid, seed, near, ranks) : near, tmode: "list", heading: "near", offers: {}, replies: {}, terms: {}, bids: {}, pacts: [], hostile: [], betray: {}, bot: true, ...(v2 ? { ...botCombat(seed), waves: botWaves(seed, shop.garrison) } : {}) };
}
