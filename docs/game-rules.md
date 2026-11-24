# Daily Siege: the rules as they are now

The single up-to-date description of how the game works. **Read this before describing or changing a rule, and update
it in the same pull request as any change to the rules** (see CLAUDE.md). When this file and the code disagree, the code
is right and this file is the bug. Exact numbers live in the files named in brackets; this page gives the shape and the
key values.

Last checked against the code: 20 Nov 2026 (v1.19).

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
| 20 Nov | `itemV6` | Item rebalance: weaker Healing Salve and Ring of Health; stronger Anti-Magic Shell (7.5s magic immunity), Rune of Homecoming (reusable), Talisman of Will, Orb of Fire, Crystalys, Pipe of Insight and Boots |
| 20 Nov | `allyV2` | Alliances v2: groups need every member's yes, winning allies share the top places by castle health, the lone wolf, bots in friends wars join the diplomacy |
| 20 Nov | `waveV2` | Emergency waves: as the castle drops below 75%, 50% and 25% health, the next unsent wave rushes out, at least 10 seconds apart; waves lose their own orders, defend the castle area first, then follow the army plan |
| 20 Nov | `waveV3` | Wave deadlines: each wave goes by its own time (0:45, 1:30, 2:15) instead of one forced out each minute |
| 20 Nov | `waveV4` | "Castle attacked" wave trigger becomes "enemies reach my castle" (within 3 tiles, or the first hit) |
| 21 Nov | `placeV2` | Placement: one point per place, last scores 1, plus 2 for winning |
| 22 Nov | `balV5` | Balance v5: hero rebalance (stats and skills), Hero damage and armour class for every hero, resting at home heals, regen items toned down, waves a flat 20s apart, triple castle points for a betrayal kill |
| 25 Nov | `breakV2` | Disbanding an alliance takes effect from the next battle (see Alliances) |
| 23 Nov | `finV2` | Final-day alliances: day 7 pacts hold until one alliance is all that is left, then break and the allies fight on |
| 23 Nov | `lvlV2` | Faster levelling: 3 to 4 levels a battle, up to level 25, smaller steps per level |

## The war

- A war is seven daily battles. Each day lords plan (spend gold, place soldiers, set orders) and seal their orders
  before the lock; the server then fights the battle and everyone watches the replay. Day 7 is worth the most points.
- Up to 12 lords; new hosted wars default to 10 (`js/config/seats.js`). Empty seats can be filled with bot lords.
- Hosts can delete a war (everything in it, for everyone) and, on the Your wars page, press "Clean up broken wars": it removes leftover wars they host that have no host membership and no battles (for example one that came back half-empty after a delete), and drops dead entries from their war list. Real wars are never touched. While a war is being deleted, the deleting device stops saving into it.
- Practice is a private sandbox against bots, with every current rule on and skill-tree heroes by default.

- The war's lords are locked when registration closes (game config `roster`, written by the server, `lockRoster` in
  `functions/lib/resolve.js`): everyone registered at that moment, bots included. Every battle of that war uses that list
  (`wRoster` in `js/net/world.js`), so the count cannot change mid-war; only a lord the host removes drops out. Wars from
  before the lock work it out from each player's sign-up record. A day that passes with fewer than two lords is recorded
  (`skipDays`) and the game says so, instead of waiting for a battle. The host's Resolve now opens a Battle check showing
  what the phone and the server each see.
- Battles are saved by date, and from a game's second war as `date~wN`, so a war played with testing skips can never
  clash with the next war's dates. The game reads both and shows one war at a time.
- Bot lords each have their own hero class, spread across the classes before any repeats.

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
- A Cleric has no attack: its stat shows how much it heals each pulse. Types: Footman, Bowman, Cleric, Raider, Knight, Battle Mage, Dwarven Sniper, and the siege engines Battering Ram,
  Powder Cart and Catapult (`js/config/units.js`). Mercenary groups can be hired by sealed bid from day 4.

## Heroes

- One hero a war, one of five classes (Warrior, Shaman, Rogue, Mage, Archer/Ranger) with three skill trees each
  (`js/config/trees.js`, `docs/hero-skill-trees.md`). Every level gives one skill point; the cap is level 15 (25 from 23 Nov, `lvlV2`).
