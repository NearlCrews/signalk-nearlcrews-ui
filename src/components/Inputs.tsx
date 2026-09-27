import {
  type InputHTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  type RefAttributes,
  type RefObject,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import { useComposedRef, useNodeRef } from "../hooks/use-node-ref.js";
import { RANGE_STYLES } from "../styles/range.js";
import { TEXTAREA_STYLES } from "../styles/textarea.js";
import { useOptionalModuleStyles } from "../styles/use-module-styles.js";
import {
  blockChange,
  blockedActivationProps,
  CHECKBOX_ACTIVATION_KEYS,
  resolveAriaDisabled,
} from "../utils/activation.js";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences, requireIdToken } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { isDevelopment } from "../utils/environment.js";
import { resolveFieldRegions } from "../utils/field-error.js";
import { markForwardsFieldControlProps } from "../utils/field-forwarding.js";
import {
  afterMicrotaskIfConnected,
  observeFormReset,
} from "../utils/form-reset.js";
import { requireContent } from "../utils/react-node.js";
import type { Visibility } from "../utils/variants.js";
import { warnOnce } from "../utils/warn-once.js";
import { blurBeforeWheel } from "../utils/wheel-guard.js";
import { FieldError } from "./FieldError.js";
import { FieldMarker } from "./FieldMarker.js";

export type TextInputType =
  | "date"
  | "datetime-local"
  | "email"
  | "month"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week";

/** Props shared by the controls that can show identifiers. */
export interface MonospaceControlProps {
  /** Renders the value in the panel's monospace stack, for keys, paths, and identifiers. */
  readonly monospace?: boolean | undefined;
}

/**
 * The class list every text entry control carries: the shared input look, the
 * control's own modifiers, the monospace stack when asked for, and the
 * caller's class last.
 */
function inputClassNames(
  monospace: boolean,
  className: string | undefined,
  ...modifiers: readonly (string | undefined)[]
): string {
  return classNames(
    "snui-input",
    ...modifiers,
    monospace && "snui-input--monospace",
    className,
  );
}

/**
 * Owns a control for a whole mount and puts it back after its own form has
 * been reset.
 *
 * A native reset restores a control from its `value` and `checked` content
 * attributes, which a React-controlled control does not carry, and React
 * neither re-renders nor fires a change afterwards, so each control says here
 * how to restore itself. The resync is an effect event, so it reads current
 * props without registering again. The caller's own ref is composed
 * separately, because rebuilding the callback ref every render would detach
 * the node on every commit, which an ordinary inline consumer ref would
 * otherwise cause. The registration is keyed on the `form` attribute, because
 * a control moved to another form has to listen to the form it now belongs to.
 */
function useResettableControl<Control extends HTMLInputElement>(
  ref: Ref<Control> | undefined,
  formId: string | undefined,
  onReset: (node: Control) => void,
): readonly [RefObject<Control | null>, (node: Control) => () => void] {
  const nodeRef = useRef<Control | null>(null);
  const setNode = useNodeRef(nodeRef, undefined);
  useComposedRef(nodeRef, ref);
  const resync = useEffectEvent(onReset);

  // The form id is a change signal rather than a value read here: the
  // registration resolves the control's own form, so a control moved to
  // another form has to register again on that one.
  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (node === null) return undefined;

    return observeFormReset(node, resync);
  }, [formId]);

  return [nodeRef, setNode];
}

/** Puts a controlled text or numeric value back after a native form reset. */
function restoreControlledValue(
  value: InputHTMLAttributes<HTMLInputElement>["value"],
): (node: HTMLInputElement) => void {
  return (node) => {
    // An uncontrolled control has no value to restore: the native reset,
    // which reads the value attribute, already did the right thing.
    if (typeof value !== "string" && typeof value !== "number") return;
    const restored = String(value);
    if (node.value !== restored) node.value = restored;
  };
}

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> &
  RefAttributes<HTMLInputElement> &
  MonospaceControlProps & {
    readonly type?: TextInputType | undefined;
  };

