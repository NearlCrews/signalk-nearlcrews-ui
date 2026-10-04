import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
} from "react";

import { usePanelAnnouncer } from "../utils/announcer.js";
import { focusedElement, focusIsOnBody } from "../utils/focus.js";
import { useContentHeading } from "../utils/heading-level.js";
import { resolveBundledContent } from "../utils/labels.js";
import { PANEL_ERROR_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { reactNodeText } from "../utils/react-node.js";
import { joinSentences } from "../utils/text.js";
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
  /**
   * Body text of the default fallback when it offers Try again alone. Blank
   * text reads as absent, like every other label here.
   */
  readonly description?: ReactNode | undefined;
  /**
   * Replaces the default fallback. Receives the error and the two actions.
   * A fallback of your own owns the whole recovery surface: the boundary
   * neither styles it, moves focus into it, nor announces it.
   */
  readonly fallback?:
    | ((props: PanelErrorBoundaryFallbackProps) => ReactNode)
    | undefined;
  /**
   * Called once per caught error, for logging to the server. It is additive:
   * the boundary records every caught error on the console whether or not a
   * handler is given, so a crash aboard leaves a trail either way.
   */
  readonly onError?: ((error: unknown, info: ErrorInfo) => void) | undefined;
  /**
   * Adds a secondary action for the case where a retry cannot help, such as
   * reloading the Admin page. The boundary never reloads on its own.
   */
  readonly onReload?: (() => void) | undefined;
  /**
   * Body text of the default fallback when it also offers the reload action,
   * which is where the warning about unsaved changes belongs.
   */
  readonly reloadDescription?: ReactNode | undefined;
  /** Label of the reload action, default "Reload page". */
  readonly reloadLabel?: ReactNode | undefined;
  /** Label of the retry action, default "Try again". */
  readonly retryLabel?: ReactNode | undefined;
  /** Title of the default fallback, default "This panel stopped working". */
  readonly title?: ReactNode | undefined;
}

interface PanelErrorBoundaryState {
  readonly error: unknown;
  readonly failed: boolean;
}

type PanelErrorFallbackProps = Pick<
  PanelErrorBoundaryProps,
  | "description"
  | "onReload"
  | "reloadDescription"
  | "reloadLabel"
  | "retryLabel"
  | "title"
> & {
  readonly onRetry: () => void;
};

function PanelErrorFallback({
  description: suppliedDescription,
  onReload,
  onRetry,
  reloadDescription: suppliedReloadDescription,
  reloadLabel: suppliedReloadLabel,
  retryLabel: suppliedRetryLabel,
  title: suppliedTitle,
}: PanelErrorFallbackProps): React.JSX.Element {
  // Resolved here rather than in the boundary, because a class component
  // cannot read the panel's label bundle and the fallback is the only place
  // these strings are used. Blank text reads as absent at each step, so a
  // partial translation can never leave the recovery action unnamed.
  const bundledLabels = usePanelLabels()?.panelError;
  const defaults = PANEL_ERROR_LABEL_DEFAULTS;
  const title = resolveBundledContent(
    suppliedTitle,
    bundledLabels?.title,
    defaults.title,
  );
  const retryLabel = resolveBundledContent(
    suppliedRetryLabel,
    bundledLabels?.retry,
    defaults.retry,
  );
  const reloadLabel = resolveBundledContent(
    suppliedReloadLabel,
    bundledLabels?.reload,
    defaults.reload,
  );
  // Each description names only the actions on screen, so the one that
  // warns about the reload appears only beside the reload action.
  const description =
    onReload === undefined
      ? resolveBundledContent(
          suppliedDescription,
          bundledLabels?.description,
          defaults.description,
        )
      : resolveBundledContent(
          suppliedReloadDescription,
          bundledLabels?.reloadDescription,
          defaults.reloadDescription,
        );
  const announce = usePanelAnnouncer();
  const { level: headingLevel } = useContentHeading();
  const fallbackElement = useRef<HTMLDivElement | null>(null);

  const reportFailure = useEffectEvent((): void => {
    const node = fallbackElement.current;
    if (node === null) return;

    const { ownerDocument } = node;
    // The crashed subtree took the focused control with it, so a keyboard
    // reader is left on the body, a whole Admin page away from the recovery
    // action. Focusing the fallback puts them on it and reads it out, which
    // also beats an alert that entered the DOM carrying its first message.
    if (
      focusedElement(ownerDocument) === null ||
      focusIsOnBody(ownerDocument)
    ) {
      node.focus();
      return;
    }
    // Focus is somewhere else entirely, and taking it would pull the operator
    // out of whatever they were doing, so the panel's announcer says what
    // happened through a region that was mounted long before this message.
    // Each part closes its own sentence, so a title that already ends in one
    // is not read as two and a title ending in "!" keeps its own mark.
    const spoken = joinSentences([
      reactNodeText(title),
      reactNodeText(description),
    ]);
    if (spoken.length > 0) announce(spoken, { assertive: true });
  });

  // Mounting the fallback is the moment the boundary caught, so the failure is
  // reported once: a later render of the same fallback neither re-announces
  // it nor takes focus a second time. The latch is what holds that through a
  // replayed mount effect, which StrictMode makes at once and a retained
  // CollapsibleSection makes on every expand. A retry that fails again mounts
  // a new fallback, which reports again.
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    reportFailure();
  }, []);

  return (
    <Banner
      ref={fallbackElement}
      tabIndex={-1}
      tone="danger"
      title={title}
      // The fallback stands where the content it replaced was, so its title
      // takes that place in the outline: a section's level under the shell,
      // one level below the section when a section encloses the boundary, and
      // one level below the title of a dialog it sits in.
      headingLevel={headingLevel}
      actions={
        <>
          <Button variant="primary" onClick={onRetry}>
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
    // The package's own record of the failure, kept whether or not the
    // consumer wired logging, because a crash reported from a vessel is
    // otherwise guesswork: React's own reporting can be silenced by a host
    // root that overrides onCaughtError.
    console.error(
      "PanelErrorBoundary caught a render error.",
      error,
      info.componentStack,
    );
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    const {
      children,
      description,
      fallback,
      onReload,
      reloadDescription,
      reloadLabel,
      retryLabel,
      title,
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
      <PanelErrorFallback
        description={description}
        onReload={onReload}
        onRetry={this.reset}
        reloadDescription={reloadDescription}
        reloadLabel={reloadLabel}
        retryLabel={retryLabel}
        title={title}
      />
    );
  }
}
