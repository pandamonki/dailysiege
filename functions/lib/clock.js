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
 * The day being planned never moves backwards within a war: only fighting a battle advances it.
 */
function clockFor(cfg, prev) {
  const start = startDate(cfg);
  if (!start) return null;
  const { addDays, lockInstant } = { addDays: g().get("addDays"), lockInstant: g().get("lockInstant") };
  const keep = prev && prev.planDay && prev.clockWar === (cfg.war || 1) && prev.planDay >= start;
  const planDay = keep ? prev.planDay : start, nextPlanDay = addDays(planDay, 1);
  return { planDay, nextPlanDay, nextLockAt: lockInstant(planDay, cfg.tz, cfg.lockHour), lockAfter: lockInstant(nextPlanDay, cfg.tz, cfg.lockHour), clockWar: cfg.war || 1 };
}

module.exports = { clockFor, startDate };
