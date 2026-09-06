import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
  useDisclosure,
} from "../../src/composites.js";
import { PanelRoot } from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

describe("Disclosure", () => {
  it("wires the trigger and panel and hands focus across on open and close", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Disclosure>
        <DisclosureTrigger>Show reports</DisclosureTrigger>
        <DisclosurePanel>
          <p>Report body</p>
        </DisclosurePanel>
      </Disclosure>,
    );

    const trigger = screen.getByRole("button", { name: "Show reports" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const panelId = trigger.getAttribute("aria-controls") ?? "";
    const region = document.getElementById(panelId);
    expect(region).not.toBeNull();
    expect(region).not.toBeVisible();
    expect(region).toHaveAttribute("aria-labelledby", trigger.id);

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Show reports" })).toBe(region);
    expect(region).toHaveFocus();
    expect(screen.getByText("Report body")).toBeVisible();

    await user.click(trigger);
    expect(region).not.toBeVisible();
    expect(trigger).toHaveFocus();
  });

  it("supports controlled state and leaves focus alone for programmatic changes", () => {
    const onOpenChange = vi.fn();
    const { rerender } = renderInPanel(
      <Disclosure open={false} onOpenChange={onOpenChange}>
        <DisclosureTrigger>Edit prompt</DisclosureTrigger>
        <DisclosurePanel aria-label="Prompt editor">
          <textarea aria-label="Prompt" />
        </DisclosurePanel>
      </Disclosure>,
    );

    expect(screen.queryByRole("region")).toBeNull();
    rerender(
      panel(
        <Disclosure open onOpenChange={onOpenChange}>
          <DisclosureTrigger>Edit prompt</DisclosureTrigger>
          <DisclosurePanel aria-label="Prompt editor">
            <textarea aria-label="Prompt" />
          </DisclosurePanel>
        </Disclosure>,
      ),
    );

    const region = screen.getByRole("region", { name: "Prompt editor" });
    expect(region).toBeVisible();
    // Nothing was pressed, so nothing moves focus.
    expect(region).not.toHaveFocus();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("reports toggles to a controlling owner", async () => {
    const user = userEvent.setup();

    function Owner(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <PanelRoot>
          <Disclosure open={open} onOpenChange={setOpen}>
            <DisclosureTrigger>{open ? "Hide" : "Show"}</DisclosureTrigger>
            <DisclosurePanel mountStrategy="unmount">
              <p>Mounted only while open</p>
            </DisclosurePanel>
          </Disclosure>
        </PanelRoot>
      );
    }

    render(<Owner />);
    expect(screen.queryByText("Mounted only while open")).toBeNull();
    const trigger = screen.getByRole("button", { name: "Show" });
    const panelId = trigger.getAttribute("aria-controls") ?? "";
    expect(document.getElementById(panelId)).not.toBeNull();

    await user.click(trigger);
    expect(screen.getByText("Mounted only while open")).toBeVisible();
    expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("rejects a trigger or panel outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      renderInPanel(<DisclosureTrigger>Orphan</DisclosureTrigger>),
    ).toThrow("DisclosureTrigger must be rendered inside Disclosure.");
    expect(() =>
      renderInPanel(<DisclosurePanel>Orphan</DisclosurePanel>),
    ).toThrow("DisclosurePanel must be rendered inside Disclosure.");
  });
});

describe("useDisclosure", () => {
  it("drives a consumer's own elements through the returned props", async () => {
    const user = userEvent.setup();

    function Drawer(): React.JSX.Element {
      const { open, panelProps, triggerProps } = useDisclosure({
        defaultOpen: true,
      });
      return (
        <div>
          <button type="button" {...triggerProps}>
            {open ? "Hide details" : "View details"}
          </button>
          <div {...panelProps}>Detail body</div>
        </div>
      );
    }

    render(<Drawer />);
    const trigger = screen.getByRole("button", { name: "Hide details" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", { name: "Hide details" });
    expect(region).toHaveAttribute("tabindex", "-1");
    expect(region.id).toBe(trigger.getAttribute("aria-controls"));

    await user.click(trigger);
    expect(screen.getByRole("button", { name: "View details" })).toHaveFocus();
    expect(region).not.toBeVisible();
  });
});
