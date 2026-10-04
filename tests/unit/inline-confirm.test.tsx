import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, Fragment, type RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, InlineConfirm, PanelRoot } from "../../src/index.js";
import { COMPONENT_STYLES } from "../../src/styles/components.js";
import { ruleBody } from "../css-helpers.js";
import { panel, renderInPanel } from "../helpers.js";
import { withFrameDocument } from "./lib/frame-document.js";

/** The confirmation most cases ask, where the case varies something else. */
const ROUTE_CONFIRM = {
  confirmLabel: "Delete route",
  message: "This removes the route.",
} as const;

// This block runs first on purpose: the generic-confirmation warning is
// reported once per module, so a later test would find it already spent.
// The order inside the block matters for the same reason: the case that
// expects silence runs before the case that spends the warning.
describe("InlineConfirm destructive labeling", () => {
  it("says nothing about a confirmation that names its consequence", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <InlineConfirm
        open
        confirmLabel="Delete route"
        message="This removes the cached source."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(warn).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Delete route" }),
    ).toBeInTheDocument();
  });

  it("reports a destructive confirmation that names no consequence", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <InlineConfirm
        open
        message="This removes the cached source."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('labeled "Confirm"'),
    );
  });
});

describe("InlineConfirm confirm action", () => {
  it("paints the confirm action with the requested variant", () => {
    const { rerender } = renderInPanel(
      <InlineConfirm
        open
        confirmLabel="Apply settings"
        confirmVariant="primary"
        message="This applies the pending changes."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Apply settings" })).toHaveClass(
      "snui-button--primary",
    );

    rerender(
      panel(
        <InlineConfirm
          open
          {...ROUTE_CONFIRM}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      ),
    );
    expect(screen.getByRole("button", { name: "Delete route" })).toHaveClass(
      "snui-button--danger",
    );
  });
});

describe("InlineConfirm keyboard guards", () => {
  it("leaves every key but Escape to the content inside it", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderInPanel(
      <InlineConfirm
        defaultOpen
        {...ROUTE_CONFIRM}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    await user.keyboard("{Enter}");
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("region")).toBeVisible();
  });

  it("stands aside when the consumer handled Escape itself", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderInPanel(
      <InlineConfirm
        defaultOpen
        {...ROUTE_CONFIRM}
        onCancel={onCancel}
        onConfirm={vi.fn()}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.preventDefault();
        }}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("region")).toBeVisible();
  });
});

describe("InlineConfirm open state", () => {
  it("reports every close through onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { unmount } = renderInPanel(
      <InlineConfirm
        defaultOpen
        {...ROUTE_CONFIRM}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("region")).toBeNull();
    unmount();

    onOpenChange.mockClear();
    renderInPanel(
      <InlineConfirm
        defaultOpen
        {...ROUTE_CONFIRM}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete route" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("leaves a controlled region open and reports the close it asked for", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInPanel(
      <InlineConfirm
        open
        busy
        {...ROUTE_CONFIRM}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    // busy blocks Confirm through aria-disabled, so the region stays where
    // the user is standing and Cancel is still the way out.
    expect(
      screen.getByRole("button", { name: "Delete route" }),
    ).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("region")).toBeVisible();
  });
});

function stubMatchMedia(matches: boolean): void {
  // Only `matches` and `media` are consumed by the component under test.
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({ matches, media: query }) as MediaQueryList,
  );
}

