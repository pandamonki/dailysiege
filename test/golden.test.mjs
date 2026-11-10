// Golden determinism tests: a fixed set of battles must keep producing exactly the recorded hashes.
// If this fails and you did not mean to change how battles play out, the change broke determinism
// or altered the sim. If you did mean it, run `npm run golden:update` and commit the new hashes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGolden, readGolden } from "../tools/golden.mjs";

// computed once, with Math.random and the clock set to throw (strict), so the sim provably uses neither
const computed = computeGolden({ strict: true });
const recorded = readGolden().cases;

test("the recorded golden file covers every case", () => {
  assert.equal(recorded.length, computed.length);
  assert.ok(computed.length >= 50, "at least 50 golden battles");
});

test("every golden battle matches its recorded hash", () => {
  const wrong = computed.filter((c, i) => JSON.stringify(c) !== JSON.stringify(recorded[i])).map(c => c.name);
  assert.deepEqual(wrong, [], "battles whose result changed");
});

test("a fast run and a full replay run of the same orders agree on the outcome", () => {
  const full = computed.filter(c => c.fullOutcome);
  assert.ok(full.length >= 10);
  for (const c of full) assert.equal(c.fullOutcome, c.outcome, c.name);
});

test("the golden battles are varied (no two share an outcome)", () => {
  assert.equal(new Set(computed.map(c => c.outcome)).size, computed.length);
});
