import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type AriaAttributes, Fragment } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  ActionBar,
  Banner,
  Button,
  Checkbox,
  Disclosure,
  type FieldControlProps,
  InlineConfirm,
  LabeledField,
  NumberInput,
  PanelRoot,
  RangeInput,
  Section,
  StatusIndicator,
  TextInput,
} from "../../src/index.js";

describe("form primitives", () => {
  it("exports the complete native aria-invalid type", () => {
    expectTypeOf<FieldControlProps["aria-invalid"]>().toEqualTypeOf<
      AriaAttributes["aria-invalid"]
    >();
  });

  it("connects labels, descriptions, errors, and required state", () => {
    render(
      <PanelRoot>
        <LabeledField
          label="Server URL"
          description="Use the Signal K server address."
          error="A server URL is required."
          required
        >
          <TextInput />
        </LabeledField>
      </PanelRoot>,
    );

    const input = screen.getByRole("textbox", { name: /Server URL/ });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Use the Signal K server address. A server URL is required.",
    );
  });

  it("renders a self-labeled checkbox with a description", () => {
    render(
      <PanelRoot>
        <Checkbox
          label="Enable provider"
          description="Starts the optional data provider."
        />
      </PanelRoot>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Enable provider" });
    expect(checkbox).toHaveAccessibleDescription(
      "Starts the optional data provider.",
    );
  });

  it("merges checkbox label and description references supplied by callers", () => {
    render(
      <PanelRoot>
        <span id="external-label">Provider state</span>
        <span id="external-description">Required by this plugin.</span>
        <Checkbox
          label="Enable provider"
          description="Starts the provider."
          aria-labelledby="external-label"
          aria-describedby="external-description"
        />
      </PanelRoot>,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Provider state Enable provider",
    });
    expect(checkbox).toHaveAccessibleDescription(
      "Required by this plugin. Starts the provider.",
    );
  });

  it("treats null field help and errors as absent", () => {
    render(
      <PanelRoot>
        <LabeledField label="Server URL" description={null} error={false}>
          <TextInput />
        </LabeledField>
      </PanelRoot>,
    );

    const input = screen.getByRole("textbox", { name: "Server URL" });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preserves the complete native aria-invalid value set", () => {
    render(
      <PanelRoot>
        <LabeledField label="Server URL">
          <TextInput aria-invalid="grammar" />
        </LabeledField>
      </PanelRoot>,
    );

    expect(screen.getByRole("textbox", { name: "Server URL" })).toHaveAttribute(
      "aria-invalid",
      "grammar",
    );
  });

  it("treats empty arrays and fragments as absent content", () => {
    const { container } = render(
      <PanelRoot>
        <LabeledField
          label="Server URL"
          description={[]}
          error={
            <>
              {false}
              <Fragment key="nested-empty">{null}</Fragment>
            </>
          }
        >
          <TextInput />
        </LabeledField>
        <Section title="Status" description={<Fragment key="empty" />}>
          Ready
        </Section>
      </PanelRoot>,
    );

    const input = screen.getByRole("textbox", { name: "Server URL" });
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(container.querySelector(".snui-section__description")).toBeNull();
  });

  it("recognizes renderable content nested inside fragments", () => {
    render(
      <PanelRoot>
        <LabeledField
          label="Server URL"
          description={
            <Fragment key="outer">
              <Fragment key="inner">Server address</Fragment>
            </Fragment>
          }
        >
          <TextInput />
        </LabeledField>
      </PanelRoot>,
    );

    expect(
      screen.getByRole("textbox", { name: "Server URL" }),
    ).toHaveAccessibleDescription("Server address");
  });

  it("preserves native number-input behavior", async () => {
    const user = userEvent.setup();
    render(
      <PanelRoot>
        <LabeledField label="Interval">
          <NumberInput min={1} max={60} />
        </LabeledField>
      </PanelRoot>,
    );

    const input = screen.getByRole("spinbutton", { name: "Interval" });
    await user.type(input, "15");
    expect(input).toHaveValue(15);
  });

  it("preserves native range-input semantics", () => {
    render(
      <PanelRoot>
        <LabeledField label="Confidence">
          <RangeInput min={0} max={100} defaultValue={50} />
        </LabeledField>
      </PanelRoot>,
    );

    expect(screen.getByRole("slider", { name: "Confidence" })).toHaveValue(
      "50",
    );
  });
});

