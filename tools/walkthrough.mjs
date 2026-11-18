// The walkthrough: a robot player plays one practice day in a real browser, tapping the real buttons, and fails if any screen
// throws an error or a button it relies on is missing. It covers what the rules tests can't see: menus, tabs, placing pieces on
// the map, building walls, orders, skills, sealing, the battle replay and the results.
//   npm run build && node tools/walkthrough.mjs [chromium|firefox|webkit ...]
// Add a step here whenever a new screen or feature lands (see CLAUDE.md).
/* eslint-disable no-undef -- the functions handed to page.evaluate run inside the game page, where these names are its globals */
import { createRequire } from "node:module";
import { preview } from "vite";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = createRequire("/")("playwright"); }

const engines = process.argv.slice(2).length ? process.argv.slice(2) : ["chromium"];
const server = await preview({ preview: { port: 4181, strictPort: true, host: "127.0.0.1" }, logLevel: "silent" });
const base = "http://127.0.0.1:4181/";
let failed = false;

for (const name of engines) {
  const browser = await pw[name].launch(process.env.PW_EXECUTABLE && name === "chromium" ? { executablePath: process.env.PW_EXECUTABLE } : {}); // PW_EXECUTABLE: a browser already on this machine
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [], results = [];
  page.on("pageerror", e => errors.push(String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")));
  page.on("response", res => { if (res.status() >= 400 && res.url().startsWith(base)) errors.push(res.status() + " " + res.url()); });

  const js = (fn, arg) => page.evaluate(fn, arg);
  const sheetOpen = () => js(() => !document.getElementById("sheet").hidden);
  const tap = async sel => { const el = page.locator(sel).first(); await el.waitFor({ state: "visible", timeout: 5000 }); await el.click(); await page.waitForTimeout(120); };
  const closeAll = async () => { for (let i = 0; i < 10 && await sheetOpen(); i++) { const x = page.locator('#sheet [data-act="close"]:visible').first(); if (await x.count()) await x.click(); else await js(() => { sheet = null; render(); }); await page.waitForTimeout(120); } };
  const tapTile = async (r, q) => { // centre the camera on a tile, then tap it like a finger would
    const pt = await js(([r, q]) => { camTarget = null; cam.z = 1.3; cam.x = (q + .5) * ts - innerWidth / 2 / cam.z; cam.y = (r + .5) * ts - 260 / cam.z; clampCam(); render(); const rc = document.getElementById("map").getBoundingClientRect(); return [rc.left + ((q + .5) * ts - cam.x) * cam.z, rc.top + ((r + .5) * ts - cam.y) * cam.z]; }, [r, q]);
    await page.mouse.click(pt[0], pt[1]); await page.waitForTimeout(150); };
  const freeTiles = () => js(() => [...zoneSet].filter(k => !S.place[k] && !wallRefAt(...k.split(",").map(Number))).map(k => k.split(",").map(Number)));
  const step = async (title, fn) => { const before = errors.length; try { await fn(); if (errors.length > before) throw new Error("page error: " + errors.slice(before).join(" ; ")); results.push(["ok", title]); } catch (e) { results.push(["FAIL", title + ": " + (e && e.message || e).split("\n")[0]]); } };

  await step("the title screen loads", async () => { await page.goto(base); await page.waitForFunction(() => typeof runBattle === "function" && !document.getElementById("sheet").hidden, null, { timeout: 30000 }); });
  await step("a practice game starts", async () => { await js(() => { try { localStorage.clear(); } catch { /* storage may be blocked: start from whatever is there */ } }); await page.goto(base); await page.waitForFunction(() => typeof runBattle === "function", null, { timeout: 30000 }); await page.waitForTimeout(800);
    if (await page.locator('[data-act="testgo"]').count()) await tap('[data-act="testgo"]'); else await tap('[data-act="playgo"]'); await page.waitForTimeout(800); await closeAll();
    if (!(await js(() => mode === "plan" && !!S && typeof DAY === "number"))) throw new Error("not on the planning screen"); });
  await js(() => { S.gold = 9999; render(); }); // enough gold to try everything
  await step("every top-row chip opens and closes", async () => { for (const sel of ['#chips [data-v="day"]', '#chips [data-v="gold"]', '#chips [data-v="recruit"]', '#chips [data-v="board"]']) { await tap(sel); await closeAll(); } });
  for (const [label, sel] of [["Base", '#cmdbar [data-v="keep"]'], ["Army", '#cmdbar [data-v="recruit"]'], ["Hero", '#cmdbar [data-act="openhero"]'], ["Orders", '#cmdbar [data-act="openorders"]'], ["Allies", '#cmdbar [data-act="openorders"][data-v="alli"]']]) {
    await step(`${label}: every tab opens`, async () => { await closeAll(); await tap(sel); if (!(await sheetOpen())) throw new Error("no screen opened");
      const tabs = await page.locator("#sheet .tabs button:visible").count(); for (let i = 0; i < tabs; i++) { await page.locator("#sheet .tabs button:visible").nth(i).click(); await page.waitForTimeout(120); }
      if (!(await js(() => document.querySelector("#sheet").innerText.trim().length > 20))) throw new Error("screen is empty"); await closeAll(); });
  }
  await step("buy and place a trap", async () => { await tap('#cmdbar [data-v="keep"]'); await tap('#sheet .tabs button:has-text("Defences")'); await tap('#sheet [data-act="dsel"][data-v="spike"]'); await tap('#sheet [data-act="trap"][data-v="spike"]');
    const [r, q] = (await freeTiles())[0]; await tapTile(r, q); if (!(await js(() => S.traps.some(t => t.type === "spike" && placedAt(t.id))))) throw new Error("the trap is not on the map"); });
  await step("buy, place and inspect a tower", async () => { await tap('#cmdbar [data-v="keep"]'); await tap('#sheet .tabs button:has-text("Defences")'); await tap('#sheet [data-act="dsel"][data-v="tw1"]'); await tap('#sheet [data-act="trap"][data-v="tower"]');
    const [r, q] = (await freeTiles())[2]; await tapTile(r, q); if (!(await js(() => S.traps.some(t => t.type === "tower" && placedAt(t.id))))) throw new Error("the tower is not on the map");
    await tapTile(r, q); await page.waitForTimeout(150); if (!(await js(() => /Upgrade/.test(document.getElementById("pdock").innerText)))) throw new Error("the tower's strip has no Upgrade button"); });
  await step("compare and buy a tower upgrade", async () => { await closeAll(); await js(() => { S.castle = 3; const t = S.traps.find(x => x.type === "tower"); t.tk = "tower2"; render(); });
    await tap('#cmdbar [data-v="keep"]'); await tap('#sheet .tabs button:has-text("Defences")'); await tap('#sheet [data-act="dsel"][data-v="tw1"]');
    if (!(await page.locator("#sheet .cmp").count())) throw new Error("no stats comparison"); await tap('#sheet [data-act="tpick"][data-v="towerS"]');
    if (!(await js(() => /sniper/i.test(document.querySelector("#sheet .cmp").innerText)))) throw new Error("the comparison did not switch to the Sniper Tower");
    await tap('#sheet [data-act="tup"]'); if (!(await js(() => S.traps.some(t => t.tk === "towerS")))) throw new Error("the upgrade was not bought"); await closeAll(); });
  await step("build two joined walls on the map", async () => { await closeAll(); await tap('#cmdbar [data-v="keep"]'); await tap('#sheet .tabs button:has-text("Defences")'); await tap('#sheet [data-act="dsel"][data-v="wall+"]'); await tap('#sheet [data-act="wbuild"]');
    const free = await freeTiles(), n0 = await js(() => S.walls.length), pair = free.find(([r, q]) => free.some(([a, b]) => a === r && b === q + 1) && free.length);
    const ok = await js(([r, q]) => routeOpen(`${r},${q}`, null) && routeOpen(`${r},${q + 1}`, null), pair); if (!ok) throw new Error("no room for a wall pair");
    await tapTile(pair[0], pair[1]); await tapTile(pair[0], pair[1] + 1); await tap('#hint [data-act="wdone"]');
    if ((await js(() => S.walls.length)) - n0 < 2) throw new Error("walls were not built"); });
  await step("set the army plan and fall-back", async () => { await closeAll(); await tap('#cmdbar [data-act="openorders"]'); await tap('#sheet .tabs button:has-text("Strategy")');
    if (await page.locator('#sheet [data-act="aplan"]').count()) { await tap('#sheet [data-act="aplan"][data-v="hunt"]'); await tap('#sheet [data-act="fback"][data-v="castle"]'); if (!(await js(() => S.strategy.plan === "hunt" && S.strategy.fallback === "castle"))) throw new Error("orders did not stick"); } await closeAll(); });
  await step("pick today's targets", async () => { await tap('#cmdbar [data-act="openorders"]'); await tap('#sheet .tabs button:has-text("Strategy")');
    for (let i = 0; i < 6 && !(await js(() => targetsReady())); i++) { const add = page.locator('#sheet [data-act="lmove"][data-v="hostile"]:visible'); if (!(await add.count())) break; await add.first().click(); await page.waitForTimeout(150); }
    if (!(await js(() => targetsReady()))) throw new Error("could not pick enough targets"); await closeAll(); });
  await step("learn a hero skill", async () => { await tap('#cmdbar [data-act="openhero"]'); const before = await js(() => freePts());
    if (before > 0 && await page.locator('#sheet [data-act="tnode"]').count()) { await page.locator('#sheet [data-act="tnode"]').last().click(); await page.waitForTimeout(150); const l = page.locator('#sheet [data-act="tlearn"]:not([disabled])'); if (await l.count()) { await l.first().click(); await page.waitForTimeout(150); if ((await js(() => freePts())) >= before) throw new Error("no point was spent"); } }
    await closeAll(); });
  await step("seal the orders", async () => { await tap(".sealbar"); await page.waitForTimeout(200);
    if (await page.locator('#sheet [data-act="seal"][disabled]').count()) throw new Error("the seal is disabled: " + (await js(() => document.querySelector("#sheet").innerText.replace(/\s+/g, " ").slice(0, 300))));
    await tap('#sheet [data-act="seal"]'); if (!(await js(() => S.locked))) throw new Error("orders are not sealed"); });
  await step("watch the battle to the end", async () => { await tap('#sheet [data-act="battle"]'); await page.waitForTimeout(500); const go = page.locator('text=To battle'); if (await go.count()) await go.first().click();
    await page.waitForFunction(() => mode === "replay" && replay && replay.res, null, { timeout: 20000 });
    await js(() => { replay.time = Math.max(0, replay.res.duration - 2); replay.playing = true; }); // skip to the last seconds
    await page.waitForFunction(() => !replay || replay.done, null, { timeout: 30000 }); });
  await step("the battle report shows every lord and opens their builds", async () => { await page.waitForTimeout(1500); for (let i = 0; i < 6; i++) { const c = page.locator('button:has-text("Continue"):visible'); if (await c.count()) { await c.first().click(); await page.waitForTimeout(600); } }
    await closeAll(); await js(() => { sheet = { type: "report" }; render(); }); if ((await page.locator("#sheet .rrow.hs").count()) < 2) throw new Error("the scoreboard has too few lords");
    await tap('#sheet [data-act="rkit"][data-v="*"]'); if ((await page.locator("#sheet .kitwrap").count()) < 2) throw new Error("Show all builds opened no builds"); await closeAll(); });
  await step("the results screens appear and close", async () => { await page.waitForTimeout(1500); for (let i = 0; i < 6; i++) { const c = page.locator('button:has-text("Continue"):visible'); if (await c.count()) { await c.first().click(); await page.waitForTimeout(600); } }
    await closeAll(); });
  await step("no script errors anywhere", async () => { if (errors.length) throw new Error(errors.length + " errors: " + errors.slice(0, 3).join(" ; ")); });

  console.log(`\n[${name} walkthrough]\n` + results.map(([s, t]) => `${s === "ok" ? "  ✓" : "  ✗"} ${t}`).join("\n"));
  if (results.some(r => r[0] !== "ok")) failed = true;
  await browser.close();
}
await new Promise(r => server.httpServer.close(r));
console.log(failed ? "\nWALKTHROUGH FAILED" : "\nWalkthrough passed in: " + engines.join(", "));
process.exit(failed ? 1 : 0);
