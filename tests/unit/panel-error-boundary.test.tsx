import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CollapsibleSection,
  PanelErrorBoundary,
  type PanelErrorBoundaryFallbackProps,
  Section,
} from "../../src/index.js";
import { Dialog } from "../../src/overlays.js";
import {
  type PanelAnnounce,
  PanelAnnouncerProvider,
} from "../../src/utils/announcer.js";
import { panel, renderInPanel } from "../helpers.js";
import { Bomb, failure } from "./lib/failing-content.js";

describe("PanelErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("catches a render error, reports it, and recovers on Try again", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const { container } = renderInPanel(
      <PanelErrorBoundary onError={onError}>
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(container.querySelector(".snui-banner--danger")).toHaveTextContent(
      "This panel stopped working",
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(screen.queryByRole("button", { name: "Reload page" })).toBeNull();

    failure.armed = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Recovered content")).toBeVisible();
    expect(container.querySelector(".snui-banner--danger")).toBeNull();
  });

  it("offers the secondary reload action only when a handler is given", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    const { container } = renderInPanel(
      <PanelErrorBoundary
        onReload={onReload}
        reloadLabel="Reload Admin"
        retryLabel="Retry"
        title="Panel error"
        reloadDescription="Reload if it keeps failing."
      >
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(container.querySelector(".snui-banner--danger")).toHaveTextContent(
      "Panel error. Reload if it keeps failing.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reload Admin" }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("warns about discarded changes only where the reload is offered", () => {
    const { container } = renderInPanel(
      <>
        <PanelErrorBoundary>
          <Bomb />
        </PanelErrorBoundary>
        <PanelErrorBoundary onReload={() => undefined}>
          <Bomb />
        </PanelErrorBoundary>
      </>,
    );

    // The warning belongs to the action that certainly throws unsaved entries
    // away, and the retry, which only reopens the panel, carries none.
    const fallbacks = container.querySelectorAll(".snui-banner--danger");
    expect(fallbacks[0]).toHaveTextContent(
      "Try again reopens this panel without reloading the page.",
    );
    expect(fallbacks[0]).not.toHaveTextContent("Reloading the page");
    expect(fallbacks[1]).toHaveTextContent(
      "Reloading the page discards unsaved changes in every panel.",
    );
  });

  it("shows the description written for the actions on screen", () => {
    const { container } = renderInPanel(
      <>
        <PanelErrorBoundary
          description="Alone."
          reloadDescription="With reload."
        >
          <Bomb />
        </PanelErrorBoundary>
        <PanelErrorBoundary
          description="Alone."
          reloadDescription="With reload."
          onReload={() => undefined}
        >
          <Bomb />
        </PanelErrorBoundary>
      </>,
    );

    // A translation of the reload sentence must not appear beside a fallback
    // that offers no reload, so each variant has a slot of its own.
    const fallbacks = container.querySelectorAll(".snui-banner--danger");
    expect(fallbacks[0]).toHaveTextContent("Alone.");
    expect(fallbacks[0]).not.toHaveTextContent("With reload.");
    expect(fallbacks[1]).toHaveTextContent("With reload.");
    expect(fallbacks[1]).not.toHaveTextContent("Alone.");
  });

  it("falls back to the defaults for blank text in props and bundle", () => {
    renderInPanel(
      <>
        <PanelErrorBoundary
          title=" "
          retryLabel=""
          reloadLabel="  "
          reloadDescription=""
          onReload={() => undefined}
        >
          <Bomb />
        </PanelErrorBoundary>
        <PanelErrorBoundary description="   ">
          <Bomb />
        </PanelErrorBoundary>
      </>,
      {
        labels: {
          panelError: {
            description: " ",
            reload: "",
            reloadDescription: " ",
            retry: "  ",
            title: "",
          },
        },
      },
    );

    // Blank text reads as absent at every step, so the only recovery action
    // after a crash always carries a name.
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(
      2,
    );
    expect(screen.getByRole("button", { name: "Reload page" })).toBeVisible();
    expect(screen.getAllByText("This panel stopped working")).toHaveLength(2);
    expect(
      screen.getByText(
        "Try again reopens this panel without reloading the page. Reloading the page discards unsaved changes in every panel.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Try again reopens this panel without reloading the page.",
      ),
    ).toBeVisible();
  });

  it("heads the fallback one level below the section it sits in", () => {
    renderInPanel(
      <Section title="Storage">
        <PanelErrorBoundary>
          <Bomb />
        </PanelErrorBoundary>
      </Section>,
    );

    // The fallback stands in for the section's content, so its title nests
    // under the section rather than reading as a sibling of it.
    expect(
      screen.getByRole("heading", { level: 2, name: "Storage" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "This panel stopped working",
      }),
    ).toBeVisible();
  });

  it("heads the fallback one level below the title of a dialog it sits in", () => {
    renderInPanel(
      <Section title="Storage" headingLevel={3}>
        <Dialog title="Import charts" defaultOpen>
          <PanelErrorBoundary>
            <Bomb />
          </PanelErrorBoundary>
        </Dialog>
      </Section>,
    );

    // A dialog starts an outline of its own below its title, whatever section
    // opened it. The section heads at level 3 and the dialog at 2, so a
    // fallback that followed the section would head at 4 instead.
    expect(
      screen.getByRole("heading", { level: 2, name: "Import charts" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "This panel stopped working",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", {
        level: 4,
        name: "This panel stopped working",
      }),
    ).toBeNull();
  });

  it("announces the failure once when a retained section hides and reveals it", async () => {
    const user = userEvent.setup();
    const announce = vi.fn<PanelAnnounce>();
    failure.armed = false;
    // Built fresh per render: React skips re-rendering a subtree handed the
    // very same element, and this test needs the second render to run.
    const tree = (): React.JSX.Element =>
      panel(
        <PanelAnnouncerProvider value={announce}>
          <CollapsibleSection title="Storage" defaultOpen>
            <PanelErrorBoundary>
              <Bomb />
            </PanelErrorBoundary>
          </CollapsibleSection>
        </PanelAnnouncerProvider>,
      );
    const { rerender } = render(tree());
    const toggle = screen.getByRole("button", { name: "Storage" });
    toggle.focus();

    failure.armed = true;
    rerender(tree());
    expect(announce).toHaveBeenCalledOnce();

    // A retained section runs the fallback's effects again on every expand.
    // The crash was reported when it happened, and the operator who reopens
    // the section is looking straight at the fallback.
    await user.click(toggle);
    await user.click(toggle);

    expect(toggle).toHaveFocus();
    expect(announce).toHaveBeenCalledOnce();
  });

  it("takes focus without also announcing when React replays its effects", () => {
    const announce = vi.fn<PanelAnnounce>();
    const { container } = render(
      <StrictMode>
        {panel(
          <PanelAnnouncerProvider value={announce}>
            <PanelErrorBoundary>
              <Bomb />
            </PanelErrorBoundary>
          </PanelAnnouncerProvider>,
        )}
      </StrictMode>,
    );

    // StrictMode runs the mount effect twice. The first run moves focus onto
    // the fallback, so a second report would find focus "elsewhere" and read
    // the same failure out over the one the focus move already announced.
    expect(container.querySelector(".snui-banner--danger")).toHaveFocus();
    expect(announce).not.toHaveBeenCalled();
  });

  it("reports a retry that fails again", async () => {
    const user = userEvent.setup();
    const { container } = renderInPanel(
      <PanelErrorBoundary>
        <Bomb />
      </PanelErrorBoundary>,
    );
    const first = container.querySelector(".snui-banner--danger");
    expect(first).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    // The retry took the focused button away with the old fallback, so the
    // second crash leaves the reader on the body exactly as the first did,
    // and the new fallback has a report of its own to make.
    const second = container.querySelector(".snui-banner--danger");
    expect(second).not.toBe(first);
    expect(second).toHaveFocus();
  });

  it("hands a custom fallback the error and both actions", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    const fallback = vi.fn(
      ({ error, reload, reset }: PanelErrorBoundaryFallbackProps) => (
        <div>
          <p>{error instanceof Error ? error.message : "Unknown"}</p>
          <button type="button" onClick={reset}>
            Reset
          </button>
          <button type="button" onClick={reload}>
            Reload
          </button>
        </div>
      ),
    );
    renderInPanel(
      <PanelErrorBoundary fallback={fallback} onReload={onReload}>
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(screen.getByText("Panel content failed.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalledOnce();
    failure.armed = false;
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Recovered content")).toBeVisible();
  });

  it("renders children untouched while nothing throws", () => {
    failure.armed = false;
    renderInPanel(
      <PanelErrorBoundary>
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(screen.getByText("Recovered content")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
