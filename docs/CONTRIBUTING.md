# Contributing

Read `CLAUDE.md` first for commands, conventions and gotchas. This file covers the workflow.

## Branching and merging

- `main` is production. Every push to it deploys hosting, rules and functions
  (`.github/workflows/deploy.yml`). Never commit to it directly.
- Work on a short-lived branch and open a pull request. History so far uses `claude/<name>` branches;
  there is no enforced naming scheme.
- PRs are merged with a merge commit (#2, #3, #4); the large initial port was squashed (#1).
- Each PR from this repository gets a preview URL as a comment (`preview.yml`). The friends game is
  disabled there, so use it for screens and practice mode only.
- Wait for all three CI jobs (`test`, `browsers`, `firebase`) to go green before merging. The deploy
  workflow does not wait for the last two.

## Commit style (matches existing history)

- Subject: one plain-English sentence fragment in sentence case, no trailing full stop, no
  `feat:`/`fix:` prefixes. It describes the behaviour, in words a player would understand.
  - `Always offer Install when the game is not on the home screen`
  - `Do not let a delayed autosave run after leaving the game`
- Optional area prefix when the change is confined to one layer: `Rules: ...`, `Adapter: ...`,
  `End-to-end test: ...`.
- Multi-commit work is labelled `Phase N (part K): ...` or `... (work in progress): ...`.
- Body (when not obvious): what was wrong, why, and what it does now. See `7f6099f` for the model:
  symptom, the two faults found, the fix, and which test now covers it.
- If battle outcomes change, say so in the message and include the re-recorded
  `test/golden/hashes.json` in the same commit.
- One logical change per commit; docs and `package.json` script additions may ride in a final
  "part" commit (`f730e6f`).

## Checks before pushing

```bash
npm run lint
npm test                 # ~30 s
npm run build
npm run test:rules       # if you touched firestore.rules or anything the client writes (needs Java)
```

If you have Playwright and the functions dependencies installed (`npm ci --prefix functions`), also:

```bash
node tools/selftest-browsers.mjs chromium   # after npm run build
npm run test:e2e
npm run test:war
```

Otherwise rely on CI for those three. `docs/TESTING.md` has a table of which checks matter for
which files.

## Adding a feature end to end: worked example

The real change: **raising the player limit from 8 to 12 lords** (Phase 4: commits `3d17abd`,
`beb72c4`, `f730e6f`). It is typical because it crosses config, sim, server-shared code, UI, tests
and docs. Inspect it with `git show --stat 3d17abd beb72c4 f730e6f`.

1. **Data first, in `js/config/`.** `js/config/seats.js` gained `MAX_LORDS`, `DEFAULT_LORDS` and
   four more `SEAT_COLORS`. Constants live in config so the server gets them through `SIM_FILES`.
2. **Deterministic core.** `mapSizeFor()` in `js/core/layout.js` got sizes for 9-12 lords. No
   `Math.*` trig; existing sizes were left untouched so 2-8 lord battles keep their hashes.
3. **Shared world code.** `wCap()` in `js/net/world.js` changed its hard-coded `8` to `MAX_LORDS`,
   keeping `|| 8` as the default so games created earlier still hold 8. Note the pattern: old saved
   data must keep meaning what it meant.
4. **Client and adapter.** Every hard-coded `8` in the muster hall became `seatCap()` and a seats
   dropdown was added (`js/net/lobby.js`); `lobbysave` in `js/ui/actions.js` reads it;
   `js/net/players.js` uses `seatCap()`; new games are created with `maxPlayers: DEFAULT_LORDS`
   in `js/net/backend-firebase.js`. `validGame()` in `firestore.rules` already allowed 2 to 12, so
   the rules needed no change; check that bound first whenever a stored value's range widens.
5. **Extend the golden set, don't replace it.** `js/dev/goldenCases.js` went from 50 to 62 cases
   (12 new battles of 9-12 lords) and `npm run golden:update` appended their hashes
   (the diff to `test/golden/hashes.json` is almost entirely additions). Unchanged old hashes are
   the proof that existing games were unaffected.
6. **Let the new tests find bugs.** The larger battles exposed a placement-points table with only
   eight entries (9th place scored `NaN`). `beb72c4` fixed it in `js/sim/battle.js`, re-recorded
   the affected hashes, and said why in the commit body.
7. **Raise end-to-end coverage to the new limit.** `emulator-tests/war.spec.mjs` now signs up
   twelve lords for a ten-seat war (the last two wait for a seat).
8. **Add a tool when judgement is needed.** `tools/balance.mjs` (`npm run balance`) reports win
   rates by seat at 8, 10 and 12 lords, since "is a 12-lord map fair" is not a pass/fail test.
9. **Docs last.** `README.md` got the "Seats" paragraph and `package.json` the `balance` script.

### Checklist distilled from it

- [ ] New constants in `js/config/`; new files added to `index.html` **and**, if the sim or server
      needs them, `selftest.html` and `functions/lib/game.js`.
- [ ] Defaults chosen so existing saved games and past battles behave as before.
- [ ] New Firestore field? Update `firestore.rules` validators and the adapter's key lists, and add a
      case to `emulator-tests/rules.spec.mjs`.
- [ ] New button? `data-act="name"` in the sheet's HTML string plus `A.name` in `js/ui/actions.js`.
- [ ] New sheet? Add its type to the map in `renderSheet()` (`js/ui/render.js`).
- [ ] New run-time asset? Add it to `STATIC` in `vite.config.js`.
- [ ] `npm test` green. If hashes changed, you can explain every one; commit them with the cause.
- [ ] Anything the host must do by hand (console setting, secret) is written into `OPERATIONS.md`.

## Releasing and rolling back

Merging is releasing. Rollback steps for hosting versus rules/functions are in `OPERATIONS.md`
("Rolling back a bad deploy"). Phones pick up a new version on their next start, not immediately.
