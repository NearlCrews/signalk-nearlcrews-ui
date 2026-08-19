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
import { TableLayout, Virtualizer } from "react-aria-components/Virtualizer";
import { DATA_GRID_ROW_HEIGHTS } from "../styles/tokens.js";
import { hasAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
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
  readonly density?: DataGridDensity | undefined;
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

  const virtualized = items.length > virtualizeThreshold;
  validateDynamicColumns(columns);

  let headerChildren: ReactNode | ((column: TColumn) => ReactElement);
  if (typeof children === "function") {
    const firstColumnItem = columns?.[0];
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
          const row = renderRow(entry.value);
          const parityProps = {
            "data-snui-zebra-odd": entry.odd || undefined,
          } as Partial<RowProps<TRow>> & {
            readonly "data-snui-zebra-odd"?: boolean | undefined;
          };
          return isPlainStyle(row.props.style)
            ? cloneElement(row, {
                ...parityProps,
                style: {
                  width: "inherit",
                  height: "inherit",
                  ...row.props.style,
                },
              } as Partial<RowProps<TRow>> & {
                readonly "data-snui-zebra-odd"?: boolean | undefined;
              })
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
        {renderRow}
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
