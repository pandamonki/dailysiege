// The daily share card: after a battle, one picture plus a few lines of text for the group chat.
// It shows the day's winner, the biggest upset, any betrayal, the top killer and how the week's standings moved.
// Everything comes from the saved battle (no battle is fought again). The picture goes through the phone's share sheet,
// with the text alongside; where sharing isn't available, the picture is saved and the text copied.

// the story of one battle, as plain facts: { day, winner, team, upset, betrayals, kills, mine, table }
function shareStory(id) {
  const d = reportData(id); if (!d || !d.results || !d.results.length) return null;
  const live = isLive() && id !== "practice", b = live ? LIVE.battles[id] : null, me = live ? LIVE.uid : "you";
  const name = pid => {
    if (pid === me) return MY_NAME && MY_NAME !== "You" ? MY_NAME : "Me";
    if (live) return (LIVE.names[pid] && LIVE.names[pid].name) || "A lord";
    return (d.names && d.names[pid]) || (RIVALS.find(r => r.id === pid) || {}).name || "A lord";
  };
  const colour = pid => live ? teamColour(pid) : pid === "you" ? MY_COLOR : ((RIVALS.find(x => x.id === pid) || {}).color || "#b8322a");
  const cls = pid => { const pl = d.plans && d.plans.find(p => p.pid === pid), r = d.results.find(x => x.pid === pid); return (pl && pl.cls) || (r && r.cls) || null; };
  const lord = pid => ({ pid, name: name(pid), color: colour(pid), cls: cls(pid), me: pid === me });
  const sorted = d.results.slice().sort((a, b) => a.place - b.place || b.points - a.points);
  const out = { day: d.day, winner: lord(sorted[0].pid), team: d.team ? teamOf(sorted[0].pid, b || d, sorted).map(lord) : null, mine: null, upset: null, betrayals: [], kills: null, table: [] };
  const mine = d.results.find(r => r.pid === me); if (mine) out.mine = { place: mine.place, of: d.results.length, points: mine.points };
  // biggest upset: a lord who came into the day well down the standings and finished in the top three
  const ranks = (b && b.inputs && b.inputs.ranks) || {};
  sorted.filter(r => r.place <= 3 && ranks[r.pid]).forEach(r => { const jump = ranks[r.pid] - r.place; if (jump >= 3 && (!out.upset || jump > out.upset.jump)) out.upset = Object.assign(lord(r.pid), { from: ranks[r.pid], place: r.place, jump }); });
  // betrayals: each lord whose bomb went off, and whom they betrayed (the feuds this battle started)
  const feuds0 = new Set((b && b.inputs && b.inputs.feuds) || []), feudsNew = ((b && b.feuds) || []).filter(k => !feuds0.has(k));
  sorted.filter(r => r.treachery).forEach(r => out.betrayals.push({ by: lord(r.pid), victims: feudsNew.map(k => k.split("|")).filter(p => p.includes(r.pid)).map(p => lord(p[0] === r.pid ? p[1] : p[0])) }));
  const A = d.awards; if (A && A.kills && A.kills.pid && A.kills.n) out.kills = Object.assign(lord(A.kills.pid), { n: A.kills.n });
  // the week's standings before and after this battle, with each lord's move
  if (live && d.week) {
    const keys = Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === d.week).sort(), before = {}, after = {};
    keys.forEach(k => (LIVE.battles[k].results || []).forEach(r => { if (k < id) before[r.pid] = (before[r.pid] || 0) + r.points; if (k <= id) after[r.pid] = (after[r.pid] || 0) + r.points; }));
    const ids = Object.keys(after), rank = pts => Object.fromEntries(ids.slice().sort((a, c) => (pts[c] || 0) - (pts[a] || 0) || (a < c ? -1 : 1)).map((p, i) => [p, i + 1]));
    const r0 = rank(before), r1 = rank(after), first = keys[0] === id;
    out.table = ids.sort((a, c) => r1[a] - r1[c]).map(p => Object.assign(lord(p), { rank: r1[p], pts: after[p] || 0, move: first ? 0 : r0[p] - r1[p] }));
    out.week = true;
  } else out.table = sorted.map(r => Object.assign(lord(r.pid), { rank: r.place, pts: r.points, move: 0 }));
  return out;
}
// the lords who won together: the winner and every lord allied to them in this battle
function teamOf(pid, b, sorted) {
  const pairs = (b && b.pairs) || [], mates = new Set([pid]);
  pairs.forEach(k => { const [x, y] = k.split("|"); if (x === pid) mates.add(y); if (y === pid) mates.add(x); });
  return sorted.filter(r => mates.has(r.pid)).map(r => r.pid);
}

