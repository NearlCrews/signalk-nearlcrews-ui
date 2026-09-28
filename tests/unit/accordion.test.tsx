import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Accordion } from "../../src/composites.js";
import { CollapsibleSection } from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

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
    ).toThrow(
      "signalk-nearlcrews-ui: Accordion accepts only CollapsibleSection children; received",
    );
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

  it("keeps every section shut for an explicit null defaultOpenIndex", () => {
    const sections = (defaultOpenIndex: number | null | undefined) => (
      <Accordion defaultOpenIndex={defaultOpenIndex}>
        <CollapsibleSection title="First">First content</CollapsibleSection>
        <CollapsibleSection title="Second" defaultOpen>
          Second content
        </CollapsibleSection>
      </Accordion>
    );

    const shut = renderInPanel(sections(null));
    for (const name of ["First", "Second"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    }
    shut.unmount();

    // Only an absent index falls back to the child that opens by default.
    renderInPanel(sections(undefined));
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute(
      "aria-expanded",
      "true",
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

describe("Accordion landmarks", () => {
  it("defaults its sections to no landmark and lets one opt back in", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(
      <Accordion ref={ref} data-testid="accordion">
        <CollapsibleSection title="First">First content</CollapsibleSection>
        <CollapsibleSection title="Second" landmark>
          Second content
        </CollapsibleSection>
      </Accordion>,
    );

    const regions = screen.getAllByRole("region");
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveAccessibleName("Second");
    expect(ref.current).toBe(screen.getByTestId("accordion"));
  });
});
