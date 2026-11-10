// Security-rule tests. Run inside the Firestore emulator:  npm run test:rules
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, writeBatch, Timestamp } from "firebase/firestore";

let env;
const G = "game1", CODE = "invite-code-1", HOST = "host", A = "alice", B = "bob", OUT = "mallory";
const db = uid => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const hour = 36e5, now = () => Date.now();
const profile = (o = {}) => ({ fromWeek: "0000-00-00", joinedAt: now(), nick: "", real: "", pending: true, ...o });

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-dailysiege", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
after(async () => { await env.cleanup(); });

// A running war: host + alice + bob are in, today's lock is an hour away.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const d = ctx.firestore();
    await setDoc(doc(d, "config/app"), { owner: HOST, hosts: [HOST], createdAt: 1 });
    await setDoc(doc(d, "games", G), { tz: "Australia/Sydney", lockHour: 20, lobby: true, lobbyEnds: now() - hour, createdAt: 1, host: HOST, war: 1, inviteCode: CODE, maxPlayers: 10,
      planDay: "2026-11-12", nextLockAt: Timestamp.fromMillis(now() + hour), nextPlanDay: "2026-11-13", lockAfter: Timestamp.fromMillis(now() + 25 * hour) });
    await setDoc(doc(d, "invites", CODE), { gameId: G, createdAt: 1 });
    for (const u of [HOST, A, B]) {
      await setDoc(doc(d, "games", G, "members", u), { invite: CODE, at: 1 });
      await setDoc(doc(d, "games", G, "players", u), profile({ pending: false, nick: u, real: u, joinedAt: 1000 }));
      await setDoc(doc(d, "games", G, "players", u, "private", "state"), { gold: 300, owned: [] });
      await setDoc(doc(d, "games", G, "players", u, "orders", "2026-11-11"), { sealed: true, targets: [] });
    }
    await setDoc(doc(d, "games", G, "battles", "2026-11-11"), { war: 1, week: "2026-11-11", results: [] });
  });
});
const setClock = patch => env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), "games", G), patch));

// ---------- the fog of war ----------
test("a lord can read and write their own private state", async () => {
  await assertSucceeds(getDoc(doc(db(A), "games", G, "players", A, "private", "state")));
  await assertSucceeds(setDoc(doc(db(A), "games", G, "players", A, "private", "state"), { gold: 250, owned: [{ id: "u1" }] }));
});
test("nobody else can read or write a lord's private state, not even the host", async () => {
  for (const u of [B, HOST, OUT]) {
    await assertFails(getDoc(doc(db(u), "games", G, "players", A, "private", "state")));
    await assertFails(setDoc(doc(db(u), "games", G, "players", A, "private", "state"), { gold: 0 }));
    await assertFails(getDocs(collection(db(u), "games", G, "players", A, "private")));
  }
  await assertFails(getDoc(doc(anon(), "games", G, "players", A, "private", "state")));
});
test("a lord can seal today's orders before the lock and read them back", async () => {
  const ref = doc(db(A), "games", G, "players", A, "orders", "2026-11-12");
  await assertSucceeds(setDoc(ref, { sealed: true, targets: [B], betray: { [B]: "Halfway through the battle" } }));
  await assertSucceeds(getDoc(ref));
});
test("nobody else can read a lord's orders, today's or any day's, not even the host", async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), "games", G, "players", A, "orders", "2026-11-12"), { sealed: true }));
  for (const u of [B, HOST, OUT]) {
    await assertFails(getDoc(doc(db(u), "games", G, "players", A, "orders", "2026-11-12")));
    await assertFails(getDoc(doc(db(u), "games", G, "players", A, "orders", "2026-11-11")));
    await assertFails(getDocs(collection(db(u), "games", G, "players", A, "orders")));
    await assertFails(setDoc(doc(db(u), "games", G, "players", A, "orders", "2026-11-12"), { sealed: true, targets: [] }));
  }
});
test("orders cannot be written once the lock has passed", async () => {
  await setClock({ nextLockAt: Timestamp.fromMillis(now() - 1000) });
  await assertFails(setDoc(doc(db(A), "games", G, "players", A, "orders", "2026-11-12"), { sealed: true }));
});
test("after the lock, tomorrow's orders can be drafted while the server fights tonight's battle", async () => {
  await setClock({ nextLockAt: Timestamp.fromMillis(now() - 1000) });
  await assertSucceeds(setDoc(doc(db(A), "games", G, "players", A, "orders", "2026-11-13"), { sealed: false }));
});
test("tomorrow's orders cannot be written before tonight's lock, nor any other day's", async () => {
  await assertFails(setDoc(doc(db(A), "games", G, "players", A, "orders", "2026-11-13"), { sealed: true }));
  await assertFails(setDoc(doc(db(A), "games", G, "players", A, "orders", "2026-11-11"), { sealed: true, targets: [B] })); // rewriting history
  await assertFails(setDoc(doc(db(A), "games", G, "players", A, "orders", "2026-11-20"), { sealed: true }));
  await assertFails(setDoc(doc(db(A), "games", G, "players", A, "orders", "junk"), { sealed: true }));
});
test("orders can never be deleted", async () => {
  await assertFails(deleteDoc(doc(db(A), "games", G, "players", A, "orders", "2026-11-11")));
});
test("orders cannot be written before the server has set the clock", async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), "games", G), { tz: "UTC", lockHour: 20, lobby: true, host: HOST, war: 1, inviteCode: CODE }));
  await assertFails(setDoc(doc(db(A), "games", G, "players", A, "orders", "2026-11-12"), { sealed: true }));
});

