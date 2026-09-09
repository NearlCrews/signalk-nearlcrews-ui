import type {
  HTMLAttributes,
  ReactNode,
  RefAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { hasAccessibleName } from "../utils/aria.js";
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
  const hasCaption = hasReactContent(caption);
  if (!hasCaption && !hasAccessibleName(ariaLabel, ariaLabelledBy)) {
    throw new Error(
      "Table requires an accessible name: pass a non-empty caption, aria-label, or aria-labelledby.",
    );
  }

  return (
    <table
      {...props}
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={classNames(
        "snui-table",
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
 */
export function TableScrollRegion({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  ref,
  ...props
}: TableScrollRegionProps): React.JSX.Element {
  if (!hasAccessibleName(ariaLabel, ariaLabelledBy)) {
    throw new Error(
      "TableScrollRegion requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
    );
  }

  // The overflow is only keyboard-scrollable when the region takes focus.
  /* eslint-disable jsx-a11y-x/no-noninteractive-tabindex */
  return (
    <section
      {...props}
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the region scrolls only while focused
      tabIndex={0}
      className={classNames("snui-table-scroll", className)}
    >
      {children}
    </section>
  );
  /* eslint-enable jsx-a11y-x/no-noninteractive-tabindex */
}
