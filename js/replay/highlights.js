// Highlights reel

// ================= highlights reel =================
// Key moments are flagged by the battle sim (res.hl). The reel picks the best few, then plays each as a short
// directed clip: a title card, the camera on the action, a slow-motion beat at the key instant, and a closing podium.
const PRACTICE_BOARD = { p1: 34, p3: 27, p5: 22, you: 18, p2: 15, p6: 11, p4: 8, p7: 5 };
function rankMap(pts, pids) {
  if (!pids.some(p => (pts[p] || 0) > 0)) return {};
  const o = pids.slice().sort((a, b) => (pts[b] || 0) - (pts[a] || 0)); return Object.fromEntries(o.map((p, i) => [p, i + 1]));
}
const STREAKS = [[4, "Quad Squad"], [6, "Mowing the Lawn"], [8, "Pitchfork Panic"], [11, "Heads Will Roll"], [15, "Butcher of the Realm"], [20, "Daily Siege Legend"]]; // [kill weight in a chain, name]
const HL_WIN = { betray: [1.5, 3.5], bomb: [2, 3], burst: [2.5, 1.5], fall: [4, 2], upset: [4, 2.2], revenge: [4, 2.2], giantslayer: [3, 1.6], firstblood: [3, 1.5], winner: [4.5, 2.5] };
function hlText(h, R) {
  const N = p => (R.names && R.names[p]) || "Someone", you = p => p === R.me, V = (p, a, b) => `${N(p)} ${you(p) ? a : b}`;
  const poss = p => (you(p) ? "Your" : N(p) + "'s"), rk = p => (R.ranks && R.ranks[p] ? `#${R.ranks[p]} ` : "");
  switch (h.kind) {
    case "betray": return ["Betrayal!", `${V(h.pid, "turn", "turns")} on ${you(h.other) ? "you" : N(h.other)} and ${you(h.pid) ? "blow" : "blows"} up ${you(h.other) ? "your" : "their"} keep`];
    case "bomb": return ["Rigged dowry!", `${poss(h.pid)} ${h.gold} gold of barrels explodes in ${you(h.other) ? "your" : N(h.other) + "'s"} castle`];
    case "spree": return [h.streak || "Quad Squad", `${V(h.pid, "cut", "cuts")} down ${h.n} foes in ${Math.max(1, Math.round(h.t2 - h.t0))}s`];
    case "burst": return ["Carnage", `${V(h.pid, "deal", "deals")} ${h.dmg} damage in 3 seconds`];
    case "upset": return ["Underdog upset!", `${you(h.other) ? "You" : rk(h.other) + N(h.other)} ${you(h.other) ? "topple" : "topples"} ${you(h.pid) ? `your castle (${rk(h.pid).trim()})` : rk(h.pid) + N(h.pid) + "'s castle"}`];
    case "revenge": return ["Revenge", `${V(h.other, "burn", "burns")} the traitor ${you(h.pid) ? "you" : N(h.pid)} to the ground`];
    case "fall": return [h.rank && h.rank <= 3 ? "A giant falls" : "A castle falls", `${you(h.pid) ? `Your castle (${rk(h.pid).trim()})` : rk(h.pid) + N(h.pid) + "'s castle"} falls${h.other ? ` to ${N(h.other)}` : ""}`];
    case "giantslayer": return ["Giant slayer", `${you(h.pid) ? "You slay" : rk(h.pid) + N(h.pid) + " slays"} ${you(h.other) ? "your" : rk(h.other) + N(h.other) + "'s"} hero`];
    case "firstblood": return ["First blood", `${V(h.pid, "draw", "draws")} first blood against ${you(h.other) ? "you" : N(h.other)}`];
    case "ult": return h.ab === "Meteor" ? ["Meteor!", `${poss(h.pid)} Meteor crashes into ${h.n} foes`] : ["Assassinated", `${poss(h.pid)} Rogue executes ${you(h.other) ? "your" : N(h.other) + "'s"} hero`];
    case "winner": return [`${V(h.pid, "win", "wins")} the Daily Siege`, h.timeout ? "Night falls with the strongest castle standing" : h.clutch ? `Clutch! The castle held on at ${Math.max(1, Math.round(h.hpFrac * 100))}%` : "Last castle standing"];
  }
  return ["", ""];
}
function hlWindow(h) {
  if (h.kind === "spree") return [Math.max(h.t0 - 1, h.t2 - 8), h.t2 + 2, h.t2];
  if (h.kind === "ult") return h.ab === "Meteor" ? [h.t - 2.6, h.t + 1.6, h.t] : [h.t - 1.5, h.t + 2, h.t];
  const w = HL_WIN[h.kind] || [3, 2]; return [h.t - w[0], h.t + w[1], h.t];
}
function buildReel(R) {
  const hl = (R.hl || []).filter(h => h.kind !== "winner" && !(h.kind === "fall" && !(h.rank && h.rank <= 3)));
  const picked = [];
  hl.slice().sort((a, b) => b.score - a.score).forEach(h => {
    if (picked.length >= 6 || picked.filter(p => p.kind === h.kind).length >= 2) return; const [a, b] = hlWindow(h);
    if (picked.some(p => { const [c, d] = hlWindow(p); return a < d + .5 && c < b + .5; })) return; picked.push(h);
  });
  const win = (R.hl || []).find(h => h.kind === "winner");
  picked.sort((a, b) => a.t - b.t);
  if (win) { const [a] = hlWindow(win); for (let i = picked.length - 1; i >= 0; i--) if (hlWindow(picked[i])[1] > a - .5) picked.splice(i, 1); picked.push(win); }
  const champIdx = pid => R.meta.findIndex(m => m.pid === pid && m.kind === "champ");
  return picked.map(h => { const [a, b, key] = hlWindow(h), [title, sub] = hlText(h, R);
    const follow = ["spree", "burst", "betray", "firstblood", "giantslayer"].includes(h.kind) || (h.kind === "ult" && h.ab !== "Meteor") ? champIdx(h.kind === "giantslayer" || h.kind === "firstblood" ? h.other : h.pid) : -1;
    return { h, a: Math.max(0, a), b: Math.min(R.duration, b), key, title, sub, follow, color: R.colors[h.kind === "fall" || h.kind === "upset" ? (h.other || h.pid) : h.kind === "revenge" ? h.other : h.pid] || "#ffe082" }; });
}
const REEL_CARD = 1.3, REEL_INTRO = 2.2, REEL_OUTRO = 4;
function startReel(record) {
  if (!replay) return; const clips = buildReel(replay.res);
  if (!clips.length) { toast("Nothing big happened in this battle."); return; }
  replay.reel = { clips, i: -1, phase: "intro", pt: 0, rec: null }; replay.playing = false; replay.sel = null; sheet = null;
  render(); buildReelUI();
  if (record) startRecording();
}
function stopReel(toRecap) {
  if (!replay || !replay.reel) return; const rec = replay.reel.rec; replay.reel = null;
  if (rec && rec.mr.state !== "inactive") rec.mr.stop();
  buildReplayUI(); if (reportBack) leaveBattle(); else if (toRecap) open("results"); else render();
}
function reelSpeed(c, time) { const d = time - c.key; return d > -.7 && d < .9 ? .4 : 1; }
function reelFocus(c, time) {
  if (c.follow >= 0) { const f = replayFrameAt(time), b = c.follow * 4; if (f && f.d[b] != null && !(f.d[b + 3] & 1)) return [f.d[b], f.d[b + 1]]; }
  return [c.h.x, c.h.y];
}
function tickReel(dt) {
  const r = replay.reel; r.pt += dt;
  if (r.phase === "intro" && r.pt >= REEL_INTRO) nextClip(r);
  else if (r.phase === "card" && r.pt >= REEL_CARD) { r.phase = "clip"; r.pt = 0; }
  else if (r.phase === "clip") {
    const c = r.clips[r.i]; replay.time = Math.min(c.b, replay.time + dt * reelSpeed(c, replay.time));
    const [x, y] = reelFocus(c, replay.time); flyTo(x * ts, (y - .3) * ts, c.h.kind === "winner" || c.h.kind === "fall" || c.h.kind === "upset" || c.h.kind === "revenge" || c.h.kind === "bomb" ? 1.45 : 1.75);
    if (replay.time >= c.b) nextClip(r);
  } else if (r.phase === "outro" && r.pt >= REEL_OUTRO) { const rec = r.rec; stopReel(!rec); }
}
function nextClip(r) {
  r.i++; r.pt = 0;
  if (r.i >= r.clips.length) { r.phase = "outro"; flyTo(W / 2, W / 2, 0); return; }
  const c = r.clips[r.i]; r.phase = "card"; replay.time = c.a;
  const [x, y] = reelFocus(c, c.a), z = Math.max(minZoom(), Math.min(2.4, 1.6)); camTarget = null; Object.assign(cam, { x: x * ts - vw / 2 / z, y: (y - .3) * ts - vh / 2 / z, z }); clampCam();
  const el = document.getElementById("reelstep"); if (el) el.textContent = `${r.i + 1} / ${r.clips.length}`;
}
function buildReelUI() {
  document.getElementById("rbar").innerHTML = `<div class="rctl reelctl"><span class="reeltag">Highlights <b id="reelstep">0 / ${replay.reel.clips.length}</b></span>
    <span id="recdot" class="recdot" hidden>● Recording</span>
    <button class="btn small" data-act="reelskip">Skip</button><button class="btn small wax" data-act="reelstop">Stop</button></div>
    <p class="rtip">Key moments from the battle. The full replay and report are one tap away when it ends.</p>`;
  document.getElementById("banner").hidden = true;
}
// lower-third captions, title cards and the podium are painted onto the canvas itself so a saved video carries them
// a full-width announcement that slams in, holds, then fades; drawn on the canvas so saved videos carry it
function slamBanner(text, sub, color, age, y, s, hold = 2.2) {
  if (age < 0 || age > hold) return; const a = Math.min(1, age / .12, (hold - age) / .4), pop = age < .3 ? 1 + .7 * (1 - age / .3) ** 2 : 1, serif = "Alegreya, Georgia, serif", H2 = vh, W2 = vw, bh = 78 * s;
  ctx.save(); ctx.globalAlpha = a; const cy = H2 * y;
  ctx.fillStyle = "rgba(18,8,4,.82)"; ctx.fillRect(0, cy - bh / 2, W2, bh); ctx.fillStyle = color; ctx.fillRect(0, cy - bh / 2, W2, 4); ctx.fillRect(0, cy + bh / 2 - 4, W2, 4);
  ctx.translate(W2 / 2, cy - (sub ? 8 * s : 0)); ctx.scale(pop, pop); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  let fs = 46 * s; ctx.font = `800 ${fs}px ${serif}`; while (ctx.measureText(text).width > W2 - 28 && fs > 14) { fs -= 2; ctx.font = `800 ${fs}px ${serif}`; }
  ctx.lineWidth = Math.max(4, fs / 8); ctx.strokeStyle = "rgba(20,8,4,.9)"; ctx.strokeText(text, 0, 0); ctx.fillStyle = lighten(color); ctx.fillText(text, 0, 0);
  if (sub) { ctx.font = `600 ${16 * s}px ${serif}`; ctx.fillStyle = "#fff4d6"; ctx.fillText(sub, 0, fs * .62 + 8 * s, W2 - 24); }
  ctx.restore();
}
function bigBanners(c, s) {
  const h = c.h, R = replay.res, N = p => (R.names && R.names[p]) || "Someone", you = p => p === R.me;
  if (h.kind === "betray") slamBanner("BETRAYAL!", `${you(h.pid) ? "You" : N(h.pid)} turned on ${you(h.other) ? "you" : N(h.other)} and blew up the keep`, "#e0503f", replay.time - h.t, .3, s, 3.2);
  if (h.kind === "spree") (h.marks || []).forEach((m, i, arr) => { const end = i + 1 < arr.length ? Math.min(2.4, arr[i + 1].t - m.t) : 2.6; slamBanner(m.name.toUpperCase(), `${you(h.pid) ? "You" : N(h.pid)} · ${m.n} kills in a row`, c.color, replay.time - m.t, .3, s, end); });
}
function drawReel() {
  const r = replay.reel, R = replay.res; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W2 = vw, H2 = vh, serif = "Alegreya, Georgia, serif";
  const shade = a => { ctx.fillStyle = `rgba(18,12,6,${a})`; ctx.fillRect(0, 0, W2, H2); };
  const center = (txt, y, size, color, weight = 700) => { ctx.font = `${weight} ${size}px ${serif}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(3, size / 7); ctx.strokeStyle = "rgba(20,12,6,.85)"; ctx.strokeText(txt, W2 / 2, y, W2 - 32); ctx.fillStyle = color; ctx.fillText(txt, W2 / 2, y, W2 - 32); };
  const s = Math.min(1, W2 / 420);
  if (r.phase === "intro") {
    shade(.72); const day = replay.day ? `Day ${weekdayOf(replay.day)}` : `Day ${DAY}`;
    center("Daily Siege", H2 * .36, 22 * s, "#c9962f"); center(`${day} Highlights`, H2 * .47, 36 * s, "#fff4d6");
    center(`${r.clips.length} moment${r.clips.length === 1 ? "" : "s"} · ${fmt(Math.min(R.duration, TMAX))} of fighting`, H2 * .58, 16 * s, "#e8dcc0", 500);
  } else if (r.phase === "card" || r.phase === "clip") {
    const c = r.clips[r.i];
    if (r.phase === "card") { const a = Math.min(1, r.pt / .25, (REEL_CARD - r.pt) / .25 + .35); shade(.55 * a);
      ctx.globalAlpha = Math.min(1, r.pt / .2); center(c.title, H2 * .44, 40 * s, c.color === "#ffe082" ? "#ffe082" : lighten(c.color)); center(c.sub, H2 * .56, 18 * s, "#fff4d6", 600); ctx.globalAlpha = 1; }
    else {
      bigBanners(c, s);
      const bh = 54 * s + 10; ctx.fillStyle = "rgba(18,12,6,.72)"; ctx.fillRect(0, H2 - bh, W2, bh); ctx.fillStyle = c.color; ctx.fillRect(0, H2 - bh, 6, bh);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = `700 ${Math.round(20 * s)}px ${serif}`; ctx.fillStyle = "#ffe9b0"; ctx.fillText(c.title, 16, H2 - bh + 24 * s + 4, W2 - 90);
      ctx.font = `500 ${Math.round(15 * s)}px ${serif}`; ctx.fillStyle = "#f3e6c8"; ctx.fillText(c.sub, 16, H2 - 12, W2 - 32);
      ctx.textAlign = "right"; ctx.font = `600 ${Math.round(13 * s)}px ${serif}`; ctx.fillStyle = "#c9b48a"; ctx.fillText(fmt(replay.time), W2 - 12, H2 - bh + 24 * s + 4);
      if (reelSpeed(c, replay.time) < 1) { ctx.textAlign = "right"; ctx.fillStyle = "#ffe082"; ctx.font = `700 ${Math.round(12 * s)}px ${serif}`; ctx.fillText("SLOW MOTION", W2 - 12, 22); }
    }
  } else if (r.phase === "outro") {
    shade(Math.min(.8, r.pt / .4 * .8)); const top = R.results.slice(0, 3);
    center("The Day's Podium", H2 * .2, 28 * s, "#ffe9b0");
    const pos = [[.5, .42, 1], [.22, .52, 2], [.78, .58, 3]];
    top.forEach((res, i) => { const [px, py] = pos[i], x = W2 * px, y = H2 * py, rad = (i ? 22 : 30) * s;
      ctx.fillStyle = res.color; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#ffe082"; ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#1e140c"; ctx.font = `800 ${Math.round(rad)}px ${serif}`; ctx.fillText(String(i + 1), x, y + 1);
      ctx.fillStyle = "#fff4d6"; ctx.font = `700 ${Math.round(16 * s)}px ${serif}`; ctx.fillText((R.names && R.names[res.pid]) || res.name, x, y + rad + 16 * s, W2 / 3 - 8);
      ctx.fillStyle = "#d9c79e"; ctx.font = `500 ${Math.round(13 * s)}px ${serif}`; ctx.fillText(`${res.points} pts`, x, y + rad + 33 * s); });
  }
  ctx.textAlign = "start";
}
function lighten(hex) { const n = parseInt(hex.slice(1), 16), f = v => Math.min(255, Math.round(v + (255 - v) * .45)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
