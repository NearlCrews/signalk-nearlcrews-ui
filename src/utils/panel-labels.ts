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
 * The package's own English wording for every group except `numberField`
 * is exported as `PANEL_LABEL_DEFAULTS`, in the same shape.
 *
 * One surface is deliberately absent: `CheckboxGroup.selectAllLabel` names the
 * things being selected, which is panel content rather than package wording.
 */
export interface PanelLabels {
  /** Accessible name of the `Banner` dismiss button. */
  readonly banner?: { readonly dismiss?: string | undefined } | undefined;
  /**
   * Busy description a `Button` adds while loading. Its name stays the action
   * label, so pass a short state word such as "Saving".
   */
  readonly button?: { readonly loading?: string | undefined } | undefined;
  /** Accessible name of a scrolling `Code` block the consumer names nothing. */
  readonly codeBlock?: { readonly label?: string | undefined } | undefined;
  /** Title of a `DataGrid` with no rows. */
  readonly dataGrid?: { readonly emptyTitle?: string | undefined } | undefined;
  /**
   * Wording of a `FreshnessNote`, keyed the way its own `labels` are. `fresh`
   * and `stale` mark where the age goes with `{age}`.
   */
  readonly freshnessNote?:
    | {
        readonly fresh?: string | undefined;
        readonly freshAnnouncement?: string | undefined;
        readonly freshUnknown?: string | undefined;
        readonly pending?: string | undefined;
        readonly stale?: string | undefined;
        readonly staleAnnouncement?: string | undefined;
        readonly staleUnknown?: string | undefined;
      }
    | undefined;
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
  /**
   * Validation messages, keyed the way `NumberField.messages` is. Text may
   * carry `{min}` and `{max}`, which the field fills with its bounds. The
   * bundle takes text only: a message built from the field's rules, such as
   * one naming its unit, is the function form of the field's own `messages`.
   */
  readonly numberField?:
    | Partial<Readonly<Record<NumberFieldMessageKey, string>>>
    | undefined;
  /**
   * Text and actions of the built-in panel error fallback. `description` is
   * shown when the fallback offers Try again alone, `reloadDescription` when
   * it also offers the page reload, so each sentence names only the actions
   * on screen.
   */
  readonly panelError?:
    | {
        readonly description?: string | undefined;
        readonly reload?: string | undefined;
        readonly reloadDescription?: string | undefined;
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
  /**
   * Group name, guidance, and per-choice names of the theme selector, keyed
   * the way `ThemeToggle`'s own props are.
   */
  readonly themeToggle?:
    | {
        readonly choiceLabels?:
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
  /**
   * Heading and explanation of the compatibility notice `PanelShell` shows on
   * a browser without native CSS scope. The notice renders instead of the
   * panel, so `PanelShell` reads this group from its own `labels` prop. The
   * group is browser advice and stands for the browser case only: when the
   * host's React is the reason, the notice keeps its own English heading and
   * names both versions.
   */
  readonly unsupportedBrowser?:
    | {
        readonly description?: string | undefined;
        readonly title?: string | undefined;
      }
    | undefined;
}

/**
 * The label bundle a panel publishes, and undefined for a panel that ships the
 * package's English defaults, which is every panel that passes no bundle. It
 * holds the panel's replacements only; a consumer control that follows the
 * panel wording falls back to `PANEL_LABEL_DEFAULTS` for the rest.
 */
export const { Provider: PanelLabelsProvider, useValue: usePanelLabels } =
  createValueContext<PanelLabels | undefined>(undefined);
