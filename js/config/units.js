// Soldiers and traps: shop data, battle stats, body sizes

const UNITS = {
  footman: { name: "Footman", cost: 50, hp: 380, atk: 13, note: "Tough blocker. Slows whatever it fights, and is hard to push past." },
  bowman:  { name: "Bowman",  cost: 70, hp: 140,  atk: 13, note: "Ranged hero-hunter: +30% damage to heroes." },
  knight:  { name: "Knight",  cost: 120, hp: 420, atk: 30, note: "Heavy armour. Slow." },
  healer:  { name: "Cleric",  cost: 100, hp: 200,  atk: 10,  note: "Heals nearby units." },
  raider:  { name: "Raider",  cost: 110, hp: 250, atk: 34, note: "Fast. Hits castles hard." },
};
const TRAPS = {
  spike: { name: "Spike Pit",  cost: 30, note: "Wounds the first enemy to step in." },
  snare: { name: "Snare",      cost: 25, note: "Holds an enemy in place." },
  bell:  { name: "Alarm Bell", cost: 20, note: "Reveals where a betrayal comes from." },
};

const UNIT_SIM = {
  footman: { range: 1.1, as: 1.0, spd: 1.4, armor: .25 },
  bowman:  { range: 2.5, as: 1.1, spd: 1.4, armor: 0, shot: "#f1e6c0" },
  knight:  { range: 1.1, as: 1.2, spd: 1.05, armor: .25 },
  healer:  { range: 2, as: 1.2, spd: 1.3, armor: .05, heal: 30, shot: "#9cf09c" },
  raider:  { range: 1.1, as: .9, spd: 2.2, armor: .05 },
};

const UNIT_TYPES = { footman: ["blade", "medium"], bowman: ["pierce", "light"], knight: ["blade", "heavy"], healer: ["magic", "light"], raider: ["siege", "medium"] };

const BODY = { footman: [.38, 3], guard: [.36, 2.6], militia: [.3, 1.5], knight: [.42, 4.5], raider: [.36, 2.2], bowman: [.24, 1], healer: [.24, 1], wolf: [.26, 1.2],
  "c-warrior": [.38, 3.2], "c-mage": [.26, 1.1], "c-archer": [.26, 1.1], "c-shaman": [.28, 1.3], "c-rogue": [.26, 1.1] };
const bodyOf = e => BODY[e.key] || [.3, 1.5];
