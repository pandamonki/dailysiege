// A full seven-day war fought by the server, in the Firebase emulators.   npm run test:war
// Ten lords sign up (the first eight get castles until the cap is raised), orders go in each day,
// the server fights each battle once its lock has passed, and a real browser signed in as one of
// the lords replays every battle and must arrive at the server's result hash.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadSim, WORLD_FILES } from "../tools/load-sim.mjs";

const fnRequire = createRequire(new URL("../functions/package.json", import.meta.url));
const { initializeApp, deleteApp } = fnRequire("firebase-admin/app");
const { getFirestore, Timestamp } = fnRequire("firebase-admin/firestore");
const { getAuth } = fnRequire("firebase-admin/auth");
const { resolveDue, resolveAllDue } = createRequire(import.meta.url)("../functions/lib/resolve.js");
const { clockFor } = createRequire(import.meta.url)("../functions/lib/clock.js");
let pw; try { pw = createRequire(import.meta.url)("playwright"); } catch { pw = createRequire("/")("playwright"); }

const sim = loadSim({ extraFiles: [...WORLD_FILES, "js/dev/goldenCases.js"] });
const { addDays, lockInstant } = { addDays: sim.get("addDays"), lockInstant: sim.get("lockInstant") };
const GAME = "wargame0000000000001", LORDS = 10, SEATS = 8, uids = [...Array(LORDS)].map((_, i) => "bot" + String(i + 1).padStart(2, "0"));
const today = new Date().toISOString().slice(0, 10), D1 = addDays(today, -6), days = [...Array(7)].map((_, i) => addDays(D1, i)); // day 7 is today; every lock (00:00 UTC) is behind us
let app, db, browser;
const cfg = { tz: "UTC", lockHour: 0, lobby: true, lobbyEnds: Date.parse(addDays(D1, -1) + "T12:00:00Z"), startDate: D1, createdAt: 1, host: uids[0], war: 1, inviteCode: "war-invite-code", maxPlayers: 8 };
const gameRef = () => db.collection("games").doc(GAME);

// One lord's orders for a day: taken from a golden battle with the same number of lords, so they are varied and legal.
function ordersFor(dayIndex, seat) {
  const day = days[dayIndex], g = sim.run(`goldenCase(${6 + 7 * dayIndex})`).plans[seat], rnd = sim.get("mulberry")(1000 * dayIndex + seat);
  const others = uids.slice(0, SEATS).filter((_, k) => k !== seat), offers = {}, bids = {};
  if (rnd() < .5) offers[others[Math.floor(rnd() * others.length)]] = { gold: 40, day: addDays(day, rnd() < .7 ? 0 : -1) };
  if (dayIndex >= 3 && rnd() < .6) { const ids = Object.keys(sim.get("MERCS")), m = ids[Math.floor(rnd() * ids.length)]; bids[m] = { gold: sim.get("MERCS")[m].min + 10 * seat, day }; }
  return JSON.parse(JSON.stringify({ cls: ["warrior", "mage", "archer", "shaman", "rogue"][seat % 5], ranks: g.ranks, picks: g.picks, triggers: g.triggers, gear: g.gear, defences: g.defences, stance: g.stance, prio: g.prio, rules: g.rules,
    pieces: g.pieces.filter(pc => !pc.merc), items: g.items, castleTier: g.castleTier, banner: { pat: "solid", c1: sim.get("SEAT_COLORS")[seat], c2: "#ecdcb4", em: "none" }, targets: others.filter(() => rnd() < .7), tmode: g.tmode, heading: g.heading,
    offers, replies: Object.fromEntries(others.map(o => [o, rnd() < .6 ? "accept" : "refuse"])), terms: {}, bids, breaks: [], pbetray: rnd() < .3 ? { [others[0]]: sim.get("BETRAY_WHEN")[1] } : {}, blessing: g.blessing, ultArm: g.ultArm, formation: g.formation,
    sealed: true, war: 1 }));
}
async function seedOrders(dayIndex) { // lords 3 and 6 skip some days (their last sealed orders carry forward); lord 8 never seals at all
  const batch = db.batch();
  for (let s = 0; s < SEATS; s++) { if (s === 7 || (s === 2 && dayIndex % 2) || (s === 5 && dayIndex === 4)) continue; batch.set(gameRef().collection("players").doc(uids[s]).collection("orders").doc(days[dayIndex]), ordersFor(dayIndex, s)); }
  await batch.commit();
}

