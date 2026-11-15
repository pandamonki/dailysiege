// Bot lords: seats the host fills with computer-played lords while registration is open.
//
// A bot is a public player profile with { bot: true }. It has no account, no private state and no saved orders;
// the game works its orders out each day (lordBotPlan in js/sim/bots.js), the same on the server and on every phone.
const { loadGame, SIM_FILES } = require("./game");

let game;
const g = () => game || (game = loadGame(SIM_FILES));
const isBot = p => !!(p && p.bot);
const seedOf = s => [...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0); // a different starting hero in each game

/**
 * Make the number of bots in a game `want`, within the seats people have not taken.
 * Only while registration is open. Adds bots with the next free names, colours and heroes; removes the newest first, or one named bot with `removeId`.
 * @returns {Promise<{ bots: number, humans: number, seats: number } | { removed: string }>}
 */
async function setBots(db, gameId, want, { now = Date.now(), removeId = null } = {}) {
  const gameRef = db.collection("games").doc(gameId), snap = await gameRef.get();
  if (!snap.exists) throw new Error("That game does not exist.");
  const cfg = snap.data();
  if (!cfg.lobby || (cfg.lobbyEnds && now >= cfg.lobbyEnds)) throw new Error("Bots can only be added or removed while registration is open.");
  if (removeId) { // take out one particular bot (the minus on its seat)
    const ref = gameRef.collection("players").doc(removeId), d = await ref.get();
    if (!d.exists || !isBot(d.data())) throw new Error("That seat is not a bot.");
    await ref.delete(); return { removed: removeId };
  }
  const { MAX_LORDS, SEAT_COLORS, CLASSES, BOT_LORD_NAMES, BOT_LORD_BANNERS } = Object.fromEntries(["MAX_LORDS", "SEAT_COLORS", "CLASSES", "BOT_LORD_NAMES", "BOT_LORD_BANNERS"].map(k => [k, g().get(k)]));
  const seats = Math.min(MAX_LORDS, cfg.maxPlayers || 8), pubs = await gameRef.collection("players").get();
  const live = pubs.docs.filter(d => !d.get("left")), humans = live.filter(d => !isBot(d.data()) && !d.get("pending")).length;
  const bots = live.filter(d => isBot(d.data())).sort((a, b) => (b.get("joinedAt") || 0) - (a.get("joinedAt") || 0) || (a.id < b.id ? -1 : 1)); // newest first
  const target = Math.max(0, Math.min(Math.floor(Number(want)) || 0, seats - humans));
  const batch = db.batch();
  if (target < bots.length) bots.slice(0, bots.length - target).forEach(d => batch.delete(d.ref));
  else if (target > bots.length) {
    const ids = new Set(pubs.docs.map(d => d.id)), names = new Set(live.map(d => d.get("nick"))), colours = new Set(live.map(d => (d.get("banner") || {}).c1).filter(Boolean)), heroes = Object.keys(CLASSES);
    const used = pubs.docs.filter(d => isBot(d.data())).length, taken = {};
    live.forEach(d => { const c = d.get("cls"); if (c) taken[c] = (taken[c] || 0) + 1; });
    for (let k = 0, n = 1; k < target - bots.length; k++) {
      while (ids.has("bot_" + n)) n++;
      const id = "bot_" + n, nick = BOT_LORD_NAMES.find(x => !names.has(x)) || "Bot " + n, c1 = SEAT_COLORS.find(c => !colours.has(c)) || null, i = used + k;
      ids.add(id); names.add(nick); if (c1) colours.add(c1);
      // the hero nobody in this game plays yet (ties broken by a rotation that differs per game), so bots show every class before any repeats
      const start = seedOf(gameId) + i * 3, cls = heroes.map((h, j) => [h, taken[h] || 0, (j - start % heroes.length + heroes.length) % heroes.length]).sort((a, b) => a[1] - b[1] || a[2] - b[2])[0][0];
      taken[cls] = (taken[cls] || 0) + 1;
      batch.set(gameRef.collection("players").doc(id), { bot: true, fromWeek: "0000-00-00", joinedAt: now + k, nick, real: "Bot", pending: false, cls, week: null, war: cfg.war || 1, banner: JSON.parse(JSON.stringify(Object.assign({}, BOT_LORD_BANNERS[i % BOT_LORD_BANNERS.length], { c1 }))) });
    }
  }
  await batch.commit();
  return { bots: target, humans, seats };
}

module.exports = { setBots };