const shareOrd = n => n + (n % 100 > 10 && n % 100 < 14 ? "th" : ["th", "st", "nd", "rd"][Math.min(n % 10, 4) % 4] || "th");
const shareList = a => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

// the lines that go with the picture
function shareText(s) {
  const L = [`⚔ Daily Siege, day ${s.day}`];
  L.push(s.team && s.team.length > 1 ? `🏆 ${shareList(s.team.map(l => l.name))} won the day together` : `🏆 ${s.winner.name} won the day${s.winner.cls && CLASSES[s.winner.cls] ? " (" + CLASSES[s.winner.cls].name + ")" : ""}`);
  if (s.upset) L.push(`😲 Upset: ${s.upset.name} came in ${shareOrd(s.upset.from)} and finished ${shareOrd(s.upset.place)}`);
  s.betrayals.forEach(t => L.push(`🗡 Betrayal: ${t.by.name} betrayed ${t.victims.length ? shareList(t.victims.map(v => v.name)) : "an ally"}`));
  if (s.kills) L.push(`💀 Most kills: ${s.kills.name}, ${s.kills.n}`);
  if (s.week && s.table.length) {
    const lead = s.table[0], climb = s.table.filter(l => l.move > 0).sort((a, b) => b.move - a.move)[0];
    L.push(`👑 Leading the war: ${lead.name}, ${lead.pts} pts`);
    if (climb && climb.move >= 2) L.push(`📈 Biggest climb: ${climb.name}, up ${climb.move} to ${shareOrd(climb.rank)}`);
  }
  if (s.mine) L.push(`Me: ${shareOrd(s.mine.place)} of ${s.mine.of}, ${s.mine.points} pts`);
  return L.join("\n");
}

