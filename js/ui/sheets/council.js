// War council: rivals, alliances, strategy, orders, sealing

const clsName = c => (c ? CLASSES[c].name : "Class unknown");
const GOLD_STEPS = [0, 50, 100, 150, 200, 300, 400, 500, 750, 1000];
const stepGold = (v, dir) => { const i = GOLD_STEPS.findIndex(x => x >= v); const j = Math.max(0, Math.min(GOLD_STEPS.length - 1, (i < 0 ? GOLD_STEPS.length - 1 : i) + dir)); return GOLD_STEPS[j]; };
function sideOf(r) { // where a rival sits relative to you, looking toward the centre
  const fy = CENTRE - CASTLE[0], fx = CENTRE - CASTLE[1], vy = r.pos[0] - CASTLE[0], vx = r.pos[1] - CASTLE[1];
  const cross = fx * vy - fy * vx, dot = (fx * vx + fy * vy) / ((Math.hypot(fx, fy) * Math.hypot(vx, vy)) || 1);
  return dot > .6 ? "ahead" : cross > 0 ? "right" : "left";
}
function incomingOffer(r) {
  if (isLive()) { const now = latestPlan(r.live, liveClock().planDay, true); const o = now && now.offers && now.offers[LIVE.uid]; return o ? { gold: o.gold || 0 } : null; }
  const o = (RIVAL_AI[r.id] && RIVAL_AI[r.id].offers || {}).you; return o ? { gold: o.gold || 0 } : null;
}
function incomingHTML() {
  const inc = RIVALS.map(r => [r, incomingOffer(r)]).filter(([, o]) => o);
  if (!inc.length) return `<p class="muted">No one has offered you an alliance yet${isLive() ? " today" : ""}.</p>`;
  return `<div class="sec"><h3>Offers to you</h3>${inc.map(([r, o]) => { const tm = S.terms[r.id], ok = tm.mode !== "refuse" && (o.gold >= tm.min || S.lists.ally.includes(r.id));
    return `<div class="spread"><span><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b> offers ${o.gold ? `${o.gold} gold` : "an alliance"}</span><span class="chip ${ok ? "ok" : "weak"}">${S.lists.ally.includes(r.id) ? "Mutual: free" : ok ? "You'd accept" : "You'd refuse"}</span></div>`; }).join("")}</div>`;
}
function allianceCard(r, inRivalSheet) {
  const tm = S.terms[r.id], off = S.offers[r.id], seeking = S.lists.ally.includes(r.id), inc = incomingOffer(r);
  return `<div class="rival">
    ${inRivalSheet ? "" : `<div class="spread"><span class="who"><i class="sw" style="background:${r.color}"></i>${esc(r.name)} <span class="eyebrow">${seeArmies() ? clsName(r.cls) : ""}</span></span><span class="muted">${inc ? `Offers you ${inc.gold} gold` : ""}</span></div>`}
    <div class="ilabel">If ${esc(r.name)} offers you an alliance</div>
    <div class="seg3">${[["refuse", "Refuse"], ["accept", "Accept"], ["betray", "Accept, then betray"]].map(([k, l]) => `<button class="btn small${tm.mode === k ? " on" : ""}${k === "betray" ? " hostile" : ""}" data-act="term" data-k="${r.id}" data-v="${k}" ${dis()}>${l}</button>`).join("")}</div>
    ${tm.mode !== "refuse" ? `<div class="spread"><span>Their dowry must be at least</span><span class="stepper"><button class="btn small" data-act="tmin" data-k="${r.id}" data-v="-1" ${dis()}>−</button><b>${tm.min}g</b><button class="btn small" data-act="tmin" data-k="${r.id}" data-v="1" ${dis()}>+</button></span></div>` : ""}
    ${tm.mode === "betray" ? `<div class="secret"><label class="inline">Turn on them<select data-act="twhen" data-k="${r.id}" ${dis()}>${opts(BETRAY_WHEN, tm.when)}</select></label><p class="muted">Secret. When the moment comes your hero must walk to their keep to set it off. You keep their dowry either way.</p></div>` : ""}
    <div class="ilabel">Your offer to ${esc(r.name)}</div>
    ${seeking ? `<div class="spread"><span>Dowry</span><span class="stepper"><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="-1" ${dis()}>−</button><b>${off.gold}g</b><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="1" ${dis()}>+</button></span></div>
      <p class="muted">Set aside now. You only pay if they accept, and get it back to spend tomorrow if they refuse.</p>
      <div><button class="btn small" data-act="lmove" data-k="${r.id}" data-v="neutral" ${dis()}>Withdraw offer</button></div>`
      : `<div><button class="btn small ally" data-act="lmove" data-k="${r.id}" data-v="ally" ${dis()}>Offer an alliance</button></div>`}
  </div>`;
}
function targetsHTML() {
  const row = (id, i, list) => { const r = RIVALS.find(x => x.id === id); if (!r) return "";
    return `<li class="tgt"><i class="sw" style="background:${r.color}"></i><span><b>${esc(r.name)}</b> <span class="muted">${sideOf(r)}${seeArmies() && r.cls ? " · " + clsName(r.cls) : ""}</span></span><span class="row">
      ${list === "hostile" ? `<button class="btn small" data-act="lup" data-k="${id}" aria-label="Attack sooner" ${dis(i === 0)}>▲</button><button class="btn small" data-act="ldown" data-k="${id}" aria-label="Attack later" ${dis(i === S.lists.hostile.length - 1)}>▼</button>` : ""}
      ${list !== "hostile" ? `<button class="btn small hostile" data-act="lmove" data-k="${id}" data-v="hostile" ${dis()}>Hostile</button>` : ""}
      ${list !== "neutral" ? `<button class="btn small" data-act="lmove" data-k="${id}" data-v="neutral" ${dis()}>Neutral</button>` : ""}
      ${list !== "ally" ? `<button class="btn small ally" data-act="lmove" data-k="${id}" data-v="ally" ${dis()}>Ally</button>` : ""}</span></li>`; };
  const sides = ["left", "ahead", "right"].map(sd => [sd, RIVALS.filter(r => sideOf(r) === sd).sort((a, b) => Math.hypot(a.pos[0] - CASTLE[0], a.pos[1] - CASTLE[1]) - Math.hypot(b.pos[0] - CASTLE[0], b.pos[1] - CASTLE[1]))[0]]).filter(([, r]) => r);
  return `<p class="muted">Your army marches on the first player in Hostile and fights anything that crosses its path on the way. When that castle falls it moves to the next. Neutral players are left alone unless they get in the way. With nobody hostile, your army still marches on the nearest castle.</p>
    ${sides.length ? `<div class="sec"><h3>Quick plans</h3><div class="row">${sides.map(([sd, r]) => `<button class="btn small wood" data-act="preset" data-v="${sd}" ${dis()}>Strike ${sd} · ${esc(r.name)}</button>`).join("")}</div></div>` : ""}
    <div class="sec"><h3>Hostile · attack order</h3><ol class="tgts">${S.lists.hostile.map((id, i) => row(id, i, "hostile")).join("") || `<li class="muted">Nobody. Your army will pick the nearest castle.</li>`}</ol></div>
    <div class="sec"><h3>Neutral</h3><ol class="tgts">${S.lists.neutral.map((id, i) => row(id, i, "neutral")).join("") || `<li class="muted">Nobody.</li>`}</ol></div>
    <div class="sec"><h3>Seeking alliance</h3><ol class="tgts">${S.lists.ally.map((id, i) => row(id, i, "ally")).join("") || `<li class="muted">Nobody. Offer alliances in the Alliances tab.</li>`}</ol>
      ${S.lists.ally.length ? `<p class="muted">Set each dowry in the Alliances tab. If an offer is refused, that player is treated as neutral.</p>` : ""}</div>
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
  S.strategy = S.strategy || { mode: "list", heading: "near" };
  if (!S.prio || S.prio.length !== 5 || S.prio.some(x => !PRIORITY_OPTS.includes(x))) S.prio = PRIORITIES.slice(0, 5);
  S.lists = S.lists || { hostile: [], neutral: [], ally: [] }; S.offers = S.offers || {}; S.terms = S.terms || {}; S.uorders = S.uorders || {}; S.diplo = S.diplo || {};
  S.castle = S.castle || 1; S.items = S.items || []; S.walls = S.walls || []; S.banner = S.banner || defaultBanner(); S.pairs = S.pairs || []; S.pactAct = S.pactAct || {}; S.pactWhen = S.pactWhen || {}; S.xp = S.xp || 0;
  S.phase = S.phase || "muster"; if (STANCE_FIX[S.stance]) S.stance = STANCE_FIX[S.stance];
  S.rules = (S.rules || []).map(r => ({ if: r.if, then: r.then === "All units defend castle" ? "All units fall back to regroup" : r.then === "Switch to Defensive" ? "Switch to Cautious" : r.then }));
  const ids = RIVALS.map(r => r.id);
  ["hostile", "neutral", "ally"].forEach(k => { S.lists[k] = S.lists[k].filter((id, i, a) => ids.includes(id) && a.indexOf(id) === i); });
  const placed = new Set([...S.lists.hostile, ...S.lists.neutral, ...S.lists.ally]);
  RIVALS.slice().sort((a, b) => Math.hypot(a.pos[0] - CASTLE[0], a.pos[1] - CASTLE[1]) - Math.hypot(b.pos[0] - CASTLE[0], b.pos[1] - CASTLE[1])).forEach(r => {
    if (!placed.has(r.id)) { const old = S.diplo[r.id] && S.diplo[r.id].rel; (old === "ally" ? S.lists.ally : S.lists.hostile).push(r.id); }
    S.diplo[r.id] = S.diplo[r.id] || {}; S.diplo[r.id].clues = S.diplo[r.id].clues || [];
    S.terms[r.id] = S.terms[r.id] || { mode: "accept", min: 200, when: BETRAY_WHEN[0] };
  });
  S.lists.ally.forEach(id => { S.offers[id] = S.offers[id] || { gold: 100, rigged: false }; });
  Object.keys(S.offers).forEach(id => { if (!S.lists.ally.includes(id)) delete S.offers[id]; });
  Object.keys(S.uorders).forEach(k => { const v = S.uorders[k]; if (!["army", "escort", "guard"].includes(v) && !ids.includes(v)) delete S.uorders[k]; });
  Object.keys(S.pactAct).forEach(id => { if (!ids.includes(id)) { delete S.pactAct[id]; delete S.pactWhen[id]; } });
}
const reserved = () => Object.values((S && S.offers) || {}).reduce((a, o) => a + (o.gold || 0), 0);
const avail = () => S.gold - reserved();
const bucketOf = id => (S.lists.hostile.includes(id) ? "hostile" : S.lists.ally.includes(id) ? "ally" : "neutral");
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
    return `<div class="pact"><b>${nm(id)}</b><div class="optrow">${[["keep", "Keep"], ["break", "Break it"], ["betray", "Betray later"]].map(([k, l]) => `<button class="btn small${a === k ? " on" : ""}" data-act="pact" data-v="${k}" data-k="${id}" ${dis()}>${l}</button>`).join("")}</div>${a === "betray" ? `<label class="inline">Turn on them<select data-act="pwhen" data-k="${id}" ${dis()}>${opts(BETRAY_WHEN, S.pactWhen[id])}</select></label>` : ""}</div>`; }).join("")}
    <p class="muted">Breaking a pact is clean. A betrayal is a surprise mid-battle. Their keep is blown up the moment you turn, losing half its health, and the victim will remember. Allies win the day together if only allies are left standing.</p></div>`;
}
function diplomacySection(R) {
  const D = R.dip; if (!D) return ""; const N = q => esc((R.names && R.names[q]) || "Someone"), li = [];
  D.offers.forEach(o => li.push(`<li>✉ <b>${N(o.pid)}</b> offered an alliance${o.gold ? ` with a ${o.gold} gold dowry` : ""}. ${o.accepted ? `<span class="ok">You allied.</span>` : `<span class="muted">You turned it down.</span>`}</li>`));
  D.broke.forEach(o => li.push(`<li>✂ <b>${N(o.pid)}</b> broke their pact with you.</li>`));
  D.bets.forEach(o => li.push(`<li class="bad">🗡 <b>${N(o.pid)}</b> betrayed you at ${fmt(o.t)} and blew up your keep.</li>`));
  return `<div class="sec dipsec"><h3>Diplomacy</h3>${li.length ? `<ul class="pacts">${li.join("")}</ul>` : `<p class="muted">Nobody reached out, broke faith or betrayed you today.</p>`}</div>`;
}
function councilHTML() {
  const live = isLive(), ck = live ? liveClock() : null, pts = live ? standings(ck.week) : {};
  const lords = RIVALS.slice().sort((a, b) => (pts[b.id] || 0) - (pts[a.id] || 0));
  const battles = live ? Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === ck.week).sort() : [];
  return `
    ${live ? `<div class="sec"><h3>Standings</h3>${[{ id: LIVE.uid, name: MY_NAME, color: MY_COLOR }, ...RIVALS].sort((a, b) => (pts[b.id] || 0) - (pts[a.id] || 0)).map((p, i) => `<div class="place${p.id === LIVE.uid ? " me" : ""}"><span class="ord">${i + 1}</span><i style="background:${p.color}"></i><span><b>${esc(p.id === LIVE.uid ? MY_NAME : p.name)}</b></span><span class="pts">${pts[p.id] || 0}<small>points</small></span></div>`).join("")}</div>
      <div class="sec"><h3>This week's battles</h3>${battles.length ? battles.map(k => { const b = LIVE.battles[k], mine = (b.results || []).find(r => r.pid === LIVE.uid);
        return `<div class="spread"><span>Day ${b.day}${mine ? ` · you placed ${mine.place}${mine.place === 1 ? "st" : mine.place === 2 ? "nd" : mine.place === 3 ? "rd" : "th"}` : ""}</span><button class="btn small wood" data-act="watchday" data-v="${k}">Watch</button></div>`; }).join("") : `<p class="muted">The first battle is fought at ${hourLabel(LIVE.config.lockHour)} on day 1.</p>`}</div>` : ""}
    <div class="sec"><h3>Rivals</h3>${lords.map(r => `<button class="lord" data-act="open" data-v="rival" data-k="${r.id}"><i style="background:${r.color}"></i><span><b>${esc(r.name)}</b> · ${seeArmies() ? clsName(r.cls) : "Class unknown"}</span><span class="trust t-${r.trust}">${bucketOf(r.id) === "ally" ? "Seeking alliance" : bucketOf(r.id) === "hostile" ? "Hostile" : "Neutral"}</span></button>`).join("") || `<p class="muted">No rivals yet. Invite friends from the Share menu.</p>`}</div>
    <div><button class="btn" data-act="open" data-v="game">${live ? "Game settings" : "Play with friends"}</button></div>`;
}
function councilSheet() { sheet.tab = sheet.tab || "council"; return ordersSheet(); }
function rivalRow(r, open) {
  const b = bucketOf(r.id), rank = S.lists.hostile.indexOf(r.id) + 1, off = S.offers[r.id], tm = S.terms[r.id], inc = incomingOffer(r);
  const incOk = inc && tm.mode !== "refuse" && (inc.gold >= tm.min || b === "ally");
  const status = (b === "hostile" ? (rank === 1 ? "Main target" : `Attack #${rank}`) : b === "neutral" ? "Left alone unless in the way" : `Offering ${off.gold}g`)
    + (inc ? ` · offers you ${inc.gold}g${b === "ally" ? " (mutual: free)" : incOk ? ", you accept" : ", you refuse"}` : "");
  return `<div class="rv${open ? " open" : ""}">
    <button class="rvn" data-act="rvopen" data-v="${r.id}"><i class="sw" style="background:${r.color}"></i><span><b>${esc(r.name)}</b><small>${esc(status)}</small></span></button>
    <div class="rvseg"><button class="${b === "hostile" ? "on hostile" : ""}" data-act="rvset" data-k="${r.id}" data-v="hostile" ${dis()}>${b === "hostile" ? `Attack ${rank}` : "Attack"}</button><button class="${b === "neutral" ? "on" : ""}" data-act="rvset" data-k="${r.id}" data-v="neutral" ${dis()}>Ignore</button><button class="${b === "ally" ? "on ally" : ""}" data-act="rvset" data-k="${r.id}" data-v="ally" ${dis()}>Ally</button></div>
    ${open ? `<div class="rvd">
      ${b === "ally" ? `<div class="spread"><span>Your dowry</span><span class="stepper"><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="-1" ${dis()}>−</button><b>${off.gold}g</b><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="1" ${dis()}>+</button></span></div>` : ""}
      <div class="rvterms"><span>If they offer:</span><select data-act="tmode" data-k="${r.id}" ${dis()}>${[["refuse", "Refuse"], ["accept", "Accept"], ["betray", "Accept, then betray"]].map(([k, l]) => `<option value="${k}"${tm.mode === k ? " selected" : ""}>${l}</option>`).join("")}</select>
        ${tm.mode !== "refuse" ? `<select data-act="tmin" data-k="${r.id}" ${dis()} aria-label="Smallest dowry you accept">${GOLD_STEPS.map(g => `<option value="${g}"${tm.min === g ? " selected" : ""}>${g ? `${g}g or more` : "any dowry"}</option>`).join("")}</select>` : ""}
        ${tm.mode === "betray" ? `<select data-act="twhen" data-k="${r.id}" ${dis()} aria-label="When to betray">${opts(BETRAY_WHEN, tm.when)}</select>` : ""}</div>
          </div>` : ""}
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
    <div class="sec tight"><h3>Stance</h3><div class="seg3">${STANCES.map(([k, n]) => `<button class="btn small${S.stance === k ? " on" : ""}" data-act="stance" data-v="${k}" ${dis()}>${n}</button>`).join("")}</div><p class="muted">${esc(STANCES.find(x => x[0] === S.stance)[2])}.</p></div>`;
}
const STATUS_NEXT = { hostile: "neutral", neutral: "ally", ally: "hostile" };
function alliancesTab() {
  const carried = carriedPartners(), fin = finalToday();
  const rows = RIVALS.map(r => {
    const b = bucketOf(r.id), tm = S.terms[r.id], off = S.offers[r.id], inc = incomingOffer(r), allied = carried.includes(r.id) && !fin, act = S.pactAct[r.id] || "keep", open = tm.mode !== "refuse", ex = sheet.rv === r.id;
    const status = allied ? `<select data-act="pactset" data-k="${r.id}" ${dis()} aria-label="Pact with ${esc(r.name)}"><option value="keep"${act === "keep" ? " selected" : ""}>Allied</option><option value="break"${act === "break" ? " selected" : ""}>Break pact</option><option value="betray"${act === "betray" ? " selected" : ""}>Betray later</option></select>`
      : `<button class="btn small st-${b}" data-act="stcycle" data-k="${r.id}" ${dis()}>${b === "hostile" ? "Hostile" : b === "neutral" ? "Neutral" : `Offer ${off ? off.gold : 0}g`}</button>`;
    return `<div class="alrow${allied ? " allied" : ""}"><span class="who"><i class="sw" style="background:${r.color}"></i><b>${esc(r.name)}</b>${inc ? `<small class="inc">✉ offers ${inc.gold}g</small>` : ""}</span>${status}
      <label class="open"><input type="checkbox" data-act="topen" data-k="${r.id}" ${open ? "checked" : ""} ${dis()}></label>
      <select data-act="tmin" data-k="${r.id}" ${open ? "" : "disabled"} ${dis()} aria-label="Smallest dowry you accept">${GOLD_STEPS.map(g => `<option value="${g}"${tm.min === g ? " selected" : ""}>${g ? g + "g+" : "any"}</option>`).join("")}</select>
      <button class="btn small more" data-act="rvopen" data-v="${r.id}" aria-label="More">⋯</button>
      ${b === "ally" && !allied ? `<div class="alx"><span>Your dowry</span><span class="stepper"><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="-1" ${dis()}>−</button><b>${off.gold}g</b><button class="btn small" data-act="ogold" data-k="${r.id}" data-v="1" ${dis()}>+</button></span></div>` : ""}
      ${ex ? `<div class="alx"><label class="inline"><input type="checkbox" data-act="tbet" data-k="${r.id}" ${tm.mode === "betray" ? "checked" : ""} ${open ? "" : "disabled"} ${dis()}> Accept, then betray</label>${tm.mode === "betray" ? `<select data-act="twhen" data-k="${r.id}" ${dis()}>${opts(BETRAY_WHEN, tm.when)}</select>` : ""}${allied && act === "betray" ? `<select data-act="pwhen" data-k="${r.id}" ${dis()}>${opts(BETRAY_WHEN, S.pactWhen[r.id])}</select>` : ""}</div>` : ""}</div>`; }).join("");
  return `<p class="muted">Tap a status to cycle Hostile, Neutral and Offer. Tick <b>Open</b> to accept their offers, if the dowry is at least your minimum. ${fin ? "Final day: every pact has ended." : ""}</p>
    <div class="alhead"><span>Lord</span><span>Status</span><span>Open</span><span>Dowry</span><span></span></div>${rows}
    <p class="muted">An offer sets the gold aside now. You only pay if they accept. Breaking a pact is clean; a betrayal blows up their keep for half its health.</p>`;
}
function ordersSheet() {
  ensureDip();
  const tab = ["strategy", "tactics", "alliances", "council"].includes(sheet.tab) ? sheet.tab : "strategy";
  const tabs = [["strategy", "Strategy"], ["tactics", "Combat"], ["alliances", "Alliances"], ["council", "Council"]];
  let body = "";
  if (tab === "strategy") body = strategyTab();
  if (tab === "tactics") body = `<p class="muted tight">These rules only apply mid-skirmish, once your soldiers are in a fight. Strategy decides where they go.</p>
    <div class="sec tight"><h3>Hunt first</h3><p class="muted">In a fight, soldiers pick their target from the top slot down.</p>
      ${S.prio.map((pr, i) => `<label class="prow"><span>${["1st", "2nd", "3rd", "4th", "5th"][i]}</span><select data-act="prioset" data-v="${i}" ${dis()}>${PRIORITY_OPTS.map(o => `<option${o === pr ? " selected" : ""}>${o}</option>`).join("")}</select></label>`).join("")}</div>
    <div class="sec tight"><h3>Battle commands</h3><p class="muted">If this happens mid-battle, do that. Each costs one order seal (${OP_MAX - opUsed()} left).</p>
      ${S.rules.map((r, i) => `<div class="rule"><label><span>If</span><select data-act="rif" data-v="${i}" ${dis()}>${opts(IFS, r.if)}</select></label><label><span>Then</span><select data-act="rthen" data-v="${i}" ${dis()}>${opts(THENS, r.then)}</select></label><button class="btn small" data-act="rdel" data-v="${i}" aria-label="Remove command" ${dis()}>✕</button></div>`).join("")}
      <div><button class="btn wood" data-act="radd" ${dis(opUsed() >= OP_MAX)}>Add command</button></div>
      <p class="muted">Tap a soldier or your hero on the map to give it its own job.</p></div>`;
  if (tab === "alliances") body = alliancesTab();
  if (tab === "council") body = councilHTML();
  return head(null, "War Council", `Step 2 of 2 · ${avail()} gold free${reserved() ? `, ${reserved()} offered` : ""}`) + `<div class="body">
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-act="ctab" data-v="${k}">${l}</button>`).join("")}</div>${body}</div>`;
}
function planJSON() {
  const place = {};
  Object.entries(S.place).forEach(([k, v]) => { const u = findUnit(v), t = findTrap(v); place[k] = v === "champ" ? "champion" : u ? `${u.type}:Lv${u.lvl}` : t ? `trap:${t.type}` : v; });
  return JSON.stringify({ day: DAY, class: S.cls, level: level(), ranks: S.ranks, upgrades: S.picks, castOn: S.triggers, gear: S.gear, defences: S.defences, placements: place, stance: S.stance, advanceOn: S.strategy.heading, attackMode: S.strategy.mode, priority: S.prio, commands: S.rules,
    attackOrder: S.lists.hostile.map(id => (RIVALS.find(r => r.id === id) || {}).name), neutral: S.lists.neutral.map(id => (RIVALS.find(r => r.id === id) || {}).name),
    allianceOffers: Object.fromEntries(S.lists.ally.map(id => [(RIVALS.find(r => r.id === id) || {}).name, S.offers[id]])),
    allianceTerms: Object.fromEntries(RIVALS.map(r => [r.name, S.terms[r.id]])), soldierOrders: S.uorders }, null, 2);
}
function sealSheet() {
  if (S.locked) return head(null, "Orders Sealed", "The battle plays out at dusk") + `<div class="body">
    <div class="waxseal">LB</div><p class="muted" style="text-align:center">You can break the seal and change your plans until then.</p>
    <div class="row" style="justify-content:center">${isLive() ? "" : `<button class="btn wax" data-act="battle">Watch tonight's battle</button>`}<button class="btn" data-act="unseal">Break the seal</button>${isLive() ? "" : `<button class="btn wood" data-act="copy">Copy plan</button>`}</div>
    <p class="muted" style="text-align:center">${isLive() ? `The real battle is fought at ${hourLabel(LIVE.config.lockHour)}. Watch it afterwards from the Council. A test battle uses what you know of your rivals from yesterday.` : "In this prototype the battle runs now on your phone against the example players."}</p>
    ${isLive() ? `<div class="row" style="justify-content:center"><button class="btn wood" data-act="battle">Run a test battle</button></div>` : ""}
    <div class="sec"><h3>Your sealed plan</h3><p class="muted">This is what the battle will read.</p><div class="plan" id="plan">${esc(planJSON())}</div></div></div>`;
  const checks = [
    [!!placedAt("champ"), "Hero is on the field"],
    [S.owned.every(u => placedAt(u.id)), `Soldiers placed (${S.owned.filter(u => placedAt(u.id)).length} of ${S.owned.length})`],
    [freePts() === 0, freePts() ? `${freePts()} skill point${freePts() > 1 ? "s" : ""} unspent` : "All skill points spent"],
    [S.traps.every(t => placedAt(t.id)), "Bought traps are set"],
    [S.strategy.mode !== "list" || S.lists.hostile.length > 0, S.strategy.mode !== "list" ? `Attack: ${esc(TMODES.find(x => x[0] === S.strategy.mode)[1].toLowerCase())}` : S.lists.hostile.length ? `Main attack: ${esc((RIVALS.find(r => r.id === S.lists.hostile[0]) || {}).name || "")}` : "Nobody marked hostile, so your army picks the nearest castle"],
    [opUsed() === OP_MAX, opUsed() < OP_MAX ? `${OP_MAX - opUsed()} order seal${OP_MAX - opUsed() > 1 ? "s" : ""} unused` : "All order seals used"],
  ];
  return head(null, "Seal Your Orders", `Battle in ${countdown()}`) + `<div class="body">
    <ul class="checks">${checks.map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("")}</ul>
    <p class="muted">${checks[0][0] ? "Unticked items are only reminders." : "Your hero must be on the field before you can seal."}</p>
    <button class="btn wax" data-act="seal" ${checks[0][0] ? "" : "disabled"}>Press the seal</button>
    ${isLive() ? "" : `<div class="row"><button class="btn wood" data-act="battle">Run a test battle</button><button class="btn" data-act="lab">Balance lab</button></div>`}
    ${isLive() ? `<p class="muted">Orders save to the shared game as you go. If you don't seal, your latest orders are used.</p>` : `<button class="btn" data-act="reset">Reset to the example setup</button>`}</div>`;
}
