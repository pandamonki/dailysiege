# Daily Siege: roadmap to a self-sufficient native app

*Prepared 14 Nov 2026 against v1.1. Goal: a native app that needs no server we run and has no hosting bill.*

## 1. The short version

The game is in a good position for this. Three things already in the code make it possible:

- **Battles are deterministic and checked by a hash.** Any phone can fight a battle and get exactly the
  same result as any other (`js/sim/`, `js/core/detmath.js`, the golden tests, `selftest.html`).
- **One shared battle builder.** `js/net/world.js` turns saved game data into a battle, with no page or
  server dependencies. The server uses it today; a phone can use it just as well.
- **All networking goes through one small seam.** The game only talks to a `db` and a `user` object
  (`connectLive()` in `js/net/lobby.js`). `js/net/sandbox.js` already swaps in a fake, in-memory version
  of it, and `js/net/backend-firebase.js` is the real one. A third, serverless backend slots in the same way.

So the screens, the sim, the art and the balance all stay as they are. The work is: wrap the game in a
native shell, then replace what the server does today.

**The one hard part is the friends game.** Solo play needs no server at all. But a war between friends
needs two things a server gives us today: a way to pass orders and results between phones, and a referee
that keeps sealed orders secret until the battle. Both can be done without a server we pay for, but the
design choices in section 3 need a decision before building past Phase 2.

## 2. What the server does today, and what replaces it

| Today (Firebase) | What it does | Serverless replacement |
|---|---|---|
| Hosting | Serves the game's files | Files are bundled inside the app |
| Service worker | Offline start, background updates | Not needed in the app; updates come as new app versions |
| Auth (Google, email link) | Says who each lord is | A key pair made on the phone on first run, plus a recovery code |
| Firestore | Stores the war, profiles, private state, orders, results | Stored on each phone; synced by messages between phones |
| Security rules | Keep orders and private state secret | Encryption: orders are sealed to the referee's key |
| `resolveDueBattles` (every 5 min) | Fights the battle after the lock | The referee phone fights it when next opened after the lock |
| `keepGameClock` | Keeps the lock time up to date | Worked out on the phone from the war's settings (`js/net/clock.js` already does this) |
| `setBots`, `reassignSeat`, `resolveNow` | Host tools | Run on the host's phone and sent out as signed host messages |
| Push notifications (`notify.js`) | "Orders lock soon", "Results are in" | Local notifications scheduled by the app (lock times are known in advance) |
| Deploy and Preview workflows | Ship each change | A build workflow that makes the Android and iPhone packages |

## 3. Decisions needed before the friends game is built

### 3.1 Who is the referee?

**Recommended: the host's phone.** Each lord's sealed orders (and their private state, as the server reads
today) are encrypted so only the host's app can open them, and the app only opens them after the lock.
The host's phone fights the battle and sends out the result, including the orders fought and the result
hash. Every other phone re-fights it and checks the hash, exactly as replays are checked now.

- Trust is the same as today: the site owner can already read everything in the Firebase console.
- Results appear when the host next opens the app after the lock. A named deputy can be given the same
  power so one flat battery does not hold up the war.

**Alternative: no referee (commit and reveal).** Each phone publishes a fingerprint of its orders before
the lock and the real orders after it. Nobody has to be trusted, but a battle waits for every lord to
open the app after the lock, and a lord who dislikes what they see can simply not reveal. It needs
time-outs and penalties, and is noticeably more work. Suggested only as a later hardening step.

### 3.2 How do messages travel between phones?

The backend will hide this behind a "transport", so more than one can be supported.

1. **Share codes through the group chat (always available).** Sealing produces a link or small file the
   lord sends to the host with the normal share sheet; the host shares a result file back. No outside
   service at all, so this can never be switched off or cost anything. It is clumsy as the only method:
   the host would open up to eleven messages a day.
2. **A free public relay (recommended for daily use).** Phones post small encrypted, signed messages to
   public relay servers that anyone may use without an account (the Nostr network is the leading candidate).
   Nothing is ours to run or pay for, and several relays are used at once so one disappearing does not
   matter. This must be proven with a short trial (Phase 5) before relying on it, since those relays are
   run by volunteers and make no promises.