// See markForwardsFieldControlProps: this control is safe to pass to
// LabeledField as an element child. Pure-annotated so an unused control still
// tree-shakes.
export const TextInput = /* @__PURE__ */ markForwardsFieldControlProps(
  function TextInput({
    className,
    monospace = false,
    ref,
    type = "text",
    value,
    ...props
  }: TextInputProps): React.JSX.Element {
    const [, attachInput] = useResettableControl(
      ref,
      props.form,
      restoreControlledValue(value),
    );

    return (
      <input
        {...props}
        ref={attachInput}
        type={type}
        value={value}
        className={inputClassNames(monospace, className)}
      />
    );
  },
);

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> &
  RefAttributes<HTMLInputElement> &
  MonospaceControlProps;

export const NumberInput = /* @__PURE__ */ markForwardsFieldControlProps(
  function NumberInput({
    className,
    monospace = false,
    onWheel,
    ref,
    value,
    ...props
  }: NumberInputProps): React.JSX.Element {
    const [, attachInput] = useResettableControl(
      ref,
      props.form,
      restoreControlledValue(value),
    );

    return (
      <input
        {...props}
        ref={attachInput}
        type="number"
        value={value}
        className={inputClassNames(monospace, className)}
        onWheel={(event) => {
          blurBeforeWheel(event);
          onWheel?.(event);
        }}
      />
    );
  },
);

export type RangeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> &
  RefAttributes<HTMLInputElement>;

function setRangeProgress(element: HTMLInputElement): void {
  const minimum = Number(element.min || "0");
  const maximum = Number(element.max || "100");
  const span = maximum - minimum;
  const ratio = span > 0 ? (Number(element.value) - minimum) / span : 0;
  const percent = Math.min(Math.max(ratio * 100, 0), 100);
  const safePercent = Number.isFinite(percent) ? percent : 0;
  element.style.setProperty("--snui-range-progress", `${String(safePercent)}%`);
}

export const RangeInput = /* @__PURE__ */ markForwardsFieldControlProps(
  function RangeInput({
    className,
    onInput,
    ref,
    ...props
  }: RangeInputProps): React.JSX.Element {
    useOptionalModuleStyles(RANGE_STYLES);

    const [inputRef, attachInput] = useResettableControl(
      ref,
      props.form,
      setRangeProgress,
    );

    // The fill is a style property rather than an attribute, so nothing repaints
    // it on its own. This runs after every render, including the first, because
    // min, max, and value can each move the fill and any of them can change
    // without an input event.
    useLayoutEffect(() => {
      if (inputRef.current !== null) setRangeProgress(inputRef.current);
    });

    return (
      <input
        {...props}
        ref={attachInput}
        type="range"
        className={classNames("snui-range", className)}
        onInput={(event) => {
          const element = event.currentTarget;
          setRangeProgress(element);
          onInput?.(event);
          // Re-sync after React restores a rejected controlled value.
          afterMicrotaskIfConnected(element, setRangeProgress);
        }}
      />
    );
  },
);

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  RefAttributes<HTMLSelectElement> &
  MonospaceControlProps;

export const Select = /* @__PURE__ */ markForwardsFieldControlProps(
  function Select({
    className,
    monospace = false,
    ref,
    ...props
  }: SelectProps): React.JSX.Element {
    return (
      <select
        {...props}
        ref={ref}
        className={inputClassNames(monospace, className, "snui-select")}
      />
    );
  },
);

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  RefAttributes<HTMLTextAreaElement> &
  MonospaceControlProps & {
    /**
     * Rows the control shows before any content wraps. Replaces the default
     * minimum height, and where the browser supports content sizing the
     * control grows with its text from this floor. The native `rows`
     * attribute alone does the same, because either prop releases the
     * module's own minimum height.
     */
    readonly minRows?: number | undefined;
  };

