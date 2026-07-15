import type { ReactNode } from "react";
import { usePanelTheme } from "../theme/context.js";
import { THEME_CHOICES, type ThemeChoice } from "../theme/contract.js";
import { hasReactContent } from "../utils/react-node.js";
import { SegmentedControl } from "./SegmentedControl.js";

export interface ThemeToggleProps {
  readonly className?: string;
  readonly labels?: Partial<Readonly<Record<ThemeChoice, ReactNode>>>;
  readonly legend?: ReactNode;
}

const THEME_LABELS: Readonly<Record<ThemeChoice, string>> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
  night: "Night",
};

export function ThemeToggle({
  className,
  labels,
  legend = "Panel theme",
}: ThemeToggleProps): React.JSX.Element {
  const { setTheme, theme } = usePanelTheme();
  const options = THEME_CHOICES.map((value) => ({
    label: hasReactContent(labels?.[value])
      ? labels?.[value]
      : THEME_LABELS[value],
    value,
  }));

  return (
    <SegmentedControl
      {...(className === undefined ? {} : { className })}
      legend={hasReactContent(legend) ? legend : "Panel theme"}
      options={options}
      value={theme}
      onChange={setTheme}
    />
  );
}
