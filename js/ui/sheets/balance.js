// Balance report (Host tools): every battle saved this war and last is fought again from its exact saved orders (battles always come out
// the same), and the numbers are added up: soldiers and towers by damage and value, hero classes by placing, items, defences and bot builds.
// Nothing new is stored: the report is worked out on this device each time it is opened.
let BAL_RPT = null; // { done, total, rows: [one entry per lord per battle], units: {}, err }

function balanceBattles() { // [dayKey, battle, which war] for every battle with saved orders, this war and the last
  const out = [], add = (bs, war) => Object.entries(bs || {}).forEach(([k, b]) => { if (b && b.inputs && b.inputs.plans) out.push([k, b, war]); });
  add(LIVE.battles, "this"); if (LIVE.prevWar) add(LIVE.prevWar.battles, "last");
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
function balanceRun(dayKey, b) {
  const s = b.inputs, plans = JSON.parse(JSON.stringify(s.plans));
  if (s.feuds) plans.feuds = s.feuds.slice(); if (b.mercs) plans.mercs = b.mercs;
  return { plans, res: runBattle(plans, daySeed(dayKey), { fast: true, N: s.N, finalDay: !!s.final, ultV2: !!s.ultV2, balV2: !!s.balV2, balV3: !!s.balV3, fairV1: !!s.fairV1, pickV1: !!s.pickV1, balV4: !!s.balV4, suddenV1: !!s.suddenV1, treesV1: !!s.treesV1, heroV3: !!s.heroV3, dayNo: s.dayNo || null, ranks: s.ranks || undefined, twist: s.twist || undefined }) };
}
function balanceStart() {
  const list = balanceBattles(); BAL_RPT = { done: 0, total: list.length, rows: [], units: {} };
  const step = () => {
    if (!BAL_RPT || BAL_RPT.done >= list.length) { render(); return; }
    const [dayKey, b] = list[BAL_RPT.done];
    try {
      const { plans, res } = balanceRun(dayKey, b), n = plans.length;
      res.tel.players.forEach(tp => { const pl = plans.find(p => p.pid === tp.pid) || {}, pcs = pl.pieces || [];
        BAL_RPT.rows.push({ day: dayKey, pid: tp.pid, n, cls: tp.cls, place: tp.place, pts: tp.points, win: tp.place === 1, bot: !!pl.bot || !!(LIVE.players[tp.pid] || {}).bot, build: pl.build || null,
          items: (pl.items || []).filter(Boolean), traps: pcs.filter(x => x.kind === "trap" && x.type !== "tower").length, towers: pcs.filter(x => x.type === "tower").length, walls: pcs.filter(x => x.kind === "wall").length, trapDmg: tp.trapDmg || 0,
          heroDmg: res.tel.ents.filter(e => e.pid === tp.pid && e.kind === "champ").reduce((a, e) => a + (e.dealt || 0), 0) }); });
      res.tel.ents.filter(e => e.kind === "unit").forEach(e => { const k = e.type, u = BAL_RPT.units[k] || (BAL_RPT.units[k] = { n: 0, dealt: 0, gold: 0, kills: 0, lived: 0, castle: 0 });
        u.n++; u.dealt += e.dealt || 0; u.gold += e.gold || 0; u.kills += e.kills || 0; u.lived += e.deaths ? 0 : 1; u.castle += e.toCastle || 0; });
    } catch (e) { BAL_RPT.err = (BAL_RPT.err || 0) + 1; }
    BAL_RPT.done++; if (sheet && sheet.type === "balance") render(); setTimeout(step, 0);
  };
  setTimeout(step, 30);
}
function balanceSheet() {
  if (!BAL_RPT) balanceStart();
  const R = BAL_RPT, top = head(null, "Balance report", `${R.total} battle${R.total === 1 ? "" : "s"}, this war and the last`);
  if (!R.total) return top + `<div class="body"><p class="muted">No battles with saved orders yet. The report reads the real battles of your hosted game, and fills in after the first one is fought.</p></div>`;
  if (R.done < R.total) return top + `<div class="body"><p>Fighting every battle again from its saved orders… ${R.done} of ${R.total}</p><div class="pd-bar"><i style="width:${Math.round(R.done / R.total * 100)}%"></i><span>${Math.round(R.done / R.total * 100)}%</span></div></div>`;
  const rows = R.rows, avg = (a, f) => a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : 0, pct = v => Math.round(v * 100) + "%", n1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const rel = r => (r.place - 1) / Math.max(1, r.n - 1); // 0 = first, 1 = last, whatever the number of lords
  const allRel = avg(rows, rel), flag = (v, base, hiGood) => { const d = v - base; return Math.abs(d) < .08 ? "" : (d < 0) === hiGood ? ` <span class="bal-lo">▼</span>` : ` <span class="bal-hi">▲</span>`; };
  const table = (title, note, cols, data) => `<div class="sec"><h3>${title}</h3>${note ? `<p class="muted">${note}</p>` : ""}<div class="bal-wrap"><table class="bal"><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${data.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" class="muted">Nothing yet</td></tr>`}</tbody></table></div></div>`;
  const grp = (f, keep) => { const m = {}; rows.filter(keep || (() => true)).forEach(r => [].concat(f(r)).forEach(k => { if (k != null) (m[k] = m[k] || []).push(r); })); return m; };
  const finish = r => `${n1(r.length ? avg(r, x => x.place) : 0)}`, score = a => 1 - avg(a, rel); // 1 = always first
  // soldiers and towers
  const U = Object.entries(R.units).map(([k, u]) => ({ k, ...u, dpg: u.gold ? u.dealt / u.gold * 100 : 0 })), dpgAll = U.reduce((s, u) => s + u.dealt, 0) / Math.max(1, U.reduce((s, u) => s + u.gold, 0)) * 100;
  const unitRows = U.sort((a, b) => b.n - a.n).map(u => [esc((UNITS[u.k] || {}).name || u.k), u.n, Math.round(u.dealt / u.n), (u.gold ? Math.round(u.dpg) + flag(u.dpg / dpgAll, 1, true) : "–"), n1(u.kills / u.n), pct(u.lived / u.n), Math.round(u.castle / u.n)]);
  const cls = grp(r => r.cls), clsRows = Object.entries(cls).sort((a, b) => score(b[1]) - score(a[1])).map(([k, a]) => [esc((CLASSES[k] || {}).name || k), a.length, pct(score(a)) + flag(score(a), 1 - allRel, true), pct(avg(a, x => x.win ? 1 : 0)), Math.round(avg(a, x => x.heroDmg))]);
  const it = grp(r => r.items), itemRows = Object.entries(it).sort((a, b) => b[1].length - a[1].length).map(([k, a]) => [esc((ITEMS[k] || {}).name || k), a.length, pct(score(a)) + flag(score(a), 1 - allRel, true), pct(avg(a, x => x.win ? 1 : 0))]);
  const dbk = r => { const d = r.traps + r.towers * 2 + r.walls * .5; return d === 0 ? "None" : d < 3 ? "Light" : d < 6 ? "Medium" : "Heavy"; }, def = grp(dbk);
  const defRows = ["None", "Light", "Medium", "Heavy"].filter(k => def[k]).map(k => [k, def[k].length, pct(score(def[k])) + flag(score(def[k]), 1 - allRel, true), n1(avg(def[k], x => x.traps)), n1(avg(def[k], x => x.towers)), n1(avg(def[k], x => x.walls)), Math.round(avg(def[k], x => x.trapDmg))]);
  const bl = grp(r => r.build, r => r.bot && r.build), blRows = Object.entries(bl).map(([k, a]) => [k, a.length, pct(score(a)) + flag(score(a), 1 - allRel, true), pct(avg(a, x => x.win ? 1 : 0))]);
  const who = grp(r => (r.bot ? "Bots" : "Players")), whoRows = Object.entries(who).map(([k, a]) => [k, a.length, pct(score(a)), pct(avg(a, x => x.win ? 1 : 0))]);
  return top + `<div class="body">
    <p class="muted">${rows.length} lord-battles. <b>Standing</b> is how high they finished on average: 100% would be first every time, 0% last every time, and about 50% is normal. <span class="bal-hi">▲</span> and <span class="bal-lo">▼</span> mark clearly above or below the rest. Small groups (under about 10) are mostly luck.${R.err ? ` ${R.err} battle${R.err === 1 ? "" : "s"} could not be replayed.` : ""}</p>
    ${table("Soldiers and towers", "Damage per 100 gold is the best value check: a unit well below the rest is too weak for its price. Hired mercenaries show a dash, as they cost no gold up front.", ["Unit", "Fielded", "Dmg each", "Dmg / 100g", "Kills each", "Lived", "To castles"], unitRows)}
    ${table("Hero classes", "", ["Class", "Lords", "Standing", "Won", "Hero dmg"], clsRows)}
    ${table("Items", "How lords carrying each item finished. Items carried by strong lords look good too, so read it as a hint.", ["Item", "Carried", "Standing", "Won"], itemRows)}
    ${table("Defences", "Light, Medium and Heavy count traps, towers (worth 2) and walls (worth a half).", ["Spent on defence", "Lords", "Standing", "Traps", "Towers", "Walls", "Trap dmg"], defRows)}
    ${table("Bot builds", "", ["Build", "Bot-battles", "Standing", "Won"], blRows)}
    ${table("Players and bots", "", ["Who", "Lord-battles", "Standing", "Won"], whoRows)}
    <div class="row"><button class="btn" data-act="balredo">Work it out again</button><button class="btn" data-act="open" data-v="game">← Back</button></div></div>`;
}
