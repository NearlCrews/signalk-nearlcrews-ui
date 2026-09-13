import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";

import {
  NARROW_PANEL_QUERY,
  PROSE_MEASURE_DECLARATION,
} from "../../src/styles/fragments.js";
import { PANEL_STYLES } from "../../src/styles/root-sheet.js";
import {
  CONTAINER_BREAKPOINT_NARROW,
  PANEL_CONTAINER_NAME,
} from "../../src/styles/tokens.js";
import { announcementRole } from "../../src/utils/announcement.js";
import {
  joinIdReferences,
  resolveDescriptionId,
} from "../../src/utils/aria.js";
import { classNames } from "../../src/utils/class-names.js";
import {
  DEFAULT_DISMISS_LABEL,
  DEFAULT_LOADING_LABEL,
  resolveLabel,
} from "../../src/utils/labels.js";
import { hasReactContent } from "../../src/utils/react-node.js";
import {
  isSemanticTone,
  TONE_GLYPHS,
  TONE_LABELS,
} from "../../src/utils/tone.js";

describe("isSemanticTone", () => {
  it("treats neutral as presentational and every other tone as semantic", () => {
    expect(isSemanticTone("neutral")).toBe(false);
    expect(isSemanticTone("info")).toBe(true);
    expect(isSemanticTone("success")).toBe(true);
    expect(isSemanticTone("warning")).toBe(true);
    expect(isSemanticTone("danger")).toBe(true);
  });
});

describe("tone tables", () => {
  const SEMANTIC_TONES = ["info", "success", "warning", "danger"] as const;

  it("provides a glyph and a label for exactly the semantic tones", () => {
    expect(Object.keys(TONE_GLYPHS).sort()).toEqual([...SEMANTIC_TONES].sort());
    expect(Object.keys(TONE_LABELS).sort()).toEqual([...SEMANTIC_TONES].sort());
  });

  it("keeps every glyph and label non-empty", () => {
    for (const tone of SEMANTIC_TONES) {
      expect(TONE_GLYPHS[tone].trim().length).toBeGreaterThan(0);
      expect(TONE_LABELS[tone].trim().length).toBeGreaterThan(0);
    }
  });
});

describe("resolveLabel", () => {
  it("trims caller labels and falls back on missing or blank input", () => {
    expect(resolveLabel(" Dismiss panel ", DEFAULT_DISMISS_LABEL)).toBe(
      "Dismiss panel",
    );
    expect(resolveLabel(undefined, DEFAULT_DISMISS_LABEL)).toBe(
      DEFAULT_DISMISS_LABEL,
    );
    expect(resolveLabel("   ", DEFAULT_LOADING_LABEL)).toBe(
      DEFAULT_LOADING_LABEL,
    );
  });
});

describe("resolveDescriptionId", () => {
  it("derives the description id only when a description renders", () => {
    expect(resolveDescriptionId("field-1", true)).toBe("field-1-description");
    expect(resolveDescriptionId("field-1", false)).toBeUndefined();
  });
});

describe("announcementRole", () => {
  it("maps assertive to alert and polite to status", () => {
    expect(announcementRole("assertive")).toBe("alert");
    expect(announcementRole("polite")).toBe("status");
  });

  it("returns no role when announcements are off", () => {
    // "off" must not produce a live-region role, or the element would still
    // announce despite the caller opting out.
    expect(announcementRole("off")).toBeUndefined();
  });
});

describe("joinIdReferences", () => {
  it("joins multiple ids with a single space", () => {
    expect(joinIdReferences("a", "b", "c")).toBe("a b c");
  });

  it("filters undefined and empty ids", () => {
    expect(joinIdReferences(undefined, "", "field-error")).toBe("field-error");
    expect(joinIdReferences("field-label", undefined)).toBe("field-label");
  });

  it("returns undefined when nothing usable remains", () => {
    expect(joinIdReferences()).toBeUndefined();
    expect(joinIdReferences(undefined, "")).toBeUndefined();
  });
});

describe("classNames", () => {
  it("joins truthy class names with a single space", () => {
    expect(classNames("snui-button", "snui-button--primary")).toBe(
      "snui-button snui-button--primary",
    );
  });

  it("drops false, null, undefined, and empty values", () => {
    expect(classNames("snui-button", false, null, undefined, "", "extra")).toBe(
      "snui-button extra",
    );
  });

  it("returns an empty string when nothing applies", () => {
    expect(classNames()).toBe("");
    expect(classNames(false, undefined)).toBe("");
  });
});

describe("hasReactContent", () => {
  it("counts numeric zero as content", () => {
    // A metric value of 0 must not read as empty.
    expect(hasReactContent(0)).toBe(true);
  });

  it("flattens nested arrays before judging content", () => {
    expect(hasReactContent([[0]])).toBe(true);
    expect(hasReactContent([["", null]])).toBe(false);
  });

  it("looks through fragments", () => {
    expect(hasReactContent(createElement(Fragment))).toBe(false);
    expect(hasReactContent(createElement(Fragment, null, 0))).toBe(true);
    expect(
      hasReactContent(
        createElement(Fragment, null, createElement(Fragment, null, "")),
      ),
    ).toBe(false);
  });

  it("rejects blank strings and empty nodes", () => {
    expect(hasReactContent("  ")).toBe(false);
    expect(hasReactContent(false)).toBe(false);
    expect(hasReactContent(null)).toBe(false);
    expect(hasReactContent(undefined)).toBe(false);
  });

  it("accepts plain text and elements", () => {
    expect(hasReactContent("Ready")).toBe(true);
    expect(hasReactContent(createElement("span", null, "Ready"))).toBe(true);
  });
});

describe("shared style fragments", () => {
  it("caps prose at a measure the shipped rules use", () => {
    expect(PROSE_MEASURE_DECLARATION.trim()).toMatch(/^max-width: \d+ch;$/);
    expect(PANEL_STYLES).toContain(PROSE_MEASURE_DECLARATION);
  });

  it("states the narrow-panel condition from the published constants", () => {
    // A container condition cannot read a custom property, so both halves are
    // constants and the query is the one place they meet.
    expect(NARROW_PANEL_QUERY).toBe(
      `@container ${PANEL_CONTAINER_NAME} (max-width: ${CONTAINER_BREAKPOINT_NARROW})`,
    );
    expect(PANEL_STYLES).toContain(NARROW_PANEL_QUERY);
  });
});
