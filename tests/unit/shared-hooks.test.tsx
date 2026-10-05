import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  Activity,
  createRef,
  type Ref,
  type RefObject,
  useCallback,
  useRef,
} from "react";
import { describe, expect, it, vi } from "vitest";
import {
  type FocusReturnOptions,
  type OpenIntentLatch,
  useFocusReturnOnClose,
  useOpenIntentLatch,
} from "../../src/hooks/use-focus-return.js";
import { useFocusWithin } from "../../src/hooks/use-focus-within.js";
import { useComposedRef, useNodeRef } from "../../src/hooks/use-node-ref.js";
import { useUnsavedChangesGuard } from "../../src/hooks/use-unsaved-changes-guard.js";
import {
  createRequiredContext,
  createValueContext,
} from "../../src/utils/context.js";
import {
  HeadingLevelProvider,
  useResolvedHeading,
} from "../../src/utils/heading-level.js";
import { attached } from "./lib/attached.js";
import { withFrameDocument } from "./lib/frame-document.js";

describe("useNodeRef", () => {
  interface NodeRefProbeProps {
    readonly log: string[];
    readonly ref?: Ref<HTMLDivElement> | undefined;
  }

  function NodeRefProbe({ log, ref }: NodeRefProbeProps): React.JSX.Element {
    const nodeRef = useRef<HTMLDivElement | null>(null);
    // Memoized, as the hook documents: an attachment rebuilt every render
    // would detach and reattach the node on every commit.
    const onAttach = useCallback(
      (node: HTMLDivElement) => {
        log.push(`attach ${node.id}`);
        return () => {
          log.push(`release ${node.id}`);
        };
      },
      [log],
    );
    const attachNode = useNodeRef(nodeRef, ref, onAttach);
    return <div id="panel" data-testid="panel" ref={attachNode} />;
  }

  it("attaches the node once per mount and releases it once", () => {
    const log: string[] = [];
    const callerRef = vi.fn(() => {
      log.push("caller attached");
      return () => {
        log.push("caller released");
      };
    });

    const view = render(<NodeRefProbe log={log} ref={callerRef} />);
    expect(log).toEqual(["caller attached", "attach panel"]);

    view.rerender(<NodeRefProbe log={log} ref={callerRef} />);
    expect(log).toEqual(["caller attached", "attach panel"]);

    view.unmount();
    expect(log).toEqual([
      "caller attached",
      "attach panel",
      "release panel",
      "caller released",
    ]);
  });

  it("gives the caller's ref object the node", () => {
    const ref = createRef<HTMLDivElement>();
    render(<NodeRefProbe log={[]} ref={ref} />);
    expect(ref.current).toBe(screen.getByTestId("panel"));
  });

  it("works with no caller ref at all", () => {
    const log: string[] = [];
    const view = render(<NodeRefProbe log={log} />);
    expect(log).toEqual(["attach panel"]);
    view.unmount();
    expect(log).toEqual(["attach panel", "release panel"]);
  });
});

describe("useComposedRef", () => {
  function ComposedProbe({
    ref,
  }: {
    readonly ref?: Ref<HTMLDivElement> | undefined;
  }): React.JSX.Element {
    const nodeRef = useRef<HTMLDivElement | null>(null);
    useComposedRef(nodeRef, ref);
    return <div data-testid="bar" ref={nodeRef} />;
  }

  it("hands the owned node to the caller's ref", () => {
    const ref = createRef<HTMLDivElement>();
    const view = render(<ComposedProbe ref={ref} />);
    expect(ref.current).toBe(screen.getByTestId("bar"));

    view.unmount();
    expect(ref.current).toBeNull();
  });

  it("releases the previous ref when the caller swaps it", () => {
    const first = createRef<HTMLDivElement>();
    const second = createRef<HTMLDivElement>();
    const view = render(<ComposedProbe ref={first} />);

    view.rerender(<ComposedProbe ref={second} />);
    expect(first.current).toBeNull();
    expect(second.current).toBe(screen.getByTestId("bar"));
  });

  it("attaches nothing when the component rendered no node", () => {
    function EmptyProbe(): React.JSX.Element | null {
      const nodeRef = useRef<HTMLDivElement | null>(null);
      useComposedRef(nodeRef, undefined);
      return null;
    }
    expect(() => render(<EmptyProbe />)).not.toThrow();
  });
});

