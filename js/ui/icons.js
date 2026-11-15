// Inline stat icons

const IC = {
  hp: n => `<span class="ic" title="Health"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 11 1.1 6A3.1 3.1 0 0 1 6 2.1 3.1 3.1 0 0 1 10.9 6z" fill="#d6403a" stroke="#6e1410" stroke-width=".7" stroke-linejoin="round"/><path d="M3 4.4c.3-.8 1-1.1 1.6-.9" stroke="#ffb0a8" stroke-width=".8" fill="none" stroke-linecap="round"/></svg><b>${n}</b></span>`,
  atk: n => `<span class="ic" title="Attack"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M9.8 1.4 10.6 1.4 10.6 2.2 5 8 3.8 6.8z" fill="#dfe6ec" stroke="#3b4650" stroke-width=".7" stroke-linejoin="round"/><path d="M2.4 6.6l3 3M2.6 9.4 1.2 10.8" stroke="#8a5a2b" stroke-width="1.3" stroke-linecap="round"/></svg><b>${n}</b></span>`,
};

// Painted icons reused across screens (shop, skills and UI art), so every tile has a picture rather than a glyph
const SK = n => `icons/skills/${n}.webp`;
const ART = {
  trap: { spike: SK("rogue_b2_t2"), snare: SK("archer_b2_t2b"), blade: SK("rogue_b3_t3") },
  wave: SK("warrior_b3_t1"),
  gear: { weapon: "items/whetstone.webp", armour: SK("warrior_b1_t1"), charm: "items/evasion.webp", walls: "icons/ui/wall3.webp", tower: SK("archer_b1_t2") },
  bless: { vamp: SK("shaman_b3_t3"), ward: SK("warrior_b1_t2b") },
  cx: { butcher: SK("warrior_b2_t2"), hill: "icons/ui/deployed.webp", stand: SK("warrior_b1_t3"), siegework: SK("rogue_b1_t2b"), headhunter: SK("archer_b3_t1"), raze: "icons/mage_meteor.webp", deathless: "icons/warrior_last_stand.webp",
    podium: SK("archer_b3_t3b"), fortress: SK("warrior_b3_t2b"), hunt: SK("archer_b3_t2b"), sack: SK("rogue_b3_t2"), revenge: SK("shaman_b3_t1"), topple: "icons/ui/board.webp" },
  twist: { market: "icons/ui/shop.webp", bloodmoon: SK("shaman_b3_t1"), siege: SK("mage_b1_t3"), iron: "icons/ui/wall3.webp", hill: "icons/ui/deployed.webp", goldrush: "icons/ui/gold.webp", glory: SK("warrior_b2_t4"), calm: "icons/ui/day.webp" },
};
const artImg = (src, cls = "art") => src ? `<img class="${cls}" alt="" src="${src}">` : "";
