// Unit and trap sheets

function unitSheet(id) {
  const u = findUnit(id), b = UNITS[u.type], s = unitStats(u);
  return head(spriteURL(u.type), `${b.name}`, `Level ${u.lvl} · ${esc(b.note)}`) + `<div class="body">
    <p class="muted">${typeLine(UNIT_TYPES[u.type])}</p><div class="stats"><span>${IC.hp(Math.round(s.hp * (u.hp ?? 1)) + "/" + s.hp)}</span><span>${IC.atk(s.atk)}</span><span>Level <b>${u.lvl}</b>/3</span></div>
    <div class="row">
      <button class="btn wood" data-act="up" data-v="${u.id}" ${dis(u.lvl >= 3 || ctNow() < UNIT_LVL_TIER[u.lvl] || avail() < upgradeCost(u))}>${u.lvl >= 3 ? "Fully trained" : ctNow() < UNIT_LVL_TIER[u.lvl] ? `Needs a ${tierName(UNIT_LVL_TIER[u.lvl])}` : `Train to Lv${u.lvl + 1} · ${upgradeCost(u)}g`}</button>
      <button class="btn" data-act="move" data-v="${u.id}" ${dis()}>Move</button>
      <button class="btn" data-act="bench" data-v="${u.id}" ${dis()}>Back to barracks</button>
      <button class="btn" data-act="usell" data-v="${u.id}" ${dis()}>Sell · +${unitSellPrice(u)}g</button></div>
    <p class="muted">${(u.hp ?? 1) < 1 ? "Still recovering from yesterday's battle. Fallen soldiers return at half health. " : ""}Soldiers follow your War Orders: stance, target priority and if-then commands.</p></div>`;
}
function trapSheet(id) {
  const t = findTrap(id), d = TRAPS[t.type];
  return head(trapURL(t.type), d.name, "Tonight only") + `<div class="body"><p>${esc(d.note)}</p>
    <div class="row"><button class="btn" data-act="move" data-v="${id}" ${dis()}>Move</button><button class="btn" data-act="bench" data-v="${id}" ${dis()}>Pick up</button></div></div>`;
}