3. **Fallback if relays prove unreliable:** a free-plan database used purely as a mailbox (Firestore on the
   no-cost plan, with no server functions). It is still someone else's server, but there is no bill and the
   app would not depend on it, because share codes always work.

### 3.3 iPhone distribution

This is the one place "no costs" cannot be fully met with a native app.

| Route | Cost | Notes |
|---|---|---|
| Android, install file shared directly | Free | Friends allow the install once. Updates are a new file. |
| Android, Play Store | About US$25 once | Normal store updates. Needs a short review and a privacy statement. |
| iPhone, TestFlight or App Store | About US$99 a year | The only practical way to put a native app on friends' iPhones. TestFlight builds expire after 90 days. |
| iPhone, home-screen web app | Free | The same serverless game served as plain files from a free static host (for example GitHub Pages). No server logic, no bill, works offline. |

Building for iPhone also needs a Mac, or macOS build minutes in GitHub Actions (these are charged at a
much higher rate than Linux minutes on private repositories).

**Recommended:** native Android first, and keep iPhone lords on the free home-screen web app running the
same serverless code, until it is worth paying Apple's yearly fee.

### 3.4 Solo play

A full seven-day war against bot lords, entirely on one phone, falls out of this work almost for free
(Phase 2) and gives the app something to do with no friends and no connection.

## 4. Phases

Each phase ends in something playable and is merged on its own. Sizes are rough: S is a session or two,
M is several, L is the bulk of the project.

### Phase 0: Groundwork (S)

- Agree the decisions in section 3.
- Finish the current war on Firebase first. Nothing is migrated mid-war.
- Add a "backend" switch at start-up so one codebase can run as the Firebase site, the serverless web app,
  or the native app. Today `backend-firebase.js` installs itself whenever the game is not inside Claude.
- **Done when:** the existing site behaves exactly as now, and a flag starts the game with no backend at all.

### Phase 1: Native shell (M)

- Add Capacitor, which wraps the existing `dist/` build in an Android and an iPhone project. No rewrite.
- Bundle everything: scripts, styles, images, music. Remove the service worker and the install button in
  the native build (`js/pwa.js`, `sw.src.js`).
- Native fit and finish: safe areas and notches, the Android back button closing sheets, splash screen and
  icons (from `app/`), keeping the screen awake during replays, audio pausing when the app is in the background.
- Replace the highlight-video download (`js/replay/record.js`) with save-and-share through the phone's share sheet.
- Move saved data from the browser's storage to app storage so the phone never clears it
  (`save()` and `initState()` in `js/core/state.js`).
- A build workflow that produces a signed Android install file on demand only, not on every merge, to
  protect Actions minutes.
- Run `selftest.html` inside the app on a real Android phone and an iPhone. The app's built-in browser
  engine must give the same code as today.
- **Done when:** practice mode plays fully offline from an installed app, and the self-test code matches.

### Phase 2: Solo war on the phone (M)

- A serverless backend, `js/net/backend-local.js`, offering the same `db` and `user` objects as the others,
  storing the war on the phone. The sandbox in `js/net/sandbox.js` is the starting point.
- The phone is its own referee: after the lock it calls the shared battle builder (`fightDay` in
  `js/net/world.js`), saves the result and moves to the next day. This is `functions/lib/resolve.js` with
  the database calls taken out. Days missed while the app was closed are caught up on opening, oldest first.
- Bot lords fill the other seats (`lordBotPlan` in `js/sim/bots.js`, and the logic in `functions/lib/bots.js`).
- Local notifications: "orders lock in an hour" if not sealed, and "the battle is ready" at the lock.
- A node test that plays a whole seven-day solo war through the local backend and matches the golden hashes.
- **Done when:** a seven-day war against bots runs on the daily clock on one phone in aeroplane mode.

### Phase 3: Identity and the war file (M)

- On first run the app makes a signing key and an encryption key, kept in the phone's secure storage.
  The lord's id is derived from the public key. No sign-in screen.
- A recovery code the lord can save, to restore the same identity on a new phone. The existing
  "Lost phone?" host tool stays as the fallback, now as a signed host message.
- Define the message formats, each signed and carrying the war id, the day, and the **rules version**:
  join request, host settings and roster, sealed orders, battle result, host actions (bots, remove a lord,
  move a seat, start the next war).
