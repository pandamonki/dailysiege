# Daily Siege: code layout

Plain HTML, CSS and JavaScript. `index.html` holds only the markup and loads the stylesheets and
scripts in order. The game itself still needs no build step; npm is only used for the dev server,
the tests and the hosting build.

## Working on it

```bash
npm install        # once
npm run dev        # serve the game at http://localhost:5173 (reloads when a file changes)
npm test           # headless battle sim + golden determinism tests
npm run lint       # lints tooling and tests only (the game's classic scripts are exempt for now)
npm run build      # copy the game into dist/ ready for hosting
```

- `tools/load-sim.mjs` runs the battle sim in Node by loading the same script files, in the same
  order as `index.html`, into one shared scope. The server-side battle resolver will reuse it.
- `test/golden/hashes.json` holds the result hashes of 50 fixed battles (`js/dev/goldenCases.js`).
  `npm test` fails if any battle plays out differently. If a change is *meant* to alter battles
  (a balance tweak, a sim fix), run `npm run golden:update` and commit the new hashes with it.
- `selftest.html` fights the same 50 battles in a browser and shows Pass/Fail plus a short code.
  Open it on any phone: the same code on two devices means they fight identical battles.
  `node tools/selftest-browsers.mjs chromium firefox webkit` runs it in real browser engines (CI does this).
- **Deterministic maths:** anything a battle or the map layout depends on must use `dsin`, `dcos`,
  `datan2`, `dhypot`/`hyp` from `js/core/detmath.js`, never `Math.sin/cos/atan2/hypot/pow/exp/log` or `**`.
  Those differ in the last digit between browsers, which is enough to change a fight. Drawing code may use `Math.*`.
- **The hosted (Firebase) game.** `js/net/backend-firebase.js` gives the game the storage API it
  already used, on top of Firebase Auth and Firestore, and only switches on outside Claude. Data is
  split so orders stay secret: public profile, private state, and one orders document per day
  (see the top of that file and `firestore.rules`). `functions/` holds the server code.
  - `npm run emulators` builds the game and runs everything locally (needs Java). Open
    `http://127.0.0.1:5000/?emulator=1`. Nothing touches the real project.
  - `npm run test:rules` tests the security rules; `npm run test:e2e` drives three accounts through
    registering and sealing orders in real browsers. Both run in the emulators.
  - `npm run test:war` has the server fight a full seven-day war and a browser replay every battle to the same hash.
  - **Battles are fought by the server** (`functions/lib/resolve.js`), within five minutes of the lock.
    `js/net/world.js` turns a game's saved data into a battle and is the one implementation used by
    both the server and the phones; keep it free of the DOM and of page state.
  - The server reuses the game's own files: `npm run functions:sync` copies them into `functions/game/`.
- **Seats.** A war holds up to `MAX_LORDS` (12) lords; new hosted wars default to `DEFAULT_LORDS` (10) and the host
  can change it in the Muster Hall. Colours and the limits are in `js/config/seats.js`, map sizes in `mapSizeFor`
  (`js/core/layout.js`). `npm run balance` fights many random battles at 8, 10 and 12 lords and prints battle length,
  hero win rates and wins by seat.
- **Installable app.** `manifest.webmanifest`, the icons in `app/`, and a service worker make the game installable
  and let it start with no connection. The worker is `sw.src.js`; the build writes `dist/sw.js` from it with the list
  of files and a version made from their contents, so phones fetch a new version exactly when something changed.
  It only caches this site's own files, never game data. `js/pwa.js` registers it and offers the Install button.
- **Notifications.** The server sends "results are in" after each battle and "orders lock soon" an hour before the
  lock to lords who have not sealed (`functions/lib/notify.js`). Phones subscribe from the Friends Game screen. They
  are off until the project's public Web Push key is put in `js/config/site.js`.
- **Assets.** Images are lossless WebP. Music is a real file in `audio/`, listed in `js/audio/tracks.js` and fetched
  the first time it plays.
- CI (`.github/workflows/ci.yml`) runs lint, the tests and the build on every pull request.
- The hosting plan and its phases are in `daily-siege-hosting-plan.md`.

| Folder | What lives there |
|---|---|
| `css/` | Styles in cascade order: base, layout, sheets, components, screens, council |
| `js/config/` | Pure game data: classes, units, items, spells, order options, balance numbers. **Balance tweaks go here.** |
| `js/core/` | Utilities (seeded hash/RNG), deterministic maths, map layout, practice lobby, saved state, hero levels and pieces |
| `js/render/` | Canvas drawing: sprites, banners, walls, item and spell icons, map, camera, frame loop |
| `js/sim/` | Battle simulation: `runBattle(plans, seed)` is deterministic, plus bots, alliances, plan building, result hashing |
| `js/replay/` | Watching a battle: muster/hero pick, replay drawing, inspector, controls, highlights, video export |
| `js/net/` | Friends game: players, clock, roster, daily battles, session, lobby, test sandbox, and the Firebase backend |
| `js/ui/` | HUD, sheets (castle, info, army, council, results), `render()`, button actions, map input |
| `js/audio/` | Music player and the list of tracks (`tracks.js`); the audio files are in `audio/` |
| `js/dev/` | Balance lab (simulates many battles), golden battles for the determinism tests |
| `icons/`, `items/`, `title.jpg`, `app/` | Images (WebP), and the app icons |

## Rules for the scripts

- They're classic scripts sharing one global scope, so **load order in `index.html` matters**.
  A file may use anything from earlier files at load time, and anything at all inside functions.
- Files only declare things. Everything that runs at startup is in `js/main.js`
  (`setupPractice()`, `initState()`, sizing the map, the first `render()`, `connectLive()`).
- `js/sim/` must never touch the DOM, the clock or `Math.random`, and may only read data from `js/config/`
  and `js/core/`, so battles stay reproducible from a seed and can run on a server. `npm test` enforces this.

## Next steps

1. Convert to ES modules (`<script type="module">` with explicit imports), starting with `config/` and `sim/`,
   which have no DOM dependencies. Shared mutable state (`S`, `DAY`, `mode`, `replay`, `LIVE`) needs one owner
   module with setters first, because imported bindings are read-only.
2. Break `sim/battle.js` (one ~750-line function) into targeting, combat, abilities and militia.
3. Add the planning and battle music tracks to `js/audio/tracks.js` and to `pick()` in `js/audio/music.js`.
