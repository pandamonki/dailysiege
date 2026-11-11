// Resolving alliance offers and dowries

// alliances: offers (with a gold dowry) meet each player's terms; mutual offers ally for free
function resolveAlliances(plans, o = {}) {
  const by = Object.fromEntries(plans.map(p => [p.pid, p])), notes = [], transfers = [], pairs = [], done = new Set();
  plans.forEach(p => { p.pacts = []; p.betray = {}; p.bombs = []; });
  const canLink = (a, b) => { // a match always needs two opposing sides: never let alliances merge everyone into one team
    const par = {}, f = x => (par[x] === undefined || par[x] === x ? (par[x] = x) : (par[x] = f(par[x])));
    plans.forEach(q => f(q.pid)); pairs.concat([[a.pid, b.pid]]).forEach(([x, y]) => { par[f(x)] = f(y); });
    if ((o.feuds || []).some(k => { const [x, y] = k.split("|"); return par[x] !== undefined && par[y] !== undefined && f(x) === f(y); })) return false; // bad blood: betrayers and the betrayed never share a team again
    if (o.blocMax && plans.filter(q => f(q.pid) === f(a.pid)).length > o.blocMax) return false; // a pact group holds at most blocMax lords
    return new Set(plans.map(q => f(q.pid))).size >= 2; };
  const feudHit = (a, b) => (o.feuds || []).some(k => { const [x, y] = k.split("|"); return (x === a.pid || x === b.pid || y === a.pid || y === b.pid); });
  const link = (a, b) => { a.pacts.push(b.pid); b.pacts.push(a.pid); pairs.push([a.pid, b.pid]); };
  if (o.final) { plans.notes = ["Final day: every alliance has ended. Only one banner can win."]; return { pairs, transfers }; }
  // alliances from yesterday carry over, unless either side breaks the pact at the start of the round
  (o.persist || []).forEach(s => {
    const [x, y] = s.split("|"), a = by[x], b = by[y]; if (!a || !b) return;
    const key = [x, y].sort().join("|"); done.add(key);
    if ((a.breaks || []).includes(y) || (b.breaks || []).includes(x)) { notes.push(`${a.name} and ${b.name} ended their alliance.`); return; }
    if (!canLink(a, b)) { notes.push(feudHit(a, b) && (o.feuds || []).length ? `${a.name} and ${b.name} had to part: there is bad blood between their camps after a betrayal.` : `${a.name} and ${b.name} had to part: at least two sides must stay in the fight.`); return; }
    link(a, b); notes.push(`${a.name} and ${b.name} are still allied.`);
    if (a.pbetray && a.pbetray[y]) a.betray[y] = a.pbetray[y];
    if (b.pbetray && b.pbetray[x]) b.betray[x] = b.pbetray[x];
  });
  plans.forEach(a => Object.entries(a.offers || {}).forEach(([bid, off]) => {
    const b = by[bid]; if (!b || !off || b === a) return;
    if (off.day !== o.prevDay) return; // an invitation is answered the planning day after it was sent; newer ones are still pending
    const key = [a.pid, b.pid].sort().join("|"); if (done.has(key)) return;
    const back = (b.offers || {})[a.pid], mutual = !!(back && back.day === o.prevDay);
    let ok, term = null;
    if (mutual) ok = true;
    else if (b.auto) { term = (b.terms || {})[a.pid] || { mode: "accept", min: 200 }; ok = term.mode !== "refuse" && (off.gold || 0) >= (term.min || 0); }
    else ok = (b.replies || {})[a.pid] === "accept";
    if (!ok) { notes.push(b.auto || (b.replies || {})[a.pid] ? `${b.name} turned down ${a.name}'s invitation.` : `${b.name} never answered ${a.name}'s invitation.`); return; }
    done.add(key);
    if (!canLink(a, b)) { notes.push((o.feuds || []).includes([a.pid, b.pid].sort().join("|")) ? `${a.name} and ${b.name} cannot ally again after the betrayal.` : `${a.name} and ${b.name} could not ally: ${o.blocMax ? `an alliance holds at most ${o.blocMax} lords, ` : ""}at least two sides must stay in the fight, and betrayers never rejoin their victims.`); return; }
    link(a, b);
    if (mutual) notes.push(`${a.name} and ${b.name} invited each other and ally for free.`);
    else { transfers.push({ from: a.pid, to: b.pid, gold: off.gold || 0 }); notes.push(`${b.name} accepted ${a.name}'s invitation${off.gold ? ` and a dowry of ${off.gold} gold` : ""}. They fight as allies.`); }
    if (off.rigged) a.betray[b.pid] = "Halfway through the battle"; // rival lords only: they plan to turn on you
    if (back && back.rigged) b.betray[a.pid] = "Halfway through the battle";
    if (term && term.mode === "betray") b.betray[a.pid] = term.when || "Halfway through the battle";
  }));
  plans.notes = notes;
  return { pairs, transfers };
}
