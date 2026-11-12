// Runs the game's own script files on the server, so the server and the phones share one implementation.
//
// The game is classic scripts sharing one global scope. Rather than port them, the files are run in
// index.html order inside a Node `vm` context. When deployed, the files are copied into functions/game/
// by `npm run functions:sync` (Cloud Functions only uploads this folder); in the repo they are read
// from the repo root directly.
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

// In the repo, read the real files (never a stale copy); once deployed, only the copy exists.
const REPO = path.join(__dirname, "..", ".."), COPIED = path.join(__dirname, "..", "game");
const ROOT = fs.existsSync(path.join(REPO, "js", "sim", "battle.js")) ? REPO : COPIED;

// The game files the server runs, in index.html order. `npm run functions:sync` copies exactly these.
// The battle simulation and everything it reads:
const SIM_FILES = [
  "js/config/classes.js",
  "js/config/units.js",
  "js/config/mercs.js",
  "js/config/orders.js",
  "js/config/items.js",
  "js/config/balance.js",
  "js/config/spells.js",
  "js/config/trees.js",
  "js/config/seats.js",
  "js/core/util.js",
  "js/core/detmath.js",
  "js/core/layout.js",
  "js/core/player.js",
  "js/sim/bots.js",
  "js/sim/alliances.js",
  "js/sim/heroTrees.js",
  "js/sim/battle.js",
  "js/sim/hash.js",
];
// The game clock, and the code that turns a game's saved data into a battle:
const CLOCK_FILES = ["js/net/clock.js"];
const WORLD_FILES = ["js/net/clock.js", "js/net/world.js"];

/**
 * @param {string[]} files classic scripts to run, paths from the repo root
 * @param {object} [o]
 * @param {boolean} [o.strict] make Math.random and the clock throw, to prove a battle never touches them (tests only)
 */
function loadGame(files, { strict = false } = {}) {
  const context = vm.createContext({ console });
  for (const rel of files) vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), context, { filename: rel });
  if (strict) vm.runInContext(
    `Math.random = () => { throw new Error("Math.random reached from the sim"); };
     Date.now = () => { throw new Error("Date.now reached from the sim"); };
     Date = new Proxy(Date, { construct() { throw new Error("new Date reached from the sim"); }, apply() { throw new Error("Date() reached from the sim"); } });`,
    context, { filename: "strict" });
  // top-level const/let are not properties of the global object, so look names up by evaluating them
  return { context, run: code => vm.runInContext(code, context), get: name => vm.runInContext(name, context) };
}

module.exports = { loadGame, SIM_FILES, CLOCK_FILES, WORLD_FILES, ROOT };
