// Daily Siege service worker: makes the game load instantly and work offline, and shows push notifications.
//
// The build fills in the list of the game's files and a version made from their contents (see vite.config.js).
// All of a version's files are stored together and served together, so a phone never runs a mix of old and
// new scripts. A new version is downloaded in the background and used from the next time the game is opened.
// Game data (Firebase) never goes through here: only this site's own files are cached.
const VERSION = "__VERSION__", FILES = __FILES__, CACHE = "daily-siege-" + VERSION, KNOWN = new Set(FILES);

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter(k => k.startsWith("daily-siege-") && k !== CACHE && k !== "daily-siege-audio");
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
    if (old.length) (await self.clients.matchAll()).forEach(c => c.postMessage({ type: "ds-updated" })); // tell open pages a newer version is ready
  })());
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/__/")) return; // not ours: sign-in helpers, Firebase, other sites
  let path = url.pathname;
  if (req.mode === "navigate") path = path.startsWith("/join/") ? "/join.html" : path === "/" ? "/index.html" : path; // the page itself, whatever is after the ?
  if (path.startsWith("/audio/")) { // music: not downloaded up front; kept after the first time it is played
    e.respondWith(caches.open("daily-siege-audio").then(c => c.match(path).then(hit => hit || fetch(req).then(res => { if (res.ok) c.put(path, res.clone()); return res; }))));
    return;
  }
  if (!KNOWN.has(path)) return; // anything not part of this version goes to the network as usual (e.g. the self-test's recorded results)
  e.respondWith(caches.open(CACHE).then(c => c.match(path)).then(hit => hit || fetch(req)));
});

// ----- notifications -----
// The server sends a small data message; this turns it into a notification. Tapping it opens (or returns to) the game.
self.addEventListener("push", e => {
  let d = {}; try { const j = e.data ? e.data.json() : {}; d = j.data || j.notification || j; } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title || "Daily Siege", { body: d.body || "", icon: "/app/icon-192.png", badge: "/app/icon-192.png", tag: d.tag || "daily-siege", data: { link: d.link || "/" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => { const open = list.find(c => "focus" in c); return open ? open.focus() : self.clients.openWindow(link); }));
});
