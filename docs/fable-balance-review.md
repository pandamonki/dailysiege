# Daily Siege: Balance, Leaderboard and Castle-Timing Review

**For:** Claude Fable (Claude Code, run in the game repo)

## Goal

Castles should fall by about **200 seconds** (a rough target), with a hard battle limit of **300 seconds**. By
then every castle except the winner's should be destroyed. If the last castles fall on the same tick, they can all
be destroyed together. Keep each class's identity and the game's slower pace.

You are free to propose any change that helps, not just sudden death. That includes balance values (castle health,
unit strength, number of units, militia waves, timings, siege damage, income) and changes to how the game works,
including new mechanics that don't exist yet.

### Facts to check first

- **The battle limit is 200 seconds today, and it should become 300.** In `js/config/balance.js`, `TMAX = 200`.
  When time runs out, the castle with the most health wins ("Night falls. The strongest castle claims the
  banner."). Recommend raising `TMAX` to 300 in stage 3. Don't change it before then. Battles that reach the limit
  should be rare.
- **Sudden death** starts at `SUDDEN = 100` seconds. From then on, all damage is 25% higher. Older battles also
  drained castle health every second after that point, but that part is off for battles from 12 November
  (`balV3`). Sudden death is only one lever among many.
- **The sim has no draws today.** When castles fall on the same tick, or end on equal health, the winner is decided
  by siege damage, then kills, then a seeded random pick (see the top of `js/sim/battle.js`). "All castles
  destroyed" means the last castles falling on the same tick. Say whether that case should still pick one winner.
- Useful tools: `tools/balance.mjs` (battle length, how battles end, win rate by hero and by seat),
  `tools/length-by-day.mjs` (battle length over a seven-day war) and `node --test` (includes the bot and golden
  tests).

## Order of work

1. **Bot review, then implement the bot fixes.** Review the bot lords in `js/sim/bots.js`: their styles, waves,
   targeting, purchases and stances. Fix bugs and poor choices. You may change code in this stage. Run the tests.
   If a sim change shifts the golden files, update them with `npm run golden:update`, and explain why they changed.
2. **Analyse balance, castle timing and the leaderboard. Analysis only.** No balance changes go into the game in
   this stage. Measure with the tools above, at several lord counts and across days 1 to 7:
   - how long battles last, how often castles have fallen by 200 seconds, and how often battles hit the time limit
     instead of ending with castles destroyed;
   - win rates by class, by seat and by bot style;
   - castle health against the siege damage each side brings, and when castles actually fall;
   - whether the leaderboard rewards play fairly over the week, including catch-up gold, spoils and bounties.
   Then **trial each candidate change on its own.** Apply it locally, rerun the same measurements, record how much
   that change alone moves battle length, time-limit finishes and win rates, then revert it. Also trial the
   combination you would recommend, since changes can stack or cancel out. Nothing from these trials is committed.
3. **Write a recommendations report, then STOP.** For each proposed change, give what it is (the current and new
   value, or how the new mechanic works), the reason, and its measured effect on its own from the trial. Then give
   the effect of the recommended combination. Wait for my approval before changing anything.
4. **Implement only the approved changes, then verify again.** Rerun the same measurements and tests, and report
   before-and-after numbers. Add release notes as the project notes in `CLAUDE.md` describe.

## Working rules

- Commit and push to the working branch only. Open a pull request or merge only when I ask.
- Keep reports short and in plain sentences. I often listen to them read aloud.
