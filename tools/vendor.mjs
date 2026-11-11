// Copies the Firebase browser SDK out of node_modules into js/vendor/, so the game loads it from its
// own site (no third-party CDN, and it can be cached for offline use later). Runs after `npm install`.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "js", "vendor", "firebase");
mkdirSync(out, { recursive: true });
let n = 0;
for (const name of ["app", "auth", "firestore", "functions", "messaging"]) {
  const src = path.join(root, "node_modules", "firebase", `firebase-${name}-compat.js`);
  if (existsSync(src)) { cpSync(src, path.join(out, path.basename(src))); n++; }
}
console.log(`js/vendor/firebase: ${n} file(s) copied`);
