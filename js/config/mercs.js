// Mercenary camp: groups of sell-swords that serve the highest sealed bid for one battle, then rest for 2 days
const MERC_DAY = 4, MERC_COOL = 2;
const MERCS = {
  troll:   { name: "Troll Warlord", min: 280, units: ["trollw"], note: "One huge brute that heals itself as it fights." },
  orcs:    { name: "Orc Berserkers", min: 260, units: ["orc", "orc", "orc", "orc"], note: "Four fast, hard-hitting melee raiders." },
  centaur: { name: "Centaur Archers", min: 290, units: ["centaur", "centaur", "centaur"], note: "Three swift archers who shoot from afar." },
  elves:   { name: "Dark Elf Assassins", min: 250, units: ["delf", "delf"], note: "Two fragile killers who hunt enemy heroes across the map." },
  ogre:    { name: "Ogre Breaker", min: 340, units: ["ogre2"], units1: ["ogre"], note: "Slow, tough and castle-only. Smashes castle after castle." },
  necro:   { name: "Bone Crew", min: 320, units: ["necro2", "skel2", "skel2", "skel2", "skel2"], units1: ["necro", "skel", "skel", "skel", "skel"], note: "A necromancer who drains life, with four skeleton guards." },
  warhost: { name: "Troll War Host", min: 400, units: ["trollw", "orc", "orc"], note: "The Troll Warlord at the head of two Orc Berserkers. The strongest band in the camp." },
};
// From MERC_V2_FROM the camp has one new headline group a day, growing stronger through the week, plus three regular tiles.
// A headliner becomes a regular group the day after it arrives. Each lord can win at most one group a day.
let MERC_V2_FROM = "2026-11-16"; const mercV2For = d => String(d) >= MERC_V2_FROM;
const MERC_V1_IDS = ["troll", "orcs", "centaur", "elves", "ogre", "necro"]; // the camp before the headliners
const MERC_MIN_V1 = { troll: 200, orcs: 180, centaur: 210, elves: 170, ogre: 260, necro: 240 }; // its minimum bids
const mercMin = (id, v2) => (v2 ? MERCS[id].min : MERC_MIN_V1[id]);
const MERC_BASIC = ["elves", "orcs", "centaur"], MERC_HEAD = ["troll", "necro", "ogre", "warhost"], MERC_TILES = 3; // headliners for days 4, 5, 6 and 7
const mercHeadIdx = dayNo => Math.max(0, Math.min(MERC_HEAD.length - 1, dayNo - MERC_DAY));
const mercHeadline = dayNo => (dayNo >= MERC_DAY ? MERC_HEAD[mercHeadIdx(dayNo)] : null);
// the camp on day dayNo: the headliner, and three regular tiles (yesterday's headliners newest first, then the basic groups; groups that are resting go last)
function mercRoster(dayNo, cool) {
  const head = mercHeadline(dayNo); if (!head) return { head: null, tiles: [], open: [] };
  const pool = MERC_HEAD.slice(0, mercHeadIdx(dayNo)).reverse().concat(MERC_BASIC).filter(id => id !== head);
  const tiles = pool.filter(id => !(cool(id) > 0)).concat(pool.filter(id => cool(id) > 0)).slice(0, MERC_TILES);
  return { head, tiles, open: [head, ...tiles].filter(id => !(cool(id) > 0)) }; // open: the groups that can be bid on, headliner first
}
const MERC_UNITS = {
  trollw:  [{ name: "Troll Warlord", hp: 900, atk: 38 }, { range: 1.2, as: 1.1, spd: 1.4, armor: .15, regen: 6 }, ["blade", "heavy"], [.5, 5]],
  orc:     [{ name: "Orc Berserker", hp: 230, atk: 30 }, { range: 1.1, as: .9, spd: 2.1, armor: .05 }, ["blade", "medium"], [.36, 2.4]],
  centaur: [{ name: "Centaur Archer", hp: 210, atk: 26 }, { range: 3.5, as: 1.1, spd: 2.2, armor: 0, shot: "#f1e6c0" }, ["pierce", "light"], [.34, 2.4]],
  delf:    [{ name: "Dark Elf Assassin", hp: 130, atk: 40 }, { range: 1.1, as: .7, spd: 2.6, armor: 0, hunter: 1 }, ["blade", "light"], [.3, 1.6]],
  ogre:    [{ name: "Ogre Breaker", hp: 650, atk: 110 }, { range: 1.2, as: 1.4, spd: .9, armor: .1, rammer: 1 }, ["siege", "heavy"], [.52, 5.5]],
  necro:   [{ name: "Necromancer", hp: 160, atk: 20 }, { range: 3.2, as: 1.3, spd: 1.3, armor: 0, shot: "#7fe08a", lifesteal: .3 }, ["magic", "light"], [.3, 1.4]],
  skel:    [{ name: "Skeleton Guard", hp: 60, atk: 11 }, { range: 1.1, as: .9, spd: 1.7, armor: 0 }, ["blade", "light"], [.28, 1.2]],
  // from MERC_V2_FROM (units1 holds the group as it was before): a tougher Bone Crew and a softer Ogre, so no single group decides a battle
  ogre2:   [{ name: "Ogre Breaker", hp: 600, atk: 80 }, { range: 1.2, as: 1.4, spd: .9, armor: .1, rammer: 1 }, ["siege", "heavy"], [.52, 5.5]],
  necro2:  [{ name: "Necromancer", hp: 320, atk: 30 }, { range: 3.2, as: 1.3, spd: 1.3, armor: 0, shot: "#7fe08a", lifesteal: .3 }, ["magic", "light"], [.3, 1.4]],
  skel2:   [{ name: "Skeleton Guard", hp: 170, atk: 18 }, { range: 1.1, as: .9, spd: 1.7, armor: .1 }, ["blade", "light"], [.28, 1.2]],
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
// v2 (o.v2, with o.dayNo): only today's camp can be bid on, headliner first, and a lord who has already won a group today is passed over
function resolveMercs(plans, o) {
  const hires = {}, notes = [], won = new Set();
  const ids = o.v2 ? mercRoster(o.dayNo, o.cool).open : MERC_V1_IDS;
  ids.forEach(id => { const m = MERCS[id];
    if (o.cool(id) > 0) return;
    const bids = plans.map(p => [p, (p.bids || {})[id]]).filter(([p, b]) => b && b.day === o.day && b.gold >= mercMin(id, o.v2) && !(o.v2 && won.has(p.pid)));
    if (!bids.length) return;
    const top = Math.max(...bids.map(x => x[1].gold)), tied = bids.filter(x => x[1].gold === top).sort((a, b) => (a[0].pid < b[0].pid ? -1 : 1));
    const w = tied[tied.length === 1 ? 0 : mercHash(String(o.day) + id) % tied.length][0];
    won.add(w.pid); hires[id] = { pid: w.pid, gold: top, bidders: bids.length, all: bids.map(([p, b]) => ({ pid: p.pid, gold: b.gold })).sort((a, b) => b.gold - a.gold || (a.pid < b.pid ? -1 : 1)) };
    const used = new Set((w.pieces || []).map(pc => pc.r + "," + pc.c)), sp = mercSpots(w.castle, o.N, used);
    (!o.v2 && m.units1 || m.units).forEach((type, i) => { const q = sp[i % Math.max(1, sp.length)] || [w.castle[0], w.castle[1]]; used.add(q.join(",")); w.pieces.push({ kind: "unit", type, lvl: 1, hp: 1, r: q[0], c: q[1], merc: id, bid: i === 0 ? top : 0 }); });
    notes.push(`${w.name} hired the ${m.name} for ${top} gold${bids.length > 1 ? `, outbidding ${bids.length - 1} other lord${bids.length > 2 ? "s" : ""}` : ""}.`);
  });
  return { hires, notes };
}
