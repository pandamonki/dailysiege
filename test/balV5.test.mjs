// Balance V5 (battles from 16 Nov 2026): soldiers attack castles next to them, slower and weaker siege engines, catch-up gold for the whole bottom half,
// and bounties only for lords ranked below. Battles before that day must replay exactly as fought (the golden tests cover that).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";

const sim = loadSim({ extraFiles: ["js/dev/goldenCases.js"] });
const J = v => JSON.parse(JSON.stringify(v));
const fight = (i, v5, edit) => { const c = sim.run(`goldenCase(${i})`), plans = J(c.plans); if (edit) edit(plans); sim.context.__p = plans;
  return sim.run(`runBattle(__p, ${c.seed}, Object.assign(${JSON.stringify(c.opts)}, { fast: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, balV5: ${v5} }))`); };

test("the rules switch over on 16 Nov 2026", () => {
  assert.equal(sim.run('balV5For("2026-11-15")'), false);
  assert.equal(sim.run('balV5For("2026-11-16")'), true);
});

test("siege engines take longer to bring a castle down", () => {
  const rams = plans => plans.forEach(p => p.pieces.forEach(q => { if (q.kind === "unit") { q.type = "ram"; q.lvl = 1; } }));
  let slower = 0, n = 0;
  for (let i = 0; i < 12; i++) {
    const first = r => Math.min(...r.results.map(x => x.fellAt ?? 1e9)), a = first(fight(i, false, rams)), b = first(fight(i, true, rams));
    if (a > 1e8) continue; n++; if (b > a) slower++;
  }
  assert.ok(n >= 5 && slower >= n * .8, `the first castle falls later with the new rams in ${slower} of ${n} battles`);
});

test("catch-up gold: the whole bottom half from 16 Nov, in even steps from 450 to 210", () => {
  const row = (n, v5) => [...Array(n)].map((_, i) => sim.run(`catchUpGold(${n}, ${i}, ${v5})`));
  assert.deepEqual(row(8, true), [450, 370, 290, 210, 0, 0, 0, 0]);
  assert.deepEqual(row(7, true), [450, 330, 210, 0, 0, 0, 0], "the middle lord of an odd board is not in the bottom half");
  assert.deepEqual(row(3, true), [450, 0, 0]);
  assert.deepEqual(row(12, true).slice(0, 7), [450, 400, 355, 305, 260, 210, 0]);
  assert.deepEqual(row(8, false), [300, 220, 0, 0, 0, 0, 0, 0], "before: the bottom 30%, unchanged");
});

test("bounties from 16 Nov go only to lords ranked below the victim", () => {
  const paid = (k, v, v5) => sim.run(`bountyPaid({ a: 1, b: 2, c: 3, d: 4 }, "${k}", "${v}", ${v5})`);
  assert.equal(paid("d", "a", true), true, "4th kills the leader: paid");
  assert.equal(paid("c", "b", true), true, "3rd kills 2nd: paid");
  assert.equal(paid("a", "b", true), false, "the leader kills 2nd: no bounty");
  assert.equal(paid("x", "a", true), true, "an unranked lord: paid");
  assert.equal(paid("a", "d", true), false, "4th carries no bounty");
  assert.equal(paid("a", "b", false), true, "before 16 Nov anyone collects it");
});

test("soldiers next to an enemy castle attack it", () => {
  const plain = new Set(["footman", "bowman", "knight", "mage", "sniper"]); let before = 0, after = 0;
  for (let i = 0; i < 16; i++) for (const [v5, add] of [[false, x => { before += x; }], [true, x => { after += x; }]])
    fight(i, v5).tel.ents.filter(e => e.kind === "unit" && plain.has(e.type)).forEach(e => add(e.toCastle || 0));
  assert.ok(after > before * 1.5, `ordinary soldiers deal more castle damage: ${Math.round(before)} before, ${Math.round(after)} after`);
});
