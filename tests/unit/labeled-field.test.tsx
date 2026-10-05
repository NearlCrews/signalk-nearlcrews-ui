import { screen } from "@testing-library/react";
import { createRef, Fragment, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { SecretInput } from "../../src/forms.js";
import {
  Checkbox,
  type FieldControlProps,
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
  LabeledField,
  type LabeledFieldControlProps,
  NumberInput,
  RangeInput,
  Section,
  Select,
  splitLabeledFieldControlProps,
  Textarea,
  TextInput,
} from "../../src/index.js";
import { renderInPanel } from "../helpers.js";

describe("LabeledField", () => {
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
      "Use the Signal K server address. Error.A server URL is required.",
    );
  });

  it("sets an error's danger glyph and message side by side in one row", () => {
    const { container } = renderInPanel(
      <LabeledField
        label="Server URL"
        error={
          <>
            Enter an <strong>HTTP</strong> address.
          </>
        }
      >
        <TextInput />
      </LabeledField>,
    );

    // The glyph and the message are the row's two items, whatever markup the
    // message holds, so a wrapped line hangs past the glyph.
    const row = container.querySelector(
      ".snui-field__error > .snui-field-error__row",
    );
    // The region carries the shared block class beside the field's own, which
    // is the one the rule that hides an empty region keys on.
    expect(row?.parentElement).toHaveClass(
      "snui-field-error snui-field__error",
      { exact: true },
    );
    const items = [...(row?.children ?? [])].filter(
      (item) => !item.classList.contains("snui-visually-hidden"),
    );
    expect(items.map((item) => item.className)).toEqual([
      expect.stringContaining("snui-field-error__tone-glyph"),
      "snui-field-error__text",
    ]);
    expect(items[1]).toHaveTextContent("Enter an HTTP address.");
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
    ).toThrow(
      "signalk-nearlcrews-ui: LabeledField requires a non-empty label.",
    );

    expect(() => renderInPanel(<Checkbox label={"\t"} />)).toThrow(
      "signalk-nearlcrews-ui: Checkbox requires a non-empty label.",
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
              <InputGroupControl controlWidth="grow">
                <RangeInput {...rangeProps} min={4} max={32} />
              </InputGroupControl>
              <InputGroupControl controlWidth="fixed">
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
      "Whole GiB Error.Choose at least 4 GiB.",
    );
    expect(
      screen.getByRole("spinbutton", { name: "Cache limit exact value" }),
    ).toHaveAccessibleDescription("Whole GiB Error.Choose at least 4 GiB.");
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
});

describe("LabeledField root", () => {
  it("forwards the ref and native attributes to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(
      <LabeledField
        label="Server URL"
        ref={ref}
        data-testid="server-url-field"
        id="server-url"
      >
        <TextInput />
      </LabeledField>,
    );

    const root = screen.getByTestId("server-url-field");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("id", "server-url");
    expect(root).toHaveClass("snui-field", "snui-field--default");
  });

  it("emits a class for each density step", () => {
    const { container } = renderInPanel(
      <>
        <LabeledField label="Default" density="default">
          <TextInput />
        </LabeledField>
        <LabeledField label="Compact" density="compact">
          <TextInput />
        </LabeledField>
      </>,
    );

    const fields = container.querySelectorAll(".snui-field");
    expect(fields[0]).toHaveClass("snui-field--default");
    expect(fields[1]).toHaveClass("snui-field--compact");
  });
});

