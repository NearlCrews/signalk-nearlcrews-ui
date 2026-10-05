import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, Fragment, type ReactElement, type RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, InlineConfirm, PanelRoot } from "../../src/index.js";
import { COMPONENT_STYLES } from "../../src/styles/components.js";
import { ruleBody } from "../css-helpers.js";
import { panel, renderInPanel, stubReducedMotion } from "../helpers.js";
import { withFrameDocument } from "./lib/frame-document.js";

/** The props every confirmation requires, with fresh handlers per call. */
function confirmationProps() {
  return {
    message: "This removes the cached source.",
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  } as const;
}

/** The confirmation most cases ask, where the case varies something else. */
const ROUTE_CONFIRM = {
  confirmLabel: "Delete route",
  message: "This removes the route.",
} as const;

/** A confirmation with a button before it, for a case that moves focus between the two. */
function beside(label: string, confirmation: ReactElement): React.JSX.Element {
  return (
    <>
      <Button>{label}</Button>
      {confirmation}
    </>
  );
}

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
        {...confirmationProps()}
      />,
    );

    expect(warn).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Delete route" }),
    ).toBeInTheDocument();
  });

  it("reports a destructive confirmation that names no consequence", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(<InlineConfirm open {...confirmationProps()} />);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('labeled "Confirm"'),
    );
  });
});

describe("InlineConfirm action variants", () => {
  it("paints the confirm action with the requested variant", () => {
    const { rerender } = renderInPanel(
      <InlineConfirm
        open
        {...confirmationProps()}
        confirmLabel="Apply settings"
        confirmVariant="primary"
        message="This applies the pending changes."
      />,
    );

    expect(screen.getByRole("button", { name: "Apply settings" })).toHaveClass(
      "snui-button--primary",
    );

    rerender(
      panel(<InlineConfirm open {...confirmationProps()} {...ROUTE_CONFIRM} />),
    );
    expect(screen.getByRole("button", { name: "Delete route" })).toHaveClass(
      "snui-button--danger",
    );
  });

  it("styles the cancel action with the requested variant", () => {
    renderInPanel(
      <InlineConfirm open cancelVariant="ghost" {...confirmationProps()} />,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
      "snui-button--ghost",
    );
  });
});

describe("InlineConfirm keyboard guards", () => {
  it("leaves every key but Escape to the content inside it", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    renderInPanel(<InlineConfirm defaultOpen {...props} {...ROUTE_CONFIRM} />);

    await user.keyboard("{Enter}");
    expect(props.onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("region")).toBeVisible();
  });

  it("stands aside when the consumer handled Escape itself", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    renderInPanel(
      <InlineConfirm
        defaultOpen
        {...props}
        {...ROUTE_CONFIRM}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.preventDefault();
        }}
      />,
    );

    await user.keyboard("{Escape}");
    expect(props.onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("region")).toBeVisible();
  });

  it("reports escape as the cancel reason", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    renderInPanel(<InlineConfirm open {...props} />);

    await user.keyboard("{Escape}");
    expect(props.onCancel).toHaveBeenCalledWith("escape");
  });
});

