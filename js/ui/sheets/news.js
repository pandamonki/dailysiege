// "What's new" pop-up, shown once per release.
// To announce a release: add an entry at the TOP of RELEASES (newest first) with a new id, a title, a one-line sub and the items.
// Each item is [headline, one short sentence]. No emoji: the list draws its own marker. Players who have not seen the newest id get the pop-up the next time they plan;
// the id is remembered on their device, so changing the id is all it takes to show it again.
// Only major changes players will notice, in two to five items. Fixes, tidy-ups and small balance tweaks don't belong here.
const RELEASES = [
  { id: "1.23", title: "What's new in v1.23", sub: "New names, same game", items: [
    ["Items and skills renamed", "Several items and hero skills have new names. They work exactly as before."],
    ["New rivals", "Practice rivals and your steward have new names."],
  ] },
];
const NEWS_SEEN = "ds.news.seen"; // the id of the newest release this device has shown
function newsDue() { try { if (!S || S.lobbyPrep || localStorage.getItem(NEWS_SEEN) === RELEASES[0].id) return false; localStorage.setItem(NEWS_SEEN, RELEASES[0].id); return true; } catch (e) { return false; } }
function newsSheet() {
  const r = RELEASES[0];
  return head(null, r.title, r.sub) + `<div class="body"><ul class="newslist">${r.items.map(([t, d]) => `<li><span class="ni" aria-hidden="true"></span><span><b>${esc(t)}</b><br><small>${esc(d)}</small></span></li>`).join("")}</ul>
    <div class="row"><button class="btn wax" data-act="close">Got it</button><button class="btn small" data-act="open" data-v="patch">Full patch notes</button></div></div>`;
}
