# Daily Siege: gameplay-loop review and backlog

*Design review, 11 Nov 2026. No game code was changed. Every number below comes from the game's own simulation, run headlessly.*

## How this was done

- **Read:** all of `js/` (sim, config, orders UI, replay, net), `functions/lib/`, `README.md`, `OPERATIONS.md`, `daily-siege-hosting-plan.md`, and the in-game guide and patch notes in `js/ui/sheets/info.js`.
- **Not found:** `last-banner-guide.md` is not in the repository. The in-game "How to play" pages were used as the rules reference instead.
- **Played:** a headless script drove the real `fightDay` / `runBattle` code through about 580 full seven-day wars with 10 lords. Each lord earned the real income (base, castle, spoils, catch-up), spent it by a fixed shopping list, placed its army and sealed orders. Batches were 8 to 16 wars each, with the same seeds reused across variants so they compare like for like. The built-in balance tool (`npm run balance`) was also run for 150 single battles at 8 and 10 lords.
- **Limits of the evidence:**
  - The simulated lords are simple. They follow fixed shopping lists, use automatic skill ranks, place soldiers on the nearest free tiles and never adapt to what happened yesterday.
  - Batches are small, so differences under about 5 points per war are noise.
  - The big findings (how battles end, tie-breaks, alliance size) are structural and showed up in every batch. The finer balance numbers are directional.
  - Planning time, replay enjoyment and banter cannot be simulated. Those sections are judgement from reading the screens and rules.

## Diagnosis

### What works (keep it)

1. **The core promise holds.** Sealed secret orders, one server-fought battle, a replay that matches on every phone, a highlight reel, awards, streak names and a full-screen betrayal banner. The spectacle side is the strongest part of the game.
2. **Missing a day is forgiven.** Old orders are fought again, gold banks, and the bottom 30% get catch-up gold. A lord who missed days 3 and 4 scored 34.0 points against 40.6 for one who never missed. A lord who only started on day 4 scored 39.7.
3. **A leader can be stopped if the table agrees to.** When every lord switched to "highest ranked lord" from day 4, the day-3 leader won 1 war in 10, against 4 in 10 otherwise. The tool for a dogpile already exists.
4. **Unlocks are staged through the week.** Castle tiers gate units and gear, mercenaries arrive on day 4, alliances end on day 7. The skeleton of a weekly arc is there.

### What is weak (fix first)

1. **The clock decides battles, and sign-up order breaks the tie.**
   - Every simulated battle ran 162 to 171 seconds whatever the day or the armies. From 100 seconds each castle loses a fixed share of its own health, so every untouched castle dies on the same tick at about 171 seconds.
   - First against second place was settled by that burn in 79% of battles with mixed builds, and 100% with identical builds.
   - Castles that fall on the same tick are ranked by sign-up order. In 70 battles between identical lords, 50 were won on such a tie, and all 50 went to the lord who registered last.
2. **Alliances reward the wrong shape, and betrayal almost never happens.**
   - A pair gains nothing: 41.2 points per war against 43.7 for unallied lords, and it never once won a day together.
   - A bloc of five won 6 days out of 6 it was allied: 85.5 points each against 15.1 for everyone else.
   - A pact is dropped at the end of any battle in which either castle fell, which is nearly every battle. Betray is only offered for pacts that carried over, so a pair never gets the button.
   - When a betrayal did fire inside a trio, the betrayer scored 56.3 against 56.7 for staying loyal. It costs the victim about 6 points and gains the betrayer nothing.
3. **A war has no ending and no memory.** Day 7 is scored like day 2. There is no final ceremony, no winner's screen and no record of past wars. Only hero and banner survive a restart. A friend who joins mid-war is signed up for the next one and has nothing to do until then.
4. **The week is flat.** Battle length, hero levels (the spread between best and worst hero is about 2 levels by day 7) and the scoring are the same every day. With default targeting the eventual winner already led after day 3 in 63% of wars and after day 5 in 81%, with an average 18.8-point lead going into day 7. Only 5 of 30 lords in the bottom three after day 3 finished in the top half.
5. **Planning asks for many choices that barely matter, and has one trap.**
   - Stance moved a lord's war total by about 2 points. Mercenary bids of 250 to 300 gold moved it by about 1. Holding the battleground moved it by nothing.
   - What to buy and whom to march on moved it by 15 to 25.
   - The Seal screen says "If you don't seal, your latest orders are used." The battle code only fights *sealed* orders. A newcomer who sets up on day 1 and never presses the seal fights with a lone hero.

