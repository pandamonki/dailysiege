// Fair ties (FAIR_V1_FROM): on the symmetric ring, equally near rivals and castles left on equal health are settled by a seeded draw,
// never by who comes first in the roster.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";

const sim = loadSim(), J = v => JSON.parse(JSON.stringify(v));
sim.run(`globalThis.tiePlans = (seed, n) => { const rnd = mulberry(seed), L = seatLayout(n);
  return L.castles.map((pos, i) => { const sp = armySpots(pos, L.N);
    return { pid: "s" + i, name: "S" + i, color: SEAT_COLORS[i], cls: Object.keys(CLASSES)[i % 5], level: 3, castle: pos, ranks: autoRanks(3, i + 1), picks: {}, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
      gear: {}, defences: {}, stance: "aggressive", prio: PRIORITIES.slice(), rules: [], pieces: [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, { kind: "unit", type: UTYPES[Math.floor(rnd() * UTYPES.length)], lvl: 1, hp: 1, r: sp.units[0][0], c: sp.units[0][1] }],
      targets: [], pacts: [], hostile: [], betray: {} }; }); };`);
const fight = (seed, fairV1, rev) => sim.run(`(() => { const ps = tiePlans(${seed}, 8); ${rev ? "ps.reverse();" : ""} return runBattle(ps, ${seed}, { fast: true, N: seatLayout(8).N, balV2: true, balV3: true, dayNo: 2, fairV1: ${fairV1} }); })()`);

test("the rule switches on at FAIR_V1_FROM and old battles keep the old rule", () => {
  assert.equal(sim.run(`fairV1For("2026-11-15")`), false);
  assert.equal(sim.run(`fairV1For(FAIR_V1_FROM)`), true);
});

test("with fair ties, being later in the roster is no longer an advantage on a symmetric map", () => {
  const pts = { off: Array(8).fill(0), on: Array(8).fill(0) };
  for (let i = 0; i < 24; i++) for (const [k, f] of [["off", false], ["on", true]]) fight(101 + i * 7, f, false).results.forEach(r => { pts[k][+r.pid.slice(1)] += r.points; });
  // how strongly points rise with roster position (+1: the later the seat, the more points; 0: no link). The gap between the best and
  // worst seat swings with luck whenever the balance numbers change, so the test measures the roster advantage itself.
  const seatLink = a => { const n = a.length, mx = (n - 1) / 2, my = a.reduce((x, y) => x + y, 0) / n; let sxy = 0, sxx = 0, syy = 0;
    a.forEach((y, x) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }); return sxy / Math.sqrt(sxx * syy); };
  const msg = `points by seat: before ${pts.off.join(",")}, after ${pts.on.join(",")}`;
  assert.ok(seatLink(pts.off) > .3, "the old rule favours later seats (the test still sees the bias it guards against): " + msg);
  assert.ok(seatLink(pts.on) < .25 && seatLink(pts.on) < seatLink(pts.off) - .2, "with fair ties later seats are no longer favoured: " + msg);
});

test("a fair-ties battle is still deterministic", () => {
  assert.equal(JSON.stringify(J(fight(55, true, false).results)), JSON.stringify(J(fight(55, true, false).results)));
});

test("bot lords put equally near rivals in a drawn order that changes with the day, not by name", () => {
  const L = sim.run("seatLayout(8)"), ids = [...Array(8)].map((_, i) => "bot_" + i);
  const first = (i, dayNo, fair) => sim.run(`lordBotPlan({ uid: "bot_${i}", cls: "warrior", i: ${i}, ids: ${JSON.stringify(ids)}, L: seatLayout(8), zone: zoneFor(seatLayout(8).castles[${i}], seatLayout(8).N, seatLayout(8).castles), dayNo: ${dayNo}, lvl: 3, v2: true, fair: ${fair} })`).targets[0];
  const old = ids.map((_, i) => first(i, 1, false)), counts = {};
  old.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  assert.ok(Object.values(counts).some(n => n > 1), "before the fix some lord is every neighbour's first target");
  const picks = new Set(); for (let d = 1; d <= 7; d++) ids.forEach((_, i) => picks.add(i + ">" + first(i, d, true)));
  assert.ok(picks.size > 8, "with fair ties a bot's first target varies between its two equally near neighbours");
  assert.equal(L.castles.length, 8);
});
