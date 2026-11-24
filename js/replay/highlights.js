// Highlights reel

// ================= highlights reel =================
// Key moments are flagged by the battle sim (res.hl). The reel picks the best few, then plays each as a short
// directed clip: a title card, the camera on the action, a slow-motion beat at the key instant, and a closing podium.
const PRACTICE_BOARD = { p1: 34, p3: 27, p5: 22, you: 18, p2: 15, p6: 11, p4: 8, p7: 5 };
const HL_WIN = { split: [1.5, 4], betray: [2, 3.8], bomb: [2, 3], burst: [2.5, 1.5], fall: [4, 2], upset: [4, 2.2], revenge: [4, 2.2], giantslayer: [3, 1.6], firstblood: [3, 1.5], rapierdrop: [2.5, 2], frenzy: [2, 2.5], rapierget: [2, 2.5], winner: [4.5, 2.5] };
// what an ultimate achieved, for its caption: " · 1 hero and 6 soldiers fell"
const ultTally = h => { const im = h.impact; if (!im || !(im.heroes || im.units)) return ""; const parts = [im.heroes ? `${im.heroes} hero${im.heroes > 1 ? "es" : ""}` : "", im.units ? `${im.units} soldier${im.units > 1 ? "s" : ""}` : ""].filter(Boolean); return ` · ${parts.join(" and ")} fell`; };
function hlText(h, R) {
  const N = p => (R.names && R.names[p]) || "Someone", you = p => p === R.me, V = (p, a, b) => `${N(p)} ${you(p) ? a : b}`;
  const poss = p => (you(p) ? "Your" : N(p) + "'s"), rk = p => (R.ranks && R.ranks[p] ? `#${R.ranks[p]} ` : "");
  switch (h.kind) {
    case "split": return ["The last alliance breaks!", `${[h.pid, ...(h.others || [])].map(p => you(p) ? "You" : N(p)).join(", ")} turn on each other: only one banner can win the war`];
    case "betray": return ["Betrayal!", `${V(h.pid, "turn", "turns")} on ${you(h.other) ? "you" : N(h.other)} and ${you(h.pid) ? "blow" : "blows"} up ${you(h.other) ? "your" : "their"} keep`];
    case "bomb": return ["Rigged dowry!", `${poss(h.pid)} ${h.gold} gold of barrels explodes in ${you(h.other) ? "your" : N(h.other) + "'s"} castle`];
    case "spree": return [h.streak || "Quad Squad", `${V(h.pid, "cut", "cuts")} down ${h.n} foes in ${Math.max(1, Math.round(h.t2 - h.t0))}s`];
    case "burst": return ["Carnage", `${V(h.pid, "deal", "deals")} ${h.dmg} damage in 3 seconds`];
    case "upset": return ["Underdog upset!", `${you(h.other) ? "You" : rk(h.other) + N(h.other)} ${you(h.other) ? "topple" : "topples"} ${you(h.pid) ? `your castle (${rk(h.pid).trim()})` : rk(h.pid) + N(h.pid) + "'s castle"}`];
    case "revenge": return ["Revenge", `${V(h.other, "burn", "burns")} the traitor ${you(h.pid) ? "you" : N(h.pid)} to the ground`];
    case "fall": return [h.rank && h.rank <= 3 ? "A giant falls" : "A castle falls", `${you(h.pid) ? `Your castle (${rk(h.pid).trim()})` : rk(h.pid) + N(h.pid) + "'s castle"} falls${h.other ? ` to ${N(h.other)}` : ""}`];
    case "giantslayer": return ["Giant slayer", `${you(h.pid) ? "You slay" : rk(h.pid) + N(h.pid) + " slays"} ${you(h.other) ? "your" : rk(h.other) + N(h.other) + "'s"} hero`];
    case "firstblood": return ["First blood", `${V(h.pid, "draw", "draws")} first blood against ${you(h.other) ? "you" : N(h.other)}`];
    case "cart": return ["Powder cart!", `${poss(h.pid)} powder cart goes off${h.castle ? " at a castle" : ""}${h.n ? `, catching ${h.n} soldier${h.n > 1 ? "s" : ""} in the blast` : ""}`];
    case "rapierdrop": return ["Rapier dropped!", `${poss(h.pid)} hero falls and the Divine Rapier lies in the dust`];
    case "rapierget": return ["Rapier seized!", `${V(h.pid, "snatch", "snatches")} up the Divine Rapier`];
    case "frenzy": return ["Desperation Frenzy", `${poss(h.pid)} keep is nearly lost and its defenders fight like demons`];
    case "ult": if (h.gen) return [h.ab + "!", `${poss(h.pid)} ultimate: ${h.ab}${ultTally(h)}`]; return h.ab === "Meteor" ? ["Meteor!", `${poss(h.pid)} Meteor crashes into ${h.n} foes`] : ["Assassinated", `${poss(h.pid)} Rogue executes ${you(h.other) ? "your" : N(h.other) + "'s"} hero`];
    case "winner": if (h.last) return [`${V(h.pid, "win", "wins")} the Daily Siege`, `${h.last.other ? (you(h.last.other) ? "You bring" : N(h.last.other) + " brings") + " down " : ""}${you(h.last.pid) ? "your" : N(h.last.pid) + "'s"} castle${h.last.other ? "" : " falls"}: the last rival is gone`];
      return [`${V(h.pid, "win", "wins")} the Daily Siege`, h.timeout ? "Night falls with the strongest castle standing" : h.clutch ? `Clutch! The castle held on at ${Math.max(1, Math.round(h.hpFrac * 100))}%` : "Last castle standing"];
  }
  return ["", ""];
}
function hlWindow(h) {
  if (h.kind === "spree") return [Math.max(h.t0 - 1, h.t2 - 5), h.t2 + 2, h.t2];
  if (h.kind === "ult") { const a = h.ab === "Meteor" ? h.t - 2.6 : h.t - 1.2, im = h.impact || {}; return [a, Math.min(a + 8, Math.max(a + 4.5, h.t + 2.5, (im.lastT || 0) + 1.2)), h.t]; } // at least 4 seconds, long enough to see the kills land
  const w = HL_WIN[h.kind] || [3, 2]; return [h.t - w[0], h.t + w[1], h.t];
}
// What an ultimate did: the heroes and soldiers of other lords (not its allies) that fell near it in the five seconds after the cast.
const REEL_ULT_MAX = 3, REEL_ULT_MIN_UNITS = 4;
function ultImpact(h, R) {
  const E = R.events || [], pacts = R.pacts0 || [], allied = q => q === h.pid || pacts.includes([h.pid, q].sort().join("|")) || pacts.includes([q, h.pid].join("|")), im = { heroes: 0, units: 0, pts: [], lastT: 0, score: 0 };
  for (let i = lowerBound(E, h.t - .01); i < E.length && E[i].t <= h.t + 5; i++) { const e = E[i]; if (e.ty !== "die" || e.ex) continue;
    const m = R.meta[e.id]; if (!m || (m.kind !== "champ" && m.kind !== "unit") || allied(m.pid)) continue;
    if (Math.hypot(e.x - h.x, e.y - h.y) > 11) continue;
    if (m.kind === "champ") im.heroes++; else im.units++; im.pts.push([e.x, e.y]); im.lastT = e.t; }
  im.score = im.heroes * 45 + im.units * 7; return im;
}
// the area a clip should keep in frame: the hero of interest, the spot the ultimate lands and everything that fell to it
function clipBox(h, a, b, R, extra) {
  const pts = [[h.x, h.y], ...((h.impact && h.impact.pts) || []), ...(extra || [])], ci = R.meta.findIndex(m => m.pid === h.pid && m.kind === "champ");
  if (ci >= 0) for (let t = a; t <= b; t += .5) { try { const f = replayFrameAt(t), k = ci * 4; if (f && f.d[k] != null) pts.push([f.d[k], f.d[k + 1]]); } catch { /* no frame */ } }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 2.2;
  return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad };
}
function buildReel(R) {
  const hl = (R.hl || []).filter(h => h.kind !== "winner" && h.kind !== "ult" && !(h.kind === "fall" && !(h.rank && h.rank <= 3)));
  // Only ultimates that mattered (a hero killed, or a crowd of soldiers), the best three of the fight; one clip per cast
  const ults = (R.hl || []).filter(h => h.kind === "ult").map(h => ({ ...h, impact: ultImpact(h, R) })).filter(h => h.impact.heroes > 0 || h.impact.units >= REEL_ULT_MIN_UNITS)
    .sort((a, b) => b.impact.score - a.impact.score).filter((h, i, all) => !all.slice(0, i).some(o => o.pid === h.pid && Math.abs(o.t - h.t) < 5)).slice(0, REEL_ULT_MAX);
  const picked = ults.slice();
  hl.sort((a, b) => b.score - a.score).forEach(h => {
    if (picked.filter(p => p.kind !== "ult").length >= 6 || picked.filter(p => p.kind === h.kind).length >= 2) return; const [a, b] = hlWindow(h);
    if (picked.some(p => { const [c, d] = hlWindow(p); return a < d + .5 && c < b + .5; })) return; picked.push(h);
  });
  // The reel used to end on the winner's castle standing alone. It now ends on the moment the last rival castle is destroyed (nothing at all if the
  // battle ran to nightfall, since no castle fell last). The clip carries the winner's name; the camera is on the castle that fell.
  const win = (R.hl || []).find(h => h.kind === "winner");
  const falls = (R.hl || []).filter(h => h.kind === "fall" || h.kind === "upset" || h.kind === "revenge"), last = falls.reduce((a, b) => (!a || b.t > a.t ? b : a), null);
  const finale = win && last && !win.timeout ? { ...win, t: last.t, x: last.x, y: last.y, last } : null;
  picked.sort((a, b) => a.t - b.t);
  if (finale) { const [a] = hlWindow(finale); for (let i = picked.length - 1; i >= 0; i--) if (hlWindow(picked[i])[1] > a - .5) picked.splice(i, 1); picked.push(finale); }
  const champIdx = pid => R.meta.findIndex(m => m.pid === pid && m.kind === "champ");
  return picked.map(h => { const [a, b0, key] = hlWindow(h), b = Math.max(b0, a + 4), [title, sub] = hlText(h, R); // every clip runs at least 4 seconds
    const follow = ["spree", "burst", "betray", "firstblood", "giantslayer", "rapierdrop", "rapierget"].includes(h.kind) || (h.kind === "ult" && h.ab !== "Meteor") ? champIdx(h.kind === "giantslayer" || h.kind === "firstblood" ? h.other : h.pid) : -1;
    const box = h.kind === "ult" ? clipBox(h, Math.max(0, a), Math.min(R.duration, b), R) : null; // ultimates frame the hero and the whole impact zone
    return { h, a: Math.max(0, a), b: Math.min(R.duration, b), key, title, sub, follow, box, color: R.colors[h.kind === "fall" || h.kind === "upset" ? (h.other || h.pid) : h.kind === "revenge" ? h.other : h.pid] || "#ffe082" }; });
}
const REEL_CARD = 1.3, REEL_INTRO = 2.2, REEL_OUTRO = 4;
const REEL_ZOOM_OUT = 1.35 ** 3; // the reel's camera sits three zoom steps (the zoom buttons' x1.35) further out than it first did, so more of the action is in view
function startReel(record) {
  if (!replay) return; const clips = warReelClips(buildReel(replay.res));
  if (!clips.length) { if (WAR_REEL && warReelNext()) return; toast("Nothing big happened in this battle."); return; }
  replay.reel = { clips, i: -1, phase: "intro", pt: 0, rec: null }; replay.playing = false; replay.sel = null; sheet = null;
  render(); buildReelUI();
  if (record) startRecording();
}
function stopReel(toRecap) {
  if (!replay || !replay.reel) return; const rec = replay.reel.rec; replay.reel = null; replay.cine = null;
  if (rec && rec.mr.state !== "inactive") rec.mr.stop();
  buildReplayUI(); if (WAR_REEL && warReelNext()) return; if (reportBack) leaveBattle(); else if (toRecap) open("results"); else render();
}
// the camera position that keeps a box of tiles in view: [world x px, world y px, zoom]
function boxView(b) { const bw = (b.x1 - b.x0) * ts, bh = (b.y1 - b.y0) * ts, z = Math.max(minZoom(), Math.min(2.2, vw / bw, vh / bh)); return [(b.x0 + b.x1) / 2 * ts, (b.y0 + b.y1) / 2 * ts, z]; }
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
    const c = r.clips[r.i];
    if (c.h.kind === "betray" && !c.cineDone) { // the betrayal: play up to the moment, then pause and cut to the bomb (see tickBetrayCine)
      if (!replay.cine && replay.time >= c.h.t - .05) replay.cine = makeBetrayCine(c.h, replay.res);
      if (replay.cine) { if (tickBetrayCine(replay.cine, dt)) { replay.cine = null; c.cineDone = true; } return; }
    }
    replay.time = Math.min(c.b, replay.time + dt * (c.h.kind === "betray" ? 1 : reelSpeed(c, replay.time)));
    if (c.box) { const [bx, by, bz] = boxView(c.box); flyTo(bx, by, bz); if (replay.time >= c.b) nextClip(r); return; }
    const [x, y] = reelFocus(c, replay.time); flyTo(x * ts, (y - .3) * ts, (c.h.kind === "winner" || c.h.kind === "fall" || c.h.kind === "upset" || c.h.kind === "revenge" || c.h.kind === "bomb" ? 1.45 : 1.75) / REEL_ZOOM_OUT);
    if (replay.time >= c.b) nextClip(r);
  } else if (r.phase === "outro" && r.pt >= REEL_OUTRO) { const rec = r.rec; stopReel(!rec); }
}
function nextClip(r) {
  r.i++; r.pt = 0;
  if (r.i >= r.clips.length) { r.phase = "outro"; flyTo(W / 2, W / 2, 0); return; }
  const c = r.clips[r.i]; r.phase = "card"; replay.time = c.a;
  replay.cine = null; c.cineDone = false;
  const [x, y] = c.box ? boxView(c.box) : reelFocus(c, c.a), z = c.box ? boxView(c.box)[2] : Math.max(minZoom(), Math.min(2.4, 1.6 / REEL_ZOOM_OUT)); camTarget = null; Object.assign(cam, c.box ? { x: x - vw / 2 / z, y: y - vh / 2 / z, z } : { x: x * ts - vw / 2 / z, y: (y - .3) * ts - vh / 2 / z, z }); clampCam();
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
    center(`${r.clips.length} moment${r.clips.length === 1 ? "" : "s"} · ${fmt(R.duration)} of fighting`, H2 * .58, 16 * s, "#e8dcc0", 500);
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
    shade(Math.min(.82, r.pt / .4 * .82)); const top = R.results.slice().sort((a, b) => a.place - b.place).slice(0, 3), ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
    center("Final placings", H2 * .2, 28 * s, "#ffe9b0"); center("Places go by who holds out longest, so points can differ", H2 * .255, 13 * s, "#d9c79e", 500);
    const rh = 62 * s, x0 = 12, rw = W2 - 12 - 62; // leave room for the zoom buttons down the right edge
    top.forEach((res, i) => { const y = H2 * .31 + i * (rh + 8 * s), nm = (R.names && R.names[res.pid]) || res.name, me = res.pid === R.me, col = (R.colors && R.colors[res.pid]) || res.color || "#888";
      const a = Math.min(1, Math.max(0, (r.pt - .25 - i * .25) / .3)); ctx.globalAlpha = a;
      ctx.fillStyle = me ? "rgba(90,60,18,.85)" : "rgba(30,20,10,.82)"; ctx.fillRect(x0, y, rw, rh); ctx.fillStyle = col; ctx.fillRect(x0, y, 6, rh);
      ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = i === 0 ? "#ffe082" : "#e8dcc0"; ctx.font = `800 ${Math.round(22 * s)}px ${serif}`; ctx.fillText(ord(res.place), x0 + 16, y + rh / 2);
      ctx.fillStyle = col; ctx.fillRect(x0 + 70 * s, y + rh / 2 - 8 * s, 16 * s, 16 * s); ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 70 * s, y + rh / 2 - 8 * s, 16 * s, 16 * s);
      ctx.fillStyle = "#fff4d6"; ctx.font = `700 ${Math.round(17 * s)}px ${serif}`; ctx.fillText(nm + (me ? " (you)" : ""), x0 + 94 * s, y + rh / 2 - 9 * s, rw - 200 * s);
      ctx.fillStyle = "#c9b48a"; ctx.font = `500 ${Math.round(13 * s)}px ${serif}`; ctx.fillText(`${CLASSES[res.cls] ? CLASSES[res.cls].name : ""} · ${res.fellAt != null ? "castle fell at " + fmt(res.fellAt) : "still standing"}`, x0 + 94 * s, y + rh / 2 + 12 * s, rw - 200 * s);
      ctx.textAlign = "right"; ctx.fillStyle = "#ffe9b0"; ctx.font = `800 ${Math.round(22 * s)}px ${serif}`; ctx.fillText(String(res.points), x0 + rw - 12, y + rh / 2 - 8 * s);
      ctx.fillStyle = "#c9b48a"; ctx.font = `500 ${Math.round(12 * s)}px ${serif}`; ctx.fillText(`${res.kills} kills · ${res.castles} castles`, x0 + rw - 12, y + rh / 2 + 12 * s); ctx.globalAlpha = 1; });
  }
  ctx.textAlign = "start";
}
function lighten(hex) { const n = parseInt(hex.slice(1), 16), f = v => Math.min(255, Math.round(v + (255 - v) * .45)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

// ----- broadcast flourishes: a short synthesised sting, the betrayal cinematic and the victory ceremony -----
let _ac = null;
function sting(kind) {
  try { _ac = _ac || new (window.AudioContext || window.webkitAudioContext)(); const a = _ac, now = a.currentTime, g = a.createGain(); g.connect(a.destination);
    const note = (f, t0, dur, type, vol) => { const o = a.createOscillator(), e = a.createGain(); o.type = type; o.frequency.value = f; e.gain.setValueAtTime(0, now + t0); e.gain.linearRampToValueAtTime(vol, now + t0 + .02); e.gain.exponentialRampToValueAtTime(.001, now + t0 + dur); o.connect(e); e.connect(g); o.start(now + t0); o.stop(now + t0 + dur + .05); };
    g.gain.value = .5;
    if (kind === "fanfare") { // trumpets: a rising royal call in bright sawtooth, doubled an octave down
      [[392, 0], [523, .16], [659, .32], [784, .48], [659, .7], [784, .82], [1047, 1.0]].forEach(([f, t]) => { note(f, t, t >= 1 ? 1.1 : .22, "sawtooth", .16); note(f / 2, t, t >= 1 ? 1.1 : .22, "square", .08); }); return; }
    if (kind === "drumroll") { for (let i = 0; i < 26; i++) note(70 + Math.random() * 20, i * .055, .06, "square", .12 + i * .006); return; }
    if (kind === "crown") { note(1568, 0, .5, "triangle", .3); note(2093, .08, .7, "triangle", .25); return; }
    if (kind === "groan") { note(196, 0, .6, "sawtooth", .12); note(147, .3, .8, "sawtooth", .12); return; }
    if (kind === "betray") { note(110, 0, .9, "sawtooth", .5); note(116.5, 0, .9, "sawtooth", .4); note(55, .05, 1.2, "square", .35); }
    else { [523, 659, 784, 1047].forEach((f, i) => note(f, i * .14, .5, "triangle", .35)); note(1319, .6, .9, "triangle", .35); for (let i = 0; i < 10; i++) note(300 + Math.random() * 600, .2 + Math.random() * .8, .12, "square", .05); }
  } catch (e) {}
}
// The betrayal cut-away (main replay and highlights): the replay pauses, a banner names who betrayed whom, the camera cuts to the hero
// planting the bomb, then plays the fuse in slow motion on the castle until it blows. Afterwards the caller returns to its own camera.
const BETRAY_HOLD = 2, BETRAY_FUSE = 2.6, BETRAY_SLOW = .45;
function makeBetrayCine(h, R) { sting("betray"); return { h, R, pt: 0, t0: h.t, victims: (R.hl || []).filter(x => x.kind === "betray" && x.pid === h.pid && Math.abs(x.t - h.t) < .05).map(x => x.other), ci: R.meta.findIndex(m => m.pid === h.pid && m.kind === "champ") }; }
function tickBetrayCine(c, dt) { // returns true when the cut-away is over
  c.pt += dt; const h = c.h;
  if (c.pt < BETRAY_HOLD) { replay.time = h.t; let x = h.x, y = h.y; const f = replayFrameAt(h.t), k = c.ci * 4; if (c.ci >= 0 && f && f.d[k] != null && !(f.d[k + 3] & 1)) { x = f.d[k]; y = f.d[k + 1]; }
    flyTo(x * ts, (y - .3) * ts, 2.4); return false; } // the hero at the keep, bomb in hand
  replay.time = Math.min(h.t + BETRAY_FUSE, replay.time + dt * BETRAY_SLOW); flyTo(h.x * ts, (h.y - .3) * ts, 1.8); // the castle, through the fuse to the blast
  return replay.time >= h.t + BETRAY_FUSE - .01;
}
function drawBetrayBanner(c) {
  const R = c.R, N = p => (R.names && R.names[p]) || "A lord", col = p => (R.colors && R.colors[p]) || "#e0503f", s = Math.min(1, vw / 420), serif = "Alegreya, Georgia, serif";
  const a = Math.min(1, c.pt / .15, (BETRAY_HOLD + .8 - c.pt) / .4); if (a <= 0) return; const pop = c.pt < .3 ? 1 + .5 * (1 - c.pt / .3) ** 2 : 1, y = vh * .16, bh = 96 * s;
  ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = a; ctx.fillStyle = "rgba(60,6,6,.88)"; ctx.fillRect(0, y - bh / 2, vw, bh); ctx.fillStyle = "#e0503f"; ctx.fillRect(0, y - bh / 2, vw, 4); ctx.fillRect(0, y + bh / 2 - 4, vw, 4);
  ctx.translate(vw / 2, y); ctx.scale(pop, pop); ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.font = `800 ${Math.round(34 * s)}px ${serif}`; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(20,4,4,.9)"; ctx.strokeText("BETRAYAL!", 0, -22 * s); ctx.fillStyle = "#fff"; ctx.fillText("BETRAYAL!", 0, -22 * s);
  // [colour] Betrayer  betrayed  [colour] Victim (and [colour] Victim ...): the whole alliance at once lists every victim
  const fs = Math.round(19 * s); ctx.font = `700 ${fs}px ${serif}`; const vs = c.victims && c.victims.length ? c.victims : [c.h.other], sw = 16 * s, gap = 6 * s, mid = " betrayed ", and = " and ";
  const parts = [[N(c.h.pid), col(c.h.pid)], [mid], ...vs.flatMap((v, i) => (i ? [[and], [N(v), col(v)]] : [[N(v), col(v)]]))].map(([txt, cl]) => ({ txt, cl, w: ctx.measureText(txt).width + (cl ? sw + gap : 0) }));
  const total = parts.reduce((a, p) => a + p.w, 0), k = Math.min(1, (vw - 24) / total);
  ctx.scale(k, k); let x = -total / 2, yy = 24 * s; ctx.textAlign = "left";
  parts.forEach(p => { if (p.cl) { ctx.fillStyle = p.cl; ctx.fillRect(x, yy - sw / 2, sw, sw); ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.lineWidth = 1.5; ctx.strokeRect(x, yy - sw / 2, sw, sw); ctx.fillStyle = lighten(p.cl); ctx.fillText(p.txt, x + sw + gap, yy); } else { ctx.fillStyle = "#ffd9d0"; ctx.fillText(p.txt, x, yy); } x += p.w; });
  ctx.restore();
}
// The heroes on the victory screen: the winner (and every ally who won with them) dancing; the winner's allies whose castles fell float
// beside them as ghosts (a wispy tail for legs), still cheering the alliance on; and a winner who betrayed an ally this battle has that hero lying face down at their feet with a dagger in its back.
const DAGGER_SVG = `<svg class="vknife" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2 9.3 3v6.6H6.7V3z" fill="#e4e8ee" stroke="#3b4650" stroke-width=".7" stroke-linejoin="round"/><path d="M8 2v7.4" stroke="#9aa4ae" stroke-width=".5"/><rect x="4.6" y="9.6" width="6.8" height="1.5" rx=".6" fill="#c9a24a" stroke="#5a3a08" stroke-width=".6"/><rect x="7" y="11.1" width="2" height="3.4" rx=".5" fill="#6a3a1c" stroke="#2a160a" stroke-width=".6"/></svg>`;
const GHOST_TAIL = `<svg class="vtail" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 0 C6 14 14 16 18 24 C21 30 16 34 22 39 C24 32 30 30 28 22 C26 14 34 10 36 0 Z" fill="rgba(200,236,255,.55)"/><path d="M12 0 C14 10 20 14 22 22" stroke="rgba(255,255,255,.5)" stroke-width="1.5" fill="none"/></svg>`;
function victoryHeroesHTML(R, win) {
  const res = pid => R.results.find(r => r.pid === pid) || {}, img = (pid, cls) => `<img class="${cls}" alt="" src="${spriteURL("c-" + res(pid).cls, (R.colors && R.colors[pid]) || res(pid).color || MY_COLOR)}">`;
  const stand = R.team && R.team.length > 1 ? R.team.slice() : [win.pid], feud = new Set(R.feudsNew || []);
  const bets = (R.hl || []).filter(h => h.kind === "betray" && stand.includes(h.pid) && R.results.some(r => r.pid === h.other)), victims = [...new Set(bets.map(h => h.other))];
  const corpses = p => [...new Set(bets.filter(h => h.pid === p).map(h => h.other))].map(v => `<span class="vcorpse" title="Betrayed">${img(v, "vbody")}${DAGGER_SVG}</span>`).join("");
  const par = {}, f = x => (par[x] == null || par[x] === x ? (par[x] = x) : (par[x] = f(par[x]))); (R.pacts0 || []).filter(k => !feud.has(k)).forEach(k => { const [a, b] = k.split("|"); par[f(a)] = f(b); });
  const fallen = R.order.filter(p => !stand.includes(p) && !victims.includes(p) && stand.some(q => f(q) === f(p)) && res(p).cls);
  const many = stand.length + fallen.length > 1;
  return `<div class="vheroes${many ? " many" : ""}${victims.length ? " bodies" : ""}">${stand.map(p => `<span class="vh">${img(p, "vhero dance")}${corpses(p)}</span>`).join("")}${fallen.map(p => `<span class="vh ghost" title="Fallen ally, still with you">${img(p, "vhero vghost")}${GHOST_TAIL}</span>`).join("")}</div>`;
}
function victoryCeremony(R, done) {
  const win = (R.results || []).slice().sort((a, b) => a.place - b.place)[0]; if (!win) { done(); return; }
  const N = p => (R.names && R.names[p]) || (R.results.find(r => r.pid === p) || {}).name || "Someone", you = win.pid === R.me;
  const el = document.createElement("div"); el.className = "victory";
  const A = R.awards, aw = A ? [["🏆", "MVP", A.mvp.pid, `${A.mvp.pts} points`], ["⚔", "Most Kills", A.kills.pid, `${A.kills.n} kills`], ["☠", "Highest K/D", A.kd.pid, `${A.kd.v} per death`], ["🥉", "Bronze Spoils", A.spoils.pid, `${A.spoils.g}g looted`]] : [];
  el.innerHTML = `<canvas class="confetti"></canvas><div class="vbox"><div class="vt">${R.team ? "Victory, together!" : you ? "VICTORY!" : esc(N(win.pid)) + " wins!"}</div>${(() => { const tv = tauntOf(R, win.pid, "tv"); return tv ? `<div class="vbubble">${esc(tv)}</div>` : ""; })()}${victoryHeroesHTML(R, win)}<div class="vs">${R.team && R.team.length > 1 ? R.team.map(p => esc(N(p))).join(" · ") : `${esc(N(win.pid))} · ${esc(clsName(win.cls))}`}</div>
    <div class="vawards">${aw.map(([g, t, p, d]) => `<div><span>${g}</span><b>${t}</b><small>${esc(N(p))}<br>${d}</small></div>`).join("")}</div><button class="btn wax" id="vgo">Continue →</button></div>`;
  document.body.appendChild(el); sting("win");
  const cv = el.querySelector("canvas"), c = cv.getContext && cv.getContext("2d"); let alive = true;
  if (c) { cv.width = innerWidth; cv.height = innerHeight; const P = Array.from({ length: 140 }, () => ({ x: Math.random() * cv.width, y: -Math.random() * cv.height, v: 2 + Math.random() * 4, s: 4 + Math.random() * 6, a: Math.random() * 6, col: ["#e2b33c", "#d4402f", "#47b04b", "#5aa0d8", "#fff"][Math.floor(Math.random() * 5)] }));
    (function frame() { if (!alive) return; c.clearRect(0, 0, cv.width, cv.height); P.forEach(p => { p.y += p.v; p.x += Math.sin(p.a += .05) * 1.5; if (p.y > cv.height) { p.y = -10; p.x = Math.random() * cv.width; } c.fillStyle = p.col; c.fillRect(p.x, p.y, p.s, p.s * .6); }); requestAnimationFrame(frame); })(); }
  el.querySelector("#vgo").addEventListener("click", () => { alive = false; el.remove(); done(); });
}

// After the victory screen: today's points fly onto the weekly totals, then the board reorders itself
function standingsAnim(R, done) {
  if (!R || !R.board || R.rehearsal || !(R.results || []).length) { done(); return; }
  const N = p => (R.names && R.names[p]) || (R.results.find(r => r.pid === p) || {}).name || "Someone";
  const rows = R.order.map(pid => { const r = R.results.find(x => x.pid === pid) || {}, b = R.board[pid] || 0; return { pid, color: r.color || (R.colors || {})[pid] || "#888", before: b, gain: r.points || 0, after: b + (r.points || 0) }; });
  const was = rows.slice().sort((a, b) => b.before - a.before || (a.pid < b.pid ? -1 : 1)), now = rows.slice().sort((a, b) => b.after - a.after || (was.indexOf(a) - was.indexOf(b)));
  const H = 46, el = document.createElement("div"); el.className = "standfx";
  el.innerHTML = `<div class="sbox"><div class="st-t">The week's standings</div><div class="st-s">Today's points join each lord's total</div>
    <div class="st-list" style="height:${rows.length * H}px">${was.map((x, i) => `<div class="st-row${x.pid === R.me ? " me" : ""}" data-p="${esc(x.pid)}" style="top:${i * H}px"><span class="st-rk">${i + 1}</span><i style="background:${x.color}"></i><b class="st-n">${esc(x.pid === R.me ? "You" : N(x.pid))}</b><span class="st-g">${x.gain ? "+" + x.gain : "+0"}</span><span class="st-p">${x.before}</span><span class="st-m"></span></div>`).join("")}</div>
    <button class="btn wax" id="stgo">Continue →</button></div>`;
  document.body.appendChild(el);
  const rowEl = pid => el.querySelector(`.st-row[data-p="${CSS.escape(pid)}"]`), fast = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let alive = true; const timers = [];
  const finish = () => { if (!alive) return; alive = false; timers.forEach(clearTimeout); el.remove(); done(); };
  el.querySelector("#stgo").addEventListener("click", finish);
  const count = () => { const t0 = performance.now(), D = fast ? 1 : 1100; rows.forEach(x => rowEl(x.pid).classList.add("adding"));
    (function f(t) { if (!alive) return; const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); rows.forEach(x => { rowEl(x.pid).querySelector(".st-p").textContent = Math.round(x.before + x.gain * e); }); if (k < 1) requestAnimationFrame(f); else timers.push(setTimeout(reorder, fast ? 0 : 350)); })(t0); };
  const reorder = () => { if (!alive) return; now.forEach((x, i) => { const r = rowEl(x.pid), from = was.indexOf(x), mv = from - i; r.classList.remove("adding"); r.style.top = i * H + "px"; r.querySelector(".st-rk").textContent = i + 1;
    if (mv) { r.classList.add(mv > 0 ? "up" : "down"); r.querySelector(".st-m").textContent = (mv > 0 ? "▲" : "▼") + Math.abs(mv); } }); try { MUSIC.sfx("levelup", .4); } catch (e) {} };
  timers.push(setTimeout(count, fast ? 0 : 700));
}
