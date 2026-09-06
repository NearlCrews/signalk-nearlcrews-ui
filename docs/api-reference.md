# API reference

This reference summarizes the public `0.8.x` API. The TypeScript declarations shipped with the package are the canonical source for complete native HTML and React Aria prop types. This document focuses on package-specific props, defaults, entry points, ref targets, and user-visible strings.

## Entry points

| Import path                        | Public surface                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `signalk-nearlcrews-ui`            | Panel roots, layout, native form controls, feedback, theme APIs, browser compatibility, token metadata, and formatting utilities |
| `signalk-nearlcrews-ui/composites` | `Accordion`, `EmptyState`, and `Progress`                                                                                        |
| `signalk-nearlcrews-ui/data-grid`  | `DataGrid` and the React Aria collection exports `Column`, `Row`, and `Cell`                                                     |
| `signalk-nearlcrews-ui/forms`      | `RadioGroup`, `Radio`, `SecretInput`, and `Switch`                                                                               |
| `signalk-nearlcrews-ui/overlays`   | Dialogs, menus, popovers, toast queues, and toast regions                                                                        |
| `signalk-nearlcrews-ui/tokens.css` | Framework-neutral public tokens under the `snui-tokens` class; importing the sheet executes no JavaScript or React               |

Focused-entry-point APIs are not also exported from the package root. Consumers bundle each JavaScript entry point they import into their remote. Webpack consumers share only React and React DOM with the Signal K Admin host; Vite and other ESM consumers resolve the React entry points through the host-global shims instead.

The stylesheet entry point has no React import or execution requirement. Installing the package still resolves the package's declared dependencies and React peer dependencies; `tokens.css` is an entry point, not a separate dependency-free package.

## Package root

### Panel, structure, and actions

| Component            | Package-specific API                                                                                                                                                                                                 | Ref target       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `PanelRoot`          | `styleNonce`; `width` is `"standard"`, `"wide"`, or `"full"`, default `"full"`                                                                                                                                       | `HTMLDivElement` |
| `Section`            | Required `title`; `actions`; `description`; `headingLevel`, default `2`; `landmark`, default `true`                                                                                                                  | None             |
| `CollapsibleSection` | Required `title`; controlled or uncontrolled open state; `actions`; `disabled`; `headingLevel`; `mountStrategy` is `"lazy-retain"`, `"retain"`, or `"unmount"`, default `"retain"`; summary placement and visibility | None             |
| `ActionBar`          | Required `actions`; `status`; `statusRef`; `sticky` is `"top"`, `"bottom"`, or `"viewport-bottom"`                                                                                                                   | None             |
| `InlineConfirm`      | Required `message`, `onCancel`, and `onConfirm`; controlled or uncontrolled open state; labels and variants; `busy`; focus destination refs; heading and landmark options                                            | `HTMLElement`    |

`statusRef`, `initialFocusRef`, `returnFocusRef`, and `dismissFocusRef` are focus destinations. They are not aliases for a component's own `ref`. `ActionBar` makes its status destination programmatically focusable but does not move focus automatically; the consumer calls `statusRef.current?.focus()` after the initiating control disappears or becomes unavailable. A viewport-bottom bar scrolls a focused panel control clear when focus moves or a viewport resize docks the bar, preserving focus-ring clearance through nested scroll containers. It never scrolls while a pointer is pressed, so a press on a control the bar overlaps keeps its click, and a clearance skipped for that reason is not replayed afterward: a pointer user can see the control they pressed, and a later scroll would move content under a pointer that may still be there. Keyboard and programmatic focus clear immediately.

#### CollapsibleSection mountStrategy and effects

`mountStrategy` decides what happens to hidden content, and the two retaining values have consequences a consumer must design for.

- `"retain"`, the default, and `"lazy-retain"` keep hidden content mounted inside React `Activity`. State and `useRef` values survive a collapse, and so does uncontrolled DOM value state. Every effect and layout effect in that subtree runs its cleanup when the section collapses, refs detach, and all of them run again when it reopens.
- `"unmount"` removes hidden content. Effects unmount for real and state is discarded, so nothing survives a collapse.

The consequence that surprises consumers is that an effect with an empty dependency list is not a run-once effect under a retaining strategy. It runs once per expand, against state that survived from the previous expand. Guard genuinely one-time work with a `useRef` flag, which survives the collapse with the state it protects.

Two failure shapes follow from the same rule, both observed in consumer panels:

