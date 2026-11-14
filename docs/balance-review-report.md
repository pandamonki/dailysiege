# Daily Siege: balance review report

Answer to `docs/fable-balance-review.md`. Stages 1 to 3 are done. Nothing in stage 2 or 3 changed the game. Stage 4
waits for approval.

## Short version

Battles have two different problems, and the weekly average hides both.

- **Days 1 to 3: castles do not fall.** Nobody owns siege engines yet. Every battle runs to the time limit and about
  seven of eight castles are still standing. Heroes and soldiers together deal only 30% to 45% of all castle health in 200
  seconds.
- **Days 4 to 7: castles fall too fast.** Once siege engines arrive, the first castle falls after about 13 seconds
  and half of all castles are down by 40 seconds. Engines deal 50% to 70% of all castle damage.

Three changes together fix both. With them, 91% of castles are down by 200 seconds, 4% to 8% of battles reach the
limit (it is 53% to 62% today), and the first castle on days 4 to 7 falls at about 25 seconds instead of 13.

## Stage 1: bot fixes (done, in the game)

- **Bots were far too rich.** They were handed an army by the day of the week, worth two to three times what a lord
  can afford by day 7. They now replay a week of shopping on a lord's income, at shop prices, under the shop's rules.
- **Level 4 soldiers on day 7.** The shop stops at level 3. Fixed.
- **Trained powder carts.** Carts can't be trained. Fixed.
- **More than 8 soldiers on the field.** Fixed: bots buy beds like anyone else.
- **Combat reach of 1 tile** left ranged soldiers ignoring their priorities. Reach is now 2 to 4 tiles.
- Styles, wave conditions, targets and stances were reviewed and left alone. No style wins clearly more than another.
- Golden files did not change. They do not use bots. All 76 tests pass.
- `tools/balance.mjs` and `tools/length-by-day.mjs` were still fighting by the rules from before 16 November. Fixed.
- New tool: `tools/war-lab.mjs` plays whole seven-day wars between bots through the real game code. All numbers
  below come from it.

## Stage 2: what was measured

Wars of 6, 8, 10 and 12 bot lords, 16 wars each, days 1 to 7, rules for battles from 16 November.

### Battle length today

- Average length is 137 to 159 seconds. 53% to 62% of battles reach the 200 second limit.
- Days 1 to 3: 100% reach the limit at every lord count.
- Days 4 to 7: 6% to 63% reach the limit. The first castle falls at 11 to 16 seconds.
- Only 59% to 62% of castles are down by 200 seconds.

### Why castles stand early in the week

By 150 seconds an average battle has five heroes and two or three soldiers left on the whole map. They are next to
enemy castles, but blades and arrows do half damage or less to castles. Total castle damage is about 8 to 10 a second
across the map, against 5,500 total castle health. Weaker castles or a longer battle do not fix this on their own.

### Win rates

- **Heroes:** no hero is clearly out of line. With 8 lords each hero wins 11% to 14% of battles (fair is 13%).
- **Bot styles:** 10% to 14%. Fine.
- **Seats, 6 and 8 lords:** fair, within noise.
- **Seats, 10 and 12 lords: not fair.** Castles are rounded to whole tiles, so some sit closer to their neighbours.
  With 12 lords, seat 7 has both neighbours 5.1 tiles away and scores 4.4 points a day. Seats 3 and 9 have theirs
  over 6 tiles away and score 7.7 and 8.3. With 10 lords, seats 4 and 9 win 19 battles each where a fair share is 11.

### Leaderboard

- On days 1 to 3 every place is decided by castle health at the time limit. That rewards being left alone, not
  playing well. The changes below fix this as a side effect.
- The day-3 leader wins the week 13% to 38% of the time today. With the changes it is 31% to 44%. Skill early in the
  week counts for more, and the week is still open.
- Last place ends with 45% of the winner's points with 8 lords, 29% with 10 and 19% with 12.
- Day 7 gives the winner 16% to 22% of their points. That feels right.
- **Gold is level today.** Catch-up gold almost exactly cancels the leader's extra spoils. Over a week the winner
  earns about 4,000 to 4,750 gold and last place about 4,200 to 4,900.
- The first pass could not measure catch-up gold or bounties, because bots did not spend them. They do now. See
  the second pass below, which changes the verdict.

## Stage 3: recommendations

Each was trialled on its own with 8 lords, 10 wars. Today's numbers for that run: 46% of battles finished by 200
seconds, 54% reached the limit, first castle on days 4 to 7 at 13 seconds.

### 1. Raise the battle limit from 200 to 300 seconds

