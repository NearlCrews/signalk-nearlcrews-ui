import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CSSProperties, ReactElement } from "react";
import type * as ReactAria from "react-aria-components";
import { Button, DialogTrigger } from "react-aria-components";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OverlayPlacement } from "../../src/components/overlay-placement.js";
import { OverlayPopover } from "../../src/components/overlay-popover.js";
import { OverlayLayerProvider } from "../../src/utils/overlay-layer.js";
import { renderInPanel } from "../helpers.js";

/** The props each render handed React Aria's Popover, newest last. */
const surfaces = vi.hoisted((): Record<string, unknown>[] => []);

// React Aria computes the position from the placement, which jsdom cannot
// lay out, so the spec reads the placement and layer the surface was given.
vi.mock("react-aria-components", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactAria>();
  const { createElement } = await import("react");
  return {
    ...actual,
    Popover: (props: Record<string, unknown>) => {
      surfaces.push(props);
      return createElement(actual.Popover, props);
    },
  };
});

/** The props of the latest render of the surface. */
function lastSurface(): Record<string, unknown> {
  const props = surfaces.at(-1);
  if (props === undefined) throw new Error("The surface never rendered.");
  return props;
}

interface OverlayOptions {
  readonly ariaLabel?: string;
  readonly ariaLabelledBy?: string;
  readonly id?: string;
  readonly placement?: OverlayPlacement;
  readonly ready?: boolean;
  readonly style?: CSSProperties;
}

function overlay({
  ariaLabel,
  ariaLabelledBy,
  id,
  placement = "bottom",
  ready = true,
  style,
}: OverlayOptions = {}): ReactElement {
  return (
    <DialogTrigger>
      <Button>Info</Button>
      <OverlayPopover
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className="snui-popover"
        id={id}
        placement={placement}
        ready={ready}
        style={style}
      >
        <p>Hint text</p>
      </OverlayPopover>
    </DialogTrigger>
  );
}

describe("OverlayPopover", () => {
  beforeEach(() => {
    surfaces.length = 0;
  });

  it("renders nothing until the owning panel root has resolved", async () => {
    const user = userEvent.setup();
    renderInPanel(overlay({ ready: false }));

    await user.click(screen.getByRole("button", { name: "Info" }));

    // A surface mounted against an unresolved portal container would lose
    // its role and focus effects for good, so it waits for the root.
    expect(surfaces).toEqual([]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["bottom", "bottom start"],
    ["top", "top start"],
    ["start", "start"],
    ["end", "end"],
  ] as const)(
    "places a %s overlay at React Aria's %s",
    (placement, reactAriaPlacement) => {
      renderInPanel(overlay({ placement }));

      expect(lastSurface().placement).toBe(reactAriaPlacement);
    },
  );

  it("paints in the plain overlay band outside any modal", () => {
    renderInPanel(overlay());

    expect(lastSurface().style).toEqual({ zIndex: "var(--snui-z-overlay)" });
  });

  it("paints one step into the modal band per nesting layer", () => {
    renderInPanel(
      <OverlayLayerProvider value={2}>{overlay()}</OverlayLayerProvider>,
    );

    expect(lastSurface().style).toEqual({
      zIndex: "calc(var(--snui-z-modal) + 2)",
    });
  });

  it("keeps the style entries it is given beside a layer it owns", () => {
    renderInPanel(
      overlay({
        style: {
          "--snui-popover-width": "18rem",
          zIndex: 1,
        } as CSSProperties,
      }),
    );

    expect(lastSurface().style).toEqual({
      "--snui-popover-width": "18rem",
      zIndex: "var(--snui-z-overlay)",
    });
  });

  it("leaves out the surface props the caller left unset", () => {
    renderInPanel(overlay());

    // React Aria declares these without undefined, so an unset prop must be
    // absent rather than present and empty.
    const props = lastSurface();
    expect(props).not.toHaveProperty("aria-label");
    expect(props).not.toHaveProperty("aria-labelledby");
    expect(props).not.toHaveProperty("id");
  });

  it("hands the open surface the name, id, and class it is given", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <h2 id="chart-heading">Chart details</h2>
        {overlay({
          ariaLabel: "Chart options",
          ariaLabelledBy: "chart-heading",
          id: "chart-details",
        })}
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Info" }));

    const surface = screen.getByRole("dialog", { name: "Chart details" });
    expect(surface).toHaveAttribute("aria-label", "Chart options");
    expect(surface).toHaveAttribute("id", "chart-details");
    expect(surface).toHaveClass("snui-popover");
    expect(surface).toHaveTextContent("Hint text");
    expect(surface.closest(".snui-root")).not.toBeNull();
  });
});
