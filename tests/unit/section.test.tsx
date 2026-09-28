import { renderHook, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Accordion } from "../../src/composites.js";
import {
  Button,
  CollapsibleSection,
  InlineConfirm,
  Section,
} from "../../src/index.js";
import { AlertDialog, Dialog, Popover } from "../../src/overlays.js";
import { COLLAPSIBLE_STYLES } from "../../src/styles/collapsible.js";
import { COMPONENT_STYLES } from "../../src/styles/components.js";
import { NARROW_PANEL_QUERY } from "../../src/styles/fragments.js";
import type { HeadingLevel } from "../../src/utils/heading.js";
import {
  HeadingLevelProvider,
  type ResolvedHeading,
  SectionOutlineReset,
  useContentHeading,
  useResolvedHeading,
} from "../../src/utils/heading-level.js";
import { ruleBody } from "../css-helpers.js";
import { follows, renderInPanel } from "../helpers.js";

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

describe("section landmarks by context", () => {
  it("keeps a top-level section a landmark and a nested one out of the list", () => {
    renderInPanel(
      <Section title="Detected paths">
        <Section title="navigation.speedOverGround">Row</Section>
        <CollapsibleSection title="Tune settings for environment.depth">
          Row
        </CollapsibleSection>
      </Section>,
    );

    // One region for the list; a region per nested row would bury the
    // sections that matter among the host's own landmarks.
    expect(screen.getAllByRole("region")).toHaveLength(1);
    expect(
      screen.getByRole("region", { name: "Detected paths" }),
    ).toBeInTheDocument();
    // The nested sections keep their headings, which is how a reader moves
    // between them.
    expect(
      screen.getByRole("heading", { name: "navigation.speedOverGround" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Tune settings for environment.depth",
      }),
    ).toBeInTheDocument();
  });

  it("keeps an embedded collapsible section out of the landmark list", () => {
    const { container } = renderInPanel(
      <CollapsibleSection title="Chart source" variant="embedded">
        Content
      </CollapsibleSection>,
    );

    expect(screen.queryByRole("region")).toBeNull();
    expect(container.querySelector("section")).not.toHaveAttribute(
      "aria-labelledby",
    );
  });

  it("lets an explicit landmark decide either way", () => {
    renderInPanel(
      <>
        <Section title="Sources" landmark={false}>
          Content
        </Section>
        <Section title="Providers">
          <Section title="Primary provider" landmark>
            Content
          </Section>
        </Section>
        <CollapsibleSection title="Chart source" variant="embedded" landmark>
          Content
        </CollapsibleSection>
      </>,
    );

    expect(
      screen.getAllByRole("region").map((region) => region.textContent),
    ).toHaveLength(3);
    expect(
      screen.getByRole("region", { name: "Primary provider" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Chart source" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Sources" })).toBeNull();
  });

  it("counts only enclosing sections that are landmarks", () => {
    renderInPanel(
      <Section title="Layout" landmark={false}>
        <Section title="Sources">Content</Section>
      </Section>,
    );

    // Nothing named encloses it, so it is the landmark for its content.
    expect(screen.getByRole("region", { name: "Sources" })).toBeInTheDocument();
  });

  it("remembers a landmark above a section that is not one", () => {
    renderInPanel(
      <Section title="Paths">
        <CollapsibleSection title="Engine" variant="embedded">
          <Section title="Coolant">Content</Section>
        </CollapsibleSection>
      </Section>,
    );

    expect(screen.getAllByRole("region")).toHaveLength(1);
  });

  it("counts an open confirmation as an enclosing region", () => {
    renderInPanel(
      <InlineConfirm
        open
        title="Replace the chart set?"
        confirmLabel="Replace chart set"
        message={<Section title="Charts to remove">Three charts</Section>}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("region")).toHaveLength(1);
    expect(
      screen.getByRole("region", { name: "Replace the chart set?" }),
    ).toBeInTheDocument();
  });

  it("keeps an accordion's sections out of the list", () => {
    renderInPanel(
      <Accordion>
        <CollapsibleSection title="Charts">Content</CollapsibleSection>
        <CollapsibleSection title="Routes">Content</CollapsibleSection>
      </Accordion>,
    );

    expect(screen.queryByRole("region")).toBeNull();
  });
});

