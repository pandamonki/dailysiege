// Roster, names, standings, hero levels and income from past battles

// ----- roster -----
function rosterFor(week) {
  return Object.entries(LIVE.players).filter(([, p]) => p.fromWeek && p.fromWeek <= week && !p.left && !p.pending)
    .sort((a, b) => (a[1].joinedAt - b[1].joinedAt) || (a[0] < b[0] ? -1 : 1)).slice(0, capFor(week)).map(([uid, p]) => ({ uid, ...p }));
}
function capFor(week) { const c = LIVE.config || {}; return Math.min(8, (c.capFrom && week < c.capFrom ? c.capPrev : c.maxPlayers) || 8); }
const isLive = () => gameMode === "friends" && !lobbyOpen(LIVE.config) && !!LIVE.config && !!LIVE.uid && !!LIVE.players[LIVE.uid] && rosterFor(liveClock().week).some(p => p.uid === LIVE.uid);
const nameOf = uid => (uid === LIVE.uid ? "You" : (LIVE.names[uid] && LIVE.names[uid].name) || "A player");
// players can register a nickname and their actual name; everyone sees them as "Nickname (Actual name)"
const NICK_MAX = 16, REAL_MAX = 20;
const cleanName = (v, max) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
function lordLabel(p) { const n = cleanName(p && p.nick, NICK_MAX), r = cleanName(p && p.real, REAL_MAX); return n && r && n.toLowerCase() !== r.toLowerCase() ? `${n} (${r})` : n || r || ""; }
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
function latestPlan(p, dayKey, inclusive) {
  const keys = Object.keys(p.plans || {}).filter(k => (inclusive ? k <= dayKey : k < dayKey) && k >= addDays(dayKey, -(weekdayOf(dayKey) - 1))).sort();
  return keys.length ? p.plans[keys[keys.length - 1]] : null;
}
function standings(week, through) {
  const pts = {};
  Object.entries(LIVE.battles).forEach(([k, b]) => { if (b.week !== week || (through && k > through)) return; (b.results || []).forEach(r => { pts[r.pid] = (pts[r.pid] || 0) + r.points; }); });
  return pts;
}
// a champion's level and spare experience on a given day, rebuilt from the week's battles (every client gets the same answer)
function heroState(uid, week, dayKey) {
  let lvl = 1, xp = 0;
  Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === week && k < dayKey).sort().forEach(k => { const b = LIVE.battles[k]; lvl += b.gain ? (b.gain[uid] || 0) : 1; xp = (b.xp && b.xp[uid]) || 0; });
  return { lvl: Math.min(MAX_HERO_LVL, lvl), xp };
}
function carriedPairs(dayKey) {
  const week = addDays(dayKey, -(weekdayOf(dayKey) - 1)); if (dayKey === week) return [];
  const b = LIVE.battles[addDays(dayKey, -1)]; return b && b.week === week && b.pairsEnd ? b.pairsEnd : [];
}
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
  return { week: ck.week, day: ck.planDay, gold: 300 + 150 * (ck.dayNo - 1), cls: "warrior", ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, picks: {},
    triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] }, owned: [], slots: SLOT_START, traps: [], place: defaultPlace([]),
    stance: "skirmish", prio: PRIORITIES.slice(), rules: [{ if: IFS[0], then: THENS[0] }, { if: IFS[1], then: THENS[0] }], diplo: {}, locked: false, phase: "muster",
    gear: { weapon: 0, armour: 0, charm: 0 }, defences: { walls: 0, tower: 0 }, lvl: 1, xp: 0,
    castle: 1, items: [], walls: [], banner: defaultBanner(), pairs: [], pactAct: {}, pactWhen: {}, ob: 1 };
}
function mySnapshot() {
  const pieces = myPieces();
  ensureDip();
  return { items: (S.items || []).slice(), castleTier: S.castle || 1, banner: S.banner, ...pactPlan(), cls: S.cls, ranks: S.ranks, picks: S.picks, triggers: S.triggers, gear: S.gear, defences: S.defences, stance: S.stance, prio: S.prio, rules: S.rules, pieces,
    targets: S.lists.hostile.slice(), offers: Object.fromEntries(S.lists.ally.filter(id => S.offers[id]).map(id => [id, S.offers[id]])), terms: S.terms, tmode: S.strategy.mode, heading: S.strategy.heading, sealed: !!S.locked };
}
