// The game's own scripts (js/**) are legacy classic scripts sharing one global scope; linting is
// off for them until they become modules. Tooling, tests and config are linted.
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["js/**", "dist/**", "node_modules/**", "functions/game/**", "functions/node_modules/**"] },
  js.configs.recommended,
  { files: ["**/*.js", "**/*.mjs"], languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: globals.node } },
  { files: ["functions/**/*.js"], languageOptions: { sourceType: "commonjs", globals: globals.node } },
  // the end-to-end test passes small functions into the game's page, where the game's own globals exist
  { files: ["emulator-tests/e2e.spec.mjs"], rules: { "no-undef": "off" } },
  // this one passes small functions into a browser page, where window and document exist
  { files: ["tools/selftest-browsers.mjs"], languageOptions: { globals: { ...globals.node, window: "readonly", document: "readonly", runBattle: "readonly" } } },
];
