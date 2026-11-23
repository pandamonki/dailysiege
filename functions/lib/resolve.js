// Fighting the daily battles on the server.
//
// When a game's lock time has passed, read everyone's orders (which only the server can do), fight
// the battle with the game's own code, save the result, and move the game on to the next day.
const { Timestamp, FieldPath, FieldValue } = require("firebase-admin/firestore");
const { loadGame, SIM_FILES, WORLD_FILES } = require("./game");
const { startDate } = require("./clock");
const { notifyBattle, remindUnsealed } = require("./notify");

let game;
const g = () => game || (game = loadGame([...SIM_FILES, ...WORLD_FILES]));
// Battles are saved by date. Testing skips can carry one war's dates past the next war's start, so from the second war a battle is
// saved as "date~wN" and dates never clash between wars. (Wars that began before this kept plain dates: both are read.)
const battleId = (day, war) => ((war || 1) > 1 ? `${day}~w${war}` : day), dayOf = id => String(id).split("~")[0];
async function battleSaved(gameRef, day, war) {
  if ((await gameRef.collection("battles").doc(battleId(day, war)).get()).exists) return true;
  if ((war || 1) > 1) { const p = await gameRef.collection("battles").doc(day).get(); return p.exists && (p.get("war") || 1) === war; }
  return false;
}
const plain = v => JSON.parse(JSON.stringify(v)); // drops undefined, which the database refuses

// Everything the battle needs, in the shape the game's own code expects (see js/net/world.js).
async function loadWorld(gameRef, cfg, day) {
  const config = Object.assign({}, cfg, { startDate: startDate(cfg) }), war = cfg.war || 1;
  const week = g().get("wWeekOf")({ config }, day), byDay = FieldPath.documentId(); // documents are named by their date
  const [pubs, battles] = await Promise.all([gameRef.collection("players").get(), gameRef.collection("battles").where(byDay, ">=", week).get()]);
  const W = { config, players: {}, battles: {} };
  battles.forEach(d => { const b = d.data(), k = dayOf(d.id); if ((b.war || 1) === war && k < day) W.battles[k] = b; });
  // bots made before bots had a class saved fought as Warriors: give each a class, nobody else's where possible, and save it so it stays put
  const heroes = Object.keys(g().get("CLASSES")), taken = {}; pubs.docs.forEach(d => { const c = d.get("cls"); if (c) taken[c] = (taken[c] || 0) + 1; });
  const bots = pubs.docs.filter(d => d.get("bot") && !d.get("left")).sort((a, b) => (a.get("joinedAt") || 0) - (b.get("joinedAt") || 0) || (a.id < b.id ? -1 : 1)), seen = new Set();
  const noCls = bots.filter(d => { const c = d.get("cls"), ok = heroes.includes(c) && (!seen.has(c) || seen.size >= heroes.length); if (ok) seen.add(c); return !ok; }); // no class, or a repeat while some class is unused
  noCls.forEach(d => { const c = d.get("cls"); if (taken[c]) taken[c]--; }); // their old class no longer counts as taken
  const botCls = {}; noCls.forEach((d, i) => { const c = heroes.map((h, j) => [h, taken[h] || 0, (j - i + heroes.length * 9) % heroes.length]).sort((a, b) => a[1] - b[1] || a[2] - b[2])[0][0]; taken[c] = (taken[c] || 0) + 1; botCls[d.id] = c; d.ref.update({ cls: c }).catch(e => console.warn("Daily Siege: saving a bot's class failed", d.id, e && e.message)); });
  await Promise.all(pubs.docs.map(async d => {
    const pub = d.data();
    if (pub.left || pub.pending) return; // not fighting: no need to read their orders
    if (pub.bot) { W.players[d.id] = { fromWeek: pub.fromWeek, joinedAt: pub.joinedAt, nick: pub.nick || "", real: pub.real || "", bot: true, state: { cls: botCls[d.id] || pub.cls || "warrior", banner: pub.banner || null }, plans: {} }; return; } // a bot has no saved state or orders: the game works its orders out
    const [state, orders] = await Promise.all([d.ref.collection("private").doc("state").get(), d.ref.collection("orders").where(byDay, ">=", week).get()]);
    const plans = {}; orders.forEach(o => { const p = o.data(); if ((p.war || 1) === war && o.id <= day) plans[o.id] = p; });
    const st = state.exists ? state.data() : {};
    W.players[d.id] = { fromWeek: pub.fromWeek, joinedAt: pub.joinedAt, nick: pub.nick || "", real: pub.real || "", state: Object.assign({}, st, { banner: st.banner || pub.banner || null }), plans };
  }));
  return W;
}