- **What:** `TMAX` 200 to 300.
- **Why:** it is the brief's own target, and change 2 needs the room.
- **Alone:** 44% of battles still reach the limit. Days 1 to 3 still all do. Not enough alone.

### 2. Sudden death that bites: castle damage doubles every 15 seconds after 1:40

- **What:** today all damage is 25% higher from 100 seconds. Keep that, and add: from 100 seconds, damage to castles
  doubles every 15 seconds. That is 2 times at 1:55, 10 times at 2:30 and 100 times at 3:20.
- **Why:** it is the only lever that works early in the week. A castle still only falls to an attack, so there is no
  return of castles burning down on their own.
- **Alone:** limit finishes drop from 54% to 24%. Finished by 200 seconds rises from 46% to 76%. Castles down by 200
  seconds rises from 59% to 92%.
- **With change 1:** limit finishes drop to 1%.

### 3. Slower, weaker siege engines

- **What:** ram attack 125 to 70 and speed 0.8 to 0.5. Catapult attack 110 to 60 and speed 0.5 to 0.35. Powder cart
  blast on castles 540 to 300 and speed 0.45 to 0.32. A cart no longer flattens a tier 1 castle alone.
- **Why:** this keeps the slower pace late in the week. Engines stay the best way to take a castle.
- **Alone:** days 4 to 7 average length rises from 103 to 160 seconds and the first castle falls at 22 seconds, not
  13. But limit finishes rise to 76%, so it must not ship without change 2.
- Shop notes for the ram and the cart would need new wording.

### The three together

Measured with 6, 8, 10 and 12 lords, 16 wars each.

- Average length: 168 to 190 seconds (137 to 159 today).
- Finished by 200 seconds: 60% to 72% (38% to 47% today).
- Reached the limit: 4% to 8% (53% to 62% today).
- Castles down by 200 seconds: 90% to 92% (59% to 62% today).
- Days 1 to 3 average 206 to 230 seconds. Days 6 and 7 average 107 to 155 seconds.
- First castle on days 4 to 7: 17 to 42 seconds (11 to 16 today).
- Hero win rates stay level: 11% to 15% with 8 lords.

### 4. Same-tick endings: keep picking one winner

When the last castles fall on the same tick, keep today's rule: most siege damage, then kills, then a seeded draw.
The board needs a place for everyone, and a shared win would pay first-place points twice.

### 5. Seats with 10 and 12 lords: fix the spacing (not yet trialled)

Place castles so every seat has neighbours at the same distance. This needs a small layout change and its own trial.
I can do that as a follow-up if wanted.

## Second pass: engines, raiders, bot orders and the board

This pass answers follow-up questions. Bots were improved first, so every number here is a fresh run: 8 lords, 12
wars for the trials, 30 wars for the leaderboard.

### Bots now earn and spend real gold

Before, bots shopped on an estimated income. They now get what they really earned each night: spoils, bounties and
catch-up gold, worked out from the war's own battles exactly as a lord is paid. So catch-up gold and bounties now
feed back into bot armies and into the board.

### Do bots order soldiers onto castles?

Only partly, and it shows.

- The army's heading is "castle" for four of the five styles. The hunter style heads for heroes.
- One garrison wave has the "march on castle" order in three of the five styles.
- Soldiers on the field have no castle order. They follow their combat groups, which only list enemy fighters. The
  game has no such order for a lord to give either.
- Result: only 5% to 20% of footmen ever hit a castle, and 3% of bowmen. Heroes reach one about half the time.

### How raiders fare

Poorly, at today's numbers.

- A raider deals 80 to 130 castle damage in its life. A castle has 600 to 900 health.
- Only about half of raiders reach a castle, and almost none survive.
- For each 100 gold, a raider deals 66 to 119 castle damage. A ram deals 327, a catapult 95, a powder cart 45.
- A ram deals about 1,100 castle damage, 91% reach a castle and half survive. Rams are the outlier, not raiders.
- **If bots buy two raiders each from day 2:** days 1 to 3 still all reach the limit. The first castle falls about
  25 seconds sooner.
- **If raiders are also unlocked at tier 1:** the first castle on days 1 to 3 falls at 17 seconds, and 78% of those
  battles still reach the limit. One castle is rushed and the rest stand. Not recommended.
- **Raiders made stronger on top of the recommended changes:** battles average 76 seconds. Far too fast.
- With the recommended changes and raider-buying bots, results hold: 4% reach the limit, 94% of castles down by 200
  seconds. The first castle on days 4 to 7 falls at 17 seconds instead of 22.

