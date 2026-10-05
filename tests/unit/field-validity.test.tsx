import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactElement, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  type FieldValidity,
  type FieldValidityHandlers,
  useFieldValidity,
} from "../../src/hooks/use-field-validity.js";
import {
  DraftResetScope,
  useResetDrafts,
} from "../../src/hooks/use-reset-drafts.js";
import { CollapsibleSection, NumberField } from "../../src/index.js";
import { loggedMessages, renderInPanel } from "../helpers.js";
import { withFrameDocument } from "./lib/frame-document.js";

describe("useFieldValidity", () => {
  /** Whether a Map dropped a key, which is how the hook forgets a name. */
  function forgot(deleted: { mock: { calls: unknown[][] } }, name: string) {
    return deleted.mock.calls.some(([key]) => key === name);
  }

  async function flushMicrotasks(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
    });
  }

  /**
   * A control of the panel's own that spreads the handlers, keeping the
   * callback off the element.
   */
  function RawInput({
    onValidityChange,
    ...props
  }: FieldValidityHandlers & {
    readonly "aria-label": string;
  }): ReactElement {
    return <input {...props} />;
  }

  /** A registered whole-number field, the fixture most cases render. */
  function RegisteredField({
    label = "Refresh interval",
    max,
    ...handlers
  }: FieldValidityHandlers & {
    readonly label?: string;
    readonly max?: number;
  }): ReactElement {
    return (
      <NumberField
        {...handlers}
        label={label}
        min={1}
        max={max}
        integer
        defaultValue={10}
      />
    );
  }

  function Panel(): ReactElement {
    const validity = useFieldValidity();
    const [mounted, setMounted] = useState(true);
    return (
      <>
        {mounted ? (
          <RegisteredField {...validity.register("interval")} max={60} />
        ) : null}
        <button type="button" onClick={() => setMounted((on) => !on)}>
          Toggle
        </button>
        <output data-testid="invalid">
          {[...validity.invalidFields].join(",")}
        </output>
        <output data-testid="valid">{String(validity.valid)}</output>
      </>
    );
  }

  it("collects invalid fields and releases one that leaves the tree", async () => {
    const user = userEvent.setup();
    renderInPanel(<Panel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    expect(screen.getByTestId("valid")).toHaveTextContent("true");

    await user.clear(input);
    expect(screen.getByTestId("invalid")).toHaveTextContent("interval");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");

    // A field nobody can see must not go on blocking a save.
    await user.click(screen.getByRole("button", { name: "Toggle" }));
    expect(screen.getByTestId("invalid")).toBeEmptyDOMElement();
    expect(screen.getByTestId("valid")).toHaveTextContent("true");
  });

  it("starts a field mounted again under the same name as valid", async () => {
    const user = userEvent.setup();
    renderInPanel(<Panel />);

    await user.clear(
      screen.getByRole("spinbutton", { name: "Refresh interval" }),
    );
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    const toggle = screen.getByRole("button", { name: "Toggle" });
    await user.click(toggle);
    await user.click(toggle);
    // A new field holds a new, valid draft, whatever the old one reported.
    expect(screen.getByTestId("valid")).toHaveTextContent("true");
  });

  it("forgets a field that left the tree, so its name registers afresh", async () => {
    const user = userEvent.setup();
    const seen: FieldValidityHandlers[] = [];
    function Rows(): ReactElement {
      const validity = useFieldValidity();
      const [mounted, setMounted] = useState(true);
      const handlers = validity.register("row-1");
      seen.push(handlers);
      return (
        <>
          {mounted ? <RegisteredField {...handlers} label="Row one" /> : null}
          <button type="button" onClick={() => setMounted((on) => !on)}>
            Toggle
          </button>
        </>
      );
    }
    renderInPanel(<Rows />);

    const first = seen.at(-1);
    await user.click(screen.getByRole("button", { name: "Toggle" }));
    // Nothing holds the removed field once its node has left the document.
    await flushMicrotasks();
    await user.click(screen.getByRole("button", { name: "Toggle" }));
    expect(seen.at(-1)).not.toBe(first);
  });

  it("keeps a hidden field's handlers, which a retaining section reveals again", async () => {
    const user = userEvent.setup();
    const seen: FieldValidityHandlers[] = [];
    function Hidden(): ReactElement {
      const validity = useFieldValidity();
      const handlers = validity.register("interval");
      seen.push(handlers);
      return (
        <CollapsibleSection title="Timing" defaultOpen>
          <RegisteredField {...handlers} />
        </CollapsibleSection>
      );
    }
    renderInPanel(<Hidden />);

    const first = seen.at(-1);
    const toggle = screen.getByRole("button", { name: "Timing" });
    await user.click(toggle);
    await flushMicrotasks();
    await user.click(toggle);
    // A hidden node stays in the document, so the field is not forgotten.
    expect(new Set(seen)).toEqual(new Set([first]));
  });

  it("forgets a field its owner removes while a retaining section hides it, at that commit", async () => {
    const user = userEvent.setup();
    function Rows(): ReactElement {
      const validity = useFieldValidity();
      const [alpha, setAlpha] = useState(true);
      // The React keys never equal a field name, so a dropped key can only be
      // the hook forgetting the field.
      return (
        <>
          {alpha ? (
            <CollapsibleSection key="k-alpha" title="Alpha" defaultOpen>
              <RegisteredField
                {...validity.register("field-alpha")}
                label="Alpha interval"
              />
            </CollapsibleSection>
          ) : null}
          <CollapsibleSection key="k-beta" title="Beta" defaultOpen>
            <RegisteredField
              {...validity.register("field-beta")}
              label="Beta interval"
            />
          </CollapsibleSection>
          <button type="button" onClick={() => setAlpha(false)}>
            Remove alpha
          </button>
        </>
      );
    }
    renderInPanel(<Rows />);

    await user.click(screen.getByRole("button", { name: "Alpha" }));
    await flushMicrotasks();
    const deleted = vi.spyOn(Map.prototype, "delete");
    // Removed while hidden: React runs no second ref cleanup for a subtree
    // it already hid, so the owner's commit is where the hook notices.
    await user.click(screen.getByRole("button", { name: "Remove alpha" }));
    expect(forgot(deleted, "field-alpha")).toBe(true);
    expect(forgot(deleted, "field-beta")).toBe(false);
  });

  it("registers a name afresh when a field removed while hidden left without its owner rendering", async () => {
    const user = userEvent.setup();
    const seen: FieldValidityHandlers[] = [];
    function Section({
      handlers,
    }: {
      readonly handlers: FieldValidityHandlers;
    }): ReactElement {
      const [present, setPresent] = useState(true);
      return (
        <>
          {present ? (
            <CollapsibleSection title="Timing" defaultOpen>
              <RegisteredField {...handlers} />
            </CollapsibleSection>
          ) : null}
          <button type="button" onClick={() => setPresent(false)}>
            Remove section
          </button>
        </>
      );
    }
    function Owner(): ReactElement {
      const validity = useFieldValidity();
      const [renders, setRenders] = useState(0);
      const handlers = validity.register("interval");
      seen.push(handlers);
      return (
        <>
          <Section handlers={handlers} />
          <button type="button" onClick={() => setRenders(renders + 1)}>
            Render owner
          </button>
        </>
      );
    }
    renderInPanel(<Owner />);

    const first = seen.at(-1);
    await user.click(screen.getByRole("button", { name: "Timing" }));
    await flushMicrotasks();
    // The section leaves through its own state, so the owner does not commit.
    await user.click(screen.getByRole("button", { name: "Remove section" }));
    await flushMicrotasks();
    await user.click(screen.getByRole("button", { name: "Render owner" }));
    // The owner's next registration of the name finds its field gone.
    expect(seen.at(-1)).not.toBe(first);
  });

  it("forgets a visible field that leaves without its owner rendering, once the commit lands", async () => {
    const user = userEvent.setup();
    function Row({
      handlers,
    }: {
      readonly handlers: FieldValidityHandlers;
    }): ReactElement {
      const [present, setPresent] = useState(true);
      return (
        <>
          {present ? (
            <RegisteredField {...handlers} label="Row interval" />
          ) : null}
          <button type="button" onClick={() => setPresent(false)}>
            Remove row
          </button>
        </>
      );
    }
    function Owner(): ReactElement {
      const validity = useFieldValidity();
      return <Row handlers={validity.register("field-row")} />;
    }
    renderInPanel(<Owner />);

    const deleted = vi.spyOn(Map.prototype, "delete");
    // A valid field leaves: the owner's validity set does not change, so the
    // owner does not commit, and the ref cleanup is the only route.
    await user.click(screen.getByRole("button", { name: "Remove row" }));
    await flushMicrotasks();
    expect(forgot(deleted, "field-row")).toBe(true);
  });

  it("forgets a row a child registered and removed while hidden, when the next row registers", async () => {
    const user = userEvent.setup();
    function List({
      validity,
    }: {
      readonly validity: FieldValidity;
    }): ReactElement {
      const [rows, setRows] = useState<readonly number[]>([]);
      // Ids are never reused, so a name never registers twice.
      const [next, setNext] = useState(1);
      // The rows register in this child's render, so adding or removing one
      // commits no render of the component that owns the validity. The React
      // keys never equal a field name.
      return (
        <>
          {rows.map((id) => (
            <CollapsibleSection
              key={`k${String(id)}`}
              title={`Section ${String(id)}`}
              defaultOpen
            >
              <RegisteredField
                {...validity.register(`row-${String(id)}`)}
                label={`Row ${String(id)}`}
              />
            </CollapsibleSection>
          ))}
          <button
            type="button"
            onClick={() => {
              setRows([...rows, next]);
              setNext(next + 1);
            }}
          >
            Add row
          </button>
          <button type="button" onClick={() => setRows(rows.slice(0, -1))}>
            Remove last row
          </button>
        </>
      );
    }
    function Owner(): ReactElement {
      return <List validity={useFieldValidity()} />;
    }
    renderInPanel(<Owner />);

    await user.click(screen.getByRole("button", { name: "Add row" }));
    await user.click(screen.getByRole("button", { name: "Section 1" }));
    await flushMicrotasks();
    await user.click(screen.getByRole("button", { name: "Remove last row" }));
    await flushMicrotasks();
    const deleted = vi.spyOn(Map.prototype, "delete");
    await user.click(screen.getByRole("button", { name: "Add row" }));
    expect(screen.getByRole("spinbutton", { name: "Row 2" })).toBeVisible();
    // Neither the owner's commit nor the same name ever comes, so a new
    // name's registration is where the removed row is noticed.
    expect(forgot(deleted, "row-1")).toBe(true);
  });

  it("releases a field while a retaining section hides it, and restores it on reveal", async () => {
    const user = userEvent.setup();
    function SectionPanel(): ReactElement {
      const validity = useFieldValidity();
      return (
        <>
          <CollapsibleSection title="Timing" defaultOpen>
            <RegisteredField {...validity.register("interval")} max={60} />
          </CollapsibleSection>
          <output data-testid="valid">{String(validity.valid)}</output>
        </>
      );
    }
    renderInPanel(<SectionPanel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.type(input, "99");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");

    const toggle = screen.getByRole("button", { name: "Timing" });
    await user.click(toggle);
    // Out of sight, the field no longer blocks a save.
    expect(screen.getByTestId("valid")).toHaveTextContent("true");

    await user.click(toggle);
    // Back on screen with its error, it blocks again.
    expect(input).toHaveValue(99);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
  });

  it("joins a field that reports without a ref, and focuses a control registered directly", async () => {
    const user = userEvent.setup();
    let found: HTMLElement | null = null;
    function Direct(): ReactElement {
      const validity = useFieldValidity();
      const callbackOnly = validity.register("callback");
      const direct = validity.register("direct");
      return (
        <>
          <RawInput aria-label="Direct" {...direct} />
          <button
            type="button"
            onClick={() => {
              callbackOnly.onValidityChange(false);
              direct.onValidityChange(false);
            }}
          >
            Break
          </button>
          <button
            type="button"
            onClick={() => {
              found = validity.firstInvalid();
            }}
          >
            Find
          </button>
          <output data-testid="invalid">
            {[...validity.invalidFields].join(",")}
          </output>
        </>
      );
    }
    renderInPanel(<Direct />);

    await user.click(screen.getByRole("button", { name: "Break" }));
    expect(screen.getByTestId("invalid")).toHaveTextContent("callback,direct");
    await user.click(screen.getByRole("button", { name: "Find" }));
    // A field with no node has nothing to focus; the registered input is the
    // control itself.
    expect(found).toBe(screen.getByRole("textbox", { name: "Direct" }));
  });

  it("finds a field rendered into a second window", () => {
    const found = vi.fn<(target: HTMLElement | null) => void>();
    function Framed(): ReactElement {
      const validity = useFieldValidity();
      const field = validity.register("framed");
      return (
        <>
          <RawInput aria-label="Framed" {...field} />
          <button
            type="button"
            onClick={() => {
              field.onValidityChange(false);
            }}
          >
            Break
          </button>
          <button
            type="button"
            onClick={() => {
              found(validity.firstInvalid());
            }}
          >
            Find
          </button>
        </>
      );
    }

    withFrameDocument((frameDocument) => {
      const host = frameDocument.createElement("div");
      frameDocument.body.append(host);
      const { unmount } = render(<Framed />, { container: host });
      try {
        const [breakButton, findButton] = host.querySelectorAll("button");
        act(() => {
          breakButton?.click();
        });
        act(() => {
          findButton?.click();
        });
        // The frame's own element type, not the top window's, recognizes it.
        expect(found).toHaveBeenLastCalledWith(host.querySelector("input"));
      } finally {
        unmount();
      }
    });
  });

  it("finds the first invalid field in document order", async () => {
    const user = userEvent.setup();
    let found: HTMLElement | null = null;
    function Ordered(): ReactElement {
      const validity = useFieldValidity();
      const [early, setEarly] = useState(false);
      return (
        <>
          {early ? (
            <RegisteredField {...validity.register("early")} label="Early" />
          ) : null}
          <RegisteredField {...validity.register("late")} label="Late" />
          <button type="button" onClick={() => setEarly(true)}>
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              found = validity.firstInvalid();
            }}
          >
            Find
          </button>
        </>
      );
    }
    renderInPanel(<Ordered />);

    const find = screen.getByRole("button", { name: "Find" });
    await user.click(find);
    expect(found).toBeNull();

    // The later field registers first and goes invalid first; the one
    // inserted above it still comes first on the page.
    await user.clear(screen.getByRole("spinbutton", { name: "Late" }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.clear(screen.getByRole("spinbutton", { name: "Early" }));
    await user.click(find);
    expect(found).toBe(screen.getByRole("spinbutton", { name: "Early" }));

    await user.type(screen.getByRole("spinbutton", { name: "Early" }), "4");
    await user.click(find);
    expect(found).toBe(screen.getByRole("spinbutton", { name: "Late" }));
  });
});

