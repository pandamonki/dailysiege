// Installing the game to the home screen, and keeping it cached for instant and offline starts.
// Does nothing inside Claude (the game runs in a frame there) or when opened as a plain file.
const PWA = (() => {
  const st = { ok: false, reg: null, prompt: null, updated: false };
  const standalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let framed = true; try { framed = window.top !== window; } catch (e) {}
  if (!framed && "serviceWorker" in navigator && (location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    st.ok = true;
    addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then(r => { st.reg = r; }).catch(() => { st.ok = false; }); // no sw.js when running from the dev server: fine
      navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.type === "ds-updated") { st.updated = true; try { toast("A new version is ready. Close and reopen the game to use it."); } catch (err) {} } });
    });
    addEventListener("beforeinstallprompt", e => { e.preventDefault(); st.prompt = e; try { render(); } catch (err) {} }); // Android and desktop Chrome: we can offer an Install button
    addEventListener("appinstalled", () => { st.prompt = null; try { toast("Installed. Find Daily Siege on your home screen."); render(); } catch (err) {} });
  }
  return {
    ready: () => (st.ok && navigator.serviceWorker.ready) || Promise.reject(new Error("no service worker")),
    standalone, isIOS,
    canOffer: () => st.ok && !standalone() && (!!st.prompt || isIOS()), // worth showing an "Install" button
    install: async () => { if (!st.prompt) return false; const p = st.prompt; st.prompt = null; p.prompt(); try { await p.userChoice; } catch (e) {} return true; },
    hasPrompt: () => !!st.prompt,
  };
})();
