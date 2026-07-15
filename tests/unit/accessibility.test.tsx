import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import {
  ActionBar,
  Banner,
  Button,
  Checkbox,
  Disclosure,
  InlineConfirm,
  LabeledField,
  NumberInput,
  PanelRoot,
  Section,
  StatusIndicator,
  TextInput,
  ThemeToggle,
} from "../../src/index.js";

describe("accessibility", () => {
  it("has no detectable serious accessibility violations", async () => {
    const { container } = render(
      <main>
        <PanelRoot>
          <ThemeToggle />
          <Banner tone="info" title="Provider detected">
            Configure the provider before saving.
          </Banner>
          <Section title="Connection" description="Signal K server connection">
            <LabeledField label="Server URL" required>
              <TextInput defaultValue="http://localhost:3000" />
            </LabeledField>
            <LabeledField
              label="Refresh interval"
              description="Stored in seconds"
            >
              <NumberInput defaultValue={10} min={1} />
            </LabeledField>
            <Checkbox label="Enable provider" />
            <Disclosure title="Advanced settings" open>
              No advanced settings are required.
            </Disclosure>
          </Section>
          <InlineConfirm
            open
            message="This action requires confirmation."
            onCancel={() => undefined}
            onConfirm={() => undefined}
          />
          <ActionBar
            status={<StatusIndicator tone="success">Ready</StatusIndicator>}
            actions={
              <>
                <Button loading>Saving</Button>
                <Button variant="primary">Save</Button>
              </>
            }
          />
        </PanelRoot>
      </main>,
    );

    // jsdom cannot calculate rendered color contrast. Browser tests cover it.
    const result = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(result.violations).toEqual([]);
  });
});
