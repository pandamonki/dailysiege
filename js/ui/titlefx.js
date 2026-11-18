// The title screen's living picture. title.jpg stays the picture; this draws it onto a canvas and animates parts of
// it on top: waving flags, rising smoke, flickering fires, glints on the armies' weapons and a light sweep across the
// title. The sky and the sun stay still. The new pixels are drawn on a
// quarter-size layer and scaled up without smoothing, so they keep the picture's chunky pixel look.
// Players who ask their device for reduced motion keep the still image.
// title-mask.png holds two masks for the title's box (TX, TY): the letters with their outline on top (unused for now),
// and only their gold faces underneath, which the light sweep is cut to.
const TitleFX = (() => {
  const W = 768, H = 1376, PX = 4, LW = W / PX, LH = H / PX, TX = 130, TY = 145, TW = 525, TH = 320, FPS = 24;
  // [pole x, top, right end, bottom, sway in px, waves a second, phase]
  const FLAGS = [[383, 572, 466, 620, 3, .4, 0], [213, 582, 248, 606, 2, .55, 1], [552, 582, 590, 605, 2, .5, 2.2], [59, 669, 96, 695, 2, .6, 3.1],
    [706, 672, 747, 696, 2, .45, 4], [91, 810, 137, 839, 2, .525, 5.2], [684, 812, 728, 839, 2, .475, .6], [436, 938, 526, 1008, 4, .35, 1.7],
    [582, 607, 594, 625, 1, .65, 2.7], [522, 615, 534, 628, 1, .6, .3], [643, 859, 657, 873, 1, .7, 3.8]];
  const FIRES = [[61, 732], [93, 725], [135, 866], [246, 626]], SMOKE = [[94, 716, .9], [136, 856, 1.1], [246, 620, .8], [60, 726, .5]];
  const ARMIES = [[227, 668, 300, 717], [461, 660, 544, 717], [100, 747, 240, 793], [544, 750, 660, 793], [150, 807, 303, 900], [434, 800, 617, 900]];
  let cv, ctx, lo, lx, sh, sx, img, mask, raf = 0, host = null, ready = false, t = 0, last = 0, acc = 0;
  let smoke = [], embers = [], glints = [], spots = [], flames = [], flameT = -1;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const still = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  function disc(c, x, y, r) { x = Math.round(x); y = Math.round(y); r = Math.max(0, Math.round(r)); for (let d = -r; d <= r; d++) { const w = Math.round(Math.sqrt(r * r - d * d)); c.fillRect(x - w, y + d, 2 * w + 1, 1); } }
  function init() {
    cv = document.createElement("canvas"); cv.width = W; cv.height = H; cv.className = "splash-fx"; cv.setAttribute("aria-hidden", "true");
    ctx = cv.getContext("2d");
    lo = document.createElement("canvas"); lo.width = LW; lo.height = LH; lx = lo.getContext("2d");
    sh = document.createElement("canvas"); sh.width = TW; sh.height = TH; sx = sh.getContext("2d");
    let n = 2; const go = () => { if (--n === 0) prep(); };
    img = new Image(); img.onload = go; img.src = "title.jpg";
    mask = new Image(); mask.onload = go; mask.src = "title-mask.png";
  }
  function prep() { // find the light pixels (blades, helmets) in the armies, for glints
    try { const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      for (const [x0, y0, x1, y1] of ARMIES) { const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
        for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b);
          if (mx > 170 && mx - Math.min(r, gg, b) < 60) { const p = i / 4; spots.push([x0 + p % (x1 - x0), y0 + (p / (x1 - x0) | 0)]); } } } } catch (e) {}
    ready = true; tick(performance.now());
  }
  function step(dt) {
    for (const [x, y, rate] of SMOKE) if (Math.random() < dt * 2.2 * rate) smoke.push({ x: x / PX + rnd(-1, 1), y: y / PX, a: 0, life: rnd(3.5, 6), r: rnd(.8, 1.6), w: rnd(0, 6) });
    for (const s of smoke) { s.a += dt; s.y -= dt * 2.6; s.x += dt * (.9 + Math.sin(s.a * 1.3 + s.w) * .6); }
    smoke = smoke.filter(s => s.a < s.life);
    for (const [x, y] of FIRES) if (Math.random() < dt) embers.push({ x: x / PX + rnd(-1.5, 1.5), y: y / PX, a: 0, life: rnd(2.4, 4.8), v: rnd(1, 2) });
    for (const e of embers) { e.a += dt; e.y -= e.v * dt; e.x += Math.sin(e.a * 2 + e.v) * dt * .7; }
    embers = embers.filter(e => e.a < e.life);
    if (spots.length && Math.random() < dt * 4) { const [x, y] = spots[Math.random() * spots.length | 0]; glints.push({ x, y, a: 0 }); }
    for (const g of glints) g.a += dt; glints = glints.filter(g => g.a < .45);
  }
  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    // flags: each column of the cloth slides up and down, more the further it is from the pole
    for (const [x0, y0, x1, y1, amp, f, ph] of FLAGS) { const h = y1 - y0;
      for (let x = x0; x < x1; x++) { const k = (x - x0) / (x1 - x0), dy = Math.round(amp * k * Math.sin(t * f * 6.283 - k * 4.7 + ph));
        if (dy) ctx.drawImage(img, x, y0 - dy, 1, h, x, y0, 1, h); } }
    // a light sweep across the gold letters every few seconds. It starts and ends fully off the letters and fades in
    // and out, so it never pops on or off.
    const sw = (t % 7) / 2.4;
    if (sw < 1) { sx.globalCompositeOperation = "source-over"; sx.clearRect(0, 0, TW, TH);
      const cx = -80 + sw * (TW + 240); sx.fillStyle = "rgb(255,246,205)";
      for (let y = 0; y < TH; y += PX) { const off = y * .45; sx.fillRect(Math.round((cx - off) / PX) * PX, y, 36, PX); sx.fillRect(Math.round((cx - off + 52) / PX) * PX, y, 12, PX); }
      sx.globalCompositeOperation = "destination-in"; sx.drawImage(mask, 0, TH, TW, TH, 0, 0, TW, TH);
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .3 * Math.sin(sw * Math.PI); ctx.drawImage(sh, TX, TY); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    // smoke, fire and embers on the small layer
    lx.clearRect(0, 0, LW, LH);
    for (const s of smoke) { const k = s.a / s.life; lx.fillStyle = `rgba(${78 - k * 10 | 0},${66 - k * 6 | 0},${70 - k * 6 | 0},${(.55 * Math.min(1, s.a * 2) * (1 - k)).toFixed(3)})`; disc(lx, s.x, s.y, s.r + k * 3.2); }
    const ft = t * 8 | 0; // the flames change shape 8 times a second
    if (ft !== flameT) { flameT = ft; flames = FIRES.flatMap(([x, y]) => [0, 1, 2, 3].map(i => [Math.round(x / PX + rnd(-1.4, 1.4)), Math.round(y / PX - (Math.random() * 3 | 0)), ["#ffd75a", "#ff9a2e", "#ff6a1c", "#e2401a"][(i + (ft >> 1)) % 4]])); }
    for (const [x, y, c] of flames) { lx.fillStyle = c; lx.fillRect(x, y, 1, 1); }
    for (const e of embers) { lx.fillStyle = `rgba(255,${150 + (e.a * 60 | 0)},60,${(1 - e.a / e.life).toFixed(3)})`; lx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1); }
    ctx.drawImage(lo, 0, 0, W, H);
    // glints: a tiny white cross that flashes and fades
    for (const g of glints) { const a = Math.sin(g.a / .45 * Math.PI); ctx.fillStyle = `rgba(255,255,240,${a.toFixed(3)})`;
      ctx.fillRect(g.x - 1, g.y - 1, 3, 3); if (a > .6) { ctx.fillRect(g.x - 4, g.y, 9, 1); ctx.fillRect(g.x, g.y - 4, 1, 9); } }
  }
  function tick(now) {
    raf = 0;
    if (!cv || !cv.isConnected || document.hidden || !ready) return;
    const dt = Math.min(.1, (now - (last || now)) / 1000); last = now; acc += dt;
    if (acc >= 1 / FPS - .002) { const d = Math.min(acc, .1); acc = 0; t += d; step(d); draw(); cv.classList.add("on"); }
    raf = requestAnimationFrame(tick);
  }
  function run() { if (!raf && ready && cv && cv.isConnected && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } }
  document.addEventListener("visibilitychange", run);
  // called after every redraw of the sheet: the title screen's picture box, or null when the title screen is not showing
  function mount(el) {
    host = el || null;
    if (!host || still()) { if (raf) cancelAnimationFrame(raf); raf = 0; if (cv && cv.parentNode) cv.remove(); return; }
    if (!cv) init();
    if (cv.parentNode !== host) host.appendChild(cv);
    run();
  }
  return { mount };
})();
