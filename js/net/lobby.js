// Connecting, creating and joining games, the lobby and game sheet

async function connectLive() {
  if (!window.claude || typeof window.claude.use !== "function") return;
  const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
  LIVE.db = db; LIVE.user = user;
  if (!db || !user) { render(); return; }
  LIVE.uid = await user.id(); LIVE.isOwner = await user.isOwner();
  if (!LIVE.uid) { render(); return; }
  db.doc("game/config").onSnapshot(s => { if (PREVIEW) { PREVIEW.keep.config = s.exists ? s.data() : null; PREVIEW.keep.configLoaded = true; return; } LIVE.config = s.exists ? s.data() : null; LIVE.configLoaded = true; liveChanged(); }, () => { LIVE.configLoaded = true; render(); });
  db.collection("players").onSnapshot(q => { const pl = {}; q.docs.forEach(d => { pl[d.id] = d.data(); }); if (PREVIEW) { PREVIEW.keep.players = pl; PREVIEW.keep.playersLoaded = true; return; } LIVE.players = pl; LIVE.playersLoaded = true; refreshNames(); liveChanged(); }, () => render());
  db.collection("battles").onSnapshot(q => { const bt = {}; q.docs.forEach(d => { bt[d.id] = d.data(); }); if (PREVIEW) { PREVIEW.keep.battles = bt; return; } LIVE.battles = withLocalBattles(bt); liveChanged(); }, () => {});
  clearInterval(liveTimer); liveTimer = setInterval(() => { if (isLive() || inLobby() || LIVE.wasLobby) liveChanged(); }, 30000);
}
async function createGame(lockHour, closeHours) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", cfg = { tz, lockHour, lobby: true, lobbyEnds: closeHours ? Date.now() + closeHours * 36e5 : null, createdAt: Date.now(), host: LIVE.uid };
  try { await LIVE.db.doc("game/config").set(cfg); LIVE.config = cfg; await joinGame(); }
  catch (e) { console.warn(e); toast("Couldn't start the game" + (e && (e.code || e.message) ? " (" + (e.code || e.message) + ")" : "") + ". Reload the page and try again."); }
}
async function restartGame() {
  const c = LIVE.config, next = { tz: c.tz, lockHour: c.lockHour, lobby: true, lobbyEnds: null, createdAt: Date.now(), host: c.host || LIVE.uid };
  try { await LIVE.db.doc("game/config").set(next); LIVE.config = next;
    // everyone already signed up is registered for the new war, with a fresh army but their hero and banner kept
    const ck = liveClock();
    for (const [uid, p] of Object.entries(LIVE.players)) { if (p.left) continue; const old = p.state || {}, st = Object.assign(freshLiveState(ck), { cls: old.cls || "warrior", banner: old.banner || defaultBanner(), ob: 0, lobbyPrep: true }), doc = { fromWeek: "0000-00-00", joinedAt: p.joinedAt || Date.now(), nick: p.nick || "", real: p.real || "", state: st, plans: {} }; if (p.pending) doc.pending = true;
      try { await LIVE.db.doc("players/" + uid).set(doc); LIVE.players[uid] = doc; } catch (e) { console.warn(e); } }
    LIVE_S = null; S = null; LIVE.stateLoaded = false; sheet = null; toast("A new war is gathering. Registration is open."); setMode("friends"); }
  catch (e) { console.warn(e); toast("Couldn't restart the game (" + ((e && (e.code || e.message)) || "error") + ")."); }
}
async function joinGame() {
  const ck = liveClock(), lob = lobbyOpen(LIVE.config), fromWeek = lob ? "0000-00-00" : addDays(ck.week, 7);
  const st = freshLiveState(ck); if (lob) st.lobbyPrep = true;
  { const used = new Set(Object.values(teamColours())); st.banner = Object.assign(defaultBanner(), { c1: SEAT_COLORS.find(c => !used.has(c)) || null }); }
  const doc = { fromWeek, joinedAt: Date.now(), state: st, plans: {} }; if (lob) doc.pending = true; // not registered until they tap Register at the end of the form
  try { await myWrite(r => r.set(doc));
    LIVE.players[LIVE.uid] = doc;
    toast(lob ? "Welcome, m'lord. A quick tour, then set up your lord and register." : "You're signed up for next week's war."); LIVE_S = null; S = null; LIVE.stateLoaded = false; setMode("friends"); if (lob && S && S.ob === 1) sheet = { type: "guide", pg: 0 }; render(); }
  catch (e) { toast(e && e.code === "invalid_argument" ? "You can watch but not join. Ask the host to add you as an Editor." : "Couldn't join just now. Try again."); }
}
const hrsLabel = m => m >= 1440 ? `${Math.floor(m / 1440)}d ${Math.floor(m % 1440 / 60)}h` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
function syncLobby() {
  if (PREVIEW) setTimeout(renderPvBar);
  const el = document.getElementById("lobby");
  if (inLobby()) { if (!S || !S.lobbyPrep) enterLive(); LIVE.wasLobby = true; renderLobby(); return; }
  if (el) el.remove();
  if (LIVE.wasLobby) { LIVE.wasLobby = false;
    if (isLive() && S && S.lobbyPrep) { rollover(); refreshLiveWorld(); sanitizePlace(); home(); queueSave(true); sheet = null; render(); toast("Registration is closed. The war begins: Day 1 planning is open!"); } }
}
function hostUid() { const c = LIVE.config || {}; if (c.host) return c.host; const l = lobbyLords()[0]; return l ? l[0] : null; }
function hostLabel() { const h = hostUid(); return !h ? "your host" : h === LIVE.uid ? "you" : nameOf(h); }
function closesText(cfg) { const left = cfg.lobbyEnds ? Math.max(0, Math.ceil((cfg.lobbyEnds - Date.now()) / 60000)) : null;
  return left === null ? "Registration closes when the host locks in the war." : left > 0 ? `Registration closes in <b>${hrsLabel(left)}</b>` : "Registration is closing…"; }
