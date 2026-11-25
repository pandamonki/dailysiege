// Option lists for orders: triggers, stances, priorities, rules, betrayals

const TRIGGERS = ["On cooldown", "On my top-priority target", "When 3+ enemies are near", "When my HP is under 30%", "When an ally is attacked", "When my castle is attacked"];

const STANCES = [["aggressive", "Aggressive", "All in. Falls back only below 12% health"], ["skirmish", "Skirmish", "Fights, falls back once below 30% to heal, returns"], ["cautious", "Cautious", "Pulls back once below 45% to heal, returns"]];
const RETREAT_AT = { aggressive: .12, skirmish: .3, cautious: .45, defensive: .45, opportunist: .3, duel: 0 };
const STANCE_FIX = { defensive: "cautious", opportunist: "skirmish" };

const PRIORITIES = ["Lowest-HP enemy", "Enemy heroes", "Nearest enemy", "Enemy castles", "Whoever hit my castle", "The leader (bounty)"];
const PRIORITY_OPTS = PRIORITIES.concat(["Enemies on the battleground", "Enemy bowmen", "Enemy footmen", "Enemy knights", "Enemy clerics", "Enemy raiders", "Enemy mages", "Enemy snipers", "Enemy siege weapons"]), PRIO_UNIT = { "Enemy bowmen": "bowman", "Enemy footmen": "footman", "Enemy knights": "knight", "Enemy clerics": "healer", "Enemy raiders": "raider", "Enemy mages": "mage", "Enemy snipers": "sniper" };
const IFS = ["My hero's HP < 30%", "My castle is under attack", "An ally is attacked", "Only 3 players remain", "A trap is triggered", "Battle passes 2 minutes"];
const THENS = ["Retreat hero to castle", "All units fall back to regroup", "Send units to help", "Switch to Aggressive", "Switch to Cautious", "Focus the leader"];
const BETRAYALS = ["Never", "Halfway through the battle", "When 3 players remain", "When their castle drops below 30%", "At the 2-minute mark", "When they attack my target", "When their hero drops below 30%", "When their castle is under attack", "When their hero has fallen"];
const BETRAY_WHEN = BETRAYALS.slice(1);

// Combat groups (battles from 12 Nov 2026): what each kind of fighter picks first once an enemy is within reach, and who healers heal first.
// A plan carries gprio = { hero, melee, ranged, heal } (each an ordered list of ids below) and engage (reach in tiles).
const TARGET_OPTS = [["hero", "Enemy heroes"], ["melee", "Enemy melee soldiers"], ["ranged", "Enemy ranged soldiers"], ["healer", "Enemy healers"], ["siege", "Enemy siege weapons"], ["any", "Any soldier (nearest)"], ["lowhp", "Lowest-HP enemy"]];
const HEAL_OPTS = [["hero", "My hero"], ["lowhp", "Lowest-HP ally"], ["wounded", "Most wounded ally (%)"], ["melee", "Melee soldiers"], ["ranged", "Ranged soldiers"], ["siege", "Siege units"], ["any", "Any soldier (nearest)"]];
const COMBAT_GROUPS = [["hero", "Your hero", "fights, then marches on", TARGET_OPTS], ["melee", "Melee soldiers", "Footmen, Knights", TARGET_OPTS], ["ranged", "Ranged soldiers", "Bowmen, Mages, Snipers", TARGET_OPTS], ["heal", "Healers", "Clerics: who to heal first", HEAL_OPTS]];
const GPRIO_SLOTS = 3, GPRIO_DEFAULT = { hero: ["hero", "ranged", "melee"], melee: ["melee", "ranged", "hero"], ranged: ["hero", "ranged", "melee"], heal: ["hero", "wounded", "any"] };
const ENGAGE_DEFAULT = 2, ENGAGE_MIN = 1, ENGAGE_MAX = 5;
const cleanEngage = v => Math.max(ENGAGE_MIN, Math.min(ENGAGE_MAX, Math.round(+v) || ENGAGE_DEFAULT));
function cleanGprio(g) { // a full, valid set of lists: unknown or repeated entries are dropped, missing groups take the default
  const out = {}; COMBAT_GROUPS.forEach(([k, , , opts]) => { const ok = opts.map(o => o[0]), cur = g && Array.isArray(g[k]) ? g[k].filter((x, i, a) => ok.includes(x) && a.indexOf(x) === i).slice(0, GPRIO_SLOTS) : null; out[k] = cur && cur.length ? cur : GPRIO_DEFAULT[k].slice(); });
  return out;
}

