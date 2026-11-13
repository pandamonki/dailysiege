// The catapult siege engine: crawls to two tiles from an enemy castle, sets up, then hurls boulders at it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";
import { GOLDEN_SCRIPTS } from "../tools/golden.mjs";

test("a catapult sets up two tiles from a castle and batters it", () => {
  const sim = loadSim({ extraFiles: GOLDEN_SCRIPTS, strict: true });
  const out = sim.run(`(() => {
    UNITS.catapult.hp = 99999; // the castles shoot back, so let it live long enough to be seen firing
    const c = goldenCase(3), p = c.plans[0];
    p.pieces = p.pieces.filter(x => x.kind !== "unit"); c.plans.slice(1).forEach(q => { q.pieces = q.pieces.filter(x => x.kind === "champ"); q.retreat = true; }); // the rivals only guard their hero
    const free = []; zoneFor(p.castle, c.N, c.plans.map(q => q.castle)).forEach(k => free.push(k.split(",").map(Number)));
    const at = free.find(q => !(q[0] === p.pieces[0].r && q[1] === p.pieces[0].c));
    p.pieces.push({ kind: "unit", id: "u1", type: "catapult", lvl: 1, hp: 1, r: at[0], c: at[1], order: "army" });
    const res = runBattle(c.plans, c.seed, Object.assign({}, c.opts, { fast: false }));
    const meta = res.meta.findIndex(m => m.key === "catapult");
    const rocks = res.events.filter(e => e.ty === "shot" && e.sk === "rock");
    const logs = res.logs.map(l => JSON.stringify(l)).filter(s => /catapult/.test(s));
    return { meta, rocks: rocks.length, logs: logs.slice(0, 3) };
  })()`);
  assert.ok(out.meta >= 0, "the catapult is in the battle");
  assert.ok(out.rocks > 0, "it hurled boulders: " + JSON.stringify(out));
  assert.ok(out.logs.some(s => /sets up/.test(s)), "it set up first: " + JSON.stringify(out.logs));
});
