// End-to-end test of the hosted game against the Firebase emulators, driven through real browsers:
// three accounts sign in, register, the war begins, they seal orders, and none can read another's
// private state or today's orders.   npm run test:e2e
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

let pw; try { pw = createRequire(import.meta.url)("playwright"); } catch { pw = createRequire("/")("playwright"); }
const BASE = "http://127.0.0.1:5000/", AUTH = "http://127.0.0.1:9099", PROJECT = "demo-dailysiege";
let browser; const P = {}; // pages by name
const WAIT = { timeout: 30000 };

// Sign in the way a player does: ask for an emailed link, then open it. (The emulator hands the link over directly.)
async function signIn(email, startUrl = BASE + "?emulator=1") {
  const ctx = await browser.newContext(), p = await ctx.newPage();
  p.errors = []; p.on("pageerror", e => p.errors.push(String(e)));
  await p.goto(startUrl);
  await p.waitForFunction(() => window.DS && DS.available === true, null, WAIT);
  await p.evaluate(e => DS.signInEmail(e), email);
  const codes = await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json();
  await p.goto(codes.oobCodes.filter(c => c.email === email).pop().oobLink);
  await p.waitForFunction(() => window.DS && DS.user && LIVE.uid && LIVE.configLoaded && LIVE.playersLoaded, null, WAIT);
  return p;
}
const register = (p, nick, real, join) => p.evaluate(async ([nick, real, join]) => {
  if (join) await joinGame();
  S.ob = 0; sheet = null; renderLobby();
  document.getElementById("mynick").value = nick; document.getElementById("myreal").value = real;
  await registerMe();
}, [nick, real, join]);
const uidOf = p => p.evaluate(() => LIVE.uid);
// what a direct database read by this page's signed-in account returns: "ok", "missing" or the error code
const read = (p, path) => p.evaluate(async path => { try { const s = await firebase.firestore().doc(path).get({ source: "server" }); return s.exists ? "ok" : "missing"; } catch (e) { return e.code; } }, path);
const list = (p, path) => p.evaluate(async path => { try { const q = await firebase.firestore().collection(path).get({ source: "server" }); return "ok:" + q.size; } catch (e) { return e.code; } }, path);
const write = (p, path, data) => p.evaluate(async ([path, data]) => { try { await firebase.firestore().doc(path).set(data); return "ok"; } catch (e) { return e.code; } }, [path, data]);

before(async () => { browser = await pw.chromium.launch(); });
after(async () => { await browser.close(); });

let gameId, invite, planDay; const U = {};

test("the first person to sign in owns the site and can open a war", async () => {
  P.host = await signIn("host@example.com");
  assert.equal(await P.host.evaluate(() => LIVE.isOwner), true);
  assert.equal(await P.host.evaluate(() => LIVE.config), null);
  await P.host.evaluate(() => createGame(20, 0));
  await P.host.waitForFunction(() => inLobby() && LIVE.players[LIVE.uid], null, WAIT);
  await register(P.host, "Iron Duke", "Josh", false);
  ({ gameId, invite } = await P.host.evaluate(() => ({ gameId: DS.gameId, invite: DS.inviteUrl() })));
  assert.match(invite, /\/join\/[a-z0-9]{12}$/);
  U.host = await uidOf(P.host);
});

test("the invite link redirects to the game and survives signing in", async () => {
  const code = invite.split("/").pop();
  { // the link itself lands on the game with the code kept
    const p = await (await browser.newContext()).newPage(); await p.goto(invite); await p.waitForFunction(() => window.DS && DS.available === false || document.getElementById("sheet"), null, WAIT);
    assert.equal(new URL(p.url()).pathname, "/"); assert.equal(await p.evaluate(() => localStorage.getItem("ds.invite") || new URLSearchParams(location.search).get("join")), code); await p.context().close(); }
  for (const [name, nick, real] of [["alice", "Stormcaller", "Alice"], ["bob", "The Fox", "Bob"]]) {
    P[name] = await signIn(`${name}@example.com`, `${BASE}?join=${code}&emulator=1`); // opened the link first, signed in second
    await P[name].waitForFunction(() => LIVE.config && lobbyOpen(LIVE.config), null, WAIT);
    assert.equal(await P[name].evaluate(() => LIVE.isOwner), false, "guests are not hosts");
    await register(P[name], nick, real, true);
    U[name] = await uidOf(P[name]);
  }
});

