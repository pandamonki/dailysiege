// Test mode: preview a new player's first run in a private sandbox

// ----- Test: preview a new player's full first run, from opening the invite link, in a private sandbox -----
let PREVIEW = null;
function sandboxDb(store) {
  const subs = [], live = { on: true }, copy = v => JSON.parse(JSON.stringify(v));
  const notify = () => setTimeout(() => { if (live.on) subs.forEach(f => f()); });
  const merge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object") merge(a[k], b[k]); else a[k] = b[k]; } return a; };
  const doc = p => ({ set: async d => { store[p] = copy(d); notify(); }, update: async d => { if (!(p in store)) throw { code: "not_found" }; merge(store[p], copy(d)); notify(); },
    onSnapshot: ok => { const f = () => ok({ exists: p in store, data: () => copy(store[p]) }); subs.push(f); setTimeout(() => live.on && f()); } });
  const collection = c => ({ onSnapshot: ok => { const f = () => ok({ docs: Object.keys(store).filter(k => k.startsWith(c + "/") && k.split("/").length === 2).map(k => ({ id: k.split("/")[1], data: () => copy(store[k]) })) }); subs.push(f); setTimeout(() => live.on && f()); } });
  return { db: { doc, collection }, live };
}
function startPreview() {
  if (PREVIEW) return;
  const keep = Object.assign({}, LIVE), ls = {}; ["lastbanner.mode", "lastbanner.seen"].forEach(k => { try { ls[k] = localStorage.getItem(k); } catch (e) {} });
  if (gameMode === "practice") PRACTICE_S = S; else if (S && S.week) LIVE_S = S;
  PREVIEW = { keep, liveS: LIVE_S, ls };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", cfg = { tz, lockHour: 20, lobby: true, lobbyEnds: Date.now() + 6 * 36e5, createdAt: Date.now(), host: "pv_bot0" }, store = { "game/config": cfg };
  const sb = sandboxDb(store); PREVIEW.sb = sb;
  const bots = [["Sam", "Lord Hammer", "#b8322a", "warrior"], ["Riley", "The Fox", "#2f5fa8", "rogue"], ["Jordan", "Stormcaller", "#2d8a8a", "mage"]];
  const names = { pv_you: { name: "New player" } };
  Object.keys(LIVE).forEach(k => delete LIVE[k]);
  Object.assign(LIVE, { db: sb.db, user: { id: async () => "pv_you", isOwner: async () => false, profiles: async ids => Object.fromEntries(ids.map(i => [i, names[i] || { name: "A lord" }])) },
    uid: "pv_you", isOwner: false, config: cfg, configLoaded: true, players: {}, playersLoaded: false, battles: {}, names: {}, readOnly: false, stateLoaded: false });
  const ck = liveClock();
  bots.forEach(([real, nick, c1, cls], i) => { const id = "pv_bot" + i; names[id] = { name: real };
    store["players/" + id] = { fromWeek: "0000-00-00", joinedAt: Date.now() - (3 - i) * 6e5, nick, real, plans: {}, state: Object.assign(freshLiveState(ck), { cls, ob: 0, lobbyPrep: true, banner: { ...BOT_BANNERS[i], c1 } }) }; });
  sb.db.doc("game/config").onSnapshot(q => { if (PREVIEW && PREVIEW.sb === sb) { LIVE.config = q.exists ? q.data() : null; liveChanged(); } });
  sb.db.collection("players").onSnapshot(q => { if (!PREVIEW || PREVIEW.sb !== sb) return; LIVE.players = {}; q.docs.forEach(d => { LIVE.players[d.id] = d.data(); }); LIVE.playersLoaded = true; refreshNames(); liveChanged(); });
  sb.db.collection("battles").onSnapshot(q => { if (!PREVIEW || PREVIEW.sb !== sb) return; LIVE.battles = {}; q.docs.forEach(d => { LIVE.battles[d.id] = d.data(); }); liveChanged(); });
  LIVE_S = null; if (PRACTICE_S) S = PRACTICE_S; gameMode = "practice"; mode = "plan"; replay = null; sel = null; reportBack = null;
  document.body.classList.add("pv"); renderPvBar();
  sheet = { type: "title" }; render(false);
  toast("Preview: you've just opened the invite link. Three bot lords have already registered.");
}
function renderPvBar() {
  let el = document.getElementById("pvbar");
  if (!PREVIEW) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("div"); el.id = "pvbar"; document.body.appendChild(el); }
  const canBegin = inLobby() && !LIVE.players[LIVE.uid].pending;
  el.innerHTML = `<b>Preview</b><span>New player's first run</span>${canBegin ? `<button class="btn small wood" data-act="pvbegin">Begin the war</button>` : ""}<button class="btn small" data-act="pvexit">Exit</button>`;
}
function endPreview() {
  if (!PREVIEW) return; const pv = PREVIEW; pv.sb.live.on = false; PREVIEW = null;
  clearTimeout(saveTimer); saveTimer = null;
  Object.keys(LIVE).forEach(k => delete LIVE[k]); Object.assign(LIVE, pv.keep);
  LIVE_S = pv.liveS; gameMode = "practice"; mode = "plan"; replay = null; sel = null; reportBack = null; S = null;
  Object.entries(pv.ls).forEach(([k, v]) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} });
  const lob = document.getElementById("lobby"); if (lob) lob.remove(); const hp = document.getElementById("heropick"); if (hp) hp.remove();
  document.body.classList.remove("pv"); renderPvBar();
  enterPractice(); home(); refreshNames(); sheet = { type: "title", tab: "test" }; render(false); toast("Preview closed. Your test game is as you left it.");
}
