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
    p.tree = bi == null ? autoTree(lvl, 1000 + k * 17 + i, p.cls) : (() => { const t = emptyTree(); t[TREE_BKEY[bi]] = TREE_MAX.slice(); t.base = BASE_MAX; return t; })(); });
  const res = runBattle(c.plans, c.seed, Object.assign({}, c.opts, { fast: !full, heroV3: true }));
  const ab = {}; res.tel.ents.filter(e => e.kind === "champ").forEach(e => Object.entries(e.ab || {}).forEach(([k, v]) => { ab[e.cls + ":" + k] = (ab[e.cls + ":" + k] || 0) + v.casts; }));
  return { hash: battleHash(res), ab, res: full ? res : null }; };`);
const lrn = (cls, tree, b, i, L) => sim.run(`__lrn(${JSON.stringify(cls)}, ${JSON.stringify(tree)}, ${JSON.stringify(b)}, ${i}, ${L})`);
const row = (...a) => { const r = [0, 0, 0, 0, 0, 0]; a.forEach((v, i) => { r[i] = v; }); return r; };
const tree = (b1, b2 = row(), b3 = row(), base = 1) => ({ b1, b2, b3, base }); // the base skill is learned by default: it opens every tree

test("a tree is 6 nodes: 14 points maxes one tree, and the main path alone is 11", () => {
  const max = sim.get("TREE_MAX"), n = sim.get("TREE_NODE");
  assert.equal(n.length, 6); assert.equal(max.reduce((a, b) => a + b, 0), 14); assert.equal(max[0] + max[1] + max[3] + max[5], 11);
});

test("gates: T2 needs 2 points and T1, T3 needs 5 and T2, the ultimate needs 10, T3 and level 12; side talents count, the base skill does not", () => {
  assert.equal(lrn("warrior", tree(row(1)), "b1", 1, 5), false, "T2 with only 1 point spent");
  assert.equal(lrn("warrior", tree(row(2)), "b1", 1, 5), true);
  assert.equal(lrn("warrior", tree(row(0, 0, 0, 0, 0, 0)), "b1", 1, 9), false, "T2 needs T1");
  assert.equal(lrn("warrior", tree(row(2, 2)), "b1", 3, 9), false, "T3 with 4 points spent");
  assert.equal(lrn("warrior", tree(row(2, 3)), "b1", 3, 9), true);
  assert.equal(lrn("warrior", tree(row(2, 1, 2)), "b1", 3, 9), true, "side talent points count towards the T3 gate (2+1+2 = 5)");
  assert.equal(lrn("warrior", tree(row(4, 4, 0, 1, 1)), "b1", 5, 12), true, "T3 1 + T3b 1 + 4 + 4 = 10 opens the ultimate, which is the 12th point with the base skill");
  assert.equal(lrn("warrior", tree(row(4, 4, 0, 1, 1)), "b1", 5, 11), false, "the ultimate needs hero level 12");
  assert.equal(lrn("warrior", tree(row(4, 3, 0, 1, 1)), "b1", 5, 25), false, "9 points in the tree is one short");
  assert.equal(lrn("warrior", tree(row(4, 3, 0, 1, 1), row(), row(), 3), "b1", 5, 25), false, "the base skill's points do not open the ultimate");
  assert.equal(lrn("warrior", tree(row(4, 4, 2, 0, 0)), "b1", 5, 25), false, "the ultimate needs T3 even with 10 points");
  assert.equal(lrn("warrior", tree(row(2, 3, 0, 1, 1, 0), row(0), row()), "b1", 0, 15), true);
  assert.equal(lrn("warrior", tree(row(4, 4, 0, 1, 1, 1), row(4, 4, 0, 1, 1, 0)), "b2", 5, 25), false, "only one ultimate per hero");
});

test("the base skill: one point opens every tree, it has 3 ranks and counts as a spent point", () => {
  const free = (t, L) => sim.run(`treeFree(${JSON.stringify(t)}, ${L})`), base = (t, L) => sim.run(`treeCanLearnBase(${JSON.stringify(t)}, ${L})`);
  assert.equal(lrn("warrior", tree(row(), row(), row(), 0), "b1", 0, 25), false, "no tree opens without the base skill");
  assert.equal(lrn("warrior", tree(row(), row(), row(), 0), "b3", 0, 25), false);
  assert.equal(lrn("warrior", tree(row(), row(), row(), 1), "b3", 0, 2), true, "with the base skill every tree opens");
  assert.equal(free(tree(row(), row(), row(), 3), 10), 7, "base ranks use points");
  assert.equal(base({ b1: row(), b2: row(), b3: row(), base: 0 }, 1), true); assert.equal(base({ b1: row(), b2: row(), b3: row(), base: 1 }, 1), false, "no point left");
  assert.equal(base({ b1: row(), b2: row(), b3: row(), base: 3 }, 25), false, "three ranks at most");
  assert.equal(sim.run(`cleanTree({ base: 9 }).base`), 3); assert.equal(sim.run(`cleanTree(null).base`), 0);
  for (const cls of CLASSES) { const n = sim.run(`BASE_NODE.${cls}`); assert.equal(n.kind, "trigger"); assert.ok(n.cd > 0 && n.cd <= 14, "a short recharge"); assert.ok(n.v[0].length === 3, "values for three ranks"); }
});

test("points: one per level from level 1, 25 in all (lvlV2; levels were capped at 15 before), and none to spend means nothing can be learned", () => {
  const free = (t, L) => sim.run(`treeFree(${JSON.stringify(t)}, ${L})`);
  const t0 = tree(row(), row(), row(), 0); assert.equal(free(t0, 1), 1); assert.equal(free(t0, 2), 2); assert.equal(free(t0, 15), 15); assert.equal(free(t0, 21), 21); assert.equal(free(t0, 30), 25);
  assert.equal(sim.run(`treeCanLearnBase(${JSON.stringify(tree(row(), row(), row(), 0))}, 1)`), true, "a level 1 hero has a point to spend, on the base skill");
  assert.equal(lrn("mage", tree(row()), "b1", 0, 1), false, "level 1 has one point and the base skill took it");
  assert.equal(lrn("mage", tree(row()), "b1", 0, 2), true);
});

test("bot builds are always legal, deterministic, and spend what the level allows", () => {
  for (const cls of CLASSES) for (let lvl = 1; lvl <= 25; lvl++) for (let seed = 1; seed <= 12; seed++) {
    const t = sim.run(`autoTree(${lvl}, ${seed * 977}, "${cls}")`), again = sim.run(`autoTree(${lvl}, ${seed * 977}, "${cls}")`);
    assert.deepEqual(J(t), J(again));
    const spent = [t.b1, t.b2, t.b3].flat().reduce((a, b) => a + b, 0) + t.base; assert.ok(t.base >= 1, "the base skill comes first");
    assert.ok(spent <= lvl, `${cls} L${lvl} spent ${spent}`);
    if (lvl >= 3) assert.ok(spent >= Math.min(lvl, 2), "uses its points");
    for (const b of ["b1", "b2", "b3"]) t[b].forEach((r, i) => assert.ok(r <= sim.get("TREE_MAX")[i], "within max rank"));
    const ults = [t.b1[5], t.b2[5], t.b3[5]].reduce((a, b) => a + b, 0); assert.ok(ults <= 1); if (lvl < 12) assert.equal(ults, 0, "no ultimate before level 12");
    if (lvl >= 12) assert.equal(ults, 1, `${cls} L${lvl} should have its ultimate`);
  }
});

test("a skill-tree battle is deterministic and heroes never skill themselves mid-battle", () => {
  const a = sim.run(`__battle(33, null, null, true, 7)`), b = sim.run(`__battle(33, null, null, true, 7)`);
  assert.equal(a.hash, b.hash);
  const res = a.res;
  assert.ok(!res.logs.some(l => /sharpens/.test(l.msg)), "no hero learns a skill during the fight");
  res.meta.filter(m => m.champ).forEach(m => assert.ok(m.tree && m.tree.length === 4, "the hero's sealed tree is recorded"));
  assert.ok(res.events.some(e => e.ty === "lvl"), "heroes still level up in battle (stats only)");
});

test("every trigger and ultimate fires in a battle with a maxed tree", () => {
  const seen = {};
  for (const cls of CLASSES) for (let bi = 0; bi < 3; bi++) { const r = sim.run(`__battle(12, "${cls}", ${bi}, false, 15)`); Object.entries(r.ab).forEach(([k, v]) => { seen[k] = (seen[k] || 0) + v; }); }
  const TREES = sim.get("TREES"), missing = [];
  for (const cls of CLASSES) TREES[cls].forEach(t => t.nodes.forEach(nd => { if ((nd.kind === "trigger" || nd.kind === "ultimate") && !seen[cls + ":" + nd.name]) missing.push(cls + ":" + nd.name); }));
  CLASSES.forEach(cls => { const n = sim.get("BASE_NODE")[cls].name; if (!seen[cls + ":" + n]) missing.push(cls + ":" + n + " (base)"); });
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

