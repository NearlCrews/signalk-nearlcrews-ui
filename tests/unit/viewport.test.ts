import { afterEach, describe, expect, it, vi } from "vitest";

import {
  observePanelViewport,
  readViewportEdges,
  roundedLayoutValue,
} from "../../src/utils/viewport.js";
import { installVisualViewport } from "../helpers.js";

/** Captures animation frames so a test runs them one at a time. */
function stubAnimationFrames(): {
  readonly frames: FrameRequestCallback[];
  readonly cancelled: number[];
  runAll: () => void;
} {
  const frames: FrameRequestCallback[] = [];
  const cancelled: number[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readViewportEdges", () => {
  it("falls back to the layout viewport without a visual viewport", () => {
    const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(640);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(480);

    expect(readViewportEdges(window)).toEqual({
      top: 0,
      right: 640,
      bottom: 480,
      left: 0,
    });

    if (original === undefined) {
      Reflect.deleteProperty(window, "visualViewport");
    } else {
      Object.defineProperty(window, "visualViewport", original);
    }
  });

  it("reads the visual viewport offsets and size when present", () => {
    const { restore, visualViewport } = installVisualViewport({
      height: 300,
      width: 500,
    });
    Object.assign(visualViewport, { offsetLeft: 20, offsetTop: 40 });

    expect(readViewportEdges(window)).toEqual({
      top: 40,
      right: 520,
      bottom: 340,
      left: 20,
    });
    restore();
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
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const root = document.createElement("div");
    document.body.append(root);
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

    // A nested scroller's scroll reaches the capturing document listener.
    const scroller = document.createElement("div");
    root.append(scroller);
    scroller.dispatchEvent(new Event("scroll"));
    expect(frames).toHaveLength(1);
    runAll();
    expect(onChange).toHaveBeenCalledTimes(2);

    stop();
    restore();
    root.remove();
  });

  it("stops observing and cancels the pending frame on dispose", () => {
    const { cancelled, frames, runAll } = stubAnimationFrames();
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const root = document.createElement("div");
    document.body.append(root);
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

    restore();
    root.remove();
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
    const root = document.createElement("div");
    const bar = document.createElement("div");
    const anchor = document.createElement("div");
    document.body.append(root);

    const stop = observePanelViewport(root, () => undefined, {
      resizeTargets: [anchor, bar],
    });
    expect(observed).toEqual([root, anchor, bar]);

    stop();
    expect(disconnect).toHaveBeenCalledTimes(1);
    root.remove();
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
