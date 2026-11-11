// Copies the game files the server runs into functions/game/, because Cloud Functions only uploads
// the functions/ folder. Run automatically before a deploy and before the emulators start.
import { cpSync, rmSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "functions", "game");
rmSync(out, { recursive: true, force: true }); // remove first, so the list below is read from the repo, not a stale copy
const lib = createRequire(import.meta.url)("../functions/lib/game.js");
const files = [...new Set(Object.entries(lib).filter(([k]) => k.endsWith("_FILES")).flatMap(([, v]) => v))];
for (const f of files) { mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); cpSync(path.join(root, f), path.join(out, f)); }
console.log(`functions/game: ${files.length} game file(s) copied`);
