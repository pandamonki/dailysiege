// Battle flow: muster screen, hero pick, starting and leaving a battle

// ================= battle replay =================
let mode = "plan", replay = null, lastMs = 0;

// ----- the muster screen shown before each battle: banners, heroes, alliances made and broken, and last round's betrayals -----
let PRAC_BET = [];
// who reached out, who walked away and who stabbed you in the back, for the post-battle report
function diplomacyReport(plans, persist, hl, me) {
  const by = Object.fromEntries(plans.map(q => [q.pid, q])), mine = by[me]; if (!mine) return null;
  const offers = plans.filter(q => q.pid !== me && q.offers && q.offers[me] && (mine.replies || {})[q.pid]).map(q => ({ pid: q.pid, gold: q.offers[me].gold || 0, accepted: (mine.pacts || []).includes(q.pid) }));
  const old = (persist || []).map(s => (Array.isArray(s) ? s : s.split("|"))).filter(([a, b]) => a === me || b === me).map(([a, b]) => (a === me ? b : a));
  const broke = old.filter(o => by[o] && (by[o].breaks || []).includes(me) && !(mine.breaks || []).includes(o)).map(pid => ({ pid }));
  return { offers, broke, bets: (hl || []).filter(h => h.kind === "betray" && h.other === me).map(h => ({ pid: h.pid, t: h.t })) };
}
const RAPIER_ICON = `<svg class="rap" viewBox="0 0 16 16" aria-label="Divine Rapier"><title>Divine Rapier</title><path d="M13.6 1.4 15 1l-.4 1.4-6.1 6.1-1.2-1.2z" fill="#ffd24a" stroke="#8a5a00" stroke-width=".7" stroke-linejoin="round"/><path d="M5.2 8.2l2.6 2.6-1 1-2.6-2.6z" fill="#e0a020" stroke="#8a5a00" stroke-width=".7"/><path d="M4.4 11.6 2 14l.2.2 2.4-2.4z" fill="#8a5a00" stroke="#8a5a00" stroke-width="1.2"/></svg>`;
function introData(plans, persist, bets, names, final) {
  const fin2 = !!final && plans.some(p => p.finV2); if (fin2) final = false; // finV2: day 7 pacts hold until one alliance is left
  const key = (a, b) => [a, b].sort().join("|"), byId = Object.fromEntries(plans.map(pl => [pl.pid, pl]));
  const cur = new Set(); plans.forEach(pl => (pl.pacts || []).forEach(o => cur.add(key(pl.pid, o))));
  const old = new Set((persist || []).map(s => (Array.isArray(s) ? key(s[0], s[1]) : s.split("|").sort().join("|"))).filter(k => k.split("|").every(id => byId[id])));
  const fresh = [...cur].filter(k => !old.has(k)), kept = [...cur].filter(k => old.has(k));
  const broken = [...old].filter(k => !cur.has(k)).map(k => { const [a, b] = k.split("|"), by = (byId[a].breaks || []).includes(b) ? a : (byId[b].breaks || []).includes(a) ? b : null; return { k, by, final: !!final, fin2 }; });
  // alliances sit together: each alliance's lords side by side (the biggest alliance first, yours first among equals), then the lords standing alone
  const par = {}, fnd = x => (par[x] == null || par[x] === x ? (par[x] = x) : (par[x] = fnd(par[x]))); [...cur].forEach(k => { const [a, b] = k.split("|"); par[fnd(a)] = fnd(b); });
  const grp = {}; plans.forEach(pl => (grp[fnd(pl.pid)] = grp[fnd(pl.pid)] || []).push(pl));
  const blocs = Object.values(grp).sort((a, b) => (b.length > 1) - (a.length > 1) || b.length - a.length || b.some(q => q.me) - a.some(q => q.me) || plans.indexOf(a[0]) - plans.indexOf(b[0]));
  const ordered = blocs.flatMap(g => g.slice().sort((a, b) => b.me - a.me || plans.indexOf(a) - plans.indexOf(b)));
  return { cards: ordered.map(pl => ({ pid: pl.pid, bloc: grp[fnd(pl.pid)].length > 1 ? fnd(pl.pid) : null, name: names[pid(pl)] || pl.name, color: pl.color, cls: pl.cls, level: pl.level, banner: pl.banner, tier: pl.castleTier || 1, me: !!pl.me })), fresh, kept, broken,
    mercs: plans.flatMap(pl => (pl.pieces || []).filter(pc => pc.merc && pc.bid > 0).map(pc => ({ pid: pl.pid, id: pc.merc, gold: pc.bid }))), auction: Object.entries(plans.mercs || {}).filter(([id]) => MERCS[id]).map(([id, h]) => ({ id, winner: h.pid, gold: h.gold, bids: (h.all && h.all.length ? h.all : [{ pid: h.pid, gold: h.gold }]).slice().sort((a, b) => a.gold - b.gold) })), bets: (bets || []).map(h => ({ pid: h.pid, other: h.other })), final: !!final, fin2, names, rapier: (plans.find(pl => (pl.items || []).includes("rapier")) || {}).pid || null };
  function pid(pl) { return pl.pid; }
}

