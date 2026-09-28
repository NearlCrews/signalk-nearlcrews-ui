import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, createElement, createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button, Section } from "../../src/index.js";
import { Popover } from "../../src/overlays.js";
import { panel, renderInPanel } from "../helpers.js";

const NOT_INTERACTIVE =
  "signalk-nearlcrews-ui: Popover trigger must render a semantic interactive element or an element with an interactive ARIA role.";

const NOT_FOCUSABLE =
  "signalk-nearlcrews-ui: Popover trigger must be focusable: remove the negative tabIndex, or spread the injected props onto the element.";

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
      "signalk-nearlcrews-ui: Popover trigger must forward its ref to a semantic interactive element.",
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

  it("rejects a roleless trigger element", () => {
    expect(() =>
      renderInPanel(
        <Popover trigger={<span>Details</span>}>
          <p>Depth details</p>
        </Popover>,
      ),
    ).toThrow(NOT_INTERACTIVE);
  });

  it("rejects an anchor without a link destination", () => {
    expect(() =>
      renderInPanel(
        <Popover trigger={createElement("a", undefined, "Details")}>
          <p>Depth details</p>
        </Popover>,
      ),
    ).toThrow(NOT_INTERACTIVE);
  });

  it("supports a custom trigger that forwards native props and its ref", async () => {
    const user = userEvent.setup();
    function CustomTrigger(props: ComponentProps<"button">) {
      return <button {...props} />;
    }

    renderInPanel(
      <Popover trigger={<CustomTrigger>Details</CustomTrigger>}>
        <p>Depth details</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Depth details");
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

  it("passes a token width through the CSS variable unchanged", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Popover
        trigger={<Button>Info</Button>}
        width="var(--snui-content-width-standard)"
      >
        <p>Hint text</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(
      screen.getByRole("dialog").style.getPropertyValue("--snui-popover-width"),
    ).toBe("var(--snui-content-width-standard)");
  });

  it("takes a pixel width as a length string and leaves auto unset", async () => {
    const user = userEvent.setup();
    const { unmount } = renderInPanel(
      <Popover trigger={<Button>Info</Button>} width="240px">
        <p>Hint text</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(
      screen.getByRole("dialog").style.getPropertyValue("--snui-popover-width"),
    ).toBe("240px");
    unmount();

    renderInPanel(
      <Popover trigger={<Button>Info</Button>}>
        <p>Hint text</p>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(
      screen.getByRole("dialog").style.getPropertyValue("--snui-popover-width"),
    ).toBe("");
  });

  it("no longer reads a bare number as pixels", async () => {
    const user = userEvent.setup();
    renderInPanel(
      // @ts-expect-error a width is a CSS length string or "auto"
      <Popover trigger={<Button>Info</Button>} width={240}>
        <p>Hint text</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(
      screen.getByRole("dialog").style.getPropertyValue("--snui-popover-width"),
    ).not.toBe("240px");
  });

  it("merges a consumer className onto the popover", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Popover className="plugin-popover" trigger={<Button>Info</Button>}>
        <p>Hint text</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(screen.getByRole("dialog")).toHaveClass(
      "snui-popover",
      "plugin-popover",
    );
  });
});

describe("Popover", () => {
  it("rejects rendering outside PanelRoot", () => {
    expect(() =>
      render(
        <Popover trigger={<Button>Details</Button>}>
          <p>Depth details</p>
        </Popover>,
      ),
    ).toThrow(
      "signalk-nearlcrews-ui: Popover must be rendered inside PanelRoot.",
    );
  });

  it("opens on trigger click and forwards ref to the popover element", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    renderInPanel(
      <Popover ref={ref} trigger={<Button>Details</Button>}>
        <p>Depth details</p>
      </Popover>,
    );

    const trigger = screen.getByRole("button", { name: "Details" });
    await user.click(trigger);

    const popover = screen.getByRole("dialog", { name: "Details" });
    expect(popover).toHaveTextContent("Depth details");
    expect(popover).toHaveClass("snui-popover");
    expect(popover).toHaveStyle({ zIndex: "var(--snui-z-overlay)" });
    expect(popover.closest(".snui-root")).not.toBeNull();
    expect(ref.current).toBe(popover);
  });

  it("opens nothing from a blocked library Button trigger", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <Popover
          trigger={
            <Button ariaDisabled disabledReason="Connect a source first.">
              Blocked
            </Button>
          }
        >
          <p>Blocked body</p>
        </Popover>
        <Popover trigger={<Button loading>Busy</Button>}>
          <p>Busy body</p>
        </Popover>
      </>,
    );

    const blocked = screen.getByRole("button", { name: "Blocked" });
    await user.click(blocked);
    expect(screen.queryByRole("dialog")).toBeNull();
    // The blocked trigger stays focusable, and the keyboard opens nothing.
    blocked.focus();
    expect(blocked).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Busy" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Popover trigger={<Button>Details</Button>}>
        <p>Depth details</p>
      </Popover>,
    );

    const trigger = screen.getByRole("button", { name: "Details" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    // RAC restores focus from a requestAnimationFrame callback.
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("closes on outside press", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <Popover trigger={<Button>Details</Button>}>
          <p>Depth details</p>
        </Popover>
        <p>Outside content</p>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByText("Outside content"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens from defaultOpen and reports close requests", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInPanel(
      <Popover
        defaultOpen
        onOpenChange={onOpenChange}
        trigger={<Button>Info</Button>}
      >
        <p>Hint text</p>
      </Popover>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = renderInPanel(
      <Popover
        onOpenChange={onOpenChange}
        open={false}
        trigger={<Button>Info</Button>}
      >
        <p>Hint text</p>
      </Popover>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      panel(
        <Popover
          onOpenChange={onOpenChange}
          open
          trigger={<Button>Info</Button>}
        >
          <p>Hint text</p>
        </Popover>,
      ),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("maps placement to the RAC placement axis", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Popover placement="top" trigger={<Button>Info</Button>}>
        <p>Hint text</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("data-placement", "top");
  });
});

describe("Popover content outline", () => {
  it("starts content opened from inside a section with an outline of its own", async () => {
    // The popover is portaled to the panel root, but React context would
    // still hand it the outline of the section it was opened from, which
    // takes the landmark from a section inside it.
    const user = userEvent.setup();
    renderInPanel(
      <Section title="Outer">
        <Popover trigger={<Button>Details</Button>}>
          <Section title="Inside popover">Content</Section>
        </Popover>
      </Section>,
    );

    await user.click(screen.getByRole("button", { name: "Details" }));
    const popover = screen.getByRole("dialog", { name: "Details" });
    expect(
      within(popover).getByRole("region", { name: "Inside popover" }),
    ).toBeInTheDocument();
  });
});