- A field that reports validity from an effect, and clears that report in the effect's cleanup, silently drops its invalid state when the section collapses. Re-running the effect on expand then reinitializes the field from props and discards an edit the user had in progress, because the edit survived but the effect treated the expand as a fresh mount.
- A request that starts in an effect and aborts in that effect's cleanup is aborted when the section collapses, so the completion path that would clear a busy flag never runs and a control stays `aria-busy` forever.

Keep each cleanup symmetric with its own setup: unsubscribe what the effect subscribed, and do not use a cleanup to mutate reported validity, busy state, or other state that must outlive the hidden period. Initialize from props only behind a ref guard. An effect-registered listener also observes nothing while the section is collapsed, so a subtree that must see events during that time, a form reset for example, belongs outside the collapsible or in a consumer-owned store. Choose `"unmount"` when a subtree cannot tolerate paused effects and its state is disposable, and keep a retaining strategy when the state must survive.

### Buttons and fields

| Component          | Package-specific API                                                                                                                                                                                                                                                                          | Ref target                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `Button`           | `variant` is `"primary"`, `"secondary"`, `"ghost"`, or `"danger"`; `size` is `"default"` or `"compact"`; `shape` is `"default"` or `"pill"`; `fullWidth`; `iconOnly`; `ariaDisabled`; `loading`; `loadingLabel`; anchor form through `as="a"` and required `href`                             | `HTMLButtonElement`, or `HTMLAnchorElement` when `as="a"` |
| `LabeledField`     | Required `label` and child control; `description`; `error`; `errorLive`; `required`; `disabled`; `name`; `optionalLabel`; `layout` is `"stacked"` or `"inline"`; `density` is `"default"` or `"compact"` (`"comfortable"` is a deprecated alias of `"default"`); render-prop control contract | `HTMLDivElement`                                          |
| `NumberField`      | Required `label`, `value`, and `onValueChange`; `min`; `max`; `exclusiveMin`; `exclusiveMax`; `integer`; `step`; `fallback`; `allowEmpty`; `unit`; `width`; `messages`; `onValidityChange`; `resetKey`; `inputProps`; `inputRef`; every `LabeledField` prop                                   | `HTMLDivElement`                                          |
| `FieldGroup`       | Required `legend`; `actions`; `description`; `error`; `errorLive`; native fieldset props                                                                                                                                                                                                      | `HTMLFieldSetElement`                                     |
| `TextInput`        | Native input props with supported text-like `type` values; `monospace`                                                                                                                                                                                                                        | `HTMLInputElement`                                        |
| `NumberInput`      | Native number-input props                                                                                                                                                                                                                                                                     | `HTMLInputElement`                                        |
| `RangeInput`       | Native range-input props and package-owned filled-track presentation                                                                                                                                                                                                                          | `HTMLInputElement`                                        |
| `Select`           | Native select props                                                                                                                                                                                                                                                                           | `HTMLSelectElement`                                       |
| `Textarea`         | Native textarea props; `monospace`; `minRows`                                                                                                                                                                                                                                                 | `HTMLTextAreaElement`                                     |
| `Checkbox`         | Required `label`; `labelVisibility` is `"visible"` or `"hidden"`; `description`; `error`; `errorLive`; `indeterminate`; native checkbox props                                                                                                                                                 | `HTMLInputElement`                                        |
| `SegmentedControl` | Required `label` and `options`; controlled or uncontrolled value; `name`; `disabled`; `orientation`; `labelVisibility`; `onValueChange`; `legend`, `legendVisibility`, and `onChange` remain as deprecated aliases                                                                            | `HTMLDivElement`                                          |

`TextInput` accepts `date`, `datetime-local`, `email`, `month`, `password`, `search`, `tel`, `text`, `time`, `url`, and `week`. `Textarea` keeps the HTML element's casing rather than `TextArea`. `monospace` renders a text control in the panel's monospace stack for keys, paths, and identifiers; `Textarea.minRows` sets the visible row floor in place of the default minimum height and, where the browser sizes fields from content, lets the control grow from that floor. `Button` makes empty, dangerous, and unknown anchor schemes inert while keeping `role="link"`, and logs one development warning per rejected `href`. HTTP, HTTPS, mail, telephone, fragment, query, and relative destinations remain active.

`Button.ariaDisabled`, when set, decides whether activation is blocked and a native `aria-disabled` attribute is ignored; when it is omitted the native attribute is read. A natively `disabled` button never also carries `aria-disabled`: the two are exclusive, and `disabled` wins.

