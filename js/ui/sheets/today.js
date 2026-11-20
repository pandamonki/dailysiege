// The day's twist, the contract board (Orders > Contracts), rehearsal, and the personal battle report

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

// a contract is still to be taken for the next battle
const cxOpen = () => { try { return !!(S && !S.locked && !(isLive() && LIVE.readOnly) && !S.contract && contractsOn() && myOffers().length); } catch (e) { return false; } };
// no pop-up for the contract board: it sits behind the ! above the map (which pulses until one is taken) and on the seal checklist

// Orders > Contracts: the offers for the next battle and the twist, sized to fit one screen (rehearsal is on the seal screen)
const twistArt = id => ART.twist[id && TWISTS[id] ? id : "calm"];
function twistStripHTML(compact) {
  const tw = myTwist(), ti = twistInfo(tw), nx = tomorrowTwist();
  return `<div class="twstrip">${artImg(twistArt(tw), "twart")}<div><small>Today's twist</small><b>${esc(ti.name)}</b><span>${esc(ti.note)}</span>${!compact && nx !== undefined ? `<em>Tomorrow: ${esc(twistInfo(nx).name)}. ${esc(twistInfo(nx).note)}</em>` : !compact ? `<em>The last day of the war.</em>` : ""}</div></div>`;
}
function contractsTab() {
  const tw = myTwist(), offers = myOffers(), lk = S.locked || (isLive() && LIVE.readOnly), on = contractsOn();
  const cards = !on ? `<p class="muted">Contracts begin with the battle of ${esc(CONTRACTS_FROM)}.</p>` : !offers.length ? `<p class="muted">No contracts for you today.</p>` : offers.map(key => {
    const k = contractParse(key), pay = contractPay(key, tw), took = S.contract === key;
    return `<button class="cxcard${took ? " on" : ""} t${k.c.tier}" data-act="cxpick" data-v="${took ? "" : esc(key)}" ${lk ? "disabled" : ""} aria-pressed="${took}">${artImg(ART.cx[k.id], "cxart")}<span class="cx-tx"><span class="cxh"><small>${TIER_NAME[k.c.tier]}</small><b>${esc(k.c.name)}</b></span><span>${esc(contractText(key, cxName))}</span></span>
      <span class="cxpay"><b>+${pay.pts}</b><small>pts</small><b>+${pay.gold}</b><small>gold</small></span><span class="cxtick">${took ? "✓" : ""}</span></button>`; }).join("");
  return `<div class="sec tight"><h3>Contracts for the next battle ${S.contract ? `<span class="cnt ok">taken</span>` : `<span class="cnt">pick one</span>`}</h3><p class="muted">Tap one to take it, tap again to drop it. Complete it in the battle for the bonus. You can change it until you seal.</p>${cards}</div>
    ${twistStripHTML()}`;
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
  if (res.fellAt != null && res.fellAt < 150) tips.push(`Your castle fell early. Walls, a tower, fences on the attackers' path, or a wave set to "${waveV4Now() ? "When enemies reach my castle" : "When my castle is attacked"}" would buy time.`);
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
