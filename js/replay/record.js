// Saving the highlights reel as a video

// ----- saving the reel as a video -----
const canRecord = () => typeof MediaRecorder !== "undefined" && !!(cvs && cvs.captureStream);
function startRecording() {
  if (!canRecord()) { toast("This browser can't record video. The reel plays anyway."); return; }
  const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"], type = types.find(t => MediaRecorder.isTypeSupported(t)) || "";
  let mr; try { mr = new MediaRecorder(cvs.captureStream(30), type ? { mimeType: type, videoBitsPerSecond: 4e6 } : undefined); } catch (e) { toast("Couldn't start recording here."); return; }
  const chunks = [], rec = { mr, chunks, type: type || "video/webm" }; replay.reel.rec = rec;
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = async () => {
    const blob = new Blob(chunks, { type: rec.type.split(";")[0] }), ext = rec.type.includes("mp4") ? "mp4" : "webm";
    const day = replay && replay.day ? replay.day : new Date().toISOString().slice(0, 10);
    const dl = window.claude && typeof window.claude.use === "function" ? await window.claude.use("downloads").catch(() => null) : null;
    if (!dl) { toast("Saving files isn't available in this view."); if (replay) open("results"); return; }
    try { await dl.save({ filename: `last-banner-highlights-${day}.${ext}`, data: blob }); }
    catch (e) { if (e && e.code !== "declined") toast(e.code === "too_large" ? "The video is too large to save here." : "Couldn't save the video."); }
    if (replay) open("results");
  };
  mr.start(500); const dot = document.getElementById("recdot"); if (dot) dot.hidden = false;
}
