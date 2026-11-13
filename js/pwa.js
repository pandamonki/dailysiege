// Installing the game to the home screen, and keeping it cached for instant and offline starts.
// Does nothing inside Claude (the game runs in a frame there) or when opened as a plain file.
const PWA = (() => {
  const st = { ok: false, reg: null, prompt: null, updated: false };
  const standalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let framed = true; try { framed = window.top !== window; } catch (e) {}
  if (!framed && "serviceWorker" in navigator && (location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    st.ok = true;
    // Register straight away (not after the load event) and keep looking for a newer version: when the app comes back
    // to the front, and every few minutes while it stays open. A resumed home-screen app never reloads, so without this
    // it would not notice a new version until it was fully closed.
    const check = () => { if (st.reg) st.reg.update().catch(() => {}); };
    navigator.serviceWorker.register("/sw.js").then(r => { st.reg = r; }).catch(() => { st.ok = false; }); // no sw.js when running from the dev server: fine
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    setInterval(() => { if (document.visibilityState === "visible") check(); }, 5 * 60000);
    // The new version is already stored and in charge by the time this arrives, so a reload switches to it at once.
    const banner = () => {
      if (document.getElementById("ds-update")) return;
      const b = document.createElement("button");
      b.id = "ds-update"; b.type = "button"; b.textContent = "New version ready. Tap to update";
      b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom));z-index:99999;padding:12px 18px;border-radius:999px;border:0;background:#e8b04a;color:#1a1208;font:600 15px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.5);cursor:pointer";
      b.onclick = () => location.reload();
      document.body.appendChild(b);
    };
    navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.type === "ds-updated") { st.updated = true; banner(); } });
    addEventListener("beforeinstallprompt", e => { e.preventDefault(); st.prompt = e; try { render(); } catch (err) {} }); // Android and desktop Chrome: we can offer an Install button
    addEventListener("appinstalled", () => { st.prompt = null; try { toast("Installed. Find Daily Siege on your home screen."); render(); } catch (err) {} });
  }
  return {
    ready: () => (st.ok && navigator.serviceWorker.ready) || Promise.reject(new Error("no service worker")),
    standalone, isIOS,
    // Worth showing an "Install" button: whenever the game is not already running from the home screen. If the browser
    // offers a one-tap install we use it; otherwise the button shows how to do it from the browser's menu. (Chrome does
    // not offer the one-tap install inside another app's browser tab, so waiting for the offer hid the button there.)
    canOffer: () => st.ok && !standalone(),
    install: async () => { if (!st.prompt) return false; const p = st.prompt; st.prompt = null; p.prompt(); try { await p.userChoice; } catch (e) {} return true; },
    hasPrompt: () => !!st.prompt,
  };
})();
