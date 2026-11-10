// Daily Siege server functions.
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { clockFor } = require("./lib/clock");
const { REGION } = require("./region");

initializeApp();
// maxInstances keeps a runaway bug from scaling up costs; this game needs one instance at a time.
setGlobalOptions({ region: REGION, maxInstances: 2, memory: "256MiB", timeoutSeconds: 60 });

const CLOCK_KEYS = ["planDay", "nextPlanDay", "nextLockAt", "lockAfter", "clockWar"];

// Keeps a game's clock fields right whenever its settings change (war begins, battle time moved,
// new war started). Players cannot write these fields; the security rules use them to freeze orders.
exports.keepGameClock = onDocumentWritten("games/{gameId}", async event => {
  const after = event.data && event.data.after && event.data.after.exists ? event.data.after.data() : null;
  if (!after) return;
  const prev = { planDay: after.planDay, clockWar: after.clockWar };
  const want = clockFor(after, prev);
  const patch = {};
  if (!want) { for (const k of CLOCK_KEYS) if (after[k] !== undefined) patch[k] = FieldValue.delete(); }
  else {
    const ms = v => (v && typeof v.toMillis === "function" ? v.toMillis() : v);
    for (const k of CLOCK_KEYS) { const v = want[k]; if (ms(after[k]) !== v) patch[k] = k === "nextLockAt" || k === "lockAfter" ? Timestamp.fromMillis(v) : v; }
  }
  if (Object.keys(patch).length) await getFirestore().doc(event.data.after.ref.path).update(patch); // the follow-up run finds nothing to change
});