// the picture: 1080 × 1350, parchment on leather, in the game's own fonts
async function shareCanvas(s) {
  try { await Promise.all([document.fonts.load('60px "IM Fell English SC"'), document.fonts.load('700 40px "Alegreya"'), document.fonts.load('40px "Alegreya"')]); } catch (e) {}
  const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
  const DISP = '"IM Fell English SC", "Palatino Linotype", Georgia, serif', BODY = '"Alegreya", Georgia, serif';
  const INK = "#3a2614", SOFT = "#6e5538", WAX = "#8e2a20", GOLD = "#c9962f", PARCH = "#ecdcb4";
  c.fillStyle = "#231810"; c.fillRect(0, 0, W, H);
  const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  rr(40, 40, W - 80, H - 80, 28); c.fillStyle = PARCH; c.fill(); c.lineWidth = 6; c.strokeStyle = GOLD; c.stroke();
  rr(58, 58, W - 116, H - 116, 20); c.lineWidth = 2; c.strokeStyle = "rgba(62,39,20,.35)"; c.stroke();
  const fit = (txt, font, size, max) => { let z = size; c.font = font.replace("@", z + "px"); while (c.measureText(txt).width > max && z > 18) { z -= 2; c.font = font.replace("@", z + "px"); } return z; };
  const text = (txt, x, y, font, size, col, align = "left", max = W - 200) => { fit(txt, font, size, max); c.fillStyle = col; c.textAlign = align; c.textBaseline = "alphabetic"; c.fillText(txt, x, y); };
  const swatch = (x, y, col, r = 14) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = "#3e2714"; c.stroke(); };
  // title
  text("Daily Siege", W / 2, 150, "@ " + DISP, 84, WAX, "center");
  text(`Day ${s.day} report`, W / 2, 205, "@ " + BODY, 40, SOFT, "center");
  // the winner (or the winning alliance), with the winner's hero
  let y = 250;
  const sp = s.winner.cls && typeof spr === "function" ? (() => { try { return spr("c-" + s.winner.cls, s.winner.color); } catch (e) { return null; } })() : null;
  rr(100, y, W - 200, 270, 18); c.fillStyle = "rgba(201,150,47,.22)"; c.fill(); c.lineWidth = 3; c.strokeStyle = GOLD; c.stroke();
  if (sp) { c.imageSmoothingEnabled = false; const k = Math.floor(210 / Math.max(sp.width, sp.height)); c.drawImage(sp, 130 + (210 - sp.width * k) / 2, y + 30 + (210 - sp.height * k) / 2, sp.width * k, sp.height * k); }
  const tx = sp ? 370 : 140, tw = W - 100 - tx - 30;
  text(s.team && s.team.length > 1 ? "🏆 Victory, together" : "🏆 Won the day", tx, y + 70, "@ " + BODY, 38, SOFT, "left", tw);
  text(s.team && s.team.length > 1 ? shareList(s.team.map(l => l.name)) : s.winner.name, tx, y + 150, "@ " + DISP, 72, INK, "left", tw);
  if (s.winner.cls && CLASSES[s.winner.cls]) { swatch(tx + 16, y + 205, s.winner.color); text(CLASSES[s.winner.cls].name, tx + 44, y + 218, "@ " + BODY, 36, SOFT, "left", tw - 44); }
  y += 330;
  // the day's stories
  const lines = [];
  if (s.upset) lines.push(["😲", "Upset", `${s.upset.name} came in ${shareOrd(s.upset.from)}, finished ${shareOrd(s.upset.place)}`]);
  s.betrayals.slice(0, 2).forEach(t => lines.push(["🗡", "Betrayal", `${t.by.name} betrayed ${t.victims.length ? shareList(t.victims.map(v => v.name)) : "an ally"}`]));
  if (s.kills) lines.push(["💀", "Most kills", `${s.kills.name}, ${s.kills.n}`]);
  lines.slice(0, 3).forEach(([ic, label, body]) => { text(ic, 110, y, "@ " + BODY, 40, INK); text(label, 170, y, "700 @ " + BODY, 36, WAX, "left", 220); text(body, 400, y, "@ " + BODY, 36, INK, "left", W - 510); y += 62; });
  if (lines.length) y += 14;
  // standings: the top six, and the sharer's row if they are lower down
  c.strokeStyle = "rgba(62,39,20,.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(110, y - 20); c.lineTo(W - 110, y - 20); c.stroke();
  text(s.week ? "The war so far" : "Today's placings", 110, y + 30, "@ " + DISP, 46, INK);
  y += 90;
  const rows = s.table.slice(0, 6), meRow = s.table.find(l => l.me); if (meRow && !rows.includes(meRow)) rows.push(meRow);
  const rowH = Math.min(70, Math.floor((H - 120 - y) / Math.max(1, rows.length)));
  rows.forEach(l => {
    if (l.me) { rr(96, y - rowH * .68, W - 192, rowH - 6, 10); c.fillStyle = "rgba(201,150,47,.28)"; c.fill(); }
    text(String(l.rank), 150, y, "700 @ " + BODY, 38, INK, "center");
    swatch(210, y - 12, l.color, 15);
    text(l.name, 245, y, (l.me ? "700 " : "") + "@ " + BODY, 38, INK, "left", 470);
    if (l.move) text(l.move > 0 ? `▲${l.move}` : `▼${-l.move}`, 790, y, "700 @ " + BODY, 32, l.move > 0 ? "#4f7a2e" : WAX, "center");
    text(`${l.pts} pts`, W - 120, y, "700 @ " + BODY, 38, INK, "right");
    y += rowH;
  });
  return cv;
}

async function shareDay(id) {
  const s = shareStory(id); if (!s) { toast("Nothing to share yet."); return; }
  const txt = shareText(s); let blob = null;
  try { const cv = await shareCanvas(s); blob = await new Promise(ok => cv.toBlob(ok, "image/png")); } catch (e) { blob = null; }
  const file = blob ? new File([blob], `daily-siege-day-${s.day}.png`, { type: "image/png" }) : null;
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: txt }); return; }
    if (navigator.share) { await navigator.share({ text: txt }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  // no share sheet: save the picture and copy the text
  if (file) { const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); }
  try { await navigator.clipboard.writeText(txt); toast(file ? "Picture saved and text copied. Paste it into your chat." : "Copied. Paste it into your chat."); } catch (e) { toast(file ? "Picture saved." : "Couldn't share here."); }
}
