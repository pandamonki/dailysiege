// From a game's saved data to a battle, with nothing read from the page.
//
// Every function here takes the "world" it works on as its first argument:
//   W = { config, players: { uid: { fromWeek, joinedAt, nick, real, pending, left, state, plans: { day: orders } } }, battles: { day: doc } }
// so the same code turns orders into a battle on a phone (W is the live game) and on the server
// (W is read straight from the database). Nothing in this file may touch the DOM, the clock or the
// page's own state; `npm test` loads it headlessly to make sure.

// ----- names -----
// players can register a nickname and their actual name; everyone sees them as "Nickname (Actual name)"
const NICK_MAX = 16, REAL_MAX = 20;
const cleanName = (v, max) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
function lordLabel(p) { const n = cleanName(p && p.nick, NICK_MAX), r = cleanName(p && p.real, REAL_MAX); return n && r && n.toLowerCase() !== r.toLowerCase() ? `${n} (${r})` : n || r || ""; }

// ----- roster, standings, hero levels -----
const wWeekOf = (W, dayKey) => addDays(dayKey, -(wWeekdayOf(dayKey, W.config) - 1));
function wCap(W, week) { const c = W.config || {}; return Math.min(8, (c.capFrom && week < c.capFrom ? c.capPrev : c.maxPlayers) || 8); }
function wRoster(W, week) {
  return Object.entries(W.players).filter(([, p]) => p.fromWeek && p.fromWeek <= week && !p.left && !p.pending)
    .sort((a, b) => (a[1].joinedAt - b[1].joinedAt) || (a[0] < b[0] ? -1 : 1)).slice(0, wCap(W, week)).map(([uid, p]) => ({ uid, ...p }));
}
function wStandings(W, week, through) {
  const pts = {};
  Object.entries(W.battles).forEach(([k, b]) => { if (b.week !== week || (through && k > through)) return; (b.results || []).forEach(r => { pts[r.pid] = (pts[r.pid] || 0) + r.points; }); });
  return pts;
}
function rankMap(pts, pids) {
  if (!pids.some(p => (pts[p] || 0) > 0)) return {};
  const o = pids.slice().sort((a, b) => (pts[b] || 0) - (pts[a] || 0)); return Object.fromEntries(o.map((p, i) => [p, i + 1]));
}
// a champion's level and spare experience on a given day, rebuilt from the week's battles (every device and the server get the same answer)
function wHeroState(W, uid, week, dayKey) {
  let lvl = 1, xp = 0;
  Object.keys(W.battles).filter(k => W.battles[k].week === week && k < dayKey).sort().forEach(k => { const b = W.battles[k]; lvl += b.gain ? Math.min(XP_CAP, b.gain[uid] || 0) : 1; xp = (b.xp && b.xp[uid]) || 0; });
  return { lvl: Math.min(MAX_HERO_LVL, lvl), xp };
}
// Carry-forward: if a lord has not sealed orders for the day, their latest sealed orders of the week are fought again.
function wLatestPlan(W, p, dayKey, inclusive) {
  const keys = Object.keys(p.plans || {}).filter(k => (inclusive ? k <= dayKey : k < dayKey) && k >= wWeekOf(W, dayKey)).sort();
  const sealed = keys.filter(k => p.plans[k] && p.plans[k].sealed); // only sealed orders count: drafts and unsealed edits are never fought
  return sealed.length ? p.plans[sealed[sealed.length - 1]] : null;
}
function wCarriedPairs(W, dayKey) {
  const week = wWeekOf(W, dayKey); if (dayKey === week) return [];
  const b = W.battles[addDays(dayKey, -1)]; return b && b.week === week && b.pairsEnd ? b.pairsEnd : [];
}
const wFeudsBefore = (W, dayKey, week) => Array.from(new Set(Object.keys(W.battles).filter(k => k < dayKey && W.battles[k].week === week).flatMap(k => W.battles[k].feuds || [])));
// the Divine Rapier belongs to whoever carried it off the field last: nobody else may start a fight holding it
function wRapierItems(W, items, uid, week, dayKey) {
  let holder = null; Object.keys(W.battles).filter(k => W.battles[k].week === week && k < dayKey).sort().forEach(k => { const r = W.battles[k].rapier; if (r && r.to) holder = r.to; });
  if (!holder) return items; const has = items.includes("rapier");
  return holder === uid ? (has ? items : items.concat(["rapier"])) : items.filter(k => k !== "rapier");
}
// Each lord's main banner colour is their team colour. One lord per colour: the earlier sign-up keeps a contested colour.
function wTeamColours(pool, bannerOf) { // pool: [uid, player] in sign-up order
  const out = {}, used = new Set(), later = [];
  pool.forEach(([uid, p]) => { const c = (bannerOf(uid, p) || {}).c1; if (c && SEAT_COLORS.includes(c) && !used.has(c)) { out[uid] = c; used.add(c); } else later.push(uid); });
  later.forEach(uid => { const c = SEAT_COLORS.find(x => !used.has(x)) || SEAT_COLORS[0]; out[uid] = c; used.add(c); });
  return out;
}