### Balance findings the backlog refers to

One lord changes one thing; the other nine play a balanced build with a random target list. Baseline is 45.3 points per war.

| Change by one lord | Points per war | Wars won (of 12) |
|---|---|---|
| Baseline | 45.3 | 2 |
| Hero items first | 68.2 | 5 |
| Castle defences first, soldiers guard | 62.3 | 4 |
| Target rule: closest castle | 62.0 | 5 |
| Target rule: weakest castle | 56.7 | 3 |
| Siege (raiders, ram, cart) | 54.9 | 4 |
| March on castles instead of nearest foe | 53.6 | 3 |
| Save 1000 gold for the Divine Rapier | 49.3 | 3 |
| Castle upgrades first | 47.4 | 2 |
| Stance aggressive / cautious | 47.8 / 46.9 | 1 / 2 |
| Hold the battleground | 45.3 | 1 |
| Mercenary bid, days 4 to 7 (four groups tried) | 42.5 to 46.6 | 0 to 2 |
| Blood Rite on day 7 | 44.5 | 0 |
| Never arm the ultimate | 41.7 | 2 |
| Bowmen only | 40.1 | 1 |
| Cheap soldiers trained to level 3 | 34.3 | 1 |

Other results:

- **Seats.** In the built-in tool (150 battles, 10 lords, no target lists) wins by seat were 4, 5, 16, 25, 3, 11, 5, 44, 35, 2, where a fair share is 15. Where you sit matters more than which hero you pick.
- **Heroes.** Same run: Shaman won 17% and Warrior 5%, where fair is 10%.
- **Spoils.** Gold from kills averaged 240 to 290 per lord per day, more than the 200 base income.
- **Absence.** A lord who never sealed all week still scored 27.4, because placing is largely settled by the burn.

## Backlog

Impact is on players (H/M/L). Effort is S (a day or two), M (about a week), L (several weeks), XL (more). ⏱ marks anything that adds daily planning time. "Golden" means the determinism hashes must be regenerated and the change date-gated the way `ultV2` is, so saved battles still replay.

