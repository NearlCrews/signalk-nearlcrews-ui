import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  type RefObject,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
} from "react";

import { useFocusWithin } from "../hooks/use-focus-within.js";
import { useNodeRef } from "../hooks/use-node-ref.js";
import {
  type AnnouncementMode,
  resolveAnnouncingRegion,
} from "../utils/announcement.js";
import { hasAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { DEFAULT_DISMISS_LABEL, resolveBundledLabel } from "../utils/labels.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { hasReactContent } from "../utils/react-node.js";
import { useRepeatAnnouncement } from "../utils/repeat-announcement.js";
import type { StatusTone } from "../utils/tone.js";
import { Button } from "./Button.js";
import { ToneMark } from "./ToneMark.js";

export type BannerTone = StatusTone;

export interface BannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-live" | "title">,
    RefAttributes<HTMLDivElement> {
  readonly actions?: ReactNode | undefined;
  /**
   * Change it to announce the current message again, the same words twice in a
   * row included: a screen reader compares a live region against the text it
   * last read, so an unchanged message says nothing on its own. The banner
   * withholds its message for a tenth of a second and restores it, which is
   * visible as a brief blank, so pass a key only where a repeat matters.
   * Meaningful only on an announcing banner.
   */
  readonly announceKey?: string | number | undefined;
  /**
   * Where focus goes when the banner takes it away: the Dismiss press, and any
   * other change that removes the banner, or the actions inside it, while the
   * user is standing there. A Retry in `actions` that clears the error it
   * reports is the common one.
   */
  readonly dismissFocusRef?: RefObject<HTMLElement | null> | undefined;
  /**
   * Plain text, because it becomes the Dismiss button's accessible name. A
   * blank label falls back to the default one.
   */
  readonly dismissLabel?: string | undefined;
  /**
   * Renders the title as a heading at this level instead of as a plain div.
   * Reach for it where the banner replaces content that carried headings, such
   * as a crashed panel's fallback, so the document outline keeps an entry
   * where its sections were. A banner beside content that still has its own
   * headings should leave this unset.
   */
  readonly headingLevel?: HeadingLevel | undefined;
  /**
   * Announces the banner's own updates. Render the banner whenever the panel
   * can produce one and let its content go empty, rather than mounting it
   * beside the first message; an empty announcing banner renders as a shell
   * that occupies no space.
   */
  readonly live?: AnnouncementMode | undefined;
  /**
   * Dismissal, reported as a press rather than as an event, because the button
   * belongs to the banner. Withhold it while an announcing banner has nothing
   * to say: a Dismiss is a focusable control, and a banner carrying one renders
   * in full rather than waiting as an empty shell.
   */
  readonly onDismiss?: (() => void) | undefined;
  readonly title?: ReactNode | undefined;
  readonly tone?: BannerTone | undefined;
  readonly toneLabel?: string | undefined;
}

export function Banner({
  actions,
  announceKey,
  children,
  className,
  dismissFocusRef,
  dismissLabel,
  headingLevel,
  live,
  onDismiss,
  ref,
  role: suppliedRole,
  title,
  tone = "info",
  toneLabel,
  ...props
}: BannerProps): React.JSX.Element {
  const hasActions = hasReactContent(actions) || onDismiss !== undefined;
  const hasTitle = hasReactContent(title);
  const effectiveDismissLabel = resolveBundledLabel(
    dismissLabel,
    usePanelLabels()?.banner?.dismiss,
    DEFAULT_DISMISS_LABEL,
  );
  // A div by default, because a banner normally sits beside content that
  // carries its own headings and a second entry there would misread the page.
  const TitleElement =
    headingLevel === undefined ? "div" : HEADING_ELEMENTS[headingLevel];
  // An announcing banner keeps its region mounted so a screen reader observes
  // it before the first message arrives. With nothing to show it renders as an
  // empty shell, which the stylesheet takes out of the flow, so it paints no
  // box, border, padding, or margin while it waits. Tone chrome is part of a
  // message, so it waits with the rest.
  const { announcing, attributes, silent } = resolveAnnouncingRegion(
    live,
    suppliedRole,
    hasActions || hasTitle || hasReactContent(children),
  );
  // The message alone goes for the repeat beat. Actions stay: hiding a
  // focusable control, even for a tenth of a second, would strand whoever was
  // standing on it.
  const withholding = useRepeatAnnouncement(announceKey, announcing && !silent);

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
  // One callback ref owns the node so a caller ref is attached and released
  // exactly once per mount, instead of on every commit.
  const attachBanner = useNodeRef(bannerRef, ref);
  const tracksFocus = dismissFocusRef !== undefined && !silent;
  /*
   * Whether the banner holds focus, sampled as focus moves rather than read
   * when the banner goes away. Removing it, or the actions inside it, blurs
   * what it held first, so by the time any cleanup could look, the answer is
   * already gone.
   */
  const holdsFocusRef = useFocusWithin(bannerRef, tracksFocus);

  // The destination is read as the banner goes, not when the effect is set up,
  // because a panel may render it in the same commit that takes the banner
  // away.
  const handOffFocus = useEffectEvent((): void => {
    if (!holdsFocusRef.current) return;
    holdsFocusRef.current = false;
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
   *
   * Whether a destination exists is what this watches, not which one: a caller
   * passing a fresh `{ current: node }` object each render would otherwise
   * hand focus over on every commit, pulling the caret out of whatever the
   * user was doing inside the banner.
   */
  useEffect(() => {
    if (!tracksFocus) return undefined;

    return () => {
      handOffFocus();
    };
  }, [tracksFocus]);

  return (
    <div
      {...props}
      {...nameProps}
      ref={attachBanner}
      className={classNames("snui-banner", `snui-banner--${tone}`, className)}
      role={attributes.role}
      aria-live={attributes["aria-live"]}
    >
      {silent ? null : (
        <>
          {withholding ? null : (
            <div className="snui-banner__content">
              <ToneMark
                className="snui-banner__tone-icon"
                tone={tone}
                toneLabel={toneLabel}
              />
              <div className="snui-banner__text">
                {hasTitle ? (
                  <>
                    <TitleElement className="snui-banner__title" id={titleId}>
                      {title}
                    </TitleElement>
                    {/* Stops the title and the body running together for a
                        reader taking the banner in one pass. It sits beside
                        the title rather than inside it, so a landmark named by
                        the title is not named "Provider unavailable .". */}
                    <span className="snui-visually-hidden">. </span>
                  </>
                ) : null}
                <div className="snui-banner__body">{children}</div>
              </div>
            </div>
          )}
          {hasActions ? (
            <div className="snui-banner__actions">
              {actions}
              {onDismiss !== undefined ? (
                <Button
                  variant="ghost"
                  size="compact"
                  onClick={() => {
                    onDismiss();
                    if (dismissFocusRef !== undefined) {
                      // The press moves focus whether or not the dismissal
                      // takes the banner away, so the sample is spent here and
                      // the teardown above does not move it a second time. The
                      // wait lets the commit the press causes land first.
                      holdsFocusRef.current = false;
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
