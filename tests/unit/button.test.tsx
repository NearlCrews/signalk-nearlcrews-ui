import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, createRef } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { Button, type IconOnlyButtonProps } from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

/** The anchor a Button rendered around the given text. */
function anchorAround(text: string): HTMLAnchorElement {
  const anchor = screen.getByText(text).closest("a");
  if (!(anchor instanceof HTMLAnchorElement)) {
    throw new Error("Button did not render an anchor element.");
  }
  return anchor;
}

describe("Button anchors", () => {
  it("renders an anchor with href and the shared button classes", () => {
    renderInPanel(
      <Button
        as="a"
        href="#details"
        variant="primary"
        size="compact"
        shape="pill"
      >
        Details
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Details" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "#details");
    expect(link).toHaveClass(
      "snui-button",
      "snui-button--primary",
      "snui-button--size-compact",
      "snui-button--shape-pill",
    );
    expect(link.querySelector(".snui-button__content")).toHaveTextContent(
      "Details",
    );
  });

  it.each([
    "#details",
    "../docs/guide.html",
    "?panel=details",
    "https://example.com/docs",
    "http://example.com/docs",
    "mailto:crew@example.com",
    "tel:+15551234567",
  ])("preserves the safe href %s", (href) => {
    renderInPanel(
      <Button as="a" href={href}>
        Details
      </Button>,
    );

    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute(
      "href",
      href,
    );
  });

  it.each([
    "javascript:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,unsafe",
    "vbscript:msgbox(1)",
    "custom:payload",
    "   ",
  ])("makes the unsafe href %s inert", async (href) => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInPanel(
      <Button as="a" href={href} onClick={onClick}>
        Unsafe
      </Button>,
    );

    const anchor = anchorAround("Unsafe");
    expect(anchor).not.toHaveAttribute("href");
    expect(anchor).toHaveAttribute("aria-disabled", "true");
    // Without href an anchor is generic, so the link role is restated.
    expect(screen.getByRole("link", { name: "Unsafe" })).toBe(anchor);
    await user.click(anchor);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("warns once per rejected href in development and never for safe ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <>
        <Button as="a" href="ftp://example.com/chart">
          First
        </Button>
        <Button as="a" href="ftp://example.com/chart">
          Second
        </Button>
        <Button as="a" href="gopher://example.com/">
          Third
        </Button>
        <Button as="a" href="https://example.com/docs">
          Safe
        </Button>
      </>,
    );

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain('"ftp://example.com/chart"');
    expect(warn.mock.calls[1]?.[0]).toContain('"gopher://example.com/"');
    expect(screen.getByRole("link", { name: "Safe" })).toHaveAttribute(
      "href",
      "https://example.com/docs",
    );
  });

  it("stays silent about rejected hrefs in production builds", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <Button as="a" href="ftp://example.com/production">
        Quiet
      </Button>,
    );

    expect(warn).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Quiet" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("defaults rel on a new browsing context and honors a caller's own", () => {
    renderInPanel(
      <>
        <Button as="a" href="https://example.com/docs" target="_blank">
          Docs
        </Button>
        <Button
          as="a"
          href="https://example.com/guide"
          target="_blank"
          rel="noopener"
        >
          Guide
        </Button>
        <Button as="a" href="https://example.com/help">
          Help
        </Button>
      </>,
    );

    // Without it the destination is handed the panel's own origin, which
    // aboard a vessel is the local server address and port.
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute(
      "rel",
      "noopener",
    );
    expect(screen.getByRole("link", { name: "Help" })).not.toHaveAttribute(
      "rel",
    );
  });

  it("forwards the ref to the anchor element", () => {
    const ref = createRef<HTMLAnchorElement>();
    renderInPanel(
      <Button as="a" href="#docs" ref={ref}>
        Docs
      </Button>,
    );

    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });

  it("keeps a loading anchor focusable while suppressing navigation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    renderInPanel(
      <Button
        as="a"
        href="https://example.com/docs"
        loading
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        Docs
      </Button>,
    );

    const anchor = anchorAround("Docs");
    expect(anchor).not.toHaveAttribute("href");
    expect(anchor).toHaveAttribute("aria-disabled", "true");
    expect(anchor).toHaveAttribute("role", "link");
    expect(anchor).toHaveAttribute("aria-busy", "true");
    expect(anchor).toHaveAccessibleDescription("Working");
    expect(anchor.querySelector(".snui-button__spinner")).not.toBeNull();

    await user.click(anchor);
    anchor.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(anchor).toHaveFocus();
  });

  it("keeps an aria-disabled anchor focusable while suppressing navigation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    renderInPanel(
      <Button
        as="a"
        href="https://example.com/docs"
        ariaDisabled
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        Docs
      </Button>,
    );

    const anchor = anchorAround("Docs");
    expect(anchor).not.toHaveAttribute("href");
    expect(anchor).toHaveAttribute("aria-disabled", "true");
    expect(anchor).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("link", { name: "Docs" })).toBe(anchor);

    await user.click(anchor);
    anchor.focus();
    await user.keyboard("{Enter}");
    expect(onClick).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();

    // Non-activation keys still reach the consumer while the anchor is inert.
    await user.keyboard("{Escape}");
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("honors the native aria-disabled attribute on an anchor", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInPanel(
      <>
        <Button as="a" href="#docs" aria-disabled="true" onClick={onClick}>
          Docs
        </Button>
        <Button as="a" href="#guide" aria-disabled={true} onClick={onClick}>
          Guide
        </Button>
      </>,
    );

    await user.click(screen.getByText("Docs"));
    await user.click(screen.getByText("Guide"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("activates an enabled anchor and forwards key events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    renderInPanel(
      <Button as="a" href="#details" onClick={onClick} onKeyDown={onKeyDown}>
        Details
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Details" });
    expect(link).not.toHaveAttribute("aria-disabled");
    expect(link).not.toHaveAttribute("aria-busy");

    await user.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);

    link.focus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onKeyDown).toHaveBeenCalled();
  });
});

