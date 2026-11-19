// The guide: how to play, in five short chapters shown as tabs.
// It is read two ways from the same pages:
//  - the tour (Options > How to play, and a new player's first visit to the planning screen) floats over the planning
//    screen and rings the real button for pages about something already on screen;
//  - the book (new lords read Basics before choosing a hero, from the Muster Hall) is a normal sheet.
// Pages about screens a new player can't see yet (an invitation, a betrayal, the morning report) show a screenshot instead,
// with numbered gold boxes baked in; the numbered lines under it say what each box is. The screenshots live in guide/ and are
// made by tools/guide-shots.mjs: run it again whenever one of those screens changes.
// Exact numbers (prices, pay, limits) belong in the page "i" notes (js/ui/help.js), not here: the guide teaches the ideas.
//
// A page: { sel, t, p, shot, keys, mode }. sel: what to ring on the planning screen in the tour. shot: a file in guide/.
// keys: one line per numbered box in the shot. mode: "tour" or "book" to show the page in only one of them.
const GUIDE = [
  { id: "basics", name: "Basics", pages: [
    { t: "Welcome, m'lord", p: "I am Aldric, your steward. Your friends have declared war. Every evening all the armies march out and fight at once, by themselves. You don't steer the battle: you prepare for it. The war lasts seven days." },
    { t: "Each day", p: "Plan: spend gold, place your army, level your hero and pick your targets. Then seal your orders. The battle is fought at the set time, and you watch it next time you open the game." },
    { mode: "book", t: "Your screen", p: "Everything you plan with is on one screen.", shot: "plan",
      keys: ["The top row: day, gold, your army, the leaderboard and options", "The map: your castle, your army and your rivals", "The unit strip: details of whatever you tap", "The menus: Base, Army, Hero, Orders and Allies", "Seal your orders when you're ready"] },
    { mode: "tour", sel: ".topchips", t: "The top row", p: "Day and countdown, gold, your army, the leaderboard, last night's report and options. Every page has a small i in its corner that says what it's for." },
    { mode: "tour", sel: "#map", t: "The map", p: "Drag to move, pinch to zoom. The home button brings you back to your castle. Your army stands on the glowing ground round it. Nothing can walk through trees." },
    { mode: "tour", sel: ".pdock", t: "The unit strip", p: "Tap a soldier, a castle or a rival to see it here. Tap the strip for full details." },
    { sel: ".sealbar", t: "Seal your orders", p: "When you're ready, seal. The seal screen checks your plan and lets you rehearse the battle. You can change your orders and seal again until the timer runs out." },
  ] },
  { id: "army", name: "Army", pages: [
    { sel: '#cmdbar [data-act="opencastle"][data-v="keep"]', t: "Base", p: "Upgrade your castle for more health, more gold each day and stronger soldiers. Unlock reinforcement waves that march out later in the battle. Under Defences, build walls, traps and towers." },
    { sel: '#cmdbar [data-act="opencastle"][data-v="recruit"]', t: "Army", p: "Recruit soldiers and train them to make them stronger. Four start on the map, and more join in the waves you unlock." },
    { sel: '.topchips [data-act="opencastle"][data-v="recruit"]', t: "Placing soldiers", p: "The shield counts your soldiers on the map. New recruits wait in a strip under the map: tap one, then tap a glowing tile. Tap a soldier on the map to move it." },
  ] },
  { id: "hero", name: "Hero", pages: [
    { sel: '#cmdbar [data-act="openhero"]', t: "Your hero", p: "Your champion for the week. It levels up as enemies fall near it, and each level gives a skill point to spend. The ultimate opens at level 9." },
    { sel: "#shopbtn", t: "The shop", p: "The bag of gold on the edge of the map is the shop. Your hero can carry 6 items. Tap one to read what it does, then Buy." },
  ] },
  { id: "battle", name: "Battle", pages: [
    { sel: '#cmdbar [data-act="openorders"][data-v="ord"]', t: "Orders", p: "Strategy: pick three targets in order and your army's plan. Combat: who each group fights first. Rituals: when your ultimate fires." },
    { t: "The battleground", p: "The hill in the middle of the map is worth fighting for.", shot: "hill", keys: ["Heroes standing on the hill earn extra experience and gold, so expect company"] },
    { t: "Scoring", p: "Each battle ranks every lord, and the higher you finish the more points you get. Slaying heroes and taking castles add more. The most points after seven days wins the war." },
    { t: "The morning report", p: "Next time you open the game, last night's report is waiting.", shot: "report",
      keys: ["Where you finished, with the points, gold and levels you won", "Watch the whole battle, or just the highlights", "How every lord did. Tap one to look closer"] },
    { t: "Watching the battle", p: "The replay plays the battle back.", shot: "replay",
      keys: ["The camera follows your hero. Tap any soldier or hero to see it", "Play, pause and change speed, or open the report and stats"] },
  ] },
  { id: "rivals", name: "Allies", pages: [
    { t: "Contracts and twists", p: "Each day you can take one contract for bonus points and gold. Each day also has a twist: tap the ! above the map to see it.", shot: "contracts",
      keys: ["Today's three contracts: easy, hard and one aimed at a rival", "Today's twist"] },
    { sel: '#cmdbar [data-act="openorders"][data-v="alli"]', t: "Allies", p: "Nobody is allied at the start. You invite a lord, they answer the next day, and the alliance starts at the next battle. Up to 3 lords can ally, and everyone must agree. Allies left standing share the top places." },
    { t: "Sending an invitation", p: "Open Allies and tap Invite next to a lord.", shot: "invite",
      keys: ["Your invitation, with an optional gold dowry. It's only paid if they accept", "Change your mind before the battle with Withdraw", "Invite another lord"] },
    { t: "Answering an invitation", p: "When a lord invites you, it pops up when you next plan.", shot: "answer",
      keys: ["Accept or decline. Any dowry is paid to you if you accept", "Or decide later, in Allies"] },
    { t: "Joining an alliance", p: "Up to 3 lords can ally, and a new lord joins only if everyone in the alliance accepts.", shot: "group",
      keys: ["Each member of your alliance, whether they've accepted, and whether the new lord joins tonight", "Your own answer"] },
    { t: "Breaking and betrayal", p: "Each day you choose what happens to an alliance.", shot: "betray",
      keys: ["Keep it, break it cleanly, or betray them", "Choose the moment. Your hero blows up half their keep, and they will remember"] },
    { t: "The lone wolf", p: "When only one lord is left outside every alliance, they fight on alone with a boost.", shot: "wolf",
      keys: ["Every alliance in the war", "The lords standing alone", "The lone wolf gets 10% more damage and health for each allied lord"] },
    { t: "Mercenary camp", p: "From day 4 you can bid for mercenaries. Bids are secret, and the highest bidder gets the group for one battle.", shot: "camp",
      keys: ["A new, stronger group arrives every day", "The other groups for hire", "Your bid. You only pay if you win"] },
  ] },
];
const guidePages = mode => GUIDE.flatMap(c => c.pages.filter(p => !p.mode || p.mode === mode).map(p => Object.assign({ ch: c.id }, p)));
const guideRead = () => { try { return JSON.parse(localStorage.getItem("ds.guide.read")) || []; } catch (e) { return []; } };
function guideMarkRead(ch) { const r = guideRead(); if (r.includes(ch)) return; r.push(ch); try { localStorage.setItem("ds.guide.read", JSON.stringify(r)); } catch (e) {} }
const guideFind = sel => guidePages("tour").findIndex(p => p.sel === sel);
// the chapter tabs: data-act for the book (a sheet action), data-gch for the tour (wired by hand)
function guideTabsHTML(cur, book) {
  const read = guideRead();
  return `<div class="gtabs" role="tablist">${GUIDE.map(c => `<button role="tab" aria-selected="${c.id === cur}" class="${c.id === cur ? "on" : ""}${read.includes(c.id) ? " read" : ""}" ${book ? `data-act="gch" data-v="${c.id}"` : `data-gch="${c.id}"`}>${read.includes(c.id) ? "✓ " : ""}${c.name}</button>`).join("")}</div>`;
}
function guideShotHTML(pg) {
  if (!pg.shot) return "";
  return `<figure class="gshot"><img src="guide/${pg.shot}.webp" alt="${esc(pg.t)}: ${esc((pg.keys || []).join(". "))}" loading="lazy">
    ${pg.keys && pg.keys.length ? `<ol class="gkeys">${pg.keys.map(k => `<li>${esc(k)}</li>`).join("")}</ol>` : ""}</figure>`;
}
// where a page sits in its chapter, and the label for the Next button
function guidePos(list, i) {
  const pg = list[i], inCh = list.filter(p => p.ch === pg.ch), k = inCh.indexOf(pg), nxt = list[i + 1];
  const ch = GUIDE.find(c => c.id === pg.ch), nch = nxt && nxt.ch !== pg.ch ? GUIDE.find(c => c.id === nxt.ch) : null;
  return { pg, k, n: inCh.length, ch, next: !nxt ? null : nch ? `Next: ${nch.name} →` : "Next →" };
}

