// Leaderboard, battle report, title, guide, spell book, damage types

const typeLine = ([a, r]) => `${ATK_TYPES[a].name} attack · ${ARMOUR_TYPES[r]} armour`;
function typesHTML() {
  const cell = v => `<td class="tm ${v > 1.05 ? "up" : v < .95 ? "down" : ""}">${Math.round(v * 100)}%</td>`;
  const who = (k) => [...Object.entries(CLASS_TYPES).filter(([, t]) => t[1] === k).map(([c]) => CLASSES[c].name), ...Object.entries(UNIT_TYPES).filter(([, t]) => t[1] === k).map(([u]) => UNITS[u].name), ...(k === "fortified" ? ["Castles"] : [])].join(", ");
  const uses = (k) => [...Object.entries(CLASS_TYPES).filter(([, t]) => t[0] === k).map(([c]) => CLASSES[c].name), ...Object.entries(UNIT_TYPES).filter(([, t]) => t[0] === k).map(([u]) => UNITS[u].name), ...(k === "pierce" ? ["Castle towers"] : []), ...(k === "pure" ? ["Traps"] : [])].join(", ");
  return `<p class="muted">Every attack has a type and every body has an armour class. The table shows how much damage each attack type deals to each armour class. Heroes' abilities use their class's attack type.</p>
  <div class="tbl"><table><thead><tr><th>Attack ↓ / Armour →</th>${Object.values(ARMOUR_TYPES).map(n => `<th>${n}</th>`).join("")}</tr></thead><tbody>
  ${Object.entries(TYPE_TABLE).map(([k, row]) => `<tr><td>${ATK_TYPES[k].name}</td>${Object.keys(ARMOUR_TYPES).map(r => cell(row[r])).join("")}</tr>`).join("")}</tbody></table></div>
  <div class="sec"><h3>Who uses what</h3>${Object.keys(ATK_TYPES).map(k => `<p><b>${ATK_TYPES[k].name}:</b> ${uses(k) || "–"}. <span class="muted">${ATK_TYPES[k].note}</span></p>`).join("")}
  ${Object.keys(ARMOUR_TYPES).map(k => `<p><b>${ARMOUR_TYPES[k]} armour:</b> ${who(k)}.</p>`).join("")}</div>
  <div class="sec"><h3>Two extra rules</h3><p>Heroes take ${Math.round((1 - HERO_GUARD) * 100)}% less damage from soldiers, so a crowd of bowmen can't melt a hero.</p><p>The Rogue deals ${Math.round((FINISH_BONUS - 1) * 100)}% more to anything below half health.</p></div>`;
}

