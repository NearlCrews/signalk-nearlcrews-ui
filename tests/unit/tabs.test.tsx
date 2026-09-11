import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Tab, TabList, TabPanel, Tabs } from "../../src/composites.js";
import { Badge, PanelRoot } from "../../src/index.js";
import { renderInPanel } from "../helpers.js";

function renderTabs(
  props: Partial<React.ComponentProps<typeof Tabs>> = {},
): ReturnType<typeof renderInPanel> {
  return renderInPanel(
    <Tabs defaultValue="engine" {...props}>
      <TabList aria-label="Conversion categories">
        <Tab value="engine">Engine</Tab>
        <Tab value="nav" badge={<Badge tone="danger">2</Badge>}>
          Navigation
        </Tab>
        <Tab value="env" disabled>
          Environment
        </Tab>
        <Tab value="ais">AIS</Tab>
      </TabList>
      <TabPanel value="engine">Engine panel</TabPanel>
      <TabPanel value="nav">Navigation panel</TabPanel>
      <TabPanel value="env">Environment panel</TabPanel>
      <TabPanel value="ais">AIS panel</TabPanel>
    </Tabs>,
  );
}

describe("Tabs", () => {
  it("renders the tabs pattern with one tab stop and labeled panels", () => {
    renderTabs();

    const list = screen.getByRole("tablist", { name: "Conversion categories" });
    expect(list).toHaveAttribute("aria-orientation", "horizontal");
    const engine = screen.getByRole("tab", { name: "Engine" });
    expect(engine).toHaveAttribute("aria-selected", "true");
    expect(engine).toHaveAttribute("tabindex", "0");
    const nav = screen.getByRole("tab", { name: /^Navigation/ });
    // The badge, including its tone announcement, joins the tab's name.
    expect(nav).toHaveAccessibleName(/Navigation\s+Error\.\s*2/);
    expect(nav).toHaveAttribute("aria-selected", "false");
    expect(nav).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Environment" })).toBeDisabled();

    const panel = screen.getByRole("tabpanel", { name: "Engine" });
    expect(panel.id).toBe(engine.getAttribute("aria-controls"));
    expect(panel).toHaveAttribute("aria-labelledby", engine.id);
    expect(panel).toHaveAttribute("tabindex", "0");
    expect(panel).toHaveTextContent("Engine panel");
    expect(screen.getByText("Navigation panel")).not.toBeVisible();
  });

  it("selects on click and reports the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderTabs({ onValueChange });

    await user.click(screen.getByRole("tab", { name: /Navigation/ }));
    expect(onValueChange).toHaveBeenCalledWith("nav");
    expect(screen.getByRole("tab", { name: /Navigation/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Navigation panel")).toBeVisible();
    expect(screen.getByText("Engine panel")).not.toBeVisible();
  });

  it("moves focus with the arrow keys, skips disabled tabs, and wraps", async () => {
    const user = userEvent.setup();
    renderTabs();

    const engine = screen.getByRole("tab", { name: "Engine" });
    engine.focus();
    await user.keyboard("{ArrowRight}");
    const nav = screen.getByRole("tab", { name: /Navigation/ });
    expect(nav).toHaveFocus();
    expect(nav).toHaveAttribute("aria-selected", "true");

    // Environment is disabled, so the next stop is AIS.
    await user.keyboard("{ArrowRight}");
    const ais = screen.getByRole("tab", { name: "AIS" });
    expect(ais).toHaveFocus();
    expect(ais).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowRight}");
    expect(engine).toHaveFocus();

    await user.keyboard("{End}");
    expect(ais).toHaveFocus();
    await user.keyboard("{Home}");
    expect(engine).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(ais).toHaveFocus();
  });

  it("only moves focus under manual activation until Enter or Space", async () => {
    const user = userEvent.setup();
    renderTabs({ activation: "manual" });

    const engine = screen.getByRole("tab", { name: "Engine" });
    engine.focus();
    await user.keyboard("{ArrowRight}");
    const nav = screen.getByRole("tab", { name: /Navigation/ });
    expect(nav).toHaveFocus();
    expect(nav).toHaveAttribute("aria-selected", "false");
    expect(engine).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Enter}");
    expect(nav).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Navigation panel")).toBeVisible();
  });

  it("reverses horizontal arrows in right-to-left layouts", () => {
    render(
      <div dir="rtl">
        <PanelRoot>
          <Tabs defaultValue="a">
            <TabList aria-label="Pages">
              <Tab value="a">First</Tab>
              <Tab value="b">Second</Tab>
            </TabList>
            <TabPanel value="a">A</TabPanel>
            <TabPanel value="b">B</TabPanel>
          </Tabs>
        </PanelRoot>
      </div>,
    );

    const first = screen.getByRole("tab", { name: "First" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Second" })).toHaveFocus();
  });

  it("uses the vertical arrows for a vertical list", async () => {
    const user = userEvent.setup();
    renderTabs({ orientation: "vertical" });

    expect(screen.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "vertical",
    );
    const engine = screen.getByRole("tab", { name: "Engine" });
    engine.focus();
    await user.keyboard("{ArrowRight}");
    expect(engine).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: /Navigation/ })).toHaveFocus();
  });

  it("supports a controlled value and unmounting hidden panels", async () => {
    const user = userEvent.setup();

    function Owner(): React.JSX.Element {
      const [value, setValue] = useState("a");
      return (
        <PanelRoot>
          <Tabs value={value} onValueChange={setValue}>
            <TabList aria-label="Pages">
              <Tab value="a">First</Tab>
              <Tab value="b">Second</Tab>
            </TabList>
            <TabPanel value="a" mountStrategy="unmount">
              First panel
            </TabPanel>
            <TabPanel value="b" mountStrategy="unmount">
              Second panel
            </TabPanel>
          </Tabs>
        </PanelRoot>
      );
    }

    render(<Owner />);
    expect(screen.queryByText("Second panel")).toBeNull();
    expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(2);

    await user.click(screen.getByRole("tab", { name: "Second" }));
    expect(screen.getByText("Second panel")).toBeVisible();
    expect(screen.queryByText("First panel")).toBeNull();
  });

  it("builds a function child only where an unmounting panel renders it", async () => {
    const user = userEvent.setup();
    const buildFirst = vi.fn(() => <p>First panel</p>);
    const buildSecond = vi.fn(() => <p>Second panel</p>);
    renderInPanel(
      <Tabs defaultValue="a">
        <TabList aria-label="Pages">
          <Tab value="a">First</Tab>
          <Tab value="b">Second</Tab>
        </TabList>
        <TabPanel value="a" mountStrategy="unmount">
          {buildFirst}
        </TabPanel>
        <TabPanel value="b" mountStrategy="unmount">
          {buildSecond}
        </TabPanel>
      </Tabs>,
    );

    expect(buildFirst).toHaveBeenCalled();
    expect(buildSecond).not.toHaveBeenCalled();
    expect(screen.getByText("First panel")).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Second" }));
    expect(buildSecond).toHaveBeenCalled();
    expect(screen.getByText("Second panel")).toBeVisible();
    expect(screen.queryByText("First panel")).toBeNull();

    // The function form keeps the wiring the plain children form has.
    const second = screen.getByRole("tab", { name: "Second" });
    const secondPanel = screen.getByRole("tabpanel", { name: "Second" });
    expect(secondPanel.id).toBe(second.getAttribute("aria-controls"));
    expect(secondPanel).toHaveAttribute("aria-labelledby", second.id);
    expect(secondPanel).toHaveAttribute("tabindex", "0");
  });

  it("builds a retained panel's function child while it is hidden", () => {
    const buildSecond = vi.fn(() => <p>Second panel</p>);
    renderInPanel(
      <Tabs defaultValue="a">
        <TabList aria-label="Pages">
          <Tab value="a">First</Tab>
          <Tab value="b">Second</Tab>
        </TabList>
        <TabPanel value="a">First panel</TabPanel>
        <TabPanel value="b">{buildSecond}</TabPanel>
      </Tabs>,
    );

    expect(buildSecond).toHaveBeenCalled();
    expect(screen.getByText("Second panel")).not.toBeVisible();
  });

  it("forwards refs and attributes on every part", () => {
    const tabsRef = createRef<HTMLDivElement>();
    const listRef = createRef<HTMLDivElement>();
    const tabRef = createRef<HTMLButtonElement>();
    const panelRef = createRef<HTMLDivElement>();
    renderInPanel(
      <Tabs ref={tabsRef} defaultValue="a" data-testid="tabs">
        <TabList ref={listRef} aria-label="Pages" data-testid="list">
          <Tab ref={tabRef} value="a" data-testid="tab">
            First
          </Tab>
        </TabList>
        <TabPanel ref={panelRef} value="a" data-testid="panel">
          First panel
        </TabPanel>
      </Tabs>,
    );

    expect(tabsRef.current).toBe(screen.getByTestId("tabs"));
    expect(listRef.current).toBe(screen.getByTestId("list"));
    expect(tabRef.current).toBe(screen.getByTestId("tab"));
    expect(panelRef.current).toBe(screen.getByTestId("panel"));
  });

  it("keeps a tab stop when nothing is selected", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: undefined });

    const engine = screen.getByRole("tab", { name: "Engine" });
    expect(engine).toHaveAttribute("aria-selected", "false");
    expect(engine).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: /Navigation/ })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.queryAllByRole("tabpanel")).toHaveLength(0);

    await user.tab();
    expect(engine).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Navigation/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("falls back to the first enabled tab for a value that matches none", () => {
    renderInPanel(
      <Tabs value="saved-by-an-earlier-release">
        <TabList aria-label="Pages">
          <Tab value="a" disabled>
            First
          </Tab>
          <Tab value="b">Second</Tab>
          <Tab value="c">Third</Tab>
        </TabList>
        <TabPanel value="a">A</TabPanel>
        <TabPanel value="b">B</TabPanel>
        <TabPanel value="c">C</TabPanel>
      </Tabs>,
    );

    expect(screen.getByRole("tab", { name: "Second" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: "First" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.getByRole("tab", { name: "Third" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("lets a tab's own handlers block the selection and the focus move", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderInPanel(
      <Tabs defaultValue="a" onValueChange={onValueChange}>
        <TabList aria-label="Pages">
          <Tab value="a">First</Tab>
          <Tab
            value="b"
            onClick={(event) => {
              event.preventDefault();
            }}
            onKeyDown={(event) => {
              event.preventDefault();
            }}
          >
            Second
          </Tab>
        </TabList>
        <TabPanel value="a">First panel</TabPanel>
        <TabPanel value="b">Second panel</TabPanel>
      </Tabs>,
    );

    const second = screen.getByRole("tab", { name: "Second" });
    await user.click(second);
    expect(second).toHaveAttribute("aria-selected", "false");
    expect(onValueChange).not.toHaveBeenCalled();

    second.focus();
    await user.keyboard("{ArrowRight}");
    expect(second).toHaveFocus();
  });

  it("keeps ids resolvable for a value holding spaces", () => {
    const value = "navigation.position source 1";
    renderInPanel(
      <Tabs defaultValue={value}>
        <TabList aria-label="Sources">
          <Tab value={value}>Position source 1</Tab>
        </TabList>
        <TabPanel value={value}>Position panel</TabPanel>
      </Tabs>,
    );

    const tab = screen.getByRole("tab", { name: "Position source 1" });
    // aria-controls and aria-labelledby are space separated lists, so an id
    // holding a space would silently point at two ids that do not exist.
    expect(tab.id).not.toMatch(/\s/);
    const controlled = tab.getAttribute("aria-controls") ?? "";
    expect(controlled).not.toMatch(/\s/);
    const tabpanel = screen.getByRole("tabpanel", {
      name: "Position source 1",
    });
    expect(document.getElementById(controlled)).toBe(tabpanel);
    expect(tabpanel).toHaveAttribute("aria-labelledby", tab.id);
  });

  it("rejects an unnamed list, a blank tab, and parts outside Tabs", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      renderInPanel(
        <Tabs>
          <TabList>
            <Tab value="a">First</Tab>
          </TabList>
        </Tabs>,
      ),
    ).toThrow("TabList requires an accessible name");
    expect(() =>
      renderInPanel(
        <Tabs>
          <TabList aria-label="Pages">
            <Tab value="a"> </Tab>
          </TabList>
        </Tabs>,
      ),
    ).toThrow("Tab requires a non-empty label.");
    expect(() => renderInPanel(<TabPanel value="a">Orphan</TabPanel>)).toThrow(
      "TabPanel must be rendered inside Tabs.",
    );
  });
});