describe("LabeledField control injection", () => {
  it("rejects an intrinsic child that cannot be labeled", () => {
    expect(() =>
      renderInPanel(
        <LabeledField label="Server URL">
          <div />
        </LabeledField>,
      ),
    ).toThrow(
      "signalk-nearlcrews-ui: LabeledField element children must render a labelable form control. Use the render-prop form for composite controls.",
    );
  });

  it("accepts a package control that forwards the injected props", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    renderInPanel(
      <LabeledField label="API key">
        <SecretInput />
      </LabeledField>,
    );

    expect(warn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/API key/)).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("injects name, disabled, and required into an element child", () => {
    renderInPanel(
      <LabeledField label="Server URL" name="serverUrl" disabled required>
        <TextInput />
      </LabeledField>,
    );

    const input = screen.getByRole("textbox", { name: /Server URL/ });
    expect(input).toHaveAttribute("name", "serverUrl");
    expect(input).toBeDisabled();
    expect(input).toBeRequired();
  });

  it("keeps name and disabled already set on an element child", () => {
    renderInPanel(
      <LabeledField label="Server URL" name="outerName" disabled>
        <TextInput name="innerName" disabled={false} />
      </LabeledField>,
    );

    const input = screen.getByRole("textbox", { name: /Server URL/ });
    expect(input).toHaveAttribute("name", "innerName");
    expect(input).toBeEnabled();
  });

  it("injects name and disabled through the render-prop contract", () => {
    let received: LabeledFieldControlProps | undefined;
    renderInPanel(
      <LabeledField label="Cache limit" name="cacheLimit" disabled>
        {(controlProps) => {
          received = controlProps;
          return <NumberInput {...controlProps} aria-label="Cache limit" />;
        }}
      </LabeledField>,
    );

    const input = screen.getByRole("spinbutton", { name: "Cache limit" });
    expect(input).toHaveAttribute("name", "cacheLimit");
    expect(input).toBeDisabled();
    expect(received?.name).toBe("cacheLimit");
    expect(received?.disabled).toBe(true);
  });

  it("exposes region ids only when the matching content exists", () => {
    const seen: LabeledFieldControlProps[] = [];
    renderInPanel(
      <>
        <LabeledField label="Plain">
          {(controlProps) => {
            seen.push(controlProps);
            return <TextInput id={controlProps.id} />;
          }}
        </LabeledField>
        <LabeledField
          label="Refresh interval"
          description="Stored in seconds"
          error="Choose at least 4."
        >
          {(controlProps) => {
            seen.push(controlProps);
            return <TextInput id={controlProps.id} />;
          }}
        </LabeledField>
      </>,
    );

    expect(seen[0]?.descriptionId).toBeUndefined();
    expect(seen[0]?.errorId).toBeUndefined();

    const descriptionId = seen[1]?.descriptionId;
    const errorId = seen[1]?.errorId;
    if (descriptionId === undefined || errorId === undefined) {
      throw new Error("Expected region ids for the documented field.");
    }
    expect(document.getElementById(descriptionId)).toHaveTextContent(
      "Stored in seconds",
    );
    expect(document.getElementById(errorId)).toHaveTextContent(
      "Choose at least 4.",
    );
  });

  it("withholds the error id while only live announcements are requested", () => {
    let received: LabeledFieldControlProps | undefined;
    renderInPanel(
      <LabeledField label="Server URL" errorLive="polite">
        {(controlProps) => {
          received = controlProps;
          return <TextInput id={controlProps.id} />;
        }}
      </LabeledField>,
    );

    expect(received?.errorId).toBeUndefined();
    expect(received?.descriptionId).toBeUndefined();
  });

  it("lets composite children wire secondary controls to the region ids", () => {
    renderInPanel(
      <LabeledField
        label="Cache limit"
        description="Whole GiB"
        error="Choose at least 4 GiB."
      >
        {(fieldProps) => {
          const { controlProps, descriptionId, errorId } =
            splitLabeledFieldControlProps(fieldProps);
          return (
            <>
              <TextInput {...controlProps} />
              <NumberInput
                aria-label="Cache limit exact value"
                aria-describedby={[descriptionId, errorId].join(" ")}
              />
            </>
          );
        }}
      </LabeledField>,
    );

    expect(
      screen.getByRole("spinbutton", { name: "Cache limit exact value" }),
    ).toHaveAccessibleDescription("Whole GiB Error.Choose at least 4 GiB.");
    // The primary control received the attributes and none of the lookups.
    const primary = screen.getByRole("textbox", { name: "Cache limit" });
    expect(primary).toHaveAttribute("aria-invalid", "true");
    expect(primary).not.toHaveAttribute("descriptionId");
    expect(primary).not.toHaveAttribute("errorId");
  });

  it("merges caller ids into the control description without a join", () => {
    renderInPanel(
      <>
        <p id="retention-note">Applies to every logged source.</p>
        <p id="retention-limit">The server keeps four weeks at most.</p>
        <LabeledField
          label="Retention"
          description="Whole days"
          error="Choose at least one day."
          controlDescribedBy={["retention-note", undefined, "retention-limit"]}
        >
          {(fieldProps) => {
            const { controlProps } = splitLabeledFieldControlProps(fieldProps);
            // The caller spreads and nothing else: the ids arrive merged.
            return <TextInput {...controlProps} />;
          }}
        </LabeledField>
      </>,
    );

    // The field's own text is read first, then the caller's, so the order the
    // reader hears follows the order the page shows.
    expect(
      screen.getByRole("textbox", { name: "Retention" }),
    ).toHaveAccessibleDescription(
      "Whole days Error.Choose at least one day. Applies to every logged source. The server keeps four weeks at most.",
    );
  });

  it("reads its own text before either route the caller adds ids by", () => {
    renderInPanel(
      <>
        <p id="port-hint">1 to 65535.</p>
        <p id="port-note">Restarting the plugin frees the old port.</p>
        <LabeledField
          label="Port"
          description="Whole numbers"
          error="Choose a free port."
          controlDescribedBy="port-note"
        >
          <TextInput aria-describedby="port-hint" />
        </LabeledField>
      </>,
    );

    // A describedby already on the child and an id named in
    // controlDescribedBy are two routes to the same thing, so both follow the
    // field's description and error rather than displacing them.
    expect(
      screen.getByRole("textbox", { name: "Port" }),
    ).toHaveAccessibleDescription(
      "Whole numbers Error.Choose a free port. 1 to 65535. Restarting the plugin frees the old port.",
    );
  });

  it("names a repeated id once in the merged description", () => {
    renderInPanel(
      <>
        <p id="keel-note">Metres below the keel.</p>
        <LabeledField
          label="Depth"
          controlDescribedBy={["keel-note", "keel-note"]}
        >
          <TextInput aria-describedby="keel-note" />
        </LabeledField>
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Depth" });
    expect(input).toHaveAttribute("aria-describedby", "keel-note");
    expect(input).toHaveAccessibleDescription("Metres below the keel.");
  });

  it("reads a required attribute the child already carries", () => {
    const { container } = renderInPanel(
      <LabeledField label="Port">
        <TextInput required />
      </LabeledField>,
    );

    expect(screen.getByRole("textbox", { name: "Port" })).toBeRequired();
    expect(container.querySelector(".snui-required-mark")).toHaveTextContent(
      "*",
    );
  });

  it("exposes the required state to a composite control", () => {
    renderInPanel(
      <LabeledField label="Alert sources" required>
        {(fieldProps) => {
          const { controlProps } = splitLabeledFieldControlProps(fieldProps);
          return (
            <div {...controlProps} role="radiogroup" aria-label="Alert sources">
              <span />
            </div>
          );
        }}
      </LabeledField>,
    );

    // A div, a fieldset, and a group role expose no required state from the
    // native attribute, so the ARIA state travels beside it.
    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "aria-required",
      "true",
    );
  });

  it("leaves required and disabled off a child that carries neither", () => {
    const { container } = renderInPanel(
      <LabeledField label="Import progress" required disabled>
        <progress value={40} max={100} />
      </LabeledField>,
    );

    const bar = container.querySelector("progress");
    // React would write both as bare attributes with no state behind them.
    expect(bar).not.toHaveAttribute("required");
    expect(bar).not.toHaveAttribute("disabled");
    expect(bar).not.toHaveAttribute("aria-required");
    // The wiring every child gets is unchanged.
    expect(bar).toHaveAttribute("id");
  });

  it("reports a consumer component that may swallow the injected props", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    function ConsumerControl(props: FieldControlProps): React.JSX.Element {
      return <input {...props} />;
    }

    renderInPanel(
      <LabeledField label="Chart source">
        <ConsumerControl />
      </LabeledField>,
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("LabeledField received ConsumerControl"),
    );
    expect(warn.mock.calls[0]?.[0]).toContain("render-prop form");
  });

  it("merges a single caller id for an element child too", () => {
    renderInPanel(
      <>
        <p id="port-note">Restarting the plugin frees the old port.</p>
        <LabeledField label="Port" controlDescribedBy="port-note">
          <TextInput aria-describedby="port-hint" />
        </LabeledField>
        <p id="port-hint">1 to 65535.</p>
      </>,
    );

    expect(
      screen.getByRole("textbox", { name: "Port" }),
    ).toHaveAccessibleDescription(
      "1 to 65535. Restarting the plugin frees the old port.",
    );
  });

  it("splits the render-prop argument into control props and region ids", () => {
    const split = splitLabeledFieldControlProps({
      id: "control",
      "aria-describedby": "control-description control-error",
      "aria-errormessage": "control-error",
      "aria-invalid": true,
      descriptionId: "control-description",
      errorId: "control-error",
      required: true,
    });

    expect(split).toEqual({
      controlProps: {
        id: "control",
        "aria-describedby": "control-description control-error",
        "aria-errormessage": "control-error",
        "aria-invalid": true,
        required: true,
      },
      descriptionId: "control-description",
      errorId: "control-error",
    });
    expect(splitLabeledFieldControlProps({ id: "plain" })).toEqual({
      controlProps: { id: "plain" },
      descriptionId: undefined,
      errorId: undefined,
    });
  });
});

