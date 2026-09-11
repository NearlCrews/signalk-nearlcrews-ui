import {
  act,
  fireEvent,
  type RenderResult,
  render,
  screen,
  within,
} from "@testing-library/react";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button, PanelRoot } from "../../src/index.js";
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
import { renderInPanel } from "../helpers.js";

function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an item at index ${String(index)}`);
  }
  return item;
}

function flush(): void {
  act(() => {
    vi.advanceTimersByTime(0);
  });
}

function renderToastRegion(
  queue: ToastQueue,
  props?: Omit<ToastRegionProps, "queue">,
): RenderResult {
  const result = renderInPanel(<ToastRegion queue={queue} {...props} />);
  // The region resolves its portal container one tick after mount.
  flush();
  return result;
}

function enqueue(queue: ToastQueue, content: ToastContent): string {
  let key = "";
  act(() => {
    key = queue.enqueue(content);
  });
  // A toast announces its text one tick after the roled region mounts.
  flush();
  return key;
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

// The exit timer outlives the fast transition by ten milliseconds.
const EXIT_MS = TRANSITION_FAST_MS + 10;

// The live region is the text container; hover, focus, and exit state live
// on the card that wraps it.
function toastCards(role: "alert" | "status"): HTMLElement[] {
  return screen.getAllByRole(role).map((region) => {
    const card = region.closest(".snui-toast");
    if (card === null) throw new Error("expected a toast card");
    return card as HTMLElement;
  });
}

function toastCard(role: "alert" | "status"): HTMLElement {
  return at(toastCards(role), 0);
}

/** The card whose title reads `title`. */
function cardOf(title: string): HTMLElement {
  const card = screen.getByText(title).closest(".snui-toast");
  if (!(card instanceof HTMLElement)) throw new Error("expected a toast card");
  return card;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  toast.clear();
});

describe("createToastQueue", () => {
  it("enqueues, dismisses, and clears with fresh snapshots and notifications", () => {
    const queue = createToastQueue();
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);

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

    unsubscribe();
    queue.enqueue({ title: "Three" });
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
    const queue = createToastQueue();
    const { container } = renderToastRegion(queue);
    // The overlay module sheet installs beside the root sheet on mount.
    const styles = [
      ...container.ownerDocument.head.querySelectorAll(
        "style[data-snui-styles], style[data-snui-module-styles]",
      ),
    ]
      .map((element) => element.textContent)
      .join("\n");

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
    const queue = createToastQueue();
    const { container } = renderToastRegion(queue);
    expect(screen.queryByRole("region")).toBeNull();

    enqueue(queue, { title: "Synced" });
    expect(
      screen.getByRole("region", { name: "Notifications" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    advance(EXIT_MS);
    expect(screen.queryByRole("region")).toBeNull();
    // The shared host stays mounted for the next toast.
    expect(container.querySelector(".snui-toast-region-host")).not.toBeNull();
  });

  it("places the host before the panel content so notifications are one Tab away", () => {
    const queue = createToastQueue();
    const { container } = renderToastRegion(queue);
    enqueue(queue, { title: "Synced" });

    const root = container.querySelector(".snui-root");
    const host = container.querySelector(".snui-toast-region-host");
    expect(root?.firstElementChild).toBe(host);
    expect(host?.nextElementSibling).toHaveClass("snui-root__content");
  });

  it("renders enqueued toasts inside the panel root portal", () => {
    const queue = createToastQueue();
    const { container } = renderToastRegion(queue);
    enqueue(queue, { title: "Waypoints synced", description: "12 sent" });

    const region = screen.getByRole("region", { name: "Notifications" });
    const root = container.querySelector(".snui-root");
    expect(root).not.toBeNull();
    expect(root).toContainElement(region);
    expect(screen.getByText("Waypoints synced")).toBeInTheDocument();
    expect(screen.getByText("12 sent")).toBeInTheDocument();
    // The semantic tone name precedes the title for screen readers.
    expect(screen.getByText(/Information\./)).toBeInTheDocument();
  });

  it("renders newest first", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "First" });
    enqueue(queue, { title: "Second" });

    const cards = screen.getAllByRole("status");
    expect(cards).toHaveLength(2);
    expect(within(at(cards, 0)).getByText("Second")).toBeInTheDocument();
    expect(within(at(cards, 1)).getByText("First")).toBeInTheDocument();
  });

  it("auto-dismisses after the default duration with an exit transition", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Synced" });

    expect(toastCard("status")).not.toHaveAttribute("data-exiting");
    advance(4999);
    expect(toastCard("status")).not.toHaveAttribute("data-exiting");
    advance(1);
    expect(toastCard("status")).toHaveAttribute("data-exiting", "true");
    advance(EXIT_MS);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps warning and danger toasts until dismissed by default", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Save failed", tone: "danger" });
    enqueue(queue, { title: "Depth stale", tone: "warning" });
    enqueue(queue, { title: "Saved", tone: "success" });

    advance(5000);
    expect(
      screen.getByText("Save failed").closest(".snui-toast"),
    ).not.toHaveAttribute("data-exiting");
    expect(
      screen.getByText("Depth stale").closest(".snui-toast"),
    ).not.toHaveAttribute("data-exiting");
    expect(screen.getByText("Saved").closest(".snui-toast")).toHaveAttribute(
      "data-exiting",
      "true",
    );
    advance(60000);
    expect(screen.getByText("Save failed")).toBeInTheDocument();
    expect(screen.getByText("Depth stale")).toBeInTheDocument();
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("lets a caller time out a danger toast explicitly", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Save failed", tone: "danger", duration: 300 });

    advance(300);
    expect(toastCard("alert")).toHaveAttribute("data-exiting", "true");
  });

  it("honors a custom duration", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Synced", duration: 250 });

    advance(249);
    expect(toastCard("status")).not.toHaveAttribute("data-exiting");
    advance(1);
    expect(toastCard("status")).toHaveAttribute("data-exiting", "true");
  });

  it("keeps a duration of zero sticky until dismissed", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Anchor alarm", tone: "danger", duration: 0 });

    const card = toastCard("alert");
    fireEvent.pointerOver(card);
    advance(60000);
    fireEvent.pointerOut(card);
    advance(60000);
    expect(toastCard("alert")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Dismiss" }));
    advance(EXIT_MS);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("pauses auto-dismiss while hovered and resumes with the remaining time", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Synced", duration: 1000 });
    const card = toastCard("status");

    advance(400);
    fireEvent.pointerOver(card);
    advance(10000);
    expect(toastCard("status")).toBeInTheDocument();

    fireEvent.pointerOut(card);
    advance(599);
    expect(toastCard("status")).toBeInTheDocument();
    advance(1);
    expect(toastCard("status")).toHaveAttribute("data-exiting", "true");
  });

  it("pauses auto-dismiss while focused and resumes after blur", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Synced", duration: 1000 });
    const card = toastCard("status");

    advance(300);
    fireEvent.focusIn(card);
    advance(10000);
    expect(toastCard("status")).toBeInTheDocument();

    fireEvent.focusOut(card);
    advance(699);
    expect(toastCard("status")).toBeInTheDocument();
    advance(1);
    expect(toastCard("status")).toHaveAttribute("data-exiting", "true");
  });

  it("stays paused until both hover and focus release", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Synced", duration: 1000 });
    const card = toastCard("status");

    fireEvent.pointerOver(card);
    fireEvent.focusIn(card);
    fireEvent.pointerOut(card);
    advance(10000);
    expect(toastCard("status")).toBeInTheDocument();

    fireEvent.focusOut(card);
    advance(999);
    expect(toastCard("status")).toBeInTheDocument();
    advance(1);
    expect(toastCard("status")).toHaveAttribute("data-exiting", "true");
  });

  it("dismisses a single toast from its button and keeps the rest", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "First" });
    enqueue(queue, { title: "Second" });

    const newest = at(toastCards("status"), 0);
    fireEvent.click(within(newest).getByRole("button", { name: "Dismiss" }));
    expect(newest).toHaveAttribute("data-exiting", "true");
    expect(screen.getByText("First")).toBeInTheDocument();

    advance(EXIT_MS);
    expect(screen.queryByText("Second")).toBeNull();
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("ignores a repeated dismiss while exiting", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Synced" });

    const button = screen.getByRole("button", { name: "Dismiss" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(toastCard("status")).toHaveAttribute("data-exiting", "true");
    advance(EXIT_MS);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("drops the oldest toast when the queue is full", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    for (const title of ["One", "Two", "Three", "Four", "Five"]) {
      enqueue(queue, { title, duration: 0 });
    }
    enqueue(queue, { title: "Six", duration: 0 });

    expect(screen.getAllByRole("status")).toHaveLength(5);
    expect(screen.queryByText("One")).toBeNull();
    expect(screen.getByText("Six")).toBeInTheDocument();
  });

  it("retains the focused toast when the queue overflows", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    for (const title of ["One", "Two", "Three", "Four", "Five"]) {
      enqueue(queue, { title, duration: 0 });
    }
    const oldestCard = screen.getByText("One").closest(".snui-toast");
    expect(oldestCard).not.toBeNull();
    if (oldestCard === null) return;
    const dismiss = within(oldestCard as HTMLElement).getByRole("button", {
      name: "Dismiss",
    });
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
    const dismiss = within(secondary).getByRole("button", { name: "Dismiss" });
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

  it("retains a sticky critical toast ahead of ordinary queued notices", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    // Danger is sticky by default, so no explicit duration is needed.
    enqueue(queue, { title: "Anchor alarm", tone: "danger" });
    for (const title of ["Two", "Three", "Four", "Five"]) {
      enqueue(queue, { title });
    }

    enqueue(queue, { title: "Six" });

    expect(screen.getByText("Anchor alarm")).toBeInTheDocument();
    expect(screen.queryByText("Two")).toBeNull();
    expect(screen.getByText("Six")).toBeInTheDocument();
  });

  it("keeps the dismiss button outside the live region", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Scoped", duration: 0 });

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Scoped");
    expect(within(region).queryByRole("button")).toBeNull();
    expect(
      within(at(toastCards("status"), 0)).getByRole("button", {
        name: "Dismiss",
      }),
    ).toBeInTheDocument();
  });

  it("maps tones to live region roles without duplicating aria-live", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Failed", tone: "danger" });
    enqueue(queue, { title: "Low oil", tone: "warning" });
    enqueue(queue, { title: "Saved", tone: "success" });
    enqueue(queue, { title: "Note", tone: "info" });

    const alerts = screen.getAllByRole("alert");
    const statuses = screen.getAllByRole("status");
    expect(alerts).toHaveLength(1);
    expect(statuses).toHaveLength(3);
    for (const card of [...alerts, ...statuses]) {
      expect(card).not.toHaveAttribute("aria-live");
    }
    expect(within(at(alerts, 0)).getByText("Failed")).toBeInTheDocument();
    // A warning in a configuration panel waits its turn.
    expect(
      cardOf("Low oil").querySelector(".snui-toast__text"),
    ).toHaveAttribute("role", "status");
  });

  it("honors an explicit live override", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Quiet", tone: "danger", live: "off" });
    enqueue(queue, { title: "Gentle failure", tone: "danger", live: "polite" });

    const quiet = screen.getByText("Quiet").closest(".snui-toast__text");
    expect(quiet).not.toBeNull();
    expect(quiet).not.toHaveAttribute("role");
    expect(quiet).toHaveAttribute("aria-live", "off");
    expect(
      within(screen.getByRole("status")).getByText("Gentle failure"),
    ).toBeInTheDocument();
  });

  it("localizes the dismiss label and falls back when blank", () => {
    const queue = createToastQueue();
    renderToastRegion(queue, { dismissLabel: "Cerrar" });
    enqueue(queue, { title: "Guardado" });
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();

    const blank = createToastQueue();
    renderToastRegion(blank, { dismissLabel: "  ", label: "Avisos" });
    enqueue(blank, { title: "Hecho" });
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Avisos" })).toBeInTheDocument();
  });

  it("localizes the tone label and falls back when blank", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Guardado", tone: "success", toneLabel: "Listo" });
    enqueue(queue, { title: "Stored", tone: "success", toneLabel: " " });

    expect(screen.getByText(/Listo\./)).toBeInTheDocument();
    expect(screen.getAllByText(/Success\./)).toHaveLength(1);
  });

  it("clears every toast at once", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "First" });
    enqueue(queue, { title: "Second" });
    act(() => {
      queue.clear();
    });
    expect(screen.queryByRole("status")).toBeNull();
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
      "ToastRegion must be rendered inside PanelRoot.",
    );
  });

  it("rejects a nested provider that redirects its portal outside PanelRoot", () => {
    const queue = createToastQueue();
    expect(() =>
      render(
        <PanelRoot>
          <UNSAFE_PortalProvider getContainer={() => document.body}>
            <ToastRegion queue={queue} />
          </UNSAFE_PortalProvider>
        </PanelRoot>,
      ),
    ).toThrow("ToastRegion portal container must be its owning PanelRoot.");
  });

  it("finishes dismissal when the exit transition ends", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Synced" });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    const card = toastCard("status");
    fireEvent.transitionEnd(card, { propertyName: "opacity" });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("removes a dismissed toast immediately under reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Synced" });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    advance(0);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("rejects a whitespace-only region label", () => {
    const queue = createToastQueue();
    expect(() => renderToastRegion(queue, { label: "  " })).toThrow(
      "ToastRegion requires a non-empty label.",
    );
  });

  it("rejects a whitespace-only toast title at the enqueue call site", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    // The throw comes from enqueue itself, so the caller can catch it and the
    // region keeps rendering.
    expect(() => queue.enqueue({ title: "  " })).toThrow(
      "Toast requires a non-empty title.",
    );
    expect(queue.getSnapshot()).toEqual([]);
    enqueue(queue, { title: "Still working" });
    expect(screen.getByText("Still working")).toBeInTheDocument();
  });

  it("stays visible, announced, and focusable while a dialog is open", () => {
    const queue = createToastQueue();
    const { container } = renderInPanel(
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

    const host = container.querySelector(".snui-toast-region-host");
    if (!(host instanceof HTMLElement)) throw new Error("expected a host");
    expect(host).toHaveAttribute("data-react-aria-top-layer");
    expect(host).not.toHaveAttribute("aria-hidden");
    // Queryable without hidden: true, so assistive technology reaches it.
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    // The modal renders its own hidden dismiss buttons; scope to the host.
    const dismiss = within(host).getByRole("button", { name: "Dismiss" });
    dismiss.focus();
    advance(50);
    expect(dismiss).toHaveFocus();
  });

  it("moves focus to the next toast when the focused toast is dismissed", () => {
    const queue = createToastQueue();
    renderToastRegion(queue);
    enqueue(queue, { title: "Oldest", duration: 0 });
    enqueue(queue, { title: "Middle", duration: 0 });
    enqueue(queue, { title: "Newest", duration: 0 });

    const middle = cardOf("Middle");
    const oldest = cardOf("Oldest");
    const dismiss = within(middle).getByRole("button", { name: "Dismiss" });
    dismiss.focus();
    fireEvent.click(dismiss);
    advance(EXIT_MS);

    expect(screen.queryByText("Middle")).toBeNull();
    expect(
      within(oldest).getByRole("button", { name: "Dismiss" }),
    ).toHaveFocus();
  });

  it("returns focus to where it was when the last toast is dismissed", () => {
    const queue = createToastQueue();
    renderInPanel(
      <>
        <Button>Save</Button>
        <ToastRegion queue={queue} />
      </>,
    );
    flush();
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();
    enqueue(queue, { title: "Saved", tone: "success" });

    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    dismiss.focus();
    expect(dismiss).toHaveFocus();
    fireEvent.click(dismiss);
    advance(EXIT_MS);

    expect(screen.queryByRole("region")).toBeNull();
    expect(save).toHaveFocus();
  });

  it("falls back to the panel root instead of the document body", () => {
    const queue = createToastQueue();
    const { container } = renderInPanel(
      <>
        <Button>Save</Button>
        <ToastRegion queue={queue} />
      </>,
    );
    flush();
    enqueue(queue, { title: "Saved", tone: "success" });
    const root = container.querySelector(".snui-root");
    if (!(root instanceof HTMLElement)) throw new Error("expected a root");

    // Focus arrives from nowhere, so there is no earlier element to return to.
    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    dismiss.focus();
    fireEvent.click(dismiss);
    advance(EXIT_MS);

    expect(root).toHaveFocus();
    expect(root).toHaveAttribute("tabindex", "-1");
    // The borrowed tabindex is returned as soon as focus moves on.
    screen.getByRole("button", { name: "Save" }).focus();
    expect(root).not.toHaveAttribute("tabindex");
  });

  it("restores focus when the queue is cleared while a toast has focus", () => {
    const queue = createToastQueue();
    renderInPanel(
      <>
        <Button>Save</Button>
        <ToastRegion queue={queue} />
      </>,
    );
    flush();
    const save = screen.getByRole("button", { name: "Save" });
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
    const queue = createToastQueue();
    renderInPanel(
      <>
        <Button>Save</Button>
        <ToastRegion queue={queue} />
      </>,
    );
    flush();
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();

    // No toast: the key is left to the host page.
    fireEvent.keyDown(save, { key: "F6" });
    expect(save).toHaveFocus();

    enqueue(queue, { title: "Older", duration: 0 });
    enqueue(queue, { title: "Newest", duration: 0 });
    fireEvent.keyDown(save, { key: "F6" });
    const dismiss = within(cardOf("Newest")).getByRole("button", {
      name: "Dismiss",
    });
    expect(dismiss).toHaveFocus();

    fireEvent.keyDown(dismiss, { key: "F6", shiftKey: true });
    expect(save).toHaveFocus();
  });

  it("clears every timer when a region unmounts mid-exit and mid-countdown", () => {
    const queue = createToastQueue();
    const view = renderToastRegion(queue);
    enqueue(queue, { title: "Counting down", duration: 1000 });
    enqueue(queue, { title: "Leaving" });
    fireEvent.click(
      within(cardOf("Leaving")).getByRole("button", { name: "Dismiss" }),
    );
    expect(cardOf("Leaving")).toHaveAttribute("data-exiting", "true");

    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("toast host stylesheet", () => {
  it("keeps a host outside the visual viewport in the accessibility tree", () => {
    const rule =
      /\.snui-toast-region-host:not\(\[data-snui-toast-host-visible\]\) \{([^}]*)\}/.exec(
        TOAST_STYLES.styles,
      );
    expect(rule).not.toBeNull();
    const declarations = rule?.[1] ?? "";
    // A panel scrolled off screen still has to announce a failed save and let
    // the user reach Dismiss, so the host loses its paint and keeps its node.
    expect(declarations).not.toMatch(/visibility:/);
    expect(declarations).toContain(visuallyHiddenDeclarations());
  });
});
