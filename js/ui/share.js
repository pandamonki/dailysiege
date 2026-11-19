// Sharing to the group chat: a picture of the day's result (the results card), and videos of key moments (see record.js).

// the phone's share sheet when it can take files, else a plain download. Returns "shared", "cancelled" or "saved".
async function shareFile(blob, filename, text) {
  const f = new File([blob], filename, { type: blob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], ...(text ? { text } : {}) }); return "shared"; } }
  catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000); return "saved";
}
const shareDone = r => { if (r === "saved") toast("Saved. Send it from your downloads."); };

// The results card: a 1080 x 1350 picture (the shape chat apps show whole) of one battle. The winner and their hero up top with
// their victory taunt, then every lord in finishing order, with you highlighted and the Bronson (dead last) marked with a spoon.
// o = { day, rows: [{ pid, name, color, cls, place, points, kills, castles }], me, team, taunt }
function resultCardBlob(o) {
  const Wc = 1080, Hc = 1350, c = document.createElement("canvas"); c.width = Wc; c.height = Hc; const x = c.getContext("2d"), serif = "Alegreya, Georgia, serif";
  const rows = o.rows.slice().sort((a, b) => a.place - b.place || b.points - a.points), win = rows[0], ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
  const text = (t, tx, ty, size, col, weight = 700, align = "center", max = Wc - 80) => { x.font = `${weight} ${size}px ${serif}`; x.textAlign = align; x.textBaseline = "middle";
    x.lineWidth = Math.max(3, size / 9); x.strokeStyle = "rgba(14,8,4,.9)"; x.strokeText(t, tx, ty, max); x.fillStyle = col; x.fillText(t, tx, ty, max); };
  const g = x.createLinearGradient(0, 0, 0, Hc); g.addColorStop(0, "#3a2414"); g.addColorStop(1, "#160d07"); x.fillStyle = g; x.fillRect(0, 0, Wc, Hc);
  x.strokeStyle = "#c9962f"; x.lineWidth = 10; x.strokeRect(18, 18, Wc - 36, Hc - 36); x.strokeStyle = "rgba(201,150,47,.4)"; x.lineWidth = 3; x.strokeRect(34, 34, Wc - 68, Hc - 68);
  text("DAILY SIEGE", Wc / 2, 92, 46, "#c9962f", 800); text(o.day ? `Day ${o.day} results` : "Battle results", Wc / 2, 150, 40, "#fff4d6", 600);
  // the winner: hero sprite on a glow, name, points and taunt
  const top = 190, glow = x.createRadialGradient(Wc / 2, top + 150, 10, Wc / 2, top + 150, 220); glow.addColorStop(0, "rgba(255,224,130,.45)"); glow.addColorStop(1, "rgba(255,224,130,0)");
  x.fillStyle = glow; x.fillRect(0, top, Wc, 320);
  if (win && win.cls && typeof spr === "function") { try { const s = spr("c-" + win.cls, win.color), k = Math.floor(230 / Math.max(s.width, s.height)); x.imageSmoothingEnabled = false; x.drawImage(s, Wc / 2 - s.width * k / 2, top + 270 - s.height * k, s.width * k, s.height * k); } catch (e) { /* no sprite: the glow alone */ } }
  text("👑", Wc / 2, top + 40, 64, "#ffe082");
  const firsts = rows.filter(r => r.place === 1).map(r => r.name);
  text(win ? (o.team && firsts.length > 1 ? `${firsts.join(" & ")} win together!` : `${win.name} wins!`) : "", Wc / 2, top + 330, 66, "#ffe082", 800);
  if (o.taunt) text(`“${o.taunt}”`, Wc / 2, top + 400, 38, "#fff4d6", 500);
  // every lord, first to last
  const y0 = top + 450, avail = Hc - 120 - y0, rh = Math.min(84, avail / Math.max(1, rows.length)), fs = Math.round(rh * .44), last = rows.some(r => isLastPlace(r, rows)) ? Math.max(...rows.map(r => r.place)) : 0;
  rows.forEach((r, i) => { const y = y0 + i * rh, cy = y + rh / 2, me = r.pid === o.me, spoon = r.place === last;
    if (me) { x.fillStyle = "rgba(255,224,130,.16)"; x.fillRect(60, y + 4, Wc - 120, rh - 8); x.strokeStyle = "rgba(255,224,130,.6)"; x.lineWidth = 3; x.strokeRect(60, y + 4, Wc - 120, rh - 8); }
    if (spoon) { x.fillStyle = "rgba(180,70,50,.22)"; x.fillRect(60, y + 4, Wc - 120, rh - 8); }
    text(["🥇", "🥈", "🥉"][r.place - 1] || (spoon ? "🥄" : ord(r.place)), 120, cy, fs, "#e8dcc0", 700);
    x.fillStyle = r.color || "#888"; x.beginPath(); x.arc(196, cy, rh * .2, 0, 7); x.fill(); x.strokeStyle = "#1e140c"; x.lineWidth = 3; x.stroke();
    text(r.name + (me ? " (me)" : ""), 236, cy, fs, me ? "#ffe082" : "#fff4d6", 700, "left", 470);
    if (spoon) { x.font = `800 ${Math.round(fs * .62)}px ${serif}`; const tw = x.measureText("THE BRONSON").width; x.fillStyle = "#b8322a"; x.fillRect(Wc - 330 - tw - 24, cy - fs * .45, tw + 24, fs * .9); text("THE BRONSON", Wc - 330 - tw / 2 - 12, cy + 1, Math.round(fs * .62), "#fff4d6", 800); }
    text(`${r.points} pt${r.points === 1 ? "" : "s"}`, Wc - 90, cy, fs, "#ffe9b0", 700, "right", 220); });
  text(location.host ? `Think you can do better? ${location.host}` : "Think you can do better?", Wc / 2, Hc - 76, 30, "#c9b48a", 500);
  return new Promise(res => c.toBlob(res, "image/png"));
}
async function shareResultCard(o) {
  const blob = await resultCardBlob(o); if (!blob) { toast("Couldn't make the picture."); return; }
  const me = o.rows.find(r => r.pid === o.me), last = me && isLastPlace(me, o.rows);
  const line = me ? (me.place === 1 ? "Won the Daily Siege today 👑" : last ? "I'm the Bronson today 🥄" : `Came ${me.place}${me.place === 2 ? "nd" : me.place === 3 ? "rd" : "th"} in the Daily Siege`) : "Daily Siege results";
  shareDone(await shareFile(blob, `daily-siege-${o.day ? "day-" + o.day : "results"}.png`, line));
}
// the card's data from a battle being watched (the recap), or from a saved battle (the day report)
function replayCard(R) {
  const N = p => (R.names && R.names[p]) || (R.results.find(r => r.pid === p) || {}).name || "Someone", win = R.results.find(r => r.place === 1);
  return { day: replay && replay.day ? weekdayOf(replay.day) : DAY, me: R.me, team: !!R.team, taunt: win && !R.team ? tauntOf(R, win.pid, "tv") : "",
    rows: R.results.map(r => ({ pid: r.pid, name: N(r.pid), color: r.color, cls: r.cls, place: r.place, points: r.points })) };
}
function reportCard(d) {
  const me = isLive() ? LIVE.uid : "you", nm = pid => pid === me ? (isLive() ? MY_NAME : "You") : (isLive() ? nameOf(pid) : ((d.names && d.names[pid]) || (RIVALS.find(r => r.id === pid) || {}).name || "Someone"));
  const col = pid => isLive() ? teamColour(pid) : pid === "you" ? MY_COLOR : ((RIVALS.find(x => x.id === pid) || {}).color || "#b8322a"), win = d.results.find(r => r.place === 1);
  const pl = win && d.plans && d.plans.find(p => p.pid === win.pid), taunt = win && !d.team ? tauntOf({ meta: [{ kind: "castle", pid: win.pid, banner: pl && pl.banner }] }, win.pid, "tv") : "";
  return { day: d.day, me, team: !!d.team, taunt, rows: d.results.map(r => ({ pid: r.pid, name: nm(r.pid), color: col(r.pid), cls: r.cls, place: r.place, points: r.points })) };
}
