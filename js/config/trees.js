// Hero skill trees (version 3 heroes): three trees per class, six nodes per tree, base stats, learning rules.
// Spec: docs/hero-skill-trees.md. The numbers here are the single source for the battle sim, the hero screen and the bots.
// Battles fought before HERO_V3_FROM keep the old abilities (ABIL in sim/battle.js); nothing here touches them.

// The first day heroes use skill trees (battles on or after this day; earlier saved battles replay with the old abilities).
let HERO_V3_FROM = "2026-11-12"; const heroV3For = d => String(d) >= HERO_V3_FROM;
const MAX_HERO_LVL_V3 = 15, TREE_ULT_LVL = 9;
const heroMaxLvl = v3 => (v3 ? MAX_HERO_LVL_V3 : MAX_HERO_LVL);
// per-level growth: level 15 is about the old level 21 with partial Vigour
const hpLvV3 = L => 1 + .12 * (L - 1), atkLvV3 = L => 1 + .09 * (L - 1);

// node order inside a tree: T1 passive, T2 trigger, T2b side talent, T3 synergy, T3b side talent, T4 ultimate
const TREE_NODE = ["t1", "t2", "t2b", "t3", "t3b", "t4"];
const TREE_MAX = [4, 4, 2, 2, 1, 1];   // ranks
const TREE_NEED = [0, 2, 2, 5, 5, 7];  // points already spent in this tree (side talents count)
const TREE_PRE = [-1, 0, 0, 1, 1, 3];  // index of the node that needs at least one rank first
const TREE_BKEY = ["b1", "b2", "b3"];

// N(name, kind, icon, description, values, art, cooldown)
//   description: {0}, {1} ... are replaced by the rank's value from values[0], values[1] ...
//   art: [colour, symbol, effect, radius, "t" to play it on the target] for the spell animation of active skills
const TN = (name, kind, ic, desc, v, art, cd) => ({ name, kind, ic, desc, v: v || [], art: art || null, cd: cd || 0 });

