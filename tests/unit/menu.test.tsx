import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
} from "../../src/overlays.js";
import { panel, renderInPanel } from "../helpers.js";

/** Opens a menu from its trigger with the keyboard, landing on the first item. */
async function openFromKeyboard(
  user: UserEvent,
  triggerName: string,
): Promise<void> {
  screen.getByRole("button", { name: triggerName }).focus();
  await user.keyboard("{ArrowDown}");
}

describe("Menu", () => {
  it("rejects rendering outside PanelRoot", () => {
    expect(() =>
      render(
        <Menu label="File">
          <MenuItem id="open">Open</MenuItem>
        </Menu>,
      ),
    ).toThrow("Menu must be rendered inside PanelRoot.");
  });

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

    await openFromKeyboard(user, "Edit");
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

  it("marks danger items with the danger class", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="Crew">
        <MenuItem id="rename">Rename</MenuItem>
        <MenuItem id="remove" tone="danger">
          Remove
        </MenuItem>
      </Menu>,
    );

    await user.click(screen.getByRole("button", { name: "Crew" }));

    expect(screen.getByRole("menuitem", { name: /Remove/ })).toHaveClass(
      "snui-menu__item",
      "snui-menu__item--destructive",
    );
    expect(screen.getByRole("menuitem", { name: "Rename" })).not.toHaveClass(
      "snui-menu__item--destructive",
    );
  });

  it("announces the danger tone after the item's own words", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="Crew">
        <MenuItem id="remove" tone="danger">
          Remove
        </MenuItem>
        <MenuItem id="purge" tone="danger" toneLabel="Cannot be undone">
          Purge history
        </MenuItem>
        <MenuItem id="archive" tone="neutral">
          Archive
        </MenuItem>
      </Menu>,
    );

    await user.click(screen.getByRole("button", { name: "Crew" }));

    const remove = screen.getByRole("menuitem", { name: /Remove/ });
    const purge = screen.getByRole("menuitem", { name: /Purge history/ });
    // The name reads the item's own words first, then the tone.
    expect(remove).toHaveTextContent(/^Remove Destructive action\.$/);
    expect(purge).toHaveTextContent(/^Purge history Cannot be undone\.$/);
    expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveTextContent(
      "Archive",
    );

    // The tone name is not part of the string keystrokes match against.
    await user.keyboard("p");
    expect(purge).toHaveFocus();
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

    await openFromKeyboard(user, "Go");

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

    await openFromKeyboard(user, "Jump");
    await user.keyboard("d");

    expect(screen.getByRole("menuitem", { name: "Delta" })).toHaveFocus();
  });

  it("derives typeahead text from the text inside element children", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="Jump">
        <MenuItem id="alpha">
          <span>Alpha</span>
        </MenuItem>
        <MenuItem id="delta">
          <span aria-hidden="true">*</span>
          <span>Delta</span>
        </MenuItem>
      </Menu>,
    );

    await openFromKeyboard(user, "Jump");
    await user.keyboard("d");

    expect(screen.getByRole("menuitem", { name: "Delta" })).toHaveFocus();
  });

  it("separates the words of sibling elements in the typeahead text", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="Jump">
        <MenuItem id="alpha">Alpha</MenuItem>
        <MenuItem id="delete-route" data-testid="delete-route">
          <span>Delete</span>
          <span>route</span>
        </MenuItem>
      </Menu>,
    );

    await openFromKeyboard(user, "Jump");
    // Typeahead matches a prefix, so the space is the whole test: joined edge
    // to edge the two spans read "Deleteroute" and "delete r" matches nothing.
    await user.keyboard("delete r");

    expect(screen.getByTestId("delete-route")).toHaveFocus();
  });

  it("forwards refs and forwarded DOM attributes to the menu elements", async () => {
    const user = userEvent.setup();
    const menuRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLDivElement>();
    const sectionRef = createRef<HTMLElement>();
    const separatorRef = createRef<HTMLElement>();
    const onPointerDown = vi.fn();
    renderInPanel(
      <Menu label="View" ref={menuRef} id="view-menu" data-testid="view-menu">
        <MenuSection ref={sectionRef} title="Panels" data-testid="panels">
          <MenuItem
            id="charts"
            ref={itemRef}
            data-testid="charts"
            onPointerDown={onPointerDown}
            style={{ color: "rgb(1, 2, 3)" }}
          >
            Charts
          </MenuItem>
        </MenuSection>
        <MenuSeparator ref={separatorRef} data-testid="view-separator" />
        <MenuItem id="reset">Reset layout</MenuItem>
      </Menu>,
    );

    await user.click(screen.getByRole("button", { name: "View" }));

    const menu = screen.getByRole("menu");
    expect(menuRef.current).toBe(menu);
    expect(menu).toHaveAttribute("id", "view-menu");
    expect(menu).toHaveAttribute("data-testid", "view-menu");

    const item = screen.getByRole("menuitem", { name: "Charts" });
    expect(itemRef.current).toBe(item);
    expect(item).toHaveAttribute("data-testid", "charts");
    expect(item).toHaveStyle({ color: "rgb(1, 2, 3)" });
    await user.pointer({ keys: "[MouseLeft>]", target: item });
    expect(onPointerDown).toHaveBeenCalled();

    expect(sectionRef.current).toBe(
      screen.getByRole("group", { name: "Panels" }),
    );
    expect(sectionRef.current).toHaveAttribute("data-testid", "panels");
    expect(separatorRef.current).toBe(screen.getByRole("separator"));
    expect(separatorRef.current).toHaveAttribute(
      "data-testid",
      "view-separator",
    );
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

    await openFromKeyboard(user, "Jump");
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

  it("renders no section header for a blank title", async () => {
    const user = userEvent.setup();
    const { container } = renderInPanel(
      <Menu label="View">
        <MenuSection title="">
          <MenuItem id="charts">Charts</MenuItem>
        </MenuSection>
        {/* The shape conditional copy arrives in. */}
        <MenuSection title={false}>
          <MenuItem id="reset">Reset layout</MenuItem>
        </MenuSection>
      </Menu>,
    );

    await user.click(screen.getByRole("button", { name: "View" }));

    expect(container.querySelector(".snui-menu__section-header")).toBeNull();
    expect(screen.getAllByRole("group")).toHaveLength(2);
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
        <Menu label="Beside" placement="start">
          <MenuItem id="three">Three</MenuItem>
        </Menu>
        <Menu label="Above" placement="top">
          <MenuItem id="four">Four</MenuItem>
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
    await user.keyboard("{Escape}");

    // The start edge resolves against the writing direction, so it is the
    // left side of a left-to-right panel.
    await user.click(screen.getByRole("button", { name: "Beside" }));
    expect(
      screen.getByRole("menu").closest(".snui-menu-popover"),
    ).toHaveAttribute("data-placement", "left");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Above" }));
    expect(
      screen.getByRole("menu").closest(".snui-menu-popover"),
    ).toHaveAttribute("data-placement", "top");
  });

  it("names an icon-only trigger from triggerLabel and refuses an unnamed one", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu
        label={<span aria-hidden="true">⋯</span>}
        triggerLabel="Row actions"
      >
        <MenuItem id="rename">Rename</MenuItem>
      </Menu>,
    );

    const trigger = screen.getByRole("button", { name: "Row actions" });
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    expect(() =>
      renderInPanel(
        <Menu label={<span aria-hidden="true">⋯</span>}>
          <MenuItem id="rename">Rename</MenuItem>
        </Menu>,
      ),
    ).toThrow(
      "Menu requires a triggerLabel when its label renders no text, so the trigger button is not left unnamed.",
    );
  });

  it("names an icon-only item from aria-label while typeahead uses textValue", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Menu label="Crew">
        <MenuItem id="rename">Rename</MenuItem>
        <MenuItem
          id="delete"
          aria-label="Delete route"
          textValue="Delete route"
        >
          <span aria-hidden="true">×</span>
        </MenuItem>
      </Menu>,
    );

    await openFromKeyboard(user, "Crew");
    await user.keyboard("d");

    expect(
      screen.getByRole("menuitem", { name: "Delete route" }),
    ).toHaveFocus();
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
