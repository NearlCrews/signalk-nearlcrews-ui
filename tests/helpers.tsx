/** Shared helpers for the unit specs. */

import { type RenderResult, render } from "@testing-library/react";
import type { ReactNode } from "react";

import { PanelRoot, type PanelRootProps } from "../src/index.js";

/** Returns the form a control joined, failing loudly when it joined none. */
export function formOf(control: HTMLElement): HTMLFormElement {
  const form = control.closest("form");
  if (form === null) throw new Error("Control did not join its form.");
  return form;
}

/** Wraps children in a PanelRoot so overlays portal and theme resolves. */
export function panel(
  children: ReactNode,
  props?: Omit<PanelRootProps, "children">,
): React.JSX.Element {
  return <PanelRoot {...props}>{children}</PanelRoot>;
}

/** Renders children inside a PanelRoot. */
export function renderInPanel(
  children: ReactNode,
  props?: Omit<PanelRootProps, "children">,
): RenderResult {
  return render(panel(children, props));
}
