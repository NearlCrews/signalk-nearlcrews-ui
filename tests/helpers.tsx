/** Shared helpers for the unit specs. */

import { act, type RenderResult, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, vi } from "vitest";

import { PanelRoot, type PanelRootProps } from "../src/index.js";

/**
 * Runs axe over a rendered container and fails on any violation.
 *
 * One rule set for every jsdom fixture: axe's full default set, best-practice
 * rules included, minus color-contrast. Two fixtures with two configurations
 * meant a component was audited more or less strictly depending on which file
 * it was added to. Contrast is the one exclusion because jsdom computes no
 * rendered colors; the browser suite grades contrast against real layout and
 * the token pairs are audited directly in the contrast spec.
 *
 * The engine is loaded here rather than at the top of the module, because
 * nearly every spec imports these helpers and only a handful run a sweep.
 */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const { default: axe } = await import("axe-core");
  const result = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  expect(result.violations).toEqual([]);
}

/**
 * Advances the fake timers inside `act`, so the state updates the elapsed
 * timers schedule are committed before the spec asserts on them.
 */
export function advanceTimers(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/**
 * Awaits two animation frames, which is longer than any frame a component
 * schedules for itself, so a spec can assert that nothing further happened.
 */
export async function flushAnimationFrames(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

/** Captured animation frames, the handles cancelled, and a way to run them. */
export interface AnimationFrameStub {
  readonly cancelled: number[];
  readonly frames: FrameRequestCallback[];
  readonly runAll: () => void;
}

/**
 * Captures animation frames so a spec runs them one at a time.
 *
 * jsdom schedules real frames, which a spec asserting what one frame did
 * cannot observe, so both the viewport measurements and the docking chrome
 * drive their frames from here.
 */
export function stubAnimationFrames(): AnimationFrameStub {
  const frames: FrameRequestCallback[] = [];
  const cancelled: number[] = [];
  // Counted apart from the queue, which runAll empties: the real scheduler
  // never repeats a handle, and a repeat would make `cancelled` ambiguous.
  let handle = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    handle += 1;
    return handle;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((handle) => {
    cancelled.push(handle);
  });
  return {
    cancelled,
    frames,
    runAll: () => {
      const pending = frames.splice(0);
      for (const frame of pending) frame(0);
    },
  };
}

/** Options for {@link installVisualViewport}. Sizes are CSS pixels. */
export interface VisualViewportOptions {
  readonly height: number;
  readonly innerHeight?: number;
  readonly innerWidth?: number;
  readonly width?: number;
}

/**
 * Installs a stub visual viewport and fixed window metrics, which jsdom does
 * not provide, so viewport-driven layout can be exercised. Mutate the returned
 * stub and dispatch its events to model a viewport change.
 */
export function installVisualViewport(
  options: VisualViewportOptions,
): VisualViewport {
  const { height, innerHeight = 600, innerWidth = 800, width = 800 } = options;
  const visualViewport = Object.assign(new EventTarget(), {
    height,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    width,
  }) as VisualViewport;
  replaceVisualViewport(visualViewport);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(innerHeight);
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(innerWidth);

  return visualViewport;
}

/**
 * Replaces `window.visualViewport`, which is null for a document that is not
 * fully active and absent on an engine that implements none. Vitest hands the
 * stubbed global back before the next test, whether this one passed or
 * failed, so no spec restores it.
 */
export function replaceVisualViewport(
  value: VisualViewport | null | undefined,
): void {
  vi.stubGlobal("visualViewport", value);
}

/**
 * Answers the reduced-motion preference, which jsdom cannot answer. Every
 * other query reads as unmatched.
 */
export function stubReducedMotion(reduced = true): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query === "(prefers-reduced-motion: reduce)",
    media: query,
  }));
}

/**
 * Stubs `document.hidden` as visible and returns a setter that changes it and
 * announces the change. The shared clock reads the flag only when
 * `visibilitychange` fires, so the two have to move together.
 */
export function stubDocumentHidden(): (hidden: boolean) => void {
  const spy = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  return (hidden) => {
    spy.mockReturnValue(hidden);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  };
}

/** The part of a console spy the two readers below consume. */
interface RecordedCalls {
  readonly mock: { readonly calls: readonly (readonly unknown[])[] };
}

/** The first argument of every call a console spy recorded, as text. */
export function loggedMessages(spy: RecordedCalls): string[] {
  return spy.mock.calls.map(([message]) => String(message));
}

/** The calls a console spy recorded with `text` in any string argument. */
export function callsMentioning(
  spy: RecordedCalls,
  text: string,
): (readonly unknown[])[] {
  return spy.mock.calls.filter((args) =>
    args.some((arg) => typeof arg === "string" && arg.includes(text)),
  );
}

/** The root sheet `PanelRoot` installs in the head. */
export const ROOT_SHEET = "style[data-snui-styles]";

/** The per-component module sheets installed beside the root sheet. */
export const MODULE_SHEET = "style[data-snui-module-styles]";

/** The style elements in a document's head that match `selector`. */
export function headSheets(
  selector: string,
  ownerDocument: Document = document,
): HTMLStyleElement[] {
  return [...ownerDocument.head.querySelectorAll<HTMLStyleElement>(selector)];
}

/** Whether `second` comes after `first` in document order. */
export function follows(first: Element, second: Element): boolean {
  return Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

/** Returns the form a control joined, failing loudly when it joined none. */
export function formOf(control: HTMLElement): HTMLFormElement {
  const form = control.closest("form");
  if (form === null) throw new Error("Control did not join its form.");
  return form;
}

/** The element a trigger names in `aria-controls`, or null when none has that id. */
export function controlledBy(trigger: HTMLElement): HTMLElement | null {
  return trigger.ownerDocument.getElementById(
    trigger.getAttribute("aria-controls") ?? "",
  );
}

/** Returns the panel root a container holds, failing loudly when it holds none. */
export function panelRootOf(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>(".snui-root");
  if (root === null) throw new Error("Container holds no panel root.");
  return root;
}

/** Wraps children in a PanelRoot so overlays portal and theme resolves. */
export function panel(
  children: ReactNode,
  props?: Omit<PanelRootProps, "children">,
): React.JSX.Element {
  return <PanelRoot {...props}>{children}</PanelRoot>;
}

/** Renders children inside a PanelRoot. */
export function renderInPanel(
  children: ReactNode,
  props?: Omit<PanelRootProps, "children">,
): RenderResult {
  return render(panel(children, props));
}
