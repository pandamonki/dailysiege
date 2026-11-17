// Balance numbers: slots, castle tiers, walls, income, XP, damage table, militia

const OP_MAX = 5, SLOT_START = 3, SLOT_MAX = 8;
const SLOT_COSTS = [0, 0, 0, 60, 100, 160, 240, 340]; // gold for bed n+1 is SLOT_COSTS[n] (n beds owned)
const slotCost = n => SLOT_COSTS[Math.min(n, SLOT_COSTS.length - 1)];
// From SUPPLY_V2_FROM (the week of 16 Nov 2026): no more beds. Every lord can field FIELD_MAX soldiers on the map, and buys the three
// reinforcement waves instead, in order, each opening that wave's soldier slots. Beds already bought are refunded.
// Testing mode. On: once the host has sealed, a "Begin battle now" button fights the day's battle at once and moves the war on a
// day (the game's clock runs testSkew days ahead of the calendar; the normal schedule carries on from there). Off: the button is
// hidden and the server refuses it.
const TEST_MODE = true;
const DAY_MS = 864e5;
let SUPPLY_V2_FROM = "2026-11-16"; const supplyV2For = d => String(d) >= SUPPLY_V2_FROM;
const FIELD_MAX = 4, WAVE_UNLOCK_COSTS = [60, 100, 150];

// ---- castle tiers, walls, shop items, hero levelling, gold ----
const CASTLE_TIERS = [
  { name: "Castle", cost: 0, hp: 1, note: "Where every lord begins. Earns base pay of 225 gold after day 1, growing 30 a day." },
  { name: "Fortress", cost: 100, hp: 1.15, note: "+15% castle health and +70 gold a day, so it pays for itself in under two days. Opens tier 2 gear, Arrow Slits, Bastions and stronger timber walls." },
  { name: "Citadel", cost: 200, hp: 1.3, note: "+30% castle health and +130 gold a day in all. Opens tier 3 gear, the Ballista and stone walls." },
];
const CASTLE_INCOME = [0, 70, 130]; // extra gold a day for each castle tier
const UPGRADE_NEEDS = { weapon: [1, 2, 3], armour: [1, 2, 3], charm: [1, 2, 3], walls: [1, 2], tower: [2, 3] }; // castle tier each upgrade tier needs
const WALL_TIERS = [{ name: "Palisade", hp: 100 }, { name: "Timber Wall", hp: 170 }, { name: "Stone Wall", hp: 250 }]; // from the defences update (plans stamped trapV2); earlier battles replay with WALL_HP_V1
const WALL_HP_V1 = [200, 340, 520];
const WALL_COST = 35, WALL_CAP = 6, WALL_CAP_V2 = 5, TRAP_CAP_V2 = 4, wallLimit = tier => (typeof mapV2Now === "function" && mapV2Now() ? WALL_CAP_V2 : WALL_CAP); // from MAP_V2_FROM: 5 walls and 4 traps a battle
const trapLimit = () => (typeof mapV2Now === "function" && mapV2Now() ? TRAP_CAP_V2 : Infinity);
function wallTiles(r, c, dir) { return [[r, c]]; } // one block; dir only sets which way the barrier runs

const MIN_GAIN = 2; // every hero gains at least this many levels after each battle
const XP_CAP = 3, xpNeed = L => 90 + 45 * (L - 1), hpLv = L => 1 + .08 * (L - 1), atkLv = L => 1 + .06 * (L - 1);
const HOLD_END = 120; // orders to hold the battleground dissolve after 2 minutes, then armies march on castles
const CTR_BONUS = 1.25; // any hero standing on the battleground earns 25% more gold and XP, held or contested
const CTR_R = 2.0; // the centre: bonus XP and gold for whoever holds it
const GOLD_KILL = { unit: 2, militia: 1, summon: 1, guard: 2 };
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
// Sudden death (battles on or after SUDDEN_V1_FROM): at SD_AT every surviving hero and soldier is carried to the centre arena, a SD_COUNT second countdown runs, then it is a fight to the death for up to SD_LEN seconds
const SD_AT = 180, SD_COUNT = 5, SD_LEN = 60;
let SUDDEN_V1_FROM = "2026-11-15"; const suddenV1For = d => String(d) >= SUDDEN_V1_FROM;
// Sudden death v2 (plans stamped sdV2, battles from SUDDEN_V2_FROM): the arena is half the size and nobody can leave it, everyone drawn in is topped up to half health, and a hero who falls in it shows no respawn timer (they never come back).
// The same battles stamp wallV2: every fence blocks everyone, its owner's soldiers too, and they find a way round through the gaps.
let SUDDEN_V2_FROM = "2026-11-19"; const suddenV2For = d => String(d) >= SUDDEN_V2_FROM;
const sdArenaR = (n, v2) => (3 + n * .4 + 3.2) * (v2 ? .5 : 1); // the red ring's radius in tiles for n lords
const SUDDEN = 100, TMAX = 200, FRAME_DT = .2, BURST_MIN = 560;

// kill streaks: the battle sim names a streak as it happens, so the table lives with the balance numbers
const STREAKS = [[4, "Quad Squad"], [6, "Mowing the Lawn"], [8, "Pitchfork Panic"], [11, "Heads Will Roll"], [15, "Butcher of the Realm"], [20, "Daily Siege Legend"]]; // [kill weight in a chain, name]