describe("LabeledField optional marker", () => {
  it("renders a muted optional marker when the field is not required", () => {
    const { container } = renderInPanel(
      <LabeledField label="Nickname" optionalLabel="(optional)">
        <TextInput />
      </LabeledField>,
    );

    const marker = container.querySelector(".snui-optional-mark");
    expect(marker).toHaveTextContent("(optional)");
    // The marker is part of the label the user sees, so it stays in the name.
    expect(marker).not.toHaveAttribute("aria-hidden");
    expect(
      screen.getByRole("textbox", { name: "Nickname (optional)" }),
    ).not.toBeRequired();
  });

  it("suppresses the optional marker when the field is required", () => {
    const { container } = renderInPanel(
      <LabeledField label="Server URL" required optionalLabel="(optional)">
        <TextInput />
      </LabeledField>,
    );

    expect(container.querySelector(".snui-optional-mark")).toBeNull();
    expect(container.querySelector(".snui-required-mark")).toHaveTextContent(
      "*",
    );
  });

  it("omits the marker for empty optional content", () => {
    const { container } = renderInPanel(
      <LabeledField label="Nickname" optionalLabel={null}>
        <TextInput />
      </LabeledField>,
    );

    expect(container.querySelector(".snui-optional-mark")).toBeNull();
  });

  it("takes a required marker of its own and adds no space without one", () => {
    const { container } = renderInPanel(
      <>
        <LabeledField label="Server URL" required requiredLabel="(required)">
          <TextInput />
        </LabeledField>
        <LabeledField label="Nickname">
          <TextInput />
        </LabeledField>
      </>,
    );

    const labels = container.querySelectorAll(".snui-field__label");
    expect(labels[0]?.querySelector(".snui-required-mark")).toHaveTextContent(
      "(required)",
    );
    // The separator belongs to the marker, so a label without one ends where
    // its text ends rather than padding the accessible name with a space.
    expect(labels[1]?.textContent).toBe("Nickname");
  });
});