An intrinsic `LabeledField` child must be a labelable `button`, non-hidden `input`, `meter`, `output`, `progress`, `select`, or `textarea`. Use the render-prop form for a composite control. Children must forward `id`, `required`, `disabled`, `name`, `aria-describedby`, `aria-errormessage`, and `aria-invalid`. `FieldControlProps` and `LabeledFieldControlProps` name this contract. The render-prop argument also carries `descriptionId` and `errorId`, which are lookups rather than attributes: pass it through `splitLabeledFieldControlProps(props)` to receive `{ controlProps, descriptionId, errorId }`, spread `controlProps` onto the control, and point secondary controls at the ids with `aria-describedby`.

`NumberField` keeps the text the user is typing in a draft and commits numbers. Without `fallback` it validates: an empty, unparsable, fractional (under `integer`), or out-of-range draft shows a message, sets `aria-invalid`, reports `onValidityChange(false)`, and commits nothing until the user fixes it; `exclusiveMin` and `exclusiveMax` make the bound itself invalid. With `fallback` it clamps: empty or unparsable input commits the fallback, fractions truncate, values snap to `step`, and out-of-range values clamp to the nearest bound, so every keystroke commits a number. `allowEmpty` widens `value` and `onValueChange` to admit `undefined` for a cleared field. Blur and Enter finish an edit (an invalid draft stays visible with its message), a wheel over the focused input blurs it so scrolling cannot spin the value, and the draft survives a retaining `CollapsibleSection` collapse. `onValidityChange` fires on transitions only and never from an unmount, so a consumer that stops rendering a field clears its own entry. `useNumberDraft(value, onValueChange, options)` exposes the same behavior for a bare `NumberInput`, and `resolveNumberDraft(raw, options)` is the pure resolution step.

Every control and group takes its accessible name from `label`: `Checkbox`, `Switch`, `Radio`, `RadioGroup`, `SegmentedControl`, `ThemeToggle`, and `NumberField` through `LabeledField`. `Switch` and `Radio` also accept children as the label. `FieldGroup` and `CheckboxGroup` take `legend` because they render a real `<legend>`; `SegmentedControl` and `ThemeToggle` render a `role="radiogroup"` div, so their former `legend` is a deprecated alias of `label`. `Checkbox.labelVisibility="hidden"` keeps the required label in the accessible name while removing it from the layout, for a select-all box in a table header or a toggle in a dense row.

Change handlers split along one rule. Native wrappers (`TextInput`, `NumberInput`, `RangeInput`, `Select`, `Textarea`, and `Checkbox`) take React change events through `onChange`. Composed controls report values with a callback named for the payload: `Switch.onCheckedChange(checked)`, `RadioGroup.onValueChange(value)`, `SegmentedControl.onValueChange(value)`, `ThemeToggle.onValueChange(theme)`, `CheckboxGroup.onValueChange(values)`, and `NumberField.onValueChange(value)`. The former `onChange` value callbacks on `Switch`, `RadioGroup`, `SegmentedControl`, and `ThemeToggle` still fire and are deprecated.

`SegmentedControl.options` must contain at least one option. Every option needs a non-empty label, and option values must be unique.

### Layout and feedback

| Component                  | Package-specific API                                                                                                                                                      | Ref target       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `Stack`                    | `as`; `align`; `gap` from 1 through 6                                                                                                                                     | None             |
| `Cluster`                  | `as`; `align`; `justify`; `gap` from 1 through 6                                                                                                                          | None             |
| `InputGroup`               | `density` is `"comfortable"` or `"compact"`                                                                                                                               | None             |
| `InputGroupControl`        | `width` is `"fixed"` or `"grow"`                                                                                                                                          | None             |
| `InputGroupAddon`          | Native span props                                                                                                                                                         | None             |
| `Card`                     | `as`; `density`; `header`; `footer`                                                                                                                                       | None             |
| `MetricGrid`               | `as` is `"div"`, `"ul"`, or `"ol"`                                                                                                                                        | None             |
| `Metric`                   | Required `label` and `value`; `detail`; `unit`; `tone`; `toneLabel`; `live`                                                                                               | None             |
| `Badge`                    | `tone`; `toneLabel`; native span props                                                                                                                                    | None             |
| `Banner`                   | `title`; `tone`; `toneLabel`; `live`; `actions`; `onDismiss`; `dismissLabel`; `dismissFocusRef`                                                                           | `HTMLDivElement` |
| `StatusIndicator`          | Required content; `tone`; `toneLabel`; `live`                                                                                                                             | None             |
| `ThemeToggle`              | `choices`; per-theme `labels`; `label`; `onValueChange`; every `SegmentedControl` prop except its options and value; `legend` and `onChange` remain as deprecated aliases | `HTMLDivElement` |
| `UnsupportedBrowserNotice` | Optional `title` and body overrides                                                                                                                                       | `HTMLElement`    |

