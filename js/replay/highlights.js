// Highlights reel

// ================= highlights reel =================
// Key moments are flagged by the battle sim (res.hl). The reel picks the best few, then plays each as a short
// directed clip: a title card, the camera on the action, a slow-motion beat at the key instant, and a closing podium.
const PRACTICE_BOARD = { p1: 34, p3: 27, p5: 22, you: 18, p2: 15, p6: 11, p4: 8, p7: 5 };
const HL_WIN = { betray: [1.5, 3.5], bomb: [2, 3], burst: [2.5, 1.5], fall: [4, 2], upset: [4, 2.2], revenge: [4, 2.2], giantslayer: [3, 2.6], firstblood: [3, 2.5], rapierdrop: [2.5, 2], frenzy: [2, 2.5], rapierget: [2, 2.5], winner: [4.5, 2.5] };
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
    case "cart": return ["Powder cart!", `${poss(h.pid)} powder cart goes off${h.castle ? " at a castle" : ""}${h.n ? `, catching ${h.n} soldier${h.n > 1 ? "s" : ""} in the blast` : ""}`];
    case "rapierdrop": return ["Rapier dropped!", `${poss(h.pid)} hero falls and the Divine Rapier lies in the dust`];
    case "rapierget": return ["Rapier seized!", `${V(h.pid, "snatch", "snatches")} up the Divine Rapier`];
    case "frenzy": return ["Desperation Frenzy", `${poss(h.pid)} keep is nearly lost and its defenders fight like demons`];
    case "ult": if (h.gen) return [h.ab + "!", `${poss(h.pid)} ultimate: ${h.ab}`]; return h.ab === "Meteor" ? ["Meteor!", `${poss(h.pid)} Meteor crashes into ${h.n} foes`] : ["Assassinated", `${poss(h.pid)} Rogue executes ${you(h.other) ? "your" : N(h.other) + "'s"} hero`];
    case "winner": if (h.last) return [`${V(h.pid, "win", "wins")} the Daily Siege`, `${h.last.other ? (you(h.last.other) ? "You bring" : N(h.last.other) + " brings") + " down " : ""}${you(h.last.pid) ? "your" : N(h.last.pid) + "'s"} castle${h.last.other ? "" : " falls"}: the last rival is gone`];
      return [`${V(h.pid, "win", "wins")} the Daily Siege`, h.timeout ? "Night falls with the strongest castle standing" : h.clutch ? `Clutch! The castle held on at ${Math.max(1, Math.round(h.hpFrac * 100))}%` : "Last castle standing"];
  }
  return ["", ""];
}
// An ultimate's clip runs from just before the cast until its effects have played out (a meteor's fall and impact, a volley, a
// spirit), plus a beat to take it in: at least HL_ULT_TAIL seconds after the cast, at most HL_ULT_MAX. The effects are the ultimate's
// own drawn events (ultfx, zones, warnings) that start near the caster within HL_ULT_SPAN seconds of the cast.
const HL_ULT_LEAD = 2, HL_ULT_TAIL = 4.5, HL_ULT_MAX = 9, HL_ULT_SPAN = 3, HL_ULT_NEAR = 7, HL_ULT_HOLD = 1.5;
function ultEnd(h, R) {
  let end = h.t + HL_ULT_TAIL; ((R && R.events) || []).forEach(e => { if (e.t < h.t - .1 || e.t > h.t + HL_ULT_SPAN || !(e.ty === "ultfx" || e.ty === "zone" || e.ty === "warn")) return;
    if (Number.isFinite(e.x) && Math.hypot(e.x - h.x, e.y - h.y) > HL_ULT_NEAR) return; end = Math.max(end, e.t + (e.dur || 1) + HL_ULT_HOLD); });
  return Math.min(h.t + HL_ULT_MAX, end);
}
function hlWindow(h, R) {
  if (h.kind === "spree") return [Math.max(h.t0 - 1, h.t2 - 5), h.t2 + 2.5, h.t2];
  if (h.kind === "ult") return [h.t - (h.ab === "Meteor" ? 2.6 : HL_ULT_LEAD), ultEnd(h, R), h.t];
  const w = HL_WIN[h.kind] || [3, 2]; return [h.t - w[0], h.t + w[1], h.t];
}
function buildReel(R) {
  const hl = (R.hl || []).filter(h => h.kind !== "winner" && !(h.kind === "fall" && !(h.rank && h.rank <= 3)));
  const picked = hl.filter(h => h.kind === "ult"); // every ultimate cast gets its clip
  hl.filter(h => h.kind !== "ult").sort((a, b) => b.score - a.score).forEach(h => {
    if (picked.filter(p => p.kind !== "ult").length >= 6 || picked.filter(p => p.kind === h.kind).length >= 2) return; const [a, b] = hlWindow(h, R);
    if (picked.some(p => { const [c, d] = hlWindow(p, R); return a < d + .5 && c < b + .5; })) return; picked.push(h);
  });
  // The reel used to end on the winner's castle standing alone. It now ends on the moment the last rival castle is destroyed (nothing at all if the
  // battle ran to nightfall, since no castle fell last). The clip carries the winner's name; the camera is on the castle that fell.
  const win = (R.hl || []).find(h => h.kind === "winner");
  const falls = (R.hl || []).filter(h => h.kind === "fall" || h.kind === "upset" || h.kind === "revenge"), last = falls.reduce((a, b) => (!a || b.t > a.t ? b : a), null);
  const finale = win && last && !win.timeout ? { ...win, t: last.t, x: last.x, y: last.y, last } : null;
  picked.sort((a, b) => a.t - b.t);
  if (finale) { const [a] = hlWindow(finale, R); for (let i = picked.length - 1; i >= 0; i--) if (hlWindow(picked[i], R)[1] > a - .5) picked.splice(i, 1); picked.push(finale); }
  const champIdx = pid => R.meta.findIndex(m => m.pid === pid && m.kind === "champ");
  return picked.map(h => { const [a, b, key] = hlWindow(h, R), [title, sub] = hlText(h, R);
    const follow = ["spree", "burst", "betray", "firstblood", "giantslayer", "rapierdrop", "rapierget"].includes(h.kind) || (h.kind === "ult" && h.ab !== "Meteor") ? champIdx(h.kind === "giantslayer" || h.kind === "firstblood" ? h.other : h.pid) : -1;
    return { h, a: Math.max(0, a), b: Math.min(R.duration, b), key, title, sub, follow, color: R.colors[h.kind === "fall" || h.kind === "upset" ? (h.other || h.pid) : h.kind === "revenge" ? h.other : h.pid] || "#ffe082" }; });
}
const REEL_CARD = 1.3, REEL_INTRO = 2.2, REEL_OUTRO = 4;
// The reel's camera frames the action exactly as the replay's auto camera does by default: 1.7 on a hero, 1.35 on a castle,
// then the replay's starting zoom-out (two steps of the zoom buttons' x1.35, AUTO_ZOOM_START).
const REEL_Z_HERO = 1.7 * AUTO_ZOOM_START, REEL_Z_CASTLE = 1.35 * AUTO_ZOOM_START;
// startReel(record, only): `only` is the index of one key moment (as the recap lists them) to play on its own; with record, a clip to share
function startReel(record, only) {
  if (!replay) return; const all = buildReel(replay.res), clips = only != null ? (all[only] ? [all[only]] : []) : warReelClips(all);
  if (!clips.length) { toast("Nothing big happened in this battle."); return; }
  replay.reel = { clips, i: -1, phase: "intro", pt: 0, rec: null, single: only != null }; replay.playing = false; replay.sel = null; sheet = null;
  render(); buildReelUI(); if (only != null) nextClip(replay.reel);
  if (record) startRecording(only != null ? clips[0] : null);
}
function stopReel(toRecap) {
  if (!replay || !replay.reel) return; const rec = replay.reel.rec; replay.reel = null;
  if (rec && rec.mr.state !== "inactive") rec.mr.stop();
  buildReplayUI(); if (WAR_REEL && warReelNext()) return; if (reportBack) leaveBattle(); else if (toRecap) open("results"); else render();
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
    const [x, y] = reelFocus(c, replay.time); flyTo(x * ts, (y - .3) * ts, reelZoom(c));
    if (replay.time >= c.b) nextClip(r);
  } else if (r.phase === "outro" && r.pt >= (r.single ? .6 : REEL_OUTRO)) { const rec = r.rec; stopReel(!rec); }
}
const reelZoom = c => (["winner", "fall", "upset", "revenge", "bomb"].includes(c.h.kind) ? REEL_Z_CASTLE : REEL_Z_HERO);
function nextClip(r) {
  r.i++; r.pt = 0;
  if (r.i >= r.clips.length) { r.phase = "outro"; if (!r.single) flyTo(W / 2, W / 2, 0); return; }
  const c = r.clips[r.i]; r.phase = "card"; replay.time = c.a;
  const [x, y] = reelFocus(c, c.a), z = Math.max(minZoom(), Math.min(2.4, reelZoom(c))); camTarget = null; Object.assign(cam, { x: x * ts - vw / 2 / z, y: (y - .3) * ts - vh / 2 / z, z }); clampCam();
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
  } else if (r.phase === "outro" && r.single) { center("Daily Siege", 24 * s, 18 * s, "#c9962f");
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

// ----- broadcast flourishes: a short synthesised sting, the betrayal cinematic and the victory ceremony -----
let _ac = null;
function sting(kind) {
  try { _ac = _ac || new (window.AudioContext || window.webkitAudioContext)(); const a = _ac, now = a.currentTime, g = a.createGain(); g.connect(a.destination);
    const note = (f, t0, dur, type, vol) => { const o = a.createOscillator(), e = a.createGain(); o.type = type; o.frequency.value = f; e.gain.setValueAtTime(0, now + t0); e.gain.linearRampToValueAtTime(vol, now + t0 + .02); e.gain.exponentialRampToValueAtTime(.001, now + t0 + dur); o.connect(e); e.connect(g); o.start(now + t0); o.stop(now + t0 + dur + .05); };
    g.gain.value = .5;
    if (kind === "betray") { note(110, 0, .9, "sawtooth", .5); note(116.5, 0, .9, "sawtooth", .4); note(55, .05, 1.2, "square", .35); }
    else { [523, 659, 784, 1047].forEach((f, i) => note(f, i * .14, .5, "triangle", .35)); note(1319, .6, .9, "triangle", .35); for (let i = 0; i < 10; i++) note(300 + Math.random() * 600, .2 + Math.random() * .8, .12, "square", .05); }
  } catch (e) {}
}
function betrayCinematic(h, R, resume) {
  const nm = p => (R.names && R.names[p]) || "A traitor";
  const el = document.createElement("div"); el.className = "betrayfx";
  el.innerHTML = `<div class="bf-banner">BETRAYAL!</div><div class="bf-sub">${esc(nm(h.pid))} turns on ${esc(nm(h.other))}</div><svg class="bf-knives" viewBox="0 0 200 200" aria-hidden="true"><g class="k1"><path d="M20 180 L150 50 L160 60 L40 190 Z" fill="#dfe6ec" stroke="#222" stroke-width="3"/><rect x="146" y="30" width="30" height="12" transform="rotate(45 160 40)" fill="#6b3a1a"/></g><g class="k2"><path d="M180 180 L50 50 L40 60 L160 190 Z" fill="#dfe6ec" stroke="#222" stroke-width="3"/><rect x="24" y="30" width="30" height="12" transform="rotate(-45 40 40)" fill="#6b3a1a"/></g></svg>`;
  document.body.appendChild(el); sting("betray");
  setTimeout(() => { el.remove(); resume(); }, 2600);
}
function victoryCeremony(R, done) {
  const win = (R.results || []).slice().sort((a, b) => a.place - b.place)[0]; if (!win) { done(); return; }
  const N = p => (R.names && R.names[p]) || (R.results.find(r => r.pid === p) || {}).name || "Someone", you = win.pid === R.me;
  const el = document.createElement("div"); el.className = "victory";
  const A = R.awards, aw = A ? [["🏆", "MVP", A.mvp.pid, `${A.mvp.pts} points`], ["⚔", "Most Kills", A.kills.pid, `${A.kills.n} kills`], ["☠", "Highest K/D", A.kd.pid, `${A.kd.v} per death`], ["🥉", "Bronze Spoils", A.spoils.pid, `${A.spoils.g}g looted`]] : [];
  el.innerHTML = `<canvas class="confetti"></canvas><div class="vbox"><div class="vt">${R.team ? "Victory, together!" : you ? "VICTORY!" : esc(N(win.pid)) + " wins!"}</div>${(() => { const tv = tauntOf(R, win.pid, "tv"); return tv ? `<div class="vbubble">${esc(tv)}</div>` : ""; })()}<img class="vhero dance" alt="" src="${spriteURL("c-" + win.cls, (R.colors && R.colors[win.pid]) || win.color || MY_COLOR)}"><div class="vs">${esc(N(win.pid))} · ${esc(clsName(win.cls))}</div>
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
