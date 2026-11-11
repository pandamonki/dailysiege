# Daily Siege Game Design

Originally written 5 Nov 2026 by Josh as "Last Banner Game Design" (the game's working title; the
name survives in a few storage keys). Brought into the repo and updated to match the code on
11 Nov 2026; what changed is listed at the end.

This doc describes how Daily Siege should work and why. It holds the game's principles, not its tuning numbers: those live in the game and change often. When a change to the game conflicts with a principle here, change the principle deliberately or don't make the change.

## Overview

Daily Siege is an asynchronous battle game for a small group of friends (2 to 12, normally 10) on their phones. Everyone plans during the day, and one battle a day plays out automatically from those plans at a fixed time. Players watch the result afterwards as a replay, a recap and a highlights reel.

The fun is in plans colliding. Each player sets their army, targets and alliances in secret. At battle time the plans meet, alliances are tested and betrayals land, and the battle never goes the way anyone expected.

## Pillars

- **Plan, then watch.** There is no live control during a battle. All agency is in planning; the replay is the payoff.
- **Short daily sessions.** A day's planning should take a few minutes on a phone. Depth comes from decisions, not from screens or menus.
- **Plans fall apart.** Armies fight whatever crosses their path. Orders set intent, not exact outcomes.
- **Secrets are real.** Nobody, including the host, can read another player's plan for today by any route. The server enforces it; the screens do not merely hide it.
- **Trust is a currency.** Alliances cost something, can be refused and can be traps. Betrayal is always possible, always secret until it happens, and always visible afterwards.
- **Nobody turtles.** Every army must eventually march on someone. Defending alone can't win.
- **Always a story.** Every battle should produce moments worth retelling to the group: a betrayal, an upset, a last stand.
- **The week stays close.** Catch-up systems keep players near the bottom in the game until the last day.
- **Easy to read.** Every rule should be explainable in one sentence and visible on the map or in the replay.

## The weekly and daily loop

- A war is seven daily battles, counted from the war's first battle (not the calendar week). The code calls this a "week". Champions, soldiers, gear and gold build up across the week, then everything resets for a fresh war where players pick their class again. The host starts the next war; everyone keeps their place and the same invite link.
- Each day has three beats: plan (any time before the lock), battle (resolved automatically at the lock time), and watch (recap, highlights and replay).
- Points from each battle add up to a weekly leaderboard. The weekly winner is the headline result.
- Each player has one class per week, chosen at the start of the week.
- New players can join mid-war but start from the next one, so a war's roster stays fixed. If more sign up than there are seats, sign-up order decides and the rest wait.
- The last day is different: every alliance ends and each player fights alone.

## Planning: Muster, then Orders

Planning is split into two steps so each screen asks one kind of question.

- **Muster (what you bring):** level the champion and pick ability upgrades, buy and train soldiers, buy gear, traps and castle defences, and place the army in your deployment zone.
- **Orders (what you intend):** set your stance (how readily units retreat), targeting priorities, simple if-then rules, per-soldier orders, and your diplomacy towards each rival.
- **Sealing:** sealing commits your plan for the day; you can unseal and change it until the lock. Only sealed orders are ever fought. If you don't seal, your most recent sealed orders of this war are fought again, and if you have sealed nothing all war you get simple stand-in orders with your chosen hero. Drafts are never fought.
- **The lock is absolute.** Once the battle time passes, the day's orders are frozen for everyone. Tomorrow's orders can already be drafted while tonight's battle is being fought.

## Champions and classes

- Each player has one champion: the most powerful unit on the field and the heart of their army, worth roughly a small squad of soldiers.
- There are five classes, each with three abilities, an ultimate, and an upgrade choice on each ability. Abilities fire automatically from simple triggers the player sets.
- **Warrior:** the frontline tank; strongest in direct fights against other heroes.
- **Mage:** heavy area damage, but fragile; survives by repositioning.
- **Archer:** long-range damage that kites away from melee.
- **Shaman:** a hybrid support who heals, summons and buffs.
- **Rogue:** a hit-and-run assassin who hunts wounded targets and fragile heroes, and is weak against massed soldiers.
- A champion can die and revive during a battle, but not endlessly.
- Champions gain levels from what they do in battle, with a cap on levels gained per day, and spend one skill point per level. Ultimates recharge between battles, so the player chooses which battles to use them in.

## Soldiers, gear and defences

