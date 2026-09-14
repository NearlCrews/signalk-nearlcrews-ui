import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
} from "react";

import { usePanelAnnouncer } from "../utils/announcer.js";
import { focusedElement } from "../utils/focus.js";
import { useResolvedHeading } from "../utils/heading-level.js";
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
  /** Body text of the default fallback. */
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
  /** Label of the reload action, default "Reload page". */
  readonly reloadLabel?: ReactNode | undefined;
  /** Label of the retry action, default "Try again". */
  readonly retryLabel?: ReactNode | undefined;
  /** Title of the default fallback. */
  readonly title?: ReactNode | undefined;
}

interface PanelErrorBoundaryState {
  readonly error: unknown;
  readonly failed: boolean;
}

const DEFAULT_TITLE = "This panel stopped working";
/*
 * Each sentence describes the action beside it. Rebuilding the panel is the
 * light one and is offered alone; reloading the page is the one that throws
 * away every unsaved entry on the Admin page, so it carries the warning and
 * the warning is absent when the action is.
 */
const DEFAULT_DESCRIPTION = "Try again rebuilds this panel's content.";
const DEFAULT_RELOAD_DESCRIPTION = `${DEFAULT_DESCRIPTION} Reloading the page discards unsaved changes in every panel.`;
const DEFAULT_RETRY_LABEL = "Try again";
const DEFAULT_RELOAD_LABEL = "Reload page";

interface PanelErrorFallbackProps {
  readonly description: ReactNode | undefined;
  readonly onReload: (() => void) | undefined;
  readonly onRetry: () => void;
  readonly reloadLabel: ReactNode | undefined;
  readonly retryLabel: ReactNode | undefined;
  readonly title: ReactNode | undefined;
}

/** The failure as one spoken sentence, for a reader who cannot see it. */
function spokenFailure(title: ReactNode, description: ReactNode): string {
  // Each part closes its own sentence, so a title that already ends in one is
  // not read as two and a title ending in "!" keeps the mark it was written
  // with.
  return joinSentences([reactNodeText(title), reactNodeText(description)]);
}

function PanelErrorFallback({
  description: suppliedDescription,
  onReload,
  onRetry,
  reloadLabel: suppliedReloadLabel,
  retryLabel: suppliedRetryLabel,
  title: suppliedTitle,
}: PanelErrorFallbackProps): React.JSX.Element {
  // Resolved here rather than in the boundary, because a class component
  // cannot read the panel's label bundle and the fallback is the only place
  // these four strings are used.
  const bundledLabels = usePanelLabels()?.panelError;
  const title = suppliedTitle ?? bundledLabels?.title ?? DEFAULT_TITLE;
  const retryLabel =
    suppliedRetryLabel ?? bundledLabels?.retry ?? DEFAULT_RETRY_LABEL;
  const reloadLabel =
    suppliedReloadLabel ?? bundledLabels?.reload ?? DEFAULT_RELOAD_LABEL;
  const description =
    suppliedDescription ??
    bundledLabels?.description ??
    (onReload === undefined ? DEFAULT_DESCRIPTION : DEFAULT_RELOAD_DESCRIPTION);
  const announce = usePanelAnnouncer();
  const { level: headingLevel } = useResolvedHeading();
  const fallbackElement = useRef<HTMLDivElement | null>(null);

  const reportFailure = useEffectEvent((): void => {
    const node = fallbackElement.current;
    if (node === null) return;

    const { body } = node.ownerDocument;
    const focused = focusedElement(node.ownerDocument);
    // The crashed subtree took the focused control with it, so a keyboard
    // reader is left on the body, a whole Admin page away from the recovery
    // action. Focusing the fallback puts them on it and reads it out, which
    // also beats an alert that entered the DOM carrying its first message.
    if (focused === null || focused === body) {
      node.focus();
      return;
    }
    // Focus is somewhere else entirely, and taking it would pull the operator
    // out of whatever they were doing, so the panel's announcer says what
    // happened through a region that was mounted long before this message.
    const spoken = spokenFailure(title, description);
    if (spoken.length > 0) announce(spoken, { assertive: true });
  });

  // Mounting the fallback is the moment the boundary caught: the effect runs
  // once, and a later render of the same fallback neither re-announces the
  // failure nor takes focus a second time.
  useEffect(() => {
    reportFailure();
  }, []);

  return (
    <Banner
      ref={fallbackElement}
      tabIndex={-1}
      tone="danger"
      title={title}
      // The fallback stands where the panel's own sections were, so its title
      // takes their place in the outline rather than leaving the panel with a
      // heading and nothing under it.
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
        reloadLabel={reloadLabel}
        retryLabel={retryLabel}
        title={title}
      />
    );
  }
}