function lordCards(withSeats) { // banner and name for every registered lord; rivals' heroes stay hidden until the war begins
  const reg = lobbyLords(), TC = teamColours(), open = Math.max(0, 8 - reg.length), h = hostUid();
  return `<div class="lcards">${reg.map(([uid, pl], i) => { const isMe = uid === LIVE.uid, st = isMe && S ? S : pl.state || {}, cls = isMe && st.cls && CLASSES[st.cls];
    return `<div class="lcard${isMe ? " me" : ""}"><img class="lban" alt="" src="${bannerURL(st.banner || defaultBanner(), TC[uid] || SEAT_COLORS[i], 40, 54)}"><span><b>${esc(isMe ? (MY_NAME === "You" ? "You" : MY_NAME + " · you") : nameOf(uid))}</b><small>${uid === h ? "Host · " : ""}${cls ? esc(cls.name) : "Hero hidden"}</small></span>${cls ? `<img class="lhero" alt="" src="${spriteURL("c-" + st.cls)}">` : `<span class="hidhero" aria-hidden="true">?</span>`}</div>`; }).join("")}${withSeats ? Array.from({ length: open }, () => `<div class="lcard emptyseat"><span><b>Open seat</b><small>Waiting for a lord</small></span></div>`).join("") : ""}</div>`;
}
function lobbyLords() { return Object.entries(LIVE.players).filter(([, p]) => !p.left && !p.pending).sort((a, b) => ((a[1].joinedAt || 0) - (b[1].joinedAt || 0)) || (a[0] < b[0] ? -1 : 1)).slice(0, 8); }
function renderLobby() {
  if (!inLobby()) return; const cfg = LIVE.config; let el = document.getElementById("lobby");
  if (!el) { el = document.createElement("div"); el.id = "lobby"; document.body.appendChild(el); }
  const ae = document.activeElement; if (ae && el.contains(ae) && /SELECT|INPUT/.test(ae.tagName)) return;
  const me = LIVE.players[LIVE.uid], pending = !!me.pending, editing = pending || !!LIVE.lobbyEdit;
  const reg = lobbyLords(), open = Math.max(0, 8 - reg.length);
  const left = cfg.lobbyEnds ? Math.max(0, Math.ceil((cfg.lobbyEnds - Date.now()) / 60000)) : null;
  const closes = left === null ? "Registration closes when the host locks in the war." : left > 0 ? `Registration closes in <b>${hrsLabel(left)}</b>` : "Registration is closing…";
  const TC = teamColours(); MY_COLOR = TC[LIVE.uid] || MY_COLOR;
  const myLabel = lordLabel(me);
  if (editing) { // the registration form: name, army colour, coat of arms, hero, then Register
    const full = pending && open === 0;
    el.innerHTML = `<div class="lwrap"><h2>${pending ? "Register for the war" : "Your preparations"}</h2><p class="lsub">${closes} · ${open} seat${open === 1 ? "" : "s"} open</p>
    <div class="lbox"><h3><span class="stepn">1</span>Your name</h3>${nameForm(`Shown over your castle and hero as <b>Nickname (Name)</b>. Fixed once registration closes.`, false)}</div>
    <div class="lbox"><h3><span class="stepn">2</span>Army colour</h3>${armySwatches()}</div>
    <div class="lbox"><h3><span class="stepn">3</span>Coat of arms</h3><div class="lrow"><span class="coat"><img alt="Your coat of arms" src="${bannerURL(S.banner || defaultBanner(), MY_COLOR, 40, 54)}">Pattern, emblem and second colour</span><button class="btn small wood" data-act="lobbyban">Design</button></div></div>
    <div class="lbox"><h3><span class="stepn">4</span>Your hero</h3><div class="lrow"><span class="coat"><img class="lhero" alt="" src="${spriteURL("c-" + S.cls)}"><b>${CLASSES[S.cls].name}</b></span><button class="btn small wood" data-act="lobbyhero">Change hero</button></div></div>
    <div class="regbar">${pending ? `<button class="btn wax big" data-act="register" ${full ? "disabled" : ""}>⚑ Register<small>${full ? "All eight seats are taken" : "Join the war and enter the Muster Hall"}</small></button>` : `<button class="btn wax big" data-act="register">Save changes</button><button class="btn" data-act="lobbyback">Cancel</button>`}</div>
    <div class="row"><button class="btn small" data-act="open" data-v="title">← Menu</button></div></div>`;
    return;
  }
  const own = LIVE.isOwner;
  if (own && !cfg.host && LIVE.db) { cfg.host = LIVE.uid; LIVE.db.doc("game/config").update({ host: LIVE.uid }).catch(() => {}); } // older games: record the host
  el.innerHTML = `<div class="lwrap"><h2>The Muster Hall</h2><p class="lsub">${closes} · hosted by ${esc(hostLabel() === "you" ? "you" : hostLabel())}</p>
    <div class="lbox"><h3>${reg.length} of 8 lords registered · ${open} seat${open === 1 ? "" : "s"} open</h3>${lordCards(true)}
      <p class="muted">When registration closes the map is built, every castle is placed, and Day 1 planning begins. Battles are fought daily at ${lockLabel(cfg)} (${esc(cfg.tz)}).</p></div>
    <div class="lbox"><h3>You're registered</h3><div class="lrow"><span class="coat"><img alt="" src="${bannerURL(S.banner || defaultBanner(), MY_COLOR, 40, 54)}"><span><b>${esc(myLabel || MY_NAME)}</b><br><small class="muted">${TEAM_COLOR_NAMES[MY_COLOR] || ""} army · ${CLASSES[S.cls].name}</small></span></span><button class="btn small wood" data-act="lobbyedit">Change</button></div></div>
    ${own ? `<div class="lbox"><h3>Host controls</h3>
      <label class="inline">Registration closes<select id="lobbyclose"><option value="">Keep as is</option><option value="0">When I lock it in</option>${[1, 3, 6, 12, 24, 48].map(h => `<option value="${h}">In ${h < 24 ? h + " hour" + (h > 1 ? "s" : "") : h / 24 + " day" + (h > 24 ? "s" : "")}</option>`).join("")}</select></label>
      <label class="inline">Battle time<select id="lobbyhour">${[12, 13, 17, 18, 19, 20, 21, 22].map(h => `<option value="${h}"${h === cfg.lockHour ? " selected" : ""}>${hourLabel(h)}</option>`).join("")}</select></label>
      <div class="row"><button class="btn small" data-act="lobbysave">Save</button><button class="btn ${LIVE.beginConfirm ? "wax" : "wood"}" data-act="lobbybegin" ${reg.length < 2 ? "disabled" : ""}>${LIVE.beginConfirm ? "Tap again: lock in and begin" : "Lock in and begin the war"}</button></div>
      ${reg.length < 2 ? `<p class="muted">You need at least two lords to begin.</p>` : ""}</div>` : ""}
    ${open ? invitePanel(open) : `<div class="lbox"><h3>Every seat is taken</h3><p class="muted">All eight lords are registered.</p></div>`}
    <div class="row"><button class="btn small" data-act="open" data-v="title">← Menu</button></div></div>`;
}
async function registerMe() {
  const me = LIVE.players[LIVE.uid]; if (!me || !inLobby()) return;
  const nEl = document.getElementById("mynick"), rEl = document.getElementById("myreal");
  const nick = cleanName(nEl ? nEl.value : NAME_DRAFT.mynick ?? me.nick, NICK_MAX), real = cleanName(rEl ? rEl.value : NAME_DRAFT.myreal ?? me.real, REAL_MAX);
  if (!nick || !real) { toast(!nick && !real ? "Enter a nickname and your actual name." : !nick ? "Enter a nickname." : "Enter your actual name."); (!nick ? nEl : rEl)?.focus(); return; }
  const wasPending = !!me.pending;
  if (wasPending && lobbyLords().length >= 8) { toast("Sorry, all eight seats are taken."); renderLobby(); return; }
  const patch = { nick, real, state: S }; if (wasPending) { patch.pending = false; patch.joinedAt = Date.now(); }
  clearTimeout(saveTimer); saveTimer = null; // the patch carries the latest state, so a pending autosave isn't needed
  try { await myWrite(r => r.update(patch)); Object.assign(me, patch); delete NAME_DRAFT.mynick; delete NAME_DRAFT.myreal;
    LIVE.lobbyEdit = false; applyNicks(); renderLobby(); document.getElementById("lobby")?.scrollTo({ top: 0 });
    toast(wasPending ? `You're registered as ${lordLabel(me)}!` : "Changes saved."); }
  catch (e) { console.warn("register failed", e); toast(e && e.code === "invalid_argument" ? "You can watch but not join. Ask the host to add you as an Editor." : `Couldn't save just now${e && e.code ? " (" + e.code + ")" : ""}. Try again.`); }
}
async function watchLiveBattle(dayKey, how) {
  const week = addDays(dayKey, -(weekdayOf(dayKey) - 1)), before = {};
  Object.entries(LIVE.battles).forEach(([k, b]) => { if (b.week === week && k < dayKey) (b.results || []).forEach(r => { before[r.pid] = (before[r.pid] || 0) + r.points; }); });
  const saved = LIVE.battles[dayKey] && LIVE.battles[dayKey].inputs;
  const { N: size, plans, transfers, final } = saved
    ? { N: saved.N, final: !!saved.final, transfers: LIVE.battles[dayKey].transfers || [], plans: JSON.parse(JSON.stringify(saved.plans)).map(p => Object.assign(p, { me: p.pid === LIVE.uid, name: nameOf(p.pid) })) }
    : liveBattlePlans(dayKey);
  if (saved && saved.feuds) plans.feuds = saved.feuds.slice();
  if (saved && LIVE.battles[dayKey].mercs) plans.mercs = LIVE.battles[dayKey].mercs;
  const res = runBattle(plans, daySeed(dayKey), { N: size, finalDay: final, ultV2: saved ? !!saved.ultV2 : ultV2For(dayKey), ranks: rankMap(before, plans.map(p => p.pid)) });
  DAY_FOR_INTRO = weekdayOf(dayKey);
  res.names = Object.fromEntries(plans.map(p => [p.pid, p.pid === LIVE.uid ? (MY_NAME || "You") : p.name]));
  res.transfers = transfers; res.board = before; res.week = week;
  try { localStorage.setItem("lastbanner.seen", dayKey); } catch (e) {}
  replay = { res, time: 0, playing: false, speed: 1, done: true, logN: -1, sel: null, day: dayKey, auto: true };
  mode = "replay"; sheet = null; sel = null; flyTo(W / 2, W / 2, 0); render(); buildReplayUI();
  res.dip = diplomacyReport(plans, carriedPairs(dayKey), res.hl, res.me);
  if (how === "play") { replay.done = false; render(); showIntro(introData(plans, carriedPairs(dayKey), liveYesterdayBets(dayKey), res.names, final), () => { if (replay) replay.playing = true; }); } else if (how === "reel") startReel(false); else open("results");
}
function openReportFor(k) { try { localStorage.setItem("lastbanner.seen", k); } catch (e) {} reportBack = k; sheet = { type: "report", id: k }; render(); }
const GAME_URL = () => { let u = "https://claude.ai/artifact/7WwWgy4irntRjE6ep653Am"; try { if (/claude\.ai/.test(location.href)) u = location.href.split("#")[0]; } catch (e) {} return u; };
function invitePanel(open) {
  return `<div class="sec lbox"><h3>Invite friends${open ? ` · ${open} seat${open === 1 ? "" : "s"} open` : ""}</h3>
    <ol class="muted" style="margin:0 0 8px;padding-left:20px"><li>${LIVE.isOwner ? "Open this page's <b>Share</b> menu and add each friend by email as an <b>Editor</b>, so they can save their orders." : "Ask the host to add your friend as an <b>Editor</b> in the page's Share menu, so they can save their orders."}</li><li>Send them the link below.</li><li>They tap <b>Play with friends</b>, see who's registered, then tap <b>Register</b>.</li></ol>
    <div class="row"><button class="btn wood" data-act="copyinvite">Copy invite link</button></div></div>`;
}
function gameSheet() {
  const lines = [];
  const can = LIVE.db && LIVE.uid;
  if (!can) return head(null, "Friends Game", "Play against your friends") + `<div class="body">
    <p>Friends games run inside this page while you're signed in to Claude.</p>
    <p class="muted">If you're seeing this in a preview, open the published page instead. Each friend needs the page shared with them as an <b>Editor</b> (Share menu, invite by email) so they can save their orders.</p>
    <div class="row"><button class="btn" data-act="open" data-v="title">← Back</button></div></div>`;
  if (!LIVE.configLoaded || !LIVE.playersLoaded) return head(null, "Friends Game", "Connecting…") + `<div class="body"><p class="muted">Reaching the shared game. If this takes more than a few seconds, check your connection.</p></div>`;
  if (!LIVE.config) return head(null, "Friends Game", "No game running yet") + `<div class="body">
    ${LIVE.isOwner ? `<p>Gather your friends for a seven-day war. You'll open registration, send the invite link, and your friends choose a hero and a banner. When registration closes the map is built and Day 1 begins. Orders lock and the battle is fought every day at:</p>
      <label class="inline">Battle time<select id="lockhour">${[17, 18, 19, 20, 21, 22].map(h => `<option value="${h}"${h === 20 ? " selected" : ""}>${hourLabel(h)}</option>`).join("")}</select></label>
      <label class="inline">Registration closes<select id="lobbyclose">${[["0", "When I lock it in"], ["1", "In 1 hour"], ["6", "In 6 hours"], ["12", "In 12 hours"], ["24", "In 24 hours"], ["48", "In 2 days"]].map(([v, t]) => `<option value="${v}"${v === "24" ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      <p class="muted">Up to eight lords can register. Times use your time zone (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")}). You can lock in early or change the closing time later.</p>
      <div><button class="btn wax" data-act="startgame">Open registration</button></div>
      <p class="muted">You'll register first, then you can invite friends from the Muster Hall.</p>`
      : `<p>The host hasn't started a game on this page yet.</p>`}
    <div class="row"><button class="btn" data-act="open" data-v="title">← Back</button></div></div>`;
  if (lobbyOpen(LIVE.config)) { const mineL = LIVE.players[LIVE.uid], n = lobbyLords().length, open = Math.max(0, 8 - n), hl = hostLabel();
    return head(null, "You're summoned to war", hl === "you" ? "You called the banners" : `${esc(hl)} has called the banners`) + `<div class="body">
      <div class="summon"><p>${hl === "you" ? "You are hosting this war." : `<b>${esc(hl)}</b> is hosting this war and has invited you to take a castle.`} Battles are fought daily at ${lockLabel(LIVE.config)} your time for seven days.</p>
        <p class="when">${closesText(LIVE.config)} · <b>${open}</b> of 8 seats open</p></div>
      <div class="sec"><h3>${n} lord${n === 1 ? " has" : "s have"} registered</h3>${n ? lordCards(false) : `<p class="muted">Nobody yet. Be the first.</p>`}<p class="muted">Heroes stay hidden until the war begins.</p></div>
      <div class="row">${mineL ? `<button class="btn wax big" data-act="playgo">${mineL.pending ? "Finish registering" : "Enter the Muster Hall"}</button>` : n >= 8 ? `<span class="muted">All eight seats are taken.</span>` : `<button class="btn wax big" data-act="joingame">⚑ Register<small>A short tour, then choose your hero, name, colour and coat of arms</small></button>`}<button class="btn" data-act="open" data-v="title">← Back</button></div></div>`; }
  const ck = liveClock(), roster = rosterFor(ck.week), mine = LIVE.players[LIVE.uid], pts = standings(ck.week), cfg = LIVE.config, cap = capFor(ck.week), capNext = capFor(addDays(ck.week, 7));
  const signed = Object.entries(LIVE.players).filter(([, p]) => !p.left).length, inNow = roster.some(p => p.uid === LIVE.uid), queued = mine && !inNow;
  const nextWeek = addDays(ck.week, 7), waiting = Object.entries(LIVE.players).filter(([uid, p]) => !p.left && !roster.some(r => r.uid === uid)).map(([uid]) => uid);
  const status = p => { const pl = p.plans && p.plans[ck.planDay]; return pl && pl.sealed ? ["Sealed", "ok"] : pl ? ["Planning", ""] : ["No orders yet", "muted"]; };
  const clsOf = p => ((p.uid === LIVE.uid || ck.dayNo > 1) && p.state && p.state.week === ck.week && p.state.cls) || null; // rivals' classes are revealed by day 1's battle
  const ranked = roster.map((p, i) => ({ p, i })).sort((a, b) => (pts[b.p.uid] || 0) - (pts[a.p.uid] || 0));
  const battles = Object.keys(LIVE.battles).filter(k => LIVE.battles[k].week === ck.week).sort();
  const sealedN = roster.filter(p => status(p)[0] === "Sealed").length;
  return head(null, "Friends Game", `Battles daily at ${lockLabel(cfg)} · Day ${ck.dayNo} of 7`) + `<div class="body">
    <div class="stats"><div class="stat"><b>${countdown()}</b><span>until orders lock</span></div><div class="stat"><b>${sealedN} / ${roster.length}</b><span>lords have sealed</span></div><div class="stat"><b>${roster.length} / ${cap}</b><span>seats filled</span></div></div>
    <div class="sec"><h3>This week's lords</h3>
      ${ranked.length ? ranked.map(({ p, i }, n) => { const [st, cl] = status(p), c = clsOf(p);
        return `<div class="place${p.uid === LIVE.uid ? " me" : ""}"><span class="ord">${n + 1}</span><i style="background:${teamColour(p.uid)}"></i><span><b>${esc(nameOf(p.uid))}</b>${c ? ` · ${CLASSES[c].name}` : ""}<br><span class="lstat ${cl}">${st}</span></span><span class="pts">${pts[p.uid] || 0}<small>points</small></span></div>`; }).join("") : `<p class="muted">Nobody yet.</p>`}
      ${waiting.length ? `<p class="muted">Joining next week: ${waiting.map(u => esc(nameOf(u))).join(", ")}.</p>` : ""}
      <p class="muted">The map grows with the number of players: ${roster.length} castle${roster.length === 1 ? "" : "s"} on a ${seatLayout(Math.max(1, roster.length)).N}×${seatLayout(Math.max(1, roster.length)).N} field.</p></div>
    ${!mine ? `<div class="sec"><p>${signed >= capNext ? `All ${capNext} seats for next week's war are taken.` : "Registration for this war has closed. Sign up now and you'll fight in next week's war."}</p>${signed >= capNext ? "" : `<div><button class="btn wax" data-act="joingame">Sign up for next week</button></div>`}</div>` : ""}
    ${queued ? `<p class="muted">You're signed up. Your first battle is next week.</p>` : ""}
    ${queued ? `<div class="sec"><h3>Your name</h3>${nameForm(lordLabel(mine) ? `You'll be shown as <b>${esc(lordLabel(mine))}</b>. Names are fixed once your war begins.` : "Add a nickname and your actual name before your war begins. They show over your castle and hero, and can't be changed once the war starts.")}</div>` : ""}
    ${inNow ? `<div class="sec"><h3>Your name</h3><p>${esc(lordLabel(mine) || nameOf(LIVE.uid) === "You" && MY_NAME || "Your account name")} <span class="muted">· fixed for this war</span></p></div>` : ""}
    ${inNow ? `<div class="sec"><h3>Your hero</h3><div class="spread"><span>${CLASSES[S && S.week === ck.week ? S.cls : "warrior"].name}${ck.dayNo === 1 ? " · you can change class until tonight's battle" : " · locked in for the week"}</span><button class="btn small wood" data-act="open" data-v="champ">${ck.dayNo === 1 ? "Choose" : "View"}</button></div></div>` : ""}
    ${battles.length ? `<div class="sec"><h3>This week's battles</h3>${battles.map(k => { const b = LIVE.battles[k], w = (b.results || []).find(r => r.place === 1), me = (b.results || []).find(r => r.pid === LIVE.uid);
      return `<div class="spread"><span>Day ${b.day} · ${w ? esc(nameOf(w.pid)) + " won" : "fought"}${me ? ` · you ${me.place === 1 ? "won" : "placed " + me.place}` : ""}</span><button class="btn small wood" data-act="watchday" data-v="${k}">Recap</button></div>`; }).join("")}</div>` : ""}
    ${LIVE.isOwner ? `<div class="sec"><h3>Host settings</h3>
      <label class="inline">Battle time<select id="cfghour">${[12, 13, 17, 18, 19, 20, 21, 22].map(h => `<option value="${h}"${h === cfg.lockHour ? " selected" : ""}>${hourLabel(h)}</option>`).join("")}</select></label>
      <p class="muted">Time zone: ${esc(cfg.tz)}${cfg.tz !== (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") ? ` <button class="btn small" data-act="cfgtz">Use mine (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)})</button>` : ""}</p>
      <div><button class="btn small wood" data-act="cfgsave">Save settings</button></div>
      <div class="row"><button class="btn small ${sheet.rconfirm ? "wax" : ""}" data-act="restartgame">${sheet.rconfirm ? "Tap again: start a new war" : "Start a new war"}</button></div>
      <p class="muted">A new war reopens registration and clears everyone's army. Changing the battle time mid-week moves tonight's lock. </p></div>` : ""}
    <div class="row">${inNow ? `<button class="btn ${gameMode === "friends" ? "on" : "wood"}" data-act="mode" data-v="friends">${gameMode === "friends" ? "Playing friends game" : "Play friends game"}</button>` : ""}
      <button class="btn" data-act="open" data-v="title">← Menu</button></div>
    ${roster.length < 2 ? `<p class="muted">Battles start once at least two players are in.</p>` : ""}
    ${invitePanel()}</div>`;
}
async function saveConfig(patch, msg) {
  const next = Object.assign({}, LIVE.config, patch); Object.keys(next).forEach(k => { if (next[k] === undefined || next[k] === null) delete next[k]; });
  try { await LIVE.db.doc("game/config").set(next); LIVE.config = next; toast(msg || "Settings saved."); liveChanged(); }
  catch (e) { console.warn(e); toast("Couldn't save settings (" + ((e && (e.code || e.message)) || "error") + "). Reload the page and try again."); }
}
