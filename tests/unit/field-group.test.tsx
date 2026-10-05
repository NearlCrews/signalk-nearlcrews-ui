import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckboxGroup } from "../../src/composites.js";
import {
  Button,
  Checkbox,
  CollapsibleSection,
  FieldGroup,
  Metric,
  Section,
} from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

describe("FieldGroup", () => {
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

describe("Grouping primitive names", () => {
  it("rejects whitespace-only names for semantic grouping primitives", () => {
    // Each message names both naming props where a component takes two, and
    // the component the consumer rendered rather than the one inside it.
    expect(() => render(<FieldGroup legend="  ">Content</FieldGroup>)).toThrow(
      "signalk-nearlcrews-ui: FieldGroup requires a non-empty label or legend.",
    );
    expect(() =>
      render(
        <CheckboxGroup
          label=" "
          options={[{ label: "Wind", value: "wind" }]}
        />,
      ),
    ).toThrow(
      "signalk-nearlcrews-ui: CheckboxGroup requires a non-empty label or legend.",
    );
    expect(() => render(<Section title="  ">Content</Section>)).toThrow(
      "signalk-nearlcrews-ui: Section requires a non-empty title.",
    );
    expect(() =>
      render(<CollapsibleSection title="  ">Content</CollapsibleSection>),
    ).toThrow(
      "signalk-nearlcrews-ui: CollapsibleSection requires a non-empty title.",
    );
    expect(() => render(<Metric label="  " value="12" />)).toThrow(
      "signalk-nearlcrews-ui: Metric requires a non-empty label.",
    );
  });
});

describe("FieldGroup naming and description", () => {
  it("names the group from label, and still accepts the legend spelling", () => {
    renderInPanel(
      <>
        <FieldGroup label="Notifications">
          <Checkbox label="Wind" />
        </FieldGroup>
        <FieldGroup legend="Providers">
          <Checkbox label="Primary" />
        </FieldGroup>
        <FieldGroup label="Sources" legend="Ignored">
          <Checkbox label="AIS" />
        </FieldGroup>
      </>,
    );

    expect(screen.getByRole("group", { name: "Notifications" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Providers" })).toBeTruthy();
    // label decides when both are given, the way it does on the other groups.
    expect(screen.getByRole("group", { name: "Sources" })).toBeTruthy();
  });

  it("reads its own text before the ids the caller adds", () => {
    renderInPanel(
      <>
        <p id="alert-note">Alerts publish to the vessel bus.</p>
        <p id="alert-scope">Each alert covers this vessel only.</p>
        <FieldGroup
          label="Notifications"
          description="Choose the alerts to publish."
          error="Select at least one alert."
          aria-describedby="alert-scope"
          groupDescribedBy="alert-note"
        >
          <Checkbox label="Wind" />
        </FieldGroup>
      </>,
    );

    // Either route the caller takes, aria-describedby and then
    // groupDescribedBy, follows the group's own description and error.
    expect(
      screen.getByRole("group", { name: "Notifications" }),
    ).toHaveAccessibleDescription(
      "Choose the alerts to publish. Error.Select at least one alert. Each alert covers this vessel only. Alerts publish to the vessel bus.",
    );
  });
});

describe("FieldGroup group error", () => {
  it("associates a group error with the fieldset without announcing it", () => {
    renderInPanel(
      <FieldGroup
        legend="Notifications"
        description="Choose the alerts to publish."
        error="Select at least one alert."
      >
        <Checkbox label="Wind" />
      </FieldGroup>,
    );

    const group = screen.getByRole("group", { name: "Notifications" });
    expect(group).toHaveAccessibleDescription(
      "Choose the alerts to publish. Error.Select at least one alert.",
    );
    // The message sits in the error region's glyph row.
    const error = screen
      .getByText("Select at least one alert.")
      .closest(".snui-field-group__error");
    expect(error).not.toBeNull();
    expect(error).not.toHaveAttribute("role");
    expect(error).toHaveAttribute("aria-live", "off");
    // The group role supports neither attribute, so the description carries
    // the error instead.
    expect(group).not.toHaveAttribute("aria-errormessage");
    expect(group).not.toHaveAttribute("aria-invalid");
  });

  it("mounts an announcing region before group error content arrives", () => {
    const { container, rerender } = renderInPanel(
      <FieldGroup legend="Notifications" errorLive="polite">
        <Checkbox label="Wind" />
      </FieldGroup>,
    );

    const region = container.querySelector(".snui-field-group__error");
    expect(region).not.toBeNull();
    // A roled live region does not also carry aria-live.
    expect(region).toHaveAttribute("role", "status");
    expect(region).not.toHaveAttribute("aria-live");
    expect(region).toBeEmptyDOMElement();
    expect(
      screen.getByRole("group", { name: "Notifications" }),
    ).not.toHaveAccessibleDescription();

    rerender(
      panel(
        <FieldGroup
          legend="Notifications"
          errorLive="polite"
          error="Select at least one alert."
        >
          <Checkbox label="Wind" />
        </FieldGroup>,
      ),
    );

    expect(region).toHaveTextContent("Select at least one alert.");
    expect(
      screen.getByRole("group", { name: "Notifications" }),
    ).toHaveAccessibleDescription("Error.Select at least one alert.");
  });
});