describe("inline confirmation upgrades", () => {
  afterEach(() => {
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
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

  it("moves focus once when the first stop arrives as a new ref object", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const details = createRef<HTMLButtonElement>();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const confirmation = (
      initialFocusRef: RefObject<HTMLElement | null>,
    ): React.JSX.Element => (
      <InlineConfirm
        open
        initialFocusRef={initialFocusRef}
        message={
          <button ref={details} type="button">
            Review details
          </button>
        }
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
    const { rerender } = renderInPanel(confirmation(details));
    expect(details.current).toHaveFocus();

    const cancel = screen.getByRole("button", { name: "Cancel" });
    cancel.focus();

    // A caller that builds the ref inline hands over a new object on every
    // render. The region is already open, so the user's place inside it holds.
    rerender(panel(confirmation({ current: details.current })));

    expect(cancel).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledOnce();
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

/** The props every confirmation requires, with fresh handlers per call. */
function confirmationProps() {
  return {
    message: "Resetting.",
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  } as const;
}

describe("buttons and confirmation", () => {
  it("focuses cancel in an inline confirmation and restores focus", async () => {
    const user = userEvent.setup();
    const props = {
      ...confirmationProps(),
      message: "This removes the cached source.",
    };
    const deletion = (open: boolean): React.JSX.Element => (
      <>
        <Button>Delete source</Button>
        <InlineConfirm {...props} open={open} />
      </>
    );
    const { rerender } = renderInPanel(deletion(false));

    const trigger = screen.getByRole("button", { name: "Delete source" });
    await user.click(trigger);

    rerender(panel(deletion(true)));

    const confirmation = screen.getByRole("region", {
      name: "Confirm action",
    });
    // Focus lands on the described container so the message is conveyed on
    // open, rather than on Cancel, which would announce only the button.
    expect(confirmation).toHaveFocus();
    expect(confirmation).toHaveAccessibleName("Confirm action");
    expect(confirmation).toHaveAccessibleDescription(
      "This removes the cached source.",
    );

    await user.keyboard("{Escape}");
    expect(props.onCancel).toHaveBeenCalledOnce();

    rerender(panel(deletion(false)));

    expect(screen.getByRole("button", { name: "Delete source" })).toHaveFocus();
  });

  it("focuses the confirmation container when it opens busy", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    const { rerender } = renderInPanel(
      <>
        <Button>Start reset</Button>
        <InlineConfirm {...props} open={false} />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Start reset" }));
    rerender(
      panel(
        <>
          <Button>Start reset</Button>
          <InlineConfirm {...props} open busy title={null} />
        </>,
      ),
    );

    const confirmation = screen.getByRole("region", {
      name: "Confirm action",
    });
    expect(confirmation).toHaveFocus();
    expect(confirmation).toHaveAttribute("aria-busy", "true");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    // Busy blocks the decision, never the route out of it.
    expect(cancel).not.toHaveAttribute("aria-disabled");
    expect(cancel).toBeEnabled();
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("does not steal focus when busy changes after focus leaves", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    const { rerender } = renderInPanel(
      <>
        <Button>Outside action</Button>
        <InlineConfirm {...props} open />
      </>,
    );

    const outsideAction = screen.getByRole("button", {
      name: "Outside action",
    });
    await user.click(outsideAction);
    expect(outsideAction).toHaveFocus();

    rerender(
      panel(
        <>
          <Button>Outside action</Button>
          <InlineConfirm {...props} open busy />
        </>,
      ),
    );

    expect(outsideAction).toHaveFocus();
  });

  it("leaves focus in place when dismissed after focus moved away", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    const { rerender } = renderInPanel(
      <>
        <Button>Outside action</Button>
        <InlineConfirm {...props} open />
      </>,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toHaveFocus();
    const outsideAction = screen.getByRole("button", {
      name: "Outside action",
    });
    await user.click(outsideAction);
    expect(outsideAction).toHaveFocus();

    rerender(
      panel(
        <>
          <Button>Outside action</Button>
          <InlineConfirm {...props} open={false} />
        </>,
      ),
    );

    expect(outsideAction).toHaveFocus();
  });

  it("keeps an internal action focused when it becomes busy", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    const { rerender } = renderInPanel(<InlineConfirm {...props} open />);

    const cancel = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancel);
    expect(cancel).toHaveFocus();

    rerender(panel(<InlineConfirm {...props} open busy />));

    // Busy blocks Confirm through aria-disabled, so that control stays in the
    // tab order and focus is never destroyed and chased. Cancel stays live.
    expect(cancel).toHaveFocus();
    expect(cancel).not.toHaveAttribute("aria-disabled");
    expect(cancel).toBeEnabled();
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("keeps the way out of a busy confirmation open", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    renderInPanel(<InlineConfirm {...props} open busy />);

    // Confirm is the only action busy blocks; the decision has not been made
    // twice, so pressing it again must do nothing.
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(props.onConfirm).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(props.onCancel).toHaveBeenCalledExactlyOnceWith("escape");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onCancel).toHaveBeenCalledTimes(2);
    expect(props.onCancel).toHaveBeenLastCalledWith("cancel");
  });

  it("focuses the confirmation inside its own document realm", () => {
    withFrameDocument((ownerDocument) => {
      const container = ownerDocument.createElement("div");
      ownerDocument.body.append(container);
      const props = confirmationProps();
      const { unmount } = render(
        <PanelRoot>
          <InlineConfirm {...props} open />
        </PanelRoot>,
        { container },
      );

      try {
        const confirmation = within(container).getByRole("region", {
          name: "Confirm action",
        });
        // Focus resolves through the rendered node's owner document, not the
        // top-level one, so a panel inside an iframe still manages its own
        // focus.
        expect(ownerDocument.activeElement).toBe(confirmation);
        expect(document.activeElement).not.toBe(confirmation);
      } finally {
        unmount();
      }
    });
  });

  it("falls back to a named confirmation for an empty fragment title", () => {
    renderInPanel(
      <InlineConfirm
        open
        title={<Fragment key="empty-title" />}
        message="Confirm this action."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Confirm action" }),
    ).toBeVisible();
  });

  it("accepts localized confirmation labels, native attributes, and a ref", () => {
    const ref = createRef<HTMLElement>();
    // The fallback title is panel wording, so it comes from the bundle; each
    // confirmation passes only the question it is asking as its own title.
    const labels = { inlineConfirm: { fallbackTitle: "Confirmer l’action" } };
    const confirmationProps = {
      cancelLabel: "Annuler",
      confirmLabel: "Confirmer",
      message: "Cette action est permanente.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    } as const;
    const { rerender } = renderInPanel(
      <>
        <InlineConfirm
          {...confirmationProps}
          open
          ref={ref}
          data-testid="localized-confirmation"
          aria-labelledby="confirmation-context"
          aria-describedby="confirmation-guidance"
        />
        <span id="confirmation-context">Safety check</span>
        <span id="confirmation-guidance">Review before continuing.</span>
      </>,
      { labels },
    );

    expect(ref.current).toBe(screen.getByTestId("localized-confirmation"));
    expect(
      screen.getByRole("region", {
        name: "Safety check Confirmer l’action",
      }),
    ).toBeVisible();
    expect(ref.current).toHaveAccessibleDescription(
      "Review before continuing. Cette action est permanente.",
    );
    expect(screen.getByRole("button", { name: "Annuler" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeVisible();

    rerender(
      panel(<InlineConfirm {...confirmationProps} open={false} ref={ref} />, {
        labels,
      }),
    );
    expect(ref.current).toBeNull();
  });

  it("supports an explicit confirmation heading level", () => {
    renderInPanel(
      <InlineConfirm
        open
        headingLevel={4}
        title="Remove source?"
        message="Confirm this action."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 4, name: "Remove source?" }),
    ).toBeVisible();
  });
});

describe("InlineConfirm keyboard semantics", () => {
  it("does not advertise Escape as a shortcut that activates the region", () => {
    renderInPanel(
      <InlineConfirm
        open
        message="Remove this source?"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).not.toHaveAttribute("aria-keyshortcuts");
  });
});

describe("InlineConfirm title leading", () => {
  it("pins the title's line height, whatever level the outline derives", () => {
    // The foundation reset leads h1 and h2 tighter than h3 to h6, and the
    // title's level now follows the section around it, so the rule pins the
    // leading the way the section title does.
    expect(ruleBody(COMPONENT_STYLES, ".snui-inline-confirm__title")).toContain(
      "line-height: 1.3;",
    );
  });
});
