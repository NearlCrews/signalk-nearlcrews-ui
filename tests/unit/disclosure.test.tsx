import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Accordion,
  CollapsibleSection,
  InlineConfirm,
  PanelRoot,
  Section,
} from "../../src/index.js";

describe("merged disclosure contract", () => {
  it("opens uncontrolled from defaultOpen and reports toggle changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <PanelRoot>
        <CollapsibleSection
          title="Advanced settings"
          defaultOpen
          onOpenChange={onOpenChange}
        >
          <span>Advanced content</span>
        </CollapsibleSection>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <CollapsibleSection title="Details" summary="3 checks healthy">
          Content
        </CollapsibleSection>
      </PanelRoot>,
    );

    expect(screen.getByText("3 checks healthy")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.queryByText("3 checks healthy")).toBeNull();
  });

  it("keeps the summary visible while open under always", async () => {
    const user = userEvent.setup();
    render(
      <PanelRoot>
        <CollapsibleSection
          title="Details"
          summary="3 checks healthy"
          summaryVisibility="always"
        >
          Content
        </CollapsibleSection>
      </PanelRoot>,
    );

    expect(screen.getByText("3 checks healthy")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByText("3 checks healthy")).toBeVisible();
  });
});

describe("accordion coordination", () => {
  it("keeps at most one section open", async () => {
    const user = userEvent.setup();
    render(
      <PanelRoot>
        <Accordion>
          <CollapsibleSection title="First">
            <span>First content</span>
          </CollapsibleSection>
          <CollapsibleSection title="Second">
            <span>Second content</span>
          </CollapsibleSection>
        </Accordion>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <Accordion>
          <CollapsibleSection title="First">First content</CollapsibleSection>
          <CollapsibleSection title="Second" defaultOpen>
            Second content
          </CollapsibleSection>
        </Accordion>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <Accordion>
          <CollapsibleSection title="First" onOpenChange={onOpenChange}>
            First content
          </CollapsibleSection>
          <CollapsibleSection title="Second">Second content</CollapsibleSection>
        </Accordion>
      </PanelRoot>,
    );

    await user.click(screen.getByRole("button", { name: "First" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("rejects children that are not collapsible sections", () => {
    expect(() =>
      render(
        <PanelRoot>
          <Accordion>
            <div>Not a section</div>
          </Accordion>
        </PanelRoot>,
      ),
    ).toThrow("Accordion accepts only CollapsibleSection children.");
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
    render(
      <PanelRoot>
        <InlineConfirm
          defaultOpen
          message="This removes the cached source."
          onCancel={onCancel}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <InlineConfirm
          defaultOpen
          message="This removes the cached source."
          onCancel={vi.fn()}
          onConfirm={onConfirm}
        />
      </PanelRoot>,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("keeps open controlled when provided alongside defaultOpen", () => {
    const { rerender } = render(
      <PanelRoot>
        <InlineConfirm
          open={false}
          defaultOpen
          message="This removes the cached source."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
    );
    expect(screen.queryByRole("region")).toBeNull();

    rerender(
      <PanelRoot>
        <InlineConfirm
          open
          defaultOpen={false}
          message="This removes the cached source."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
    );
    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toBeVisible();
  });

  it("reports escape as the cancel reason", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <PanelRoot>
        <InlineConfirm
          open
          message="This removes the cached source."
          onCancel={onCancel}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
    );

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledWith("escape");
  });

  it("advertises the Escape shortcut and styles the cancel action", () => {
    render(
      <PanelRoot>
        <InlineConfirm
          open
          cancelVariant="ghost"
          message="This removes the cached source."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toHaveAttribute("aria-keyshortcuts", "Escape");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
      "snui-button--ghost",
    );
  });

  it("focuses the requested element on open instead of the container", () => {
    const initialFocusRef = createRef<HTMLButtonElement>();
    render(
      <PanelRoot>
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
        />
      </PanelRoot>,
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
    const { rerender } = render(
      <PanelRoot>
        <button ref={returnFocusRef} type="button">
          Source settings
        </button>
        <InlineConfirm {...props} open />
      </PanelRoot>,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toHaveFocus();

    rerender(
      <PanelRoot>
        <button ref={returnFocusRef} type="button">
          Source settings
        </button>
        <InlineConfirm {...props} open={false} />
      </PanelRoot>,
    );

    expect(returnFocusRef.current).toHaveFocus();
  });

  it("scrolls the confirmation into view smoothly by default", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    stubMatchMedia(false);

    render(
      <PanelRoot>
        <InlineConfirm
          open
          message="This removes the cached source."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
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

    render(
      <PanelRoot>
        <InlineConfirm
          open
          message="This removes the cached source."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      behavior: "auto",
    });
  });

  it("drops the region landmark and its naming when landmark is false", () => {
    const { container } = render(
      <PanelRoot>
        <InlineConfirm
          open
          landmark={false}
          title="Reset configuration?"
          message="This removes the cached source."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
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
    const { container } = render(
      <PanelRoot>
        <Section title="Connection" landmark={false}>
          Content
        </Section>
      </PanelRoot>,
    );

    expect(screen.queryByRole("region")).toBeNull();
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByRole("heading", { name: "Connection" })).toBeVisible();
  });

  it("drops consumer label references when landmark is false", () => {
    const { container } = render(
      <PanelRoot>
        <span id="consumer-context">Provider configuration</span>
        <Section
          aria-labelledby="consumer-context"
          title="Connection"
          landmark={false}
        >
          Content
        </Section>
      </PanelRoot>,
    );

    expect(screen.queryByRole("region")).toBeNull();
    expect(container.querySelector("section")).not.toHaveAttribute(
      "aria-labelledby",
    );
  });
});
