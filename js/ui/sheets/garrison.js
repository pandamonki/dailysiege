// The Garrison screen (Army sheet): every soldier you own in one pool, and the three reinforcement waves below it.
// Drag a soldier into a wave slot (or tap it, then tap a slot); drag it back to the pool, or tap the cross, to send it to reserve.
const whenLabel = w => w.when === "timer" ? `At ${Math.floor(w.at / 60)}:${String(w.at % 60).padStart(2, "0")}` : { castle_hit: waveV4Now() ? "Enemies at my castle" : "Castle attacked", castle_low: "Castle below half", hero_dies: "Hero dies", army_dead: "All soldiers die", enemy_hero: "Enemy hero dies", ult: "Any ultimate" }[w.when];
const waveDeadline = i => (waveV3Now() ? WAVE_FORCE_AT[i] : null); // the latest a wave can go (waves v3), else null
const whenLabelAt = (w, i) => { const dl = waveDeadline(i); return dl != null && w.when === "timer" && w.at >= dl ? timeLabel(dl) : whenLabel(w); };
const timeLabel = x => `At ${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`;
const waveStatus = id => { const wi = (S.garrison || []).findIndex(w => w.slots.includes(id)); return wi > -1 ? ["wv", `Wave ${wi + 1}`] : placedAt(id) ? ["dep", "On the map"] : ["res", "Reserve"]; };
function garrisonPopHTML(i) {
  const p = sheet.wpop; if (!p || p.w !== i) return "";
  const w = S.garrison[i], opts = p.kind === "when" ? WAVE_WHEN.map(([k, n]) => [`when:${k}`, (k === "castle_hit" && waveV4Now() ? "When enemies reach my castle" : n) + (k === "timer" ? " …" : ""), w.when === k, k === "castle_hit" && waveV4Now() ? `Any enemy within ${WAVE_NEAR_R} tiles, or the castle is hit` : ""])
    : p.kind === "time" ? WAVE_TIMES.filter(x => waveDeadline(i) == null || x < waveDeadline(i)).map(x => [`time:${x}`, timeLabel(x), w.when === "timer" && w.at === x]) : WAVE_ORDERS.map(([k, n, d]) => [`order:${k}`, n, w.order === k, d]);
  const dl = waveDeadline(i), lead = dl != null ? `<p class="gr-poplead">Wave ${i + 1} goes ${p.kind === "time" ? "at the time you pick" : "when this happens"}, or at <b>${timeLabel(dl).slice(3)}</b> if that hasn't happened yet.</p>` : "";
  return `<div class="gr-pop" role="listbox">${lead}${opts.map(([v, n, on, d]) => `<div class="${on ? "on" : ""}" data-act="wopt" data-k="${i}" data-v="${v}" role="option"><span>${n}${d ? `<small>${d}</small>` : ""}</span>${on ? "<em>✓</em>" : ""}</div>`).join("")}</div>`;
}
function garrisonWaveHTML(w, i) {
  const slot = (id, j) => { const u = id && findUnit(id);
    return u ? `<div class="gr-s fill" data-drop="w:${i}:${j}" data-drag="${u.id}" data-act="wslot" data-k="${i}" data-v="${j}" role="button" aria-label="${UNITS[u.type].name} level ${u.lvl}, wave ${i + 1}"><span class="gr-x" data-act="wunslot" data-k="${i}" data-v="${j}" role="button" aria-label="Send back to reserve">✕</span><img alt="" src="${spriteURL(u.type)}"><b>${UNITS[u.type].name}</b><small>Lv ${u.lvl}</small></div>`
      : `<div class="gr-s" data-drop="w:${i}:${j}" data-act="wslot" data-k="${i}" data-v="${j}" role="button" aria-label="Empty slot, wave ${i + 1}"><span>${sheet.tsel && findUnit(sheet.tsel) && !UNITS[findUnit(sheet.tsel).type].castleOnly ? "tap to place" : "empty"}</span></div>`; };
  return `<div class="gr-wrow" data-drop="w:${i}"><div class="gr-wh"><span class="gr-wn" aria-hidden="true"><i></i></span><b>Wave ${i + 1}</b>
      <button class="gr-chip" data-act="wpop" data-k="${i}" data-v="${w.when === "timer" && sheet.wpop && sheet.wpop.w === i && sheet.wpop.kind === "time" ? "time" : "when"}" ${dis()}>${whenLabelAt(w, i)}</button>${waveDeadline(i) != null && !(w.when === "timer" && w.at >= waveDeadline(i)) ? `<span class="gr-dl" title="If its trigger hasn't happened by then, Wave ${i + 1} goes at ${timeLabel(waveDeadline(i)).slice(3)}"><em>or</em><i class="sw" aria-hidden="true"></i>${timeLabel(waveDeadline(i)).slice(3)}</span>` : ""}
      ${waveV2Now() ? "" : `<button class="gr-chip w" data-act="wpop" data-k="${i}" data-v="order" ${dis()}>${WAVE_ORDERS.find(o => o[0] === w.order)[1]}</button>`}</div>
    ${zoneV1Now() && waveOpen(i) ? `<div class="gr-zone" role="radiogroup" aria-label="Where Wave ${i + 1} goes">${ZONES.map(z => `<button class="${(ZONES.includes(w.zone) ? w.zone : "front") === z ? "on" : ""}" data-act="wzone" data-k="${i}" data-v="${z}" role="radio" aria-checked="${(ZONES.includes(w.zone) ? w.zone : "front") === z}" ${dis()}><i style="background:${ZONE_COL[z]}"></i>${ZONE_INFO[z][0]}</button>`).join("")}</div>` : ""}
    ${waveV2Now() ? `<button class="gr-rush${w.rush !== false ? " on" : ""}" data-act="wrush" data-k="${i}" role="checkbox" aria-checked="${w.rush !== false}" ${dis()}><i aria-hidden="true"></i><span>Rush out if my castle drops <small>below 75%, 50% or 25% health</small></span></button>` : ""}
    ${garrisonPopHTML(i)}
    <div class="gr-r4"><div class="gr-s free${waveOpen(i) ? "" : " lk"}" title="Every wave brings a free Footman"><img alt="" src="${spriteURL("footman")}"><b>Footman</b><small>${waveOpen(i) ? "free" : "free once open"}</small></div>${waveOpen(i) ? w.slots.map(slot).join("")
      : `<div class="gr-lock">${i === wavesOpen() ? `<button class="btn small wax" data-act="wunlock" ${dis(avail() < waveUnlockCost())}>🔒 Unlock ${WAVE_SLOTS} slots · ${waveUnlockCost()}g</button>` : `<span>🔒 Unlock Wave ${i} first</span>`}</div>`}</div></div>`;
}
// the castle guard: one soldier on the field whose order is to stay home (the "guard" order the battle already knows)
function guardOf() { const ids = Object.keys(S.uorders || {}).filter(k => S.uorders[k] === "guard"), keep = ids.find(k => findUnit(k) && placedAt(k)) || null;
  ids.forEach(k => { if (k !== keep) delete S.uorders[k]; }); return keep; }