test("all three see each other in the muster hall, by name, with heroes hidden", async () => {
  for (const p of Object.values(P)) {
    await p.waitForFunction(() => lobbyLords().length === 3 && LIVE.namesLoaded, null, WAIT);
    assert.deepEqual(await p.evaluate(() => lobbyLords().map(([, pl]) => lordLabel(pl)).sort()), ["Iron Duke (Josh)", "Stormcaller (Alice)", "The Fox (Bob)"]);
  }
  const seen = await P.bob.evaluate(a => LIVE.players[a], U.alice);
  assert.equal(seen.state.cls, undefined, "a rival's hero class is not sent before the first battle");
  assert.equal(seen.state.gold, undefined);
});

test("someone without the invite cannot see the game", async () => {
  P.mallory = await signIn("mallory@example.com");
  assert.equal(await P.mallory.evaluate(() => LIVE.config), null);
  assert.equal(await P.mallory.evaluate(() => LIVE.isOwner), false, "a later sign-in cannot host on this site");
  assert.equal(await list(P.mallory, `games/${gameId}/players`), "permission-denied");
  assert.equal(await read(P.mallory, `games/${gameId}/players/${U.alice}/private/state`), "permission-denied");
  assert.equal(await write(P.mallory, `games/${gameId}/members/${await uidOf(P.mallory)}`, { invite: "guess-guess-guess", at: 1 }), "permission-denied");
});

test("the host begins the war, the server sets the clock, and day 1 planning opens for everyone", async () => {
  await P.host.evaluate(() => saveConfig({ lobbyEnds: Date.now() }, "Registration is locked in."));
  for (const p of [P.host, P.alice, P.bob]) await p.waitForFunction(() => isLive() && LIVE.config.planDay && S && !S.lobbyPrep && S.week, null, WAIT);
  planDay = await P.host.evaluate(() => LIVE.config.planDay);
  assert.equal(await P.alice.evaluate(() => liveClock().planDay), planDay, "phone and server agree on the day being planned");
  assert.equal(await P.alice.evaluate(() => rosterFor(liveClock().week).length), 3);
  // the clock belongs to the server: not even the host can move it
  assert.equal(await P.host.evaluate(async g => { try { await firebase.firestore().doc("games/" + g).update({ planDay: "2020-01-01" }); return "ok"; } catch (e) { return e.code; } }, gameId), "permission-denied");
});

test("each lord seals secret orders", async () => {
  // alice plans to attack bob; bob plans to attack the host; the host just seals
  const seal = (p, hostile) => p.evaluate(async hostile => { ensureDip(); S.lists.hostile = hostile; S.locked = true; queueSave(true); await MY_WRITES; }, hostile);
  await seal(P.alice, [U.bob]); await seal(P.bob, [U.host]); await seal(P.host, []);
  for (const p of [P.host, P.alice, P.bob]) await p.waitForFunction(day => Object.values(LIVE.players).filter(pl => pl.sealedFor === day).length === 3, planDay, WAIT);
  assert.equal(await read(P.alice, `games/${gameId}/players/${U.alice}/orders/${planDay}`), "ok");
  assert.equal(await P.alice.evaluate(day => LIVE.players[LIVE.uid].plans[day].targets[0], planDay), U.bob, "alice's first target is bob");
});

