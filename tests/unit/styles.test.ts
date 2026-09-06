import { describe, expect, it } from "vitest";

import { PANEL_STYLES, STYLE_MODULES } from "../../src/styles/index.js";
import { PACKAGE_VERSION, SPINNER_ANIMATION_NAME } from "../../src/version.js";

describe("versioned keyframes", () => {
  it("derives the spinner keyframe name from the package version", () => {
    expect(SPINNER_ANIMATION_NAME).toBe(
      `snui-v${PACKAGE_VERSION.replaceAll(".", "-")}-spin`,
    );
  });

  it("defines every keyframe a module animates in that module or the root", () => {
    const rootKeyframes = defined(PANEL_STYLES);
    let referenceCount = 0;
    for (const module of STYLE_MODULES) {
      const declared = new Set([...rootKeyframes, ...defined(module.styles)]);
      const references = [
        ...module.styles.matchAll(/animation:\s*([^;]+);/g),
      ].map((match) => match[1] ?? "");
      referenceCount += references.length;
      for (const shorthand of references) {
        // A rule naming a keyframe that does not exist still reports a normal
        // computed animation-duration, so only this check catches the break.
        const named = shorthand
          .trim()
          .split(/\s+/)
          .some((token) => declared.has(token));
        expect(
          named,
          `no @keyframes backs "${shorthand.trim()}" in the ${module.id} module`,
        ).toBe(true);
      }
    }
    expect(referenceCount).toBeGreaterThan(0);
  });

  it("declares every keyframe outside the scope block under a versioned name", () => {
    const versionMarker = PACKAGE_VERSION.replaceAll(".", "-");
    for (const module of STYLE_MODULES) {
      for (const match of module.styles.matchAll(
        /@keyframes\s+([A-Za-z0-9_-]+)/g,
      )) {
        const name = match[1] ?? "";
        expect(name, `${name} carries no package version`).toContain(
          versionMarker,
        );
        const before = module.styles.slice(0, match.index);
        const depth =
          (before.match(/\{/g)?.length ?? 0) -
          (before.match(/\}/g)?.length ?? 0);
        expect(depth, `@keyframes ${name} is nested inside a block`).toBe(0);
      }
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
