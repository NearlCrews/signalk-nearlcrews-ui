# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Six props are renamed or removed, several defaults and announcement semantics change, the shipped style text is compacted, and the Night theme, section surfaces, tone glyphs, and borders are repainted. `snui-check-consumer` checks the Signal K host loading contract in its default run, and a new `signalk-nearlcrews-ui/host-harness` entry stands in for the Admin loader in consumer browser tests. `docs/migration.md` records the required work under "Unreleased".

### Breaking

- `LiveRegion.announceOnMount` is renamed `deferFirstMessage`, and the meaning now matches the name. The default, `false`, renders a message present at mount at once, which is what the old default `true` did; `true` holds that first message for one beat so a region mounting together with its subject is announced. Replace `announceOnMount={false}` with `deferFirstMessage`, and delete `announceOnMount={true}`.
- `ThemeToggle.labels`, the per-choice names, is renamed `choiceLabels`, and the bundle key `themeToggle.choices` is renamed `themeToggle.choiceLabels` to match. `choices` keeps meaning the set of themes offered, so a translation copied between the prop and the bundle can no longer be read as a restricted theme list.
- `Card.labelledBy` is removed. The native `aria-labelledby` and `aria-label` now name a card, the spelling every other component takes, and a named div card takes the group role; a card rendered as `nav` or `section` keeps its landmark, which the name completes; `label` stays. A blank native name is dropped rather than rendered.
- `PanelShell.errorLabels` and its type `PanelShellErrorLabels` are removed: the default error fallback reads `labels.panelError`, whose keys are `title`, `description`, `reloadDescription`, `retry`, and `reload`. `PanelShell.unsupportedLabels` and `PanelShellUnsupportedLabels` are removed as well: the compatibility notice reads the new `labels.unsupportedBrowser` group, `title` and `description`, from the shell's own `labels`. `InlineConfirm.fallbackTitle` is removed in favor of `labels.inlineConfirm.fallbackTitle`. Each string now has one route, keyed one way.
- `PopoverWidth` no longer admits a number, and a number is no longer converted to pixels at runtime. Write the unit: `width="240px"`.
- `PanelErrorBoundary` explains only the actions it shows. `description` appears when the fallback offers Try again alone, and the new `reloadDescription` when it also offers the page reload, which `PanelShell` does by default. The bundle's `panelError` group splits the same way, so a panel that translated `description` for a `PanelShell` now translates `reloadDescription` too.
- `SaveActionBar` moves focus once, after `onSave` or `onDiscard` has run, rather than to the status before the handler. Both are typed `SaveActionBarAction`, and every existing handler, async ones included, still compiles. A handler that moves focus itself keeps that destination, and one that expected the status to hold focus inside `onSave` now finds the pressed button there.
- Toast cards are no longer live regions. The toast host mounts one polite and one assertive region when the first `ToastRegion` mounts, before any toast arrives, and speaks each toast once through them as one line, tone name first ("Information. Waypoints synced. 12 sent."), in arrival order. A test that found a toast through `getByRole("status")` or `getByRole("alert")` now finds the host region, and a text match on a toast title also matches that line.
- An announcing `Banner`, `StatusIndicator`, or `Metric` in polite mode that mounts with content holds that content for 100 milliseconds, so its region exists empty first and the message is announced. Assertive regions are not held unless asked, and a `Banner` keeps its actions on screen during the hold. Pass `deferFirstMessage={false}` where the content at mount is not news; a test that asserts the text synchronously after mount passes it too, or advances the clock.
- An embedded `CollapsibleSection`, and a `Section` or `CollapsibleSection` nested inside another package region, default `landmark` to `false`, so a region per row no longer crowds the landmark list. An explicit `landmark` still decides. A test that found such a section with `getByRole("region", { name })` passes `landmark` or queries the heading.
- An unnamed `Code` block and `Code as="pre"` are each a focusable `group` named "Code" rather than a `region` landmark. A consumer `aria-label` or `aria-labelledby` makes it a region with that name, and the default name comes from the new `codeBlock.label` bundle key.
- `InlineConfirm` heads its title one level below the `Section` or `CollapsibleSection` that contains it, or below the title of the `Dialog` or `AlertDialog` it sits in, and elsewhere at the level a section there would take, instead of always at level 2. A confirmation inside a dialog with the default title level therefore heads at level 3. A `Section` or `CollapsibleSection` inside a `Dialog` or `AlertDialog` heads one level below the dialog's title (level 3 under the default title), where it took the shell's level, which in a panel with no title put it beside the dialog's title. The error fallback of a `PanelErrorBoundary` placed inside a section, or inside a dialog, follows the `InlineConfirm` rule.
- `SegmentedControl readOnly` sets `aria-readonly` on the group instead of `aria-disabled` on every option, so a fixed value reads as read only rather than as options that are unavailable. The options still refuse the change and keep their tab stops.
- `NumberField` shows its message and sets `aria-invalid` once an edit finishes, on blur or Enter, rather than on every keystroke, and clears both on the keystroke that makes the draft valid. `onValidityChange` still reports every crossing as it happens. `NumberDraft.invalidReason` follows the same timing, and the new `NumberDraft.valid` reports the state per keystroke.
- `useFieldValidity` releases a field hidden in a retaining `CollapsibleSection` and restores its invalid state when the section opens again. An invalid field out of sight no longer blocks Save, and blocks it again beside its visible error once revealed.
- `resolveFreshness` follows the clock skew rule of `formatRelativeAge`. A sample up to 60 seconds in the future reads as age zero; one further ahead reports no age and, when a threshold is set, `stale: true`, instead of reading fresh until the browser clock caught up with the server's.
- `usePollFreshness` flips `stale` the moment the threshold passes rather than on the next tick of the shared clock, and measures a new sample against the clock as it arrives. `tickMs: 0` stops the clock between samples: the age and the flag are measured when a sample arrives and not again until the next one.
- Default strings changed. The save bar's clean status reads "Nothing to save" (was "All changes saved"), which stays true whatever the server did with the last request. The theme selector's guidance reads "Match Admin uses the Signal K Admin theme when Admin shares one, and Light until then." The panel error description begins "Try again reopens this panel without reloading the page." Bound messages read "Enter 5 or more." and "Enter 9 or less." (was "Enter a number of 5 or more."). The notice for a host React below the floor is headed "Signal K update required" rather than "Browser update required". A test can read the English defaults from `PANEL_LABEL_DEFAULTS` instead of retyping them.
- `FieldGroup` and `CheckboxGroup` throw "FieldGroup requires a non-empty label or legend." and "CheckboxGroup requires a non-empty label or legend." after the package prefix below, naming both props and the component the consumer rendered.
- Every error the package throws now starts with `signalk-nearlcrews-ui:` and a space, so an error that escapes a panel and reaches Signal K Admin's error boundary, which shows only the message under a React 19 hint, names this package and the call that failed. Development warnings are unchanged. A test that compares `error.message` for equality, or matches a regular expression anchored with `^`, adds that prefix; `toThrow("...")` with a string still matches, because a string matches a substring.
- The `DataGrid` columns error names what it received and the fix: "DataGrid columns must be an array; received a Set. Pass a readonly array and replace it when the columns change." It used to blame mutability, which the check cannot see.
- Four messages that already named the package are reworded around the prefix: `Panel styles for version 0.13.0 are not installed in this document; render inside PanelRoot.`, `Styles need a document with a <head> element.`, `Conflicting styles were loaded for version 0.13.0, module "dialog".`, and the `UnsupportedBrowserError` message, `signalk-nearlcrews-ui: A browser with native CSS @scope support is required.`, whose name and `feature` are unchanged. The rejections of the host harness's `loadPanelRemote` carry the prefix too, while `HostPanelFrame` still renders the Admin's own error text unprefixed, since it mirrors the Admin.
- The viewport anchor around a docking `ActionBar` no longer carries `data-snui-docked`; the hook is on the bar element alone, so `[data-snui-docked]` names one element. A test that read it from the bar's parent reads the bar's own.
- A field error's message sits in an element of its own inside the error region, beside the danger mark, so `getByText` on the message returns that element rather than the region. A test that asserted the region's role, id, or class on that match looks the region up instead.
- `snui-check-consumer` fails more builds in its default run. It rejects this package in `dependencies`, `optionalDependencies`, or a `peerDependencies` entry that `peerDependenciesMeta` does not mark optional, unless `--runtime-dependency` is passed, and then it holds every field that declares the package to the same exact version. It also rejects a package without the `signalk-plugin-configurator` keyword, a `--remote` that is not `public/remoteEntry.js` under `--root`, an entry without Webpack's container runtime, an entry whose module map lacks `./PluginConfigurationPanel`, a `"type": "module"` package whose entry does not export `get` and `init`, a classic entry that leaves no container with `get` and `init` on the global the Admin reads, the library's version stamp inside the entry, the host harness in any script, and an unknown, renamed, or misspelled `--snui-*` name or container name in any CSS asset. Under `--runtime` it renders the panel with `configuration` undefined and then `{}` before any `--props` render, and `--props` is the object as given rather than merged over `{ configuration: null }`.

### Added