// ----- the tour: a floating card over the planning screen -----
function startWizard(force, at) {
  try { if (!force && localStorage.getItem("ds.wizard")) return; localStorage.setItem("ds.wizard", "1"); } catch (e) {}
  const list = guidePages("tour");
  let i = Math.max(0, Math.min(list.length - 1, at || 0)); const old = document.getElementById("wiz"); if (old) old.remove(); document.getElementById("wizring")?.remove();
  const el = document.createElement("div"); el.id = "wiz"; document.body.appendChild(el);
  const ring = document.createElement("div"); ring.id = "wizring"; document.body.appendChild(ring);
  // the highlight is a floating ring that follows the target, so it survives the game redrawing its buttons
  const place = () => { const sel = list[i].sel, tg = sel && document.querySelector(sel), r = tg && tg.getBoundingClientRect();
    if (!r || !r.width) { ring.style.display = "none"; return; }
    Object.assign(ring.style, { display: "block", left: r.left - 4 + "px", top: r.top - 4 + "px", width: r.width + 8 + "px", height: r.height + 8 + "px" }); };
  const timer = setInterval(() => { if (!document.getElementById("wiz")) { clearInterval(timer); ring.remove(); } else place(); }, 250);
  const paint = () => { const { pg, k, n, ch, next } = guidePos(list, i);
    if (k === n - 1) guideMarkRead(ch.id);
    const dots = Array.from({ length: n }, (_, j) => `<i class="${j === k ? "on" : j < k ? "done" : ""}"></i>`).join("");
    el.innerHTML = `<div class="wiz-card${pg.shot ? " wide" : ""}">${guideTabsHTML(ch.id, false)}<div class="wiz-main"><div class="wiz-face"><img alt="" src="${spriteURL("c-mage")}"></div><div class="wiz-msg"><h3>${esc(pg.t)}</h3><p>${esc(pg.p)}</p></div></div>${guideShotHTML(pg)}<div class="wiz-dots">${dots}</div><div class="wiz-row"><small>${k + 1} of ${n}</small><button class="btn small" id="wskip">${next ? "Skip" : "Close"}</button><button class="btn small" id="wback"${i ? "" : " disabled"}>← Back</button><button class="btn wax small" id="wnext">${next || "Done"}</button></div></div>`;
    place(); const tg0 = pg.sel && document.querySelector(pg.sel), r0 = tg0 && tg0.getBoundingClientRect();
    el.style.top = r0 && pg.sel !== "#map" && r0.top < innerHeight * .3 ? Math.round(r0.bottom + 14) + "px" : "70px";
    el.querySelector("#wskip").onclick = end; el.querySelector("#wback").onclick = () => { if (i > 0) { i--; paint(); } };
    el.querySelector("#wnext").onclick = () => { if (i < list.length - 1) { i++; paint(); } else end(); };
    el.querySelectorAll("[data-gch]").forEach(b => { b.onclick = () => { i = Math.max(0, list.findIndex(p => p.ch === b.dataset.gch)); paint(); }; }); };
  function end() { clearInterval(timer); ring.remove(); el.remove(); }
  paint();
}