const TREES = {
  warrior: [
    { id: "vanguard", name: "Vanguard", role: "Tank", nodes: [
      TN("Iron Clad", "passive", "warrior_a2", "+{0}% max health. Take {1}% less physical damage.", [[6, 10, 15], [4, 7, 10]]),
      TN("Taunting Shout", "trigger", "warrior_a3", "When 2+ enemies attack an ally, taunts enemies within 2 tiles for 3s (half on heroes) and shields you for {0}% max health for 6s.", [[8, 11, 15]], ["#e2a33c", "horn", "ring", 2], 14),
      TN("Shield Bash", "trigger", "warrior_a1", "When an enemy hero hits you in melee, bashes it for {0} + attack x.5 and stuns it for .5s.", [[30, 45]], ["#7fb2ff", "shield", "burst", 1.2, "t"], 12),
      TN("Unyielding Stance", "synergy", "warrior_a2", "While you hold a shield, your soldiers within 2 tiles take {0}% less damage, and each Taunting Shout shields them for {1}% of your shield.", [[8, 12], [10, 15]]),
      TN("Spiked Bulwark", "passive", "warrior_a2", "While you hold a shield, reflect 15% of melee damage taken."),
      TN("Fortress Wall", "ultimate", "warrior_ult", "When 3+ soldiers are near and an enemy ranged attacker is within 6: a dome of radius 2.5 for 7s. Allies inside take 60% less damage from ranged attackers and heal 3% max health a second.", [], ["#7fb2ff", "shield", "shield", 2.5]),
    ] },
    { id: "berserker", name: "Berserker", role: "Burst", nodes: [
      TN("Cleave", "passive", "warrior_a1", "Basic attacks also hit up to 2 enemies within 1.2 tiles of the target for {0}% damage.", [[20, 28, 35]]),
      TN("Executioner's Whirlwind", "trigger", "warrior_a1", "When an enemy within 1.5 tiles is under 30% health, spin for 2s, hitting everything within 1.6 tiles for {0} + attack x.4 every .5s. A hero kill refunds half the cooldown.", [[22, 30, 38]], ["#d9d9e0", "slash", "arc", 1.8], 10),
      TN("Bloodthirst", "passive", "warrior_a1", "Each kill heals you for {0}% of your max health.", [[3, 5]]),
      TN("Blood Rage", "synergy", "warrior_a3", "Kills by you or your melee soldiers within 3 tiles give +{0}% attack speed, up to 6 stacks. Stacks fade 6s after the last kill.", [[4, 5]]),
      TN("Unstoppable", "passive", "warrior_a3", "Slows and roots on you last 40% shorter. Below 30% health you deal +15% damage."),
      TN("Avatar of War", "ultimate", "warrior_ult", "Below 40% health with 3+ enemies within 2.5 tiles: for 7s you cannot drop below 1 health, ignore crowd control, attack 50% faster, and your attacks splash and stun soldiers. Heals 25% on cast.", [], ["#ffe082", "sunburst", "pillar", 1.4]),
    ] },
    { id: "tactician", name: "Tactician", role: "Army", nodes: [
      TN("Marching Cadence", "passive", "warrior_a3", "Your soldiers move +{0}% faster until their first attack or first hit taken.", [[8, 14, 20]]),
      TN("Command Banner", "trigger", "warrior_a3", "When you engage an enemy hero or siege engine, plant a banner for 10s. Allies within 3.5 tiles of it deal +{0}% damage to the toughest enemy near the banner.", [[12, 18, 25]], ["#e2a33c", "horn", "ring", 3.5], 22),
      TN("Fortify", "passive", "warrior_a2", "Your wall blocks and castle guard have +{0}% max health.", [[20, 40]]),
      TN("Sapper Coordination", "synergy", "warrior_a1", "Inside a Command Banner, units deal +{0}% damage to castles and walls.", [[15, 25]]),
      TN("Fear", "passive", "warrior_a3", "Planting a Command Banner stuns enemy soldiers within 2 tiles for 1s."),
      TN("Rallying Charge", "ultimate", "warrior_ult", "With 4+ soldiers alive and an enemy castle or hero within 7 tiles: for 8s your soldiers gain +60% speed, +20% damage and crowd-control immunity, and each first strike stuns for .8s.", [], ["#e2a33c", "horn", "ring", 4]),
    ] },
  ],
  shaman: [
    { id: "storm", name: "Storm", role: "Magic burst", nodes: [
      TN("Static Surge", "passive", "shaman_a2", "Basic attacks deal +{0}% damage and arc to 1 enemy within 2 tiles for {1}%.", [[4, 7, 10], [30, 40, 50]]),
      TN("Chain Lightning", "trigger", "shaman_a2", "When 3+ enemies cluster within 4.5 tiles, a bolt chains up to {0} targets for {1} + attack x.5 magic damage (x.85 per jump) and slows them 20% for 4s.", [[3, 4, 4], [80, 100, 120]], ["#9fd0ff", "bolt", "bolt", 1, "t"], 9),
      TN("Thunderclap", "trigger", "shaman_a2", "When 3+ enemies are within 1.5 tiles, blasts them for {0} + attack x.4 magic damage and slows them 25% for 2s.", [[30, 45]], ["#9fd0ff", "bolt", "nova", 1.6], 10),
      TN("Conductive Discharge", "synergy", "shaman_a2", "Targets hit by Chain Lightning take +{0}% damage from allied bowmen, mages, snipers and centaurs for 8s.", [[12, 20]]),
      TN("Overload", "passive", "shaman_a2", "Chain Lightning jumps to 2 more targets."),
      TN("Chrono-Storm", "ultimate", "shaman_ult", "When 5+ enemies are packed near a point within 5 tiles: a storm of radius 3 for 6s that pulls enemies in, burns them and cuts their attack speed by 40%.", [], ["#9fd0ff", "bolt", "nova", 3, "t"]),
    ] },
    { id: "totemic", name: "Totemic", role: "Field control", nodes: [
      TN("Grounding Totem", "passive", "shaman_a1", "Every 14s in combat, plants a totem for 7s. Allies within 2.5 tiles take {0}% less physical damage and heal {1} a second.", [[6, 9, 12], [5, 8, 11]], ["#7fe08a", "totem", "heal", 2.5]),
      TN("Earthgrab Totem", "trigger", "shaman_a1", "When an enemy hero or siege engine comes within 3 tiles, roots up to {0} nearby enemies for {1}s (half on heroes and siege).", [[2, 3, 3], [2, 2.5, 3]], ["#8a5a2b", "totem", "ring", 3], 16),
      TN("Ward Totem", "passive", "shaman_a1", "Each Grounding Totem blocks the first {0} enemy hero attacks aimed at allies inside it.", [[1, 2]]),
      TN("War Drum Pulse", "synergy", "shaman_a3", "While a Grounding Totem stands, every 4s your soldiers within 4 tiles gain +{0}% attack speed for 4s, and melee soldiers +{1}% damage to castles and walls.", [[12, 20], [10, 15]]),
      TN("Healing Spring", "passive", "shaman_a1", "Grounding Totem heals 50% more."),
      TN("Totem of the Titan", "ultimate", "shaman_a1", "When 4+ allies and 3+ enemies are within 3 tiles: a relic for 8s that soaks 40% of damage aimed at nearby allies and pulses stuns.", [], ["#7fe08a", "totem", "heal", 3]),
    ] },
    { id: "ancestral", name: "Ancestral", role: "Drain", nodes: [
      TN("Spirit Leech", "passive", "shaman_a3", "Heal for {0}% of spell and ability damage dealt.", [[6, 10, 15]]),
      TN("Ancestral Grasp", "trigger", "shaman_a3", "When below 50% health, drains the 3 nearest enemies within 3 tiles for {0} + attack x.5 and shields you for the total for 6s.", [[50, 65, 80]], ["#c9a0ff", "blood", "swirl", 3], 18),
      TN("Hex", "trigger", "shaman_a3", "When an enemy hero within 3 tiles drops below 50% health, it deals 20% less damage for {0}s.", [[2, 3]], ["#c9a0ff", "skull", "swirl", 1.2, "t"], 18),
      TN("Last Stand Offering", "synergy", "shaman_a3", "While your castle or you are below 35% health, Spirit Leech is x{0} and you attack {1}% faster.", [[1.5, 2], [15, 25]]),
      TN("Blood Pact", "passive", "shaman_a3", "Your soldiers within 4 tiles heal for 10% of the damage they deal."),
      TN("Spirit Wolves", "ultimate", "shaman_ult", "An enemy hero within 4 tiles, or 4+ enemies packed: stuns enemies within 2 tiles and summons 3 wolves for 30s that heal you as they bite.", [], ["#c9d6e3", "wolf", "swirl", 2.2]),
    ] },
  ],
  rogue: [
    { id: "shadow", name: "Shadow", role: "Infiltration", nodes: [
      TN("Shadowstep", "passive", "rogue_a2", "Begin the battle and every respawn in stealth, and move +{0}% faster while hidden. Stealth breaks when you strike, and enemies within 1 tile can still see you.", [[10, 18, 25]]),
      TN("Ambush", "trigger", "rogue_a1", "Your first strike from stealth hits for ({0} + attack) x1.8 and stuns for {1}s (half on heroes).", [[40, 60, 80], [1, 1.25, 1.5]], ["#d34a4a", "dagger", "arc", 1, "t"]),
      TN("Smoke Bomb", "trigger", "rogue_a2", "When 3+ enemies are within 2 tiles, blinds them (40% miss) for {0}s and makes them drop you as a target.", [[2, 3]], ["#9a9aa8", "smoke", "smoke", 2], 16),
      TN("Vanish", "synergy", "rogue_a2", "A kill hides you for 3s and re-arms Ambush. Cooldown {0}s (hero kills ignore it).", [[12, 9]]),
      TN("Cheap Shot", "passive", "rogue_a1", "Ambush also silences its target for 1.5s."),
      TN("Shadow Dance", "ultimate", "rogue_ult", "When 3+ backline enemies are within 6 tiles: untargetable for 4s while striking up to 5 of them for 60% of Ambush damage each.", [], ["#b02a5a", "skull", "streak", 1, "t"]),
    ] },
    { id: "venom", name: "Venom", role: "Poison", nodes: [
      TN("Poisoned Blades", "passive", "rogue_a3", "Each hit adds a poison stack: {0} damage a second per stack for 6s, up to 5 stacks. Poisoned enemies are healed {1}% less.", [[3, 4, 5], [15, 22, 30]]),
      TN("Caltrop Bomb", "trigger", "rogue_a3", "When 3+ enemy melee units are within 2.5 tiles, throws a zone of radius 1.2 for 5s dealing {0} a second and slowing {1}%. Adds poison.", [[6, 9, 12], [40, 50, 60]], ["#7ad84a", "drop", "swirl", 1.2], 14),
      TN("Crippling Poison", "passive", "rogue_a3", "Poisoned enemies move {0}% slower.", [[10, 15]]),
      TN("Corrosive Agent", "synergy", "rogue_a3", "Poisoned enemies take +{0}% physical damage from all sources.", [[8, 12]]),
      TN("Weakening Toxin", "passive", "rogue_a3", "Enemies at 5 poison stacks deal 15% less damage."),
      TN("Deadly Cloud", "ultimate", "rogue_ult", "When 5+ enemies are packed near a point within 4 tiles: a poison cloud of radius 2 for 7s that blinds them and adds 2 stacks a second.", [], ["#7ad84a", "drop", "smoke", 2, "t"]),
    ] },
    { id: "duelist", name: "Duelist", role: "Evasion", nodes: [
      TN("Reflexes", "passive", "rogue_a1", "+{0}% chance to dodge non-area physical attacks.", [[8, 14, 20]]),
      TN("Riposte", "trigger", "rogue_a1", "On a dodge, counter-attacks for attack x{0} and slows the attacker's attacks 30% for 4s.", [[1, 1.25, 1.5]], ["#d34a4a", "dagger", "arc", 1, "t"]),
      TN("Backstab", "passive", "rogue_a1", "Deal +{0}% damage to a target that is attacking someone else.", [[15, 25]]),
      TN("Flurry", "synergy", "rogue_a1", "Each dodge gives +{0}% attack speed for 5s, up to 5 stacks.", [[5, 8]]),
      TN("Evasive Roll", "passive", "rogue_a2", "Once per life, below 30% health, vanish for 1.5s and step 2 tiles away."),
      TN("Blade Fury", "ultimate", "rogue_ult", "When an enemy hero is within 1.5 tiles and you are below 70% health: for 5s dodge every direct attack and deliver 8 armour-ignoring strikes to it.", [], ["#b02a5a", "dagger", "streak", 1, "t"]),
    ] },
  ],
  mage: [
    { id: "pyromancy", name: "Pyromancy", role: "Burst and burn", nodes: [
      TN("Ignite", "passive", "mage_a1", "Spells and abilities add a burn worth {0}% of their damage over 4s.", [[8, 12, 15]]),
      TN("Fireball", "trigger", "mage_a1", "When 3+ enemies cluster within 4.5 tiles, blasts them for {0} + attack in radius 1.3. Soldiers are stunned .5s.", [[90, 125, 165]], ["#ff7a2a", "fire", "burst", 1.3, "t"], 7),
      TN("Combustion", "passive", "mage_a1", "When a burning enemy dies it explodes for {0} magic damage within 1 tile.", [[30, 45]]),
      TN("Melt Armour", "synergy", "mage_a1", "Burning enemies take +{0}% physical damage.", [[10, 15]]),
      TN("Pyroblast", "passive", "mage_a1", "Fireball deals 50% more to its centre target if that is a hero."),
      TN("Meteor Strike", "ultimate", "mage_ult", "When 5+ enemies or an enemy castle are within a blast within 6 tiles: a meteor (1.6s warning) that stuns, wrecks castles and walls, and leaves burning ground.", [], ["#ff5a2a", "meteor", "meteor", 3, "t"]),
    ] },
    { id: "frost", name: "Frost", role: "Control", nodes: [
      TN("Chilling Touch", "passive", "mage_a2", "Basic attacks slow movement and attack speed by {0}% for 3s.", [[8, 12, 15]]),
      TN("Frost Nova", "trigger", "mage_a2", "When an enemy melee unit comes within 2 tiles, blasts radius 2 for {0} + attack x.5 and roots for {1}s (half on heroes).", [[45, 60, 75], [1.5, 2, 2.5]], ["#8fd8ff", "snow", "nova", 2], 11),
      TN("Shatter", "passive", "mage_a2", "Rooted or frozen enemies take +{0}% damage from all sources.", [[12, 20]]),
      TN("Ice Barrier", "synergy", "mage_a2", "Each Frost Nova shields you for {0}% max health and nearby allies for {1}% of theirs for 5s.", [[12, 20], [6, 10]]),
      TN("Cold Snap", "passive", "mage_a2", "Once per life, below 35% health, Frost Nova is ready again."),
      TN("Blizzard", "ultimate", "mage_ult", "When 6+ enemies are packed near a point within 6 tiles: an 8s blizzard of radius 4 that slows 50%, cuts attack speed 30% and freezes them with damage.", [], ["#8fd8ff", "snow", "nova", 4, "t"]),
    ] },
    { id: "arcane", name: "Arcane", role: "Utility", nodes: [
      TN("Arcane Mastery", "passive", "mage_a3", "+{0} tiles of attack and spell reach. Your units within 3 tiles gain +{1}% magic resist.", [[.3, .4, .5], [5, 8, 10]]),
      TN("Blink & Disrupt", "trigger", "mage_a3", "When hurt below 70% health by an enemy hero ability or a melee attacker, blinks 3 tiles toward your castle and silences enemies near the start for {0}s.", [[1, 1.5, 2]], ["#c9a0ff", "blink", "swirl", 1.5], 16),
      TN("Mana Shield", "trigger", "mage_a3", "Below 50% health, gains a shield of {0}% max health for 6s.", [[15, 25]], ["#c9a0ff", "shield", "shield", 1], 30),
      TN("Empowered Synergies", "synergy", "mage_a3", "Your spells ignore {0}% of the target's magic resist and damage reduction. Your other abilities recharge {1}% faster.", [[20, 30], [10, 15]]),
      TN("Arcane Missiles", "passive", "mage_a3", "Every 4th basic attack also fires 2 bolts at other enemies within 3 tiles for 50% damage."),
      TN("Time Warp", "ultimate", "mage_ult", "When 4+ allies and 2+ enemy heroes, or 6+ enemies, are within 5 tiles: for 6s allies in radius 5 gain +50% speed and enemy heroes' cooldowns freeze.", [], ["#c9a0ff", "blink", "nova", 5]),
    ] },
  ],
  archer: [
    { id: "marksman", name: "Marksman", role: "Ranged damage", nodes: [
      TN("Eagle Eye", "passive", "archer_a1", "+{0} tiles of range and +{1}% damage.", [[.2, .35, .5], [5, 9, 12]]),
      TN("Arrow Volley", "trigger", "archer_a2", "When 3+ enemies cluster within range + 2 tiles, rains arrows (radius 1.5) for {0} + attack x.5 and slows 30% for 3s.", [[30, 42, 55]], ["#c8e07a", "volley", "rain", 1.6, "t"], 9),
      TN("Ricochet", "passive", "archer_a1", "Basic attacks have a {0}% chance to bounce to another enemy for 50% damage.", [[15, 25]]),
      TN("Pinning Shot", "synergy", "archer_a1", "Targets hit by Arrow Volley take +{0}% damage from all pierce sources for 6s.", [[10, 15]]),
      TN("Barrage", "passive", "archer_a2", "Arrow Volley fires a second volley for half damage."),
      TN("Rain of Feathered Death", "ultimate", "archer_ult", "When 4+ enemies cluster near your target: a huge arrow storm (radius 3.4, 14 waves) that also cuts their attack speed by 40%.", [], ["#ffd36a", "rain", "rain", 2.5, "t"]),
    ] },
    { id: "trapper", name: "Trapper", role: "Kiting", nodes: [
      TN("Fleet Footed", "passive", "archer_a3", "+{0}% move speed and +{1}% dodge against melee. After a dodge, step away.", [[6, 10, 15], [8, 12, 15]]),
      TN("Spike Trap", "trigger", "archer_a1", "When an enemy melee unit comes within 2 tiles, drops a trap (8s) that deals {0} + attack and roots for {1}s (half on heroes).", [[40, 60, 80], [1.5, 2, 2.5]], ["#c7ccd1", "dagger", "burst", 1], 10),
      TN("Net Shot", "trigger", "archer_a1", "When an enemy hero comes within 3 tiles, roots it for {0}s.", [[1, 1.5]], ["#c9a46a", "feather", "ring", 1, "t"], 20),
      TN("Entangling Wire", "synergy", "archer_a3", "When a Spike Trap goes off, enemies within {0} tiles are slowed {1}% for 4s.", [[1, 1.4], [35, 50]]),
      TN("Quick Hands", "passive", "archer_a3", "Spike Trap recharges 30% faster."),
      TN("Barricade & Minefield", "ultimate", "archer_ult", "When 4+ enemies close in within 5 tiles: raises 2 walls toward them and lays 3 spike traps in front.", [], ["#c9a46a", "feather", "ring", 2.5]),
    ] },
    { id: "sniper", name: "Sniper", role: "Hero hunting", nodes: [
      TN("Focused Aim", "passive", "archer_a1", "Each consecutive basic attack on one target adds +{0}% crit chance, up to 5 stacks. Crits deal x1.75.", [[4, 7, 10]]),
      TN("Headshot", "trigger", "archer_a1", "When an enemy hero is in range, aims for 1.2s then fires ({0} + attack x2) x1.5. Always crits and silences for 1s. Cancelled if the target escapes.", [[70, 100, 130]], ["#e6e6c8", "arrow", "streak", 1, "t"], 16),
      TN("Hunter's Mark", "passive", "archer_a1", "The Headshot target takes +{0}% damage from all sources for 6s.", [[8, 12]]),
      TN("Armour Piercer", "synergy", "archer_a1", "Headshot ignores {0}% of armour and adds a bleed of 2% of the target's max health a second for 5s.", [[30, 50]]),
      TN("Bounty Hunter", "passive", "archer_a1", "Your lord earns 50% more gold from your kills of enemy heroes."),
      TN("Dragon-Slayer Shot", "ultimate", "archer_ult", "When an enemy hero within 9 tiles is under 50% health or carries the bounty: a telegraphed bolt for 500 + attack x6, hurting the line behind it. Capped at half the target hero's health.", [], ["#e6e6c8", "arrow", "streak", 1.4, "t"]),
    ] },
  ],
};

