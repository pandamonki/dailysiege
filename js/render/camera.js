// Camera: zoom, pan, fly-to, resize

// ----- camera -----
function minZoom() { return Math.min(vw / W, vh / W); }
function clampCam() {
  cam.z = Math.max(minZoom(), Math.min(2.4, cam.z));
  const m = ts * .5, ww = vw / cam.z, wh = vh / cam.z;
  cam.x = ww >= W ? (W - ww) / 2 : Math.max(-m, Math.min(W - ww + m, cam.x));
  cam.y = wh >= W ? (W - wh) / 2 : Math.max(-m, Math.min(W - wh + m, cam.y));
}
function zoomAt(sx, sy, z) { const wx = cam.x + sx / cam.z, wy = cam.y + sy / cam.z; cam.z = z; clampCam(); cam.x = wx - sx / cam.z; cam.y = wy - sy / cam.z; clampCam(); }
function flyTo(wx, wy, z) {
  const zz = Math.max(minZoom(), Math.min(2.4, z));
  const tgt = { x: wx - vw / 2 / zz, y: wy - vh / 2 / zz, z: zz };
  if (still) { Object.assign(cam, tgt); clampCam(); } else camTarget = tgt;
}
function zoneCentre() { let r = 0, q = 0; zoneSet.forEach(k => { const [a, b] = k.split(",").map(Number); r += a; q += b; }); const n = zoneSet.size || 1; return [(q / n + .5) * ts, (r / n + .5) * ts]; }
const home = () => { const [x, y] = zoneCentre(); flyTo(x, y, .9); };
function resize(force) {
  if (!force && bg && cvs.clientWidth === vw && Math.abs(innerHeight - (resize.ih || 0)) < 2) return;
  resize.ih = innerHeight;
  vw = cvs.clientWidth; vh = Math.round(Math.max(280, Math.min(vw * 1.3, innerHeight * .64)));
  cvs.style.height = vh + "px";
  const nd = Math.min(window.devicePixelRatio || 1, 3);
  cvs.width = Math.round(vw * nd); cvs.height = Math.round(vh * nd);
  if (!bg || nd !== dpr) { dpr = nd; bg = paintBackground(); }
  clampCam();
}