export const Textarea = /* @__PURE__ */ markForwardsFieldControlProps(
  function Textarea({
    className,
    minRows,
    monospace = false,
    ref,
    rows,
    ...props
  }: TextareaProps): React.JSX.Element {
    useOptionalModuleStyles(TEXTAREA_STYLES);

    return (
      <textarea
        {...props}
        ref={ref}
        rows={rows ?? minRows}
        className={inputClassNames(
          monospace,
          className,
          "snui-textarea",
          // Either prop states a row count, so either has to release the fixed
          // minimum height; otherwise a small count renders no smaller.
          rows === undefined && minRows === undefined
            ? undefined
            : "snui-textarea--rows",
        )}
      />
    );
  },
);

/** Alias of the shared {@link Visibility} vocabulary. */
export type CheckboxLabelVisibility = Visibility;

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type">,
    RefAttributes<HTMLInputElement> {
  /**
   * Blocks the state change while the box stays focusable, keeps its checked
   * state, and goes on submitting with its form. Reach for it where the value
   * is real but cannot be changed right now, such as the last remaining
   * selection in a list: native `disabled` takes the box out of the tab
   * order, so setting it on the box the user is standing on destroys their
   * focus. When set it decides; when omitted, a native `aria-disabled`
   * attribute is read instead. `Button.ariaDisabled` follows the same rule.
   */
  readonly ariaDisabled?: boolean | undefined;
  readonly description?: ReactNode | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: AnnouncementMode | undefined;
  /**
   * Re-applied whenever `checked` or `indeterminate` changes, and after a
   * native form reset. A reset restores checkedness from defaultChecked (or
   * the controlled checked prop) but never touches the indeterminate IDL
   * property, so the component re-applies this prop once the reset lands. A
   * blocked press restores it through its own microtask, because no render
   * follows one.
   */
  readonly indeterminate?: boolean | undefined;
  /**
   * Always names the control; `labelVisibility` decides whether it is drawn.
   * This is the naming prop: the box is labelled by the text rendered here,
   * so a bare `aria-label` beside it never speaks.
   */
  readonly label: ReactNode;
  /**
   * "hidden" keeps the label in the accessible name but takes it out of the
   * layout, for a checkbox in a table header, a card header, or a dense row.
   */
  readonly labelVisibility?: CheckboxLabelVisibility | undefined;
  /** Marker drawn after the label when the box is not required. */
  readonly optionalLabel?: ReactNode | undefined;
  /**
   * Marker drawn after the label when the box is required, so a panel can
   * localize it or key it to a legend of its own. Blank content draws none.
   */
  readonly requiredLabel?: ReactNode | undefined;
}

