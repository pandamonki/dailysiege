// Entering, refreshing and saving the friends game

// ----- entering and refreshing the friends game -----
function refreshLiveWorld() {
  const ck = liveClock(), roster = rosterFor(ck.week), me = roster.findIndex(p => p.uid === LIVE.uid);
  DAY = ck.dayNo;
  const L = seatLayout(roster.length);
  const TC = teamColours(); MY_COLOR = TC[LIVE.uid] || SEAT_COLORS[me]; MY_NAME = (LIVE.names[LIVE.uid] && LIVE.names[LIVE.uid].name) || "You";
  const prev = ck.dayNo > 1 ? addDays(ck.planDay, -1) : null, pts = standings(ck.week);
  RIVALS = roster.map((p, i) => ({ p, i })).filter(x => x.i !== me).map(({ p, i }) => {
    const seen = prev ? latestPlan(p, prev, true) : null;
    const trust = !seen ? "Unknown" : (seen.targets || [])[0] === LIVE.uid ? "Alarmed" : (seen.offers || {})[LIVE.uid] ? "Loyal" : (seen.targets || []).includes(LIVE.uid) ? "Wary" : "Uneasy";
    return { id: p.uid, name: nameOf(p.uid), lvl: heroState(p.uid, ck.week, ck.planDay).lvl, cls: seen ? seen.cls : null, pos: L.castles[i], color: TC[p.uid] || SEAT_COLORS[i], trust, seen, points: pts[p.uid] || 0, live: p, banner: (seen && seen.banner) || (p.state && p.state.banner) || null, ctier: seen ? (seen.castleTier || 1) : 1 };
  });
  RARMY = []; RWALLS = [];
  RIVALS.forEach(rv => { if (!rv.seen) return; const z = zoneFor(rv.pos, L.N, L.castles);
    (rv.seen.pieces || []).forEach(pc => { if (pc.kind === "wall") { if (wallTiles(pc.r, pc.c, pc.dir).every(([a, b]) => z.has(`${a},${b}`))) RWALLS.push({ rid: rv.id, r: pc.r, c: pc.c, dir: pc.dir }); return; }
      if (pc.kind === "trap" || !z.has(`${pc.r},${pc.c}`)) return;
      RARMY.push({ rid: rv.id, r: pc.r, c: pc.c, champ: pc.kind === "champ", key: pc.kind === "champ" ? "c-" + rv.seen.cls : pc.type, lvl: pc.lvl, hp: 1 }); }); });
  ensureDip();
  applyLayout(L.N, L.castles[me], RIVALS.map(r => r.pos));
}
function payDays(ck) { // base pay once per day; spoils, catch-up, gold transfers and unit health once per battle, even if the result arrives late
  if (!S.paid) { S.paid = {}; for (let d = ck.week; d < S.day; d = addDays(d, 1)) { const b = LIVE.battles[d]; S.paid[d] = b && b.at < PAGE_T0 ? 2 : 1; } }
  let changed = false;
  for (let d = ck.week; d < ck.planDay; d = addDays(d, 1)) {
    const st = S.paid[d] || 0, b = LIVE.battles[d];
    if (st === 2 || (!b && st === 1)) continue;
    const inc = incomeFor(LIVE.uid, ck.week, d);
    S.gold += (st === 0 ? inc.base + inc.castle : 0) + (b ? inc.spoils + inc.catchUp : 0);
    if (b) {
      const mine = b.units && b.units[LIVE.uid];
      (b.transfers || []).forEach(tr => { if (tr.from === LIVE.uid) S.gold -= tr.gold; if (tr.to === LIVE.uid) S.gold += tr.gold; });
      Object.values(b.mercs || {}).forEach(h => { if (h.pid === LIVE.uid) S.gold -= h.gold; });
      { const used = new Set(b.trapsUsed || []); S.traps = S.traps.filter(t => { const k = placedAt(t.id); if (k && used.has(LIVE.uid + "|" + k)) { delete S.place[k]; return false; } return true; }); }
      if (b.rapier) { // the Divine Rapier changes hands with whoever carried it off the field
        if (b.rapier.from === LIVE.uid) S.items = (S.items || []).filter(k => k !== "rapier");
        if (b.rapier.to === LIVE.uid && !(S.items || []).includes("rapier")) { S.items = S.items || []; if (S.items.length >= ITEM_SLOTS) { const gone = S.items.shift(); S.gold += Math.floor(itemCost(gone) / 2); } S.items.push("rapier"); }
      }
      S.owned.forEach(u => { u.hp = 1; });
      S.owned.forEach(u => { if (UNITS[u.type].cool) { if (mine && mine[u.id] !== undefined) { u.cool = UNITS[u.type].cool; const k = placedAt(u.id); if (k) delete S.place[k]; } else u.cool = Math.max(0, (u.cool || 0) - 1); } });
      S.paid[d] = 2;
    } else S.paid[d] = 1;
    changed = true;
  }
  return changed;
}
function rollover() {
  const ck = liveClock();
  if (!S) { const sv = LIVE.players[LIVE.uid] && LIVE.players[LIVE.uid].state; if (sv && sv.week === ck.week) { S = JSON.parse(JSON.stringify(sv)); LIVE_S = S; } } // never start fresh when this week's saved state exists
  if (!S || S.week !== ck.week) { const old = S; S = freshLiveState(ck); if (old && old.lobbyPrep) { S.cls = old.cls || "warrior"; S.ranks = old.ranks || S.ranks; S.picks = old.picks || {}; S.banner = old.banner || S.banner; S.ob = old.ob || 0; } return true; }
  if (S.day === ck.planDay) return false;
  const g0 = S.gold;
  payDays(ck);
  S.ultArm = false; S.locked = false; S.sealedSnap = null; S.offers = Object.fromEntries(Object.entries(S.offers || {}).filter(([, o]) => o.day === addDays(ck.planDay, -1))); S.replies = {}; S.bids = {}; S.phase = "muster"; Object.values(S.diplo).forEach(d => { d.clues = []; });
  S.gain = S.gold - g0; S.day = ck.planDay; S.pactAct = {}; S.pactWhen = {};
  { const hs = heroState(LIVE.uid, ck.week, ck.planDay); S.lvl = hs.lvl; S.xp = hs.xp; }
  return true;
}
function enterLobbyState() {
  const mine = LIVE.players[LIVE.uid] || {};
  if (LIVE_S && LIVE_S.lobbyPrep) S = LIVE_S;
  else if (!S || !S.lobbyPrep) { const st = mine.state ? JSON.parse(JSON.stringify(mine.state)) : null;
    S = (st && st.lobbyPrep) ? st : Object.assign(freshLiveState(liveClock()), { cls: (st && st.cls) || "warrior", banner: (st && st.banner) || defaultBanner(), ob: 0, lobbyPrep: true }); }
  if (mine.fromWeek && mine.fromWeek !== "0000-00-00" && LIVE.db) { // an old "next week" sign-up: pull it into this war so the roster includes them when registration closes
    mine.fromWeek = "0000-00-00"; myWrite(r => r.update({ fromWeek: "0000-00-00" })).catch(() => {}); }
  LIVE.stateLoaded = true; LIVE_S = S; MY_COLOR = teamColour(LIVE.uid); MY_NAME = (LIVE.names[LIVE.uid] && LIVE.names[LIVE.uid].name) || "You";
}
function enterLive() {
  if (inLobby()) { enterLobbyState(); return true; }
  if (!isLive()) return false;
  const mine = LIVE.players[LIVE.uid];
  if (!LIVE.stateLoaded) { S = mine.state ? JSON.parse(JSON.stringify(mine.state)) : null; LIVE.stateLoaded = true; } else if (LIVE_S) S = LIVE_S;
  if (S) (S.owned || []).forEach(u => { u.hp = 1; }); // soldiers always start planning at full health
  resolveBattles(); // works out any missed battles first, so overnight results reach the rollover
  const changed = rollover();
  refreshLiveWorld(); sanitizePlace();
  if (changed) queueSave(true);
  return true;
}
function enterPractice() {
  if (PRACTICE_S) S = PRACTICE_S;
  else { try { S = JSON.parse(localStorage.getItem(STORE)) || freshState(); } catch (e) { S = freshState(); } migrateS(S); }
  PRACTICE_S = S; DAY = practiceDay(); MY_COLOR = YOU_COLOR; MY_NAME = "You";
  setupPractice(); sanitizePlace(); ensureDip();
}
function setMode(m) {
  if (gameMode === "practice") PRACTICE_S = S; else if (S && S.week) LIVE_S = S;
  gameMode = m; try { localStorage.setItem("lastbanner.mode", m); } catch (e) {}
  if (m === "friends" && enterLive()) { home(); toast("Friends game"); }
  else { gameMode = "practice"; enterPractice(); home(); }
  syncLobby();
}

