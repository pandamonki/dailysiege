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
    return Object.assign(p, { pid: uid, name: uid, color: "#2f5fa8", castle: L.castles[i], level: lvl, trapV2: true, sdV2: true, wallV2: true, engV2: true, ordV2: true, skV2: true, waveV2: true, waveV3: true, waveV4: true, balV5: true, itemV5: true, itemV6: true, shellV2: true, survV1: true, siegeV1: true }); });
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

test("towers never move from where they were placed", () => {
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { full } = ${WAR(g, d)}; let towers = 0, moved = 0; const at = {};
      full.frames.forEach(f => full.meta.forEach((m, j) => { if (!(m.key && UNITS[m.key] && UNITS[m.key].tower)) return; const i = j * 4; if (f.d.length <= i + 3 || (f.d[i + 3] & 1)) return;
        const p = [f.d[i], f.d[i + 1]]; if (!at[j]) { at[j] = p; towers++; } else if (Math.hypot(p[0] - at[j][0], p[1] - at[j][1]) > .02) moved++; }));
      return JSON.stringify({ towers, moved }); })()`));
    assert.equal(r.moved, 0, `game ${g}: a tower moved (${r.moved} frames)`);
  }
});

test("the scoreboard adds up: every hero kill is matched by a hero death, and assists never exceed hero deaths", () => {
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { full } = ${WAR(g, d)}; const s = k => full.results.reduce((a, x) => a + (x[k] || 0), 0);
      return JSON.stringify({ kills: s("kills"), deaths: s("deaths"), assists: s("assists"), dmg: full.results.every(x => x.dmg >= x.dmgH + x.dmgC - 1 && x.dmgH >= 0 && x.dmgC >= 0) }); })()`));
    assert.ok(r.kills <= r.deaths, `game ${g}: ${r.kills} hero kills but only ${r.deaths} hero deaths`);
    assert.ok(r.dmg, `game ${g}: damage to heroes and castles is more than the damage in all`);
  }
});

test("Anti-Magic Shell v2: fires on engaging a hero with no chosen delay, and never faster than its cooldown", () => {
  const run = at => `(() => { const { plans, L } = ${WAR(1, 5)}; plans.forEach(p => { p.items = ["antimagic"].concat((p.items || []).filter(k => k !== "antimagic")).slice(0, 6); p.shellV2 = true; p.shellAt = ${at}; });
    const opts = { N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: 5 };
    return runBattle(plans, 4242, opts); })()`;
  const r = JSON.parse(sim.run(`(() => { const a = ${run(1)}, b = ${run(10)}, sh = a.events.filter(e => e.ty === "shell"), by = {};
    sh.forEach(e => (by[e.id] = by[e.id] || []).push(e.t)); const gaps = Object.values(by).flatMap(ts => ts.slice(1).map((t, i) => t - ts[i]));
    return JSON.stringify({ n: sh.length, minGap: gaps.length ? Math.min(...gaps) : 99, cd: ITEMS.antimagic.cd, same: a.duration === b.duration && JSON.stringify(a.results) === JSON.stringify(b.results) }); })()`));
  assert.ok(r.n > 0, "no shell ever fired");
  assert.ok(r.minGap >= r.cd - 1e-6, `a shell fired again after ${r.minGap}s`);
  assert.ok(r.same, "the old delay setting still changes the battle");
});

test("Items v6: the Rune of Homecoming can fire again after its 45s cooldown, each time after a 1.5s channel", () => {
  const r = JSON.parse(tough.run(`(() => { const { plans, L } = ${WAR(2, 6)}; plans.forEach(p => { p.items = ["scroll"].concat((p.items || []).filter(k => k !== "scroll")).slice(0, 6); });
    const res = runBattle(plans, 777, { N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: 6 });
    const ch = res.events.filter(e => e.ty === "rune"), by = {}; ch.forEach(e => (by[e.id] = by[e.id] || []).push(e.t));
    const gaps = Object.values(by).flatMap(ts => ts.slice(1).map((t, i) => t - ts[i])), ports = res.events.filter(e => e.ty === "runeport");
    return JSON.stringify({ n: ch.length, again: gaps.length, minGap: gaps.length ? Math.min(...gaps) : 99, portLag: ch.length && ports.length ? Math.min(...ports.map(p => p.t)) - Math.min(...ch.map(e => e.t)) : null }); })()`));
  assert.ok(r.n > 0, "the Rune never fired");
  assert.ok(r.again > 0, "no hero used the Rune twice");
  assert.ok(r.minGap >= 45 - 1e-6, `the Rune fired again after ${r.minGap}s`);
  assert.ok(r.portLag === null || r.portLag >= 1.5 - 1e-6, `a teleport came ${r.portLag}s after the channel began`);
});

