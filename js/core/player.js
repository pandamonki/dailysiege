// Hero levels and skill points, army pieces, banner, carried alliances

const MAX_HERO_LVL = 21, ABIL_MAX = 4, ULT_MAX = 3, VIG_MAX = 6, VIG_PER = .02, ULT_AT = [5, 10, 15]; // 12 + 3 + 6 = 21 skill points, one per level
function rankMax(k) { return k === "ult" ? ULT_MAX : k === "a4" ? VIG_MAX : ABIL_MAX; }
function canRankAt(k, r, L) { r = r || 0; return k === "ult" ? r < ULT_MAX && L >= ULT_AT[r] : k === "a4" ? r < VIG_MAX : r < ABIL_MAX && L >= r * 2 + 1; }
function ext(arr, r) { const i = Math.max(0, (r || 1) - 1), n = arr.length; return i < n ? arr[i] : arr[n - 1] + (arr[n - 1] - arr[n - 2]) * (i - n + 1); } // rank 4 carries on the trend of ranks 1-3
function vigMul(r) { return 1 + VIG_PER * (r || 0); }
const isPassive = k => k === "a4" || PASSIVE[S.cls] === k;
const cls = () => CLASSES[S.cls];
const level = () => Math.min(MAX_HERO_LVL, S && S.lvl != null ? S.lvl : DAY);
const spent = () => S.ranks.a1 + S.ranks.a2 + S.ranks.a3 + S.ranks.ult + (S.ranks.a4 || 0);
const freePts = () => Math.max(0, level() - spent());
const opUsed = () => S.rules.length;
const inZone = (r, c) => zoneSet.has(`${r},${c}`);
const placedAt = ref => Object.keys(S.place).find(k => S.place[k] === ref);
const upgradeCost = u => Math.round(UNITS[u.type].cost * 0.6 * u.lvl);
const unitStats = u => { const b = UNITS[u.type], m = 1 + 0.15 * (u.lvl - 1); return { hp: Math.round(b.hp * m), atk: Math.round(b.atk * m) }; };
const pieces = () => ["champ", ...S.owned.map(u => u.id), ...(S.walls || []).map(w => w.id), ...S.traps.map(t => t.id)];
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
function myPieces() {
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
function pactPlan() { // what I've decided about each carried alliance: keep, break at the start, or betray later
  const breaks = [], pbetray = {};
  carriedPartners().forEach(id => { const a = (S.pactAct || {})[id]; if (a === "break") breaks.push(id); else if (a === "betray") pbetray[id] = (S.pactWhen || {})[id] || BETRAY_WHEN[0]; });
  return { breaks, pbetray };
}