describe("InlineConfirm open state", () => {
  it("reports every close through onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const confirmation = (): React.JSX.Element => (
      <InlineConfirm
        defaultOpen
        {...confirmationProps()}
        {...ROUTE_CONFIRM}
        onOpenChange={onOpenChange}
      />
    );
    const { unmount } = renderInPanel(confirmation());

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("region")).toBeNull();
    unmount();

    onOpenChange.mockClear();
    renderInPanel(confirmation());
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
        {...confirmationProps()}
        {...ROUTE_CONFIRM}
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

  it("supports uncontrolled use through defaultOpen and closes on cancel", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    renderInPanel(<InlineConfirm defaultOpen {...props} />);

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onCancel).toHaveBeenCalledWith("cancel");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("closes an uncontrolled confirmation on confirm", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    renderInPanel(<InlineConfirm defaultOpen {...props} />);

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(props.onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("keeps open controlled when provided alongside defaultOpen", () => {
    const { rerender } = renderInPanel(
      <InlineConfirm open={false} defaultOpen {...confirmationProps()} />,
    );
    expect(screen.queryByRole("region")).toBeNull();

    rerender(
      panel(
        <InlineConfirm open defaultOpen={false} {...confirmationProps()} />,
      ),
    );
    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toBeVisible();
  });
});

describe("InlineConfirm scroll and focus destinations", () => {
  afterEach(() => {
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it("focuses the requested element on open instead of the container", () => {
    const initialFocusRef = createRef<HTMLButtonElement>();
    renderInPanel(
      <InlineConfirm
        open
        {...confirmationProps()}
        initialFocusRef={initialFocusRef}
        message={
          <button ref={initialFocusRef} type="button">
            Review details
          </button>
        }
      />,
    );

    expect(initialFocusRef.current).toHaveFocus();
  });

  it("moves focus once when the first stop arrives as a new ref object", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const details = createRef<HTMLButtonElement>();
    const props = confirmationProps();
    const confirmation = (
      initialFocusRef: RefObject<HTMLElement | null>,
    ): React.JSX.Element => (
      <InlineConfirm
        open
        {...props}
        initialFocusRef={initialFocusRef}
        message={
          <button ref={details} type="button">
            Review details
          </button>
        }
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
    const props = { ...confirmationProps(), returnFocusRef };
    const settings = (open: boolean): React.JSX.Element => (
      <>
        <button ref={returnFocusRef} type="button">
          Source settings
        </button>
        <InlineConfirm {...props} open={open} />
      </>
    );
    const { rerender } = renderInPanel(settings(true));

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toHaveFocus();

    rerender(panel(settings(false)));

    expect(returnFocusRef.current).toHaveFocus();
  });

  it.each([
    [false, "smooth"],
    [true, "auto"],
  ] as const)(
    "scrolls into view with reduced motion %s as %s",
    (reduced, behavior) => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      stubReducedMotion(reduced);

      renderInPanel(<InlineConfirm open {...confirmationProps()} />);

      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "nearest",
        behavior,
      });
    },
  );
});

describe("InlineConfirm focus, busy state, and naming", () => {
  it("focuses cancel in an inline confirmation and restores focus", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    const deletion = (open: boolean): React.JSX.Element =>
      beside("Delete source", <InlineConfirm {...props} open={open} />);
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
      beside("Start reset", <InlineConfirm {...props} open={false} />),
    );

    await user.click(screen.getByRole("button", { name: "Start reset" }));
    rerender(
      panel(
        beside(
          "Start reset",
          <InlineConfirm {...props} open busy title={null} />,
        ),
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
      beside("Outside action", <InlineConfirm {...props} open />),
    );

    const outsideAction = screen.getByRole("button", {
      name: "Outside action",
    });
    await user.click(outsideAction);
    expect(outsideAction).toHaveFocus();

    rerender(
      panel(beside("Outside action", <InlineConfirm {...props} open busy />)),
    );

    expect(outsideAction).toHaveFocus();
  });

  it("leaves focus in place when dismissed after focus moved away", async () => {
    const user = userEvent.setup();
    const props = confirmationProps();
    const { rerender } = renderInPanel(
      beside("Outside action", <InlineConfirm {...props} open />),
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
        beside("Outside action", <InlineConfirm {...props} open={false} />),
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
        {...confirmationProps()}
        title={<Fragment key="empty-title" />}
        message="Confirm this action."
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
    const localized = {
      ...confirmationProps(),
      cancelLabel: "Annuler",
      confirmLabel: "Confirmer",
      message: "Cette action est permanente.",
    } as const;
    const { rerender } = renderInPanel(
      <>
        <InlineConfirm
          {...localized}
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
      panel(<InlineConfirm {...localized} open={false} ref={ref} />, {
        labels,
      }),
    );
    expect(ref.current).toBeNull();
  });

  it("supports an explicit confirmation heading level", () => {
    renderInPanel(
      <InlineConfirm
        open
        {...confirmationProps()}
        headingLevel={4}
        title="Remove source?"
        message="Confirm this action."
      />,
    );

    expect(
      screen.getByRole("heading", { level: 4, name: "Remove source?" }),
    ).toBeVisible();
  });

  it("drops the region landmark and its naming when landmark is false", () => {
    const { container } = renderInPanel(
      <InlineConfirm
        open
        {...confirmationProps()}
        landmark={false}
        title="Reset configuration?"
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

describe("InlineConfirm keyboard semantics", () => {
  it("does not advertise Escape as a shortcut that activates the region", () => {
    renderInPanel(
      <InlineConfirm
        open
        {...confirmationProps()}
        message="Remove this source?"
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
