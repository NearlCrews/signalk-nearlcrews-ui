import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllableStateWhen } from "../hooks/use-controllable-state.js";
import { useNodeRef } from "../hooks/use-node-ref.js";
import { TABS_STYLES } from "../styles/tabs.js";
import { useOptionalModuleStyles } from "../styles/use-module-styles.js";
import { requireAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { createRequiredContext, createValueContext } from "../utils/context.js";
import { isRightToLeft } from "../utils/direction.js";
import type { MountStrategy } from "../utils/mount-strategy.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { mirrorsInRtl, nextRovingIndex } from "../utils/roving.js";
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

const { Provider: TabsProvider, useValue: useTabsContext } =
  createRequiredContext<TabsContextValue>("Tabs");

/**
 * Value of the tab holding the list's fallback stop, published by the list so
 * the question is asked once per commit rather than once per tab.
 */
const { Provider: TabListFallbackProvider, useValue: useTabListFallback } =
  createValueContext<string | undefined>(undefined);

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
  /**
   * Value of the selected tab when controlled, or `undefined` for a
   * controlled set with nothing selected yet. Passing the prop at all is what
   * makes the set controlled, so a panel that owns the selection must keep
   * passing it.
   */
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
 *
 * The union reaches the children only if they are instantiated too. The
 * context carries a plain string, so `<Tab value="typo">` inside a
 * `<Tabs<Category>>` is a type error only when the tab itself is written
 * `<Tab<Category> value="typo">`. Do that on every Tab and TabPanel of a set
 * whose values must be checked; the API reference records the gap.
 */
export function Tabs<Value extends string = string>(
  props: TabsProps<Value>,
): React.JSX.Element {
  const {
    activation = "automatic",
    children,
    className,
    defaultValue,
    onValueChange,
    orientation = "horizontal",
    ref,
    value,
    ...rest
  } = props;
  useOptionalModuleStyles(TABS_STYLES);

  const baseId = useId();
  /*
   * A controlled set with nothing selected passes `value={undefined}`, which
   * no value can be told apart from an uncontrolled set, so control is decided
   * by whether the prop was supplied and latched for the lifetime of the
   * component the way React decides it for a native input.
   */
  const [controlled] = useState(() => "value" in props);
  const [selected, commitValue] = useControllableStateWhen<Value | undefined>(
    controlled,
    value,
    defaultValue,
    // A tab set never selects nothing on its own, so the callback only ever
    // receives a real value; the wider slot is what the shared pair needs.
    onValueChange as ((next: Value | undefined) => void) | undefined,
  );

  const select = useCallback(
    (next: string): void => {
      if (next === selected) return;
      // A selection carries the value the tab put in the DOM, so the union is
      // the consumer's claim about the tabs it rendered rather than something
      // this component can check.
      commitValue(next as Value);
    },
    [commitValue, selected],
  );

  const context = useMemo(
    () => ({ activation, baseId, orientation, select, selected }),
    [activation, baseId, orientation, select, selected],
  );

  return (
    <TabsProvider value={context}>
      <div
        {...rest}
        ref={ref}
        className={classNames(
          "snui-tabs",
          `snui-tabs--${orientation}`,
          className,
        )}
      >
        {children}
      </div>
    </TabsProvider>
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

  const next = nextRovingIndex({
    count: tabs.length,
    currentIndex: current,
    key: event.key,
    orientation,
    rtl: mirrorsInRtl(event.key) && isRightToLeft(list),
  });
  if (next === null) return;

  event.preventDefault();
  const target = tabs[next];
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
  // The ancestor is read first, so a list outside Tabs reports that rather
  // than whichever of the two mistakes the consumer made second.
  const { orientation, selected } = useTabsContext("TabList");
  requireAccessibleName("TabList", ariaLabel, ariaLabelledBy);

  const listRef = useRef<HTMLDivElement | null>(null);
  const attachList = useNodeRef(listRef, ref);
  const [fallbackValue, setFallbackValue] = useState<string | undefined>(
    undefined,
  );

  /*
   * A selection matching no enabled tab, a saved value from an earlier release
   * or a value still empty while configuration loads, would otherwise leave
   * the list without a tab stop and the interface unreachable by keyboard. The
   * first enabled tab takes the stop instead, as a SegmentedControl option
   * does. The list is read from the DOM, the way arrow-key movement already
   * reads it, so its order and disabled state stay authoritative, and it is
   * read again whenever the list could have gained, lost, or disabled a tab,
   * which is any commit carrying new children, and whenever the selection
   * moved. Writing the same answer back bails out of rendering, so the update
   * chain the exhaustive-deps rule guards against ends on the first pass.
   */
  useLayoutEffect(() => {
    const list = listRef.current;
    const fallback =
      list !== null && list.querySelector(SELECTED_TAB_SELECTOR) === null
        ? list.querySelector<HTMLButtonElement>(TAB_SELECTOR)
        : null;
    setFallbackValue(fallback?.dataset.snuiTabValue);
  }, [children, selected]);

  return (
    <div
      {...props}
      ref={attachList}
      role="tablist"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-orientation={orientation}
      className={classNames("snui-tablist", className)}
    >
      <TabListFallbackProvider value={fallbackValue}>
        {children}
      </TabListFallbackProvider>
    </div>
  );
}

export interface TabProps<Value extends string = string>
  extends Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "role" | "tabIndex" | "type" | "value"
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
  const holdsFallbackStop = useTabListFallback() === value;

  return (
    <button
      {...props}
      ref={ref}
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
      "aria-labelledby" | "children" | "hidden" | "id" | "role" | "tabIndex"
    >,
    RefAttributes<HTMLDivElement> {
  /**
   * The panel's content. A function child runs only where the panel renders
   * it, so under `mountStrategy="unmount"` an unselected tab builds nothing;
   * plain children are built by the surrounding render either way.
   */
  readonly children?: ReactNode | (() => ReactNode) | undefined;
  /**
   * Whether the panel itself takes a tab stop, which it does by default. Pass
   * false for a panel that is nothing but controls, where the stop lands on a
   * container the reader has no reason to visit.
   */
  readonly focusable?: boolean | undefined;
  /**
   * Removes the hidden panels' children while another tab is selected.
   * `"retain"`, the default, keeps them mounted and hidden, and their effects
   * keep running, unlike a retaining `CollapsibleSection`, which pauses them.
   */
  readonly mountStrategy?: MountStrategy | undefined;
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
  focusable = true,
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
      tabIndex={focusable ? 0 : undefined}
      hidden={!isSelected}
      className={classNames("snui-tabpanel", className)}
    >
      {mounted ? panelContent(children) : null}
    </div>
  );
}
