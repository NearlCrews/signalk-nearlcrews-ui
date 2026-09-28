import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveSaveActionBarState,
  SaveActionBar,
  type SaveActionBarLabels,
  type SaveActionBarProps,
} from "../../src/composites.js";
import { panel, renderInPanel } from "../helpers.js";

const LABELS: SaveActionBarLabels = {
  clean: "Nothing to save",
  discard: "Discard",
  save: "Save",
  saved: "Save sent to the server",
  saving: "Saving changes",
  unconfigured: "Save to enable the plugin",
  unsaved: "Unsaved changes",
};

/** The instant every saved-window spec freezes the clock at. */
const NOW = Date.UTC(2026, 8, 10, 9, 0, 0);

/** A clean bar with inert handlers unless the spec passes its own. */
function saveBar(props: Partial<SaveActionBarProps> = {}): React.JSX.Element {
  return (
    <SaveActionBar
      dirty={false}
      onSave={vi.fn()}
      onDiscard={vi.fn()}
      {...props}
    />
  );
}

const BASE = {
  dirty: false,
  invalidMessage: undefined,
  labels: LABELS,
  saveRequestedAt: null,
  saving: false,
  unconfigured: false,
} as const;

describe("resolveSaveActionBarState", () => {
  it("lists the state fields in a stable order", () => {
    // Consumers serialize the state and snapshot it, so the key order is part
    // of what the rules return, and every state keeps the same one.
    const order = [
      "blocked",
      "discardDisabled",
      "live",
      "message",
      "saveDisabled",
      "tone",
    ];
    for (const input of [
      BASE,
      { ...BASE, dirty: true },
      { ...BASE, dirty: true, invalidMessage: "Fix the port." },
      { ...BASE, saving: true },
      { ...BASE, saveRequestedAt: 1 },
      { ...BASE, unconfigured: true },
    ]) {
      expect(Object.keys(resolveSaveActionBarState(input))).toEqual(order);
    }
  });

  it("disables both actions for a clean, configured plugin", () => {
    expect(resolveSaveActionBarState(BASE)).toEqual({
      blocked: false,
      discardDisabled: true,
      live: "polite",
      message: "Nothing to save",
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

  it("keeps Discard available for an invalid draft with nothing else to discard", () => {
    // An invalid draft never commits, so a panel reporting it through
    // invalidMessage is not dirty, and a refused Discard would leave the
    // error on screen with no way back but retyping.
    expect(
      resolveSaveActionBarState({ ...BASE, invalidMessage: "Fix the port." }),
    ).toEqual({
      blocked: true,
      discardDisabled: false,
      live: "polite",
      message: "Fix the port.",
      saveDisabled: true,
      tone: "danger",
    });
  });

  it("reports a failed save and keeps Save available for a retry", () => {
    const failure = {
      message: "Save failed. Check the connection.",
      tone: "danger",
    } as const;
    expect(resolveSaveActionBarState({ ...BASE, outcome: failure })).toEqual({
      blocked: false,
      discardDisabled: true,
      live: "polite",
      message: "Save failed. Check the connection.",
      saveDisabled: false,
      tone: "danger",
    });
    // Edits made after the failure do not hide it: the last request still
    // did not apply, and the retry sends the edits with it.
    expect(
      resolveSaveActionBarState({ ...BASE, dirty: true, outcome: failure }),
    ).toMatchObject({
      discardDisabled: false,
      message: "Save failed. Check the connection.",
      saveDisabled: false,
      tone: "danger",
    });
    // A form that cannot be sent says why first, and saving says so ahead of
    // everything.
    expect(
      resolveSaveActionBarState({
        ...BASE,
        dirty: true,
        invalidMessage: "Fix the port.",
        outcome: failure,
      }),
    ).toMatchObject({ message: "Fix the port.", saveDisabled: true });
    expect(
      resolveSaveActionBarState({ ...BASE, outcome: failure, saving: true }),
    ).toMatchObject({ message: "Saving changes" });
  });

  it("reports an accepted save in place of the saved message", () => {
    const accepted = { message: "Saved at 14:02", tone: "success" } as const;
    expect(
      resolveSaveActionBarState({
        ...BASE,
        outcome: accepted,
        saveRequestedAt: 1,
      }),
    ).toEqual({
      blocked: false,
      discardDisabled: true,
      live: "polite",
      message: "Saved at 14:02",
      saveDisabled: true,
      tone: "success",
    });
    expect(
      resolveSaveActionBarState({
        ...BASE,
        outcome: accepted,
        unconfigured: true,
      }),
    ).toMatchObject({ saveDisabled: false });
    // A new edit is news the outcome of the last request is not.
    expect(
      resolveSaveActionBarState({ ...BASE, dirty: true, outcome: accepted }),
    ).toMatchObject({ message: "Unsaved changes", tone: "info" });
    // Blank text is no outcome.
    expect(
      resolveSaveActionBarState({
        ...BASE,
        outcome: { message: "  ", tone: "danger" },
      }),
    ).toMatchObject({ message: "Nothing to save", tone: "neutral" });
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
    const { container } = renderInPanel(saveBar({ dirty: true }));

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
      saveBar({
        sticky: "bottom",
        labels: { clean: "Up to date", save: "Apply", discard: "Reset" },
      }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("Up to date");
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("shows the validation message in the status and blocks Save", () => {
    const { container } = renderInPanel(
      saveBar({
        dirty: true,
        invalidMessage: "Choose a port between 1 and 65535.",
      }),
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
    renderInPanel(saveBar({ dirty: true, onSave, saving: true }));

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
      saveBar({
        labels: { saved: "Sent to the server" },
        saveRequestedAt: Date.now(),
      }),
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
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  it("takes the saved message down when its window closes", () => {
    const { unmount } = renderInPanel(saveBar({ saveRequestedAt: NOW }));

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Save sent to the server");

    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    // The bar falls back to the state underneath, which is what a panel used
    // to do by writing the timestamp back to null.
    expect(status).toHaveTextContent("Nothing to save");
    expect(vi.getTimerCount()).toBe(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("restarts the window for a second save rather than inheriting the first", () => {
    const { rerender } = renderInPanel(saveBar({ saveRequestedAt: NOW }));

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    rerender(panel(saveBar({ saveRequestedAt: NOW + 2_000 })));

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Nothing to save");
  });

  it("measures the window from the request, not from the mount", () => {
    const { rerender } = renderInPanel(
      saveBar({ saveRequestedAt: NOW - 5_000 }),
    );

    // A panel that remounts holding an old timestamp does not replay a save
    // the user finished minutes ago.
    expect(screen.getByRole("status")).toHaveTextContent("Nothing to save");
    const idleTimers = vi.getTimerCount();

    rerender(panel(saveBar({ saveRequestedAt: NOW })));

    // A closed window waits for nothing; an open one waits once.
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );
    expect(vi.getTimerCount()).toBe(idleTimers + 1);
  });

  it("leaves an unusable timestamp alone and clamps one from a fast clock", () => {
    const { rerender } = renderInPanel(
      saveBar({ saveRequestedAt: Number.NaN }),
    );

    // Nothing to measure from, so the bar keeps reporting the request and
    // waits for the panel to say otherwise.
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );
    const idleTimers = vi.getTimerCount();

    // A host clock a minute ahead of this one cannot stretch the window.
    rerender(panel(saveBar({ saveRequestedAt: NOW + 60_000 })));
    expect(vi.getTimerCount()).toBe(idleTimers + 1);
    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Nothing to save");
  });

  it("honors a custom window and leaves zero to the consumer", () => {
    const { rerender } = renderInPanel(
      saveBar({ saveRequestedAt: NOW, savedMessageDurationMs: 6_000 }),
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
    expect(screen.getByRole("status")).toHaveTextContent("Nothing to save");

    rerender(
      panel(
        saveBar({ saveRequestedAt: NOW + 6_000, savedMessageDurationMs: 0 }),
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

describe("SaveActionBar focus targets", () => {
  it("sends focus where a refused save points instead of the status", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(
      (): HTMLElement => screen.getByRole("textbox", { name: "Port" }),
    );
    const { container } = renderInPanel(
      <>
        <label>
          Port
          <input />
        </label>
        {saveBar({ dirty: true, onSave })}
      </>,
    );
    const status = container.querySelector<HTMLElement>(
      ".snui-action-bar__status",
    );
    const statusFocus = vi.fn();
    status?.addEventListener("focus", statusFocus);

    await user.click(screen.getByRole("button", { name: "Save" }));

    // Focus moves once, after the handler, to the field the save refused, so
    // the status never takes it on the way.
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox", { name: "Port" })).toHaveFocus();
    expect(statusFocus).not.toHaveBeenCalled();
  });

  it("follows a returned ref, from Discard too, whatever focusOnAction says", async () => {
    const user = userEvent.setup();
    const fieldRef = createRef<HTMLInputElement>();
    renderInPanel(
      <>
        <input aria-label="Port" ref={fieldRef} />
        {saveBar({
          dirty: true,
          focusOnAction: "none",
          onDiscard: () => fieldRef,
        })}
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(fieldRef.current).toHaveFocus();
  });

  it("falls back to the status when the target cannot take focus", async () => {
    const user = userEvent.setup();
    const detached = document.createElement("input");
    const { container, rerender } = renderInPanel(
      saveBar({ dirty: true, onSave: () => detached }),
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    // A target that is not on the page cannot hold focus, and the pressed
    // button is about to disable itself, so the status is still the place.
    expect(container.querySelector(".snui-action-bar__status")).toHaveFocus();

    rerender(
      panel(saveBar({ dirty: true, onSave: () => createRef<HTMLElement>() })),
    );
    screen.getByRole("button", { name: "Save" }).focus();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(container.querySelector(".snui-action-bar__status")).toHaveFocus();
  });

  it("falls back to the status when a target on the page refuses focus", async () => {
    const user = userEvent.setup();
    const { container } = renderInPanel(
      <>
        <input aria-label="Port" disabled />
        {saveBar({
          dirty: true,
          onSave: () => screen.getByRole("textbox", { name: "Port" }),
        })}
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    // The target is connected but disabled, so focusing it does nothing. The
    // bar checks where focus actually went rather than trusting the call, so
    // the status still takes it before the pressed button disables itself.
    expect(screen.getByRole("textbox", { name: "Port" })).not.toHaveFocus();
    expect(container.querySelector(".snui-action-bar__status")).toHaveFocus();
  });

  it("moves an async handler's focus to the status without awaiting it", async () => {
    const user = userEvent.setup();
    const { container } = renderInPanel(
      <>
        <input aria-label="Port" />
        <SaveActionBar
          dirty
          onDiscard={vi.fn()}
          onSave={async () => {
            await Promise.resolve();
          }}
        />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    // A returned promise is not a target, so the bar's own rule applies.
    expect(container.querySelector(".snui-action-bar__status")).toHaveFocus();
  });

  it("leaves focus where the handler itself put it", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <input aria-label="Port" />
        {saveBar({
          dirty: true,
          onSave: () => {
            screen.getByRole("textbox", { name: "Port" }).focus();
          },
        })}
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    // The status takes focus only from the pressed button, so a handler that
    // moved focus on its own keeps the destination it chose.
    expect(screen.getByRole("textbox", { name: "Port" })).toHaveFocus();
  });
});

describe("SaveActionBar outcome", () => {
  it("shows a failed save in the bar's own status with Save still offered", () => {
    const { container } = renderInPanel(
      saveBar({
        outcome: {
          message: "Save failed. Check the connection.",
          tone: "danger",
        },
      }),
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      "Error. Save failed. Check the connection.",
    );
    expect(container.querySelector(".snui-status--danger")).not.toBeNull();
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();
    expect(save).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
  });
});

describe("SaveActionBar focus and repeated requests", () => {
  it("leaves focus alone when the panel owns the destination", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const { container } = renderInPanel(
      saveBar({ dirty: true, focusOnAction: "none", onSave }),
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
    vi.useFakeTimers({ now: NOW });
    const { rerender } = renderInPanel(saveBar({ saveRequestedAt: NOW }));

    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Nothing to save");

    // An edit and a second save inside the same millisecond carry the same
    // timestamp, and the second one is still its own request.
    rerender(panel(saveBar({ dirty: true, saveRequestedAt: NOW })));
    rerender(panel(saveBar({ saveRequestedAt: NOW })));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Save sent to the server",
    );
  });
});
