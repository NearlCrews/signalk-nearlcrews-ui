import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from "react";

/**
 * The controlled and uncontrolled pair the selection primitives share.
 *
 * `commit` writes the internal value only while the component is uncontrolled,
 * and reports the change outward either way, so a controlled parent stays the
 * sole owner of the value. The third slot writes the uncontrolled value
 * without reporting it, for a native form reset the parent already observes.
 *
 * A `T` that includes `undefined` cannot distinguish an uncontrolled component
 * from one controlled at `undefined`; those callers treat both as uncontrolled,
 * or reach for {@link useControllableStateWhen} and say which mode they are in.
 */
export function useControllableState<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): readonly [T, (next: T) => void, Dispatch<SetStateAction<T>>] {
  return useControllableStateWhen(
    controlled !== undefined,
    // Read only while the component is controlled, which is exactly when the
    // value above is not undefined.
    controlled ?? defaultValue,
    defaultValue,
    onChange,
  );
}

/**
 * The same pair for a value whose `undefined` is a state of its own, so the
 * caller says which mode it is in rather than leaving it to be read off the
 * value.
 *
 * A numeric field that admits an empty value is the case this exists for:
 * there an undefined value means cleared, not unowned, and treating it as
 * unowned would hand the field back its own stale internal number.
 */
export function useControllableStateWhen<T>(
  controlled: boolean,
  value: T,
  defaultValue: T,
  onChange?: (next: T) => void,
): readonly [T, (next: T) => void, Dispatch<SetStateAction<T>>] {
  const [internal, setInternal] = useState(defaultValue);
  const commit = useCallback(
    // The dependency below is the mode rather than the value, so a controlled
    // parent's every change does not hand its children a new callback.
    (next: T): void => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [controlled ? value : internal, commit, setInternal];
}
