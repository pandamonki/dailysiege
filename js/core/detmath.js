// Deterministic maths for anything a battle depends on.
//
// Math.sin, Math.cos, Math.atan2 and Math.hypot are allowed to differ in the last digit between
// JavaScript engines (and do: Chrome and Node disagree, and iPhones use a third engine). In a battle
// one last-digit difference grows into a different fight, so the sim and the map layout use these
// instead. They use only + - * / and Math.sqrt, Math.round, Math.abs, which every engine must compute
// exactly, so the answer is identical everywhere. Accuracy is within a few units in the last place.
//
// Rule: nothing reachable from runBattle, seatLayout, zoneFor or the plan builders may call
// Math.sin/cos/tan/atan/atan2/exp/log/pow/hypot or use the ** operator. `npm test` enforces it.
// Drawing code is free to use Math.* as before.

const DM_PIO2_HI = 1.57079632673412561417e+00, DM_PIO2_LO = 6.07710050650619224932e-11, DM_2_PI = 6.36619772367581382433e-01;
// sine and cosine on [-pi/4, pi/4] (polynomials from FreeBSD msun / fdlibm)
function dmKSin(x) { const z = x * x, r = 8.33333333332248946124e-03 + z * (-1.98412698298579493134e-04 + z * (2.75573137070700676789e-06 + z * (-2.50507602534068634195e-08 + z * 1.58969099521155010221e-10))); return x + z * x * (-1.66666666666666324348e-01 + z * r); }
function dmKCos(x) { const z = x * x, r = z * (4.16666666666666019037e-02 + z * (-1.38888888888741095749e-03 + z * (2.48015872894767294178e-05 + z * (-2.75573143513906633035e-07 + z * (2.08757232129817482790e-09 + z * -1.13596475577881948265e-11))))); return 1 - (.5 * z - z * r); }
// x = k * pi/2 + r, with r in [-pi/4, pi/4]; returns [r, k mod 4]
function dmReduce(x) { const k = Math.round(x * DM_2_PI), r = (x - k * DM_PIO2_HI) - k * DM_PIO2_LO; return [r, ((k % 4) + 4) % 4]; }
function dsin(x) {
  if (!(Math.abs(x) < 1e9)) return x === x && Math.abs(x) !== Infinity ? dsin(x - Math.round(x / (2 * Math.PI)) * 2 * Math.PI) : NaN;
  const [r, q] = dmReduce(x);
  return q === 0 ? dmKSin(r) : q === 1 ? dmKCos(r) : q === 2 ? -dmKSin(r) : -dmKCos(r);
}
function dcos(x) {
  if (!(Math.abs(x) < 1e9)) return x === x && Math.abs(x) !== Infinity ? dcos(x - Math.round(x / (2 * Math.PI)) * 2 * Math.PI) : NaN;
  const [r, q] = dmReduce(x);
  return q === 0 ? dmKCos(r) : q === 1 ? -dmKSin(r) : q === 2 ? -dmKCos(r) : dmKSin(r);
}
const DM_ATAN_HI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const DM_ATAN_LO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const DM_AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01, 9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];
function datan(v) {
  if (v !== v) return NaN;
  const neg = v < 0; let x = Math.abs(v), id;
  if (x > 1e19) return neg ? -(DM_ATAN_HI[3] + DM_ATAN_LO[3]) : DM_ATAN_HI[3] + DM_ATAN_LO[3];
  if (x < .4375) id = -1;
  else if (x < 1.1875) { if (x < .6875) { id = 0; x = (2 * x - 1) / (2 + x); } else { id = 1; x = (x - 1) / (x + 1); } }
  else if (x < 2.4375) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); }
  else { id = 3; x = -1 / x; }
  const z = x * x, w = z * z, A = DM_AT;
  const s1 = z * (A[0] + w * (A[2] + w * (A[4] + w * (A[6] + w * (A[8] + w * A[10]))))), s2 = w * (A[1] + w * (A[3] + w * (A[5] + w * (A[7] + w * A[9]))));
  if (id < 0) { const r = x - x * (s1 + s2); return neg ? -r : r; }
  const r = DM_ATAN_HI[id] - ((x * (s1 + s2) - DM_ATAN_LO[id]) - x);
  return neg ? -r : r;
}
// angle of the point (x, y), in (-pi, pi], like Math.atan2(y, x)
function datan2(y, x) {
  if (x !== x || y !== y) return NaN;
  if (x === 0) return y > 0 ? Math.PI / 2 : y < 0 ? -Math.PI / 2 : 0;
  if (x > 0) return datan(y / x);
  return y >= 0 ? datan(y / x) + Math.PI : datan(y / x) - Math.PI;
}
// length of (x, y). Math.sqrt is exact by the standard; Math.hypot is not.
const dhypot = (x, y) => Math.sqrt(x * x + y * y);
