// Tap-to-inspect panel and the replay clock

// ----- unit inspector (tap anything in the replay) -----
function replayFrameAt(time) {
  const fr = replay.res.frames; let i = Math.min(fr.length - 2, Math.max(0, Math.floor(time / FRAME_DT)));
  while (i < fr.length - 2 && fr[i + 1].t <= time) i++; while (i > 0 && fr[i].t > time) i--;
  return fr[i];
}
function pickInReplay(x, y) {
  const R = replay.res, f = replayFrameAt(replay.time); let best = null, bd = .75;
  R.meta.forEach((m, k) => {
    const b = k * 4; if (b >= f.d.length) return;
    if (m.kind === "castle") { if (Math.floor(x) === m.tile[1] && (Math.floor(y) === m.tile[0] || Math.floor(y + .5) === m.tile[0])) { best = k; bd = 0; } return; }
    if (f.d[b + 3] & 1) return;
    const dd = Math.sqrt((f.d[b] - x) ** 2 + (f.d[b + 1] - .1 - y) ** 2); if (dd < bd) { bd = dd; best = k; }
  });
  replay.sel = best; replay.inspectKey = null; updateReplayUI();
}
const portraitURL = {};
function portraitFor(m, color) {
  const id = m.key + "|" + color;
  if (portraitURL[id]) return portraitURL[id];
  if (m.kind === "castle" || m.kind === "summon" || m.kind === "totem") return null;
  const s = spr(m.key, color), cv = document.createElement("canvas"); cv.width = SW * 4; cv.height = SH * 4;
  const cx = cv.getContext("2d"); cx.imageSmoothingEnabled = false; cx.drawImage(s, 0, 0, cv.width, cv.height);
  return (portraitURL[id] = cv.toDataURL());
}
function abilRow(m, ranks) {
  if (m.tree) return m.tree.map((row, bi) => row.map((r, i) => { if (!r) return ""; const n = TREES[m.cls][bi].nodes[i]; return `<span><img class="sico" alt="" src="${spellURL(n.ic, 32)}">${esc(n.name)} ${r}/${TREE_MAX[i]}</span>`; }).join("")).join("") || `<span class="off">No skills learned</span>`;
  const c = CLASSES[m.cls], ab = [...c.abilities.map(a => [a.key, a.name]), ["ult", c.ult.name], ["a4", "Vigour"]];
  return ab.map(([key, name]) => { const r = ranks[key] || 0, max = rankMax(key), sp = key === "a4" ? "hero_a4" : m.cls + "_" + key;
    return `<span class="${r ? "" : "off"}"><img class="sico" alt="" src="${spellURL(sp, 32)}">${esc(name)} ${"●".repeat(r)}${"○".repeat(max - r)}${r >= 3 && m.picks && m.picks[key] ? ` · ${esc(m.picks[key])}` : ""}${PASSIVE[m.cls] === key ? " · passive" : ""}</span>`; }).join("");
}
function inspectHTML(k) {
  const R = replay.res, m = R.meta[k], color = R.colors[m.pid], who = R.names[m.pid] || "";
  const title = m.kind === "champ" ? `${CLASSES[m.cls].name}` : m.kind === "castle" ? (CASTLE_TIERS[(m.ctier || 1) - 1].name) : m.kind === "summon" ? "Spirit Wolf" : m.kind === "totem" ? "Healing Totem" : m.key === "militia" ? "Militia" : m.key === "guard" ? "Castle Guard" : UNITS[m.key].name;
  const img = portraitFor(m, color), glyph = m.kind === "castle" ? "♜" : m.kind === "totem" ? "✦" : "W";
  const stat = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
  const stats = m.kind === "totem" ? [stat("Heals", `${Math.round(m.heal)} / s`), stat("Armour", ARMOUR_TYPES[m.armour] || "Medium")] : [
    stat("Attack", `${Math.round(m.atk)}${m.atype ? ` <i>${ATK_TYPES[m.atype].name}</i>` : ""}`),
    stat("Armour", `${ARMOUR_TYPES[m.armour] || "–"} <i>${Math.round(m.armor * 100)}%</i>`),
    stat("Attack every", `${m.as.toFixed(2)}s`), stat("Range", m.range > 1.5 ? m.range.toFixed(1) : "Melee"),
    ...(m.kind === "castle" ? [] : [stat("Move", m.spd.toFixed(2))]), ...(m.heal && m.kind === "unit" ? [stat("Heals", Math.round(m.heal))] : []), ...(m.evade ? [stat("Dodge", Math.round(m.evade * 100) + "%")] : []),
  ];
  let extra = "";
  if (m.kind === "champ") {
    const c = CLASSES[m.cls], ab = [...c.abilities.map(a => [a.key, a.name]), ["ult", c.ult.name]];
    extra += `<div class="ilabel">Abilities</div><div class="iabl" id="iabl">${abilRow(m, m.ranks || {})}</div>`;
    const items = [...GEAR_SLOTS.map(([gk]) => (m.gear || {})[gk] ? GEAR[gk][m.gear[gk] - 1].name : null).filter(Boolean), ...(m.items || []).map(ik => ITEMS[ik] ? ITEMS[ik].name : null).filter(Boolean)];
    extra += `<div class="ilabel">Items</div><div class="iabl">${items.length ? items.map(n => `<span>${esc(n)}</span>`).join("") : `<span class="off">No gear</span>`}</div>`;
  }
  if (m.kind === "castle") {
    const d = m.defences || {}, items = [d.walls ? DEFENCES.walls[d.walls - 1].name : null, d.tower ? DEFENCES.tower[d.tower - 1].name : null].filter(Boolean);
    extra += `<div class="ilabel">Banner</div><div class="iabl"><img class="bico" alt="" src="${bannerURL(m.banner, color, 36, 48)}"></div>`;
    extra += `<div class="ilabel">Defences</div><div class="iabl">${items.length ? items.map(n => `<span>${esc(n)}</span>`).join("") : `<span class="off">None built</span>`}</div>`;
  }
  return `<div class="ihead">${img ? `<img alt="" src="${img}">` : `<div class="iglyph" style="border-color:${color}">${glyph}</div>`}
    <div class="iname"><b>${esc(title)}</b><span><i class="sw" style="background:${color}"></i>${esc(who)}${m.lvl ? ` · <span id="ilvl">Level ${m.lvl}</span>` : ""}</span>
      <div class="ihp"><i id="ihpbar"></i><span id="ihptext"></span></div><div class="istatus" id="istatus"></div></div>
    <button class="x" data-act="unselect" aria-label="Close">✕</button></div>
    <div class="istats">${stats.join("")}</div>${extra}`;
}
function updateInspector() {
  const box = document.getElementById("inspect"); if (!box) return;
  const k = replay.sel; if (k == null) { box.hidden = true; return; }
  if (replay.inspectKey !== k) { box.innerHTML = inspectHTML(k); replay.inspectKey = k; }
  box.hidden = false;
  const R = replay.res, m = R.meta[k], f = replayFrameAt(replay.time), b = k * 4;
  const hp = b < f.d.length ? f.d[b + 2] : 0, fl = b < f.d.length ? f.d[b + 3] : 1, dead = fl & 1;
  const friendly = m.pid === R.me || !!((f.al >> R.order.indexOf(m.pid)) & 1);
  const bar = document.getElementById("ihpbar"); bar.style.width = `${Math.max(0, Math.min(1, hp / m.maxhp)) * 100}%`; bar.className = friendly ? "ok" : "bad";
  document.getElementById("ihptext").textContent = dead ? (m.kind === "castle" ? "Destroyed" : "Fallen") : `${Math.round(hp)} / ${Math.round(m.maxhp)}`;
  if (m.kind === "champ") { atkIndex(); const gained = (replay.lvlEv.get(k) || []).filter(e => e.t <= replay.time), L = (m.lvl || 1) + gained.length;
    if (replay.inspectLvl !== k + ":" + L) { replay.inspectLvl = k + ":" + L; const el = document.getElementById("ilvl"); if (el) el.textContent = "Level " + L;
      const rk = { ...(m.ranks || {}) }; gained.forEach(e => { if (e.ak) rk[e.ak] = (rk[e.ak] || 0) + 1; }); const ab = document.getElementById("iabl"); if (ab) ab.innerHTML = abilRow(m, rk); } }
  const st = []; if (fl & 2) st.push("Stunned"); if (fl & 16) st.push("Slowed"); if (fl & 32) st.push("Shielded"); if (fl & 4) st.push("Invulnerable"); if (fl & 8) st.push("Hidden");
  document.getElementById("istatus").textContent = st.join(" · ");
}
function tickReplay(ms) {
  const dt = Math.min(.1, (ms - lastMs) / 1000 || 0); lastMs = ms;
  if (!replay) return;
  if (replay.reel) { tickReel(dt); return; }
  if (replay.playing) {
    const t0 = replay.time;
    replay.time += dt * replay.speed;
    if (!replay.reel) { replay.bdone = replay.bdone || {}; const bt = (replay.res.hl || []).find(h => h.kind === "betray" && h.t > t0 && h.t <= replay.time && !replay.bdone[h.t]); // freeze on the betrayal
      if (bt) { replay.bdone[bt.t] = 1; replay.time = bt.t; replay.playing = false; betrayCinematic(bt, replay.res, () => { if (replay) replay.playing = true; }); return; } }
    try { const E = replay.res.events || [], me = replay.res.me; if (replay.time - t0 < .6) for (let i = lowerBound(E, t0); i < E.length && E[i].t <= replay.time; i++) if (E[i].ty === "lvl" && E[i].t > t0) { const m = replay.res.meta[E[i].id]; MUSIC.sfx("levelup", m && m.pid === me ? 1 : .3); } } catch (e) {}
    if (replay.time >= replay.res.duration) { replay.time = replay.res.duration; replay.playing = false; if (!replay.done) { replay.done = true; const fin = () => { if (reportBack) leaveBattle(); else open("results"); }; if (replay.reel || !replay.res.awards) fin(); else victoryCeremony(replay.res, fin); } }
  }
  if (replay.auto) autoCam();
  updateReplayUI();
}
