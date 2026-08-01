import type { HTMLAttributes, ReactNode, Ref } from "react";

import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type ActionBarSticky = "bottom" | "top";

export interface ActionBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly actions: ReactNode;
  readonly status?: ReactNode;
  readonly statusRef?: Ref<HTMLDivElement>;
  readonly sticky?: ActionBarSticky | undefined;
}

export function ActionBar({
  actions,
  className,
  status,
  statusRef,
  sticky,
  ...props
}: ActionBarProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={classNames(
        "snui-action-bar",
        sticky !== undefined && `snui-action-bar--sticky-${sticky}`,
        className,
      )}
    >
      {hasReactContent(status) ? (
        <div ref={statusRef} className="snui-action-bar__status" tabIndex={-1}>
          {status}
        </div>
      ) : null}
      <div className="snui-action-bar__actions">{actions}</div>
    </div>
  );
}