describe("section outline across overlays", () => {
  it("starts a fresh outline inside a reset, as an overlay's content does", () => {
    renderInPanel(
      <Section title="Outer">
        <SectionOutlineReset>
          <Section title="Inside dialog">Content</Section>
          <InlineConfirm
            open
            title="Remove it?"
            confirmLabel="Remove path"
            message="This removes the path."
            onCancel={vi.fn()}
            onConfirm={vi.fn()}
          />
        </SectionOutlineReset>
      </Section>,
    );

    // A portaled overlay is not inside the section it was opened from, so
    // its sections are landmarks and its confirmations take the shell level.
    expect(
      screen.getByRole("region", { name: "Inside dialog" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Remove it?" }).tagName).toBe(
      "H2",
    );
  });

  it("gives a dialog opened inside a section an outline of its own", () => {
    renderInPanel(
      <Section title="Outer">
        <Dialog open title="Edit path" onOpenChange={vi.fn()}>
          <Section title="Inside dialog">Content</Section>
          <InlineConfirm
            open
            title="Remove it?"
            confirmLabel="Remove path"
            message="This removes the path."
            onCancel={vi.fn()}
            onConfirm={vi.fn()}
          />
        </Dialog>
      </Section>,
    );

    const dialog = screen.getByRole("dialog", { name: "Edit path" });
    expect(
      within(dialog).getByRole("region", { name: "Inside dialog" }),
    ).toBeInTheDocument();
    // Below the dialog's own title rather than below the section it was
    // opened from, so the outline under the dialog skips no level.
    const title = within(dialog).getByRole("heading", { name: "Edit path" });
    const confirmation = within(dialog).getByRole("heading", {
      name: "Remove it?",
    });
    expect(Number(confirmation.tagName.slice(1))).toBe(
      Number(title.tagName.slice(1)) + 1,
    );
  });
});

describe("sections inside dialogs", () => {
  /** The level a heading inside `scope` sits at. */
  function levelIn(scope: HTMLElement, name: string): number {
    return Number(
      within(scope).getByRole("heading", { name }).tagName.slice(1),
    );
  }

  const removeConfirm = (
    <InlineConfirm
      open
      title="Remove it?"
      confirmLabel="Remove path"
      message="This removes the path."
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />
  );

  it("nests a section under the dialog title, and a confirmation under the section", () => {
    renderInPanel(
      <Dialog open title="Edit path" onOpenChange={vi.fn()}>
        <Section title="Source">{removeConfirm}</Section>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Edit path" });
    expect(levelIn(dialog, "Edit path")).toBe(2);
    expect(levelIn(dialog, "Source")).toBe(3);
    expect(levelIn(dialog, "Remove it?")).toBe(4);
    // The dialog title heads the dialog the way a shell title heads the
    // panel, so its first sections are top sections and take the larger step.
    expect(within(dialog).getByRole("heading", { name: "Source" })).toHaveClass(
      "snui-section__title--top",
    );
  });

  it("nests the sections of an alert dialog the same way", () => {
    renderInPanel(
      <AlertDialog open title="Discard route?" cancelLabel="Keep route">
        <CollapsibleSection title="Waypoints" defaultOpen>
          {removeConfirm}
        </CollapsibleSection>
      </AlertDialog>,
    );

    const dialog = screen.getByRole("alertdialog", { name: "Discard route?" });
    expect(levelIn(dialog, "Discard route?")).toBe(2);
    expect(levelIn(dialog, "Waypoints")).toBe(3);
    expect(levelIn(dialog, "Remove it?")).toBe(4);
  });

  it("follows a dialog title level the consumer names", () => {
    renderInPanel(
      <Dialog open title="Edit path" headingLevel={3} onOpenChange={vi.fn()}>
        <Section title="Source">Content</Section>
        <Section title="Named" headingLevel={5}>
          Content
        </Section>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Edit path" });
    expect(levelIn(dialog, "Source")).toBe(4);
    // An explicit level still decides.
    expect(levelIn(dialog, "Named")).toBe(5);
  });

  it("leaves sections outside dialogs and inside popovers at the shell level", () => {
    renderInPanel(
      <>
        <Section title="Outside">Content</Section>
        <Popover trigger={<Button>Details</Button>} defaultOpen>
          <Section title="In popover">Content</Section>
        </Popover>
      </>,
    );

    // The open popover hides the rest of the panel from the tree.
    expect(
      screen.getByRole("heading", { name: "Outside", hidden: true }).tagName,
    ).toBe("H2");
    expect(screen.getByRole("heading", { name: "In popover" }).tagName).toBe(
      "H2",
    );
  });
});

describe("headings inside sections", () => {
  /** The level a heading element sits at. */
  function levelOf(name: string): number {
    const heading = screen.getByRole("heading", { name });
    return Number(heading.tagName.slice(1));
  }

  const confirm = (title: string, headingLevel?: 2 | 3 | 4 | 5 | 6) => (
    <InlineConfirm
      open
      title={title}
      confirmLabel="Delete route"
      message="This removes the route."
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      {...(headingLevel === undefined ? {} : { headingLevel })}
    />
  );

  it("heads a confirmation at level 2 outside any section", () => {
    renderInPanel(confirm("Delete the route?"));

    expect(levelOf("Delete the route?")).toBe(2);
  });

  it("nests a confirmation below the section that contains it", () => {
    renderInPanel(
      <>
        <Section title="Routes">{confirm("Delete the route?")}</Section>
        <Section title="Waypoints" headingLevel={4}>
          {confirm("Delete the waypoint?")}
        </Section>
        <CollapsibleSection title="Tracks" defaultOpen>
          {confirm("Delete the track?")}
        </CollapsibleSection>
      </>,
    );

    expect(levelOf("Delete the route?")).toBe(3);
    expect(levelOf("Delete the waypoint?")).toBe(5);
    expect(levelOf("Delete the track?")).toBe(3);
  });

  it("stops a derived confirmation level at 6", () => {
    renderInPanel(
      <Section title="Deep" headingLevel={6}>
        {confirm("Delete the note?")}
      </Section>,
    );

    expect(levelOf("Delete the note?")).toBe(6);
  });

  it("lets an explicit confirmation level decide", () => {
    renderInPanel(
      <Section title="Routes">{confirm("Delete the route?", 5)}</Section>,
    );

    expect(levelOf("Delete the route?")).toBe(5);
  });

  it("keeps a nested section at the level its consumer names", () => {
    renderInPanel(
      <Section title="Routes">
        <Section title="Active route">Content</Section>
      </Section>,
    );

    // Sibling sections are not necessarily one inside the other, so nesting
    // past the shell stays the consumer's to name.
    expect(levelOf("Routes")).toBe(2);
    expect(levelOf("Active route")).toBe(2);
  });
});

describe("heading depth", () => {
  /** Resolves a heading inside a shell that hands its sections `base`. */
  function resolveIn(
    base: HeadingLevel,
    resolve: () => ResolvedHeading,
  ): ResolvedHeading {
    const { result } = renderHook(resolve, {
      wrapper: ({ children }) => (
        <HeadingLevelProvider value={base}>{children}</HeadingLevelProvider>
      ),
    });
    return result.current;
  }

  it("measures depth from the level the shell gives its top sections", () => {
    expect(resolveIn(3, () => useResolvedHeading()).depth).toBe(0);
    expect(resolveIn(3, () => useResolvedHeading(4)).depth).toBe(1);
    expect(resolveIn(2, () => useResolvedHeading(4)).depth).toBe(2);
    // A level above the shell's still reads as a top section.
    expect(resolveIn(3, () => useResolvedHeading(2)).depth).toBe(0);
  });

  it("gives a confirmation outside any section the shell level", () => {
    const heading = resolveIn(3, () => useContentHeading());
    expect(heading.level).toBe(3);
    expect(heading.Heading).toBe("h3");
    expect(heading.depth).toBe(0);
  });
});

describe("section leading content", () => {
  it("places leading content before the heading, outside its name", () => {
    const { container } = renderInPanel(
      <Section
        title="Weather sensors"
        description="Running"
        leading={<svg aria-hidden="true" data-testid="glyph" />}
      >
        Content
      </Section>,
    );

    const heading = screen.getByRole("heading", { name: "Weather sensors" });
    const leading = container.querySelector(".snui-section__leading");
    if (leading === null) throw new Error("expected a leading slot");
    expect(leading).toContainElement(screen.getByTestId("glyph"));
    expect(follows(leading, heading)).toBe(true);
    expect(heading.parentElement).toHaveClass("snui-section__title-row");
    expect(leading.parentElement).toBe(heading.parentElement);
    expect(
      screen.getByRole("region", { name: "Weather sensors" }),
    ).toBeInTheDocument();
    // The description still reads under the title line.
    expect(
      container.querySelector(".snui-section__heading-group")?.lastElementChild,
    ).toHaveTextContent("Running");
  });

  it("keeps interactive leading content its own control", () => {
    renderInPanel(
      <Section
        title="Chart source"
        leading={<input type="checkbox" aria-label="Enable chart source" />}
      >
        Content
      </Section>,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Enable chart source",
    });
    expect(
      screen.getByRole("heading", { name: "Chart source" }).contains(checkbox),
    ).toBe(false);
  });

  it("adds no title row without leading content", () => {
    const { container } = renderInPanel(
      <Section title="Connection" leading={null}>
        Content
      </Section>,
    );

    expect(container.querySelector(".snui-section__title-row")).toBeNull();
    expect(
      container.querySelector(".snui-section__heading-group")
        ?.firstElementChild,
    ).toBe(screen.getByRole("heading", { name: "Connection" }));
  });
});

describe("section shells share one surface", () => {
  const SHELLS = ".snui-section,\n.snui-collapsible";
  /**
   * The rule that sets the shared inset to `space`, for both shells, found by
   * what it declares rather than by how its selector list is spelled.
   */
  function insetRule(css: string, space: 2 | 3 | 4): RegExpExecArray {
    const pattern = new RegExp(
      `([^{}]*)\\{\\s*--snui-section-inset: var\\(--snui-space-${String(space)}\\);\\s*\\}`,
      "g",
    );
    for (const match of css.matchAll(pattern)) {
      const selector = match[1] ?? "";
      if (
        selector.includes(".snui-section") &&
        selector.includes(".snui-collapsible")
      ) {
        return match;
      }
    }
    throw new Error(`no shared inset rule for space-${String(space)}`);
  }

  it("paints Section and CollapsibleSection from one surface rule", () => {
    const surface = ruleBody(COMPONENT_STYLES, SHELLS);
    for (const declaration of [
      // A container outline, so the subtle border: the controls inside keep
      // the 3:1 boundary.
      "border: 1px solid var(--snui-color-border-subtle);",
      "border-radius: var(--snui-radius-lg);",
      "background: var(--snui-color-surface);",
      "box-shadow: var(--snui-shadow-raised);",
    ]) {
      expect(surface).toContain(declaration);
    }
    // One rule sets the inset for both shells.
    expect(insetRule(COMPONENT_STYLES, 4)).toBeDefined();
    // Neither shell restates a radius or a shadow of its own.
    expect(ruleBody(COMPONENT_STYLES, ".snui-section")).not.toMatch(
      /border-radius|box-shadow/,
    );
    expect(COLLAPSIBLE_STYLES).not.toContain(".snui-collapsible {");
  });

  it("insets both shells' content from one inline edge", () => {
    expect(ruleBody(COMPONENT_STYLES, ".snui-section")).toContain(
      "padding: var(--snui-section-inset);",
    );
    expect(ruleBody(COMPONENT_STYLES, ".snui-section--compact")).toContain(
      "--snui-section-inset: var(--snui-space-2);",
    );
    expect(
      ruleBody(COLLAPSIBLE_STYLES, ".snui-collapsible__content"),
    ).toContain("padding-inline: var(--snui-section-inset);");
    expect(
      ruleBody(COLLAPSIBLE_STYLES, ".snui-collapsible__summary--below"),
    ).toContain("padding-inline: var(--snui-section-inset);");
    // The toggle pads its own hit area, so the header stops short of the
    // edge by that much and the chevron lands on the shared edge.
    const header = ruleBody(COLLAPSIBLE_STYLES, ".snui-collapsible__header");
    expect(header).toContain(
      "padding-inline-start: calc(var(--snui-section-inset) - var(--snui-space-1));",
    );
    // Nothing pads the actions at the end, so the header keeps the full
    // inset there and the actions line up with the content below.
    expect(header).toContain("padding-inline-end: var(--snui-section-inset);");
    // A narrow panel tightens the shells and the action bar together.
    const narrow = ruleBody(COMPONENT_STYLES, NARROW_PANEL_QUERY);
    expect(insetRule(narrow, 3)).toBeDefined();
  });

  it("keeps a compact section at its own inset in a narrow panel", () => {
    // Written after the shared rule at both levels, so the compact step wins
    // there and is not loosened to the narrow one on the narrowest panels.
    expect(
      COMPONENT_STYLES.indexOf("\n.snui-section--compact {"),
    ).toBeGreaterThan(insetRule(COMPONENT_STYLES, 4).index);
    const narrow = ruleBody(COMPONENT_STYLES, NARROW_PANEL_QUERY);
    expect(narrow.indexOf(".snui-section--compact {")).toBeGreaterThan(
      insetRule(narrow, 3).index,
    );
    expect(ruleBody(narrow, ".snui-section--compact")).toContain(
      "--snui-section-inset: var(--snui-space-2);",
    );
  });

  it("stretches a button with a drawn reason in a narrow action bar", () => {
    const narrow = ruleBody(COMPONENT_STYLES, NARROW_PANEL_QUERY);
    // The wrapper that draws a blocked reason is the row's child, not the
    // button, so the stretch rule names both.
    expect(
      ruleBody(
        narrow,
        ".snui-action-bar__actions > :is(.snui-button, .snui-button-reason)",
      ),
    ).toContain("flex: 1 1 auto;");
    expect(
      ruleBody(narrow, ".snui-action-bar__actions > .snui-button-reason"),
    ).toContain("align-items: stretch;");
  });

  it("wraps a long unbroken status rather than widening the action bar", () => {
    // The status slot takes any content, and a bare string brings no
    // wrapping rule of its own, so one unbroken word scrolled a 320 px page
    // sideways. A StatusIndicator in the slot already wraps on its own.
    const status = ruleBody(COMPONENT_STYLES, ".snui-action-bar__status");
    expect(status).toContain("min-width: 0;");
    expect(status).toContain("max-width: 100%;");
    expect(status).toContain("overflow-wrap: anywhere;");
  });

  it("gives both titles one weight", () => {
    // Anchored at a line start: the title row's child rule ends with the
    // same selector.
    expect(ruleBody(COMPONENT_STYLES, "\n.snui-section__title")).toContain(
      "font-weight: var(--snui-font-weight-bold);",
    );
    expect(ruleBody(COLLAPSIBLE_STYLES, ".snui-collapsible__toggle")).toContain(
      "font-weight: var(--snui-font-weight-bold);",
    );
  });

  it("rules off collapsible content and the action bar with the subtle border", () => {
    expect(
      ruleBody(COLLAPSIBLE_STYLES, ".snui-collapsible__content"),
    ).toContain(
      "border-block-start: 1px solid var(--snui-color-border-subtle);",
    );
    // The bar's own rule, after the shared inset rule that also names it.
    expect(ruleBody(COMPONENT_STYLES, "\n\n.snui-action-bar")).toContain(
      "border: 1px solid var(--snui-color-border-subtle);",
    );
  });

  it("leaves the embedded variant without chrome", () => {
    const embedded = ruleBody(
      COLLAPSIBLE_STYLES,
      ".snui-collapsible--embedded",
    );
    expect(embedded).toContain("border: 0;");
    expect(embedded).toContain("box-shadow: none;");
  });
});

describe("title sizes by depth", () => {
  it("sizes a top section's title up, wherever the shell puts the top", () => {
    const { container } = renderInPanel(
      <>
        <Section title="Connection">Content</Section>
        <CollapsibleSection title="Provider status">Content</CollapsibleSection>
        <HeadingLevelProvider value={3}>
          <Section title="Under a titled shell">Content</Section>
          <CollapsibleSection title="Also under it">Content</CollapsibleSection>
        </HeadingLevelProvider>
      </>,
    );

    // Level 2 outside a shell and level 3 under a titled one are both the
    // first level below the shell's own title.
    const titles = container.querySelectorAll(
      ".snui-section__title, .snui-collapsible__heading",
    );
    expect([...titles].map((title) => title.tagName)).toEqual([
      "H2",
      "H2",
      "H3",
      "H3",
    ]);
    for (const title of titles) {
      expect(title.className).toMatch(/__(title|heading)--top\b/);
    }
  });

  it("keeps a deeper section's title at the body size", () => {
    const { container } = renderInPanel(
      <HeadingLevelProvider value={3}>
        <Section title="Nested" headingLevel={4}>
          Content
        </Section>
        <CollapsibleSection title="Nested too" headingLevel={4}>
          Content
        </CollapsibleSection>
      </HeadingLevelProvider>,
    );

    expect(container.querySelector(".snui-section__title--top")).toBeNull();
    expect(
      container.querySelector(".snui-collapsible__heading--top"),
    ).toBeNull();
  });

  it("sizes by depth in the stylesheet, not by the heading tag", () => {
    expect(COMPONENT_STYLES).not.toContain("h2.snui-section__title");
    expect(COLLAPSIBLE_STYLES).not.toContain("heading--level-");
    expect(
      ruleBody(
        COLLAPSIBLE_STYLES,
        ".snui-section__title--top,\n.snui-collapsible__heading--top",
      ),
    ).toContain("font-size: var(--snui-font-size-lg);");
  });
});

describe("Section naming and layout", () => {
  it("labels sections by their heading", () => {
    renderInPanel(
      <Section title="Connection" description="Server connection settings">
        Content
      </Section>,
    );

    expect(screen.getByRole("region", { name: "Connection" })).toBeVisible();
  });

  it("merges consumer and generated section label references", () => {
    renderInPanel(
      <>
        <span id="consumer-section-context">Provider configuration</span>
        <Section aria-labelledby="consumer-section-context" title="Connection">
          Content
        </Section>
      </>,
    );

    expect(
      screen.getByRole("region", {
        name: "Provider configuration Connection",
      }),
    ).toHaveAttribute(
      "aria-labelledby",
      expect.stringMatching(/^consumer-section-context .+$/),
    );
  });

  it("does not require a section description", () => {
    renderInPanel(<Section title="Status">Ready</Section>);

    expect(screen.getByRole("region", { name: "Status" })).toHaveTextContent(
      "Ready",
    );
  });

  it("supports an explicit section heading level", () => {
    renderInPanel(
      <Section title="Nested settings" headingLevel={3}>
        Ready
      </Section>,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Nested settings" }),
    ).toBeVisible();
  });

  it("renders section descriptions in a block-safe container", () => {
    const { container } = renderInPanel(
      <Section
        title="Status"
        description={<div data-testid="nested-block">Ready</div>}
      >
        Content
      </Section>,
    );

    expect(screen.getByTestId("nested-block")).toBeVisible();
    expect(container.querySelector(".snui-section__description")?.tagName).toBe(
      "DIV",
    );
  });

  it("groups multiple section actions in their own layout wrapper", () => {
    const { container } = renderInPanel(
      <Section
        title="Sources"
        actions={
          <>
            <Button>Add</Button>
            <Button>Refresh</Button>
          </>
        }
      >
        Ready
      </Section>,
    );

    const actions = container.querySelector(".snui-section__actions");
    expect(actions).not.toBeNull();
    expect(within(actions as HTMLElement).getAllByRole("button")).toHaveLength(
      2,
    );
  });

  it("tightens a compact section and leaves the default step unmarked", () => {
    const { container } = renderInPanel(
      <>
        <Section title="Compact" density="compact">
          Ready
        </Section>
        <Section title="Default">Ready</Section>
      </>,
    );

    const [compact, standard] = container.querySelectorAll(".snui-section");
    expect(compact).toHaveClass("snui-section--compact");
    expect(standard?.className).not.toMatch(/snui-section--/);
  });
});