before(async () => {
  app = initializeApp({ projectId: "demo-dailysiege" }, "war-test"); db = getFirestore(app);
  const c = clockFor(cfg, null), batch = db.batch();
  batch.set(gameRef(), { ...cfg, planDay: c.planDay, nextPlanDay: c.nextPlanDay, nextLockAt: Timestamp.fromMillis(c.nextLockAt), lockAfter: Timestamp.fromMillis(c.lockAfter), clockWar: 1 });
  uids.forEach((u, i) => {
    const p = gameRef().collection("players").doc(u), banner = { pat: "solid", c1: sim.get("SEAT_COLORS")[i % 8], c2: "#ecdcb4", em: "none" };
    batch.set(gameRef().collection("members").doc(u), { invite: cfg.inviteCode, at: 1 });
    batch.set(p, { fromWeek: "0000-00-00", joinedAt: 1000 + i, nick: "Lord " + (i + 1), real: "Bot " + (i + 1), pending: false, banner, hasRapier: false, sealedFor: null, week: D1, war: 1 });
    batch.set(p.collection("private").doc("state"), { week: D1, day: D1, cls: ["warrior", "mage", "archer", "shaman", "rogue"][i % 5], banner, gold: 300, owned: [], items: [] });
    batch.set(db.collection("users").doc(u), { gameId: GAME });
  });
  await batch.commit();
  await Promise.all(uids.slice(0, 2).map(u => getAuth(app).createUser({ uid: u, email: u + "@example.com" }).catch(() => {})));
});
after(async () => { if (browser) await browser.close(); await deleteApp(app); });

test("the clock starts on day 1", async () => {
  const g = (await gameRef().get()).data();
  assert.equal(g.planDay, D1); assert.equal(g.nextLockAt.toMillis(), Date.parse(D1 + "T00:00:00Z"));
});

test("nothing is fought before the lock", async () => {
  await seedOrders(0);
  assert.deepEqual(await resolveDue(db, GAME, { now: lockInstant(D1, "UTC", 0) - 1000 }), []);
  assert.equal((await gameRef().collection("battles").get()).size, 0);
});

test("two servers racing for the same battle fight it exactly once", async () => {
  const now = lockInstant(D1, "UTC", 0) + 60000;
  const [a, b] = await Promise.all([resolveDue(db, GAME, { now, maxDays: 1 }), resolveDue(db, GAME, { now, maxDays: 1 })]);
  assert.equal(a.length + b.length, 1, "one of them claims the day, the other finds it done");
  assert.equal((await gameRef().collection("battles").get()).size, 1);
  assert.equal((await gameRef().get()).get("planDay"), days[1]);
});

test("the server fights all seven days, each once its lock has passed", async () => {
  for (let d = 1; d < 7; d++) {
    await seedOrders(d);
    const now = lockInstant(days[d], "UTC", 0) + 60000;
    assert.deepEqual(await resolveDue(db, GAME, { now }), [{ day: days[d], fought: true, lords: SEATS }], "day " + (d + 1));
    assert.deepEqual(await resolveDue(db, GAME, { now }), [], "asking again does nothing");
  }
  const g = (await gameRef().get()).data();
  assert.equal(g.planDay, addDays(D1, 7)); assert.equal(g.nextLockAt.toMillis(), lockInstant(addDays(D1, 7), "UTC", 0));
});

let battles;
test("every battle is saved with results for the eight seated lords, in war order", async () => {
  battles = Object.fromEntries((await gameRef().collection("battles").get()).docs.map(d => [d.id, d.data()]));
  assert.deepEqual(Object.keys(battles).sort(), days);
  days.forEach((day, i) => {
    const b = battles[day];
    assert.equal(b.day, i + 1); assert.equal(b.week, D1); assert.equal(b.war, 1);
    assert.deepEqual(b.results.map(r => r.pid).sort(), uids.slice(0, SEATS), "lords 9 and 10 wait for a seat");
    assert.match(b.resultHash, /^[0-9a-f]{16}$/);
    assert.equal(b.inputs.plans.length, SEATS);
    assert.equal(b.inputs.final, i === 6);
    assert.ok(JSON.stringify(b).length < 200000, "battle record stays far below the 1 MiB document limit: " + JSON.stringify(b).length);
  });
  console.log("battle record sizes (bytes):", days.map(d => JSON.stringify(battles[d]).length).join(", "));
});