describe("useResetDrafts", () => {
  function ResettablePanel({
    onValidityChange,
  }: {
    readonly onValidityChange?: (valid: boolean) => void;
  }): ReactElement {
    const reset = useResetDrafts();
    return (
      <>
        <CollapsibleSection title="Timing" defaultOpen>
          <NumberField
            label="Refresh interval"
            min={1}
            max={60}
            integer
            value={10}
            onValidityChange={onValidityChange}
          />
        </CollapsibleSection>
        <button type="button" onClick={reset}>
          Discard
        </button>
      </>
    );
  }

  it("drops every draft, an invalid one included, and reports it valid", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    // PanelRoot publishes the reset, so a panel needs nothing more.
    renderInPanel(<ResettablePanel onValidityChange={onValidityChange} />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.tab();
    expect(input).toHaveAttribute("aria-invalid", "true");

    // Discard restores the value the draft was typed against, which alone
    // would change nothing the draft is keyed on.
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(input).toHaveValue(10);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(onValidityChange.mock.calls).toEqual([[false], [true]]);

    // The next edit starts from the committed value.
    await user.type(input, "0");
    expect(input).toHaveValue(100);
  });

  it("leaves the panel that calls the reset alone, rendering only the fields", async () => {
    const user = userEvent.setup();
    const panelRender = vi.fn();
    function CountingPanel(): ReactElement {
      panelRender();
      const reset = useResetDrafts();
      return (
        <>
          <NumberField label="Refresh interval" min={1} integer value={10} />
          <button type="button" onClick={reset}>
            Discard
          </button>
        </>
      );
    }
    renderInPanel(<CountingPanel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    const before = panelRender.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(input).toHaveValue(10);
    expect(panelRender).toHaveBeenCalledTimes(before);
  });

  it("reports a field in a collapsed section valid while it is hidden", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    renderInPanel(
      <DraftResetScope>
        <ResettablePanel onValidityChange={onValidityChange} />
      </DraftResetScope>,
    );

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.type(input, "99");
    const toggle = screen.getByRole("button", { name: "Timing" });
    await user.click(toggle);
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Discard" }));
    // Heard at once, although the hidden section runs no effects.
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    const reports = onValidityChange.mock.calls.length;

    await user.click(toggle);
    expect(input).toHaveValue(10);
    expect(input).not.toHaveAttribute("aria-invalid");
    // The reveal repeats nothing.
    expect(onValidityChange).toHaveBeenCalledTimes(reports);
  });

  it("clears a hidden field's useFieldValidity entry, so the reveal blocks nothing", async () => {
    const user = userEvent.setup();
    function ValidatedPanel(): ReactElement {
      const validity = useFieldValidity();
      const reset = useResetDrafts();
      return (
        <>
          <CollapsibleSection title="Timing" defaultOpen>
            <NumberField
              {...validity.register("interval")}
              label="Refresh interval"
              min={1}
              max={60}
              integer
              value={10}
            />
          </CollapsibleSection>
          <button type="button" onClick={reset}>
            Discard
          </button>
          <output data-testid="valid">{String(validity.valid)}</output>
        </>
      );
    }
    renderInPanel(<ValidatedPanel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.type(input, "99");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");

    const toggle = screen.getByRole("button", { name: "Timing" });
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: "Discard" }));
    await user.click(toggle);

    // The reset reached the hidden field, so the reveal restores nothing.
    expect(input).toHaveValue(10);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.getByTestId("valid")).toHaveTextContent("true");

    // A fresh invalid edit still blocks.
    await user.clear(input);
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
  });

  it("says once in development that it has no panel to reset", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<ResettablePanel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    const discard = screen.getByRole("button", { name: "Discard" });
    await user.click(discard);
    await user.click(discard);
    expect(input).toHaveValue(null);
    // The field still edits normally without a scope to report to: a valid
    // keystroke commits, and the panel's fixed value shows again.
    await user.type(input, "5");
    expect(input).toHaveValue(10);
    expect(loggedMessages(warn)).toEqual([
      "useResetDrafts found no PanelRoot or PanelShell above it, so the reset did nothing. Render the panel inside one, or pass each field a resetKey that the Discard action changes.",
    ]);
  });
});
