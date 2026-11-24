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
  return head(null, "Leaderboard", `${isLive() ? "Week standings" : "Test standings"} · day ${DAY} of 7`) + `<div class="body bdbody">
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
    ${mine ? `<div class="rhead"><div class="rsum"><b>${mine.place === 1 ? (d.team ? "Victory, together" : "Victory") : ord(mine.place) + " of " + d.results.length}</b><span>${mine.points} pt${mine.points === 1 ? "" : "s"} · +${d.gold[me] != null ? d.gold[me] : (mine.gold || 0)}g${gain ? ` · +${gain} lvl` : ""}</span></div>` : `<div class="rhead"><p class="muted">You weren't in this battle.</p>`}<div class="rbtns"><button class="btn wax" data-act="rwatch" data-v="${id}">▶ Watch</button><button class="btn wood" data-act="rreelm" data-v="${id}">★ Highlights</button></div></div>
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
  if (pl.tree) { const t = cleanTree(pl.tree); TREE_BKEY.forEach((bk, bi) => (t[bk] || []).forEach((rk, i) => { if (!rk) return; const n = TREES[pl.cls][bi].nodes[i]; out.push({ k: "a" + bi + "." + i, img: spellURL(n.ic, 32), name: n.name, sub: `${i === 5 ? "Ultimate" : "Skill"} · rank ${rk}/${TREE_MAX[i]}`, desc: nodeDesc(pl.cls, bi, i, rk), ult: i === 5 }); })); }
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
      <button class="btn wax big" data-act="testgo">▶ Continue<small>Practice game · day ${gameMode === "practice" ? DAY : practiceDay()} of 7</small></button>
      <button class="btn wood big" data-act="pvstart">✦ Preview a new player's first run<small>From opening the invite link: register → tutorial → hero → name, army colour, coat of arms → Day 1. A private sandbox with bot lords; your test game isn't touched.</small></button>
      <button class="btn ${c ? "wax" : ""} small" data-act="newgame">${c ? "Tap again: restart the test game" : "Restart the test game from day 1"}</button>
    </div>
    <div class="sec"><h3>Testing tools</h3><div class="row"><button class="btn small" data-act="testnext">Skip to the next day</button><button class="btn small" data-act="lab">Balance lab</button><button class="btn small" data-act="reset">Reset setup</button></div></div>
    <div class="row"><button class="btn small" data-act="open" data-v="title">← Back</button></div></div>`;
  return `<div class="splash-art" role="img" aria-label="Daily Siege: castles and armies around a hill at sunset"></div><div class="splash-menu">
    <div class="menu3">
      <button class="btn wax big" data-act="playgo">⚔ Play with friends<small>${lobbyOpen(LIVE.config) ? (inGame ? (LIVE.players[LIVE.uid].pending ? "Finish registering for the war" : "Muster hall · registration open") : "Registration is open. Join the war") : inGame ? "Friends game · day " + (live ? DAY : liveClock().dayNo) + " of 7" : LIVE.config ? "Join your friends' next war" : can ? "Host a war and invite friends" : "Daily siege with friends"}</small></button>
      ${inGame ? `<button class="btn small" data-act="open" data-v="game">⚙ Game settings</button>` : ""}${window.DS && DS.user ? `<button class="btn small" data-act="open" data-v="wars">🏰 Your wars${(DS.wars || []).length > 1 ? ` (${DS.wars.length})` : ""}</button>` : ""}${typeof PWA !== "undefined" && PWA.canOffer() ? `<button class="btn small" data-act="pwainstall">📲 Install app</button>` : ""}${alertsMenuButton()}<button class="btn small" data-act="open" data-v="patch">📜 Patch notes</button>${typeof LIVE === "object" && LIVE.config && (LIVE.config.hall || []).length ? `<button class="btn small" data-act="open" data-v="hall">🏆 Hall of fame</button>` : ""}<button class="btn small" data-act="wizard">🧙 How to play (tour)</button>
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
  { v: "v1.22: betray the whole alliance and faster replays", date: "24 Nov", fixes: [
    "Watch replay and Highlights no longer pause for a second before starting: the battle is fought in the background while the report is open, and a Preparing the battle note shows at once if it is not ready.",
  ], balance: [
    "From the 26 Nov battle (betrayV2): the betrayal time is picked from time slots (0:00 to 2:30 into the battle, like the wave deadlines) or conditions: another lord knocked out, their army gone, their hero away from home.",
    "From the 26 Nov battle (betrayV2): a lord with two or more carried allies can betray the whole alliance at once. The hero goes to the nearest allied keep and bombs are planted in every allied keep at the same moment.",
  ], changes: [
    "The betrayal banner names every lord betrayed.",
  ] },
  { v: "v1.21: highlights, betrayals and disbanding", date: "24 Nov", fixes: [
    "Highlights: only ultimates that killed a hero or 4 or more soldiers are shown, the best three, each framed to hold the hero and the impact zone, and every clip is at least 4 seconds. The reel ends on the Final placings.",
    "The betrayal banner now pauses the replay, names the betrayer and the betrayed in their colours, and cuts to the hero planting the bomb and the castle blowing up before returning to your camera.",
    "Team crests: a shield per alliance (a slice per lord, a white animal head, a gold rim) above allied castles and heroes in the replay and on the muster screen. It cracks and falls apart when the alliance breaks.",
    "The muster screen shows each alliance as a coloured side with the lone lords below; in the replay allied castles are grouped in the side strip, outlined in their team colour.",
  ], balance: [
    "From the 25 Nov battle (breakV2): disbanding an alliance takes effect from the next battle. You still fight together tonight, a disbanded ally cannot be targeted, and only a betrayal turns on an ally mid-fight.",
  ], changes: [
    "Disband asks \"are you sure?\" and the lord disbanded on gets an Alliance disbanded pop-up the next day.",
  ] },
  { v: "v1.20: noticeboard, camp and tidy-ups", date: "23 Nov", fixes: [
    "The replay's castle tracker is back to a small castle for every lord down the left edge, instead of a wide bar of heroes and castles across the top.",
    "No crowns or bounties on day 1, while the leaderboard is empty. They are set after day 1's battle.",
    "A Cleric shows its heal amount instead of an attack it doesn't have.",
  ], balance: [], changes: [
    "The Daily Noticeboard buttons are now Daily Contract and Daily Target. It shows the day's effect, and day 1 shows a welcome to the war instead.",
    "The Mercenary Camp pops up only once, on day 4. After that each new headliner is announced on the Daily Noticeboard and in the camp.",
    "When registration closes a screen shows every lord and their hero.",
    "The hero's quick buttons no longer include Orders. The shop bubble is black.",
  ] },
  { v: "v1.19: the crowning, the last alliance and faster heroes", date: "20 Nov", fixes: [
    "After the war's last battle the day 7 report opens first (Watch and Highlights work from it); closing it goes on to the war results.",
  ], balance: [
    "From the 23 Nov battle (finV2): on day 7 pacts no longer end at dawn. They hold into the battle, and the moment one alliance is all that is left standing (or all that is left in sudden death) its pacts break, a banner announces it, and the allies fight on until one lord wins. Allies never share the war's last victory.",
    "From the 23 Nov battle (lvlV2): heroes gain at least 3 and at most 4 levels a battle (was 2 to 3), up to level 25 (was 15). So after six battles a hero is level 19 to 25. Every level is still one skill point.",
    "With lvlV2 each level adds 7% of the hero's base health (was 12%) and 5.25% of its base attack (was 9%), so a level 25 hero has the health and attack a level 15 hero had. Each level needs a flat 130 experience, so about a third of heroes reach 4 levels in a battle.",
  ], changes: [
    "The crowning: the first time the war results open, every other lord bows in a line below a podium, trumpets sound, and a bronze crown lands on 3rd, then silver on 2nd, then after a drum roll the big gold crown on 1st, with confetti and the winner's victory taunt. Each cheers when crowned; the winner dances and 2nd and 3rd shake their heads. Replay it with the Crowning button.",
    "War results: tap a lord for tabs: Stats (net worth, hero, unit and castle damage over the war, days won, kills and every day's points), Skills, Items, Army and Upgrades as they fought the last battle. The battle report's lord page shows net worth and the damage split too.",
    "War highlights play the five biggest moments of the whole war (betrayals, huge ultimates, carnage, giants falling, the last alliance breaking, the final castle), at most two of a kind.",
    "Muster Hall: a gold crown with a count beside each lord who has won a war in this game.",
    "Victory screen: fallen allies float beside the winners as ghosts with a wispy tail, cheering the alliance on.",
    "Level 3 towers: a flash on the tower each shot, and a bigger projectile and impact for each type (triple blazing arrows, fire bolts, lobbed bombs, chain lightning, sniper tracers).",
    "Map strip: the hero's Stats button has a drawn bar-chart icon instead of the emoji, and the castle's Upgrade button no longer shows its cost (its hint names the tier and cost).",
  ] },
  { v: "v1.18: hero class, betrayal kills and the replay", date: "20 Nov", fixes: [
    "Mercenary camp: + and − now change the amount you are about to bid, from the group's minimum, and nothing is bid until you press Place bid (or Change bid). The group's tile and card show your bid, not the minimum.",
  ], balance: [
    "From the 22 Nov battle (balV5): every hero attacks with the new Hero damage type (120% against light, medium and heavy armour, 50% against castles and walls) and wears Hero armour (90% from blade, pierce, magic and precision, 80% from siege). Ability hits that name their own type keep it.",
    "From the 22 Nov battle: a hero within 2.5 tiles of its own castle that has neither hit nor been hit for 2 seconds heals 8% of its health a second. Any hit stops it and restarts the wait.",
    "From the 22 Nov battle: Mending Herbs 3 health a second (was 5), Ring of Health 5 a second (was 8), Mender's Charm 5 a second (was 8). Mending Herbs now costs 50 gold (was 40), Ring of Health 125 (was 100).",
    "From the 22 Nov battle: every reinforcement wave goes at least 20 seconds after the last, whether by trigger, deadline or emergency rush (was 30 seconds, or 10 for a rush).",
    "From the 22 Nov battle: razing the castle of an ally you betrayed in the same battle scores 3 times the castle points (9 instead of 3, before the day's weighting).",
    "Hero rebalance from the 22 Nov battle, measured over 1,800 bot battles (every class now wins 11 to 14.5% of 8-lord battles; before, 9 to 18%). Warrior 700 health (was 760) and 25% armour (was 28%); Archer attack 24 (was 25); Mage attack 30 (was 28); Rogue 510 health (was 480).",
    "Berserker (it won about 1 battle in 4): Executioner's Whirlwind base damage 5/9/13/17 a hit (was 20/30/40/50), Cleave 8/14/20/26% (was 15/25/35/45), Bloodthirst 2/3%, Blood Rage 3/5%. Avatar of War lasts 5s (was 7) and heals 15% (was 25%), and its splash is 35% (was 50%).",
    "Tactician: Marching Cadence 10/17/24/31%, Command Banner 12/20/28/36%. Sniper: Headshot 50/90/130/170. Marksman: Eagle Eye's crit chance 3/6/9/12%.",
    "Rogue: Ambush 40/70/100/130, Poisoned Blades 4/6/8/10 a stack. Mage: Fireball 85/140/195/250, Arcane Mastery +.3/.45/.6/.75 tiles and 6/9/12/15% resist, Mana Shield 25/40%, Empowered Synergies 25/40% and 12/20%. Shaman: Chain Lightning 75/120/165/210, Static Surge +5/9/13/17% and 30/45/60/75% arcs.",
  ], changes: [
    "Replay: every lord's castle and hero sit along the top with health bars. Tap a hero to follow it with the camera; tap a castle to look at it. The unit panel has a Follow button for any hero.",
    "Arrow Volley's falling arrows are smaller.",
    "Hero attack shows the hero's own damage, then the damage from items in green (map strip, Stats tab and the replay panel).",
    "The hero strip on the map has a Stats button; the castle strip has an Upgrade button showing the next tier's cost.",
    "Walls no longer have a Turn button, and tapping your castle a second time no longer opens the castle menu.",
    "Seal checklist: the hero-on-the-field line only shows when the hero is missing, and every line has a button to go and fix it.",
    "Allies can't be added to your targets unless the pact with them is set to Betray (or Break).",
    "The pre-battle screen seats each alliance's lords side by side, biggest alliance first.",
    "The gift screen starts with Roll for your gift. Roll spins the reels, Stop slows them onto three items, and the first is picked with a golden glow. Tap another to read about it; one button takes the picked item.",
    "Victory screen: allies who win together all appear, any allies whose castles fell sit slumped beside them, and a winner who betrayed an ally that battle has the betrayed hero face down at their feet with a dagger in its back.",
  ] },
  { v: "Report first after a battle", date: "20 Nov", fixes: [], balance: [], changes: [
    "After a battle, its report (with Watch and Highlights for the replay) now opens before any other pop-up. The mercenary camp and other pop-ups follow once it is closed.",
    "The contract board no longer pops up by itself. The ! above the map is now the Daily Noticeboard: the next battle's twist, the alliance changes at the last battle, and buttons to pick your contract and targets. It pulses until both are done.",
    "You only need one target to seal now (you can still pick up to three).",
    "The targets list shows the bounty on each of the top three lords (♛ +gold) beside their Target button.",
    "Bounty castles wear a crown on the map: gold for the leader, then silver and bronze.",
  ] },
  { v: "Ending, deleting and leaving wars", date: "20 Nov", fixes: [], balance: [], changes: [
    "Hosts can end the war under way early (Host tools): the hall of fame is taken from the battles fought so far, then registration for the next war opens. Nothing is deleted.",
    "Hosts can delete a war for everyone (Host tools, with a warning and a second tap): every battle, order and army goes, the invite link stops working, and it leaves every lord's list.",
    "Any lord can leave a war from Your wars (tap twice): it leaves their list and their castle is out from the next battle. The host can't leave their own war.",
  ] },
  { v: "Install and alerts", date: "20 Nov", fixes: [
    "On iPhone, tapping a drop-down or text box with small text zoomed the whole page in and left it zoomed. It no longer does (pinch-zoom still works).",
    "Small controls (the i buttons, the unit type line, wave trigger chips, Rush boxes and the hold-the-hill box) have bigger touch areas.",
  ], balance: [], changes: [
    "Phones get a one-time Install card: a one-tap Install on Android Chrome where offered, the menu steps otherwise, and the Add to Home Screen steps on iPhone.",
    "In a friends war, a one-time card offers battle alerts as soon as this device can get them (Android at once; iPhone once opened from the Home Screen). If you seal your orders with alerts off, a one-time offer follows.",
    "Battle alerts are in the Menu, to switch on or off for this device; it also explains how to unblock them on iPhone and Android.",
    "Where the phone supports it, the app icon shows a badge while a friends war's orders are unsealed, including after the \"orders lock soon\" alert.",
    "Each of these cards shows at most once per device, only as the first pop-up of an open, and What's new waits for the next open.",
    "New tops for three final towers on the map: the Fire Tower has a blazing brazier, the Magic Tower a floating crystal crackling with lightning, and the Sniper Tower a heavy crossbow with a gold scope on a stand.",
  ] },
  { v: "Rush boxes and a new trigger", date: "20 Nov", fixes: [], balance: [
    "From the battle of 20 Nov the wave trigger \"When my castle is attacked\" becomes \"When enemies reach my castle\": it fires when an enemy soldier, hero, summon or siege engine comes within 3 tiles of your castle (and nearer to it than to its own castle), or when your castle is first hit, whichever comes first. Towers don't count. Waves set to the old trigger get the new one automatically.",
  ], changes: [
    "Each wave on the Deploy tab has a Rush box, ticked to start with. Only waves with it ticked rush out when your castle drops below 75%, 50% or 25% health; untick one to keep it for its own trigger or deadline. In the replay, the stopwatch only turns red when a ticked wave is still waiting.",
  ] },
  { v: "Wave deadlines", date: "20 Nov", fixes: [], balance: [
    "From the battle of 20 Nov, each wave has its own deadline instead of one wave being forced out at each minute mark: Wave 1 goes by 0:45, Wave 2 by 1:30 and Wave 3 by 2:15, unless its trigger happens first. Waves are still at least 30 seconds apart, and emergency waves still rush out when the castle drops.",
  ], changes: [
    "On the Deploy tab each wave shows its deadline as a stopwatch badge beside its trigger, so it reads like \"Castle attacked or 0:45\". The trigger menu explains this, and a set time can only be picked before the deadline.",
  ] },
  { v: "Emergency waves", date: "20 Nov", fixes: [
    "In the replay, the hero's Respawn countdown covered the castle's wave bars. It now sits above them.",
  ], balance: [
    "From the battle of 20 Nov, each time a castle drops below 75%, 50% and 25% health its next unsent wave rushes out, at least 10 seconds after the last wave. Waves still go on their own triggers too, at least 30 seconds apart, and one is still forced out at each minute mark.",
    "From the same battle, waves have no orders of their own. Each wave first fights enemies within 8 tiles of its castle; once that area has been clear for 4 seconds, or the castle has fallen, it follows the army plan. Old plans' wave orders are ignored.",
  ], changes: [
    "The replay shows a stopwatch beside each castle's wave bars while its waves wait out the gap since the last one, red when an emergency wave is due. Waiting waves show dim amber, ready ones yellow, gone ones grey.",
    "The soldier chip at the top now counts every soldier you own, on the field and in waves, out of the field's 4 plus 3 for each unlocked wave.",
    "The Defences tab shows traps, towers and walls owned out of their limits.",
    "The wave orders chip is gone from the Deploy tab.",
  ] },
  { v: "Placement points", date: "20 Nov", fixes: [
    "The leaderboard's i note and the rules said day 7 counts double. Since 16 Nov it counts 1.5 times, like days 5 and 6.",
  ], balance: [
    "From the battle of 21 Nov, placement scores one point per place: last scores 1 and first scores one per lord, plus 2 for winning (with 8 lords: 10, 7, 6, 5, 4, 3, 2, 1). Before, 10, 7, 5, 4, 3, 2, 1 for 1st to 7th and nothing below. Kills, castles, survival, betrayals and contracts are unchanged.",
  ], changes: [] },
  { v: "Locked rosters and the Battle check", date: "20 Nov", fixes: [
    "A war that followed a war played with testing skips could have its battles mistaken for the earlier war's (they were saved under the same dates), so they never showed. From the second war on, battles are saved under the date and the war, and Resolve now fights any that were lost.",
    "Bots whose hero class was missing or repeated (all Mages, for example) are given different classes.",
    "The server rebuilt each war's list of lords before every battle from sign-up records, so a record gone wrong could leave it counting fewer than two lords and skipping days. The lords are now locked when registration closes, and a war under way is locked the next time the server looks at it.",
    "A day that passes without a battle is now recorded and shown plainly, instead of the game waiting for a battle that will never come.",
  ], balance: [], changes: [
    "Host: when Resolve now finds nothing to fight, a Battle check screen shows what the phone and the server each see, with a Copy button.",
  ] },
  { v: "Tour, bots and battle-day fixes", date: "19 Nov", fixes: [
    "Bots added before 15 Nov had no hero class saved and all fought as Warriors. Each now gets its own class from the next battle.",
    "After a testing-mode skip, or when a phone's clock disagreed with the server, the game could wait on a battle the server was not due to fight. Phones now follow the server's day.",
  ], balance: [], changes: [
    "The How to play tour opens each screen it describes (Base, Army, Hero, the shop, Orders, Allies) and rings its tabs, with the card at the bottom.",
  ] },
  { v: "Alliances v2 and interface fixes", date: "19 Nov", fixes: [
    "Labels in Orders and Allies floated over the Target and Invite buttons. They now sit beside their headings.",
    "The practice leaderboard showed the day number as every lord's level. It now shows real hero levels.",
    "Your hero class could still be changed on day 1 of a running war. It is now fixed once registration closes.",
  ], balance: [
    "From the battle of 20 Nov, allies who win together share 1st, 2nd and 3rd (10, 7 and 5 points), the one with the most castle health left first. Before, every surviving ally took 1st.",
    "From the battle of 20 Nov, lone wolf: while exactly one lord still standing is outside every pact, their army and castle get 10% more damage and 10% more maximum health for each allied lord still standing. It ends when a second lord stands alone or the lone wolf allies.",
  ], changes: [
    "From the battle of 20 Nov an alliance is a group of up to 3. A lord or group joins only if every member of each side agreed, so all allies are allied to each other. Inviting one member of an alliance invites them all, and an invitation to your alliance shows each member's answer.",
    "Bots in friends wars now take part in alliances: about 30% of days they invite a lord, they accept invitations that pay their price, and bots in the bottom half sometimes plan a betrayal.",
    "The Allies screen shows a card per alliance, who stands alone, the lone wolf, who betrayed whom, and a day-by-day alliance history.",
    "The top row labels its icons (Ult, Board, Report, Menu). Hero > Items has an Open the shop button, and the shop's page arrows sit under the items. The planning map is taller.",
    "The Friends Game page has lord cards with banners, Sealed and Planning badges, a lock clock and a sealed count; host settings fold away.",
    "Smaller fixes: clearer day and treasury wording, full-width tab bars, solid award cards, bigger unit-strip labels, and the recap explains that places go by who holds out longest.",
  ] },
  { v: "How to play guide", date: "19 Nov", fixes: [
    "The Muster Hall's War is over card had dark text on a dark background. It now sits on parchment with dark text.",
  ], balance: [], changes: [
    "How to play is rebuilt as five chapter tabs: Basics, Army, Hero, Battle and Allies, each of a few short pages. From Options it floats over the planning screen and rings the real button for anything on screen; new lords read the Basics chapter before choosing a hero.",
    "Pages about screens a new player can't see yet (contracts, sending and answering an invitation, betrayal, the mercenary camp, the replay and the morning report) show a screenshot with numbered boxes and a line for each number. A chapter gets a tick once read.",
    "Exact numbers moved from the guide into the page i notes: pay (Treasury), points (Leaderboard), training costs (Train), levels a battle (Hero) and the two-invitation limit (Alliances).",
    "Towers are drawn 20% shorter on the map. Their pictures in the menus are unchanged.",
  ] },
  { v: "Item rebalance", date: "18 Nov", fixes: [], balance: [
    "From the battle of 20 Nov: Healing Salve heals 220 (was 300) and costs 60 (was 50). Ring of Health gives +120 health and 8 health a second (was 140 and 10) and costs 100 (was 90) before tier pricing.",
    "Talisman of Will: stuns, roots, slows and silences last 75% shorter (was stuns and roots 60%). Orb of Fire splashes 50% within 1.5 tiles (was 35% within 1.3). Crystalys: 25% chance of 1.8x (was 20% of 1.6x). Pipe of Insight: 60% within 4 tiles (was 50% within 3). Boots of Speed: +0.42 move speed (was +0.35).",
    "Divine Rapier: +100 damage on each weapon hit, and abilities and ultimates are no longer boosted (was double all of the holder's damage).",
  ], changes: [
    "Anti-Magic Shell: no timing setting. It fires the moment your hero engages an enemy hero, whenever it is off cooldown, and for 7.5s (was 5s) makes the hero immune to hero abilities, ultimates and magic attacks (was 70% against abilities).",
    "Rune of Homecoming: no longer once a battle. When your castle is attacked or your hero drops below 30% health, away from home, the hero channels for 1.5s, then it and every ally within 4 tiles are teleported home. 45s cooldown. Not in sudden death.",
  ] },
  { v: "Skill scaling, tower upgrades, battle report", date: "18 Nov", fixes: [
    "From the battle of 19 Nov, towers never move from where they were placed. Magic Towers were being pushed after heroes and Fire Towers shifted with each shot.",
  ], balance: [
    "From the battle of 20 Nov, every hero skill rises in even steps, each worth at least about two thirds of the first rank. Examples: Blood Rage 4/7% (was 4/5), Fireball 70/120/170/220 (was 90/125/165/205), Chain Lightning 60/100/140/180 damage and 3/4/4/5 targets, Ambush 30/55/80/105, Headshot 60/105/150/195, Poisoned Blades 3/5/7/9 a stack. Some first ranks are a little lower and top ranks a little higher. Full list in js/config/trees.js (TREE_V2).",
  ], changes: [
    "Tower slots are named Tower I and Tower II. Towers are named Archer Tower Lv1 and Lv2, then the Lv3 tower chosen (Archer Tower Lv3, Fire, Bomb, Magic or Sniper).",
    "A tower's slot in Defences lists its health, damage, shot speed, damage a second, range and damage type, and shows them beside the upgrade you pick. Tap each Lv3 tower to compare before upgrading.",
    "Battle report: each lord's card shows their hero sprite in their colours, the medal, points and chips for heroes killed / deaths / assists, soldiers killed, castles taken, damage dealt, levels and gold. A Build button opens their skills and items (or Show all builds). Deaths, assists and damage are recorded from the battle of 20 Nov. An assist is hurting an enemy hero in the 10 seconds before someone else kills it.",
    "The day picker on the battle report sits on a single row and scrolls.",
  ] },
  { v: "New towers, fairer arena", date: "18 Nov", fixes: [], balance: [
    "From the battle of 19 Nov, towers take no part in sudden death: they stay home, out of the fight, like the castles.",
    "From the battle of 19 Nov, each army enters the sudden death arena on its own castle's side, and the lords still standing are spread evenly round the ring.",
  ], changes: [
    "Towers are now tall stone keep towers in the castle's style, with the owner's banner down the front and a roof in their colour. The level 3 towers trade the roof for their weapon: a mortar, a crystal, a brazier or a great crossbow.",
  ] },
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
    "Defences: traps are bought here and then moved or sold from the map. Walls are built straight onto the map: tap Walls, then tap tile after tile, paying for each. Tower I and Tower II each have a slot to buy, upgrade or sell them.",
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
