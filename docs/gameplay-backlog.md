# Daily Siege: gameplay backlog

*Refreshed 24 Nov 2026. For how the game works now, read `docs/game-rules.md`. The original design review of 11 Nov
(the simulated wars, the balance table and the reasoning behind each item) is in this file's git history.*

## Done since the 11 Nov review

| ID | Item | How it landed |
|---|---|---|
| B1 | Fair tie-break when castles fall together | Same-tick falls no longer go by sign-up order (`test/fairTies.test.mjs`) |
| B2 | Let armies, not the clock, end battles | The health burn was replaced by sudden death at 3:00: castles leave the fight and the armies are drawn into a ring (`sdV2`) |
| B3 | Shuffle seats each war | Seats are shuffled once registration closes |
| B4 | Rebalance items against soldiers | Item rebalance (`itemV6`) and hero rebalance (`balV5`) |
| B6 | Mercenaries that matter | Mercenary camp v2: daily headliners, cooldowns and new minimum bids |
| B7 | Trim options that do nothing | Orders v2 (`ordV2`): army plans and one fall-back replace the if-then commands and soldier orders |
| B8 | Points for every place | One point per place, last scores 1, +2 for winning (`placeV2`) |
| S1 | Pacts last until someone ends them | Pacts carry over until disbanded or betrayed |
| S2 | Cap big blocs | Alliances hold at most 3 lords; the lone wolf gets stronger for each allied lord standing |
| S3 | Make betrayal pay | +3 points, a quarter of the victim's spoils, triple castle points for razing the betrayed keep |
| S6 | Daily share card | Share the day on the battle report: a picture and text through the phone's share sheet |
| D1 | Fix the seal trap | The lock seals a lord's latest draft for them |
| D5 | Show who has sealed | The planning screen shows how many lords have sealed |
| W1 | War finale | The crowning, war results, war prizes and the war's top 5 moments |
| W2 | Raise the stakes late in the week | Placing, kills and castles count 1.5 times on days 5 to 7 |
| W3 | A twist per day | A daily twist from day 2, shown a day ahead on the Daily Noticeboard |
| M1 | Hall of fame (partly) | Past winners are kept; the Muster Hall shows a crown and a count for each war won |
| — | Contracts | Three daily contracts (easy, hard, against a rival) and a Daily Target; covers part of W4 and S8 |

## Still open

Impact is on players (H/M/L). Effort is S (a day or two), M (about a week), L (several weeks). ⏱ marks anything that adds
daily planning time. "Golden" means the change alters battles, so it must be date-gated and the determinism hashes regenerated.

