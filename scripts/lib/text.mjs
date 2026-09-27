/**
 * Plain-text formatting for the messages the validation scripts fail with.
 */

/**
 * One line per item, each marked as a list entry, so a gate that collects its
 * failures reports every one of them rather than the first.
 */
export function bulletList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}
