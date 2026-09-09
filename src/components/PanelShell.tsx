import { type ReactNode, useState } from "react";

import { supportsNativeCssScope } from "../styles/install.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { hasReactContent } from "../utils/react-node.js";
import { type SpaceScale, Stack } from "./Layout.js";
import {
  PanelErrorBoundary,
  type PanelErrorBoundaryProps,
} from "./PanelErrorBoundary.js";
import { PanelRoot, type PanelRootProps } from "./PanelRoot.js";
import { ThemeToggle, type ThemeToggleProps } from "./ThemeToggle.js";
import { UnsupportedBrowserNotice } from "./UnsupportedBrowserNotice.js";

/**
 * Where the theme toggle sits: after the content, between title and content,
 * or nowhere. Either placement aligns it to the trailing edge.
 */
export type PanelShellThemeToggle = "end" | "between" | "none";

/**
 * Text of the default error fallback, for a panel that ships in another
 * language. `title` and `description` here name the fallback, not the panel.
 */
export type PanelShellErrorLabels = Pick<
  PanelErrorBoundaryProps,
  "description" | "reloadLabel" | "retryLabel" | "title"
>;

export interface PanelShellProps
  extends Omit<PanelRootProps, "children" | "onError" | "title"> {
  readonly children: ReactNode;
  /** Shown under the title. */
  readonly description?: ReactNode | undefined;
  /** Replaces the default error fallback; see `PanelErrorBoundary`. */
  readonly errorFallback?: PanelErrorBoundaryProps["fallback"] | undefined;
  /** Text of the default error fallback; ignored when `errorFallback` is set. */
  readonly errorLabels?: PanelShellErrorLabels | undefined;
  /** Gap of the outer Stack, default 4. */
  readonly gap?: SpaceScale | undefined;
  /**
   * Level of the panel title, default 2. Signal K Admin renders the plugin
   * card header as an `h5` and the page title as its own heading, so a panel
   * must not add another `h1`.
   */
  readonly headingLevel?: HeadingLevel | undefined;
  /** Called for every error the boundary catches; replaces the div's native `onError`. */
  readonly onError?: PanelErrorBoundaryProps["onError"] | undefined;
  readonly onReload?: PanelErrorBoundaryProps["onReload"] | undefined;
  readonly themeToggle?: PanelShellThemeToggle | undefined;
  readonly themeToggleProps?: ThemeToggleProps | undefined;
  readonly title?: ReactNode | undefined;
  /** Rendered instead of the panel when the browser lacks native CSS scope. */
  readonly unsupported?: React.JSX.Element | undefined;
}

/**
 * The whole panel frame every plugin configuration panel repeats: the browser
 * preflight and its notice, `PanelRoot`, an outer `Stack`, an optional title,
 * the theme toggle, and an error boundary around the consumer's content.
 */
export function PanelShell({
  children,
  className,
  description,
  errorFallback,
  errorLabels,
  gap = 4,
  headingLevel = 2,
  onError,
  onReload,
  themeToggle = "end",
  themeToggleProps,
  title,
  unsupported,
  ...rootProps
}: PanelShellProps): React.JSX.Element {
  // Engine support cannot change while the page lives, so one check at mount
  // decides the frame for the whole session.
  const [supported] = useState(() =>
    supportsNativeCssScope(typeof window === "undefined" ? undefined : window),
  );

  if (!supported) {
    return (
      unsupported ?? <UnsupportedBrowserNotice headingLevel={headingLevel} />
    );
  }

  const Heading = HEADING_ELEMENTS[headingLevel];
  const hasTitle = hasReactContent(title);
  const toggle =
    themeToggle === "none" ? null : (
      // The selector is a control over the panel, not one of its sections, so
      // the shell keeps it at the trailing edge of the single-column stack.
      <div className="snui-panel-shell__theme-toggle">
        <ThemeToggle {...themeToggleProps} />
      </div>
    );

  return (
    <PanelRoot {...rootProps} className={className}>
      <Stack gap={gap}>
        {hasTitle ? (
          <div className="snui-panel-shell__header">
            <Heading className="snui-panel-shell__title">{title}</Heading>
            {hasReactContent(description) ? (
              <div className="snui-panel-shell__description">{description}</div>
            ) : null}
          </div>
        ) : null}
        {themeToggle === "between" ? toggle : null}
        <PanelErrorBoundary
          {...errorLabels}
          fallback={errorFallback}
          onError={onError}
          onReload={onReload}
        >
          {children}
        </PanelErrorBoundary>
        {themeToggle === "end" ? toggle : null}
      </Stack>
    </PanelRoot>
  );
}
