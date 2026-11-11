// How long do battles last as the week goes on? Plays whole seven-day wars headlessly, with every lord earning
// and spending gold the way the real game pays it, and prints battle length and endings for each day.
//   node tools/length-by-day.mjs [wars, default 12] [lords, default 10]      BAL_OLD=1 fights by the pre-12-Nov rules
//
// Money: 300 gold on day 1, then each night base pay (200) + castle income + spoils from kills and bounties
// (the gold the battle itself paid out) + catch-up gold for the bottom 30% of the board. Lords spend it on a
// shopping list that depends on their style (soldiers, siege, hero gear, balanced), so armies, castle tiers,
// siege units and ultimates (a hero's levels, 2 a day) arrive on the days the economy allows them.
// Not modelled: alliances, mercenary bids, scripted if-then rules. Lords are simple, so read the trend, not the decimals.
import { loadSim } from "./load-sim.mjs";

const sim = loadSim(), V2 = !process.env.BAL_OLD, DOCTRINE = process.env.DOCTRINE || "none"; // none | raider | mixed: how armies pick targets by group
const wars = +process.argv[2] || 12, nLords = +process.argv[3] || 10;
const STYLES = ["soldiers", "siege", "hero", "balanced"];
// what each style buys, in order; every step is bought when affordable and the list restarts each day
sim.run(`globalThis.__lab = (function () {
  const mk = (seed, pids, wars) => {};
  return {
    unitCost: t => UNITS[t].cost, upCost: (t, l) => Math.round(UNITS[t].cost * .5 * l),
    play(seed, n, V2, doctrine) {
      const DOC = { hunter: { hero: ["hero", "ranged", "melee", "castle"], melee: ["ranged", "hero", "melee", "castle"], ranged: ["hero", "melee", "castle"] }, raider: { hero: ["castle", "hero"], melee: ["castle"], ranged: ["castle"] },
        brawler: { hero: ["melee", "hero", "castle"], melee: ["melee", "ranged", "hero", "castle"], ranged: ["ranged", "melee", "castle"] }, sniper: { hero: ["ranged", "hero", "castle"], melee: ["ranged", "castle"], ranged: ["hero", "ranged", "castle"] }, balanced: { hero: ["hero", "castle"], melee: ["melee", "castle"], ranged: ["hero", "ranged", "castle"] } };
      const rnd = mulberry(seed), pick = a => a[Math.floor(rnd() * a.length)], L = seatLayout(n), clsKeys = Object.keys(CLASSES);
      const lords = L.castles.map((castle, i) => ({ pid: "s" + i, castle, cls: pick(clsKeys), style: pick(["soldiers", "siege", "hero", "balanced"]), gold: 300, tier: 1, beds: SLOT_START, units: [], gear: { weapon: 0, armour: 0, charm: 0 }, defences: { walls: 0, tower: 0 }, items: [], pts: 0,
        tmode: pick(["closest", "weakcastle", "list", "list", "toplevel", "lowest"]), heading: pick(["near", "castle", "castle", "hero"]), stance: pick(["aggressive", "skirmish", "cautious"]), seedR: Math.floor(rnd() * 1e4), uid: 0, doc: pick(["hunter", "raider", "brawler", "sniper", "balanced"]) }));
      const days = [];
      for (let day = 1; day <= 7; day++) {
        const level = Math.min(MAX_HERO_LVL, 2 * day - 1), minTier = day >= 3 ? 3 : day >= 2 ? 2 : 1;
        lords.forEach(l => {
          const buy = c => { if (l.gold < c) return false; l.gold -= c; return true; }, tierOk = t => l.tier >= t;
          const steps = {
            castle: () => l.tier < 3 && buy(CASTLE_TIERS[l.tier].cost) && (l.tier++, true),
            bed: () => l.beds < SLOT_MAX && buy(slotCost(l.beds)) && (l.beds++, true),
            soldier: types => { if (l.units.length >= l.beds) return false; const ok = types.filter(t => UNIT_TIER[t] <= l.tier && (!UNITS[t].castleOnly || l.units.filter(u => UNITS[u.type].castleOnly).length < SIEGE_MAX)); if (!ok.length) return false; const t = pick(ok); if (!buy(UNITS[t].cost)) return false; l.units.push({ id: "u" + (l.uid++), type: t, lvl: 1, cool: 0 }); return true; },
            train: () => { const u = l.units.filter(x => x.lvl < 3).sort((a, b) => a.lvl - b.lvl)[0]; return !!u && buy(Math.round(UNITS[u.type].cost * .5 * u.lvl)) && (u.lvl++, true); },
            gear: () => { const k = pick(["weapon", "armour", "charm"]), v = l.gear[k]; return v < 3 && UPGRADE_NEEDS[k][v] <= l.tier && buy(GEAR[k][v].cost) && (l.gear[k]++, true); },
            defence: () => { const k = pick(["walls", "tower"]), v = l.defences[k]; return v < 2 && UPGRADE_NEEDS[k][v] <= l.tier && buy(DEFENCES[k][v].cost) && (l.defences[k]++, true); },
            item: () => { if (l.items.length >= ITEM_SLOTS) return false; const ks = Object.keys(ITEMS).filter(k => !l.items.includes(k) && !ITEMS[k].unique && ITEMS[k].tier <= l.tier); const k = ks.length && pick(ks); return !!k && buy(itemCost(k)) && (l.items.push(k), true); },
          };
          const fighters = ["footman", "bowman", "knight", "mage", "sniper", "raider", "healer"], sieges = ["ram", "cart", "raider"];
          const lists = {
            soldiers: [["soldier", fighters], ["soldier", fighters], ["bed"], ["train"], ["castle"], ["gear"], ["item"], ["defence"]],
            siege: [["castle"], ["soldier", sieges], ["soldier", sieges], ["bed"], ["soldier", fighters], ["train"], ["gear"], ["item"]],
            hero: [["gear"], ["item"], ["gear"], ["item"], ["castle"], ["soldier", fighters], ["bed"], ["defence"]],
            balanced: [["castle"], ["soldier", fighters], ["gear"], ["soldier", fighters], ["bed"], ["item"], ["train"], ["defence"]],
          }[l.style];
          for (let guard = 0; guard < 80; guard++) { let did = false; for (const [s, a] of lists) { if (steps[s](a)) { did = true; break; } } if (!did) break; }
        });
        const plans = lords.map((l, i) => {
          const sp = armySpots(l.castle, L.N), zone = Array.from(zoneFor(l.castle, L.N, L.castles)).sort().map(k => k.split(",").map(Number)), free = zone.filter(q => !(q[0] === sp.champ[0] && q[1] === sp.champ[1])), take = () => free.splice(Math.floor(rnd() * free.length), 1)[0];
          const pieces = [{ kind: "champ", r: sp.champ[0], c: sp.champ[1], order: "army" }];
          l.units.filter(u => !u.cool).forEach(u => { const q = take(); if (q) pieces.push({ kind: "unit", id: u.id, type: u.type, lvl: u.lvl, hp: 1, r: q[0], c: q[1] }); });
          const c = CLASSES[l.cls], picks = {}; c.abilities.forEach(a => { picks[a.key] = a.choice[(l.seedR + a.key.length) % 2][0]; });
          const rot = l.seedR % PRIORITIES.length, others = lords.filter(o => o !== l).map(o => o.pid), targets = others.filter(() => rnd() < .5);
          return { pid: l.pid, me: i === 0, name: "Lord " + (i + 1), color: SEAT_COLORS[i % SEAT_COLORS.length], cls: l.cls, level, xp0: 0, castle: l.castle, castleTier: l.tier, ranks: autoRanks(level, l.seedR), picks,
            triggers: { a1: pick(TRIGGERS.slice(0, 2)), a2: pick(TRIGGERS.slice(0, 3)), a3: pick(TRIGGERS.slice(0, 3)), ult: pick(TRIGGERS.slice(0, 2)) }, ultArm: true, blessing: null, gear: { ...l.gear }, defences: { ...l.defences }, items: l.items.slice(),
            formation: true, stance: l.stance, prio: PRIORITY_OPTS.slice(rot).concat(PRIORITY_OPTS.slice(0, rot)).slice(0, 5), rules: [], pieces, targets, tmode: l.tmode, heading: l.heading, rank: 1, leader: false, offers: {}, replies: {}, terms: {}, bids: {}, gprio: doctrine === "raider" ? DOC.raider : doctrine === "mixed" ? DOC[l.doc] : null, breaks: [], pbetray: {}, pacts: [], hostile: [], betray: {} };
        });
        const order = lords.slice().sort((a, b) => b.pts - a.pts), ranks = {}; order.forEach((l, i) => { ranks[l.pid] = i + 1; });
        const res = runBattle(plans, 7919 * day + seed, { fast: true, N: L.N, finalDay: day === 7, ultV2: true, balV2: V2, dayNo: day, ranks: day > 1 ? ranks : undefined });
        const siege = lords.reduce((a, l) => a + l.units.filter(u => UNITS[u.type].castleOnly && !u.cool).length, 0), units = lords.reduce((a, l) => a + l.units.filter(u => !u.cool).length, 0);
        const spent = lords.reduce((a, l) => a + l.units.reduce((s, u) => s + UNITS[u.type].cost, 0), 0);
        const falls = res.results.filter(r => r.fellAt != null).map(r => r.fellAt).sort((a, b) => a - b);
        days.push({ day, len: res.duration, first: falls[0] ?? null, standing: res.results.filter(r => r.fellAt == null).length, siege, units, tier3: lords.filter(l => l.tier === 3).length, ults: lords.filter(l => l.units.length >= 0).length && plans.filter(p => (p.ranks.ult || 0) > 0).length, goldHeld: lords.reduce((a, l) => a + l.gold, 0) / n });
        // the night: pay day
        const byPts = res.results.slice().sort((a, b) => b.points - a.points);
        lords.forEach(l => { const r = res.results.find(x => x.pid === l.pid); l.pts += r.points; });
        const board = lords.slice().sort((a, b) => a.pts - b.pts), k = Math.max(1, Math.round(n * .3));
        lords.forEach(l => { const r = res.results.find(x => x.pid === l.pid), idx = board.indexOf(l); l.gold += BASE_INCOME + CASTLE_INCOME[l.tier - 1] + r.gold + catchUpGold(n, idx);
          l.units.forEach(u => { const used = res.tel.ents.some(e => e.pid === l.pid && e.ref === u.id); if (UNITS[u.type].cool) { if (used) u.cool = UNITS[u.type].cool; else u.cool = Math.max(0, (u.cool || 0) - 1); } }); });
      }
      return days;
    },
  };
})()`);
const TMAX = sim.get("TMAX"), rows = Array.from({ length: 7 }, (_, i) => ({ day: i + 1, len: [], first: [], standing: [], siege: [], units: [], tier3: [], timeUp: 0, n: 0 }));
for (let w = 0; w < wars; w++) {
  const days = sim.run(`__lab.play(${5000 + w * 131}, ${nLords}, ${V2}, "${DOCTRINE}")`);
  days.forEach((d, i) => { const r = rows[i]; r.n++; r.len.push(d.len); if (d.first != null) r.first.push(d.first); r.standing.push(d.standing); r.siege.push(d.siege); r.units.push(d.units); r.tier3.push(d.tier3); if (d.len >= TMAX) r.timeUp++; });
}
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN, f = (v, d = 0) => (Number.isNaN(v) ? "-" : v.toFixed(d)).padStart(6);
console.log(`${wars} wars x ${nLords} lords, ${V2 ? "new rules (no burn)" : "old rules (castle burn)"}; time limit ${TMAX}s`);
console.log("  day | avg length | first fall | at time limit | castles left | soldiers/lord | siege units | tier-3 castles");
rows.forEach(r => console.log(`   ${r.day}  |${f(avg(r.len))}s    |${f(avg(r.first))}s    |${f(100 * r.timeUp / r.n)}%         |${f(avg(r.standing), 1)}        |${f(avg(r.units) / nLords, 1)}        |${f(avg(r.siege), 1)}       |${f(avg(r.tier3), 1)}`));
