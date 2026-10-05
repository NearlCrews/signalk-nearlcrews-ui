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
 * uses, kept in step with it by a unit assertion. Unlike the package's, it
 * does not group digits: the counts it prints sit beside raw byte counts and
 * the values of a size baseline file, which read and copy better ungrouped.
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
  return readValues(argv, name, requires)[0];
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
 * Rejects an argument the caller would never read: a flag it does not know, or
 * anything else that is not the one value after an option named in `valued`.
 * A misspelled option, a second value, or an option typed without its dashes
 * is otherwise dropped without a word, which skips or narrows the check it
 * names while the run still reports a pass. No value can be flag-shaped, so
 * every flag-shaped argument is an option. `hint` ends the message.
 */
export function assertKnownOptions(
  argv,
  known,
  { hint = "", valued = [] } = {},
) {
  const unknown = new Set();
  const stray = new Set();
  for (const [index, argument] of argv.entries()) {
    if (isFlag(argument)) {
      if (!known.includes(argument)) unknown.add(argument);
    } else if (!valued.includes(argv[index - 1])) {
      stray.add(argument);
    }
  }
  // Unknown options come first: the argument after a misspelled option is
  // only stray because the option is.
  if (unknown.size > 0) {
    const subject = unknown.size === 1 ? "is not an option" : "are not options";
    throw new Error(
      `${joinNames([...unknown])} ${subject} this check takes.${hint}`,
    );
  }
  if (stray.size > 0) {
    const subject =
      stray.size === 1
        ? "is neither an option nor the value of one"
        : "are neither options nor the values of options";
    throw new Error(
      `${joinNames([...stray])} ${subject}. An option starts with --, and one that takes a value takes only the argument after it.${hint}`,
    );
  }
}
