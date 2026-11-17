// Map size, castle seats, deployment zones

let N = 17, CENTRE = 8, CASTLE = [15, 8], zoneSet = new Set();
const T = 48;
// map size and castle ring scale with the number of players
// (9 to 12 lords get larger fields, sized so every castle keeps about the same deployment room and distance from its neighbours as with 8)
function mapSizeFor(n) { return n <= 2 ? 11 : n <= 4 ? 13 : n <= 6 ? 15 : n <= 8 ? 17 : n <= 9 ? 19 : n <= 10 ? 21 : n <= 11 ? 23 : 25; }
function seatLayout(n) {
  const size = mapSizeFor(n), c = (size - 1) / 2, R = c - 1, castles = [];
  for (let i = 0; i < n; i++) { const a = Math.PI / 2 + 2 * Math.PI * i / n; castles.push([Math.round(c + R * dsin(a)), Math.round(c + R * dcos(a))]); }
  return { N: size, castles };
}
// Trees. One definition, used by the map drawing and by the battle rules (from TREES_V1_FROM the forest is solid), so what you see is what blocks you.
// The forest rim lies outside a smooth boundary at distance rim(angle) from the centre: it starts just behind the castles and bulges a little way in between each pair of bases.
// A small blockade of three trees stands between each pair too. Everything is turned once per base, so it is identical between every pair of bases, whatever the number of lords.
let TREES_V1_FROM = "2026-11-16"; const treesV1For = d => String(d) >= TREES_V1_FROM;
function treeGeom(n, size) {
  n = Math.max(2, n); const cc = size / 2, half = (size - 1) / 2, Rc = half - 1, sec = 2 * Math.PI / n, ref = Math.PI / 2;
  const rim = th => { const v = (1 - dcos(n * (th - ref))) / 2; return half + .7 - 1.4 * v * Math.sqrt(v); };
  // a blockade spans about 40% of the gap between neighbouring bases at its distance from the centre: three trees when lords are few, one when they are many, so a ring of them never closes off the middle
  const rho = Math.max(3.2, .55 * Rc), w = .4 * rho * sec, m = Math.max(1, Math.min(3, Math.round((w - 1.1) / .7) + 1)), sp = m > 1 ? Math.min(1, (w - 1.1) / (m - 1)) : 0, clumps = [];
  for (let i = 0; i < n; i++) { const am = ref + (i + .5) * sec, ux = dcos(am), uy = dsin(am); for (let k = 0; k < m; k++) { const o = (k - (m - 1) / 2) * sp; clumps.push({ x: cc + ux * rho - uy * o, y: cc + uy * rho + ux * o, r: .55, i, k }); } }
  return { n, cc, half, sec, ref, rim, clumps };
}
// a tile whose middle stands in the trees (a blockade or the forest rim): nothing can be placed there in planning
function treeTile(r, c, n, size) {
  const G = treeGeom(n, size), x = c + .5, y = r + .5;
  if (G.clumps.some(k => hyp(x - k.x, y - k.y) < k.r + .3)) return true;
  const dx = x - G.cc, dy = y - G.cc, rr = hyp(dx, dy); return rr > G.half - 1.5 && rr > G.rim(datan2(dy, dx)) - .2;
}
function zoneFor([r, c], size, all) {
  // the deployment field: a ring around the castle plus the old forward patch, shared fairly with neighbours, never the centre
  const ctr = (size - 1) / 2, dy = ctr - r, dx = ctr - c, L = Math.sqrt(dx * dx + dy * dy) || 1, zy = r + dy / L * 1.7, zx = c + dx / L * 1.7, z = new Set();
  for (let rr = 0; rr < size; rr++) for (let cc = 0; cc < size; cc++) {
    if (rr === r && cc === c) continue;
    if (!(hyp(rr - zy, cc - zx) <= 2.25 || hyp(rr - r, cc - c) <= 3.3)) continue;
    if (hyp(rr - ctr, cc - ctr) <= 1.3) continue;
    if (all) {
      const mine = hyp(rr - r, cc - c); let ok = true;
      for (const [or, oc] of all) { if (or === r && oc === c) continue; if (or === rr && oc === cc) { ok = false; break; } const dd = hyp(rr - or, cc - oc); if (dd < mine - 1e-9 || (Math.abs(dd - mine) <= 1e-9 && or * 100 + oc < r * 100 + c)) { ok = false; break; } }
      if (!ok) continue;
    }
    z.add(`${rr},${cc}`);
  }
  return z;
}
function armySpots([r, c], size) {
  const ctr = (size - 1) / 2, dy = ctr - r, dx = ctr - c, L = Math.sqrt(dx * dx + dy * dy) || 1, uy = dy / L, ux = dx / L, py = ux, px = -uy;
  const at = (f, sd) => [Math.round(r + uy * f + py * sd), Math.round(c + ux * f + px * sd)];
  return { champ: at(2.2, 0), units: [at(2.2, -1.1), at(2.2, 1.1), at(1.2, 0)] };
}

// ================= seat layout =================
let W = N * T, MID = (CENTRE + .5) * T, castleTiles = [], roadTiles = new Set(), occupied = new Set(), RARMY = [];
const UTYPES = Object.keys(UNITS).filter(k => !UNITS[k].engine && !UNITS[k].merc && !UNITS[k].tower); // rival lords draw their ordinary soldiers from these; siege engines are added on purpose (see lordBotPlan)
const ENGINES = Object.keys(UNITS).filter(k => UNITS[k].engine);
const seeArmies = () => DAY > 1;
let MY_NAME = "You";
const myName = () => MY_NAME; // day 1: only castles are known; later days show yesterday's armies
function applyLayout(size, myCastle, others) {
  N = size; CENTRE = (N - 1) / 2; CASTLE = myCastle; zoneSet = zoneFor(myCastle, N, [myCastle, ...others]); zoneSet.forEach(k => { const [a, b] = k.split(",").map(Number); if (treeTile(a, b, others.length + 1, N)) zoneSet.delete(k); }); // no placing soldiers in the trees
  W = N * T; MID = (CENTRE + .5) * T;
  castleTiles = [CASTLE, ...others];
  roadTiles = new Set();
  castleTiles.forEach(([r, c]) => { for (let i = 0; i <= 40; i++) { const t = i / 40; roadTiles.add(`${Math.round(r + (CENTRE - r) * t)},${Math.round(c + (CENTRE - c) * t)}`); } });
  occupied = new Set(RARMY.map(u => `${u.r},${u.c}`));
  if (window.__mapReady) { bg = null; resize(true); }
  if (window.__stateReady) sanitizePlace();
}
