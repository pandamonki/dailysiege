// Turning everyone's orders into battle plans

function buildPlans() {
  ensureDip();
  const youPieces = myPieces();
  if (!youPieces.some(p => p.kind === "champ")) { const sp = armySpots(CASTLE, N); youPieces.push({ kind: "champ", r: sp.champ[0], c: sp.champ[1] }); }
  const plans = [{
    pid: "you", me: true, name: "You", color: YOU_COLOR, cls: S.cls, castle: CASTLE, ranks: S.ranks, picks: S.picks, triggers: S.triggers, gear: S.gear, defences: S.defences,
    level: level(), xp0: S.xp || 0, items: (S.items || []).slice(), castleTier: S.castle || 1, banner: S.banner, ...pactPlan(),
    stance: S.stance, prio: S.prio, rules: S.rules, pieces: youPieces,
    targets: S.lists.hostile.slice(), tmode: S.strategy.mode, heading: S.strategy.heading, offers: Object.fromEntries(S.lists.ally.filter(id => S.offers[id]).map(id => [id, S.offers[id]])), terms: S.terms,
  }];
  RIVALS.forEach((rv, i) => {
    const ai = RIVAL_AI[rv.id], c = CLASSES[rv.cls];
    const picks = {}; c.abilities.forEach((a, j) => picks[a.key] = a.choice[hash(i, j, 77) > .5 ? 1 : 0][0]);
    const rot = Math.floor(hash(i, 5, 3) * PRIORITIES.length);
    plans.push({
      pid: rv.id, name: rv.name, color: rv.color, cls: rv.cls, castle: rv.pos, leader: rv.id === LEADER, level: DAY, ranks: autoRanks(DAY, i + 3), picks, items: botItems(i), castleTier: rv.ctier || 1, banner: rv.banner || null,
      triggers: { a1: TRIGGERS[1], a2: TRIGGERS[2], a3: TRIGGERS[0], ult: TRIGGERS[1] },
      gear: { weapon: Math.floor(hash(i, 1, 21) * 3), armour: Math.floor(hash(i, 2, 22) * 3), charm: Math.floor(hash(i, 3, 23) * 2) },
      defences: { walls: hash(i, 4, 24) > .6 ? 1 : 0, tower: hash(i, 5, 25) > .6 ? 1 : 0 },
      stance: ai.stance, prio: PRIORITIES.slice(rot).concat(PRIORITIES.slice(0, rot)),
      rules: [{ if: IFS[0], then: THENS[0] }],
      pieces: RARMY.filter(u => u.rid === rv.id).map(u => u.champ ? { kind: "champ", r: u.r, c: u.c } : { kind: "unit", type: u.key, lvl: u.lvl, hp: u.hp, r: u.r, c: u.c }).concat(RWALLS.filter(w => w.rid === rv.id).map(w => ({ kind: "wall", r: w.r, c: w.c, dir: w.dir }))),
      targets: (ai.hostile || []).concat(["you", ...RIVALS.map(r => r.id)].filter(q => q !== rv.id && !(ai.hostile || []).includes(q) && !Object.keys(ai.offers || {}).includes(q))
        .sort((x, y) => { const px = x === "you" ? CASTLE : RIVALS.find(r => r.id === x).pos, py = y === "you" ? CASTLE : RIVALS.find(r => r.id === y).pos; return Math.hypot(px[0] - rv.pos[0], px[1] - rv.pos[1]) - Math.hypot(py[0] - rv.pos[0], py[1] - rv.pos[1]); })),
      offers: ai.offers || {}, terms: ai.terms || {},
    });
  });
  { const rm = rankMap(PRACTICE_BOARD, plans.map(q => q.pid)); plans.forEach(q => { q.rank = rm[q.pid]; }); }
  resolveAlliances(plans, { persist: S.pairs || [], final: DAY === 7 });
  return plans;
}
