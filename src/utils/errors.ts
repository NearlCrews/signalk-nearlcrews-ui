/**
 * The words every error this package throws starts with. An error that escapes
 * a panel reaches Signal K Admin's error boundary, which shows only
 * `error.message`, under a hint that the plugin may need updating for React
 * 19. The package name is what points a developer at this package and at the
 * call that failed instead.
 *
 * @internal
 */
export const ERROR_PREFIX = "signalk-nearlcrews-ui: ";

/**
 * An error as the package throws it: the message after the package name, and
 * the cause, when one is given, kept for the console.
 *
 * @internal
 */
export function packageError(message: string, options?: ErrorOptions): Error {
  return new Error(`${ERROR_PREFIX}${message}`, options);
}

/**
 * What a value is, with its article, for a message that says what the caller
 * passed instead: "a Set", "a string", "a plain object", or "null".
 *
 * @internal
 */
export function describeReceived(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return `a ${typeof value}`;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype === null || prototype === Object.prototype) {
    return "a plain object";
  }
  const name = (value as { constructor?: { name?: unknown } }).constructor
    ?.name;
  if (typeof name !== "string" || name === "") return "an object";
  return `${indefiniteArticle(name)} ${name}`;
}

/** Letters whose spoken name starts with a vowel sound: "an HTMLCollection". */
const VOWEL_SOUND_LETTERS = new Set([
  "A",
  "E",
  "F",
  "H",
  "I",
  "L",
  "M",
  "N",
  "O",
  "R",
  "S",
  "X",
]);

/**
 * The article a constructor name is read with. A leading initialism is read
 * letter by letter ("an HTMLCollection", "a URL"), and a word starting with a
 * "you" sound takes "a" ("a Uint8Array").
 */
function indefiniteArticle(name: string): "a" | "an" {
  if (/^[A-Z]{2}/.test(name)) {
    return VOWEL_SOUND_LETTERS.has(name.charAt(0)) ? "an" : "a";
  }
  if (/^U(?:ni|int|s[aeiou]|ti)/.test(name)) return "a";
  return /^[AEIOU]/.test(name) ? "an" : "a";
}
