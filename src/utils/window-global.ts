/**
 * Reads a global from the window that owns a node rather than from the module
 * realm.
 *
 * A panel can be rendered into another document, and a feature the engine or
 * the test environment does not implement has to read as absent instead of
 * throwing a reference error, so the lookup names the property on the window
 * it belongs to.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the DOM lib types no global on a foreign window, so the caller names what it expects and the rule's remedy is a bare assertion at each call site.
export function windowGlobal<T>(
  ownerWindow: Window,
  name: string,
): T | undefined {
  return Reflect.get(ownerWindow, name) as T | undefined;
}