| ID | Title | Problem it solves | Proposal | Impact | Effort | Risk | Depends on | Category |
|---|---|---|---|---|---|---|---|---|
| B1 | Fair tie-break when castles fall together | Same-tick falls are ranked by sign-up order; the last lord to register won 50 of 50 tied battles | Rank castles that fall on the same tick by damage their army dealt to castles, then hero kills, then share the place and its points. Never use seat order. | H | S | Balance (low); golden | none | Balance |
| B2 | Let players end the battle, not the clock | Every battle lasts about 170s and 79 to 100% of wins are settled by the burn | Replace the percentage burn with pressure that rewards attackers: from 100s towers stop firing and militia stop mustering, and soldiers deal extra damage to castles. Keep a hard burn only from about 150s as a backstop. Tune so most castles fall to an army. | H | M | Balance (high); golden | B1 | Balance |
| B3 | Shuffle seats each war | Seat decides more than hero; "closest castle" is the best target rule because of who your neighbours are | Seat lords by a seeded shuffle when the war begins instead of sign-up order, and show each lord's two neighbours on the Muster screen. The same friends then get a different map problem every war. | M | S | Tech (low) | none | Balance |
| B4 | Rebalance hero items against soldiers | Items-first scored 68 against 45; cheap trained soldiers scored 34; bowmen-only 40 | Raise tier 2 and 3 item prices or cap item slots by castle tier, and make soldier training cheaper or stronger. Re-run the single-change table until no build leads by more than about 10 points. | M | S | Balance | B2 (tune after) | Balance |
| B5 | Make the battleground worth a point | Holding the hill gives XP and gold but no measurable gain | Award +2 points to the lord (or pact) who held the hill longest, shown as a "King of the Hill" award. It gives lords who cannot win the day a second prize to fight over. | M | S | Balance; golden | none | Balance |
| B6 | Mercenaries that matter | Bids of 250 to 300 gold changed a war by about 1 point | Either cut minimum bids by about a third or strengthen each group by about 50%, and let the auction show how much the winner overpaid. The day-4 arrival should feel like a turning point. | M | S | Balance; golden | none | Balance |
| B7 | Trim options that do nothing | Stance, several if-then rules and most of the 15 hunt-first targets move results by noise | Log which options are used (see "What to measure"), then remove or merge the bottom third. Candidates: merge Skirmish and Cautious, drop "When 3 players remain" for betrayal (it cannot fire inside a bloc, because the team win ends the battle first). Cuts planning time. | M | S | Complexity (reduces it) | Measurement | Balance |
| B8 | Points for 9th and 10th | From 8th place down placing gives 0, so the bottom three have nothing to play for at 10 lords | Stretch the table to ten places (for example 10, 7, 5, 4, 3, 2, 2, 1, 1, 0). | L | S | Balance (low); golden | none | Balance |
| S1 | Pacts last until someone ends them | A pact dies whenever either castle falls, so pairs are never offered Keep / Break / Betray | Carry every pact to the next day unless it was broken, betrayed or it is day 7. Keep the rule that at least two sides must exist. | H | S | Balance; golden | none | Social |
| S2 | Cap or tax big blocs | Five allies won 6 days of 6; nine against one also works | Limit a pact group to 3 lords, or keep groups open but split the win (for example 10 points shared by the survivors, rounded up). Either keeps alliances a tool, not the answer. | H | S | Balance | S1 | Social |
| S3 | Make betrayal pay | The betrayer gains nothing and takes a week-long feud | Give the betrayer a "Treachery" prize when the bomb goes off: +3 points and a share of the victim's spoils for the day. Keep the feud and the revenge hunt as the price. | H | S | Balance; golden | S1 | Social |
| S4 | Betrayal on a fresh pact | Betray can only be chosen for a pact that already survived a battle | Let a lord set a secret betrayal trigger when sending or accepting an invitation. The first battle of an alliance then carries real doubt. | M | S | Complexity (low) | S1 | Social |
| S5 | Player-posted bounties ⏱ | Bounties are automatic; there is no way to put a price on a friend | A lord may escrow gold as a public bounty on one rival's hero or castle, paid to whoever lands the blow. One per lord per day, shown on the map and the Muster screen. Adds about 20 seconds when used. | M | M | Balance; tech (escrow in the client-held economy) | none | Social |
| S6 | Daily front page to share | Banter happens in the group chat, but the game gives nothing to paste there | After each battle build one image or text card: winner, biggest upset, betrayal, best streak name, standings change. One Share button uses the phone's share sheet (already wired for highlight videos). | H | M | Tech (low) | none | Social |
| S7 | Sealed war cry ⏱ | No way to talk trash inside the fight | An optional line (40 characters) sealed with orders, shown on the Muster screen and above the hero on its first kill. Host can switch it off. Adds about 15 seconds when used. | M | S | Complexity (low); moderation among friends | none | Social |
| S8 | Rivalry ledger | Feuds exist only after a betrayal and only for one war | Keep a head-to-head count between every two lords (hero kills, castles taken, betrayals). Tag each lord's worst enemy as "Nemesis" on the report and the map. | M | M | Tech (low) | M1 for cross-war | Social |
| S9 | Call the day ⏱ | A lord who expects to lose has no stake in the replay | One tap before sealing: who wins today. Correct calls earn a little gold and an "Oracle" award; the picks are revealed on the Muster screen. Adds about 10 seconds. Lives outside the sim. | M | S | Complexity (low) | none | Social |
| S10 | Tavern rumours | Orders are fully secret until the battle, so there is little to talk about during the day | Each morning the server gives each lord one true but vague fact about the table ("someone has bid on the Ogre", "two lords have named you hostile"). No names. No planning time. | M | M | Tech (server reads sealed orders; must not leak more than intended) | none | Social |
| D1 | Fix the seal trap | Unsealed edits are never fought, but the screen says they are | Pick one: seal the latest draft automatically at lock, or correct the text and warn in the reminder push when a lord has unsealed changes. Auto-seal is kinder to newcomers. | H | S | Tech (low; server reads drafts) | none | Daily |
| D2 | "Since last night" briefing | After the replay the player lands on the full planning screen with no pointer to what changed | Three cards after the replay: what happened to you (who took your castle, when your hero fell), what changed among rivals (new tiers, units, pacts), and one-tap responses ("target whoever hit me", "repeat orders"). Cuts planning time. | H | M | Complexity (low) | none | Daily |
| D3 | One-tap doctrine for busy days | Full planning has four council tabs plus shop, army and hero | Three presets (Raid, Hold, Hunt) that spend gold by a sensible list, place new soldiers, set targets and seal. The player can still open any screen. Brings a thin day down to under a minute. | H | M | Balance (presets become the meta if too good) | B4 (so presets are fair) | Daily |
| D4 | A push that tells a story | The results push says who won and your place, nothing personal | Build the push from the highlight data the battle already produces: "Riley's ram took your keep at 1:42. 21 hours to plan your answer." Fall back to today's text. | H | S | Tech (low) | none | Daily |
| D5 | Show who has sealed | No sense of the table during the day | Show "7 of 10 sealed" with banners on the planning screen (the public "has sealed" flag already exists in the hosted data). | M | S | none | none | Daily |
| D6 | "My battle in 60 seconds" as the default | A replay runs about 170s plus intro, at the same length every day | Open on a personal cut built from highlights that involve the viewer or their rivals, then offer the full replay. Becomes less necessary once B2 varies battle length. | M | M | Tech (low) | none | Daily |
| W1 | War finale | Day 7 ends like any other day | After the day-7 replay show a podium, the winner's banner, war-long awards (Kingslayer, Oathbreaker, Iron Wall, Most Improved, Best Day) and a share card. | H | M | none | S6 (shares the card builder) | Weekly |
| W2 | Raise the stakes late in the week | Average lead into day 7 was 18.8 points; a day's winner earns about 15 to 25 | Scale points by day (for example ×1 on days 1 to 4, ×1.5 on days 5 and 6, ×2 on day 7) and say so on the leaderboard. Early days still decide gold and position. | H | S | Balance (early days feel cheaper) | none | Weekly |
| W3 | War calendar: a twist per day | Days 1, 4 and 7 play alike apart from unlocks | A fixed, visible week: day 1 no siege engines; day 3 market day (items 25% off); day 4 mercenaries arrive (exists); day 5 blood moon (double bounties); day 6 last day of pacts; day 7 Last Banner. Each twist is a flag stored with the battle. No extra planning. | H | M | Balance; golden | none | Weekly |
| W4 | Underdog quests | Only 5 of 30 lords in the bottom three after day 3 reached the top half | Each day give lords in the bottom half one target worth bonus points ("slay the leader's hero: +3", "survive past 2:00: +2"). The sim already detects giant-slayer and upset moments; this attaches points to them. | M | M | Balance | none | Weekly |
| M1 | War chronicle and hall of fame | Nothing is kept when a new war starts | Save each war's final standings, winner's banner and awards. A "Wars" page lists them and opens any old battle report. | H | M | Tech (data kept per war) | W1 | Meta |
| M2 | Titles and trophies on banners | No status carries between wars | Cosmetic only: the last winner flies a crown on their banner; awards grant titles shown under the name ("the Oathbreaker", "Kingslayer"). No stat bonuses. | M | S | none | M1 | Meta |
| M3 | War rule cards | Week 10 plays like week 3 | A deck of single-rule mutators ("siege is half price", "no walls", "armies stay hidden until day 3", "two battlegrounds"). Last war's bottom lord picks the card for the next war. One card per war. | H | M | Balance; golden per card | M1 | Meta |
| M4 | Last war's top three start with a price on their heads | Day 1 has no bounties because nobody has points | Carry the previous war's top three into day 1 as bounty targets. | M | S | Balance (low) | M1 | Meta |
| M5 | Lord career page | No personal history | Wars won, days won, favourite hero, nemesis, betrayals made and suffered. | L | S | none | M1, S8 | Meta |
| M6 | Map variants | The ring with a centre hill is the only field | Add two or three layouts drawn in the same pixel style (two hills, a river with bridges, an inner and outer ring) and rotate by war. | M | L to XL | Tech (pathing, seat fairness, golden); art | B3 | Meta |
| O1 | Join a war in progress | A new friend mid-war waits up to a week | Let the host admit a lord mid-war with banked gold (the code already grants 300 plus 200 per day passed) and catch-up gold. Sim: starting on day 4 cost about 1 point. The map resizes from the next battle, as it already does when the host removes a lord. | M | M | Tech (map resize mid-war; placements must be re-checked) | none | Onboarding |
| O2 | A steward for lords who never seal | A no-show fights as a lone hero all week | When a lord has no sealed orders, the steward buys and places a plain balanced army with their banked gold and fights it, marked as stand-in. The lord takes over whenever they return. | M | M | Balance (stand-in must be clearly below an attentive player) | D3 (shares the preset) | Onboarding |
| O3 | Away mode | A lord who knows they will be away gets stale orders | "I'm away for N days": the chosen doctrine re-spends and re-seals each day. | M | S | none | D3 | Onboarding |
| O4 | Spectator seat | An eleventh friend, or one waiting for the next war, has nothing to do | Signed-in friends without a castle can watch replays, see the board and place daily calls (S9). | L | M | Tech (security rules for a read-only role) | S9 | Onboarding |

