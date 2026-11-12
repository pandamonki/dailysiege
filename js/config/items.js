// Gear, castle defences and shop items

const GEAR = {
  weapon: [{ name: "Iron Blade", cost: 60, desc: "All soldiers +15% attack" }, { name: "Steel Blade", cost: 120, desc: "All soldiers +30% attack" }, { name: "Runed Blade", cost: 200, desc: "All soldiers +45% attack, heal 10% of damage dealt" }],
  armour: [{ name: "Padded Coat", cost: 60, desc: "All soldiers +15% health" }, { name: "Chainmail", cost: 120, desc: "All soldiers +30% health, 10% less damage taken" }, { name: "Plate Armour", cost: 200, desc: "All soldiers +45% health, 20% less damage taken" }],
  charm:  [{ name: "Hare's Foot", cost: 50, desc: "+15% move speed" }, { name: "Sage's Amulet", cost: 110, desc: "Also: abilities recharge 20% faster" }, { name: "Phoenix Feather", cost: 180, desc: "Also: you return from the dead twice as fast" }],
};
const GEAR_SLOTS = [["weapon", "Weapon"], ["armour", "Armour"], ["charm", "Charm"]];
const DEFENCES = {
  walls: [{ name: "Stone Walls", cost: 100, desc: "+25% castle health" }, { name: "Bastions", cost: 180, desc: "+50% castle health" }],
  tower: [{ name: "Arrow Slits", cost: 90, desc: "Castle shoots 50% harder" }, { name: "Ballista", cost: 170, desc: "Castle shoots twice as hard, and further" }],
};

