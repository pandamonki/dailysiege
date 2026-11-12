// Skill-tree heroes (HERO_V3): learning rules, bot builds, and the battle sim running every skill. Spec: docs/hero-skill-trees.md
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";
import { GOLDEN_SCRIPTS } from "../tools/golden.mjs";

const sim = loadSim({ extraFiles: GOLDEN_SCRIPTS, strict: true });
const CLASSES = ["warrior", "shaman", "rogue", "mage", "archer"];
const J = x => JSON.parse(JSON.stringify(x));

// helpers that run inside the sim's own context, so they use the real game globals
sim.run(`globalThis.__lrn = (cls, tree, b, i, L) => { TREE_NAME_CLS = cls; return treeCanLearn(tree, b, i, L); };
globalThis.__battle = (i, cls, bi, full, lvl) => { const c = goldenCase(i);
  c.plans.forEach((p, k) => { p.level = lvl; if (cls) p.cls = cls; p.ranks = { a1: 0, a2: 0, a3: 0, ult: 0 };
    p.tree = bi == null ? autoTree(lvl, 1000 + k * 17 + i, p.cls) : (() => { const t = emptyTree(); t[TREE_BKEY[bi]] = TREE_MAX.slice(); return t; })(); });
  const res = runBattle(c.plans, c.seed, Object.assign({}, c.opts, { fast: !full, heroV3: true }));
  const ab = {}; res.tel.ents.filter(e => e.kind === "champ").forEach(e => Object.entries(e.ab || {}).forEach(([k, v]) => { ab[e.cls + ":" + k] = (ab[e.cls + ":" + k] || 0) + v.casts; }));
  return { hash: battleHash(res), ab, res: full ? res : null }; };`);
const lrn = (cls, tree, b, i, L) => sim.run(`__lrn(${JSON.stringify(cls)}, ${JSON.stringify(tree)}, ${JSON.stringify(b)}, ${i}, ${L})`);
const row = (...a) => { const r = [0, 0, 0, 0, 0, 0]; a.forEach((v, i) => { r[i] = v; }); return r; };
const tree = (b1, b2 = row(), b3 = row()) => ({ b1, b2, b3 });

test("a tree is 6 nodes: 14 points maxes one tree, and the main path alone is 11", () => {
  const max = sim.get("TREE_MAX"), n = sim.get("TREE_NODE");
  assert.equal(n.length, 6); assert.equal(max.reduce((a, b) => a + b, 0), 14); assert.equal(max[0] + max[1] + max[3] + max[5], 11);
});

test("gates: T2 needs 2 points and T1, T3 needs 5 and T2, the ultimate needs 7, T3 and level 9; side talents count", () => {
  assert.equal(lrn("warrior", tree(row(1)), "b1", 1, 5), false, "T2 with only 1 point spent");
  assert.equal(lrn("warrior", tree(row(2)), "b1", 1, 5), true);
  assert.equal(lrn("warrior", tree(row(0, 0, 0, 0, 0, 0)), "b1", 1, 9), false, "T2 needs T1");
  assert.equal(lrn("warrior", tree(row(2, 2)), "b1", 3, 9), false, "T3 with 4 points spent");
  assert.equal(lrn("warrior", tree(row(2, 3)), "b1", 3, 9), true);
  assert.equal(lrn("warrior", tree(row(2, 1, 2)), "b1", 3, 9), true, "side talent points count towards the T3 gate (2+1+2 = 5)");
  assert.equal(lrn("warrior", tree(row(2, 3, 0, 1, 1)), "b1", 5, 9), true, "T3 1 + T3b 1 + 2 + 3 = 7 opens the ultimate");
  assert.equal(lrn("warrior", tree(row(2, 3, 0, 1, 1)), "b1", 5, 8), false, "the ultimate needs hero level 9");
  assert.equal(lrn("warrior", tree(row(2, 3, 2, 0, 0)), "b1", 5, 15), false, "the ultimate needs T3 even with 7 points");
  assert.equal(lrn("warrior", tree(row(2, 3, 0, 1, 1, 0), row(0), row()), "b1", 0, 15), true);
  assert.equal(lrn("warrior", tree(row(2, 3, 0, 1, 1, 1), row(2, 2, 0, 1, 1, 0)), "b2", 5, 15), false, "only one ultimate per hero");
});

