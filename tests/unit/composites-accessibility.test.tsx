import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
  SaveActionBar,
  Tab,
  TabList,
  Table,
  TableCell,
  TableHeaderCell,
  TableScrollRegion,
  TabPanel,
  Tabs,
} from "../../src/composites.js";
import {
  Card,
  Code,
  CollapsibleSection,
  LiveRegion,
  PanelRoot,
  RelativeAge,
  StatusIndicator,
  Text,
  VisuallyHidden,
} from "../../src/index.js";

describe("composites accessibility", () => {
  it("has no detectable accessibility violations across the new primitives", async () => {
    const { container } = render(
      <main>
        <PanelRoot>
          <Card tone="warning" header="Priority" density="flush">
            <Text as="p" tone="muted" size="sm">
              Stored in seconds
            </Text>
            <Code>navigation.position</Code>
            <VisuallyHidden>Hidden detail</VisuallyHidden>
            <RelativeAge ageMs={120_000} />
            <StatusIndicator tone="info" size="compact">
              Pending
            </StatusIndicator>
          </Card>
          <CollapsibleSection
            title="Chart source"
            variant="embedded"
            landmark={false}
            leading={<input type="checkbox" aria-label="Enable chart source" />}
          >
            Content
          </CollapsibleSection>
          <Disclosure defaultOpen>
            <DisclosureTrigger>Hide details</DisclosureTrigger>
            <DisclosurePanel>
              <p>Details</p>
            </DisclosurePanel>
          </Disclosure>
          <Tabs defaultValue="a">
            <TabList aria-label="Pages">
              <Tab value="a">First</Tab>
              <Tab value="b" badge={<VisuallyHidden>2 errors</VisuallyHidden>}>
                Second
              </Tab>
            </TabList>
            <TabPanel value="a">First panel</TabPanel>
            <TabPanel value="b">Second panel</TabPanel>
          </Tabs>
          <TableScrollRegion aria-label="Sources, scrollable">
            <Table caption="Sources" zebra>
              <thead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell numeric>Age</TableHeaderCell>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <TableCell>GPS</TableCell>
                  <TableCell numeric>12</TableCell>
                </tr>
              </tbody>
            </Table>
          </TableScrollRegion>
          <LiveRegion message="" />
          <SaveActionBar
            dirty
            sticky="bottom"
            onSave={() => undefined}
            onDiscard={() => undefined}
          />
        </PanelRoot>
      </main>,
    );

    const result = await axe.run(container, {
      rules: {
        // jsdom cannot compute rendered colors, so color-contrast would
        // report every element; the browser suite owns that check.
        "color-contrast": { enabled: false },
      },
    });

    expect(result.violations).toEqual([]);
  });
});

describe("composites accessible names", () => {
  it("names a captionless table from aria-labelledby", () => {
    render(
      <>
        <h2 id="sources-heading">Sources</h2>
        <Table aria-labelledby="sources-heading">
          <tbody>
            <tr>
              <TableCell>GPS</TableCell>
            </tr>
          </tbody>
        </Table>
      </>,
    );

    expect(screen.getByRole("table", { name: "Sources" })).toBeInTheDocument();
  });

  it("names the scroll region from the caption it wraps", () => {
    render(
      <TableScrollRegion aria-labelledby="sources-caption">
        <Table caption={<span id="sources-caption">Sources</span>}>
          <tbody>
            <tr>
              <TableCell>GPS</TableCell>
            </tr>
          </tbody>
        </Table>
      </TableScrollRegion>,
    );

    expect(screen.getByRole("region", { name: "Sources" })).toBeInTheDocument();
  });

  it("names the tab list from aria-labelledby", () => {
    render(
      <>
        <h2 id="pages-heading">Pages</h2>
        <Tabs defaultValue="a">
          <TabList aria-labelledby="pages-heading">
            <Tab value="a">First</Tab>
          </TabList>
          <TabPanel value="a">First panel</TabPanel>
        </Tabs>
      </>,
    );

    expect(screen.getByRole("tablist", { name: "Pages" })).toBeInTheDocument();
  });
});
