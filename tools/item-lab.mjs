// Item lab: how much does each shop item actually help? Fights paired battles: the same battle (same seed, same lords)
// once without the item and once with it on one hero, and compares that lord's result. Pairing cancels out map luck,
// class and army, so even small effects show up. Every lord carries 0 to 3 random items, as in a real mid-week battle.
//   node tools/item-lab.mjs [trials, default 120] [lords, default 8] [first trial, default 0]
// Prints, per item: the change in win rate, points, hero kills and survival, and the points gained per 100 gold.
// Fights by today's rules (flat items, skill trees, sudden death v2, orders v2), like practice battles.
import { loadSim } from "./load-sim.mjs";

const sim = loadSim(), trials = +process.argv[2] || 120, n = +process.argv[3] || 8, from = +process.argv[4] || 0; // from: first trial, to split a long run across processes
sim.run(`globalThis.itemLabPlans = function (seed, n) {
  const rnd = mulberry(seed), pick = a => a[Math.floor(rnd() * a.length)], clsKeys = Object.keys(CLASSES), L = seatLayout(n), day = 3 + Math.floor(rnd() * 5), level = 2 * day - 1;
  const shop = Object.keys(ITEMS).filter(k => !ITEMS[k].unique);
  return L.castles.map((pos, i) => {
    const cls = pick(clsKeys), c = CLASSES[cls], sp = armySpots(pos, L.N);
    const units = sp.units.slice(0, 2 + Math.floor(rnd() * 3)).map(([r, cc]) => ({ kind: "unit", type: pick(UTYPES), lvl: 1 + Math.floor(rnd() * 3), hp: 1, r, c: cc }));
    const picks = {}; c.abilities.forEach(a => picks[a.key] = a.choice[rnd() > .5 ? 1 : 0][0]);
    const items = []; for (let k = Math.floor(rnd() * 4); k > 0; k--) { const it = pick(shop); if (!items.includes(it)) items.push(it); }
    const rot = Math.floor(rnd() * PRIORITIES.length), gt = () => Math.min(3, Math.floor(rnd() * 3));
    return { pid: "s" + i, me: i === 0, name: "Seat " + (i + 1), color: SEAT_COLORS[i % SEAT_COLORS.length], cls, level, castle: pos, ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, tree: autoTree(level, Math.floor(rnd() * 1e4), cls), picks,
      triggers: { a1: pick(TRIGGERS.slice(0, 2)), a2: pick(TRIGGERS.slice(0, 3)), a3: pick(TRIGGERS.slice(0, 3)), ult: pick(TRIGGERS.slice(0, 2)) }, items, castleTier: 1 + Math.floor(rnd() * 3),
      gear: { weapon: gt(), armour: gt(), charm: gt() }, defences: { walls: rnd() < .3 ? 1 : 0, tower: rnd() < .3 ? 1 : 0 }, stance: pick(["aggressive", "skirmish", "cautious"]),
      prio: PRIORITIES.slice(rot).concat(PRIORITIES.slice(0, rot)), rules: [{ if: IFS[0], then: THENS[0] }], armyPlan: "conquest", fallback: "none",
      pieces: [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, ...units], pacts: [], hostile: [], betray: {},
      itemV5: true, survV1: true, siegeV1: true, trapV2: true, sdV2: true, wallV2: true, engV2: true, ordV2: true, skV2: true, shellV2: true };
  });
};
globalThis.itemLabRun = function (seed, n, focus, add) {
  const plans = itemLabPlans(seed, n), p = plans[focus];
  p.items = p.items.slice(0, 2); if (add) { if (p.items.includes(add)) return null; p.items.push(add); } // the focus hero keeps at most 2 of its own, plus the item on test
  const res = runBattle(plans, 5000 + seed, { fast: true, N: seatLayout(n).N, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true, dayNo: 4 });
  const r = res.results.find(x => x.pid === p.pid);
  return { win: r.place === 1 ? 1 : 0, pts: r.points, place: r.place, kills: r.kills, surv: r.fellAt == null ? 1 : 0, cls: p.cls };
};`);
const shop = sim.run(`Object.keys(ITEMS).filter(k => !ITEMS[k].unique)`), cost = Object.fromEntries(shop.map(k => [k, sim.run(`itemCost(${JSON.stringify(k)})`)])), name = Object.fromEntries(shop.map(k => [k, sim.run(`ITEMS.${k}.name`)]));
const acc = Object.fromEntries(shop.map(k => [k, { n: 0, win: 0, pts: 0, kills: 0, surv: 0, place: 0, ptsSq: 0, byCls: {} }]));
const t0 = performance.now();
for (let i = from; i < from + trials; i++) {
  const seed = 31000 + i * 37, focus = i % n, base = sim.run(`itemLabRun(${seed}, ${n}, ${focus}, null)`);
  for (const k of shop) {
    const w = sim.run(`itemLabRun(${seed}, ${n}, ${focus}, ${JSON.stringify(k)})`); if (!w) continue; const a = acc[k], dp = w.pts - base.pts;
    a.n++; a.win += w.win - base.win; a.pts += dp; a.ptsSq += dp * dp; a.kills += w.kills - base.kills; a.surv += w.surv - base.surv; a.place += base.place - w.place;
    const c = a.byCls[w.cls] = a.byCls[w.cls] || { n: 0, pts: 0 }; c.n++; c.pts += dp;
  }
  if ((i - from) % 10 === 9) process.stderr.write(`${i - from + 1}/${trials} trials, ${((performance.now() - t0) / 1000).toFixed(0)}s\n`);
}
const rows = shop.map(k => { const a = acc[k], m = a.pts / a.n, sd = Math.sqrt(Math.max(0, a.ptsSq / a.n - m * m)), se = sd / Math.sqrt(a.n);
  return { k, name: name[k], cost: cost[k], win: a.win / a.n, pts: m, se, per100: m / cost[k] * 100, kills: a.kills / a.n, surv: a.surv / a.n, place: a.place / a.n,
    cls: Object.fromEntries(Object.entries(a.byCls).map(([c, v]) => [c, +(v.pts / v.n).toFixed(2)])) }; }).sort((a, b) => b.per100 - a.per100);
console.log(JSON.stringify({ trials, lords: n, rows, raw: acc }, null, 1));
