// Saving the highlights reel, or one key moment, as a video to share

// ----- saving the reel as a video -----
// A finished video is kept in SHARE_CLIP and offered at the top of the recap with a Share button. The phone's share sheet only
// opens on a fresh tap, and the recording ends seconds after the tap that started it, so the share is a second tap.
let SHARE_CLIP = null; // { blob, filename, url, title }
const canRecord = () => typeof MediaRecorder !== "undefined" && !!(cvs && cvs.captureStream);
const fileSlug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
function startRecording(clip) {
  if (!canRecord()) { toast("This browser can't record video. The reel plays anyway."); return; }
  const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"], type = types.find(t => MediaRecorder.isTypeSupported(t)) || "";
  let mr; try { mr = new MediaRecorder(cvs.captureStream(30), type ? { mimeType: type, videoBitsPerSecond: 4e6 } : undefined); } catch (e) { toast("Couldn't start recording here."); return; }
  const chunks = [], rec = { mr, chunks, type: type || "video/webm" }; replay.reel.rec = rec;
  const day = replay && replay.day ? replay.day : new Date().toISOString().slice(0, 10), title = clip ? clip.title : "Highlights";
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    const blob = new Blob(chunks, { type: rec.type.split(";")[0] }), ext = rec.type.includes("mp4") ? "mp4" : "webm";
    if (SHARE_CLIP) URL.revokeObjectURL(SHARE_CLIP.url);
    SHARE_CLIP = { blob, title, filename: `daily-siege-${day}-${fileSlug(title) || "clip"}.${ext}`, url: URL.createObjectURL(blob) };
    if (replay) open("results");
  };
  mr.start(500); const dot = document.getElementById("recdot"); if (dot) dot.hidden = false;
}