describe("useFocusWithin", () => {
  let holdsFocus: RefObject<boolean> | null = null;

  function FocusWithinProbe({
    active = true,
  }: {
    readonly active?: boolean;
  }): React.JSX.Element {
    const nodeRef = useRef<HTMLDivElement | null>(null);
    holdsFocus = useFocusWithin(nodeRef, active);
    return (
      <div ref={nodeRef}>
        <button type="button" data-testid="inside">
          inside
        </button>
      </div>
    );
  }

  it("samples focus as it moves in and out of the node", () => {
    render(
      <>
        <FocusWithinProbe />
        <button type="button" data-testid="outside">
          outside
        </button>
      </>,
    );
    expect(holdsFocus?.current).toBe(false);

    act(() => {
      screen.getByTestId("inside").focus();
    });
    expect(holdsFocus?.current).toBe(true);

    act(() => {
      screen.getByTestId("outside").focus();
    });
    expect(holdsFocus?.current).toBe(false);
  });

  it("tracks nothing while it is inactive", () => {
    render(<FocusWithinProbe active={false} />);

    act(() => {
      screen.getByTestId("inside").focus();
    });
    expect(holdsFocus?.current).toBe(false);
  });

  it("samples focus in a second window, whose elements are not this window's", () => {
    withFrameDocument((frameDocument) => {
      const container = frameDocument.createElement("div");
      frameDocument.body.append(container);
      const view = render(<FocusWithinProbe />, { container });
      try {
        act(() => {
          within(container).getByTestId("inside").focus();
        });
        expect(holdsFocus?.current).toBe(true);
      } finally {
        view.unmount();
      }
    });
  });
});

describe("useFocusReturnOnClose", () => {
  interface RegionProbeProps extends FocusReturnOptions {
    readonly open: boolean;
    readonly withTrigger?: boolean;
  }

  function RegionProbe({
    capturePreviousFocus,
    open,
    withTrigger = true,
  }: RegionProbeProps): React.JSX.Element {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    useFocusReturnOnClose(containerRef, open, {
      capturePreviousFocus,
      returnFocusRef: withTrigger ? triggerRef : undefined,
    });
    return (
      <>
        <button type="button" ref={triggerRef} data-testid="trigger">
          trigger
        </button>
        <button type="button" data-testid="elsewhere">
          elsewhere
        </button>
        {open ? (
          <div ref={containerRef} data-testid="region">
            <button type="button" data-testid="close">
              close
            </button>
          </div>
        ) : null}
      </>
    );
  }

  it("returns focus to the trigger when the region held it", () => {
    const view = render(<RegionProbe open />);
    act(() => {
      screen.getByTestId("close").focus();
    });
    expect(document.activeElement).toBe(screen.getByTestId("close"));

    view.rerender(<RegionProbe open={false} />);
    expect(document.activeElement).toBe(screen.getByTestId("trigger"));
  });

  it("moves nothing when focus was somewhere else", () => {
    const view = render(<RegionProbe open />);
    act(() => {
      screen.getByTestId("elsewhere").focus();
    });

    view.rerender(<RegionProbe open={false} />);
    expect(document.activeElement).toBe(screen.getByTestId("elsewhere"));
  });

  it("returns focus to the trigger in a second window", () => {
    withFrameDocument((frameDocument) => {
      const container = frameDocument.createElement("div");
      frameDocument.body.append(container);
      const view = render(<RegionProbe open />, { container });
      try {
        const region = within(container);
        act(() => {
          region.getByTestId("close").focus();
        });

        view.rerender(<RegionProbe open={false} />);
        expect(frameDocument.activeElement).toBe(region.getByTestId("trigger"));
      } finally {
        view.unmount();
      }
    });
  });

  it("returns focus to whatever opened the region when nothing names a destination", () => {
    const view = render(
      <RegionProbe capturePreviousFocus open={false} withTrigger={false} />,
    );
    act(() => {
      screen.getByTestId("elsewhere").focus();
    });

    view.rerender(
      <RegionProbe capturePreviousFocus open withTrigger={false} />,
    );
    act(() => {
      screen.getByTestId("close").focus();
    });

    view.rerender(
      <RegionProbe capturePreviousFocus open={false} withTrigger={false} />,
    );
    expect(document.activeElement).toBe(screen.getByTestId("elsewhere"));
  });

  it("leaves a destination that is no longer in the document alone", () => {
    const opener = attached("button");
    const closed = (
      <RegionProbe capturePreviousFocus open={false} withTrigger={false} />
    );
    const opened = (
      <RegionProbe capturePreviousFocus open withTrigger={false} />
    );
    const view = render(closed);
    const openFromOpener = (): void => {
      act(() => {
        opener.focus();
      });
      view.rerender(opened);
      act(() => {
        screen.getByTestId("close").focus();
      });
    };

    // While the opener is still there, closing hands focus back to it, which
    // is what makes the second close a test of the guard and nothing else.
    openFromOpener();
    view.rerender(closed);
    expect(document.activeElement).toBe(opener);

    openFromOpener();
    opener.remove();
    const focus = vi.spyOn(opener, "focus");
    view.rerender(closed);
    expect(focus).not.toHaveBeenCalled();
  });

  it("lets go of the focus it held when a close had nowhere to return it", () => {
    const tree = (
      mode: "hidden" | "visible",
      open: boolean,
      withTrigger: boolean,
    ): React.JSX.Element => (
      <>
        <button type="button" data-testid="outside">
          outside
        </button>
        <Activity mode={mode}>
          <RegionProbe open={open} withTrigger={withTrigger} />
        </Activity>
      </>
    );
    const view = render(tree("visible", true, false));
    act(() => {
      screen.getByTestId("close").focus();
    });
    view.rerender(tree("visible", false, false));
    const outside = screen.getByTestId("outside");
    act(() => {
      outside.focus();
    });

    // A restore that moves focus clears the flag through the tracking
    // listener as well, so only a close with no destination shows whether the
    // restore itself let go. Revealing the retained subtree re-runs the closed
    // layout effect, now with a trigger to return to, and must move nothing.
    view.rerender(tree("hidden", false, true));
    view.rerender(tree("visible", false, true));
    expect(document.activeElement).toBe(outside);
  });
});

