// Runs selftest.html (the phone self-test) in real browser engines against the built site, and
// loads the game itself to check it starts without errors.
//   npm run build && node tools/selftest-browsers.mjs chromium firefox webkit
// Playwright is not a dependency of this repo: CI installs it for this step, and it is taken from
// the machine's global install otherwise.
import { createRequire } from "node:module";
import { preview } from "vite";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = createRequire("/")("playwright"); }

const engines = process.argv.slice(2).length ? process.argv.slice(2) : ["chromium"];
const server = await preview({ preview: { port: 4179, strictPort: true, host: "127.0.0.1" }, logLevel: "silent" });
const base = "http://127.0.0.1:4179/";
let failed = false;

for (const name of engines) {
  const browser = await pw[name].launch();
  try {
    const page = await browser.newPage();
    await page.goto(base + "selftest.html");
    await page.waitForFunction(() => window.__selftest && window.__selftest.done, null, { timeout: 300000 });
    const r = await page.evaluate(() => window.__selftest), report = await page.textContent("#report");
    console.log(`\n[${name} ${browser.version()}]\n${report}`);
    if (!r.pass) failed = true;

    // the game itself: loads and reaches the title screen with no script errors
    const game = await browser.newPage(), errors = [];
    game.on("pageerror", e => errors.push(String(e)));
    game.on("response", res => { if (res.status() >= 400 && res.url().startsWith(base)) errors.push(res.status() + " " + res.url()); });
    await game.goto(base);
    await game.waitForFunction(() => typeof runBattle === "function" && !document.getElementById("sheet").hidden, null, { timeout: 30000 });
    await game.waitForTimeout(1500);
    console.log(`[${name}] game page: ${errors.length ? "ERRORS\n" + errors.join("\n") : "loads cleanly"}`);
    if (errors.length) failed = true;
  } catch (e) {
    console.log(`[${name}] could not run: ${e && e.message}`); failed = true;
  } finally { await browser.close(); }
}
await new Promise(r => server.httpServer.close(r));
console.log(failed ? "\nSELF-TEST FAILED" : "\nSelf-test passed in: " + engines.join(", "));
process.exit(failed ? 1 : 0);
