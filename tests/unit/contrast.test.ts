import { describe, expect, it } from "vitest";

import {
  DARK_TOKENS,
  LIGHT_TOKENS,
  NIGHT_TOKENS,
  PUBLIC_FOUNDATION_TOKEN_NAMES,
  PUBLIC_TOKEN_NAMES,
  type ThemeTokenSet,
} from "../../src/styles/tokens.js";

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16),
  );
  const [red = 0, green = 0, blue = 0] = channels.map(channelToLinear);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

const themeCases: readonly [string, ThemeTokenSet][] = [
  ["light", LIGHT_TOKENS],
  ["dark", DARK_TOKENS],
  ["night", NIGHT_TOKENS],
];

describe.each(themeCases)("%s theme contrast", (_name, tokens) => {
  it("keeps primary and muted text above WCAG AA", () => {
    for (const surface of [
      tokens["--snui-color-background"],
      tokens["--snui-color-surface"],
      tokens["--snui-color-surface-raised"],
    ]) {
      expect(
        contrastRatio(tokens["--snui-color-text"], surface),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(tokens["--snui-color-text-muted"], surface),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps button text above WCAG AA", () => {
    expect(
      contrastRatio(
        tokens["--snui-color-on-accent"],
        tokens["--snui-color-accent-fill"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        tokens["--snui-color-on-accent"],
        tokens["--snui-color-accent-fill-hover"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps semantic status text above WCAG AA", () => {
    for (const token of [
      "--snui-color-success",
      "--snui-color-warning",
      "--snui-color-danger",
      "--snui-color-info",
    ] as const) {
      for (const surface of [
        tokens["--snui-color-background"],
        tokens["--snui-color-surface"],
        tokens["--snui-color-surface-raised"],
      ]) {
        expect(contrastRatio(tokens[token], surface)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it("keeps link states above WCAG AA", () => {
    for (const token of [
      "--snui-color-link",
      "--snui-color-link-hover",
      "--snui-color-link-visited",
    ] as const) {
      for (const surface of [
        tokens["--snui-color-background"],
        tokens["--snui-color-surface"],
        tokens["--snui-color-surface-raised"],
      ]) {
        expect(contrastRatio(tokens[token], surface)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it("keeps focus indicators distinguishable from adjacent surfaces", () => {
    for (const surface of [
      tokens["--snui-color-background"],
      tokens["--snui-color-surface"],
      tokens["--snui-color-surface-raised"],
    ]) {
      expect(
        contrastRatio(tokens["--snui-color-focus"], surface),
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps control boundaries distinguishable from adjacent surfaces", () => {
    for (const surface of [
      tokens["--snui-color-background"],
      tokens["--snui-color-surface"],
      tokens["--snui-color-surface-raised"],
    ]) {
      expect(
        contrastRatio(tokens["--snui-color-border"], surface),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(tokens["--snui-color-accent-fill"], surface),
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

it("keeps the Night on-accent foreground red-preserving", () => {
  const value = NIGHT_TOKENS["--snui-color-on-accent"].replace("#", "");
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  expect(green).toBeLessThanOrEqual(32);
  expect(blue).toBeLessThanOrEqual(32);
});

it("exports the complete public foundation token surface", () => {
  expect(PUBLIC_FOUNDATION_TOKEN_NAMES).toEqual([
    "--snui-font-family",
    "--snui-font-size",
    "--snui-line-height",
    "--snui-space-1",
    "--snui-space-2",
    "--snui-space-3",
    "--snui-space-4",
    "--snui-space-5",
    "--snui-space-6",
    "--snui-radius-sm",
    "--snui-radius-md",
    "--snui-radius-lg",
    "--snui-control-min-height",
    "--snui-content-width-standard",
    "--snui-content-width-wide",
    "--snui-transition-fast",
  ]);
  expect(new Set(PUBLIC_TOKEN_NAMES).size).toBe(PUBLIC_TOKEN_NAMES.length);
});
