# Daily Siege

A daily, asynchronous siege game for one group of friends (up to 12 "lords"). Each day every lord
secretly sets orders for their hero and army; at a fixed hour the server fights one deterministic
battle and every phone replays it. It is a plain HTML/CSS/JS canvas game (no framework, no bundling
of game scripts) hosted on Firebase (Hosting, Auth, Firestore, Functions, Cloud Messaging) as an
installable PWA. It started life as a Claude artifact ("Last Banner"); that version is retired, so
its compatibility layer is now debt to remove, not behaviour to preserve.

Deeper docs: `docs/GAME_DESIGN.md` (**source of truth for how the game should play**; check a
gameplay change against its pillars), `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`,
`docs/TESTING.md`, `OPERATIONS.md` (host's runbook), `daily-siege-hosting-plan.md` (historical).

## Commands

All verified on Node 22 from a clean clone unless noted. Node >= 20 required; CI runs 20 and 22.

| Command | What it does | Notes |
|---|---|---|
| `npm ci` | Install. `postinstall` copies the Firebase browser SDK into `js/vendor/` | `js/vendor/` is gitignored; the game 404s on it without an install |
| `npm run dev` | Vite dev server on `http://localhost:5173`, full reload on change | Practice (bots) mode only; the friends game needs the emulators |
| `npm test` | `node --test`: 30 unit tests in `test/` (~30 s, golden battles dominate) | |
| `npm run lint` | ESLint on tooling, tests, `functions/`, `sw.src.js` | `js/**` is **not linted** (see `eslint.config.js`) |
| `npm run build` | Vite build to `dist/` plus generated `dist/sw.js` | Prints "can't be bundled without type=module" for 3 scripts: expected |
| `npm run golden:update` | Re-record `test/golden/hashes.json` | Only when battles are *meant* to change |
| `npm run balance -- 5 8` | Random battles per lord count; prints win rates | Args: battles per size, lord counts |
| `node tools/selftest-browsers.mjs chromium` | Runs `selftest.html` + loads the game in a real browser | Needs `npm run build` first and Playwright (not a dependency) |
| `npm ci --prefix functions` | Install server deps | Needed before any emulator command that loads functions |
| `npm run test:rules` | 37 security-rules tests in the Firestore emulator | Needs Java |
| `npm run test:e2e`, `npm run test:war` | Browser + emulator end-to-end tests | Need Java, Playwright, functions deps. **Not verified locally**: the functions emulator needs outbound network and failed in a sandboxed session. CI runs them |
| `npm run emulators` | Build + all emulators; open `http://127.0.0.1:5000/?emulator=1` | Same requirements as above; not verified locally |

No env vars or secrets are needed for local work. Deploys need the
`FIREBASE_SERVICE_ACCOUNT_DAILY_SIEGE` GitHub secret (CI only). The Firebase web config is fetched at
run time from Hosting (`/__/firebase/init.json`); nothing is checked in.

## Directory map (non-obvious parts)

- `index.html` — markup plus 61 `<script>` tags. **The script order is the dependency graph.**
- `js/config/` — pure data (balance numbers, classes, items). `js/config/site.js` holds the public Web Push key.
- `js/core/`, `js/sim/` — deterministic core. `runBattle(plans, seed, opts)` in `js/sim/battle.js` is the whole battle.
- `js/net/world.js`, `js/net/clock.js` — saved game data -> battle inputs, and all date rules. **Run on the server too.**
- `js/net/backend-firebase.js` — fakes the legacy `window.claude.use("db"|"user")` storage API on top of Firebase.
- `js/net/session.js`, `lobby.js`, `battles.js` — friends-game client state (`LIVE`), saving, muster hall.
- `js/ui/`, `js/render/`, `js/replay/` — sheets (HTML strings), canvas drawing, battle playback.
- `js/dev/` — golden battle cases, phone self-test, in-game balance lab.
- `functions/` — Cloud Functions (CommonJS). `functions/lib/game.js` loads the game's own scripts into a `vm` context.
- `functions/game/`, `js/vendor/`, `dist/` — **generated, gitignored.** Never edit.
- `tools/` — Node helpers: `load-sim.mjs` (headless sim), `sync-functions.mjs`, `vendor.mjs`, golden tools.
- `test/` — fast unit tests. `emulator-tests/` — `*.spec.mjs`, deliberately not matched by `node --test`.
- `sw.src.js` — service-worker template; `vite.config.js` fills `__VERSION__` and `__FILES__` into `dist/sw.js`.

## Conventions (as found in the code)

- **Classic scripts, one global scope.** No imports in `js/`. Files only declare; everything that runs
  at startup is in `js/main.js`. Example: `js/core/state.js` declares `S` and `initState()`.
- **Global state, upper-case names:** `S` (my saved state), `LIVE` (friends game), `DAY`, `N`, `CASTLE`,
  `RIVALS`, plus `mode`, `sheet`, `sel`, `replay`. After changing state, call `render()`, which redraws
  everything and calls `save()` (`js/ui/render.js`).
- **UI is HTML strings + one action table.** A sheet is a function returning HTML, registered in the
  map inside `renderSheet()` (`js/ui/render.js`). Buttons carry `data-act="name"` (and `data-v`), handled
  by `A.name` in `js/ui/actions.js`. No per-element listeners.
- **World functions take `W` first** and are prefixed `w` (`wRoster`, `wWeekOf` in `js/net/world.js`),
  so the same code runs on phones (W = live game) and server (W = database read).
- **Dense style:** terse names, several statements per line, lines up to ~600 chars, a `//` comment
  explaining *why* above each block. Match it; don't reformat.
- **Comments and user text are plain English** aimed at a non-programmer host ("lords", "seal orders",
  "muster hall"). Dates are `YYYY-MM-DD` strings compared lexically (`dayKey`, `planDay`, `week`).
- **Error handling:** browser-capability calls are wrapped in `try { } catch (e) {}` (localStorage,
  clipboard, audio); network failures surface as `toast("...")`; Firebase error codes are translated to
  underscore form by `legacyErr` (`js/net/backend-firebase.js`). Functions throw `HttpsError` with a
  human sentence (`functions/index.js`).
- **Server code takes its dependencies as arguments** (`db`, `send`, `now`) so it can be tested without
  Firebase: see `resolveDue` in `functions/lib/resolve.js`, `remindUnsealed` in `functions/lib/notify.js`.
- **Styling:** hand-written CSS in `css/`, loaded in cascade order. No preprocessor, no CSS-in-JS.
- **Tests:** `node:test` + `node:assert/strict`, test names are full sentences describing behaviour
  (`test/clock.test.mjs`). Game code is loaded through `loadSim()` and reached with `sim.get("name")` /
  `sim.run("code")`.

## Gotchas

- **Determinism is load-bearing.** Anything a battle or map layout reads must use `dsin`, `dcos`,
  `datan2`, `dhypot`/`hyp` (`js/core/detmath.js`) and the seeded `mulberry(seed)`/`hash()`, never `Math.sin/cos/atan2/hypot/pow/exp/log`, `**`,
  `Intl`, `localeCompare`, `Math.random`, `Date`. `test/sim.test.mjs` greps the source for these.
- **Any change to `js/sim/`, `js/config/`, `js/core/layout.js`, `js/core/player.js` or `js/net/world.js`
  can change battle hashes.** `npm test` then fails. If intended, `npm run golden:update` and commit
  `test/golden/hashes.json` in the same commit.
- **Old battles are replayed from saved inputs with today's code.** An ungated sim change makes past
  replays disagree with saved results. Policy: outcome changes apply **from the next battle**, behind
  a date gate like `ULT_V2_FROM` in `js/sim/battle.js`. Ask the owner before holding a large feature
  for the next war instead.
- **Script order lives in three places:** `index.html`, `selftest.html`, and `SIM_FILES`/`WORLD_FILES`
  in `functions/lib/game.js`. A new sim file must be added to all three (a unit test checks
  `index.html` against `SIM_FILES` only).
- **`js/net/world.js` and `js/net/clock.js` run in Node without a DOM.** They may *define* functions
  that mention `LIVE` or `gameMode`, but must not touch them at load time or from server-called code.
- **Server-owned fields are listed three times:** `serverFields()` in `firestore.rules`, `SERVER_KEYS`
  in `js/net/backend-firebase.js`, `CLOCK_KEYS` in `functions/index.js`. Same for the function region
  (`functions/region.js` vs `FUNCTIONS_REGION` in the backend; a unit test checks this one).
- **Adding a field to a player's public profile** requires adding it to `validProfile()` in
  `firestore.rules`, or every profile write is rejected.
- **`index.html` line 1 closes `<head>` early** (leftover artifact boilerplate). Tags that must be in
  the head (manifest, icons) go in the block right after `<title>`, before `</head>` on line 11.
- **The manifest link is `vite-ignore`d and uses absolute icon paths** so Vite doesn't rename it
  (commit `7f6099f`). New run-time assets must be added to `STATIC` in `vite.config.js` or they won't ship.
- **Merging to `main` deploys to production** (hosting, rules, functions) after lint, unit and rules
  tests only. E2E and browser tests run in a separate workflow and do not gate the deploy.
- **PR preview URLs** (`*--*.web.app`) have the friends game switched off on purpose (`findConfig()`).
- **Emulator mode** only activates on `localhost`/`127.0.0.1` with `?emulator=1` (sticky via localStorage `ds.emulator`).
- Storage keys still use the old name (`lastbanner.v4`, `lastbanner.mode`). Renaming needs a migration.
- `selftest.html` still says "50 fixed battles"; the real count is 62 (`GOLDEN_COUNT`).

## Don't

- **Don't convert files to ES modules piecemeal or add `import`/`export` under `js/`.** The `vm` loader,
  `selftest.html` and the build all assume classic scripts.
- **Don't run `golden:update` to make a red test green** unless the outcome change is the point of
  the commit. It is the only guard against phones and server disagreeing.
- **Don't put secrets, orders, gold or army into `games/{g}/players/{uid}`.** That document is readable
  by every member; private data goes in `private/state` and `orders/{day}`.
- **Don't write clock fields (`planDay`, `nextLockAt`, ...) from the client.** Rules reject it; only
  `keepGameClock` and `resolveDue` own them.
- **Don't edit `functions/game/`, `js/vendor/`, `dist/` or `test/golden/hashes.json` by hand.**
- **Don't reformat or lint-fix `js/**`.** It produces unreviewable diffs in 500-character lines.
- **Don't add an npm runtime dependency to the game.** The browser loads only files copied by
  `tools/vendor.mjs` or listed in `STATIC`; there is no bundler for scripts.

## How to work here (AI sessions)

**Start.** This file is enough for most tasks; don't re-explore the repo. Open another doc only when
the task touches it: gameplay -> `docs/GAME_DESIGN.md`; crossing client/rules/server ->
`docs/ARCHITECTURE.md`; adding tests -> `docs/TESTING.md`. Run `npm ci` once (tests and the game need
it); `npm ci --prefix functions` only for emulator work.

**Classify the change first; it decides the checks and the risk.**

| Change | Iterate with | Before pushing | Watch for |
|---|---|---|---|
| UI, CSS, replay drawing | `npm run build`, `npm run dev` | `node tools/selftest-browsers.mjs chromium` | Typos only show when the sheet is opened: open it |
| `js/net/world.js`, `clock.js`, `functions/lib/` | `node --test test/world.test.mjs test/clock.test.mjs` (<2 s) | `npm test`, `npm run lint` | Runs on the server: no DOM, no `LIVE` |
| `js/sim/`, `js/config/`, layout | `npm test` (~30 s) | + browser self-test | Outcome change -> date gate + `golden:update` |
| `firestore.rules`, stored fields | `npm run test:rules` | same | The three duplicated key lists (Gotchas) |

**Read cheaply.** Never `cat` game files: lines run to 600 chars; `js/sim/battle.js` is 76 KB,
`js/net/lobby.js` and `backend-firebase.js` ~34 KB each. Grep for the function
(`grep -n "^function \|^const [a-zA-Z]* = " file`), then read a line range or pipe through
`cut -c1-300`. Read a file's header comment before its body. Find UI by action name: grep
`data-act="x"`, then `x:` in `js/ui/actions.js`; sheets via the map in `renderSheet()`. Skip
`js/vendor/`, `functions/game/`, `dist/`, `package-lock.json`, image folders, `index.html` line 1 and
`daily-siege-hosting-plan.md`. The repo is small: search it yourself rather than spawning subagents.

**Decide or ask.** Proceed without asking on implementation choices. Ask the owner only when the
choice is theirs: a change that conflicts with a design pillar, next battle versus next war for a
large feature, anything that costs money, or a step they must do by hand (Firebase console, GitHub
settings). Ask once, with a recommendation, and keep working on what doesn't depend on the answer.

**Finish.** Run the "before pushing" checks once, at the end, not after every edit. A sim or rules
change is not done until a test sentence describes the new behaviour. `test:e2e` and `test:war`
cannot run in a sandboxed session: say so and rely on CI, don't claim them. Work on a branch, never
`main` (it deploys); open a pull request only when asked. If you changed a command, a gotcha or a
design principle, update the matching doc in the same commit; edit this file by replacing lines, and
keep it under 150.

**Report for the owner, who hosts the game and is not a programmer.** Lead with what changes for
players, then what was tested and what was not, then anything they must do by hand. Plain English,
no unexplained jargon, same voice as `OPERATIONS.md`. Commit messages follow `docs/CONTRIBUTING.md`.
