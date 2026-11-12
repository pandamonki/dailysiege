// js/net/world.js: from a game's saved data to a battle, with nothing read from the page.
// (The seven-day war in emulator-tests/war.spec.mjs exercises it end to end; these are the quick checks.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim, WORLD_FILES } from "../tools/load-sim.mjs";

const sim = loadSim({ extraFiles: [...WORLD_FILES, "js/dev/goldenCases.js"] });
const { fightDay, buildBattleInputs, addDays } = { fightDay: sim.get("fightDay"), buildBattleInputs: sim.get("buildBattleInputs"), addDays: sim.get("addDays") };
const J = v => JSON.parse(JSON.stringify(v)); // values made inside the sim's own context: copy before comparing
const D1 = "2026-11-16", ids = ["a", "b", "c", "d"];
// These scenarios were written for the old hero abilities (their seeds pick fights between old-style heroes), so the file pins the
// switch-over date out of reach. The skill-tree rules have their own tests: test/heroTrees.test.mjs and the last test here.
sim.run('HERO_V3_FROM = "2099-01-01"');

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

test("until 12 Nov 2026 only sealed orders are fought; a lord with none gets marked stand-in orders with their chosen hero", () => {
  const OLD = "2026-11-02", W = world(["a", "b"]); W.config.startDate = OLD; ids.forEach(id => { W.players[id].state.week = OLD; W.players[id].plans = Object.fromEntries(Object.entries(W.players[id].plans).map(([, v]) => [OLD, v])); });
  W.players.c.plans[OLD] = { ...world(ids).players.c.plans[D1], sealed: false }; // c drafted but did not seal
  const { plans } = buildBattleInputs(W, OLD);
  assert.deepEqual(J(plans.map(p => !!p.noOrders)), J([false, false, true, true]));
  assert.equal(plans[3].cls, "rogue"); assert.deepEqual(J(plans[3].pieces.map(p => p.kind)), J(["champ"]));
});

