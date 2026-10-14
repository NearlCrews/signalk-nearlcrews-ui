import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactElement, type RefObject, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useClockReading } from "../../src/hooks/use-clock-reading.js";
import {
  useControllableState,
  useControllableStateWhen,
} from "../../src/hooks/use-controllable-state.js";
import { useNumberDraft } from "../../src/hooks/use-number-draft.js";
import { useResetDrafts } from "../../src/hooks/use-reset-drafts.js";
import { useResettableControl } from "../../src/hooks/use-resettable-control.js";
import { NumberInput } from "../../src/index.js";
import { SWITCH_STYLES } from "../../src/styles/switch.js";
import { useOptionalModuleStyles } from "../../src/styles/use-module-styles.js";
import { liveRegionProps } from "../../src/utils/announcement.js";
import { PanelPortalProvider } from "../../src/utils/portal.js";
import {
  LIVE_REGION_BLANK_MS,
  useAnnouncingTiming,
  useFirstMessageHold,
  useRepeatAnnouncement,
  useSettlingText,
} from "../../src/utils/repeat-announcement.js";
import { panel, renderInPanel } from "../helpers.js";

describe("useNumberDraft under a panel reset", () => {
  it("reports the reset to the callback the field last rendered with", async () => {
    const user = userEvent.setup();
    const reports: string[] = [];

    function Field({ owner }: { readonly owner: string }): ReactElement {
      const [value, setValue] = useState<number | undefined>(5);
      const draft = useNumberDraft(value, setValue, {
        min: 1,
        // Inline, as a consumer writes it: a new function every render.
        onValidityChange: (valid) => {
          reports.push(`${owner}: ${String(valid)}`);
        },
      });
      return <NumberInput aria-label="Depth" {...draft.inputProps} />;
    }

    function Panel({ owner }: { readonly owner: string }): ReactElement {
      const reset = useResetDrafts();
      return (
        <>
          <Field owner={owner} />
          <button type="button" onClick={reset}>
            Discard
          </button>
        </>
      );
    }

    const view = renderInPanel(<Panel owner="first render" />);
    await user.clear(screen.getByRole("spinbutton", { name: "Depth" }));
    expect(reports).toEqual(["first render: false"]);

    view.rerender(panel(<Panel owner="latest render" />));
    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(reports).toEqual(["first render: false", "latest render: true"]);
  });
});

describe("useOptionalModuleStyles", () => {
  function StyledControl(): ReactElement {
    useOptionalModuleStyles(SWITCH_STYLES);
    return <p>Styled control</p>;
  }

  it("stops asking for a root that never resolves, and says so once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    render(
      <PanelPortalProvider getContainer={() => null}>
        <StyledControl />
      </PanelPortalProvider>,
    );

    expect(screen.getByText("Styled control")).toBeInTheDocument();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain(
      "The switch styles were not installed",
    );
  });
});

describe("useClockReading", () => {
  it("reads the clock for each new moment, on every tick, and after a wake", () => {
    vi.useFakeTimers({ now: 100_000 });
    const initialProps: { readonly moment: number; readonly wake?: number } = {
      moment: 90_000,
    };
    const { result, rerender } = renderHook(
      ({ moment, wake }) => useClockReading(moment, 1_000, { wakeAtMs: wake }),
      { initialProps },
    );
    expect(result.current).toBe(100_000);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(101_000);

    // A new moment is measured in the render that first sees it.
    vi.setSystemTime(101_400);
    rerender({ moment: 101_400 });
    expect(result.current).toBe(101_400);

    // A wake inside the cadence reads the clock just after the instant.
    rerender({ moment: 101_400, wake: 101_700 });
    act(() => {
      vi.advanceTimersByTime(301);
    });
    expect(result.current).toBeGreaterThan(101_700);
    expect(result.current).toBeLessThan(102_000);
  });

  it("commits no reading a tick does not change", () => {
    vi.useFakeTimers({ now: 50_000 });
    const changes = vi.fn(() => false);
    const { result } = renderHook(() =>
      useClockReading(40_000, 1_000, { changes }),
    );

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(changes).toHaveBeenCalled();
    expect(result.current).toBe(50_000);
  });
});

describe("useControllableState", () => {
  it("owns the value while uncontrolled and reports each change", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState<string | undefined>(undefined, "auto", onChange),
    );

    act(() => {
      result.current[1]("night");
    });

    expect(result.current[0]).toBe("night");
    expect(onChange).toHaveBeenCalledWith("night");
  });

  it("leaves a controlled value to its owner and still reports the change", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState<string | undefined>("dark", "auto", onChange),
    );

    act(() => {
      result.current[1]("night");
    });

    expect(result.current[0]).toBe("dark");
    expect(onChange).toHaveBeenCalledWith("night");
  });

  it("writes the uncontrolled value without reporting it through the third slot", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState<string | undefined>(undefined, "auto", onChange),
    );

    act(() => {
      result.current[2]("light");
    });

    expect(result.current[0]).toBe("light");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("useControllableStateWhen", () => {
  it("keeps a controlled undefined rather than handing back the stale internal value", () => {
    const initialProps: { readonly value: number | undefined } = { value: 3 };
    const { result, rerender } = renderHook(
      ({ value }) =>
        useControllableStateWhen<number | undefined>(true, value, 5),
      { initialProps },
    );
    expect(result.current[0]).toBe(3);

    rerender({ value: undefined });

    expect(result.current[0]).toBeUndefined();
  });
});

