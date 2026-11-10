// Friends game: team colours and the shared LIVE state

// ================= friends game (shared via the artifact's database) =================
// Each lord's main banner colour is their team colour (castle, hero, soldiers). One lord per colour: the earlier sign-up keeps a contested colour.
function colourPool() { // [uid, player] in sign-up order for whoever is competing for colours right now
  const all = Object.entries(LIVE.players).filter(([uid, p]) => !p.left && (!p.pending || uid === LIVE.uid)).sort((a, b) => ((a[1].joinedAt || 0) - (b[1].joinedAt || 0)) || (a[0] < b[0] ? -1 : 1));
  if (inLobby() || !LIVE.config) return all.slice(0, seatCap());
  const ros = rosterFor(liveClock().week).map(p => p.uid); return ros.map(u => [u, LIVE.players[u]]);
}
function bannerOfUid(uid) { if (uid === LIVE.uid && S && gameMode === "friends" && S.banner) return S.banner; const p = LIVE.players[uid]; return (p && p.state && p.state.banner) || null; }
function teamColours() { return wTeamColours(colourPool(), uid => bannerOfUid(uid)); }
const teamColour = uid => teamColours()[uid] || SEAT_COLORS[0];
function takenColours() { // colour -> who holds it, for everyone except me
  if (gameMode !== "friends") return Object.fromEntries(BOTS.map(b => [b.color, b.name]));
  const tc = teamColours(), out = {}; Object.entries(tc).forEach(([uid, c]) => { if (uid !== LIVE.uid) out[c] = nameOf(uid); }); return out;
}
const LIVE = { db: null, user: null, uid: null, isOwner: false, config: null, configLoaded: false, players: {}, playersLoaded: false, battles: {}, names: {}, readOnly: false, stateLoaded: false };
let gameMode = "practice", PRACTICE_S = null, LIVE_S = null, saveTimer = null, saving = false, saveAgain = false;
try { if (localStorage.getItem("lastbanner.mode") === "friends") gameMode = "friends"; } catch (e) {}
