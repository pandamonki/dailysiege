// The deterministic battle simulation: runBattle(plans, seed) -> result

// Ultimate rebalance (smaller AoE at low rank, -25% damage): applies to battles fought on or after this day. Earlier saved battles replay with the old numbers.
const ULT_V2_FROM = "2026-11-10", ultV2For = d => String(d) >= ULT_V2_FROM;
// Fairer endings and longer alliances (battles fought on or after this day; earlier saved battles replay as fought):
//   - castles that fall on the same tick are ranked by siege damage, then hero kills, never by seat order
//   - pacts last until someone ends them, a pact group holds at most BLOC_MAX lords, and a betrayer who sets off the bomb is paid for it
//   - castles no longer burn down on their own from 100s (a castle only falls to an attack)
//   - the last days of the week score more (DAY_WEIGHT), and orders drafted but not sealed are fought at the lock
const BAL_V2_FROM = "2026-11-12", balV2For = d => String(d) >= BAL_V2_FROM;
// Combat groups, siege rules, no castle burn and reinforcement waves (battles fought on or after this day; earlier saved battles replay as fought).
// Set to the day it went live: any battle already fought under the V2 rules on or after this day would change when replayed.
const BAL_V3_FROM = "2026-11-12", balV3For = d => String(d) >= BAL_V3_FROM;
// Fair ties (battles fought on or after this day; earlier saved battles replay as fought). On a symmetric ring two rival castles are often
// exactly as near, and castles can end with the same health. Both used to go to whoever came first in the roster; now a seeded draw decides:
//   - an army with nobody left on its list marches on the nearest castle, and an equally near pair is settled by a draw for each lord and day
//   - the "closest" target mode settles equal distances the same way
//   - castles still standing with the same health are ranked by siege damage, then kills, then a draw
// Also from the same day: castles no longer send out militia (the garrison waves replace them), and taking a castle scores CASTLE_PTS, not 2.
let FAIR_V1_FROM = "2026-11-16", fairV1For = d => String(d) >= FAIR_V1_FROM;
const CASTLE_PTS = 3, castlePts = fair => (fair ? CASTLE_PTS : 2);
// Pick your targets (battles fought on or after PICK_V1_FROM; earlier saved battles replay as fought): every lord picks one to PICK_MAX targets
// each day, and once those have fallen the army goes for the lord just above them on the board (the leader goes for second place).
// On day 1, with no board yet, it goes for the nearest castle. Target modes other than the lord's own list are not used.
let PICK_V1_FROM = "2026-11-16"; const pickV1For = d => String(d) >= PICK_V1_FROM, PICK_MAX = 3;
// With pick-your-targets the final day scores 1.5x like days 5 and 6, not 2x: with targets chosen daily the standings already swing a lot.
const DAY_WEIGHT_PICK = { 5: 1.5, 6: 1.5, 7: 1.5 };
// A pick can be a lord or a general role, worked out during the battle (and again whenever the army looks for its next goal):
const PICK_ROLES = { "@weakcastle": "Weakest castle", "@leader": "Board leader", "@above": "Lord just above me", "@nearcastle": "Nearest to my castle", "@neararmy": "Nearest to my army" };
// Under pick-your-targets an army also attacks any rival castle it passes on the way, within this many tiles.
const PASSING_CASTLE = 2.5;
// Balance V4 (battles fought on or after BAL_V4_FROM; earlier saved battles replay as fought):
//   - heroes keep fighting: an ordered retreat ends at 50% health (was 75%); "my castle is under attack" only calls the hero home when it is
//     within RECALL_R tiles; archers and mages only step back while they are actually being hit (a mage for at most 1s, then at least 2s of
//     casting); rogues only slip away when outnumbered 3 to 1 close by and taking damage
//   - destructive hero skills hit castles too (SIEGE_SKILLS), and can be cast at a castle when no soldiers are near; Meteor Strike hits a castle
//     for METEOR_CASTLE; Rain of Feathered Death hits a castle at half strength (it lands all 14 waves on something that cannot move)
//   - magic does MAGIC_VS_FORT against fortified armour (castles and walls), more than blades and arrows
// starts with the battle of 14 Nov 2026 (the fair-ties, pick-your-targets, militia and castle-points rules still start on 16 Nov)
let BAL_V4_FROM = "2026-11-14"; const balV4For = d => String(d) >= BAL_V4_FROM;
//   - a unit already fighting an enemy in reach is not pulled away by a provoker, and answers provokers only within AGGRO_R tiles (was 6)
//   - a hurt hero or soldier only falls back to heal while it is actually being hit (hit in the last HIT_WINDOW seconds), and goes back to the
//     fight at BACK_AT health (was 80%); an explicit command (all units fall back) still sends everyone home
//   - items are the hero's: the stat items are ITEM_BOOST times as strong for the hero only. The area-buff items (Banner, Standard, Pipe, Mender) are the ones
//     that reach soldiers, and are AURA_BOOST times as strong
let ITEM_BOOST = 2, AURA_BOOST = 2;
const ITEM_STATS = { whetstone: { atk: .07 }, gauntlets: { atk: .15 }, daedalus: { atk: .15 }, jerkin: { hp: .06 }, hpring: { hp: .08 }, vanguard: { hp: .15 }, sandals: { spd: .06 }, boots: { spd: .10 }, buckler: { dr: .04 }, ringprot: { dr: .08 }, shiva: { dr: .06 } };
// Flat items (plans stamped itemV5, from ITEMS_V5_FROM): the hero's stat items add flat amounts instead of percentages, so they matter most early in the
// week and less as the hero levels. Lifesteal, crits, dodge, reflect, slows, splash and the area auras stay percentages. Damage-reduction items block a
// flat amount from every normal hit (like Vanguard). The Iron Standard's aura gives STANDARD_V5 less damage taken.
const ITEM_FLAT = { whetstone: { atk: 6 }, gauntlets: { atk: 12 }, daedalus: { atk: 12 }, jerkin: { hp: 100 }, hpring: { hp: 140 }, vanguard: { hp: 260 }, sandals: { spd: .2 }, boots: { spd: .35 }, buckler: { block: 3 }, ringprot: { block: 6 }, shiva: { block: 5 } };
const ITEM_REGEN_V5 = { hpring: 10, herbs: 5 }, SALVE_V5 = 300, ELIXIR_V5 = .2, STANDARD_V5 = .18;
// Items v6 (plans stamped itemV6, battles from ITEMS_V6_FROM): Salve and Ring of Health toned down; Shell, Rune, Will, Fire orb, Crystalys, Pipe and Boots boosted
// Items v7 (plans stamped balV5): the cheap regeneration items were too strong for their price
const ITEM_V7 = { herbs: 3, hpringRegen: 5, mender: 5 };
// Home healing (plans stamped balV5): a hero within HOME_HEAL_R tiles of its own castle that has neither hit nor been hit for HOME_HEAL_WAIT seconds
// heals HOME_HEAL of its health a second. Any hit, given or taken, stops it and starts the wait again.
const HOME_HEAL_R = 2.5, HOME_HEAL_WAIT = 2, HOME_HEAL = .08;
const ITEM_V6 = { salve: 220, hpringHp: 120, hpringRegen: 8, bootsSpd: .42, shellDur: 7.5, runeCd: 45, runeLow: .3, runeChannel: 1.5, will: .25, fireSplash: .5, fireR: 1.5, crys: [.25, 1.8], pipe: .6, pipeR: 4, rapier: 100 };
const AGGRO_R = 4, RECALL_R = 6, RETREAT_END_V2 = .5, METEOR_CASTLE = 700, MAGIC_VS_FORT = .6, HIT_WINDOW = 2.5, BACK_AT = .6;
const fairTie = (seed, a, b) => hash(seed, botSeed(String(a)) * 7919 + botSeed(String(b)), 17);
// alliances v2 (plans stamped allyV2): winning allies share the top places by castle health left. Lone wolf: while exactly one lord still
// standing is in no pact and at least one alliance stands, that lord's army and castle deal LONE_WOLF_STEP more damage and have LONE_WOLF_STEP
// more maximum health (current health scaled with it) for each allied lord still standing. Checked every second; it ends the moment a second
// lord stands alone or the lone wolf allies, and the extra health goes again.
// placement v2 (plans stamped placeV2): every place is one point apart, last scores 1 and first scores one per lord, plus a
// PLACE_WIN_BONUS for winning (1st of 8: 8 + 2 = 10). Before, 10, 7, 5, 4, 3, 2, 1 for 1st to 7th and nothing below.
let PLACE_V2_FROM = "2026-11-21"; const placeV2For = d => String(d) >= PLACE_V2_FROM, PLACE_WIN_BONUS = 2;
const placePts = (v2, place, n) => (v2 ? Math.max(0, n - place + 1) + (place === 1 ? PLACE_WIN_BONUS : 0) : [10, 7, 5, 4, 3, 2, 1, 0][place - 1] || 0);
let ALLY_V2_FROM = "2026-11-20"; const allyV2For = d => String(d) >= ALLY_V2_FROM, LONE_WOLF_STEP = .1;
const ASSIST_SECS = 10, SURVIVOR_PTS = 1, BLOC_MAX = 3, TREACHERY_PTS = 3, TREACHERY_LOOT = .25, BETRAY_CASTLE_X = 3, DAY_WEIGHT = { 5: 1.5, 6: 1.5, 7: 2 };
// A lord whose castle falls keeps their hero and soldiers on the field: they fight on to the end of the battle, but can no longer fall back, heal at the castle, teleport home or respawn. Placing is still decided by when the castle fell.
const ORPHAN_ARMIES = true;
const dayWeight = (v2, dayNo) => (v2 && DAY_WEIGHT[dayNo]) || 1;
function runBattle(plans, seed, opts = {}) {
  const TV = !!opts.treesV1, SV = !!opts.suddenV1, BV = !!opts.balV2, V3 = !!opts.balV3, FV = !!opts.fairV1 || !!opts.pickV1, PV = !!opts.pickV1, V4 = !!opts.balV4, HV3 = !!opts.heroV3, LV2 = HV3 && plans.some(p => p.lvlV2), maxLvl = heroMaxLvl(HV3, LV2), hpLvX = HV3 ? L => hpLvV3(L, LV2) : hpLv, atkLvX = HV3 ? L => atkLvV3(L, LV2) : atkLv, XPC = LV2 ? XP_CAP_V2 : XP_CAP, xpNeedX = LV2 ? xpNeedV2 : xpNeed, MING = LV2 ? MIN_GAIN_V2 : MIN_GAIN, // LV2: faster levelling (3 to 4 a day, up to 25)
    OA = !!opts.balV2 && ORPHAN_ARMIES, UV = !!opts.ultV2, UD = UV ? .75 : 1, UR = rk => UV ? [.7, .85, 1][Math.min(3, Math.max(1, rk || 1)) - 1] : 1;
  const rng = mulberry(seed), DT = .1, fast = !!opts.fast, leaderPid = (plans.find(p => p.leader) || {}).pid;
  let curAb = null;
  const mePid = (plans.find(p => p.me) || plans[0]).pid, NN = opts.N || N;
  let t = 0, tick = 0, over = false, anyUlt = false;
  const ents = [], events = [], cdlog = [], xplog = [], logs = [], frames = [], pending = [], traps = [], walls = [];
  // solid trees (from TREES_V1_FROM): the forest rim and the blockades between bases cannot be walked through; soldiers slide round them
  const TG = TV ? treeGeom(plans.length, opts.N || N) : null;
  const treeHit = (x, y) => { if (!TG) return null;
    for (const c of TG.clumps) { const ex = x - c.x, ey = y - c.y; if (ex > c.r + .3 || ex < -c.r - .3 || ey > c.r + .3 || ey < -c.r - .3) continue; const dd = hyp(ex, ey), lim = c.r + .22; if (dd < lim) return { nx: dd ? ex / dd : 1, ny: dd ? ey / dd : 0, d: lim - dd }; }
    const dx = x - TG.cc, dy = y - TG.cc, r = hyp(dx, dy); if (r > TG.half - 1.5) { const lim = TG.rim(datan2(dy, dx)) - .12; if (r > lim) return { nx: -dx / r, ny: -dy / r, d: r - lim }; }
    return null; };
  // steering round trees: look this far ahead along a heading, and try headings turned by 15°, 30° … 165° off the way to the goal
  const TREE_LOOK = 1.2, TREE_TURNS = Array.from({ length: 11 }, (_, i) => { const a = (i + 1) * Math.PI / 12; return [dcos(a), dsin(a)]; });
  const treeRayClear = (x, y, ux, uy, L) => { for (let s = .3; s < L + .01; s += .3) if (treeHit(x + ux * s, y + uy * s)) return false; return true; };
  const settle = e => { for (let i = 0; i < 5; i++) { const h = treeHit(e.x, e.y); if (!h) return; e.x += h.nx * (h.d + .01); e.y += h.ny * (h.d + .01); } }; // step clear of the trees (a few passes: a blockade's trees overlap)
  const EV2 = plans.some(p => p.engV2); // engines v2: heroes and soldiers drop what they are doing for an enemy siege engine near their own castle
  const WV2 = plans.some(p => p.wallV2); // walls v2: every fence blocks everyone, its owner's soldiers too, so they route round through the gaps
  const RAPIER_V2 = plans.some(p => p.itemV6); // Divine Rapier v6: +100 on weapon hits instead of double damage
  const BV5 = plans.some(p => p.balV5); // balance v5: hero attack and armour class, out-of-combat healing at home, 20s waves, betrayal castle bonus, regen items toned down
  const SD2 = plans.some(p => p.sdV2); // sudden death v2: a half-size arena nobody can leave, and no respawn timers inside it
  let sd = null; // sudden death: null until SD_AT, then { t0, go, skip, winners }
  const sdOn = () => !!sd && !sd.skip, tmax = () => (sdOn() ? SD_AT + SD_COUNT + SD_LEN : TMAX);
  let ctrHolder = null, teamWin = null, lastAlly = null; const finalDay = !!opts.finalDay, FIN2 = finalDay && plans.some(p => p.finV2); // FIN2: day 7 pacts hold until one alliance is all that is left, then break
  const P = {}, order = plans.map(p => p.pid), idx = Object.fromEntries(order.map((p, i) => [p, i]));
  const d = (a, b) => hyp(a.x - b.x, a.y - b.y);
  const fxv = (e, k) => (e.fx[k] && e.fx[k].until > t ? e.fx[k].val : 0);
  const setFx = (e, k, dur, val = 1) => { if ((e.cart || e.ram) && (k === "slow" || k === "frozen" || (V3 && (k === "stun" || (k === "root" && !HV3))))) return; /* siege engines can't be slowed, and from 12 Nov 2026 can't be stunned or rooted either */ if (P[e.pid] && P[e.pid].frenzy && e.kind !== "castle" && (k === "stun" || k === "root" || k === "slow" || k === "frozen" || k === "silence" || k === "fear")) return; if (e.fx.ccimm && e.fx.ccimm.until > t && e.kind !== "castle" && (k === "stun" || k === "root" || k === "slow" || k === "frozen" || k === "taunt" || k === "silence" || k === "fear")) return; if (e.ccShort && (k === "slow" || k === "root")) dur *= 1 - e.ccShort; if (e.will && (k === "stun" || k === "root" || (e.itemV6 && (k === "slow" || k === "silence")))) dur *= e.itemV6 ? ITEM_V6.will : .4; if (!e.fx[k] || e.fx[k].until < t + dur || e.fx[k].val < val) e.fx[k] = { until: t + dur, val }; };
  const allied = (a, b) => a === b || P[a].pacts.has(b);
  function breakLastAlliance(pids) { // the war's last battle: once only one alliance stands, its pacts break and the allies fight it out
    if (lastAlly) return; pids.forEach(a => P[a].pacts.clear()); lastAlly = { t: Math.round(t * 10) / 10, pids: pids.slice() };
    log(`The last alliance breaks! ${pids.map(nm).join(", ")} turn on each other. Only one banner can win the war.`, "big");
    const c = pids.map(q => P[q].castle).filter(Boolean), x = c.length ? c.reduce((s, k) => s + k.x, 0) / c.length : NN / 2, y = c.length ? c.reduce((s, k) => s + k.y, 0) / c.length : NN / 2;
    hl.push({ kind: "split", pid: pids[0], others: pids.slice(1), t, x, y, score: 92 });
  }
  const hostile = (a, b) => !allied(a, b);
  const ev = o => { if (fast) return; o.t = t; events.push(o); };
  const cdNote = (e, k, ready) => { if (!fast) cdlog.push({ id: e.id, k, t, r: ready }); }; // when a skill or item went on cooldown, for the replay panel (not part of the replay hash)
  const atkEv = (e, o, k) => ev({ ty: "atk", id: e.id, k, dx: o.x - e.x, dy: o.y - e.y });
  const SHOT_STYLE = { bowman: "arrow", centaur: "arrow", archer: "arrow", sniper: "bullet", mage: "orb", shaman: "spirit", healer: "heal", necro: "bone", towerA: "tarrow", towerF: "tfire", towerB: "tbomb", towerM: "tarc", towerS: "tsnipe" }; // each ranged unit gets its own projectile in the replay (level 3 towers get big, showy ones; display only)
  const shot = (a, b, c, w = 1, st) => ev({ ty: "shot", x1: a.x, y1: a.y - .35, x2: b.x, y2: b.y - .35, c, w, ...(st ? { sk: st, sc: a.kind === "champ" ? 1.4 : 1 } : {}) });
  const slash = (b, c = "#fff") => ev({ ty: "slash", x: b.x, y: b.y - .35, c });
  const aoe = (x, y, r, c, dur = .6) => ev({ ty: "aoe", x, y, r, c, dur });
  const txt = (e, s, c) => ev({ ty: "txt", x: e.x, y: e.y - 1.1, s: String(s), c });
  const log = (msg, kind = "") => logs.push({ t, msg, kind });
  // highlights: structured key moments the reel and recap are built from
  const hl = [], RANKS = opts.ranks || {}, nP = plans.length;
  // the day's twist (battles from CONTRACTS_FROM; see config/contracts.js), and per-lord counters for the personal battle report and contracts.
  // The counters only watch: nothing in the fight reads them, and they are not part of the result hash.
  const TW = opts.twist || null, ST = {}, st = pid => ST[pid] || (ST[pid] = { hold: 0, castleTaken: 0, castleBy: {}, wallHit: 0, waves: [], heroBy: {}, heroSlain: {}, fellTo: null });
  const top3 = pid => RANKS[pid] != null && RANKS[pid] <= 3;
  const under = pid => RANKS[pid] != null && RANKS[pid] > Math.max(3, Math.ceil(nP / 2));
  const H = o => { if (!fast) hl.push({ t, ...o }); return o; };
  const champOf = pid => ents.find(e => e.pid === pid && e.kind === "champ");
  // a taunt moment: who is speaking (their hero if it lives, else the fighter that did it) and why; at most one every 4 seconds per lord
  const quip = (pid, k, who) => { if (fast || !P[pid]) return; if (t - (P[pid].quipT ?? -9) < 4) return; const sp = (who && !who.dead && who.pid === pid ? who : null) || (champOf(pid) && !champOf(pid).dead ? champOf(pid) : null) || who; if (!sp) return; P[pid].quipT = t; ev({ ty: "quip", pid, k, id: sp.id }); };
  let firstBlood = false;
  let rapierOwner = null, rapierHolder = null, rapierDrop = null; // the Divine Rapier: who started with it, who carries it now, and where it lies when its bearer falls
  const respawnTime = lv => Math.min(60, 10 + 2.5 * lv); // a fallen hero is gone longer the higher their level
  const nm = pid => (pid === mePid ? "You" : P[pid].name);
  const poss = pid => (pid === mePid ? "Your" : P[pid].name + "'s");
  const obj = pid => (pid === mePid ? "you" : P[pid].name);
  const lposs = pid => (pid === mePid ? "your" : P[pid].name + "'s");
  const alivePlayers = () => order.filter(p => P[p].alive);
  const fighting = pid => P[pid].alive || !!P[pid].orphan; // still has an army in the fight, even if the castle is gone
  const live = e => e && !e.dead;
  const enemiesNear = (e, x, y, r) => ents.filter(o => !o.dead && o.kind !== "castle" && hostile(e.pid, o.pid) && vis(o, e) && hyp(o.x - x, o.y - y) <= r);
  // engaging an enemy hero: you are attacking one within reach, or one is attacking you from within its reach
  const shellEngaged = e => (e.tgt && !e.tgt.dead && e.tgt.kind === "champ" && hostile(e.pid, e.tgt.pid) && d(e, e.tgt) <= e.range + 1) || enemiesNear(e, e.x, e.y, 6).some(o => o.kind === "champ" && o.tgt === e && d(o, e) <= o.range + 1);
  const friendsNear = (pid, x, y, r) => ents.filter(o => !o.dead && o.kind !== "castle" && allied(pid, o.pid) && hyp(o.x - x, o.y - y) <= r);
  const minBy = (arr, f) => arr.reduce((b, o) => (b === null || f(o) < f(b) ? o : b), null);
  // a hidden unit can be seen by a viewer standing within its reveal radius if it is only in stealth (skill-tree Rogues); a fully vanished one never can
  const vis = (o, v) => !fxv(o, "vanish") || !!(o.stealth && hyp(o.x - v.x, o.y - v.y) <= (o.revealR || 1));

  function add(o) { Object.assign(o, { id: ents.length, fx: {}, dots: [], atkT: rng() * .8, tgt: null, rt: 0, dead: false, hitT: -9, tel: { dealt: 0, toChamp: 0, toUnit: 0, toCastle: 0, taken: 0, healed: 0, kills: 0, deaths: 0, diedAt: null, ab: {} } }); ents.push(o); return o; }
  const abRec = (e, name) => e.tel.ab[name] || (e.tel.ab[name] = { casts: 0, dmg: 0, heal: 0 });
  const abName = (e, k) => (k === "a4" ? "Vigour" : k === "ult" ? CLASSES[e.cls].ult.name : CLASSES[e.cls].abilities.find(a => a.key === k).name);
  const DOT_AB = { burn: "Fireball", bleed: "Cleave", fire: "Volley", poison: "Poison Blade", orb: "Orb of Venom" };
  // skill-tree heroes (battles with opts.heroV3): all their skills live in sim/heroTrees.js, which reaches the battle through these hooks
  const kit = HV3 ? makeTreeKit({ v4: V4, ents, DT, d, fxv, setFx, deal, heal, enemiesNear, friendsNear, minBy, ev, aoe, shot, slash, txt, add, pending, walls, traps, P, order, rng, NN, allied, hostile, log,
    t: () => t, tickN: n => tick % n === 0, tickNo: () => tick, getAb: () => curAb, setAb: v => { curAb = v; }, abRec, atkEv, vis, fighting, kill: (e, s) => kill(e, s), cd: cdNote, blink: (e, x, y) => blink(e, x, y), wallAt: (e, x, y) => wallAt(e, x, y), addDot: (a, b, c, d2, k) => addDot(a, b, c, d2, k),
    trigOk: (e, key) => !e.triggers || !e.triggers[key] || triggerOk(e, key), poss: pid => poss(pid), isBounty: pid => !!RANKS[pid] && RANKS[pid] <= 3, onUlt: (e, name) => { P[e.pid].ultCast = true; anyUlt = true; if (!hl.some(h => h.kind === "ult" && h.pid === e.pid && h.t === t)) H({ kind: "ult", ab: name, gen: 1, pid: e.pid, x: e.x, y: e.y, score: 50 }); } }) : null;
  // one soldier of a lord's, from a plan piece: used for the army at the start and for reinforcement waves
  function makeUnit(pl, pc, x, y) {
    const g = pl.gear || {}, base = UNITS[pc.type], s = UNIT_SIM[pc.type], isCart = pc.type === "cart", isTower = !!base.tower, tm = 1, fixed = isCart || !!base.merc || isTower, m = fixed ? 1 : 1 + UNIT_LVL_GAIN * (pc.lvl - 1), gm = fixed ? 1 : 1 + .15 * (g.armour || 0), ga = fixed ? 1 : 1 + .15 * (g.weapon || 0);
    const e = add({ order: pl.ordV2 && pc.order !== "guard" ? "army" : pc.order || "army", pid: pl.pid, kind: "unit", key: pc.type, lvl: pc.lvl, ref: pc.id || null, x, y, maxhp: base.hp * m * gm * tm, atk: base.atk * m * ga * tm, cart: isCart, ram: pc.type === "ram" || !!s.rammer, cat: pc.type === "catapult", merc: !!base.merc, regen: s.regen || 0, hunter: !!s.hunter, dmgRed: fixed ? 0 : [0, 0, .1, .2][g.armour || 0], lifesteal: s.lifesteal || (!fixed && (g.weapon || 0) >= 3 ? .1 : 0), range: s.range, as: s.as, spd: s.spd, armor: s.armor, shot: s.shot, siege: s.siege, splash: s.splash || 0, healer: s.heal ? s.heal * m : 0 });
    if (isTower && pl.wallV2) e.anchor = [x, y]; // towers v2: pinned where they were placed (from 19 Nov battles)
    e.hp = e.maxhp * (pc.hp ?? 1); [e.atype, e.armour] = UNIT_TYPES[pc.type]; if (pl.siegeV1 && e.ram) e.breaker = true; // rams, catapults and the Ogre Breaker smash walls in their way
    return e;
  }
  // waves v4: an enemy that can move has come within WAVE_NEAR_R tiles of this castle, nearer to it than to its own castle (towers, castles and totems never count)
  function enemyAtGate(pid) { const c = P[pid].castle; if (!c || c.dead) return false;
    return ents.some(o => !o.dead && (o.kind === "unit" || o.kind === "champ" || o.kind === "summon") && !(UNITS[o.key] && UNITS[o.key].tower) && hostile(pid, o.pid) && vis(o, c)
      && d(o, c) <= WAVE_NEAR_R && (() => { const h = P[o.pid] && P[o.pid].castle; return !h || h.dead || d(o, c) < d(o, h); })()); }
  // a wave marches out of the castle gate
  function deployWave(p, i, rush) {
    const w = p.waves[i], c = p.castle, dx = NN / 2 - c.x, dy = NN / 2 - c.y, L = hyp(dx, dy) || 1, px = -dy / L, py = dx / L, n = w.units.length;
    w.done = true; p.lastWave = t; st(p.pid).waves.push(Math.round(t));
    w.units.forEach((u, j) => { const o = (j - (n - 1) / 2) * .45, e = makeUnit(p, { ...u, kind: "unit" }, c.x + dx / L * .9 + px * o, c.y + dy / L * .9 + py * o);
      e.hx = e.x; e.hy = e.y; e.spd *= BAL.move; e.as *= BAL.swing; e.retreats = 1; e.wave = i + 1; if (p.noRetreat) e.noRetreat = true;
      if (p.waveV2) { e.waveDef = true; e.waveSeen = t; } // waves v2: defend the castle area first, then the army plan
      else if (w.order === "castle") e.purpose = "castle"; else if (w.order === "hero") e.hunter = true; else if (w.order === "nearest") e.purpose = "nearest"; }); // the wave's purpose: raider-style march on a castle, hunt heroes, or fight the nearest enemy
    ev({ ty: "wave", pid: p.pid, i, n: p.waves.filter(x => x.done).length, ...(rush ? { rush: 1 } : {}) });
    log(rush ? `${poss(p.pid)} castle is losing ground: reinforcements rush out to defend it.` : `${poss(p.pid)} reinforcements march out of the castle.`, p.pid === mePid ? "you" : undefined);
  }
  // ----- set up players and armies -----
  plans.forEach(pl => {
    P[pl.pid] = { ...pl, stance: STANCE_FIX[pl.stance] || pl.stance, bombs: (pl.bombs || []).map(b => ({ ...b })), alive: true, place: 0, kills: 0, ukills: 0, castles: 0, gold: 0, fired: new Set(), retreat: false, defendAll: false, focusLeader: false, helpPid: null, helpUntil: 0,
      targets: (pl.targets || []).slice(), ordV2: !!pl.ordV2, armyPlan: ARMY_PLANS.includes(pl.armyPlan) ? pl.armyPlan : "conquest", fallback: FALL_BACKS.includes(pl.fallback) ? pl.fallback : "none", fallbackUntil: 0, hitT: -9, castleHitT: -9, castleHitBy: null, trapT: -9, pacts: new Set(), hostileTo: new Set(pl.hostile), revenge: new Set(), feud: new Set(), bell: false, retreatT: -99, elimT: null };
  });
  plans.forEach(pl => pl.pacts.forEach(o => { if (P[o]) { P[pl.pid].pacts.add(o); P[o].pacts.add(pl.pid); } }));
  (plans.feuds || []).forEach(k => { const [a, b] = k.split("|"); if (P[a] && P[b]) { P[a].feud.add(b); P[b].feud.add(a); P[a].hostileTo.add(b); P[b].hostileTo.add(a); P[a].pacts.delete(b); P[b].pacts.delete(a); } }); // betrayers and their victims stay rivals for the rest of the war
  const pact0 = []; order.forEach(a => order.forEach(b => { if (a < b && P[a].pacts.has(b)) pact0.push(a + "|" + b); })); // the pacts the day starts with, after bad blood has dissolved any between feuding lords
  const AV2 = plans.some(p => p.allyV2);
  let loneId = null, loneN = 0; // the lone wolf right now, and how many allied lords stand against it
  const updateLone = () => { if (!AV2) return; const up = order.filter(pid => P[pid].alive), solo = up.filter(pid => !P[pid].pacts.size), n = up.length - solo.length;
    const id = solo.length === 1 && n > 0 ? solo[0] : null;
    if (id && (id !== loneId || n !== loneN)) { P[id].loneMax = Math.max(P[id].loneMax || 0, n); log(`${nm(id)} ${id === mePid ? "stand" : "stands"} alone against ${n} allied lord${n === 1 ? "" : "s"}: lone wolf, +${Math.round(n * LONE_WOLF_STEP * 100)}% damage and health.`, id === mePid ? "you" : undefined); }
    else if (!id && loneId) log(`${nm(loneId)} ${loneId === mePid ? "are" : "is"} no longer the lone wolf.`);
    loneId = id; loneN = id ? n : 0;
    ents.forEach(e => { if (e.dead || !(e.maxhp > 0)) return; const want = e.pid === loneId ? 1 + LONE_WOLF_STEP * loneN : 1, had = e.lm || 1; // real extra health, so healing and percentages still work
      if (want !== had) { const f = want / had; e.maxhp *= f; e.hp = Math.min(e.maxhp, e.hp * f); e.lm = want; } }); };
  const loneMul = pid => (pid && pid === loneId ? 1 + LONE_WOLF_STEP * loneN : 1);
  plans.forEach(pl => {
    const p = P[pl.pid], [cr, cc] = pl.castle, def = pl.defences || {};
    p.castle = add({ pid: pl.pid, kind: "castle", x: cc + .5, y: cr + .5, maxhp: BAL.castleHp * (1 + .25 * (def.walls || 0)) * CASTLE_TIERS[Math.max(0, Math.min(2, (pl.castleTier || 1) - 1))].hp * (TW === "iron" ? TWIST_IRON : 1), atk: 20 * [1, 1.5, 2][def.tower || 0], range: (def.tower || 0) >= 2 ? 3.6 : 3, as: 1.5, spd: 0, armor: .25, shot: "#e8e2d0" });
    p.castle.hp = p.castle.maxhp; p.castle.atype = "pierce"; p.castle.armour = "fortified";
    const lvl = pl.level || 1, g = pl.gear || {};
    pl.pieces.forEach(pc => {
      if (pc.kind === "champ") {
        const b = HV3 ? champBase(pl.cls, !!pl.balV5) : CHAMP[pl.cls], hpMul = HV3 ? hpLvX(lvl) : (1 + .08 * (lvl - 1)) * vigMul(pl.ranks.a4), atkMul = HV3 ? atkLvX(lvl) : (1 + .06 * (lvl - 1)) * vigMul(pl.ranks.a4);
        const e = add({ order: pl.ordV2 ? "army" : pc.order || "army", pid: pl.pid, kind: "champ", cls: pl.cls, key: "c-" + pl.cls, x: pc.c + .5, y: pc.r + .5, maxhp: b.hp * hpMul, atk: b.atk * atkMul, range: b.range, as: b.as,
          spd: b.spd * ((g.charm || 0) >= 1 ? 1.15 : 1), armor: b.armor,
          cdMul: (g.charm || 0) >= 2 ? .8 : 1, phoenix: (g.charm || 0) >= 3, respawns: opts.duel ? 0 : 2, shot: b.shot, ranks: { ...pl.ranks }, ranks0: { ...pl.ranks }, picks: pl.picks, triggers: pl.triggers, cds: {} });
        e.hp = e.maxhp; if (!HV3) { ["a1", "a2", "a3"].forEach(k => e.cds[k] = 2 + rng() * 3); e.cds.ult = 10 + rng() * 8; }
        e.ultArm = pl.ultArm !== false; e.heroLvl = lvl; e.lvl0 = lvl; e.xp = pl.xp0 || 0; e.xp0 = e.xp; e.gains = 0;
        const its = new Set(pl.items || []); e.itemSet = its; if (its.has("rapier")) { e.rapier = true; rapierOwner = rapierHolder = pl.pid; }
        e.itemV5 = !!pl.itemV5; e.shellV2 = !!pl.shellV2; e.itemV6 = !!pl.itemV6;
        if (e.itemV5) { // flat items
          its.forEach(k => { const st = e.itemV6 && k === "hpring" ? { hp: ITEM_V6.hpringHp } : e.itemV6 && k === "boots" ? { spd: ITEM_V6.bootsSpd } : ITEM_FLAT[k]; if (!st) return; if (st.atk) { e.atk += st.atk; e.flatAtk = (e.flatAtk || 0) + st.atk; } if (st.hp) { e.maxhp += st.hp; e.flatHp = (e.flatHp || 0) + st.hp; } if (st.spd) e.spd += st.spd; if (st.block) e.block = (e.block || 0) + st.block; });
          e.hp = e.maxhp; if (its.has("vanguard")) e.block = (e.block || 0) + 12;
          if (its.has("fang")) e.lifesteal = (e.lifesteal || 0) + .12; if (its.has("thornmail")) e.thorns = .15; if (its.has("talisman")) e.will = true;
          if (its.has("antimagic")) e.shellAt = Math.max(1, Math.min(10, Math.round(+pl.shellAt || 2)));
          { const oc = ["frostdagger", "fireorb", "venomorb", "corruptorb"].filter(k => its.has(k)); if (oc.length) e.orbCols = oc.map(k => ITEMS[k].col); }
          if (its.has("crystalys")) e.itemCrit = e.itemV6 ? ITEM_V6.crys.slice() : [.2, 1.6]; if (its.has("daedalus")) e.itemCrit = [.25, 2.4];
        } else {
          if (its.has("boots")) e.spd *= 1.1; if (its.has("gauntlets")) e.atk *= 1.15; if (its.has("ringprot")) e.dmgRed = (e.dmgRed || 0) + .08;
          if (its.has("fang")) e.lifesteal = (e.lifesteal || 0) + .12; if (its.has("thornmail")) e.thorns = .15; if (its.has("talisman")) e.will = true;
          if (its.has("vanguard")) { e.maxhp *= 1.15; e.hp = e.maxhp; e.block = 12; }
          if (its.has("antimagic")) e.shellAt = Math.max(1, Math.min(10, Math.round(+pl.shellAt || 2)));
          if (its.has("hpring")) { e.maxhp *= 1.08; e.hp = e.maxhp; }
          if (its.has("whetstone")) e.atk *= 1.07; if (its.has("sandals")) e.spd *= 1.06; if (its.has("buckler")) e.dmgRed = (e.dmgRed || 0) + .04;
          if (its.has("jerkin")) { e.maxhp *= 1.06; e.hp = e.maxhp; }
          { const oc = ["frostdagger", "fireorb", "venomorb", "corruptorb"].filter(k => its.has(k)); if (oc.length) e.orbCols = oc.map(k => ITEMS[k].col); }
          if (its.has("shiva")) e.dmgRed = (e.dmgRed || 0) + .06;
          if (its.has("daedalus")) e.atk *= 1.15;
          if (its.has("crystalys")) e.itemCrit = [.2, 1.6]; if (its.has("daedalus")) e.itemCrit = [.25, 2.4];
          if (V4 && ITEM_BOOST !== 1) { const ab = { atk: 0, hp: 0, spd: 0, dr: 0 }; its.forEach(k => { const st = ITEM_STATS[k]; if (st) for (const q in st) ab[q] += st[q]; });
            e.atk *= 1 + (ITEM_BOOST - 1) * ab.atk; e.maxhp *= 1 + (ITEM_BOOST - 1) * ab.hp; e.hp = e.maxhp; e.spd *= 1 + (ITEM_BOOST - 1) * ab.spd; e.dmgRed = (e.dmgRed || 0) + (ITEM_BOOST - 1) * ab.dr; }
        }
        e.cons = ["salve", "elixir", "net", "scroll", "shiva", "antimagic"].filter(k => its.has(k)).map(k => ({ k, ready: 0 }));
        if (!HV3 && pl.cls === "archer" && pl.ranks.a3) { e.evade = ext([.1, .18, .25], pl.ranks.a3); e.counter = pl.picks.a3 === "Counter"; e.kite = pl.picks.a3 === "Kite"; }
        if (!HV3 && pl.cls === "rogue" && pl.ranks.a3) e.poison = { dps: ext([7, 10, 13], pl.ranks.a3), venom: pl.picks.a3 === "Venom", weaken: pl.picks.a3 === "Weaken" };
        [e.atype, e.armour] = CLASS_TYPES[pl.cls];
        if (its.has("evasion")) e.evade = 1 - (1 - (e.evade || 0)) * .8;
        if (HV3) { kit.setup(e, pl); e.hp = e.maxhp; }
        p.champ = e;
      } else if (pc.kind === "unit") {
        makeUnit(pl, pc, pc.c + .5, pc.r + .5);
      } else if (pc.kind === "wall") {
        const tier = Math.max(1, Math.min(3, pl.castleTier || 1));
        wallTiles(pc.r, pc.c, pc.dir).forEach(([r, c]) => { if (r >= 0 && c >= 0 && r < NN && c < NN) walls.push({ id: walls.length, pid: pl.pid, x0: c, y0: r, dir: pc.dir === "v" ? "v" : "h", hp: pl.trapV2 ? WALL_TIERS[tier - 1].hp : WALL_HP_V1[tier - 1], maxhp: pl.trapV2 ? WALL_TIERS[tier - 1].hp : WALL_HP_V1[tier - 1], tier }); });
      } else if (pc.kind === "trap") {
        if (!TRAPS[pc.type]) return;
        if (pc.type === "tower") { if (pl.towerN >= TOWER_CAP) return; pl.towerN = (pl.towerN || 0) + 1; makeUnit(pl, { kind: "unit", type: TOWER_KEYS.includes(pc.tk) ? pc.tk : "tower", lvl: 1, hp: 1 }, pc.c + .5, pc.r + .5); return; }
        if (pl.trapV2 && traps.filter(q => q.pid === pl.pid && !q.ranger).length >= TRAP_CAP) return;
        traps.push({ pid: pl.pid, type: pc.type, x: pc.c + .5, y: pc.r + .5, used: false, v2: !!pl.trapV2 });
      }
    });
    // every castle keeps one free guard at home: it holds the gate and chases off raiders
    if (!opts.duel) {
      const gx = NN / 2 - p.castle.x, gy = NN / 2 - p.castle.y, GL = hyp(gx, gy) || 1, gm = 1 + .08 * (lvl - 1);
      const gd = add({ order: "guard", pid: pl.pid, kind: "unit", key: "guard", free: true, lvl: 1, x: p.castle.x + gx / GL * .9, y: p.castle.y + gy / GL * .9, maxhp: 300 * gm, atk: 14 * gm, range: 1.1, as: 1.0, spd: 1.5, armor: .2 });
      gd.hp = gd.maxhp; gd.atype = "blade"; gd.armour = "medium"; gd.retreats = 1;
    }
    if (V3 && !opts.duel) { p.waves = cleanWaves(pl.waves).map(w => ({ ...w, units: [{ type: "footman", lvl: 1, id: null, hp: 1, free: true }, ...w.units], done: false })); p.lastWave = -99; p.heroDied = false; p.enemyHeroDied = false; }
    ents.filter(e => e.pid === pl.pid).forEach(e => { e.hx = e.x; e.hy = e.y; e.spd *= BAL.move; e.as *= BAL.swing; if (pl.noRetreat) e.noRetreat = true; });
  });
  if (HV3) kit.postSetup();
  const meta = () => ents.map(e => ({ kind: e.kind, pid: e.pid, key: e.key, merc: !!e.merc, champ: e.kind === "champ", maxhp: e.maxhp, tile: e.kind === "castle" ? [Math.floor(e.y), Math.floor(e.x)] : null,
    atk: e.atk, fatk: e.kind === "champ" ? (e.flatAtk || 0) : 0, range: e.range, as: e.as, spd: e.spd, armor: Math.min(.8, (e.armor || 0) + (e.dmgRed || 0)), atype: BV5 && e.kind === "champ" ? "hero" : e.atype || null, armour: BV5 && e.kind === "champ" ? "hero" : e.armour || null,
    lvl: e.kind === "champ" ? (e.lvl0 || 1) : (e.lvl || null), xp0: e.kind === "champ" ? (e.xp0 || 0) : null, lvlTo: e.kind === "champ" ? e.heroLvl : null, items: e.itemSet ? [...e.itemSet] : null, cls: e.cls || null, ranks: e.ranks0 || e.ranks || null, tree: e.tr0 || null, picks: e.picks || null, evade: e.evade || 0,
    ctier: e.kind === "castle" ? (P[e.pid].castleTier || 1) : null, banner: e.kind === "castle" ? (P[e.pid].banner || null) : null,
    gear: e.kind === "champ" ? (P[e.pid].gear || {}) : null, defences: e.kind === "castle" ? (P[e.pid].defences || {}) : null, heal: e.healer || e.healAmt || 0 }));

  // ----- hero levelling, gold, items, walls -----
  const ctrX = NN / 2, ctrY = NN / 2, inCentre = (x, y) => hyp(x - ctrX, y - ctrY) <= CTR_R;
  const inCombat = x => live(x.tgt) && x.tgt.kind !== "castle" && x.tgt.kind !== "totem" && hostile(x.pid, x.tgt.pid) && d(x, x.tgt) <= x.range + .7;
  const hasAggro = x => x.aggro && x.aggro.until > t && live(x.aggro.src);
  // WC3-style aggression: answer an attack unless already fighting someone, or fleeing
  const provoke = (x, src, span = 4) => { if (x.dead || x.retreating || inCombat(x) || hasAggro(x) || !hostile(x.pid, src.pid)) return; x.aggro = { src, until: t + span }; x.rt = 0; };
  function autoPick(h) {
    const L = h.heroLvl, r = h.ranks, can = k => canRankAt(k, r[k], L);
    if (can("ult")) return "ult";
    const ks = ["a1", "a2", "a3"]; return ks.filter(k => r[k] > 0 && can(k)).sort((a, b) => r[a] - r[b])[0] || ks.find(can) || (can("a4") ? "a4" : null);
  }
  function levelUp(h) {
    if (h.gains >= XPC) return; // a hero never gains more than 3 levels in one day (4 from lvlV2), from any source
    const L0 = h.heroLvl; h.heroLvl++; h.gains++;
    const oh = h.maxhp, fh = h.flatHp || 0, fa = h.flatAtk || 0; h.maxhp = (h.maxhp - fh) * (hpLvX(h.heroLvl) / hpLvX(L0)) + fh; h.hp += h.maxhp - oh; h.atk = (h.atk - fa) * (atkLvX(h.heroLvl) / atkLvX(L0)) + fa; // flat item bonuses stay flat
    const k = HV3 ? null : autoPick(h); /* skill-tree heroes never skill themselves: the player spends points on the hero screen */ let nm2 = "";
    if (k) { const o = vigMul(h.ranks.a4); h.ranks[k] = (h.ranks[k] || 0) + 1; nm2 = abName(h, k); if (k === "a4") { const f = vigMul(h.ranks.a4) / o, ob = h.maxhp; h.maxhp *= f; h.hp += h.maxhp - ob; h.atk *= f; } }
    ev({ ty: "lvl", id: h.id, L: h.heroLvl, ab: nm2, ak: k, x: h.x, y: h.y });
    txt(h, `Level ${h.heroLvl}!`, "#ffe082"); aoe(h.x, h.y, 1.1, "#ffe082", .9);
    log(`${poss(h.pid)} hero reaches level ${h.heroLvl}${nm2 ? ` and sharpens ${nm2}` : ""}.`, h.pid === mePid ? "you" : "");
    h.tel.levels = (h.tel.levels || 0) + 1;
  }
  function giveXp(h, amt) {
    if (!live(h) || h.kind !== "champ") return;
    if (inCentre(h.x, h.y)) amt *= CTR_BONUS;
    h.xp += amt;
    while (h.xp >= xpNeedX(h.heroLvl)) { if (h.heroLvl >= maxLvl) { h.xp = 0; break; } if (h.gains >= XPC) { h.xp = xpNeedX(h.heroLvl) - 1; break; } h.xp -= xpNeedX(h.heroLvl); levelUp(h); }
    if (!fast) xplog.push({ id: h.id, t, x: Math.round(h.xp * 10) / 10, n: xpNeedX(h.heroLvl), a: Math.round(amt * 10) / 10, L: h.heroLvl }); // for the replay panel's experience bar (not part of the replay hash)
  }
  // champions nearby learn from every enemy that falls; the strong and the leaders learn more slowly
  const topLvl = () => ents.reduce((m, h) => h.kind === "champ" ? Math.max(m, h.heroLvl) : m, 1);
  function awardXp(v) {
    if (v.kind === "castle" || v.kind === "totem") return;
    const vl = v.kind === "champ" ? v.heroLvl : (v.lvl || 1);
    let base = v.kind === "champ" ? 70 + 22 * vl : v.militia ? 16 : v.kind === "summon" ? 12 : 30 + 8 * (vl - 1);
    if (inCentre(v.x, v.y)) base *= 1.5;
    const heroes = ents.filter(h => h.kind === "champ" && !h.dead && fighting(h.pid) && hostile(h.pid, v.pid) && d(h, v) <= 8);
    heroes.forEach(h => { const board = top3(h.pid) ? .85 : under(h.pid) ? 1.2 : 1; giveXp(h, base / Math.max(1, heroes.length * .75) * board * (1 + Math.min(1, .15 * Math.max(0, topLvl() - h.heroLvl))) / (1 + .12 * (h.heroLvl - 1))); });
  }
  function awardGold(v, kc) {
    if (!kc || !P[kc.pid] || kc.pid === v.pid || v.kind === "totem" || !hostile(kc.pid, v.pid)) return;
    let g = v.kind === "champ" ? Math.round((20 + 7 * v.heroLvl) * (1 + .08 * Math.max(0, v.heroLvl - (champOf(kc.pid) ? champOf(kc.pid).heroLvl : v.heroLvl)))) : v.kind === "castle" ? 60 : v.militia ? GOLD_KILL.militia : v.kind === "summon" ? GOLD_KILL.summon : v.key === "guard" ? GOLD_KILL.guard : GOLD_KILL.unit + 2 * ((v.lvl || 1) - 1);
    const rk = RANKS[v.pid]; if ((v.kind === "champ" || v.kind === "castle") && rk && rk <= 3) g += bountyGold(rk, v.kind === "champ" ? v.heroLvl : (champOf(v.pid) || {}).heroLvl); // dynamic leader bounty
    if (HV3) g *= kit.goldMul(kc, v);
    if (inCentre(v.x, v.y)) g *= 1.5;
    if (TW === "bloodmoon" && v.kind === "champ") g *= TWIST_BLOODMOON;
    { const kh = champOf(kc.pid); if (kh && live(kh) && inCentre(kh.x, kh.y)) g *= CTR_BONUS; }
    g = Math.round(g); P[kc.pid].gold += g;
    if (v.kind === "champ" || v.kind === "castle") txt(kc, `+${g}g`, "#f3d27a");
  }
  function centreTick() {
    const near = ents.filter(e => !e.dead && (e.kind === "champ" || e.kind === "unit") && fighting(e.pid) && inCentre(e.x, e.y));
    const pids = [...new Set(near.map(e => e.pid))], hold = pids.length && pids.every(a => pids.every(b => allied(a, b))) ? pids : [];
    near.forEach(e => { if (e.kind === "champ") st(e.pid).onHill = (st(e.pid).onHill || 0) + 2; });
    const hm = TW === "hill" ? TWIST_HILL : 1; hold.forEach(pid => { P[pid].gold += 2 * hm; st(pid).hold += 2; const h = champOf(pid); if (h && live(h) && inCentre(h.x, h.y)) giveXp(h, (top3(pid) ? 2.5 : 3) * hm); });
    ctrHolder = hold.length ? hold[0] : null;
  }
  function itemTick(e) {
    const s = e.itemSet; if (!s || !s.size) return; const p = P[e.pid];
    if (tick % 10 === 0) {
      const AB = V4 ? AURA_BOOST : 1;
      if (s.has("banner")) friendsNear(e.pid, e.x, e.y, 3).forEach(o => setFx(o, "atkbuf", 1.3, .12 * AB));
      if (s.has("standard")) friendsNear(e.pid, e.x, e.y, 3).forEach(o => setFx(o, "guard", 1.3, e.itemV5 ? STANDARD_V5 : Math.min(.6, .12 * AB)));
      if (s.has("hpring") && e.hp < e.maxhp) heal(e, BV5 ? ITEM_V7.hpringRegen : e.itemV6 ? ITEM_V6.hpringRegen : e.itemV5 ? ITEM_REGEN_V5.hpring : e.maxhp * .012, true, e, "Ring of Health");
      if (s.has("herbs") && e.hp < e.maxhp) heal(e, BV5 ? ITEM_V7.herbs : e.itemV5 ? ITEM_REGEN_V5.herbs : e.maxhp * .006, true, e, "Mending Herbs");
      if (s.has("pipe")) friendsNear(e.pid, e.x, e.y, e.itemV6 ? ITEM_V6.pipeR : 3).forEach(o => setFx(o, "spellward", 1.3, e.itemV6 ? ITEM_V6.pipe : Math.min(.6, .25 * AB)));
      if (s.has("mender")) friendsNear(e.pid, e.x, e.y, 3).forEach(o => { if (o.hp < o.maxhp) heal(o, BV5 ? ITEM_V7.mender : 4 * AB, true, e, "Mender's Charm"); });
    }
    if (s.has("antimagic") && e.shellV2) e.engT = shellEngaged(e) ? t : null; // shell v2: it fires the moment you engage an enemy hero, whenever it is off cooldown
    else if (s.has("antimagic")) { if (enemiesNear(e, e.x, e.y, 7).some(x => x.kind === "champ")) { if (e.engT == null) e.engT = t; } else e.engT = null; } // the clock on the Shell starts when an enemy hero comes into view
    (e.cons || []).forEach(c => {
      if (t < c.ready) return;
      if (c.k === "salve" && e.hp / e.maxhp < .5) { c.ready = t + ITEMS[c.k].cd; heal(e, e.itemV6 ? ITEM_V6.salve : e.itemV5 ? SALVE_V5 : e.maxhp * .35, false, e, "Healing Salve"); txt(e, "Salve", "#9cf09c"); }
      else if (c.k === "elixir" && live(e.tgt) && d(e, e.tgt) <= e.range + 1) { c.ready = t + ITEMS[c.k].cd; setFx(e, "asbuf", 8, e.itemV5 ? ELIXIR_V5 / Math.max(.3, e.as - ELIXIR_V5) : .25); txt(e, "Fury!", "#ff8a7a"); }
      else if (c.k === "net") { const v = minBy(enemiesNear(e, e.x, e.y, 4).filter(x => x.kind === "champ"), x => d(x, e)); if (v) { c.ready = t + ITEMS[c.k].cd; setFx(v, "root", 2.5); shot(e, v, "#c9a46a", 2); txt(v, "Netted", "#e8cf9a"); } }
      else if (c.k === "shiva") { const vs = enemiesNear(e, e.x, e.y, 3); if (vs.length >= 2) { c.ready = t + ITEMS[c.k].cd; aoe(e.x, e.y, 3, "#9fe4ff", .6); vs.forEach(x => { deal(e, x, 140, { aoe: 1, ab: "Shiva's Guard" }); if (live(x)) setFx(x, "slow", 4, .4); }); txt(e, "Shiva's Guard", "#bdeeff"); } }
      else if (c.k === "antimagic" && e.engT != null && (e.shellV2 || t - e.engT >= e.shellAt - 1e-6)) { const sd = e.itemV6 ? ITEM_V6.shellDur : 5; c.ready = t + ITEMS[c.k].cd; setFx(e, "shell", sd, e.itemV6 ? 1 : .7); if (e.itemV6) e.shellFull = 1; ev({ ty: "shell", id: e.id, dur: sd }); txt(e, "Anti-Magic Shell", "#9ff0e0"); }
      else if (c.k === "scroll" && e.itemV6) { // Rune of Homecoming v6: whenever off cooldown, as the castle comes under attack or the hero runs low, a 1.5s channel, then home
        if (e.orphan || !p.castle || p.castle.dead || d(e, p.castle) <= 4 || e.runeAt != null || (sdOn() && t >= SD_AT)) return; // no way home once sudden death is called
        if (!(t - (p.castleHitT == null ? -99 : p.castleHitT) < .3 || e.hp / e.maxhp < ITEM_V6.runeLow)) return;
        c.ready = t + ITEM_V6.runeCd; e.runeAt = t + ITEM_V6.runeChannel; ev({ ty: "rune", id: e.id, dur: ITEM_V6.runeChannel }); txt(e, "Homecoming...", "#d6c2ff");
        pending.push({ ab: null, at: +(t + ITEM_V6.runeChannel).toFixed(2), fn: () => { e.runeAt = null; if (e.dead || !p.castle || p.castle.dead || (sdOn() && t >= SD_AT)) return;
          const grp = [e].concat(friendsNear(e.pid, e.x, e.y, 4).filter(o => o !== e && o.kind !== "totem" && P[o.pid] && P[o.pid].castle && !P[o.pid].castle.dead));
          grp.forEach((o, i) => { const cs = P[o.pid].castle, a = i * 2.399, r = 1.1 + (i % 3) * .45; aoe(o.x, o.y, .7, "#b48cff", .5); ev({ ty: "runeport", x: o.x, y: o.y }); o.x = cs.x + dcos(a) * r; o.y = cs.y + .4 + dsin(a) * r * .8; o.tgt = null; aoe(o.x, o.y, .7, "#b48cff", .5); ev({ ty: "runeport", x: o.x, y: o.y }); });
          txt(e, "Homecoming!", "#d6c2ff"); } }); }
      else if (c.k === "scroll" && !e.orphan && t - (p.castleHitT == null ? -99 : p.castleHitT) < .3 && p.castle && !p.castle.dead && d(e, p.castle) > 4) { // Rune of Homecoming: once a battle, as the castle comes under attack
        c.ready = 1e9; const grp = friendsNear(e.pid, e.x, e.y, 4).filter(o => o.kind !== "totem" && P[o.pid] && P[o.pid].castle && !P[o.pid].castle.dead);
        grp.forEach((o, i) => { const cs = P[o.pid].castle, a = i * 2.399, r = 1.1 + (i % 3) * .45; aoe(o.x, o.y, .7, "#b48cff", .5); o.x = cs.x + dcos(a) * r; o.y = cs.y + .4 + dsin(a) * r * .8; o.tgt = null; aoe(o.x, o.y, .7, "#b48cff", .5); });
        txt(e, "Homecoming!", "#d6c2ff"); }
    });
    (e.cons || []).forEach(c => { if (c.lr !== c.ready) { if (c.lr !== undefined) cdNote(e, "i:" + c.k, c.ready); c.lr = c.ready; } }); // note each use for the replay panel
  }
  // fences: soldiers can't walk through an enemy wall. They slide round it, and hack through if they get stuck
  const wallAt = (e, x, y) => { for (const w of walls) { if (w.hp <= 0 || ((!WV2 || e.ghostT > t) && !hostile(e.pid, w.pid))) continue; const lx = w.dir === "v" ? .3 : .72, ly = w.dir === "v" ? .72 : .3; if (Math.abs(x - w.x0 - .5) < lx && Math.abs(y - w.y0 - .5) < ly) return w; } return null; };
  const nearestWall = e => minBy(walls.filter(w => w.hp > 0 && hostile(e.pid, w.pid) && hyp(w.x0 + .5 - e.x, w.y0 + .5 - e.y) <= 2), w => hyp(w.x0 + .5 - e.x, w.y0 + .5 - e.y));
  // walls v2: a soldier whose straight line home or to its target runs into a friendly fence finds a way round on the tile grid (fences and trees block; enemy fences are left to be hacked)
  const treeTileAt = TG ? Array.from({ length: NN }, (_, r) => Array.from({ length: NN }, (_, c) => !!treeHit(c + .5, r + .5))) : null;
  const friendWallOn = (e, x, y) => walls.some(w => w.hp > 0 && !hostile(e.pid, w.pid) && Math.abs(x - w.x0 - .5) < (w.dir === "v" ? .3 : .72) && Math.abs(y - w.y0 - .5) < (w.dir === "v" ? .72 : .3));
  const segBox = (x0, y0, x1, y1, cx, cy, lx, ly) => { // does the segment pass through the box (slab test)?
    let lo = 0, hi = 1; const d = [x1 - x0, y1 - y0], o = [x0 - cx, y0 - cy], h = [lx, ly];
    for (let a = 0; a < 2; a++) { if (Math.abs(d[a]) < 1e-9) { if (Math.abs(o[a]) >= h[a]) return false; continue; } let t1 = (-h[a] - o[a]) / d[a], t2 = (h[a] - o[a]) / d[a]; if (t1 > t2) [t1, t2] = [t2, t1]; lo = Math.max(lo, t1); hi = Math.min(hi, t2); if (lo >= hi) return false; }
    return true; };
  const lineHitsFriendWall = (e, x0, y0, x1, y1) => walls.some(w => w.hp > 0 && !hostile(e.pid, w.pid) && segBox(x0, y0, x1, y1, w.x0 + .5, w.y0 + .5, w.dir === "v" ? .3 : .72, w.dir === "v" ? .72 : .3));
  function wallPath(e, gx, gy) { // breadth-first over tiles from the soldier's tile to the goal's; returns tile centres, or null if there is no way
    const cl = v => Math.max(0, Math.min(NN - 1, Math.floor(v))), sr = cl(e.y), sc = cl(e.x), tr = cl(gy), tc = cl(gx), blocked = new Set();
    walls.forEach(w => { if (w.hp > 0 && !hostile(e.pid, w.pid)) blocked.add(w.y0 * NN + w.x0); });
    const lo = TG ? 1 : 0, free = (r, c) => r >= lo && c >= lo && r < NN - lo && c < NN - lo && !blocked.has(r * NN + c) && !(treeTileAt && treeTileAt[r][c]); // with the forest rim, the outermost ring of tiles can't be stood in
    const prev = new Map(), q = []; // start from the soldier's tile, or, if a fence stands in it, from the neighbouring tiles it can walk straight into
    if (free(sr, sc)) { prev.set(sr * NN + sc, -1); q.push(sr * NN + sc); }
    else for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const r2 = sr + dr, c2 = sc + dc; if ((dr || dc) && free(r2, c2) && !lineHitsFriendWall(e, e.x, e.y, c2 + .5, r2 + .5)) { prev.set(r2 * NN + c2, -1); q.push(r2 * NN + c2); } }
    for (let qi = 0; qi < q.length; qi++) { const k = q[qi], r = Math.floor(k / NN), c = k % NN; if (r === tr && c === tc) break;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const r2 = r + dr, c2 = c + dc, k2 = r2 * NN + c2; if (!prev.has(k2) && (free(r2, c2) || (r2 === tr && c2 === tc))) { prev.set(k2, k); q.push(k2); } } }
    const end = tr * NN + tc; if (!prev.has(end)) return null;
    const out = []; for (let k = end; k !== -1; k = prev.get(k)) out.push([k % NN + .5, Math.floor(k / NN) + .5]); return out.reverse();
  }
  function wallWaypoint(e, x, y) { // where to head next instead of (x, y), or null to go straight
    if (!walls.some(w => w.hp > 0 && !hostile(e.pid, w.pid))) return null;
    const L0 = hyp(x - e.x, y - e.y), k0 = Math.min(1, 4 / L0); if (!lineHitsFriendWall(e, e.x, e.y, e.x + (x - e.x) * k0, e.y + (y - e.y) * k0)) { e.wp = null; return null; } // only fences in the next few tiles matter
    const gk = Math.floor(x) + "," + Math.floor(y);
    if (!e.wp || e.wp.gk !== gk || t >= e.wp.until) { const pth = wallPath(e, x, y); e.wp = pth ? { gk, until: t + 1, pth } : { gk, until: t + 1, pth: null }; }
    const pth = e.wp.pth; if (!pth || !pth.length) { e.ghostT = t + 1; return null; } // no way round at all: as a last resort it may step through its own side's fence rather than be stuck behind it
    let best = null; for (let i = pth.length - 1; i >= 0; i--) { const [px, py] = pth[i]; if (!lineHitsFriendWall(e, e.x, e.y, px, py)) { best = pth[i]; break; } } // the furthest point on the way that can be walked to straight
    return best || pth[Math.min(1, pth.length - 1)];
  }
  function hitWall(e, w) {
    const wx = w.x0 + .5, wy = w.y0 + .5, wd = e.atk * (1 + fxv(e, "atkbuf")) * (BV5 && e.kind === "champ" ? TYPE_TABLE.hero.fortified : V4 && e.atype === "magic" ? MAGIC_VS_FORT : TYPE_TABLE[e.atype || "blade"].fortified) * (e.key === "raider" ? 1.4 : 1) * (HV3 ? kit.wallMul(e) : 1); st(w.pid).wallHit += Math.min(wd, Math.max(0, w.hp)); w.hp -= wd;
    ev({ ty: "slash", x: wx, y: wy, c: "#d9c9a0" });
    if (w.hp <= 0) { w.hp = 0; aoe(wx, wy, .9, "#a08050", .6); }
  }

  // ----- combat core -----
  function heal(e, amt, quiet, src, ab) { if (e.dead || e.kind === "castle") return; if (HV3 && e.fx.grievous && e.fx.grievous.until > t) amt *= 1 - e.fx.grievous.val; const before = e.hp; e.hp = Math.min(e.maxhp, e.hp + amt);
    const got = e.hp - before, c = src && (src.owner || src);
    if (c && got > 0) { const label = ab || curAb || (src.kind === "totem" ? "Healing Totem" : src.healer ? "Heal" : "Other"); c.tel.healed += got; abRec(c, label).heal += got; } if (!quiet && e.hp - before >= 1) txt(e, "+" + Math.round(e.hp - before), "#7ef08a"); }
  function deal(src, tgt, amt, o = {}) {
    if (!live(tgt)) return 0;
    if (sdOn() && tgt.kind === "castle") return 0; // in sudden death the castles are out of the fight
    if (fxv(tgt, "invuln")) { if (o.big) txt(tgt, "Immune", "#ffe082"); return 0; }
    if (HV3 && kit.blocked(src, tgt, o)) return 0;
    if (src && src.range > 1.5 && P[tgt.pid].blessing === "ward" && t < 45 && tgt.kind !== "castle") { if (o.big) txt(tgt, "Warded", "#bfe3ff"); return 0; } // Ward of Arrows blessing: no missile touches the army for 45s
    if (!o.aoe) {
      if (tgt.evade && rng() < tgt.evade) {
        txt(tgt, "Dodge", "#f1e6c0");
        if (tgt.counter && live(src) && !o.counter) { shot(tgt, src, tgt.shot || "#fff"); deal(tgt, src, tgt.atk * .8, { counter: 1, ab: "Evasion" }); }
        if (tgt.kite && src) { const dd = d(tgt, src) || 1; tgt.x += (tgt.x - src.x) / dd * .7; tgt.y += (tgt.y - src.y) / dd * .7; }
        return 0;
      }
      if (HV3 && tgt.tr) { const dc = kit.dodgeChance(tgt, src, o); if (dc && rng() < dc) { txt(tgt, "Dodge", "#f1e6c0"); kit.onDodge(tgt, src); return 0; } }
      if (src && fxv(src, "blind") && rng() < (fxv(src, "blind") === 1 ? .5 : fxv(src, "blind"))) { txt(tgt, "Miss", "#ccc"); return 0; }
    }
    let m = 1;
    if (src && src.key === "bowman" && tgt.kind === "champ") m *= 1.3; // bowmen are hero-hunters
    if (src) {
      if (src.rapier) { if (RAPIER_V2) { if (src.kind === "champ" && !(o.ab || curAb) && !o.dot && !o.reflected) amt += ITEM_V6.rapier; } else m *= 2; } // Divine Rapier: v6 adds 100 to each weapon hit, abilities untouched; before, it doubled all hero damage
      if (P[src.pid].frenzy && src.kind !== "castle") m *= 1.2; // Desperation Frenzy // Divine Rapier: double hero damage
      m *= 1 + fxv(src, "atkbuf");
      if (fxv(src, "weaken")) m *= .8;
      if (P[src.pid].feud.has(tgt.pid)) m *= 1.2;
      if (loneId) m *= loneMul(src.pid); // the lone wolf hits harder
      if (leaderPid && tgt.pid === leaderPid && src.pid !== leaderPid) m *= 1.1;
    }
    if (t >= SUDDEN) m *= 1.25;
    // attack type against armour type (the only matchup rule)
    { let at = o.atype || (src && src.atype) || "pure", ar = tgt.armour || "medium"; if (BV5) { if (src && src.kind === "champ" && !o.atype) at = "hero"; if (tgt.kind === "champ") ar = "hero"; } m *= V4 && at === "magic" && ar === "fortified" ? MAGIC_VS_FORT : TYPE_TABLE[at][ar]; }
    if (src && src.vsEngine && (tgt.cart || tgt.ram || tgt.cat)) m *= src.vsEngine; // a Fire Tower's burning arrows against siege engines
    if (src && (src.kind === "unit" || src.kind === "summon") && tgt.kind === "champ") m *= HERO_GUARD;
    // the Rogue's one class trait: finishing blows
    if (src && src.cls === "rogue" && tgt.kind !== "castle" && !o.noFinish && tgt.hp / tgt.maxhp < FINISH_AT) m *= FINISH_BONUS;
    if (HV3) { m *= kit.mul(src, tgt, o, o.atype || (src && src.atype) || "pure"); if (o.critMul) m *= o.critMul; }
    m *= 1 - Math.min(.8, tgt.armor * (1 - (o.pierce || 0)) + (tgt.dmgRed || 0) * (1 - (o.pierce || 0)));
    const wall = fxv(tgt, "wall");
    if (wall) { const blocked = amt * m * wall; m *= 1 - wall; if (tgt.reflect && live(src) && !o.reflected) deal(tgt, src, blocked * .2, { aoe: 1, reflected: 1, ab: "Shield Wall" }); }
    m *= 1 + fxv(tgt, "vuln"); m *= 1 - fxv(tgt, "guard");
    const abil = !!(o.ab || curAb) && !o.reflected, plain = !abil && !o.dot && !o.reflected; // abil: a hero ability or ultimate; plain: an ordinary weapon hit
    if (!abil && src && tgt.shellFull && (o.atype || src.atype) === "magic" && fxv(tgt, "shell")) m = 0; // Shell v6: magic attacks do nothing either
    if (abil && src) { const sh = fxv(tgt, "shell"); if (sh) m *= 1 - sh; const sw = fxv(tgt, "spellward"); if (sw) m *= 1 - sw; }
    let critHit = false;
    if (src && src.icm && plain && !o.aoe && !o.critMul) { m *= src.icm; src.icm = 0; critHit = true; } // Crystalys / Daedalus
    if (TW === "siege" && tgt.kind === "castle" && src && (src.kind === "unit" || src.kind === "summon")) m *= TWIST_SIEGE;
    let dmg = Math.max(1, amt * m);
    if (tgt.block && plain) dmg = Math.max(1, dmg - tgt.block); // Vanguard
    if (HV3) { if (o.capAbs) dmg = Math.min(dmg, o.capAbs); dmg = kit.redirect(tgt, dmg); if (tgt.sh && tgt.sh.length) dmg = kit.absorb(tgt, dmg); }
    const eff = Math.min(dmg, tgt.hp);
    tgt.hp -= dmg; tgt.hitT = t;
    if (HV3 && tgt.hp < 1 && tgt.fx.undying && tgt.fx.undying.until > t) tgt.hp = 1;
    tgt.tel.taken += eff;
    if (tgt.thorns && src && src.range < 1.5 && src.kind !== "castle" && live(src) && !o.reflected) deal(tgt, src, dmg * tgt.thorns, { aoe: 1, reflected: 1, ab: "Spiked Mail" });
    if (HV3 && dmg > 0) { if (src) kit.onDealt(src, tgt, dmg, o); kit.onDamaged(tgt, src, dmg, o); }
    if (src && src.kind !== "castle" && src.kind !== "totem" && src.pid !== tgt.pid && !o.reflected) {
      const mobile = x => x.kind === "unit" || x.kind === "champ" || x.kind === "summon";
      if (mobile(tgt)) {
        provoke(tgt, src);
        ents.forEach(x => { if (x !== tgt && !x.dead && mobile(x) && (x.pid === tgt.pid || allied(x.pid, tgt.pid)) && x.order !== "guard" && d(x, tgt) <= 3) provoke(x, src); });
      } else if (tgt.kind === "castle") { // a castle under fire calls its army home to chase the attacker off, even from out of range
        ents.forEach(x => { if (!x.dead && mobile(x) && x.pid === tgt.pid && d(x, tgt) <= (x.order === "guard" ? 9 : 8)) provoke(x, src, 5); });
      }
    }
    const credit = src && (src.owner || src);
    if (credit) {
      const label = o.ab || curAb || (src.kind === "summon" ? "Spirit Wolves" : src.kind === "castle" ? "Tower" : "Auto attack");
      credit.tel.dealt += eff; abRec(credit, label).dmg += eff;
      if (!fast && tgt.kind !== "castle" && P[credit.pid]) { const B = P[credit.pid].burst || (P[credit.pid].burst = {}), k = Math.floor(t * 2); B[k] = B[k] || [0, tgt.x, tgt.y]; B[k][0] += eff; B[k][1] = tgt.x; B[k][2] = tgt.y; }
      if (tgt.kind === "castle" && P[credit.pid] && credit.pid !== tgt.pid) { P[credit.pid].castleDmg = (P[credit.pid].castleDmg || 0) + eff; const s2 = st(tgt.pid); s2.castleTaken += eff; s2.castleBy[credit.pid] = (s2.castleBy[credit.pid] || 0) + eff; }
      if (tgt.kind === "champ" && credit.pid !== tgt.pid) (tgt.hitBy || (tgt.hitBy = {}))[credit.pid] = t; // for assists
      if (tgt.kind === "champ") credit.tel.toChamp += eff; else if (tgt.kind === "castle") credit.tel.toCastle += eff; else credit.tel.toUnit += eff;
    } else if (o.trapPid) P[o.trapPid].trapDmg = (P[o.trapPid].trapDmg || 0) + eff;
    const tp = P[tgt.pid]; tp.hitT = t;
    if (src) {
      src.dealT = t; // for home healing: any hit given counts as combat
      tgt.lastBy = src.pid;
      if (tgt.kind === "castle") { tp.castleHitT = t; tp.castleHitBy = src.pid; }
      const ls = (src.lifesteal || 0) + (P[src.pid].blessing === "vamp" && src.kind !== "castle" ? .15 : 0) + fxv(src, "lsbuf") + (src.cls === "rogue" && src.kind === "champ" ? .12 : 0); if (ls) heal(src, dmg * ls, true, src, "Lifesteal");
      // betrayal trigger: an ally hitting the target I'm fighting
      order.forEach(pid => { const b = P[pid].betray && P[pid].betray[src.pid]; if (b === "When they attack my target" && P[pid].pacts.has(src.pid) && ents.some(e => !e.dead && e.pid === pid && e.tgt === tgt)) P[pid].stolenT = t; });
    }
    if (o.big || critHit) txt(tgt, Math.round(dmg), o.crit || critHit ? "#ffd54a" : "#fff");
    if (tgt.hp <= 0) kill(tgt, src);
    return dmg;
  }
  function addDot(tgt, src, dps, dur, key) {
    if (!live(tgt)) return;
    const same = tgt.dots.filter(x => x.key === key && x.src === src);
    if (same.length && !(src && src.poison && src.poison.venom && same.length < 3)) { same[0].until = t + dur; return; }
    tgt.dots.push({ dps, until: t + dur, src, key, ab: curAb || DOT_AB[key] });
  }
  function boom(e) { // the cart's blast: flattens a tier 1 castle and hurts every soldier in the area, friend or foe
    if (e.boomed) return; e.boomed = true;
    aoe(e.x, e.y, 2.6, "#ff7a2a", 1.1); aoe(e.x, e.y, 1.5, "#ffd27a", .8); log(`${poss(e.pid)} powder cart explodes!`, "big");
    const near = ents.filter(o => !o.dead && o !== e && hyp(o.x - e.x, o.y - e.y) <= (o.kind === "castle" ? 2.8 : 2.6));
    H({ kind: "cart", pid: e.pid, x: e.x, y: e.y, n: near.filter(o => o.kind !== "castle" && o.kind !== "totem").length, castle: near.some(o => o.kind === "castle" && hostile(e.pid, o.pid)), score: 97 }); // always makes the highlight reel
    near.forEach(o => {
      if (o.kind === "castle") { if (hostile(e.pid, o.pid)) { o.lastBy = e.pid; deal(e, o, 540, { aoe: 1, big: 1, atype: "siege" }); } }
      else if (o.kind !== "totem") deal(e, o, 300, { aoe: 1, big: 1, atype: "pure" }); });
  }
  function kill(e, src) {
    e.dead = true; e.hp = 0; e.tgt = null; ev({ ty: "die", id: e.id, x: e.x, y: e.y, fx: src && src.x != null ? Math.sign(e.x - src.x) : 0 }); if (e.cart) boom(e);
    e.tel.deaths++; if (e.tel.diedAt == null) e.tel.diedAt = t;
    if (HV3) kit.onKill(e, src);
    if (e.kind === "champ" && V3) order.forEach(q => { if (q === e.pid) P[q].heroDied = true; else if (hostile(q, e.pid)) P[q].enemyHeroDied = true; });
    if (sdOn() && e.kind === "champ" && src && (src.owner || src).pid !== e.pid) quip((src.owner || src).pid, "te", src.owner || src);
    const kc = src && (src.owner || src); if (kc && kc.pid !== e.pid && e.kind !== "totem" && e.kind !== "castle") { kc.tel.kills++; if (e.kind !== "champ" && P[kc.pid]) P[kc.pid].ukills++; }
    if (!opts.duel) { awardXp(e); awardGold(e, kc); if ((e.kind === "champ" || e.kind === "castle") && kc && kc.pid !== e.pid && RANKS[e.pid] && RANKS[e.pid] <= 3 && hostile(kc.pid, e.pid)) { const kh = champOf(kc.pid); if (kh) giveXp(kh, bountyGold(RANKS[e.pid], e.kind === "champ" ? e.heroLvl : (champOf(e.pid) || {}).heroLvl) * .8); } }
    if (e.kind === "champ") { const kp = kc && kc.pid; Object.keys(e.hitBy || {}).forEach(q => { if (q !== kp && t - e.hitBy[q] <= ASSIST_SECS && P[q]) P[q].assists = (P[q].assists || 0) + 1; }); e.hitBy = {}; } // an assist: hurt an enemy hero in the last few seconds before someone else slew it
    if (src && src.pid !== e.pid && e.kind === "champ") { P[src.pid].kills++; { const a = st(e.pid).heroBy, b = st(src.pid).heroSlain; a[src.pid] = (a[src.pid] || 0) + 1; b[e.pid] = (b[e.pid] || 0) + 1; } log(`${nm(src.pid)} slew ${lposs(e.pid)} hero.`);
      if (!firstBlood) { firstBlood = true; H({ kind: "firstblood", pid: src.pid, other: e.pid, x: e.x, y: e.y, score: 38 }); }
      else if (under(src.pid) && top3(e.pid) && !hl.some(h => h.kind === "giantslayer" && h.other === e.pid)) H({ kind: "giantslayer", pid: src.pid, other: e.pid, x: e.x, y: e.y, score: 62 }); }
    if (kc && kc.pid !== e.pid && (e.kind === "champ" || e.kind === "unit" || e.kind === "summon")) {
      const kp = P[kc.pid], w = e.militia || e.kind === "summon" ? .5 : e.kind === "champ" ? 2 : 1;
      kp.kt = (kp.kt || []).filter(k => t - k[0] <= 4); kp.chainT = t; kp.kt.push([t, w, e.x, e.y]); // a streak only counts kills inside a rolling 4 second window
      const sum = kp.kt.reduce((a, k) => a + k[1], 0); if (sum < STREAKS[0][0]) kp.tier = -1; else { let q = STREAKS.length - 1; while (q >= 0 && sum < STREAKS[q][0]) q--; if (q < kp.tier) kp.tier = q; }
      if (!fast && sum >= STREAKS[0][0]) { let sp = hl.find(h => h.kind === "spree" && h.pid === kc.pid && t - h.t2 <= 4);
        if (sp) { sp.t2 = t; sp.n = Math.max(sp.n, kp.kt.length); sp.score = Math.min(88, 46 + 5 * sp.n); sp.x = e.x; sp.y = e.y; }
        else { H({ kind: "spree", pid: kc.pid, t0: kp.kt[0][0], t2: t, n: kp.kt.length, x: e.x, y: e.y, score: Math.min(88, 46 + 5 * kp.kt.length), marks: [] }); sp = hl[hl.length - 1]; }
        let ti = STREAKS.length - 1; while (ti >= 0 && sum < STREAKS[ti][0]) ti--;
        if (ti > kp.tier) { kp.tier = ti; const nmS = STREAKS[ti][1]; sp.marks.push({ t, name: nmS, n: Math.round(sum) }); sp.streak = nmS; log(`${nm(kc.pid)}: ${nmS.toUpperCase()}! ${Math.round(sum)} kills in a row.`, "big"); } } }
    if (e.kind === "champ" && e.rapier) { e.rapier = false; rapierDrop = { x: e.x, y: e.y, ev: null }; H({ kind: "rapierdrop", pid: e.pid, other: src ? (src.owner || src).pid : null, x: e.x, y: e.y, score: 54 }); ev({ ty: "rapier", x: e.x, y: e.y, until: null }); if (!fast) rapierDrop.ev = events[events.length - 1]; txt(e, "Rapier dropped!", "#ffd34d"); log(`${poss(e.pid)} hero drops the Divine Rapier.`, "big"); }
    if (e.kind === "champ" && P[e.pid].alive && e.respawns > 0 && !(SD2 && sdOn())) { e.respawns--; const rt = respawnTime(e.heroLvl) * (e.phoenix ? .5 : 1); e.respawnAt = t + rt; e.respawnLen = rt; const c = P[e.pid].castle; const rv = { ty: "respawn", pid: e.pid, id: e.id, x: c.x, y: c.y, t0: t, t1: t + rt }; ev(rv); e.respawnEv = rv; }
    if (e.kind === "castle") eliminate(e.pid, src ? src.pid : e.lastBy);
  }
  function eliminate(pid, by) {
    const p = P[pid]; if (!p.alive) return;
    p.alive = false; p.elimT = t; p.place = alivePlayers().length + 1;
    if (OA) { // the army fights on without a castle: no falling back, healing at the keep or respawning, and no allies (their pacts end with the castle)
      p.orphan = true; p.retreat = false; p.fallbackUntil = 0; p.pacts.clear();
      ents.forEach(e => { if (e.pid !== pid || e.dead || e.kind === "castle") return;
        if (e.kind === "totem") { e.dead = true; e.hp = 0; ev({ ty: "die", id: e.id, x: e.x, y: e.y, fx: 0 }); return; } // a healing totem has nobody to heal for
        e.orphan = true; e.noRetreat = true; e.retreating = false; e.respawns = 0; e.respawnAt = null; e.tgt = null; if (e.order === "guard" || e.order === "escort") e.order = "army"; });
      log(`${poss(pid)} army fights on without a castle.`);
    } else ents.forEach(e => { if (e.pid === pid && !e.dead) { e.dead = true; e.hp = 0; e.respawnAt = null; ev({ ty: "die", id: e.id, x: e.x, y: e.y, fx: 0 }); } });
    if (by && (by === pid || !P[by] || !P[by].alive)) by = null;
    if (by) { P[by].castles++; if (BV5 && betrayedBy[pid] && betrayedBy[pid].has(by)) { P[by].bcastles = (P[by].bcastles || 0) + 1; log(`A betrayal kill! ${nm(by)} razed the castle of the ally they betrayed.`, "big"); } st(pid).fellTo = by; quip(by, "te", null); }
    order.forEach(o => { P[o].pacts.delete(pid); });
    log(`${poss(pid)} castle has fallen${by ? ` to ${nm(by)}` : ""}.`, "big");
    { const revenge = by && hl.some(h => (h.kind === "betray" || h.kind === "bomb") && h.pid === pid && h.other === by);
      const upset = by && top3(pid) && under(by);
      H({ kind: revenge ? "revenge" : upset ? "upset" : "fall", pid, other: by, rank: RANKS[pid] ?? null, x: p.castle.x, y: p.castle.y,
        score: revenge ? 88 : upset ? 92 : top3(pid) ? 70 + (4 - RANKS[pid]) * 3 : 30 }); }
    aoe(p.castle.x, p.castle.y - .3, 1.6, "#ff9a3c", 1.2);
  }
  const feudsNew = new Set(), betrayedBy = {}; // betrayedBy: victim -> the lords who bombed their keep in this battle
  const treachery = []; // bombs that went off: [betrayer, victim]
  function betray(pid, target, quiet) {
    if (!P[pid].pacts.has(target)) return;
    { const kc = P[target].castle; if (!P[target].alive || !kc || kc.hp <= 0) return; } // keep already destroyed: nothing to betray
    P[pid].pacts.delete(target); P[target].pacts.delete(pid);
    (betrayedBy[target] || (betrayedBy[target] = new Set())).add(pid);
    P[target].revenge.add(pid); P[target].hostileTo.add(pid); P[pid].feud.add(target); P[target].feud.add(pid); P[pid].hostileTo.add(target); feudsNew.add([pid, target].sort().join("|"));
    { const c = P[target].castle; if (c && P[target].alive && c.hp > 0) { const FUSE = 1.8; ev({ ty: "fuse", pid: target, x: c.x, y: c.y, dur: FUSE }); log(`Betrayal! ${nm(pid)} planted a bomb in ${lposs(target)} keep. It's about to blow!`, "big");
      pending.push({ at: +(t + FUSE).toFixed(2), ab: null, fn: () => { if (!P[target].alive || c.hp <= 0) return; c.lastBy = pid; aoe(c.x, c.y - .3, 2.6, "#ffb347", 1.4); deal(null, c, c.maxhp * .5, { aoe: 1, big: 1, atype: "pure" }); log(`The bomb goes off! ${nm(pid)} blew up ${lposs(target)} keep.`, "big"); if (BV) treachery.push([pid, target]); } }); } }
    if (!quiet) {  const c = champOf(pid), at = c && !c.dead ? c : P[target].castle; H({ kind: "betray", pid, other: target, x: P[target].castle.x, y: P[target].castle.y, score: 96 }); }
    log(`${poss(target)} army swears revenge on ${obj(pid)} and hunts their hero.`);
    ents.forEach(e => { if (!e.dead && (e.pid === pid || e.pid === target)) e.rt = 0; });
  }

  // ----- targeting -----
  // targeting: fight whatever non-ally crosses your path, otherwise march on your chosen target
  const ENGAGE = 3.2;
  function byPrio(e, c) {
    const p = P[e.pid], prio = p.focusLeader ? ["The leader (bounty)", ...p.prio] : p.prio;
    for (const rule of prio) {
      let pool = null;
      if (rule === "Lowest-HP enemy") pool = c.filter(o => o.kind !== "castle"), pool = pool.length ? [minBy(pool, o => o.hp / o.maxhp + d(o, e) * .03)] : null;
      else if (rule === "Enemy heroes") pool = c.filter(o => o.kind === "champ");
      else if (rule === "Nearest enemy") return minBy(c, o => d(o, e) + (o.kind === "castle" ? 1.5 : 0));
      else if (rule === "Enemy castles") pool = c.filter(o => o.kind === "castle");
      else if (rule === "Enemies on the battleground") pool = t < HOLD_END ? c.filter(o => o.kind !== "castle" && inCentre(o.x, o.y)) : null;
      else if (rule === "Enemy siege weapons") pool = c.filter(o => o.kind === "unit" && (o.key === "ram" || o.key === "cart" || o.key === "catapult"));
      else if (PRIO_UNIT[rule]) pool = c.filter(o => o.kind === "unit" && o.key === PRIO_UNIT[rule]);
      else if (rule === "Whoever hit my castle" && p.castleHitBy && t - p.castleHitT < 15) pool = c.filter(o => o.pid === p.castleHitBy);
      else if (rule === "The leader (bounty)" && leaderPid) pool = c.filter(o => o.pid === leaderPid);
      if (pool && pool.length) return minBy(pool, o => d(o, e));
    }
    return minBy(c, o => d(o, e));
  }
  // target modes decide the order of the hostile list when the battle starts
  function sortTargets(p) {
    if (PV) { p.targets = p.targets.slice(0, PICK_MAX); return; }
    const mode = p.tmode; if (!mode || mode === "list" || !p.targets.length) return;
    const rk = q => (P[q].rank != null ? P[q].rank : order.indexOf(q) + 1), my = rk(p.pid), hero = q => ents.find(o => o.kind === "champ" && o.pid === q);
    const key = { highest: q => rk(q), lowest: q => -rk(q), above: q => Math.abs(rk(q) - (my - 1)) + (rk(q) < my ? 0 : .5), below: q => Math.abs(rk(q) - (my + 1)) + (rk(q) > my ? 0 : .5),
      weakcastle: q => P[q].castle.maxhp, toplevel: q => -(P[q].level || 1), weakhero: q => { const h = hero(q); return h ? h.maxhp : 1e9; }, closest: q => d(P[q].castle, p.castle) }[mode];
    if (key) p.targets = p.targets.slice().sort((a, b) => key(a) - key(b) || (FV ? fairTie(seed, p.pid, a) - fairTie(seed, p.pid, b) : 0) || order.indexOf(a) - order.indexOf(b));
  }
  // a general role picked as a target: the lord it means right now. Equal choices are settled by a draw, never roster order.
  function roleGoal(p, e, k, ok) {
    const cs = order.filter(ok), best = f => cs.length ? cs.reduce((a, b) => { const x = f(a), y = f(b); return y < x || (y === x && fairTie(seed, p.pid, b) < fairTie(seed, p.pid, a)) ? b : a; }) : null;
    const dist = (a, q) => Math.round(d(P[q].castle, a) * 1e6);
    if (k === "@weakcastle") return best(q => Math.round(Math.max(0, P[q].castle.hp) / P[q].castle.maxhp * 1e6));
    if (k === "@nearcastle") return best(q => dist(p.castle, q));
    if (k === "@neararmy") return best(q => dist(e, q));
    const ranked = cs.filter(q => P[q].rank != null); if (!ranked.length) return best(q => dist(p.castle, q)); // no board yet (day 1): the nearest castle
    if (k === "@leader") return ranked.reduce((a, b) => (P[b].rank < P[a].rank ? b : a));
    if (k === "@above") { if (p.rank == null) return null; const up = ranked.filter(q => P[q].rank < p.rank); return up.length ? up.reduce((a, b) => (P[b].rank > P[a].rank ? b : a)) : null; }
    return null;
  }
  function goalPid(e) {
    const p = P[e.pid], ok = q => !!q && !!P[q] && P[q].alive && q !== e.pid && hostile(e.pid, q);
    if (ok(e.order)) return e.order;
    const rev = [...p.revenge].find(ok); if (rev) return rev;
    if (p.helpPid && t < p.helpUntil && P[p.helpPid] && P[p.helpPid].alive && ok(P[p.helpPid].castleHitBy)) return P[p.helpPid].castleHitBy;
    if (!p.sorted) { p.sorted = true; sortTargets(p); }
    const listed = !PV && p.targets.find(ok); if (listed) return listed;
    // nobody left on the hostile list: the army still has to fight, so it marches on the nearest non-allied castle
    if (PV) for (const k of p.targets) { const q = PICK_ROLES[k] ? roleGoal(p, e, k, ok) : ok(k) ? k : null; if (q) return q; }
    if (PV && p.rank != null) { // the lord just above me on the board; the leader goes for whoever is next below
      const cs = order.filter(q => ok(q) && P[q].rank != null), up = cs.filter(q => P[q].rank < p.rank), down = cs.filter(q => P[q].rank > p.rank);
      if (up.length) return up.reduce((a, b) => (P[b].rank > P[a].rank ? b : a));
      if (down.length) return down.reduce((a, b) => (P[b].rank < P[a].rank ? b : a));
    }
    if (FV) return order.filter(ok).sort((a, b) => (Math.round(d(P[a].castle, p.castle) * 1e6) - Math.round(d(P[b].castle, p.castle) * 1e6)) || (fairTie(seed, p.pid, a) - fairTie(seed, p.pid, b)))[0] || null;
    return minBy(order.filter(ok), q => d(P[q].castle, p.castle));
  }
  // Targeting priorities by kind of fighter (from 12 Nov 2026; the plan's gprio = { hero, melee, ranged, heal }, and engage = reach in tiles).
  // Each list is walked in order and picks the first kind with an enemy within reach: "hero", "melee", "ranged", "healer", "siege" (nearest of that kind),
  // "any" (nearest soldier), "lowhp" (the weakest soldier or hero in reach). "castle" marches on the castle of the lord the army is headed for (used by tests).
  const soldier = o => o.kind === "unit" || o.kind === "summon";
  const catOf = o => o.kind === "champ" ? "hero" : !soldier(o) ? null : o.healer ? "healer" : (o.cart || o.ram) ? "siege" : (o.range || 1.1) > 1.5 ? "ranged" : "melee";
  const grpOf = e => e.kind === "champ" ? "hero" : (e.range || 1.1) > 1.5 ? "ranged" : "melee"; // a cleric's own attacks follow the ranged list
  // orders v2: how close an enemy must be before this soldier stops for it. A siege army only stops for what is in its way; a hero hunt still turns for heroes
  const planReach = (e, o, reach) => { const p = P[e.pid]; if (!p.ordV2 || e.order === "guard") return reach; return p.armyPlan === "siege" || (p.armyPlan === "hunt" && o.kind !== "champ") ? Math.min(reach, SIEGE_REACH) : reach; };
  function groupPick(e) {
    const list = P[e.pid].gprio[grpOf(e)]; if (!list) return null;
    for (const cat of list) {
      if (cat === "castle") { const g = goalPid(e), c = g && ents.find(o => !o.dead && o.kind === "castle" && o.pid === g); if (c) return c; continue; }
      const reach = P[e.pid].engage || ENGAGE, pool = ents.filter(o => !o.dead && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e) && d(o, e) <= planReach(e, o, reach) && (cat === "any" ? soldier(o) : cat === "lowhp" ? (soldier(o) || o.kind === "champ") : catOf(o) === cat));
      if (pool.length) return minBy(pool, cat === "lowhp" ? (o => o.hp / o.maxhp + d(o, e) * .03) : (o => d(o, e)));
    }
    return null;
  }
  // who a cleric heals: the lord's heal list, then whoever is most wounded
  function healPick(e, hurt) {
    const gl = V3 && P[e.pid].gprio && P[e.pid].gprio.heal, kind = o => { const c = catOf(o); return c === "healer" ? "ranged" : c; };
    for (const cat of gl || []) {
      const pool = cat === "any" || cat === "lowhp" || cat === "wounded" ? hurt : hurt.filter(o => cat === "hero" ? o.kind === "champ" : kind(o) === cat);
      if (!pool.length) continue;
      return minBy(pool, cat === "lowhp" ? (o => o.hp) : cat === "any" ? (o => d(o, e)) : (o => o.hp / o.maxhp));
    }
    return minBy(hurt, o => o.hp / o.maxhp);
  }
  function pickTarget(e) {
    if (sdOn()) { const pool = ents.filter(o => !o.dead && o.kind !== "castle" && o.kind !== "totem" && hostile(e.pid, o.pid) && P[o.pid].alive && vis(o, e)); return pool.length ? minBy(pool, o => d(o, e)) : null; } // sudden death: whoever is nearest
    if (e.waveDef) { // waves v2: a wave's first job is the castle area; it stays by the gate until that has been clear for WAVE_DEF_CLEAR seconds
      const home = P[e.pid].castle, foes = home && !home.dead ? ents.filter(o => !o.dead && o.kind !== "castle" && o.kind !== "totem" && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e) && d(o, home) <= WAVE_DEF_R) : [];
      if (foes.length) { e.waveSeen = t; return minBy(foes, o => d(o, e)); }
      if (home && !home.dead && t - e.waveSeen < WAVE_DEF_CLEAR) return null;
      e.waveDef = false;
    }
    if (e.hunter) { const hs = ents.filter(x => !x.dead && x.kind === "champ" && hostile(e.pid, x.pid) && vis(x, e)); if (hs.length) return minBy(hs, x => d(x, e)); }
    const p = P[e.pid], guard = e.order === "guard", escort = e.order === "escort" && live(p.champ);
    if (!e.cart && !e.ram && ((UNIT_TYPES[e.key] || [])[0] !== "siege" || e.order === "guard")) { const carts = ents.filter(o => o.cart && !o.dead && hostile(e.pid, o.pid) && ents.some(c => c.kind === "castle" && !c.dead && !hostile(e.pid, c.pid) && d(c, o) <= 4) && d(o, e) <= 9); if (carts.length) return minBy(carts, o => d(o, e)); } // a powder cart within 4 tiles of a friendly castle: stop it
    if (EV2 && !e.cart && !e.ram && !e.cat && P[e.pid].castle && !P[e.pid].castle.dead) { const home = P[e.pid].castle, eng = ents.filter(o => (o.cart || o.ram || o.cat) && !o.dead && hostile(e.pid, o.pid) && vis(o, e) && d(o, home) <= ENGINE_ALERT && d(o, e) <= 9); if (eng.length) return minBy(eng, o => d(o, home)); } // a ram, catapult or powder cart within 3 tiles of home: everyone near enough turns on it, the one closest to the walls first
    // raiders (from 12 Nov 2026) make for a castle: struck by a melee fighter they turn and fight it, struck from range they keep going
    if (V3 && (e.key === "raider" || e.purpose === "castle") && !guard && !escort) { const ag = e.aggro; if (ag && ag.until > t && live(ag.src) && hostile(e.pid, ag.src.pid) && vis(ag.src, e) && (ag.src.range || 1.1) <= 1.5 && d(ag.src, e) <= 6) return ag.src;
      const g = goalPid(e), c = g && ents.find(o => !o.dead && o.kind === "castle" && o.pid === g); if (c) return c; }
    // a wave sent at the nearest enemies: whoever is closest, anywhere on the field; with nobody left it marches as usual
    if (V3 && e.purpose === "nearest" && !guard && !escort) { const pool = ents.filter(o => !o.dead && o.kind !== "castle" && o.kind !== "totem" && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e)); if (pool.length) return minBy(pool, o => d(o, e)); }
    // aggression: answer whoever just struck you or a friend nearby
    // V4: a unit that already has an enemy in reach finishes that fight instead of being pulled across the field by a provoker, and a provoker is only
    // answered when it is within AGGRO_R tiles (was 6). Heroes and soldiers used to drop a fight to chase a distant archer, then walk back.
    const hasFoe = V4 && live(e.tgt) && e.tgt.kind !== "castle" && hostile(e.pid, e.tgt.pid) && vis(e.tgt, e) && d(e.tgt, e) <= e.range + .3;
    if (e.aggro && e.aggro.until > t && live(e.aggro.src) && hostile(e.pid, e.aggro.src.pid) && vis(e.aggro.src, e) && d(e.aggro.src, e) <= planReach(e, e.aggro.src, V4 ? AGGRO_R : 6) && !hasFoe && (!guard || d(e.aggro.src, p.castle) <= 8)) return e.aggro.src;
    if (hasFoe && e.aggro && e.aggro.until > t) return e.tgt;
    // pursuit: stay on a target that is fleeing or badly hurt, unless it has escaped far away
    const cur = e.tgt;
    if (live(cur) && cur.kind !== "castle" && hostile(e.pid, cur.pid) && vis(cur, e) && (cur.retreating || cur.hp / cur.maxhp < .35) && d(cur, e) <= (guard ? 4.5 : planReach(e, cur, 7))) return cur;
    const runners = ents.filter(o => !o.dead && o.retreating && o.kind !== "castle" && hostile(e.pid, o.pid) && vis(o, e) && d(o, e) <= planReach(e, o, ENGAGE + 1.5));
    if (runners.length && !guard) return minBy(runners, o => o.hp / o.maxhp + d(o, e) * .1);
    if (V3 && p.gprio && !guard && !escort) { const t2 = groupPick(e); if (t2) return t2; } // per-group priorities: the lord's order of what this kind of fighter goes for
    const anchor = guard ? p.castle : escort ? p.champ : e, radius = guard ? (t - p.castleHitT < 6 ? 7 : 4) : (V3 && p.engage) || ENGAGE;
    const near = ents.filter(o => !o.dead && o.kind !== "castle" && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e) && d(o, anchor) <= (guard || escort ? radius : planReach(e, o, radius)));
    if (near.length) return byPrio(e, near);
    if (guard || escort) return null;
    if (PV && !(p.ordV2 && (p.armyPlan === "hunt" || p.armyPlan === "slayer"))) { const cs = ents.filter(o => !o.dead && o.kind === "castle" && hostile(e.pid, o.pid) && d(o, e) <= PASSING_CASTLE); if (cs.length) return minBy(cs, o => Math.round(d(o, e) * 1e3) + fairTie(seed, e.pid, o.pid)); } // a rival castle on the way
    { const rv = [...p.revenge].filter(q => P[q] && fighting(q) && hostile(e.pid, q)).map(q => ents.find(o => !o.dead && o.kind === "champ" && o.pid === q && vis(o, e))).filter(Boolean); if (rv.length) return minBy(rv, o => d(o, e)); }
    if (p.heading === "centre" && t < HOLD_END) { // contest the battleground: only fight what stands on the hill
      const onHill = ents.filter(o => !o.dead && o.kind !== "castle" && o.kind !== "totem" && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e) && inCentre(o.x, o.y));
      return onHill.length ? minBy(onHill, o => d(o, e)) : null;
    }
    if (p.ordV2) { // orders v2: the army plan says what comes next once the fight in front of it is over
      const g = goalPid(e), pl = p.armyPlan;
      if (pl === "hunt") { const hs = ents.filter(o => !o.dead && o.kind === "champ" && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e)); if (hs.length) return hs.find(o => o.pid === g) || minBy(hs, o => d(o, e)); } // hero to hero: the target lord's first, else the nearest still standing
      if (!g) return null;
      const theirs = ents.filter(o => !o.dead && o.pid === g && o.kind !== "totem" && vis(o, e)); if (!theirs.length) return null;
      const rank = pl === "siege" ? (o => o.kind === "castle" ? 0 : 1) : pl === "slayer" ? (o => o.kind === "champ" ? 1 : o.kind === "castle" ? 2 : 0) : (o => o.kind === "champ" ? 0 : o.kind === "castle" ? 2 : 1); // conquest (and a hunt with no hero left): hero, army, castle
      const top = Math.min(...theirs.map(rank)); return minBy(theirs.filter(o => rank(o) === top), o => d(o, e));
    }
    const g = goalPid(e); if (!g) return null;
    const theirs = ents.filter(o => !o.dead && o.pid === g && vis(o, e)), hd = P[e.pid].heading;
    if (hd === "hero" || hd === "castle") { const pref = theirs.find(o => o.kind === (hd === "hero" ? "champ" : "castle")); if (pref) return pref; }
    return theirs.length ? minBy(theirs, o => d(o, e) + (o.kind === "castle" ? 1.5 : 0)) : null;
  }
  function rogueTarget(e) {
    const c = ents.filter(o => !o.dead && o.kind !== "castle" && o.kind !== "totem" && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e) && d(o, e) <= 7);
    const prey = c.filter(o => o.hp / o.maxhp < FINISH_AT);
    if (prey.length) return minBy(prey, o => o.hp / o.maxhp + d(o, e) * .05);
    const squishy = c.filter(o => o.kind === "champ" && (o.cls === "mage" || o.cls === "archer"));
    if (squishy.length) return minBy(squishy, o => d(o, e));
    return null;
  }
  function moveToward(e, x, y, stop) {
    if (fxv(e, "stun") || fxv(e, "root") || fxv(e, "aim")) return;
    if (TG && e.kind !== "totem") { const g = treeHit(x, y); if (g) { x += g.nx * (g.d + .05); y += g.ny * (g.d + .05); } } // a spot inside the trees can never be reached: aim just outside them instead of circling the trunk
    if (WV2 && walls.length && e.kind !== "totem" && hyp(x - e.x, y - e.y) > stop) { const wp = wallWaypoint(e, x, y); if (wp) { x = wp[0]; y = wp[1]; stop = Math.min(stop, .05); } }
    const dx = x - e.x, dy = y - e.y, dd = hyp(dx, dy); if (dd <= stop) return;
    const sp = e.kind === "unit" && !e.cart && !e.ram && P[e.pid] && P[e.pid].hold && (e.order || "army") === "army" ? Math.min(e.spd, P[e.pid].slow) : e.spd, step = Math.min(dd - stop, sp * (1 - fxv(e, "slow")) * (1 + (e.v3ms || 0)) * DT), nx = e.x + dx / dd * step, ny = e.y + dy / dd * step;
    if (TG && e.kind !== "totem") { const vx = dx / dd, vy = dy / dd, L = Math.min(TREE_LOOK, dd);
      if (treeHit(nx, ny) || !treeRayClear(e.x, e.y, vx, vy, L)) { // trees ahead: steer round them early, rather than walking into the trunks
        // turn the fewest degrees that give a clear way ahead, then keep turning that same way until past the trees (while the goal stays roughly the same way), so a soldier never dithers in front of them
        const keep = e.treeSide && e.treeUntil > t && vx * e.treeGx + vy * e.treeGy > .7 ? e.treeSide : 0, sides = keep ? [keep, -keep] : (e.id % 2 ? [1, -1] : [-1, 1]);
        let pick = null;
        for (const s of (keep ? [keep] : [0])) for (const [c, sn] of TREE_TURNS) { for (const g of (s ? [s] : sides)) { const rx = vx * c - vy * sn * g, ry = vy * c + vx * sn * g; if (treeRayClear(e.x, e.y, rx, ry, Math.min(TREE_LOOK, dd)) && !treeHit(e.x + rx * step, e.y + ry * step)) { pick = [rx, ry, g]; break; } } if (pick) break; }
        if (!pick && keep) for (const [c, sn] of TREE_TURNS) { const g = -keep, rx = vx * c - vy * sn * g, ry = vy * c + vx * sn * g; if (!treeHit(e.x + rx * step, e.y + ry * step)) { pick = [rx, ry, g]; break; } } // that way is shut: go the other
        if (!pick) for (const [c, sn] of TREE_TURNS) { for (const g of sides) { const rx = vx * c - vy * sn * g, ry = vy * c + vx * sn * g; if (!treeHit(e.x + rx * step, e.y + ry * step)) { pick = [rx, ry, g]; break; } } if (pick) break; } // hemmed in: any step that is not into a trunk
        if (pick) { e.x += pick[0] * step; e.y += pick[1] * step; e.treeSide = pick[2]; e.treeUntil = t + 1; if (!keep || pick[2] !== keep) { e.treeGx = vx; e.treeGy = vy; } }
        else { const h = treeHit(e.x, e.y); if (h) { e.x += h.nx * (h.d + .01); e.y += h.ny * (h.d + .01); } }
        return; } }
    if (walls.length && e.kind !== "totem" && wallAt(e, nx, ny)) { // blocked: slide along the wall if there's room
      e.blk = (e.blk || 0) + 1;
      if (WV2) { const fw = wallAt(e, nx, ny); if (fw && !hostile(e.pid, fw.pid) && (e.fblk = (e.fblk || 0) + 1) > 40) { e.ghostT = t + 1.5; e.fblk = 0; } } // pinned against a friendly fence for 2 seconds: let it through
      if (Math.abs(dx) >= Math.abs(dy)) { if (!wallAt(e, nx, e.y)) e.x = nx; else if (!wallAt(e, e.x, ny)) e.y = ny; }
      else { if (!wallAt(e, e.x, ny)) e.y = ny; else if (!wallAt(e, nx, e.y)) e.x = nx; }
      return;
    }
    if (e.blk) e.blk = Math.max(0, e.blk - .5);
    e.x = nx; e.y = ny;
  }

  // ----- abilities -----
  const R = (e, k, arr) => ext(arr, e.ranks[k]);
  function triggerOk(e, k) {
    const trig = e.triggers[k], p = P[e.pid];
    switch (trig) {
      case "On cooldown": return true;
      case "On my top-priority target": return live(e.tgt);
      case "When 3+ enemies are near": return enemiesNear(e, e.x, e.y, 2.5).length >= 3;
      case "When my HP is under 30%": return e.hp / e.maxhp < .3;
      case "When an ally is attacked": return friendsNear(e.pid, e.x, e.y, 5).some(o => o !== e && t - o.hitT < 1);
      case "When my castle is attacked": return t - p.castleHitT < 1;
    }
    return true;
  }
  const inReach = (e, r) => live(e.tgt) && d(e, e.tgt) <= r;
  const ABIL = {
    warrior: {
      a1: e => { const rad = e.picks.a1 === "Wide Arc" ? 2.2 : 1.5, hit = enemiesNear(e, e.x, e.y, rad); if (!hit.length) return false;
        aoe(e.x, e.y, rad, "#e8e2d0", .35); hit.forEach(o => { deal(e, o, R(e, "a1", [25, 35, 45]) + e.atk * .3, { aoe: 1, big: 1 }); if (e.picks.a1 === "Bleed") addDot(o, e, 6, 3, "bleed"); }); return true; },
      a2: e => { if (t - e.hitT > 1.5 && e.triggers.a2 === "On cooldown") return false; const v = R(e, "a2", [.4, .5, .6]); setFx(e, "wall", 4, v); e.reflect = e.picks.a2 === "Reflect";
        if (e.picks.a2 === "Bulwark") friendsNear(e.pid, e.x, e.y, 2).forEach(o => setFx(o, "wall", 4, v / 2)); aoe(e.x, e.y, 1, "#7fb2ff", .8); txt(e, "Shield Wall", "#bcd6ff"); return true; },
      a3: e => { if (!enemiesNear(e, e.x, e.y, 3.5).length) return false; const v = R(e, "a3", [.2, .3, .4]);
        friendsNear(e.pid, e.x, e.y, 3).forEach(o => { setFx(o, "atkbuf", 6, v); if (e.picks.a3 === "Second Wind" && o.pid === e.pid) heal(o, 40, false, e); });
        if (e.picks.a3 === "Fear") enemiesNear(e, e.x, e.y, 2).forEach(o => setFx(o, "stun", 1));
        aoe(e.x, e.y, 3, "#ffb04a", .7); txt(e, "War Cry!", "#ffd27a"); return true; },
      ult: e => { if (e.hp / e.maxhp > .5 && enemiesNear(e, e.x, e.y, 2.5).length < 4) return false; setFx(e, "invuln", ext([6, 7, 8], e.ranks.ult)); heal(e, e.maxhp * .4, true, e, "Last Stand");
        const RW = 3.2 * UR(e.ranks.ult), hit = enemiesNear(e, e.x, e.y, RW); hit.forEach(o => { deal(e, o, ext([390, 540, 690], e.ranks.ult) * UD, { aoe: 1, big: 1 }); setFx(o, "stun", 2.5); });
        aoe(e.x, e.y, RW, "#ffe082", 1.2); ev({ ty: "ultfx", k: "laststand", x: e.x, y: e.y, r: RW, dur: 1.8 }); log(`${poss(e.pid)} Warrior makes a Last Stand.`);
        if (hit.length >= 3) H({ kind: "ult", ab: "Last Stand", pid: e.pid, n: hit.length, x: e.x, y: e.y, score: 44 + 4 * hit.length }); return true; },
    },
    mage: {
      a1: e => { if (!inReach(e, 4.5)) return false; const o = e.tgt, crit = e.ambush; e.ambush = false;
        shot(e, o, "#ff8a2a", 3); deal(e, o, (R(e, "a1", [105, 145, 190]) + e.atk) * (crit ? 2 : 1), { big: 1, crit, aoe: 1 });
        if (e.picks.a1 === "Burn") addDot(o, e, 10, 4, "burn");
        if (e.picks.a1 === "Explosion") { aoe(o.x, o.y, 1.5, "#ff8a2a", .5); enemiesNear(e, o.x, o.y, 1.5).filter(x => x !== o).forEach(x => deal(e, x, R(e, "a1", [52, 75, 98]), { aoe: 1, big: 1 })); }
        return true; },
      a2: e => { const hit = enemiesNear(e, e.x, e.y, 2); if (!hit.length) return false; aoe(e.x, e.y, 2, "#9fd8ff", .8);
        hit.forEach(o => { deal(e, o, R(e, "a2", [40, 55, 70]), { aoe: 1, big: 1 }); setFx(o, "slow", 3, .4); setFx(o, "frozen", 3);
          if (e.picks.a2 === "Deep Freeze") setFx(o, "root", 1); if (e.picks.a2 === "Shatter") setFx(o, "vuln", 3, .25); }); return true; },
      a3: e => { const low = e.hp / e.maxhp < .35, p = P[e.pid];
        if (low && !e.orphan && enemiesNear(e, e.x, e.y, 2.5).length) { blink(e, p.castle.x, p.castle.y); return true; }
        if (!low && live(e.tgt) && d(e, e.tgt) > e.range + 1) { blink(e, e.tgt.x, e.tgt.y); if (e.picks.a3 === "Ambush") e.ambush = true; return true; }
        return false; },
      ult: e => { if (!inReach(e, 6)) return false; const x = e.tgt.x, y = e.tgt.y, R3 = 3.2 * UR(e.ranks.ult);
        ev({ ty: "warn", x, y, r: R3, c: "#ff5a2a", dur: 1.6 }); ev({ ty: "ultfx", k: "meteorfall", x, y, r: R3, dur: 1.6 }); log(`${poss(e.pid)} Mage calls down a Meteor.`);
        pending.push({ ab: curAb, at: t + 1.6, fn: () => { ev({ ty: "ultfx", k: "meteorhit", x, y, r: R3, dur: 2.2 }); aoe(x, y, R3, "#ff7a2a", 1.2); aoe(x, y, R3 * .6, "#ffd27a", .8); const hit = enemiesNear(e, x, y, R3); hit.forEach(o => { deal(e, o, ext([780, 1050, 1350], e.ranks.ult) * UD, { aoe: 1, big: 1 }); setFx(o, "stun", 1.5); }); if (hit.length >= 3 || hit.some(o => o.kind === "champ" && o.dead)) H({ kind: "ult", ab: "Meteor", pid: e.pid, n: hit.length, x, y, score: 44 + 4 * hit.length });
          ents.filter(c => !c.dead && c.kind === "castle" && hostile(e.pid, c.pid) && hyp(c.x - x, c.y - y) <= R3).forEach(c => deal(e, c, ext([480, 630, 780], e.ranks.ult) * UD, { aoe: 1, big: 1 })); } });
        return true; },
    },
    archer: {
      a1: e => { if (!inReach(e, 5)) return false; const o = e.tgt, dx = o.x - e.x, dy = o.y - e.y, L = hyp(dx, dy) || 1, ux = dx / L, uy = dy / L, ex = e.x + ux * 5.5, ey = e.y + uy * 5.5;
        ev({ ty: "shot", x1: e.x, y1: e.y - .35, x2: ex, y2: ey - .35, c: "#f1e6c0", w: 3 });
        enemiesNear(e, e.x, e.y, 5.6).forEach(x => { const px = x.x - e.x, py = x.y - e.y, proj = px * ux + py * uy; if (proj < 0 || proj > 5.5) return; if (Math.abs(px * uy - py * ux) > .7) return;
          deal(e, x, R(e, "a1", [60, 85, 110]) + e.atk * .4, { aoe: 1, big: 1 }); if (e.picks.a1 === "Armour Break") setFx(x, "vuln", 5, .15); });
        if (e.picks.a1 === "Ricochet") { const n = minBy(enemiesNear(e, o.x, o.y, 3).filter(x => x !== o), x => d(x, o)); if (n) { shot(o, n, "#f1e6c0", 2); deal(e, n, (R(e, "a1", [60, 85, 110]) + e.atk * .4) * .5, { aoe: 1, big: 1 }); } }
        return true; },
      a2: e => { if (!inReach(e, 5)) return false; const x = e.tgt.x, y = e.tgt.y;
        const volley = () => { aoe(x, y, 1.5, "#d9c38a", .5); enemiesNear(e, x, y, 1.5).forEach(o => { deal(e, o, R(e, "a2", [30, 42, 55]), { aoe: 1, big: 1 }); if (e.picks.a2 === "Fire Arrows") addDot(o, e, 8, 3, "fire"); }); };
        ev({ ty: "shot", x1: e.x, y1: e.y - .35, x2: x, y2: y - .35, c: "#f1e6c0", w: 2 }); volley();
        if (e.picks.a2 === "Barrage") pending.push({ ab: curAb, at: t + .6, fn: volley });
        return true; },
      ult: e => { if (!inReach(e, 6)) return false; const x = e.tgt.x, y = e.tgt.y, RA = 3.4 * UR(e.ranks.ult); log(`${poss(e.pid)} Archer looses a Rain of Arrows.`);
        for (let i = 0; i < 14; i++) pending.push({ ab: curAb, at: t + i * .4, fn: () => { ev({ ty: "ultfx", k: "arrowwave", x, y, r: RA, dur: .85 }); aoe(x, y, RA, "#d9c38a", .4); enemiesNear(e, x, y, RA).forEach(o => deal(e, o, ext([105, 142, 188], e.ranks.ult) * UD, { aoe: 1 })); } });
        return true; },
    },
    shaman: {
      a1: e => { const hurt = friendsNear(e.pid, e.x, e.y, 3).filter(o => o.hp / o.maxhp < .8); if (!hurt.length) return false;
        const spring = e.picks.a1 === "Spring";
        const tot = add({ owner: e, pid: e.pid, kind: "totem", key: "totem", armour: "medium", x: e.x + .4, y: e.y + .2, maxhp: 120, atk: 0, range: 0, as: 1, spd: 0, armor: .2, life: t + (spring ? 3 : 6), healAmt: R(e, "a1", [8, 12, 16]) * (spring ? 1.6 : 1), ward: e.picks.a1 === "Ward" });
        tot.hp = tot.maxhp; tot.hx = tot.x; tot.hy = tot.y; txt(e, "Healing Totem", "#9cf09c"); return true; },
      a2: e => { if (!inReach(e, 4.5)) return false; let cur = e.tgt, from = e, dmg = R(e, "a2", [65, 85, 100]); const hitSet = new Set();
        const jumps = R(e, "a2", [2, 3, 3]) + (e.picks.a2 === "Overload" ? 2 : 0);
        for (let j = 0; j <= jumps && cur; j++) { shot(from, cur, "#8fd3ff", 2); deal(e, cur, dmg, { aoe: 1, big: 1 }); if (j === 0 && e.picks.a2 === "Stun") setFx(cur, "stun", 1);
          hitSet.add(cur); from = cur; dmg *= .8; cur = minBy(enemiesNear(e, cur.x, cur.y, 2.5).filter(x => !hitSet.has(x)), x => d(x, from)); }
        return true; },
      a3: e => { const own = friendsNear(e.pid, e.x, e.y, 4).filter(o => o.pid === e.pid); if (own.length < 2 || !enemiesNear(e, e.x, e.y, 6).length) return false;
        const v = R(e, "a3", [.25, .35, .45]) + (e.picks.a3 === "Frenzy" ? .2 : 0);
        own.forEach(o => { setFx(o, "asbuf", 8, v); if (e.picks.a3 === "Lifesteal") setFx(o, "lsbuf", 8, .25); }); aoe(e.x, e.y, 4, "#d9473a", .7); txt(e, "Bloodlust!", "#ff8a7a"); return true; },
      ult: e => { if (!live(e.tgt)) return false; log(`${poss(e.pid)} Shaman summons Spirit Wolves.`);
        (e.ranks.ult >= 3 ? [-1.5, -.5, .5, 1.5] : [-1, 0, 1]).forEach(s => { const w = add({ owner: e, pid: e.pid, kind: "summon", key: "wolf", atype: "blade", armour: "medium", x: e.x + s * .5, y: e.y + .3, maxhp: ext([630, 840, 1050], e.ranks.ult), atk: ext([54, 72, 90], e.ranks.ult) * UD, range: 1.1, as: .8, spd: 2.5, armor: .15, life: t + 45 }); w.hp = w.maxhp; w.hx = w.x; w.hy = w.y; });
        enemiesNear(e, e.x, e.y, 2.5 * UR(e.ranks.ult)).forEach(o => setFx(o, "stun", 1.5));
        aoe(e.x, e.y, 2.5 * UR(e.ranks.ult), "#bfe3ff", .9); ev({ ty: "ultfx", k: "spirit", x: e.x, y: e.y, r: 2.5 * UR(e.ranks.ult), col: P[e.pid].color, dur: 1.8 }); return true; },
    },
    rogue: {
      a1: e => { if (!inReach(e, 1.6)) return false; const o = e.tgt; let m = 1;
        if (o.tgt && o.tgt !== e) m *= 1.5; if (e.picks.a1 === "Execute" && o.hp / o.maxhp < .4) m *= 1.5;
        slash(o, "#ffd54a"); deal(e, o, (R(e, "a1", [95, 135, 175]) + e.atk) * m, { big: 1, crit: m > 1, aoe: 1 }); if (e.picks.a1 === "Cripple") setFx(o, "slow", 3, .4); if (o.hp / o.maxhp >= FINISH_AT) { e.fleeUntil = t + 1.2; e.hits = 0; } return true; },
      a2: e => { const near = enemiesNear(e, e.x, e.y, 2); if (!near.length) return false; aoe(e.x, e.y, 2, "#55525e", 1.4);
        near.forEach(o => { setFx(o, "blind", 3); if (o.tgt === e) o.tgt = null; if (e.picks.a2 === "Choke") setFx(o, "silence", 2); });
        if (e.picks.a2 === "Vanish") setFx(e, "vanish", 2); return true; },
      ult: e => { const foes = enemiesNear(e, e.x, e.y, 7), heroes = foes.filter(o => o.kind === "champ"); if (!heroes.length && foes.length < 3) return false;
        const prey = minBy(heroes.length ? heroes : foes, o => d(o, e)); if (!prey) return false; const rk = e.ranks.ult, RR = 2.6 * UR(rk);
        { const ox = e.x, oy = e.y; aoe(e.x, e.y, .8, "#2a2a33", .5); e.x = prey.x + .4; e.y = prey.y + .1; ev({ ty: "ultfx", k: "assassin", x0: ox, y0: oy, x: prey.x, y: prey.y, r: RR, dur: 1.2 }); } slash(prey, "#ff4a4a");
        deal(e, prey, UD * ext([780, 1050, 1350], rk) * (prey.hp / prey.maxhp < ext([.5, .55, .6], rk) ? 1.6 : 1), { big: 1, crit: 1, aoe: 1 });
        aoe(prey.x, prey.y, RR, "#ff4a4a", .8); enemiesNear(e, prey.x, prey.y, RR).filter(o => o !== prey).forEach(o => { slash(o, "#ff4a4a"); deal(e, o, ext([300, 420, 540], rk) * UD, { aoe: 1, big: 1 }); });
        log(`${poss(e.pid)} Rogue assassinates a target.`); if (prey.kind === "champ") H({ kind: "ult", ab: "Assassinate", pid: e.pid, other: prey.pid, x: prey.x, y: prey.y, score: 60 }); return true; },
    },
  };
  function blink(e, x, y) { const dx = x - e.x, dy = y - e.y, L = hyp(dx, dy) || 1, s = Math.min(3, L); aoe(e.x, e.y, .7, "#b48cff", .5); e.x += dx / L * s; e.y += dy / L * s; aoe(e.x, e.y, .7, "#b48cff", .5); }
  function tryAbilities(e) {
    if (HV3) return kit.cast(e);
    if (fxv(e, "silence") || (e.castLock || 0) > t) return;
    const k0 = ["ult", "a1", "a2", "a3"];
    for (const k of k0) {
      if (!e.ranks[k] || PASSIVE[e.cls] === k || e.cds[k] > t || (k === "ult" && !e.ultArm)) continue;
      const escape = e.cls === "mage" && k === "a3" && e.picks.a3 === "Escape" && e.hp / e.maxhp < .3;
      if (!escape && !triggerOk(e, k)) continue;
      const fn = ABIL[e.cls][k]; if (!fn) continue;
      curAb = abName(e, k); const ok = fn(e); if (ok) { abRec(e, curAb).casts++; if (k === "ult") { P[e.pid].ultCast = true; anyUlt = true; if (!hl.some(h => h.kind === "ult" && h.pid === e.pid && h.t === t)) H({ kind: "ult", ab: curAb, gen: 1, pid: e.pid, x: e.x, y: e.y, score: 50 }); } } curAb = null;
      if (!ok) continue;
      { const sp = e.cls + "_" + k, art = SPELL_ART[sp]; if (art) { const at = art.at === "t" && live(e.tgt) ? e.tgt : e; ev({ ty: "spell", sp, x: at.x, y: at.y - .2, r: art.r }); } atkEv(e, live(e.tgt) ? e.tgt : e, "c"); }
      e.cds[k] = k === "ult" ? 1e9 : t + COOLDOWN[e.cls][k] * BAL.cd * (1 - .1 * (e.ranks[k] - 1)) * e.cdMul; e.castLock = t + .4; cdNote(e, k, e.cds[k]); // the ultimate is once per fight
      return;
    }
  }

  // ----- orders and betrayals, checked once per second -----
  function council() {
    const alive = alivePlayers();
    order.forEach(pid => {
      const p = P[pid]; if (!p.alive) return;
      if (p.ordV2 && p.fallback !== "none" && !sdOn() && p.castle && p.castle.hp > 0) { // orders v2: the army's one fall-back condition
        const home = p.castle, hero = champOf(pid), fb = p.fallback;
        const hit = fb === "castle" ? ents.filter(o => !o.dead && (o.kind === "unit" || o.kind === "champ") && hostile(pid, o.pid) && d(o, home) <= 3).length >= CASTLE_ALERT_N
          : fb === "siege" ? ents.some(o => (o.cart || o.ram || o.cat) && !o.dead && hostile(pid, o.pid) && d(o, home) <= TERRITORY_R)
          : fb === "herodies" ? !!hero && hero.dead
          : fb === "heroback" ? !!hero && !hero.dead && !!hero.retreating : false;
        if (hit) { if (!(p.fallbackUntil > t) && pid === mePid) log("Your army falls back to the castle.", "you"); p.fallbackUntil = t + FALLBACK_LINGER; } // it stays home a few seconds after the danger passes, so it doesn't bounce
      }
      if (!p.ordV2) p.rules.forEach((r, i) => {
        const repeat = r.then === "Retreat hero to castle";
        if (p.fired.has(i) && !repeat) return;
        let ok = false, ally = null;
        switch (r.if) {
          case "My hero's HP < 30%": ok = live(p.champ) && p.champ.hp / p.champ.maxhp < .3; break;
          case "My castle is under attack": ok = t - p.castleHitT < 1.2; break;
          case "An ally is attacked": ally = [...p.pacts].find(a => P[a].alive && t - P[a].hitT < 1.2); ok = !!ally; break;
          case "Only 3 players remain": ok = alive.length <= 3; break;
          case "A trap is triggered": ok = t - p.trapT < 1.2; break;
          case "Battle passes 2 minutes": ok = t >= 120; break;
        }
        if (!ok) return;
        if (repeat && (p.retreat || t - p.retreatT < 10)) return;
        if (repeat && V4 && r.if === "My castle is under attack" && !(live(p.champ) && d(p.champ, p.castle) <= RECALL_R)) return; // too far away to help: keep fighting
        p.fired.add(i);
        switch (r.then) {
          case "Retreat hero to castle": p.retreat = true; p.retreatT = t; break;
          case "All units defend castle": case "All units fall back to regroup": p.fallbackUntil = t + 15; break;
          case "Send units to help": p.helpPid = ally || [...p.pacts][0] || null; p.helpUntil = t + 12; break;
          case "Switch to Aggressive": p.stance = "aggressive"; p.defendAll = false; break;
          case "Switch to Defensive": case "Switch to Cautious": p.stance = "cautious"; break;
          case "Focus the leader": p.focusLeader = true; break;
        }
        if (pid === mePid) log(`Your order: ${r.if.toLowerCase()} → ${r.then.toLowerCase()}.`, "you");
      });
      Object.entries(p.betray || {}).forEach(([target, trig]) => {
        if (!P[target] || !P[target].alive || !p.pacts.has(target)) return;
        let ok = false;
        if (trig === "When 3 players remain") ok = alive.length <= 3;
        else if (trig === "When their castle drops below 30%") ok = P[target].castle.hp / P[target].castle.maxhp < .3;
        else if (trig === "At the 2-minute mark") ok = t >= 120;
        else if (trig === "Halfway through the battle") ok = t >= 90 || alive.length <= Math.ceil(order.length / 2);
        else if (trig === "When they attack my target") ok = t - (p.stolenT || -9) < 1.2;
        else if (trig === "When their hero drops below 30%") { const th = champOf(target); ok = !!th && !th.dead && th.hp / th.maxhp < .3; }
        else if (trig === "When their castle is under attack") ok = t - (P[target].castleHitT ?? -99) < 1;
        else if (trig === "When their hero has fallen") { const th = champOf(target); ok = !!th && th.dead; }
        p.armed = p.armed || {};
        if (ok && !p.armed[target]) { p.armed[target] = true; if (pid === mePid) log(`Your hero heads for ${lposs(target)} keep. The betrayal strikes when they arrive.`, "you"); }
        if (p.armed[target]) { // the hero has to carry it out: walk to the ally's base and set it off
          const hero = champOf(pid), keep = P[target].castle;
          if (hero && live(hero) && keep && d(hero, keep) <= 2.2) betray(pid, target);
        }
      });
    });
    if (alive.length > 1 && alive.every(a => alive.every(b => allied(a, b)))) {
      if (FIN2) breakLastAlliance(alive);
      else if (finalDay) { alive.forEach(a => P[a].pacts.clear()); log("Final day: the pacts dissolve. One banner must stand alone.", "big"); }
      else if (!teamWin) { teamWin = alive.slice(); log("Only allies remain. They share the day's victory.", "big"); over = true; }
    }
  }

  function think(e) {
    const p = P[e.pid];
    if (sdOn() && e.kind === "castle") return;
    if (sdOn() && t < sd.go && e.kind !== "totem") return; // the countdown: everyone stands ready
    if (e.regen && e.hp < e.maxhp) e.hp = Math.min(e.maxhp, e.hp + e.regen * DT);
    if (HV3) kit.tick(e);
    if (e.kind === "totem") {
      if (e.v3) { kit.totemTick(e); return; }
      if (t >= e.life) { e.dead = true; ev({ ty: "die", id: e.id, x: e.x, y: e.y, fx: 0, ex: 1 }); return; }
      if (tick % 10 === 0) friendsNear(e.pid, e.x, e.y, 2.5).forEach(o => { if (o !== e) { heal(o, e.healAmt, false, e); if (e.ward) setFx(o, "wall", 1.1, .2); } });
      return;
    }
    if (e.kind === "summon" && t >= e.life) { e.dead = true; ev({ ty: "die", id: e.id, x: e.x, y: e.y, fx: 0, ex: 1 }); aoe(e.x, e.y, .6, "#bfe3ff", .5); return; }
    if (fxv(e, "stun")) return;
    if (e.kind === "champ" && e.itemSet) itemTick(e);
    if (BV5 && e.kind === "champ" && !e.orphan && e.hp < e.maxhp && p.castle && p.castle.hp > 0 && !sdOn() && d(e, p.castle) < HOME_HEAL_R && t - e.hitT >= HOME_HEAL_WAIT && t - (e.dealT ?? -99) >= HOME_HEAL_WAIT) { // home healing, out of combat
      heal(e, e.maxhp * HOME_HEAL * DT, true, null, "Home"); if (!e.homeHealT || t - e.homeHealT > 3) { e.homeHealT = t; txt(e, "Resting", "#9cf09c"); } }
    // castle towers
    if (e.kind === "castle") {
      e.atkT -= DT; if (e.atkT > 0) return;
      const o = minBy(ents.filter(x => !x.dead && x.kind !== "castle" && hostile(e.pid, x.pid) && vis(x, e) && d(x, e) <= e.range), x => d(x, e));
      if (o) { shot(e, o, e.shot); deal(e, o, e.atk); e.atkT = e.as; }
      return;
    }
    // powder cart: crawls at a castle and blows itself up on arrival
    if (e.cart || e.ram) {
      e.rt -= DT;
      if (!live(e.tgt) || e.rt <= 0) { const g = goalPid(e), c = g && P[g] && P[g].alive ? P[g].castle : minBy(order.filter(q => q !== e.pid && P[q].alive && hostile(e.pid, q)).map(q => P[q].castle), x => d(x, e)); e.tgt = c && live(c) ? c : null; e.rt = 1; }
      if (!live(e.tgt)) return;
      if (e.breaker && walls.length) { // siege engines (plans stamped siegeV1) batter down a wall in their way instead of sliding round it
        if (e.wallTgt && e.wallTgt.hp <= 0) e.wallTgt = null;
        if (!e.wallTgt && (e.blk || 0) >= 2) { e.wallTgt = nearestWall(e) || null; e.blk = 0; }
        if (e.wallTgt) { const w = e.wallTgt, wx = w.x0 + .5, wy = w.y0 + .5;
          if (hyp(e.x - wx, e.y - wy) > e.range + .85) moveToward(e, wx, wy, .6);
          else { e.atkT -= DT * (1 + fxv(e, "asbuf")); if (e.atkT <= 0) { e.atkT = e.as; atkEv(e, { x: wx, y: wy }, e.cat ? "r" : "m"); if (e.cat) shot(e, { x: wx, y: wy }, "#8a8478", 1, "rock"); hitWall(e, w); } }
          return; } }
      if (e.cat) { // catapult: crawls to two tiles from the castle, takes a moment to set up, then hurls a boulder every few seconds
        if (d(e, e.tgt) <= e.range + .05) {
          if (e.setAt == null) { e.setAt = +(t + 2).toFixed(2); log(`${poss(e.pid)} catapult sets up.`); }
          if (t >= e.setAt) { e.atkT -= DT * (1 + fxv(e, "asbuf")); if (e.atkT <= 0) { e.atkT = e.as; atkEv(e, e.tgt, "m"); shot(e, e.tgt, "#8a8478", 1, "rock"); deal(e, e.tgt, e.atk, { big: 1 }); } }
        } else { e.setAt = null; moveToward(e, e.tgt.x, e.tgt.y, e.range); }
        return; }
      if (e.ram) { if (d(e, e.tgt) <= 1.1) { e.atkT -= DT * (1 + fxv(e, "asbuf")); if (e.atkT <= 0) { e.atkT = e.as; atkEv(e, e.tgt, "m"); slash(e.tgt); deal(e, e.tgt, e.atk, { big: 1 }); } } else moveToward(e, e.tgt.x, e.tgt.y, .9); return; }
      if (e.fuseAt != null) { if (t >= e.fuseAt) { e.hp = 0; kill(e, null); } return; } // lit: it sits still and ticks down
      if (d(e, e.tgt) <= 1.05) { e.fuseAt = +(t + 3).toFixed(2); ev({ ty: "fuse", x: e.x, y: e.y - .2, dur: 3, sc: .55, cart: 1 }); log(`${poss(e.pid)} powder cart is lit. Three seconds!`); } else moveToward(e, e.tgt.x, e.tgt.y, .9);
      return;
    }
    // retreating champion
    if (e.kind === "champ" && p.retreat) {
      moveToward(e, p.castle.x, p.castle.y - .8, .3);
      if (d(e, p.castle) < 1.5) heal(e, e.maxhp * .04 * DT, true);
      if (e.hp / e.maxhp > (V4 ? RETREAT_END_V2 : .75)) p.retreat = false;
      if (e.kind === "champ") tryAbilities(e);
      return;
    }
    // falling back to heal: every stance retreats when hurt enough, then returns to the fight
    if (p.ordV2 && (e.kind === "unit" || (e.kind === "champ" && !e.retreating)) && !e.noRetreat && !e.cart && !e.ram && !e.cat && e.order !== "guard" && p.fallbackUntil > t && p.castle && p.castle.hp > 0) { // orders v2: the whole army falls back home and defends it
      const home = p.castle, foe = minBy(enemiesNear(e, home.x, home.y, 4.5), x => d(x, e));
      if (foe) { e.tgt = foe; e.rt = .6; } else { if (d(e, home) > 1.8) moveToward(e, home.x, home.y - .9, 1.5); if (e.kind === "champ") tryAbilities(e); return; }
    }
    if ((e.kind === "champ" || e.kind === "unit") && !e.noRetreat && !(p.ordV2 && e.kind === "unit")) { // orders v2: only the hero falls back to heal (when its stance says); soldiers fight on
      const thr = RETREAT_AT[p.stance] ?? .45;
      const left = e.kind === "champ" ? 2 : 1; // soldiers fall back once, champions twice; after that they fight to the end
      if (!e.retreating && (e.retreats || 0) < left && ((e.hp / e.maxhp < thr && (!V4 || t - e.hitT < HIT_WINDOW)) || (!p.ordV2 && p.fallbackUntil > t))) { e.retreating = true; e.retreats = (e.retreats || 0) + 1; e.tgt = null; }
      if (e.retreating) {
        if (e.hp / e.maxhp >= (V4 ? BACK_AT : .8) && !(!p.ordV2 && p.fallbackUntil > t)) e.retreating = false;
        else {
          const atHome = d(e, p.castle) < 1.8;
          if (atHome) heal(e, e.maxhp * .1 * DT, true); else { setFx(e, "slow", .2, .45); moveToward(e, p.castle.x, p.castle.y - .9, 1); }
          const th = atHome ? minBy(enemiesNear(e, e.x, e.y, e.range + .2), x => d(x, e)) : null;
          if (!th) { if (e.kind === "champ") tryAbilities(e); return; }
          e.tgt = th; e.rt = .6;
        }
      }
    }
    // healer support
    if (e.healer) {
      const hurtList = friendsNear(e.pid, e.x, e.y, 5).filter(o => o !== e && o.hp / o.maxhp < .95 && o.kind !== "totem"), hurt = hurtList.length ? healPick(e, hurtList) : null;
      if (hurt) {
        if (d(e, hurt) > e.range) moveToward(e, hurt.x, hurt.y, e.range * .9);
        else { e.atkT -= DT * (1 + fxv(e, "asbuf")); if (e.atkT <= 0) { shot(e, hurt, e.shot, 1, "heal"); heal(hurt, e.healer, false, e); e.atkT = e.as; } }
        return;
      }
    }
    // footmen pin down anything they engage
    if (e.key === "footman") enemiesNear(e, e.x, e.y, .95).forEach(x => { if (x.kind !== "castle") setFx(x, "slow", .3, .35); });
    // champion fighting styles
    if (e.kind === "champ") {
      const near = r => minBy(enemiesNear(e, e.x, e.y, r).filter(x => x.kind !== "totem"), x => d(x, e));
      if (e.cls === "mage") { const th = near(2.2);
        if (V4) { if (th && th.range < 2.5 && t - e.hitT < .5 && !(e.fleeUntil > t) && (e.fleeCd || 0) <= t) { e.fleeUntil = t + 1; e.fleeCd = t + 3; } } // one short step back (1s), then at least 2s of casting before the next
        else if (th && th.range < 2.5 && (t - e.hitT < 1.5 || d(th, e) < 1.4)) e.fleeUntil = Math.max(e.fleeUntil || 0, t + .8); }
      if (e.cls === "rogue") { const crowd = enemiesNear(e, e.x, e.y, 2).length; const going = live(e.tgt) && e.tgt.hp / e.tgt.maxhp < FINISH_AT;
        if (V4) { const mates = Math.max(1, friendsNear(e.pid, e.x, e.y, 2).filter(o => o.kind !== "totem").length); if (!going && t - e.hitT < 1 && crowd >= 3 * mates) e.fleeUntil = t + 1; } // only when outnumbered 3 to 1 and being hit
        else if ((e.hp / e.maxhp < .45 && crowd && !going) || crowd >= 4 || ((e.hits || 0) >= 5 && !going)) { e.fleeUntil = t + 1; e.hits = 0; } }
      if (e.fleeUntil > t) {
        const th = near(5);
        if (th) { const dx = e.x - th.x, dy = e.y - th.y, L = hyp(dx, dy) || 1, hx = p.castle.x - e.x, hy = p.castle.y - e.y, H = hyp(hx, hy) || 1;
          moveToward(e, e.x + dx / L * 1.2 + hx / H * .5, e.y + dy / L * 1.2 + hy / H * .5, 0); }
        tryAbilities(e); return;
      }
    }
    if (walls.length) {
      if (e.wallTgt && (e.wallTgt.hp <= 0 || t > e.wallUntil)) { e.wallTgt = null; e.blk = 0; }
      if (!e.wallTgt && (e.blk || 0) >= 8) { const w = !inCombat(e) && nearestWall(e); if (w) { e.wallTgt = w; e.wallUntil = t + 4; } e.blk = 0; }
      if (e.wallTgt) {
        const w = e.wallTgt, wx = w.x0 + .5, wy = w.y0 + .5;
        if (hyp(e.x - wx, e.y - wy) > e.range + .85) moveToward(e, wx, wy, .6);
        else { e.atkT -= DT * (1 + fxv(e, "asbuf")); if (e.atkT <= 0) { e.atkT = e.as; atkEv(e, { x: wx, y: wy }, e.range > 1.5 ? "r" : "m"); hitWall(e, w); } }
        return;
      }
    }
    if (e.kind === "champ" && p.armed && !e.retreating) { // an armed betrayal sends the hero across to the ally's base
      const bt = Object.keys(p.armed).find(q => p.armed[q] && p.pacts.has(q) && P[q] && P[q].alive && P[q].castle && P[q].castle.hp > 0);
      if (bt) { moveToward(e, P[bt].castle.x, P[bt].castle.y + .8, 1.4); tryAbilities(e); return; }
    }
    e.rt -= DT;
    if (!live(e.tgt) || e.rt <= 0 || !vis(e.tgt, e) || !hostile(e.pid, e.tgt.pid)) { e.tgt = (e.cls === "rogue" && ((HV3 && kit.stealthTarget(e)) || rogueTarget(e))) || pickTarget(e); e.rt = .6; }
    if (e.kind === "champ") tryAbilities(e);
    const o = e.tgt;
    if (!live(o)) { if (e.order === "escort" && live(p.champ)) moveToward(e, p.champ.x, p.champ.y + .3, 1.1); else if (p.heading === "centre" && t < HOLD_END && e.order !== "guard" && !e.militia && (e.kind === "champ" || e.kind === "unit")) { const a = e.id * 2.399, rr = .4 + (e.id % 4) * .35; moveToward(e, ctrX + dcos(a) * rr, ctrY + dsin(a) * rr, .15); } else moveToward(e, e.hx, e.hy, .2); return; }
    const reach = e.range + (o.kind === "castle" ? .45 : 0);
    if (d(e, o) > reach) {
      if (e.range < 1.5 && o.kind !== "castle" && d(e, o) < 4) { // melee spread around the target to box it in
        const mates = ents.filter(x => !x.dead && x.pid === e.pid && x.tgt === o && x.range < 1.5), n = Math.max(3, mates.length), i = mates.indexOf(e);
        const base = datan2(mates[0].y - o.y, mates[0].x - o.x), a = base + (i < 0 ? 0 : i) * 2 * Math.PI / n;
        moveToward(e, o.x + dcos(a) * reach * .8, o.y + dsin(a) * reach * .8, .05);
      } else moveToward(e, o.x, o.y, reach * .9);
      return;
    }
    if (fxv(e, "aim")) return; // a Sniper lining up a Headshot holds fire
    e.atkT -= DT * Math.max(.2, 1 + fxv(e, "asbuf") + (P[e.pid].frenzy ? .3 : 0) + (e.v3as || 0) - fxv(e, "asdown"));
    if (e.atkT <= 0) {
      e.atkT = e.as; atkEv(e, o, e.range > 1.5 ? "r" : "m");
      if (e.range > 1.5) shot(e, o, e.shot || "#fff", 1, SHOT_STYLE[e.kind === "champ" ? e.cls : e.key]); else slash(o);
      if (e.orbCols) ev({ ty: "orbfx", id: e.id, x: o.x, y: o.y - .35, cs: e.orbCols });
      if (e.itemCrit && rng() < e.itemCrit[0]) e.icm = e.itemCrit[1];
      const dealt = HV3 && e.tr ? kit.basic(e, o) : deal(e, o, e.atk); if (e.itemCrit) e.icm = 0;
      if (e.splash && live(o)) enemiesNear(e, o.x, o.y, 1.3).filter(x => x !== o).forEach(x => deal(e, x, e.atk * e.splash, { aoe: 1 }));
      if (e.cls === "rogue") e.hits = (e.hits || 0) + 1;
      if (e.cls === "archer" && (!V4 || t - e.hitT < 1)) { const th = minBy(enemiesNear(e, e.x, e.y, 2.6).filter(x => x.range < 2.5), x => d(x, e)); if (th) e.fleeUntil = t + .6; } // from BAL_V4 only while being hit
      if (dealt && e.itemSet && e.itemSet.size && live(o)) { if (e.itemSet.has("frostdagger")) setFx(o, "slow", 1.5, .3); if (e.itemSet.has("venomorb")) addDot(o, e, 7, 3, "orb");
        if (e.itemSet.has("corruptorb")) setFx(o, "vuln", 3, .15);
        if (e.itemSet.has("fireorb")) { const fr = e.itemV6 ? ITEM_V6.fireR : 1.3, sp = enemiesNear(e, o.x, o.y, fr).filter(x => x !== o); if (sp.length) aoe(o.x, o.y, fr, "#ff7a2a", .35); sp.forEach(x => deal(e, x, dealt * (e.itemV6 ? ITEM_V6.fireSplash : .35), { aoe: 1, ab: "Orb of Fire" })); } }
      if (dealt && e.poison) { addDot(o, e, e.poison.dps, 4, "poison"); if (e.poison.weaken) setFx(o, "weaken", 4); }
    }
  }

  function record() {
    if (fast) return;
    let al = 0; order.forEach((pid, i) => { if (pid === mePid || P[mePid].pacts.has(pid)) al |= 1 << i; });
    const dd = new Array(ents.length * 4);
    ents.forEach((e, i) => {
      let fl = e.dead ? 1 : 0;
      if (fxv(e, "stun") || fxv(e, "root")) fl |= 2;
      if (fxv(e, "invuln")) fl |= 4;
      if (fxv(e, "vanish")) fl |= 8;
      if (fxv(e, "frozen") || fxv(e, "slow")) fl |= 16;
      if (fxv(e, "wall")) fl |= 32;
      if (e.sh && e.sh.length && e.sh.some(x => x.until > t && x.amt > 0)) fl |= 64;
      dd[i * 4] = +e.x.toFixed(2); dd[i * 4 + 1] = +e.y.toFixed(2); dd[i * 4 + 2] = Math.max(0, Math.round(e.hp)); dd[i * 4 + 3] = fl;
    });
    const fr = { t: +t.toFixed(2), al, d: dd }; if (walls.length) fr.w = walls.map(w => (w.born != null && w.born > t ? 0 : Math.round(w.hp))); fr.c = ctrHolder != null ? idx[ctrHolder] : -1; frames.push(fr);
  }

  // sudden death: carry every surviving hero and soldier to the middle of the map, one camp per lord around the ring, then fight to the death
  function startSudden() {
    const mobile = e => !e.dead && (e.kind === "champ" || e.kind === "unit" || e.kind === "summon") && P[e.pid].alive;
    const returning = ents.filter(e => e.dead && e.kind === "champ" && e.respawnAt && P[e.pid].alive); // heroes still waiting to respawn
    const isTower = e => !!(UNITS[e.key] && UNITS[e.key].tower); // v2: towers stay home and are out of the fight, like the castles
    let fighters = ents.filter(e => mobile(e) && !e.cart && !e.ram && !e.cat && !(SD2 && isTower(e)));
    const pids = order.filter(q => fighters.some(e => e.pid === q) || returning.some(e => e.pid === q));
    if (pids.every(a => pids.every(b => allied(a, b)))) { sd = { skip: true }; return; } // one side only: the day ends as before
    sd = { t0: t, go: +(t + SD_COUNT).toFixed(2), winners: null };
    returning.forEach(e => { // a hero on its way back joins the fight at once, with health by how far through the wait it was (never below a quarter)
      const prog = Math.max(0, Math.min(1, e.respawnLen ? 1 - (e.respawnAt - t) / e.respawnLen : 0)); e.dead = false; e.respawnAt = null; e.hp = Math.max(1, e.maxhp * (.25 + .75 * prog)); e.fx = {}; e.dots = []; e.tgt = null;
      if (e.respawnEv) e.respawnEv.t1 = t; if (HV3) kit.onRespawn(e); });
    fighters = ents.filter(e => mobile(e) && !e.cart && !e.ram && !e.cat && !(SD2 && isTower(e)));
    if (SD2) fighters.forEach(e => { if (e.hp < e.maxhp * .5) e.hp = e.maxhp * .5; }); // v2: everyone drawn in is topped up to at least half health
    ents.forEach(e => { if (e.dead) { e.respawnAt = null; return; } if (e.cart || e.ram || e.cat || e.kind === "totem" || (SD2 && isTower(e))) { e.dead = true; ev({ ty: "die", id: e.id, x: e.x, y: e.y, fx: 0, ex: 1 }); } });
    const cx = NN / 2, cy = NN / 2, AR = sdArenaR(pids.length, SD2), R = SD2 ? AR - 1 : 3 + pids.length * .4; sd.r = AR; // v2: lines start just inside the smaller ring and stack inward
    // seating: the board's 1st and 2nd face each other, 3rd and 4th face each other, and the weakest lords sit beside the top two so they don't just trade blows and leave the day to the bottom half
    const rk = q => RANKS[q] != null ? RANKS[q] : ((plans.find(p => p.pid === q) || {}).rank || idx[q] + 1), n = pids.length, byRank = pids.slice().sort((a, b) => rk(a) - rk(b) || idx[a] - idx[b]), seat = Array(n).fill(null), h = Math.floor(n / 2);
    const put = (q, s) => { if (q != null && s != null && seat[s] == null) { seat[s] = q; return true; } return false; };
    put(byRank[0], 0); put(byRank[1], h);
    if (n >= 4) { const qd = Math.round(n / 4); put(byRank[2], qd); put(byRank[3], (qd + h) % n); }
    const placed = new Set(seat.filter(q => q != null)), rest = byRank.filter(q => !placed.has(q)).reverse(); // weakest first
    const near = s => Math.min(Math.abs(s - 0), n - Math.abs(s - 0), Math.abs(s - h), n - Math.abs(s - h));
    seat.map((q, s) => [q, s]).filter(([q]) => q == null).sort((x, y) => near(x[1]) - near(y[1]) || x[1] - y[1]).forEach(([, s]) => { seat[s] = rest.shift(); });
    // v2: each army comes in from its own castle's side, and the lords still in are spread evenly round the ring (turned to fit their castles as closely as can be)
    const sdAng = {}; if (SD2) { const ang = q => datan2(P[q].castle.y - cy, P[q].castle.x - cx), byAng = pids.slice().sort((a, b) => ang(a) - ang(b) || (a < b ? -1 : 1)); let sx = 0, sy = 0;
      byAng.forEach((q, k) => { const off = ang(q) - 2 * Math.PI * k / n; sx += dcos(off); sy += dsin(off); }); const base = datan2(sy, sx); byAng.forEach((q, k) => { sdAng[q] = base + 2 * Math.PI * k / n; }); }
    pids.forEach(pid => { const i = seat.indexOf(pid), a = SD2 ? sdAng[pid] : -Math.PI / 2 + 2 * Math.PI * i / n, ux = dcos(a), uy = dsin(a), vx = -uy, vy = ux;
      const mine = fighters.filter(e => e.pid === pid).sort((x, y) => (y.kind === "champ") - (x.kind === "champ") || x.id - y.id);
      mine.forEach((e, k) => {
        const row = Math.floor(k / 4), inRow = Math.min(4, mine.length - row * 4), col = SD2 ? (k % 4) - (inRow - 1) / 2 : (k % 4) - 1.5; // v2: every row centred on the army's spot
        const rw = SD2 ? -Math.min(row * .75, R - .5) : row * .75; e.x = Math.max(.5, Math.min(NN - .5, cx + ux * R + vx * col * .75 + ux * rw)); e.y = Math.max(.5, Math.min(NN - .5, cy + uy * R + vy * col * .75 + uy * rw));
        e.hx = e.x; e.hy = e.y; e.tgt = null; e.retreating = false; e.noRetreat = true; e.aggro = null; if (e.order === "guard" || e.order === "escort") e.order = "army"; }); });
    ev({ ty: "sudden", x: cx, y: cy, go: sd.go }); log("SUDDEN DEATH! Every hero and soldier is drawn to the arena. Fight to the last.", "big");
  }
  // ----- main loop -----
  if (TG) ents.forEach(e => { if (e.kind === "castle" || e.kind === "totem") return; e.x = Math.max(.9, Math.min(NN - .9, e.x)); e.y = Math.max(.9, Math.min(NN - .9, e.y)); settle(e); }); // soldiers set down among the trees start just clear of them
  log("The horns sound. Battle begins!", "big");
  (plans.notes || []).forEach(n => log(n));
  record();
  while (!over) {
    t = +(t + DT).toFixed(2); tick++;
    if (SV && !sd && !opts.duel && t >= SD_AT) startSudden();
    for (let i = pending.length - 1; i >= 0; i--) if (pending[i].at <= t) { const pe = pending.splice(i, 1)[0]; curAb = pe.ab; pe.fn(); curAb = null; }
    if (HV3) kit.world();
    if (tick % 10 === 0) { updateLone(); order.forEach(pid => { const p = P[pid]; if (p.alive && !p.frenzy && p.castle.hp / p.castle.maxhp <= .2) { p.frenzy = true; aoe(p.castle.x, p.castle.y, 3, "#ff5a2a", 1.2); txt(p.castle, "Desperation Frenzy!", "#ff8a4a"); log(`${poss(pid)} defenders fight with Desperation Frenzy!`, "big"); H({ kind: "frenzy", pid, x: p.castle.x, y: p.castle.y, score: 50 }); } }); council(); }
    if (tick % 20 === 0 && !opts.duel) centreTick();
    // reinforcement waves (from 12 Nov 2026): each castle sends the garrison out when its conditions are met, never sooner than WAVE_GAP after the last, and forced out at each minute mark
    if (V3 && !opts.duel && !sdOn() && tick % 5 === 0) order.forEach(pid => {
      const p = P[pid]; if (!p.alive || !p.waves) return;
      const c = p.castle, sent = p.waves.filter(w => w.done).length;
      if (p.waveV2 && sent < WAVE_COUNT && t - p.lastWave >= (p.balV5 ? WAVE_GAP_V5 : WAVE_EMERGENCY_GAP) && sent < WAVE_EMERGENCY.filter(f => c.hp / c.maxhp < f).length) { const k = p.waves.findIndex(w => !w.done && w.rush !== false); if (k >= 0) { deployWave(p, k, true); return; } } // emergency: the castle is losing ground; only waves whose rush box is ticked
      if (t - p.lastWave < (p.balV5 ? WAVE_GAP_V5 : WAVE_GAP)) return; // balance v5: a flat 20s between waves, emergency or not
      const soldiers = ents.some(x => !x.dead && x.pid === pid && x.kind === "unit" && !x.free && !x.militia && !x.merc);
      const met = w => w.when === "timer" ? t >= w.at : w.when === "castle_hit" ? p.castleHitT > 0 || (p.waveV4 && enemyAtGate(pid)) : w.when === "castle_low" ? c.hp / c.maxhp < .5 : w.when === "hero_dies" ? p.heroDied : w.when === "army_dead" ? t > 5 && !soldiers : w.when === "enemy_hero" ? p.enemyHeroDied : anyUlt;
      let i = p.waves.findIndex(w => !w.done && met(w));
      if (i < 0 && p.waveV3) i = p.waves.findIndex((w, k) => !w.done && t >= WAVE_FORCE_AT[k]); // waves v3: each wave's own deadline
      else if (i < 0 && p.waves.filter(w => w.done).length < Math.floor(t / WAVE_FORCE_EVERY)) i = p.waves.findIndex(w => !w.done);
      if (i >= 0) deployWave(p, i);
    });
    // reinforcements: every living castle musters militia on a timer, so the field never empties into hero-only sieges
    if (!opts.duel && !FV && !sdOn() && t >= MILITIA.first && Math.abs(((t - MILITIA.first) % MILITIA.every)) < DT / 2) order.forEach(pid => {
      const p = P[pid]; if (!p.alive) return;
      const c = p.castle, dx = NN / 2 - c.x, dy = NN / 2 - c.y, L = hyp(dx, dy) || 1;
      for (let i = 0; i < (nP <= 4 ? 1 : MILITIA.count); i++) {
        const m = add({ order: "army", pid, kind: "unit", key: "militia", militia: true, lvl: 1, x: c.x + dx / L * .9 + (i - .5) * .5, y: c.y + dy / L * .9, maxhp: MILITIA.hp, atk: MILITIA.atk, range: 1.1, as: 1.0 * BAL.swing, spd: 1.5 * BAL.move, armor: .1, atype: "blade", armour: "medium" });
        m.hp = m.maxhp; m.hx = m.x; m.hy = m.y; m.retreats = 1;
      }
      if (pid === mePid) log("Militia march out from your castle.", "you");
    });
    if (rapierDrop) { const g = ents.find(h => h.kind === "champ" && !h.dead && fighting(h.pid) && hyp(h.x - rapierDrop.x, h.y - rapierDrop.y) < .8);
      if (g) { g.rapier = true; rapierHolder = g.pid; if (rapierDrop.ev) rapierDrop.ev.until = t; H({ kind: "rapierget", pid: g.pid, x: g.x, y: g.y, score: 56 }); txt(g, "Divine Rapier!", "#ffd34d"); aoe(g.x, g.y, 1, "#ffd34d", .8); log(`${poss(g.pid)} hero seizes the Divine Rapier.`, "big"); rapierDrop = null; } }
    order.forEach(pid => { // formation: the line marches at its slowest soldier's pace until the first contact, then everyone fights freely
      const p = P[pid]; if (!p.alive || p.formation === false || p.released || t - (p.fchk || -9) < .25) return; p.fchk = t;
      const grp = ents.filter(x => !x.dead && x.pid === pid && x.kind === "unit" && !x.cart && !x.ram && !x.merc && !x.militia && (x.order || "army") === "army");
      if (!grp.length) { p.hold = false; return; }
      const foes = ents.filter(x => !x.dead && x.pid !== pid && hostile(pid, x.pid) && x.kind !== "totem");
      if (t > 75 || grp.some(x => x.hp < x.maxhp * .999 || foes.some(f => hyp(f.x - x.x, f.y - x.y) <= (f.kind === "castle" ? 3.2 : 4.6)))) { p.released = true; p.hold = false; return; }
      p.hold = true; p.slow = Math.min(...grp.map(x => x.spd));
    });
    ents.forEach(e => {
      if (e.dead) {
        if (e.respawnAt && t >= e.respawnAt && P[e.pid].alive && !sdOn()) {
          const c = P[e.pid].castle; e.dead = false; e.respawnAt = null; e.hp = e.maxhp; e.x = c.x; e.y = c.y - 1; e.fx = {}; e.dots = []; e.tgt = null;
          aoe(e.x, e.y, 1, "#ffe082", .8); if (HV3) kit.onRespawn(e); if (e.pid === mePid) log("Your hero rises again at the castle.", "you");
        }
        return;
      }
      if (e.dots.length) { e.dots = e.dots.filter(x => x.until > t); e.dots.forEach(x => { if (!e.dead) deal(x.src, e, x.dps * DT, { aoe: 1, ab: x.ab, dot: 1 }); }); if (e.dead) return; }
      if (t >= SUDDEN && e.kind === "castle" && !V3) deal(null, e, e.maxhp * .015 * DT, { aoe: 1 });
      if (!e.dead) think(e);
    });
    traps.forEach(tr => {
      if (tr.used || !P[tr.pid].alive) return;
      if (tr.ranger && t > tr.until) { tr.used = true; tr.usedT = t; return; } // a Ranger's trap lapses after 8 seconds
      const o = ents.find(x => !x.dead && x.kind !== "castle" && x.kind !== "totem" && hostile(tr.pid, x.pid) && (tr.type !== "sand" || x.cart || x.ram || x.cat) && hyp(x.x - tr.x, x.y - tr.y) < .55);
      if (!o) return;
      tr.used = true; tr.usedT = t; P[tr.pid].trapT = t;
      if (tr.ranger) { kit.trapFire(tr, o); return; }
      const TD = tr.v2 ? TRAP_DMG : TRAP_DMG_V1;
      if (tr.type === "spike") { aoe(tr.x, tr.y, .7, "#c7ccd1", .6); deal(null, o, TD.spike, { aoe: 1, big: 1, trapPid: tr.pid, atype: "pure" }); }
      else if (tr.type === "blade") { const dx = o.x - tr.x, dy = o.y - tr.y, L = hyp(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
        for (let k = -3; k <= 3; k++) ev({ ty: "shot", x1: tr.x + px * k * .35, y1: tr.y + py * k * .35, x2: tr.x + px * k * .45 + ux * 4, y2: tr.y + py * k * .45 + uy * 4, c: "#d7dde2", w: 2 });
        aoe(tr.x, tr.y, .8, "#d7dde2", .5); enemiesNear({ pid: tr.pid }, tr.x + ux * 2, tr.y + uy * 2, 2.4).forEach(v => deal(null, v, TD.blade, { aoe: 1, big: 1, trapPid: tr.pid, atype: "pure" })); }
      else if (tr.type === "bomb") { aoe(tr.x, tr.y, BOMB_R, "#ff8a3a", .7); enemiesNear({ pid: tr.pid }, o.x, o.y, BOMB_R).forEach(v => deal(null, v, TD.bomb, { aoe: 1, big: 1, trapPid: tr.pid, atype: "pure" })); }
      else if (tr.type === "sand") { aoe(tr.x, tr.y, .8, "#d9c48a", .6); setFx(o, "root", SAND_SECS); txt(o, "Stuck in sand", "#e8cf9a"); }
      else { aoe(tr.x, tr.y, .7, "#c9a46a", .6); setFx(o, "root", 3); txt(o, "Snared", "#e8cf9a"); }
      if (tr.pid === mePid) log(`Your ${TRAPS[tr.type].name.toLowerCase()} caught one of ${lposs(o.pid)} soldiers.`, "you");
    });
    // surrounded: two melee attackers slow a target hard, three pin it in place
    const ring = new Map();
    ents.forEach(a => { if (!a.dead && a.range < 1.5 && live(a.tgt) && a.tgt.kind !== "castle" && d(a, a.tgt) <= a.range + .3) ring.set(a.tgt, (ring.get(a.tgt) || 0) + 1); });
    ring.forEach((n, o) => { if (n >= 3) setFx(o, "root", .25); else if (n >= 2) setFx(o, "slow", .25, .5); });
    // keep soldiers from stacking on one spot
    const mob = ents.filter(e => !e.dead && e.kind !== "castle" && e.kind !== "totem");
    // bodies: heavy melee soldiers (footmen, knights, warriors) are wide and hard to shove, so they hold a line.
    // Ranged units and light heroes are slim and give way, which lets mages and archers shelter behind a front line.
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < mob.length; i++) for (let j = i + 1; j < mob.length; j++) {
      const a = mob[i], b = mob[j], dx = b.x - a.x, dy = b.y - a.y;
      if (dx > .95 || dx < -.95 || dy > .95 || dy < -.95) continue;
      const dd = hyp(dx, dy), ba = bodyOf(a), bb = bodyOf(b), ally = allied(a.pid, b.pid);
      const min = (ba[0] + bb[0]) * (ally ? .5 : 1);
      if (dd >= min) continue;
      const nx = dd > 0 ? dx / dd : 1, ny = dd > 0 ? dy / dd : 0, gap = min - dd;
      const ma = ally ? 1 : (a.cart || a.ram) ? 60 : ba[1], mb = ally ? 1 : (b.cart || b.ram) ? 60 : bb[1], tot = ma + mb, sa = gap * mb / tot, sb = gap * ma / tot;
      a.x -= nx * sa; a.y -= ny * sa; b.x += nx * sb; b.y += ny * sb;
      if (!ally && pass === 0 && !fxv(a, "root") && !fxv(b, "root")) { // the lighter body slides round the heavier one instead of jamming
        const lt = ma < mb ? a : mb < ma ? b : null;
        if (lt) { const s = (lt.id % 2 ? 1 : -1) * gap * .3; lt.x += -ny * s; lt.y += nx * s; }
      }
    }
    ents.forEach(e => { if (e.anchor && !e.dead) { e.x = e.anchor[0]; e.y = e.anchor[1]; } }); // nothing moves a tower: not crowds, not spells, not orders
    if (WV2 && walls.length) { const mg = TG ? .9 : .3, inside = (x, y) => x < mg || y < mg || x > NN - mg || y > NN - mg || walls.some(w => w.hp > 0 && Math.abs(x - w.x0 - .5) < (w.dir === "v" ? .3 : .72) && Math.abs(y - w.y0 - .5) < (w.dir === "v" ? .72 : .3));
      mob.forEach(e => { if (!walls.some(w => w.hp > 0 && Math.abs(e.x - w.x0 - .5) < (w.dir === "v" ? .3 : .72) && Math.abs(e.y - w.y0 - .5) < (w.dir === "v" ? .72 : .3)) || e.ghostT > t) return; // v2: a soldier inside a fence (or wedged where two meet) steps to the nearest clear spot
        for (let r = .08; r <= 1.2; r += .08) { let done = false; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, x = e.x + dcos(a) * r, y = e.y + dsin(a) * r; if (!inside(x, y)) { e.x = x; e.y = y; done = true; break; } } if (done) break; } }); }
    if (walls.length) mob.forEach(e => { for (const w of walls) { if (w.hp <= 0 || (!WV2 && !hostile(e.pid, w.pid))) continue;
      if (WV2) continue;
      if (e.x > w.x0 && e.x < w.x0 + 1 && e.y > w.y0 && e.y < w.y0 + 1) { const l = e.x - w.x0, r = w.x0 + 1 - e.x, u = e.y - w.y0, b = w.y0 + 1 - e.y, m = Math.min(l, r, u, b);
        if (m === l) e.x = w.x0 - .23; else if (m === r) e.x = w.x0 + 1.23; else if (m === u) e.y = w.y0 - .23; else e.y = w.y0 + 1.23; } } });
    { const mg = TG ? .9 : .3; mob.forEach(e => { e.x = Math.max(mg, Math.min(NN - mg, e.x)); e.y = Math.max(mg, Math.min(NN - mg, e.y)); if (TG) settle(e); }); }
    if (SD2 && sdOn()) { const lim = sd.r - .35, ax = NN / 2, ay = NN / 2; mob.forEach(e => { const dx = e.x - ax, dy = e.y - ay, rr = hyp(dx, dy); if (rr > lim) { e.x = ax + dx / rr * lim; e.y = ay + dy / rr * lim; if (TG) settle(e); } }); } // nobody leaves the ring
    if (tick % 2 === 0) record();
    const alive = alivePlayers();
    if (sdOn() && t >= sd.go) { // last side standing wins; when time runs out, the side with the most health left
      const mb = ents.filter(e => !e.dead && (e.kind === "champ" || e.kind === "unit" || e.kind === "summon") && P[e.pid].alive), left = order.filter(q => mb.some(e => e.pid === q));
      if (FIN2 && left.length > 1 && left.every(a => left.every(b => allied(a, b)))) breakLastAlliance(left); // the final day: the last allies turn on each other
      else if (left.every(a => left.every(b => allied(a, b)))) { over = true; sd.winners = left; }
      else if (t >= tmax()) { over = true; const hp = q => mb.filter(e => e.pid === q).reduce((s, e) => s + e.hp, 0), best = left.slice().sort((a, b) => hp(b) - hp(a) || (a < b ? -1 : 1))[0]; sd.winners = [best]; }
    } else if (alive.length <= 1 || (!sdOn() && t >= TMAX)) over = true;
    if (opts.duel) { const sides = order.filter(pid => ents.some(e => !e.dead && e.pid === pid && e.kind !== "castle" && e.kind !== "totem")); if (sides.length <= 1 || t >= 90) { over = true; opts.duel.winner = sides.length === 1 ? sides[0] : null; opts.duel.t = t; opts.duel.hp = P[mePid].champ ? Math.max(0, P[mePid].champ.hp) / P[mePid].champ.maxhp : 0; } }
  }
  // ----- results -----
  const hpF = q => Math.round(Math.max(0, P[q].castle.hp) / P[q].castle.maxhp * 1e6);
  let alive = alivePlayers().sort((a, b) => FV ? (hpF(b) - hpF(a)) || ((P[b].castleDmg || 0) - (P[a].castleDmg || 0)) || (P[b].kills - P[a].kills) || (fairTie(seed, a, 0) - fairTie(seed, b, 0)) : P[b].castle.hp / P[b].castle.maxhp - P[a].castle.hp / P[a].castle.maxhp);
  if (sd && sd.winners && sd.winners.length) { alive = [...alive.filter(q => sd.winners.includes(q)), ...alive.filter(q => !sd.winners.includes(q))]; if (sd.winners.length > 1 && !teamWin) teamWin = sd.winners.slice(); }
  else if (t >= TMAX && alive.length > 1) log("Night falls. The strongest castle claims the banner.", "big");
  alive.forEach((pid, i) => { P[pid].place = i + 1; });
  if (BV) { // castles that fell on the same tick share the places they took between them: the one that dealt more siege damage, then killed more heroes, ranks higher; a seeded draw settles the rest (never seat order)
    const fell = {}; order.filter(pid => !P[pid].alive).forEach(pid => { (fell[P[pid].elimT] = fell[P[pid].elimT] || []).push(pid); });
    Object.values(fell).filter(g => g.length > 1).forEach(g => { const places = g.map(pid => P[pid].place).sort((a, b) => a - b);
      g.slice().sort((a, b) => ((P[b].castleDmg || 0) - (P[a].castleDmg || 0)) || (P[b].kills - P[a].kills) || (hash(seed, botSeed(a)) - hash(seed, botSeed(b))) || (a < b ? -1 : 1)).forEach((pid, i) => { P[pid].place = places[i]; }); });
  }
  // if the last castles fell on the same tick, the last one to fall takes first place
  let champion = alive[0] || order.find(pid => P[pid].place === 1) || order.slice().sort((x, y) => (P[y].elimT ?? 0) - (P[x].elimT ?? 0))[0];
  if (P[champion].place !== 1) P[champion].place = 1;
  if (teamWin) { teamWin = teamWin.filter(pid => P[pid].alive);
    if (teamWin.length > 1 && AV2) { // allies who win together share the top places, the one with the most castle health left first
      const hpf = pid => P[pid].castle.hp / P[pid].castle.maxhp;
      teamWin.sort((a, b) => (hpf(b) - hpf(a)) || (P[b].kills - P[a].kills) || (hash(seed, botSeed(a)) - hash(seed, botSeed(b))) || (a < b ? -1 : 1)).forEach((pid, i) => { P[pid].place = i + 1; });
      champion = teamWin[0]; }
    else if (teamWin.length > 1) teamWin.forEach(pid => { P[pid].place = 1; }); else teamWin = null; }
  if (teamWin) log(`${teamWin.map(nm).join(" and ")} win the Daily Siege together!`, "big");
  else log(`${nm(champion)} ${champion === mePid ? "win" : "wins"} the Daily Siege!`, "big");
  if (!fast) {
    order.forEach(pid => { const B = P[pid].burst || {}, ks = Object.keys(B).map(Number).sort((a, b) => a - b); let best = null;
      ks.forEach(k0 => { let s = 0, last = null; for (let k = k0; k < k0 + 6; k++) if (B[k]) { s += B[k][0]; last = B[k]; } if (!best || s > best.s) best = { s, k0, last }; });
      if (best && best.s >= BURST_MIN && !hl.some(h => h.kind === "spree" && h.pid === pid && Math.abs(h.t2 - best.k0 / 2) < 6))
        hl.push({ kind: "burst", pid, t: best.k0 / 2 + 1.5, dmg: Math.round(best.s), x: best.last[1], y: best.last[2], score: Math.min(80, 40 + best.s / 60) }); });
    const wc = P[champion].castle, frac = wc.hp / wc.maxhp;
    hl.push({ kind: "winner", pid: champion, team: teamWin, t, clutch: frac < .2 && frac > 0, timeout: t >= TMAX && !(sd && sd.winners), hpFrac: frac, x: wc.x, y: wc.y, score: 999 });
    hl.sort((a, b) => a.t - b.t);
  }
  for (let i = 0; i < 10; i++) { t = +(t + FRAME_DT).toFixed(2); record(); }
  ents.filter(e => e.kind === "champ" && e.gains < MING && e.heroLvl < maxLvl).forEach(e => { while (e.gains < MING && e.heroLvl < maxLvl) levelUp(e); }); // every hero earns at least two levels a day
  const treach = {}; treachery.forEach(([by, vic]) => { treach[by] = (treach[by] || 0) + 1; const take = Math.round(P[vic].gold * TREACHERY_LOOT); P[by].gold += take; P[vic].gold -= take; }); // the betrayer keeps a share of the victim's spoils for the day
  const W8 = PV ? (DAY_WEIGHT_PICK[opts.dayNo] || 1) : dayWeight(BV, opts.dayNo);
  const PLV2 = plans.some(p => p.placeV2), placeOf = pid => placePts(PLV2, P[pid].place, order.length); // placement points (see placePts)
  // survivor (plans stamped survV1): a lord whose hero is on its feet when the battle ends scores SURVIVOR_PTS more, castle standing or not
  const surv = pid => { const pl = plans.find(q => q.pid === pid), h = P[pid].champ; return !!(pl && pl.survV1 && h && !h.dead); };
  // the battle report's scoreboard (battles from 20 Nov): hero deaths, assists, and damage dealt in all, to heroes and to castles
  const BOARD2 = plans.some(p => p.skV2), board = pid => { const mine = ents.filter(e => e.pid === pid && e.tel && e.kind !== "castle"), sum = k => Math.round(mine.reduce((a, e) => a + (e.tel[k] || 0), 0));
    return { deaths: ents.filter(e => e.pid === pid && e.kind === "champ").reduce((a, e) => a + e.tel.deaths, 0), assists: P[pid].assists || 0, dmg: sum("dealt") + Math.round(P[pid].trapDmg || 0), dmgH: sum("toChamp"), dmgC: sum("toCastle") }; };
  const results = order.map(pid => ({ pid, name: nm(pid), color: P[pid].color, cls: P[pid].cls, place: P[pid].place, kills: P[pid].kills, ukills: P[pid].ukills, castles: P[pid].castles,
    points: Math.round((placeOf(pid) + P[pid].kills + castlePts(FV) * (P[pid].castles + (BETRAY_CASTLE_X - 1) * (P[pid].bcastles || 0))) * W8) + (treach[pid] || 0) * TREACHERY_PTS + (surv(pid) ? SURVIVOR_PTS : 0), ...(treach[pid] ? { treachery: treach[pid] } : {}), ...(P[pid].bcastles ? { bcastles: P[pid].bcastles } : {}), ...(P[pid].loneMax ? { lone: P[pid].loneMax } : {}), ...(surv(pid) ? { survivor: 1 } : {}), fellAt: P[pid].elimT, gold: Math.round(P[pid].gold), ...(BOARD2 ? board(pid) : {}) })).sort((a, b) => a.place - b.place);
  const TEL_COST = { footman: 50, bowman: 70, knight: 120, healer: 100, raider: 110, mage: 140, sniper: 160, ram: 240, cart: 200, catapult: 220 }; // telemetry keeps the prices from before 15 Nov 2026 so recorded battles replay identically
  const invest = (type, lvl) => { const c = TEL_COST[type] ?? UNITS[type].cost; let g = c; for (let l = 1; l < lvl; l++) g += Math.round(c * .5 * l); return g; };
  const tel = { duration: Math.min(t, SV ? SD_AT + SD_COUNT + SD_LEN : TMAX),
    players: order.map(pid => ({ pid, name: nm(pid), cls: P[pid].cls, level: P[pid].level || 1, place: P[pid].place, points: results.find(r => r.pid === pid).points, elimT: P[pid].elimT, trapDmg: Math.round(P[pid].trapDmg || 0) })),
    ents: ents.filter(e => (e.kind === "champ" || e.kind === "unit") && !e.militia && !e.free).map(e => ({ pid: e.pid, ref: e.ref || null, kind: e.kind, cls: e.cls, type: e.kind === "unit" ? e.key : null, lvl: e.lvl || null, gold: e.kind === "unit" ? invest(e.key, e.lvl || 1) : null,
      ranks: e.ranks || null, survived: !e.tel.deaths, ...e.tel })) };
  const awards = (() => { const per = {}; order.forEach(pid => per[pid] = { k: 0, d: 0 }); tel.ents.forEach(e => { if (per[e.pid]) { per[e.pid].k += e.kills || 0; per[e.pid].d += e.deaths || 0; } });
    const best = (fn) => order.slice().sort((a, c) => fn(c) - fn(a) || (P[a].place - P[c].place))[0], mv = best(pid => results.find(r => r.pid === pid).points + P[pid].kills * .01), mk = best(pid => per[pid].k), kd = best(pid => per[pid].k / Math.max(1, per[pid].d)), sp = best(pid => P[pid].gold);
    return { mvp: { pid: mv, pts: results.find(r => r.pid === mv).points }, kills: { pid: mk, n: per[mk].k }, kd: { pid: kd, v: +(per[kd].k / Math.max(1, per[kd].d)).toFixed(1) }, spoils: { pid: sp, g: Math.round(P[sp].gold) } }; })();
  // hero progress for the week: levels gained today (capped), and the experience carried into tomorrow
  const lvlOut = {}; ents.filter(e => e.kind === "champ").forEach(e => { lvlOut[e.pid] = { from: e.lvl0, gain: e.gains, xp: Math.max(0, Math.min(Math.round(e.xp), xpNeedX(e.heroLvl) - 1)) }; });
  const pairsEnd = BV ? (finalDay ? [] : pact0.filter(k => !feudsNew.has(k))) // pacts last until a betrayal or a break ends them, even if a castle fell
    : []; if (!BV) order.forEach(a => order.forEach(b => { if (a < b && P[a].alive && P[b].alive && P[a].pacts.has(b)) pairsEnd.push(a + "|" + b); }));
  const trapsUsed = traps.filter(tr => tr.used && !tr.ranger).map(tr => tr.pid + "|" + Math.round(tr.y - .5) + "," + Math.round(tr.x - .5));
  order.forEach(pid => { const c = P[pid].castle; st(pid).castleEnd = c && c.maxhp ? Math.max(0, c.hp) / c.maxhp : 0; });
  return { stats: ST, twist: TW, ...(lastAlly ? { lastAlly } : {}), ...(LV2 ? { lvlV2: true } : {}), ...(sdOn() ? { sudden: { t0: sd.t0, go: sd.go, ...(SD2 ? { r: sd.r } : {}) } } : {}), ...(V3 && !opts.duel ? { waves: true, ...(plans.some(p => p.waveV2) ? { waveV2: true, ...(BV5 ? { waveGap: WAVE_GAP_V5 } : {}), ...(order.some(pid => (P[pid].waves || []).some(w => w.rush === false)) ? { waveRushOff: Object.fromEntries(order.map(pid => [pid, (P[pid].waves || []).map((w, i) => (w.rush === false ? i : -1)).filter(i => i >= 0)]).filter(([, a]) => a.length)) } : {}) } : {}) } : {}), me: mePid, feudsNew: [...feudsNew], trapsUsed, awards, ultCast: order.filter(pid => P[pid].ultCast), lvl: lvlOut, rapierEnd: rapierOwner ? rapierHolder : null, rapier: rapierOwner && rapierHolder && rapierHolder !== rapierOwner ? { from: rapierOwner, to: rapierHolder } : null, pairsEnd, pacts0: pact0, team: teamWin, wallMeta: walls.map(w => ({ pid: w.pid, x: w.x0, y: w.y0, dir: w.dir, maxhp: w.maxhp, tier: w.tier, ...(w.born != null ? { born: w.born } : {}) })), tel, frames, events, cdlog, xplog, logs, hl, ranks: RANKS, meta: meta(), results, order, colors: Object.fromEntries(order.map(p => [p, P[p].color])), traps, duration: t };
}
