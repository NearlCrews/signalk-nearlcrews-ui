import {
  type ButtonHTMLAttributes,
  createContext,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";

import { hasAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import type { Orientation } from "../utils/variants.js";

/** `"automatic"` selects a tab as arrow keys focus it; `"manual"` waits for Enter or Space. */
export type TabsActivation = "automatic" | "manual";

interface TabsContextValue {
  readonly activation: TabsActivation;
  readonly baseId: string;
  readonly orientation: Orientation;
  readonly select: (value: string) => void;
  readonly selected: string | undefined;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const value = useContext(TabsContext);
  if (value === null) {
    throw new Error(`${component} must be rendered inside Tabs.`);
  }
  return value;
}

function tabId(baseId: string, value: string): string {
  return `${baseId}-tab-${encodeURIComponent(value)}`;
}

function panelId(baseId: string, value: string): string {
  return `${baseId}-panel-${encodeURIComponent(value)}`;
}

export interface TabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange">,
    RefAttributes<HTMLDivElement> {
  readonly activation?: TabsActivation | undefined;
  readonly children: ReactNode;
  /** Value of the initially selected tab when uncontrolled. */
  readonly defaultValue?: string | undefined;
  readonly onValueChange?: ((value: string) => void) | undefined;
  readonly orientation?: Orientation | undefined;
  /** Value of the selected tab when controlled. */
  readonly value?: string | undefined;
}

/**
 * A tab interface following the ARIA tabs pattern: one tab stop into the list,
 * arrows move between tabs, Home and End jump to the ends, and each panel is
 * labeled by its tab. Give every Tab and TabPanel the same `value`.
 */
export function Tabs({
  activation = "automatic",
  children,
  className,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  ref,
  value,
  ...props
}: TabsProps): React.JSX.Element {
  const baseId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selected = value ?? internalValue;

  const select = useCallback(
    (next: string): void => {
      if (next === selected) return;
      if (value === undefined) setInternalValue(next);
      onValueChange?.(next);
    },
    [onValueChange, selected, value],
  );

  const context = useMemo(
    () => ({ activation, baseId, orientation, select, selected }),
    [activation, baseId, orientation, select, selected],
  );

  return (
    <TabsContext value={context}>
      <div
        {...props}
        ref={ref}
        className={classNames(
          "snui-tabs",
          `snui-tabs--${orientation}`,
          className,
        )}
      >
        {children}
      </div>
    </TabsContext>
  );
}

export interface TabListProps
  extends HTMLAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

const TAB_SELECTOR = '[role="tab"]:not(:disabled)';

/**
 * Moves focus among the enabled tabs of the list the pressed tab belongs to.
 * Reading the list from the DOM keeps the order and the disabled state
 * authoritative without registering each tab.
 */
function moveFocus(
  event: KeyboardEvent<HTMLButtonElement>,
  orientation: Orientation,
  activation: TabsActivation,
  select: (value: string) => void,
): void {
  const list = event.currentTarget.closest('[role="tablist"]');
  if (list === null) return;
  const tabs = Array.from(
    list.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR),
  );
  const current = tabs.indexOf(event.currentTarget);
  if (current === -1) return;

  const rtl = list.matches(":dir(rtl)");
  const forwardKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
  const backwardKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  // Horizontal arrows follow document direction; vertical ones never mirror.
  const step = rtl && orientation === "horizontal" ? -1 : 1;
  let next: number;
  switch (event.key) {
    case forwardKey:
      next = current + step;
      break;
    case backwardKey:
      next = current - step;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = tabs.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  const target = tabs[(next + tabs.length) % tabs.length];
  if (target === undefined) return;
  target.focus();
  if (activation === "automatic") {
    const value = target.dataset.snuiTabValue;
    if (value !== undefined) select(value);
  }
}

/** The `tablist`. It needs an accessible name: pass `aria-label` or `aria-labelledby`. */
export function TabList({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  ref,
  ...props
}: TabListProps): React.JSX.Element {
  if (!hasAccessibleName(ariaLabel, ariaLabelledBy)) {
    throw new Error(
      "TabList requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
    );
  }
  const { orientation } = useTabsContext("TabList");

  return (
    <div
      {...props}
      ref={ref}
      role="tablist"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-orientation={orientation}
      className={classNames("snui-tablist", className)}
    >
      {children}
    </div>
  );
}

export interface TabProps
  extends Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "role" | "type" | "value"
    >,
    RefAttributes<HTMLButtonElement> {
  /** A count or `Badge` shown after the label; it joins the tab's name. */
  readonly badge?: ReactNode | undefined;
  readonly children: ReactNode;
  readonly value: string;
}

export function Tab({
  badge,
  children,
  className,
  onClick,
  onKeyDown,
  ref,
  value,
  ...props
}: TabProps): React.JSX.Element {
  requireContent(children, "Tab requires a non-empty label.");
  const { activation, baseId, orientation, select, selected } =
    useTabsContext("Tab");
  const isSelected = selected === value;

  return (
    <button
      {...props}
      ref={ref}
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      aria-selected={isSelected}
      aria-controls={panelId(baseId, value)}
      tabIndex={isSelected ? 0 : -1}
      data-snui-tab-value={value}
      className={classNames("snui-tab", className)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        select(value);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        moveFocus(event, orientation, activation, select);
      }}
    >
      <span className="snui-tab__label">{children}</span>
      {hasReactContent(badge) ? (
        // The space keeps the badge from fusing with the label in the name.
        <>
          {" "}
          <span className="snui-tab__badge">{badge}</span>
        </>
      ) : null}
    </button>
  );
}

export interface TabPanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "hidden" | "id" | "role">,
    RefAttributes<HTMLDivElement> {
  readonly children?: ReactNode | undefined;
  /** Removes the hidden panels' children while another tab is selected. */
  readonly mountStrategy?: "retain" | "unmount" | undefined;
  readonly value: string;
}

/**
 * The panel a tab controls. It is focusable so a keyboard user can Tab from
 * the list straight into its content even when the panel holds no control.
 */
export function TabPanel({
  children,
  className,
  mountStrategy = "retain",
  ref,
  value,
  ...props
}: TabPanelProps): React.JSX.Element {
  const { baseId, selected } = useTabsContext("TabPanel");
  const isSelected = selected === value;

  return (
    <div
      {...props}
      ref={ref}
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      // The tabs pattern puts the panel in the tab sequence so a keyboard
      // user reaches content that holds no control of its own.
      // biome-ignore lint/a11y/noNoninteractiveTabindex: see above
      tabIndex={0}
      hidden={!isSelected}
      className={classNames("snui-tabpanel", className)}
    >
      {mountStrategy === "unmount" && !isSelected ? null : children}
    </div>
  );
}
