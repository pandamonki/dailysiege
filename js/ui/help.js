// Page help: every menu page gets the same small "i" button in its header. Tapping it opens a short note about the page,
// right at the top of the page body. One place for all the wording, so the pages stay consistent.

const HELP = {
  recruit: ["Recruit", "Buy new soldiers with gold. Pick a type to see its stats, then tap Buy. Better soldiers unlock as your castle grows. You can field 4 soldiers on the map. More go into the reinforcement waves you have unlocked, which march out later in the battle."],
  garrison: ["Train", "Every soldier you own, in one short list. Tap one to see its stats now and after training. Train it up to level 3 with gold, or sell soldiers you no longer want for part of their cost. The soldier you picked stays pinned at the bottom."],
  deployment: ["Deployment", "Choose who stands on the field tonight, who waits in reserve, and who joins a reinforcement wave. Up to 4 soldiers start on the map; the first square on the field row is your castle guard, who stays home to defend. Unlock waves (60, 100, 150 gold) to send more later, and set each wave's trigger and orders with its chips."],
  keep: ["Castle", "Upgrade your castle for more gold each day, tougher walls and access to stronger soldiers. Waves unlocks your reinforcement waves one at a time (60, 100 and 150 gold), each holding 3 more soldiers who join the battle later."],
  traps: ["Defences", "Buy traps here, then place them on the map; move or sell them from the map. Traps are permanent: buy once (up to 4), and each fires once every battle. Walls: tap Walls, then tap tile after tile on the map to build them, paying for each (up to 5). Walls next to each other join up, rebuild free each day, and can't be moved: sell one on the map and build it again. Tower I and Tower II each have a slot to buy, upgrade or sell them: Archer Tower Lv1, then Lv2, then pick one of five Lv3 towers. Tap each to compare its stats before you upgrade. Towers can't be moved either."],
  armoury: ["Armoury", "Forge upgrades that last all week: weapon and armour for your soldiers, a charm for your hero, plus castle walls and tower. Higher tiers need a stronger castle."],
  banner: ["Coat of arms", "Design the banner that flies over your castle and shows in replays and on the leaderboard. Banners are set on the first day and stay for the week."],
  shop: ["Shop", "Buy items for your hero. Your hero can carry a limited number, shown in the slots at the top. Tap an item to read what it does, then Buy. Tap an owned item to sell it for half its price."],
  champ: ["Hero", "Your champion for the week. Every level earns a skill point (15 in all), and only you spend them, on the Abilities tab. The red number on the tab is how many you have left. The ultimate needs level 9 and you can learn only one. Each active skill and the ultimate has a Cast when choice; left alone it picks its own moment. The clock on a skill is its recharge. Items has your hero's items and the shop bag, and Stats has health, attack and speed."],
  rhero: ["Rival hero", "What you know about this lord's hero from yesterday's battle: its abilities and items. Use it to plan your orders."],
  strategy: ["Strategy", "Pick three targets for the day, in order: a lord from the leaderboard, or a role worked out in battle. Then choose your army plan (Conquest, Hero hunt, Siege or Army slayer), when the whole army falls back home, and your hero's stance, which sets when your hero goes home to heal."],
  tactics: ["Combat", "Rules for once your soldiers are in a fight: what each group (hero, melee, ranged, healers) goes for first, and how close an enemy must be before they join a fight. Your army plan on the Strategy tab decides where they go next."],
  alliances: ["Alliances", "Nobody is allied by default. Invite a lord during planning, with an optional gold dowry paid only if they accept. They answer in their next planning phase and the alliance starts at the next battle. Allies win together if only allies remain. You can break a pact cleanly, or betray an ally mid-battle by planting a bomb in their keep."],
  contracts: ["Contracts", "Three contracts a day: easy, hard and one aimed at a rival. Tap one to take it; complete it in the battle for bonus points and gold. Today's twist is shown underneath, and behind the ! at the top of the map."],
  rituals: ["Rituals", "Plan your hero's ultimate and say when to cast it, and choose your weekly blessing. These are the big once-per-battle moments."],
  seal: ["Seal your orders", "The checklist shows what is done and what is not, with a button to fix each one. Check your targets against the leaderboard, plan your ultimate and ritual, rehearse if you like, then press the seal. You can draft new orders until the timer locks."],
  sealed: ["Orders sealed", "Your orders are in. The battle plays out when the timer ends, and the replay is waiting next time you open the game."],
  uorder: ["Unit orders", "Older battles only: a soldier or hero's own job for the night. From the 20 Nov battle soldiers have no orders of their own; the castle guard is set on the Deploy tab."],
  rival: ["Rival castle", "What you know about this lord. Scout their army and hero from the battle replays, then plan your attack or your alliance around what you see."],
  unit: ["Soldier", "Stats and options for this soldier. Train it with gold, move it on the map, or send it back to the barracks."],
  trap: ["Trap", "A permanent trap. It stays where you put it and fires once every battle. Move it to another tile or sell it for half its price from the map."],
  wall: ["Wall", "Enemies stop and chop at walls that block their path, or walk around them, and your own soldiers walk round them too. Rams, catapults and the Ogre Breaker smash straight through. A wall can be turned where it stands or sold for half its price, but not moved. Walls rebuild free each day."],
  wars: ["Your wars", "You can be in several wars at once, each with its own friends, castle, army and gold. Tap Open to switch to another war; the others carry on and are fought on their own schedule. To join another war, paste its invite link. Hosts can set up a new war here too. Battle alerts open the war they are about."],
  camp: ["Mercenary camp", "From day 4 each week, mercenaries are for hire. Each day a new, stronger headline group arrives, shown at the top, with three regular groups below it. Tap a group to see it, then bid. Bids are sealed and you can bid on one group a day. The highest bidder fights with that group for one battle and pays their own bid. A hired group then rests for 2 days for everyone."],
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
  if (t === "orders") { const tab = ["strategy", "tactics", "alliances", "rituals", "contracts"].includes(s.tab) ? s.tab : (s.grp === "alli" ? "alliances" : "strategy"); return HELP[tab]; }
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
