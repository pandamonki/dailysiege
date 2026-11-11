// Vite is used as a dev server and a simple bundler only. The game is classic scripts sharing one
// global scope (load order in index.html matters), so nothing is converted to ES modules: the
// scripts and images are served, and copied into the build, exactly as they are.
import { defineConfig } from "vite";
import { cpSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

// Folders and files the page loads by path at run time. Vite only bundles the stylesheets.
const STATIC = ["js", "icons", "items", "audio", "app", "manifest.webmanifest", "title.jpg", "test/golden/hashes.json"]; // the last one is read by selftest.html

function classicScripts() {
  let outDir;
  return {
    name: "daily-siege-classic-scripts",
    configResolved(cfg) { outDir = path.resolve(cfg.root, cfg.build.outDir); },
    // dev: classic scripts are not part of Vite's module graph, so reload the page when one changes
    configureServer(server) {
      const dirs = STATIC.map(s => path.resolve(server.config.root, s));
      server.watcher.add(dirs);
      server.watcher.on("change", file => { if (dirs.some(d => file === d || file.startsWith(d + path.sep))) server.ws.send({ type: "full-reload" }); });
    },
    // build: copy them next to the built index.html
    closeBundle() {
      for (const s of STATIC) cpSync(s, path.join(outDir, s), { recursive: true });
      // The service worker: list every file of this build and stamp it with a version made from their contents,
      // so phones fetch a new version exactly when something changed.
      // left out: the worker itself, the self-test (always fetched fresh), and music (fetched and kept the first time it plays)
      const skip = f => f === "/sw.js" || f.startsWith("/test/") || f.startsWith("/audio/") || f === "/selftest.html" || f.endsWith("/selftest.js") || f.endsWith("/goldenCases.js");
      const walk = dir => readdirSync(dir).flatMap(n => { const p = path.join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
      const files = walk(outDir).map(p => "/" + path.relative(outDir, p).split(path.sep).join("/")).filter(f => !skip(f)).sort();
      const hash = createHash("sha256"); for (const f of files) { hash.update(f); hash.update(readFileSync(path.join(outDir, f))); }
      const sw = readFileSync("sw.src.js", "utf8").replace("__VERSION__", hash.digest("hex").slice(0, 12)).replace("__FILES__", JSON.stringify(files));
      writeFileSync(path.join(outDir, "sw.js"), sw);
    },
  };
}

export default defineConfig({
  base: "./", // relative paths, so the build works from any folder or hosting sub-path
  publicDir: false,
  plugins: [classicScripts()],
  server: { host: true, port: 5173 },
  build: { outDir: "dist", emptyOutDir: true, rollupOptions: { input: { main: "index.html", selftest: "selftest.html", join: "join.html" } } },
  logLevel: "info",
});
