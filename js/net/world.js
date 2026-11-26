// From a game's saved data to a battle, with nothing read from the page.
//
// Every function here takes the "world" it works on as its first argument:
//   W = { config, players: { uid: { fromWeek, joinedAt, nick, real, pending, left, state, plans: { day: orders } } }, battles: { day: doc } }
// so the same code turns orders into a battle on a phone (W is the live game) and on the server
// (W is read straight from the database). Nothing in this file may touch the DOM, the clock or the
// page's own state; `npm test` loads it headlessly to make sure.

// ----- names -----
// players can register a nickname and their actual name; everyone sees them as "Nickname (Actual name)"
const NICK_MAX = 16, REAL_MAX = 20;
const cleanName = (v, max) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
function lordLabel(p) { const n = cleanName(p && p.nick, NICK_MAX), r = cleanName(p && p.real, REAL_MAX); return n && r && n.toLowerCase() !== r.toLowerCase() ? `${n} (${r})` : n || r || ""; }

// ----- roster, standings, hero levels -----
const wWeekOf = (W, dayKey) => addDays(dayKey, -(wWeekdayOf(dayKey, W.config) - 1));
function wCap(W, week) { const c = W.config || {}; return Math.min(MAX_LORDS, (c.capFrom && week < c.capFrom ? c.capPrev : c.maxPlayers) || 8); } // games made before seats were configurable hold 8
// Seats are shuffled once registration closes (wars starting on or after SEAT_SHUFFLE_FROM): who gets a seat is still decided by sign-up order
// (bots give way to people), but where each lord sits round the map is a draw keyed to the war's first day, the same on every phone and the server.
let SEAT_SHUFFLE_FROM = "2026-11-18";
const seatDraw = (week, uid) => { let h = 2166136261; const s = week + "|" + uid; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; }; // FNV-1a, then a full avalanche so every war draws a fresh order
// The war's lords, locked when registration closed (game config `roster`, written by the server): from then on they are the lords,
// whatever later happens to their sign-up records. Wars without a locked roster (before it existed) work it out from the records.
const wLocked = (W, week) => { const c = W.config || {}, r = c.roster; return r && (r.war || 1) === (c.war || 1) && r.week === week && Array.isArray(r.uids) ? r.uids : null; };
function wRoster(W, week) {
  // bots take the seats that people leave free: when the war is full, it is the bots that give way
  const lk = wLocked(W, week);
  const r = Object.entries(W.players).filter(([uid, p]) => lk ? lk.includes(uid) && !p.left : p.fromWeek && p.fromWeek <= week && !p.left && !p.pending)
    .sort((a, b) => (!!a[1].bot - !!b[1].bot) || (a[1].joinedAt - b[1].joinedAt) || (a[0] < b[0] ? -1 : 1)).slice(0, wCap(W, week)).map(([uid, p]) => ({ uid, ...p }));
  if (String(week) >= SEAT_SHUFFLE_FROM) r.sort((a, b) => seatDraw(week, a.uid) - seatDraw(week, b.uid) || (a.uid < b.uid ? -1 : 1));
  return r;
}
function wStandings(W, week, through) {
  const pts = {};
  Object.entries(W.battles).forEach(([k, b]) => { if (b.week !== week || (through && k > through)) return; (b.results || []).forEach(r => { pts[r.pid] = (pts[r.pid] || 0) + r.points; }); });
  return pts;
}
function rankMap(pts, pids) {
  if (!pids.some(p => (pts[p] || 0) > 0)) return {};
  const o = pids.slice().sort((a, b) => (pts[b] || 0) - (pts[a] || 0)); return Object.fromEntries(o.map((p, i) => [p, i + 1]));
}
// a champion's level and spare experience on a given day, rebuilt from the week's battles (every device and the server get the same answer)
function wHeroState(W, uid, week, dayKey) {
  let lvl = 1, xp = 0;
  Object.keys(W.battles).filter(k => W.battles[k].week === week && k < dayKey).sort().forEach(k => { const b = W.battles[k]; lvl += b.gain ? Math.min(xpCapFor(k), b.gain[uid] || 0) : 1; xp = (b.xp && b.xp[uid]) || 0; });
  return { lvl: Math.min(heroMaxLvl(heroV3For(dayKey), lvlV2For(dayKey)), lvl), xp };
}
// Carry-forward: if a lord has not sealed orders for the day, their latest sealed orders of the week are fought again.
function wLatestPlan(W, p, dayKey, inclusive) {
  const keys = Object.keys(p.plans || {}).filter(k => (inclusive ? k <= dayKey : k < dayKey) && k >= wWeekOf(W, dayKey)).sort();
  // The latest sealed orders stand until new ones are sealed. A lord who sealed and then reopened the orders to draft changes is fought on the copy they sealed (`sealedPlan`), not the draft.
  // From BAL_V2_FROM a lord who has never sealed anything this week is fought on their latest draft, so the lock seals it for them; before it, drafts were never fought.
  const v2 = balV2For(dayKey), standing = q => (q && q.sealed ? q : q && v2 && q.sealedPlan ? q.sealedPlan : null);
  const sealed = keys.filter(k => standing(p.plans[k]));
  if (sealed.length) return standing(p.plans[sealed[sealed.length - 1]]);
  const drafts = v2 ? keys.filter(k => p.plans[k]) : [];
  return drafts.length ? p.plans[drafts[drafts.length - 1]] : null;
}
function wCarriedPairs(W, dayKey) {
  const week = wWeekOf(W, dayKey); if (dayKey === week) return [];
  const b = W.battles[addDays(dayKey, -1)]; return b && b.week === week && b.pairsEnd ? b.pairsEnd : [];
}
// breakV2: the alliances that were disbanded in yesterday's orders end now, so they are no longer carried into today
function wPrevBreaks(W, dayKey) { const b = W.battles[addDays(dayKey, -1)], o = {}; if (b && b.inputs) (b.inputs.plans || []).forEach(p => { if ((p.breaks || []).length) o[p.pid] = p.breaks; }); return o; }
function wActivePairs(W, dayKey) {
  const raw = wCarriedPairs(W, dayKey); if (!breakV2For(dayKey) || !raw.length) return raw; const pb = wPrevBreaks(W, dayKey);
  return raw.filter(s => { const [a, b] = Array.isArray(s) ? s : String(s).split("|"); return !((pb[a] || []).includes(b) || (pb[b] || []).includes(a)); });
}
const wFeudsBefore = (W, dayKey, week) => Array.from(new Set(Object.keys(W.battles).filter(k => k < dayKey && W.battles[k].week === week).flatMap(k => W.battles[k].feuds || [])));
// the Divine Rapier belongs to whoever carried it off the field last: nobody else may start a fight holding it
function wRapierItems(W, items, uid, week, dayKey) {
  let holder = null; Object.keys(W.battles).filter(k => W.battles[k].week === week && k < dayKey).sort().forEach(k => { const r = W.battles[k].rapier; if (r && r.to) holder = r.to; });
  if (!holder) return items; const has = items.includes("rapier");
  return holder === uid ? (has ? items : items.concat(["rapier"])) : items.filter(k => k !== "rapier");
}
// Each lord's main banner colour is their team colour. One lord per colour: the earlier sign-up keeps a contested colour.
function wTeamColours(pool, bannerOf) { // pool: [uid, player] in sign-up order
  const out = {}, used = new Set(), later = [];
  pool.forEach(([uid, p]) => { const c = (bannerOf(uid, p) || {}).c1; if (c && SEAT_COLORS.includes(c) && !used.has(c)) { out[uid] = c; used.add(c); } else later.push(uid); });
  later.forEach(uid => { const c = SEAT_COLORS.find(x => !used.has(x)) || SEAT_COLORS[0]; out[uid] = c; used.add(c); });
  return out;
}