| ID | Title | Proposal | Impact | Effort | Notes |
|---|---|---|---|---|---|
| D4 | A push that tells a story | Build the results push from the battle's own data: "Riley's ram took your keep at 1:42. 21 hours to plan your answer." Fall back to today's text. | H | S | The push is in `functions/lib/notify.js`; the saved battle has `fellAt`, kills and betrayals |
| D2 | "Since last night" briefing | Three cards after the replay: what happened to you, what changed among rivals, one-tap answers ("target whoever hit me", "repeat orders"). | H | M | Cuts planning time |
| D3 | One-tap doctrine for busy days | Presets (Raid, Hold, Hunt) that spend gold, place soldiers, set targets and seal. | H | M | Presets must stay below a planned day, or they become the meta |
| O3 | Away mode | "I'm away for N days": the chosen preset re-spends and re-seals each day. | M | S | Needs D3 |
| O2 | A steward for no-shows | A lord with no orders at all gets a plain balanced army from their banked gold, marked as a stand-in. | M | M | Shares the D3 presets |
| M3 | War rule cards | One mutator per war ("siege half price", "no walls"), picked by last war's bottom lord. | H | M | Golden per card; the daily twists already cover some of this |
| M2 | Titles on banners | Cosmetic titles from war prizes ("the Oathbreaker", "Kingslayer") shown under the name. | M | S | Crowns already exist |
| M4 | Last war's top three start with a bounty | Carry the previous war's top three into day 1 as bounty targets. | M | S | Day 1 has no bounties today |
| M5 | Lord career page | Wars won, days won, favourite hero, nemesis, betrayals made and suffered. | L | S | Needs M1 data across wars |
| S7 | Sealed war cry ⏱ | An optional 40-character line sealed with orders, shown on the muster screen and above the hero on its first kill. | M | S | Free text or a fixed list? |
| S9 | Call the day ⏱ | One tap before sealing: who wins today. Correct calls earn a little gold and an "Oracle" award. | M | S | Lives outside the battle code |
| S8 | Rivalry ledger | A head-to-head count between every two lords; tag each lord's worst enemy as "Nemesis". | M | M | Contracts already name yesterday's foe |
| S4 | Betrayal on a fresh pact | Allow a secret betrayal trigger when the pact is made, not only on carried pacts. | M | S | Golden |
| S5 | Player-posted bounties ⏱ | A lord escrows gold as a public bounty on a rival, paid to whoever lands the blow. | M | M | Escrow in the client-held economy |
| S10 | Tavern rumours | Each morning one true but vague fact about the table, never naming a lord. | M | M | Changes the secrecy rule |
| B5 | Make the hill worth a point | +2 points to the lord or alliance that held the hill longest ("King of the Hill"). | M | S | Golden |
| W4 | Underdog quests | Bonus targets only for the bottom half ("slay the leader's hero: +3"). | M | M | Partly covered by contracts |
| D6 | "My battle in 60 seconds" | Open on a personal cut of highlights that involve the viewer, then offer the full replay. | M | M | |
| O1 | Join a war in progress | Let the host admit a lord mid-war with banked and catch-up gold. | M | M | The roster is locked at registration today |
| O4 | Spectator seat | Signed-in friends without a castle watch replays and the board. | L | M | Needs a read-only role in the security rules |
| M6 | Map variants | Two or three more layouts (two hills, a river with bridges), rotated by war. | M | L | Pathing, seat fairness, golden, art |

## Suggested next

1. **D4 A push that tells a story.** Small and server-only; brings people back every day.
2. **D3 + O3 presets and away mode.** One piece of work that makes busy and absent days painless.
3. **D2 Since last night briefing.** Pairs well with the share card and the story push.
4. **M2 + M4 cosmetic and bounty carry-over.** Cheap reasons to care about the next war.

## Things not to do

- **Live or interactive battles** (mid-battle commands, a second daily battle). They break "on your own time".
- **In-app chat.** The group chat already exists; feed it with share cards instead.
- **Deeper order scripting.** Orders v2 deliberately simplified orders; don't grow them back.
- **Stats that carry between wars** (hero levels, gold, gear). They would lock in the runaway leader across weeks.
- **Soldiers that die for good**, or **elimination from the war.** Everyone must have a battle to watch on day 7.
- **A second resource or a tech tree.** More bookkeeping, not more decisions.

## What to measure

Most of this can be read from saved battles (each stores every lord's orders in `inputs`):

- Sealing rate by day, and lords fought on carried-forward orders.
- Battle length, castles that fell before sudden death, and wins decided in sudden death.
- Day and war wins by seat and by hero.
- Alliances made, team wins, betrayals set against carried out.
- Share button presses (needs a small event log), replay and highlights completion.

## Open questions

1. **Busy-day presets (D3).** Is a one-tap day in the spirit of the game, or should some planning always be required?
2. **Stand-ins (O2).** Should an absent lord's steward play to win, or only keep the castle from being a free kill?
3. **War cries (S7).** Free text among friends, or a fixed list of lines?
4. **Mid-war joiners (O1).** Admit them into the running war, or keep the clean start and offer a spectator seat?
5. **Rumours (S10).** Is any leak of sealed information acceptable if it never names a lord?
