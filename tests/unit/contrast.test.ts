import { describe, expect, it } from "vitest";

import {
  type ColorTokenName,
  DARK_TOKENS,
  LIGHT_TOKENS,
  NIGHT_TOKENS,
  PUBLIC_FOUNDATION_TOKEN_NAMES,
  PUBLIC_TOKEN_NAMES,
  type ThemeTokenSet,
  TOKEN_STYLES,
} from "../../src/styles/tokens.js";
import { ROOT_SELECTOR } from "../../src/version.js";
import { hexChannels } from "../color-channels.js";
import { ruleBody } from "../css-helpers.js";

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [red, green, blue] = hexChannels(hex).map(channelToLinear);
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function contrastRatio(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/**
 * APCA lightness contrast (SAPC-4g, after apca-w3 0.1.9), reported as an
 * unsigned Lc. Advisory only: the palette is gated on WCAG AA, and Night's
 * red cap bounds every text pair below the APCA body-text floor by design.
 */
function apcaContrast(text: string, background: string): number {
  const screenLuminance = (hex: string): number => {
    const [red, green, blue] = hexChannels(hex);
    return (
      0.2126729 * (red / 255) ** 2.4 +
      0.7151522 * (green / 255) ** 2.4 +
      0.072175 * (blue / 255) ** 2.4
    );
  };
  const clampBlack = (value: number): number =>
    value > 0.022
      ? value
      : // biome-ignore lint/suspicious/noApproximativeNumericConstant: the APCA soft-clamp exponent is 1.414 by specification, not the square root of two.
        value + (0.022 - value) ** 1.414;
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

const STATUS_TONES = ["info", "success", "warning", "danger"] as const;

/**
 * The tinted fills a boundary or a piece of text can land on: a selected data
 * grid row, a pressed control, and every tone-colored surface. They are
 * measured beside the plain surfaces, because a separator or a disabled label
 * inside one of them is the same pixel problem as on the surface itself.
 */
const SUBTLE_FILLS = [
  "--snui-color-accent-subtle",
  "--snui-color-success-subtle",
  "--snui-color-warning-subtle",
  "--snui-color-danger-subtle",
  "--snui-color-info-subtle",
  "--snui-color-neutral-subtle",
] as const satisfies readonly ColorTokenName[];

/** Every fill the package paints behind text, a boundary, or a control. */
const ALL_FILLS = [...TEXT_SURFACES, ...SUBTLE_FILLS];

/**
 * Every fill a status or a link is read on: the plain surfaces, the tints,
 * and the hovered selected row, where a Badge or a visited link inside the
 * row the operator just selected is exactly the text they are reading.
 */
const READING_FILLS = [
  ...ALL_FILLS,
  "--snui-color-row-selected-hover",
] as const satisfies readonly ColorTokenName[];

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
      for (const surface of READING_FILLS) {
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
      for (const surface of READING_FILLS) {
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

  it("keeps control boundaries distinguishable from every fill behind them", () => {
    // Including the hover fills and the subtle fills: a data-grid separator
    // sits on both, under the pointer and on a selected row.
    for (const fill of ALL_FILLS) {
      expect(
        contrastRatio(tokens["--snui-color-border"], tokens[fill]),
        `border on ${fill}`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(tokens["--snui-color-accent-fill"], tokens[fill]),
        `accent-fill on ${fill}`,
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

  /**
   * The hovered selected row is not measured with the resting fills above.
   * Darkening a selected row far enough to be felt under the pointer and still
   * clearing a 3:1 floor for a grey disabled label and a grey separator is not
   * possible on the light palette, and a selected row is identified by its
   * leading accent bar rather than by the tint alone. What has to hold is that
   * the row keeps its text readable and stays visibly a step from the resting
   * selected fill.
   */
  it("keeps the hovered selected row readable and a visible step", () => {
    const hovered = tokens["--snui-color-row-selected-hover"];
    expect(
      contrastRatio(tokens["--snui-color-text"], hovered),
      "text on row-selected-hover",
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(tokens["--snui-color-text-muted"], hovered),
      "text-muted on row-selected-hover",
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(hovered, tokens["--snui-color-accent-subtle"]),
      "row-selected-hover against the resting selected fill",
    ).toBeGreaterThanOrEqual(1.05);
  });

  it("keeps the neutral tint visible, readable, and apart from the hover fills", () => {
    const neutral = tokens["--snui-color-neutral-subtle"];
    for (const surface of [
      "--snui-color-surface",
      "--snui-color-surface-raised",
    ] as const) {
      expect(
        contrastRatio(neutral, tokens[surface]),
        `neutral-subtle against ${surface}`,
      ).toBeGreaterThanOrEqual(1.05);
    }
    for (const text of [
      "--snui-color-text",
      "--snui-color-text-muted",
    ] as const) {
      expect(
        contrastRatio(tokens[text], neutral),
        `${text} on neutral-subtle`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    // A tinted tile is not interactive, so it must never match the fill a
    // pointer paints on something that is.
    for (const hover of [
      "--snui-color-interactive-hover",
      "--snui-color-hover-raised",
    ] as const) {
      expect(
        contrastRatio(neutral, tokens[hover]),
        `neutral-subtle against ${hover}`,
      ).toBeGreaterThanOrEqual(1.04);
    }
  });

  /**
   * The subtle border outlines containers and draws dividers: never the only
   * edge of a control, which keeps the 3:1 boundary token. It has to stay
   * visible on every resting surface a container sits on, and quieter than
   * the boundary it steps back from.
   */
  it("keeps container outlines visible and quieter than control boundaries", () => {
    const subtle = tokens["--snui-color-border-subtle"];
    for (const surface of [
      "--snui-color-background",
      "--snui-color-surface",
      "--snui-color-surface-raised",
      "--snui-color-surface-stripe",
    ] as const) {
      expect(
        contrastRatio(subtle, tokens[surface]),
        `border-subtle on ${surface}`,
      ).toBeGreaterThanOrEqual(1.3);
      expect(
        contrastRatio(subtle, tokens[surface]),
        `border-subtle quieter than border on ${surface}`,
      ).toBeLessThan(
        contrastRatio(tokens["--snui-color-border"], tokens[surface]),
      );
    }
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
    // Every fill, not just the two resting surfaces: a disabled control sits
    // in hovered and selected rows too, and disabled text is exempt from the
    // WCAG floor but not from being read.
    for (const fill of ALL_FILLS) {
      expect(
        contrastRatio(tokens["--snui-color-text-disabled"], tokens[fill]),
        `text-disabled on ${fill}`,
      ).toBeGreaterThanOrEqual(3);
    }
    // A disabled fill also carries text of the surface color: a disabled
    // Switch track, a disabled checked box, a disabled progress fill. The pair
    // has to clear the same floor read the other way round.
    expect(
      contrastRatio(
        tokens["--snui-color-surface"],
        tokens["--snui-color-text-disabled"],
      ),
      "surface on text-disabled",
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(
        tokens["--snui-color-text-muted"],
        tokens["--snui-color-text-disabled"],
      ),
      "text-disabled is dimmer than text-muted",
    ).toBeGreaterThan(1);
  });

  it("keeps the track visible and the progress fill distinct from it", () => {
    // Raised as well as flat: a range or a progress bar inside a dialog, a
    // popover, or a toast sits on the raised surface.
    for (const surface of [
      "--snui-color-surface",
      "--snui-color-surface-raised",
    ] as const) {
      expect(
        contrastRatio(tokens["--snui-color-track"], tokens[surface]),
        `track on ${surface}`,
      ).toBeGreaterThanOrEqual(1.5);
    }
    expect(
      contrastRatio(
        tokens["--snui-color-accent-fill"],
        tokens["--snui-color-track"],
      ),
    ).toBeGreaterThanOrEqual(3);
  });

  it("separates the danger tone from the resting boundary and from text", () => {
    // Night is exempt by design: the green and blue cap plus the text-class
    // red floor converge every bright token, which is why Night never signals
    // status by hue. Light and Dark carry the separation the danger button and
    // the invalid control border rely on.
    if (tokens === NIGHT_TOKENS) return;
    expect(
      contrastRatio(
        tokens["--snui-color-danger"],
        tokens["--snui-color-border"],
      ),
      "danger against border",
    ).toBeGreaterThanOrEqual(1.5);
    expect(
      contrastRatio(tokens["--snui-color-danger"], tokens["--snui-color-text"]),
      "danger against text",
    ).toBeGreaterThanOrEqual(1.5);
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
    "--snui-color-border-subtle",
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
    for (const token of [
      ...NIGHT_FOREGROUNDS,
      ...TEXT_SURFACES,
      ...SUBTLE_FILLS,
    ]) {
      const [, green, blue] = hexChannels(NIGHT_TOKENS[token]);
      expect(green, `${token} green`).toBeLessThanOrEqual(0x40);
      expect(blue, `${token} blue`).toBeLessThanOrEqual(0x40);
    }
  });

  it("keeps text-class Night tokens at full red", () => {
    for (const token of NIGHT_TEXT_CLASS) {
      const [red] = hexChannels(NIGHT_TOKENS[token]);
      expect(red, `${token} red`).toBeGreaterThanOrEqual(0xe0);
    }
  });

  it("keeps Night container outlines far dimmer than control boundaries", () => {
    // Every container frame and divider takes the subtle border, so in Night
    // it has to shed most of the light the boundary token emits, or the panel
    // reads as a lattice of nearly text-bright rectangles.
    expect(
      luminance(NIGHT_TOKENS["--snui-color-border-subtle"]),
    ).toBeLessThanOrEqual(luminance(NIGHT_TOKENS["--snui-color-border"]) / 2);
  });

  it("keeps the Night on-accent foreground near black", () => {
    const [red, green, blue] = hexChannels(
      NIGHT_TOKENS["--snui-color-on-accent"],
    );
    expect(red).toBeLessThanOrEqual(32);
    expect(green).toBeLessThanOrEqual(32);
    expect(blue).toBeLessThanOrEqual(32);
  });

  /**
   * The rendered Night block rather than the typed token names, so the scrim
   * and the elevation shadows, which are plain strings beside the tokens, are
   * held to the same cap. The focus halo is not here: it lives in the base
   * block as a `color-mix` over `--snui-color-focus`, and mixing a capped
   * color with transparent cannot raise a channel above the cap.
   */
  function nightBlock(): string {
    return ruleBody(TOKEN_STYLES, `${ROOT_SELECTOR}[data-snui-theme="night"]`);
  }

  it("caps green and blue on every color the Night block emits", () => {
    const block = nightBlock();
    let hexLiterals = 0;
    for (const match of block.matchAll(/#([0-9a-f]{6})\b/g)) {
      const [, green, blue] = hexChannels(`#${match[1] ?? ""}`);
      hexLiterals += 1;
      expect(green, `${match[0]} green`).toBeLessThanOrEqual(0x40);
      expect(blue, `${match[0]} blue`).toBeLessThanOrEqual(0x40);
    }
    let rgbLiterals = 0;
    for (const match of block.matchAll(/rgb\(\s*\d+\s+(\d+)\s+(\d+)/g)) {
      rgbLiterals += 1;
      expect(
        Number.parseInt(match[1] ?? "", 10),
        `${match[0]} green`,
      ).toBeLessThanOrEqual(0x40);
      expect(
        Number.parseInt(match[2] ?? "", 10),
        `${match[0]} blue`,
      ).toBeLessThanOrEqual(0x40);
    }
    expect(hexLiterals, "no Night token colors were measured").toBeGreaterThan(
      0,
    );
    // The scrim and the two elevation shadows, the colors the typed token
    // names never reach.
    expect(
      rgbLiterals,
      "the Night scrim and shadows were not measured",
    ).toBeGreaterThanOrEqual(3);
  });

  it("keeps the Night scrim dark enough to protect a dark-adapted eye", () => {
    const scrim =
      /--snui-color-scrim:\s*rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*(\d+)%\s*\)/.exec(
        nightBlock(),
      );
    expect(scrim, "no Night scrim declaration").not.toBeNull();
    const [, red = "0", green = "0", blue = "0", alpha = "0"] = scrim ?? [];
    const share = Number.parseInt(alpha, 10) / 100;
    // Composited over a white host page, the worst case behind the panel.
    const composite = [red, green, blue]
      .map((channel) =>
        Math.round(share * Number.parseInt(channel, 10) + (1 - share) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
    expect(
      contrastRatio(`#${composite}`, NIGHT_TOKENS["--snui-color-surface"]),
      "Night scrim over white, against the Night surface",
    ).toBeLessThanOrEqual(1.5);
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
    "--snui-field-inline-label-min",
    "--snui-grid-track-min",
    "--snui-action-bar-surface",
    "--snui-content-width-standard",
    "--snui-content-width-wide",
    "--snui-color-focus-ring-band",
    "--snui-focus-ring",
    "--snui-focus-ring-width",
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
