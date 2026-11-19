// Makes the screenshots in the How to play guide (guide/*.webp): it plays a practice game in a real browser, stages each
// screen a new player can't see yet (an invitation, a betrayal, the mercenary camp, the morning report...), draws numbered
// gold boxes on the parts the guide talks about, and saves a cropped picture. The numbered lines under each picture are in
// js/ui/guide.js, so if you change what a box points at, change its line there too.
//   npm run build && node tools/guide-shots.mjs [name ...]     (no names: every shot)
/* eslint-disable no-undef -- the functions handed to page.evaluate run inside the game page, where these names are its globals */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { preview } from "vite";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = createRequire("/")("playwright"); }

const only = process.argv.slice(2), want = n => !only.length || only.includes(n);
const OUT = "guide"; mkdirSync(OUT, { recursive: true });
const server = await preview({ preview: { port: 4184, strictPort: true, host: "127.0.0.1" }, logLevel: "silent" });
const base = "http://127.0.0.1:4184/";
const browser = await pw.chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = []; page.on("pageerror", e => errors.push(String(e).slice(0, 300)));
const js = (fn, arg) => page.evaluate(fn, arg);
const wait = ms => page.waitForTimeout(ms);

// Draw the numbered boxes, take the picture, clean up. marks: CSS selectors (first visible match) or [selector, "all"] for
// the box round every match, or {x, y, w, h} in screen pixels. clip: "marks" (the boxes plus a margin, full width),
// "sheet" (the open sheet), "screen", or a selector.
async function shot(name, marks, clip = "marks", pad = 14) {
  const rects = await js(([marks, clip, pad]) => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };
    const box = m => { if (m && typeof m === "object" && !Array.isArray(m)) return m;
      const [sel, all] = Array.isArray(m) ? m : [m]; const rs = [...document.querySelectorAll(sel)].map(vis).filter(Boolean);
      if (!rs.length) throw new Error("nothing on screen matches " + sel);
      const use = all ? rs : rs.slice(0, 1), x = Math.min(...use.map(r => r.left)), y = Math.min(...use.map(r => r.top));
      return { x, y, w: Math.max(...use.map(r => r.right)) - x, h: Math.max(...use.map(r => r.bottom)) - y }; };
    const bs = marks.map(box), lay = document.createElement("div"); lay.id = "gshots";
    lay.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    bs.forEach((b, i) => { const g = 3, d = document.createElement("div");
      d.style.cssText = `position:absolute;left:${b.x - g}px;top:${b.y - g}px;width:${b.w + 2 * g}px;height:${b.h + 2 * g}px;border:3px solid #ffd34d;border-radius:10px;box-shadow:0 0 0 2px rgba(0,0,0,.55),0 0 12px 2px rgba(255,211,77,.6)`;
      const n = document.createElement("b"); n.textContent = i + 1;
      n.style.cssText = `position:absolute;left:${Math.max(2, b.x - 12)}px;top:${Math.max(2, b.y - 12)}px;width:24px;height:24px;border-radius:50%;background:#ffd34d;border:2px solid #2b1b0c;color:#2b1b0c;font:800 14px/20px system-ui,sans-serif;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.6)`;
      lay.append(d, n); });
    document.body.appendChild(lay);
    let c;
    if (clip === "screen") c = { x: 0, y: 0, w: innerWidth, h: innerHeight };
    else if (clip === "marks") { const y0 = Math.min(...bs.map(b => b.y)) - pad, y1 = Math.max(...bs.map(b => b.y + b.h)) + pad; c = { x: 0, y: y0, w: innerWidth, h: y1 - y0 }; }
    else { const r = (clip === "sheet" ? document.querySelector("#sheet .sheet, #sheet") : document.querySelector(clip)).getBoundingClientRect(); c = { x: r.left, y: r.top, w: r.width, h: r.height }; }
    const y = Math.max(0, c.y), h = Math.min(innerHeight, c.y + c.h) - y;
    return { x: Math.max(0, c.x), y, width: Math.min(innerWidth, c.w), height: h };
  }, [marks, clip, pad]);
  await wait(150);
  const png = `${OUT}/${name}.png`;
  await page.screenshot({ path: png, clip: rects });
  await js(() => document.getElementById("gshots")?.remove());
  execFileSync("python3", ["-I", "-c", "import sys; from PIL import Image; im = Image.open(sys.argv[1]).convert('RGB'); im.save(sys.argv[2], 'WEBP', quality=72, method=6)", png, `${OUT}/${name}.webp`]);
  execFileSync("rm", [png]);
  console.log("saved", name);
}
// close whatever the game popped up on its own (news, gift spin, invitations...) until the planning screen is clear
const quiet = () => js(() => { for (let i = 0; i < 8; i++) { sheet = null; render(); if (!sheet) break; } document.getElementById("wiz")?.remove(); document.getElementById("wizring")?.remove(); });
const show = async (s, tweak) => { await js(([s, t]) => { sheet = s; if (t) (new Function(t))(); render(false); const b = document.querySelector("#sheet .body"); if (b) b.scrollTop = 0; }, [s, tweak || ""]); await wait(400); };

