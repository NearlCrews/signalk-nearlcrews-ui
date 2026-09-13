import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig } from "vitest/config";

const nodeRequire = createRequire(import.meta.url);

/**
 * Absolute path to the TypeScript 7 compiler the type tests are checked with.
 *
 * Two TypeScript packages are installed through npm aliases (see
 * CONTRIBUTING.md, "TypeScript toolchain"). Only `@typescript/native` declares
 * a `tsc` binary today, and npm links that name to whichever package declaring
 * it installed last, so the bare name Vitest would otherwise spawn is not the
 * package's to promise. Resolving `@typescript/native` by package path pins
 * the type tests to the compiler the build uses, the same way
 * scripts/tsc7.mjs pins the build itself.
 */
function typescript7Checker(): string {
  const manifestPath = nodeRequire.resolve("@typescript/native/package.json");
  const manifest = nodeRequire(manifestPath) as {
    readonly bin?: Readonly<Record<string, string>>;
  };
  const entry = manifest.bin?.tsc;
  if (entry === undefined) {
    throw new Error(`${manifestPath} does not declare bin.tsc.`);
  }
  return join(dirname(manifestPath), entry);
}

/**
 * The five published entry points plus the root barrel. Every one is a pure
 * re-export file with nothing to execute, so they report zero totals and only
 * pad the file count the coverage gate prints. They are excluded together, so
 * a new entry point is added here rather than appearing as a 0 percent row.
 */
const ENTRY_BARRELS = [
  "src/index.ts",
  "src/composites.ts",
  "src/data-grid.ts",
  "src/format.ts",
  "src/forms.ts",
  "src/overlays.ts",
];

export default defineConfig({
  test: {
    environment: "jsdom",
    // Node's own localStorage would shadow the jsdom implementation that
    // tests/setup.ts clears between tests, so it stays off.
    execArgv: ["--no-experimental-webstorage"],
    include: ["tests/unit/**/*.test.{ts,tsx,mjs}"],
    setupFiles: ["./tests/setup.ts"],
    // The jsdom axe pass exceeds the 5 second default on a cold coverage run.
    testTimeout: 20_000,
    typecheck: {
      checker: typescript7Checker(),
      enabled: true,
      include: ["tests/types/**/*.test-d.ts"],
      // Narrower than tsconfig.json: npm run type-check already compiles the
      // whole project, so this pass covers the type tests and what they reach.
      tsconfig: "./tsconfig.vitest.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      // The published CLI and the release gates are measured through their
      // library modules. Their entry scripts (bin/snui-check-consumer.mjs and
      // scripts/*.mjs) run as child processes in the tests that exercise them,
      // which the in-process coverage provider cannot see, so including them
      // would report a permanent zero rather than a real gap.
      include: [
        "src/**/*.{ts,tsx}",
        "bin/lib/**/*.mjs",
        "scripts/lib/**/*.mjs",
      ],
      exclude: ENTRY_BARRELS,
      // Aggregate floors, deliberately below the measured numbers so an
      // ordinary refactor does not fail the gate, and deliberately close
      // enough that losing a whole feature's tests does. Each root carries its
      // own, because the package's own source is tested far more closely than
      // the tooling and one shared number would state neither honestly. The
      // top-level numbers cover the three roots together, which is what Vitest
      // compares them against: a glob threshold adds a check rather than
      // taking its files out of the global one.
      thresholds: {
        branches: 90,
        functions: 96,
        lines: 95,
        statements: 94,
        "src/**": {
          branches: 88,
          functions: 96,
          lines: 97,
          statements: 95,
        },
        "bin/lib/**": {
          branches: 72,
          functions: 82,
          lines: 80,
          statements: 80,
        },
        "scripts/lib/**": {
          branches: 85,
          functions: 94,
          lines: 90,
          statements: 89,
        },
      },
    },
  },
});