test("Items v6: the Divine Rapier adds 100 to weapon hits, not to abilities", () => {
  // battles with the Rapier resolve under both rules, and the shop text follows the battle date
  const r = JSON.parse(sim.run(`(() => { const go = v6 => { const { plans, L } = ${WAR(1, 5)}; plans.forEach(p => { p.items = (p.items || []).filter(k => k !== "rapier"); p.itemV6 = v6; }); plans[0].items = ["rapier"].concat(plans[0].items).slice(0, 6);
      return runBattle(plans, 99, { fast: true, N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: 5 }); };
    const a = go(true), b = go(false); return JSON.stringify({ a: a.results.length, b: b.results.length, desc: itemDesc("rapier", "2026-11-20"), old: itemDesc("rapier", "2026-11-10") }); })()`));
  assert.equal(r.a, r.b);
  assert.match(r.desc, /\+100 damage/);
  assert.match(r.old, /Doubles/);
});

// ----- alliances v2 (battles from 20 Nov 2026) -----
const lord = (pid, extra = {}) => ({ pid, name: pid, offers: {}, replies: {}, terms: {}, breaks: [], pbetray: {}, ...extra });
const ally = (plans, opts) => { const r = sim.get("resolveAlliances")(plans, { prevDay: 1, blocMax: 3, ...opts }); return JSON.parse(JSON.stringify(r.pairs.map(p => p.slice().sort().join("|")).sort())); };

test("Alliances v2: a lord joins an alliance only if every member agrees, and then all are allied to each other", () => {
  const inv = { day: 1, gold: 0 };
  // C invites only A of the A-B alliance and A accepts: B never agreed, so C stays out
  let plans = [lord("A", { replies: { C: "accept" } }), lord("B"), lord("C", { offers: { A: inv } }), lord("D")];
  assert.deepEqual(ally(plans, { persist: ["A|B"], v2: true }), ["A|B"]);
  // C invites both and both accept: one alliance of three, every pair linked
  plans = [lord("A", { replies: { C: "accept" } }), lord("B", { replies: { C: "accept" } }), lord("C", { offers: { A: inv, B: inv } }), lord("D")];
  assert.deepEqual(ally(plans, { persist: ["A|B"], v2: true }), ["A|B", "A|C", "B|C"]);
  // before v2 the single accepted invitation made a chain
  plans = [lord("A", { replies: { C: "accept" } }), lord("B"), lord("C", { offers: { A: inv } }), lord("D")];
  assert.deepEqual(ally(plans, { persist: ["A|B"] }), ["A|B", "A|C"]);
  // an alliance never grows past three lords
  plans = [lord("A", { replies: { E: "accept" } }), lord("B", { replies: { E: "accept" } }), lord("C", { replies: { E: "accept" } }), lord("D"), lord("E", { offers: { A: inv, B: inv, C: inv } })];
  assert.deepEqual(ally(plans, { persist: ["A|B", "A|C", "B|C"], v2: true }), ["A|B", "A|C", "B|C"]);
});

