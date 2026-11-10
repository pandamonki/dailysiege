// The server's game clock: which day is being planned and when orders lock (functions/lib/clock.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { clockFor } = createRequire(import.meta.url)("../functions/lib/clock.js");
const iso = ms => new Date(ms).toISOString();
const at = s => Date.parse(s);

test("no clock while registration has no closing time: orders stay closed", () => {
  assert.equal(clockFor({ tz: "UTC", lockHour: 20, lobby: true, lobbyEnds: null, war: 1 }), null);
  assert.equal(clockFor({ tz: "UTC", lockHour: 20, lobby: true, war: 1 }), null);
});

test("day 1 is the day registration closes, locking at the battle hour in the game's time zone", () => {
  const c = clockFor({ tz: "Australia/Sydney", lockHour: 20, lobby: true, lobbyEnds: at("2026-11-12T03:00:00Z"), war: 1 }); // 2pm in Sydney
  assert.equal(c.planDay, "2026-11-12"); assert.equal(c.nextPlanDay, "2026-11-13");
  assert.equal(iso(c.nextLockAt), "2026-11-12T09:00:00.000Z"); // 8pm Sydney (UTC+11)
  assert.equal(iso(c.lockAfter), "2026-11-13T09:00:00.000Z");
});

test("closing registration less than three hours before the battle pushes day 1 to tomorrow", () => {
  const c = clockFor({ tz: "Australia/Sydney", lockHour: 20, lobby: true, lobbyEnds: at("2026-11-12T08:00:00Z"), war: 1 }); // 7pm in Sydney
  assert.equal(c.planDay, "2026-11-13");
});

test("a daylight-saving change between two locks is handled", () => {
  const c = clockFor({ tz: "America/New_York", lockHour: 20, lobby: true, lobbyEnds: at("2026-10-31T12:00:00Z"), war: 1 });
  assert.equal(iso(c.nextLockAt), "2026-11-01T00:00:00.000Z"); // 8pm EDT
  assert.equal(iso(c.lockAfter), "2026-11-02T01:00:00.000Z");  // 8pm EST, 25 hours later
});

test("the day being planned never moves backwards within a war; a settings change only moves the lock time", () => {
  const cfg = { tz: "UTC", lockHour: 9, lobby: true, lobbyEnds: at("2026-11-01T00:00:00Z"), war: 1 };
  const c = clockFor(cfg, { planDay: "2026-11-04", clockWar: 1 });
  assert.equal(c.planDay, "2026-11-04"); assert.equal(iso(c.nextLockAt), "2026-11-04T09:00:00.000Z");
  const later = clockFor({ ...cfg, lockHour: 21 }, { planDay: "2026-11-04", clockWar: 1 });
  assert.equal(later.planDay, "2026-11-04"); assert.equal(iso(later.nextLockAt), "2026-11-04T21:00:00.000Z");
});

test("once registration has closed the war's first day is fixed, even if the battle time is moved earlier", () => {
  const closed = at("2026-11-12T10:30:00Z"), cfg = { tz: "UTC", lockHour: 20, lobby: true, lobbyEnds: closed, war: 1 };
  const first = clockFor(cfg, null, { now: closed + 1000 });
  assert.equal(first.startDate, "2026-11-12"); assert.equal(first.planDay, "2026-11-12");
  // the host moves the battle to 10am: already past today. Day 1 is still the 12th, and its lock is now behind us.
  const moved = { ...cfg, lockHour: 10, startDate: first.startDate };
  const c = clockFor(moved, { planDay: first.planDay, clockWar: 1 }, { now: closed + 60000, before: { ...cfg, startDate: first.startDate } });
  assert.equal(c.startDate, "2026-11-12"); assert.equal(c.planDay, "2026-11-12"); assert.equal(iso(c.nextLockAt), "2026-11-12T10:00:00.000Z");
  // even if the first day had not been written down yet, it is worked out from the settings registration closed under
  const late = clockFor({ ...cfg, lockHour: 10 }, { planDay: "2026-11-12", clockWar: 1 }, { now: closed + 60000, before: cfg });
  assert.equal(late.startDate, "2026-11-12");
});

test("while registration is still open with a closing time, the first day is not fixed yet", () => {
  const c = clockFor({ tz: "UTC", lockHour: 20, lobby: true, lobbyEnds: at("2026-11-12T10:00:00Z"), war: 1 }, null, { now: at("2026-11-11T10:00:00Z") });
  assert.equal(c.planDay, "2026-11-12"); assert.equal(c.startDate, undefined);
});

test("a new war starts its own clock", () => {
  const c = clockFor({ tz: "UTC", lockHour: 9, lobby: true, lobbyEnds: at("2026-11-10T00:00:00Z"), war: 2, startDate: "2026-11-01" }, { planDay: "2026-11-04", clockWar: 1 });
  assert.equal(c.planDay, "2026-11-10"); assert.equal(c.clockWar, 2);
});

test("the game asks for server functions in the region they are deployed to", async () => {
  const { readFileSync } = await import("node:fs");
  const { REGION } = createRequire(import.meta.url)("../functions/region.js");
  const client = readFileSync(new URL("../js/net/backend-firebase.js", import.meta.url), "utf8").match(/FUNCTIONS_REGION = "([^"]+)"/)[1];
  assert.equal(client, REGION);
});
