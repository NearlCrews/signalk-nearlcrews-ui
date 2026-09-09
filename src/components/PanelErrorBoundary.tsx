import { Component, type ErrorInfo, type ReactNode } from "react";

import { Banner } from "./Banner.js";
import { Button } from "./Button.js";

export interface PanelErrorBoundaryFallbackProps {
  readonly error: unknown;
  /** Present when the boundary was given `onReload`. */
  readonly reload: (() => void) | undefined;
  /** Clears the caught error and renders the children again. */
  readonly reset: () => void;
}

export interface PanelErrorBoundaryProps {
  readonly children: ReactNode;
  /** Body text of the default fallback. */
  readonly description?: ReactNode | undefined;
  /** Replaces the default fallback. Receives the error and the two actions. */
  readonly fallback?:
    | ((props: PanelErrorBoundaryFallbackProps) => ReactNode)
    | undefined;
  /** Called once per caught error, for logging to the server or console. */
  readonly onError?: ((error: unknown, info: ErrorInfo) => void) | undefined;
  /**
   * Adds a secondary action for the case where a retry cannot help, such as
   * reloading the Admin page. The boundary never reloads on its own.
   */
  readonly onReload?: (() => void) | undefined;
  readonly reloadLabel?: ReactNode | undefined;
  readonly retryLabel?: ReactNode | undefined;
  /** Title of the default fallback. */
  readonly title?: ReactNode | undefined;
}

interface PanelErrorBoundaryState {
  readonly error: unknown;
  readonly failed: boolean;
}

const DEFAULT_TITLE = "This panel stopped working";
const DEFAULT_DESCRIPTION =
  "Try again to reload the panel's content. Your unsaved changes may be lost.";
const DEFAULT_RETRY_LABEL = "Try again";
const DEFAULT_RELOAD_LABEL = "Reload page";

/**
 * Catches a render error inside the panel and offers recovery in place,
 * instead of letting Signal K Admin replace the whole plugin card with its
 * generic unavailable notice. Render it inside PanelRoot so the fallback is
 * styled; `PanelShell` does this for you.
 */
export class PanelErrorBoundary extends Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  static getDerivedStateFromError(error: unknown): PanelErrorBoundaryState {
    return { error, failed: true };
  }

  override state: PanelErrorBoundaryState = { error: undefined, failed: false };

  private readonly reset = (): void => {
    this.setState({ error: undefined, failed: false });
  };

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    const {
      children,
      description = DEFAULT_DESCRIPTION,
      fallback,
      onReload,
      reloadLabel = DEFAULT_RELOAD_LABEL,
      retryLabel = DEFAULT_RETRY_LABEL,
      title = DEFAULT_TITLE,
    } = this.props;
    if (!this.state.failed) return children;

    if (fallback !== undefined) {
      return fallback({
        error: this.state.error,
        reload: onReload,
        reset: this.reset,
      });
    }

    return (
      <Banner
        tone="danger"
        live="assertive"
        title={title}
        actions={
          <>
            <Button variant="primary" onClick={this.reset}>
              {retryLabel}
            </Button>
            {onReload === undefined ? null : (
              <Button onClick={onReload}>{reloadLabel}</Button>
            )}
          </>
        }
      >
        {description}
      </Banner>
    );
  }
}