- The class is chosen when registering and can be changed only while registration is open. Once the war begins it is
  fixed for the whole war; the next war's registration is the next chance to pick again.
- A hero gains at least 2 and at most 3 levels a day (`MIN_GAIN`, `XP_CAP`).
- Faster levelling (from 23 Nov, `lvlV2`): a hero starts at level 1 and gains at least 3 and at most 4 levels a battle (`MIN_GAIN_V2`,
  `XP_CAP_V2`), up to level 25 (`MAX_HERO_LVL_V4`), so after six battles it is level 19 to 25. Each level needs a flat 130 experience
  (`XP_V2`); about a third of heroes reach 4 in a battle. Each level adds 7% of base health and 5.25% of base attack (`HP_STEP_V4`,
  `ATK_STEP_V4`; before it 12% and 9%), so a level 25 hero matches the old level 15. The ultimate still needs level 9.
- Active skills cast themselves at their own best moment; a "Cast when" condition can be added on top.
- A fallen hero respawns at its castle (up to twice a battle, waiting longer at higher levels), except in sudden death.
- From 20 Nov (`skV2`) every skill rank adds an even step worth at least about two thirds of rank 1 (`TREE_V2` in
  `js/config/trees.js`); older battles keep the old values.
- Up to 6 items; gear upgrades (weapon, armour, charm) last the week.
- Hero class (from 22 Nov, `balV5`, `heroTypes` in `js/config/balance.js`): every hero attacks with the Hero damage type and wears
  Hero armour, whatever its class. Hero damage does 120% to light, medium and heavy armour and 50% to castles and walls; Hero armour
  takes 90% from blade, pierce, magic and precision and 80% from siege; hero against hero is 100%. Ability hits that name their own
  type (pure poison, siege blasts) keep it. Before then each class had its own types (`CLASS_TYPES`).
- Hero rebalance (from 22 Nov, `balV5`): base stats `CHAMP_V5` over `CHAMP_V3` (warrior 700 health and 25% armour, archer attack 24,
  mage attack 30, rogue 510 health), skill values `TREE_V5` over `TREE_V2` in `js/config/trees.js` (Berserker, Tactician, Sniper,
  Marksman, Rogue, Mage and Shaman nodes), and a shorter Avatar of War (`AVATAR_V5`: 5s, 15% heal, 35% splash). Tuned on 1,800
  bot battles of 8 lords: every class wins 11 to 14.5%.
- Resting at home (from 22 Nov, `HOME_HEAL` in `js/sim/battle.js`): a hero within 2.5 tiles of its own castle that has neither hit nor
  been hit for 2 seconds heals 8% of its health a second, until full or until a hit stops it. Not in sudden death or once its castle
  has fallen. A hero that falls back to heal (its stance) still heals 10% a second at home as before, whatever the fighting.
- The hero's attack is shown as its own damage with the items' extra in green beside it (Whetstone 6, Gauntlets 12, Daedalus 12,
  Divine Rapier 100).
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
- Regeneration items from 22 Nov (`balV5`, `ITEM_V7`): Mending Herbs 3 a second and costs 50 (was 5, 40 gold); Ring of Health
  +120 health and 5 a second and costs 125 (was 8, 100 gold); Mender's Charm heals allies 5 a second (was 8).

## Defences (from 17 Nov)

- **Traps**, up to 4, are permanent: buy once in Base → Defences, place them on the map, and each fires once every
  battle. Move or sell them from the map. Spike Pit, Snare, Blade Trap, Bomb Trap, Sand Pit (siege engines only).
- **Walls**, up to 5: tap Walls in Defences, then tap tile after tile on the map, paying 35 gold each. Walls next to
  each other line up and draw as one wall. They rebuild free each day and can be turned or sold but not moved.
  Wall health depends on castle tier (Palisade 100, Timber 170, Stone 250).
- **Towers**, up to 2 (Tower I and Tower II slots): Archer Tower Lv1 (150 gold) → Archer Tower Lv2 (100 gold, Fortress) →
  one Lv3 tower (150 gold, Citadel): Archer Tower Lv3, Fire, Bomb, Magic or Sniper. Each slot shows the tower's stats beside
  the picked upgrade's. Towers never move (pinned to their tile from 19 Nov) and can't be moved; sell and rebuy to relocate.
