import type { HTMLAttributes, ReactNode, RefAttributes } from "react";
import {
  Label,
  ProgressBar,
  type ProgressBarProps as RACProgressBarProps,
} from "react-aria-components";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import type { SemanticTone } from "../utils/tone.js";

export type ProgressTone = SemanticTone;

export interface ProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    RefAttributes<HTMLDivElement> {
  readonly label: ReactNode;
  readonly max?: number | undefined;
  readonly min?: number | undefined;
  /** Recolors the fill. Omit for the accent fill. */
  readonly tone?: ProgressTone | undefined;
  /** Current value. Omit for an indeterminate indicator. */
  readonly value?: number | undefined;
  /** Exposed as aria-valuetext for assistive technology. */
  readonly valueText?: string | undefined;
}

export function Progress({
  className,
  label,
  max = 100,
  min = 0,
  ref,
  tone,
  value,
  valueText,
  ...props
}: ProgressProps): React.JSX.Element {
  if (!hasReactContent(label)) {
    throw new Error("Progress requires a non-empty label.");
  }

  const indeterminate = value === undefined;
  const span = max - min;
  const percentage =
    indeterminate || span <= 0
      ? 0
      : Math.min(Math.max(((value - min) / span) * 100, 0), 100);

  // react-aria's optional DOM props are not declared with `| undefined`,
  // which makes the target unexpressible for a React HTMLAttributes spread
  // under exactOptionalPropertyTypes. The rest props are plain DOM
  // attributes, so this boundary assertion is sound.
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
      minValue={min}
      maxValue={max}
      {...(indeterminate ? { isIndeterminate: true } : { value })}
      {...(valueText === undefined ? {} : { valueLabel: valueText })}
    >
      <Label className="snui-progress__label">{label}</Label>
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
