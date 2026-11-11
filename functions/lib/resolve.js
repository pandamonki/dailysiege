// Fighting the daily battles on the server.
//
// When a game's lock time has passed, read everyone's orders (which only the server can do), fight
// the battle with the game's own code, save the result, and move the game on to the next day.
const { Timestamp, FieldPath } = require("firebase-admin/firestore");
const { loadGame, SIM_FILES, WORLD_FILES } = require("./game");
const { startDate } = require("./clock");
const { notifyBattle, remindUnsealed } = require("./notify");

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
async function resolveDue(db, gameId, { now = Date.now(), maxDays = 8, send = null } = {}) {
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
    // tell the lords (only the newest battle when catching up on several days); a failed notification never fails the battle
    if (doc && send && now < lockInstant(next, cfg.tz, cfg.lockHour)) await notifyBattle(db, gameRef, day, doc, send).catch(e => console.error("Daily Siege: notifications failed", gameId, e));
  }
  return done;
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

module.exports = { resolveDue, resolveAllDue, reassignSeat, loadWorld, remindAll };
