/** The package version used to isolate styles from other loaded versions. */
export const PACKAGE_VERSION = "0.7.0";

/** The root class is private and may change without notice. */
export const ROOT_CLASS = "snui-root";

/** The exact selector prevents styles from crossing package-version roots. */
export const ROOT_SELECTOR = `.${ROOT_CLASS}[data-snui-version="${PACKAGE_VERSION}"]`;

/** A versioned global name prevents keyframe collisions between package copies. */
export function versionedAnimationName(suffix: string): string {
  return `snui-v${PACKAGE_VERSION.replace(/[^a-zA-Z0-9_-]/g, "-")}-${suffix}`;
}

export const SPINNER_ANIMATION_NAME = versionedAnimationName("spin");
