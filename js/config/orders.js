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
const WAVE_WHEN = [["timer", "At a set time"], ["castle_hit", "When my castle is attacked"], ["castle_low", "When my castle drops below half"], ["hero_dies", "When my hero dies"], ["army_dead", "When all my soldiers die"], ["enemy_hero", "When an enemy hero dies"], ["ult", "When any ultimate is cast"]];
const WAVE_TIMES = [20, 30, 45, 60, 75, 90, 120, 150];
const WAVE_ORDERS = [["default", "Default orders", "Each soldier follows its group's combat orders"], ["castle", "March on castle", "Heads for the enemy castle; turns only on melee attackers"], ["hero", "Hunt heroes", "Goes after the nearest enemy hero"], ["nearest", "Nearest enemies", "Fights the closest enemy soldiers and heroes, wherever they are"]];
const WAVE_DEFAULT = [{ when: "castle_hit", at: 45 }, { when: "hero_dies", at: 90 }, { when: "timer", at: 150 }];
function cleanWaves(w) { // exactly WAVE_COUNT waves; unknown conditions fall back to the default; at most WAVE_SLOTS soldiers each (never a mercenary)
  return [...Array(WAVE_COUNT)].map((_, i) => { const x = Array.isArray(w) && w[i] || {}, d = WAVE_DEFAULT[i];
    return { when: WAVE_WHEN.some(o => o[0] === x.when) ? x.when : d.when, at: WAVE_TIMES.includes(+x.at) ? +x.at : d.at, order: WAVE_ORDERS.some(o => o[0] === x.order) ? x.order : "default",
      units: (Array.isArray(x.units) ? x.units : []).filter(u => u && UNITS[u.type] && !UNITS[u.type].merc).slice(0, WAVE_SLOTS).map(u => ({ type: u.type, lvl: Math.max(1, Math.min(3, Math.round(u.lvl) || 1)), id: u.id || null, hp: 1 })) }; });
}
