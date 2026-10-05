import { describe, expect, it, vi } from "vitest";

import {
  fetchJson,
  fetchOk,
  latestReleaseTag,
} from "../../scripts/lib/github-releases.mjs";

describe("GitHub release lookups", () => {
  it("asks for the latest release, with a token when one is given", async () => {
    const calls = [];
    const fetchReleaseJson = async (url, init) => {
      calls.push({ headers: init.headers, url });
      return { tag_name: "v1.30.1" };
    };

    await expect(
      latestReleaseTag("zizmorcore/zizmor", {
        fetchJson: fetchReleaseJson,
        token: "t",
      }),
    ).resolves.toBe("v1.30.1");
    await latestReleaseTag("zizmorcore/zizmor", {
      fetchJson: fetchReleaseJson,
    });

    expect(calls[0].url).toBe(
      "https://api.github.com/repos/zizmorcore/zizmor/releases/latest",
    );
    expect(calls[0].headers.Authorization).toBe("Bearer t");
    expect(calls[1].headers.Authorization).toBeUndefined();
  });

  it("fails with a readable message when the release carries no tag", async () => {
    await expect(
      latestReleaseTag("rhysd/actionlint", { fetchJson: async () => ({}) }),
    ).rejects.toThrow(
      "The latest rhysd/actionlint release carries no tag_name.",
    );
    await expect(
      latestReleaseTag("rhysd/actionlint", { fetchJson: async () => null }),
    ).rejects.toThrow("carries no tag_name");
  });

  it("fetches through the global fetch and fails on an error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        url.endsWith("/ok")
          ? new Response(JSON.stringify({ tag_name: "v2" }), { status: 200 })
          : new Response("", { status: 404, statusText: "Not Found" }),
      ),
    );

    await expect(fetchJson("https://example.test/ok")).resolves.toEqual({
      tag_name: "v2",
    });
    await expect(fetchOk("https://example.test/missing")).rejects.toThrow(
      "GET https://example.test/missing answered 404 Not Found.",
    );
    // Without an injected fetchJson the lookup goes through the global fetch.
    await expect(latestReleaseTag("owner/repo")).rejects.toThrow(
      "GET https://api.github.com/repos/owner/repo/releases/latest answered 404 Not Found.",
    );
  });
});
