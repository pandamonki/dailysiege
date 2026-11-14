// The Garrison screen (Army sheet): every soldier you own in one pool, and the three reinforcement waves below it.
// Drag a soldier into a wave slot (or tap it, then tap a slot); drag it back to the pool, or tap the cross, to send it to reserve.
const whenLabel = w => w.when === "timer" ? `At ${Math.floor(w.at / 60)}:${String(w.at % 60).padStart(2, "0")}` : { castle_hit: "Castle attacked", castle_low: "Castle below half", hero_dies: "Hero dies", army_dead: "All soldiers die", enemy_hero: "Enemy hero dies", ult: "Any ultimate" }[w.when];
const timeLabel = x => `At ${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`;
const waveStatus = id => { const wi = (S.garrison || []).findIndex(w => w.slots.includes(id)); return wi > -1 ? ["wv", `Wave ${wi + 1}`] : placedAt(id) ? ["dep", "On the map"] : ["res", "Reserve"]; };
function garrisonPopHTML(i) {
  const p = sheet.wpop; if (!p || p.w !== i) return "";
  const w = S.garrison[i], opts = p.kind === "when" ? WAVE_WHEN.map(([k, n]) => [`when:${k}`, n + (k === "timer" ? " …" : ""), w.when === k])
    : p.kind === "time" ? WAVE_TIMES.map(x => [`time:${x}`, timeLabel(x), w.when === "timer" && w.at === x]) : WAVE_ORDERS.map(([k, n, d]) => [`order:${k}`, n, w.order === k, d]);
  return `<div class="gr-pop" role="listbox">${opts.map(([v, n, on, d]) => `<div class="${on ? "on" : ""}" data-act="wopt" data-k="${i}" data-v="${v}" role="option"><span>${n}${d ? `<small>${d}</small>` : ""}</span>${on ? "<em>✓</em>" : ""}</div>`).join("")}</div>`;
}
function garrisonWaveHTML(w, i) {
  const slot = (id, j) => { const u = id && findUnit(id);
    return u ? `<div class="gr-s fill" data-drop="w:${i}:${j}" data-drag="${u.id}" data-act="wslot" data-k="${i}" data-v="${j}" role="button" aria-label="${UNITS[u.type].name} level ${u.lvl}, wave ${i + 1}"><span class="gr-x" data-act="wunslot" data-k="${i}" data-v="${j}" role="button" aria-label="Send back to reserve">✕</span><img alt="" src="${spriteURL(u.type)}"><b>${UNITS[u.type].name}</b><small>Lv ${u.lvl}</small></div>`
      : `<div class="gr-s" data-drop="w:${i}:${j}" data-act="wslot" data-k="${i}" data-v="${j}" role="button" aria-label="Empty slot, wave ${i + 1}"><span>${sheet.tsel && findUnit(sheet.tsel) && !UNITS[findUnit(sheet.tsel).type].castleOnly ? "tap to place" : "empty"}</span></div>`; };
  return `<div class="gr-wrow" data-drop="w:${i}"><div class="gr-wh"><span class="gr-wn" aria-hidden="true"><i></i></span><b>Wave ${i + 1}</b>
      <button class="gr-chip" data-act="wpop" data-k="${i}" data-v="${w.when === "timer" && sheet.wpop && sheet.wpop.w === i && sheet.wpop.kind === "time" ? "time" : "when"}">${whenLabel(w)}</button>
      <button class="gr-chip w" data-act="wpop" data-k="${i}" data-v="order">${WAVE_ORDERS.find(o => o[0] === w.order)[1]}</button></div>
    ${garrisonPopHTML(i)}
    <div class="gr-r4"><div class="gr-s free"><img alt="" src="${spriteURL("footman")}"><b>Footman</b><small>free</small></div>${w.slots.map(slot).join("")}</div></div>`;
}
// the Deployment tab: five rows, each holding the soldiers in that place: on the map, reserve, and the three waves
function deploymentTab() {
  ensureGarrison();
  const sel = sheet.tsel && findUnit(sheet.tsel) ? sheet.tsel : null, placed = S.owned.filter(o => placedAt(o.id)), reserve = S.owned.filter(o => !placedAt(o.id) && !inGarrison(o.id)), freeField = Math.max(0, S.slots - fieldCount());
  const tile = o => `<button class="gr-t${sel === o.id ? " sel" : ""}" data-drag="${o.id}" data-act="tsel" data-v="${o.id}" aria-label="${UNITS[o.type].name} level ${o.lvl}, ${waveStatus(o.id)[1]}"><img alt="" src="${spriteURL(o.type)}"><b>${UNITS[o.type].name}</b><span class="gr-pp">${[1, 2, 3].map(x => `<i class="${x <= o.lvl ? "on" : ""}"></i>`).join("")}</span></button>`;
  const ph = (act, text) => `<button class="gr-t gr-ph" data-act="${act}" ${dis()}><span>${text}</span></button>`;
  const row = (title, count, drop, body) => `<div class="gr-row" data-drop="${drop}"><div class="gr-rh"><b>${title}</b><small>${count}</small></div><div class="gr-r5">${body}</div></div>`;
  return `<div class="gr-sum"><span><b>${fieldCount()}/${S.slots}</b>field</span><span class="y"><b>${garrisonCount()}/${GARRISON_SOLDIERS}</b>waves</span><span><b>${reserve.length}</b>reserve</span></div>
    <p class="muted gr-tip">${S.locked ? "Your orders are sealed. Draft new orders to change this." : "Drag a soldier from one row to another, or tap a soldier then tap where it should go."}</p>
    <div class="gr-waves">
      ${row("Deployed", `${placed.length} on the map`, "dep", placed.map(tile).join("") + (freeField ? [...Array(freeField)].map(() => ph("wdep", "free")).join("") : ph("wdep", "deploy")))}
      ${row("Reserve", `${reserve.length} waiting`, "res", reserve.map(tile).join("") + ph("wres", reserve.length ? "bench" : "empty"))}
      ${S.garrison.map(garrisonWaveHTML).join("")}</div>
    <p class="muted gr-tip">Tap a chip to change when a wave goes or what it does. Waves are at least ${WAVE_GAP}s apart and one is forced out at each minute mark. Training and selling are on the Garrison tab.</p>`;
}
// actions
Object.assign(A, {
  wsend: (v, k) => { if (S.locked) { toast("Draft new orders to change your garrison."); return; } const err = assignWave(v, +k); if (err) toast(err); else toast(`Sent to Wave ${+k + 1}.`); },
  wback: v => { if (S.locked) return; const err = reserveUnit(v); if (err) toast(err); },
  wdep: () => { if (S.locked) { toast("Draft new orders to change your garrison."); return; } if (!sheet.tsel) { toast("Tap a soldier first."); return; } const err = deployUnit(sheet.tsel); if (err) toast(err); },
  wres: () => { if (S.locked) { toast("Draft new orders to change your garrison."); return; } if (!sheet.tsel) { toast("Tap a soldier first."); return; } const err = reserveUnit(sheet.tsel); if (err) toast(err); },
  wpop: (v, k) => { const w = +k; sheet.wpop = sheet.wpop && sheet.wpop.w === w && sheet.wpop.kind === v ? null : { w, kind: v }; },
  wopt: (v, k) => { if (S.locked) return; const w = S.garrison[+k], [kind, val] = v.split(":");
    if (kind === "when") { w.when = val; sheet.wpop = val === "timer" ? { w: +k, kind: "time" } : null; }
    else if (kind === "time") { w.when = "timer"; w.at = +val; sheet.wpop = null; }
    else if (kind === "order") { w.order = val; sheet.wpop = null; } },
  wslot: (v, k) => { if (S.locked) { toast("Draft new orders to change your garrison."); return; } const u = sheet.tsel && findUnit(sheet.tsel);
    if (!u) { toast("Tap a soldier above first, or drag one here."); return; }
    const err = assignWave(u.id, +k, +v); if (err) toast(err); },
  wunslot: (v, k) => { if (S.locked) return; const id = S.garrison[+k].slots[+v]; if (id) { const err = reserveUnit(id); if (err) toast(err); } },
});
// drag and drop: pointer events, so it works with a finger as well as a mouse
(() => {
  let d = null, swallow = false;
  const clear = () => { document.querySelectorAll(".gr-hot").forEach(x => x.classList.remove("gr-hot")); };
  const under = e => { const g = d.ghost; if (g) g.style.visibility = "hidden"; const el = document.elementFromPoint(e.clientX, e.clientY); if (g) g.style.visibility = ""; return el && el.closest("[data-drop]"); };
  const end = () => { if (d && d.ghost) d.ghost.remove(); if (d && d.el) d.el.classList.remove("gr-dragging"); clear(); d = null; };
  document.addEventListener("pointerdown", e => { const t = e.target.closest("[data-drag]"); if (!t || e.target.closest(".gr-x") || (e.pointerType === "mouse" && e.button !== 0)) return; d = { id: t.dataset.drag, x: e.clientX, y: e.clientY, el: t, ghost: null, on: false }; });
  document.addEventListener("pointermove", e => { if (!d) return;
    if (!d.on) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return; d.on = true; d.ghost = d.el.cloneNode(true); d.ghost.classList.add("gr-ghost"); d.ghost.removeAttribute("data-act"); document.body.appendChild(d.ghost); d.el.classList.add("gr-dragging"); }
    d.ghost.style.left = e.clientX - 34 + "px"; d.ghost.style.top = e.clientY - 44 + "px"; clear(); const t = under(e); if (t) t.classList.add("gr-hot"); e.preventDefault(); }, { passive: false });
  document.addEventListener("pointerup", e => { if (!d) return;
    if (d.on) { swallow = true; setTimeout(() => { swallow = false; }, 0); const t = under(e), id = d.id; end();
      if (S.locked) { toast("Draft new orders to change your garrison."); return; }
      if (t) { const [kind, w, j] = t.dataset.drop.split(":"); let err = null;
        if (kind === "dep") err = deployUnit(id); else if (kind === "res") err = reserveUnit(id); else if (kind === "w") err = assignWave(id, +w, j != null ? +j : undefined);
        if (err) toast(err); sheet.tsel = id; render(true); }
    } else end(); });
  document.addEventListener("pointercancel", end);
  document.addEventListener("click", e => { if (swallow) { e.stopPropagation(); e.preventDefault(); } }, true);
})();
