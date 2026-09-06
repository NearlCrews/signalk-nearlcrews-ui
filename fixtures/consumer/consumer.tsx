/**
 * Compiled against the packed tarball, not against src, so the emitted
 * declarations are what gets type checked. No path mapping applies here.
 *
 * The cases below are the shapes real consumer panels import: runtime
 * components with refs and native attributes, the public types they annotate
 * with, the render-prop field contract, generic inference on SegmentedControl,
 * and the formatting utility with a typed options constant.
 */
import { createRef, useRef, useState } from "react";
import {
  Banner,
  Button,
  Checkbox,
  Code,
  type Density,
  type FieldControlProps,
  type FieldErrorLive,
  FieldGroup,
  type FormatRelativeAgeOptions,
  formatRelativeAge,
  type HeadingLevel,
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
  isThemeChoice,
  LabeledField,
  type LabeledFieldControlProps,
  LiveRegion,
  NumberField,
  NumberInput,
  type Orientation,
  PACKAGE_VERSION,
  PanelRoot,
  PanelShell,
  RangeInput,
  RelativeAge,
  SegmentedControl,
  Select,
  type SemanticTone,
  type StatusTone,
  Text,
  Textarea,
  TextInput,
  type ThemeChoice,
  VisuallyHidden,
} from "signalk-nearlcrews-ui";
import {
  EmptyState,
  Progress,
  SaveActionBar,
  Tab,
  TabList,
  Table,
  TabPanel,
  Tabs,
} from "signalk-nearlcrews-ui/composites";
import { Cell, Column, DataGrid, Row } from "signalk-nearlcrews-ui/data-grid";
import { SecretInput, Switch } from "signalk-nearlcrews-ui/forms";
import {
  createToastQueue,
  Dialog,
  type OverlayOpenState,
  Popover,
  ToastRegion,
} from "signalk-nearlcrews-ui/overlays";

const queue = createToastQueue();

export function ObjectRefs(): React.JSX.Element {
  const buttonRef = createRef<HTMLButtonElement>();
  const bannerRef = createRef<HTMLDivElement>();
  const fieldsetRef = createRef<HTMLFieldSetElement>();
  const inputRef = createRef<HTMLInputElement>();
  const selectRef = createRef<HTMLSelectElement>();
  const textareaRef = createRef<HTMLTextAreaElement>();
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <PanelRoot ref={rootRef}>
      <Button ref={buttonRef}>Save</Button>
      <Banner ref={bannerRef}>Provider unavailable</Banner>
      <FieldGroup ref={fieldsetRef} legend="Connection" />
      <TextInput ref={inputRef} aria-label="Host" />
      <NumberInput ref={inputRef} aria-label="Port" />
      <RangeInput ref={inputRef} aria-label="Depth" />
      <Select ref={selectRef} aria-label="Source" />
      <Textarea ref={textareaRef} aria-label="Notes" />
      <Checkbox ref={inputRef} label="Enable provider" />
    </PanelRoot>
  );
}

export function CallbackRefs(): React.JSX.Element {
  return (
    <PanelRoot ref={(node) => node?.focus()}>
      <Button ref={(node) => node?.focus()}>Save</Button>
      {/*
        React 19 callback-ref cleanup must type check through the emitted
        declarations. The parameter stays nullable because that is the shape
        RefCallback declares, even though React only passes a node when the
        callback returns a cleanup.
      */}
      <TextInput
        aria-label="Host"
        ref={(node) => {
          node?.setAttribute("data-attached", "true");
          return () => node?.removeAttribute("data-attached");
        }}
      />
    </PanelRoot>
  );
}

/** Optional props must accept a computed undefined under exactOptionalPropertyTypes. */
export function ComputedOptionalProps({
  label,
  nonce,
}: {
  readonly label: string | undefined;
  readonly nonce: string | undefined;
}): React.JSX.Element {
  return (
    <PanelRoot styleNonce={nonce}>
      <Button loadingLabel={label} loading>
        Save
      </Button>
    </PanelRoot>
  );
}

/** Native attributes must still pass through the public prop contracts. */
export function NativeAttributes(): React.JSX.Element {
  return (
    <PanelRoot id="panel" lang="en">
      <Button type="submit" form="settings" name="action" value="save">
        Save
      </Button>
      <TextInput autoComplete="off" maxLength={64} placeholder="host" />
    </PanelRoot>
  );
}

