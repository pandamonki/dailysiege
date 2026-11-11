// functions/lib/bots.js: the host fills and empties seats with bot lords (an in-memory stand-in for the database)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { setBots } = createRequire(import.meta.url)("../functions/lib/bots.js");

function fakeDb(game, players) {
  const store = { "games/g1": game, ...Object.fromEntries(Object.entries(players).map(([id, p]) => [`games/g1/players/${id}`, p])) };
  const snap = (path, d) => ({ id: path.split("/").pop(), ref: { path }, exists: d !== undefined, data: () => d, get: k => (d || {})[k] });
  const doc = path => ({ path, get: async () => snap(path, store[path]), collection: n => col(`${path}/${n}`) });
  const col = path => ({ doc: id => doc(`${path}/${id}`), get: async () => ({ docs: Object.keys(store).filter(k => k.startsWith(path + "/") && k.split("/").length === path.split("/").length + 1).map(k => snap(k, store[k])) }) });
  return { store, collection: n => col(n), batch: () => { const ops = []; return { set: (ref, d) => ops.push(() => { store[ref.path] = JSON.parse(JSON.stringify(d)); }), delete: ref => ops.push(() => { delete store[ref.path]; }), commit: async () => ops.forEach(f => f()) }; } };
}
const person = (n, extra = {}) => ({ fromWeek: "0000-00-00", joinedAt: n, nick: "P" + n, real: "Person", pending: false, banner: { c1: ["#2f5fa8", "#b8322a", "#3d7a35"][n % 3] }, ...extra });
const botsOf = db => Object.entries(db.store).filter(([k, v]) => k.startsWith("games/g1/players/") && v.bot);

test("the host fills the empty seats with bots, each with its own name, colour and hero", async () => {
  const db = fakeDb({ lobby: true, maxPlayers: 6, war: 1 }, { host: person(1), friend: person(2) });
  assert.deepEqual(await setBots(db, "g1", 99), { bots: 4, humans: 2, seats: 6 }); // asking for more than fit gives every empty seat
  const bots = botsOf(db).map(([, v]) => v);
  assert.equal(bots.length, 4);
  assert.equal(new Set(bots.map(b => b.nick)).size, 4);
  assert.equal(new Set(bots.map(b => b.banner.c1)).size, 4);
  assert.ok(bots.every(b => b.nick.length <= 16 && b.fromWeek === "0000-00-00" && b.pending === false && b.real === "Bot"));
  assert.ok(bots.every(b => !["#b8322a", "#3d7a35"].includes(b.banner.c1)), "a bot never takes a colour a person already has"); // the host holds #b8322a, the friend #3d7a35
});

test("bots can be removed again, newest first, and counted by what is there now", async () => {
  const db = fakeDb({ lobby: true, maxPlayers: 8, war: 1 }, { host: person(1) });
  await setBots(db, "g1", 3); const first = botsOf(db).map(([k]) => k).sort();
  assert.equal((await setBots(db, "g1", 1)).bots, 1);
  assert.equal(botsOf(db).length, 1);
  await setBots(db, "g1", 2); assert.equal(botsOf(db).length, 2); assert.equal(new Set(botsOf(db).map(([, v]) => v.nick)).size, 2);
  assert.equal((await setBots(db, "g1", 0)).bots, 0); assert.equal(botsOf(db).length, 0);
  assert.equal(first.length, 3);
});

test("people who have registered or are registering leave bots less room; people who left or are pending are not counted", async () => {
  const db = fakeDb({ lobby: true, maxPlayers: 4, war: 1 }, { host: person(1), gone: person(2, { left: true }), later: person(3, { pending: true }) });
  assert.equal((await setBots(db, "g1", 10)).bots, 3);
});

test("bots cannot be changed once registration has closed", async () => {
  await assert.rejects(setBots(fakeDb({ lobby: false, maxPlayers: 4, war: 1 }, { host: person(1) }), "g1", 2), /registration is open/);
  await assert.rejects(setBots(fakeDb({ lobby: true, lobbyEnds: 5, maxPlayers: 4, war: 1 }, { host: person(1) }), "g1", 2, { now: 10 }), /registration is open/);
});
