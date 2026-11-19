# Daily Siege: the rules as they are now

The single up-to-date description of how the game works. **Read this before describing or changing a rule, and update
it in the same pull request as any change to the rules** (see CLAUDE.md). When this file and the code disagree, the code
is right and this file is the bug. Exact numbers live in the files named in brackets; this page gives the shape and the
key values.

Last checked against the code: 18 Nov 2026 (v1.9).

## Dated rules

Rules that change how battles play out start from a set battle day, so battles already fought replay exactly as they
were fought. The battle code reads flags stamped on each lord's plan; `js/net/world.js` stamps them by date and
practice games always stamp all of them (`js/sim/plans.js`).

| From the battle of | Flag | What changes |
|---|---|---|
| 17 Nov | `trapV2` | Permanent traps, new trap damage, weaker walls, towers |
| 19 Nov | `sdV2`, `wallV2`, `engV2` | Sudden death v2, walls block everyone, siege engine alert; bots buy defences by build |
| 20 Nov | `ordV2` | Army plans and one fall-back condition; no if-then commands or soldier orders |
| 20 Nov | `skV2` | Skill scaling v2: every rank adds an even step (`TREE_V2`); report records deaths, assists, damage |
| 20 Nov | `shellV2` | Anti-Magic Shell fires the moment the hero engages an enemy hero (when off cooldown); no chosen delay |
| 21 Nov | `allyV2` | Alliances v2: groups need every member's yes, winning allies share the top places by castle health, the lone wolf, bots in friends wars join the diplomacy |
| 20 Nov | `itemV6` | Item rebalance: weaker Healing Salve and Ring of Health; stronger Anti-Magic Shell (7.5s magic immunity), Rune of Homecoming (reusable), Talisman of Will, Orb of Fire, Crystalys, Pipe of Insight and Boots |

## The war

- A war is seven daily battles. Each day lords plan (spend gold, place soldiers, set orders) and seal their orders
  before the lock; the server then fights the battle and everyone watches the replay. Day 7 is worth the most points.
- Up to 12 lords; new hosted wars default to 10 (`js/config/seats.js`). Empty seats can be filled with bot lords.
- Practice is a private sandbox against bots, with every current rule on and skill-tree heroes by default.

## Gold

- Base pay of 225 gold after day 1, growing 30 a day; castle tiers add 70 (Fortress) or 130 (Citadel) a day
  (`js/config/balance.js`). Kill spoils, contracts, dowries and the bottom-of-the-board catch-up come on top.
- Castle tiers: Castle, Fortress (100 gold), Citadel (200 gold). Higher tiers give more castle health and unlock
  stronger soldiers, gear and tower upgrades.

## Soldiers

- Bought with gold, trained up to level 3 (each level +30% health and attack). Up to 4 start on the field; up to 3
  reinforcement waves (unlocked for 60, 100 and 150 gold) hold 3 more each and march out later in the battle.
- **Every soldier starts every battle at full health.** (Older text that says fallen soldiers come back at half health
  is out of date.)
- One soldier on the Deploy tab's first field square is the castle guard and stays home.
- Types: Footman, Bowman, Cleric, Raider, Knight, Battle Mage, Dwarven Sniper, and the siege engines Battering Ram,
  Powder Cart and Catapult (`js/config/units.js`). Mercenary groups can be hired by sealed bid from day 4.

## Heroes

- One hero a war, one of five classes (Warrior, Shaman, Rogue, Mage, Archer/Ranger) with three skill trees each
  (`js/config/trees.js`, `docs/hero-skill-trees.md`). Every level gives one skill point; the cap is level 15.
- The class is chosen when registering and can be changed only while registration is open. Once the war begins it is
  fixed for the whole war; the next war's registration is the next chance to pick again.
- A hero gains at least 2 and at most 3 levels a day (`MIN_GAIN`, `XP_CAP`).
- Active skills cast themselves at their own best moment; a "Cast when" condition can be added on top.
- A fallen hero respawns at its castle (up to twice a battle, waiting longer at higher levels), except in sudden death.
- From 20 Nov (`skV2`) every skill rank adds an even step worth at least about two thirds of rank 1 (`TREE_V2` in
  `js/config/trees.js`); older battles keep the old values.