### Limit of one siege engine per lord

- **Alone:** days 4 to 7 average 121 seconds instead of 99. The first castle still falls at 15 seconds, because one
  ram is enough. Limit finishes stay at 61%.
- **With changes 1 and 2 but without the engine slow-down:** days 4 to 7 average 98 seconds, first castle at 14
  seconds. It does not slow the opening.
- **On top of all three changes:** days 4 to 7 average 137 seconds instead of 122, first castle at 25 seconds.
- Verdict: a mild extra brake. It works as an add-on to change 3, not as a replacement. I read the idea as "one
  engine per lord". If it meant "one type, any number", bots already average one type most days, so it changes less.

### The board: catch-up gold and bounties

Measured with 8 lords over 30 wars.

- **Catch-up gold works today.** With it a lord moves 1.31 places a day. Without it, 1.12. Last place ends with 46%
  of the winner's points with it, 41% without.
- **Bounties mostly pay the leaders.** The lords who kill top-three heroes and castles are usually other top lords.
  Removing bounties narrows the gold gap between first and last, it does not widen it.
- **The recommended changes stiffen the board.** More castles fall, each pays 60 gold plus any bounty, and the
  winners collect most of it. The winner's weekly gold rises from about 4,500 to 5,800 while last place stays near
  4,600. A lord moves 1.13 places a day instead of 1.31, the lead changes 2.6 times a week instead of 3.4, and the
  day-3 leader wins the week 40% of the time instead of 23%.

### 6. Raise catch-up gold by half (new recommendation, goes with changes 1 to 3)

- **What:** the bottom 30% get 210 to 450 gold a night instead of 140 to 300.
- **Why:** it puts the board's movement back where it is today.
- **Measured on top of changes 1 to 3:** a lord moves 1.27 places a day (1.13 without), the lead changes 3.0 times a
  week, and last place ends with 46% of the winner's points (38% without). Battle length is unchanged.
- Doubling it instead gives last place more gold than the winner, which is too much.

### 7. Optional: bounties only pay lords lower on the board

- **What:** the bounty on a top-three lord is paid only if the killer is ranked below them.
- **Measured on top of changes 1 to 3:** the winner's weekly gold drops from 5,800 to 5,300 and a lord moves 1.20
  places a day instead of 1.13. A small help. Together with change 6 it adds nothing measurable, so pick 6 first.

## Tried and not recommended

- **Castle health 600 to 450:** days 1 to 3 still all reach the limit, and late battles get even shorter.
- **Castle health 600 to 900:** slows late battles, but limit finishes rise to 66%.
- **Blades, arrows and magic hit castles harder:** days 1 to 3 still all reach the limit.
- **Gentler sudden death** (castle damage up 2.5% or 5% a second): days 1 to 3 still reach the limit 97% of the time.
- **Castles take 60% less damage in the first minute:** slows late battles, but limit finishes rise to 71% alone.
  The engine change does the same job more simply.

## Not changed

Hero classes, bot styles, base income and points.

## Stage 4: what was implemented

Approved: changes 3 (lower damage for rams and catapults only), 4 (reshaped) and 7. Change 1 was implemented, then
withdrawn: the limit stays at 200 seconds (300 seconds is 5 minutes, too long). Change 2, the stronger
sudden death, was not approved and is not in. All rules apply to battles from 16 November 2026 (`BAL_V5_FROM`).
Earlier saved battles replay exactly as fought: the golden files did not change.

- **Battering Ram:** attack 125 to 70, speed 0.8 to 0.5.
- **Catapult:** attack 110 to 60, speed 0.5 to 0.35.
- **Powder Cart:** speed 0.45 to 0.32. The blast is unchanged at 540.
- **Catch-up gold:** the whole bottom half of the board, in even steps from 450 for last place down to 210 for the top
  of the bottom half. With 8 lords: 450, 370, 290, 210. On an odd board the middle lord gets none.
- **Bounties:** only paid, in gold and in the matching hero experience, to a lord ranked below the victim.
- Release notes (v1.2) and full patch notes added. New tests in `test/balV5.test.mjs`.

### Before and after

Measured with 16 wars each at 6, 8, 10 and 12 lords.

- **Days 1 to 3 still run to the limit:** 94% to 100% of battles, now at 300 seconds instead of 200. This is the gap
  change 2 was meant to close.
- **Days 4 to 7 are slower:** they average 133 to 194 seconds (was 78 to 116). The first castle falls at 19 to 24
  seconds (was 13 to 15).
