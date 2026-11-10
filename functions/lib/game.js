// Runs the game's own script files on the server, so the server and the phones share one implementation.
//
// The game is classic scripts sharing one global scope. Rather than port them, the files are run in
// index.html order inside a Node `vm` context. When deployed, the files are copied into functions/game/
// by `npm run functions:sync` (Cloud Functions only uploads this folder); in the repo they are read
// from the repo root directly.
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const COPIED = path.join(__dirname, "..", "game");
const ROOT = fs.existsSync(COPIED) ? COPIED : path.join(__dirname, "..", "..");

// Files the server needs, in index.html order. Keep `tools/sync-functions.mjs` copying exactly these.
const CLOCK_FILES = ["js/net/clock.js"];

function loadGame(files) {
  const context = vm.createContext({ console, Intl, Date });
  for (const rel of files) vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), context, { filename: rel });
  return { context, run: code => vm.runInContext(code, context), get: name => vm.runInContext(name, context) };
}

module.exports = { loadGame, CLOCK_FILES, ROOT };
