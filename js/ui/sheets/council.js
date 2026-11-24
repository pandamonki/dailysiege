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
  if (!o || carriedPartners().includes(r.id) || pactsEndToday()) return null;
  return { gold: o.gold || 0, reply: (S.replies || {})[r.id] || null };
}
// alliances v2: when a lord invites my alliance, each of us must accept. What my ally has answered, as far as this device can know:
// a human's answer is shared on their public profile; a bot's follows its terms. "uninvited" means the inviter never asked them.
function offerFrom(r, toId) {
  if (isLive()) { const pl = latestPlan(r.live, liveClock().planDay, true), x = pl && pl.offers && pl.offers[toId]; return x && x.day === prevDayKey() ? x : null; }
  const x = ((RIVAL_AI[r.id] && RIVAL_AI[r.id].offers) || {})[toId]; return x && DAY >= 2 ? x : null;
}
function botTerms(pid, inviter) {
  if (!isLive()) return (((RIVAL_AI[pid] || {}).terms) || {})[inviter] || { mode: "accept", min: 200 };
  const ck = liveClock(), ids = rosterFor(ck.week).map(p => p.uid), rkm = rankMap(ck.dayNo > 1 ? wStandings(LIVE, ck.week, addDays(ck.planDay, -1)) : {}, ids);
  return (wBotDiplomacy(pid, ck.planDay, ids, rkm, feudsBefore(ck.planDay, ck.week)).terms || {})[inviter] || { mode: "accept", min: 200 };
}
function allyAnswer(pid, inviter) {
  const r = RIVALS.find(q => q.id === inviter), off = r && offerFrom(r, pid); if (!off) return "uninvited";
  if (!isLive() || (LIVE.players[pid] && LIVE.players[pid].bot)) { const t = botTerms(pid, inviter); return t.mode !== "refuse" && (off.gold || 0) >= (t.min || 0) ? "accept" : "reject"; }
  const p = LIVE.players[pid] || {}, day = liveClock().planDay, pub = p.allyReplies, st = p.state;
  const a = pub && pub.day === day ? (pub.r || {})[inviter] : st && st.day === day ? (st.replies || {})[inviter] : null;
  return a === "accept" || a === "reject" ? a : "pending";
}
// one line per ally of mine: their answer to inviter's invitation
function allyAnswersHTML(inviter) {
  if (!allyV2Now()) return ""; const me = allyLords().me, mates = allyGroup(me).filter(x => x !== me && x !== inviter); if (!mates.length) return "";
  const nm = id => esc((RIVALS.find(q => q.id === id) || {}).name || "Your ally"), col = id => (RIVALS.find(q => q.id === id) || {}).color || "#888";
  const mine = (S.replies || {})[inviter], lab = { accept: ["✓ Accepted", "ok"], reject: ["✗ Declined", "bad"], pending: ["Not answered yet", "wait"], uninvited: ["Not invited", "bad"] };
  const rows = [[me, mine === "accept" ? "accept" : mine === "reject" ? "reject" : "pending", true], ...mates.map(id => [id, allyAnswer(id, inviter), false])];
  const all = rows.every(x => x[1] === "accept"), out = rows.some(x => x[1] === "reject" || x[1] === "uninvited");
  return `<div class="aans"><small>Your alliance must all accept</small>${rows.map(([id, a, you]) => `<span class="aan ${lab[a][1]}"><i class="sw" style="background:${you ? MY_COLOR : col(id)}"></i>${you ? "You" : nm(id)}<b>${lab[a][0]}</b></span>`).join("")}
    <em>${all ? "Everyone has accepted: they join your alliance at tonight's battle." : out ? "They can't join today: everyone in your alliance must be invited and accept." : "They join only if everyone accepts before the battle."}</em></div>`;
}
const pendingInvites = () => RIVALS.map(r => ({ r, o: incomingOffer(r) })).filter(x => x.o && !x.o.reply);
const inviteDue = () => !!S && !S.lobbyPrep && S.invSeen !== planDayKey() && pendingInvites().length > 0;
const MAX_INVITES = 2;
// breakV2: the lords who disbanded an alliance with me in the last battle (told the day after)
function disbandedOnMe() {
  if (!isLive() || !LIVE.uid) return []; const key = latestBattleKey(), b = key && LIVE.battles[key]; if (!b || !b.inputs) return [];
  const start = carriedPairs(key).map(x => (Array.isArray(x) ? x : String(x).split("|")).slice().sort().join("|")), me = LIVE.uid;
  return (b.inputs.plans || []).filter(q => q.pid !== me && (q.breaks || []).includes(me) && start.includes([q.pid, me].sort().join("|"))).map(q => q.pid);
}
const partDue = () => { try { return !!S && !S.lobbyPrep && !S.ob && isLive() && S.partSeen !== latestBattleKey() && disbandedOnMe().length > 0; } catch (e) { return false; } };
function partedSheet() {
  const ids = disbandedOnMe(), row = id => { const r = RIVALS.find(x => x.id === id); return `<div class="invcard"><span><i class="sw" style="background:${r ? r.color : "#888"}"></i><b>${esc(r ? r.name : nameOf(id))}</b> disbanded your alliance</span></div>`; };
  return head(null, ids.length > 1 ? "Alliances disbanded" : "Alliance disbanded", "News from the last battle") + `<div class="body">${ids.map(row).join("")}
    <p class="muted">You fought beside ${ids.length > 1 ? "them" : "them"} in the last battle. From tonight's battle you are no longer allies. You can invite them again, or make new friends, from Alliances.</p>
    <div class="row"><button class="btn wax" data-act="close">Understood</button></div></div>`;
}
function inviteSheet() {
  const list = pendingInvites();
  return head(null, "Alliance invitations", "Answer before tonight's battle") + `<div class="body">
    ${list.length ? list.map(({ r, o }) => `<div class="invcard"><div class="spread"><span><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b> invites you to ally</span><span class="chip ${o.gold ? "ok" : ""}">${o.gold ? `<i class="coin"></i> ${o.gold} dowry` : "no dowry"}</span></div>
      ${allyV2Now() && allyGroup(r.id).length > 1 ? `<p class="muted">${esc(r.name)} is allied with ${allyGroup(r.id).filter(x => x !== r.id).map(x => esc((RIVALS.find(q => q.id === x) || {}).name || "a lord")).join(" and ")}. You join their alliance only if every member invites you and you accept them all.</p>` : ""}
      ${allyAnswersHTML(r.id)}<div class="row"><button class="btn wax" data-act="ireply" data-k="${r.id}" data-v="accept" ${dis()}>Accept</button><button class="btn" data-act="ireply" data-k="${r.id}" data-v="reject" ${dis()}>Decline</button></div></div>`).join("") : `<p class="muted">All answered.</p>`}
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
  delete S.formation; // formation is always kept now (the toggle is gone)
  S.phase = S.phase || "muster"; if (STANCE_FIX[S.stance]) S.stance = STANCE_FIX[S.stance];
  S.rules = (S.rules || []).map(r => ({ if: r.if, then: r.then === "All units defend castle" ? "All units fall back to regroup" : r.then === "Switch to Defensive" ? "Switch to Cautious" : r.then }));
  const ids = RIVALS.map(r => r.id);
  ["hostile", "neutral", "ally"].forEach(k => { S.lists[k] = S.lists[k].filter((id, i, a) => (ids.includes(id) || (k === "hostile" && pickV1Now() && !!PICK_ROLES[id])) && a.indexOf(id) === i); }); // with pick-your-targets the attack list can hold general roles too
  const placed = new Set([...S.lists.hostile, ...S.lists.neutral, ...S.lists.ally]);
  const near = r => Math.round(Math.hypot(r.pos[0] - CASTLE[0], r.pos[1] - CASTLE[1]) * 1e6), tie = r => hash(botSeed(String(r.id)), CASTLE[0] * 100 + CASTLE[1], 29); // equally near rivals go in a fixed but fair order, not sign-up order
  RIVALS.slice().sort((a, b) => (near(a) - near(b)) || (tie(a) - tie(b))).forEach(r => {
    if (!placed.has(r.id)) S.lists[pickV1Now() ? "neutral" : "hostile"].push(r.id); // with pick-your-targets nobody is a target until chosen
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
  return head(seen && seen.cls ? spriteURL("c-" + seen.cls, r.color) : null, `${r.name}'s Castle`, `${seen && seen.cls ? clsName(seen.cls) : "Class unknown"} · seems <span class="trust t-${r.trust}">${r.trust === "Unknown" ? "hard to read" : r.trust}</span> toward you`) + `<div class="body">
    <div class="sec"><h3>What you know</h3>${intel}</div>
    <div class="sec"><h3>Tonight</h3><div class="rvlist">${rivalRow(r, true)}</div></div></div>`;
}
// a late slot warns that the hero must reach the keep before sudden death (3:00), when the castles drop out of the fight
const lateBetrayNote = when => (betraySlotSecs(when) != null && betraySlotSecs(when) >= 120 ? `<p class="muted">Your hero has to reach the keep before sudden death at 3:00, or the betrayal doesn't happen.</p>` : "");
function pactHTML() {
  const ids = carriedPartners(); if (!ids.length) return "";
  const nm = id => esc((RIVALS.find(r => r.id === id) || {}).name || "an ally");
  if (pactsEndToday()) return `<div class="sec"><h3>Final day</h3><p>${ids.map(nm).join(", ")}: your pact${ids.length > 1 ? "s dissolve" : " dissolves"} at dawn. Only one lord can win the Daily Siege.</p></div>`;
  ensureDip();
  const allBox = betrayV2Now() && ids.length >= 2 ? `<div class="pact all"><b>Betray the whole alliance</b><div class="optrow"><button class="btn small${S.pactAll ? " on" : ""}" data-act="pall" data-v="${S.pactAll ? "off" : "on"}" ${dis()}>${S.pactAll ? "Betraying all of them" : "Betray all"}</button></div>
    ${S.pactAll ? `<label class="inline">Betray when<select data-act="pallwhen" ${dis()}>${opts(BETRAY_ALL_WHEN, S.pactAll)}</select></label>${lateBetrayNote(S.pactAll)}<p class="muted">Your hero heads for the nearest ally's keep. When it arrives, a bomb is planted in every allied keep at the same moment and they all go off together. Every one of them becomes a bitter enemy, and you win alone or not at all.</p>` : `<p class="muted">One betrayal for the whole alliance: bombs in every allied keep at once, instead of one ally at a time.</p>`}</div>` : "";
  return `<div class="sec"><h3>Alliances carried over</h3>${allBox}${ids.map(id => { const a = S.pactAct[id] || "keep";
    return `<div class="pact"><b>${nm(id)}</b><div class="optrow">${[["keep", "Keep"], ["break", breakV2Now() ? "Disband" : "Break it"], ["betray", "Betray"]].map(([k, l]) => `<button class="btn small${a === k ? " on" : ""}" data-act="pact" data-v="${k}" data-k="${id}" ${dis()}>${l}</button>`).join("")}</div>${S.pactAsk === id ? `<div class="warnbox"><b class="wt">Disband the alliance with ${nm(id)}?</b><p class="muted">You still fight beside them in tonight's battle. From tomorrow's battle you are no longer allies, and they are told tomorrow. The only way to turn on them during a battle is a betrayal.</p><div class="row"><button class="btn wax" data-act="pactyes" data-k="${id}" ${dis()}>Yes, disband</button><button class="btn" data-act="pactno">Cancel</button></div></div>` : a === "break" && breakV2Now() ? `<p class="muted">Disbanding takes effect from tomorrow's battle. You still fight together tonight.</p>` : ""}${a === "betray" && !S.pactAll ? `<label class="inline">Betray when<select data-act="pwhen" data-k="${id}" ${dis()}>${opts(betrayWhenList(), S.pactWhen[id])}</select></label>` : ""}${a === "betray" && !S.pactAll ? lateBetrayNote(S.pactWhen[id]) : ""}</div>`; }).join("")}
    <p class="muted">${breakV2Now() ? "Disbanding is clean and starts from the next battle." : "Breaking a pact is clean."} A betrayal is a surprise mid-battle. Your hero plants a bomb in their keep: it flashes red for about two seconds, then blows up for half its health. The victim will remember, and you become bitter rivals. Allies win the day together if only allies are left standing.</p></div>`;
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
  const b = bucketOf(r.id), rank = S.lists.hostile.indexOf(r.id) + 1, inc = incomingOffer(r), allied = carriedPartners().includes(r.id) && !pactsEndToday();
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
// Pick your targets (PICK_V1): one to three targets a day (at least TARGETS_NEED), in order. Once they have fallen, the army goes for the lord just above on the board.
// how many targets a lord must pick before sealing: three, or every option there is if fewer
const TARGETS_NEED = () => 1; // at least one target before sealing; up to PICK_MAX
const targetsReady = () => !pickV1Now() || S.lists.hostile.length >= TARGETS_NEED();
const ROLE_ICON = { "@weakcastle": "castle1", "@leader": "board", "@above": "roster", "@nearcastle": "base", "@neararmy": "army" }; // pictures in icons/ui
const roleIco = k => (ROLE_ICON[k] ? `<img alt="" src="icons/ui/${ROLE_ICON[k]}.webp">` : "◎");
const tgtName = id => { const r = RIVALS.find(x => x.id === id); return r ? r.name : PICK_ROLES[id] || ""; };
const tgtMark = id => { const r = RIVALS.find(x => x.id === id); return r ? `<i class="sw" style="background:${r.color}"></i>` : `<i class="rico">${roleIco(id)}</i>`; };
// the three target slots: filled ones can be dragged into order or cleared; empty ones say what to do
function targetSlotsHTML() {
  const hostile = S.lists.hostile;
  return `<ol class="tslots" id="tgtlist">${[0, 1, 2].slice(0, PICK_MAX).map(i => { const id = hostile[i];
    if (id && tgtName(id)) return `<li class="tgt tslot on" data-k="${id}"><span class="grip" aria-label="Drag to reorder">⠿</span><span class="ord">${i + 1}</span>${tgtMark(id)}<span class="tnm"><b>${esc(tgtName(id))}</b>${PICK_ROLES[id] ? `<small>role</small>` : ""}</span><button class="tx" data-act="lmove" data-v="neutral" data-k="${id}" aria-label="Stop attacking ${esc(tgtName(id))}" ${dis()}>✕</button></li>`;
    return `<li class="tslot empty"><span class="ord">${i + 1}</span><span class="tnm">${i === hostile.length ? (i === 0 ? "<b>Pick your first target</b>" : "<b>Pick your next target</b>") : ""}</span><small class="req">${i < TARGETS_NEED() ? "required" : "optional"}</small></li>`; }).join("")}</ol>`;
}
// the board as it stands: rank, points and a target button for every lord (used on the Strategy tab and the seal screen)
function targetBoardHTML(compact) {
  const rows = boardRows().sort((a, b) => b.pts - a.pts || b.lvl - a.lvl), hostile = S.lists.hostile, full = hostile.length >= PICK_MAX, bty = bountyMap();
  return `<div class="tboard${compact ? " compact" : ""}">${rows.map((r, i) => { const n = hostile.indexOf(r.id) + 1;
    return `<div class="tbr${r.me ? " me" : ""}${n ? " on" : ""}"><span class="rk">${i + 1}</span><i class="sw" style="background:${r.color}"></i><span class="nm"><b>${esc(r.me ? "You" : r.name)}</b>${r.cls && !compact ? `<small>${esc(CLASSES[r.cls].name)}</small>` : ""}</span><span class="pt">${r.pts} pts</span><span class="tby r${bountyRank(r.id)}"${bty[r.id] ? ` title="Bounty: gold for killing their hero or taking their castle"` : ""}>${bty[r.id] ? `♛ +${bty[r.id]}g` : ""}</span>
      ${r.me ? `<span class="tbt self">—</span>` : !n && allyShielded(r.id) ? `<button class="tbt ally" data-act="sealgo" data-v="alliances" aria-label="${esc(r.name)} is your ally: open Alliances">🤝 Ally</button>` : n ? `<button class="tbt on" data-act="lmove" data-v="neutral" data-k="${r.id}" ${dis()} aria-label="Stop attacking ${esc(r.name)}">Target ${n} ✕</button>` : `<button class="tbt" data-act="lmove" data-v="hostile" data-k="${r.id}" ${full ? "disabled" : dis()}>Target</button>`}</div>`; }).join("")}</div>`;
}
function pickTab() {
  const hostile = S.lists.hostile, roles = Object.keys(PICK_ROLES).filter(k => !hostile.includes(k)), full = hostile.length >= PICK_MAX;
  const chip = k => `<button class="chip" data-act="lmove" data-v="hostile" data-k="${k}" ${full ? "disabled" : dis()}><i class="rico">${roleIco(k)}</i>${esc(PICK_ROLES[k])}</button>`;
  return `<div class="sec tight"><h3>1 · Today's targets <span class="cnt${hostile.length >= TARGETS_NEED() ? " ok" : ""}">${hostile.length}/${PICK_MAX}</span></h3>
      <p class="muted">Pick 1 to ${PICK_MAX}, in order. After them: ${fallbackLabel()}.</p>
      ${targetSlotsHTML()}
      ${roles.length ? `<h4 class="minih">Or a role</h4><div class="chips">${roles.map(chip).join("")}</div>` : ""}
      <h4 class="minih">Lords${Object.keys(bountyMap()).length ? " · ♛ bounty gold" : ""}</h4>${targetBoardHTML()}</div>
    ${strategyTabRest(S.strategy)}`;
}
function fallbackLabel() {
  let rk = {}; try { rk = isLive() ? rankMap(standings(liveClock().week, addDays(liveClock().planDay, -1)), RIVALS.map(r => r.id).concat([LIVE.uid])) : rankMap(PRACTICE_BOARD, RIVALS.map(r => r.id).concat(["you"])); } catch (e) { rk = {}; }
  const me = isLive() ? LIVE.uid : "you", my = rk[me]; if (!my) return "the nearest castle";
  const want = my === 1 ? 2 : my - 1, id = Object.keys(rk).find(k => rk[k] === want), r = RIVALS.find(x => x.id === id);
  return my === 1 ? (r ? esc(r.name) + ", in second place" : "the lord in second place") : (r ? esc(r.name) + ", just above you" : "the lord just above you");
}
function strategyTab() {
  if (pickV1Now()) return pickTab();
  const st = S.strategy, tm = TMODES.find(x => x[0] === st.mode) || TMODES[0], hostile = S.lists.hostile, idle = RIVALS.filter(r => !hostile.includes(r.id));
  const row = (id, i) => { const r = RIVALS.find(x => x.id === id); if (!r) return "";
    return `<li class="tgt cp" data-k="${id}"><span class="grip" aria-label="Drag to reorder">⠿</span><span class="ord">${i + 1}</span><i class="sw" style="background:${r.color}"></i><span class="tn"><b>${esc(r.name)}</b></span><button class="btn small" data-act="lmove" data-v="neutral" data-k="${id}" aria-label="Stop attacking ${esc(r.name)}" ${dis()}>✕</button></li>`; };
  return `<div class="sec tight"><h3>1 · Who to attack <small class="hnote">drives direction out of combat</small></h3><select class="wide" data-act="tmodeset" ${dis()}>${TMODES.map(([k, n]) => `<option value="${k}"${st.mode === k ? " selected" : ""}>${n}</option>`).join("")}</select>${st.mode === "list" ? "" : `<p class="muted">${esc(tm[2])}</p>`}
      ${st.mode === "list" ? `<ol class="tgts cpl" id="tgtlist">${hostile.map(row).join("") || `<li class="muted">Nobody. Your army will pick the nearest castle.</li>`}</ol>` : `<p class="muted">Order tonight: <b>${previewOrder().map(id => esc(RIVALS.find(r => r.id === id).name)).join(" → ") || "nobody"}</b></p>`}
      ${idle.length ? `<div class="chips"><span class="muted">${st.mode === "list" ? "Not attacking:" : "Left out:"}</span>${idle.map(r => `<button class="chip" data-act="lmove" data-v="hostile" data-k="${r.id}" ${dis()}><i class="sw" style="background:${r.color}"></i>${esc(r.name)} +</button>`).join("")}</div>` : ""}</div>
    ${strategyTabRest(st)}`;
}
const ordersV2Now = () => (isLive() ? ordersV2For(liveClock().planDay) : true); // orders v2: army plan and fall-back replace the heading, battle commands and soldiers' own orders
const STANCE_V2 = { aggressive: "Heals at home below 12% health", skirmish: "Heals at home below 30% health", cautious: "Heals at home below 45% health" };
function strategyTabRest(st) {
  if (ordersV2Now()) { const pl = st.plan || "conquest", fb = st.fallback || "none", opt = (act, k, cur, [n, d]) => `<button class="opt${cur === k ? " on" : ""}" data-act="${act}" data-v="${k}" ${dis()}><b>${esc(n)}</b><span>${esc(d)}</span></button>`;
    return `<div class="sec tight"><h3>2 · Army plan</h3><div class="olist">${ARMY_PLANS.map(k => opt("aplan", k, pl, ARMY_PLAN_INFO[k])).join("")}</div>
      <label class="inline"><input type="checkbox" data-act="hillfirst" ${st.heading === "centre" ? "checked" : ""} ${dis()}> Hold the hill for 2 minutes first</label></div>
    <div class="sec tight"><h3>3 · Army falls back when</h3><div class="olist">${FALL_BACKS.map(k => opt("fback", k, fb, FALL_BACK_INFO[k])).join("")}</div></div>
    <div class="sec tight"><h3>4 · Hero stance</h3><div class="seg3">${STANCES.map(([k, n]) => `<button class="btn small${S.stance === k ? " on" : ""}" data-act="stance" data-v="${k}" ${dis()}>${n}</button>`).join("")}</div><p class="muted">${esc(STANCE_V2[S.stance] || "")}.</p></div>`; }
  const hn = { hero: "Straight at their hero", castle: "Straight at their castle (the default)", near: "Whatever of theirs is closest", centre: "Hold the central hill for 2 minutes first" }[st.heading] || "";
  return `<div class="sec tight"><h3>2 · On reaching a target, go for</h3><div class="seg3 two">${HEADINGS.map(([k, n]) => `<button class="btn small${st.heading === k ? " on" : ""}" data-act="heading" data-v="${k}" ${dis()}>${n}</button>`).join("")}</div><p class="muted">${esc(hn)}.${st.heading === "centre" ? " Your army skips its targets and holds the hill, fighting anything that comes near. After 2 minutes it marches on its targets. Heroes on the hill earn 25% more gold and XP." : ""}</p></div>
    <div class="sec tight"><h3>3 · Stance</h3><div class="seg3">${STANCES.map(([k, n]) => `<button class="btn small${S.stance === k ? " on" : ""}" data-act="stance" data-v="${k}" ${dis()}>${n}</button>`).join("")}</div><p class="muted">${esc(STANCES.find(x => x[0] === S.stance)[2])}.</p></div>`;
}
const allyV2Now = () => (isLive() ? allyV2For(liveClock().planDay) : true); // alliances v2: groups that all agree, shared top places, lone wolves
// everyone in the war this device knows of, by id
function allyLords() { const live = isLive(), me = live ? LIVE.uid : "you"; return { me, all: [{ id: me, name: live ? MY_NAME : "You", color: MY_COLOR, banner: S && S.banner }, ...RIVALS] }; }
const allyPairsNow = () => (isLive() ? activePairs(liveClock().planDay) : (S.pairs || []));
// the lords in id's alliance (id included), from the pacts that stand right now
function allyGroup(id, src = allyPairsNow()) { const seen = new Set([id]), q = [id]; while (q.length) { const x = q.shift(); src.forEach(k => { const [a, b] = k.split("|"); const o = a === x ? b : b === x ? a : null; if (o && !seen.has(o)) { seen.add(o); q.push(o); } }); } return [...seen]; }
function knownAlliances() {
  const { me, all } = allyLords(), byId = Object.fromEntries(all.map(p => [p.id, p])), src = allyPairsNow().filter(k => k.split("|").every(id => byId[id]));
  const done = new Set(), teams = [];
  all.forEach(p => { if (done.has(p.id)) return; const g = allyGroup(p.id, src); g.forEach(x => done.add(x)); if (g.length > 1) teams.push({ lords: g.map(x => byId[x]), whole: g.every(x => g.every(y => x === y || src.includes([x, y].sort().join("|")))) }); });
  const inTeam = new Set(teams.flatMap(t => t.lords.map(p => p.id)));
  const live = isLive(), fk = live ? feudsBefore(liveClock().planDay, liveClock().week) : (S.feuds || []), feuds = fk.map(k => k.split("|").map(id => byId[id])).filter(x => x[0] && x[1]);
  return { teams, alone: all.filter(p => !inTeam.has(p.id)), me, feuds, byId };
}
// the alliance history of this war, day by day: who allied, who parted, who betrayed whom
function allyHistory() {
  const live = isLive(), recs = live ? Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === liveClock().week).sort().map(k => { const b = LIVE.battles[k];
      return { day: b.day, start: b.pairs || [], end: b.pairsEnd || [], feuds: b.feuds || [], by: Object.fromEntries((b.results || []).filter(r => r.treachery).map(r => [r.pid, r.treachery])), wolves: (b.results || []).filter(r => r.lone).map(r => r.pid) }; })
    : (S.allyLog || []);
  const out = []; let prevEnd = [], prevFeuds = [];
  recs.forEach(r => { const ev = [];
    { const fresh = r.start.filter(k => !prevEnd.includes(k)), seen = new Set(); // pacts made the same day that join into one alliance read as one line
      fresh.flatMap(k => k.split("|")).forEach(x => { if (seen.has(x)) return; const g = allyGroup(x, fresh); g.forEach(y => seen.add(y)); ev.push({ kind: "ally", ids: g }); }); }
    if (r.day < 7) prevEnd.filter(k => !r.start.includes(k)).forEach(k => ev.push({ kind: "part", ids: k.split("|") })); else if (prevEnd.length) ev.push({ kind: "final" });
    r.feuds.filter(k => !prevFeuds.includes(k)).forEach(k => { const ids = k.split("|"), by = ids.find(x => r.by[x]); ev.push({ kind: "betray", ids: by ? [by, ids.find(x => x !== by)] : ids, known: !!by }); });
    if ((r.wolves || []).length) ev.push({ kind: "wolf", ids: r.wolves });
    if (ev.length) out.push({ day: r.day, ev }); prevEnd = r.end; prevFeuds = prevFeuds.concat(r.feuds); });
  return out.reverse();
}
// one line of the alliance history, with each lord as a coloured chip (the Allies screen and the Daily Noticeboard)
function allyLineFn(byId, me) {
  const nm = p => esc(p.id === me ? "You" : p.name), chip = p => `<span class="tm"><i class="sw" style="background:${p.color}"></i>${nm(p)}</span>`;
  const who = id => byId[id] ? chip(byId[id]) : `<span class="tm">A lord</span>`;
  const list = ids => ids.length > 1 ? ids.slice(0, -1).map(who).join(", ") + " and " + who(ids[ids.length - 1]) : ids.map(who).join("");
  return e => e.kind === "ally" ? `🤝 ${list(e.ids)} allied` : e.kind === "part" ? `✋ ${who(e.ids[0])} and ${who(e.ids[1])} parted ways` : e.kind === "final" ? "⚑ Every pact ended for the final day" : e.kind === "wolf" ? `🐺 ${list(e.ids)} fought as the lone wolf` : e.known ? `💣 ${who(e.ids[0])} betrayed ${who(e.ids[1])}` : `💣 ${who(e.ids[0])} and ${who(e.ids[1])} fell out in a betrayal`;
}
// the alliance changes at the last battle fought: [] when nothing changed, null before the first battle
function lastAllyChanges() {
  const live = isLive(), last = live ? (LIVE.battles[latestBattleKey()] || {}).day : ((S.allyLog || []).slice(-1)[0] || {}).day;
  if (!last) return null; const h = allyHistory()[0]; return h && h.day === last ? h.ev : [];
}
function knownAlliancesHTML() {
  const { teams, alone, me, feuds, byId } = knownAlliances(), nm = p => esc(p.id === me ? "You" : p.name);
  const chip = p => `<span class="tm"><i class="sw" style="background:${p.color}"></i>${nm(p)}</span>`;
  const hist = allyHistory(), line = allyLineFn(byId, me);
  const betrayer = (a, b) => { const e = hist.flatMap(h => h.ev).find(x => x.kind === "betray" && x.known && x.ids.includes(a.id) && x.ids.includes(b.id)); return e ? [byId[e.ids[0]], byId[e.ids[1]]] : null; };
  const v2 = allyV2Now(), wolf = v2 && alone.length === 1 && teams.length > 0, foes = teams.reduce((n, t) => n + t.lords.length, 0);
  return `<div class="sec"><h3>Alliances in the war</h3>
    ${teams.length ? `<div class="agrid">${teams.map(t => `<div class="ateam${t.lords.some(p => p.id === me) ? " mine" : ""}"><small>${t.lords.some(p => p.id === me) ? "Your alliance" : "Alliance"} · ${t.lords.length} lords</small><div>${t.lords.map(chip).join("")}</div>${t.whole ? "" : `<p class="muted anote">Not all of them are allied to each other, so some of their armies still fight.</p>`}</div>`).join("")}</div>` : `<p class="muted">No alliances stand right now. Everyone is on their own.</p>`}
    ${alone.length ? `<div class="ateam solo"><small>Standing alone${wolf ? " · lone wolf" : ""}</small><div>${alone.map(chip).join("")}</div></div>` : ""}
    ${v2 ? `<p class="note${wolf ? " gold" : ""}">${wolf ? `<b>🐺 ${nm(alone[0])} ${alone[0].id === me ? "are" : "is"} the lone wolf.</b> Standing alone against ${foes} allied lords, ${alone[0].id === me ? "your" : "their"} army and castle deal ${Math.round(foes * LONE_WOLF_STEP * 100)}% more damage and has ${Math.round(foes * LONE_WOLF_STEP * 100)}% more health in battle. It ends if a second lord stands alone or they join an alliance.` : `Lone wolf: when only one lord is left outside every alliance, their army and castle get +${Math.round(LONE_WOLF_STEP * 100)}% damage and health in battle for each allied lord.`}</p>` : ""}
    ${feuds.length ? `<div class="ateam solo"><small>Bad blood · +20% damage to each other, and never allies again</small><div>${feuds.map(([a, b]) => { const bt = betrayer(a, b); return `<span class="tm">${bt ? `${chip(bt[0])} betrayed ${chip(bt[1])}` : `${chip(a)} ⚔ ${chip(b)}`}</span>`; }).join("")}</div></div>` : ""}
    <p class="muted">Pacts as they stood after the last battle. New invitations are announced when the next battle begins.</p></div>
    ${hist.length ? `<div class="sec"><h3>Alliance history</h3><div class="ahist">${hist.map(h => `<div class="ahday"><b>Day ${h.day}</b><ul>${h.ev.map(e => `<li>${line(e)}</li>`).join("")}</ul></div>`).join("")}</div></div>` : ""}`;
}
function alliancesTab() {
  const fin = pactsEndToday(), today = planDayKey(), inc = RIVALS.map(r => ({ r, o: incomingOffer(r) })).filter(x => x.o);
  const sent = Object.keys(S.offers).map(id => RIVALS.find(r => r.id === id)).filter(Boolean), carried = carriedPartners();
  const free = RIVALS.filter(r => !S.offers[r.id] && !carried.includes(r.id));
  const sentRow = r => { const o = S.offers[r.id], draft = o.day === today;
    return `<div class="alrow fl"><span class="who"><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b></span>
      ${draft ? `<span class="stepper"><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="-1" ${dis()}>−</button><b>${o.gold}g</b><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="1" ${dis()}>+</button></span><button class="btn small" data-act="uninvite" data-k="${r.id}" ${dis()}>Withdraw</button>`
        : `<span class="chip weak">Pending · ${o.gold}g</span>`}
      <small class="muted alx">${draft ? "Goes out tonight. They answer in tomorrow's planning." : "Sent yesterday. They answer in today's planning, and the alliance starts at tonight's battle if they accept."}${groupNote(r.id)}</small></div>`; };
  const nmI = id => esc((RIVALS.find(x => x.id === id) || {}).name || "your ally"), meId = allyLords().me;
  const groupNote = id => { if (!allyV2Now()) return ""; const theirs = allyGroup(id).filter(x => x !== id), mine = allyGroup(meId).filter(x => x !== meId);
    return (theirs.length ? ` They're allied with ${theirs.map(nmI).join(" and ")}: every member must accept you.` : "") + (mine.length ? ` Your ally ${mine.map(nmI).join(" and ")} must invite them too.` : ""); };
  return `${fin ? `<p class="muted">Final day: every pact has ended. Only one banner can win.</p>` : (finalToday() ? `<p class="twistnote">Final day: pacts hold into tonight's battle, but the moment your alliance is the last one standing it breaks and you fight each other for the war. Betray before you are betrayed.</p>` : "") + knownAlliancesHTML()}
    ${inc.length ? `<div class="sec"><h3>Invitations to you</h3>${inc.map(({ r, o }) => `<div class="alrow fl"><span class="who"><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b><small class="inc">${o.gold ? o.gold + "g dowry" : "no dowry"}</small></span>
      ${o.reply ? `<span class="chip ${o.reply === "accept" ? "ok" : "weak"}">${o.reply === "accept" ? "Accepted" : "Declined"}</span><button class="btn small" data-act="ireply" data-k="${r.id}" data-v="${o.reply === "accept" ? "reject" : "accept"}" ${dis()}>Change</button>` : `<button class="btn small wax" data-act="ireply" data-k="${r.id}" data-v="accept" ${dis()}>Accept</button><button class="btn small" data-act="ireply" data-k="${r.id}" data-v="reject" ${dis()}>Decline</button>`}${allyAnswersHTML(r.id)}</div>`).join("")}</div>` : ""}
    ${carried.length && !fin ? pactHTML() : ""}
    <div class="sec"><h3>Your invitations <small class="hnote">${sent.length}/${MAX_INVITES} open</small></h3>${sent.length ? sent.map(sentRow).join("") : `<p class="muted">None open.</p>`}</div>
    ${!fin ? `<div class="sec"><h3>Invite a lord</h3>${free.map(r => { const full = allyV2Now() && allyGroup(r.id).length + allyGroup(meId).length > BLOC_MAX, theirs = allyV2Now() ? allyGroup(r.id).length : 1;
      return `<div class="alrow fl"><span class="who"><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b>${theirs > 1 ? `<small class="inc">in an alliance of ${theirs}</small>` : ""}</span>${full ? `<span class="chip weak">Alliance full</span>` : `<button class="btn small ally" data-act="invite" data-k="${r.id}" ${dis(sent.length >= MAX_INVITES)}>Invite</button>`}</div>`; }).join("") || `<p class="muted">Everyone is allied or invited.</p>`}
      ${sent.length >= MAX_INVITES ? `<p class="muted">Two invitations are open. Wait for answers before sending more.</p>` : `<p class="muted">The dowry is set aside until they answer, and paid only if they accept.</p>`}</div>` : ""}`;
}
const planDayKey = () => (isLive() ? liveClock().planDay : DAY);
const ultCooling = () => { if (!isLive()) return S.ultLast != null && S.ultLast === DAY - 1; const ck = liveClock(), b = LIVE.battles[addDays(ck.planDay, -1)]; return !!(b && b.week === ck.week && b.ults && b.ults[LIVE.uid]); };
const blessLocked = () => { if (!isLive()) return S.blessDone != null && S.blessDone < DAY; const ck = liveClock(); return Object.keys(LIVE.battles).some(k => { const b = LIVE.battles[k]; return b.week === ck.week && k < ck.planDay && b.inputs && (b.inputs.plans || []).some(p => p.pid === LIVE.uid && p.blessing); }); };
const BLESSINGS = { vamp: ["Blood Rite", "Your whole army heals for 15% of the damage it deals, for the entire battle."], ward: ["Ward of Arrows", "Missiles cannot hurt your army for the first 45 seconds of the battle."] };
const planUlt = () => !!S.ultArm && !ultCooling() && ultLearned();
const planBless = () => (blessLocked() ? null : S.bless || null);
// the ultimate: plan it for tonight and say when to cast it (used on the Rituals tab and the seal screen)
function ultPlanHTML() {
  const u = (heroV3Now() && treeUlt()) || CLASSES[S.cls].ult, learned = ultLearned(), cd = ultCooling(), armed = planUlt();
  const img = u && u.ic ? spellURL(u.ic, 64) : spellURL(S.cls + "_ult", 64);
  return `<div class="ritcard${armed ? " on" : ""}${!learned || cd ? " off" : ""}">${artImg(img, "ritart")}<div class="ritx"><small>${ultBolt()}Ultimate</small><b>${esc(learned ? u.name : "Not learned yet")}</b>
      <span class="muted">${!learned ? "Spend a skill point on an ultimate in the Hero screen first." : cd ? "Recharging: it was cast in the last battle and is ready again tomorrow." : "Once per battle, only on nights you plan it. It rests the next day."}</span></div></div>
    ${learned && !cd ? `<button class="btn ${armed ? "wax" : "wood"}" data-act="ultarm" ${dis()}>${ultBolt()}${armed ? "Using it tonight ✓ (tap to cancel)" : "Use the ultimate tonight"}</button>${armed ? castWhenHTML(ultKey()) : ""}` : ""}`;
}
// the weekly ritual: one per war week, for a single battle
function blessPlanHTML() {
  const used = blessLocked();
  return `<p class="muted">${used ? "You have used this week's ritual. The next one comes with a new war week." : "One ritual per war week, for a single battle. Pick one, or none to save it."}</p>
    ${Object.entries(BLESSINGS).map(([k, [n, ds]]) => { const on = S.bless === k && !used;
      return `<button class="ritcard btnlike${on ? " on" : ""}${used ? " off" : ""}" data-act="bless" data-v="${on ? "" : k}" ${dis(used)} aria-pressed="${on}">${artImg(ART.bless[k], "ritart")}<span class="ritx"><b>${esc(n)}${on ? " ✓" : ""}</b><span class="muted">${esc(ds)}</span></span></button>`; }).join("")}`;
}
function ritualsTab() {
  return `<div class="sec tight"><h3>${ultBolt()}Ultimate</h3>${ultPlanHTML()}</div>
  <div class="sec tight"><h3>Weekly ritual</h3>${blessPlanHTML()}</div>`;
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
  const tab = ["strategy", "tactics", "contracts", "alliances", "rituals"].includes(sheet.tab) ? sheet.tab : (sheet.grp === "alli" ? "alliances" : "strategy");
  const tabs = [["strategy", "Strategy"], ["tactics", "Combat"], ["contracts", "Contracts"], ["alliances", "Alliances"], ["rituals", "Rituals"]];
  let body = "";
  if (tab === "strategy") body = strategyTab();
  if (tab === "tactics") body = `<p class="muted tight">These rules only apply mid-skirmish, once your soldiers are in a fight. Strategy decides where they go.</p>
    ${combatGroupsHTML()}
    ${ordersV2Now() ? "" : `<div class="sec tight"><h3>Battle commands</h3><p class="muted">If this happens mid-battle, do that. Each costs one order seal (${OP_MAX - opUsed()} left).</p>
      ${S.rules.map((r, i) => `<div class="rule"><label><span>If</span><select data-act="rif" data-v="${i}" ${dis()}>${opts(IFS, r.if)}</select></label><label><span>Then</span><select data-act="rthen" data-v="${i}" ${dis()}>${opts(THENS, r.then)}</select></label><button class="btn small" data-act="rdel" data-v="${i}" aria-label="Remove command" ${dis()}>✕</button></div>`).join("")}
      <div><button class="btn wood" data-act="radd" ${dis(opUsed() >= OP_MAX)}>Add command</button></div>
      <p class="muted">Tap a soldier or your hero on the map to give it its own job.</p></div>`}`;
  if (tab === "contracts") body = contractsTab();
  if (tab === "alliances") body = alliancesTab();
  if (tab === "rituals") body = ritualsTab();
  return head(null, sheet.grp === "alli" ? "Alliances" : "Orders", `${avail()} gold free${reserved() ? `, ${reserved()} offered` : ""}`) + `<div class="body">
    <div class="tabs" ${sheet.grp === "alli" ? "hidden" : ""}>${tabs.filter(t => sheet.grp === "alli" || t[0] !== "alliances").map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-act="ctab" data-v="${k}">${l}</button>`).join("")}</div>${body}</div>`;
}
function planJSON() {
  const place = {};
  Object.entries(S.place).forEach(([k, v]) => { const u = findUnit(v), t = findTrap(v); place[k] = v === "champ" ? "champion" : u ? `${u.type}:Lv${u.lvl}` : t ? `trap:${t.type}` : v; });
  return JSON.stringify({ day: DAY, class: S.cls, level: level(), ranks: S.ranks, upgrades: S.picks, castOn: S.triggers, gear: S.gear, defences: S.defences, placements: place, stance: S.stance, advanceOn: S.strategy.heading, attackMode: S.strategy.mode, priority: S.prio, combatPriorities: S.gprio, combatReach: S.engage, commands: S.rules,
    attackOrder: S.lists.hostile.map(id => PICK_ROLES[id] || (RIVALS.find(r => r.id === id) || {}).name), neutral: S.lists.neutral.map(id => (RIVALS.find(r => r.id === id) || {}).name),
    allianceOffers: Object.fromEntries(Object.keys(S.offers).map(id => [(RIVALS.find(r => r.id === id) || {}).name, S.offers[id]])),
    allianceTerms: Object.fromEntries(RIVALS.map(r => [r.name, S.terms[r.id]])), soldierOrders: S.uorders }, null, 2);
}
function sealWarnings() { return ""; } // the checklist below carries every reminder now
// the seal checklist: [state, text, where to fix it]; state is "ok", "need" (must fix to seal), "warn" (a reminder) or "info"
function sealChecks() {
  const L = [], ck = (st, t, go) => L.push([st, t, go]), day = isLive() ? liveClock().dayNo : DAY, ct = ctNow();
  if (!placedAt("champ")) ck("need", "<b>Put your hero on the field</b>", "map"); // only shown when something is wrong
  const un = S.owned.filter(u => !placedAt(u.id) && !inGarrison(u.id)).length;
  ck(un ? "warn" : "ok", un ? `<b>${un} soldier${un > 1 ? "s" : ""} not placed</b>, so ${un > 1 ? "they" : "it"} won't fight` : `All ${S.owned.length} soldier${S.owned.length === 1 ? "" : "s"} placed or in waves`, "deploy");
  const wt = (S.walls || []).concat(S.traps).filter(x => !placedAt(x.id)).length;
  if ((S.walls || []).length || S.traps.length) ck(wt ? "warn" : "ok", wt ? `<b>${wt} wall${wt > 1 ? "s or traps" : " or trap"} not set</b> on the field` : "Walls and traps are set", "map");
  { const at = S.lists.hostile.filter(allyShielded); if (at.length) ck("need", `<b>${at.map(id => esc(tgtName(id))).join(", ")} ${at.length > 1 ? "are allies" : "is an ally"}</b>: take them off your targets, or set the pact to Betray`, "strategy"); }
  const fp = freePts(); ck(fp ? "warn" : "ok", fp ? `<b>${fp} skill point${fp > 1 ? "s" : ""} unspent</b>` : "All skill points spent", "hero");
  if (pickV1Now()) ck(targetsReady() ? "ok" : "need", targetsReady() ? `Targets: ${S.lists.hostile.map(id => esc(tgtName(id))).join(" → ")}` : `<b>Pick a target</b> (1 to ${PICK_MAX} a day)`, "strategy");
  if (contractsOn() && myOffers().length) { const c = contractParse(S.contract); ck(c ? "ok" : "warn", c ? `Contract: ${esc(c.c.name)}` : "<b>No contract taken</b>", "contracts"); }
  if (day >= 2 && ct < 2) ck("warn", "Castle is still tier 1. A Fortress pays for itself in two days", "castle");
  else if (day >= 4 && ct < 3) ck("warn", "Castle is a Fortress. A Citadel opens tier 3 soldiers and gear", "castle");
  const inc = RIVALS.map(r => incomingOffer(r)).filter(Boolean), open = inc.filter(o => !o.reply).length;
  if (inc.length) ck(open ? "warn" : "ok", open ? `<b>${open} alliance offer${open > 1 ? "s" : ""} to answer</b>` : "Alliance offers answered", "alliances");
  if (!pactsEndToday()) { const sent = Object.keys(S.offers || {}).length, carried = carriedPartners().length; ck(sent || carried ? "ok" : "info", carried ? `Allied with ${carriedPartners().map(id => esc((RIVALS.find(r => r.id === id) || {}).name || "")).join(", ")}` : sent ? `${sent} alliance offer${sent > 1 ? "s" : ""} sent` : "No alliance offered (optional)", "alliances"); }
  if (betrayAllOn()) ck("ok", `Betraying the whole alliance (${carriedPartners().length} lords) ${esc(String(S.pactAll).toLowerCase())}`, "alliances");
  else carriedPartners().filter(id => !pactsEndToday()).forEach(id => { const a = (S.pactAct || {})[id] || "keep", nm = esc((RIVALS.find(r => r.id === id) || {}).name || "an ally");
    ck("ok", a === "betray" ? `Betraying ${nm} ${esc(String(S.pactWhen[id] || betrayDefault()).toLowerCase())}` : a === "break" ? (breakV2Now() ? `Disbanding the alliance with ${nm} after tonight` : `Breaking the pact with ${nm}`) : `Keeping the pact with ${nm}`, "alliances"); });
  if (mercOpen()) { const free = mercV2Now() ? mercToday().open.length : MERC_V1_IDS.filter(id => !mercWait(id)).length, b = bidSummary(); if (free) ck(b ? "ok" : "warn", b ? `Mercenary bid: ${esc(b)}` : "<b>No mercenary bid</b>. Rivals may hire them", "camp"); }
  return L;
}
const GO_LABEL = { map: "Map", deploy: "Deploy", hero: "Hero", strategy: "Targets", contracts: "Contracts", castle: "Castle", alliances: "Allies", camp: "Camp" };
const sealInitials = () => { const w = String(typeof MY_NAME === "string" ? MY_NAME : "").replace(/^(ser|lord|lady|baron|dame|count|sir)\s+/i, "").split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] || "Y")[0]).toUpperCase(); }; // the wax seal carries your initials
// testing mode: the host can fight today's battle now, which moves the whole game on a day
const testSkipOn = () => typeof TEST_MODE !== "undefined" && TEST_MODE && isLive() && typeof DS === "object" && typeof DS.isHost === "function" && DS.isHost() && !(LIVE && LIVE.readOnly);
function testSkipHTML() {
  if (!testSkipOn()) return "";
  const armed = LIVE.testArm === liveClock().planDay, busy = DS.busy === "skip";
  return `<div class="sec tight testskip"><h3>Testing mode</h3><p class="muted">Fight today's battle now for every lord, then move the game on to the next day. Lords who haven't sealed fight with their saved or stand-in orders.</p>
    <button class="btn ${armed ? "wax" : "wood"}" data-act="testskip" ${busy ? "disabled" : ""}>${busy ? "Fighting the battle…" : armed ? "Tap again to begin the battle now" : "⏩ Begin battle now"}</button></div>`;
}
function sealSheet() {
  if (S.locked) return head(null, "Orders Sealed", "The battle plays out at dusk") + `<div class="body">
    ${waxSealHTML()}<p class="muted" style="text-align:center">These orders will be fought at the lock. You can draft new orders until then: the sealed ones stay in effect until you seal the new ones.</p>
    <p class="muted" style="text-align:center">${ultBolt()}Ultimate: ${planUlt() ? "<b>will be used</b>" : "not planned"} · Ritual: ${planBless() ? `<b>${esc(BLESSINGS[S.bless][0])}</b>` : "none"}${mercOpen() ? ` · Mercenaries: ${bidSummary() ? `<b>${esc(bidSummary())}</b>` : "no bids"}` : ""}</p>
    <div class="row" style="justify-content:center">${isLive() ? `<button class="btn wood" data-act="battle" ${LIVE.readOnly ? "disabled" : ""}>⚔ Rehearse</button>` : `<button class="btn wax" data-act="battle">Watch tonight's battle</button>`}<button class="btn" data-act="unseal">Draft new orders</button></div>
    ${testSkipHTML()}
    <p class="muted" style="text-align:center">${isLive() ? `The real battle is fought at ${lockLabel(LIVE.config)}. Watch it afterwards from the Battle report.` : "In this prototype the battle runs now on your phone against the example players."}</p></div>`;
  const checks = sealChecks(), canSeal = !checks.some(c => c[0] === "need"), left = checks.filter(c => c[0] === "warn").length;
  return head(null, "Seal Your Orders", `Battle in ${countdown()}`) + `<div class="body">
    ${isLive() && S.sealedSnap ? `<div class="warnbox"><b class="wt">Your sealed orders are still in effect</b><p class="muted">You're drafting changes. They won't be fought until you press the seal again. If you don't, the orders you already sealed are used.</p></div>` : ""}
    <div class="sec tight"><h3>Checklist ${left ? `<span class="cnt">${left} to check</span>` : `<span class="cnt ok">ready</span>`}</h3>
      <ul class="checks2">${checks.map(([st, t, go]) => `<li class="c-${st}"><i>${st === "ok" ? "✓" : st === "need" ? "!" : st === "warn" ? "!" : "·"}</i><span>${t}</span>${GO_LABEL[go] ? `<button class="btn small" data-act="sealgo" data-v="${go}">${GO_LABEL[go]}</button>` : ""}</li>`).join("")}</ul></div>
    <div class="sec tight"><h3>Who you attack</h3>${targetSlotsHTML()}<h4 class="minih">The leaderboard</h4>${targetBoardHTML(true)}<div class="row"><button class="btn small" data-act="sealgo" data-v="strategy">Roles and more orders</button></div></div>
    <div class="sec tight"><h3>${ultBolt()}Ultimate</h3>${ultPlanHTML()}</div>
    <div class="sec tight"><h3>Weekly ritual</h3>${blessPlanHTML()}</div>
    <div class="sec tight"><h3>Rehearse</h3><p class="muted">${isLive() ? "Fight your current orders against your rivals' last known orders and see your battle report. Nothing counts." : "Run a practice battle with these orders. Nothing counts."}</p><button class="btn wood" data-act="battle" ${isLive() && LIVE.readOnly ? "disabled" : ""}>⚔ Rehearse the battle</button></div>
    ${testSkipHTML()}
    ${abar(`<button class="btn wax" data-act="seal" ${canSeal ? "" : "disabled"}>${canSeal ? "Press the seal" : "Fix the marked items to seal"}</button>`)}
    <p class="muted">${isLive() ? "Orders save to the shared game as you go. If you never seal, your latest draft is used. Once you have sealed, those orders stay in effect until you seal new ones." : ""}</p></div>`;
}
// the wax seal: a pixel blob of wax in the lord's colour, stamped with their initials
function waxSealHTML() { return `<div class="waxseal2" aria-label="Sealed with your initials"><img alt="" src="${waxSealURL(MY_COLOR || "#8a1f17", sealInitials())}"></div>`; }
