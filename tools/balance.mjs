// Balance lab from the command line: fights many random battles at several lord counts and prints
// how long battles last, how they end, and whether any hero or any seat on the map is favoured.
//   node tools/balance.mjs [battles per size, default 60] [lord counts, default 8,10,12]
// Every seat gets a random hero, army, gear and level, with no alliances, so the numbers compare fairly.
import { loadSim } from "./load-sim.mjs";

const sim = loadSim();
sim.run(`function labPlans(seed, n) {
  const rnd = mulberry(seed), pick = a => a[Math.floor(rnd() * a.length)], clsKeys = Object.keys(CLASSES), level = 1 + Math.floor(rnd() * 7), L = seatLayout(n);
  return L.castles.map((pos, i) => {
    const cls = pick(clsKeys), c = CLASSES[cls], sp = armySpots(pos, L.N);
    const units = sp.units.slice(0, 2 + Math.floor(rnd() * 2)).map(([r, cc]) => ({ kind: "unit", type: pick(UTYPES), lvl: 1 + Math.floor(rnd() * Math.min(3, 1 + level / 3)), hp: 1, r, c: cc }));
    const picks = {}; c.abilities.forEach(a => picks[a.key] = a.choice[rnd() > .5 ? 1 : 0][0]);
    const rot = Math.floor(rnd() * PRIORITIES.length), gt = () => Math.min(3, Math.floor(rnd() * (level / 2 + 1)));
    return { pid: "s" + i, me: i === 0, name: "Seat " + (i + 1), color: SEAT_COLORS[i % SEAT_COLORS.length], cls, level, castle: pos, ranks: autoRanks(level, Math.floor(rnd() * 1e4)), picks,
      triggers: { a1: pick(TRIGGERS.slice(0, 2)), a2: pick(TRIGGERS.slice(0, 3)), a3: pick(TRIGGERS.slice(0, 3)), ult: pick(TRIGGERS.slice(0, 2)) },
      gear: { weapon: gt(), armour: gt(), charm: gt() }, defences: { walls: rnd() < .3 ? 1 : 0, tower: rnd() < .3 ? 1 : 0 }, stance: pick(["aggressive", "skirmish", "cautious"]),
      prio: PRIORITIES.slice(rot).concat(PRIORITIES.slice(0, rot)), rules: [{ if: IFS[0], then: THENS[0] }], pieces: [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, ...units], pacts: [], hostile: [], betray: {} };
  });
}`);
const V2 = process.env.BAL_OLD ? false : true; // BAL_OLD=1 fights by the rules before 12 Nov 2026
const battles = +process.argv[2] || 60, sizes = (process.argv[3] || "8,10,12").split(",").map(Number), pct = v => (100 * v).toFixed(0).padStart(3) + "%";
for (const n of sizes) {
  const N = sim.run(`seatLayout(${n}).N`), cls = {}, seatWins = Array(n).fill(0), seatPts = Array(n).fill(0); let dur = 0, timeUp = 0, alive = 0, ms = 0, firstFall = 0;
  for (let i = 0; i < battles; i++) {
    const t0 = performance.now(), res = sim.run(`runBattle(labPlans(${9000 + i * 31}, ${n}), ${777 + i * 977}, { fast: true, N: ${N}, balV2: ${V2}, balV3: ${V2} })`); ms += performance.now() - t0;
    dur += res.duration; if (res.duration >= sim.get("TMAX")) timeUp++; alive += res.results.filter(r => r.fellAt == null).length;
    firstFall += Math.min(...res.results.map(r => r.fellAt ?? res.duration));
    res.results.forEach(r => { const c = cls[r.cls] = cls[r.cls] || { n: 0, w: 0 }; c.n++; if (r.place === 1) c.w++; const s = +r.pid.slice(1); seatPts[s] += r.points; if (r.place === 1) seatWins[s]++; });
  }
  console.log(`\n${n} lords on a ${N}x${N} field, ${battles} battles (${(ms / battles).toFixed(0)} ms each to compute)`);
  console.log(`  average length ${(dur / battles).toFixed(0)}s · first castle falls at ${(firstFall / battles).toFixed(0)}s · ran to the time limit ${pct(timeUp / battles)} · castles standing at the end ${(alive / battles).toFixed(1)}`);
  console.log(`  hero win rates (fair = ${pct(1 / n)}): ` + Object.entries(cls).sort().map(([k, c]) => `${k} ${pct(c.w / c.n)}`).join(" · "));
  console.log(`  wins by seat (fair = ${(battles / n).toFixed(1)}): ` + seatWins.join(" "));
  console.log(`  average points by seat: ` + seatPts.map(p => (p / battles).toFixed(1)).join(" "));
}
