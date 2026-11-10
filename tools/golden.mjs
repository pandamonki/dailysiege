// Shared by the tests and the update script: compute the golden hashes with the headless sim.
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadSim, ROOT } from "./load-sim.mjs";

export const GOLDEN_FILE = path.join(ROOT, "test/golden/hashes.json");
export const GOLDEN_SCRIPTS = ["js/dev/goldenCases.js"];

export function computeGolden({ strict = true } = {}) {
  const sim = loadSim({ extraFiles: GOLDEN_SCRIPTS, strict });
  const count = sim.get("GOLDEN_COUNT"), cases = [];
  for (let i = 0; i < count; i++) cases.push(JSON.parse(JSON.stringify(sim.run(`goldenHashes(${i})`))));
  return cases;
}
export const readGolden = () => JSON.parse(readFileSync(GOLDEN_FILE, "utf8"));