- Up to 6 items; gear upgrades (weapon, armour, charm) last the week.
- From 20 Nov (`shellV2`) the Anti-Magic Shell has no timing setting: it fires as soon as the hero engages an enemy hero
  (attacking one within reach, or being attacked by one), whenever it is off cooldown.
- Items from 20 Nov (`itemV6`, `ITEM_V6` in `js/sim/battle.js`): Healing Salve heals 220 (was 300) and costs 60; Ring of
  Health gives +120 health and 8 a second (was 140 and 10) and costs 100. Anti-Magic Shell lasts 7.5s and makes the hero
  immune to magic: hero abilities, ultimates and magic attacks. Rune of Homecoming is no longer once a battle: when the
  castle is attacked or the hero drops below 30% health (more than 4 tiles from home), the hero channels for 1.5s, then
  it and every ally within 4 tiles go home; 45s cooldown. Talisman of Will: stuns, roots, slows and silences 75% shorter.
  Orb of Fire splashes 50% within 1.5 tiles. Crystalys: 25% chance of 1.8x. Pipe of Insight: 60% within 4 tiles.
  Boots of Speed +0.42 move speed (was +0.35). Divine Rapier: +100 damage on each weapon hit, abilities unaffected
  (was double all hero damage).

## Defences (from 17 Nov)

- **Traps**, up to 4, are permanent: buy once in Base → Defences, place them on the map, and each fires once every
  battle. Move or sell them from the map. Spike Pit, Snare, Blade Trap, Bomb Trap, Sand Pit (siege engines only).
- **Walls**, up to 5: tap Walls in Defences, then tap tile after tile on the map, paying 35 gold each. Walls next to
  each other line up and draw as one wall. They rebuild free each day and can be turned or sold but not moved.
  Wall health depends on castle tier (Palisade 100, Timber 170, Stone 250).
- **Towers**, up to 2 (Tower I and Tower II slots): Archer Tower Lv1 (150 gold) → Archer Tower Lv2 (100 gold, Fortress) →
  one Lv3 tower (150 gold, Citadel): Archer Tower Lv3, Fire, Bomb, Magic or Sniper. Each slot shows the tower's stats beside
  the picked upgrade's. Towers never move (pinned to their tile from 19 Nov) and can't be moved; sell and rebuy to relocate.
- From 19 Nov **walls block everyone**, including their owner's and allies' soldiers, who route round through the gaps.
  The planning rules always keep a way through to every castle.

## Orders (from 20 Nov)

- **Targets:** up to 3 lords a day, in order. The army goes after the first one still standing.
- **Army plan:** what the army does once the fight in front of it is over.
  - Conquest (default): their hero, then their army, then their castle, then the next lord.
  - Hero hunt: hero to hero; soldiers only when they are in the way.
  - Siege: castle to castle, stopping only for what blocks the way.
  - Army slayer: their soldiers first, then their hero, then their castle.
  - A tick box holds the central hill for the first 2 minutes.
- **Army falls back when:** never, castle under attack (3+ enemies within 3 tiles), a siege engine within 5 tiles of
  the castle, the hero falls, or the hero falls back. The army goes home, fights what is there, and returns to its plan
  4 seconds after the danger has passed.
- **Hero stance:** sets when the hero alone goes home to heal (aggressive 12%, skirmish 30%, cautious 45% health).
  Soldiers never retreat on their own. Mage and Archer heroes take a short step back when a melee fighter hits them.
- **Combat groups:** what the hero, melee, ranged and healers go for first within their reach.
- From 19 Nov an enemy siege engine within 3 tiles of a castle becomes the first target of that castle's defenders.
- Before 20 Nov: a "heading", up to 5 if-then battle commands, and per-soldier orders (escort, attack a lord). These
  only apply to replays of older battles.

## The battle

- Fought on a ring map: castles round the edge, a hill in the middle (holding it gives gold and hero experience, not
  points), forest round the rim and small tree blockades between bases. Trees and walls block movement.
- Militia muster at every castle on a timer. Reinforcement waves march on their triggers.
- A lord is knocked out when their castle falls; their army fights on without a base.
- **Sudden death** at 3 minutes if more than one side is left (from 19 Nov, `sdV2`):
  - Castles, towers, siege engines and totems are out of the fight.
  - Everyone else is drawn into a ring half the old size and can't leave it. Each army enters on its own castle's
    side, and the lords still standing are spread evenly round the ring.
  - Everyone is topped up to at least half health. Fallen heroes do not respawn.
  - The last side standing wins; when time runs out, the side with the most health left.

