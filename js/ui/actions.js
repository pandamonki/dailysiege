// Button actions and document-level event handlers

// ================= actions =================
let idc = Date.now();
const A = {
  open: (v, k) => open(v, k),
  close: () => close(),
  battle: () => { if (isLive()) return; startBattle(); },
  testmenu: () => { sheet = { type: "title", tab: "test" }; },
  testgo: () => { if (gameMode !== "practice") setMode("practice"); sheet = null; render(); },
  testnext: () => { if (gameMode !== "practice") setMode("practice"); A.nextday(); sheet = null; render(); },
  playgo: () => { if (LIVE.db && LIVE.uid && LIVE.players && LIVE.players[LIVE.uid] && LIVE.config) { if (gameMode !== "friends") setMode("friends"); if (isLive() || inLobby()) { sheet = null; render(); return; } } open("game"); },
  copyinvite: () => { const u = GAME_URL(); const fb = () => toast("Copy this link: " + u); try { navigator.clipboard.writeText(u).then(() => toast("Invite link copied."), fb); } catch (e) { fb(); } },
  mode: v => { setMode(v); sheet = null; },
  startgame: () => { const h = +(document.getElementById("lockhour") || {}).value || 20, n = +(document.getElementById("lobbyclose") || {}).value || 0; createGame(h, n); },
  lobbyhero: () => { showHeroPick(() => { save(); renderLobby(); }); },
  lobbyban: () => { sheet = { type: "castle", tab: "banner", lobby: true }; },
  lobbydone: () => { if (S.ob === 3) S.ob = 0; sheet = null; renderLobby(); },
  lobbysave: () => { const c = document.getElementById("lobbyclose").value, h = +document.getElementById("lobbyhour").value, patch = { lockHour: h }, seats = +(document.getElementById("lobbyseats") || {}).value; if (c !== "") patch.lobbyEnds = +c ? Date.now() + +c * 36e5 : null; if (seats >= 2 && seats <= MAX_LORDS) patch.maxPlayers = seats; saveConfig(patch); },
  lobbybegin: () => { if (!LIVE.beginConfirm) { LIVE.beginConfirm = true; renderLobby(); return; } LIVE.beginConfirm = false; saveConfig({ lobbyEnds: Date.now() }, "Registration is locked in."); },
  restartgame: () => { if (!sheet.rconfirm) { sheet.rconfirm = true; return; } restartGame(); },
  joingame: () => { joinGame(); },
  pwainstall: () => { if (PWA.hasPrompt()) { PWA.install(); return; } open("install"); },
  savename: () => { saveName(); return false; },
  register: () => { registerMe(); },
  lobbyedit: () => { LIVE.lobbyEdit = true; renderLobby(); document.getElementById("lobby")?.scrollTo({ top: 0 }); },
  lobbyback: () => { LIVE.lobbyEdit = false; delete NAME_DRAFT.mynick; delete NAME_DRAFT.myreal; renderLobby(); },
  cfgsave: () => saveConfig({ lockHour: +document.getElementById("cfghour").value }),
  cfgtz: () => saveConfig({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }),
  watchday: v => { watchLiveBattle(v); },
  lab: () => { if (!isLive()) open("lab"); },
  types: () => { if (isLive()) return; open("lab"); sheet.tab = "types"; },
  labrun: v => { runLab(+v); },
  labcopy: () => { const txt = labCSV(), box = document.getElementById("csvbox");
    const fallback = () => { box.hidden = false; box.value = txt; box.select(); toast("Selected. Copy it from the box."); };
    try { navigator.clipboard.writeText(txt).then(() => toast("Telemetry copied."), fallback); } catch (e) { fallback(); } },
  rplay: () => { if (replay.time >= replay.res.duration) replay.time = 0; replay.playing = !replay.playing; },
  rauto: () => { replay.auto = !replay.auto; replay.camMode = null; },
  rspeed: () => { replay.speed = replay.speed >= 4 ? 1 : replay.speed * 2; },
  rrestart: () => { replay.time = 0; replay.playing = true; replay.done = false; sheet = null; },
  rreport: () => open("results"),
  reel: () => startReel(false),
  reelrec: () => startReel(true),
  reelskip: () => { const r = replay && replay.reel; if (!r) return; if (r.phase === "outro") stopReel(!r.rec); else nextClip(r); },
  reelstop: () => stopReel(true),
  rjump: v => { replay.time = +v; replay.playing = true; replay.done = false; sheet = null; },
  unselect: () => { if (replay) { replay.sel = null; replay.tip = null; } },
  dtip: v => { if (replay) replay.tip = replay.tip === v ? null : v; else ptip = ptip === v ? null : v; },
  pexp: () => { pexp = !pexp; ptip = null; },
  rexit: () => leaveBattle(),
  gear: k => { const nx = GEAR[k][S.gear[k]]; if (nx && avail() >= nx.cost && ctNow() >= UPGRADE_NEEDS[k][S.gear[k]]) { S.gold -= nx.cost; S.gear[k]++; toast(`${nx.name} forged.`); } },
  defend: k => { const nx = DEFENCES[k][S.defences[k]]; if (nx && avail() >= nx.cost && ctNow() >= UPGRADE_NEEDS[k][S.defences[k]]) { S.gold -= nx.cost; S.defences[k]++; toast(`${nx.name} built.`); } },
  zin: () => { if (replay) replay.auto = false; camTarget = null; zoomAt(vw / 2, vh / 2, cam.z * 1.35); },
  zout: () => { if (replay) replay.auto = false; camTarget = null; zoomAt(vw / 2, vh / 2, cam.z / 1.35); },
  zall: () => flyTo(W / 2, W / 2, 0),
  zhome: () => home(),
  cancel: () => { sel = null; },
  opencastle: v => { S.phase = "muster"; sel = null; sheet = { type: "castle", tab: v, grp: v === "recruit" ? "army" : "base" }; if (v === "armoury") sheet.tab = "keep"; },
  openhero: () => { S.phase = "muster"; sel = null; open("champ", "champ"); },
  openorders: v => { S.phase = "orders"; sel = null; ensureDip(); sheet = { type: "orders", grp: v === "alli" ? "alli" : "ord" }; },
  wizard: () => { const at = wizStartStep(); sheet = null; render(); setTimeout(() => startWizard(true, at), 100); },
  ulti: () => { S.phase = "orders"; ensureDip(); sheet = { type: "orders", tab: "rituals", grp: "ord" }; },
  upick: v => { sheet.pick = v; },
  csel: v => { sheet.csel = v; }, tsel: v => { sheet.tsel = v; }, dsel: v => { sheet.dsel = v; }, ish: v => { sheet.ish = v; sheet.ipg = null; }, ipg: v => { sheet.ipg = +v; },
  ultarm: () => { S.ultArm = !S.ultArm; },
  bless: v => { S.bless = v || null; },
  ctab: v => { sheet.tab = v; sheet.keep = false; },
  pick: v => { sel = sel === v ? null : v; },
  move: v => { psel = null; pexp = false; if (inGarrison(v)) { if (fieldCount() >= S.slots) { toast("Your field supply is full."); return; } unGarrison(v); } sel = v; sheet = null; toast("Tap a glowing tile."); },
  usell: id => { const u = findUnit(id); if (!u) return; S.sells = (S.sells || 0) + 1; const k = placedAt(id); if (k) delete S.place[k]; unGarrison(id); S.owned = S.owned.filter(x => x.id !== id); S.gold += unitSellPrice(u); if (!sheet || sheet.type !== "castle") sheet = null; toast(`${UNITS[u.type].name} sold for ${unitSellPrice(u)}g.`); },
  bench: v => { const k = placedAt(v); if (k) delete S.place[k]; if (!sheet || sheet.type !== "castle") sheet = null; },
  deploy: (v, k) => { { const cu = findUnit(v); if (cu && cu.cool > 0) { toast(`${UNITS[cu.type].name} is recharging for ${cu.cool} more day${cu.cool > 1 ? "s" : ""}.`); return; } }
    { const [r0, c0] = k.split(",").map(Number), wl0 = findWall(v); if (wl0 && !wallFree(r0, c0, wl0.dir, v)) { toast("That tile isn't free."); return; } }
    if (inGarrison(v)) { if (fieldCount() >= S.slots) { toast("Your field supply is full."); return; } unGarrison(v); }
    const old = placedAt(v); if (old) delete S.place[old]; S.place[k] = v; sheet = null; },
  cls: v => { if (v === S.cls) return; if (isLive() && DAY > 1) { toast("Your class is set for the week. Pick again next week."); return; } S.cls = v; S.ranks = { a1: 0, a2: 0, a3: 0, ult: 0 }; S.tree = emptyTree(); S.picks = {}; toast(`${CLASSES[v].name} chosen. Skill points refunded.`); },
  rank: (_, k) => { if (canRank(k)) S.ranks[k] = (S.ranks[k] || 0) + 1; },
  choose: (v, k) => { S.picks[k] = v; },
  buy: k => { const u = UNITS[k]; if (u.castleOnly && S.owned.filter(x => UNITS[x.type].castleOnly).length >= SIEGE_MAX) { toast(`You can only keep ${SIEGE_MAX} siege units.`); return; } if (avail() < u.cost || supplyFull() || ctNow() < UNIT_TIER[k]) return; ensureGarrison(); const toGar = fieldCount() >= S.slots && !u.castleOnly; if (toGar && garrisonCount() >= GARRISON_SOLDIERS) { toast("Siege units can't wait in the garrison, and your field supply is full."); return; } S.gold -= u.cost; const id = "u" + idc++; S.owned.push({ id, type: k, lvl: 1, hp: 1 }); if (toGar) { toGarrison(id); sel = null; toast(`${u.name} recruited into your garrison.`); } else { sel = id; sheet = null; toast(`${u.name} recruited. Tap a glowing tile.`); } },
  up: id => { const u = findUnit(id), c = upgradeCost(u); if (u.lvl < 3 && avail() >= c && ctNow() >= UNIT_LVL_TIER[u.lvl]) { S.gold -= c; u.lvl++; } },
  slot: () => { const c = slotCost(S.slots); if (avail() >= c && S.slots < SLOT_MAX) { S.gold -= c; S.slots++; } },
  trap: k => { const t = TRAPS[k]; if (avail() < t.cost) return; S.gold -= t.cost; const id = "t" + idc++; S.traps.push({ id, type: k }); sel = id; sheet = null; toast(`${t.name} bought. Tap a glowing tile.`); },
  shop: () => { open("castle"); sheet.tab = "shop"; },
  gdone: () => { if (S.ob === 1) { S.ob = 2; sheet = null; showHeroPick(() => { A.obnext(); render(); }); } else sheet = null; },
  obnext: () => { if (inLobby()) { S.ob = 0; sheet = null; save(); renderLobby(); render(false); const l = document.getElementById("lobby"); if (l) { l.scrollTo({ top: 0 }); }
      toast("Now set your name, army colour and coat of arms, then tap Register."); return; }
    S.ob = 3; open("castle"); sheet.tab = "banner"; },
  obdone: () => { S.ob = 0; sheet = null; if (inLobby()) { save(); renderLobby(); toast("You are registered. The war begins when registration closes."); return; } toast("Your army awaits. Recruit at the castle and place your soldiers."); home(); setTimeout(() => startWizard(false), 400); },
  pvstart: () => { startPreview(); },
  pvexit: () => { endPreview(); },
  pvbegin: () => { if (!PREVIEW || !inLobby()) return; saveConfig({ lobbyEnds: Date.now() }, "Registration is locked in."); },
  newgame: () => { if (!sheet.confirm) { sheet.confirm = true; return; }
    if (gameMode === "friends" && S && S.week) LIVE_S = S;
    try { localStorage.setItem("lastbanner.pday", "1"); localStorage.setItem("lastbanner.mode", "practice"); } catch (e) {}
    gameMode = "practice"; PRACTICE_S = newPlayerState(); LASTP = null; PRAC_BET = []; reportBack = null; mode = "plan"; replay = null; sel = null;
    enterPractice(); home(); sheet = null; render(); setTimeout(() => startWizard(true), 300); toast("A new game begins on day 1."); },
  nextday: () => { if (isLive()) return; if (DAY >= 7) { toast("Day 7 is the last day. Start a new game to begin again."); return; }
    const inc = baseIncome(DAY) + CASTLE_INCOME[ctNow() - 1] + ((LASTP && LASTP.gold && LASTP.gold.you) || 0);
    if (LASTP) { if ((LASTP.ults || []).includes("you")) S.ultLast = DAY; if (LASTP.blessed) S.blessDone = DAY; } S.ultArm = false; S.gold += inc; S.gain = inc; if (LASTP && LASTP.mercs) { ensureDip(); S.mercHist[DAY] = LASTP.mercs; Object.values(LASTP.mercs).forEach(h => { if (h.pid === "you") S.gold -= h.gold; }); } S.bids = {}; { const g = LASTP && LASTP.gain && LASTP.gain.you != null ? LASTP.gain.you : MIN_GAIN; S.lvl = Math.min(MAX_HERO_LVL, (S.lvl || DAY) + Math.max(MIN_GAIN, g)); S.xp = (LASTP && LASTP.xp && LASTP.xp.you) || 0; } DAY++; S.locked = false; S.phase = "muster"; S.offers = Object.fromEntries(Object.entries(S.offers || {}).filter(([, o]) => o.day === DAY - 1)); S.replies = {}; S.owned.forEach(u => { u.hp = 1; });
    S.owned.forEach(u => { if (UNITS[u.type].cool) { if (placedAt(u.id)) { u.cool = UNITS[u.type].cool; delete S.place[placedAt(u.id)]; } else u.cool = Math.max(0, (u.cool || 0) - 1); } });
    { const used = new Set((LASTP && LASTP.trapsUsed) || []); S.traps = S.traps.filter(t => { const k = placedAt(t.id); if (k && used.has("you|" + k)) { delete S.place[k]; return false; } return true; }); } LASTP = null;
    try { localStorage.setItem("lastbanner.pday", String(DAY)); } catch (e) {}
    toast(`Day ${DAY}. +${inc} gold.`); sheet = null; },
  castleup: () => { const nx = CASTLE_TIERS[ctNow()]; if (nx && avail() >= nx.cost) { S.gold -= nx.cost; S.castle = ctNow() + 1; toast(`${nx.name} raised. Daily income is now ${baseIncome(curDayNo()) + CASTLE_INCOME[ctNow() - 1]} gold.`); } },
  spinpick: k => { const sp = S.spin; if (!sp || !sp.offer.includes(k)) return; if (S.items.length >= ITEM_SLOTS) { sheet.pend = k; return; } S.items.push(k); toast(`${ITEMS[k].name} added to your hero.`); endSpin(); },
  spinrep: j => { const sp = S.spin, k = sheet && sheet.pend; if (!sp || !k || !S.items.includes(j)) return; S.items = S.items.filter(x => x !== j); S.gold += Math.floor(itemCost(j) / 2); S.items.push(k); toast(`${ITEMS[k].name} replaces ${ITEMS[j].name}.`); endSpin(); },
  spinno: () => { if (sheet) sheet.pend = null; },
  spingold: () => { if (!S.spin || S.items.length < ITEM_SLOTS) return; S.gold += SPIN_GOLD; toast(`+${SPIN_GOLD} gold.`); endSpin(); },
  wallbuy: () => { if (S.walls.length >= wallLimit(ctNow()) || avail() < WALL_COST) return; S.gold -= WALL_COST; const id = "w" + idc++; S.walls.push({ id, dir: "h" }); sel = id; sheet = null; toast("Wall built. Tap a glowing tile to place it. Tap it afterwards to turn it."); },
  wrot: id => { const w = findWall(id), k = placedAt(id), nd = w.dir === "h" ? "v" : "h"; if (k) { const [r, c] = k.split(",").map(Number); if (!wallFree(r, c, nd, id)) { toast("It doesn't fit that way round."); return; } } w.dir = nd; },
  wsell: id => { const k = placedAt(id); if (k) delete S.place[k]; S.walls = S.walls.filter(w => w.id !== id); S.gold += Math.floor(WALL_COST / 2); sheet = null; },
  shellat: v => { if (!S.locked) S.shellAt = Math.max(1, Math.min(10, (S.shellAt || 2) + +v)); },
  ibuy: k => { const it = ITEMS[k]; if (!it || S.items.includes(k) || S.items.length >= ITEM_SLOTS || avail() < itemCost(k) || (it.unique && rapierTaken(k))) return; S.gold -= itemCost(k); S.items.push(k); toast(`${it.name} bought.`); },
  isell: k => { const it = ITEMS[k]; if (!it) return; S.items = S.items.filter(x => x !== k); S.gold += Math.floor(itemCost(k) / 2); },
  bset: (v, k) => { if (!canBanner()) { toast("Banners are designed on Day 1."); return; }
    if (v === "c1") {
      if (gameMode !== "friends") { if (takenColours()[k]) { toast("That colour belongs to " + takenColours()[k] + "."); return; } S.banner = { ...(S.banner || defaultBanner()), c1: k === YOU_COLOR ? null : k }; return; }
      if (!inLobby()) { toast("Team colours are fixed once the war begins."); return; }
      const who = takenColours()[k]; if (who) { toast(`${TEAM_COLOR_NAMES[k] || "That colour"} is taken by ${who}.`); return; }
      S.banner = { ...(S.banner || defaultBanner()), c1: k }; MY_COLOR = k; save(); renderLobby(); return; }
    S.banner = { ...(S.banner || defaultBanner()), [v]: k === "seat" ? null : k }; },
  pact: (v, k) => { ensureDip(); S.pactAct[k] = v; if (v === "betray") S.pactWhen[k] = S.pactWhen[k] || BETRAY_WHEN[0]; },
  gpage: v => { sheet.pg = (sheet.pg || 0) + (+v); },
  rep: () => { reportBack = isLive() ? latestBattleKey() : (LASTP ? "practice" : null); open("report", reportBack || undefined); },
  rwatch: v => { reportBack = v; if (v === "practice") startBattle(); else watchLiveBattle(v, "play"); },
  rreelm: v => { reportBack = v; if (v === "practice") { startBattle(); startReel(false); } else watchLiveBattle(v, "reel"); },
  rsb: () => { sheet.sb = !sheet.sb; }, rday: v => { sheet.id = v; sheet.insp = null; }, rinsp: v => { sheet.insp = v; }, rinspx: () => { sheet.insp = null; },
  rclose: () => { reportBack = null; sheet = null; },
  stance: v => { S.stance = v; },
  formation: () => { S.formation = S.formation === false; },
  heading: v => { S.strategy.heading = v; },
  gtoggle: (_, k) => { sheet.gopen = sheet.gopen === k ? null : k; },
  engage: v => { if (!S.locked) S.engage = cleanEngage(S.engage + +v); },
  heropick: () => { showHeroPick(null); },
  invite: (_, k) => { ensureDip(); if (S.offers[k]) return; if (carriedPartners().includes(k)) { toast("You are already allied."); return; }
    if (Object.keys(S.offers).length >= MAX_INVITES) { toast("Only 2 invitations can be open at once."); return; }
    S.offers[k] = { gold: 0, day: planDayKey() }; if (sheet && sheet.type === "orders") sheet.tab = "alliances"; toast("Invitation drafted. Set a dowry if you like."); },
  uninvite: (_, k) => { const o = S.offers[k]; if (o && o.day === planDayKey()) delete S.offers[k]; },
  ireply: (v, k) => { ensureDip(); S.replies[k] = v; if (!isLive()) { if (v === "reject") S.declined[k] = true; else delete S.declined[k]; }
    toast(v === "accept" ? "Accepted. You ally at the start of tonight's battle." : "Declined."); if (sheet && sheet.type === "invites" && !pendingInvites().length) sheet = null; },
  idismiss: () => { sheet = null; },
  opencamp: () => { sel = null; sheet = { type: "camp" }; },
  mbid: (v, k) => { ensureDip(); const m = MERCS[k]; if (!m || mercWait(k)) return; const b = S.bids[k] && S.bids[k].day === planDayKey() ? S.bids[k].gold : 0, step = 10;
    const next = +v > 0 ? (b ? b + step : m.min) : (b - step < m.min ? 0 : b - step);
    if (next - b > avail()) { toast("Not enough gold."); return; }
    if (next) S.bids[k] = { gold: next, day: planDayKey() }; else delete S.bids[k]; },
  mclear: (_, k) => { ensureDip(); delete S.bids[k]; },
  topen: (_, k) => { S.terms[k].mode = S.terms[k].mode === "refuse" ? "accept" : "refuse"; },
  tbet: (_, k) => { S.terms[k].mode = S.terms[k].mode === "betray" ? "accept" : "betray"; },
  pup: v => { const i = +v; [S.prio[i - 1], S.prio[i]] = [S.prio[i], S.prio[i - 1]]; },
  pdown: v => { const i = +v; [S.prio[i + 1], S.prio[i]] = [S.prio[i], S.prio[i + 1]]; },
  radd: () => { if (opUsed() < OP_MAX) S.rules.push({ if: IFS[1], then: THENS[1] }); },
  rdel: v => { S.rules.splice(+v, 1); },
  abil: v => { sheet.ab = v; },
  tnode: v => { sheet.tn = v; },
  tlearn: v => { const [bi, i] = v.split(".").map(Number); TREE_NAME_CLS = S.cls; if (!S.locked && treeCanLearn(S.tree, TREE_BKEY[bi], i, level())) { S.tree[TREE_BKEY[bi]][i]++; sheet.tn = v; } },
  gsel: v => { sheet.gear = v; },
  rvopen: v => { sheet.rv = sheet.rv === v ? null : v; },
  rvset: (v, k) => { ensureDip(); if (v === "hostile" && S.lists.hostile.includes(k)) { S.lists.hostile = [k, ...S.lists.hostile.filter(x => x !== k)]; toast("Main target set."); return; } A.lmove(v, k); },
  phase: v => { S.phase = v; sel = null; sheet = null; if (v === "orders") { ensureDip(); open("orders"); } },
  lmove: (v, k) => { ensureDip(); ["hostile", "neutral"].forEach(l => { S.lists[l] = S.lists[l].filter(x => x !== k); }); S.lists[v === "hostile" ? "hostile" : "neutral"].push(k); },
  lup: (_, k) => { const L = S.lists.hostile, i = L.indexOf(k); if (i > 0) [L[i - 1], L[i]] = [L[i], L[i - 1]]; },
  ldown: (_, k) => { const L = S.lists.hostile, i = L.indexOf(k); if (i > -1 && i < L.length - 1) [L[i + 1], L[i]] = [L[i], L[i + 1]]; },
  preset: v => { ensureDip(); const pick = RIVALS.filter(r => sideOf(r) === v).sort((a, b) => Math.hypot(a.pos[0] - CASTLE[0], a.pos[1] - CASTLE[1]) - Math.hypot(b.pos[0] - CASTLE[0], b.pos[1] - CASTLE[1]))[0];
    if (!pick) return; S.lists.neutral = S.lists.neutral.filter(x => x !== pick.id);
    S.lists.hostile = [pick.id, ...S.lists.hostile.filter(x => x !== pick.id)]; toast(`Main attack: ${pick.name}.`); },
  term: (v, k) => { S.terms[k].mode = v; },
  tmin: (v, k) => { S.terms[k].min = stepGold(S.terms[k].min, +v); },
  ogold: (v, k) => { const o = S.offers[k]; if (!o || o.day !== planDayKey()) { toast("Already sent. The dowry is locked."); return; } const next = stepGold(o.gold, +v); if (next - o.gold > avail()) { toast("Not enough free gold."); return; } o.gold = next; },
  uorder: (v, k) => { if (v === "army") delete S.uorders[k]; else S.uorders[k] = v; sheet = null; },
  seal: () => { S.locked = true; sel = null; if (isLive()) { const snap = mySnapshot(); delete snap.sealedPlan; S.sealedSnap = JSON.parse(JSON.stringify(snap)); } }, // a copy of what was sealed: it stays in effect while new orders are drafted, until they are sealed
  unseal: () => { S.locked = false; },
  copy: () => { const txt = planJSON(); try { navigator.clipboard.writeText(txt).then(() => toast("Plan copied."), selectPlan); } catch (e) { selectPlan(); } },
  reset: () => { if (isLive()) return; S = freshState(); ensureDip(); sel = null; sheet = null; toast("Back to the example setup."); },
};
function selectPlan() { const el = document.getElementById("plan"); if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Plan selected. Copy it from here."); }

document.addEventListener("click", e => {
  if (e.target.id === "veil") { close(); return; }
  const b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT" || b.disabled) return;
  const f = A[b.dataset.act]; if (!f) return;
  const before = sheet; f(b.dataset.v, b.dataset.k);
  render(sheet === before && b.dataset.act !== "ctab");
});
document.addEventListener("change", e => {
  const cb = e.target.closest("input[type=checkbox][data-act]"); if (cb) { const f = A[cb.dataset.act]; if (f && !S.locked) { f(cb.dataset.v, cb.dataset.k); render(); } return; }
  const s = e.target.closest("select[data-act]"); if (!s) return;
  const { act, v, k } = s.dataset;
  if (act === "trig") S.triggers[k] = s.value;
  if (act === "rif") S.rules[+v].if = s.value;
  if (act === "rthen") S.rules[+v].then = s.value;
  if (act === "twhen") S.terms[k].when = s.value;
  if (act === "pwhen") { ensureDip(); S.pactWhen[k] = s.value; }
  if (act === "tmode") S.terms[k].mode = s.value;
  if (act === "tmodeset") S.strategy.mode = s.value;
  if (act === "prioset") S.prio[+v] = s.value;
  if (act === "gprioset" && !S.locked) { const l = S.gprio[k].slice(); l[+v] = s.value; S.gprio[k] = cleanGprio({ ...S.gprio, [k]: l.filter(Boolean) })[k]; }
  if (act === "pactset") { ensureDip(); S.pactAct[k] = s.value; if (s.value === "betray") S.pactWhen[k] = S.pactWhen[k] || BETRAY_WHEN[0]; }
  if (act === "tmin") S.terms[k].min = +s.value;
  render();
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && sheet) close(); });
// drag the grip on an attack-list row to reorder lords
document.addEventListener("pointerdown", e => {
  const g = e.target.closest(".grip"); if (!g || S.locked) return; const li = g.closest("li.tgt"), ol = li && li.parentNode; if (!ol) return;
  e.preventDefault(); li.classList.add("drag");
  const move = ev => { for (const o of [...ol.children].filter(x => x !== li)) { const r = o.getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { if (li.nextSibling !== o) ol.insertBefore(li, o); return; } } ol.appendChild(li); };
  const up = () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up); S.lists.hostile = [...ol.children].map(x => x.dataset.k).filter(Boolean); render(); };
  document.addEventListener("pointermove", move); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
});
document.addEventListener("input", e => { if (e.target.id === "rscrub" && replay) { replay.time = +e.target.value; updateReplayUI(); } });
