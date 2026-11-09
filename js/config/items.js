// Gear, castle defences and shop items

const GEAR = {
  weapon: [{ name: "Iron Blade", cost: 60, desc: "+15% attack" }, { name: "Steel Blade", cost: 120, desc: "+30% attack" }, { name: "Runed Blade", cost: 200, desc: "+45% attack, heals 10% of damage dealt" }],
  armour: [{ name: "Padded Coat", cost: 60, desc: "+15% health" }, { name: "Chainmail", cost: 120, desc: "+30% health, 10% less damage taken" }, { name: "Plate Armour", cost: 200, desc: "+45% health, 20% less damage taken" }],
  charm:  [{ name: "Hare's Foot", cost: 50, desc: "+15% move speed" }, { name: "Sage's Amulet", cost: 110, desc: "Also: abilities recharge 20% faster" }, { name: "Phoenix Feather", cost: 180, desc: "Also: revives twice as fast, at full health" }],
};
const GEAR_SLOTS = [["weapon", "Weapon"], ["armour", "Armour"], ["charm", "Charm"]];
const DEFENCES = {
  walls: [{ name: "Stone Walls", cost: 100, desc: "+25% castle health" }, { name: "Bastions", cost: 180, desc: "+50% castle health" }],
  tower: [{ name: "Arrow Slits", cost: 90, desc: "Castle shoots 50% harder" }, { name: "Ballista", cost: 170, desc: "Castle shoots twice as hard, and further" }],
};

const ITEM_SLOTS = 6;
const ITEMS = {
  boots:       { name: "Boots of Speed",     g: "»", col: "#5aa0d8", cost: 80,  tier: 1, kind: "passive", desc: "+10% move speed. Catch the fleeing, or run from the strong." },
  gauntlets:   { name: "Gauntlets of Power", g: "✊", col: "#c9962f", cost: 100, tier: 1, kind: "passive", desc: "+15% attack damage." },
  ringprot:    { name: "Ring of Protection", g: "◎", col: "#8aa0b8", cost: 90,  tier: 1, kind: "passive", desc: "Take 8% less damage from everything." },
  salve:       { name: "Healing Salve",      g: "✚", col: "#58b85c", cost: 50,  tier: 1, kind: "use", cd: 45, desc: "Below half health: heals 35% of your health." },
  elixir:      { name: "Elixir of Fury",     g: "☄", col: "#d8503a", cost: 60,  tier: 1, kind: "use", cd: 30, desc: "When you engage a foe: +25% attack speed for 8s." },
  net:         { name: "Snare Net",          g: "#", col: "#c9a46a", cost: 70,  tier: 1, kind: "use", cd: 25, desc: "Roots the nearest enemy hero within 4 tiles for 2.5s." },
  frostdagger: { name: "Frostbrand Dagger",  g: "❄", col: "#8fd3ff", cost: 110, tier: 2, kind: "passive", desc: "Your attacks slow the target by 30% for 1.5s." },
  venomorb:    { name: "Orb of Venom",       g: "☠", col: "#7ab83a", cost: 110, tier: 2, kind: "passive", desc: "Your attacks poison for 7 damage per second for 3s." },
  fang:        { name: "Vampiric Fang",      g: "♥", col: "#b8322a", cost: 130, tier: 2, kind: "passive", desc: "Heal for 12% of the damage you deal." },
  thornmail:   { name: "Spiked Mail",        g: "✶", col: "#9aa3ab", cost: 110, tier: 2, kind: "passive", desc: "Reflects 15% of the damage you take from melee attackers." },
  talisman:    { name: "Talisman of Will",   g: "✦", col: "#b48cff", cost: 90,  tier: 2, kind: "passive", desc: "Stuns and snares on you last 60% shorter." },
  scroll:      { name: "Scroll of Retreat",  g: "↺", col: "#b48cff", cost: 90,  tier: 2, kind: "use", cd: 90, desc: "Below 30% health with foes near: teleports you home and heals 20%." },
  banner:      { name: "Banner of Might",    g: "⚑", col: "#e2b33c", cost: 140, tier: 2, kind: "aura", desc: "Aura: allies within 3 tiles deal 12% more damage." },
  standard:    { name: "Iron Standard",      g: "⛨", col: "#7fb2ff", cost: 140, tier: 2, kind: "aura", desc: "Aura: allies within 3 tiles take 12% less damage." },
  mender:      { name: "Mender's Charm",     g: "❀", col: "#9cf09c", cost: 150, tier: 3, kind: "aura", desc: "Aura: heals allies within 3 tiles for 4 health per second." },
};