- Soldiers are bought with gold, carry over from day to day, and can be trained to become stronger. Each type has one clear job: blockers that pin enemies, ranged hero-hunters, a heavy frontline, healers, and fast siege raiders. Stronger soldier types are unlocked by upgrading the castle.
- **Siege engines:** a small, limited number of slow machines that ignore soldiers and exist to break castles. They need time to recharge between uses.
- **Mercenaries:** from the middle of the war, players bid in secret for sell-sword groups. The highest sealed bid gets them for one battle, then the group rests.
- **Militia:** castles send out free militia in waves during battle. This keeps the field from emptying into a few heroes walking unopposed between castles.
- **Gear:** gear upgrades the champion in three slots (weapon, armour, charm), each with escalating tiers.
- **Traps:** traps are hidden, last one battle, and reward predicting where enemies will walk.
- **Castle defences:** walls, towers and castle upgrades make a castle harder to break, but never safe enough to turtle behind. A better castle also pays more gold and unlocks stronger soldiers and gear.
- **Blessings:** once per war a player may call on a blessing when sealing.
- **The Divine Rapier:** one unique, very expensive item that greatly strengthens its carrier and drops where they fall. Whoever picks it up keeps it for the following battles, so its holder is always a target.

## Combat principles

- **Rock-paper-scissors damage:** every unit has an attack type and an armour type, Warcraft 3 style, so army composition matters and counters are readable.
- **Aggression:** a unit that is hit turns on its attacker, and nearby friends join in. Fights snowball into brawls.
- **Pursuit:** units chase fleeing or badly wounded enemies, so retreating has a real cost.
- **Retreat:** units fall back to their castle when badly hurt (how hurt depends on stance), heal, and return. Battles feel like skirmishes rather than fights to the death.
- **Surrounding:** melee units surround targets; being surrounded slows and then pins a unit.
- **Forced aggression:** with nothing nearby to fight, units march on their target list, and failing that on the nearest castle that isn't an ally.
- **Sudden death:** late in the battle, damage rises and castles start to crumble, so every battle ends on time.
- **Defeat and ranking:** a player is out when their castle falls. Placement is by order of elimination, then by remaining castle health. Points reward placement, champion kills and castles taken, and the current leader carries a bounty. Holding the centre hill earns bonus points.
- **Determinism:** the battle is a seeded, deterministic simulation, so every player watching sees the identical fight, on any phone. Each device checks its replay against the official result and reports a difference.

## Diplomacy

- Diplomacy lives on one screen, with three buttons per rival: **Attack**, **Ignore** or **Ally**. The order of the Attack list is the order the army goes after targets.
- **Alliances hold until someone ends them.** A pact carries over from day to day unless either side breaks it at the start of a day, and all pacts end on the last day. *(Originally: alliances lasted one battle.)*
- **Invitations take a day.** An invitation sent today is answered in the receiver's next planning day, so the receiver always gets to decide.
- **Free mutual pacts:** if both players invite each other, the pact is free.
- **Dowries:** a one-sided offer can carry a dowry of gold. The receiver sets terms in advance: refuse, accept above a price, or accept and plan to betray. A refused dowry is returned.
- **Betrayal:** betrayals fire on a trigger the betrayer chose and stay secret until they happen. A dowry can be rigged to explode in the receiver's castle partway through the battle.
- **Last pacts dissolve:** when only allies remain, every pact ends and they fight it out. Alliances can never join everyone into one side: at least two sides must stay in the fight.
- **Bad blood:** after a betrayal, the betrayer and the betrayed can never be on the same side again that war.
- **Spies:** spies give imperfect information about a rival's plan.

## Economy and catch-up

- Gold comes from a starting purse plus daily income. It buys soldiers, training, gear, traps, defences, barracks space and dowries.
- **Catch-up:** players in the bottom half of the standings earn extra income, the leader carries a bounty, and forced aggression stops leaders from hiding.
- **Dowries:** dowries move gold between players, making diplomacy part of the economy.

## Map and fog of war

- The map grows with the number of players. Castles sit evenly on a ring around the centre, and each player deploys in a zone by their castle.
- **Fog of war:** on day 1 you see only enemy castles. From day 2 you see each rival's army as it was at the start of yesterday's battle. Nobody ever sees today's plans.

## Watching: recap, highlights and replay

Watching is the reward for planning, so it must be quick, social and shareable.

