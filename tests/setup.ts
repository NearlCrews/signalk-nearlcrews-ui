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
  // ever fails in CI and only for whichever file happened to run next, so the
  // clock is handed back here rather than in each file that borrows it.
  vi.useRealTimers();
});