## Quick wins (high impact, small effort)

1. **B1 Fair tie-break.** The largest fairness problem and the smallest change.
2. **D1 Fix the seal trap.** Protects every newcomer's first battle.
3. **S1 Pacts last until ended.** Turns pairs, Keep / Break / Betray and the feud rules into things players actually meet.
4. **S2 Cap or tax blocs.** Do it with S1, or longer pacts make blocs stronger.
5. **D4 A push that tells a story.** The battle already produces the data.
6. **W2 Raise the stakes late.** One table and one line of text.
7. **D5 Show who has sealed.** The flag already exists.
8. **B3 Shuffle seats each war.**

## Bigger bets

### 1. Pacts that produce stories (S1 + S2 + S3 + S4)

- **Goal:** a pair of friends can ally on Monday, win together on Wednesday, and one of them can sell the other out on Friday for a real prize.
- **Rules:**
  - A pact carries over every day until broken, betrayed or day 7.
  - A pact group holds at most three lords.
  - A lord may set a betrayal trigger on any pact, including one made today.
  - When the bomb goes off the betrayer takes +3 points and a share of the victim's spoils. The feud (no re-alliance, +20% damage both ways, revenge hunt) stays as the price.
- **Screens:** nothing new. The Alliances tab already has Keep / Break / Betray; they simply appear more often.
- **Check before shipping:** re-run the alliance batches. Targets: a pair scores 5 to 10 points above solo lords, a trio no more than about 15 above, and betrayal is worth it in roughly a third of situations.
- **Planning time:** unchanged.