// Lock the war's lords: everyone registered (not still joining, not removed) when registration closed, bots included.
// Written once per war; a war already under way without one gets it the first time the server looks at it.
async function lockRoster(gameRef, cfg) {
  const war = cfg.war || 1, week = startDate(cfg);
  if (!week || cfg.lobby && !cfg.startDate && !(cfg.lobbyEnds && Date.now() >= cfg.lobbyEnds)) return cfg; // registration still open
  if (cfg.roster && (cfg.roster.war || 1) === war && cfg.roster.week === week) return cfg;
  const pubs = await gameRef.collection("players").get(), uids = pubs.docs.filter(d => !d.get("left") && !d.get("pending")).map(d => d.id).sort();
  const roster = { war, week, uids, at: Date.now() };
  await gameRef.update({ roster });
  console.log("Daily Siege: roster locked", gameRef.id, war, week, uids.length);
  return Object.assign({}, cfg, { roster });
}

/**
 * Fight every battle of this game that is due at `now`, oldest first.
 * Safe to call at any time and from several places at once: each day is claimed in a transaction,
 * so a battle is fought and saved exactly once.
 * @returns {Promise<{ day: string, fought: boolean, lords: number }[]>} the days moved past
 */
// force (testing mode only): fight the day being planned now, whatever the time, and move the game's clock a day ahead (testSkew)
async function resolveDue(db, gameId, { now = Date.now(), maxDays = 8, send = null, force = false } = {}) {
  const gameRef = db.collection("games").doc(gameId), done = [];
  const { addDays, lockInstant, wRoster, wWeekOf, fightDay } = { addDays: g().get("addDays"), lockInstant: g().get("lockInstant"), wRoster: g().get("wRoster"), wWeekOf: g().get("wWeekOf"), fightDay: g().get("fightDay") };
  for (let i = 0; i < maxDays; i++) {
    const snap = await gameRef.get(); if (!snap.exists) break;
    const cfg = await lockRoster(gameRef, snap.data()), day = cfg.planDay;
    if (!day) break;
    // the lock is worked out from the game's own settings, so a stored lock time that is missing or has drifted cannot hold a battle back
    const sk = (cfg.testSkew || 0) * 864e5, lockAt = cfg.tz && cfg.lockHour !== undefined ? lockInstant(day, cfg.tz, cfg.lockHour) - sk : cfg.nextLockAt ? cfg.nextLockAt.toMillis() : null;
    if (!(force && i === 0) && (lockAt === null || now < lockAt)) break; // nothing due
    const W = await loadWorld(gameRef, cfg, day), lords = wRoster(W, wWeekOf(W, day)).length;
    // a battle needs two lords; with fewer, the day simply passes
    const doc = lords >= 2 ? Object.assign(plain(fightDay(W, day, now)), { war: cfg.war || 1 }) : null;
    const next = addDays(day, 1), after = addDays(day, 2);
    const saved = doc ? await battleSaved(gameRef, day, cfg.war || 1) : false;
    const claimed = await db.runTransaction(async tx => {
      const cur = (await tx.get(gameRef)).data();
      if (!cur || cur.planDay !== day || (cur.war || 1) !== (cfg.war || 1)) return false; // someone else fought it, or a new war began
      const skew = (cur.testSkew || 0) + (force ? 1 : 0), sk2 = skew * 864e5;
      const battleRef = gameRef.collection("battles").doc(battleId(day, cur.war || 1));
      if (doc && !saved && !(await tx.get(battleRef)).exists) tx.create(battleRef, doc);
      tx.update(gameRef, { ...(doc ? {} : { skipDays: FieldValue.arrayUnion(day) }), planDay: next, nextPlanDay: after, nextLockAt: Timestamp.fromMillis(lockInstant(next, cur.tz, cur.lockHour) - sk2), lockAfter: Timestamp.fromMillis(lockInstant(after, cur.tz, cur.lockHour) - sk2), clockWar: cur.war || 1, resolvedAt: Timestamp.fromMillis(now), ...(force ? { testSkew: skew } : {}) });
      return true;
    });
    if (!claimed) break;
    const last = g().get("wWeekdayOf")(day, Object.assign({}, cfg, { startDate: startDate(cfg) })) === 7;
    if (force) { done.push({ day, fought: !!doc, lords }); if (last) await endWar(db, gameRef, now).catch(e => console.error("Daily Siege: ending the war failed", gameId, e)); break; }
    done.push({ day, fought: !!doc, lords });
    // tell the lords (only the newest battle when catching up on several days); a failed notification never fails the battle
    if (doc && send && now < lockInstant(next, cfg.tz, cfg.lockHour) - ((cfg.testSkew || 0) + (force ? 1 : 0)) * 864e5) await notifyBattle(db, gameRef, day, doc, send).catch(e => console.error("Daily Siege: notifications failed", gameId, e));
    if (last) { await endWar(db, gameRef, now).catch(e => console.error("Daily Siege: ending the war failed", gameId, e)); break; } // day 7 was the last battle of the war
  }
  return done;
}

