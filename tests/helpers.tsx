/** Shared helpers for the unit specs. */

import { act, type RenderResult, render } from "@testing-library/react";
import axe from "axe-core";
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
 */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const result = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  expect(result.violations).toEqual([]);
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

/** A stub visual viewport together with the restore its spec must run. */
export interface VisualViewportStub {
  readonly restore: () => void;
  readonly visualViewport: VisualViewport;
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
): VisualViewportStub {
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
  const restore = replaceVisualViewport(visualViewport);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(innerHeight);
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(innerWidth);

  return { restore, visualViewport };
}

/**
 * Replaces `window.visualViewport`, which is null for a document that is not
 * fully active and absent on an engine that implements none, and returns the
 * restore its spec must run.
 */
export function replaceVisualViewport(
  value: VisualViewport | null | undefined,
): () => void {
  const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value,
  });
  return () => {
    if (original === undefined) {
      Reflect.deleteProperty(window, "visualViewport");
      return;
    }
    Object.defineProperty(window, "visualViewport", original);
  };
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
