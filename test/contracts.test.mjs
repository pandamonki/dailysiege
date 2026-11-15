// Daily twists and contracts (js/config/contracts.js), and how js/net/world.js pays them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim, WORLD_FILES } from "../tools/load-sim.mjs";

const sim = loadSim({ extraFiles: [...WORLD_FILES, "js/dev/goldenCases.js"] });
const J = v => JSON.parse(JSON.stringify(v));
const D1 = "2026-11-23"; // a Monday after CONTRACTS_FROM

sim.context.__D1 = D1;
const war = () => sim.run(`(() => { const W = { config: { tz: "UTC", lockHour: 20, startDate: __D1, maxPlayers: 12 }, players: {}, battles: {} };
  for (let i = 0; i < 6; i++) W.players["b" + i] = { bot: true, fromWeek: "0000-00-00", joinedAt: i + 1, nick: "B" + i, state: { week: __D1, cls: ["warrior", "rogue", "mage"][i % 3], banner: { c1: SEAT_COLORS[i] } }, plans: {} };
  return W; })()`);

test("a week has no twist on day 1 and six different twists on days 2 to 7, the same on every device", () => {
  const tw = J(sim.run(`[1,2,3,4,5,6,7].map(d => dayTwist("${D1}", d))`));
  assert.equal(tw[0], null);
  const rest = tw.slice(1); assert.equal(new Set(rest).size, 6);
  rest.forEach(t => assert.ok(sim.get("TWISTS")[t], t));
  assert.deepEqual(J(sim.run(`[1,2,3,4,5,6,7].map(d => dayTwist("${D1}", d))`)), tw);
  assert.notDeepEqual(J(sim.run(`[2,3,4,5,6,7].map(d => dayTwist("2026-11-30", d))`)), rest, "another week draws another order");
});

test("battles before CONTRACTS_FROM carry no twist and pay no contracts", () => {
  const W = war(); sim.context.__W = W; W.config.startDate = "2026-11-16"; Object.values(W.players).forEach(p => { p.state.week = "2026-11-16"; });
  W.battles["2026-11-16"] = sim.run(`fightDay(__W, "2026-11-16", 1)`);
  const doc = J(sim.run(`fightDay(__W, "2026-11-17", 1)`)); // on or after CONTRACTS_FROM: pin it later to check the gate
  assert.ok(doc.contracts, "the 17th is a contract day");
  sim.run(`CONTRACTS_FROM = "2026-11-18"`); const old = J(sim.run(`fightDay(__W, "2026-11-17", 1)`)); sim.run(`CONTRACTS_FROM = "2026-11-16"`);
  assert.equal(old.inputs.twist, undefined); assert.equal(old.contracts, undefined);
});

test("every lord is offered three contracts (easy, hard, rival) and bots take one; payouts are added to points and gold", () => {
  const W = war(); sim.context.__W = W;
  let doc = sim.run(`fightDay(__W, __D1, 1)`); W.battles[D1] = doc;
  const D2 = sim.run(`addDays(__D1, 1)`); sim.context.__D2 = D2;
  const offers = J(sim.run(`wContractOffers(__W, __D2, "b0")`));
  assert.equal(offers.length, 3);
  const tiers = offers.map(k => sim.run(`contractParse(${JSON.stringify(k)}).c.tier`));
  assert.deepEqual(tiers, [1, 2, 3]);
  const tgt = offers[2].split("@")[1]; assert.ok(tgt && tgt !== "b0" && W.players[tgt], "the rival contract names another lord");
  doc = J(sim.run(`fightDay(__W, __D2, 2)`));
  assert.ok(doc.twist, "day 2 has a twist"); assert.equal(doc.inputs.twist, doc.twist);
  assert.equal(Object.keys(doc.contracts).length, 6, "every bot took a contract");
  Object.entries(doc.contracts).forEach(([pid, c]) => {
    assert.ok(doc.offers[pid].includes(c.key));
    const pay = sim.get("CONTRACT_PAY")[sim.run(`contractParse(${JSON.stringify(c.key)}).c.tier`)];
    if (c.ok) { assert.equal(c.pts, pay.pts * (doc.twist === "glory" ? 2 : 1)); assert.equal(c.gold, pay.gold * (doc.twist === "goldrush" ? 2 : 1)); } else { assert.equal(c.pts, 0); assert.equal(c.gold, 0); }
  });
  assert.ok(doc.foes && typeof doc.foes === "object");
});

test("a saved twist battle replays to its own fingerprint, and a contract that was not offered pays nothing", () => {
  const W = war(); sim.context.__W = W;
  W.battles[D1] = sim.run(`fightDay(__W, __D1, 1)`);
  const D2 = sim.run(`addDays(__D1, 1)`); sim.context.__D2 = D2;
  const doc = sim.run(`fightDay(__W, __D2, 2)`); sim.context.__doc = doc;
  const again = sim.run(`(() => { const s = __doc.inputs; return battleHash(runBattle(JSON.parse(JSON.stringify(s.plans)), daySeed(__D2), { fast: true, N: s.N, finalDay: s.final, ultV2: s.ultV2, balV2: s.balV2, balV3: s.balV3, fairV1: s.fairV1, pickV1: s.pickV1, balV4: s.balV4, suddenV1: s.suddenV1, treesV1: s.treesV1, heroV3: s.heroV3, dayNo: s.dayNo, ranks: s.ranks, twist: s.twist })); })()`);
  assert.equal(again, doc.resultHash);
  const none = J(sim.run(`(() => { const s = __doc.inputs, r = runBattle(JSON.parse(JSON.stringify(s.plans)), daySeed(__D2), { fast: true, N: s.N, dayNo: s.dayNo, twist: s.twist }); return settleContracts(r, { b0: "raze" }, { b0: ["butcher"] }, s.twist); })()`));
  assert.deepEqual(none, {});
});

test("twists that change the fight do change it: Iron Walls gives castles 30% more health", () => {
  const r = J(sim.run(`(() => { const x = goldenCase(2), a = runBattle(JSON.parse(JSON.stringify(x.plans)), x.seed, { ...x.opts, fast: true }), b = runBattle(JSON.parse(JSON.stringify(x.plans)), x.seed, { ...x.opts, fast: true, twist: "iron" });
    const hp = res => res.meta.filter(m => m.kind === "castle").map(m => m.maxhp); return [hp(a), hp(b)]; })()`));
  r[1].forEach((v, i) => assert.ok(Math.abs(v / r[0][i] - 1.3) < 1e-9));
});