/**
 * The war is over (its 7th battle has been fought): record the winner in the game's hall of fame and open registration for the next war,
 * the same way the host's "Start a new war" does. Everyone stays registered (with their hero and banner); the host decides whether
 * registration closes by itself (cfg.nextClose hours after the war, e.g. 24) or when they press Begin (0, the default).
 */
async function endWar(db, gameRef, now) {
  const snap = await gameRef.get(); if (!snap.exists) return; const cfg = snap.data(), war = cfg.war || 1;
  if ((cfg.hall || []).some(h => h.war === war)) return; // already ended
  const [battles, pubs] = await Promise.all([gameRef.collection("battles").get(), gameRef.collection("players").get()]);
  const pts = {}; battles.forEach(d => { const b = d.data(); if ((b.war || 1) !== war) return; (b.results || []).forEach(r => { pts[r.pid] = (pts[r.pid] || 0) + (r.points || 0); }); });
  const names = {}; pubs.forEach(d => { const p = d.data(); names[d.id] = p.nick || p.real || "A lord"; });
  const top = Object.keys(pts).sort((a, b) => pts[b] - pts[a] || (a < b ? -1 : 1)).slice(0, 3).map(pid => ({ pid, name: names[pid] || "A lord", pts: pts[pid] }));
  const hall = (cfg.hall || []).concat(top.length ? [{ war, at: now, top }] : []).slice(-50);
  const close = +cfg.nextClose > 0 ? +cfg.nextClose : 0, b = db.batch();
  b.update(gameRef, { war: war + 1, lobby: true, lobbyEnds: close ? now + close * 36e5 : FieldValue.delete(), createdAt: now, hall });
  pubs.forEach(d => { const p = d.data(); if (!p.left) b.update(d.ref, { fromWeek: "0000-00-00" }); });
  await b.commit();
}

// Every game whose lock time has passed.
async function resolveAllDue(db, { now = Date.now(), send = null } = {}) {
  const due = await db.collection("games").where("nextLockAt", "<=", Timestamp.fromMillis(now)).get(), out = {};
  for (const d of due.docs) { try { out[d.id] = await resolveDue(db, d.id, { now, send }); } catch (e) { console.error("Daily Siege: battle failed for game", d.id, e); out[d.id] = { error: String((e && e.message) || e) }; } }
  return out;
}

