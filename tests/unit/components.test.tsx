import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type AriaAttributes, createRef, Fragment, useState } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  ActionBar,
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  Cluster,
  CollapsibleSection,
  Disclosure,
  type FieldControlProps,
  FieldGroup,
  InlineConfirm,
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
  LabeledField,
  Metric,
  MetricGrid,
  NumberInput,
  PanelRoot,
  RangeInput,
  Section,
  Select,
  Stack,
  StatusIndicator,
  Textarea,
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

  it("associates checkbox errors without announcing persistent validation", () => {
    render(
      <PanelRoot>
        <Checkbox
          label="Enable provider"
          description="Starts the optional data provider."
          error="Accept the provider terms first."
        />
      </PanelRoot>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Enable provider" });
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAttribute("aria-errormessage");
    expect(checkbox).toHaveAccessibleDescription(
      "Starts the optional data provider. Accept the provider terms first.",
    );
    expect(
      screen.getByText("Accept the provider terms first."),
    ).toHaveAttribute("aria-live", "off");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("supports opt-in field and checkbox error announcements", () => {
    render(
      <PanelRoot>
        <LabeledField
          label="Server URL"
          error="The server URL is invalid."
          errorLive="polite"
        >
          <TextInput />
        </LabeledField>
        <Checkbox
          label="Enable provider"
          error="The provider cannot be enabled."
          errorLive="assertive"
        />
      </PanelRoot>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "The server URL is invalid.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The provider cannot be enabled.",
    );
  });

  it("rejects whitespace-only field and checkbox labels", () => {
    expect(() =>
      render(
        <PanelRoot>
          <LabeledField label="  ">
            <TextInput />
          </LabeledField>
        </PanelRoot>,
      ),
    ).toThrow("LabeledField requires a non-empty label.");

    expect(() =>
      render(
        <PanelRoot>
          <Checkbox label={"\t"} />
        </PanelRoot>,
      ),
    ).toThrow("Checkbox requires a non-empty label.");
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

  it("supports typed text modes, selects, and textareas", () => {
    render(
      <PanelRoot>
        <LabeledField label="API key">
          <TextInput type="password" />
        </LabeledField>
        <LabeledField label="Source">
          <Select defaultValue="gps">
            <option value="gps">GPS</option>
            <option value="manual">Manual</option>
          </Select>
        </LabeledField>
        <LabeledField label="Notes">
          <Textarea defaultValue="Ready" />
        </LabeledField>
      </PanelRoot>,
    );

    expect(screen.getByLabelText("API key")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("combobox", { name: "Source" })).toHaveValue("gps");
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("Ready");
  });

  it("labels the primary control in a composite inline field", () => {
    const { container } = render(
      <PanelRoot>
        <LabeledField
          label="Cache limit"
          description="Whole GiB"
          error="Choose at least 4 GiB."
          layout="inline"
          density="compact"
        >
          {(controlProps) => (
            <InputGroup>
              <InputGroupControl width="grow">
                <RangeInput {...controlProps} min={4} max={32} />
              </InputGroupControl>
              <InputGroupControl width="fixed">
                <NumberInput
                  aria-label="Cache limit exact value"
                  aria-describedby={controlProps["aria-describedby"]}
                />
                <InputGroupAddon>GiB</InputGroupAddon>
              </InputGroupControl>
            </InputGroup>
          )}
        </LabeledField>
      </PanelRoot>,
    );

    const slider = screen.getByRole("slider", { name: /Cache limit/ });
    expect(slider).toHaveAttribute("aria-invalid", "true");
    expect(slider).toHaveAccessibleDescription(
      "Whole GiB Choose at least 4 GiB.",
    );
    expect(
      screen.getByRole("spinbutton", { name: "Cache limit exact value" }),
    ).toHaveAccessibleDescription("Whole GiB Choose at least 4 GiB.");
    expect(container.querySelector(".snui-field--inline")).not.toBeNull();
    expect(container.querySelector(".snui-field--compact")).not.toBeNull();
    expect(
      container.querySelector(".snui-input-group__control--grow"),
    ).not.toBeNull();
    expect(
      container.querySelector(".snui-input-group__control--fixed"),
    ).not.toBeNull();
    expect(
      container.querySelector(".snui-input-group__addon"),
    ).toHaveTextContent("GiB");
  });

  it("groups related controls with a semantic legend and description", () => {
    render(
      <PanelRoot>
        <FieldGroup
          legend="Notifications"
          description="Choose the alerts to publish."
          actions={<Button>All</Button>}
          disabled
        >
          <Checkbox label="Wind" />
        </FieldGroup>
      </PanelRoot>,
    );

    const group = screen.getByRole("group", { name: "Notifications" });
    expect(group).toBeDisabled();
    expect(group).toHaveAccessibleDescription("Choose the alerts to publish.");
    expect(screen.getByRole("button", { name: "All" })).toBeDisabled();
  });
});

describe("feedback and layout primitives", () => {
  it("rejects whitespace-only names for semantic grouping primitives", () => {
    expect(() => render(<FieldGroup legend="  ">Content</FieldGroup>)).toThrow(
      "FieldGroup requires a non-empty legend.",
    );
    expect(() => render(<Disclosure title="  ">Content</Disclosure>)).toThrow(
      "Disclosure requires a non-empty title.",
    );
    expect(() => render(<Section title="  ">Content</Section>)).toThrow(
      "Section requires a non-empty title.",
    );
    expect(() =>
      render(<CollapsibleSection title="  ">Content</CollapsibleSection>),
    ).toThrow("CollapsibleSection requires a non-empty title.");
    expect(() => render(<Metric label="  " value="12" />)).toThrow(
      "Metric requires a non-empty label.",
    );
  });

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

  it("preserves an explicit off live-region setting", () => {
    render(
      <PanelRoot>
        <Banner role="alert" live="off">
          Connection failed.
        </Banner>
      </PanelRoot>,
    );

    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "off");
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
    expect(details.querySelector(".snui-disclosure__title")).toHaveTextContent(
      "Advanced settings",
    );
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

  it("merges consumer and generated section label references", () => {
    render(
      <PanelRoot>
        <span id="consumer-section-context">Provider configuration</span>
        <Section aria-labelledby="consumer-section-context" title="Connection">
          Content
        </Section>
      </PanelRoot>,
    );

    expect(
      screen.getByRole("region", {
        name: "Provider configuration Connection",
      }),
    ).toHaveAttribute(
      "aria-labelledby",
      expect.stringMatching(/^consumer-section-context .+$/),
    );
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

  it("renders section descriptions in a block-safe container", () => {
    const { container } = render(
      <PanelRoot>
        <Section
          title="Status"
          description={<div data-testid="nested-block">Ready</div>}
        >
          Content
        </Section>
      </PanelRoot>,
    );

    expect(screen.getByTestId("nested-block")).toBeVisible();
    expect(container.querySelector(".snui-section__description")?.tagName).toBe(
      "DIV",
    );
  });

  it("supports banner actions, dismissal, and persistent-note semantics", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <PanelRoot>
        <Banner
          role="note"
          title="Provider unavailable"
          actions={<Button>Retry</Button>}
          onDismiss={onDismiss}
          dismissLabel="Hide notice"
        >
          Check the optional provider.
        </Banner>
      </PanelRoot>,
    );

    expect(screen.getByRole("note")).toHaveTextContent("Provider unavailable");
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Hide notice" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("moves focus to the requested destination after dismissal", async () => {
    const user = userEvent.setup();
    const destinationRef = createRef<HTMLButtonElement>();

    function Fixture(): React.JSX.Element {
      const [visible, setVisible] = useState(true);

      return (
        <PanelRoot>
          {visible ? (
            <Banner
              dismissFocusRef={destinationRef}
              onDismiss={() => setVisible(false)}
            >
              Provider notice
            </Banner>
          ) : null}
          <Button ref={destinationRef}>Provider settings</Button>
        </PanelRoot>
      );
    }

    render(<Fixture />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Provider settings" }),
      ).toHaveFocus();
    });
  });

  it("falls back to a named banner dismissal for blank labels", () => {
    render(
      <PanelRoot>
        <Banner onDismiss={() => undefined} dismissLabel={" \t "}>
          Provider notice
        </Banner>
      </PanelRoot>,
    );

    expect(screen.getByRole("button", { name: "Dismiss" })).toBeVisible();
  });

  it("supports controlled collapsible sections and unmounted content", async () => {
    const user = userEvent.setup();

    function Fixture(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <PanelRoot>
          <span id="consumer-section-label">Provider status</span>
          <CollapsibleSection
            aria-labelledby="consumer-section-label"
            title="Advanced provider settings"
            summary="3 checks healthy"
            summaryPlacement="header"
            actions={<Button>Refresh</Button>}
            headingLevel={3}
            mountStrategy="unmount"
            open={open}
            onOpenChange={setOpen}
          >
            <TextInput aria-label="Advanced value" />
          </CollapsibleSection>
        </PanelRoot>
      );
    }

    render(<Fixture />);
    const toggle = screen.getByRole("button", {
      name: "Advanced provider settings",
    });
    const region = screen.getByRole("region", {
      name: "Provider status Advanced provider settings",
    });
    expect(region).toHaveAttribute(
      "aria-labelledby",
      expect.stringMatching(/^consumer-section-label .+-title$/),
    );
    expect(
      region
        .querySelector(".snui-collapsible__header")
        ?.contains(screen.getByText("3 checks healthy")),
    ).toBe(true);
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Advanced provider settings",
      }),
    ).toBeVisible();
    expect(screen.getByText("3 checks healthy")).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "Advanced value" }),
    ).toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("textbox", { name: "Advanced value" }),
    ).toBeVisible();
    expect(screen.queryByText("3 checks healthy")).toBeNull();
  });

  it("restores disclosure focus when controlled content closes", async () => {
    const user = userEvent.setup();

    function Fixture(): React.JSX.Element {
      const [open, setOpen] = useState(true);
      return (
        <PanelRoot>
          <Button onClick={() => setOpen(false)}>Close externally</Button>
          <CollapsibleSection
            title="Connection details"
            open={open}
            onOpenChange={setOpen}
            mountStrategy="unmount"
          >
            <TextInput aria-label="Focused setting" />
          </CollapsibleSection>
        </PanelRoot>
      );
    }

    render(<Fixture />);
    const input = screen.getByRole("textbox", { name: "Focused setting" });
    input.focus();
    expect(input).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close externally" }), {
      detail: 0,
    });
    expect(
      screen.getByRole("button", { name: "Connection details" }),
    ).toHaveFocus();
    await user.click(
      screen.getByRole("button", { name: "Connection details" }),
    );
  });

  it("lazily mounts collapsible content and retains its state", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PanelRoot>
        <CollapsibleSection
          title="Advanced settings"
          mountStrategy="lazy-retain"
        >
          <TextInput aria-label="Provider token" />
        </CollapsibleSection>
      </PanelRoot>,
    );

    const toggle = screen.getByRole("button", { name: "Advanced settings" });
    expect(
      container.querySelector('input[aria-label="Provider token"]'),
    ).toBeNull();

    await user.click(toggle);
    const input = screen.getByRole("textbox", { name: "Provider token" });
    await user.type(input, "retained value");
    await user.click(toggle);

    const retainedInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="Provider token"]',
    );
    expect(retainedInput).not.toBeNull();
    expect(retainedInput).not.toBeVisible();
    expect(retainedInput).toHaveValue("retained value");
  });

  it("renders shared rhythm and metric presentation primitives", () => {
    const { container } = render(
      <PanelRoot>
        <Stack gap={3}>
          <Cluster justify="between">
            <Badge tone="success">Ready</Badge>
          </Cluster>
          <Card>
            <MetricGrid>
              <Metric
                label="Updates"
                value="12"
                detail="Since startup"
                tone="info"
              />
            </MetricGrid>
          </Card>
        </Stack>
      </PanelRoot>,
    );

    expect(container.querySelector(".snui-stack--gap-3")).not.toBeNull();
    expect(
      container.querySelector(".snui-layout--justify-between"),
    ).not.toBeNull();
    expect(screen.getByText("Ready")).toBeVisible();
    expect(screen.getByText("Updates")).toBeVisible();
    expect(screen.getByText("Since startup")).toBeVisible();
    expect(screen.getByRole("group", { name: "Updates" })).toHaveTextContent(
      "12",
    );
  });

  it("groups multiple section actions in their own layout wrapper", () => {
    const { container } = render(
      <PanelRoot>
        <Section
          title="Sources"
          actions={
            <>
              <Button>Add</Button>
              <Button>Refresh</Button>
            </>
          }
        >
          Ready
        </Section>
      </PanelRoot>,
    );

    const actions = container.querySelector(".snui-section__actions");
    expect(actions).not.toBeNull();
    expect(within(actions as HTMLElement).getAllByRole("button")).toHaveLength(
      2,
    );
  });
});

