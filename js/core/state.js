// The player's saved state: defaults, loading, migration, saving

// ================= state =================
const weekdayNow = () => ((new Date().getDay() + 6) % 7) + 1;
function practiceDay() { try { const v = +localStorage.getItem("lastbanner.pday"); if (v >= 1 && v <= 7) return v; } catch (e) {} return weekdayNow(); }
let DAY = practiceDay();
const STORE = "lastbanner.v4";
function freshState() {
  return {
    gold: 420, cls: "mage",
    ranks: { a1: 1, a2: 1, a3: 0, ult: 0 }, picks: {},
    triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[3], ult: TRIGGERS[0] },
    owned: [{ id: "u1", type: "footman", lvl: 2, hp: .6 }, { id: "u2", type: "bowman", lvl: 1, hp: 1 }],
    slots: SLOT_START, traps: [],
    place: defaultPlace(["u1", "u2"]),
    stance: "opportunist", prio: PRIORITIES.slice(), rules: [{ if: IFS[0], then: THENS[0] }, { if: IFS[1], then: THENS[0] }],
    diplo: Object.fromEntries(RIVALS.map(r => [r.id, { rel: r.id === "p1" ? "ally" : "neutral", betray: "Never", clues: [] }])),
    locked: false,
    gear: { weapon: 1, armour: 0, charm: 0 }, defences: { walls: 0, tower: 0 },
    castle: 1, items: [], walls: [], banner: defaultBanner(), pairs: [], pactAct: {}, pactWhen: {}, xp: 0,
  };
}
function newPlayerState() {
  return { gold: 300, cls: "warrior", ranks: { a1: 0, a2: 0, a3: 0, ult: 0 }, picks: {}, triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
    owned: [], slots: SLOT_START, traps: [], place: defaultPlace([]), stance: "skirmish", prio: PRIORITIES.slice(), rules: [{ if: IFS[0], then: THENS[0] }, { if: IFS[1], then: THENS[0] }],
    diplo: {}, locked: false, phase: "muster", gear: { weapon: 0, armour: 0, charm: 0 }, defences: { walls: 0, tower: 0 },
    castle: 1, items: [], walls: [], banner: defaultBanner(), pairs: [], pactAct: {}, pactWhen: {}, xp: 0, lvl: 1, gain: 0, ob: 1 };
}
function defaultPlace(ids) {
  const sp = armySpots(CASTLE, N), out = { [sp.champ.join(",")]: "champ" };
  ids.forEach((id, i) => { if (sp.units[i]) out[sp.units[i].join(",")] = id; });
  return out;
}
let S;
const OLDTXT = { "My champion's HP < 30%": "My hero's HP < 30%", "Retreat champion to castle": "Retreat hero to castle", "Enemy champions": "Enemy heroes" };
function migrateS(s) { if (!s) return; if (s.prio && s.prio.length > 5) s.prio = s.prio.slice(0, 5); const m = x => OLDTXT[x] || x; (s.rules || []).forEach(r => { r.if = m(r.if); r.then = m(r.then); }); if (s.prio) s.prio = s.prio.map(m); }
let sel = null, sheet = null;
// drop placements that fall outside the current deployment field (the map changes size with the player count)
function sanitizePlace() {
  Object.keys(S.place || {}).forEach(k => { if (!zoneSet.has(k)) delete S.place[k]; });
  (S.walls || []).forEach(w => { const k = Object.keys(S.place).find(x => S.place[x] === w.id); if (k) { const [r, c] = k.split(",").map(Number); if (!wallTiles(r, c, w.dir).every(([a, b]) => zoneSet.has(`${a},${b}`))) delete S.place[k]; } });
  if (!Object.values(S.place).includes("champ")) { const sp = armySpots(CASTLE, N), k = sp.champ.join(","); if (zoneSet.has(k) && !S.place[k]) S.place[k] = "champ"; }
}
function save() { if (typeof inLobby === "function" && inLobby()) { queueSave(false); return; } if (typeof isLive === "function" && isLive()) { queueSave(false); return; } try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} }

// Called once from main.js, after every script has loaded
function initState() {
  try { S = JSON.parse(localStorage.getItem(STORE)) || freshState(); } catch (e) { S = freshState(); }
  migrateS(S);
  S.gear = S.gear || { weapon: 0, armour: 0, charm: 0 }; S.defences = S.defences || { walls: 0, tower: 0 };
  sanitizePlace(); ensureDip(); window.__stateReady = true;
}
