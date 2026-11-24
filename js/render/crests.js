// Team crests: every alliance carries a shield cut into one slice per lord in that lord's colour, with a white animal head, an aged-gold rim
// and a ring to hang it from. It sits above allied castles and heroes in the replay and heads each alliance on the muster screen. When
// the alliance breaks, the crest cracks along the lines between lords and the pieces fall away.
const CREST_ANIMALS = ["wolf", "eagle", "lion", "bear", "stag", "boar"];
const crestMir = pts => pts.concat(pts.slice().reverse().map(([x, y]) => [24 - x, y])); // a head is drawn as one half and mirrored, so it is symmetrical
const crestPoly = pts => "M" + pts.map(p => p.join(" ")).join("L") + "Z";
const CREST_PATHS = {
  wolf: crestPoly(crestMir([[12, 6], [14.5, 6.5], [17, 2.5], [18.6, 8.5], [20.4, 12], [18.4, 15], [16, 20.5], [12, 22.5]])) + crestPoly([[7.2, 11], [10.8, 12.4], [8.3, 13.4]]) + crestPoly([[16.8, 11], [13.2, 12.4], [15.7, 13.4]]) + crestPoly([[10.6, 18], [13.4, 18], [12, 19.8]]),
  eagle: crestPoly(crestMir([[12, 3.5], [13.6, 5.6], [18, 3], [23, 5.5], [20, 9], [21.5, 14], [15.5, 12.5], [13.2, 20.5], [12, 22]])) + crestPoly([[10.4, 7.4], [13.6, 7.4], [12, 9.6]]),
  lion: (() => { const m = []; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 8.6 : 11; m.push([+(12 + r * Math.cos(a)).toFixed(2), +(12 + r * Math.sin(a)).toFixed(2)]); } return crestPoly(m); })() + crestPoly([[7.4, 10], [10.6, 11.2], [8, 12.6]]) + crestPoly([[16.6, 10], [13.4, 11.2], [16, 12.6]]) + crestPoly([[10.4, 15.4], [13.6, 15.4], [12, 17.6]]),
  bear: crestPoly(crestMir([[12, 6.5], [15, 7], [16.5, 4], [19.5, 4.5], [20.5, 8], [20.8, 13], [19, 18], [15, 21.5], [12, 21.8]])) + crestPoly([[8, 11], [10.4, 11.6], [8.6, 12.8]]) + crestPoly([[16, 11], [13.6, 11.6], [15.4, 12.8]]) + crestPoly([[10.2, 16.6], [13.8, 16.6], [12, 18.8]]),
  stag: "M12 22 7.5 16 8 11 12 9.5 16 11 16.5 16Z M8 11 4 8 3 3.5 M8 11 5.5 5 M8 11 9.5 4 M16 11 20 8 21 3.5 M16 11 18.5 5 M16 11 14.5 4",
  boar: crestPoly(crestMir([[12, 5.5], [14.5, 5.8], [17.5, 4], [19, 8.5], [20.5, 12.5], [20, 17], [16.5, 21], [12, 21.5]])) + crestPoly([[7.5, 11], [10.8, 12], [8.4, 13.2]]) + crestPoly([[16.5, 11], [13.2, 12], [15.6, 13.2]]) + crestPoly([[3.5, 16], [8, 18], [5.6, 20]]) + crestPoly([[20.5, 16], [16, 18], [18.4, 20]]) + crestPoly([[10.6, 17.4], [13.4, 17.4], [12, 19]]),
};
const CREST_SHIELD = "M-17 -20 H17 V3 C17 14 9 20 0 25 C-9 20 -17 14 -17 3 Z";
let CREST_UID = 0;
const crestWedge = (n, i) => { const pts = ["0 0"]; for (let s = 0; s <= 8; s++) { const a = -Math.PI / 2 + (i + s / 8) * 2 * Math.PI / n; pts.push((60 * Math.cos(a)).toFixed(1) + " " + (60 * Math.sin(a)).toFixed(1)); } return "M" + pts.join("L") + "Z"; };
// which animal an alliance carries: from its members, the same on every phone, and different from the other alliances in the battle
function crestAnimals(groups) {
  const used = new Set(), hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  groups.slice().sort((a, b) => (a.ids.slice().sort().join() < b.ids.slice().sort().join() ? -1 : 1)).forEach(g => { let k = hash(g.ids.slice().sort().join("|")) % CREST_ANIMALS.length, tries = 0; while (used.has(k) && tries++ < CREST_ANIMALS.length) k = (k + 1) % CREST_ANIMALS.length; used.add(k); g.animal = CREST_ANIMALS[k]; });
  return groups;
}
// the crest as an SVG string (inline in the muster screen, or as an image on the map). only: a single slice, for the pieces of a breaking crest.
function crestSVG(cols, animal, px, only, inline) {
  const id = "cr" + (++CREST_UID), n = cols.length, cut = only != null && n > 1, k = 20 / 24, st = animal === "stag";
  const slices = cols.map((c, i) => `<path d="${n === 1 ? "M-60 -60H60V60H-60Z" : crestWedge(n, i)}" fill="${c}" clip-path="url(#${id}s)"/>`).join("");
  return `<svg ${inline ? 'class="crest" ' : ""}xmlns="http://www.w3.org/2000/svg" width="${px}" height="${Math.round(px * 1.2)}" viewBox="-22 -29 44 56"${inline ? ' aria-hidden="true"' : ""}>
    <defs><clipPath id="${id}s"><path d="${CREST_SHIELD}"/></clipPath>${cut ? `<clipPath id="${id}w"><path d="${crestWedge(n, only)}"/></clipPath>` : ""}
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1e2a8"/><stop offset=".45" stop-color="#9b7a30"/><stop offset=".7" stop-color="#e6d391"/><stop offset="1" stop-color="#6b5424"/></linearGradient></defs>
    <g${cut ? ` clip-path="url(#${id}w)"` : ""}><circle cx="0" cy="-25" r="3.1" fill="none" stroke="url(#${id}g)" stroke-width="1.6"/>
    <path d="${CREST_SHIELD}" fill="#1e140c"/>${slices}
    <path d="${CREST_SHIELD}" fill="none" stroke="url(#${id}g)" stroke-width="3.2" stroke-linejoin="round"/><path d="${CREST_SHIELD}" fill="none" stroke="rgba(30,20,8,.55)" stroke-width=".7" transform="scale(.84)"/>
    <circle cy="1" r="12" fill="rgba(18,10,4,.42)"/><g transform="translate(${-12 * k} ${-12 * k + 1}) scale(${k})" fill="${st ? "none" : "#fff"}" fill-rule="evenodd" stroke="${st ? "#fff" : "#1e140c"}" stroke-width="${st ? 1.8 : .5}" stroke-linejoin="round" stroke-linecap="round"><path d="${CREST_PATHS[animal] || CREST_PATHS.wolf}"/></g></g></svg>`;
}
// map drawing: the SVG becomes an image once and is reused
const CREST_IMGS = new Map();
function crestImage(cols, animal, only) {
  const key = cols.join("") + animal + (only == null ? "" : "#" + only); let img = CREST_IMGS.get(key);
  if (!img) { img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(crestSVG(cols, animal, 96, only, false)); CREST_IMGS.set(key, img); }
  return img.complete && img.naturalWidth ? img : null;
}
// a whole crest centred on (cx, cy), w wide
function drawCrest(c, cols, animal, cx, cy, w) { const img = crestImage(cols, animal); if (!img) return; c.drawImage(img, cx - w / 2, cy - w * .6, w, w * 1.2); }
// the crest breaking: age seconds since the betrayal. Cracks run along the lines between lords, it shudders, then each slice falls away.
const CREST_BREAK_SECS = 1.7;
function drawCrestBreak(c, cols, animal, cx, cy, w, age) {
  const n = cols.length; if (age < 0 || age > CREST_BREAK_SECS) return; const h = w * 1.2, u = w / 44, k = Math.min(1, Math.max(0, (age - .3) / (CREST_BREAK_SECS - .3)));
  for (let i = 0; i < n; i++) { const img = crestImage(cols, animal, i); if (!img) continue; const a = -Math.PI / 2 + (i + .5) * 2 * Math.PI / n, e = k * k;
    c.save(); c.globalAlpha = 1 - Math.max(0, (k - .55) / .45); c.translate(cx + Math.cos(a) * w * .55 * e + (age < .3 ? Math.sin(age * 90) * w * .015 : 0), cy + Math.sin(a) * w * .3 * e + h * 1.1 * e); c.rotate((Math.cos(a) >= 0 ? 1 : -1) * (.4 + i * .15) * e);
    c.drawImage(img, -w / 2, -h / 2, w, h); c.restore(); }
  if (age < .75) { c.save(); c.globalAlpha = Math.min(1, age / .12) * Math.max(0, 1 - Math.max(0, age - .45) / .3); c.strokeStyle = "#fff4d6"; c.lineWidth = Math.max(1, w * .035); c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n, ux = Math.cos(a), uy = Math.sin(a); c.moveTo(cx, cy + u); for (let s = 1; s <= 6; s++) { const j = (s % 2 ? 1.6 : -1.6) * (s < 6 ? 1 : 0); c.lineTo(cx + (ux * s * 4 - uy * j) * u, cy + (1 + uy * s * 4 + ux * j) * u); } }
    c.stroke(); c.restore(); }
}
