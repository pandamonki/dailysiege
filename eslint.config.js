// The game's own scripts (js/**) are legacy classic scripts sharing one global scope; linting is
// off for them until they become modules. Tooling, tests and config are linted.
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["js/**", "dist/**", "node_modules/**"] },
  js.configs.recommended,
  { files: ["**/*.js", "**/*.mjs"], languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: globals.node } },
  // this one passes small functions into a browser page, where window and document exist
  { files: ["tools/selftest-browsers.mjs"], languageOptions: { globals: { ...globals.node, window: "readonly", document: "readonly", runBattle: "readonly" } } },
];
