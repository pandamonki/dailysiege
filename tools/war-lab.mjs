// War lab: plays whole seven-day wars between bot lords through the real game code (fightDay in js/net/world.js),
// under the rules for battles from 16 Nov 2026, and prints battle length, how battles end, when castles fall,
// win rates by hero, seat and bot style, and how the leaderboard behaves over the week.
//   node tools/war-lab.mjs [wars, default 20] [lord counts, default 6,8,10,12]
//   JSON=1 prints the numbers as JSON instead (for comparing trials)
// Bots are paid and spend like lords: base pay, castle income, their real spoils and bounties, and catch-up gold.
//   PATCH=file.json trials a change without touching the game: a list of { file, find, replace } text swaps applied in memory as the game loads
//   (find is plain text and must occur in the file; every occurrence is swapped)
//   DUMP=name prints a global the patched game filled in while it ran (for probes)
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { ROOT, SIM_FILES, WORLD_FILES } from "./load-sim.mjs";

const patches = process.env.PATCH ? JSON.parse(readFileSync(process.env.PATCH, "utf8")) : [];
const sim = (() => { // the same loader as functions/lib/game.js, plus the text swaps
  const context = vm.createContext({ console }), used = new Set();
  for (const rel of [...SIM_FILES, ...WORLD_FILES.filter(f => !SIM_FILES.includes(f))]) {
    let src = readFileSync(path.join(ROOT, rel), "utf8");
    patches.forEach((p, i) => { if (p.file !== rel) return; if (!src.includes(p.find)) throw new Error(`PATCH ${i}: text not found in ${rel}: ${p.find}`); src = src.split(p.find).join(p.replace); used.add(i); });
    vm.runInContext(src, context, { filename: rel });
  }
  patches.forEach((p, i) => { if (!used.has(i)) throw new Error(`PATCH ${i}: ${p.file} is not one of the game files`); });
  return { run: code => vm.runInContext(code, context), get: name => vm.runInContext(name, context) };
})();

