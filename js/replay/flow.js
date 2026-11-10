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
  const key = (a, b) => [a, b].sort().join("|"), byId = Object.fromEntries(plans.map(pl => [pl.pid, pl]));
  const cur = new Set(); plans.forEach(pl => (pl.pacts || []).forEach(o => cur.add(key(pl.pid, o))));
  const old = new Set((persist || []).map(s => (Array.isArray(s) ? key(s[0], s[1]) : s.split("|").sort().join("|"))).filter(k => k.split("|").every(id => byId[id])));
  const fresh = [...cur].filter(k => !old.has(k)), kept = [...cur].filter(k => old.has(k));
  const broken = [...old].filter(k => !cur.has(k)).map(k => { const [a, b] = k.split("|"), by = (byId[a].breaks || []).includes(b) ? a : (byId[b].breaks || []).includes(a) ? b : null; return { k, by, final: !!final }; });
  return { cards: plans.map(pl => ({ pid: pl.pid, name: names[pid(pl)] || pl.name, color: pl.color, cls: pl.cls, level: pl.level, banner: pl.banner, tier: pl.castleTier || 1, me: !!pl.me })), fresh, kept, broken,
    mercs: plans.flatMap(pl => (pl.pieces || []).filter(pc => pc.merc && pc.bid > 0).map(pc => ({ pid: pl.pid, id: pc.merc, gold: pc.bid }))), auction: Object.entries(plans.mercs || {}).filter(([id]) => MERCS[id]).map(([id, h]) => ({ id, winner: h.pid, gold: h.gold, bids: (h.all && h.all.length ? h.all : [{ pid: h.pid, gold: h.gold }]).slice().sort((a, b) => a.gold - b.gold) })), bets: (bets || []).map(h => ({ pid: h.pid, other: h.other })), final: !!final, names, rapier: (plans.find(pl => (pl.items || []).includes("rapier")) || {}).pid || null };
  function pid(pl) { return pl.pid; }
}

