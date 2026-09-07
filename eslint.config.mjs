import prettier from "eslint-config-prettier/flat";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";
export default [
  {
    ignores: [
      "**/dist/**",
      "node_modules/**",
      "artifacts/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    rules: { "vue/multi-word-component-names": "off" },
  },
  {
    languageOptions: {
      globals: Object.fromEntries(
        [
          "window",
          "HTMLElement",
          "HTMLDivElement",
          "PointerEvent",
          "KeyboardEvent",
          "__BUILD_VERSION__",
          "__BUILD_COMMIT__",
          "process",
          "console",
          "fetch",
          "URL",
          "Request",
          "Headers",
          "AbortSignal",
          "setTimeout",
          "clearTimeout",
          "setInterval",
          "clearInterval",
          "Buffer",
        ].map((k) => [k, "readonly"]),
      ),
    },
  },
  prettier,
];
