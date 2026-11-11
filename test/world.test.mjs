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

// ----- bot lords -----
function botWorld(humans, bots, maxPlayers = 8) {
  const W = { config: { tz: "UTC", lockHour: 20, startDate: D1, maxPlayers }, players: {}, battles: {} };
  for (let i = 0; i < humans; i++) W.players["h" + i] = { fromWeek: "0000-00-00", joinedAt: 10 + i, nick: "Human " + i, real: "", state: { week: D1, cls: "warrior", banner: { c1: sim.get("SEAT_COLORS")[i] } }, plans: {} };
  for (let i = 1; i <= bots; i++) W.players["bot_" + i] = { fromWeek: "0000-00-00", joinedAt: 1, bot: true, nick: "Bot " + i, real: "Bot", state: { cls: ["mage", "rogue", "archer", "shaman"][i % 4], banner: { c1: sim.get("SEAT_COLORS")[humans + i - 1] } }, plans: {} };
  return W;
}

test("a bot fights with orders of its own, with nothing saved for it, and they grow through the week", () => {
  const W = botWorld(1, 3), day1 = buildBattleInputs(W, D1).plans, bot = day1.find(p => p.pid === "bot_1");
  assert.ok(!bot.noOrders, "a bot's orders are its own, not stand-ins");
  assert.ok(bot.pieces.filter(p => p.kind === "unit").length >= 3 && bot.pieces.some(p => p.kind === "champ"));
  const later = buildBattleInputs(W, addDays(D1, 4)).plans.find(p => p.pid === "bot_1");
  assert.ok(later.pieces.filter(p => p.kind === "unit").length > bot.pieces.filter(p => p.kind === "unit").length);
  assert.ok(later.castleTier >= bot.castleTier);
  assert.ok(bot.targets.every(t => t !== "bot_1") && bot.targets.length === 3);
});

test("a battle with bots is the same every time, and every piece sits on its own deployment tile", () => {
  const W = botWorld(1, 5), a = fightDay(W, D1, 1), b = fightDay(JSON.parse(JSON.stringify(W)), D1, 1);
  assert.equal(a.resultHash, b.resultHash); assert.equal(a.results.length, 6);
  const { plans, N } = buildBattleInputs(W, D1), L = sim.run(`seatLayout(${plans.length})`);
  plans.forEach((p, i) => { const z = sim.run(`zoneFor(${JSON.stringify(L.castles[i])}, ${N}, ${JSON.stringify(L.castles)})`), seen = new Set();
    p.pieces.forEach(pc => { const k = pc.r + "," + pc.c; assert.ok(z.has(k), p.pid + " piece off its field " + k); assert.ok(!seen.has(k), p.pid + " has two pieces on " + k); seen.add(k); }); });
  let day = D1; for (let d = 2; d <= 7; d++) { W.battles[day] = fightDay(W, day, d); day = addDays(day, 1); } // a full week plays through
  assert.equal(Object.keys(W.battles).length, 6);
});

test("people take seats before bots: when the war is full the last bots give way", () => {
  const W = botWorld(3, 5, 6), ids6 = buildBattleInputs(W, D1).plans.map(p => p.pid);
  assert.deepEqual(J(ids6), J(["h0", "h1", "h2", "bot_1", "bot_2", "bot_3"]));
  W.players.h3 = { ...W.players.h0, joinedAt: 99 }; // a fourth person registers late
  assert.deepEqual(J(buildBattleInputs(W, D1).plans.map(p => p.pid)), J(["h0", "h1", "h2", "h3", "bot_1", "bot_2"]));
});
