# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2026-09-05

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
- `SegmentedControl` and `ThemeToggle` throw `requires a non-empty label.` when neither `label` nor the deprecated `legend` carries content; the message previously said `legend`.
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

### Added

- `PanelShell` (package root), the frame every configuration panel repeated by hand. It runs the native CSS scope preflight once, renders `UnsupportedBrowserNotice` or a consumer `unsupported` element when the check fails, and otherwise renders `PanelRoot`, an outer `Stack`, an optional `title` and `description` at `headingLevel` (default 2), a `ThemeToggle` placed by `themeToggle` (`"end"`, `"between"`, or `"none"`), and a `PanelErrorBoundary` around the children.
- `PanelErrorBoundary` (package root) catches a render error inside the panel and offers a "Try again" action, plus a reload action when `onReload` is given. It accepts a `fallback` render prop receiving `error`, `reset`, and `reload`, and `onError` for logging.
- `useUnsavedChangesGuard(dirty)` (package root) registers the browser's unload confirmation while `dirty` is true.
- `VisuallyHidden`, `Text`, and `Code` (package root), the hidden-text, hint, caption, and identifier primitives consumers had copied. `Text` takes `tone` (`neutral`, `muted`, or a semantic tone), `size` (`base`, `sm`, or `xs`), and `as`; `Code` wraps anywhere inline and takes `block` for preformatted text.
- `LiveRegion` (package root), a visually hidden announcer taking `message`, `live` (default `"polite"`), and `as`, emitting exactly one of `role` or `aria-live`.
- `RelativeAge` (package root) renders an age as words from `ageMs` or a `since` timestamp, owns its tick (`tickMs`, default ten seconds) when given `since`, renders a `<time dateTime>` for a timestamp, and reads the clock in an effect rather than during render.
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
- `label` on `Switch` and `Radio` (children still work), and `label` and `labelVisibility` on `SegmentedControl` and `ThemeToggle`.
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

### Fixed

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
- React DOM `>=19.2 <20` is now a peer dependency because in-root overlays use its portal API. Module Federation consumers must resolve both React and React DOM from the Signal K Admin host as singletons, while continuing to bundle this package into each remote.
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

[Unreleased]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.9.0...HEAD
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