describe("Region ids spread onto a package control", () => {
  it.each([
    [
      "RangeInput",
      (props: LabeledFieldControlProps): ReactElement => (
        <RangeInput {...props} min={0} max={10} defaultValue={5} />
      ),
    ],
    [
      "NumberInput",
      (props: LabeledFieldControlProps): ReactElement => (
        <NumberInput {...props} defaultValue={5} />
      ),
    ],
    [
      "TextInput",
      (props: LabeledFieldControlProps): ReactElement => (
        <TextInput {...props} defaultValue="5" />
      ),
    ],
    [
      "Select",
      (props: LabeledFieldControlProps): ReactElement => (
        <Select {...props} defaultValue="5">
          <option value="5">Five</option>
        </Select>
      ),
    ],
    [
      "Textarea",
      (props: LabeledFieldControlProps): ReactElement => (
        <Textarea {...props} defaultValue="5" />
      ),
    ],
    [
      "SecretInput",
      (props: LabeledFieldControlProps): ReactElement => (
        <SecretInput {...props} defaultValue="5" />
      ),
    ],
  ])("keeps them off the element %s renders", (_, control) => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { container } = renderInPanel(
      <LabeledField
        label="Retention"
        description="Whole GiB"
        error="Enter at most 10."
      >
        {control}
      </LabeledField>,
    );

    // The raw render-prop argument carries both lookup ids; the control
    // drops them rather than writing unknown attributes.
    const element = container.querySelector(
      "input:not([type=hidden]), select, textarea",
    );
    expect(element).not.toHaveAttribute("descriptionid");
    expect(element).not.toHaveAttribute("errorid");
    expect(element).toHaveAccessibleDescription(
      "Whole GiB Error.Enter at most 10.",
    );
    expect(error).not.toHaveBeenCalled();
  });
});
