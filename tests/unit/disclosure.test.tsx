import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
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
    // The owner accepted the toggle, so the press still hands focus over.
    expect(screen.getByRole("region")).toHaveFocus();
  });

  it("moves no focus once a controlled owner declines the toggle", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    function Owner({ open }: { readonly open: boolean }): React.JSX.Element {
      return (
        <PanelRoot>
          <Disclosure open={open} onOpenChange={onOpenChange}>
            <DisclosureTrigger>Show reports</DisclosureTrigger>
            <DisclosurePanel aria-label="Reports">
              <p>Report body</p>
            </DisclosurePanel>
          </Disclosure>
        </PanelRoot>
      );
    }

    const { rerender } = render(<Owner open={false} />);
    const trigger = screen.getByRole("button", { name: "Show reports" });

    await user.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // The owner opens the panel later for its own reasons, which is a change
    // the consumer made directly, so it must leave focus where it was.
    rerender(<Owner open />);
    const region = screen.getByRole("region", { name: "Reports" });
    expect(region).toBeVisible();
    expect(region).not.toHaveFocus();
    expect(trigger).toHaveFocus();
  });

  it("forwards a ref to the panel section and still focuses it on open", async () => {
    const user = userEvent.setup();
    const panelRef = createRef<HTMLElement>();
    renderInPanel(
      <Disclosure>
        <DisclosureTrigger>Show reports</DisclosureTrigger>
        <DisclosurePanel ref={panelRef} data-testid="panel">
          <p>Report body</p>
        </DisclosurePanel>
      </Disclosure>,
    );

    const section = screen.getByTestId("panel");
    expect(section.tagName).toBe("SECTION");
    expect(panelRef.current).toBe(section);

    await user.click(screen.getByRole("button", { name: "Show reports" }));
    expect(section).toHaveFocus();
  });

  it("takes the trigger id and the panel stem from the consumer", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Disclosure id="engine-drawer-toggle" idPrefix="engine-drawer">
        <DisclosureTrigger>Show reports</DisclosureTrigger>
        <DisclosurePanel>
          <p>Report body</p>
        </DisclosurePanel>
      </Disclosure>,
    );

    const trigger = screen.getByRole("button", { name: "Show reports" });
    expect(trigger.id).toBe("engine-drawer-toggle");
    expect(trigger).toHaveAttribute("aria-controls", "engine-drawer-panel");
    const region = document.getElementById("engine-drawer-panel");
    expect(region).toHaveAttribute("aria-labelledby", "engine-drawer-toggle");

    await user.click(trigger);
    expect(region).toHaveFocus();
    expect(screen.getByRole("region", { name: "Show reports" })).toBe(region);
  });

  it("names both ends from idPrefix and generates them without it", () => {
    renderInPanel(
      <>
        <Disclosure idPrefix="reports">
          <DisclosureTrigger>Reports</DisclosureTrigger>
          <DisclosurePanel>
            <p>Report body</p>
          </DisclosurePanel>
        </Disclosure>
        <Disclosure>
          <DisclosureTrigger>Diagnostics</DisclosureTrigger>
          <DisclosurePanel>
            <p>Diagnostic body</p>
          </DisclosurePanel>
        </Disclosure>
      </>,
    );

    const reports = screen.getByRole("button", { name: "Reports" });
    expect(reports.id).toBe("reports-trigger");
    expect(reports).toHaveAttribute("aria-controls", "reports-panel");
    expect(document.getElementById("reports-panel")).toHaveAttribute(
      "aria-labelledby",
      "reports-trigger",
    );

    const diagnostics = screen.getByRole("button", { name: "Diagnostics" });
    expect(diagnostics.id).not.toBe("");
    expect(diagnostics.id).not.toBe(reports.id);
    const generatedPanelId = diagnostics.getAttribute("aria-controls") ?? "";
    expect(document.getElementById(generatedPanelId)).toHaveAttribute(
      "aria-labelledby",
      diagnostics.id,
    );
  });

  it("leaves the panel id generated when only the trigger is named", () => {
    renderInPanel(
      <Disclosure id="engine-toggle">
        <DisclosureTrigger>Show reports</DisclosureTrigger>
        <DisclosurePanel>
          <p>Report body</p>
        </DisclosurePanel>
      </Disclosure>,
    );

    const trigger = screen.getByRole("button", { name: "Show reports" });
    expect(trigger.id).toBe("engine-toggle");
    const panelId = trigger.getAttribute("aria-controls") ?? "";
    expect(panelId).not.toBe("");
    expect(document.getElementById(panelId)).toHaveAttribute(
      "aria-labelledby",
      "engine-toggle",
    );
  });

  it("rejects an id or a prefix that cannot be an ARIA reference", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      renderInPanel(
        <Disclosure id="engine drawer">
          <DisclosureTrigger>Show reports</DisclosureTrigger>
          <DisclosurePanel>Body</DisclosurePanel>
        </Disclosure>,
      ),
    ).toThrow(
      'useDisclosure id must be a non-empty string holding no whitespace; received "engine drawer".',
    );
    expect(() =>
      renderInPanel(
        <Disclosure idPrefix="">
          <DisclosureTrigger>Show reports</DisclosureTrigger>
          <DisclosurePanel>Body</DisclosurePanel>
        </Disclosure>,
      ),
    ).toThrow("useDisclosure idPrefix must be a non-empty string");
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

  it("returns focus to the trigger when the panel closes itself", async () => {
    const user = userEvent.setup();

    function Drawer(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <Disclosure open={open} onOpenChange={setOpen}>
          <DisclosureTrigger>Show reports</DisclosureTrigger>
          <DisclosurePanel mountStrategy="unmount">
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </DisclosurePanel>
        </Disclosure>
      );
    }

    renderInPanel(<Drawer />);
    const trigger = screen.getByRole("button", { name: "Show reports" });
    await user.click(trigger);

    // A Close button inside the panel is the ordinary shape, and it goes
    // through the consumer's own setter rather than the trigger. Without the
    // handoff the panel takes its focused button away and leaves the body
    // focused, with no keyboard route back to the trigger.
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(trigger).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  it("returns focus to the trigger when a retained panel hides itself", async () => {
    const user = userEvent.setup();

    function Drawer(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <Disclosure open={open} onOpenChange={setOpen}>
          <DisclosureTrigger>Show reports</DisclosureTrigger>
          <DisclosurePanel>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </DisclosurePanel>
        </Disclosure>
      );
    }

    renderInPanel(<Drawer />);
    const trigger = screen.getByRole("button", { name: "Show reports" });
    await user.click(trigger);

    const close = screen.getByRole("button", { name: "Close" });
    await user.click(close);
    // The retained button is still in the tree, hidden, so focus has to leave
    // it as well: a browser blurs it, and either way the trigger is the stop.
    expect(trigger).toHaveFocus();
    expect(close).not.toHaveFocus();
  });

  it("moves no focus when the panel closes while focus is elsewhere", async () => {
    const user = userEvent.setup();

    function Drawer({ open }: { readonly open: boolean }): React.JSX.Element {
      return (
        <>
          <button type="button">Outside action</button>
          <Disclosure open={open}>
            <DisclosureTrigger>Show reports</DisclosureTrigger>
            <DisclosurePanel>
              <button type="button">Acknowledge</button>
            </DisclosurePanel>
          </Disclosure>
        </>
      );
    }

    const { rerender } = renderInPanel(<Drawer open />);
    // Focus visits the panel and then leaves it, so the answer comes from
    // tracking focus rather than from where it started.
    screen.getByRole("button", { name: "Acknowledge" }).focus();
    const outside = screen.getByRole("button", { name: "Outside action" });
    await user.click(outside);
    expect(outside).toHaveFocus();

    rerender(panel(<Drawer open={false} />));

    // The close was not a press and took nothing away from the user, so the
    // handoff must not pull focus off the control they are working with.
    expect(outside).toHaveFocus();
  });
});

