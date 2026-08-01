import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createToastQueue,
  PanelRoot,
  type ToastContent,
  type ToastQueue,
  ToastRegion,
  type ToastRegionProps,
  toast,
} from "../../src/index.js";

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

function renderInPanel(
  queue: ToastQueue,
  props?: Omit<ToastRegionProps, "queue">,
): ReturnType<typeof render> {
  const result = render(
    <PanelRoot>
      <ToastRegion queue={queue} {...props} />
    </PanelRoot>,
  );
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
  it("renders enqueued toasts inside the panel root portal", () => {
    const queue = createToastQueue();
    const { container } = renderInPanel(queue);
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
    renderInPanel(queue);
    enqueue(queue, { title: "First" });
    enqueue(queue, { title: "Second" });

    const cards = screen.getAllByRole("status");
    expect(cards).toHaveLength(2);
    expect(within(at(cards, 0)).getByText("Second")).toBeInTheDocument();
    expect(within(at(cards, 1)).getByText("First")).toBeInTheDocument();
  });

  it("auto-dismisses after the default duration with an exit transition", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Synced" });

    expect(screen.getByRole("status")).not.toHaveAttribute("data-exiting");
    advance(4999);
    expect(screen.getByRole("status")).not.toHaveAttribute("data-exiting");
    advance(1);
    expect(screen.getByRole("status")).toHaveAttribute("data-exiting", "true");
    advance(150);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("honors a custom duration", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Synced", duration: 250 });

    advance(249);
    expect(screen.getByRole("status")).not.toHaveAttribute("data-exiting");
    advance(1);
    expect(screen.getByRole("status")).toHaveAttribute("data-exiting", "true");
  });

  it("keeps a duration of zero sticky until dismissed", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Anchor alarm", tone: "danger", duration: 0 });

    const card = screen.getByRole("alert");
    fireEvent.pointerOver(card);
    advance(60000);
    fireEvent.pointerOut(card);
    advance(60000);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Dismiss" }));
    advance(150);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("pauses auto-dismiss while hovered and resumes with the remaining time", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Synced", duration: 1000 });
    const card = screen.getByRole("status");

    advance(400);
    fireEvent.pointerOver(card);
    advance(10000);
    expect(screen.getByRole("status")).toBeInTheDocument();

    fireEvent.pointerOut(card);
    advance(599);
    expect(screen.getByRole("status")).toBeInTheDocument();
    advance(1);
    expect(screen.getByRole("status")).toHaveAttribute("data-exiting", "true");
  });

  it("pauses auto-dismiss while focused and resumes after blur", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Synced", duration: 1000 });
    const card = screen.getByRole("status");

    advance(300);
    fireEvent.focusIn(card);
    advance(10000);
    expect(screen.getByRole("status")).toBeInTheDocument();

    fireEvent.focusOut(card);
    advance(699);
    expect(screen.getByRole("status")).toBeInTheDocument();
    advance(1);
    expect(screen.getByRole("status")).toHaveAttribute("data-exiting", "true");
  });

  it("stays paused until both hover and focus release", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Synced", duration: 1000 });
    const card = screen.getByRole("status");

    fireEvent.pointerOver(card);
    fireEvent.focusIn(card);
    fireEvent.pointerOut(card);
    advance(10000);
    expect(screen.getByRole("status")).toBeInTheDocument();

    fireEvent.focusOut(card);
    advance(999);
    expect(screen.getByRole("status")).toBeInTheDocument();
    advance(1);
    expect(screen.getByRole("status")).toHaveAttribute("data-exiting", "true");
  });

  it("dismisses a single toast from its button and keeps the rest", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "First" });
    enqueue(queue, { title: "Second" });

    const newest = at(screen.getAllByRole("status"), 0);
    fireEvent.click(within(newest).getByRole("button", { name: "Dismiss" }));
    expect(newest).toHaveAttribute("data-exiting", "true");
    expect(screen.getByText("First")).toBeInTheDocument();

    advance(150);
    expect(screen.queryByText("Second")).toBeNull();
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("ignores a repeated dismiss while exiting", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Synced" });

    const button = screen.getByRole("button", { name: "Dismiss" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByRole("status")).toHaveAttribute("data-exiting", "true");
    advance(150);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("maps tones to live region roles without duplicating aria-live", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Failed", tone: "danger" });
    enqueue(queue, { title: "Low oil", tone: "warning" });
    enqueue(queue, { title: "Saved", tone: "success" });
    enqueue(queue, { title: "Note", tone: "info" });

    const alerts = screen.getAllByRole("alert");
    const statuses = screen.getAllByRole("status");
    expect(alerts).toHaveLength(2);
    expect(statuses).toHaveLength(2);
    for (const card of [...alerts, ...statuses]) {
      expect(card).not.toHaveAttribute("aria-live");
    }
    expect(within(at(alerts, 0)).getByText("Low oil")).toBeInTheDocument();
  });

  it("honors an explicit live override", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Quiet", tone: "danger", live: "off" });
    enqueue(queue, { title: "Gentle failure", tone: "danger", live: "polite" });

    const quiet = screen.getByText("Quiet").closest(".snui-toast");
    expect(quiet).not.toBeNull();
    expect(quiet).not.toHaveAttribute("role");
    expect(quiet).toHaveAttribute("aria-live", "off");
    expect(
      within(screen.getByRole("status")).getByText("Gentle failure"),
    ).toBeInTheDocument();
  });

  it("localizes the dismiss label and falls back when blank", () => {
    const queue = createToastQueue();
    renderInPanel(queue, { dismissLabel: "Cerrar" });
    enqueue(queue, { title: "Guardado" });
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();

    const blank = createToastQueue();
    renderInPanel(blank, { dismissLabel: "  ", label: "Avisos" });
    enqueue(blank, { title: "Hecho" });
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Avisos" })).toBeInTheDocument();
  });

  it("localizes the tone label and falls back when blank", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Guardado", tone: "success", toneLabel: "Listo" });
    enqueue(queue, { title: "Stored", tone: "success", toneLabel: " " });

    expect(screen.getByText(/Listo\./)).toBeInTheDocument();
    expect(screen.getAllByText(/Success\./)).toHaveLength(1);
  });

  it("clears every toast at once", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
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
    render(
      <PanelRoot>
        <ToastRegion queue={first} label="Engine" />
        <ToastRegion queue={second} label="Network" />
      </PanelRoot>,
    );
    flush();

    enqueue(first, { title: "Oil pressure" });
    const engine = screen.getByRole("region", { name: "Engine" });
    const network = screen.getByRole("region", { name: "Network" });
    expect(within(engine).getByText("Oil pressure")).toBeInTheDocument();
    expect(within(network).queryByText("Oil pressure")).toBeNull();

    enqueue(second, { title: "Link lost" });
    act(() => {
      first.clear();
    });
    expect(within(engine).queryByText("Oil pressure")).toBeNull();
    expect(within(network).getByText("Link lost")).toBeInTheDocument();
  });

  it("serves the shared toast queue", () => {
    renderInPanel(toast);
    enqueue(toast, { title: "Shared notice" });
    expect(screen.getByText("Shared notice")).toBeInTheDocument();
  });

  it("falls back to the document body outside a PanelRoot", () => {
    const queue = createToastQueue();
    render(<ToastRegion queue={queue} />);
    flush();
    enqueue(queue, { title: "Unpanelled" });

    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region.parentElement).toBe(document.body);
    expect(screen.getByText("Unpanelled")).toBeInTheDocument();
  });

  it("removes a dismissed toast immediately under reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    const queue = createToastQueue();
    renderInPanel(queue);
    enqueue(queue, { title: "Synced" });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    advance(0);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("rejects a whitespace-only region label", () => {
    const queue = createToastQueue();
    expect(() => renderInPanel(queue, { label: "  " })).toThrow(
      "ToastRegion requires a non-empty label.",
    );
  });

  it("rejects a whitespace-only toast title", () => {
    const queue = createToastQueue();
    renderInPanel(queue);
    expect(() => {
      act(() => {
        queue.enqueue({ title: "  " });
      });
    }).toThrow("Toast requires a non-empty title.");
  });
});