### 2. A war that ends and is remembered (W1 + M1 + M2 + M3 + M4)

- **Goal:** a reason to care about week 10.
- **Finale:** after the day-7 replay, a podium, war-long awards and a share card.
- **Chronicle:** every war saved with standings, winner's banner and awards, browsable from the title screen.
- **Carry-over, cosmetic only:** crown on the winner's banner, titles from awards, last war's top three start with bounties.
- **Freshness:** last place picks one rule card for the next war from a small deck. Start with four cards and add one whenever a war feels stale.
- **Why no stat carry-over:** permanent bonuses would make the gap between regular and occasional players grow every week.
- **Planning time:** unchanged. One choice per war for one player.

### 3. Battles that armies decide, in a week with a shape (B1 + B2 + W3 + W2)

- **Goal:** the replay answers "who beat whom", and Tuesday does not look like Saturday.
- **Battle ending:** from 100s defenders weaken (towers stop, militia stop) and attackers strengthen, so the last castles fall to armies. A hard burn remains late as a backstop. Target: fewer than a third of castles lost to the burn, and battle length varying by at least 40 seconds between days.
- **Calendar:** one visible twist per day, stored as a flag with the battle so replays stay exact.
- **Stakes:** points scale up on days 5 to 7.
- **Order of work:** B1 first (independent), then B2 with a re-run of the balance table, then W3 and W2.
- **Risk:** this changes every battle. It needs a date gate so saved battles replay as fought, new golden hashes, and one test war before a real one.
- **Planning time:** unchanged.

## Things not to do

