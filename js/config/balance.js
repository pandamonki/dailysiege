// Balance numbers: slots, castle tiers, walls, income, XP, damage table, militia

const OP_MAX = 5, SLOT_START = 3, SLOT_MAX = 8;
const SLOT_COSTS = [0, 0, 0, 60, 100, 160, 240, 340]; // gold for bed n+1 is SLOT_COSTS[n] (n beds owned)
const slotCost = n => SLOT_COSTS[Math.min(n, SLOT_COSTS.length - 1)];

// ---- castle tiers, walls, shop items, hero levelling, gold ----
const CASTLE_TIERS = [
  { name: "Castle", cost: 0, hp: 1, note: "Where every lord begins. Earns base pay of 225 gold after day 1, growing 30 a day." },
  { name: "Fortress", cost: 150, hp: 1.15, note: "+15% castle health and +70 gold a day, so it pays for itself in about two days. Opens tier 2 gear, Arrow Slits, Bastions and stronger timber walls." },
  { name: "Citadel", cost: 300, hp: 1.3, note: "+30% castle health and +130 gold a day in all. Opens tier 3 gear, the Ballista and stone walls." },
];
const CASTLE_INCOME = [0, 70, 130]; // extra gold a day for each castle tier
const UPGRADE_NEEDS = { weapon: [1, 2, 3], armour: [1, 2, 3], charm: [1, 2, 3], walls: [1, 2], tower: [2, 3] }; // castle tier each upgrade tier needs
const WALL_TIERS = [{ name: "Palisade", hp: 200 }, { name: "Timber Wall", hp: 340 }, { name: "Stone Wall", hp: 520 }];
const WALL_COST = 35, WALL_CAP = 6, wallLimit = tier => WALL_CAP;
function wallTiles(r, c, dir) { return [[r, c]]; } // one block; dir only sets which way the barrier runs

const MIN_GAIN = 2; // every hero gains at least this many levels after each battle
const XP_CAP = 3, xpNeed = L => 90 + 45 * (L - 1), hpLv = L => 1 + .08 * (L - 1), atkLv = L => 1 + .06 * (L - 1);
const HOLD_END = 120; // orders to hold the battleground dissolve after 2 minutes, then armies march on castles
const CTR_BONUS = 1.25; // any hero standing on the battleground earns 25% more gold and XP, held or contested
const CTR_R = 2.0; // the centre: bonus XP and gold for whoever holds it
const GOLD_KILL = { unit: [5, 7, 9], hero: 30, castle: 50, militia: 1, summon: 1, guard: 2 }; // gold for a kill: a soldier pays by its tier (1, 2, 3; mercenaries count as tier 2), a hero a flat 30, a castle 50
const killGold = v => v.kind === "champ" ? GOLD_KILL.hero : v.kind === "castle" ? GOLD_KILL.castle : v.militia ? GOLD_KILL.militia : v.kind === "summon" ? GOLD_KILL.summon : v.key === "guard" ? GOLD_KILL.guard : GOLD_KILL.unit[(UNIT_TIER[v.key] || 2) - 1];
const BASE_INCOME = 225, INCOME_RAMP = 30; // pay after battle 1, and how much it grows with each day of the week
const baseIncome = d => BASE_INCOME + INCOME_RAMP * (Math.max(1, d) - 1); // base pay earned after the battle of day d
const startGold = dayNo => { let g = 300; for (let d = 1; d < dayNo; d++) g += baseIncome(d); return g; }; // what a lord who joins on day dayNo starts with
const curDayNo = () => (typeof isLive === "function" && isLive()) ? liveClock().dayNo : DAY; // the day being planned
function catchUpGold(n, idxFromBottom) { const k = Math.max(1, Math.round(n * .3)); return idxFromBottom < k ? Math.round(140 + 160 * (1 - idxFromBottom / k)) : 0; }

const BOUNTY = { base: 15, rank: [40, 25, 15], perLvl: 5 }; // gold on the heads of the top three: base + board position + hero level x 5
const bountyGold = (rank, lvl) => rank && rank <= 3 ? BOUNTY.base + BOUNTY.rank[rank - 1] + BOUNTY.perLvl * (lvl || 1) : 0;
const LEADER = "p1"; // top of last week's board: carries the bounty
// damage types: every attack has a type, every body has an armour class
const ATK_TYPES = {
  blade:     { name: "Blade",     note: "Swords and claws. Best against medium armour." },
  pierce:    { name: "Pierce",    note: "Arrows. Shreds light armour, glances off medium." },
  magic:     { name: "Magic",     note: "Spells. Good against light and heavy armour." },
  precision: { name: "Precision", note: "Daggers. Deadly to light armour, poor against heavy." },
  siege:     { name: "Siege",     note: "Axes and rams. Built for castles." },
  pure:      { name: "Pure",      note: "Traps and attrition. Ignores armour class." },
};
const ARMOUR_TYPES = { light: "Light", medium: "Medium", heavy: "Heavy", fortified: "Fortified" };
const TYPE_TABLE = {
  blade:     { light: 1.15, medium: 1.25, heavy: .9,  fortified: .5 },
  pierce:    { light: 1.5,  medium: .75,  heavy: .9,  fortified: .35 },
  magic:     { light: 1.25, medium: 1,    heavy: 1.25, fortified: .35 },
  precision: { light: 1.5,  medium: .75,  heavy: .5,  fortified: .45 },
  siege:     { light: .9,   medium: .75,  heavy: 1,   fortified: 1.6 },
  pure:      { light: 1,    medium: 1,    heavy: 1,   fortified: 1 },
};

const HERO_GUARD = .9;     // heroes take 10% less from soldiers, so massed bowmen can't melt them
const FINISH_AT = .5, FINISH_BONUS = 1.6; // Rogue: +60% against anything below half health
// castles send out militia waves through the battle (keeps fights going after the armies trade)
const MILITIA = { first: 35, every: 25, count: 2, hp: 150, atk: 11 };
// global balance knobs: movement speed, time between attacks, ability cooldowns, castle health
const BAL = { move: .85, swing: 1.15, cd: 1.1, castleHp: 600 };
const SUDDEN = 100, TMAX = 200, FRAME_DT = .2, BURST_MIN = 560;

// kill streaks: the battle sim names a streak as it happens, so the table lives with the balance numbers
const STREAKS = [[4, "Quad Squad"], [6, "Mowing the Lawn"], [8, "Pitchfork Panic"], [11, "Heads Will Roll"], [15, "Butcher of the Realm"], [20, "Daily Siege Legend"]]; // [kill weight in a chain, name]