// ----- turning everyone's orders into a battle -----
// opts (phones only): uid = whose device this is; nameOf, colours = how this device shows names and colours;
// test = { mine } builds a practice fight from my unsaved orders against what is publicly known of my rivals.
function buildBattleInputs(W, dayKey, opts = {}) {
  const week = wWeekOf(W, dayKey), roster = wRoster(W, week), L = seatLayout(roster.length), dayNo = wWeekdayOf(dayKey, W.config), final = dayNo === 7;
  const pts = wStandings(W, week, addDays(dayKey, -1)), lead = Object.entries(pts).sort((a, b) => b[1] - a[1])[0];
  const TC = opts.colours || wTeamColours(roster.map(p => [p.uid, p]), (uid, p) => p.state && p.state.banner);
  const nameOf = opts.nameOf || (uid => lordLabel(W.players[uid]) || "A lord");
  const raw = roster.map((p, i) => {
    let plan;
    const hs = wHeroState(W, p.uid, week, dayKey), lvl = hs.lvl;
    if (opts.test && p.uid === opts.uid) plan = opts.test.mine;
    else if (opts.test) plan = lvl > 1 ? wLatestPlan(W, p, dayKey, false) : null; // fog: only yesterday's orders are known
    else plan = wLatestPlan(W, p, dayKey, true);
    const z = zoneFor(L.castles[i], L.N, L.castles), sp = armySpots(L.castles[i], L.N), noOrders = !plan;
    if (plan) plan = JSON.parse(JSON.stringify(plan)); // the battle must never change the saved orders it reads, or replaying it later gives a different fight
    plan = plan || { cls: (p.state && p.state.week === week && p.state.cls) || "warrior", ranks: autoRanks(lvl, i + 1), picks: {}, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
      gear: {}, defences: {}, stance: "aggressive", prio: PRIORITIES.slice(), rules: [], pieces: [], pacts: [], hostile: [], betray: {} };
    let champSeen = false; const unitSeen = new Set();
    let pieces = (plan.pieces || []).slice().reverse().filter(pc => { if (pc.kind === "champ") { if (champSeen) return false; champSeen = true; } else if (pc.id) { if (unitSeen.has(pc.id)) return false; unitSeen.add(pc.id); } return true; }).reverse().filter(pc => pc.kind === "wall" ? wallTiles(pc.r, pc.c, pc.dir).every(([a, b]) => z.has(`${a},${b}`)) : z.has(`${pc.r},${pc.c}`));
    if (!pieces.some(pc => pc.kind === "champ")) pieces = [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, ...pieces];
    return { uid: p.uid, i, plan, pieces, hs, noOrders };
  });
  const rkm = rankMap(dayNo > 1 ? wStandings(W, week, addDays(dayKey, -1)) : {}, roster.map(q => q.uid));
  const plans = raw.map(({ uid, i, plan, pieces, hs, noOrders }) => ({
    pid: uid, me: uid === opts.uid, name: nameOf(uid), color: TC[uid] || SEAT_COLORS[i], cls: plan.cls, level: hs.lvl, xp0: hs.xp, ultArm: plan.ultArm, blessing: plan.blessing || null, items: wRapierItems(W, plan.items || [], uid, week, dayKey), castleTier: plan.castleTier || 1, banner: plan.banner || null, breaks: plan.breaks || [], pbetray: plan.pbetray || {}, castle: L.castles[i], leader: !!(lead && lead[1] > 0 && lead[0] === uid),
    ranks: plan.ranks || { a1: 0, a2: 0, a3: 0, ult: 0 }, picks: plan.picks || {}, triggers: plan.triggers || {}, gear: plan.gear || {}, defences: plan.defences || {},
    formation: plan.formation !== false, stance: plan.stance || "aggressive", prio: plan.prio || PRIORITIES.slice(), rules: plan.rules || [], pieces,
    targets: (plan.targets || []).filter(q => raw.some(x => x.uid === q)), tmode: plan.tmode || "list", heading: plan.heading || "near", rank: rkm[uid], offers: plan.offers || {}, replies: plan.replies || {}, terms: plan.terms || {}, bids: plan.bids || {},
    ...(noOrders && !opts.test ? { noOrders: true } : {}) })); // noOrders: this lord sealed nothing all week, so these are the stand-in orders, not theirs
  const feuds0 = wFeudsBefore(W, dayKey, week), { pairs, transfers } = resolveAlliances(plans, { persist: wCarriedPairs(W, dayKey), final, prevDay: addDays(dayKey, -1), feuds: feuds0 });
  plans.feuds = feuds0;
  let mercs = {}; if (dayNo >= MERC_DAY) { const mer = resolveMercs(plans, { day: dayKey, N: L.N, cool: id => mercCool(id, null, k => { const b = W.battles[addDays(dayKey, -k)]; return b && b.week === week ? b : null; }) }); plans.notes = (plans.notes || []).concat(mer.notes); mercs = mer.hires; }
  plans.mercs = mercs;
  return { N: L.N, plans, pairs, transfers, final, mercs, feuds: plans.feuds, week, dayNo, lords: roster.length };
}
const daySeed = dayKey => (+dayKey.replace(/-/g, "") % 1000003) * 7 + 13;

