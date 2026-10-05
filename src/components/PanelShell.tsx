import { type ReactNode, useState, version } from "react";

import { supportsNativeCssScope } from "../styles/install.js";
import {
  HEADING_ELEMENTS,
  type HeadingLevel,
  nextHeadingLevel,
} from "../utils/heading.js";
import { HeadingLevelProvider } from "../utils/heading-level.js";
import { trimmedText } from "../utils/labels.js";
import { hasReactContent } from "../utils/react-node.js";
import { reactBelowFloor, reactFloorMessage } from "../utils/react-version.js";
import { type SpaceScale, Stack } from "./Layout.js";
import { PanelAnnouncer } from "./PanelAnnouncer.js";
import {
  PanelErrorBoundary,
  type PanelErrorBoundaryProps,
} from "./PanelErrorBoundary.js";
import { PanelRoot, type PanelRootProps } from "./PanelRoot.js";
import { ThemeToggle, type ThemeToggleProps } from "./ThemeToggle.js";
import { UnsupportedBrowserNotice } from "./UnsupportedBrowserNotice.js";

/**
 * Where the theme toggle sits: after the content, between title and content,
 * or nowhere. Either placement aligns it to the trailing edge. `"between"`
 * needs a title to follow, so a panel without one resolves it to `"end"`.
 */
export type PanelShellThemeToggle = "end" | "between" | "none";

export interface PanelShellProps
  extends Omit<PanelRootProps, "children" | "onError" | "title"> {
  readonly children: ReactNode;
  /** Shown under the title, or on its own when the shell has no title. */
  readonly description?: ReactNode | undefined;
  /**
   * Replaces the default error fallback; see `PanelErrorBoundary`. A fallback
   * of your own supplies its own text, so `labels.panelError` does not reach
   * it. The default fallback reads its text from `labels.panelError`.
   */
  readonly errorFallback?: PanelErrorBoundaryProps["fallback"] | undefined;
  /** Gap of the outer Stack. Defaults to the Stack's own gap. */
  readonly gap?: SpaceScale | undefined;
  /**
   * Level of the panel title, and of the sections of a panel with no title,
   * default 2. Above a configuration panel, Signal K Admin renders a single
   * heading: the plugin card header, an `h5` holding the npm package name.
   * The page has no `h1` for a panel to nest under, so level 2 is the highest
   * a panel should take, and the one that keeps its sections reachable by
   * heading level. A titled shell also offers the next level down to the
   * sections inside it, so they nest under the panel heading without being
   * told where they are.
   */
  readonly headingLevel?: HeadingLevel | undefined;
  /** Called for every error the boundary catches; replaces the div's native `onError`. */
  readonly onError?: PanelErrorBoundaryProps["onError"] | undefined;
  /**
   * What the error fallback's secondary action does. It defaults to reloading
   * the page, which is the escape hatch when a retry cannot help, such as a
   * stale federation chunk. Pass `null` for a panel that must not offer one.
   */
  readonly onReload?: (() => void) | null | undefined;
  /**
   * Where the theme selector sits, default `"end"`, the foot of the panel.
   * Write it out at the call site rather than relying on the default, so
   * adding a title later cannot move it.
   */
  readonly themeToggle?: PanelShellThemeToggle | undefined;
  readonly themeToggleProps?: ThemeToggleProps | undefined;
  /**
   * Heading of the panel itself. The Signal K Admin card header above the
   * panel already names the plugin, by its npm package name, so a panel title
   * adds a second name for the same plugin; most panels leave it unset and
   * let the card header name them.
   */
  readonly title?: ReactNode | undefined;
  /**
   * Rendered instead of the panel when the browser lacks native CSS scope or
   * the host's React is below the floor. Without it the shell shows its own
   * compatibility notice, whose text comes from `labels.unsupportedBrowser` in
   * the browser case; the notice for a host React below the floor stays in
   * English, because it names both versions and the fix is the host's.
   */
  readonly unsupported?: React.JSX.Element | undefined;
}

/**
 * Heading of the notice when the host's React is the reason. The browser is
 * not the problem then, so the browser heading would send the operator after
 * the wrong update.
 */
const REACT_FLOOR_TITLE = "Signal K update required";

