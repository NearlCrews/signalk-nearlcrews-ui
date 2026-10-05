import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FreshnessNote } from "../../src/components/FreshnessNote.js";
import { SaveActionBar } from "../../src/composites.js";
import { Cell, Column, DataGrid, Row } from "../../src/data-grid.js";
import { SecretInput } from "../../src/forms.js";
import {
  Banner,
  Button,
  Code,
  InlineConfirm,
  NumberField,
  PANEL_LABEL_DEFAULTS,
  PanelErrorBoundary,
  type PanelLabelDefaults,
  type PanelLabels,
  PanelShell,
  RelativeAge,
  StatusIndicator,
  ThemeToggle,
  usePanelLabels,
} from "../../src/index.js";
import {
  createToastQueue,
  Menu,
  MenuItem,
  ToastRegion,
} from "../../src/overlays.js";
import { renderInPanel } from "../helpers.js";
import { Bomb } from "./lib/failing-content.js";

/** Every string of a defaults group, flattened so nested groups count too. */
function groupStrings(group: object): string[] {
  return Object.values(group).flatMap((entry: unknown) =>
    typeof entry === "string" ? [entry] : groupStrings(entry as object),
  );
}

/** A copy of a defaults group with every string blanked. */
function blankGroup(group: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(group).map(([key, entry]: [string, unknown]) => [
      key,
      typeof entry === "string" ? "   " : blankGroup(entry as object),
    ]),
  );
}

/**
 * Whether the page shows a string: as a text node of its own, as a sentence
 * the tone and menu marks close with a period, or as an accessible name
 * written into aria-label. Whole text nodes rather than substrings, so
 * "Confirm" is not found inside "Confirm action". A wording with an `{age}`
 * slot is found by the words ahead of the age, which render as their own
 * text node.
 */
function pageShows(wording: string): boolean {
  const text = wording.split("{age}")[0]?.trim() ?? wording;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const value = node.nodeValue?.trim();
    if (value === text || value === `${text}.`) return true;
  }
  return [...document.querySelectorAll("[aria-label]")].some(
    (element) => element.getAttribute("aria-label") === text,
  );
}

/**
 * Every wording a freshness note has: fresh, stale, and pending notes on
 * screen, two notes whose sample is stamped ahead of this clock so no age can
 * be stated, and one note that turns stale and back once the shell's regions
 * have settled, so both announcements are spoken.
 */
function FreshnessSurface(): React.JSX.Element {
  const [since] = useState(() => Date.now() - 60_000);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const turnStale = setTimeout(() => {
      setStale(true);
    }, 150);
    const recover = setTimeout(() => {
      setStale(false);
    }, 200);
    return () => {
      clearTimeout(turnStale);
      clearTimeout(recover);
    };
  }, []);
  return (
    <>
      <FreshnessNote since={since} stale={false} />
      <FreshnessNote since={since} stale />
      <FreshnessNote since={null} stale={false} />
      <FreshnessNote since={since + 180_000} stale={false} />
      <FreshnessNote since={since + 180_000} stale />
      <FreshnessNote since={since} stale={stale} />
    </>
  );
}

/** A toast region holding one toast that stays until dismissed. */
function ToastSurface(): React.JSX.Element {
  const [queue] = useState(() => {
    const created = createToastQueue();
    created.enqueue({ duration: 0, title: "Anchor watch armed" });
    return created;
  });
  return <ToastRegion queue={queue} />;
}

/**
 * One render per bundle group that shows every string in it at once. Keyed by
 * the defaults type, so a group added to the bundle fails to compile here
 * until it has a surface. The unsupported-browser group has no entry, because
 * `renderSurface` renders the shell itself for it.
 */
const SURFACES: Readonly<
  Record<
    Exclude<keyof PanelLabelDefaults, "unsupportedBrowser">,
    () => React.JSX.Element
  >
