// Castle, wall and hero sheets

// ----- sheets -----
function head(img, title, sub) {
  return `<header>${img ? `<img alt="" src="${img}">` : ""}<div><h2>${esc(title)}</h2>${sub ? `<div class="sub">${sub}</div>` : ""}</div><button class="x" data-act="close" aria-label="Close">✕</button></header>`;
}
function wareCard(img, name, price, desc, act, v, disabled, label) {
  return `<div class="ware"><img alt="" src="${img}"><div class="nm"><span>${esc(name)}</span>${price != null ? `<span class="price">${price}g</span>` : ""}</div><div class="ds">${desc}</div><button class="btn small" data-act="${act}" data-v="${v}" ${dis(disabled)}>${label}</button></div>`;
}
function tierName(n) { return CASTLE_TIERS[Math.max(0, Math.min(2, n - 1))].name; }
function armySwatches() {
  const taken = takenColours(), mine = MY_COLOR, fixedC = gameMode === "friends" && !inLobby();
  return `<div class="swatches team">${SEAT_COLORS.map(c => { const who = taken[c], on = c === mine;
      return `<button class="swt${on ? " on" : ""}${who && !on ? " taken" : ""}" data-act="bset" data-v="c1" data-k="${c}" style="background:${c}" aria-label="${TEAM_COLOR_NAMES[c]}${who ? ", taken by " + esc(who) : ""}" title="${TEAM_COLOR_NAMES[c]}${who ? " · taken by " + esc(who) : ""}" ${(who && !on) || (fixedC && !on) ? "disabled" : ""}></button>`; }).join("")}</div>
      <p class="muted">${fixedC ? `Your army colour is <b>${TEAM_COLOR_NAMES[mine] || "set"}</b> for this war.` : `Your army colour: <b>${TEAM_COLOR_NAMES[mine] || "?"}</b>. It colours your castle, hero, soldiers and coat of arms. Greyed-out colours belong to other lords${gameMode === "friends" ? ", and free up again if they switch. Colours are fixed when registration closes" : ""}.`}</p>`;
}
const canBanner = () => !isLive() || DAY === 1;
const ctNow = () => S.castle || 1;
function castleSheet() {
  const tab = sheet.lobby ? "banner" : (sheet.tab || "recruit"), full = S.owned.length >= S.slots, ct = ctNow();
  let body = "";
  if (tab === "recruit") body = `<p class="muted">Recruits stay with you all week and redeploy free each day. <b>Units ${S.owned.length}/${S.slots}</b> (${S.owned.filter(u => placedAt(u.id)).length} placed on the map). Every castle also has one free Castle Guard.</p>
    <div class="wares">${Object.entries(UNITS).map(([k, u]) => wareCard(spriteURL(k), u.name, u.cost, `${u.note}<br>${IC.hp(u.hp)} ${IC.atk(u.atk)}<br>${typeLine(UNIT_TYPES[k])}`, "buy", k, full || avail() < u.cost, full ? "Barracks full" : "Recruit")).join("")}</div>`;
  if (tab === "upgrade") body = `<p class="muted">Upgrades last all week. Each level adds 15% HP and attack.</p>
    <div class="wares">${S.owned.map(u => { const s = unitStats(u); return wareCard(spriteURL(u.type), `${UNITS[u.type].name} Lv${u.lvl}`, u.lvl < 3 ? upgradeCost(u) : null, `${IC.hp(s.hp)} ${IC.atk(s.atk)}`, "up", u.id, u.lvl >= 3 || avail() < upgradeCost(u), u.lvl >= 3 ? "Max level" : `Train to Lv${u.lvl + 1}`); }).join("")}
    <div class="ware"><img alt="" src="${spriteURL("footman")}" style="opacity:.5"><div class="nm"><span>Barracks bed</span>${S.slots < SLOT_MAX ? `<span class="price">${S.slots * 50}g</span>` : ""}</div><div class="ds">Room for one more soldier.</div><button class="btn small" data-act="slot" ${dis(S.slots >= SLOT_MAX || avail() < S.slots * 50)}>${S.slots >= SLOT_MAX ? "All 6 built" : `Build bed ${S.slots + 1}`}</button></div></div>`;
  if (tab === "armoury") {
    const slots = [["weapon", "Weapon", "⚔"], ["armour", "Armour", "⛨"], ["charm", "Charm", "✦"], ["walls", "Bastion", "▦"], ["tower", "Tower", "➶"]];
    const selG = sheet.gear || "weapon", isDef = selG === "walls" || selG === "tower";
    const list = isDef ? DEFENCES[selG] : GEAR[selG], tier = isDef ? S.defences[selG] : S.gear[selG], cur = tier ? list[tier - 1] : null, nx = list[tier];
    const need = nx ? UPGRADE_NEEDS[selG][tier] : 0, locked = nx && ct < need;
    const effect = (k, tr) => { const g = { ...S.gear, [k]: tr };
      if (!tr && k !== "weapon" && k !== "armour") return k === "walls" ? [["Castle HP", BAL.castleHp]] : k === "tower" ? [["Tower damage", 20], ["Tower range", "3 tiles"]] : [["Effect", "None yet"]];
      if (k === "weapon") return [["Hero attack", champNow(g).atk], ...(tr >= 3 ? [["Lifesteal", "10% of damage dealt"]] : [])];
      if (k === "armour") return [["Hero HP", champNow(g).hp], ...(tr >= 2 ? [["Damage taken", `−${[0, 0, 10, 20][tr]}%`]] : [])];
      if (k === "charm") return [["Move speed", "+15%"], ...(tr >= 2 ? [["Ability recharge", "20% faster"]] : []), ...(tr >= 3 ? [["Revive", "Twice as fast, full health"]] : [])];
      if (k === "walls") return [["Castle HP", Math.round(BAL.castleHp * (1 + .25 * tr) * CASTLE_TIERS[ct - 1].hp)]];
      return [["Tower damage", Math.round(20 * [1, 1.5, 2][tr])], ["Tower range", tr >= 2 ? "3.6 tiles" : "3 tiles"]]; };
    const lines = L => L.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("");
    body = `<div class="abtiles five">${slots.map(([k, l, g]) => { const tt = (k === "walls" || k === "tower") ? S.defences[k] : S.gear[k], mx = (k === "walls" || k === "tower") ? 2 : 3;
      return `<button class="abt${selG === k ? " on" : ""}${tt ? "" : " off"}" data-act="gsel" data-v="${k}" aria-label="${l}"><b>${g}</b><span class="pips">${Array.from({ length: mx }, (_, i) => `<i class="pip${i < tt ? " on" : ""}"></i>`).join("")}</span><small>${l}</small></button>`; }).join("")}</div>
    <div class="abd">
      <div class="spread"><b class="abn">${esc(cur ? cur.name : slots.find(x => x[0] === selG)[1])}</b><span class="muted">${isDef ? "Castle" : "Hero"} · tier ${tier}/${list.length}</span></div>
      <div class="cmp"><div><span class="ilabel">Now</span>${lines(effect(selG, tier))}</div><div><span class="ilabel">${nx ? esc(nx.name) : "Next"}</span>${nx ? lines(effect(selG, tier + 1)) : `<p class="muted">Finest there is</p>`}</div></div>
      ${nx ? `<div class="row"><button class="btn wood" data-act="${isDef ? "defend" : "gear"}" data-v="${selG}" ${dis(avail() < nx.cost || locked)}>${isDef ? "Build" : "Forge"} · ${nx.cost}g</button>${locked ? `<span class="need">Needs a ${tierName(need)}</span>` : avail() < nx.cost ? `<span class="muted">Need ${nx.cost - avail()} more gold</span>` : ""}</div>` : ""}
      ${locked ? `<button class="btn small" data-act="ctab" data-v="keep">Go to the Castle tab</button>` : ""}
      <p class="muted">Lasts all week.</p></div>`;
  }
  if (tab === "keep") {
    const cur = CASTLE_TIERS[ct - 1], nx = CASTLE_TIERS[ct], wt = WALL_TIERS[ct - 1], lim = wallLimit(ct), have = S.walls.length;
    body = `<div class="sec"><div class="spread"><b class="abn">${cur.name}</b><span class="muted">tier ${ct}/3 · ${Math.round(BAL.castleHp * (1 + .25 * S.defences.walls) * cur.hp)} HP</span></div>
      <p class="muted">${esc(cur.note)}</p>
      <p class="muted">Daily income: <b>${BASE_INCOME + CASTLE_INCOME[ct - 1]} gold</b>${nx ? ` (${BASE_INCOME + CASTLE_INCOME[ct]} after the upgrade)` : ""}, before kills and catch-up.</p>
      <ol class="tiers">${CASTLE_TIERS.map((t, i) => `<li class="${i + 1 <= ct ? "got" : ""}"><b>${t.name}</b><span>${i === 0 ? "Start" : t.cost + "g"}</span><small>${esc(t.note)}</small></li>`).join("")}</ol>
      ${nx ? `<div class="row"><button class="btn wood" data-act="castleup" ${dis(avail() < nx.cost)}>Upgrade to ${nx.name} · ${nx.cost}g</button>${avail() < nx.cost ? `<span class="muted">Need ${nx.cost - avail()} more gold</span>` : ""}</div>` : `<p class="muted">Your castle is a Citadel. Nothing finer can be built.</p>`}</div>`;
  }
  if (tab === "shop") {
    const slots = Array.from({ length: ITEM_SLOTS }, (_, i) => S.items[i] || null);
    body = `<p class="muted">Your hero carries ${ITEM_SLOTS} items. Passive and aura items work all battle. Active items trigger on their own when the moment is right, then recharge. Anything here is yours if you can pay for it.</p>
      <div class="islots">${slots.map(k => k ? `<div class="islot"><img alt="" src="${itemURL(k)}"><b>${esc(ITEMS[k].name)}</b><button class="btn small" data-act="isell" data-v="${k}" ${dis()}>Sell +${Math.floor(ITEMS[k].cost / 2)}g</button></div>` : `<div class="islot empty"><span>Empty</span></div>`).join("")}</div>
      <div class="wares">${Object.entries(ITEMS).map(([k, it]) => { const own = S.items.includes(k), lk = false, fullI = S.items.length >= ITEM_SLOTS;
        return `<div class="ware item"><img alt="" src="${itemURL(k)}"><div class="nm"><span>${esc(it.name)}</span><span class="price">${it.cost}g</span></div><div class="ds"><span class="kind k-${it.kind}">${it.kind === "use" ? `Active · ${it.cd}s recharge` : it.kind === "aura" ? "Aura" : "Passive"}</span> ${esc(it.desc)}</div><button class="btn small" data-act="ibuy" data-v="${k}" ${dis(own || lk || fullI || avail() < it.cost)}>${own ? "Owned" : lk ? `Needs a ${tierName(it.tier)}` : fullI ? "Slots full" : "Buy"}</button></div>`; }).join("")}</div>`;
  }
  if (tab === "banner") {
    const b = S.banner || defaultBanner(), ok = canBanner();
    const sw = (key, cur) => `<div class="swatches">${BANNER_COLS.map(c => `<button class="swt${cur === c ? " on" : ""}" data-act="bset" data-v="${key}" data-k="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")}</div>`;
    body = `${S.ob === 3 ? `<div class="obbox"><b>Step 2 of 2 · Design your banner</b><span>Choose a pattern, an emblem and a second colour. It flies over your castle all week.</span><button class="btn wax" data-act="obdone">${inLobby() ? "Finish" : "Finish: to the battlefield →"}</button></div>` : ""}<p class="muted">${ok ? "Design your banner. It flies from your castle, and everyone sees it in the replays and on the leaderboard." : "Banners are designed on Monday and stay for the week."}</p>
      <div class="bpreview"><img alt="Your coat of arms" src="${bannerURL(gameMode === "friends" ? { ...b, c1: MY_COLOR } : b, MY_COLOR, 120, 160)}"></div>
      <div class="sec"><h3>Pattern</h3><div class="optrow">${BANNER_PATS.map(([k, n]) => `<button class="btn small${b.pat === k ? " on" : ""}" data-act="bset" data-v="pat" data-k="${k}" ${ok ? "" : "disabled"}>${n}</button>`).join("")}</div></div>
      <div class="sec"><h3>Emblem</h3><div class="optrow">${BANNER_EMS.map(([k, n]) => `<button class="btn small${b.em === k ? " on" : ""}" data-act="bset" data-v="em" data-k="${k}" ${ok ? "" : "disabled"}>${n}</button>`).join("")}</div></div>
      <div class="sec"><h3>Second colour</h3>${sw("c2", b.c2)}<p class="muted">The main colour is your army colour, <b>${TEAM_COLOR_NAMES[MY_COLOR] || "your colour"}</b>${gameMode === "friends" && inLobby() ? ". Change it under Army colour in the Muster Hall" : ""}.</p></div>`;
  }
  if (tab === "traps") {
    const wt = WALL_TIERS[ct - 1], lim = wallLimit(ct), have = S.walls.length;
    body = `<div class="sec"><h3>Traps</h3><p class="muted">Single use. They only last for tonight's battle.</p>
    <div class="wares">${Object.entries(TRAPS).map(([k, t]) => wareCard(trapURL(k), t.name, t.cost, t.note, "trap", k, avail() < t.cost, "Buy")).join("")}</div></div>
    <div class="sec"><h3>Walls and fences</h3>
      <p class="muted">Each block is one tile (${wt.name}, ${wt.hp} HP), built to the same tier as your castle. Turn a block to make it run east–west or north–south. Enemies must chop through or walk around. ${have}/${lim} blocks built; that's the most a castle can hold. Line them up to make a wall, or scatter them to make a maze.</p>
      <div class="wares"><div class="ware"><img class="wide" alt="" src="${wallURL(ct)}"><div class="nm"><span>${wt.name}</span><span class="price">${WALL_COST}g</span></div><div class="ds">1 block · ${wt.hp} HP</div><button class="btn small" data-act="wallbuy" ${dis(have >= lim || avail() < WALL_COST)}>${have >= lim ? "Limit reached" : "Build a wall"}</button></div>
      ${S.walls.map((w, i) => `<div class="ware"><img class="wide" alt="" src="${wallURL(ct)}"><div class="nm"><span>Wall ${i + 1}</span></div><div class="ds">${placedAt(w.id) ? "Standing in your field" : "Waiting in the barracks"}</div><button class="btn small" data-act="open" data-v="wall" data-k="${w.id}">Manage</button></div>`).join("")}</div></div>`;
  }
  if (sheet.lobby) return head(null, "Coat of arms", "Shown on your castle and banner all war") + `<div class="body">${body}<div class="row"><button class="btn wax" data-act="lobbydone">Done</button></div></div>`;
  return head(null, "Your Castle", `Tier ${ct} ${tierName(ct)} · ${S.gold} gold in the treasury`) + `<div class="body">
    <div class="tabs scrolltabs">${[["recruit", "Recruit"], ["upgrade", "Train"], ["armoury", "Armoury"], ["keep", "Castle"], ["shop", "Shop"], ["banner", "Banner"], ["traps", "Defences"]].map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-act="ctab" data-v="${k}">${l}</button>`).join("")}</div>${body}</div>`;
}
function wallSheet(id) {
  const w = findWall(id); if (!w) return head(null, "Wall", "") + `<div class="body"><p class="muted">That wall is gone.</p></div>`;
  const ct = ctNow(), t = WALL_TIERS[ct - 1];
  return head(null, t.name, `1 block · ${t.hp} HP · ${w.dir === "h" ? "running east–west" : "running north–south"}`) + `<div class="body">
    <div class="bpreview"><img class="wide" alt="" src="${wallURL(ct)}"></div>
    <p class="muted">Enemies stop and chop at walls that block their path, or walk around them. A castle upgrade strengthens every wall you own. Walls rebuild free each day.</p>
    <div class="row"><button class="btn wood" data-act="wrot" data-v="${id}" ${dis()}>Rotate</button><button class="btn" data-act="move" data-v="${id}" ${dis()}>Move</button>
    <button class="btn" data-act="bench" data-v="${id}" ${dis()}>Back to barracks</button><button class="btn wax" data-act="wsell" data-v="${id}" ${dis()}>Dismantle +${Math.floor(WALL_COST / 2)}g</button></div></div>`;
}
const abilCD = (k, r) => r ? COOLDOWN[S.cls][k] * BAL.cd * (1 - .1 * (r - 1)) * (S.gear.charm >= 2 ? .8 : 1) : null;
function champSheet() {
  const c = cls(), abil = [...c.abilities.map(a => ({ ...a })), { key: "ult", name: c.ult.name, desc: c.ult.desc, ult: true }, { key: "a4", name: "Vigour", desc: "Toughens your hero. More health and damage with every rank.", vig: true }];
  const selK = sheet.ab || "a1", A0 = abil.find(a => a.key === selK), r = S.ranks[selK] || 0, max = rankMax(selK), now = champNow();
  const need = r >= max ? "Fully learned" : A0.ult ? (level() < ULT_AT[r] ? `Rank ${r + 1} opens at level ${ULT_AT[r]}` : "") : A0.vig ? "" : (level() < r * 2 + 1 ? `Rank ${r + 1} opens at level ${r * 2 + 1}` : "");
  const lines = (L) => L ? L.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("") : `<p class="muted">Not learned</p>`;
  let nowL = abilLines(selK, r), nextL = r < max ? abilLines(selK, r + 1) : null;
  if (nextL && nowL) { const a = nowL.find(x => x[0] === "Recharge"), bI = nextL.findIndex(x => x[0] === "Recharge"); if (a && bI > -1) { const d = parseFloat(nextL[bI][1]) - parseFloat(a[1]); if (Math.abs(d) >= .05) nextL[bI] = [nextL[bI][0], `${nextL[bI][1]} <i class="dl">${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(1)}s</i>`]; } }
  const canChange = !isLive() || DAY === 1, L = level(), nd = xpNeed(L), xp = Math.min(S.xp || 0, nd);
  const slots = Array.from({ length: ITEM_SLOTS }, (_, i) => S.items[i] || null);
  return head(spriteURL("c-" + S.cls), `${c.name} Hero`, `Level ${L} · ${freePts()} skill point${freePts() === 1 ? "" : "s"} to spend`) + `<div class="body">
    ${S.ob === 2 ? `<div class="obbox"><b>Step 1 of 2 · Choose your hero</b><span>Pick a class below, then spend your first skill point on an ability.</span><button class="btn wax" data-act="obnext">Next: design your banner →</button></div>` : ""}
    <div class="xpbar" title="Experience toward the next level"><i style="width:${Math.round(xp / nd * 100)}%"></i><span>Level ${L} · ${xp}/${nd} XP</span></div>
    <p class="muted xpnote">Your hero earns experience in battle from deaths nearby, gaining up to ${XP_CAP} levels a day (slower the higher you climb, and faster if you hold the centre). Every level is one skill point (21 in all): four ranks for each ability, three for your ultimate (from levels 5, 10 and 15) and six in Vigour, which adds 2% health and damage a rank. Levels won mid-fight sharpen your abilities automatically.</p>
    <div class="stats"><span>${IC.hp(now.hp)}</span><span>${IC.atk(now.atk)}</span><span>${typeLine(CLASS_TYPES[S.cls])}</span></div>
    <div class="row"><button class="btn small wood" data-act="move" data-v="champ" ${dis()}>Move on the map</button><span class="muted">or drag your hero to a glowing tile</span></div>
    ${canChange ? `<div><button class="btn wood" data-act="heropick" ${dis()}>Change hero…</button></div>` : ""}
    <div class="abtiles five">${abil.map(a => { const rr = S.ranks[a.key] || 0, mx = rankMax(a.key), cd = isPassive(a.key) ? "passive" : abilCD(a.key, rr || 1).toFixed(0) + "s";
      return `<button class="abt${selK === a.key ? " on" : ""}${rr ? "" : " off"}${a.ult ? " ult" : ""}${a.vig ? " vig" : ""}" data-act="abil" data-v="${a.key}" aria-label="${esc(a.name)}"><img class="aico" alt="" src="${spellURL(a.vig ? "hero_a4" : S.cls + "_" + a.key, 64)}"><span class="pips">${Array.from({ length: mx }, (_, i) => `<i class="pip${i < rr ? " on" : ""}"></i>`).join("")}</span><small class="cdchip">${cd}</small>${canRank(a.key) ? `<em>+</em>` : ""}</button>`; }).join("")}</div>
    <div class="abd">
      <div class="spread"><b class="abn">${esc(A0.name)}${A0.ult ? " · Ultimate" : ""}${isPassive(selK) ? " · Passive" : ""}</b><span class="muted">Rank ${r}/${max}</span></div>
      <p class="muted">${esc(A0.desc)}</p>
      <div class="cmp"><div><span class="ilabel">Now</span>${lines(nowL)}</div><div><span class="ilabel">${r < max ? `Rank ${r + 1}` : "Next"}</span>${r < max ? lines(nextL) : `<p class="muted">Maxed</p>`}</div></div>
      <div class="row"><button class="btn wood" data-act="rank" data-k="${selK}" ${canRank(selK) ? "" : "disabled"}>${r ? "Level up" : "Learn"}</button><span class="muted">${need}</span></div>
      ${!A0.ult && !A0.vig ? (r >= 3 ? `<div class="choices">${A0.choice.map(([n, dd]) => `<button class="choice${S.picks[selK] === n ? " on" : ""}" data-act="choose" data-k="${selK}" data-v="${esc(n)}" ${dis()}><b>${esc(n)}</b>${esc(dd)}</button>`).join("")}</div>`
        : `<p class="muted">At rank 3, pick an upgrade: ${A0.choice.map(([n]) => `<b>${esc(n)}</b>`).join(" or ")}.</p>`) : ""}
      ${isPassive(selK) ? "" : `<label class="inline">Cast<select data-act="trig" data-k="${selK}" ${dis(!r)}>${opts(TRIGGERS, S.triggers[selK])}</select></label>`}
    </div>
    <div class="sec"><div class="spread"><h3>Items (${S.items.length}/${ITEM_SLOTS})</h3><button class="btn small wood" data-act="shop">Shop</button></div>
      <div class="islots tiny">${slots.map(k => k ? `<div class="islot" title="${esc(ITEMS[k].desc)}"><img alt="" src="${itemURL(k)}"><b>${esc(ITEMS[k].name)}</b></div>` : `<div class="islot empty"><span>Empty</span></div>`).join("")}</div></div>
    <div><button class="btn small" data-act="open" data-v="spells">Spell book</button></div></div>`;
}
