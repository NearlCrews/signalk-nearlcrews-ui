import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // Frozen time leaks into every later test in the same worker, which only
  // ever fails in CI and only for whichever file happened to run next, so it
  // is handed back here rather than in each file that borrows it.
  // vitest.config.ts hands back stubbed globals and environment variables
  // before each test.
  vi.useRealTimers();
});