// ----- leaderboard, battle report, guide, spell book -----
function boardRows() { // [{id,name,color,banner,cls,lvl,pts,last}]
  if (!isLive()) {
    const ids = ["you", ...RIVALS.map(r => r.id)], lvl = DAY;
    return ids.map(id => { const rv = RIVALS.find(r => r.id === id); return { id, me: id === "you", name: rv ? rv.name : "You", color: rv ? rv.color : MY_COLOR, banner: rv ? rv.banner : S.banner, cls: rv ? (seeArmies() ? rv.cls : null) : S.cls, lvl, pts: PRACTICE_BOARD[id] || 0, last: null }; });
  }
  const ck = liveClock(), roster = rosterFor(ck.week), pts = standings(ck.week), lastKey = Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === ck.week).sort().pop(), lb = lastKey && LIVE.battles[lastKey];
  return roster.map((p, i) => { const pl = latestPlan(p, ck.planDay, true), hs = heroState(p.uid, ck.week, ck.planDay), st = p.state && p.state.week === ck.week ? p.state : null, lr = lb && (lb.results || []).find(r => r.pid === p.uid);
    return { id: p.uid, me: p.uid === LIVE.uid, name: nameOf(p.uid), color: teamColour(p.uid), banner: p.uid === LIVE.uid ? S.banner : (st && st.banner) || (pl && pl.banner), cls: (p.uid === LIVE.uid || ck.dayNo > 1) && st ? st.cls : null, lvl: hs.lvl, pts: pts[p.uid] || 0, last: lr ? lr.points : null }; });
}
let BOUNTY_CACHE = { k: null, m: {} };
function bountyMap() { // gold on the heads of the top three: base + board position + hero level x 5
  const k = gameMode + "|" + (isLive() ? Object.keys(LIVE.battles).length : DAY) + "|" + RIVALS.length;
  if (BOUNTY_CACHE.k !== k) { const rows = boardRows().sort((a, b) => b.pts - a.pts || b.lvl - a.lvl), n = rows.length, m = {}; rows.forEach((r, i) => { if (i < 3 && n > 3) m[r.id] = bountyGold(i + 1, r.lvl); }); BOUNTY_CACHE = { k, m }; }
  return BOUNTY_CACHE.m;
}
function boardSheet() {
  const rows = boardRows().sort((a, b) => b.pts - a.pts || b.lvl - a.lvl), n = rows.length, low = Math.max(1, Math.round(n * .3));
  const me = rows.findIndex(r => r.me), catchUp = isLive() && me > -1 ? catchUpGold(n, n - 1 - me) : 0;
  return head(null, "Leaderboard", `${isLive() ? "Week standings" : "Test standings"} · day ${DAY} of 7`) + `<div class="body bdbody">
    <div class="bdhead"><span></span><span></span><span>Lord</span><span>Lv</span><span>Pts</span></div>
    ${rows.map((r, i) => `<div class="bd2${r.me ? " me" : ""}"><span class="ord">${i + 1}</span><img class="bmini" alt="" src="${bannerURL(r.banner, r.color, 24, 32)}"><span class="bdn"><b>${esc(r.name)}</b>${r.cls ? `<small>${CLASSES[r.cls].name}</small>` : ""}${i < 3 && n > 3 ? `<i class="tag bty" title="Bounty on their head: base + board position + hero level x 5">♛ ${bountyMap()[r.id] || ""}g</i>` : ""}${i >= n - low && n > 3 ? `<i class="tag cat" title="Earns catch-up gold">◈</i>` : ""}</span><span class="lv">${r.lvl}</span><span class="pts">${r.pts}${r.last != null ? `<small>+${r.last}</small>` : ""}</span></div>`).join("")}
    <p class="muted bdfoot"><b class="bounty">♛</b> bounty on the top three · <b class="catch">◈</b> catch-up gold for the bottom 30%${catchUp ? ` (you get +${catchUp})` : ""}. Points: 10 for first place down to 0, +1 per hero slain, +${castlePts(isLive() ? fairV1For(liveClock().planDay) : true)} per castle taken.</p></div>`;
}
function latestBattleKey() { return Object.keys(LIVE.battles || {}).sort().pop() || null; }
let LASTP = null, reportBack = null;
function reportData(id) {
  if (id === "practice") return LASTP;
  const b = LIVE.battles && LIVE.battles[id]; return b ? { id, day: b.day, results: b.results || [], gain: b.gain || {}, xp: b.xp || {}, gold: b.gold || {}, team: !!b.team, week: b.week, rapierEnd: b.rapierEnd || null, awards: b.awards || null, plans: (b.inputs && b.inputs.plans) || null } : null;
}
function awardsHTML(A, nm) {
  if (!A) return "";
  const rows = [["🏆", "MVP", A.mvp && A.mvp.pid, A.mvp && `${A.mvp.pts} points`], ["⚔", "Most Kills", A.kills && A.kills.pid, A.kills && `${A.kills.n} kills`], ["☠", "Highest K/D", A.kd && A.kd.pid, A.kd && `${A.kd.v} kills per death`], ["🥉", "Bronze Spoils", A.spoils && A.spoils.pid, A.spoils && `${A.spoils.g}g looted`]];
  return `<div class="sec awards"><h3>Awards</h3>${rows.filter(r => r[2]).map(([g, t, pid, d]) => `<div class="award"><span class="ag">${g}</span><span><b>${t}</b><br><span class="muted">${esc(nm(pid))} · ${d}</span></span></div>`).join("")}</div>`;
}
function dayChips(id, d) {
  if (!isLive()) return "";
  const ks = Object.keys(LIVE.battles || {}).filter(k => LIVE.battles[k].week === d.week).sort(); if (ks.length < 2) return "";
  return `<div class="daychips">${ks.map(k => `<button class="chip${k === id ? " on" : ""}" data-act="rday" data-v="${k}">Day ${LIVE.battles[k].day}</button>`).join("")}</div>`;
}
function weekHTML(d, me, nm) {
  if (!isLive() || !d.week) return "";
  const ids = Array.from(new Set([LIVE.uid, ...RIVALS.map(r => r.id)])), pts = standings(d.week), col = id => teamColour(id);
  return `<div class="sec"><h3>Week standings</h3>${ids.sort((a, b) => (pts[b] || 0) - (pts[a] || 0)).map((id, i) => `<div class="wrow${id === me ? " me" : ""}"><span class="rk">${i + 1}</span><i style="background:${col(id)}"></i><span class="rn"><b>${esc(nm(id))}</b></span><span class="pts">${pts[id] || 0}<small>pts</small></span></div>`).join("")}</div>`;
}
function reportSheet(id) {
  id = id || (isLive() ? latestBattleKey() : (LASTP ? "practice" : null));
  const d = id && reportData(id);
  if (!d) return head(null, "Battle report", "Nothing yet") + `<div class="body"><p class="muted">${isLive() ? "No battle has been fought yet. The first one is at " + lockLabel(LIVE.config) + "." : "Fight a practice battle first (Orders → Seal Orders → Fight)."}</p><div class="row"><button class="btn wax" data-act="rclose">Close</button></div></div>`;
  const me = isLive() ? LIVE.uid : "you", mine = d.results.find(r => r.pid === me), ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
  const nm = pid => pid === me ? (isLive() ? MY_NAME : "You") : (isLive() ? nameOf(pid) : ((d.names && d.names[pid]) || (RIVALS.find(r => r.id === pid) || {}).name || "Someone"));
  if (sheet.insp && d.plans) return lordSheet(d, sheet.insp, nm);
  const sorted = d.results.slice().sort((a, b) => a.place - b.place || b.points - a.points), gain = d.gain[me] || 0;
  return head(null, `Day ${d.day} report`, d.team ? "Allies won the Daily Siege together" : "The battle has been fought") + `<div class="body">
    ${dayChips(id, d)}
    ${mine ? `<div class="rsum"><b>${mine.place === 1 ? (d.team ? "Victory, together" : "Victory") : ord(mine.place) + " of " + d.results.length}</b><span>${mine.points} pt${mine.points === 1 ? "" : "s"} · +${d.gold[me] != null ? d.gold[me] : (mine.gold || 0)}g${gain ? ` · +${gain} lvl` : ""}</span></div>` : `<p class="muted">You weren't in this battle.</p>`}
    <div class="rbtns"><button class="btn wax" data-act="rwatch" data-v="${id}">▶ Watch</button><button class="btn wood" data-act="rreelm" data-v="${id}">★ Highlights</button></div>
    <div class="sec tight">${sorted.map(r => { const medal = ["🥇", "🥈", "🥉"][r.place - 1] || ord(r.place), chips = [`⚔ ${r.kills || 0}`, `☠ ${r.ukills || 0}`, `♜ ${r.castles || 0}`].concat(d.gain[r.pid] ? [`+${d.gain[r.pid]} lvl`] : [], d.gold[r.pid] != null ? [`+${d.gold[r.pid]}g`] : [], d.rapierEnd === r.pid ? ["Rapier"] : []);
      return `<${d.plans ? `button data-act="rinsp" data-v="${r.pid}"` : "div"} class="rrow${r.pid === me ? " me" : ""}${d.plans ? " tap" : ""}"><span class="rk">${medal}</span><i style="background:${isLive() ? teamColour(r.pid) : "#b8322a"}"></i><span class="rn"><b>${esc(nm(r.pid))}</b>${r.cls ? `<small>${CLASSES[r.cls].name}</small>` : ""}</span><span class="pts">${r.points}<small>pts</small></span><span class="rc">${chips.map(c => `<em>${c}</em>`).join("")}</span></${d.plans ? "button" : "div"}>`; }).join("")}
      <p class="muted legend">${d.plans ? "Tap a lord to inspect them · " : ""}⚔ hero kills · ☠ unit kills · ♜ castles</p></div>
    ${weekHTML(d, me, nm)}
    ${awardsHTML(d.awards, nm)}
    <div class="row"><button class="btn" data-act="rclose">Close</button></div></div>`;
}
function lordSheet(d, pid, nm) {
  const pl = d.plans.find(p => p.pid === pid), me = isLive() ? LIVE.uid : "you", C = CLASSES[pl.cls] || CLASSES.warrior, rk = pl.ranks || {}, gear = pl.gear || {}, def = pl.defences || {};
  const pips = (n, m) => `<span class="pips sm">${Array.from({ length: m }, (_, i) => `<i class="pip${i < n ? " on" : ""}"></i>`).join("")}</span>`;
  const abil = [...C.abilities.map(a => [a.key, a.name, a.desc, 4]), ["ult", C.ult.name, C.ult.desc, 3]];
  const art = k => { const f = typeof ART_FILES !== "undefined" && ART_FILES[pl.cls + "_" + k]; return f ? `icons/${f}.webp` : ""; };
  const units = (pl.pieces || []).filter(pc => pc.kind === "unit"), walls = (pl.pieces || []).filter(pc => pc.kind === "wall").length, traps = (pl.pieces || []).filter(pc => pc.kind === "trap").length;
  const grp = {}; units.forEach(u => { const k = u.type + "|" + u.lvl; grp[k] = (grp[k] || 0) + 1; });
  const gearRows = [["weapon", "Weapon"], ["armour", "Armour"], ["charm", "Charm"]].map(([k, l]) => `<div class="irow"><span>${l}</span><b>${gear[k] ? esc(GEAR[k][gear[k] - 1].name) : "None"}</b>${pips(gear[k] || 0, 3)}</div>`).join("")
    + [["walls", "Bastion"], ["tower", "Tower"]].map(([k, l]) => `<div class="irow"><span>${l}</span><b>${def[k] ? esc(DEFENCES[k][def[k] - 1].name) : "None"}</b>${pips(def[k] || 0, 2)}</div>`).join("");
  return head(`icons/ui/hero_${pl.cls}.webp`, nm(pid), `${C.name} · level ${pl.level} · ${tierName(pl.castleTier || 1)}`) + `<div class="body insp">
    <button class="btn small" data-act="rinspx">← Scoreboard</button>
    <div class="sec"><h3>Hero abilities</h3>${abil.map(([k, n, ds, m]) => `<div class="irow ab">${art(k) ? `<img alt="" src="${art(k)}">` : ""}<span><b>${esc(n)}</b><small class="muted">${esc(ds)}</small></span>${pips(rk[k] || 0, m)}</div>`).join("")}<div class="irow ab"><span><b>Vigour</b><small class="muted">+2% health and damage per rank</small></span>${pips(rk.a4 || 0, 6)}</div></div>
    <div class="sec"><h3>Items</h3>${(pl.items || []).length ? `<div class="islots tiny">${pl.items.map(k => ITEMS[k] ? `<div class="islot" title="${esc(ITEMS[k].name)}"><img alt="" src="${itemURL(k)}"><small>${esc(ITEMS[k].name)}</small></div>` : "").join("")}</div>` : `<p class="muted">No items.</p>`}</div>
    <div class="sec"><h3>Upgrades</h3>${gearRows}</div>
    <div class="sec"><h3>Army</h3>${Object.keys(grp).length ? Object.entries(grp).map(([k, n]) => { const [t, l] = k.split("|"); return `<div class="irow ab"><img alt="" src="${spriteURL(t)}"><span><b>${n > 1 ? n + " × " : ""}${UNITS[t] ? UNITS[t].name : t}</b></span>${pips(+l, 3)}</div>`; }).join("") : `<p class="muted">No soldiers.</p>`}<p class="muted">${walls} wall${walls === 1 ? "" : "s"} · ${traps} trap${traps === 1 ? "" : "s"} placed</p></div>
  </div>`;
}
const GUIDE = [
  ["Welcome, m'lord", "Your friends have holed up in their castles and declared war! Each evening your armies all march out and fight at once. You don't need to steer the battle, all you need to do is prepare for it. You give the orders and your troops will see them out as best they can. Battle takes place daily at the agreed time, and the last castle standing wins the day.\n\nAfter each day you'll have a chance to replan your strategy, spend gold, upgrade your hero, forge alliances and break them. The war progresses with each daily siege, culminating in a final battle on day 7 to determine which of your friends is strongest!", "A war lasts seven days, and every day's battle adds points to the leaderboard."],
  ["Daily cycle", "Each day has two phases: planning and battle. The timer at the top of the screen always shows how long you have until orders lock.\n\nPlanning: you spend your gold, place your army on the map, upgrade your hero, buy items and then give your orders. Tap your Castle to recruit soldiers, and to buy items, upgrades and walls. Tap your Hero to level their abilities, and tap units to reposition them. Once that's done you give your orders in the War Council: who to attack, how to fight, who to ally with and who to betray. When you're happy, press Seal Orders to send them out to your generals. You can break the seal and change your mind until battle time, but after that your orders are final.\n\nAt battle time everything plays out by itself. Open the battle to see every banner, new alliances and betrayals, then watch the replay, along with a highlight reel of all the action.", "Your orders are secret. The only thing other players know about you is your setup from the day before."],
  ["Your hero", "Your hero is the heart of your army. At the start of a weekly war you choose one of five heroes on the hero selection screen, and they're your champion for the week, growing stronger with each daily battle. Warriors hold the line, Mages and Archers strike from a distance, Shamans heal and shock, and Rogues slip in to finish the wounded. You can change your mind until the first battle from the Hero button.\n\nHeroes gain experience as enemies die around them, but can gain no more than 3 levels in a single battle. Each level grants a skill point you can spend during the next day's planning phase, up to level 21. Every ability can reach rank 4, and your ultimate reaches rank 3 (unlocking at levels 5, 10 and 15). Any points left over go into Vigour, which adds 2% health and damage a rank. Heroes also upgrade an ability themselves mid-combat as they level.", "The \u2726 at the top shows how many unspent skill points you have."],
  ["Building an army", "Recruit soldiers at your castle, then place them on the glowing ground around your base. Select an existing unit and tap Move to reposition it, your hero included. Soldiers fight beside your hero, come to the aid of an ally who's been hit, and fall back to heal when they're hurt. Your castle also keeps one free guard at home.\n\nWalls are single blocks that you can turn to face either way, and you can build up to six. Line them up to make a barricade, or scatter them to make a maze. Traps catch the careless. Both are under Defences at your castle.", "Walls can be used to limit your attackers' paths."],
  ["Orders and attack strategy", "Open the War Council to give your army its orders. It has four tabs.\n\nStrategy: drives your army's overall direction when it isn't in a fight. First choose who to attack: your own ordered list (drag lords into place), or a rule such as the highest or lowest ranked lord, the lord one rank above or below you, the highest level hero, the weakest hero, the weakest castle, or the closest castle. Then choose whether to march on their hero or their castle, or just the nearest foe. Last, pick a stance: Aggressive fights on until nearly dead, Skirmish falls back to heal below 30% health, Cautious pulls back below 45%.\n\nCombat: the rules your soldiers follow once a skirmish breaks out. Add if-then commands, such as retreating your hero to the castle when it drops below 30% health, or sending units to help an ally who is attacked. Then set your combat reach (how close an enemy must be before your fighters join a fight) and, for your hero, melee soldiers, ranged soldiers and healers, what each should go for first: enemy heroes, melee, ranged, healers, siege weapons, any soldier or the weakest foe. Healers choose who to heal first. Raiders, rams and powder carts are fixed: they make for castles. Rams and carts cannot be stunned, rooted or slowed, and raiders only turn to fight a melee attacker.\n\nAlliances: mark each lord Hostile, Neutral or Offer an alliance, tick which lords you are open to hearing from, and set the smallest dowry you will accept. Lords you are already allied with show as Allied, and you can choose to keep, break or betray the pact.\n\nDeployment (in the Army sheet): five rows show where every soldier is: Deployed on the map, Reserve, and your three reinforcement waves. Drag a soldier from one row to another. Each wave is one free footman plus up to three soldiers. Training, selling and sending soldiers to a wave are on the Garrison tab. Each wave has a trigger (a set time, castle attacked or below half, your hero or all your soldiers die, an enemy hero dies, or any ultimate) and a purpose (default combat orders, march on the castle, hunt heroes, or fight the nearest enemies). Waves are at least 30 seconds apart, and one is forced out at each minute mark. Your field supply (beds) limits the soldiers you start on the map; extra soldiers wait in the garrison, up to nine.\n\nCouncil: a last look at your plan before you seal it.", "The arrows on the map show who your army will march on."],
  ["Gold and the shop", "You earn 225 gold after the first battle, and 30 more with each day of the week, and upgrading your castle raises your daily income. Unit, hero and castle kills also pay a reward. Extra gold is awarded for holding the centre, for bringing down a player in the top 3, and for sitting in the bottom third of the leaderboard. Gold can be spent at the shop in your castle to equip your hero. On days 2 and 5 a spinner offers three free items and you keep one. The top two lords get no spin, and the lord at the bottom of the board gets a tier better.", "Some items are passives that are always on, others trigger by themselves and then recharge during the battle."],
  ["The battleground", "The hill in the middle of the map is the battleground. Any hero standing there earns bonus experience, and extra gold for every kill made there. It's also where every army wants to be so they can level up fastest, so expect company.", "Nobody can build in the centre, but anyone can march on it."],
  ["Mercenary camp", "From day 4 of each week the mercenaries, drawn by all the bloodshed, offer their services to the highest bidder. Open the Camp bubble at the top of the map. Six groups are for hire, each with a minimum price.\n\nBids are sealed: nobody sees yours. Your bid is set aside from your gold while you plan, and only the winner pays, and pays their own bid. Ties are settled by lot. If nobody bids, the group stays put. You can hire several groups as long as you can afford them, and they do not count toward your siege engine limit.\n\nHired mercenaries fight one battle for you, on your side and alongside your allies, with no supply needed. After a group fights it is recharging for 2 days for everyone, so the camp is a shared prize. Remember to place your bid before sealing orders."],
  ["Friends and traitors", "Alliances are an active choice. In planning, open Allies, pick a lord and tap Invite, with an optional gold dowry. You can have 2 invitations open at a time, and drafts can be changed or withdrawn until planning ends.\n\nThe invited lord gets a pop-up in their next planning phase (after they watch the battle) and can Accept or Decline. You see Pending until they answer. If they accept, the dowry is paid and the alliance is announced to everyone at the start of the next battle.\n\nAllies win the day together if only allies remain, but at least two opposing sides must always stay in the fight, and an alliance holds at most 3 lords. A pact lasts from day to day until someone ends it. You can break a pact cleanly, or betray an ally at any point in the game: their keep is blown up for half its health at the moment you turn, and they will remember. A betrayer whose bomb goes off earns 3 points and a share of the victim's spoils. Alliances all end on day 7, when only one banner can win."],
  ["Ready?", "Choose your hero, design your castle's banner, and the map is yours to command. Tap ? at the top whenever you want to read this again, and \u265b to see the leaderboard.\n\nOn the first screen, Play takes you to your friends' war and Test is a private sandbox against bots where you can try out ideas.", "Good luck, m'lord."],
];
function titleSheet() {
  const live = isLive(), c = !!sheet.confirm, can = !!(LIVE.db && LIVE.uid), inGame = can && LIVE.config && LIVE.players && LIVE.players[LIVE.uid];
  if (sheet.tab === "test") return head(null, "Test mode", "A private sandbox against bots") + `<div class="body">
    <div class="menu3">
      <button class="btn wax big" data-act="testgo">▶ Continue<small>Practice game · day ${gameMode === "practice" ? DAY : practiceDay()} of 7</small></button>
      <button class="btn wood big" data-act="pvstart">✦ Preview a new player's first run<small>From opening the invite link: register → tutorial → hero → name, army colour, coat of arms → Day 1. A private sandbox with bot lords; your test game isn't touched.</small></button>
      <button class="btn ${c ? "wax" : ""} small" data-act="newgame">${c ? "Tap again: restart the test game" : "Restart the test game from day 1"}</button>
    </div>
    <div class="sec"><h3>Testing tools</h3><div class="row"><button class="btn small" data-act="testnext">Skip to the next day</button><button class="btn small" data-act="lab">Balance lab</button><button class="btn small" data-act="reset">Reset setup</button></div></div>
    <div class="row"><button class="btn small" data-act="open" data-v="title">← Back</button></div></div>`;
  return `<div class="splash-art" role="img" aria-label="Daily Siege: castles and armies around a hill at sunset"></div><div class="splash-menu">
    <div class="menu3">
      <button class="btn wax big" data-act="playgo">⚔ Play with friends<small>${lobbyOpen(LIVE.config) ? (inGame ? (LIVE.players[LIVE.uid].pending ? "Finish registering for the war" : "Muster hall · registration open") : "Registration is open. Join the war") : inGame ? "Friends game · day " + (live ? DAY : liveClock().dayNo) + " of 7" : LIVE.config ? "Join your friends' next war" : can ? "Host a war and invite friends" : "Daily siege with friends"}</small></button>
      <button class="btn wood big" data-act="testmenu">🧪 Test<small>Practice against bots</small></button>
      ${inGame ? `<button class="btn small" data-act="open" data-v="game">⚙ Game settings</button>` : ""}${typeof PWA !== "undefined" && PWA.canOffer() ? `<button class="btn small" data-act="pwainstall">📲 Install app</button>` : ""}<button class="btn small" data-act="open" data-v="patch">📜 Patch notes</button><button class="btn small" data-act="wizard">🧙 How to play (tour)</button><button class="btn small" data-act="open" data-v="guide">📖 Full rules</button>
    </div></div>`;
}
function guideSheet() {
  const pg = Math.max(0, Math.min(GUIDE.length - 1, sheet.pg || 0)), [t, p, tip] = GUIDE[pg];
  return head(null, "How to play", `Page ${pg + 1} of ${GUIDE.length}`) + `<div class="body"><h3>${esc(t)}</h3>${p.split("\n\n").map(x => `<p>${esc(x)}</p>`).join("")}<p class="tip">${esc(tip)}</p>
    <div class="dots">${GUIDE.map((_, i) => `<i class="${i === pg ? "on" : ""}"></i>`).join("")}</div>
    <div class="row"><button class="btn" data-act="gpage" data-v="-1" ${pg === 0 ? "disabled" : ""}>← Back</button>${pg < GUIDE.length - 1 ? `<button class="btn wood" data-act="gpage" data-v="1">Next →</button>` : `<button class="btn wax" data-act="gdone">${S.ob === 1 ? "Choose my hero →" : "Got it"}</button>`}<button class="btn small" data-act="open" data-v="spells">Spell book</button></div></div>`;
}
function spellsSheet() {
  return head(null, "Spell book", "Every ability and its recharge") + `<div class="body">${Object.entries(CLASSES).map(([ck, c]) => `<div class="sec"><h3>${c.name}</h3><div class="spellrow">${[...c.abilities.map(a => [a.key, a.name, a.desc]), ["ult", c.ult.name, c.ult.desc]].map(([k, n, d]) => `<div class="spell"><img alt="" src="${spellURL(ck + "_" + k, 64)}"><b>${esc(n)}</b><small>${PASSIVE[ck] === k ? "Passive" : (COOLDOWN[ck][k] * BAL.cd).toFixed(0) + "s recharge"}</small><span>${esc(d)}</span></div>`).join("")}</div></div>`).join("")}</div>`;
}

const ABIL_STATS = {
  warrior: { a1: (r, s) => [["Damage", `${ext([25, 35, 45], r) + Math.round(s.atk * .3)} to everyone nearby`], ["Radius", s.pick === "Wide Arc" ? "2.2 tiles" : "1.5 tiles"]],
    a2: r => [["Blocks", `${ext([40, 50, 60], r)}% of damage for 4s`]], a3: r => [["Allies' attack", `+${ext([20, 30, 40], r)}% for 6s`], ["Radius", "3 tiles"]],
    ult: r => [["Effect", `Can't die for ${ext([6, 7, 8], r)}s, heals 40%`], ["Blast", `${ext([260, 360, 460], r)} and a 2.5s stun nearby`], ["Fires", "Below 50% health or when swarmed. Once per fight"]] },
  mage: { a1: (r, s) => [["Damage", `${ext([105, 145, 190], r) + Math.round(s.atk)}`], ["Range", "4.5 tiles"]], a2: r => [["Damage", `${ext([40, 55, 70], r)} around you`], ["Slow", "40% for 3s"]],
    a3: () => [["Distance", "3 tiles"]], ult: r => [["Damage", `${ext([520, 700, 900], r)} in a 3-tile area, ${ext([320, 420, 520], r)} to castles`], ["Delay", "1.6s, then stuns 1.5s. Once per fight"]] },
  archer: { a1: (r, s) => [["Damage", `${ext([60, 85, 110], r) + Math.round(s.atk * .4)} along a line`], ["Length", "5.5 tiles"]], a2: r => [["Damage", `${ext([30, 42, 55], r)} in an area`], ["Radius", "1.5 tiles"]],
    a3: r => [["Dodge chance", `${ext([10, 18, 25], r)}%`]], ult: r => [["Damage", `${ext([70, 95, 125], r)} every 0.4s for 5.6s`], ["Radius", "3.4 tiles. Once per fight"]] },
  shaman: { a1: r => [["Healing", `${ext([8, 12, 16], r)} per second`], ["Lasts", "6s, 2.5-tile radius"]], a2: r => [["Damage", `${ext([65, 85, 100], r)}, 20% less per jump`], ["Jumps", `${ext([2, 3, 3], r)}`]],
    a3: r => [["Attack speed", `+${ext([25, 35, 45], r)}% for 8s`], ["Radius", "4 tiles"]], ult: r => [["Summons", `${r >= 3 ? 4 : 3} wolves, ${ext([420, 560, 700], r)} HP and ${ext([45, 60, 75], r)} attack`], ["Lasts", "45s. Once per fight"]] },
  rogue: { a1: (r, s) => [["Damage", `${ext([95, 135, 175], r) + Math.round(s.atk)}`], ["Bonus", "×1.5 if they're fighting someone else"]], a2: () => [["Effect", "Nearby enemies miss half their attacks"], ["Lasts", "3s"]],
    a3: r => [["Poison", `${ext([7, 10, 13], r)} damage per second for 4s`]], ult: r => [["Damage", `${ext([520, 700, 900], r)} to a hero (×1.6 below ${Math.round(ext([.5, .55, .6], r) * 100)}% health), ${ext([200, 280, 360], r)} to all nearby`], ["Range", "7 tiles. Once per fight"]] },
};
function champNow(gear) { const g = gear || S.gear, b = CHAMP[S.cls]; return { hp: Math.round(b.hp * (1 + .08 * (level() - 1)) * vigMul(S.ranks.a4)), atk: Math.round(b.atk * (1 + .06 * (level() - 1)) * vigMul(S.ranks.a4)) }; }
const abbr = n => (n.includes(" ") ? n.split(" ").map(w => w[0]).join("").slice(0, 2) : n.slice(0, 2));
function abilLines(k, r) {
  if (!r) return null;
  if (k === "a4") return [["Health", `+${Math.round(VIG_PER * 100 * r)}%`], ["Damage", `+${Math.round(VIG_PER * 100 * r)}%`]];
  const st = { ...champNow(), pick: S.picks[k] }, lines = ABIL_STATS[S.cls][k](r, st);
  if (PASSIVE[S.cls] !== k) lines.push(["Recharge", `${(COOLDOWN[S.cls][k] * BAL.cd * (1 - .1 * (r - 1)) * (S.gear.charm >= 2 ? .8 : 1)).toFixed(1)}s`]);
  return lines;
}

