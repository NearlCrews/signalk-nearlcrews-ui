# Design contract

This contract defines the stable behavior shared by NearlCrews Signal K administration panels. It does not define plugin business behavior.

## Scope

The React package may own:

- Theme tokens and scoped component styling
- Accessible names, focus states, and keyboard interaction
- General-purpose form controls and layout
- Presentational feedback and confirmation surfaces
- Coarse-pointer sizing, responsive behavior, and reduced motion

The React package must not own:

- Signal K requests, paths, sources, or provider detection
- Configuration schemas, reducers, or persistence
- Unit selection or SI conversion
- Save state, save timing, or retry behavior
- Plugin-specific validation, status interpretation, or workflows

## Themes

The public theme names are `auto`, `light`, `dark`, and `night`.

- Auto follows an explicit host theme before the operating-system preference.
- Light uses dark text on light surfaces.
- Dark uses light text on dark surfaces and dark text on the brighter accent fill.
- Night uses red-preserving surfaces, text, focus, and status colors.

Night styling ends at the panel root. It does not modify host chrome, the document body, or surrounding gutters. A full-surface night experience requires the host to coordinate those surfaces.

Theme preference is shared across NearlCrews administration panels through `signalk-nearlcrews-ui.theme.v1`. Binnacle and other chartplotter interfaces maintain separate product preferences.

## Public CSS tokens

These color token names are public API:

- `--snui-color-background`
- `--snui-color-surface`
- `--snui-color-surface-raised`
- `--snui-color-text`
- `--snui-color-text-muted`
- `--snui-color-border`
- `--snui-color-accent-fill`
- `--snui-color-accent-fill-hover`
- `--snui-color-on-accent`
- `--snui-color-focus`
- `--snui-color-success`
- `--snui-color-warning`
- `--snui-color-danger`
- `--snui-color-info`

Spacing, radius, typography, and timing tokens are currently implementation details. Their names may change during `0.x`.

Token values may change in a compatible release to fix contrast, browser behavior, or theme consistency. Removing or renaming a public token is breaking.

## Accessibility

- Normal text and control labels must meet WCAG AA contrast.
- Accent fills use a separate on-accent token. The foreground must not be assumed to be white.
- Focus must be visible in every theme.
- Status must include visible text or another non-color cue.
- Single-choice segmented controls use radio-group semantics, roving focus, arrow keys, Home, and End.
- Disclosures use native details and summary behavior.
- Persistent banners are not live regions unless the consumer explicitly requests polite or assertive announcements.
- Confirmation regions receive focus, support Escape while idle, and restore focus when dismissed.
- Coarse-pointer controls have a minimum target height of 44 pixels.
- Motion is effectively disabled when `prefers-reduced-motion` requests it.

## Styling isolation

Every descendant selector is inside a native CSS scope rooted at the exact package version and bounded by the next versioned root, such as:

```css
@scope (.snui-root[data-snui-version="0.1.0"])
  to ([data-snui-version]) {
  /* component rules */
}
```

`PanelRoot` reference-counts a style element in the rendered root's owner document. Independently bundled remotes share the same document registry, and conflicting CSS that claims the same version is rejected. The final root unmount removes the style element. Descendant selectors stop at every nested versioned root, a matching inner root re-enters its own scope, CSS variables are defined on the matching root, and nothing is written to `:root`. Internal classes and DOM nesting are private API.

## Density and responsive behavior

Desktop controls have a compact 40-pixel minimum height. Coarse-pointer controls use 44 pixels. Panels must reflow without horizontal page overflow at 320 CSS pixels, and action groups may wrap when space is limited.

## Compatibility

- React support is `>=19 <20` for `0.x`.
- React and `react/jsx-runtime` remain external to the unbundled library build. Consumer remotes may embed React's small JSX element-construction helper. React itself must resolve through the host singleton, and React or React DOM implementations must never be embedded.
- Consumers bundle this package into each Module Federation remote.
- Consumers must not share this package dynamically between remotes.
- Both classic global and ESM Module Federation output are tested.
- The repository runtime harness supplies a minimal host-equivalent React share scope. Each consumer remains responsible for testing the production remote in its supported Signal K Admin host.