// ----- saving my orders to the shared game -----
// All writes to my own player doc go through one queue: the database allows one write at a time per doc,
// so overlapping saves (a colour tap's autosave while Register is pressed) used to fail. Transient rejections retry.
let MY_WRITES = Promise.resolve();
function myWrite(op) {
  const run = async () => { for (let i = 0; ; i++) { try { return await op(LIVE.db.doc("players/" + LIVE.uid)); }
    catch (e) { const c = e && e.code; console.warn("Daily Siege save", i, c || e); if (i >= 4 || c === "invalid_argument" || c === "permission_denied" || c === "not_found") throw e; await new Promise(r => setTimeout(r, 300 * 2 ** i)); } } };
  const p = MY_WRITES.then(run, run); MY_WRITES = p.catch(() => {}); return p;
}
// Safeguard: never let a brand-new or emptied state overwrite a saved army. If the shared copy of this week has soldiers and ours has none
// without a sale in between, our copy is the broken one, so we take the saved one back instead of writing.
function stateGuard() {
  const cur = LIVE.players[LIVE.uid], sv = cur && cur.state;
  if (!S || !sv || sv.week !== S.week || !(sv.owned || []).length || (S.owned || []).length || (S.sells || 0) > (sv.sells || 0)) return false;
  console.warn("Daily Siege: blocked a save that would have wiped the army; restoring the saved state");
  S = JSON.parse(JSON.stringify(sv)); LIVE_S = S; try { const hs = heroState(LIVE.uid, liveClock().week, liveClock().planDay); S.lvl = hs.lvl; S.xp = hs.xp; } catch (e) {}
  toast("Your saved army was restored."); try { render(); } catch (e) {} return true;
}
function queueSave(full) {
  if (inLobby()) { clearTimeout(saveTimer); saveTimer = setTimeout(async () => { saveTimer = null; if (stateGuard()) return; try { await myWrite(r => r.update({ state: S })); } catch (e) { toast("Couldn't save your choices. Check your connection."); } }, 500); return; }
  if (!isLive() || LIVE.readOnly) return;
  clearTimeout(saveTimer); saveTimer = null;
  if (full) writeMine(true); else saveTimer = setTimeout(() => writeMine(false), 1200);
}
async function writeMine(full) {
  if (!isLive()) return; // a delayed autosave can fire after this device has left the game (signed out, removed, reconnecting)
  if (saving) { saveAgain = true; return; }
  if (stateGuard()) return;
  saving = true;
  const ck = liveClock(), snap = mySnapshot();
  try {
    if (full) { const cur = LIVE.players[LIVE.uid] || {}, plans = {}; Object.keys(cur.plans || {}).filter(k => k >= ck.week && k < ck.planDay).forEach(k => plans[k] = cur.plans[k]); plans[ck.planDay] = snap;
      await myWrite(ref => ref.set({ fromWeek: cur.fromWeek || ck.week, joinedAt: cur.joinedAt || Date.now(), nick: cur.nick || "", real: cur.real || "", state: S, plans })); }
    else { // always send this week's earlier orders along with today's: if the database replaces the field instead of merging it, past orders (which battles and replays are rebuilt from) would be lost
      const cur = LIVE.players[LIVE.uid] || {}, plans = {}; Object.keys(cur.plans || {}).filter(k => k >= ck.week && k < ck.planDay).forEach(k => plans[k] = cur.plans[k]); plans[ck.planDay] = snap;
      // replace the whole record rather than merging into it: the database merges nested maps, so a tile a piece moved off would live on in the saved copy and the piece would show twice
      await myWrite(ref => ref.set(Object.assign({}, cur, { fromWeek: cur.fromWeek || ck.week, joinedAt: cur.joinedAt || Date.now(), nick: cur.nick || "", real: cur.real || "", state: S, plans }))); }
  } catch (e) {
    if (e && e.code === "invalid_argument") { LIVE.readOnly = true; toast("You can watch this game but not play. Ask the host to add you as an Editor."); }
    else toast("Couldn't save your orders. They'll retry on your next change.");
  }
  saving = false;
  if (saveAgain) { saveAgain = false; writeMine(false); }
}

