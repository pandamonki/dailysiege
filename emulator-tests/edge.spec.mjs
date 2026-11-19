// Server edge cases, in the Firestore emulator.   npm run test:edge
//  1. The host moves the battle time in the middle of a war.
//  2. A saved battle copies every lord's orders, so it must stay under the database's 1 MB limit per document.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadSim, WORLD_FILES } from "../tools/load-sim.mjs";

const fnRequire = createRequire(new URL("../functions/package.json", import.meta.url));
const { initializeApp, deleteApp } = fnRequire("firebase-admin/app");
const { getFirestore, Timestamp } = fnRequire("firebase-admin/firestore");
const { resolveDue } = createRequire(import.meta.url)("../functions/lib/resolve.js");
const { clockFor } = createRequire(import.meta.url)("../functions/lib/clock.js");

const sim = loadSim({ extraFiles: [...WORLD_FILES, "js/dev/goldenCases.js"] });
const { addDays, lockInstant } = { addDays: sim.get("addDays"), lockInstant: sim.get("lockInstant") };
const D1 = "2026-11-10", LORDS = 4, uids = [...Array(LORDS)].map((_, i) => "lord" + i);
let app, db;

async function makeGame(id, lockHour = 20) {
  const cfg = { tz: "UTC", lockHour, lobby: true, lobbyEnds: Date.parse(addDays(D1, -1) + "T12:00:00Z"), startDate: D1, createdAt: 1, host: uids[0], war: 1, inviteCode: "edge-invite-code", maxPlayers: 10 };
  const ref = db.collection("games").doc(id), c = clockFor(cfg, null), b = db.batch();
  b.set(ref, { ...cfg, planDay: c.planDay, nextPlanDay: c.nextPlanDay, nextLockAt: Timestamp.fromMillis(c.nextLockAt), lockAfter: Timestamp.fromMillis(c.lockAfter), clockWar: 1 });
  uids.forEach((u, i) => {
    const p = ref.collection("players").doc(u);
    b.set(p, { fromWeek: "0000-00-00", joinedAt: 1000 + i, nick: "Lord " + i, real: "", pending: false, war: 1 });
    b.set(p.collection("private").doc("state"), { week: D1, day: D1, cls: "warrior", gold: 300 });
  });
  await b.commit();
  return ref;
}
// what keepGameClock does after the host saves new settings
async function hostSaves(ref, patch, now) {
  await ref.update(patch);
  const after = (await ref.get()).data(), want = clockFor(after, { planDay: after.planDay, clockWar: after.clockWar }, { now });
  await ref.update({ planDay: want.planDay, nextPlanDay: want.nextPlanDay, nextLockAt: Timestamp.fromMillis(want.nextLockAt), lockAfter: Timestamp.fromMillis(want.lockAfter) });
}
function orders(seat, day, extra = {}) {
  const g = sim.run("goldenCase(50)").plans[seat];
  return JSON.parse(JSON.stringify({ ...g, pieces: g.pieces.filter(pc => !pc.merc), cls: "warrior", targets: uids.filter((_, k) => k !== seat), offers: {}, replies: {}, terms: {}, bids: {}, breaks: [], pbetray: {}, sealed: true, war: 1, ...extra }));
}

before(() => { app = initializeApp({ projectId: "demo-dailysiege" }, "edge-test"); db = getFirestore(app); });
after(() => deleteApp(app));

test("battle time moved later: today's battle waits for the new time", async () => {
  const ref = await makeGame("edgeLater000000001"), now = lockInstant(D1, "UTC", 15); // 3 pm, battle at 8 pm
  await hostSaves(ref, { lockHour: 22 }, now);
  assert.equal((await ref.get()).get("nextLockAt").toMillis(), lockInstant(D1, "UTC", 22));
  assert.deepEqual(await resolveDue(db, ref.id, { now: lockInstant(D1, "UTC", 21) }), [], "not fought at the old time");
  assert.equal((await resolveDue(db, ref.id, { now: lockInstant(D1, "UTC", 22) + 6e4 })).length, 1, "fought at the new time");
});

test("battle time moved earlier, still ahead: today's battle comes sooner and stays on today", async () => {
  const ref = await makeGame("edgeEarly000000001"), now = lockInstant(D1, "UTC", 10);
  await hostSaves(ref, { lockHour: 12 }, now);
  const g = (await ref.get()).data();
  assert.equal(g.planDay, D1); assert.equal(g.nextLockAt.toMillis(), lockInstant(D1, "UTC", 12));
});

test("battle time moved earlier to an hour already past today: what happens", async () => {
  const ref = await makeGame("edgePast0000000001"), now = lockInstant(D1, "UTC", 15); // 3 pm, battle was due at 8 pm
  await hostSaves(ref, { lockHour: 12 }, now); // the host picks noon, which has already gone
  const g = (await ref.get()).data();
  console.log("  after the change: planning", g.planDay, "lock", new Date(g.nextLockAt.toMillis()).toISOString(), "now", new Date(now).toISOString());
  const fought = await resolveDue(db, ref.id, { now: now + 5 * 6e4 }); // the next five-minute sweep
  console.log("  the next sweep fought:", JSON.stringify(fought));
  assert.equal(fought.length, 1, "today's battle is fought at once, five hours early");
});

test("a war-sized battle is far under the 1 MB limit", async () => {
  const ref = await makeGame("edgeSize0000000001", 0), b = db.batch();
  uids.forEach((u, s) => b.set(ref.collection("players").doc(u).collection("orders").doc(D1), orders(s, D1)));
  await b.commit();
  assert.equal((await resolveDue(db, ref.id, { now: lockInstant(D1, "UTC", 0) + 6e4, maxDays: 1 })).length, 1);
  const kb = Buffer.byteLength(JSON.stringify((await ref.collection("battles").doc(D1).get()).data())) / 1024;
  console.log(`  saved battle: ${kb.toFixed(1)} KB`);
  assert.ok(kb < 200);
});

test("two lords with oversized orders: what happens to the battle", async () => {
  const ref = await makeGame("edgeHuge0000000001", 0), b = db.batch(), junk = "x".repeat(600 * 1024); // each order alone is legal (under 1 MB)
  uids.forEach((u, s) => b.set(ref.collection("players").doc(u).collection("orders").doc(D1), orders(s, D1, s < 2 ? { rules: [{ note: junk }] } : {})));
  await b.commit();
  let err = null, fought = null;
  try { fought = await resolveDue(db, ref.id, { now: lockInstant(D1, "UTC", 0) + 6e4, maxDays: 1 }); } catch (e) { err = e; }
  console.log("  result:", err ? "error: " + String(err.message).slice(0, 160) : JSON.stringify(fought));
  console.log("  game still planning:", (await ref.get()).get("planDay"), "battle saved:", (await ref.collection("battles").doc(D1).get()).exists);
});