const ITEM_SLOTS = 6;
const ITEM_MULT = [1, 1.4, 1.8]; // shop price by item tier: everything is always on sale, higher tiers just cost more
const itemCost = k => { const it = ITEMS[k]; return it.fixed ? it.cost : Math.round(it.cost * ITEM_MULT[it.tier - 1] / 5) * 5; };
const ITEMS = {
  boots:       { name: "Boots of Speed",     g: "»", col: "#5aa0d8", cost: 80,  tier: 1, kind: "passive", desc: "+10% move speed. Catch the fleeing, or run from the strong." },
  gauntlets:   { name: "Gauntlets of Power", g: "✊", col: "#c9962f", cost: 100, tier: 1, kind: "passive", desc: "+15% attack damage." },
  ringprot:    { name: "Ring of Protection", g: "◎", col: "#8aa0b8", cost: 90,  tier: 1, kind: "passive", desc: "Take 8% less damage from everything." },
  salve:       { name: "Healing Salve",      g: "✚", col: "#58b85c", cost: 50,  tier: 1, kind: "use", cd: 45, desc: "Below half health: heals 35% of your health." },
  elixir:      { name: "Elixir of Fury",     g: "☄", col: "#d8503a", cost: 60,  tier: 1, kind: "use", cd: 30, desc: "When you engage a foe: +25% attack speed for 8s." },
  net:         { name: "Snare Net",          g: "#", col: "#c9a46a", cost: 70,  tier: 1, kind: "use", cd: 25, desc: "Roots the nearest enemy hero within 4 tiles for 2.5s." },
  frostdagger: { name: "Orb of Frost",       g: "❄", col: "#8fd3ff", cost: 110, tier: 2, kind: "passive", orb: 1, desc: "A frost orb circles you. Your attacks chill the target, slowing it by 30% for 1.5s." },
  venomorb:    { name: "Orb of Poison",      g: "☠", col: "#7ab83a", cost: 110, tier: 2, kind: "passive", orb: 1, desc: "A green poison orb circles you. Your attacks poison for 7 damage per second for 3s." },
  fireorb:     { name: "Orb of Fire",        g: "♨", col: "#ff7a2a", cost: 130, tier: 2, kind: "passive", orb: 1, desc: "A blazing orb circles you. Your attacks explode: 35% of the damage splashes onto foes within 1.3 tiles of the target." },
  corruptorb:  { name: "Orb of Corruption",  g: "☯", col: "#b050e0", cost: 130, tier: 2, kind: "passive", orb: 1, desc: "A dark orb circles you. Your attacks corrupt the target: it takes 15% more damage from everyone for 3s." },
  evasion:     { name: "Talisman of Evasion", g: "≋", col: "#d8e8a0", cost: 110, tier: 2, kind: "passive", desc: "20% chance to dodge a normal attack." },
  hpring:      { name: "Ring of Health",     g: "♡", col: "#e06a7a", cost: 90,  tier: 1, kind: "passive", desc: "+8% health, and you regenerate 1.2% of your health every second." },
  fang:        { name: "Vampiric Fang",      g: "♥", col: "#b8322a", cost: 130, tier: 2, kind: "passive", desc: "Heal for 12% of the damage you deal." },
  thornmail:   { name: "Spiked Mail",        g: "✶", col: "#9aa3ab", cost: 110, tier: 2, kind: "passive", desc: "Reflects 15% of the damage you take from melee attackers." },
  talisman:    { name: "Talisman of Will",   g: "✦", col: "#b48cff", cost: 90,  tier: 2, kind: "passive", desc: "Stuns and snares on you last 60% shorter." },
  scroll:      { name: "Rune of Homecoming", g: "ᚱ", col: "#b48cff", cost: 220, tier: 3, kind: "use", cd: 0, desc: "Once per battle, the moment your castle is attacked: you and every ally within 4 tiles are teleported back to base. Reusable every day." },
  vanguard:    { name: "Vanguard",           g: "⛊", col: "#6f8fa8", cost: 120, tier: 2, kind: "passive", desc: "+15% health, and blocks 12 damage from every normal hit you take. Soldiers' blows barely scratch you." },
  antimagic:   { name: "Anti-Magic Shell",   g: "◉", col: "#7ad6c4", cost: 200, tier: 2, kind: "use", cd: 30, desc: "When you engage an enemy hero, after a delay you choose (1 to 10s): 5s of 70% magic resistance against hero abilities and ultimates. Time it to catch their ultimate." },
  crystalys:   { name: "Crystalys",          g: "◆", col: "#e0705a", cost: 120, tier: 2, kind: "passive", desc: "Your attacks have a 20% chance to crit for 1.6x damage." },
  banner:      { name: "Banner of Might",   g: "⚑", col: "#e2b33c", cost: 140, tier: 2, kind: "aura", desc: "Aura: allies within 3 tiles deal 12% more damage." },
  standard:    { name: "Iron Standard",      g: "⛨", col: "#7fb2ff", cost: 140, tier: 2, kind: "aura", desc: "Aura: allies within 3 tiles take 12% less damage." },
  rapier:      { name: "Divine Rapier",     g: "⚔", col: "#ffd34d", cost: 1000, fixed: true, tier: 3, kind: "passive", unique: true, desc: "Doubles your hero's damage. Drops where you fall: any hero can grab it and keep it." },
  mender:      { name: "Mender's Charm",     g: "❀", col: "#9cf09c", cost: 150, tier: 3, kind: "aura", desc: "Aura: heals allies within 3 tiles for 4 health per second." },
  pipe:        { name: "Pipe of Insight",    g: "⌘", col: "#6aa8ff", cost: 170, tier: 3, kind: "aura", desc: "Aura: you and allies within 3 tiles take 25% less damage from enemy hero abilities and ultimates." },
  shiva:       { name: "Shiva's Guard",      g: "❅", col: "#9fe4ff", cost: 190, tier: 3, kind: "use", cd: 40, desc: "Take 6% less damage. When 2 or more foes are within 3 tiles: a freezing blast hits them for 140 damage and slows them 40% for 4s." },
  daedalus:    { name: "Daedalus",           g: "✠", col: "#ff7a3a", cost: 200, tier: 3, kind: "passive", desc: "+15% attack damage. Your attacks have a 25% chance to crit for 2.4x damage." },
};
