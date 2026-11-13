// Soldiers and traps: shop data, battle stats, body sizes

const UNITS = {
  footman: { name: "Footman", cost: 50, hp: 380, atk: 13, note: "Tough blocker. Slows whatever it fights, and is hard to push past." },
  bowman:  { name: "Bowman",  cost: 70, hp: 150,  atk: 16, note: "Ranged hero-hunter: +30% damage to heroes." },
  knight:  { name: "Knight",  cost: 120, hp: 420, atk: 30, note: "Heavy armour. Slow." },
  healer:  { name: "Cleric",  cost: 100, hp: 200,  atk: 10,  note: "Heals nearby units." },
  raider:  { name: "Raider",  cost: 110, hp: 230, atk: 30, note: "Fast. Hits castles hard." },
  mage:    { name: "Battle Mage", cost: 140, hp: 170, atk: 27, note: "Casts from a distance. Each bolt also splashes half its damage on enemies next to the target." },
  sniper:  { name: "Dwarven Sniper", cost: 160, hp: 170, atk: 48, note: "Slow, deadly shots from very far away. Great against light targets and heroes, poor against heavy armour." },
  ram:     { name: "Battering Ram", cost: 240, hp: 750, atk: 125, note: "Pushes slowly at castles and ignores soldiers. Hits castles hard, taking about 5 seconds to bring down a tier 1 castle, then moves on to the next one. Very tough.", noBot: true },
  cart:    { name: "Powder Cart", cost: 200, hp: 240, atk: 0, note: "Rolls very slowly at a castle and blows up, enough to flatten a tier 1 castle. The blast hurts every soldier nearby, friend or foe, and also goes off if the cart is destroyed. Can't be trained.", noUpgrade: true, noBot: true },
  catapult: { name: "Catapult", cost: 220, hp: 450, atk: 110, note: "Very slow. Sets up two tiles from a castle, then hurls boulders at it. Hits castles hard from a distance, but cannot fight soldiers, so guard it.", noBot: true },
};
const UNIT_LVL_GAIN = .3; // each soldier level adds this share of base health and attack
const UNIT_TIER = { footman: 1, bowman: 1, knight: 3, raider: 2, healer: 2, mage: 2, sniper: 3, ram: 3, cart: 3, catapult: 3 }; // castle tier that unlocks each soldier
const UNIT_LVL_TIER = [1, 1, 1]; // soldiers can be trained to any level at any castle tier; only weapon and armour upgrades are gated
const TRAPS = {
  spike: { name: "Spike Pit",  cost: 30, note: "Wounds the first enemy to step in." },
  snare: { name: "Snare",      cost: 25, note: "Holds an enemy in place." },
  blade: { name: "Blade Trap",  cost: 45, note: "Wall slots snap open and fire a volley of blades across the lane at anyone who steps on it." },
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
  catapult: { range: 2, as: 3.5, spd: .5, armor: .05, rammer: 1 }, // sets up two tiles from a castle, then lobs a boulder every 3.5 seconds
};

const UNIT_TYPES = { catapult: ["siege", "heavy"], footman: ["blade", "medium"], bowman: ["pierce", "light"], knight: ["blade", "heavy"], healer: ["magic", "light"], raider: ["siege", "medium"], mage: ["magic", "light"], sniper: ["precision", "medium"], ram: ["siege", "heavy"], cart: ["siege", "heavy"] };

const BODY = { catapult: [.46, 4], footman: [.38, 3], guard: [.36, 2.6], militia: [.3, 1.5], knight: [.42, 4.5], raider: [.36, 2.2], mage: [.24, 1], sniper: [.28, 1.4], ram: [.46, 4.2], cart: [.42, 3.5], bowman: [.24, 1], healer: [.24, 1], wolf: [.26, 1.2],
  "c-warrior": [.38, 3.2], "c-mage": [.26, 1.1], "c-archer": [.26, 1.1], "c-shaman": [.28, 1.3], "c-rogue": [.26, 1.1] };
const bodyOf = e => BODY[e.key] || [.3, 1.5];