- Rules versioning: every phone in a war must fight with the same sim. The app refuses to fight or accept
  a result made under a different rules version and tells the lord to update. The existing "battles from
  this date" switches remain the way to bring in rule changes mid-war.
- Invites become a link or QR code holding the war id, the host's public keys and the war settings.
- **Done when:** two installs can exchange and verify every message type in a node test with an
  in-memory transport, and tampered or replayed messages are rejected.

### Phase 4: Friends war with share codes (L)

- The host-as-referee flow from section 3.1 on top of the local backend:
  - Sealing encrypts the orders and private state to the host and produces a share link or file.
  - The host's app collects them, refuses to open any before the lock, fights the battle after it, and
    produces a result file.
  - Other phones import the result, re-fight it and check the hash. A mismatch raises the same warning as now.
- The rules the server enforces today move into the referee: one orders message per lord per day, nothing
  accepted after the lock, carry-forward of the last sealed plan, auto-plans for no-shows, two lords
  needed for a battle.
- The Muster Hall and host tools work from host messages instead of server calls (`js/net/lobby.js`,
  `js/ui/sheets/`).
- Deputy referee option.
- Replace the emulator tests (`emulator-tests/`) with a node test that runs twelve virtual phones through
  a full war over the in-memory transport, including a late lord, a lost message and a lord removed mid-war.
- **Done when:** three real phones finish a seven-day war using only the group chat, with matching hashes.

### Phase 5: Automatic delivery (M)

- A one-week trial of the public relay transport: delivery rate, delay, and message size limits, measured
  across several relays from Android and iPhone.
- If it passes, add it as the default transport: orders are sent when sealed, results arrive on opening
  the app, and the roster updates by itself. Share codes remain as the fallback in the menu.
- If it fails, decide between share codes only and the free mailbox fallback in section 3.2.
- "Results are in" notifications: without a server nothing can wake a closed app, so the app notifies at
  the lock time and shows "waiting for the referee" until the result arrives.
- **Done when:** a war runs for a week with nobody touching a share code.

### Phase 6: Distribution (S to M)

- Android: signed release build, a download page or Play Store listing, and an in-app "new version
  available" notice driven by the rules version seen in other lords' messages.
- iPhone: whichever route was chosen in section 3.3. For the free route, publish the serverless web build
  to a free static host and keep the home-screen install instructions.
- Update `OPERATIONS.md` for the new world: starting a war, deputies, recovering a lord, what to do when a
  phone is on an old version.
- A release notes entry in `js/ui/sheets/news.js` and `js/ui/sheets/info.js`.

### Phase 7: Retire Firebase (S)

- After the last hosted war ends: export the war history if wanted, then remove the functions, rules,
  emulator tests, Firebase sign-in code and the Deploy and Preview workflows.
- Delete the server functions and move the Firebase project to the free plan, or delete the project, so
  no bill is possible.
- **Done when:** the repository has no server code and nothing can bill.

### Later, optional

- Commit and reveal, so not even the host's phone can see orders early (section 3.1).
- The host's phone re-checking each lord's gold and army from their history, closing the "edit your own
  save" gap that exists today as well.
- Nearby play over Bluetooth or local Wi-Fi for friends in the same room.

## 5. What gets worse, honestly

- **Results depend on a person.** Today the server fights within five minutes of the lock. Afterwards the
  battle waits for the host or deputy to open the app.
- **Updates are slower.** Today a merge is live in minutes. Afterwards each change is a new app version
  that every lord must install before the next battle that uses it.
- **Balance changes need more care.** A phone on old rules cannot take part until it updates.
- **No "results are in" push** that wakes a closed app; only timed local reminders.
- **Recovery is weaker.** A lord who loses their phone and their recovery code needs the host to move their seat.

## 6. Costs after the move

| Item | Cost |
|---|---|
| Servers, database, functions, hosting | None |
| Android by direct install | None |
| Android on the Play Store (optional) | About US$25, once |
| iPhone as a home-screen web app | None |
| iPhone as a native app (optional) | About US$99 a year |
| GitHub Actions | Inside the free allowance if builds are run on demand; macOS builds use it up quickly |

For comparison, the hosted game is expected to cost about AUD 0 to 1 a month at ten players.
