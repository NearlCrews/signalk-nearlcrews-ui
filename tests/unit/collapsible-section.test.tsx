import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useEffect, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button, CollapsibleSection, TextInput } from "../../src/index.js";
import { COLLAPSIBLE_STYLES } from "../../src/styles/collapsible.js";
import { NARROW_PANEL_QUERY } from "../../src/styles/fragments.js";
import { ruleBody } from "../css-helpers.js";
import { controlledBy, follows, panel, renderInPanel } from "../helpers.js";

describe("CollapsibleSection uncontrolled toggle", () => {
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
    ).toThrow("signalk-nearlcrews-ui: CollapsibleSection idPrefix");
  });
});

describe("CollapsibleSection open state and mount strategies", () => {
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

  it("supports controlled collapsible sections and unmounted content", async () => {
    const user = userEvent.setup();

    function Fixture(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <>
          <span id="consumer-section-label">Provider status</span>
          <CollapsibleSection
            aria-labelledby="consumer-section-label"
            title="Advanced provider settings"
            summary="3 checks healthy"
            summaryPlacement="header"
            actions={<Button>Refresh</Button>}
            headingLevel={3}
            mountStrategy="unmount"
            open={open}
            onOpenChange={setOpen}
          >
            <TextInput aria-label="Advanced value" />
          </CollapsibleSection>
        </>
      );
    }

    renderInPanel(<Fixture />);
    const toggle = screen.getByRole("button", {
      name: "Advanced provider settings",
    });
    const region = screen.getByRole("region", {
      name: "Provider status Advanced provider settings",
    });
    expect(region).toHaveAttribute(
      "aria-labelledby",
      expect.stringMatching(/^consumer-section-label .+-title$/),
    );
    expect(
      region
        .querySelector(".snui-collapsible__header")
        ?.contains(screen.getByText("3 checks healthy")),
    ).toBe(true);
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Advanced provider settings",
      }),
    ).toBeVisible();
    expect(screen.getByText("3 checks healthy")).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "Advanced value" }),
    ).toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("textbox", { name: "Advanced value" }),
    ).toBeVisible();
    expect(screen.queryByText("3 checks healthy")).toBeNull();
  });

  it("restores disclosure focus when controlled content closes", () => {
    function Fixture(): React.JSX.Element {
      const [open, setOpen] = useState(true);
      return (
        <>
          <Button onClick={() => setOpen(false)}>Close externally</Button>
          <CollapsibleSection
            title="Connection details"
            open={open}
            onOpenChange={setOpen}
            mountStrategy="unmount"
          >
            <TextInput aria-label="Focused setting" />
          </CollapsibleSection>
        </>
      );
    }

    renderInPanel(<Fixture />);
    const input = screen.getByRole("textbox", { name: "Focused setting" });
    input.focus();
    expect(input).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close externally" }), {
      detail: 0,
    });
    expect(
      screen.getByRole("button", { name: "Connection details" }),
    ).toHaveFocus();
  });

  it("lazily mounts collapsible content and retains its state", async () => {
    const user = userEvent.setup();
    const { container } = renderInPanel(
      <CollapsibleSection title="Advanced settings" mountStrategy="lazy-retain">
        <TextInput aria-label="Provider token" />
      </CollapsibleSection>,
    );

    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    expect(
      container.querySelector('input[aria-label="Provider token"]'),
    ).toBeNull();

    await user.click(toggle);
    const input = screen.getByRole("textbox", { name: "Provider token" });
    expect(input).toBeVisible();
    await user.type(input, "retained value");
    await user.click(toggle);

    const retainedInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="Provider token"]',
    );
    expect(retainedInput).not.toBeNull();
    expect(retainedInput).not.toBeVisible();
    expect(retainedInput).toHaveValue("retained value");
  });

  it("pauses retained collapsible content effects while collapsed", async () => {
    const user = userEvent.setup();
    const effectSpy = vi.fn();
    const cleanupSpy = vi.fn();

    function Probe(): React.JSX.Element {
      useEffect(() => {
        effectSpy();
        return cleanupSpy;
      }, []);
      return <span>Probe content</span>;
    }

    renderInPanel(
      <CollapsibleSection title="Sensor details" mountStrategy="retain">
        <Probe />
      </CollapsibleSection>,
    );

    const toggle = screen.getByRole("button", { name: "Sensor details" });
    expect(controlledBy(toggle)).not.toBeNull();
    expect(effectSpy).not.toHaveBeenCalled();

    await user.click(toggle);
    expect(effectSpy).toHaveBeenCalledTimes(1);
    expect(cleanupSpy).not.toHaveBeenCalled();

    await user.click(toggle);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(effectSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Probe content")).not.toBeVisible();
    expect(controlledBy(toggle)).not.toBeNull();

    await user.click(toggle);
    expect(effectSpy).toHaveBeenCalledTimes(2);
  });
});

