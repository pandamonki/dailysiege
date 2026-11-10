// Vite is used as a dev server and a simple bundler only. The game is classic scripts sharing one
// global scope (load order in index.html matters), so nothing is converted to ES modules: the
// scripts and images are served, and copied into the build, exactly as they are.
import { defineConfig } from "vite";
import { cpSync } from "node:fs";
import path from "node:path";

// Folders and files the page loads by path at run time. Vite only bundles the stylesheets.
const STATIC = ["js", "icons", "items", "title.jpg", "test/golden/hashes.json"]; // the last one is read by selftest.html

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
    closeBundle() { for (const s of STATIC) cpSync(s, path.join(outDir, s), { recursive: true }); },
  };
}

export default defineConfig({
  base: "./", // relative paths, so the build works from any folder or hosting sub-path
  publicDir: false,
  plugins: [classicScripts()],
  server: { host: true, port: 5173 },
  build: { outDir: "dist", emptyOutDir: true, rollupOptions: { input: { main: "index.html", selftest: "selftest.html" } } },
  logLevel: "info",
});