// Reinforcement waves (battles from 12 Nov 2026): a castle's garrison holds WAVE_COUNT waves. Each wave is one free footman plus WAVE_SLOTS bought soldiers.
// A wave goes out when its condition is met. Two waves are never sent within WAVE_GAP seconds of each other, and at every minute mark a wave that has not
// gone is forced out, so that by 1:00 one has gone, by 2:00 two, and by 3:00 all three.
const WAVE_COUNT = 3, WAVE_SLOTS = 3, WAVE_GAP = 30, WAVE_FORCE_EVERY = 60, GARRISON_SOLDIERS = WAVE_COUNT * WAVE_SLOTS;
// Emergency waves (plans stamped waveV2, battles from WAVE_V2_FROM): when a castle drops below each mark in WAVE_EMERGENCY, the next wave not yet sent
// rushes out to defend, whatever its own condition, as long as WAVE_EMERGENCY_GAP seconds have passed since the last wave. A mark crossed during that
// wait is kept and the wave goes as soon as the wait is over, so a castle under heavy attack gets its waves one at a time, never all at once.
// Also from WAVE_V2_FROM a wave has no orders of its own: every wave first clears enemies within WAVE_DEF_R tiles of its castle, and once that area has
// been clear for WAVE_DEF_CLEAR seconds (or the castle has fallen) its soldiers follow the lord's army plan like the rest of the army.
// Each wave has a "rush" box (on unless the lord unticks it): only waves with it ticked rush out in an emergency, the earliest such wave first. A castle
// below its k-th mark still counts every wave already out (by trigger, deadline or rush), so unticking a wave never makes the others rush sooner.
let WAVE_V2_FROM = "2026-11-20"; const waveV2For = d => String(d) >= WAVE_V2_FROM, WAVE_EMERGENCY = [.75, .5, .25], WAVE_EMERGENCY_GAP = 10, WAVE_DEF_R = 8, WAVE_DEF_CLEAR = 4;
// Wave deadlines (plans stamped waveV3, battles from WAVE_V3_FROM): each wave has its own latest time, WAVE_FORCE_AT, instead of one wave being forced
// out at every minute mark. A wave goes when its condition is met or at its deadline, whichever comes first (still WAVE_GAP after the last wave).
let WAVE_V3_FROM = "2026-11-20"; const waveV3For = d => String(d) >= WAVE_V3_FROM, WAVE_FORCE_AT = [45, 90, 135];
// Enemies reach my castle (plans stamped waveV4, battles from WAVE_V4_FROM): the "castle_hit" trigger now fires when an enemy soldier, hero, summon or
// siege engine is within WAVE_NEAR_R tiles of the castle and nearer to it than to its own castle (so armies standing in their own base next door
// don't count), or when the castle is first hit (a catapult or archer can strike from further out). It is never later than the old trigger.
// Castles can be under 7 tiles apart, so the radius is kept small: at 5 tiles it fired in the first seconds for most castles as armies marched past.
let WAVE_V4_FROM = "2026-11-20"; const waveV4For = d => String(d) >= WAVE_V4_FROM, WAVE_NEAR_R = 3;
// Balance v5 (plans stamped balV5, battles from BAL_V5_FROM): waves are a flat WAVE_GAP_V5 seconds apart, emergency or not; heroes get their own
// attack and armour class (HERO_ATK / HERO_ARM in config/balance.js); a hero home and out of combat heals; regen items toned down; a castle
// destroyed by the lord who betrayed it scores BETRAY_CASTLE_X times the castle points.
let BAL_V5_FROM = "2026-11-22"; const balV5For = d => String(d) >= BAL_V5_FROM, WAVE_GAP_V5 = 20;
// Final-day alliances and faster levelling (plans stamped finV2 and lvlV2, battles from FIN_V2_FROM):
// - finV2: on day 7 pacts no longer dissolve at dawn. They hold into the battle and break only when one alliance is all that is
//   left standing; then a banner announces it and the last allies fight it out for the war. Betray before you are betrayed.
// - lvlV2: heroes gain 3 to 4 levels a battle (MIN_GAIN_V2 / XP_CAP_V2) up to level MAX_HERO_LVL_V4, with smaller steps per level
//   (HP_STEP_V4 / ATK_STEP_V4 in config/trees.js) so a level 25 hero is as strong in health and attack as a level 15 hero was.
let FIN_V2_FROM = "2026-11-23"; const finV2For = d => String(d) >= FIN_V2_FROM, lvlV2For = d => String(d) >= FIN_V2_FROM;
// breakV2: disbanding an alliance takes effect from the next battle. You still fight beside them in the battle you disbanded in; the only way
// to turn on an ally mid-fight is a betrayal. The other lord is told the next day.
let BREAK_V2_FROM = "2026-11-25"; const breakV2For = d => String(d) >= BREAK_V2_FROM;
const breakV2Now = () => { try { return typeof isLive === "function" && isLive() && typeof liveClock === "function" ? breakV2For(liveClock().planDay) : false; } catch (e) { return false; } };
// betrayV2: a lord allied to two or more lords can betray the whole alliance at once. One trigger sends the hero to the nearest keep and, on arrival,
// every bomb is planted at the same moment, so they all go off together.
let BETRAY_V2_FROM = "2026-11-26"; const betrayV2For = d => String(d) >= BETRAY_V2_FROM;
const betrayV2Now = () => { try { return typeof isLive === "function" && isLive() && typeof liveClock === "function" ? betrayV2For(liveClock().planDay) : false; } catch (e) { return false; } };
// betrayV2 triggers: the time is picked from slots, like the wave deadlines ("At 1:30"), next to conditions that react to the ally. "At the 2-minute mark" and
// "Halfway through the battle" still work in orders saved before.
// the last slot is 2:30: sudden death starts at 3:00 (SD_AT), when the castles drop out of the fight and nobody can walk to a keep
const BETRAY_SLOTS = [0, 30, 60, 90, 120, 150].map(s => `At ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`), BETRAY_SLOT_RE = /^At (\d+):(\d\d)$/;
const betraySlotSecs = trig => { const m = BETRAY_SLOT_RE.exec(trig || ""); return m ? +m[1] * 60 + +m[2] : null; };
const BETRAY_WHEN_V2 = [...BETRAY_SLOTS, "When 3 players remain", "When another lord is knocked out", "When their castle drops below 30%", "When their castle is under attack", "When their army is gone", "When their hero is away from home", "When they attack my target", "When their hero drops below 30%", "When their hero has fallen"];
const betrayWhenList = () => (betrayV2Now() ? BETRAY_WHEN_V2 : BETRAY_WHEN);
const betrayDefault = () => (betrayV2Now() ? "At 1:30" : BETRAY_WHEN[0]);
const BETRAY_ALL_WHEN = [...BETRAY_SLOTS, "When 3 players remain", "When another lord is knocked out"]; // triggers that do not depend on one victim
const lvlV2Now = () => { try { return typeof isLive === "function" && isLive() && typeof liveClock === "function" ? lvlV2For(liveClock().planDay) : true; } catch (e) { return true; } };
const WAVE_WHEN = [["timer", "At a set time"], ["castle_hit", "When my castle is attacked"], ["castle_low", "When my castle drops below half"], ["hero_dies", "When my hero dies"], ["army_dead", "When all my soldiers die"], ["enemy_hero", "When an enemy hero dies"], ["ult", "When any ultimate is cast"]];
const WAVE_TIMES = [20, 30, 45, 60, 75, 90, 120, 150];
const WAVE_ORDERS = [["default", "Default orders", "Each soldier follows its group's combat orders"], ["castle", "March on castle", "Heads for the enemy castle; turns only on melee attackers"], ["hero", "Hunt heroes", "Goes after the nearest enemy hero"], ["nearest", "Nearest enemies", "Fights the closest enemy soldiers and heroes, wherever they are"]];
const WAVE_DEFAULT = [{ when: "castle_hit", at: 45 }, { when: "hero_dies", at: 90 }, { when: "timer", at: 150 }];
function cleanWaves(w) { // exactly WAVE_COUNT waves; unknown conditions fall back to the default; at most WAVE_SLOTS soldiers each (never a mercenary)
  return [...Array(WAVE_COUNT)].map((_, i) => { const x = Array.isArray(w) && w[i] || {}, d = WAVE_DEFAULT[i];
    return { when: WAVE_WHEN.some(o => o[0] === x.when) ? x.when : d.when, at: WAVE_TIMES.includes(+x.at) ? +x.at : d.at, order: WAVE_ORDERS.some(o => o[0] === x.order) ? x.order : "default", rush: x.rush !== false, ...(ZONES.includes(x.zone) ? { zone: x.zone } : {}), // rush: may this wave rush out in an emergency (missing = yes)
      units: (Array.isArray(x.units) ? x.units : []).filter(u => u && UNITS[u.type] && !UNITS[u.type].merc).slice(0, WAVE_SLOTS).map(u => ({ type: u.type, lvl: Math.max(1, Math.min(3, Math.round(u.lvl) || 1)), id: u.id || null, hp: 1 })) }; });
}