const PATCHES = [
  { v: "Items, gifts, fights and highlights", date: "14 Nov", fixes: [
    "Free item gifts: the reels now spin like a slot machine and keep spinning when the game updates behind them. Closing the gift no longer makes it pop straight back up: it waits behind a 🎁 button on the map until you take it. If your item slots are full, the choice of which item to swap comes first. A gift you never claimed is dropped when the week ends.",
    "The unit strip shows the wall's own pixel sprite when you pick a wall.",
    "Highlights reel: the camera sits one zoom step further out, and it now ends on the moment the last rival castle is destroyed instead of the winner's castle standing alone.",
  ], balance: [
    "These balance changes start with the battle of 14 Nov, and so do the hero and castle changes listed under 16 Nov below (heroes keep fighting, skills that hit castles, the stronger Meteor and magic against castles). Targeting, fair ties, no militia and 3-point castles still start on 16 Nov.",
    "Items are worth more. Stat items are twice as strong, and they stay your hero's: Whetstone +14% attack, Leather Jerkin +12% health, Swift Sandals +12% speed, Iron Buckler 8% less damage, Boots of Speed +20% speed, Gauntlets of Power +30% attack, Ring of Protection 16% less damage, Ring of Health +16% health, Vanguard +30% health, Shiva's Guard 12% less damage and Daedalus +30% attack. The area-buff items are twice as strong too, and they are the ones that reach your soldiers: Banner +24% damage, Standard 24% less damage taken, Mender's Charm heals 8 a second and Pipe of Insight blocks 50% of enemy hero abilities. Crystalys, Fang and the orbs are unchanged.",
    "Fights: a hurt hero or soldier only falls back to heal while it is actually being hit, and goes back to the fight at 60% health (was 80%). A unit already fighting an enemy in reach is not pulled away by a provoker, and answers provokers only within 4 tiles (was 6).",
  ], changes: [] },
  { v: "Catapult", date: "13 Nov", fixes: [], balance: [], changes: [
    "New tier 3 siege engine, the Catapult (220 gold). It crawls very slowly, sets up two tiles from an enemy castle, then hurls a boulder every few seconds. It cannot fight soldiers, so guard it.",
    "Siege engines (ram, powder cart and catapult) are now ordinary soldiers: no limit on how many you own, no recharge days, they can wait in the garrison, and they stay with you from day to day. We will scale them back if they prove too strong.",
    "Computer-played lords now follow the tier rules too: tier 1 on days 1 and 2, tier 2 on day 3 and tier 3 from day 4. That unlocks knights, snipers and siege engines for them, with one engine from day 4 and two from day 6 in place of ordinary soldiers.",
  ] },
  { v: "Raiders and Battle Mages move to tier 2", date: "13 Nov", fixes: [], balance: [
    "Raiders and Battle Mages now unlock at a Fortress (tier 2) instead of a Citadel.",
    "To balance the earlier access: Raider attack 34 to 30 and health 250 to 230. Battle Mage attack 30 to 27, health 180 to 170 and cost 150 to 140.",
  ], changes: [] },
  { v: "Pick your targets, fairer targeting, no militia, castles worth 3", date: "16 Nov", fixes: [
    "When two rival castles are equally near, armies, bots and the starting attack list no longer always pick whoever signed up first. A fair draw decides.",
    "Castles left standing on equal health at nightfall are ranked by siege damage, then kills, then a draw, not by sign-up order.",
  ], balance: [
    "Castles no longer send out militia. Your garrison waves do that job now.",
    "Taking a castle scores 3 points (was 2).",
    "The last day now counts 1.5 times, the same as days 5 and 6 (was double).",
    "Heroes keep fighting: a hero told to retreat comes back at 50% health (was 75%), and \"my castle is under attack\" only calls your hero home if it is within 6 tiles.",
    "Archers and mages only step back while they are actually being hit, not just because a melee enemy is near. A mage steps back for at most a second, then casts for at least two.",
    "Rogues take hits and keep attacking. They only slip away when outnumbered 3 to 1 close by and taking damage.",
    "Hero skills that blast an area now hit castles too: Executioner's Whirlwind, Chain Lightning, Thunderclap, Chrono-Storm, Fireball, Blizzard, Arrow Volley and Rain of Feathered Death (half strength on a castle). With no soldiers about, they can be aimed at a castle in range. Spirit Wolves can be called at a castle.",
    "Meteor Strike hits a castle much harder (700 before armour, was 400).",
    "Magic now does 60% against fortified castles and walls (was 35%), more than blades (50%) and arrows (35%). Battle Mages, mage and shaman heroes and healers all hit castles harder.",
    "New lords start with no orders, so your stance alone decides when your army falls back to heal. Any order you add still takes priority over the stance.",
  ], changes: [
    "Pick your targets: each day your attack list starts empty and you must pick one to three targets before you seal. A target can be a lord, or a role worked out during the battle: weakest castle, board leader, the lord just above me, nearest to my castle, or nearest to my army.",
    "Your army still fights any army it meets, and now also attacks any rival castle it passes on the way. Once your targets have fallen it goes for the lord just above you on the board (the leader goes for second place).",
    "If you don't seal new orders, yesterday's sealed targets are used.",
    "Walls and the central battleground are drawn as pixel art, the grass is back to its original look, and a forest lines the edge of the map.",
    "The Train button on a soldier opens its training page instead of training it straight away.",
    "Soldiers and your hero are moved with the Move button. Dragging them on the map is gone, so panning the map never moves a unit by mistake.",
    "Tap an item on the hero screen to see its details, sell it or open the shop. The shop bubble shows the full shop art.",
  ] },
  { v: "Shop bag, one-page shop and page help", date: "13 Nov", fixes: [], balance: [], changes: [
    "A bag of gold on the right edge of the map opens the shop. The Shop tab is gone from Base, and the Hero page has the same bag next to your items.",
    "The shop is one page: 12 items at a time, with the details and Buy button below, and your item slots and gold at the top.",
    "The unit strip under the map always shows something: your hero until you pick another unit. Health bars are the same width for every unit.",
    "Every page now has a small i in its top corner. Tap it for a short note on what the page is for.",
    "The hero page has a Stats tab (health, attack, speed and more). The red number on the Abilities tab shows unspent skill points.",
    "Pixel-art animations for every hero skill, with ground effects drawn beneath the units. The Avatar of War hero is drawn larger.",
    "A gold coin icon on every price, new Orb of Frost and Orb of Poison art, and the Rune of Homecoming has its own icon.",
    "Bots added to empty seats now get a spread of heroes instead of always the wizard. The unit strip shows move speed again.",
  ] },
  { v: "Free item spins on days 2 and 5", date: "13 Nov", fixes: [], balance: [], changes: [
    "On day 2 and day 5 every lord gets a spinner of three items and keeps one for free: tier 1 items on day 2, tier 2 on day 5.",
    "The top two lords on the board get no spin. The lord at the bottom gets items one tier higher.",
    "The three are fixed for you, so reloading never rerolls them. If your item slots are full you can replace an item or take 60 gold instead. Free items sell for half price like any other.",
  ] },
  { v: "Early game update: bigger income, cheap items", date: "12 Nov", fixes: [], balance: [
    "Base daily pay is now 225 gold after day 1 and grows by 30 each day, reaching 375 after day 6.",
    "Fortress now adds 70 gold a day (was 40) and pays for itself in about two days. Citadel brings the castle bonus to 130 a day (was 90).",
    ], changes: [
    "Five cheap starter items, 30 to 40 gold each: Whetstone, Leather Jerkin, Swift Sandals, Iron Buckler and Mending Herbs. A hero can now carry three items by day 2 and still afford an army.",
  ] },
  { v: "Rules update: fairer endings", date: "12 Nov", fixes: [
    "Orders you drafted but never sealed are now fought when the day locks, so a lord who set up but forgot to seal no longer fights with a lone hero.",
  ], balance: [
    "Castles that fall on the same instant are now ranked by the siege damage their army dealt, then hero kills, instead of by sign-up order.",
    "Alliances last until someone ends them, even if a castle fell in the battle. Keep, Break and Betray now appear for every pact.",
    "An alliance can hold at most 3 lords.",
    "A betrayer whose bomb goes off earns 3 points and a quarter of the victim's spoils for the day. The feud stays as the price.",
    "Castles no longer burn down on their own from 100 seconds: a castle only falls to an attack.",
    "Rams and powder carts can no longer be stunned or rooted. Raiders make for a castle and only turn to fight a melee attacker.",
    "Points count 1.5 times on days 5 and 6 and double on day 7.",
    "A lord whose castle falls keeps their hero and soldiers in the fight. They can no longer fall back, heal at the castle, teleport home or respawn, and their alliances end. Placing is still decided by when the castle fell.",
  ], changes: [
    "Reinforcement waves: every castle keeps three waves in its garrison, shown as three yellow bars above the castle that turn grey as each marches out. Drag soldiers into waves and set each wave's trigger and purpose on the new Deployment tab of the Army sheet. You can now own up to nine extra soldiers there, beyond your field supply.",
    "Combat tab: set what your hero, melee soldiers and ranged soldiers go for first, who your healers heal first, and how close an enemy must be before your fighters join a fight. New orders march on the enemy castle by default.",
    "After the day 7 battle, a war finale shows the podium and the war's prizes.",
  ] },
  { v: "Day 3 update, part 8", date: "10 Nov", fixes: [], balance: [
    "Ultimates take a small step back, starting with tonight's battle (10 Nov); earlier battles are unchanged: damage is 25% lower, and the area is smaller at ult rank 1 (70%), rank 2 (85%) and full size at rank 3.",
  ], changes: [
    "Hunt-first orders can now target enemy siege weapons (battering rams and powder carts).",
    "Battles look alive: every soldier and hero now has a walk cycle and wind-up and strike frames for their weapon, rams pull back and slam forward, and carts roll on turning wheels. Everyone now has a death animation: heroes and soldiers topple and a soul drifts up, rams splinter, carts leave smoke and debris, and wolves and totems dissolve.",
    "Every ranged unit now fires its own kind of shot: arrows arc through the air and stick, snipers fire a tracer with a muzzle flash, mages throw glowing orbs, shamans send spirit wisps, healers lob healing orbs and necromancers hurl spinning bones. Heroes' shots are bigger.",
  ] },
  { v: "Day 3 update, part 7", date: "10 Nov", fixes: [], balance: [
    "Ultimates are much stronger: damage up about 50% (Shaman wolves a little less). They still recharge in 1 day and are armed per battle in Orders.",
    "Six mercenary groups: Troll Warlord (200+), Orc Berserkers (180+), Centaur Archers (220+), Dark Elf Assassins (170+, hunt heroes), Ogre Breaker (260+, castle-only) and the Bone Crew (240+, necromancer with skeletons).",
  ], changes: [
    "New Mercenary Camp from day 4 each week: sealed bids, highest bidder hires the group for one battle, winner pays their own bid. A hired group then recharges for 2 days for everyone.",
    "The Alarm Bell is gone (any you owned are refunded). After a betrayal, the betrayed lord's units now always hunt the traitor's hero, unless they are already locked in a fight, and hit them 25% harder.",
    "Betrayal now leaves bad blood: the betrayer and the betrayed can never ally again that week, even through a shared ally, and deal 20% more damage to each other in every later battle. Hired mercenaries now glow gold in battle. A betrayal now plants a bomb: the keep flashes red for about two seconds before it explodes.",
    "All five ultimates have new effects: Last Stand rune and pillar of light, Meteor falling fireball with crater and embers, Rain of Arrows volleys, Spirit Wolves sigil and wisps, and Assassinate shadow trail with crossed cuts. Spirit Wolves are black pixel wolves with a glowing player-colour rim.",
    "The pre-battle screen now runs the mercenary auction: each group is shown in turn, every sealed bid is revealed from lowest to highest, then the winner is announced and the group flies to their castle.",
    "Siege engines (powder carts and rams) can no longer be slowed and barge through enemy soldiers, shoving them aside instead of being blocked. Powder carts now move at three-quarters of their old speed and are lit for a 3 second red flashing fuse before they blow. Defenders rush to destroy a cart once it is within 4 tiles of a friendly castle (siege units like rams and raiders keep to their orders unless set to guard). A destroyed cart still goes off.",
    "Test games: heroes now level up properly (at least 2 levels a day) and rival heroes keep pace. The Seal Orders screen warns about unspent skill points and unplaced soldiers.",
    "Traps that were not triggered stay in place for the next battle. Only traps that went off are used up.",
    "Hired mercenaries do not count toward the 2 siege engine limit. Sealing orders now has a Place mercenary bid button so it is not overlooked.",
  ] },
  { v: "Day 3 update, part 6", date: "10 Nov", fixes: [], balance: [
    "Knights now need a Citadel (tier 3). Clerics are back at tier 2.",
    "Bowmen buffed (150 health, 16 attack). Archer hero buffed, Warrior and Shaman heroes trimmed slightly, Rogue given a little more health and attack.",
    "Mage hero buffed: more health (410) and attack (28), and Fireball and its Explosion splash hit about 15% harder.",
  ], changes: [
    "New tier 3 soldiers: the Battle Mage (ranged, splashes half damage on enemies beside its target) and the Dwarven Sniper (very long range, slow heavy shots, weak against heavy armour).",
    "You can now set priorities against enemy mages and snipers.",
    "New tier 3 siege unit: the Battering Ram (240g). It only attacks castles, takes about 5 seconds to bring down a tier 1 castle, then rolls on to the next one. Very tough, slow, and ignores soldiers. Like the Powder Cart it needs 2 days to recharge after it fights.",
    "You can own at most 2 siege units (Powder Carts and Battering Rams combined). Keep Formation already lets your soldiers march together at the slowest soldier's pace until the first contact. Siege units never wait for them.",
  ] },
  { v: "Day 3 update, part 5", date: "10 Nov", fixes: [], balance: [
    "Training a soldier is stronger: each level adds 30% health and attack (was 15%), and costs half the soldier's price per level (was 60%).",
    "Weapon and armour upgrades now strengthen all your soldiers instead of your hero. Charms still help your hero.",
  ], changes: [
    "New tier 3 soldier, the Powder Cart. It crawls very slowly at a castle and explodes, flattening a tier 1 castle. The blast hurts every soldier nearby, friend or foe, and also goes off if the cart is destroyed. It can't be trained and needs 2 days to recharge after it fights.",
    "Seal Orders now has buttons to use your ultimate this battle (with its recharge note) and to choose your weekly ritual.",
  ] },
  { v: "Day 3 update, part 4", date: "10 Nov", fixes: ["Castle tab labels no longer clip, and the castle and supply tiles show their prices. The detail box is shorter."], balance: [], changes: [
    "Alliances are now invitations. Send up to 2 at a time during planning, with an optional dowry. The invited lord answers with Accept or Decline in a pop-up at their next planning phase.",
    "Senders see Pending until the next planning day has passed. Accepted alliances are announced to everyone at the start of the next battle. Practice rivals answer by their own terms.",
    "At least two opposing sides must be present in every match, and a team of allies can win together. You can betray an ally at any point in the game.",
    "The tour has three new steps with examples: sending an invitation, answering one, and betrayal.",
  ] },
  { v: "Day 3 update, part 3", date: "10 Nov", fixes: [], balance: [], changes: [
    "New top row: Day, Gold, Units, Ultimate, Leaderboard, Report, Options. Bottom bar now has Base, Army, Hero, Orders and Allies.",
    "Army tab uses a tappable unit grid with details in a box. Sheet headings match the buttons.",
    "The tour and How to play are now one guided walkthrough with Back/Next, numbered progress and your steward's sprite. Retake it any time from Options; full rules are still there too.",
  ] },
  { v: "Day 3 update, part 2", date: "9 Nov", fixes: [], balance: [
    "Ultimates must now be planned in the War Council (Rituals tab) and need a full day to recharge after being cast. Their effects and damage are unchanged.",
    "Dynamic bounties: the top three on the board carry gold of 15 + board position bonus (40/25/15) + 5 per hero level. Whoever lands the killing blow on their hero or keep also earns bonus XP.",
    "Last Stand Frenzy: when a castle falls to 20% health, all its surviving defenders gain +30% attack speed, +20% damage and become immune to stuns, roots and slows.",
    "Weekly blessing: once per war choose Blood Rite (army-wide 15% life-steal) or Ward of Arrows (no missile damage for 45s) for one battle.",
    "New Blade Trap (45 gold): fires a volley of blades across the lane when stepped on."],
  changes: [
    "Planning screen reorganised: Base & Armoury, Army Roster, War Council, and a sticky SEAL ORDERS bar with a live countdown to battle.",
    "Alliances are shown as green boxes grouping allied castles on the map and the muster screen, instead of connecting lines.",
    "Interactive tour with a steward walks new lords through the planning screen. Replay it any time from the title page.",
    "Victory ceremony with confetti and awards (MVP, Most Kills, Highest K/D, Bronze Spoils), also shown in the battle report.",
    "Betrayals freeze the replay with a full-screen BETRAYAL! banner, crossed daggers and a sting.",
    "Bounties show on rival castles and on the leaderboard."] },
  { v: "Day 3 update", date: "9 Nov", fixes: [
    "Battle results now always save, so the replay, stats and highlights appear after each battle, and the report is reachable afterwards.",
    "Late battle results are applied to your gold and soldiers once, even if you open the game hours after the fight.",
    "Replays now use the exact orders that were fought, so everyone sees the same battle the result came from.",
    "Fixed units and your hero duplicating on the map each time the game was reopened.",
    "Fixed the stacked scoreboard layout and the broken highlight replay."],
  balance: [
    "Ultimates are once per fight and much stronger: Meteor 520/700/900 in a wide blast with a stun, Rain of Arrows 14 heavy volleys, Spirit Wolves 3-4 tough wolves, Assassinate hits a hero then slashes everything around, Last Stand heals, stuns and blasts.",
    "Heroes respawn at full health after 10s + 2.5s per level (max 60s). Phoenix Feather halves the wait. Each hero can fall and return twice.",
    "Every hero gains at least 2 levels a day (max 3). Heroes who are behind earn up to double XP, and slaying a higher-level hero pays more gold.",
    "Daily income is now 200 gold and catch-up gold is bigger.",
    "Shop items cost more at higher tiers (x1, x1.4, x1.8).",
    "Soldier tiers: Footman and Bowman tier 1, Knight tier 2, Raider and Cleric tier 3 (they need a Castle, Fortress or Citadel). Soldiers train to Lv3 at any castle tier. Only weapon and armour upgrades are locked by castle tier."],
  changes: [
    "Supply up to 8, each level dearer than the last (60, 100, 160, 240, 340 gold).",
    "New item: the Divine Rapier (1000 gold). Doubles your hero's damage. It drops when its bearer falls, any hero can grab it, and whoever holds it at the end of the fight keeps it.",
    "The muster screen shows who carries the Rapier, the scoreboard shows who ended with it, and drops and pickups appear in the highlight reel.",
    "A respawn countdown now shows over the castle of a fallen hero.",
    "You can sell soldiers for 25% of everything you spent on them.",
    "Rival hero levels show beside their names on the map.",
    "Patch notes page added to the title screen."] },
];
function patchSheet() {
  const sec = (t, a) => a && a.length ? `<div class="sec"><h3>${t}</h3><ul class="notes">${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
  return head(null, "Patch notes", "What has changed in Daily Siege") + `<div class="body">${PATCHES.map(p => `<h3>${esc(p.v)} <small class="muted">· ${esc(p.date)}</small></h3>${sec("Bug fixes", p.fixes)}${sec("Balance", p.balance)}${sec("Game changes", p.changes)}`).join("")}
    <div class="row"><button class="btn small" data-act="open" data-v="title">← Back</button></div></div>`;
}

function goldSheet() {
  let under = 0; if (isLive()) { const ck = liveClock(), pts = standings(ck.week), ids = rosterFor(ck.week).map(p => p.uid), order = ids.slice().sort((a, b) => (pts[a] || 0) - (pts[b] || 0)), i = order.indexOf(LIVE.uid); under = i > -1 ? catchUpGold(ids.length, i) : 0; }
  const cb = CASTLE_INCOME[(S.castle || 1) - 1], row = (ic, l, v) => `<div class="stat"><b>${ic} ${v}</b><span>${l}</span></div>`;
  return head(null, "Treasury", "What you have and what tomorrow brings") + `<div class="body"><div class="stats">
    ${row("<i class='coin'></i>", "gold to spend now", avail())}${reserved() ? row("✉", "promised in alliance offers", reserved()) : ""}
    ${row("☀", "daily income", "+" + baseIncome(curDayNo()))}${cb ? row("🏰", "from your castle", "+" + cb) : ""}${under ? row("⚖", "catch-up gold", "+" + under) : ""}</div>
    <p class="muted">Spoils from kills in the battle and any alliance dowries are added after the fight. Higher-level and leading heroes carry bounties worth taking.</p>
    <div class="row"><button class="btn" data-act="close">Close</button></div></div>`;
}

function daySheet() {
  const ck = isLive() ? liveClock() : null, m = ck ? ck.minsToLock : null, left = m != null ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : countdown();
  return head(null, `Day ${DAY} of 7`, "The war runs for seven daily battles") + `<div class="body"><div class="stats"><div class="stat"><b>⏳ ${left}</b><span>until orders lock and the battle is fought${isLive() ? ` (${lockLabel(LIVE.config)})` : ""}</span></div><div class="stat"><b>${S.locked ? "✓ Sealed" : "Open"}</b><span>your orders</span></div></div>
    <p class="muted">Each day: spend gold, place your soldiers, give orders, then seal. The battle plays out when the timer ends and the replay is waiting for you the next time you open the game.</p>
    <div class="row"><button class="btn" data-act="close">Close</button></div></div>`;
}
