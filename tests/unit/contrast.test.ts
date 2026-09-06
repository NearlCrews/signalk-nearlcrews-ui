import { describe, expect, it } from "vitest";

import {
  type ColorTokenName,
  DARK_TOKENS,
  LIGHT_TOKENS,
  NIGHT_TOKENS,
  PUBLIC_FOUNDATION_TOKEN_NAMES,
  PUBLIC_TOKEN_NAMES,
  type ThemeTokenSet,
} from "../../src/styles/tokens.js";

function channels(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const [red = 0, green = 0, blue = 0] = [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16),
  );
  return [red, green, blue];
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [red, green, blue] = channels(hex).map(channelToLinear);
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * APCA lightness contrast (SAPC-4g, after apca-w3 0.1.9), reported as an
 * unsigned Lc. Advisory only: the palette is gated on WCAG AA, and Night's
 * red cap bounds every text pair below the APCA body-text floor by design.
 */
function apcaContrast(text: string, background: string): number {
  const screenLuminance = (hex: string): number => {
    const [red, green, blue] = channels(hex);
    return (
      0.2126729 * (red / 255) ** 2.4 +
      0.7151522 * (green / 255) ** 2.4 +
      0.072175 * (blue / 255) ** 2.4
    );
  };
  const clampBlack = (value: number): number =>
    value > 0.022 ? value : value + (0.022 - value) ** 1.414;
  const textLuminance = clampBlack(screenLuminance(text));
  const backgroundLuminance = clampBlack(screenLuminance(background));
  if (Math.abs(backgroundLuminance - textLuminance) < 0.0005) return 0;

  if (backgroundLuminance > textLuminance) {
    const contrast =
      (backgroundLuminance ** 0.56 - textLuminance ** 0.57) * 1.14;
    return contrast < 0.1 ? 0 : (contrast - 0.027) * 100;
  }
  const contrast = (backgroundLuminance ** 0.65 - textLuminance ** 0.62) * 1.14;
  return contrast > -0.1 ? 0 : Math.abs(contrast + 0.027) * 100;
}

const themeCases: readonly [string, ThemeTokenSet][] = [
  ["light", LIGHT_TOKENS],
  ["dark", DARK_TOKENS],
  ["night", NIGHT_TOKENS],
];

const TEXT_SURFACES = [
  "--snui-color-background",
  "--snui-color-surface",
  "--snui-color-surface-raised",
  "--snui-color-interactive-hover",
  "--snui-color-hover-raised",
  "--snui-color-surface-stripe",
] as const satisfies readonly ColorTokenName[];

/**
 * Surfaces a bordered control can sit on. Hover-raised is the transient fill
 * under menu items and header cells, which carry text rather than controls.
 */
const CONTROL_SURFACES = TEXT_SURFACES.filter(
  (surface) => surface !== "--snui-color-hover-raised",
);

const STATUS_TONES = ["info", "success", "warning", "danger"] as const;

