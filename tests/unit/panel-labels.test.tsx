import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SaveActionBar } from "../../src/composites.js";
import { Cell, Column, DataGrid, Row } from "../../src/data-grid.js";
import { SecretInput } from "../../src/forms.js";
import {
  Banner,
  Button,
  InlineConfirm,
  NumberField,
  type PanelLabels,
  PanelShell,
  RelativeAge,
  ThemeToggle,
  usePanelLabels,
} from "../../src/index.js";
import { createToastQueue, ToastRegion } from "../../src/overlays.js";
import { renderInPanel } from "../helpers.js";

const DUTCH: PanelLabels = {
  banner: { dismiss: "Sluiten" },
  button: { loading: "Bezig" },
  dataGrid: { emptyTitle: "Nog niets te tonen" },
  inlineConfirm: {
    cancel: "Annuleren",
    confirm: "Bevestigen",
    fallbackTitle: "Actie bevestigen",
  },
  numberField: { empty: "Voer een getal in." },
  relativeAge: { fallback: "Onbekend" },
  saveActionBar: { discard: "Verwerpen", save: "Opslaan" },
  secretInput: { hide: "Verbergen", show: "Tonen" },
  themeToggle: { choices: { light: "Licht" }, label: "Paneelthema" },
  tone: { danger: "Fout" },
};

describe("panel label bundle", () => {
  it("replaces the package defaults across the panel", () => {
    renderInPanel(
      <>
        <Button loading>Save</Button>
        <Banner tone="danger" onDismiss={() => undefined}>
          Lost the depth sounder.
        </Banner>
        <SecretInput aria-label="API key" />
        <SaveActionBar
          dirty
          onDiscard={() => undefined}
          onSave={() => undefined}
        />
        <ThemeToggle />
        <RelativeAge ageMs={Number.NaN} />
      </>,
      { labels: DUTCH },
    );

    expect(screen.getByText("Bezig")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sluiten" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Tonen" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Opslaan" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Verwerpen" })).toBeVisible();
    expect(
      screen.getByRole("radiogroup", { name: /Paneelthema/ }),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: "Licht" })).toBeVisible();
    expect(screen.getByText("Onbekend")).toBeVisible();
    // The tone name is read beside the message, so the bundle's word stands
    // where "Error." would.
    expect(screen.getByText(/^Fout\./)).toBeInTheDocument();
  });

  it("keeps a component prop above the bundle", () => {
    renderInPanel(
      <Button loading loadingLabel="Anchoring">
        Save
      </Button>,
      { labels: DUTCH },
    );

    expect(screen.getByText("Anchoring")).toBeInTheDocument();
    expect(screen.queryByText("Bezig")).toBeNull();
  });

  it("falls back to the package default for a blank or absent entry", () => {
    renderInPanel(
      <>
        <Button loading>Save</Button>
        <SecretInput aria-label="API key" />
      </>,
      { labels: { button: { loading: "   " }, secretInput: {} } },
    );

    expect(screen.getByText("Working")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show" })).toBeVisible();
  });

  it("titles an empty grid and a confirmation from the bundle", () => {
    renderInPanel(
      <>
        <DataGrid<{ readonly id: string }>
          aria-label="Waypoints"
          items={[]}
          renderRow={(waypoint) => (
            <Row>
              <Cell>{waypoint.id}</Cell>
            </Row>
          )}
        >
          <Column id="id" isRowHeader>
            Name
          </Column>
        </DataGrid>
        <InlineConfirm
          open
          message="This cannot be undone."
          onCancel={() => undefined}
          onConfirm={() => undefined}
        />
      </>,
      { labels: DUTCH },
    );

    expect(screen.getByText("Nog niets te tonen")).toBeVisible();
    expect(screen.getByRole("button", { name: "Annuleren" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Bevestigen" })).toBeVisible();
    expect(screen.getByText("Actie bevestigen")).toBeVisible();
  });

  it("reads a number field message from the bundle", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <NumberField label="Depth alarm" defaultValue={3} integer min={1} />,
      { labels: DUTCH },
    );

    const input = screen.getByRole("spinbutton", { name: "Depth alarm" });
    await user.clear(input);

    // The tone word ahead of the message comes from the same bundle.
    expect(input).toHaveAccessibleDescription("Fout.Voer een getal in.");
  });

  it("names the toast region and its dismissal from the bundle", () => {
    const queue = createToastQueue();
    renderInPanel(<ToastRegion queue={queue} />, {
      labels: { toastRegion: { dismiss: "Sluiten", label: "Meldingen" } },
    });
    act(() => {
      queue.enqueue({ title: "Anchor watch armed" });
    });

    expect(screen.getByRole("region", { name: "Meldingen" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sluiten" })).toBeVisible();
  });

  it("writes the panel error fallback from the bundle", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Bomb(): React.JSX.Element {
      throw new Error("chart tiles failed");
    }

    render(
      <PanelShell
        title="Chart locker"
        labels={{
          panelError: {
            description: "Opnieuw proberen bouwt dit paneel opnieuw op.",
            reload: "Pagina herladen",
            retry: "Opnieuw proberen",
            title: "Dit paneel werkt niet meer",
          },
        }}
      >
        <Bomb />
      </PanelShell>,
    );

    expect(screen.getByText("Dit paneel werkt niet meer")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Opnieuw proberen" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Pagina herladen" }),
    ).toBeVisible();
    expect(
      screen.getByText("Opnieuw proberen bouwt dit paneel opnieuw op."),
    ).toBeVisible();
  });

  it("publishes the bundle from the shell and reads it back", () => {
    function BundleProbe(): React.JSX.Element {
      return <span>{usePanelLabels()?.button?.loading ?? "none"}</span>;
    }

    render(
      <PanelShell title="Connection" labels={DUTCH}>
        <BundleProbe />
      </PanelShell>,
    );

    expect(screen.getByText("Bezig")).toBeVisible();
  });

  it("keeps the English defaults with no bundle", () => {
    renderInPanel(<Button loading>Save</Button>);

    expect(screen.getByText("Working")).toBeInTheDocument();
  });
});
