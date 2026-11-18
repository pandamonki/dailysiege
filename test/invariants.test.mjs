// Battle invariants under today's rules: every flag a real battle now carries is switched on, and a spread of bot wars is fought.
// Whatever the armies, these must always hold. Add a check here whenever a new battle rule lands (see CLAUDE.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";

const sim = loadSim();
const tough = loadSim(); tough.run("BAL.castleHp *= 1000"); // castles that cannot fall, so every battle reaches sudden death

// a war of 8 bot lords, day `day`, fought with every rule a battle from today carries
const WAR = (game, day) => `(() => { const L = seatLayout(8, true), CL = ["warrior", "mage", "rogue", "archer", "shaman"], ids = [...Array(8)].map((_, k) => "g${game}b" + k);
  const plans = ids.map((uid, i) => { const zone = zoneFor(L.castles[i], L.N, L.castles, L.v2), lvl = Math.min(15, 1 + 2 * (${day} - 1));
    const p = lordBotPlan({ uid, cls: CL[(${game} + i) % 5], i, ids, L, zone, dayNo: ${day}, lvl, v2: true, v3: true, fair: true, pick: true, ranks: {}, sup: true, defV2: true });
    return Object.assign(p, { pid: uid, name: uid, color: "#2f5fa8", castle: L.castles[i], level: lvl, trapV2: true, sdV2: true, wallV2: true, engV2: true, ordV2: true, itemV5: true, survV1: true, siegeV1: true }); });
  const opts = { N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: ${day} };
  const full = runBattle(JSON.parse(JSON.stringify(plans)), 4000 + ${game} * 31 + ${day}, { ...opts, fast: false }), fast = runBattle(JSON.parse(JSON.stringify(plans)), 4000 + ${game} * 31 + ${day}, { ...opts, fast: true });
  return { full, fast, plans, L }; })()`;
const GAMES = [[0, 2], [1, 4], [2, 6], [3, 7]];

test("every battle ends, ranks every lord once and plays the same fast and full", () => {
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { full, fast, plans } = ${WAR(g, d)}; return JSON.stringify({ dur: full.duration, max: SD_AT + SD_COUNT + SD_LEN + 1, places: full.results.map(x => x.place).sort((a, b) => a - b), n: plans.length, same: battleHash(full) === battleHash(fast) }); })()`));
    assert.ok(r.dur > 0 && r.dur <= r.max, `game ${g}: battle length ${r.dur}`);
    assert.deepEqual(r.places, [...Array(r.n)].map((_, i) => i + 1), `game ${g}: places`);
    assert.ok(r.same, `game ${g}: fast and full runs disagree`);
  }
});

test("no position is ever lost or off the map", () => {
  for (const [g, d] of GAMES) {
    const bad = sim.run(`(() => { const { full, L } = ${WAR(g, d)}; let bad = 0; full.frames.forEach(f => { for (let i = 0; i + 3 < f.d.length; i += 4) { if (f.d[i + 3] & 1) continue; const x = f.d[i], y = f.d[i + 1]; if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > L.N || y > L.N) bad++; } }); return bad; })()`);
    assert.equal(bad, 0, `game ${g}`);
  }
});

test("no lord fields more traps or towers than allowed", () => {
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { full } = ${WAR(g, d)}; const tr = {}, tw = {}; (full.traps || []).forEach(t => { if (!t.ranger) tr[t.pid] = (tr[t.pid] || 0) + 1; }); full.meta.forEach(m => { if (m.key && UNITS[m.key] && UNITS[m.key].tower) tw[m.pid] = (tw[m.pid] || 0) + 1; }); return JSON.stringify({ tr: Math.max(0, ...Object.values(tr)), tw: Math.max(0, ...Object.values(tw)), TRAP_CAP, TOWER_CAP }); })()`));
    assert.ok(r.tr <= r.TRAP_CAP, `game ${g}: ${r.tr} traps`); assert.ok(r.tw <= r.TOWER_CAP, `game ${g}: ${r.tw} towers`);
  }
});

test("sudden death: nobody leaves the ring, towers sit it out, and the armies are spread evenly", () => {
  let reached = 0;
  for (const [g, d] of GAMES) {
    const r = JSON.parse(tough.run(`(() => { const { full, L } = ${WAR(g, d)}; const sd = full.sudden; if (!sd) return JSON.stringify({ sd: 0 });
      const cx = L.N / 2, cy = L.N / 2; let out = 0, towers = 0;
      full.frames.forEach(f => { if (f.t < sd.go) return; full.meta.forEach((m, j) => { const i = j * 4; if (m.kind === "castle" || f.d.length <= i + 3 || (f.d[i + 3] & 1)) return; if (m.key && UNITS[m.key] && UNITS[m.key].tower) { towers++; return; } if (Math.hypot(f.d[i] - cx, f.d[i + 1] - cy) > sd.r + .05) out++; }); });
      const f0 = full.frames.find(f => f.t >= sd.t0), angs = [];
      [...new Set(full.meta.map(m => m.pid))].forEach(pid => { const pts = []; full.meta.forEach((m, j) => { const i = j * 4; if (m.pid !== pid || m.kind === "castle" || f0.d.length <= i + 3 || (f0.d[i + 3] & 1)) return; pts.push([f0.d[i], f0.d[i + 1]]); }); if (pts.length) angs.push(Math.atan2(pts.reduce((s, p) => s + p[1], 0) / pts.length - cy, pts.reduce((s, p) => s + p[0], 0) / pts.length - cx)); });
      angs.sort((a, b) => a - b); const gaps = angs.map((a, k) => (k + 1 < angs.length ? angs[k + 1] : angs[0] + 2 * Math.PI) - a);
      return JSON.stringify({ sd: 1, out, towers, spread: angs.length > 1 ? (Math.max(...gaps) - Math.min(...gaps)) * 180 / Math.PI : 0 }); })()`));
    if (!r.sd) continue; reached++;
    assert.equal(r.out, 0, `game ${g}: units outside the ring`); assert.equal(r.towers, 0, `game ${g}: towers in sudden death`);
    assert.ok(r.spread < 3, `game ${g}: armies unevenly spaced (${r.spread.toFixed(1)}° between the widest and narrowest gaps)`);
  }
  assert.ok(reached >= 2, "too few battles reached sudden death to check it");
});
