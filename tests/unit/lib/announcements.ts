/** Reads the visually hidden announcement text inside an element. */
export function announcementOf(
  element: Element | null | undefined,
): string | null {
  return element?.querySelector(".snui-visually-hidden")?.textContent ?? null;
}
