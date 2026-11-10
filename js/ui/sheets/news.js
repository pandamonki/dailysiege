// One-off "What's new" pop-up for version 0.02
const NEWS_KEY = "ds.new.v002";
function newsDue() { try { if (!S || S.lobbyPrep || localStorage.getItem(NEWS_KEY)) return false; localStorage.setItem(NEWS_KEY, "1"); return true; } catch (e) { return false; } }
function newsSheet() {
  const items = [
    ["🏰", "Siege engines", "Powder Carts and Battering Rams smash castles. Two per lord, each needs 2 days to recharge."],
    ["⚔", "Mercenary camp", "From day 4 each week, bid in secret to hire sell-sword groups for a single battle."],
    ["✨", "Weekly blessings", "A once-per-week ritual blessing you can choose when sealing orders."],
    ["🗡", "Divine Rapier", "Whoever carries it is marked. Slay them and the rapier is yours."],
    ["🧙", "Wizards and snipers", "New mage hero and mage unit, plus Dwarven snipers, all at tier 3."],
    ["🛡", "Knights to tier 3", "Knights now need a Citadel. Clerics are back at tier 2."],
    ["⚡", "Stronger ultimates", "Ultimates hit about 50% harder, recharge in 1 day, and you choose which battles to use them in while planning."],
    ["🤝", "Alliance invitations", "Invite lords with an optional dowry. They answer next planning phase."],
    ["📈", "Stronger levelling and gear", "Levelling units gives more, and weapons and armour now improve your soldiers."],
  ];
  return head(null, "What's new in v0.02", "The big changes since you last played") + `<div class="body"><ul class="newslist">${items.map(([i, t, d]) => `<li><span class="ni">${i}</span><span><b>${esc(t)}</b><br><small>${esc(d)}</small></span></li>`).join("")}</ul>
    <div class="row"><button class="btn wax" data-act="close">Got it</button><button class="btn small" data-act="open" data-v="patch">Full patch notes</button></div></div>`;
}
