// The hero screen for skill-tree heroes: three trees side by side, a red rank square on every skill, a red badge with the points to spend.
// Spec: docs/hero-skill-trees.md. Points are spent only here, by the player. Nothing skills itself in a battle.

const nodeKey = (bi, i) => `${bi}.${i}`;
function treeSelection() { // the skill whose details show below: the one tapped, else the first one that can be learned, else the first
  const [bi, i] = (sheet.tn || "").split(".").map(Number);
  if (bi === 3 && i === 0) return [3, 0];
  if (bi >= 0 && bi < 3 && i >= 0 && i < 6) return [bi, i];
  TREE_NAME_CLS = S.cls;
  if (!(S.tree.base > 0) && freePts() > 0) return [3, 0]; // the base skill comes first: it opens the branches
  for (let b = 0; b < 3; b++) for (const n of [5, 3, 1, 0]) if (treeCanLearn(S.tree, TREE_BKEY[b], n, level())) return [b, n];
  return [0, 0];
}
function treeNodeState(bi, i) {
  if (bi === 3) { const rank = S.tree.base | 0; return { st: rank >= BASE_MAX ? "maxed" : treeCanLearnBase(S.tree, level()) ? "avail" : rank > 0 ? "learned" : "wait", rank, miss: 0 }; }
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
  const cdv = node.kind === "trigger" && node.cd ? Math.round(node.cd * BAL.cd) : 0, cdc = cdv ? `<i class="cdt" title="Recharge about ${cdv}s">${CLOCK_SVG}${cdv}s</i>` : ult ? `<i class="cdt u" title="Once per battle">1×</i>` : "";
  return `<button class="tn st-${s.st}${i === 0 ? " base" : ""}${side ? " side" : ""}${ult ? " ult" : ""}${sel ? " sel" : ""}" data-act="tnode" data-v="${nodeKey(bi, i)}" aria-label="${esc(node.name)}, ${s.rank} of ${TREE_MAX[i]}"><span class="ti"><img alt="" src="${spellURL(node.ic, 96)}">${badge}${cdc}</span><span class="tl">${esc(node.name)}</span></button>`;
}
// the class's base skill is the trunk of the tree: one node under the three trees, with a line up into each of them. One point in it opens every tree.
function treeBaseHTML(sel) {
  const node = BASE_NODE[S.cls], s = treeNodeState(3, 0), cdv = Math.round(node.cd * BAL.cd);
  return `<div class="trunk${s.rank > 0 ? " on" : ""}"><span class="tbar"></span><button class="tn st-${s.st} trunkn${sel[0] === 3 ? " sel" : ""}" data-act="tnode" data-v="3.0" aria-label="${esc(node.name)}, ${s.rank} of ${BASE_MAX}"><span class="ti"><img alt="" src="${spellURL(node.ic, 96)}"><i class="rk">${s.rank}/${BASE_MAX}</i><i class="cdt" title="Recharge about ${cdv}s">${CLOCK_SVG}${cdv}s</i></span><span class="tl">${esc(node.name)}</span></button></div>`;
}
function treeColumnHTML(bi, sel) {
  const tr = TREES[S.cls][bi], pts = treePts(S.tree, TREE_BKEY[bi]), N = (i) => treeNodeHTML(bi, i, sel[0] === bi && sel[1] === i);
  return `<div class="tcol${pts ? " on" : ""}"><div class="tch"><b>${esc(tr.name)}</b><span>${pts} pt${pts === 1 ? "" : "s"}</span></div>
    <div class="tbody"><div class="trow">${N(5)}<span></span></div><div class="trow">${N(3)}${N(4)}</div><div class="trow">${N(1)}${N(2)}</div><div class="trow">${N(0)}<span></span></div></div></div>`;
}
function treeDetailHTML(bi, i) {
  const base = bi === 3, node = treeNodeOf(S.cls, bi, i), b = TREE_BKEY[bi], rank = base ? S.tree.base | 0 : S.tree[b][i], max = treeMaxOf(bi, i), L = level(); TREE_NAME_CLS = S.cls;
  const need = base ? { maxed: rank >= BASE_MAX, list: [] } : treeNeeds(S.tree, b, i, L), free = treeFree(S.tree, L), canL = base ? treeCanLearnBase(S.tree, L) : treeCanLearn(S.tree, b, i, L), kind = { passive: "Passive", trigger: "Trigger", synergy: "Synergy", ultimate: ultBolt() + "Ultimate" }[node.kind] || "";
  const kindName = base ? "Base skill" : (i === 2 || i === 4) ? "Side talent" : i === 3 ? "Synergy" : kind;
  const now = nodeDesc(S.cls, bi, i, Math.max(1, rank)), nxt = rank >= 1 && rank < max && node.v.length ? nodeDesc(S.cls, bi, i, rank + 1) : null;
  const reqs = need.maxed ? [] : [...need.list, { ok: free > 0, text: free > 0 ? `A skill point to spend (${free} free)` : "A skill point to spend (none free yet: your hero gains them as it levels up)" }];
  const unmet = reqs.filter(x => !x.ok);
  const cd = node.kind === "trigger" && node.cd ? `<div class="cdrow"><span class="cdt big">${CLOCK_SVG}${Math.round(node.cd * BAL.cd)}s</span><span class="muted">recharge between casts</span></div>` : !base && i === 5 ? `<div class="cdrow"><span class="cdt big u">1×</span><span class="muted">once per battle, only on nights you plan it. It rests the next day.</span></div>` : "";
  const label = need.maxed ? "Fully learned" : canL ? (rank ? "Level up (1 point)" : `Learn ${esc(node.name)} (1 point)`) : unmet.some(x => !/skill point/.test(x.text)) ? "Locked" : "No skill point to spend";
  return `<div class="det tdet"><img class="tdico" alt="" src="${spellURL(node.ic, 96)}"><h3><span>${esc(node.name)}</span><em>${kindName} · ${rank}/${max}</em></h3>
    <p>${esc(rank ? now : `Rank 1: ${now}`)}</p>${nxt ? `<p class="muted">Next rank: ${esc(nxt)}</p>` : ""}${cd}
    ${reqs.length ? `<div class="req">${reqs.map(x => `<div class="${x.ok ? "ok" : "no"}"><i>${x.ok ? "✓" : "✕"}</i>${esc(x.text)}</div>`).join("")}</div>` : ""}</div>
    <button class="btn ${canL ? "wax" : "wood"} tlearn${canL ? "" : " off"}" data-act="tlearn" data-v="${nodeKey(bi, i)}" ${canL && !S.locked ? "" : "disabled"}>${S.locked && canL ? "Orders are sealed" : label}</button>`;
}
// the two tabs at the top of a hero screen (yours or a rival's), styled like the Army and Base tabs
function heroTabs(tab, free) {
  return `<div class="tabs scrolltabs three compact">${[["abilities", "Abilities", "ultimate"], ["items", "Items", "armoury"], ["stats", "Stats", "roster"]].map(([k, l, ic]) => `<button class="${tab === k ? "on" : ""}" data-act="ctab" data-v="${k}"><img class="tabi" alt="" src="icons/ui/${ic}.webp">${l}${k === "abilities" && free ? `<sup class="dot" title="Skill points to spend">${free}</sup>` : ""}</button>`).join("")}</div>`;
}
const gearLines = g => GEAR_SLOTS.map(([gk, gl]) => { const lv = (g || {})[gk], x = lv ? GEAR[gk][lv - 1] : null; return `<div class="gline${x ? "" : " none"}"><span>${gl}</span><b>${x ? esc(x.name) : "None"}</b>${x ? `<small>${esc(x.desc)}</small>` : ""}</div>`; }).join("");
function champSheetV3() {
  const c = cls(), L = level(), nd = xpNeed(L), xp = Math.min(S.xp || 0, nd), free = freePts(), now = champNowV3();
  const tab = sheet.tab === "items" || sheet.tab === "stats" ? sheet.tab : "abilities";
  const sel = treeSelection(), learned = treeHasUlt(S.tree), cool = typeof ultCooling === "function" && ultCooling();
  const slots = Array.from({ length: ITEM_SLOTS }, (_, i) => S.items[i] || null);
  const b = champBase(S.cls, balV5Now()), ty = heroTypes(S.cls, balV5Now());
  const sr = (ic, l, v) => `<div><span><i class="sic">${ic}</i>${l}</span><b>${v}</b></div>`;
  const stats = `<div class="xpbar" title="Experience toward the next level"><i style="width:${Math.round(xp / nd * 100)}%"></i><span>Level ${L} · ${xp}/${nd} XP</span></div>
    <p class="muted xpnote">Every level is one skill point, up to level ${heroMaxLvl(true, lvlV2Now())}.</p>
    <div class="sgrid sgi">${sr(SI.hp, "Health", now.hp)}${sr(SI.atk, "Attack", atkSplit(now.atk, itemAtk(S.items)))}${sr(SI.atype, "Attack type", esc(ATK_TYPES[ty[0]].name))}${sr(SI.armour, "Armour type", esc(ARMOUR_TYPES[ty[1]] || "–"))}${sr(SI.block, "Damage blocked", Math.round(b.armor * 100) + "%")}${sr(SI.as, "Attack every", b.as + "s")}${sr(SI.range, "Range", b.range + " tiles")}${sr(SI.spd, "Move speed", b.spd.toFixed(1) + " tiles/s")}</div>
    ${typeInfo(ty, "hstats")}`;
  const abilities = `<div class="tcols trunked${S.tree.base > 0 ? " tr-on" : ""}">${[0, 1, 2].map(bi => treeColumnHTML(bi, sel)).join("")}</div>${treeBaseHTML(sel)}
    ${treeDetailHTML(sel[0], sel[1])}
    <div class="ultplan"><button class="btn ${S.ultArm && learned && !cool ? "wax" : "wood"}" data-act="ultarm" ${dis(!learned || cool)}>${ultBolt()}${!learned ? "Ultimate not learned yet" : cool ? "Ultimate recharging until tomorrow" : S.ultArm ? "Ultimate planned for tonight ✓ (tap to cancel)" : "Plan the ultimate for tonight"}</button></div>`;
  const items = `
    ${heroItemsHTML(slots)}
    <p class="muted">Your hero fights with items, not the castle's forge: Armoury upgrades only arm your soldiers.</p>
    <div class="row"><button class="btn wax shopgo" data-act="shop"><img alt="" src="icons/ui/shop.webp">Open the shop</button><button class="btn small" data-act="open" data-v="spells">Spell book</button></div>`;
  return head(spriteURL("c-" + S.cls), `${c.name} Hero`, `Level ${L} of ${heroMaxLvl(true, lvlV2Now())}`) + `<div class="body">
    ${S.ob === 2 ? `<div class="obbox"><b>Step 1 of 2 · Choose your hero</b><span>Pick a class, then spend your first skill point in a tree.</span><button class="btn wax" data-act="obnext">Next: design your banner →</button></div>` : ""}
    ${heroTabs(tab, free)}${tab === "items" ? items : tab === "stats" ? stats : abilities}</div>`;
}
// ----- a rival's hero, as it fought yesterday (read only) -----
function rivalHeroData(r) {
  if (!r || !seeArmies()) return null;
  if (isLive()) { const p = r.seen; return p && p.cls ? { cls: p.cls, level: p.level || 1, tree: p.tree || null, ranks: p.ranks || {}, items: (p.items || []).filter(Boolean), gear: p.gear || {} } : null; }
  const i = RIVALS.indexOf(r), lv = Math.max(1, 2 * (DAY - 1) - 1), v3 = heroV3Now(); // practice bots: rebuilt the way their orders were made
  return { cls: r.cls, level: Math.min(heroMaxLvl(v3), lv), tree: v3 ? autoTree(lv, i + 3, r.cls) : null, ranks: autoRanks(Math.min(MAX_HERO_LVL, lv), i + 3), items: pracBotItems(i, Math.max(1, DAY - 1)), gear: { weapon: Math.floor(hash(i, 1, 21) * 3), armour: Math.floor(hash(i, 2, 22) * 3), charm: Math.floor(hash(i, 3, 23) * 2) } };
}
function rTreeNode(cls, tree, bi, i, on) {
  const node = TREES[cls][bi].nodes[i], rank = (tree[TREE_BKEY[bi]] || [])[i] || 0, st = rank >= TREE_MAX[i] ? "maxed" : rank > 0 ? "learned" : "locked", side = i === 2 || i === 4;
  return `<button class="tn st-${st}${i === 0 ? " base" : ""}${side ? " side" : ""}${i === 5 ? " ult" : ""}${on ? " sel" : ""}" data-act="tnode" data-v="${nodeKey(bi, i)}" aria-label="${esc(node.name)}, ${rank} of ${TREE_MAX[i]}"><span class="ti"><img alt="" src="${spellURL(node.ic, 96)}">${rank ? `<i class="rk">${rank}/${TREE_MAX[i]}</i>` : ""}</span><span class="tl">${esc(node.name)}</span></button>`;
}
function rivalHeroSheet(id) {
  const r = RIVALS.find(x => x.id === id), h = rivalHeroData(r);
  if (!r || !h) return head(null, r ? `${r.name}'s hero` : "Rival hero", "Nothing scouted yet") + `<div class="body"><p class="muted">You haven't seen this hero fight yet. After a battle you can see its skills and items here.</p></div>`;
  const tab = sheet.tab === "items" ? "items" : "abilities", c = CLASSES[h.cls], v3 = heroV3Now() && h.tree, b = v3 ? champBase(h.cls, balV5Now()) : CHAMP[h.cls], L = h.level;
  const hp = Math.round(b.hp * (v3 ? hpLvV3(L, lvlV2Now()) : 1 + .08 * (L - 1))), atk = Math.round(b.atk * (v3 ? atkLvV3(L, lvlV2Now()) : 1 + .06 * (L - 1)));
  const stats = `<div class="stats"><span>${IC.hp(hp)}</span><span>${IC.atk(atkSplit(atk, itemAtk(h.items)))}</span></div>${typeInfo(heroTypes(h.cls, balV5Now()), "rhero")}`;
  let abil;
  if (h.tree) {
    const rows = TREE_BKEY.map(k => h.tree[k] || []); let [sb, si] = (sheet.tn || "").split(".").map(Number);
    if (!(sb >= 0 && sb < 3 && si >= 0 && si < 6)) { sb = 0; si = 0; outer: for (const n of [5, 4, 3, 2, 1, 0]) for (let bi = 0; bi < 3; bi++) if ((rows[bi][n] || 0) > 0) { sb = bi; si = n; break outer; } }
    const col = bi => { const tr = TREES[h.cls][bi], pts = rows[bi].reduce((a, x) => a + (x || 0), 0), N = i => rTreeNode(h.cls, h.tree, bi, i, sb === bi && si === i);
      return `<div class="tcol${pts ? " on" : ""}"><div class="tch"><b>${esc(tr.name)}</b><span>${pts} pt${pts === 1 ? "" : "s"}</span></div><div class="tbody"><div class="trow">${N(5)}<span></span></div><div class="trow">${N(3)}${N(4)}</div><div class="trow">${N(1)}${N(2)}</div><div class="trow">${N(0)}<span></span></div></div></div>`; };
    const bs = h.tree.base | 0, bn = BASE_NODE[h.cls], onBase = (sheet.tn || "") === "3.0"; if (onBase) { sb = 3; si = 0; }
    const node = onBase ? bn : TREES[h.cls][sb].nodes[si], rank = onBase ? bs : rows[sb][si] || 0, kind = onBase ? "Base skill" : si === 2 || si === 4 ? "Side talent" : si === 3 ? "Synergy" : { passive: "Passive", trigger: "Trigger", synergy: "Synergy", ultimate: ultBolt() + "Ultimate" }[node.kind] || "";
    abil = `<div class="tcols trunked${bs ? " tr-on" : ""}">${[0, 1, 2].map(col).join("")}</div><div class="trunk${bs ? " on" : ""}"><span class="tbar"></span><button class="tn st-${bs ? "learned" : "locked"} trunkn${sb === 3 ? " sel" : ""}" data-act="tnode" data-v="3.0" aria-label="${esc(bn.name)}, ${bs} of ${BASE_MAX}"><span class="ti"><img alt="" src="${spellURL(bn.ic, 96)}">${bs ? `<i class="rk">${bs}/${BASE_MAX}</i>` : ""}</span><span class="tl">${esc(bn.name)}</span></button></div>
      <div class="det tdet"><img class="tdico" alt="" src="${spellURL(node.ic, 96)}"><h3><span>${esc(node.name)}</span><em>${kind} · ${rank}/${treeMaxOf(sb, si)}</em></h3><p>${esc(nodeDesc(h.cls, sb, si, Math.max(1, rank)))}</p>${rank ? "" : `<p class="muted">Not learned.</p>`}${node.kind === "trigger" && node.cd ? `<div class="row muted">Recharge about ${Math.round(node.cd * BAL.cd)}s</div>` : ""}</div>`;
  } else {
    const list = [...c.abilities.map(a => [a.key, a.name, a.desc]), ["ult", c.ult.name, c.ult.desc]];
    abil = list.map(([k, n, d]) => { const rr = h.ranks[k] || 0, mx = rankMax(k); return `<div class="det rrow${rr ? "" : " off"}"><img class="tdico" alt="" src="${spellURL(h.cls + "_" + k, 96)}"><h3><span>${esc(n)}</span><em>Rank ${rr}/${mx}</em></h3><p>${esc(d)}</p></div>`; }).join("");
  }
  const slots = Array.from({ length: ITEM_SLOTS }, (_, i) => h.items[i] || null);
  const items = `<div class="sec"><h3>Items <span class="cnt">${h.items.length}/${ITEM_SLOTS}</span></h3><div class="islots tiny">${slots.map(k => k && ITEMS[k] ? `<div class="islot" title="${esc(itemDesc(k))}"><img alt="" src="${itemURL(k)}"><b>${esc(ITEMS[k].name)}</b></div>` : `<div class="islot empty"><span>Empty</span></div>`).join("")}</div>
    ${h.items.length ? `<div class="islist">${h.items.filter(k => ITEMS[k]).map(k => `<div class="gline"><b>${esc(ITEMS[k].name)}</b><small>${esc(itemDesc(k))}</small></div>`).join("")}</div>` : `<p class="muted">No items bought.</p>`}</div>
`;
  return head(spriteURL("c-" + h.cls, r.color), `${esc(r.name)}'s ${c.name}`, `Level ${L} · as it fought yesterday`) + `<div class="body">${heroTabs(tab, 0)}${stats}${tab === "items" ? items : abil}
    <div class="row"><button class="btn small" data-act="open" data-v="rival" data-k="${esc(r.id)}">About ${esc(r.name)}</button></div></div>`;
}
const champNowV3 = () => { const b = champBase(S.cls, balV5Now()), L = level(); return { hp: Math.round(b.hp * hpLvV3(L, lvlV2Now())), atk: Math.round(b.atk * atkLvV3(L, lvlV2Now())) }; };
// the ultimate a v3 hero has learned, for the orders screen and the top bar
function treeUlt() {
  for (let bi = 0; bi < 3; bi++) if (S.tree && S.tree[TREE_BKEY[bi]][5] > 0) { const n = TREES[S.cls][bi].nodes[5]; return { name: n.name, desc: nodeDesc(S.cls, bi, 5, 1), ic: n.ic }; }
  return null;
}
const ultBolt = () => `<img class="sico" alt="" src="icons/ui/ultimate.webp"> `; // the lightning bolt that marks every ultimate
const ultIconHTML = u => (u && u.ic ? `<img class="sico" alt="" src="${spellURL(u.ic, 32)}"> ` : "");

// a small clock for recharge times
const CLOCK_SVG = `<svg class="clk" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6.5" r="4.6" fill="#fff6dc" stroke="#3a2614" stroke-width="1.2"/><path d="M6 3.9V6.6l1.9 1.1" stroke="#3a2614" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M4.6 1.2h2.8" stroke="#3a2614" stroke-width="1.2" stroke-linecap="round"/></svg>`;
// icons for the hero stats grid
const SI = { hp: "❤", atk: "⚔", atype: "🗡", armour: "🛡", block: "⛨", as: "⏱", range: "➶", spd: "👢" };