export function Checkbox({
  "aria-describedby": ariaDescribedBy,
  "aria-disabled": nativeAriaDisabled,
  "aria-errormessage": ariaErrorMessage,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ariaDisabled,
  checked,
  className,
  description,
  disabled,
  error,
  errorLive = "off",
  id,
  indeterminate,
  label,
  labelVisibility = "visible",
  onChange,
  onClick,
  onKeyDown,
  optionalLabel,
  ref,
  required = false,
  requiredLabel,
  ...props
}: CheckboxProps): React.JSX.Element {
  requireContent(label, "Checkbox requires a non-empty label.");

  const generatedId = useId();
  // The id seeds the label, description, and error ids, so an id carrying a
  // space would point aria-describedby at ids that exist nowhere.
  const controlId =
    id === undefined ? generatedId : requireIdToken(id, "Checkbox id");
  const labelId = `${controlId}-label`;

  const [inputRef, attachInput] = useResettableControl(
    ref,
    props.form,
    (node) => {
      // A native reset restores checkedness from defaultChecked but never
      // touches the indeterminate IDL property, so re-assert the prop-driven
      // state once the reset lands.
      if (checked !== undefined) node.checked = checked;
      node.indeterminate = indeterminate ?? false;
    },
  );

  // Checkedness is a change signal rather than a value read here: a platform
  // toggle clears the mixed state and reports the new checkedness, and
  // re-asserting the prop on that render is what puts a controlled mixed box
  // back.
  useLayoutEffect(() => {
    if (inputRef.current !== null) {
      inputRef.current.indeterminate = indeterminate ?? false;
    }
  }, [checked, indeterminate, inputRef]);

  // The message is built only in a development build: warnOnce discards it in
  // production, and JSON.stringify plus the template would otherwise run on
  // every render of every box carrying the attribute.
  if (isDevelopment() && ariaLabel !== undefined) {
    warnOnce(
      `checkbox-aria-label:${ariaLabel}`,
      `Checkbox received aria-label ${JSON.stringify(ariaLabel)} beside its label. The rendered label names the box, so the aria-label is ignored; pass the shorter text as label and set labelVisibility="hidden" to keep it off screen.`,
    );
  }

  const regions = resolveFieldRegions(controlId, description, error, errorLive);
  const { descriptionId, hasDescription, hasError, referencedErrorId } =
    regions;
  const describedBy = joinIdReferences(
    ariaDescribedBy,
    descriptionId,
    referencedErrorId,
  );
  const errorMessage = joinIdReferences(ariaErrorMessage, referencedErrorId);

  const labelHidden = labelVisibility === "hidden";
  const blocksActivation = resolveAriaDisabled(
    ariaDisabled,
    nativeAriaDisabled,
  );

  // The blocked state and both activation guards travel together, and a
  // natively disabled box is left to expose its own state.
  const refusal = blockedActivationProps<HTMLInputElement>({
    activationKeys: CHECKBOX_ACTIVATION_KEYS,
    blocked: blocksActivation,
    disabled,
    onClick,
    onKeyDown,
  });
  const handleClick: MouseEventHandler<HTMLInputElement> = (event) => {
    if (blocksActivation) {
      /*
       * The browser flips the box before it dispatches the click, and React
       * re-applies its own idea of the state once the event batch ends, after
       * every handler here has run. So the box is put back in a microtask,
       * which lands after that pass and still before the next paint, rather
       * than left to the canceled activation the click guard asks for.
       * Toggling also clears the mixed state, and the layout effect that
       * re-asserts it only runs on a render that a blocked click never causes.
       */
      const input = event.currentTarget;
      const restoredChecked = checked ?? !input.checked;
      const restoredIndeterminate = indeterminate ?? false;
      afterMicrotaskIfConnected(input, (node) => {
        node.checked = restoredChecked;
        node.indeterminate = restoredIndeterminate;
      });
    }
    refusal.onClick(event);
  };

  return (
    <div
      className={classNames(
        "snui-checkbox",
        labelHidden && "snui-checkbox--label-hidden",
        className,
      )}
    >
      {/*
       * The label wraps the box and its own text alone, the way LabeledField
       * does. A description or an error inside it would be part of the
       * label's activation area, so a touch user pressing a validation
       * message to read it would silently flip the setting. Both are already
       * referenced by aria-describedby and aria-errormessage, so moving them
       * out costs nothing.
       */}
      <label className="snui-checkbox__control" htmlFor={controlId}>
        <input
          {...props}
          ref={attachInput}
          id={controlId}
          type="checkbox"
          checked={checked}
          className="snui-checkbox__input"
          disabled={disabled}
          required={required}
          aria-labelledby={joinIdReferences(ariaLabelledBy, labelId)}
          aria-describedby={describedBy}
          aria-errormessage={errorMessage}
          aria-invalid={hasError ? true : ariaInvalid}
          aria-disabled={refusal["aria-disabled"]}
          // Canceling the click reverts the checkedness the browser applied
          // before dispatching it, which is the one route every pointer press
          // and the Space key all arrive through, the label included.
          onChange={blockChange(blocksActivation, onChange)}
          onClick={handleClick}
          onKeyDown={refusal.onKeyDown}
        />
        <span
          id={labelId}
          className={classNames(
            "snui-checkbox__label",
            labelHidden && "snui-visually-hidden",
          )}
        >
          {label}
          <FieldMarker
            optionalLabel={optionalLabel}
            required={required}
            requiredLabel={requiredLabel}
          />
        </span>
      </label>
      {hasDescription ? (
        <span id={descriptionId} className="snui-checkbox__description">
          {description}
        </span>
      ) : null}
      <FieldError
        as="span"
        className="snui-checkbox__error"
        error={error}
        live={errorLive}
        region={regions}
      />
    </div>
  );
}
