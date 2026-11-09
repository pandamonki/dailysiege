// Balance lab: simulate many battles and report win rates

// ================= balance lab (telemetry) =================
function randomPlans(seed) {
  const rnd = mulberry(seed), pick = a => a[Math.floor(rnd() * a.length)], clsKeys = Object.keys(CLASSES);
  const level = 1 + Math.floor(rnd() * 7);
  const L = seatLayout(8), seats = [{ pid: "you", name: "You", color: YOU_COLOR }, ...BOTS.map(r => ({ pid: r.id, name: r.name, color: r.color }))].map((st, i) => ({ ...st, pos: L.castles[i] }));
  return seats.map(st => {
    const cls = pick(clsKeys), c = CLASSES[cls], sp = armySpots(st.pos, L.N), ch = sp.champ, spots = sp.units;
    const units = spots.slice(0, 2 + Math.floor(rnd() * 2)).map(([pr, pc]) => ({ kind: "unit", type: pick(UTYPES), lvl: 1 + Math.floor(rnd() * Math.min(3, 1 + level / 3)), hp: 1, r: pr, c: pc }));
    const picks = {}; c.abilities.forEach(a => picks[a.key] = a.choice[rnd() > .5 ? 1 : 0][0]);
    const rot = Math.floor(rnd() * PRIORITIES.length), gt = () => Math.min(3, Math.floor(rnd() * (level / 2 + 1)));
    return { pid: st.pid, me: st.pid === "you", name: st.name, color: st.color, cls, level, castle: st.pos, ranks: autoRanks(level, Math.floor(rnd() * 1e4)), picks,
      triggers: { a1: pick(TRIGGERS.slice(0, 2)), a2: pick(TRIGGERS.slice(0, 3)), a3: pick(TRIGGERS.slice(0, 3)), ult: pick(TRIGGERS.slice(0, 2)) },
      gear: { weapon: gt(), armour: gt(), charm: gt() }, defences: { walls: rnd() < .3 ? 1 : 0, tower: rnd() < .3 ? 1 : 0 },
      stance: pick(["aggressive", "skirmish", "cautious"]), prio: PRIORITIES.slice(rot).concat(PRIORITIES.slice(0, rot)),
      rules: [{ if: IFS[0], then: THENS[0] }], pieces: [{ kind: "champ", r: ch[0], c: ch[1] }, ...units], pacts: [], hostile: [], betray: {} };
  });
}
// one champion (level 4, basic gear) against 3 soldiers of level 1-2, away from any castle
function duelPlans(cls, units, seed) {
  const c = CLASSES[cls], picks = {}; c.abilities.forEach((a, j) => picks[a.key] = a.choice[(seed >> j) & 1][0]);
  const L = seatLayout(8);
  return [{ pid: "you", me: true, name: "You", color: YOU_COLOR, cls, level: 4, castle: L.castles[0], ranks: autoRanks(4, seed), picks, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
      gear: { weapon: 1, armour: 1, charm: 0 }, defences: {}, stance: "aggressive", noRetreat: true, prio: PRIORITIES.slice(), rules: [], pieces: [{ kind: "champ", r: 8, c: 5 }], pacts: [], hostile: [], betray: {} },
    { pid: "p1", name: "Soldiers", color: "#b8322a", cls: "warrior", level: 4, castle: L.castles[4], ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, picks: {}, triggers: {}, gear: {}, defences: {}, stance: "aggressive",
      noRetreat: true, prio: PRIORITIES.slice(), rules: [], pieces: units.map((u, i) => ({ kind: "unit", type: u.type, lvl: u.lvl, hp: 1, r: 7 + i, c: 11 })), pacts: [], hostile: [], betray: {} }];
}
function runDuels(n, seed) {
  const rnd = mulberry(seed), out = {};
  const combos = [...Array(n)].map(() => [0, 1, 2].map(() => ({ type: UTYPES[Math.floor(rnd() * UTYPES.length)], lvl: 1 + (rnd() < .5 ? 1 : 0) })));
  Object.keys(CLASSES).forEach(cls => { let w = 0, hp = 0, len = 0;
    combos.forEach((cb, i) => { const d = {}; runBattle(duelPlans(cls, cb, i * 7 + 1), seed + i * 131, { fast: true, duel: d, N: 17 }); len += d.t; if (d.winner === "you") { w++; hp += d.hp; } });
    out[cls] = { win: w / n, hpLeft: w ? hp / w : 0, len: len / n }; });
  return out;
}
const ABIL_KEYS = cls => [...CLASSES[cls].abilities.map(a => [a.key, a.name]), ["ult", CLASSES[cls].ult.name]];
function aggregate(list) {
  const C = {}, U = {}, A = {};
  Object.keys(CLASSES).forEach(k => { C[k] = { n: 0, wins: 0, top3: 0, place: 0, points: 0, dealt: 0, auto: 0, healed: 0, deaths: 0, kills: 0, survive: 0 }; ABIL_KEYS(k).forEach(([key, name]) => A[k + "|" + name] = { cls: k, key, name, owners: 0, casts: 0, dmg: 0, heal: 0 }); });
  Object.keys(UNITS).forEach(k => U[k] = { n: 0, dealt: 0, taken: 0, healed: 0, kills: 0, died: 0, gold: 0 });
  list.forEach(T => {
    T.players.forEach(p => { const c = C[p.cls]; c.n++; if (p.place === 1) c.wins++; if (p.place <= 3) c.top3++; c.place += p.place; c.points += p.points; c.survive += p.elimT == null ? T.duration : p.elimT; });
    T.ents.forEach(e => {
      if (e.kind === "champ") {
        const c = C[e.cls]; c.dealt += e.dealt; c.healed += e.healed; c.deaths += e.deaths; c.kills += e.kills; c.auto += (e.ab["Auto attack"] || {}).dmg || 0;
        ABIL_KEYS(e.cls).forEach(([key, name]) => { if (!e.ranks || !e.ranks[key]) return; const a = A[e.cls + "|" + name], r = e.ab[name] || {}; a.owners++; a.casts += r.casts || 0; a.dmg += r.dmg || 0; a.heal += r.heal || 0; });
      } else {
        const u = U[e.type]; u.n++; u.dealt += e.dealt; u.taken += e.taken; u.healed += e.healed; u.kills += e.kills; u.died += e.deaths ? 1 : 0; u.gold += e.gold;
      }
    });
  });
  return { n: list.length, C, U, A };
}
function verdict(v, lo, hi) { return v > hi ? `<span class="chip strong">Strong</span>` : v < lo ? `<span class="chip weak">Weak</span>` : `<span class="chip ok">Fair</span>`; }
const r0 = v => Math.round(v).toLocaleString();
function labManyHTML() {
  if (labJob) return `<div class="sec"><p>Running battle ${labJob.i} of ${labJob.n}…</p><div class="prog"><i style="width:${(labJob.i / labJob.n * 100).toFixed(0)}%"></i></div><p class="muted">Every seat gets a random class, army, gear and level each battle, with no alliances, so the numbers compare classes fairly.</p></div>`;
  const runBtns = `<div class="row">${[25, 50, 100].map(n => `<button class="btn small wood" data-act="labrun" data-v="${n}">Run ${n}</button>`).join("")}</div>`;
  if (!lab) return `<div class="sec"><p>Simulate many random battles to see which heroes, units and abilities over- or under-perform.</p>${runBtns}<p class="muted">25 battles take a few seconds on a phone.</p></div>`;
  const { n, C, U, A } = lab, fair = 100 / 8;
  const cls = Object.entries(C).filter(([, c]) => c.n).sort((a, b) => b[1].wins / b[1].n - a[1].wins / a[1].n);
  const dpg = Object.values(U).filter(u => u.n).map(u => u.dealt / u.gold).sort((a, b) => a - b), med = dpg[Math.floor(dpg.length / 2)] || 1;
  const units = Object.entries(U).filter(([, u]) => u.n).sort((a, b) => b[1].dealt / b[1].gold - a[1].dealt / a[1].gold);
  const abil = Object.values(A).filter(a => a.owners);
  const perCast = a => (a.dmg + a.heal) / Math.max(1, a.casts);
  return `<div class="sec"><div class="spread"><h3>${n} battles</h3><span class="muted">${new Date(lab.at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</span></div>${runBtns}</div>
  <div class="sec"><h3>Heroes</h3><p class="muted">A fair win rate with 8 players is about ${fair.toFixed(1)}%. Strong means above ${(fair * 1.6).toFixed(0)}%, weak below ${(fair * .5).toFixed(0)}%.</p>
    <div class="tbl"><table><thead><tr><th>Class</th><th>Win</th><th>Top 3</th><th>Avg place</th><th>Damage</th><th>Healing</th><th>Kills</th><th>Deaths</th><th>Auto %</th><th></th></tr></thead><tbody>
    ${cls.map(([k, c]) => `<tr><td>${CLASSES[k].name}</td><td>${(c.wins / c.n * 100).toFixed(1)}%</td><td>${(c.top3 / c.n * 100).toFixed(0)}%</td><td>${(c.place / c.n).toFixed(2)}</td><td>${r0(c.dealt / c.n)}</td><td>${r0(c.healed / c.n)}</td><td>${(c.kills / c.n).toFixed(1)}</td><td>${(c.deaths / c.n).toFixed(2)}</td><td>${(c.auto / Math.max(1, c.dealt) * 100).toFixed(0)}%</td><td>${verdict(c.wins / c.n * 100, fair * .5, fair * 1.6)}</td></tr>`).join("")}
    </tbody></table></div><p class="muted">Per hero per battle. ${cls.map(([k, c]) => `${CLASSES[k].name} ${c.n}`).join(", ")} picks.</p></div>
  ${lab.duel ? `<div class="sec"><h3>Hero against 3 soldiers</h3><p class="muted">A level 4 hero with basic gear fights 3 random soldiers of level 1 or 2. By design the Warrior should top this table and the Rogue should sit at the bottom.</p>
    <div class="tbl"><table><thead><tr><th>Class</th><th>Hero wins</th><th>Health left</th><th>Fight length</th></tr></thead><tbody>
    ${Object.entries(lab.duel).map(([k, d]) => `<tr><td>${CLASSES[k].name}</td><td>${(d.win * 100).toFixed(0)}%</td><td>${(d.hpLeft * 100).toFixed(0)}%</td><td>${d.len.toFixed(0)}s</td></tr>`).join("")}
    </tbody></table></div></div>` : ""}
  <div class="sec"><h3>Units</h3><p class="muted">Damage per 100 gold spent (recruit plus training) is the fairest comparison. Strong or weak is against the middle unit.</p>
    <div class="tbl"><table><thead><tr><th>Unit</th><th>Dmg / 100g</th><th>Damage</th><th>Taken</th><th>Healing</th><th>Kills</th><th>Died</th><th></th></tr></thead><tbody>
    ${units.map(([k, u]) => { const v = u.dealt / u.gold; return `<tr><td>${UNITS[k].name}</td><td>${r0(v * 100)}</td><td>${r0(u.dealt / u.n)}</td><td>${r0(u.taken / u.n)}</td><td>${r0(u.healed / u.n)}</td><td>${(u.kills / u.n).toFixed(2)}</td><td>${(u.died / u.n * 100).toFixed(0)}%</td><td>${verdict(v, med * .7, med * 1.4)}</td></tr>`; }).join("")}
    </tbody></table></div></div>
  <div class="sec"><h3>Abilities</h3><p class="muted">Averages for heroes who learned the ability. Value per cast counts damage plus healing.</p>
    <div class="tbl"><table><thead><tr><th>Ability</th><th>Casts</th><th>Damage</th><th>Healing</th><th>Per cast</th></tr></thead><tbody>
    ${Object.keys(CLASSES).map(k => abil.filter(a => a.cls === k).map((a, i) => `<tr${i === 0 ? ' class="grp"' : ""}><td>${CLASSES[k].name} · ${esc(a.name)}${PASSIVE[k] === a.key ? " <i>(passive)</i>" : ""}</td><td>${(a.casts / a.owners).toFixed(1)}</td><td>${r0(a.dmg / a.owners)}</td><td>${r0(a.heal / a.owners)}</td><td>${PASSIVE[k] === a.key ? "–" : r0(perCast(a))}</td></tr>`).join("")).join("")}
    </tbody></table></div></div>
  <div class="sec"><button class="btn wood" data-act="labcopy">Copy as CSV</button><p class="muted">Paste it into a spreadsheet, or back into our chat to talk through changes.</p><textarea id="csvbox" class="plan" readonly hidden></textarea></div>`;
}
function labLastHTML() {
  if (!replay) return `<p>Run or watch a battle first. Its stats appear here.</p><div><button class="btn wood" data-act="battle">Run a test battle</button></div>`;
  const T = replay.res.tel;
  return `<p class="muted">Effective damage only, so overkill doesn't count. Summons and totems count toward their hero.</p>` + T.players.slice().sort((a, b) => a.place - b.place).map(p => {
    const champ = T.ents.find(e => e.pid === p.pid && e.kind === "champ"), units = T.ents.filter(e => e.pid === p.pid && e.kind === "unit");
    const abs = champ ? Object.entries(champ.ab).filter(([, r]) => r.dmg + r.heal >= 1 || r.casts).sort((a, b) => (b[1].dmg + b[1].heal) - (a[1].dmg + a[1].heal)) : [];
    return `<div class="sec tstat"><div class="spread"><b><i class="sw" style="background:${replay.res.colors[p.pid]}"></i>${p.place}. ${esc(p.name)} · ${CLASSES[p.cls].name}</b><span class="muted">${p.points} pts</span></div>
      <div class="tbl"><table><thead><tr><th></th><th>Damage</th><th>Taken</th><th>Healing</th><th>K</th><th>D</th></tr></thead><tbody>
      ${champ ? `<tr><td>Hero</td><td>${r0(champ.dealt)}</td><td>${r0(champ.taken)}</td><td>${r0(champ.healed)}</td><td>${champ.kills}</td><td>${champ.deaths}</td></tr>` : ""}
      ${units.map(u => `<tr><td>${UNITS[u.type].name} Lv${u.lvl}</td><td>${r0(u.dealt)}</td><td>${r0(u.taken)}</td><td>${r0(u.healed)}</td><td>${u.kills}</td><td>${u.deaths}</td></tr>`).join("")}
      </tbody></table></div>
      ${abs.length ? `<div class="abl">${abs.map(([nme, r]) => `<span>${esc(nme)}${r.casts ? ` ×${r.casts}` : ""} <b>${r0(r.dmg + r.heal)}</b></span>`).join("")}</div>` : ""}</div>`;
  }).join("");
}
function labSheet() {
  const tab = sheet.tab || (replay ? "last" : "many");
  return head(null, "Balance Lab", "Telemetry from test battles") + `<div class="body">
    <div class="tabs">${[["last", "Last battle"], ["many", "Many battles"], ["types", "Damage types"]].map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-act="ctab" data-v="${k}">${l}</button>`).join("")}</div>
    ${tab === "last" ? labLastHTML() : tab === "types" ? typesHTML() : labManyHTML()}</div>`;
}
let lab = null, labJob = null;
const LAB_V = 11; // bump when balance numbers change so old results are not shown
try { lab = JSON.parse(localStorage.getItem("lastbanner.lab")); if (!lab || lab.v !== LAB_V) lab = null; } catch (e) {}
function runLab(n) {
  if (labJob) return;
  const tels = [], seed0 = Math.floor(Date.now() % 1e6);
  labJob = { n, i: 0 };
  const step = () => {
    const t0 = performance.now();
    while (labJob.i < n && performance.now() - t0 < 50) { const i = labJob.i; tels.push(runBattle(randomPlans(seed0 + i * 31), seed0 + i * 977, { fast: true, N: 17 }).tel); labJob.i++; }
    if (labJob.i < n) { if (sheet && sheet.type === "lab") renderSheet(); setTimeout(step, 0); return; }
    lab = { v: LAB_V, at: Date.now(), ...aggregate(tels), duel: runDuels(Math.max(20, Math.round(n / 2)), seed0) }; labJob = null;
    try { localStorage.setItem("lastbanner.lab", JSON.stringify(lab)); } catch (e) {}
    if (sheet && sheet.type === "lab") { sheet.tab = "many"; renderSheet(); }
    toast(`${n} battles simulated.`);
  };
  step();
}
function labCSV() {
  const { n, C, U, A } = lab, rows = [["section", "name", "picks_or_count", "win_pct", "avg_place", "damage", "healing", "kills", "deaths_or_died_pct", "dmg_per_100g", "casts", "per_cast"]];
  Object.entries(C).forEach(([k, c]) => c.n && rows.push(["class", CLASSES[k].name, c.n, (c.wins / c.n * 100).toFixed(1), (c.place / c.n).toFixed(2), Math.round(c.dealt / c.n), Math.round(c.healed / c.n), (c.kills / c.n).toFixed(2), (c.deaths / c.n).toFixed(2), "", "", ""]));
  Object.entries(U).forEach(([k, u]) => u.n && rows.push(["unit", UNITS[k].name, u.n, "", "", Math.round(u.dealt / u.n), Math.round(u.healed / u.n), (u.kills / u.n).toFixed(2), (u.died / u.n * 100).toFixed(0), Math.round(u.dealt / u.gold * 100), "", ""]));
  Object.values(A).forEach(a => a.owners && rows.push(["ability", `${CLASSES[a.cls].name}: ${a.name}`, a.owners, "", "", Math.round(a.dmg / a.owners), Math.round(a.heal / a.owners), "", "", "", (a.casts / a.owners).toFixed(2), PASSIVE[a.cls] === a.key ? "passive" : Math.round((a.dmg + a.heal) / Math.max(1, a.casts))]));
  return `# Daily Siege balance telemetry, ${n} battles\n` + rows.map(r => r.join(",")).join("\n");
}
