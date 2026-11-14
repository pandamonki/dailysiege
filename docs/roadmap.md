# Daily Siege: product roadmap

*Written 14 November 2026, after v1.1. It builds on the design review in `gameplay-backlog.md`; the codes in brackets (D2, M1 and so on) point to the entries there.*

## Where the game stands

**The promise:** ten friends, one secret set of orders each, one battle a day, a replay worth talking about. Ten minutes a day, on your own time.

**Already strong**

- The spectacle: deterministic replays, highlight reels, awards, the betrayal banner, the day-7 finale with podium.
- The platform: hosted wars, server-fought battles, installable app, push notifications, bots to fill seats.
- Fairness fixes from the review have shipped: fair ties, no castle burn, pacts that last, a prize for betrayal, heavier late days, sealed orders that carry over.
- Depth: five heroes with skill trees, 30+ items, siege engines, garrison waves, mercenaries.

**What still stands between this and "worth playing every week"**

1. Nobody knows what players actually do. Every balance call so far comes from simulated lords, not real ones.
2. Planning is deep but slow, and the game does not tell you what happened to you or what to do about it.
3. A war ends and is forgotten. Week ten plays like week three.
4. The game gives the group chat nothing to paste except a video.
5. A newcomer faces every system at once, and an absent lord is a dead seat.
6. v1.1 changed targeting, militia, scoring and hero behaviour in one go, and none of it has been measured in a real war yet.

## Guiding rules

- Ten minutes a day stays the ceiling. Every feature must cut planning time or leave it unchanged.
- Nothing live. No chat, no mid-battle commands, no second daily battle.
- Nothing that carries power between wars. Carry-over is cosmetic only.
- No new heroes, soldiers or items until the ones in the game are proven to matter.
- Every change to battles is date-gated so old battles replay as fought.

## Phase 1: Prove v1.1 and start measuring (the next two wars)

**Goal:** know, from real wars, whether battles are decided by armies and whether people come back.

- **War report script.** Read the saved battles and print battle length, how castles fell, wins by seat and hero, the lead going into day 7, option usage, alliances and betrayals. No new client code.
- **Small event log.** App opened, first planning action, sealed, replay finished, share pressed, push opened. Gives sealing rate, planning time and replay completion.
- **Re-run the balance table** under v1.1 rules (items first, siege, bowmen only, trained cheap soldiers, catapults now that engines are unlimited). Fix anything that leads by more than about ten points a war [B4].
- **Shuffle seats each war** and show each lord their neighbours [B3].
- **Show who has sealed** on the planning screen [D5].
- **A results push that tells your story**, built from the highlight data: who took your keep and when [D4].
- **Clean-up:** remove the debugging leftovers in the battle code that grow on the server.

**Done when:** one full real war has a report, and fewer than one lord in ten misses a day they meant to play.

## Phase 2: The ten-minute day (about a month)

**Goal:** a thin day takes under a minute, a full day under ten, and you always know why you lost.

- **"Since last night" briefing** after the replay: what happened to you, what changed among rivals, and one-tap answers such as "target whoever hit me" [D2].
- **One-tap doctrines** for busy days: Raid, Hold, Hunt. Each spends gold sensibly, places soldiers, picks targets and seals [D3].
- **My battle in sixty seconds** as the default replay, with the full replay one tap away [D6].
- **Trim options that do nothing**, using the usage numbers from phase 1: stance, weak if-then rules, unused hunt-first entries [B7].
- **Make the weak choices matter or remove them:** mercenary bids [B6], the battleground [B5], points for the bottom places [B8].
- **Guided first war.** Day 1 shows only hero, army and targets. Shop depth, garrison waves, combat groups and alliances open up day by day with a one-line explanation each.

**Done when:** median planning time is under six minutes and new lords seal on their first day without help.

## Phase 3: Something to talk about (about a month)

**Goal:** every battle produces something that lands in the group chat.

- **Daily front page.** One image after each battle: winner, biggest upset, betrayal, best streak, standings change. One Share button [S6].
- **Call the day.** One tap before sealing on who wins today; correct calls earn a little gold and an Oracle award [S9].
- **Rivalry ledger and Nemesis tag.** Head-to-head record between every two lords [S8].
- **Player-posted bounties.** Put your own gold on a friend's head [S5].
- **Sealed war cry.** A short line shown at muster and on your hero's first kill [S7].
- **Secret betrayal on a fresh pact,** so the first day of an alliance carries doubt [S4]. Decide on a cap for big blocs at the same time [S2].
- **Tavern rumours.** One true but vague fact each morning, never naming a lord [S10]. Needs your call on secrecy first.

**Done when:** at least half the lords press Share at least once a war.

## Phase 4: Wars worth remembering (one to two months)

**Goal:** a reason to care about week ten.

- **War chronicle and hall of fame.** Every war saved with standings, winner's banner and awards, browsable from the title screen [M1].
- **Titles and trophies on banners.** The last winner flies a crown; awards grant titles. Cosmetic only [M2].
- **War calendar.** One visible twist per day, such as market day or blood moon [W3].
- **War rule cards.** Last place picks one rule for the next war from a small deck [M3].
- **Price on the champions' heads.** Last war's top three start day 1 with bounties [M4].
- **Underdog quests.** Bonus points for the bottom half for slaying the leader or surviving late [W4].
- **Lord career page.** Wars won, favourite hero, nemesis, betrayals [M5].
- **A rest day between wars** for the finale, the rule card and trash talk, if you want one.

**Done when:** nine lords in ten sign up for the next war.

## Phase 5: Room for more people (alongside phase 4)

**Goal:** nobody waits a week to play, and no seat is dead.

- **Steward for absent lords.** A lord who never seals gets a plain army bought and placed, marked as a stand-in [O2].
- **Away mode.** "I'm away for N days" keeps a doctrine re-spending and re-sealing [O3].
- **Join a war in progress** with banked and catch-up gold [O1].
- **Spectator seat** for an eleventh friend: replays, the board and daily calls [O4].
- **Several wars at once.** The data model already allows it; add a war picker and an invite link per war, so the game can spread beyond one friend group.

## Phase 6: Depth and polish (later, only once the numbers are healthy)

- **Map variants:** two hills, a river with bridges, an inner and outer ring, rotated by war [M6].
- **New content,** one piece per war at most, each paired with a rule card so it gets tested: a sixth hero, a new mercenary group.
- **Music and sound:** planning and battle tracks, hit and siege sounds.
- **Code health:** move to modules and break up the battle file, so changes stop risking the whole sim.
- **Costs and safety:** a monthly check of Firebase spend, backups of finished wars, an account-recovery path that does not need the host.

## What not to build

Live battles, in-app chat, permanent stat carry-over, soldiers that die for good, elimination, a second currency, deeper order scripting, or a fog-of-war minigame. Each one either breaks "on your own time" or adds minutes for no measurable effect.

## Numbers to watch every war

- Sealing rate by day, especially day 7 against day 2.
- Median planning time, and the share of days over ten minutes.
- Replay completion and share presses.
- How castles fall, and wins by seat and by hero.
- The lead going into day 7.
- Alliances, team wins and betrayals.
- Lords who return for the next war.

## Decisions needed from you

1. Is the aim a better game for this one group, or a game other groups can pick up? That decides how early phase 5 comes.
2. Back-to-back wars, or a rest day between them?
3. Are one-tap doctrines in the spirit of the game?
4. Should big alliances be capped at three lords?
5. Are rumours acceptable if they never name a lord?
6. Should an absent lord's steward play to win, or only keep the castle from being a free kill?
