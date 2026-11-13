// Planning screen: a thin unit strip under the map. Tap a unit, your hero, a castle or a rival to see its stats, skills and items;
// tap the strip to open the full panel (the same one replays use). Read-only apart from the quick buttons for train, move and so on.

let psel = null, pexp = false, ptip = null; // what is picked on the map, whether the full panel is open, which detail card is open

// The picked thing, as the same kind of object the replay panel reads: { m, color, who, title, role, ranks, cd }
function planSrc(p) {
  if (!p || !S) return null;
  const none = () => ({ ready: true });
  if (p.t === "champ") {
    const v3 = heroV3Now(), b = v3 ? CHAMP_V3[S.cls] : CHAMP[S.cls], now = v3 ? champNowV3() : champNow(), c = CLASSES[S.cls];
    return { m: { kind: "champ", key: "c-" + S.cls, cls: S.cls, lvl: level(), maxhp: now.hp, hp: now.hp, atk: now.atk, atype: CLASS_TYPES[S.cls][0], armour: CLASS_TYPES[S.cls][1], armor: b.armor, as: b.as, range: b.range, spd: b.spd, evade: 0,
      tree: v3 && S.tree ? TREE_BKEY.map(k => (S.tree[k] || []).slice()) : null, ranks: v3 ? {} : S.ranks, items: (S.items || []).filter(Boolean), gear: S.gear }, color: MY_COLOR, who: "You", title: c.name, role: c.role, ranks: v3 ? {} : S.ranks, cd: none };
  }
  if (p.t === "unit") {
    const u = findUnit(p.id); if (!u) return null; const b = UNITS[u.type], s = unitStats(u), sim = UNIT_SIM[u.type] || {}, ty = UNIT_TYPES[u.type] || [];
    return { m: { kind: "unit", key: u.type, lvl: u.lvl, maxhp: s.hp, hp: s.hp * (u.hp ?? 1), atk: s.atk, atype: ty[0], armour: ty[1], armor: sim.armor || 0, as: sim.as || 1, range: sim.range || 1.1, spd: sim.spd || 1.4, heal: b.heal }, color: MY_COLOR, who: "You", title: b.name, role: `Soldier · Lv${u.lvl}`, ranks: {}, cd: none };
  }
  if (p.t === "castle") {
    const t = Math.max(1, Math.min(3, S.castle || 1)), d = S.defences || {};
    return { m: { kind: "castle", ctier: t, maxhp: BAL.castleHp * (1 + .25 * (d.walls || 0)) * CASTLE_TIERS[t - 1].hp, hp: BAL.castleHp * (1 + .25 * (d.walls || 0)) * CASTLE_TIERS[t - 1].hp, atk: 20 * [1, 1.5, 2][d.tower || 0], atype: "pierce", armour: "fortified", armor: .25, as: 1.5, range: (d.tower || 0) >= 2 ? 3.6 : 3, defences: d, banner: S.banner }, color: MY_COLOR, who: "You", title: CASTLE_TIERS[t - 1].name, role: "Your stronghold", ranks: {}, cd: none };
  }
  if (p.t === "rival") {
    const r = RIVALS.find(x => x.id === p.id); if (!r) return null;
    const e = p.u != null ? RARMY[p.u] : null;
    if (e && e.champ) { // a rival's hero: only its class is known, so show the class kit without ranks
      const h = rivalHeroData(r), cl = h ? h.cls : (e.key || "").replace("c-", "") || r.cls, c = CLASSES[cl]; if (!c) return null;
      const v3 = heroV3Now(), b = v3 ? CHAMP_V3[cl] : CHAMP[cl], L = h ? h.level : Math.max(1, r.lvl || DAY), rk = h ? h.ranks : { a1: 1, a2: 1, a3: 1, ult: 1 }, tree = h && h.tree && v3 ? TREE_BKEY.map(k => (h.tree[k] || []).slice()) : null;
      return { m: { kind: "champ", key: "c-" + cl, cls: cl, lvl: L, maxhp: Math.round(b.hp * (v3 ? hpLvV3(L) : 1 + .08 * (L - 1))), hp: Math.round(b.hp * (v3 ? hpLvV3(L) : 1 + .08 * (L - 1))), atk: Math.round(b.atk * (v3 ? atkLvV3(L) : 1 + .06 * (L - 1))), atype: CLASS_TYPES[cl][0], armour: CLASS_TYPES[cl][1], armor: b.armor, as: b.as, range: b.range, spd: b.spd, evade: 0,
        tree, ranks: rk, items: h ? h.items.filter(k => ITEMS[k]) : [], gear: h ? h.gear : {} }, color: r.color, who: r.name, title: c.name, role: "Rival hero", ranks: rk, cd: none, hideRanks: !h, scouted: !!h, rival: true };
    }
    if (e) { const b = UNITS[e.key]; if (!b) return null; const L = e.lvl || 1, sim = UNIT_SIM[e.key] || {}, ty = UNIT_TYPES[e.key] || [], mul = 1 + UNIT_LVL_GAIN * (L - 1);
      return { m: { kind: "unit", key: e.key, lvl: L, maxhp: Math.round(b.hp * mul), hp: Math.round(b.hp * mul) * (e.hp ?? 1), atk: Math.round(b.atk * mul), atype: ty[0], armour: ty[1], armor: sim.armor || 0, as: sim.as || 1, range: sim.range || 1.1, spd: sim.spd || 1.4 }, color: r.color, who: r.name, title: b.name, role: `${r.name}'s soldier · Lv${L}`, ranks: {}, cd: none, rival: true }; }
    const t = Math.max(1, Math.min(3, r.ctier || 1)), hp = BAL.castleHp * CASTLE_TIERS[t - 1].hp;
    return { m: { kind: "castle", ctier: t, maxhp: hp, hp, atk: 20, atype: "pierce", armour: "fortified", armor: .25, as: 1.5, range: 3, defences: {}, banner: r.banner }, color: r.color, who: r.name, title: `${r.name}'s ${CASTLE_TIERS[t - 1].name}`, role: r.cls ? `${CLASSES[r.cls].name} lord` : "Class unknown", ranks: {}, cd: none, rival: true };
  }
  if (p.t === "wall" || p.t === "trap") {
    const w = p.t === "wall" ? findWall(p.id) : findTrap(p.id); if (!w) return null;
    return { thing: true, title: p.t === "wall" ? "Fence" : TRAPS[w.type].name, role: p.t === "wall" ? "Blocks the way" : "Tonight only", color: MY_COLOR, img: p.t === "wall" ? null : trapURL(w.type), note: p.t === "trap" ? TRAPS[w.type].note : "Enemy soldiers cannot walk through it. They go round, or hack it down." };
  }
  return null;
}
// quick buttons for the picked thing: [act, v, k, icon, label, disabled, hint]
function planActions(p, src) {
  const lk = S.locked || (isLive() && LIVE.readOnly), A4 = (act, v, k, ic, lb, dd, hint) => [act, v, k, ic, lb, !!dd, hint || lb];
  if (src.rival) { const det = A4("open", "rival", p.id, UIIMG("allies"), "Details", false, "What you know about this lord");
    if (src.m.kind !== "champ") return [det]; const ok = !!src.scouted, no = "You haven't seen this hero fight yet";
    return [A4("rhero", p.id, "abilities", UIIMG("ultimate"), "Abilities", !ok, ok ? "Its skills, from yesterday's battle" : no), A4("rhero", p.id, "items", UIIMG("armoury"), "Items", !ok, ok ? "Its items and gear, from yesterday's battle" : no), det]; }
  if (p.t === "champ") { const fp = freePts(); return [A4("openhero", "abilities", null, UIIMG("ultimate"), `Abilities${fp ? `<sup class="dot">${fp}</sup>` : ""}`, false, fp ? `Skills (${fp} point${fp === 1 ? "" : "s"} to spend)` : "Skills"), A4("openhero", "items", null, UIIMG("armoury"), "Items", false, "Items and gear"), A4("move", "champ", null, "✥", "Move", lk, "Move your hero to another tile"), A4("open", "uorder", "champ", UIIMG("orders"), "Orders", false, "War orders for your hero")]; }
  if (p.t === "unit") { const u = findUnit(p.id), maxed = u.lvl >= 3, tier = ctNow() < UNIT_LVL_TIER[u.lvl], gold = !maxed && avail() < upgradeCost(u);
    return [A4("up", p.id, null, "⬆", "Train", lk || maxed || tier || gold, maxed ? "Fully trained" : tier ? `Needs a ${tierName(UNIT_LVL_TIER[u.lvl])}` : `Train to level ${u.lvl + 1} for ${upgradeCost(u)} gold`), A4("move", p.id, null, "✥", "Move", lk, "Move to another tile"), A4("open", "uorder", p.id, UIIMG("orders"), "Orders", false, "War orders"), A4("bench", p.id, null, "⌂", "Barracks", lk, "Send back to the barracks")]; }
  if (p.t === "castle") return [A4("opencastle", "keep", null, UIIMG("base"), "Base", false, "Build and upgrade"), A4("opencastle", "recruit", null, UIIMG("army"), "Army", false, "Recruit and train")];
  return [A4("move", p.id, null, "✥", "Move", lk, "Move"), A4("bench", p.id, null, "⌂", "Pick up", lk, "Pick up")];
}
const pdBtn = ([act, v, k, ic, lb, off, hint]) => `<button class="pd-b" data-act="${act}" ${v != null ? `data-v="${v}"` : ""} ${k != null ? `data-k="${k}"` : ""} ${off ? "disabled" : ""} title="${esc(hint)}" aria-label="${esc(hint)}"><span>${ic}</span><small>${lb}</small></button>`;
function renderPlanDock() {
  const el = document.getElementById("pdock"), ud = document.getElementById("ud"), tipEl = document.getElementById("udtip"); if (!el || !ud) return;
  if (mode !== "plan" || !S) { el.hidden = true; ud.className = "ud"; document.body.classList.remove("pdx"); return; }
  el.hidden = false;
  if (!psel) psel = { t: "champ", dflt: true }; // always show something: the hero until you pick another
  let src = planSrc(psel);
  if (!src && !psel.dflt) { psel = { t: "champ", dflt: true }; src = planSrc(psel); }
  if (!src) { psel = null; pexp = false; ptip = null; el.innerHTML = `<span class="pd-hint">Tap a soldier, your hero, a castle or a rival to inspect it.</span>`; ud.hidden = true; tipEl.hidden = true; document.body.classList.remove("pdx"); return; }
  const acts = planActions(psel, src.thing ? { rival: false } : src);
  if (src.thing) {
    el.innerHTML = `<div class="pd"><div class="pd-main"><span class="pd-por" style="--c:${src.color}">${src.img ? `<img alt="" src="${src.img}">` : `<b class="gl">▦</b>`}</span><span class="pd-info"><span class="pd-nm"><b>${esc(src.title)}</b><small>${src.role}</small></span><span class="pd-note">${esc(src.note)}</span></span></div><div class="pd-act">${acts.map(pdBtn).join("")}</div></div>`;
    ud.hidden = true; tipEl.hidden = true; document.body.classList.remove("pdx"); return;
  }
  const m = src.m, img = portraitFor(m, src.color), hpf = Math.max(0, Math.min(1, m.hp / m.maxhp));
  const st = `<span>⚔ <b>${Math.round(m.atk)}</b></span><span>🛡 <b>${ARMOUR_TYPES[m.armour] || "–"}</b></span>${m.kind === "castle" ? `<span>➶ <b>${m.range.toFixed(1)}</b></span>` : `<span>👢 <b>${m.spd.toFixed(2)}</b></span>`}`;
  el.innerHTML = `<div class="pd"><button class="pd-main" data-act="pexp" aria-label="Show full details"><span class="pd-por" style="--c:${src.color}">${img ? `<img alt="" src="${img}">` : m.kind === "castle" ? `<img class="art" alt="" src="icons/ui/castle${m.ctier}.webp">` : `<b class="gl">W</b>`}${m.lvl ? `<i class="lv">${m.lvl}</i>` : ""}</span>
    <span class="pd-info"><span class="pd-nm"><b>${esc(src.title)}</b>${m.kind === "unit" ? "" : `<small>${esc(src.role)}</small>`}</span><span class="pd-bar${src.rival ? " bad" : ""}"><i style="width:${hpf * 100}%"></i><span>${Math.round(m.hp)} / ${Math.round(m.maxhp)}</span></span><span class="pd-stats">${st}</span></span></button>
    <div class="pd-act">${acts.map(pdBtn).join("")}</div></div>`;
  if (!pexp) { ud.hidden = true; tipEl.hidden = true; document.body.classList.remove("pdx"); return; }
  const act = `<div class="ud-act">${acts.map(pdBtn).join("")}<button class="pd-b" data-act="pexp" title="Close" aria-label="Close"><span>▾</span><small>Close</small></button></div>`;
  ud.className = "ud udp"; ud.innerHTML = dockHTML(src, { actions: act });
  const bar = ud.querySelector("#udbar"); bar.firstChild.style.width = hpf * 100 + "%"; bar.lastChild.textContent = `${Math.round(m.hp)} / ${Math.round(m.maxhp)}`; if (src.rival) bar.classList.add("bad");
  ud.hidden = false; document.body.classList.add("pdx");
  const t = ptip ? dockTip(src, ptip) : null;
  if (!t) { tipEl.hidden = true; ptip = null; return; }
  tipEl.innerHTML = `${t.img ? `<img alt="" src="${t.img}">` : ""}<div><h4>${esc(t.title)}<small>${esc(src.hideRanks ? "" : t.sub || "")}</small></h4><p>${esc(t.body)}</p>${t.meta ? `<div class="meta">${t.meta}</div>` : ""}</div>`; tipEl.className = "ud-tip" + (t.img ? "" : " noimg"); tipEl.hidden = false;
}