// ---------- battles ----------
test("members read battle results; nobody but the server writes them", async () => {
  await assertSucceeds(getDoc(doc(db(A), "games", G, "battles", "2026-11-11")));
  await assertSucceeds(getDocs(collection(db(A), "games", G, "battles")));
  for (const u of [A, HOST]) {
    await assertFails(setDoc(doc(db(u), "games", G, "battles", "2026-11-12"), { results: [] }));
    await assertFails(updateDoc(doc(db(u), "games", G, "battles", "2026-11-11"), { results: [{ pid: u, points: 99 }] }));
    await assertFails(deleteDoc(doc(db(u), "games", G, "battles", "2026-11-11")));
  }
  await assertFails(getDoc(doc(db(OUT), "games", G, "battles", "2026-11-11")));
});

test("a member can report a replay mismatch under their own name; only the host reads reports", async () => {
  const r = { uid: A, day: "2026-11-11", got: "aaaa", want: "bbbb", device: "test", at: 1 };
  await assertSucceeds(setDoc(doc(db(A), "games", G, "reports", "2026-11-11_" + A), r));
  await assertFails(setDoc(doc(db(B), "games", G, "reports", "2026-11-11_" + A), r));          // not as someone else
  await assertFails(setDoc(doc(db(OUT), "games", G, "reports", "2026-11-11_" + OUT), { ...r, uid: OUT })); // not from outside
  await assertFails(getDoc(doc(db(B), "games", G, "reports", "2026-11-11_" + A)));
  await assertSucceeds(getDoc(doc(db(HOST), "games", G, "reports", "2026-11-11_" + A)));
});

// ---------- public profiles ----------
test("members see every public profile; outsiders and signed-out visitors see none", async () => {
  await assertSucceeds(getDocs(collection(db(A), "games", G, "players")));
  await assertFails(getDocs(collection(db(OUT), "games", G, "players")));
  await assertFails(getDoc(doc(anon(), "games", G, "players", A)));
});
test("a lord edits only their own public profile", async () => {
  await assertSucceeds(updateDoc(doc(db(A), "games", G, "players", A), { banner: { pat: "solid", c1: "#b8322a" }, sealedFor: "2026-11-12" }));
  await assertFails(updateDoc(doc(db(B), "games", G, "players", A), { banner: { pat: "solid" } }));
});
test("a public profile cannot carry anything outside the allowed fields", async () => {
  await assertFails(updateDoc(doc(db(A), "games", G, "players", A), { gold: 99999 }));
  await assertFails(updateDoc(doc(db(A), "games", G, "players", A), { kicked: false }));
});
test("names are fixed once the war has begun", async () => {
  await assertFails(updateDoc(doc(db(A), "games", G, "players", A), { nick: "Someone Else" }));
  await assertFails(updateDoc(doc(db(A), "games", G, "players", A), { real: "Bob" }));
});
test("names can be changed while registration is open, and are length-limited", async () => {
  await setClock({ lobbyEnds: null });
  await assertSucceeds(updateDoc(doc(db(A), "games", G, "players", A), { nick: "The Iron Duke", real: "Alice" }));
  await assertFails(updateDoc(doc(db(A), "games", G, "players", A), { nick: "x".repeat(17) }));
});
test("a lord queued for a later week can still set their name", async () => {
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), "games", G, "players", A), { fromWeek: "2026-11-18" }));
  await assertSucceeds(updateDoc(doc(db(A), "games", G, "players", A), { nick: "Latecomer" }));
});
test("sign-up time cannot be back-dated to jump the seat queue", async () => {
  await assertFails(updateDoc(doc(db(A), "games", G, "players", A), { joinedAt: 5 }));
  await assertSucceeds(updateDoc(doc(db(A), "games", G, "players", A), { joinedAt: now() }));
});
test("a lord cannot un-leave or mark themselves as left", async () => {
  await assertFails(updateDoc(doc(db(A), "games", G, "players", A), { left: true }));
});

