// The headless sim harness itself: it loads, is repeatable, and stays free of the DOM, the clock and Math.random.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadSim, SIM_FILES, ROOT } from "../tools/load-sim.mjs";
import { GOLDEN_SCRIPTS } from "../tools/golden.mjs";

test("the sim loads headlessly and runs a battle", () => {
  const sim = loadSim({ extraFiles: GOLDEN_SCRIPTS, strict: true });
  const { res } = sim.run("runGoldenCase(3, false)");
  assert.equal(res.results.length, 5);
  const places = res.results.map(r => r.place);
  assert.ok(places.includes(1) && places.every(p => p >= 1 && p <= 5), "places " + places); // allies can share first place
  assert.ok(res.duration > 0);
});

test("the same battle twice, and in a fresh context, gives the same hashes", () => {
  const a = loadSim({ extraFiles: GOLDEN_SCRIPTS }), b = loadSim({ extraFiles: GOLDEN_SCRIPTS });
  const h = sim => JSON.stringify(sim.run("goldenHashes(10)"));
  const first = h(a);
  assert.equal(h(a), first, "second run in the same context");
  assert.equal(h(b), first, "run in a fresh context");
});

test("a battle run after a different-sized battle is unaffected by it", () => {
  const a = loadSim({ extraFiles: GOLDEN_SCRIPTS }), b = loadSim({ extraFiles: GOLDEN_SCRIPTS });
  a.run("goldenHashes(0)"); // 2 lords on a small map first
  assert.equal(JSON.stringify(a.run("goldenHashes(6)")), JSON.stringify(b.run("goldenHashes(6)")));
});

test("Math.random and the clock throw in strict mode (so a golden pass proves the sim avoids them)", () => {
  const sim = loadSim({ strict: true });
  assert.throws(() => sim.run("Math.random()"), /Math\.random/);
  assert.throws(() => sim.run("Date.now()"), /Date\.now/);
  assert.throws(() => sim.run("new Date()"), /new Date/);
});

test("sim files never mention the DOM, storage, timers or the network", () => {
  // layout.js and player.js hold a few page helpers the sim never calls; they are checked by behaviour above instead
  const pure = SIM_FILES.filter(f => f.startsWith("js/sim/") || f.startsWith("js/config/") || f === "js/core/util.js");
  const banned = /\b(document|window|localStorage|sessionStorage|navigator|fetch|XMLHttpRequest|setTimeout|setInterval|requestAnimationFrame|performance|Math\.random|Date)\b/;
  for (const f of pure) {
    const src = readFileSync(path.join(ROOT, f), "utf8").split("\n").map(l => l.replace(/\/\/.*$/, ""));
    src.forEach((line, n) => assert.ok(!banned.test(line), `${f}:${n + 1} uses ${(line.match(banned) || [])[0]}`));
  }
});

test("every sim file is loaded by index.html, in the same relative order", () => {
  const html = readFileSync(path.join(ROOT, "index.html"), "utf8");
  const order = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  const inGame = SIM_FILES.filter(f => f !== "js/sim/hash.js"); // the hash helper is not needed by the game yet
  const pos = inGame.map(f => order.indexOf(f));
  assert.ok(pos.every(p => p >= 0), "missing from index.html: " + inGame.filter((f, i) => pos[i] < 0).join(", "));
  assert.deepEqual(pos, pos.slice().sort((x, y) => x - y), "load order differs from index.html");
});

test("stableStringify sorts keys and hashString is stable", () => {
  const sim = loadSim();
  assert.equal(sim.run(`stableStringify({ b: 1, a: [2, { d: undefined, c: -0 }], s: new Set([3]) })`), `{"a":[2,{"c":0}],"b":1,"s":[3]}`);
  assert.equal(sim.run(`hashString("Daily Siege")`), sim.run(`hashString("Daily" + " Siege")`));
  assert.match(sim.run(`hashString("")`), /^[0-9a-f]{16}$/);
  assert.notEqual(sim.run(`hashString("a")`), sim.run(`hashString("b")`));
});
