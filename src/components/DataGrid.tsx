import { useVirtualizer } from "@tanstack/react-virtual";
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
  useLayoutEffect,
  useRef,
} from "react";
import {
  Cell,
  Column,
  type ColumnProps,
  type Key,
  Row,
  type RowProps,
  type Selection,
  type SortDescriptor,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components";
import { DATA_GRID_ROW_HEIGHTS } from "../styles/tokens.js";
import { hasAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import { attachRef } from "../utils/ref.js";
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
export { Cell, Column, Row };

export type DataGridDensity = "default" | "compact";
export type DataGridSelectionMode = "none" | "single" | "multiple";

const DEFAULT_VIRTUALIZE_THRESHOLD = 100;
const VIRTUAL_OVERSCAN = 8;
/** One header row: row indices are 1 based and the header row comes first. */
const HEADER_ROW_COUNT = 1;

export interface DataGridProps<TRow, TColumn = unknown>
  extends RefAttributes<HTMLTableElement> {
  readonly "aria-label"?: AriaAttributes["aria-label"];
  readonly "aria-labelledby"?: AriaAttributes["aria-labelledby"];
  /**
   * Header columns as <Column> elements, or a render function when `columns`
   * provides the column data (the RAC dynamic collection shape).
   */
  readonly children: ReactNode | ((column: TColumn) => ReactElement);
  readonly className?: string;
  /** Column data for a dynamic header; pairs with function children. */
  readonly columns?: Iterable<TColumn>;
  readonly defaultSelectedKeys?: "all" | Iterable<Key>;
  readonly density?: DataGridDensity;
  /**
   * Replaces the default empty content entirely. Render an EmptyState (or any
   * node) for full control over the empty table.
   */
  readonly emptyState?: ReactNode;
  /** Title of the default EmptyState. */
  readonly emptyTitle?: string;
  readonly id?: string;
  /** Row data. Items should expose a stable `id` or `key` for selection. */
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
  readonly selectedKeys?: "all" | Iterable<Key>;
  readonly selectionMode?: DataGridSelectionMode;
  readonly sortDescriptor?: SortDescriptor;
  readonly style?: CSSProperties;
  /**
   * Number of rows above which the body is windowed with
   * @tanstack/react-virtual. Virtualized rows have a fixed height per density
   * and columns size by flex (a Column `width` pins its basis); keyboard
   * navigation reaches rendered rows, scrolling reveals the rest.
   */
  readonly virtualizeThreshold?: number;
  /** Paints alternating row backgrounds. Off by default. */
  readonly zebra?: boolean;
}

function getRowKey(item: unknown, index: number): Key {
  if (item !== null && typeof item === "object") {
    const candidate =
      (item as Record<string, unknown>).id ??
      (item as Record<string, unknown>).key;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return candidate;
    }
  }
  return index;
}

/** Reads the first item without materializing the rest of the iterable. */
function firstOf<T>(items: Iterable<T>): T | undefined {
  for (const item of items) return item;
  return undefined;
}

function isPlainStyle(style: unknown): style is CSSProperties | undefined {
  return (
    style === undefined ||
    (typeof style === "object" && style !== null && !Array.isArray(style))
  );
}

interface FragmentChildrenProps {
  readonly children?: ReactNode;
}

// React.Children does not traverse fragments, but RAC collections flatten
// them, so consumers reasonably wrap Column lists in one. These walkers
// recurse into fragments so enhancements apply either way.
function flattenColumns(children: ReactNode): ReactElement<ColumnProps>[] {
  const columns: ReactElement<ColumnProps>[] = [];
  Children.forEach(children, (child) => {
    if (
      isValidElement<FragmentChildrenProps>(child) &&
      child.type === Fragment
    ) {
      columns.push(...flattenColumns(child.props.children));
      return;
    }
    if (isValidElement<ColumnProps>(child) && child.type === Column) {
      columns.push(child);
    }
  });
  return columns;
}

function mapColumns(
  children: ReactNode,
  fn: (column: ReactElement<ColumnProps>) => ReactElement,
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
    if (isValidElement<ColumnProps>(child) && child.type === Column) {
      return fn(child);
    }
    return child;
  });
}

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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLTableElement | null>(null);
  const virtualized = items.length > virtualizeThreshold;
  // TanStack Virtual is not compiler-optimizable, so React skips memoizing
  // this component; every virtualizer value is consumed in the same render,
  // so no stale-UI path exists.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: virtualized ? items.length : 0,
    estimateSize: () => DATA_GRID_ROW_HEIGHTS[density],
    getScrollElement: () => scrollRef.current,
    overscan: VIRTUAL_OVERSCAN,
  });

  let headerChildren: ReactNode | ((column: TColumn) => ReactElement);
  if (typeof children === "function") {
    const firstColumnItem =
      columns === undefined ? undefined : firstOf(columns);
    headerChildren = (column: TColumn): ReactElement => {
      const element = children(column);
      // RAC requires one row-header column and throws without it; default the
      // first column when the consumer did not opt one in.
      if (
        column === firstColumnItem &&
        isValidElement<ColumnProps>(element) &&
        element.type === Column &&
        element.props.isRowHeader === undefined
      ) {
        return cloneElement(element, { isRowHeader: true });
      }
      return element;
    };
  } else {
    const hasRowHeader = flattenColumns(children).some(
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

  let body: ReactElement;
  if (virtualized) {
    const rows: ReactNode[] = [];
    for (const virtualItem of virtualizer.getVirtualItems()) {
      const item = items[virtualItem.index];
      if (item === undefined) {
        continue;
      }
      const key = getRowKey(item, virtualItem.index);
      const row = renderRow(item);
      const rowIndex = virtualItem.index + 1 + HEADER_ROW_COUNT;
      // React 19 passes ref through element props; RowProps cannot express
      // it, so recover any consumer ref before composing.
      const consumerRef = (
        row as ReactElement<RowProps<TRow> & RefAttributes<HTMLTableRowElement>>
      ).props.ref;
      rows.push(
        cloneElement(row, {
          key,
          id: key,
          // RAC strips consumer aria-rowindex from Row props (it owns row
          // indices, but only stamps them under its own Virtualizer), and
          // its collection commits rows in an internal pass, so the ref
          // callback stamps the index exactly when each row mounts.
          ref: (node: HTMLTableRowElement | null) => {
            if (node !== null) {
              node.setAttribute("aria-rowindex", String(rowIndex));
            }
            return attachRef(consumerRef, node);
          },
          className: classNames(
            "snui-data-grid__row",
            typeof row.props.className === "string"
              ? row.props.className
              : undefined,
          ),
          style: {
            ...(isPlainStyle(row.props.style) ? row.props.style : {}),
            transform: `translateY(${String(virtualItem.start)}px)`,
          },
        } as Partial<RowProps<TRow>>),
      );
    }
    body = (
      <TableBody
        className="snui-data-grid__body"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {rows}
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
        {renderRow}
      </TableBody>
    );
  }

  // RAC only stamps aria-rowcount under its own Virtualizer; mirror it here
  // so windowed rows keep an honest screen-reader row count. React never
  // renders this attribute, so there is no reconciliation conflict.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (grid === null) {
      return;
    }
    if (virtualized) {
      grid.setAttribute(
        "aria-rowcount",
        String(items.length + HEADER_ROW_COUNT),
      );
    } else {
      grid.removeAttribute("aria-rowcount");
    }
  }, [virtualized, items.length]);

  return (
    <div
      ref={scrollRef}
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
      <Table
        ref={(node) => {
          gridRef.current = node as HTMLTableElement | null;
          return attachRef(ref, node as HTMLTableElement | null);
        }}
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
    </div>
  );
}