In normal component use, `ThemeToggle` renders inside `PanelRoot`. An advanced integration may supply the exported `ThemeProvider` directly, but that provider does not install component styles or create an overlay portal root. `UnsupportedBrowserNotice` is intentionally standalone so a consumer can render it after a failed browser preflight without first mounting `PanelRoot`.

## Composites

| Component       | Package-specific API                                                                                                                                                                                                                     | Ref target            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `Accordion`     | `CollapsibleSection` children in a stable order; coordinates at most one open section                                                                                                                                                    | None                  |
| `CheckboxGroup` | Required `legend` and `options`; controlled or uncontrolled `value`; `onValueChange`; `name`; `layout` is `"grid"` or `"stack"`; `selectAllLabel`; `emptyWarning`; `description`; `error`; `errorLive`; `actions`; native fieldset props | `HTMLFieldSetElement` |
| `EmptyState`    | Required `title`; `description`; decorative `icon`; `action`                                                                                                                                                                             | `HTMLDivElement`      |
| `Progress`      | Required `label`; `min`; `max`; optional `value`; `valueText`; `tone`                                                                                                                                                                    | `HTMLDivElement`      |

The first `Accordion` child with `defaultOpen` wins. Keep child order static because coordinated state is positional. Omitting `Progress.value`, or passing a non-finite value such as the `NaN` a division by zero produces, creates an indeterminate indicator. `EmptyState.title` is a styled div, so the consumer owns the surrounding heading outline.

`CheckboxGroup` renders one `Checkbox` per option inside a `FieldGroup` and reports the selected values in option order. `name` goes onto every checkbox, so native form data lists the selection. `selectAllLabel` adds a tri-state select-all checkbox to the legend row that completes a partial selection and clears a full one while leaving disabled options alone. `emptyWarning` mounts a polite status region and fills it, with the warning tone shape and label, while nothing is selected; the fieldset is described by it only while it shows. Children render above the options for group-level controls.

## Data grid

`DataGrid` requires an accessible name, column children, `items`, and `renderRow`. Its package-specific options are `columns`, `density`, `emptyState`, `emptyTitle`, selection state, controlled sorting state, `virtualizeThreshold`, and `zebra`. Dynamic `columns` must be a readonly array so React can replay StrictMode and concurrent renders safely; replace the array when the column data changes. The default empty title is `"No data"`, the default virtualization threshold is 100 rows, and the ref always resolves to the stable outer `HTMLDivElement`.

`Column`, `Row`, `Cell`, `Key`, `Selection`, `SortDescriptor`, and their related public types come from React Aria Components. The first column becomes the row header when the consumer does not mark one explicitly. Give each row a stable `id` or `key`. Sorting remains consumer controlled: update `items` when `onSortChange` reports a new descriptor.

## Forms

| Component     | Package-specific API                                                                                                                                                                                     | Ref target         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `RadioGroup`  | Required `label` and children; controlled or uncontrolled value; `description`; `error`; `errorLive`; `disabled`; `name`; `orientation`; `onValueChange` (`onChange` deprecated)                         | `HTMLDivElement`   |
| `Radio`       | Required `value`; `label` or children; `disabled`                                                                                                                                                        | `HTMLDivElement`   |
| `SecretInput` | Text-input props; controlled or uncontrolled reveal state; `showLabel`; `hideLabel`; `trailingContent`; input-slot `width`; `monospace`; generated `id` and `aria-controls` from the toggle to the input | `HTMLInputElement` |
| `Switch`      | `label` or children; controlled or uncontrolled checked state; `disabled`; `form`; `name`; `readOnly`; `required`; `value`; `onCheckedChange` (`onChange` deprecated)                                    | `HTMLDivElement`   |

`SecretInput` owns reveal presentation only. The consumer owns the value, storage, authorization, and redaction policy. Because a revealed secret is an ordinary text field to the browser, it defaults `autoComplete="new-password"`, `spellCheck={false}`, `autoCapitalize="off"`, and `autoCorrect="off"`; each is a plain prop the caller can override. Inside a `LabeledField`, use the render-prop form for `SecretInput`: it renders an `InputGroup` root, which the element-child form does not accept.

