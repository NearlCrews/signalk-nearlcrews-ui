import {
  Children,
  type CSSProperties,
  cloneElement,
  Fragment,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Cell,
  type CellProps,
  type ColumnProps,
  type Key,
  Column as RACColumn,
  Row,
  type RowProps,
  type Selection,
  type SelectionMode,
  type SortDescriptor,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components";
import { TableLayout, Virtualizer } from "react-aria-components/Virtualizer";
import { useNodeRef } from "../hooks/use-node-ref.js";
import { TABLE_STYLES } from "../styles/table.js";
import {
  DATA_GRID_ROW_HEIGHTS,
  DATA_GRID_ROW_HEIGHTS_FINE,
} from "../styles/tokens.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import { joinIdReferences, requireAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { describeReceived, packageError } from "../utils/errors.js";
import { isElementNode } from "../utils/focus.js";
import { resolveLabel } from "../utils/labels.js";
import { mediaMatches } from "../utils/motion.js";
import { DATA_GRID_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { definedProps } from "../utils/props.js";
import { hasReactContent, plainReactNodeText } from "../utils/react-node.js";
import type { Density, Visibility } from "../utils/variants.js";
import { EmptyState } from "./EmptyState.js";

export type {
  CellProps,
  Key,
  RowProps,
  Selection,
  SortDescriptor,
  SortDirection,
} from "react-aria-components";
export { Cell, Row };

/** Alias of React Aria's selection vocabulary, under the package name. */
export type DataGridSelectionMode = SelectionMode;

/** Alias of the shared {@link Visibility} vocabulary. */
export type DataGridCaptionVisibility = Visibility;

/**
 * How the body is rendered. `"auto"` virtualizes above `virtualizeThreshold`.
 */
export type DataGridVirtualizeMode = "always" | "auto" | "never";

const DEFAULT_VIRTUALIZE_THRESHOLD = 100;

/**
 * Custom property holding the minimum width of a data-grid column. The style
 * module reads it with a fallback, so a column pinned narrower than the
 * default floor lowers the floor for its own cells alone.
 */
const COLUMN_MIN_PROPERTY = "--snui-data-grid-column-min";

type ColumnMinStyle = CSSProperties &
  Record<typeof COLUMN_MIN_PROPERTY, string>;

/*
 * Which set of estimates the layout starts from. The pointer is a property of
 * the device rather than of a panel, and the value is only the height rows are
 * laid out at before the virtualizer measures them, so it is read once here
 * rather than per grid. Estimating a touch row on a laptop leaves every row
 * reporting a correction the first time it is measured, which walks the scroll
 * height during a fast scroll. jsdom implements no matchMedia, which reads as
 * the fine pointer a development machine has.
 */
const ROW_HEIGHTS = mediaMatches(globalThis, "(any-pointer: coarse)")
  ? DATA_GRID_ROW_HEIGHTS
  : DATA_GRID_ROW_HEIGHTS_FINE;

/**
 * Initial size estimates the Virtualizer lays rows out with before it measures
 * them. Frozen per density, because a fresh object would invalidate the
 * layout on every render of the grid.
 */
const LAYOUT_OPTIONS: Record<
  Density,
  {
    readonly estimatedHeadingHeight: number;
    readonly estimatedRowHeight: number;
  }
> = {
  compact: {
    estimatedHeadingHeight: ROW_HEIGHTS.compact,
    estimatedRowHeight: ROW_HEIGHTS.compact,
  },
  default: {
    estimatedHeadingHeight: ROW_HEIGHTS.default,
    estimatedRowHeight: ROW_HEIGHTS.default,
  },
};

export interface DataGridColumnProps
  extends ColumnProps,
    RefAttributes<HTMLDivElement | HTMLTableCellElement> {
  /**
   * Aligns the header and every cell in the column to the end edge so figures
   * line up. Digits are tabular in every body cell already, which holds for
   * Western Arabic digits; a locale rendering another digit set aligns only
   * as far as the font's own tabular coverage reaches.
   */
  readonly numeric?: boolean | undefined;
  /**
   * Lets virtualized cells in the column wrap onto several lines. By default
   * a virtualized cell keeps one line and truncates with an ellipsis. Its
   * text rides along as a `title`, which a pointer reveals, and keyboard focus
   * on the cell unwraps it, but a touch screen gets neither, so set `wrap` on
   * any text column whose value the operator has to read in full, such as a
   * Signal K path or a source name. Non-virtualized cells always wrap.
   */
  readonly wrap?: boolean | undefined;
}

/**
 * React Aria's Column plus the `numeric` and `wrap` presentation options that
 * DataGrid applies to the header cell and to every body cell in the column.
 */
export function Column({
  numeric = false,
  wrap = false,
  ...props
}: DataGridColumnProps): React.JSX.Element {
  return (
    <RACColumn
      {...props}
      {...definedProps({
        "data-snui-numeric": numeric ? "" : undefined,
        "data-snui-wrap": wrap ? "" : undefined,
      })}
    />
  );
}

interface ColumnDecoration {
  /** Width the column is pinned to, as a CSS length. */
  readonly minWidth: string | undefined;
  readonly numeric: boolean;
  readonly wrap: boolean;
}

const NO_DECORATIONS_BY_KEY: ReadonlyMap<Key, ColumnDecoration> = new Map();

interface VirtualCollectionItem<T> {
  readonly id: Key;
  readonly odd: boolean;
  readonly value: T;
}

/**
 * Rows of a virtualized grid rebuilt so the virtualizer measures them again.
 *
 * A virtualized cell unwraps its whole value while it holds keyboard focus,
 * which changes its row's height, but the virtualizer measures a row only
 * when the row is built anew, and it keeps the tallest height any cell of the
 * row reported. Handing React Aria a fresh wrapper for the rows focus moves
 * between rebuilds those rows and no other, so each is measured at its new
 * height, taller while a long value shows and back to one line after.
 */
interface RowRemeasure<T> {
  /** The focused cell, as its row key and column index, or null. */
  readonly focused: ReturnType<typeof focusedCellOf>;
  /** The wrappers below were built from these; any other set voids them. */
  readonly items: readonly VirtualCollectionItem<T>[];
  /** A fresh wrapper per rebuilt row, by row key. */
  readonly wrappers: ReadonlyMap<string, VirtualCollectionItem<T>>;
}

const BODY_CELL_SELECTOR = '[role="gridcell"], [role="rowheader"]';

/** The body cell a focus target sits in, as its row key and column index. */
function focusedCellOf(
  target: EventTarget | null,
): { readonly column: string; readonly row: string } | null {
  if (!isElementNode(target)) return null;
  const cell = target.closest(BODY_CELL_SELECTOR);
  const row = cell?.closest('[role="row"]')?.getAttribute("data-key");
  const column = cell?.getAttribute("data-column-index");
  return row == null || column == null ? null : { column, row };
}

interface DataGridBaseProps<TRow>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    RefAttributes<HTMLDivElement> {
  /**
   * Names the grid with visible text, the way `Table` does, so a panel moving
   * up from `Table` keeps its caption. Required unless `aria-label` or
   * `aria-labelledby` names the grid.
   */
  readonly caption?: ReactNode | undefined;
  /** `"hidden"` keeps the caption for assistive technology only. */
  readonly captionVisibility?: DataGridCaptionVisibility | undefined;
  readonly defaultSelectedKeys?: "all" | Iterable<Key> | undefined;
  readonly density?: Density | undefined;
  /** Description of the default EmptyState, under its title. */
  readonly emptyDescription?: ReactNode | undefined;
  /**
   * Replaces the default empty content entirely. Render an EmptyState (or any
   * node) for full control over the empty table. A panel whose request has
   * not come back yet should pass its own node here, because the grid has no
   * loading state of its own and an empty grid reads the same either way.
   */
  readonly emptyState?: ReactNode | undefined;
  /** Title of the default EmptyState. */
  readonly emptyTitle?: string | undefined;
  /**
   * Row data. Items should expose a stable `id` or `key` for selection.
   * Without one, virtualized rows key by index, so sorting or filtering a
   * large grid remounts the visible rows instead of moving them.
   */
  readonly items: readonly TRow[];
  readonly onSelectionChange?: ((keys: Selection) => void) | undefined;
  /**
   * Reports sort toggles from sortable column headers. Sorting is controlled
   * only: RAC Table has no defaultSortDescriptor, so pair this with
   * `sortDescriptor` and sort `items` in the consumer.
   */
  readonly onSortChange?: ((descriptor: SortDescriptor) => void) | undefined;
  /**
   * Renders one row as a `<Row>` with `<Cell>` children. A row that renders
   * its cells from a function receives the column item, not the row.
   */
  readonly renderRow: (item: TRow) => ReactElement<RowProps<TRow>>;
  readonly selectedKeys?: "all" | Iterable<Key> | undefined;
  readonly selectionMode?: DataGridSelectionMode | undefined;
  readonly sortDescriptor?: SortDescriptor | undefined;
  /**
   * Chooses the body implementation. `"auto"` switches at
   * `virtualizeThreshold`, and the two bodies are different element trees, so
   * the table remounts the first time the row count crosses the threshold and
   * uncontrolled selection, focus, and scroll position start over. A grid that
   * grows, filters, or drains while the operator watches it should pin
   * `"always"` or `"never"` instead.
   */
  readonly virtualize?: DataGridVirtualizeMode | undefined;
  /**
   * Number of rows above which the body uses React Aria's TableLayout and
   * Virtualizer, when `virtualize` is `"auto"`. The density row height is an
   * estimate, and rows are observed so wrapped or expanded content can use its
   * measured height. Keyboard navigation and accessibility metadata cover the
   * complete collection. A virtualized grid scrolls inside a bounded box: it
   * takes `--snui-data-grid-max-block-size` from the panel, or its own height
   * through `style`.
   */
  readonly virtualizeThreshold?: number | undefined;
  /** Paints alternating row backgrounds. Off by default. */
  readonly zebra?: boolean | undefined;
}

/**
 * The header is written one of two ways, and the runtime honors exactly one.
 * Static children are `<Column>` elements and take no `columns`; a render
 * function is the React Aria dynamic collection shape and needs the `columns`
 * data it renders, because the grid feeds that array to the header and has no
 * other source for the column list.
 */
export type DataGridProps<TRow, TColumn = unknown> = DataGridBaseProps<TRow> &
  (
    | {
        /** Header columns as `<Column>` elements. */
        readonly children: ReactNode;
        readonly columns?: undefined;
      }
    | {
        /** Renders one header column from its entry in `columns`. */
        readonly children: (column: TColumn) => ReactElement;
        /** Replay-safe column data for the dynamic header. */
        readonly columns: readonly TColumn[];
      }
  );

/** The `id` or `key` an item exposes, when it exposes one React Aria accepts. */
function getItemKey(item: unknown): Key | undefined {
  if (item !== null && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const candidate = record.id ?? record.key;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return candidate;
    }
  }
  return undefined;
}

function isPlainStyle(style: unknown): style is CSSProperties | undefined {
  return (
    style === undefined ||
    (typeof style === "object" && style !== null && !Array.isArray(style))
  );
}

function validateDynamicColumns(columns: unknown): void {
  if (columns !== undefined && !Array.isArray(columns)) {
    throw packageError(
      `DataGrid columns must be an array; received ${describeReceived(columns)}. Pass a readonly array and replace it when the columns change.`,
    );
  }
}

interface FragmentChildrenProps {
  readonly children?: ReactNode;
}

function isFragmentElement(
  node: ReactNode,
): node is ReactElement<FragmentChildrenProps> {
  return isValidElement<FragmentChildrenProps>(node) && node.type === Fragment;
}

function isColumnElement(
  node: ReactNode,
): node is ReactElement<DataGridColumnProps> {
  return isValidElement<DataGridColumnProps>(node) && node.type === Column;
}

function isCellElement(node: ReactNode): node is ReactElement<CellProps> {
  return isValidElement<CellProps>(node) && node.type === Cell;
}

/**
 * Every element child of the header is one column, whatever component drew it.
 * A wrapper component or a bare React Aria Column counts, because dropping one
 * would slide every later column's options onto its neighbor.
 */
function isHeaderColumnElement(
  node: ReactNode,
): node is ReactElement<DataGridColumnProps> {
  return isValidElement<DataGridColumnProps>(node) && !isFragmentElement(node);
}

// React.Children does not traverse fragments, but RAC collections flatten
// them, so consumers reasonably wrap Column lists in one. These walkers
// recurse into fragments so enhancements apply either way.
function flattenColumns(
  children: ReactNode,
  columns: ReactElement<DataGridColumnProps>[] = [],
): ReactElement<DataGridColumnProps>[] {
  Children.forEach(children, (child) => {
    if (isFragmentElement(child)) {
      flattenColumns(child.props.children, columns);
    } else if (isHeaderColumnElement(child)) {
      columns.push(child);
    }
  });
  return columns;
}

function mapColumns(
  children: ReactNode,
  fn: (column: ReactElement<DataGridColumnProps>) => ReactElement,
): ReactNode {
  return Children.map(children, (child) => {
    if (isFragmentElement(child)) {
      return cloneElement(
        child,
        undefined,
        mapColumns(child.props.children, fn),
      );
    }
    if (isHeaderColumnElement(child)) return fn(child);
    return child;
  });
}

/** A pinned Column width as a CSS length, and undefined when it is unset. */
function cssColumnWidth(width: unknown): string | undefined {
  if (typeof width === "number") return `${String(width)}px`;
  return typeof width === "string" ? width : undefined;
}

function decorationOf(
  column: ReactElement<DataGridColumnProps>,
): ColumnDecoration {
  return {
    minWidth: cssColumnWidth(column.props.width),
    numeric: column.props.numeric === true,
    wrap: column.props.wrap === true,
  };
}

function isDecorated(decoration: ColumnDecoration): boolean {
  return (
    decoration.numeric || decoration.wrap || decoration.minWidth !== undefined
  );
}

type CellDecorationProps = Partial<CellProps> & {
  "data-snui-numeric"?: "" | undefined;
  "data-snui-wrap"?: "" | undefined;
};

/**
 * Stamps a cell with its column's alignment, wrapping, and width options and,
 * in a virtualized grid, wraps text-only content so the full value stays
 * reachable through a title once the one-line cell truncates it. The span is
 * also what the stylesheet unwraps while the cell holds keyboard focus.
 */
function decorateCell(
  cell: ReactElement<CellProps>,
  decoration: ColumnDecoration | undefined,
  virtualized: boolean,
): ReactElement<CellProps> {
  const props: CellDecorationProps = {};
  let decorated = false;
  if (decoration?.numeric === true) {
    props["data-snui-numeric"] = "";
    decorated = true;
  }
  if (decoration?.wrap === true) {
    props["data-snui-wrap"] = "";
    decorated = true;
  }
  const cellStyle = cell.props.style;
  if (decoration?.minWidth !== undefined && isPlainStyle(cellStyle)) {
    // The header carries the pinned width, and the body cells carry the floor
    // that would otherwise win the column back, so the floor travels with it.
    const style: ColumnMinStyle = {
      ...cellStyle,
      [COLUMN_MIN_PROPERTY]: decoration.minWidth,
    };
    props.style = style;
    decorated = true;
  }
  const content = cell.props.children;
  if (
    virtualized &&
    decoration?.wrap !== true &&
    typeof content !== "function"
  ) {
    const text = plainReactNodeText(content);
    if (text !== undefined) {
      props.children = (
        <span className="snui-data-grid__cell-text" title={text}>
          {content}
        </span>
      );
      decorated = true;
    }
  }
  // A flag rather than counting the keys, which would allocate per cell.
  return decorated ? cloneElement(cell, props) : cell;
}

/** Position of the next cell to decorate, shared across nested fragments. */
interface CellCursor {
  index: number;
}

function decorateCells(
  cells: ReactNode,
  decorations: readonly ColumnDecoration[],
  virtualized: boolean,
  cursor: CellCursor,
): ReactNode {
  return Children.map(cells, (cell) => {
    if (isFragmentElement(cell)) {
      return cloneElement(
        cell,
        undefined,
        decorateCells(cell.props.children, decorations, virtualized, cursor),
      );
    }
    if (!isCellElement(cell)) return cell;
    const decoration = decorations[cursor.index];
    cursor.index += 1;
    return decorateCell(cell, decoration, virtualized);
  });
}

/**
 * Readies one rendered row for the body. A Row's type argument is the item its
 * cells are rendered from, which is the column for a row that renders cells
 * through a function, so the callback here reads a column rather than a row.
 *
 * Such a row keeps those cells against their columns and rebuilds them only
 * when its own dependencies change, so the grid's row dependencies lead that
 * list on every render, decorated or not. The cells then follow the renderer
 * and the column options, and the list keeps one length whichever way the
 * grid renders.
 */
function prepareRow<TColumn>(
  row: ReactElement<RowProps<TColumn>>,
  { decorations, decorationsByKey }: ResolvedDecorations,
  decorating: boolean,
  virtualized: boolean,
  dependencies: readonly unknown[],
): ReactElement<RowProps<TColumn>> {
  const cells = row.props.children;
  if (typeof cells === "function") {
    const ownDependencies: readonly unknown[] = row.props.dependencies ?? [];
    const props: Partial<RowProps<TColumn>> = {
      dependencies: [...dependencies, ...ownDependencies],
    };
    if (decorating) {
      props.children = (column: TColumn) => {
        const cell = cells(column);
        if (!isCellElement(cell)) return cell;
        const key = getItemKey(column);
        return decorateCell(
          cell,
          key === undefined ? undefined : decorationsByKey.get(key),
          virtualized,
        );
      };
    }
    return cloneElement(row, props);
  }
  if (!decorating) return row;
  const decorated = decorateCells(cells, decorations, virtualized, {
    index: 0,
  });
  return cloneElement(row, {
    children: decorated,
  } as Partial<RowProps<TColumn>>);
}

type ZebraRowProps<T> = Partial<RowProps<T>> & {
  readonly "data-snui-zebra-odd"?: boolean | undefined;
};

/** The header React Aria renders, plus the options its columns carry. */
interface ResolvedHeader<TColumn> {
  readonly decorations: readonly ColumnDecoration[];
  readonly decorationsByKey: ReadonlyMap<Key, ColumnDecoration>;
  readonly hasDecoration: boolean;
  readonly headerChildren: ReactNode | ((column: TColumn) => ReactElement);
  /**
   * The column keys and options as one string, so a rendered row can be
   * invalidated by what the columns say rather than by the header object,
   * which a static header rebuilds on every render of its parent.
   */
  readonly signature: string;
}

type ResolvedDecorations = Omit<ResolvedHeader<never>, "headerChildren">;

/**
 * The decorations half of a resolved header, which both resolvers build the
 * same way. The empty-map short circuit is what keeps an undecorated grid out
 * of per-cell decoration work, so it travels with the list it belongs to.
 */
function resolvedDecorations(
  keys: readonly (Key | undefined)[],
  decorations: readonly ColumnDecoration[],
): ResolvedDecorations {
  const hasDecoration = decorations.some(isDecorated);
  return {
    decorations,
    decorationsByKey: hasDecoration
      ? indexDecorations(keys, decorations)
      : NO_DECORATIONS_BY_KEY,
    hasDecoration,
    signature: JSON.stringify([keys, decorations]),
  };
}

function indexDecorations(
  keys: readonly (Key | undefined)[],
  decorations: readonly ColumnDecoration[],
): ReadonlyMap<Key, ColumnDecoration> {
  const byKey = new Map<Key, ColumnDecoration>();
  keys.forEach((key, index) => {
    const decoration = decorations[index];
    if (decoration !== undefined && key !== undefined)
      byKey.set(key, decoration);
  });
  return byKey;
}

function resolveStaticHeader<TColumn>(
  children: ReactNode,
): ResolvedHeader<TColumn> {
  const columnElements = flattenColumns(children);
  const hasRowHeader = columnElements.some(
    (column) => column.props.isRowHeader === true,
  );
  let defaultedRowHeader = false;
  const headerChildren = mapColumns(children, (column) => {
    let result = column;
    const { width, style: columnStyle, ...rest } = column.props;
    const cssWidth = cssColumnWidth(width);
    if (
      cssWidth !== undefined &&
      isPlainStyle(columnStyle) &&
      isColumnElement(column)
    ) {
      // RAC only honors Column width inside a ResizableTableContainer and
      // warns about it otherwise; here a plain width pins the column in
      // both table and flex (virtualized) layout.
      result = (
        <Column
          {...rest}
          style={{
            ...columnStyle,
            flex: "0 0 auto",
            minWidth: cssWidth,
            width: cssWidth,
          }}
        />
      );
    }
    // RAC requires one row-header column and throws without it; default
    // the first column when the consumer did not opt one in.
    if (!hasRowHeader && !defaultedRowHeader) {
      defaultedRowHeader = true;
      result = cloneElement(result, { isRowHeader: true });
    }
    return result;
  });

  return {
    ...resolvedDecorations(
      columnElements.map((element) => element.props.id),
      columnElements.map(decorationOf),
    ),
    headerChildren,
  };
}

function resolveDynamicHeader<TColumn>(
  children: (column: TColumn) => ReactElement,
  columns: readonly TColumn[],
): ResolvedHeader<TColumn> {
  // The render function is pure by contract, so reading the column options
  // costs one extra call per column. A column the function declines to render
  // keeps its slot here, so a later column's key is still read from the entry
  // it was rendered from.
  const decorations: ColumnDecoration[] = [];
  const keys: (Key | undefined)[] = [];
  let hasRowHeader = false;
  columns.forEach((column) => {
    const element = children(column);
    if (!isHeaderColumnElement(element)) return;
    hasRowHeader ||= element.props.isRowHeader === true;
    decorations.push(decorationOf(element));
    keys.push(element.props.id ?? getItemKey(column));
  });

  const firstColumnItem = columns[0];
  const headerChildren = (column: TColumn): ReactElement => {
    const element = children(column);
    // The same default the static header takes: the first column, whatever
    // component drew it, when the consumer opted no column in.
    if (
      !hasRowHeader &&
      column === firstColumnItem &&
      isHeaderColumnElement(element)
    ) {
      return cloneElement(element, { isRowHeader: true });
    }
    return element;
  };

  return { ...resolvedDecorations(keys, decorations), headerChildren };
}

/**
 * A virtualized, sortable, selectable grid over React Aria's Table. Requires
 * a PanelRoot ancestor, which supplies the scoped styles the grid installs.
 */
export function DataGrid<TRow, TColumn = unknown>({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  caption,
  captionVisibility = "visible",
  children,
  className,
  columns,
  defaultSelectedKeys,
  density = "default",
  emptyDescription,
  emptyState,
  emptyTitle,
  id,
  items,
  onSelectionChange,
  onSortChange,
  ref,
  renderRow,
  selectedKeys,
  selectionMode = "none",
  sortDescriptor,
  style,
  virtualize = "auto",
  virtualizeThreshold = DEFAULT_VIRTUALIZE_THRESHOLD,
  zebra = false,
  ...rest
}: DataGridProps<TRow, TColumn>): React.JSX.Element {
  const hasCaption = hasReactContent(caption);
  if (!hasCaption) {
    requireAccessibleName("DataGrid", ariaLabel, ariaLabelledBy, ["caption"]);
  }

  useModuleStyles(TABLE_STYLES, "DataGrid");
  // Only an absent title reaches the bundle: a blank one the caller wrote is
  // a mistake, and EmptyState reports it rather than painting a heading with
  // no words. A blank bundle entry reads as absent, the way every bundled
  // string does, so a partial translation falls back to the default.
  const bundledEmptyTitle = resolveLabel(
    usePanelLabels()?.dataGrid?.emptyTitle,
    DATA_GRID_LABEL_DEFAULTS.emptyTitle,
  );
  const generatedId = useId();
  const captionId = `${generatedId}-caption`;
  const labelledBy = hasCaption
    ? joinIdReferences(ariaLabelledBy, captionId)
    : ariaLabelledBy;
  const virtualized =
    virtualize === "always" ||
    (virtualize === "auto" && items.length > virtualizeThreshold);
  validateDynamicColumns(columns);

  const header = useMemo<ResolvedHeader<TColumn>>(
    () =>
      typeof children === "function"
        ? resolveDynamicHeader(children, columns ?? [])
        : resolveStaticHeader(children),
    [children, columns],
  );

  // React Aria caches each rendered row against the wrapper object it came
  // from, so rebuilding the wrappers on every render would rebuild the whole
  // collection, which is the cost a large grid virtualizes to avoid. The
  // wrappers therefore live as long as the row data they carry.
  const virtualItems = useMemo<readonly VirtualCollectionItem<TRow>[]>(
    () =>
      virtualized
        ? items.map((value, index) => ({
            id: getItemKey(value) ?? index,
            odd: zebra && index % 2 === 1,
            value,
          }))
        : [],
    [items, virtualized, zebra],
  );

  const [remeasure, setRemeasure] = useState<RowRemeasure<TRow> | null>(null);
  // Rows focus moved between take their fresh wrapper; every other row keeps
  // the one React Aria has already rendered.
  const renderedItems = useMemo(
    () =>
      remeasure?.items === virtualItems
        ? virtualItems.map(
            (entry) => remeasure.wrappers.get(String(entry.id)) ?? entry,
          )
        : virtualItems,
    [remeasure, virtualItems],
  );

  /** Rebuilds the rows focus left and entered when it moves to `focused`. */
  const noteFocusedCell = (focused: RowRemeasure<TRow>["focused"]): void => {
    setRemeasure((current) => {
      // The focused cell outlives an items change, which rebuilds every row,
      // the focused one at its unwrapped height; only the wrappers, built
      // from the old items, are void.
      const before = current?.focused ?? null;
      if (before?.row === focused?.row && before?.column === focused?.column) {
        return current;
      }
      const wrappers = new Map(
        current?.items === virtualItems ? current.wrappers : undefined,
      );
      for (const row of new Set([before?.row, focused?.row])) {
        if (row === undefined) continue;
        const entry = virtualItems.find((item) => String(item.id) === row);
        if (entry !== undefined) wrappers.set(row, { ...entry });
      }
      return { focused, items: virtualItems, wrappers };
    });
  };

  const gridRef = useRef<HTMLDivElement | null>(null);
  const setGridRef = useNodeRef(gridRef, ref);
  const noteFocusTarget = useEffectEvent((target: EventTarget | null): void => {
    noteFocusedCell(focusedCellOf(target));
  });

  // Native listeners rather than handler props: they observe where focus
  // stands so the rows can be measured again, and make the container no more
  // interactive than it was. A focus event covers focus arriving and leaving;
  // a key the grid handled is followed by a look at where focus stands,
  // because the virtualizer can hand the focused element to another row as
  // it moves its views, and then no focus event fires.
  useEffect(() => {
    const grid = gridRef.current;
    if (!virtualized || grid === null) return undefined;
    const onFocusIn = (event: FocusEvent): void => {
      noteFocusTarget(event.target);
    };
    const onFocusOut = (event: FocusEvent): void => {
      const next = event.relatedTarget;
      if (!(isElementNode(next) && grid.contains(next))) {
        noteFocusTarget(null);
      }
    };
    const onKeyUp = (): void => {
      noteFocusTarget(grid.ownerDocument.activeElement);
    };
    grid.addEventListener("focusin", onFocusIn);
    grid.addEventListener("focusout", onFocusOut);
    grid.addEventListener("keyup", onKeyUp);
    return () => {
      grid.removeEventListener("focusin", onFocusIn);
      grid.removeEventListener("focusout", onFocusOut);
      grid.removeEventListener("keyup", onKeyUp);
    };
  }, [virtualized]);

  // React Aria keeps each rendered row against its item and rebuilds it only
  // when one of these changes: the renderer, compared by identity, and the
  // column options, compared by value.
  const rowDependencies = [renderRow, header.signature];

  const decorating = virtualized || header.hasDecoration;
  const renderGridRow = (item: TRow): ReactElement<RowProps<TRow>> =>
    prepareRow(
      renderRow(item),
      header,
      decorating,
      virtualized,
      rowDependencies,
    );

  // Built where the body needs it, so a populated grid never pays for the
  // empty state it does not render.
  const renderEmpty = (): ReactNode =>
    hasReactContent(emptyState) ? (
      emptyState
    ) : (
      <EmptyState
        description={emptyDescription}
        title={emptyTitle ?? bundledEmptyTitle}
      />
    );

  const body = virtualized ? (
    <TableBody
      className="snui-data-grid__body"
      dependencies={rowDependencies}
      items={renderedItems}
      renderEmptyState={renderEmpty}
    >
      {(entry) => {
        const row = renderGridRow(entry.value);
        const parityProps: ZebraRowProps<TRow> = {
          "data-snui-zebra-odd": entry.odd || undefined,
        };
        return isPlainStyle(row.props.style)
          ? cloneElement(row, {
              ...parityProps,
              style: {
                width: "inherit",
                height: "inherit",
                ...row.props.style,
              },
            } as ZebraRowProps<TRow>)
          : cloneElement(row, parityProps);
      }}
    </TableBody>
  ) : (
    <TableBody
      className="snui-data-grid__body"
      dependencies={rowDependencies}
      items={items}
      renderEmptyState={renderEmpty}
    >
      {renderGridRow}
    </TableBody>
  );

  const table = (
    <Table
      className="snui-data-grid__table"
      selectionMode={selectionMode}
      {...definedProps({
        "aria-label": ariaLabel,
        "aria-labelledby": labelledBy,
        defaultSelectedKeys,
        selectedKeys,
        onSelectionChange,
        sortDescriptor,
        onSortChange,
      })}
    >
      <TableHeader
        className="snui-data-grid__header"
        {...definedProps({ columns })}
      >
        {header.headerChildren}
      </TableHeader>
      {body}
    </Table>
  );

  return (
    <div
      {...rest}
      ref={setGridRef}
      className={classNames(
        "snui-data-grid",
        // Every density emits its modifier, the default included, so a
        // consumer override and a test key on the resolved density rather
        // than on the absence of a class.
        `snui-data-grid--${density}`,
        virtualized && "snui-data-grid--virtualized",
        zebra && "snui-data-grid--zebra",
        className,
      )}
      id={id}
      style={style}
    >
      {hasCaption ? (
        <div
          className={classNames(
            "snui-data-grid__caption",
            captionVisibility === "hidden" && "snui-data-grid__caption--hidden",
          )}
          id={captionId}
        >
          {caption}
        </div>
      ) : null}
      {virtualized ? (
        <Virtualizer
          layout={TableLayout}
          layoutOptions={LAYOUT_OPTIONS[density]}
          shouldObserveItemSize
        >
          {table}
        </Virtualizer>
      ) : (
        table
      )}
    </div>
  );
}
