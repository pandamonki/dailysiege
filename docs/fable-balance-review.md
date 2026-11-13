# Daily Siege: Balance, Leaderboard and Castle-Timing Review

**For:** Claude Fable (Claude Code, run in the game repo)

## Goal

By about 300 seconds, every battle should have a result: every castle except the winner's is destroyed. If the
last castles fall on the same tick, they can all be destroyed together. Get there by changing balance values,
not by adding new mechanics. Keep each class's identity and the game's slower pace.

### Facts to check first

- **The battle clock stops at 200 seconds today, not 300.** In `js/config/balance.js`, `TMAX = 200` and
  `SUDDEN = 100`. When time runs out, the castle with the most health wins ("Night falls. The strongest castle
  claims the banner."). For the 300-second goal, `TMAX` has to rise to about 300, and sudden death probably has to
  move as well. Treat both as balance values to recommend in stage 3. Don't change them before then.
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
   - how long battles last, and how often they hit the time cap instead of ending with castles destroyed;
   - win rates by class, by seat and by bot style;
   - castle health against the siege damage each side brings, and when castles actually fall;
   - whether the leaderboard rewards play fairly over the week, including catch-up gold, spoils and bounties.
3. **Write a recommendations report, then STOP.** List each proposed change with the current value, the new value,
   the reason, and the measured effect. Wait for my approval before changing anything.
4. **Implement only the approved changes, then verify again.** Rerun the same measurements and tests, and report
   before-and-after numbers. Add release notes as the project notes in `CLAUDE.md` describe.

## Working rules

- Commit and push to the working branch only. Open a pull request or merge only when I ask.
- Keep reports short and in plain sentences. I often listen to them read aloud.
