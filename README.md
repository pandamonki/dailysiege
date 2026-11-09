# Daily Siege: code layout

Plain HTML, CSS and JavaScript with no build step. `index.html` holds only the markup and loads
the stylesheets and scripts in order.

| Folder | What lives there |
|---|---|
| `css/` | Styles in cascade order: base, layout, sheets, components, screens, council |
| `js/config/` | Pure game data: classes, units, items, order options, balance numbers. **Balance tweaks go here.** |
| `js/core/` | Utilities (seeded hash/RNG), map layout, practice lobby, saved state, hero levels and pieces |
| `js/render/` | Canvas drawing: sprites, banners, walls, item and spell icons, map, camera, frame loop |
| `js/sim/` | Battle simulation: `runBattle(plans, seed)` is deterministic, plus bots, alliances, plan building |
| `js/replay/` | Watching a battle: muster/hero pick, replay drawing, inspector, controls, highlights, video export |
| `js/net/` | Friends game over the artifact database: players, clock, roster, daily battles, session, lobby, test sandbox |
| `js/ui/` | HUD, sheets (castle, info, army, council, results), `render()`, button actions, map input |
| `js/audio/` | Music player, and the tracks as embedded data (`tracks.js`) |
| `js/dev/` | Balance lab (simulates many battles) |
| `icons/`, `items/`, `title.jpg` | Images |

## Rules for the scripts

- They're classic scripts sharing one global scope, so **load order in `index.html` matters**.
  A file may use anything from earlier files at load time, and anything at all inside functions.
- Files only declare things. Everything that runs at startup is in `js/main.js`
  (`setupPractice()`, `initState()`, sizing the map, the first `render()`, `connectLive()`).
- `js/sim/` must never touch the DOM, so battles stay reproducible from a seed.

## Next steps

1. Convert to ES modules (`<script type="module">` with explicit imports), starting with `config/` and `sim/`,
   which have no DOM dependencies. Shared mutable state (`S`, `DAY`, `mode`, `replay`, `LIVE`) needs one owner
   module with setters first, because imported bindings are read-only.
2. Break `sim/battle.js` (one ~750-line function) into targeting, combat, abilities and militia.
3. Add the planning and battle music tracks to `js/audio/tracks.js` and to `pick()` in `js/audio/music.js`.