// ---------- joining ----------
test("anyone signed in can look up an invite code, but cannot list codes or games", async () => {
  await assertSucceeds(getDoc(doc(db(OUT), "invites", CODE)));
  await assertFails(getDocs(collection(db(OUT), "invites")));
  await assertFails(getDocs(collection(db(OUT), "games")));
  await assertFails(getDoc(doc(anon(), "invites", CODE)));
});
test("joining needs the right invite code", async () => {
  await assertFails(setDoc(doc(db(OUT), "games", G, "members", OUT), { invite: "wrong-code", at: 1 }));
  await assertFails(setDoc(doc(db(OUT), "games", G, "players", OUT), profile())); // no membership, no profile
  await assertSucceeds(setDoc(doc(db(OUT), "games", G, "members", OUT), { invite: CODE, at: 1 }));
  await assertSucceeds(setDoc(doc(db(OUT), "games", G, "players", OUT), profile()));
  await assertSucceeds(getDocs(collection(db(OUT), "games", G, "players")));
});
test("you cannot join as somebody else", async () => {
  await assertFails(setDoc(doc(db(OUT), "games", G, "members", "carol"), { invite: CODE, at: 1 }));
});
test("the host can remove a lord, who then loses all access and cannot rejoin", async () => {
  const h = db(HOST), batch = writeBatch(h);
  batch.update(doc(h, "games", G, "players", B), { left: true, kicked: true });
  batch.delete(doc(h, "games", G, "members", B));
  batch.set(doc(h, "games", G, "banned", B), { at: 1, why: "removed" });
  await assertSucceeds(batch.commit());
  await assertFails(getDocs(collection(db(B), "games", G, "players")));
  await assertFails(getDoc(doc(db(B), "games", G, "players", B, "private", "state")));
  await assertFails(setDoc(doc(db(B), "games", G, "members", B), { invite: CODE, at: 2 }));
});
test("a lord given their old castle on a new account plays that seat, and the old account is shut out", async () => {
  const NEW = "alice-new-phone";
  await env.withSecurityRulesDisabled(async ctx => { const d = ctx.firestore(); // what the server's reassignSeat does
    await setDoc(doc(d, "games", G, "members", NEW), { invite: CODE, at: 2, seat: A }); await deleteDoc(doc(d, "games", G, "members", A)); await setDoc(doc(d, "games", G, "banned", A), { at: 2, why: "replaced" }); });
  await assertSucceeds(getDoc(doc(db(NEW), "games", G, "players", A, "private", "state")));
  await assertSucceeds(setDoc(doc(db(NEW), "games", G, "players", A, "orders", "2026-11-12"), { sealed: true, targets: [B] }));
  await assertSucceeds(updateDoc(doc(db(NEW), "games", G, "players", A), { sealedFor: "2026-11-12" }));
  await assertFails(getDoc(doc(db(NEW), "games", G, "players", B, "private", "state")));   // still only their own seat
  await assertFails(getDoc(doc(db(A), "games", G, "players", A, "private", "state")));     // the old account is out
  await assertFails(setDoc(doc(db(A), "games", G, "members", A), { invite: CODE, at: 3 })); // and cannot rejoin
});
test("nobody can point their own membership at someone else's seat", async () => {
  await assertFails(setDoc(doc(db(OUT), "games", G, "members", OUT), { invite: CODE, at: 1, seat: A }));
  await assertFails(updateDoc(doc(db(B), "games", G, "members", B), { seat: A }));
  await assertFails(updateDoc(doc(db(HOST), "games", G, "members", B), { seat: A })); // not even the host: only the server
  await assertFails(setDoc(doc(db(A), "games", G, "banned", B), { at: 1 }));          // and only the host can bar an account
});

test("the host can only touch membership fields of someone else's profile", async () => {
  await assertFails(updateDoc(doc(db(HOST), "games", G, "players", A), { nick: "Renamed" }));
  await assertFails(updateDoc(doc(db(HOST), "games", G, "players", A), { banner: {} }));
  await assertSucceeds(updateDoc(doc(db(HOST), "games", G, "players", A), { fromWeek: "0000-00-00" }));
  await assertFails(updateDoc(doc(db(A), "games", G, "players", B), { left: true })); // not the host
});