// ----- daily twist and contracts (battles from CONTRACTS_FROM; see config/contracts.js) -----
const wTwist = (W, dayKey) => contractsFor(dayKey) ? dayTwist(wWeekOf(W, dayKey), wWeekdayOf(dayKey, W.config)) : null;
// the three contracts offered to a lord for a day: one aimed at a rival, chosen from the board and from who hurt them last battle
function wContractOffers(W, dayKey, uid) {
  if (!contractsFor(dayKey)) return [];
  const week = wWeekOf(W, dayKey), ids = wRoster(W, week).map(p => p.uid); if (!ids.includes(uid)) return [];
  const pts = wStandings(W, week, addDays(dayKey, -1)), lead = Object.entries(pts).filter(([p, v]) => v > 0 && ids.includes(p)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  const prev = W.battles[addDays(dayKey, -1)], nemesis = prev && prev.week === week && prev.foes ? prev.foes[uid] || null : null;
  return contractOffers({ uid, dayKey, rivals: ids, leader: lead ? lead[0] : null, nemesis });
}
// who hurt each lord most in a battle: whoever took their castle, else whoever slew their hero most often (tomorrow's Revenge contract)
function battleFoes(res) {
  const out = {}; Object.entries(res.stats || {}).forEach(([pid, s]) => { let f = s.fellTo; if (!f) { const e = Object.entries(s.heroBy || {}).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]; f = e ? e[0] : null; } if (f && f !== pid) out[pid] = f; });
  return out;
}

