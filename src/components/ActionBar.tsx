import type { HTMLAttributes, ReactNode, Ref } from "react";

import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export interface ActionBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly actions: ReactNode;
  readonly status?: ReactNode;
  readonly statusRef?: Ref<HTMLDivElement>;
  readonly sticky?: boolean;
}

export function ActionBar({
  actions,
  className,
  status,
  statusRef,
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
        <div ref={statusRef} className="snui-action-bar__status" tabIndex={-1}>
          {status}
        </div>
      ) : null}
      <div className="snui-action-bar__actions">{actions}</div>
    </div>
  );
}
