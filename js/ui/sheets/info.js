// Leaderboard, battle report, title, guide, spell book, damage types

const typeLine = ([a, r]) => `${ATK_TYPES[a].name} attack · ${ARMOUR_TYPES[r]} armour`;
// the attack and armour line with an i button that opens what each is strong and weak against (key: unique on the sheet)
const mulPct = m => Math.round(m * 100) + "%";
function typeInfo(types, key) {
  const [a, r] = types, open = sheet && sheet.tinfo === key, arm = { light: "Light", medium: "Medium", heavy: "Heavy", fortified: "Castles", ...(balV5Now() ? { hero: "Heroes" } : {}) };
  const deals = Object.keys(arm).map(k => [arm[k], TYPE_TABLE[a][k]]), takes = Object.keys(ATK_TYPES).filter(k => k !== "pure" && (k !== "hero" || balV5Now())).map(k => [ATK_TYPES[k].name, TYPE_TABLE[k][r]]);
  const chip = ([n, m], good) => `<span class="tm ${m > 1.02 ? (good ? "g" : "b") : m < .98 ? (good ? "b" : "g") : "n"}">${esc(n)} <b>${mulPct(m)}</b></span>`;
  return `<div class="tinfo${open ? " open" : ""}"><button class="tline" data-act="tinfo" data-v="${key}" aria-expanded="${open}"><span>${esc(ATK_TYPES[a].name)} attack · ${esc(ARMOUR_TYPES[r])} armour</span><i class="ibtn" aria-hidden="true">i</i></button>
    ${open ? `<div class="tmx"><div><small>${esc(ATK_TYPES[a].name)} attack deals</small><div class="tms">${deals.map(x => chip(x, true)).join("")}</div><small class="muted">${esc(ATK_TYPES[a].note)}</small></div>
      <div><small>${esc(ARMOUR_TYPES[r])} armour takes</small><div class="tms">${takes.map(x => chip(x, false)).join("")}</div></div><small class="muted">Green is good for this unit, red is bad. 100% is normal damage.</small></div>` : ""}</div>`;
}
function typesHTML() {
  const cell = v => `<td class="tm ${v > 1.05 ? "up" : v < .95 ? "down" : ""}">${Math.round(v * 100)}%</td>`;
  const HT = c => heroTypes(c, balV5Now()), who = (k) => [...Object.keys(CLASS_TYPES).filter(c => HT(c)[1] === k).map(c => [c]).map(([c]) => CLASSES[c].name), ...Object.entries(UNIT_TYPES).filter(([, t]) => t[1] === k).map(([u]) => UNITS[u].name), ...(k === "fortified" ? ["Castles"] : [])].join(", ");
  const uses = (k) => [...Object.keys(CLASS_TYPES).filter(c => HT(c)[0] === k).map(c => [c]).map(([c]) => CLASSES[c].name), ...Object.entries(UNIT_TYPES).filter(([, t]) => t[0] === k).map(([u]) => UNITS[u].name), ...(k === "pierce" ? ["Castle towers"] : []), ...(k === "pure" ? ["Traps"] : [])].join(", ");
  return `<p class="muted">Every attack has a type and every body has an armour class. The table shows how much damage each attack type deals to each armour class. ${balV5Now() ? "Every hero attacks with the Hero type and wears Hero armour, whatever its class." : "Heroes' abilities use their class's attack type."}</p>
  <div class="tbl"><table><thead><tr><th>Attack ↓ / Armour →</th>${Object.values(ARMOUR_TYPES).map(n => `<th>${n}</th>`).join("")}</tr></thead><tbody>
  ${Object.entries(TYPE_TABLE).map(([k, row]) => `<tr><td>${ATK_TYPES[k].name}</td>${Object.keys(ARMOUR_TYPES).map(r => cell(row[r])).join("")}</tr>`).join("")}</tbody></table></div>
  <div class="sec"><h3>Who uses what</h3>${Object.keys(ATK_TYPES).map(k => `<p><b>${ATK_TYPES[k].name}:</b> ${uses(k) || "–"}. <span class="muted">${ATK_TYPES[k].note}</span></p>`).join("")}
  ${Object.keys(ARMOUR_TYPES).map(k => `<p><b>${ARMOUR_TYPES[k]} armour:</b> ${who(k)}.</p>`).join("")}</div>
  <div class="sec"><h3>Two extra rules</h3><p>Heroes take ${Math.round((1 - HERO_GUARD) * 100)}% less damage from soldiers, so a crowd of bowmen can't melt a hero.</p><p>The Rogue deals ${Math.round((FINISH_BONUS - 1) * 100)}% more to anything below half health.</p></div>`;
}

