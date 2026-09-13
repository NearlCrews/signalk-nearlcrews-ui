import { createValueContext } from "./context.js";

/** A BCP 47 locale or list, in the shape every formatter in the package takes. */
export type PanelLocale = string | readonly string[];

/**
 * The locale a panel pins for everything it formats.
 *
 * A panel that ships no translations still has to keep its numbers and its
 * ages in one language, or a grouping separator from the browser's locale
 * lands inside an English sentence. `PanelRoot` publishes the panel's locale
 * here, the package's own formatters read it as their default, and a consumer
 * formatting a value itself reads the same value through `usePanelLocale` so
 * the two cannot disagree. Undefined means the runtime's own default locale.
 */
export const { Provider: PanelLocaleProvider, useValue: usePanelLocale } =
  createValueContext<PanelLocale | undefined>(undefined);