// ----- hero selection screen -----
function showHeroPick(done) {
  const old = document.getElementById("heropick"); if (old) old.remove();
  let pick = S.cls; const el = document.createElement("div"); el.id = "heropick";
  const paint = () => { el.innerHTML = `<div class="hwrap"><h2>Choose your hero</h2><p class="hsub">They lead your army for the whole week and grow with every battle.</p>
    <div class="hlist">${Object.entries(CLASSES).map(([k, v]) => { const c = CHAMP[k], on = pick === k;
      return `<button class="hcard${on ? " on" : ""}" data-k="${k}"><img alt="" src="${spriteURL("c-" + k)}"><span class="ht"><b>${v.name}</b><em>${esc(v.role)}</em>${on ? `<small>${esc(v.trait)}</small>` : ""}<span class="hs">${IC.hp(c.hp)}${IC.atk(c.atk)}<span class="ic rng" title="Range"><svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.2" fill="none" stroke="#3b4650" stroke-width="1"/><circle cx="6" cy="6" r="1.4" fill="#3b4650"/></svg><b>${c.range}</b></span></span>${on ? `<small class="ab">${v.abilities.map(a => esc(a.name)).join(" · ")} · <b>${esc(v.ult.name)}</b></small>` : ""}</span></button>`; }).join("")}</div>
    <button class="btn wax hgo" id="hgo">Choose ${CLASSES[pick].name}</button></div>`;
    el.querySelectorAll(".hcard").forEach(b => b.addEventListener("click", () => { pick = b.dataset.k; paint(); }));
    el.querySelector("#hgo").addEventListener("click", () => { if (pick !== S.cls) { if (isLive() && DAY > 1) toast("Your class is set for the week."); else A.cls(pick); } el.remove(); if (done) done(); render(); }); };
  paint(); document.body.appendChild(el);
}
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
  el.innerHTML = `<div class="iwrap"><h2>The houses gather</h2><p class="isub">${it.final ? "The final day. Every alliance is void and only one banner will stand." : "Day " + DAY_FOR_INTRO + " of the war. Here is who stands where."}</p>
    <div class="igrid" id="igrid"><svg class="ilines" id="ilines"></svg>${it.cards.map((c, i) => `<div class="icard${c.me ? " me" : ""}" data-pid="${c.pid}" style="--c:${c.color};--i:${i}"><img class="bn" alt="" src="${bannerURL(c.banner, c.color, 34, 46)}"><div class="tx"><b>${esc(c.name)}${it.rapier === c.pid ? RAPIER_ICON : ""}</b><small>${esc(clsName(c.cls))}</small><small>Lv ${c.level} · ${esc(CASTLE_TIERS[Math.max(0, Math.min(2, c.tier - 1))].name)}</small></div><img class="hr" alt="" src="${spriteURL("c-" + c.cls, c.color)}">${traitors.has(c.pid) ? `<span class="tag">TRAITOR</span>` : ""}</div>`).join("")}</div>
    ${(it.auction || []).length ? `<div class="auc" id="auc"></div>` : ""}
    ${feed.length ? `<ul class="feed">${feed.join("")}</ul>` : `<p class="none">No alliances stand this round. It's every lord for themselves.</p>`}
    <button class="btn wax go" id="igo">To battle →</button></div>`;
  document.body.appendChild(el);
  const finish = () => { el.remove(); done(); }; el.querySelector("#igo").addEventListener("click", finish);
  requestAnimationFrame(() => {
    const grid = el.querySelector("#igrid"), svg = el.querySelector("#ilines"), g = grid.getBoundingClientRect(), pos = {};
    el.querySelectorAll(".icard").forEach(c => { const r = c.getBoundingClientRect(); pos[c.dataset.pid] = [r.left - g.left + r.width / 2, r.top - g.top + r.height / 2]; });
    const rect = id => { const c = el.querySelector(`.icard[data-pid="${id}"]`); if (!c) return null; const r = c.getBoundingClientRect(); return { l: r.left - g.left, t: r.top - g.top, r: r.right - g.left, b: r.bottom - g.top }; };
    const par = {}, fnd = x => (par[x] === x || par[x] == null ? (par[x] = x) : (par[x] = fnd(par[x])));
    [...it.kept, ...it.fresh].forEach(k => { const [a, b] = k.split("|"); par[fnd(a)] = fnd(b); });
    const groups = {}; Object.keys(par).forEach(id => { (groups[fnd(id)] = groups[fnd(id)] || []).push(id); });
    Object.values(groups).filter(m => m.length > 1).forEach(m => { const rs = m.map(rect).filter(Boolean); if (rs.length < 2) return; const l = Math.min(...rs.map(r => r.l)) - 6, tp = Math.min(...rs.map(r => r.t)) - 6, rr = Math.max(...rs.map(r => r.r)) + 6, bt = Math.max(...rs.map(r => r.b)) + 6;
      grid.insertAdjacentHTML("beforeend", `<div class="abox" style="left:${l}px;top:${tp}px;width:${rr - l}px;height:${bt - tp}px"><span>ALLIANCE</span></div>`); });
    const fly = (m, dl) => { const r = rect(m.pid), mm = MERCS[m.id]; if (!r || !mm) return;
      const sprites = [...new Set(mm.units)].map(t => `<img alt="" src="${spriteURL(t)}">`).join(""), x = (r.l + r.r) / 2, y = r.t;
      grid.insertAdjacentHTML("beforeend", `<div class="mfly" style="left:${x}px;top:${y}px;--sx:${Math.round(g.width / 2 - x)}px;--sy:${Math.round(-g.top - y - 40)}px;--dl:${dl}s">${sprites}<span>${esc(mm.name)}</span></div><span class="mbadge" style="left:${r.r - 8}px;top:${r.b - 10}px;--dl:${(dl + .9).toFixed(2)}s">⚔ ${esc(mm.name)}</span>`); };
    runAuction(el, it, nm, card, fly);
    it.broken.forEach(x => { const [a, b] = x.k.split("|"), ra = rect(a), rb = rect(b); if (ra && rb) grid.insertAdjacentHTML("beforeend", `<span class="badge broke" style="left:${(ra.l + ra.r + rb.l + rb.r) / 4}px;top:${(ra.t + ra.b + rb.t + rb.b) / 4}px">✕</span>`); });
  });
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
      ul.querySelector("li.top").classList.add("won"); fly({ pid: a.winner, id: a.id }, 0); await wait(1500); box.classList.add("out"); await wait(450); box.classList.remove("sold", "show"); }
    box.remove();
  })();
}
let DAY_FOR_INTRO = 1, SAW_REPLAY = false;
function startBattle() {
  let res, plansUsed, persist, bets = PRAC_BET, finalDay = false;
  if (isLive()) { const ck = liveClock(), { N: size, plans, final } = liveBattlePlans(ck.planDay, { test: true }); res = runBattle(plans, daySeed(ck.planDay) + 1, { N: size, finalDay: final, ultV2: ultV2For(ck.planDay) }); plansUsed = plans; persist = carriedPairs(ck.planDay); finalDay = final; bets = liveYesterdayBets(ck.planDay); DAY_FOR_INTRO = ck.dayNo; }
  else { persist = (S.pairs || []).slice(); const pl = buildPlans(); plansUsed = pl; finalDay = DAY === 7; DAY_FOR_INTRO = DAY; res = runBattle(pl, 7919 * DAY + 101, { finalDay: DAY === 7, ultV2: true, ranks: rankMap(PRACTICE_BOARD, pl.map(p => p.pid)) }); res.board = PRACTICE_BOARD; S.pairs = res.pairsEnd.slice(); S.feuds = Array.from(new Set((S.feuds || []).concat(res.feudsNew || []))); }
  res.names = Object.fromEntries(res.results.map(r => [r.pid, r.pid === res.me ? (isLive() ? MY_NAME : "You") : r.name]));
  if (!isLive()) LASTP = { id: "practice", day: DAY, results: res.results, gain: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.gain])), xp: Object.fromEntries(Object.entries(res.lvl).map(([k, v]) => [k, v.xp])), gold: Object.fromEntries(res.results.map(r => [r.pid, r.gold])), team: !!res.team, names: res.names, ults: res.ultCast || [], awards: res.awards || null, trapsUsed: res.trapsUsed || [], blessed: !!(plansUsed && plansUsed[0] && plansUsed[0].blessing), mercs: (plansUsed && plansUsed.mercs) || {}, rapierEnd: res.rapierEnd || null };
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
  try { const prev = addDays(dayKey, -1); if (weekdayOf(dayKey) === 1) return []; const sv = savedBattle(prev), { N, plans, final } = sv || liveBattlePlans(prev), r = runBattle(plans, daySeed(prev), { fast: true, N, finalDay: final, ultV2: sv ? sv.ultV2 : ultV2For(prev), ranks: (sv && sv.ranks) || undefined }); return r.hl.filter(h => h.kind === "betray"); } catch (e) { return []; }
}
function leaveBattle() { SAW_REPLAY = true; mode = "plan"; replay = null; document.getElementById("banner").hidden = true; sheet = reportBack ? { type: "report", id: reportBack } : null; render(); home(); }
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function lowerBound(arr, t) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].t < t) lo = m + 1; else hi = m; } return lo; }
