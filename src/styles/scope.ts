import { ROOT_SELECTOR } from "../version.js";

/** Stops descendant rules at every nested package-version root. */
export function scopeStyles(styles: string): string {
  return `@scope (${ROOT_SELECTOR}) to ([data-snui-version]) {\n${styles}\n}`;
}