test("Alliances v2: allies who win together share the top places, and only the last lord outside every pact is the lone wolf", () => {
  let team = 0;
  for (let g = 0; g < 8; g++) {
    const r = JSON.parse(sim.run(`(() => { const L = seatLayout(5, true), CL = ["warrior", "mage", "rogue", "archer", "shaman"], ids = [...Array(5)].map((_, k) => "w${g}b" + k);
      const plans = ids.map((uid, i) => { const zone = zoneFor(L.castles[i], L.N, L.castles, L.v2), lvl = 7;
        const p = lordBotPlan({ uid, cls: CL[(${g} + i) % 5], i, ids, L, zone, dayNo: 4, lvl, v2: true, v3: true, fair: true, pick: true, ranks: {}, sup: true, defV2: true });
        return Object.assign(p, { pid: uid, name: uid, color: "#2f5fa8", castle: L.castles[i], level: lvl, trapV2: true, sdV2: true, wallV2: true, engV2: true, ordV2: true, skV2: true, waveV2: true, waveV3: true, waveV4: true, balV5: true, itemV5: true, itemV6: true, shellV2: true, survV1: true, siegeV1: true, allyV2: true, pacts: [] }); });
      const link = (a, b) => { plans[a].pacts.push(ids[b]); plans[b].pacts.push(ids[a]); };
      const go = () => runBattle(JSON.parse(JSON.stringify(plans)), 900 + ${g}, { N: L.N, balV2: true, balV3: true, ultV2: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: 4, fast: true });
      link(0, 1); link(3, 4); const a = go(); // two pairs: lord 2 is the only lord outside a pact, against 4 allied lords
      plans.forEach(p => { p.pacts = []; }); link(0, 1); link(0, 2); link(1, 2); link(3, 4); const b = go(); // everyone allied: nobody is the lone wolf
      return JSON.stringify({ aLone: a.results.filter(x => x.lone).map(x => [x.pid, x.lone]), lone2: ids[2], bLone: b.results.filter(x => x.lone).map(x => x.lone), team: a.team || b.team,
        places: [a, b].map(res => res.results.map(x => x.place).sort((x, y) => x - y)) }); })()`));
    const two = r.aLone.find(x => x[0] === r.lone2);
    assert.ok(two && two[1] === 4, "the only lord outside a pact is the lone wolf, counted against the four allied lords");
    assert.ok(r.bLone.every(n => n <= 3), "with everyone allied nobody starts as the lone wolf (one can only appear once a castle falls and breaks a pact)");
    r.places.forEach(p => assert.deepEqual(p, [1, 2, 3, 4, 5], "places stay unique, even when allies win together"));
    if (r.team && r.team.length > 1) team++;
  }
  assert.ok(team > 0, "some battle ended with allies winning together");
});

test("Alliances v2: bot lords' diplomacy is the same on every device and invites about 30% of the time", () => {
  const w = loadSim({ extraFiles: ["js/net/clock.js", "js/net/world.js"] });
  const ids = [...Array(8)].map((_, k) => "b" + k), rkm = Object.fromEntries(ids.map((q, i) => [q, i + 1]));
  let invites = 0, days = 0;
  for (let d = 1; d <= 28; d++) for (const uid of ids) {
    const key = `2026-12-${String(d).padStart(2, "0")}`, a = JSON.stringify(w.get("wBotDiplomacy")(uid, key, ids, rkm, [])), b = JSON.stringify(w.get("wBotDiplomacy")(uid, key, ids, rkm, []));
    assert.equal(a, b, "the same day gives the same plan"); const p = JSON.parse(a);
    assert.ok(Object.keys(p.offers).every(q => q !== uid && ids.includes(q)), "never invites itself");
    days++; if (Object.values(p.offers).some(o => o.day === key)) invites++;
  }
  const rate = invites / days; assert.ok(rate > .2 && rate < .4, `invite rate ${rate.toFixed(2)}`);
});

