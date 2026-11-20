// Installing the game and battle alerts, on iPhone and Android: the one-time asks, the Menu switch and the app-icon badge.
//   - Install card: once, the first time a phone opens the game in its browser (not from the home screen). Android Chrome gets a one-tap
//     Install where the browser offers it, otherwise the menu steps; iPhone gets the Share → Add to Home Screen steps (Apple allows nothing more).
//   - Alerts card: once, in a friends war, when this device can switch alerts on (Android at once; iPhone only once opened from the Home Screen).
//   - After sealing: once, if alerts are still off, an offer to ping when the results are in.
//   - Menu: "Battle alerts" always opens the right card for this device, including turning alerts off.
//   - Badge: while a friends war's orders are unsealed, the app icon shows a badge where the phone supports it (iPhone home-screen apps, some Android launchers).
// Each ask is remembered on this device (APPTIP_KEY) and never shown again; no two pop-ups appear on the same open.
const APPTIP_KEY = "ds.apptips";
const tipSeen = () => { try { return JSON.parse(localStorage.getItem(APPTIP_KEY) || "{}"); } catch (e) { return {}; } };
const tipMark = k => { try { const o = tipSeen(); o[k] = Date.now(); localStorage.setItem(APPTIP_KEY, JSON.stringify(o)); } catch (e) {} };
const phoneKind = () => (typeof PWA !== "undefined" && PWA.isIOS() ? "ios" : /Android/i.test(navigator.userAgent) ? "android" : "other");
const alertState = () => { try { return window.DS && DS.pushState ? DS.pushState() : "off"; } catch (e) { return "off"; } };
let appTipShown = false, sealTipPending = false, autoPopThisOpen = false; // this open of the game: one card of ours at most, only as the first pop-up, and What's new waits
let appLive = () => isLive(); // in a friends war (a variable so the checks can stand in for one)
let appBooted = false; // main.js: the title screen is up; before that, start-up renders draw pop-ups the title screen then covers, so ours wait
function appBootDone() { appBooted = true; }
function notePopup() { if (appBooted) autoPopThisOpen = true; } // render(): another pop-up (invites, What's new, contracts, …) was shown on this open

// called from the auto pop-up chain in render(): which card (if any) is due now
function appTipDue() {
  if (!appBooted || appTipShown || typeof PWA === "undefined") return null;
  const seen = tipSeen(), kind = phoneKind(), st = alertState();
  let k = null;
  if (sealTipPending) { sealTipPending = false; if (!seen.seal) k = st === "ask" ? "seal" : st === "install" && !seen.install ? "install" : null; }
  else if (autoPopThisOpen) return null;
  else if (kind !== "other" && PWA.canOffer() && !seen.install) k = "install";
  else if (appLive() && st === "ask" && !seen.alerts) k = "alerts";
  return k; // marked as seen only once it is actually on screen (appTipSheet): a card replaced before it shows is not used up
}
const appTipBlocksNews = () => appTipShown; // What's new waits for the next open if one of these cards was shown
function noteSealed() { if (appLive()) sealTipPending = true; } // seal: offer alerts once the seal screen is closed

const shareIcon = `<svg class="shareic" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v11M6 6l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 9H5v9h10V9h-1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
function installSteps(kind) {
  if (kind === "ios") return `<ol class="tipsteps"><li>Make sure this page is open in <b>Safari</b>.</li><li>Tap the <b>Share</b> button ${shareIcon} at the bottom of the screen (top right on iPad).</li><li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open <b>Daily Siege</b> from your Home Screen and sign in there.</li></ol>`;
  return `<ol class="tipsteps"><li>If this opened inside another app, tap <b>⋮</b> and choose <b>Open in Chrome</b>.</li><li>Tap the menu <b>⋮</b> at the top right.</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>), then <b>Install</b>.</li><li>Open <b>Daily Siege</b> from your home screen.</li></ol>`;
}
function blockedSteps(kind) {
  return kind === "ios" ? `<p>Alerts are switched off for Daily Siege in your iPhone's settings. Open <b>Settings → Notifications → Daily Siege</b> and turn on <b>Allow Notifications</b>, then come back and tap below.</p>`
    : `<p>Alerts are blocked for this site. Tap the icon at the left of the address bar (or <b>⋮ → ⓘ</b>) → <b>Permissions</b> → <b>Notifications</b> → <b>Allow</b>. If you installed the game, you can also long-press its icon → <b>App info</b> → <b>Notifications</b>. Then tap below.</p>`;
}
const ALERTS_WHAT = `An hour before orders lock (only if yours aren't sealed), and when the battle's results are in. Nothing else.`;