// ---------- game settings ----------
test("only the host changes game settings", async () => {
  await assertSucceeds(updateDoc(doc(db(HOST), "games", G), { lockHour: 21 }));
  await assertFails(updateDoc(doc(db(A), "games", G), { lockHour: 21 }));
  await assertFails(updateDoc(doc(db(HOST), "games", G), { lockHour: 99 }));
});
test("nobody, not even the host, can move the lock or the day being planned", async () => {
  await assertFails(updateDoc(doc(db(HOST), "games", G), { nextLockAt: Timestamp.fromMillis(now() + 99 * hour) }));
  await assertFails(updateDoc(doc(db(HOST), "games", G), { planDay: "2026-11-11" }));
  await assertFails(updateDoc(doc(db(HOST), "games", G), { nextPlanDay: "2026-11-12" }));
  await assertFails(updateDoc(doc(db(HOST), "games", G), { startDate: "2026-11-01" }));
});
test("the host cannot hand the game to someone else or skip war numbers", async () => {
  await assertFails(updateDoc(doc(db(HOST), "games", G), { host: A }));
  await assertFails(updateDoc(doc(db(HOST), "games", G), { war: 5 }));
  await assertSucceeds(updateDoc(doc(db(HOST), "games", G), { war: 2, lobbyEnds: null }));
});
test("games cannot be deleted", async () => {
  await assertFails(deleteDoc(doc(db(HOST), "games", G)));
});

// ---------- creating a game ----------
const newGame = (h, id, code, extra = {}) => {
  const d = db(h), b = writeBatch(d);
  b.set(doc(d, "games", id), { tz: "UTC", lockHour: 20, lobby: true, createdAt: now(), host: h, war: 1, inviteCode: code, maxPlayers: 10, ...extra });
  b.set(doc(d, "invites", code), { gameId: id, createdAt: now() });
  b.set(doc(d, "games", id, "members", h), { invite: code, at: now() });
  b.set(doc(d, "games", id, "players", h), profile());
  return b.commit();
};
test("a site host creates a game, its invite, and joins it in one go", async () => {
  await assertSucceeds(newGame(HOST, "game2", "second-invite"));
});
test("someone who is not a site host cannot create games", async () => {
  await assertFails(newGame(A, "game3", "third-invite"));
});
test("a new game cannot be created with the clock already set, or for another host", async () => {
  await assertFails(newGame(HOST, "game4", "fourth-invite", { planDay: "2026-01-01" }));
  await assertFails(newGame(HOST, "game5", "fifth-invite", { host: A }));
});
test("an invite code cannot be pointed at a game you do not host", async () => {
  await assertFails(setDoc(doc(db(A), "invites", "hijacked-code"), { gameId: G, createdAt: 1 }));
  await assertFails(setDoc(doc(db(A), "invites", CODE), { gameId: "elsewhere", createdAt: 1 }));
});

// ---------- site ownership ----------
test("the first person to sign in claims the site; nobody can claim it again", async () => {
  await env.withSecurityRulesDisabled(ctx => deleteDoc(doc(ctx.firestore(), "config/app")));
  await assertFails(setDoc(doc(db(A), "config/app"), { owner: B, hosts: [B], createdAt: 1 })); // not for someone else
  await assertSucceeds(setDoc(doc(db(A), "config/app"), { owner: A, hosts: [A], createdAt: 1 }));
  await assertFails(setDoc(doc(db(B), "config/app"), { owner: B, hosts: [B], createdAt: 1 }));
  await assertFails(updateDoc(doc(db(B), "config/app"), { hosts: [A, B] }));
  await assertSucceeds(updateDoc(doc(db(A), "config/app"), { hosts: [A, B] }));
});

// ---------- personal settings ----------
test("users/{uid} is private to that person", async () => {
  await assertSucceeds(setDoc(doc(db(A), "users", A), { gameId: G }));
  await assertFails(getDoc(doc(db(B), "users", A)));
  await assertFails(setDoc(doc(db(B), "users", A), { gameId: "x" }));
});

test("signed-out visitors can read nothing at all", async () => {
  for (const p of [["config", "app"], ["games", G], ["games", G, "battles", "2026-11-11"], ["users", A]]) await assertFails(getDoc(doc(anon(), ...p)));
});
