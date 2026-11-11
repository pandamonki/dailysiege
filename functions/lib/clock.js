// The server's side of the game clock: which day is being planned and the instants orders lock.
// Uses the game's own js/net/clock.js for every date rule, so the phones and the server agree.
const { loadGame, CLOCK_FILES } = require("./game");

let game;
const g = () => game || (game = loadGame(CLOCK_FILES));

// The date of Day 1's battle, or null while registration has no closing time.
// (The phones wait until the closing time has passed; the server can work the date out ahead of time.)
function startDate(cfg) {
  if (!cfg) return null;
  if (cfg.startDate) return cfg.startDate;
  if (cfg.lobby && cfg.lobbyEnds) return g().get("firstBattleDate")(cfg);
  return null;
}

/**
 * The clock fields for a game, given its settings and the fields it has now.
 * Returns null when the war has no start yet (orders stay closed).
 *  - The day being planned never moves backwards within a war: only fighting a battle advances it.
 *  - Once registration has closed, the war's first day is written down (startDate) and stays put,
 *    so moving the battle time later on cannot shift which day of the war it is.
 * @param {object} cfg   the game's settings now
 * @param {object} [prev] { planDay, clockWar } as currently stored
 * @param {object} [o]    { now, before }: the time, and the settings before this change (if any)
 */
function clockFor(cfg, prev, { now = Date.now(), before = null } = {}) {
  const war = cfg.war || 1, sameWar = !!prev && prev.clockWar === war;
  let start = sameWar && cfg.startDate ? cfg.startDate : null, pinned = !!start;
  if (!start && cfg.lobby && cfg.lobbyEnds) {
    // work the first day out from the settings registration closed under, not from a battle time changed afterwards
    const basis = before && before.lobbyEnds === cfg.lobbyEnds && (before.war || 1) === war ? before : cfg;
    start = g().get("firstBattleDate")(basis); pinned = now >= cfg.lobbyEnds;
  }
  if (!start) return null;
  const { addDays, lockInstant } = { addDays: g().get("addDays"), lockInstant: g().get("lockInstant") };
  const keep = sameWar && prev.planDay && prev.planDay >= start;
  const planDay = keep ? prev.planDay : start, nextPlanDay = addDays(planDay, 1);
  return { planDay, nextPlanDay, nextLockAt: lockInstant(planDay, cfg.tz, cfg.lockHour), lockAfter: lockInstant(nextPlanDay, cfg.tz, cfg.lockHour), clockWar: war, ...(pinned ? { startDate: start } : {}) };
}

module.exports = { clockFor, startDate };