## Overlays

All overlays render inside the nearest `PanelRoot`. `Dialog`, `AlertDialog`, `Menu`, and `Popover` share controlled or uncontrolled open-state props: `open`, `defaultOpen`, and `onOpenChange`.

| Component       | Package-specific API                                                                                                                                                     | Ref target       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `Dialog`        | Required `title`; `actions`; `description`; dialog ARIA labeling; `blurScrim`; `dismissable`, default `true`; `headingLevel`, default `2`; `width`, default `"standard"` | `HTMLElement`    |
| `AlertDialog`   | Dialog props; required `cancelLabel`; `cancelVariant`, default `"secondary"`; `onCancel`; supplemental `actions`; `dismissable`, default `false`                         | `HTMLElement`    |
| `Menu`          | Required trigger `label` and item children; `onAction`; `placement`; trigger size and variant                                                                            | None             |
| `MenuItem`      | Required `id` and content; `disabled`; `destructive`; `textValue`                                                                                                        | None             |
| `MenuSection`   | Item children; optional `title`                                                                                                                                          | None             |
| `MenuSeparator` | Optional `className`                                                                                                                                                     | None             |
| `Popover`       | Required `trigger` and content; `placement`, default `"bottom"`; `width`, default `"auto"`                                                                               | `HTMLDivElement` |
| `ToastRegion`   | Required `queue`; `label`; `dismissLabel`                                                                                                                                | `HTMLElement`    |

Use the library `Button` as a `Popover` trigger. A custom trigger must render a semantic interactive element, forward its ref to that element, and spread every injected event and ARIA prop onto it. A trigger that drops any part of that contract can break opening, focus return, keyboard use, or accessible naming.

`createToastQueue()` returns a queue with `enqueue`, `dismiss`, `clear`, `getSnapshot`, and `subscribe`. The exported `toast` queue covers the common single-region case. A queue holds at most five items. When full, it prefers to evict the oldest item that is neither focused nor a sticky warning or danger, with a bounded fallback that always leaves room for the newly enqueued item. Multiple regions in one panel share a panel-contained, viewport-aware host while retaining independent labels and queues. `ToastContent` requires `title` and accepts `description`, `tone`, `duration`, `live`, and `toneLabel`. Duration defaults to 5,000 milliseconds; zero creates a sticky toast. Announcements default to assertive for warning and danger, and polite otherwise.

## Public values and utilities

| Export                              | Contract                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `THEME_CHOICES`                     | `auto`, `system`, `light`, `dark`, and `night`                                     |
| `THEME_STORAGE_KEY`                 | `signalk-nearlcrews-ui.theme.v1`                                                   |
| `ThemeProvider`, `usePanelTheme`    | Theme context used by `PanelRoot` and advanced package integrations                |
| `PUBLIC_COLOR_TOKEN_NAMES`          | Public palette token names                                                         |
| `PUBLIC_FOUNDATION_TOKEN_NAMES`     | Public spacing, typography, sizing, motion, shadow, and layer token names          |
| `PUBLIC_TOKEN_NAMES`                | Combined public token names                                                        |
| `supportsNativeCssScope(window)`    | Returns whether the browser supports the required native CSS scope feature         |
| `UnsupportedBrowserError`           | Error thrown by unsupported `PanelRoot` installation; `feature` is `"CSS @scope"`  |
| `formatRelativeAge(ageMs, options)` | Formats a nonnegative elapsed age in milliseconds; default fallback is `"unknown"` |

Common public unions include `AnnouncementMode` (`"off" | "polite" | "assertive"`), `HeadingLevel` (1 through 6), `SemanticTone` (`"info" | "success" | "warning" | "danger"`), and `StatusTone` (the semantic tones plus `"neutral"`). `OverlayPlacement` accepts `"top"`, `"bottom"`, `"start"`, or `"end"`.

## Behavioral defaults

