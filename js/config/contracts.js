// Daily contracts and the twist of the day (battles fought on or after CONTRACTS_FROM; earlier saved battles replay as fought).
//
// Twist: every day from day 2 has one rule change, the same for everyone and shown a day ahead. It is drawn per war week
// from TWISTS, so no twist repeats inside a week. Some change the battle (passed to runBattle as opts.twist and saved in the
// battle's inputs); the others change the shop or the contract payouts.
//
// Contracts: each morning every lord is offered three (one easy, one hard, one aimed at a named rival) and may take one with their
// orders. After the battle the server checks it against what happened and pays bonus points and gold on top of the day's result.
// Contract points are not multiplied by the late-week day weight. Everything here is pure: the server and every phone get the same answer.

let CONTRACTS_FROM = "2026-11-16"; const contractsFor = d => String(d) >= CONTRACTS_FROM;

const TWIST_SIEGE = 1.3, TWIST_IRON = 1.3, TWIST_BLOODMOON = 2, TWIST_HILL = 2.5, TWIST_MARKET = .75;
const TWISTS = {
  market:    { name: "Market Day",     icon: "🛒", note: "Items in the shop cost 25% less." },
  bloodmoon: { name: "Blood Moon",     icon: "🌕", note: "Slaying a hero pays double gold." },
  siege:     { name: "Siege Weather",  icon: "🔥", note: "Soldiers deal 30% more damage to castles." },
  iron:      { name: "Iron Walls",     icon: "🧱", note: "Every castle has 30% more health." },
  hill:      { name: "Golden Hill",    icon: "⛰", note: "Holding the battleground pays 2.5 times the gold and experience." },
  goldrush:  { name: "Gold Rush",      icon: "💰", note: "Contracts pay double gold." },
  glory:     { name: "Day of Glory",   icon: "🏆", note: "Contracts pay double points." },
};
const TWIST_IDS = Object.keys(TWISTS);
const CALM_DAY = { name: "Muster Day", icon: "🏳", note: "No twist on the first day. Learn the field." };

function cxHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function cxShuffle(list, seed) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(cxHash(seed + ":" + i) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// the twist id for a day of a war week (null on day 1). weekKey: the date the week began (any string works for practice).
function dayTwist(weekKey, dayNo) { if (!dayNo || dayNo < 2) return null; return cxShuffle(TWIST_IDS, "tw" + weekKey)[(dayNo - 2) % TWIST_IDS.length]; }
const twistInfo = id => (id && TWISTS[id]) || CALM_DAY;

// ----- contracts -----
// tier 1 easy, 2 hard, 3 rival. check(s, me, tgt) reads the outcome built by contractOutcome below.
const CONTRACT_PAY = { 1: { pts: 2, gold: 60 }, 2: { pts: 3, gold: 100 }, 3: { pts: 5, gold: 150 } };
const CONTRACTS = {
  butcher:    { tier: 1, name: "Butcher",        icon: "🪓", text: () => "Cut down 8 enemy soldiers.",                       check: o => o.ukills >= 8 },
  hill:       { tier: 2, name: "King of the Hill", icon: "⛰", text: () => "Keep your hero on the battleground for 10 seconds in all. Marching on the battleground in Orders helps.", check: o => o.onHill >= 10 },
  stand:      { tier: 1, name: "Stand Firm",     icon: "🛡", text: () => "Keep your castle standing until 1:30.",              check: o => o.fellAt == null || o.fellAt >= 90 },
  siegework:  { tier: 1, name: "Sapper",         icon: "🔨", text: () => "Deal 400 damage to enemy castles.",                  check: o => o.toCastle >= 400 },
  headhunter: { tier: 2, name: "Headhunter",     icon: "🎯", text: () => "Slay 2 enemy heroes.",                               check: o => o.kills >= 2 },
  raze:       { tier: 2, name: "Raze",           icon: "🔥", text: () => "Take an enemy castle.",                              check: o => o.castles >= 1 },
  deathless:  { tier: 2, name: "Deathless",      icon: "💀", text: () => "Your hero never falls.",                             check: o => o.heroDeaths === 0 },
  podium:     { tier: 2, name: "Podium",         icon: "🥉", text: () => "Finish in the top three.",                           check: o => o.place <= 3 },
  fortress:   { tier: 2, name: "Unbroken",       icon: "🏰", text: () => "End the battle with your castle above half health.",  check: o => o.fellAt == null && o.castleEnd > .5 },
  hunt:       { tier: 3, name: "Hunt",           icon: "🏹", text: n => `Slay ${n}'s hero.`,                                   check: (o, t) => (o.heroSlain[t] || 0) >= 1 },
  sack:       { tier: 3, name: "Sack",           icon: "⚔", text: n => `Deal 200 damage to ${n}'s castle, or take it.`,        check: (o, t) => (o.castleHit[t] || 0) >= 200 || o.took.includes(t) },
  revenge:    { tier: 3, name: "Revenge",        icon: "🩸", text: n => `${n} hurt you last battle. Slay their hero or take their castle.`, check: (o, t) => (o.heroSlain[t] || 0) >= 1 || o.took.includes(t) },
  topple:     { tier: 3, name: "Topple the Leader", icon: "👑", text: n => `${n} leads the board. Slay their hero or deal 300 damage to their castle.`, check: (o, t) => (o.heroSlain[t] || 0) >= 1 || (o.castleHit[t] || 0) >= 300 },
};
const contractKey = (id, tgt) => tgt ? id + "@" + tgt : id;
const contractParse = key => { const [id, tgt] = String(key || "").split("@"); return CONTRACTS[id] ? { id, tgt: tgt || null, c: CONTRACTS[id] } : null; };

// The three offers for one lord on one day. ctx: { uid, dayKey, rivals: [uids], leader, nemesis (who took my castle or slew my hero last battle) }
function contractOffers(ctx) {
  const seed = `${ctx.dayKey}|${ctx.uid}`, pick = (ids, s) => ids[Math.floor(cxHash(seed + s) * ids.length)];
  const t1 = Object.keys(CONTRACTS).filter(k => CONTRACTS[k].tier === 1), t2 = Object.keys(CONTRACTS).filter(k => CONTRACTS[k].tier === 2);
  const out = [contractKey(pick(t1, "e")), contractKey(pick(t2, "h"))];
  const rivals = (ctx.rivals || []).filter(r => r !== ctx.uid);
  if (rivals.length) {
    if (ctx.nemesis && rivals.includes(ctx.nemesis)) out.push(contractKey("revenge", ctx.nemesis));
    else if (ctx.leader && ctx.leader !== ctx.uid && rivals.includes(ctx.leader) && cxHash(seed + "l") < .5) out.push(contractKey("topple", ctx.leader));
    else out.push(contractKey(pick(["hunt", "sack"], "r"), pick(rivals, "t")));
  }
  return out;
}
// What a contract check reads about one lord, from a battle result (works on a fast run too).
function contractOutcome(res, pid) {
  const r = res.results.find(x => x.pid === pid) || {}, s = (res.stats && res.stats[pid]) || {}, me = res.tel.ents.filter(e => e.pid === pid);
  const castleHit = {}; Object.entries(res.stats || {}).forEach(([vic, v]) => { if (v.castleBy && v.castleBy[pid]) castleHit[vic] = v.castleBy[pid]; });
  const took = Object.entries(res.stats || {}).filter(([, v]) => v.fellTo === pid).map(([vic]) => vic);
  return { place: r.place || 99, kills: r.kills || 0, ukills: r.ukills || 0, castles: r.castles || 0, fellAt: r.fellAt ?? null, hold: s.hold || 0, onHill: s.onHill || 0, castleEnd: s.castleEnd ?? 1,
    heroSlain: s.heroSlain || {}, castleHit, took, toCastle: me.reduce((a, e) => a + (e.toCastle || 0), 0), heroDeaths: me.filter(e => e.kind === "champ").reduce((a, e) => a + (e.deaths || 0), 0) };
}
// Check every lord's contract. picks: { pid: contractKey }, offers: { pid: [keys] } (a pick that was not offered is ignored).
// Returns { pid: { key, ok, pts, gold } }.
function settleContracts(res, picks, offers, twist) {
  const out = {};
  Object.entries(picks || {}).forEach(([pid, key]) => {
    const k = contractParse(key); if (!k || !res.results.some(r => r.pid === pid)) return;
    if (offers && !(offers[pid] || []).includes(key)) return;
    const ok = !!k.c.check(contractOutcome(res, pid), k.tgt), pay = CONTRACT_PAY[k.c.tier];
    out[pid] = { key, ok, pts: ok ? pay.pts * (twist === "glory" ? 2 : 1) : 0, gold: ok ? pay.gold * (twist === "goldrush" ? 2 : 1) : 0 };
  });
  return out;
}
const contractText = (key, nameOf) => { const k = contractParse(key); return k ? k.c.text(k.tgt ? nameOf(k.tgt) : "") : ""; };