describe("useOpenIntentLatch", () => {
  let latch: OpenIntentLatch | null = null;

  function LatchProbe(): null {
    latch = useOpenIntentLatch();
    return null;
  }

  it("reports the state a press asked for exactly once", () => {
    render(<LatchProbe />);
    latch?.arm(true);

    expect(latch?.consume(false)).toBe(false);
    expect(latch?.consume(true)).toBe(true);
    expect(latch?.consume(true)).toBe(false);
  });

  it("drops a latch the owner declined", async () => {
    render(<LatchProbe />);
    latch?.arm(true);

    await Promise.resolve();
    expect(latch?.consume(true)).toBe(false);
  });
});

describe("createValueContext", () => {
  const { Provider, useValue } = createValueContext(2);

  function Reader(): React.JSX.Element {
    return <span data-testid="value">{String(useValue())}</span>;
  }

  it("reads the default outside a provider", () => {
    render(<Reader />);
    expect(screen.getByTestId("value")).toHaveTextContent("2");
  });

  it("reads the nearest provided value", () => {
    render(
      <Provider value={4}>
        <Reader />
      </Provider>,
    );
    expect(screen.getByTestId("value")).toHaveTextContent("4");
  });
});

describe("createRequiredContext", () => {
  const { Provider, useValue } = createRequiredContext<string>("Tabs");

  function Reader(): React.JSX.Element {
    return <span data-testid="value">{useValue("TabList")}</span>;
  }

  it("reads the provided value", () => {
    render(
      <Provider value="views">
        <Reader />
      </Provider>,
    );
    expect(screen.getByTestId("value")).toHaveTextContent("views");
  });

  it("names both ends when a part is rendered outside its owner", () => {
    expect(() => render(<Reader />)).toThrow(
      "signalk-nearlcrews-ui: TabList must be rendered inside Tabs.",
    );
  });
});

describe("useUnsavedChangesGuard", () => {
  function Guard({ dirty }: { readonly dirty: boolean }): null {
    useUnsavedChangesGuard(dirty);
    return null;
  }

  it("asks in both of the ways the supported engines read", () => {
    const registered: ((event: BeforeUnloadEvent) => void)[] = [];
    vi.spyOn(window, "addEventListener").mockImplementation(
      (type, listener) => {
        if (type === "beforeunload") {
          registered.push(listener as (event: BeforeUnloadEvent) => void);
        }
      },
    );

    render(<Guard dirty />);
    const preventDefault = vi.fn();
    const stub = { preventDefault, returnValue: undefined as unknown };
    registered[0]?.(stub as unknown as BeforeUnloadEvent);

    expect(preventDefault).toHaveBeenCalledOnce();
    // The legacy half of the same guard: engines that ignore preventDefault
    // still read the assigned value, so the guard sets both.
    expect(stub.returnValue).toBe(true);
  });

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

describe("useResolvedHeading", () => {
  function TitledProbe({
    headingLevel,
  }: {
    readonly headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  }): React.JSX.Element {
    const { Heading, level } = useResolvedHeading(headingLevel);
    return <Heading data-testid="title">{`level ${String(level)}`}</Heading>;
  }

  it("takes the level the surrounding shell set", () => {
    render(
      <HeadingLevelProvider value={3}>
        <TitledProbe />
      </HeadingLevelProvider>,
    );

    const title = screen.getByTestId("title");
    expect(title.tagName).toBe("H3");
    expect(title).toHaveTextContent("level 3");
  });

  it("lets an explicit level decide, and heads at level 2 outside a shell", () => {
    render(
      <>
        <TitledProbe />
        <HeadingLevelProvider value={3}>
          <span data-testid="explicit">
            <TitledProbe headingLevel={5} />
          </span>
        </HeadingLevelProvider>
      </>,
    );

    expect(screen.getAllByTestId("title")[0]?.tagName).toBe("H2");
    expect(
      screen.getByTestId("explicit").querySelector("h5"),
    ).toBeInTheDocument();
  });
});