## Points

- Placing: 10, 7, 5, 4, 3, 2, 1 points for 1st to 7th; plus 1 per enemy hero killed, 3 per castle destroyed, 1 for surviving with
  your hero alive, and points for treachery. Days 5 and 6 count 1.5 times and day 7 twice.
- Contracts add points and gold.

## Battle report

- A card per lord: medal, colour, hero sprite, name, points, and chips for heroes killed / deaths / assists, soldiers
  killed, castles taken, damage dealt, levels and gold. Build opens their skills and items. Deaths, assists and damage are recorded from 20 Nov. An assist is damaging an enemy hero in the
  10 seconds (`ASSIST_SECS`) before another lord kills it.

## Alliances

- Invite a lord with an optional dowry (at most 2 invitations open); they answer the next day and the pact starts at that
  night's battle. Two lords who invite each other ally for free. Pacts carry over until broken or betrayed; on day 7 every
  pact ends. An alliance holds at most 3 lords (`BLOC_MAX`) and there must always be two sides.
- From 21 Nov (`allyV2`, `js/sim/alliances.js`): an alliance is a group. A lord or group joins another only if every member
  of each side agreed with every member of the other, so everyone in an alliance is allied to everyone else. In the game,
  inviting one member of an alliance drafts an invitation to each of them. Before then a pact was between two lords only,
  and chains (A with B, A with C, B and C not allied) were possible.
- Allies win together if only allies remain. From 21 Nov they share the top places, the one with the most castle health
  left first (1st, 2nd, 3rd: 10, 7, 5 points); before then every surviving ally took 1st place.
- Lone wolf (from 21 Nov): while exactly one lord still standing is in no pact and at least one alliance stands, that lord's
  army deals 10% more damage and takes damage as if it had 10% more health for each allied lord still standing
  (`LONE_WOLF_STEP`). It is checked every second of the battle, so it ends the moment a second lord stands alone (a pact
  broken by a betrayal or a fallen castle) or the lone wolf is in a pact.
- A pact can be broken cleanly or betrayed mid-battle with a bomb in the ally's keep (half its health). The betrayer scores
  3 points and takes a quarter of the victim's battle spoils; the two deal 20% more damage to each other for the rest of the
  war and can never share an alliance again.
- Bots in friends wars (from 21 Nov, `wBotDiplomacy` in `js/net/world.js`): each day a bot has a 30% chance to invite a
  lord with a small dowry; it accepts invitations that pay its price (anything if it is in the bottom half of the board);
  a bot in the bottom half plans to betray about 1 pact in 5. Practice bots follow their own script (`js/sim/bots.js`).
- The Allies screen shows every alliance, the lords standing alone, whether lone wolf is on, bad blood (who betrayed whom)
  and a day-by-day history of pacts made, ended and betrayed.

## Bots

- Bot lords plan themselves from their seat, the day and their build: warband (more reinforcements, few defences),
  fortress (traps, towers, a trapped wall line), champion (more items) or mixed. From 20 Nov each build also has its
  own army plan and fall-back (`js/sim/bots.js`).

## How to play (the guide)

- One guide in five chapter tabs: Basics, Army, Hero, Battle and Allies (`js/ui/guide.js`). Read from Options it floats over
  the planning screen and rings the real button for anything already on screen. New lords read Basics as pages in the Muster
  Hall before choosing a hero. A chapter gets a tick once its last page has been seen (kept on the device).
- Pages about screens a new player can't see yet (invitations, betrayal, the mercenary camp, contracts, the replay and the
  morning report) show a screenshot with numbered gold boxes and a line for each number. The pictures are in `guide/` and are
  remade with `npm run build && npm run guide-shots`; rerun it when one of those screens changes.
- The guide teaches the ideas. Exact numbers (pay, points, training costs, invitation limits) are in each page's i note.

## Checking the game still works

- `npm test`: the rules and battle tests, including `test/invariants.test.mjs` (battles under today's rules: every
  battle ends, nobody leaves the sudden death ring, towers sit it out, fast and full runs agree).
- `npm run build && npm run walkthrough`: a robot player plays a practice day through every screen in a real browser.
- Both run on every pull request. Add a check whenever a rule or screen is added.
