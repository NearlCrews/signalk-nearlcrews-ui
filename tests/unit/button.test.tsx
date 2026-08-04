import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, createRef } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

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
    await user.click(anchor);
    expect(onClick).not.toHaveBeenCalled();
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

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("href", "https://example.com/docs");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("aria-busy", "true");
    expect(link).toHaveAccessibleDescription("Working");
    expect(link.querySelector(".snui-button__spinner")).not.toBeNull();

    await user.click(link);
    link.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(link).toHaveFocus();
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

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).not.toHaveAttribute("aria-busy");

    await user.click(link);
    link.focus();
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

    await user.click(screen.getByRole("link", { name: "Docs" }));
    await user.click(screen.getByRole("link", { name: "Guide" }));
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
