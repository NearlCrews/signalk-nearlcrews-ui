import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type AriaAttributes,
  createRef,
  Fragment,
  useEffect,
  useState,
} from "react";
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
import { panel, renderInPanel } from "../helpers.js";

describe("form primitives", () => {
  it("exports the complete native aria-invalid type", () => {
    expectTypeOf<FieldControlProps["aria-invalid"]>().toEqualTypeOf<
      AriaAttributes["aria-invalid"]
    >();
  });

  it("connects labels, descriptions, errors, and required state", () => {
    renderInPanel(
      <LabeledField
        label="Server URL"
        description="Use the Signal K server address."
        error="A server URL is required."
        required
      >
        <TextInput />
      </LabeledField>,
    );

    const input = screen.getByRole("textbox", { name: /Server URL/ });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Use the Signal K server address. A server URL is required.",
    );
  });

  it("renders a self-labeled checkbox with a description", () => {
    renderInPanel(
      <Checkbox
        label="Enable provider"
        description="Starts the optional data provider."
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Enable provider" });
    expect(checkbox).toHaveAccessibleDescription(
      "Starts the optional data provider.",
    );
  });

  it("reflects and updates the indeterminate checkbox state", () => {
    const checkboxRef = createRef<HTMLInputElement>();
    const { rerender } = renderInPanel(
      <Checkbox ref={checkboxRef} label="Enable provider" indeterminate />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Enable provider" });
    expect(checkbox).toBePartiallyChecked();
    expect(checkboxRef.current).toBe(checkbox);

    rerender(
      panel(
        <Checkbox
          ref={checkboxRef}
          label="Enable provider"
          indeterminate={false}
        />,
      ),
    );
    expect(checkbox).not.toBePartiallyChecked();
  });

  it("re-asserts a held indeterminate state after user interaction", async () => {
    const user = userEvent.setup();

    function Harness(): React.JSX.Element {
      const [checked, setChecked] = useState(false);
      return (
        <PanelRoot>
          <Checkbox
            label="Partially enabled"
            indeterminate
            checked={checked}
            onChange={(event) => setChecked(event.currentTarget.checked)}
          />
        </PanelRoot>
      );
    }

    render(<Harness />);
    const checkbox = screen.getByRole("checkbox", {
      name: "Partially enabled",
    });
    expect(checkbox).toBePartiallyChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(checkbox).toBePartiallyChecked();
  });

  it("accepts date and time text input types", () => {
    renderInPanel(
      <>
        <LabeledField label="Maintenance date">
          <TextInput type="date" />
        </LabeledField>
        <LabeledField label="Maintenance time">
          <TextInput type="time" />
        </LabeledField>
      </>,
    );

    expect(screen.getByLabelText("Maintenance date")).toHaveAttribute(
      "type",
      "date",
    );
    expect(screen.getByLabelText("Maintenance time")).toHaveAttribute(
      "type",
      "time",
    );
  });

  it("tracks the filled range progress across input and prop updates", () => {
    const rangeRef = createRef<HTMLInputElement>();
    const { rerender } = renderInPanel(
      <RangeInput
        ref={rangeRef}
        aria-label="Depth alarm"
        min={0}
        max={200}
        defaultValue={50}
      />,
    );

    const range = screen.getByRole("slider", { name: "Depth alarm" });
    expect(rangeRef.current).toBe(range);
    expect(range.style.getPropertyValue("--snui-range-progress")).toBe("25%");

    fireEvent.input(range, { target: { value: "150" } });
    expect(range.style.getPropertyValue("--snui-range-progress")).toBe("75%");

    rerender(
      panel(
        <RangeInput
          ref={rangeRef}
          aria-label="Depth alarm"
          min={0}
          max={100}
          value={80}
          onChange={() => undefined}
        />,
      ),
    );
    expect(range.style.getPropertyValue("--snui-range-progress")).toBe("80%");
  });

  it("fills range progress from browser defaults and guards invalid bounds", () => {
    renderInPanel(
      <>
        <RangeInput aria-label="Volume" defaultValue={50} />
        <RangeInput
          aria-label="Broken bounds"
          min="low"
          max="high"
          defaultValue={5}
        />
      </>,
    );

    const volume = screen.getByRole("slider", { name: "Volume" });
    expect(volume.style.getPropertyValue("--snui-range-progress")).toBe("50%");

    const broken = screen.getByRole("slider", { name: "Broken bounds" });
    expect(broken.style.getPropertyValue("--snui-range-progress")).toBe("0%");
  });

  it("restores range progress when a controlled owner rejects input", async () => {
    renderInPanel(
      <RangeInput
        aria-label="Locked threshold"
        min={0}
        max={200}
        value={50}
        onChange={() => undefined}
      />,
    );

    const range = screen.getByRole("slider", { name: "Locked threshold" });
    expect(range.style.getPropertyValue("--snui-range-progress")).toBe("25%");

    fireEvent.input(range, { target: { value: "150" } });
    await waitFor(() =>
      expect(range.style.getPropertyValue("--snui-range-progress")).toBe("25%"),
    );
    expect(range).toHaveValue("50");
  });

  it("associates checkbox errors without announcing persistent validation", () => {
    renderInPanel(
      <Checkbox
        label="Enable provider"
        description="Starts the optional data provider."
        error="Accept the provider terms first."
      />,
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
    renderInPanel(
      <>
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
      </>,
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
      renderInPanel(
        <LabeledField label="  ">
          <TextInput />
        </LabeledField>,
      ),
    ).toThrow("LabeledField requires a non-empty label.");

    expect(() => renderInPanel(<Checkbox label={"\t"} />)).toThrow(
      "Checkbox requires a non-empty label.",
    );
  });

  it("merges checkbox label and description references supplied by callers", () => {
    renderInPanel(
      <>
        <span id="external-label">Provider state</span>
        <span id="external-description">Required by this plugin.</span>
        <Checkbox
          label="Enable provider"
          description="Starts the provider."
          aria-labelledby="external-label"
          aria-describedby="external-description"
        />
      </>,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Provider state Enable provider",
    });
    expect(checkbox).toHaveAccessibleDescription(
      "Required by this plugin. Starts the provider.",
    );
  });

  it("treats null field help and errors as absent", () => {
    renderInPanel(
      <LabeledField label="Server URL" description={null} error={false}>
        <TextInput />
      </LabeledField>,
    );

    const input = screen.getByRole("textbox", { name: "Server URL" });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preserves the complete native aria-invalid value set", () => {
    renderInPanel(
      <LabeledField label="Server URL">
        <TextInput aria-invalid="grammar" />
      </LabeledField>,
    );

    expect(screen.getByRole("textbox", { name: "Server URL" })).toHaveAttribute(
      "aria-invalid",
      "grammar",
    );
  });

  it("treats empty arrays and fragments as absent content", () => {
    const { container } = renderInPanel(
      <>
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
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Server URL" });
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(container.querySelector(".snui-section__description")).toBeNull();
  });

  it("recognizes renderable content nested inside fragments", () => {
    renderInPanel(
      <LabeledField
        label="Server URL"
        description={
          <Fragment key="outer">
            <Fragment key="inner">Server address</Fragment>
          </Fragment>
        }
      >
        <TextInput />
      </LabeledField>,
    );

    expect(
      screen.getByRole("textbox", { name: "Server URL" }),
    ).toHaveAccessibleDescription("Server address");
  });

  it("preserves native number-input behavior", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <LabeledField label="Interval">
        <NumberInput min={1} max={60} />
      </LabeledField>,
    );

    const input = screen.getByRole("spinbutton", { name: "Interval" });
    await user.type(input, "15");
    expect(input).toHaveValue(15);
  });

  it("preserves native range-input semantics", () => {
    renderInPanel(
      <LabeledField label="Confidence">
        <RangeInput min={0} max={100} defaultValue={50} />
      </LabeledField>,
    );

    expect(screen.getByRole("slider", { name: "Confidence" })).toHaveValue(
      "50",
    );
  });

  it("supports typed text modes, selects, and textareas", () => {
    renderInPanel(
      <>
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
      </>,
    );

    expect(screen.getByLabelText("API key")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("combobox", { name: "Source" })).toHaveValue("gps");
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("Ready");
  });

  it("labels the primary control in a composite inline field", () => {
    const { container } = renderInPanel(
      <LabeledField
        label="Cache limit"
        description="Whole GiB"
        error="Choose at least 4 GiB."
        layout="inline"
        density="compact"
      >
        {(controlProps) => {
          const { descriptionId, errorId, ...rangeProps } = controlProps;
          return (
            <InputGroup>
              <InputGroupControl width="grow">
                <RangeInput {...rangeProps} min={4} max={32} />
              </InputGroupControl>
              <InputGroupControl width="fixed">
                <NumberInput
                  aria-label="Cache limit exact value"
                  aria-describedby={[descriptionId, errorId].join(" ")}
                />
                <InputGroupAddon>GiB</InputGroupAddon>
              </InputGroupControl>
            </InputGroup>
          );
        }}
      </LabeledField>,
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
    renderInPanel(
      <FieldGroup
        legend="Notifications"
        description="Choose the alerts to publish."
        actions={<Button>All</Button>}
        disabled
      >
        <Checkbox label="Wind" />
      </FieldGroup>,
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
    renderInPanel(
      <Banner tone="danger" live="assertive" title="Connection failed">
        Check the server address.
      </Banner>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Error. Connection failed. Check the server address.",
    );
  });

  it("does not interrupt users for persistent danger content", () => {
    const { container } = renderInPanel(
      <Banner tone="danger">The provider is unavailable.</Banner>,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(container.querySelector(".snui-banner")).not.toHaveAttribute(
      "aria-live",
    );
  });

  it("does not silence a caller-supplied alert role with aria-live", () => {
    renderInPanel(
      <Banner role="alert" live="off">
        Connection failed.
      </Banner>,
    );

    // `alert` already implies an assertive live region. Emitting aria-live="off"
    // beside it would silence the role the caller asked for.
    expect(screen.getByRole("alert")).not.toHaveAttribute("aria-live");
  });

  it("does not pair an implied live role with a redundant aria-live", () => {
    renderInPanel(<Banner live="assertive">Connection failed.</Banner>);

    expect(screen.getByRole("alert")).not.toHaveAttribute("aria-live");
  });

  it("supports polite banner announcements without requiring a title", () => {
    renderInPanel(<Banner live="polite">Catalog refresh completed.</Banner>);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Information. Catalog refresh completed.",
    );
  });

  it("renders visible status text alongside its decorative marker", () => {
    renderInPanel(<StatusIndicator tone="success">Connected</StatusIndicator>);

    expect(screen.getByText("Connected")).toBeVisible();
  });

  it("keeps action state and actions presentational", () => {
    renderInPanel(
      <ActionBar
        status={<StatusIndicator>Unsaved changes</StatusIndicator>}
        actions={<Button variant="primary">Save</Button>}
      />,
    );

    expect(screen.getByText("Unsaved changes")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("makes sticky positioning an explicit action-bar option", () => {
    const { container } = renderInPanel(
      <ActionBar sticky="bottom" actions={<Button>Save</Button>} />,
    );

    expect(
      container.querySelector(".snui-action-bar--sticky-bottom"),
    ).not.toBeNull();
    expect(container.querySelector(".snui-action-bar__status")).toBeNull();
  });

  it("does not create an action-bar status wrapper for false content", () => {
    const { container } = renderInPanel(
      <ActionBar status={false} actions={<Button>Save</Button>} />,
    );

    expect(container.querySelector(".snui-action-bar__status")).toBeNull();
  });

  it("labels sections by their heading", () => {
    renderInPanel(
      <Section title="Connection" description="Server connection settings">
        Content
      </Section>,
    );

    expect(screen.getByRole("region", { name: "Connection" })).toBeVisible();
  });

  it("merges consumer and generated section label references", () => {
    renderInPanel(
      <>
        <span id="consumer-section-context">Provider configuration</span>
        <Section aria-labelledby="consumer-section-context" title="Connection">
          Content
        </Section>
      </>,
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
    renderInPanel(<Section title="Status">Ready</Section>);

    expect(screen.getByRole("region", { name: "Status" })).toHaveTextContent(
      "Ready",
    );
  });

  it("supports an explicit section heading level", () => {
    renderInPanel(
      <Section title="Nested settings" headingLevel={3}>
        Ready
      </Section>,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Nested settings" }),
    ).toBeVisible();
  });

  it("renders section descriptions in a block-safe container", () => {
    const { container } = renderInPanel(
      <Section
        title="Status"
        description={<div data-testid="nested-block">Ready</div>}
      >
        Content
      </Section>,
    );

    expect(screen.getByTestId("nested-block")).toBeVisible();
    expect(container.querySelector(".snui-section__description")?.tagName).toBe(
      "DIV",
    );
  });

  it("supports banner actions, dismissal, and persistent-note semantics", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderInPanel(
      <Banner
        role="note"
        title="Provider unavailable"
        actions={<Button>Retry</Button>}
        onDismiss={onDismiss}
        dismissLabel="Hide notice"
      >
        Check the optional provider.
      </Banner>,
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
    renderInPanel(
      <Banner onDismiss={() => undefined} dismissLabel={" \t "}>
        Provider notice
      </Banner>,
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
    const { container } = renderInPanel(
      <CollapsibleSection title="Advanced settings" mountStrategy="lazy-retain">
        <TextInput aria-label="Provider token" />
      </CollapsibleSection>,
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

  it("pauses retained collapsible content effects while collapsed", async () => {
    const user = userEvent.setup();
    const effectSpy = vi.fn();
    const cleanupSpy = vi.fn();

    function Probe(): React.JSX.Element {
      useEffect(() => {
        effectSpy();
        return cleanupSpy;
      }, []);
      return <span>Probe content</span>;
    }

    renderInPanel(
      <CollapsibleSection title="Sensor details" mountStrategy="retain">
        <Probe />
      </CollapsibleSection>,
    );

    const toggle = screen.getByRole("button", { name: "Sensor details" });
    const contentTarget = (): HTMLElement | null =>
      document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(contentTarget()).not.toBeNull();
    expect(effectSpy).not.toHaveBeenCalled();

    await user.click(toggle);
    expect(effectSpy).toHaveBeenCalledTimes(1);
    expect(cleanupSpy).not.toHaveBeenCalled();

    await user.click(toggle);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(effectSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Probe content")).not.toBeVisible();
    expect(contentTarget()).not.toBeNull();

    await user.click(toggle);
    expect(effectSpy).toHaveBeenCalledTimes(2);
  });

  it("renders shared rhythm and metric presentation primitives", () => {
    const { container } = renderInPanel(
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
      </Stack>,
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
    const { container } = renderInPanel(
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
      </Section>,
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
    renderInPanel(
      <Button>
        <span aria-hidden="true">+</span>
        <span>Add source</span>
      </Button>,
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

    // The accessible name stays stable across the busy transition; busy state
    // is conveyed as a description plus aria-busy.
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAccessibleDescription("Working");
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
    renderInPanel(
      <Button loading loadingLabel="Saving" aria-label="Save settings">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save settings" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAccessibleDescription("Saving");
  });

  it("keeps aria-disabled buttons focusable while suppressing activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInPanel(
      <Button ariaDisabled onClick={onClick} size="compact" shape="pill">
        Move up
      </Button>,
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
    renderInPanel(
      <ActionBar
        statusRef={statusRef}
        status="Configuration saved"
        actions={<Button>Save</Button>}
      />,
    );

    statusRef.current?.focus();
    expect(statusRef.current).toHaveFocus();
    expect(statusRef.current).toHaveAttribute("tabindex", "-1");
  });

  it("focuses cancel in an inline confirmation and restores focus", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = renderInPanel(
      <>
        <Button>Delete source</Button>
        <InlineConfirm
          open={false}
          message="This removes the cached source."
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </>,
    );

    const trigger = screen.getByRole("button", { name: "Delete source" });
    await user.click(trigger);

    rerender(
      panel(
        <>
          <Button>Delete source</Button>
          <InlineConfirm
            open
            message="This removes the cached source."
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        </>,
      ),
    );

    const confirmation = screen.getByRole("region", {
      name: "Confirm action",
    });
    // Focus lands on the described container so the message is conveyed on
    // open, rather than on Cancel, which would announce only the button.
    expect(confirmation).toHaveFocus();
    expect(confirmation).toHaveAccessibleName("Confirm action");
    expect(confirmation).toHaveAccessibleDescription(
      "This removes the cached source.",
    );

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(
      panel(
        <>
          <Button>Delete source</Button>
          <InlineConfirm
            open={false}
            message="This removes the cached source."
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        </>,
      ),
    );

    expect(screen.getByRole("button", { name: "Delete source" })).toHaveFocus();
  });

  it("focuses the confirmation container when it opens busy", async () => {
    const user = userEvent.setup();
    const { rerender } = renderInPanel(
      <>
        <Button>Start reset</Button>
        <InlineConfirm
          open={false}
          message="Resetting."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Start reset" }));
    rerender(
      panel(
        <>
          <Button>Start reset</Button>
          <InlineConfirm
            open
            busy
            title={null}
            message="Resetting."
            onCancel={vi.fn()}
            onConfirm={vi.fn()}
          />
        </>,
      ),
    );

    const confirmation = screen.getByRole("region", {
      name: "Confirm action",
    });
    expect(confirmation).toHaveFocus();
    expect(confirmation).toHaveAttribute("aria-busy", "true");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveAttribute("aria-disabled", "true");
    expect(cancel).toBeEnabled();
  });

  it("does not steal focus when busy changes after focus leaves", async () => {
    const user = userEvent.setup();
    const props = {
      message: "Resetting.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    } as const;
    const { rerender } = renderInPanel(
      <>
        <Button>Outside action</Button>
        <InlineConfirm {...props} open />
      </>,
    );

    const outsideAction = screen.getByRole("button", {
      name: "Outside action",
    });
    await user.click(outsideAction);
    expect(outsideAction).toHaveFocus();

    rerender(
      panel(
        <>
          <Button>Outside action</Button>
          <InlineConfirm {...props} open busy />
        </>,
      ),
    );

    expect(outsideAction).toHaveFocus();
  });

  it("leaves focus in place when dismissed after focus moved away", async () => {
    const user = userEvent.setup();
    const props = {
      message: "Resetting.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    } as const;
    const { rerender } = renderInPanel(
      <>
        <Button>Outside action</Button>
        <InlineConfirm {...props} open />
      </>,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toHaveFocus();
    const outsideAction = screen.getByRole("button", {
      name: "Outside action",
    });
    await user.click(outsideAction);
    expect(outsideAction).toHaveFocus();

    rerender(
      panel(
        <>
          <Button>Outside action</Button>
          <InlineConfirm {...props} open={false} />
        </>,
      ),
    );

    expect(outsideAction).toHaveFocus();
  });

  it("keeps an internal action focused when it becomes busy", async () => {
    const user = userEvent.setup();
    const props = {
      message: "Resetting.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    } as const;
    const { rerender } = renderInPanel(<InlineConfirm {...props} open />);

    const cancel = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancel);
    expect(cancel).toHaveFocus();

    rerender(panel(<InlineConfirm {...props} open busy />));

    // Busy blocks activation through aria-disabled, so the control stays in the
    // tab order and focus is never destroyed and chased.
    expect(cancel).toHaveFocus();
    expect(cancel).toHaveAttribute("aria-disabled", "true");
    expect(cancel).toBeEnabled();
  });

  it("focuses the confirmation inside its own document realm", () => {
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
    const { unmount } = render(
      <PanelRoot>
        <InlineConfirm {...props} open />
      </PanelRoot>,
      { container },
    );

    const confirmation = within(container).getByRole("region", {
      name: "Confirm action",
    });
    // Focus resolves through the rendered node's owner document, not the
    // top-level one, so a panel inside an iframe still manages its own focus.
    expect(ownerDocument.activeElement).toBe(confirmation);
    expect(document.activeElement).not.toBe(confirmation);

    unmount();
    iframe.remove();
  });

  it("falls back to a named confirmation for an empty fragment title", () => {
    renderInPanel(
      <InlineConfirm
        open
        title={<Fragment key="empty-title" />}
        message="Confirm this action."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Confirm action" }),
    ).toBeVisible();
  });

  it("accepts localized confirmation labels, native attributes, and a ref", () => {
    const ref = createRef<HTMLElement>();
    const confirmationProps = {
      fallbackTitle: "Confirmer l’action",
      cancelLabel: "Annuler",
      confirmLabel: "Confirmer",
      message: "Cette action est permanente.",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    } as const;
    const { rerender } = renderInPanel(
      <>
        <InlineConfirm
          {...confirmationProps}
          open
          ref={ref}
          data-testid="localized-confirmation"
          aria-labelledby="confirmation-context"
          aria-describedby="confirmation-guidance"
        />
        <span id="confirmation-context">Safety check</span>
        <span id="confirmation-guidance">Review before continuing.</span>
      </>,
    );

    expect(ref.current).toBe(screen.getByTestId("localized-confirmation"));
    expect(
      screen.getByRole("region", {
        name: "Safety check Confirmer l’action",
      }),
    ).toBeVisible();
    expect(ref.current).toHaveAccessibleDescription(
      "Review before continuing. Cette action est permanente.",
    );
    expect(screen.getByRole("button", { name: "Annuler" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeVisible();

    rerender(
      panel(<InlineConfirm {...confirmationProps} open={false} ref={ref} />),
    );
    expect(ref.current).toBeNull();
  });

  it("supports an explicit confirmation heading level", () => {
    renderInPanel(
      <InlineConfirm
        open
        headingLevel={4}
        title="Remove source?"
        message="Confirm this action."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 4, name: "Remove source?" }),
    ).toBeVisible();
  });
});
