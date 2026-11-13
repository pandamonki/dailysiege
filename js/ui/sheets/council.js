// War council: rivals, alliances, strategy, orders, sealing

const clsName = c => (c ? CLASSES[c].name : "Class unknown");
const GOLD_STEPS = [0, 50, 100, 150, 200, 300, 400, 500, 750, 1000];
const stepGold = (v, dir) => { const i = GOLD_STEPS.findIndex(x => x >= v); const j = Math.max(0, Math.min(GOLD_STEPS.length - 1, (i < 0 ? GOLD_STEPS.length - 1 : i) + dir)); return GOLD_STEPS[j]; };
function sideOf(r) { // where a rival sits relative to you, looking toward the centre
  const fy = CENTRE - CASTLE[0], fx = CENTRE - CASTLE[1], vy = r.pos[0] - CASTLE[0], vx = r.pos[1] - CASTLE[1];
  const cross = fx * vy - fy * vx, dot = (fx * vx + fy * vy) / ((Math.hypot(fx, fy) * Math.hypot(vx, vy)) || 1);
  return dot > .6 ? "ahead" : cross > 0 ? "right" : "left";
}
const prevDayKey = () => (isLive() ? addDays(liveClock().planDay, -1) : DAY - 1);
function incomingOffer(r) { // an invitation sent to me in the previous planning phase that is waiting for my answer
  let o = null;
  if (isLive()) { const now = latestPlan(r.live, liveClock().planDay, true), x = now && now.offers && now.offers[LIVE.uid]; if (x && x.day === prevDayKey()) o = x; }
  else { const x = (RIVAL_AI[r.id] && RIVAL_AI[r.id].offers || {}).you; if (x && DAY >= 2 && !(S.declined || {})[r.id]) o = x; }
  if (!o || carriedPartners().includes(r.id) || finalToday()) return null;
  return { gold: o.gold || 0, reply: (S.replies || {})[r.id] || null };
}
const pendingInvites = () => RIVALS.map(r => ({ r, o: incomingOffer(r) })).filter(x => x.o && !x.o.reply);
const inviteDue = () => !!S && !S.lobbyPrep && S.invSeen !== planDayKey() && pendingInvites().length > 0;
const MAX_INVITES = 2;
function inviteSheet() {
  const list = pendingInvites();
  return head(null, "Alliance invitations", "Answer before tonight's battle") + `<div class="body">
    ${list.length ? list.map(({ r, o }) => `<div class="invcard"><div class="spread"><span><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b> invites you to ally</span><span class="chip ${o.gold ? "ok" : ""}">${o.gold ? `<i class="coin"></i> ${o.gold} dowry` : "no dowry"}</span></div>
      <div class="row"><button class="btn wax" data-act="ireply" data-k="${r.id}" data-v="accept" ${dis()}>Accept</button><button class="btn" data-act="ireply" data-k="${r.id}" data-v="reject" ${dis()}>Decline</button></div></div>`).join("") : `<p class="muted">All answered.</p>`}
    <p class="muted">Accepting forms the alliance at the start of tonight's battle, and everyone sees it on the muster screen. The dowry is paid to you if you accept.</p>
    <p class="note"><b>Remember:</b> you can betray an ally at any point in the game. Open <b>Alliances</b> and choose <b>Betray</b>, then set when to turn on them. Allies who survive together win together.</p>
    <div><button class="btn small" data-act="idismiss">Decide later</button></div></div>`;
}
function targetsHTML() {
  const row = (id, i, list) => { const r = RIVALS.find(x => x.id === id); if (!r) return "";
    return `<li class="tgt"><i class="sw" style="background:${r.color}"></i><span><b>${esc(r.name)}</b> <span class="muted">${sideOf(r)}${seeArmies() && r.cls ? " · " + clsName(r.cls) : ""}</span></span><span class="row">
      ${list === "hostile" ? `<button class="btn small" data-act="lup" data-k="${id}" aria-label="Attack sooner" ${dis(i === 0)}>▲</button><button class="btn small" data-act="ldown" data-k="${id}" aria-label="Attack later" ${dis(i === S.lists.hostile.length - 1)}>▼</button>` : ""}
      ${list !== "hostile" ? `<button class="btn small hostile" data-act="lmove" data-k="${id}" data-v="hostile" ${dis()}>Hostile</button>` : ""}
      ${list !== "neutral" ? `<button class="btn small" data-act="lmove" data-k="${id}" data-v="neutral" ${dis()}>Neutral</button>` : ""}
</span></li>`; };
  const sides = ["left", "ahead", "right"].map(sd => [sd, RIVALS.filter(r => sideOf(r) === sd).sort((a, b) => Math.hypot(a.pos[0] - CASTLE[0], a.pos[1] - CASTLE[1]) - Math.hypot(b.pos[0] - CASTLE[0], b.pos[1] - CASTLE[1]))[0]]).filter(([, r]) => r);
  return `<p class="muted">Your army marches on the first player in Hostile and fights anything that crosses its path on the way. When that castle falls it moves to the next. Neutral players are left alone unless they get in the way. With nobody hostile, your army still marches on the nearest castle.</p>
    ${sides.length ? `<div class="sec"><h3>Quick plans</h3><div class="row">${sides.map(([sd, r]) => `<button class="btn small wood" data-act="preset" data-v="${sd}" ${dis()}>Strike ${sd} · ${esc(r.name)}</button>`).join("")}</div></div>` : ""}
    <div class="sec"><h3>Hostile · attack order</h3><ol class="tgts">${S.lists.hostile.map((id, i) => row(id, i, "hostile")).join("") || `<li class="muted">Nobody. Your army will pick the nearest castle.</li>`}</ol></div>
    <div class="sec"><h3>Neutral</h3><ol class="tgts">${S.lists.neutral.map((id, i) => row(id, i, "neutral")).join("") || `<li class="muted">Nobody.</li>`}</ol></div>
    <p class="muted">Tap one of your soldiers on the map to give it its own target.</p>`;
}
function uorderSheet(id) {
  const champ = id === "champ", u = champ ? null : findUnit(id), cur = S.uorders[id] || "army";
  const guards = Object.entries(S.uorders).filter(([k, v]) => v === "guard" && k !== id && placedAt(k)).length;
  const optsList = [["army", champ ? "Lead the army" : "Follow the army", "Marches on your attack order"],
    ...(champ ? [] : [["escort", "Escort the hero", "Stays close and fights beside your hero"], ["guard", "Guard the castle", guards ? "Only one soldier can stay home" : "Stays home. Only one soldier can"]]),
    ...RIVALS.map(r => [r.id, `Attack ${r.name}`, `Heads for ${r.name} whatever the army does`])];
  return head(champ ? spriteURL("c-" + S.cls) : spriteURL(u.type), champ ? `${cls().name} Hero` : UNITS[u.type].name, "Orders for tonight") + `<div class="body">
    <div class="olist">${optsList.map(([k, l, dsc]) => `<button class="opt${cur === k ? " on" : ""}" data-act="uorder" data-k="${id}" data-v="${k}" ${dis(k === "guard" && guards > 0)}><b>${esc(l)}</b><span>${esc(dsc)}</span></button>`).join("")}</div>
    <p class="muted">Whatever its orders, a soldier fights enemies it meets on the way and falls back to heal when hurt, as your stance says.</p></div>`;
}
function ensureDip() {
  if (!S) return;
  S.tree = cleanTree(S.tree);
  S.strategy = S.strategy || { mode: "list", heading: "castle" };
  S.gprio = cleanGprio(S.gprio); S.engage = cleanEngage(S.engage); ensureGarrison();
  if (!S.prio || S.prio.length !== 5 || S.prio.some(x => !PRIORITY_OPTS.includes(x))) S.prio = PRIORITIES.slice(0, 5);
  S.lists = S.lists || { hostile: [], neutral: [], ally: [] }; S.offers = S.offers || {}; S.replies = S.replies || {}; S.declined = S.declined || {}; S.bids = S.bids || {}; S.mercHist = S.mercHist || {};
  S.lists.neutral = (S.lists.neutral || []).concat(S.lists.ally || []); S.lists.ally = []; S.terms = S.terms || {}; S.uorders = S.uorders || {}; S.diplo = S.diplo || {};
  S.castle = S.castle || 1; S.items = S.items || []; S.walls = S.walls || []; S.banner = S.banner || defaultBanner(); S.pairs = S.pairs || []; S.pactAct = S.pactAct || {}; S.pactWhen = S.pactWhen || {}; S.xp = S.xp || 0;
  S.phase = S.phase || "muster"; if (STANCE_FIX[S.stance]) S.stance = STANCE_FIX[S.stance];
  S.rules = (S.rules || []).map(r => ({ if: r.if, then: r.then === "All units defend castle" ? "All units fall back to regroup" : r.then === "Switch to Defensive" ? "Switch to Cautious" : r.then }));
  const ids = RIVALS.map(r => r.id);
  ["hostile", "neutral", "ally"].forEach(k => { S.lists[k] = S.lists[k].filter((id, i, a) => ids.includes(id) && a.indexOf(id) === i); });
  const placed = new Set([...S.lists.hostile, ...S.lists.neutral, ...S.lists.ally]);
  RIVALS.slice().sort((a, b) => Math.hypot(a.pos[0] - CASTLE[0], a.pos[1] - CASTLE[1]) - Math.hypot(b.pos[0] - CASTLE[0], b.pos[1] - CASTLE[1])).forEach(r => {
    if (!placed.has(r.id)) S.lists.hostile.push(r.id);
    S.diplo[r.id] = S.diplo[r.id] || {}; S.diplo[r.id].clues = S.diplo[r.id].clues || [];
    S.terms[r.id] = S.terms[r.id] || { mode: "accept", min: 200, when: BETRAY_WHEN[0] };
  });
  Object.keys(S.offers).forEach(id => { const o = S.offers[id]; if (!ids.includes(id) || !o || o.day == null) delete S.offers[id]; });
  Object.keys(S.replies).forEach(id => { if (!ids.includes(id)) delete S.replies[id]; });
  Object.keys(S.uorders).forEach(k => { const v = S.uorders[k]; if (!["army", "escort", "guard"].includes(v) && !ids.includes(v)) delete S.uorders[k]; });
  Object.keys(S.pactAct).forEach(id => { if (!ids.includes(id)) { delete S.pactAct[id]; delete S.pactWhen[id]; } });
}
const reserved = () => Object.values((S && S.offers) || {}).reduce((a, o) => a + (o.gold || 0), 0) + (typeof bidsReserved === "function" ? bidsReserved() : 0);
const avail = () => S.gold - reserved();
const bucketOf = id => (S.lists.hostile.includes(id) ? "hostile" : (S.offers[id] || carriedPartners().includes(id)) ? "ally" : "neutral");
function rivalSheet(id) {
  ensureDip();
  const r = RIVALS.find(x => x.id === id), d = S.diplo[id];
  const live = isLive(), seen = live ? r.seen : (seeArmies() ? { cls: r.cls } : null);
  let intel = "";
  if (!seeArmies()) intel = `<p class="muted">It's day 1: all you know is where their castle stands. After tonight's battle you'll see what they fielded.</p>`;
  else if (live && r.seen) {
    const g = r.seen.gear || {}, items = GEAR_SLOTS.map(([gk]) => g[gk] ? GEAR[gk][g[gk] - 1].name : null).filter(Boolean);
    const units = (r.seen.pieces || []).filter(p => p.kind === "unit");
    intel = `<p class="muted">From yesterday's battle (level ${DAY - 1}).</p><div class="iabl"><span>${clsName(r.seen.cls)}</span>${items.map(n => `<span>${esc(n)}</span>`).join("")}${units.map(u => `<span>${esc(UNITS[u.type].name)} Lv${u.lvl}</span>`).join("")}${!items.length && !units.length ? `<span class="off">No gear or soldiers</span>` : ""}</div>`;
  } else if (live) intel = `<p class="muted">They didn't fight yesterday, so there's nothing to see yet.</p>`;
  else intel = `<p class="muted">Their soldiers from yesterday are shown around their castle.</p>`;
  const b = bucketOf(id);
  return head(seen && seen.cls ? spriteURL("c-" + seen.cls) : null, `${r.name}'s Castle`, `${seen && seen.cls ? clsName(seen.cls) : "Class unknown"} · seems <span class="trust t-${r.trust}">${r.trust === "Unknown" ? "hard to read" : r.trust}</span> toward you`) + `<div class="body">
    <div class="sec"><h3>What you know</h3>${intel}</div>
    <div class="sec"><h3>Tonight</h3><div class="rvlist">${rivalRow(r, true)}</div></div></div>`;
}
function pactHTML() {
  const ids = carriedPartners(); if (!ids.length) return "";
  const nm = id => esc((RIVALS.find(r => r.id === id) || {}).name || "an ally");
  if (finalToday()) return `<div class="sec"><h3>Final day</h3><p>${ids.map(nm).join(", ")}: your pact${ids.length > 1 ? "s dissolve" : " dissolves"} at dawn. Only one lord can win the Daily Siege.</p></div>`;
  ensureDip();
  return `<div class="sec"><h3>Alliances carried over</h3>${ids.map(id => { const a = S.pactAct[id] || "keep";
    return `<div class="pact"><b>${nm(id)}</b><div class="optrow">${[["keep", "Keep"], ["break", "Break it"], ["betray", "Betray"]].map(([k, l]) => `<button class="btn small${a === k ? " on" : ""}" data-act="pact" data-v="${k}" data-k="${id}" ${dis()}>${l}</button>`).join("")}</div>${a === "betray" ? `<label class="inline">Betray when<select data-act="pwhen" data-k="${id}" ${dis()}>${opts(BETRAY_WHEN, S.pactWhen[id])}</select></label>` : ""}</div>`; }).join("")}
    <p class="muted">Breaking a pact is clean. A betrayal is a surprise mid-battle. Your hero plants a bomb in their keep: it flashes red for about two seconds, then blows up for half its health. The victim will remember, and you become bitter rivals. Allies win the day together if only allies are left standing.</p></div>`;
}
function diplomacySection(R) {
  const D = R.dip; if (!D) return ""; const N = q => esc((R.names && R.names[q]) || "Someone"), li = [];
  D.offers.forEach(o => li.push(`<li>✉ <b>${N(o.pid)}</b> invited you to ally${o.gold ? ` with a ${o.gold} gold dowry` : ""}. ${o.accepted ? `<span class="ok">You allied.</span>` : `<span class="muted">You declined, or the alliance could not form.</span>`}</li>`));
  D.broke.forEach(o => li.push(`<li>✂ <b>${N(o.pid)}</b> broke their pact with you.</li>`));
  D.bets.forEach(o => li.push(`<li class="bad">🗡 <b>${N(o.pid)}</b> betrayed you at ${fmt(o.t)} and blew up your keep.</li>`));
  return `<div class="sec dipsec"><h3>Diplomacy</h3>${li.length ? `<ul class="pacts">${li.join("")}</ul>` : `<p class="muted">Nobody reached out, broke faith or betrayed you today.</p>`}</div>`;
}
function councilHTML() {
  const live = isLive(), ck = live ? liveClock() : null, pts = live ? standings(ck.week) : {};
  const lords = RIVALS.slice().sort((a, b) => (pts[b.id] || 0) - (pts[a.id] || 0));
  const battles = live ? Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === ck.week).sort() : [];
  return `
    <p class="muted">Scores and battle history are in the Leaderboard and Battle report (top bar).</p>
    <div class="sec"><h3>Rivals</h3>${lords.map(r => `<button class="lord" data-act="open" data-v="rival" data-k="${r.id}"><i style="background:${r.color}"></i><span><b>${esc(r.name)}</b> · ${seeArmies() ? clsName(r.cls) : "Class unknown"}</span><span class="trust t-${r.trust}">${bucketOf(r.id) === "ally" ? "Seeking alliance" : bucketOf(r.id) === "hostile" ? "Hostile" : "Neutral"}</span></button>`).join("") || `<p class="muted">No rivals yet. Invite friends from the Share menu.</p>`}</div>
    <div><button class="btn" data-act="open" data-v="game">${live ? "Game settings" : "Play with friends"}</button></div>`;
}
function councilSheet() { sheet.tab = sheet.tab || "council"; return ordersSheet(); }
function inviteStatus(r) {
  const o = S.offers[r.id], today = planDayKey(); if (!o) return "";
  return o.day === today ? `Invitation drafted (${o.gold}g dowry). Goes out tonight` : `Invitation pending (${o.gold}g dowry). Awaiting their answer`;
}
function rivalRow(r, open) {
  const b = bucketOf(r.id), rank = S.lists.hostile.indexOf(r.id) + 1, inc = incomingOffer(r), allied = carriedPartners().includes(r.id) && !finalToday();
  const status = allied ? "Allied" : S.offers[r.id] ? inviteStatus(r) : (b === "hostile" ? (rank === 1 ? "Main target" : `Attack #${rank}`) : "Left alone unless in the way")
    + (inc ? ` · invited you${inc.reply ? ` (${inc.reply === "accept" ? "you accepted" : "you declined"})` : ", answer pending"}` : "");
  return `<div class="rv${open ? " open" : ""}">
    <button class="rvn" data-act="rvopen" data-v="${r.id}"><i class="sw" style="background:${r.color}"></i><span><b>${esc(r.name)}</b><small>${esc(status)}</small></span></button>
    <div class="rvseg"><button class="${b === "hostile" ? "on hostile" : ""}" data-act="rvset" data-k="${r.id}" data-v="hostile" ${dis()}>${b === "hostile" ? `Attack ${rank}` : "Attack"}</button><button class="${b === "neutral" ? "on" : ""}" data-act="rvset" data-k="${r.id}" data-v="neutral" ${dis()}>Ignore</button>${allied || S.offers[r.id] ? "" : `<button class="ally" data-act="invite" data-k="${r.id}" ${dis()}>Invite</button>`}</div>
  </div>`;
}