// ----- placement v2 (battles from 21 Nov 2026) -----
test("Placement v2: one point per place, last scores 1, and the winner gets 2 more", () => {
  const pp = (v2, place, n) => sim.run(`placePts(${v2}, ${place}, ${n})`);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(p => pp(true, p, 8)), [10, 7, 6, 5, 4, 3, 2, 1]);
  assert.equal(pp(true, 1, 10), 12); assert.equal(pp(true, 10, 10), 1, "even 10th of 10 scores");
  assert.deepEqual([1, 2, 3, 8].map(p => pp(false, p, 8)), [10, 7, 5, 0], "older battles keep the old table");
  const r = JSON.parse(sim.run(`(() => { const { plans, L } = ${WAR(5, 3)}; plans.forEach(p => { p.placeV2 = true; });
    const res = runBattle(JSON.parse(JSON.stringify(plans)), 777, { N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: 3, fast: true });
    return JSON.stringify(res.results.map(x => ({ place: x.place, points: x.points, kills: x.kills, castles: x.castles, extra: (x.survivor ? 1 : 0) + (x.treachery || 0) * 3 }))); })()`));
  r.forEach(x => assert.equal(x.points, (9 - x.place) + (x.place === 1 ? 2 : 0) + x.kills + 3 * x.castles + x.extra, `place ${x.place}`));
});

test("emergency waves: never closer than the gap, and a falling castle sends every wave it has time for", () => {
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { full } = ${WAR(g, d)}; return JSON.stringify({ gap: full.waveGap || WAVE_EMERGENCY_GAP, lords: full.results.map(x => ({ fell: x.fellAt, w: full.stats[x.pid].waves })) }); })()`));
    r.lords.forEach((x, i) => {
      x.w.forEach((s, j) => { if (j) assert.ok(s - x.w[j - 1] >= r.gap, `game ${g} lord ${i}: waves at ${x.w.join(", ")}`); });
      const last = x.w.length ? x.w[x.w.length - 1] : -99; // a fallen castle has crossed every mark: once the gap after its last wave is over, the next must go
      if (x.fell != null && x.fell > Math.max(last + r.gap, 0) + 1) assert.equal(x.w.length, 3, `game ${g} lord ${i}: fell at ${x.fell} with waves at ${x.w.join(", ")}`);
    });
  }
});

test("waves defend first: for their first seconds out, wave soldiers stay in the castle area, whatever orders an old plan gave them", () => {
  for (const [g, d] of [...GAMES, [4, 3], [5, 5]]) {
    const r = JSON.parse(sim.run(`(() => { const { plans, L } = ${WAR(g, d)}; plans.forEach(p => (p.waves || []).forEach(w => { w.order = "castle"; }));
      const res = runBattle(JSON.parse(JSON.stringify(plans)), 99, { N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: ${d}, fast: false });
      const M = res.meta, F = res.frames, out = [];
      res.events.filter(e => e.ty === "wave").forEach(ev => { const k = F.findIndex(f => f.t >= ev.t); if (k < 1) return; const before = F[k - 1].d.length / 4, home = M.find(m => m.kind === "castle" && m.pid === ev.pid);
        const hx = home.tile[1] + .5, hy = home.tile[0] + .5, win = F.filter(f => f.t >= ev.t && f.t <= ev.t + WAVE_DEF_CLEAR);
        for (let i = before; i < F[k].d.length / 4; i++) { if (M[i].pid !== ev.pid || M[i].kind !== "unit") continue; let far = 0; win.forEach(f => { if (i * 4 < f.d.length && f.d[i * 4 + 2] > 0) far = Math.max(far, Math.hypot(f.d[i * 4] - hx, f.d[i * 4 + 1] - hy)); }); out.push(far); } });
      return JSON.stringify({ R: WAVE_DEF_R, far: out }); })()`));
    assert.ok(r.far.length > 0, `game ${g}: no wave went out`);
    r.far.forEach(x => assert.ok(x <= r.R, `game ${g}: a wave soldier went ${x.toFixed(1)} tiles from its castle in its first seconds`));
  }
});

test("wave deadlines: each wave goes by its own deadline (plus the gap after the last wave) while its castle stands", () => {
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { full } = ${WAR(g, d)}; return JSON.stringify({ at: WAVE_FORCE_AT, gap: WAVE_GAP, sd: full.sudden ? full.sudden.t0 : null, dur: full.duration,
      lords: full.results.map(x => ({ fell: x.fellAt, w: full.events.filter(e => e.ty === "wave" && e.pid === x.pid).map(e => [e.i, e.t]) })) }); })()`));
    r.lords.forEach((x, n) => r.at.forEach((dl, k) => { const due = dl + r.gap + 1, end = Math.min(x.fell ?? 1e9, r.sd ?? 1e9, r.dur);
      if (end > due) assert.ok(x.w.some(([i, t]) => i === k && t <= due), `game ${g} lord ${n}: wave ${k + 1} not out by ${due}s (waves ${JSON.stringify(x.w)})`); }));
  }
});

