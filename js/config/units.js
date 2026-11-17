// Soldiers and traps: shop data, battle stats, body sizes

const UNITS = {
  footman: { name: "Footman", cost: 100, hp: 380, atk: 13, note: "Tough blocker. Slows whatever it fights, and is hard to push past." },
  bowman:  { name: "Bowman",  cost: 120, hp: 150,  atk: 16, note: "Ranged hero-hunter: +30% damage to heroes." },
  knight:  { name: "Knight",  cost: 240, hp: 420, atk: 30, note: "Heavy armour. Slow." },
  healer:  { name: "Cleric",  cost: 140, hp: 200,  atk: 10,  note: "Heals nearby units." },
  raider:  { name: "Raider",  cost: 140, hp: 230, atk: 30, note: "Fast. Hits castles hard." },
  mage:    { name: "Battle Mage", cost: 180, hp: 170, atk: 27, note: "Casts from a distance. Each bolt also splashes half its damage on enemies next to the target." },
  sniper:  { name: "Dwarven Sniper", cost: 220, hp: 170, atk: 48, note: "Slow, deadly shots from very far away. Great against light targets and heroes, poor against heavy armour." },
  ram:     { name: "Battering Ram", cost: 300, hp: 750, atk: 125, note: "Pushes slowly at castles and ignores soldiers. Hits castles hard, taking about 5 seconds to bring down a tier 1 castle, then moves on to the next one. Very tough.", engine: true },
  cart:    { name: "Powder Cart", cost: 300, hp: 240, atk: 0, note: "Rolls very slowly at a castle and blows up, enough to flatten a tier 1 castle. The blast hurts every soldier nearby, friend or foe, and also goes off if the cart is destroyed. Can't be trained.", noUpgrade: true, engine: true },
  tower:   { name: "Guard Tower", cost: 150, hp: 270, atk: 15, note: "A stationary defender. Upgrade it to an Arrow Tower.", tower: true, noUpgrade: true },
  catapult: { name: "Catapult", cost: 300, hp: 450, atk: 110, note: "Very slow. Sets up two tiles from a castle, then hurls boulders at it. Hits castles hard from a distance, but cannot fight soldiers, so guard it.", engine: true },
};
const UNIT_LVL_GAIN = .3; // each soldier level adds this share of base health and attack
const UNIT_TRAIN_COST = [.3, .4]; // training to level 2 and to level 3 costs this share of the soldier's price
const trainCost = (type, lvl) => Math.round(UNITS[type].cost * (UNIT_TRAIN_COST[lvl - 1] || 0)); // gold to train a level-lvl soldier one level up
const UNIT_TIER = { tower: 1, footman: 1, bowman: 1, knight: 3, raider: 2, healer: 2, mage: 2, sniper: 3, ram: 3, cart: 3, catapult: 3 }; // castle tier that unlocks each soldier
const UNIT_LVL_TIER = [1, 1, 1]; // soldiers can be trained to any level at any castle tier; only weapon and armour upgrades are gated
// Traps are permanent from TRAPS_V2_FROM: you buy one once, it stays where you put it and fires once in every battle. At most TRAP_CAP per lord.
// Plans fought from that day are stamped trapV2 and use the stronger damage; older battles replay with the old numbers.
let TRAPS_V2_FROM = "2026-11-17"; const trapsV2For = d => String(d) >= TRAPS_V2_FROM;
const TRAP_CAP = 4, TOWER_CAP = 2, TRAP_DMG = { spike: 150, blade: 90, bomb: 100 }, TRAP_DMG_V1 = { spike: 90, blade: 60 };
const BOMB_R = 1.6, SAND_SECS = 6; // the bomb hits everything this close to whoever sets it off; the sand pit holds a siege engine this long
const TRAPS = {
  spike: { name: "Spike Pit",  cost: 60, note: `Deals ${TRAP_DMG.spike} damage, ignoring armour, to the first enemy to step in. Fires once each battle.` },
  snare: { name: "Snare",      cost: 40, note: "Holds the first enemy to step in for 3 seconds. No damage. Sets itself again each battle." },
  blade: { name: "Blade Trap",  cost: 90, note: `Fires a volley of blades across the lane at anyone who steps on it, dealing ${TRAP_DMG.blade} damage, ignoring armour, to each enemy in it. Fires once each battle.` },
  bomb:  { name: "Bomb Trap",  cost: 110, note: `Explodes when an enemy steps on it, dealing ${TRAP_DMG.bomb} damage, ignoring armour, to every enemy within ${BOMB_R} tiles. Best against clumps. Fires once each battle.` },
  sand:  { name: "Sand Pit",   cost: 80, note: `Only siege engines sink into it: a ram, catapult or powder cart is stuck for ${SAND_SECS} seconds. Soldiers walk over it. Sets itself again each battle.` },
  tower: { name: "Guard Tower", cost: 150, note: "A stone tower that stands where you place it and shoots enemies in range. It never moves, so it holds the ground without pushing out. Upgrade each one: first to an Arrow Tower, then to an Arrow, Bomb, Magic or Sniper Tower. You can own 2. Towers work best close together and near your castle, backed by your soldiers: alone they can pick off a straggler or two but will not stop an army." },
};

