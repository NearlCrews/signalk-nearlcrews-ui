import type { ReactNode } from "react";
import { usePanelTheme } from "../theme/context.js";
import { THEME_CHOICES, type ThemeChoice } from "../theme/contract.js";
import { hasReactContent } from "../utils/react-node.js";
import { SegmentedControl } from "./SegmentedControl.js";

export interface ThemeToggleProps {
  readonly className?: string;
  readonly legend?: ReactNode;
}

const THEME_LABELS: Readonly<Record<ThemeChoice, string>> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
  night: "Night",
};

const THEME_OPTIONS = THEME_CHOICES.map((value) => ({
  label: THEME_LABELS[value],
  value,
}));

export function ThemeToggle({
  className,
  legend = "Panel theme",
}: ThemeToggleProps): React.JSX.Element {
  const { setTheme, theme } = usePanelTheme();

  return (
    <SegmentedControl
      {...(className === undefined ? {} : { className })}
      legend={hasReactContent(legend) ? legend : "Panel theme"}
      options={THEME_OPTIONS}
      value={theme}
      onChange={setTheme}
    />
  );
}