describe("useResettableControl", () => {
  function ResettableInput({
    formKey,
    nodeRef,
    onReset,
  }: {
    readonly formKey: string;
    readonly nodeRef?: RefObject<HTMLInputElement | null>;
    readonly onReset: (node: HTMLInputElement) => void;
  }): ReactElement {
    const inputRef = useResettableControl(nodeRef, formKey, onReset);
    return <input ref={inputRef} aria-label="Depth" />;
  }

  it("puts the control back once its form reset has landed", async () => {
    const onReset = vi.fn();
    const nodeRef = { current: null } as RefObject<HTMLInputElement | null>;
    render(
      <form>
        <ResettableInput formKey="a" nodeRef={nodeRef} onReset={onReset} />
      </form>,
    );
    const input = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Depth",
    });
    expect(nodeRef.current).toBe(input);

    input.form?.reset();
    expect(onReset).not.toHaveBeenCalled();
    await act(async () => {
      await Promise.resolve();
    });

    expect(onReset).toHaveBeenCalledWith(input);
  });

  it("reads the latest handler without registering again", async () => {
    const first = vi.fn();
    const latest = vi.fn();
    const view = render(
      <form>
        <ResettableInput formKey="a" onReset={first} />
      </form>,
    );
    const { form } = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Depth",
    });
    if (form === null) throw new Error("expected the input inside its form");
    const listen = vi.spyOn(form, "addEventListener");

    view.rerender(
      <form>
        <ResettableInput formKey="a" onReset={latest} />
      </form>,
    );
    form.reset();
    await act(async () => {
      await Promise.resolve();
    });

    expect(listen).not.toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
  });
});

describe("useFirstMessageHold", () => {
  it("holds content a region mounts with for one beat", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFirstMessageHold(true));
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(LIVE_REGION_BLANK_MS);
    });

    expect(result.current).toBe(false);
  });

  it("never holds a region that mounted without holding", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ hold }: { readonly hold: boolean }) => useFirstMessageHold(hold),
      { initialProps: { hold: false } },
    );

    rerender({ hold: true });

    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useSettlingText", () => {
  it("waits for text to stop changing before exposing it", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ text }: { readonly text: string }) => useSettlingText(text, 500),
      { initialProps: { text: "3 errors" } },
    );
    // The text a region mounts with has nothing to settle from.
    expect(result.current).toBe(false);

    rerender({ text: "2 errors" });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Each change restarts the wait.
    rerender({ text: "1 error" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);
  });

  it("exposes every change at once without a positive finite wait", () => {
    const { result, rerender } = renderHook(
      ({ text }: { readonly text: string }) =>
        useSettlingText(text, Number.NaN),
      { initialProps: { text: "Saving" } },
    );

    rerender({ text: "Saved" });

    expect(result.current).toBe(false);
  });
});

describe("useRepeatAnnouncement", () => {
  it("blanks an announcing region for one beat when the key changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ announceKey }: { readonly announceKey: number }) =>
        useRepeatAnnouncement(announceKey, true),
      { initialProps: { announceKey: 1 } },
    );
    expect(result.current).toBe(false);

    rerender({ announceKey: 2 });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(LIVE_REGION_BLANK_MS);
    });
    expect(result.current).toBe(false);
  });

  it("takes a key that changes while nothing announces as already read", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({
        active,
        announceKey,
      }: {
        readonly active: boolean;
        readonly announceKey: number;
      }) => useRepeatAnnouncement(announceKey, active),
      { initialProps: { active: false, announceKey: 1 } },
    );

    rerender({ active: false, announceKey: 2 });
    rerender({ active: true, announceKey: 2 });

    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useAnnouncingTiming", () => {
  const polite = liveRegionProps("polite");

  it("holds the first message of a polite region that defers it", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useAnnouncingTiming(polite, {
        deferFirstMessage: undefined,
        hasContent: true,
        settleMs: undefined,
      }),
    );

    expect(result.current).toEqual({
      defers: true,
      echoes: false,
      holding: true,
    });
  });

  it("leaves the hold to the echo region when the content settles", () => {
    const { result } = renderHook(() =>
      useAnnouncingTiming(polite, {
        deferFirstMessage: undefined,
        hasContent: true,
        settleMs: 400,
      }),
    );

    expect(result.current).toEqual({
      defers: true,
      echoes: true,
      holding: false,
    });
  });

  it("holds nothing for a region that does not announce", () => {
    const { result } = renderHook(() =>
      useAnnouncingTiming(liveRegionProps("off"), {
        deferFirstMessage: true,
        hasContent: true,
        settleMs: 400,
      }),
    );

    expect(result.current).toEqual({
      defers: false,
      echoes: false,
      holding: false,
    });
  });
});
