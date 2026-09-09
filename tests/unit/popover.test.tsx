import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Popover } from "../../src/overlays.js";
import { renderInPanel } from "../helpers.js";

const NOT_INTERACTIVE =
  "Popover trigger must render a semantic interactive element or an element with an interactive ARIA role.";

describe("Popover trigger element", () => {
  it("accepts a summary that opens the details it heads", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <details>
        <Popover trigger={<summary>Show details</summary>}>
          <p>Popover body</p>
        </Popover>
      </details>,
    );

    await user.click(screen.getByText("Show details"));
    expect(await screen.findByText("Popover body")).toBeVisible();
  });

  it("rejects a summary that heads no details element", () => {
    // A loose summary exposes no role and takes no focus, so the popover
    // would open from a control the keyboard cannot reach.
    expect(() =>
      renderInPanel(
        <Popover trigger={<summary>Show details</summary>}>
          <p>Popover body</p>
        </Popover>,
      ),
    ).toThrow(NOT_INTERACTIVE);
  });

  it("rejects a summary that follows another element inside its details", () => {
    expect(() =>
      renderInPanel(
        <details>
          <p>Ahead of the summary</p>
          <Popover trigger={<summary>Show details</summary>}>
            <p>Popover body</p>
          </Popover>
        </details>,
      ),
    ).toThrow(NOT_INTERACTIVE);
  });

  it("rejects a hidden input and accepts a typed one", () => {
    expect(() =>
      renderInPanel(
        <Popover trigger={<input type="hidden" />}>
          <p>Popover body</p>
        </Popover>,
      ),
    ).toThrow(NOT_INTERACTIVE);

    expect(() =>
      renderInPanel(
        <Popover trigger={<input type="text" aria-label="Chart name" />}>
          <p>Popover body</p>
        </Popover>,
      ),
    ).not.toThrow();
  });
});
