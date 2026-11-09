// Friends game: team colours and the shared LIVE state

// ================= friends game (shared via the artifact's database) =================
const SEAT_COLORS = ["#2f5fa8", "#b8322a", "#3d7a35", "#7a3d8f", "#c9862f", "#d6559a", "#2d8a8a", "#d8d2c0"];
const TEAM_COLOR_NAMES = { "#2f5fa8": "Blue", "#b8322a": "Red", "#3d7a35": "Green", "#7a3d8f": "Purple", "#c9862f": "Orange", "#d6559a": "Pink", "#2d8a8a": "Teal", "#d8d2c0": "Bone" };
// Each lord's main banner colour is their team colour (castle, hero, soldiers). One lord per colour: the earlier sign-up keeps a contested colour.
function colourPool() { // [uid, player] in sign-up order for whoever is competing for colours right now
  const all = Object.entries(LIVE.players).filter(([uid, p]) => !p.left && (!p.pending || uid === LIVE.uid)).sort((a, b) => ((a[1].joinedAt || 0) - (b[1].joinedAt || 0)) || (a[0] < b[0] ? -1 : 1));
  if (inLobby() || !LIVE.config) return all.slice(0, 8);
  const ros = rosterFor(liveClock().week).map(p => p.uid); return ros.map(u => [u, LIVE.players[u]]);
}
function bannerOfUid(uid) { if (uid === LIVE.uid && S && gameMode === "friends" && S.banner) return S.banner; const p = LIVE.players[uid]; return (p && p.state && p.state.banner) || null; }
function teamColours() {
  const pool = colourPool(), out = {}, used = new Set(), later = [];
  pool.forEach(([uid]) => { const c = (bannerOfUid(uid) || {}).c1; if (c && SEAT_COLORS.includes(c) && !used.has(c)) { out[uid] = c; used.add(c); } else later.push(uid); });
  later.forEach(uid => { const c = SEAT_COLORS.find(x => !used.has(x)) || SEAT_COLORS[0]; out[uid] = c; used.add(c); });
  return out;
}
const teamColour = uid => teamColours()[uid] || SEAT_COLORS[0];
function takenColours() { // colour -> who holds it, for everyone except me
  if (gameMode !== "friends") return Object.fromEntries(BOTS.map(b => [b.color, b.name]));
  const tc = teamColours(), out = {}; Object.entries(tc).forEach(([uid, c]) => { if (uid !== LIVE.uid) out[c] = nameOf(uid); }); return out;
}
const LIVE = { db: null, user: null, uid: null, isOwner: false, config: null, configLoaded: false, players: {}, playersLoaded: false, battles: {}, names: {}, readOnly: false, stateLoaded: false };
let gameMode = "practice", PRACTICE_S = null, LIVE_S = null, saveTimer = null, saving = false, saveAgain = false;
try { if (localStorage.getItem("lastbanner.mode") === "friends") gameMode = "friends"; } catch (e) {}
