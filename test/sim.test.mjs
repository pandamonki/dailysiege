// The headless sim harness itself: it loads, is repeatable, and stays free of the DOM, the clock and Math.random.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadSim, SIM_FILES, WORLD_FILES, ROOT } from "../tools/load-sim.mjs";
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

test("nothing the sim can reach uses engine-dependent maths", () => {
  // these may differ in the last digit between JavaScript engines; js/core/detmath.js has the safe versions
  const banned = /Math\.(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|exp|expm1|log|log2|log10|log1p|pow|hypot|cbrt)\b|\*\*|\.toLocale|localeCompare|\bIntl\b/;
  for (const f of [...SIM_FILES, ...GOLDEN_SCRIPTS, "js/sim/plans.js", "js/core/practice.js"]) {
    const src = readFileSync(path.join(ROOT, f), "utf8").split("\n").map(l => l.replace(/\/\/.*$/, ""));
    src.forEach((line, n) => assert.ok(!banned.test(line), `${f}:${n + 1} uses ${(line.match(banned) || [])[0]}`));
  }
});

test("the battle sim reads nothing from the page: no map or day globals", () => {
  const src = readFileSync(path.join(ROOT, "js/sim/battle.js"), "utf8");
  for (const g of ["CENTRE", "DAY", "CASTLE", "zoneSet", "RIVALS", "LIVE"]) assert.ok(!new RegExp("\\b" + g + "\\b").test(src), "battle.js reads " + g);
  // and changing the page's map globals must not change a battle
  const a = loadSim({ extraFiles: GOLDEN_SCRIPTS }), b = loadSim({ extraFiles: GOLDEN_SCRIPTS });
  b.run("N = 11; CENTRE = 5; CASTLE = [1, 1];");
  assert.equal(JSON.stringify(a.run("goldenHashes(5)")), JSON.stringify(b.run("goldenHashes(5)")));
});

test("deterministic maths agrees with Math to the last digit or two", () => {
  const sim = loadSim();
  const worst = sim.run(`(() => { const r = mulberry(9); let w = 0;
    for (let i = 0; i < 200000; i++) { const a = (r() - .5) * (i % 3 ? 20 : 2000), b = (r() - .5) * 40;
      w = Math.max(w, Math.abs(dsin(a) - Math.sin(a)), Math.abs(dcos(a) - Math.cos(a)), Math.abs(datan2(b, a) - Math.atan2(b, a)) / 2); }
    return w; })()`);
  assert.ok(worst < 4e-16, "worst error " + worst);
  assert.equal(sim.run("dsin(0)"), 0); assert.equal(sim.run("dcos(0)"), 1);
  assert.equal(sim.run("datan2(0, -1)"), Math.PI); assert.equal(sim.run("datan2(-1, 0)"), -Math.PI / 2); assert.equal(sim.run("datan2(0, 0)"), 0);
  assert.ok(Number.isNaN(sim.run("dsin(NaN)")));
});

test("castle seats are where they have always been", () => {
  const sim = loadSim(), seats = n => sim.run(`seatLayout(${n})`).castles.map(c => c.join(",")).join(" ");
  assert.equal(seats(2), "9,5 1,5");
  assert.equal(seats(3), "11,6 4,2 3,10");
  assert.equal(seats(8), "15,8 13,3 8,1 3,3 1,8 3,13 8,15 13,13");
});

test("every sim file is loaded by index.html, in the same relative order", () => {
  const html = readFileSync(path.join(ROOT, "index.html"), "utf8");
  const order = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  const self = readFileSync(path.join(ROOT, "selftest.html"), "utf8");
  assert.deepEqual([...self.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]), [...SIM_FILES, ...GOLDEN_SCRIPTS, "js/dev/selftest.js"], "selftest.html must load exactly the sim files");
  const inGame = [...SIM_FILES, ...WORLD_FILES];
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