// a fresh practice game on day 4: mercenaries are open, rivals can invite you, contracts and a twist are on
await page.goto(base);
await page.waitForFunction(() => typeof runBattle === "function", null, { timeout: 30000 });
await js(() => { try { localStorage.clear(); localStorage.setItem("lastbanner.pday", "4"); localStorage.setItem("ds.wizard", "1"); } catch { /* storage blocked: the shots will still work from defaults */ } });
await page.goto(base); await page.waitForFunction(() => typeof runBattle === "function", null, { timeout: 30000 }); await wait(800);
await page.locator('[data-act="testgo"], [data-act="playgo"]').first().click(); await wait(900);
await quiet(); await js(() => { S.gold = 2000; render(); }); await quiet(); await wait(500);

if (want("plan")) await shot("plan", [".topchips", "#map", ".pdock", "#cmdbar", ".sealbar"], "screen");

if (want("hill")) { // the battleground on the map, with a box round the hill
  const r = await js(() => { camTarget = null; cam.z = 1.1; cam.x = (CENTRE + .5) * ts - innerWidth / 2 / cam.z; cam.y = (CENTRE + .5) * ts - 220 / cam.z; clampCam(); render();
    const rc = document.getElementById("map").getBoundingClientRect(), sx = x => rc.left + (x - cam.x) * cam.z, sy = y => rc.top + (y - cam.y) * cam.z;
    return { x: sx((CENTRE - 1.2) * ts), y: sy((CENTRE - 1.2) * ts), w: 3.4 * ts * cam.z, h: 3.4 * ts * cam.z }; });
  await wait(600); await shot("hill", [r], "#map");
  await js(() => home()); await wait(400);
}

if (want("contracts")) { await show({ type: "orders", grp: "ord", tab: "contracts" }); await shot("contracts", [["#sheet .cxcard", "all"], "#sheet .twstrip"], "sheet"); }

