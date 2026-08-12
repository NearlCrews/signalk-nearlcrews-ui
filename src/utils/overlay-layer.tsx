import { createContext, type ReactNode, useContext } from "react";

const OverlayLayerContext = createContext(0);

export interface OverlayLayerProviderProps {
  readonly children: ReactNode;
  readonly value: number;
}

export function OverlayLayerProvider({
  children,
  value,
}: OverlayLayerProviderProps): React.JSX.Element {
  return (
    <OverlayLayerContext.Provider value={value}>
      {children}
    </OverlayLayerContext.Provider>
  );
}

export function useOverlayLayer(): number {
  return useContext(OverlayLayerContext);
}

export function overlayZIndex(layer: number): string {
  return layer <= 0
    ? "var(--snui-z-overlay)"
    : `calc(var(--snui-z-modal) + ${String(layer)})`;
}
