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
 * from one controlled at `undefined`; those callers treat both as uncontrolled.
 */
export function useControllableState<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): readonly [T, (next: T) => void, Dispatch<SetStateAction<T>>] {
  const [internal, setInternal] = useState(defaultValue);
  const commit = useCallback(
    (next: T): void => {
      if (controlled === undefined) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [controlled ?? internal, commit, setInternal];
}
