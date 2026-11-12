// Battle results and deployment sheets

function recapStats(R) {
  const per = {}; R.order.forEach(pid => per[pid] = { dealt: 0, kills: 0, healed: 0, toCastle: 0 });
  R.tel.ents.forEach(e => { const p = per[e.pid]; if (!p) return; p.dealt += e.dealt; p.kills += e.kills; p.healed += e.healed; p.toCastle += e.toCastle; });
  const score = p => p.dealt + p.healed * .6 + p.kills * 120;
  const mvp = R.order.slice().sort((a, b) => score(per[b]) - score(per[a]))[0];
  return { per, mvp };
}
// The end of the war: the podium and the war-long prizes, worked out from the week's saved battles plus the one just fought.
function warFinale(R, N) {
  const days = Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === R.week && k !== replay.day).sort().map(k => LIVE.battles[k].results || []).concat([R.results]);
  const tot = {}, best = {}, sum = (f) => { const o = {}; days.forEach(d => d.forEach(r => { o[r.pid] = (o[r.pid] || 0) + (f(r) || 0); })); return o; };
  days.forEach(d => d.forEach(r => { tot[r.pid] = (tot[r.pid] || 0) + r.points; if (r.points > (best[r.pid] || 0)) best[r.pid] = r.points; }));
  const rank = R.order.slice().sort((a, b) => (tot[b] || 0) - (tot[a] || 0)), through3 = rankMap((() => { const o = {}; days.slice(0, 3).forEach(d => d.forEach(r => { o[r.pid] = (o[r.pid] || 0) + r.points; })); return o; })(), R.order), wins = sum(r => r.place === 1 ? 1 : 0);
  const top = (o, min = 1) => { const k = Object.keys(o).sort((a, b) => (o[b] - o[a]) || (rank.indexOf(a) - rank.indexOf(b)))[0]; return k && o[k] >= min ? [k, o[k]] : null; };
  const moved = {}; rank.forEach((pid, i) => { if (through3[pid]) moved[pid] = through3[pid] - (i + 1); });
  const prizes = [["Kingslayer", top(sum(r => r.castles)), n => `${n} castle${n === 1 ? "" : "s"} taken`], ["Oathbreaker", top(sum(r => r.treachery)), n => `${n} betrayal${n === 1 ? "" : "s"}`], ["Hero hunter", top(sum(r => r.kills)), n => `${n} heroes slain`],
    ["Best day", top(best), n => `${n} points in one battle`], ["Day winner", top(wins), n => `${n} day${n === 1 ? "" : "s"} won`], ["Most improved", top(moved), n => `up ${n} place${n === 1 ? "" : "s"} since day 3`]].filter(x => x[1]);
  const medal = ["🥇", "🥈", "🥉"], col = pid => (R.results.find(r => r.pid === pid) || {}).color || "#888";
  return `<div class="sec finale"><h3>⚔ The war is won</h3>
    ${rank.slice(0, 3).map((pid, i) => `<div class="place${pid === R.me ? " me" : ""}"><span class="ord">${medal[i]}</span><i style="background:${col(pid)}"></i><span><b>${esc(N(pid))}</b>${i === 0 ? `<br><span class="muted">Winner of the war</span>` : ""}</span><span class="pts">${tot[pid] || 0}<small>points</small></span></div>`).join("")}
    ${prizes.length ? `<h3 style="margin-top:10px">War prizes</h3><ul class="pacts">${prizes.map(([t, [pid, n], f]) => `<li><b>${t}</b> · ${esc(N(pid))}${pid === R.me ? " (you)" : ""} <span class="muted">· ${f(n)}</span></li>`).join("")}</ul>` : ""}</div>`;
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
    const dow = (R.transfers || []).reduce((g, t) => g + (t.to === R.me ? t.gold : 0) - (t.from === R.me ? t.gold : 0), 0), cb = CASTLE_INCOME[((R.meta.find(m => m.kind === "castle" && m.pid === R.me) || {}).ctier || 1) - 1], bi = baseIncome(dayNo), tot = bi + cb + (me.gold || 0) + cu + dow;
    goldLine += `<div class="stat"><b>${tot >= 0 ? "+" : ""}${tot}</b><span>gold tomorrow (${bi} base${cb ? `, ${cb} from your castle` : ""}${cu ? `, ${cu} catch-up` : ""}${dow ? `, ${dow > 0 ? "+" : ""}${dow} dowries` : ""} and spoils)</span></div>`;
  }
  const v2 = replay.day ? balV2For(replay.day) : true, wt = dayWeight(v2, dayNo), finale = isLive() && replay.day && dayNo === 7 && R.week ? warFinale(R, N) : "";
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
    ${finale}
    ${diplomacySection(R)}
    ${pactLines.length ? `<div class="sec"><h3>Pacts</h3><ul class="pacts">${pactLines.join("")}</ul></div>` : ""}
    ${board ? `<div class="sec"><h3>${isLive() ? "This week's leaderboard" : "Test leaderboard"}</h3>${board}</div>` : ""}
    <div class="sec"><h3>Final placings</h3>${R.results.map(r => `<div class="place${r.pid === R.me ? " me" : ""}"><span class="ord">${ord(r.place)}</span><i style="background:${r.color}"></i><span><b>${esc(N(r.pid))}</b> · ${CLASSES[r.cls].name}<br><span class="muted">${r.fellAt != null ? `Castle fell at ${fmt(r.fellAt)}` : "Still standing"}</span></span><span class="pts">${r.points}<small>${r.kills} kills · ${r.castles} castles</small></span></div>`).join("")}
    <p class="muted">Points: 10 for first down to 0 for last, plus 1 per hero slain and 2 per castle taken${wt > 1 ? `. <b>Today every point counts ×${wt}</b>: the last days of the week are worth more` : ""}${v2 ? ". A betrayer who sets off the bomb earns 3 more" : ""}.</p></div>
    <div class="row"><button class="btn wood" data-act="rrestart">Watch full replay</button>${isLive() ? "" : `<button class="btn" data-act="lab">Battle stats</button>`}<button class="btn wax" data-act="rexit">Back to planning</button></div></div>`;
}
function deploySheet(key) {
  const up = unplaced();
  return head(null, "Deploy Here", "Choose who takes this ground") + `<div class="body"><div class="wares">
    ${up.map(p => `<div class="ware"><img alt="" src="${pieceImg(p)}"><div class="nm"><span>${esc(pieceName(p))}</span></div><div class="ds">Waiting in the barracks</div><button class="btn small wood" data-act="deploy" data-v="${p}" data-k="${key}" ${dis()}>Place here</button></div>`).join("")}</div></div>`;
}
