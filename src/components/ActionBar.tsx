import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export interface ActionBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly actions: ReactNode;
  readonly status?: ReactNode;
  readonly sticky?: boolean;
}

export function ActionBar({
  actions,
  className,
  status,
  sticky = false,
  ...props
}: ActionBarProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={classNames(
        "snui-action-bar",
        sticky && "snui-action-bar--sticky",
        className,
      )}
    >
      {hasReactContent(status) ? (
        <div className="snui-action-bar__status">{status}</div>
      ) : null}
      <div className="snui-action-bar__actions">{actions}</div>
    </div>
  );
}