> = {
  banner: () => (
    <Banner tone="info" onDismiss={() => undefined}>
      Depth sounder offline.
    </Banner>
  ),
  button: () => <Button loading>Save</Button>,
  codeBlock: () => <Code block>{"line one"}</Code>,
  dataGrid: () => (
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
  ),
  // The announcements go through the shell's regions, so this surface is
  // rendered inside a PanelShell.
  freshnessNote: FreshnessSurface,
  inlineConfirm: () => (
    <InlineConfirm
      open
      message="This cannot be undone."
      onCancel={() => undefined}
      onConfirm={() => undefined}
    />
  ),
  menuItem: () => (
    <Menu label="Crew" defaultOpen>
      <MenuItem id="remove" tone="danger">
        Remove
      </MenuItem>
    </Menu>
  ),
  panelError: () => (
    <>
      <PanelErrorBoundary>
        <Bomb />
      </PanelErrorBoundary>
      <PanelErrorBoundary onReload={() => undefined}>
        <Bomb />
      </PanelErrorBoundary>
    </>
  ),
  relativeAge: () => <RelativeAge ageMs={Number.NaN} />,
  saveActionBar: () => (
    <>
      {[
        { dirty: false },
        { dirty: true },
        { dirty: true, saving: true },
        { dirty: false, saveRequestedAt: Date.now() },
        { dirty: false, unconfigured: true },
      ].map((state) => (
        <SaveActionBar
          key={JSON.stringify(state)}
          sticky="bottom"
          onDiscard={() => undefined}
          onSave={() => undefined}
          {...state}
        />
      ))}
    </>
  ),
  secretInput: () => (
    <>
      <SecretInput aria-label="API key" />
      <SecretInput aria-label="Token" defaultRevealed />
    </>
  ),
  themeToggle: () => <ThemeToggle />,
  tone: () => (
    <>
      <StatusIndicator tone="info">Idle</StatusIndicator>
      <StatusIndicator tone="success">Connected</StatusIndicator>
      <StatusIndicator tone="warning">Stale</StatusIndicator>
      <StatusIndicator tone="danger">Offline</StatusIndicator>
    </>
  ),
  toastRegion: ToastSurface,
};

/** Renders one group's surface, with or without a bundle. */
function renderSurface(
  group: keyof PanelLabelDefaults,
  labels: PanelLabels | undefined,
): void {
  // The notice renders instead of the panel, so this surface is the shell on
  // an engine without native CSS scope, rendered without a PanelRoot.
  if (group === "unsupportedBrowser") {
    vi.stubGlobal("CSSScopeRule", undefined);
    render(
      <PanelShell labels={labels}>
        <p>Body</p>
      </PanelShell>,
    );
    return;
  }
  const Surface = SURFACES[group];
  if (group === "freshnessNote") {
    render(
      <PanelShell themeToggle="none" labels={labels}>
        <Surface />
      </PanelShell>,
    );
    return;
  }
  renderInPanel(<Surface />, labels === undefined ? {} : { labels });
}

/** Waits until every string of a defaults group is on the page. */
async function expectGroupShown(
  group: keyof PanelLabelDefaults,
): Promise<void> {
  for (const text of groupStrings(PANEL_LABEL_DEFAULTS[group])) {
    await waitFor(() => {
      expect(pageShows(text), text).toBe(true);
    });
  }
}

const GROUPS = Object.keys(
  PANEL_LABEL_DEFAULTS,
) as (keyof PanelLabelDefaults)[];

describe("PANEL_LABEL_DEFAULTS", () => {
  it("is frozen at every level", () => {
    expect(Object.isFrozen(PANEL_LABEL_DEFAULTS)).toBe(true);
    for (const group of GROUPS) {
      expect(Object.isFrozen(PANEL_LABEL_DEFAULTS[group])).toBe(true);
    }
    expect(Object.isFrozen(PANEL_LABEL_DEFAULTS.themeToggle.choiceLabels)).toBe(
      true,
    );
    // Numbers are formatted from each field's own bounds, so their messages
    // are sentences rather than fixed strings, and the table leaves them out.
    expect(PANEL_LABEL_DEFAULTS).not.toHaveProperty("numberField");
    // The reload description repeats the retry sentence as plain text, so the
    // two cannot drift apart.
    expect(
      PANEL_LABEL_DEFAULTS.panelError.reloadDescription.startsWith(
        `${PANEL_LABEL_DEFAULTS.panelError.description} `,
      ),
    ).toBe(true);
  });

  it.each(GROUPS)(
    "names what the %s surface renders with no bundle",
    async (group) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      renderSurface(group, undefined);

      // The table is what consumer tests import instead of retyping package
      // copy, so every entry has to be the string the component really shows.
      await expectGroupShown(group);
    },
  );

  it.each(GROUPS)(
    "keeps the %s defaults for blank bundle text",
    async (group) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      renderSurface(group, {
        [group]: blankGroup(PANEL_LABEL_DEFAULTS[group]),
      });

      // Blank text reads as absent at every step, so a partial translation
      // leaves the rest in English instead of blanking a name or a title.
      await expectGroupShown(group);
    },
  );
});

