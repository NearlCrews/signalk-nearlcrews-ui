import { isValidElement, type ReactNode } from "react";
import { trimmedText } from "./labels.js";
import { hasReactContent, reactNodeText } from "./react-node.js";

/**
 * A unit drawn as its compact symbol and read as its name, such as "kn" read
 * as "knots". Supply both from the consumer's own resolution of the server's
 * unit preferences, which pairs a symbol with its long name; this package
 * neither fetches nor converts units.
 */
export interface NamedUnit {
  /**
   * What assistive technology reads in place of the symbol, such as "knots".
   * It describes a value and never joins a control's accessible name, so a
   * speech input user still says the label. A blank name leaves the symbol to
   * be read as it is.
   */
  readonly name: string;
  /** What is drawn, such as "kn". Hidden from assistive technology. */
  readonly symbol: ReactNode;
}

/** A unit as content of its own, or as a symbol paired with its spoken name. */
export type UnitContent = ReactNode | NamedUnit;

/**
 * Whether a unit carries a spoken name beside its symbol.
 *
 * @internal
 */
export function isNamedUnit(unit: UnitContent): unit is NamedUnit {
  return (
    typeof unit === "object" &&
    unit !== null &&
    !isValidElement(unit) &&
    "symbol" in unit &&
    "name" in unit
  );
}

/**
 * Whether a unit renders anything at all.
 *
 * @internal
 */
export function hasUnitContent(unit: UnitContent): boolean {
  return isNamedUnit(unit)
    ? hasReactContent(unit.symbol) || trimmedText(unit.name) !== ""
    : hasReactContent(unit);
}

/**
 * The words a unit is read as, for a value text such as a slider's
 * `aria-valuetext`: the name of a named unit, and otherwise the text the unit
 * renders. Undefined for a unit with no text to read.
 *
 * @internal
 */
export function unitSpokenText(unit: UnitContent): string | undefined {
  const text = isNamedUnit(unit)
    ? trimmedText(unit.name) || reactNodeText(unit.symbol).trim()
    : reactNodeText(unit).trim();
  return text === "" ? undefined : text;
}

/**
 * Renders a unit. A named unit draws its symbol hidden from assistive
 * technology and reads its name from visually hidden text, which carries a
 * leading space so a value before it reads as one phrase, "12 knots".
 *
 * @internal
 */
export function renderUnit(unit: UnitContent): ReactNode {
  if (!isNamedUnit(unit)) return unit;
  const name = trimmedText(unit.name);
  if (name === "") return unit.symbol;
  return (
    <>
      <span aria-hidden="true">{unit.symbol}</span>
      <span className="snui-visually-hidden">{` ${name}`}</span>
    </>
  );
}
