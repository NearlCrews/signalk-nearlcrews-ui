import type {
  HTMLAttributes,
  ReactNode,
  RefAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { SIMPLE_TABLE_STYLES } from "../styles/simple-table.js";
import { useOptionalModuleStyles } from "../styles/use-module-styles.js";
import { requireAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import type { Density, Visibility } from "../utils/variants.js";

/** Alias of the shared {@link Visibility} vocabulary. */
export type TableCaptionVisibility = Visibility;

export interface TableProps
  extends TableHTMLAttributes<HTMLTableElement>,
    RefAttributes<HTMLTableElement> {
  /** Names the table. Required unless `aria-label` or `aria-labelledby` names it. */
  readonly caption?: ReactNode | undefined;
  /** `"hidden"` keeps the caption for assistive technology only. */
  readonly captionVisibility?: TableCaptionVisibility | undefined;
  readonly children: ReactNode;
  readonly density?: Density | undefined;
  /** Alternate body rows take the stripe token. */
  readonly zebra?: boolean | undefined;
}

/**
 * A semantic `<table>` for a handful of rows, styled from the tokens. Write
 * `thead`, `tbody`, `tr`, `th`, and `td` as usual; `TableHeaderCell` and
 * `TableCell` add the `numeric` option. Reach for `DataGrid` when rows need
 * sorting, selection, or virtualization.
 *
 * Cells that hold controls follow three rules, because a column header does
 * not name a control inside a cell. Name each control with its column and its
 * row, for example "Source, row 3", so two cells of the same column read
 * apart when they are tabbed through. Put `aria-invalid` and
 * `aria-describedby` on the control in the cell rather than on the row, so a
 * message reaches the field it belongs to. Leave the row a plain `tr` with no
 * role of its own.
 */
export function Table({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  caption,
  captionVisibility = "visible",
  children,
  className,
  density = "default",
  ref,
  zebra = false,
  ...props
}: TableProps): React.JSX.Element {
  useOptionalModuleStyles(SIMPLE_TABLE_STYLES);

  const hasCaption = hasReactContent(caption);
  if (!hasCaption) {
    requireAccessibleName("Table", ariaLabel, ariaLabelledBy, ["caption"]);
  }

  return (
    <table
      {...props}
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={classNames(
        "snui-table",
        // Every density emits its modifier, the default included, so a
        // consumer override and a test key on the resolved density rather
        // than on the absence of a class.
        `snui-table--${density}`,
        zebra && "snui-table--zebra",
        className,
      )}
    >
      {hasCaption ? (
        <caption
          className={classNames(
            "snui-table__caption",
            captionVisibility === "hidden" && "snui-table__caption--hidden",
          )}
        >
          {caption}
        </caption>
      ) : null}
      {children}
    </table>
  );
}

export interface TableHeaderCellProps
  extends ThHTMLAttributes<HTMLTableCellElement>,
    RefAttributes<HTMLTableCellElement> {
  /** Right-aligns the column and uses tabular digits, for figures. */
  readonly numeric?: boolean | undefined;
}

/** A `th`, scoped to its column by default. */
export function TableHeaderCell({
  className,
  numeric = false,
  ref,
  scope = "col",
  ...props
}: TableHeaderCellProps): React.JSX.Element {
  return (
    <th
      {...props}
      ref={ref}
      scope={scope}
      className={classNames(numeric && "snui-table__cell--numeric", className)}
    />
  );
}

export interface TableCellProps
  extends TdHTMLAttributes<HTMLTableCellElement>,
    RefAttributes<HTMLTableCellElement> {
  /** Right-aligns the cell and uses tabular digits, for figures. */
  readonly numeric?: boolean | undefined;
}

export function TableCell({
  className,
  numeric = false,
  ref,
  ...props
}: TableCellProps): React.JSX.Element {
  return (
    <td
      {...props}
      ref={ref}
      className={classNames(numeric && "snui-table__cell--numeric", className)}
    />
  );
}

export interface TableScrollRegionProps
  extends Omit<HTMLAttributes<HTMLElement>, "role">,
    RefAttributes<HTMLElement> {
  readonly children: ReactNode;
}

/**
 * A focusable, named region that scrolls a wide table sideways, so keyboard
 * users can reach the overflow and the panel never scrolls horizontally.
 * Name it after the table it wraps, for example with `aria-labelledby` set to
 * the caption's id.
 *
 * The region is a tab stop whether or not the table currently overflows,
 * because the oldest supported engines give a scroll container no keyboard
 * focus of their own and no measurement sees content-driven overflow
 * reliably. A panel that manages this focus itself passes its own `tabIndex`.
 */
export function TableScrollRegion({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  ref,
  ...props
}: TableScrollRegionProps): React.JSX.Element {
  // The region carries the module's own class, so it installs the module even
  // where a consumer scrolls something other than this package's table.
  useOptionalModuleStyles(SIMPLE_TABLE_STYLES);

  requireAccessibleName("TableScrollRegion", ariaLabel, ariaLabelledBy);

  return (
    <section
      // Declared before the rest props so a consumer can still set its own
      // tabIndex. The overflow is only keyboard-scrollable when the region
      // takes focus.
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the region scrolls only while focused
      tabIndex={0} // eslint-disable-line jsx-a11y-x/no-noninteractive-tabindex -- the region scrolls only while focused
      {...props}
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={classNames("snui-table-scroll", className)}
    >
      {children}
    </section>
  );
}
