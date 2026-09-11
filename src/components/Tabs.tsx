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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { TABS_STYLES } from "../styles/tabs.js";
import { useOptionalModuleStyles } from "../styles/use-module-styles.js";
import { hasAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { composeRef } from "../utils/ref.js";
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

export interface TabsProps<Value extends string = string>
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange">,
    RefAttributes<HTMLDivElement> {
  readonly activation?: TabsActivation | undefined;
  readonly children: ReactNode;
  /** Value of the initially selected tab when uncontrolled. */
  readonly defaultValue?: Value | undefined;
  /** Receives the value of the newly selected tab. */
  readonly onValueChange?: ((value: Value) => void) | undefined;
  readonly orientation?: Orientation | undefined;
  /** Value of the selected tab when controlled. */
  readonly value?: Value | undefined;
}

/**
 * A tab interface following the ARIA tabs pattern: one tab stop into the list,
 * arrows move between tabs, Home and End jump to the ends, and each panel is
 * labeled by its tab. Give every Tab and TabPanel the same `value`.
 *
 * The value type follows the consumer's own union, so `onValueChange` reports
 * it without a guard on the way back. Anything typed at the boundary pins it: a
 * `value` or `defaultValue` of that type, or an explicit `<Tabs<Category>>`.
 * Instantiate the children the same way to have their values checked too.
 */
export function Tabs<Value extends string = string>({
  activation = "automatic",
  children,
  className,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  ref,
  value,
  ...props
}: TabsProps<Value>): React.JSX.Element {
  useOptionalModuleStyles(TABS_STYLES);

  const baseId = useId();
  // The selection is `Value | undefined` while nothing is selected, but a
  // tab only ever reports a real value, so the callback stays outside the hook.
  const [selected, commitSelected] = useControllableState<Value | undefined>(
    value,
    defaultValue,
  );

  const select = useCallback(
    (next: string): void => {
      if (next === selected) return;
      // A selection carries the value the tab put in the DOM, so the union is
      // the consumer's claim about the tabs it rendered rather than something
      // this component can check.
      const nextValue = next as Value;
      commitSelected(nextValue);
      onValueChange?.(nextValue);
    },
    [commitSelected, onValueChange, selected],
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
const SELECTED_TAB_SELECTOR =
  '[role="tab"][aria-selected="true"]:not(:disabled)';

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

export interface TabProps<Value extends string = string>
  extends Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "role" | "type" | "value"
    >,
    RefAttributes<HTMLButtonElement> {
  /** A count or `Badge` shown after the label; it joins the tab's name. */
  readonly badge?: ReactNode | undefined;
  readonly children: ReactNode;
  /** Names the tab, and with it the TabPanel written with the same value. */
  readonly value: Value;
}

export function Tab<Value extends string = string>({
  badge,
  children,
  className,
  onClick,
  onKeyDown,
  ref,
  value,
  ...props
}: TabProps<Value>): React.JSX.Element {
  requireContent(children, "Tab requires a non-empty label.");
  const { activation, baseId, orientation, select, selected } =
    useTabsContext("Tab");
  const isSelected = selected === value;
  const tabNode = useRef<HTMLButtonElement | null>(null);
  const [holdsFallbackStop, setHoldsFallbackStop] = useState(false);

  // A selection matching no enabled tab, a saved value from an earlier release
  // or a value still empty while configuration loads, would otherwise leave
  // the list without a tab stop and the interface unreachable by keyboard.
  // The first enabled tab takes the stop instead, as a SegmentedControl option
  // does. The list is read from the DOM, the way arrow-key movement already
  // reads it, so its order and disabled state stay authoritative, and it is
  // read after every commit because a list can gain, lose, or disable a tab
  // without this tab's own props changing. Writing the same answer back bails
  // out of rendering, so the update chain the rule below guards against ends
  // on the first pass.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  useLayoutEffect(() => {
    const tab = tabNode.current;
    const list = tab?.closest('[role="tablist"]') ?? null;
    setHoldsFallbackStop(
      list !== null &&
        list.querySelector(SELECTED_TAB_SELECTOR) === null &&
        list.querySelector(TAB_SELECTOR) === tab,
    );
  });

  const setTabNode = useCallback(
    (tab: HTMLButtonElement) => {
      tabNode.current = tab;
      const release = composeRef(ref, tab);
      return () => {
        tabNode.current = null;
        release();
      };
    },
    [ref],
  );

  return (
    <button
      {...props}
      ref={setTabNode}
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      aria-selected={isSelected}
      aria-controls={panelId(baseId, value)}
      tabIndex={isSelected || holdsFallbackStop ? 0 : -1}
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

/**
 * Builds a panel's content, calling a function child, so an unmounting panel
 * constructs nothing at all while another tab is selected.
 */
function panelContent(children: ReactNode | (() => ReactNode)): ReactNode {
  return typeof children === "function" ? children() : children;
}

export interface TabPanelProps<Value extends string = string>
  extends Omit<
      HTMLAttributes<HTMLDivElement>,
      "children" | "hidden" | "id" | "role"
    >,
    RefAttributes<HTMLDivElement> {
  /**
   * The panel's content. A function child runs only where the panel renders
   * it, so under `mountStrategy="unmount"` an unselected tab builds nothing;
   * plain children are built by the surrounding render either way.
   */
  readonly children?: ReactNode | (() => ReactNode) | undefined;
  /** Removes the hidden panels' children while another tab is selected. */
  readonly mountStrategy?: "retain" | "unmount" | undefined;
  /** Names the panel, matching the value of the tab that controls it. */
  readonly value: Value;
}

/**
 * The panel a tab controls. It is focusable so a keyboard user can Tab from
 * the list straight into its content even when the panel holds no control.
 */
export function TabPanel<Value extends string = string>({
  children,
  className,
  mountStrategy = "retain",
  ref,
  value,
  ...props
}: TabPanelProps<Value>): React.JSX.Element {
  const { baseId, selected } = useTabsContext("TabPanel");
  const isSelected = selected === value;
  const mounted = isSelected || mountStrategy !== "unmount";

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
      {mounted ? panelContent(children) : null}
    </div>
  );
}
