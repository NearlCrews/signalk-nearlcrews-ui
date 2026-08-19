import { describe, expect, it } from "vitest";

import { githubSlug } from "../../scripts/check-docs-links.mjs";

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
