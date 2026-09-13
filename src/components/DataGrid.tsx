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
  useId,
  useMemo,
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
import { TABLE_STYLES } from "../styles/table.js";
import {
  DATA_GRID_ROW_HEIGHTS,
  DATA_GRID_ROW_HEIGHTS_FINE,
} from "../styles/tokens.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import { joinIdReferences, requireAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { usePanelLabels } from "../utils/panel-labels.js";
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
const ROW_HEIGHTS =
  typeof globalThis.matchMedia === "function" &&
  globalThis.matchMedia("(any-pointer: coarse)").matches
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
   * a virtualized cell keeps one line, truncates with an ellipsis, and carries
   * its text as a `title`, which a pointer reveals and a touch screen does
   * not, so set `wrap` on any column whose value the operator has to read in
   * full. Non-virtualized cells always wrap.
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
      {...(numeric ? { "data-snui-numeric": "" } : {})}
      {...(wrap ? { "data-snui-wrap": "" } : {})}
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
    const candidate =
      (item as Record<string, unknown>).id ??
      (item as Record<string, unknown>).key;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return candidate;
    }
  }
  return undefined;
}

function getRowKey(item: unknown, index: number): Key {
  return getItemKey(item) ?? index;
}

function isPlainStyle(style: unknown): style is CSSProperties | undefined {
  return (
    style === undefined ||
    (typeof style === "object" && style !== null && !Array.isArray(style))
  );
}

function validateDynamicColumns(columns: unknown): void {
  if (columns !== undefined && !Array.isArray(columns)) {
    throw new Error(
      "DataGrid columns must be a readonly array so React can replay concurrent and StrictMode renders safely.",
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
): ReactElement<DataGridColumnProps>[] {
  const columns: ReactElement<DataGridColumnProps>[] = [];
  Children.forEach(children, (child) => {
    if (isFragmentElement(child)) {
      columns.push(...flattenColumns(child.props.children));
      return;
    }
    if (isHeaderColumnElement(child)) columns.push(child);
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
 * reachable through a title once the one-line cell truncates it.
 */
function decorateCell(
  cell: ReactNode,
  decoration: ColumnDecoration | undefined,
  virtualized: boolean,
): ReactNode {
  if (!isValidElement<CellProps>(cell) || cell.type !== Cell) return cell;
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
    if (!isValidElement<CellProps>(cell) || cell.type !== Cell) return cell;
    const decoration = decorations[cursor.index];
    cursor.index += 1;
    return decorateCell(cell, decoration, virtualized);
  });
}

/**
 * A Row's type argument is the item its cells are rendered from, which is the
 * column for a row that renders cells through a function, so the callback here
 * reads a column rather than a row.
 */
function decorateRow<TColumn>(
  row: ReactElement<RowProps<TColumn>>,
  decorations: readonly ColumnDecoration[],
  decorationsByKey: ReadonlyMap<Key, ColumnDecoration>,
  virtualized: boolean,
): ReactElement<RowProps<TColumn>> {
  const cells = row.props.children;
  if (typeof cells === "function") {
    const renderCell = cells;
    return cloneElement(row, {
      children: (column: TColumn) => {
        const key = getItemKey(column);
        return decorateCell(
          renderCell(column),
          key === undefined ? undefined : decorationsByKey.get(key),
          virtualized,
        );
      },
    } as Partial<RowProps<TColumn>>);
  }
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
        >
          {column.props.children}
        </Column>
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

  const decorations = columnElements.map(decorationOf);
  const hasDecoration = decorations.some(isDecorated);
  return {
    decorations,
    decorationsByKey: hasDecoration
      ? indexDecorations(
          columnElements.map((element) => element.props.id),
          decorations,
        )
      : NO_DECORATIONS_BY_KEY,
    hasDecoration,
    headerChildren,
  };
}

function resolveDynamicHeader<TColumn>(
  children: (column: TColumn) => ReactElement,
  columns: readonly TColumn[],
): ResolvedHeader<TColumn> {
  const firstColumnItem = columns[0];
  const headerChildren = (column: TColumn): ReactElement => {
    const element = children(column);
    // RAC requires one row-header column and throws without it; default the
    // first column when the consumer did not opt one in.
    if (
      column === firstColumnItem &&
      isColumnElement(element) &&
      element.props.isRowHeader === undefined
    ) {
      return cloneElement(element, { isRowHeader: true });
    }
    return element;
  };

  // The render function is pure by contract, so reading the column options
  // costs one extra call per column. A column the function declines to render
  // keeps its slot here, so a later column's key is still read from the entry
  // it was rendered from.
  const decorations: ColumnDecoration[] = [];
  const keys: (Key | undefined)[] = [];
  columns.forEach((column, index) => {
    const element = children(column);
    if (!isHeaderColumnElement(element)) return;
    decorations.push(decorationOf(element));
    keys.push(element.props.id ?? getItemKey(columns[index]));
  });

  const hasDecoration = decorations.some(isDecorated);
  return {
    decorations,
    decorationsByKey: hasDecoration
      ? indexDecorations(keys, decorations)
      : NO_DECORATIONS_BY_KEY,
    hasDecoration,
    headerChildren,
  };
}

/** Title of an empty grid whose caller and panel bundle both leave it out. */
const DEFAULT_EMPTY_TITLE = "Nothing to show yet";

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
  // Only an absent title reaches the bundle: a blank one is a caller mistake,
  // and EmptyState reports it rather than painting a heading with no words.
  const bundledEmptyTitle =
    usePanelLabels()?.dataGrid?.emptyTitle ?? DEFAULT_EMPTY_TITLE;
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
            id: getRowKey(value, index),
            odd: zebra && index % 2 === 1,
            value,
          }))
        : [],
    [items, virtualized, zebra],
  );

  const decorating = virtualized || header.hasDecoration;
  const renderDecoratedRow = decorating
    ? (item: TRow) =>
        decorateRow(
          renderRow(item),
          header.decorations,
          header.decorationsByKey,
          virtualized,
        )
    : renderRow;

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
      items={virtualItems}
      renderEmptyState={renderEmpty}
    >
      {(entry) => {
        const row = renderDecoratedRow(entry.value);
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
      items={items}
      renderEmptyState={renderEmpty}
    >
      {renderDecoratedRow}
    </TableBody>
  );

  const table = (
    <Table
      className="snui-data-grid__table"
      selectionMode={selectionMode}
      {...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel })}
      {...(labelledBy === undefined ? {} : { "aria-labelledby": labelledBy })}
      {...(defaultSelectedKeys === undefined ? {} : { defaultSelectedKeys })}
      {...(selectedKeys === undefined ? {} : { selectedKeys })}
      {...(onSelectionChange === undefined ? {} : { onSelectionChange })}
      {...(sortDescriptor === undefined ? {} : { sortDescriptor })}
      {...(onSortChange === undefined ? {} : { onSortChange })}
    >
      <TableHeader
        className="snui-data-grid__header"
        {...(columns === undefined ? {} : { columns })}
      >
        {header.headerChildren}
      </TableHeader>
      {body}
    </Table>
  );

  return (
    <div
      {...rest}
      ref={ref}
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
