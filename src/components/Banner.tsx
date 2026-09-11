import {
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type RefAttributes,
  type RefObject,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
} from "react";

import {
  type AnnouncementMode,
  announcesUpdates,
  liveRegionProps,
} from "../utils/announcement.js";
import { hasAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { DEFAULT_DISMISS_LABEL, resolveLabel } from "../utils/labels.js";
import { hasReactContent } from "../utils/react-node.js";
import { composeRef } from "../utils/ref.js";
import type { StatusTone } from "../utils/tone.js";
import { Button } from "./Button.js";
import { ToneMark } from "./ToneMark.js";

export type BannerTone = StatusTone;
/** @deprecated Use `AnnouncementMode`. */
export type BannerLive = AnnouncementMode;

export interface BannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-live" | "title">,
    RefAttributes<HTMLDivElement> {
  readonly actions?: ReactNode | undefined;
  /**
   * Where focus goes when the banner takes it away: the Dismiss press, and any
   * other change that removes the banner, or the actions inside it, while the
   * user is standing there. A Retry in `actions` that clears the error it
   * reports is the common one.
   */
  readonly dismissFocusRef?: RefObject<HTMLElement | null> | undefined;
  readonly dismissLabel?: string | undefined;
  /**
   * Announces the banner's own updates. Render the banner whenever the panel
   * can produce one and let its content go empty, rather than mounting it
   * beside the first message; an empty announcing banner renders as a shell
   * that occupies no space.
   */
  readonly live?: AnnouncementMode | undefined;
  readonly onDismiss?:
    | ((event: MouseEvent<HTMLButtonElement>) => void)
    | undefined;
  readonly title?: ReactNode | undefined;
  readonly tone?: BannerTone | undefined;
  readonly toneLabel?: string | undefined;
}

export function Banner({
  actions,
  children,
  className,
  dismissFocusRef,
  dismissLabel = DEFAULT_DISMISS_LABEL,
  live,
  onDismiss,
  ref,
  role: suppliedRole,
  title,
  tone = "info",
  toneLabel,
  ...props
}: BannerProps): React.JSX.Element {
  const region = liveRegionProps(live, suppliedRole);
  const announcing = announcesUpdates(region);
  const hasActions = hasReactContent(actions) || onDismiss !== undefined;
  const hasTitle = hasReactContent(title);
  const effectiveDismissLabel = resolveLabel(
    dismissLabel,
    DEFAULT_DISMISS_LABEL,
  );
  // An announcing banner keeps its region mounted so a screen reader observes
  // it before the first message arrives. With nothing to show it renders as an
  // empty shell, which the stylesheet takes out of the flow, so it paints no
  // box, border, padding, or margin while it waits. Tone chrome is part of a
  // message, so it waits with the rest.
  const silent =
    announcing && !hasActions && !hasTitle && !hasReactContent(children);

  const generatedTitleId = useId();
  /*
   * A landmark role a consumer supplies needs an accessible name, and the
   * banner already shows one. Naming it by the title keeps the two from
   * drifting, which an `aria-label` repeating the same words cannot. A live
   * role is left unnamed: it announces its own contents, so a name taken from
   * those contents would only read the title twice.
   */
  const titleId =
    suppliedRole !== undefined &&
    !announcing &&
    hasTitle &&
    !hasAccessibleName(props["aria-label"], props["aria-labelledby"])
      ? generatedTitleId
      : undefined;
  // Spread rather than written out, so the name reaches the element only
  // beside the role that needs one and a banner with no role stays a plain div.
  const nameProps = titleId === undefined ? {} : { "aria-labelledby": titleId };

  const bannerRef = useRef<HTMLDivElement | null>(null);
  /*
   * Whether the banner holds focus, sampled as focus moves rather than read
   * when the banner goes away. Removing it, or the actions inside it, blurs
   * what it held first, so by the time any cleanup could look, the answer is
   * already gone.
   */
  const holdsFocus = useRef(false);

  // One callback ref owns the node so a caller ref is attached and released
  // exactly once per mount, instead of on every commit.
  const attachBanner = useCallback(
    (node: HTMLDivElement): (() => void) => {
      bannerRef.current = node;
      const releaseRef = composeRef(ref, node);
      return () => {
        bannerRef.current = null;
        releaseRef();
      };
    },
    [ref],
  );

  const trackFocus = useEffectEvent((event: FocusEvent): void => {
    const ownerWindow = bannerRef.current?.ownerDocument.defaultView;
    holdsFocus.current =
      ownerWindow !== null &&
      ownerWindow !== undefined &&
      event.target instanceof ownerWindow.Node &&
      (bannerRef.current?.contains(event.target) ?? false);
  });

  // The destination is read as the banner goes, not when the effect is set up,
  // because a panel may render it in the same commit that takes the banner
  // away.
  const handOffFocus = useEffectEvent((): void => {
    if (!holdsFocus.current) return;
    holdsFocus.current = false;
    dismissFocusRef?.current?.focus();
  });

  /*
   * The destination serves every way the banner takes focus away, not the
   * Dismiss button alone. A consumer action that clears the condition the
   * banner reports, the natural shape for a Retry on an error banner, unmounts
   * the banner under the user's own focus, and an announcing banner whose
   * content goes empty removes its actions the same way; both leave the reader
   * on the body with no route back. The move is synchronous, so a panel that
   * focuses the content it renders in place of the banner still wins.
   */
  useEffect(() => {
    const ownerDocument = bannerRef.current?.ownerDocument;
    if (
      ownerDocument === undefined ||
      dismissFocusRef === undefined ||
      silent
    ) {
      return undefined;
    }

    ownerDocument.addEventListener("focusin", trackFocus);
    return () => {
      ownerDocument.removeEventListener("focusin", trackFocus);
      handOffFocus();
    };
  }, [dismissFocusRef, silent]);

  return (
    <div
      {...props}
      {...nameProps}
      ref={attachBanner}
      className={classNames("snui-banner", `snui-banner--${tone}`, className)}
      role={region.role}
      aria-live={region["aria-live"]}
    >
      {silent ? null : (
        <>
          <div className="snui-banner__content">
            <ToneMark
              className="snui-banner__tone-icon"
              tone={tone}
              toneLabel={toneLabel}
            />
            <div className="snui-banner__text">
              {hasTitle ? (
                <>
                  <div className="snui-banner__title" id={titleId}>
                    {title}
                  </div>
                  {/* Stops the title and the body running together for a
                      reader taking the banner in one pass. It sits beside the
                      title rather than inside it, so a landmark named by the
                      title is not named "Provider unavailable .". */}
                  <span className="snui-visually-hidden">. </span>
                </>
              ) : null}
              <div className="snui-banner__body">{children}</div>
            </div>
          </div>
          {hasActions ? (
            <div className="snui-banner__actions">
              {actions}
              {onDismiss !== undefined ? (
                <Button
                  variant="ghost"
                  size="compact"
                  onClick={(event) => {
                    onDismiss(event);
                    if (dismissFocusRef !== undefined) {
                      // The press moves focus whether or not the dismissal
                      // takes the banner away, so the sample is spent here and
                      // the teardown above does not move it a second time. The
                      // wait lets the commit the press causes land first.
                      holdsFocus.current = false;
                      queueMicrotask(() => dismissFocusRef.current?.focus());
                    }
                  }}
                >
                  {effectiveDismissLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
