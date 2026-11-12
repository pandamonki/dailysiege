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
// Keep it after the day this reaches the live game, or battles already fought under the V2 rules would change when replayed.
const BAL_V3_FROM = "2026-11-14", balV3For = d => String(d) >= BAL_V3_FROM;
const BLOC_MAX = 3, TREACHERY_PTS = 3, TREACHERY_LOOT = .25, DAY_WEIGHT = { 5: 1.5, 6: 1.5, 7: 2 };
// A lord whose castle falls keeps their hero and soldiers on the field: they fight on to the end of the battle, but can no longer fall back, heal at the castle, teleport home or respawn. Placing is still decided by when the castle fell.
const ORPHAN_ARMIES = true;
const dayWeight = (v2, dayNo) => (v2 && DAY_WEIGHT[dayNo]) || 1;
function runBattle(plans, seed, opts = {}) {
  const BV = !!opts.balV2, V3 = !!opts.balV3, HV3 = !!opts.heroV3, maxLvl = HV3 ? MAX_HERO_LVL_V3 : MAX_HERO_LVL, hpLvX = HV3 ? hpLvV3 : hpLv, atkLvX = HV3 ? atkLvV3 : atkLv, OA = !!opts.balV2 && ORPHAN_ARMIES, UV = !!opts.ultV2, UD = UV ? .75 : 1, UR = rk => UV ? [.7, .85, 1][Math.min(3, Math.max(1, rk || 1)) - 1] : 1;
  const rng = mulberry(seed), DT = .1, fast = !!opts.fast, leaderPid = (plans.find(p => p.leader) || {}).pid;
  let curAb = null;
  const mePid = (plans.find(p => p.me) || plans[0]).pid, NN = opts.N || N;
  let t = 0, tick = 0, over = false, anyUlt = false;
  const ents = [], events = [], logs = [], frames = [], pending = [], traps = [], walls = [];
  let ctrHolder = null, teamWin = null; const finalDay = !!opts.finalDay;
  const P = {}, order = plans.map(p => p.pid), idx = Object.fromEntries(order.map((p, i) => [p, i]));
  const d = (a, b) => hyp(a.x - b.x, a.y - b.y);
  const fxv = (e, k) => (e.fx[k] && e.fx[k].until > t ? e.fx[k].val : 0);
  const setFx = (e, k, dur, val = 1) => { if ((e.cart || e.ram) && (k === "slow" || k === "frozen" || (V3 && (k === "stun" || (k === "root" && !HV3))))) return; /* siege engines can't be slowed, and from 12 Nov 2026 can't be stunned or rooted either */ if (P[e.pid] && P[e.pid].frenzy && e.kind !== "castle" && (k === "stun" || k === "root" || k === "slow" || k === "frozen" || k === "silence" || k === "fear")) return; if (e.fx.ccimm && e.fx.ccimm.until > t && e.kind !== "castle" && (k === "stun" || k === "root" || k === "slow" || k === "frozen" || k === "taunt" || k === "silence" || k === "fear")) return; if (e.ccShort && (k === "slow" || k === "root")) dur *= 1 - e.ccShort; if (e.will && (k === "stun" || k === "root")) dur *= .4; if (!e.fx[k] || e.fx[k].until < t + dur || e.fx[k].val < val) e.fx[k] = { until: t + dur, val }; };
  const allied = (a, b) => a === b || P[a].pacts.has(b);
  const hostile = (a, b) => !allied(a, b);
  const ev = o => { if (fast) return; o.t = t; events.push(o); };
  const atkEv = (e, o, k) => ev({ ty: "atk", id: e.id, k, dx: o.x - e.x, dy: o.y - e.y });
  const SHOT_STYLE = { bowman: "arrow", centaur: "arrow", archer: "arrow", sniper: "bullet", mage: "orb", shaman: "spirit", healer: "heal", necro: "bone" }; // each ranged unit gets its own projectile in the replay
  const shot = (a, b, c, w = 1, st) => ev({ ty: "shot", x1: a.x, y1: a.y - .35, x2: b.x, y2: b.y - .35, c, w, ...(st ? { sk: st, sc: a.kind === "champ" ? 1.4 : 1 } : {}) });
  const slash = (b, c = "#fff") => ev({ ty: "slash", x: b.x, y: b.y - .35, c });
  const aoe = (x, y, r, c, dur = .6) => ev({ ty: "aoe", x, y, r, c, dur });
  const txt = (e, s, c) => ev({ ty: "txt", x: e.x, y: e.y - 1.1, s: String(s), c });
  const log = (msg, kind = "") => logs.push({ t, msg, kind });
  // highlights: structured key moments the reel and recap are built from
  const hl = [], RANKS = opts.ranks || {}, nP = plans.length;
  const top3 = pid => RANKS[pid] != null && RANKS[pid] <= 3;
  const under = pid => RANKS[pid] != null && RANKS[pid] > Math.max(3, Math.ceil(nP / 2));
  const H = o => { if (!fast) hl.push({ t, ...o }); return o; };
  const champOf = pid => ents.find(e => e.pid === pid && e.kind === "champ");
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
  const friendsNear = (pid, x, y, r) => ents.filter(o => !o.dead && o.kind !== "castle" && allied(pid, o.pid) && hyp(o.x - x, o.y - y) <= r);
  const minBy = (arr, f) => arr.reduce((b, o) => (b === null || f(o) < f(b) ? o : b), null);
  // a hidden unit can be seen by a viewer standing within its reveal radius if it is only in stealth (skill-tree Rogues); a fully vanished one never can
  const vis = (o, v) => !fxv(o, "vanish") || !!(o.stealth && hyp(o.x - v.x, o.y - v.y) <= (o.revealR || 1));

  function add(o) { Object.assign(o, { id: ents.length, fx: {}, dots: [], atkT: rng() * .8, tgt: null, rt: 0, dead: false, hitT: -9, tel: { dealt: 0, toChamp: 0, toUnit: 0, toCastle: 0, taken: 0, healed: 0, kills: 0, deaths: 0, diedAt: null, ab: {} } }); ents.push(o); return o; }
  const abRec = (e, name) => e.tel.ab[name] || (e.tel.ab[name] = { casts: 0, dmg: 0, heal: 0 });
  const abName = (e, k) => (k === "a4" ? "Vigour" : k === "ult" ? CLASSES[e.cls].ult.name : CLASSES[e.cls].abilities.find(a => a.key === k).name);
  const DOT_AB = { burn: "Fireball", bleed: "Cleave", fire: "Volley", poison: "Poison Blade", orb: "Orb of Venom" };
  // skill-tree heroes (battles with opts.heroV3): all their skills live in sim/heroTrees.js, which reaches the battle through these hooks
  const kit = HV3 ? makeTreeKit({ ents, DT, d, fxv, setFx, deal, heal, enemiesNear, friendsNear, minBy, ev, aoe, shot, slash, txt, add, pending, walls, traps, P, order, rng, NN, allied, hostile, log,
    t: () => t, tickN: n => tick % n === 0, tickNo: () => tick, getAb: () => curAb, setAb: v => { curAb = v; }, abRec, atkEv, vis, fighting, kill: (e, s) => kill(e, s), blink: (e, x, y) => blink(e, x, y), wallAt: (e, x, y) => wallAt(e, x, y), addDot: (a, b, c, d2, k) => addDot(a, b, c, d2, k),
    poss: pid => poss(pid), isBounty: pid => !!RANKS[pid] && RANKS[pid] <= 3, onUlt: (e, name) => { P[e.pid].ultCast = true; anyUlt = true; if (!hl.some(h => h.kind === "ult" && h.pid === e.pid && h.t === t)) H({ kind: "ult", ab: name, gen: 1, pid: e.pid, x: e.x, y: e.y, score: 50 }); } }) : null;
  // one soldier of a lord's, from a plan piece: used for the army at the start and for reinforcement waves
  function makeUnit(pl, pc, x, y) {
    const g = pl.gear || {}, base = UNITS[pc.type], s = UNIT_SIM[pc.type], isCart = pc.type === "cart", fixed = isCart || !!base.merc, m = fixed ? 1 : 1 + UNIT_LVL_GAIN * (pc.lvl - 1), gm = fixed ? 1 : 1 + .15 * (g.armour || 0), ga = fixed ? 1 : 1 + .15 * (g.weapon || 0);
    const e = add({ order: pc.order || "army", pid: pl.pid, kind: "unit", key: pc.type, lvl: pc.lvl, ref: pc.id || null, x, y, maxhp: base.hp * m * gm, atk: base.atk * m * ga, cart: isCart, ram: pc.type === "ram" || !!s.rammer, merc: !!base.merc, regen: s.regen || 0, hunter: !!s.hunter, dmgRed: fixed ? 0 : [0, 0, .1, .2][g.armour || 0], lifesteal: s.lifesteal || (!fixed && (g.weapon || 0) >= 3 ? .1 : 0), range: s.range, as: s.as, spd: s.spd, armor: s.armor, shot: s.shot, siege: s.siege, splash: s.splash || 0, healer: s.heal ? s.heal * m : 0 });
    e.hp = e.maxhp * (pc.hp ?? 1); [e.atype, e.armour] = UNIT_TYPES[pc.type];
    return e;
  }
  // a wave marches out of the castle gate
  function deployWave(p, i) {
    const w = p.waves[i], c = p.castle, dx = NN / 2 - c.x, dy = NN / 2 - c.y, L = hyp(dx, dy) || 1, px = -dy / L, py = dx / L, n = w.units.length;
    w.done = true; p.lastWave = t;
    w.units.forEach((u, j) => { const o = (j - (n - 1) / 2) * .45, e = makeUnit(p, { ...u, kind: "unit" }, c.x + dx / L * .9 + px * o, c.y + dy / L * .9 + py * o);
      e.hx = e.x; e.hy = e.y; e.spd *= BAL.move; e.as *= BAL.swing; e.retreats = 1; e.wave = i + 1; if (p.noRetreat) e.noRetreat = true; });
    ev({ ty: "wave", pid: p.pid, i, n: p.waves.filter(x => x.done).length });
    log(`${poss(p.pid)} reinforcements march out of the castle.`, p.pid === mePid ? "you" : undefined);
  }
  // ----- set up players and armies -----
  plans.forEach(pl => {
    P[pl.pid] = { ...pl, stance: STANCE_FIX[pl.stance] || pl.stance, bombs: (pl.bombs || []).map(b => ({ ...b })), alive: true, place: 0, kills: 0, ukills: 0, castles: 0, gold: 0, fired: new Set(), retreat: false, defendAll: false, focusLeader: false, helpPid: null, helpUntil: 0,
      targets: (pl.targets || []).slice(), fallbackUntil: 0, hitT: -9, castleHitT: -9, castleHitBy: null, trapT: -9, pacts: new Set(), hostileTo: new Set(pl.hostile), revenge: new Set(), feud: new Set(), bell: false, retreatT: -99, elimT: null };
  });
  plans.forEach(pl => pl.pacts.forEach(o => { if (P[o]) { P[pl.pid].pacts.add(o); P[o].pacts.add(pl.pid); } }));
  (plans.feuds || []).forEach(k => { const [a, b] = k.split("|"); if (P[a] && P[b]) { P[a].feud.add(b); P[b].feud.add(a); P[a].hostileTo.add(b); P[b].hostileTo.add(a); P[a].pacts.delete(b); P[b].pacts.delete(a); } }); // betrayers and their victims stay rivals for the rest of the war
  const pact0 = []; order.forEach(a => order.forEach(b => { if (a < b && P[a].pacts.has(b)) pact0.push(a + "|" + b); })); // the pacts the day starts with, after bad blood has dissolved any between feuding lords
  plans.forEach(pl => {
    const p = P[pl.pid], [cr, cc] = pl.castle, def = pl.defences || {};
    p.castle = add({ pid: pl.pid, kind: "castle", x: cc + .5, y: cr + .5, maxhp: BAL.castleHp * (1 + .25 * (def.walls || 0)) * CASTLE_TIERS[Math.max(0, Math.min(2, (pl.castleTier || 1) - 1))].hp, atk: 20 * [1, 1.5, 2][def.tower || 0], range: (def.tower || 0) >= 2 ? 3.6 : 3, as: 1.5, spd: 0, armor: .25, shot: "#e8e2d0" });
    p.castle.hp = p.castle.maxhp; p.castle.atype = "pierce"; p.castle.armour = "fortified";
    const lvl = pl.level || 1, g = pl.gear || {};
    pl.pieces.forEach(pc => {
      if (pc.kind === "champ") {
        const b = HV3 ? CHAMP_V3[pl.cls] : CHAMP[pl.cls], hpMul = HV3 ? hpLvV3(lvl) : (1 + .08 * (lvl - 1)) * vigMul(pl.ranks.a4), atkMul = HV3 ? atkLvV3(lvl) : (1 + .06 * (lvl - 1)) * vigMul(pl.ranks.a4);
        const e = add({ order: pc.order || "army", pid: pl.pid, kind: "champ", cls: pl.cls, key: "c-" + pl.cls, x: pc.c + .5, y: pc.r + .5, maxhp: b.hp * hpMul, atk: b.atk * atkMul, range: b.range, as: b.as,
          spd: b.spd * ((g.charm || 0) >= 1 ? 1.15 : 1), armor: b.armor,
          cdMul: (g.charm || 0) >= 2 ? .8 : 1, phoenix: (g.charm || 0) >= 3, respawns: opts.duel ? 0 : 2, shot: b.shot, ranks: { ...pl.ranks }, ranks0: { ...pl.ranks }, picks: pl.picks, triggers: pl.triggers, cds: {} });
        e.hp = e.maxhp; if (!HV3) { ["a1", "a2", "a3"].forEach(k => e.cds[k] = 2 + rng() * 3); e.cds.ult = 10 + rng() * 8; }
        e.ultArm = pl.ultArm !== false; e.heroLvl = lvl; e.lvl0 = lvl; e.xp = pl.xp0 || 0; e.gains = 0;
        const its = new Set(pl.items || []); e.itemSet = its; if (its.has("rapier")) { e.rapier = true; rapierOwner = rapierHolder = pl.pid; }
        if (its.has("boots")) e.spd *= 1.1; if (its.has("gauntlets")) e.atk *= 1.15; if (its.has("ringprot")) e.dmgRed = (e.dmgRed || 0) + .08;
        if (its.has("fang")) e.lifesteal = (e.lifesteal || 0) + .12; if (its.has("thornmail")) e.thorns = .15; if (its.has("talisman")) e.will = true;
        e.cons = ["salve", "elixir", "net", "scroll"].filter(k => its.has(k)).map(k => ({ k, ready: 0 }));
        if (!HV3 && pl.cls === "archer" && pl.ranks.a3) { e.evade = ext([.1, .18, .25], pl.ranks.a3); e.counter = pl.picks.a3 === "Counter"; e.kite = pl.picks.a3 === "Kite"; }
        if (!HV3 && pl.cls === "rogue" && pl.ranks.a3) e.poison = { dps: ext([7, 10, 13], pl.ranks.a3), venom: pl.picks.a3 === "Venom", weaken: pl.picks.a3 === "Weaken" };
        [e.atype, e.armour] = CLASS_TYPES[pl.cls];
        if (HV3) { kit.setup(e, pl); e.hp = e.maxhp; }
        p.champ = e;
      } else if (pc.kind === "unit") {
        makeUnit(pl, pc, pc.c + .5, pc.r + .5);
      } else if (pc.kind === "wall") {
        const tier = Math.max(1, Math.min(3, pl.castleTier || 1));
        wallTiles(pc.r, pc.c, pc.dir).forEach(([r, c]) => { if (r >= 0 && c >= 0 && r < NN && c < NN) walls.push({ id: walls.length, pid: pl.pid, x0: c, y0: r, dir: pc.dir === "v" ? "v" : "h", hp: WALL_TIERS[tier - 1].hp, maxhp: WALL_TIERS[tier - 1].hp, tier }); });
      } else if (pc.kind === "trap") {
        if (!TRAPS[pc.type]) return;
        traps.push({ pid: pl.pid, type: pc.type, x: pc.c + .5, y: pc.r + .5, used: false });
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
    atk: e.atk, range: e.range, as: e.as, spd: e.spd, armor: Math.min(.8, (e.armor || 0) + (e.dmgRed || 0)), atype: e.atype || null, armour: e.armour || null,
    lvl: e.kind === "champ" ? (e.lvl0 || 1) : (e.lvl || null), lvlTo: e.kind === "champ" ? e.heroLvl : null, items: e.itemSet ? [...e.itemSet] : null, cls: e.cls || null, ranks: e.ranks0 || e.ranks || null, tree: e.tr0 || null, picks: e.picks || null, evade: e.evade || 0,
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
    if (h.gains >= XP_CAP) return; // a hero never gains more than 3 levels in one day, from any source
    const L0 = h.heroLvl; h.heroLvl++; h.gains++;
    const oh = h.maxhp; h.maxhp *= hpLvX(h.heroLvl) / hpLvX(L0); h.hp += h.maxhp - oh; h.atk *= atkLvX(h.heroLvl) / atkLvX(L0);
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
    while (h.xp >= xpNeed(h.heroLvl)) { if (h.heroLvl >= maxLvl) { h.xp = 0; break; } if (h.gains >= XP_CAP) { h.xp = xpNeed(h.heroLvl) - 1; break; } h.xp -= xpNeed(h.heroLvl); levelUp(h); }
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
    { const kh = champOf(kc.pid); if (kh && live(kh) && inCentre(kh.x, kh.y)) g *= CTR_BONUS; }
    g = Math.round(g); P[kc.pid].gold += g;
    if (v.kind === "champ" || v.kind === "castle") txt(kc, `+${g}g`, "#f3d27a");
  }
  function centreTick() {
    const near = ents.filter(e => !e.dead && (e.kind === "champ" || e.kind === "unit") && fighting(e.pid) && inCentre(e.x, e.y));
    const pids = [...new Set(near.map(e => e.pid))], hold = pids.length && pids.every(a => pids.every(b => allied(a, b))) ? pids : [];
    hold.forEach(pid => { P[pid].gold += 2; const h = champOf(pid); if (h && live(h) && inCentre(h.x, h.y)) giveXp(h, top3(pid) ? 2.5 : 3); });
    ctrHolder = hold.length ? hold[0] : null;
  }
  function itemTick(e) {
    const s = e.itemSet; if (!s || !s.size) return; const p = P[e.pid];
    if (tick % 10 === 0) {
      if (s.has("banner")) friendsNear(e.pid, e.x, e.y, 3).forEach(o => setFx(o, "atkbuf", 1.3, .12));
      if (s.has("standard")) friendsNear(e.pid, e.x, e.y, 3).forEach(o => setFx(o, "guard", 1.3, .12));
      if (s.has("mender")) friendsNear(e.pid, e.x, e.y, 3).forEach(o => { if (o.hp < o.maxhp) heal(o, 4, true, e, "Mender's Charm"); });
    }
    (e.cons || []).forEach(c => {
      if (t < c.ready) return;
      if (c.k === "salve" && e.hp / e.maxhp < .5) { c.ready = t + ITEMS[c.k].cd; heal(e, e.maxhp * .35, false, e, "Healing Salve"); txt(e, "Salve", "#9cf09c"); }
      else if (c.k === "elixir" && live(e.tgt) && d(e, e.tgt) <= e.range + 1) { c.ready = t + ITEMS[c.k].cd; setFx(e, "asbuf", 8, .25); txt(e, "Fury!", "#ff8a7a"); }
      else if (c.k === "net") { const v = minBy(enemiesNear(e, e.x, e.y, 4).filter(x => x.kind === "champ"), x => d(x, e)); if (v) { c.ready = t + ITEMS[c.k].cd; setFx(v, "root", 2.5); shot(e, v, "#c9a46a", 2); txt(v, "Netted", "#e8cf9a"); } }
      else if (c.k === "scroll" && !e.orphan && e.hp / e.maxhp < .3 && enemiesNear(e, e.x, e.y, 3).length) { c.ready = t + ITEMS[c.k].cd; aoe(e.x, e.y, .8, "#b48cff", .5); e.x = p.castle.x; e.y = p.castle.y - 1; e.tgt = null; aoe(e.x, e.y, .8, "#b48cff", .5); heal(e, e.maxhp * .2, false, e, "Scroll of Retreat"); txt(e, "Retreat", "#d6c2ff"); }
    });
  }
  // fences: soldiers can't walk through an enemy wall. They slide round it, and hack through if they get stuck
  const wallAt = (e, x, y) => { for (const w of walls) { if (w.hp <= 0 || !hostile(e.pid, w.pid)) continue; const lx = w.dir === "v" ? .3 : .72, ly = w.dir === "v" ? .72 : .3; if (Math.abs(x - w.x0 - .5) < lx && Math.abs(y - w.y0 - .5) < ly) return w; } return null; };
  const nearestWall = e => minBy(walls.filter(w => w.hp > 0 && hostile(e.pid, w.pid) && hyp(w.x0 + .5 - e.x, w.y0 + .5 - e.y) <= 2), w => hyp(w.x0 + .5 - e.x, w.y0 + .5 - e.y));
  function hitWall(e, w) {
    const wx = w.x0 + .5, wy = w.y0 + .5; w.hp -= e.atk * (1 + fxv(e, "atkbuf")) * TYPE_TABLE[e.atype || "blade"].fortified * (e.key === "raider" ? 1.4 : 1) * (HV3 ? kit.wallMul(e) : 1);
    ev({ ty: "slash", x: wx, y: wy, c: "#d9c9a0" });
    if (w.hp <= 0) { w.hp = 0; aoe(wx, wy, .9, "#a08050", .6); }
  }

  // ----- combat core -----
  function heal(e, amt, quiet, src, ab) { if (e.dead || e.kind === "castle") return; if (HV3 && e.fx.grievous && e.fx.grievous.until > t) amt *= 1 - e.fx.grievous.val; const before = e.hp; e.hp = Math.min(e.maxhp, e.hp + amt);
    const got = e.hp - before, c = src && (src.owner || src);
    if (c && got > 0) { const label = ab || curAb || (src.kind === "totem" ? "Healing Totem" : src.healer ? "Heal" : "Other"); c.tel.healed += got; abRec(c, label).heal += got; } if (!quiet && e.hp - before >= 1) txt(e, "+" + Math.round(e.hp - before), "#7ef08a"); }
  function deal(src, tgt, amt, o = {}) {
    if (!live(tgt)) return 0;
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
      if (src.rapier) m *= 2;
      if (P[src.pid].frenzy && src.kind !== "castle") m *= 1.2; // Desperation Frenzy // Divine Rapier: double hero damage
      m *= 1 + fxv(src, "atkbuf");
      if (fxv(src, "weaken")) m *= .8;
      if (P[src.pid].feud.has(tgt.pid)) m *= 1.2;
      if (leaderPid && tgt.pid === leaderPid && src.pid !== leaderPid) m *= 1.1;
    }
    if (t >= SUDDEN) m *= 1.25;
    // attack type against armour type (the only matchup rule)
    m *= TYPE_TABLE[o.atype || (src && src.atype) || "pure"][tgt.armour || "medium"];
    if (src && (src.kind === "unit" || src.kind === "summon") && tgt.kind === "champ") m *= HERO_GUARD;
    // the Rogue's one class trait: finishing blows
    if (src && src.cls === "rogue" && tgt.kind !== "castle" && !o.noFinish && tgt.hp / tgt.maxhp < FINISH_AT) m *= FINISH_BONUS;
    if (HV3) { m *= kit.mul(src, tgt, o, o.atype || (src && src.atype) || "pure"); if (o.critMul) m *= o.critMul; }
    m *= 1 - Math.min(.8, tgt.armor * (1 - (o.pierce || 0)) + (tgt.dmgRed || 0) * (1 - (o.pierce || 0)));
    const wall = fxv(tgt, "wall");
    if (wall) { const blocked = amt * m * wall; m *= 1 - wall; if (tgt.reflect && live(src) && !o.reflected) deal(tgt, src, blocked * .2, { aoe: 1, reflected: 1, ab: "Shield Wall" }); }
    m *= 1 + fxv(tgt, "vuln"); m *= 1 - fxv(tgt, "guard");
    let dmg = Math.max(1, amt * m);
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
      if (tgt.kind === "castle" && P[credit.pid] && credit.pid !== tgt.pid) P[credit.pid].castleDmg = (P[credit.pid].castleDmg || 0) + eff;
      if (tgt.kind === "champ") credit.tel.toChamp += eff; else if (tgt.kind === "castle") credit.tel.toCastle += eff; else credit.tel.toUnit += eff;
    } else if (o.trapPid) P[o.trapPid].trapDmg = (P[o.trapPid].trapDmg || 0) + eff;
    const tp = P[tgt.pid]; tp.hitT = t;
    if (src) {
      tgt.lastBy = src.pid;
      if (tgt.kind === "castle") { tp.castleHitT = t; tp.castleHitBy = src.pid; }
      const ls = (src.lifesteal || 0) + (P[src.pid].blessing === "vamp" && src.kind !== "castle" ? .15 : 0) + fxv(src, "lsbuf") + (src.cls === "rogue" && src.kind === "champ" ? .12 : 0); if (ls) heal(src, dmg * ls, true, src, "Lifesteal");
      // betrayal trigger: an ally hitting the target I'm fighting
      order.forEach(pid => { const b = P[pid].betray && P[pid].betray[src.pid]; if (b === "When they attack my target" && P[pid].pacts.has(src.pid) && ents.some(e => !e.dead && e.pid === pid && e.tgt === tgt)) P[pid].stolenT = t; });
    }
    if (o.big) txt(tgt, Math.round(dmg), o.crit ? "#ffd54a" : "#fff");
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
    const kc = src && (src.owner || src); if (kc && kc.pid !== e.pid && e.kind !== "totem" && e.kind !== "castle") { kc.tel.kills++; if (e.kind !== "champ" && P[kc.pid]) P[kc.pid].ukills++; }
    if (!opts.duel) { awardXp(e); awardGold(e, kc); if ((e.kind === "champ" || e.kind === "castle") && kc && kc.pid !== e.pid && RANKS[e.pid] && RANKS[e.pid] <= 3 && hostile(kc.pid, e.pid)) { const kh = champOf(kc.pid); if (kh) giveXp(kh, bountyGold(RANKS[e.pid], e.kind === "champ" ? e.heroLvl : (champOf(e.pid) || {}).heroLvl) * .8); } }
    if (src && src.pid !== e.pid && e.kind === "champ") { P[src.pid].kills++; log(`${nm(src.pid)} slew ${lposs(e.pid)} hero.`);
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
    if (e.kind === "champ" && P[e.pid].alive && e.respawns > 0) { e.respawns--; const rt = respawnTime(e.heroLvl) * (e.phoenix ? .5 : 1); e.respawnAt = t + rt; const c = P[e.pid].castle; ev({ ty: "respawn", pid: e.pid, id: e.id, x: c.x, y: c.y, t0: t, t1: t + rt }); }
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
    if (by) P[by].castles++;
    order.forEach(o => { P[o].pacts.delete(pid); });
    log(`${poss(pid)} castle has fallen${by ? ` to ${nm(by)}` : ""}.`, "big");
    { const revenge = by && hl.some(h => (h.kind === "betray" || h.kind === "bomb") && h.pid === pid && h.other === by);
      const upset = by && top3(pid) && under(by);
      H({ kind: revenge ? "revenge" : upset ? "upset" : "fall", pid, other: by, rank: RANKS[pid] ?? null, x: p.castle.x, y: p.castle.y,
        score: revenge ? 88 : upset ? 92 : top3(pid) ? 70 + (4 - RANKS[pid]) * 3 : 30 }); }
    aoe(p.castle.x, p.castle.y - .3, 1.6, "#ff9a3c", 1.2);
  }
  const feudsNew = new Set();
  const treachery = []; // bombs that went off: [betrayer, victim]
  function betray(pid, target, quiet) {
    if (!P[pid].pacts.has(target)) return;
    { const kc = P[target].castle; if (!P[target].alive || !kc || kc.hp <= 0) return; } // keep already destroyed: nothing to betray
    P[pid].pacts.delete(target); P[target].pacts.delete(pid);
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
      else if (rule === "Enemy siege weapons") pool = c.filter(o => o.kind === "unit" && (o.key === "ram" || o.key === "cart"));
      else if (PRIO_UNIT[rule]) pool = c.filter(o => o.kind === "unit" && o.key === PRIO_UNIT[rule]);
      else if (rule === "Whoever hit my castle" && p.castleHitBy && t - p.castleHitT < 15) pool = c.filter(o => o.pid === p.castleHitBy);
      else if (rule === "The leader (bounty)" && leaderPid) pool = c.filter(o => o.pid === leaderPid);
      if (pool && pool.length) return minBy(pool, o => d(o, e));
    }
    return minBy(c, o => d(o, e));
  }
  // target modes decide the order of the hostile list when the battle starts
  function sortTargets(p) {
    const mode = p.tmode; if (!mode || mode === "list" || !p.targets.length) return;
    const rk = q => (P[q].rank != null ? P[q].rank : order.indexOf(q) + 1), my = rk(p.pid), hero = q => ents.find(o => o.kind === "champ" && o.pid === q);
    const key = { highest: q => rk(q), lowest: q => -rk(q), above: q => Math.abs(rk(q) - (my - 1)) + (rk(q) < my ? 0 : .5), below: q => Math.abs(rk(q) - (my + 1)) + (rk(q) > my ? 0 : .5),
      weakcastle: q => P[q].castle.maxhp, toplevel: q => -(P[q].level || 1), weakhero: q => { const h = hero(q); return h ? h.maxhp : 1e9; }, closest: q => d(P[q].castle, p.castle) }[mode];
    if (key) p.targets = p.targets.slice().sort((a, b) => key(a) - key(b) || order.indexOf(a) - order.indexOf(b));
  }
  function goalPid(e) {
    const p = P[e.pid], ok = q => !!q && !!P[q] && P[q].alive && q !== e.pid && hostile(e.pid, q);
    if (ok(e.order)) return e.order;
    const rev = [...p.revenge].find(ok); if (rev) return rev;
    if (p.helpPid && t < p.helpUntil && P[p.helpPid] && P[p.helpPid].alive && ok(P[p.helpPid].castleHitBy)) return P[p.helpPid].castleHitBy;
    if (!p.sorted) { p.sorted = true; sortTargets(p); }
    const listed = p.targets.find(ok); if (listed) return listed;
    // nobody left on the hostile list: the army still has to fight, so it marches on the nearest non-allied castle
    return minBy(order.filter(ok), q => d(P[q].castle, p.castle));
  }
  // Targeting priorities by kind of fighter (from 12 Nov 2026; the plan's gprio = { hero, melee, ranged, heal }, and engage = reach in tiles).
  // Each list is walked in order and picks the first kind with an enemy within reach: "hero", "melee", "ranged", "healer", "siege" (nearest of that kind),
  // "any" (nearest soldier), "lowhp" (the weakest soldier or hero in reach). "castle" marches on the castle of the lord the army is headed for (used by tests).
  const soldier = o => o.kind === "unit" || o.kind === "summon";
  const catOf = o => o.kind === "champ" ? "hero" : !soldier(o) ? null : o.healer ? "healer" : (o.cart || o.ram) ? "siege" : (o.range || 1.1) > 1.5 ? "ranged" : "melee";
  const grpOf = e => e.kind === "champ" ? "hero" : (e.range || 1.1) > 1.5 ? "ranged" : "melee"; // a cleric's own attacks follow the ranged list
  function groupPick(e) {
    const list = P[e.pid].gprio[grpOf(e)]; if (!list) return null;
    for (const cat of list) {
      if (cat === "castle") { const g = goalPid(e), c = g && ents.find(o => !o.dead && o.kind === "castle" && o.pid === g); if (c) return c; continue; }
      const reach = P[e.pid].engage || ENGAGE, pool = ents.filter(o => !o.dead && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e) && d(o, e) <= reach && (cat === "any" ? soldier(o) : cat === "lowhp" ? (soldier(o) || o.kind === "champ") : catOf(o) === cat));
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
    if (e.hunter) { const hs = ents.filter(x => !x.dead && x.kind === "champ" && hostile(e.pid, x.pid) && vis(x, e)); if (hs.length) return minBy(hs, x => d(x, e)); }
    const p = P[e.pid], guard = e.order === "guard", escort = e.order === "escort" && live(p.champ);
    if (!e.cart && !e.ram && ((UNIT_TYPES[e.key] || [])[0] !== "siege" || e.order === "guard")) { const carts = ents.filter(o => o.cart && !o.dead && hostile(e.pid, o.pid) && ents.some(c => c.kind === "castle" && !c.dead && !hostile(e.pid, c.pid) && d(c, o) <= 4) && d(o, e) <= 9); if (carts.length) return minBy(carts, o => d(o, e)); } // a powder cart within 4 tiles of a friendly castle: stop it
    // raiders (from 12 Nov 2026) make for a castle: struck by a melee fighter they turn and fight it, struck from range they keep going
    if (V3 && e.key === "raider" && !guard && !escort) { const ag = e.aggro; if (ag && ag.until > t && live(ag.src) && hostile(e.pid, ag.src.pid) && vis(ag.src, e) && (ag.src.range || 1.1) <= 1.5 && d(ag.src, e) <= 6) return ag.src;
      const g = goalPid(e), c = g && ents.find(o => !o.dead && o.kind === "castle" && o.pid === g); if (c) return c; }
    // aggression: answer whoever just struck you or a friend nearby
    if (e.aggro && e.aggro.until > t && live(e.aggro.src) && hostile(e.pid, e.aggro.src.pid) && vis(e.aggro.src, e) && d(e.aggro.src, e) <= 6 && (!guard || d(e.aggro.src, p.castle) <= 8)) return e.aggro.src;
    // pursuit: stay on a target that is fleeing or badly hurt, unless it has escaped far away
    const cur = e.tgt;
    if (live(cur) && cur.kind !== "castle" && hostile(e.pid, cur.pid) && vis(cur, e) && (cur.retreating || cur.hp / cur.maxhp < .35) && d(cur, e) <= (guard ? 4.5 : 7)) return cur;
    const runners = ents.filter(o => !o.dead && o.retreating && o.kind !== "castle" && hostile(e.pid, o.pid) && vis(o, e) && d(o, e) <= ENGAGE + 1.5);
    if (runners.length && !guard) return minBy(runners, o => o.hp / o.maxhp + d(o, e) * .1);
    if (V3 && p.gprio && !guard && !escort) { const t2 = groupPick(e); if (t2) return t2; } // per-group priorities: the lord's order of what this kind of fighter goes for
    const anchor = guard ? p.castle : escort ? p.champ : e, radius = guard ? (t - p.castleHitT < 6 ? 7 : 4) : (V3 && p.engage) || ENGAGE;
    const near = ents.filter(o => !o.dead && o.kind !== "castle" && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e) && d(o, anchor) <= radius);
    if (near.length) return byPrio(e, near);
    if (guard || escort) return null;
    { const rv = [...p.revenge].filter(q => P[q] && fighting(q) && hostile(e.pid, q)).map(q => ents.find(o => !o.dead && o.kind === "champ" && o.pid === q && vis(o, e))).filter(Boolean); if (rv.length) return minBy(rv, o => d(o, e)); }
    if (p.heading === "centre" && t < HOLD_END) { // contest the battleground: only fight what stands on the hill
      const onHill = ents.filter(o => !o.dead && o.kind !== "castle" && o.kind !== "totem" && hostile(e.pid, o.pid) && fighting(o.pid) && vis(o, e) && inCentre(o.x, o.y));
      return onHill.length ? minBy(onHill, o => d(o, e)) : null;
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
    const dx = x - e.x, dy = y - e.y, dd = hyp(dx, dy); if (dd <= stop) return;
    const sp = e.kind === "unit" && !e.cart && !e.ram && P[e.pid] && P[e.pid].hold && (e.order || "army") === "army" ? Math.min(e.spd, P[e.pid].slow) : e.spd, step = Math.min(dd - stop, sp * (1 - fxv(e, "slow")) * (1 + (e.v3ms || 0)) * DT), nx = e.x + dx / dd * step, ny = e.y + dy / dd * step;
    if (walls.length && e.kind !== "totem" && wallAt(e, nx, ny)) { // blocked: slide along the wall if there's room
      e.blk = (e.blk || 0) + 1;
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
      e.cds[k] = k === "ult" ? 1e9 : t + COOLDOWN[e.cls][k] * BAL.cd * (1 - .1 * (e.ranks[k] - 1)) * e.cdMul; e.castLock = t + .4; // the ultimate is once per fight
      return;
    }
  }

  // ----- orders and betrayals, checked once per second -----
  function council() {
    const alive = alivePlayers();
    order.forEach(pid => {
      const p = P[pid]; if (!p.alive) return;
      p.rules.forEach((r, i) => {
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
      if (finalDay) { alive.forEach(a => P[a].pacts.clear()); log("Final day: the pacts dissolve. One banner must stand alone.", "big"); }
      else if (!teamWin) { teamWin = alive.slice(); log("Only allies remain. They share the day's victory.", "big"); over = true; }
    }
  }

  function think(e) {
    const p = P[e.pid];
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
      if (e.ram) { if (d(e, e.tgt) <= 1.1) { e.atkT -= DT * (1 + fxv(e, "asbuf")); if (e.atkT <= 0) { e.atkT = e.as; atkEv(e, e.tgt, "m"); slash(e.tgt); deal(e, e.tgt, e.atk, { big: 1 }); } } else moveToward(e, e.tgt.x, e.tgt.y, .9); return; }
      if (e.fuseAt != null) { if (t >= e.fuseAt) { e.hp = 0; kill(e, null); } return; } // lit: it sits still and ticks down
      if (d(e, e.tgt) <= 1.05) { e.fuseAt = +(t + 3).toFixed(2); ev({ ty: "fuse", x: e.x, y: e.y - .2, dur: 3, sc: .55, cart: 1 }); log(`${poss(e.pid)} powder cart is lit. Three seconds!`); } else moveToward(e, e.tgt.x, e.tgt.y, .9);
      return;
    }
    // retreating champion
    if (e.kind === "champ" && p.retreat) {
      moveToward(e, p.castle.x, p.castle.y - .8, .3);
      if (d(e, p.castle) < 1.5) heal(e, e.maxhp * .04 * DT, true);
      if (e.hp / e.maxhp > .75) p.retreat = false;
      if (e.kind === "champ") tryAbilities(e);
      return;
    }
    // falling back to heal: every stance retreats when hurt enough, then returns to the fight
    if ((e.kind === "champ" || e.kind === "unit") && !e.noRetreat) {
      const thr = RETREAT_AT[p.stance] ?? .45;
      const left = e.kind === "champ" ? 2 : 1; // soldiers fall back once, champions twice; after that they fight to the end
      if (!e.retreating && (e.retreats || 0) < left && (e.hp / e.maxhp < thr || p.fallbackUntil > t)) { e.retreating = true; e.retreats = (e.retreats || 0) + 1; e.tgt = null; }
      if (e.retreating) {
        if (e.hp / e.maxhp >= .8 && !(p.fallbackUntil > t)) e.retreating = false;
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
      if (e.cls === "mage") { const th = near(2.2); if (th && th.range < 2.5 && (t - e.hitT < 1.5 || d(th, e) < 1.4)) e.fleeUntil = Math.max(e.fleeUntil || 0, t + .8); }
      if (e.cls === "rogue") { const crowd = enemiesNear(e, e.x, e.y, 2).length; const going = live(e.tgt) && e.tgt.hp / e.tgt.maxhp < FINISH_AT; if ((e.hp / e.maxhp < .45 && crowd && !going) || crowd >= 4 || ((e.hits || 0) >= 5 && !going)) { e.fleeUntil = t + 1; e.hits = 0; } }
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
      const dealt = HV3 && e.tr ? kit.basic(e, o) : deal(e, o, e.atk);
      if (e.splash && live(o)) enemiesNear(e, o.x, o.y, 1.3).filter(x => x !== o).forEach(x => deal(e, x, e.atk * e.splash, { aoe: 1 }));
      if (e.cls === "rogue") e.hits = (e.hits || 0) + 1;
      if (e.cls === "archer") { const th = minBy(enemiesNear(e, e.x, e.y, 2.6).filter(x => x.range < 2.5), x => d(x, e)); if (th) e.fleeUntil = t + .6; }
      if (dealt && e.itemSet && e.itemSet.size && live(o)) { if (e.itemSet.has("frostdagger")) setFx(o, "slow", 1.5, .3); if (e.itemSet.has("venomorb")) addDot(o, e, 7, 3, "orb"); }
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

  // ----- main loop -----
  log("The horns sound. Battle begins!", "big");
  (plans.notes || []).forEach(n => log(n));
  record();
  while (!over) {
    t = +(t + DT).toFixed(2); tick++;
    for (let i = pending.length - 1; i >= 0; i--) if (pending[i].at <= t) { const pe = pending.splice(i, 1)[0]; curAb = pe.ab; pe.fn(); curAb = null; }
    if (HV3) kit.world();
    if (tick % 10 === 0) { order.forEach(pid => { const p = P[pid]; if (p.alive && !p.frenzy && p.castle.hp / p.castle.maxhp <= .2) { p.frenzy = true; aoe(p.castle.x, p.castle.y, 3, "#ff5a2a", 1.2); txt(p.castle, "Desperation Frenzy!", "#ff8a4a"); log(`${poss(pid)} defenders fight with Desperation Frenzy!`, "big"); H({ kind: "frenzy", pid, x: p.castle.x, y: p.castle.y, score: 50 }); } }); council(); }
    if (tick % 20 === 0 && !opts.duel) centreTick();
    // reinforcement waves (from 14 Nov 2026): each castle sends the garrison out when its conditions are met, never sooner than WAVE_GAP after the last, and forced out at each minute mark
    if (V3 && !opts.duel && tick % 5 === 0) order.forEach(pid => {
      const p = P[pid]; if (!p.alive || !p.waves || t - p.lastWave < WAVE_GAP) return;
      const c = p.castle, soldiers = ents.some(x => !x.dead && x.pid === pid && x.kind === "unit" && !x.free && !x.militia && !x.merc);
      const met = w => w.when === "timer" ? t >= w.at : w.when === "castle_hit" ? p.castleHitT > 0 : w.when === "castle_low" ? c.hp / c.maxhp < .5 : w.when === "hero_dies" ? p.heroDied : w.when === "army_dead" ? t > 5 && !soldiers : w.when === "enemy_hero" ? p.enemyHeroDied : anyUlt;
      let i = p.waves.findIndex(w => !w.done && met(w));
      if (i < 0 && p.waves.filter(w => w.done).length < Math.floor(t / WAVE_FORCE_EVERY)) i = p.waves.findIndex(w => !w.done);
      if (i >= 0) deployWave(p, i);
    });
    // reinforcements: every living castle musters militia on a timer, so the field never empties into hero-only sieges
    if (!opts.duel && t >= MILITIA.first && Math.abs(((t - MILITIA.first) % MILITIA.every)) < DT / 2) order.forEach(pid => {
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
        if (e.respawnAt && t >= e.respawnAt && P[e.pid].alive) {
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
      const o = ents.find(x => !x.dead && x.kind !== "castle" && x.kind !== "totem" && hostile(tr.pid, x.pid) && hyp(x.x - tr.x, x.y - tr.y) < .55);
      if (!o) return;
      tr.used = true; tr.usedT = t; P[tr.pid].trapT = t;
      if (tr.ranger) { kit.trapFire(tr, o); return; }
      if (tr.type === "spike") { aoe(tr.x, tr.y, .7, "#c7ccd1", .6); deal(null, o, 90, { aoe: 1, big: 1, trapPid: tr.pid, atype: "pure" }); }
      else if (tr.type === "blade") { const dx = o.x - tr.x, dy = o.y - tr.y, L = hyp(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
        for (let k = -3; k <= 3; k++) ev({ ty: "shot", x1: tr.x + px * k * .35, y1: tr.y + py * k * .35, x2: tr.x + px * k * .45 + ux * 4, y2: tr.y + py * k * .45 + uy * 4, c: "#d7dde2", w: 2 });
        aoe(tr.x, tr.y, .8, "#d7dde2", .5); enemiesNear({ pid: tr.pid }, tr.x + ux * 2, tr.y + uy * 2, 2.4).forEach(v => deal(null, v, 60, { aoe: 1, big: 1, trapPid: tr.pid, atype: "pure" })); }
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
    if (walls.length) mob.forEach(e => { for (const w of walls) { if (w.hp <= 0 || !hostile(e.pid, w.pid)) continue;
      if (e.x > w.x0 && e.x < w.x0 + 1 && e.y > w.y0 && e.y < w.y0 + 1) { const l = e.x - w.x0, r = w.x0 + 1 - e.x, u = e.y - w.y0, b = w.y0 + 1 - e.y, m = Math.min(l, r, u, b);
        if (m === l) e.x = w.x0 - .23; else if (m === r) e.x = w.x0 + 1.23; else if (m === u) e.y = w.y0 - .23; else e.y = w.y0 + 1.23; } } });
    mob.forEach(e => { e.x = Math.max(.3, Math.min(NN - .3, e.x)); e.y = Math.max(.3, Math.min(NN - .3, e.y)); });
    if (tick % 2 === 0) record();
    const alive = alivePlayers();
    if (alive.length <= 1 || t >= TMAX) over = true;
    if (opts.duel) { const sides = order.filter(pid => ents.some(e => !e.dead && e.pid === pid && e.kind !== "castle" && e.kind !== "totem")); if (sides.length <= 1 || t >= 90) { over = true; opts.duel.winner = sides.length === 1 ? sides[0] : null; opts.duel.t = t; opts.duel.hp = P[mePid].champ ? Math.max(0, P[mePid].champ.hp) / P[mePid].champ.maxhp : 0; } }
  }
  // ----- results -----
  const alive = alivePlayers().sort((a, b) => P[b].castle.hp / P[b].castle.maxhp - P[a].castle.hp / P[a].castle.maxhp);
  if (t >= TMAX && alive.length > 1) log("Night falls. The strongest castle claims the banner.", "big");
  alive.forEach((pid, i) => { P[pid].place = i + 1; });
  if (BV) { // castles that fell on the same tick share the places they took between them: the one that dealt more siege damage, then killed more heroes, ranks higher; a seeded draw settles the rest (never seat order)
    const fell = {}; order.filter(pid => !P[pid].alive).forEach(pid => { (fell[P[pid].elimT] = fell[P[pid].elimT] || []).push(pid); });
    Object.values(fell).filter(g => g.length > 1).forEach(g => { const places = g.map(pid => P[pid].place).sort((a, b) => a - b);
      g.slice().sort((a, b) => ((P[b].castleDmg || 0) - (P[a].castleDmg || 0)) || (P[b].kills - P[a].kills) || (hash(seed, botSeed(a)) - hash(seed, botSeed(b))) || (a < b ? -1 : 1)).forEach((pid, i) => { P[pid].place = places[i]; }); });
  }
  // if the last castles fell on the same tick, the last one to fall takes first place
  const champion = alive[0] || order.find(pid => P[pid].place === 1) || order.slice().sort((x, y) => (P[y].elimT ?? 0) - (P[x].elimT ?? 0))[0];
  if (P[champion].place !== 1) P[champion].place = 1;
  if (teamWin) { teamWin = teamWin.filter(pid => P[pid].alive); if (teamWin.length > 1) teamWin.forEach(pid => { P[pid].place = 1; }); else teamWin = null; }
  if (teamWin) log(`${teamWin.map(nm).join(" and ")} win the Daily Siege together!`, "big");
  else log(`${nm(champion)} ${champion === mePid ? "win" : "wins"} the Daily Siege!`, "big");
  if (!fast) {
    order.forEach(pid => { const B = P[pid].burst || {}, ks = Object.keys(B).map(Number).sort((a, b) => a - b); let best = null;
      ks.forEach(k0 => { let s = 0, last = null; for (let k = k0; k < k0 + 6; k++) if (B[k]) { s += B[k][0]; last = B[k]; } if (!best || s > best.s) best = { s, k0, last }; });
      if (best && best.s >= BURST_MIN && !hl.some(h => h.kind === "spree" && h.pid === pid && Math.abs(h.t2 - best.k0 / 2) < 6))
        hl.push({ kind: "burst", pid, t: best.k0 / 2 + 1.5, dmg: Math.round(best.s), x: best.last[1], y: best.last[2], score: Math.min(80, 40 + best.s / 60) }); });
    const wc = P[champion].castle, frac = wc.hp / wc.maxhp;
    hl.push({ kind: "winner", pid: champion, team: teamWin, t, clutch: frac < .2 && frac > 0, timeout: t >= TMAX, hpFrac: frac, x: wc.x, y: wc.y, score: 999 });
    hl.sort((a, b) => a.t - b.t);
  }
  for (let i = 0; i < 10; i++) { t = +(t + FRAME_DT).toFixed(2); record(); }
  ents.filter(e => e.kind === "champ" && e.gains < MIN_GAIN && e.heroLvl < maxLvl).forEach(e => { while (e.gains < MIN_GAIN && e.heroLvl < maxLvl) levelUp(e); }); // every hero earns at least two levels a day
  const treach = {}; treachery.forEach(([by, vic]) => { treach[by] = (treach[by] || 0) + 1; const take = Math.round(P[vic].gold * TREACHERY_LOOT); P[by].gold += take; P[vic].gold -= take; }); // the betrayer keeps a share of the victim's spoils for the day
  const W8 = dayWeight(BV, opts.dayNo);
  const PTS = [10, 7, 5, 4, 3, 2, 1, 0]; // placement points; from 8th place down a lord scores only for kills and castles
  const results = order.map(pid => ({ pid, name: nm(pid), color: P[pid].color, cls: P[pid].cls, place: P[pid].place, kills: P[pid].kills, ukills: P[pid].ukills, castles: P[pid].castles,
    points: Math.round(((PTS[P[pid].place - 1] || 0) + P[pid].kills + 2 * P[pid].castles) * W8) + (treach[pid] || 0) * TREACHERY_PTS, ...(treach[pid] ? { treachery: treach[pid] } : {}), fellAt: P[pid].elimT, gold: Math.round(P[pid].gold) })).sort((a, b) => a.place - b.place);
  const invest = (type, lvl) => { const c = UNITS[type].cost; let g = c; for (let l = 1; l < lvl; l++) g += Math.round(c * .5 * l); return g; };
  const tel = { duration: Math.min(t, TMAX),
    players: order.map(pid => ({ pid, name: nm(pid), cls: P[pid].cls, level: P[pid].level || 1, place: P[pid].place, points: results.find(r => r.pid === pid).points, elimT: P[pid].elimT, trapDmg: Math.round(P[pid].trapDmg || 0) })),
    ents: ents.filter(e => (e.kind === "champ" || e.kind === "unit") && !e.militia && !e.free).map(e => ({ pid: e.pid, ref: e.ref || null, kind: e.kind, cls: e.cls, type: e.kind === "unit" ? e.key : null, lvl: e.lvl || null, gold: e.kind === "unit" ? invest(e.key, e.lvl || 1) : null,
      ranks: e.ranks || null, survived: !e.tel.deaths, ...e.tel })) };
  const awards = (() => { const per = {}; order.forEach(pid => per[pid] = { k: 0, d: 0 }); tel.ents.forEach(e => { if (per[e.pid]) { per[e.pid].k += e.kills || 0; per[e.pid].d += e.deaths || 0; } });
    const best = (fn) => order.slice().sort((a, c) => fn(c) - fn(a) || (P[a].place - P[c].place))[0], mv = best(pid => results.find(r => r.pid === pid).points + P[pid].kills * .01), mk = best(pid => per[pid].k), kd = best(pid => per[pid].k / Math.max(1, per[pid].d)), sp = best(pid => P[pid].gold);
    return { mvp: { pid: mv, pts: results.find(r => r.pid === mv).points }, kills: { pid: mk, n: per[mk].k }, kd: { pid: kd, v: +(per[kd].k / Math.max(1, per[kd].d)).toFixed(1) }, spoils: { pid: sp, g: Math.round(P[sp].gold) } }; })();
  // hero progress for the week: levels gained today (capped), and the experience carried into tomorrow
  const lvlOut = {}; ents.filter(e => e.kind === "champ").forEach(e => { lvlOut[e.pid] = { from: e.lvl0, gain: e.gains, xp: Math.max(0, Math.min(Math.round(e.xp), xpNeed(e.heroLvl) - 1)) }; });
  const pairsEnd = BV ? (finalDay ? [] : pact0.filter(k => !feudsNew.has(k))) // pacts last until a betrayal or a break ends them, even if a castle fell
    : []; if (!BV) order.forEach(a => order.forEach(b => { if (a < b && P[a].alive && P[b].alive && P[a].pacts.has(b)) pairsEnd.push(a + "|" + b); }));
  const trapsUsed = traps.filter(tr => tr.used && !tr.ranger).map(tr => tr.pid + "|" + Math.round(tr.y - .5) + "," + Math.round(tr.x - .5));
  return { ...(V3 && !opts.duel ? { waves: true } : {}), me: mePid, feudsNew: [...feudsNew], trapsUsed, awards, ultCast: order.filter(pid => P[pid].ultCast), lvl: lvlOut, rapierEnd: rapierOwner ? rapierHolder : null, rapier: rapierOwner && rapierHolder && rapierHolder !== rapierOwner ? { from: rapierOwner, to: rapierHolder } : null, pairsEnd, team: teamWin, wallMeta: walls.map(w => ({ pid: w.pid, x: w.x0, y: w.y0, dir: w.dir, maxhp: w.maxhp, tier: w.tier, ...(w.born != null ? { born: w.born } : {}) })), tel, frames, events, logs, hl, ranks: RANKS, meta: meta(), results, order, colors: Object.fromEntries(order.map(p => [p, P[p].color])), traps, duration: t };
}