test("the game's rules held across the war", () => {
  // carry-forward: lord 3 sealed nothing on day 2, so day 1's orders are fought again
  const seat = (day, u) => battles[day].inputs.plans.find(p => p.pid === u);
  assert.deepEqual(seat(days[1], uids[2]).gear, ordersFor(0, 2).gear);
  assert.equal(seat(days[1], uids[2]).noOrders, undefined);
  // a lord who never seals fights with stand-in orders, marked as such
  days.forEach(d => assert.equal(seat(d, uids[7]).noOrders, true));
  // heroes level up from battle to battle
  assert.equal(seat(days[0], uids[0]).level, 1); assert.ok(seat(days[6], uids[0]).level > seat(days[1], uids[0]).level);
  // alliances and mercenaries happened, and the last day ends them all
  assert.ok(days.some(d => battles[d].pairs.length > 0), "some alliance formed");
  assert.ok(days.slice(3).some(d => Object.keys(battles[d].mercs).length > 0), "some mercenaries were hired from day 4");
  assert.equal(battles[days[6]].pairs.length, 0);
  // from day 2 the standings going in are recorded, so the bounty on the top three is the same in the official fight and in replays
  assert.deepEqual(battles[days[0]].inputs.ranks, {}); assert.equal(Object.keys(battles[days[3]].inputs.ranks).length, SEATS);
  assert.ok(days.slice(0, 3).every(d => Object.keys(battles[d].mercs).length === 0));
});

test("replaying each battle from its saved orders gives the server's result (Node)", () => {
  for (const day of days) {
    const b = battles[day], plans = JSON.parse(JSON.stringify(b.inputs.plans)); plans.feuds = b.inputs.feuds; plans.mercs = b.mercs;
    const res = sim.get("runBattle")(plans, sim.get("daySeed")(day), { N: b.inputs.N, finalDay: b.inputs.final, ultV2: b.inputs.ultV2, ranks: b.inputs.ranks }); // a full replay run, as a phone does
    assert.equal(sim.get("battleHash")(res), b.resultHash, day);
  }
});

test("a browser signed in as one of the lords replays all seven battles to the server's result", async () => {
  browser = await pw.chromium.launch();
  const p = await (await browser.newContext()).newPage(), errors = []; p.on("pageerror", e => errors.push(String(e)));
  await p.goto("http://127.0.0.1:5000/?emulator=1");
  await p.waitForFunction(() => window.DS && DS.available === true, null, { timeout: 30000 });
  const token = await getAuth(app).createCustomToken(uids[1]);
  await p.evaluate(t => firebase.auth().signInWithCustomToken(t), token);
  await p.waitForFunction(() => LIVE.uid && LIVE.playersLoaded && Object.keys(LIVE.battles).length === 7, null, { timeout: 30000 });
  const got = await p.evaluate(() => Object.keys(LIVE.battles).sort().map(day => { const sv = savedBattle(day), res = runBattle(sv.plans, daySeed(day), { N: sv.N, finalDay: sv.final, ultV2: sv.ultV2, ranks: sv.ranks });
    return { day, same: battleHash(res) === LIVE.battles[day].resultHash, winner: res.results[0].pid === LIVE.battles[day].results[0].pid }; }));
  assert.deepEqual(got, days.map(day => ({ day, same: true, winner: true })));
  // and what this lord's device knows of a rival is exactly what was fought, never today's orders
  const rival = await p.evaluate(u => LIVE.players[u], uids[0]);
  assert.deepEqual(Object.keys(rival.plans).sort(), days);
  assert.equal(rival.state.gold, undefined);
  // the game's own "watch the battle" path runs, and raises no mismatch
  await p.evaluate(day => watchLiveBattle(day, "results"), days[3]);
  await p.waitForFunction(() => replay && replay.res, null, { timeout: 30000 });
  assert.equal(await p.evaluate(() => (window.DS.mismatches || []).length), 0);
  assert.deepEqual(errors, []);
});

test("the scheduler's sweep finds only games that are due", async () => {
  assert.deepEqual(await resolveAllDue(db, { now: lockInstant(addDays(D1, 7), "UTC", 0) - 1000 }), {});
});