/** The bundle keys of the number field group, as the bundle type names them. */
type NumberFieldBundleKey = keyof Required<
  NonNullable<PanelLabels["numberField"]>
>;

/**
 * One draft per reason a number cannot be committed, with the English default
 * a whole number field from 1 to 60 shows for it. Keyed by the bundle type, so
 * a reason added to the bundle fails to compile here until it has a case.
 */
const NUMBER_FIELD_CASES: Readonly<
  Record<
    NumberFieldBundleKey,
    { readonly message: string; readonly raw: string }
  >
> = {
  aboveMax: { message: "Enter a whole number from 1 to 60.", raw: "99" },
  belowMin: { message: "Enter a whole number from 1 to 60.", raw: "0" },
  empty: { message: "Enter a whole number.", raw: "" },
  notAnInteger: { message: "Enter a whole number.", raw: "2.5" },
  notANumber: { message: "Enter a whole number, such as 12.", raw: "1e400" },
};

describe("numberField bundle", () => {
  // The defaults table leaves numberField out, because its messages are built
  // from each field's bounds, so the table tests above cannot reach it.
  it.each(Object.entries(NUMBER_FIELD_CASES))(
    "keeps the %s default for blank bundle text",
    async (reason, { message, raw }) => {
      const user = userEvent.setup();
      const blank = Object.fromEntries(
        Object.keys(NUMBER_FIELD_CASES).map((key) => [key, "   "]),
      );
      renderInPanel(
        <NumberField
          label="Refresh interval"
          integer
          min={1}
          max={60}
          defaultValue={10}
        />,
        { labels: { numberField: blank } },
      );

      const input = screen.getByRole("spinbutton", {
        name: "Refresh interval",
      });
      await user.clear(input);
      if (reason === "notANumber") {
        // jsdom empties a number input holding text that parses to no finite
        // number, where a browser keeps "1e400" as typed, so the one reason
        // it can never produce is fed to the field as the browser would.
        Object.defineProperty(input, "value", {
          configurable: true,
          get: () => raw,
          set: () => undefined,
        });
        fireEvent.input(input);
      } else if (raw !== "") {
        await user.type(input, raw);
      }
      await user.keyboard("{Enter}");
      expect(input).toHaveAccessibleDescription(`Error.${message}`);
    },
  );
});

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
  themeToggle: { choiceLabels: { light: "Licht" }, label: "Paneelthema" },
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
        <SURFACES.dataGrid />
        <SURFACES.inlineConfirm />
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
    await user.keyboard("{Enter}");

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
    const panelError = {
      description: "Opnieuw proberen opent dit paneel opnieuw.",
      reload: "Pagina herladen",
      reloadDescription: "Herladen verwerpt alle wijzigingen.",
      retry: "Opnieuw proberen",
      title: "Dit paneel werkt niet meer",
    };

    const { unmount } = render(
      <PanelShell title="Chart locker" labels={{ panelError }}>
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
    // The shell offers the reload, so the sentence written for it is shown.
    expect(
      screen.getByText("Herladen verwerpt alle wijzigingen."),
    ).toBeVisible();
    unmount();

    render(
      <PanelShell title="Chart locker" labels={{ panelError }} onReload={null}>
        <Bomb />
      </PanelShell>,
    );
    expect(
      screen.getByText("Opnieuw proberen opent dit paneel opnieuw."),
    ).toBeVisible();
    expect(
      screen.queryByText("Herladen verwerpt alle wijzigingen."),
    ).toBeNull();
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
});
