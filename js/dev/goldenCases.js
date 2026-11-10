// Golden battles: a fixed set of varied battles whose result hashes must never change by accident,
// and must be the same on every device. Used by the Node tests and by the phone self-test page.
// Depends only on the config, core and sim files (no DOM). Not loaded by the game itself.

const GOLDEN_COUNT = 50;
const GOLDEN_FULL_EVERY = 5; // every 5th case also runs a full (replay) battle and hashes its frames

// One case, built only from its number: who is playing, their armies and orders, and the battle options.
function goldenCase(i) {
  const rnd = mulberry(1000 + i * 7919), pick = a => a[Math.floor(rnd() * a.length)], chance = p => rnd() < p, int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const n = 2 + (i % 7), day = 1 + ((i + Math.floor(i / 7)) % 7), final = day === 7; // 2 to 8 lords, on every day of a war
  const L = seatLayout(n), pids = [...Array(n)].map((_, k) => "g" + (k + 1)), clsKeys = Object.keys(CLASSES);
  const itemPool = Object.keys(ITEMS).filter(k => k !== "rapier"), trapKeys = Object.keys(TRAPS);
  const unitPool = UTYPES.filter(k => UNIT_TIER[k] <= (day >= 3 ? 3 : 1));
  const plans = pids.map((pid, s) => {
    const castle = L.castles[s], cls = pick(clsKeys), c = CLASSES[cls], level = Math.min(MAX_HERO_LVL, Math.max(1, 2 * day - 1 + int(-1, 1)));
    const zone = Array.from(zoneFor(castle, L.N, L.castles)).sort().map(k => k.split(",").map(Number)), free = zone.slice();
    const take = () => free.splice(Math.floor(rnd() * free.length), 1)[0];
    const sp = armySpots(castle, L.N), pieces = [], champAt = free.findIndex(q => q[0] === sp.champ[0] && q[1] === sp.champ[1]);
    const ch = champAt >= 0 ? free.splice(champAt, 1)[0] : take();
    pieces.push({ kind: "champ", r: ch[0], c: ch[1], order: "army" });
    const nUnits = Math.min(free.length, int(0, Math.min(8, 2 + day)));
    for (let u = 0; u < nUnits; u++) { const q = take(); pieces.push({ kind: "unit", id: "u" + (u + 1), type: pick(unitPool), lvl: int(1, Math.min(3, 1 + Math.floor(day / 2))), hp: chance(.8) ? 1 : +(0.4 + rnd() * .6).toFixed(2), r: q[0], c: q[1], order: pick(["army", "army", "escort", "guard"]) }); }
    for (let w = int(0, 2); w > 0 && free.length; w--) { const q = take(); pieces.push({ kind: "wall", r: q[0], c: q[1], dir: pick(["h", "v"]) }); }
    for (let w = int(0, 2); w > 0 && free.length; w--) { const q = take(); pieces.push({ kind: "trap", type: pick(trapKeys), r: q[0], c: q[1] }); }
    const picks = {}; c.abilities.forEach(a => { picks[a.key] = a.choice[chance(.5) ? 1 : 0][0]; });
    const rot = Math.floor(rnd() * PRIORITIES.length), gt = () => Math.min(3, Math.floor(rnd() * (level / 3 + 1)));
    const items = []; for (let k = int(0, Math.min(ITEM_SLOTS, day)); k > 0; k--) { const it = pick(itemPool); if (!items.includes(it)) items.push(it); }
    const others = pids.filter(q => q !== pid), targets = others.filter(() => chance(.7));
    const offers = {}, replies = {}, bids = {};
    others.forEach(q => { if (chance(.25)) offers[q] = { gold: 10 * int(0, 30), day: day - 1 }; if (chance(.5)) replies[q] = pick(["accept", "accept", "refuse"]); });
    if (day >= MERC_DAY && chance(.5)) { const id = pick(Object.keys(MERCS)); bids[id] = { gold: MERCS[id].min + 10 * int(0, 8), day }; }
    return { pid, me: s === 0, name: "Lord " + (s + 1), color: "#" + (0x334455 + s * 0x1a2b3c).toString(16).slice(0, 6), cls, level, xp0: int(0, 60), castle, castleTier: int(1, Math.min(3, 1 + Math.floor(day / 3))), banner: null,
      ranks: autoRanks(level, int(0, 9999)), picks, triggers: { a1: pick(TRIGGERS), a2: pick(TRIGGERS), a3: pick(TRIGGERS), ult: pick(TRIGGERS) }, ultArm: !chance(.1), blessing: chance(.15) ? pick(["vamp", "ward"]) : null,
      gear: { weapon: gt(), armour: gt(), charm: gt() }, defences: { walls: int(0, 2), tower: int(0, 2) }, items,
      formation: !chance(.2), stance: pick(["aggressive", "skirmish", "cautious", "defensive", "opportunist"]), prio: PRIORITY_OPTS.slice(rot).concat(PRIORITY_OPTS.slice(0, rot)).slice(0, 5),
      rules: [...Array(int(0, 3))].map(() => ({ if: pick(IFS), then: pick(THENS) })), pieces,
      targets, tmode: pick(["list", "list", "highest", "lowest", "above", "below", "weakcastle", "toplevel", "weakhero", "closest"]), heading: pick(["near", "near", "hero", "castle", "centre"]),
      rank: s + 1, leader: s === 0 && day > 1, offers, replies, terms: {}, bids, breaks: [], pbetray: {} };
  });
  // yesterday's alliances, some with a betrayal planned, and sometimes an old feud
  const persist = [], feuds = [];
  if (n >= 4 && day > 1 && !final) {
    const a = pids[int(0, n - 1)], b = pick(pids.filter(q => q !== a)); persist.push([a, b].sort().join("|"));
    if (chance(.6)) plans.find(p => p.pid === a).pbetray[b] = pick(BETRAY_WHEN); else if (chance(.2)) plans.find(p => p.pid === a).breaks.push(b);
    if (chance(.3)) { const x = pick(pids.filter(q => q !== a && q !== b)), y = pick(pids.filter(q => q !== x && q !== a && q !== b)); if (x && y) feuds.push([x, y].sort().join("|")); }
  }
  if (day > 2 && chance(.3)) plans[n - 1].items = plans[n - 1].items.concat(["rapier"]);
  plans.feuds = feuds;
  resolveAlliances(plans, { persist, final, prevDay: day - 1, feuds });
  if (day >= MERC_DAY) { const mer = resolveMercs(plans, { day, N: L.N, cool: () => 0 }); plans.notes = (plans.notes || []).concat(mer.notes); plans.mercs = mer.hires; }
  const ranks = {}; plans.forEach(p => { ranks[p.pid] = p.rank; });
  return { name: `#${i}: ${n} lords, day ${day}`, i, seed: 7 + i * 104729, N: L.N, plans, opts: { N: L.N, finalDay: final, ultV2: i % 4 !== 3, ranks } };
}

