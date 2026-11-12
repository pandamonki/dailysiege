# Hero Skill Trees: implementation spec

This spec replaces the current hero abilities (three abilities with four ranks, a two-way choice
each, an ultimate with three ranks, and Vigour) with three skill trees per hero. It is written for
the model that implements it. Read all of it before you change any code.

**Status: approved design, not yet built.** This is a major feature. Open the pull request, but do
not merge it without the user's go-ahead (see `CLAUDE.md`).

---

## 0. What changed from the original plan, and why

The user's plan is the starting point. Changes made during review:

1. **The rock-paper-scissors loop contradicted itself.** The plan had both "Warrior beats Ranger"
   and "Ranger beats Warrior", and both "Mage beats Shaman" and "Shaman beats Mage". The fixed loop
   below gives each hero two wins and two losses. It also agrees with the existing damage-type table.
2. **The plan's tree maths didn't add up.** A tree had four nodes but needed 8 points to reach the
   ultimate, and how ranks worked wasn't defined. Fixed: Tier 1 has 2 ranks, Tier 2 has 3, Tier 3
   (synergy) has 2 and Tier 4 has 1. A full tree costs 8 points, and the ultimate is the 8th point.
   A second tree with 6 points reaches its synergy at full rank. 8 + 6 = 14 still holds.
3. **A 2-day ultimate cooldown means about one ultimate per war.** Ultimates unlock at level 9,
   which is day 4 or 5. With a two-day rest, most players would fire once. Decided: a **1-day
   rest**, which is the current rule. The ultimate is armed in orders and rests the day after it
   fires, so every hero gets at most two ultimates per war (§1.3).
4. **Map-wide effects are cut to an area.** Blizzard, Dragon-Slayer Shot and Time Warp would hit
   up to 11 rival lords at once in a 12-lord free-for-all.
5. **Ranges are rescaled to the real map.** Today the Archer shoots 2.5 tiles and the Dwarven Sniper
   4.5. A Ranger with 5 tiles plus Eagle Eye's +2 would outrange castles and every soldier.
6. **Concepts the game doesn't have are mapped or dropped.** There are no lanes, gates, panic,
   knockback, line of sight or "backline" in this free-for-all ring map. See §2 for the mapping.
   Knockback is replaced everywhere by a short stun or slow. Physics pushes would collide with
   walls and risk determinism.
7. **Stun, root and taunt durations are cut.** Today's longest hero control is a 2.5s Snare Net.
   The plan's 3-4s stuns and roots on heroes would decide fights alone.
8. **Infinite loops are capped.** Whirlwind resetting on a kill, Vanish resetting Ambush, and
   Riposte all chain endlessly in fights full of 150-HP soldiers. Each now has an internal cooldown.
9. **Good mechanics kept from today's game:**
   - Arming the ultimate for a chosen night.
   - The Shaman's Spirit Wolves, as the Ancestral ultimate (in place of the plan's Spirit Walk).
   - The Warrior's Last Stand cheat-death, folded into Avatar of War.
   - The Rogue's finishing-blow trait, kept as the Rogue's innate.
   - Bloodlust, which becomes War Drum Pulse.
   - The Healing Totem entity, reused for Grounding Totem.
   - Blink-to-escape.
   - The Archer's Kite step.
   - Meteor damaging castles.
   - Reuse of the existing trap and wall objects for the Ranger's Trapper tree.
10. **The per-ability trigger dropdown goes.** Each skill has the built-in condition from the plan.
    This cuts planning time, which the backlog flags as a problem. Ultimates keep the "Plan the
    ultimate for tonight" toggle. The If/Then rules in the orders are unchanged.
11. **Vigour is removed.** All 14 points go into trees. Per-level stat growth rises to make up
    for the lost levels and Vigour (§1.4).

---

## 1. Core rules

### 1.1 Levels and points
- `MAX_HERO_LVL = 15`. One skill point per level from 2 to 15 = **14 points**.
- Level gain per battle is unchanged: `MIN_GAIN = 2`, `XP_CAP = 3`, and the centre XP bonus.
  Heroes reach level 9 on day 4 or 5 and the cap on day 6 or 7.

### 1.2 Tree structure (the same for every class)
| Node | Max ranks | Needs points already spent in this tree |
|---|---|---|
| T1 (passive) | 2 | 0 |
| T2 (trigger) | 3 | 2 |
| T3 (synergy) | 2 | 4 |
| T4 (ultimate) | 1 | 7, and hero level ≥ 9 |

- A full tree is 2 + 3 + 2 + 1 = 8 points. Valid builds include:
  - 8/6/0: an ultimate, plus a second tree's synergy at rank 2 (2 + 2 + 2) or at rank 1 with a
    maxed trigger (2 + 3 + 1);
  - 7/7/0: two full synergies, no ultimate;
  - 8/4/2 and so on.
- Rank values are written `[r1, r2]` for T1 and T3, and `[r1, r2, r3]` for T2.
- Only one T4 is possible, because 8 + 8 > 14.
- Points can't be refunded mid-war, matching today's rule. Class choice stays locked after day 1.

