# Daily Siege — Hosting & Platform Plan (handoff for Fable)

*Prepared 10 Nov 2026 from the `Daily_Siege_2.zip` build. Owner: Josh. Implementer: Claude Fable 5.2 in Claude Code.*

## 1. Goal and recommendation in one paragraph

Get Daily Siege playable by ~10 friends **without Claude accounts**, on infrastructure Josh controls, with minimal ongoing maintenance — while landing on the architecture that *is* the end goal. **Do not rewrite the game and do not go native yet.** Port the existing vanilla-JS game to **Firebase (Auth + Firestore + Cloud Functions + Hosting)** behind a thin adapter that mimics the current `window.claude.use("db" | "user" | "downloads")` API, move battle resolution and secret orders to the server, and ship it as an **installable PWA** (mobile web app with home-screen icon and push notifications). A native app later is a Capacitor wrapper around the same code, not a rebuild.

Why this is both "next step" and "end goal": an installable PWA with push notifications on a real backend *is* the mobile web app. Going native first would add app-store review, signing and two build pipelines for no gameplay gain at 10 players.

## 2. What the current build looks like (findings from the code)

- ~5k lines of plain HTML/CSS/JS, **no build step**, classic scripts sharing one global scope (`index.html` load order matters). `js/audio/tracks.js` is 353 KB of embedded audio; `icons/` + `items/` ≈ 1.2 MB of PNGs.
- **Backend surface is tiny and Firestore-shaped.** All networking goes through `js/net/lobby.js → connectLive()`:
  - `window.claude.use("db")` → `db.doc(path).get/set/update/onSnapshot`, `db.collection(name).onSnapshot` (snapshots expose `.exists`, `.data()`, `.docs[].id`). This is essentially the Firestore namespaced API.
  - `window.claude.use("user")` → `id()`, `isOwner()`, `profiles(ids)`.
  - `window.claude.use("downloads")` → used only by highlight-video export (`js/replay/record.js`).
  - `js/net/sandbox.js` already fakes this API for the Test mode — proof the adapter approach works.