describe("Disclosure parts outside a provider", () => {
  function Row(): React.JSX.Element {
    // Engine is controlled by the row, so its Close button reaches the state
    // through the consumer's own setter rather than through `setOpen`.
    const [engineOpen, setEngineOpen] = useState(false);
    const engine = useDisclosure({
      idPrefix: "engine",
      onOpenChange: setEngineOpen,
      open: engineOpen,
    });
    const nav = useDisclosure({ idPrefix: "nav" });
    return (
      <div>
        <div>
          <DisclosureTrigger disclosure={engine}>Engine</DisclosureTrigger>
          <DisclosureTrigger disclosure={nav}>Nav</DisclosureTrigger>
        </div>
        <DisclosurePanel disclosure={engine} aria-label="Engine details">
          <button type="button" onClick={() => setEngineOpen(false)}>
            Close engine
          </button>
        </DisclosurePanel>
        <DisclosurePanel disclosure={nav} aria-label="Nav details">
          <p>Nav body</p>
        </DisclosurePanel>
      </div>
    );
  }

  it("drives two disclosures in one row from their hook results", async () => {
    const user = userEvent.setup();
    renderInPanel(<Row />);

    // Context carries one value, so a row of two could only nest and the
    // inner provider would answer for both triggers. Each part names its own.
    const engineTrigger = screen.getByRole("button", { name: "Engine" });
    const navTrigger = screen.getByRole("button", { name: "Nav" });
    expect(engineTrigger).toHaveAttribute("aria-controls", "engine-panel");
    expect(navTrigger).toHaveAttribute("aria-controls", "nav-panel");

    await user.click(engineTrigger);
    expect(engineTrigger).toHaveAttribute("aria-expanded", "true");
    expect(navTrigger).toHaveAttribute("aria-expanded", "false");
    const enginePanel = screen.getByRole("region", { name: "Engine details" });
    expect(enginePanel).toHaveFocus();
    expect(document.getElementById("nav-panel")).not.toBeVisible();
  });

  it("hands focus back the same way the composed form does", async () => {
    const user = userEvent.setup();
    renderInPanel(<Row />);

    const engineTrigger = screen.getByRole("button", { name: "Engine" });
    await user.click(engineTrigger);
    await user.click(screen.getByRole("button", { name: "Close engine" }));

    // Closing through the trigger, from a panel that holds focus: the prop
    // form reads the same hook, so it inherits the handoff rather than
    // needing its own.
    expect(engineTrigger).toHaveFocus();
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

  it("lets a consumer focus a named trigger without walking the DOM", async () => {
    const user = userEvent.setup();

    function Drawer({ label }: { readonly label: string }): React.JSX.Element {
      const { panelProps, triggerProps } = useDisclosure({
        idPrefix: `drawer-${label}`,
      });
      return (
        <div>
          <button type="button" {...triggerProps}>
            {label}
          </button>
          <div {...panelProps}>{label} body</div>
        </div>
      );
    }

    render(
      <div>
        <Drawer label="engine" />
        <Drawer label="nav" />
      </div>,
    );

    const nav = document.getElementById("drawer-nav-trigger");
    expect(nav).not.toBeNull();
    nav?.focus();
    expect(nav).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(document.getElementById("drawer-nav-panel")).toHaveFocus();
    expect(document.getElementById("drawer-engine-panel")).not.toBeVisible();
  });

  it("ignores setOpen for the state the panel already holds", () => {
    const onOpenChange = vi.fn();
    let setOpen: ((open: boolean) => void) | undefined;

    function Drawer(): React.JSX.Element {
      const disclosure = useDisclosure({ defaultOpen: true, onOpenChange });
      setOpen = disclosure.setOpen;
      return (
        <div>
          <button type="button" {...disclosure.triggerProps}>
            Hide details
          </button>
          <div {...disclosure.panelProps}>
            <button type="button">Acknowledge</button>
          </div>
        </div>
      );
    }

    render(<Drawer />);
    const acknowledge = screen.getByRole("button", { name: "Acknowledge" });
    acknowledge.focus();

    act(() => {
      setOpen?.(true);
    });

    expect(acknowledge).toHaveFocus();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
