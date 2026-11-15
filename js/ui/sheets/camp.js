// Mercenary camp: sealed bids for sell-sword groups, open from day 4
const mercOpen = () => !!S && (isLive() ? liveClock().dayNo : DAY) >= MERC_DAY;
const mercDocOf = k => { if (isLive()) { const ck = liveClock(), b = LIVE.battles[addDays(ck.planDay, -k)]; return b && b.week === ck.week ? b : null; } const h = (S.mercHist || {})[DAY - k]; return h ? { mercs: h } : null; };
const mercWait = id => mercCool(id, null, mercDocOf);
const myBids = () => Object.entries(S.bids || {}).filter(([id, b]) => b.day === planDayKey() && MERCS[id]);
const bidsReserved = () => myBids().reduce((a, [, b]) => a + b.gold, 0);
const mercV2Now = () => (typeof isLive === "function" && isLive() ? mercV2For(liveClock().planDay) : true); // practice always uses the headliner camp
const mercDayNo = () => (isLive() ? liveClock().dayNo : DAY);
const mercToday = () => mercRoster(mercDayNo(), mercWait);
const mercSeenKey = () => (mercV2Now() ? "d" + planDayKey() : isLive() ? liveClock().week : "p"); // the headliner camp announces itself every day, the old camp once a week
const mercDue = () => !!S && !S.lobbyPrep && mercOpen() && S.mercSeen !== mercSeenKey();
function bidSummary() { const b = myBids(); return b.length ? b.map(([id, x]) => `${MERCS[id].name} ${x.gold}g`).join(", ") : ""; }
const mercSprites = m => Object.entries(m.units.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {})).map(([t, n]) => `<span class="munit"><img alt="" src="${spriteURL(t)}">${n > 1 ? "×" + n : ""}</span>`).join("");
// the headliner camp: a wide card for today's new group, three regular tiles below it, and the chosen group's details and bid
function campSheet() {
  if (!mercV2Now()) return campSheetV1();
  const today = planDayKey(), R = mercToday(), pick = [R.head, ...R.tiles].includes(sheet.pick) ? sheet.pick : R.head, myBid = id => { const b = (S.bids || {})[id]; return b && b.day === today ? b.gold : 0; };
  const hm = MERCS[R.head], hb = myBid(R.head);
  const headCard = `<button class="mhead${pick === R.head ? " on" : ""}" data-act="mpick" data-v="${R.head}" aria-label="${esc(hm.name)}">
      <span class="mtag">New today</span><span class="mhimg">${mercSprites(hm)}</span>
      <span class="mhtx"><b>${esc(hm.name)}</b><small>${esc(hm.note)}</small></span>
      <span class="mhpr"><i class="coin"></i>${hm.min}${hb ? `<small class="st st-d">Your bid</small>` : ""}</span></button>`;
  const tiles = R.tiles.map(id => { const m = MERCS[id], w = mercWait(id); return tile("mpick", id, pick === id, spriteURL(m.units[0]), esc(m.name), { price: w ? null : m.min, lk: !!w, tag: w ? ["r", `Back in ${w}d`] : myBid(id) ? ["d", "Your bid"] : null }); }).join("");
  const m = MERCS[pick], wait = mercWait(pick), mine = myBid(pick);
  const det = udet(esc(m.name), m.min, `<p>${esc(m.note)}</p><div class="mrow mdet msp">${mercSprites(m)}</div>
      ${wait ? `<p class="need">⏳ Resting after a battle: back in ${wait} day${wait > 1 ? "s" : ""}.</p>`
        : `<div class="mrow mdet"><span class="stepper"><button class="btn small" data-act="mbid" data-k="${pick}" data-v="-1" ${dis(!mine)}>−</button><b>${mine ? mine + "g" : "No bid"}</b><button class="btn small" data-act="mbid" data-k="${pick}" data-v="1" ${dis()}>${mine ? "+" : "Bid " + m.min + "g"}</button></span>${mine ? `<button class="btn small" data-act="mclear" data-k="${pick}" ${dis()}>Withdraw</button>` : ""}</div>`}`);
  const bid = myBids()[0];
  return head(null, "Mercenary Camp", "Sealed bids · one group a day") + `<div class="body">
    ${sheet.news ? `<p class="note gold"><b>New in the camp today: the ${esc(hm.name)}!</b> ${R.head === MERC_HEAD[0] ? "The mercenaries were drawn by all your bloodshed and now offer their services to the highest bidder." : "A stronger band arrives every day until the week ends."}</p>` : ""}
    <p class="muted">Bids are sealed and you can bid on one group a day. The highest bid wins that group for tonight's battle and pays it; lose and you pay nothing. A hired group rests for ${MERC_COOL} days, for everyone. ${bid ? `Your bid: <b>${esc(MERCS[bid[0]].name)}, ${bid[1].gold}g</b>.` : ""}</p>
    ${headCard}<div class="ugrid shopg mtiles">${tiles}</div>${det}</div>`;
}
function campSheetV1() {
  const today = planDayKey(), news = sheet.news, bids = myBids().length;
  const card = ([id, m]) => { const wait = mercWait(id), b = (S.bids || {})[id], mine = b && b.day === today ? b.gold : 0;
    return `<div class="mcard${wait ? " cool" : ""}"><div class="spread"><b>${esc(m.name)}</b><span class="chip"><i class="coin"></i> from ${mercMin(id, false)}</span></div>
      <p class="muted">${esc(m.note)}</p>
      <div class="mrow">${m.units.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {}) && Object.entries(m.units.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {})).map(([t, n]) => `<span class="munit"><img alt="" src="${spriteURL(t)}">${n > 1 ? "×" + n : ""}</span>`).join("")}</div>
      ${wait ? `<p class="need">⏳ Recharging: back in ${wait} day${wait > 1 ? "s" : ""}.</p>`
        : `<div class="mrow"><span class="stepper"><button class="btn small" data-act="mbid" data-k="${id}" data-v="-1" ${dis(!mine)}>−</button><b>${mine ? mine + "g" : "No bid"}</b><button class="btn small" data-act="mbid" data-k="${id}" data-v="1" ${dis()}>${mine ? "+" : "Bid " + mercMin(id, false) + "g"}</button></span>${mine ? `<button class="btn small" data-act="mclear" data-k="${id}" ${dis()}>Withdraw</button>` : ""}</div>`}</div>`; };
  return head(null, "Mercenary Camp", "Sealed bids · highest bid wins") + `<div class="body">
    ${news ? `<p class="note gold"><b>The mercenaries were drawn by all your bloodshed</b> and now offer their services in battle to the highest bidder.</p>` : ""}
    <p class="muted">Bids are sealed. Each group serves the highest bidder in tonight's battle, who pays their own bid. Lose, and you pay nothing. Hired groups then rest for ${MERC_COOL} days, for everyone. They don't use up your supply. ${bids ? `You have <b>${bidsReserved()}g</b> set aside in bids.` : ""}</p>
    ${MERC_V1_IDS.map(id => [id, MERCS[id]]).map(card).join("")}</div>`;
}