/**
 * Give a lord's castle to that lord's new account (lost phone, or signed in with a different address).
 * Nothing about the castle changes: its army, gold, orders and its place in every past battle stay
 * exactly as they are, under the same seat id. Only who may play it changes: the new account's
 * membership is pointed at the seat, and the old account is shut out.
 */
async function reassignSeat(db, gameId, seatId, toUid) {
  const gameRef = db.collection("games").doc(gameId), members = gameRef.collection("members"), seat = gameRef.collection("players").doc(seatId);
  const [cfg, seatPub, toMember, toPub, holders] = await Promise.all([gameRef.get(), seat.get(), members.doc(toUid).get(), gameRef.collection("players").doc(toUid).get(), members.where("seat", "==", seatId).get()]);
  if (!seatPub.exists || seatPub.get("left")) throw new Error("That lord is not in the game.");
  if (seatId === cfg.get("host")) throw new Error("The host's own seat cannot be moved.");
  if (!toMember.exists) throw new Error("The new account has not opened the invite link yet.");
  if (toMember.get("seat")) throw new Error("The new account already plays another lord's castle.");
  const queued = toPub.exists && String(toPub.get("fromWeek") || "") > String(cfg.get("planDay") || ""); // signed up after the war began: waiting for next week
  if (toPub.exists && !toPub.get("pending") && !toPub.get("left") && !queued) throw new Error("The new account already has a castle of its own in this game.");
  const batch = db.batch(), out = uid => { if (uid === toUid) return; batch.delete(members.doc(uid)); batch.set(gameRef.collection("banned").doc(uid), { at: Date.now(), why: "replaced" }); };
  batch.set(members.doc(toUid), { seat: seatId }, { merge: true });
  out(seatId); holders.forEach(h => out(h.id)); // the original account, and any earlier replacement
  if (toPub.exists) batch.update(toPub.ref, { left: true }); // the sign-up they made with the new account is no longer needed
  await batch.commit();
}

// "Orders lock in an hour" for every game that is due one, counting only lords who are in this week's war.
function remindAll(db, send, { now = Date.now() } = {}) {
  const wRoster = g().get("wRoster"), wWeekOf = g().get("wWeekOf");
  return remindUnsealed(db, send, { now, wRoster: (pubs, cfg) => { const W = { config: Object.assign({}, cfg, { startDate: startDate(cfg) }), players: pubs, battles: {} }; return wRoster(W, wWeekOf(W, cfg.planDay)).map(p => p.uid); } });
}

// Recovery: fight any earlier day of this war that was passed without a saved result.
// Returns the days fought, and a plain-words reason for any day that could not be.
async function fightMissing(db, gameId, { now = Date.now() } = {}) {
  const gameRef = db.collection("games").doc(gameId), snap = await gameRef.get(); if (!snap.exists) return { days: [], why: "" };
  const cfg = await lockRoster(gameRef, snap.data()), planDay = cfg.planDay; if (!planDay) return { days: [], why: "" };
  const { addDays, wRoster, wWeekOf, fightDay } = { addDays: g().get("addDays"), wRoster: g().get("wRoster"), wWeekOf: g().get("wWeekOf"), fightDay: g().get("fightDay") };
  const week = wWeekOf({ config: Object.assign({}, cfg, { startDate: startDate(cfg) }) }, planDay), days = [], war = cfg.war || 1; let why = "";
  for (let d = week; d < planDay; d = addDays(d, 1)) {
    const ref = gameRef.collection("battles").doc(battleId(d, war)); if (await battleSaved(gameRef, d, war)) continue;
    const W = await loadWorld(gameRef, cfg, d), lords = wRoster(W, wWeekOf(W, d)).length;
    if (lords < 2) { why = `Only ${lords} lord${lords === 1 ? "" : "s"} counted for ${d}, and a battle needs two.`; continue; }
    await ref.create(Object.assign(plain(fightDay(W, d, now)), { war })); days.push({ day: d, fought: true, lords });
  }
  return { days, why };
}

