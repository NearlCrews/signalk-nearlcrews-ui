import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "../../src/index.js";
import { Popover } from "../../src/overlays.js";
import { renderInPanel } from "../helpers.js";

const NOT_INTERACTIVE =
  "Popover trigger must render a semantic interactive element or an element with an interactive ARIA role.";

const NOT_FOCUSABLE =
  "Popover trigger must be focusable: remove the negative tabIndex, or spread the injected props onto the element.";

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

  it("rejects a trigger component that drops the forwarded ref", () => {
    function RefLosingTrigger(): React.JSX.Element {
      return <button type="button">Show details</button>;
    }

    expect(() =>
      renderInPanel(
        <Popover trigger={<RefLosingTrigger />}>
          <p>Popover body</p>
        </Popover>,
      ),
    ).toThrow(
      "Popover trigger must forward its ref to a semantic interactive element.",
    );
  });

  it("rejects an interactive trigger the keyboard cannot reach", () => {
    // react-aria gives its child a tabindex of 0, so a negative one is the
    // trigger opting out of the tab order the popover needs.
    expect(() =>
      renderInPanel(
        <Popover
          trigger={
            // biome-ignore lint/a11y/useSemanticElements: the point of the case is a div wearing the role
            <div role="button" tabIndex={-1}>
              Show details
            </div>
          }
        >
          <p>Popover body</p>
        </Popover>,
      ),
    ).toThrow(NOT_FOCUSABLE);
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

describe("Popover surface", () => {
  it("carries the id, name, and style the consumer gave it", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <h2 id="details-heading">Chart details</h2>
        <Popover
          id="chart-details"
          aria-labelledby="details-heading"
          style={{ color: "rgb(255, 0, 0)" }}
          width="18rem"
          trigger={<Button>Show details</Button>}
        >
          <p>Popover body</p>
        </Popover>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Show details" }));

    const surface = screen.getByRole("dialog", { name: "Chart details" });
    expect(surface).toHaveClass("snui-popover");
    expect(surface).toHaveAttribute("id", "chart-details");
    expect(surface).toHaveStyle({ color: "rgb(255, 0, 0)" });
    expect(surface.style.getPropertyValue("--snui-popover-width")).toBe(
      "18rem",
    );
  });
});