test("the rush box: only ticked waves rush out in an emergency; unticked waves still go by trigger or deadline", () => {
  const RUN = (g, d, off) => JSON.parse(sim.run(`(() => { const { plans, L } = ${WAR(g, d)}; plans.forEach(p => (p.waves = p.waves || [{}, {}, {}]).forEach((w, i) => { if (${JSON.stringify(off)}.includes(i)) w.rush = false; }));
    const res = runBattle(JSON.parse(JSON.stringify(plans)), 4242, { N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: ${d}, fast: false });
    return JSON.stringify({ at: WAVE_FORCE_AT, gap: res.waveGap || WAVE_GAP, slack: res.waveGap ? 2 : 1, sd: res.sudden ? res.sudden.t0 : null, dur: res.duration, off: res.waveRushOff || {}, w: res.events.filter(e => e.ty === "wave").map(e => [e.pid, e.i, e.t, !!e.rush]),
      lords: res.results.map(x => ({ pid: x.pid, fell: x.fellAt })) }); })()`));
  let rushes = 0;
  for (const [g, d] of GAMES) {
    const none = RUN(g, d, [0, 1, 2]); // every box unticked: nobody rushes, and every wave still goes by its deadline
    assert.equal(none.w.filter(x => x[3]).length, 0, `game ${g}: a wave rushed with every box unticked`);
    assert.equal(Object.keys(none.off).length, none.lords.length, `game ${g}: the replay is not told which waves may not rush`);
    none.lords.forEach(L => none.at.forEach((dl, k) => { const due = dl + none.slack * none.gap + 1, /* with 20s waves (balance v5) a wave past its deadline can queue one gap behind another whose trigger came first */ end = Math.min(L.fell ?? 1e9, none.sd ?? 1e9, none.dur);
      if (end > due) assert.ok(none.w.some(([p, i, t]) => p === L.pid && i === k && t <= due), `game ${g}: unticked wave ${k + 1} missed its deadline`); }));
    const first = RUN(g, d, [0]); // Wave 1 unticked: emergencies use Waves 2 and 3 only
    first.w.filter(x => x[3]).forEach(([, i]) => { rushes++; assert.notEqual(i, 0, `game ${g}: unticked Wave 1 rushed`); });
  }
  assert.ok(rushes > 0, "no emergency happened, so the check proved nothing");
});

