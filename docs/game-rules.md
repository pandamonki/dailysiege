# Daily Siege: the rules as they are now

The single up-to-date description of how the game works. **Read this before describing or changing a rule, and update
it in the same pull request as any change to the rules** (see CLAUDE.md). When this file and the code disagree, the code
is right and this file is the bug. Exact numbers live in the files named in brackets; this page gives the shape and the
key values.

Last checked against the code: 18 Nov 2026 (v1.8 plus the keep-tower update).

## Dated rules

Rules that change how battles play out start from a set battle day, so battles already fought replay exactly as they
were fought. The battle code reads flags stamped on each lord's plan; `js/net/world.js` stamps them by date and
practice games always stamp all of them (`js/sim/plans.js`).

| From the battle of | Flag | What changes |
|---|---|---|
| 17 Nov | `trapV2` | Permanent traps, new trap damage, weaker walls, towers |
| 19 Nov | `sdV2`, `wallV2`, `engV2` | Sudden death v2, walls block everyone, siege engine alert; bots buy defences by build |
| 20 Nov | `ordV2` | Army plans and one fall-back condition; no if-then commands or soldier orders |

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
- A hero gains at least 2 and at most 3 levels a day (`MIN_GAIN`, `XP_CAP`).
- Active skills cast themselves at their own best moment; a "Cast when" condition can be added on top.
- A fallen hero respawns at its castle (up to twice a battle, waiting longer at higher levels), except in sudden death.
- Up to 6 items; gear upgrades (weapon, armour, charm) last the week.

## Defences (from 17 Nov)

- **Traps**, up to 4, are permanent: buy once in Base → Defences, place them on the map, and each fires once every
  battle. Move or sell them from the map. Spike Pit, Snare, Blade Trap, Bomb Trap, Sand Pit (siege engines only).
- **Walls**, up to 5: tap Walls in Defences, then tap tile after tile on the map, paying 35 gold each. Walls next to
  each other line up and draw as one wall. They rebuild free each day and can be turned or sold but not moved.
  Wall health depends on castle tier (Palisade 100, Timber 170, Stone 250).
- **Towers**, up to 2 (Tower 1 and Tower 2 slots): Guard Tower (150 gold) → Arrow Tower (Fortress) → one of Arrow III,
  Bomb, Magic, Fire or Sniper Tower (Citadel). They never move and can't be moved; sell and rebuy to relocate.
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

## Alliances

- Invite a lord with an optional dowry; the pact starts at the next battle. Allies win together if only allies remain.
- A pact can be broken cleanly or betrayed mid-battle with a bomb in the ally's keep.

## Bots

- Bot lords plan themselves from their seat, the day and their build: warband (more reinforcements, few defences),
  fortress (traps, towers, a trapped wall line), champion (more items) or mixed. From 20 Nov each build also has its
  own army plan and fall-back (`js/sim/bots.js`).

## Checking the game still works

- `npm test`: the rules and battle tests, including `test/invariants.test.mjs` (battles under today's rules: every
  battle ends, nobody leaves the sudden death ring, towers sit it out, fast and full runs agree).
- `npm run build && npm run walkthrough`: a robot player plays a practice day through every screen in a real browser.
- Both run on every pull request. Add a check whenever a rule or screen is added.
