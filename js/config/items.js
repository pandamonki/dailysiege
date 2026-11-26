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
  // cheap starter items: small bonuses at small prices, so a hero can carry three by day 2
  whetstone:   { name: "Whetstone",          g: "▲", col: "#b8b8c0", cost: 35,  tier: 1, kind: "passive", desc: "+7% attack damage." },
  jerkin:      { name: "Leather Jerkin",     g: "▣", col: "#a8783c", cost: 35,  tier: 1, kind: "passive", desc: "+6% health." },
  sandals:     { name: "Swift Sandals",      g: "›", col: "#7ac0a0", cost: 30,  tier: 1, kind: "passive", desc: "+6% move speed." },
  buckler:     { name: "Iron Buckler",       g: "◍", col: "#9aa8b8", cost: 40,  tier: 1, kind: "passive", desc: "Take 4% less damage from everything." },
  herbs:       { name: "Mending Herbs",      g: "❦", col: "#6ac86a", cost: 50,  tier: 1, kind: "passive", desc: "Regenerate 0.6% of your health every second." },
  boots:       { name: "Boots of Speed",     g: "»", col: "#5aa0d8", cost: 80,  tier: 1, kind: "passive", desc: "+10% move speed. Catch the fleeing, or run from the strong." },
  gauntlets:   { name: "Gauntlets of Power", g: "✊", col: "#c9962f", cost: 100, tier: 1, kind: "passive", desc: "+15% attack damage." },
  ringprot:    { name: "Ring of Protection", g: "◎", col: "#8aa0b8", cost: 90,  tier: 1, kind: "passive", desc: "Take 8% less damage from everything." },
  salve:       { name: "Healing Salve",      g: "✚", col: "#58b85c", cost: 60,  tier: 1, kind: "use", cd: 45, desc: "Below half health: heals 35% of your health." },
  elixir:      { name: "Elixir of Fury",     g: "☄", col: "#d8503a", cost: 60,  tier: 1, kind: "use", cd: 30, desc: "When you engage a foe: +25% attack speed for 8s." },
  net:         { name: "Snare Net",          g: "#", col: "#c9a46a", cost: 70,  tier: 1, kind: "use", cd: 25, desc: "Roots the nearest enemy hero within 4 tiles for 2.5s." },
  frostdagger: { name: "Orb of Frost",       g: "❄", col: "#8fd3ff", cost: 110, tier: 2, kind: "passive", orb: 1, desc: "A frost orb circles you. Your attacks chill the target, slowing it by 30% for 1.5s." },
  venomorb:    { name: "Orb of Poison",      g: "☠", col: "#7ab83a", cost: 110, tier: 2, kind: "passive", orb: 1, desc: "A green poison orb circles you. Your attacks poison for 7 damage per second for 3s." },
  fireorb:     { name: "Orb of Fire",        g: "♨", col: "#ff7a2a", cost: 130, tier: 2, kind: "passive", orb: 1, desc: "A blazing orb circles you. Your attacks explode: 35% of the damage splashes onto foes within 1.3 tiles of the target." },
  corruptorb:  { name: "Orb of Corruption",  g: "☯", col: "#b050e0", cost: 130, tier: 2, kind: "passive", orb: 1, desc: "A dark orb circles you. Your attacks corrupt the target: it takes 15% more damage from everyone for 3s." },
  evasion:     { name: "Talisman of Evasion", g: "≋", col: "#d8e8a0", cost: 110, tier: 2, kind: "passive", desc: "20% chance to dodge a normal attack." },
  hpring:      { name: "Ring of Health",     g: "♡", col: "#e06a7a", cost: 125,  tier: 1, kind: "passive", desc: "+8% health, and you regenerate 1.2% of your health every second." },
  fang:        { name: "Vampiric Fang",      g: "♥", col: "#b8322a", cost: 130, tier: 2, kind: "passive", desc: "Heal for 12% of the damage you deal." },
  thornmail:   { name: "Spiked Mail",        g: "✶", col: "#9aa3ab", cost: 110, tier: 2, kind: "passive", desc: "Reflects 15% of the damage you take from melee attackers." },
  talisman:    { name: "Talisman of Will",   g: "✦", col: "#b48cff", cost: 90,  tier: 2, kind: "passive", desc: "Stuns and snares on you last 60% shorter." },
  scroll:      { name: "Rune of Homecoming", g: "ᚱ", col: "#b48cff", cost: 220, tier: 3, kind: "use", cd: 0, desc: "Once per battle, the moment your castle is attacked: you and every ally within 4 tiles are teleported back to base. Reusable every day." },
  vanguard:    { name: "Vanguard",           g: "⛊", col: "#6f8fa8", cost: 120, tier: 2, kind: "passive", desc: "+15% health, and blocks 12 damage from every normal hit you take. Soldiers' blows barely scratch you." },
  antimagic:   { name: "Anti-Magic Shell",   g: "◉", col: "#7ad6c4", cost: 200, tier: 2, kind: "use", cd: 30, desc: "When you engage an enemy hero, after a delay you choose (1 to 10s): 5s of 70% magic resistance against hero abilities and ultimates. Time it to catch their ultimate.", descV2: "The moment you engage an enemy hero, if it is off cooldown: 5s of 70% magic resistance against hero abilities and ultimates." },
  crystalys:   { name: "Crystalys",          g: "◆", col: "#e0705a", cost: 120, tier: 2, kind: "passive", desc: "Your attacks have a 20% chance to crit for 1.6x damage." },
  banner:      { name: "Banner of Might",   g: "⚑", col: "#e2b33c", cost: 250, tier: 3, kind: "aura", desc: "Aura: allies within 3 tiles deal 12% more damage." },
  standard:    { name: "Iron Standard",      g: "⛨", col: "#7fb2ff", cost: 250, tier: 3, kind: "aura", desc: "Aura: allies within 3 tiles take 12% less damage." },
  rapier:      { name: "Divine Rapier",     g: "⚔", col: "#ffd34d", cost: 1000, fixed: true, tier: 3, kind: "passive", unique: true, desc: "Doubles your hero's damage. Drops where you fall: any hero can grab it and keep it." },
  mender:      { name: "Mender's Charm",     g: "❀", col: "#9cf09c", cost: 150, tier: 3, kind: "aura", desc: "Aura: heals allies within 3 tiles for 4 health per second." },
  pipe:        { name: "Pipe of Insight",    g: "⌘", col: "#6aa8ff", cost: 250, tier: 3, kind: "aura", desc: "Aura: you and allies within 3 tiles take 25% less damage from enemy hero abilities and ultimates." },
  shiva:       { name: "Shiva's Guard",      g: "❅", col: "#9fe4ff", cost: 190, tier: 3, kind: "use", cd: 40, desc: "Take 6% less damage. When 2 or more foes are within 3 tiles: a freezing blast hits them for 140 damage and slows them 40% for 4s." },
  daedalus:    { name: "Daedalus",           g: "✠", col: "#ff7a3a", cost: 200, tier: 3, kind: "passive", desc: "+15% attack damage. Your attacks have a 25% chance to crit for 2.4x damage." },
};
// From BAL_V4_FROM the stat items are twice as strong for the hero (ITEM_BOOST in sim/battle.js) and the area-buff items are stronger (AURA_BOOST). These are the texts shown then.
const ITEM_DESC_V4 = {
  whetstone: "+14% attack damage.", jerkin: "+12% health.", sandals: "+12% move speed.", buckler: "Take 8% less damage from everything.",
  boots: "+20% move speed. Catch the fleeing, or run from the strong.", gauntlets: "+30% attack damage.", ringprot: "Take 16% less damage from everything.",
  hpring: "+16% health, and you regenerate 1.2% of your health every second.", vanguard: "+30% health, and blocks 12 damage from every normal hit you take. Soldiers' blows barely scratch you.",
  shiva: "Take 12% less damage. When 2 or more foes are within 3 tiles: a freezing blast hits them for 140 damage and slows them 40% for 4s.",
  daedalus: "+30% attack damage. Your attacks have a 25% chance to crit for 2.4x damage.",
  banner: "Aura: allies within 3 tiles deal 24% more damage.", standard: "Aura: allies within 3 tiles take 24% less damage.",
  mender: "Aura: heals allies within 3 tiles for 8 health per second.", pipe: "Aura: you and allies within 3 tiles take 50% less damage from enemy hero abilities and ultimates.",
};
// Flat items from ITEMS_V5_FROM (ITEM_FLAT in sim/battle.js): stat items add flat amounts to the hero, the Iron Standard's aura is 18%
let ITEMS_V5_FROM = "2026-11-17"; const itemsV5For = d => String(d) >= ITEMS_V5_FROM;
// Survivor bonus from SURV_FROM: +1 point to a lord whose hero is alive when the battle ends (SURVIVOR_PTS in sim/battle.js)
let SURV_FROM = "2026-11-17"; const survFor = d => String(d) >= SURV_FROM;
// Anti-Magic Shell v2 from SHELL_V2_FROM: no chosen delay. It fires the moment the hero engages an enemy hero, whenever it is off cooldown
let SHELL_V2_FROM = "2026-11-20"; const shellV2For = d => String(d) >= SHELL_V2_FROM;
// Items v6 from ITEMS_V6_FROM (ITEM_V6 in sim/battle.js): weaker Salve and Ring of Health; stronger Shell, Rune, Will, Orb of Fire, Crystalys, Pipe, Boots
let ITEMS_V6_FROM = "2026-11-20"; const itemsV6For = d => String(d) >= ITEMS_V6_FROM;
const ITEM_DESC_V6 = {
  salve: "Below half health: heals 220 health.", hpring: "+120 health, and you regenerate 8 health every second.",
  boots: "+0.42 tiles a second move speed. Catch the fleeing, or run from the strong.",
  antimagic: "The moment you engage an enemy hero, if it is off cooldown: 7.5s immune to magic. Hero abilities, ultimates and magic attacks do no damage.",
  scroll: "When your castle is attacked or you drop below 30% health, away from home: a 1.5s channel, then you and every ally within 4 tiles are teleported back to base. 45s cooldown.",
  talisman: "Stuns, roots, slows and silences on you last 75% shorter.",
  fireorb: "A blazing orb circles you. Your attacks explode: 50% of the damage splashes onto foes within 1.5 tiles of the target.",
  crystalys: "Your attacks have a 25% chance to crit for 1.8x damage.",
  pipe: "Aura: you and allies within 4 tiles take 60% less damage from enemy hero abilities and ultimates.",
  rapier: "+100 damage on every attack (abilities are not affected). Drops where you fall: any hero can grab it and keep it.",
};
// Items v7 (balance v5, battles from BAL_V5_FROM; ITEM_V7 in sim/battle.js): the regeneration items were too strong for their price
const ITEM_DESC_V7 = { herbs: "Regenerate 3 health every second.", hpring: "+120 health, and you regenerate 5 health every second.", mender: "Aura: heals allies within 3 tiles for 5 health per second." };
const ITEM_DESC_V5 = {
  whetstone: "+6 attack damage.", jerkin: "+100 health.", sandals: "+0.2 tiles a second move speed.", buckler: "Blocks 3 damage from every normal hit you take.",
  herbs: "Regenerate 5 health every second.", boots: "+0.35 tiles a second move speed. Catch the fleeing, or run from the strong.", gauntlets: "+12 attack damage.",
  ringprot: "Blocks 6 damage from every normal hit you take.", salve: "Below half health: heals 300 health.", elixir: "When you engage a foe: 0.2 seconds faster between attacks for 8s.",
  hpring: "+140 health, and you regenerate 10 health every second.", vanguard: "+260 health, and blocks 12 damage from every normal hit you take. Soldiers' blows barely scratch you.",
  shiva: "Blocks 5 damage from every normal hit. When 2 or more foes are within 3 tiles: a freezing blast hits them for 140 damage and slows them 40% for 4s.",
  daedalus: "+12 attack damage. Your attacks have a 25% chance to crit for 2.4x damage.",
  banner: "Aura: allies within 3 tiles deal 24% more damage.", standard: "Aura: allies within 3 tiles take 18% less damage.",
  mender: "Aura: heals allies within 3 tiles for 8 health per second.", pipe: "Aura: you and allies within 3 tiles take 50% less damage from enemy hero abilities and ultimates.",
};
// the attack damage a hero's items add on top of its own (flat items): shown in green beside the base damage
const ITEM_ATK = { whetstone: 6, gauntlets: 12, daedalus: 12, rapier: 100 };
const itemAtk = items => (items || []).reduce((a, k) => a + (ITEM_ATK[k] || 0), 0);
const atkSplit = (base, extra) => `<span class="batk">${Math.round(base)}</span>${extra ? `<span class="iatk">+${Math.round(extra)}</span>` : ""}`;
// day: a replayed battle is described as it was fought
// Aura items v2 (plans stamped auraV2, battles from AURA_V2_FROM; AURA_V2 in sim/battle.js): no aura is stronger than 30%, and Mender's Charms from several heroes do not stack
let AURA_V2_FROM = "2026-11-27"; const auraV2For = d => String(d) >= AURA_V2_FROM;
const ITEM_DESC_AURA2 = { pipe: "Aura: you and allies within 4 tiles take 30% less damage from enemy hero abilities and ultimates.", mender: "Aura: heals allies within 3 tiles for 5 health per second. Several Mender's Charms in range do not stack." };
const itemDesc = (k, day) => { const it = ITEMS[k]; if (!it) return ""; const d = day || (typeof isLive === "function" && isLive() ? liveClock().planDay : null);
  if ((!d || auraV2For(d)) && ITEM_DESC_AURA2[k]) return ITEM_DESC_AURA2[k];
  if ((!d || balV5For(d)) && ITEM_DESC_V7[k]) return ITEM_DESC_V7[k];
  if ((!d || itemsV6For(d)) && ITEM_DESC_V6[k]) return ITEM_DESC_V6[k];
  if (k === "antimagic" && (!d || shellV2For(d))) return it.descV2;
  if (!d || itemsV5For(d)) return ITEM_DESC_V5[k] || it.desc; return balV4For(d) && ITEM_DESC_V4[k] ? ITEM_DESC_V4[k] : it.desc; };
