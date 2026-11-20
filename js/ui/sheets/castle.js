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
const pipRow = (n, max) => `<span class="pips sm">${Array.from({ length: max }, (_, i) => `<i class="pip${i < n ? " on" : ""}"></i>`).join("")}</span>`;
const tile = (act, v, on, img, name, o = {}) => `<button class="ucard item${on ? " on" : ""}${o.lk ? " lk" : ""}" data-act="${act}" data-v="${v}" aria-label="${name}"><span class="ib">${img && img.length < 6 ? `<em class="ico">${img}</em>` : `<img alt="" src="${img || ""}">`}${o.lk ? `<em class="lockb">🔒</em>` : o.own ? `<em class="own">✓</em>` : o.price != null ? `<span class="pb"><i class="coin"></i>${o.price}</span>` : ""}</span><b>${name}</b>${o.pips ? pipRow(o.pips[0], o.pips[1]) : ""}${o.tag ? `<small class="st st-${o.tag[0]}">${o.tag[1]}</small>` : ""}</button>`;
const udet = (title, price, html) => `<div class="udet"><span class="dtag">Details</span><h3><span>${title}</span>${price != null ? `<span class="pr"><i class="coin"></i>${price}</span>` : ""}</h3>${html}</div>`;
const rows = L => L.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("");
const cmpBox = (now, next, nextLabel) => `<div class="cmp"><div><span class="ilabel">Now</span>${rows(now)}</div><div><span class="ilabel">${nextLabel || "After"}</span>${next ? rows(next) : `<p class="muted">Fully upgraded</p>`}</div></div>`;
const abar = html => `<div class="abar">${html}</div>`;
const ISH_PAGE = 12;
const TRAP_ICON = k => ({ spike: "trap_spike", snare: "trap_snare", bell: "trap_bell" }[k]);
const trapImg = k => ART.trap[k] || (TRAP_ICON(k) ? `icons/ui/${TRAP_ICON(k)}.webp` : trapURL(k));
// what each trap does in the battle (the numbers the battle uses)
const TRAP_STATS = { spike: [["Damage", `${TRAP_DMG.spike}, ignores armour`], ["Hits", "The first enemy to step in"]], snare: [["Damage", "None"], ["Holds", "The first enemy, for 3 seconds"]], bomb: [["Damage", `${TRAP_DMG.bomb} to each enemy, ignores armour`], ["Hits", `Everyone within ${BOMB_R} tiles`]], sand: [["Damage", "None"], ["Holds", `Siege engines only, for ${SAND_SECS} seconds`]], tower: [["Health", `${UNITS.tower.hp}, more as you upgrade`], ["Damage", `${UNITS.tower.atk} a shot, from ${UNIT_SIM.tower.range} tiles`], ["Moves", "Never"]], blade: [["Damage", `${TRAP_DMG.blade} to each enemy`], ["Hits", "Everyone in a lane 2 to 4 tiles long"]] };
const canBanner = () => !isLive() || DAY === 1;
const ctNow = () => S.castle || 1;
const rapierTaken = k => isLive() && Object.entries(LIVE.players || {}).some(([uid, p]) => uid !== LIVE.uid && p && p.state && (p.state.items || []).includes(k));
const itemKindTag = it => `<span class="kind k-${it.kind}"><b>T${it.tier}</b> · ${it.kind === "use" ? (it.cd ? `Active · ${it.cd}s recharge` : "Active · once per battle") : it.kind === "aura" ? "Aura" : "Passive"}</span>`;
// the hero's item slots: tap an item for its details (like the shop), with Sell and a way to the shop
function heroItemsHTML(slots) {
  const k = S.items.includes(sheet.hit) ? sheet.hit : null, it = k && ITEMS[k];
  return `<div class="sec"><div class="spread"><h3>Items <span class="cnt">${S.items.length}/${ITEM_SLOTS}</span></h3></div>
      <div class="islots tiny">${slots.map(x => x ? `<button class="islot${x === k ? " sel" : ""}" data-act="hitem" data-v="${x}" aria-label="${esc(ITEMS[x].name)}: details"><img alt="" src="${itemURL(x)}"><b>${esc(ITEMS[x].name)}</b></button>` : `<div class="islot empty"><span>Empty</span></div>`).join("")}</div>
      ${it ? `${udet(esc(it.name), null, `<p>${itemKindTag(it)} ${esc(itemDesc(k))}</p>`)}<div class="row"><button class="btn" data-act="isell" data-v="${k}" ${dis()}>Sell +${Math.floor(itemCost(k) / 2)}g</button><button class="btn small" data-act="shop">Shop</button></div>` : S.items.length ? `<p class="muted">Tap an item for its details.</p>` : ""}</div>`;
}
function castleSheet() {
  const tab = sheet.lobby ? "banner" : (sheet.tab || "recruit"), full = supplyFull(), ct = ctNow();
  let body = "";
  if (tab === "recruit") { const pk = sheet.pick || "footman", pu = UNITS[pk], need = UNIT_TIER[pk], lk = ct < need, sCap = false;
    body = `<p class="muted">Field <b>${fieldCount()}/${S.slots}</b> · ${S.owned.filter(u => placedAt(u.id)).length} placed · In waves <b>${garrisonCount()}/${garrisonCap()}</b>. ${supplyV2Now() ? `You can field ${FIELD_MAX} soldiers. More wait in the reinforcement waves you have unlocked and march out later.` : "Soldiers beyond your field supply wait in the garrison and march out in waves."}</p>
    <div class="ugrid shopg">${Object.entries(UNITS).filter(([, u]) => !u.merc && !u.tower).map(([k, u]) => tile("upick", k, pk === k, spriteURL(k), u.name, { price: u.cost, lk: ct < UNIT_TIER[k] })).join("")}</div>
    ${udet(pu.name, pu.cost, `<p>${pu.note}</p><p>${IC.hp(pu.hp)} ${IC.atk(pu.atk)}</p>${typeInfo(UNIT_TYPES[pk], "u-" + pk)}${lk ? `<p class="muted">Needs a ${tierName(need)}.</p>` : ""}`)}
    ${abar(`<button class="btn wax" data-act="buy" data-v="${pk}" ${dis(lk || full || sCap || avail() < pu.cost)}>${lk ? `Needs a ${tierName(need)}` : full ? (supplyV2Now() ? (wavesOpen() < WAVE_COUNT ? "Field full: unlock a wave" : "Field and waves full") : "Barracks and garrison full") : sCap ? `Siege limit ${SIEGE_MAX}` : `Recruit · ${pu.cost}g`}</button>`)}`; }
  if (tab === "garrison") { // the Train tab: pick a soldier, see its stats now and after training, then train or sell. The picked soldier's panel is always pinned at the bottom.
    const ts = sheet.tsel && findUnit(sheet.tsel) ? sheet.tsel : (S.owned[0] || {}).id || null, u = ts ? findUnit(ts) : null;
    let det = "", bar = "";
    if (!u) det = udet("No soldiers yet", null, `<p>Recruit soldiers in the Recruit tab first.</p>`);
    else { const st = unitStats(u), nx = u.lvl < 3 ? unitStats({ ...u, lvl: u.lvl + 1 }) : null, lk = ct < UNIT_LVL_TIER[u.lvl], dep = !!placedAt(u.id);
      det = udet(`${UNITS[u.type].name} · Lv${u.lvl}/3`, u.lvl < 3 ? upgradeCost(u) : null, `<div class="lvrow">${pipRow(u.lvl, 3)}<span class="st st-${dep ? "d" : "r"}">${dep ? "Deployed on the map" : inGarrison(u.id) ? "Waiting in a wave" : "In reserve"}</span></div>${u.cool > 0 ? `<p class="need">⏳ Recharging: ready in ${u.cool} day${u.cool > 1 ? "s" : ""}.</p>` : ""}${cmpBox([["Health", st.hp], ["Attack", st.atk]], UNITS[u.type].noUpgrade ? null : nx && [["Health", nx.hp], ["Attack", nx.atk]], nx ? `Lv${u.lvl + 1}` : "")}`);
      bar = `<button class="btn" data-act="usell" data-v="${u.id}" ${dis()}>Sell +${unitSellPrice(u)}g</button><button class="btn wax" data-act="up" data-v="${u.id}" ${dis(UNITS[u.type].noUpgrade || u.lvl >= 3 || lk || avail() < upgradeCost(u))}>${UNITS[u.type].noUpgrade ? "Can't be trained" : u.lvl >= 3 ? "Max level" : lk ? `Needs a ${tierName(UNIT_LVL_TIER[u.lvl])}` : `Train to Lv${u.lvl + 1} · ${upgradeCost(u)}g`}</button>`; }
    body = `<p class="muted">${S.owned.length} soldier${S.owned.length === 1 ? "" : "s"}. Tap one to see its stats and what training would add.</p><div class="ugrid shopg trainl">${S.owned.map(o => tile("tsel", o.id, ts === o.id, spriteURL(o.type), UNITS[o.type].name, { pips: [o.lvl, 3] })).join("")}</div><div class="trainfoot">${det}${bar ? abar(bar) : ""}</div>`; }
  if (tab === "deployment") body = deploymentTab();
  if (tab === "armoury") {
    const slots = [["weapon", "Weapon", "⚔"], ["armour", "Armour", "⛨"], ["charm", "Charm", "✦"], ["walls", "Bastion", "▦"], ["tower", "Tower", "➶"]];
    const selG = sheet.gear || "weapon", isDef = selG === "walls" || selG === "tower";
    const list = isDef ? DEFENCES[selG] : GEAR[selG], tier = isDef ? S.defences[selG] : S.gear[selG], cur = tier ? list[tier - 1] : null, nx = list[tier];
    const need = nx ? UPGRADE_NEEDS[selG][tier] : 0, locked = nx && ct < need;
    const effect = (k, tr) => { const g = { ...S.gear, [k]: tr };
      if (!tr && k !== "weapon" && k !== "armour") return k === "walls" ? [["Castle HP", BAL.castleHp]] : k === "tower" ? [["Tower damage", 20], ["Tower range", "3 tiles"]] : [["Effect", "None yet"]];
      if (k === "weapon") return [["Soldier attack", `+${15 * tr}%`], ...(tr >= 3 ? [["Lifesteal", "10% of damage dealt"]] : [])];
      if (k === "armour") return [["Soldier health", `+${15 * tr}%`], ...(tr >= 2 ? [["Damage taken", `−${[0, 0, 10, 20][tr]}%`]] : [])];
      if (k === "charm") return [["Move speed", "+15%"], ...(tr >= 2 ? [["Ability recharge", "20% faster"]] : []), ...(tr >= 3 ? [["Revive", "Twice as fast, full health"]] : [])];
      if (k === "walls") return [["Castle HP", Math.round(BAL.castleHp * (1 + .25 * tr) * CASTLE_TIERS[ct - 1].hp)]];
      return [["Tower damage", Math.round(20 * [1, 1.5, 2][tr])], ["Tower range", tr >= 2 ? "3.6 tiles" : "3 tiles"]]; };
    const lines = L => L.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("");
    body = `<div class="abtiles five">${slots.map(([k, l, g]) => { const tt = (k === "walls" || k === "tower") ? S.defences[k] : S.gear[k], mx = (k === "walls" || k === "tower") ? 2 : 3;
      return `<button class="abt${selG === k ? " on" : ""}${tt ? "" : " off"}" data-act="gsel" data-v="${k}" aria-label="${l}"><img class="aico" alt="" src="${ART.gear[k]}"><span class="pips">${Array.from({ length: mx }, (_, i) => `<i class="pip${i < tt ? " on" : ""}"></i>`).join("")}</span><small>${l}</small></button>`; }).join("")}</div>
    <div class="abd">
      <span class="dtag">Details</span><div class="spread"><b class="abn">${esc(cur ? cur.name : slots.find(x => x[0] === selG)[1])}</b><span class="muted">${isDef ? "Castle" : selG === "charm" ? "Hero" : "Soldiers"} · tier ${tier}/${list.length}</span></div>
      <div class="cmp"><div><span class="ilabel">Now</span>${lines(effect(selG, tier))}</div><div><span class="ilabel">${nx ? esc(nx.name) : "Next"}</span>${nx ? lines(effect(selG, tier + 1)) : `<p class="muted">Finest there is</p>`}</div></div>
      <p class="muted">Lasts all week.${locked ? ` Needs a ${tierName(need)}.` : ""}</p></div>
    ${abar(nx ? `<button class="btn wax" data-act="${isDef ? "defend" : "gear"}" data-v="${selG}" ${dis(avail() < nx.cost || locked)}>${locked ? `Needs a ${tierName(need)}` : `${isDef ? "Build" : "Forge"} · ${nx.cost}g`}</button>${locked ? `<button class="btn" data-act="ctab" data-v="keep">Castle tab</button>` : ""}` : `<button class="btn wax" disabled>Fully upgraded</button>`)}`;
  }
  if (tab === "keep") {
    const cur = CASTLE_TIERS[ct - 1], nx = CASTLE_TIERS[ct], ck = sheet.csel === "supply" ? "supply" : "castle", bedsFull = S.slots >= SLOT_MAX, hp = t => Math.round(BAL.castleHp * (1 + .25 * S.defences.walls) * t.hp);
    let det, bar;
    if (ck === "castle") { det = udet(`${cur.name} · tier ${ct}/3`, nx ? nx.cost : null, `<div class="lvrow">${pipRow(ct, 3)}</div>${cmpBox([["Castle HP", hp(cur)], ["Income a day", baseIncome(curDayNo()) + CASTLE_INCOME[ct - 1] + "g"]], nx && [["Castle HP", hp(nx)], ["Income a day", baseIncome(curDayNo()) + CASTLE_INCOME[ct] + "g"]], nx ? nx.name : "")}${nx ? `<p class="muted">${esc(nx.note)}</p>` : ""}`);
      bar = nx ? `<button class="btn wax" data-act="castleup" ${dis(avail() < nx.cost)}>Upgrade to ${nx.name} · ${nx.cost}g</button>` : `<button class="btn wax" disabled>Fully upgraded</button>`; }
    else if (supplyV2Now()) { const wo = wavesOpen(), wc = waveUnlockCost();
      det = udet(`Reinforcements · ${wo}/${WAVE_COUNT} waves`, wc ?? null, `<div class="lvrow">${pipRow(wo, WAVE_COUNT)}<span class="muted">${FIELD_MAX} soldiers start on the map</span></div><p>Each wave you unlock holds ${WAVE_SLOTS} more soldiers, who march out later in the battle alongside the wave's free footman. Waves unlock in order.</p>`);
      bar = wc != null ? `<button class="btn wax" data-act="wunlock" ${dis(avail() < wc)}>Unlock Wave ${wo + 1} · ${wc}g</button>` : `<button class="btn wax" disabled>All waves unlocked</button>`; }
    else { det = udet(`Supply · ${S.slots}/${SLOT_MAX}`, bedsFull ? null : slotCost(S.slots), `<div class="lvrow">${pipRow(S.slots, SLOT_MAX)}<span class="muted">Each point of supply lets you field one more soldier</span></div>${cmpBox([["Supply", S.slots]], bedsFull ? null : [["Supply", S.slots + 1]])}`);
      bar = `<button class="btn wax" data-act="slot" ${dis(bedsFull || avail() < slotCost(S.slots))}>${bedsFull ? `Supply maxed (${SLOT_MAX})` : `Raise supply to ${S.slots + 1} · ${slotCost(S.slots)}g`}</button>`; }
    body = `<div class="ugrid two shopg">${tile("csel", "castle", ck === "castle", `icons/ui/castle${ct}.webp`, cur.name, { price: nx ? nx.cost : null, pips: [ct, 3] })}${supplyV2Now() ? tile("csel", "supply", ck === "supply", ART.wave, "Waves", { price: waveUnlockCost() ?? null, pips: [wavesOpen(), WAVE_COUNT] }) : tile("csel", "supply", ck === "supply", "icons/ui/supply.webp", "Supply", { price: bedsFull ? null : slotCost(S.slots), pips: [S.slots, SLOT_MAX] })}</div>${det}${abar(bar)}`;
  }
  if (tab === "shop") {
    const keys = Object.keys(ITEMS), pages = Math.ceil(keys.length / ISH_PAGE), ik = ITEMS[sheet.ish] ? sheet.ish : keys[0], it = ITEMS[ik];
    const pg = Math.max(0, Math.min(pages - 1, sheet.ipg != null ? sheet.ipg : Math.floor(keys.indexOf(ik) / ISH_PAGE)));
    const own = S.items.includes(ik), lk = !!it.unique && rapierTaken(ik), fullI = S.items.length >= ITEM_SLOTS;
    return `<header><h2>Shop</h2><span class="gchip"><i class="coin"></i>${S.gold}</span><button class="x" data-act="close" aria-label="Close">✕</button></header><div class="body nshop">${myTwist() === "market" ? `<p class="twistnote">${TWISTS.market.icon} <b>Market Day</b>: every item is 25% off today.</p>` : ""}
      <div class="toprow"><div class="islots tiny">${Array.from({ length: ITEM_SLOTS }, (_, i) => S.items[i] || null).map(k => k ? `<button class="islot${k === ik ? " sel" : ""}" data-act="ish" data-v="${k}"><img alt="" src="${itemURL(k)}"></button>` : `<div class="islot empty"><span>·</span></div>`).join("")}</div>
</div>
      <div class="ugrid shopg">${keys.slice(pg * ISH_PAGE, pg * ISH_PAGE + ISH_PAGE).map(k => tile("ish", k, k === ik, itemURL(k), esc(ITEMS[k].name), S.items.includes(k) ? { own: 1 } : { price: buyCost(k) })).join("")}</div>
      <div class="pg below"><button class="btn small" data-act="ipg" data-v="${pg - 1}" ${dis(pg <= 0)} aria-label="Previous items">‹</button><span>Page ${pg + 1} of ${pages}</span><button class="btn small" data-act="ipg" data-v="${pg + 1}" ${dis(pg >= pages - 1)} aria-label="More items">›</button></div>
      ${udet(esc(it.name), own ? itemCost(ik) : buyCost(ik), `<p>${itemKindTag(it)} ${esc(itemDesc(ik))}</p>`)}
      ${own && ik === "antimagic" && !shellV2Now() ? `<div class="sec tight"><h3>Shell timing</h3><div class="reach"><span class="stepper"><button class="btn small" data-act="shellat" data-v="-1" ${dis((S.shellAt || 2) <= 1 || S.locked)}>−</button><b>${S.shellAt || 2}s</b><button class="btn small" data-act="shellat" data-v="1" ${dis((S.shellAt || 2) >= 10 || S.locked)}>+</button></span><span class="muted">after you meet an enemy hero</span></div></div>` : ""}
      ${abar(own ? `<button class="btn wax" data-act="isell" data-v="${ik}">Sell +${Math.floor(itemCost(ik) / 2)}g</button>` : `<button class="btn wax" data-act="ibuy" data-v="${ik}" ${dis(lk || fullI || avail() < buyCost(ik))}>${lk ? "Held by a rival" : fullI ? "Slots full" : `Buy · ${buyCost(ik)}g`}</button>`)}</div>`;
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
    // Defences: traps are bought here and then placed (move or sell them from the map); walls are built straight onto the map; Tower I and Tower II are bought, upgraded and sold here
    const wt = WALL_TIERS[ct - 1], lim = wallLimit(ct), have = S.walls.length, towers = S.traps.filter(x => x.type === "tower"), trapKeys = Object.keys(TRAPS).filter(k => k !== "tower");
    const dk = sheet.dsel && (trapKeys.includes(sheet.dsel) || ["wall+", "tw1", "tw2"].includes(sheet.dsel)) ? sheet.dsel : findTrap(sheet.dsel) && findTrap(sheet.dsel).type === "tower" ? "tw" + (towers.indexOf(findTrap(sheet.dsel)) + 1) : trapKeys[0];
    let det, bar;
    if (dk === "wall+") {
      det = udet(wt.name, WALL_COST, `<div class="statrows">${rows([["Health", `${wt.hp} HP`], ["Size", "1 block, either way round"], ["Built", `${have} of ${lim}`], ["Rebuilds", "Free every day"]])}</div><p class="muted">Enemies must chop through or walk round, and your own soldiers go round them too. A castle upgrade strengthens every wall. Walls can't be moved: sell one on the map and build it again.</p>`);
      bar = have < lim ? `<button class="btn wax" data-act="wbuild" ${dis(avail() < WALL_COST)}>Build walls on the map · ${WALL_COST}g each</button>` : `<button class="btn wax" disabled>All ${lim} walls built</button>`; }
    else if (dk === "tw1" || dk === "tw2") { const n = +dk[2], nm = `Tower ${["I", "II"][n - 1]}`, tw = towers[n - 1];
      // a tower slot works like the Train tab: its stats now beside the stats of the upgrade picked below, so nothing is bought blind
      if (tw) { const k = towerKey(tw), u = UNITS[k], up = TOWER_UP[k], where = placedAt(tw.id), to = up ? (up.to.includes(sheet.tpick) ? sheet.tpick : up.to[0]) : null, lk = up && ct < up.tier;
        const pick = up && up.to.length > 1 ? `<div class="ugrid shopg tpick">${up.to.map(x => tile("tpick", x, to === x, ART.tower[x] || spriteURL(x), UNITS[x].name.replace(/ Tower/, ""), { price: up.cost, lk })).join("")}</div>` : "";
        det = udet(`${nm}: ${u.name}`, null, `<p>${u.note}</p>${up ? `<p class="muted">${up.to.length > 1 ? "Pick an upgrade below to compare it." : `Upgrade to ${UNITS[to].name}:`}</p>` : ""}${pick}${cmpBox(towerStats(k), to && towerStats(to), to ? UNITS[to].name : "")}${to ? `<p class="muted">${UNITS[to].note}</p>` : ""}<p class="muted">${where ? "Standing in your field." : "Waiting to be placed."} Towers can't be moved: sell it and buy it again to stand it somewhere else.</p>`);
        bar = (where ? "" : `<button class="btn wax" data-act="move" data-v="${tw.id}" ${dis()}>Place it</button>`) + `<button class="btn" data-act="tsell" data-v="${tw.id}" ${dis()}>Sell +${Math.floor(towerSpent(k) / 2)}g</button>` + (up ? `<button class="btn wax" data-act="tup" data-v="${tw.id}" data-k="${to}" ${dis(avail() < up.cost || lk)}>${lk ? `Needs a ${CASTLE_TIERS[up.tier - 1].name}` : `Upgrade to ${UNITS[to].name} · ${up.cost}g`}</button>` : ""); }
      else { const t = TRAPS.tower; det = udet(`${nm}: ${t.name}`, t.cost, `<p>${t.note}</p><div class="statrows">${rows(towerStats("tower"))}</div><p class="muted">Buy it, then tap a tile to stand it there. It stays put: it can't be moved, only sold.</p>`);
        bar = `<button class="btn wax" data-act="trap" data-v="tower" ${dis(avail() < t.cost || !trapRoom("tower"))}>Buy · ${t.cost}g</button>`; } }
    else { const t = TRAPS[dk]; det = udet(t.name, t.cost, `<p>${t.note}</p><div class="statrows">${rows(TRAP_STATS[dk] || [])}</div><p class="muted">Permanent. Buy once, it fires once every battle. Move or sell it from the map. You own ${trapCount(false)} of ${TRAP_CAP} traps.</p>`);
      bar = `<button class="btn wax" data-act="trap" data-v="${dk}" ${dis(avail() < t.cost || !trapRoom(dk))}>Buy · ${t.cost}g</button>`; }
    const twTile = n => { const tw = towers[n - 1]; return tile("dsel", "tw" + n, dk === "tw" + n, tw ? defenceArt(tw) : trapImg("tower"), `Tower ${["I", "II"][n - 1]}`, tw ? { own: 1 } : { price: TRAPS.tower.cost }); };
    // the three limits at a glance: traps, towers and walls owned out of the most allowed
    const cap = (img, label, n, max) => `<span class="dcap${n >= max ? " full" : ""}" title="${label}: ${n} of ${max}"><img alt="" src="${img}"><small>${label}</small><b>${n}/${max}</b></span>`;
    const caps = `<div class="dcaps">${cap(trapImg("spike"), "Traps", trapCount(false), TRAP_CAP)}${cap(trapImg("tower"), "Towers", towers.length, TOWER_CAP)}${cap(`icons/ui/wall${ct}.webp`, "Walls", have, lim)}</div>`;
    body = `${caps}<div class="ugrid shopg">${trapKeys.map(k => tile("dsel", k, dk === k, trapImg(k), TRAPS[k].name, { price: TRAPS[k].cost })).join("")}${tile("dsel", "wall+", dk === "wall+", `icons/ui/wall${ct}.webp`, "Walls", { price: WALL_COST })}${twTile(1)}${twTile(2)}</div>${det}${abar(bar)}`;
  }
  if (sheet.lobby) return head(null, "Coat of arms", "Shown on your castle and banner all war") + `<div class="body">${body}<div class="row"><button class="btn wax" data-act="lobbydone">Done</button></div></div>`;
  return head(null, sheet.grp === "army" ? "Army" : "Base", `Tier ${ct} ${tierName(ct)} · ${S.gold} gold in the treasury`) + `<div class="body">
    <div class="tabs scrolltabs${sheet.grp ? " three" : ""}">${[["recruit", "Recruit"], ["garrison", "Train"], ["deployment", "Deploy"], ["keep", "Castle"], ["traps", "Defences"], ["armoury", "Armoury"]].filter(([k]) => (sheet.grp === "army" ? ["recruit", "garrison", "deployment"] : ["keep", "traps", "armoury"]).includes(k) || !sheet.grp).map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-act="ctab" data-v="${k}"><img class="tabi" alt="" src="icons/ui/${{ recruit: "recruit", garrison: "roster", deployment: "units", keep: "castle" + ct, traps: "defences", armoury: "armoury", shop: "shop" }[k]}.webp">${l}</button>`).join("")}</div>${body}</div>`;
}
function wallSheet(id) {
  const w = findWall(id); if (!w) return head(null, "Wall", "") + `<div class="body"><p class="muted">That wall is gone.</p></div>`;
  const ct = ctNow(), t = WALL_TIERS[ct - 1];
  return head(null, t.name, `1 block · ${t.hp} HP · ${w.dir === "h" ? "running east–west" : "running north–south"}`) + `<div class="body">
    <div class="bpreview"><img class="wide" alt="" src="${wallURL(ct)}"></div>
    <p class="muted">Enemies stop and chop at walls that block their path, or walk around them. Your own soldiers walk round them too. A castle upgrade strengthens every wall you own. Walls rebuild free each day.</p>
    <p class="muted">Walls can't be moved. Sell this one and build another where you want it.</p>
    <div class="row"><button class="btn wood" data-act="wrot" data-v="${id}" ${dis()}>Turn</button><button class="btn wax" data-act="wsell" data-v="${id}" ${dis()}>Sell +${Math.floor(WALL_COST / 2)}g</button></div></div>`;
}
const abilCD = (k, r) => r ? COOLDOWN[S.cls][k] * BAL.cd * (1 - .1 * (r - 1)) * (S.gear.charm >= 2 ? .8 : 1) : null;
function champSheet() {
  if (heroV3Now()) return champSheetV3();
  const c = cls(), abil = [...c.abilities.map(a => ({ ...a })), { key: "ult", name: c.ult.name, desc: c.ult.desc, ult: true }, { key: "a4", name: "Vigour", desc: "Toughens your hero. More health and damage with every rank.", vig: true }];
  const selK = sheet.ab || "a1", A0 = abil.find(a => a.key === selK), r = S.ranks[selK] || 0, max = rankMax(selK), now = champNow();
  const need = r >= max ? "Fully learned" : A0.ult ? (level() < ULT_AT[r] ? `Rank ${r + 1} opens at level ${ULT_AT[r]}` : "") : A0.vig ? "" : (level() < r * 2 + 1 ? `Rank ${r + 1} opens at level ${r * 2 + 1}` : "");
  const lines = (L) => L ? L.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("") : `<p class="muted">Not learned</p>`;
  let nowL = abilLines(selK, r), nextL = r < max ? abilLines(selK, r + 1) : null;
  if (nextL && nowL) { const a = nowL.find(x => x[0] === "Recharge"), bI = nextL.findIndex(x => x[0] === "Recharge"); if (a && bI > -1) { const d = parseFloat(nextL[bI][1]) - parseFloat(a[1]); if (Math.abs(d) >= .05) nextL[bI] = [nextL[bI][0], `${nextL[bI][1]} <i class="dl">${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(1)}s</i>`]; } }
  const canChange = !isLive(), L = level(), nd = xpNeed(L), xp = Math.min(S.xp || 0, nd);
  const slots = Array.from({ length: ITEM_SLOTS }, (_, i) => S.items[i] || null);
  return head(spriteURL("c-" + S.cls), `${c.name} Hero`, `Level ${L} · ${freePts()} skill point${freePts() === 1 ? "" : "s"} to spend`) + `<div class="body">
    ${S.ob === 2 ? `<div class="obbox"><b>Step 1 of 2 · Choose your hero</b><span>Pick a class below, then spend your first skill point on an ability.</span><button class="btn wax" data-act="obnext">Next: design your banner →</button></div>` : ""}
    <div class="xpbar" title="Experience toward the next level"><i style="width:${Math.round(xp / nd * 100)}%"></i><span>Level ${L} · ${xp}/${nd} XP</span></div>
    <p class="muted xpnote">Gains ${lvlV2Now() ? MIN_GAIN_V2 : MIN_GAIN} to ${xpCapNow()} levels a day in battle. Every level is one skill point.</p>
    <div class="stats"><span>${IC.hp(now.hp)}</span><span>${IC.atk(atkSplit(now.atk, itemAtk(S.items)))}</span></div>${typeInfo(heroTypes(S.cls, balV5Now()), "hero")}
    <div class="row"><button class="btn small wood" data-act="move" data-v="champ" ${dis()}>Move on the map</button><span class="muted">then tap a glowing tile</span></div>
    ${canChange ? `<div><button class="btn wood" data-act="heropick" ${dis()}>Change hero…</button></div>` : ""}
    <div class="abtiles five">${abil.map(a => { const rr = S.ranks[a.key] || 0, mx = rankMax(a.key), cd = isPassive(a.key) ? "passive" : abilCD(a.key, rr || 1).toFixed(0) + "s";
      return `<button class="abt${selK === a.key ? " on" : ""}${rr ? "" : " off"}${a.ult ? " ult" : ""}${a.vig ? " vig" : ""}" data-act="abil" data-v="${a.key}" aria-label="${esc(a.name)}"><img class="aico" alt="" src="${spellURL(a.vig ? "hero_a4" : S.cls + "_" + a.key, 64)}"><span class="pips">${Array.from({ length: mx }, (_, i) => `<i class="pip${i < rr ? " on" : ""}"></i>`).join("")}</span><small class="cdchip">${cd}</small>${canRank(a.key) ? `<em>+</em>` : ""}</button>`; }).join("")}</div>
    <div class="abd">
      <div class="spread"><b class="abn">${esc(A0.name)}${A0.ult ? " · Ultimate" : ""}${isPassive(selK) ? " · Passive" : ""}</b><span class="muted">Rank ${r}/${max}</span></div>
      <p class="muted">${esc(A0.desc)}</p>
      <div class="cmp"><div><span class="ilabel">Now</span>${lines(nowL)}</div><div><span class="ilabel">${r < max ? `Rank ${r + 1}` : "Next"}</span>${r < max ? lines(nextL) : `<p class="muted">Maxed</p>`}</div></div>
      <div class="row"><button class="btn ${canRank(selK) ? "wax" : "wood"}" data-act="rank" data-k="${selK}" ${canRank(selK) ? "" : "disabled"}>${r ? "Level up" : "Learn"}</button><span class="muted">${need}</span></div>
      ${!A0.ult && !A0.vig ? (r >= 3 ? `<div class="choices">${A0.choice.map(([n, dd]) => `<button class="choice${S.picks[selK] === n ? " on" : ""}" data-act="choose" data-k="${selK}" data-v="${esc(n)}" ${dis()}><b>${esc(n)}</b>${esc(dd)}</button>`).join("")}</div>`
        : `<p class="muted">At rank 3, pick an upgrade: ${A0.choice.map(([n]) => `<b>${esc(n)}</b>`).join(" or ")}.</p>`) : ""}
      ${isPassive(selK) ? "" : `<label class="inline">Cast<select data-act="trig" data-k="${selK}" ${dis(!r)}>${opts(TRIGGERS, S.triggers[selK])}</select></label>`}
    </div>
    ${heroItemsHTML(slots)}
    <div><button class="btn small" data-act="open" data-v="spells">Spell book</button></div></div>`;
}
