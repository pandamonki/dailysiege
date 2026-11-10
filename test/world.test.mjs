// js/net/world.js: from a game's saved data to a battle, with nothing read from the page.
// (The seven-day war in emulator-tests/war.spec.mjs exercises it end to end; these are the quick checks.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim, WORLD_FILES } from "../tools/load-sim.mjs";

const sim = loadSim({ extraFiles: [...WORLD_FILES, "js/dev/goldenCases.js"] });
const { fightDay, buildBattleInputs, addDays } = { fightDay: sim.get("fightDay"), buildBattleInputs: sim.get("buildBattleInputs"), addDays: sim.get("addDays") };
const J = v => JSON.parse(JSON.stringify(v)); // values made inside the sim's own context: copy before comparing
const D1 = "2026-11-16", ids = ["a", "b", "c", "d"];

function world(sealedBy) { // four lords; orders for day 1 from a golden battle with four lords
  const g = sim.run("goldenCase(2)").plans, W = { config: { tz: "UTC", lockHour: 20, startDate: D1, maxPlayers: 8 }, players: {}, battles: {} };
  ids.forEach((id, i) => { const p = g[i];
    W.players[id] = { fromWeek: "0000-00-00", joinedAt: i + 1, nick: "Lord " + id, real: "", state: { week: D1, cls: "rogue", banner: { c1: sim.get("SEAT_COLORS")[i] } },
      plans: sealedBy.includes(id) ? { [D1]: JSON.parse(JSON.stringify({ cls: p.cls, ranks: p.ranks, picks: p.picks, triggers: p.triggers, gear: p.gear, defences: p.defences, stance: p.stance, prio: p.prio, rules: p.rules, pieces: p.pieces, items: [], targets: ids.filter(x => x !== id), sealed: true })) } : {} }; });
  return W;
}

test("the same saved game always gives the same battle, and fighting does not alter the saved orders", () => {
  const W = world(ids), before = JSON.stringify(W);
  const a = fightDay(W, D1, 1), b = fightDay(JSON.parse(before), D1, 1);
  assert.equal(JSON.stringify(W), before);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.match(a.resultHash, /^[0-9a-f]{16}$/);
  assert.equal(a.day, 1); assert.equal(a.week, D1); assert.equal(a.results.length, 4);
});

test("only sealed orders are fought; a lord with none gets marked stand-in orders with their chosen hero", () => {
  const W = world(["a", "b"]); W.players.c.plans[D1] = { ...world(ids).players.c.plans[D1], sealed: false }; // c drafted but did not seal
  const { plans } = buildBattleInputs(W, D1);
  assert.deepEqual(J(plans.map(p => !!p.noOrders)), J([false, false, true, true]));
  assert.equal(plans[3].cls, "rogue"); assert.deepEqual(J(plans[3].pieces.map(p => p.kind)), J(["champ"]));
});

test("yesterday's sealed orders carry forward, and the standings going in are recorded for the bounty", () => {
  const W = world(ids); W.battles[D1] = fightDay(W, D1, 1);
  const D2 = addDays(D1, 1), doc = fightDay(W, D2, 2); // nobody sealed on day 2
  assert.equal(doc.day, 2);
  assert.ok(doc.inputs.plans.every(p => !p.noOrders));
  assert.deepEqual(J(doc.inputs.plans[0].gear), J(W.players.a.plans[D1].gear));
  assert.deepEqual(J(Object.keys(doc.inputs.ranks).sort()), J(ids));
  assert.ok(doc.inputs.plans[0].level > 1, "heroes carry their levels into day 2");
});

test("lords who have left, are unregistered, or are beyond the seat limit do not fight", () => {
  const W = world(ids); W.players.b.left = true; W.players.c.pending = true;
  assert.deepEqual(J(buildBattleInputs(W, D1).plans.map(p => p.pid)), J(["a", "d"]));
  const W2 = world(ids); W2.config.maxPlayers = 3;
  assert.deepEqual(J(buildBattleInputs(W2, D1).plans.map(p => p.pid)), J(["a", "b", "c"]));
});
