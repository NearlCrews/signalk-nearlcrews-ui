import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PanelErrorBoundary,
  type PanelErrorBoundaryFallbackProps,
  PanelShell,
  useUnsavedChangesGuard,
} from "../../src/index.js";
import { renderInPanel } from "../helpers.js";

function follows(first: Element, second: Element): boolean {
  return Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

describe("PanelShell", () => {
  it("frames the panel with a root, a level-2 title, and a trailing theme toggle", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PanelShell
        ref={ref}
        data-testid="shell"
        title="Chart locker"
        description="Manage cached charts."
        width="standard"
      >
        <p>Body</p>
      </PanelShell>,
    );

    const root = screen.getByTestId("shell");
    expect(root).toHaveAttribute("data-snui-root");
    expect(root).toHaveClass("snui-root--standard");
    expect(ref.current).toBe(root);
    expect(
      screen.getByRole("heading", { level: 2, name: "Chart locker" }),
    ).toBeVisible();
    expect(screen.getByText("Manage cached charts.")).toBeVisible();
    const body = screen.getByText("Body");
    const toggle = screen.getByRole("radiogroup", { name: "Panel theme" });
    expect(follows(body, toggle)).toBe(true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("places the theme toggle between title and content or omits it", () => {
    const { rerender } = render(
      <PanelShell title="Sources" themeToggle="between">
        <p>Body</p>
      </PanelShell>,
    );

    const toggle = screen.getByRole("radiogroup", { name: "Panel theme" });
    expect(
      follows(screen.getByRole("heading", { name: "Sources" }), toggle),
    ).toBe(true);
    expect(follows(toggle, screen.getByText("Body"))).toBe(true);

    rerender(
      <PanelShell themeToggle="none" headingLevel={3} title="Sources">
        <p>Body</p>
      </PanelShell>,
    );
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 3, name: "Sources" }),
    ).toBeVisible();
  });

  it("forwards theme toggle props and omits the title block without a title", () => {
    render(
      <PanelShell themeToggleProps={{ choices: ["light", "dark"] }}>
        <p>Body</p>
      </PanelShell>,
    );

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("radio", { name: "Light" })).toBeVisible();
    expect(screen.queryByRole("radio", { name: "Night" })).toBeNull();
  });

  describe("without native CSS scope", () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, "CSSScopeRule");

    afterEach(() => {
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, "CSSScopeRule");
      } else {
        Object.defineProperty(window, "CSSScopeRule", descriptor);
      }
    });

    it("renders the compatibility notice instead of a panel root", () => {
      Object.defineProperty(window, "CSSScopeRule", {
        configurable: true,
        value: undefined,
      });
      const { container } = render(
        <PanelShell title="Chart locker" headingLevel={3}>
          <p>Body</p>
        </PanelShell>,
      );

      expect(container.querySelector("[data-snui-root]")).toBeNull();
      expect(
        screen.getByRole("region", { name: "Browser update required" }),
      ).toBeVisible();
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: "Browser update required",
        }),
      ).toBeVisible();
      expect(screen.queryByText("Body")).toBeNull();
    });

    it("renders a consumer notice when one is supplied", () => {
      Object.defineProperty(window, "CSSScopeRule", {
        configurable: true,
        value: undefined,
      });
      render(
        <PanelShell unsupported={<p>Open this page in the vessel browser.</p>}>
          <p>Body</p>
        </PanelShell>,
      );

      expect(
        screen.getByText("Open this page in the vessel browser."),
      ).toBeVisible();
      expect(screen.queryByRole("region")).toBeNull();
    });
  });
});

describe("PanelErrorBoundary", () => {
  let armed = true;

  function Bomb(): React.JSX.Element {
    if (armed) throw new Error("Render failed.");
    return <p>Recovered content</p>;
  }

  afterEach(() => {
    armed = true;
  });

  it("catches a render error, reports it, and recovers on Try again", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderInPanel(
      <PanelErrorBoundary onError={onError}>
        <Bomb />
      </PanelErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("This panel stopped working");
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(screen.queryByRole("button", { name: "Reload page" })).toBeNull();

    armed = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Recovered content")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers the secondary reload action only when a handler is given", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderInPanel(
      <PanelErrorBoundary
        onReload={onReload}
        reloadLabel="Reload Admin"
        retryLabel="Retry"
        title="Panel error"
        description="Reload if it keeps failing."
      >
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Panel error. Reload if it keeps failing.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reload Admin" }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("hands a custom fallback the error and both actions", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fallback = vi.fn(
      ({ error, reload, reset }: PanelErrorBoundaryFallbackProps) => (
        <div>
          <p>{error instanceof Error ? error.message : "Unknown"}</p>
          <button type="button" onClick={reset}>
            Reset
          </button>
          <button type="button" onClick={reload}>
            Reload
          </button>
        </div>
      ),
    );
    renderInPanel(
      <PanelErrorBoundary fallback={fallback} onReload={onReload}>
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(screen.getByText("Render failed.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalledOnce();
    armed = false;
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Recovered content")).toBeVisible();
  });

  it("renders children untouched while nothing throws", () => {
    armed = false;
    renderInPanel(
      <PanelErrorBoundary>
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(screen.getByText("Recovered content")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("useUnsavedChangesGuard", () => {
  function Guard({ dirty }: { readonly dirty: boolean }): null {
    useUnsavedChangesGuard(dirty);
    return null;
  }

  function dispatchBeforeUnload(): boolean {
    const event = new Event("beforeunload", { cancelable: true });
    fireEvent(window, event);
    return event.defaultPrevented;
  }

  it("asks the browser to confirm unloading only while dirty", () => {
    const { rerender, unmount } = render(<Guard dirty />);
    expect(dispatchBeforeUnload()).toBe(true);

    rerender(<Guard dirty={false} />);
    expect(dispatchBeforeUnload()).toBe(false);

    rerender(<Guard dirty />);
    expect(dispatchBeforeUnload()).toBe(true);

    unmount();
    expect(dispatchBeforeUnload()).toBe(false);
  });
});
