import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";
import {
  Label,
  ProgressBar,
  type ProgressBarProps as RACProgressBarProps,
} from "react-aria-components";
import { PROGRESS_STYLES } from "../styles/progress.js";
import { useOptionalModuleStyles } from "../styles/use-module-styles.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasText } from "../utils/labels.js";
import { requireContent } from "../utils/react-node.js";
import type { SemanticTone } from "../utils/tone.js";
import { ToneMark } from "./ToneMark.js";

export type ProgressTone = SemanticTone;

export interface ProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    RefAttributes<HTMLDivElement> {
  readonly label: ReactNode;
  /**
   * Bounds of the range. A pair that is not a range, one whose bounds are not
   * finite or whose end falls below its start, makes the bar indeterminate
   * rather than reaching assistive technology as an inverted or NaN range.
   */
  readonly max?: number | undefined;
  readonly min?: number | undefined;
  /**
   * Marks the bar with a tone: the fill takes the tone color, and the bar
   * takes the tone glyph beside its label and the tone word as its
   * description, so the tone survives a theme where the tone colors converge
   * and a reader that never sees them.
   */
  readonly tone?: ProgressTone | undefined;
  /** Announced name for the tone. Blank falls back to the default name. */
  readonly toneLabel?: string | undefined;
  /**
   * Current value. Omit it, or pass a non-finite number such as the NaN a
   * division by zero produces, for an indeterminate indicator.
   */
  readonly value?: number | undefined;
  /**
   * Exposed as aria-valuetext for assistive technology. An indeterminate bar
   * has no value to describe, so the text becomes the bar's description
   * instead: React Aria emits aria-valuetext only beside a value, and a bar
   * with no number left is exactly when the panel's own words matter most.
   */
  readonly valueText?: string | undefined;
}

export function Progress({
  className,
  label,
  max = 100,
  min = 0,
  ref,
  tone,
  toneLabel,
  value,
  valueText,
  ...props
}: ProgressProps): React.JSX.Element {
  useOptionalModuleStyles(PROGRESS_STYLES);

  requireContent(label, "Progress requires a non-empty label.");

  /*
   * NaN and Infinity have no place on the track or in aria-valuenow, so they
   * read as "no measurable progress yet" rather than reaching the DOM. The
   * bounds follow the same rule: a non-finite or inverted pair is not a range,
   * and passing one through would tell assistive technology the bar is
   * complete while it paints empty. A range whose ends meet is still a range,
   * and reads as no progress.
   */
  const span = max - min;
  const usableRange = Number.isFinite(span) && span >= 0;
  const indeterminate =
    !usableRange || value === undefined || !Number.isFinite(value);
  const percentage =
    indeterminate || span === 0
      ? 0
      : Math.min(Math.max(((value - min) / span) * 100, 0), 100);

  /*
   * The tone and the waiting text are a description rather than part of the
   * name: a bar is named for what it reports, and a name that changed with the
   * tone would move under a panel looking the control up by it. React Aria
   * emits aria-valuetext only beside a value, so an indeterminate bar would
   * otherwise drop the panel's own explanation of what it is waiting for,
   * which is exactly when the words matter.
   */
  const descriptionId = useId();
  const waiting = indeterminate && hasText(valueText);
  const described = tone !== undefined || waiting;
  const describedBy = described
    ? joinIdReferences(props["aria-describedby"], descriptionId)
    : undefined;

  // See RadioGroup for why the DOM prop spread needs a boundary assertion.
  const domProps = props as RACProgressBarProps;

  return (
    <ProgressBar
      {...domProps}
      ref={ref}
      className={classNames(
        "snui-progress",
        indeterminate && "snui-progress--indeterminate",
        tone === undefined ? undefined : `snui-progress--tone-${tone}`,
        className,
      )}
      {...(describedBy === undefined
        ? {}
        : { "aria-describedby": describedBy })}
      minValue={usableRange ? min : 0}
      maxValue={usableRange ? max : 100}
      {...(indeterminate ? { isIndeterminate: true } : { value })}
      {...(valueText === undefined ? {} : { valueLabel: valueText })}
    >
      <div className="snui-progress__heading">
        {described ? (
          <span className="snui-progress__tone" id={descriptionId}>
            <ToneMark
              className="snui-progress__tone-glyph"
              tone={tone ?? "neutral"}
              toneLabel={toneLabel}
            />
            {waiting ? (
              <span className="snui-visually-hidden">{valueText}</span>
            ) : null}
          </span>
        ) : null}
        <Label className="snui-progress__label">{label}</Label>
      </div>
      <div className="snui-progress__track">
        <div
          className="snui-progress__fill"
          style={
            indeterminate ? undefined : { inlineSize: `${String(percentage)}%` }
          }
        />
      </div>
    </ProgressBar>
  );
}
