/**
 * Reading command-line options, in one place because the shipped CLI and this
 * repository's own check scripts all take flags of the same shape: a name
 * followed by its value, where a value that looks like another flag is a
 * mistake rather than a value.
 *
 * These helpers live beside the CLI rather than in `scripts/lib` because the
 * published package ships `bin` and not `scripts`, and they carry no
 * dependencies for the same reason.
 */

/** A flag-shaped argument, which can never be another flag's value. */
function isFlag(argument) {
  return argument.startsWith("--");
}

/**
 * A list with the serial comma, so a message naming three options reads as
 * prose. The package's own text helpers are TypeScript that `bin` cannot
 * import, so this is the copy the command line uses.
 */
export function joinNames(names, conjunction = "and") {
  if (names.length < 3) return names.join(` ${conjunction} `);
  return `${names.slice(0, -1).join(", ")}, ${conjunction} ${names.at(-1)}`;
}

/**
 * Counts a noun: "1 bundle", "3 bundles". A noun the trailing "s" does not
 * pluralize passes its own plural. The package's own `formatCount` is
 * TypeScript that `bin` cannot import, so this is the copy the command line
 * uses, kept in step with it by a unit assertion.
 */
export function formatCount(count, singular, plural) {
  const noun = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${noun}`;
}

/**
 * Whether a boolean option was given. Written here so every check reads its
 * flags the same way and validates them with {@link assertKnownOptions}.
 */
export function readFlag(argv, name) {
  return argv.includes(name);
}

/**
 * The one value given for `name`, or undefined. Repeating the option is an
 * error: silently keeping the first value checks something other than what the
 * caller asked for. `requires` names what the option takes, for the message.
 */
export function readOption(argv, name, requires = "a value") {
  const given = argv.filter((argument) => argument === name).length;
  if (given > 1) {
    throw new Error(
      `${name} was given ${given} times, and it takes one value.`,
    );
  }
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (value === undefined || isFlag(value)) {
    throw new Error(`${name} requires ${requires}.`);
  }
  return value;
}

/** Every value given for a repeatable option, in the order they were given. */
export function readValues(argv, name, requires = "a value") {
  const values = [];
  for (const [index, argument] of argv.entries()) {
    if (argument !== name) continue;
    const value = argv[index + 1];
    if (value === undefined || isFlag(value)) {
      throw new Error(`${name} requires ${requires}.`);
    }
    values.push(value);
  }
  return values;
}

/**
 * Rejects a flag the caller does not know. A misspelled option is otherwise
 * dropped without a word, which skips the check it names while the run still
 * reports a pass. No value can be flag-shaped, so every flag-shaped argument
 * is an option.
 */
export function assertKnownOptions(argv, known, hint = "") {
  const unknown = [
    ...new Set(
      argv.filter((argument) => isFlag(argument) && !known.includes(argument)),
    ),
  ];
  if (unknown.length === 0) return;
  const subject = unknown.length === 1 ? "is not an option" : "are not options";
  throw new Error(`${joinNames(unknown)} ${subject} this check takes.${hint}`);
}