test("from 12 Nov 2026 the lock seals the latest orders: a lord who drafted but did not seal is fought on the draft", () => {
  const W = world(["a", "b"]); W.players.c.plans[D1] = { ...world(ids).players.c.plans[D1], sealed: false };
  const { plans } = buildBattleInputs(W, D1);
  assert.deepEqual(J(plans.map(p => !!p.noOrders)), J([false, false, false, true])); // d never saved anything
  assert.ok(plans[2].pieces.length > 1, "c's drafted army stands");
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

// ----- fairer endings, longer pacts, late-week stakes (battles from 12 Nov 2026) -----
const lone = (W, day) => fightDay(W, day, 1); // lords with no orders: every castle is left to burn, so they fall on the same tick
test("castles that fall together are ranked by something fair, not by who registered last", () => {
  const W = world([]), winners = new Set(); // nobody sealed: four lone heroes, castles all falling on the burn
  for (let k = 0; k < 6; k++) winners.add(lone(W, addDays(D1, k)).results[0].pid);
  assert.ok(winners.size >= 2, "the winner is not always the same seat: " + [...winners]);
  assert.ok(!(winners.size === 1 && winners.has("d")), "the last to register no longer takes every tie");
});

test("pacts last until a betrayal or a break ends them, even when a castle fell", () => {
  const W = world(ids); const offer = { a: { b: { gold: 0, day: addDays(D1, -1) } }, b: { a: { gold: 0, day: addDays(D1, -1) } } }; // a and b invite each other: they ally for free
  W.players.a.plans[D1].offers = offer.a; W.players.b.plans[D1].offers = offer.b;
  const doc = fightDay(W, D1, 1); assert.deepEqual(J(doc.pairs), J(["a|b"]));
  assert.ok(doc.pairsEnd.includes("a|b"), "the pact is carried on whatever happened to the castles");
});

test("a pact group holds at most three lords", () => {
  const W = world(ids), p = id => W.players[id].plans[D1], day = addDays(D1, -1), inv = () => ({ gold: 0, day });
  p("a").offers = { b: inv(), c: inv(), d: inv() }; p("b").offers = { a: inv(), c: inv(), d: inv() }; p("c").offers = { a: inv(), b: inv(), d: inv() }; p("d").offers = { a: inv(), b: inv(), c: inv() };
  const { pairs } = buildBattleInputs(W, D1);
  const grp = new Set(); pairs.forEach(([x, y]) => { grp.add(x); grp.add(y); });
  assert.ok(grp.size <= 3, "no bloc of four: " + J(pairs));
});

test("the last days of the week score more", () => {
  const W = world(ids), at = k => fightDay(W, addDays(D1, k), 1), pts = d => d.results.reduce((n, r) => n + r.points, 0);
  const d1 = at(0), d7 = at(6);
  assert.ok(pts(d7) > pts(d1) * 1.5, `day 7 (${pts(d7)}) is worth about twice day 1 (${pts(d1)})`);
});

test("a betrayer who sets off the bomb is paid: points and a share of the victim's spoils", () => {
  const run = balV2 => { const b = buildBattleInputs(world(ids), D1), [a, c] = b.plans; a.pacts = [c.pid]; c.pacts = [a.pid]; a.betray = { [c.pid]: "At the 2-minute mark" };
    return sim.get("runBattle")(b.plans, 154, { fast: true, N: b.N, balV2, dayNo: 1 }); }; // seed 154: a's hero reaches b's keep and the bomb goes off
  const on = run(true), off = run(false), r = on.results.find(x => x.pid === "a"), r0 = off.results.find(x => x.pid === "a");
  assert.equal(r.treachery, 1, "the bomb went off and was counted");
  assert.ok(!off.results.some(x => x.treachery), "the old rules pay nothing");
  assert.ok(on.feudsNew.includes("a|b") && r.points >= 3, "the feud remains the price, the prize is at least 3 points");
  assert.ok(r.gold > r0.gold, `a keeps a share of b's spoils (${r.gold} against ${r0.gold})`);
});

// ----- sealed orders stay in effect until new ones are sealed -----
test("a lord who sealed, then reopened the orders and wrecked their army, is fought on what they sealed", () => {
  const W = world(ids), mine = W.players.a.plans[D1], sealedCopy = J(mine);
  W.players.a.plans[D1] = { ...mine, sealed: false, pieces: [], gear: {}, sealedPlan: sealedCopy }; // unsealed, army deleted, forgot to reseal
  const a = buildBattleInputs(W, D1).plans.find(p => p.pid === "a");
  assert.ok(!a.noOrders); assert.deepEqual(J(a.pieces.filter(p => p.kind !== "champ").length > 0), true, "the sealed army stands");
  assert.deepEqual(J(a.gear), J(sealedCopy.gear));
});

test("once they seal again, the new orders replace the old", () => {
  const W = world(ids), sealedCopy = J(W.players.a.plans[D1]);
  W.players.a.plans[D1] = { ...W.players.a.plans[D1], stance: "cautious", sealed: true, sealedPlan: undefined };
  assert.equal(buildBattleInputs(W, D1).plans.find(p => p.pid === "a").stance, "cautious"); assert.notEqual(sealedCopy.stance, "cautious");
});

test("yesterday's sealed orders beat today's unsealed draft; a lord who never sealed is fought on their draft", () => {
  const W = world(ids); W.battles[D1] = fightDay(W, D1, 1); const D2 = addDays(D1, 1);
  W.players.a.plans[D2] = { ...W.players.a.plans[D1], sealed: false, pieces: [], stance: "cautious" }; // a drafted a wrecked day 2 and did not seal
  const plans = buildBattleInputs(W, D2).plans;
  assert.ok(plans.find(p => p.pid === "a").pieces.length > 1 && plans.find(p => p.pid === "a").stance !== "cautious", "day 1's sealed orders are still in effect");
  const W2 = world([]); W2.players.b.plans[D1] = { ...world(ids).players.b.plans[D1], sealed: false };
  assert.ok(buildBattleInputs(W2, D1).plans.find(p => p.pid === "b").pieces.length > 1, "never sealed: the draft is used");
});

// ----- armies fight on after their castle falls (battles from 12 Nov 2026) -----
test("a lord whose castle has fallen keeps fighting with what is left, and cannot respawn or fall back", () => {
  // castles no longer burn down on their own, so look through the golden battles for one where a castle falls with an army still standing
  const fight = (c, balV2) => sim.get("runBattle")(J(c.plans), c.seed, { ...J(c.opts), balV2, balV3: balV2, dayNo: 1 });
  const attacksAfterFall = r => { let n = 0; r.results.filter(x => x.fellAt != null).forEach(x => r.events.forEach(e => { if (e.ty === "atk" && e.t > x.fellAt + .5 && r.meta[e.id] && r.meta[e.id].pid === x.pid) n++; })); return n; };
  let found = null; for (let i = 0; i < 40 && !found; i++) { const c = sim.run(`goldenCase(${i})`), on = fight(c, true); if (attacksAfterFall(on) > 0) found = { on, c }; }
  assert.ok(found, "in some fight an orphaned army still attacks after its castle fell");
  const { on, c } = found, off = fight(c, false), fell = on.results.filter(r => r.fellAt != null);
  assert.equal(on.logs.filter(l => /fights on without a castle/.test(l.msg)).length, fell.length);
  assert.equal(off.logs.filter(l => /fights on without a castle/.test(l.msg)).length, 0);
  assert.equal(attacksAfterFall(off), 0, "under the old rules an army ends with its castle");
  assert.ok(!on.events.some(e => e.ty === "respawn" && on.results.some(r => r.pid === e.pid && r.fellAt != null && e.t0 >= r.fellAt)), "no hero respawns after its castle fell");
});

test("from HERO_V3_FROM the day is fought with skill trees: plans carry the tree, and the saved inputs say so", () => {
  sim.run('HERO_V3_FROM = "2026-11-12"');
  try {
    const W = world(ids); ids.forEach((id, i) => { W.players[id].plans[D1].tree = J(sim.run(`autoTree(7, ${i + 3}, "rogue")`)); });
    const doc = fightDay(W, D1, 1), again = fightDay(J(W), D1, 1);
    assert.equal(doc.inputs.heroV3, true); assert.equal(doc.resultHash, again.resultHash);
    assert.ok(doc.inputs.plans.every(p => p.tree && p.tree.b1.length === 6), "every plan carries a six-node tree for each of three trees");
    assert.equal(doc.results.length, 4);
  } finally { sim.run('HERO_V3_FROM = "2099-01-01"'); }
});
