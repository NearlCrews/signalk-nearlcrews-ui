import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolveSaveActionBarState,
  SaveActionBar,
  type SaveActionBarLabels,
} from "../../src/composites.js";
import { panel, renderInPanel } from "../helpers.js";

const LABELS: SaveActionBarLabels = {
  clean: "No unsaved changes",
  discard: "Discard",
  save: "Save",
  saving: "Saving changes",
  unconfigured: "Save to enable the plugin.",
  unsaved: "Unsaved changes",
};

const BASE = {
  dirty: false,
  invalidMessage: undefined,
  labels: LABELS,
  savedMessage: "Save requested",
  saveRequestedAt: null,
  saving: false,
  unconfigured: false,
} as const;

describe("resolveSaveActionBarState", () => {
  it("disables both actions for a clean, configured plugin", () => {
    expect(resolveSaveActionBarState(BASE)).toEqual({
      discardDisabled: true,
      live: "polite",
      message: "No unsaved changes",
      saveDisabled: true,
      tone: "neutral",
    });
  });

  it("enables Save for edits and warns about them", () => {
    expect(resolveSaveActionBarState({ ...BASE, dirty: true })).toMatchObject({
      discardDisabled: false,
      message: "Unsaved changes",
      saveDisabled: false,
      tone: "warning",
    });
  });

  it("keeps Save enabled for a plugin that was never configured", () => {
    expect(
      resolveSaveActionBarState({ ...BASE, unconfigured: true }),
    ).toMatchObject({
      message: "Save to enable the plugin.",
      saveDisabled: false,
      tone: "info",
    });
  });

  it("reports a requested save and disables Save again once configured", () => {
    expect(
      resolveSaveActionBarState({ ...BASE, saveRequestedAt: 1 }),
    ).toMatchObject({
      message: "Save requested",
      saveDisabled: true,
      tone: "info",
    });
    expect(
      resolveSaveActionBarState({
        ...BASE,
        saveRequestedAt: 1,
        unconfigured: true,
      }),
    ).toMatchObject({ saveDisabled: false });
  });

  it("blocks Save with the trimmed validation message", () => {
    expect(
      resolveSaveActionBarState({
        ...BASE,
        dirty: true,
        invalidMessage: " Fix the port. ",
      }),
    ).toEqual({
      discardDisabled: false,
      live: "polite",
      message: "Fix the port.",
      saveDisabled: true,
      tone: "danger",
    });
    // A blank message is no message.
    expect(
      resolveSaveActionBarState({ ...BASE, dirty: true, invalidMessage: "  " }),
    ).toMatchObject({ tone: "warning" });
  });

  it("blocks both actions while saving, ahead of every other state", () => {
    expect(
      resolveSaveActionBarState({
        ...BASE,
        dirty: true,
        invalidMessage: "Fix the port.",
        saving: true,
      }),
    ).toEqual({
      discardDisabled: true,
      live: "polite",
      message: "Saving changes",
      saveDisabled: true,
      tone: "info",
    });
  });
});