- **Live or interactive battles** (mid-battle commands, a second daily battle, timed events). They break "on your own time".
- **In-app chat.** The group chat already exists. Feed it with share cards (S6) instead.
- **More heroes, soldiers or items for now.** Sixteen items, nine soldiers and six mercenary groups are already more than players can weigh in ten minutes, and several do nothing measurable.
- **Deeper order scripting** (more if-then slots, nested conditions, per-soldier orders). It adds minutes for effects that the simulation shows are within noise.
- **Stats that carry between wars** (permanent hero levels, gold, gear). It would lock in the runaway-leader problem across weeks.
- **Soldiers that die for good.** Losing an army on a day you were away would undo the game's absence tolerance.
- **A scouting or fog minigame.** Another daily decision screen. Rumours (S10) give some of the intrigue for no time.
- **Tech trees or a second resource.** The gold curve is already generous; another currency adds bookkeeping, not decisions.
- **Elimination from the war.** Everyone must have a battle to watch on day 7.
- **Tuning hero win rates before B1 and B2.** The burn and the tie-break currently hide real hero strength.

## What to measure

Most of this can be computed from data the game already saves (each battle stores every lord's orders in `inputs`). The rest needs a small event log per lord.

**From saved battles (a server-side script, no new client code):**

- Battle length, time of first castle fall, castles lost to the burn, same-tick ties and who won them.
- Day wins and war wins by seat, by hero and by sign-up order.
- Standings after each day: lead into day 7, rank changes from day 3 to the end.
- Spending by category from each lord's orders (soldiers, training, castle, gear, defences, items) and unspent gold.
- Option usage: stance, target rule, heading, each if-then rule, each hunt-first entry, formation, ultimate armed, ritual day, mercenary bids and prices paid.
- Alliances: invitations sent, accepted, declined, ignored; pact group sizes; team wins; pacts carried to the next day; betrayals set against betrayals carried out; feuds.
- Stand-in battles: lords fought with no sealed orders, and lords fought on carried-forward orders.

**New events (one small log entry each):**

- App opened, with time of day and hours since the battle.
- First planning action and seal time, giving planning duration and how close to the lock people seal.
- Unsealed changes at lock (the D1 trap).
- Replay opened, finished, speed used, highlights against full replay, share pressed.
- Report, leaderboard and rival-inspect opens.
- Push delivered and opened, by type.

**Headline numbers to watch each war:**

- Sealing rate by day (especially day 7 against day 2).
- Median planning time, and the share of days over 10 minutes.
- Replay completion rate.
- Share of battles won on the burn.
- Number of alliances, team wins and betrayals.
- Lords who return for the next war.

## Open questions for you

1. **Blocs.** Is a five-lord alliance sweeping the week a story you want, or a problem? S2 depends on the answer.
2. **How often should betrayal happen?** Once a war for the whole table, or several times? That sets the size of the prize in S3.
3. **War rhythm.** Back-to-back wars, or a rest day or two between them for the finale, the rule card and trash talk?
4. **Carry-over.** Is cosmetic-only (M2) the right line, or do you want a small handicap on last war's winner beyond the day-1 bounty?
5. **Day weighting (W2).** Are you comfortable with Monday being worth less than Sunday?
6. **Seats.** Keep sign-up order (friends may like "their" corner) or shuffle each war (B3)?
7. **Stand-ins.** Should an absent lord's steward play to win, or only keep the castle from being a free kill (O2)?
8. **Busy-day presets (D3).** Is a one-tap day in the spirit of the game, or should some planning always be required?
9. **Rumours (S10).** Any leak of sealed information changes the secrecy rule. Acceptable if it never names a lord?
10. **War cries (S7).** Free text among friends, or a fixed list of lines?
11. **Mid-war joiners (O1).** Admit them into the running war, or keep the clean start and give them a spectator seat (O4)?
12. **Battle time.** With B2, battles could run shorter or longer than today's fixed 170s. What replay length do you want people to sit through on a phone?

## Small things noticed along the way

- `js/sim/battle.js` (formation block, around line 726) still writes to `globalThis.__rel` and `globalThis.__fd`. They look like debugging leftovers; on the server the list grows with every battle.
- The Alliances tab says "You can betray an ally at any time", but the button only appears for carried-over pacts (see S1 and S4).
