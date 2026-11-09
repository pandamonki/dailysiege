// Rival AI personalities, auto skill ranks and bot items

const RIVAL_AI = {
  p1: { stance: "aggressive", offers: { you: { gold: 150 } }, terms: { you: { mode: "accept", min: 100 } } },
  p2: { stance: "skirmish", offers: { p3: { gold: 0 } }, terms: { you: { mode: "betray", min: 150, when: "When 3 players remain" } } },
  p3: { stance: "aggressive", offers: { p2: { gold: 0, rigged: true } }, terms: { you: { mode: "accept", min: 300 } } },
  p4: { stance: "cautious", hostile: ["p5"], offers: { you: { gold: 120, rigged: true } }, terms: { you: { mode: "accept", min: 200 } } },
  p5: { stance: "aggressive", hostile: ["you"], terms: { you: { mode: "refuse" } } },
  p6: { stance: "cautious", offers: { p7: { gold: 0 } }, terms: { you: { mode: "accept", min: 100 } } },
  p7: { stance: "skirmish", offers: { p6: { gold: 0 } }, terms: { you: { mode: "betray", min: 250, when: "At the 2-minute mark" } } },
};

function autoRanks(lvl, seed) {
  const r = { a1: 0, a2: 0, a3: 0, ult: 0, a4: 0 }, order = ["a1", "a2", "a3"].sort((a, b) => hash(seed, a.charCodeAt(1)) - hash(seed, b.charCodeAt(1)));
  for (let p = 0; p < lvl; p++) {
    if (canRankAt("ult", r.ult, lvl)) { r.ult++; continue; }
    const ks = order.filter(k => canRankAt(k, r[k], lvl)).sort((x, y) => r[x] - r[y]);
    if (ks.length) r[ks[0]]++; else if (canRankAt("a4", r.a4, lvl)) r.a4++;
  }
  return r;
}

const BOT_ITEM_POOL = ["boots", "gauntlets", "ringprot", "salve", "elixir", "net", "frostdagger", "fang", "banner", "standard", "thornmail", "scroll"];
function botItems(i) { const n = Math.floor(hash(i, 6, 31) * 4), out = []; for (let j = 0; j < n; j++) { const k = BOT_ITEM_POOL[Math.floor(hash(i, j + 1, 32) * BOT_ITEM_POOL.length)]; if (!out.includes(k)) out.push(k); } return out; }