// skill icons: warrior, shaman, rogue and mage have their own art per skill (icons/skills/<class>_<tree>_<node>.webp); archer is still pending
const TREE_ART_CLASSES = ["warrior", "shaman", "rogue", "mage"];
TREE_ART_CLASSES.forEach(cls => TREES[cls].forEach((tr, bi) => tr.nodes.forEach((n, i) => { n.ic = `${cls}_${TREE_BKEY[bi]}_${TREE_NODE[i]}`; })));

// base heroes for skill-tree battles (hp, attack, armour, magic resist, range, attack speed, speed)
const CHAMP_V3 = {
  warrior: { hp: 760, atk: 28, armor: .28, mres: 0,   range: 1.1, as: 1.0, spd: 1.7 },
  shaman:  { hp: 540, atk: 22, armor: .18, mres: .10, range: 2.0, as: 1.1, spd: 1.6, shot: "#8fd3ff" },
  archer:  { hp: 500, atk: 25, armor: .05, mres: 0,   range: 3.0, as: .9,  spd: 2.0, shot: "#f1e6c0" },
  mage:    { hp: 420, atk: 28, armor: 0,   mres: .20, range: 2.5, as: 1.2, spd: 1.6, shot: "#ff8a2a" },
  rogue:   { hp: 480, atk: 33, armor: .08, mres: .05, range: 1.1, as: .8,  spd: 2.4 },
};

