// Option lists for orders: triggers, stances, priorities, rules, betrayals

const TRIGGERS = ["On cooldown", "On my top-priority target", "When 3+ enemies are near", "When my HP is under 30%", "When an ally is attacked", "When my castle is attacked"];

const STANCES = [["aggressive", "Aggressive", "All in. Falls back only below 12% health"], ["skirmish", "Skirmish", "Fights, falls back once below 30% to heal, returns"], ["cautious", "Cautious", "Pulls back once below 45% to heal, returns"]];
const RETREAT_AT = { aggressive: .12, skirmish: .3, cautious: .45, defensive: .45, opportunist: .3, duel: 0 };
const STANCE_FIX = { defensive: "cautious", opportunist: "skirmish" };

const PRIORITIES = ["Lowest-HP enemy", "Enemy heroes", "Nearest enemy", "Enemy castles", "Whoever hit my castle", "The leader (bounty)"];
const PRIORITY_OPTS = PRIORITIES.concat(["Enemies on the battleground", "Enemy bowmen", "Enemy footmen", "Enemy knights", "Enemy clerics", "Enemy raiders"]), PRIO_UNIT = { "Enemy bowmen": "bowman", "Enemy footmen": "footman", "Enemy knights": "knight", "Enemy clerics": "healer", "Enemy raiders": "raider" };
const IFS = ["My hero's HP < 30%", "My castle is under attack", "An ally is attacked", "Only 3 players remain", "A trap is triggered", "Battle passes 2 minutes"];
const THENS = ["Retreat hero to castle", "All units fall back to regroup", "Send units to help", "Switch to Aggressive", "Switch to Cautious", "Focus the leader"];
const BETRAYALS = ["Never", "Halfway through the battle", "When 3 players remain", "When their castle drops below 30%", "At the 2-minute mark", "When they attack my target", "When their hero drops below 30%", "When their castle is under attack", "When their hero has fallen"];
const BETRAY_WHEN = BETRAYALS.slice(1);