// ----- the book: the same pages as a sheet. New lords read Basics here before choosing a hero -----
function guideSheet() {
  const first = typeof S !== "undefined" && S && S.ob === 1, list = guidePages("book").filter(p => !first || p.ch === "basics");
  const i = Math.max(0, Math.min(list.length - 1, sheet.pg || 0)), { pg, k, n, ch, next } = guidePos(list, i);
  if (k === n - 1) guideMarkRead(ch.id);
  const dots = Array.from({ length: n }, (_, j) => `<i class="${j === k ? "on" : ""}"></i>`).join("");
  return head(null, "How to play", first ? `Basics · page ${k + 1} of ${n}` : `${ch.name} · page ${k + 1} of ${n}`) + `<div class="body">
    ${first ? "" : guideTabsHTML(ch.id, true)}<h3>${esc(pg.t)}</h3><p>${esc(pg.p)}</p>${guideShotHTML(pg)}
    <div class="dots">${dots}</div>
    ${first && !next ? `<p class="muted">The rest of the guide is in Options, under How to play.</p>` : ""}
    <div class="row"><button class="btn" data-act="gpage" data-v="-1" ${i === 0 ? "disabled" : ""}>← Back</button>${next ? `<button class="btn wood" data-act="gpage" data-v="1">${next}</button>` : `<button class="btn wax" data-act="gdone">${first ? "Choose my hero →" : "Got it"}</button>`}${first ? `<button class="btn small" data-act="gdone">Skip</button>` : ""}</div></div>`;
}