// ----- learning rules -----
const emptyTree = () => ({ b1: [0, 0, 0, 0, 0, 0], b2: [0, 0, 0, 0, 0, 0], b3: [0, 0, 0, 0, 0, 0] });
const cleanTree = tr => { const o = emptyTree(); TREE_BKEY.forEach(b => { const a = tr && tr[b]; if (Array.isArray(a)) o[b] = TREE_MAX.map((m, i) => Math.max(0, Math.min(m, a[i] | 0))); }); return o; };
const treePts = (tr, b) => ((tr && tr[b]) || []).reduce((s, x) => s + (x || 0), 0);
const treeSpentAll = tr => TREE_BKEY.reduce((s, b) => s + treePts(tr, b), 0);
const treeFree = (tr, L) => Math.max(0, Math.min(L, MAX_HERO_LVL_V3) - treeSpentAll(tr)); // one point per level, starting with level 1 (15 in all)
const treeHasUlt = tr => TREE_BKEY.some(b => ((tr && tr[b]) || [])[5] > 0);
// why a node can't be learned yet: the list of unmet requirements, each { ok, text }
function treeNeeds(tr, b, i, L) {
  const row = (tr && tr[b]) || [0, 0, 0, 0, 0, 0], sp = treePts(tr, b), out = [];
  if (row[i] >= TREE_MAX[i]) return { maxed: true, list: [] };
  if (TREE_NEED[i] > 0) out.push({ ok: sp >= TREE_NEED[i], text: `Spend ${TREE_NEED[i]} points in this tree (${Math.min(sp, TREE_NEED[i])} of ${TREE_NEED[i]})`, miss: Math.max(0, TREE_NEED[i] - sp) });
  if (TREE_PRE[i] >= 0) out.push({ ok: row[TREE_PRE[i]] > 0, text: `Learn ${TREE_NAME_OF(b, TREE_PRE[i])}`, miss: row[TREE_PRE[i]] > 0 ? 0 : 1 });
  if (i === 5) { out.push({ ok: L >= TREE_ULT_LVL, text: `Hero level ${TREE_ULT_LVL} (now ${L})`, miss: 0 }); out.push({ ok: !treeHasUlt(tr), text: "Only one ultimate per hero", miss: 0 }); }
  return { maxed: false, list: out };
}
let TREE_NAME_CLS = "warrior"; // the class whose names treeNeeds() prints (set by the caller)
const TREE_NAME_OF = (b, i) => TREES[TREE_NAME_CLS][TREE_BKEY.indexOf(b)].nodes[i].name;
function treeCanLearn(tr, b, i, L) {
  if (treeFree(tr, L) < 1) return false;
  const n = treeNeeds(tr, b, i, L); return !n.maxed && n.list.every(x => x.ok);
}
// the value of a node at a rank: nodeVal(cls, treeIndex, nodeIndex, valueIndex, rank)
const nodeVal = (cls, bi, i, vi, rank) => ext(TREES[cls][bi].nodes[i].v[vi], rank);
const nodeDesc = (cls, bi, i, rank) => { const n = TREES[cls][bi].nodes[i]; return n.desc.replace(/\{(\d)\}/g, (_, k) => { const a = n.v[+k]; if (!a) return "?"; const x = ext(a, Math.max(1, rank || 1)); return Number.isInteger(x) ? x : +x.toFixed(2); }); };
// spell animations for every active skill: the sim plays "v3_<class>_<tree>_<node>" through the usual SPELL_ART effects
const treeSp = (cls, bi, i) => `v3_${cls}_${TREE_BKEY[bi]}_${TREE_NODE[i]}`;
Object.keys(TREES).forEach(cls => TREES[cls].forEach((tr, bi) => tr.nodes.forEach((n, i) => { if (n.art) SPELL_ART[treeSp(cls, bi, i)] = { n: n.name, c: n.art[0], sym: n.art[1], fx: n.art[2], r: n.art[3], ...(n.art[4] ? { at: n.art[4] } : {}) }; })));
