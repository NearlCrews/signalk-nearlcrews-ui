import type { ReactNode } from "react";

/**
 * A description reached only through `aria-describedby`, such as a busy label
 * or the reason a control refuses.
 *
 * It is visually hidden and hidden from the accessibility tree as well, so it
 * never joins the name of the control it sits in: the name computation walks
 * the control's own subtree and skips it. A description still reads it,
 * because `aria-describedby` includes a hidden element it references directly.
 * So the control keeps the name it had, and assistive technology does not
 * announce it as a different control when the description comes and goes.
 *
 * @internal
 */
export function HiddenDescription({
  children,
  id,
}: {
  readonly children: ReactNode;
  readonly id: string;
}): React.JSX.Element {
  return (
    <span id={id} className="snui-visually-hidden" aria-hidden="true">
      {children}
    </span>
  );
}
