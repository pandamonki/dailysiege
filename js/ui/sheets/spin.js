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
// a gift that was never claimed lasts for the week it was won. The offline practice game keeps its save from week to week, so a Friday gift
// left unclaimed used to come back the next Wednesday and Thursday
function spinStale() {
  const sp = S && S.spin; if (!sp) return false;
  if (isLive()) return !!sp.week && sp.week !== liveClock().week;
  return sp.day > curDayNo() || (sp.at && Date.now() - sp.at > 6 * 864e5);
}
// true when a spin should open now. It opens once by itself; if it is closed it waits behind the gift button (spinopen) until it is claimed.
function spinCheck() {
  if (!S) return false;
  if (S.spin && spinStale()) S.spin = null;
  if (S.spin) { if (S.spin.shown) return false; S.spin.shown = true; return true; }
  if (S.lobbyPrep || S.ob) return false;
  const day = curDayNo(); if (!SPIN_DAYS[day] || (S.spinSeen || {})[day]) return false;
  const plan = spinPlan(); if (plan === "wait") return false;
  S.spinSeen = S.spinSeen || {}; S.spinSeen[day] = 1; if (!plan) return false;
  if (!S.spinSeed) S.spinSeed = Math.floor(Math.random() * 1e9);
  const seed = (isLive() ? LIVE.uid + "|" + liveClock().week : "p" + S.spinSeed) + "|" + day + "|" + plan.tier;
  S.spin = { tier: plan.tier, day, bonus: plan.bonus, offer: rollSpin(seed, plan.tier, S.items), week: isLive() ? liveClock().week : null, at: Date.now(), shown: true };
  return true;
}
function endSpin() { S.spin = null; sheet = (sheet && sheet.back) || null; }

const REEL_N = 24, REEL_PX = 52, REEL_SETTLE = 3.7; // images on each reel, the height of one, and the seconds before everything has stopped
// Open the gift from its button (it was closed, or came in while something else was open)
function spinOpen() { if (S && S.spin) sheet = { type: "spin" }; }
function spinSheet() {
  const sp = S.spin, pool = spinPool(sp.tier, []), full = S.items.length >= ITEM_SLOTS, pend = sheet.pend;
  if (!sheet.t0) sheet.t0 = Date.now();
  // The page redraws whenever any lord's data changes, which used to restart the reels every few seconds so they never visibly spun. The spin now runs for a fixed
  // time from the moment the sheet opened, and renderSheet leaves the sheet alone while its markup is unchanged (see spinKeep), so redraws do not touch the animation.
  const go = Date.now() - sheet.t0 < REEL_SETTLE * 1000;
  const reel = (k, i) => `<div class="strip" style="--d:${(1.5 + .55 * i).toFixed(2)}s;--end:-${(REEL_N - 1) * REEL_PX}px">${Array.from({ length: REEL_N }, (_, j) => `<img alt="" src="${itemURL(j === REEL_N - 1 ? k : pool[(j * 7 + i * 3 + j * j) % pool.length], REEL_PX)}">`).join("")}</div>`;
  const text = k => `<div class="spinres"><b>${esc(ITEMS[k].name)}</b><span class="muted">${esc(itemDesc(k))}</span></div>`;
  const btn = k => `<button class="btn wax" data-act="spinpick" data-v="${k}">Take it</button>`;
  // slots full: the choice of what to replace comes first, so it is never hidden below the three items
  if (pend) return `<header><div><h2>Day ${sp.day} gift</h2><div class="sub">Your item slots are full</div></div><button class="x" data-act="close" aria-label="Close">✕</button></header><div class="body">
    <p class="note gold"><b>Pick an item to swap for ${esc(ITEMS[pend].name)}.</b> The one you choose is sold for half price.</p>
    <div class="islots rep">${S.items.map(j => `<button class="islot" data-act="spinrep" data-v="${j}"><img alt="" src="${itemURL(j)}"><b>${esc(ITEMS[j].name)}</b><span class="muted">+${Math.floor(itemCost(j) / 2)}g</span></button>`).join("")}</div>
    <div class="row"><button class="btn" data-act="spinno">Choose differently</button></div></div>`;
  return `<header><div><h2>Day ${sp.day} gift</h2><div class="sub">${sp.bonus ? "Underdog bonus: " : ""}pick one free tier ${sp.tier} item</div></div><button class="x" data-act="close" aria-label="Close for now">✕</button></header><div class="body">
    <div class="spin${go ? " go" : ""}">
      <div class="spinrow">${sp.offer.map((k, i) => `<div class="reel">${reel(k, i)}</div>`).join("")}</div>
      <div class="spinrow spintext">${sp.offer.map(text).join("")}</div>
      <div class="spinrow spinbtns">${sp.offer.map(btn).join("")}</div></div>
    ${full ? `<p class="muted">Your item slots are full: taking an item will ask which one to swap out.</p><div class="row"><button class="btn" data-act="spingold">Take ${SPIN_GOLD} gold instead</button></div>` : ""}
    <p class="muted">Not now? Close this: the gift waits behind the 🎁 button on the map until you claim it.</p></div>`;
}
