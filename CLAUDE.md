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
