// A full seven-day war fought by the server, in the Firebase emulators.   npm run test:war
// Twelve lords sign up for a ten-seat war (the last two wait for a seat), orders go in each day,
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
const resolve = createRequire(import.meta.url)("../functions/lib/resolve.js"), { resolveDue, resolveAllDue, remindAll } = resolve;
const { clockFor } = createRequire(import.meta.url)("../functions/lib/clock.js");
let pw; try { pw = createRequire(import.meta.url)("playwright"); } catch { pw = createRequire("/")("playwright"); }

const sim = loadSim({ extraFiles: [...WORLD_FILES, "js/dev/goldenCases.js"] });
const { addDays, lockInstant } = { addDays: sim.get("addDays"), lockInstant: sim.get("lockInstant") };
const GAME = "wargame0000000000001", LORDS = 12, SEATS = 10, uids = [...Array(LORDS)].map((_, i) => "bot" + String(i + 1).padStart(2, "0"));
const today = new Date().toISOString().slice(0, 10), D1 = addDays(today, -6), days = [...Array(7)].map((_, i) => addDays(D1, i)); // day 7 is today; every lock (00:00 UTC) is behind us
let app, db, browser;
const cfg = { tz: "UTC", lockHour: 0, lobby: true, lobbyEnds: Date.parse(addDays(D1, -1) + "T12:00:00Z"), startDate: D1, createdAt: 1, host: uids[0], war: 1, inviteCode: "war-invite-code", maxPlayers: SEATS };
const gameRef = () => db.collection("games").doc(GAME);
// Notifications: lord 1 has two devices, lord 2 one, lord 3 a device that no longer exists. Sending is recorded, not real.
const TOKENS = { bot01: ["phone-1a", "phone-1b"], bot02: ["phone-2"], bot03: ["dead-phone"] }, pushes = [];
const send = async (token, msg) => { if (token === "dead-phone") throw Object.assign(new Error("gone"), { code: "messaging/registration-token-not-registered" }); pushes.push({ token, ...msg }); };

// One lord's orders for a day: taken from a golden battle with the same number of lords (ten), so they are varied and legal.
// golden cases 50 to 61 are the 9 to 12 lord battles; later ones are the skill-tree cases, which have fewer lords
function ordersFor(dayIndex, seat) {
  const day = days[dayIndex], gp = sim.run(`goldenCase(${50 + dayIndex})`).plans, g = gp[seat % gp.length], rnd = sim.get("mulberry")(1000 * dayIndex + seat);
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
    const p = gameRef().collection("players").doc(u), banner = { pat: "solid", c1: sim.get("SEAT_COLORS")[i % 12], c2: "#ecdcb4", em: "none" };
    batch.set(gameRef().collection("members").doc(u), { invite: cfg.inviteCode, at: 1 });
    batch.set(p, { fromWeek: "0000-00-00", joinedAt: 1000 + i, nick: "Lord " + (i + 1), real: "Bot " + (i + 1), pending: false, banner, hasRapier: false, sealedFor: null, week: D1, war: 1 });
    batch.set(p.collection("private").doc("state"), { week: D1, day: D1, cls: ["warrior", "mage", "archer", "shaman", "rogue"][i % 5], banner, gold: 300, owned: [], items: [] });
    batch.set(db.collection("users").doc(u), { gameId: GAME, ...(TOKENS[u] ? { fcmTokens: TOKENS[u] } : {}) });
  });
  await batch.commit();
  await Promise.all(uids.slice(0, 2).map(u => getAuth(app).createUser({ uid: u, email: u + "@example.com" }).catch(() => {})));
});
after(async () => { if (browser) await browser.close(); await deleteApp(app); });

test("the clock starts on day 1", async () => {
  const g = (await gameRef().get()).data();
  assert.equal(g.planDay, D1); assert.equal(g.nextLockAt.toMillis(), Date.parse(D1 + "T00:00:00Z"));
});

