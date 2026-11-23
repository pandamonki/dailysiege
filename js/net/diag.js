// Diagnostics: a rolling log of what went wrong on this device, and a report a lord can copy and send to the host/developer.
const DIAG = [];
function diagLog(kind, msg) { try { DIAG.push(new Date().toISOString().slice(11, 19) + " " + kind + ": " + String(msg).slice(0, 300)); if (DIAG.length > 120) DIAG.shift(); } catch (e) {} }
window.addEventListener("error", e => diagLog("error", (e.message || "") + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno));
window.addEventListener("unhandledrejection", e => diagLog("rejection", (e.reason && (e.reason.code || e.reason.message)) || e.reason));
(function () { const w = console.warn; console.warn = function () { diagLog("warn", Array.from(arguments).map(a => (a && a.message) || String(a)).join(" ")); return w.apply(console, arguments); }; })();
function diagReport() {
  const out = [], P = (k, v) => out.push(k + ": " + (typeof v === "string" ? v : JSON.stringify(v)));
  const safe = (k, f) => { try { P(k, f()); } catch (e) { P(k, "(unavailable: " + e.message + ")"); } };
  P("time", new Date().toISOString()); P("page", location.pathname); P("release", (typeof RELEASES !== "undefined" && RELEASES[0].id) || "?");
  safe("mode", () => ({ gameMode, live: isLive(), readOnly: !!LIVE.readOnly, uid: LIVE.uid ? String(LIVE.uid).slice(0, 6) + "…" : null }));
  safe("config", () => { const c = LIVE.config || {}; return { war: c.war, lobby: c.lobby, lobbyEnds: c.lobbyEnds, startDate: c.startDate, planDay: c.planDay, nextPlanDay: c.nextPlanDay, lockHour: c.lockHour, tz: c.tz, testSkew: c.testSkew, clockWar: c.clockWar, roster: c.roster && { war: c.roster.war, week: c.roster.week, n: (c.roster.uids || []).length }, skipDays: c.skipDays }; });
  safe("clock", () => liveClock());
  safe("state", () => S && { week: S.week, day: S.day, lobbyPrep: !!S.lobbyPrep, locked: !!S.locked, gold: S.gold, owned: (S.owned || []).length, placed: Object.keys(S.place || {}).length, items: (S.items || []).length, walls: (S.walls || []).length, traps: (S.traps || []).length, hostile: ((S.lists || {}).hostile || []).length, pairs: (S.pairs || []).length });
  safe("myOrders", () => { const me = LIVE.players[LIVE.uid] || {}; return Object.fromEntries(Object.entries(me.plans || {}).map(([k, p]) => [k, { sealed: !!p.sealed, hasSealedPlan: !!p.sealedPlan, pieces: (p.pieces || []).length, units: (p.pieces || []).filter(x => x.kind === "unit").length, items: (p.items || []).length, targets: (p.targets || []).length, pacts: (p.pacts || []).length }])); });
  safe("battles", () => Object.entries(LIVE.battles || {}).map(([k, b]) => { const pl = ((b.inputs || {}).plans || []).find(p => p.pid === LIVE.uid); const all = (b.inputs || {}).plans || []; return { day: k, week: b.week, n: (b.results || []).length, lordsWithoutOrders: all.filter(p => p.noOrders).length + " of " + all.length, mine: pl ? { noOrders: !!pl.noOrders, pieces: (pl.pieces || []).length, items: (pl.items || []).length, pacts: (pl.pacts || []).length } : "not in battle" }; }));
  P("recentLog", DIAG.length ? "\n  " + DIAG.slice(-60).join("\n  ") : "(nothing logged)");
  return out.join("\n");
}
async function diagCopy() {
  const t = diagReport();
  try { await navigator.clipboard.writeText(t); toast("Diagnostics copied. Paste them into your message."); return; } catch (e) {}
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" })); a.download = "daily-siege-diagnostics.txt"; document.body.appendChild(a); a.click(); a.remove(); toast("Diagnostics saved as a file."); } catch (e) { toast("Couldn't copy diagnostics."); }
}
