import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  PANEL_LABEL_DEFAULTS,
  PanelRoot,
  THEME_CHOICES,
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
    // pinned once, in "explains Match Admin in the operator's words" below.
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

  it("supports per-instance theme labels with safe fallbacks", () => {
    renderInPanel(
      <ThemeToggle
        label="Thème du panneau"
        choiceLabels={{ auto: "Automatique", dark: "Sombre", light: "  " }}
      />,
    );

    const group = screen.getByRole("radiogroup", {
      name: "Thème du panneau",
    });
    expect(
      within(group).getByRole("radio", { name: "Automatique" }),
    ).toBeVisible();
    expect(within(group).getByRole("radio", { name: "Light" })).toBeVisible();
    expect(within(group).getByRole("radio", { name: "Sombre" })).toBeVisible();
  });

  it("explains Match Admin in the operator's words", () => {
    renderInPanel(<ThemeToggle />);

    // The one package sentence every operator sees on every panel, so it
    // names the product rather than the host's internals.
    expect(
      screen.getByRole("radiogroup", { name: /Panel theme/ }),
    ).toHaveAccessibleDescription(
      "Match Admin uses the Signal K Admin theme when Admin shares one, and Light until then.",
    );
  });

  it("marks each theme radio with its choice, whatever its label says", () => {
    renderInPanel(<ThemeToggle choiceLabels={{ night: "Nacht" }} />);

    // A consumer test finds a theme by this hook rather than by the package's
    // wording, so a label change or a translation does not break it.
    for (const choice of THEME_CHOICES) {
      expect(
        document.querySelector(`[data-snui-theme-choice="${choice}"]`),
      ).toHaveAttribute("role", "radio");
    }
    expect(
      document.querySelector('[data-snui-theme-choice="night"]'),
    ).toHaveAccessibleName("Nacht");
  });
});
