// Pick your targets (PICK_V1, from 16 Nov 2026): lords pick one to three targets a day; bots pick by their style from the board.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim, WORLD_FILES } from "../tools/load-sim.mjs";

const sim = loadSim({ extraFiles: [...WORLD_FILES] }), J = v => JSON.parse(JSON.stringify(v));

test("pick your targets applies to battles from 16 Nov 2026; earlier battles replay as fought", () => {
  assert.equal(sim.run(`pickV1For("2026-11-15")`), false);
  assert.equal(sim.run(`pickV1For("2026-11-16")`), true);
});

test("bots pick at most three rivals, never themselves, and the same inputs give the same picks", () => {
  const ids = [...Array(10)].map((_, i) => "bot_" + i), ranks = Object.fromEntries(ids.map((id, i) => [id, i + 1]));
  for (const uid of ids) {
    const near = ids.filter(x => x !== uid), seed = sim.run(`botSeed(${JSON.stringify(uid)})`);
    const a = J(sim.run(`botPicks(${JSON.stringify(uid)}, ${seed}, ${JSON.stringify(near)}, ${JSON.stringify(ranks)})`));
    assert.ok(a.length >= 1 && a.length <= 3 && !a.includes(uid) && new Set(a).size === a.length, uid + ": " + a);
    assert.deepEqual(a, J(sim.run(`botPicks(${JSON.stringify(uid)}, ${seed}, ${JSON.stringify(near)}, ${JSON.stringify(ranks)})`)));
    if (uid !== "bot_0") assert.ok(a.some(q => ranks[q] < ranks[uid]), uid + " goes after someone above it");
  }
  assert.deepEqual(J(sim.run(`botPicks("bot_3", botSeed("bot_3"), ["bot_2", "bot_4", "bot_1"], {})`)).slice(0, 2), ["bot_2", "bot_4"], "day 1: the nearest");
});

test("a seven-day war of bots under the experiment plays out and stays deterministic", () => {
  sim.run('PICK_V1_FROM = "2000-01-01"');
  try {
    const D1 = "2026-11-16", mk = () => { const W = { config: { tz: "UTC", lockHour: 20, startDate: D1, maxPlayers: 6 }, players: {}, battles: {} };
      for (let i = 0; i < 6; i++) W.players["bot_" + i] = { bot: true, fromWeek: "0000-00-00", joinedAt: i + 1, nick: "B" + i, real: "Bot", pending: false, state: { week: D1, cls: "warrior" } }; return W; };
    const fight = sim.get("fightDay"), add = sim.get("addDays"), run = () => { const W = mk(); for (let d = 0; d < 3; d++) { const k = add(D1, d); W.battles[k] = J(fight(W, k, d)); } return W.battles; };
    const a = run(), b = run();
    assert.deepEqual(Object.values(a).map(x => x.resultHash), Object.values(b).map(x => x.resultHash));
    Object.values(a).forEach(x => { assert.equal(x.inputs.pickV1, true); x.inputs.plans.forEach(p => assert.ok(p.targets.length <= 3)); });
  } finally { sim.run('PICK_V1_FROM = "2026-11-16"'); }
});

test("general roles can be picked: they reach the battle, and a battle with them is deterministic", () => {
  const roles = Object.keys(sim.get("PICK_ROLES"));
  assert.deepEqual(roles.sort(), ["@above", "@leader", "@neararmy", "@nearcastle", "@weakcastle"]);
  const fight = () => sim.run(`(() => { const L = seatLayout(6), ps = L.castles.map((pos, i) => { const sp = armySpots(pos, L.N); return { pid: "s" + i, name: "S" + i, color: SEAT_COLORS[i], cls: "warrior", level: 3, castle: pos, rank: i + 1, ranks: autoRanks(3, i + 1), picks: {}, triggers: {}, gear: {}, defences: {}, stance: "aggressive", prio: PRIORITIES.slice(), rules: [],
      pieces: [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, { kind: "unit", type: "footman", lvl: 1, hp: 1, r: sp.units[0][0], c: sp.units[0][1] }], targets: [${JSON.stringify(roles)}[i % 5], "s" + ((i + 2) % 6)], pacts: [], hostile: [], betray: {} }; });
    return runBattle(ps, 4242, { fast: true, N: L.N, balV2: true, balV3: true, dayNo: 3, pickV1: true }); })()`);
  const a = J(fight().results), b = J(fight().results);
  assert.deepEqual(a, b); assert.equal(a.length, 6);
});

