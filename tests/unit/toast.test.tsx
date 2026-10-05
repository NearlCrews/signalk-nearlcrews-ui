import {
  act,
  fireEvent,
  type RenderResult,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createRef } from "react";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button, PanelRoot, type PanelRootProps } from "../../src/index.js";
import {
  createToastQueue,
  Dialog,
  type ToastContent,
  type ToastQueue,
  ToastRegion,
  type ToastRegionProps,
  toast,
} from "../../src/overlays.js";
import { visuallyHiddenDeclarations } from "../../src/styles/fragments.js";
import { TOAST_STYLES } from "../../src/styles/toast.js";
import { TRANSITION_FAST_MS } from "../../src/styles/tokens.js";
import { OVERLAY_TONE_ACCENT_BAR_DECLARATIONS } from "../../src/styles/tone-rules.js";
import { LIVE_REGION_BLANK_MS } from "../../src/utils/repeat-announcement.js";
import { ruleBody, SEMANTIC_TONES, stylesFrom } from "../css-helpers.js";
import {
  advanceTimers,
  headSheets,
  installVisualViewport,
  MODULE_SHEET,
  panel,
  panelRootOf,
  ROOT_SHEET,
  renderInPanel,
  stubReducedMotion,
} from "../helpers.js";

function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an item at index ${String(index)}`);
  }
  return item;
}

function flush(): void {
  advanceTimers(0);
}

function renderToastRegion(
  queue: ToastQueue,
  props?: Omit<ToastRegionProps, "queue">,
  panelProps?: Omit<PanelRootProps, "children">,
): RenderResult {
  const result = renderInPanel(
    <ToastRegion queue={queue} {...props} />,
    panelProps,
  );
  // The region resolves its portal container one tick after mount.
  flush();
  return result;
}

/** Mounts a region over a queue of its own and hands both back. */
function mountRegion(
  props?: Omit<ToastRegionProps, "queue">,
): RenderResult & { queue: ToastQueue } {
  const queue = createToastQueue();
  return { ...renderToastRegion(queue, props), queue };
}

/**
 * Mounts a region over a queue of its own beside a Save button, the control
 * focus stands on before a toast takes it.
 */
function mountBesideSave(): RenderResult & {
  queue: ToastQueue;
  save: HTMLElement;
} {
  const queue = createToastQueue();
  const view = renderInPanel(
    <>
      <Button>Save</Button>
      <ToastRegion queue={queue} />
    </>,
  );
  flush();
  return { ...view, queue, save: screen.getByRole("button", { name: "Save" }) };
}

function enqueue(queue: ToastQueue, content: ToastContent): string {
  let key = "";
  act(() => {
    key = queue.enqueue(content);
  });
  flush();
  return key;
}

/** As many titles as a queue holds toasts. */
const FULL_QUEUE = ["One", "Two", "Three", "Four", "Five"] as const;

/** The titles that fill a queue behind a toast already in it. */
const REST_OF_FULL_QUEUE = FULL_QUEUE.slice(1);

/** Enqueues one toast per title, each with the same content beside it. */
function enqueueEach(
  queue: ToastQueue,
  titles: readonly string[],
  content: Omit<ToastContent, "title"> = {},
): void {
  for (const title of titles) enqueue(queue, { ...content, title });
}

// The exit timer outlives the fast transition by ten milliseconds.
const EXIT_MS = TRANSITION_FAST_MS + 10;

/** The toast card that wraps an element. */
function cardAround(element: HTMLElement): HTMLElement {
  const card = element.closest<HTMLElement>(".snui-toast");
  if (card === null) throw new Error("expected a toast card");
  return card;
}

/** Every toast card in the document, newest first. */
function toastCards(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(".snui-toast")];
}

/** The newest toast card. */
function toastCard(): HTMLElement {
  return at(toastCards(), 0);
}

/** The dismiss button inside a card, or the only one on screen. */
function dismissButton(scope?: HTMLElement): HTMLElement {
  return (scope ? within(scope) : screen).getByRole("button", {
    name: "Dismiss",
  });
}

/** The host every region in the panel renders into. */
function toastHost(): HTMLElement {
  const host = document.querySelector<HTMLElement>(".snui-toast-region-host");
  if (host === null) throw new Error("expected a host");
  return host;
}

/** Fails unless no toast card is left in the document. */
function expectNoCards(): void {
  expect(document.querySelector(".snui-toast")).toBeNull();
}

/** The host's persistent region for one announcement mode. */
function announcer(mode: "assertive" | "polite"): HTMLElement {
  const region = document.querySelector<HTMLElement>(
    `.snui-toast-region-host > [role="${mode === "assertive" ? "alert" : "status"}"]`,
  );
  if (region === null) throw new Error(`expected a ${mode} region`);
  return region;
}

/** The lines a host region carries, one per toast it has spoken. */
function spokenLines(mode: "assertive" | "polite"): string[] {
  return [...announcer(mode).children].map((line) => line.textContent);
}

/** The card whose title reads `title`. */
function cardOf(title: string): HTMLElement {
  return cardAround(screen.getByText(title));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  toast.clear();
});

describe("createToastQueue", () => {
  it("enqueues, dismisses, and clears with fresh snapshots and notifications", () => {
    const queue = createToastQueue();
    const listener = vi.fn();
    queue.subscribe(listener);

    const before = queue.getSnapshot();
    const firstKey = queue.enqueue({ title: "One" });
    const secondKey = queue.enqueue({ title: "Two" });

    expect(firstKey).not.toBe(secondKey);
    expect(queue.getSnapshot()).not.toBe(before);
    expect(queue.getSnapshot().map((queued) => queued.content.title)).toEqual([
      "One",
      "Two",
    ]);
    expect(queue.getSnapshot()[0]?.key).toBe(firstKey);
    expect(listener).toHaveBeenCalledTimes(2);

    queue.dismiss(firstKey);
    expect(queue.getSnapshot().map((queued) => queued.content.title)).toEqual([
      "Two",
    ]);
    expect(listener).toHaveBeenCalledTimes(3);

    queue.clear();
    expect(queue.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("ignores unknown keys and empty clears without notifying", () => {
    const queue = createToastQueue();
    const listener = vi.fn();
    queue.subscribe(listener);
    queue.enqueue({ title: "One" });
    const snapshot = queue.getSnapshot();
    queue.dismiss("snui-toast-missing");
    expect(queue.getSnapshot()).toBe(snapshot);

    const empty = createToastQueue();
    const emptyListener = vi.fn();
    empty.subscribe(emptyListener);
    empty.clear();
    expect(emptyListener).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    const queue = createToastQueue();
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);
    unsubscribe();
    queue.enqueue({ title: "One" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("isolates queues from each other", () => {
    const first = createToastQueue();
    const second = createToastQueue();
    first.enqueue({ title: "One" });
    expect(second.getSnapshot()).toEqual([]);
    second.clear();
    expect(first.getSnapshot()).toHaveLength(1);
  });
});

describe("ToastRegion", () => {
  it("keeps the notification region inside device safe areas", () => {
    const { container } = mountRegion();
    // The overlay module sheet installs beside the root sheet on mount.
    const styles = headSheets(
      `${ROOT_SHEET}, ${MODULE_SHEET}`,
      container.ownerDocument,
    )
      .map((element) => element.textContent)
      .join("\n");

    expect(styles).toContain("env(safe-area-inset-top, 0px)");
    expect(styles).toContain("env(safe-area-inset-bottom, 0px)");
    expect(styles).toContain("env(safe-area-inset-right, 0px)");
    expect(styles).toContain("env(safe-area-inset-left, 0px)");
    expect(styles).toContain(".snui-toast-region-host");
    expect(styles).toContain("position: fixed");
    expect(styles).toContain("left: var(--snui-toast-host-left, 0px)");
    expect(styles).not.toContain(
      "inset-inline-start: var(--snui-toast-host-left, 0px)",
    );
    expect(styles).toContain("overscroll-behavior: contain");
  });

  it("renders the notifications landmark only while toasts exist", () => {
    const { queue } = mountRegion();
    expect(screen.queryByRole("region")).toBeNull();

    enqueue(queue, { title: "Synced" });
    expect(
      screen.getByRole("region", { name: "Notifications" }),
    ).toBeInTheDocument();

    fireEvent.click(dismissButton());
    advanceTimers(EXIT_MS);
    expect(screen.queryByRole("region")).toBeNull();
    // The shared host stays mounted for the next toast.
    expect(toastHost()).toBeInTheDocument();
  });

  it("places the host before the panel content so notifications are one Tab away", () => {
    const { container, queue } = mountRegion();
    enqueue(queue, { title: "Synced" });

    const host = toastHost();
    expect(panelRootOf(container).firstElementChild).toBe(host);
    expect(host.nextElementSibling).toHaveClass("snui-root__content");
  });

  it("renders enqueued toasts inside the panel root portal", () => {
    const { container, queue } = mountRegion();
    enqueue(queue, { title: "Waypoints synced", description: "12 sent" });

    const region = screen.getByRole("region", { name: "Notifications" });
    expect(panelRootOf(container)).toContainElement(region);
    expect(screen.getByText("Waypoints synced")).toBeInTheDocument();
    expect(screen.getByText("12 sent")).toBeInTheDocument();
    // The semantic tone name precedes the title for screen readers.
    expect(
      within(cardOf("Waypoints synced")).getByText(/Information\./),
    ).toBeInTheDocument();
  });

  it("renders newest first", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "First" });
    enqueue(queue, { title: "Second" });

    const cards = toastCards();
    expect(cards).toHaveLength(2);
    expect(within(at(cards, 0)).getByText("Second")).toBeInTheDocument();
    expect(within(at(cards, 1)).getByText("First")).toBeInTheDocument();
  });

  it("auto-dismisses after the default duration with an exit transition", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Synced" });

    expect(toastCard()).not.toHaveAttribute("data-exiting");
    advanceTimers(4999);
    expect(toastCard()).not.toHaveAttribute("data-exiting");
    advanceTimers(1);
    expect(toastCard()).toHaveAttribute("data-exiting", "true");
    advanceTimers(EXIT_MS);
    expectNoCards();
  });

  it("keeps warning and danger toasts until dismissed by default", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Save failed", tone: "danger" });
    enqueue(queue, { title: "Depth stale", tone: "warning" });
    enqueue(queue, { title: "Saved", tone: "success" });

    advanceTimers(5000);
    expect(cardOf("Save failed")).not.toHaveAttribute("data-exiting");
    expect(cardOf("Depth stale")).not.toHaveAttribute("data-exiting");
    expect(cardOf("Saved")).toHaveAttribute("data-exiting", "true");
    advanceTimers(60000);
    expect(screen.getByText("Save failed")).toBeInTheDocument();
    expect(screen.getByText("Depth stale")).toBeInTheDocument();
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("lets a caller time out a danger toast explicitly", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Save failed", tone: "danger", duration: 300 });

    advanceTimers(300);
    expect(toastCard()).toHaveAttribute("data-exiting", "true");
  });

  it("honors a custom duration", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Synced", duration: 250 });

    advanceTimers(249);
    expect(toastCard()).not.toHaveAttribute("data-exiting");
    advanceTimers(1);
    expect(toastCard()).toHaveAttribute("data-exiting", "true");
  });

  it("keeps a duration of zero sticky until dismissed", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Anchor alarm", tone: "danger", duration: 0 });

    const card = toastCard();
    fireEvent.pointerOver(card);
    advanceTimers(60000);
    fireEvent.pointerOut(card);
    advanceTimers(60000);
    expect(toastCard()).toBeInTheDocument();

    fireEvent.click(dismissButton(card));
    advanceTimers(EXIT_MS);
    expectNoCards();
  });

  it.each([
    ["Infinity", Number.POSITIVE_INFINITY],
    ["NaN", Number.NaN],
    ["a delay past the timer cap", 2_147_483_648],
  ])(
    "keeps a toast whose duration no timer can wait until dismissed (%s)",
    (_case, duration) => {
      const { queue } = mountRegion();
      enqueue(queue, { title: "Anchor watch", duration });

      advanceTimers(60_000);
      expect(toastCard()).not.toHaveAttribute("data-exiting");

      fireEvent.click(dismissButton(toastCard()));
      advanceTimers(EXIT_MS);
      expectNoCards();
    },
  );

  it("keeps the toasts of a region whose default no timer can wait", () => {
    const { queue } = mountRegion({
      defaultDuration: Number.POSITIVE_INFINITY,
    });
    enqueue(queue, { title: "Synced" });

    advanceTimers(60_000);
    expect(toastCard()).not.toHaveAttribute("data-exiting");
  });

  it("pauses auto-dismiss while hovered and resumes with the remaining time", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Synced", duration: 1000 });
    const card = toastCard();

    advanceTimers(400);
    fireEvent.pointerOver(card);
    advanceTimers(10000);
    expect(toastCard()).toBeInTheDocument();

    fireEvent.pointerOut(card);
    advanceTimers(599);
    expect(toastCard()).toBeInTheDocument();
    advanceTimers(1);
    expect(toastCard()).toHaveAttribute("data-exiting", "true");
  });

  it("pauses auto-dismiss while focused and resumes after blur", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Synced", duration: 1000 });
    const card = toastCard();

    advanceTimers(300);
    fireEvent.focusIn(card);
    advanceTimers(10000);
    expect(toastCard()).toBeInTheDocument();

    fireEvent.focusOut(card);
    advanceTimers(699);
    expect(toastCard()).toBeInTheDocument();
    advanceTimers(1);
    expect(toastCard()).toHaveAttribute("data-exiting", "true");
  });

  it("stays paused until both hover and focus release", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Synced", duration: 1000 });
    const card = toastCard();

    fireEvent.pointerOver(card);
    fireEvent.focusIn(card);
    fireEvent.pointerOut(card);
    advanceTimers(10000);
    expect(toastCard()).toBeInTheDocument();

    fireEvent.focusOut(card);
    advanceTimers(999);
    expect(toastCard()).toBeInTheDocument();
    advanceTimers(1);
    expect(toastCard()).toHaveAttribute("data-exiting", "true");
  });

  it("dismisses a single toast from its button and keeps the rest", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "First" });
    enqueue(queue, { title: "Second" });

    const newest = toastCard();
    fireEvent.click(dismissButton(newest));
    expect(newest).toHaveAttribute("data-exiting", "true");
    expect(screen.getByText("First")).toBeInTheDocument();

    advanceTimers(EXIT_MS);
    expect(screen.queryByText("Second")).toBeNull();
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("ignores a repeated dismiss while exiting", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Synced" });

    const button = dismissButton();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(toastCard()).toHaveAttribute("data-exiting", "true");
    advanceTimers(EXIT_MS);
    expectNoCards();
  });

  it("drops the oldest toast when the queue is full", () => {
    const { queue } = mountRegion();
    enqueueEach(queue, FULL_QUEUE, { duration: 0 });
    enqueue(queue, { title: "Six", duration: 0 });

    expect(toastCards()).toHaveLength(5);
    expect(screen.queryByText("One")).toBeNull();
    expect(screen.getByText("Six")).toBeInTheDocument();
  });

  it("retains the focused toast when the queue overflows", () => {
    const { queue } = mountRegion();
    enqueueEach(queue, FULL_QUEUE, { duration: 0 });
    const dismiss = dismissButton(cardOf("One"));
    dismiss.focus();
    expect(dismiss).toHaveFocus();

    enqueue(queue, { title: "Six", duration: 0 });

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.queryByText("Two")).toBeNull();
    expect(dismiss).toHaveFocus();
  });

  it("retains shared-queue focus when an unfocused duplicate card unmounts", () => {
    const queue = createToastQueue();
    const tree = (showPrimary: boolean) => (
      <PanelRoot>
        {showPrimary ? (
          <ToastRegion key="primary" queue={queue} label="Primary" />
        ) : null}
        <ToastRegion key="secondary" queue={queue} label="Secondary" />
      </PanelRoot>
    );
    const view = render(tree(true));
    flush();
    enqueue(queue, { title: "Focused", duration: 0 });

    const secondary = screen.getByRole("region", { name: "Secondary" });
    const dismiss = dismissButton(secondary);
    dismiss.focus();
    expect(dismiss).toHaveFocus();

    view.rerender(tree(false));
    flush();
    expect(dismiss).toHaveFocus();
    for (const title of ["Two", "Three", "Four", "Five", "Six"]) {
      enqueue(queue, { title, duration: 0 });
    }

    expect(screen.getByText("Focused")).toBeInTheDocument();
    expect(screen.queryByText("Two")).toBeNull();
  });

  it.each([
    // Danger is sticky by default, so no explicit duration is needed.
    ["a danger toast", { tone: "danger" }],
    ["a zero-duration toast", { duration: 0 }],
  ] as const)(
    "keeps %s ahead of timed notices when the queue overflows",
    (_case, sticky) => {
      const { queue } = mountRegion();
      enqueue(queue, { title: "Held", ...sticky });
      enqueueEach(queue, REST_OF_FULL_QUEUE);

      enqueue(queue, { title: "Six" });

      expect(screen.getByText("Held")).toBeInTheDocument();
      expect(screen.queryByText("Two")).toBeNull();
      expect(screen.getByText("Six")).toBeInTheDocument();
    },
  );

  it("mounts one polite and one assertive region with the host, before any toast", () => {
    mountRegion();
    const host = toastHost();

    for (const mode of ["polite", "assertive"] as const) {
      const region = announcer(mode);
      expect(region.parentElement).toBe(host);
      expect(region).toBeEmptyDOMElement();
      expect(region).toHaveClass("snui-visually-hidden");
      // Each toast adds a line, and only the new line is read.
      expect(region).toHaveAttribute("aria-atomic", "false");
      // The role already announces, so aria-live is not doubled beside it.
      expect(region).not.toHaveAttribute("aria-live");
    }
    expect(announcer("polite")).toHaveAttribute("role", "status");
    expect(announcer("assertive")).toHaveAttribute("role", "alert");
    expectNoCards();
  });

  it("speaks a toast through the host and leaves the card silent", () => {
    const { queue } = mountRegion();
    advanceTimers(LIVE_REGION_BLANK_MS);
    enqueue(queue, { title: "Waypoints synced", description: "12 sent" });

    // The tone name leads, the glyph stays silent, and the title and the
    // description read as two sentences.
    expect(spokenLines("polite")).toEqual([
      "Information. Waypoints synced. 12 sent.",
    ]);
    expect(spokenLines("assertive")).toEqual([]);
    // The card is not a live region, so focus entering it reads it once.
    const card = cardOf("Waypoints synced");
    expect(card.querySelector("[role='status'], [role='alert']")).toBeNull();
    expect(card.querySelector("[aria-live]")).toBeNull();
    expect(dismissButton(card)).toBeInTheDocument();
  });

  it("routes each tone to its region and honors an explicit live override", () => {
    const { queue } = mountRegion();
    advanceTimers(LIVE_REGION_BLANK_MS);
    enqueue(queue, { title: "Failed", tone: "danger" });
    enqueue(queue, { title: "Low oil", tone: "warning" });
    enqueue(queue, { title: "Saved", tone: "success" });
    enqueue(queue, { title: "Quiet", tone: "danger", live: "off" });
    enqueue(queue, { title: "Gentle failure", tone: "danger", live: "polite" });

    // Only danger interrupts; a warning in a configuration panel waits its
    // turn, and a silent toast is shown without being spoken.
    expect(spokenLines("assertive")).toEqual(["Error. Failed."]);
    expect(spokenLines("polite")).toEqual([
      "Warning. Low oil.",
      "Success. Saved.",
      "Error. Gentle failure.",
    ]);
    expect(screen.getByText("Quiet")).toBeInTheDocument();
  });

  it("waits out the blank beat when a toast arrives together with the host", () => {
    const queue = createToastQueue();
    act(() => {
      queue.enqueue({ title: "Queued before mount", duration: 0 });
    });
    renderToastRegion(queue);

    // The card shows at once; its words reach the region only after the
    // region has existed long enough for a screen reader to observe it.
    expect(screen.getByText("Queued before mount")).toBeInTheDocument();
    expect(spokenLines("polite")).toEqual([]);
    advanceTimers(LIVE_REGION_BLANK_MS - 1);
    expect(spokenLines("polite")).toEqual([]);
    advanceTimers(1);
    expect(spokenLines("polite")).toEqual([
      "Information. Queued before mount.",
    ]);
  });

  it("waits out the beat again when the host is inserted anew", () => {
    const queue = createToastQueue();
    const tree = (second: boolean) => (
      <PanelRoot>
        <ToastRegion queue={queue} />
        {second ? <ToastRegion queue={createToastQueue()} /> : null}
      </PanelRoot>
    );
    const view = render(tree(false));
    flush();
    advanceTimers(LIVE_REGION_BLANK_MS);
    const host = toastHost();

    // A host page that removes the host gets it back on the next acquire,
    // and the reinserted regions are new to a screen reader.
    host.remove();
    view.rerender(tree(true));
    flush();
    expect(host).toBeInTheDocument();
    enqueue(queue, { title: "Reattached", duration: 0 });
    expect(spokenLines("polite")).toEqual([]);
    advanceTimers(LIVE_REGION_BLANK_MS);
    expect(spokenLines("polite")).toEqual(["Information. Reattached."]);
  });

  it("reads a burst in the order the queue received it", () => {
    const { queue } = mountRegion();
    advanceTimers(LIVE_REGION_BLANK_MS);
    act(() => {
      queue.enqueue({ title: "First", duration: 0 });
      queue.enqueue({ title: "Second", duration: 0 });
    });
    flush();

    // Cards stack newest first, but the words are read in arrival order.
    expect(spokenLines("polite")).toEqual([
      "Information. First.",
      "Information. Second.",
    ]);
  });

  it("takes a toast's line away when the toast leaves", () => {
    const { queue, unmount } = mountRegion();
    advanceTimers(LIVE_REGION_BLANK_MS);
    enqueue(queue, { title: "Synced", duration: 0 });
    enqueue(queue, { title: "Save failed", tone: "danger" });
    expect(spokenLines("polite")).toHaveLength(1);
    expect(spokenLines("assertive")).toHaveLength(1);

    fireEvent.click(dismissButton(cardOf("Synced")));
    advanceTimers(EXIT_MS);
    expect(spokenLines("polite")).toEqual([]);
    expect(spokenLines("assertive")).toEqual(["Error. Save failed."]);

    const host = document.querySelector(".snui-toast-region-host");
    unmount();
    expect(host).not.toBeInTheDocument();
  });

  it("drops only its own lines when one of two regions on a host unmounts", () => {
    const engine = createToastQueue();
    const network = createToastQueue();
    const tree = (showEngine: boolean) => (
      <PanelRoot>
        {showEngine ? <ToastRegion queue={engine} label="Engine" /> : null}
        <ToastRegion queue={network} label="Network" />
      </PanelRoot>
    );
    const view = render(tree(true));
    flush();
    advanceTimers(LIVE_REGION_BLANK_MS);
    enqueue(engine, { title: "Oil pressure", duration: 0 });
    enqueue(network, { title: "Link lost", duration: 0 });
    expect(spokenLines("polite")).toEqual([
      "Information. Oil pressure.",
      "Information. Link lost.",
    ]);

    view.rerender(tree(false));
    flush();
    expect(spokenLines("polite")).toEqual(["Information. Link lost."]);
  });

  it("speaks the bundled tone name and the caller's own", () => {
    const queue = createToastQueue();
    renderToastRegion(queue, undefined, {
      labels: { tone: { success: "Gelukt" } },
    });
    advanceTimers(LIVE_REGION_BLANK_MS);
    enqueue(queue, { title: "Opgeslagen", tone: "success" });
    enqueue(queue, { title: "Guardado", tone: "success", toneLabel: "Listo" });

    expect(spokenLines("polite")).toEqual([
      "Gelukt. Opgeslagen.",
      "Listo. Guardado.",
    ]);
  });

  it("reads rendered content as text and skips what is hidden from readers", () => {
    const { queue } = mountRegion();
    advanceTimers(LIVE_REGION_BLANK_MS);
    enqueue(queue, {
      title: (
        <>
          Route <strong>Harbor run</strong> saved
        </>
      ),
      description: (
        <>
          <span aria-hidden="true">→ </span>
          <a href="#routes">Open routes</a>
        </>
      ),
      duration: 0,
    });

    expect(spokenLines("polite")).toEqual([
      "Information. Route Harbor run saved. Open routes.",
    ]);
    // Only words reach the region: a link in the card is not copied into it.
    expect(announcer("polite").querySelector("a, strong")).toBeNull();
  });

  it("localizes the dismiss label and falls back when blank", () => {
    const { queue } = mountRegion({ dismissLabel: "Cerrar" });
    enqueue(queue, { title: "Guardado" });
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();

    const blank = createToastQueue();
    renderToastRegion(blank, { dismissLabel: "  ", label: "Avisos" });
    enqueue(blank, { title: "Hecho" });
    expect(dismissButton()).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Avisos" })).toBeInTheDocument();
  });

  it("localizes the tone label and falls back when blank", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Guardado", tone: "success", toneLabel: "Listo" });
    enqueue(queue, { title: "Stored", tone: "success", toneLabel: " " });

    expect(within(cardOf("Guardado")).getByText(/Listo\./)).toBeInTheDocument();
    expect(within(cardOf("Stored")).getByText(/Success\./)).toBeInTheDocument();
  });

  it("clears every toast at once", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "First" });
    enqueue(queue, { title: "Second" });
    act(() => {
      queue.clear();
    });
    expectNoCards();
  });

  it("keeps multiple regions and queues isolated", () => {
    const first = createToastQueue();
    const second = createToastQueue();
    renderInPanel(
      <>
        <ToastRegion queue={first} label="Engine" />
        <ToastRegion queue={second} label="Network" />
      </>,
    );
    flush();

    enqueue(first, { title: "Oil pressure" });
    const engine = screen.getByRole("region", { name: "Engine" });
    expect(within(engine).getByText("Oil pressure")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Network" })).toBeNull();

    enqueue(second, { title: "Link lost" });
    const network = screen.getByRole("region", { name: "Network" });
    expect(within(network).queryByText("Oil pressure")).toBeNull();
    const host = engine.parentElement;
    expect(host).toHaveClass("snui-toast-region-host");
    expect(host).toBe(network.parentElement);
    expect(host?.querySelectorAll(":scope > .snui-toast-region")).toHaveLength(
      2,
    );
    act(() => {
      first.clear();
    });
    // The emptied region drops its landmark; the other keeps its toast.
    expect(engine).not.toBeInTheDocument();
    expect(screen.queryByText("Oil pressure")).toBeNull();
    expect(within(network).getByText("Link lost")).toBeInTheDocument();
  });

  it("serves the shared toast queue", () => {
    renderToastRegion(toast);
    enqueue(toast, { title: "Shared notice" });
    expect(screen.getByText("Shared notice")).toBeInTheDocument();
  });

  it("rejects rendering outside a PanelRoot", () => {
    const queue = createToastQueue();
    expect(() => render(<ToastRegion queue={queue} />)).toThrow(
      "signalk-nearlcrews-ui: ToastRegion must be rendered inside PanelRoot.",
    );
  });

  it("rejects a nested provider that redirects its portal outside PanelRoot", () => {
    const queue = createToastQueue();
    expect(() =>
      renderInPanel(
        <UNSAFE_PortalProvider getContainer={() => document.body}>
          <ToastRegion queue={queue} />
        </UNSAFE_PortalProvider>,
      ),
    ).toThrow(
      "signalk-nearlcrews-ui: ToastRegion portal container must be its owning PanelRoot.",
    );
  });

  it("finishes dismissal when the exit transition ends", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Synced" });

    fireEvent.click(dismissButton());
    const card = toastCard();
    fireEvent.transitionEnd(card, { propertyName: "opacity" });
    expectNoCards();
  });

  it("removes a dismissed toast immediately under reduced motion", () => {
    stubReducedMotion();
    const { queue } = mountRegion();
    enqueue(queue, { title: "Synced" });

    fireEvent.click(dismissButton());
    advanceTimers(0);
    expectNoCards();
  });

  it("rejects a whitespace-only region label", () => {
    expect(() => mountRegion({ label: "  " })).toThrow(
      "signalk-nearlcrews-ui: ToastRegion requires a non-empty label.",
    );
  });

  it("rejects a whitespace-only toast title at the enqueue call site", () => {
    const { queue } = mountRegion();
    // The throw comes from enqueue itself, so the caller can catch it and the
    // region keeps rendering.
    expect(() => queue.enqueue({ title: "  " })).toThrow(
      "signalk-nearlcrews-ui: Toast requires a non-empty title.",
    );
    expect(queue.getSnapshot()).toEqual([]);
    enqueue(queue, { title: "Still working" });
    expect(screen.getByText("Still working")).toBeInTheDocument();
  });

  it("stays visible, announced, and focusable while a dialog is open", () => {
    const queue = createToastQueue();
    renderInPanel(
      <>
        <Dialog title="Connection settings" defaultOpen>
          <p>Dialog body</p>
        </Dialog>
        <ToastRegion queue={queue} />
      </>,
    );
    flush();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    enqueue(queue, { title: "Save failed", tone: "danger" });

    const host = toastHost();
    expect(host).toHaveAttribute("data-react-aria-top-layer");
    expect(host).not.toHaveAttribute("aria-hidden");
    // Queryable without hidden: true, so assistive technology reaches the
    // region the failure is spoken from.
    advanceTimers(LIVE_REGION_BLANK_MS);
    expect(screen.getByRole("alert")).toHaveTextContent("Error. Save failed.");
    expect(within(host).getByRole("alert")).toBe(screen.getByRole("alert"));
    // The modal renders its own hidden dismiss buttons; scope to the host.
    const dismiss = dismissButton(host);
    dismiss.focus();
    advanceTimers(50);
    expect(dismiss).toHaveFocus();
  });

  it.each([
    ["its older neighbor", "Middle", "Oldest"],
    ["the newest remaining toast", "Oldest", "Newest"],
  ] as const)(
    "moves focus to %s when the focused %s toast is dismissed",
    (_why, dismissed, receiver) => {
      const { queue } = mountRegion();
      enqueueEach(queue, ["Oldest", "Middle", "Newest"], { duration: 0 });

      const receiving = cardOf(receiver);
      const dismiss = dismissButton(cardOf(dismissed));
      dismiss.focus();
      fireEvent.click(dismiss);
      advanceTimers(EXIT_MS);

      expect(screen.queryByText(dismissed)).toBeNull();
      expect(dismissButton(receiving)).toHaveFocus();
    },
  );

  it("returns focus to where it was when the last toast is dismissed", () => {
    const { queue, save } = mountBesideSave();
    save.focus();
    enqueue(queue, { title: "Saved", tone: "success" });

    const dismiss = dismissButton();
    dismiss.focus();
    expect(dismiss).toHaveFocus();
    fireEvent.click(dismiss);
    advanceTimers(EXIT_MS);

    expect(screen.queryByRole("region")).toBeNull();
    expect(save).toHaveFocus();
  });

  it("falls back to the panel root instead of the document body", () => {
    const { container, queue, save } = mountBesideSave();
    enqueue(queue, { title: "Saved", tone: "success" });
    const root = panelRootOf(container);

    // Focus arrives from nowhere, so there is no earlier element to return to.
    const dismiss = dismissButton();
    dismiss.focus();
    fireEvent.click(dismiss);
    advanceTimers(EXIT_MS);

    expect(root).toHaveFocus();
    expect(root).toHaveAttribute("tabindex", "-1");
    // The borrowed tabindex is returned as soon as focus moves on.
    save.focus();
    expect(root).not.toHaveAttribute("tabindex");
  });

  it("restores focus when the queue is cleared while a toast has focus", () => {
    const { queue, save } = mountBesideSave();
    save.focus();
    enqueue(queue, { title: "One", duration: 0 });
    enqueue(queue, { title: "Two", duration: 0 });
    at(screen.getAllByRole("button", { name: "Dismiss" }), 1).focus();

    act(() => {
      queue.clear();
    });

    expect(save).toHaveFocus();
  });

  it("moves focus into the notifications with F6 and back out again", () => {
    const { queue, save } = mountBesideSave();
    save.focus();

    // No toast: the key is left to the host page.
    fireEvent.keyDown(save, { key: "F6" });
    expect(save).toHaveFocus();

    enqueue(queue, { title: "Older", duration: 0 });
    enqueue(queue, { title: "Newest", duration: 0 });
    fireEvent.keyDown(save, { key: "F6" });
    const dismiss = dismissButton(cardOf("Newest"));
    expect(dismiss).toHaveFocus();

    fireEvent.keyDown(dismiss, { key: "F6", shiftKey: true });
    expect(save).toHaveFocus();
  });

  it("clears every timer when a region unmounts mid-exit and mid-countdown", () => {
    const view = mountRegion();
    const { queue } = view;
    enqueue(queue, { title: "Counting down", duration: 1000 });
    enqueue(queue, { title: "Leaving" });
    fireEvent.click(dismissButton(cardOf("Leaving")));
    expect(cardOf("Leaving")).toHaveAttribute("data-exiting", "true");

    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("measures the host only while a toast shows, and only when it moved", () => {
    const visualViewport = installVisualViewport({
      height: 600,
      innerHeight: 600,
    });
    const { container, queue, unmount } = mountRegion();
    const host = toastHost();
    const panelRect = vi
      .spyOn(panelRootOf(container), "getBoundingClientRect")
      .mockImplementation(() => new DOMRect(0, 0, 800, 1_200));

    // An empty host paints nothing, so scroll frames cost no measurement.
    document.dispatchEvent(new Event("scroll"));
    advanceTimers(50);
    expect(panelRect).not.toHaveBeenCalled();

    enqueue(queue, { title: "Depth stale", tone: "warning" });
    expect(host).toHaveAttribute("data-snui-toast-host-visible");
    expect(host.style.getPropertyValue("--snui-toast-host-top")).toBe("0px");
    expect(host.style.getPropertyValue("--snui-toast-host-bottom")).toBe("0px");
    expect(host.style.getPropertyValue("--snui-toast-host-left")).toBe("0px");
    expect(host.style.getPropertyValue("--snui-toast-host-width")).toBe(
      "800px",
    );

    // An on-screen keyboard shrinks the visual viewport, and the notification
    // stays above it instead of under it.
    Object.assign(visualViewport, { height: 300 });
    act(() => {
      visualViewport.dispatchEvent(new Event("resize"));
    });
    advanceTimers(50);
    expect(host.style.getPropertyValue("--snui-toast-host-bottom")).toBe(
      "300px",
    );
    expect(host).toHaveAttribute("data-snui-toast-host-visible");

    // A frame that moved nothing writes nothing.
    const setProperty = vi.spyOn(host.style, "setProperty");
    document.dispatchEvent(new Event("scroll"));
    advanceTimers(50);
    expect(setProperty).not.toHaveBeenCalled();

    // A panel scrolled past the viewport keeps its host in the tree.
    panelRect.mockImplementation(() => new DOMRect(0, 700, 800, 1_200));
    document.dispatchEvent(new Event("scroll"));
    advanceTimers(50);
    expect(host).not.toHaveAttribute("data-snui-toast-host-visible");

    unmount();
  });

  it("lengthens the untimed toasts of one region at once", () => {
    const { queue } = mountRegion({ defaultDuration: 12_000 });
    enqueue(queue, { title: "Synced" });
    enqueue(queue, { title: "Timed", duration: 500 });
    enqueue(queue, { title: "Save failed", tone: "danger" });

    advanceTimers(500);
    expect(cardOf("Timed")).toHaveAttribute("data-exiting", "true");
    advanceTimers(11_499);
    expect(cardOf("Synced")).not.toHaveAttribute("data-exiting");
    advanceTimers(1);
    expect(cardOf("Synced")).toHaveAttribute("data-exiting", "true");
    // A sticky tone is still sticky: the region default times nothing out.
    expect(cardOf("Save failed")).not.toHaveAttribute("data-exiting");
  });

  it("keeps a mounted toast on the duration it arrived with when the region default changes", () => {
    const view = mountRegion({ defaultDuration: 0 });
    const { queue } = view;
    enqueue(queue, { title: "Synced" });

    view.rerender(panel(<ToastRegion queue={queue} defaultDuration={5000} />));
    flush();
    expect(cardOf("Synced")).not.toHaveAttribute("data-exiting");
    advanceTimers(60_000);
    expect(cardOf("Synced")).not.toHaveAttribute("data-exiting");

    // The new default times the toasts that arrive under it.
    enqueue(queue, { title: "Saved" });
    advanceTimers(5000);
    expect(cardOf("Saved")).toHaveAttribute("data-exiting", "true");
  });

  it("keeps a focused toast paused and retained when the region default changes", () => {
    const view = mountRegion({ defaultDuration: 1000 });
    const { queue } = view;
    enqueueEach(queue, FULL_QUEUE);
    const dismiss = dismissButton(cardOf("One"));
    act(() => {
      dismiss.focus();
    });

    view.rerender(panel(<ToastRegion queue={queue} defaultDuration={2000} />));
    enqueue(queue, { title: "Six" });
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.queryByText("Two")).toBeNull();

    advanceTimers(60_000);
    expect(cardOf("One")).not.toHaveAttribute("data-exiting");
    expect(dismiss).toHaveFocus();
  });

  it("names each dismiss button with the notification it closes", () => {
    const { queue } = mountRegion();
    enqueue(queue, { title: "Provider unavailable", tone: "danger" });
    enqueue(queue, { title: "Waypoints synced" });

    for (const title of ["Provider unavailable", "Waypoints synced"]) {
      const card = cardOf(title);
      const describedBy = dismissButton(card).getAttribute("aria-describedby");
      const heading = card.querySelector(".snui-toast__title");
      expect(describedBy).not.toBeNull();
      expect(heading?.id).toBe(describedBy);
      expect(heading).toHaveTextContent(title);
    }
  });

  it("shows every card's text in the commit that mounts it", () => {
    const { queue } = mountRegion();

    act(() => {
      queue.enqueue({ title: "Quiet", duration: 0, live: "off" });
    });
    expect(screen.getByText("Quiet")).toBeInTheDocument();

    // The card no longer announces, so it has no empty commit to wait out:
    // the host's persistent region carries the words instead.
    act(() => {
      queue.enqueue({ title: "Spoken", duration: 0 });
    });
    expect(screen.getByText("Spoken")).toBeInTheDocument();
  });

  it.each([
    ["Infinity", Number.POSITIVE_INFINITY],
    ["NaN", Number.NaN],
    ["a negative delay", -1],
    ["a delay past the timer cap", 2_147_483_648],
  ])(
    "ranks a toast whose duration no timer can wait as sticky when the queue overflows (%s)",
    (_case, duration) => {
      // No region is rendered, so nothing counts down and the queue's own
      // reading of the duration is the only thing that decides who goes.
      const queue = createToastQueue();
      queue.enqueue({ title: "Held", duration });
      for (const title of ["Two", "Three", "Four", "Five", "Six"]) {
        queue.enqueue({ title });
      }

      expect(queue.getSnapshot().map((queued) => queued.content.title)).toEqual(
        ["Held", "Three", "Four", "Five", "Six"],
      );
    },
  );

  it("refuses a routine toast rather than dropping an unread failure", () => {
    const evictions: string[] = [];
    const queue = createToastQueue({
      onEvict: ({ reason, toast: dropped }) => {
        // Every toast in this spec carries a plain string title, and a title
        // built from elements has no single word to record here.
        const { title } = dropped.content;
        evictions.push(`${reason}:${typeof title === "string" ? title : ""}`);
      },
    });
    renderToastRegion(queue);
    enqueueEach(queue, FULL_QUEUE, { tone: "danger" });

    const refused = enqueue(queue, { title: "Routine" });
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.queryByText("Routine")).toBeNull();
    expect(evictions).toEqual(["rejected:Routine"]);
    // The key of a refused toast stays safe to hand back.
    act(() => {
      queue.dismiss(refused);
    });
    expect(toastCards()).toHaveLength(5);

    // Another failure still makes room, and the one that went is reported.
    enqueue(queue, { title: "Six", tone: "danger" });
    expect(screen.queryByText("One")).toBeNull();
    expect(screen.getByText("Six")).toBeInTheDocument();
    expect(evictions).toEqual(["rejected:Routine", "overflow:One"]);
  });

  it("derives the exit fallback timer from the transition token", () => {
    const { queue } = mountRegion();

    const dismissWithToken = (title: string, token: string): void => {
      enqueue(queue, { title, duration: 0 });
      const dismiss = dismissButton(cardOf(title));
      const computed = vi.spyOn(window, "getComputedStyle").mockReturnValue({
        getPropertyValue: () => token,
      } as unknown as CSSStyleDeclaration);
      fireEvent.click(dismiss);
      computed.mockRestore();
    };

    // A token in seconds resolves to milliseconds.
    dismissWithToken("Seconds", "0.2s");
    advanceTimers(209);
    expect(screen.queryByText("Seconds")).not.toBeNull();
    advanceTimers(1);
    expect(screen.queryByText("Seconds")).toBeNull();

    // A missing or unparseable token falls back to the package transition.
    dismissWithToken("Missing", "");
    dismissWithToken("Unparseable", "..ms");
    advanceTimers(EXIT_MS - 1);
    expect(screen.queryByText("Missing")).not.toBeNull();
    expect(screen.queryByText("Unparseable")).not.toBeNull();
    advanceTimers(1);
    expect(screen.queryByText("Missing")).toBeNull();
    expect(screen.queryByText("Unparseable")).toBeNull();
  });

  it("exposes the notifications landmark through the ref", () => {
    const ref = createRef<HTMLElement>();
    const { queue } = mountRegion({ ref, label: "Avisos" });
    expect(ref.current).toBeNull();

    enqueue(queue, { title: "Hecho" });
    expect(ref.current).toBe(screen.getByRole("region", { name: "Avisos" }));
    expect(ref.current).toHaveClass("snui-toast-region");

    act(() => {
      queue.clear();
    });
    expect(ref.current).toBeNull();
  });

  it("counts the focused card among the toasts that are not leaving", () => {
    const { queue } = mountRegion();
    enqueueEach(queue, FULL_QUEUE, { duration: 0 });

    // The newest card is already on its way out, so it is no focus target.
    fireEvent.click(dismissButton(cardOf("Five")));
    const survivor = cardOf("Two");
    const dismiss = dismissButton(cardOf("Three"));
    dismiss.focus();
    fireEvent.click(dismiss);
    advanceTimers(EXIT_MS);

    expect(screen.queryByText("Three")).toBeNull();
    expect(dismissButton(survivor)).toHaveFocus();
  });

  it("returns the borrowed tabindex when the panel root refuses focus", () => {
    const { container, queue } = mountRegion();
    const root = panelRootOf(container);
    vi.spyOn(root, "focus").mockImplementation(() => undefined);

    enqueue(queue, { title: "Saved", tone: "success" });
    const dismiss = dismissButton();
    dismiss.focus();
    fireEvent.click(dismiss);
    advanceTimers(EXIT_MS);

    expect(root).not.toHaveFocus();
    expect(root).not.toHaveAttribute("tabindex");
  });

  it("leaves a modified or already handled F6 to the host page", () => {
    const { queue, save } = mountBesideSave();
    save.focus();
    enqueue(queue, { title: "Older", duration: 0 });

    for (const modifiers of [
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
    ]) {
      fireEvent.keyDown(save, { key: "F6", ...modifiers });
      expect(save).toHaveFocus();
    }

    // A capture-phase handler answered the key first.
    const answerFirst = (event: KeyboardEvent): void => {
      event.preventDefault();
    };
    document.addEventListener("keydown", answerFirst, true);
    fireEvent.keyDown(save, { key: "F6" });
    document.removeEventListener("keydown", answerFirst, true);
    expect(save).toHaveFocus();
  });

  it("renders to static markup, the way a consumer check does", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const queue = createToastQueue();
    queue.enqueue({ title: "Saved" });

    // The queue's store has to answer a server render, like every other store
    // a panel subscribes to.
    expect(() =>
      renderToStaticMarkup(panel(<ToastRegion queue={queue} />)),
    ).not.toThrow();
  });

  it("leaves F6 to the host page while focus stands outside the panel", () => {
    const queue = createToastQueue();
    const outside = document.createElement("button");
    outside.textContent = "Admin";
    document.body.append(outside);
    renderToastRegion(queue);
    enqueue(queue, { title: "Older", duration: 0 });

    outside.focus();
    fireEvent.keyDown(outside, { key: "F6" });
    expect(outside).toHaveFocus();

    outside.remove();
  });
});

describe("toast host stylesheet", () => {
  it("keeps a host outside the visual viewport in the accessibility tree", () => {
    const declarations = ruleBody(
      TOAST_STYLES.styles,
      ".snui-toast-region-host:not([data-snui-toast-host-visible])",
    );
    // A panel scrolled off screen still has to announce a failed save and let
    // the user reach Dismiss, so the host loses its paint and keeps its node.
    expect(declarations).not.toMatch(/visibility:/);
    expect(declarations).toContain(visuallyHiddenDeclarations());
  });

  it("seats the stack from the first landmark after the announcing regions", () => {
    // The host's persistent regions come first in the host, so the first
    // landmark is the first section rather than the first child.
    expect(TOAST_STYLES.styles).toMatch(
      /\.snui-toast-region:first-of-type \{\n {2}margin-block-start: auto;\n\}/,
    );
    expect(TOAST_STYLES.styles).not.toContain(".snui-toast-region:first-child");
  });

  it("keeps the boundary token around a toast card, which floats over the page", () => {
    // Like a dialog, menu, or popover, a toast lies over whatever the page
    // shows, so the rest of its outline is a boundary rather than a
    // decorative container edge; only the tone bar takes the tone color.
    const card = ruleBody(TOAST_STYLES.styles, ".snui-toast");
    expect(card).toContain(OVERLAY_TONE_ACCENT_BAR_DECLARATIONS);
    expect(card).toContain("border: 1px solid var(--snui-color-border);");
    expect(card).not.toContain("--snui-color-border-subtle");
  });

  it("reconstructs the tone dot under forced colors", () => {
    const declarations = ruleBody(
      stylesFrom(TOAST_STYLES.styles, "@media (forced-colors: active)"),
      "  .snui-toast__tone-dot",
    );
    // High contrast drops the tone hue, so the shaped dot is painted again
    // with a system color rather than disappearing.
    expect(declarations).toContain("background: CanvasText;");
    expect(declarations).toContain("forced-color-adjust: none;");
  });

  it("paints every tone from the shared tone rules", () => {
    for (const tone of SEMANTIC_TONES) {
      expect(TOAST_STYLES.styles).toContain(
        `.snui-toast--${tone} :is(.snui-toast__tone, .snui-toast__tone-glyph) { color: var(--snui-color-${tone}); }`,
      );
    }
    // The dot reads at the size the status indicator already proved legible.
    expect(TOAST_STYLES.styles).toContain("width: 0.75rem;");
  });
});
