// The walkthrough: a robot player plays one practice day in a real browser, tapping the real buttons, and fails if any screen
// throws an error or a button it relies on is missing. It covers what the rules tests can't see: menus, tabs, placing pieces on
// the map, building walls, orders, skills, sealing, the battle replay and the results.
//   npm run build && node tools/walkthrough.mjs [chromium|firefox|webkit ...]
// Add a step here whenever a new screen or feature lands (see CLAUDE.md).
//   WT_DEVICE="iPhone SE (3rd gen)" node tools/walkthrough.mjs   plays on an emulated phone (any name in Playwright's device list)
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
  // WT_DEVICE="iPhone 13" plays as that phone (its screen size, pixel density, touch and user agent) instead of the plain 390x844 window
  const dev = process.env.WT_DEVICE ? pw.devices[process.env.WT_DEVICE] : null; if (process.env.WT_DEVICE && !dev) throw new Error(`no device called ${process.env.WT_DEVICE}`);
  const { defaultBrowserType: _bt, ...devOpts } = dev || {}; // eslint-disable-line no-unused-vars -- the engine is chosen on the command line
  const page = await browser.newPage(dev ? devOpts : { viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => { try { if (!localStorage.getItem("lastbanner.pday")) localStorage.setItem("lastbanner.pday", "5"); } catch { /* storage unavailable */ } }); // the practice day follows the real weekday: pin it so the walkthrough plays the same game every day
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
  await step("the Defences tab shows traps, towers and walls out of their limits", async () => { await closeAll(); await tap('#cmdbar [data-v="keep"]'); await tap('#sheet .tabs button:has-text("Defences")');
    const want = await js(() => [`${trapCount(false)}/${TRAP_CAP}`, `${trapCount(true)}/${TOWER_CAP}`, `${S.walls.length}/${wallLimit(ctNow())}`]);
    const got = await page.locator("#sheet .dcaps .dcap b").allInnerTexts(); if (got.join() !== want.join()) throw new Error(`limits show ${got.join(" ")}, expected ${want.join(" ")}`); await closeAll(); });
  await step("the Deploy tab shows each wave's deadline beside its trigger", async () => { await closeAll(); await js(() => { S.garrison.forEach(w => { w.when = "castle_hit"; }); render(); }); await tap('#cmdbar [data-v="recruit"]'); await tap('#sheet .tabs button:has-text("Deploy")');
    const got = (await page.locator("#sheet .gr-dl").allInnerTexts()).map(x => x.replace(/\s+/g, " ").trim()); if (got.join("|") !== "or 0:45|or 1:30|or 2:15") throw new Error(`deadlines show ${got.join(" | ")}`); const chip = (await page.locator('#sheet [data-act="wpop"][data-k="0"]').innerText()).trim(); if (chip !== "Enemies at my castle") throw new Error(`Wave 1 trigger shows "${chip}"`); await closeAll(); });
  await step("a wave's rush box unticks, reaches the battle plan and ticks again", async () => { await closeAll(); await tap('#cmdbar [data-v="recruit"]'); await tap('#sheet .tabs button:has-text("Deploy")');
    await tap('#sheet [data-act="wrush"][data-k="1"]'); if (await js(() => garrisonPlan()[1].rush !== false || garrisonPlan()[0].rush !== true)) throw new Error("unticking Wave 2 did not reach the plan");
    await tap('#sheet [data-act="wrush"][data-k="1"]'); if (await js(() => garrisonPlan()[1].rush !== true)) throw new Error("ticking Wave 2 again did not reach the plan"); await closeAll(); });
  await step("the install and battle-alert cards show for every alert state", async () => { await closeAll();
    for (const [st, k, want] of [["ask", "alerts", "Turn on alerts"], ["ask", "seal", "results are in"], ["on", "menu", "Turn off on this device"], ["install", "menu", "Add to Home Screen"], ["blocked", "menu", "Try again"], ["ask", "install", "Play it like an app"]]) {
      const txt = await js(([st, k]) => { window.DS = window.DS || {}; const was = DS.pushState; DS.pushState = () => st; sheet = { type: "apptip", k }; render(); const t = document.querySelector("#sheet").innerText; DS.pushState = was; return t; }, [st, k]);
      if (!txt.includes(want)) throw new Error(`${k} card (${st}) is missing "${want}"`); }
    await closeAll(); });
  await step("buy, place and inspect a tower", async () => { await tap('#cmdbar [data-v="keep"]'); await tap('#sheet .tabs button:has-text("Defences")'); await tap('#sheet [data-act="dsel"][data-v="tw1"]'); await tap('#sheet [data-act="trap"][data-v="tower"]');
    const [r, q] = (await freeTiles())[2]; await tapTile(r, q); if (!(await js(() => S.traps.some(t => t.type === "tower" && placedAt(t.id))))) throw new Error("the tower is not on the map");
    await tapTile(r, q); await page.waitForTimeout(150); if (!(await js(() => /Upgrade/.test(document.getElementById("pdock").innerText)))) throw new Error("the tower's strip has no Upgrade button"); });
  await step("the map strip: hero has Stats, the castle has Upgrade and no second-tap menu, a wall has no Turn", async () => { await closeAll();
    await js(() => { psel = { t: "champ" }; render(); }); if (!(await page.locator('#pdock [data-act="openhero"][data-v="stats"]').count())) throw new Error("no Stats button for the hero");
    await tap('#pdock [data-act="openhero"][data-v="stats"]'); if (!(await js(() => sheet && sheet.tab === "stats"))) throw new Error("Stats did not open the hero's stats"); await closeAll();
    const [cr, cq] = await js(() => CASTLE); await tapTile(cr, cq); await tapTile(cr, cq); if (await sheetOpen()) throw new Error("a second tap on the castle opened a menu");
    if (!(await js(() => /Upgrade|Max tier/.test(document.getElementById("pdock").innerText)))) throw new Error("the castle strip has no Upgrade button");
    if (await js(() => /\d+g/.test((document.querySelector('#pdock [data-act="castleup"]') || {}).innerText || ""))) throw new Error("the castle's Upgrade button still shows its gold cost");
    if (await js(() => /📊/.test(document.getElementById("pdock").innerHTML))) throw new Error("the Stats button still uses the emoji icon");
    if (await js(() => { psel = { t: "wall", id: (S.walls[0] || {}).id }; render(); return S.walls.length && !!document.querySelector('#pdock [data-act="wrot"]'); })) throw new Error("a wall still has a Turn button");
    await js(() => { psel = null; render(); }); });
  await step("the gift: Roll, Stop, the reels land, pick another and take it", async () => { await closeAll();
    await js(() => { S.spin = { tier: 1, day: 2, bonus: false, offer: rollSpin("walk", 1, S.items), week: null, at: Date.now(), shown: true }; S.items = S.items.slice(0, 2); sheet = { type: "spin" }; render(); });
    if (!(await js(() => /Roll for your gift/.test(document.querySelector("#sheet").innerText)))) throw new Error("the gift does not start on Roll for your gift");
    await tap('#sheet [data-act="spinroll"]'); await tap('#sheet [data-act="spinstop"]'); await page.waitForTimeout(4000);
    const offer = await js(() => S.spin.offer); if (!(await page.locator(`#sheet .reel.pick.on[data-v="${offer[0]}"]`).count())) throw new Error("the first item is not picked with the glow");
    await tap(`#sheet [data-act="spinsel"][data-v="${offer[1]}"]`); if (!(await page.locator(`#sheet [data-act="spinpick"][data-v="${offer[1]}"]`).count())) throw new Error("tapping the second item did not pick it");
    await tap('#sheet [data-act="spinpick"]'); if (!(await js(k => S.items.includes(k) && !S.spin, offer[1]))) throw new Error("the picked item was not taken"); await closeAll(); });
  await step("the mercenary camp: + and − set the amount, and only Place bid bids", async () => { await closeAll();
    await js(() => { sheet = { type: "camp" }; render(); }); const k = await js(() => { const R = mercToday(); return R.head; }), lo = await js(k => mercMin(k, true), k);
    await tap('#sheet [data-act="mstep"][data-v="1"]'); if (await js(k => !!(S.bids || {})[k], k)) throw new Error("+ placed a bid on its own");
    await tap('#sheet [data-act="msubmit"]'); if ((await js(k => (S.bids[k] || {}).gold, k)) !== lo + 10) throw new Error("Place bid did not bid the shown amount");
    if (!(await js(b => document.querySelector("#sheet .mhead").innerText.includes(String(b)), lo + 10))) throw new Error("the group's card does not show your bid"); await js(k => { delete S.bids[k]; }, k); await closeAll(); });
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
  await step("the Daily Noticeboard shows the twist and opens contracts and targets", async () => { await closeAll(); if (await page.locator("#twistbtn").isHidden()) throw new Error("no ! button above the map");
    await tap("#twistbtn"); if (!(await page.locator("#twistpop .nbh").count())) throw new Error("the noticeboard has no heading"); await closeAll(); await page.mouse.click(5, 5);
    await tap("#twistbtn"); await tap('#twistpop [data-act="opentoday"]'); if (!(await page.locator('#sheet [data-act="cxpick"]').count())) throw new Error("the contracts tab didn't open"); await closeAll();
    await tap("#twistbtn"); await tap('#twistpop [data-act="sealgo"][data-v="strategy"]'); if (!(await page.locator("#sheet #tgtlist").count())) throw new Error("the targets didn't open"); await closeAll(); });
  await step("learn a hero skill", async () => { await tap('#cmdbar [data-act="openhero"]'); const before = await js(() => freePts());
    if (before > 0 && await page.locator('#sheet [data-act="tnode"]').count()) { await page.locator('#sheet [data-act="tnode"]').last().click(); await page.waitForTimeout(150); const l = page.locator('#sheet [data-act="tlearn"]:not([disabled])'); if (await l.count()) { await l.first().click(); await page.waitForTimeout(150); if ((await js(() => freePts())) >= before) throw new Error("no point was spent"); } }
    await closeAll(); });
  await step("seal the orders", async () => { await tap(".sealbar"); await page.waitForTimeout(200);
    if (await page.locator('#sheet [data-act="seal"][disabled]').count()) throw new Error("the seal is disabled: " + (await js(() => document.querySelector("#sheet").innerText.replace(/\s+/g, " ").slice(0, 300))));
    await tap('#sheet [data-act="seal"]'); if (!(await js(() => S.locked))) throw new Error("orders are not sealed"); });
  await step("watch the battle to the end", async () => { await tap('#sheet [data-act="battle"]'); await page.waitForTimeout(500); const go = page.locator('text=To battle'); if (await go.count()) await go.first().click();
    await page.waitForFunction(() => mode === "replay" && replay && replay.res, null, { timeout: 20000 });
    await js(() => { replay.playing = false; replay.time = 20; updateReplayUI(); });
    if ((await page.locator("#ctrack .ct").count()) !== (await js(() => replay.res.order.length))) throw new Error("the side strip does not show every lord");
    await js(() => { const k = replay.res.meta.findIndex(m => m.kind === "champ" && m.pid !== replay.res.me); A.rfollow(String(k)); }); await page.waitForTimeout(150);
    if (!(await js(() => replay.follow != null && replay.auto && replay.res.meta[replay.follow].kind === "champ"))) throw new Error("following a hero did not work");
    { const cr = await js(() => { const g = replayTeams(replay.res); return { n: g.length, ok: g.every(x => CREST_ANIMALS.includes(x.animal)) && g.length === new Set(g.map(x => x.animal)).size, svg: crestSVG(["#c00", "#0c0"], "wolf", 20, null, true).startsWith("<svg") }; }); // team crests: every alliance has its own animal
      if (!cr.ok || !cr.svg) throw new Error("the team crests are wrong"); }
    { const hl = await js(() => { const c = buildReel(replay.res).filter(x => x.h.kind === "ult"); return { n: c.length, short: c.filter(x => x.b - x.a < 3.9 && x.b < replay.res.duration - .1).length, boxed: c.every(x => !!x.box) }; }); // highlights: the best three ultimates, framed, at least 4 seconds
      if (hl.n > 3) throw new Error("the highlights show more than 3 ultimates"); if (hl.short) throw new Error("a highlight ultimate clip is under 4 seconds"); if (!hl.boxed) throw new Error("an ultimate clip has no framing box");
      await js(() => { const R = replay.res, h = { kind: "betray", pid: R.order[0], other: R.order[1], t: 30, x: 10, y: 10 }, c = makeBetrayCine(h, R); let n = 0; while (!tickBetrayCine(c, .1) && n++ < 300); drawBetrayBanner(c); if (n >= 300) throw new Error("the betrayal cut-away never ended"); }); }
    if (!(await page.locator("#ud .ud-fol").count())) throw new Error("the unit panel has no Follow");
    await js(() => { replay.time = Math.max(0, replay.res.duration - 2); replay.playing = true; }); // skip to the last seconds
    await page.waitForFunction(() => !replay || replay.done, null, { timeout: 30000 }); });
  await step("the battle report shows every lord and opens their builds", async () => { await page.waitForTimeout(1500); for (let i = 0; i < 6; i++) { const c = page.locator('button:has-text("Continue"):visible'); if (await c.count()) { await c.first().click(); await page.waitForTimeout(600); } }
    await closeAll(); await js(() => { sheet = { type: "report" }; render(); }); if ((await page.locator("#sheet .rrow.hs").count()) < 2) throw new Error("the scoreboard has too few lords");
    await tap('#sheet [data-act="rkit"][data-v="*"]'); if ((await page.locator("#sheet .kitwrap").count()) < 2) throw new Error("Show all builds opened no builds"); await closeAll(); });
  await step("emoji on screen are drawn as the game's own icons", async () => { await js(() => { sheet = { type: "report" }; render(); }); await page.waitForTimeout(100);
    const r = await js(() => ({ glyphs: document.querySelectorAll("#sheet .glyph svg").length, left: /[\u{1F947}-\u{1F949}\u{1F4A5}\u2620\u2694]/u.test(document.getElementById("sheet").innerText) }));
    if (!r.glyphs) throw new Error("the report shows no drawn icons"); if (r.left) throw new Error("medal or stat emoji are still showing on the report"); await closeAll(); });
  await step("the share card: the report's Share button builds the picture and the text", async () => { await js(() => { sheet = { type: "report" }; render(); });
    if (!(await page.locator('#sheet [data-act="rshare"]').count())) throw new Error("the report has no Share button");
    const r = await js(async () => { const s = shareStory("practice"), t = shareText(s), cv = await shareCanvas(s); return { t, w: cv.width, h: cv.height, rows: s.table.length }; });
    if (!/won the day/.test(r.t) || !/day \d/i.test(r.t)) throw new Error("the share text has no winner or day: " + r.t); if (r.w !== 1080 || r.h !== 1350 || r.rows < 2) throw new Error("the share picture is wrong"); await closeAll(); });
  await step("the results screens appear and close", async () => { await page.waitForTimeout(1500); for (let i = 0; i < 6; i++) { const c = page.locator('button:has-text("Continue"):visible'); if (await c.count()) { await c.first().click(); await page.waitForTimeout(600); } }
    await closeAll(); });
  await step("the Allies screen shows the alliances, who stands alone and the history", async () => { await js(() => { if (mode === "replay") leaveBattle(); sheet = null; render(); }); await closeAll();
    await tap('#cmdbar [data-act="openorders"][data-v="alli"]'); const t = await js(() => document.querySelector("#sheet").innerText);
    if (!/Alliances in the war/i.test(t)) throw new Error("no alliance overview"); if (!/Standing alone|Alliance/i.test(t)) throw new Error("no alliance cards");
    if (await js(() => (S.allyLog || []).length && !document.querySelector("#sheet .ahist") && allyHistory().length)) throw new Error("the alliance history is missing"); await closeAll(); });
  await step("the How to play guide: chapter tabs, the tour's ring and every picture", async () => { await closeAll();
    await js(() => { if (mode === "replay") leaveBattle(); sheet = null; render(); }); await closeAll(); await js(() => startWizard(true, 0)); await page.waitForTimeout(200);
    for (const ch of await js(() => GUIDE.map(c => c.id))) { await tap(`#wiz [data-gch="${ch}"]`); if (!(await js(c => document.querySelector("#wiz .gtabs .on").dataset.gch === c, ch))) throw new Error("the " + ch + " tab did not open"); }
    await tap('#wiz [data-gch="army"]'); await page.waitForTimeout(300); const rg = await js(() => [document.getElementById("wizring").style.display, mode, !!document.querySelector('#cmdbar [data-act="opencastle"][data-v="keep"]'), document.getElementById("commands").hidden]); if (rg[0] !== "block") throw new Error("the tour did not ring the Base button " + JSON.stringify(rg));
    await tap("#wskip"); if (await js(() => !!document.getElementById("wiz"))) throw new Error("Skip did not close the tour");
    const shots = await js(() => [...new Set(GUIDE.flatMap(c => c.pages).filter(p => p.shot).map(p => p.shot))]);
    for (const n of shots) { const ok = await js(async n => { const im = new Image(); im.src = "guide/" + n + ".webp"; try { await im.decode(); return im.naturalWidth > 100; } catch { return false; } }, n); if (!ok) throw new Error("the guide picture " + n + " is missing"); }
    const bad = await js(() => GUIDE.flatMap(c => c.pages).filter(p => p.shot && !(p.keys && p.keys.length)).map(p => p.t)); if (bad.length) throw new Error("pictures without numbered lines: " + bad.join(", "));
    await js(() => { sheet = { type: "guide", pg: 0 }; render(false); }); await tap('#sheet [data-act="gch"][data-v="rivals"]'); if (!(await js(() => /Contracts/.test(document.querySelector("#sheet").innerText)))) throw new Error("the book's Allies tab did not open"); await closeAll(); });
  await step("the war's end: the crowning plays, the results open a lord's stats and build tabs, and the Muster Hall shows war crowns", async () => { await closeAll();
    await js(() => { if (mode === "replay") leaveBattle(); sheet = null; render(); });
    // a finished war made from the practice battle just fought: seven days of the same result
    await js(() => { const R = LASTP || {}, res = (R.results || []).map(r => Object.assign({}, r)), plans = buildPlans(); const battles = {};
      for (let d = 1; d <= 7; d++) battles["2026-01-0" + d] = { week: "2026-01-01", results: res, inputs: { plans, N } };
      window.__pw = { war: 3, battles }; });
    await js(() => warCrowning(window.__pw)); await page.waitForTimeout(400);
    if (!(await js(() => !!document.querySelector(".crowning .cr-podium .cr-p1")))) throw new Error("the crowning shows no podium");
    await page.waitForTimeout(7200); if (!(await js(() => document.querySelector(".crowning").classList.contains("won") && document.querySelectorAll(".crowning .cr-pod.crowned").length >= 2))) throw new Error("the crowns were not placed");
    await tap(".crowning #crgo"); if (await js(() => !!document.querySelector(".crowning"))) throw new Error("Continue did not close the crowning");
    await js(() => { LIVE.prevWar = window.__pw; LIVE.uid = LIVE.uid || "you"; sheet = { type: "warend" }; render(); }); await page.waitForTimeout(300);
    if (!(await js(() => !!document.querySelector(".crowning")))) throw new Error("the crowning did not play the first time the war results opened");
    await tap(".crowning #crgo"); await js(() => { sheet = { type: "warend" }; render(); }); await page.waitForTimeout(200);
    if (await js(() => !!document.querySelector(".crowning"))) throw new Error("the crowning played a second time");
    const pid = await js(() => warSummary(window.__pw).rank[0].pid); await tap(`#sheet [data-act="wlord"][data-v="${pid}"]`);
    if (!(await js(() => /Net worth/.test(document.querySelector("#sheet .wdet").innerText)))) throw new Error("the lord's stats have no net worth");
    for (const t of ["skills", "items", "army", "ups"]) { await tap(`#sheet [data-act="wltab"][data-v="${t}"]`); if (!(await js(() => document.querySelector("#sheet .wtab-body").children.length > 0))) throw new Error("the " + t + " tab is empty"); }
    await js(() => { LIVE.prevWar = null; sheet = null; render(); });
    if (!(await js(() => /<b>2<\/b>/.test(warCrownHTML(2))))) throw new Error("the war crown has no count"); });
  await step("signed in with no war, closing a screen goes to the friends game screen, not the practice board", async () => {
    const r = await js(() => { const hadDS = "DS" in window, ds = window.DS, picked = PRACTICE_PICKED, loaded = LIVE.configLoaded, gm = gameMode;
      window.DS = Object.assign({}, ds || {}, { user: { uid: "walkthrough" } }); LIVE.configLoaded = true; gameMode = "practice"; PRACTICE_PICKED = false;
      const noWar = noWarBoard(); PRACTICE_PICKED = true; const chosen = noWarBoard();
      PRACTICE_PICKED = picked; LIVE.configLoaded = loaded; gameMode = gm; if (hadDS) window.DS = ds; else delete window.DS;
      return { noWar, chosen }; });
    if (!r.noWar) throw new Error("with no war, closing a screen would show the practice board");
    if (r.chosen) throw new Error("a chosen practice game should still show its board"); });
  await step("no script errors anywhere", async () => { if (errors.length) throw new Error(errors.length + " errors: " + errors.slice(0, 3).join(" ; ")); });

  console.log(`\n[${name} walkthrough]\n` + results.map(([s, t]) => `${s === "ok" ? "  ✓" : "  ✗"} ${t}`).join("\n"));
  if (results.some(r => r[0] !== "ok")) failed = true;
  await browser.close();
}
await new Promise(r => server.httpServer.close(r));
console.log(failed ? "\nWALKTHROUGH FAILED" : "\nWalkthrough passed in: " + engines.join(", "));
process.exit(failed ? 1 : 0);
