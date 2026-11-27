// Hero lab: how do the five heroes stack up against each other, with and without armies, by today's rules?
//   node tools/hero-lab.mjs duels [fights per pairing, default 40]
//     Hero against hero in the middle of an empty map, both the same level, with random skill builds. Levels 7, 13, 19 and 25,
//     each pairing fought from both sides. Then the same pairings with three soldiers each of one army style, where the hero
//     that outlives the other wins (a draw if both live).
//   node tools/hero-lab.mjs wars [battles, default 200]
//     Full 8-lord bot wars (days 3 to 7, zones, waves, items, defences, sudden death), every lord a bot with a forced army style
//     (melee, ranged, sustain or the bot's own mix). Prints win rate by class, by class and army style, by class and day,
//     hero kills and deaths, and win rate by main tree.
// Win rates within a few points of fair are noise at these sample sizes.
import { loadSim } from "./load-sim.mjs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const sim = loadSim(), mode = process.argv[2] || "duels", count = +process.argv[3] || (mode === "wars" ? 200 : 40);
const CL = ["warrior", "mage", "rogue", "archer", "shaman"], COMPS = { melee: ["footman", "knight", "raider"], ranged: ["bowman", "mage", "sniper"], sustain: ["footman", "healer", "bowman"], mixed: null };
const pct = v => (100 * v).toFixed(0).padStart(3) + "%";
const FLAGS = "trapV2: true, sdV2: true, wallV2: true, engV2: true, ordV2: true, skV2: true, waveV2: true, waveV3: true, waveV4: true, balV5: true, itemV5: true, itemV6: true, shellV2: true, survV1: true, siegeV1: true, lvlV2: true, zoneV1: true";
const OPTS = "ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: true";
sim.run(`globalThis.LAB_COMPS = ${JSON.stringify(COMPS)};
globalThis.labMain = (tree, cls) => { const b = [0, 1, 2].reduce((a, b) => treePts(tree, TREE_BKEY[b]) > treePts(tree, TREE_BKEY[a]) ? b : a, 0); return TREES[cls][b].name; };
globalThis.labDuel = function (clsA, clsB, lvl, comp, seed, slotA, slotB) {
  const L = seatLayout(8), m = Math.floor(L.N / 2), side = (pid, cls, dir, slot, col) => {
    const tree = autoTree(lvl, seed * 7 + slot, cls, slot), units = comp ? LAB_COMPS[comp].map((t, k) => ({ kind: "unit", type: t, lvl: 2, hp: 1, r: m - 1 + k, c: m + dir * 4 })) : [];
    return { pid, me: pid === "a", name: pid, color: col, cls, level: lvl, castle: L.castles[pid === "a" ? 0 : 4], ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, tree, picks: {}, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
      gear: { weapon: 1, armour: 1, charm: 0 }, defences: {}, stance: "aggressive", noRetreat: true, prio: ["Enemy heroes", ...PRIORITIES.filter(p => p !== "Enemy heroes")], rules: [], items: [],
      pieces: [{ kind: "champ", r: m, c: m + dir * 3 }, ...units], pacts: [], hostile: [], betray: {}, ${FLAGS}, main: labMain(tree, cls) };
  };
  const a = side("a", clsA, -1, slotA, "#2f5fa8"), b = side("b", clsB, 1, slotB, "#b8322a"), d = {};
  const res = runBattle([a, b], seed, { fast: true, duel: d, N: L.N, ${OPTS}, dayNo: 4 });
  const hero = pid => (res.tel.ents || []).find(e => e.kind === "champ" && e.pid === pid) || {};
  const da = hero("a").diedAt, db = hero("b").diedAt, byDeath = da == null && db == null ? null : da == null ? "a" : db == null ? "b" : da > db ? "a" : db > da ? "b" : null; // with armies: the hero that outlives the other wins
  return { winner: comp ? byDeath : d.winner, t: d.t ?? res.duration, mainA: a.main, mainB: b.main, dealtA: hero("a").dealt || 0, dealtB: hero("b").dealt || 0, deadA: !!hero("a").deaths, deadB: !!hero("b").deaths };
};
globalThis.labWar = function (game, day) {
  const L = seatLayout(8, true), ids = [...Array(8)].map((_, k) => "h" + game + "b" + k), rnd = mulberry(game * 991 + day), comps = Object.keys(LAB_COMPS);
  const order = CL_ORDER(rnd), lvl = Math.min(25, 1 + 3.5 * (day - 1) | 0);
  const plans = ids.map((uid, i) => { const zone = zoneFor(L.castles[i], L.N, L.castles, L.v2);
    const p = lordBotPlan({ uid, cls: order[i], i, ids, L, zone, dayNo: day, lvl, v2: true, v3: true, fair: true, pick: true, ranks: {}, sup: true, defV2: true, zv: true });
    const comp = comps[Math.floor(rnd() * comps.length)], list = LAB_COMPS[comp];
    if (list) { let k = 0; p.pieces.forEach(q => { if (q.kind === "unit" && !UNITS[q.type].engine && !UNITS[q.type].tower) q.type = list[k++ % list.length]; }); (p.waves || []).forEach(w => (w.units || []).forEach(u => { u.type = list[k++ % list.length]; })); }
    return Object.assign(p, { pid: uid, name: uid, color: "#2f5fa8", castle: L.castles[i], level: lvl, ${FLAGS}, comp, main: labMain(p.tree, p.cls) }); });
  const res = runBattle(JSON.parse(JSON.stringify(plans)), 5100 + game * 37 + day, { N: L.N, fast: true, ${OPTS}, dayNo: day });
  return plans.map(p => { const r = res.results.find(x => x.pid === p.pid), h = (res.tel.ents || []).find(e => e.kind === "champ" && e.pid === p.pid) || {};
    return { cls: p.cls, comp: p.comp, main: p.main, day, place: r.place, points: r.points, kills: h.kills || 0, deaths: h.deaths || 0, dealt: h.dealt || 0 }; });
};
globalThis.CL_ORDER = rnd => { const base = ${JSON.stringify(CL)}, out = []; for (let i = 0; i < 8; i++) out.push(base[Math.floor(rnd() * 5)]); return out; };`);