test("balance V4: magic beats blades and arrows against fortified armour, and destructive skills reach castles", () => {
  assert.ok(sim.get("MAGIC_VS_FORT") > sim.get("TYPE_TABLE").blade.fortified && sim.get("MAGIC_VS_FORT") > sim.get("TYPE_TABLE").pierce.fortified);
  const fights = v4 => { let fell = 0; for (let i = 0; i < 6; i++) { const L = sim.run("seatLayout(6)"), r = sim.run(`(() => { const L = seatLayout(6); const ps = L.castles.map((pos, k) => { const sp = armySpots(pos, L.N); return { pid: "s" + k, name: "S" + k, color: SEAT_COLORS[k], cls: ["mage", "archer", "shaman", "warrior", "mage", "archer"][k], level: 10, castle: pos, ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, tree: autoTree(10, k + ${i} * 7, ["mage", "archer", "shaman", "warrior", "mage", "archer"][k]), picks: {}, triggers: {}, gear: {}, defences: {}, stance: "aggressive", prio: PRIORITIES.slice(), rules: [], pieces: [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, { kind: "unit", type: "footman", lvl: 2, hp: 1, r: sp.units[0][0], c: sp.units[0][1] }], targets: [], pacts: [], hostile: [], betray: {} }; });
      return runBattle(ps, ${100 + i}, { fast: true, N: L.N, balV2: true, balV3: true, heroV3: true, fairV1: true, pickV1: true, balV4: ${v4}, dayNo: 4 }); })()`); fell += r.results.filter(x => x.fellAt != null).length; void L; } return fell; };
  assert.ok(fights(true) >= fights(false), "castles fall at least as often under V4");
});

test("balance V4: stat items also equip the army", () => {
  sim.run(`globalThis.armyFight = (items, v4, seed) => { const L = seatLayout(4), ps = L.castles.map((pos, k) => { const sp = armySpots(pos, L.N); return { pid: "s" + k, name: "S" + k, color: SEAT_COLORS[k], cls: "warrior", level: 3, castle: pos, ranks: autoRanks(3, k + 1), picks: {}, triggers: {}, gear: {}, defences: {}, stance: "aggressive", prio: PRIORITIES.slice(), rules: [], items: k === 0 ? items : [],
    pieces: [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, ...sp.units.map(([r, c]) => ({ kind: "unit", type: "footman", lvl: 1, hp: 1, r, c }))], targets: [], pacts: [], hostile: [], betray: {} }; });
    return runBattle(ps, seed, { fast: true, N: L.N, balV2: true, balV3: true, heroV3: true, fairV1: true, balV4: v4, dayNo: 3 }); }`);
  const dealt = (items, v4) => { let n = 0; for (let seed = 1; seed <= 8; seed++) J(sim.run(`armyFight(${JSON.stringify(items)}, ${v4}, ${seed})`).tel.ents).filter(e => e.kind === "unit" && e.pid === "s0").forEach(e => { n += e.dealt || 0; }); return n; };
  const kit = ["gauntlets", "daedalus", "whetstone"];
  assert.ok(dealt(kit, true) > dealt([], true), "with V4, items make the lord's soldiers hit harder");
  assert.ok(sim.get("ARMY_SHARE") > 0 && sim.get("ITEM_STATS").gauntlets.atk > 0);
});
