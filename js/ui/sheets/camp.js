// Mercenary camp: sealed bids for sell-sword groups, open from day 4
const mercOpen = () => !!S && (isLive() ? liveClock().dayNo : DAY) >= MERC_DAY;
const mercDocOf = k => { if (isLive()) { const ck = liveClock(), b = LIVE.battles[addDays(ck.planDay, -k)]; return b && b.week === ck.week ? b : null; } const h = (S.mercHist || {})[DAY - k]; return h ? { mercs: h } : null; };
const mercWait = id => mercCool(id, null, mercDocOf);
const myBids = () => Object.entries(S.bids || {}).filter(([id, b]) => b.day === planDayKey() && MERCS[id]);
const bidsReserved = () => myBids().reduce((a, [, b]) => a + b.gold, 0);
const mercDue = () => !!S && !S.lobbyPrep && mercOpen() && S.mercSeen !== (isLive() ? liveClock().week : "p");
function bidSummary() { const b = myBids(); return b.length ? b.map(([id, x]) => `${MERCS[id].name} ${x.gold}g`).join(", ") : ""; }
function campSheet() {
  const today = planDayKey(), news = sheet.news, bids = myBids().length;
  const card = ([id, m]) => { const wait = mercWait(id), b = (S.bids || {})[id], mine = b && b.day === today ? b.gold : 0;
    return `<div class="mcard${wait ? " cool" : ""}"><div class="spread"><b>${esc(m.name)}</b><span class="chip"><i class="coin"></i> from ${m.min}</span></div>
      <p class="muted">${esc(m.note)}</p>
      <div class="mrow">${m.units.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {}) && Object.entries(m.units.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {})).map(([t, n]) => `<span class="munit"><img alt="" src="${spriteURL(t)}">${n > 1 ? "×" + n : ""}</span>`).join("")}</div>
      ${wait ? `<p class="need">⏳ Recharging: back in ${wait} day${wait > 1 ? "s" : ""}.</p>`
        : `<div class="mrow"><span class="stepper"><button class="btn small" data-act="mbid" data-k="${id}" data-v="-1" ${dis(!mine)}>−</button><b>${mine ? mine + "g" : "No bid"}</b><button class="btn small" data-act="mbid" data-k="${id}" data-v="1" ${dis()}>${mine ? "+" : "Bid " + m.min + "g"}</button></span>${mine ? `<button class="btn small" data-act="mclear" data-k="${id}" ${dis()}>Withdraw</button>` : ""}</div>`}</div>`; };
  return head(null, "Mercenary Camp", "Sealed bids · highest bid wins") + `<div class="body">
    ${news ? `<p class="note gold"><b>The mercenaries were drawn by all your bloodshed</b> and now offer their services in battle to the highest bidder.</p>` : ""}
    <p class="muted">Bids are sealed. Each group serves the highest bidder in tonight's battle, who pays their own bid. Lose, and you pay nothing. Hired groups then rest for ${MERC_COOL} days, for everyone. They don't use up your supply. ${bids ? `You have <b>${bidsReserved()}g</b> set aside in bids.` : ""}</p>
    ${Object.entries(MERCS).map(card).join("")}</div>`;
}
