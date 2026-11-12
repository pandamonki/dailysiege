// Building and resolving the day's shared battle

// ----- turning everyone's orders into a battle -----
// (the work is in js/net/world.js, shared with the server; this hands it the live game as this device sees it)
function liveBattlePlans(dayKey, opts = {}) {
  return buildBattleInputs(LIVE, dayKey, { uid: LIVE.uid, nameOf, colours: teamColours(), test: opts.test ? { mine: mySnapshot() } : null });
}
const PAGE_T0 = Date.now(), SAVING_B = new Set(), LIVE_LOCAL_B = {}; let warnedB = false;
function withLocalBattles(bt) { Object.keys(LIVE_LOCAL_B).forEach(d => { if (bt[d]) delete LIVE_LOCAL_B[d]; }); return Object.assign({}, LIVE_LOCAL_B, bt); }
// the orders exactly as a finished battle fought them, ready to fight again (replays never depend on anyone's current orders)
function savedBattle(dayKey) {
  const b = LIVE.battles[dayKey], s = b && b.inputs; if (!s) return null;
  const plans = JSON.parse(JSON.stringify(s.plans)).map(p => Object.assign(p, { me: p.pid === LIVE.uid, name: nameOf(p.pid) }));
  if (s.feuds) plans.feuds = s.feuds.slice(); if (b.mercs) plans.mercs = b.mercs;
  return { N: s.N, final: !!s.final, ultV2: !!s.ultV2, balV2: !!s.balV2, balV3: !!s.balV3, dayNo: s.dayNo || null, ranks: s.ranks || null, transfers: b.transfers || [], plans };
}
// On the hosted game: the earliest day of this war whose lock has passed but whose result has not arrived yet (or null).
function battlePending() {
  if (!isLive() || !LIVE.db || !LIVE.db.serverBattles) return null;
  const ck = liveClock(); if (rosterFor(ck.week).length < 2) return null;
  for (let d = ck.week; d < ck.planDay; d = addDays(d, 1)) if (!LIVE.battles[d]) return d;
  return null;
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
      const doc = fightDay(LIVE, d, Date.now(), { uid: LIVE.uid, nameOf, colours: teamColours() });
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
