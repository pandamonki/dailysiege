// Style clashes: two parts of the game giving their own base look to the same class name.
// In v1.5 the war-end podium reused ".pd", the planning screen's unit panel, and turned the panel into a centred column.
// A class's base rule is one whose selector is just ".name" (alone or in a comma list), outside any @media or similar block.
// Each class may have only one. To restyle an existing part, add to its rule; for a new part, pick a new name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CSS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../css");

// classes that already had more than one base rule when this check was added (most are deliberate overrides).
// Don't add to this list: a new clash should get its own name instead.
const KNOWN = new Set(["abar", "abd", "abtiles", "alhead", "alrow", "bagbtn", "bd2", "bdhead", "chip", "chip2", "cls", "daychips", "field", "hint", "hwrap", "legend", "mbadge", "pager",
  "rbtns", "rrow", "rule", "stats", "tabi", "udet", "vbubble", "wiz-card", "wiz-face", "wrow"]);

// every top-level rule's selector, with where it is
function baseRules(file) {
  const src = readFileSync(path.join(CSS, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "));
  const out = []; let depth = 0, start = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") { if (depth === 0) { const sel = src.slice(start, i).trim(); if (!sel.startsWith("@")) out.push({ sel, line: src.slice(0, i).split("\n").length }); } depth++; start = i + 1; }
    else if (ch === "}") { depth = Math.max(0, depth - 1); start = i + 1; }
    else if (ch === ";" && depth === 0) start = i + 1; // @import and the like
  }
  return out;
}

test("no class gets its base look from two different rules (a style name clash)", () => {
  const seen = new Map();
  for (const file of readdirSync(CSS).filter(f => f.endsWith(".css")).sort())
    for (const r of baseRules(file))
      for (const s of r.sel.split(",").map(x => x.trim())) {
        const m = /^\.([a-zA-Z][\w-]*)$/.exec(s); if (!m) continue;
        (seen.get(m[1]) || seen.set(m[1], []).get(m[1])).push(`${file}:${r.line}`);
      }
  const clashes = [...seen].filter(([k, at]) => at.length > 1 && !KNOWN.has(k)).map(([k, at]) => `.${k} at ${at.join(", ")}`);
  assert.deepEqual(clashes, [], "These class names are styled from scratch in more than one place. Rename the new one:\n" + clashes.join("\n"));
});
