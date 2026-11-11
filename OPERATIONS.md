# Running Daily Siege

A short guide for the host. No coding needed for anything here.

- **The game:** https://daily-siege.firebaseapp.com (the `.web.app` address forwards to it)
- **Firebase console:** https://console.firebase.google.com/project/daily-siege
- **Code and deploys:** https://github.com/pandamonki/dailysiege (the **Actions** tab shows every deploy)

## How it fits together

- Changes merged into the `main` branch on GitHub go live by themselves a few minutes later (the **Deploy** action).
- Each lord's orders and private state are stored so that only they and the server can read them.
- Every day, within five minutes of the battle time, the server fights the battle and saves the result.
  An hour before, it reminds lords who have not sealed.

## Starting a war

1. Open the game and sign in. **The first account to sign in after the first deploy becomes the site owner**,
   and only the owner can host, so sign in yourself before sharing anything.
2. Tap **Play with friends**, choose the battle time and when registration closes, then **Open registration**.
3. Register yourself, then in the Muster Hall tap **Copy invite link** and send it to your friends.
   It is the same link for every war.
4. In the Muster Hall you can change the number of seats (2 to 12, normally 10) and the battle time.
5. Short of friends? In the Muster Hall, **Bot lords** fills empty seats with computer-played lords (**+ Bot**,
   **− Bot**, **Fill every empty seat**, **Remove all bots**). Each bot takes one seat and plays every day with its own
   orders, so you can run a whole seven-day war on the normal daily battle schedule, alone or with a few friends. If a
   friend registers when the war is full, they take a bot's seat. Bots can only be changed while registration is open.
   (This needs the `setBots` server function, which deploys with the rest of the functions.)
6. When everyone is in, tap **Lock in and begin the war** (or let the closing time pass).

Friends open the link, sign in once (Google, or a link sent to their email), and tap **Register**.
On a phone they should then add the game to their Home Screen (the **Install app** button explains how) and
turn on **battle alerts** from the Friends Game screen.

**Starting the next war:** Friends Game screen → Host settings → **Start a new war** (tap twice).
Everyone stays in the game with the same invite link; armies and gold start afresh.

## When something goes wrong

| Problem | What to do |
|---|---|
| A friend got a new phone | They just sign in again with the same Google account or email. Nothing else is needed. |
| A friend signed in with a *different* account and has no castle | Ask them to open the invite link and sign up. Then: Friends Game screen → Host tools → **Lost phone?** → pick their old castle and their new account → **Move the castle**. Their army, gold, points and orders come with it, and the old account is shut out. |
| Someone should not be in the game | Host tools → **Remove** next to their name (tap twice). They lose access and cannot rejoin. In the middle of a war this redraws the map from the next battle. |
| The invite link got around | Host tools → **Make a new invite link**. The old link stops working; lords already in are not affected. |
| "Last night's battle is being fought…" for more than ten minutes | Tap **Resolve now** (on that message, or in Host tools). If it reports an error, see "Looking at what the server did" below and send me the error text. |
| A lord says the replay looked different from the result | The game shows a warning on their device and files a report. The saved result is the official one. See "Replay reports" below. |
| A friend's phone shows an old version | Close the game completely and open it again. New versions download in the background and are used from the next start. |
| A friend gets no notifications | They need the game on their Home Screen (required on iPhone), signed in there, with **battle alerts** turned on. |

## Rolling back a bad deploy

**The game's screens (fast, two taps):** Firebase console → **Hosting** → under *Release history* find the
last good release → **⋮** → **Rollback**. Phones pick it up on their next start.

**The server or the rules:** these are redeployed from the code, so undo the change on GitHub:
open the merged pull request → **Revert** → merge the revert. The Deploy action then puts the previous
version back. If a war is running and battles are affected, do this before the next battle time.

A deploy never touches the data (wars, orders, results), so rolling back does not lose anything.

## Trying a change safely

- Every pull request gets a **preview address**, posted as a comment on it. On a preview the friends game is
  switched off on purpose, so nothing you do there can touch the real war. Use it to look at screens and play
  against bots.
- Anything involving accounts, orders or battles is tested automatically against a local copy of Firebase on
  every pull request (the green ticks). It never uses the real project.
- The second Firebase project (`-dev`) is not needed for any of this and can be left as it is or deleted.

## Checking that devices agree

Open https://daily-siege.firebaseapp.com/selftest.html on any phone. It fights 62 fixed battles and shows
**Pass** and a short code. Every device should show the same code. If one shows **Fail**, tap **Copy report**
and send it to me.

## Costs

Expect about AUD 0–1 a month at ten players. The game is built to stay inside the free allowances.

- **Where to look:** Firebase console → ⚙ → **Usage and billing**. Your AUD 5 budget alert emails you if spending
  ever heads there.
- **What "normal" looks like:** Firestore reads in the low thousands a day and writes in the hundreds;
  Functions a few hundred runs a day (one every five minutes, plus one per settings change).
- **Safeguards already in place:** the server can never run more than two copies of a function at once;
  there is only one scheduled job; old function build images are deleted after three days; the game's files are
  cached on each phone, so opening it downloads almost nothing.
- **One thing to check once:** Google Cloud console → APIs & Services → make sure **Container Scanning API**
  is *not* enabled. It is off unless someone turns it on, and it is a known source of surprise charges.

## Looking at what the server did

Firebase console → **Functions** → **Logs**. Each night's battle writes a line like
`Daily Siege battles {"<game>":[{"day":"2026-11-20","fought":true,"lords":10}]}`. Errors show in red.

The saved data is under **Firestore Database** → `games` → your game:

- `battles` — one record per day (results, and the exact orders that were fought)
- `players` — each lord's public profile; their `orders` and `private` folders are theirs alone
- `reports` — replay reports (see below)

Please don't edit these by hand during a war: battles are replayed from them.

## Replay reports

If a device replays a battle differently from the saved result, it adds a record under
`games/<your game>/reports` with the day, the device and both fingerprints. It should never happen
(every pull request checks 62 battles in Chrome, Firefox and Safari's engine), so if one appears, send me
its contents and the device's self-test report.

## Who can host

Only accounts on the site's hosts list can start games; to begin with that is just you. To let a friend host
their own game: Firestore Database → `config` → `app` → add their account id to the `hosts` list. Their id is
shown under **Authentication** → Users → *User UID*.

## Before the very first war on this site

1. Merge the pull request so the first deploy runs, and check it went green in the **Actions** tab.
2. Open the game and sign in first (this makes you the owner).
3. Open `/selftest.html` on an iPhone and an Android phone and check both show **Pass** with the same code.
4. Install the game on your own phone, turn on battle alerts, and run a two-person test war with a friend
   for a day to see a battle and its notification arrive.
5. Finish the current war on the old Claude version first. Don't move a war that is in progress.
