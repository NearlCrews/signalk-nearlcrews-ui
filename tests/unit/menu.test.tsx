import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  Button,
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
  Popover,
} from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

describe("Menu", () => {
  it("throws when the label is empty", () => {
    expect(() =>
      renderInPanel(
        <Menu label="  ">
          <MenuItem id="open">Open</MenuItem>
        </Menu>,
      ),
    ).toThrow("Menu requires a non-empty label to name its trigger button.");
  });

  it("opens on click and portals the menu into the panel root", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="File">
        <MenuItem id="open">Open</MenuItem>
      </Menu>,
    );

    const trigger = screen.getByRole("button", { name: "File" });
    // RAC reports aria-haspopup="true" instead of "menu" to work around a
    // Firefox parsing quirk.
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    const menu = screen.getByRole("menu");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(menu).toHaveClass("snui-menu");
    expect(menu.closest(".snui-root")).not.toBeNull();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="File">
        <MenuItem id="open">Open</MenuItem>
      </Menu>,
    );

    const trigger = screen.getByRole("button", { name: "File" });
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    // RAC restores focus from a requestAnimationFrame callback.
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("closes on outside press", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <Menu label="File">
          <MenuItem id="open">Open</MenuItem>
        </Menu>
        <p>Outside content</p>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "File" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByText("Outside content"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("dispatches onAction with the item id and closes", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderInPanel(
      <Menu label="Edit" onAction={onAction}>
        <MenuItem id="copy">Copy</MenuItem>
        <MenuItem id="paste">Paste</MenuItem>
      </Menu>,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("menuitem", { name: "Paste" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith("paste");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("activates the focused item with Enter from the keyboard", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderInPanel(
      <Menu label="Edit" onAction={onAction}>
        <MenuItem id="copy">Copy</MenuItem>
      </Menu>,
    );

    screen.getByRole("button", { name: "Edit" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Copy" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledWith("copy");
  });

  it("works without an onAction handler", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="View">
        <MenuItem id="zoom">Zoom</MenuItem>
      </Menu>,
    );

    await user.click(screen.getByRole("button", { name: "View" }));
    await user.click(screen.getByRole("menuitem", { name: "Zoom" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("marks destructive items with the danger class", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="Crew">
        <MenuItem id="rename">Rename</MenuItem>
        <MenuItem id="remove" destructive>
          Remove
        </MenuItem>
      </Menu>,
    );

    await user.click(screen.getByRole("button", { name: "Crew" }));

    expect(screen.getByRole("menuitem", { name: "Remove" })).toHaveClass(
      "snui-menu__item",
      "snui-menu__item--destructive",
    );
    expect(screen.getByRole("menuitem", { name: "Rename" })).not.toHaveClass(
      "snui-menu__item--destructive",
    );
  });

  it("does not activate disabled items and skips them in keyboard navigation", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderInPanel(
      <Menu label="Go" onAction={onAction}>
        <MenuItem id="first">First</MenuItem>
        <MenuItem id="second" disabled>
          Second
        </MenuItem>
        <MenuItem id="third">Third</MenuItem>
      </Menu>,
    );

    screen.getByRole("button", { name: "Go" }).focus();
    await user.keyboard("{ArrowDown}");

    const first = screen.getByRole("menuitem", { name: "First" });
    const second = screen.getByRole("menuitem", { name: "Second" });
    expect(first).toHaveFocus();
    expect(second).toHaveAttribute("aria-disabled", "true");

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Third" })).toHaveFocus();

    await user.click(second);
    expect(onAction).not.toHaveBeenCalledWith("second");
  });

  it("focuses an item by typing its first letter", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="Jump">
        <MenuItem id="alpha">Alpha</MenuItem>
        <MenuItem id="bravo">Bravo</MenuItem>
        <MenuItem id="delta">Delta</MenuItem>
      </Menu>,
    );

    screen.getByRole("button", { name: "Jump" }).focus();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("d");

    expect(screen.getByRole("menuitem", { name: "Delta" })).toHaveFocus();
  });

  it("uses an explicit textValue for typeahead when children are elements", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="Jump">
        <MenuItem id="alpha">
          <span>Alpha</span>
        </MenuItem>
        <MenuItem id="delta" textValue="Delta">
          <span>Delta with icon</span>
        </MenuItem>
      </Menu>,
    );

    screen.getByRole("button", { name: "Jump" }).focus();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("d");

    expect(
      screen.getByRole("menuitem", { name: "Delta with icon" }),
    ).toHaveFocus();
  });

  it("renders sections with titled groups and separators", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="View">
        <MenuSection title="Panels">
          <MenuItem id="charts">Charts</MenuItem>
        </MenuSection>
        <MenuSeparator />
        <MenuSection>
          <MenuItem id="reset">Reset layout</MenuItem>
        </MenuSection>
      </Menu>,
    );

    await user.click(screen.getByRole("button", { name: "View" }));

    expect(screen.getByRole("group", { name: "Panels" })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Charts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Reset layout" }),
    ).toBeInTheDocument();
  });

  it("defaults to bottom placement and maps explicit placements", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <Menu label="Below">
          <MenuItem id="one">One</MenuItem>
        </Menu>
        <Menu label="Aside" placement="end">
          <MenuItem id="two">Two</MenuItem>
        </Menu>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Below" }));
    expect(
      screen.getByRole("menu").closest(".snui-menu-popover"),
    ).toHaveAttribute("data-placement", "bottom");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Aside" }));
    expect(
      screen.getByRole("menu").closest(".snui-menu-popover"),
    ).toHaveAttribute("data-placement", "right");
  });

  it("passes variant and size through to the trigger button", () => {
    renderInPanel(
      <Menu label="File" triggerVariant="primary" triggerSize="compact">
        <MenuItem id="open">Open</MenuItem>
      </Menu>,
    );

    expect(screen.getByRole("button", { name: "File" })).toHaveClass(
      "snui-button--primary",
      "snui-button--size-compact",
    );
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = renderInPanel(
      <Menu label="File" open={false} onOpenChange={onOpenChange}>
        <MenuItem id="open">Open</MenuItem>
      </Menu>,
    );

    expect(screen.queryByRole("menu")).toBeNull();

    await user.click(screen.getByRole("button", { name: "File" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("menu")).toBeNull();

    rerender(
      panel(
        <Menu label="File" open onOpenChange={onOpenChange}>
          <MenuItem id="open">Open</MenuItem>
        </Menu>,
      ),
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("opens from defaultOpen", () => {
    renderInPanel(
      <Menu label="File" defaultOpen>
        <MenuItem id="open">Open</MenuItem>
      </Menu>,
    );

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("merges a consumer className onto the menu list", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="File" className="plugin-menu">
        <MenuItem id="open">Open</MenuItem>
      </Menu>,
    );

    await user.click(screen.getByRole("button", { name: "File" }));
    expect(screen.getByRole("menu")).toHaveClass("snui-menu", "plugin-menu");
  });
});

describe("Popover", () => {
  it("opens on trigger click and forwards ref to the popover element", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    renderInPanel(
      <Popover ref={ref} trigger={<Button>Details</Button>}>
        <p>Depth details</p>
      </Popover>,
    );

    const trigger = screen.getByRole("button", { name: "Details" });
    await user.click(trigger);

    const popover = screen.getByRole("dialog", { name: "Details" });
    expect(popover).toHaveTextContent("Depth details");
    expect(popover).toHaveClass("snui-popover");
    expect(popover.closest(".snui-root")).not.toBeNull();
    expect(ref.current).toBe(popover);
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Popover trigger={<Button>Details</Button>}>
        <p>Depth details</p>
      </Popover>,
    );

    const trigger = screen.getByRole("button", { name: "Details" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    // RAC restores focus from a requestAnimationFrame callback.
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("closes on outside press", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <Popover trigger={<Button>Details</Button>}>
          <p>Depth details</p>
        </Popover>
        <p>Outside content</p>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByText("Outside content"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens from defaultOpen and reports close requests", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInPanel(
      <Popover
        defaultOpen
        onOpenChange={onOpenChange}
        trigger={<Button>Info</Button>}
      >
        <p>Hint text</p>
      </Popover>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = renderInPanel(
      <Popover
        onOpenChange={onOpenChange}
        open={false}
        trigger={<Button>Info</Button>}
      >
        <p>Hint text</p>
      </Popover>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      panel(
        <Popover
          onOpenChange={onOpenChange}
          open
          trigger={<Button>Info</Button>}
        >
          <p>Hint text</p>
        </Popover>,
      ),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("maps placement to the RAC placement axis", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Popover placement="top" trigger={<Button>Info</Button>}>
        <p>Hint text</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("data-placement", "top");
  });

  it("applies a fixed pixel width through a CSS variable", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Popover trigger={<Button>Info</Button>} width={240}>
        <p>Hint text</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(
      screen.getByRole("dialog").style.getPropertyValue("--snui-popover-width"),
    ).toBe("240px");
  });

  it("merges a consumer className onto the popover", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Popover className="plugin-popover" trigger={<Button>Info</Button>}>
        <p>Hint text</p>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Info" }));
    expect(screen.getByRole("dialog")).toHaveClass(
      "snui-popover",
      "plugin-popover",
    );
  });
});
