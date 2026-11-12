// Hero levels and skill points, army pieces, banner, carried alliances

const MAX_HERO_LVL = 21, ABIL_MAX = 4, ULT_MAX = 3, VIG_MAX = 6, VIG_PER = .02, ULT_AT = [5, 10, 15]; // 12 + 3 + 6 = 21 skill points, one per level
function rankMax(k) { return k === "ult" ? ULT_MAX : k === "a4" ? VIG_MAX : ABIL_MAX; }
function canRankAt(k, r, L) { r = r || 0; return k === "ult" ? r < ULT_MAX && L >= ULT_AT[r] : k === "a4" ? r < VIG_MAX : r < ABIL_MAX && L >= r * 2 + 1; }
function ext(arr, r) { const i = Math.max(0, (r || 1) - 1), n = arr.length; return i < n ? arr[i] : arr[n - 1] + (arr[n - 1] - arr[n - 2]) * (i - n + 1); } // rank 4 carries on the trend of ranks 1-3
function vigMul(r) { return 1 + VIG_PER * (r || 0); }
const isPassive = k => k === "a4" || PASSIVE[S.cls] === k;
const cls = () => CLASSES[S.cls];
const level = () => Math.min(heroMaxLvl(heroV3Now()), S && S.lvl != null ? S.lvl : heroV3Now() ? 2 * DAY - 1 : DAY);
const spent = () => (heroV3Now() ? treeSpentAll(S.tree) : S.ranks.a1 + S.ranks.a2 + S.ranks.a3 + S.ranks.ult + (S.ranks.a4 || 0));
const freePts = () => (heroV3Now() ? treeFree(S.tree, level()) : Math.max(0, level() - spent()));
const ultLearned = () => (heroV3Now() ? treeHasUlt(S.tree) : (S.ranks.ult || 0) > 0); // has the hero learned an ultimate (old abilities or skill tree)
const opUsed = () => S.rules.length;
const inZone = (r, c) => zoneSet.has(`${r},${c}`);
const placedAt = ref => Object.keys(S.place).find(k => S.place[k] === ref);
const unitValue = u => { const c = UNITS[u.type].cost; let g = c; for (let l = 1; l < u.lvl; l++) g += Math.round(c * .5 * l); return g; };
const unitSellPrice = u => Math.floor(unitValue(u) * .25);
const upgradeCost = u => Math.round(UNITS[u.type].cost * 0.5 * u.lvl);
const unitStats = u => { const b = UNITS[u.type], m = 1 + UNIT_LVL_GAIN * (u.lvl - 1), g = (S && S.gear) || {}; return { hp: Math.round(b.hp * m * (1 + .15 * (g.armour || 0))), atk: Math.round(b.atk * m * (1 + .15 * (g.weapon || 0))) }; };
// the garrison: S.garrison = three waves { when, at, slots: [unit id | null, x3] }. A soldier is on the field (placed on the map) or in a wave, never both.
const garrisonIds = () => (S.garrison || []).flatMap(w => w.slots).filter(Boolean);
const inGarrison = id => garrisonIds().includes(id);
const fieldCount = () => S.owned.filter(u => !inGarrison(u.id)).length; // soldiers that go onto the map: limited by supply (beds)
const garrisonCount = () => garrisonIds().length;
const supplyFull = () => fieldCount() >= S.slots && garrisonCount() >= GARRISON_SOLDIERS;
function ensureGarrison() {
  const cw = cleanWaves(S.garrison), seen = new Set();
  S.garrison = cw.map((w, i) => { const old = (S.garrison && S.garrison[i] && S.garrison[i].slots) || [];
    return { when: w.when, at: w.at, order: w.order, slots: [...Array(WAVE_SLOTS)].map((_, j) => { const id = old[j], u = id && S.owned.find(x => x.id === id); if (!u || UNITS[u.type].castleOnly || seen.has(id)) return null; seen.add(id); return id; }) }; });
}
function unGarrison(id) { (S.garrison || []).forEach(w => w.slots.forEach((x, j) => { if (x === id) w.slots[j] = null; })); }
function toGarrison(id) { // first free slot, earliest wave first; the unit leaves the map
  for (const w of S.garrison) { const j = w.slots.indexOf(null); if (j > -1) { w.slots[j] = id; const k = placedAt(id); if (k) delete S.place[k]; return true; } } return false;
}
// put a soldier into a wave (slot optional: the first free one); false with a reason if it can't go
function assignWave(id, w, slot) {
  const u = findUnit(id), wv = S.garrison[w]; if (!u || !wv) return "No such soldier.";
  if (UNITS[u.type].castleOnly) return "Siege units can't wait in the garrison.";
  const j = slot != null ? slot : wv.slots.indexOf(null); if (j < 0 || j >= WAVE_SLOTS) return `Wave ${w + 1} is full.`;
  const old = wv.slots[j]; unGarrison(id); const k = placedAt(id); if (k) delete S.place[k];
  wv.slots[j] = id; if (old && old !== id) { /* the soldier it replaces goes back to reserve */ }
  return null;
}
// the first free tile of your field, nearest your army's usual spots first
function autoPlace(id) {
  const sp = armySpots(CASTLE, N), pref = sp.units.map(x => x.join(",")), dist = k => { const [r, c] = k.split(",").map(Number); return hyp(r - CASTLE[0], c - CASTLE[1]); };
  const free = k => zoneSet.has(k) && !S.place[k] && !wallRefAt(...k.split(",").map(Number));
  const k = pref.find(free) || [...zoneSet].filter(free).sort((x, y) => dist(x) - dist(y) || (x < y ? -1 : 1))[0];
  if (!k) return false; S.place[k] = id; return true;
}
// move a soldier onto the map / back to reserve; each returns a reason when it can't
function deployUnit(id) {
  const u = findUnit(id); if (!u) return "No such soldier."; if (u.cool > 0) return `${UNITS[u.type].name} is recharging for ${u.cool} more day${u.cool > 1 ? "s" : ""}.`;
  if (inGarrison(id) && fieldCount() >= S.slots) return "Your field supply is full.";
  if (!placedAt(id) && !autoPlace(id)) return "There is no free ground in your field.";
  unGarrison(id); return null;
}
function reserveUnit(id) {
  if (!findUnit(id)) return "No such soldier."; if (inGarrison(id) && fieldCount() >= S.slots) return "Your field supply is full.";
  unGarrison(id); const k = placedAt(id); if (k) delete S.place[k]; return null;
}
const garrisonPlan = () => (S.garrison || []).map(w => ({ when: w.when, at: w.at, order: w.order, units: w.slots.map(id => id && S.owned.find(u => u.id === id)).filter(Boolean).map(u => ({ type: u.type, lvl: u.lvl, id: u.id, hp: u.hp ?? 1 })) }));
const pieces = () => ["champ", ...S.owned.filter(u => !inGarrison(u.id)).map(u => u.id), ...(S.walls || []).map(w => w.id), ...S.traps.map(t => t.id)];
const unplaced = () => pieces().filter(p => !placedAt(p));
const findUnit = id => S.owned.find(u => u.id === id);
const findTrap = id => S.traps.find(t => t.id === id);
const findWall = id => (S.walls || []).find(w => w.id === id);
function pieceName(ref) {
  if (ref === "champ") return `${cls().name} (your hero)`;
  const u = findUnit(ref); if (u) return `${UNITS[u.type].name} Lv${u.lvl}`;
  if (findWall(ref)) return WALL_TIERS[Math.min(2, (S.castle || 1) - 1)].name + " (1 block)";
  const t = findTrap(ref); return t ? TRAPS[t.type].name : "";
}
function pieceImg(ref) {
  if (ref === "champ") return spriteURL("c-" + S.cls);
  const u = findUnit(ref); if (u) return spriteURL(u.type);
  if (findWall(ref)) return wallURL(S.castle || 1);
  const t = findTrap(ref); return t ? trapURL(t.type) : "";
}
function canRank(k) {
  if (freePts() < 1 || S.locked) return false;
  return canRankAt(k, S.ranks[k], level());
}

