// Pick your targets (PICK_V1, an experiment): lords pick one to three targets a day; bots pick by their style from the board.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim, WORLD_FILES } from "../tools/load-sim.mjs";

const sim = loadSim({ extraFiles: [...WORLD_FILES] }), J = v => JSON.parse(JSON.stringify(v));

test("the experiment is off for real wars until a start date is set", () => {
  assert.equal(sim.run(`pickV1For("2026-12-01")`), false);
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
  } finally { sim.run('PICK_V1_FROM = "2099-01-01"'); }
});
