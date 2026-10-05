import { describe, expect, it } from "vitest";

import { settleInOrder } from "../../scripts/lib/promises.mjs";

describe("settling promises in input order", () => {
  it("resolves to every value in input order", async () => {
    await expect(
      settleInOrder([Promise.resolve("first"), Promise.resolve("second")]),
    ).resolves.toEqual(["first", "second"]);
  });

  it("rejects with the first failure in input order, not the first to arrive", async () => {
    const earlier = new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error("first in input order")), 10);
    });

    await expect(
      settleInOrder([earlier, Promise.reject(new Error("first to arrive"))]),
    ).rejects.toThrow("first in input order");
  });
});
