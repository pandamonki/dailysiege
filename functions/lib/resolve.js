// Fighting the daily battles on the server.
//
// When a game's lock time has passed, read everyone's orders (which only the server can do), fight
// the battle with the game's own code, save the result, and move the game on to the next day.
const { Timestamp, FieldPath } = require("firebase-admin/firestore");
const { loadGame, SIM_FILES, WORLD_FILES } = require("./game");
const { startDate } = require("./clock");

let game;
const g = () => game || (game = loadGame([...SIM_FILES, ...WORLD_FILES]));
const plain = v => JSON.parse(JSON.stringify(v)); // drops undefined, which the database refuses

// Everything the battle needs, in the shape the game's own code expects (see js/net/world.js).
async function loadWorld(gameRef, cfg, day) {
  const config = Object.assign({}, cfg, { startDate: startDate(cfg) }), war = cfg.war || 1;
  const week = g().get("wWeekOf")({ config }, day), byDay = FieldPath.documentId(); // documents are named by their date
  const [pubs, battles] = await Promise.all([gameRef.collection("players").get(), gameRef.collection("battles").where(byDay, ">=", week).get()]);
  const W = { config, players: {}, battles: {} };
  battles.forEach(d => { const b = d.data(); if ((b.war || 1) === war && d.id < day) W.battles[d.id] = b; });
  await Promise.all(pubs.docs.map(async d => {
    const pub = d.data();
    if (pub.left || pub.pending) return; // not fighting: no need to read their orders
    const [state, orders] = await Promise.all([d.ref.collection("private").doc("state").get(), d.ref.collection("orders").where(byDay, ">=", week).get()]);
    const plans = {}; orders.forEach(o => { const p = o.data(); if ((p.war || 1) === war && o.id <= day) plans[o.id] = p; });
    const st = state.exists ? state.data() : {};
    W.players[d.id] = { fromWeek: pub.fromWeek, joinedAt: pub.joinedAt, nick: pub.nick || "", real: pub.real || "", state: Object.assign({}, st, { banner: st.banner || pub.banner || null }), plans };
  }));
  return W;
}

/**
 * Fight every battle of this game that is due at `now`, oldest first.
 * Safe to call at any time and from several places at once: each day is claimed in a transaction,
 * so a battle is fought and saved exactly once.
 * @returns {Promise<{ day: string, fought: boolean, lords: number }[]>} the days moved past
 */
async function resolveDue(db, gameId, { now = Date.now(), maxDays = 8 } = {}) {
  const gameRef = db.collection("games").doc(gameId), done = [];
  const { addDays, lockInstant, wRoster, wWeekOf, fightDay } = { addDays: g().get("addDays"), lockInstant: g().get("lockInstant"), wRoster: g().get("wRoster"), wWeekOf: g().get("wWeekOf"), fightDay: g().get("fightDay") };
  for (let i = 0; i < maxDays; i++) {
    const snap = await gameRef.get(); if (!snap.exists) break;
    const cfg = snap.data(), day = cfg.planDay;
    if (!day || !cfg.nextLockAt || now < cfg.nextLockAt.toMillis()) break; // nothing due
    const W = await loadWorld(gameRef, cfg, day), lords = wRoster(W, wWeekOf(W, day)).length;
    // a battle needs two lords; with fewer, the day simply passes
    const doc = lords >= 2 ? Object.assign(plain(fightDay(W, day, now)), { war: cfg.war || 1 }) : null;
    const next = addDays(day, 1), after = addDays(day, 2);
    const claimed = await db.runTransaction(async tx => {
      const cur = (await tx.get(gameRef)).data();
      if (!cur || cur.planDay !== day || (cur.war || 1) !== (cfg.war || 1)) return false; // someone else fought it, or a new war began
      const battleRef = gameRef.collection("battles").doc(day);
      if (doc && !(await tx.get(battleRef)).exists) tx.create(battleRef, doc);
      tx.update(gameRef, { planDay: next, nextPlanDay: after, nextLockAt: Timestamp.fromMillis(lockInstant(next, cur.tz, cur.lockHour)), lockAfter: Timestamp.fromMillis(lockInstant(after, cur.tz, cur.lockHour)), clockWar: cur.war || 1, resolvedAt: Timestamp.fromMillis(now) });
      return true;
    });
    if (!claimed) break;
    done.push({ day, fought: !!doc, lords });
  }
  return done;
}

// Every game whose lock time has passed.
async function resolveAllDue(db, { now = Date.now() } = {}) {
  const due = await db.collection("games").where("nextLockAt", "<=", Timestamp.fromMillis(now)).get(), out = {};
  for (const d of due.docs) { try { out[d.id] = await resolveDue(db, d.id, { now }); } catch (e) { console.error("Daily Siege: battle failed for game", d.id, e); out[d.id] = { error: String((e && e.message) || e) }; } }
  return out;
}

/**
 * Give one lord's castle to another account (a lord who lost their phone and signed in afresh).
 * Everything the old account had in this game moves to the new one, and this war's battles are
 * rewritten to name the new account, so standings, hero level and replays carry on unbroken.
 */
async function reassignSeat(db, gameId, fromUid, toUid) {
  const gameRef = db.collection("games").doc(gameId), from = gameRef.collection("players").doc(fromUid), to = gameRef.collection("players").doc(toUid);
  const [cfg, fromPub, toPub, toMember, state, orders, battles] = await Promise.all([gameRef.get(), from.get(), to.get(), gameRef.collection("members").doc(toUid).get(),
    from.collection("private").doc("state").get(), from.collection("orders").get(), gameRef.collection("battles").get()]);
  if (!fromPub.exists || fromPub.get("left")) throw new Error("That lord is not in the game.");
  if (!toMember.exists) throw new Error("The new account has not opened the invite link yet.");
  const queued = toPub.exists && String(toPub.get("fromWeek") || "") > String(cfg.get("planDay") || ""); // signed up after the war began: waiting for next week
  if (toPub.exists && !toPub.get("pending") && !toPub.get("left") && !queued) throw new Error("The new account already has a castle of its own in this game.");
  if (fromUid === cfg.get("host")) throw new Error("The host's own seat cannot be moved.");
  const war = cfg.get("war") || 1, swap = v => JSON.parse(JSON.stringify(v).split(fromUid).join(toUid)), batch = db.batch();
  batch.set(to, Object.assign({}, fromPub.data(), { pending: false }));
  if (state.exists) batch.set(to.collection("private").doc("state"), swap(state.data()));
  orders.forEach(o => batch.set(to.collection("orders").doc(o.id), o.data()));
  battles.forEach(b => { if ((b.get("war") || 1) === war && JSON.stringify(b.data()).includes(fromUid)) batch.set(b.ref, swap(b.data())); });
  batch.update(from, { left: true, kicked: true });
  batch.delete(gameRef.collection("members").doc(fromUid));
  await batch.commit();
}

module.exports = { resolveDue, resolveAllDue, reassignSeat, loadWorld };
