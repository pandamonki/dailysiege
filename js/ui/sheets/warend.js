// The end of a war: the ceremony (podium, final standings, war prizes, every lord's week), the war's highlight reel,
// the Muster Hall card that leads to them, and the hall of fame of past wars.
// When a war's 7th battle is fought the server opens registration for the next war (functions/lib/resolve.js endWar),
// so the finished war's battles arrive as LIVE.prevWar ({ war, battles }) from the backend.

const prevWar = () => (typeof LIVE === "object" && LIVE.prevWar && Object.keys(LIVE.prevWar.battles || {}).length ? LIVE.prevWar : null);
const WAREND_SEEN = () => `ds.warend.${(window.DS && DS.gameId) || "local"}.${(prevWar() || {}).war || 0}`;
const warEndDue = () => { if (!prevWar() || (sheet && sheet.type === "warend") || mode !== "plan") return false; try { return !localStorage.getItem(WAREND_SEEN()); } catch (e) { return false; } };
// After the war's last battle the day 7 report opens first (inside the finished war's view, so Watch and the day chips work),
// and closing it goes on to the war results. Returns true when it opened the report.
function warReportFirst() {
  const pw = prevWar(), k = WAREND_SEEN() + ".r"; if (!pw) return false;
  try { if (localStorage.getItem(k)) return false; localStorage.setItem(k, "1"); } catch (e) { return false; }
  const last = Object.keys(pw.battles).sort().pop(); if (!last || !pw.battles[last].results) return false;
  viewPrevWar(true); layoutFor(last); reportBack = last; sheet = { type: "report", id: last, warEnd: true }; return true;
}
function markWarEndSeen() { try { localStorage.setItem(WAREND_SEEN(), "1"); } catch (e) {} }

