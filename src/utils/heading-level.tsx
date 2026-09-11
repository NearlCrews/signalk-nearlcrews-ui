import { createContext, type ReactNode, useContext } from "react";

import type { HeadingLevel } from "./heading.js";

/*
 * The level a titled section takes when its consumer names none. `PanelShell`
 * sets it from its own title, which heads everything the shell renders by
 * construction, so the sections inside nest under the panel heading instead of
 * sitting beside it. The default is the level `Section` and
 * `CollapsibleSection` have always used, so a section outside any shell is
 * unchanged.
 */
const HeadingLevelContext = createContext<HeadingLevel>(2);

export interface HeadingLevelProviderProps {
  readonly children: ReactNode;
  readonly value: HeadingLevel;
}

export function HeadingLevelProvider({
  children,
  value,
}: HeadingLevelProviderProps): React.JSX.Element {
  return (
    <HeadingLevelContext.Provider value={value}>
      {children}
    </HeadingLevelContext.Provider>
  );
}

export function useHeadingLevel(): HeadingLevel {
  return useContext(HeadingLevelContext);
}
