import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    execArgv: ["--no-experimental-webstorage"],
    include: ["tests/unit/**/*.test.{ts,tsx,mjs}"],
    setupFiles: ["./tests/setup.ts"],
    // The jsdom axe pass exceeds the 5 second default on a cold coverage run.
    testTimeout: 20_000,
    typecheck: {
      enabled: true,
      include: ["tests/types/**/*.test-d.ts"],
      tsconfig: "./tsconfig.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/index.ts"],
      thresholds: {
        branches: 85,
        functions: 95,
        lines: 95,
        statements: 92,
      },
    },
  },
});