function appTipSheet() {
  if (!sheet.marked && (sheet.k === "install" || sheet.k === "alerts" || sheet.k === "seal")) { sheet.marked = true; tipMark(sheet.k); if (sheet.k === "seal") tipMark("alerts"); appTipShown = true; }
  const k = sheet.k || sheet.id, kind = phoneKind(), st = alertState(), one = typeof PWA !== "undefined" && PWA.hasPrompt();
  const later = `<button class="btn small" data-act="close">Not now</button>`;
  if (k === "install") return head(null, kind === "ios" ? "Add to your Home Screen" : "Install Daily Siege", "Play it like an app") + `<div class="body tipcard">
    <p>It opens full-screen and starts instantly${kind === "ios" ? ", and on iPhone it's the only way to get battle alerts" : ""}.</p>
    ${one && kind !== "ios" ? "" : installSteps(kind)}
    <div class="row">${one && kind !== "ios" ? `<button class="btn wax" data-act="tipinstall">📲 Install</button>` : `<button class="btn wax" data-act="close">Got it</button>`}${later}</div></div>`;
  if (k === "alerts" || k === "seal") return head(null, k === "seal" ? "Orders sealed" : "Battle alerts", k === "seal" ? "Want a ping when the results are in?" : "Never miss a battle") + `<div class="body tipcard">
    <p>${ALERTS_WHAT}</p><p class="muted">You can switch them off any time from the Menu.</p>
    <div class="row"><button class="btn wax" data-act="tipalerts">🔔 Turn on alerts</button>${later}</div></div>`;
  // k === "menu": the always-there switch, whatever this device can do
  const body = st === "on" ? `<p>🔔 Alerts are <b>on</b> for this device.</p><p class="muted">${ALERTS_WHAT}</p><div class="row"><button class="btn" data-act="dspushoff">Turn off on this device</button></div>`
    : st === "ask" ? `<p>${ALERTS_WHAT}</p><div class="row"><button class="btn wax" data-act="tipalerts">🔔 Turn on alerts</button></div>`
    : st === "install" ? `<p>On iPhone, battle alerts work once the game is on your Home Screen and opened from there.</p>${installSteps("ios")}`
    : st === "blocked" ? `${blockedSteps(kind)}<div class="row"><button class="btn wax" data-act="tipalerts">🔔 Try again</button></div>`
    : `<p class="muted">${window.DS && DS.user ? "This browser can't show alerts. Try the game installed on your phone." : "Battle alerts come with a friends war. Sign in with Play with friends to use them."}</p>`;
  return head(null, "Battle alerts", "On this device") + `<div class="body tipcard">${body}
    ${typeof PWA !== "undefined" && PWA.canOffer() && st !== "install" ? `<div class="sec tight"><button class="btn small" data-act="pwainstall">📲 Install the app</button></div>` : ""}
    <div class="row"><button class="btn small" data-act="open" data-v="title">← Back</button></div></div>`;
}
// the Menu button: its label says the state at a glance
function alertsMenuButton() {
  const st = alertState(); if (st === "off" && !(window.DS && DS.user)) return "";
  return `<button class="btn small" data-act="open" data-v="apptip" data-k="menu">${st === "on" ? "🔔 Alerts on" : "🔕 Battle alerts"}</button>`;
}

// the app-icon badge: shown while a friends war's orders are waiting to be sealed, cleared once sealed (only where alerts are allowed, as iPhone requires)
let badgeWas = null;
function syncAppBadge() {
  try {
    if (!("setAppBadge" in navigator) || !("Notification" in window) || Notification.permission !== "granted") return;
    const want = !!(appLive() && S && mode === "plan" && !S.locked && alertState() === "on");
    if (want === badgeWas) return; badgeWas = want;
    (want ? navigator.setAppBadge(1) : navigator.clearAppBadge()).catch(() => {});
  } catch (e) {}
}
