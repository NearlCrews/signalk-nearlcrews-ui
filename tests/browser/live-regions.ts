import { expect, type Page } from "./fixtures.js";

/** The verdict the page gives when a live element carrying the text is reachable. */
const EXPOSED = "exposed";

/**
 * Reads, inside the page, whether a live element carrying `text` is in the
 * accessibility tree. Returns {@link EXPOSED}, or a sentence saying what was
 * missing or what hid each carrier, which becomes the failure message.
 *
 * Runs in the browser, so everything it uses is declared inside it.
 */
function readLiveTextExposure(text: string): string {
  // Elements that announce their own updates. An explicit "off" speaks for
  // nobody, whatever it carries.
  const liveSelector =
    '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]';
  const normalize = (value: string): string =>
    value.replace(/\s+/g, " ").trim();
  const describe = (element: Element): string => {
    const id = element.id === "" ? "" : `#${element.id}`;
    const classes = [...element.classList]
      .slice(0, 2)
      .map((name) => `.${name}`)
      .join("");
    return `${element.localName}${id}${classes}`;
  };
  // An element leaves the accessibility tree when it or any ancestor is
  // inert, aria-hidden, or not rendered. A visually hidden region stays in.
  const hiddenBy = (carrier: Element): string | null => {
    for (
      let node: Element | null = carrier;
      node !== null;
      node = node.parentElement
    ) {
      if (node instanceof HTMLElement && node.inert) {
        return `${describe(node)} is inert`;
      }
      if (node.getAttribute("aria-hidden") === "true") {
        return `${describe(node)} is aria-hidden`;
      }
      if (getComputedStyle(node).display === "none") {
        return `${describe(node)} is display: none`;
      }
    }
    return getComputedStyle(carrier).visibility === "hidden"
      ? `${describe(carrier)} is visibility: hidden`
      : null;
  };

  const wanted = normalize(text);
  const carriers = [...document.querySelectorAll(liveSelector)].filter(
    (element) => normalize(element.textContent).includes(wanted),
  );
  if (carriers.length === 0) {
    return `no live region carries "${wanted}"`;
  }
  const reasons: string[] = [];
  for (const carrier of carriers) {
    const reason = hiddenBy(carrier);
    // The page cannot read module constants, so EXPOSED is spelled out here.
    if (reason === null) return "exposed";
    reasons.push(`${describe(carrier)}: ${reason}`);
  }
  return `every live region carrying "${wanted}" is hidden (${reasons.join("; ")})`;
}

/**
 * Whether a live element carrying `text` is in the accessibility tree right
 * now: "exposed", or the sentence a failure reports. For a spec that has to
 * assert the failure itself.
 */
export function liveTextExposure(page: Page, text: string): Promise<string> {
  return page.evaluate(readLiveTextExposure, text);
}

/**
 * Fails unless an element that announces its own updates carries `text` and
 * nothing takes it out of the accessibility tree: no `inert` and no
 * `aria-hidden="true"` on it or an ancestor, and nothing unrendered. A modal
 * overlay hides the rest of the page this way, so a region that holds the
 * right words can still be silent, which a DOM text assertion never notices.
 *
 * Polls, because an announcing region fills a beat after it is asked to.
 */
export async function expectExposedLiveText(
  page: Page,
  text: string,
): Promise<void> {
  await expect
    .poll(() => liveTextExposure(page, text), {
      message: `expected "${text}" in a live region assistive technology can reach`,
    })
    .toBe(EXPOSED);
}
