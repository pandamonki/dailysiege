// Mercenary camp: groups of sell-swords that serve the highest sealed bid for one battle, then rest for 2 days
const MERC_DAY = 4, MERC_COOL = 2;
const MERCS = {
  troll:   { name: "Troll Warlord", min: 200, units: ["trollw"], note: "One huge brute that heals itself as it fights." },
  orcs:    { name: "Orc Berserkers", min: 180, units: ["orc", "orc", "orc", "orc"], note: "Four fast, hard-hitting melee raiders." },
  centaur: { name: "Centaur Archers", min: 210, units: ["centaur", "centaur", "centaur"], note: "Three swift archers who shoot from afar." },
  elves:   { name: "Dark Elf Assassins", min: 170, units: ["delf", "delf"], note: "Two fragile killers who hunt enemy heroes across the map." },
  ogre:    { name: "Ogre Breaker", min: 260, units: ["ogre"], note: "Slow, tough and castle-only. Smashes castle after castle." },
  necro:   { name: "Bone Crew", min: 240, units: ["necro", "skel", "skel", "skel", "skel"], note: "A necromancer who drains life, with four skeleton guards." },
};
const MERC_UNITS = {
  trollw:  [{ name: "Troll Warlord", hp: 900, atk: 38 }, { range: 1.2, as: 1.1, spd: 1.4, armor: .15, regen: 6 }, ["blade", "heavy"], [.5, 5]],
  orc:     [{ name: "Orc Berserker", hp: 230, atk: 30 }, { range: 1.1, as: .9, spd: 2.1, armor: .05 }, ["blade", "medium"], [.36, 2.4]],
  centaur: [{ name: "Centaur Archer", hp: 210, atk: 26 }, { range: 3.5, as: 1.1, spd: 2.2, armor: 0, shot: "#f1e6c0" }, ["pierce", "light"], [.34, 2.4]],
  delf:    [{ name: "Dark Elf Assassin", hp: 130, atk: 40 }, { range: 1.1, as: .7, spd: 2.6, armor: 0, hunter: 1 }, ["blade", "light"], [.3, 1.6]],
  ogre:    [{ name: "Ogre Breaker", hp: 650, atk: 110 }, { range: 1.2, as: 1.4, spd: .9, armor: .1, rammer: 1 }, ["siege", "heavy"], [.52, 5.5]],
  necro:   [{ name: "Necromancer", hp: 160, atk: 20 }, { range: 3.2, as: 1.3, spd: 1.3, armor: 0, shot: "#7fe08a", lifesteal: .3 }, ["magic", "light"], [.3, 1.4]],
  skel:    [{ name: "Skeleton Guard", hp: 60, atk: 11 }, { range: 1.1, as: .9, spd: 1.7, armor: 0 }, ["blade", "light"], [.28, 1.2]],
};
Object.entries(MERC_UNITS).forEach(([k, [u, s, ty, body]]) => { UNITS[k] = Object.assign({ cost: 0, merc: true, note: "" }, u); UNIT_SIM[k] = s; UNIT_TYPES[k] = ty; BODY[k] = body; });
// 0 when the group is free to hire on this day, otherwise the days still to wait. docs: a function that gives the finished battle of a given earlier day (or null)
const mercCool = (id, dayAt, docOf) => { for (let k = 1; k <= MERC_COOL; k++) { const doc = docOf(k); if (doc && doc.mercs && doc.mercs[id]) return MERC_COOL + 1 - k; } return 0; };
const mercHash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003; return h; };
function mercSpots(castle, size, used) {
  const [r, c] = castle, ctr = (size - 1) / 2, dy = ctr - r, dx = ctr - c, L = Math.sqrt(dx * dx + dy * dy) || 1, uy = dy / L, ux = dx / L, py = ux, px = -uy, out = [];
  [3.3, 4.4, 5.5].forEach(f => [0, -1.2, 1.2, -2.4, 2.4].forEach(sd => { const q = [Math.round(r + uy * f + py * sd), Math.round(c + ux * f + px * sd)];
    if (q[0] >= 0 && q[1] >= 0 && q[0] < size && q[1] < size && !used.has(q.join(",")) && !out.some(o => o[0] === q[0] && o[1] === q[1])) out.push(q); }));
  return out;
}
// sealed bids: highest bid per group wins (tie: a fair coin from the day), the winner's own bid is what they pay
function resolveMercs(plans, o) {
  const hires = {}, notes = [];
  Object.entries(MERCS).forEach(([id, m]) => {
    if (o.cool(id) > 0) return;
    const bids = plans.map(p => [p, (p.bids || {})[id]]).filter(([, b]) => b && b.day === o.day && b.gold >= m.min);
    if (!bids.length) return;
    const top = Math.max(...bids.map(x => x[1].gold)), tied = bids.filter(x => x[1].gold === top).sort((a, b) => (a[0].pid < b[0].pid ? -1 : 1));
    const w = tied[tied.length === 1 ? 0 : mercHash(String(o.day) + id) % tied.length][0];
    hires[id] = { pid: w.pid, gold: top, bidders: bids.length, all: bids.map(([p, b]) => ({ pid: p.pid, gold: b.gold })).sort((a, b) => b.gold - a.gold || (a.pid < b.pid ? -1 : 1)) };
    const used = new Set((w.pieces || []).map(pc => pc.r + "," + pc.c)), sp = mercSpots(w.castle, o.N, used);
    m.units.forEach((type, i) => { const q = sp[i % Math.max(1, sp.length)] || [w.castle[0], w.castle[1]]; used.add(q.join(",")); w.pieces.push({ kind: "unit", type, lvl: 1, hp: 1, r: q[0], c: q[1], merc: id, bid: i === 0 ? top : 0 }); });
    notes.push(`${w.name} hired the ${m.name} for ${top} gold${bids.length > 1 ? `, outbidding ${bids.length - 1} other lord${bids.length > 2 ? "s" : ""}` : ""}.`);
  });
  return { hires, notes };
}