| Surface             | Defaults                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme and panel     | Unresolved theme `"auto"`; `PanelRoot.width` `"full"`; `ThemeToggle` shows all five theme choices                                                                                                                                                       |
| Buttons             | `variant="secondary"`; `size="default"`; `shape="default"`; native button `type="button"`; not loading, full width, or icon only                                                                                                                        |
| Sections            | Heading level 2; `Section.landmark` true; `CollapsibleSection` closed, enabled, retained, summary below the header, and collapsed-only summary visibility                                                                                               |
| Inline confirmation | Closed and not busy; heading level 2; landmark enabled; secondary cancel action; danger confirm action                                                                                                                                                  |
| Fields              | `LabeledField` stacked at default density; `TextInput.type` `"text"`; validation announcements `"off"`; `NumberField` validates (no `fallback`), rejects an empty draft (`allowEmpty` false), and sets `step` to `1` for integers and `"any"` otherwise |
| Layout              | `Stack` uses a stretching `div` with gap 4; `Cluster` uses a center-aligned, start-justified `div` with gap 2; input groups are comfortable; input-group controls grow; cards use default density                                                       |
| Selection controls  | `SegmentedControl` horizontal with a visually hidden label; `RadioGroup` vertical; `CheckboxGroup` grid layout with no select-all and no empty warning; controls start uncontrolled unless a value prop is supplied                                     |
| Feedback            | `Banner` tone `"info"`; `StatusIndicator`, `Metric`, and `Badge` tone `"neutral"`; persistent feedback does not become a live region unless `live` or a role requests it                                                                                |
| Progress            | Minimum 0 and maximum 100; omitting `value`, or passing a non-finite value, makes the indicator indeterminate                                                                                                                                           |
| Data grid           | Default density; no selection; no zebra striping; empty title `"No data"`; virtualization above 100 rows                                                                                                                                                |
| Form composites     | `SecretInput` concealed with a growing input slot and browser capture off; `Switch` starts uncontrolled unless a checked-state prop is supplied                                                                                                         |
| Overlays            | Closed initially; logical bottom placement for menus and popovers; popover width `"auto"`; standard, dismissible dialog; non-dismissible alert dialog with a secondary cancel action                                                                    |
| Toasts              | Tone `"info"`; 5,000-millisecond duration; assertive announcement for warning and danger, and polite otherwise; zero duration is sticky                                                                                                                 |
| Relative age        | Numeric output, narrow style, and fallback `"unknown"`                                                                                                                                                                                                  |

## Localization defaults

Every package-owned user-visible string can be replaced by a prop or option.

| Surface               | Default                                                                                                                                                                                                                                                                    | Override                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Loading button state  | `Working`                                                                                                                                                                                                                                                                  | `Button.loadingLabel`                                                             |
| Banner dismissal      | `Dismiss`                                                                                                                                                                                                                                                                  | `Banner.dismissLabel`                                                             |
| Tone names            | `Information`, `Success`, `Warning`, and `Error`                                                                                                                                                                                                                           | `toneLabel` on `Banner`, `Badge`, `Metric`, `StatusIndicator`, and `ToastContent` |
| Inline confirmation   | `Cancel`, `Confirm`, and `Confirm action`                                                                                                                                                                                                                                  | `cancelLabel`, `confirmLabel`, and `fallbackTitle`                                |
| Secret visibility     | `Show` and `Hide`                                                                                                                                                                                                                                                          | `SecretInput.showLabel` and `hideLabel`                                           |
| Theme selector        | `Panel theme`                                                                                                                                                                                                                                                              | `ThemeToggle.label`                                                               |
| Number field messages | `Enter a number.`, `Enter a whole number.`, `Enter a number from {min} to {max}.`, `Enter a number of at least {min}.`, `Enter a number of at most {max}.`, `Enter a number greater than {min}.`, and `Enter a number less than {max}.` (`a whole number` under `integer`) | `NumberField.messages`, keyed by `NumberDraftInvalidReason`                       |
| Theme choices         | `Auto`, `System`, `Light`, `Dark`, and `Night`                                                                                                                                                                                                                             | `ThemeToggle.labels`                                                              |
| Empty data grid       | `No data`                                                                                                                                                                                                                                                                  | `DataGrid.emptyTitle` or `emptyState`                                             |
| Toast region          | `Notifications` and `Dismiss`                                                                                                                                                                                                                                              | `ToastRegion.label` and `dismissLabel`                                            |
| Unsupported browser   | `Browser update required` and the compatibility explanation                                                                                                                                                                                                                | `UnsupportedBrowserNotice.title` and children                                     |
| Relative age fallback | `unknown`                                                                                                                                                                                                                                                                  | `formatRelativeAge` option `fallback`                                             |

`AlertDialog.cancelLabel` has no default and must be supplied by the consumer.

## CSS contract

The [design contract](design-contract.md) lists every public token and records theme resolution, native CSS scope isolation, overlay layering, accessibility behavior, and the framework-neutral token-sheet exception. Internal classes and DOM nesting are not public API.