test("nobody can read another lord's private state or today's orders, by any route", async () => {
  for (const [spy, victim] of [["bob", "alice"], ["host", "alice"], ["alice", "bob"], ["mallory", "bob"]]) {
    const base = `games/${gameId}/players/${U[victim]}`;
    assert.equal(await read(P[spy], `${base}/private/state`), "permission-denied", `${spy} reading ${victim}'s state`);
    assert.equal(await read(P[spy], `${base}/orders/${planDay}`), "permission-denied", `${spy} reading ${victim}'s orders`);
    assert.equal(await list(P[spy], `${base}/orders`), "permission-denied", `${spy} listing ${victim}'s orders`);
    assert.equal(await list(P[spy], `${base}/private`), "permission-denied");
    assert.equal(await write(P[spy], `${base}/orders/${planDay}`, { sealed: true, targets: [] }), "permission-denied", `${spy} overwriting ${victim}'s orders`);
  }
  // and nothing secret reaches a rival's device through the game itself
  const seen = await P.bob.evaluate(a => LIVE.players[a], U.alice);
  assert.deepEqual(Object.keys(seen.plans), [], "no orders of a rival before a battle has been fought");
  assert.equal(seen.sealedFor, planDay, "only the fact that they sealed");
  assert.ok(!JSON.stringify(seen).includes(U.bob), "alice's target (bob) is nowhere in what bob's device received");
  assert.deepEqual(Object.keys(seen.state).sort(), ["banner", "items", "week"]);
});

test("nobody can write battle results", async () => {
  for (const p of [P.host, P.alice]) assert.equal(await write(p, `games/${gameId}/battles/${planDay}`, { results: [] }), "permission-denied");
});

test("a lord's state and sealed orders are still there after closing and reopening the game", async () => {
  await P.alice.reload();
  await P.alice.waitForFunction(() => window.DS && DS.user && typeof isLive === "function" && isLive() && S && S.week, null, WAIT);
  assert.equal(await P.alice.evaluate(() => S.locked), true);
  assert.equal(await P.alice.evaluate(() => S.lists.hostile[0]), U.bob);
  assert.equal(await P.alice.evaluate(() => MY_NAME), "Stormcaller (Alice)");
});

test("a lord can unseal and change orders before the lock", async () => {
  await P.alice.evaluate(async h => { S.locked = false; S.lists.hostile = [h]; queueSave(true); await MY_WRITES; }, U.host);
  await P.bob.waitForFunction(a => !LIVE.players[a].sealedFor, U.alice, WAIT);
  assert.equal(await P.alice.evaluate(day => LIVE.players[LIVE.uid].plans[day].sealed, planDay), false);
});

test("the host can remove a lord, who loses access and cannot rejoin", async () => {
  await P.host.evaluate(u => DS.removeLord(u), U.bob);
  await P.host.waitForFunction(() => rosterFor(liveClock().week).length === 2, null, WAIT);
  await P.bob.waitForFunction(() => !LIVE.config, null, WAIT);
  assert.equal(await list(P.bob, `games/${gameId}/players`), "permission-denied");
  assert.equal(await read(P.bob, `games/${gameId}/players/${U.bob}/private/state`), "permission-denied");
  assert.equal(await write(P.bob, `games/${gameId}/members/${U.bob}`, { invite: invite.split("/").pop(), at: 2 }), "permission-denied");
});

test("the host can replace the invite link; the old one stops working", async () => {
  const old = invite.split("/").pop();
  await P.host.evaluate(() => DS.newInvite());
  await P.host.waitForFunction(o => !DS.inviteUrl().endsWith(o), old, WAIT);
  assert.equal(await read(P.mallory, `invites/${old}`), "missing");
  assert.equal(await write(P.mallory, `games/${gameId}/members/${await uidOf(P.mallory)}`, { invite: old, at: 3 }), "permission-denied");
});

test("no page hit a script error", () => {
  for (const [name, p] of Object.entries(P)) assert.deepEqual(p.errors, [], name);
});
