import type { ReactNode } from "react";
import { usePanelTheme } from "../theme/context.js";
import { THEME_CHOICES, type ThemeChoice } from "../theme/contract.js";
import { hasReactContent } from "../utils/react-node.js";
import {
  SegmentedControl,
  type SegmentedControlProps,
} from "./SegmentedControl.js";

export interface ThemeToggleProps
  extends Omit<
    SegmentedControlProps<ThemeChoice>,
    | "defaultValue"
    | "label"
    | "legend"
    | "onChange"
    | "onValueChange"
    | "options"
    | "value"
  > {
  readonly choices?: readonly ThemeChoice[] | undefined;
  /** Accessible name of the theme group. Blank falls back to "Panel theme". */
  readonly label?: ReactNode | undefined;
  /** Visible label per theme choice. Blank entries fall back to the default. */
  readonly labels?:
    | Partial<Readonly<Record<ThemeChoice, ReactNode>>>
    | undefined;
  /** @deprecated Use `label`. */
  readonly legend?: ReactNode | undefined;
  /** Receives the chosen theme after the shared preference has been updated. */
  readonly onValueChange?: ((theme: ThemeChoice) => void) | undefined;
  /** @deprecated Use `onValueChange`. */
  readonly onChange?: ((theme: ThemeChoice) => void) | undefined;
}

const DEFAULT_THEME_TOGGLE_LABEL = "Panel theme";

const THEME_LABELS: Readonly<Record<ThemeChoice, string>> = {
  auto: "Auto",
  system: "System",
  light: "Light",
  dark: "Dark",
  night: "Night",
};

export function ThemeToggle({
  choices = THEME_CHOICES,
  label,
  labels,
  legend,
  onChange,
  onValueChange,
  ...props
}: ThemeToggleProps): React.JSX.Element {
  const { setTheme, theme } = usePanelTheme();
  const options = choices.map((value) => ({
    label: hasReactContent(labels?.[value])
      ? labels?.[value]
      : THEME_LABELS[value],
    value,
  }));
  const groupLabel = hasReactContent(label)
    ? label
    : hasReactContent(legend)
      ? legend
      : DEFAULT_THEME_TOGGLE_LABEL;

  return (
    <SegmentedControl
      {...props}
      label={groupLabel}
      options={options}
      value={theme}
      onValueChange={(value) => {
        setTheme(value);
        onValueChange?.(value);
        onChange?.(value);
      }}
    />
  );
}
