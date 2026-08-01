/** Shared helpers for the unit specs. */

/** Returns the form a control joined, failing loudly when it joined none. */
export function formOf(control: HTMLElement): HTMLFormElement {
  const form = control.closest("form");
  if (form === null) throw new Error("Control did not join its form.");
  return form;
}