const TMODES = [["list", "My own list", "Attack the lords you order below, top to bottom."], ["highest", "Highest ranked", "Go after whoever leads the leaderboard."], ["lowest", "Lowest ranked", "Pick on the lord in last place."],
  ["above", "One rank above me", "Chase the lord just ahead of you on the board."], ["below", "One rank below me", "Squash the lord just behind you."], ["toplevel", "Highest level hero", "Hunt the most experienced hero."],
  ["weakhero", "Weakest hero", "Hunt the hero with the least health."], ["weakcastle", "Weakest castle", "The castle with the least health when the battle starts."], ["closest", "Closest castle", "Whoever sits nearest to your castle."]];
const HEADINGS = [["hero", "Hero", "Marches straight at their hero"], ["castle", "Castle", "Marches straight at their castle"], ["near", "Nearest", "Marches at whatever of theirs is closest"], ["centre", "Battleground", "Marches to the central hill and contests it"]];
// the order your army will go after lords while it isn't in a fight (a client-side preview of what the sim decides)
function previewOrder() {
  const st = S.strategy, ids = RIVALS.map(r => r.id).filter(id => S.lists.hostile.includes(id)); if (st.mode === "list") return S.lists.hostile.slice();
  let rk = {}; try { rk = isLive() ? rankMap(standings(liveClock().week, addDays(liveClock().planDay, -1)), RIVALS.map(r => r.id).concat([LIVE.uid])) : rankMap(PRACTICE_BOARD, RIVALS.map(r => r.id).concat(["you"])); } catch (e) { rk = {}; }
  const me = isLive() ? LIVE.uid : "you", R = id => (rk[id] != null ? rk[id] : RIVALS.findIndex(r => r.id === id) + 2), mine = rk[me] != null ? rk[me] : 1, rv = id => RIVALS.find(r => r.id === id), dist = id => Math.hypot(rv(id).pos[0] - CASTLE[0], rv(id).pos[1] - CASTLE[1]);
  const key = { highest: R, lowest: id => -R(id), above: id => Math.abs(R(id) - (mine - 1)) + (R(id) < mine ? 0 : .5), below: id => Math.abs(R(id) - (mine + 1)) + (R(id) > mine ? 0 : .5), toplevel: id => -(rv(id).level || DAY),
    weakhero: id => (CHAMP[rv(id).cls] || CHAMP.warrior).hp * (1 + .08 * ((rv(id).level || DAY) - 1)), weakcastle: id => rv(id).ctier || 1, closest: dist }[st.mode];
  return ids.sort((a, b) => key(a) - key(b));
}
function strategyTab() {
  const st = S.strategy, tm = TMODES.find(x => x[0] === st.mode) || TMODES[0], hostile = S.lists.hostile, idle = RIVALS.filter(r => !hostile.includes(r.id));
  const row = (id, i) => { const r = RIVALS.find(x => x.id === id); if (!r) return "";
    return `<li class="tgt cp" data-k="${id}"><span class="grip" aria-label="Drag to reorder">⠿</span><span class="ord">${i + 1}</span><i class="sw" style="background:${r.color}"></i><span class="tn"><b>${esc(r.name)}</b></span><button class="btn small" data-act="lmove" data-v="neutral" data-k="${id}" aria-label="Stop attacking ${esc(r.name)}" ${dis()}>✕</button></li>`; };
  return `<div class="sec tight"><h3>1 · Who to attack <small class="hint">drives direction out of combat</small></h3><select class="wide" data-act="tmodeset" ${dis()}>${TMODES.map(([k, n]) => `<option value="${k}"${st.mode === k ? " selected" : ""}>${n}</option>`).join("")}</select>${st.mode === "list" ? "" : `<p class="muted">${esc(tm[2])}</p>`}
      ${st.mode === "list" ? `<ol class="tgts cpl" id="tgtlist">${hostile.map(row).join("") || `<li class="muted">Nobody. Your army will pick the nearest castle.</li>`}</ol>` : `<p class="muted">Order tonight: <b>${previewOrder().map(id => esc(RIVALS.find(r => r.id === id).name)).join(" → ") || "nobody"}</b></p>`}
      ${idle.length ? `<div class="chips"><span class="muted">${st.mode === "list" ? "Not attacking:" : "Left out:"}</span>${idle.map(r => `<button class="chip" data-act="lmove" data-v="hostile" data-k="${r.id}" ${dis()}><i class="sw" style="background:${r.color}"></i>${esc(r.name)} +</button>`).join("")}</div>` : ""}</div>
    <div class="sec tight"><h3>2 · March on their <small class="hint">${st.heading === "hero" ? "straight at it" : st.heading === "castle" ? "straight at it" : st.heading === "centre" ? "hold the hill for 2 min" : "closest first"}</small></h3><div class="seg3 two">${HEADINGS.map(([k, n]) => `<button class="btn small${st.heading === k ? " on" : ""}" data-act="heading" data-v="${k}" ${dis()}>${n}</button>`).join("")}</div>${st.heading === "centre" ? `<p class="muted">Your army skips the attack list and marches to the hill in the middle, fighting anything that comes near. After 2 minutes the order dissolves and it marches on castles instead. Every hero standing on the hill earns 25% more gold and XP.</p>` : ""}</div>
    <div class="sec tight"><h3>Formation</h3><button class="btn small${S.formation === false ? "" : " on"}" data-act="formation" ${dis()}>${S.formation === false ? "Free advance" : "Keep formation ✓"}</button><p class="muted">${S.formation === false ? "Fast soldiers run ahead and arrive alone." : "Your soldiers march at the slowest soldier's pace and stay in line until the first contact. Siege units and guards move on their own."}</p></div>
    <div class="sec tight"><h3>Stance</h3><div class="seg3">${STANCES.map(([k, n]) => `<button class="btn small${S.stance === k ? " on" : ""}" data-act="stance" data-v="${k}" ${dis()}>${n}</button>`).join("")}</div><p class="muted">${esc(STANCES.find(x => x[0] === S.stance)[2])}.</p></div>`;
}
function knownAlliances() {
  const live = isLive(), src = live ? carriedPairs(liveClock().planDay) : (S.pairs || []), me = live ? LIVE.uid : "you";
  const all = [{ id: me, name: live ? MY_NAME : "You", color: live ? MY_COLOR : MY_COLOR }, ...RIVALS], byId = Object.fromEntries(all.map(p => [p.id, p]));
  const par = {}, fnd = x => (par[x] == null || par[x] === x ? (par[x] = x) : (par[x] = fnd(par[x])));
  src.forEach(k => { const [a, b] = k.split("|"); if (byId[a] && byId[b]) par[fnd(a)] = fnd(b); });
  const groups = {}; Object.keys(par).forEach(id => { (groups[fnd(id)] = groups[fnd(id)] || []).push(id); });
  const teams = Object.values(groups).filter(g => g.length > 1).map(g => g.map(id => byId[id])), inTeam = new Set(teams.flat().map(p => p.id));
  const fk = live ? feudsBefore(liveClock().planDay, liveClock().week) : (S.feuds || []), feuds = fk.map(k => k.split("|").map(id => byId[id])).filter(x => x[0] && x[1]);
  return { teams, alone: all.filter(p => !inTeam.has(p.id)), me, feuds };
}
function knownAlliancesHTML() {
  const { teams, alone, me, feuds } = knownAlliances(), sw = p => `<span class="tm"><i class="sw" style="background:${p.color}"></i>${esc(p.id === me ? "You" : p.name)}</span>`;
  return `<div class="sec"><h3>Alliances in the war</h3>${teams.length ? teams.map(t => `<div class="ateam${t.some(p => p.id === me) ? " mine" : ""}"><small>${t.some(p => p.id === me) ? "Your alliance" : "Allied"}</small><div>${t.map(sw).join("")}</div></div>`).join("") : `<p class="muted">No alliances stand right now. Everyone is on their own.</p>`}
    ${alone.length ? `<div class="ateam solo"><small>Standing alone</small><div>${alone.map(sw).join("")}</div></div>` : ""}${feuds.length ? `<div class="ateam solo"><small>Bad blood · +20% damage to each other</small><div>${feuds.map(([a, b]) => `<span class="tm">${sw(a)} ⚔ ${sw(b)}</span>`).join("")}</div></div>` : ""}<p class="muted">Pacts as they stood after the last battle. New invitations are announced when the next battle begins.</p></div>`;
}
function alliancesTab() {
  const fin = finalToday(), today = planDayKey(), inc = RIVALS.map(r => ({ r, o: incomingOffer(r) })).filter(x => x.o);
  const sent = Object.keys(S.offers).map(id => RIVALS.find(r => r.id === id)).filter(Boolean), carried = carriedPartners();
  const free = RIVALS.filter(r => !S.offers[r.id] && !carried.includes(r.id));
  const sentRow = r => { const o = S.offers[r.id], draft = o.day === today;
    return `<div class="alrow fl"><span class="who"><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b></span>
      ${draft ? `<span class="stepper"><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="-1" ${dis()}>−</button><b>${o.gold}g</b><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="1" ${dis()}>+</button></span><button class="btn small" data-act="uninvite" data-k="${r.id}" ${dis()}>Withdraw</button>`
        : `<span class="chip weak">Pending · ${o.gold}g</span>`}
      <small class="muted alx">${draft ? "Goes out tonight. They answer in tomorrow's planning." : "Sent yesterday. They answer in today's planning, and the alliance starts at tonight's battle if they accept."}</small></div>`; };
  return `${fin ? `<p class="muted">Final day: every pact has ended. Only one banner can win.</p>` : knownAlliancesHTML()}
    ${inc.length ? `<div class="sec"><h3>Invitations to you</h3>${inc.map(({ r, o }) => `<div class="alrow fl"><span class="who"><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b><small class="inc">${o.gold ? o.gold + "g dowry" : "no dowry"}</small></span>
      ${o.reply ? `<span class="chip ${o.reply === "accept" ? "ok" : "weak"}">${o.reply === "accept" ? "Accepted" : "Declined"}</span><button class="btn small" data-act="ireply" data-k="${r.id}" data-v="${o.reply === "accept" ? "reject" : "accept"}" ${dis()}>Change</button>` : `<button class="btn small wax" data-act="ireply" data-k="${r.id}" data-v="accept" ${dis()}>Accept</button><button class="btn small" data-act="ireply" data-k="${r.id}" data-v="reject" ${dis()}>Decline</button>`}</div>`).join("")}</div>` : ""}
    ${carried.length && !fin ? pactHTML() : ""}
    <div class="sec"><h3>Your invitations <small class="hint">${sent.length}/${MAX_INVITES} open</small></h3>${sent.length ? sent.map(sentRow).join("") : `<p class="muted">None open.</p>`}</div>
    ${!fin ? `<div class="sec"><h3>Invite a lord</h3>${free.map(r => `<div class="alrow fl"><span class="who"><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b></span><button class="btn small ally" data-act="invite" data-k="${r.id}" ${dis(sent.length >= MAX_INVITES)}>Invite</button></div>`).join("") || `<p class="muted">Everyone is allied or invited.</p>`}
      ${sent.length >= MAX_INVITES ? `<p class="muted">Two invitations are open. Wait for answers before sending more.</p>` : `<p class="muted">The dowry is set aside until they answer, and paid only if they accept.</p>`}</div>` : ""}`;
}
const planDayKey = () => (isLive() ? liveClock().planDay : DAY);
const ultCooling = () => { if (!isLive()) return S.ultLast != null && S.ultLast === DAY - 1; const ck = liveClock(), b = LIVE.battles[addDays(ck.planDay, -1)]; return !!(b && b.week === ck.week && b.ults && b.ults[LIVE.uid]); };
const blessLocked = () => { if (!isLive()) return S.blessDone != null && S.blessDone < DAY; const ck = liveClock(); return Object.keys(LIVE.battles).some(k => { const b = LIVE.battles[k]; return b.week === ck.week && k < ck.planDay && b.inputs && (b.inputs.plans || []).some(p => p.pid === LIVE.uid && p.blessing); }); };
const BLESSINGS = { vamp: ["Blood Rite", "Your whole army heals for 15% of the damage it deals, for the entire battle."], ward: ["Ward of Arrows", "Missiles cannot hurt your army for the first 45 seconds of the battle."] };
const planUlt = () => !!S.ultArm && !ultCooling() && ultLearned();
const planBless = () => (blessLocked() ? null : S.bless || null);
function ritualsTab() {
  const cd = ultCooling(), learned = ultLearned(), cl = { ult: (heroV3Now() && treeUlt()) || CLASSES[S.cls].ult }, used = blessLocked();
  return `<div class="sec tight"><h3>Ultimate</h3><p class="muted">Your hero only uses its ultimate if you plan it here. Once per battle, then it needs one full day to recharge.</p>
    ${!learned ? `<p class="need">Your hero hasn't learned the ultimate yet. Spend a skill point on it in the Hero sheet.</p>` : cd ? `<p class="need">Recharging. It was cast in the last battle and is ready again tomorrow.</p>` : ""}
    <button class="btn ${S.ultArm && learned && !cd ? "wax" : "wood"}" data-act="ultarm" ${dis(!learned || cd)}>${S.ultArm && learned && !cd ? "Planned for tonight ✓ (tap to cancel)" : "Plan the ultimate for tonight"}</button></div>
  <div class="sec tight"><h3>Weekly blessing</h3><p class="muted">One ritual per war, in effect for a single battle. ${used ? "You have already used yours this week." : "Choose one, or none to save it for later."}</p>
    ${Object.entries(BLESSINGS).map(([k, [n, ds]]) => `<button class="btn ${S.bless === k && !used ? "wax" : ""}" style="display:block;width:100%;text-align:left;margin:4px 0" data-act="bless" data-v="${k}" ${dis(used)}><b>${n}</b><br><small>${esc(ds)}</small></button>`).join("")}
    ${S.bless && !used ? `<button class="btn small" data-act="bless" data-v="">Save it for later</button>` : ""}</div>`;
}
// the Combat tab's groups: one row each (collapsed), tap one to open its three priority slots
const gprioName = (opts, id) => (opts.find(o => o[0] === id) || [id, id])[1];
function combatGroupsHTML() {
  const open = sheet.gopen, shorten = n => n.replace(/^Enemy /, "").replace(" soldiers", "").replace(" (nearest)", " nearest").replace(" ally (%)", "").replace(" ally", "");
  const grp = ([k, name, sub, opts]) => `<div class="grp${open === k ? " open" : ""}"><button class="gsum" data-act="gtoggle" data-k="${k}" aria-expanded="${open === k}"><span class="ico">${{ hero: "♛", melee: "⚔", ranged: "➶", heal: "✚" }[k]}</span><span class="gn"><b>${name}</b><small>${sub}</small></span><span class="cur">${S.gprio[k].map(id => esc(shorten(gprioName(opts, id)))).join(" → ")}</span><span class="chev">▾</span></button>
    ${open === k ? `<div class="gbody">${[...Array(GPRIO_SLOTS)].map((_, i) => `<label class="prow"><span>${["1st", "2nd", "3rd"][i]}</span><select data-act="gprioset" data-k="${k}" data-v="${i}" ${dis()}>${i ? `<option value=""${S.gprio[k][i] ? "" : " selected"}>None</option>` : ""}${opts.map(([id, n]) => `<option value="${id}"${S.gprio[k][i] === id ? " selected" : ""}>${n}</option>`).join("")}</select></label>`).join("")}
      ${k === "heal" ? `<p class="muted">Healers only heal allies within reach. With nobody hurt, they stay with the army. If none of your picks is hurt, they heal whoever is most wounded.</p>` : `<p class="muted">Picks from the top slot down, among enemies within reach. Anything not listed is fought last, nearest first.</p>`}</div>` : ""}</div>`;
  return `<div class="sec tight"><h3>Combat reach</h3><div class="reach"><span class="stepper"><button class="btn small" data-act="engage" data-v="-1" ${dis(S.engage <= ENGAGE_MIN)}>−</button><b>${S.engage} tile${S.engage === 1 ? "" : "s"}</b><button class="btn small" data-act="engage" data-v="1" ${dis(S.engage >= ENGAGE_MAX)}>+</button></span><small class="muted">Fighters join a fight when an enemy is this close. Short reach keeps marching on the castle; long reach brawls.</small></div></div>
    <div class="sec tight"><h3>Who each group fights first</h3><p class="muted">Tap a group to change its priorities.</p>${COMBAT_GROUPS.map(grp).join("")}
      <div class="grp fixed"><div class="fx"><span class="ico">⚑</span><span class="gn"><b>Raiders</b><small>fixed</small></span></div><p class="muted">Make for the castle. Struck by a melee fighter they turn and fight it; struck from range they keep going.</p></div>
      <div class="grp fixed"><div class="fx"><span class="ico">⛫</span><span class="gn"><b>Rams and Powder Carts</b><small>fixed</small></span></div><p class="muted">Always roll on the castle. They can't be stunned, rooted, slowed or turned aside.</p></div>
      <p class="muted">Anyone who is hit always answers back first.</p></div>`;
}
function ordersSheet() {
  ensureDip();
  const tab = ["strategy", "tactics", "alliances", "rituals"].includes(sheet.tab) ? sheet.tab : (sheet.grp === "alli" ? "alliances" : "strategy");
  const tabs = [["strategy", "Strategy"], ["tactics", "Combat"], ["alliances", "Alliances"], ["rituals", "Rituals"]];
  let body = "";
  if (tab === "strategy") body = strategyTab();
  if (tab === "tactics") body = `<p class="muted tight">These rules only apply mid-skirmish, once your soldiers are in a fight. Strategy decides where they go.</p>
    ${combatGroupsHTML()}
    <div class="sec tight"><h3>Battle commands</h3><p class="muted">If this happens mid-battle, do that. Each costs one order seal (${OP_MAX - opUsed()} left).</p>
      ${S.rules.map((r, i) => `<div class="rule"><label><span>If</span><select data-act="rif" data-v="${i}" ${dis()}>${opts(IFS, r.if)}</select></label><label><span>Then</span><select data-act="rthen" data-v="${i}" ${dis()}>${opts(THENS, r.then)}</select></label><button class="btn small" data-act="rdel" data-v="${i}" aria-label="Remove command" ${dis()}>✕</button></div>`).join("")}
      <div><button class="btn wood" data-act="radd" ${dis(opUsed() >= OP_MAX)}>Add command</button></div>
      <p class="muted">Tap a soldier or your hero on the map to give it its own job.</p></div>`;
  if (tab === "alliances") body = alliancesTab();
  if (tab === "rituals") body = ritualsTab();
  return head(null, sheet.grp === "alli" ? "Alliances" : "Orders", `${avail()} gold free${reserved() ? `, ${reserved()} offered` : ""}`) + `<div class="body">
    <div class="tabs" ${sheet.grp === "alli" ? "hidden" : ""}>${tabs.filter(t => sheet.grp === "alli" || t[0] !== "alliances").map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-act="ctab" data-v="${k}">${l}</button>`).join("")}</div>${body}</div>`;
}
function planJSON() {
  const place = {};
  Object.entries(S.place).forEach(([k, v]) => { const u = findUnit(v), t = findTrap(v); place[k] = v === "champ" ? "champion" : u ? `${u.type}:Lv${u.lvl}` : t ? `trap:${t.type}` : v; });
  return JSON.stringify({ day: DAY, class: S.cls, level: level(), ranks: S.ranks, upgrades: S.picks, castOn: S.triggers, gear: S.gear, defences: S.defences, placements: place, stance: S.stance, advanceOn: S.strategy.heading, attackMode: S.strategy.mode, priority: S.prio, combatPriorities: S.gprio, combatReach: S.engage, commands: S.rules,
    attackOrder: S.lists.hostile.map(id => (RIVALS.find(r => r.id === id) || {}).name), neutral: S.lists.neutral.map(id => (RIVALS.find(r => r.id === id) || {}).name),
    allianceOffers: Object.fromEntries(Object.keys(S.offers).map(id => [(RIVALS.find(r => r.id === id) || {}).name, S.offers[id]])),
    allianceTerms: Object.fromEntries(RIVALS.map(r => [r.name, S.terms[r.id]])), soldierOrders: S.uorders }, null, 2);
}
function sealMerc() {
  if (!mercOpen()) return "";
  const b = bidSummary(), free = Object.keys(MERCS).filter(id => !mercWait(id)).length;
  return `<div class="sec tight"><h3>Mercenary camp</h3><p class="${b ? "muted" : "need"}">${!free ? "Every group is recharging today." : b ? `Your sealed bids: <b>${esc(b)}</b>. The highest bid wins and pays its own bid.` : "No mercenary bid placed. Rival lords may hire them."}</p>
    <button class="btn ${b ? "wood" : "wax"}" data-act="opencamp" ${free ? "" : "disabled"}>${b ? "Change mercenary bids" : "Place mercenary bid"}</button></div>`;
}
function sealPowers() { // ultimate and weekly ritual can be switched on right where you seal
  const cl = { ult: (heroV3Now() && treeUlt()) || CLASSES[S.cls].ult }, learned = ultLearned(), cd = ultCooling(), armed = planUlt(), used = blessLocked();
  const ult = !learned ? `<p class="muted">Learn the ultimate in the Hero sheet to use it.</p>` : cd ? `<p class="need">Recharging. It was cast in the last battle and is ready again tomorrow.</p>` : `<p class="muted">Cast once this battle. It then needs a full day to recharge.</p>`;
  return `<div class="sec tight"><h3>${ultIconHTML(cl.ult)}Ultimate · ${esc(cl.ult.name)}</h3>${ult}
      <button class="btn ${armed ? "wax" : "wood"}" data-act="ultarm" ${dis(!learned || cd)}>${armed ? "Using it this battle ✓ (tap to cancel)" : "Use ultimate this battle"}</button></div>
    <div class="sec tight"><h3>Weekly ritual</h3><p class="muted">${used ? "Already used this week. Your next one is a new war." : "One ritual per week, for a single battle. Once spent it is gone until next week."}</p>
      <div class="row">${Object.entries(BLESSINGS).map(([k, [n]]) => `<button class="btn ${S.bless === k && !used ? "wax" : "wood"}" data-act="bless" data-v="${S.bless === k ? "" : k}" ${dis(used)}>${S.bless === k && !used ? `${n} ✓` : n}</button>`).join("")}</div>
      ${!used && S.bless ? `<p class="muted">${esc(BLESSINGS[S.bless][1])} Tap again to cancel.</p>` : ""}</div>` + sealMerc();
}
function sealWarnings() { // loud reminders at the top of the seal screen: unspent skill points and soldiers left off the field
  const w = [], fp = freePts(), un = S.owned.filter(u => !placedAt(u.id)).length, oth = (S.walls || []).concat(S.traps).filter(x => !placedAt(x.id)).length;
  if (fp) w.push(`<b>${fp} unspent skill point${fp > 1 ? "s" : ""}</b>. Spend ${fp > 1 ? "them" : "it"} on your hero's abilities.`);
  if (un) w.push(`<b>${un} soldier${un > 1 ? "s" : ""} not placed</b> on the field, so ${un > 1 ? "they" : "it"} won't fight.`);
  if (oth) w.push(`<b>${oth} wall${oth > 1 ? "s or traps" : " or trap"} not set</b> on the field.`);
  return w.length ? `<div class="warnbox"><b class="wt">⚠ Before you seal</b><ul>${w.map(x => `<li>${x}</li>`).join("")}</ul></div>` : "";
}
function sealSheet() {
  if (S.locked) return head(null, "Orders Sealed", "The battle plays out at dusk") + `<div class="body">
    ${sealWarnings()}<div class="waxseal">LB</div><p class="muted" style="text-align:center">These orders will be fought at the lock. You can draft new orders until then: the sealed ones stay in effect until you seal the new ones.</p>
    <p class="muted" style="text-align:center">Ultimate: ${planUlt() ? "<b>will be used</b>" : "not planned"} · Ritual: ${planBless() ? `<b>${esc(BLESSINGS[S.bless][0])}</b>` : "none"}${mercOpen() ? ` · Mercenaries: ${bidSummary() ? `<b>${esc(bidSummary())}</b>` : "no bids"}` : ""}</p>
    <div class="row" style="justify-content:center">${isLive() ? "" : `<button class="btn wax" data-act="battle">Watch tonight's battle</button>`}<button class="btn" data-act="unseal">Draft new orders</button>${isLive() ? "" : `<button class="btn wood" data-act="copy">Copy plan</button>`}</div>
    <p class="muted" style="text-align:center">${isLive() ? `The real battle is fought at ${lockLabel(LIVE.config)}. Watch it afterwards from the Battle report.` : "In this prototype the battle runs now on your phone against the example players."}</p>
    ${isLive() ? "" : `<div class="sec"><h3>Your sealed plan</h3><p class="muted">This is what the battle will read.</p><div class="plan" id="plan">${esc(planJSON())}</div></div>`}</div>`;
  const checks = [
    [!!placedAt("champ"), "Hero is on the field"],
    [S.owned.every(u => placedAt(u.id)), `Soldiers placed (${S.owned.filter(u => placedAt(u.id)).length} of ${S.owned.length})`],
    [freePts() === 0, freePts() ? `${freePts()} skill point${freePts() > 1 ? "s" : ""} unspent` : "All skill points spent"],
    [S.traps.every(t => placedAt(t.id)), "Bought traps are set"],
    [S.strategy.mode !== "list" || S.lists.hostile.length > 0, S.strategy.mode !== "list" ? `Attack: ${esc(TMODES.find(x => x[0] === S.strategy.mode)[1].toLowerCase())}` : S.lists.hostile.length ? `Main attack: ${esc((RIVALS.find(r => r.id === S.lists.hostile[0]) || {}).name || "")}` : "Nobody marked hostile, so your army picks the nearest castle"],
    [opUsed() === OP_MAX, opUsed() < OP_MAX ? `${OP_MAX - opUsed()} order seal${OP_MAX - opUsed() > 1 ? "s" : ""} unused` : "All order seals used"],
  ];
  return head(null, "Seal Your Orders", `Battle in ${countdown()}`) + `<div class="body">
    ${isLive() && S.sealedSnap ? `<div class="warnbox"><b class="wt">Your sealed orders are still in effect</b><p class="muted">You're drafting changes. They won't be fought until you press the seal again. If you don't, the orders you already sealed are used.</p></div>` : ""}${sealWarnings()}<ul class="checks">${checks.map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("")}</ul>
    ${sealPowers()}
    <p class="muted">${checks[0][0] ? "Unticked items are only reminders." : "Your hero must be on the field before you can seal."}</p>
    <button class="btn wax" data-act="seal" ${checks[0][0] ? "" : "disabled"}>Press the seal</button>
    ${isLive() ? "" : `<div class="row"><button class="btn wood" data-act="battle">Run a test battle</button><button class="btn" data-act="lab">Balance lab</button></div>`}
    ${isLive() ? `<p class="muted">Orders save to the shared game as you go. If you never seal, your latest draft is used. Once you have sealed, those orders stay in effect until you seal new ones.</p>` : `<button class="btn" data-act="reset">Reset to the example setup</button>`}</div>`;
}
