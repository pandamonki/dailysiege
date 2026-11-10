// Re-record the golden battle hashes. Only run this when a change to the sim or the balance numbers
// is MEANT to change battle outcomes; say so in the commit message.
import { writeFileSync } from "node:fs";
import { computeGolden, GOLDEN_FILE } from "./golden.mjs";

const g = computeGolden();
writeFileSync(GOLDEN_FILE, JSON.stringify({ note: "Recorded by `npm run golden:update`. Do not edit by hand.", ...g }, null, 1) + "\n");
console.log(`Recorded ${g.cases.length} golden battles to ${GOLDEN_FILE} (code ${g.code})`);