- **Days 4 to 7, battles reaching the limit:** 8% to 20%, against 14% to 27% before.
- **Over the week:** 45% to 54% of battles reach the limit (51% to 58% before). About 60% of castles are down by 200
  seconds, the same as before.
- **Hero and bot style win rates:** unchanged.
- **Gold:** the bottom half now ends the week with about as much gold as the winner. With 8 lords the winner earns
  5,800 and last place 5,480, against 4,370 and 4,280 before.
- **Board movement:** similar. With 8 lords a lord moves 1.36 places a day (1.32 before).

## Third pass: gold by place, what is left on the field, soldiers on castles, hero retreats

The battle limit is back at 200 seconds. Trials below: 8 lords, 12 wars each, against today's branch (slower siege,
new catch-up gold and bounties, 200 seconds).

### Gold by final place

Gold a lord can spend in the week (pay after days 1 to 6), 8 lords, 16 wars, by final place from 1st to 8th:
4,256 · 4,387 · 3,944 · 3,991 · 3,639 · 3,911 · 4,242 · 4,093. Under the old rules: 3,582 · 3,629 · 3,545 · 3,359 ·
3,138 · 3,114 · 3,359 · 3,458. Both are close to flat, with a dip in the middle. Leaders earn spoils, the bottom earns
catch-up gold, and the middle earns least. The winner's advantage is points and a strong army, not gold.

### What is left on the field

Counted only in battles still running at that moment, 8 lords.

- Days 1 to 3, at 1:40: all 8 castles, 6.3 heroes, 8 soldiers (1 per lord). At 2:30: 7.6 castles, 5.4 heroes, 2
  soldiers. At 3:20: 7 castles, 4.5 heroes, under 2 soldiers.
- Days 4 to 7, at 1:40: 3.6 castles, 2.9 heroes, 6 soldiers. At 2:30 and later: about 3 castles, 2.5 heroes, 2
  soldiers.
- So a late fight to the death in the middle would be almost all heroes, with at most one soldier in every four lords.

### Soldiers go for nearby castles

Soldiers (not healers, guards or escorts) attack an enemy castle within reach before anything else. Within 4 tiles
they still turn on a melee attacker who hits them.

- Within 2.5 tiles: limit finishes 55% to 46%, castles down by 200 seconds 60% to 82%. Days 1 to 3 still reach the
  limit 94% of the time, but the first castle falls at 64 seconds instead of 151.
- Within 3 tiles: almost the same as 2.5.
- Within 4 tiles: limit finishes 24%, castles down 93%. Days 4 to 7 average 75 seconds, too fast.
- Within 6 tiles: battles average 78 seconds. Far too fast.

### Hero retreats

- Bots drop their "retreat at 30% health" rule: limit finishes rise to 62%. Heroes die sooner and stop besieging.
- Heroes fall back only after losing 20% of their health within one second: the first castle on days 1 to 3 falls
  at 128 seconds instead of 151. Limit finishes 60%.
- Both together: limit finishes 50%. Hero win rates spread to 8% to 20%.
- Archers, mages and rogues never step back: limit finishes 61%.
- All of it together: no change, 57%.
- Hero retreats barely affect when castles fall. They change how fights feel, not how they end.

### Combined with sudden death (castle damage doubles every 15 seconds from 1:40)

- Sudden death alone: limit finishes 24%, castles down 93%. Days 1 to 3 average 191 seconds, days 4 to 7 119.
- Sudden death and soldiers on castles within 2.5 tiles: limit finishes 6%, castles down 99%. Days 1 to 3 average 168
  seconds, days 4 to 7 average 90. First castle on days 4 to 7 at 20 seconds.
- Sudden death and soldiers on castles within 4 tiles: limit finishes 1%. Days 4 to 7 average 66 seconds, too fast.

## Stage 4, part 2: soldiers storm castles (implemented)

From 16 November, a soldier within 2.5 tiles of an enemy castle attacks it before anything else. Clerics, castle
guards and escorts are not affected. Equally near castles are settled by a fair draw.

All changes on the branch together, against the rules before them, 16 wars each:

- **8 lords:** castles down by 200 seconds 60% to 81%. Battles reaching the limit 58% to 46%. Days 1 to 3 still
  reach the limit 96% of the time, but the first castle falls at 66 seconds instead of 147. Days 4 to 7 reach the
  limit 9% of the time (27% before). The first castle on those days falls at 19 seconds (15 before).
- **10 lords:** castles down by 200 seconds 63% to 82%. Battles reaching the limit 53% to 51%. Days 4 to 7: 16%, the
  same as before.
- Hero and bot style win rates unchanged.