// Why nothing is due, in plain words, for the host's button.
async function explainNotDue(db, gameId, { now = Date.now() } = {}) {
  const snap = await db.collection("games").doc(gameId).get(); if (!snap.exists) return "This game was not found.";
  const cfg = snap.data(), day = cfg.planDay; if (!day) return "The war has not started yet, so there is no battle to fight.";
  const lockInstant = g().get("lockInstant"), at = cfg.tz && cfg.lockHour !== undefined ? lockInstant(day, cfg.tz, cfg.lockHour) - (cfg.testSkew || 0) * 864e5 : cfg.nextLockAt ? cfg.nextLockAt.toMillis() : null;
  if (at === null) return "The game has no battle time saved.";
  const when = new Date(at).toLocaleString("en-AU", { timeZone: cfg.tz || "UTC", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return now < at ? `The server's next battle is for ${day} at ${when}.` : `The server is already planning ${day}.`;
}

// The host's "Battle check": what the server sees for this game, in plain facts, so a battle that never shows up can be explained.
async function diagnose(db, gameId, { now = Date.now() } = {}) {
  const gameRef = db.collection("games").doc(gameId), snap = await gameRef.get(); if (!snap.exists) return { error: "This game was not found." };
  const cfg = snap.data(), war = cfg.war || 1, day = cfg.planDay || null, sd = startDate(cfg);
  const { addDays, lockInstant, wRoster, wWeekOf } = { addDays: g().get("addDays"), lockInstant: g().get("lockInstant"), wRoster: g().get("wRoster"), wWeekOf: g().get("wWeekOf") };
  const out = { now: new Date(now).toISOString(), war, planDay: day, startDate: sd || null, tz: cfg.tz || null, lockHour: cfg.lockHour ?? null, testSkew: cfg.testSkew || 0, lobby: !!cfg.lobby, maxPlayers: cfg.maxPlayers || null, capFrom: cfg.capFrom || null, capPrev: cfg.capPrev || null, roster: cfg.roster ? `war ${cfg.roster.war || 1}, from ${cfg.roster.week}: ${(cfg.roster.uids || []).length} lords` : "not locked", skipped: (cfg.skipDays || []).join(", ") || "none" };
  if (day && cfg.tz && cfg.lockHour !== undefined) out.lockAt = new Date(lockInstant(day, cfg.tz, cfg.lockHour) - (cfg.testSkew || 0) * 864e5).toISOString();
  const bs = await gameRef.collection("battles").get(); out.battles = bs.docs.map(d => `${d.id} (war ${d.get("war") || 1}${d.get("results") ? ", " + d.get("results").length + " lords" : ""})`).sort().slice(-12);
  const pubs = await gameRef.collection("players").get();
  const ords = await Promise.all(pubs.docs.map(async d => { if (d.get("bot") || d.get("left")) return ""; try { const o = await d.ref.collection("orders").get(); return o.docs.length ? " · orders: " + o.docs.map(x => `${x.id.slice(5)} w${x.get("war") || 1}${x.get("sealed") ? " sealed" : " draft"} ${(x.get("pieces") || []).length}p`).sort().join(", ") : " · orders: none"; } catch (e) { return ""; } }));
  out.players = pubs.docs.map((d, i) => { const p = d.data(); return `${p.nick || d.id}${p.bot ? " (bot" + (p.cls ? ", " + p.cls : ", no class") + ")" : ""}: from ${p.fromWeek || "none"}${p.pending ? ", pending" : ""}${p.left ? ", left" : ""}${p.war ? ", war " + p.war : ""}${ords[i]}`; });
  if (day) { const week = wWeekOf({ config: Object.assign({}, cfg, { startDate: sd }) }, day); out.week = week; out.counted = {};
    for (let d = week; d <= day; d = addDays(d, 1)) { const W = await loadWorld(gameRef, cfg, d); out.counted[d] = wRoster(W, wWeekOf(W, d)).length; } }
  return out;
}

const testMode = () => !!g().get("TEST_MODE");
module.exports = { endWar, testMode, fightMissing, explainNotDue, diagnose, lockRoster, resolveDue, resolveAllDue, reassignSeat, loadWorld, remindAll };
