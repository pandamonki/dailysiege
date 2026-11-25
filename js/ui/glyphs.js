// Drawn icons in place of emoji. Phones draw emoji in their own cartoon style, which clashes with the game's art, so any emoji
// listed in GLYPH_SWAP is swapped for a small icon in the game's own style (chunky fills, dark brown outline) wherever it
// appears as text on screen. The game's text keeps its emoji; this only changes what is drawn. Canvas text is untouched.
const { GLYPHS, GLYPH_SWAP } = (() => {
const D = "#3a1a08", G = "#e2b33c", GL = "#f6d978", R = "#c8402f", RD = "#8e2a1e", S = "#c4ccd3", SD = "#7d8a94", W = "#8a5a2b", WL = "#b07a3c", B = "#efe4c8", GR = "#47b04b", BL = "#5b8fd6";
const O = `stroke="${D}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
const ln = (x1, y1, x2, y2, c, w = 2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${D}" stroke-width="${w + 1.8}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const svg = b => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;
const medal = (n, c, c2) => svg(`<polygon points="5,1.5 10,1.5 13.5,9 8.5,9" fill="${R}" ${O}/><polygon points="19,1.5 14,1.5 10.5,9 15.5,9" fill="${BL}" ${O}/><circle cx="12" cy="15" r="7" fill="${c}" ${O}/><circle cx="12" cy="15" r="4.6" fill="none" stroke="${c2}" stroke-width="1.2"/><text x="12" y="18.1" text-anchor="middle" font-size="8.5" font-weight="700" font-family="Georgia,serif" fill="${D}">${n}</text>`);
const sword = (flip) => `<g ${flip ? 'transform="translate(24 0) scale(-1 1)"' : ""}>${ln(4, 4, 16, 16, S, 2.2)}${ln(13.6, 18.4, 18.4, 13.6, G, 1.8)}${ln(17.2, 17.2, 20.6, 20.6, W, 2)}</g>`;
const ring = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="5.2" fill="none" stroke="${D}" stroke-width="3.6"/><circle cx="${cx}" cy="${cy}" r="5.2" fill="none" stroke="${G}" stroke-width="1.9"/>`;
const shield = `<path d="M12 2.5 L20 5.5 V11 C20 16 16.5 19.5 12 21.5 C7.5 19.5 4 16 4 11 V5.5 Z" fill="${S}" ${O}/><path d="M12 3 V21 C16.2 19.1 19.5 15.8 19.5 11 V5.9 Z" fill="${BL}"/><path d="M12 2.5 L20 5.5 V11 C20 16 16.5 19.5 12 21.5 C7.5 19.5 4 16 4 11 V5.5 Z" fill="none" ${O}/><path d="M12 2.5 V21.5" ${O}/>`;
const castle = `<rect x="2.5" y="7" width="5.5" height="14" fill="${S}" ${O}/><rect x="16" y="7" width="5.5" height="14" fill="${S}" ${O}/><rect x="7" y="10" width="10" height="11" fill="${SD}" ${O}/><path d="M2.5 7 V4.5 H4 V6 H6.5 V4.5 H8 V7 M16 7 V4.5 H17.5 V6 H20 V4.5 H21.5 V7" fill="${S}" ${O}/><path d="M10 21 V16.5 A2 2 0 0 1 14 16.5 V21 Z" fill="${W}" ${O}/><path d="M12 10 V3" ${O}/><polygon points="12,3 17,4.5 12,6" fill="${R}" ${O}/>`;
const bell = `<path d="M12 3.5 C8 3.5 6.5 6.5 6.5 10.5 V14 L4.5 17.5 H19.5 L17.5 14 V10.5 C17.5 6.5 16 3.5 12 3.5 Z" fill="${G}" ${O}/><circle cx="12" cy="19.6" r="1.9" fill="${W}" ${O}/><circle cx="12" cy="2.9" r="1.1" fill="${G}" ${O}/><path d="M8.6 9 C8.8 7 9.8 6 11 5.8" stroke="${GL}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
const hourglass = `<path d="M7 4 H17 C17 9 13 10.5 13 12 C13 13.5 17 15 17 20 H7 C7 15 11 13.5 11 12 C11 10.5 7 9 7 4 Z" fill="#e8f0f4" ${O}/><path d="M8.6 6 H15.4 C14.9 8.5 12.8 9.8 12 11 C11.2 9.8 9.1 8.5 8.6 6 Z" fill="${G}"/><path d="M8.2 19 C9 16.6 11 15.6 12 15.6 C13 15.6 15 16.6 15.8 19 Z" fill="${G}"/><rect x="5" y="2" width="14" height="2.4" rx=".8" fill="${W}" ${O}/><rect x="5" y="19.6" width="14" height="2.4" rx=".8" fill="${W}" ${O}/>`;
const star = `<polygon points="12,2.2 14.9,8.6 21.8,9.3 16.6,13.9 18.1,20.8 12,17.3 5.9,20.8 7.4,13.9 2.2,9.3 9.1,8.6" fill="${G}" ${O}/><polygon points="12,6 13.4,9.6 12,12.5 10.6,9.6" fill="${GL}"/>`;
const crown = `<path d="M3 18 L2 7 L7.5 11.5 L12 4 L16.5 11.5 L22 7 L21 18 Z" fill="${G}" ${O}/><rect x="3" y="16.5" width="18" height="4" rx="1" fill="${GL}" ${O}/><circle cx="12" cy="13.2" r="1.6" fill="${R}" ${O}/><circle cx="2" cy="7" r="1.1" fill="${G}" ${O}/><circle cx="12" cy="4" r="1.1" fill="${G}" ${O}/><circle cx="22" cy="7" r="1.1" fill="${G}" ${O}/>`;
const skull = `<path d="M12 3 C7 3 4 6.5 4 10.5 C4 13 5.2 14.6 7 15.5 V19.5 H17 V15.5 C18.8 14.6 20 13 20 10.5 C20 6.5 17 3 12 3 Z" fill="${B}" ${O}/><circle cx="8.8" cy="11" r="2.1" fill="${D}"/><circle cx="15.2" cy="11" r="2.1" fill="${D}"/><polygon points="12,13.2 10.9,15.3 13.1,15.3" fill="${D}"/><path d="M10 17 V19.5 M12 17 V19.5 M14 17 V19.5" stroke="${D}" stroke-width="1.1"/>`;
const dagger = `<g transform="rotate(40 12 12)"><polygon points="12,1.5 14.2,13 9.8,13" fill="${S}" ${O}/><path d="M12 3 V12.5" stroke="#fff" stroke-width=".9" opacity=".7"/><rect x="6.8" y="13" width="10.4" height="2.4" rx="1" fill="${G}" ${O}/><rect x="10.8" y="15.4" width="2.4" height="4.6" fill="${W}" ${O}/><circle cx="12" cy="21" r="1.5" fill="${G}" ${O}/></g>`;
const boot = `<path d="M7.5 3 H13.5 V13 L18.5 14.6 C20.6 15.2 21 17 21 18.5 V20.5 H5 V17 L7.5 13 Z" fill="${WL}" ${O}/><rect x="7" y="3" width="7" height="3.4" rx=".8" fill="${W}" ${O}/><path d="M5 18.4 H21" ${O}/><path d="M10 9 H12 M10 11.2 H12" stroke="${D}" stroke-width="1"/>`;
const heart = `<path d="M12 20.5 C5 15.5 2.8 12 2.8 8.7 A4.6 4.6 0 0 1 12 6.6 A4.6 4.6 0 0 1 21.2 8.7 C21.2 12 19 15.5 12 20.5 Z" fill="${R}" ${O}/><path d="M6.2 8.2 C6.4 6.9 7.3 6.2 8.4 6.1" stroke="#f08f80" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
const buckler = `<circle cx="12" cy="12" r="9" fill="${S}" ${O}/><circle cx="12" cy="12" r="6" fill="${SD}" ${O}/><circle cx="12" cy="12" r="2.3" fill="${G}" ${O}/>`;
const bow = `${ln(4.5, 19.5, 18.5, 5.5, W, 1.8)}<polygon points="21,3 15.6,4.8 19.2,8.4" fill="${S}" ${O}/><polygon points="4.5,19.5 3,15.5 6,15.5 6.5,17.5" fill="${R}" ${O}/><polygon points="4.5,19.5 8.5,21 8.5,18 6.5,17.5" fill="${R}" ${O}/>`;
const cross = `<path d="M9 3 H15 V9 H21 V15 H15 V21 H9 V15 H3 V9 H9 Z" fill="${GR}" ${O}/>`;
const padlock = `<path d="M8 11 V7.5 A4 4 0 0 1 16 7.5 V11" fill="none" stroke="${D}" stroke-width="3.6"/><path d="M8 11 V7.5 A4 4 0 0 1 16 7.5 V11" fill="none" stroke="${S}" stroke-width="1.8"/><rect x="5" y="10.5" width="14" height="10.5" rx="2" fill="${G}" ${O}/><circle cx="12" cy="14.7" r="1.6" fill="${D}"/><rect x="11.3" y="15" width="1.4" height="3.3" fill="${D}"/>`;
const gift = `<path d="M12 7.5 C10.5 3.5 6.5 2.5 5.5 4.5 C4.6 6.4 8 7.5 12 7.5 Z" fill="${R}" ${O}/><path d="M12 7.5 C13.5 3.5 17.5 2.5 18.5 4.5 C19.4 6.4 16 7.5 12 7.5 Z" fill="${R}" ${O}/><rect x="4" y="11" width="16" height="10" rx="1" fill="${G}" ${O}/><rect x="2.8" y="7.5" width="18.4" height="4" rx="1" fill="${GL}" ${O}/><rect x="10.4" y="7.5" width="3.2" height="13.5" fill="${R}" ${O}/><path d="M5.5 13 V19" stroke="#f6d978" stroke-width="1.2" stroke-linecap="round"/>`;
const dice = `<rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="${B}" ${O}/>${[[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${R}"/>`).join("")}`;
const bag = `<path d="M8.5 7.5 C3.5 11 3.5 21 12 21 C20.5 21 20.5 11 15.5 7.5 Z" fill="${WL}" ${O}/><path d="M9 7.5 L7.5 3 L16.5 3 L15 7.5 Z" fill="${WL}" ${O}/><path d="M8.2 7.5 H15.8" stroke="${D}" stroke-width="2"/><circle cx="12" cy="14.5" r="3.4" fill="${G}" ${O}/><circle cx="12" cy="14.5" r="1.6" fill="none" stroke="#a47a1a" stroke-width="1"/>`;
const riseP = "M3 19 L9 12.5 L13 15.5 L18 10"; const rise = `<path d="${riseP}" fill="none" stroke="${D}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><path d="${riseP}" fill="none" stroke="${G}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><polygon points="21.5,6 20.6,13.2 14.3,8.2" fill="${G}" ${O}/>`;
const target = `<circle cx="11" cy="13" r="8.5" fill="${B}" ${O}/><circle cx="11" cy="13" r="5.6" fill="${R}" ${O}/><circle cx="11" cy="13" r="2.6" fill="${B}" ${O}/>${ln(11, 13, 20, 4, W, 1.5)}<polygon points="20,4 22,2.2 22.6,5.2 21,6" fill="${R}" ${O}/>`;
const trophy = `<path d="M7.5 5.5 H4.5 C4.5 9 6 10.5 8.3 10.8 M16.5 5.5 H19.5 C19.5 9 18 10.5 15.7 10.8" fill="none" stroke="${D}" stroke-width="3.2" stroke-linecap="round"/><path d="M7.5 5.5 H4.5 C4.5 9 6 10.5 8.3 10.8 M16.5 5.5 H19.5 C19.5 9 18 10.5 15.7 10.8" fill="none" stroke="${G}" stroke-width="1.6" stroke-linecap="round"/><path d="M7 3 H17 V8.5 A5 5 0 0 1 7 8.5 Z" fill="${G}" ${O}/><rect x="10.6" y="13.4" width="2.8" height="3" fill="${G}" ${O}/><rect x="7" y="16.4" width="10" height="4.6" rx="1" fill="${W}" ${O}/><path d="M9 5 V8.5" stroke="${GL}" stroke-width="1.4" stroke-linecap="round"/>`;
const bomb = `<circle cx="11" cy="14" r="7" fill="#3b3f45" ${O}/><circle cx="8.4" cy="11.5" r="1.7" fill="#8a929b"/><rect x="13.2" y="6.1" width="3.6" height="3" rx=".6" transform="rotate(40 15 7.6)" fill="${SD}" ${O}/><path d="M16.5 6 Q18 3.2 20.5 3.5" fill="none" stroke="${W}" stroke-width="1.6"/><polygon points="20.8,1.3 21.6,3 23.4,3.4 21.8,4.2 21.5,6 20.5,4.5 18.8,4.4 20.2,3.3" fill="${GL}" stroke="${R}" stroke-width=".8"/>`;
const paw = `<ellipse cx="12" cy="16" rx="5.2" ry="4.4" fill="#6b6f78" ${O}/>${[[5.8, 10.6], [9.6, 6.6], [14.4, 6.6], [18.2, 10.6]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.1" ry="2.5" fill="#6b6f78" ${O}/>`).join("")}`;
const letter = `<rect x="2.5" y="5.5" width="19" height="13.5" rx="1" fill="${B}" ${O}/><path d="M2.5 6 L12 13 L21.5 6" fill="none" ${O}/><circle cx="12" cy="13" r="2.9" fill="${R}" ${O}/><circle cx="12" cy="13" r="1.2" fill="${RD}"/>`;
const burst = `<polygon points="12,1.5 14.2,7.5 20.5,4.5 17.2,10.3 22.5,12.5 16.6,14.4 18.8,20.5 12.8,16.8 9.6,22.5 8.8,16.1 2.5,17.5 6.5,12.6 1.8,8.4 8.2,8.4 7.2,2.5 11,7" fill="#f08a2a" ${O}/><circle cx="12" cy="12" r="3.4" fill="${GL}"/>`;
const flame = `<path d="M12 2.5 C13.2 7 18.5 9 18.5 14.5 A6.5 6.5 0 0 1 5.5 14.5 C5.5 11 8 9.5 8.6 7 C10.3 8.6 10.4 10 10.4 11.2 C12 9 12.6 6 12 2.5 Z" fill="#f08a2a" ${O}/><path d="M12 12 C13.2 14 15.2 15 15.2 17.2 A3.2 3.2 0 0 1 8.8 17.2 C8.8 15.6 11 14 12 12 Z" fill="${GL}"/>`;
const moon = `<circle cx="12" cy="12" r="8.8" fill="${R}" ${O}/><circle cx="9" cy="9.5" r="1.8" fill="${RD}"/><circle cx="14.8" cy="14" r="2.4" fill="${RD}"/><circle cx="8.5" cy="15.3" r="1.1" fill="${RD}"/>`;
const hill = `<path d="M1.5 20.5 L9 8.5 L13 13.8 L16 10.5 L22.5 20.5 Z" fill="${GR}" ${O}/><path d="M9 8.5 V2.5" ${O}/><polygon points="9,2.5 14.5,4.2 9,5.9" fill="${G}" ${O}/>`;
const pennant = `${ln(6, 2.5, 6, 21.5, W, 2)}<path d="M7 4 H20 L16.6 8 L20 12 H7 Z" fill="${B}" ${O}/>`;
const hammer = `${ln(5, 20, 13.5, 11.5, W, 2.4)}<polygon points="9.2,6.6 14.2,1.6 21.4,8.8 16.4,13.8" fill="${SD}" ${O}/><path d="M11.4 7.2 L15.2 3.4" stroke="${S}" stroke-width="1.2"/>`;
const axe = `${ln(5, 21, 16.5, 5, W, 2.2)}<path d="M12.6 7 L17.4 3 C20.6 5 21.6 8.6 20.8 11.8 L15.8 10.4 Z" fill="${S}" ${O}/>`;
const drop = `<path d="M12 2.5 C15 7.5 18.5 10.8 18.5 15 A6.5 6.5 0 0 1 5.5 15 C5.5 10.8 9 7.5 12 2.5 Z" fill="${R}" ${O}/><path d="M8.6 14.5 C8.6 12.8 9.4 11.6 10.2 10.8" stroke="#f08f80" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
const scales = `${ln(12, 4, 12, 19.5, W, 1.6)}${ln(3.5, 7, 20.5, 7, G, 1.6)}<path d="M3.5 7 L1.8 13 M3.5 7 L6.2 13 M20.5 7 L17.8 13 M20.5 7 L22.2 13" stroke="${D}" stroke-width=".9"/><path d="M1.2 13 H6.8 A2.8 2.8 0 0 1 1.2 13 Z" fill="${G}" ${O}/><path d="M17.2 13 H22.8 A2.8 2.8 0 0 1 17.2 13 Z" fill="${G}" ${O}/><rect x="8" y="19" width="8" height="2.8" rx=".8" fill="${W}" ${O}/>`;
const wall = `<path d="M2.5 21 V7.5 H5 V5 H8 V7.5 H10.5 V5 H13.5 V7.5 H16 V5 H19 V7.5 H21.5 V21 Z" fill="#9aa3ab" ${O}/><path d="M2.5 12 H21.5 M2.5 16.5 H21.5 M8 7.5 V12 M16 7.5 V12 M12 12 V16.5 M5 16.5 V21 M19 16.5 V21 M12 16.5 V21" stroke="${D}" stroke-width="1"/>`;
const eye = `<path d="M1.8 12 C5 6.4 19 6.4 22.2 12 C19 17.6 5 17.6 1.8 12 Z" fill="${B}" ${O}/><circle cx="12" cy="12" r="3.8" fill="${BL}" ${O}/><circle cx="12" cy="12" r="1.6" fill="${D}"/>`;
const install = `<rect x="10" y="2.5" width="4" height="9" fill="${G}" ${O}/><polygon points="5.5,11 18.5,11 12,18" fill="${G}" ${O}/><path d="M3.5 16.5 V21 H20.5 V16.5" fill="none" stroke="${D}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 16.5 V21 H20.5 V16.5" fill="none" stroke="${W}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
const bolt = `<polygon points="13.5,1.8 4.5,13.5 11,13.5 8.8,22.2 19.5,9.5 13,9.5 15.6,1.8" fill="${G}" ${O}/>`;
const broken = `${ring(7, 12)}${ring(17, 12)}<path d="M11.2 9.5 L12.8 14.5" stroke="${R}" stroke-width="2.2" stroke-linecap="round"/><path d="M12 3.5 V6.5 M12 17.5 V20.5" stroke="${R}" stroke-width="1.6" stroke-linecap="round"/>`;
const pact = `${ring(9, 12)}${ring(15, 12)}<path d="M13.4 7.7 A5.2 5.2 0 0 1 14.2 7.1" stroke="${G}" stroke-width="1.9" fill="none"/>`;
const wholeMap = `<path d="M3.5 9 V3.5 H9 M15 3.5 H20.5 V9 M20.5 15 V20.5 H15 M9 20.5 H3.5 V15" fill="none" stroke="${D}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const bellOff = `${bell}<line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="${D}" stroke-width="3.6" stroke-linecap="round"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="${R}" stroke-width="1.8" stroke-linecap="round"/>`;

const ICONS = {
  crown: svg(crown), trophy: svg(trophy), m1: medal("1", G, "#a47a1a"), m2: medal("2", "#cfd6dc", "#8a959e"), m3: medal("3", "#c9844a", "#8a4f22"),
  target: svg(target), star: svg(star), bag: svg(bag), rise: svg(rise), shield: svg(shield), boot: svg(boot), heart: svg(heart), hourglass: svg(hourglass),
  padlock: svg(padlock), bell: svg(bell), bellOff: svg(bellOff), dice: svg(dice), gift: svg(gift), swords: svg(sword(false) + sword(true)), dagger: svg(dagger), skull: svg(skull),
  pact: svg(pact), broken: svg(broken), bomb: svg(bomb), paw: svg(paw), letter: svg(letter), burst: svg(burst), castle: svg(castle), flame: svg(flame), moon: svg(moon),
  hill: svg(hill), pennant: svg(pennant), hammer: svg(hammer), axe: svg(axe), drop: svg(drop), scales: svg(scales), wall: svg(wall), eye: svg(eye), install: svg(install),
  bolt: svg(bolt), buckler: svg(buckler), bow: svg(bow), cross: svg(cross), wholeMap: svg(wholeMap),
};
// what each emoji becomes ("" drops it: a decorative mark on a button that reads fine without it)
const SWAP = {
  "👑": "crown", "♛": "crown", "🏆": "trophy", "🥇": "m1", "🥈": "m2", "🥉": "m3", "🎯": "target", "⭐": "star", "★": "star", "💰": "bag", "📈": "rise",
  "🛡": "shield", "⛨": "buckler", "👢": "boot", "❤": "heart", "⏳": "hourglass", "⏱": "hourglass", "🔒": "padlock", "🔔": "bell", "🔕": "bellOff", "🎲": "dice", "🎁": "gift",
  "⚔": "swords", "🗡": "dagger", "💀": "skull", "☠": "skull", "🤝": "pact", "✋": "broken", "✂": "broken", "💣": "bomb", "🐺": "paw", "✉": "letter", "💥": "burst",
  "🏰": "castle", "♜": "castle", "🔥": "flame", "🌕": "moon", "⛰": "hill", "🏳": "pennant", "🔨": "hammer", "🪓": "axe", "⛏": "axe", "🩸": "drop", "🛒": "scales", "🧱": "wall",
  "🎥": "eye", "📲": "install", "😲": "bolt", "➶": "bow", "✚": "cross", "⛶": "wholeMap", "⚡": "bolt",
};

return { GLYPHS: ICONS, GLYPH_SWAP: SWAP };
})();
const glyphHTML = ch => { const k = GLYPH_SWAP[ch]; return k ? `<span class="glyph" aria-hidden="true">${GLYPHS[k]}</span>` : ch; };
(() => {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  const keys = Object.keys(GLYPH_SWAP).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp("(" + keys.join("|") + ")\uFE0F?", "g"), test = new RegExp(re.source);
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|TITLE|svg|text)$/i;
  const swapText = n => {
    const v = n.nodeValue, par = n.parentNode; if (!v || !par || !test.test(v) || SKIP.test(par.nodeName) || (par.closest && par.closest("svg,[data-noglyph]"))) return;
    const frag = document.createDocumentFragment(); let last = 0; re.lastIndex = 0;
    for (let m; (m = re.exec(v));) { if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
      const s = document.createElement("span"); s.className = "glyph"; s.setAttribute("aria-hidden", "true"); s.innerHTML = GLYPHS[GLYPH_SWAP[m[1]]]; frag.appendChild(s); last = m.index + m[0].length; }
    if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last)));
    par.replaceChild(frag, n);
  };
  const walk = root => { if (root.nodeType === 3) { swapText(root); return; } if (root.nodeType !== 1 || SKIP.test(root.nodeName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = []; while (w.nextNode()) list.push(w.currentNode); list.forEach(swapText); };
  const start = () => { walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === "characterData") swapText(m.target); else m.addedNodes.forEach(walk); } }).observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
