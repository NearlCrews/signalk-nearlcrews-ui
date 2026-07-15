import { ROOT_SELECTOR } from "../version.js";

/** Returns a selector for use inside the package's native CSS scope. */
export function owned(selector: string): string {
  return selector;
}

/** Stops descendant rules at every nested package-version root. */
export function scopeStyles(styles: string): string {
  return `@scope (${ROOT_SELECTOR}) to ([data-snui-version]) {\n${styles}\n}`;
}
