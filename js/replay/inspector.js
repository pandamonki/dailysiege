// Tap-to-inspect: the unit panel under the map, and the replay clock

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
  replay.sel = best; replay.tip = null; updateReplayUI();
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
// ----- unit panel (the permanent strip under the map during a replay) -----
// Shows whatever is selected, or your own hero when nothing is. Read-only: slots can be tapped for details, never used.
const UD_STATS = { atk: ["Attack", "Damage per hit, before the target's armour."], arm: ["Armour", "Armour type and the share of damage it blocks."], as: ["Attack speed", "Seconds between attacks. Lower is faster."], rng: ["Range", "How far it can attack, in tiles."], spd: ["Move speed", "Tiles walked per second."], evd: ["Dodge", "Chance to avoid a normal attack."], heal: ["Healing", "Health restored per cast."], lvl: ["Level", "Higher levels give more health and damage."], xp: ["Experience", "Heroes learn from every enemy that falls within 8 tiles. Fighting in the centre earns more."] };
let cdIdx = null, xpIdx = null;
function xpState(k, m, time) { // experience bar at this moment: { x, n, L, a, t }
  const R = replay.res, max = m.tree ? MAX_HERO_LVL_V3 : MAX_HERO_LVL;
  if (!xpIdx || xpIdx.R !== R) { xpIdx = { R, m: {} }; (R.xplog || []).forEach(c => (xpIdx.m[c.id] = xpIdx.m[c.id] || []).push(c)); }
  const a = xpIdx.m[k] || []; let c = null; for (let i = 0; i < a.length && a[i].t <= time; i++) c = a[i];
  const L = c ? c.L : (m.lvl || 1), n = c ? c.n : xpNeed(L); return { x: c ? c.x : (m.xp0 || 0), n, L, a: c ? c.a : 0, t: c ? c.t : -99, max: L >= max };
}
function cdState(id, key, time) { // { ready, left, max, used } for a skill or item at this moment of the replay
  const R = replay.res; if (!R.cdlog) return { ready: true };
  if (!cdIdx || cdIdx.R !== R) { cdIdx = { R, m: {} }; R.cdlog.forEach(c => (cdIdx.m[c.id + "|" + c.k] = cdIdx.m[c.id + "|" + c.k] || []).push(c)); }
  const a = cdIdx.m[id + "|" + key]; if (!a) return { ready: true };
  let c = null; for (let i = 0; i < a.length && a[i].t <= time; i++) c = a[i];
  if (!c) return { ready: true };
  if (c.r >= 1e8) return { used: true };
  return c.r > time ? { left: c.r - time, max: c.r - c.t } : { ready: true };
}
function dockTarget() {
  const R = replay.res; if (replay.sel != null && R.meta[replay.sel]) return replay.sel;
  const h = R.meta.findIndex(m => m.pid === R.me && m.kind === "champ"); return h >= 0 ? h : Math.max(0, R.meta.findIndex(m => m.pid === R.me && m.kind === "castle"));
}
// the skills worth showing for a hero: what it can cast (with a cooldown), then what is passive
function heroSkills(m, ranks) {
  const act = [], pas = [];
  if (m.tree) {
    m.tree.forEach((row, bi) => row.forEach((r, i) => { if (!r) return; const n = TREES[m.cls][bi].nodes[i], o = { key: bi + "." + i, name: n.name, ic: n.ic, rank: r, max: TREE_MAX[i], desc: nodeDesc(m.cls, bi, i, r), cd: n.cd, ult: i === 5 };
      ((i === 5 || n.kind === "trigger") ? act : pas).push(o); }));
    act.sort((a, b) => (a.ult - b.ult));
  } else {
    const c = CLASSES[m.cls], list = [...c.abilities.map(a => [a.key, a.name, a.desc]), ["ult", c.ult.name, c.ult.desc]];
    list.forEach(([key, name, desc]) => { const r = ranks[key] || 0, o = { key, name, ic: m.cls + "_" + key, rank: r, max: rankMax(key), desc, cd: COOLDOWN[m.cls][key], ult: key === "ult", off: !r };
      (PASSIVE[m.cls] === key ? pas : act).push(o); });
  }
  return { act, pas };
}
function ranksNow(k, m) { const rk = { ...(m.ranks || {}) }; if (m.tree) return rk; atkIndex(); (replay.lvlEv.get(k) || []).filter(e => e.t <= replay.time).forEach(e => { if (e.ak) rk[e.ak] = (rk[e.ak] || 0) + 1; }); return rk; } // old-style heroes learn skills mid-battle
function dockModel(k) {
  const R = replay.res, m = R.meta[k], color = R.colors[m.pid], who = R.names[m.pid] || "";
  const title = m.kind === "champ" ? CLASSES[m.cls].name : m.kind === "castle" ? CASTLE_TIERS[(m.ctier || 1) - 1].name : m.kind === "summon" ? "Spirit Wolf" : m.kind === "totem" ? "Healing Totem" : m.key === "militia" ? "Militia" : m.key === "guard" ? "Castle Guard" : UNITS[m.key].name;
  const role = m.kind === "champ" ? CLASSES[m.cls].role : m.kind === "castle" ? "Stronghold" : m.kind === "unit" ? "Soldier" : "Summon";
  return { R, m, color, who, title, role };
}
function dockStats(m) {
  const S = (id, ic, v, sub = "") => `<button class="ud-stat" data-act="dtip" data-v="s:${id}"><em>${ic}</em><b>${v}</b>${sub ? `<small>${sub}</small>` : ""}</button>`;
  if (m.kind === "totem") return S("heal", "✚", `${Math.round(m.heal)}/s`) + S("arm", "🛡", ARMOUR_TYPES[m.armour] || "Medium");
  return S("atk", "⚔", Math.round(m.atk), m.atype ? ATK_TYPES[m.atype].name : "") + S("arm", "🛡", ARMOUR_TYPES[m.armour] || "–", Math.round(m.armor * 100) + "%") + S("as", "⏱", m.as.toFixed(2) + "s")
    + S("rng", "➶", m.range > 1.5 ? m.range.toFixed(1) : "Melee") + (m.kind === "castle" ? "" : S("spd", "👢", m.spd.toFixed(2)))
    + (m.evade ? S("evd", "≋", Math.round(m.evade * 100) + "%") : m.heal && m.kind === "unit" ? S("heal", "✚", Math.round(m.heal)) : m.lvl && m.kind === "champ" ? `<button class="ud-stat" id="udlvl" data-act="dtip" data-v="s:lvl"><em>★</em><b>Level ${m.lvl}</b></button>` : "");
}
function replaySrc(k) { const d = dockModel(k); return { m: d.m, color: d.color, who: d.who, title: d.title, role: d.role, ranks: ranksNow(k, d.m), cd: key => cdState(k, key, replay.time), xp: true }; }
// src = what the panel shows: { m (a replay-meta-shaped unit), color, who, title, role, ranks, cd(key) }. Replays and the planning screen both build one.
function dockHTML(src, opts = {}) {
  const { m, color, who, title, role } = src, img = portraitFor(m, color);
  const por = img ? `<img alt="" src="${img}">` : m.kind === "castle" ? `<img class="art" alt="" src="icons/ui/castle${m.ctier || 1}.webp">` : `<div class="gl">${m.kind === "totem" ? "✦" : "W"}</div>`;
  let bot = "";
  if (m.kind === "champ") {
    const { act, pas } = heroSkills(m, src.ranks), cap = Math.max(1, Math.floor((330 - act.length * 51) / 31)); // as many passives as fit on the line
    const slot = a => `<button class="ud-sl${a.ult ? " ult" : ""}${a.off ? " off" : ""}" data-act="dtip" data-v="a:${a.key}" data-ab="${a.key}"><img alt="" src="${spellURL(a.ic, 96)}"><i class="ud-cd" hidden></i>${a.max > 1 && !src.hideRanks ? `<span class="rk">${a.rank}/${a.max}</span>` : ""}</button>`;
    const mini = a => `<button class="ud-mini" data-act="dtip" data-v="a:${a.key}" title="${esc(a.name)}"><img alt="" src="${spellURL(a.ic, 48)}"></button>`;
    const items = (m.items || []).filter(ik => ITEMS[ik]), cells = [];
    for (let i = 0; i < ITEM_SLOTS; i++) { const ik = items[i]; cells.push(ik ? `<button class="ud-sl it" data-act="dtip" data-v="i:${ik}" data-it="${ik}"><img alt="" src="${itemURL(ik, 64)}"><i class="ud-cd" hidden></i></button>` : `<span class="ud-sl it empty"></span>`); }
    const g = m.gear || {}, gear = GEAR_SLOTS.map(([gk], i) => { const x = g[gk] ? GEAR[gk][g[gk] - 1] : null; return `<button class="ud-sl it gear${x ? "" : " empty"}" data-act="dtip" data-v="g:${gk}" title="${x ? esc(x.name) : ""}"><span>${["⚔", "🛡", "✦"][i]}</span>${x ? `<b>${g[gk]}</b>` : ""}</button>`; });
    bot = `<div class="ud-row"><div class="ud-lab">Skills</div><div class="ud-ab">${act.map(slot).join("") || `<span class="ud-none">No skills learned</span>`}${pas.length ? `<span class="ud-sep"></span>${pas.slice(0, cap).map(mini).join("")}${pas.length > cap ? `<button class="ud-mini more" data-act="dtip" data-v="p:all">+${pas.length - cap}</button>` : ""}` : ""}</div></div>
      <div class="ud-row"><div class="ud-lab">Items &amp; gear${src.rival ? " · not scouted" : ""}</div><div class="ud-it">${cells.join("")}<span class="ud-sep"></span>${gear.join("")}</div></div>`;
  } else if (m.kind === "castle") {
    const d = m.defences || {}, list = [d.walls ? DEFENCES.walls[d.walls - 1].name : null, d.tower ? DEFENCES.tower[d.tower - 1].name : null].filter(Boolean);
    bot = `<div class="ud-row ban"><div><div class="ud-lab">Banner</div><img class="bico" alt="" src="${bannerURL(m.banner, color, 36, 48)}"></div><div><div class="ud-lab">Defences</div><div class="ud-def">${list.length ? list.map(n => `<span>${esc(n)}</span>`).join("") : `<span class="off">None built</span>`}</div></div></div>`;
  } else {
    const note = m.kind === "unit" && UNITS[m.key] ? UNITS[m.key].note : m.kind === "summon" ? "Called by a Shaman. Fights for a short while." : m.kind === "totem" ? "Heals nearby friends until it falls." : "";
    bot = `<div class="ud-note">${esc(note)}<br><span>Soldiers fight on their own, so there are no skills or items to watch.</span></div>`;
  }
  return `<div class="ud-top"><div class="ud-por" style="--c:${color}">${por}${m.lvl ? `<div class="ud-lv" id="udlv">${m.lvl}</div>` : ""}</div>
    <div class="ud-id"><div class="ud-nm"><b>${esc(title)}</b><small>${role}</small></div><div class="ud-sub"><i style="background:${color}"></i>${esc(who)}<span class="ud-st" id="udst"></span></div>
    <div class="ud-bar" id="udbar"><i></i><span></span></div>${opts.actions || (src.xp && m.kind === "champ" ? `<div class="ud-xp" id="udxp" data-act="dtip" data-v="s:xp"><i></i><span></span></div>` : "")}</div></div>
    <div class="ud-stats">${dockStats(m)}</div>${bot}`;
}
// the card that opens when a stat, skill or item is tapped
function dockTip(src, key) {
  const { m } = src, [kind, id] = [key.slice(0, 1), key.slice(2)];
  if (kind === "s") { const s = UD_STATS[id]; return s ? { title: s[0], body: s[1], meta: "" } : null; }
  if (kind === "i") { const it = ITEMS[id]; if (!it) return null; const c = it.kind === "use" ? src.cd("i:" + id) : null;
    return { img: itemURL(id, 96), title: it.name, sub: `Tier ${it.tier}`, body: it.desc, meta: it.kind === "use" ? `<span>Cooldown <b>${it.cd}s</b></span><span>${c.used ? "Used" : c.left ? `Ready in <b>${Math.ceil(c.left)}s</b>` : "<b>Ready</b>"}</span>` : `<span>Always active</span>` }; }
  if (kind === "g") { const lv = (m.gear || {})[id], x = lv ? GEAR[id][lv - 1] : null; return { title: x ? x.name : "No " + id, sub: GEAR_SLOTS.find(g => g[0] === id)[1], body: x ? x.desc : "Nothing equipped.", meta: "" }; }
  if (kind === "p") { const sk = heroSkills(m, src.ranks); return { title: "Passive skills", body: sk.pas.map(a => `${a.name}${a.max > 1 ? " " + a.rank + "/" + a.max : ""}`).join(" · "), meta: "<span>Always active</span>" }; }
  if (kind === "a") { const sk = heroSkills(m, src.ranks), a = [...sk.act, ...sk.pas].find(x => x.key === id); if (!a) return null;
    const act = sk.act.includes(a), c = act && !a.off ? src.cd(a.key) : null;
    return { img: spellURL(a.ic, 96), title: a.name, sub: a.max > 1 ? `Rank ${a.rank} of ${a.max}` : a.ult ? "Ultimate" : "", body: a.desc,
      meta: act ? (a.off ? "<span>Not learned</span>" : `${a.cd ? `<span>Cooldown <b>${Math.round(a.cd)}s</b></span>` : ""}<span>${a.ult ? "Once per fight · " : ""}${c.used ? "<b>Used</b>" : c.left ? `Ready in <b>${Math.ceil(c.left)}s</b>` : "<b>Ready</b>"}</span>`) : "<span>Passive</span>" }; }
  return null;
}
function updateInspector() {
  const box = document.getElementById("ud"), tipEl = document.getElementById("udtip"); if (!box) return;
  if (!replay || replay.reel) { box.hidden = tipEl.hidden = true; return; }
  const k = dockTarget(), R = replay.res, m = R.meta[k]; box.hidden = false;
  if (replay.inspectKey !== k) { box.innerHTML = dockHTML(replaySrc(k)); replay.inspectKey = k; replay.dockK = k; replay.tip = null; replay.inspectLvl = null; }
  const f = replayFrameAt(replay.time), b = k * 4, hp = b < f.d.length ? f.d[b + 2] : 0, fl = b < f.d.length ? f.d[b + 3] : 1, dead = fl & 1;
  const friendly = m.pid === R.me || !!((f.al >> R.order.indexOf(m.pid)) & 1);
  const bar = document.getElementById("udbar"); bar.firstChild.style.width = `${Math.max(0, Math.min(1, hp / m.maxhp)) * 100}%`; bar.className = "ud-bar" + (friendly ? "" : " bad");
  bar.lastChild.textContent = dead ? (m.kind === "castle" ? "Destroyed" : "Fallen") : `${Math.round(hp)} / ${Math.round(m.maxhp)}`;
  const st = []; if (fl & 2) st.push("Stunned"); if (fl & 16) st.push("Slowed"); if (fl & 32) st.push("Shielded"); if (fl & 4) st.push("Invulnerable"); if (fl & 8) st.push("Hidden");
  document.getElementById("udst").textContent = st.join(" · ");
  if (m.kind === "champ") {
    atkIndex(); const gained = (replay.lvlEv.get(k) || []).filter(e => e.t <= replay.time), L = (m.lvl || 1) + gained.length;
    { const xs = xpState(k, m, replay.time), xb = document.getElementById("udxp"); if (xb) { xb.firstChild.style.width = (xs.max ? 100 : Math.min(100, xs.x / xs.n * 100)) + "%"; xb.lastChild.textContent = xs.max ? "Max level" : `XP ${Math.floor(xs.x)} / ${xs.n}`; xb.classList.toggle("gain", replay.time - xs.t < 1.2 && xs.a > 0); } }
    if (replay.inspectLvl !== L) { const first = replay.inspectLvl == null; replay.inspectLvl = L; if (!first && !m.tree) { replay.inspectKey = null; return updateInspector(); } const lv = document.getElementById("udlv"); if (lv) lv.textContent = L; const sl = document.querySelector("#udlvl b"); if (sl) sl.textContent = "Level " + L; }
    box.querySelectorAll(".ud-sl[data-ab], .ud-sl[data-it]").forEach(el => { const key = el.dataset.ab || "i:" + el.dataset.it, c = cdState(k, key, replay.time), o = el.lastElementChild.className === "ud-cd" ? el.lastElementChild : el.querySelector(".ud-cd"); if (!o) return;
      o.hidden = !(c.left || c.used); el.classList.toggle("cool", !!(c.left || c.used)); if (c.used) { o.textContent = "USED"; o.className = "ud-cd used"; o.style.removeProperty("--p"); }
      else if (c.left) { o.textContent = Math.ceil(c.left); o.className = "ud-cd"; o.style.setProperty("--p", Math.round((1 - c.left / c.max) * 100) + "%"); } });
  }
  const t = replay.tip ? dockTip(replaySrc(k), replay.tip) : null;
  if (!t) { tipEl.hidden = true; replay.tip = null; return; }
  const html = `${t.img ? `<img alt="" src="${t.img}">` : ""}<div><h4>${esc(t.title)}<small>${esc(t.sub || "")}</small></h4><p>${esc(t.body)}</p>${t.meta ? `<div class="meta">${t.meta}</div>` : ""}</div>`;
  if (tipEl.dataset.h !== html) { tipEl.innerHTML = html; tipEl.dataset.h = html; } tipEl.className = "ud-tip" + (t.img ? "" : " noimg"); tipEl.hidden = false;
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
