// The hero screen for skill-tree heroes: three trees side by side, a red rank square on every skill, a red badge with the points to spend.
// Spec: docs/hero-skill-trees.md. Points are spent only here, by the player. Nothing skills itself in a battle.

const nodeKey = (bi, i) => `${bi}.${i}`;
function treeSelection() { // the skill whose details show below: the one tapped, else the first one that can be learned, else the first
  const [bi, i] = (sheet.tn || "").split(".").map(Number);
  if (bi >= 0 && bi < 3 && i >= 0 && i < 6) return [bi, i];
  TREE_NAME_CLS = S.cls;
  for (let b = 0; b < 3; b++) for (const n of [5, 3, 1, 0]) if (treeCanLearn(S.tree, TREE_BKEY[b], n, level())) return [b, n];
  return [0, 0];
}
function treeNodeState(bi, i) {
  const tr = S.tree, b = TREE_BKEY[bi], rank = tr[b][i], L = level(); TREE_NAME_CLS = S.cls;
  const need = treeNeeds(tr, b, i, L), ready = need.list.every(x => x.ok);
  if (need.maxed) return { st: "maxed", rank, miss: 0 };
  if (ready && treeFree(tr, L) > 0) return { st: "avail", rank, miss: 0 };
  if (rank > 0) return { st: "learned", rank, miss: 0 };
  if (ready) return { st: "wait", rank, miss: 0 }; // everything is met, only a skill point is missing
  const pts = need.list.find(x => !x.ok && x.miss > 0 && /points/.test(x.text));
  return { st: "locked", rank, miss: pts ? pts.miss : 0 };
}
function treeNodeHTML(bi, i, sel) {
  const node = TREES[S.cls][bi].nodes[i], s = treeNodeState(bi, i), side = i === 2 || i === 4, ult = i === 5;
  const badge = s.st === "locked" ? `<i class="miss">${s.miss ? "+" + s.miss : "🔒"}</i>` : `<i class="rk">${s.rank}/${TREE_MAX[i]}</i>`;
  return `<button class="tn st-${s.st}${i === 0 ? " base" : ""}${side ? " side" : ""}${ult ? " ult" : ""}${sel ? " sel" : ""}" data-act="tnode" data-v="${nodeKey(bi, i)}" aria-label="${esc(node.name)}, ${s.rank} of ${TREE_MAX[i]}"><span class="ti"><img alt="" src="${spellURL(node.ic, 96)}">${badge}</span><span class="tl">${esc(node.name)}</span></button>`;
}
function treeColumnHTML(bi, sel) {
  const tr = TREES[S.cls][bi], pts = treePts(S.tree, TREE_BKEY[bi]), N = (i) => treeNodeHTML(bi, i, sel[0] === bi && sel[1] === i);
  return `<div class="tcol${pts ? " on" : ""}"><div class="tch"><b>${esc(tr.name)}</b><span>${pts} pt${pts === 1 ? "" : "s"}</span></div>
    <div class="tbody"><div class="trow">${N(5)}<span></span></div><div class="trow">${N(3)}${N(4)}</div><div class="trow">${N(1)}${N(2)}</div><div class="trow">${N(0)}<span></span></div></div></div>`;
}
function treeDetailHTML(bi, i) {
  const node = TREES[S.cls][bi].nodes[i], b = TREE_BKEY[bi], rank = S.tree[b][i], max = TREE_MAX[i], L = level(); TREE_NAME_CLS = S.cls;
  const need = treeNeeds(S.tree, b, i, L), free = treeFree(S.tree, L), canL = treeCanLearn(S.tree, b, i, L), kind = { passive: "Passive", trigger: "Trigger", synergy: "Synergy", ultimate: "Ultimate" }[node.kind] || "";
  const kindName = (i === 2 || i === 4) ? "Side talent" : i === 3 ? "Synergy" : kind;
  const now = nodeDesc(S.cls, bi, i, Math.max(1, rank)), nxt = rank >= 1 && rank < max && node.v.length ? nodeDesc(S.cls, bi, i, rank + 1) : null;
  const reqs = need.maxed ? [] : [...need.list, { ok: free > 0, text: free > 0 ? `A skill point to spend (${free} free)` : "A skill point to spend (none free yet: your hero gains them as it levels up)" }];
  const unmet = reqs.filter(x => !x.ok), cd = node.kind === "trigger" && node.cd ? `<div class="row muted">Recharge about ${Math.round(node.cd * BAL.cd)}s</div>` : node.kind === "ultimate" ? `<div class="row muted">Once per battle, and only if you plan it for the night. It rests the next day.</div>` : "";
  const label = need.maxed ? "Fully learned" : canL ? (rank ? "Level up (1 point)" : `Learn ${esc(node.name)} (1 point)`) : unmet.some(x => !/skill point/.test(x.text)) ? "Locked" : "No skill point to spend";
  return `<div class="det tdet"><img class="tdico" alt="" src="${spellURL(node.ic, 96)}"><h3><span>${esc(node.name)}</span><em>${kindName} · ${rank}/${max}</em></h3>
    <p>${esc(rank ? now : `Rank 1: ${now}`)}</p>${nxt ? `<p class="muted">Next rank: ${esc(nxt)}</p>` : ""}${cd}
    ${reqs.length ? `<div class="req">${reqs.map(x => `<div class="${x.ok ? "ok" : "no"}"><i>${x.ok ? "✓" : "✕"}</i>${esc(x.text)}</div>`).join("")}</div>` : ""}</div>
    <button class="btn wood tlearn${canL ? "" : " off"}" data-act="tlearn" data-v="${nodeKey(bi, i)}" ${canL && !S.locked ? "" : "disabled"}>${S.locked && canL ? "Orders are sealed" : label}</button>`;
}
// the two tabs at the top of a hero screen (yours or a rival's), styled like the Army and Base tabs
function heroTabs(tab, free) {
  return `<div class="tabs scrolltabs two">${[["abilities", "Abilities", "ultimate"], ["items", "Items", "armoury"]].map(([k, l, ic]) => `<button class="${tab === k ? "on" : ""}" data-act="ctab" data-v="${k}"><img class="tabi" alt="" src="icons/ui/${ic}.webp">${l}${k === "abilities" && free ? `<sup class="dot" title="Skill points to spend">${free}</sup>` : ""}</button>`).join("")}</div>`;
}
const gearLines = g => GEAR_SLOTS.map(([gk, gl]) => { const lv = (g || {})[gk], x = lv ? GEAR[gk][lv - 1] : null; return `<div class="gline${x ? "" : " none"}"><span>${gl}</span><b>${x ? esc(x.name) : "None"}</b>${x ? `<small>${esc(x.desc)}</small>` : ""}</div>`; }).join("");
function champSheetV3() {
  const c = cls(), L = level(), nd = xpNeed(L), xp = Math.min(S.xp || 0, nd), free = freePts(), now = champNowV3();
  const tab = sheet.tab === "items" ? "items" : "abilities";
  const sel = treeSelection(), learned = treeHasUlt(S.tree), cool = typeof ultCooling === "function" && ultCooling();
  const slots = Array.from({ length: ITEM_SLOTS }, (_, i) => S.items[i] || null);
  const common = `<div class="xpbar" title="Experience toward the next level"><i style="width:${Math.round(xp / nd * 100)}%"></i><span>Level ${L} · ${xp}/${nd} XP</span></div>
    <div class="stats"><span>${IC.hp(now.hp)}</span><span>${IC.atk(now.atk)}</span><span>${typeLine(CLASS_TYPES[S.cls])}</span></div>`;
  const abilities = `<div class="tpoints${free ? " has" : ""}" title="Skill points to spend"><span class="plus">+</span><b>${free}</b><small>skill point${free === 1 ? "" : "s"}</small></div>
    ${common}
    <div class="tcols">${[0, 1, 2].map(bi => treeColumnHTML(bi, sel)).join("")}</div>
    ${treeDetailHTML(sel[0], sel[1])}
    <p class="muted">Your hero gains a skill point at every level (15 in all, enough to max one tree and a little more), but only you spend them, here. Nothing skills itself in a battle. The ultimate needs level ${TREE_ULT_LVL}, and you can learn only one.</p>
    <div><button class="btn ${S.ultArm && learned && !cool ? "wax" : "wood"}" data-act="ultarm" ${dis(!learned || cool)}>${!learned ? "Ultimate not learned yet" : cool ? "Ultimate recharging until tomorrow" : S.ultArm ? "Ultimate planned for tonight ✓ (tap to cancel)" : "Plan the ultimate for tonight"}</button></div>`;
  const items = `${common}
    <div class="sec"><div class="spread"><h3>Items (${S.items.length}/${ITEM_SLOTS})</h3><button class="btn small wood" data-act="shop">Shop</button></div>
      <div class="islots tiny">${slots.map(k => k ? `<div class="islot" title="${esc(ITEMS[k].desc)}"><img alt="" src="${itemURL(k)}"><b>${esc(ITEMS[k].name)}</b></div>` : `<div class="islot empty"><span>Empty</span></div>`).join("")}</div></div>
    <div class="sec"><h3>Gear</h3>${gearLines(S.gear)}</div>
    <div><button class="btn small" data-act="open" data-v="spells">Spell book</button></div>`;
  return head(spriteURL("c-" + S.cls), `${c.name} Hero`, `Level ${L} of ${MAX_HERO_LVL_V3}`) + `<div class="body">
    ${S.ob === 2 ? `<div class="obbox"><b>Step 1 of 2 · Choose your hero</b><span>Pick a class, then spend your first skill point in a tree.</span><button class="btn wax" data-act="obnext">Next: design your banner →</button></div>` : ""}
    ${heroTabs(tab, free)}${tab === "items" ? items : abilities}</div>`;
}
// ----- a rival's hero, as it fought yesterday (read only) -----
function rivalHeroData(r) {
  if (!r || !seeArmies()) return null;
  if (isLive()) { const p = r.seen; return p && p.cls ? { cls: p.cls, level: p.level || 1, tree: p.tree || null, ranks: p.ranks || {}, items: (p.items || []).filter(Boolean), gear: p.gear || {} } : null; }
  const i = RIVALS.indexOf(r), lv = Math.max(1, 2 * (DAY - 1) - 1), v3 = heroV3Now(); // practice bots: rebuilt the way their orders were made
  return { cls: r.cls, level: Math.min(heroMaxLvl(v3), lv), tree: v3 ? autoTree(lv, i + 3, r.cls) : null, ranks: autoRanks(Math.min(MAX_HERO_LVL, lv), i + 3), items: botItems(i), gear: { weapon: Math.floor(hash(i, 1, 21) * 3), armour: Math.floor(hash(i, 2, 22) * 3), charm: Math.floor(hash(i, 3, 23) * 2) } };
}
function rTreeNode(cls, tree, bi, i, on) {
  const node = TREES[cls][bi].nodes[i], rank = (tree[TREE_BKEY[bi]] || [])[i] || 0, st = rank >= TREE_MAX[i] ? "maxed" : rank > 0 ? "learned" : "locked", side = i === 2 || i === 4;
  return `<button class="tn st-${st}${i === 0 ? " base" : ""}${side ? " side" : ""}${i === 5 ? " ult" : ""}${on ? " sel" : ""}" data-act="tnode" data-v="${nodeKey(bi, i)}" aria-label="${esc(node.name)}, ${rank} of ${TREE_MAX[i]}"><span class="ti"><img alt="" src="${spellURL(node.ic, 96)}">${rank ? `<i class="rk">${rank}/${TREE_MAX[i]}</i>` : ""}</span><span class="tl">${esc(node.name)}</span></button>`;
}
function rivalHeroSheet(id) {
  const r = RIVALS.find(x => x.id === id), h = rivalHeroData(r);
  if (!r || !h) return head(null, r ? `${r.name}'s hero` : "Rival hero", "Nothing scouted yet") + `<div class="body"><p class="muted">You haven't seen this hero fight yet. After a battle you can see its skills and items here.</p></div>`;
  const tab = sheet.tab === "items" ? "items" : "abilities", c = CLASSES[h.cls], v3 = heroV3Now() && h.tree, b = v3 ? CHAMP_V3[h.cls] : CHAMP[h.cls], L = h.level;
  const hp = Math.round(b.hp * (v3 ? hpLvV3(L) : 1 + .08 * (L - 1))), atk = Math.round(b.atk * (v3 ? atkLvV3(L) : 1 + .06 * (L - 1)));
  const stats = `<div class="stats"><span>${IC.hp(hp)}</span><span>${IC.atk(atk)}</span><span>${typeLine(CLASS_TYPES[h.cls])}</span></div>`;
  let abil;
  if (h.tree) {
    const rows = TREE_BKEY.map(k => h.tree[k] || []); let [sb, si] = (sheet.tn || "").split(".").map(Number);
    if (!(sb >= 0 && sb < 3 && si >= 0 && si < 6)) { sb = 0; si = 0; outer: for (const n of [5, 4, 3, 2, 1, 0]) for (let bi = 0; bi < 3; bi++) if ((rows[bi][n] || 0) > 0) { sb = bi; si = n; break outer; } }
    const col = bi => { const tr = TREES[h.cls][bi], pts = rows[bi].reduce((a, x) => a + (x || 0), 0), N = i => rTreeNode(h.cls, h.tree, bi, i, sb === bi && si === i);
      return `<div class="tcol${pts ? " on" : ""}"><div class="tch"><b>${esc(tr.name)}</b><span>${pts} pt${pts === 1 ? "" : "s"}</span></div><div class="tbody"><div class="trow">${N(5)}<span></span></div><div class="trow">${N(3)}${N(4)}</div><div class="trow">${N(1)}${N(2)}</div><div class="trow">${N(0)}<span></span></div></div></div>`; };
    const node = TREES[h.cls][sb].nodes[si], rank = rows[sb][si] || 0, kind = si === 2 || si === 4 ? "Side talent" : si === 3 ? "Synergy" : { passive: "Passive", trigger: "Trigger", synergy: "Synergy", ultimate: "Ultimate" }[node.kind] || "";
    abil = `<div class="tcols">${[0, 1, 2].map(col).join("")}</div>
      <div class="det tdet"><img class="tdico" alt="" src="${spellURL(node.ic, 96)}"><h3><span>${esc(node.name)}</span><em>${kind} · ${rank}/${TREE_MAX[si]}</em></h3><p>${esc(nodeDesc(h.cls, sb, si, Math.max(1, rank)))}</p>${rank ? "" : `<p class="muted">Not learned.</p>`}${node.kind === "trigger" && node.cd ? `<div class="row muted">Recharge about ${Math.round(node.cd * BAL.cd)}s</div>` : ""}</div>`;
  } else {
    const list = [...c.abilities.map(a => [a.key, a.name, a.desc]), ["ult", c.ult.name, c.ult.desc]];
    abil = list.map(([k, n, d]) => { const rr = h.ranks[k] || 0, mx = rankMax(k); return `<div class="det rrow${rr ? "" : " off"}"><img class="tdico" alt="" src="${spellURL(h.cls + "_" + k, 96)}"><h3><span>${esc(n)}</span><em>Rank ${rr}/${mx}</em></h3><p>${esc(d)}</p></div>`; }).join("");
  }
  const slots = Array.from({ length: ITEM_SLOTS }, (_, i) => h.items[i] || null);
  const items = `<div class="sec"><h3>Items (${h.items.length}/${ITEM_SLOTS})</h3><div class="islots tiny">${slots.map(k => k && ITEMS[k] ? `<div class="islot" title="${esc(ITEMS[k].desc)}"><img alt="" src="${itemURL(k)}"><b>${esc(ITEMS[k].name)}</b></div>` : `<div class="islot empty"><span>Empty</span></div>`).join("")}</div>
    ${h.items.length ? `<div class="islist">${h.items.filter(k => ITEMS[k]).map(k => `<div class="gline"><b>${esc(ITEMS[k].name)}</b><small>${esc(ITEMS[k].desc)}</small></div>`).join("")}</div>` : `<p class="muted">No items bought.</p>`}</div>
    <div class="sec"><h3>Gear</h3>${gearLines(h.gear)}</div>`;
  return head(spriteURL("c-" + h.cls, r.color), `${esc(r.name)}'s ${c.name}`, `Level ${L} · as it fought yesterday`) + `<div class="body">${heroTabs(tab, 0)}${stats}${tab === "items" ? items : abil}
    <div class="row"><button class="btn small" data-act="open" data-v="rival" data-k="${esc(r.id)}">About ${esc(r.name)}</button></div></div>`;
}
const champNowV3 = () => { const b = CHAMP_V3[S.cls], L = level(); return { hp: Math.round(b.hp * hpLvV3(L)), atk: Math.round(b.atk * atkLvV3(L)) }; };
// the ultimate a v3 hero has learned, for the orders screen and the top bar
function treeUlt() {
  for (let bi = 0; bi < 3; bi++) if (S.tree && S.tree[TREE_BKEY[bi]][5] > 0) { const n = TREES[S.cls][bi].nodes[5]; return { name: n.name, desc: nodeDesc(S.cls, bi, 5, 1), ic: n.ic }; }
  return null;
}
const ultIconHTML = u => (u && u.ic ? `<img class="sico" alt="" src="${spellURL(u.ic, 32)}"> ` : "");
