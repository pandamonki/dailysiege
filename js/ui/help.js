// Page help: every menu page gets the same small "i" button in its header. Tapping it opens a short note about the page,
// right at the top of the page body. One place for all the wording, so the pages stay consistent.

const HELP = {
  recruit: ["Recruit", "Buy new soldiers with gold. Pick a type to see its stats, then tap Buy. Better soldiers unlock as your castle grows. You can only field as many as your supply allows, and the rest wait in reserve."],
  garrison: ["Garrison", "Every soldier you own, in one list. Tap one to see its level and where it is. Train it up to level 3 with gold, or sell soldiers you no longer want for part of their cost back."],
  deployment: ["Deployment", "Choose who stands on the field tonight and who waits in reserve. Tap a soldier to place it on a glowing tile, or send it back to the barracks. Units on the field fight in the battle."],
  keep: ["Castle", "Upgrade your castle for more gold each day, tougher walls and access to stronger soldiers. Supply adds more field slots, so you can bring more soldiers to each battle."],
  traps: ["Defences", "Buy walls and traps. Walls block or slow enemies and rebuild free each day. Traps are single-use and only last tonight's battle. Buy one, then tap a glowing tile near your castle to place it."],
  armoury: ["Armoury", "Forge permanent upgrades for your hero and castle: weapon, armour and charm for the hero, plus castle walls and tower. Higher tiers need a stronger castle."],
  banner: ["Coat of arms", "Design the banner that flies over your castle and shows in replays and on the leaderboard. Banners are set on the first day and stay for the week."],
  shop: ["Shop", "Buy items for your hero. Your hero can carry a limited number, shown in the slots at the top. Tap an item to read what it does, then Buy. Tap an owned item to sell it for half its price."],
  champ: ["Hero", "Your champion for the week. Every level earns a skill point (15 in all), and only you spend them, on the Abilities tab. The red number on the tab is how many you have left. The ultimate needs level 9 and you can learn only one. Items has your gear and the shop bag, and Stats has health, attack and speed."],
  rhero: ["Rival hero", "What you know about this lord's hero from yesterday's battle: its abilities, items and gear. Use it to plan your orders."],
  strategy: ["Strategy", "Decide who your army attacks and which way it marches. These choices steer your soldiers across the map before any fighting starts."],
  tactics: ["Combat", "Rules for once your soldiers are in a fight. Set how each group behaves, and add battle commands: if something happens, do something. Each command uses one order seal."],
  alliances: ["Alliances", "Nobody is allied by default. Invite a lord during planning, with an optional gold dowry paid only if they accept. They answer in their next planning phase and the alliance starts at the next battle. Allies win together if only allies remain. You can break a pact cleanly, or betray an ally mid-battle by planting a bomb in their keep."],
  rituals: ["Rituals", "Plan your hero's ultimate and your weekly blessing. These are the big once-per-battle moments, so choose when they fire."],
  seal: ["Seal your orders", "Check your plan, then seal it. You can draft new orders until the timer locks, and the last orders you sealed stay in effect until you seal new ones."],
  sealed: ["Orders sealed", "Your orders are in. The battle plays out when the timer ends, and the replay is waiting next time you open the game."],
  uorder: ["Unit orders", "Give this soldier or hero its own job for tonight's battle. Its orders override your army's general orders."],
  rival: ["Rival castle", "What you know about this lord. Scout their army and hero from the battle replays, then plan your attack or your alliance around what you see."],
  unit: ["Soldier", "Stats and options for this soldier. Train it with gold, move it on the map, or send it back to the barracks."],
  trap: ["Trap", "A single-use trap. It only lasts tonight's battle. Tap a glowing tile to place it, or pick it up again before you seal your orders."],
  wall: ["Wall", "Enemies stop and chop at walls that block their path, or walk around them. Rotate or move a wall, or dismantle it for gold back. Walls rebuild free each day."],
  camp: ["Mercenary camp", "From day 4 each week, mercenary groups are for hire. Bids are sealed, and the highest bidder fights with that group for one battle and pays their own bid. A hired group then rests for 2 days for everyone."],
  invites: ["Invitations", "Lords who want to ally with you. Accept or decline, or decide later in Allies. If you accept, the alliance starts at the next battle and any dowry is paid to you."],
  gold: ["Treasury", "Your gold, your daily income and what is set aside for alliance offers. Kill spoils and dowries are added after each battle."],
  day: ["The war", "The war runs for seven daily battles. Each day you spend gold, place your soldiers and seal your orders before the timer ends."],
  board: ["Leaderboard", "Standings for the week. Tap a lord to see their hero, castle and banner."],
  report: ["Battle report", "What happened in the last battle: who fell, who held the hill and who gained gold. Watch the replay to see how it played out."],
  results: ["Recap", "How the battle went for you. Replay it, check the standings, then head back to plan tomorrow."],
  deploy: ["Deploy here", "Choose who takes this ground. Only soldiers in your reserve can be placed."],
  spells: ["Spell book", "Every ability for every hero class, with its recharge time. Use it to compare classes or to scout what a rival's hero can do."]
};
function helpFor(s) {
  if (!s) return null;
  const t = s.type;
  if (t === "castle") { const tab = s.lobby ? "banner" : (s.tab || "recruit"); return HELP[tab] || null; }
  if (t === "orders") { const tab = ["strategy", "tactics", "alliances", "rituals"].includes(s.tab) ? s.tab : (s.grp === "alli" ? "alliances" : "strategy"); return HELP[tab]; }
  if (t === "seal") return HELP[typeof S !== "undefined" && S && S.locked ? "sealed" : "seal"];
  return HELP[t] || null;
}
// Called after a sheet is drawn: adds the "i" button, and the note itself when it is open
function decorateHelp(p) {
  const h = helpFor(sheet), x = p.querySelector("header .x"); if (!h || !x) return;
  x.insertAdjacentHTML("beforebegin", `<button class="hbtn${sheet.help ? " on" : ""}" data-act="help" aria-label="About this page" aria-expanded="${!!sheet.help}">i</button>`);
  // floats over the page, so opening it never pushes the page around; tap it to close
  if (sheet.help) x.closest("header").insertAdjacentHTML("afterend", `<div class="helpwrap"><button class="helpbox" data-act="help" role="note" aria-label="Close help"><b>${esc(h[0])}</b><span>${esc(h[1])}</span></button></div>`);
}