function guardUnit(id) {
  const u = findUnit(id); if (!u) return "No such soldier."; if (UNITS[u.type].engine) return `A ${UNITS[u.type].name} can't guard the castle.`;
  const err = deployUnit(id); if (err) return err;
  Object.keys(S.uorders).forEach(k => { if (S.uorders[k] === "guard") delete S.uorders[k]; }); S.uorders[id] = "guard"; return null;
}
const unguard = id => { if (S.uorders && S.uorders[id] === "guard") delete S.uorders[id]; };
// the Deployment tab: five rows, each holding the soldiers in that place: on the map, reserve, and the three waves
function deploymentTab() {
  ensureGarrison();
  const sel = sheet.tsel && findUnit(sheet.tsel) ? sheet.tsel : null, placed = S.owned.filter(o => placedAt(o.id)), reserve = S.owned.filter(o => !placedAt(o.id) && !inGarrison(o.id)), freeField = Math.max(0, S.slots - fieldCount());
  const tile = o => `<button class="gr-t${sel === o.id ? " sel" : ""}" data-drag="${o.id}" data-act="tsel" data-v="${o.id}" aria-label="${UNITS[o.type].name} level ${o.lvl}, ${waveStatus(o.id)[1]}"><img alt="" src="${spriteURL(o.type)}"><b>${UNITS[o.type].name}</b><span class="gr-pp">${[1, 2, 3].map(x => `<i class="${x <= o.lvl ? "on" : ""}"></i>`).join("")}</span></button>`;
  const ph = (act, text) => `<button class="gr-t gr-ph" data-act="${act}" ${dis()}><span>${text}</span></button>`;
  const row = (title, count, drop, body) => `<div class="gr-row" data-drop="${drop}"><div class="gr-rh"><b>${title}</b><small>${count}</small></div><div class="gr-r5">${body}</div></div>`;
  const guard = guardOf(), attackers = placed.filter(o => o.id !== guard);
  const gslot = guard ? tile(findUnit(guard)).replace('class="gr-t', 'class="gr-t guard').replace('"><img', '" data-drop="guard"><span class="gtag">🏰 Guard</span><img')
    : `<button class="gr-t gr-ph guard empty" data-act="wguard" data-drop="guard" ${dis()} aria-label="Castle guard slot"><span>🏰<br>guard</span></button>`;
  return `<div class="gr-sum"><span><b>${fieldCount()}/${S.slots}</b>field</span><span class="y"><b>${garrisonCount()}/${garrisonCap()}</b>waves</span><span><b>${reserve.length}</b>reserve</span></div>
    <p class="muted gr-tip">${S.locked ? "Your orders are sealed. Draft new orders to change this." : "Drag a soldier from one row to another, or tap a soldier then tap where it should go."}</p>
    <div class="gr-waves">
      ${row("On the field", `${guard ? "1 guard · " : ""}${attackers.length} attack${attackers.length === 1 ? "s" : ""}`, "dep", gslot + attackers.map(tile).join("") + (freeField ? [...Array(freeField)].map(() => ph("wdep", "free")).join("") : ph("wdep", "deploy")))}
      ${row("Reserve", `${reserve.length} waiting`, "res", reserve.map(tile).join("") + ph("wres", reserve.length ? "bench" : "empty"))}
      ${S.garrison.map(garrisonWaveHTML).join("")}</div>
    <p class="muted gr-tip">The guard stays home and defends your castle all battle. It is one of your ${FIELD_MAX} soldiers on the field. Drag it back among the attackers to send it out again.</p>
    <p class="muted gr-tip">${waveV2Now() ? `${waveV3Now() ? `Each wave goes when its trigger happens, or at the time on its stopwatch, whichever comes first. Tap the trigger to change it.` : `Tap a wave's chip to change when it goes. One wave is forced out at each minute mark.`} Each wave first clears enemies near your castle, then follows your army plan. Waves are at least ${balV5Now() ? WAVE_GAP_V5 : WAVE_GAP}s apart; if your castle drops below 75%, 50% or 25% health, the next wave with its Rush box ticked goes out early${balV5Now() ? "" : `, at least ${WAVE_EMERGENCY_GAP}s after the last`}. Untick a wave to keep it for its own trigger.` : `Tap a chip to change when a wave goes or what it does. Waves are at least ${WAVE_GAP}s apart and one is forced out at each minute mark.`} Training and selling are on the Train tab.</p>`;
}
// actions
Object.assign(A, {
  wsend: (v, k) => { if (S.locked) { toast("Draft new orders to change your army."); return; } const err = assignWave(v, +k); if (err) toast(err); else toast(`Sent to Wave ${+k + 1}.`); },
  wback: v => { if (S.locked) return; const err = reserveUnit(v); if (err) toast(err); },
  wdep: () => { if (S.locked) { toast("Draft new orders to change your army."); return; } if (!sheet.tsel) { toast("Tap a soldier first."); return; } const err = deployUnit(sheet.tsel); if (err) toast(err); else unguard(sheet.tsel); },
  wguard: () => { if (S.locked) { toast("Draft new orders to change your army."); return; } if (!sheet.tsel) { toast("Tap a soldier first, then the guard slot."); return; } const err = guardUnit(sheet.tsel); if (err) toast(err); else toast("This soldier will guard your castle."); },
  wres: () => { if (S.locked) { toast("Draft new orders to change your army."); return; } if (!sheet.tsel) { toast("Tap a soldier first."); return; } const err = reserveUnit(sheet.tsel); if (err) toast(err); },
  wrush: (v, k) => { if (S.locked) { toast("Draft new orders to change your army."); return; } const w = S.garrison[+k]; if (!w) return; w.rush = w.rush === false; },
  wpop: (v, k) => { if (S.locked) return; const w = +k; sheet.wpop = sheet.wpop && sheet.wpop.w === w && sheet.wpop.kind === v ? null : { w, kind: v }; },
  wopt: (v, k) => { if (S.locked) return; const w = S.garrison[+k], [kind, val] = v.split(":");
    if (kind === "when") { w.when = val; sheet.wpop = val === "timer" ? { w: +k, kind: "time" } : null; }
    else if (kind === "time") { w.when = "timer"; w.at = +val; sheet.wpop = null; }
    else if (kind === "order") { w.order = val; sheet.wpop = null; } },
  wslot: (v, k) => { if (S.locked) { toast("Draft new orders to change your army."); return; } const u = sheet.tsel && findUnit(sheet.tsel);
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
      if (S.locked) { toast("Draft new orders to change your army."); return; }
      if (t) { const [kind, w, j] = t.dataset.drop.split(":"); let err = null;
        if (kind === "guard") err = guardUnit(id); else if (kind === "dep") { err = deployUnit(id); if (!err) unguard(id); } else if (kind === "res") err = reserveUnit(id); else if (kind === "w") err = assignWave(id, +w, j != null ? +j : undefined);
        if (err) toast(err); sheet.tsel = id; render(true); }
    } else end(); });
  document.addEventListener("pointercancel", end);
  document.addEventListener("click", e => { if (swallow) { e.stopPropagation(); e.preventDefault(); } }, true);
})();