const UNIT_SIM = {
  footman: { range: 1.1, as: 1.0, spd: 1.4, armor: .25 },
  bowman:  { range: 2.5, as: 1.1, spd: 1.4, armor: 0, shot: "#f1e6c0" },
  knight:  { range: 1.1, as: 1.2, spd: 1.05, armor: .25 },
  healer:  { range: 2, as: 1.2, spd: 1.3, armor: .05, heal: 30, shot: "#9cf09c" },
  raider:  { range: 1.1, as: .9, spd: 2.2, armor: .05 },
  mage:    { range: 3, as: 1.7, spd: 1.3, armor: 0, shot: "#9fd8ff", splash: .5 },
  sniper:  { range: 4.5, as: 2.4, spd: 1.0, armor: .1, shot: "#ffd27a" },
  ram:     { range: 1.1, as: 1.25, spd: .8, armor: .1 },
  cart:    { range: 1.0, as: 1, spd: .45, armor: 0 },
  tower:   { range: 3.5, as: 1.3, spd: 0, armor: .25, shot: "#c8d8ff" },
  catapult: { range: 2, as: 3.5, spd: .5, armor: .05, rammer: 1 }, // sets up two tiles from a castle, then lobs a boulder every 3.5 seconds
};

const UNIT_TYPES = { tower: ["pierce", "heavy"], catapult: ["siege", "heavy"], footman: ["blade", "medium"], bowman: ["pierce", "light"], knight: ["blade", "heavy"], healer: ["magic", "light"], raider: ["siege", "medium"], mage: ["magic", "light"], sniper: ["precision", "medium"], ram: ["siege", "heavy"], cart: ["siege", "heavy"] };

const BODY = { tower: [.4, 3.5], catapult: [.46, 4], footman: [.38, 3], guard: [.36, 2.6], militia: [.3, 1.5], knight: [.42, 4.5], raider: [.36, 2.2], mage: [.24, 1], sniper: [.28, 1.4], ram: [.46, 4.2], cart: [.42, 3.5], bowman: [.24, 1], healer: [.24, 1], wolf: [.26, 1.2],
  "c-warrior": [.38, 3.2], "c-mage": [.26, 1.1], "c-archer": [.26, 1.1], "c-shaman": [.28, 1.3], "c-rogue": [.26, 1.1] };
const bodyOf = e => BODY[e.key] || [.3, 1.5];

// Towers: each one you own is upgraded on its own. Guard Tower, then Arrow Tower (needs a Fortress), then one of five level 3 branches (needs a Citadel).
// Each stage is a full unit entry so the battle, replays and sprites treat it like any other body; it just never moves.
Object.assign(UNITS, {
  tower2: { name: "Arrow Tower", cost: 250, hp: 345, atk: 25, tower: true, noUpgrade: true, note: "Longer reach and a faster, harder shot than the Guard Tower. Upgrade it again to pick a branch." },
  towerA: { name: "Arrow Tower III", cost: 400, hp: 480, atk: 38, tower: true, noUpgrade: true, note: "The strongest plain arrow tower: tough, long reach and a quick, hard shot." },
  towerB: { name: "Bomb Tower", cost: 400, hp: 420, atk: 38, tower: true, noUpgrade: true, note: "Lobs bombs that splash most of their damage on enemies next to the target. Ignores armour. Best against clumps." },
  towerM: { name: "Magic Tower", cost: 400, hp: 360, atk: 38, tower: true, noUpgrade: true, note: "Fires magic bolts. Magic is good against light and heavy armour, but weak against castles and walls." },
  towerF: { name: "Fire Tower", cost: 400, hp: 420, atk: 28, tower: true, noUpgrade: true, note: "Fires burning arrows. Weaker than an Arrow Tower III against soldiers, but does four times the damage to siege engines: rams, catapults and powder carts. Build one to guard against siege." },
  towerS: { name: "Sniper Tower", cost: 400, hp: 330, atk: 81, tower: true, noUpgrade: true, note: "Very long range, very high damage, slow shots. Great against light targets and heroes, poor against heavy armour." },
});
Object.assign(UNIT_SIM, {
  tower2: { range: 4, as: 1.2, spd: 0, armor: .25, shot: "#c8d8ff" },
  towerA: { range: 4.5, as: 1.1, spd: 0, armor: .3, shot: "#c8d8ff" },
  towerB: { range: 3.5, as: 2.0, spd: 0, armor: .3, shot: "#ff9a4a", splash: .7 },
  towerM: { range: 4, as: 1.5, spd: 0, armor: .25, shot: "#c89aff" },
  towerF: { range: 4, as: 1.3, spd: 0, armor: .25, shot: "#ff6a2a", vsEngine: 4 },
  towerS: { range: 7, as: 3.0, spd: 0, armor: .25, shot: "#ffe08a" },
});
Object.assign(UNIT_TYPES, { tower2: ["pierce", "heavy"], towerA: ["pierce", "heavy"], towerB: ["pure", "heavy"], towerM: ["magic", "heavy"], towerS: ["precision", "heavy"], towerF: ["pierce", "heavy"] });
Object.assign(UNIT_TIER, { tower2: 1, towerA: 1, towerB: 1, towerM: 1, towerS: 1, towerF: 1 });
Object.assign(BODY, { tower2: [.4, 3.6], towerA: [.4, 3.8], towerB: [.4, 3.6], towerM: [.4, 3.6], towerS: [.38, 3.8], towerF: [.4, 3.6] });
const TOWER_KEYS = ["tower", "tower2", "towerA", "towerB", "towerM", "towerS", "towerF"];
const TOWER_UP = { tower: { to: ["tower2"], cost: 100, tier: 2 }, tower2: { to: ["towerA", "towerF", "towerB", "towerM", "towerS"], cost: 150, tier: 3 } }; // what each stage can become, the gold, and the castle tier it needs
const towerSpent = k => k === "tower" ? 150 : k === "tower2" ? 250 : 400; // gold put into a tower so far; selling returns half
