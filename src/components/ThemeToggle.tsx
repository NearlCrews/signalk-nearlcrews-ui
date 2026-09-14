import { type ReactNode, useCallback, useMemo } from "react";
import { usePanelTheme } from "../theme/context.js";
import { THEME_CHOICES, type ThemeChoice } from "../theme/contract.js";
import { resolveBundledContent, resolveLabel } from "../utils/labels.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import {
  SegmentedControl,
  type SegmentedControlProps,
} from "./SegmentedControl.js";

export interface ThemeToggleProps
  extends Omit<
    SegmentedControlProps<ThemeChoice>,
    "defaultValue" | "label" | "onValueChange" | "options" | "value"
  > {
  /**
   * The themes to offer, default all five. The active theme is always offered
   * even when it is left out, so the control can never show a panel whose
   * theme has no segment; an empty list is a caller error and throws.
   */
  readonly choices?: readonly ThemeChoice[] | undefined;
  /**
   * Guidance under the group name. It defaults to a sentence saying what the
   * host-following choice resolves to, whenever that choice is offered,
   * because Signal K Admin publishes no theme marker today and the choice
   * therefore looks identical to Light. Pass `null` to drop it.
   */
  readonly description?: ReactNode | undefined;
  /** Accessible name of the theme group. Blank falls back to "Panel theme". */
  readonly label?: ReactNode | undefined;
  /** Visible label per theme choice. Blank entries fall back to the default. */
  readonly labels?:
    | Partial<Readonly<Record<ThemeChoice, ReactNode>>>
    | undefined;
  /** Receives the chosen theme after the shared preference has been updated. */
  readonly onValueChange?: ((theme: ThemeChoice) => void) | undefined;
}

const DEFAULT_THEME_TOGGLE_LABEL = "Panel theme";

/*
 * What "Match Admin" resolves to. Signal K Admin sets no theme marker today,
 * so an operator picking it after dark gets the Light palette and has no way
 * to tell from the segment alone.
 */
const HOST_THEME_DESCRIPTION =
  "Match Admin follows the host's theme marker, and shows Light where the host sets none.";

/*
 * Both automatic choices are named for what they follow. "Auto" and "System"
 * on their own read as the same offer, and an operator picking the wrong one
 * after dark gets the Light palette: Auto follows a host theme marker, which
 * is the Admin theme where one is set and Light where none is, while System
 * follows the device's own light or dark setting.
 */
const THEME_LABELS: Readonly<Record<ThemeChoice, string>> = {
  auto: "Match Admin",
  system: "Match device",
  light: "Light",
  dark: "Dark",
  night: "Night",
};

export function ThemeToggle({
  choices = THEME_CHOICES,
  description,
  label,
  labels,
  labelVisibility = "visible",
  onValueChange,
  ...props
}: ThemeToggleProps): React.JSX.Element {
  const { setTheme, theme } = usePanelTheme();
  const bundledLabels = usePanelLabels()?.themeToggle;
  const bundledChoiceLabels = bundledLabels?.choices;

  const options = useMemo(() => {
    // The panel renders in one theme whatever the consumer offers, and a
    // control with nothing selected says nothing about which. A theme outside
    // the list joins the end of it, and drops out again as soon as the
    // operator picks one of the offered themes. An empty list stays empty:
    // SegmentedControl reports it, and one segment would hide the mistake.
    const offered =
      choices.length === 0 || choices.includes(theme)
        ? choices
        : [...choices, theme];
    return offered.map((value) => {
      return {
        label: resolveBundledContent(
          labels?.[value],
          bundledChoiceLabels?.[value],
          THEME_LABELS[value],
        ),
        value,
      };
    });
  }, [bundledChoiceLabels, choices, labels, theme]);

  const handleValueChange = useCallback(
    (value: ThemeChoice): void => {
      setTheme(value);
      onValueChange?.(value);
    },
    [onValueChange, setTheme],
  );

  const offersHostTheme = options.some((option) => option.value === "auto");

  return (
    <SegmentedControl
      {...props}
      description={
        description === undefined && offersHostTheme
          ? // Blank bundle text reads as absent here too, so one empty entry
            // in a partial translation does not blank the guidance.
            resolveLabel(bundledLabels?.description, HOST_THEME_DESCRIPTION)
          : description
      }
      label={resolveBundledContent(
        label,
        bundledLabels?.label,
        DEFAULT_THEME_TOGGLE_LABEL,
      )}
      labelVisibility={labelVisibility}
      options={options}
      value={theme}
      onValueChange={handleValueChange}
    />
  );
}