- The top of the Defences tab counts what you own against each limit: traps out of 4, towers out of 2, walls out of 5.
- From 19 Nov **walls block everyone**, including their owner's and allies' soldiers, who route round through the gaps.
  The planning rules always keep a way through to every castle.

## Orders (from 20 Nov)

- **Targets:** at least 1 and up to 3 a day, in order, before you can seal. The army goes after the first one still standing. An ally (a pact
  carried from the last battle) can only be picked when the pact is set to Betray or Break; setting it back to Keep takes them
  off the list.
  The target list shows the bounty on the top three of the board beside their Target button (♛ +gold for killing their hero or
  taking their castle), and their castles wear a crown on the map: gold for 1st, silver for 2nd, bronze for 3rd. There are no
  crowns or bounties until the board has points, so none on day 1: they appear after day 1's battle.
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
- Waves: each wave goes when its own trigger is met, at least 30 seconds after the last, and one is forced out at each
  minute mark. From 20 Nov (`waveV2`) a castle in trouble also sends waves early: each time it drops below 75%, 50%
  and 25% health, the next unsent wave rushes out, at least 10 seconds after the last wave, so they never all leave at once.
  Each wave has a Rush box on the Deploy tab, ticked unless the lord unticks it. Only ticked waves rush out, the earliest
  first; unticked waves still go by their trigger or deadline. Below its k-th mark a castle counts every wave already out
  (however it went), so unticking never makes the other waves rush sooner. Older plans count as ticked.
  Also from 20 Nov waves have no orders of their own: every wave first fights enemies within 8 tiles of its castle,
  and once that area has been clear for 4 seconds (or the castle has fallen) it follows the lord's army plan.
  From 20 Nov (`waveV3`) there is no forced wave each minute. Instead each wave has its own deadline: Wave 1 0:45,
  Wave 2 1:30, Wave 3 2:15. A wave goes when its trigger happens or at its deadline, whichever comes first (still at
  least 30 seconds after the last wave). The Deploy tab shows each deadline as a stopwatch badge beside the trigger chip,
  and only offers set times earlier than it. The triggers: a set time (20s to 2:30), castle attacked, castle below half,
  hero dies, all soldiers dead, an enemy hero dies, any ultimate cast.
  From 20 Nov (`waveV4`) "castle attacked" becomes **"When enemies reach my castle"**: an enemy soldier, hero, summon or
  siege engine within 3 tiles of the castle and nearer to it than to its own castle, or the castle's first hit, whichever
  comes first. Towers never count. Plans that chose "castle attacked" get the new trigger with no change needed. (Castles
  can be under 7 tiles apart, so a wider area fired in the first seconds as armies marched past.)
- From 22 Nov (`balV5`, `WAVE_GAP_V5`) every wave goes at least 20 seconds after the last, whether it goes by its trigger, its
  deadline or an emergency rush.
- In the replay each castle shows one bar per wave: bright yellow when ready, dim amber while waiting out the gap since
  the last wave, dark grey once gone. A small stopwatch beside them drains over the wait; it turns red when an emergency
  wave is due and will rush out as soon as the wait ends.
- The castle guard you pick on the Deploy tab is extra: every castle still keeps its own free guard. The picked guard
  gets no bonus stats; it just stays near the castle and defends instead of attacking.
- The top soldier chip counts every soldier you own (field and waves) out of all your room: 4 on the field plus 3 for
  each unlocked wave.
- A lord is knocked out when their castle falls; their army fights on without a base.
- **Sudden death** at 3 minutes if more than one side is left (from 19 Nov, `sdV2`):
  - Castles, towers, siege engines and totems are out of the fight.
  - Everyone else is drawn into a ring half the old size and can't leave it. Each army enters on its own castle's
    side, and the lords still standing are spread evenly round the ring.
  - Everyone is topped up to at least half health. Fallen heroes do not respawn.
  - The last side standing wins; when time runs out, the side with the most health left.

## Points

- Placing, from the 21 Nov battle (`placeV2`, `placePts` in `js/sim/battle.js`): one point per place, so last scores 1 and first
  scores one per lord, plus 2 for winning (`PLACE_WIN_BONUS`); with 8 lords that is 10, 7, 6, 5, 4, 3, 2, 1. Before then: 10, 7, 5,
  4, 3, 2, 1 for 1st to 7th and nothing below.