// ----- bot lords and alliances (alliances v2) -----
// Each day a bot has a BOT_INVITE chance to invite one lord, with a small dowry. It accepts an invitation that pays its price
// (nothing if it is behind on points, more from lords below it). A bot in the bottom half of the board plans to betray about
// BOT_BETRAY of its pacts. Everything is drawn from the day and the bot's id, so every device works out the same plan.
const BOT_INVITE = .3, BOT_BETRAY = .2;
function wBotDiplomacy(uid, dayKey, ids, rkm, feuds) {
  const h = (d, k) => cxHash(d + "|" + uid + "|" + k), n = ids.length, rank = rkm[uid] || n, behind = rank > Math.ceil(n / 2);
  const others = ids.filter(q => q !== uid && !(feuds || []).includes([uid, q].sort().join("|")));
  const offerOn = d => { if (!others.length || h(d, "inv") >= BOT_INVITE) return null; const to = others[Math.floor(h(d, "to") * others.length)];
    return [to, { day: d, gold: [0, 50, 100][Math.floor(h(d, "dow") * 3)], ...(behind && h(d, "rig") < BOT_BETRAY ? { rigged: true } : {}) }]; };
  const offers = {}; [addDays(dayKey, -1), dayKey].forEach(d => { const o = offerOn(d); if (o) offers[o[0]] = o[1]; }); // yesterday's invitation is the one answered today
  const terms = Object.fromEntries(others.map(q => [q, { mode: behind && h(dayKey, "tb" + q) < BOT_BETRAY ? "betray" : "accept", min: behind ? 0 : (rkm[q] || n) > rank ? 150 : 50, when: "Halfway through the battle" }]));
  const pbetray = behind ? Object.fromEntries(others.filter(q => h(dayKey, "pb" + q) < BOT_BETRAY).map(q => [q, "Halfway through the battle"])) : {};
  return { offers, terms, auto: true, pbetray };
}