describe("Button width and icon-only modifiers", () => {
  it("applies the full-width modifier through a class, not inline style", () => {
    renderInPanel(<Button fullWidth>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("snui-button--full-width");
    expect(button).not.toHaveAttribute("style");
  });

  it("falls back to the default loading label for whitespace-only labels", () => {
    renderInPanel(
      <Button loading loadingLabel="   " aria-label="Save settings">
        Save
      </Button>,
    );

    expect(
      screen.getByRole("button", { name: "Save settings" }),
    ).toHaveAccessibleDescription("Working");
  });

  it("omits the full-width modifier by default", () => {
    renderInPanel(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).not.toHaveClass(
      "snui-button--full-width",
    );
  });

  it("throws when an icon-only button has no accessible name", () => {
    const unnamed =
      "signalk-nearlcrews-ui: Button with iconOnly requires an accessible name: pass a non-empty aria-label or aria-labelledby.";
    expect(() =>
      renderInPanel(
        <Button iconOnly>
          <svg aria-hidden="true" />
        </Button>,
      ),
    ).toThrow(unnamed);

    expect(() =>
      renderInPanel(
        <Button iconOnly aria-label="   ">
          <svg aria-hidden="true" />
        </Button>,
      ),
    ).toThrow(unnamed);
  });

  it("renders an icon-only button named with aria-label", () => {
    renderInPanel(
      <Button iconOnly aria-label="Add source">
        <svg aria-hidden="true" />
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Add source" });
    expect(button).toHaveClass("snui-button--icon-only");
    expect(button).not.toHaveClass("snui-button--full-width");
  });

  it("accepts aria-labelledby as the icon-only accessible name", () => {
    renderInPanel(
      <>
        <span id="add-source-label">Add source</span>
        <Button iconOnly aria-labelledby="add-source-label">
          <svg aria-hidden="true" />
        </Button>
      </>,
    );

    const button = screen.getByRole("button", { name: "Add source" });
    expect(button).toHaveClass("snui-button--icon-only");
  });
});

describe("Button prop types", () => {
  it("requires href for anchors and rejects it for buttons", () => {
    // @ts-expect-error anchor rendering requires an href
    const anchorWithoutHref = <Button as="a">Docs</Button>;
    // @ts-expect-error the button form does not accept href
    const buttonWithHref = <Button href="#docs">Docs</Button>;
    // @ts-expect-error the as prop is limited to button and a
    const arbitraryElement = <Button as="span">Docs</Button>;

    expect(anchorWithoutHref.type).toBe(Button);
    expect(buttonWithHref.type).toBe(Button);
    expect(arbitraryElement.type).toBe(Button);
    expectTypeOf<ComponentProps<typeof Button>["as"]>().toEqualTypeOf<
      "button" | "a" | undefined
    >();
  });
});

describe("Button disabled states", () => {
  it("lets ariaDisabled decide when both spellings are present", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInPanel(
      <>
        <Button ariaDisabled={false} aria-disabled="true" onClick={onClick}>
          Enabled by prop
        </Button>
        <Button ariaDisabled aria-disabled="false" onClick={onClick}>
          Blocked by prop
        </Button>
      </>,
    );

    const enabled = screen.getByRole("button", { name: "Enabled by prop" });
    const blocked = screen.getByRole("button", { name: "Blocked by prop" });
    expect(enabled).not.toHaveAttribute("aria-disabled");
    expect(blocked).toHaveAttribute("aria-disabled", "true");

    await user.click(enabled);
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.click(blocked);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("reads the native aria-disabled attribute while the prop is absent", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInPanel(
      <Button aria-disabled="true" onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("omits aria-disabled from a natively disabled button", () => {
    renderInPanel(
      <>
        <Button disabled loading>
          Save
        </Button>
        <Button disabled ariaDisabled>
          Reset
        </Button>
      </>,
    );

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    expect(save).not.toHaveAttribute("aria-disabled");
    expect(save).toHaveAttribute("aria-busy", "true");
    const reset = screen.getByRole("button", { name: "Reset" });
    expect(reset).toBeDisabled();
    expect(reset).not.toHaveAttribute("aria-disabled");
  });
});

describe("Button blocked reason", () => {
  it("describes a blocked button and drops the reason once it is live", () => {
    const { rerender } = renderInPanel(
      <Button ariaDisabled disabledReason="Nothing has changed yet.">
        Save
      </Button>,
    );

    // The point of ariaDisabled over native disabled is that the control
    // stays reachable, so its reason has to be reachable with it.
    const blocked = screen.getByRole("button", { name: "Save" });
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    expect(blocked).toHaveAccessibleDescription("Nothing has changed yet.");

    rerender(
      panel(<Button disabledReason="Nothing has changed yet.">Save</Button>),
    );

    const live = screen.getByRole("button", { name: "Save" });
    expect(live).not.toHaveAttribute("aria-disabled");
    expect(live).not.toHaveAccessibleDescription();
  });

  it("keeps the accessible name the button had before it was blocked", () => {
    renderInPanel(
      <Button ariaDisabled disabledReason="Choose a source first.">
        Apply
      </Button>,
    );

    // The reason is a description; rewriting the name would announce the
    // control as a different one mid-interaction.
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });
});

describe("Button visible blocked reason", () => {
  it("draws the reason under a blocked button and reads it once", () => {
    const { container, rerender } = renderInPanel(
      <Button
        ariaDisabled
        disabledReason="Connect a source first."
        disabledReasonVisibility="visible"
      >
        Run
      </Button>,
    );

    const blocked = screen.getByRole("button", { name: "Run" });
    expect(blocked).toHaveAccessibleDescription("Connect a source first.");
    const reason = screen.getByText("Connect a source first.");
    // Drawn beside the button rather than inside it, and not hidden from
    // assistive technology, so browse mode reads it where it sits.
    expect(blocked).not.toContainElement(reason);
    expect(reason).not.toHaveAttribute("aria-hidden");
    expect(reason).toHaveClass("snui-button-reason__text");
    // One copy only: the hidden form is not rendered as well.
    expect(container.querySelectorAll(".snui-visually-hidden")).toHaveLength(0);

    rerender(
      panel(
        <Button
          disabledReason="Connect a source first."
          disabledReasonVisibility="visible"
        >
          Run
        </Button>,
      ),
    );

    // The wrapper stays, so the button the reader stands on is the same
    // element once it goes live, and the reason goes away with the block.
    expect(screen.getByRole("button", { name: "Run" })).toBe(blocked);
    expect(screen.queryByText("Connect a source first.")).toBeNull();
    expect(blocked).not.toHaveAccessibleDescription();
  });

  it("keeps the caller's class and ref on the button, and spans the row when full width", () => {
    const ref = createRef<HTMLButtonElement>();
    renderInPanel(
      <Button
        ref={ref}
        className="run-action"
        fullWidth
        ariaDisabled
        disabledReason="Connect a source first."
        disabledReasonVisibility="visible"
      >
        Run
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Run" });
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("run-action", "snui-button--full-width");
    expect(button.parentElement).toHaveClass(
      "snui-button-reason",
      "snui-button-reason--full-width",
    );
  });

  it("draws the reason under a blocked anchor too", () => {
    renderInPanel(
      <Button
        as="a"
        href="https://example.com/docs"
        ariaDisabled
        disabledReason="Offline."
        disabledReasonVisibility="visible"
      >
        Docs
      </Button>,
    );

    expect(
      screen.getByRole("link", { name: "Docs" }),
    ).toHaveAccessibleDescription("Offline.");
  });

  it("drops the reason beside native disabled, hidden or drawn", () => {
    // Development names this combination; the reason is what is under test.
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <>
        <Button disabled ariaDisabled disabledReason="No key set.">
          Check API key
        </Button>
        <Button
          disabled
          ariaDisabled
          disabledReason="No source chosen."
          disabledReasonVisibility="visible"
        >
          Check source
        </Button>
      </>,
    );

    // Native disabled takes the button out of the tab order, where the reason
    // reaches no one, so it is neither wired nor drawn, as Checkbox and
    // SegmentedControl drop theirs.
    for (const name of ["Check API key", "Check source"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      expect(button).not.toHaveAccessibleDescription();
    }
    expect(screen.queryByText("No key set.")).toBeNull();
    expect(screen.queryByText("No source chosen.")).toBeNull();
  });
});

describe("Button development checks", () => {
  function warnings(warn: { mock: { calls: unknown[][] } }): string[] {
    return warn.mock.calls.map(([message]) => String(message));
  }

  it("asks a blocked button that says nothing to say why", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <>
        <Button ariaDisabled>Apply retention</Button>
        <Button ariaDisabled disabledReason="Nothing to apply.">
          Explained
        </Button>
        <Button ariaDisabled aria-describedby="elsewhere">
          Described
        </Button>
        {/* A running button's busy description is its explanation. */}
        <Button ariaDisabled loading>
          Running
        </Button>
      </>,
    );

    expect(warnings(warn)).toEqual([
      'Button "Apply retention" is blocked with ariaDisabled but says nothing about why. Pass disabledReason, or point aria-describedby at the text that explains it. A block that lasts only while another action runs needs one too, such as "Available when the scan finishes".',
    ]);
  });

  it("names ariaDisabled when a reason is given to a natively disabled button", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <>
        <Button disabled disabledReason="No key set.">
          Test API key
        </Button>
        {/* A visible hint wired by hand is legitimate beside native disabled. */}
        <Button disabled aria-describedby="hint">
          Test connection
        </Button>
      </>,
    );

    expect(warnings(warn)).toEqual([
      'Button "Test API key" has a disabledReason beside native disabled, which takes it out of the tab order, so no one reaches the reason. Use ariaDisabled instead: the button stays focusable and reads the reason.',
    ]);
  });

  it("asks an aria-label to keep the words the button shows", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <>
        <Button aria-label="Delete navigation.speedOverGround">Remove</Button>
        <Button aria-label="Remove navigation.speedOverGround">Remove</Button>
        <Button aria-label="Save configuration">Save…</Button>
        <Button aria-label="Close panel" iconOnly>
          <span aria-hidden="true">×</span>
        </Button>
      </>,
    );

    expect(warnings(warn)).toEqual([
      'Button "Remove" has the aria-label "Delete navigation.speedOverGround", which does not contain its visible text. Speech input users say the words they see, so keep them in the name: add context as visually hidden text inside the button, such as Remove<VisuallyHidden> depth alarm</VisuallyHidden>, instead of an aria-label.',
    ]);
  });

  it("stays silent in production builds", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <>
        <Button ariaDisabled>Quiet blocked</Button>
        <Button disabled disabledReason="Quiet.">
          Quiet disabled
        </Button>
        <Button aria-label="Other words">Quiet label</Button>
      </>,
    );

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Button list-line variant", () => {
  it("renders the text variant with the shared button behavior", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInPanel(
      <Button variant="text" ariaDisabled onClick={onClick}>
        Depth to keel
      </Button>,
    );

    // A dense row keeps the focus ring, the target height, and the blocked
    // behavior rather than hand-styling a bare native button.
    const row = screen.getByRole("button", { name: "Depth to keel" });
    expect(row).toHaveClass("snui-button", "snui-button--text");
    expect(row).toHaveAttribute("aria-disabled", "true");
    await user.click(row);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Button icon-only props", () => {
  it("requires an accessible name at the type level", () => {
    expectTypeOf<IconOnlyButtonProps>().toExtend<{ readonly iconOnly: true }>();
    expectTypeOf({
      "aria-label": "Add source",
      children: null,
      iconOnly: true,
    } as const).toExtend<IconOnlyButtonProps>();
    expectTypeOf({
      "aria-labelledby": "add-source-label",
      children: null,
      iconOnly: true,
    } as const).toExtend<IconOnlyButtonProps>();
    // @ts-expect-error an icon-only button needs one of the two naming props
    const unnamed: IconOnlyButtonProps = { children: null, iconOnly: true };
    expect(unnamed.iconOnly).toBe(true);
  });
});

describe("Button native form", () => {
  it("keeps native button semantics for the default rendering", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInPanel(<Button onClick={onClick}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button).not.toHaveClass("snui-button--icon-only");

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("buttons and confirmation", () => {
  it("groups consumer icons and labels inside the button content slot", () => {
    renderInPanel(
      <Button>
        <span aria-hidden="true">+</span>
        <span>Add source</span>
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Add source" });
    const content = button.querySelector(".snui-button__content");
    expect(content).not.toBeNull();
    expect(content?.children).toHaveLength(2);
  });

  it("keeps a loading button focusable while suppressing activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: React.SubmitEvent<HTMLFormElement>) =>
      event.preventDefault(),
    );
    const saveForm = (loading: boolean): React.JSX.Element => (
      <form onSubmit={onSubmit}>
        <Button
          loading={loading}
          variant="primary"
          type="submit"
          onClick={onClick}
        >
          Save
        </Button>
      </form>
    );
    const { rerender } = renderInPanel(saveForm(false));
    const idleButton = screen.getByRole("button", { name: "Save" });
    idleButton.focus();

    rerender(panel(saveForm(true)));

    // The accessible name stays stable across the busy transition; busy state
    // is conveyed as a description plus aria-busy.
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAccessibleDescription("Working");
    expect(button).toBe(idleButton);
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".snui-button__spinner")).not.toBeNull();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    await user.click(button);
    expect(button).toHaveFocus();
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("localizes a loading button with an explicit accessible label", () => {
    renderInPanel(
      <Button loading loadingLabel="Saving" aria-label="Save settings">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save settings" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAccessibleDescription("Saving");
  });

  it("keeps aria-disabled buttons focusable while suppressing activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInPanel(
      <Button ariaDisabled onClick={onClick} size="compact" shape="pill">
        Move up
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Move up" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button.querySelector(".snui-button__content")).toHaveTextContent(
      "Move up",
    );
    button.focus();
    await user.keyboard("{Enter}");
    await user.click(button);
    expect(button).toHaveFocus();
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Button blocked activation keys", () => {
  it.each([
    ["aria-disabled", { ariaDisabled: true }],
    ["loading", { loading: true }],
  ] as const)(
    "suppresses consumer onKeyDown for activation keys while %s",
    (_, blocking) => {
      const onKeyDown = vi.fn();
      renderInPanel(
        <Button {...blocking} onKeyDown={onKeyDown}>
          Save
        </Button>,
      );

      const button = screen.getByRole("button", { name: "Save" });
      fireEvent.keyDown(button, { key: "Enter" });
      fireEvent.keyDown(button, { key: " " });
      expect(onKeyDown).not.toHaveBeenCalled();
    },
  );

  it("passes non-activation keys through while blocked", () => {
    const onKeyDown = vi.fn();
    renderInPanel(
      <Button ariaDisabled onKeyDown={onKeyDown}>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Tab" });
    fireEvent.keyDown(button, { key: "ArrowDown" });
    fireEvent.keyDown(button, { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(3);
  });

  it("passes activation keys through when the button is enabled", () => {
    const onKeyDown = vi.fn();
    renderInPanel(<Button onKeyDown={onKeyDown}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
  });
});