- Plus 1 per enemy hero killed and 3 per castle destroyed. From 22 Nov (`balV5`) a castle razed by the lord who betrayed
  its owner in the same battle scores 3 times as much (9; `BETRAY_CASTLE_X`). Placing, kills and castles count 1.5 times on days 5, 6 and 7
  (`DAY_WEIGHT_PICK`). Then 1 for surviving with your hero alive, 3 for a betrayal whose bomb goes off, and contracts
  (2 easy, 3 hard, 5 against a rival; doubled on a Glory day).
- Contracts add points and gold. Take one from Orders > Contracts, or from the Daily Noticeboard (the ! above the map): it
  shows the day's effect (the twist; day 1 shows a welcome to the war instead), the alliance changes at the last battle, any
  new mercenary headliner, and the Daily Contract and Daily Target buttons.
  It pulses each new day, and until a contract and a target are picked. The contract board no longer pops up by itself.

## Screens

- Pre-battle screen ("The houses gather"): a line says whether you have allies; then each alliance is a coloured side with a header
  ("Your alliance" or "Alliance of X", lord count, new today / held from yesterday / grew today), separated by VS, then the lone lords
  ("Lone wolf" when exactly one stands alone). Team colours come from `allianceGroups` in `js/replay/flow.js`.
- In the replay, allied castles sit together in the side strip, outlined in the team colour (no lines across the map).

- Wars page > Diagnostics: Copy diagnostics gathers the war's clock, my saved orders per day, my army and the orders each battle used,
  plus recent errors, for sending to the developer (`js/net/diag.js`).

- Once registration closes, a screen shows every lord in the war and the hero they brought, before day 1 planning.
- The shop bubble beside the map is black so the shop art blends into it. The hero's quick buttons no longer include Orders
  (use the Orders button on the bottom bar).

- Replay: a small castle for every lord sits down the left edge of the map, crossed out when it falls. The unit panel has a
  Follow button for any hero, and the home button goes back to your own hero.
- Pre-battle screen: each alliance's lords sit side by side under one ALLIANCE box, biggest alliance first, then lords alone.
- Victory screen: allies who win together all appear; the winner's allies whose castles fell float beside them as ghosts (a wispy tail
  instead of legs), cheering them on; a winner
  who betrayed an ally that battle has the betrayed hero face down at their feet with a dagger in its back.
- Gift (day 2 and 5): Roll spins three reels, Stop slows them onto the three items (fixed in advance), the first is picked; one
  description and one Pick button below.
- Mercenary camp: it pops up once, on day 4 when it is introduced. After that each new headliner is announced on the Daily
  Noticeboard, and the Camp button pulses until the camp is opened (the headliner is tagged New today). + and − set the amount (from the minimum) and Place bid submits it; tiles show your bid.
- Level 3 towers fire big, bright shots in the replay: a flash on the tower and a projectile and burst for each type.
- Map strip: the hero has Abilities, Items, Stats (a drawn bar-chart icon), Move and Orders; the castle has Upgrade (its hint names the next tier and cost, like the other upgrade buttons), Base and Army; a
  wall has only Sell. Tapping the castle again does nothing more.
- Seal checklist: every line has a button to fix it; "hero on the field" shows only when the hero is missing.

## The end of a war

- After the war's last battle the day 7 report opens first (`warReportFirst` in `js/ui/sheets/warend.js`); closing it opens the war
  results.
- The crowning plays over the war results the first time they open, and again from the Crowning button: the other lords bow in a line
  under a podium, trumpets, a bronze crown on 3rd, silver on 2nd, then a drum roll and the gold crown on 1st with confetti and the
  winner's victory taunt. Each cheers when crowned; then the winner dances while 2nd and 3rd shake their heads.