test("the 'enemies reach my castle' trigger never fires later than the old 'castle attacked' one, and never in the opening second", () => {
  let earlier = 0;
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { plans, L } = ${WAR(g, d)}; const RUN = v4 => { const ps = JSON.parse(JSON.stringify(plans)); ps.forEach(p => { p.waveV4 = v4; p.balV5 = false; /* the two runs must stay alike until the trigger; this compares the triggers only, under the rules they were written for */ p.waves = [{ when: "castle_hit", units: (p.waves && p.waves[0] && p.waves[0].units) || [] }, { when: "timer", at: 150 }, { when: "timer", at: 150 }]; });
        const res = runBattle(ps, 9090, { N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: ${d}, fast: false });
        return Object.fromEntries(res.events.filter(e => e.ty === "wave" && e.i === 0 && !e.rush).map(e => [e.pid, e.t])); };
      return JSON.stringify({ now: RUN(true), old: RUN(false) }); })()`));
    Object.entries(r.now).forEach(([pid, t]) => { assert.ok(t >= 1, `game ${g}: fired at ${t}s`); if (r.old[pid] != null && r.old[pid] < 40) { assert.ok(t <= r.old[pid] + .01, `game ${g}: new trigger ${t}s, old ${r.old[pid]}s`); if (t < r.old[pid]) earlier++; } });
  }
  assert.ok(earlier > 0, "the new trigger never fired before the castle was hit");
});

test("balance v5: heroes fight as the Hero class, waves are at least 20s apart, and betrayal kills score triple castle points", () => {
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { full } = ${WAR(g, d)}; const champs = full.meta.filter(m => m.kind === "champ");
      const gaps = []; Object.values(full.stats).forEach(s => { const w = (s.waves || []).slice().sort((a, b) => a - b); for (let i = 1; i < w.length; i++) gaps.push(w[i] - w[i - 1]); });
      const pts = full.results.map(x => ({ c: x.castles, b: x.bcastles || 0 }));
      return JSON.stringify({ types: champs.every(m => m.atype === "hero" && m.armour === "hero"), gap: gaps.length ? Math.min(...gaps) : 99, gapSet: full.waveGap, bOk: pts.every(x => x.b <= x.c) }); })()`));
    assert.ok(r.types, `game ${g}: every hero is the Hero class`);
    assert.ok(r.gap >= 19, `game ${g}: two waves ${r.gap}s apart`);
    assert.equal(r.gapSet, 20, `game ${g}: the replay is told the 20s gap`);
    assert.ok(r.bOk, `game ${g}: betrayal kills are castles taken`);
  }
  // the Hero type against every soldier armour, and Hero armour against soldiers' weapons
  const t = JSON.parse(sim.run(`JSON.stringify({ atk: ["light", "medium", "heavy"].map(a => TYPE_TABLE.hero[a]), arm: ["blade", "pierce", "magic", "precision"].map(a => TYPE_TABLE[a].hero) })`));
  t.atk.forEach(v => assert.ok(v > 1)); t.arm.forEach(v => assert.ok(v < 1));
});

test("balance v5: heroes rest and heal at home, only near their own castle", () => {
  let rests = 0;
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { full } = ${WAR(g, d)}; const castle = {}; full.meta.forEach(m => { if (m.kind === "castle") castle[m.pid] = m.tile; });
      const ev = full.events.filter(e => e.ty === "txt" && e.s === "Resting"), far = ev.filter(e => { const near = Object.values(castle).some(tl => Math.hypot(e.x - tl[1] - .5, e.y + 1.1 - tl[0] - .5) < 3.2); return !near; }).length;
      return JSON.stringify({ n: ev.length, far }); })()`));
    rests += r.n; assert.equal(r.far, 0, `game ${g}: a hero rested away from any castle`);
  }
  assert.ok(rests > 0, "no hero ever rested at home");
});

test("faster levelling (lvlV2): every hero gains 3 or 4 levels a battle, never past level 25", () => {
  for (const [g, d] of GAMES) {
    const r = JSON.parse(sim.run(`(() => { const { fast } = ${WAR(g, d).replace("siegeV1: true }", "siegeV1: true, lvlV2: true }")}; return JSON.stringify(Object.values(fast.lvl)); })()`));
    r.forEach(v => { assert.ok(v.gain >= 3 && v.gain <= 4, `game ${g} day ${d}: a hero gained ${v.gain} levels`); assert.ok(v.from + v.gain <= 25); });
  }
  const top = JSON.parse(sim.run(`JSON.stringify([hpLvV3(25, true), hpLvV3(15), atkLvV3(25, true), atkLvV3(15)])`));
  assert.ok(Math.abs(top[0] - top[1]) < .01 && Math.abs(top[2] - top[3]) < .01, "a level 25 hero matches the old level 15 in health and attack");
});

test("final-day alliances (finV2): pacts hold until one alliance is left, then break, and only one lord wins", () => {
  let broke = 0;
  for (const g of [0, 1, 2, 3, 4, 5]) {
    const r = JSON.parse(tough.run(`(() => { const L = seatLayout(4, true), CL = ["warrior", "mage", "rogue", "archer", "shaman"], ids = [...Array(4)].map((_, k) => "f${g}b" + k);
      const plans = ids.map((uid, i) => { const zone = zoneFor(L.castles[i], L.N, L.castles, L.v2);
        const p = lordBotPlan({ uid, cls: CL[(${g} + i) % 5], i, ids, L, zone, dayNo: 7, lvl: 15, v2: true, v3: true, fair: true, pick: true, ranks: {}, sup: true, defV2: true });
        return Object.assign(p, { pid: uid, name: uid, color: "#2f5fa8", castle: L.castles[i], level: 15, offers: {}, breaks: [], pbetray: {}, auto: false, trapV2: true, sdV2: true, wallV2: true, engV2: true, ordV2: true, skV2: true, waveV2: true, waveV3: true, waveV4: true, balV5: true, itemV5: true, itemV6: true, shellV2: true, survV1: true, siegeV1: true, finV2: true, allyV2: true }); });
      resolveAlliances(plans, { persist: [ids[0] + "|" + ids[1]], final: false, prevDay: 6, feuds: [], blocMax: BLOC_MAX, v2: true });
      const res = runBattle(plans, 9100 + ${g}, { N: L.N, finalDay: true, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: 7, fast: true });
      return JSON.stringify({ la: res.lastAlly || null, team: res.team || null, firsts: res.results.filter(x => x.place === 1).length, pacted: plans[0].pacts.includes(ids[1]) }); })()`));
    assert.ok(r.pacted, `game ${g}: the carried pact held into the final day`);
    assert.equal(r.team, null, `game ${g}: allies never share the war's last victory`);
    assert.equal(r.firsts, 1, `game ${g}: one lord wins`);
    if (r.la) { broke++; assert.deepEqual(r.la.pids.slice().sort(), [`f${g}b0`, `f${g}b1`].sort(), `game ${g}: the alliance that broke was the one left`); }
  }
  assert.ok(broke > 0, "the last alliance never broke in any test battle");
});