// ----- connecting -----
let liveTimer = null;
function liveChanged() {
  syncLobby();
  if (gameMode === "friends" && isLive()) {
    if (!LIVE.stateLoaded) { if (enterLive()) home(); }
    else { const before = S.day; resolveBattles(); const rolled = rollover(); if (!rolled && S.day === liveClock().planDay && payDays(liveClock())) { const hs = heroState(LIVE.uid, liveClock().week, liveClock().planDay); queueSave(true); }
      if (S.day === liveClock().planDay) { const hs2 = heroState(LIVE.uid, liveClock().week, liveClock().planDay); if (S.lvl !== hs2.lvl || S.xp !== hs2.xp) { S.lvl = hs2.lvl; S.xp = hs2.xp; queueSave(true); } } refreshLiveWorld(); sanitizePlace(); if (S.day !== before) queueSave(true); }
    const ck = liveClock(), newest = Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === ck.week).sort().pop();
    let seen = null; try { seen = localStorage.getItem("lastbanner.seen"); } catch (e) {}
    if (newest && newest !== seen && mode === "plan" && !sheet && LIVE.stateLoaded && LIVE.namesLoaded) { openReportFor(newest); return; }
  }
  render();
}
async function refreshNames() {
  if (!LIVE.user) return; const who = LIVE.user;
  const ids = Object.keys(LIVE.players); if (!ids.length) return;
  try { const nm = await who.profiles(ids); if (who !== LIVE.user) return; LIVE.names = nm; LIVE.namesLoaded = true; } catch (e) {}
  applyNicks();
  if (replay && replay.day && replay.res.names) Object.keys(replay.res.names).forEach(pid => { if (pid !== LIVE.uid) replay.res.names[pid] = nameOf(pid); });
  liveChanged();
}