// everything the ceremony shows, worked out from the war's saved battles (no battle is fought again)
function warSummary(pw) {
  const days = Object.keys(pw.battles).sort(), per = {};
  days.forEach((d, di) => (pw.battles[d].results || []).forEach(r => {
    const p = per[r.pid] || (per[r.pid] = { pid: r.pid, name: r.name, color: r.color, cls: r.cls, daily: days.map(() => 0), pts: 0, kills: 0, ukills: 0, castles: 0, gold: 0, wins: 0, best: 0, treachery: 0, survived: 0, dmgH: 0, dmgU: 0, dmgC: 0, hasDmg: false });
    p.daily[di] = r.points || 0; p.pts += r.points || 0; p.kills += r.kills || 0; p.ukills += r.ukills || 0; p.castles += r.castles || 0; p.gold += r.gold || 0;
    { const dm = dmgSplit(r); if (dm) { p.hasDmg = true; p.dmgH += dm.hero; p.dmgU += dm.unit; p.dmgC += dm.castle; } }
    if (r.place === 1) p.wins++; if ((r.points || 0) > p.best) p.best = r.points || 0; p.treachery += r.treachery || 0; if (r.survivor) p.survived++;
    if (r.color) p.color = r.color; if (r.cls) p.cls = r.cls; }));
  // saved results carry no colour or class: take them from each battle's plans (latest day wins, as heroes can change)
  days.forEach(d => { const pl = (pw.battles[d].inputs && pw.battles[d].inputs.plans) || [];
    pl.forEach(q => { const p = per[q.pid]; if (!p) return; if (q.color) p.color = q.color; if (q.cls) p.cls = q.cls; if (!p.name && q.name) p.name = q.name; p.plan = q; }); }); // p.plan: their last battle's plan, for their build
  const rank = Object.values(per).sort((a, b) => b.pts - a.pts || b.wins - a.wins || (a.pid < b.pid ? -1 : 1));
  const through3 = {}; rank.forEach(p => { through3[p.pid] = p.daily.slice(0, 3).reduce((a, b) => a + b, 0); });
  const r3 = Object.keys(through3).sort((a, b) => through3[b] - through3[a]), moved = {}; rank.forEach((p, i) => { moved[p.pid] = r3.indexOf(p.pid) - i; });
  const top = (f, min = 1) => { const p = rank.slice().sort((a, b) => f(b) - f(a) || rank.indexOf(a) - rank.indexOf(b))[0]; return p && f(p) >= min ? p : null; };
  const prizes = [["👑", "Kingslayer", top(p => p.castles), p => `${p.castles} castle${p.castles === 1 ? "" : "s"} taken`],
    ["🎯", "Hero hunter", top(p => p.kills), p => `${p.kills} heroes slain`], ["⚔", "Butcher", top(p => p.ukills), p => `${p.ukills} soldiers cut down`],
    ["🗡", "Oathbreaker", top(p => p.treachery), p => `${p.treachery} betrayal${p.treachery === 1 ? "" : "s"}`], ["🏆", "Day winner", top(p => p.wins), p => `${p.wins} day${p.wins === 1 ? "" : "s"} won`],
    ["⭐", "Best day", top(p => p.best), p => `${p.best} points in one battle`], ["🛡", "Survivor", top(p => p.survived), p => `hero alive at the end ${p.survived} time${p.survived === 1 ? "" : "s"}`],
    ["💰", "Treasurer", top(p => p.gold, 50), p => `${p.gold} gold of spoils`], ["📈", "Most improved", top(p => moved[p.pid]), p => `up ${moved[p.pid]} place${moved[p.pid] === 1 ? "" : "s"} since day 3`]].filter(x => x[2]);
  return { days, rank, prizes, war: pw.war };
}
const lordName = p => (typeof LIVE === "object" && LIVE.uid === p.pid) ? "You" : (typeof nameOf === "function" && LIVE.names && LIVE.names[p.pid] ? nameOf(p.pid) : p.name || "A lord");
// a lord's week, opened from the final standings: tabs for their numbers, and their final build (skills, items, army, upgrades)
const WL_TABS = [["stats", "Stats"], ["skills", "Skills"], ["items", "Items"], ["army", "Army"], ["ups", "Upgrades"]];
function lordWeekHTML(p) {
  const tab = (sheet && sheet.ltab) || "stats", pl = p.plan, kit = pl ? heroKit(pl) : [];
  const tabs = `<div class="wtabs" role="tablist">${WL_TABS.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? "on" : ""}" data-act="wltab" data-v="${k}"${k !== "stats" && !pl ? " disabled" : ""}>${l}</button>`).join("")}</div>`;
  const tile = x => `<div class="irow ab"><img alt="" src="${x.img}"><span><b>${esc(x.name)}</b><small class="muted">${esc(x.desc)}</small></span><small>${esc(x.sub)}</small></div>`;
  let body = "";
  if (tab === "stats" || !pl) body = `${worthStatsHTML(planWorth(pl), p.hasDmg ? { hero: p.dmgH, unit: p.dmgU, castle: p.dmgC } : null)}
      <div class="wgrid"><div><span>Days won</span><b>${p.wins}</b></div><div><span>Best day</span><b>${p.best} pts</b></div><div><span>Heroes slain</span><b>${p.kills}</b></div><div><span>Soldiers cut down</span><b>${p.ukills}</b></div><div><span>Castles taken</span><b>${p.castles}</b></div><div><span>Spoils</span><b>${p.gold}g</b></div>${p.survived ? `<div><span>Survived</span><b>${p.survived}×</b></div>` : ""}${p.treachery ? `<div><span>Betrayals</span><b>${p.treachery}</b></div>` : ""}</div>
      <div class="wdays">${p.daily.map((v, k) => `<span><small>Day ${k + 1}</small><b>${v}</b></span>`).join("")}</div>
      <p class="muted wnote">Net worth is the gold in their final army, hero items, castle and defences. Damage is the whole war's.</p>`;
  else if (tab === "skills") body = kit.filter(x => !x.item).map(tile).join("") || `<p class="muted">No skills learned.</p>`;
  else if (tab === "items") body = kit.filter(x => x.item).map(tile).join("") || `<p class="muted">No items.</p>`;
  else if (tab === "army") body = armyListHTML(pl);
  else body = upgradesListHTML(pl);
  return `<div class="wdet wl">${tabs}<div class="wtab-body insp">${pl && tab !== "stats" ? `<p class="muted wnote">As they fought the last battle${pl.level ? `, hero level ${pl.level}` : ""}.</p>` : ""}${body}</div></div>`;
}
function warEndSheet() {
  const pw = prevWar(); if (!pw) return head(null, "The war", "") + `<div class="body"><p class="muted">No finished war to show yet.</p></div>`;
  let first = false; try { first = !localStorage.getItem(WAREND_SEEN()); } catch (e) {}
  markWarEndSeen(); if (first) setTimeout(() => warCrowning(pw)); // the crowning plays over the war results the first time they open
  const W = warSummary(pw), [a, b, c] = W.rank, open = sheet.lord, max = Math.max(1, ...W.rank.flatMap(p => p.daily));
  const step = (p, place) => p ? `<div class="pod pod${place}"><img class="pdh" alt="" src="${spriteURL("c-" + (p.cls || "warrior"), p.color)}"><b>${esc(lordName(p))}</b><small>${p.pts} pts</small><div class="pdb" style="--c:${p.color || "#888"}"><span>${place}</span></div></div>` : `<div class="pod pod${place} empty"></div>`;
  const row = (p, i) => `<button class="wrow${open === p.pid ? " on" : ""}${p.pid === LIVE.uid ? " me" : ""}" data-act="wlord" data-v="${esc(p.pid)}"><span class="rk">${i + 1}</span><i class="sw" style="background:${p.color || "#888"}"></i><span class="nm"><b>${esc(lordName(p))}</b><small>${p.cls ? esc(CLASSES[p.cls].name) : ""}</small></span>
      <span class="spark">${p.daily.map(v => `<i style="height:${Math.max(6, Math.round(v / max * 100))}%" title="${v}"></i>`).join("")}</span><span class="pt">${p.pts}</span></button>
    ${open === p.pid ? lordWeekHTML(p) : ""}`;
  return head(null, `War ${W.war} is won`, a ? `${esc(lordName(a))} takes the crown with ${a.pts} points` : "") + `<div class="body warend">
    <div class="podium">${step(b, 2)}${step(a, 1)}${step(c, 3)}</div>
    <div class="row wbtns"><button class="btn wax" data-act="warcrown">👑 Crowning</button><button class="btn wax" data-act="warreel">▶ Top 5 moments</button><button class="btn wood" data-act="warfinal">Watch the final battle</button></div>
    <div class="sec tight"><h3>Final standings</h3><p class="muted">Points each day, then the war total. Tap a lord for their week.</p>${W.rank.map(row).join("")}</div>
    ${W.prizes.length ? `<div class="sec tight"><h3>War prizes</h3><div class="prizes">${W.prizes.map(([g, t, p, f]) => `<div class="prize"><span class="pg">${g}</span><span><b>${t}</b><small>${esc(lordName(p))} · ${esc(f(p))}</small></span></div>`).join("")}</div></div>` : ""}
    <div class="row"><button class="btn" data-act="open" data-v="hall">Hall of fame</button><button class="btn wax" data-act="close">${inLobby() ? "To the Muster Hall" : "Close"}</button></div></div>`;
}
// The crowning: the war's grand finale, played once when the war results first open (and again from the Crowning button).
// Every other lord bows in a line below a podium; trumpets; a bronze crown lands on 3rd, silver on 2nd, then after a drum roll
// the big gold crown on 1st with confetti and the winner's victory taunt. Each cheers when crowned; once the gold crown is on,
// the winner dances and 2nd and 3rd shake their heads.
const CROWN_SVG = (fill, dark, gem) => `<svg viewBox="0 0 40 28" aria-hidden="true"><path d="M3 25 L1 7 L11 15 L20 2 L29 15 L39 7 L37 25 Z" fill="${fill}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/><rect x="3" y="21" width="34" height="5" rx="1.5" fill="${dark}"/><circle cx="20" cy="15" r="3" fill="${gem}" stroke="${dark}" stroke-width="1"/><circle cx="11" cy="19" r="2" fill="#5aa0d8"/><circle cx="29" cy="19" r="2" fill="#47b04b"/><circle cx="1.5" cy="7" r="1.8" fill="${fill}" stroke="${dark}"/><circle cx="20" cy="2" r="1.8" fill="${fill}" stroke="${dark}"/><circle cx="38.5" cy="7" r="1.8" fill="${fill}" stroke="${dark}"/></svg>`;
const CROWNS = [CROWN_SVG("#f4c430", "#7a5208", "#d4402f"), CROWN_SVG("#d8dde3", "#5c6670", "#5aa0d8"), CROWN_SVG("#cd7f32", "#5a3410", "#47b04b")];
function warCrowning(pw, done) {
  pw = pw || prevWar(); if (!pw || document.querySelector(".crowning")) { if (done) done(); return; }
  const W = warSummary(pw), [a, b, c] = W.rank, rest = W.rank.slice(3), fast = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const last = pw.battles[W.days[W.days.length - 1]], plans = (last && last.inputs && last.inputs.plans) || [];
  const R = { meta: plans.map(p => ({ kind: "castle", pid: p.pid, banner: p.banner })) }, taunt = a ? tauntOf(R, a.pid, "tv") : "";
  const hero = (p, cls) => `<img class="${cls}" alt="" src="${spriteURL("c-" + (p.cls || "warrior"), p.color || "#888")}">`;
  const step = (p, place) => p ? `<div class="cr-pod cr-p${place}" data-place="${place}"><div class="cr-who"><span class="cr-crown">${CROWNS[place - 1]}</span>${hero(p, "cr-hero")}</div><div class="cr-step" style="--c:${p.color || "#888"}"><b>${place}</b><small>${esc(lordName(p))}</small><em>${p.pts} pts</em></div></div>` : `<div class="cr-pod cr-p${place} empty"></div>`;
  const el = document.createElement("div"); el.className = "crowning";
  el.innerHTML = `<canvas class="confetti"></canvas><div class="cr-rays"></div><div class="cr-box">
    <div class="cr-t">War ${W.war} is won</div><div class="cr-s">All hail ${a ? esc(lordName(a)) : "the victor"}!</div>
    ${taunt ? `<div class="vbubble cr-bubble">${esc(taunt)}</div>` : ""}
    <div class="cr-podium">${step(b, 2)}${step(a, 1)}${step(c, 3)}</div>
    ${rest.length ? `<div class="cr-court">${rest.map((p, i) => `<span class="cr-bow" style="--d:${(i * .12).toFixed(2)}s" title="${esc(lordName(p))}">${hero(p, "cr-hero")}<small>${esc(lordName(p))}</small></span>`).join("")}</div>` : ""}
    <button class="btn wax" id="crgo">Continue →</button></div>`;
  document.body.appendChild(el);
  let alive = true; const timers = [], at = (ms, f) => timers.push(setTimeout(() => { if (alive) f(); }, fast ? Math.min(ms, 300) : ms));
  const pod = n => el.querySelector(`.cr-p${n}`);
  const crown = (n, sfx) => { const p = pod(n); if (!p || p.classList.contains("empty")) return; p.classList.add("crowned", "cheer"); try { sting(sfx || "crown"); } catch (e) {} at(1100, () => p.classList.remove("cheer")); };
  // confetti, kept for the gold crown
  const cv = el.querySelector("canvas"), cx = cv.getContext && cv.getContext("2d"); let P = [];
  const burst = () => { if (!cx) return; cv.width = innerWidth; cv.height = innerHeight; P = Array.from({ length: 220 }, () => ({ x: cv.width / 2 + (Math.random() - .5) * 120, y: cv.height * .35, vx: (Math.random() - .5) * 14, vy: -6 - Math.random() * 10, s: 4 + Math.random() * 6, a: Math.random() * 6, col: ["#f4c430", "#d4402f", "#47b04b", "#5aa0d8", "#fff", "#cd7f32"][Math.floor(Math.random() * 6)] }));
    (function frame() { if (!alive) return; cx.clearRect(0, 0, cv.width, cv.height); P.forEach(q => { q.vy += .25; q.vx *= .99; q.x += q.vx + Math.sin(q.a += .08); q.y += Math.min(q.vy, 5); if (q.y > cv.height + 10) { q.y = -10; q.x = Math.random() * cv.width; q.vy = 2; q.vx = 0; } cx.fillStyle = q.col; cx.fillRect(q.x, q.y, q.s, q.s * .6); }); requestAnimationFrame(frame); })(); };
  try { sting("fanfare"); } catch (e) {}
  el.classList.add("bowing");
  at(1700, () => crown(3));
  at(3300, () => crown(2));
  at(4700, () => { el.classList.add("roll"); try { sting("drumroll"); } catch (e) {} });
  at(6300, () => { el.classList.remove("roll"); crown(1); el.classList.add("won"); burst(); try { sting("win"); } catch (e) {} });
  at(7600, () => { try { sting("groan"); } catch (e) {} });
  const finish = () => { if (!alive) return; alive = false; timers.forEach(clearTimeout); el.remove(); if (done) done(); };
  el.querySelector("#crgo").addEventListener("click", finish);
}
// past wars: the top three of every war this game has fought (kept by the server in the game's settings)
function hallSheet() {
  const H = ((LIVE && LIVE.config && LIVE.config.hall) || []).slice().reverse();
  return head(null, "Hall of fame", H.length ? `${H.length} war${H.length === 1 ? "" : "s"} fought` : "No war has ended yet") + `<div class="body">
    ${H.length ? H.map(h => `<div class="hall"><h3>War ${h.war}<small>${new Date(h.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</small></h3>
      ${(h.top || []).map((t, i) => `<div class="hrow"><span>${["🥇", "🥈", "🥉"][i]}</span><b>${esc(t.pid === LIVE.uid ? "You" : t.name)}</b><small>${t.pts} pts</small></div>`).join("")}</div>`).join("")
      : `<p class="muted">When a war's seventh battle is fought, its winners are written here.</p>`}
    ${prevWar() ? `<div class="row"><button class="btn wood" data-act="open" data-v="warend">Last war's ceremony</button></div>` : ""}</div>`;
}
// the Muster Hall card for the war that just ended
function warEndCardHTML() {
  const pw = prevWar(); if (!pw) return ""; const W = warSummary(pw), a = W.rank[0];
  return `<div class="lbox warcard"><h3>⚔ War ${W.war} is over</h3><p>${a ? `<b>${esc(lordName(a))}</b> won with ${a.pts} points.` : ""} Registration for the next war is open: change your hero, banner and name below.</p>
    <div class="row"><button class="btn wax" data-act="open" data-v="warend">The ceremony</button><button class="btn wood" data-act="warreel">▶ Highlights</button><button class="btn small" data-act="open" data-v="hall">Hall of fame</button></div></div>`;
}

// ----- watching the finished war: its battles belong to the last war, so the game looks at that war while the replay plays -----
let WAR_VIEW = null; // { cfg, battles, days, i, reel } while a finished war's battle is on screen
function viewPrevWar(on) {
  const pw = prevWar();
  if (on && pw && !WAR_VIEW) { const days = Object.keys(pw.battles).sort(), b0 = pw.battles[days[0]];
    WAR_VIEW = { cfg: LIVE.config, battles: LIVE.battles, map: { N, castle: CASTLE, rivals: RIVALS, rwalls: RWALLS, rarmy: RARMY, v2: ZONE_V2 } };
    LIVE.config = Object.assign({}, LIVE.config, { lobby: false, lobbyEnds: null, startDate: b0.week || days[0], war: pw.war, planDay: addDays(days[days.length - 1], 1) }); LIVE.battles = pw.battles; }
  else if (!on && WAR_VIEW) { const m = WAR_VIEW.map; LIVE.config = WAR_VIEW.cfg; LIVE.battles = WAR_VIEW.battles; WAR_VIEW = null; WAR_REEL = null;
    RIVALS = m.rivals; RWALLS = m.rwalls; RARMY = m.rarmy; try { applyLayout(m.N, m.castle, RIVALS.map(r => r.pos), m.v2); } catch (e) {} } // the map exactly as it was
}
function layoutFor(dayKey) { // the map as it stood for that battle, from its saved castles
  const s = LIVE.battles[dayKey] && LIVE.battles[dayKey].inputs; if (!s) return;
  const mine = s.plans.find(p => p.pid === LIVE.uid) || s.plans[0];
  RWALLS = []; RARMY = []; RIVALS = s.plans.filter(p => p !== mine).map(p => ({ id: p.pid, name: nameOf(p.pid), pos: p.castle, color: p.color, banner: p.banner, cls: p.cls, trust: "Unknown" }));
  applyLayout(s.N, mine.castle, RIVALS.map(r => r.pos), mapV2For(LIVE.battles[dayKey].week || dayKey));
}
function watchPrevBattle(dayKey, how) { viewPrevWar(true); const lb = document.getElementById("lobby"); if (lb) lb.hidden = true; layoutFor(dayKey); watchLiveBattle(dayKey, how); }
function endPrevView() { if (!WAR_VIEW) return; viewPrevWar(false); const lb = document.getElementById("lobby"); if (lb) lb.hidden = false; liveChanged(); } // catch up on anything that changed while it played
// the war's highlights: the five biggest moments of the whole war (betrayals, huge ultimates, carnage, giants falling, the final castle),
// found by fighting each saved battle again quickly, then played in order, each day showing only its picked moments
let WAR_REEL = null;
const WAR_REEL_TOP = 5;
const warScore = (h, last) => h.kind === "winner" ? (last ? 98 : 70) : (h.score || 0) + (h.kind === "ult" && h.other ? 15 : 0);
function warMoments(days) {
  const all = [];
  days.forEach((d, di) => { try {
    layoutFor(d); const sv = savedBattle(d); if (!sv) return;
    const R = runBattle(sv.plans, daySeed(d), { fast: true, N: sv.N, finalDay: sv.final, ultV2: sv.ultV2, balV2: sv.balV2, balV3: sv.balV3, fairV1: sv.fairV1, pickV1: sv.pickV1, balV4: sv.balV4, suddenV1: sv.suddenV1, treesV1: sv.treesV1, heroV3: sv.heroV3, dayNo: sv.dayNo || weekdayOf(d), ranks: sv.ranks || undefined, twist: sv.twist });
    R.names = Object.fromEntries(sv.plans.map(p => [p.pid, p.name])); R.colors = R.colors || {}; R.duration = R.duration || 999;
    buildReel(R).forEach(c => all.push({ d, kind: c.h.kind, t: c.h.t, s: warScore(c.h, di === days.length - 1 && !!c.h.last) }));
  } catch (e) { console.warn("Daily Siege: war highlights skipped a day", d, e); } });
  const per = {}, top = [];
  all.sort((a, b) => b.s - a.s || (a.d < b.d ? -1 : 1)).forEach(m => { if (top.length >= WAR_REEL_TOP || (per[m.kind] || 0) >= 2) return; per[m.kind] = (per[m.kind] || 0) + 1; top.push(m); });
  return top;
}
function startWarReel() {
  const pw = prevWar(); if (!pw) return; const days = Object.keys(pw.battles).sort().filter(d => pw.battles[d].inputs);
  if (!days.length) { toast("Nothing to show yet."); return; }
  sheet = null; WAR_REEL = null; viewPrevWar(true); toast("Finding the war's five biggest moments…");
  setTimeout(() => { // let the toast show before the battles are fought again
    const top = warMoments(days), use = days.filter(d => top.some(m => m.d === d));
    if (!use.length) { endPrevView(); toast("Nothing big happened in this war."); return; }
    WAR_REEL = { days: use, i: 0, top }; watchPrevBattle(use[0], "reel"); }, 60);
}
function warReelNext() { // called when one day's reel ends
  const r = WAR_REEL; if (!r) return false; r.i++;
  if (r.i >= r.days.length) { WAR_REEL = null; mode = "plan"; replay = null; endPrevView(); sheet = { type: "warend" }; render(); return true; }
  replay = null; mode = "plan"; layoutFor(r.days[r.i]); watchLiveBattle(r.days[r.i], "reel"); return true;
}
// a day's reel inside the war reel keeps only the moments picked for the war's top five
function warReelClips(clips) {
  if (!WAR_REEL) return clips; const d = WAR_REEL.days[WAR_REEL.i], want = (WAR_REEL.top || []).filter(m => m.d === d);
  return clips.filter(c => want.some(m => m.kind === c.h.kind && Math.abs(m.t - c.h.t) < .01)).sort((a, b) => a.a - b.a);
}

Object.assign(A, {
  wlord: v => { sheet.lord = sheet.lord === v ? null : v; },
  wltab: v => { sheet.ltab = v; },
  warreel: () => startWarReel(),
  warcrown: () => warCrowning(),
  warfinal: () => { const pw = prevWar(); if (!pw) return; const d = Object.keys(pw.battles).sort().pop(); sheet = null; watchPrevBattle(d, "play"); },
});
