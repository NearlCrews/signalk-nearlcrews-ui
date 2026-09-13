import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InlineConfirm } from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

// This block runs first on purpose: the generic-confirmation warning is
// reported once per module, so a later test would find it already spent.
describe("InlineConfirm destructive labeling", () => {
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
          confirmLabel="Delete route"
          message="This removes the route."
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
        confirmLabel="Delete route"
        message="This removes the route."
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
        confirmLabel="Delete route"
        message="This removes the route."
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
        confirmLabel="Delete route"
        message="This removes the route."
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
        confirmLabel="Delete route"
        message="This removes the route."
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
        confirmLabel="Delete route"
        message="This removes the route."
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
