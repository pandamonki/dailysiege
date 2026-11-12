// Combat groups (battles from 12 Nov 2026): per-group target priorities, healer priorities, reach, and the siege rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";

const sim = loadSim({ extraFiles: ["js/dev/goldenCases.js"] });
const J = v => JSON.parse(JSON.stringify(v));
const run = (plans, seed, opts = {}) => sim.get("runBattle")(J(plans), seed, { N: 17, balV2: true, balV3: true, ultV2: true, dayNo: 3, ...opts });

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

test("bot lords fight with the combat groups from 12 Nov 2026, in a mix of styles, and the same orders every time", () => {
  const L = sim.run("seatLayout(8)"), zone = i => sim.run(`zoneFor(seatLayout(8).castles[${i}], seatLayout(8).N, seatLayout(8).castles)`);
  const ids = [...Array(8)].map((_, i) => "bot" + i);
  const plan = (i, v2) => J(sim.get("lordBotPlan")({ uid: ids[i], cls: "warrior", i, ids, L, zone: zone(i), dayNo: 4, lvl: 7, v2 }));
  const on = ids.map((_, i) => plan(i, true)), off = ids.map((_, i) => plan(i, false));
  assert.ok(on.every(p => p.gprio && p.gprio.heal && p.engage >= 1 && p.engage <= 3), "every bot has combat groups and a reach");
  assert.ok(off.every(p => !p.gprio && p.heading === "near"), "before 12 Nov 2026 bots are unchanged");
  assert.ok(new Set(on.map(p => JSON.stringify(p.gprio))).size >= 3, "the bots do not all fight alike");
  assert.deepEqual(plan(2, true), on[2], "the same bot, the same day, the same orders");
});

// ----- reinforcement waves -----
const wavesOf = r => r.events.filter(e => e.ty === "wave");
const waveFight = (c, waves) => run(c.plans.map(p => ({ ...p, waves })), c.seed, { ...c.opts, balV2: true, balV3: true });

test("waves: the first goes out by 1:00 and never two within 30 seconds of each other", () => {
  const c = sim.run("goldenCase(5)"), r = waveFight(c, [{ when: "ult", at: 60, units: [] }, { when: "ult", at: 60, units: [] }, { when: "ult", at: 60, units: [] }]);
  for (const p of c.plans) {
    const t = wavesOf(r).filter(e => e.pid === p.pid).map(e => e.t);
    if (!t.length) continue; // a castle that fell first sends nothing more
    assert.ok(t[0] <= 61, `first wave by the minute mark (${t[0]})`);
    t.forEach((x, i) => { if (i) assert.ok(x - t[i - 1] >= 29.9, `waves ${i} and ${i + 1} are ${x - t[i - 1]}s apart`); });
    assert.ok(t.length <= 3);
  }
  assert.ok(wavesOf(r).length > 0, "waves go out");
});

test("waves: a timer wave goes at its time, and a wave's soldiers are the free footman plus the ones assigned", () => {
  const c = sim.run("goldenCase(2)"), mk = at => waveFight(c, [{ when: "timer", at, units: [{ type: "knight", lvl: 2, id: "k1", hp: 1 }] }, { when: "timer", at: 150, units: [] }, { when: "timer", at: 150, units: [] }]);
  const a = mk(20), first = wavesOf(a).filter(e => e.i === 0);
  assert.ok(first.length > 0 && first.every(e => e.t >= 20 && e.t < 21), "the timer wave goes out at 20s");
  const pid = first[0].pid, out = a.meta.map((m, k) => ({ m, k })).filter(({ m }) => m.pid === pid && m.kind === "unit" && (m.key === "knight" || m.key === "footman"));
  assert.ok(out.some(({ m }) => m.key === "knight"), "the assigned knight marches out");
  assert.ok(sim.run("battleHash")(a) !== sim.run("battleHash")(mk(60)), "a different time gives a different battle");
});

test("waves: only battles with balV3 have them, and the result says so", () => {
  const c = sim.run("goldenCase(2)");
  const on = run(c.plans, c.seed, { ...c.opts, balV2: true, balV3: true }), off = run(c.plans, c.seed, { ...c.opts, balV2: true, balV3: false });
  assert.equal(on.waves, true); assert.equal(off.waves, undefined); assert.equal(wavesOf(off).length, 0);
});

test("cleanWaves: three waves, three slots each, no mercenaries, unknown conditions replaced", () => {
  const w = J(sim.run(`cleanWaves([{ when: "nonsense", units: [{ type: "footman", lvl: 9 }, { type: "knight" }, { type: "bowman" }, { type: "mage" }] }, { when: "ult", at: 75, units: [{ type: "bogus" }] }])`));
  assert.equal(w.length, 3); assert.equal(w[0].when, "castle_hit"); assert.equal(w[0].units.length, 3); assert.equal(w[0].units[0].lvl, 3);
  assert.equal(w[1].when, "ult"); assert.equal(w[1].at, 75); assert.equal(w[1].units.length, 0);
  assert.equal(w[2].when, "timer");
});