describe("CollapsibleSection landmark, leading slot, and variant", () => {
  it("drops the region landmark when asked and keeps the heading", () => {
    renderInPanel(
      <CollapsibleSection title="Advanced" landmark={false}>
        Content
      </CollapsibleSection>,
    );

    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.getByRole("heading", { name: "Advanced" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("renders the leading slot before the heading outside the toggle", () => {
    const { container } = renderInPanel(
      <CollapsibleSection
        title="Chart source"
        leading={<input type="checkbox" aria-label="Enable chart source" />}
      >
        Content
      </CollapsibleSection>,
    );

    const leading = container.querySelector(
      ".snui-collapsible__header .snui-collapsible__leading",
    );
    const heading = container.querySelector(
      ".snui-collapsible__header .snui-collapsible__heading",
    );
    if (leading === null || heading === null) {
      throw new Error("The header rendered no leading slot or heading.");
    }
    expect(follows(leading, heading)).toBe(true);
    const checkbox = screen.getByRole("checkbox", {
      name: "Enable chart source",
    });
    expect(
      screen.getByRole("button", { name: "Chart source" }).contains(checkbox),
    ).toBe(false);
  });

  it("marks the embedded variant and renders the heading level", () => {
    const ref = createRef<HTMLElement>();
    const { container } = renderInPanel(
      <CollapsibleSection
        ref={ref}
        title="Nested"
        variant="embedded"
        headingLevel={3}
      >
        Content
      </CollapsibleSection>,
    );

    const section = container.querySelector(".snui-collapsible");
    expect(section).toHaveClass("snui-collapsible--embedded");
    const heading = section?.querySelector(".snui-collapsible__heading");
    expect(heading?.tagName).toBe("H3");
    // One level below the shell's top sections, so the title takes the body
    // size rather than the top one.
    expect(heading).not.toHaveClass("snui-collapsible__heading--top");
    expect(ref.current).toBe(section);
  });
});

describe("CollapsibleSection narrow rows and wrapped titles", () => {
  it("indents the narrow rows by the same lengths the title's edge is made of", () => {
    // The chevron box used to be 1em at the heading size while the rows'
    // 1em was the body size, and the formula assumed the toggle gap. Both
    // now read the same tokens: the toggle padding, the chevron box, and the
    // toggle gap.
    expect(
      ruleBody(COLLAPSIBLE_STYLES, ".snui-collapsible__chevron"),
    ).toContain("inline-size: var(--snui-font-size-lg);");
    const narrow = ruleBody(COLLAPSIBLE_STYLES, NARROW_PANEL_QUERY);
    expect(ruleBody(narrow, ".snui-collapsible__trailing")).toContain(
      "padding-inline-start: calc(var(--snui-space-1) + var(--snui-font-size-lg) + var(--snui-space-2));",
    );
  });

  it("keeps the header summary and actions in one indented row that wraps inside itself", () => {
    // Each carried its own indent, which also counted when the actions shared
    // the summary's line, so a Refresh that fitted beside the badge wrapped
    // onto a row of its own. One row takes the indent once, and every line it
    // wraps onto starts on the title's text edge.
    const narrow = ruleBody(COLLAPSIBLE_STYLES, NARROW_PANEL_QUERY);
    const row = ruleBody(narrow, ".snui-collapsible__trailing");
    expect(row).toContain("display: flex;");
    expect(row).toContain("flex: 1 1 100%;");
    expect(row).toContain("flex-wrap: wrap;");
    expect(row).toContain("justify-content: space-between;");
    expect(row).toContain("gap: var(--snui-space-2);");
    expect(narrow).not.toContain(".snui-collapsible__summary--header {");
    expect(narrow).not.toContain(".snui-collapsible__actions {");
    // Wide, the row adds no box, so the summary and actions stay items of
    // the header row beside the heading, as they were.
    expect(
      ruleBody(COLLAPSIBLE_STYLES, "\n.snui-collapsible__trailing"),
    ).toContain("display: contents;");
  });

  it("renders the row only around a header summary or actions", () => {
    const { container, rerender } = renderInPanel(
      <CollapsibleSection
        title="Provider status"
        summary="3 checks healthy"
        summaryPlacement="header"
        actions={<Button>Refresh</Button>}
      >
        Content
      </CollapsibleSection>,
    );
    const row = container.querySelector(
      ".snui-collapsible__header > .snui-collapsible__trailing",
    );
    expect([...(row?.children ?? [])].map((child) => child.className)).toEqual([
      "snui-collapsible__summary snui-collapsible__summary--header",
      "snui-collapsible__actions",
    ]);

    // A summary below the header leaves the actions alone in the row.
    rerender(
      panel(
        <CollapsibleSection
          title="Provider status"
          summary="3 checks healthy"
          actions={<Button>Refresh</Button>}
        >
          Content
        </CollapsibleSection>,
      ),
    );
    expect(
      container.querySelector(
        ".snui-collapsible__trailing > .snui-collapsible__actions",
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        ".snui-collapsible__trailing .snui-collapsible__summary",
      ),
    ).toBeNull();

    // With neither, no empty row starts a line of its own under the heading.
    rerender(
      panel(
        <CollapsibleSection title="Provider status" summary="3 checks healthy">
          Content
        </CollapsibleSection>,
      ),
    );
    expect(container.querySelector(".snui-collapsible__trailing")).toBeNull();
  });

  it("indents a toned section's narrow row past the tone glyph as well", () => {
    // The toned title starts after the glyph's slot and a second toggle gap,
    // so the plain indent stopped under the glyph, short of the text.
    const narrow = ruleBody(COLLAPSIBLE_STYLES, NARROW_PANEL_QUERY);
    expect(
      ruleBody(
        narrow,
        ".snui-collapsible__header:has(> .snui-collapsible__heading .snui-collapsible__tone) > .snui-collapsible__trailing",
      ),
    ).toContain(
      "padding-inline-start: calc(calc(var(--snui-space-1) + var(--snui-font-size-lg) + var(--snui-space-2)) + calc(1.5 * var(--snui-font-size-xs)) + var(--snui-space-2));",
    );
  });

  it("centers the tone glyph on the title's first line", () => {
    // On the toggle's baseline the glyph centered on its own small text,
    // below the middle of a large title. Its slot is one title line tall at
    // the top of the toggle, with the glyph centered in it, so it stays on
    // the first line of a wrapped title too. The slot's width holds the
    // glyph and the space after it, the length the narrow indent adds.
    const slot = ruleBody(COLLAPSIBLE_STYLES, ".snui-collapsible__tone");
    expect(slot).toContain("display: flex;");
    expect(slot).toContain("flex: none;");
    expect(slot).toContain("align-self: flex-start;");
    expect(slot).toContain("align-items: center;");
    expect(slot).toContain(
      "inline-size: calc(1.5 * var(--snui-font-size-xs));",
    );
    expect(slot).toContain("block-size: 1lh;");
    expect(COLLAPSIBLE_STYLES).not.toContain(".snui-collapsible__tone-glyph {");

    const { container } = renderInPanel(
      <>
        <CollapsibleSection title="Engine" tone="warning">
          Content
        </CollapsibleSection>
        <CollapsibleSection title="Battery">Content</CollapsibleSection>
      </>,
    );
    const [toned, plain] = container.querySelectorAll(".snui-collapsible");
    expect(
      toned?.querySelector(
        ".snui-collapsible__toggle > .snui-collapsible__tone > .snui-tone-glyph--warning",
      ),
    ).not.toBeNull();
    expect(plain?.querySelector(".snui-collapsible__tone")).toBeNull();
  });

  it("keeps the chevron on the first line of a wrapped title", () => {
    // Centered on the whole title block, the chevron sat between the two
    // lines of a wrapped title. On the baseline it stays on the first, and
    // the block padding centers a one-line title in the control as before.
    const toggle = ruleBody(COLLAPSIBLE_STYLES, ".snui-collapsible__toggle");
    expect(toggle).toContain("align-items: baseline;");
    expect(toggle).toContain(
      "padding-block: max(var(--snui-space-1), calc((var(--snui-control-min-height) - 1lh) / 2));",
    );
    expect(toggle).toContain("padding-inline: var(--snui-space-1);");
  });
});

describe("CollapsibleSection chevron direction", () => {
  it("keeps the chevron glyph left to right, so only the stylesheet mirrors it", () => {
    // U+203A is bidi mirrored: on a right-to-left line the browser already
    // draws it pointing left, and the right-to-left flip then turned it back
    // and pointed the open chevron up. Isolated left to right, the glyph
    // always points right and the flips alone decide its direction.
    const chevron = ruleBody(COLLAPSIBLE_STYLES, ".snui-collapsible__chevron");
    expect(chevron).toContain("direction: ltr;");
    expect(chevron).toContain("unicode-bidi: isolate;");
  });
});