### 1.3 Ultimate
- Learned as the T4 node. It fires only on nights the player arms it (the existing `ultArm`
  toggle) and only once per battle.
- It **rests the day after it fires** (a 1-day cooldown). This is the existing `ultCooling()`
  rule. Keep it; don't build a 2-day cooldown.
- When it unlocks. The hero's level at the start of day N's battle is 1 plus the levels gained on
  earlier days (2 to 3 a day). The ultimate needs level 9 and must be learned before orders seal,
  so it can't be armed the same day it's learned mid-battle.

  | Day | Start level, 2 a day | Start level, 3 a day |
  |---|---|---|
  | 1 | 1 | 1 |
  | 2 | 3 | 4 |
  | 3 | 5 | 7 |
  | 4 | 7 | 10 |
  | 5 | 9 | 13 |
  | 6 | 11 | 15 (cap) |
  | 7 | 13 | 15 |

  - The slowest hero first fires on day 5, then day 7: two ultimates.
  - The fastest can fire on day 4, then day 6 or 7. Still two at most.
  - Today's heroes unlock the ultimate at level 5 (day 3) and can fire on days 3, 5 and 7. So the
    new system already gives fewer ultimates, and they **don't need scaling down for the 1-day
    rest**. The values in §6 are set at roughly today's rank 2 ultimate power, with the "v2" −25%
    already applied. The outliers were cut in the power review (§6.0).
- Each ultimate has a built-in condition (below). If the condition never comes true, the ultimate
  isn't spent and doesn't rest.

### 1.4 Stat growth (replaces Vigour)
- `hpLv = L => 1 + .12 * (L - 1)` and `atkLv = L => 1 + .09 * (L - 1)`. These replace .08 and .06,
  so that level 15 ≈ old level 21 with partial Vigour. The balance lab will tune them (§7).
- Remove `a4` / Vigour from the data, UI, `autoRanks` and the sim (behind the version gate, §5).

### 1.5 Mid-battle level-ups
- Today `autoPick` spends points on its own. In the new system the player saves a **learning
  path**, which is the ordered list of all 14 picks, on the hero screen.
- When a hero levels up mid-battle, it takes the next legal pick in the path.
- If there's no path, fall back to: the deepest tree first, then the next legal node in that tree.
- Bots use a seeded path from §6.

---

## 2. Mapping the plan's words to this game

| Plan term | In this game |
|---|---|
| Keep | The lord's castle (`P[pid].castle`) |
| Gates, barricades, towers, structures | Castles and wall blocks (`walls[]`) |
| Siege Engine | Battering Ram, Powder Cart, Ogre Breaker (`e.ram`, `e.cart`, `rammer`) |
| Footmen/Knights, Bowmen, Mages | Units `footman`, `knight`, `bowman`, `mage` (Battle Mage); mercs count by type |
| Backline | Any hostile non-castle with `range >= 2` (ranged units and Mage, Ranger and Shaman heroes) |
| "Lane tile" / "across the lane" | The line from the caster towards the nearest enemy cluster |
| Physical damage | Any attack type except `magic` (blade, pierce, precision, siege, pure) |
| Phys Armor % | The existing `armor` field (flat damage reduction, capped at .8) |
| Magic Resist % | New field `mres`: extra reduction on `magic`-type damage only |
| Stealth | New `stealth` effect (see §4) |
| Knockback, knock-down | **Dropped.** Use a short `stun` instead (values given per skill) |
| Panic | Doesn't exist. Use `cc immunity` (the existing Desperation Frenzy rule) |
| Line of sight, miss rate | The existing `blind` effect, with the miss chance made configurable |
| Map-wide | Radius-limited (values given per skill) |
| Ranger | Display name only. **Keep the internal key `archer`**: saves, sprites (`hero_archer.webp`, `c-archer`), `SPELL_ART` and `CLASS_TYPES` all use it |

---

## 3. Base heroes

The existing damage-type system stays: attack type × armour class from `TYPE_TABLE`, then `armor`.
Add `mres` (new) on top for magic damage.

| Class (key) | HP | atk | armor | mres | Range | as | spd | Attack / armour class |
|---|---|---|---|---|---|---|---|---|
| Warrior (`warrior`) | 760 | 28 | .28 | 0 | 1.1 | 1.0 | 1.7 | blade / heavy |
| Shaman (`shaman`) | 540 | 22 | .18 | .10 | 2.0 | 1.1 | 1.6 | magic / medium |
| Ranger (`archer`) | 500 | 25 | .05 | 0 | 3.0 | .9 | 2.0 | pierce / light |
| Mage (`mage`) | 420 | 28 | 0 | .20 | 2.5 | 1.2 | 1.6 | magic / light |
| Rogue (`rogue`) | 480 | 33 | .08 | .05 | 1.1 | .8 | 2.4 | precision / medium |

