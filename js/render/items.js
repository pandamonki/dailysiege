// Shop item icons

// ----- shop item icons -----
const ITEM_URL = {};
const ITEM_ART = {};
const loadItemArt = () => ["boots", "gauntlets", "ringprot", "salve", "elixir", "net", "frostdagger", "venomorb", "fang", "thornmail", "talisman", "scroll", "banner", "standard", "mender"].forEach(k => { const im = new Image(); im.onload = () => { Object.keys(ITEM_URL).forEach(x => delete ITEM_URL[x]); }; im.src = "items/" + k + ".png"; ITEM_ART[k] = im; });
addEventListener("load", () => setTimeout(loadItemArt, 500));
function itemURL(k, size = 56) {
  const id = k + size; if (ITEM_URL[id]) return ITEM_URL[id];
  const art = ITEM_ART[k];
  if (art && art.complete && art.naturalWidth) {
    const cv0 = document.createElement("canvas"); cv0.width = cv0.height = size; const c0 = cv0.getContext("2d"), rr = size * .14, tc = ["#9a8a6a", "#c9962f", "#e8d28a"][(ITEMS[k] ? ITEMS[k].tier : 1) - 1];
    c0.save(); c0.beginPath(); c0.roundRect ? c0.roundRect(1.5, 1.5, size - 3, size - 3, rr) : c0.rect(1.5, 1.5, size - 3, size - 3); c0.clip(); c0.drawImage(art, 0, 0, size, size); c0.restore();
    c0.beginPath(); c0.roundRect ? c0.roundRect(1.5, 1.5, size - 3, size - 3, rr) : c0.rect(1.5, 1.5, size - 3, size - 3); c0.strokeStyle = tc; c0.lineWidth = Math.max(2, size * .05); c0.stroke();
    return (ITEM_URL[id] = cv0.toDataURL());
  }
  const it = ITEMS[k], cv = document.createElement("canvas"); cv.width = cv.height = size; const c = cv.getContext("2d");
  const g = c.createRadialGradient(size * .4, size * .3, 2, size / 2, size / 2, size * .7); g.addColorStop(0, "#5a4632"); g.addColorStop(1, "#1e140c");
  c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(2, 2, size - 4, size - 4, size * .16) : c.rect(2, 2, size - 4, size - 4); c.fill();
  c.strokeStyle = ["#9a8a6a", "#c9962f", "#e8d28a"][it.tier - 1]; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = hexA(it.col, .35); c.beginPath(); c.arc(size / 2, size / 2, size * .34, 0, 7); c.fill();
  c.fillStyle = it.col; c.font = `700 ${Math.round(size * .55)}px Georgia, serif`; c.textAlign = "center"; c.textBaseline = "middle";
  c.shadowColor = "rgba(0,0,0,.7)"; c.shadowBlur = 3; c.fillText(it.g, size / 2, size / 2 + 2);
  return (ITEM_URL[id] = cv.toDataURL());
}