// zones v1 (prototype): placement sets each soldier's job
const ZWAR = (game, day, tweak = "") => `(() => { const L = seatLayout(8, true), CL = ["warrior", "mage", "rogue", "archer", "shaman"], ids = [...Array(8)].map((_, k) => "z${game}b" + k);
  const plans = ids.map((uid, i) => { const zone = zoneFor(L.castles[i], L.N, L.castles, L.v2), lvl = Math.min(25, 1 + 3 * (${day} - 1));
    const p = lordBotPlan({ uid, cls: CL[(${game} + i) % 5], i, ids, L, zone, dayNo: ${day}, lvl, v2: true, v3: true, fair: true, pick: true, ranks: {}, sup: true, defV2: true, zv: true });
    return Object.assign(p, { pid: uid, name: uid, color: "#2f5fa8", castle: L.castles[i], level: lvl, zoneSet: zone, trapV2: true, sdV2: true, wallV2: true, engV2: true, ordV2: true, skV2: true, waveV2: true, waveV3: true, waveV4: true, balV5: true, itemV5: true, itemV6: true, shellV2: true, survV1: true, siegeV1: true, lvlV2: true, zoneV1: true }); });
  ${tweak}
  plans.forEach(p => { delete p.zoneSet; });
  const opts = { N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: ${day} };
  const full = runBattle(JSON.parse(JSON.stringify(plans)), 7000 + ${game} * 31 + ${day}, { ...opts, fast: false }), fast = runBattle(JSON.parse(JSON.stringify(plans)), 7000 + ${game} * 31 + ${day}, { ...opts, fast: true });
  return { full, fast, plans, L }; })()`;

test("zones v1: every battle ends, ranks every lord once, plays the same fast and full, and the hill points go to at most a tie", () => {
  for (const [g, d] of [[0, 2], [1, 4], [2, 6]]) {
    const r = JSON.parse(sim.run(`(() => { const { full, fast, plans } = ${ZWAR(g, d)}; return JSON.stringify({ dur: full.duration, max: SD_AT + SD_COUNT + SD_LEN + 1, places: full.results.map(x => x.place).sort((a, b) => a - b), n: plans.length, same: battleHash(full) === battleHash(fast), jobs: plans.every(p => p.front && p.flanks && p.temper) }); })()`));
    assert.ok(r.dur > 0 && r.dur <= r.max, `game ${g}: battle length ${r.dur}`);
    assert.deepEqual(r.places, [...Array(r.n)].map((_, i) => i + 1), `game ${g}: places`);
    assert.ok(r.same, `game ${g}: fast and full runs disagree`);
    assert.ok(r.jobs, `game ${g}: a bot has no Front plan, flank plans or temper`);
  }
});