- Shaman HP rises less than the plan's 650. The Shaman already wins 17% of balance-lab battles
  (fair is 10%) and gains more sustain from its trees.
- **Rogue innate (kept):** +60% damage against targets below 50% HP (`FINISH_AT`/`FINISH_BONUS`).
  The new version also heals the Rogue for 12% of that bonus damage.

### 3.1 Counter loop (each hero beats two and loses to two)
- **Warrior beats Rogue and Shaman.** Heavy armour blunts precision (×.5); blade hits medium ×1.25.
- **Rogue beats Mage and Ranger.** Stealth reaches fragile casters; precision hits light ×1.5.
- **Mage beats Warrior and Shaman.** Magic hits heavy ×1.25, and burst breaks through sustain.
- **Shaman beats Rogue and Ranger.** Totems and drains outlast chip damage and dives; magic hits
  light ×1.25.
- **Ranger beats Warrior and Mage.** Kites slow melee, outranges the Mage, and pierce hits light ×1.5.

This is a soft guide for tuning, not a hard rule. Heroes fight inside armies.

---

## 4. New sim primitives (build these first)

Put all of these in `js/sim/battle.js`. Use only `detmath` maths and the battle's `rng()`. Never
use `Math.random` or `Math.sin` and friends.

| Primitive | Spec |
|---|---|
| `shield` | `e.shield` absorbs damage before HP, after all multipliers. Stacks additively, capped at 40% of max HP. Each grant has its own expiry; store as a list `[{amt, until}]` and drain the oldest first. Shows as a bar overlay in the replay. |
| `taunt` | `setFx(o, "taunt", dur)` with `o.tauntBy = src`. While active and `src` is alive, `pickTarget` returns `src`. Heroes get half duration. Castles, rams and carts are immune. |
| `stealth` | `setFx(e, "stealth", dur)`. Treat it like `vanish` for targeting, except a hostile within `e.revealR` (default 1.0) can see and target it. Breaks when the stealthed unit deals damage. Not untargetable by area damage. |
| `untargetable` | Reuse the existing `vanish` effect (immune to targeting, still hit by area damage) for Shadow Dance. |
| Crit on basic attacks | `e.crit` (chance) and `e.critMul` (default 1.75). Roll with `rng()` in the basic-attack path only. Spells pass `crit` explicitly. |
| Dodge | Generalise the current `evade`: `e.dodge = {all, melee}`. Melee means `src.range < 1.5`. It still only applies to non-area hits. Total dodge is capped at 40%, except during Blade Fury. Hook `onDodge(e, src)` for Riposte, Flurry and Kite. |
| Anti-heal | `setFx(o, "grievous", dur, v)`: `heal()` multiplies the amount by `1 - v`. |
| Blind miss chance | Make the existing 50% configurable: `setFx(o, "blind", dur, missChance)`, defaulting to .5 when `val` is 1. |
| `mres` | In `deal()`, after the type table: `if (atype === "magic") m *= 1 - (tgt.mres + fxv(tgt, "mresbuf"))`. |
| Physical damage reduction | `fxv(tgt, "physred")` and `e.physRed` apply only when the attack type isn't magic. |
| Ground zones | `zones[]` of `{pid, x, y, r, until, every, next, fn}`. Ticked in the main loop like `pending`. Used for caltrops, burning ground, the poison cloud, Blizzard and Chrono-Storm. Zones only affect hostiles of the owner. |
| Pull | `pull(o, x, y, dist)` moves a non-castle and non-siege body towards the point, at most `dist`. It never moves into a wall: stop at the last free point, using the existing `wallAt`. |
| Cooldown freeze | `setFx(o, "cdfreeze", dur)`. While active, add `DT` to each of `o.cds` every tick (cooldowns don't progress). |
| Internal cooldowns | `e.icd[name] = t + x`. Check `e.icd[name] > t` before proc effects. |
| Auras | Compute each tick, or every 5 ticks for speed, from the caster's position. Apply as short `setFx` refreshes (duration .6s) so they fall off when out of range. |

CC rules (keep consistent):
- Desperation Frenzy and Avatar of War block stun, root, slow, taunt and frozen. This is the
  existing `frenzy` check in `setFx`; extend it to a `ccImmune` effect.
- The Talisman of Will item still shortens stun and root by 60%.
- Siege engines can't be slowed (existing). New rule: they **can** be rooted, but for half
  duration.
- Heroes take **half duration** from every root, stun and taunt listed below, unless the skill says
  otherwise. Durations below are the full (non-hero) value.

---

## 5. Versioning, saves and replays (do not skip)

Battles replay on phones by re-running the sim from saved plans. Old battles must replay exactly as
fought.

- Add `HERO_V3_FROM = "<first day of the next war>"` beside `ULT_V2_FROM`. Ask the user for the
  date. It must be a war's day 1 so nobody changes system mid-war. Gate on `opts.heroV3`, passed in
  the same way `ultV2` is from `js/net/world.js` and the practice flow.
- **Keep the old `ABIL` table and rank code untouched** as the legacy path. Put the new trees in a
  new table (e.g. `TREES` in `js/config/trees.js`, loaded after `classes.js` in `index.html` and in
  `tools/load-sim.mjs`). Use a separate `TREE_ABIL` in the sim.
- Plan and save shape (new):
  `tree: { b1: [t1, t2, t3, t4], b2: [...], b3: [...] }` with rank counts, and
  `path: ["b1.t1", "b1.t1", ...]` for the learning path.
  Keep `ranks`, `picks` and `triggers` only for legacy plans.
- Migration: a v3 war starts heroes at level 1 with an empty `tree`. Drop old `ranks` and
  `picks` when the war rolls over.
- Run `npm run functions:sync` so the server's copy matches.

---

## 6. Skill trees

Notation:
- `[a, b, c]` = value at rank 1, 2, 3 (use the existing `ext()` helper).
- `cd` is in seconds before `BAL.cd` and gear modifiers. T2 ranks don't reduce cooldowns; only the
  stated values scale.
- Damage values have `e.atk * k` added where shown, so they scale with level.
- "Within N" means tiles from the caster unless stated.
- Every T2 and T4 fires from the sim's `tryAbilities` step, at most one cast per hero per tick, with
  the existing `castLock` of .4s. Order of checks: T4, then T2s in tree order b1, b2, b3.

### 6.0 Power review (already applied below)
The numbers below were checked at level 9 against a same-level Mage (about 820 HP, light armour)
as the reference fragile hero. Fixes made:
- **Rogue Shadow tree (the strongest).** As first written, Ambush hit a Mage for about 80% of its
  HP and stunned it, then Vanish re-stealthed on a kill and Shadow Dance did that 5 times.
  - Ambush base damage cut by a third and its multiplier ×2.5 → ×1.8. Hero stun cut to .5-.75s.
  - Ambush and Shadow Dance **don't** get the Rogue's finishing-blow bonus.
  - Shadow Dance strikes deal 60% of Ambush.
  - Vanish rank 2 shortens the internal cooldown; it never removes it.
  - Target: Ambush takes about 40% of a Mage's HP.
- **Ranger Headshot** with Armour Piercer took about 95% of a Mage's HP every 14s.
  - Multiplier ×2 → ×1.5, cd 14 → 16, bleed 3% → 2% a second. That's now about 60% of a Mage's HP
    plus the bleed. It's still strong, but this is the hero-hunting tree and the Ranger is meant
    to beat the Mage.
- **Ranger Dragon-Slayer Shot.** Damage to the hero target is capped at 50% of its max HP, so it
  finishes wounded heroes but can't kill one above half health.
- **Mage Meteor Strike** was above today's Meteor.
  - Lowered to (600 + atk × 3), with 400 castle damage.
- **Shaman Spirit Wolves.** Today's wolves (3 × 840 HP, 45s) are a likely reason the Shaman wins
  17%. They're set at today's rank 1 values with a shorter life.
- **Rogue Deadly Cloud.** "Can't be targeted from outside the cloud" protected the enemy. Dropped.
- **Dodge stacking.** Total dodge chance is capped at 40% outside Blade Fury (Reflexes, Fleet
  Footed and any item).
- Reviewed and fine as written: Avatar of War (close to today's Last Stand), Fortress Wall, Time
  Warp, Totem of the Titan, Whirlwind, Chain Lightning, Blizzard and Rallying Charge.

### 6.A Warrior

**Vanguard (tank)**
- **T1 Iron Clad (passive):** +[10, 15]% max HP; take [7, 10]% less physical damage.
- **T2 Taunting Shout (trigger):** fires when 2+ enemies within 3 tiles are attacking an ally of
  the Warrior's that isn't the Warrior.
  - Taunts enemies within 2 tiles for 3s.
  - Grants the Warrior a shield of [8, 11, 15]% max HP for 6s.
  - cd 14.
- **T3 Unyielding Stance (synergy):** while the Warrior has a shield, own soldiers within 2 tiles
  take [8, 12]% less damage. Each Taunting Shout also gives those soldiers a shield of [10, 15]% of
  the Warrior's shield amount.
- **T4 Fortress Wall (ultimate):** fires when 3+ allied soldiers are within 3 tiles and an enemy
  ranged attacker is within 6. It creates a dome of radius 2.5 at the Warrior for 7s:
  - allies inside take 60% less damage from attackers with range ≥ 2 (not area spells);
  - allies inside heal 3% max HP per second.

**Berserker (burst)**
- **T1 Cleave (passive):** basic attacks also hit up to 2 enemies within 1.2 tiles of the target,
  for [28, 35]% damage. This counts as area damage, so it can't be dodged.
- **T2 Executioner's Whirlwind (trigger):** fires when an enemy within 1.5 tiles is below 30% HP.
  - Spins for 2s, hitting every enemy within 1.6 tiles each 0.5s for ([22, 30, 38] + atk × .4)
    blade damage.
  - cd 10. **On a hero kill only**, half the remaining cooldown is refunded (internal cooldown 10s).
- **T3 Blood Rage (synergy):** kills by the Warrior, or by own melee soldiers within 3 tiles, grant
  a stack of +[4, 5]% attack speed, up to 6 stacks. All stacks expire 6s after the last stack was
  gained.
- **T4 Avatar of War (ultimate):** this replaces and absorbs Last Stand. It fires when the
  Warrior's HP is below 40% and 3+ enemies are within 2.5 tiles. For 7s:
  - the Warrior can't drop below 1 HP;
  - immune to crowd control;
  - +50% attack speed;
  - basic attacks deal 50% splash in a radius of 1.2 and stun soldiers (not heroes) for .5s;
  - when it fires, the Warrior heals 25% max HP.

**Tactician (army)**
- **T1 Marching Cadence (passive):** own soldiers move +[14, 20]% faster until their first
  attack or first hit taken in the battle.
- **T2 Command Banner (trigger):** fires when the Warrior engages an enemy hero or siege engine
  within 2 tiles.
  - Plants a banner (a fixed point, not an entity) for 10s.
  - Own and allied units within 3.5 tiles deal +[12, 18, 25]% damage to the highest-HP enemy
    non-castle within 4 tiles of the banner. Recompute each second.
  - cd 22.
  - Stacks with the Banner of Might item.
- **T3 Sapper Coordination (synergy):** inside a Command Banner, units deal +[15, 25]% damage to
  castles and walls. This is reduced from the plan's 40%: castle falls decide placings.
- **T4 Rallying Charge (ultimate):** fires when 4+ own soldiers are alive and an enemy castle or
  hero is within 7 tiles of the Warrior. For 8s:
  - own soldiers get +60% move speed, +20% damage and crowd-control immunity;
  - each soldier's first hit after reaching its target stuns non-hero targets for .8s.

### 6.B Shaman

**Storm (magic burst)**
- **T1 Static Surge (passive):** basic attacks deal +[7, 10]% damage. They also arc to 1 enemy
  within 2 tiles of the target for [40, 50]% (area damage).
- **T2 Chain Lightning (trigger):** fires when 3+ enemies are within 2 tiles of each other and the
  first one is within 4.5 tiles of the Shaman.
  - Bolt chains up to [3, 4, 4] targets, for ([80, 100, 120] + atk × .5) magic damage, ×.85 per
    jump.
  - Slows each target by 20% for 4s.
  - cd 9.
  - Reuse the existing Lightning Bolt chain code and art.
- **T3 Conductive Discharge (synergy):** targets hit by Chain Lightning take +[12, 20]% damage
  from own and allied bowmen, Battle Mages, snipers and centaurs for 8s. Use the `vuln` effect, keyed to
  those source types.
- **T4 Chrono-Storm (ultimate):** fires when 5+ enemies are within 3 tiles of a point within 5 tiles
  of the Shaman. Place it at the densest such point.
  - It's a 6s zone of radius 3.
  - On cast it pulls enemies up to 1.5 tiles towards the centre.
  - Deals (45 + atk × .3) magic damage per second.
  - Enemies inside get −40% attack speed.

**Totemic (field control)**
- **T1 Grounding Totem (passive):** every 14s in combat, plants a totem. This reuses the existing
  Healing Totem entity: 120 HP, lasts 7s. Allies within 2.5 tiles of it:
  - take [9, 12]% less physical damage;
  - heal [8, 11] HP per second.
- **T2 Earthgrab Totem (trigger):** fires when an enemy hero or siege engine comes within 3 tiles.
  - Roots up to [2, 3, 3] nearest enemies within 3 tiles for [2, 2.5, 3]s. Heroes and siege
    engines get half.
  - cd 16.
- **T3 War Drum Pulse (synergy):** this keeps today's Bloodlust. While a Grounding Totem is up,
  every 4s own soldiers within 4 tiles of the Shaman gain +[12, 20]% attack speed for 4s. Melee
  soldiers also gain +[10, 15]% damage to castles and walls.
- **T4 Totem of the Titan (ultimate):** fires when 4+ allies and 3+ enemies are within 3 tiles.
  - Drops a relic entity (kind `totem`, HP = 2.5 × Shaman max HP, lasts 8s).
  - 40% of damage aimed at allies within 3 tiles is redirected to the relic instead. Area damage
    counts too.
  - Every 2s it pulses a .6s stun on enemy soldiers within 2.5 tiles (heroes: a 30% slow instead).
  - Redirected damage can't kill the relic faster than 25% of its HP per second.

**Ancestral (drain)**
- **T1 Spirit Leech (passive):** heals for [10, 15]% of spell and ability damage dealt.
- **T2 Ancestral Grasp (trigger):** fires when the Shaman's HP drops below 50%.
  - Drains ([50, 65, 80] + atk × .5) magic damage from the 3 nearest enemies within 3 tiles.
  - Gains a shield equal to the total dealt, for 6s.
  - cd 18.
- **T3 Last Stand Offering (synergy):** while the Shaman's own castle is below 35% HP **or** the
  Shaman is below 35% HP, Spirit Leech is ×[1.5, 2] and the Shaman gains +[15, 25]% attack speed. It
  stacks with Desperation Frenzy; that's intended, as a comeback tool.
- **T4 Spirit Wolves (ultimate):** today's ultimate, chosen by the user over the plan's Spirit
  Walk. Reuse its code, summon entity (`kind: "summon"`, `key: "wolf"`), `ultfx` "spirit" and
  highlight.
  - Fires when an enemy hero is within 4 tiles, or 4+ enemies are within 3 tiles.
  - Stuns enemies within 2 tiles for 1.5s (heroes half).
  - Summons 3 wolves beside the Shaman. Each has 630 HP, 48 blade damage (flat, doesn't grow with level), `as` .8, `spd` 2.5, `armor` .15, and lives **30s** (today: 45s).
  - Ancestral flavour: each wolf heals the Shaman for 15% of the damage it deals. This goes
    through `heal()`, so anti-heal applies.
  - Spirit Leech doesn't apply to wolf damage, so there's no double dip.

### 6.C Rogue

**Shadow (infiltration)**
- **T1 Shadowstep (passive):** starts the battle and each respawn in stealth (reveal radius 1.0).
  Moves +[18, 25]% faster while stealthed. While stealthed, pathing prefers the nearest enemy
  backline hero, then backline units.
- **T2 Ambush (trigger):** fires on the first damaging hit out of stealth.
  - Deals ([40, 60, 80] + atk) × 1.8 damage. It doesn't get the finishing-blow bonus.
  - Stuns for [1, 1.25, 1.5]s (heroes half).
  - The target priority while stealthed is Mage and Ranger heroes, then other heroes, then
    backline units.
- **T3 Vanish (synergy):** on a kill, re-enter stealth for 3s and re-arm Ambush. Internal
  cooldown [12, 9]s. Hero kills ignore the internal cooldown.
- **T4 Shadow Dance (ultimate):** fires when 3+ enemy backline targets are within 6 tiles.
  - Becomes untargetable for 4s and strikes up to 5 of them in sequence, one every .8s, nearest
    first.
  - Each strike deals 60% of the Ambush damage at the Rogue's current Ambush rank (rank 1 if not
    learned), without the stun and without the finishing-blow bonus.
  - The Rogue ends next to the last target.
  - Absorbs today's Assassinate; reuse its `ultfx` "assassin" streak per hop.

**Venom (damage over time and control)**
- **T1 Poisoned Blades (passive):** each hit adds a poison stack:
  - [4, 5] damage per second per stack, 6s, up to 5 stacks, refreshed on hit;
  - poisoned targets receive [22, 30]% less healing (`grievous`).
  This replaces today's Poison Blade. The Orb of Venom item stacks separately.
- **T2 Caltrop Bomb (trigger):** fires when 3+ enemy melee units are within 2.5 tiles.
  - Throws a zone of radius 1.2 at their centre for 5s.
  - Deals [6, 9, 12] pure damage per second and slows by [40, 50, 60]%.
  - Each tick adds 1 poison stack, at most one per second per target.
  - cd 14.
- **T3 Corrosive Agent (synergy):** poisoned enemies take +[8, 12]% physical damage from all
  sources.
  This is the plan's "−25% armour", converted to this game's flat-armour model.
- **T4 Deadly Cloud (ultimate):** fires when 5+ enemies are within 2 tiles of a point within 4
  tiles of the Rogue.
  - It's a 7s zone of radius 2 dealing (30 + atk × .4) pure damage per second.
  - It adds 2 poison stacks per second.
  - Enemies inside are blinded (40% miss chance).

**Duelist (evasion)**
- **T1 Reflexes (passive):** +[14, 20]% chance to dodge non-area physical attacks.
- **T2 Riposte (trigger):** fires on a dodge.
  - Counter-attacks the attacker if it's within 1.5 tiles, for atk × [1.0, 1.25, 1.5].
  - Reduces the attacker's attack speed by 30% for 4s.
  - Internal cooldown [1.5, 1.2, 1.0]s.
- **T3 Flurry (synergy):** each dodge grants +[5, 8]% attack speed for 5s, up to 5 stacks, refreshed on
  each new stack.
- **T4 Blade Fury (ultimate):** fires when an enemy hero is within 1.5 tiles and the Rogue is below
  70% HP.
  - For 5s the Rogue dodges 100% of non-area attacks.
  - Over that time it delivers 8 strikes to that hero, one every .6s, each for atk × 1.4.
  - The strikes ignore `armor` and `dmgRed` (the type table still applies).

### 6.D Mage

**Pyromancy (burst and burn)**
- **T1 Ignite (passive):** spells and abilities add a burn worth [12, 15]% of their damage over
  4s. Today's Burn pick becomes this.
- **T2 Fireball (trigger):** fires when 3+ enemies are within 1.3 tiles of a point within 4.5 tiles.
  - Deals ([90, 125, 165] + atk) magic damage in radius 1.3 at that point.
  - Stuns soldiers .5s (in place of knockback).
  - cd 7.
  - Reuse today's Fireball art.
- **T3 Melt Armour (synergy):** burning targets take +[10, 15]% physical damage. This is reduced from
  20% because it stacks with Corrosive Agent and Pinning Shot when allied.
- **T4 Meteor Strike (ultimate):** fires when 5+ enemies, or any enemy castle, are within the
  blast radius of a point within 6 tiles.
  - Warning for 1.6s, then the strike. This is today's Meteor code and art.
  - Radius 3, (600 + atk × 3) magic damage, stuns 1.5s.
  - Deals 400 damage to castles in the radius.
  - Destroys walls in the radius.
  - Leaves burning ground for 6s: radius 2.2, 35 magic damage per second.

**Frost (control)**
- **T1 Chilling Touch (passive):** basic attacks slow movement and attack speed by [12, 15]%
  for 3s. It doesn't stack with the Frostbrand Dagger: take the larger slow.
- **T2 Frost Nova (trigger):** fires when an enemy melee unit comes within 2 tiles.
  - Deals ([45, 60, 75] + atk × .5) magic damage in radius 2.
  - Roots for [1.5, 2, 2.5]s (heroes half).
  - cd 11.
  - Reuse today's Frost Nova.
- **T3 Ice Barrier (synergy):** each Frost Nova shields the Mage for [12, 20]% of its max HP, and
  allies within 2 tiles for [6, 10]% of their own max HP. Lasts 5s.
- **T4 Blizzard (ultimate):** fires when 6+ enemies are within 4 tiles of a point within 6 tiles.
  It's an 8s zone of radius 4 (in place of map-wide):
  - enemies inside are slowed 50% and get −30% attack speed;
  - it deals (25 + atk × .3) magic damage per second.

**Arcane (utility)**
- **T1 Arcane Mastery (passive):** +[.4, .5] tiles to attack range and to every spell's reach.
  Own units within 3 tiles get +[8, 10]% `mres`.
- **T2 Blink & Disrupt (trigger):** fires when the Mage takes damage from an enemy hero ability,
  or from a melee attacker, and is below 70% HP.
  - Blinks up to 3 tiles towards its own castle (today's `blink()`).
  - Enemies within 1.5 tiles of the starting point are silenced for [1, 1.5, 2]s.
  - cd [16, 14, 12].
  - Replaces today's Escape pick. There's no decoy entity.
- **T3 Empowered Synergies (synergy):** the Mage's spells ignore [20, 30]% of the target's `mres`
  and `dmgRed`. All of the Mage's other ability cooldowns are [10, 15]% shorter.
- **T4 Time Warp (ultimate):** fires when 4+ allies and 2+ enemy heroes or 6+ enemies are within 5
  tiles. For 6s, in radius 5:
  - allies get +50% move and attack speed;
  - enemy heroes inside have their cooldowns frozen (`cdfreeze`).

### 6.E Ranger (key `archer`)

**Marksman (ranged damage)**
- **T1 Eagle Eye (passive):** +[.35, .5] tiles of range; +[9, 12]% damage.
- **T2 Arrow Volley (trigger):** fires when 3+ enemies are within 1.5 tiles of a point within
  range + 2.
  - Deals ([30, 42, 55] + atk × .5) pierce damage in radius 1.5.
  - Slows by 30% for 3s.
  - cd 9.
  - Reuse today's Volley.
- **T3 Pinning Shot (synergy):** targets hit by Arrow Volley take +[10, 15]% damage from all pierce
  sources (bowmen, centaurs, castles, other Rangers) for 6s. This replaces the plan's "−20% armour
  and +15% from Bowmen", which double-dipped.
- **T4 Rain of Feathered Death (ultimate):** today's Rain of Arrows with today's values (the v2
  numbers).
  - Radius 3.4, 14 waves over 5.6s.
  - Enemies inside also get −40% attack speed.
  - Fires when 4+ enemies are within 3 tiles of the Ranger's target.

**Trapper (kiting)**
- **T1 Fleet Footed (passive):** +[10, 15]% move speed, +[12, 15]% dodge against melee.
  This is reduced from the plan's 25%, which overlapped the Rogue's Duelist tree. Kept from today:
  after a dodge, step .7 tiles away from the attacker (today's Kite).
- **T2 Spike Trap (trigger):** fires when an enemy melee unit comes within 2 tiles.
  - Drops a trap at the Ranger's feet, reusing the `traps[]` object with a new `kind: "ranger"`.
  - It triggers on the first enemy to step on it within 8s, dealing ([40, 60, 80] + atk) pure
    damage and rooting for [1.5, 2, 2.5]s (heroes half).
  - cd 10.
- **T3 Entangling Wire (synergy):** when a Spike Trap goes off, enemies within [1, 1.4] tiles of it
  are slowed by [35, 50]% for 4s.
- **T4 Barricade & Minefield (ultimate):** fires when 4+ enemies are within 5 tiles and closing.
  - Places 2 wall blocks across the line from the Ranger to the nearest enemy cluster, 2 tiles out.
    Use the existing `walls[]` with the owner's castle-tier HP. They last for the rest of the battle.
  - Places 3 Spike Traps (at the Ranger's T2 rank, minimum 1) spread in front of them.
  - Walls must not be placed on occupied tiles, castles or the centre circle. Skip a blocked tile.

**Sniper (hero hunting)**
- **T1 Focused Aim (passive):** each consecutive basic attack on the same target adds +[7, 10]%
  crit chance, up to 5 stacks. Crit deals ×1.75.
- **T2 Headshot (trigger):** fires when an enemy hero comes within range + .5.
  - Aims for 1.2s; this is a `pending` entry, and the Ranger can't attack meanwhile.
  - Then fires for ([70, 100, 130] + atk × 2) × 1.5 damage. It always crits.
  - Silences the target for 1s, which interrupts its casting.
  - cd 16.
  - If the target leaves range + 1 or dies, the shot is cancelled and half the cooldown refunded.
- **T3 Armour Piercer (synergy):** Headshot ignores [30, 50]% of `armor` and `dmgRed`. It also
  applies a bleed: 2% of the target's max HP per second for 5s.
- **T4 Dragon-Slayer Shot (ultimate):** fires when an enemy hero is within 9 tiles (instead of
  map-wide) and either below 50% HP or carrying the bounty.
  - Fires a 1s-telegraphed line bolt to it.
  - The bolt deals (500 + atk × 6) pierce damage, +50% if the target is below 40% HP, capped at 50%
    of the target hero's max HP after all multipliers.
  - Every other enemy on the line, within .7 tiles of it, takes 150.
  - It doesn't execute outright.

---

## 7. Balance targets and process

- Use `npm run balance` (the balance lab, 8, 10 and 12 lords). It needs extending to pick random
  legal trees and builds per class.
- Targets:
  - each class wins 8-12% of battles at 10 lords;
  - no single build within a class wins more than 1.5 times the class average;
  - every T2 fires at least 3 times per battle on average when learned;
  - every ultimate fires in at least 70% of armed battles.
- Report a table of fire counts per skill. The battle already records casts per ability in
  `e.tel.ab`; key it by the new skill names.
- The backlog says not to tune hero win rates before fixes B1 and B2 (the tie-break and burn).
  Check they've landed (`BAL_V2_FROM`). If not, note it in the pull request.
- First-pass knobs, in this order: per-level growth (§1.4), T2 cooldowns, then ultimate damage.

---

## 8. Work plan (in this order, one pull request per phase if large)

1. **Data and gating.**
   - Add `js/config/trees.js` (names, descriptions, ranks, gates, values) and the base stats from
     §3 as `CHAMP_V3`.
   - Add `HERO_V3_FROM` and `opts.heroV3`, the new plan fields, and the level and point rules
     (`canLearn(tree, node, L)`).
   - Keep the legacy path working.
2. **Sim primitives** (§4) with unit tests in `test/`. Each should have a tiny scripted battle
   that asserts it works (shield absorbs, taunt retargets, stealth reveal radius, cooldown freeze
   and so on).
3. **Trees, one class at a time.** Start with the Warrior as the vertical slice, then Mage, Ranger,
   Rogue, Shaman. Add a `SPELL_ART` entry per active skill. Reuse the existing symbols and fx where
   the skill came from an old one.
4. **Mid-battle level-ups** follow the `path` (§1.5).
5. **Bots:**
   - replace `autoRanks` with `autoTree(lvl, seed, cls)`, which picks a main tree by seed, fills
     it to 8, then the next to 6 (2 + 2 + 2);
   - update `lordBotPlan` and practice rivals in `js/sim/plans.js`;
   - update golden cases (`js/dev/goldenCases.js`) to generate v3 plans for a new block of cases,
     keeping the old 50 unchanged.
6. **UI** (`js/ui/sheets/council.js` hero tab, `castle.js` hero text, `info.js` help):
   - three columns per class, with nodes locked or unlocked by points spent;
   - tap a node to learn it or see its details;
   - a learning-path editor ("auto-fill the rest");
   - no per-ability trigger dropdowns;
   - keep "Plan the ultimate for tonight".
   - Phone-first: one tree visible at a time with tabs is fine.
7. **Replay and inspector:**
   - new effects visible: shield bar, stealth shimmer, zones as circles, taunt line;
   - the inspector lists the hero's tree.
8. **Tests and balance:**
   - `npm test`, `npm run lint`, `npm run golden:update` (only the new cases should change);
   - run `node tools/selftest-browsers.mjs chromium firefox webkit` (zones and pulls are a
     determinism risk);
   - balance pass (§7).
9. **Docs:** update `README.md` if files are added, and the in-game help text.

## 9. Out of scope
- New heroes or units.
- Respecs mid-war.
- Real-time inputs.
- Changing the soldier, item or castle balance, except where a skill interacts with them as above.