// ----- banner, walls, carried alliances -----
function defaultBanner() { return { pat: "solid", c1: null, c2: "#ecdcb4", em: "none" }; }
function dedupePlace(place) { // a piece can only stand on one tile; if an old tile survived a merged save, the later (newer) one wins
  const seen = new Set(); Object.keys(place || {}).reverse().forEach(k => { const ref = place[k]; if (seen.has(ref)) delete place[k]; else seen.add(ref); }); return place;
}
function myPieces() {
  dedupePlace(S.place);
  return Object.entries(S.place).map(([k, ref]) => {
    const [r, c] = k.split(",").map(Number);
    if (ref === "champ") return { kind: "champ", r, c, order: S.uorders.champ || "army" };
    const u = findUnit(ref); if (u) return { kind: "unit", id: u.id, type: u.type, lvl: u.lvl, hp: u.hp ?? 1, r, c, order: S.uorders[u.id] || "army" };
    const w = findWall(ref); if (w) return { kind: "wall", r, c, dir: w.dir };
    const tr = findTrap(ref); return tr ? { kind: "trap", type: tr.type, r, c } : null;
  }).filter(Boolean);
}
const finalToday = () => (typeof isLive === "function" && isLive() ? liveClock().dayNo : DAY) === 7;
function carriedPartners() { // players I was still allied with at the end of the last battle
  const live = isLive(), me = live ? LIVE.uid : "you", src = live ? carriedPairs(liveClock().planDay) : (S.pairs || []);
  return src.map(s => s.split("|")).filter(p => p.includes(me)).map(p => (p[0] === me ? p[1] : p[0])).filter(id => RIVALS.some(r => r.id === id));
}
function pactPlan() { // what I've decided about each carried alliance: keep, break at the start, or betray when the set condition is met
  const breaks = [], pbetray = {};
  carriedPartners().forEach(id => { const a = (S.pactAct || {})[id]; if (a === "break") breaks.push(id); else if (a === "betray") pbetray[id] = (S.pactWhen || {})[id] || BETRAY_WHEN[0]; });
  return { breaks, pbetray };
}
