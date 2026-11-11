# Daily Siege: notes for Claude

## Merging into main

Every push to `main` deploys the game to Firebase (`.github/workflows/deploy.yml`). Whenever you
merge a pull request into `main`, don't stop at "merged":

1. Find the Deploy workflow run for the merge commit and wait for it to finish. It takes about
   4 minutes. Use the GitHub tools to check its status rather than guessing.
2. Then tell the user the result, with a link to the run:
   - **Success:** say the change is live. Mention that players should close and reopen the game
     to pick it up.
   - **Failure:** say it is **not** live, which job and step failed, and why (read the job log).
     Offer a fix.
3. If a push-notification tool is available, also send the result as a push notification, since
   the user may have stepped away while it ran.