- `signalk-nearlcrews-ui/host-harness`, browser test tooling that loads a built panel remote the way Signal K Admin does: `createHostShareScope` builds the Admin's fallback share scope, `loadPanelRemote` routes on the script type the server writes, and `HostPanelFrame` renders the panel inside the Admin's Suspense and error boundary with `configuration` state seeded from its prop and replaced after a save. It mirrors signalk-server 2.33.0, ships as its own entry so it never reaches a panel bundle, and exports `HOST_HARNESS_MARKER`.
- `FreshnessNote`, one line saying how old a polled status is: muted "Checked 2 minutes ago" while current, and "Out of date: updated 6 minutes ago" with the warning mark once stale, with words of their own for a sample stamped ahead of the browser clock, whose age is unknown. The consumer keeps the threshold. The note is not a live region, and announces only the turn to stale and the recovery, once each, through the panel announcer.
- `useResetDrafts()`, called from a Discard handler, drops every in-progress number draft in the panel, including an invalid one that never committed and one inside a collapsed section, and reports a field that was invalid as valid again. `PanelRoot` and `PanelShell` publish it.
- `PANEL_LABEL_DEFAULTS`, the package's English defaults in the shape of the label bundle, frozen, with its type `PanelLabelDefaults`, so a consumer control or test reads the words the package renders.
- `SaveActionBar.outcome` takes a `SaveActionBarOutcome`, a message and a tone the panel computed from the server's answer, and shows it in the bar's own status. A danger outcome keeps Save available for a retry and stays through later edits. `resolveSaveActionBarState` accepts it too.
- `onSave` and `onDiscard` may return an element or a ref, a `SaveActionBarFocusTarget`, and the bar sends focus there instead of to its status. `FieldValidity.firstInvalid()` returns the control of the first invalid field on screen, in document order, or null when there is none to focus, for exactly that.
- `NumberField.messages` accepts a function of a `NumberFieldMessageContext` (the reason, the bounds, `integer`, and the field's `unit`), and message text from the prop or from the `numberField` bundle fills `{min}` and `{max}` with the field's bounds. New types `NumberFieldMessage` and `NumberFieldMessageContext`.
- A unit may be a `NamedUnit`, `{ symbol, name }`, on `NumberField.unit`, `Metric.unit`, and the new `RangeInput.unit`. The symbol is drawn and the name is read, so "kn" is heard as "knots", and a slider reads "12 knots" as its value text. New types `NamedUnit` and `UnitContent`.
- `Button.disabledReasonVisibility="visible"` draws the blocked reason as a muted line under the button as well as reading it. `Checkbox` takes `disabledReason` and `disabledReasonVisibility`, `CheckboxGroupOption` takes `disabledReason`, and `CheckboxGroup` takes `disabledReasonVisibility` and `selectAllDisabledReason`. New types `ButtonReasonVisibility` and `CheckboxReasonVisibility`.
- `SegmentedControlOption.ariaDisabled` blocks one option while it keeps its tab stop, with `disabledReason` read as that option's description, and `SegmentedControlOption.dataAttributes` puts `data-*` attributes on that option's radio.
- `Switch` takes `description`, `error`, and `errorLive`, like every other choice control.
- `Section.leading`, content before the heading on the title line, as `CollapsibleSection` already had.
- `Stack divided` draws a rule between its items with the gap split evenly around it; hidden and visually hidden items draw none.
- `Banner`, `StatusIndicator`, and `Metric` take `deferFirstMessage`, and `LiveRegion`, `StatusIndicator`, and `Metric` take `settleMs`, which speaks a changed message only once it has stayed the same that long, so a match count that follows every keystroke is announced once. The visible text still changes at once.
- `Menu.triggerProps` takes the trigger button's own props, `iconOnly`, `ariaDisabled` with `disabledReason`, `className`, a `ref`, and `data-*` among them, typed `MenuTriggerProps`. A blocked or loading trigger stays focusable and opens nothing.
- `PanelErrorBoundary.reloadDescription`, and the bundle groups `unsupportedBrowser`, `codeBlock`, `freshnessNote`, and `panelError.reloadDescription`.
- `formatCount` takes `{ locale }` and groups its digits for that locale ("1,234 charts"), with the new `FormatCountOptions` type. `/format` exports `PanelLocale`.
- Public tokens `--snui-color-border-subtle`, for container outlines and dividers, `--snui-color-neutral-subtle`, a quiet non-interactive tint that reads apart from both surfaces and from every hover fill, and `--snui-focus-ring-width`, the width of every focus ring, 2 pixels and 3 under `prefers-contrast: more`, which component rings, the date and time picker ring, and the generic keyboard ring all read, a forced-colors danger button's ring one pixel wider than the rest.
- Test hooks: the action bar element carries `data-snui-sticky` with its mode and `data-snui-docked` while docked, and each theme choice radio carries `data-snui-theme-choice` with its choice.
- `snui-check-consumer` takes `--stats <path>`, which reads Webpack's JSON stats and asserts a clean build, the production JSX runtime alone from React, nothing from React DOM or the scheduler, exactly one copy of this package, and at most one copy each of the React Aria packages; `--styles <dir>`, which fails a single-class CSS module rule that lands on a package component, because a scoped package rule outranks it; and `--runtime-dependency`. `--container` now works without `--runtime`, and is refused for a `"type": "module"` package, whose container comes from the module's exports; `--runtime` renders module remotes in a worker thread instead of refusing them, and every pass reports the remote entry's own gzip size.
- Development warnings, each once and never in production: a `Button` or `Checkbox` blocked with `ariaDisabled` and neither `disabledReason` nor `aria-describedby`, a `disabledReason` beside native `disabled`, a select-all box or a `SegmentedControl` option blocked with no reason, a `Button` whose `aria-label` does not contain its visible text, a `Dialog` whose only way out is Escape, an announcement from `usePanelAnnouncer`, `FreshnessNote`, or the `PanelErrorBoundary` fallback with no `PanelShell` to speak it, and `useResetDrafts` with no panel above it. The existing warning for a `Dialog` with no way out now names the dialog.

### Changed

- The shipped style text drops its authoring whitespace and comments at build time, which alone takes about 14 KB gzip off the root entry and off the consumer-shaped panel, and more than pays for this release's additions: the consumer-shaped panel the size table measures is about 1.6 KB smaller than on 0.12.0 (about 4 percent), and the root entry about 0.6 KB smaller. The entry point size table in `docs/api-reference.md` carries the exact figures. The rules are unchanged. The one visible text difference is `getPropertyValue` for the multi-line `--snui-focus-ring` and `--snui-sticky-clearance`, which now returns single-spaced text.
- `Section` and `CollapsibleSection` share one surface: the large radius, the raised shadow, one content inset (`--snui-space-4`, `--snui-space-3` in a narrow panel, and `--snui-space-2` for a compact `Section`), and a bold title. A `CollapsibleSection` gains the radius, the shadow, and the wider inset, and a `Section` title goes from semibold to bold. An `InlineConfirm` title keeps a line height of 1.3 at whatever level it derives, and `CollapsibleSection` header actions end at the shared inset, in line with the content below. `ActionBar` pads its status and actions by the same inline inset, `--snui-space-4` on a wide panel and `--snui-space-3` on a narrow one, where it padded `--snui-space-3` everywhere, so a save bar's content lines up with the section content above it; its block padding, height, and docking clearance are unchanged.
- Section titles are sized by depth below the shell's own title, or a dialog's title inside a dialog, rather than by heading level: the first level takes the large step and deeper levels the body size, so the sections under a titled `PanelShell` no longer drop to the size of a field label.
- Tone glyphs take a shape per tone, the info, warning, and danger shapes the status dots use: info in a rounded square, warning in a triangle, and danger in a hexagon. Success is a heavy check with no enclosure, where the success dot stays a diamond. The mark is knocked out of the filled shape, the box grows from 1em to 1.125em, and the shapes survive forced colors. The success check spans the same box the other shapes fill, with a stroke about a quarter of that box, so it matches their weight in banners, badges, metrics, and status rows. Every tone-badged component shows them.
- Container outlines and dividers take `--snui-color-border-subtle`: cards, field groups, sections, banners, the action bar, metric tiles, card header and footer rules, table and data grid row separators, menu section dividers, tab list rules, and `hr`. Every edge that is the only visible edge of something focusable or interactive keeps `--snui-color-border`, including inputs, selects, checkboxes, switches, secondary buttons, the segmented control track, the data grid container, the code block, dialogs, menus, popovers, and toasts.
- Night paints the browser's own chrome inside the panel from its tokens: scrollbars, text selection, native option lists on Windows and Linux, autofilled fields, the number spinner and search clear buttons, the date and time picker icons and the picker's keyboard focus ring, the segment being edited in a date or time field, which takes the selection pair instead of the browser's pale blue, every date and time segment in the field's own color, so a segment the browser's own sheet greys out as fixed reads in it too, and the textarea resize grip, mirrored in a right-to-left field, all repainted rather than hidden. Chromium before 121 keeps its native scrollbar, and macOS, iOS, and Android option pickers ignore author colors. The spinner, the clear button, the picker, the date and time segments, and the grip are the browser's own parts, repainted through the `-webkit-` pseudo-elements Chromium reads, some of which WebKit shares: Firefox draws its own number spinner, date and time controls, and resize grip from its dark scheme and keeps them, and the popup a date or time picker opens is drawn by the browser and ignores author colors in every engine.
- A `FieldGroup` legend sits inside the group's border on the row it shares with the group's actions and the select-all box, and the border runs unbroken. On a narrow panel the actions still move below it. This holds in Chromium and Firefox; WebKit computes float to none on grid items, so there the legend stays in the fieldset border as before.
- Text inputs and selects stand at the control height, 40 pixels on a fine pointer and 44 on a coarse one, level with the buttons beside them, instead of 6 pixels taller on a touch screen. `Textarea` keeps its text inset.
- The panel announcer gives every message its own node, so two messages from one handler are both read and a repeat of the same words is announced again. Each message leaves after 7 seconds, a blank message is ignored rather than clearing the region, and a message sent in the regions' first 100 milliseconds waits for them to exist. Only the message just added is read: the regions are not atomic, so a message arriving within 7 seconds of an earlier one does not repeat it.
- `SaveActionBar` keeps Discard available while `invalidMessage` blocks a save with nothing else to discard, so a stale validation error can be discarded rather than only retyped.
- A keyboard-focused cell in a virtualized `DataGrid` shows its whole value, wrapping onto several lines while it holds focus.
- The `Column.wrap` documentation recommends `wrap` for text columns such as a Signal K path or a source name, because touch reaches neither the truncation title nor the focused-cell reveal.
- Repository checks: the declarations gate compares the public type surface, each entry's exports and every declaration they reach, rather than whole declaration files, keeping the `@deprecated` and `@default` tags and failing an unimportable export that lacks `@internal`; entry point budgets carry forward from release to release and rise only by hand; the size table gains a tree-shaken consumer-shaped panel row; the localization table and the documentation examples are generated or compiled and rendered against the package; showcase pixel baselines, axe in every theme, text spacing, live region exposure, and increased contrast join the browser suite; the mobile baseline is captured under the coarse pointer it claims; `npm run host-contract:loader` and `npm run tools:outdated` watch the Admin loader source and the pinned workflow tools weekly; `npm run baselines:fetch` files a refresh run's images; and the zizmor pin moves to 1.30.1.
- `formatCount` groups its digits by default, for the runtime locale when no `locale` is given, so 1234 reads "1,234 charts" rather than "1234 charts", and a fractional count rounds to three decimal places. A test that asserted the ungrouped text changes.
- Components do less work per render. Every `TextInput`, `NumberInput`, `RangeInput`, and `Checkbox` reads its latest reset handler through an effect event instead of a layout effect that ran on every render, toast cards take the dismiss label their region resolves once instead of each reading the panel labels, and `RelativeAge` parses a string timestamp once per render rather than again on every clock tick that checks whether its words changed.
- The emitted declarations no longer carry internal helpers that no entry point exports, such as the `OVERLAY_PLACEMENTS` map and the `announcementRole` and `overlayOpenProps` helpers, and the shared helpers 0.12.0 listed: they are marked `@internal`, which the build strips. Nothing a consumer can import changed.
- `DisclosurePanel` passes `className` through with its other props, so its declared signature no longer names it separately. The class still lands on the panel section.

### Removed

- `LiveRegion.announceOnMount`, replaced by `deferFirstMessage`; `ThemeToggle.labels` and the bundle key `themeToggle.choices`, replaced by `choiceLabels`; `Card.labelledBy`, replaced by the native `aria-labelledby`; `PanelShell.errorLabels`, `PanelShellErrorLabels`, `PanelShell.unsupportedLabels`, and `PanelShellUnsupportedLabels`, replaced by `labels.panelError` and `labels.unsupportedBrowser`; `InlineConfirm.fallbackTitle`, replaced by `labels.inlineConfirm.fallbackTitle`; and the `number` member of `PopoverWidth`.

### Fixed

- The panel announcer is heard while a `Dialog`, `AlertDialog`, `Menu`, or modal `Popover` is open. Its two regions carry the marker React Aria spares when it hides the rest of the page under a modal, so an announcement made while an overlay was open is no longer lost.
- A `prefers-contrast: more` request raises borders, container outlines, muted text, and disabled text in every theme and under every host theme marker. The raised tokens were declared on a rule lighter than every palette rule, so the request changed nothing but the focus outline width.
- Blank text in the label bundle reads as absent everywhere, as documented. A blank `panelError` entry left the "Try again" button, the only recovery after a crash, with no name; a blank `dataGrid.emptyTitle` threw and took the panel down the first time the grid was empty; and a blank `relativeAge.fallback` rendered an empty age. A blank prop keeps its own rule: `ToastRegion label=""` and `DataGrid emptyTitle=""` still throw, because a blank written at the call site is a mistake.
- Spreading a `LabeledField` render-prop argument straight onto a package text control, `RangeInput`, or `Select` no longer writes `descriptionid` and `errorid` attributes onto the native element or logs React's unknown-prop error.
- A `RelativeAge` given a new `since` measures it against the clock read as it arrives. One that had settled on its words used the reading from its last change of words, which can be an hour old, so a moment stamped at receipt read "Unknown" until the next tick, until a hidden document was shown again, or for good with `tickMs: 0`. The `nowMs` that `usePollFreshness` returns is read the same way, so an age formatted against it no longer reads "Unknown" for a sample stamped at receipt.
- The info tone and the Night visited link clear 4.5:1 on a selected data grid row, its hover, and the pressed fill, where they measured as low as 4.04:1. Light info is `#0b6a83` (was `#0e7490`), Night info `#f04040` (was `#e84040`), and the Night visited link `#f63a3a` (was `#f03434`).
- A selected row in a virtualized `DataGrid` shows its leading bar before the first cell only, in every theme and under forced colors. The rule found the first column by position, and the virtualized layout wraps each cell in an element of its own, so every header and body cell reserved the bar's width in front of its text and a selected row painted a bar before each of its cells.
- `Card` draws its footer rule across the whole card, like the header rule; only the footer text keeps to the prose measure, in an inner element of its own. The rule used to stop at 70ch on a wide card.
- The tone glyph beside a toned `Progress` label takes the tone color, as the fill does, rather than the label color, and centers on the first line of the label.
- A `Banner`'s actions center on its first line, so a Dismiss label no longer sits half a line below the title, and keep at least a small inset from the top border, since a banner with actions now starts its content a little lower. In Safari a `Banner` body no longer breaks a sentence that fits on one line.
- In a right-to-left panel the `CollapsibleSection` chevron points toward the title when closed and down when open. It was mirrored twice, pointing away when closed and up when open.
- The summary and actions rows that wrap under a narrow `CollapsibleSection` heading start on the title's text edge, past the tone glyph in a toned section and on a coarse pointer too; they fell a few pixels short when the title was larger than the body text, and stopped under the glyph in a toned section. The actions also stay on the summary's line whenever they fit beside it, where the indent each carried used to push them onto a row of their own.
- A `CollapsibleSection` title that wraps keeps the chevron and tone glyph on its first line instead of centering them between the lines.
- A field error's danger mark keeps its gap from the message, and a wrapped message lines up past the mark instead of running back under it, in every field, checkbox, group, radio, segmented, and switch error. The message now sits in an element of its own inside the error region, as the Breaking section describes.
- An inline field without a description centers its label on the control; the label used to sit about 10 pixels high.
- A button keeps its own type size inside a small-text slot such as a card footer; the `text` variant, a line of its row, still takes the row's size.
- `Button as="a"` draws as the variant it names, in every theme and state; the package's link color and underline no longer override it.
- The optional marker is drawn at the regular weight, so in Night it no longer reads as part of the label.
- A disabled or `ariaDisabled` checkbox dims its label with the disabled text color, and the required and optional markers of a blocked checkbox or field now dim with their label; the blocked field label itself already dimmed. Under forced colors a blocked checkbox's label paints GrayText, its markers included, and a link in it keeps the system link color. A disabled field's label and a disabled field group's legend and description already painted GrayText, but took the elements inside them out of forced colors, so a marker kept its theme color and a link the theme's link color: everything inside them now paints GrayText too, and a link takes the system link color.
- Under forced colors a blocked button of any variant paints GrayText rather than the theme's disabled color, a danger button's dashed outline included, while a busy button keeps its variant.
- An `ActionBar` status given as plain text wraps a long unbroken word, such as an identifier or a path, inside the bar instead of scrolling a narrow page sideways.
- `DataGrid` row separators, the header's included, run from the grid's start edge in both layouts. The first column used to keep a transparent leading border for the selection bar, which could fade the first pixels of a separator in. The bar is now drawn over the first column's widened inset, so selecting a row still moves no text, and it is exactly as wide as the `Banner`, `Card`, and toast tone bars. On a selected row that holds keyboard focus, the bar sits inside the focus ring, and the ring stays whole. First-column cells are now positioned, so content a panel positions absolutely inside one is placed against the cell.
- Under forced colors a selected `DataGrid` row that holds keyboard focus shows its focus ring in `HighlightText`. The ring was drawn in `Highlight` over the row's own `Highlight` fill, so focus on a selected row could not be seen.
- Under `prefers-contrast: more`, the focus rings components draw themselves, on `DataGrid` rows and header cells, `Menu` items, radios, and switches, and the ring the browser draws on a date or time field's picker, widen to 3 pixels like the rings on buttons and inputs outside forced colors, as the design contract promises; they stayed at 2 pixels. The ring forced colors draws around a focused `Tab` widens with them; it too stayed at 2 pixels. With forced colors and a contrast request together, as a Windows high contrast theme sends them, the system-colored rings on primary, secondary, and ghost buttons, a selected segmented option, radios, and switches widen to 3 pixels as well, where they stayed at 2, and a danger button's ring, one pixel wider than the rest, widens from 3 to 4. A selected grid row's bar steps inside the wider ring, so the ring stays whole.
- Under forced colors a keyboard-focused invalid text input, select, checkbox, or slider shows its focus ring; the dashed invalid outline stands aside while the control has visible focus instead of painting over the ring, as it already did outside forced colors.
- Under forced colors a keyboard-focused danger button keeps its focus ring while the pointer rests on it; the dashed danger outline no longer paints over the ring.
- Under forced colors a hovered data grid row no longer looks exactly like a selected one: a row that is not selected takes a dashed `Highlight` outline, and the fill marks selection alone.
- With keyboard focus on a control near the end of a panel, scrolling up docked the `ActionBar` and the page jumped back down to the focused control, so a keyboard user could not scroll away. The bar now leaves a focused control wholly below it alone when the reader's own scroll docked the bar, and still clears it when the viewport itself shrinks, as an on-screen keyboard or a smaller window does. The bar tells the two apart by the scroll offset, not the viewport edge, so a touch browser's toolbar reappearing during that scroll does not count as the viewport shrinking.
- The compatibility notice a host React below the floor raises names the Signal K update it needs, where it asked the operator to update the browser.
- `PanelShell.headingLevel`, `PanelShell.title`, and the documentation described a page heading that Signal K Admin does not render. Above a configuration panel the Admin renders one heading, the plugin card header, an `h5` holding the npm package name, which is why level 2 is the highest a panel should take and why most panels pass no title.
- The localization defaults table in the API reference listed strings the package no longer renders and missed several it does; it is generated from the defaults now. The API reference also documented a per-option `ariaDisabled` on `SegmentedControl` that did not exist, which this release adds.
- `Accordion` with `defaultOpenIndex={null}` starts with every section shut, as documented, instead of opening a child marked `defaultOpen`.
- `DataGrid` rows follow a new `renderRow`, or a change to a column's `numeric`, `wrap`, or `width` option, over the same items, including the cells a `Row` renders from a function. Rows used to keep the cells React Aria had cached for each item, so a panel that switched units in `renderRow` went on showing the old unit. Pass a stable `renderRow`, from module scope or `useCallback`, to keep the row cache: an inline function rebuilds every rendered row on each render.
- A `CheckboxGroup` given both `label` and `legend` is named by `label`, matching `FieldGroup`. It used to take its name from `legend`, the opposite of every other group.
- On a coarse pointer, the `RangeInput` track in Chromium and Safari takes the thicker coarse-pointer height, so the thumb sits centered on it. The rule that raised the track shared a selector list with Firefox-only pseudo-elements, which those engines drop as a whole.
- A numeric timestamp outside the range a `Date` can hold reads as unknown: `RelativeAge` shows its fallback instead of throwing a `RangeError` that took the panel down, and `formatRelativeAgeSince` and `resolveFreshness` report no age instead of one hundreds of thousands of years long.

## [0.12.0] - 2026-09-14

A documentation correction, two announcement fixes, and internal helpers the components now share instead of each writing their own. No entry point gained or lost an export, but the emitted declarations changed, and the release policy counts those as part of the public contract, so this ships as a minor rather than a patch.

### Changed

- Panels do less work per render. A menu item derives its typeahead text when its children change rather than on every render, a button resolves its busy label only while it is loading, a portal consumer proves its owning panel root once per root rather than once per render, and a region tracking focus reads the focused element directly instead of building the composed path for every focus move in the document.
- `PanelAnnouncerProvider`, `PanelLocaleProvider`, and `PanelLabelsProvider` declare `children` as optional, and the emitted declarations name the internal helpers the components now share: `idReferenceList`, `focusIsOnBody`, `mediaMatches`, `asSentence`, and `joinSentences`. No entry point exports those helpers, so nothing a consumer imports changed.

### Fixed

- A panel error announcement keeps the punctuation its title and description were written with. A title ending in "!" or "?" was announced with an extra full stop after it, because only a trailing "." was taken off before the two parts were joined.
- `ThemeToggle` falls back to the package's host-theme guidance when a panel's label bundle supplies a blank `themeToggle.description`. Blank bundle text reads as absent at every other step, and this one entry blanked the guidance instead.
- The `formatRelativeAge` row in the API reference still described the defaults from before 0.11.0. `numeric` is unset by default and resolves per unit, counting in numbers from the day up and taking the reader's words below it, and the fallback string is `"Unknown"`. The defaults table in the same document and the README were already correct.

## [0.11.1] - 2026-09-13

The first published release of the 0.11 line. Version 0.11.0 was tagged but never reached npm: its publish workflow checked out only the release scripts, which had started importing the argument helper the shipped CLI keeps under `bin/lib`, so the run stopped before verifying the tarball. The publish job now checks out both trees, and everything listed under 0.11.0 ships in this version.

### Fixed

- The publish workflow checks out `bin` beside `scripts`, so the registry-ordering check can load the shared argument helper.

## [0.11.0] - 2026-09-13

Tagged but not published; see 0.11.1.

This release removes every deprecated alias and prop the package carried, adds the shared primitives six consumer panels had each written for themselves, and changes several defaults. `docs/migration.md` records the required work under "Changes in 0.11.0".

### Added

- `usePollFreshness` and `resolveFreshness` derive how old a polled value is and whether it has passed a stale threshold the consumer states, reading the package's shared clock rather than a timer per panel. The threshold, the poll interval, and the meaning of a stale reading stay with the consumer.
- `resolveReachability` and `REACHABILITY_STATUS` fix the tone and the default wording of a tri-state reachability flag. Reachable is success, unreachable is danger, and not yet contacted is neutral rather than a warning, because a panel that has not finished contacting an endpoint is reporting its own progress and not a fault.
- `formatCount` and `joinList` give a panel and the components around it one plural and one serial-comma phrase. The package builds its own accessible-name failures with `joinList`.
- `RELATIVE_AGE_EN` joins `RELATIVE_AGE_NARROW`, for a panel that keeps its relative-time wording in English because the copy around it is not localized either.
- `revealElement` and `revealAndFocus` scroll an element into view honoring the reduced-motion preference and then focus it, and `prefersReducedMotion`, `joinIdReferences`, and `useFieldValidity` are public, the last being panel-wide bookkeeping of which fields hold an invalid draft that releases a field when it stops rendering.
- `signalk-nearlcrews-ui/format` publishes the formatting and state helpers with no React anywhere in its module graph, for a worker, a service worker, or a plain Node script.
- `PanelShell` mounts one polite and one assertive live region for the whole panel and publishes `usePanelAnnouncer`, so a panel announces through a region that existed before the message. `PanelRoot` takes `locale` and publishes it through `usePanelLocale`, and `PanelRoot` and `ThemeProvider` take `defaultTheme` for a document that has stored no preference.
- `PanelShell` takes `unsupportedLabels` for the compatibility notice and forwards its `className`, `id`, and other attributes to it.
- `PanelRoot` and `PanelShell` take `labels`, a `PanelLabels` bundle that replaces the package's own English defaults for a whole panel: one optional group per surface in the localization table, every key optional, published to every component and read back with `usePanelLabels`. Each string still resolves as the component's own prop, then the bundle, then the package default, and blank text reads as absent at each step. The compatibility notice keeps `unsupportedLabels`, because it renders before the panel exists.
- `Button` takes a `text` variant for dense list rows, and `disabledReason`, exposed as the button's description while `ariaDisabled` holds, so a blocked button explains itself without each panel wiring its own `aria-describedby`.
- `Banner` and `StatusIndicator` take `announceKey`, which re-announces the current message when the words have not changed, the way `LiveRegion` already did. `Banner` also takes `headingLevel`.
- `CollapsibleSection` takes `tone` and `toneLabel`, which paint the leading accent bar and mark the toggle with the tone glyph so a problem inside a shut section is visible and spoken, plus `triggerRef` and `idPrefix` for a panel that must focus or address a section without querying the DOM.
- `Accordion` can be controlled through `openIndex`, `defaultOpenIndex`, and `onOpenIndexChange`, for example to reveal the section holding a validation error. `Section` takes `headingRef` and `density`.
- `TabPanel` takes `focusable`, which drops the panel's own tab stop for a panel that is nothing but controls.
- `ActionBar` takes `variant="toolbar"`, a full-width band with a free content slot between the status and the actions, and marks itself with `data-snui-action-bar` and its status with `data-snui-action-bar-status`.
- `SegmentedControl` takes `readOnly`, which blocks the selection while every option keeps its tab stop, and `description`, `error`, and `errorLive`, matching `RadioGroup`.
- `NumberField` takes `defaultValue` for an uncontrolled field, `CheckboxGroup` takes `emptyWarningLive`, and `toCheckboxGroupValue` and `applyCheckboxGroupValue` convert between a selection array and the record of booleans a plugin schema stores.
- `Checkbox` and `LabeledField` take `requiredLabel`, `Checkbox` takes `optionalLabel`, `FieldGroup` takes `label` beside `legend` and `groupDescribedBy`, and `NumberInput` and `Select` take the `monospace` option `TextInput` and `Textarea` already had.
- `Card` takes `label` and `labelledBy`, `Text` takes `wrap`, `Code` takes `break="segments"` so a Signal K path breaks at a segment boundary, and `Progress` takes `toneLabel`, which survives Night, where the tone colors converge.
- `Dialog` and `AlertDialog` report which route the user took out through a `DialogCancelReason`, `AlertDialog` describes itself with the message it renders when given no description, `Menu` takes `triggerLabel`, `MenuItem` takes `toneLabel`, `Popover` accepts `id`, `aria-label`, `aria-labelledby`, and `style`, `LiveRegion` takes `announceOnMount`, and `InlineConfirm` takes `onOpenChange`.
- `ToastRegion` takes `defaultDuration`, the auto-dismiss delay for that region's ordinary toasts, and `createToastQueue` takes `onEvict`, called with a `ToastEviction` whenever the queue drops or refuses a toast.
- `DataGrid` takes `caption` and `captionVisibility`, `emptyDescription`, and `virtualize`, and forwards the container attributes it does not own, so a grid can carry `aria-describedby`, `data-*`, or `hidden`.
- New public custom properties: `--snui-color-focus-ring-band`, `--snui-color-row-selected-hover`, `--snui-field-inline-label-min`, `--snui-grid-track-min`, and `--snui-action-bar-surface` as tokens, and `--snui-sticky-clearance`, `--snui-data-grid-column-min`, `--snui-data-grid-max-block-size`, and `--snui-table-cell-min` as consumer hooks read with a fallback.
- `snui-check-consumer` takes a repeatable `--asset`, naming the files beside the remote entry that belong to the remote, for a plugin that serves other bundles from the same directory.

### Changed

- `InputGroupControl`, `NumberField`, and `SecretInput` take `controlWidth` where they took `width`, so `width` means a content-width token on `PanelRoot`, a size on `Dialog`, and a CSS length on `Popover`, and nothing else.
- `SaveActionBar` moves its saved message into `labels.saved`, reports plain unsaved edits with the info tone, and refuses a blocked save through `aria-disabled` and a description rather than the native `disabled` attribute, so Save and Discard keep their place in the tab order while validation blocks them. Its status copy reads "All changes saved", "Save to enable the plugin", and "Save sent to the server", `focusOnAction` leaves focus alone for a panel that moves it itself, and `SaveActionBarState` carries the new `blocked` flag.
- Toast overflow never removes an unread warning or danger toast for a lesser arrival. When the queue holds nothing less consequential than the incoming toast, the arrival is refused and reported through `onEvict` instead, and the returned key stays safe to pass to `dismiss`. A toast made sticky with `duration: 0` on any tone outranks a timed one.
- F6 reaches a panel's notifications only while focus is inside that panel, so a second panel and the Signal K Admin chrome keep the key, and F6 and Shift+F6 both toggle. Dismissing the oldest toast moves focus to the newest remaining notification, and each dismiss button is described by its own toast's title.
- `formatRelativeAge` counts in numbers from a day up ("1 day ago", "1 week ago") rather than using calendar words for an elapsed duration no calendar was consulted for; pass `numeric: "auto"` for the previous wording. Its fallback default is now "Unknown", matching the sentence case of every other default string.
- `ThemeToggle` shows its group label by default, names the two automatic themes "Match Admin" and "Match device" so the pair is no longer two words for the same offer, carries a description saying what Match Admin follows, and always offers the active theme even when `choices` leaves it out.
- `PanelShell` reloads the page from its default error fallback without being given `onReload`; pass `onReload={null}` for a panel that must not offer one. The fallback no longer carries `role="alert"`: it takes focus when the crash left the page with nothing focused, and otherwise announces through the panel announcer. `PanelShell` also renders `description` with or without a title, and `PanelErrorBoundary` records every caught error with `console.error`.
- A role that announces on its own, `alert`, `log`, or `status`, no longer also carries `aria-live`; any other role keeps the live mode the caller requested. `Banner`, `StatusIndicator`, `Metric`, and `LiveRegion` are affected.
- `Banner` reports a dismissal as `onDismiss()` with no arguments instead of handing back the React mouse event of a button the banner owns.
- Every field, group, checkbox, radio group, and segmented-control error leads with the danger tone mark and its visually hidden tone word, so an error does not depend on the danger color, which in Night shares a hue with the description above it.
- `LabeledField` reads its own description and error before an `aria-describedby` already on the child element, matching the order it already applied to `controlDescribedBy`, and injects `aria-required` beside the native attribute for a composite control rendered through the render-prop form.
- `LabeledField` no longer reports the package's own text controls as children it cannot check. `TextInput`, `NumberInput`, `RangeInput`, `Select`, `Textarea`, and `SecretInput` are marked as forwarding the injected id and ARIA props, so the documented element-child pattern renders without a development warning while a consumer component that may swallow those props is still reported. Those six are declared as constants rather than function declarations to carry the mark, which changes their emitted type from a function declaration to a function-typed constant and nothing about how they are rendered.
- `SegmentedControl` answers all four arrow keys in both orientations, matching the radio-group pattern, and Ctrl, or Command on macOS, moves focus without changing the selection. `NumberField` is controlled through `value` or uncontrolled through `defaultValue`, never both, and `onValueChange` is optional.
- Number field messages read "Enter a number of 5 or more." and "Enter a number of 9 or less.", an unparsable draft is answered with an example, and bounds print without grouping separators or exponent notation.
- `DataGrid` defaults its empty title to "Nothing to show yet", shows a selected row with a leading bar as well as the accent tint, and bounds a virtualized grid's own scroll viewport through `--snui-data-grid-max-block-size`, so virtualization does something without the consumer supplying a height.
- `Table` and `TableScrollRegion` install their own style module, so a panel without a table no longer ships the table CSS in the root sheet, and cells inside `TableScrollRegion` take a width floor so a wide table scrolls instead of squeezing every column to one word per line.
- `Section` titles take the type step their heading level implies, matching a `CollapsibleSection` title of the same level, the compact field row gap is one space step rather than an off-scale half step, and cards, sections, and inline confirmations tighten their padding on a narrow panel.
- The info tone no longer shares a color with links: Light and Dark paint info in cyan with its own subtle tint. Night reads darker where it matters, with a nearly opaque dialog scrim, a pure red raised hover fill, and brighter disabled text, and the Dark border token is lighter so data-grid separators keep their boundary contrast when a row is hovered or selected.
- Both spellings of a hover token stay in step, because the surface-first aliases are emitted as `var()` references, and a coarse pointer raises `--snui-space-2` to 0.75rem so adjacent targets separate as well as grow. A high-contrast request also raises muted and disabled text, a plain list inside a panel indents on the package space scale, and `mark` is repainted in package tokens instead of being flattened.
- The dialog body scrolls rather than the whole surface, so the title and the actions stay in view on a short landscape viewport, and dialogs size themselves from `--snui-visual-viewport-height`, so an on-screen keyboard shrinks the dialog instead of putting its actions behind the keyboard.
- The unsaved-changes guard sets both the event cancellation and the legacy `returnValue`, so the browser's confirmation appears on every supported engine. Text direction is read from the computed style rather than a `:dir()` selector, which is what makes right-to-left arrow keys work on Chromium and Edge 118 and 119.
- `Button` as an anchor defaults `rel` to "noopener noreferrer" when `target` is `"_blank"` and the caller set no rel of its own, so the panel's own origin is not sent to an external destination in the referrer header.
- Bundle budgets are derived rather than written by hand: every entry gets 6 percent over its recorded gzip size, rounded up to the next kibibyte, taken from the entry point size table in `docs/api-reference.md`, and the size check fails when a fresh measurement has moved more than 1 percent from the recorded one. The published package no longer ships `docs/repository-setup.md`, which records this repository's own GitHub and npm settings and nothing a consumer can act on.
- `snui-check-consumer` accepts a published prerelease pin, runs the development JSX runtime check on every invocation rather than only with `--runtime`, rejects an unknown or repeated option instead of quietly skipping the check it names, and reports an output-module remote as a build it cannot run rather than failing with a bare `SyntaxError`.

### Fixed

- A focused `NumberInput` drops focus before a wheel or trackpad scroll can spin its value, so scrolling past a numeric field no longer rewrites a configured threshold, and `TextInput` and `NumberInput` restore their controlled value after a native form reset. A control moved to another form by the `form` attribute now listens to the form it belongs to.
- An uncontrolled `CheckboxGroup` returns to its `defaultValue` on a native reset, its select-all box keeps its tab stop when no option can change, and `SegmentedControl` restores its default selection once the reset has finished dispatching.
- A clamping `NumberField` no longer commits a step mismatch when it clamps to a maximum the step does not land on, and typing `-0` commits `0`, so the committed value and the value the field shows again on blur agree.
- An action that closes an already closed dialog no longer leaves a flag set that swallowed the next Escape or scrim cancellation, a dialog with no children renders no body box, `MenuSection` renders no header for a blank title, and `AlertDialog` names itself in its empty-title and portal-container errors.
- Closing a dialog whose opening control is gone leaves focus on the panel root rather than on the document body, the same promise the toast region already made.
- `RelativeAge` re-renders only when the words change, ticks not at all for a cadence that is not a positive finite number, and renders a `span` rather than a `time` when there is no readable timestamp to stamp. The shared clock stops while the document is hidden and delivers one instant on the way back.
- `Progress` treats bounds that are not a range as indeterminate rather than painting a full bar and reporting `NaN`, keeps the `valueText` of an indeterminate bar reachable as a description, animates a transform rather than an inset, and paints a striped full-width fill under reduced motion instead of a static forty percent that read as a bar reporting forty percent complete.
- `Stack`, `Cluster`, and `MetricGrid` rendered as lists drop children that render nothing instead of wrapping them in empty list items, `Stack.align` moves items in a single-column grid, `Metric` leaves its value region empty when there is no value, and cards, stacks, clusters, and metric grids honor the `hidden` attribute.
- `DataGrid` cells wrapped in a fragment take their column's alignment and truncation, a header column drawn by another component keeps its slot, dynamic column options are keyed to the entry each column was rendered from, zebra parity is stamped only when `zebra` is on, and a column pinned narrower than the default floor reaches the width it asked for.
- Scrolling a grid or any other scrolling container inside a panel no longer re-measures the toast host and the docked action bar on every frame, the toast host measures the panel only while a notification is showing, and `ToastRegion` supplies a server snapshot so a panel rendered to static markup no longer throws.
- The panel root gives back its borrowed `tabindex` at once when a focus move does not take, `ActionBar` recovers from a pointer press whose release never reaches the panel's document, and `DisclosurePanel` attaches a consumer ref once per mount instead of on every commit.
- `Tabs` is controlled whenever the `value` prop is passed, including when it is undefined, so a set with nothing selected yet no longer moves its own selection, and vertical tabs fall back to a horizontal tablist in a narrow panel.
- `Accordion` reports the close it performs, so the section it replaces hears its own `onOpenChange(false)`, and `CollapsibleSection` returns focus to its toggle only once a close is committed.
- `scripts/check-consumer-types.mjs` read an undefined binding and threw before it could verify the exports map, so that gate was silently failing.
- Release verification accepts a check run whose details URL is null, a candidate version carrying build metadata publishes under `latest` rather than being read as a prerelease, and the host contract baseline sorts peer dependency names by code unit, so a baseline refreshed on one machine cannot disagree with CI on key order alone.

### Removed

- The deprecated type aliases `BannerLive`, `CheckboxErrorLive`, `FieldErrorLive`, `RadioGroupErrorLive`, `RadioGroupOrientation`, `SegmentedControlLegendVisibility`, `SegmentedControlOrientation`, `InputGroupDensity`, `LabeledFieldDensity`, and `DataGridDensity`. Use `AnnouncementMode`, `Orientation`, `Visibility`, `SegmentedControlLabelVisibility`, and `Density`.
- The deprecated props `SegmentedControl.legend`, `SegmentedControl.legendVisibility`, `SegmentedControl.onChange`, `RadioGroup.onChange`, `Switch.onChange`, `ThemeToggle.legend`, `ThemeToggle.onChange`, and `MenuItem.destructive`, and the `"comfortable"` density spelling on `LabeledField` and `InputGroup`. Use `label`, `labelVisibility`, `onValueChange`, `onCheckedChange`, `tone="danger"`, and `density="default"`.
- `SaveActionBar.savedMessage`, and with it `SaveActionBarStateInput.savedMessage`. Pass `labels={{ saved: ... }}` instead.
- `tabIndex` on `DisclosurePanel`, `Tab`, and `TabPanel`, and `aria-labelledby` on `TabPanel`. Each component owns those attributes, so passing one is a compile error rather than a silent override; use `TabPanel.focusable` where a panel of nothing but controls should give up its own tab stop.

## [0.10.1] - 2026-09-11

### Fixed

- Tab styles install with `Tabs` rather than with every panel. The tab rules were joined into the root sheet `PanelRoot` installs on mount, so a panel that renders no tabs still carried them and no bundler could drop the CSS, which is the case for most panels. They are a per-component module now, the same as the progress bar, radio group, and switch already were, and `Tabs` installs the module through `useOptionalModuleStyles`. That takes 2,400 raw bytes out of the root sheet every panel installs, and 291 gzip bytes off the `signalk-nearlcrews-ui` entry point. The `signalk-nearlcrews-ui/composites` entry point grows by 689 gzip bytes in exchange, because bundling that entry whole now pulls the tab styles in with `Tabs`; a panel that does not render tabs drops them instead. Panels that do render tabs are unaffected in what they ship and in what they look like: the rules are identical and no other sheet references a tab class, so moving the module after the root sheet cannot change a computed style.

## [0.10.0] - 2026-09-11

This release closes the gaps six consumer panels hit in practice. Live regions created together with their first message now mount before there is anything to say, controls that must refuse a change keep their focus instead of destroying it, a disclosure hands focus back to its trigger whoever closed it, and every component installs only its own stylesheet, which takes about 19 KB of CSS out of a typical panel.

### Added

- `TabPanel` accepts a function child, which the panel calls only where it renders it, so a panel with `mountStrategy="unmount"` builds nothing at all while another tab is selected. Plain children behave as they did and stay the right form for content that is cheap to build.
- `useDisclosure` and `Disclosure` accept `id`, which names the trigger, and `idPrefix`, which names both ends of the pair (`<idPrefix>-trigger` and `<idPrefix>-panel`), so a consumer reaches either element by name instead of through a DOM query. Both ids stay generated when neither option is given, and `aria-labelledby` and `aria-controls` follow whichever is set. An id or prefix carrying whitespace throws, because both attributes hold space separated lists.
- `LiveRegion` accepts `announceKey`. Changing it announces `message` again, the same words twice in a row included: the region empties itself for a tenth of a second and restores the text, which is the change a screen reader reads. Consumers that padded a repeated message with a zero-width space to force the announcement pass a plain string and a key instead.
- `LabeledField` accepts `controlDescribedBy`, one id or a list of ids for text outside the field that also describes the control. They join the description and error the field owns, in that reading order, so a render-prop caller spreads `controlProps` and writes no `aria-describedby` join of its own; element children get the same merge.
- `SaveActionBar` accepts `savedMessageDurationMs`, how long the saved message stays up after a save request. Zero leaves it up until `saveRequestedAt` changes, for a panel that ends the window on a server confirmation rather than the clock.
- `Checkbox` accepts `ariaDisabled`, which blocks the change while the box stays focusable, keeps its checked and mixed states, and goes on submitting with its form. It refuses the change from the box, the label, and the Space key alike, and leaves `Enter` alone, because Enter belongs to the surrounding form rather than to the box. Reach for it where a row must stay as it is but its value is real, such as the last remaining selection in a list: native `disabled` gives up the tab stop, so setting it on the box the user is standing on destroys their focus and drops them on the body. When set it decides; when omitted a native `aria-disabled` attribute is read instead, the same rule `Button.ariaDisabled` follows.
- `CheckboxGroup` options accept `ariaDisabled`, and select-all leaves blocked options as it finds them: an option the user cannot change is not one select-all may change for them. The tri-state box now reads its checked and mixed state from the options select-all can actually reach.
- `RadioGroup` accepts `readOnly`, which blocks the selection from changing while every radio keeps its place in the roving tab order. `Switch.readOnly` already worked this way; the two now match, and `disabled` keeps its own meaning on both, that the control is unavailable and gives up its tab stop to say so.
- `PANEL_CONTAINER_NAME` and `CONTAINER_BREAKPOINT_NARROW` are public. `PanelRoot` sets `container-name: snui-panel` and `container-type: inline-size`, and consumer rules may query that container so they answer to the panel's width rather than the viewport's. Both ship as strings rather than CSS custom properties, because a container query condition cannot read a custom property: interpolate them into generated CSS, or write the documented values against the design contract, which now records the name and the 37.5rem breakpoint as public and stable within a minor release.
- `DisclosureTrigger` and `DisclosurePanel` accept `disclosure`, a `useDisclosure` result, in place of the surrounding `Disclosure` context. Two drawers in one row, with both triggers in a cluster and both panels below, could not use the composed parts before: context carries one value, so the two providers had to nest and the inner one answered for both triggers. Call `useDisclosure` once per drawer and name each part's disclosure instead of hand-writing the panel section, and the ids, region naming, `mountStrategy`, and focus handoff come with it. The context form is unchanged, the prop wins where both are available, and a part with neither still throws, now with a message naming both ways.
- `snui-check-consumer --runtime` renders a consumer's built panel the way the Signal K Admin host does and asserts what only a render can show. It loads `remoteEntry.js` as a classic script in a Node context that answers what a panel remote reads while it evaluates, initializes the share scope with the consumer's own React and React DOM, registers the chunks beside the entry, and renders the module named by `--expose` twice: once with the native CSS `@scope` interface taken away, which asserts the compatibility notice a browser without it gets, and once with it, which asserts the panel carries `data-snui-version` of exactly the installed version and no other. It also refuses a remote built against the development JSX runtime, which the file checks cannot see, and reports a panel that calls the host's `save` callback while it renders. `--container`, `--props`, `--expect`, `--expect-unsupported`, and `--no-compatibility-render` carry what only the consumer knows, and the README documents each. A consumer that kept its own `node:vm` harness, including a hand-maintained list of the globals React Aria sets up on import, can delete it: the package owns that list now. Without `--runtime` the command checks exactly what it did before.

### Changed

- `Tabs`, `Tab`, and `TabPanel` are generic over their value type, so `value`, `defaultValue`, and `onValueChange` carry the consumer's own union and a reported value needs no guard on the way back. The type is pinned by a `value` or `defaultValue` of that type, or written out as `<Tabs<Category>>`. `TabsProps`, `TabProps`, and `TabPanelProps` written without a type argument still mean `string`, so existing code compiles unchanged.
- `SaveActionBar` reads `saveRequestedAt` and owns the window its saved message stays up for, 2,500 milliseconds by default, measured from the timestamp rather than from the mount. The prop was documented as the instant of the last save request but only ever tested for null, so every panel kept a state field, an effect holding a `setTimeout`, and a duration constant purely to write the prop back to null; those can go. A panel whose own window was longer than the default sees the message go sooner, and one that wants to keep the window passes `savedMessageDurationMs={0}`.
- `Banner`, `StatusIndicator`, and `Metric` mount their live region before its first message. With `live` set to `"polite"` or `"assertive"`, or a live `role` given to `Banner` or `StatusIndicator`, and nothing to show, each renders the element that carries the role with nothing inside it, and the stylesheet takes that empty element out of the flow, so it costs no box, border, padding, or margin; the same call previously painted a bordered banner, a lone status dot, or a tone glyph with no reading. That makes `<Banner live="polite">{message}</Banner>` the correct spelling where `{message && <Banner live="polite">{message}</Banner>}` was not: the conditional builds the region and its first message in one commit, which screen readers do not announce reliably, so move the condition off the component and onto its content. A status chip beside a button is now one element rather than a chip plus a separate always-mounted `LiveRegion`. Content means `title` and children on `Banner`, children on `StatusIndicator`, and `value` on `Metric`; a `Banner` carrying `actions` or `onDismiss` still renders in full, because hiding a focusable control would strand it.
- A disclosure panel that holds focus when it closes hands that focus to its trigger, whatever closed it. Before, only a close through the trigger or `setOpen` did that, so a consumer holding the open state and wiring a Close button inside the panel to its own setter dropped the reader on the body with no keyboard route back. Opening is unchanged: setting `open` directly still moves no focus into the panel, and a close while focus sits outside the panel still moves nothing, so a panel closed in the background cannot pull focus off the control the user is working with.
- `InlineConfirm.busy` blocks Confirm alone. Cancel stays enabled and Escape keeps dismissing the region, so a keyboard user is no longer held inside a confirmation while an unrelated panel action runs, and `AlertDialog` and `InlineConfirm` now follow one rule: a busy action may not remove the user's route out. `onCancel` can therefore fire while `busy` is true, with reason `"cancel"` or `"escape"`, and the consumer decides whether that aborts the work, closes the region, or both.
- `PanelShell` resolves `themeToggle="between"` to `"end"` on a panel with no `title`. With no title block to follow, the selector became the panel's first element and its first tab stop, a placement none of the three values describes. A panel that wants the theme toggle before its content gives the shell a `title`.
- Style delivery is one module per component rather than a root sheet plus two shared bundles. Dialog, menu, popover, and toast styles were one `overlays` module, so rendering a single `Dialog` pulled menu, popover, and toast CSS into the bundle; each now installs only its own. The slider, textarea, switch, radio group, progress bar, and empty state rules left the root sheet `PanelRoot` installs on every mount and became modules of their own, so a panel ships CSS only for what it renders, at runtime and in its bundle. The root sheet is 10,421 bytes smaller, and a consumer that renders a dialog and none of those controls drops about 19 KB of stylesheet text from its remote. No selector, declaration, or rendered result changed.
- `RangeInput`, `Textarea`, `Switch`, `RadioGroup`, `Radio`, `Progress`, and `EmptyState` install their own style module when they render inside `PanelRoot`. Outside one they render unstyled as before, and do not throw: only the overlays and `DataGrid`, which portal into the root, still require a `PanelRoot` ancestor.
- `Card density="flush"` clears the row gap along with the padding. A consumer reaching for flush is drawing its own chrome inside the card, and the `--snui-space-3` gap it never asked for pushed that content off the edge it was aligned to, so every flush consumer wrote the same doubled-selector `gap: 0` beside it: the override the density exists to delete. A flush card that wants a gap still sets one.
- `Banner.dismissFocusRef` is the destination for every way the banner takes focus away, not the Dismiss press alone. An action inside `actions` that clears the condition the banner reports, the natural shape for a Retry on an error banner, unmounts the banner under the user's own focus, and an announcing banner whose actions go with its message removes them the same way; both dropped the reader on the body, and a consumer had no supported way to prevent it. The banner samples whether it holds focus as focus moves, because losing the element blurs what it held first, and hands that focus on as it goes. The move is synchronous, so a panel that focuses the content it renders in place of the banner still wins, and the Dismiss press behaves exactly as before.
- A `Banner` given a landmark `role` and no name of its own is named by its visible title. `role="region"` requires an accessible name, and the only way to supply one was an `aria-label` repeating the title, which then had to be kept in step by hand; a landmark named something the user cannot see is worse than one named nothing at all. A consumer `aria-label` or `aria-labelledby` still decides, a banner with no title or no role is untouched, and a live role (`status`, `alert`, or `log`) is left unnamed, because it announces its own contents and a name drawn from those contents would only read the title twice.
- A titled `PanelShell` offers the level below its own title to the `Section` and `CollapsibleSection` inside it, so the obvious composition produces a nested outline instead of sibling level-2 headings. The pairing needed `headingLevel={3}` on every section before, and nothing said so. Both components still default to 2 outside a shell, an explicit `headingLevel` still decides, a shell with no title passes its own level straight through, and the derived level stops at 6, so an outline a consumer already got right is unchanged and those explicit props can go.

## [0.9.0] - 2026-09-09

This release ships the panel frame, save bar, number field, and text primitives that every consumer panel had rebuilt by hand, makes toasts reachable under a modal and persistent for warnings and failures, reworks the Night palette and the token scales, delivers overlay and data-grid styles only to panels that use them, and publishes the Module Federation share map together with a consumer check command.

### Breaking

- Warning and danger toasts stay until dismissed by default (`duration` 0), and warning toasts announce politely; only the danger tone is assertive. Info and success toasts keep the five second default. A failure that vanished after five seconds could not be re-read by a screen reader user and was lost on a sighted user who looked away. Pass `duration` to restore a timeout and `live: "assertive"` on a warning that must interrupt.
- `AlertDialog` closes on Escape by default, while scrim presses stay ignored. Pass `keyboardDismissable={false}` when Escape must be blocked.
- `onCancel` on `AlertDialog` now fires once for every way the user declines (Escape, a scrim press when `dismissable` is set, and the cancel button) rather than for the cancel button alone. Closing through an action's `close` function or a controlled `open` change does not call it. `Dialog` gains the same `onCancel`.
- `ToastRegion` renders its landmark only while its queue holds toasts, so an empty region no longer sits in the landmark list. A `ref` on it resolves only while toasts exist, and a test that queries the region must enqueue first.
- `enqueue` throws synchronously when a toast title has no content. Previously the region threw during render, and the host's error boundary replaced the whole configuration panel.
- `MenuSeparator` no longer types an `id` prop. React Aria consumes collection ids as keys, so the value never reached the DOM.
- `DataGrid` requires a `PanelRoot` ancestor, as the overlays already did, because its styles now install from the owning root. `Column` imported from `signalk-nearlcrews-ui/data-grid` is the package's own wrapper around React Aria's Column; a `Column` imported directly from `react-aria-components` is no longer recognized for the row-header default, width pinning, or the new column options.
- `FieldGroup` no longer sets `aria-invalid` or `aria-errormessage` on its fieldset. The group role supports neither attribute, so screen readers ignored them; the error text stays in the fieldset's `aria-describedby`, which is read on entering the group.
- `LabeledField.density` and `InputGroup.density` are typed with the shared `Density` (`"default" | "compact"`). `"comfortable"` is still accepted at runtime and maps to `"default"`, the emitted class is `snui-field--default` rather than `snui-field--comfortable`, and `LabeledFieldDensity` and `InputGroupDensity` remain as deprecated aliases that admit the old value.
- `SegmentedControl` throws `SegmentedControl requires a non-empty label.` when neither `label` nor the deprecated `legend` carries content; the message previously said `legend`. `ThemeToggle` is unaffected: a blank label still falls back to `Panel theme`.
- The optional marker in `LabeledField` is no longer `aria-hidden`, so a field labeled "Nickname (optional)" is announced as such. A test that matched the accessible name "Nickname" exactly must include the marker.
- `Button.ariaDisabled`, when set, decides on its own; a native `aria-disabled` attribute is read only while the prop is omitted. Previously the two combined with OR, so `ariaDisabled={false}` could not override `aria-disabled="true"`. A natively `disabled` `Button` no longer also carries `aria-disabled`.
- Disabled controls no longer dim through opacity. Disabled text uses `--snui-color-text-disabled`, and every control that paints an accent fill or a selected state (primary button, checked and indeterminate checkbox, selected radio and switch, range progress and thumb, and selected segmented option) repaints that fill in the same token. A browser test that asserted `opacity: 0.58` should assert the disabled color instead.
- `formatRelativeAge` defaults changed from `{ numeric: "always", style: "narrow" }` to `{ numeric: "auto", style: "long" }`, so `0` renders `"now"` and `120000` renders `"2 minutes ago"`. Ages beyond a week render in weeks, months, and years (30 days is `"4 weeks ago"`, not `"30 days ago"`), and ages between minus 60 seconds and zero render as now instead of the fallback. Pass `RELATIVE_AGE_NARROW` to keep the compact form and `negative: "fallback"` to keep the old handling of clock skew.
- `StackProps`, `ClusterProps`, `CardProps`, and `MetricGridProps` are discriminated unions on `as` rather than interfaces, so `<Stack as="form">` accepts form attributes and its ref resolves to `HTMLFormElement`. `interface Props extends StackProps` no longer compiles; use an intersection or `ComponentProps<typeof Stack>`. A computed `as` admits only the attributes every element shares.
- `UnsupportedBrowserNotice` is a section named by its heading rather than `role="alert"`. Query it as a region named "Browser update required".
- `StatusIndicator` no longer announces a `toneLabel` on `tone="neutral"`, and a blank `toneLabel` announces the default tone name instead of suppressing the announcement, matching `Metric`, `Badge`, and `Banner`.
- `Accordion` children are no longer region landmarks by default; a child can pass `landmark` to opt back in.
- The status dot grew from 0.7rem to 0.75rem, `Section` spaces its children with a `--snui-space-4` gap instead of a `--snui-space-3` sibling margin, and the `Metric` value, `Section` title, and `CollapsibleSection` heading sizes moved to the type scale. Browser snapshots change.
- Night colors changed for every foreground token so the palette is red-preserving. Consumer styles or tests that hard-code Night `rgb()` values need the new values, which the migration guide lists.
- Font weight tokens are 500 (medium), 600 (semibold), 700 (bold), and 800 (heavy), values static system faces carry; 650 snapped to 700 on Segoe UI, Roboto, and Liberation Sans and collapsed three weights into one. Text that relied on `--snui-font-weight-medium` rendering as bold should use `--snui-font-weight-bold`.
- Overlay z-index defaults moved above the Signal K Admin fixed chrome (Bootstrap header 1020, sidebar 1019): `--snui-z-overlay` is 1040, `--snui-z-modal` is 1050, and `--snui-z-toast` is 1090. A consumer overriding them must keep toast above modal.
- `--snui-focus-ring` is two shadows, a surface-colored band under the outline plus a soft focus-colored halo outside it, so the ring keeps its own boundary beside a danger or accent edge. A consumer composing it with its own shadow inherits the band.
- Overlay and data-grid CSS moved out of the root sheet into module sheets that their components install. Nothing changes for a consumer that uses the components; the private `PANEL_STYLES` constant now holds the root sheet only.
- `signalk-nearlcrews-ui/data-grid` no longer re-exports React Aria's `ColumnProps`. The package's `Column` takes `DataGridColumnProps`, which extends it and adds `numeric` and `wrap`, so the `X`/`XProps` convention now leads to the type that matches the component.
- `DataGridProps` is a union on how the header is written: `<Column>` element children take no `columns`, and a render-function header requires them. A function header without `columns` compiled and rendered a grid with an empty header and no columns; `columns` beside element children compiled and was ignored. `interface Props extends DataGridProps` no longer compiles; use an intersection or `ComponentProps<typeof DataGrid>`.
- `cancelVariant` on `InlineConfirm` and `AlertDialog` accepts `"secondary"` and `"ghost"` only. The cancel button is the always-available escape from the confirmation, so it can no longer be painted as the destructive action; `confirmVariant` was already narrowed the same way.

### Added

- `PanelShell` (package root), the frame every configuration panel repeated by hand. It runs the native CSS scope preflight once, renders `UnsupportedBrowserNotice` or a consumer `unsupported` element when the check fails, and otherwise renders `PanelRoot`, an outer `Stack`, an optional `title` and `description` at `headingLevel` (default 2), a `ThemeToggle` placed by `themeToggle` (`"end"`, `"between"`, or `"none"`), and a `PanelErrorBoundary` around the children.
- `PanelErrorBoundary` (package root) catches a render error inside the panel and offers a "Try again" action, plus a reload action when `onReload` is given. It accepts a `fallback` render prop receiving `error`, `reset`, and `reload`, and `onError` for logging.
- `useUnsavedChangesGuard(dirty)` (package root) registers the browser's unload confirmation while `dirty` is true.
- `SaveActionBar` describes its busy Save button with `labels.saving`, so the busy description is overridable through the same labels as the status line.
- `Card.accent` paints the leading tone bar without the glyph or announcement, for a row whose meaning a Badge or status inside it already announces; `tone` keeps both and wins when both are set.
- `VisuallyHidden`, `Text`, and `Code` (package root), the hidden-text, hint, caption, and identifier primitives consumers had copied. `Text` takes `tone` (`neutral`, `muted`, or a semantic tone), `size` (`base`, `sm`, or `xs`), and `as`; `Code` wraps anywhere inline and takes `block` for preformatted text.
- `LiveRegion` (package root), a visually hidden announcer taking `message`, `live` (default `"polite"`), and `as`, emitting exactly one of `role` or `aria-live`.
- `RelativeAge` (package root) renders an age as words from `ageMs` or a `since` timestamp, owns its tick (`tickMs`, default ten seconds) when given `since`, renders a `<time dateTime>` for a timestamp, and reads the clock once at mount and then only on its tick, never on a re-render.
- `formatRelativeAgeSince(timestamp, nowMs, options)` accepts epoch milliseconds, ISO strings, and dates. `RELATIVE_AGE_NARROW` names the compact rendering that was the default before this release. `formatRelativeAge` gains the `negative` option (`"clamp"` or `"fallback"`), week, month, and year units, one cached `Intl.RelativeTimeFormat` per locale and option set, and a fallback to the runtime locale on a malformed or unsupported locale tag instead of throwing.
- The package root exports `isThemeChoice`, `PACKAGE_VERSION`, `Density`, `Orientation`, and `StatusTone` beside `SemanticTone`.
- `NumberField` (package root), a labeled numeric field built on `LabeledField` and `NumberInput` with a draft-while-editing buffer. The typed text stays until blur or Enter, every keystroke commits what it resolves to, and a wheel over the focused input blurs it so scrolling cannot spin the value. Without `fallback` the draft is validated against `min`, `max`, `exclusiveMin`, `exclusiveMax`, and `integer`, shows a per-reason message, sets `aria-invalid`, and reports `onValidityChange`; with `fallback` it clamps, truncates, and snaps to `step`. `allowEmpty` commits `undefined` for a cleared field, `unit` renders an addon that joins the input's description, `messages` replaces the default strings, `resetKey` drops a draft when a Discard restores the same value, `inputProps` and `inputRef` reach the input, and `ref` reaches the field root. The draft survives a retaining `CollapsibleSection` collapse.
- `useNumberDraft(value, onValueChange, options)` (package root), the hook behind `NumberField`, with `inputProps` to spread onto a bare `NumberInput`, plus `resolveNumberDraft(raw, options)` as the pure resolution step and the `NumberDraft`, `NumberDraftOptions`, `NumberDraftInputProps`, `NumberDraftInvalidReason`, `NumberDraftResolution`, and `UseNumberDraftOptions` types.
- `splitLabeledFieldControlProps(props)` (package root) separates the `LabeledField` render-prop argument into `{ controlProps, descriptionId, errorId }`, so a composite control spreads `controlProps` without stripping the two lookup ids by hand.
- `CheckboxGroup` (`/composites`), a `FieldGroup` of `Checkbox` options with a responsive grid or stacked layout, controlled or uncontrolled selection reported in option order, `name` for native form data, a tri-state select-all checkbox in the legend row (`selectAllLabel`) that completes a partial selection and clears a full one while leaving disabled options alone, and an `emptyWarning` that appears, and is announced politely, while nothing is selected.
- `SaveActionBar` (`/composites`), the Save and Discard footer with a polite status whose tone follows the state, the shared save-enabled rule, and focus moved to the status after either action. It takes `dirty`, `saving`, `unconfigured`, `saveRequestedAt`, `invalidMessage`, `savedMessage`, label overrides, and `sticky` (default `"viewport-bottom"`); `resolveSaveActionBarState` exposes the rules as data.
- `Disclosure`, `DisclosureTrigger`, `DisclosurePanel`, and `useDisclosure` (`/composites`), a headless button-triggered disclosure that owns the ids, `aria-expanded`, `aria-controls`, `hidden`, and the focus handoff to the named panel region on open and back to the trigger on close.
- `Tabs`, `TabList`, `Tab`, and `TabPanel` (`/composites`), a tabs pattern with roving tabindex, direction-aware arrow, Home, and End keys, `aria-selected` and `aria-controls`, automatic or manual `activation`, `orientation`, a `badge` slot per tab, and `mountStrategy` per panel.
- `Table`, `TableHeaderCell`, `TableCell`, and `TableScrollRegion` (`/composites`), a semantic table named by `caption` or ARIA, with header cell styles, `numeric` cells (tabular numerals, end alignment), `zebra` rows on the stripe token, `density`, and a focusable named scroll region.
- `Checkbox.labelVisibility="hidden"` keeps the required label in the accessible name while removing it from the layout.
- `monospace` on `TextInput`, `Textarea`, and `SecretInput` renders the value in the panel's monospace stack. `Textarea.minRows` sets the visible row floor in place of the fixed minimum height and, where the browser supports `field-sizing: content`, lets the control grow with its text from that floor.
- `label` on `Switch` and `Radio` (children still work), and `label` and `labelVisibility` on `SegmentedControl` and `ThemeToggle`. `SwitchProps`, `RadioProps`, and `SegmentedControlProps` are unions over that pair, so a `Switch` or `Radio` with neither `label` nor children, and a `SegmentedControl` with neither `label` nor `legend`, fails to compile instead of throwing when it renders.
- Value callbacks named for their payload: `Switch.onCheckedChange`, `RadioGroup.onValueChange`, `SegmentedControl.onValueChange`, and `ThemeToggle.onValueChange`.
- `LabeledField` and `ThemeToggle` forward `ref` and native attributes to their root `HTMLDivElement`, and `Section`, `Stack`, `Cluster`, `Card`, `MetricGrid`, `Metric`, `Badge`, `StatusIndicator`, `CollapsibleSection`, `Accordion`, `InputGroup`, `InputGroupControl`, `InputGroupAddon`, `ActionBar`, `Menu`, `MenuItem`, `MenuSection`, and `MenuSeparator` do the same for their owning elements. The menu family forwards exactly the attributes React Aria passes to the DOM, and `MenuElementAttributes` names the set.
- `SecretInput` generates an `id` for its input when none is given and ties the Show and Hide button to it through `aria-controls`.
- Secondary and ghost buttons carry explicit system-color rules under forced colors, with focus and disabled states, so a button inside a surface that opted out of forced-color adjustment still paints in the user's scheme.
- Text controls read at least 1rem under `(any-pointer: coarse)`, so iOS Safari no longer zooms a focused input.
- `CollapsibleSection` gains `landmark` (like `Section`), a `leading` slot rendered before the heading and outside the toggle, and `variant="embedded"` for nesting inside a `Card`. `Card` gains `density="flush"` and a `tone` accent bar with `toneLabel`, with the tone glyph in the header. `StatusIndicator` gains the tone glyph beside its dot and `size="compact"`, which shows the dot and glyph while keeping the text for assistive technology. `UnsupportedBrowserNotice` gains `headingLevel`.
- `DataGrid` `Column` gains `numeric` (end-aligns the header and every cell in the column) and `wrap` (lets virtualized cells wrap); `DataGridColumnProps` is exported. Body cells use tabular digits, and a virtualized cell whose content is only strings and numbers carries its text as a `title` so a truncated value stays reachable.
- `Dialog` and `AlertDialog` accept `actions` as a render function, `(close) => nodes`, so an uncontrolled dialog can close from its own action; `DialogActions` is exported. Both gain `keyboardDismissable` (Escape, default `true`) beside `dismissable` (scrim press), and `Dialog` gains `onCancel`.
- `MenuItem` derives its typeahead `textValue` from the text inside element children, skipping hidden and `aria-hidden` elements.
- `Popover.width` accepts a CSS length string such as `"18rem"` or `"var(--snui-content-width-standard)"`; `PopoverWidth` is exported. A number is still read as pixels and is deprecated.
- Toasts have a landmark shortcut: F6 moves focus into the notifications region while a toast is showing, and F6 or Shift+F6 from inside moves it back.
- Color tokens in every theme and in `tokens.css`: `--snui-color-surface-stripe` for zebra rows, `--snui-color-info-subtle`, `--snui-color-success-subtle`, `--snui-color-warning-subtle`, `--snui-color-danger-subtle`, and `--snui-color-accent-subtle` as tinted backgrounds on which text, muted text, and the tone's own color pass WCAG AA, `--snui-color-text-disabled` for disabled text, `--snui-color-track` for range and progress tracks, and the aliases `--snui-color-surface-hover` and `--snui-color-surface-raised-hover` for the hover pair, derived from the pair so they cannot drift.
- Type scale steps `--snui-font-size-lg` (1.125rem), `--snui-font-size-xl` (1.25rem), and `--snui-font-size-2xl` (1.5rem). The heading reset routes `h1` through `h4` down that scale, so consumer headings share sizes with package headings of the same level.
- Modular style delivery. `PanelRoot` installs the root sheet only, `Dialog`, `AlertDialog`, `Popover`, `Menu`, and `ToastRegion` install the overlay sheet, and `DataGrid` installs the table sheet, reference-counted per document, package version, CSP nonce, and module, so a panel without overlays no longer injects overlay CSS. Module sheets carry the same nonce as the root sheet, so a nonce-restricted host that authorizes the root sheet authorizes them.
- The foundation reset neutralizes the rest of Bootstrap Reboot's element rules that reach consumer markup: `b`, `strong`, `small`, `code`, `kbd`, `pre`, `samp`, `mark`, `label`, `th`, and the `button` radius.
- Panel content padding keeps its inline padding at or above the left and right safe-area insets.
- `signalk-nearlcrews-ui/federation`, a CommonJS entry rendered at build time from `package.json`. It exports the Module Federation `shared` map (React and React DOM as non-strict singletons with `import: false` and `requiredVersion` set to the peer range), a `hostNotes` string explaining why the shares are non-strict, and `SIGNALK_HOST_SHARED_MODULES`, with declarations. The repository's own fixture remotes build from it, so the map a consumer spreads is the map the package was verified with.
- `snui-check-consumer`, a shipped command that checks a consumer build against the installed release: an exact pin equal to the installed version, a built remote stamped with exactly that `data-snui-version`, no bundled React runtime, the remote consuming exactly the published share map (and the Webpack configuration declaring it), and, with a size baseline, gzip growth within the recorded allowance or approved ceiling. The README documents its options and the baseline format.
- `signalk-nearlcrews-ui/package.json` in the exports map, so build tooling can read the installed manifest through Node resolution.
- A `default` condition beside every `import` condition, with the same target, so a CommonJS consumer on Node 22.12 or newer can `require` every JavaScript entry. The package check runs Are the Types Wrong under the `node16` profile, and the consumer type check proves the resolution from the packed tarball.
- A per-entry gzip size table in the API reference, with a sentence on what a minimal panel costs.
- The migration guide gains a "Changes in 0.5.0" section listing the migration work for that release's breaking changes, and cross-links the exact-pin rule from the release policy.
- `Visibility` (package root), the shared `"hidden" | "visible"` vocabulary. `CheckboxLabelVisibility`, `SegmentedControlLabelVisibility`, and `TableCaptionVisibility` are aliases of it, so one name covers every label, legend, and caption.
- `ClusterJustify` names the `justify` union `Cluster` accepts, beside `LayoutAlignment`.
- `PopoverWidth` spells out `"auto"` so an editor suggests it beside a CSS length. The accepted set is unchanged.
- `PanelShell.errorLabels` forwards `title`, `description`, `retryLabel`, and `reloadLabel` to the default `PanelErrorBoundary` fallback, so a panel that ships in another language keeps the built-in fallback instead of rebuilding the Banner behind `errorFallback`. `PanelShellErrorLabels` is exported.
- `MenuItem.tone` (`"neutral"` or `"danger"`) joins the tone vocabulary `Button`, `Banner`, `Card`, `Badge`, `Metric`, `StatusIndicator`, and `Progress` share; `MenuItemTone` is exported. `destructive` is deprecated and still honored, and `tone` decides on its own when set.
- `SaveActionBarStateInput` is exported from `/composites`, and `resolveSaveActionBarState` takes the same values as `SaveActionBar` with the same defaults: `labels` is partial and everything but `dirty` is optional. A test of the save rules no longer retypes the seven default strings, so they cannot drift from the ones the component renders.

### Changed

- Dismissing a focused toast moves focus to the next remaining toast's dismiss button, else to the element that had focus before entering the region, else to the panel root. Focus never lands on the document body, including when a queue is cleared or a region unmounts under focus.
- The toast host precedes the panel content, so the notifications are one Tab stop from the panel start, and it carries `data-react-aria-top-layer`, so toasts raised while a `Dialog` or `AlertDialog` is open stay visible, announced, focusable, and dismissable.
- `DataGrid.density` is typed as the shared `Density`; `DataGridDensity` stays exported as a deprecated alias.
- Hover and focused fills painted over the raised surface use `--snui-color-hover-raised`: menu items and sortable data-grid headers directly, and the toast card, popover, and dialog by remapping `--snui-color-interactive-hover` inside their own box so controls placed there follow. Zebra rows use `--snui-color-surface-stripe`, and selected rows use `--snui-color-accent-subtle`.
- Dialog and popover motion runs on `--snui-transition-normal`; menus stay on the fast transition. Dialog titles balance their line breaks.
- Sort glyphs use the alternative-text `content` form, so they no longer join the column header's accessible name, and grow to 0.8em.
- The toast host registry and the style registry moved to `v2` document keys because their record shapes changed; a 0.8.x copy in the same document keeps its own maps.
- `SecretInput` defaults `autoComplete="new-password"`, `spellCheck={false}`, `autoCapitalize="off"`, and `autoCorrect="off"`, so a revealed secret is not captured by password managers, form history, keyboards, or spelling services. Each is a plain prop the caller can override.
- `Switch.onChange`, `RadioGroup.onChange`, `SegmentedControl.onChange`, and `ThemeToggle.onChange` still fire and are deprecated in favor of the payload-named callbacks. `SegmentedControl.legend`, `legendVisibility`, and `ThemeToggle.legend` are deprecated aliases of `label` and `labelVisibility`.
- `CheckboxErrorLive`, `FieldErrorLive`, `RadioGroupErrorLive`, `BannerLive`, `RadioGroupOrientation`, `SegmentedControlOrientation`, and `SegmentedControlLegendVisibility` remain exported as deprecated aliases; props now use `AnnouncementMode`, `Orientation`, and `SegmentedControlLabelVisibility` directly. Every deprecated alias stays for one minor release.
- Every raw `:hover` rule in the control, collapsible, and link styles sits behind `@media (hover: hover)`, so a tap on a touch screen cannot leave a hover fill latched.
- The danger button hover fill uses `--snui-color-danger-subtle`, the progress track uses `--snui-color-track`, the pressed fill shared by buttons, menu items, and collapsible toggles uses `--snui-color-accent-subtle`, and the disabled field-group legend and description use `--snui-color-text-disabled`, replacing color mixes, the border token, and opacity.
- The theme provider reads its state through `useSyncExternalStore` over one store per loaded copy of the library, subscribed to the storage event and the same-document change event. `usePanelTheme` now reports "usePanelTheme must be called inside PanelRoot" instead of naming `ThemeToggle`.
- The `UnsupportedBrowserNotice` default body now reads "This panel needs a newer browser or a newer app to embed it. Update the browser or the app that opens Signal K Admin, then reopen this panel."
- `Banner.live` is typed as `AnnouncementMode`.
- Tone marks are rendered by one shared element in `Metric`, `Badge`, `Banner`, `StatusIndicator`, `Card`, and toasts. A blank `toneLabel` falls back to the default tone name on every component, and a `toneLabel` on `tone="neutral"` is ignored everywhere.
- The `Section` title and `Metric` value use `--snui-font-size-lg`, `CollapsibleSection` headings use `lg` for levels 1 and 2 and the base size deeper, and the tone glyph uses `--snui-font-size-xs`. `Section` and `Card` are grid containers whose gap owns the internal rhythm, the `Metric` value and unit use tabular numerals, titles use `text-wrap: balance`, and descriptions use `text-wrap: pretty`.
- Block-axis offsets across the component stylesheets are written with logical properties. The toast host padding and the docked action bar's measured `left` stay physical, because safe-area insets and viewport measurements are physical edges.
- Night is red-preserving for every foreground: green and blue stay at or below `0x40` on text, muted text, links, focus, the four tones, the accent fills, border, disabled text, and every surface, and the text-class tokens keep red at or above `0xe0`. The tones and subtle fills differ little or not at all in Night, so shape, glyph, and tone label carry status there.
- The Dark accent fill is `#83b3ff` (hover `#9cc3ff`) so its dark label clears APCA Lc 60 as well as WCAG AA.
- `--snui-transition-fast` uses `--snui-ease-standard` like the other two durations, `--snui-range-track-color` defaults to `var(--snui-color-track)` instead of the border color, link underlines take thickness and position from the active font, and the visually hidden utility adds `clip-path: inset(50%)` beside `clip`.
- The design contract documents every token above, the Night rule and its deliberate exceptions, the Admin z-index scale, modular style delivery, the keyframes convention, the `@scope` override rule for consumer CSS with an example, the complete Reboot element list, and the Light and Night surface versus raised-surface decision.
- `engines.node` is `>=22`, the runtime floor Signal K server itself declares, so consumer installs on Node 22.0 through 22.22 no longer print `EBADENGINE`. The precise development floors stay in `devEngines.runtime`, and the `packageManager` field is gone in favor of `devEngines.packageManager`.
- `prepack` runs `npm run build` and nothing more, and `.npmrc` sets `strict-allow-scripts`, so an install script that `allowScripts` does not name fails the install.
- `npm run validate` runs the runtime-only dependency audit. The full-tree audit is a separate, non-blocking CI job, and the release policy records which audit blocks and why.
- The emitted-declarations baseline covers only declaration files reachable from the entry points named in `exports`, so a private refactor no longer fails as a public API change.
- Hosted visual baselines are the `ubuntu24-x64` and `ubuntu24-arm64` families only, the refresh workflow regenerates every Playwright project a screenshot maps to, and local runs write Git-ignored `linux-local-<arch>` images.
- The external-link workflow downloads a pinned lychee release with a verified SHA-256, both publish jobs call a tested registry-order script, and the publish job checks out `scripts/` sparsely with credentials disabled.
- README links to Markdown documents are absolute repository URLs, and the package contract rejects relative ones, because the Signal K App Store rewrites only image targets. The remote output format is named one way everywhere ("classic `var` and output-module ESM Module Federation remotes"), and "App Store" replaces "marketplace".
- A `RelativeAge` that owns its clock shares one timer with every other age on the same `tickMs`, rather than each running its own interval from its own mount. A panel showing many ages now wakes once per interval and refreshes them together in a single update.
- Decorating a cell in a virtualized `DataGrid` no longer allocates on the scroll path, and the column key index is built only when a column asks for decoration.
- Every dependency moved to its current release: React Aria 3.52 and React Aria Components 1.21 at runtime, and Vitest 5 with its coverage provider, ESLint 10.10, typescript-eslint 8.69, Knip 6.34, Biome 2.5.12, Playwright 1.63, Vite 8.2.2, webpack 5.110, and the rest of the development toolchain. Both dependency audits report zero advisories.

### Fixed

- `useNumberDraft` no longer returns `display` or `reset`, and `useDisclosure` no longer returns `panelId` or `triggerId`. Each duplicated a value the same result already carried: the draft's text is `inputProps.value`, and the two ids are `panelProps.id` and `triggerProps.id`. Read them from those objects.
- `PanelShell` holds the theme selector at the trailing edge in both the `"between"` and `"end"` placements. The stack lays its children out in one full-width column, so the selector read as the panel's first section rather than as a control over it, and a panel had to re-align it with its own stylesheet.
- A `Card` with `density="compact"` and a `LabeledField` with `layout="inline"` no longer restyle a nested card or field of their own kind. Their modifier rules reached every matching descendant, so a default-density card inside a compact one lost its header and footer spacing, and a stacked field inside an inline one had its label and control pulled into the outer grid columns. The same rule now applies to `CollapsibleSection` with `variant="embedded"`, whose nested sections keep their own inset.
- Toasts enqueued while a modal was open were hidden from assistive technology and could not receive focus.
- Dismissing a toast dropped focus to the document body.
- A blank toast title threw inside the region's render and took the whole panel down through the host's error boundary.
- In Dark, hovering a menu item or a sortable column header produced no visible change, and in Light and Night zebra striping was invisible, because the raised surface equals the surface there.
- The info status dot clamped to a circle at status and toast dot sizes, so info and neutral were identical without color. The radius is proportional, and the tone glyph now renders beside the dot.
- Dialog scrims and toasts painted beneath the Signal K Admin fixed header and sidebar.
- A root style element the host removed and the package re-appended landed after module sheets; it is inserted ahead of them so cascade order holds.
- A redundant window scroll listener beside the capturing document listener in `Toast` and `ActionBar` was removed, and both now share one viewport measurement.
- A blocked anchor `Button` (unsafe `href`, `ariaDisabled`, or `loading`) keeps `role="link"` while its `href` is withheld. An anchor without `href` maps to the generic role, so the control was announced as plain focusable text with `aria-disabled` on a role that does not support it. An anchor `Button` whose `href` is rejected now logs one development warning per value naming the allowed schemes; production builds stay silent.
- `Progress` treats a non-finite `value` (`NaN`, `Infinity`) as indeterminate instead of writing `NaN%` into the fill width and `aria-valuenow`.
- `InlineConfirm` no longer sets `aria-keyshortcuts="Escape"` on its region. The attribute describes keys that activate or focus an element; Escape dismisses it.
- `SegmentedControl` reads its value props through refs inside the form reset listener, so a controlled selection change no longer detaches and reattaches the listener on every render.
- Controls placed in the `InlineConfirm` actions and the `Banner` body opt back into forced colors, so a secondary Cancel or a consumer button no longer keeps the author palette under a system theme.
- The `Banner` action slot no longer shrinks, so a "Dismiss" label cannot wrap per letter; the text column wraps, and the narrow layout stacks the two.
- `formatRelativeAge` no longer renders `"412d ago"` for stale sources or throws on a malformed locale, and a fresh sample that lands slightly negative through clock skew reads as now instead of `"unknown"`.
- A panel mounted after every other root unmounted no longer reports a stale theme while storage is unreadable; it starts at `"auto"` as a fresh panel always did.
- The one open development advisory (fast-uri 3.1.5) is cleared in the lockfile, so both audits report zero vulnerabilities.
- `scripts/clean.mjs` removes the browser fixture output, and the scripts that read paths relative to the working directory now resolve through one repository-path helper.
- The declaration contract check now names the files that changed. It compared whole snapshots correctly, so no change ever slipped through, but its per-file diff ended each section at the first line break, so a change below line one produced an empty list and the message "no reachable file changed". A maintainer reading that would accept a real public API change as bookkeeping.

### Removed

- The committed `linux-x64` and `linux-arm64` visual baseline families, replaced by the `ubuntu24` families above.
- `fixtures/federation/shared.cjs`; the share definition lives in the build script and ships as `signalk-nearlcrews-ui/federation`.

## [0.8.2] - 2026-08-22

### Changed

- A viewport-bottom `ActionBar` no longer scrolls a control clear when a pointer press moves focus to it. A pointer user can see the control they pressed, and the deferred scroll 0.8.1 introduced still moved content under a pointer that was often still there for a second press. Keyboard and programmatic focus keep immediate clearance, and the bar still clears a focused control when a viewport resize docks it.

### Fixed

- Viewport-bottom docking measurement now reaches its final geometry inside the animation frame that the focus, scroll, or resize event scheduled, rather than over a chain of frames. A control sitting immediately above the docked bar therefore reports a stable box on the next frame, and a browser that requires two consecutive stable frames before delivering a press no longer waits, retries, or times out on it.
- The viewport-bottom docking decision now carries a hysteresis band, so geometry that lands on the docking threshold keeps the state it has instead of alternating between docked and natural flow.
- Compact and icon-only buttons now take their minimum width from the control size token, so a button holding a single glyph meets the 40-pixel fine-pointer and 44-pixel coarse-pointer target floor in width as well as height.
- A panel revealed inside a retained `CollapsibleSection` now re-reads the shared theme, so a theme another panel selected while this one was hidden reaches it on reveal instead of leaving it on the choice it had when it was first mounted.

## [0.8.1] - 2026-08-22

### Changed

- `CollapsibleSection.mountStrategy` now documents what its retaining strategies do to a hidden subtree. State and refs survive a collapse while every effect in the subtree runs its cleanup and runs again on the next expand, so an effect with an empty dependency list runs once per expand rather than once per lifetime. The behavior and the `"retain"` default are unchanged; the prop documentation, API reference, design contract, and adoption guidance now state the rule and the failure shapes it produces for validity reporting, abortable requests, and one-time initialization.
- Adoption guidance now records that the Signal K Admin dependency inventory declares a wider React peer range than this package requires. A consumer keeps its own React and React DOM development dependencies and its Module Federation share requirement at `^19.2.0` rather than deriving them from the inventory.

### Fixed

- A viewport-bottom `ActionBar` no longer scrolls the panel while a pointer is pressed. The first click on a control the docked bar overlaps now reaches that control instead of dispatching on an ancestor after the control moved out from under the pointer. Keyboard and programmatic focus keep immediate clearance, and a clearance a press defers runs on the frame after the release, which puts the scroll after that press's click.
- Viewport-bottom docking measurement now settles within a bounded number of frames when a docked and an undocked geometry alternate, so one focus change can no longer leave the bar moving on every frame.
- A named `SegmentedControl` now always submits the selection it displays. A native form reset previously left the hidden input holding a value the control did not show, both for a controlled selection the reset must not change and for a control sitting in a collapsed `CollapsibleSection` whose paused effects never saw the reset.

## [0.8.0] - 2026-08-19

### Breaking

- `DataGrid.columns` now requires a readonly array instead of a generic iterable. Arrays provide replay-safe column data across React StrictMode and concurrent render retries. Consumers must replace generators, sets, and other iterables with an array, then replace that array when the column data changes.
- `Dialog`, `Menu`, and `Popover` now throw outside an owning `PanelRoot` instead of falling back to `document.body`. Overlays and toasts also reject nested portal providers that redirect them away from their exact owning root. This enforces the style, theme, CSP, portal, and version-isolation boundary. `ToastRegion` has required `PanelRoot` since 0.7.0.

### Added

- A packaged API reference covering entry points, package-specific props, ref targets, defaults, public values, and localization hooks.
- Blocking documentation checks for Markdown structure, spelling, and repository-local links and anchors.
- Read-only Signal K host-drift and locked React Aria dependency-contract checks.
- Per-file coverage floors that complement the existing aggregate thresholds and prevent new source files from hiding severe test gaps.
- Browser-console error capture, visual-baseline family enforcement, and maintained Light, Dark, Night, hover, active, reflow, right-to-left, collapsible, and forced-colors coverage.

### Changed

- Consumer guidance now documents the Popover trigger contract, schema-form boundary, Night theme status cues, token-scoping exception, toast layer ordering, and current adoption recipes.
- Component guidance now correctly describes `loadingLabel` as a busy-state description and `CollapsibleSection` as a heading button with a named region.
- The `tokens.css` guidance now distinguishes its lack of React execution from the package's install-time dependency and peer-dependency graph.
- Popovers validate semantic interactive triggers, and labeled fields validate labelable controls at runtime. Optional public props also explicitly admit `undefined` for consumers using `exactOptionalPropertyTypes`.
- Package validation now rejects stale lockfile roots and canonical metadata drift, checks the API reference's release line, enforces release metadata, and permits only maintained documents in the tarball.
- Release publication now verifies an annotated tag's peeled commit and binds every required exact-commit check to the newest run of its trusted CI or CodeQL workflow before publishing the verified tarball.
- Consumer integration guidance now distinguishes Webpack host-share containers from the host-global React shims required by Signal K's current Vite and ESM contract, records the corresponding Signal K 2.24 and 2.27 host floors, and documents current schema-form, theme-marker, and stylesheet-nonce limits.
- Repository hardening now includes workflow security auditing, scheduled external-document link checks, and export-map-wide bundle and federation validation.
- Compatible development dependencies were refreshed to current patch releases.

### Fixed

- `DataGrid` dynamic headers no longer consume one-shot column data before React Aria renders it, and virtualized zebra rows now match direct-row striping, including rows with functional styles.
- Checkbox and secret-input refs remain stable across rerenders, while segmented controls reject empty option lists, blank labels, and duplicate values.
- Toast regions now isolate viewport updates, multiple mounted queues, and overflow behavior within one panel-owned host. Queue overflow prefers to preserve focused and sticky-critical notifications while remaining bounded. Oversized popovers remain scrollable within the available viewport.
- Viewport-bottom action bars retain visible focus when focus moves, when a viewport resize docks the bar, and when nested scroll containers have limited safe movement. Forced-colors mode also preserves focus rings and readable built-in and consumer-supplied banner actions.

## [0.7.1] - 2026-08-12

### Added

- `signalk-nearlcrews-ui/tokens.css`, a framework-neutral stylesheet carrying the palette and foundation tokens for panels that do not use React. Put the public `snui-tokens` class on a panel root and set `data-snui-theme` to pick a theme. See the design contract for what the class guarantees.
- `npm run host-contract`, which checks the package against the Signal K Admin host dependency declaration recorded in `tests/host-contract.baseline.json`. See the host dependencies section of the README.

### Changed

- The React and React DOM peer ranges narrowed to `^19.2.0`. Every stable React 19 release keeps the support it had; the previous `>=19.2.0 <20.0.0` also accepted React 20 prereleases, which the host dependency declaration excludes.

## [0.7.0] - 2026-08-12

### Breaking

- Composite, data-grid, form-composite, and overlay exports moved from the package root to `/composites`, `/data-grid`, `/forms`, and `/overlays`. Consumers must update those import paths. The package root now contains the lightweight panel, layout, field, feedback, theme, compatibility, and formatting primitives.
- `DataGrid.ref` now resolves to the stable outer `HTMLDivElement` in both direct and virtualized modes. Consumers that used table-specific ref operations must query the descendant grid element instead.
- In-root overlays now use React DOM's portal API, so the React DOM peer dependency `>=19.2 <20`, declared since 0.5.0, is required at runtime rather than only on paper. Module Federation consumers must resolve both React and React DOM from the Signal K Admin host as singletons, while continuing to bundle this package into each remote.
- `ThemeChoice` and `THEME_CHOICES` add `"system"`. Auto now follows an explicit Bootstrap, CoreUI, or legacy `.dark-mode` host theme and otherwise falls back to Light. Select System when the panel should follow `prefers-color-scheme` without an explicit host theme.
- `AlertDialog` requires a non-empty `cancelLabel` and always renders an enabled cancel action before supplemental `actions`. `onCancel` runs before close, `cancelVariant` defaults to `secondary`, and the dialog is not dismissible through Escape or the scrim by default.
- `ToastRegion` must render inside `PanelRoot`. It now throws outside that boundary instead of portaling to `document.body`, where version-scoped styles and theme tokens cannot apply safely.

### Added

- Focused `/composites`, `/data-grid`, `/forms`, and `/overlays` package entry points.
- `SecretInput`, with controlled or uncontrolled reveal state, localized Show and Hide labels, optional trailing content, and pointer-safe caret and selection preservation.
- `UnsupportedBrowserNotice`, a standalone alert consumers can render instead of `PanelRoot` after `supportsNativeCssScope(window)` fails.
- `formatRelativeAge`, which formats a nonnegative elapsed age in milliseconds through `Intl.RelativeTimeFormat` with locale, numeric, style, and fallback options.
- The `"viewport-bottom"` `ActionBar.sticky` mode. It aligns to the `PanelRoot` column, accounts for visual-viewport occlusion and safe-area insets, reserves flow space, returns to natural flow at its anchor, and stops docking when the panel leaves the viewport.
- Native form participation for `Switch` through `form`, `name`, `readOnly`, `required`, and `value`.
- The public `--snui-font-family-mono` token for paths, identifiers, and other fixed-width consumer content.

### Changed

- Large `DataGrid` collections now use React Aria `Virtualizer` and `TableLayout` instead of TanStack Virtual. The virtualizer observes variable row heights while preserving complete-collection keyboard navigation and accessibility metadata.
- Dialogs honor the visual viewport and safe-area insets. Menus, popovers, and nested dialogs use token-driven overlay layers so an overlay opened from a dialog stays above its owner.
- Toast positioning honors safe-area insets. Exit removal follows the actual transition, uses the public transition token for its fallback timer, and completes immediately when reduced motion is requested.
- Development dependencies and compatible runtime dependencies were refreshed to current releases. React Aria and React Aria Components remain bundled with each consumer remote rather than shared through Module Federation.

### Fixed

- Disabled, loading, and unsafe anchor-form buttons no longer retain a navigable `href`.
- A disabled `SegmentedControl` no longer contributes its hidden value to native form submission.
- The viewport-bottom action bar now works in the Signal K Admin `.app-body` layout, whose vertical overflow is unconstrained, and stays aligned across Chromium, Firefox, WebKit, and mobile Chromium.

## [0.6.2] - 2026-08-04

### Fixed

- Anchor-form buttons now make dangerous and unknown URL schemes inert while preserving HTTP, HTTPS, mail, telephone, fragment, query, and relative destinations.

### Changed

- Accordion API documentation now states that child order must remain stable after the first render because open state is positional.
- Refreshed compatible development dependencies.

## [0.6.1] - 2026-08-02

### Fixed

- `--snui-color-scrim` was emitted by every theme block but missing from `PUBLIC_TOKEN_NAMES`, so the scrim token introduced in 0.6.0 never appeared in token enumeration.
- The z-index scale (`--snui-z-sticky`, `--snui-z-overlay`, `--snui-z-modal`, and `--snui-z-toast`) was declared public in 0.5.0 but entered neither `PUBLIC_TOKEN_NAMES` nor the design contract. All five tokens are now listed in both, `FoundationTokenName` includes them, and a stylesheet coverage test fails when a defined token is neither public nor explicitly private.

## [0.6.0] - 2026-08-02

### Fixed

- Virtualized `DataGrid` rows kept only `aria-rowindex`, so real browsers dropped row, row group, and gridcell roles once the virtualized grid restyled table layout. Explicit roles are now stamped on row groups, header and body rows, and cells.
- A mounted panel reset to Auto when another document wrote an unrecognized value to the shared theme key, as a plugin on a different library version can. Unrecognized values are now ignored, and only a genuine clear returns the panel to Auto.
- `FieldError` emitted `role` alongside `aria-live`, double announcing on some screen readers. It now emits exactly one of the pair, matching the design contract.
- `FieldGroup` wired a group error only through `aria-describedby`. The fieldset now also carries `aria-errormessage` and `aria-invalid` while an error is present, matching `RadioGroup` and `LabeledField`.
- A toast's live region wrapped the whole card, so the dismiss button's accessible name joined the announcement. The region now scopes to the toast text.
- Toast queues grew without bound when sticky toasts (`duration: 0`) piled up. A queue now holds at most five toasts and drops the oldest beyond that.

### Added

- `SemanticTone` and `OverlayOpenState` are exported from the package root, so the `ToastContent` tone slot and the shared overlay open-state props can be named directly.
- `--snui-color-scrim` token, resolved per theme, so Dark and Night dialogs no longer sit on the light-theme scrim color.

### Changed

- `SegmentedControlProps.onChange` is now optional, matching `RadioGroup`, `Switch`, and `Checkbox`.
- `Menu`, `Dialog`, and `Popover` open-state props now share the exported `OverlayOpenState` interface, and the `Dialog` trio admits explicit `undefined` like every other optional public prop.
- `BannerLive` is now an alias of `AnnouncementMode`; the union is unchanged.
- Label defaults, tone announcements, overlay open-state props, and description-id resolution moved into shared helpers, and focus-ring, disabled, and pressed-fill declarations into shared style fragments, replacing per-component copies.

## [0.5.0] - 2026-08-01

This release introduces major composite widgets, modernizes React 19.2 foundations, and changes public APIs.

### Breaking

- `Disclosure` is removed and merged into `CollapsibleSection` (which gains `summaryVisibility`).
- `legacyThemeStorageKeys` and the volatile cross-version theme channel are removed. Theme resolves from a single key.
- `InlineConfirm` renames `rootRef` to `ref` and passes a reason (`"escape"` or `"cancel"`) to `onCancel`.
- `SegmentedControl` renames `rootRef` to `ref`, makes `value` optional (adding `defaultValue`), and scopes arrow keys by orientation.
- `ActionBar` changes `sticky` from a boolean to `"bottom"` | `"top"`.
- `BannerTone` is replaced by `StatusTone`, adding a `neutral` tone.
- `Button` props are now a discriminated union requiring `href` when `as="a"`.
- `CollapsibleSection` retain strategies pause effects using `<Activity mode="hidden">`.
- Every component that accepts a ref now declares it as an ordinary `ref` prop instead of wrapping in `forwardRef`. Emitted declarations change from `ForwardRefExoticComponent` to plain functions.
- An unresolved theme preference now resolves to Auto instead of Light. A fresh panel follows the host and the operating system rather than pinning itself to Light.
- `Button` no longer rewrites its accessible name while loading.
- `InlineConfirm` cancel now blocks activation through `aria-disabled` instead of `disabled`, so it keeps focus while busy.
- `Banner` no longer emits `aria-live` alongside a role that already implies a live region.

### Added

- `Accordion`, `DataGrid`, `Dialog`, `AlertDialog`, `EmptyState`, `Menu`, `Popover`, `RadioGroup`, `Switch`, and `ToastRegion` components, built on React Aria Components.
- `as`, `fullWidth`, and `iconOnly` props on `Button`.
- `name`, `disabled`, and `optionalLabel` on `LabeledField`, plus `descriptionId` and `errorId` for render-prop consumers.
- `error` and `errorLive` on `FieldGroup`.
- `month` and `week` types for `TextInput`.
- `live` announcement option for `StatusIndicator` and `Metric`.
- Polymorphic `as` rendering for `Stack`, `Cluster`, `Card`, and `MetricGrid`.
- `around` and `evenly` justify options for `Cluster`.
- `density`, `header`, and `footer` slots for `Card`.
- `unit` suffix slot for `Metric`.
- `choices` restriction and `onChange` observer for `ThemeToggle`.
- `defaultOpen`, `initialFocusRef`, `returnFocusRef`, `cancelVariant`, `scroll-into-view`, and `aria-keyshortcuts` on `InlineConfirm`.
- Landmark opt-out (`landmark={false}`) for `Section` and `InlineConfirm`.
- Public token scales for z-index, motion, and typography, plus per-theme dark and night elevation shadows.

### Fixed

- `RangeInput` left a stale fill after a native form reset. It now resynchronizes.
- `Checkbox` left a stale indeterminate state after a native form reset. It now resynchronizes.
- `Button` leaked `onKeyDown` activation to consumers while blocked by `ariaDisabled` or `loading`.
- `SegmentedControl` probed `getComputedStyle` on every keydown; it now uses `element.matches(":-dir(rtl)")`.
- `InlineConfirm` reattached a caller-supplied `ref` on every commit. A callback ref now attaches once per mount.
- Validation live regions are now mounted before their content arrives, ensuring reliable announcements.
- Forced colors erased the distinction between valid and invalid text inputs, checkboxes, and ranges. Invalid controls now carry a dashed outline.
- Night tone tokens were near-isoluminant, with danger and info at 1.00:1 against each other.
- Host global styles, including the Bootstrap Reboot that Signal K Admin bundles, reached unclassed consumer markup inside a panel and changed legend, heading, and block spacing.
- The reduced-motion reset applied to all consumer content through a universal selector, so a consumer could only preserve an essential animation with an `!important` declaration.
- Optional public props now admit `undefined`, so consumers compiling with `exactOptionalPropertyTypes` can pass a computed optional value.

### Changed

- ESLint uses `recommended-latest` to surface React Compiler diagnostics.
- Bundle size budget raised to 120 kB to accommodate React Aria Components composite widgets.
- The default font stack no longer names `Inter`, which the package does not ship and the host does not load.
- Shared panel behavior moved into single primitives: overlay portal readiness, field error regions, live-region roles, tone labels, ref composition, and reduced-motion detection. Repeated style declarations are emitted from one source, and the overlay stylesheet is split into per-component modules. The emitted declarations for these internal modules changed; the package entry point `dist/index.d.ts` and all 156 exported names are unchanged.

## [0.4.1] - 2026-07-27

### Fixed

- Refreshed the x64 and ubuntu24 Playwright visual baselines so release verification passes on GitHub-hosted runners. The library is unchanged from 0.4.0.

## [0.4.0] - 2026-07-27

This version was tagged but not published to npm. Install 0.4.1 instead.

### Added

- An `indeterminate` prop on `Checkbox` that drives the native mixed state and its existing dash styling.
- Date and time entry through `TextInput` types `date`, `time`, and `datetime-local`.
- A filled range-track progress indicator on Chromium and WebKit, matching the existing Firefox fill.
- A hover affordance on enabled checkboxes and a smooth checkbox state transition.

### Changed

- Night theme hover, border, and muted-text tokens are brighter so hover feedback is visible on every Night surface while keeping WCAG AA text contrast and 3:1 boundary contrast.
- Banner dismissal now uses a raised-surface hover fill that stays visible in Dark and Night, where the shared hover color matched the banner background.
- Segmented-control options now use concentric corner radii inside the group border, and checkbox labels use the shared 650 label weight.
- Development tooling moved to ESLint 10 with the maintained `eslint-plugin-jsx-a11y-x` accessibility rules, jsdom 30, Testing Library jest-dom 7, and current releases of the remaining toolchain.
- Documented the browser-only rendering model and the Chromium 120 floor for right-to-left `:dir()` mirroring.

### Fixed

- Loading buttons no longer dim their label and spinner below readable contrast while a busy action runs.
- Confirmation regions focus their Cancel action reliably under React StrictMode remounts and no longer steal focus back to the trigger when the user moved focus away before the confirmation closed.
- Sticky action bars blur their backdrop on Safari 17.4 through 17.6 via the prefixed backdrop filter.
- Button spinners keep their rotating gap in Windows High Contrast forced-colors mode.
- Action-bar status, inline-confirmation actions, and field-group actions now carry the shared overflow guards used by their sibling layouts.
- Removed duplicate and dead style declarations, consolidated all banner rules into one module, and moved the action-bar status focus rule beside its component styles while retargeting it to `:focus-visible`.

## [0.3.0] - 2026-07-17

### Added

- Dedicated Windows package validation and fresh-profile browser coverage for the Light default.
- In-page theme synchronization for separately bundled roots when browser storage is unavailable.

### Changed

- Panels without a valid shared or legacy preference now use Light without persisting an implicit choice. Existing stored preferences, including Auto, remain unchanged.
- Classic and ESM Module Federation fixtures now derive their required React version from the package peer dependency.
- Updated Vite and compatible transitive development dependencies to their current patch releases.

### Fixed

- Package validation now invokes the declared `attw` JavaScript entry point through Node instead of launching platform-specific command shims.
- Later-mounted panel roots no longer replace an in-memory explicit theme with the implicit fallback when storage is unavailable.

## [0.2.0] - 2026-07-15

### Added

- Checkbox validation messages, configurable field error announcements, and consistent invalid range styling.
- `loadingLabel`, banner tone labels, dismissal focus destinations, per-instance theme labels, and localized inline-confirmation fallbacks.
- The `lazy-retain` collapsible mount strategy, semantic metric names, native attribute and ref support for composite primitives, and a dedicated section-action wrapper.
- The public `--snui-color-interactive-hover` token, `supportsNativeCssScope`, and `UnsupportedBrowserError`.

### Changed

- Loading buttons now remain focusable with `aria-disabled` while suppressing repeat pointer and keyboard activation.
- Responsive rules now follow panel width through container queries, coarse target sizing follows any coarse pointer, and pseudo-elements inherit border-box sizing.
- Segmented controls use direct radio-group semantics and direction-aware arrow keys. Disclosure and collapsible carets mirror in right-to-left layouts.
- `Stack` is the sole owner of external vertical rhythm between shared surfaces. Required semantic names now reject whitespace-only content.
- Banners include a visible, non-color severity cue, preserve explicit `aria-live="off"`, and expose their root ref.

### Fixed

- Light-theme hover feedback is visibly distinct from raised surfaces.
- Field-group actions retain logical reading order when narrow panels reflow.
- Invalid range tracks no longer lose their danger color to later base track rules.

## [0.1.0] - 2026-07-15

### Added

- Accessible React form, feedback, layout, disclosure, metric, theme, and confirmation primitives.
- Scoped Light, Dark, and Night themes with public color, spacing, typography, radius, sizing, and transition tokens.
- Classic and ESM Module Federation fixtures, strict CSP coverage, and Chromium, Firefox, WebKit, and mobile browser tests.
- Biome formatting and linting, type-aware ESLint, Knip dead-code checks, package audits, type validation, and bundle limits.
- GitHub repository policy, protected npm publication workflow, security configuration, and migration guidance.

[Unreleased]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.12.0...HEAD
[0.12.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.11.1...v0.12.0
[0.11.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.8.2...v0.9.0
[0.8.2]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.6.2...v0.7.0
[0.6.2]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/releases/tag/v0.1.0
