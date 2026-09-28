import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  PANEL_LABEL_DEFAULTS,
  PanelRoot,
  THEME_STORAGE_KEY,
  ThemeToggle,
} from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

describe("ThemeToggle", () => {
  it("restricts theme choices to the requested subset", () => {
    renderInPanel(<ThemeToggle choices={["light", "dark"]} />);

    expect(screen.getByRole("radio", { name: "Light" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeVisible();
    expect(screen.queryByRole("radio", { name: "Night" })).toBeNull();
  });

  it("offers the active theme even when the choices leave it out", async () => {
    const user = userEvent.setup();
    renderInPanel(<ThemeToggle choices={["light", "dark"]} />);

    // The panel renders in Auto until someone picks otherwise, so a narrowed
    // list that omits it would report nothing selected while the panel is
    // plainly in that theme.
    expect(screen.getByRole("radio", { name: "Match Admin" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "Match Admin" })).toBeNull();
  });

  it("shows the theme group's own label unless it is hidden", () => {
    const { container, rerender } = renderInPanel(<ThemeToggle />);

    // Five bare words at the foot of a panel say nothing about what they do.
    expect(
      container.querySelector(".snui-segmented__legend"),
    ).toHaveTextContent("Panel theme");

    rerender(panel(<ThemeToggle labelVisibility="hidden" />));
    expect(container.querySelector(".snui-segmented__legend")).toBeNull();
    expect(
      screen.getByRole("radiogroup", { name: "Panel theme" }),
    ).toBeVisible();
  });

  it("reports theme changes after applying them internally", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PanelRoot data-testid="panel">
        <ThemeToggle onValueChange={onChange} />
      </PanelRoot>,
    );

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(onChange).toHaveBeenCalledWith("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    await waitFor(() => {
      expect(screen.getByTestId("panel")).toHaveAttribute(
        "data-snui-theme",
        "dark",
      );
    });
  });
});

describe("ThemeToggle root", () => {
  it("forwards a ref and native attributes to the radiogroup", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(
      <ThemeToggle ref={ref} data-testid="theme-toggle" id="theme" />,
    );

    const group = screen.getByRole("radiogroup", { name: "Panel theme" });
    expect(ref.current).toBe(group);
    expect(group).toHaveAttribute("data-testid", "theme-toggle");
    expect(group).toHaveAttribute("id", "theme");
  });

  it("says what Match Admin resolves to, and drops it on null", () => {
    renderInPanel(
      <>
        <ThemeToggle label="Offered" />
        <ThemeToggle label="Quiet" description={null} />
        <ThemeToggle label="Device only" choices={["system", "light"]} />
      </>,
      { defaultTheme: "light" },
    );

    // The operator's words, read from the exported defaults so the test
    // follows the table rather than a copy of it; the sentence itself is
    // pinned once, in panel-root.test.tsx.
    expect(
      screen.getByRole("radiogroup", { name: "Offered" }),
    ).toHaveAccessibleDescription(PANEL_LABEL_DEFAULTS.themeToggle.description);
    expect(
      screen.getByRole("radiogroup", { name: "Quiet" }),
    ).toHaveAccessibleDescription("");
    // Nothing to explain where Match Admin is not offered.
    expect(
      screen.getByRole("radiogroup", { name: "Device only" }),
    ).toHaveAccessibleDescription("");
  });

  it("names the group from label and falls back when it is blank", () => {
    renderInPanel(
      <>
        <ThemeToggle label="Display" />
        <ThemeToggle label="  " />
      </>,
    );

    expect(screen.getByRole("radiogroup", { name: "Display" })).toBeVisible();
    expect(
      screen.getByRole("radiogroup", { name: "Panel theme" }),
    ).toBeVisible();
  });

  it("reports the theme through onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderInPanel(<ThemeToggle onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "Night" }));
    expect(onValueChange).toHaveBeenCalledWith("night");
  });
});