// ----- turning everyone's orders into a battle -----
// opts (phones only): uid = whose device this is; nameOf, colours = how this device shows names and colours;
// test = { mine } builds a practice fight from my unsaved orders against what is publicly known of my rivals.
function buildBattleInputs(W, dayKey, opts = {}) {
  const week = wWeekOf(W, dayKey), roster = wRoster(W, week), L = seatLayout(roster.length, mapV2For(week), mapV3For(week)), dayNo = wWeekdayOf(dayKey, W.config), final = dayNo === 7;
  const pts = wStandings(W, week, addDays(dayKey, -1)), lead = Object.entries(pts).sort((a, b) => b[1] - a[1])[0];
  const TC = opts.colours || wTeamColours(roster.map(p => [p.uid, p]), (uid, p) => p.state && p.state.banner);
  const nameOf = opts.nameOf || (uid => lordLabel(W.players[uid]) || "A lord");
  const rkm0 = rankMap(dayNo > 1 ? wStandings(W, week, addDays(dayKey, -1)) : {}, roster.map(q => q.uid));
  const raw = roster.map((p, i) => {
    let plan;
    const hs = wHeroState(W, p.uid, week, dayKey), lvl = hs.lvl, z = zoneFor(L.castles[i], L.N, L.castles, L.v2), sp = armySpots(L.castles[i], L.N);
    const botDay = n => lordBotPlan({ uid: p.uid, cls: (p.state && p.state.cls) || "warrior", i, ids: roster.map(q => q.uid), L, zone: z, dayNo: n, lvl: wHeroState(W, p.uid, week, addDays(week, n - 1)).lvl, v2: balV3For(dayKey), sup: supplyV2For(dayKey), fair: fairV1For(dayKey), pick: pickV1For(dayKey), ranks: rkm0, v3: heroV3For(dayKey), defV2: suddenV2For(dayKey), zv: zoneV1For(dayKey), prev: tuneV1For(dayKey) ? (b => (b && b.week === week && b.inputs ? b.inputs.plans : null))(W.battles[addDays(dayKey, -1)]) : null });
    if (opts.test && p.uid === opts.uid) plan = opts.test.mine;
    else if (p.bot) plan = opts.test ? (dayNo > 1 ? botDay(dayNo - 1) : null) : botDay(dayNo); // bots have no saved orders: theirs are worked out. In a test only yesterday's are known
    else if (opts.test) plan = lvl > 1 ? wLatestPlan(W, p, dayKey, false) : null; // fog: only yesterday's orders are known
    else plan = wLatestPlan(W, p, dayKey, true);
    const noOrders = !plan;
    if (plan) plan = JSON.parse(JSON.stringify(plan)); // the battle must never change the saved orders it reads, or replaying it later gives a different fight
    plan = plan || { cls: (p.state && p.state.week === week && p.state.cls) || "warrior", ranks: autoRanks(lvl, i + 1), ...(heroV3For(dayKey) ? { tree: autoTree(lvl, i + 1, (p.state && p.state.week === week && p.state.cls) || "warrior") } : {}), picks: {}, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
      gear: {}, defences: {}, stance: "aggressive", prio: PRIORITIES.slice(), rules: [], pieces: [], pacts: [], hostile: [], betray: {} };
    let champSeen = false; const unitSeen = new Set();
    let pieces = (plan.pieces || []).slice().reverse().filter(pc => { if (pc.kind === "champ") { if (champSeen) return false; champSeen = true; } else if (pc.id) { if (unitSeen.has(pc.id)) return false; unitSeen.add(pc.id); } return true; }).reverse().filter(pc => pc.kind === "wall" ? wallTiles(pc.r, pc.c, pc.dir).every(([a, b]) => z.has(`${a},${b}`)) : z.has(`${pc.r},${pc.c}`));
    if (!pieces.some(pc => pc.kind === "champ")) pieces = [{ kind: "champ", r: sp.champ[0], c: sp.champ[1] }, ...pieces];
    return { uid: p.uid, i, plan, pieces, hs, noOrders };
  });
  const rkm = rkm0;
  const plans = raw.map(({ uid, i, plan, pieces, hs, noOrders }) => ({
    pid: uid, me: uid === opts.uid, name: nameOf(uid), color: TC[uid] || SEAT_COLORS[i], cls: plan.cls, level: hs.lvl, xp0: hs.xp, ultArm: plan.ultArm, shellAt: plan.shellAt, blessing: plan.blessing || null, items: wRapierItems(W, plan.items || [], uid, week, dayKey), castleTier: plan.castleTier || 1, banner: plan.banner || null, breaks: plan.breaks || [], pbetray: plan.pbetray || {}, ...(betrayV2For(dayKey) && plan.betrayAll ? { betrayAll: true } : {}), castle: L.castles[i], leader: !!(lead && lead[1] > 0 && lead[0] === uid),
    ranks: heroV3For(dayKey) ? { a1: 0, a2: 0, a3: 0, ult: 0 } : plan.ranks || { a1: 0, a2: 0, a3: 0, ult: 0 }, ...(heroV3For(dayKey) ? { tree: cleanTree(plan.tree) } : {}), picks: plan.picks || {}, triggers: plan.triggers || {}, gear: plan.gear || {}, defences: plan.defences || {},
    ...(itemsV5For(dayKey) ? { itemV5: true } : {}), ...(trapsV2For(dayKey) ? { trapV2: true } : {}), ...(suddenV2For(dayKey) ? { sdV2: true, wallV2: true, engV2: true } : {}), ...(survFor(dayKey) ? { survV1: true } : {}), ...(shellV2For(dayKey) ? { shellV2: true } : {}), ...(itemsV6For(dayKey) ? { itemV6: true } : {}), ...(auraV2For(dayKey) ? { auraV2: true } : {}), ...(placeV2For(dayKey) ? { placeV2: true } : {}), ...(waveV2For(dayKey) ? { waveV2: true } : {}), ...(waveV3For(dayKey) ? { waveV3: true } : {}), ...(waveV4For(dayKey) ? { waveV4: true } : {}), ...(balV5For(dayKey) ? { balV5: true } : {}), ...(finV2For(dayKey) ? { finV2: true } : {}), ...(lvlV2For(dayKey) ? { lvlV2: true } : {}), ...(L.v2 ? { siegeV1: true } : {}), formation: plan.formation !== false, stance: plan.stance || "aggressive", gprio: plan.gprio || null, engage: plan.engage || 0, waves: plan.waves || null, prio: plan.prio || PRIORITIES.slice(), rules: plan.rules || [], pieces,
    targets: (plan.targets || []).filter(q => raw.some(x => x.uid === q) || (pickV1For(dayKey) && !!PICK_ROLES[q])), tmode: plan.tmode || "list", heading: plan.heading || "near", armyPlan: plan.armyPlan || null, fallback: plan.fallback || null, ...(timeV1For(dayKey) ? { timeV1: true } : {}), ...(tuneV1For(dayKey) ? { tuneV1: true } : {}), ...(zoneV1For(dayKey) ? { zoneV1: true, front: plan.front || "assault", flanks: cleanFlanks(plan.flanks), temper: plan.temper || "steady" } : {}), ...(ordersV2For(dayKey) ? { ordV2: true } : {}), ...(skillsV2For(dayKey) ? { skV2: true } : {}), rank: rkm[uid], offers: plan.offers || {}, replies: plan.replies || {}, terms: plan.terms || {}, bids: plan.bids || {},
    ...(noOrders && !opts.test ? { noOrders: true } : {}) })); // noOrders: this lord sealed nothing all week, so these are the stand-in orders, not theirs
  const feuds0 = wFeudsBefore(W, dayKey, week), AV2 = allyV2For(dayKey);
  if (AV2) plans.forEach(q => { q.allyV2 = true; if ((roster.find(x => x.uid === q.pid) || {}).bot) Object.assign(q, wBotDiplomacy(q.pid, dayKey, roster.map(x => x.uid), rkm, feuds0)); }); // bots join the diplomacy from alliances v2
  const { pairs, transfers } = resolveAlliances(plans, { persist: wActivePairs(W, dayKey), delayBreak: breakV2For(dayKey), final: final && !finV2For(dayKey), prevDay: addDays(dayKey, -1), feuds: feuds0, blocMax: balV2For(dayKey) ? BLOC_MAX : 0, v2: AV2 });
  plans.feuds = feuds0;
  let mercs = {}; if (dayNo >= MERC_DAY) { const mer = resolveMercs(plans, { day: dayKey, dayNo, v2: mercV2For(dayKey), N: L.N, cool: id => mercCool(id, null, k => { const b = W.battles[addDays(dayKey, -k)]; return b && b.week === week ? b : null; }) }); plans.notes = (plans.notes || []).concat(mer.notes); mercs = mer.hires; }
  plans.mercs = mercs;
  const twist = wTwist(W, dayKey), offers = {}, picks = {};
  if (contractsFor(dayKey)) raw.forEach(({ uid, plan }) => { const o = wContractOffers(W, dayKey, uid); offers[uid] = o; const bot = W.players[uid] && W.players[uid].bot;
    const k = bot && !opts.test ? o[Math.floor(cxHash(dayKey + uid + "bot") * o.length)] : plan && plan.contract; if (k && o.includes(k)) picks[uid] = k; });
  return { N: L.N, plans, pairs, transfers, final, mercs, feuds: plans.feuds, week, dayNo, lords: roster.length, ranks: rkm, twist, offers, picks };
}
const daySeed = dayKey => (+dayKey.replace(/-/g, "") % 1000003) * 7 + 13;

