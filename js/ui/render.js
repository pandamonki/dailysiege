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
    title: titleSheet, board: boardSheet, report: () => reportSheet(sheet.id), guide: guideSheet, spells: spellsSheet, wall: () => wallSheet(sheet.id),
    council: councilSheet, uorder: () => uorderSheet(sheet.id), game: gameSheet, orders: ordersSheet, seal: sealSheet, results: resultsSheet, lab: labSheet, deploy: () => deploySheet(sheet.id) }[sheet.type]();
  p.innerHTML = html; sh.hidden = veil.hidden = false; sh.classList.toggle("splash", sheet.type === "title" && sheet.tab !== "test");
  const b = p.querySelector(".body"); if (b && sheet.keep) b.scrollTop = scroll;
}
function render(keepScroll = true) {
  if (sheet) sheet.keep = keepScroll;
  const rp = mode === "replay";
  document.getElementById("hint").hidden = rp; document.getElementById("tray").hidden = rp;
  document.getElementById("rbar").hidden = !rp; document.getElementById("commands").hidden = rp;
  renderTop(); renderHint(); renderTray(); renderSheet(); save();
  try { MUSIC.sync(); } catch (e) {}
}
function open(type, id) { sheet = { type, id }; render(false); }
function close() { sheet = null; if (mode === "plan") reportBack = null; render(); }
