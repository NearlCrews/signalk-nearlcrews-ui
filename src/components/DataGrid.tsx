import {
  type AriaAttributes,
  Children,
  type CSSProperties,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
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
  type SortDescriptor,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components";
import { TableLayout, Virtualizer } from "react-aria-components/Virtualizer";
import { TABLE_STYLES } from "../styles/index.js";
import { DATA_GRID_ROW_HEIGHTS } from "../styles/tokens.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import { hasAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import type { Density } from "../utils/variants.js";
import { EmptyState } from "./EmptyState.js";

export type {
  CellProps,
  ColumnProps,
  Key,
  RowProps,
  Selection,
  SortDescriptor,
  SortDirection,
} from "react-aria-components";
export { Cell, Row };

/** @deprecated Use `Density` from the package root; the values are the same. */
export type DataGridDensity = Density;
export type DataGridSelectionMode = "none" | "single" | "multiple";

const DEFAULT_VIRTUALIZE_THRESHOLD = 100;

export interface DataGridColumnProps
  extends ColumnProps,
    RefAttributes<HTMLDivElement | HTMLTableCellElement> {
  /**
   * Aligns the header and every cell in the column to the end edge so figures
   * line up. Digits are tabular in every body cell already.
   */
  readonly numeric?: boolean | undefined;
  /**
   * Lets virtualized cells in the column wrap onto several lines. By default
   * a virtualized cell keeps one line, truncates with an ellipsis, and carries
   * its text as a `title`; non-virtualized cells always wrap.
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
  readonly numeric: boolean;
  readonly wrap: boolean;
}

interface VirtualCollectionItem<T> {
  readonly id: Key;
  readonly odd: boolean;
  readonly value: T;
}

export interface DataGridProps<TRow, TColumn = unknown>
  extends RefAttributes<HTMLDivElement> {
  readonly "aria-label"?: AriaAttributes["aria-label"] | undefined;
  readonly "aria-labelledby"?: AriaAttributes["aria-labelledby"] | undefined;
  /**
   * Header columns as <Column> elements, or a render function when `columns`
   * provides the column data (the RAC dynamic collection shape).
   */
  readonly children: ReactNode | ((column: TColumn) => ReactElement);
  readonly className?: string | undefined;
  /** Replay-safe column data for a dynamic header; pairs with function children. */
  readonly columns?: readonly TColumn[] | undefined;
  readonly defaultSelectedKeys?: "all" | Iterable<Key> | undefined;
  readonly density?: Density | undefined;
  /**
   * Replaces the default empty content entirely. Render an EmptyState (or any
   * node) for full control over the empty table.
   */
  readonly emptyState?: ReactNode | undefined;
  /** Title of the default EmptyState. */
  readonly emptyTitle?: string | undefined;
  readonly id?: string | undefined;
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
  /** Renders one row as a <Row> with <Cell> children. */
  readonly renderRow: (item: TRow) => ReactElement<RowProps<TRow>>;
  readonly selectedKeys?: "all" | Iterable<Key> | undefined;
  readonly selectionMode?: DataGridSelectionMode | undefined;
  readonly sortDescriptor?: SortDescriptor | undefined;
  readonly style?: CSSProperties | undefined;
  /**
   * Number of rows above which the body uses React Aria's TableLayout and
   * Virtualizer. The density row height is an estimate, and rows are observed
   * so wrapped or expanded content can use its measured height. Keyboard
   * navigation and accessibility metadata cover the complete collection.
   */
  readonly virtualizeThreshold?: number | undefined;
  /** Paints alternating row backgrounds. Off by default. */
  readonly zebra?: boolean | undefined;
}

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

function isColumnElement(
  node: ReactNode,
): node is ReactElement<DataGridColumnProps> {
  return isValidElement<DataGridColumnProps>(node) && node.type === Column;
}

// React.Children does not traverse fragments, but RAC collections flatten
// them, so consumers reasonably wrap Column lists in one. These walkers
// recurse into fragments so enhancements apply either way.
function flattenColumns(
  children: ReactNode,
): ReactElement<DataGridColumnProps>[] {
  const columns: ReactElement<DataGridColumnProps>[] = [];
  Children.forEach(children, (child) => {
    if (
      isValidElement<FragmentChildrenProps>(child) &&
      child.type === Fragment
    ) {
      columns.push(...flattenColumns(child.props.children));
      return;
    }
    if (isColumnElement(child)) columns.push(child);
  });
  return columns;
}

function mapColumns(
  children: ReactNode,
  fn: (column: ReactElement<DataGridColumnProps>) => ReactElement,
): ReactNode {
  return Children.map(children, (child) => {
    if (
      isValidElement<FragmentChildrenProps>(child) &&
      child.type === Fragment
    ) {
      return cloneElement(
        child,
        undefined,
        mapColumns(child.props.children, fn),
      );
    }
    if (isColumnElement(child)) return fn(child);
    return child;
  });
}

function decorationOf(
  column: ReactElement<DataGridColumnProps>,
): ColumnDecoration {
  return {
    numeric: column.props.numeric === true,
    wrap: column.props.wrap === true,
  };
}

function isDecorated(decoration: ColumnDecoration): boolean {
  return decoration.numeric || decoration.wrap;
}

/** The text a cell renders when its children are only strings and numbers. */
function cellText(children: ReactNode): string | undefined {
  const parts = Children.toArray(children);
  if (parts.length === 0) return undefined;
  let text = "";
  for (const part of parts) {
    if (typeof part !== "string" && typeof part !== "number") return undefined;
    text += String(part);
  }
  return text.trim() === "" ? undefined : text;
}

type CellDecorationProps = Partial<CellProps> & {
  "data-snui-numeric"?: "" | undefined;
  "data-snui-wrap"?: "" | undefined;
};

/**
 * Stamps a cell with its column's alignment and wrapping options and, in a
 * virtualized grid, wraps text-only content so the full value stays
 * reachable through a title once the one-line cell truncates it.
 */
function decorateCell(
  cell: ReactNode,
  decoration: ColumnDecoration | undefined,
  virtualized: boolean,
): ReactNode {
  if (!isValidElement<CellProps>(cell) || cell.type !== Cell) return cell;
  const props: CellDecorationProps = {};
  if (decoration?.numeric === true) props["data-snui-numeric"] = "";
  if (decoration?.wrap === true) props["data-snui-wrap"] = "";
  const content = cell.props.children;
  if (
    virtualized &&
    decoration?.wrap !== true &&
    typeof content !== "function"
  ) {
    const text = cellText(content);
    if (text !== undefined) {
      props.children = (
        <span className="snui-data-grid__cell-text" title={text}>
          {content}
        </span>
      );
    }
  }
  return Object.keys(props).length === 0 ? cell : cloneElement(cell, props);
}

function decorateRow<TRow>(
  row: ReactElement<RowProps<TRow>>,
  decorations: readonly ColumnDecoration[],
  decorationsByKey: ReadonlyMap<Key, ColumnDecoration>,
  virtualized: boolean,
): ReactElement<RowProps<TRow>> {
  const cells = row.props.children;
  if (typeof cells === "function") {
    // Dynamic cells receive the column item, which carries the column key.
    const renderCell = cells;
    return cloneElement(row, {
      children: (column: TRow) => {
        const key = getItemKey(column);
        return decorateCell(
          renderCell(column),
          key === undefined ? undefined : decorationsByKey.get(key),
          virtualized,
        );
      },
    } as Partial<RowProps<TRow>>);
  }
  let index = 0;
  const decorated = Children.map(cells, (cell) => {
    if (!isValidElement<CellProps>(cell) || cell.type !== Cell) return cell;
    const decoration = decorations[index];
    index += 1;
    return decorateCell(cell, decoration, virtualized);
  });
  return cloneElement(row, { children: decorated } as Partial<RowProps<TRow>>);
}

type ZebraRowProps<T> = Partial<RowProps<T>> & {
  readonly "data-snui-zebra-odd"?: boolean | undefined;
};

/**
 * A virtualized, sortable, selectable grid over React Aria's Table. Requires
 * a PanelRoot ancestor, which supplies the scoped styles the grid installs.
 */
export function DataGrid<TRow, TColumn = unknown>({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  columns,
  defaultSelectedKeys,
  density = "default",
  emptyState,
  emptyTitle = "No data",
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
  virtualizeThreshold = DEFAULT_VIRTUALIZE_THRESHOLD,
  zebra = false,
}: DataGridProps<TRow, TColumn>): React.JSX.Element {
  if (!hasAccessibleName(ariaLabel, ariaLabelledBy)) {
    throw new Error(
      "DataGrid requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
    );
  }

  useModuleStyles(TABLE_STYLES, "DataGrid");
  const virtualized = items.length > virtualizeThreshold;
  validateDynamicColumns(columns);

  let headerChildren: ReactNode | ((column: TColumn) => ReactElement);
  let columnElements: readonly ReactElement<DataGridColumnProps>[];
  if (typeof children === "function") {
    const firstColumnItem = columns?.[0];
    headerChildren = (column: TColumn): ReactElement => {
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
    // costs one extra call per column.
    columnElements = (columns ?? [])
      .map((column) => children(column))
      .filter(isColumnElement);
  } else {
    columnElements = flattenColumns(children);
    const hasRowHeader = columnElements.some(
      (column) => column.props.isRowHeader === true,
    );
    let defaultedRowHeader = false;
    headerChildren = mapColumns(children, (column) => {
      let result = column;
      const { width, style: columnStyle, ...rest } = column.props;
      if (
        (typeof width === "number" || typeof width === "string") &&
        isPlainStyle(columnStyle)
      ) {
        // RAC only honors Column width inside a ResizableTableContainer and
        // warns about it otherwise; here a plain width pins the column in
        // both table and flex (virtualized) layout.
        const cssWidth =
          typeof width === "number" ? `${String(width)}px` : width;
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
  }

  const decorations = columnElements.map(decorationOf);
  const decorationsByKey = new Map<Key, ColumnDecoration>();
  columnElements.forEach((element, index) => {
    const decoration = decorations[index];
    const key = element.props.id ?? getItemKey(columns?.[index]);
    if (decoration !== undefined && key !== undefined) {
      decorationsByKey.set(key, decoration);
    }
  });
  // Rows are cloned only when a column asks for it or the grid virtualizes,
  // so the common small grid renders the consumer's rows untouched.
  const renderDecoratedRow =
    virtualized || decorations.some(isDecorated)
      ? (item: TRow) =>
          decorateRow(
            renderRow(item),
            decorations,
            decorationsByKey,
            virtualized,
          )
      : renderRow;

  let body: ReactElement;
  if (virtualized) {
    const virtualItems: readonly VirtualCollectionItem<TRow>[] = items.map(
      (value, index) => ({
        id: getRowKey(value, index),
        odd: index % 2 === 1,
        value,
      }),
    );
    body = (
      <TableBody
        className="snui-data-grid__body"
        items={virtualItems}
        renderEmptyState={() =>
          hasReactContent(emptyState) ? (
            emptyState
          ) : (
            <EmptyState title={emptyTitle} />
          )
        }
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
    );
  } else {
    const emptyContent = hasReactContent(emptyState) ? (
      emptyState
    ) : (
      <EmptyState title={emptyTitle} />
    );
    body = (
      <TableBody
        className="snui-data-grid__body"
        items={items}
        renderEmptyState={() => emptyContent}
      >
        {renderDecoratedRow}
      </TableBody>
    );
  }

  const table = (
    <Table
      className="snui-data-grid__table"
      selectionMode={selectionMode}
      {...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel })}
      {...(ariaLabelledBy === undefined
        ? {}
        : { "aria-labelledby": ariaLabelledBy })}
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
        {headerChildren}
      </TableHeader>
      {body}
    </Table>
  );

  return (
    <div
      ref={ref}
      className={classNames(
        "snui-data-grid",
        `snui-data-grid--${density}`,
        virtualized && "snui-data-grid--virtualized",
        zebra && "snui-data-grid--zebra",
        className,
      )}
      {...(id === undefined ? {} : { id })}
      {...(style === undefined ? {} : { style })}
    >
      {virtualized ? (
        <Virtualizer
          layout={TableLayout}
          layoutOptions={{
            estimatedHeadingHeight: DATA_GRID_ROW_HEIGHTS.default,
            estimatedRowHeight: DATA_GRID_ROW_HEIGHTS[density],
          }}
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