- **Data model today:** `game/config` (single game), `players/{uid}` (each player's whole `state` incl. gold/army **and** `plans[dayKey]` for the week), `battles/{dayKey}` (results + `inputs` = every plan fought).
- **Battles are client-resolved, first-writer-wins** (`js/net/battles.js → resolveBattles()`): whichever phone opens first after lock runs `runBattle(plans, seed)` and writes the result; replays re-simulate locally from `battles/{day}.inputs`.
- **Hard cap of 8 players**: 8 `SEAT_COLORS` (`js/net/players.js`), `capFor()` uses `Math.min(8, …)` (`js/net/roster.js`), `colourPool()` slices to 8.

## 3. Concerns that shape the design (read these first)

1. **Secret orders are not secret.** Every player's sealed orders for *today* sit in `players/{uid}.plans`, which every client subscribes to. Anyone who opens dev tools sees rivals' targets, alliances and **betrayal triggers** before the battle. "Fog of war" is only enforced in the UI. Since secret betrayals are the heart of the game, this must be fixed on the new platform — and fixing it *requires* server-side battle resolution (clients can no longer read the orders needed to simulate).
2. **Cross-device determinism.** Results come from one device's sim, but replays are re-simulated on every phone. `Math.sin/cos/atan2/hypot` are not guaranteed bit-identical across JS engines (iOS Safari/JavaScriptCore vs Chrome/V8). They're used in `js/sim/battle.js` (formation angles, ~L666) and `js/core/layout.js` (`seatLayout`, `zoneFor`). A one-ulp difference can cascade, so an iPhone replay could show a different fight from the stored result. Fix with a deterministic math module + a result hash check.
3. **Client-authoritative economy.** Gold, army and items (`S`) are computed and written by each client. A determined friend could edit their own doc. Security rules will stop people editing *other* players' data; full anti-cheat (server recomputes gold) is **out of scope for now** — acceptable among friends, revisit if needed.
4. **8-player cap** blocks the 10-friend target (colours, map size, roster cap, UI rows, replay performance on phones).
5. **Mid-war migration risk.** A live war started ~8 Nov on the Claude artifact. Don't migrate mid-war: finish it there, launch the next war on the new platform.

## 4. Target architecture

| Layer | Choice | Why |
|---|---|---|
| Hosting | Firebase Hosting (HTTPS, CDN, preview channels, custom domain optional) | Same console as everything else; free at this scale |
| Auth | Firebase Auth: Google sign-in + passwordless email link | No passwords; stays signed in on the phone |
| Data | Cloud Firestore | Matches the existing API almost 1:1; realtime listeners |
| Server logic | Cloud Functions (2nd gen), Node 20+ | Scheduled battle resolution, lock enforcement, push |
| Push | Firebase Cloud Messaging (web push) | "Orders lock in 1h", "Battle results are in" (iOS needs the PWA installed to home screen) |
| CI/CD | GitHub repo + Firebase Hosting GitHub Action | Push to `main` → live; PR → preview URL |
| Native (later) | Capacitor wrapping the same web build | No rewrite |

**Cost:** the Blaze (pay-as-you-go) plan is required for Cloud Functions, but 10 players sit far inside the free quotas, so expect ≈ AUD 0–1/month. Set a budget alert at AUD 5. Cost safeguards Fable must implement:
- Use at most 3 scheduled functions (Cloud Scheduler's free allowance).
- Add an Artifact Registry cleanup policy so old function images don't pile up past the 500 MB free storage, and make sure container vulnerability scanning is **off** (a known source of surprise charges).
- Debounce autosaves and keep listeners narrow (no listener on private docs of others; don't rewrite the public player doc on every tap) so Firestore stays well under 50K reads / 20K writes a day.
- Service worker caches the app shell and assets so hosting transfer stays far below the free daily allowance.
- Set Cloud Functions max instances low (e.g. 2) so a runaway bug can't scale up costs.

### 4.1 Firestore data model (multi-game, private orders)

```
games/{gameId}                      public: tz, lockHour, host, lobby state, startDate, maxPlayers,
                                    planDay, nextLockAt (Timestamp, maintained by server), inviteCode
games/{gameId}/players/{uid}        public profile: nick, real, banner, colour, cls, joinedAt, left,
                                    pending, sealedFor (dayKey|null — "has sealed" flag only, no content)
games/{gameId}/players/{uid}/private/state      S (gold, army, items, traps, …) — owner read/write only
games/{gameId}/players/{uid}/orders/{dayKey}    sealed/draft plan — owner read/write until lock; server reads
games/{gameId}/battles/{dayKey}     server-written only; everyone reads (results, inputs, resultHash)
users/{uid}                         fcm tokens, display prefs
```

- `inputs` in a battle doc reveal the orders fought — fine, that's after the battle (matches the current "only yesterday's orders are known" rule).
- **Carry-forward rule must be preserved:** `latestPlan()` (`js/net/roster.js`) uses the latest *sealed* plan in the week if none is sealed today. Server replicates this.
- Check doc sizes (Firestore 1 MiB/doc): a 10-player `battles/{day}` with full `inputs` should be well under, but measure it.

### 4.2 Security rules (outline)

- `games/{g}`: read if signed in and a member (or holds the invite code at join time); write host-only, except server-owned fields (`planDay`, `nextLockAt`) which are function-only.
- `players/{uid}` public doc: anyone in the game reads; only `request.auth.uid == uid` writes, and can't change `nick`/`real` after registration (names are fixed per war).
- `private/state`: owner only.
- `orders/{dayKey}`: owner only; writes allowed only when `dayKey == game.planDay && request.time < game.nextLockAt`.
- `battles/*`: read for members; **no client writes**.
- Write rules tests with the Firebase Emulator Suite (`@firebase/rules-unit-testing`).

### 4.3 Server-side battle resolution

- Scheduled function every 5 minutes: for each game where `now >= nextLockAt` and `battles/{planDay}` doesn't exist → in a transaction, claim the day, build inputs, run the sim, write the battle doc, advance `planDay`/`nextLockAt`, send push.
- **Reuse the game's own code, don't port it.** The sim is DOM-free by design (README rule). Load `js/config/*`, the needed `js/core/*`, `js/sim/*` and a refactored pure builder into a Node `vm` context (concatenate in the same order as `index.html`). No ES-module conversion needed for this.
- Extract `liveBattlePlans()` (`js/net/battles.js`) into a pure function `buildBattleInputs(snapshot, dayKey)` that takes `{config, players, orders, battles}` instead of reading the `LIVE` global, so the server and client share one implementation (rapier holder, standings/rank, alliances `resolveAlliances`, mercs `resolveMercs`, feuds, carry-forward plans, auto-plan for no-shows).
- Remove client battle writes in `resolveBattles()`; clients just wait for `battles/{day}` and show "The battle is being fought…" if it's late. Keep a host-only "Resolve now" button that calls an HTTPS function (for recovery).
- Store `resultHash` (hash of `results` + key telemetry). Clients hash their replay result and log/report a mismatch.

### 4.4 Determinism

- Add `js/core/detmath.js` with deterministic `sin`, `cos`, `atan2`, `hypot` (pure arithmetic: range reduction + fixed polynomial; `Math.sqrt` is IEEE-exact and safe). Replace every transcendental call reachable from `runBattle`, `seatLayout`, `zoneFor`, and anything else the sim reads. Grep for `Math.(sin|cos|tan|atan|atan2|exp|log|pow|hypot|cbrt)` across `js/sim`, `js/core`, `js/config`.
- `Math.random` must not be reachable from the sim (currently clean — keep it that way; add a test that stubs it to throw).
- **Golden tests:** record ~50 seeds × plan sets → result hashes. Run in Node in CI, and provide a `/selftest.html` page Josh opens on an iPhone and an Android phone to confirm the same hashes.

### 4.5 Auth and invites (answer to Jared's suggestion)

**Recommended:** one **permanent group invite link** per game (`https://<site>/join/<inviteCode>`), reused for every war, plus a **one-time sign-in** (Google, or "email me a link"). The phone then stays signed in indefinitely, especially once the PWA is installed. No per-player links, nothing to regenerate between cycles, and a lost or new phone is just "sign in again".

Jared's idea, assessed: its real win is zero sign-up. Its cost is the one Josh spotted: per-player, per-cycle links the host must generate and DM every time, links forwarded in a group chat become someone else's identity, and there's no recovery. If a friend refuses to sign in, offer the **optional** hybrid: the host can generate a *permanent* personal link for that one player (server mints a Firebase custom token from a secret in the URL) — never per cycle.

Host tools: approve/kick players, reassign a seat to a new account (lost-phone recovery), restart war, "Resolve now", edit lock hour between wars.

### 4.6 The adapter (minimal game-code change)

Create `js/net/backend-firebase.js` implementing the same surface the game already uses:

- `db.doc(path)` / `db.collection(name)` → Firestore, with every path transparently prefixed by `games/{gameId}/`. `game/config` maps to `games/{gameId}`.
- Route the current monolithic `players/{uid}` writes (`writeMine`, `myWrite`, `queueSave` in `js/net/session.js`) into the split docs: public profile, `private/state`, `orders/{planDay}`.
- `user.id()` → `auth.currentUser.uid`; `user.isOwner()` → `uid === game.host`; `user.profiles(ids)` → from public player docs.
- `downloads` → plain blob download / Web Share API.
- Install it as `window.claude` **only when not running inside Claude**, so one codebase can still run as the artifact if wanted.
- Then audit every read of another player's `plans`/`state` (≈26 sites across `js/net/{battles,lobby,players,roster,session}.js`, `js/ui/sheets/{castle,council,info}.js`) and repoint them: rivals' past orders come from `battles/{day}.inputs`; banners/colours/class from public player docs; own state from `private/state`.

## 5. Phased implementation plan (do in order; commit + tag after each)

**Phase 0 — Repo and safety net**
- Create GitHub repo from the zip; add `package.json`, Vite (as a dev server/bundler only — keep classic scripts in `public/` or concatenate; **no ES-module rewrite now**), ESLint off for legacy files.
- Node harness that loads the sim headlessly; golden determinism tests (§4.4); CI runs them.
- Done when: `npm test` passes, `npm run dev` serves the game unchanged.

**Phase 1 — Determinism fix**
- `detmath.js`, replace calls, regenerate goldens, add `/selftest.html`.
- Done when: Node, desktop Chrome and iOS Safari produce identical hashes.

**Phase 2 — Firebase foundation**
- Firebase project config, emulator suite, Auth (Google + email link), data model §4.1, rules §4.2 with tests, adapter §4.6, invite/join flow, host tools.
- Done when: 3 test accounts in the emulator can register, seal orders, and cannot read each other's private state or today's orders.

**Phase 3 — Server-authoritative battles**
- `buildBattleInputs` extraction, Cloud Function scheduler §4.3, remove client battle writes, `resultHash` check, late-battle UI, host "Resolve now".
- Done when: an emulator run of a full 7-day war with 10 bot/test players resolves every day on the server, replays match hashes on clients.

**Phase 4 — 10+ players**
- Raise cap to 10 (make it 12 if cheap): add distinct colours (check colour-blind contrast against the existing 8) + names, `mapSizeFor`/`seatLayout`/`zoneFor` for 9–12, muster screen, scoreboard, alliances page, mercenary popups, replay performance on a mid-range phone (target 30+ fps with 10 armies; add a "low effects" toggle if needed). Run the balance lab with 10.

**Phase 5 — PWA and notifications**
- `manifest.webmanifest`, icons, service worker (cache app shell + assets, network-first for data), "Add to Home Screen" prompt/instructions for iOS.
- Move `tracks.js` audio into real audio files; convert PNGs to WebP where it doesn't hurt pixel art (lossless); lazy-load music.
- FCM web push: lock-in reminder (only to unsealed players), battle-ready, alliance invitation received.

**Phase 6 — Ship**
- GitHub Action deploys to Firebase Hosting on `main`; PRs get preview channels. Separate `dev` and `prod` Firebase projects (or prod + emulator) so testing never touches the live war.
- Short `OPERATIONS.md` for Josh: how to start a war, recover a player, roll back a deploy, check costs.

**Later (not now):** Capacitor native shells; server-side economy validation; ES-module refactor and splitting `sim/battle.js` (per README next steps).

## 6. Tasks only Josh can do (Fable should list these, not attempt them)

1. Create a Firebase project (and a second `-dev` one), upgrade to Blaze, set a AUD 5 budget alert.
2. Enable Auth providers (Google, Email link); add the hosting domain to authorised domains.
3. Create the GitHub repo and add the Firebase service-account secret for the deploy action.
4. Optional: buy a domain and connect it in Firebase Hosting.
5. Run `/selftest.html` on an iPhone and an Android phone.
6. Pick the launch date: after the current artifact war ends.

## 7. Decisions to confirm (defaults in bold)

- Sign-in: **Google + email link**; personal permanent links only as an exception.
- Keep the Claude artifact version alive? **No — freeze it after the current war**, but keep the adapter switch so it still runs.
- Player cap: **10**, stretch 12.
- Anti-cheat on gold/army: **not now** (friends), revisit later.
- Multiple simultaneous games per host: **supported by the data model, single game in the UI for now.**

## 8. Guidance for Fable on effort

- Work in Claude Code against the GitHub repo so tests and the emulator can actually run; don't do this in chat.
- Spend the depth on Phases 1–3 (determinism, rules/data split, server resolver). Those are where subtle bugs would ruin a war. Phases 5–6 are mechanical and can be finished by a cheaper model if the session runs short.
- Preserve every gameplay rule in the project's design notes; this is a platform port, not a redesign. Any behaviour change must be listed in the PR description.
- Stop and report at the end of each phase with: what changed, test results, and anything Josh must do.
