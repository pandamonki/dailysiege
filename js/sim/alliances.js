// Resolving alliance offers and dowries

// alliances: offers (with a gold dowry) meet each player's terms; mutual offers ally for free
function resolveAlliances(plans, o = {}) {
  const by = Object.fromEntries(plans.map(p => [p.pid, p])), notes = [], transfers = [], pairs = [], done = new Set();
  plans.forEach(p => { p.pacts = []; p.betray = {}; p.bombs = []; });
  const link = (a, b) => { a.pacts.push(b.pid); b.pacts.push(a.pid); pairs.push([a.pid, b.pid]); };
  if (o.final) { plans.notes = ["Final day: every alliance has ended. Only one banner can win."]; return { pairs, transfers }; }
  // alliances from yesterday carry over, unless either side breaks the pact at the start of the round
  (o.persist || []).forEach(s => {
    const [x, y] = s.split("|"), a = by[x], b = by[y]; if (!a || !b) return;
    const key = [x, y].sort().join("|"); done.add(key);
    if ((a.breaks || []).includes(y) || (b.breaks || []).includes(x)) { notes.push(`${a.name} and ${b.name} ended their alliance.`); return; }
    link(a, b); notes.push(`${a.name} and ${b.name} are still allied.`);
    if (a.pbetray && a.pbetray[y]) a.betray[y] = a.pbetray[y];
    if (b.pbetray && b.pbetray[x]) b.betray[x] = b.pbetray[x];
  });
  plans.forEach(a => Object.entries(a.offers || {}).forEach(([bid, off]) => {
    const b = by[bid]; if (!b || !off || b === a) return;
    const key = [a.pid, b.pid].sort().join("|"); if (done.has(key)) return;
    const back = (b.offers || {})[a.pid];
    if (back) {
      done.add(key); link(a, b); notes.push(`${a.name} and ${b.name} sought each other out and ally for free.`);
      if (off.rigged) a.betray[b.pid] = "Halfway through the battle";
      if (back.rigged) b.betray[a.pid] = "Halfway through the battle";
      return;
    }
    const term = (b.terms || {})[a.pid] || { mode: "accept", min: 200 };
    if (term.mode === "refuse" || (off.gold || 0) < (term.min || 0)) { notes.push(`${b.name} turned down ${a.name}'s alliance offer.`); return; }
    done.add(key); link(a, b); transfers.push({ from: a.pid, to: b.pid, gold: off.gold || 0 });
    notes.push(`${b.name} accepted ${a.name}'s dowry of ${off.gold || 0} gold. They fight as allies.`);
    if (off.rigged) a.betray[b.pid] = "Halfway through the battle"; // rival lords only: they plan to turn on you
    if (term.mode === "betray") b.betray[a.pid] = term.when || "Halfway through the battle";
  }));
  plans.notes = notes;
  return { pairs, transfers };
}