// Run one case. The battle takes everything it needs from its plans and options, never from the page.
function runGoldenCase(i, full) {
  const c = goldenCase(i);
  const res = runBattle(c.plans, c.seed, Object.assign({}, c.opts, { fast: !full }));
  return { name: c.name, res };
}

// The hashes for one case: the outcome always, plus the replay for every GOLDEN_FULL_EVERY-th case.
// For those, the outcome of the fast run and the full run must agree, since results are worked out
// with a fast run and replays are a full run of the same orders.
function goldenHashes(i) {
  const fast = runGoldenCase(i, false), out = { name: fast.name, outcome: battleHash(fast.res) };
  if (i % GOLDEN_FULL_EVERY === 0) { const full = runGoldenCase(i, true); out.fullOutcome = battleHash(full.res); out.replay = replayHash(full.res); }
  return out;
}

// A fingerprint of the deterministic maths on its own, so a failing device can tell "the maths differs"
// apart from "the sim differs". Exact bit patterns are compared, not rounded values.
function detmathDigest() {
  const rnd = mulberry(424242), out = [];
  for (let i = 0; i < 20000; i++) { const a = (rnd() - .5) * (i % 4 ? 14 : 700), b = (rnd() - .5) * 40; out.push(dsin(a), dcos(a), datan2(b, a), dhypot(a, b)); }
  for (let n = 2; n <= 12; n++) out.push(JSON.stringify(seatLayout(n)));
  return hashString(out.join(","));
}
// One short code for the whole run: two devices that show the same code fought every battle identically.
const goldenCode = (digest, cases) => hashString(digest + "|" + cases.map(c => [c.outcome, c.fullOutcome || "", c.replay || ""].join(":")).join("|"));
