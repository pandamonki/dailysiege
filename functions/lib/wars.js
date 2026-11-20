// Ending, deleting and leaving a war (a game). Called by the host's and the lords' buttons through index.js.
//
//   endWarNow(db, gameId)        the host ends the war under way early: the hall of fame is taken from the battles fought so far,
//                                and registration for the next war opens, exactly as after a 7th battle (resolve.js endWar)
//   deleteGame(db, gameId)       the host deletes the game: every war, battle, order and lord in it, its invite links, and the
//                                game from every account's list. Cannot be undone.
//   leaveGame(db, gameId, uid)   a lord leaves: their castle is out from the next battle (as when the host removes a lord, but
//                                not barred), every account tied to that castle loses access, and the game is off their lists. The host cannot leave their own game.
const { FieldValue } = require("firebase-admin/firestore");
const { endWar } = require("./resolve");

const failed = msg => Object.assign(new Error(msg), { plain: true });

async function endWarNow(db, gameId, { now = Date.now() } = {}) {
  const ref = db.collection("games").doc(gameId), snap = await ref.get();
  if (!snap.exists) throw failed("This game was not found.");
  const cfg = snap.data();
  if (cfg.lobby || !cfg.planDay) throw failed("No war is under way: registration is open.");
  const war = cfg.war || 1;
  await endWar(db, ref, now);
  return { ended: war };
}

// every account that has this game on its list: members (invited accounts) and lords (castles), never bots
async function accountsOf(ref) {
  const [members, players] = await Promise.all([ref.collection("members").get(), ref.collection("players").get()]), ids = new Set();
  members.forEach(d => ids.add(d.id));
  players.forEach(d => { if (!d.get("bot")) ids.add(d.id); });
  return [...ids];
}
// take the game off one account's list (users/{uid}: games[] and the game it last opened)
async function unlist(db, uid, gameId) {
  const u = db.collection("users").doc(uid), s = await u.get(); if (!s.exists) return;
  await u.update({ games: FieldValue.arrayRemove(gameId), ...(s.get("gameId") === gameId ? { gameId: FieldValue.delete() } : {}) });
}

async function deleteGame(db, gameId) {
  const ref = db.collection("games").doc(gameId), snap = await ref.get();
  if (!snap.exists) throw failed("This game was not found.");
  const accounts = await accountsOf(ref), invites = await db.collection("invites").where("gameId", "==", gameId).get();
  for (const uid of accounts) await unlist(db, uid, gameId).catch(e => console.error("Daily Siege: unlisting a deleted game failed", gameId, uid, e));
  const b = db.batch(); invites.forEach(d => b.delete(d.ref)); await b.commit(); // the links stop working first
  await db.recursiveDelete(ref); // the game and everything under it: members, players and their private state and orders, battles, reports
  return { deleted: true, accounts: accounts.length };
}

async function leaveGame(db, gameId, uid) {
  const ref = db.collection("games").doc(gameId), snap = await ref.get();
  if (!snap.exists) throw failed("This game was not found.");
  if (snap.get("host") === uid) throw failed("You're the host: end or delete the war instead.");
  const mem = await ref.collection("members").doc(uid).get();
  if (!mem.exists) throw failed("You're not in this game.");
  const seat = mem.get("seat") || uid, pub = ref.collection("players").doc(seat), b = db.batch();
  if ((await pub.get()).exists) b.update(pub, { left: true }); // out of the war from the next battle; their battles so far stay in the history
  const accounts = new Set([uid, seat]); // every account tied to this castle: this one, the castle's first account and any replacement
  (await ref.collection("members").where("seat", "==", seat).get()).forEach(d => accounts.add(d.id));
  accounts.forEach(a => b.delete(ref.collection("members").doc(a)));
  await b.commit();
  for (const a of accounts) await unlist(db, a, gameId);
  return { left: true };
}

module.exports = { endWarNow, deleteGame, leaveGame };
