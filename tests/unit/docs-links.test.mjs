import { describe, expect, it } from "vitest";

import {
  githubSlug,
  localDestinations,
  markdownAnchors,
  splitDestination,
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

  it("keeps a block open past a shorter fence and a fence with an info string", () => {
    const anchors = markdownAnchors(
      [
        "````md",
        "```",
        "# Inside the longer block",
        "````tsx",
        "# Still inside: a closing fence carries no info string",
        "````",
        "## After the block",
      ].join("\n"),
    );

    expect([...anchors]).toEqual(["after-the-block"]);
  });

  it("reads a heading indented by up to three spaces, and no further", () => {
    const anchors = markdownAnchors(
      ["   ## Indented", "    ## Code by indentation"].join("\n"),
    );

    expect([...anchors]).toEqual(["indented"]);
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

describe("documentation link targets", () => {
  it("splits a destination into its decoded path and fragment", () => {
    expect(
      splitDestination("docs/api%20reference.md?plain=1#Entry%20points"),
    ).toEqual({
      fragment: "Entry points",
      path: "docs/api reference.md",
    });
    expect(splitDestination("#entry-point-sizes")).toEqual({
      fragment: "entry-point-sizes",
      path: "",
    });
    expect(splitDestination("LICENSE")).toEqual({
      fragment: "",
      path: "LICENSE",
    });
  });

  it("answers undefined for a malformed percent-escape rather than throwing", () => {
    // decodeURIComponent throws a URIError on these, which used to stop the
    // whole check instead of reporting the one link.
    expect(splitDestination("docs/100%.md")).toBeUndefined();
    expect(splitDestination("docs/guide.md#caf%E9")).toBeUndefined();
  });
});