describe("buttons and confirmation", () => {
  it("groups consumer icons and labels inside the button content slot", () => {
    render(
      <PanelRoot>
        <Button>
          <span aria-hidden="true">+</span>
          <span>Add source</span>
        </Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Add source" });
    const content = button.querySelector(".snui-button__content");
    expect(content).not.toBeNull();
    expect(content?.children).toHaveLength(2);
  });

  it("keeps a loading button focusable while suppressing activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: React.SubmitEvent<HTMLFormElement>) =>
      event.preventDefault(),
    );
    const renderButton = (loading: boolean): React.JSX.Element => (
      <PanelRoot>
        <form onSubmit={onSubmit}>
          <Button
            loading={loading}
            variant="primary"
            type="submit"
            onClick={onClick}
          >
            Save
          </Button>
        </form>
      </PanelRoot>
    );
    const { rerender } = render(renderButton(false));
    const idleButton = screen.getByRole("button", { name: "Save" });
    idleButton.focus();

    rerender(renderButton(true));

    const button = screen.getByRole("button", { name: "Working: Save" });
    expect(button).toBe(idleButton);
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".snui-button__spinner")).not.toBeNull();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    await user.click(button);
    expect(button).toHaveFocus();
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("localizes a loading button with an explicit accessible label", () => {
    render(
      <PanelRoot>
        <Button loading loadingLabel="Saving" aria-label="Save settings">
          Save
        </Button>
      </PanelRoot>,
    );

    expect(
      screen.getByRole("button", { name: "Saving: Save settings" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("keeps aria-disabled buttons focusable while suppressing activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PanelRoot>
        <Button ariaDisabled onClick={onClick} size="compact" shape="pill">
          Move up
        </Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Move up" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button.querySelector(".snui-button__content")).toHaveTextContent(
      "Move up",
    );
    button.focus();
    await user.keyboard("{Enter}");
    await user.click(button);
    expect(button).toHaveFocus();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("provides a programmatic action-status focus target", () => {
    const statusRef = createRef<HTMLDivElement>();
    render(
      <PanelRoot>
        <ActionBar
          statusRef={statusRef}
          status="Configuration saved"
          actions={<Button>Save</Button>}
        />
      </PanelRoot>,
    );

    statusRef.current?.focus();
    expect(statusRef.current).toHaveFocus();
    expect(statusRef.current).toHaveAttribute("tabindex", "-1");
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

  it("accepts localized confirmation labels, native attributes, and a root ref", () => {
    const rootRef = createRef<HTMLElement>();
    const confirmationProps = {
      fallbackTitle: "Confirmer l’action",
      cancelLabel: "Annuler",
      confirmLabel: "Confirmer",
      message: "Cette action est permanente.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    } as const;
    const { rerender } = render(
      <PanelRoot>
        <InlineConfirm
          {...confirmationProps}
          open
          rootRef={rootRef}
          data-testid="localized-confirmation"
          aria-labelledby="confirmation-context"
          aria-describedby="confirmation-guidance"
        />
        <span id="confirmation-context">Safety check</span>
        <span id="confirmation-guidance">Review before continuing.</span>
      </PanelRoot>,
    );

    expect(rootRef.current).toBe(screen.getByTestId("localized-confirmation"));
    expect(
      screen.getByRole("region", {
        name: "Safety check Confirmer l’action",
      }),
    ).toBeVisible();
    expect(rootRef.current).toHaveAccessibleDescription(
      "Review before continuing. Cette action est permanente.",
    );
    expect(screen.getByRole("button", { name: "Annuler" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeVisible();

    rerender(
      <PanelRoot>
        <InlineConfirm {...confirmationProps} open={false} rootRef={rootRef} />
      </PanelRoot>,
    );
    expect(rootRef.current).toBeNull();
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
