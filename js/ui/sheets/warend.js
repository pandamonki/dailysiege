// The end of a war: the ceremony (podium, final standings, war prizes, every lord's week), the war's highlight reel,
// the Muster Hall card that leads to them, and the hall of fame of past wars.
// When a war's 7th battle is fought the server opens registration for the next war (functions/lib/resolve.js endWar),
// so the finished war's battles arrive as LIVE.prevWar ({ war, battles }) from the backend.

const prevWar = () => (typeof LIVE === "object" && LIVE.prevWar && Object.keys(LIVE.prevWar.battles || {}).length ? LIVE.prevWar : null);
const WAREND_SEEN = () => `ds.warend.${(window.DS && DS.gameId) || "local"}.${(prevWar() || {}).war || 0}`;
const warEndDue = () => { if (!prevWar() || (sheet && sheet.type === "warend") || mode !== "plan") return false; try { return !localStorage.getItem(WAREND_SEEN()); } catch (e) { return false; } };
function markWarEndSeen() { try { localStorage.setItem(WAREND_SEEN(), "1"); } catch (e) {} }

// everything the ceremony shows, worked out from the war's saved battles (no battle is fought again)
function warSummary(pw) {
  const days = Object.keys(pw.battles).sort(), per = {};
  days.forEach((d, di) => (pw.battles[d].results || []).forEach(r => {
    const p = per[r.pid] || (per[r.pid] = { pid: r.pid, name: r.name, color: r.color, cls: r.cls, daily: days.map(() => 0), pts: 0, kills: 0, ukills: 0, castles: 0, gold: 0, wins: 0, best: 0, treachery: 0, survived: 0 });
    p.daily[di] = r.points || 0; p.pts += r.points || 0; p.kills += r.kills || 0; p.ukills += r.ukills || 0; p.castles += r.castles || 0; p.gold += r.gold || 0;
    if (r.place === 1) p.wins++; if ((r.points || 0) > p.best) p.best = r.points || 0; p.treachery += r.treachery || 0; if (r.survivor) p.survived++;
    if (r.color) p.color = r.color; if (r.cls) p.cls = r.cls; }));
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
function warEndSheet() {
  const pw = prevWar(); if (!pw) return head(null, "The war", "") + `<div class="body"><p class="muted">No finished war to show yet.</p></div>`;
  markWarEndSeen();
  const W = warSummary(pw), [a, b, c] = W.rank, open = sheet.lord, max = Math.max(1, ...W.rank.flatMap(p => p.daily));
  const step = (p, place) => p ? `<div class="pd pd${place}"><img class="pdh" alt="" src="${spriteURL("c-" + (p.cls || "warrior"), p.color)}"><b>${esc(lordName(p))}</b><small>${p.pts} pts</small><div class="pdb" style="--c:${p.color || "#888"}"><span>${place}</span></div></div>` : `<div class="pd pd${place} empty"></div>`;
  const row = (p, i) => `<button class="wrow${open === p.pid ? " on" : ""}${p.pid === LIVE.uid ? " me" : ""}" data-act="wlord" data-v="${esc(p.pid)}"><span class="rk">${i + 1}</span><i class="sw" style="background:${p.color || "#888"}"></i><span class="nm"><b>${esc(lordName(p))}</b><small>${p.cls ? esc(CLASSES[p.cls].name) : ""}</small></span>
      <span class="spark">${p.daily.map(v => `<i style="height:${Math.max(6, Math.round(v / max * 100))}%" title="${v}"></i>`).join("")}</span><span class="pt">${p.pts}</span></button>
    ${open === p.pid ? `<div class="wdet"><div><span>Days won</span><b>${p.wins}</b></div><div><span>Best day</span><b>${p.best} pts</b></div><div><span>Heroes slain</span><b>${p.kills}</b></div><div><span>Soldiers cut down</span><b>${p.ukills}</b></div><div><span>Castles taken</span><b>${p.castles}</b></div><div><span>Spoils</span><b>${p.gold}g</b></div>${p.survived ? `<div><span>Survived</span><b>${p.survived}×</b></div>` : ""}${p.treachery ? `<div><span>Betrayals</span><b>${p.treachery}</b></div>` : ""}
      <div class="wdays">${p.daily.map((v, k) => `<span><small>Day ${k + 1}</small><b>${v}</b></span>`).join("")}</div></div>` : ""}`;
  return head(null, `War ${W.war} is won`, a ? `${esc(lordName(a))} takes the crown with ${a.pts} points` : "") + `<div class="body warend">
    <div class="podium">${step(b, 2)}${step(a, 1)}${step(c, 3)}</div>
    <div class="row wbtns"><button class="btn wax" data-act="warreel">▶ Highlights of the war</button><button class="btn wood" data-act="warfinal">Watch the final battle</button></div>
    <div class="sec tight"><h3>Final standings</h3><p class="muted">Points each day, then the war total. Tap a lord for their week.</p>${W.rank.map(row).join("")}</div>
    ${W.prizes.length ? `<div class="sec tight"><h3>War prizes</h3><div class="prizes">${W.prizes.map(([g, t, p, f]) => `<div class="prize"><span class="pg">${g}</span><span><b>${t}</b><small>${esc(lordName(p))} · ${esc(f(p))}</small></span></div>`).join("")}</div></div>` : ""}
    <div class="row"><button class="btn" data-act="open" data-v="hall">Hall of fame</button><button class="btn wax" data-act="close">${inLobby() ? "To the Muster Hall" : "Close"}</button></div></div>`;
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
// the war's highlights: the best two moments of each day (and the day 7 finale), played day after day
let WAR_REEL = null;
const WAR_REEL_PER_DAY = 2;
function startWarReel() {
  const pw = prevWar(); if (!pw) return; const days = Object.keys(pw.battles).sort().filter(d => pw.battles[d].inputs);
  if (!days.length) { toast("Nothing to show yet."); return; }
  sheet = null; WAR_REEL = null; viewPrevWar(true); WAR_REEL = { days, i: 0 }; watchPrevBattle(days[0], "reel");
}
function warReelNext() { // called when one day's reel ends
  const r = WAR_REEL; if (!r) return false; r.i++;
  if (r.i >= r.days.length) { WAR_REEL = null; mode = "plan"; replay = null; endPrevView(); sheet = { type: "warend" }; render(); return true; }
  replay = null; mode = "plan"; layoutFor(r.days[r.i]); watchLiveBattle(r.days[r.i], "reel"); return true;
}
// a day's reel inside the war reel keeps only its biggest moments (and the finale)
function warReelClips(clips) {
  if (!WAR_REEL) return clips; const fin = clips.filter(c => c.h.last), rest = clips.filter(c => !c.h.last).sort((a, b) => (b.h.score || 0) - (a.h.score || 0)).slice(0, WAR_REEL_PER_DAY);
  return rest.concat(fin).sort((a, b) => a.a - b.a);
}

Object.assign(A, {
  wlord: v => { sheet.lord = sheet.lord === v ? null : v; },
  warreel: () => startWarReel(),
  warfinal: () => { const pw = prevWar(); if (!pw) return; const d = Object.keys(pw.battles).sort().pop(); sheet = null; watchPrevBattle(d, "play"); },
});
