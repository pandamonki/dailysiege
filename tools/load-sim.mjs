// Loads the game's battle simulation headlessly, without a browser, for the tests.
//
// The game is classic scripts sharing one global scope, so instead of converting it to modules the
// same files are run, in the same order as index.html, inside a Node `vm` context. The loader and
// the file lists live in functions/lib/game.js, because the server runs battles the same way.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const lib = createRequire(import.meta.url)("../functions/lib/game.js");

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SIM_FILES = lib.SIM_FILES;     // the simulation and everything it reads
export const WORLD_FILES = lib.WORLD_FILES; // on top of the sim: the clock and the code that turns saved data into a battle

/**
 * @param {object} [o]
 * @param {string[]} [o.extraFiles] more classic scripts to load after the sim (paths from the repo root)
 * @param {boolean} [o.strict] make Math.random and the clock throw, to prove the sim never touches them
 * @returns {{ context: object, get: (name: string) => any, run: (code: string) => any }}
 */
export function loadSim({ extraFiles = [], strict = false } = {}) {
  return lib.loadGame([...SIM_FILES, ...extraFiles], { strict });
}