describe.each(themeCases)("%s theme contrast", (_name, tokens) => {
  it("keeps primary and muted text above WCAG AA on every surface", () => {
    for (const surface of TEXT_SURFACES) {
      expect(
        contrastRatio(tokens["--snui-color-text"], tokens[surface]),
        `text on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(tokens["--snui-color-text-muted"], tokens[surface]),
        `text-muted on ${surface}`,
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
    for (const tone of STATUS_TONES) {
      for (const surface of TEXT_SURFACES) {
        expect(
          contrastRatio(tokens[`--snui-color-${tone}`], tokens[surface]),
          `${tone} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps link states above WCAG AA", () => {
    for (const token of [
      "--snui-color-link",
      "--snui-color-link-hover",
      "--snui-color-link-visited",
    ] as const) {
      for (const surface of TEXT_SURFACES) {
        expect(
          contrastRatio(tokens[token], tokens[surface]),
          `${token} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps focus indicators distinguishable from adjacent surfaces", () => {
    for (const surface of TEXT_SURFACES) {
      expect(
        contrastRatio(tokens["--snui-color-focus"], tokens[surface]),
        `focus on ${surface}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps control boundaries distinguishable from adjacent surfaces", () => {
    for (const surface of CONTROL_SURFACES) {
      expect(
        contrastRatio(tokens["--snui-color-border"], tokens[surface]),
        `border on ${surface}`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(tokens["--snui-color-accent-fill"], tokens[surface]),
        `accent-fill on ${surface}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps hover fills readable and visibly distinct", () => {
    expect(
      contrastRatio(
        tokens["--snui-color-hover-raised"],
        tokens["--snui-color-surface-raised"],
      ),
    ).toBeGreaterThanOrEqual(1.05);
    expect(
      contrastRatio(
        tokens["--snui-color-interactive-hover"],
        tokens["--snui-color-surface"],
      ),
    ).toBeGreaterThanOrEqual(1.05);
  });

  it("keeps zebra stripes visible against the surface", () => {
    expect(
      contrastRatio(
        tokens["--snui-color-surface-stripe"],
        tokens["--snui-color-surface"],
      ),
    ).toBeGreaterThanOrEqual(1.05);
  });

  it("keeps text readable on every subtle fill and the fill visible", () => {
    for (const tone of [...STATUS_TONES, "accent"] as const) {
      const subtle = tokens[`--snui-color-${tone}-subtle`];
      expect(
        contrastRatio(tokens["--snui-color-text"], subtle),
        `text on ${tone}-subtle`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(tokens["--snui-color-text-muted"], subtle),
        `text-muted on ${tone}-subtle`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(subtle, tokens["--snui-color-surface"]),
        `${tone}-subtle against surface`,
      ).toBeGreaterThanOrEqual(1.05);
      if (tone === "accent") {
        expect(
          contrastRatio(tokens["--snui-color-accent-fill"], subtle),
          "accent-fill on accent-subtle",
        ).toBeGreaterThanOrEqual(3);
      } else {
        expect(
          contrastRatio(tokens[`--snui-color-${tone}`], subtle),
          `${tone} on ${tone}-subtle`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps disabled text legible without opacity", () => {
    for (const surface of [
      "--snui-color-surface",
      "--snui-color-surface-raised",
    ] as const) {
      expect(
        contrastRatio(tokens["--snui-color-text-disabled"], tokens[surface]),
        `text-disabled on ${surface}`,
      ).toBeGreaterThanOrEqual(3);
    }
    expect(
      contrastRatio(
        tokens["--snui-color-text-muted"],
        tokens["--snui-color-text-disabled"],
      ),
      "text-disabled is dimmer than text-muted",
    ).toBeGreaterThan(1);
  });

  it("keeps the track visible and the progress fill distinct from it", () => {
    expect(
      contrastRatio(
        tokens["--snui-color-track"],
        tokens["--snui-color-surface"],
      ),
    ).toBeGreaterThanOrEqual(1.5);
    expect(
      contrastRatio(
        tokens["--snui-color-accent-fill"],
        tokens["--snui-color-track"],
      ),
    ).toBeGreaterThanOrEqual(3);
  });

  it("derives the surface-first hover aliases from the hover pair", () => {
    expect(tokens["--snui-color-surface-hover"]).toBe(
      tokens["--snui-color-interactive-hover"],
    );
    expect(tokens["--snui-color-surface-raised-hover"]).toBe(
      tokens["--snui-color-hover-raised"],
    );
  });
});

/*
 * Advisory report, not a gate. APCA rates lightness contrast on a scale where
 * body text wants Lc 60 and any non-placeholder text wants Lc 45. Light and
 * Dark meet the floors for text on surfaces and labels on accent fills; Night
 * cannot, because keeping green and blue under the red cap bounds the
 * brightest text at about Lc 41 on the surface. The numbers print so a palette
 * change shows its APCA effect in the test log.
 */
it("reports APCA lightness contrast for review", () => {
  const rows: string[] = [];
  for (const [name, tokens] of themeCases) {
    const pairs: readonly [string, ColorTokenName, ColorTokenName][] = [
      ["text on surface", "--snui-color-text", "--snui-color-surface"],
      [
        "text-muted on surface",
        "--snui-color-text-muted",
        "--snui-color-surface",
      ],
      [
        "text-disabled on surface",
        "--snui-color-text-disabled",
        "--snui-color-surface",
      ],
      [
        "on-accent on accent-fill",
        "--snui-color-on-accent",
        "--snui-color-accent-fill",
      ],
      ["danger on surface", "--snui-color-danger", "--snui-color-surface"],
    ];
    for (const [label, foreground, background] of pairs) {
      const lc = apcaContrast(tokens[foreground], tokens[background]);
      rows.push(
        `${name.padEnd(6)} ${label.padEnd(26)} WCAG ${contrastRatio(tokens[foreground], tokens[background]).toFixed(2)}  APCA Lc ${lc.toFixed(0)}`,
      );
      expect(lc).toBeGreaterThan(0);
    }
  }
  console.info(
    `APCA advisory (Lc 60 body text, Lc 45 floor)\n${rows.join("\n")}`,
  );

  // Light and Dark clear the body-text floor for labels on the accent fill.
  for (const tokens of [LIGHT_TOKENS, DARK_TOKENS]) {
    expect(
      apcaContrast(
        tokens["--snui-color-on-accent"],
        tokens["--snui-color-accent-fill"],
      ),
    ).toBeGreaterThanOrEqual(60);
  }
});

describe("Night red preservation", () => {
  const NIGHT_FOREGROUNDS = [
    "--snui-color-text",
    "--snui-color-text-muted",
    "--snui-color-text-disabled",
    "--snui-color-border",
    "--snui-color-track",
    "--snui-color-accent-fill",
    "--snui-color-accent-fill-hover",
    "--snui-color-on-accent",
    "--snui-color-link",
    "--snui-color-link-hover",
    "--snui-color-link-visited",
    "--snui-color-focus",
    "--snui-color-success",
    "--snui-color-warning",
    "--snui-color-danger",
    "--snui-color-info",
  ] as const satisfies readonly ColorTokenName[];

  /** Tokens that carry text or a text-strength signal; they stay bright red. */
  const NIGHT_TEXT_CLASS = [
    "--snui-color-text",
    "--snui-color-text-muted",
    "--snui-color-accent-fill",
    "--snui-color-accent-fill-hover",
    "--snui-color-link",
    "--snui-color-link-hover",
    "--snui-color-link-visited",
    "--snui-color-focus",
    "--snui-color-success",
    "--snui-color-warning",
    "--snui-color-danger",
    "--snui-color-info",
  ] as const satisfies readonly ColorTokenName[];

  it("caps green and blue on every Night foreground and surface", () => {
    for (const token of [...NIGHT_FOREGROUNDS, ...TEXT_SURFACES]) {
      const [, green, blue] = channels(NIGHT_TOKENS[token]);
      expect(green, `${token} green`).toBeLessThanOrEqual(0x40);
      expect(blue, `${token} blue`).toBeLessThanOrEqual(0x40);
    }
  });

  it("keeps text-class Night tokens at full red", () => {
    for (const token of NIGHT_TEXT_CLASS) {
      const [red] = channels(NIGHT_TOKENS[token]);
      expect(red, `${token} red`).toBeGreaterThanOrEqual(0xe0);
    }
  });

  it("keeps the Night on-accent foreground near black", () => {
    const [red, green, blue] = channels(NIGHT_TOKENS["--snui-color-on-accent"]);
    expect(red).toBeLessThanOrEqual(32);
    expect(green).toBeLessThanOrEqual(32);
    expect(blue).toBeLessThanOrEqual(32);
  });
});

it("exports the complete public foundation token surface", () => {
  expect(PUBLIC_FOUNDATION_TOKEN_NAMES).toEqual([
    "--snui-font-family",
    "--snui-font-family-mono",
    "--snui-font-size",
    "--snui-font-size-sm",
    "--snui-font-size-xs",
    "--snui-font-size-lg",
    "--snui-font-size-xl",
    "--snui-font-size-2xl",
    "--snui-font-weight-medium",
    "--snui-font-weight-semibold",
    "--snui-font-weight-bold",
    "--snui-font-weight-heavy",
    "--snui-line-height",
    "--snui-space-1",
    "--snui-space-2",
    "--snui-space-3",
    "--snui-space-4",
    "--snui-space-5",
    "--snui-space-6",
    "--snui-space-7",
    "--snui-space-8",
    "--snui-radius-sm",
    "--snui-radius-md",
    "--snui-radius-lg",
    "--snui-radius-pill",
    "--snui-control-min-height",
    "--snui-range-thumb-size",
    "--snui-range-progress-color",
    "--snui-range-track-color",
    "--snui-input-group-control-min",
    "--snui-input-group-control-basis",
    "--snui-content-width-standard",
    "--snui-content-width-wide",
    "--snui-focus-ring",
    "--snui-shadow-flat",
    "--snui-shadow-raised",
    "--snui-shadow-overlay",
    "--snui-color-scrim",
    "--snui-ease-standard",
    "--snui-transition-fast",
    "--snui-transition-normal",
    "--snui-transition-slow",
    "--snui-motion-spin",
    "--snui-z-sticky",
    "--snui-z-overlay",
    "--snui-z-modal",
    "--snui-z-toast",
  ]);
  expect(new Set(PUBLIC_TOKEN_NAMES).size).toBe(PUBLIC_TOKEN_NAMES.length);
});