const wars = +process.argv[2] || 20, sizes = (process.argv[3] || "6,8,10,12").split(",").map(Number), TARGET = +process.env.TARGET || 200;
const D1 = "2026-11-16", get = k => sim.get(k), fightDay = get("fightDay"), addDays = get("addDays"), heroes = Object.keys(get("CLASSES"));
const J = v => JSON.parse(JSON.stringify(v));
sim.run(`globalThis.__style = uid => BOT_STYLES[(botSeed(uid) >> 1) % BOT_STYLES.length].name; globalThis.__catch = (n, i) => catchUpGold(n, i); globalThis.__base = d => baseIncome(d);`);
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN, pct = v => Number.isNaN(v) ? "  -" : (100 * v).toFixed(0).padStart(3) + "%";
const board0 = (id, ids, pts) => ids.slice().sort((a, b) => pts[a] - pts[b]).indexOf(id) + 1; // place counted from the bottom
const out = {};
for (const n of sizes) {
  const TMAX = get("TMAX"), days = Array.from({ length: 7 }, () => ({ len: [], timeUp: 0, done: 0, standing: [], first: [], fallen: [], end: [], n: 0 }));
  const cls = {}, style = {}, seat = Array.from({ length: n }, () => ({ w: 0, pts: 0 })), weekRank = { cls: {}, style: {} };
  let lead3 = 0, lead5 = 0, spread = [], goldTop = [], goldBottom = [], swing = [], lastGain = []; const moved = [], leadChanges = [], climb = [];
  for (let w = 0; w < wars; w++) {
    const W = { config: { tz: "UTC", lockHour: 20, startDate: D1, maxPlayers: n }, players: {}, battles: {} }, ids = [];
    // bot names are shuffled into seats per war so a bot's style and seed are not tied to one place on the map
    const order = Array.from({ length: n }, (_, i) => i + 1 + w * 3).map(k => "bot_" + k);
    order.forEach((id, i) => { ids.push(id); W.players[id] = { bot: true, fromWeek: "0000-00-00", joinedAt: i + 1, nick: id, real: "Bot", pending: false, state: { week: D1, cls: heroes[(w * 7 + i * 3 + Math.floor(i / heroes.length)) % heroes.length] } }; });
    const pts = Object.fromEntries(ids.map(id => [id, 0])), gold = Object.fromEntries(ids.map(id => [id, 0])), at3 = {}, at5 = {}; let prevBoard = null, lc = 0, d3Bottom = null;
    for (let d = 1; d <= 7; d++) {
      const key = addDays(D1, d - 1), doc = J(fightDay(W, key, d)); W.battles[key] = doc;
      const R = days[d - 1], falls = doc.results.filter(r => r.fellAt != null).map(r => r.fellAt), dur = Math.max(...falls, 0), standing = doc.results.length - falls.length;
      const len = standing > 1 ? TMAX : dur; if (standing <= 1) R.end.push(dur); R.n++; R.len.push(len); if (standing > 1) R.timeUp++; if (standing <= 1 && len <= TARGET) R.done++;
      R.standing.push(standing); if (falls.length) R.first.push(Math.min(...falls)); R.fallen.push(falls.filter(f => f <= TARGET).length / (n - 1));
      const before = { ...pts };
      doc.results.forEach(r => { const p = W.players[r.pid], c = p.state.cls, s = sim.run(`__style(${JSON.stringify(r.pid)})`), i = ids.indexOf(r.pid);
        for (const [o, k] of [[cls, c], [style, s]]) { const q = o[k] = o[k] || { n: 0, w: 0, pts: 0 }; q.n++; q.pts += r.points; if (r.place === 1) q.w++; }
        seat[i].pts += r.points; if (r.place === 1) seat[i].w++; pts[r.pid] += r.points; gold[r.pid] += doc.gold[r.pid] || 0; });
      const board = ids.slice().sort((a, b) => pts[a] - pts[b]); // bottom first
      board.forEach((id, i) => { gold[id] += sim.run(`__base(${d}) + __catch(${n}, ${i})`); });
      { const nb = board.slice().reverse(); if (prevBoard) { moved.push(avg(ids.map(id => Math.abs(prevBoard.indexOf(id) - nb.indexOf(id))))); if (prevBoard[0] !== nb[0]) lc++; } prevBoard = nb; if (d === 3) d3Bottom = board.slice(0, Math.max(1, Math.round(n * .3))); }
      if (d === 3) Object.assign(at3, { lead: board[n - 1] }); if (d === 5) Object.assign(at5, { lead: board[n - 1] });
      if (d === 7) { const ob = ids.slice().sort((a, b) => before[b] - before[a]), nb = board.slice().reverse(); swing.push(avg(ids.map(id => Math.abs(ob.indexOf(id) - nb.indexOf(id))))); lastGain.push((pts[nb[0]] - before[nb[0]]) / Math.max(1, pts[nb[0]])); }
    }
    const fin = ids.slice().sort((a, b) => pts[b] - pts[a]);
    leadChanges.push(lc); climb.push(avg(d3Bottom.map(id => board0(id, ids, pts) - (d3Bottom.indexOf(id) + 1)))); // places the day-3 bottom 30% gained by the end of the week
    if (fin[0] === at3.lead) lead3++; if (fin[0] === at5.lead) lead5++;
    spread.push(pts[fin[n - 1]] / Math.max(1, pts[fin[0]])); goldTop.push(gold[fin[0]]); goldBottom.push(gold[fin[n - 1]]);
    fin.forEach((id, i) => { const c = W.players[id].state.cls, s = sim.run(`__style(${JSON.stringify(id)})`); for (const [o, k] of [[weekRank.cls, c], [weekRank.style, s]]) { const q = o[k] = o[k] || { n: 0, r: 0, w: 0 }; q.n++; q.r += i + 1; if (i === 0) q.w++; } });
  }
  const all = days.reduce((a, R) => ({ len: a.len.concat(R.len), timeUp: a.timeUp + R.timeUp, done: a.done + R.done, n: a.n + R.n, fallen: a.fallen.concat(R.fallen) }), { len: [], timeUp: 0, done: 0, n: 0, fallen: [] });
  out[n] = { len: avg(all.len), timeUp: all.timeUp / all.n, done: all.done / all.n, fallen: avg(all.fallen), byDay: days.map(R => ({ len: avg(R.len), timeUp: R.timeUp / R.n, done: R.done / R.n, standing: avg(R.standing), first: avg(R.first), fallen: avg(R.fallen) })),
    cls: Object.fromEntries(Object.entries(cls).map(([k, q]) => [k, { win: q.w / q.n, pts: q.pts / q.n }])), style: Object.fromEntries(Object.entries(style).map(([k, q]) => [k, { win: q.w / q.n, pts: q.pts / q.n }])),
    seatWins: seat.map(s => s.w), seatPts: seat.map(s => s.pts / wars / 7), weekCls: Object.fromEntries(Object.entries(weekRank.cls).map(([k, q]) => [k, { rank: q.r / q.n, win: q.w / q.n }])), weekStyle: Object.fromEntries(Object.entries(weekRank.style).map(([k, q]) => [k, { rank: q.r / q.n, win: q.w / q.n }])),
    lead3: lead3 / wars, lead5: lead5 / wars, spread: avg(spread), goldTop: avg(goldTop), goldBottom: avg(goldBottom), swing: avg(swing), lastGain: avg(lastGain), moved: avg(moved), leadChanges: avg(leadChanges), climb: avg(climb) };
  if (process.env.JSON) continue;
  const o = out[n];
  console.log(`\n${n} lords, ${wars} wars of 7 days (time limit ${TMAX}s, target ${TARGET}s)`);
  console.log(`  all days: average length ${o.len.toFixed(0)}s · finished by ${TARGET}s ${pct(o.done)} · ran to the time limit ${pct(o.timeUp)} · castles down by ${TARGET}s ${pct(o.fallen)}`);
  console.log("  day | length | finished by target | at time limit | castles left | first fall | castles down by target");
  o.byDay.forEach((R, i) => console.log(`   ${i + 1}  | ${R.len.toFixed(0).padStart(4)}s  |      ${pct(R.done)}         |    ${pct(R.timeUp)}       |    ${R.standing.toFixed(1).padStart(4)}      |  ${R.first.toFixed(0).padStart(4)}s    |   ${pct(R.fallen)}`));
  const line = (o2, f) => Object.entries(o2).sort().map(([k, q]) => `${k} ${f(q)}`).join(" · ");
  console.log(`  battle wins by hero (fair ${pct(1 / n)}): ` + line(o.cls, q => pct(q.win) + " (" + q.pts.toFixed(1) + " pts)"));
  console.log(`  battle wins by bot style (fair ${pct(1 / n)}): ` + line(o.style, q => pct(q.win) + " (" + q.pts.toFixed(1) + " pts)"));
  console.log(`  week: average final place by hero: ` + line(o.weekCls, q => q.rank.toFixed(1) + " (wins " + pct(q.win) + ")"));
  console.log(`  week: average final place by bot style: ` + line(o.weekStyle, q => q.rank.toFixed(1) + " (wins " + pct(q.win) + ")"));
  console.log(`  battle wins by seat (fair ${(wars * 7 / n).toFixed(1)}): ` + o.seatWins.join(" ") + `   points a day by seat: ` + o.seatPts.map(p => p.toFixed(1)).join(" "));
  console.log(`  board: day-3 leader wins the week ${pct(o.lead3)} · day-5 leader wins ${pct(o.lead5)} · last place ends with ${pct(o.spread)} of the winner's points · places moved on day 7: ${o.swing.toFixed(1)} · share of the winner's points scored on day 7: ${pct(o.lastGain)}`);
  console.log(`  board movement: a lord moves ${o.moved.toFixed(2)} places a day on average · the lead changes hands ${o.leadChanges.toFixed(1)} times a week · the bottom 30% on day 3 climb ${o.climb.toFixed(1)} places by day 7`);
  console.log(`  gold over the week (base pay + spoils + catch-up): winner ${o.goldTop.toFixed(0)} · last place ${o.goldBottom.toFixed(0)}`);
}
if (process.env.JSON) console.log(JSON.stringify(out));
if (process.env.DUMP) console.log(JSON.stringify(sim.run(`globalThis.${process.env.DUMP}`)));