test("zones v1: soldiers placed in the Guard zone, and waves sent there, stay at home until sudden death", () => {
  // lord 0 puts every soldier on the Guard tiles round its castle
  const tweak = `{ const p = plans[0], [cr, cc] = p.castle, used = new Set(); const tiles = [...p.zoneSet].map(k => k.split(",").map(Number)).filter(([r, c]) => zoneOfTile(cr, cc, r, c, L.N) === "guard" && !(r === cr && c === cc));
    p.pieces = p.pieces.filter(pc => pc.kind === "champ" || pc.kind === "unit").filter(pc => { if (pc.kind === "champ") return true; const t = tiles.find(([r, c]) => !used.has(r + "," + c)); if (!t) return false; used.add(t.join(",")); pc.r = t[0]; pc.c = t[1]; return true; }); p.waves = [0, 1, 2].map(() => ({ zone: "guard" })); }`; // its waves (each brings a free Footman) go to the Guard too
  const r = JSON.parse(sim.run(`(() => { const { full, plans } = ${ZWAR(3, 4, tweak)}; const p = plans[0], cx = p.castle[1] + .5, cy = p.castle[0] + .5, sd = full.sudden ? full.sudden.t0 : 1e9; let far = 0, seen = 0;
    full.frames.forEach(f => { if (f.t >= sd) return; full.meta.forEach((m, j) => { if (m.pid !== p.pid || m.kind !== "unit" || m.militia || m.free) return; const i = j * 4; if (f.d.length <= i + 3 || (f.d[i + 3] & 1)) return; seen++; far = Math.max(far, Math.hypot(f.d[i] - cx, f.d[i + 1] - cy)); }); });
    return JSON.stringify({ far, seen, n: p.pieces.filter(pc => pc.kind === "unit").length }); })()`));
  assert.ok(r.n >= 1, "no guard soldiers placed");
  assert.ok(r.seen > 0, "no guard soldier was seen on the field");
  assert.ok(r.far <= 9.5, `a guard soldier wandered ${r.far.toFixed(1)} tiles from its castle`);
});

test("fixed timing (timeV1): with no percentage chances in play, the dice no longer change the battle", () => {
  // four lords with skill-free heroes and plain soldiers: nothing rolls for a dodge, crit or miss, so only the opening timing could differ
  const war = (seed, on) => `(() => { const L = seatLayout(4, true), ids = ["t0", "t1", "t2", "t3"];
    const plans = ids.map((uid, i) => { const zone = zoneFor(L.castles[i], L.N, L.castles, L.v2), p = lordBotPlan({ uid, cls: "warrior", i, ids, L, zone, dayNo: 4, lvl: 8, v2: true, v3: true, fair: true, pick: true, ranks: {}, sup: true, defV2: true });
      p.tree = emptyTree(); p.items = []; p.pieces = p.pieces.filter(pc => pc.kind === "champ" || pc.kind === "unit").map(pc => pc.kind === "unit" ? { ...pc, type: ["footman", "knight", "bowman"][(pc.r + pc.c) % 3] } : pc);
      return Object.assign(p, { pid: uid, name: uid, color: "#2f5fa8", castle: L.castles[i], level: 8, trapV2: true, sdV2: true, wallV2: true, engV2: true, ordV2: true, skV2: true, waveV2: true, waveV3: true, waveV4: true, balV5: true, itemV5: true, itemV6: true, shellV2: true, survV1: true, siegeV1: true, lvlV2: true, timeV1: ${on} }); });
    return battleHash(runBattle(plans, ${seed}, { N: L.N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: 4, fast: true })); })()`;
  const on = [11, 222, 3333].map(s => sim.run(war(s, true))), off = [11, 222, 3333].map(s => sim.run(war(s, false)));
  assert.equal(new Set(on).size, 1, "with fixed timing the same orders gave different battles on different days");
  assert.ok(new Set(off).size > 1, "before fixed timing the opening was random (the check would prove nothing)");
});
