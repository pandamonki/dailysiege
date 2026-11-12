// Daily Siege server functions.
//
//   keepGameClock       keeps each game's planning day and lock times right when its settings change
//   resolveDueBattles   every 5 minutes: fights the battle of every game whose lock time has passed
//   resolveNow          the host's "Resolve now" button: the same, at once, for one game (for recovery)
//   setBots             the host fills or empties seats with bot lords while registration is open
//   reassignSeat        the host gives a lord's castle to that lord's new account (lost phone)
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { clockFor } = require("./lib/clock");
const { getMessaging } = require("firebase-admin/messaging");
const { resolveDue, resolveAllDue, explainNotDue, reassignSeat, remindAll } = require("./lib/resolve");
const { setBots } = require("./lib/bots");
const { REGION, TRIGGER_REGION } = require("./region");

initializeApp();
// maxInstances keeps a runaway bug from scaling up costs; this game needs one instance at a time.
setGlobalOptions({ region: REGION, maxInstances: 2, memory: "512MiB", timeoutSeconds: 120 });

// (remindedFor, set when the day's reminder goes out, is also server-owned but is not part of the clock)
const CLOCK_KEYS = ["planDay", "nextPlanDay", "nextLockAt", "lockAfter", "clockWar", "startDate"];

// Keeps a game's clock fields right whenever its settings change (war begins, battle time moved,
// new war started). Players cannot write these fields; the security rules use them to freeze orders.
exports.keepGameClock = onDocumentWritten({ document: "games/{gameId}", region: TRIGGER_REGION, memory: "256MiB", timeoutSeconds: 60 }, async event => {
  const after = event.data && event.data.after && event.data.after.exists ? event.data.after.data() : null;
  if (!after) return;
  const before = event.data.before && event.data.before.exists ? event.data.before.data() : null;
  const want = clockFor(after, { planDay: after.planDay, clockWar: after.clockWar }, { before });
  const patch = {};
  if (!want) { for (const k of CLOCK_KEYS) if (after[k] !== undefined) patch[k] = FieldValue.delete(); }
  else {
    const ms = v => (v && typeof v.toMillis === "function" ? v.toMillis() : v);
    for (const k of CLOCK_KEYS) { const v = want[k]; if (v === undefined) { if (k === "startDate" && after[k] !== undefined) patch[k] = FieldValue.delete(); continue; } if (ms(after[k]) !== v) patch[k] = k === "nextLockAt" || k === "lockAfter" ? Timestamp.fromMillis(v) : v; }
  }
  if (Object.keys(patch).length) await getFirestore().doc(event.data.after.ref.path).update(patch); // the follow-up run finds nothing to change
});

// One push notification to one device. The message is data only; the game's service worker turns it into a notification.
const send = (token, msg) => getMessaging().send({ token, data: { title: msg.title, body: msg.body, tag: msg.tag, link: msg.link }, webpush: { headers: { Urgency: "high", TTL: "43200" } } });

// The one scheduled job: a battle is fought within five minutes of its lock time, and an hour before a lock
// the lords who have not sealed get a reminder.
exports.resolveDueBattles = onSchedule({ schedule: "every 5 minutes", retryCount: 0 }, async () => {
  const out = await resolveAllDue(getFirestore(), { send });
  if (Object.keys(out).length) console.log("Daily Siege battles", JSON.stringify(out));
  const rem = await remindAll(getFirestore(), send).catch(e => { console.error("Daily Siege reminders failed", e); return {}; });
  if (Object.keys(rem).length) console.log("Daily Siege reminders", JSON.stringify(rem));
});

async function hostOnly(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const gameId = String((request.data && request.data.gameId) || "");
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(gameId)) throw new HttpsError("invalid-argument", "Which game?");
  const snap = await getFirestore().collection("games").doc(gameId).get();
  if (!snap.exists || snap.get("host") !== request.auth.uid) throw new HttpsError("permission-denied", "Only the host can do that.");
  return gameId;
}

exports.resolveNow = onCall(async request => {
  const gameId = await hostOnly(request);
  try { const days = await resolveDue(getFirestore(), gameId, { send }); return { days, note: days.length ? "" : await explainNotDue(getFirestore(), gameId) }; }
  catch (e) { console.error("resolveNow", gameId, e); throw new HttpsError("internal", "The battle could not be fought: " + ((e && e.message) || "error")); }
});

exports.reassignSeat = onCall(async request => {
  const gameId = await hostOnly(request), { fromUid, toUid } = request.data || {}; // fromUid: the seat (the lord as listed in the game)
  if (typeof fromUid !== "string" || typeof toUid !== "string" || !fromUid || !toUid || fromUid === toUid) throw new HttpsError("invalid-argument", "Choose the lord and their new account.");
  try { await reassignSeat(getFirestore(), gameId, fromUid, toUid); return { ok: true }; }
  catch (e) { throw new HttpsError("failed-precondition", (e && e.message) || "Could not move the seat."); }
});

exports.setBots = onCall(async request => {
  const gameId = await hostOnly(request), data = request.data || {}, n = Number(data.count), removeId = typeof data.removeId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(data.removeId) ? data.removeId : null;
  if (!removeId && (!Number.isFinite(n) || n < 0 || n > 12)) throw new HttpsError("invalid-argument", "How many bots?");
  try { return await setBots(getFirestore(), gameId, n, { removeId }); }
  catch (e) { throw new HttpsError("failed-precondition", (e && e.message) || "Could not change the bots."); }
});
