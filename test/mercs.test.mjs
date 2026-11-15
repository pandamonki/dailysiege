// Mercenary camp from 16 Nov 2026: a new headliner each day, three regular tiles, one group per lord per day.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSim } from "../tools/load-sim.mjs";

const sim = loadSim();
const J = v => JSON.parse(JSON.stringify(v));
const roster = (dayNo, resting = {}) => J(sim.run(`mercRoster(${dayNo}, id => (${JSON.stringify(resting)})[id] || 0)`));

test("the camp gets a stronger headliner each day, and yesterday's headliner joins the regular tiles", () => {
  assert.equal(roster(3).head, null);
  const heads = [4, 5, 6, 7].map(d => roster(d).head);
  assert.deepEqual(heads, ["troll", "necro", "ogre", "warhost"]);
  const mins = heads.map(h => sim.run(`MERCS["${h}"].min`));
  assert.deepEqual(mins, [...mins].sort((a, b) => a - b));
  assert.deepEqual(roster(4).tiles, ["elves", "orcs", "centaur"]);
  assert.deepEqual(roster(5).tiles, ["troll", "elves", "orcs"]);
  assert.deepEqual(roster(7).tiles, ["ogre", "necro", "troll"]);
  [4, 5, 6, 7].forEach(d => { assert.equal(roster(d).tiles.length, 3); assert.ok(!roster(d).tiles.includes(roster(d).head)); });
});

test("resting groups move to the end of the tiles and can't be bid on", () => {
  const r = roster(6, { necro: 1 });
  assert.deepEqual(r.tiles, ["troll", "elves", "orcs"]);
  const r2 = roster(5, { troll: 2, elves: 1, orcs: 1, centaur: 2 });
  assert.equal(r2.tiles.length, 3); assert.deepEqual(r2.open, ["necro"]);
});

test("a lord wins at most one group a day; the next highest bidder takes the other", () => {
  const plans = [
    { pid: "a", name: "A", castle: [2, 2], pieces: [], bids: { troll: { gold: 350, day: "D" }, elves: { gold: 300, day: "D" } } },
    { pid: "b", name: "B", castle: [14, 14], pieces: [], bids: { troll: { gold: 290, day: "D" }, elves: { gold: 260, day: "D" } } },
  ];
  sim.context.__p = plans;
  const res = J(sim.run(`resolveMercs(__p, { day: "D", dayNo: 4, v2: true, N: 17, cool: () => 0 })`));
  assert.equal(res.hires.troll.pid, "a"); assert.equal(res.hires.elves.pid, "b"); assert.equal(res.hires.elves.gold, 260);
});

test("groups that are not in today's camp can't be hired", () => {
  sim.context.__p = [{ pid: "a", name: "A", castle: [2, 2], pieces: [], bids: { ogre: { gold: 400, day: "D" } } }];
  const res = J(sim.run(`resolveMercs(__p, { day: "D", dayNo: 4, v2: true, N: 17, cool: () => 0 })`));
  assert.deepEqual(res.hires, {});
});
