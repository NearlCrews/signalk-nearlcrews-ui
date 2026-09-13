import { type ReactNode, useCallback, useState, version } from "react";

import { supportsNativeCssScope } from "../styles/install.js";
import {
  type PanelAnnounce,
  PanelAnnouncerProvider,
} from "../utils/announcer.js";
import {
  HEADING_ELEMENTS,
  type HeadingLevel,
  nextHeadingLevel,
} from "../utils/heading.js";
import { HeadingLevelProvider } from "../utils/heading-level.js";
import { definedProps } from "../utils/props.js";
import { hasReactContent } from "../utils/react-node.js";
import { reactBelowFloor, reactFloorMessage } from "../utils/react-version.js";
import { type SpaceScale, Stack } from "./Layout.js";
import { LiveRegion } from "./LiveRegion.js";
import {
  PanelErrorBoundary,
  type PanelErrorBoundaryProps,
} from "./PanelErrorBoundary.js";
import { PanelRoot, type PanelRootProps } from "./PanelRoot.js";
import { ThemeToggle, type ThemeToggleProps } from "./ThemeToggle.js";
import {
  UnsupportedBrowserNotice,
  type UnsupportedBrowserNoticeProps,
} from "./UnsupportedBrowserNotice.js";

/**
 * Where the theme toggle sits: after the content, between title and content,
 * or nowhere. Either placement aligns it to the trailing edge. `"between"`
 * needs a title to follow, so a panel without one resolves it to `"end"`.
 */
export type PanelShellThemeToggle = "end" | "between" | "none";

export type PanelShellErrorLabels = Pick<
  PanelErrorBoundaryProps,
  "description" | "reloadLabel" | "retryLabel" | "title"
>;

/**
 * Text of the compatibility notice, for a panel that ships in another
 * language. `children` replaces the explanation under the heading.
 */
export type PanelShellUnsupportedLabels = Pick<
  UnsupportedBrowserNoticeProps,
  "children" | "title"
>;

export interface PanelShellProps
  extends Omit<PanelRootProps, "children" | "onError" | "title"> {
  readonly children: ReactNode;
  /** Shown under the title, or on its own when the shell has no title. */
  readonly description?: ReactNode | undefined;
  /**
   * Replaces the default error fallback; see `PanelErrorBoundary`. A fallback
   * of your own supplies its own text, so `errorLabels` is ignored beside it.
   */
  readonly errorFallback?: PanelErrorBoundaryProps["fallback"] | undefined;
  /** Text of the default error fallback; ignored when `errorFallback` is set. */
  readonly errorLabels?: PanelShellErrorLabels | undefined;
  /** Gap of the outer Stack. Defaults to the Stack's own gap. */
  readonly gap?: SpaceScale | undefined;
  /**
   * Level of the panel title, default 2. Signal K Admin renders the plugin
   * card header as an `h5` and the page title as its own heading, so a panel
   * must not add another `h1`. A titled shell also offers the next level down
   * to the sections inside it, so they nest under the panel heading without
   * being told where they are.
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
   * Heading of the panel itself. Signal K Admin already shows the plugin name
   * in its card header, so a title repeating that name reads twice on screen;
   * most panels leave it unset and let the host name them.
   */
  readonly title?: ReactNode | undefined;
  /** Rendered instead of the panel when the browser lacks native CSS scope. */
  readonly unsupported?: React.JSX.Element | undefined;
  /** Text of the built-in compatibility notice; ignored when `unsupported` is set. */
  readonly unsupportedLabels?: PanelShellUnsupportedLabels | undefined;
}

/**
 * Reloads the whole Admin page, the escape hatch every panel wrote for itself
 * before the shell offered one.
 */
function reloadHostPage(): void {
  window.location.reload();
}

interface Announcement {
  readonly key: number;
  readonly message: string;
}

const NO_ANNOUNCEMENT: Announcement = { key: 0, message: "" };

/**
 * The panel's two live regions, mounted with the shell and empty until there
 * is something to say, because a region created together with its first
 * message is not announced reliably. A panel reaches them through
 * `usePanelAnnouncer` instead of mounting a region of its own beside each
 * message.
 */
function PanelAnnouncer({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const [polite, setPolite] = useState(NO_ANNOUNCEMENT);
  const [assertive, setAssertive] = useState(NO_ANNOUNCEMENT);

  const announce = useCallback<PanelAnnounce>((message, options) => {
    // The key counts announcements rather than naming them, so the same words
    // twice in a row are read twice instead of reading as an unchanged region.
    const next = (previous: Announcement): Announcement => ({
      key: previous.key + 1,
      message,
    });
    if (options?.assertive === true) setAssertive(next);
    else setPolite(next);
  }, []);

  return (
    <PanelAnnouncerProvider value={announce}>
      <LiveRegion
        live="polite"
        announceKey={polite.key}
        message={polite.message}
      />
      <LiveRegion
        live="assertive"
        announceKey={assertive.key}
        message={assertive.message}
      />
      {children}
    </PanelAnnouncerProvider>
  );
}

/**
 * The whole panel frame every plugin configuration panel repeats: the browser
 * preflight and its notice, `PanelRoot`, the panel announcer, an outer
 * `Stack`, an optional title, the theme toggle, and an error boundary around
 * the consumer's content.
 */
export function PanelShell({
  children,
  className,
  defaultTheme,
  description,
  errorFallback,
  errorLabels,
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
  unsupportedLabels,
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
    // The consumer's own attributes reach the notice, so a host that finds
    // the panel by id or a data attribute still finds something here. The
    // panel ref does not: this branch renders a section, not the panel div.
    return (
      unsupported ?? (
        <UnsupportedBrowserNotice
          {...htmlProps}
          {...(blocker === "react"
            ? { children: reactFloorMessage(version) }
            : {})}
          {...unsupportedLabels}
          className={className}
          headingLevel={headingLevel}
        />
      )
    );
  }

  const hasTitle = hasReactContent(title);
  const hasDescription = hasReactContent(description);
  const Heading = hasTitle ? HEADING_ELEMENTS[headingLevel] : undefined;
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
      className={className}
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
          <Stack {...definedProps({ gap })}>
            {hasTitle || hasDescription ? (
              <div className="snui-panel-shell__header">
                {Heading === undefined ? null : (
                  <Heading className="snui-panel-shell__title">{title}</Heading>
                )}
                {hasDescription ? (
                  <div className="snui-panel-shell__description">
                    {description}
                  </div>
                ) : null}
              </div>
            ) : null}
            {placement === "between" ? toggle : null}
            <PanelErrorBoundary
              {...errorLabels}
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
