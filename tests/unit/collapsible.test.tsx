import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Accordion } from "../../src/composites.js";
import { CollapsibleSection, InlineConfirm, Section } from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

describe("merged collapsible contract", () => {
  it("opens uncontrolled from defaultOpen and reports toggle changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInPanel(
      <CollapsibleSection
        title="Advanced settings"
        defaultOpen
        onOpenChange={onOpenChange}
      >
        <span>Advanced content</span>
      </CollapsibleSection>,
    );

    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Advanced content")).toBeVisible();

    await user.click(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByText("Advanced content")).not.toBeVisible();

    await user.click(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("Advanced content")).toBeVisible();
  });
});

describe("collapsible summary visibility", () => {
  it("hides the summary while open by default", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <CollapsibleSection title="Details" summary="3 checks healthy">
        Content
      </CollapsibleSection>,
    );

    expect(screen.getByText("3 checks healthy")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.queryByText("3 checks healthy")).toBeNull();
  });

  it("keeps the summary visible while open under always", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <CollapsibleSection
        title="Details"
        summary="3 checks healthy"
        summaryVisibility="always"
      >
        Content
      </CollapsibleSection>,
    );

    expect(screen.getByText("3 checks healthy")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByText("3 checks healthy")).toBeVisible();
  });
});

