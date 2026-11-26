// Every classic game script must parse. A slip such as a line comment that swallows the code after it breaks the whole page,
// and the browser walkthrough is the only other check that would notice, minutes later.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../tools/load-sim.mjs";

const files = [];
(function walk(dir) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { if (f.name !== "vendor") walk(p); } else if (f.name.endsWith(".js")) files.push(p); } })(path.join(ROOT, "js"));

test("every game script parses", () => {
  const bad = [];
  for (const f of files) { try { new Function(fs.readFileSync(f, "utf8")); } catch (e) { bad.push(`${path.relative(ROOT, f)}: ${e.message}`); } }
  assert.ok(files.length > 20, `only ${files.length} scripts found`);
  assert.deepEqual(bad, []);
});
