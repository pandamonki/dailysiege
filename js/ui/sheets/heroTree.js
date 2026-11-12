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
  return `<button class="tn st-${s.st}${side ? " side" : ""}${ult ? " ult" : ""}${sel ? " sel" : ""}" data-act="tnode" data-v="${nodeKey(bi, i)}" aria-label="${esc(node.name)}, ${s.rank} of ${TREE_MAX[i]}"><span class="ti"><img alt="" src="${spellURL(node.ic, 64)}">${badge}</span><span class="tl">${esc(node.name)}</span></button>`;
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
  return `<div class="det tdet"><h3><span>${esc(node.name)}</span><em>${kindName} · ${rank}/${max}</em></h3>
    <p>${esc(rank ? now : `Rank 1: ${now}`)}</p>${nxt ? `<p class="muted">Next rank: ${esc(nxt)}</p>` : ""}${cd}
    ${reqs.length ? `<div class="req">${reqs.map(x => `<div class="${x.ok ? "ok" : "no"}"><i>${x.ok ? "✓" : "✕"}</i>${esc(x.text)}</div>`).join("")}</div>` : ""}</div>
    <button class="btn wood tlearn${canL ? "" : " off"}" data-act="tlearn" data-v="${nodeKey(bi, i)}" ${canL && !S.locked ? "" : "disabled"}>${S.locked && canL ? "Orders are sealed" : label}</button>`;
}
function champSheetV3() {
  const c = cls(), L = level(), nd = xpNeed(L), xp = Math.min(S.xp || 0, nd), free = freePts(), canChange = !isLive() || DAY === 1, now = champNowV3();
  const sel = treeSelection(), learned = treeHasUlt(S.tree), cool = typeof ultCooling === "function" && ultCooling();
  const slots = Array.from({ length: ITEM_SLOTS }, (_, i) => S.items[i] || null);
  return head(spriteURL("c-" + S.cls), `${c.name} Hero`, `Level ${L} of ${MAX_HERO_LVL_V3}`) + `<div class="body">
    ${S.ob === 2 ? `<div class="obbox"><b>Step 1 of 2 · Choose your hero</b><span>Pick a class, then spend your first skill point in a tree.</span><button class="btn wax" data-act="obnext">Next: design your banner →</button></div>` : ""}
    <div class="tpoints${free ? " has" : ""}" title="Skill points to spend"><span class="plus">+</span><b>${free}</b><small>skill point${free === 1 ? "" : "s"}</small></div>
    <div class="xpbar" title="Experience toward the next level"><i style="width:${Math.round(xp / nd * 100)}%"></i><span>Level ${L} · ${xp}/${nd} XP</span></div>
    <div class="stats"><span>${IC.hp(now.hp)}</span><span>${IC.atk(now.atk)}</span><span>${typeLine(CLASS_TYPES[S.cls])}</span></div>
    <div class="row"><button class="btn small wood" data-act="move" data-v="champ" ${dis()}>Move on the map</button>${canChange ? `<button class="btn small wood" data-act="heropick" ${dis()}>Change hero…</button>` : ""}</div>
    <div class="tcols">${[0, 1, 2].map(bi => treeColumnHTML(bi, sel)).join("")}</div>
    ${treeDetailHTML(sel[0], sel[1])}
    <p class="muted">Your hero gains a skill point at every level (14 in all, enough to max one tree), but only you spend them, here. Nothing skills itself in a battle. The ultimate needs level ${TREE_ULT_LVL}, and you can learn only one.</p>
    <div><button class="btn ${S.ultArm && learned && !cool ? "wax" : "wood"}" data-act="ultarm" ${dis(!learned || cool)}>${!learned ? "Ultimate not learned yet" : cool ? "Ultimate recharging until tomorrow" : S.ultArm ? "Ultimate planned for tonight ✓ (tap to cancel)" : "Plan the ultimate for tonight"}</button></div>
    <div class="sec"><div class="spread"><h3>Items (${S.items.length}/${ITEM_SLOTS})</h3><button class="btn small wood" data-act="shop">Shop</button></div>
      <div class="islots tiny">${slots.map(k => k ? `<div class="islot" title="${esc(ITEMS[k].desc)}"><img alt="" src="${itemURL(k)}"><b>${esc(ITEMS[k].name)}</b></div>` : `<div class="islot empty"><span>Empty</span></div>`).join("")}</div></div>
    <div><button class="btn small" data-act="open" data-v="spells">Spell book</button></div></div>`;
}
const champNowV3 = () => { const b = CHAMP_V3[S.cls], L = level(); return { hp: Math.round(b.hp * hpLvV3(L)), atk: Math.round(b.atk * atkLvV3(L)) }; };
// the ultimate a v3 hero has learned, for the orders screen and the top bar
function treeUlt() {
  for (let bi = 0; bi < 3; bi++) if (S.tree && S.tree[TREE_BKEY[bi]][5] > 0) { const n = TREES[S.cls][bi].nodes[5]; return { name: n.name, desc: nodeDesc(S.cls, bi, 5, 1) }; }
  return null;
}
