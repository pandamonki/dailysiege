// Building and resolving the day's shared battle

// ----- turning everyone's orders into a battle -----
// the Divine Rapier belongs to whoever carried it off the field last: nobody else may start a fight holding it
function rapierItems(items, uid, week, dayKey) {
  let holder = null; Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === week && k < dayKey).sort().forEach(k => { const r = LIVE.battles[k].rapier; if (r && r.to) holder = r.to; });
  if (!holder) return items; const has = items.includes("rapier");
  return holder === uid ? (has ? items : items.concat(["rapier"])) : items.filter(k => k !== "rapier");
}
function liveBattlePlans(dayKey, opts = {}) {
  const week = addDays(dayKey, -(weekdayOf(dayKey) - 1)), roster = rosterFor(week), L = seatLayout(roster.length), final = weekdayOf(dayKey) === 7;
  const pts = standings(week, addDays(dayKey, -1)), lead = Object.entries(pts).sort((a, b) => b[1] - a[1])[0];
  const TC = teamColours();
  const raw = roster.map((p, i) => {
    let plan;
    const hs = heroState(p.uid, week, dayKey), lvl = hs.lvl;
    if (opts.test && p.uid === LIVE.uid) plan = mySnapshot();
    else if (opts.test) plan = lvl > 1 ? latestPlan(p, dayKey, false) : null; // fog: only yesterday's orders are known
    else plan = latestPlan(p, dayKey, true);
    const z = zoneFor(L.castles[i], L.N, L.castles), sp = armySpots(L.castles[i], L.N);
    if (plan) plan = JSON.parse(JSON.stringify(plan)); // the battle must never change the saved orders it reads, or replaying it later gives a different fight
    plan = plan || { cls: (p.state && p.state.week === week && p.state.cls) || "warrior", ranks: autoRanks(lvl, i + 1), picks: {}, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
      gear: {}, defences: {}, stance: "aggressive", prio: PRIORITIES.slice(), rules: [], pieces: [], pacts: [], hostile: [], betray: {} };
    let champSeen = false; const unitSeen = new Set();
    let pieces = (plan.pieces || []).slice().reverse().filter(pc => { if (pc.kind === "champ") { if (champSeen) return false; champSeen = true; } else if (pc.id) { if (unitSeen.has(pc.id)) return false; unitSeen.add(pc.id); } return true; }).reverse().filter(pc => pc.kind === "wall" ? wallTiles(pc.r, pc.c, pc.dir).every(([a, b]) => z.has(`${a},${b}`)) : z.has(`${pc.r},${pc.c}`));
    if (!pieces.some(pc => pc.kind === "champ")) pieces = [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, ...pieces];
    return { uid: p.uid, i, plan, pieces, hs };
  });
  const rkm = rankMap(weekdayOf(dayKey) > 1 ? standings(week, addDays(dayKey, -1)) : {}, roster.map(q => q.uid));
  const plans = raw.map(({ uid, i, plan, pieces, hs }) => ({
    pid: uid, me: uid === LIVE.uid, name: nameOf(uid), color: TC[uid] || SEAT_COLORS[i], cls: plan.cls, level: hs.lvl, xp0: hs.xp, ultArm: plan.ultArm, blessing: plan.blessing || null, items: rapierItems(plan.items || [], uid, week, dayKey), castleTier: plan.castleTier || 1, banner: plan.banner || null, breaks: plan.breaks || [], pbetray: plan.pbetray || {}, castle: L.castles[i], leader: !!(lead && lead[1] > 0 && lead[0] === uid),
    ranks: plan.ranks || { a1: 0, a2: 0, a3: 0, ult: 0 }, picks: plan.picks || {}, triggers: plan.triggers || {}, gear: plan.gear || {}, defences: plan.defences || {},
    formation: plan.formation !== false, stance: plan.stance || "aggressive", prio: plan.prio || PRIORITIES.slice(), rules: plan.rules || [], pieces,
    targets: (plan.targets || []).filter(q => raw.some(x => x.uid === q)), tmode: plan.tmode || "list", heading: plan.heading || "near", rank: rkm[uid], offers: plan.offers || {}, replies: plan.replies || {}, terms: plan.terms || {}, bids: plan.bids || {} }));
  const feuds0 = feudsBefore(dayKey, week), { pairs, transfers } = resolveAlliances(plans, { persist: carriedPairs(dayKey), final, prevDay: addDays(dayKey, -1), feuds: feuds0 });
  plans.feuds = feuds0;
  let mercs = {}; if (weekdayOf(dayKey) >= MERC_DAY) { const mer = resolveMercs(plans, { day: dayKey, N: L.N, cool: id => mercCool(id, null, k => { const b = LIVE.battles[addDays(dayKey, -k)]; return b && b.week === week ? b : null; }) }); plans.notes = (plans.notes || []).concat(mer.notes); mercs = mer.hires; }
  plans.mercs = mercs;
  return { N: L.N, plans, pairs, transfers, final, mercs, feuds: plans.feuds };
}
const PAGE_T0 = Date.now(), SAVING_B = new Set(), LIVE_LOCAL_B = {}; let warnedB = false;
function withLocalBattles(bt) { Object.keys(LIVE_LOCAL_B).forEach(d => { if (bt[d]) delete LIVE_LOCAL_B[d]; }); return Object.assign({}, LIVE_LOCAL_B, bt); }
const daySeed = dayKey => (+dayKey.replace(/-/g, "") % 1000003) * 7 + 13;
const feudsBefore = (dayKey, week) => Array.from(new Set(Object.keys(LIVE.battles).filter(k => k < dayKey && LIVE.battles[k].week === week).flatMap(k => LIVE.battles[k].feuds || [])));
// the orders exactly as a finished battle fought them, ready to fight again (replays never depend on anyone's current orders)
function savedBattle(dayKey) {
  const b = LIVE.battles[dayKey], s = b && b.inputs; if (!s) return null;
  const plans = JSON.parse(JSON.stringify(s.plans)).map(p => Object.assign(p, { me: p.pid === LIVE.uid, name: nameOf(p.pid) }));
  if (s.feuds) plans.feuds = s.feuds.slice(); if (b.mercs) plans.mercs = b.mercs;
  return { N: s.N, final: !!s.final, ultV2: !!s.ultV2, transfers: b.transfers || [], plans };
}
async function resolveBattles() {
  if (!isLive() || LIVE.readOnly) return;
  if (LIVE.db && LIVE.db.serverBattles) return; // on the hosted game the server fights the battles: this device cannot see rivals' orders
  const ck = liveClock(), roster = rosterFor(ck.week);
  if (roster.length < 2) return;
  for (let d = ck.week; d < ck.planDay; d = addDays(d, 1)) {
    if (LIVE.battles[d]) continue;
    try {
      if (S) refreshLiveWorld(); // the simulation reads the map layout, so set it for this war first: every phone must fight the same battle
      const { N: size, plans, pairs, transfers, final, mercs, feuds } = liveBattlePlans(d);
      const inputs = JSON.parse(JSON.stringify({ N: size, final: !!final, ultV2: ultV2For(d), feuds: plans.feuds || [], plans: plans.map(p => Object.assign({}, p, { me: false })) })); // taken before the fight, which edits its plans as it goes
      const res = runBattle(plans, daySeed(d), { fast: true, N: size, finalDay: final, ultV2: ultV2For(d) });
      const units = {}; res.tel.ents.filter(e => e.kind === "unit" && e.ref).forEach(e => { (units[e.pid] = units[e.pid] || {})[e.ref] = e.survived ? 1 : 0; });
      const doc = { week: ck.week, day: weekdayOf(d), at: Date.now(), results: res.results.map(r => ({ pid: r.pid, place: r.place, points: r.points, kills: r.kills, ukills: r.ukills || 0, castles: r.castles, fellAt: r.fellAt ?? null })), units, pairs: pairs.map(p => p.join("|")), pairsEnd: res.pairsEnd, transfers,
        awards: res.awards, ...(res.rapier ? { rapier: res.rapier } : {}), ...(res.ultCast && res.ultCast.length ? { ults: Object.fromEntries(res.ultCast.map(p => [p, 1])) } : {}), ...(res.rapierEnd ? { rapierEnd: res.rapierEnd } : {}), gain: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.gain])), xp: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.xp])), gold: Object.fromEntries(res.results.map(r => [r.pid, r.gold])), team: !!res.team };
      doc.feuds = Array.from(new Set((feuds || []).concat(res.feudsNew || []))); doc.mercs = mercs || {}; doc.trapsUsed = res.trapsUsed || []; doc.inputs = inputs; // the exact orders fought, so replaying never depends on orders that were edited or lost later
      LIVE.battles[d] = doc; LIVE_LOCAL_B[d] = doc;
    } catch (e) { // never let one bad battle silently skip the day: say so, and try again next time
      console.warn("Daily Siege battle failed", d, e); if (!warnedB) { warnedB = true; toast("Last night's battle couldn't be worked out. Tell the host (" + ((e && e.message) || "error") + ")."); } break; }
  }
  // share every result that isn't in the shared game yet; a failed write stays in the local cache and retries on the next refresh
  for (const [d, doc] of Object.entries(LIVE_LOCAL_B)) {
    if (SAVING_B.has(d)) continue; SAVING_B.add(d);
    try {
      // first writer wins: if the shared game already has this battle, adopt it instead of overwriting it with our own (possibly different) simulation
      let cur = null; try { const g = await LIVE.db.doc("battles/" + d).get(); if (g && g.exists) cur = g.data(); } catch (e) {}
      if (cur) { LIVE.battles[d] = cur; delete LIVE_LOCAL_B[d]; SAVING_B.delete(d); continue; }
      await LIVE.db.doc("battles/" + d).set(doc); }
    catch (e) { console.warn("Daily Siege battle save", d, e); if (!warnedB) { warnedB = true; toast("Battle results couldn't be shared yet. They'll retry (" + ((e && (e.code || e.message)) || "error") + ")."); } }
    SAVING_B.delete(d);
  }
}
