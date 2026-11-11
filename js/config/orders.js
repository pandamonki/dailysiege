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