describe("accordion coordination", () => {
  it("keeps at most one section open", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Accordion>
        <CollapsibleSection title="First">
          <span>First content</span>
        </CollapsibleSection>
        <CollapsibleSection title="Second">
          <span>Second content</span>
        </CollapsibleSection>
      </Accordion>,
    );

    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "false");

    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("First content")).toBeVisible();
    expect(screen.getByText("Second content")).not.toBeVisible();

    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("First content")).not.toBeVisible();
    expect(screen.getByText("Second content")).toBeVisible();

    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "false");
  });

  it("honors a child defaultOpen as the initial open section", () => {
    renderInPanel(
      <Accordion>
        <CollapsibleSection title="First">First content</CollapsibleSection>
        <CollapsibleSection title="Second" defaultOpen>
          Second content
        </CollapsibleSection>
      </Accordion>,
    );

    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("composes the child's own onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInPanel(
      <Accordion>
        <CollapsibleSection title="First" onOpenChange={onOpenChange}>
          First content
        </CollapsibleSection>
        <CollapsibleSection title="Second">Second content</CollapsibleSection>
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: "First" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("rejects children that are not collapsible sections and names them", () => {
    expect(() =>
      renderInPanel(
        <Accordion>
          <div>Not a section</div>
        </Accordion>,
      ),
    ).toThrow("Accordion accepts only CollapsibleSection children; received");
    expect(() =>
      renderInPanel(
        <Accordion>
          <div>Not a section</div>
        </Accordion>,
      ),
    ).toThrow("<div>");
  });

  it("tells the replaced section about the close the accordion made", async () => {
    const user = userEvent.setup();
    const onFirstOpenChange = vi.fn();
    const onSecondOpenChange = vi.fn();
    renderInPanel(
      <Accordion>
        <CollapsibleSection title="First" onOpenChange={onFirstOpenChange}>
          First content
        </CollapsibleSection>
        <CollapsibleSection title="Second" onOpenChange={onSecondOpenChange}>
          Second content
        </CollapsibleSection>
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: "First" }));
    expect(onFirstOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Second" }));
    // The accordion, not the pressed section, closed the first one, so the
    // first section is the one that has to hear about it.
    expect(onFirstOpenChange).toHaveBeenLastCalledWith(false);
    expect(onSecondOpenChange).toHaveBeenLastCalledWith(true);
  });

  it("opens the section a controlling panel names", async () => {
    const user = userEvent.setup();
    const onOpenIndexChange = vi.fn();

    function Owner({
      openIndex,
    }: {
      readonly openIndex: number | null;
    }): React.JSX.Element {
      return (
        <Accordion openIndex={openIndex} onOpenIndexChange={onOpenIndexChange}>
          <CollapsibleSection title="First">First content</CollapsibleSection>
          <CollapsibleSection title="Second">Second content</CollapsibleSection>
        </Accordion>
      );
    }

    const { rerender } = renderInPanel(<Owner openIndex={null} />);
    const first = screen.getByRole("button", { name: "First" });
    expect(first).toHaveAttribute("aria-expanded", "false");

    rerender(panel(<Owner openIndex={1} />));
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    // A controlled accordion reports the press and leaves the state to the
    // owner, which has not moved it.
    await user.click(first);
    expect(onOpenIndexChange).toHaveBeenCalledWith(0);
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("takes the initially open section from defaultOpenIndex", () => {
    renderInPanel(
      <Accordion defaultOpenIndex={1}>
        <CollapsibleSection title="First" defaultOpen>
          First content
        </CollapsibleSection>
        <CollapsibleSection title="Second">Second content</CollapsibleSection>
      </Accordion>,
    );

    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("warns that it owns a child's open prop", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <Accordion>
        <CollapsibleSection title="First" open>
          First content
        </CollapsibleSection>
      </Accordion>,
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Accordion owns the open state of every child"),
    );
    warn.mockRestore();
  });
});

function stubMatchMedia(matches: boolean): void {
  const implementation = (query: string): MediaQueryList =>
    // Only `matches` and `media` are consumed by the component under test.
    ({ matches, media: query }) as MediaQueryList;
  window.matchMedia = vi.fn().mockImplementation(implementation);
}

describe("inline confirmation upgrades", () => {
  afterEach(() => {
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it("supports uncontrolled use through defaultOpen and closes on cancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderInPanel(
      <InlineConfirm
        defaultOpen
        message="This removes the cached source."
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledWith("cancel");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("closes an uncontrolled confirmation on confirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderInPanel(
      <InlineConfirm
        defaultOpen
        message="This removes the cached source."
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("keeps open controlled when provided alongside defaultOpen", () => {
    const { rerender } = renderInPanel(
      <InlineConfirm
        open={false}
        defaultOpen
        message="This removes the cached source."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByRole("region")).toBeNull();

    rerender(
      panel(
        <InlineConfirm
          open
          defaultOpen={false}
          message="This removes the cached source."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      ),
    );
    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toBeVisible();
  });

  it("reports escape as the cancel reason", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderInPanel(
      <InlineConfirm
        open
        message="This removes the cached source."
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledWith("escape");
  });

  it("styles the cancel action with the requested variant", () => {
    renderInPanel(
      <InlineConfirm
        open
        cancelVariant="ghost"
        message="This removes the cached source."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
      "snui-button--ghost",
    );
  });

  it("focuses the requested element on open instead of the container", () => {
    const initialFocusRef = createRef<HTMLButtonElement>();
    renderInPanel(
      <InlineConfirm
        open
        initialFocusRef={initialFocusRef}
        message={
          <button ref={initialFocusRef} type="button">
            Review details
          </button>
        }
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(initialFocusRef.current).toHaveFocus();
  });

  it("returns focus to the requested destination after close", () => {
    const returnFocusRef = createRef<HTMLButtonElement>();
    const props = {
      message: "This removes the cached source.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
      returnFocusRef,
    } as const;
    const { rerender } = renderInPanel(
      <>
        <button ref={returnFocusRef} type="button">
          Source settings
        </button>
        <InlineConfirm {...props} open />
      </>,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toHaveFocus();

    rerender(
      panel(
        <>
          <button ref={returnFocusRef} type="button">
            Source settings
          </button>
          <InlineConfirm {...props} open={false} />
        </>,
      ),
    );

    expect(returnFocusRef.current).toHaveFocus();
  });

  it("scrolls the confirmation into view smoothly by default", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    stubMatchMedia(false);

    renderInPanel(
      <InlineConfirm
        open
        message="This removes the cached source."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      behavior: "smooth",
    });
  });

  it("jumps instead of scrolling smoothly under reduced motion", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    stubMatchMedia(true);

    renderInPanel(
      <InlineConfirm
        open
        message="This removes the cached source."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      behavior: "auto",
    });
  });

  it("drops the region landmark and its naming when landmark is false", () => {
    const { container } = renderInPanel(
      <InlineConfirm
        open
        landmark={false}
        title="Reset configuration?"
        message="This removes the cached source."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByRole("region")).toBeNull();
    const confirmation = container.querySelector(".snui-inline-confirm");
    expect(confirmation).not.toBeNull();
    expect(confirmation).not.toHaveAttribute("aria-labelledby");
    expect(
      screen.getByRole("heading", { name: "Reset configuration?" }),
    ).toBeVisible();
  });
});

describe("section landmark opt-out", () => {
  it("keeps the section element and heading without region naming", () => {
    const { container } = renderInPanel(
      <Section title="Connection" landmark={false}>
        Content
      </Section>,
    );

    expect(screen.queryByRole("region")).toBeNull();
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByRole("heading", { name: "Connection" })).toBeVisible();
  });

  it("pauses retained effects on collapse while keeping child state", async () => {
    const user = userEvent.setup();
    const lifecycle: string[] = [];

    function Child(): React.JSX.Element {
      const runs = useRef(0);
      const [value, setValue] = useState("initial");
      useEffect(() => {
        runs.current += 1;
        lifecycle.push(`run ${String(runs.current)}`);
        return () => {
          lifecycle.push("cleanup");
        };
      }, []);
      return (
        <input
          aria-label="Draft"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      );
    }

    renderInPanel(
      <CollapsibleSection title="Advanced settings" defaultOpen>
        <Child />
      </CollapsibleSection>,
    );
    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    await user.clear(screen.getByLabelText("Draft"));
    await user.type(screen.getByLabelText("Draft"), "edited");
    expect(lifecycle).toEqual(["run 1"]);

    await user.click(toggle);
    // Collapsing tears the subtree's effects down without unmounting it, so a
    // cleanup that discards state the consumer expects to outlive the hidden
    // period loses it. The API reference records the rules that follow.
    expect(lifecycle).toEqual(["run 1", "cleanup"]);

    await user.click(toggle);
    expect(lifecycle).toEqual(["run 1", "cleanup", "run 2"]);
    expect(screen.getByLabelText("Draft")).toHaveValue("edited");
  });

  it("discards child state under the unmounting strategy", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <CollapsibleSection
        title="Advanced settings"
        defaultOpen
        mountStrategy="unmount"
      >
        <input aria-label="Draft" defaultValue="initial" />
      </CollapsibleSection>,
    );
    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    await user.clear(screen.getByLabelText("Draft"));
    await user.type(screen.getByLabelText("Draft"), "edited");

    await user.click(toggle);
    expect(screen.queryByLabelText("Draft")).toBeNull();

    await user.click(toggle);
    expect(screen.getByLabelText("Draft")).toHaveValue("initial");
  });

  it("drops consumer label references when landmark is false", () => {
    const { container } = renderInPanel(
      <>
        <span id="consumer-context">Provider configuration</span>
        <Section
          aria-labelledby="consumer-context"
          title="Connection"
          landmark={false}
        >
          Content
        </Section>
      </>,
    );

    expect(screen.queryByRole("region")).toBeNull();
    expect(container.querySelector("section")).not.toHaveAttribute(
      "aria-labelledby",
    );
  });

  it("gives a consumer the heading as a focus destination", () => {
    const headingRef = createRef<HTMLHeadingElement>();
    renderInPanel(
      <Section title="Connection" headingRef={headingRef}>
        Content
      </Section>,
    );

    const heading = screen.getByRole("heading", { name: "Connection" });
    expect(headingRef.current).toBe(heading);
    // Focusable only where a consumer asked for it, so an ordinary section
    // adds nothing to what a reader has to move through.
    expect(heading).toHaveAttribute("tabindex", "-1");
    headingRef.current?.focus();
    expect(heading).toHaveFocus();
  });

  it("leaves the heading out of the tab order without a ref", () => {
    renderInPanel(<Section title="Connection">Content</Section>);

    expect(
      screen.getByRole("heading", { name: "Connection" }),
    ).not.toHaveAttribute("tabindex");
  });
});

describe("collapsible focus handoff", () => {
  it("returns focus to the toggle when a press closes a section holding it", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <CollapsibleSection title="Advanced settings" defaultOpen>
        <button type="button">Reset counters</button>
      </CollapsibleSection>,
    );

    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    const inside = screen.getByRole("button", { name: "Reset counters" });
    inside.focus();
    expect(inside).toHaveFocus();

    await user.click(toggle);
    expect(toggle).toHaveFocus();
  });

  it("returns focus to the toggle when a controlled close hides the content", async () => {
    const user = userEvent.setup();

    function Owner({ open }: { readonly open: boolean }): React.JSX.Element {
      return (
        <CollapsibleSection title="Advanced settings" open={open}>
          <button type="button">Reset counters</button>
        </CollapsibleSection>
      );
    }

    const { rerender } = renderInPanel(<Owner open />);
    await user.click(screen.getByRole("button", { name: "Reset counters" }));

    rerender(panel(<Owner open={false} />));
    expect(
      screen.getByRole("button", { name: "Advanced settings" }),
    ).toHaveFocus();
  });

  it("moves no focus when a section closes while focus is elsewhere", async () => {
    const user = userEvent.setup();

    function Owner({ open }: { readonly open: boolean }): React.JSX.Element {
      return (
        <>
          <button type="button">Outside action</button>
          <CollapsibleSection title="Advanced settings" open={open}>
            <button type="button">Reset counters</button>
          </CollapsibleSection>
        </>
      );
    }

    const { rerender } = renderInPanel(<Owner open />);
    const outside = screen.getByRole("button", { name: "Outside action" });
    await user.click(outside);

    rerender(panel(<Owner open={false} />));
    expect(outside).toHaveFocus();
  });

  it("leaves an open section alone when a controlling owner declines the close", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInPanel(
      <CollapsibleSection
        title="Advanced settings"
        open
        onOpenChange={onOpenChange}
      >
        <button type="button">Reset counters</button>
      </CollapsibleSection>,
    );

    const inside = screen.getByRole("button", { name: "Reset counters" });
    inside.focus();
    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    await user.click(toggle);

    // The owner heard the request and left `open` alone, so the content is
    // still on screen, the toggle the reader pressed still has focus, and the
    // handoff has not run for a close that never happened.
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(inside).toBeVisible();
    expect(toggle).toHaveFocus();
  });

  it("ignores the toggle while disabled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInPanel(
      <CollapsibleSection
        title="Advanced settings"
        disabled
        onOpenChange={onOpenChange}
      >
        Content
      </CollapsibleSection>,
    );

    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("collapsible tone, trigger, and ids", () => {
  it("marks a toned section and announces the tone on its toggle", () => {
    const { container } = renderInPanel(
      <CollapsibleSection title="Advanced settings" tone="danger">
        Content
      </CollapsibleSection>,
    );

    expect(container.querySelector(".snui-collapsible--danger")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /Advanced settings/ }),
    ).toHaveAccessibleName(/Error\.\s*Advanced settings/);
  });

  it("takes a tone label of its own", () => {
    renderInPanel(
      <CollapsibleSection
        title="Advanced settings"
        tone="danger"
        toneLabel="Blocking problems"
      >
        Content
      </CollapsibleSection>,
    );

    expect(
      screen.getByRole("button", { name: /Advanced settings/ }),
    ).toHaveAccessibleName(/Blocking problems\.\s*Advanced settings/);
  });

  it("hands the toggle to a consumer ref and names it from idPrefix", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    renderInPanel(
      <CollapsibleSection
        title="Advanced settings"
        idPrefix="advanced"
        triggerRef={triggerRef}
      >
        Content
      </CollapsibleSection>,
    );

    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    expect(triggerRef.current).toBe(toggle);
    expect(toggle).toHaveAttribute("id", "advanced-toggle");
    expect(toggle).toHaveAttribute("aria-controls", "advanced-content");
    expect(document.getElementById("advanced-title")).toHaveTextContent(
      "Advanced settings",
    );

    // The panel can jump to the section it wants read without a DOM query.
    triggerRef.current?.focus();
    expect(toggle).toHaveFocus();
  });

  it("rejects an id prefix that cannot be an ARIA reference", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      renderInPanel(
        <CollapsibleSection title="Advanced settings" idPrefix="two words">
          Content
        </CollapsibleSection>,
      ),
    ).toThrow("CollapsibleSection idPrefix");
  });

  it("mounts lazily retained content only once it has been opened", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <CollapsibleSection title="Advanced settings" mountStrategy="lazy-retain">
        <span>Advanced content</span>
      </CollapsibleSection>,
    );

    expect(screen.queryByText("Advanced content")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    await user.click(toggle);
    expect(screen.getByText("Advanced content")).toBeVisible();

    await user.click(toggle);
    expect(screen.getByText("Advanced content")).not.toBeVisible();
  });
});
