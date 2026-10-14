import { render, screen } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider, usePanelTheme } from "../../src/theme/context.js";
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "../../src/theme/contract.js";

/** Shows the theme the nearest provider resolved. */
function ThemeReadout(): React.JSX.Element {
  return <p data-testid="theme">{usePanelTheme().theme}</p>;
}

/** A sibling that fails to render, so React discards the whole render. */
function FailingSibling(): never {
  throw new Error("Sibling failed.");
}

/** Catches the failure above, so the provider beside it never commits. */
class Boundary extends Component<
  { readonly children: ReactNode },
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

describe("theme seed", () => {
  it("leaves no seed behind from a render React threw away", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const discarded = render(
      <Boundary>
        <ThemeProvider defaultTheme="night">
          <ThemeReadout />
          <FailingSibling />
        </ThemeProvider>
      </Boundary>,
    );
    expect(screen.queryByTestId("theme")).toBeNull();
    discarded.unmount();

    // The discarded panel never committed, so the next panel's own seed is
    // the one it starts at, not the seed of a panel nobody saw.
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeReadout />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("starts at its seed on the first paint, and a stored theme still wins", () => {
    const seeded = render(
      <ThemeProvider defaultTheme="night">
        <ThemeReadout />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("night");
    seeded.unmount();

    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(
      <ThemeProvider defaultTheme="night">
        <ThemeReadout />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });
});

describe("theme change event", () => {
  it("keeps the name every published copy dispatches and listens under", () => {
    // Part of the cross-copy contract with the storage key: a copy that
    // renamed it would stop hearing every older copy on the page.
    expect(THEME_CHANGE_EVENT).toBe("signalk-nearlcrews-ui-theme-change");
  });
});