// Fight the day's battle and build the record that is saved for it. `at` is the time to stamp on it.
function fightDay(W, dayKey, at, opts) {
  const { N: size, plans, pairs, transfers, final, mercs, feuds, week, dayNo, ranks, twist, offers, picks } = buildBattleInputs(W, dayKey, opts);
  // ranks: the standings going into the day. They set the bounty on the top three, so the official fight and every replay must use the same ones.
  const inputs = JSON.parse(JSON.stringify({ N: size, final: !!final, ultV2: ultV2For(dayKey), balV2: balV2For(dayKey), balV3: balV3For(dayKey), fairV1: fairV1For(dayKey), pickV1: pickV1For(dayKey), balV4: balV4For(dayKey), suddenV1: suddenV1For(dayKey), treesV1: treesV1For(dayKey), heroV3: heroV3For(dayKey), dayNo, ranks, ...(twist ? { twist } : {}), feuds: plans.feuds || [], plans: plans.map(p => Object.assign({}, p, { me: false })) })); // taken before the fight, which edits its plans as it goes
  const res = runBattle(plans, daySeed(dayKey), { fast: true, N: size, finalDay: final, ultV2: ultV2For(dayKey), balV2: balV2For(dayKey), balV3: balV3For(dayKey), fairV1: fairV1For(dayKey), pickV1: pickV1For(dayKey), balV4: balV4For(dayKey), suddenV1: suddenV1For(dayKey), treesV1: treesV1For(dayKey), heroV3: heroV3For(dayKey), dayNo, ranks, twist });
  const units = {}; res.tel.ents.filter(e => e.kind === "unit" && e.ref).forEach(e => { (units[e.pid] = units[e.pid] || {})[e.ref] = e.survived ? 1 : 0; });
  const doc = { week, day: dayNo, at, results: res.results.map(r => ({ pid: r.pid, place: r.place, points: r.points, kills: r.kills, ukills: r.ukills || 0, castles: r.castles, fellAt: r.fellAt ?? null, ...(r.treachery ? { treachery: r.treachery } : {}), ...(r.lone ? { lone: r.lone } : {}) })), units, pairs: pairs.map(p => p.join("|")), pairsEnd: res.pairsEnd, transfers,
    awards: res.awards, ...(res.rapier ? { rapier: res.rapier } : {}), ...(res.ultCast && res.ultCast.length ? { ults: Object.fromEntries(res.ultCast.map(p => [p, 1])) } : {}), ...(res.rapierEnd ? { rapierEnd: res.rapierEnd } : {}), gain: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.gain])), xp: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.xp])), gold: Object.fromEntries(res.results.map(r => [r.pid, r.gold])), team: !!res.team };
  doc.feuds = Array.from(new Set((feuds || []).concat(res.feudsNew || []))); doc.mercs = mercs || {}; doc.trapsUsed = res.trapsUsed || []; doc.inputs = inputs; // the exact orders fought, so replaying never depends on orders that were edited or lost later
  doc.resultHash = battleHash(res); // a fingerprint of the outcome: every device that replays this battle must arrive at the same one
  if (contractsFor(dayKey)) { // contracts are paid on top of the battle's own result (after the fingerprint, which covers the fight alone)
    const cs = settleContracts(res, picks, offers, twist); doc.contracts = cs; doc.offers = offers; doc.foes = battleFoes(res); if (twist) doc.twist = twist;
    Object.entries(cs).forEach(([pid, c]) => { const r = doc.results.find(x => x.pid === pid); if (r) { r.points += c.pts; if (c.pts) r.contract = c.pts; } if (c.gold) doc.gold[pid] = (doc.gold[pid] || 0) + c.gold; });
  }
  return doc;
}
