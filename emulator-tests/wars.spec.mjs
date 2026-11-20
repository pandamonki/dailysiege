// Ending, deleting and leaving a war (functions/lib/wars.js), run against the Firestore emulator with the server's own code.
//   firebase emulators:exec --only firestore --project demo-dailysiege "node --test emulator-tests/wars.spec.mjs"
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(new URL("../functions/package.json", import.meta.url)); // the server's own packages
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
let db, wars;

before(() => { initializeApp({ projectId: "demo-dailysiege" }); db = getFirestore(); wars = require("./lib/wars.js"); });

// a game in the middle of war 1: a host, two lords (one playing from a replacement account), a bot, a fought battle and an invite
async function makeGame(id) {
  const g = db.collection("games").doc(id), b = db.batch();
  b.set(g, { host: "host1", war: 1, lobby: false, planDay: "2026-11-20", startDate: "2026-11-18", inviteCode: "code" + id, tz: "UTC", lockHour: 20 });
  for (const uid of ["host1", "lordA", "lordB", "bot1"]) b.set(g.collection("players").doc(uid), { nick: uid, joinedAt: 1, fromWeek: "2026-11-18", ...(uid === "bot1" ? { bot: true } : {}) });
  for (const uid of ["host1", "lordA", "lordB"]) b.set(g.collection("members").doc(uid), { invite: "code" + id, at: 1 });
  b.set(g.collection("members").doc("lordB2"), { invite: "code" + id, at: 2, seat: "lordB" }); // lordB's new phone
  b.set(g.collection("players").doc("lordA").collection("private").doc("state"), { gold: 100 });
  b.set(g.collection("battles").doc("2026-11-18"), { war: 1, results: [{ pid: "host1", points: 9 }, { pid: "lordA", points: 5 }, { pid: "lordB", points: 3 }] });
  b.set(db.collection("invites").doc("code" + id), { gameId: id, createdAt: 1 });
  for (const uid of ["host1", "lordA", "lordB", "lordB2"]) b.set(db.collection("users").doc(uid), { games: [id, "other-game"], gameId: id }, { merge: true });
  await b.commit(); return g;
}

test("leaving: the castle is out, every account on that seat loses access, and the war is off the list", async () => {
  const g = await makeGame("leave-game-1");
  await wars.leaveGame(db, "leave-game-1", "lordB2"); // leaving from the replacement account
  assert.equal((await g.collection("players").doc("lordB").get()).get("left"), true);
  assert.equal((await g.collection("players").doc("lordB").get()).get("kicked"), undefined, "leaving is not being removed");
  assert.equal((await g.collection("members").doc("lordB2").get()).exists, false);
  assert.equal((await g.collection("members").doc("lordB").get()).exists, false, "the seat's other account goes too");
  const u = (await db.collection("users").doc("lordB2").get()).data();
  assert.deepEqual(u.games, ["other-game"]); assert.equal(u.gameId, undefined);
  assert.equal((await g.collection("battles").doc("2026-11-18").get()).exists, true, "battles stay");
  assert.equal((await g.collection("members").doc("lordA").get()).exists, true, "other lords are untouched");
});

test("leaving is refused for the host and for someone not in the game", async () => {
  await makeGame("leave-game-2");
  await assert.rejects(wars.leaveGame(db, "leave-game-2", "host1"), /host/);
  await assert.rejects(wars.leaveGame(db, "leave-game-2", "stranger"), /not in this game/);
  await assert.rejects(wars.leaveGame(db, "no-such-game", "lordA"), /not found/);
});

test("ending early: the hall of fame comes from the battles so far, registration reopens, nothing is deleted", async () => {
  const g = await makeGame("end-game-1");
  assert.deepEqual(await wars.endWarNow(db, "end-game-1", { now: 5000 }), { ended: 1 });
  const cfg = (await g.get()).data();
  assert.equal(cfg.war, 2); assert.equal(cfg.lobby, true);
  assert.deepEqual(cfg.hall.map(h => [h.war, h.top.map(t => t.pid)]), [[1, ["host1", "lordA", "lordB"]]]);
  assert.equal((await g.collection("battles").doc("2026-11-18").get()).exists, true);
  assert.equal((await g.collection("players").doc("lordA").collection("private").doc("state").get()).exists, true);
  await assert.rejects(wars.endWarNow(db, "end-game-1"), /No war is under way/, "can't end it twice");
});

test("deleting: the game and everything in it is gone, the invite is dead, and it is off every list", async () => {
  const g = await makeGame("del-game-1");
  const r = await wars.deleteGame(db, "del-game-1");
  assert.equal(r.deleted, true);
  assert.equal((await g.get()).exists, false);
  for (const sub of ["players", "members", "battles"]) assert.equal((await g.collection(sub).get()).size, 0, sub);
  assert.equal((await g.collection("players").doc("lordA").collection("private").doc("state").get()).exists, false, "private state too");
  assert.equal((await db.collection("invites").doc("codedel-game-1").get()).exists, false);
  for (const uid of ["host1", "lordA", "lordB", "lordB2"]) { const u = (await db.collection("users").doc(uid).get()).data(); assert.deepEqual(u.games, ["other-game"], uid); assert.equal(u.gameId, undefined, uid); }
  assert.equal((await db.collection("games").doc("leave-game-1").get()).exists, true, "other games are untouched");
  await assert.rejects(wars.deleteGame(db, "del-game-1"), /not found/);
});