// ----- hero selection screen -----
function showHeroPick(done) {
  const old = document.getElementById("heropick"); if (old) old.remove();
  let pick = S.cls; const el = document.createElement("div"); el.id = "heropick";
  const paint = () => { el.innerHTML = `<div class="hwrap"><h2>Choose your hero</h2><p class="hsub">They lead your army for the whole week and grow with every battle.</p>
    <div class="hlist">${Object.entries(CLASSES).map(([k, v]) => { const c = CHAMP[k], on = pick === k;
      return `<button class="hcard${on ? " on" : ""}" data-k="${k}"><img alt="" src="${spriteURL("c-" + k)}"><span class="ht"><b>${v.name}</b><em>${esc(v.role)}</em>${on ? `<small>${esc(v.trait)}</small>` : ""}<span class="hs">${IC.hp(c.hp)}${IC.atk(c.atk)}<span class="ic rng" title="Range"><svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.2" fill="none" stroke="#3b4650" stroke-width="1"/><circle cx="6" cy="6" r="1.4" fill="#3b4650"/></svg><b>${c.range}</b></span></span>${on ? `<small class="ab">${TREES[k].map(tr => `<b>${esc(tr.name)}</b> (${esc(tr.role)})`).join(" · ")}</small>` : ""}</span></button>`; }).join("")}</div>
    <button class="btn wax hgo" id="hgo">Choose ${CLASSES[pick].name}</button></div>`;
    el.querySelectorAll(".hcard").forEach(b => b.addEventListener("click", () => { pick = b.dataset.k; paint(); }));
    el.querySelector("#hgo").addEventListener("click", () => { if (pick !== S.cls) { if (isLive()) toast("Your hero is fixed for this war."); else A.cls(pick); } el.remove(); if (done) done(); render(); }); };
  paint(); document.body.appendChild(el);
}
// Alliances as groups, biggest first (yours first among equals), each with its own colour: the same colours name a team on the muster screen
// and in the replay. pairs: "a|b" keys; order: every lord's id in roster order.
const TEAM_COLS = ["#3f9d58", "#3d8fb5", "#a463d4", "#dd8b34", "#d9577a"];
function allianceGroups(pairs, order, me) {
  const par = {}, f = x => (par[x] == null || par[x] === x ? (par[x] = x) : (par[x] = f(par[x])));
  pairs.forEach(k => { const [a, b] = Array.isArray(k) ? k : String(k).split("|"); par[f(a)] = f(b); });
  const g = {}; Object.keys(par).forEach(x => (g[f(x)] = g[f(x)] || []).push(x));
  return crestAnimals(Object.values(g).filter(m => m.length > 1).map(m => m.sort((a, b) => order.indexOf(a) - order.indexOf(b)))
    .sort((a, b) => b.length - a.length || (b.includes(me) - a.includes(me)) || order.indexOf(a[0]) - order.indexOf(b[0])).map((ids, i) => ({ ids, col: TEAM_COLS[i % TEAM_COLS.length], i })));
}
// The alliances in force at a moment of a replay: the pacts the battle began with, minus any betrayed or broken since (a betrayal ends that pair,
// the last alliance splitting ends them all). Teams keep their colour for the whole battle; a pair that has ended simply loses its link.
function replayPairs(R, time) {
  const all = (R.pacts0 || []).map(k => (Array.isArray(k) ? k : String(k).split("|")).slice().sort().join("|")), gone = new Set();
  (R.hl || []).forEach(h => { if (h.t > time) return; if (h.kind === "betray") gone.add([h.pid, h.other].sort().join("|")); else if (h.kind === "split") { const ids = [h.pid, ...(h.others || [])]; all.forEach(k => { if (k.split("|").every(x => ids.includes(x))) gone.add(k); }); } });
  return all.filter(k => !gone.has(k));
}
function replayTeams(R) { return R.teamGroups || (R.teamGroups = allianceGroups(R.pacts0 || [], R.order, R.me)); }
function showIntro(it, done) {
  const old = document.getElementById("intro"); if (old) old.remove();
  const el = document.createElement("div"); el.id = "intro";
  const nm = id => esc(it.names[id] || id), card = id => it.cards.find(c => c.pid === id);
  const traitors = new Set(it.bets.map(b => b.pid));
  const feed = []; let d = 2.4;
  if (it.rapier) feed.push(`<li class="fresh" style="--d:${(d += .35).toFixed(2)}">⚔ <b>${nm(it.rapier)}</b> carries the Divine Rapier. Slay them and it can be yours.</li>`);
  it.fresh.forEach(k => { const [a, b] = k.split("|"); feed.push(`<li class="fresh" style="--d:${(d += .35).toFixed(2)}">✦ <b>${nm(a)}</b> and <b>${nm(b)}</b> have formed an alliance.</li>`); });
  it.broken.forEach(x => { const [a, b] = x.k.split("|"); feed.push(`<li class="broke" style="--d:${(d += .35).toFixed(2)}">✕ ${x.final ? `The alliance between <b>${nm(a)}</b> and <b>${nm(b)}</b> ended with the final day.` : x.by ? `<b>${nm(x.by)}</b> ended the pact with <b>${nm(x.by === a ? b : a)}</b>.` : `<b>${nm(a)}</b> and <b>${nm(b)}</b> are no longer allies.`}</li>`); });
  it.bets.forEach(b => feed.push(`<li class="bet" style="--d:${(d += .35).toFixed(2)}">🗡 Last battle, <b>${nm(b.pid)}</b> betrayed <b>${nm(b.other)}</b> and blew up their keep.</li>`));
  if (it.kept.length) feed.push(`<li style="--d:${(d += .35).toFixed(2)}">${it.kept.length === 1 ? "One pact" : it.kept.length + " pacts"} held from yesterday.</li>`);
  // design C: each alliance is a side with its own colour and header, then the lone lords
  const pids = it.cards.map(c => c.pid), meId = (it.cards.find(c => c.me) || {}).pid, pairsNow = [...it.kept, ...it.fresh], groups = allianceGroups(pairsNow, pids, meId), inGroup = new Set(groups.flatMap(g => g.ids));
  let ci = 0; const cardHTML = c => `<div class="icard${c.me ? " me" : ""}" data-pid="${c.pid}" style="--c:${c.color};--i:${ci++}"><img class="bn" alt="" src="${bannerURL(c.banner, c.color, 34, 46)}"><div class="tx"><b>${esc(c.name)}${it.rapier === c.pid ? RAPIER_ICON : ""}</b><small>${esc(clsName(c.cls))}</small><small>Lv ${c.level} · ${esc(CASTLE_TIERS[Math.max(0, Math.min(2, c.tier - 1))].name)}</small></div><img class="hr" alt="" src="${spriteURL("c-" + c.cls, c.color)}">${traitors.has(c.pid) ? `<span class="tag">TRAITOR</span>` : ""}</div>`;
  const side = (title, note, col, list, crest) => `<div class="iside" style="--sc:${col}"><div class="ihd">${crest || ""}<b>${title}</b><small>${note}</small></div><div class="ibody">${list.map(cardHTML).join("")}</div></div>`;
  const sideHTML = groups.map(g => { const own = pairsNow.filter(k => k.split("|").every(x => g.ids.includes(x))), nf = own.filter(k => it.fresh.includes(k)).length, age = nf === own.length ? "new today" : nf ? "grew today" : "held from yesterday", first = card(g.ids[0]);
    return side(g.ids.includes(meId) ? "Your alliance" : `Alliance of ${esc(first ? first.name : "a lord")}`, `${g.ids.length} lords · ${age}`, g.col, g.ids.map(card).filter(Boolean), crestSVG(g.ids.map(x => (card(x) || {}).color || "#888"), g.animal, 34, null, true)); });
  const lone = it.cards.filter(c => !inGroup.has(c.pid)), wolf = groups.length && lone.length === 1;
  if (lone.length) sideHTML.push(side(wolf ? "Lone wolf" : "Lone lords", wolf ? `alone against ${inGroup.size} allied lords` : `${lone.length} lord${lone.length === 1 ? "" : "s"} · every one for themselves`, "#7a6338", lone));
  const sides = sideHTML.join(`<div class="ivs">VS</div>`), mine = groups.find(g => g.ids.includes(meId));
  const sumLine = mine ? `You are allied with ${mine.ids.filter(x => x !== meId).map(nm).join(" and ")}.` : groups.length ? "You have no allies today." : "No alliances stand today.";
  el.innerHTML = `<div class="iwrap"><h2>The houses gather</h2><p class="isub">${it.fin2 ? "The final day. Alliances hold until only one is left standing, then it breaks: only one banner will win the war." : it.final ? "The final day. Every alliance is void and only one banner will stand." : "Day " + DAY_FOR_INTRO + " of the war. Here is who stands where."}</p>
    <p class="isum">${sumLine}</p>
    <div class="igrid" id="igrid"><svg class="ilines" id="ilines"></svg>${sides}</div>
    ${(it.auction || []).length ? `<div class="auc" id="auc"></div>` : ""}
    ${feed.length ? `<ul class="feed">${feed.join("")}</ul>` : `<p class="none">No alliances stand this round. It's every lord for themselves.</p>`}
    <button class="btn wax go" id="igo">To battle →</button></div>`;
  document.body.appendChild(el);
  const finish = () => { el.remove(); done(); }; el.querySelector("#igo").addEventListener("click", finish);
  requestAnimationFrame(() => {
    const grid = el.querySelector("#igrid"), g = grid.getBoundingClientRect();
    const rect = id => { const c = el.querySelector(`.icard[data-pid="${id}"]`); if (!c) return null; const r = c.getBoundingClientRect(); return { l: r.left - g.left, t: r.top - g.top, r: r.right - g.left, b: r.bottom - g.top }; };
    const fly = m => marchMercs(el, grid, m); // returns how long the march takes, in ms
    runAuction(el, it, nm, card, fly);
    it.broken.forEach(x => { const [a, b] = x.k.split("|"), ra = rect(a), rb = rect(b); if (ra && rb) grid.insertAdjacentHTML("beforeend", `<span class="badge broke" style="left:${(ra.l + ra.r + rb.l + rb.r) / 4}px;top:${(ra.t + ra.b + rb.t + rb.b) / 4}px">✕</span>`); });
  });
}
// a won mercenary group marches out of the auction panel and takes its place in its new lord's card, name tag overhead
// the formation: units stand in one or two ranks, back rank first, each 2 screen pixels per sprite pixel
function mercFormation(types, S = 2) {
  const us = types.map(t => { const sp = spr(t); return { t, w: sp.width * S, h: sp.height * S }; }), n = us.length, per = n <= 3 ? n : Math.ceil(n / 2), front = Math.min(per, n), back = n - front;
  const maxW = Math.max(...us.map(u => u.w)), maxH = Math.max(...us.map(u => u.h)), stepX = Math.round(maxW * .85), stepY = 14, rows = back ? [us.slice(0, back), us.slice(back)] : [us];
  const off = ri => (rows.length > 1 && ri === 0 ? Math.round(stepX / 2) : 0), rowW = (r, ri) => off(ri) + (r.length - 1) * stepX + maxW, W = Math.max(...rows.map(rowW)), H = (rows.length - 1) * stepY + maxH, out = [];
  rows.forEach((r, ri) => r.forEach((u, i) => out.push({ t: u.t, w: u.w, h: u.h, x: off(ri) + i * stepX, y: ri * stepY + (maxH - u.h) })));
  return { W, H, units: out };
}
function mercBlock(mm, color, fm, idle) {
  return `<div class="mblock${idle ? " idle" : ""}"><span class="mtag">⚔ ${esc(mm.name)}</span><div class="mform" style="width:${fm.W}px;height:${fm.H}px">${fm.units.map((u, i) => `<img alt="" data-t="${u.t}" data-i="${i}" src="${mercPoseURL(u.t, color, "")}" style="left:${u.x}px;top:${u.y}px;width:${u.w}px;height:${u.h}px;--d:${(i * .23).toFixed(2)}s">`).join("")}</div></div>`;
}
function marchMercs(el, grid, m) {
  const cardEl = el.querySelector(`.icard[data-pid="${m.pid}"]`), mm = MERCS[m.id]; if (!cardEl || !mm) return 0;
  const color = cardEl.style.getPropertyValue("--c") || MY_COLOR, fm = mercFormation(mm.units), calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // reserve a ground strip for the group at the foot of the lord's card; measure where the group will stand, then let the strip grow
  cardEl.insertAdjacentHTML("beforeend", `<div class="mslot">${mercBlock(mm, color, fm, true)}</div>`);
  const slot = cardEl.lastElementChild, blk = slot.firstElementChild, full = fm.H + 28; slot.style.height = full + "px"; blk.classList.add("hid");
  const g = grid.getBoundingClientRect(), br = blk.getBoundingClientRect(), tx = br.left - g.left, ty = br.top - g.top;
  const done = () => { blk.classList.remove("hid"); cardEl.classList.remove("hired"); void cardEl.offsetWidth; cardEl.classList.add("hired"); };
  if (calm) { done(); return 0; }
  slot.style.height = "0px"; void slot.offsetWidth; slot.style.height = full + "px";
  const from = el.querySelector("#auc .asp"), fr = from ? from.getBoundingClientRect() : null, sx = fr ? fr.left - g.left : g.width / 2 - fm.W / 2, sy = fr ? fr.top - g.top : ty - 80;
  grid.insertAdjacentHTML("beforeend", mercBlock(mm, color, fm, false).replace('class="mblock"', 'class="mblock mmarch"').replace('<div class="mmarch"', '<div class="mmarch"'));
  const ov = grid.lastElementChild; ov.style.left = sx + "px"; ov.style.top = sy + "px"; ov.classList.toggle("flip", tx < sx - 4);
  const imgs = [...ov.querySelectorAll("img")], dist = Math.hypot(tx - sx, ty - sy), ms = Math.max(1300, Math.min(2600, dist * 7.5)); let tick = 0;
  const step = setInterval(() => { if (!ov.isConnected) return clearInterval(step); tick++; imgs.forEach((im, i) => { im.src = mercPoseURL(im.dataset.t, color, "w" + ((tick + (i % 2) * 2) & 3)); }); }, 130);
  const run = ov.animate([{ transform: "translate(0,0) scale(.6)", opacity: 0 }, { transform: "translate(0,0) scale(1)", opacity: 1, offset: .08 }, { transform: `translate(${tx - sx}px, ${ty - sy}px) scale(1)`, opacity: 1 }], { duration: ms, delay: 650, easing: "linear", fill: "both" });
  const end = () => { clearInterval(step); ov.remove(); if (slot.isConnected) done(); };
  run.onfinish = end; run.oncancel = end;
  return 650 + ms;
}
// the mercenary auction: each camp group in turn, every sealed bid revealed lowest to highest, then awarded to the winner
function runAuction(el, it, nm, card, fly) {
  const box = el.querySelector("#auc"); if (!box || !(it.auction || []).length) return;
  const live = () => el.isConnected, wait = ms => new Promise(r => setTimeout(r, ms)), chip = id => { const c = card(id); return `<i class="dot" style="background:${c ? c.color : "#999"}"></i>`; };
  (async () => {
    await wait(1400);
    for (const a of it.auction) { if (!live()) return; const mm = MERCS[a.id], sprites = [...new Set(mm.units)].map(t => `<img alt="" src="${spriteURL(t)}">`).join("");
      box.classList.remove("out"); box.classList.add("show"); box.innerHTML = `<div class="ahead"><div class="asp">${sprites}</div><div><b>${esc(mm.name)}</b><small>${a.bids.length > 1 ? a.bids.length + " sealed bids" : "A single bid"} · opens at ${mm.min}g</small></div></div><ul class="abids"></ul><div class="asold"></div>`;
      const ul = box.querySelector(".abids"); await wait(700);
      for (let i = 0; i < a.bids.length; i++) { if (!live()) return; const b = a.bids[i], top = i === a.bids.length - 1;
        ul.insertAdjacentHTML("beforeend", `<li class="${top ? "top" : ""}">${chip(b.pid)}<span>${nm(b.pid)}</span><em>${b.gold}g</em></li>`); await wait(top ? 900 : 650); }
      if (!live()) return; box.querySelector(".asold").innerHTML = `⚔ <b>${nm(a.winner)}</b> wins the ${esc(mm.name)} for ${a.gold} gold`; box.classList.add("sold");
      ul.querySelector("li.top").classList.add("won"); const march = fly({ pid: a.winner, id: a.id }) || 0; await wait(1000); box.classList.add("out"); await wait(450); box.classList.remove("sold", "show"); await wait(Math.max(0, march - 1450) + 300); }
    box.remove();
  })();
}
let DAY_FOR_INTRO = 1, SAW_REPLAY = false;
function startBattle() {
  let res, plansUsed, persist, bets = PRAC_BET, finalDay = false;
  if (isLive()) { const ck = liveClock(), { N: size, plans, final, twist, offers, picks } = liveBattlePlans(ck.planDay, { test: true }); res = runBattle(plans, daySeed(ck.planDay) + 1, { N: size, finalDay: final, ultV2: ultV2For(ck.planDay), balV2: balV2For(ck.planDay), balV3: balV3For(ck.planDay), fairV1: fairV1For(ck.planDay), pickV1: pickV1For(ck.planDay), balV4: balV4For(ck.planDay), suddenV1: suddenV1For(ck.planDay), treesV1: treesV1For(ck.planDay), heroV3: heroV3For(ck.planDay), dayNo: ck.dayNo, twist }); res.contracts = settleContracts(res, picks, offers, twist); res.offers = offers; res.rehearsal = true; plansUsed = plans; persist = carriedPairs(ck.planDay); finalDay = final; bets = liveYesterdayBets(ck.planDay); DAY_FOR_INTRO = ck.dayNo; }
  else { persist = (S.pairs || []).slice(); const pl = buildPlans(); plansUsed = pl; S.lastPlans = pl.map(p => ({ pid: p.pid, front: p.front, targets: (p.targets || []).slice(0, 1) })); /* the rivals read this tomorrow (agency pass) */ finalDay = DAY === 7; DAY_FOR_INTRO = DAY; res = runBattle(pl, 7919 * DAY + 101, { finalDay: DAY === 7, ultV2: true, balV2: true, balV3: true, fairV1: true, pickV1: true, balV4: true, suddenV1: true, treesV1: true, heroV3: heroV3Now(), dayNo: DAY, ranks: rankMap(PRACTICE_BOARD, pl.map(p => p.pid)), twist: pracTwist() }); { const off = { you: pracOffers() }, cs = settleContracts(res, S.contract ? { you: S.contract } : {}, off, pracTwist()); res.contracts = cs; res.offers = off; applySavedContracts(res, { contracts: cs, offers: off }); } res.board = PRACTICE_BOARD; S.pairs = res.pairsEnd.slice(); S.feuds = Array.from(new Set((S.feuds || []).concat(res.feudsNew || [])));
    S.allyLog = (DAY === 1 ? [] : (S.allyLog || []).filter(e => e.day < DAY)).concat([{ day: DAY, start: [...new Set(pl.flatMap(p => (p.pacts || []).map(o => [p.pid, o].sort().join("|"))))], end: res.pairsEnd.slice(), feuds: (res.feudsNew || []).slice(), by: Object.fromEntries(res.results.filter(r => r.treachery).map(r => [r.pid, r.treachery])), wolves: res.results.filter(r => r.lone).map(r => r.pid) }]); } // the alliance history the Allies screen shows
  res.names = Object.fromEntries(res.results.map(r => [r.pid, r.pid === res.me ? (isLive() ? MY_NAME : "You") : r.name]));
  if (!isLive()) LASTP = { id: "practice", day: DAY, results: res.results, gain: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.gain])), xp: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.xp])), gold: Object.fromEntries(res.results.map(r => [r.pid, r.gold])), team: !!res.team, names: res.names, ults: res.ultCast || [], awards: res.awards || null, trapsUsed: res.trapsUsed || [], blessed: !!(plansUsed && plansUsed[0] && plansUsed[0].blessing), mercs: (plansUsed && plansUsed.mercs) || {}, rapierEnd: res.rapierEnd || null, plans: plansUsed || null };
  replay = { res, time: 0, playing: false, speed: 1, done: false, logN: -1, auto: true };
  mode = "replay"; sheet = null; sel = null;
  flyTo(W / 2, W / 2, 0);
  render(); buildReplayUI();
  const intro = introData(plansUsed, persist, bets, res.names, finalDay);
  if (!isLive()) PRAC_BET = res.hl.filter(h => h.kind === "betray").map(h => ({ pid: h.pid, other: h.other }));
  res.dip = diplomacyReport(plansUsed, persist, res.hl, res.me);
  showIntro(intro, () => { if (replay) replay.playing = true; });
}
function liveYesterdayBets(dayKey) {
  try { const prev = addDays(dayKey, -1); if (weekdayOf(dayKey) === 1) return []; const sv = savedBattle(prev), { N, plans, final } = sv || liveBattlePlans(prev), r = runBattle(plans, daySeed(prev), { fast: true, N, finalDay: final, ultV2: sv ? sv.ultV2 : ultV2For(prev), balV2: sv ? sv.balV2 : balV2For(prev), balV3: sv ? sv.balV3 : balV3For(prev), fairV1: sv ? sv.fairV1 : fairV1For(prev), pickV1: sv ? sv.pickV1 : pickV1For(prev), balV4: sv ? sv.balV4 : balV4For(prev), suddenV1: sv ? sv.suddenV1 : suddenV1For(prev), treesV1: sv ? sv.treesV1 : treesV1For(prev), heroV3: sv ? sv.heroV3 : heroV3For(prev), dayNo: sv ? sv.dayNo : weekdayOf(prev), ranks: (sv && sv.ranks) || undefined, twist: sv ? sv.twist : wTwist(LIVE, prev) }); return r.hl.filter(h => h.kind === "betray"); } catch (e) { return []; }
}
function leaveBattle() { if (typeof WAR_VIEW !== "undefined" && WAR_VIEW) { SAW_REPLAY = true; mode = "plan"; replay = null; camTarget = null; document.getElementById("banner").hidden = true; endPrevView(); sheet = { type: "warend" }; render(); home(); return; } SAW_REPLAY = true; mode = "plan"; replay = null; camTarget = null; try { ptrs.clear(); pinch = null; drag = null; } catch (e) {} document.getElementById("banner").hidden = true; sheet = reportBack ? { type: "report", id: reportBack } : null; render(); home(); }
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function lowerBound(arr, t) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].t < t) lo = m + 1; else hi = m; } return lo; }
