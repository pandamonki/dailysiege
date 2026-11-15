// The day's twist, the contract board, rehearsal, and the personal battle report

// ----- today's twist and contracts, on this device -----
const contractsOn = () => isLive() ? contractsFor(liveClock().planDay) : true;
const pracTwist = () => dayTwist("practice", DAY);
function myTwist() { if (!S) return null; return isLive() ? wTwist(LIVE, liveClock().planDay) : pracTwist(); }
function tomorrowTwist() { if (isLive()) { const ck = liveClock(); return ck.dayNo >= 7 ? undefined : wTwist(LIVE, addDays(ck.planDay, 1)); } return DAY >= 7 ? undefined : dayTwist("practice", DAY + 1); }
function pracOffers() {
  const ids = ["you", ...RIVALS.map(r => r.id)], lead = Object.entries(PRACTICE_BOARD || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
  return contractOffers({ uid: "you", dayKey: "practice-" + DAY, rivals: ids, leader: lead ? lead[0] : null, nemesis: null });
}
function myOffers() { if (!S || !contractsOn()) return []; return isLive() ? wContractOffers(LIVE, liveClock().planDay, LIVE.uid) : pracOffers(); }
const cxName = id => isLive() ? nameOf(id) : ((RIVALS.find(r => r.id === id) || {}).name || "A rival");
const buyCost = k => myTwist() === "market" && !ITEMS[k].fixed ? Math.round(itemCost(k) * TWIST_MARKET / 5) * 5 : itemCost(k);
function contractPay(key, twist) { const k = contractParse(key); if (!k) return { pts: 0, gold: 0 }; const p = CONTRACT_PAY[k.c.tier]; return { pts: p.pts * (twist === "glory" ? 2 : 1), gold: p.gold * (twist === "goldrush" ? 2 : 1) }; }
const TIER_NAME = { 1: "Easy", 2: "Hard", 3: "Rival" };

function todaySheet() {
  const tw = myTwist(), ti = twistInfo(tw), nx = tomorrowTwist(), offers = myOffers(), lk = S.locked || (isLive() && LIVE.readOnly);
  const dayNo = isLive() ? liveClock().dayNo : DAY, on = contractsOn();
  const twist = `<div class="sec twistcard"><span class="tw-ic">${ti.icon}</span><div><h3>${esc(ti.name)}</h3><p>${esc(ti.note)}</p>${nx !== undefined ? `<p class="muted">Tomorrow: ${twistInfo(nx).icon} <b>${esc(twistInfo(nx).name)}</b>. ${esc(twistInfo(nx).note)}</p>` : `<p class="muted">The last day of the war.</p>`}</div></div>`;
  const cards = !on ? `<p class="muted">Contracts begin with the battle of ${esc(CONTRACTS_FROM)}.</p>` : !offers.length ? `<p class="muted">No contracts for you today.</p>` : offers.map(key => {
    const k = contractParse(key), pay = contractPay(key, tw), took = S.contract === key;
    return `<div class="cxcard${took ? " on" : ""} t${k.c.tier}"><span class="cx-ic">${k.c.icon}</span><div class="cx-tx"><small>${TIER_NAME[k.c.tier]}</small><b>${esc(k.c.name)}</b><span>${esc(contractText(key, cxName))}</span><em>+${pay.pts} points · +${pay.gold} gold</em></div>
      <button class="btn small ${took ? "wood" : "wax"}" data-act="cxpick" data-v="${esc(key)}" ${lk ? "disabled" : ""}>${took ? "Taken ✓" : "Take"}</button></div>`; }).join("");
  const rival = dayNo === 1 ? "On day 1 nobody has fought yet, so your rivals appear with their heroes only." : "Your rivals fight with the orders they used yesterday, so treat it as a guide, not a promise.";
  return head(null, `Day ${dayNo} · Today`, "Twist, contract and rehearsal") + `<div class="body">
    ${twist}
    <div class="sec"><h3>Contracts</h3><p class="muted">Take one with your orders. Complete it in tonight's battle for bonus points and gold. You can change it until you seal.</p>${cards}
      ${S.contract && !lk ? `<div class="row"><button class="btn small" data-act="cxpick" data-v="">Drop my contract</button></div>` : ""}</div>
    ${isLive() ? `<div class="sec"><h3>Rehearse tonight's battle</h3><p class="muted">Fight your current orders right now and see your personal battle report. ${rival} Nothing in a rehearsal counts, and you can rehearse as often as you like.</p>
      <div class="row"><button class="btn wax" data-act="battle" ${LIVE.readOnly ? "disabled" : ""}>⚔ Rehearse now</button></div></div>` : `<div class="sec"><h3>Fight</h3><p class="muted">In practice there is no rehearsal: this fights the day's battle. In the friends game the same button runs a rehearsal that doesn't count.</p><div class="row"><button class="btn wax" data-act="battle">⚔ Fight now</button></div></div>`}
  </div>`;
}

// ----- the personal battle report: what my decisions did -----
const plural = (w, n) => n === 1 ? w : /man$/.test(w) ? w.replace(/man$/, "men") : /s$/.test(w) ? w : w + "s";
const pct = (a, b) => b > 0 ? Math.round(100 * a / b) : 0;
function personalReport(R) {
  const me = R.me, mine = R.tel.ents.filter(e => e.pid === me), hero = mine.find(e => e.kind === "champ"), units = mine.filter(e => e.kind === "unit");
  const st = (R.stats && R.stats[me]) || null, res = R.results.find(r => r.pid === me) || {}, N = p => (R.names && R.names[p]) || (R.results.find(r => r.pid === p) || {}).name || "Someone";
  const total = mine.reduce((a, e) => a + (e.dealt || 0), 0);
  // damage by source: hero, then each soldier type
  const by = {}; units.forEach(u => { const k = u.type || "unit", b = by[k] || (by[k] = { dealt: 0, kills: 0, n: 0, alive: 0, toCastle: 0 }); b.dealt += u.dealt || 0; b.kills += u.kills || 0; b.n++; if (u.survived) b.alive++; b.toCastle += u.toCastle || 0; });
  const rows = (hero ? [["Your hero", hero.dealt || 0, `${hero.kills || 0} kills · fell ${hero.deaths || 0}×`]] : []).concat(Object.entries(by).sort((a, b) => b[1].dealt - a[1].dealt).map(([k, b]) => [`${b.n} ${plural(UNITS[k] ? UNITS[k].name : k, b.n)}`, b.dealt, `${b.kills} kills · ${b.alive}/${b.n} survived`]));
  const bars = rows.map(([lb, d, sub]) => `<div class="pr-row"><span class="pr-lb"><b>${esc(lb)}</b><small>${esc(sub)}</small></span><span class="pr-bar"><i style="width:${pct(d, total)}%"></i></span><span class="pr-v">${pct(d, total)}%</span></div>`).join("");
  const ab = hero && hero.ab ? Object.entries(hero.ab).filter(([k]) => k !== "Auto attack").sort((a, b) => (b[1].dmg + b[1].heal) - (a[1].dmg + a[1].heal))[0] : null;
  const toCastle = mine.reduce((a, e) => a + (e.toCastle || 0), 0);
  const facts = [];
  if (ab && (ab[1].dmg + ab[1].heal) > 0) facts.push(`Best skill: <b>${esc(ab[0])}</b>, ${Math.round(ab[1].dmg).toLocaleString()} damage${ab[1].heal > 50 ? ` and ${Math.round(ab[1].heal)} healing` : ""} from ${ab[1].casts || 0} cast${ab[1].casts === 1 ? "" : "s"}.`);
  facts.push(`You dealt <b>${Math.round(toCastle).toLocaleString()}</b> damage to enemy castles.`);
  if (st) {
    const atk = Object.entries(st.castleBy || {}).sort((a, b) => b[1] - a[1])[0];
    facts.push(res.fellAt != null ? `Your castle fell at <b>${fmt(res.fellAt)}</b>${st.fellTo ? ` to ${esc(N(st.fellTo))}` : ""}.` : `Your castle stood to the end with <b>${pct(st.castleEnd, 1)}%</b> health.`);
    if (atk) facts.push(`It took ${Math.round(st.castleTaken).toLocaleString()} damage, most from ${esc(N(atk[0]))} (${pct(atk[1], st.castleTaken)}%).`);
    if (st.wallHit > 0) facts.push(`Your fences soaked up ${Math.round(st.wallHit).toLocaleString()} damage.`);
    if (st.waves && st.waves.length) facts.push(`Reinforcements marched out at ${st.waves.map(fmt).join(", ")}.`);
    facts.push(st.onHill ? `Your hero spent ${st.onHill} seconds on the battleground${st.hold ? `, and you held it alone for ${st.hold}` : ""}.` : `Your hero never reached the battleground.`);
  }
  // takeaways: what to change tomorrow, tied to a decision on the planning screen
  const tips = [];
  if (res.fellAt != null && res.fellAt < 150) tips.push(`Your castle fell early. Walls, a tower, fences on the attackers' path, or a wave set to "When my castle is attacked" would buy time.`);
  if (hero && (hero.deaths || 0) >= 2) tips.push(`Your hero fell ${hero.deaths} times. More armour, a retreat rule in Orders, or a wave that hunts heroes would keep it fighting.`);
  if (units.length >= 3 && total > 0 && pct(units.reduce((a, u) => a + (u.dealt || 0), 0), total) < 30) tips.push(`Your soldiers dealt under a third of your damage. Train them, or change who they hit first in Orders.`);
  if (toCastle < 250 && res.castles === 0) tips.push(`You barely touched enemy castles, and each castle taken is worth ${castlePts(true)} points. Try a weaker target, or bring siege.`);
  if (st && !st.onHill && tips.length < 3) tips.push(`Holding the battleground pays gold and hero experience, and it is the King of the Hill contract.`);
  const c = R.contracts && R.contracts[me], ck = c && contractParse(c.key);
  const cline = c && ck ? `<div class="cxres ${c.ok ? "ok" : "no"}"><span>${ck.c.icon}</span><div><b>${c.ok ? "Contract complete" : "Contract missed"}: ${esc(ck.c.name)}</b><small>${esc(contractText(c.key, N))}</small></div><em>${c.ok ? (R.rehearsal ? `would pay +${c.pts} pts · +${c.gold}g` : `+${c.pts} pts · +${c.gold}g`) : "no bonus"}</em></div>` : "";
  const tw = R.twist ? twistInfo(R.twist) : null;
  return `<div class="sec preport"><h3>Your battle</h3>${cline}${tw ? `<p class="muted">${tw.icon} ${esc(tw.name)}: ${esc(tw.note)}</p>` : ""}
    ${bars ? `<h4>Where your damage came from</h4>${bars}` : ""}
    <ul class="pr-facts">${facts.map(f => `<li>${f}</li>`).join("")}</ul>
    ${tips.length ? `<h4>Try tomorrow</h4><ul class="pr-tips">${tips.slice(0, 3).map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</div>`;
}
