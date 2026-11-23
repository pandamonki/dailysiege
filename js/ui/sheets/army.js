// Unit and trap sheets

function unitSheet(id) {
  const u = findUnit(id), b = UNITS[u.type], s = unitStats(u);
  return head(spriteURL(u.type), `${b.name}`, `Level ${u.lvl} · ${esc(b.note)}`) + `<div class="body">
    ${typeInfo(UNIT_TYPES[u.type], "unit")}<div class="stats"><span>${IC.hp(Math.round(s.hp * (u.hp ?? 1)) + "/" + s.hp)}</span><span>${unitPower(u.type, s.atk)}</span><span>Level <b>${u.lvl}</b>/3</span></div>
    <div class="row">
      <button class="btn" data-act="move" data-v="${u.id}" ${dis()}>Move</button>
      <button class="btn" data-act="bench" data-v="${u.id}" ${dis()}>Back to barracks</button>
      <button class="btn" data-act="usell" data-v="${u.id}" ${dis()}>Sell · +${unitSellPrice(u)}g</button>
      <button class="btn wax" data-act="up" data-v="${u.id}" ${dis(u.lvl >= 3 || ctNow() < UNIT_LVL_TIER[u.lvl] || avail() < upgradeCost(u))}>${u.lvl >= 3 ? "Fully trained" : ctNow() < UNIT_LVL_TIER[u.lvl] ? `Needs a ${tierName(UNIT_LVL_TIER[u.lvl])}` : `Train to Lv${u.lvl + 1} · ${upgradeCost(u)}g`}</button></div>
    <p class="muted">Every soldier starts each battle at full health and fights on to the end. Where it goes follows your army plan, and what it fights first follows your combat groups.</p></div>`;
}
function trapSheet(id) {
  const t = findTrap(id), d = t.type === "tower" ? { ...UNITS[towerKey(t)], cost: towerSpent(towerKey(t)) } : TRAPS[t.type];
  return head(defenceArt(t), d.name, t.type === "tower" ? "Stationary defender" : "Permanent") + `<div class="body"><p>${esc(d.note)}</p>
    <div class="row">${t.type === "tower" ? `<button class="btn wax" data-act="opencastle" data-v="traps" data-k="${id}">Upgrade</button>` : `<button class="btn" data-act="move" data-v="${id}" ${dis()}>Move</button>`}<button class="btn" data-act="tsell" data-v="${id}" ${dis()}>Sell +${Math.floor(d.cost / 2)}g</button></div>${t.type === "tower" ? `<p class="muted">Towers can't be moved: sell it and buy it again to stand it somewhere else.</p>` : ""}</div>`;
}
