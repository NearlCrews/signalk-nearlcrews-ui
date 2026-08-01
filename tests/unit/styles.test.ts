import { describe, expect, it } from "vitest";

import { PANEL_STYLES } from "../../src/styles/index.js";
import { PACKAGE_VERSION, SPINNER_ANIMATION_NAME } from "../../src/version.js";

describe("versioned keyframes", () => {
  it("derives the spinner keyframe name from the package version", () => {
    expect(SPINNER_ANIMATION_NAME).toBe(
      `snui-v${PACKAGE_VERSION.replaceAll(".", "-")}-spin`,
    );
  });

  it("defines every keyframe the stylesheet animates", () => {
    const defined = new Set(
      [...PANEL_STYLES.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)].map(
        (match) => match[1],
      ),
    );
    const references = [...PANEL_STYLES.matchAll(/animation:\s*([^;]+);/g)].map(
      (match) => match[1] ?? "",
    );

    expect(references.length).toBeGreaterThan(0);
    for (const shorthand of references) {
      // A rule naming a keyframe that does not exist still reports a normal
      // computed animation-duration, so only this check catches the break.
      const named = shorthand
        .trim()
        .split(/\s+/)
        .some((token) => defined.has(token));
      expect(named, `no @keyframes backs "${shorthand.trim()}"`).toBe(true);
    }
  });

  it("qualifies the spinner keyframe so two package versions cannot collide", () => {
    expect(defined(PANEL_STYLES)).toContain(SPINNER_ANIMATION_NAME);
    expect(SPINNER_ANIMATION_NAME).toContain(
      PACKAGE_VERSION.replaceAll(".", "-"),
    );
  });
});

function defined(styles: string): string[] {
  return [...styles.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)].map(
    (match) => match[1] ?? "",
  );
}
