// The Firebase backend: sign-in, the shared game in Firestore, invites and host tools.
//
// The game was written against a small API, window.claude.use("db" | "user" | "downloads"), that
// stores one game as game/config, players/{uid} and battles/{day}. This file provides the same API
// on top of Firebase so the rest of the game barely changes, while storing the data split up so
// that orders stay secret:
//
//   games/{g}                               settings (the game's "game/config")
//   games/{g}/players/{uid}                 public profile: names, banner, sealed-or-not
//   games/{g}/players/{uid}/private/state   gold, army, items...   only its owner can read it
//   games/{g}/players/{uid}/orders/{day}    that day's orders      only its owner can read them
//   games/{g}/battles/{day}                 results, written by the server
//
// What the game sees as "players/{uid}" is rebuilt here: your own entry holds your real state and
// orders; a rival's entry holds only what is public plus the orders they have already FOUGHT
// (taken from finished battles). Their orders for today never reach this device.
//
// It installs itself only when the page is not running inside Claude, so the same code still runs there.

(function () {
  if (window.claude && typeof window.claude.use === "function") return; // inside Claude: use its own storage

  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  const SDK = ["app", "auth", "firestore"].map(n => `js/vendor/firebase/firebase-${n}-compat.js`);
  const FUNCTIONS_REGION = "australia-southeast1"; // must match REGION in functions/region.js
  const DEMO = { apiKey: "demo-key", authDomain: "demo-dailysiege.firebaseapp.com", projectId: "demo-dailysiege", appId: "demo" };
  const SERVER_KEYS = ["planDay", "nextPlanDay", "nextLockAt", "lockAfter", "clockWar", "startDate", "resolvedAt"]; // only the server writes these
  const HIDDEN_KEYS = ["nextLockAt", "lockAfter", "resolvedAt"];                                       // timestamps the game has no use for
  const CONFIG_KEYS = ["tz", "lockHour", "lobby", "lobbyEnds", "createdAt", "maxPlayers", "capFrom", "capPrev"]; // what the host's settings screen may change
  const copy = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const randomId = n => { const abc = "abcdefghjkmnpqrstuvwxyz23456789", a = new Uint32Array(n); crypto.getRandomValues(a); return Array.from(a, x => abc[x % abc.length]).join(""); };
  // the game's code expects error codes spelt with underscores
  const legacyErr = e => { const code = e && e.code ? String(e.code).replace(/^.*\//, "").replace(/-/g, "_") : null; return Object.assign(new Error((e && e.message) || "error"), { code, cause: e }); };
  const redraw = () => { try { if (typeof render === "function") render(); } catch (e) {} };
  const say = m => { try { toast(m); } catch (e) {} };

  let fb = null, auth = null, fs = null, initP = null, epoch = 0;
  const DS = window.DS = { kind: "firebase", available: null, user: null, emulator: false, busy: null, note: null, error: null };

  // ---------- start-up ----------
  const loadScript = src => new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => fail(new Error("could not load " + src)); document.head.appendChild(s); });
  async function findConfig() {
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    if (local && /[?&]emulator=1/.test(location.search)) LS.set("ds.emulator", "1");
    if (local && /[?&]emulator=0/.test(location.search)) LS.set("ds.emulator", null);
    if (local && LS.get("ds.emulator") === "1") { DS.emulator = true; return DEMO; } // local testing against the Firebase emulators
    if (window.DS_FIREBASE_CONFIG) return window.DS_FIREBASE_CONFIG;
    try { const r = await fetch("/__/firebase/init.json", { cache: "no-store" }); if (r.ok) { const c = await r.json(); if (c && c.projectId && c.apiKey) return c; } } catch (e) {} // provided by Firebase Hosting
    return null;
  }
  function rememberInvite() { // /join/<code> (or ?join=<code>): keep the code through sign-in, and tidy the address bar
    const m = location.pathname.match(/\/join\/([A-Za-z0-9_-]{8,64})\/?$/) || location.search.match(/[?&]join=([A-Za-z0-9_-]{8,64})/);
    if (!m) return;
    LS.set("ds.invite", m[1]);
    try { history.replaceState(null, "", location.pathname.replace(/\/join\/.*$/, "/") + (DS.emulator ? "?emulator=1" : "")); } catch (e) {}
  }
  function init() {
    return initP || (initP = (async () => {
      const cfg = await findConfig();
      if (!cfg) { DS.available = false; return false; }
      try {
        // Sign-in works best when the page and the sign-in helper share one address, so send the
        // project's .web.app address to its twin .firebaseapp.com address (same site, same files).
        if (cfg.authDomain && location.hostname === cfg.projectId + ".web.app" && cfg.authDomain === cfg.projectId + ".firebaseapp.com") { location.replace("https://" + cfg.authDomain + location.pathname + location.search + location.hash); return false; }
        rememberInvite();
        for (const s of SDK) await loadScript(s);
        fb = window.firebase; fb.initializeApp(cfg); auth = fb.auth(); fs = fb.firestore();
        if (DS.emulator) { auth.useEmulator("http://" + location.hostname + ":9099", { disableWarnings: true }); fs.useEmulator(location.hostname, 8080); }
        await finishEmailLink();
        try { await auth.getRedirectResult(); } catch (e) { DS.error = signInError(e); }
        await new Promise(ok => { let first = true; auth.onAuthStateChanged(u => { DS.user = u; if (first) { first = false; ok(); } else onAuthChange(); }); });
        DS.available = true; return true;
      } catch (e) { console.warn("Daily Siege: Firebase did not start", e); DS.available = false; DS.error = "The friends game could not be reached. Check your connection and reload."; return false; }
    })());
  }
  function onAuthChange() { // signed in or out after start-up: reconnect the game to the new account
    stopGame();
    try {
      LIVE.uid = null; LIVE.config = null; LIVE.configLoaded = false; LIVE.players = {}; LIVE.playersLoaded = false; LIVE.battles = {}; LIVE.names = {}; LIVE.stateLoaded = false; LIVE.isOwner = false; LIVE_S = null;
      if (gameMode === "friends") { gameMode = "practice"; enterPractice(); }
      const lob = document.getElementById("lobby"); if (lob) lob.remove();
      connectLive().then(redraw);
    } catch (e) { console.warn(e); }
    redraw();
  }

  // ---------- signing in ----------
  const signInError = e => { const c = (e && e.code) || ""; return /popup-closed|cancelled-popup|user-cancelled/.test(c) ? null : /network/.test(c) ? "No connection. Try again." : /invalid-email/.test(c) ? "That email address doesn't look right." : /unauthorized-domain/.test(c) ? "This web address isn't approved for sign-in yet. Tell the host." : /expired|invalid-action-code/.test(c) ? "That sign-in link has expired or was already used. Ask for a new one." : "Couldn't sign in (" + (c || (e && e.message) || "error") + ")."; };
  async function finishEmailLink() {
    if (!auth.isSignInWithEmailLink(location.href)) return;
    let email = LS.get("ds.email");
    if (!email) email = window.prompt("To finish signing in, confirm the email address you asked the link for:");
    try { if (email) { await auth.signInWithEmailLink(email.trim(), location.href); LS.set("ds.email", null); } }
    catch (e) { DS.error = signInError(e); }
    try { history.replaceState(null, "", location.pathname + (DS.emulator ? "?emulator=1" : "")); } catch (e) {}
  }
  DS.signInGoogle = async () => {
    DS.error = null; DS.busy = "google"; redraw();
    const p = new fb.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    try { await auth.signInWithPopup(p); }
    catch (e) { if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test((e && e.code) || "")) { try { await auth.signInWithRedirect(p); return; } catch (e2) { DS.error = signInError(e2); } } else DS.error = signInError(e); }
    DS.busy = null; redraw();
  };
  DS.signInEmail = async email => {
    email = String(email || "").trim(); DS.error = null; DS.note = null;
    if (!/^\S+@\S+\.\S+$/.test(email)) { DS.error = "Enter your email address first."; redraw(); return; }
    DS.busy = "email"; redraw();
    try { await auth.sendSignInLinkToEmail(email, { url: location.origin + "/" + (DS.emulator ? "?emulator=1" : ""), handleCodeInApp: true }); LS.set("ds.email", email); DS.note = `Link sent to ${email}. Open it on this device to sign in. It can take a minute, and may land in spam.`; }
    catch (e) { DS.error = signInError(e); }
    DS.busy = null; redraw();
  };
  DS.signOut = async () => { try { await auth.signOut(); } catch (e) {} };
  DS.accountLabel = () => (DS.user ? DS.user.email || DS.user.displayName || "Signed in" : "");

  // ---------- the current game ----------
  // G holds what the listeners have delivered. Nothing is passed on to the game until every part has
  // arrived once: the game must never mistake "not loaded yet" for "this player has no saved state".
  let G = null;
  const newG = id => ({ id, seat: null, ready: null, game: undefined, pubs: null, state: undefined, orders: null, battles: null, unsub: [], cfgCbs: [], plCbs: [], btCbs: [], member: false, started: false });
  function stopGame() { epoch++; if (G) G.unsub.forEach(u => { try { u(); } catch (e) {} }); G = null; DS.gameId = null; DS.seat = null; }
  // Who I am in the game. Normally my account id; if the host moved my old castle to this new account, the old seat's id.
  const meId = () => (G && G.seat) || DS.user.uid;
  const gameRef = () => fs.collection("games").doc(G.id);
  const myRef = () => gameRef().collection("players").doc(meId());
  const curWar = () => (G && G.game && G.game.war) || 1;

  let clockSkew = 0; // server time minus this device's clock, so a wrong phone clock can't break registration
  async function measureClock() { try { const r = fs.collection("users").doc(DS.user.uid); await r.set({ seenAt: fb.firestore.FieldValue.serverTimestamp() }, { merge: true }); const s = await r.get({ source: "server" }); const t = s.get("seenAt"); if (t) clockSkew = t.toMillis() - Date.now(); } catch (e) {} }

  async function mayHost() { // the first person to sign in owns the site and may host; they can add other hosts later
    try { const r = fs.collection("config").doc("app"), s = await r.get(); if (s.exists) return (s.get("hosts") || []).includes(DS.user.uid);
      await r.set({ owner: DS.user.uid, hosts: [DS.user.uid], createdAt: Date.now() }); return true; } catch (e) { return false; }
  }
  async function findGame() { // which game is this account in? a fresh invite link wins, then the last game played
    const uid = DS.user.uid, users = fs.collection("users").doc(uid), code = LS.get("ds.invite");
    if (code) {
      LS.set("ds.invite", null);
      try {
        const inv = await fs.collection("invites").doc(code).get();
        if (!inv.exists) say("That invite link is no longer valid. Ask the host for the current one.");
        else { const gid = inv.get("gameId"), mem = fs.collection("games").doc(gid).collection("members").doc(uid);
          let ok = false; try { ok = (await mem.get()).exists; } catch (e) {}
          if (!ok) await mem.set({ invite: code, at: Date.now() });
          await users.set({ gameId: gid }, { merge: true }); return { gid, seat: (await mem.get()).get("seat") || uid }; }
      } catch (e) { console.warn("invite", e); say(legacyErr(e).code === "permission_denied" ? "The host has removed this account from the game." : "Couldn't open the invite. Check your connection and try the link again."); }
    }
    try { const u = await users.get(), gid = u.exists && u.get("gameId");
      if (gid) { const m = await fs.collection("games").doc(gid).collection("members").doc(uid).get(); if (m.exists) return { gid, seat: m.get("seat") || uid }; } } catch (e) {}
    return null;
  }
  async function startGame() { // called once per connection, after sign-in
    const my = ++epoch, g = G;
    await measureClock();
    const found = await findGame(); if (my !== epoch) return;
    const gid = found && found.gid; g.seat = found ? found.seat : DS.user.uid; DS.seat = g.seat;
    if (!gid) { try { LIVE.isOwner = await mayHost(); } catch (e) {} if (my !== epoch) return; g.game = null; g.pubs = {}; g.state = null; g.orders = {}; g.battles = {}; emit(g, true); return; }
    attach(g, gid);
  }
  function attach(g, gid) {
    g.id = gid; DS.gameId = gid; g.member = true;
    const gr = fs.collection("games").doc(gid), me = gr.collection("players").doc(g.seat || DS.user.uid);
    const lost = e => { console.warn("Daily Siege listener", e && e.code); if (G === g && legacyErr(e).code === "permission_denied") { say("This account is no longer in that game."); DS.leaveGame(); } }; // removed by the host
    const on = (ref, fn) => g.unsub.push(ref.onSnapshot(s => { if (G === g) { fn(s); emit(g); } }, lost));
    on(gr, s => { g.game = s.exists ? s.data() : null; });
    // my membership: if the host removes me, or hands me my old castle, start again with the new standing
    on(gr.collection("members").doc(DS.user.uid), s => { if (!g.joined) { g.joined = s.exists; return; } if (!s.exists) { say("This account is no longer in that game."); DS.leaveGame(); } else if ((s.get("seat") || DS.user.uid) !== g.seat) { say("Your castle is back in your hands."); onAuthChange(); } });
    on(gr.collection("players"), q => { g.pubs = {}; q.forEach(d => { g.pubs[d.id] = d.data(); }); });
    on(me.collection("private").doc("state"), s => { g.state = s.exists ? s.data() : null; });
    // only recent days are needed: this week's orders and battles (a plain range on the day key needs no index)
    const since = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10), byDay = fb.firestore.FieldPath.documentId();
    on(me.collection("orders").where(byDay, ">=", since), q => { g.orders = {}; q.forEach(d => { g.orders[d.id] = d.data(); }); });
    on(gr.collection("battles").where(byDay, ">=", since), q => { g.battles = {}; q.forEach(d => { g.battles[d.id] = d.data(); }); });
  }

  // ---------- what the game sees ----------
  function configView(g) { if (!g.game) return null; const c = copy(Object.fromEntries(Object.entries(g.game).filter(([k]) => !HIDDEN_KEYS.includes(k)))); return c; }
  const battlesView = g => Object.fromEntries(Object.entries(g.battles || {}).filter(([, b]) => (b.war || 1) === curWar()).map(([k, b]) => [k, copy(b)]));
  function playersView(g) {
    const uid = g.seat || DS.user.uid, bt = Object.entries(battlesView(g)).sort((a, b) => (a[0] < b[0] ? -1 : 1)), out = {};
    for (const [id, pub] of Object.entries(g.pubs || {})) {
      const base = { fromWeek: pub.fromWeek, joinedAt: pub.joinedAt, nick: pub.nick || "", real: pub.real || "" };
      if (pub.pending) base.pending = true; if (pub.left) base.left = true; if (pub.sealedFor) base.sealedFor = pub.sealedFor;
      if (id === uid) { // me: my real state and my real orders
        base.plans = Object.fromEntries(Object.entries(g.orders || {}).filter(([, o]) => (o.war || 1) === curWar()).map(([k, o]) => { const p = copy(o); delete p.war; return [k, p]; }));
        if (g.state) base.state = copy(g.state);
      } else { // a rival: public facts, plus the orders they have already fought
        base.plans = {}; let cls = null;
        for (const [day, b] of bt) { const pl = b.inputs && (b.inputs.plans || []).find(p => p.pid === id); if (!pl) continue;
          if (b.week === pub.week) cls = pl.cls || cls;
          if (!pl.noOrders) base.plans[day] = Object.assign({}, pl, { pieces: (pl.pieces || []).filter(pc => !pc.merc), sealed: true }); }
        base.state = { week: pub.week || null, banner: pub.banner || null, items: pub.hasRapier ? ["rapier"] : [] }; if (cls) base.state.cls = cls;
      }
      out[id] = base;
    }
    return out;
  }
  const snapDoc = d => ({ exists: d != null, data: () => copy(d) });
  const snapCol = o => ({ docs: Object.entries(o).map(([id, d]) => ({ id, data: () => copy(d) })) });
  let emitT = null;
  function emit(g, now) { // pass the latest data on to the game, once everything has loaded
    if (G !== g || g.game === undefined || !g.pubs || g.state === undefined || !g.orders || !g.battles) return;
    const run = () => { emitT = null; if (G !== g) return;
      try { LIVE.isOwner = g.game ? g.game.host === DS.user.uid : LIVE.isOwner; } catch (e) {}
      g.started = true;
      const cfg = snapDoc(configView(g)), bt = snapCol(battlesView(g)), pl = snapCol(playersView(g));
      g.cfgCbs.forEach(f => f(cfg)); g.btCbs.forEach(f => f(bt)); g.plCbs.forEach(f => f(pl)); };
    if (now) run(); else if (!emitT) emitT = setTimeout(run, 0);
  }

  // ---------- writing ----------
  function publicFrom(doc, cur) { // the public part of my player record
    const st = doc.state || {}, days = Object.keys(doc.plans || {}).sort(), last = days[days.length - 1];
    const pub = { fromWeek: doc.fromWeek || "0000-00-00", joinedAt: doc.joinedAt || Date.now(), nick: doc.nick || "", real: doc.real || "", pending: !!doc.pending,
      banner: st.banner || (cur && cur.banner) || null, hasRapier: (st.items || []).includes("rapier"), week: st.week || null, war: curWar(), sealedFor: last && doc.plans[last] && doc.plans[last].sealed ? last : null };
    if (cur && cur.left !== undefined) pub.left = cur.left;
    if (!cur || pub.joinedAt !== cur.joinedAt) pub.joinedAt = Math.round(pub.joinedAt + clockSkew); // a new sign-up time is stamped in server time
    return copy(pub);
  }
  async function writeMine(doc) { // split the game's single player record into public profile, private state and today's orders
    const g = G, cur = g.pubs[meId()] || null, pub = publicFrom(doc, cur), state = doc.state ? copy(doc.state) : null;
    const from = (g.game && g.game.planDay) || null, orders = Object.entries(doc.plans || {}).filter(([k, p]) => p && (!from || k >= from)).map(([k, p]) => [k, Object.assign(copy(p), { war: curWar() })]).filter(([k, p]) => !same(p, g.orders[k]));
    const commit = withOrders => { const b = fs.batch(); let n = 0;
      const p = withOrders ? pub : Object.assign({}, pub, { sealedFor: (cur && cur.sealedFor) || null });
      if (!same(p, cur)) { b.set(myRef(), p); n++; }
      if (state && !same(state, g.state)) { b.set(myRef().collection("private").doc("state"), state); n++; }
      if (withOrders) orders.forEach(([k, o]) => { b.set(myRef().collection("orders").doc(k), o); n++; });
      return n ? b.commit() : Promise.resolve(); };
    // The server sets the war's clock a few seconds after the war begins. Until then orders can't be stored:
    // save everything else, and report "try again" so the game's save queue retries.
    if (orders.length && !from) { await commit(false); throw Object.assign(new Error("The war's clock isn't set yet"), { code: "unavailable" }); }
    try { await commit(true); }
    catch (e) { // orders refused (that day has locked): still save the rest, then say so
      if (orders.length && legacyErr(e).code === "permission_denied") { await commit(false).catch(() => {}); throw Object.assign(new Error("Orders are locked for that day"), { code: "permission-denied" }); } throw e; }
  }
  const mineNow = () => playersView(G)[meId()] || {};
  async function writeConfig(next) {
    const g = G, cur = g.game;
    if (!cur) return createGame(next);
    const patch = {}, del = fb.firestore.FieldValue.delete();
    CONFIG_KEYS.forEach(k => { const v = next[k]; if (v === undefined || v === null) { if (cur[k] !== undefined) patch[k] = del; } else if (!same(v, cur[k])) patch[k] = v; });
    if (patch.createdAt !== undefined) return restartWar(next, patch);
    if (Object.keys(patch).length) await gameRef().update(patch);
  }
  async function createGame(cfg) { // a new game, its invite code, and the host as its first member
    const uid = DS.user.uid, gid = randomId(20), code = randomId(12), gr = fs.collection("games").doc(gid), b = fs.batch(), doc = { war: 1, inviteCode: code, maxPlayers: 8, host: uid };
    CONFIG_KEYS.forEach(k => { if (cfg[k] !== undefined && cfg[k] !== null) doc[k] = cfg[k]; });
    b.set(gr, doc); b.set(fs.collection("invites").doc(code), { gameId: gid, createdAt: Date.now() }); b.set(gr.collection("members").doc(uid), { invite: code, at: Date.now() });
    b.set(fs.collection("users").doc(uid), { gameId: gid }, { merge: true });
    await b.commit();
    const g = G; g.game = doc; g.seat = uid; attach(g, gid); // the game goes on to register the host straight away
  }
  async function restartWar(next, patch) { // a new war in the same game: same invite link, same lords, a fresh start
    const g = G, b = fs.batch();
    b.update(gameRef(), Object.assign(patch, { war: curWar() + 1, lobby: true, lobbyEnds: fb.firestore.FieldValue.delete() }));
    Object.entries(g.pubs).forEach(([id, p]) => { if (!p.left && id !== meId()) b.update(gameRef().collection("players").doc(id), { fromWeek: "0000-00-00" }); });
    await b.commit();
  }

  // ---------- the API the game uses ----------
  const wrap = p => p.catch(e => { throw legacyErr(e); });
  function dbFacade(g) {
    const need = () => { if (G !== g || !DS.user) throw Object.assign(new Error("not connected"), { code: "unavailable" }); };
    const doc = path => {
      const [kind, id] = path.split("/");
      if (kind === "game") return { onSnapshot: ok => { g.cfgCbs.push(ok); if (g.started) ok(snapDoc(configView(g))); }, get: async () => snapDoc(configView(g)),
        set: c => wrap((async () => { need(); await writeConfig(c); })()), update: c => wrap((async () => { need(); await writeConfig(Object.assign({}, configView(g), c)); })()) };
      if (kind === "players") return { get: async () => snapDoc(playersView(g)[id]),
        set: d => wrap((async () => { need(); if (id === meId()) await writeMine(d); /* the host re-registering others for a new war is done in restartWar */ })()),
        update: d => wrap((async () => { need(); if (id !== meId()) throw Object.assign(new Error("not yours"), { code: "permission-denied" }); if (!g.pubs[id]) throw Object.assign(new Error("no player"), { code: "not-found" }); await writeMine(Object.assign({}, mineNow(), copy(d))); })()) };
      if (kind === "battles") return { get: async () => snapDoc(battlesView(g)[id]), set: async () => { throw Object.assign(new Error("battles are fought by the server"), { code: "permission_denied" }); } };
      throw new Error("unknown path " + path);
    };
    const collection = name => ({ onSnapshot: ok => { const list = name === "players" ? g.plCbs : g.btCbs; list.push(ok); if (g.started) ok(snapCol(name === "players" ? playersView(g) : battlesView(g))); } });
    return { doc, collection, serverBattles: true };
  }
  const userFacade = { id: async () => { if (!DS.user) return null; if (G && G.ready) await G.ready; return (G && G.seat) || DS.user.uid; }, /* waits until it is known which seat this account plays */ isOwner: async () => false, // set properly once the game has loaded
    profiles: async ids => Object.fromEntries(ids.map(id => { const p = (G && G.pubs && G.pubs[id]) || {}; return [id, { name: (typeof lordLabel === "function" && lordLabel(p)) || (DS.user && id === DS.user.uid && DS.user.displayName) || "A lord" }]; })) };
  const downloads = { save: async ({ filename, data }) => { // share sheet on phones, plain download elsewhere
    try { const f = new File([data], filename, { type: data.type }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; } } catch (e) { if (e && e.name === "AbortError") throw Object.assign(new Error("declined"), { code: "declined" }); }
    const a = document.createElement("a"); a.href = URL.createObjectURL(data); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); } };

  window.claude = { use: async kind => {
    if (kind === "downloads") return downloads; // saving a file needs no account
    if (!(await init())) return null;
    if (kind === "user") return userFacade;
    if (kind === "db") { if (!DS.user) return dbFacade(null); stopGame(); G = newG(null); const g = G; g.ready = startGame().catch(e => console.warn("Daily Siege: could not open the game", e)); return dbFacade(g); }
    return null;
  } };

  // ---------- invites and host tools ----------
  DS.inviteUrl = () => (G && G.game && G.game.inviteCode ? location.origin + "/join/" + G.game.inviteCode : location.origin + "/");
  DS.isHost = () => !!(G && G.game && DS.user && G.game.host === DS.user.uid);
  DS.removeLord = async seat => { // the host removes a lord: every account that plays that castle loses access and cannot rejoin
    if (!DS.isHost() || seat === meId()) return;
    try {
      const members = gameRef().collection("members"), banned = gameRef().collection("banned"), b = fs.batch(), accounts = new Set([seat]);
      (await members.where("seat", "==", seat).get()).forEach(d => accounts.add(d.id)); // a lord playing from a replacement account
      b.update(gameRef().collection("players").doc(seat), { left: true, kicked: true });
      accounts.forEach(uid => { b.delete(members.doc(uid)); b.set(banned.doc(uid), { at: Date.now(), why: "removed" }); });
      await b.commit(); say("Removed from the game.");
    } catch (e) { say("Couldn't remove them (" + (legacyErr(e).code || "error") + ")."); }
  };
  DS.newInvite = async () => { // replace the invite link, so an old link that got around stops working
    if (!DS.isHost()) return;
    const old = G.game.inviteCode, code = randomId(12), b = fs.batch();
    b.update(gameRef(), { inviteCode: code }); b.set(fs.collection("invites").doc(code), { gameId: G.id, createdAt: Date.now() }); if (old) b.delete(fs.collection("invites").doc(old));
    try { await b.commit(); say("New invite link made. The old one no longer works."); } catch (e) { say("Couldn't make a new link (" + (legacyErr(e).code || "error") + ")."); }
  };
  // ---------- buttons ----------
  DS.emailDraft = "";
  document.addEventListener("input", e => { if (e.target && e.target.id === "dsemail") DS.emailDraft = e.target.value; });
  if (typeof A === "object") Object.assign(A, {
    dsgoogle: () => { DS.signInGoogle(); },
    dsemail: () => { DS.signInEmail((document.getElementById("dsemail") || {}).value || DS.emailDraft); },
    dssignout: () => { DS.signOut(); },
    dskick: uid => { if (LIVE.kick !== uid) { LIVE.kick = uid; } else { LIVE.kick = null; DS.removeLord(uid); } if (typeof renderLobby === "function") renderLobby(); },
    dsnewinvite: () => { DS.newInvite(); },
    dsresolve: () => { DS.resolveNow(); },
    dsreassign: () => { const from = (document.getElementById("dsfrom") || {}).value, to = (document.getElementById("dsto") || {}).value; if (!from || !to) return; if (!LIVE.moveSeat) { LIVE.moveSeat = true; return; } LIVE.moveSeat = false; DS.reassignSeat(from, to); },
  });

  // ---------- asking the server ----------
  let fns = null;
  async function callServer(name, data) {
    if (!fns) { await loadScript("js/vendor/firebase/firebase-functions-compat.js"); fns = fb.app().functions(FUNCTIONS_REGION); if (DS.emulator) fns.useEmulator(location.hostname, 5001); }
    return (await fns.httpsCallable(name)(data)).data;
  }
  DS.resolveNow = async () => { // the host's recovery button: fight any battle that is due, now
    if (!DS.isHost() || DS.busy) return; DS.busy = "resolve"; say("Fighting the battle…");
    try { const r = await callServer("resolveNow", { gameId: G.id }); say(r.days && r.days.length ? "Done. Results are in." : "Nothing is due yet."); }
    catch (e) { say("Couldn't resolve: " + ((e && e.message) || "error")); }
    DS.busy = null; redraw();
  };
  DS.reassignSeat = async (fromUid, toUid) => {
    if (!DS.isHost()) return;
    try { await callServer("reassignSeat", { gameId: G.id, fromUid, toUid }); say("The castle has a new owner."); } catch (e) { say("Couldn't move the castle: " + ((e && e.message) || "error")); }
  };
  // a device that replays a battle differently from the official result tells the host, so it can be looked into
  DS.mismatches = [];
  DS.reportMismatch = (day, got, want) => {
    DS.mismatches.push({ day, got, want });
    try { gameRef().collection("reports").doc(day + "_" + DS.user.uid).set({ uid: DS.user.uid, day, got, want, device: navigator.userAgent.slice(0, 300), at: Date.now() }).catch(() => {}); } catch (e) {}
  };

  DS.leaveGame = async () => { stopGame(); try { await fs.collection("users").doc(DS.user.uid).set({ gameId: fb.firestore.FieldValue.delete() }, { merge: true }); } catch (e) {} onAuthChange(); };
})();
