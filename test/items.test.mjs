// Flat items (plans stamped itemV5): stat items add flat amounts to the hero; without the stamp, battles are fought as before
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";
import { GOLDEN_SCRIPTS } from "../tools/golden.mjs";

const sim = loadSim({ extraFiles: GOLDEN_SCRIPTS, strict: true });
sim.run(`globalThis.__hero = (items, v5) => { const c = goldenCase(1), pl = JSON.parse(JSON.stringify(c.plans)); pl.forEach(p => { p.cls = "mage"; p.ranks = { a1: 0, a2: 0, a3: 0, ult: 0 }; p.tree = emptyTree(); }); pl[0].items = items; if (v5) pl.forEach(p => { p.itemV5 = true; });
  const bare = JSON.parse(JSON.stringify(pl)); bare[0].items = [];
  const at = (plans) => { const r = runBattle(plans, c.seed, Object.assign({}, c.opts, { fast: true, heroV3: true })); return r.meta.find(m => m.pid === plans[0].pid && m.kind === "champ"); };
  const a = at(pl), b = at(bare); return { atk: a.atk - b.atk, hp: a.maxhp - b.maxhp, ratio: a.atk / b.atk }; };`);

test("flat items: Gauntlets add 12 attack and a Ring of Health 140 health, whatever the hero's level", () => {
  const g = sim.run(`__hero(["gauntlets"], true)`), h = sim.run(`__hero(["hpring"], true)`);
  assert.ok(Math.abs(g.atk - 12) < 1e-6, `gauntlets +${g.atk}`);
  assert.ok(Math.abs(h.hp - 140) < 1e-6, `ring +${h.hp}`);
});
test("without the stamp, Gauntlets are still a percentage", () => {
  const g = sim.run(`__hero(["gauntlets"], false)`);
  assert.ok(g.ratio > 1.1, `ratio ${g.ratio}`);
});
test("the Iron Standard aura gives 18% with flat items", () => {
  assert.equal(sim.get("STANDARD_V5"), .18);
});
