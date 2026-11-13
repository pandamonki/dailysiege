// Free item spinner: raising a castle to Fortress or Citadel offers a pick of three different items of the matching tier

const SPIN_DAYS = { 2: 1, 5: 2 };  // day of the week -> item tier on offer
const SPIN_GOLD = 60;              // taken instead of an item when every item slot is full
const spinPool = (tier, owned) => Object.keys(ITEMS).filter(k => { const it = ITEMS[k]; return it.tier === tier && !it.fixed && !it.unique && !(owned || []).includes(k); });
const spinHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
// the three offered items are fixed by the player, the week, the day and the tier, so closing or reloading the game never rerolls them
function rollSpin(seed, tier, owned) {
  const pool = spinPool(tier, owned), rng = mulberry(spinHash(seed));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}
// what today's spin is for this lord: null for none, "wait" until yesterday's result is in, else { tier, bonus }
function spinPlan() {
  const day = curDayNo(), base = SPIN_DAYS[day]; if (!base) return null;
  if (!isLive()) return { tier: base, bonus: false };
  const ck = liveClock(); if (!LIVE.battles[addDays(ck.planDay, -1)]) return "wait";
  const ids = rosterFor(ck.week).map(p => p.uid), pts = standings(ck.week), order = ids.slice().sort((x, y) => (pts[x] || 0) - (pts[y] || 0)), n = order.length, i = order.indexOf(LIVE.uid);
  if (i < 0) return null;
  if (n >= 5 && i >= n - 2) return null;                      // the top two have no need of charity
  if (n >= 3 && i === 0) return { tier: Math.min(3, base + 1), bonus: true }; // the lord at the bottom gets a better draw
  return { tier: base, bonus: false };
}
// true when a spin is waiting to be picked, starting today's if this lord is due one
function spinCheck() {
  if (!S) return false; if (S.spin) return true; if (S.lobbyPrep || S.ob) return false;
  const day = curDayNo(); if (!SPIN_DAYS[day] || (S.spinSeen || {})[day]) return false;
  const plan = spinPlan(); if (plan === "wait") return false;
  S.spinSeen = S.spinSeen || {}; S.spinSeen[day] = 1; if (!plan) return false;
  if (!S.spinSeed) S.spinSeed = Math.floor(Math.random() * 1e9);
  const seed = (isLive() ? LIVE.uid + "|" + liveClock().week : "p" + S.spinSeed) + "|" + day + "|" + plan.tier;
  S.spin = { tier: plan.tier, day, bonus: plan.bonus, offer: rollSpin(seed, plan.tier, S.items) };
  return true;
}
function endSpin() { S.spin = null; sheet = (sheet && sheet.back) || null; }

function spinSheet() {
  const sp = S.spin, first = !sheet.spun, pool = spinPool(sp.tier, []), full = S.items.length >= ITEM_SLOTS, pend = sheet.pend;
  sheet.spun = true; // the spin plays once; later redraws show where it stopped
  const reel = (k, i) => `<div class="strip" style="--d:${(1.3 + .45 * i).toFixed(2)}s">${Array.from({ length: 10 }, (_, j) => `<img alt="" src="${itemURL(j === 9 ? k : pool[(j * 7 + i * 3) % pool.length], 52)}">`).join("")}</div>`;
  const col = (k, i) => `<div class="spincol"><div class="reel">${reel(k, i)}</div><div class="spinres"><b>${esc(ITEMS[k].name)}</b><span class="muted">${esc(ITEMS[k].desc)}</span>
      <button class="btn wax" data-act="spinpick" data-v="${k}" ${pend === k ? "disabled" : ""}>${pend === k ? "Choose what to replace" : "Take it"}</button></div></div>`;
  const rep = pend ? `<p class="note gold"><b>Your item slots are full.</b> ${esc(ITEMS[pend].name)} replaces one of these, which sells for half price.</p>
      <div class="islots rep">${S.items.map(j => `<button class="islot" data-act="spinrep" data-v="${j}"><img alt="" src="${itemURL(j)}"><b>${esc(ITEMS[j].name)}</b><span class="muted">+${Math.floor(itemCost(j) / 2)}g</span></button>`).join("")}</div>
      <div class="row"><button class="btn" data-act="spinno">Choose differently</button></div>`
    : full ? `<p class="muted">Your item slots are full: taking an item will ask which one to replace.</p><div class="row"><button class="btn" data-act="spingold">Take ${SPIN_GOLD} gold instead</button></div>` : "";
  return `<header><div><h2>Day ${sp.day} gift</h2><div class="sub">${sp.bonus ? "Underdog bonus: " : ""}pick one free tier ${sp.tier} item</div></div></header><div class="body">
    <div class="spin${first ? " go" : ""}">${sp.offer.map(col).join("")}</div>${rep}</div>`;
}
