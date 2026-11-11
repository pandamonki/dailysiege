// Shared UI helpers, toast, top ribbon, hint and tray

// ================= UI =================
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const opts = (list, cur) => list.map(x => `<option${x === cur ? " selected" : ""}>${esc(x)}</option>`).join("");
const dis = c => (c || S.locked ? "disabled" : "");
let toastT;
function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 1900); }
function lockTime() { const t = new Date(); t.setHours(20, 0, 0, 0); if (t <= new Date()) t.setDate(t.getDate() + 1); return t; }
function countdown() { if (isLive()) { const m = liveClock().minsToLock; return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`; } const ms = lockTime() - new Date(); return `${Math.floor(ms / 36e5)}h ${String(Math.floor(ms % 36e5 / 6e4)).padStart(2, "0")}m`; }

function underdogChip() {
  if (!isLive()) return `<span class="under"></span>`;
  const ck = liveClock(), pts = standings(ck.week), ids = rosterFor(ck.week).map(p => p.uid), order = ids.slice().sort((a, b) => (pts[a] || 0) - (pts[b] || 0)), i = order.indexOf(LIVE.uid), g = i > -1 ? catchUpGold(ids.length, i) : 0;
  return g ? `<span class="under" title="The bottom 30% earn extra gold every day to catch up">Catch-up gold +${g}</span>` : `<span class="under"></span>`;
}
function ultChip() {
  if (!(S.ranks && S.ranks.ult)) return ["⚡", "–", "off", "Ultimate not learned yet"];
  if (ultCooling()) return ["⚡", "1d", "off", "Ultimate recharging, ready tomorrow"];
  return S.ultArm ? ["⚡", "Set", "ok", "Ultimate planned for tonight"] : ["⚡", "Rdy", "ok", "Ultimate ready. Plan it in Orders"];
}
const UIIMG = (n, alt = "") => `<img class="ui" alt="${alt}" src="icons/ui/${n}.webp">`;
function renderTop() {
  const un = typeof unplaced === "function" ? unplaced().length : 0, u = ultChip(), pts = freePts();
  const chip = (act, v, ico, val, title, cls = "") => `<button class="chip2 ${cls}" data-act="${act}" ${v != null ? `data-v="${v}"` : ""} aria-label="${title}" title="${title}"><span class="ci">${ico}</span><b>${val}</b></button>`;
  document.getElementById("chips").innerHTML =
    chip("open", "day", UIIMG("day"), `${DAY}/7`, "Day of the war and battle countdown") +
    chip("open", "gold", UIIMG("gold"), avail(), "Gold and tomorrow's income") +
    chip("opencastle", "recruit", UIIMG("units"), `${S.owned.length}/${S.slots}${un ? `<sup class="dot">${un}</sup>` : ""}`, un ? `${un} soldier${un === 1 ? "" : "s"} still to place` : "Soldiers and supply", un ? "hot" : "") +
    chip("ulti", null, UIIMG("ultimate"), u[1], u[3], u[2]) +
    chip("open", "board", UIIMG("board"), "", "Leaderboard") +
    chip("rep", null, UIIMG("report"), "", "Last battle report") +
    chip("open", "title", UIIMG("options"), "", "Options and menu");
  renderCommands(); return;
  const sb = document.getElementById("sealbtn"); sb.textContent = S.locked ? "Sealed ✓" : "Seal Orders"; sb.className = "plank " + (S.locked ? "sealed" : "wax");
}
function renderCommands() {
  const o = S.phase === "orders";
  const seal = `<button class="sealbar ${S.locked ? "sealed" : "wax"}" data-act="open" data-v="seal"><b>${S.locked ? "ORDERS SEALED ✓" : "SEAL ORDERS"}</b><small>${S.locked ? "tap to review" : "battle in " + countdown()}</small></button>`;
  const nb = (act, v, ico, label, extra = "") => `<button class="nb2" data-act="${act}" ${v != null ? `data-v="${v}"` : ""}><span class="ni">${ico}</span><span>${label}${extra}</span></button>`;
  document.getElementById("cmdbar").innerHTML = nb("opencastle", "keep", UIIMG("base"), "Base") + nb("opencastle", "recruit", UIIMG("army"), "Army") + nb("openhero", null, S.cls ? UIIMG("hero_" + S.cls) : "🧙", "Hero", freePts() ? `<sup class="dot">${freePts()}</sup>` : "") + nb("openorders", "ord", UIIMG("orders"), "Orders") + nb("openorders", "alli", UIIMG("allies"), "Allies") + seal;
}
function renderCamp() {
  const b = document.getElementById("campbtn"); if (!b) return;
  let show = false, n = 0, fresh = false;
  try { show = !!S && mode === "plan" && mercOpen() && !(isLive() && LIVE.readOnly); n = show ? myBids().length : 0; fresh = show && S.mercSeen !== (isLive() ? liveClock().week : "p"); } catch (e) {}
  b.hidden = !show; b.classList.toggle("pulse", fresh);
  const bd = b.querySelector(".cbadge"); bd.hidden = !n; bd.textContent = n;
}
function renderHint() {
  renderCamp();
  const h = document.getElementById("hint");
  if (isLive() && LIVE.readOnly) h.innerHTML = "You're watching this game. Ask the host to add you as an Editor to play.";
  else if (battlePending()) h.innerHTML = `Last night's battle is being fought… results arrive within a few minutes.${window.DS && DS.isHost() ? ` <button data-act="dsresolve">Resolve now</button>` : ""}`;
  else if (S.locked) h.innerHTML = isLive() ? `Orders sealed. The battle is fought at ${lockLabel(LIVE.config)}.` : "Orders sealed. The battle plays out at dusk.";
  else if (sel) h.innerHTML = `Place <b>${esc(pieceName(sel))}</b> on a glowing tile <button data-act="cancel">Cancel</button>`;
  else h.innerHTML = "";
}
function renderTray() {
  const up = unplaced();
  document.getElementById("tray").innerHTML = `<span class="lbl" title="Soldiers you own out of the supply you have built">Units ${S.owned.length}/${S.slots}<small class="muted"> · ${S.owned.filter(u => placedAt(u.id)).length} placed</small></span>` + (up.length
    ? up.map(p => `<button class="chip${sel === p ? " on" : ""}" data-act="pick" data-v="${p}" ${dis()}><img class="${findWall(p) ? "wide" : ""}" alt="" src="${pieceImg(p)}">${esc(pieceName(p).replace(" (your hero)", ""))}</button>`).join("")
    : `<span class="empty">Everyone is on the field.</span>`);
}