describe("feedback and layout primitives", () => {
  it("announces only banners explicitly marked as live", () => {
    render(
      <PanelRoot>
        <Banner tone="danger" live="assertive" title="Connection failed">
          Check the server address.
        </Banner>
      </PanelRoot>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Error. Connection failed. Check the server address.",
    );
  });

  it("does not interrupt users for persistent danger content", () => {
    const { container } = render(
      <PanelRoot>
        <Banner tone="danger">The provider is unavailable.</Banner>
      </PanelRoot>,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(container.querySelector(".snui-banner")).not.toHaveAttribute(
      "aria-live",
    );
  });

  it("supports polite banner announcements without requiring a title", () => {
    render(
      <PanelRoot>
        <Banner live="polite">Catalog refresh completed.</Banner>
      </PanelRoot>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Information. Catalog refresh completed.",
    );
  });

  it("renders visible status text alongside its decorative marker", () => {
    render(
      <PanelRoot>
        <StatusIndicator tone="success">Connected</StatusIndicator>
      </PanelRoot>,
    );

    expect(screen.getByText("Connected")).toBeVisible();
  });

  it("keeps action state and actions presentational", () => {
    render(
      <PanelRoot>
        <ActionBar
          sticky={false}
          status={<StatusIndicator>Unsaved changes</StatusIndicator>}
          actions={<Button variant="primary">Save</Button>}
        />
      </PanelRoot>,
    );

    expect(screen.getByText("Unsaved changes")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("makes sticky positioning an explicit action-bar option", () => {
    const { container } = render(
      <PanelRoot>
        <ActionBar sticky actions={<Button>Save</Button>} />
      </PanelRoot>,
    );

    expect(container.querySelector(".snui-action-bar--sticky")).not.toBeNull();
    expect(container.querySelector(".snui-action-bar__status")).toBeNull();
  });

  it("does not create an action-bar status wrapper for false content", () => {
    const { container } = render(
      <PanelRoot>
        <ActionBar status={false} actions={<Button>Save</Button>} />
      </PanelRoot>,
    );

    expect(container.querySelector(".snui-action-bar__status")).toBeNull();
  });

  it("uses native details behavior for disclosures", () => {
    const onOpenChange = vi.fn();
    render(
      <PanelRoot>
        <Disclosure title="Advanced settings" onOpenChange={onOpenChange}>
          Advanced content
        </Disclosure>
      </PanelRoot>,
    );

    const details = screen.getByText("Advanced content").closest("details");
    expect(details).not.toBeNull();
    if (details === null) return;

    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("labels sections by their heading", () => {
    render(
      <PanelRoot>
        <Section title="Connection" description="Server connection settings">
          Content
        </Section>
      </PanelRoot>,
    );

    expect(screen.getByRole("region", { name: "Connection" })).toBeVisible();
  });

  it("does not require a section description", () => {
    render(
      <PanelRoot>
        <Section title="Status">Ready</Section>
      </PanelRoot>,
    );

    expect(screen.getByRole("region", { name: "Status" })).toHaveTextContent(
      "Ready",
    );
  });

  it("supports an explicit section heading level", () => {
    render(
      <PanelRoot>
        <Section title="Nested settings" headingLevel={3}>
          Ready
        </Section>
      </PanelRoot>,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Nested settings" }),
    ).toBeVisible();
  });
});

describe("buttons and confirmation", () => {
  it("disables a loading button and exposes busy state", () => {
    render(
      <PanelRoot>
        <Button loading variant="primary">
          Save
        </Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: /Save/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".snui-button__spinner")).not.toBeNull();
  });

  it("focuses cancel in an inline confirmation and restores focus", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <PanelRoot>
        <Button>Delete source</Button>
        <InlineConfirm
          open={false}
          message="This removes the cached source."
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </PanelRoot>,
    );

    const trigger = screen.getByRole("button", { name: "Delete source" });
    await user.click(trigger);

    rerender(
      <PanelRoot>
        <Button>Delete source</Button>
        <InlineConfirm
          open
          message="This removes the cached source."
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </PanelRoot>,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    const confirmation = screen.getByRole("region", {
      name: "Confirm action",
    });
    expect(confirmation).toHaveAccessibleName("Confirm action");

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(
      <PanelRoot>
        <Button>Delete source</Button>
        <InlineConfirm
          open={false}
          message="This removes the cached source."
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </PanelRoot>,
    );

    expect(screen.getByRole("button", { name: "Delete source" })).toHaveFocus();
  });

  it("focuses the confirmation container when it opens busy", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PanelRoot>
        <Button>Start reset</Button>
        <InlineConfirm
          open={false}
          message="Resetting."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
    );

    await user.click(screen.getByRole("button", { name: "Start reset" }));
    rerender(
      <PanelRoot>
        <Button>Start reset</Button>
        <InlineConfirm
          open
          busy
          title={null}
          message="Resetting."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
    );

    const confirmation = screen.getByRole("region", {
      name: "Confirm action",
    });
    expect(confirmation).toHaveFocus();
    expect(confirmation).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("does not steal focus when busy changes after focus leaves", async () => {
    const user = userEvent.setup();
    const props = {
      message: "Resetting.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    } as const;
    const { rerender } = render(
      <PanelRoot>
        <Button>Outside action</Button>
        <InlineConfirm {...props} open />
      </PanelRoot>,
    );

    const outsideAction = screen.getByRole("button", {
      name: "Outside action",
    });
    await user.click(outsideAction);
    expect(outsideAction).toHaveFocus();

    rerender(
      <PanelRoot>
        <Button>Outside action</Button>
        <InlineConfirm {...props} open busy />
      </PanelRoot>,
    );

    expect(outsideAction).toHaveFocus();
  });

  it("moves focus to the region when an internal action becomes busy", () => {
    const props = {
      message: "Resetting.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    } as const;
    const { rerender } = render(
      <PanelRoot>
        <InlineConfirm {...props} open />
      </PanelRoot>,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    rerender(
      <PanelRoot>
        <InlineConfirm {...props} open busy />
      </PanelRoot>,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toHaveFocus();
  });

  it("tracks internal focus across document realms", () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const ownerDocument = iframe.contentDocument;
    if (ownerDocument === null) throw new Error("Missing iframe document.");

    const container = ownerDocument.createElement("div");
    ownerDocument.body.append(container);
    const props = {
      message: "Resetting.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    } as const;
    const { rerender, unmount } = render(
      <PanelRoot>
        <InlineConfirm {...props} open />
      </PanelRoot>,
      { container },
    );

    const cancel = within(container).getByRole("button", { name: "Cancel" });
    cancel.focus();
    cancel.blur();
    rerender(
      <PanelRoot>
        <InlineConfirm {...props} open busy />
      </PanelRoot>,
    );

    const confirmation = within(container).getByRole("region", {
      name: "Confirm action",
    });
    expect(ownerDocument.activeElement).toBe(confirmation);

    unmount();
    iframe.remove();
  });

  it("falls back to a named confirmation for an empty fragment title", () => {
    render(
      <PanelRoot>
        <InlineConfirm
          open
          title={<Fragment key="empty-title" />}
          message="Confirm this action."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Confirm action" }),
    ).toBeVisible();
  });

  it("supports an explicit confirmation heading level", () => {
    render(
      <PanelRoot>
        <InlineConfirm
          open
          headingLevel={4}
          title="Remove source?"
          message="Confirm this action."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </PanelRoot>,
    );

    expect(
      screen.getByRole("heading", { level: 4, name: "Remove source?" }),
    ).toBeVisible();
  });
});
