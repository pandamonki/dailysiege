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
- CI (`.github/workflows/ci.yml`) runs lint, the tests and the build on every pull request.
- The hosting plan and its phases are in `daily-siege-hosting-plan.md`.

| Folder | What lives there |
|---|---|
| `css/` | Styles in cascade order: base, layout, sheets, components, screens, council |
| `js/config/` | Pure game data: classes, units, items, spells, order options, balance numbers. **Balance tweaks go here.** |
| `js/core/` | Utilities (seeded hash/RNG), map layout, practice lobby, saved state, hero levels and pieces |
| `js/render/` | Canvas drawing: sprites, banners, walls, item and spell icons, map, camera, frame loop |
| `js/sim/` | Battle simulation: `runBattle(plans, seed)` is deterministic, plus bots, alliances, plan building, result hashing |
| `js/replay/` | Watching a battle: muster/hero pick, replay drawing, inspector, controls, highlights, video export |
| `js/net/` | Friends game over the artifact database: players, clock, roster, daily battles, session, lobby, test sandbox |
| `js/ui/` | HUD, sheets (castle, info, army, council, results), `render()`, button actions, map input |
| `js/audio/` | Music player, and the tracks as embedded data (`tracks.js`) |
| `js/dev/` | Balance lab (simulates many battles), golden battles for the determinism tests |
| `icons/`, `items/`, `title.jpg` | Images |

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