/** Every public subpath must compile from the packed artifact. */
export function FocusedEntryPoints(): React.JSX.Element {
  const gridRef = createRef<HTMLDivElement>();
  return (
    <PanelRoot>
      <Progress label="Loading" value={50} />
      <EmptyState title="No providers" />
      <SecretInput aria-label="Token" />
      <Switch name="enabled">Enabled</Switch>
      <DataGrid
        ref={gridRef}
        aria-label="Providers"
        items={[{ id: "alpha", name: "Alpha" }]}
        renderRow={(item) => (
          <Row>
            <Cell>{item.name}</Cell>
          </Row>
        )}
      >
        <Column id="name">Name</Column>
      </DataGrid>
      <Popover trigger={<Button>Details</Button>}>Provider details</Popover>
      <Dialog open={false} title="Provider">
        Provider details
      </Dialog>
      <ToastRegion queue={queue} />
    </PanelRoot>
  );
}

/**
 * The public types consumers annotate with must resolve from the packed
 * declarations, from the entry each one is documented on.
 */
export const statusTones: readonly StatusTone[] = [
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
];
export const semanticTone: SemanticTone = "warning";
export const errorLive: FieldErrorLive = "polite";
export const savedTheme: ThemeChoice = "night";
export const sectionLevel: HeadingLevel = 3;
export const closedState: OverlayOpenState = { defaultOpen: false };
export const density: Density = "compact";
export const orientation: Orientation = "vertical";
export const bundledVersion: string = PACKAGE_VERSION;
export const restoredTheme: ThemeChoice | undefined = isThemeChoice("dark")
  ? "dark"
  : undefined;

/** A typed options constant is how every consumer calls the formatter. */
const RELATIVE_AGE_OPTIONS: FormatRelativeAgeOptions = {
  fallback: "n/a",
  numeric: "auto",
  style: "long",
};
export const relativeAge: string = formatRelativeAge(
  90_000,
  RELATIVE_AGE_OPTIONS,
);

/** A custom control implements the documented field contract. */
function DepthControl(props: FieldControlProps): React.JSX.Element {
  return <input type="number" step={0.1} {...props} />;
}

/** The render-prop form hands the field's ids to a composite control. */
export function RenderPropField(): React.JSX.Element {
  return (
    <PanelRoot>
      <LabeledField label="Depth" description="Meters below the transducer">
        {(controlProps: LabeledFieldControlProps) => (
          <InputGroup density="compact">
            <InputGroupControl width="grow">
              <DepthControl {...controlProps} />
            </InputGroupControl>
            <InputGroupControl width="fixed">
              <NumberInput
                aria-label="Depth exact value"
                aria-describedby={controlProps.descriptionId}
              />
              <InputGroupAddon>m</InputGroupAddon>
            </InputGroupControl>
          </InputGroup>
        )}
      </LabeledField>
    </PanelRoot>
  );
}

const UNIT_OPTIONS = [
  { label: "Meters", value: "m" },
  { label: "Feet", value: "ft" },
] as const;
type Unit = (typeof UNIT_OPTIONS)[number]["value"];

/** `as const` options must narrow the value the change handler receives. */
export function UnitControl({
  onUnit,
}: {
  readonly onUnit: (unit: Unit) => void;
}): React.JSX.Element {
  return (
    <PanelRoot>
      <SegmentedControl
        legend="Units"
        options={UNIT_OPTIONS}
        onChange={(value) => {
          const unit: Unit = value;
          onUnit(unit);
        }}
      />
    </PanelRoot>
  );
}

/**
 * Exports new in 0.9.0. Each is imported from the entry it is documented on
 * and rendered with its minimal props, so a dropped re-export or a changed
 * required prop fails this compile rather than a consumer build.
 */
export function NewIn090(): React.JSX.Element {
  const [port, setPort] = useState(3000);
  return (
    <PanelShell title="Provider">
      <VisuallyHidden>Provider settings</VisuallyHidden>
      <Text tone="muted" size="sm">
        Last update <RelativeAge ageMs={90_000} />
      </Text>
      <Code>signalk-nearlcrews-ui</Code>
      <LiveRegion message="Saved" live="polite" />
      <NumberField
        label="Port"
        min={1}
        max={65_535}
        integer
        value={port}
        onValueChange={setPort}
      />
      <Tabs defaultValue="connection">
        <TabList aria-label="Provider sections">
          <Tab value="connection">Connection</Tab>
          <Tab value="advanced">Advanced</Tab>
        </TabList>
        <TabPanel value="connection">Connection settings</TabPanel>
        <TabPanel value="advanced">Advanced settings</TabPanel>
      </Tabs>
      <Table aria-label="Recent readings">
        <thead>
          <tr>
            <th scope="col">Path</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>environment.depth.belowTransducer</td>
            <td>12.4</td>
          </tr>
        </tbody>
      </Table>
      <SaveActionBar
        dirty={false}
        onSave={() => undefined}
        onDiscard={() => undefined}
      />
    </PanelShell>
  );
}