test("once the war is under way its lords are locked, so the count cannot change mid-war", async () => {
  await resolve.lockRoster(gameRef(), (await gameRef().get()).data());
  const g = (await gameRef().get()).data();
  assert.ok(g.roster && g.roster.week === D1 && g.roster.uids.length >= 2, "the roster is locked with the war's lords");
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

test("the server fights days 2 to 6, each once its lock has passed", async () => {
  for (let d = 1; d < 6; d++) {
    await seedOrders(d);
    const now = lockInstant(days[d], "UTC", 0) + 60000;
    assert.deepEqual(await resolveDue(db, GAME, { now, send }), [{ day: days[d], fought: true, lords: SEATS }], "day " + (d + 1));
    assert.deepEqual(await resolveDue(db, GAME, { now }), [], "asking again does nothing");
  }
  const g = (await gameRef().get()).data();
  assert.equal(g.planDay, days[6]); assert.equal(g.nextLockAt.toMillis(), lockInstant(days[6], "UTC", 0));
});

test("an hour before the lock, only lords who have not sealed are reminded, once", async () => {
  const D7 = days[6], lock = lockInstant(D7, "UTC", 0), before = pushes.length;
  assert.deepEqual(await remindAll(db, send, { now: lock - 3 * 3600e3 }), {}, "too early");
  await gameRef().collection("players").doc("bot02").update({ sealedFor: D7 }); // lord 2 has sealed
  const out = await remindAll(db, send, { now: lock - 30 * 60e3 }), sent = pushes.slice(before);
  assert.equal(out[GAME].sent, 2); assert.ok(!out[GAME].reminded.includes("bot02")); assert.equal(out[GAME].reminded.length, SEATS - 1);
  assert.deepEqual(sent.map(p => p.token).sort(), ["phone-1a", "phone-1b"]);
  assert.match(sent[0].body, /not sealed yet.*30 minutes/);
  assert.deepEqual(await remindAll(db, send, { now: lock - 20 * 60e3 }), {}, "never twice for the same day");
  pushes.splice(before); // the battle-alert counts below are only about results
});

test("the seventh battle ends the war: the winners go into the hall of fame and registration opens for the next war", async () => {
  await seedOrders(6);
  const now = lockInstant(days[6], "UTC", 0) + 60000;
  assert.deepEqual(await resolveDue(db, GAME, { now, send }), [{ day: days[6], fought: true, lords: SEATS }], "day 7");
  assert.deepEqual(await resolveDue(db, GAME, { now }), [], "asking again does nothing");
  const g = (await gameRef().get()).data(), all = (await gameRef().collection("battles").get()).docs.map(d => d.data()), pts = {};
  all.forEach(b => b.results.forEach(r => { pts[r.pid] = (pts[r.pid] || 0) + r.points; }));
  assert.equal(g.war, 2); assert.equal(g.lobby, true); assert.equal(g.lobbyEnds, undefined, "registration waits for the host by default");
  assert.equal(g.hall.length, 1); assert.equal(g.hall[0].war, 1); assert.equal(g.hall[0].top.length, 3);
  assert.equal(g.hall[0].top[0].pts, Math.max(...Object.values(pts)), "the war's top scorer is first");
  assert.ok((await gameRef().collection("players").get()).docs.filter(d => !d.data().left).every(d => d.data().fromWeek === "0000-00-00"), "every lord is registered for the next war");
});

let battles;
test("every battle is saved with results for the ten seated lords, in war order", async () => {
  battles = Object.fromEntries((await gameRef().collection("battles").get()).docs.map(d => [d.id, d.data()]));
  assert.deepEqual(Object.keys(battles).sort(), days);
  days.forEach((day, i) => {
    const b = battles[day];
    assert.equal(b.day, i + 1); assert.equal(b.week, D1); assert.equal(b.war, 1);
    assert.deepEqual(b.results.map(r => r.pid).sort(), uids.slice(0, SEATS), "lords 11 and 12 wait for a seat");
    assert.equal(b.inputs.N, 21, "ten lords fight on the 21x21 field");
    assert.equal(new Set(b.inputs.plans.map(p => p.color)).size, SEATS, "every lord has their own colour");
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
  if (days[6] < "2026-11-23") assert.equal(battles[days[6]].pairs.length, 0); // from 23 Nov (finV2) day 7 pacts hold until one alliance is left
  // from day 2 the standings going in are recorded, so the bounty on the top three is the same in the official fight and in replays
  assert.deepEqual(battles[days[0]].inputs.ranks, {}); assert.equal(Object.keys(battles[days[3]].inputs.ranks).length, SEATS);
  assert.ok(days.slice(0, 3).every(d => Object.keys(battles[d].mercs).length === 0));
});

test("replaying each battle from its saved orders gives the server's result (Node)", () => {
  for (const day of days) {
    const b = battles[day], plans = JSON.parse(JSON.stringify(b.inputs.plans)); plans.feuds = b.inputs.feuds; plans.mercs = b.mercs;
    const res = sim.get("runBattle")(plans, sim.get("daySeed")(day), { N: b.inputs.N, finalDay: b.inputs.final, ultV2: b.inputs.ultV2, balV2: b.inputs.balV2, balV3: b.inputs.balV3, fairV1: b.inputs.fairV1, pickV1: b.inputs.pickV1, balV4: b.inputs.balV4, suddenV1: b.inputs.suddenV1, treesV1: b.inputs.treesV1, heroV3: b.inputs.heroV3, dayNo: b.inputs.dayNo, ranks: b.inputs.ranks, twist: b.inputs.twist || null }); // a full replay run, as a phone does
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
  // the war is over, so its battles are the last war's (LIVE.prevWar); replays read them as the war they were fought in
  await p.waitForFunction(() => LIVE.uid && LIVE.playersLoaded && LIVE.prevWar && Object.keys(LIVE.prevWar.battles).length === 7, null, { timeout: 30000 });
  const got = await p.evaluate(() => { const keep = LIVE.battles; LIVE.battles = LIVE.prevWar.battles; try { return Object.keys(LIVE.battles).sort().map(day => { const sv = savedBattle(day), res = runBattle(sv.plans, daySeed(day), { N: sv.N, finalDay: sv.final, ultV2: sv.ultV2, balV2: sv.balV2, balV3: sv.balV3, fairV1: sv.fairV1, pickV1: sv.pickV1, balV4: sv.balV4, suddenV1: sv.suddenV1, treesV1: sv.treesV1, heroV3: sv.heroV3, dayNo: sv.dayNo, ranks: sv.ranks, twist: sv.twist || null });
    return { day, same: battleHash(res) === LIVE.battles[day].resultHash, winner: res.results[0].pid === LIVE.battles[day].results[0].pid }; }); } finally { LIVE.battles = keep; } });
  assert.deepEqual(got, days.map(day => ({ day, same: true, winner: true })));
  // and what this lord's device knows of a rival is exactly what was fought, never today's orders
  const rival = await p.evaluate(u => LIVE.players[u], uids[0]);
  assert.equal((rival.state || {}).gold, undefined);
  // the game's own "watch the battle" path runs, and raises no mismatch
  await p.evaluate(day => watchPrevBattle(day, "results"), days[3]);
  await p.waitForFunction(() => replay && replay.res, null, { timeout: 30000 });
  assert.equal(await p.evaluate(() => (window.DS.mismatches || []).length), 0);
  assert.deepEqual(errors, []);
});

test("after each battle every lord's devices are told the result, and dead devices are forgotten", async () => {
  const day2 = pushes.filter(p => p.title === "Daily Siege: day 2 results");
  assert.deepEqual(day2.map(p => p.token).sort(), ["phone-1a", "phone-1b", "phone-2"]);
  assert.match(day2.find(p => p.token === "phone-2").body, /won the day|You won the day/);
  assert.equal(pushes.filter(p => p.tag === "battle" && p.link === "/?war=" + GAME).length, 6 * 3, "days 2 to 7, three live devices");
  assert.ok(pushes.some(p => /invited you to an alliance/.test(p.body)), "an alliance invitation is mentioned to its recipient");
  assert.ok(!pushes.find(p => p.title.includes("day 7")).body.includes("Tomorrow"), "the final day does not promise a tomorrow");
  assert.deepEqual((await db.collection("users").doc("bot03").get()).get("fcmTokens"), []);
});

test("the scheduler's sweep finds only games that are due", async () => {
  assert.deepEqual(await resolveAllDue(db, { now: lockInstant(addDays(D1, 7), "UTC", 0) - 1000 }), {});
});

// A second war whose dates overlap the first war's saved battles (testing skips can push a war's dates ahead of the calendar):
// its battles must still be fought and saved, never mistaken for the first war's. (This happened in a real game.)
test("a second war fights and saves its own battles even on dates the first war already used", async () => {
  const c2 = { ...cfg, war: 2, startDate: days[0], lobbyEnds: Date.parse(addDays(days[0], -1) + "T12:00:00Z") }, c = clockFor(c2, null);
  await gameRef().update({ war: 2, lobby: true, startDate: days[0], lobbyEnds: c2.lobbyEnds, planDay: c.planDay, nextPlanDay: c.nextPlanDay, nextLockAt: Timestamp.fromMillis(c.nextLockAt), lockAfter: Timestamp.fromMillis(c.lockAfter), clockWar: 2, roster: null });
  const war1 = (await gameRef().collection("battles").doc(days[0]).get()).data();
  assert.equal(war1.war, 1, "the first war's battle is on this date already");
  const out = await resolveDue(db, GAME, { now: lockInstant(days[0], "UTC", 0) + 60000 });
  assert.equal(out[0] && out[0].fought, true, "war 2's first battle is fought");
  const mine = await gameRef().collection("battles").doc(days[0] + "~w2").get();
  assert.ok(mine.exists && mine.data().war === 2, "and saved as war 2's, beside the first war's");
  assert.equal((await gameRef().collection("battles").doc(days[0]).get()).data().resultHash, war1.resultHash, "the first war's battle is untouched");
  const g = (await gameRef().get()).data(); assert.ok(g.roster && g.roster.war === 2, "the second war's lords are locked");
});
