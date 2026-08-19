import {
  type RenderResult,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";
import { describe, expect, it, vi } from "vitest";

import { Button, PanelRoot, type PanelRootProps } from "../../src/index.js";
import {
  AlertDialog,
  Dialog,
  type DialogProps,
  Popover,
} from "../../src/overlays.js";
import { renderInPanel } from "../helpers.js";

function renderDialog(
  props: Omit<DialogProps, "children" | "title"> = {},
  panelProps?: Omit<PanelRootProps, "children">,
): RenderResult {
  return renderInPanel(
    <Dialog title="Connection settings" {...props}>
      <p>Dialog body</p>
    </Dialog>,
    panelProps,
  );
}

function getScrim(container: HTMLElement): Element {
  const scrim = container.querySelector(".snui-scrim");
  if (scrim === null) {
    throw new Error("Expected the dialog scrim to be rendered.");
  }
  return scrim;
}

describe("Dialog", () => {
  it("rejects rendering outside PanelRoot", () => {
    expect(() =>
      render(
        <Dialog title="Connection settings" defaultOpen>
          <p>Dialog body</p>
        </Dialog>,
      ),
    ).toThrow("Dialog must be rendered inside PanelRoot.");
  });

  it("rejects a nested provider that redirects its portal outside PanelRoot", () => {
    expect(() =>
      render(
        <PanelRoot>
          <UNSAFE_PortalProvider getContainer={() => document.body}>
            <Dialog title="Connection settings" defaultOpen>
              <p>Dialog body</p>
            </Dialog>
          </UNSAFE_PortalProvider>
        </PanelRoot>,
      ),
    ).toThrow("Dialog portal container must be its owning PanelRoot.");
  });

  it("renders nothing while closed by default", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens from defaultOpen and is labelled by the title", () => {
    renderDialog({ defaultOpen: true });

    const dialog = screen.getByRole("dialog", {
      name: "Connection settings",
    });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveClass("snui-dialog", "snui-dialog--standard");
    expect(screen.getByText("Dialog body")).toBeVisible();
  });

  it("supports controlled open and reports changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    function Harness(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <PanelRoot>
          <Button onClick={() => setOpen(true)}>Open dialog</Button>
          <Dialog
            title="Connection settings"
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
          >
            <p>Dialog body</p>
          </Dialog>
        </PanelRoot>
      );
    }

    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog")).toBeVisible();

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lets open win over defaultOpen when both are given", () => {
    renderDialog({ defaultOpen: true, open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("throws when the title is empty", () => {
    expect(() => renderInPanel(<Dialog title="  ">Body</Dialog>)).toThrow(
      "Dialog requires a non-empty title.",
    );
  });

  it("closes on Escape by default", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog({ defaultOpen: true, onOpenChange });

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("dismisses on scrim press by default", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container } = renderDialog({ defaultOpen: true, onOpenChange });

    await user.click(getScrim(container));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("ignores scrim presses when dismissable is false", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container } = renderDialog({
      defaultOpen: true,
      dismissable: false,
      onOpenChange,
    });

    await user.click(getScrim(container));
    expect(onOpenChange).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("traps focus inside the dialog while open", async () => {
    const user = userEvent.setup();
    renderDialog({
      defaultOpen: true,
      actions: (
        <>
          <Button>Cancel</Button>
          <Button variant="primary">Save</Button>
        </>
      ),
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);

    for (let index = 0; index < 8; index += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    for (let index = 0; index < 8; index += 1) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("restores focus to the trigger after close", async () => {
    const user = userEvent.setup();

    function Harness(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <PanelRoot>
          <Button onClick={() => setOpen(true)}>Open dialog</Button>
          <Dialog
            title="Connection settings"
            open={open}
            onOpenChange={setOpen}
            actions={<Button onClick={() => setOpen(false)}>Done</Button>}
          >
            <p>Dialog body</p>
          </Dialog>
        </PanelRoot>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
      true,
    );

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // Focus restoration runs on the next animation frame after unmount.
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("portals inside the panel root element", () => {
    const { container } = renderDialog({ defaultOpen: true });

    const root = container.querySelector(".snui-root");
    expect(root).not.toBeNull();
    const dialog = screen.getByRole("dialog");
    expect(root?.contains(dialog)).toBe(true);
    expect(dialog.closest(".snui-root")).toBe(root);
  });

  it("applies the width classes", () => {
    const { unmount } = renderDialog({ defaultOpen: true });
    expect(screen.getByRole("dialog")).toHaveClass("snui-dialog--standard");
    unmount();

    renderDialog({ defaultOpen: true, width: "wide" });
    expect(screen.getByRole("dialog")).toHaveClass("snui-dialog--wide");
  });

  it("forwards the ref to the dialog element", () => {
    const ref = createRef<HTMLElement>();
    renderDialog({ defaultOpen: true, ref });

    expect(ref.current).toBe(screen.getByRole("dialog"));
    expect(ref.current).toHaveClass("snui-dialog");
  });

  it("renders the description and links it with aria-describedby", () => {
    renderDialog({
      defaultOpen: true,
      description: "Changes apply to every connected display.",
    });

    const dialog = screen.getByRole("dialog");
    const description = screen.getByText(
      "Changes apply to every connected display.",
    );
    expect(dialog).toHaveAttribute("aria-describedby", description.id);
  });

  it("renders the actions slot only when actions have content", () => {
    const { container, unmount } = renderDialog({
      defaultOpen: true,
      actions: <Button>Save</Button>,
    });
    expect(container.querySelector(".snui-dialog__actions")).not.toBeNull();
    unmount();

    const { container: withoutActions } = renderDialog({ defaultOpen: true });
    expect(withoutActions.querySelector(".snui-dialog__actions")).toBeNull();
  });

  it("supports an explicit heading level for the title", () => {
    renderDialog({ defaultOpen: true, headingLevel: 3 });
    expect(
      screen.getByRole("heading", { level: 3, name: "Connection settings" }),
    ).toBeVisible();
  });

  it("applies optional DOM and labeling props to the dialog and scrim", () => {
    const { container } = renderDialog({
      defaultOpen: true,
      blurScrim: true,
      className: "settings-dialog",
      id: "settings-dialog",
      style: { color: "red" },
      "aria-label": "Settings",
      "aria-labelledby": "external-title",
      "aria-details": "settings-details",
    });

    const scrim = getScrim(container);
    expect(scrim).toHaveClass("snui-scrim--blur");

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("snui-dialog", "settings-dialog");
    expect(dialog).toHaveAttribute("id", "settings-dialog");
    expect(dialog).toHaveStyle({ color: "rgb(255, 0, 0)" });
    expect(dialog).toHaveAttribute("aria-label", "Settings");
    expect(dialog).toHaveAttribute("aria-labelledby", "external-title");
    expect(dialog).toHaveAttribute("aria-details", "settings-details");
  });

  it("keeps nested overlays above their owning dialog", async () => {
    const user = userEvent.setup();
    const { container } = renderInPanel(
      <Dialog title="Connection settings" defaultOpen>
        <Popover trigger={<Button>Show details</Button>}>
          <p>Nested details</p>
        </Popover>
      </Dialog>,
    );

    const scrim = getScrim(container);
    expect(scrim).toHaveStyle({ zIndex: "calc(var(--snui-z-modal) + 1)" });
    await user.click(screen.getByRole("button", { name: "Show details" }));
    expect(screen.getByRole("dialog", { name: "Show details" })).toHaveStyle({
      zIndex: "calc(var(--snui-z-modal) + 2)",
    });
  });
});

describe("AlertDialog", () => {
  it("renders with the alertdialog role", () => {
    renderInPanel(
      <AlertDialog
        title="Discard route?"
        defaultOpen
        cancelLabel="Keep route"
        actions={<Button variant="danger">Discard</Button>}
      >
        <p>This cannot be undone.</p>
      </AlertDialog>,
    );

    expect(
      screen.getByRole("alertdialog", { name: "Discard route?" }),
    ).toBeVisible();
  });

  it("throws when cancelLabel is empty", () => {
    expect(() =>
      renderInPanel(
        <AlertDialog title="Discard route?" cancelLabel=" ">
          <p>This cannot be undone.</p>
        </AlertDialog>,
      ),
    ).toThrow(
      "AlertDialog requires a non-empty cancelLabel so the user always has an explicit way out.",
    );
  });

  it("is not dismissable by default", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container } = renderInPanel(
      <AlertDialog
        title="Discard route?"
        defaultOpen
        cancelLabel="Keep route"
        onOpenChange={onOpenChange}
        actions={<Button variant="danger">Discard</Button>}
      >
        <p>This cannot be undone.</p>
      </AlertDialog>,
    );

    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();

    await user.click(getScrim(container));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("forwards the ref to the alertdialog element", () => {
    const ref = createRef<HTMLElement>();
    renderInPanel(
      <AlertDialog
        title="Discard route?"
        defaultOpen
        cancelLabel="Keep route"
        ref={ref}
        actions={<Button variant="danger">Discard</Button>}
      >
        <p>This cannot be undone.</p>
      </AlertDialog>,
    );

    expect(ref.current).toBe(screen.getByRole("alertdialog"));
  });

  it("always provides an enabled cancel action when supplemental actions are disabled", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    renderInPanel(
      <AlertDialog
        title="Discard route?"
        defaultOpen
        cancelLabel="Keep route"
        onCancel={onCancel}
        onOpenChange={onOpenChange}
        actions={
          <Button disabled variant="danger">
            Discard
          </Button>
        }
      >
        <p>This cannot be undone.</p>
      </AlertDialog>,
    );

    const cancel = screen.getByRole("button", { name: "Keep route" });
    expect(cancel).toBeEnabled();
    await user.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
