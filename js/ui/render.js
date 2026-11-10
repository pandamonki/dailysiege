// render(), open() and close()

// A dropdown whose list is open closes if the sheet is rebuilt underneath it, and in the friends game the sheet
// is rebuilt whenever the shared game data changes (any player saving, every 30 seconds). So from the moment a
// dropdown on a sheet is pressed until an option is picked or it loses focus, sheet redraws wait, then catch up.
let heldSelect = null, sheetBehind = false;
function releaseSelect() { if (!heldSelect) return; heldSelect = null; if (sheetBehind) { sheetBehind = false; renderSheet(); } }
document.addEventListener("pointerdown", e => { const s = e.target.closest && e.target.closest("#sheet select"); heldSelect = s && !s.disabled ? s : null; }, true);
document.addEventListener("change", e => { if (e.target === heldSelect) { heldSelect = null; sheetBehind = false; } }, true); // the change handler re-renders anyway
document.addEventListener("focusout", e => { if (e.target === heldSelect) setTimeout(releaseSelect); }, true);
document.addEventListener("keydown", e => { if (heldSelect && (e.key === "Escape" || e.key === "Tab")) setTimeout(releaseSelect); }, true);

function renderSheet() {
  { const ae = document.activeElement; if (ae && (ae.id === "mynick" || ae.id === "myreal") && !document.getElementById("lobby")?.contains(ae)) return; } // don't wipe a name being typed
  if (heldSelect && sheet && document.contains(heldSelect)) { sheetBehind = true; return; } // don't close a dropdown that's open
  const sh = document.getElementById("sheet"), veil = document.getElementById("veil");
  if (!sheet) { sh.hidden = veil.hidden = true; return; }
  const p = document.getElementById("paper"), scroll = p.querySelector(".body")?.scrollTop || 0;
  const html = { castle: castleSheet, champ: champSheet, unit: () => unitSheet(sheet.id), trap: () => trapSheet(sheet.id), rival: () => rivalSheet(sheet.id),
    title: titleSheet, patch: patchSheet, gold: goldSheet, day: daySheet, board: boardSheet, report: () => reportSheet(sheet.id), invites: inviteSheet, whatsnew: newsSheet, camp: campSheet, guide: guideSheet, spells: spellsSheet, wall: () => wallSheet(sheet.id),
    council: councilSheet, uorder: () => uorderSheet(sheet.id), game: gameSheet, orders: ordersSheet, seal: sealSheet, results: resultsSheet, lab: labSheet, deploy: () => deploySheet(sheet.id) }[sheet.type]();
  p.innerHTML = html; sh.hidden = veil.hidden = false; sh.classList.toggle("splash", sheet.type === "title" && sheet.tab !== "test");
  const b = p.querySelector(".body"); if (b && sheet.keep) b.scrollTop = scroll;
}
function render(keepScroll = true) {
  try { if (mode === "plan" && !sheet && !reportBack && !document.getElementById("wizring") && S && !S.ob) { if (inviteDue()) { S.invSeen = planDayKey(); sheet = { type: "invites" }; } else if (newsDue()) { sheet = { type: "whatsnew" }; } else if (mercDue()) { S.mercSeen = isLive() ? liveClock().week : "p"; sheet = { type: "camp", news: true }; } } } catch (e) {}
  if (sheet) sheet.keep = keepScroll;
  const rp = mode === "replay";
  document.getElementById("hint").hidden = rp; document.getElementById("tray").hidden = rp;
  document.getElementById("rbar").hidden = !rp; document.getElementById("commands").hidden = rp;
  renderTop(); renderHint(); renderTray(); renderSheet(); save();
  try { MUSIC.sync(); } catch (e) {}
}
let wizCtx = null; // the screen the player was on before opening Options, so the tour can start there
function open(type, id) { if (type === "title" && sheet && sheet.type !== "title") wizCtx = { type: sheet.type, grp: sheet.grp, tab: sheet.tab }; else if (type !== "title") wizCtx = null; sheet = { type, id }; render(false); }
function wizStartStep() { const c = wizCtx; wizCtx = null; if (!c) return Math.max(0, WIZARD.findIndex(w => w[0] === "#map"));
  const find = sel => WIZARD.findIndex(w => w[0] === (sel.startsWith("[") ? "#cmdbar " + sel : sel));
  const k = c.type === "castle" ? (c.grp === "army" || c.tab === "recruit" || c.tab === "train" ? '[data-act="opencastle"][data-v="recruit"]' : '[data-act="opencastle"][data-v="keep"]')
    : c.type === "champ" ? '[data-act="openhero"]' : c.type === "orders" ? (c.grp === "alli" ? '[data-act="openorders"][data-v="alli"]' : '[data-act="openorders"][data-v="ord"]')
    : ["gold", "day", "board", "rep"].includes(c.type) ? ".topchips" : null;
  const i = k ? find(k) : find("#map"); return i < 0 ? 0 : i; }
function close() { sheet = null; if (mode === "plan") reportBack = null; render(); }
