// Leaderboard, battle report, title, guide, spell book, damage types

const typeLine = ([a, r]) => `${ATK_TYPES[a].name} attack · ${ARMOUR_TYPES[r]} armour`;
// the attack and armour line with an i button that opens what each is strong and weak against (key: unique on the sheet)
const mulPct = m => Math.round(m * 100) + "%";
function typeInfo(types, key) {
  const [a, r] = types, open = sheet && sheet.tinfo === key, arm = { light: "Light", medium: "Medium", heavy: "Heavy", fortified: "Castles" };
  const deals = Object.keys(arm).map(k => [arm[k], TYPE_TABLE[a][k]]), takes = Object.keys(ATK_TYPES).filter(k => k !== "pure").map(k => [ATK_TYPES[k].name, TYPE_TABLE[k][r]]);
  const chip = ([n, m], good) => `<span class="tm ${m > 1.02 ? (good ? "g" : "b") : m < .98 ? (good ? "b" : "g") : "n"}">${esc(n)} <b>${mulPct(m)}</b></span>`;
  return `<div class="tinfo${open ? " open" : ""}"><button class="tline" data-act="tinfo" data-v="${key}" aria-expanded="${open}"><span>${esc(ATK_TYPES[a].name)} attack · ${esc(ARMOUR_TYPES[r])} armour</span><i class="ibtn" aria-hidden="true">i</i></button>
    ${open ? `<div class="tmx"><div><small>${esc(ATK_TYPES[a].name)} attack deals</small><div class="tms">${deals.map(x => chip(x, true)).join("")}</div><small class="muted">${esc(ATK_TYPES[a].note)}</small></div>
      <div><small>${esc(ARMOUR_TYPES[r])} armour takes</small><div class="tms">${takes.map(x => chip(x, false)).join("")}</div></div><small class="muted">Green is good for this unit, red is bad. 100% is normal damage.</small></div>` : ""}</div>`;
}
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
    <p class="muted bdfoot"><b class="bounty">♛</b> bounty on the top three · <b class="catch">◈</b> catch-up gold for the bottom 30%${catchUp ? ` (you get +${catchUp})` : ""}. Points: 10 for first place down to 0, +1 per hero slain, +${castlePts(isLive() ? fairV1For(liveClock().planDay) : true)} per castle taken, +1 if your hero survives the battle.</p></div>`;
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
      return `<${d.plans ? `button data-act="rinsp" data-v="${r.pid}"` : "div"} class="rrow${r.pid === me ? " me" : ""}${d.plans ? " tap" : ""}"><span class="rk">${medal}</span><i style="background:${isLive() ? teamColour(r.pid) : r.pid === "you" ? MY_COLOR : ((RIVALS.find(x => x.id === r.pid) || {}).color || "#b8322a")}"></i><span class="rn"><b>${esc(nm(r.pid))}</b>${r.cls ? `<small>${CLASSES[r.cls].name}</small>` : ""}</span><span class="pts">${r.points}<small>pts</small></span><span class="rc">${chips.map(c => `<em>${c}</em>`).join("")}</span></${d.plans ? "button" : "div"}>${d.plans ? heroKitTiles(d.plans.find(p => p.pid === r.pid), r.pid) : ""}`; }).join("")}
      <p class="muted legend">${d.plans ? "Tap a lord to inspect them, or a skill or item to read it · " : ""}⚔ hero kills · ☠ unit kills · ♜ castles</p></div>
    ${weekHTML(d, me, nm)}
    ${awardsHTML(d.awards, nm)}
    <div class="row"><button class="btn" data-act="rclose">Close</button></div></div>`;
}
// a lord's hero kit in small tiles (skills learned, then items); tap one to read it underneath
function heroKit(pl) {
  if (!pl || !pl.cls) return [];
  const out = [];
  if (pl.tree) { const t = cleanTree(pl.tree); TREE_BKEY.forEach((bk, bi) => (t[bk] || []).forEach((rk, i) => { if (!rk) return; const n = TREES[pl.cls][bi].nodes[i]; out.push({ k: "a" + bi + "." + i, img: spellURL(n.ic, 32), name: n.name, sub: `${i === 5 ? "Ultimate" : "Skill"} · rank ${rk}/${TREE_MAX[i]}`, desc: nodeDesc(pl.cls, bi, i, rk), ult: i === 5 }); })); }
  else { const C = CLASSES[pl.cls], rk = pl.ranks || {}; [...C.abilities.map(a => [a.key, a.name, a.desc]), ["ult", C.ult.name, C.ult.desc]].forEach(([k, n, ds]) => { if (rk[k]) out.push({ k: "a" + k, img: spellURL(pl.cls + "_" + k, 32), name: n, sub: `Rank ${rk[k]}`, desc: ds, ult: k === "ult" }); }); }
  (pl.items || []).forEach(k => { if (ITEMS[k]) out.push({ k: "i" + k, img: itemURL(k), name: ITEMS[k].name, sub: "Item", desc: itemDesc(k), item: true }); });
  return out;
}
function heroKitTiles(pl, pid) {
  const kit = heroKit(pl); if (!kit.length) return "";
  const [tp, tk] = String(sheet.rtip || "").split("|"), open = tp === pid ? kit.find(x => x.k === tk) : null;
  return `<div class="kit">${kit.map(x => `<button class="kt${x.ult ? " ult" : ""}${x.item ? " it" : ""}${open === x ? " on" : ""}" data-act="rtip" data-v="${esc(pid + "|" + x.k)}" aria-label="${esc(x.name)}"><img alt="" src="${x.img}"></button>`).join("")}</div>
    ${open ? `<div class="ktip"><img alt="" src="${open.img}"><div><b>${esc(open.name)}</b><small>${esc(open.sub)}</small><p>${esc(open.desc)}</p></div></div>` : ""}`;
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
    <div class="sec"><h3>Hero abilities</h3>${pl.tree ? heroKit(pl).filter(x => !x.item).map(x => `<div class="irow ab"><img alt="" src="${x.img}"><span><b>${esc(x.name)}</b><small class="muted">${esc(x.desc)}</small></span><small>${esc(x.sub)}</small></div>`).join("") || `<p class="muted">No skills learned.</p>` : abil.map(([k, n, ds, m]) => `<div class="irow ab">${art(k) ? `<img alt="" src="${art(k)}">` : ""}<span><b>${esc(n)}</b><small class="muted">${esc(ds)}</small></span>${pips(rk[k] || 0, m)}</div>`).join("")}${pl.tree ? "" : `<div class="irow ab"><span><b>Vigour</b><small class="muted">+2% health and damage per rank</small></span>${pips(rk.a4 || 0, 6)}</div>`}</div>
    <div class="sec"><h3>Items</h3>${(pl.items || []).length ? `<div class="islots tiny">${pl.items.map(k => ITEMS[k] ? `<div class="islot" title="${esc(ITEMS[k].name)}"><img alt="" src="${itemURL(k)}"><small>${esc(ITEMS[k].name)}</small></div>` : "").join("")}</div>` : `<p class="muted">No items.</p>`}</div>
    <div class="sec"><h3>Upgrades</h3>${gearRows}</div>
    <div class="sec"><h3>Army</h3>${Object.keys(grp).length ? Object.entries(grp).map(([k, n]) => { const [t, l] = k.split("|"); return `<div class="irow ab"><img alt="" src="${spriteURL(t)}"><span><b>${n > 1 ? n + " × " : ""}${UNITS[t] ? UNITS[t].name : t}</b></span>${pips(+l, 3)}</div>`; }).join("") : `<p class="muted">No soldiers.</p>`}<p class="muted">${walls} wall${walls === 1 ? "" : "s"} · ${traps} trap${traps === 1 ? "" : "s"} placed</p></div>
  </div>`;
}
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
      ${inGame ? `<button class="btn small" data-act="open" data-v="game">⚙ Game settings</button>` : ""}${window.DS && DS.user ? `<button class="btn small" data-act="open" data-v="wars">🏰 Your wars${(DS.wars || []).length > 1 ? ` (${DS.wars.length})` : ""}</button>` : ""}${typeof PWA !== "undefined" && PWA.canOffer() ? `<button class="btn small" data-act="pwainstall">📲 Install app</button>` : ""}<button class="btn small" data-act="open" data-v="patch">📜 Patch notes</button>${typeof LIVE === "object" && LIVE.config && (LIVE.config.hall || []).length ? `<button class="btn small" data-act="open" data-v="hall">🏆 Hall of fame</button>` : ""}<button class="btn small" data-act="wizard">🧙 How to play (tour)</button>
    </div></div>`;
}
function guideSheet() { // the tour's pages, read as a book (new lords see this before choosing a hero)
  const pg = Math.max(0, Math.min(WIZARD.length - 1, sheet.pg || 0)), [, t, p, mock] = WIZARD[pg];
  return head(null, "How to play", `Page ${pg + 1} of ${WIZARD.length}`) + `<div class="body"><h3>${esc(t)}</h3><p>${esc(p)}</p>${mock ? `<div class="wmock">${mock}</div>` : ""}
    <div class="dots">${WIZARD.map((_, i) => `<i class="${i === pg ? "on" : ""}"></i>`).join("")}</div>
    <div class="row"><button class="btn" data-act="gpage" data-v="-1" ${pg === 0 ? "disabled" : ""}>← Back</button>${pg < WIZARD.length - 1 ? `<button class="btn wood" data-act="gpage" data-v="1">Next →</button>` : `<button class="btn wax" data-act="gdone">${S && S.ob === 1 ? "Choose my hero →" : "Got it"}</button>`}${S && S.ob === 1 ? `<button class="btn small" data-act="gdone">Skip</button>` : ""}</div></div>`;
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
  { v: "Simpler orders", date: "18 Nov", fixes: [], balance: [
    "From the battle of 20 Nov, soldiers no longer fall back to heal on their own. Only the hero does, at the health its stance sets (aggressive 12%, skirmish 30%, cautious 45%).",
  ], changes: [
    "Army plan replaces the old heading: Conquest (hero, then army, then castle, then the next lord), Hero hunt (hero to hero; soldiers only when in the way), Siege (castle to castle, stopping only for what blocks it) or Army slayer (soldiers, then hero, then castle). The target list still decides which lord comes first. Holding the central hill first is now a tick box.",
    "Fall back when: one setting for the whole army. Never, castle under attack (3 or more enemies within 3 tiles), a siege engine within 5 tiles of your castle, your hero falls, or your hero falls back. The army goes home, fights what is there, and returns to its plan 4 seconds after the danger has passed.",
    "Battle commands (if-then rules) and each soldier's own orders (escort, attack a lord) are removed from the battle of 20 Nov. The castle guard stays, set from the Deploy tab. Battles before then replay exactly as they were fought.",
    "Bots now march to a plan that suits their build: warbands slay armies, champions hunt heroes, fortresses conquer and defend their castle, and mixed lords lay siege.",
  ] },
  { v: "Walls, sudden death and defences", date: "18 Nov", fixes: [
    "Soldiers no longer get stuck in tree clusters on the way to other bases. They look ahead and steer round the trees.",
    "The unit details strip under the map is laid out side by side again, with its buttons beside the stats.",
  ], balance: [
    "From the battle of 19 Nov, walls block everyone, including their owner's and allies' soldiers. They find a way round through the gaps you leave (your castle must always keep one open).",
    "From the battle of 19 Nov, bot lords spend like players do. Each bot has a build for the war: a warband (more and better-trained reinforcements, few defences), a fortress (up to 4 traps, 2 towers upgraded through the week and a wall line with a trapped gap, but fewer soldiers and items), a champion (more hero items) or a mix of all three.",
    "From the battle of 19 Nov, the sudden death ring is half the size and nobody can leave it. Everyone drawn into it is topped up to at least half health. A hero who falls in sudden death shows no respawn timer, because heroes don't come back once it starts.",
  ], changes: [
    "Defences: traps are bought here and then moved or sold from the map. Walls are built straight onto the map: tap Walls, then tap tile after tile, paying for each. Tower 1 and Tower 2 each have a slot to buy, upgrade or sell them.",
    "Walls and towers can't be moved. Sell one and build it again elsewhere. A wall can still be turned where it stands.",
    "Walls built next to each other turn to line up with each other, and joined walls are drawn as one cohesive wall, with proper corners at L-shaped bends.",
    "Tapping a fence, trap or tower on the map shows its health, damage or range in the strip, with Turn, Move, Upgrade and Sell buttons as they apply. Selling asks you to tap again to be sure.",
    "The details strip stays small and no longer opens over the map when tapped.",
    "Sudden death: the camera always swings to the arena, and the countdown sits in the middle of the screen.",
    "Traps on the map are drawn as pixel sprites, towers are castle stone, and new traps and towers have painted icons. The shop button is a little smaller.",
    "Skill descriptions lead with what the skill does and end with when it casts itself. Skill rank badges are grey instead of red.",
  ] },
  { v: "Permanent traps", date: "17 Nov", fixes: [], balance: [
    "Traps are now permanent. Buy one once and it stays where you put it, firing once in every battle. You can own up to 4, and sell one back for half its price.",
    "New prices: Spike Pit 60 gold, Snare 40, Blade Trap 90. Spike Pit damage 90 to 150, Blade Trap 60 to 90 each. Trap descriptions now show their damage.",
    "Walls are about 60% weaker so soldiers can break through them: Palisade 100, Timber 170, Stone 250 health.",
  ], changes: [
    "New Bomb Trap (110 gold): explodes for 100 damage to every enemy within 1.6 tiles of whoever steps on it. Good against clumps.",
    "New Sand Pit (80 gold): only siege engines sink in. A ram, catapult or powder cart is stuck for 6 seconds. Soldiers walk over it.",
    "New Guard Tower (150 gold, up to 2): a stationary defender with 270 health that shoots enemies within 3.5 tiles but never moves. Upgrade each one on its own: Arrow Tower (100 gold, needs a Fortress), then Arrow Tower III, Fire Tower, Bomb Tower, Magic Tower or Sniper Tower (150 gold, needs a Citadel). The Fire Tower is weaker against soldiers but does four times damage to siege engines. Towers are fragile: 270 to 480 health. Find it with the traps.",
  ] },
  { v: "Bigger fields", date: "17 Nov", fixes: [], balance: [
    "From wars starting on 18 Nov the map is 4 tiles wider and taller (21 by 21 for 8 lords), and each lord's field reaches further round the castle and forward up the road: 27 tiles with 8 lords, up from 18. The trees stay where they were; only tiles a tree trunk stands on are closed to building.",
    "Equal fields: every lord in a war gets the same number of tiles to build on (27 with 8 lords, 25 with 9 to 12). Castles round a ring don't land evenly on a square grid, so the bigger fields are trimmed to the smallest one, dropping the tiles furthest behind the castle first. The map, castles, roads and trees don't move.",
    "Up to 5 walls (was 6) and 4 traps a battle (no limit before).",
    "Battering rams, catapults and the Ogre Breaker batter down a wall in their way instead of sliding round it. Powder carts still go around.",
  ], changes: [
    "No full blockade: a wall that would close the last way from the middle of the map to your castle is refused, so walls can funnel attackers into traps but never seal a castle in.",
    "The Defences tab shows Traps set, x of 4.",
  ] },
  { v: "The end of a war", date: "17 Nov", fixes: [], balance: [], changes: [
    "When a war's seventh battle is fought, the war ends: the server writes its top three into the game's hall of fame and opens registration for the next war straight away. Every lord stays registered, keeping their hero and banner, with a fresh army.",
    "The host chooses in Game settings (or the Muster Hall) whether registration then waits for them to begin, or closes by itself 24 hours after the war.",
    "The war ceremony opens the first time you come back after a war: a podium for the top three with their heroes, the final standings with each day's points, war prizes (Kingslayer, Hero hunter, Butcher, Oathbreaker, Day winner, Best day, Survivor, Treasurer, Most improved) and each lord's week in detail.",
    "Highlights of the war plays the two biggest moments of each day, and the final castle falling, one day after another. You can also watch the war's final battle again.",
    "Seats are shuffled when registration closes: sign-up order still decides who gets a seat, but where each lord's castle stands round the map is a fresh draw every war (from wars starting on 18 Nov).",
    "The Muster Hall shows a card for the war that just ended, with the ceremony, the highlights and the hall of fame. The hall of fame is also in the main menu.",
  ] },
  { v: "Flat items and replay fixes", date: "16 Nov", fixes: [
    "Replays: following your hero and your keep works again (it had stopped since sudden death arrived), so the zoom buttons work while following, and when your lord is out the camera follows the fight instead of the whole field.",
    "The map no longer freezes after watching a replay. You can pan, zoom and select units again straight away.",
    "Victory screen: the winner's taunt now appears above their hero, not beside their name.",
  ], balance: [
    "From the battle of 17 Nov, hero items add flat amounts instead of percentages, so they help most early in the week: Whetstone +6 attack, Gauntlets and Daedalus +12, Leather Jerkin +100 health, Ring of Health +140 health and 10 health a second, Vanguard +260 health, Mending Herbs 5 health a second, Healing Salve heals 300.",
    "Swift Sandals +0.2 and Boots of Speed +0.35 tiles a second. Iron Buckler, Ring of Protection and Shiva's Guard now block 3, 6 and 5 damage from every normal hit. Elixir of Fury: 0.2 seconds faster between attacks.",
    "Lifesteal, crits, dodge, reflect, slows, splash and the area auras stay percentages. The Iron Standard's aura is now 18% less damage taken (was 24%).",
    "Survivor: from the battle of 17 Nov, a lord whose hero is still alive when the battle ends scores 1 more point, even if their castle has fallen. Placement still goes by castles: the battle ends when one castle (or one alliance) is left, and only lords with a castle standing go to the sudden death arena.",
  ], changes: [
    "Replays start two zoom steps further out, and the highlight reel two steps further out than before.",
    "Deploy: the field row starts with a Castle guard square. Put any soldier there (a sniper on the walls, a knight at the gate) and it stays home to defend your castle all battle. It is one of your 4 soldiers on the field; drag it back among the attackers to send it out.",
    "A column of small castles in each lord's colour runs down the side of every replay and highlight reel. A castle is crossed out the moment it falls, so you can follow the match without the whole map in view.",
  ] },
  { v: "Clearer planning screens", date: "16 Nov", fixes: [
    "Soldiers, walls and traps can no longer be placed on tiles covered by trees.",
    "Replay camera: zoom in now goes further, zoom works during sudden death, and the home button follows your hero again. The Auto button is now Follow hero.",
    "Hero items count no longer looks lopsided, and the targets list no longer breaks when a role is picked.",
  ], balance: [
    "Each active skill and the ultimate can now be told when to cast: on your top target, with 3 or more enemies near, below 30% health, when an ally or your castle is attacked. Left on automatic, a skill picks its own moment exactly as before.",
  ], changes: [
    "Orders › Strategy: you now pick three targets a day before you can seal (lords, roles or a mix), in three numbered slots, role chips with icons, and every lord listed by today's leaderboard with a Target button. The Keep formation button is gone: armies always keep formation.",
    "Seal Orders: a full checklist (soldiers placed, skill points, targets, contract, castle upgrade from day 2, alliance offers, pacts and betrayals, mercenary bid), each with a button to fix it. Targets with the leaderboard, the ultimate with its cast-when choice, the weekly ritual and Rehearse are all on the seal screen. Unused order seals are no longer counted.",
    "The wax seal is now a wax blob in your army colour, stamped with your initials.",
    "Hero: the learn and level up button is red, every active skill shows its recharge on a small clock, the Stats tab has an icon for each stat, and the Gear section is gone from Items (Armoury weapons and armour arm your soldiers).",
    "An i next to every attack and armour type opens what it is strong and weak against, for heroes, soldiers and mercenaries.",
    "Mercenary camp: the headliner in a wide card on top, the regular groups as tiles, and every fighter's health, attack, range and armour in the details. The bid buttons sit at the bottom.",
    "Base: the Waves tile has a war horn instead of the bed, traps have brighter painted icons and show their damage, wall details are stats, and you can build several walls at once and place them one after another. The Armoury tiles have painted icons.",
    "Train: Sell is on the left and Train, in red, on the right.",
    "Contracts are tap-to-take cards with painted emblems, sized to fit one screen. Today's twist sits under them and behind a small ! next to the camp button on the map.",
    "Rituals have painted icons. The Treasury has painted tiles and shows tomorrow's total.",
    "After the victory screen, the week's standings animate: today's points join each total, then the board reorders.",
    "The battle report shows each lord's learned skills and items as small tiles. Tap one to read it.",
    "The tray under the map only appears while something is waiting to be placed.",
    "The Test button and the Full rules page are gone from the title screen. How to play is now one guide: the tour, which new lords also read as pages before choosing a hero.",
  ] },
  { v: "Several wars at once", date: "15 Nov", fixes: [], balance: [], changes: [
    "You can now be in several wars at once, each with its own castle, army and gold. Open Your wars from the main menu to switch between them; the others carry on and fight on their own schedule.",
    "Join another war by opening its invite link, or by pasting the link into Your wars. Hosts can set up a new war from there while their others keep running.",
    "Battle alerts and reminders now open the war they are about, and alerts from different wars no longer replace each other.",
  ] },
  { v: "Reinforcement waves replace supply", date: "15 Nov", fixes: [], balance: [
    "From the week of 16 Nov, supply beds are gone. Every lord can field 4 soldiers on the map at the start of a battle.",
    "Reinforcement waves now have to be unlocked, in order: Wave 1 for 60 gold, Wave 2 for 100 and Wave 3 for 150. Each opens 3 slots for soldiers who march out later in the battle. Every wave still sends its free footman, unlocked or not.",
    "Beds you already bought are refunded in gold, and any wave already holding soldiers stays open for free.",
    "Computer-controlled lords and stand-in orders follow the same rules: at most 4 soldiers on the map, with Wave 1 opening on day 2, Wave 2 on day 4 and Wave 3 on day 6.",
  ], changes: [
    "Unlock waves on the Castle tab (the Waves tile) or straight from a locked wave on the Deploy tab.",
  ] },
  { v: "The new mercenary camp", date: "15 Nov", fixes: [], balance: [
    "New headline mercenary group for the last day of the week: the Troll War Host, the Troll Warlord leading two Orc Berserkers, from 400 gold.",
    "The Bone Crew is tougher: the Necromancer has 320 health and 30 attack (was 160 and 20), and the skeletons 170 health and 18 attack (were 60 and 11) with light armour.",
    "The Ogre Breaker is softer, as it often decided battles on its own: 600 health and 80 attack (was 650 and 110).",
    "Mercenaries cost more, starting at 250: Dark Elf Assassins 250, Orc Berserkers 260, Troll Warlord 280, Centaur Archers 290, Bone Crew 320, Ogre Breaker 340 and Troll War Host 400.",
  ], changes: [
    "From the 16 Nov battle, the mercenary camp has a headline group each day, getting stronger through the week: the Troll Warlord on day 4, the Bone Crew on day 5, the Ogre Breaker on day 6 and the Troll War Host on day 7. Each new headliner is announced when you first plan that day.",
    "The camp shows the headliner in a wide card at the top, three regular groups as tiles below it, and the chosen group's details and bid underneath. A headliner joins the regular tiles the day after it arrives, unless it is resting.",
    "You can now bid on one group a day; a new bid replaces your old one. No lord can win more than one group a day.",
  ] },
  { v: "Dearer soldiers, cheaper training", date: "15 Nov", fixes: [], balance: [
    "Training a soldier is cheaper: level 2 now costs 30% of the soldier's price (was 50%) and level 3 costs 40% (was 100%). A fully trained soldier now costs 1.7 times its price in all, less than buying two, and takes up only one place.",
    "Soldiers cost more to buy: Footman 100 (was 50), Bowman 120 (was 70), Raider and Cleric 140 (were 110 and 100), Battle Mage 180 (was 140), Knight 240 (was 120), Dwarven Sniper 220 (was 160). Every siege unit is now 300.",
    "Castle upgrades are cheaper: the Fortress costs 100 (was 150) and the Citadel 200 (was 300).",
    "Selling a trained soldier still returns a quarter of what you spent on it, so it is a little less than before.",
  ], changes: [] },
  { v: "Contracts move to Orders", date: "15 Nov", fixes: [
    "Replays that follow your hero start at the regular zoom again, not one step zoomed out.",
  ], balance: [], changes: [
    "The Today button is gone. Contracts, the twist and rehearsal now live in a Contracts tab under Orders.",
    "At the start of each planning phase the contracts for the next battle pop up until you take one. Close them and they wait under Orders › Contracts. The Orders button shows a mark while no contract is taken.",
  ] },
  { v: "Twists, contracts, rehearsal and battle reports", date: "16 Nov", fixes: [], balance: [
    "Contracts pay 2 points and 60 gold (easy), 3 points and 100 gold (hard) or 5 points and 150 gold (rival). Contract points are not multiplied on the late days of the week.",
    "Twists: Iron Walls +30% castle health; Siege Weather +30% soldier damage to castles; Blood Moon doubles gold for slaying heroes; Golden Hill pays 2.5 times the battleground's gold and experience; Market Day takes 25% off items; Gold Rush doubles contract gold; Day of Glory doubles contract points.",
  ], changes: [
    "From the battle of 16 Nov, every day from day 2 has a twist, drawn for each war week so none repeats. Day 1 has none. The Today panel shows today's twist and tomorrow's.",
    "Each lord is offered three contracts a day: one easy (Butcher, Stand Firm or Sapper), one hard (Headhunter, Raze, Deathless, Podium, Unbroken or King of the Hill) and one rival contract (Hunt, Sack, Revenge or Topple the Leader) naming another lord.",
    "Take a contract on the Today panel before you seal. It is saved with your orders. Bots take one too.",
    "Revenge names whoever took your castle, or slew your hero most often, in the last battle. Topple the Leader names the lord at the top of the board.",
    "The server checks contracts after the battle and adds the bonus to that day's points and spoils. The replay and every report show the official result.",
    "Rehearsal: in the friends game the Today panel can fight your current, unsealed orders against your rivals' orders from the last battle. It runs on your phone, as often as you like, and never counts.",
    "Every recap (and every rehearsal) has a Your battle section: share of damage by your hero and each soldier type, your best skill, damage to and from castles and who hit yours, damage your fences soaked up, when your waves marched out, time on the battleground, and up to three tips for tomorrow.",
  ] },
  { v: "Solid forest and tree blockades", date: "15 Nov", fixes: [], balance: [], changes: [
    "The forest around the map is now a solid wall in battles from 16 Nov: soldiers and heroes can no longer walk into the trees at the edge and corners, and slide round them instead.",
    "The old random trees and rocks scattered across the middle of the map are gone. In their place is a small blockade of trees between each pair of bases. Every blockade is the same, and the design is the same around every base whatever the number of lords.",
    "The forest edge curves in a little between each pair of bases. Your own deployment field is still kept clear. The trees are drawn this way for everyone straight away; only battles from 16 Nov treat them as solid.",
    "Lightning bolt icon added to every ultimate heading and button.",
  ] },
  { v: "Sudden death", date: "15 Nov", fixes: [], balance: [], changes: [
    "If two or more sides are still fighting at the 3 minute mark, the battle cuts to the centre arena with a SUDDEN DEATH announcement and a 5 second countdown.",
    "Every surviving hero and soldier is carried to the arena, one camp per lord around the ring. The board's 1st and 2nd face each other with the weakest lords beside them, and 3rd and 4th face each other. Siege engines and totems are removed, and nobody can fall back or be reinforced. A hero still waiting to respawn joins the fight at once, with health by how far through the wait it was (at least 25%).",
    "Castles are out of the fight. It is a fight to the death: the last side standing wins the day. If a minute passes with no winner, the side with the most health left wins.",
  ] },
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
  const cb = CASTLE_INCOME[(S.castle || 1) - 1], ct = S.castle || 1, row = (img, l, v, c = "") => `<div class="trs${c}"><img alt="" src="${img}"><b>${v}</b><span>${l}</span></div>`, tot = baseIncome(curDayNo()) + cb + under;
  return head(null, "Treasury", "What you have and what tomorrow brings") + `<div class="body"><div class="trgrid">
    ${row("icons/ui/gold.webp", "gold to spend now", avail(), " big")}${reserved() ? row("icons/ui/allies.webp", "promised in offers and bids", reserved()) : ""}
    ${row("icons/ui/day.webp", "daily pay", "+" + baseIncome(curDayNo()))}${cb ? row(`icons/ui/castle${ct}.webp`, `from your ${tierName(ct)}`, "+" + cb) : row("icons/ui/castle1.webp", "a Fortress adds +70 a day", "+0")}${under ? row("icons/ui/coin.webp", "catch-up gold", "+" + under) : ""}
    ${row("icons/skills/archer_b3_t3b.webp", "tomorrow before spoils", "+" + tot, " sum")}</div>
    <p class="muted">Spoils from kills in the battle and any alliance dowries are added after the fight. Higher-level and leading heroes carry bounties worth taking.</p>
    <div class="row"><button class="btn" data-act="close">Close</button></div></div>`;
}

function daySheet() {
  const ck = isLive() ? liveClock() : null, m = ck ? ck.minsToLock : null, left = m != null ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : countdown();
  return head(null, `Day ${DAY} of 7`, "The war runs for seven daily battles") + `<div class="body"><div class="stats"><div class="stat"><b>⏳ ${left}</b><span>until orders lock and the battle is fought${isLive() ? ` (${lockLabel(LIVE.config)})` : ""}</span></div><div class="stat"><b>${S.locked ? "✓ Sealed" : "Open"}</b><span>your orders</span></div></div>
    <p class="muted">Each day: spend gold, place your soldiers, give orders, then seal. The battle plays out when the timer ends and the replay is waiting for you the next time you open the game.</p>
    ${testSkipHTML()}
    <div class="row"><button class="btn" data-act="close">Close</button></div></div>`;
}