const rival = await js(() => RIVALS[0].id), rival2 = await js(() => RIVALS[1].id);
if (want("invite")) {
  await js(() => { Object.values(RIVAL_AI).forEach(a => { delete a.offers; }); });
  await show({ type: "orders", grp: "alli" }, `A.invite(null, ${JSON.stringify(rival)}); A.ogold(1, ${JSON.stringify(rival)}); A.ogold(1, ${JSON.stringify(rival)});`);
  await js(() => document.querySelector("#sheet .stepper")?.scrollIntoView({ block: "center" })); await wait(200);
  await shot("invite", ["#sheet .stepper", '#sheet [data-act="uninvite"]', '#sheet .ally[data-act="invite"]'], "marks", 70);
  await js(r => { delete S.offers[r]; }, rival);
}
if (want("answer")) {
  await js(r => { (RIVAL_AI[r] = RIVAL_AI[r] || {}).offers = { you: { gold: 150 } }; S.declined = {}; S.replies = {}; }, rival2);
  await show({ type: "invites" }); await shot("answer", ["#sheet .invcard .row", '#sheet [data-act="idismiss"]'], "sheet");
  await js(r => { delete RIVAL_AI[r].offers; }, rival2);
}
if (want("group")) { // you and your ally are invited by a third lord; your ally has already accepted
  await js(([r0, r3]) => { Object.values(RIVAL_AI).forEach(a => { delete a.offers; }); S.pairs = [["you", r0].sort().join("|")];
    RIVAL_AI[r3].offers = { you: { gold: 120 }, [r0]: { gold: 120 } }; RIVAL_AI[r0].terms = Object.assign({}, RIVAL_AI[r0].terms, { [r3]: { mode: "accept", min: 100 } }); S.replies = {}; S.declined = {}; }, [rival, await js(() => RIVALS[3].id)]);
  await show({ type: "invites" }); await shot("group", ["#sheet .aans", "#sheet .invcard .row"], "sheet");
  await js(() => { S.pairs = []; Object.values(RIVAL_AI).forEach(a => { delete a.offers; }); });
}
if (want("wolf")) { // every lord but one is in an alliance: that one is the lone wolf
  await js(() => { const id = n => RIVALS[n].id, k = (a, b) => [a, b].sort().join("|"); S.pairs = [k("you", id(0)), k(id(1), id(2)), k(id(2), id(3)), k(id(1), id(3)), k(id(5), id(6))]; });
  await show({ type: "orders", grp: "alli" }); await shot("wolf", ["#sheet .agrid", "#sheet .ateam.solo", "#sheet .note.gold"], "marks", 16);
  await js(() => { S.pairs = []; });
}
if (want("betray")) {
  await show({ type: "orders", grp: "alli" }, `S.pairs = ["you|" + ${JSON.stringify(rival)}]; S.pactAct[${JSON.stringify(rival)}] = "betray";`);
  await js(() => document.querySelector("#sheet .pact")?.scrollIntoView({ block: "center" })); await wait(200);
  await shot("betray", ["#sheet .pact .optrow", '#sheet .pact select'], "#sheet .sec:has(.pact)");
  await js(() => { S.pairs = []; S.pactAct = {}; });
}
if (want("camp")) {
  await show({ type: "camp" }, `const R = mercToday(); A.mbid(1, R.head);`);
  await shot("camp", ["#sheet .mhead", "#sheet .mtiles", "#sheet .stepper.qty"], "sheet");
  await js(() => { S.bids = {}; });
}

if (want("replay") || want("report")) { // fight a real battle, then picture the replay and the report
  await quiet();
  await page.locator(".sealbar").first().click(); await wait(300);
  await page.locator('#sheet [data-act="battle"]').first().click(); await wait(500);
  const go = page.locator("text=To battle"); if (await go.count()) await go.first().click();
  await page.waitForFunction(() => mode === "replay" && replay && replay.res, null, { timeout: 30000 });
  if (want("replay")) { // just before the first hero falls, while the camera follows your hero
    await js(() => { const h = replay.res.hl.find(x => x.kind === "firstblood") || replay.res.hl[0]; replay.time = Math.max(0, (h ? h.t : 30) - 2.5); replay.speed = 1; replay.playing = true; });
    await wait(2000); await js(() => { replay.playing = false; render(); }); await wait(400);
    await shot("replay", ["#map", "#rbar"]);
  }
  await js(() => { replay.time = Math.max(0, replay.res.duration - 1); replay.playing = true; });
  await page.waitForFunction(() => !replay || replay.done, null, { timeout: 60000 });
  await wait(1500);
  for (let i = 0; i < 8; i++) { const c = page.locator('button:has-text("Continue"):visible'); if (await c.count()) { await c.first().click(); await wait(600); } }
  if (want("report")) { await show({ type: "report", id: "practice" }); await shot("report", ["#sheet .rsum", "#sheet .rbtns", ["#sheet .rcard", "all"]], "sheet"); }
}

await browser.close(); server.httpServer.close();
if (errors.length) { console.error("page errors:\n" + errors.join("\n")); process.exitCode = 1; }