// Fight the day's battle and build the record that is saved for it. `at` is the time to stamp on it.
function fightDay(W, dayKey, at, opts) {
  const { N: size, plans, pairs, transfers, final, mercs, feuds, week, dayNo } = buildBattleInputs(W, dayKey, opts);
  const inputs = JSON.parse(JSON.stringify({ N: size, final: !!final, ultV2: ultV2For(dayKey), feuds: plans.feuds || [], plans: plans.map(p => Object.assign({}, p, { me: false })) })); // taken before the fight, which edits its plans as it goes
  const res = runBattle(plans, daySeed(dayKey), { fast: true, N: size, finalDay: final, ultV2: ultV2For(dayKey) });
  const units = {}; res.tel.ents.filter(e => e.kind === "unit" && e.ref).forEach(e => { (units[e.pid] = units[e.pid] || {})[e.ref] = e.survived ? 1 : 0; });
  const doc = { week, day: dayNo, at, results: res.results.map(r => ({ pid: r.pid, place: r.place, points: r.points, kills: r.kills, ukills: r.ukills || 0, castles: r.castles, fellAt: r.fellAt ?? null })), units, pairs: pairs.map(p => p.join("|")), pairsEnd: res.pairsEnd, transfers,
    awards: res.awards, ...(res.rapier ? { rapier: res.rapier } : {}), ...(res.ultCast && res.ultCast.length ? { ults: Object.fromEntries(res.ultCast.map(p => [p, 1])) } : {}), ...(res.rapierEnd ? { rapierEnd: res.rapierEnd } : {}), gain: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.gain])), xp: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.xp])), gold: Object.fromEntries(res.results.map(r => [r.pid, r.gold])), team: !!res.team };
  doc.feuds = Array.from(new Set((feuds || []).concat(res.feudsNew || []))); doc.mercs = mercs || {}; doc.trapsUsed = res.trapsUsed || []; doc.inputs = inputs; // the exact orders fought, so replaying never depends on orders that were edited or lost later
  doc.resultHash = battleHash(res); // a fingerprint of the outcome: every device that replays this battle must arrive at the same one
  return doc;
}
