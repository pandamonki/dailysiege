# Daily Siege: notes for Claude

## How to talk to the user

The user rarely works at a computer. They work mostly from their phone, often in voice mode or
with text-to-speech reading Claude's responses aloud. So keep responses short and easy to hear:

- Reply in plain, readable sentences. Avoid long code blocks, tables, diffs, file listings, raw
  logs, and heavy markdown, since they read badly aloud.
- Lead with a brief summary of what changed, in plain language.
- Then state any actions required from the user, clearly and separately.
- Then ask any questions, one at a time where possible.
- Skip play-by-play of how the work was done unless asked.
- Refer to files and code sparingly. When needed, say what it does rather than reading out paths
  or symbols.

## Pull requests and merging: only when asked

GitHub Actions minutes are limited (2,000 a month on the free plan), and every merge to `main`
costs a deploy. So don't open pull requests or merge on your own.

- **Commit and push to the working branch**, then tell the user the change is ready. Open a pull
  request only when the user asks for one. Merge only when the user asks for a merge.
- When the user does ask, merging straight to `main` needs no further confirmation for balance
  changes, minor features, bug fixes and documentation. Major features, prototypes and parallel
  experiment branches still need the user's go-ahead after the pull request is open.
- If unsure which category a change falls into, treat it as major and ask.
- Prefer one pull request with several related changes over many small ones, so the tests and
  the deploy run once.
- A pull request gets a preview link (the Preview workflow). Point the user to it for testing
  before they ask for a merge.
- **Merge conflicts, rebases, and failing checks:** resolve them yourself. Don't report each one.
  Just tell the user the outcome once it is done.
- **Documentation-only changes (`.md` files) run no tests and no deploy.** The CI, Preview and
  Deploy workflows all skip them. Don't run the test suite for them either.
- **If you can't resolve something**, say so plainly, explain what is blocking it in a sentence or
  two, and ask for the user's help troubleshooting.

## Merging into main

Every push to `main` deploys the game to Firebase (`.github/workflows/deploy.yml`). Whenever you
merge a pull request into `main`, don't stop at "merged":

1. Find the Deploy workflow run for the merge commit and wait for it to finish. It takes about
   4 minutes. Use the GitHub tools to check its status rather than guessing.
   - Exception: if the merge changed only `.md` files, no deploy runs (Markdown is never served).
     Tell the user straight away that nothing needed deploying, and skip steps 2 and 3.
2. Then tell the user the result, with a link to the run:
   - **Success:** say the change is live. Mention that players should close and reopen the game
     to pick it up.
   - **Failure:** say it is **not** live, which job and step failed, and why (read the job log).
     Offer a fix.
3. If a push-notification tool is available, also send the result as a push notification, since
   the user may have stepped away while it ran.
