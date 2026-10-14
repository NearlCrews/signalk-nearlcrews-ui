import { describe, expect, it } from "vitest";

import { THEME_IDS, themeLabel } from "../../scripts/lib/themes.mjs";

describe("showcase themes", () => {
  it("derives each selector label from the theme id", () => {
    expect(THEME_IDS.map(themeLabel)).toEqual(["Light", "Dark", "Night"]);
  });
});
