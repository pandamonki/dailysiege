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
function boardSheet() {
  const rows = boardRows().sort((a, b) => b.pts - a.pts || b.lvl - a.lvl), n = rows.length, low = Math.max(1, Math.round(n * .3));
  const me = rows.findIndex(r => r.me), catchUp = isLive() && me > -1 ? catchUpGold(n, n - 1 - me) : 0;
  return head(null, "Leaderboard", `${isLive() ? "Week standings" : "Test standings"} · day ${DAY} of 7`) + `<div class="body bdbody">
    <div class="bdhead"><span></span><span></span><span>Lord</span><span>Lv</span><span>Pts</span></div>
    ${rows.map((r, i) => `<div class="bd2${r.me ? " me" : ""}"><span class="ord">${i + 1}</span><img class="bmini" alt="" src="${bannerURL(r.banner, r.color, 24, 32)}"><span class="bdn"><b>${esc(r.name)}</b>${r.cls ? `<small>${CLASSES[r.cls].name}</small>` : ""}${i < 3 && n > 3 ? `<i class="tag bty" title="Bounty on their head">♛</i>` : ""}${i >= n - low && n > 3 ? `<i class="tag cat" title="Earns catch-up gold">◈</i>` : ""}</span><span class="lv">${r.lvl}</span><span class="pts">${r.pts}${r.last != null ? `<small>+${r.last}</small>` : ""}</span></div>`).join("")}
    <p class="muted bdfoot"><b class="bounty">♛</b> bounty on the top three · <b class="catch">◈</b> catch-up gold for the bottom 30%${catchUp ? ` (you get +${catchUp})` : ""}. Points: 10 for first place down to 0, +1 per hero slain, +2 per castle taken.</p></div>`;
}
function latestBattleKey() { return Object.keys(LIVE.battles || {}).sort().pop() || null; }
let LASTP = null, reportBack = null;
function reportData(id) {
  if (id === "practice") return LASTP;
  const b = LIVE.battles && LIVE.battles[id]; return b ? { id, day: b.day, results: b.results || [], gain: b.gain || {}, xp: b.xp || {}, gold: b.gold || {}, team: !!b.team, week: b.week } : null;
}
function reportSheet(id) {
  id = id || (isLive() ? latestBattleKey() : (LASTP ? "practice" : null));
  const d = id && reportData(id);
  if (!d) return head(null, "Battle report", "Nothing yet") + `<div class="body"><p class="muted">${isLive() ? "No battle has been fought yet. The first one is at " + hourLabel(LIVE.config ? LIVE.config.lockHour : 20) + "." : "Fight a practice battle first (Orders → Seal Orders → Fight)."}</p><div class="row"><button class="btn wax" data-act="rclose">Close</button></div></div>`;
  const me = isLive() ? LIVE.uid : "you", mine = d.results.find(r => r.pid === me), ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
  const nm = pid => pid === me ? (isLive() ? MY_NAME : "You") : (isLive() ? nameOf(pid) : ((d.names && d.names[pid]) || (RIVALS.find(r => r.id === pid) || {}).name || "Someone"));
  const sorted = d.results.slice().sort((a, b) => a.place - b.place || b.points - a.points), gain = d.gain[me] || 0;
  return head(null, `Day ${d.day} report`, d.team ? "Allies won the Daily Siege together" : "The battle has been fought") + `<div class="body">
    ${mine ? `<div class="verdict"><b>${mine.place === 1 ? (d.team ? "Victory, together" : "Victory") : ord(mine.place) + " of " + d.results.length}</b><span class="muted">${mine.points} point${mine.points === 1 ? "" : "s"} · ${mine.kills || 0} kill${mine.kills === 1 ? "" : "s"}</span></div>
    <div class="stats"><div class="stat"><b>+${d.gold[me] != null ? d.gold[me] : (mine.gold || 0)}</b><span>gold from the field</span></div><div class="stat"><b>${gain ? "+" + gain : "0"}</b><span>hero level${gain === 1 ? "" : "s"} gained</span></div></div>` : `<p class="muted">You weren't in this battle.</p>`}
    <div class="menu3"><button class="btn wax big" data-act="rwatch" data-v="${id}">▶ Watch the battle</button><button class="btn wood big" data-act="rreelm" data-v="${id}">★ Highlight reel</button><button class="btn big${sheet.sb ? " on" : ""}" data-act="rsb">Scoreboard</button></div>
    ${sheet.sb ? `<div class="sec">${sorted.map(r => `<div class="place${r.pid === me ? " me" : ""}"><span class="ord">${ord(r.place)}</span><span><b>${esc(nm(r.pid))}</b>${r.cls ? ` · ${CLASSES[r.cls].name}` : ""}<br><span class="muted">${r.kills || 0} kills · ${r.castles || 0} castles${d.gain[r.pid] ? ` · +${d.gain[r.pid]} level` : ""}${d.gold[r.pid] != null ? ` · +${d.gold[r.pid]}g` : ""}</span></span><span class="pts">${r.points}<small>points</small></span></div>`).join("")}</div>` : ""}
    <div class="row"><button class="btn" data-act="rclose">Close</button></div></div>`;
}
const GUIDE = [
  ["Welcome, m'lord", "Your friends have holed up in their castles and declared war! Each evening your armies all march out and fight at once. You don't need to steer the battle, all you need to do is prepare for it. You give the orders and your troops will see them out as best they can. Battle takes place daily at the agreed time, and the last castle standing wins the day.\n\nAfter each day you'll have a chance to replan your strategy, spend gold, upgrade your hero, forge alliances and break them. The war progresses with each daily siege, culminating in a final battle on day 7 to determine which of your friends is strongest!", "A war lasts seven days, and every day's battle adds points to the leaderboard."],
  ["Daily cycle", "Each day has two phases: planning and battle. The timer at the top of the screen always shows how long you have until orders lock.\n\nPlanning: you spend your gold, place your army on the map, upgrade your hero, buy items and then give your orders. Tap your Castle to recruit soldiers, and to buy items, upgrades and walls. Tap your Hero to level their abilities, and tap units to reposition them. Once that's done you give your orders in the War Council: who to attack, how to fight, who to ally with and who to betray. When you're happy, press Seal Orders to send them out to your generals. You can break the seal and change your mind until battle time, but after that your orders are final.\n\nAt battle time everything plays out by itself. Open the battle to see every banner, new alliances and betrayals, then watch the replay, along with a highlight reel of all the action.", "Your orders are secret. The only thing other players know about you is your setup from the day before."],
  ["Your hero", "Your hero is the heart of your army. At the start of a weekly war you choose one of five heroes on the hero selection screen, and they're your champion for the week, growing stronger with each daily battle. Warriors hold the line, Mages and Archers strike from a distance, Shamans heal and shock, and Rogues slip in to finish the wounded. You can change your mind until the first battle from the Hero button.\n\nHeroes gain experience as enemies die around them, but can gain no more than 3 levels in a single battle. Each level grants a skill point you can spend during the next day's planning phase, up to level 21. Every ability can reach rank 4, and your ultimate reaches rank 3 (unlocking at levels 5, 10 and 15). Any points left over go into Vigour, which adds 2% health and damage a rank. Heroes also upgrade an ability themselves mid-combat as they level.", "The \u2726 at the top shows how many unspent skill points you have."],
  ["Building an army", "Recruit soldiers at your castle, then drop them on the glowing ground around your base. Select an existing unit and tap Move to reposition it, your hero included. Soldiers fight beside your hero, come to the aid of an ally who's been hit, and fall back to heal when they're hurt. Your castle also keeps one free guard at home.\n\nWalls are single blocks that you can turn to face either way, and you can build up to six. Line them up to make a barricade, or scatter them to make a maze. Traps catch the careless. Both are under Defences at your castle.", "Walls can be used to limit your attackers' paths."],
  ["Orders and attack strategy", "Open the War Council to give your army its orders. It has four tabs.\n\nStrategy: drives your army's overall direction when it isn't in a fight. First choose who to attack: your own ordered list (drag lords into place), or a rule such as the highest or lowest ranked lord, the lord one rank above or below you, the highest level hero, the weakest hero, the weakest castle, or the closest castle. Then choose whether to march on their hero or their castle, or just the nearest foe. Last, pick a stance: Aggressive fights on until nearly dead, Skirmish falls back to heal below 30% health, Cautious pulls back below 45%.\n\nCombat: the rules your soldiers follow once a skirmish breaks out. Add if-then commands, such as retreating your hero to the castle when it drops below 30% health, or sending units to help an ally who is attacked. Then rank up to five things your soldiers should hunt first, from enemy heroes to bowmen.\n\nAlliances: mark each lord Hostile, Neutral or Offer an alliance, tick which lords you are open to hearing from, and set the smallest dowry you will accept. Lords you are already allied with show as Allied, and you can choose to keep, break or betray the pact.\n\nCouncil: a last look at your plan before you seal it.", "The arrows on the map show who your army will march on."],
  ["Gold and the shop", "You earn 150 gold after each battle, and upgrading your castle raises your daily income. Unit, hero and castle kills also pay a reward. Extra gold is awarded for holding the centre, for bringing down a player in the top 3, and for sitting in the bottom third of the leaderboard. Gold can be spent at the shop in your castle to equip your hero.", "Some items are passives that are always on, others trigger by themselves and then recharge during the battle."],
  ["The battleground", "The hill in the middle of the map is the battleground. Any hero standing there earns bonus experience, and extra gold for every kill made there. It's also where every army wants to be so they can level up fastest, so expect company.", "Nobody can build in the centre, but anyone can march on it."],
  ["Friends and traitors", "Offer any lord an alliance from the Alliances tab and they may accept. The more gold you offer, the more likely they are to say yes. If two lords both offer each other alliances, the payments cancel out and it becomes a mutual alliance. Allies don't fight each other, and the pact carries into the next day unless one of you ends it.\n\nBefore each battle a muster screen shows every banner, every new alliance and every pact that was broken. After each battle you'll get a diplomacy summary of who offered you an alliance, who broke a pact with you, and who betrayed you.\n\nYou can also betray an ally mid-battle, and they can betray you, so be wary of who you trust. A betrayal needs your hero: when its trigger is met, your hero marches to the ally's base and sets it off on arrival, blowing up the keep and destroying half its health. If the hero falls on the way, the betrayal waits until it returns. If only allies are left standing at the end of the daily battle, they share the win.", "On day 7 every alliance ends, because there can only be one winner."],
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
    ult: r => [["Effect", `Can't die for ${ext([5, 6, 7], r)}s`], ["Fires", "Below 40% health"]] },
  mage: { a1: (r, s) => [["Damage", `${ext([90, 125, 165], r) + Math.round(s.atk)}`], ["Range", "4.5 tiles"]], a2: r => [["Damage", `${ext([40, 55, 70], r)} around you`], ["Slow", "40% for 3s"]],
    a3: () => [["Distance", "3 tiles"]], ult: r => [["Damage", `${ext([260, 340, 420], r)} in a 2-tile area, ${ext([200, 260, 320], r)} to castles`], ["Delay", "2s"]] },
  archer: { a1: (r, s) => [["Damage", `${ext([60, 85, 110], r) + Math.round(s.atk * .4)} along a line`], ["Length", "5.5 tiles"]], a2: r => [["Damage", `${ext([30, 42, 55], r)} in an area`], ["Radius", "1.5 tiles"]],
    a3: r => [["Dodge chance", `${ext([10, 18, 25], r)}%`]], ult: r => [["Damage", `${ext([20, 28, 36], r)} every half second for 5s`], ["Radius", "2.5 tiles"]] },
  shaman: { a1: r => [["Healing", `${ext([8, 12, 16], r)} per second`], ["Lasts", "6s, 2.5-tile radius"]], a2: r => [["Damage", `${ext([65, 85, 100], r)}, 20% less per jump`], ["Jumps", `${ext([2, 3, 3], r)}`]],
    a3: r => [["Attack speed", `+${ext([25, 35, 45], r)}% for 8s`], ["Radius", "4 tiles"]], ult: r => [["Summons", `${r >= 3 ? 3 : 2} wolves, ${ext([150, 200, 250], r)} HP and ${ext([15, 20, 25], r)} attack`], ["Lasts", "25s"]] },
  rogue: { a1: (r, s) => [["Damage", `${ext([95, 135, 175], r) + Math.round(s.atk)}`], ["Bonus", "×1.5 if they're fighting someone else"]], a2: () => [["Effect", "Nearby enemies miss half their attacks"], ["Lasts", "3s"]],
    a3: r => [["Poison", `${ext([7, 10, 13], r)} damage per second for 4s`]], ult: r => [["Damage", `${ext([320, 420, 520], r)} to a target below ${Math.round(ext([.35, .4, .45], r) * 100)}% health`], ["Range", "6 tiles"]] },
};
function champNow(gear) { const g = gear || S.gear, b = CHAMP[S.cls]; return { hp: Math.round(b.hp * (1 + .08 * (level() - 1)) * (1 + .15 * g.armour) * vigMul(S.ranks.a4)), atk: Math.round(b.atk * (1 + .06 * (level() - 1)) * (1 + .15 * g.weapon) * vigMul(S.ranks.a4)) }; }
const abbr = n => (n.includes(" ") ? n.split(" ").map(w => w[0]).join("").slice(0, 2) : n.slice(0, 2));
function abilLines(k, r) {
  if (!r) return null;
  if (k === "a4") return [["Health", `+${Math.round(VIG_PER * 100 * r)}%`], ["Damage", `+${Math.round(VIG_PER * 100 * r)}%`]];
  const st = { ...champNow(), pick: S.picks[k] }, lines = ABIL_STATS[S.cls][k](r, st);
  if (PASSIVE[S.cls] !== k) lines.push(["Recharge", `${(COOLDOWN[S.cls][k] * BAL.cd * (1 - .1 * (r - 1)) * (S.gear.charm >= 2 ? .8 : 1)).toFixed(1)}s`]);
  return lines;
}