// ----- leaderboard, battle report, guide, spell book -----
function boardRows() { // [{id,name,color,banner,cls,lvl,pts,last}]
  if (!isLive()) {
    const ids = ["you", ...RIVALS.map(r => r.id)], botLvl = Math.min(heroMaxLvl(heroV3Now(), lvlV2Now()), pracLvl(DAY)); // the same levels the practice battle uses
    return ids.map(id => { const rv = RIVALS.find(r => r.id === id); return { id, me: id === "you", name: rv ? rv.name : "You", color: rv ? rv.color : MY_COLOR, banner: rv ? rv.banner : S.banner, cls: rv ? (seeArmies() ? rv.cls : null) : S.cls, lvl: rv ? botLvl : level(), pts: PRACTICE_BOARD[id] || 0, last: null }; });
  }
  const ck = liveClock(), roster = rosterFor(ck.week), pts = standings(ck.week), lastKey = Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === ck.week).sort().pop(), lb = lastKey && LIVE.battles[lastKey];
  return roster.map((p, i) => { const pl = latestPlan(p, ck.planDay, true), hs = heroState(p.uid, ck.week, ck.planDay), st = p.state && p.state.week === ck.week ? p.state : null, lr = lb && (lb.results || []).find(r => r.pid === p.uid);
    return { id: p.uid, me: p.uid === LIVE.uid, name: nameOf(p.uid), color: teamColour(p.uid), banner: p.uid === LIVE.uid ? S.banner : (st && st.banner) || (pl && pl.banner), cls: (p.uid === LIVE.uid || ck.dayNo > 1) && st ? st.cls : null, lvl: hs.lvl, pts: pts[p.uid] || 0, last: lr ? lr.points : null }; });
}
let BOUNTY_CACHE = { k: null, m: {} };
function bountyMap() { // gold on the heads of the top three: base + board position + hero level x 5
  const k = gameMode + "|" + (isLive() ? Object.keys(LIVE.battles).length : DAY) + "|" + RIVALS.length;
  if (BOUNTY_CACHE.k !== k) { const rows = boardRows().sort((a, b) => b.pts - a.pts || b.lvl - a.lvl), n = rows.length, m = {}, rk = {}; const anyPts = rows.some(r => r.pts > 0); rows.forEach((r, i) => { if (i < 3 && n > 3 && anyPts) { m[r.id] = bountyGold(i + 1, r.lvl); rk[r.id] = i + 1; } }); BOUNTY_CACHE = { k, m, rk }; }
  return BOUNTY_CACHE.m;
}
const bountyRank = id => { bountyMap(); return BOUNTY_CACHE.rk[id] || 0; }; // 1, 2 or 3 for the lords with a bounty (gold, silver, bronze crown), else 0
function boardSheet() {
  const rows = boardRows().sort((a, b) => b.pts - a.pts || b.lvl - a.lvl), n = rows.length, low = Math.max(1, Math.round(n * .3));
  const me = rows.findIndex(r => r.me), catchUp = isLive() && me > -1 ? catchUpGold(n, n - 1 - me) : 0;
  return head(null, "Leaderboard", `${isLive() ? "Week standings" : "Practice standings"} · day ${DAY} of 7`) + `<div class="body bdbody">
    <div class="bdhead"><span></span><span></span><span>Lord</span><span>Lv</span><span>Pts</span></div>
    ${rows.map((r, i) => `<div class="bd2${r.me ? " me" : ""}"><span class="ord">${i + 1}</span><img class="bmini" alt="" src="${bannerURL(r.banner, r.color, 24, 32)}"><span class="bdn"><b>${esc(r.name)}</b>${r.cls ? `<small>${CLASSES[r.cls].name}</small>` : ""}${i < 3 && n > 3 ? `<i class="tag bty" title="Bounty on their head: base + board position + hero level x 5">♛ ${bountyMap()[r.id] || ""}g</i>` : ""}${i >= n - low && n > 3 ? `<i class="tag cat" title="Earns catch-up gold">◈</i>` : ""}</span><span class="lv">${r.lvl}</span><span class="pts">${r.pts}${r.last != null ? `<small>+${r.last}</small>` : ""}</span></div>`).join("")}
    <p class="muted bdfoot"><b class="bounty">♛</b> bounty on the top three · <b class="catch">◈</b> catch-up gold for the bottom 30%${catchUp ? ` (you get +${catchUp})` : ""}. Points: ${(isLive() ? placeV2For(liveClock().planDay) : true) ? `one per place, so last scores 1 and first scores one per lord, +${PLACE_WIN_BONUS} for winning` : "10 for first place down to 0"}, +1 per hero slain, +${castlePts(isLive() ? fairV1For(liveClock().planDay) : true)} per castle taken, +1 if your hero survives the battle.</p></div>`;
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
  return `<div class="daychips one">${ks.map(k => `<button class="chip${k === id ? " on" : ""}" data-act="rday" data-v="${k}">Day ${LIVE.battles[k].day}</button>`).join("")}</div>`;
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
    ${mine ? `<div class="rhead"><div class="rsum"><b>${mine.place === 1 ? (d.team ? "Victory, together" : "Victory") : ord(mine.place) + " of " + d.results.length}</b><span>${mine.points} pt${mine.points === 1 ? "" : "s"} · +${d.gold[me] != null ? d.gold[me] : (mine.gold || 0)}g${gain ? ` · +${gain} lvl` : ""}</span></div>` : `<div class="rhead"><p class="muted">You weren't in this battle.</p>`}<div class="rbtns"><button class="btn wax" data-act="rwatch" data-v="${id}">Watch</button><button class="btn wood" data-act="rreelm" data-v="${id}">Highlights</button><button class="btn small wide" data-act="rshare" data-v="${id}">Share the day</button></div></div>
    ${boardHTML(d, sorted, me, nm)}
    ${weekHTML(d, me, nm)}
    ${awardsHTML(d.awards, nm)}
    <div class="row"><button class="btn" data-act="rclose">Close</button></div></div>`;
}
// the scoreboard: a card per lord (medal, colour, hero sprite, name, points, then chips for heroes killed / deaths / assists,
// soldiers killed, castles taken, damage, levels and gold). Each lord's build (skills, then items) opens under their card.
// Battles from 20 Nov also carry hero deaths, assists and damage.
function boardHTML(d, sorted, me, nm) {
  const ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"), num = v => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v), has = sorted.some(r => r.dmg != null);
  const col = pid => isLive() ? teamColour(pid) : pid === "you" ? MY_COLOR : ((RIVALS.find(x => x.id === pid) || {}).color || "#b8322a");
  const open = sheet.rkit || {}, all = sorted.every(r => open[r.pid]);
  const card = r => { const medal = ["🥇", "🥈", "🥉"][r.place - 1] || ord(r.place), pl = d.plans && d.plans.find(p => p.pid === r.pid), kit = pl ? heroKit(pl) : [], ns = kit.filter(x => !x.item).length, ni = kit.length - ns;
    const chips = [r.deaths != null ? `⚔ ${r.kills || 0}/${r.deaths}/${r.assists || 0}` : `⚔ ${r.kills || 0}`, `☠ ${r.ukills || 0}`, `♜ ${r.castles || 0}`].concat(r.dmg != null ? [`💥 ${num(r.dmg)}`] : [], d.gain[r.pid] ? [`+${d.gain[r.pid]} lvl`] : [], d.gold[r.pid] != null ? [`+${d.gold[r.pid]}g`] : [], d.rapierEnd === r.pid ? ["Rapier"] : []);
    const tag = d.plans ? "button" : "div";
    return `<div class="rcard${open[r.pid] && kit.length ? " open" : ""}${r.pid === me ? " me" : ""}"><${tag}${d.plans ? ` data-act="rinsp" data-v="${r.pid}"` : ""} class="rrow hs${r.pid === me ? " me" : ""}${d.plans ? " tap" : ""}"><span class="rk">${medal}</span><i style="background:${col(r.pid)}"></i>${r.cls ? `<img class="rhero" alt="" src="${spriteURL("c-" + r.cls, col(r.pid))}">` : "<span></span>"}<span class="rn"><b>${esc(nm(r.pid))}</b>${r.cls ? `<small>${CLASSES[r.cls].name}</small>` : ""}</span><span class="pts">${r.points}<small>pts</small></span><span class="rc">${chips.map(c => `<em>${c}</em>`).join("")}</span></${tag}>
      ${kit.length ? `<button class="kitbtn${open[r.pid] ? " on" : ""}" data-act="rkit" data-v="${r.pid}" aria-expanded="${!!open[r.pid]}">${open[r.pid] ? "▴" : "▾"} Build</button>` : ""}
      ${open[r.pid] && kit.length ? `<div class="kitwrap"><small class="muted">${ns} skill${ns === 1 ? "" : "s"} · ${ni} item${ni === 1 ? "" : "s"}</small>${heroKitTiles(pl, r.pid)}</div>` : ""}</div>`; };
  return `<div class="sec tight">${d.plans ? `<div class="rtools"><button class="btn small" data-act="rkit" data-v="*">${all ? "Hide all builds" : "Show all builds"}</button></div>` : ""}${sorted.map(card).join("")}
    <p class="muted legend">${d.plans ? "Tap a lord to inspect them, or Build to see their skills and items · " : ""}⚔ heroes killed${has ? " / deaths / assists" : ""} · ☠ soldiers killed · ♜ castles${has ? " · 💥 damage dealt" : ""}</p></div>`;
}
// a lord's hero kit in small tiles (skills learned, then items); tap one to read it underneath
function heroKit(pl) {
  if (!pl || !pl.cls) return [];
  const out = [];
  if (pl.tree) { const t = cleanTree(pl.tree); if (t.base) { const bn = BASE_NODE[pl.cls]; out.push({ k: "a3.0", img: spellURL(bn.ic, 32), name: bn.name, sub: `Base skill · rank ${t.base}/${BASE_MAX}`, desc: nodeDesc(pl.cls, 3, 0, t.base), ult: false }); } TREE_BKEY.forEach((bk, bi) => (t[bk] || []).forEach((rk, i) => { if (!rk) return; const n = TREES[pl.cls][bi].nodes[i]; out.push({ k: "a" + bi + "." + i, img: spellURL(n.ic, 32), name: n.name, sub: `${i === 5 ? "Ultimate" : "Skill"} · rank ${rk}/${TREE_MAX[i]}`, desc: nodeDesc(pl.cls, bi, i, rk), ult: i === 5 }); })); }
  else { const C = CLASSES[pl.cls], rk = pl.ranks || {}; [...C.abilities.map(a => [a.key, a.name, a.desc]), ["ult", C.ult.name, C.ult.desc]].forEach(([k, n, ds]) => { if (rk[k]) out.push({ k: "a" + k, img: spellURL(pl.cls + "_" + k, 32), name: n, sub: `Rank ${rk[k]}`, desc: ds, ult: k === "ult" }); }); }
  (pl.items || []).forEach(k => { if (ITEMS[k]) out.push({ k: "i" + k, img: itemURL(k), name: ITEMS[k].name, sub: "Item", desc: itemDesc(k), item: true }); });
  return out;
}
// A lord's net worth: the gold their plan has put into soldiers (with training), hero items, castle tiers, gear, traps, towers and walls
function planWorth(pl) {
  if (!pl) return 0; let g = 0; const pcs = pl.pieces || [];
  pcs.forEach(pc => { if (pc.kind === "unit" && UNITS[pc.type]) { if (pc.merc) { g += pc.bid || 0; return; } g += UNITS[pc.type].cost; for (let l = 1; l < (pc.lvl || 1); l++) g += trainCost(pc.type, l); }
    else if (pc.kind === "trap") g += pc.type === "tower" ? towerSpent(pc.tk && UNITS[pc.tk] ? pc.tk : "tower") : ((TRAPS[pc.type] || {}).cost || 0);
    else if (pc.kind === "wall") g += WALL_COST; });
  (pl.items || []).forEach(k => { if (ITEMS[k]) g += itemCost(k); });
  for (let t = 1; t < (pl.castleTier || 1); t++) g += (CASTLE_TIERS[t] || {}).cost || 0;
  Object.entries(pl.gear || {}).forEach(([k, n]) => { for (let i = 0; i < (n || 0); i++) g += ((GEAR[k] || [])[i] || {}).cost || 0; });
  return Math.round(g);
}
// damage dealt split three ways (battles from 20 Nov record it): to heroes, to castles, and the rest (soldiers, summons, walls)
const dmgSplit = r => r && r.dmg != null ? { all: r.dmg, hero: r.dmgH || 0, castle: r.dmgC || 0, unit: Math.max(0, r.dmg - (r.dmgH || 0) - (r.dmgC || 0)) } : null;
const kNum = v => v >= 10000 ? Math.round(v / 1000) + "k" : v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(Math.round(v));
function worthStatsHTML(worth, dm) {
  return `<div class="wstats"><div><span>💰 Net worth</span><b>${worth.toLocaleString()}g</b></div>${dm ? `<div><span>⚔ Hero damage</span><b>${kNum(dm.hero)}</b></div><div><span>🗡 Unit damage</span><b>${kNum(dm.unit)}</b></div><div><span>🏰 Castle damage</span><b>${kNum(dm.castle)}</b></div>` : ""}</div>`;
}
// a lord's soldiers, grouped by type and level, and their upgrades (castle tier, gear, towers, traps, walls)
function armyListHTML(pl) {
  const pips = (n, m) => `<span class="pips sm">${Array.from({ length: m }, (_, i) => `<i class="pip${i < n ? " on" : ""}"></i>`).join("")}</span>`;
  const grp = {}; (pl.pieces || []).filter(pc => pc.kind === "unit" && UNITS[pc.type]).forEach(u => { const k = u.type + "|" + (u.lvl || 1); grp[k] = (grp[k] || 0) + 1; });
  return Object.keys(grp).length ? Object.entries(grp).map(([k, n]) => { const [t, l] = k.split("|"); return `<div class="irow ab"><img alt="" src="${spriteURL(t)}"><span><b>${n > 1 ? n + " × " : ""}${UNITS[t].name}</b></span>${pips(+l, 3)}</div>`; }).join("") : `<p class="muted">No soldiers.</p>`;
}
function upgradesListHTML(pl) {
  const pips = (n, m) => `<span class="pips sm">${Array.from({ length: m }, (_, i) => `<i class="pip${i < n ? " on" : ""}"></i>`).join("")}</span>`, gear = pl.gear || {}, pcs = pl.pieces || [];
  const towers = pcs.filter(pc => pc.kind === "trap" && pc.type === "tower").map(pc => UNITS[pc.tk] ? UNITS[pc.tk].name : TRAPS.tower.name), traps = pcs.filter(pc => pc.kind === "trap" && pc.type !== "tower").map(pc => (TRAPS[pc.type] || {}).name).filter(Boolean), walls = pcs.filter(pc => pc.kind === "wall").length;
  return `<div class="irow"><span>Castle</span><b>${esc(tierName(pl.castleTier || 1))}</b>${pips(pl.castleTier || 1, 3)}</div>`
    + GEAR_SLOTS.map(([k, l]) => `<div class="irow"><span>${l}</span><b>${gear[k] ? esc(GEAR[k][gear[k] - 1].name) : "None"}</b>${pips(gear[k] || 0, 3)}</div>`).join("")
    + `<div class="irow"><span>Towers</span><b>${towers.length ? towers.map(esc).join(", ") : "None"}</b></div><div class="irow"><span>Traps</span><b>${traps.length ? traps.map(esc).join(", ") : "None"}</b></div><div class="irow"><span>Walls</span><b>${walls}</b></div>`;
}
function heroKitTiles(pl, pid) {
  const kit = heroKit(pl); if (!kit.length) return "";
  const [tp, tk] = String(sheet.rtip || "").split("|"), open = tp === pid ? kit.find(x => x.k === tk) : null;
  const tiles = L => L.map(x => `<button class="kt${x.ult ? " ult" : ""}${x.item ? " it" : ""}${open === x ? " on" : ""}" data-act="rtip" data-v="${esc(pid + "|" + x.k)}" aria-label="${esc(x.name)}"><img alt="" src="${x.img}"></button>`).join("");
  return `<div class="kit">${tiles(kit.filter(x => !x.item))}</div>${kit.some(x => x.item) ? `<div class="kit">${tiles(kit.filter(x => x.item))}</div>` : ""}
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
    <div class="sec"><h3>This battle</h3>${worthStatsHTML(planWorth(pl), dmgSplit(d.results.find(r => r.pid === pid)))}</div>
    <div class="sec"><h3>Hero abilities</h3>${pl.tree ? heroKit(pl).filter(x => !x.item).map(x => `<div class="irow ab"><img alt="" src="${x.img}"><span><b>${esc(x.name)}</b><small class="muted">${esc(x.desc)}</small></span><small>${esc(x.sub)}</small></div>`).join("") || `<p class="muted">No skills learned.</p>` : abil.map(([k, n, ds, m]) => `<div class="irow ab">${art(k) ? `<img alt="" src="${art(k)}">` : ""}<span><b>${esc(n)}</b><small class="muted">${esc(ds)}</small></span>${pips(rk[k] || 0, m)}</div>`).join("")}${pl.tree ? "" : `<div class="irow ab"><span><b>Vigour</b><small class="muted">+2% health and damage per rank</small></span>${pips(rk.a4 || 0, 6)}</div>`}</div>
    <div class="sec"><h3>Items</h3>${(pl.items || []).length ? `<div class="islots tiny">${pl.items.map(k => ITEMS[k] ? `<div class="islot" title="${esc(ITEMS[k].name)}"><img alt="" src="${itemURL(k)}"><small>${esc(ITEMS[k].name)}</small></div>` : "").join("")}</div>` : `<p class="muted">No items.</p>`}</div>
    <div class="sec"><h3>Upgrades</h3>${pl.pieces && pl.pieces.some(pc => pc.kind === "trap") || !def.walls && !def.tower ? upgradesListHTML(pl) : gearRows}</div>
    <div class="sec"><h3>Army</h3>${Object.keys(grp).length ? Object.entries(grp).map(([k, n]) => { const [t, l] = k.split("|"); return `<div class="irow ab"><img alt="" src="${spriteURL(t)}"><span><b>${n > 1 ? n + " × " : ""}${UNITS[t] ? UNITS[t].name : t}</b></span>${pips(+l, 3)}</div>`; }).join("") : `<p class="muted">No soldiers.</p>`}<p class="muted">${walls} wall${walls === 1 ? "" : "s"} · ${traps} trap${traps === 1 ? "" : "s"} placed</p></div>
  </div>`;
}
function titleSheet() {
  const live = isLive(), c = !!sheet.confirm, can = !!(LIVE.db && LIVE.uid), inGame = can && LIVE.config && LIVE.players && LIVE.players[LIVE.uid];
  if (sheet.tab === "test") return head(null, "Test mode", "A private sandbox against bots") + `<div class="body">
    <div class="menu3">
      <button class="btn wax big" data-act="testgo">Continue<small>Practice game · day ${gameMode === "practice" ? DAY : practiceDay()} of 7</small></button>
      <button class="btn wood big" data-act="pvstart">Preview a new player's first run<small>From opening the invite link: register → tutorial → hero → name, army colour, coat of arms → Day 1. A private sandbox with bot lords; your test game isn't touched.</small></button>
      <button class="btn ${c ? "wax" : ""} small" data-act="newgame">${c ? "Tap again: restart the test game" : "Restart the test game from day 1"}</button>
    </div>
    <div class="sec"><h3>Testing tools</h3><div class="row"><button class="btn small" data-act="testnext">Skip to the next day</button><button class="btn small" data-act="lab">Balance lab</button><button class="btn small" data-act="reset">Reset setup</button></div></div>
    <div class="row"><button class="btn small" data-act="open" data-v="title">← Back</button></div></div>`;
  return `<div class="splash-art" role="img" aria-label="Daily Siege: castles and armies around a hill at sunset"></div><div class="splash-menu">
    <div class="menu3">
      <button class="btn wax big" data-act="playgo">Play with friends<small>${lobbyOpen(LIVE.config) ? (inGame ? (LIVE.players[LIVE.uid].pending ? "Finish registering for the war" : "Muster hall · registration open") : "Registration is open. Join the war") : inGame ? "Friends game · day " + (live ? DAY : liveClock().dayNo) + " of 7" : LIVE.config ? "Join your friends' next war" : can ? "Host a war and invite friends" : "Host a war or join one"}</small></button>
      ${inGame ? `<button class="btn small" data-act="open" data-v="game">Game settings</button>` : ""}${window.DS && DS.user ? `<button class="btn small" data-act="open" data-v="wars">Your wars${(DS.wars || []).length > 1 ? ` (${DS.wars.length})` : ""}</button>` : ""}${typeof PWA !== "undefined" && PWA.canOffer() ? `<button class="btn small" data-act="pwainstall">Install app</button>` : ""}${alertsMenuButton()}<button class="btn small" data-act="open" data-v="patch">Patch notes</button>${typeof LIVE === "object" && LIVE.config && (LIVE.config.hall || []).length ? `<button class="btn small" data-act="open" data-v="hall">🏆 Hall of fame</button>` : ""}<button class="btn small" data-act="wizard">How to play (tour)</button>
    </div></div>`;
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
  { v: "v1.28: base skills", date: "26 Nov", fixes: [], balance: [], changes: [
    "Every hero has a base skill (Ground Slam, Healing Wave, Shadow Step, Teleport, Piercing Shot): 3 ranks, and one point opens the three trees.",
    "The ultimate needs hero level 12 and ten points in its tree. One ultimate per hero, as before.",
    "Mage: Blink & Disrupt is now Disrupt (silence only); the teleport is the base skill.",
    "The \"Cast when\" choice is gone: every skill casts as soon as its own condition holds and it has recharged.",
  ] },
  { v: "v1.27: the new rules in every war", date: "26 Nov", fixes: [], balance: [], changes: [
    "From the 26 Nov battle, real wars use the practice rules: army zones, Front plans and flanks, army temper, three carried-over targets, fixed battle timing, stronger talents and items, rivals that answer their attackers, and mercenaries that arrive 10 seconds in.",
    "Wars use the roomier map.",
  ] },
  { v: "v1.26: practice changes", date: "26 Nov", fixes: ["Practice no longer favours some seats with the new battle timing."], balance: [], changes: [
    "Practice: up to three targets in order, kept from day to day and confirmed each day; roomier maps; talents 25% and item bonuses 15% stronger.",
    "Practice: rivals answer yesterday's attacker; mercenaries arrive 10 seconds in with a MERC tag; the Rogue follows your Combat settings like every hero.",
    "Real wars keep the current rules until a start date is chosen.",
  ] },
  { v: "v1.25: army zones (practice)", date: "25 Nov", fixes: [], balance: [], changes: [
    "Practice only for now: where you place a soldier sets its job (Guard, Front, left or right flank); one #1 target; Front plans Assault, Siege, Hero hunt and Hold the hill; flanks Screen or Raid; an army temper replaces stance and fall-back.",
    "Practice battles no longer roll each soldier's opening timing, so the same orders give the same battle. Holding the hill longest scores 2 points.",
    "Real wars keep the current rules until a start date is chosen.",
  ] },
  { v: "v1.24: drawn icons", date: "25 Nov", fixes: ["After a host deletes a war, closing a screen no longer shows an old practice game."], balance: [], changes: [
    "Emoji across the game are replaced with icons drawn in the game's own style: medals, prizes, stats and buttons.",
    "The shared battle text is plain words, without emoji.",
  ] },
  { v: "v1.23: share the day", date: "24 Nov", fixes: [], balance: [], changes: [
    "The battle report has a Share the day button: a picture and a few lines about the day's battle to send to your group chat.",
  ] },
  { v: "v1.22: betray the whole alliance", date: "24 Nov", fixes: [], balance: [], changes: [
    "From the 26 Nov battle, with two or more allies you can betray them all at once: bombs go off in every allied keep together.",
    "The betrayal time is picked from time slots (0:00 to 2:30 into the battle) or conditions, like their army being gone.",
  ] },
  { v: "v1.21: disbanding and crests", date: "24 Nov", fixes: [], balance: [], changes: [
    "From the 25 Nov battle, a disbanded alliance still fights together that night and ends from the next battle.",
    "Each alliance has a crest over its castles and heroes, and betrayals get their own moment in the replay.",
  ] },
  { v: "v1.20: a calmer start", date: "23 Nov", fixes: [], balance: [], changes: [
    "The Mercenary Camp opens by itself only on day 4, and bounties start after day 1.",
  ] },
  { v: "v1.19: the crowning and faster heroes", date: "20 Nov", fixes: [], balance: [
    "From the 23 Nov battle, heroes gain 3 to 4 levels a battle, up to level 25.",
  ], changes: [
    "A war now ends with a crowning ceremony for the top three.",
    "From the 23 Nov battle, day 7 alliances hold until only one is left, then break and fight it out.",
  ] },
  { v: "v1.18: hero rebalance", date: "20 Nov", fixes: [], balance: [
    "Every hero rebalanced, with its own damage and armour type. Resting at home heals; regeneration items are weaker.",
    "Reinforcement waves go out 20 seconds apart. Killing a lord through betrayal pays triple castle points.",
  ], changes: [
    "You can no longer target your own allies.",
  ] },
  { v: "v1.17: install and alerts", date: "20 Nov", fixes: [], balance: [], changes: [
    "Install the game in one step, and get an alert when the battle has been fought.",
  ] },
  { v: "v1.14 to v1.16: reinforcement waves", date: "20 Nov", fixes: [], balance: [], changes: [
    "Each wave has its own deadline (0:45, 1:30, 2:15) and can rush out early when enemies reach your castle.",
    "When your castle drops below 75%, 50% and 25% health, the next wave rushes out to defend it.",
  ] },
  { v: "v1.13: placement points", date: "20 Nov", fixes: [], balance: [], changes: [
    "One point per place (last scores 1), plus 2 for winning.",
    "The lords in a war are locked when registration closes.",
  ] },
  { v: "v1.12: alliances rebuilt", date: "19 Nov", fixes: [], balance: [], changes: [
    "Alliances are groups that every member agrees to. Winning allies share the top places.",
    "The last lord standing outside every alliance becomes the lone wolf, with stronger army and castle.",
  ] },
  { v: "v1.11: How to play", date: "19 Nov", fixes: [], balance: [], changes: [
    "A new How to play guide, in chapters with pictures.",
  ] },
  { v: "v1.10: item shake-up", date: "18 Nov", fixes: [], balance: [
    "Weak items made worth buying, and healing items toned down.",
  ], changes: [] },
  { v: "v1.9: skills and towers", date: "18 Nov", fixes: [], balance: [
    "Every skill point now adds an even step.",
  ], changes: [
    "Towers can be upgraded and compared before you buy. The battle report shows kills, deaths and damage.",
  ] },
  { v: "v1.8: simpler orders", date: "18 Nov", fixes: [], balance: [], changes: [
    "Orders are now an army plan, one fall-back condition and a hero stance.",
  ] },
  { v: "v1.6 and v1.7: walls, traps and sudden death", date: "18 Nov", fixes: [], balance: [], changes: [
    "Walls block everyone, traps stay where you put them, and there are new traps and towers.",
    "Sudden death closes the fight into a central arena.",
  ] },
  { v: "v1.5: the end of a war", date: "17 Nov", fixes: [], balance: [], changes: [
    "A war-end ceremony, a Muster Hall between wars, a castle guard and a survivor bonus.",
  ] },
  { v: "v1.4: fewer, better soldiers", date: "15 Nov", fixes: [], balance: [], changes: [
    "Four soldiers start on the map, and more join in waves you buy.",
    "A new mercenary every day, and you can play several wars at once.",
  ] },
  { v: "v1.3: twists and contracts", date: "16 Nov", fixes: [], balance: [], changes: [
    "A twist every day, daily contracts for bonus points and gold, and rehearsals before you seal.",
  ] },
  { v: "v1.1 and v1.2: targets and items", date: "14 Nov", fixes: [], balance: [], changes: [
    "Pick up to three targets a day. Castles are worth 3 points. Items matter more, with a free gift.",
  ] },
  { v: "v1.0: play with friends", date: "12 Nov", fixes: [], balance: [], changes: [
    "Online wars with friends, bot lords, hero skill trees and reinforcement waves.",
  ] },
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
    ${row("icons/ui/day.webp", "daily pay", "+" + baseIncome(curDayNo()))}${cb ? row(`icons/ui/castle${ct}.webp`, `from your ${tierName(ct)}`, "+" + cb) : row("icons/ui/castle1.webp", `from your castle. A Fortress pays +${CASTLE_INCOME[1]} a day`, "+0")}${under ? row("icons/ui/coin.webp", "catch-up gold", "+" + under) : ""}
    ${row("icons/skills/archer_b3_t3b.webp", "tomorrow before spoils", "+" + tot, " sum")}</div>
    <p class="muted">Spoils from kills in the battle and any alliance dowries are added after the fight. Higher-level and leading heroes carry bounties worth taking.</p>
    <div class="row"><button class="btn" data-act="close">Close</button></div></div>`;
}

function daySheet() {
  const ck = isLive() ? liveClock() : null, m = ck ? ck.minsToLock : null, left = m != null ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : countdown();
  return head(null, `Day ${DAY} of 7`, "The war runs for seven daily battles") + `<div class="body"><div class="stats"><div class="stat"><b>⏳ ${left}</b><span>until orders lock and the battle is fought${isLive() ? ` (${lockLabel(LIVE.config)})` : ""}</span></div><div class="stat"><b>${S.locked ? "✓ Sealed" : "Not sealed"}</b><span>${S.locked ? "your orders are in" : "seal your orders before the timer ends"}</span></div></div>
    <p class="muted">Each day: spend gold, place your soldiers, give orders, then seal. The battle plays out when the timer ends and the replay is waiting for you the next time you open the game.</p>
    ${testSkipHTML()}
    <div class="row"><button class="btn" data-act="close">Close</button></div></div>`;
}
