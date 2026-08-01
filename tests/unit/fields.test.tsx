import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Checkbox,
  FieldGroup,
  LabeledField,
  type LabeledFieldControlProps,
  NumberInput,
  PanelRoot,
  TextInput,
} from "../../src/index.js";

describe("LabeledField control injection", () => {
  it("injects name, disabled, and required into an element child", () => {
    render(
      <PanelRoot>
        <LabeledField label="Server URL" name="serverUrl" disabled required>
          <TextInput />
        </LabeledField>
      </PanelRoot>,
    );

    const input = screen.getByRole("textbox", { name: /Server URL/ });
    expect(input).toHaveAttribute("name", "serverUrl");
    expect(input).toBeDisabled();
    expect(input).toBeRequired();
  });

  it("keeps name and disabled already set on an element child", () => {
    render(
      <PanelRoot>
        <LabeledField label="Server URL" name="outerName" disabled>
          <TextInput name="innerName" disabled={false} />
        </LabeledField>
      </PanelRoot>,
    );

    const input = screen.getByRole("textbox", { name: /Server URL/ });
    expect(input).toHaveAttribute("name", "innerName");
    expect(input).toBeEnabled();
  });

  it("injects name and disabled through the render-prop contract", () => {
    let received: LabeledFieldControlProps | undefined;
    render(
      <PanelRoot>
        <LabeledField label="Cache limit" name="cacheLimit" disabled>
          {(controlProps) => {
            received = controlProps;
            return <NumberInput {...controlProps} aria-label="Cache limit" />;
          }}
        </LabeledField>
      </PanelRoot>,
    );

    const input = screen.getByRole("spinbutton", { name: "Cache limit" });
    expect(input).toHaveAttribute("name", "cacheLimit");
    expect(input).toBeDisabled();
    expect(received?.name).toBe("cacheLimit");
    expect(received?.disabled).toBe(true);
  });

  it("exposes region ids only when the matching content exists", () => {
    const seen: LabeledFieldControlProps[] = [];
    render(
      <PanelRoot>
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
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <LabeledField label="Server URL" errorLive="polite">
          {(controlProps) => {
            received = controlProps;
            return <TextInput id={controlProps.id} />;
          }}
        </LabeledField>
      </PanelRoot>,
    );

    expect(received?.errorId).toBeUndefined();
    expect(received?.descriptionId).toBeUndefined();
  });

  it("lets composite children wire secondary controls to the region ids", () => {
    render(
      <PanelRoot>
        <LabeledField
          label="Cache limit"
          description="Whole GiB"
          error="Choose at least 4 GiB."
        >
          {(controlProps) => {
            const { descriptionId, errorId, ...inputProps } = controlProps;
            return (
              <>
                <TextInput {...inputProps} />
                <NumberInput
                  aria-label="Cache limit exact value"
                  aria-describedby={[descriptionId, errorId].join(" ")}
                />
              </>
            );
          }}
        </LabeledField>
      </PanelRoot>,
    );

    expect(
      screen.getByRole("spinbutton", { name: "Cache limit exact value" }),
    ).toHaveAccessibleDescription("Whole GiB Choose at least 4 GiB.");
  });
});

describe("LabeledField optional marker", () => {
  it("renders a muted optional marker when the field is not required", () => {
    const { container } = render(
      <PanelRoot>
        <LabeledField label="Nickname" optionalLabel="(optional)">
          <TextInput />
        </LabeledField>
      </PanelRoot>,
    );

    const marker = container.querySelector(".snui-optional-mark");
    expect(marker).toHaveTextContent("(optional)");
    expect(marker).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.getByRole("textbox", { name: "Nickname" }),
    ).not.toBeRequired();
  });

  it("suppresses the optional marker when the field is required", () => {
    const { container } = render(
      <PanelRoot>
        <LabeledField label="Server URL" required optionalLabel="(optional)">
          <TextInput />
        </LabeledField>
      </PanelRoot>,
    );

    expect(container.querySelector(".snui-optional-mark")).toBeNull();
    expect(container.querySelector(".snui-required-mark")).toHaveTextContent(
      "*",
    );
  });

  it("omits the marker for empty optional content", () => {
    const { container } = render(
      <PanelRoot>
        <LabeledField label="Nickname" optionalLabel={null}>
          <TextInput />
        </LabeledField>
      </PanelRoot>,
    );

    expect(container.querySelector(".snui-optional-mark")).toBeNull();
  });
});

describe("FieldGroup group error", () => {
  it("associates a group error with the fieldset without announcing it", () => {
    render(
      <PanelRoot>
        <FieldGroup
          legend="Notifications"
          description="Choose the alerts to publish."
          error="Select at least one alert."
        >
          <Checkbox label="Wind" />
        </FieldGroup>
      </PanelRoot>,
    );

    const group = screen.getByRole("group", { name: "Notifications" });
    expect(group).toHaveAccessibleDescription(
      "Choose the alerts to publish. Select at least one alert.",
    );
    const error = screen.getByText("Select at least one alert.");
    expect(error).toHaveClass("snui-field-group__error");
    expect(error).not.toHaveAttribute("role");
    expect(error).toHaveAttribute("aria-live", "off");
  });

  it("mounts an announcing region before group error content arrives", () => {
    const { container, rerender } = render(
      <PanelRoot>
        <FieldGroup legend="Notifications" errorLive="polite">
          <Checkbox label="Wind" />
        </FieldGroup>
      </PanelRoot>,
    );

    const region = container.querySelector(".snui-field-group__error");
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
    expect(
      screen.getByRole("group", { name: "Notifications" }),
    ).not.toHaveAccessibleDescription();

    rerender(
      <PanelRoot>
        <FieldGroup
          legend="Notifications"
          errorLive="polite"
          error="Select at least one alert."
        >
          <Checkbox label="Wind" />
        </FieldGroup>
      </PanelRoot>,
    );

    expect(region).toHaveTextContent("Select at least one alert.");
    expect(
      screen.getByRole("group", { name: "Notifications" }),
    ).toHaveAccessibleDescription("Select at least one alert.");
  });
});

describe("TextInput calendar types", () => {
  it("accepts month and week input types", () => {
    render(
      <PanelRoot>
        <LabeledField label="Maintenance month">
          <TextInput type="month" />
        </LabeledField>
        <LabeledField label="Maintenance week">
          <TextInput type="week" />
        </LabeledField>
      </PanelRoot>,
    );

    expect(screen.getByLabelText("Maintenance month")).toHaveAttribute(
      "type",
      "month",
    );
    expect(screen.getByLabelText("Maintenance week")).toHaveAttribute(
      "type",
      "week",
    );
  });
});