test("points: one per level from level 1, 15 in all, and none to spend means nothing can be learned", () => {
  const free = (t, L) => sim.run(`treeFree(${JSON.stringify(t)}, ${L})`);
  assert.equal(free(tree(row()), 1), 1); assert.equal(free(tree(row()), 2), 2); assert.equal(free(tree(row()), 15), 15); assert.equal(free(tree(row()), 21), 15);
  assert.equal(lrn("mage", tree(row()), "b1", 0, 1), true, "a level 1 hero has a point to spend");
  assert.equal(lrn("mage", tree(row(1)), "b1", 0, 1), false, "level 1 has one point and it is spent");
});

test("bot builds are always legal, deterministic, and spend what the level allows", () => {
  for (const cls of CLASSES) for (let lvl = 1; lvl <= 15; lvl++) for (let seed = 1; seed <= 12; seed++) {
    const t = sim.run(`autoTree(${lvl}, ${seed * 977}, "${cls}")`), again = sim.run(`autoTree(${lvl}, ${seed * 977}, "${cls}")`);
    assert.deepEqual(J(t), J(again));
    const spent = [t.b1, t.b2, t.b3].flat().reduce((a, b) => a + b, 0);
    assert.ok(spent <= lvl, `${cls} L${lvl} spent ${spent}`);
    if (lvl >= 3) assert.ok(spent >= Math.min(lvl, 2), "uses its points");
    for (const b of ["b1", "b2", "b3"]) t[b].forEach((r, i) => assert.ok(r <= sim.get("TREE_MAX")[i], "within max rank"));
    const ults = [t.b1[5], t.b2[5], t.b3[5]].reduce((a, b) => a + b, 0); assert.ok(ults <= 1); if (lvl < 9) assert.equal(ults, 0, "no ultimate before level 9");
    if (lvl >= 9) assert.equal(ults, 1, `${cls} L${lvl} should have its ultimate`);
  }
});

test("a skill-tree battle is deterministic and heroes never skill themselves mid-battle", () => {
  const a = sim.run(`__battle(33, null, null, true, 7)`), b = sim.run(`__battle(33, null, null, true, 7)`);
  assert.equal(a.hash, b.hash);
  const res = a.res;
  assert.ok(!res.logs.some(l => /sharpens/.test(l.msg)), "no hero learns a skill during the fight");
  res.meta.filter(m => m.champ).forEach(m => assert.ok(m.tree && m.tree.length === 3, "the hero's sealed tree is recorded"));
  assert.ok(res.events.some(e => e.ty === "lvl"), "heroes still level up in battle (stats only)");
});

test("every trigger and ultimate fires in a battle with a maxed tree", () => {
  const seen = {};
  for (const cls of CLASSES) for (let bi = 0; bi < 3; bi++) { const r = sim.run(`__battle(12, "${cls}", ${bi}, false, 15)`); Object.entries(r.ab).forEach(([k, v]) => { seen[k] = (seen[k] || 0) + v; }); }
  const TREES = sim.get("TREES"), missing = [];
  for (const cls of CLASSES) TREES[cls].forEach(t => t.nodes.forEach(nd => { if ((nd.kind === "trigger" || nd.kind === "ultimate") && !seen[cls + ":" + nd.name]) missing.push(cls + ":" + nd.name); }));
  assert.deepEqual(missing, [], "never cast: " + missing.join(", "));
});

test("new effects reach the replay: shields, stealth, zones, taunts", () => {
  const w = sim.run(`__battle(12, "warrior", 0, true, 15)`).res, fl = f => f.d.filter((_, i) => i % 4 === 3);
  assert.ok(w.frames.some(f => fl(f).some(x => x & 64)), "a shield flag appears in the frames");
  assert.ok(w.events.some(e => e.ty === "taunt"), "taunt events");
  const r = sim.run(`__battle(12, "rogue", 0, true, 15)`).res, i0 = r.meta.findIndex(m => m.champ);
  assert.ok(r.frames[0].d[i0 * 4 + 3] & 8 || r.meta.some((m, k) => m.champ && r.frames[0].d[k * 4 + 3] & 8), "a Shadow Rogue starts hidden");
  const m = sim.run(`__battle(12, "warrior", 2, true, 15)`).res;
  assert.ok(m.events.some(e => e.ty === "zone" && e.k === "banner"), "Command Banner zone");
});

test("the old abilities and the new trees never mix: a battle without heroV3 ignores the tree", () => {
  const c = sim.run(`(() => { const x = goldenCase(14); x.plans.forEach(p => { p.tree = autoTree(15, 5, p.cls); }); const r = runBattle(x.plans, x.seed, Object.assign({}, x.opts, { fast: true })); const y = goldenCase(14); const q = runBattle(y.plans, y.seed, Object.assign({}, y.opts, { fast: true })); return [battleHash(r), battleHash(q)]; })()`);
  assert.equal(c[0], c[1]);
});
