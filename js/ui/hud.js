// Shared UI helpers, toast, top ribbon, hint and tray

// ================= UI =================
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const opts = (list, cur) => list.map(x => `<option value="${esc(x)}"${x === cur ? " selected" : ""}>${esc(String(x).replace(/\bplayers\b/, "lords"))}</option>`).join(""); // saved values keep their old wording; the label says lords
const dis = c => (c || S.locked ? "disabled" : "");
let toastT;
function toast(m, ms) { try { diagLog("toast", m); } catch (e) {} const t = document.getElementById("toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 1900); }
function lockTime() { const t = new Date(); t.setHours(20, 0, 0, 0); if (t <= new Date()) t.setDate(t.getDate() + 1); return t; }
function countdown() { if (isLive()) { const m = liveClock().minsToLock; return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`; } const ms = lockTime() - new Date(); return `${Math.floor(ms / 36e5)}h ${String(Math.floor(ms % 36e5 / 6e4)).padStart(2, "0")}m`; }

function underdogChip() {
  if (!isLive()) return `<span class="under"></span>`;
  const ck = liveClock(), pts = standings(ck.week), ids = rosterFor(ck.week).map(p => p.uid), order = ids.slice().sort((a, b) => (pts[a] || 0) - (pts[b] || 0)), i = order.indexOf(LIVE.uid), g = i > -1 ? catchUpGold(ids.length, i) : 0;
  return g ? `<span class="under" title="The bottom 30% earn extra gold every day to catch up">Catch-up gold +${g}</span>` : `<span class="under"></span>`;
}
function ultChip() {
  if (!ultLearned()) return ["⚡", "Ult", "off", "Ultimate not learned yet"];
  if (ultCooling()) return ["⚡", "1d", "off", "Ultimate recharging, ready tomorrow"];
  return S.ultArm ? ["⚡", "Set", "ok", "Ultimate planned for tonight"] : ["⚡", "Ready", "ok", "Ultimate ready. Plan it in Orders"];
}
const UIIMG = (n, alt = "") => `<img class="ui" alt="${alt}" src="icons/ui/${n}.webp">`;
function renderTop() {
  const un = typeof unplaced === "function" ? unplaced().length : 0, u = ultChip(), pts = freePts();
  const chip = (act, v, ico, val, title, cls = "") => `<button class="chip2 ${cls}" data-act="${act}" ${v != null ? `data-v="${v}"` : ""} aria-label="${title}" title="${title}"><span class="ci">${ico}</span><b${/^[A-Za-z]+$/.test(val) ? ' class="lbl"' : ""}>${val}</b></button>`; // a word under the icon where there's no number, so every chip says what it is
  document.getElementById("chips").innerHTML =
    chip("open", "day", UIIMG("day"), `${DAY}/7`, "Day of the war and battle countdown") +
    chip("open", "gold", UIIMG("gold"), avail(), "Gold and tomorrow's income") +
    chip("opencastle", "recruit", UIIMG("units"), `${armyCount()}/${armyRoom()}${un ? `<sup class="dot">${un}</sup>` : ""}`, un ? `${un} soldier${un === 1 ? "" : "s"} still to place` : "Soldiers, out of the room on the field and in unlocked waves", un ? "hot" : "") +
    chip("ulti", null, UIIMG("ultimate"), u[1], u[3], u[2]) +
    chip("open", "board", UIIMG("board"), "Board", "Leaderboard") +
    chip("rep", null, UIIMG("report"), "Report", "Last battle report") +
    chip("open", "title", UIIMG("options"), "Menu", "Options and menu");
  renderCommands(); return;
  const sb = document.getElementById("sealbtn"); sb.textContent = S.locked ? "Sealed ✓" : "Seal Orders"; sb.className = "plank " + (S.locked ? "sealed" : "wax");
}
function renderCommands() {
  const o = S.phase === "orders";
  const seal = `<button class="sealbar ${S.locked ? "sealed" : "wax"}" data-act="open" data-v="seal"><b>${S.locked ? "ORDERS SEALED ✓" : S.sealedSnap && isLive() ? "SEAL NEW ORDERS" : "SEAL ORDERS"}</b><small>${S.locked ? "battle in " + countdown() + " · tap to review" : S.sealedSnap && isLive() ? "sealed orders stand until then" : "battle in " + countdown()}</small></button>`;
  const nb = (act, v, ico, label, extra = "") => `<button class="nb2" data-act="${act}" ${v != null ? `data-v="${v}"` : ""}><span class="ni">${ico}</span><span>${label}${extra}</span></button>`;
  document.getElementById("cmdbar").innerHTML = nb("opencastle", "keep", UIIMG("base"), "Base") + nb("opencastle", "recruit", UIIMG("army"), "Army") + nb("openhero", null, S.cls ? UIIMG("hero_" + S.cls) : "🧙", "Hero", freePts() ? `<sup class="dot">${freePts()}</sup>` : "") + nb("openorders", "ord", UIIMG("orders"), "Orders", cxOpen() ? `<sup class="dot">!</sup>` : "") + nb("openorders", "alli", UIIMG("allies"), "Allies") + seal;
}
function renderCamp() {
  const b = document.getElementById("campbtn"); if (!b) return;
  let show = false, n = 0, fresh = false;
  try { show = !!S && mode === "plan" && mercOpen() && !(isLive() && LIVE.readOnly); n = show ? myBids().length : 0; fresh = show && S.mercSeen !== mercSeenKey(); } catch (e) {}
  b.hidden = !show; b.classList.toggle("pulse", fresh);
  const sb = document.getElementById("shopbtn"); if (sb) sb.hidden = !(S && mode === "plan" && !(isLive() && LIVE.readOnly));
  const gb = document.getElementById("giftbtn"); if (gb) gb.hidden = !(S && S.spin && !spinStale() && mode === "plan" && !(isLive() && LIVE.readOnly));
  const bd = b.querySelector(".cbadge"); bd.hidden = !n; bd.textContent = n;
  // the Daily Noticeboard (the ! above the map): the next battle's twist, the alliance changes at the last battle, and
  // buttons to the day's contracts and targets. It pulses each new day, and until a contract and a target are picked.
  const tb = document.getElementById("twistbtn"), tp = document.getElementById("twistpop"); let on = false, tw = null;
  try { on = !!S && mode === "plan" && !S.lobbyPrep; tw = on && contractsOn() ? myTwist() : null; } catch (e) {}
  if (tb) { tb.hidden = !on; tb.classList.toggle("fresh", on && (S.twSeen !== planDayKey() || cxOpen() || (!S.locked && !targetsReady()))); }
  if (tp) { tp.hidden = !(on && TWIST_POP); if (!tp.hidden) tp.innerHTML = noticeboardHTML(tw); }
}
function noticeboardHTML(tw) {
  const lk = S.locked || (isLive() && LIVE.readOnly), c = contractParse(S.contract);
  let ally = ""; try { const ev = lastAllyChanges(); if (ev) { const { byId, me } = knownAlliances(), line = allyLineFn(byId, me);
    ally = `<div class="nbsec"><small>Alliances since the last battle</small>${ev.length ? `<ul>${ev.map(e => `<li>${line(e)}</li>`).join("")}</ul>` : `<p class="muted">No changes.</p>`}</div>`; } } catch (e) {}
  const cx = myOffers().length ? `<button class="btn small ${c || lk ? "wood" : "wax"}" data-act="opentoday">${c ? `Daily Contract: ${esc(c.c.name)}` : "Daily Contract"}</button>` : "";
  const tgOk = targetsReady(), tgb = `<button class="btn small ${tgOk || lk ? "wood" : "wax"}" data-act="sealgo" data-v="strategy">${tgOk ? `Daily Target ✓ (${S.lists.hostile.length})` : "Daily Target"}</button>`;
  const day1 = (isLive() ? liveClock().dayNo : DAY) <= 1, eff = day1 ? `<p class="nbwel"><b>Welcome to the first day of the war!</b> Set your castle, raise your army and seal your orders. The daily effects begin tomorrow.</p>` : tw ? twistStripHTML(false, true) : "";
  return `<h3 class="nbh">Daily Noticeboard</h3>${eff}${ally}<div class="twcx">${cx}${tgb}</div><small class="muted">Tap anywhere to close</small>`;
}
// a day of this war that passed without a battle (the server counted fewer than two lords): said plainly instead of leaving lords waiting
function skippedNote() { if (!isLive() || !LIVE.config) return ""; const ck = liveClock(), sk = (LIVE.config.skipDays || []).filter(d => d === addDays(ck.planDay, -1) && !LIVE.battles[d]); // only the last day, so it never crowds out the usual hints for long
  return sk.length ? `No battle was fought on day ${weekdayOf(sk[0])}: the server counted fewer than two lords.${window.DS && DS.isHost() ? ` <button data-act="dsresolve">Check</button>` : ""}` : ""; }
function renderHint() {
  renderCamp();
  const h = document.getElementById("hint");
  if (isLive() && LIVE.readOnly) h.innerHTML = "You're watching this game. Ask the host to add you as an Editor to play.";
  else if (skippedNote()) h.innerHTML = skippedNote();
  else if (battlePending()) h.innerHTML = `Last night's battle is being fought… results arrive within a few minutes.${window.DS && DS.isHost() ? ` <button data-act="dsresolve">Resolve now</button>` : ""}`;
  else if (S.locked) h.innerHTML = isLive() ? `Orders sealed. The battle is fought at ${lockLabel(LIVE.config)}.` : "Orders sealed. The battle plays out at dusk.";
  else if (WALL_BUILD) h.innerHTML = `Building walls: tap a glowing tile (${WALL_COST}g each, ${S.walls.length} of ${wallLimit(ctNow())}) <button data-act="wturn">Turn ${WALL_BUILD.dir === "h" ? "│" : "─"}</button> <button data-act="wdone">Done</button>`;
  else if (sel) h.innerHTML = `Place <b>${esc(pieceName(sel))}</b> on a glowing tile <button data-act="cancel">Cancel</button>`;
  else h.innerHTML = "";
}
function renderTray() { // only the pieces still waiting to be placed; the army count lives on the top bar
  const up = unplaced(), t = document.getElementById("tray");
  t.innerHTML = up.map(p => `<button class="chip${sel === p ? " on" : ""}" data-act="pick" data-v="${p}" ${dis()}><img class="${findWall(p) ? "wide" : ""}" alt="" src="${pieceImg(p)}">${esc(pieceName(p).replace(" (your hero)", ""))}</button>`).join("");
  t.classList.toggle("none", !up.length);
}
