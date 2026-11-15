// "What's new" pop-up, shown once per release.
// To announce a release: add an entry at the TOP of RELEASES (newest first) with a new id, a title, a one-line sub and the items.
// Each item is [icon, headline, one short sentence]. Players who have not seen the newest id get the pop-up the next time they plan;
// the id is remembered on their device, so changing the id is all it takes to show it again. Keep about 8 to 14 items.
const RELEASES = [
  { id: "1.4", title: "What's new in v1.4", sub: "Fewer, better soldiers, bought waves, and clearer planning screens", items: [
    ["💰", "New prices", "Footmen cost 100, Knights 240 and siege units 300. Training is cheaper (30% then 40%), and the Fortress costs 100, the Citadel 200."],
    ["🔓", "Four on the map, waves you buy", "Supply beds are gone. Everyone fields 4 soldiers and unlocks reinforcement waves for 60, 100 and 150 gold."],
    ["⭐", "A mercenary headliner every day", "From day 4 a stronger group tops the camp each day. Every fighter now shows its stats."],
    ["🏰", "Several wars at once", "Join more than one war and switch between them from Your wars in the main menu."],
    ["🎯", "Targets from the leaderboard", "Three target slots and every lord listed by rank, with a Target button. The same list is on the seal screen."],
    ["✅", "A proper seal checklist", "Soldiers, skill points, targets, contract, castle, alliances and mercenaries, each with a button to fix it. Rehearse from there too."],
    ["⏱", "Tell skills when to cast", "Every active skill and the ultimate can wait for a condition you pick. Clocks show each recharge."],
    ["🧱", "Walls in bulk", "Build several walls at once and place them one after another. Traps show their damage."],
    ["ℹ", "Strengths and weaknesses", "Tap the i beside any attack or armour type to see what it beats and what beats it."],
    ["📈", "The board on the move", "After the battle, today's points join the weekly totals and the leaderboard reorders before your eyes."],
    ["🧩", "Every hero's kit", "The battle report shows each lord's skills and items. Tap one to read it."],
    ["❗", "Today's twist", "Tap the ! beside the camp button on the map."],
    ["🎥", "Replay camera", "Zoom further in, and the home button follows your hero again."],
    ["🖼", "A fresh coat of paint", "A wax seal in your colour, and painted icons for contracts, rituals, traps, waves, the armoury and the treasury."],
  ] },
  { id: "1.3", title: "What's new in v1.3", sub: "Daily twists, contracts, rehearsals and your own battle report (from the battle of 16 Nov)", items: [
    ["📜", "Orders › Contracts", "Your contracts pop up when you start planning. Close them and they wait under Orders › Contracts, with the twist and the rehearsal."],
    ["🌕", "A twist every day", "From day 2 each day brings one rule change, like Blood Moon, Siege Weather or Market Day. You see tomorrow's a day ahead."],
    ["🛒", "Market Day", "Items in the shop cost 25% less."],
    ["🧱", "Battle twists", "Iron Walls, Siege Weather, Golden Hill and Blood Moon change how tonight's battle plays."],
    ["🎯", "Daily contracts", "Each morning you are offered three: one easy, one hard and one aimed at a named rival. Take one with your orders."],
    ["💰", "Bonus points and gold", "Complete your contract in the battle for up to 5 extra points and 150 extra gold."],
    ["🩸", "Revenge", "Whoever took your castle or slew your hero may be named in tomorrow's rival contract."],
    ["👑", "Topple the leader", "Rival contracts sometimes aim you at the lord at the top of the board."],
    ["⚔", "Rehearse your orders", "Fight your current orders against your rivals' last known orders as often as you like. Nothing counts."],
    ["📊", "Your battle report", "After every battle and rehearsal: where your damage came from, how your castle held, when your waves went out."],
    ["➜", "Try tomorrow", "The report ends with two or three tips tied to things you can change in planning."],
  ] },
  { id: "1.2", title: "What's new in v1.2", sub: "From today's battle: items, gifts, fights and highlights", items: [
    ["🎒", "Items matter more", "Stat items are twice as strong for your hero, and the area-buff items (Banner, Standard, Mender, Pipe) are twice as strong for everyone near it."],
    ["🎁", "A proper free gift", "The reels spin like a slot machine. Close it and it waits behind a 🎁 button on the map until you take it."],
    ["⚔", "Fights stay fights", "Hurt units only fall back while they are being hit, return to the fight sooner, and no longer get pulled off an enemy they are already fighting."],
    ["🎬", "Better highlights", "The camera sits one step further out, and the reel ends on the moment the last rival castle falls."],
    ["🧱", "Walls in the unit strip", "Pick a wall and the strip shows its pixel sprite."],
  ] },
  { id: "1.1", title: "What's new in v1.1", sub: "Hero, castle and map changes from the battle of 14 Nov; targeting and scoring from Monday 16 Nov", items: [
    ["🎯", "Pick your targets", "Each day your attack list starts empty. Pick one to three targets before you seal."],
    ["🧭", "Targets can be roles", "Pick a lord, or a role worked out in battle: weakest castle, board leader, the lord above you, nearest castle or nearest to your army."],
    ["⬆", "Chase the lord above", "Once your targets have fallen, your army goes for the lord just above you on the board."],
    ["🏰", "Castles on the way", "Armies still fight any army they meet, and now also attack rival castles they pass."],
    ["🏆", "Castles worth 3", "Taking a castle scores 3 points instead of 2."],
    ["🛡", "No more militia", "Castles no longer send out militia. Your garrison waves do that job now."],
    ["⚖", "Calmer final day", "The last day counts 1.5 times, the same as days 5 and 6."],
    ["🎲", "Fair ties", "When two castles are equally near, or end on equal health, a fair draw decides instead of sign-up order."],
    ["⚔", "Heroes keep fighting", "Retreating heroes return at half health, and a castle under attack only calls home a hero that is nearby."],
    ["🏹", "Steadier archers and mages", "They only step back while they are actually being hit."],
    ["☄", "Heroes besiege castles", "Area skills like Fireball, Blizzard, Chain Lightning and Arrow Volley now hit castles, Meteor hits far harder, and magic breaks stone better than blades or arrows."],
    ["🗡", "Braver rogues", "Rogues fight through hits and only slip away when outnumbered 3 to 1."],
    ["🌲", "A fresh look", "Pixel-art walls and battleground, the original grass, and a forest round the edge of the map."],
    ["✥", "Move, don't drag", "Units are moved with the Move button, Train opens the training page, and items on the hero screen show their details."],
  ] },
  { id: "1.0", title: "What's new in v1.0", sub: "The big changes since v0.02", items: [
    ["🌐", "Play online with friends", "Sign in with Google, join a war and install the game on your home screen. It starts offline and tells you when an update is ready."],
    ["🤖", "Bot lords", "The host can fill empty seats with computer-played lords, each with a different hero. Up to 12 lords per war."],
    ["🌳", "Hero skill trees", "Three trees per hero and 15 levels, with every skill point spent by you. Pick one ultimate at level 9."],
    ["🛡", "Garrison and waves", "Each castle keeps three reinforcement waves, sent out by conditions you set. Set them up in the Army screen."],
    ["⚔", "Combat groups", "A new Combat tab sets each group's style, target priorities and reach. Siege rams and carts can no longer be stunned."],
    ["🏰", "Fairer wars", "Castles no longer burn down on their own, armies fight on after a castle falls, and sealed orders stay in effect. Pacts last and betrayal has a prize."],
    ["🛍", "A bigger shop", "Over 30 items, including five cheap starters, the four orbs and Divine Rapier. One tap on the bag at the side of the map opens it."],
    ["🎁", "Free item spins", "On days 2 and 5 every lord spins for a free item. The lords at the bottom of the board get a better one."],
    ["💰", "Fuller treasury", "Daily pay starts at 225 gold and grows each day. Fortress and Citadel pay back faster."],
    ["📋", "Clearer screens", "The unit strip always shows a unit, the hero has a Stats tab, and every page has a small i with a short note on what it is for."],
    ["✨", "Pixel skill effects", "All five heroes have new pixel-art animations for every skill, and the ultimates stand out from the crowd."],
    ["🎨", "New art", "New icons for hero skills and shop items, a gold coin on every price, and the orbs look like orbs."],
  ] },
  { id: "0.02", title: "What's new in v0.02", sub: "The big changes since you last played", items: [
    ["🏰", "Siege engines", "Powder Carts and Battering Rams smash castles. Two per lord, each needs 2 days to recharge."],
    ["⚔", "Mercenary camp", "From day 4 each week, bid in secret to hire sell-sword groups for a single battle."],
    ["✨", "Weekly blessings", "A once-per-week ritual blessing you can choose when sealing orders."],
    ["🗡", "Divine Rapier", "Whoever carries it is marked. Slay them and the rapier is yours."],
    ["🧙", "Wizards and snipers", "New mage hero and mage unit, plus Dwarven snipers, all at tier 3."],
    ["🛡", "Knights to tier 3", "Knights now need a Citadel. Clerics are back at tier 2."],
    ["⚡", "Stronger ultimates", "Ultimates hit about 50% harder, recharge in 1 day, and you choose which battles to use them in while planning."],
    ["🤝", "Alliance invitations", "Invite lords with an optional dowry. They answer next planning phase."],
    ["📈", "Stronger levelling and gear", "Levelling units gives more, and weapons and armour now improve your soldiers."],
  ] },
];
const NEWS_SEEN = "ds.news.seen"; // the id of the newest release this device has shown
function newsDue() { try { if (!S || S.lobbyPrep || localStorage.getItem(NEWS_SEEN) === RELEASES[0].id) return false; localStorage.setItem(NEWS_SEEN, RELEASES[0].id); return true; } catch (e) { return false; } }
function newsSheet() {
  const r = RELEASES[0];
  return head(null, r.title, r.sub) + `<div class="body"><ul class="newslist">${r.items.map(([i, t, d]) => `<li><span class="ni">${i}</span><span><b>${esc(t)}</b><br><small>${esc(d)}</small></span></li>`).join("")}</ul>
    <div class="row"><button class="btn wax" data-act="close">Got it</button><button class="btn small" data-act="open" data-v="patch">Full patch notes</button></div></div>`;
}
