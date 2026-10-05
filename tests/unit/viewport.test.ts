import { describe, expect, it, vi } from "vitest";

import {
  observePanelViewport,
  readViewportEdges,
  roundedLayoutValue,
} from "../../src/utils/viewport.js";
import {
  installVisualViewport,
  replaceVisualViewport,
  stubAnimationFrames,
} from "../helpers.js";
import { attached } from "./lib/attached.js";

describe("readViewportEdges", () => {
  // lib.dom declares visualViewport as nullable, and a document that is not
  // fully active is where the null comes from.
  it.each([
    ["without a visual viewport", undefined, 640, 480],
    ["for a document that is not fully active", null, 320, 240],
  ] as const)(
    "falls back to the layout viewport %s",
    (_case, visualViewport, innerWidth, innerHeight) => {
      replaceVisualViewport(visualViewport);
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(innerWidth);
      vi.spyOn(window, "innerHeight", "get").mockReturnValue(innerHeight);

      expect(readViewportEdges(window)).toEqual({
        top: 0,
        right: innerWidth,
        bottom: innerHeight,
        left: 0,
      });
    },
  );

  it("reads the visual viewport offsets and size when present", () => {
    const visualViewport = installVisualViewport({ height: 300, width: 500 });
    Object.assign(visualViewport, { offsetLeft: 20, offsetTop: 40 });

    expect(readViewportEdges(window)).toEqual({
      top: 40,
      right: 520,
      bottom: 340,
      left: 20,
    });
  });
});

describe("roundedLayoutValue", () => {
  it("rounds to hundredths so equal geometry compares equal", () => {
    expect(roundedLayoutValue(12.3456)).toBe(12.35);
    expect(roundedLayoutValue(12.344)).toBe(12.34);
    expect(roundedLayoutValue(-0.004)).toBe(-0);
  });
});

describe("observePanelViewport", () => {
  it("coalesces every change signal into one call per frame", () => {
    const { frames, runAll } = stubAnimationFrames();
    const visualViewport = installVisualViewport({ height: 500 });
    const root = attached("div");
    const onChange = vi.fn();

    const stop = observePanelViewport(root, onChange);
    // The first frame is scheduled at once, not run synchronously.
    expect(onChange).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);

    document.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    visualViewport.dispatchEvent(new Event("resize"));
    visualViewport.dispatchEvent(new Event("scroll"));
    expect(frames).toHaveLength(1);

    runAll();
    expect(onChange).toHaveBeenCalledTimes(1);

    stop();
  });

  it("measures for a scroller the panel sits inside and ignores one inside it", () => {
    const { frames, runAll } = stubAnimationFrames();
    installVisualViewport({ height: 500 });
    const outerScroller = attached("div");
    const root = attached("div", outerScroller);
    const innerScroller = attached("div", root);
    const onChange = vi.fn();

    const stop = observePanelViewport(root, onChange);
    runAll();
    expect(onChange).toHaveBeenCalledTimes(1);

    // A grid scrolling inside the panel cannot move the panel, so the frame
    // it would have cost is never scheduled.
    innerScroller.dispatchEvent(new Event("scroll", { bubbles: true }));
    expect(frames).toHaveLength(0);

    // An ancestor scroller does move it, and so does the panel itself.
    outerScroller.dispatchEvent(new Event("scroll", { bubbles: true }));
    expect(frames).toHaveLength(1);
    runAll();
    expect(onChange).toHaveBeenCalledTimes(2);

    root.dispatchEvent(new Event("scroll", { bubbles: true }));
    runAll();
    expect(onChange).toHaveBeenCalledTimes(3);

    // A document-level scroll carries no element target and always counts.
    document.dispatchEvent(new Event("scroll"));
    runAll();
    expect(onChange).toHaveBeenCalledTimes(4);

    stop();
  });

  it("measures for a scroller that holds an extra resize target", () => {
    const { runAll } = stubAnimationFrames();
    installVisualViewport({ height: 500 });
    const root = attached("div");
    const scroller = attached("div", root);
    const anchor = attached("div", scroller);
    const onChange = vi.fn();

    const stop = observePanelViewport(root, onChange, {
      resizeTargets: [anchor],
    });
    runAll();
    expect(onChange).toHaveBeenCalledTimes(1);

    // The bar's anchor moves with this scroller even though the panel does
    // not, so its placement still has to be re-measured.
    scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
    runAll();
    expect(onChange).toHaveBeenCalledTimes(2);

    stop();
  });

  it("stops observing and cancels the pending frame on dispose", () => {
    const { cancelled, frames, runAll } = stubAnimationFrames();
    const visualViewport = installVisualViewport({ height: 500 });
    const root = attached("div");
    const onChange = vi.fn();

    const stop = observePanelViewport(root, onChange);
    expect(frames).toHaveLength(1);
    stop();
    expect(cancelled).toEqual([1]);

    // A cancelled frame that still fires does nothing, and no listener remains.
    runAll();
    document.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    visualViewport.dispatchEvent(new Event("resize"));
    expect(frames).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("observes the root and any extra resize targets when ResizeObserver exists", () => {
    const observed: Element[] = [];
    const disconnect = vi.fn();
    class FakeResizeObserver {
      observe(target: Element): void {
        observed.push(target);
      }
      disconnect(): void {
        disconnect();
      }
      unobserve(): void {
        // The observer under test never unobserves.
      }
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    stubAnimationFrames();
    const root = attached("div");
    const bar = document.createElement("div");
    const anchor = document.createElement("div");

    const stop = observePanelViewport(root, () => undefined, {
      resizeTargets: [anchor, bar],
    });
    expect(observed).toEqual([root, anchor, bar]);

    stop();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("returns a no-op disposer for a detached document without a window", () => {
    const detached = document.implementation.createHTMLDocument("detached");
    const root = detached.createElement("div");
    detached.body.append(root);
    const onChange = vi.fn();

    const stop = observePanelViewport(root, onChange);
    expect(() => {
      stop();
    }).not.toThrow();
    expect(onChange).not.toHaveBeenCalled();
  });
});
