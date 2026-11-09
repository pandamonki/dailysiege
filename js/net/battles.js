// Building and resolving the day's shared battle

// ----- turning everyone's orders into a battle -----
function liveBattlePlans(dayKey, opts = {}) {
  const week = addDays(dayKey, -(weekdayOf(dayKey) - 1)), roster = rosterFor(week), L = seatLayout(roster.length), final = weekdayOf(dayKey) === 7;
  const pts = standings(week), lead = Object.entries(pts).sort((a, b) => b[1] - a[1])[0];
  const TC = teamColours();
  const raw = roster.map((p, i) => {
    let plan;
    if (opts.test && p.uid === LIVE.uid) plan = mySnapshot();
    else if (opts.test) plan = lvl > 1 ? latestPlan(p, dayKey, false) : null; // fog: only yesterday's orders are known
    else plan = latestPlan(p, dayKey, true);
    const z = zoneFor(L.castles[i], L.N, L.castles), sp = armySpots(L.castles[i], L.N);
    const hs = heroState(p.uid, week, dayKey), lvl = hs.lvl;
    plan = plan || { cls: (p.state && p.state.week === week && p.state.cls) || "warrior", ranks: autoRanks(lvl, i + 1), picks: {}, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
      gear: {}, defences: {}, stance: "aggressive", prio: PRIORITIES.slice(), rules: [], pieces: [], pacts: [], hostile: [], betray: {} };
    let pieces = (plan.pieces || []).filter(pc => pc.kind === "wall" ? wallTiles(pc.r, pc.c, pc.dir).every(([a, b]) => z.has(`${a},${b}`)) : z.has(`${pc.r},${pc.c}`));
    if (!pieces.some(pc => pc.kind === "champ")) pieces = [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, ...pieces];
    return { uid: p.uid, i, plan, pieces, hs };
  });
  const rkm = rankMap(weekdayOf(dayKey) > 1 ? standings(week, addDays(dayKey, -1)) : {}, roster.map(q => q.uid));
  const plans = raw.map(({ uid, i, plan, pieces, hs }) => ({
    pid: uid, me: uid === LIVE.uid, name: nameOf(uid), color: TC[uid] || SEAT_COLORS[i], cls: plan.cls, level: hs.lvl, xp0: hs.xp, items: plan.items || [], castleTier: plan.castleTier || 1, banner: plan.banner || null, breaks: plan.breaks || [], pbetray: plan.pbetray || {}, castle: L.castles[i], leader: !!(lead && lead[1] > 0 && lead[0] === uid),
    ranks: plan.ranks || { a1: 0, a2: 0, a3: 0, ult: 0 }, picks: plan.picks || {}, triggers: plan.triggers || {}, gear: plan.gear || {}, defences: plan.defences || {},
    stance: plan.stance || "aggressive", prio: plan.prio || PRIORITIES.slice(), rules: plan.rules || [], pieces,
    targets: (plan.targets || []).filter(q => raw.some(x => x.uid === q)), tmode: plan.tmode || "list", heading: plan.heading || "near", rank: rkm[uid], offers: plan.offers || {}, terms: plan.terms || {} }));
  const { pairs, transfers } = resolveAlliances(plans, { persist: carriedPairs(dayKey), final });
  return { N: L.N, plans, pairs, transfers, final };
}
const daySeed = dayKey => (+dayKey.replace(/-/g, "") % 1000003) * 7 + 13;
async function resolveBattles() {
  if (!isLive() || LIVE.readOnly) return;
  const ck = liveClock(), roster = rosterFor(ck.week);
  if (roster.length < 2) return;
  const writes = [];
  for (let d = ck.week; d < ck.planDay; d = addDays(d, 1)) {
    if (LIVE.battles[d]) continue;
    const { N: size, plans, pairs, transfers, final } = liveBattlePlans(d), res = runBattle(plans, daySeed(d), { fast: true, N: size, finalDay: final });
    const units = {}; res.tel.ents.filter(e => e.kind === "unit" && e.ref).forEach(e => { (units[e.pid] = units[e.pid] || {})[e.ref] = e.survived ? 1 : 0; });
    const doc = { week: ck.week, day: weekdayOf(d), at: Date.now(), results: res.results.map(r => ({ pid: r.pid, place: r.place, points: r.points, kills: r.kills, castles: r.castles, fellAt: r.fellAt ?? null })), units, pairs: pairs.map(p => p.join("|")), pairsEnd: res.pairsEnd, transfers,
      gain: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.gain])), xp: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.xp])), gold: Object.fromEntries(res.results.map(r => [r.pid, r.gold])), team: !!res.team };
    LIVE.battles[d] = doc; writes.push([d, doc]);
  }
  for (const [d, doc] of writes) { try { await LIVE.db.doc("battles/" + d).set(doc); } catch (e) { /* another player may already have written it */ } }
}
