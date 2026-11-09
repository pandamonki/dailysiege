// Clock in the game's time zone

// ----- clock in the game's time zone -----
function tzNow(tz, ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(ms ? new Date(ms) : new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, h: +p.hour % 24, m: +p.minute };
}
const addDays = (key, n) => { const d = new Date(key + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dayDiff = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 864e5);
function firstBattleDate(c) { // the date of Day 1's battle once registration closes; late closes push it a day so nobody is rushed
  const now = tzNow(c.tz, c.lobbyEnds), lock = c.lockHour; let pd = now.h >= lock ? addDays(now.date, 1) : now.date, mins = lock * 60 - (now.h * 60 + now.m);
  if (mins > 0 && mins < 180) pd = addDays(pd, 1); return pd; }
function startOf(c) { if (!c) return null; if (c.startDate) return c.startDate; if (c.lobby && c.lobbyEnds && Date.now() >= c.lobbyEnds) return firstBattleDate(c); return null; }
const lobbyOpen = c => !!(c && c.lobby && !startOf(c));
const inLobby = () => gameMode === "friends" && lobbyOpen(LIVE.config) && !!LIVE.uid && !!LIVE.players[LIVE.uid];
const weekdayOf = key => { const a = typeof LIVE !== "undefined" && startOf(LIVE.config); if (a) return ((dayDiff(key, a) % 7) + 7) % 7 + 1; return ((new Date(key + "T00:00:00Z").getUTCDay() + 6) % 7) + 1; };
function planDayNow(tz, lock) { const now = tzNow(tz); return now.h >= lock ? addDays(now.date, 1) : now.date; }
function liveClock() {
  const cfg = LIVE.config, now = tzNow(cfg.tz), lock = cfg.lockHour;
  let planDay = now.h >= lock ? addDays(now.date, 1) : now.date, mins = lock * 60 - (now.h * 60 + now.m); if (mins <= 0) mins += 1440;
  const sd = startOf(cfg); if (sd && planDay < sd) { mins += 1440 * (dayDiff(sd, planDay)); planDay = sd; }
  const dayNo = weekdayOf(planDay), week = addDays(planDay, -(dayNo - 1));
  return { planDay, dayNo, week, minsToLock: mins };
}
const hourLabel = h => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