- War results: podium, final standings and war prizes. Tap a lord for tabs: Stats (net worth, which is the gold in their final army, hero
  items, castle and defences; hero, unit and castle damage over the war; days won, kills, spoils, each day's points), Skills, Items,
  Army and Upgrades as they fought the last battle.
- Highlights reel: only ultimates that mattered are shown (a hero killed, or 4+ soldiers, within 5 seconds and 11 tiles of the cast),
  the best three of the fight by hero kills (45 each) and soldier kills (7 each). Every clip runs at least 4 seconds, and an ultimate's
  clip keeps the casting hero and everything that fell to it in frame. The reel ends on the Final placings (same rows as the results
  screen: place, colour, name, class, points, kills, castles).
- Betrayal cut-away (main replay and highlights): the replay pauses and a banner names the betrayer and the betrayed in their colours,
  the camera cuts to the hero with the bomb for 2 seconds, then the fuse and blast play in slow motion on the castle, then the camera returns.
- Top 5 moments: the war's highlights are the five biggest moments of the whole war (at most two of a kind), played in order.
- Muster Hall: a gold crown with a count beside each lord who has won a war in this game (from the hall of fame).

## Battle report

- In a friends war, the report of a battle this device hasn't shown yet opens first when you next plan, with Watch and
  Highlights for the replay. Every other pop-up (gift, invitations, tips, What's new, the mercenary camp) waits until it is
  closed, and if the result lands while the camp, the seal screen or Orders is open, the report takes its place.
- A card per lord: medal, colour, hero sprite, name, points, and chips for heroes killed / deaths / assists, soldiers
  killed, castles taken, damage dealt, levels and gold. Build opens their skills and items; tapping a lord shows net worth and damage to heroes, soldiers and castles, then skills, items, upgrades and army. Deaths, assists and damage are recorded from 20 Nov. An assist is damaging an enemy hero in the
  10 seconds (`ASSIST_SECS`) before another lord kills it.

## Alliances

- Invite a lord with an optional dowry (at most 2 invitations open); they answer the next day and the pact starts at that
  night's battle. Two lords who invite each other ally for free. Pacts carry over until broken or betrayed; on day 7 every
  pact ends (before 23 Nov; see below). An alliance holds at most 3 lords (`BLOC_MAX`) and there must always be two sides.
- From 20 Nov (`allyV2`, `js/sim/alliances.js`): an alliance is a group. A lord or group joins another only if every member
  of each side agreed with every member of the other, so everyone in an alliance is allied to everyone else. In the game,
  inviting one member of an alliance drafts an invitation to each of them. Before then a pact was between two lords only,
  and chains (A with B, A with C, B and C not allied) were possible.
- Final-day alliances (from 23 Nov, `finV2`): day 7 pacts no longer end at dawn. They hold into the battle, and the moment one alliance
  is all that is left standing (or all that is left in sudden death) its pacts break: a banner, "The last alliance breaks", announces it,
  and the allies fight on until one lord wins. Allies never share the war's last victory. The idea: betray before you are betrayed.
- Allies win together if only allies remain (days 1 to 6). From 20 Nov they share the top places, the one with the most castle health
  left first, each scoring their place (only 1st gets the winner's bonus); before then every surviving ally took 1st place.
- Lone wolf (from 20 Nov): while exactly one lord still standing is in no pact and at least one alliance stands, that lord's
  army and castle deal 10% more damage and have 10% more maximum health (current health scales with it) for each allied lord
  still standing
  (`LONE_WOLF_STEP`). It is checked every second of the battle, so it ends the moment a second lord stands alone (a pact
  broken by a betrayal or a fallen castle) or the lone wolf is in a pact, and the extra health goes with it.
- From 25 Nov (`breakV2`, `js/config/orders.js`) disbanding a carried alliance (the Disband button, with an "are you sure?" step) takes
  effect from the next battle: you still fight beside them in the battle you disbanded in, and the alliance is no longer carried into the
  next one (`wActivePairs` in `js/net/world.js`). A disbanded ally cannot be targeted; only a betrayal turns on an ally mid-fight. The
  lord who was disbanded on gets a pop-up when they next plan ("Alliance disbanded"). Before that date Break it ended the pact at the start
  of the battle.
- A pact can be disbanded cleanly or betrayed mid-battle with a bomb in the ally's keep (half its health). A lord can set Betray
  on more than one ally: each armed betrayal sends the hero to that keep, so the bombs go off one after another, never at once. The betrayer scores
  3 points and takes a quarter of the victim's battle spoils; the two deal 20% more damage to each other for the rest of the
  war and can never share an alliance again.
- Bots in friends wars (from 20 Nov, `wBotDiplomacy` in `js/net/world.js`): each day a bot has a 30% chance to invite a
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
