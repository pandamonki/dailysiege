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
function renderTop() {
  if (isLive()) { const ck = liveClock(); document.getElementById("when").innerHTML = `Day <b>${DAY}</b> of 7 · ⏳ Battle in <b>${Math.floor(ck.minsToLock / 60)}h ${String(ck.minsToLock % 60).padStart(2, "0")}m</b> <small>(${hourLabel(LIVE.config.lockHour)})</small>`; }
  else document.getElementById("when").innerHTML = `Day <b>${DAY}</b> of 7 · ⏳ Battle in <b>${countdown()}</b>`;
  const gp = S.gain > 0 ? `<small class="gain" title="Gold received this round">+${S.gain}</small>` : "";
  document.getElementById("purse").innerHTML = `<span title="Gold"><i class="coin"></i><b>${avail()}</b> gold${gp}${reserved() ? ` <small class="muted">${reserved()} offered</small>` : ""}</span><span title="Your hero's level"><span class="star">★</span>Hero <b>Lv ${level()}</b></span><span class="${freePts() ? "hot" : ""}" title="Unspent ability points"><span class="star">✦</span><b>${freePts()}</b> skill pt${freePts() === 1 ? "" : "s"}</span>${underdogChip()}<button class="modechip" data-act="open" data-v="title">${isLive() ? "Friends game" : "Test mode"} ▾</button><span class="icons"><button class="ico" data-act="open" data-v="board" aria-label="Leaderboard" title="Leaderboard">♛</button><button class="ico" data-act="rep" aria-label="Last battle report" title="Last battle">⚔</button><button class="ico" data-act="open" data-v="guide" aria-label="How to play" title="How to play">?</button><button class="ico" data-act="open" data-v="title" aria-label="Menu" title="Menu: continue or new game">☰</button></span>`;
  renderCommands(); return;
  const sb = document.getElementById("sealbtn"); sb.textContent = S.locked ? "Sealed ✓" : "Seal Orders"; sb.className = "plank " + (S.locked ? "sealed" : "wax");
}
function renderCommands() {
  const o = S.phase === "orders";
  document.getElementById("cmdbar").innerHTML = o
    ? `<button class="plank" data-act="phase" data-v="muster">← Muster</button><button class="plank" data-act="open" data-v="orders">War Council</button><button class="plank ${S.locked ? "sealed" : "wax"}" data-act="open" data-v="seal">${S.locked ? "Sealed ✓" : "Seal Orders"}</button>`
    : `<button class="plank" data-act="open" data-v="castle">Castle</button><button class="plank" data-act="open" data-v="champ" data-k="champ">Hero</button><button class="plank wax" data-act="phase" data-v="orders">Orders →</button>`;
}
function renderHint() {
  const h = document.getElementById("hint");
  if (isLive() && LIVE.readOnly) h.innerHTML = "You're watching this game. Ask the host to add you as an Editor to play.";
  else if (S.locked) h.innerHTML = isLive() ? `Orders sealed. The battle is fought at ${hourLabel(LIVE.config.lockHour)}.` : "Orders sealed. The battle plays out at dusk.";
  else if (sel) h.innerHTML = `Place <b>${esc(pieceName(sel))}</b> on a glowing tile <button data-act="cancel">Cancel</button>`;
  else if (S.phase === "orders") h.innerHTML = `<b>Step 2 · Orders.</b> Choose who to attack and who to ally with in the War Council. Tap a soldier to give it its own target.`;
  else h.innerHTML = `<b>Step 1 · Muster.</b> Level your hero, recruit and upgrade at your castle, and place your army. Drag your hero or soldiers to move them. Then tap <b>Orders →</b>.`;
}
function renderTray() {
  const up = unplaced();
  document.getElementById("tray").innerHTML = `<span class="lbl" title="Soldiers you own out of the barracks beds you have built">Units ${S.owned.length}/${S.slots}<small class="muted"> · ${S.owned.filter(u => placedAt(u.id)).length} placed</small></span>` + (up.length
    ? up.map(p => `<button class="chip${sel === p ? " on" : ""}" data-act="pick" data-v="${p}" ${dis()}><img class="${findWall(p) ? "wide" : ""}" alt="" src="${pieceImg(p)}">${esc(pieceName(p).replace(" (your hero)", ""))}</button>`).join("")
    : `<span class="empty">Everyone is on the field.</span>`);
}
