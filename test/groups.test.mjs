// Combat groups (battles from 12 Nov 2026): per-group target priorities, healer priorities, reach, and the siege rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";

const sim = loadSim({ extraFiles: ["js/dev/goldenCases.js"] });
const J = v => JSON.parse(JSON.stringify(v));
const run = (plans, seed, opts = {}) => sim.get("runBattle")(J(plans), seed, { N: 17, balV2: true, ultV2: true, dayNo: 3, ...opts });

test("cleanGprio keeps valid lists, drops unknown and repeated entries, and fills missing groups with the defaults", () => {
  const c = J(sim.run(`cleanGprio({ hero: ["melee", "bogus", "melee", "hero", "ranged", "any"], melee: [], extra: ["x"] })`));
  assert.deepEqual(c.hero, ["melee", "hero", "ranged"]);
  assert.deepEqual(c.melee, J(sim.get("GPRIO_DEFAULT").melee));
  assert.deepEqual(Object.keys(c).sort(), ["heal", "hero", "melee", "ranged"]);
  assert.equal(sim.run("cleanEngage(99)"), 5); assert.equal(sim.run("cleanEngage(0)"), 2); assert.equal(sim.run("cleanEngage(-3)"), 1);
});

test("healer priorities change who gets healed", () => {
  let differs = false;
  for (let i = 0; i < 40 && !differs; i++) {
    const c = sim.run(`goldenCase(${i})`), meds = c.plans.map(p => ({ ...p, pieces: p.pieces.map(q => q.kind === "unit" ? { ...q, type: "healer", hp: .5 } : q) }));
    if (!meds.some(p => p.pieces.some(q => q.type === "healer"))) continue;
    const h = list => meds.map(p => ({ ...p, gprio: { ...J(sim.get("GPRIO_DEFAULT")), heal: list }, engage: 3 }));
    const a = run(h(["hero"]), c.seed, c.opts), b = run(h(["any"]), c.seed, c.opts);
    if (sim.run("battleHash")(a) !== sim.run("battleHash")(b)) differs = true;
  }
  assert.ok(differs, "a different heal list gives a different fight somewhere");
});

test("group priorities change who fights whom, and a plan with them still replays identically", () => {
  const hashes = new Set(); let differs = false;
  for (let i = 0; i < 12 && !differs; i++) {
    const c = sim.run(`goldenCase(${i})`), g = (hero, melee) => c.plans.map(p => ({ ...p, gprio: { hero, melee, ranged: ["hero"], heal: ["hero"] }, engage: 3 }));
    const a = run(g(["hero"], ["melee"]), c.seed, c.opts), b = run(g(["lowhp"], ["any"]), c.seed, c.opts), a2 = run(g(["hero"], ["melee"]), c.seed, c.opts);
    assert.equal(sim.run("battleHash")(a), sim.run("battleHash")(a2), "same orders, same battle");
    if (sim.run("battleHash")(a) !== sim.run("battleHash")(b)) differs = true;
  }
  assert.ok(differs, "different priorities give a different fight somewhere");
});
