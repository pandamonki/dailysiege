# Test strategy

What exists, what each layer is for, what is not covered, and what to add next.

## The layers today

| Layer | Command | Files | Speed | Needs | Protects |
|---|---|---|---|---|---|
| Unit: sim harness | `npm test` | `test/sim.test.mjs` (11) | fast | Node | Sim loads headlessly, is repeatable, and its source contains no DOM / clock / engine-dependent maths (regex scan) |
| Unit: golden battles | `npm test` | `test/golden.test.mjs` (6), `test/golden/hashes.json` | ~25 s | Node | 62 fixed battles produce the recorded outcome and replay hashes |
| Unit: world | `npm test` | `test/world.test.mjs` (4) | <1 s | Node | Saved data -> battle inputs: carry-forward, stand-in orders, roster limits |
| Unit: server clock | `npm test` | `test/clock.test.mjs` (9) | <1 s | Node | Day 1 date, DST, monotonic `planDay`, region constant matches |
| Security rules | `npm run test:rules` | `emulator-tests/rules.spec.mjs` (37) | ~10 s + emulator start | Java | Who can read/write every collection, before and after the lock |
| Cross-engine | `node tools/selftest-browsers.mjs chromium firefox webkit` | `selftest.html`, `js/dev/selftest.js` | ~15 s per engine | build, Playwright | Same 62 hashes in V8, SpiderMonkey, JavaScriptCore; game page loads with no script error or 4xx |
| End to end | `npm run test:e2e` | `emulator-tests/e2e.spec.mjs` (17) | minutes | Java, Playwright, functions deps | Three browser accounts: sign-in, invite, seal, secrecy, server battle, seat hand-over, removal, PWA offline start |
| Full war | `npm run test:war` | `emulator-tests/war.spec.mjs` | minutes | same | Server fights a seven-day, ten-seat war (twelve sign-ups); a browser replays every battle to the same hash |
| Balance (not a test) | `npm run balance` | `tools/balance.mjs` | seconds | Node | Prints win rates by hero and seat; human-judged |

Verified in this review: `npm test` (30 pass), `npm run test:rules` (37 pass), the Chromium
self-test (62 of 62). `test:e2e` and `test:war` could not start in a sandboxed session (the
functions emulator needs outbound network); CI is the source of truth for them.

`node --test` only picks up `test/*.test.mjs`. Emulator tests are named `*.spec.mjs` so they stay
out of `npm test` and only run inside `firebase emulators:exec`.

## Principles the suite already follows

- **Test the real files, not copies.** `tools/load-sim.mjs` runs the shipped scripts in a `vm`
  context; the server uses the same loader.
- **Strict mode proves purity.** `loadSim({ strict: true })` makes `Math.random` and `Date` throw, so
  a golden pass proves the sim touched neither.
- **Hash the outcome and the replay separately** (`battleHash`, `replayHash` in `js/sim/hash.js`):
  the first guards scores, the second guards what players watch.
- **Inject time and I/O on the server** (`now`, `db`, `send` arguments) so logic is testable without
  Firebase.
- **Test names are behaviour sentences**, readable by the non-programmer host in CI output.

## Which tests to run for which change

| You changed | Minimum | Before pushing |
|---|---|---|
| `js/config/`, `js/sim/`, `js/core/layout.js`, `js/core/player.js` | `npm test` | + browser self-test; `golden:update` if the change is intended |
| `js/net/world.js`, `js/net/clock.js`, `functions/lib/clock.js` | `node --test test/world.test.mjs test/clock.test.mjs` | `npm test`, `test:war` |
| `firestore.rules`, or fields written by `js/net/backend-firebase.js` | `npm run test:rules` | `test:e2e` |
| `functions/` | `npm run lint`, `npm test` | `test:e2e`, `test:war` |
| `js/ui/`, `js/render/`, `js/replay/`, `css/` | `npm run build`, open `npm run dev` | browser self-test (catches script errors on load) |
| `index.html`, `vite.config.js`, `sw.src.js`, `manifest.webmanifest` | `npm run build` | `test:e2e` (has the installability/offline check) |

## Gaps (highest value first)

1. **No tests for UI, rendering or replay code** (`js/ui/`, `js/render/`, `js/replay/`: roughly half
   the codebase). The only guard is "the title screen opens without a script error".
2. **`functions/lib/notify.js` has no unit test** although it was written to be testable
   (`battleMessages` is pure; `remindUnsealed` takes `send`).
3. **`resolveDue` concurrency and catch-up** (two callers at once, several missed days) are only
   exercised indirectly by the war test.
4. **Economy and session logic** (`payDays`, `rollover`, `stateGuard` in `js/net/session.js`) is
   untested; `stateGuard` exists because a save once wiped an army.
5. **No test that `selftest.html`'s script list matches `SIM_FILES`**, or that the rules'
   `serverFields()` matches the adapter's `SERVER_KEYS`.
6. **No historical-replay test:** nothing replays a battle recorded under an older ruleset to prove
   date gates like `ULT_V2_FROM` still reproduce it.
7. **Deploy workflow runs a subset** (lint, unit, rules). See `docs/ARCHITECTURE.md` weak spot 2.

## Recommended next steps

1. **Cheap unit tests first** (all runnable with plain `node --test`, no emulator):
   - `test/notify.test.mjs`: `battleMessages` ordinals, alliance-invite line, final-day wording.
   - `test/lists.test.mjs`: `selftest.html` order vs `SIM_FILES`; `serverFields()` parsed from
     `firestore.rules` vs `SERVER_KEYS` and `CLOCK_KEYS`.
2. **A frozen-battle fixture.** Save one real `battles/{day}` document per ruleset version under
   `test/fixtures/` and assert that replaying its inputs yields its `resultHash`. This is the direct
   test for "old battles still replay".
3. **A UI smoke walk.** Extend `tools/selftest-browsers.mjs` (already has a loaded game page) to
   click each `data-act` command-bar button in practice mode and fail on any `pageerror`. One loop
   covers every sheet function in `renderSheet()` for load-time and typo errors.
4. **Resolver tests against the Firestore emulator only** (no browser): two simultaneous
   `resolveDue` calls create one battle; a three-day backlog advances three days and notifies once.
   These belong in a new `emulator-tests/resolve.spec.mjs` run like `test:rules`.
5. **Declare Playwright** as a devDependency (or document the global install) so the browser layers
   run the same locally as in CI.
6. **Make CI the deploy gate** so every layer above actually blocks a release.

Not recommended: snapshot tests of sheet HTML (the strings change with every copy edit), or
coverage targets (the dense one-line style makes line coverage meaningless here).
