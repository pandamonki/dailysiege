// Hashing battle results, so two devices (or a phone and the server) can prove they fought the same fight

// JSON with object keys in sorted order. Number formatting is fixed by the language spec, so the same
// values give the same text on every JavaScript engine.
function stableStringify(v) {
  if (v === null || typeof v !== "object") { const s = JSON.stringify(v); return s === undefined ? "null" : s; }
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  if (v instanceof Set) return stableStringify(Array.from(v));
  return "{" + Object.keys(v).filter(k => v[k] !== undefined && typeof v[k] !== "function").sort().map(k => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}
// 64 bits from two independent 32-bit mixes (cyrb-style), as 16 hex digits. Integer maths only.
function hashString(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}
// The outcome of a battle: everything that is saved, scored or carried into tomorrow. The same in fast and full runs,
// and the same whoever is watching: display names are left out, because each device shows its own ("You").
function battleOutcome(res) {
  const noName = o => { const c = Object.assign({}, o); delete c.name; return c; };
  return { results: res.results.map(noName), order: res.order, duration: res.duration, team: res.team, lvl: res.lvl, pairsEnd: res.pairsEnd, feudsNew: res.feudsNew, trapsUsed: res.trapsUsed,
    awards: res.awards, ultCast: res.ultCast, rapier: res.rapier, rapierEnd: res.rapierEnd, tel: Object.assign({}, res.tel, { players: res.tel.players.map(noName) }) };
}
const battleHash = res => hashString(stableStringify(battleOutcome(res)));
// What a replay shows: every frame and event of a full (not fast) run. Catches drift the outcome alone could hide.
const replayHash = res => hashString(stableStringify({ frames: res.frames, events: res.events, logs: res.logs, hl: res.hl, wallMeta: res.wallMeta, traps: res.traps }));
