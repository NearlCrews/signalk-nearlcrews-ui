import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  window.localStorage.clear();
  Reflect.deleteProperty(
    window,
    Symbol.for("signalk-nearlcrews-ui-theme-change"),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
