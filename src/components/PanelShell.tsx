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

/** Where the theme toggle sits: after the content, between title and content, or nowhere. */
export type PanelShellThemeToggle = "end" | "between" | "none";

export interface PanelShellProps
  extends Omit<PanelRootProps, "children" | "onError" | "title"> {
  readonly children: ReactNode;
  /** Shown under the title. */
  readonly description?: ReactNode | undefined;
  /** Replaces the default error fallback; see `PanelErrorBoundary`. */
  readonly errorFallback?: PanelErrorBoundaryProps["fallback"];
  /** Gap of the outer Stack, default 4. */
  readonly gap?: SpaceScale | undefined;
  /**
   * Level of the panel title, default 2. Signal K Admin renders the plugin
   * card header as an `h5` and the page title as its own heading, so a panel
   * must not add another `h1`.
   */
  readonly headingLevel?: HeadingLevel | undefined;
  /** Called for every error the boundary catches; replaces the div's native `onError`. */
  readonly onError?: PanelErrorBoundaryProps["onError"];
  readonly onReload?: PanelErrorBoundaryProps["onReload"];
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
    themeToggle === "none" ? null : <ThemeToggle {...themeToggleProps} />;

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
