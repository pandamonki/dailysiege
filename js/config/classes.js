// Hero classes, their abilities, base stats, cooldowns and damage types

// ================= game data =================
const CLASSES = {
  warrior: { name: "Warrior", role: "Frontline tank", trait: "Blade attacks and heavy armour. Holds the front line and cuts through medium-armoured foes.", abilities: [
    { key: "a1", name: "Cleave", desc: "Hits all nearby enemies.", choice: [["Bleed", "Cleave leaves a 3s bleed"], ["Wide Arc", "Bigger cleave radius"]] },
    { key: "a2", name: "Shield Wall", desc: "Reduces damage taken for 4s.", choice: [["Reflect", "Returns 20% of blocked damage"], ["Bulwark", "Also shields adjacent allies"]] },
    { key: "a3", name: "War Cry", desc: "Nearby units attack harder.", choice: [["Fear", "Enemies flee for 1s"], ["Second Wind", "Also heals your units a little"]] } ],
    ult: { name: "Last Stand", desc: "Cannot die for 5 seconds." } },
  mage: { name: "Mage", role: "Area damage", trait: "Magic damage across whole groups, but light armour and low health. Backs off when engaged.", abilities: [
    { key: "a1", name: "Fireball", desc: "Strong single-target blast.", choice: [["Burn", "Leaves damage over time"], ["Explosion", "Splashes nearby enemies"]] },
    { key: "a2", name: "Frost Nova", desc: "Slows enemies around you.", choice: [["Deep Freeze", "Roots for 1s"], ["Shatter", "Frozen enemies take +25%"]] },
    { key: "a3", name: "Blink", desc: "Short teleport.", choice: [["Escape", "Blinks away when HP drops low"], ["Ambush", "Next Fireball after Blink crits"]] } ],
    ult: { name: "Meteor", desc: "Huge area hit after a 2s delay." } },
  archer: { name: "Archer", role: "Ranged kiter", trait: "Pierce damage from the longest range. Stops to shoot, then repositions whenever melee gets close.", abilities: [
    { key: "a1", name: "Piercing Shot", desc: "Hits every enemy in a line.", choice: [["Armour Break", "Targets take +15% damage"], ["Ricochet", "Bounces to one more target"]] },
    { key: "a2", name: "Volley", desc: "Spreads damage over an area.", choice: [["Fire Arrows", "Area keeps burning"], ["Barrage", "Fires twice"]] },
    { key: "a3", name: "Evasion", desc: "Chance to dodge attacks.", choice: [["Counter", "Dodges trigger a free shot"], ["Kite", "Steps back after dodging"]] } ],
    ult: { name: "Rain of Arrows", desc: "Sustained fire over a wide area." } },
  shaman: { name: "Shaman", role: "Hybrid caster", trait: "Magic damage with medium armour, mixing healing with chain lightning.", abilities: [
    { key: "a1", name: "Healing Totem", desc: "Heals nearby allies over time.", choice: [["Ward", "Totem also blocks one hit"], ["Spring", "Bigger heal, shorter life"]] },
    { key: "a2", name: "Lightning Bolt", desc: "Chains between enemies.", choice: [["Overload", "More chain jumps"], ["Stun", "First target stunned 1s"]] },
    { key: "a3", name: "Bloodlust", desc: "Your units attack faster.", choice: [["Frenzy", "Bigger speed boost"], ["Lifesteal", "Units heal on hit"]] } ],
    ult: { name: "Spirit Wolves", desc: "Summons 2 wolves for the fight." } },
  rogue: { name: "Rogue", role: "Hit and run", trait: "Precision daggers shred light armour but struggle against heavy. Hits anything below half health 60% harder and heals 12% of the damage dealt. Strikes, then slips away.", abilities: [
    { key: "a1", name: "Backstab", desc: "Big damage from behind.", choice: [["Execute", "Bonus against low-HP targets"], ["Cripple", "Target is slowed"]] },
    { key: "a2", name: "Smoke Bomb", desc: "Enemies lose track of you.", choice: [["Vanish", "Untargetable for 2s"], ["Choke", "Smoke also silences"]] },
    { key: "a3", name: "Poison Blade", desc: "Damage over time on hit.", choice: [["Venom", "Poison stacks"], ["Weaken", "Poisoned enemies deal less"]] } ],
    ult: { name: "Assassinate", desc: "Executes a low-HP target." } },
};

const CHAMP = {
  warrior: { hp: 760, atk: 28, range: 1.1, as: 1.0, spd: 1.7, armor: .25 },
  mage:    { hp: 370, atk: 24, range: 2, as: 1.2, spd: 1.5, armor: 0, shot: "#ff8a2a" },
  archer:  { hp: 430, atk: 19, range: 2.5, as: .9, spd: 1.8, armor: .05, shot: "#f1e6c0" },
  shaman:  { hp: 560, atk: 22, range: 1.6, as: 1.1, spd: 1.6, armor: .18, shot: "#8fd3ff" },
  rogue:   { hp: 450, atk: 32, range: 1.1, as: .8, spd: 2.4, armor: .05 },
};

const PASSIVE = { archer: "a3", rogue: "a3" };
const COOLDOWN = {
  warrior: { a1: 6, a2: 14, a3: 16, ult: 60 }, mage: { a1: 5, a2: 10, a3: 12, ult: 45 }, archer: { a1: 7, a2: 9, a3: 0, ult: 45 },
  shaman: { a1: 14, a2: 7, a3: 18, ult: 50 }, rogue: { a1: 6, a2: 14, a3: 0, ult: 40 },
};

const CLASS_TYPES = { warrior: ["blade", "heavy"], mage: ["magic", "light"], archer: ["pierce", "light"], shaman: ["magic", "medium"], rogue: ["precision", "medium"] };
