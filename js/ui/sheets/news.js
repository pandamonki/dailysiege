// "What's new" pop-up, shown once per release.
// To announce a release: add an entry at the TOP of RELEASES (newest first) with a new id, a title, a one-line sub and the items.
// Each item is [headline, one short sentence]. No emoji: the list draws its own marker. Players who have not seen the newest id get the pop-up the next time they plan;
// the id is remembered on their device, so changing the id is all it takes to show it again.
// Only major changes players will notice, in two to five items. Fixes, tidy-ups and small balance tweaks don't belong here.
const RELEASES = [
  { id: "1.31", title: "What's new in v1.31", sub: "Heroes cast their skills freely", items: [
    ["Skills fire when ready", "Every hero skill now casts as soon as it has recharged and an enemy is in reach, instead of waiting for crowds or low health."],
    ["Ultimates pick their moment", "An ultimate fires when an enemy hero is in reach, four or more enemies are, or in sudden death."],
    ["Hero balance", "The Rogue is tougher, the Arcane Mage is stronger, and the weakest trees got a boost."],
  ] },
  { id: "1.29", title: "What's new in v1.29", sub: "Mercenaries look like monsters now", items: [
    ["New mercenary looks", "Trolls, orcs, ogres, centaurs, dark elves, necromancers and skeletons are drawn as creatures, so you can tell them from heroes and soldiers at a glance."],
    ["Gold coin over their heads", "Every mercenary in a battle replay carries a floating gold coin, replacing the old MERC label."],
  ] },
  { id: "1.28", title: "What's new in v1.28", sub: "A base skill for every hero, and later ultimates", items: [
    ["A skill from level 1", "Every hero now has a base skill: Ground Slam, Healing Wave, Flicker Strike, Teleport or Piercing Shot. One point opens the three trees."],
    ["Later ultimates", "The ultimate now needs hero level 12 and ten points in its tree, so it arrives on day 4 for a fast-levelling hero and day 5 for the rest."],
    ["Mage change", "The Arcane tree's Blink skill became Disrupt, since the Mage now teleports from the base skill."],
  ] },
  { id: "1.27", title: "What's new in v1.27", sub: "Army zones and the new rules reach every war", items: [
    ["Zones in every war", "Where you place soldiers sets their job (Guard, Front, left and right flanks), now in real wars as well as practice."],
    ["Fair, readable battles", "The same orders give the same battle, talents and items count more, and rivals answer their attackers."],
    ["Three targets that stay", "Pick up to three targets in order; they carry over to the next day, ready to confirm."],
  ] },
  { id: "1.26", title: "What's new in v1.26", sub: "Practice: roomier maps, stronger talents, three targets", items: [
    ["Three targets that stay", "In practice, pick up to three targets in order. They carry over to the next day: just confirm them before you seal."],
    ["Roomier map", "Practice castles stand further apart, so heroes no longer meet at each other's gates in the first seconds."],
    ["Talents and items count more", "Skill-tree values are a quarter stronger and item bonuses 15% stronger, in practice."],
    ["Smarter rivals, clearer mercenaries", "Rivals answer whoever attacked them yesterday. Mercenaries arrive 10 seconds in, wear a MERC tag, and no longer look like heroes."],
  ] },
  { id: "1.25", title: "What's new in v1.25", sub: "Practice: army zones, to try before they reach real wars", items: [
    ["Where you place soldiers sets their job", "In practice, your field splits into Guard, Front, and left and right flanks. The Front marches on your #1 target; each flank screens its side or raids that neighbour."],
    ["Four Front plans", "Assault, Siege, Hero hunt or Hold the hill, each beating one other. Holding the hill longest scores 2 points."],
    ["Routes on the map", "While you set orders, each zone's route is drawn on the map, and each wave picks a zone."],
    ["Fairer battles", "In practice the same orders now give the same battle: soldiers' opening timing no longer comes from the dice."],
  ] },
  { id: "1.23", title: "What's new in v1.23", sub: "Share the day with your group chat", items: [
    ["Share the day", "The battle report has a Share the day button: a picture of the winner, the biggest upset, any betrayal and how the standings moved."],
    ["Send it anywhere", "It opens your phone's share sheet with a few lines of text to go with the picture."],
  ] },
  { id: "1.22", title: "What's new in v1.22", sub: "Betray the whole alliance, and replays that start at once", items: [
    ["Betray the whole alliance", "From 26 Nov, with two or more allies you can betray them all at once: one trigger, and bombs in every allied keep go off together."],
    ["Pick the betrayal time", "Choose a time slot like the wave deadlines (0:00 to 2:30 into the fight, before sudden death), or a condition such as their army being gone or their hero away from home."],
    ["Replays start at once", "Watch replay and Highlights no longer pause: the battle is prepared while you read the report."],
  ] },
];
const NEWS_SEEN = "ds.news.seen"; // the id of the newest release this device has shown
function newsDue() { try { if (!S || S.lobbyPrep || localStorage.getItem(NEWS_SEEN) === RELEASES[0].id) return false; localStorage.setItem(NEWS_SEEN, RELEASES[0].id); return true; } catch (e) { return false; } }
function newsSheet() {
  const r = RELEASES[0];
  return head(null, r.title, r.sub) + `<div class="body"><ul class="newslist">${r.items.map(([t, d]) => `<li><span class="ni" aria-hidden="true"></span><span><b>${esc(t)}</b><br><small>${esc(d)}</small></span></li>`).join("")}</ul>
    <div class="row"><button class="btn wax" data-act="close">Got it</button><button class="btn small" data-act="open" data-v="patch">Full patch notes</button></div></div>`;
}
