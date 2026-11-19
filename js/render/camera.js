// Camera: zoom, pan, fly-to, resize

// ----- camera -----
function minZoom() { return Math.min(vw / W, vh / W); }
const MAX_ZOOM = 3.4; // how close the camera can get
function clampView(c) { // keep a view (the camera, or where it is flying to) on the map
  if (!Number.isFinite(c.z)) c.z = 1; if (!Number.isFinite(c.x)) c.x = W / 2 - vw / 2 / c.z; if (!Number.isFinite(c.y)) c.y = W / 2 - vh / 2 / c.z; // never let a bad number stick to the camera
  c.z = Math.max(minZoom(), Math.min(MAX_ZOOM, c.z));
  const m = ts * .5, ww = vw / c.z, wh = vh / c.z;
  c.x = ww >= W ? (W - ww) / 2 : Math.max(-m, Math.min(W - ww + m, c.x));
  c.y = wh >= W ? (W - wh) / 2 : Math.max(-m, Math.min(W - wh + m, c.y));
  return c;
}
function clampCam() { clampView(cam); }
function zoomAt(sx, sy, z) { const wx = cam.x + sx / cam.z, wy = cam.y + sy / cam.z; cam.z = z; clampCam(); cam.x = wx - sx / cam.z; cam.y = wy - sy / cam.z; clampCam(); }
function flyTo(wx, wy, z) {
  if (!Number.isFinite(wx) || !Number.isFinite(wy)) return;
  const zz = Math.max(minZoom(), Math.min(MAX_ZOOM, z));
  const tgt = clampView({ x: wx - vw / 2 / zz, y: wy - vh / 2 / zz, z: zz }); // a target off the map could never be reached, and the camera would chase it for ever
  if (still) { Object.assign(cam, tgt); clampCam(); } else camTarget = tgt;
}
function zoneCentre() { let r = 0, q = 0; zoneSet.forEach(k => { const [a, b] = k.split(",").map(Number); r += a; q += b; }); const n = zoneSet.size || 1; return [(q / n + .5) * ts, (r / n + .5) * ts]; }
const home = () => { const [x, y] = zoneCentre(); flyTo(x, y, .9); };
function resize(force) {
  const rp = mode === "replay";
  if (!force && bg && cvs.clientWidth === vw && Math.abs(innerHeight - (resize.ih || 0)) < 2 && resize.rp === rp) return;
  resize.ih = innerHeight; resize.rp = rp;
  vw = cvs.clientWidth; vh = Math.round(Math.max(280, Math.min(rp ? vw * 1.3 : vw * 1.45, rp ? innerHeight - 450 : innerHeight * .585))); // a replay keeps room for the unit panel and the controls
  cvs.style.height = vh + "px";
  if (!rp) { // on a short screen the unit strip would run under the menu buttons: take the difference off the map
    const dock = document.getElementById("pdock"), nav = document.getElementById("commands");
    if (dock && nav && !dock.hidden && !nav.hidden) { const over = dock.getBoundingClientRect().bottom + 6 - nav.getBoundingClientRect().top; resize.shrunk = over > 0; if (over > 0) { vh = Math.max(190, vh - Math.ceil(over)); cvs.style.height = vh + "px"; } }
  }
  const nd = Math.min(window.devicePixelRatio || 1, 3);
  cvs.width = Math.round(vw * nd); cvs.height = Math.round(vh * nd);
  if (!bg || nd !== dpr) { dpr = nd; bg = paintBackground(); }
  clampCam();
}

// called after the planning strip is redrawn: if it now runs under the menu buttons (or did before), fit the map again
function fitMapToStrip() {
  const dock = document.getElementById("pdock"), nav = document.getElementById("commands"); if (!dock || !nav || dock.hidden || nav.hidden || mode === "replay") return;
  const over = dock.getBoundingClientRect().bottom + 6 - nav.getBoundingClientRect().top; if (over > 0 || resize.shrunk) resize(true);
}
