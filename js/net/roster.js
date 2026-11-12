// Roster, names, standings, hero levels and income from past battles

// ----- roster -----
const rosterFor = week => wRoster(LIVE, week);
const capFor = week => wCap(LIVE, week);
const isLive = () => gameMode === "friends" && !lobbyOpen(LIVE.config) && !!LIVE.config && !!LIVE.uid && !!LIVE.players[LIVE.uid] && rosterFor(liveClock().week).some(p => p.uid === LIVE.uid);
const nameOf = uid => (uid === LIVE.uid ? "You" : (LIVE.names[uid] && LIVE.names[uid].name) || "A player");
function applyNicks() { for (const [uid, p] of Object.entries(LIVE.players)) { const l = lordLabel(p); if (l) LIVE.names[uid] = Object.assign({}, LIVE.names[uid], { name: l }); }
  if (LIVE.names[LIVE.uid] && LIVE.names[LIVE.uid].name && (isLive() || inLobby())) MY_NAME = LIVE.names[LIVE.uid].name; }
const NAME_DRAFT = {};
document.addEventListener("input", e => { if (e.target && (e.target.id === "mynick" || e.target.id === "myreal")) NAME_DRAFT[e.target.id] = e.target.value; });
function nameForm(note, withSave = true) { const p = LIVE.players[LIVE.uid] || {}, v = (id, k) => esc(NAME_DRAFT[id] ?? p[k] ?? "");
  return `<div class="lrow nmrow"><label>Nickname<input id="mynick" maxlength="${NICK_MAX}" autocomplete="off" placeholder="e.g. The Iron Duke" value="${v("mynick", "nick")}"></label>
    <label>Actual name<input id="myreal" maxlength="${REAL_MAX}" autocomplete="off" placeholder="e.g. Josh" value="${v("myreal", "real")}"></label>
    ${withSave ? `<button class="btn small wood" data-act="savename">Save</button>` : ""}</div>${note ? `<p class="muted">${note}</p>` : ""}`; }
async function saveName() {
  const nick = cleanName((document.getElementById("mynick") || {}).value, NICK_MAX), real = cleanName((document.getElementById("myreal") || {}).value, REAL_MAX);
  if (!nick && !real) { toast("Enter a nickname or your name."); return; }
  if (!inLobby() && rosterFor(liveClock().week).some(p => p.uid === LIVE.uid)) { toast("Names are fixed once the war has begun."); return; }
  try { await myWrite(r => r.update({ nick, real })); Object.assign(LIVE.players[LIVE.uid], { nick, real }); delete NAME_DRAFT.mynick; delete NAME_DRAFT.myreal; applyNicks();
    if (isLive()) refreshLiveWorld(); toast(`You'll appear as ${lordLabel({ nick, real })}.`); document.activeElement && document.activeElement.blur && document.activeElement.blur(); if (inLobby()) renderLobby(); render(); }
  catch (e) { console.warn("name save failed", e); toast(`Couldn't save your name${e && e.code ? " (" + e.code + ")" : ""}. Try again.`); }
}
const latestPlan = (p, dayKey, inclusive) => wLatestPlan(LIVE, p, dayKey, inclusive);
const standings = (week, through) => wStandings(LIVE, week, through);
const heroState = (uid, week, dayKey) => wHeroState(LIVE, uid, week, dayKey);
const carriedPairs = dayKey => wCarriedPairs(LIVE, dayKey);
// what a player earns after battle `dayKey`: base pay, spoils from kills, and the catch-up for the bottom 30% of the board
function incomeFor(uid, week, dayKey) {
  const b = LIVE.battles[dayKey], pts = standingsThrough(week, dayKey), ids = rosterFor(week).map(p => p.uid);
  const order = ids.slice().sort((x, y) => (pts[x] || 0) - (pts[y] || 0)), idx = order.indexOf(uid);
  const spoils = (b && b.gold && b.gold[uid]) || 0, catchUp = idx > -1 ? catchUpGold(order.length, idx) : 0;
  const pl = LIVE.players[uid], plan = pl && latestPlan(pl, dayKey, true), castle = CASTLE_INCOME[Math.max(0, Math.min(2, ((plan && plan.castleTier) || 1) - 1))];
  return { base: BASE_INCOME, castle, spoils, catchUp, total: BASE_INCOME + castle + spoils + catchUp };
}
const standingsThrough = (week, dayKey) => standings(week, dayKey);
function freshLiveState(ck) {
  return { week: ck.week, day: ck.planDay, gold: 300 + BASE_INCOME * (ck.dayNo - 1), cls: "warrior", ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, picks: {},
    triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] }, owned: [], slots: SLOT_START, traps: [], place: defaultPlace([]),
    stance: "skirmish", prio: PRIORITIES.slice(), rules: [{ if: IFS[0], then: THENS[0] }, { if: IFS[1], then: THENS[0] }], diplo: {}, locked: false, phase: "muster",
    gear: { weapon: 0, armour: 0, charm: 0 }, defences: { walls: 0, tower: 0 }, lvl: 1, xp: 0,
    castle: 1, items: [], walls: [], banner: defaultBanner(), pairs: [], pactAct: {}, pactWhen: {}, ob: 1,
    paid: (() => { const o = {}; for (let d = ck.week; d < ck.planDay; d = addDays(d, 1)) o[d] = 1; return o; })() };
}
function mySnapshot() {
  const pieces = myPieces();
  ensureDip();
  return { formation: S.formation !== false, ultArm: planUlt(), blessing: planBless(), items: (S.items || []).slice(), castleTier: S.castle || 1, banner: S.banner, ...pactPlan(), cls: S.cls, ranks: S.ranks, picks: S.picks, triggers: S.triggers, gear: S.gear, defences: S.defences, stance: S.stance, prio: S.prio, gprio: S.gprio, engage: S.engage, waves: garrisonPlan(), rules: S.rules, pieces,
    targets: S.lists.hostile.slice(), offers: Object.assign({}, S.offers), replies: Object.assign({}, S.replies), terms: S.terms, bids: Object.assign({}, S.bids), tmode: S.strategy.mode, heading: S.strategy.heading, sealed: !!S.locked, ...(!S.locked && S.sealedSnap ? { sealedPlan: S.sealedSnap } : {}) };
}
