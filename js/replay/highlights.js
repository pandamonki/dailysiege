// Highlights reel

// ================= highlights reel =================
// Key moments are flagged by the battle sim (res.hl). The reel picks the best few, then plays each as a short
// directed clip: a title card, the camera on the action, a slow-motion beat at the key instant, and a closing podium.
const PRACTICE_BOARD = { p1: 34, p3: 27, p5: 22, you: 18, p2: 15, p6: 11, p4: 8, p7: 5 };
const HL_WIN = { betray: [1.5, 3.5], bomb: [2, 3], burst: [2.5, 1.5], fall: [4, 2], upset: [4, 2.2], revenge: [4, 2.2], giantslayer: [3, 1.6], firstblood: [3, 1.5], rapierdrop: [2.5, 2], frenzy: [2, 2.5], rapierget: [2, 2.5], winner: [4.5, 2.5] };
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
    case "winner": return [`${V(h.pid, "win", "wins")} the Daily Siege`, h.timeout ? "Night falls with the strongest castle standing" : h.clutch ? `Clutch! The castle held on at ${Math.max(1, Math.round(h.hpFrac * 100))}%` : "Last castle standing"];
  }
  return ["", ""];
}
function hlWindow(h) {
  if (h.kind === "spree") return [Math.max(h.t0 - 1, h.t2 - 5), h.t2 + 2, h.t2];
  if (h.kind === "ult") return h.ab === "Meteor" ? [h.t - 2.6, h.t + 1.6, h.t] : [h.t - 1.5, h.t + 2, h.t];
  const w = HL_WIN[h.kind] || [3, 2]; return [h.t - w[0], h.t + w[1], h.t];
}
function buildReel(R) {
  const hl = (R.hl || []).filter(h => h.kind !== "winner" && !(h.kind === "fall" && !(h.rank && h.rank <= 3)));
  const picked = hl.filter(h => h.kind === "ult"); // every ultimate cast gets its clip
  hl.filter(h => h.kind !== "ult").sort((a, b) => b.score - a.score).forEach(h => {
    if (picked.filter(p => p.kind !== "ult").length >= 6 || picked.filter(p => p.kind === h.kind).length >= 2) return; const [a, b] = hlWindow(h);
    if (picked.some(p => { const [c, d] = hlWindow(p); return a < d + .5 && c < b + .5; })) return; picked.push(h);
  });
  const win = (R.hl || []).find(h => h.kind === "winner");
  picked.sort((a, b) => a.t - b.t);
  if (win) { const [a] = hlWindow(win); for (let i = picked.length - 1; i >= 0; i--) if (hlWindow(picked[i])[1] > a - .5) picked.splice(i, 1); picked.push(win); }
  const champIdx = pid => R.meta.findIndex(m => m.pid === pid && m.kind === "champ");
  return picked.map(h => { const [a, b, key] = hlWindow(h), [title, sub] = hlText(h, R);
    const follow = ["spree", "burst", "betray", "firstblood", "giantslayer", "rapierdrop", "rapierget"].includes(h.kind) || (h.kind === "ult" && h.ab !== "Meteor") ? champIdx(h.kind === "giantslayer" || h.kind === "firstblood" ? h.other : h.pid) : -1;
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
  el.innerHTML = `<canvas class="confetti"></canvas><div class="vbox"><div class="vt">${R.team ? "Victory, together!" : you ? "VICTORY!" : esc(N(win.pid)) + " wins!"}</div><img class="vhero" alt="" src="${spriteURL("c-" + win.cls)}"><div class="vs">${esc(N(win.pid))} · ${esc(clsName(win.cls))}</div>
    <div class="vawards">${aw.map(([g, t, p, d]) => `<div><span>${g}</span><b>${t}</b><small>${esc(N(p))}<br>${d}</small></div>`).join("")}</div><button class="btn wax" id="vgo">Continue →</button></div>`;
  document.body.appendChild(el); sting("win");
  const cv = el.querySelector("canvas"), c = cv.getContext && cv.getContext("2d"); let alive = true;
  if (c) { cv.width = innerWidth; cv.height = innerHeight; const P = Array.from({ length: 140 }, () => ({ x: Math.random() * cv.width, y: -Math.random() * cv.height, v: 2 + Math.random() * 4, s: 4 + Math.random() * 6, a: Math.random() * 6, col: ["#e2b33c", "#d4402f", "#47b04b", "#5aa0d8", "#fff"][Math.floor(Math.random() * 5)] }));
    (function frame() { if (!alive) return; c.clearRect(0, 0, cv.width, cv.height); P.forEach(p => { p.y += p.v; p.x += Math.sin(p.a += .05) * 1.5; if (p.y > cv.height) { p.y = -10; p.x = Math.random() * cv.width; } c.fillStyle = p.col; c.fillRect(p.x, p.y, p.s, p.s * .6); }); requestAnimationFrame(frame); })(); }
  el.querySelector("#vgo").addEventListener("click", () => { alive = false; el.remove(); done(); });
}

// ----- interactive first-login tour: a steward walks new lords through the planning screen -----
const WIZARD = [
  [null, "Welcome, m'lord", "I am Aldric, your steward. Your friends have holed up in their castles and declared war. Each evening every army marches out and fights at once. You don't steer the battle, you prepare for it, and the last castle standing wins the day."],
  [null, "The seven-day war", "Each day has two phases: planning, then battle. The timer shows how long until orders lock. After every battle you replan, spend gold, level your hero and forge (or break) alliances. Day 7 is the final showdown."],
  ['.topchips', "The top row", "Day, gold, unit count, ultimate, leaderboard, battle report and options. You can retake this tour from Options, and it opens at the screen you were on."],
  ["#map", "The map", "Drag to pan. Pinch or use + and − to zoom. The ⛶ button fits the whole field and the home button returns to your castle. Your army is the one under your colour."],
  ['#cmdbar [data-act="opencastle"][data-v="keep"]', "Base", "Raise your castle to a Fortress or Citadel, build walls and traps, forge hero gear and shop for items. A stronger castle unlocks better soldiers and more gold each day."],
  ['#cmdbar [data-act="opencastle"][data-v="recruit"]', "Army", "Recruit soldiers, then use the Roster tab to see every soldier you own. Deploy reserves to the map, recall units to reserve, train them up to Lv3 or sell the ones you no longer want."],
  ['.topchips [data-act="opencastle"][data-v="recruit"]', "Your units", "The shield shows soldiers owned out of your supply. New recruits wait in a strip above Seal Orders: tap one, then tap a glowing tile near your castle. Tap a soldier on the map to select and move it."],
  ['#cmdbar [data-act="openhero"]', "Hero", "Your champion for the week. Every level grants a skill point to spend here. Your ultimate is a once-per-battle game changer."],
  ['#cmdbar [data-act="openorders"][data-v="ord"]', "Orders", "Choose who to attack and how your soldiers fight. Plan your ultimate and weekly blessing under Rituals."],
  ['#cmdbar [data-act="openorders"][data-v="alli"]', "Allies", "Alliances are an active choice. Nobody is allied by default: you invite, they answer, and the alliance starts at the next battle. The next three steps walk through it."],
  [null, "1 · Send an invitation", "Open Allies, pick a lord and tap Invite. You can add a gold dowry (optional), which is set aside and paid only if they accept. At most 2 invitations can be open at once. You can change or withdraw a draft until planning ends.",
    `<div class="mk-row"><b>Sam</b><span class="mk-step">− 150g +</span><span class="mk-btn">Withdraw</span></div><div class="mk-row"><b>Riley</b><span class="mk-chip">Pending · 0g</span></div><p class="mk-cap">Your invitations <b>2/2 open</b></p>`],
  [null, "2 · Answer an invitation", "After you watch the battle and return to planning, a pop-up shows each invitation sent to you. Accept or Decline, or choose Decide later and answer in the Allies tab. The sender sees Pending until you answer. If you accept, the alliance is announced to everyone at the start of the next battle.",
    `<div class="mk-card"><div class="mk-row"><span><b>Sam</b> invites you to ally</span><span class="mk-chip">150g dowry</span></div><div class="mk-row"><span class="mk-btn wax">Accept</span><span class="mk-btn">Decline</span></div><p class="mk-cap">You can betray an ally at any point in the game.</p></div>`],
  [null, "3 · Allies, betrayal and winning", "Allies share a banner on the muster screen and win the day together if only allies remain. At least two opposing sides must always stay in the fight. In Allies you can Keep, Break (clean) or Betray an ally at any time: pick the moment, and your hero plants a bomb that blows up their keep for half its health, and they will remember.",
    `<div class="mk-row"><b>Sam</b><span class="mk-sel">Allied ▾</span></div><div class="mk-row"><span class="mk-sel">Betray ▾</span><span class="mk-chip bad">Their keep loses half its health</span></div>`],
  [null, "Mercenary camp (day 4+)", "From day 4 each week a Camp bubble appears at the top of the map. Six mercenary groups are for hire. Bids are sealed and the highest bidder fights with that group for one battle, paying their own bid. Place your bid before sealing. A hired group recharges for 2 days for everyone.",
    `<div class="mk-row"><b>Troll Warlord</b><span class="mk-chip">from 200g</span></div><div class="mk-row"><span class="mk-step">− 240g +</span><span class="mk-btn">Clear</span></div><p class="mk-cap">Your sealed bid is set aside while you plan. Only the winner pays.</p>`],
  [".sealbar", "Seal your orders", "When you're happy, seal your orders. You can break the seal and change your plans until the timer locks. Good luck!"],
];
function startWizard(force, at) {
  try { if (!force && localStorage.getItem("ds.wizard")) return; localStorage.setItem("ds.wizard", "1"); } catch (e) {}
  let i = at || 0; const old = document.getElementById("wiz"); if (old) old.remove(); document.getElementById("wizring")?.remove();
  const el = document.createElement("div"); el.id = "wiz"; document.body.appendChild(el);
  const ring = document.createElement("div"); ring.id = "wizring"; document.body.appendChild(ring);
  const N = WIZARD.length;
  // the highlight is a floating ring that follows the target, so it survives the game redrawing its buttons
  const place = () => { const sel = WIZARD[i][0], tg = sel && document.querySelector(sel), r = tg && tg.getBoundingClientRect();
    if (!r || !r.width) { ring.style.display = "none"; return; }
    Object.assign(ring.style, { display: "block", left: r.left - 4 + "px", top: r.top - 4 + "px", width: r.width + 8 + "px", height: r.height + 8 + "px" }); };
  const timer = setInterval(() => { if (!document.getElementById("wiz")) { clearInterval(timer); ring.remove(); } else place(); }, 250);
  const paint = () => { const [sel, head, msg, mock] = WIZARD[i];
    const dots = WIZARD.map((_, k) => `<i class="${k === i ? "on" : k < i ? "done" : ""}"></i>`).join("");
    el.innerHTML = `<div class="wiz-card"><div class="wiz-face"><img alt="" src="${spriteURL("c-mage")}"></div><div class="wiz-msg"><h3>${esc(head)}</h3><p>${esc(msg)}</p>${mock ? `<div class="wmock">${mock}</div>` : ""}<div class="wiz-dots">${dots}</div><div class="wiz-row"><small>${i + 1}/${N}</small><button class="btn small" id="wskip">${i < N - 1 ? "Skip" : "Close"}</button><button class="btn small" id="wback"${i ? "" : " disabled"}>← Back</button><button class="btn wax small" id="wnext">${i < N - 1 ? "Next →" : "Done"}</button></div></div></div>`;
    place(); const tg0 = sel && document.querySelector(sel), r0 = tg0 && tg0.getBoundingClientRect(), card = el.firstChild;
    el.style.top = r0 && sel !== "#map" && r0.top < innerHeight * .3 ? Math.round(r0.bottom + 14) + "px" : "70px";
    el.querySelector("#wskip").onclick = end; el.querySelector("#wback").onclick = () => { if (i > 0) { i--; paint(); } };
    el.querySelector("#wnext").onclick = () => { if (i < N - 1) { i++; paint(); } else end(); }; };
  function end() { clearInterval(timer); ring.remove(); el.remove(); }
  paint();
}