/**
 * Reloads the whole Admin page, the escape hatch every panel wrote for itself
 * before the shell offered one.
 */
function reloadHostPage(): void {
  window.location.reload();
}

/**
 * The whole panel frame every plugin configuration panel repeats: the browser
 * preflight and its notice, `PanelRoot`, the panel announcer, an outer
 * `Stack`, an optional title, the theme toggle, and an error boundary around
 * the consumer's content.
 */
export function PanelShell({
  children,
  defaultTheme,
  description,
  errorFallback,
  gap,
  headingLevel = 2,
  labels,
  locale,
  onError,
  onReload = reloadHostPage,
  ref,
  styleNonce,
  themeToggle = "end",
  themeToggleProps,
  title,
  unsupported,
  width,
  ...htmlProps
}: PanelShellProps): React.JSX.Element {
  // Neither engine support nor the host's React can change while the page
  // lives, so one check at mount decides the frame for the whole session.
  const [blocker] = useState<"engine" | "react" | undefined>(() => {
    if (!supportsNativeCssScope()) return "engine";
    return reactBelowFloor(version) ? "react" : undefined;
  });

  if (blocker !== undefined) {
    // The notice renders instead of PanelRoot, so no bundle is published yet
    // and the shell reads the notice's group from its own prop. Blank text
    // reads as absent, leaving the notice's English default. The group is
    // browser advice, which cannot help when the host's React is the reason,
    // so that case keeps its own heading and the message naming both versions.
    const noticeLabels = labels?.unsupportedBrowser;
    const noticeTitle =
      blocker === "react"
        ? REACT_FLOOR_TITLE
        : trimmedText(noticeLabels?.title);
    const explanation =
      blocker === "react"
        ? reactFloorMessage(version)
        : trimmedText(noticeLabels?.description);
    // The consumer's own attributes reach the notice, so a host that finds
    // the panel by id or a data attribute still finds something here. The
    // panel ref does not: this branch renders a section, not the panel div.
    return (
      unsupported ?? (
        <UnsupportedBrowserNotice
          {...htmlProps}
          headingLevel={headingLevel}
          title={noticeTitle || undefined}
        >
          {explanation || undefined}
        </UnsupportedBrowserNotice>
      )
    );
  }

  const hasTitle = hasReactContent(title);
  const hasDescription = hasReactContent(description);
  const Heading = HEADING_ELEMENTS[headingLevel];
  // "Between" has nothing to sit between without a title: the selector would
  // lead the panel and take its first tab stop, which no placement describes.
  // It resolves to the default trailing slot instead.
  const placement =
    themeToggle === "between" && !hasTitle ? "end" : themeToggle;
  const toggle =
    placement === "none" ? null : (
      // The selector is a control over the panel, not one of its sections, so
      // the shell keeps it at the trailing edge of the single-column stack.
      <div className="snui-panel-shell__theme-toggle">
        <ThemeToggle {...themeToggleProps} />
      </div>
    );

  return (
    <PanelRoot
      {...htmlProps}
      ref={ref}
      defaultTheme={defaultTheme}
      labels={labels}
      locale={locale}
      styleNonce={styleNonce}
      width={width}
    >
      <PanelAnnouncer>
        {/*
         * A section under the panel title is a section of the panel, so it takes
         * the level below it. A shell with no title heads nothing, and passes
         * its own level straight through.
         */}
        <HeadingLevelProvider
          value={hasTitle ? nextHeadingLevel(headingLevel) : headingLevel}
        >
          <Stack gap={gap}>
            {hasTitle || hasDescription ? (
              <div className="snui-panel-shell__header">
                {hasTitle ? (
                  <Heading className="snui-panel-shell__title">{title}</Heading>
                ) : null}
                {hasDescription ? (
                  <div className="snui-panel-shell__description">
                    {description}
                  </div>
                ) : null}
              </div>
            ) : null}
            {placement === "between" ? toggle : null}
            <PanelErrorBoundary
              fallback={errorFallback}
              onError={onError}
              onReload={onReload ?? undefined}
            >
              {children}
            </PanelErrorBoundary>
            {placement === "end" ? toggle : null}
          </Stack>
        </HeadingLevelProvider>
      </PanelAnnouncer>
    </PanelRoot>
  );
}