// Orders v2 (plans stamped ordV2, battles from ORDERS_V2_FROM): one army plan and one fall-back condition replace the heading, the if-then
// battle commands and each soldier's own orders (the castle guard stays). Only the hero falls back to heal, when its stance says; soldiers fight on.
let ORDERS_V2_FROM = "2026-11-20"; const ordersV2For = d => String(d) >= ORDERS_V2_FROM;
const ARMY_PLANS = ["conquest", "hunt", "siege", "slayer"], FALL_BACKS = ["none", "castle", "siege", "herodies", "heroback"];
const ARMY_PLAN_INFO = { conquest: ["Conquest", "Hero, then army, then castle. Then the next lord"], hunt: ["Hero hunt", "Chase heroes. Castles come last"],
  siege: ["Siege", "Castle to castle, fighting only what blocks the way"], slayer: ["Army slayer", "Soldiers, then hero, then castle"] };
const FALL_BACK_INFO = { none: ["Never", "Never turn back"], castle: ["Castle under attack", "3+ enemies at your castle"], siege: ["Siege engine nears", "A ram, catapult or powder cart nears"],
  herodies: ["Hero falls", "Until your hero is back up"], heroback: ["Hero falls back", "Go home with your hero"] };
const CASTLE_ALERT_N = 3, TERRITORY_R = 5, FALLBACK_LINGER = 4, SIEGE_REACH = 1.5; // enemies at the castle (within 3 tiles) that count as an attack; how near an engine is "in your land"; seconds the army stays home after the danger passes; how close an enemy must be for a siege army to stop for it
// Zones v1 (plans stamped zoneV1, battles from ZONE_V1_FROM; practice always): where a soldier (or the hero) is placed sets its job for the battle.
// The deploy field splits into four zones, seen from the castle looking at the hill: Guard (the tiles round the castle), the Front (straight ahead),
// and the Left and Right flanks. The Front marches on the #1 target by its plan; each flank screens its side or raids the neighbour on that side;
// the Guard stays home. Each wave picks a zone too. One army temper replaces the hero stance and the fall-back condition.
// The prototype date is far off, so only practice uses these rules until a real start date is chosen.
// Fixed timing (plans stamped timeV1, battles from TIME_V1_FROM; practice always): a fighter's wait before its first swing, and a hero's opening
// skill cooldowns, no longer come from the battle's dice. They are spread by the fighter's place in the line-up instead, so the same orders against
// the same rivals give (nearly) the same battle, and only the real percentage chances (dodges, crits, misses, procs) stay random.
let TIME_V1_FROM = "2099-01-01"; const timeV1For = d => String(d) >= TIME_V1_FROM;
const fixedFrac = k => { const x = k * .6180339887498949; return x - Math.floor(x); }; // an even spread in [0, 1) by place, the same on every device
let ZONE_V1_FROM = "2099-01-01"; const zoneV1For = d => String(d) >= ZONE_V1_FROM;
const ZONES = ["guard", "left", "front", "right"], ZONE_INFO = { guard: ["Guard", "Stays at home and defends the castle"], left: ["Left flank", "Holds or raids your left side"], front: ["Front", "Marches on your #1 target"], right: ["Right flank", "Holds or raids your right side"] };
const ZONE_COL = { guard: "#2f5fa8", left: "#b23428", front: "#4f7a2e", right: "#c9962f" };
const ZONE_GUARD_R = 1.5, ZONE_FRONT_A = .5; // tiles from the castle that count as Guard; how far (radians) either side of straight ahead still counts as the Front
const FRONT_PLANS = ["assault", "siege", "hunt", "hill"], FRONT_INFO = { assault: ["Assault", "Fights whatever it meets on the way to your target"], siege: ["Siege", "Slips past armies and goes for the castle"], hunt: ["Hero hunt", "Goes for heroes first"], hill: ["Hold the hill", "Takes the hill and holds it until 2:00, then marches on your target"] };
const FRONT_BEATS = { hill: "assault", assault: "hunt", hunt: "siege", siege: "hill" }; // the loop: a Front fighting a Front its plan beats deals FRONT_BEAT_X damage
const FRONT_BEAT_X = 1.25, FRONT_ARMY = { assault: "conquest", siege: "siege", hunt: "hunt", hill: "conquest" }; // which orders-v2 army plan each Front plan fights by
const FLANK_PLANS = ["screen", "raid"], FLANK_INFO = { screen: ["Screen", "Stops raiders from that side, then pushes on to that neighbour once it has been quiet for a while"], raid: ["Raid", "Goes straight for the neighbour's castle on that side"] };
const SCREEN_OUT = 4.5, SCREEN_R = 4, SCREEN_QUIET = 20, SCREEN_MIN = 60; // a screen holds this far out toward its neighbour, fights what comes within SCREEN_R of that spot, and pushes on once nothing has come for SCREEN_QUIET seconds (not before SCREEN_MIN)
const TEMPERS = ["reckless", "steady", "wary"], TEMPER_INFO = { reckless: ["Reckless", "+15% damage, 15% more damage taken, never falls back"], steady: ["Steady", "No change; the army falls back if the castle is attacked"], wary: ["Wary", "10% less damage, 20% less damage taken, falls back early"] };
const TEMPER_DMG = { reckless: 1.15, steady: 1, wary: .9 }, TEMPER_TAKEN = { reckless: 1.15, steady: 1, wary: .8 }, TEMPER_STANCE = { reckless: "aggressive", steady: "skirmish", wary: "cautious" }, TEMPER_FALLBACK = { reckless: "none", steady: "castle", wary: "castle" }, TEMPER_ALERT = { reckless: 99, steady: 3, wary: 2 };
const RING_FAR = 3, RING_CLEAR = 3.2, RING_R = 6, RING_STEP = .6, RING_GAP = .8, STUCK_SECS = 2; // a flank heading for a far target (not its neighbour), whose straight way passes within RING_CLEAR of the hill,
// walks round the outside instead (RING_GAP beyond the tree clumps between bases; RING_R without trees), aiming RING_STEP radians at a time. The Front goes straight. A soldier that has tried to walk for STUCK_SECS without getting anywhere may step through its own side's fence
const GUARD_LEASH = 7; // a Guard soldier that has chased this far from its castle drops the chase and walks home
const HILL_PTS = 2, HILL_MIN = 10; // the lord who held the hill longest (at least HILL_MIN seconds) scores this, times the day's weight
// (hyp and datan2 come from core/util.js and core/detmath.js, so every device classifies the same way)
// the zone of a deploy tile for a castle at [cr, cc] on an n-by-n field
function zoneOfTile(cr, cc, r, c, n) {
  const dr = r - cr, dc = c - cc; if (hyp(dr, dc) <= ZONE_GUARD_R) return "guard";
  const ctr = (n - 1) / 2, fwd = datan2(ctr - cr, ctr - cc); let a = datan2(dr, dc) - fwd;
  while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
  return a > ZONE_FRONT_A ? "right" : a < -ZONE_FRONT_A ? "left" : "front";
}
// the neighbour on one side of a castle: the nearest castle whose bearing (looking at the hill) is to that side. castles: [[r, c], ...]
function flankNeighbour(castles, i, side, n) {
  const [cr, cc] = castles[i], ctr = (n - 1) / 2, fwd = datan2(ctr - cr, ctr - cc); let best = -1, bd = 1e9;
  castles.forEach(([r, c], k) => { if (k === i) return; let a = datan2(r - cr, c - cc) - fwd; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
    if ((side === "right") !== (a > 0)) return; const dd = Math.round(hyp(r - cr, c - cc) * 1e6); if (dd < bd) { bd = dd; best = k; } });
  return best;
}
const cleanFlanks = f => ({ left: FLANK_PLANS.includes(f && f.left) ? f.left : "screen", right: FLANK_PLANS.includes(f && f.right) ? f.right : "screen" });
