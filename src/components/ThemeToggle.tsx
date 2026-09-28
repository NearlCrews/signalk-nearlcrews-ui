import { type ReactNode, useCallback, useMemo } from "react";
import { usePanelTheme } from "../theme/context.js";
import { THEME_CHOICES, type ThemeChoice } from "../theme/contract.js";
import { resolveBundledContent, resolveLabel } from "../utils/labels.js";
import { THEME_TOGGLE_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
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
   * Visible name per theme choice, keyed by choice. A blank or missing entry
   * falls back to the panel bundle's `themeToggle.choiceLabels`, then to the
   * package default.
   */
  readonly choiceLabels?:
    | Partial<Readonly<Record<ThemeChoice, ReactNode>>>
    | undefined;
  /**
   * The themes to offer, default all five. The active theme is always offered
   * even when it is left out, so the control can never show a panel whose
   * theme has no segment; an empty list is a caller error and throws.
   */
  readonly choices?: readonly ThemeChoice[] | undefined;
  /**
   * Guidance under the group name. It defaults to a sentence saying what
   * Match Admin resolves to, whenever that choice is offered, because Signal K
   * Admin shares no theme today and the choice therefore looks identical to
   * Light. Pass `null` to drop it.
   */
  readonly description?: ReactNode | undefined;
  /** Accessible name of the theme group. Blank falls back to "Panel theme". */
  readonly label?: ReactNode | undefined;
  /** Receives the chosen theme after the shared preference has been updated. */
  readonly onValueChange?: ((theme: ThemeChoice) => void) | undefined;
}

export function ThemeToggle({
  choiceLabels,
  choices = THEME_CHOICES,
  description,
  label,
  labelVisibility = "visible",
  onValueChange,
  ...props
}: ThemeToggleProps): React.JSX.Element {
  const { setTheme, theme } = usePanelTheme();
  const bundledLabels = usePanelLabels()?.themeToggle;
  const bundledChoiceLabels = bundledLabels?.choiceLabels;

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
    return offered.map((value) => ({
      // A supported test hook, so a consumer test finds a theme by its value
      // rather than by wording a translation or a copy change can move.
      dataAttributes: { "data-snui-theme-choice": value },
      label: resolveBundledContent(
        choiceLabels?.[value],
        bundledChoiceLabels?.[value],
        THEME_TOGGLE_LABEL_DEFAULTS.choiceLabels[value],
      ),
      value,
    }));
  }, [bundledChoiceLabels, choiceLabels, choices, theme]);

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
            resolveLabel(
              bundledLabels?.description,
              THEME_TOGGLE_LABEL_DEFAULTS.description,
            )
          : description
      }
      label={resolveBundledContent(
        label,
        bundledLabels?.label,
        THEME_TOGGLE_LABEL_DEFAULTS.label,
      )}
      labelVisibility={labelVisibility}
      options={options}
      value={theme}
      onValueChange={handleValueChange}
    />
  );
}
