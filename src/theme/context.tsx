import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { createEmitter } from "../utils/emitter.js";
import {
  isThemeChoice,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "./contract.js";

const THEME_CHANGE_EVENT = "signalk-nearlcrews-ui-theme-change";

type StoredTheme = ThemeChoice | null | undefined;

export interface ThemeContextValue {
  readonly theme: ThemeChoice;
  readonly setTheme: (theme: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Runs one storage operation and reports failure as `undefined`. Private
 * browsing, a locked-down WebView, and a sandboxed frame can all throw on any
 * access to localStorage, and none of them should break the panel: the theme
 * simply stops being shared.
 */
function withStorage<T>(operation: (storage: Storage) => T): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return operation(window.localStorage);
  } catch {
    return undefined;
  }
}

function readStorage(key: string): StoredTheme {
  const value = withStorage((storage) => storage.getItem(key));
  // An absent key is a genuine clear, so the panel returns to its fallback. A
  // present but unrecognized value comes from a different library version
  // sharing the key and is ignored: resetting here would fight the theme the
  // other panel just wrote. Unreadable storage is also ignored.
  if (value === null) return null;
  return isThemeChoice(value) ? value : undefined;
}

function writeSharedTheme(theme: ThemeChoice): void {
  withStorage((storage) => {
    storage.setItem(THEME_STORAGE_KEY, theme);
  });
}

function isLocalStorageEvent(event: StorageEvent): boolean {
  if (event.storageArea === null) return true;
  return withStorage((storage) => storage === event.storageArea) === true;
}

/**
 * One store per loaded copy of the library. The theme is a document-wide
 * preference behind one storage key, so every provider in this copy reads the
 * same snapshot, and other copies stay in step through the storage event and
 * the same-document change event below.
 */
const themeListeners = createEmitter();
let currentTheme: ThemeChoice = "auto";
let seededTheme: ThemeChoice | undefined;

/**
 * The theme a panel shows when shared storage holds none: the seed a consumer
 * gave through `defaultTheme`, else Auto, which follows a host theme marker.
 */
function fallbackTheme(): ThemeChoice {
  return seededTheme ?? "auto";
}

/**
 * Records a consumer's starting theme for a document that has stored none.
 *
 * The first seed wins, and a panel already showing a theme keeps it, because
 * the preference is one document-wide value: two panels seeding different
 * themes would otherwise trade the theme back and forth as each one mounts. A
 * stored preference always wins over a seed, and seeding writes nothing, so
 * the operator's own choice is never manufactured for them.
 */
function seedTheme(theme: ThemeChoice): void {
  seededTheme ??= theme;
}

function updateTheme(next: ThemeChoice): void {
  if (next === currentTheme) return;
  currentTheme = next;
  themeListeners.emit();
}

/** Adopts the shared value when it is readable and recognized. */
function adoptSharedTheme(): void {
  const shared = readStorage(THEME_STORAGE_KEY);
  if (shared === undefined) return;
  updateTheme(shared ?? fallbackTheme());
}

function handleThemeChange(event: Event): void {
  if (event instanceof CustomEvent && isThemeChoice(event.detail)) {
    updateTheme(event.detail);
    return;
  }
  adoptSharedTheme();
}

function handleStorage(event: StorageEvent): void {
  if (
    (event.key === THEME_STORAGE_KEY || event.key === null) &&
    isLocalStorageEvent(event)
  ) {
    handleThemeChange(event);
  }
}

function subscribe(listener: () => void): () => void {
  const unsubscribe = themeListeners.subscribe(listener);
  if (themeListeners.size() === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }
  // A panel that subscribes after a hidden period, inside a retained
  // CollapsibleSection for example, missed every event in between. React
  // compares snapshots right after subscribing, so adopting the shared value
  // here re-renders it with the theme another panel wrote meanwhile.
  adoptSharedTheme();

  return () => {
    unsubscribe();
    if (themeListeners.size() > 0) return;
    // The seed belongs to the panels that gave it, so the next panel to mount
    // seeds the store again rather than inheriting a choice from a frame that
    // is gone.
    seededTheme = undefined;
    if (typeof window === "undefined") return;
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  };
}

function getSnapshot(): ThemeChoice {
  // With no subscriber the store hears no events, so a first render reads the
  // shared value directly instead of trusting a snapshot from an earlier mount.
  // Unreadable or unrecognized storage starts at the fallback here, exactly as
  // a fresh panel always has; only a live panel keeps its theme through those.
  if (themeListeners.size() === 0) {
    currentTheme = readStorage(THEME_STORAGE_KEY) ?? fallbackTheme();
  }
  return currentTheme;
}

function getServerSnapshot(): ThemeChoice {
  return fallbackTheme();
}

function setTheme(nextTheme: ThemeChoice): void {
  writeSharedTheme(nextTheme);
  updateTheme(nextTheme);
  // Other copies of the library in the same document cannot see this copy's
  // store, and the storage event never fires in the document that wrote the
  // value, so they learn the choice from this event. This copy's own listener
  // receives it too and finds nothing to change.
  //
  // The method is tested rather than the object, because a static render
  // sandbox can supply a window that carries no event target at all, and a
  // theme set there is simply not shared any further.
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  ) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ThemeChoice>(THEME_CHANGE_EVENT, { detail: nextTheme }),
  );
}

export interface ThemeProviderProps {
  readonly children: ReactNode;
  /**
   * The theme to start at when the document has no stored preference, for a
   * host that already knows how its operator works, such as a nav station
   * that opens at night. The stored preference and any panel already showing
   * a theme both win over it, and it writes nothing, so the operator's own
   * choice is never overwritten. Default `"auto"`.
   */
  readonly defaultTheme?: ThemeChoice | undefined;
}

export function ThemeProvider({
  children,
  defaultTheme,
}: ThemeProviderProps): React.JSX.Element {
  // Latched before the first snapshot is read, so the panel paints the seeded
  // theme rather than flashing the fallback and correcting itself.
  if (defaultTheme !== undefined) seedTheme(defaultTheme);
  // An unresolved preference stays "auto" so the panel follows an explicit
  // host theme and otherwise uses the library's light fallback. Operating-system
  // preferences are reserved for the explicit "system" choice.
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function usePanelTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error(
      "usePanelTheme must be called inside PanelRoot, which provides the theme context.",
    );
  }
  return value;
}
