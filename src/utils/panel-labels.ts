import type { ThemeChoice } from "../theme/contract.js";
import { createValueContext } from "./context.js";
import type { SemanticTone } from "./tone.js";

/**
 * Reasons a number draft cannot be committed, repeated here rather than
 * imported so the bundle type stays free of the form entry points.
 */
type NumberFieldMessageKey =
  | "aboveMax"
  | "belowMin"
  | "empty"
  | "notAnInteger"
  | "notANumber";

/**
 * Replacements for the package's own English defaults, one group per surface
 * of the localization table in the API reference.
 *
 * Every group and every key is optional, so a panel translates the strings it
 * cares about and leaves the rest. Each string still loses to the matching
 * prop on the component, which is how a single call site says something more
 * specific than the panel's own wording, and blank text reads as absent at
 * both steps. `PanelRoot.labels` and `PanelShell.labels` publish the bundle.
 *
 * Two surfaces are deliberately absent. The compatibility notice renders
 * before the panel exists, so it takes its text from
 * `PanelShell.unsupportedLabels`. `CheckboxGroup.selectAllLabel` names the
 * things being selected, which is panel content rather than package wording.
 */
export interface PanelLabels {
  /** Accessible name announced while a `Banner` offers to be dismissed. */
  readonly banner?: { readonly dismiss?: string | undefined } | undefined;
  /** Accessible name announced while a `Button` is loading. */
  readonly button?: { readonly loading?: string | undefined } | undefined;
  /** Title of a `DataGrid` with no rows. */
  readonly dataGrid?: { readonly emptyTitle?: string | undefined } | undefined;
  /** The two actions and the fallback title of an `InlineConfirm`. */
  readonly inlineConfirm?:
    | {
        readonly cancel?: string | undefined;
        readonly confirm?: string | undefined;
        readonly fallbackTitle?: string | undefined;
      }
    | undefined;
  /** Announcement beside a destructive `MenuItem`. */
  readonly menuItem?: { readonly tone?: string | undefined } | undefined;
  /** Validation messages, keyed the way `NumberField.messages` is. */
  readonly numberField?:
    | Partial<Readonly<Record<NumberFieldMessageKey, string>>>
    | undefined;
  /** Text and actions of the built-in panel error fallback. */
  readonly panelError?:
    | {
        readonly description?: string | undefined;
        readonly reload?: string | undefined;
        readonly retry?: string | undefined;
        readonly title?: string | undefined;
      }
    | undefined;
  /** Text shown for an age that cannot be stated. */
  readonly relativeAge?: { readonly fallback?: string | undefined } | undefined;
  /** Actions and statuses of a `SaveActionBar`, keyed the way its own labels are. */
  readonly saveActionBar?:
    | {
        readonly clean?: string | undefined;
        readonly discard?: string | undefined;
        readonly save?: string | undefined;
        readonly saved?: string | undefined;
        readonly saving?: string | undefined;
        readonly unconfigured?: string | undefined;
        readonly unsaved?: string | undefined;
      }
    | undefined;
  /** The two actions of a `SecretInput`. */
  readonly secretInput?:
    | {
        readonly hide?: string | undefined;
        readonly show?: string | undefined;
      }
    | undefined;
  /** Group name, guidance, and per-choice names of the theme selector. */
  readonly themeToggle?:
    | {
        readonly choices?:
          | Partial<Readonly<Record<ThemeChoice, string>>>
          | undefined;
        readonly description?: string | undefined;
        readonly label?: string | undefined;
      }
    | undefined;
  /** Accessible names announced for each semantic tone. */
  readonly tone?: Partial<Readonly<Record<SemanticTone, string>>> | undefined;
  /** Landmark name and dismissal action of the toast region. */
  readonly toastRegion?:
    | {
        readonly dismiss?: string | undefined;
        readonly label?: string | undefined;
      }
    | undefined;
}

/**
 * The label bundle a panel publishes, and undefined for a panel that ships the
 * package's English defaults, which is every panel that passes no bundle.
 */
export const { Provider: PanelLabelsProvider, useValue: usePanelLabels } =
  createValueContext<PanelLabels | undefined>(undefined);
