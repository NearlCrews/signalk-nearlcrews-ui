import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  resolveSaveActionBarState,
  SaveActionBar,
  type SaveActionBarLabels,
} from "../../src/composites.js";
import { panel, renderInPanel } from "../helpers.js";

const LABELS: SaveActionBarLabels = {
  clean: "All changes saved",
  discard: "Discard",
  save: "Save",
  saved: "Save sent to the server",
  saving: "Saving changes",
  unconfigured: "Save to enable the plugin",
  unsaved: "Unsaved changes",
};

const BASE = {
  dirty: false,
  invalidMessage: undefined,
  labels: LABELS,
  saveRequestedAt: null,
  saving: false,
  unconfigured: false,
} as const;

describe("resolveSaveActionBarState", () => {
  it("disables both actions for a clean, configured plugin", () => {
    expect(resolveSaveActionBarState(BASE)).toEqual({
      blocked: false,
      discardDisabled: true,
      live: "polite",
      message: "All changes saved",
      saveDisabled: true,
      tone: "neutral",
    });
  });

  it("enables Save for edits and reports them without alarm", () => {
    expect(resolveSaveActionBarState({ ...BASE, dirty: true })).toMatchObject({
      blocked: false,
      discardDisabled: false,
      message: "Unsaved changes",
      saveDisabled: false,
      tone: "info",
    });
  });

  it("keeps Save enabled for a plugin that was never configured", () => {
    expect(
      resolveSaveActionBarState({ ...BASE, unconfigured: true }),
    ).toMatchObject({
      message: "Save to enable the plugin",
      saveDisabled: false,
      tone: "info",
    });
  });

  it("reports a requested save and disables Save again once configured", () => {
    expect(
      resolveSaveActionBarState({ ...BASE, saveRequestedAt: 1 }),
    ).toMatchObject({
      message: "Save sent to the server",
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
      blocked: true,
      discardDisabled: false,
      live: "polite",
      message: "Fix the port.",
      saveDisabled: true,
      tone: "danger",
    });
    // A blank message is no message.
    expect(
      resolveSaveActionBarState({ ...BASE, dirty: true, invalidMessage: "  " }),
    ).toMatchObject({ blocked: false, tone: "info" });
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
      blocked: false,
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
    expect(status).toHaveTextContent("Information. Unsaved changes");
    expect(container.querySelector(".snui-status--info")).not.toBeNull();
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
    // Validation refuses the save rather than taking the button away, so the
    // reader keeps their place and hears the reason from the status line.
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();
    expect(save).toHaveAttribute("aria-disabled", "true");
    expect(save).toHaveAccessibleDescription(
      /Choose a port between 1 and 65535\./,
    );
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
        labels={{ saved: "Sent to the server" }}
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
    expect(status).toHaveTextContent("Save sent to the server");

    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    // The bar falls back to the state underneath, which is what a panel used
    // to do by writing the timestamp back to null.
    expect(status).toHaveTextContent("All changes saved");
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("All changes saved");
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
    expect(screen.getByRole("status")).toHaveTextContent("All changes saved");
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );
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
    expect(screen.getByRole("status")).toHaveTextContent("All changes saved");
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).toHaveTextContent("All changes saved");

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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );
  });
});

describe("SaveActionBar focus and repeated requests", () => {
  it("leaves focus alone when the panel owns the destination", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const { container } = renderInPanel(
      <SaveActionBar
        dirty
        focusOnAction="none"
        onSave={onSave}
        onDiscard={vi.fn()}
      />,
    );

    const save = screen.getByRole("button", { name: "Save" });
    await user.click(save);
    expect(onSave).toHaveBeenCalledOnce();
    // The panel sends focus to the field it refused, so the bar must not have
    // taken it first.
    expect(
      container.querySelector(".snui-action-bar__status"),
    ).not.toHaveFocus();
    expect(save).toHaveFocus();
  });

  it("reopens the saved window for a second save stamped with the same instant", () => {
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
      vi.advanceTimersByTime(2_500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("All changes saved");

    // An edit and a second save inside the same millisecond carry the same
    // timestamp, and the second one is still its own request.
    rerender(
      panel(
        <SaveActionBar
          dirty
          saveRequestedAt={now}
          onSave={vi.fn()}
          onDiscard={vi.fn()}
        />,
      ),
    );
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );
  });
});
