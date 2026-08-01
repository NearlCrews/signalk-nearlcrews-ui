import eslint from "@eslint/js";
// The mainstream eslint-plugin-jsx-a11y peer range caps at ESLint 9 and this repo uses ESLint 10, so the fork is required until mainstream supports 10.
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".remember/**",
      "coverage/**",
      "dist/**",
      "fixtures/browser/dist/**",
      "fixtures/federation/**/dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "jsx-a11y-x": jsxA11y,
      "react-hooks": reactHooks,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      // recommended-latest carries the React Compiler diagnostics (purity,
      // immutability, refs, set-state-in-render, and friends); keep this preset
      // name pinned so the compiler coverage survives plugin upgrades.
      ...reactHooks.configs.flat["recommended-latest"].rules,
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        { ignoreArrowShorthand: true },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // Destructuring a key out so the rest spread omits it is how a caller
      // keeps a non-DOM prop off an element; the named binding is the point,
      // not an oversight.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: [
      "src/**/*.{ts,tsx}",
      "fixtures/browser/{federation,main}.tsx",
      "fixtures/federation/Panel.tsx",
      "tests/setup.ts",
      "tests/unit/**/*.{ts,tsx}",
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [
      "fixtures/browser/vite.config.ts",
      "playwright.config.ts",
      "tests/browser/**/*.{ts,tsx}",
      "vitest.config.ts",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["tests/browser/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["scripts/**/*.mjs", "**/*.config.{js,cjs,mjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
