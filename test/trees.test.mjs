// Solid trees (battles from TREES_V1_FROM): the forest rim and the blockades between bases cannot be walked through.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";

const sim = loadSim({ extraFiles: ["js/dev/goldenCases.js"] });

test("the tree layout is the same turned round every base, for any number of lords", () => {
  for (const n of [2, 3, 5, 8, 12]) {
    const g = JSON.parse(JSON.stringify(sim.run(`(() => { const G = treeGeom(${n}, mapSizeFor(${n})), per = G.clumps.length / ${n}; const rel = G.clumps.map(c => { const a = G.ref + (c.i + .5) * G.sec, dx = c.x - G.cc, dy = c.y - G.cc, u = dx * dcos(a) + dy * dsin(a), v = -dx * dsin(a) + dy * dcos(a); return [c.k, +u.toFixed(6), +v.toFixed(6)]; }); return { per, rel }; })()`)));
    const per = g.per, first = g.rel.slice(0, per);
    for (let i = 1; i < n; i++) assert.deepEqual(g.rel.slice(i * per, (i + 1) * per), first, `${n} lords: blockade ${i} matches the first`);
  }
});

test("blockades never close the ring around the middle: neighbouring groups leave a gap a soldier can pass", () => {
  for (const n of [2, 3, 4, 5, 6, 8, 10, 12]) {
    const gap = sim.run(`(() => { const G = treeGeom(${n}, mapSizeFor(${n})), per = G.clumps.length / ${n}, a = G.clumps[per - 1], b = G.clumps[per]; return hyp(a.x - b.x, a.y - b.y) - a.r - b.r; })()`);
    assert.ok(n === 2 ? true : gap > 1.0, `${n} lords: gap ${gap}`);
  }
});

test("with solid trees on, nobody stands inside the rim or a blockade (apart from rounding)", () => {
  for (const c of [3, 7, 12, 13, 18, 30, 45]) {
    const r = JSON.parse(JSON.stringify(sim.run(`(() => { const x = goldenCase(${c}), o = { ...x.opts, treesV1: true }, a = runBattle(JSON.parse(JSON.stringify(x.plans)), x.seed, { ...o, fast: false }), b = runBattle(JSON.parse(JSON.stringify(x.plans)), x.seed, { ...o, fast: true }), TG = treeGeom(x.plans.length, x.N); let bad = 0;
      a.frames.forEach(f => a.meta.forEach((m, k) => { if (m.kind === "castle" || m.kind === "totem") return; const d = f.d, i = k * 4; if (d.length <= i + 3 || (d[i + 3] & 1)) return; const px = d[i], py = d[i + 1];
        for (const cl of TG.clumps) if (hyp(px - cl.x, py - cl.y) < cl.r + .22 - .08) bad++;
        const dx = px - TG.cc, dy = py - TG.cc, rr = hyp(dx, dy); if (rr > TG.half - 1.5 && rr - (TG.rim(datan2(dy, dx)) - .12) > .08) bad++; }));
      return { bad, same: battleHash(a) === battleHash(b) }; })()`)));
    assert.equal(r.bad, 0, `case ${c}`); assert.ok(r.same, `case ${c}: a fast and a full run agree`);
  }
});