- **Recap first.** After each battle, a player's first visit opens the recap: their placing and points, what their army achieved, tomorrow's gold, the champion of the day, key moments, pacts kept or broken, and how the leaderboard moved.
- **Highlights reel.** The simulation flags key moments: betrayals, rigged dowries, kill sprees, damage bursts, top players' castles falling, underdog upsets, revenge on a traitor, giant-slaying, first blood, big ultimates, and the winner (including clutch holds). The reel picks the best handful, shows them in order with a title card, a following camera and a slow-motion beat, and ends on a podium. It can be saved as a video to share with the group.
- **Full replay.** The full replay can be paused, scrubbed and sped up. Tapping any unit opens a Warcraft 3 style inspector with portrait, health, stats, abilities and items.
- **Fair framing.** "Top 3" and "underdog" are based on the standings before the battle, so upsets mean something.

## Presentation

- The map is the main screen. Bottom sheets open when you tap a castle, the champion or a soldier.
- The look is a medieval-fantasy parchment UI with pixel sprites recoloured per team. Team-coloured glows mark champions and castles, health bars are green for you and your allies and red for enemies, and name tags sit above champions and castles.
- Abilities and gear are shown as icon tiles, each with a panel comparing the current level to the next.
- Everything must work one-handed on a phone.

## Lobby and hosting

- The host starts the game and sets the battle time, time zone and number of seats (2 to 12). Friends join from one invite link and sign in once with Google or an emailed link.
- Registration happens in a muster hall before the war: players choose a name, banner and team colour. One player per colour; the earlier sign-up keeps a contested colour. Names are fixed once the war begins.
- The host can remove a player, replace the invite link, and move a castle to a player's new account (lost phone) without changing anything about the castle.
- A practice mode against bots needs no account and is where new players learn.
- The lobby shows time until lock, who has sealed, each player's class (rivals' classes only from day 2), the weekly standings, and a recap for each past battle.

## Balance principles

- Every class should have a fair chance to win a free-for-all, with no class dominant or hopeless.
- One champion should narrowly beat a small squad of soldiers of similar value.
- Every soldier type should earn its cost in its own role.
- Battles should end with armies still fighting, not with heroes wandering between empty castles.
- Balance is checked with the in-game Balance Lab (simulated battles and duels) and `npm run balance` (win rates by hero and by seat at 8, 10 and 12 players), not by feel alone.
- No seat on the map should be favoured: larger maps keep each castle's room and distance to its neighbours about the same.
- **Changing the rules mid-war.** A battle already fought must always replay exactly as it was fought. A rule change therefore applies from a stated day onward. While the game is being built quickly, changes apply from the next battle; larger features may instead wait for the next war. That is the host's choice each time.

## Technical shape

- The game is a web page that installs as a phone app and starts without a connection. Data is shared through a hosted database.
- **The server fights the battle** within a few minutes of the lock, from orders only it can read, and saves the official result. Phones replay it from the same inputs and seed. *(Originally: no server; the first visitor after the lock resolved the battle.)*
- Each player writes only their own plan and their own gold and army. The server does not yet re-check a player's economy, so that part of fairness still relies on trust among friends.
- Push reminders exist: "orders lock soon" to players who have not sealed, and "results are in" after each battle.
- How it is built: `docs/ARCHITECTURE.md`. How to run a war: `OPERATIONS.md`.

## Open directions

- A 3D Warcraft 3 style art pass, likely in Godot with low-poly asset packs.
- Server-side checking of gold and armies (the remaining anti-cheat gap).
- More than one game per host in the screens (the data already allows it).
- Whether classes rotate or new classes are added over time.

## What changed from the original (5 Nov) to match the game (11 Nov)

- Name: Last Banner became Daily Siege.
- Players: up to 8 became up to 12, with larger maps and four more team colours.
- Secrecy and resolution: moved from trust and "first visitor resolves" to a server that holds the orders and fights the battle. Reminders, listed as an open direction, now exist.
- Sealing: only sealed orders are fought (originally the latest saved plan was used).
- Alliances: persist until broken (originally one battle), invitations are answered the next day, bad blood after betrayal, and the last day is a free-for-all.
- Added since: siege engines, mercenary camp, blessings, the Divine Rapier, castle tiers, walls, hero levelling from battle, the centre hill, sign-in and the muster hall, host recovery tools, practice mode.
- Added principle: how rule changes apply mid-war.

**Rule for contributors and AI sessions:** this doc is the source of truth for how the game should play. Keep it to principles; put exact numbers in the game itself (`js/config/`). A change that alters a principle here updates this file in the same pull request.
