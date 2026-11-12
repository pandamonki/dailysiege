// Hero skill trees inside the battle sim (version 3 heroes). Spec: docs/hero-skill-trees.md.
// runBattle builds one kit per battle when opts.heroV3 is set and calls its hooks; nothing here runs for older battles.
// Only detmath maths and the battle's rng: this must replay identically on every phone and on the server.
// Values (ranks, numbers) come from TREES in config/trees.js; fixed numbers that the description states are written here.

function makeTreeKit(X) {
  const { ents, DT, d, fxv, setFx, deal, heal, enemiesNear, friendsNear, minBy, ev, aoe, shot, slash, txt, add, pending, walls, traps, P, order, rng, NN, allied, hostile, log } = X;
  const T = () => X.t();
  const live = e => e && !e.dead;
  const zones = [], banners = [], totems = [], relics = [], domes = [], pzList = [];
  const soldier = o => o.kind === "unit" || o.kind === "summon";
  const siege = o => !!(o.cart || o.ram);
  const backline = o => !o.dead && o.kind !== "castle" && o.kind !== "totem" && (o.range || 1.1) >= 2;
  const foes = (e, x, y, r) => enemiesNear(e, x, y, r).filter(o => o.kind !== "totem");
  const rk = (e, bi, i) => (e.tr ? e.tr[bi][i] : 0);
  const V = (e, bi, i, vi) => nodeVal(e.cls, bi, i, vi, rk(e, bi, i));
  let hc = { k: -1, m: {} }; // the heroes of each lord, worked out once a tick
  const heroes = pid => { const k = X.tickNo(); if (hc.k !== k) hc = { k, m: {} }; return hc.m[pid] || (hc.m[pid] = ents.filter(h => h.kind === "champ" && h.tr && h.pid === pid)); };
  const heroOf = (pid, cls, bi, i) => heroes(pid).find(h => !h.dead && h.cls === cls && rk(h, bi, i) > 0);
  const reach = e => e.reachBonus || 0;
  const phys = (src, o) => ((o && o.atype) || (src && src.atype) || "pure") !== "magic";
  const withAb = (name, fn) => { const old = X.getAb(); X.setAb(name); const r = fn(); X.setAb(old); return r; };
  // crowd control: heroes take half duration, siege engines half duration of a root
  function cc(o, k, dur, val) { if (!live(o) || o.kind === "castle") return; if (o.kind === "champ" || (siege(o) && k === "root")) dur *= .5; setFx(o, k, dur, val === undefined ? 1 : val); }
  // ----- shields -----
  const shieldAmt = e => (e.sh || []).reduce((s, x) => s + (x.until > T() ? x.amt : 0), 0);
  function addShield(e, amt, dur) {
    if (!live(e) || amt <= 0) return 0; e.sh = (e.sh || []).filter(x => x.until > T() && x.amt > 0);
    amt = Math.min(amt, e.maxhp * .4 - shieldAmt(e)); if (amt <= 0) return 0;
    e.sh.push({ amt, until: T() + dur }); return amt;
  }
  function absorb(tgt, dmg) {
    if (!tgt.sh || !tgt.sh.length) return dmg; const now = T(); tgt.sh = tgt.sh.filter(s => s.until > now && s.amt > .01);
    for (const s of tgt.sh) { if (dmg <= 0) break; const a = Math.min(s.amt, dmg); s.amt -= a; dmg -= a; }
    tgt.sh = tgt.sh.filter(s => s.amt > .01); return dmg;
  }
  // ----- stealth -----
  function hide(e, dur, stealth) { setFx(e, "vanish", dur); e.stealth = !!stealth; e.revealR = 1; }
  function unhide(e) { if (e.stealth) { e.stealth = false; delete e.fx.vanish; } }
  // ----- ground zones -----
  function addZone(e, o) {
    const z = { pid: e.pid, owner: e, x: o.x, y: o.y, r: o.r, until: T() + o.dur, every: o.every, next: T() + o.every, fn: o.fn, ab: X.getAb() }; zones.push(z);
    ev({ ty: "zone", x: o.x, y: o.y, r: o.r, c: o.c, dur: o.dur, k: o.k || "zone" }); return z;
  }
  function pull(o, x, y, dist) { // never into a wall, never castles or siege
    if (o.kind === "castle" || o.kind === "totem" || siege(o)) return;
    const dx = x - o.x, dy = y - o.y, L = hyp(dx, dy); if (L < .05) return; const s = Math.min(dist, L - .05);
    for (let k = 4; k >= 1; k--) { const nx = o.x + dx / L * s * k / 4, ny = o.y + dy / L * s * k / 4; if (!X.wallAt(o, nx, ny)) { o.x = nx; o.y = ny; return; } }
  }
  const cdOf = (e, bi, i) => { const r = rk(e, bi, i); let cd = TREES[e.cls][bi].nodes[i].cd;
    if (e.cls === "mage" && bi === 2 && i === 1) cd = ext([16, 14, 12], r);
    if (e.cls === "archer" && bi === 1 && i === 1 && rk(e, 1, 4)) cd *= .7;
    return cd * BAL.cd * e.cdMul * (e.cdScale || 1); };
  // ----- setting a hero up -----
  function setup(e, pl) {
    e.tr = TREE_BKEY.map((b, bi) => cleanTree(pl.tree)[b]); e.tr0 = e.tr.map(a => a.slice()); e.cds = {}; e.icd = {};
    e.mres = CHAMP_V3[e.cls].mres || 0; e.dodge = { all: 0, melee: 0 };
    const c = e.cls;
    if (c === "warrior") { if (rk(e, 0, 0)) { const f = 1 + V(e, 0, 0, 0) / 100; e.maxhp *= f; e.physRed = V(e, 0, 0, 1) / 100; } if (rk(e, 1, 4)) e.ccShort = .4; }
    if (c === "archer") { if (rk(e, 0, 0)) { e.range += V(e, 0, 0, 0); e.dmgV3 = 1 + V(e, 0, 0, 1) / 100; } if (rk(e, 1, 0)) { e.spd *= 1 + V(e, 1, 0, 0) / 100; e.dodge.melee = V(e, 1, 0, 1) / 100; } }
    if (c === "rogue") { if (rk(e, 2, 0)) e.dodge.all = V(e, 2, 0, 0) / 100; }
    if (c === "mage") { if (rk(e, 2, 0)) { e.range += V(e, 2, 0, 0); e.reachBonus = V(e, 2, 0, 0); } if (rk(e, 2, 3)) e.cdScale = 1 - V(e, 2, 3, 1) / 100; }
    e.kc = [];
    for (let bi = 0; bi < 3; bi++) if (rk(e, bi, 5)) e.kc.push([bi, 5]);
    for (let bi = 0; bi < 3; bi++) [1, 2].forEach(i => { if (rk(e, bi, i) && TREES[c][bi].nodes[i].kind === "trigger") e.kc.push([bi, i]); });
    e.kc.forEach(([bi, i]) => { e.cds[bi + "." + i] = i === 5 ? 10 + rng() * 8 : 2 + rng() * 3; });
    e.nextTotem = 6; e.v3as = 0; e.v3ms = 0;
    if (c === "rogue" && rk(e, 0, 0)) hide(e, 1e6, true);
  }
  // after every lord's army is on the field: army-wide passives
  function postSetup() {
    order.forEach(pid => {
      const h = heroes(pid)[0]; if (!h || h.cls !== "warrior") return;
      if (rk(h, 2, 0)) { const v = V(h, 2, 0, 0) / 100; ents.forEach(u => { if (u.pid === pid && u.kind === "unit" && !siege(u)) u.cad = v; }); }
      if (rk(h, 2, 2)) { const f = 1 + V(h, 2, 2, 0) / 100; walls.forEach(w => { if (w.pid === pid) { w.hp *= f; w.maxhp *= f; } }); ents.forEach(u => { if (u.pid === pid && u.key === "guard") { u.maxhp *= f; u.hp *= f; } }); }
    });
  }
  function onRespawn(e) { if (!e.tr) return; e.rolled = false; e.snapUsed = false; e.flurry = null; e.br = null; e.sh = []; e.nextTotem = T() + 6; if (e.cls === "rogue" && rk(e, 0, 0)) hide(e, 1e6, true); }
  // ----- casting -----
  function cast(e) {
    const now = T(); if (fxv(e, "silence") || (e.castLock || 0) > now || !e.kc) return;
    for (const [bi, i] of e.kc) {
      const key = bi + "." + i, node = TREES[e.cls][bi].nodes[i];
      if (e.cds[key] > now || (i === 5 && !e.ultArm)) continue;
      const fn = FN[e.cls + "." + bi + "." + i]; if (!fn) continue;
      X.setAb(node.name); const res = fn(e, rk(e, bi, i)); X.setAb(null);
      if (!res) continue;
      X.abRec(e, node.name).casts++;
      if (i === 5) X.onUlt(e, node.name);
      const sp = treeSp(e.cls, bi, i), art = SPELL_ART[sp];
      if (art) { const at = res.x != null ? res : art.at === "t" && live(e.tgt) ? e.tgt : e; ev({ ty: "spell", sp, x: at.x, y: at.y - .2, r: art.r }); }
      X.atkEv(e, live(e.tgt) ? e.tgt : e, "c");
      e.cds[key] = i === 5 ? 1e9 : now + cdOf(e, bi, i); X.cd(e, key, e.cds[key]); e.castLock = now + .4; return;
    }
  }
  // a reactive skill (no cooldown loop): checked, cooled and recorded by hand
  function react(e, bi, i, fn) {
    const key = bi + "." + i, now = T(); if (!live(e) || !rk(e, bi, i) || e.cds[key] > now || fxv(e, "silence")) return false;
    const node = TREES[e.cls][bi].nodes[i]; const r = withAb(node.name, () => fn(rk(e, bi, i))); if (!r) return false;
    X.abRec(e, node.name).casts++; e.cds[key] = now + cdOf(e, bi, i); X.cd(e, key, e.cds[key]); return true;
  }
  // ----- per-tick upkeep for heroes and soldiers -----
  function tick(e) {
    const now = T();
    if (e.kind !== "champ" || !e.tr) { if (e.cad !== undefined || e.kind === "unit" || e.kind === "summon") e.v3ms = (e.cad || 0) + fxv(e, "msbuf"); return; }
    const c = e.cls; let as = 0, ms = fxv(e, "msbuf");
    if (e.sh && e.sh.length && X.tickN(10)) e.sh = e.sh.filter(s => s.until > now && s.amt > .01);
    if (fxv(e, "cdfreeze")) for (const k in e.cds) if (e.cds[k] < 1e8) e.cds[k] += DT;
    if (e.stealth && !fxv(e, "vanish")) e.stealth = false;
    if (c === "warrior") {
      if (e.br && e.br.until < now) e.br = null;
      if (e.br) as += e.br.n * V(e, 1, 3, 0) / 100;
      if (e.avatar && e.avatar < now) e.avatar = 0;
    }
    if (c === "rogue") {
      if (e.stealth && rk(e, 0, 0)) ms += V(e, 0, 0, 0) / 100;
      if (e.flurry && e.flurry.until < now) e.flurry = null; if (e.flurry) as += e.flurry.n * V(e, 2, 3, 0) / 100;
    }
    if (c === "shaman") {
      if (rk(e, 2, 3)) { const lowC = P[e.pid].castle.hp / P[e.pid].castle.maxhp < .35 || e.hp / e.maxhp < .35; e.offering = lowC; if (lowC) as += V(e, 2, 3, 1) / 100; }
      if (rk(e, 1, 0) && now >= e.nextTotem && foes(e, e.x, e.y, 5).length) { plantTotem(e); e.nextTotem = now + 14; }
      if (rk(e, 1, 3) && X.tickN(40)) { const up = totems.some(o => o.owner === e && o.gt && !o.dead); if (up) { const v = V(e, 1, 3, 0) / 100, w = V(e, 1, 3, 1) / 100; friendsNear(e.pid, e.x, e.y, 4).filter(o => o.pid === e.pid && soldier(o)).forEach(o => { setFx(o, "asbuf", 4, v); if (o.range < 1.5) setFx(o, "siegebuf", 4, w); }); } }
    }
    e.v3as = as; e.v3ms = ms;
  }
  // world-level upkeep, once a tick
  function world() {
    const now = T();
    for (let i = zones.length - 1; i >= 0; i--) { const z = zones[i]; if (now >= z.until) { zones.splice(i, 1); continue; } if (now >= z.next) { z.next += z.every; const old = X.getAb(); X.setAb(z.ab); z.fn(z); X.setAb(old); } }
    for (let i = pzList.length - 1; i >= 0; i--) { const p = pzList[i], pz = p.pz;
      if (p.dead || !pz || pz.until <= now) { pzList.splice(i, 1); if (pz) p.pz = null; continue; }
      const by = pz.by; if (!by) continue;
      deal(by, p, V(by, 1, 0, 0) * pz.n * DT, { aoe: 1, dot: 1, atype: "pure", ab: "Poisoned Blades", noFinish: 1 });
      if (p.dead) continue;
      setFx(p, "grievous", .25, V(by, 1, 0, 1) / 100);
      if (rk(by, 1, 2)) setFx(p, "slow", .25, V(by, 1, 2, 0) / 100);
      if (rk(by, 1, 4) && pz.n >= 5) setFx(p, "weaken", .25);
    }
    for (let i = banners.length - 1; i >= 0; i--) if (banners[i].until <= now) banners.splice(i, 1);
    for (let i = domes.length - 1; i >= 0; i--) if (domes[i].until <= now) domes.splice(i, 1);
  }
  // ----- totems and relics -----
  function plantTotem(e) {
    const spring = rk(e, 1, 4) > 0, w = rk(e, 1, 2) ? Math.round(V(e, 1, 2, 0)) : 0;
    const o = add({ owner: e, pid: e.pid, kind: "totem", key: "totem", armour: "medium", x: e.x + .4, y: e.y + .2, maxhp: 120, atk: 0, range: 0, as: 1, spd: 0, armor: .2, life: T() + 7, v3: 1, gt: 1, ward: w, healAmt: V(e, 1, 0, 1) * (spring ? 1.5 : 1), red: V(e, 1, 0, 0) / 100 });
    o.hp = o.maxhp; o.hx = o.x; o.hy = o.y; totems.push(o);
    ev({ ty: "spell", sp: treeSp(e.cls, 1, 0), x: o.x, y: o.y, r: 2.5 });
  }
  function totemTick(e) {
    const now = T();
    if (now >= e.life || e.hp <= 0) { e.dead = true; ev({ ty: "die", id: e.id, x: e.x, y: e.y, fx: 0, ex: 1 }); const k = totems.indexOf(e); if (k >= 0) totems.splice(k, 1); const q = relics.indexOf(e); if (q >= 0) relics.splice(q, 1); return; }
    if (e.gt && X.tickN(10)) friendsNear(e.pid, e.x, e.y, 2.5).forEach(o => { if (o !== e && o.kind !== "totem") heal(o, e.healAmt, true, e); });
    if (e.relic && now >= e.nextPulse) { e.nextPulse = now + 2; aoe(e.x, e.y, 2.5, "#7fe08a", .5);
      foes(e.owner, e.x, e.y, 2.5).forEach(o => { if (o.kind === "champ") setFx(o, "slow", 2, .3); else cc(o, "stun", .6); }); }
  }
  function redirect(tgt, dmg) {
    if (!relics.length || tgt.kind === "totem" || tgt.kind === "castle") return dmg; const now = T();
    for (const r of relics) {
      if (r.dead || !allied(r.pid, tgt.pid) || d(r, tgt) > 3) continue;
      if (!r.rw || now - r.rw.t0 >= 1) r.rw = { t0: now, amt: 0 };
      const take = Math.min(dmg * .4, Math.max(0, r.maxhp * .25 - r.rw.amt)); if (take <= 0) continue;
      r.rw.amt += take; r.hp -= take; dmg -= take; if (r.hp <= 0) { r.hp = 0; X.kill(r, null); }
      return dmg;
    }
    return dmg;
  }
  // a hit aimed at an ally inside a Ward Totem is swallowed (enemy hero attacks and abilities only, not damage over time)
  function blocked(src, tgt, o) {
    if (!src || src.kind !== "champ" || o.dot || !totems.length) return false;
    for (const tt of totems) { if (tt.dead || !tt.ward || tt.wardLeft === 0 || !allied(tt.pid, tgt.pid) || tgt.kind === "totem" || d(tt, tgt) > 2.5 || !hostile(tt.pid, src.pid)) continue;
      if (tt.wardLeft === undefined) tt.wardLeft = tt.ward; tt.wardLeft--; txt(tgt, "Warded", "#bfe3ff"); return true; }
    return false;
  }
  // ----- the modifiers every hit passes through -----
  function mul(src, tgt, o, atype) {
    let m = 1; const now = T(), ph = atype !== "magic", isAb = !!(o.ab || X.getAb()) && !o.dot;
    if (src) {
      if (src.dmgV3) m *= src.dmgV3;
      if (src.cls === "warrior" && src.tr && rk(src, 1, 4) && src.hp / src.maxhp < .3) m *= 1.15;
      if (src.cls === "rogue" && src.tr && rk(src, 2, 2) && tgt.tgt && tgt.tgt !== src && live(tgt.tgt)) m *= 1 + V(src, 2, 2, 0) / 100;
      for (const b of banners) { if (!allied(src.pid, b.pid) || hyp(src.x - b.x, src.y - b.y) > b.r) continue;
        if (b.focus === tgt && tgt.kind !== "castle") m *= 1 + b.dmg;
        if (tgt.kind === "castle" && b.sap) m *= 1 + b.sap; }
      const sb = fxv(src, "siegebuf"); if (sb && tgt.kind === "castle") m *= 1 + sb;
    }
    if (tgt.physRed && ph) m *= 1 - tgt.physRed;
    if (ph && fxv(tgt, "physred")) m *= 1 - fxv(tgt, "physred");
    if (ph && totems.length && tgt.kind !== "totem") for (const tt of totems) if (!tt.dead && tt.gt && allied(tt.pid, tgt.pid) && d(tt, tgt) <= 2.5) { m *= 1 - tt.red; break; }
    if (tgt.pid != null && (tgt.kind === "unit" || tgt.kind === "summon")) { const w = heroOf(tgt.pid, "warrior", 0, 3); if (w && tgt !== w && shieldAmt(w) > 0 && d(w, tgt) <= 2) m *= 1 - V(w, 0, 3, 0) / 100; }
    if (src && src.range >= 2 && !o.aoe && domes.length) for (const dm of domes) if (allied(dm.pid, tgt.pid) && hyp(tgt.x - dm.x, tgt.y - dm.y) <= dm.r) { m *= .4; break; }
    if (!ph) {
      let mr = (tgt.mres || 0) + fxv(tgt, "mresbuf");
      if (tgt.pid != null && tgt.kind !== "castle") { const am = heroOf(tgt.pid, "mage", 2, 0); if (am && d(am, tgt) <= 3) mr += V(am, 2, 0, 1) / 100; }
      if (src && src.cls === "mage" && src.tr && rk(src, 2, 3) && isAb) mr *= 1 - V(src, 2, 3, 0) / 100;
      m *= 1 - mr;
    }
    if (src && src.cls === "mage" && src.tr && rk(src, 2, 3) && isAb && tgt.dmgRed) { const v = V(src, 2, 3, 0) / 100, a0 = Math.min(.8, tgt.armor + tgt.dmgRed), b0 = Math.min(.8, tgt.armor + tgt.dmgRed * (1 - v)); m *= (1 - b0) / (1 - a0); } // spells ignore part of damage reduction
    // what the target is suffering
    if (ph && tgt.pz && tgt.pz.until > now && tgt.pz.by && rk(tgt.pz.by, 1, 3)) m *= 1 + V(tgt.pz.by, 1, 3, 0) / 100;
    if (ph && tgt.dots.length) { const bd = tgt.dots.find(x => x.key === "burn" && x.until > now && x.src && x.src.tr && rk(x.src, 0, 3)); if (bd) m *= 1 + V(bd.src, 0, 3, 0) / 100; }
    if ((fxv(tgt, "root") || fxv(tgt, "frozen")) && tgt.shatter) m *= 1 + tgt.shatter;
    if (atype === "pierce" && fxv(tgt, "vulnpierce")) m *= 1 + fxv(tgt, "vulnpierce");
    if (src && fxv(tgt, "vulnrng") && (src.key === "bowman" || src.key === "sniper" || src.key === "centaur" || src.key === "mage" || src.cls === "mage" || src.cls === "archer")) m *= 1 + fxv(tgt, "vulnrng");
    return m;
  }
  // frost mages' Shatter works on the enemy, so it is kept on a lookup of who is rooted by whom
  function dodgeChance(tgt, src, o) {
    if (!src || !tgt.tr) return 0; if (fxv(tgt, "bladefury")) return 1;
    let c = 0; if (phys(src, o)) c += tgt.dodge.all; if ((src.range || 1.1) < 1.5) c += tgt.dodge.melee; return Math.min(.3, c);
  }
  function onDodge(tgt, src) {
    if (!tgt.tr || tgt.kind !== "champ") return;
    if (tgt.cls === "rogue") {
      if (rk(tgt, 2, 3)) { const f = tgt.flurry && tgt.flurry.until > T() ? tgt.flurry : { n: 0 }; tgt.flurry = { n: Math.min(5, f.n + 1), until: T() + 5 }; }
      if (rk(tgt, 2, 1) && !(tgt.icd.rip > T()) && live(src) && d(tgt, src) <= 1.5) {
        tgt.icd.rip = T() + ext([1.5, 1.2, 1.0], rk(tgt, 2, 1));
        withAb("Riposte", () => { deal(tgt, src, tgt.atk * V(tgt, 2, 1, 0), { aoe: 1, big: 1, counter: 1 }); setFx(src, "asdown", 4, .3); });
        X.abRec(tgt, "Riposte").casts++; slash(src, "#ffd54a");
      }
    }
    if (tgt.cls === "archer" && rk(tgt, 1, 0) && src) { const dd = d(tgt, src) || 1; tgt.x += (tgt.x - src.x) / dd * .7; tgt.y += (tgt.y - src.y) / dd * .7; }
  }
  // ----- what a hit does afterwards -----
  function onDamaged(tgt, src, dmg, o) {
    if (tgt.cad) tgt.cad = 0;
    if (src) { tgt.hitSrc = src; if (tgt.kind === "champ") tgt.lastHurt = { src, t: T(), ab: !!(o.ab || X.getAb()) && src.kind === "champ" }; }
    if (!tgt.tr || tgt.kind !== "champ") return;
    if (tgt.cls === "warrior" && rk(tgt, 0, 4) && shieldAmt(tgt) > 0 && src && (src.range || 1.1) < 1.5 && !o.reflected && live(src) && src.kind !== "castle") deal(tgt, src, dmg * .15, { aoe: 1, reflected: 1, ab: "Spiked Bulwark" });
    if (tgt.cls === "rogue" && rk(tgt, 2, 4) && !tgt.rolled && tgt.hp > 0 && tgt.hp / tgt.maxhp < .3 && src) {
      tgt.rolled = true; hide(tgt, 1.5, false); const dd = d(tgt, src) || 1; tgt.x += (tgt.x - src.x) / dd * 2; tgt.y += (tgt.y - src.y) / dd * 2; txt(tgt, "Evasive Roll", "#d6c2ff"); X.abRec(tgt, "Evasive Roll").casts++; }
    if (tgt.cls === "mage" && rk(tgt, 1, 4) && !tgt.snapUsed && tgt.hp > 0 && tgt.hp / tgt.maxhp < .35) { tgt.snapUsed = true; tgt.cds["1.1"] = 0; txt(tgt, "Cold Snap", "#9fd8ff"); }
  }
  function onDealt(src, tgt, dmg, o) {
    if (src.cad) src.cad = 0;
    if (src.rallyUntil > T() && !src.rallyDone && tgt.kind !== "champ" && tgt.kind !== "castle") { src.rallyDone = true; cc(tgt, "stun", .8); }
    if (src.stealth && !o.keepStealth) unhide(src);
    if (src.healOwner && live(src.owner)) heal(src.owner, dmg * src.healOwner, true, src.owner, "Spirit Wolves");
    if (soldier(src) && src.kind === "unit") { const sh = heroOf(src.pid, "shaman", 2, 4); if (sh && d(sh, src) <= 4) heal(src, dmg * .1, true, sh, "Blood Pact"); }
    if (src.kind !== "champ" || !src.tr) return;
    const isAb = !!(o.ab || X.getAb()) && !o.dot;
    if (src.cls === "shaman" && rk(src, 2, 0) && isAb && o.ab !== "Spirit Leech") { let f = V(src, 2, 0, 0) / 100; if (src.offering) f *= V(src, 2, 3, 0); heal(src, dmg * f, true, src, "Spirit Leech"); }
    if (src.cls === "mage" && rk(src, 0, 0) && isAb && live(tgt) && tgt.kind !== "castle") {
      const dps = dmg * V(src, 0, 0, 0) / 100 / 4, old = tgt.dots.find(x => x.key === "burn" && x.src === src);
      if (old) { old.until = T() + 4; old.dps = Math.max(old.dps, dps); } else tgt.dots.push({ dps, until: T() + 4, src, key: "burn", ab: "Ignite" }); }
  }
  function onKill(v, src) {
    const now = T(), k = src && (src.owner || src);
    // a burning enemy bursts
    const bd = v.dots.find(x => x.key === "burn" && x.until > now && x.src && x.src.tr && !x.src.dead && rk(x.src, 0, 2));
    if (bd) { const m = bd.src; if (!(m.icd.comb && m.icd.comb.t === Math.floor(now) && m.icd.comb.n >= 3)) { m.icd.comb = { t: Math.floor(now), n: (m.icd.comb && m.icd.comb.t === Math.floor(now) ? m.icd.comb.n : 0) + 1 };
      withAb("Combustion", () => { aoe(v.x, v.y, 1, "#ff8a2a", .4); foes(m, v.x, v.y, 1).forEach(o => deal(m, o, V(m, 0, 2, 0), { aoe: 1, big: 1 })); }); } }
    if (!k || !k.tr || k.kind !== "champ") { // soldiers killing near a Blood Rage warrior
      if (src && src.kind === "unit") { const w = heroOf(src.pid, "warrior", 1, 3); if (w && src.range < 1.5 && d(w, src) <= 3) rage(w); }
      return; }
    if (k.cls === "warrior") {
      if (rk(k, 1, 2) && !(k.icd.thirst > now)) { k.icd.thirst = now + .5; heal(k, k.maxhp * V(k, 1, 2, 0) / 100, false, k, "Bloodthirst"); }
      if (rk(k, 1, 3)) rage(k);
      if (k.whirl && k.whirl.until > now && v.kind === "champ" && !(k.icd.whirlr > now)) { k.icd.whirlr = now + 10; const rem = k.cds["1.1"] - now; if (rem > 0) k.cds["1.1"] -= rem / 2; }
    }
    if (k.cls === "rogue" && rk(k, 0, 3) && (v.kind === "champ" || !(k.icd.vanish > now))) { k.icd.vanish = now + ext([12, 9], rk(k, 0, 3)); hide(k, 3, true); txt(k, "Vanish", "#d6c2ff"); }
  }
  function rage(w) { const now = T(); w.br = { n: Math.min(6, (w.br && w.br.until > now ? w.br.n : 0) + 1), until: now + 6 }; }
  // gold: Bounty Hunter
  const goldMul = (kc, v) => (v.kind === "champ" && kc.kind === "champ" && kc.tr && kc.cls === "archer" && rk(kc, 2, 4) ? 1.5 : 1);
  const wallMul = e => { let m = 1; const sb = fxv(e, "siegebuf"); if (sb) m *= 1 + sb; for (const b of banners) if (b.sap && allied(e.pid, b.pid) && hyp(e.x - b.x, e.y - b.y) <= b.r) m *= 1 + b.sap; return m; };
  // ----- basic attacks -----
  function addPoison(by, tgt, n) {
    if (!live(tgt) || tgt.kind === "castle" || tgt.kind === "totem") return; const now = T();
    const p = tgt.pz && tgt.pz.until > now ? tgt.pz : (tgt.pz = { n: 0, by, until: 0 }); p.n = Math.min(5, p.n + n); p.until = now + 6; p.by = by; if (!pzList.includes(tgt)) pzList.push(tgt);
  }
  function basic(e, o) {
    const c = e.cls; let amt = e.atk, crit = false;
    if (c === "shaman" && rk(e, 0, 0)) amt *= 1 + V(e, 0, 0, 0) / 100;
    if (c === "archer" && rk(e, 2, 0)) { const a = e.aim, n = a && a.tgt === o ? a.n : 0; if (n && rng() < Math.min(5, n) * V(e, 2, 0, 0) / 100) crit = true; e.aim = { tgt: o, n: n + 1 }; }
    if (c === "rogue" && e.stealth && rk(e, 0, 1)) return ambush(e, o);
    const dealt = deal(e, o, amt, crit ? { crit: 1, big: 1, critMul: 1.75 } : {});
    if (!dealt || !live(o)) { if (c === "mage" && rk(e, 2, 4)) e.msl = (e.msl || 0) + 1; return dealt; }
    if (c === "warrior") {
      if (rk(e, 1, 0)) { const f = V(e, 1, 0, 0) / 100; foes(e, o.x, o.y, 1.2).filter(x => x !== o).sort((a, b) => d(a, o) - d(b, o) || a.id - b.id).slice(0, 2).forEach(x => deal(e, x, e.atk * f, { aoe: 1 })); }
      if (e.avatar) { aoe(o.x, o.y, 1.2, "#ffe082", .3); foes(e, o.x, o.y, 1.2).forEach(x => { if (x !== o) deal(e, x, e.atk * .5, { aoe: 1 }); if (x.kind !== "champ") cc(x, "stun", .5); }); if (o.kind !== "champ") cc(o, "stun", .5); }
    }
    if (c === "shaman" && rk(e, 0, 0)) { const x = minBy(foes(e, o.x, o.y, 2).filter(q => q !== o), q => d(q, o)); if (x) { shot(o, x, "#8fd3ff", 1); deal(e, x, e.atk * V(e, 0, 0, 1) / 100, { aoe: 1 }); } }
    if (c === "mage") {
      if (rk(e, 1, 0)) { const v = V(e, 1, 0, 0) / 100; setFx(o, "slow", 3, v); setFx(o, "asdown", 3, v); }
      if (rk(e, 2, 4)) { e.msl = (e.msl || 0) + 1; if (e.msl % 4 === 0) foes(e, o.x, o.y, 3).filter(x => x !== o).sort((a, b) => d(a, o) - d(b, o) || a.id - b.id).slice(0, 2).forEach(x => { shot(e, x, "#c9a0ff", 1); deal(e, x, e.atk * .5, { aoe: 1 }); }); }
    }
    if (c === "rogue" && rk(e, 1, 0)) addPoison(e, o, 1);
    if (c === "archer" && rk(e, 0, 2) && rng() < V(e, 0, 2, 0) / 100) { const x = minBy(foes(e, o.x, o.y, 2).filter(q => q !== o), q => d(q, o)); if (x) { shot(o, x, "#f1e6c0", 2); deal(e, x, e.atk * .5, { aoe: 1 }); } }
    return dealt;
  }
  function ambush(e, o) {
    const r = rk(e, 0, 1), dmg = (V(e, 0, 1, 0) + e.atk) * 1.8;
    withAb("Ambush", () => { slash(o, "#ffd54a"); deal(e, o, dmg, { aoe: 1, big: 1, crit: 1, noFinish: 1 }); if (live(o)) { cc(o, "stun", V(e, 0, 1, 1)); if (rk(e, 0, 4)) setFx(o, "silence", 1.5); } });
    X.abRec(e, "Ambush").casts++; ev({ ty: "spell", sp: treeSp(e.cls, 0, 1), x: o.x, y: o.y - .2, r: 1 }); return r ? dmg : 0;
  }
  // a Rogue hidden by Shadowstep goes for the backline: the Mage and Ranger first, then any hero, then ranged soldiers
  function stealthTarget(e) {
    if (!e.tr || !e.stealth) return null;
    const c = ents.filter(o => !o.dead && o.kind !== "castle" && o.kind !== "totem" && hostile(e.pid, o.pid) && X.fighting(o.pid) && X.vis(o, e));
    const hs = c.filter(o => o.kind === "champ" && (o.cls === "mage" || o.cls === "archer") && d(o, e) <= 16); if (hs.length) return minBy(hs, o => d(o, e));
    const h2 = c.filter(o => o.kind === "champ" && d(o, e) <= 16); if (h2.length) return minBy(h2, o => d(o, e));
    const bl = c.filter(o => backline(o) && d(o, e) <= 12); return bl.length ? minBy(bl, o => d(o, e)) : null;
  }
  // ----- trap and wall hooks used by the Ranger -----
  function trapFire(tr, o) {
    const e = tr.owner, r = tr.rank; aoe(tr.x, tr.y, .7, "#c7ccd1", .6);
    withAb("Spike Trap", () => { deal(e, o, nodeVal("archer", 1, 1, 0, r) + e.atk, { aoe: 1, big: 1, atype: "pure" }); if (live(o)) cc(o, "root", nodeVal("archer", 1, 1, 1, r));
      if (rk(e, 1, 3)) { const rad = V(e, 1, 3, 0), sl = V(e, 1, 3, 1) / 100; aoe(tr.x, tr.y, rad, "#c9a46a", .5); foes(e, tr.x, tr.y, rad).forEach(x => setFx(x, "slow", 4, sl)); } });
    X.abRec(e, "Spike Trap").casts++; if (!tr.free) tr.used = true; tr.used = true;
  }
  function dropTrap(e, x, y, rank) { const tr = { pid: e.pid, type: "spike", ranger: true, rank, x, y, used: false, t0: T(), until: T() + 8 }; Object.defineProperty(tr, "owner", { value: e, enumerable: false }); traps.push(tr); } // the owner stays out of the saved result (it points at the whole battle)
  // ======================================================================== the skills ========================================================================
  const FN = {};
  const nearest = (e, r) => minBy(foes(e, e.x, e.y, r), o => d(o, e));
  const clusterAt = (e, cx, cy, r) => foes(e, cx, cy, r);
  // the point near the caster where the most enemies stand, within `range` of the caster; each candidate is an enemy's position
  function densest(e, range, rad, need) {
    let best = null, bn = need - 1;
    foes(e, e.x, e.y, range + rad).forEach(o => { if (d(o, e) > range) return; const n = foes(e, o.x, o.y, rad).length; if (n > bn) { best = o; bn = n; } });
    return best ? { x: best.x, y: best.y, n: bn, o: best } : null;
  }
  // ---- Warrior ----
  FN["warrior.0.1"] = (e, r) => {
    const att = foes(e, e.x, e.y, 3).filter(o => live(o.tgt) && o.tgt !== e && o.tgt.kind !== "castle" && allied(e.pid, o.tgt.pid) && d(o, o.tgt) <= (o.range || 1.1) + .7);
    if (att.length < 2) return false;
    foes(e, e.x, e.y, 2).forEach(o => { if (siege(o)) return; cc(o, "taunt", 3); o.tauntBy = e; ev({ ty: "taunt", id: o.id, to: e.id, dur: o.kind === "champ" ? 1.5 : 3 }); });
    const amt = addShield(e, e.maxhp * V(e, 0, 1, 0) / 100, 6);
    if (rk(e, 0, 3) && amt > 0) friendsNear(e.pid, e.x, e.y, 2).filter(o => o !== e && soldier(o)).forEach(o => addShield(o, amt * V(e, 0, 3, 1) / 100, 6));
    return true;
  };
  FN["warrior.0.2"] = (e, r) => {
    const h = e.hitSrc; if (!h || T() - e.hitT > .5 || h.kind !== "champ" || (h.range || 1.1) >= 1.5 || !live(h) || d(e, h) > 1.7 || !hostile(e.pid, h.pid)) return false;
    slash(h, "#7fb2ff"); deal(e, h, V(e, 0, 2, 0) + e.atk * .5, { aoe: 1, big: 1 }); cc(h, "stun", .5); e.hitSrc = null; return { x: h.x, y: h.y };
  };
  FN["warrior.0.5"] = e => {
    const allies = friendsNear(e.pid, e.x, e.y, 3).filter(o => soldier(o) && o.pid === e.pid);
    if (allies.length < 3 || !foes(e, e.x, e.y, 6).some(o => (o.range || 1.1) >= 2 && o.kind !== "castle")) return false;
    const dm = { pid: e.pid, x: e.x, y: e.y, r: 2.5, until: T() + 7 }; domes.push(dm);
    addZone(e, { x: e.x, y: e.y, r: 2.5, dur: 7, every: 1, c: "#7fb2ff", k: "dome", fn: () => friendsNear(e.pid, dm.x, dm.y, 2.5).forEach(o => heal(o, o.maxhp * .03, true, e)) });
    return true;
  };
  FN["warrior.1.1"] = (e, r) => {
    const t0 = foes(e, e.x, e.y, 1.5).find(o => o.hp / o.maxhp < .3); if (!t0) return false;
    const dm = V(e, 1, 1, 0) + e.atk * .4, name = "Executioner's Whirlwind"; e.whirl = { until: T() + 2 };
    for (let k = 0; k < 4; k++) pending.push({ ab: name, at: +(T() + k * .5).toFixed(2), fn: () => { if (e.dead) return; aoe(e.x, e.y, 1.6, "#d9d9e0", .35); foes(e, e.x, e.y, 1.6).forEach(o => deal(e, o, dm, { aoe: 1, big: 1 })); } });
    return true;
  };
  FN["warrior.1.5"] = e => {
    if (e.hp / e.maxhp >= .4 || foes(e, e.x, e.y, 2.5).length < 3) return false;
    const now = T(); e.avatar = now + 7; setFx(e, "undying", 7); setFx(e, "ccimm", 7); setFx(e, "asbuf", 7, .5); heal(e, e.maxhp * .25, false, e, "Avatar of War"); return true;
  };
  FN["warrior.2.1"] = (e, r) => {
    const o = e.tgt; if (!live(o) || !(o.kind === "champ" || siege(o)) || d(e, o) > 2) return false;
    const bn = { pid: e.pid, x: e.x, y: e.y, r: 3.5, until: T() + 10, dmg: V(e, 2, 1, 0) / 100, sap: rk(e, 2, 3) ? V(e, 2, 3, 0) / 100 : 0, focus: null };
    banners.push(bn);
    addZone(e, { x: e.x, y: e.y, r: 3.5, dur: 10, every: 1, c: "#e2a33c", k: "banner", fn: () => { bn.focus = minBy(foes(e, bn.x, bn.y, 4), q => -q.hp) || null; } });
    if (rk(e, 2, 4)) foes(e, e.x, e.y, 2).forEach(q => { if (q.kind !== "champ") cc(q, "stun", 1); });
    return true;
  };
  FN["warrior.2.5"] = e => {
    const own = ents.filter(o => !o.dead && o.pid === e.pid && o.kind === "unit" && !siege(o) && !o.free);
    if (own.length < 4) return false;
    if (!ents.some(o => !o.dead && hostile(e.pid, o.pid) && (o.kind === "castle" || o.kind === "champ") && d(o, e) <= 7)) return false;
    own.forEach(o => { setFx(o, "msbuf", 8, .6); setFx(o, "atkbuf", 8, .2); setFx(o, "ccimm", 8); o.rallyUntil = T() + 8; o.rallyDone = false; });
    return true;
  };
  // ---- Shaman ----
  function chain(e, first, jumps, dmg0, slow, conduct) {
    let cur = first, from = e, dmg = dmg0; const hit = new Set();
    for (let j = 0; j < jumps && cur; j++) { shot(from, cur, "#8fd3ff", 2); deal(e, cur, dmg, { aoe: 1, big: 1 }); if (live(cur)) { if (slow) setFx(cur, "slow", 4, .2); if (conduct) setFx(cur, "vulnrng", 8, conduct); }
      hit.add(cur); from = cur; dmg *= .85; cur = minBy(foes(e, cur.x, cur.y, 2.5).filter(x => !hit.has(x)), x => d(x, from)); }
  }
  FN["shaman.0.1"] = (e, r) => {
    const f = minBy(foes(e, e.x, e.y, 4.5 + reach(e)).filter(o => foes(e, o.x, o.y, 2).length >= 3), o => d(o, e)); if (!f) return false;
    chain(e, f, ext([3, 4, 4], r) + (rk(e, 0, 4) ? 2 : 0), V(e, 0, 1, 1) + e.atk * .5, true, rk(e, 0, 3) ? V(e, 0, 3, 0) / 100 : 0); return true;
  };
  FN["shaman.0.2"] = (e, r) => {
    const n = foes(e, e.x, e.y, 1.5); if (n.length < 3) return false;
    aoe(e.x, e.y, 1.5, "#9fd0ff", .5); n.forEach(o => { deal(e, o, V(e, 0, 2, 0) + e.atk * .4, { aoe: 1, big: 1 }); if (live(o)) setFx(o, "slow", 2, .25); }); return true;
  };
  FN["shaman.0.5"] = e => {
    const p = densest(e, 5 + reach(e), 3, 5); if (!p) return false;
    const dmg = (45 + e.atk * .3) / 2;
    foes(e, p.x, p.y, 3).forEach(o => pull(o, p.x, p.y, 1.5));
    addZone(e, { x: p.x, y: p.y, r: 3, dur: 6, every: .5, c: "#9fd0ff", k: "storm", fn: z => foes(e, z.x, z.y, z.r).forEach(o => { deal(e, o, dmg, { aoe: 1 }); setFx(o, "asdown", .6, .4); }) });
    return { x: p.x, y: p.y };
  };
  FN["shaman.1.1"] = (e, r) => {
    if (!foes(e, e.x, e.y, 3).some(o => o.kind === "champ" || siege(o))) return false;
    const n = ext([2, 3, 3], r), dur = V(e, 1, 1, 1);
    foes(e, e.x, e.y, 3).sort((a, b) => d(a, e) - d(b, e) || a.id - b.id).slice(0, n).forEach(o => { cc(o, "root", dur); aoe(o.x, o.y, .6, "#8a5a2b", .6); }); return true;
  };
  FN["shaman.1.5"] = e => {
    const near = friendsNear(e.pid, e.x, e.y, 3); if (near.length < 4 || foes(e, e.x, e.y, 3).length < 3) return false;
    const o = add({ owner: e, pid: e.pid, kind: "totem", key: "relic", armour: "heavy", x: e.x + .5, y: e.y, maxhp: e.maxhp * 2.5, atk: 0, range: 0, as: 1, spd: 0, armor: .2, life: T() + 8, v3: 1, relic: 1, nextPulse: T() + 2 });
    o.hp = o.maxhp; o.hx = o.x; o.hy = o.y; relics.push(o); totems.push(o); return { x: o.x, y: o.y };
  };
  FN["shaman.2.1"] = (e, r) => {
    if (e.hp / e.maxhp >= .5) return false; const ns = foes(e, e.x, e.y, 3).sort((a, b) => d(a, e) - d(b, e) || a.id - b.id).slice(0, 3); if (!ns.length) return false;
    let tot = 0; ns.forEach(o => { shot(o, e, "#c9a0ff", 2); tot += deal(e, o, V(e, 2, 1, 0) + e.atk * .5, { aoe: 1, big: 1 }); }); addShield(e, tot, 6); return true;
  };
  FN["shaman.2.2"] = (e, r) => {
    const h = foes(e, e.x, e.y, 3).find(o => o.kind === "champ" && o.hp / o.maxhp < .5 && !fxv(o, "weaken")); if (!h) return false;
    setFx(h, "weaken", V(e, 2, 2, 0)); return { x: h.x, y: h.y };
  };
  FN["shaman.2.5"] = e => {
    const nf = foes(e, e.x, e.y, 3); if (!foes(e, e.x, e.y, 4).some(o => o.kind === "champ") && nf.length < 4) return false;
    foes(e, e.x, e.y, 2).forEach(o => cc(o, "stun", 1.5));
    [-1, 0, 1].forEach(s => { const w = add({ owner: e, pid: e.pid, kind: "summon", key: "wolf", atype: "blade", armour: "medium", x: e.x + s * .5, y: e.y + .3, maxhp: 630, atk: 48, range: 1.1, as: .8, spd: 2.5, armor: .15, life: T() + 30, healOwner: .15 }); w.hp = w.maxhp; w.hx = w.x; w.hy = w.y; });
    aoe(e.x, e.y, 2.2, "#bfe3ff", .9); ev({ ty: "ultfx", k: "spirit", x: e.x, y: e.y, r: 2.2, col: P[e.pid].color, dur: 1.8 }); return true;
  };
  // ---- Rogue ----
  FN["rogue.0.2"] = (e, r) => {
    const n = foes(e, e.x, e.y, 2); if (n.length < 3) return false;
    aoe(e.x, e.y, 2, "#55525e", 1.4); n.forEach(o => { setFx(o, "blind", V(e, 0, 2, 0), .4); if (o.tgt === e) o.tgt = null; if (o.aggro && o.aggro.src === e) o.aggro = null; }); return true;
  };
  FN["rogue.0.5"] = e => {
    const bl = foes(e, e.x, e.y, 6).filter(backline); if (bl.length < 3) return false;
    const order2 = bl.sort((a, b) => d(a, e) - d(b, e) || a.id - b.id).slice(0, 5), rankA = Math.max(1, rk(e, 0, 1)), dm = (nodeVal("rogue", 0, 1, 0, rankA) + e.atk) * 1.8 * .6;
    hide(e, 4, false);
    order2.forEach((v, k) => pending.push({ ab: "Shadow Dance", at: +(T() + .8 * (k + 1)).toFixed(2), fn: () => {
      if (e.dead || v.dead) return; const ox = e.x, oy = e.y; e.x = v.x + .4; e.y = v.y + .1;
      ev({ ty: "ultfx", k: "assassin", x0: ox, y0: oy, x: v.x, y: v.y, r: 1, dur: .6 }); slash(v, "#ff4a4a"); deal(e, v, dm, { aoe: 1, big: 1, noFinish: 1, keepStealth: 1 }); } }));
    return true;
  };
  FN["rogue.1.1"] = (e, r) => {
    const m = foes(e, e.x, e.y, 2.5).filter(o => (o.range || 1.1) < 1.5 && (o.kind === "unit" || o.kind === "champ" || o.kind === "summon")); if (m.length < 3) return false;
    const cx = m.reduce((s, o) => s + o.x, 0) / m.length, cy = m.reduce((s, o) => s + o.y, 0) / m.length, dps = V(e, 1, 1, 0), sl = V(e, 1, 1, 1) / 100, seen = new Map();
    addZone(e, { x: cx, y: cy, r: 1.2, dur: 5, every: 1, c: "#7ad84a", k: "poison", fn: z => foes(e, z.x, z.y, z.r).forEach(o => { deal(e, o, dps, { aoe: 1, atype: "pure", noFinish: 1 }); setFx(o, "slow", 1.1, sl); if (seen.get(o) !== T()) { seen.set(o, T()); addPoison(e, o, 1); } }) });
    return { x: cx, y: cy };
  };
  FN["rogue.1.5"] = e => {
    const p = densest(e, 4 + 2, 2, 5); if (!p) return false;
    const dps = (30 + e.atk * .4) / 2;
    addZone(e, { x: p.x, y: p.y, r: 2, dur: 7, every: .5, c: "#7ad84a", k: "poison", fn: z => foes(e, z.x, z.y, z.r).forEach(o => { deal(e, o, dps, { aoe: 1, atype: "pure", noFinish: 1 }); addPoison(e, o, 1); setFx(o, "blind", .6, .4); }) });
    return { x: p.x, y: p.y };
  };
  FN["rogue.2.5"] = e => {
    if (e.hp / e.maxhp >= .7) return false; const h = foes(e, e.x, e.y, 1.5).find(o => o.kind === "champ"); if (!h) return false;
    setFx(e, "bladefury", 5);
    for (let k = 0; k < 8; k++) pending.push({ ab: "Blade Fury", at: +(T() + .6 * (k + 1)).toFixed(2), fn: () => { if (e.dead || h.dead || d(e, h) > 2.4) return; slash(h, "#ff4a4a"); deal(e, h, e.atk * 1.4, { aoe: 1, big: 1, pierce: 1, noFinish: 1 }); } });
    return { x: h.x, y: h.y };
  };
  // ---- Mage ----
  FN["mage.0.1"] = (e, r) => {
    const p = densest(e, 4.5 + reach(e), 1.3, 3); if (!p) return false;
    shot(e, p.o, "#ff8a2a", 3);
    foes(e, p.x, p.y, 1.3).forEach(o => { let dm = V(e, 0, 1, 0) + e.atk; if (o === p.o && o.kind === "champ" && rk(e, 0, 4)) dm *= 1.5; deal(e, o, dm, { aoe: 1, big: 1 }); if (live(o) && o.kind !== "champ") cc(o, "stun", .5); });
    aoe(p.x, p.y, 1.3, "#ff8a2a", .5); return { x: p.x, y: p.y };
  };
  FN["mage.0.5"] = e => {
    let best = null, bn = 0;
    const cand = foes(e, e.x, e.y, 9);
    cand.forEach(o => { if (d(o, e) > 6 + reach(e)) return; const n = foes(e, o.x, o.y, 3).length; if (n >= 5 && n > bn) { best = { x: o.x, y: o.y }; bn = n; } });
    if (!best) ents.forEach(c => { if (!c.dead && c.kind === "castle" && hostile(e.pid, c.pid) && d(c, e) <= 6 + reach(e) + 2 && !best) best = { x: c.x, y: c.y }; });
    if (!best) return false;
    const x = best.x, y = best.y; ev({ ty: "warn", x, y, r: 3, c: "#ff5a2a", dur: 1.6 }); ev({ ty: "ultfx", k: "meteorfall", x, y, r: 3, dur: 1.6 });
    pending.push({ ab: "Meteor Strike", at: +(T() + 1.6).toFixed(2), fn: () => {
      ev({ ty: "ultfx", k: "meteorhit", x, y, r: 3, dur: 2.2 }); aoe(x, y, 3, "#ff7a2a", 1.2); aoe(x, y, 1.8, "#ffd27a", .8);
      foes(e, x, y, 3).forEach(o => { deal(e, o, 600 + e.atk * 3, { aoe: 1, big: 1 }); if (live(o)) cc(o, "stun", 1.5); });
      ents.filter(c => !c.dead && c.kind === "castle" && hostile(e.pid, c.pid) && hyp(c.x - x, c.y - y) <= 3).forEach(c => deal(e, c, 400, { aoe: 1, big: 1 }));
      walls.forEach(w => { if (w.hp > 0 && hostile(e.pid, w.pid) && hyp(w.x0 + .5 - x, w.y0 + .5 - y) <= 3) { w.hp = 0; aoe(w.x0 + .5, w.y0 + .5, .8, "#a08050", .5); } });
      addZone(e, { x, y, r: 2.2, dur: 6, every: 1, c: "#ff7a2a", k: "fire", fn: z => foes(e, z.x, z.y, z.r).forEach(o => deal(e, o, 35, { aoe: 1 })) }); } });
    return { x, y };
  };
  FN["mage.1.1"] = (e, r) => {
    if (!foes(e, e.x, e.y, 2).some(o => (o.range || 1.1) < 1.5 && (o.kind === "unit" || o.kind === "champ" || o.kind === "summon"))) return false;
    aoe(e.x, e.y, 2, "#9fd8ff", .8); const sh = rk(e, 1, 2) ? V(e, 1, 2, 0) / 100 : 0;
    foes(e, e.x, e.y, 2).forEach(o => { deal(e, o, V(e, 1, 1, 0) + e.atk * .5, { aoe: 1, big: 1 }); if (live(o)) { cc(o, "root", V(e, 1, 1, 1)); if (sh) o.shatter = V(e, 1, 2, 0) / 100; } });
    if (rk(e, 1, 3)) { addShield(e, e.maxhp * V(e, 1, 3, 0) / 100, 5); friendsNear(e.pid, e.x, e.y, 2).filter(o => o !== e && o.kind !== "castle").forEach(o => addShield(o, o.maxhp * V(e, 1, 3, 1) / 100, 5)); }
    return true;
  };
  FN["mage.1.5"] = e => {
    const p = densest(e, 6 + reach(e), 4, 6); if (!p) return false;
    const dps = (25 + e.atk * .3) / 2;
    addZone(e, { x: p.x, y: p.y, r: 4, dur: 8, every: .5, c: "#8fd8ff", k: "blizzard", fn: z => foes(e, z.x, z.y, z.r).forEach(o => { deal(e, o, dps, { aoe: 1 }); setFx(o, "slow", .6, .5); setFx(o, "asdown", .6, .3); }) });
    return { x: p.x, y: p.y };
  };
  FN["mage.2.1"] = (e, r) => {
    const lh = e.lastHurt; if (!lh || T() - lh.t > .6 || e.hp / e.maxhp >= .7) return false;
    if (!(lh.ab || (lh.src && (lh.src.range || 1.1) < 1.5))) return false;
    const p = P[e.pid]; if (e.orphan) return false; const sx = e.x, sy = e.y, sil = V(e, 2, 1, 0);
    X.blink(e, p.castle.x, p.castle.y); foes(e, sx, sy, 1.5).forEach(o => setFx(o, "silence", sil)); e.lastHurt = null; return { x: sx, y: sy };
  };
  FN["mage.2.2"] = (e, r) => { if (e.hp / e.maxhp >= .5) return false; addShield(e, e.maxhp * V(e, 2, 2, 0) / 100, 6); return true; };
  FN["mage.2.5"] = e => {
    const al = friendsNear(e.pid, e.x, e.y, 5).filter(o => o.kind !== "totem"), eh = foes(e, e.x, e.y, 5);
    if (!((al.length >= 4 && eh.filter(o => o.kind === "champ").length >= 2) || eh.length >= 6)) return false;
    addZone(e, { x: e.x, y: e.y, r: 5, dur: 6, every: .5, c: "#c9a0ff", k: "warp", fn: z => { friendsNear(e.pid, z.x, z.y, z.r).forEach(o => { setFx(o, "asbuf", .6, .5); setFx(o, "msbuf", .6, .5); }); foes(e, z.x, z.y, z.r).forEach(o => { if (o.kind === "champ") setFx(o, "cdfreeze", .6); }); } });
    return true;
  };
  // ---- Ranger ----
  FN["archer.0.1"] = (e, r) => {
    const p = densest(e, e.range + 2, 1.5, 3); if (!p) return false;
    const dm = V(e, 0, 1, 0) + e.atk * .5, vp = rk(e, 0, 3) ? V(e, 0, 3, 0) / 100 : 0;
    const volley = half => { aoe(p.x, p.y, 1.5, "#d9c38a", .5); foes(e, p.x, p.y, 1.5).forEach(o => { deal(e, o, dm * (half ? .5 : 1), { aoe: 1, big: 1 }); if (live(o) && !half) { setFx(o, "slow", 3, .3); if (vp) setFx(o, "vulnpierce", 6, vp); } }); };
    ev({ ty: "shot", x1: e.x, y1: e.y - .35, x2: p.x, y2: p.y - .35, c: "#f1e6c0", w: 2 }); volley(false);
    if (rk(e, 0, 4)) pending.push({ ab: "Arrow Volley", at: +(T() + .6).toFixed(2), fn: () => { if (!e.dead) volley(true); } });
    return { x: p.x, y: p.y };
  };
  FN["archer.0.5"] = e => {
    if (!live(e.tgt) || d(e, e.tgt) > e.range + 1.5 || foes(e, e.tgt.x, e.tgt.y, 3).length < 4) return false;
    const x = e.tgt.x, y = e.tgt.y, dm = 106; log(`${X.poss(e.pid)} Ranger looses a Rain of Feathered Death.`);
    for (let i = 0; i < 14; i++) pending.push({ ab: "Rain of Feathered Death", at: +(T() + i * .4).toFixed(2), fn: () => { ev({ ty: "ultfx", k: "arrowwave", x, y, r: 3.4, dur: .85 }); aoe(x, y, 3.4, "#d9c38a", .4); foes(e, x, y, 3.4).forEach(o => { deal(e, o, dm, { aoe: 1 }); setFx(o, "asdown", 1, .4); }); } });
    return true;
  };
  FN["archer.1.1"] = (e, r) => {
    if (!foes(e, e.x, e.y, 2).some(o => (o.range || 1.1) < 1.5 && (o.kind === "unit" || o.kind === "champ" || o.kind === "summon"))) return false;
    dropTrap(e, e.x, e.y, r); return true;
  };
  FN["archer.1.2"] = (e, r) => { const h = foes(e, e.x, e.y, 3).find(o => o.kind === "champ"); if (!h) return false; shot(e, h, "#c9a46a", 2); setFx(h, "root", V(e, 1, 2, 0)); txt(h, "Netted", "#e8cf9a"); return { x: h.x, y: h.y }; };
  FN["archer.1.5"] = e => {
    const fs = foes(e, e.x, e.y, 5); if (fs.length < 4) return false;
    const cx = fs.reduce((s, o) => s + o.x, 0) / fs.length, cy = fs.reduce((s, o) => s + o.y, 0) / fs.length, L = hyp(cx - e.x, cy - e.y) || 1, ux = (cx - e.x) / L, uy = (cy - e.y) / L, px = -uy, py = ux;
    const tier = Math.max(1, Math.min(3, P[e.pid].castleTier || 1)), blocked = (tx, ty) => { const c0 = Math.floor(tx), r0 = Math.floor(ty); if (c0 < 0 || r0 < 0 || c0 >= NN || r0 >= NN) return true; if (hyp(tx - NN / 2, ty - NN / 2) <= CTR_R + .5) return true;
      if (walls.some(w => w.x0 === c0 && w.y0 === r0 && w.hp > 0)) return true; if (ents.some(o => !o.dead && o.kind === "castle" && Math.floor(o.x) === c0 && Math.floor(o.y) === r0)) return true; if (ents.some(o => !o.dead && o.kind !== "totem" && hyp(o.x - (c0 + .5), o.y - (r0 + .5)) < .55)) return true; return false; };
    [-.5, .5].forEach(s => { const tx = e.x + ux * 2 + px * s, ty = e.y + uy * 2 + py * s; if (blocked(tx, ty)) return;
      const w = { id: walls.length, pid: e.pid, x0: Math.floor(tx), y0: Math.floor(ty), dir: Math.abs(uy) >= Math.abs(ux) ? "h" : "v", hp: WALL_TIERS[tier - 1].hp, maxhp: WALL_TIERS[tier - 1].hp, tier, born: T() }; walls.push(w); aoe(w.x0 + .5, w.y0 + .5, .8, "#c9a46a", .6); });
    const rank = Math.max(1, rk(e, 1, 1)); [-1, 0, 1].forEach(s => dropTrap(e, e.x + ux * 3.3 + px * s * 1.1, e.y + uy * 3.3 + py * s * 1.1, rank)); return true;
  };
  FN["archer.2.1"] = (e, r) => {
    const h = foes(e, e.x, e.y, e.range + .5).find(o => o.kind === "champ"); if (!h) return false;
    const dmg = (V(e, 2, 1, 0) + e.atk * 2) * 1.5, cdTot = cdOf(e, 2, 1), key = "2.1"; setFx(e, "aim", 1.2);
    ev({ ty: "warn", x: h.x, y: h.y, r: .8, c: "#e6e6c8", dur: 1.2 });
    pending.push({ ab: "Headshot", at: +(T() + 1.2).toFixed(2), fn: () => {
      if (e.dead) return; if (h.dead || d(e, h) > e.range + 1 || !X.vis(h, e)) { e.cds[key] -= cdTot / 2; txt(e, "Lost", "#ccc"); return; }
      shot(e, h, "#e6e6c8", 3); deal(e, h, dmg, { aoe: 1, big: 1, crit: 1, pierce: rk(e, 2, 3) ? V(e, 2, 3, 0) / 100 : 0 });
      if (live(h)) { setFx(h, "silence", 1); if (rk(e, 2, 3)) X.addDot(h, e, h.maxhp * .02, 5, "bleed"); if (rk(e, 2, 2)) setFx(h, "vuln", 6, V(e, 2, 2, 0) / 100); } } });
    return { x: h.x, y: h.y };
  };
  FN["archer.2.5"] = e => {
    const h = foes(e, e.x, e.y, 9).filter(o => o.kind === "champ" && (o.hp / o.maxhp < .5 || X.isBounty(o.pid))).sort((a, b) => d(a, e) - d(b, e) || a.id - b.id)[0]; if (!h) return false;
    const x = h.x, y = h.y; ev({ ty: "warn", x, y, r: .9, c: "#ffd36a", dur: 1 });
    pending.push({ ab: "Dragon-Slayer Shot", at: +(T() + 1).toFixed(2), fn: () => {
      if (e.dead || h.dead) return; const L = hyp(h.x - e.x, h.y - e.y) || 1, ux = (h.x - e.x) / L, uy = (h.y - e.y) / L;
      ev({ ty: "shot", x1: e.x, y1: e.y - .35, x2: h.x + ux * 3, y2: h.y + uy * 3 - .35, c: "#ffd36a", w: 4 });
      foes(e, h.x, h.y, 3.2).forEach(o => { if (o === h) return; const px = o.x - e.x, py = o.y - e.y, proj = px * ux + py * uy; if (proj < 0) return; if (Math.abs(px * uy - py * ux) <= .7) deal(e, o, 150, { aoe: 1, big: 1 }); });
      deal(e, h, (500 + e.atk * 6) * (h.hp / h.maxhp < .4 ? 1.5 : 1), { aoe: 1, big: 1, crit: 1, capAbs: h.maxhp * .5 }); } });
    return { x, y };
  };
  return { setup, postSetup, onRespawn, cast, react, tick, world, basic, stealthTarget, mul, blocked, absorb, redirect, dodgeChance, onDodge, onDamaged, onDealt, onKill, goldMul, wallMul, totemTick, trapFire, shieldAmt, zones, totems, banners, addShield };
}
