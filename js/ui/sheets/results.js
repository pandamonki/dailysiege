// Battle results and deployment sheets

function recapStats(R) {
  const per = {}; R.order.forEach(pid => per[pid] = { dealt: 0, kills: 0, healed: 0, toCastle: 0 });
  R.tel.ents.forEach(e => { const p = per[e.pid]; if (!p) return; p.dealt += e.dealt; p.kills += e.kills; p.healed += e.healed; p.toCastle += e.toCastle; });
  const score = p => p.dealt + p.healed * .6 + p.kills * 120;
  const mvp = R.order.slice().sort((a, b) => score(per[b]) - score(per[a]))[0];
  return { per, mvp };
}
function resultsSheet() {
  const R = replay.res, me = R.results.find(r => r.pid === R.me), ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
  const N = p => (R.names && R.names[p]) || (R.results.find(r => r.pid === p) || {}).name || "Someone";
  const { per, mvp } = recapStats(R), mv = per[mvp], mine = per[R.me];
  const moments = buildReel(R), dayNo = replay.day ? weekdayOf(replay.day) : DAY;
  // pacts: who was allied at the start, and who broke faith
  const bet = (R.hl || []).filter(h => h.kind === "betray" || h.kind === "bomb");
  const pactLines = (R.transfers || []).filter(t => t.from === R.me || t.to === R.me).map(t => {
    const other = t.from === R.me ? t.to : t.from, broke = bet.find(h => (h.pid === other && h.other === R.me) || (h.pid === R.me && h.other === other));
    const gold = t.gold ? ` · ${t.gold} gold ${t.from === R.me ? "paid" : "received"}` : "";
    return `<li><b>${esc(N(other))}</b>${gold} · ${broke ? (broke.pid === R.me ? `you broke it at ${fmt(broke.t)}` : `<span class="bad">betrayed you at ${fmt(broke.t)}</span>`) : "kept"}</li>`; });
  bet.filter(h => !(R.transfers || []).some(t => (t.from === R.me || t.to === R.me) && [t.from, t.to].includes(h.pid) && [t.from, t.to].includes(h.other))).forEach(h =>
    pactLines.push(`<li class="muted">${esc(N(h.pid))} ${h.pid === R.me ? "betray" : "betrayed"} ${esc(h.other === R.me ? "you" : N(h.other))} at ${fmt(h.t)}</li>`));
  // gold: tomorrow's income for live games
  let goldLine = `<div class="stat"><b>+${me.gold || 0}</b><span>gold from the field</span></div>`;
  { const lv = R.lvl && R.lvl[R.me]; if (lv) goldLine += `<div class="stat"><b>${lv.gain ? "+" + lv.gain : "0"}</b><span>hero level${lv.gain === 1 ? "" : "s"} gained${lv.gain ? ` (now ${lv.from + lv.gain})` : ""}</span></div>`; }
  if (isLive() && replay.day && R.board) {
    const after = { ...R.board }; R.results.forEach(r => after[r.pid] = (after[r.pid] || 0) + r.points);
    const sorted = R.order.slice().sort((a, b) => (after[a] || 0) - (after[b] || 0)), cu = catchUpGold(sorted.length, sorted.indexOf(R.me));
    const dow = (R.transfers || []).reduce((g, t) => g + (t.to === R.me ? t.gold : 0) - (t.from === R.me ? t.gold : 0), 0), cb = CASTLE_INCOME[((R.meta.find(m => m.kind === "castle" && m.pid === R.me) || {}).ctier || 1) - 1], tot = BASE_INCOME + cb + (me.gold || 0) + cu + dow;
    goldLine += `<div class="stat"><b>${tot >= 0 ? "+" : ""}${tot}</b><span>gold tomorrow (${BASE_INCOME} base${cb ? `, ${cb} from your castle` : ""}${cu ? `, ${cu} catch-up` : ""}${dow ? `, ${dow > 0 ? "+" : ""}${dow} dowries` : ""} and spoils)</span></div>`;
  }
  const board = R.board ? (() => { const after = { ...R.board }; R.results.forEach(r => after[r.pid] = (after[r.pid] || 0) + r.points);
    return R.order.slice().sort((a, b) => after[b] - after[a]).map((pid, i) => { const r = R.results.find(x => x.pid === pid), was = rankMap(R.board, R.order)[pid], move = was ? was - (i + 1) : 0;
      return `<div class="place${pid === R.me ? " me" : ""}"><span class="ord">${i + 1}</span><i style="background:${r.color}"></i><span><b>${esc(N(pid))}</b>${move ? ` <span class="${move > 0 ? "up" : "down"}">${move > 0 ? "▲" : "▼"}${Math.abs(move)}</span>` : ""}<br><span class="muted">+${r.points} today</span></span><span class="pts">${after[pid]}<small>points</small></span></div>`; }).join(""); })() : "";
  return head(null, `Day ${dayNo} Recap`, `The fighting lasted ${fmt(Math.min(R.duration, TMAX))}`) + `<div class="body">
    <div class="verdict"><b>${me.place === 1 ? (R.team ? "Victory, together" : "Victory") : ord(me.place) + " of " + R.results.length}</b><span class="muted">${R.team ? "Allies won the Daily Siege together. " : ""}${me.points} point${me.points === 1 ? "" : "s"} toward this week's leaderboard</span></div>
    <div class="row"><button class="btn wax" data-act="reel">▶ Play highlights</button>${canRecord() && window.claude ? `<button class="btn wood" data-act="reelrec">Save highlights video</button>` : ""}</div>
    <div class="stats">
      <div class="stat"><b>${Math.round(mine.dealt).toLocaleString()}</b><span>damage by your army</span></div>
      <div class="stat"><b>${mine.kills}</b><span>foes cut down</span></div>
      ${goldLine}
    </div>
    <div class="sec mvp"><h3>Hero of the day</h3><div class="spread"><span><i class="sw" style="background:${R.colors[mvp]}"></i><b>${esc(N(mvp))}</b> · ${CLASSES[R.results.find(r => r.pid === mvp).cls].name}</span>
      <span class="muted">${Math.round(mv.dealt).toLocaleString()} damage · ${mv.kills} kills${mv.healed > 200 ? ` · ${Math.round(mv.healed)} healed` : ""}</span></div></div>
    ${moments.length ? `<div class="sec"><h3>Key moments</h3><ol class="moments">${moments.map(m => `<li><button data-act="rjump" data-v="${m.a.toFixed(1)}"><span class="mt">${fmt(m.h.t)}</span><span><b>${esc(m.title)}</b><br><span class="muted">${esc(m.sub)}</span></span></button></li>`).join("")}</ol></div>` : ""}
    ${diplomacySection(R)}
    ${pactLines.length ? `<div class="sec"><h3>Pacts</h3><ul class="pacts">${pactLines.join("")}</ul></div>` : ""}
    ${board ? `<div class="sec"><h3>${isLive() ? "This week's leaderboard" : "Test leaderboard"}</h3>${board}</div>` : ""}
    <div class="sec"><h3>Final placings</h3>${R.results.map(r => `<div class="place${r.pid === R.me ? " me" : ""}"><span class="ord">${ord(r.place)}</span><i style="background:${r.color}"></i><span><b>${esc(N(r.pid))}</b> · ${CLASSES[r.cls].name}<br><span class="muted">${r.fellAt != null ? `Castle fell at ${fmt(r.fellAt)}` : "Still standing"}</span></span><span class="pts">${r.points}<small>${r.kills} kills · ${r.castles} castles</small></span></div>`).join("")}
    <p class="muted">Points: 10 for first down to 0 for last, plus 1 per hero slain and 2 per castle taken.</p></div>
    <div class="row"><button class="btn wood" data-act="rrestart">Watch full replay</button>${isLive() ? "" : `<button class="btn" data-act="lab">Battle stats</button>`}<button class="btn wax" data-act="rexit">Back to planning</button></div></div>`;
}
function deploySheet(key) {
  const up = unplaced();
  return head(null, "Deploy Here", "Choose who takes this ground") + `<div class="body"><div class="wares">
    ${up.map(p => `<div class="ware"><img alt="" src="${pieceImg(p)}"><div class="nm"><span>${esc(pieceName(p))}</span></div><div class="ds">Waiting in the barracks</div><button class="btn small wood" data-act="deploy" data-v="${p}" data-k="${key}" ${dis()}>Place here</button></div>`).join("")}</div></div>`;
}
