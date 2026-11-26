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

test("survivor: a lord whose hero lives to the end scores 1 more point, only with the stamp", () => {
  const r = sim.run(`(() => { const c = goldenCase(2), run = st => { const pl = JSON.parse(JSON.stringify(c.plans)); if (st) pl.forEach(p => { p.survV1 = true; }); return runBattle(pl, c.seed, Object.assign({}, c.opts, { fast: true })).results; };
    const a = run(false), b = run(true); return a.map(x => ({ d: b.find(y => y.pid === x.pid).points - x.points, s: !!b.find(y => y.pid === x.pid).survivor })); })()`);
  assert.ok(r.some(x => x.s), "someone survives in this battle"); assert.ok(r.every(x => x.d === (x.s ? 1 : 0)), JSON.stringify(r));
});

test("bigger fields (MAP_V2): the map is 4 tiles larger and the field grows; earlier wars keep the old layout", () => {
  const r = JSON.parse(sim.run(`JSON.stringify((() => { const a = seatLayout(8), b = seatLayout(8, true); return { a: a.N, b: b.N, za: [...zoneFor(a.castles[0], a.N, a.castles)].filter(k => { const [x, y] = k.split(",").map(Number); return !treeTile(x, y, 8, a.N); }).length, zb: zoneFor(b.castles[0], b.N, b.castles, true).size, v: [mapV2For("2026-11-16"), mapV2For("2026-11-23")] }; })())`));
  assert.equal(r.a, 17); assert.equal(r.b, 21); assert.ok(r.zb > r.za + 5, `field ${r.za} -> ${r.zb}`); assert.deepEqual(r.v, [false, true]);
});
test("siege engines (plans stamped siegeV1) batter down walls in their way", () => {
  const wh = st => sim.run(`(() => { const c = goldenCase(3), N0 = c.opts.N, pl = JSON.parse(JSON.stringify(c.plans));
    pl.forEach(p => { const ctr = (N0 - 1) / 2, dy = ctr - p.castle[0], dx = ctr - p.castle[1], L = Math.hypot(dx, dy) || 1, uy = dy / L, ux = dx / L, at = (f, s) => [Math.round(p.castle[0] + uy * f - ux * s), Math.round(p.castle[1] + ux * f + uy * s)];
      p.pieces = p.pieces.filter(q => q.kind !== "wall"); [-1, 0, 1].forEach(s => { const [r, cc] = at(1.6, s); p.pieces.push({ kind: "wall", r, c: cc, dir: Math.abs(uy) >= Math.abs(ux) ? "h" : "v" }); });
      const [rr, rc] = at(2.6, 0); p.pieces.push({ kind: "unit", type: "ram", lvl: 1, hp: 1, r: rr, c: rc }); if (${st}) p.siegeV1 = true; });
    const r = runBattle(pl, c.seed, Object.assign({}, c.opts, { fast: true })); let w = 0; Object.values(r.stats || {}).forEach(s => { w += s.wallHit || 0; }); return w; })()`);
  assert.ok(wh(true) > wh(false) * 1.5, `wall damage ${wh(false)} -> ${wh(true)}`);
});
test("bigger fields are equal: every lord in a war has the same number of tiles to build on", () => {
  const r = JSON.parse(sim.run(`JSON.stringify([...Array(11)].map((_, i) => { const n = i + 2, L = seatLayout(n, true); return new Set(L.castles.map(c => [...zoneFor(c, L.N, L.castles, true)].filter(k => { const [a, b] = k.split(",").map(Number); return !treeTile(a, b, n, L.N); }).length)).size; }))`));
  assert.ok(r.every(x => x === 1), JSON.stringify(r));
});

// Aura items v2 (plans stamped auraV2): late-game prices, no aura above 30%, Mender's Charms do not stack
test("auraV2: the Banner, Iron Standard and Pipe are late-game items costing 400 to 500 gold", () => {
  for (const k of ["banner", "standard", "pipe"]) {
    const c = sim.run(`itemCost(${JSON.stringify(k)})`), tier = sim.run(`ITEMS.${k}.tier`);
    assert.equal(tier, 3, `${k} tier`); assert.ok(c >= 400 && c <= 500, `${k} costs ${c}`);
  }
});
test("auraV2: no aura item is stronger than 30%", () => {
  const cap = sim.get("AURA_V2").cap; assert.equal(cap, .3);
  assert.ok(sim.get("STANDARD_V5") <= cap, "Iron Standard"); assert.ok(.12 * sim.get("AURA_BOOST") <= cap, "Banner of Might");
  assert.match(sim.run(`itemDesc("pipe", "2026-11-27")`), /30% less damage/);
  assert.match(sim.run(`itemDesc("mender", "2026-11-27")`), /do not stack/);
});
test("auraV2 starts on its battle day, so earlier battles replay as fought", () => {
  assert.equal(sim.run(`auraV2For("2026-11-26")`), false); assert.equal(sim.run(`auraV2For("2026-11-27")`), true);
});
test("auraV2: a battle where every hero carries all four aura items still runs", () => {
  const r = sim.run(`(() => { const c = goldenCase(2), run = v => { const pl = JSON.parse(JSON.stringify(c.plans)); pl.forEach(p => { p.items = ["banner", "standard", "pipe", "mender"]; p.auraV2 = v; });
    const b = runBattle(pl, c.seed, Object.assign({}, c.opts, { fast: true })); return b.meta.filter(m => m.kind === "champ").reduce((a, m) => a + (m.tel ? m.tel.healed : 0), 0); }; return { old: run(false), now: run(true) }; })()`);
  assert.ok(Number.isFinite(r.now) && Number.isFinite(r.old), JSON.stringify(r));
});
