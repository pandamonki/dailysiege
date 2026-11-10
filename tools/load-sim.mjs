// Loads the game's battle simulation headlessly, without a browser.
//
// The game is classic scripts sharing one global scope, so instead of converting it to modules we
// run the same files, in the same order as index.html, inside a Node `vm` context. Only the
// DOM-free files are loaded (config, the needed core files, sim). The same loader is meant to be
// reused by the server-side battle resolver later, so the server and the phones run one sim.
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Order matters and must follow index.html.
export const SIM_FILES = [
  "js/config/classes.js",
  "js/config/units.js",
  "js/config/mercs.js",
  "js/config/orders.js",
  "js/config/items.js",
  "js/config/balance.js",
  "js/config/spells.js",
  "js/core/util.js",
  "js/core/layout.js",
  "js/core/player.js",
  "js/sim/bots.js",
  "js/sim/alliances.js",
  "js/sim/battle.js",
  "js/sim/hash.js",
];

// Globals the sim files expect from files we do not load (they are browser-only):
//  - DAY and S come from js/core/state.js, which reads localStorage and the clock.
//    The sim only falls back to DAY when a plan carries no hero level; it is pinned here so a
//    headless battle can never depend on the real date.
const PRELUDE = "let DAY = 1, S = null;";

/**
 * @param {object} [o]
 * @param {string[]} [o.extraFiles] more classic scripts to load after the sim (paths from the repo root)
 * @param {boolean} [o.strict] make Math.random and the clock throw, to prove the sim never touches them
 * @returns {{ context: object, get: (name: string) => any, run: (code: string) => any }}
 */
export function loadSim({ extraFiles = [], strict = false } = {}) {
  const context = vm.createContext({ console });
  vm.runInContext(PRELUDE, context, { filename: "prelude" });
  for (const rel of [...SIM_FILES, ...extraFiles]) {
    vm.runInContext(readFileSync(path.join(ROOT, rel), "utf8"), context, { filename: rel });
  }
  if (strict) {
    vm.runInContext(
      `Math.random = () => { throw new Error("Math.random reached from the sim"); };
       Date.now = () => { throw new Error("Date.now reached from the sim"); };
       Date = new Proxy(Date, { construct() { throw new Error("new Date reached from the sim"); }, apply() { throw new Error("Date() reached from the sim"); } });`,
      context, { filename: "strict" });
  }
  const run = code => vm.runInContext(code, context);
  // top-level const/let are not properties of the global object, so look names up by evaluating them
  const get = name => run(name);
  return { context, get, run };
}