if (mode === "duels") {
  for (const comp of (process.env.COMPS ? process.env.COMPS.split(",").map(c => c === "none" ? null : c) : [null, "melee", "ranged", "sustain"])) {
    console.log(`\n=== Hero against hero, ${comp ? "each with 3 " + comp + " soldiers (level 2)" : "heroes alone"} (row's win rate against column; draws count half) ===`);
    const total = {}, byLvl = {}, byTree = {};
    for (const lvl of [7, 13, 19, 25]) {
      const M = {}; let draws = 0, fights = 0, len = 0;
      for (const A of CL) for (const B of CL) {
        if (A === B) continue;
        let s = 0, n = 0;
        for (let i = 0; i < count; i++) {
          const swap = i % 2, seed = 1000 + i * 131 + lvl * 7 + CL.indexOf(A) * 17 + CL.indexOf(B) * 3, slA = i % 3, slB = (i * 7 + 1) % 3;
          const r = swap ? sim.run(`labDuel("${B}", "${A}", ${lvl}, ${comp ? `"${comp}"` : "null"}, ${seed}, ${slB}, ${slA})`) : sim.run(`labDuel("${A}", "${B}", ${lvl}, ${comp ? `"${comp}"` : "null"}, ${seed}, ${slA}, ${slB})`);
          const me = swap ? "b" : "a", v = r.winner === me ? 1 : r.winner ? 0 : .5; s += v; n++; fights++; len += r.t; if (!r.winner) draws++;
          const mt = A + " " + (swap ? r.mainB : r.mainA), q = byTree[mt] = byTree[mt] || { s: 0, n: 0 }; q.s += v; q.n++;
        }
        M[A + B] = s / n; const t = total[A] = total[A] || { s: 0, n: 0 }; t.s += s; t.n += n; const bl = byLvl[A + lvl] = byLvl[A + lvl] || { s: 0, n: 0 }; bl.s += s; bl.n += n;
      }
      console.log(`\n level ${lvl}: average fight ${(len / fights).toFixed(0)}s, draws ${pct(draws / fights)}`);
      console.log("          " + CL.map(c => c.padStart(8)).join(""));
      for (const A of CL) console.log(" " + A.padEnd(9) + CL.map(B => A === B ? "      - " : "    " + pct(M[A + B])).join(""));
    }
    console.log("\n overall: " + CL.map(c => `${c} ${pct(total[c].s / total[c].n)}`).join(" · "));
    console.log(" by level: " + CL.map(c => `${c} ` + [7, 13, 19, 25].map(l => pct(byLvl[c + l].s / byLvl[c + l].n).trim()).join("/")).join(" · "));
    console.log(" by main tree: " + Object.entries(byTree).sort().map(([k, q]) => `${k} ${pct(q.s / q.n).trim()}`).join(" · "));
  }
} else {
  const rows = [], from = +process.argv[4] || 0; // from: first battle, to split a long run across processes (JSON=1 prints the raw rows)
  for (let g = from; g < from + count; g++) { const day = 3 + (g % 5); rows.push(...sim.run(`labWar(${g}, ${day})`)); if ((g - from + 1) % 25 === 0) process.stderr.write(`${g - from + 1}/${count}\n`); }
  if (process.env.JSON) { console.log(JSON.stringify(rows)); process.exit(0); }
  if (process.env.MERGE) rows.push(...process.env.MERGE.split(",").flatMap(f => JSON.parse(require("node:fs").readFileSync(f, "utf8"))));
  const grp = (key) => { const o = {}; rows.forEach(r => { const k = key(r), q = o[k] = o[k] || { n: 0, w: 0, top3: 0, pts: 0, k: 0, d: 0, dealt: 0 }; q.n++; if (r.place === 1) q.w++; if (r.place <= 3) q.top3++; q.pts += r.points; q.k += r.kills; q.d += r.deaths; q.dealt += r.dealt; }); return o; };
  const show = (title, o) => { console.log(`\n${title}`); Object.entries(o).sort().forEach(([k, q]) => console.log(`  ${k.padEnd(22)} win ${pct(q.w / q.n)}  top3 ${pct(q.top3 / q.n)}  pts ${(q.pts / q.n).toFixed(1).padStart(5)}  kills ${(q.k / q.n).toFixed(2)}  deaths ${(q.d / q.n).toFixed(2)}  dmg ${(q.dealt / q.n / 1000).toFixed(1)}k  (${q.n})`)); };
  console.log(`${count} bot wars of 8 lords, days 3 to 7 (fair win = 12.5%, top 3 = 37.5%)`);
  show("By class", grp(r => r.cls));
  show("By army style", grp(r => r.comp));
  show("By class and army style", grp(r => r.cls + " " + r.comp));
  show("By class and day", grp(r => r.cls + " day " + r.day));
  show("By main tree", grp(r => r.cls + " " + r.main));
}
