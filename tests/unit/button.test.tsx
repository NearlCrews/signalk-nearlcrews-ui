import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, createRef } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type { IconOnlyButtonProps } from "../../src/components/Button.js";
import { Button, PanelRoot } from "../../src/index.js";

describe("Button anchors", () => {
  it("renders an anchor with href and the shared button classes", () => {
    render(
      <PanelRoot>
        <Button
          as="a"
          href="#details"
          variant="primary"
          size="compact"
          shape="pill"
        >
          Details
        </Button>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <Button as="a" href={href}>
          Details
        </Button>
      </PanelRoot>,
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
    const { container } = render(
      <PanelRoot>
        <Button as="a" href={href} onClick={onClick}>
          Unsafe
        </Button>
      </PanelRoot>,
    );

    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    if (!(anchor instanceof HTMLAnchorElement)) {
      throw new Error("Button did not render an anchor element.");
    }
    expect(anchor).not.toHaveAttribute("href");
    expect(anchor).toHaveAttribute("aria-disabled", "true");
    // Without href an anchor is generic, so the link role is restated.
    expect(screen.getByRole("link", { name: "Unsafe" })).toBe(anchor);
    await user.click(anchor);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("warns once per rejected href in development and never for safe ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <PanelRoot>
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
      </PanelRoot>,
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
    try {
      render(
        <PanelRoot>
          <Button as="a" href="ftp://example.com/production">
            Quiet
          </Button>
        </PanelRoot>,
      );
      expect(warn).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: "Quiet" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("defaults rel on a new browsing context and honors a caller's own", () => {
    render(
      <PanelRoot>
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
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <Button as="a" href="#docs" ref={ref}>
          Docs
        </Button>
      </PanelRoot>,
    );

    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });

  it("keeps a loading anchor focusable while suppressing navigation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <PanelRoot>
        <Button
          as="a"
          href="https://example.com/docs"
          loading
          onClick={onClick}
          onKeyDown={onKeyDown}
        >
          Docs
        </Button>
      </PanelRoot>,
    );

    const anchor = screen.getByText("Docs").closest("a");
    expect(anchor).not.toBeNull();
    if (!(anchor instanceof HTMLAnchorElement)) {
      throw new Error("Button did not render an anchor element.");
    }
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
    render(
      <PanelRoot>
        <Button
          as="a"
          href="https://example.com/docs"
          ariaDisabled
          onClick={onClick}
          onKeyDown={onKeyDown}
        >
          Docs
        </Button>
      </PanelRoot>,
    );

    const anchor = screen.getByText("Docs").closest("a");
    expect(anchor).not.toBeNull();
    if (!(anchor instanceof HTMLAnchorElement)) {
      throw new Error("Button did not render an anchor element.");
    }
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
    render(
      <PanelRoot>
        <Button as="a" href="#docs" aria-disabled="true" onClick={onClick}>
          Docs
        </Button>
        <Button as="a" href="#guide" aria-disabled={true} onClick={onClick}>
          Guide
        </Button>
      </PanelRoot>,
    );

    await user.click(screen.getByText("Docs"));
    await user.click(screen.getByText("Guide"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("activates an enabled anchor and forwards key events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <PanelRoot>
        <Button as="a" href="#details" onClick={onClick} onKeyDown={onKeyDown}>
          Details
        </Button>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <Button fullWidth>Save</Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("snui-button--full-width");
    expect(button).not.toHaveAttribute("style");
  });

  it("falls back to the default loading label for whitespace-only labels", () => {
    render(
      <PanelRoot>
        <Button loading loadingLabel="   " aria-label="Save settings">
          Save
        </Button>
      </PanelRoot>,
    );

    expect(
      screen.getByRole("button", { name: "Save settings" }),
    ).toHaveAccessibleDescription("Working");
  });

  it("omits the full-width modifier by default", () => {
    render(
      <PanelRoot>
        <Button>Save</Button>
      </PanelRoot>,
    );

    expect(screen.getByRole("button", { name: "Save" })).not.toHaveClass(
      "snui-button--full-width",
    );
  });

  it("throws when an icon-only button has no accessible name", () => {
    expect(() =>
      render(
        <PanelRoot>
          <Button iconOnly>
            <svg aria-hidden="true" />
          </Button>
        </PanelRoot>,
      ),
    ).toThrow(
      "Button with iconOnly requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
    );

    expect(() =>
      render(
        <PanelRoot>
          <Button iconOnly aria-label="   ">
            <svg aria-hidden="true" />
          </Button>
        </PanelRoot>,
      ),
    ).toThrow(
      "Button with iconOnly requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
    );
  });

  it("renders an icon-only button named with aria-label", () => {
    render(
      <PanelRoot>
        <Button iconOnly aria-label="Add source">
          <svg aria-hidden="true" />
        </Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Add source" });
    expect(button).toHaveClass("snui-button--icon-only");
    expect(button).not.toHaveClass("snui-button--full-width");
  });

  it("accepts aria-labelledby as the icon-only accessible name", () => {
    render(
      <PanelRoot>
        <span id="add-source-label">Add source</span>
        <Button iconOnly aria-labelledby="add-source-label">
          <svg aria-hidden="true" />
        </Button>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <Button ariaDisabled={false} aria-disabled="true" onClick={onClick}>
          Enabled by prop
        </Button>
        <Button ariaDisabled aria-disabled="false" onClick={onClick}>
          Blocked by prop
        </Button>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <Button aria-disabled="true" onClick={onClick}>
          Save
        </Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("omits aria-disabled from a natively disabled button", () => {
    render(
      <PanelRoot>
        <Button disabled loading>
          Save
        </Button>
        <Button disabled ariaDisabled>
          Reset
        </Button>
      </PanelRoot>,
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
    const { rerender } = render(
      <PanelRoot>
        <Button ariaDisabled disabledReason="Nothing has changed yet.">
          Save
        </Button>
      </PanelRoot>,
    );

    // The point of ariaDisabled over native disabled is that the control
    // stays reachable, so its reason has to be reachable with it.
    const blocked = screen.getByRole("button", { name: "Save" });
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    expect(blocked).toHaveAccessibleDescription("Nothing has changed yet.");

    rerender(
      <PanelRoot>
        <Button disabledReason="Nothing has changed yet.">Save</Button>
      </PanelRoot>,
    );

    const live = screen.getByRole("button", { name: "Save" });
    expect(live).not.toHaveAttribute("aria-disabled");
    expect(live).not.toHaveAccessibleDescription();
  });

  it("keeps the accessible name the button had before it was blocked", () => {
    render(
      <PanelRoot>
        <Button ariaDisabled disabledReason="Choose a source first.">
          Apply
        </Button>
      </PanelRoot>,
    );

    // The reason is a description; rewriting the name would announce the
    // control as a different one mid-interaction.
    expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();
  });
});

describe("Button list-line variant", () => {
  it("renders the text variant with the shared button behavior", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PanelRoot>
        <Button variant="text" ariaDisabled onClick={onClick}>
          Depth to keel
        </Button>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <Button onClick={onClick}>Save</Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button).not.toHaveClass("snui-button--icon-only");

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
