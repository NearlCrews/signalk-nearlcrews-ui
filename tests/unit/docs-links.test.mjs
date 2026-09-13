import { describe, expect, it } from "vitest";

import {
  githubSlug,
  localDestinations,
  markdownAnchors,
} from "../../scripts/lib/docs-links.mjs";

describe("documentation link slugs", () => {
  it("matches ordinary GitHub-style heading normalization", () => {
    expect(githubSlug("API, refs, and defaults")).toBe("api-refs-and-defaults");
  });

  it("removes complete inline HTML tags while retaining their text", () => {
    expect(githubSlug("<span>Release <strong>checks</strong></span>")).toBe(
      "release-checks",
    );
  });

  it("drops an incomplete HTML tag and its remaining content", () => {
    expect(githubSlug("Release notes <script")).toBe("release-notes");
  });
});

describe("documentation anchors", () => {
  it("numbers repeated headings and keeps inline code in the slug", () => {
    const anchors = markdownAnchors(
      [
        "# Title",
        "## Options",
        "### `Button` props",
        "## Options",
        "## Options",
      ].join("\n"),
    );

    expect([...anchors]).toEqual([
      "title",
      "options",
      "button-props",
      "options-1",
      "options-2",
    ]);
  });

  it("ignores headings inside a fenced block, whichever fence opened it", () => {
    const anchors = markdownAnchors(
      [
        "# Real heading",
        "~~~md",
        "# Example heading",
        "```",
        "# Still inside the tilde block",
        "~~~",
        "## After the block",
      ].join("\n"),
    );

    expect([...anchors]).toEqual(["real-heading", "after-the-block"]);
  });
});

describe("documentation link destinations", () => {
  it("collects inline, reference-style, image, and anchor-only destinations", () => {
    expect(
      localDestinations(
        [
          "See [the guide](docs/guide.md) and ![shot](docs/screenshots/a.png).",
          "",
          "[policy]: docs/release-policy.md",
          "",
          "Jump to [the section](#entry-point-sizes).",
          '[titled](docs/guide.md "Guide")',
        ].join("\n"),
      ),
    ).toEqual([
      { destination: "docs/guide.md", image: false, line: 1 },
      { destination: "docs/screenshots/a.png", image: true, line: 1 },
      { destination: "docs/release-policy.md", image: false, line: 3 },
      { destination: "#entry-point-sizes", image: false, line: 5 },
      { destination: "docs/guide.md", image: false, line: 6 },
    ]);
  });

  it("skips absolute URLs, protocol-relative URLs, inline code, and fenced examples", () => {
    expect(
      localDestinations(
        [
          "[home](https://example.invalid/) and [scheme-less](//example.invalid/a).",
          "Write `[example](docs/never-checked.md)` in prose.",
          "```md",
          "[fenced](docs/also-never-checked.md)",
          "```",
          "[real](docs/guide.md)",
        ].join("\n"),
      ),
    ).toEqual([{ destination: "docs/guide.md", image: false, line: 6 }]);
  });
});