describe("SaveActionBar", () => {
  it("renders the status as a polite live region with the state tone", () => {
    const { container } = renderInPanel(
      <SaveActionBar dirty onSave={vi.fn()} onDiscard={vi.fn()} />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Warning. Unsaved changes");
    expect(container.querySelector(".snui-status--warning")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Discard" })).toBeEnabled();
    expect(
      container.querySelector(".snui-action-bar--sticky-viewport-bottom"),
    ).not.toBeNull();
  });

  it("disables the actions for a clean plugin and honors label overrides", () => {
    renderInPanel(
      <SaveActionBar
        dirty={false}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
        sticky="bottom"
        labels={{ clean: "Nothing to save", save: "Apply", discard: "Reset" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Nothing to save");
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("shows the validation message in the status and blocks Save", () => {
    const { container } = renderInPanel(
      <SaveActionBar
        dirty
        invalidMessage="Choose a port between 1 and 65535."
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    // One polite region carries every state, so the role is already mounted
    // when the validation message arrives rather than created beside it.
    const status = screen.getByRole("status");
    expect(status).not.toHaveAttribute("aria-live");
    expect(status).toHaveTextContent("Choose a port between 1 and 65535.");
    expect(container.querySelector(".snui-status--danger")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard" })).toBeEnabled();
  });

  it("keeps a saving button focusable and busy", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderInPanel(
      <SaveActionBar dirty saving onSave={onSave} onDiscard={vi.fn()} />,
    );

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();
    expect(save).toHaveAttribute("aria-busy", "true");
    expect(save).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Saving changes");
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
    // The busy description reuses the saving status label so it stays
    // overridable through `labels`.
    expect(save).toHaveAccessibleDescription("Saving changes");

    // Focusable is not activatable: a second Save during an in-flight save
    // would send the same configuration twice.
    await user.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("reports a requested save with the configurable message", () => {
    renderInPanel(
      <SaveActionBar
        dirty={false}
        saveRequestedAt={Date.now()}
        savedMessage="Sent to the server"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Information. Sent to the server",
    );
  });

  it("invokes the handlers and moves focus to the status", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    const { container } = renderInPanel(
      <SaveActionBar
        dirty
        onSave={onSave}
        onDiscard={onDiscard}
        data-testid="footer"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(container.querySelector(".snui-action-bar__status")).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(container.querySelector(".snui-action-bar__status")).toHaveFocus();
    expect(screen.getByTestId("footer")).toHaveClass("snui-action-bar");
  });
});

describe("SaveActionBar saved message window", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("takes the saved message down when its window closes", () => {
    const now = Date.UTC(2026, 8, 10, 9, 0, 0);
    vi.useFakeTimers({ now });
    const { unmount } = renderInPanel(
      <SaveActionBar
        dirty={false}
        saveRequestedAt={now}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Save requested");

    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    // The bar falls back to the state underneath, which is what a panel used
    // to do by writing the timestamp back to null.
    expect(status).toHaveTextContent("No unsaved changes");
    expect(vi.getTimerCount()).toBe(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("restarts the window for a second save rather than inheriting the first", () => {
    const now = Date.UTC(2026, 8, 10, 9, 0, 0);
    vi.useFakeTimers({ now });
    const { rerender } = renderInPanel(
      <SaveActionBar
        dirty={false}
        saveRequestedAt={now}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    rerender(
      panel(
        <SaveActionBar
          dirty={false}
          saveRequestedAt={now + 2_000}
          onSave={vi.fn()}
          onDiscard={vi.fn()}
        />,
      ),
    );

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Save requested");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("No unsaved changes");
  });

  it("measures the window from the request, not from the mount", () => {
    const now = Date.UTC(2026, 8, 10, 9, 0, 0);
    vi.useFakeTimers({ now });
    const { rerender } = renderInPanel(
      <SaveActionBar
        dirty={false}
        saveRequestedAt={now - 5_000}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    // A panel that remounts holding an old timestamp does not replay a save
    // the user finished minutes ago.
    expect(screen.getByRole("status")).toHaveTextContent("No unsaved changes");
    const idleTimers = vi.getTimerCount();

    rerender(
      panel(
        <SaveActionBar
          dirty={false}
          saveRequestedAt={now}
          onSave={vi.fn()}
          onDiscard={vi.fn()}
        />,
      ),
    );

    // A closed window waits for nothing; an open one waits once.
    expect(screen.getByRole("status")).toHaveTextContent("Save requested");
    expect(vi.getTimerCount()).toBe(idleTimers + 1);
  });

  it("leaves an unusable timestamp alone and clamps one from a fast clock", () => {
    const now = Date.UTC(2026, 8, 10, 9, 0, 0);
    vi.useFakeTimers({ now });
    const { rerender } = renderInPanel(
      <SaveActionBar
        dirty={false}
        saveRequestedAt={Number.NaN}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    // Nothing to measure from, so the bar keeps reporting the request and
    // waits for the panel to say otherwise.
    expect(screen.getByRole("status")).toHaveTextContent("Save requested");
    const idleTimers = vi.getTimerCount();

    // A host clock a minute ahead of this one cannot stretch the window.
    rerender(
      panel(
        <SaveActionBar
          dirty={false}
          saveRequestedAt={now + 60_000}
          onSave={vi.fn()}
          onDiscard={vi.fn()}
        />,
      ),
    );
    expect(vi.getTimerCount()).toBe(idleTimers + 1);
    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("No unsaved changes");
  });

  it("honors a custom window and leaves zero to the consumer", () => {
    const now = Date.UTC(2026, 8, 10, 9, 0, 0);
    vi.useFakeTimers({ now });
    const { rerender } = renderInPanel(
      <SaveActionBar
        dirty={false}
        saveRequestedAt={now}
        savedMessageDurationMs={6_000}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5_999);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Save requested");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).toHaveTextContent("No unsaved changes");

    rerender(
      panel(
        <SaveActionBar
          dirty={false}
          saveRequestedAt={now + 6_000}
          savedMessageDurationMs={0}
          onSave={vi.fn()}
          onDiscard={vi.fn()}
        />,
      ),
    );
    // Nothing is waiting to take it down: the panel owns the window again.
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(600_000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Save requested");
  });
});
