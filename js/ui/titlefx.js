// The title screen's living picture. title.jpg stays the picture; this draws it onto a canvas and animates parts of
// it on top: drifting clouds and birds (behind the title letters), waving flags, a breathing sun, rising smoke,
// flickering fires, glints on the armies' weapons and a light sweep across the title. The new pixels are drawn on a
// quarter-size layer and scaled up without smoothing, so they keep the picture's chunky pixel look.
// Players who ask their device for reduced motion keep the still image.
// title-mask.png holds two masks for the title's box (TX, TY): the letters with their outline on top, and only their
// gold faces underneath.
const TitleFX = (() => {
  const W = 768, H = 1376, PX = 4, LW = W / PX, LH = H / PX, SKY = 560, TX = 130, TY = 145, TW = 525, TH = 320, FPS = 24;
  // [pole x, top, right end, bottom, sway in px, waves a second, phase]
  const FLAGS = [[383, 572, 466, 620, 3, .8, 0], [213, 582, 248, 606, 2, 1.1, 1], [552, 582, 590, 605, 2, 1, 2.2], [59, 669, 96, 695, 2, 1.2, 3.1],
    [706, 672, 747, 696, 2, .9, 4], [91, 810, 137, 839, 2, 1.05, 5.2], [684, 812, 728, 839, 2, .95, .6], [436, 938, 526, 1008, 4, .7, 1.7],
    [582, 607, 594, 625, 1, 1.3, 2.7], [522, 615, 534, 628, 1, 1.2, .3], [643, 859, 657, 873, 1, 1.4, 3.8]];
  const FIRES = [[61, 732], [93, 725], [135, 866], [246, 626]], SMOKE = [[94, 716, .9], [136, 856, 1.1], [246, 620, .8], [60, 726, .5]];
  const ARMIES = [[227, 668, 300, 717], [461, 660, 544, 717], [100, 747, 240, 793], [544, 750, 660, 793], [150, 807, 303, 900], [434, 800, 617, 900]];
  let cv, ctx, lo, lx, sky, sx, img, mask, raf = 0, host = null, ready = false, t = 0, last = 0, acc = 0;
  let clouds = [], birds = [], smoke = [], embers = [], glints = [], spots = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const still = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  function disc(c, x, y, r) { x = Math.round(x); y = Math.round(y); r = Math.max(0, Math.round(r)); for (let d = -r; d <= r; d++) { const w = Math.round(Math.sqrt(r * r - d * d)); c.fillRect(x - w, y + d, 2 * w + 1, 1); } }
  function cloud(x) { // a long thin streak like the picture's own sunset clouds: a few stacked bars, widest in the middle, in quarter-size pixels
    const y = rnd(6, 122), n = 2 + (Math.random() * 3 | 0), len = rnd(14, 34), bars = [];
    for (let i = 0; i < n; i++) { const w = Math.round(len * (1 - Math.abs(i - (n - 1) / 2) / n) * rnd(.7, 1)); bars.push([Math.round(rnd(-3, 3) + (len - w) / 2), i, w]); }
    return { x: x != null ? x : -len - 4, y, v: rnd(.8, 1.8) * (1.4 - y / 140), bars, len, k: y / 135 };
  }
  function init() {
    cv = document.createElement("canvas"); cv.width = W; cv.height = H; cv.className = "splash-fx"; cv.setAttribute("aria-hidden", "true");
    ctx = cv.getContext("2d");
    lo = document.createElement("canvas"); lo.width = LW; lo.height = LH; lx = lo.getContext("2d");
    sky = document.createElement("canvas"); sky.width = W; sky.height = SKY; sx = sky.getContext("2d");
    for (let i = 0; i < 9; i++) clouds.push(cloud(rnd(-20, LW + 10)));
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
    for (const c of clouds) c.x += c.v * dt;
    clouds = clouds.filter(c => c.x < LW + 4); while (clouds.length < 9) clouds.push(cloud());
    if (birds.length < 2 && Math.random() < dt / 9) { const l = Math.random() < .5; birds.push({ x: l ? -4 : LW + 4, y: rnd(10, 70), v: (l ? 1 : -1) * rnd(5, 8), p: rnd(0, 6), n: 1 + (Math.random() * 3 | 0) }); }
    for (const b of birds) { b.x += b.v * dt; b.y += Math.sin(t * .7 + b.p) * dt; }
    birds = birds.filter(b => b.x > -10 && b.x < LW + 10);
    for (const [x, y, rate] of SMOKE) if (Math.random() < dt * 2.2 * rate) smoke.push({ x: x / PX + rnd(-1, 1), y: y / PX, a: 0, life: rnd(3.5, 6), r: rnd(.8, 1.6), w: rnd(0, 6) });
    for (const s of smoke) { s.a += dt; s.y -= dt * 2.6; s.x += dt * (.9 + Math.sin(s.a * 1.3 + s.w) * .6); }
    smoke = smoke.filter(s => s.a < s.life);
    for (const [x, y] of FIRES) if (Math.random() < dt * 3) embers.push({ x: x / PX + rnd(-1.5, 1.5), y: y / PX, a: 0, life: rnd(.8, 1.6), v: rnd(3, 6) });
    for (const e of embers) { e.a += dt; e.y -= e.v * dt; e.x += Math.sin(e.a * 6 + e.v) * dt * 2; }
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
    // the sun breathes
    const sun = .10 + .06 * Math.sin(t * .8), gr = ctx.createRadialGradient(408, 612, 6, 408, 612, 170);
    gr.addColorStop(0, `rgba(255,214,120,${sun * 1.6})`); gr.addColorStop(.35, `rgba(255,170,80,${sun})`); gr.addColorStop(1, "rgba(255,150,70,0)");
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gr; ctx.fillRect(238, 442, 340, 340); ctx.globalCompositeOperation = "source-over";
    // the sky: clouds and birds on the small layer, scaled up, with the title letters cut out so they pass behind them
    lx.clearRect(0, 0, LW, LH);
    for (const c of clouds) { const k = Math.min(1, Math.max(0, c.k)), mix = (a, b) => Math.round(a + (b - a) * k), x = Math.round(c.x), y = Math.round(c.y);
      lx.fillStyle = `rgba(${mix(72, 150)},${mix(52, 84)},${mix(84, 96)},.45)`; for (const [bx, by, w] of c.bars) lx.fillRect(x + bx + 1, y + by + 1, w, 1);
      lx.fillStyle = `rgba(${mix(150, 250)},${mix(110, 170)},${mix(140, 130)},.5)`; for (const [bx, by, w] of c.bars) lx.fillRect(x + bx, y + by, w, 1); }
    lx.fillStyle = "rgba(40,22,36,.85)";
    for (const b of birds) for (let i = 0; i < b.n; i++) { const x = Math.round(b.x - Math.sign(b.v) * i * 4), y = Math.round(b.y + i * 2 * (i % 2 ? 1 : -.5)), up = Math.sin(t * 9 + b.p + i) > 0;
      lx.fillRect(x, y, 1, 1); lx.fillRect(x - 1, y - (up ? 1 : 0), 1, 1); lx.fillRect(x + 1, y - (up ? 1 : 0), 1, 1); }
    sx.globalCompositeOperation = "source-over"; sx.imageSmoothingEnabled = false; sx.clearRect(0, 0, W, SKY);
    sx.drawImage(lo, 0, 0, LW, SKY / PX, 0, 0, W, SKY);
    sx.globalCompositeOperation = "destination-out"; sx.drawImage(mask, 0, 0, TW, TH, TX, TY, TW, TH);
    ctx.drawImage(sky, 0, 0);
    // a light sweep across the gold letters every few seconds
    const sw = (t % 7) / 1.6;
    if (sw < 1) { sx.globalCompositeOperation = "source-over"; sx.clearRect(0, 0, W, SKY);
      const cx = TX - 120 + sw * (TW + 240); sx.fillStyle = "rgba(255,250,215,.55)";
      for (let y = TY; y < TY + TH; y += PX) { const off = (y - TY) * .45; sx.fillRect(Math.round((cx - off) / PX) * PX, y, 36, PX); sx.fillRect(Math.round((cx - off + 52) / PX) * PX, y, 12, PX); }
      sx.globalCompositeOperation = "destination-in"; sx.drawImage(mask, 0, TH, TW, TH, TX, TY, TW, TH);
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .6; ctx.drawImage(sky, TX, TY, TW, TH, TX, TY, TW, TH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    // smoke, fire and embers on the small layer
    lx.clearRect(0, 0, LW, LH);
    for (const s of smoke) { const k = s.a / s.life; lx.fillStyle = `rgba(${78 - k * 10 | 0},${66 - k * 6 | 0},${70 - k * 6 | 0},${(.55 * Math.min(1, s.a * 2) * (1 - k)).toFixed(3)})`; disc(lx, s.x, s.y, s.r + k * 3.2); }
    for (const [x, y] of FIRES) { const fx = x / PX, fy = y / PX;
      for (let i = 0; i < 4; i++) { const hgt = Math.random() * 3 | 0; lx.fillStyle = ["#ffd75a", "#ff9a2e", "#ff6a1c", "#e2401a"][(i + (t * 12 | 0)) % 4]; lx.fillRect(Math.round(fx + rnd(-1.4, 1.4)), Math.round(fy - hgt), 1, 1); } }
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
